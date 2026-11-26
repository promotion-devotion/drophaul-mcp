import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { decodeManifest, ENDPOINT, MANIFESTS, OpenAiSkillInterface, RegisteredApp } from './manifests'

export const SKILLS = ['dispatch-review', 'invoice-chase', 'optimize-routes', 'plan-my-day'] as const

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist'])
const SCAN_EXEMPT = new Set(['bun.lock', 'test/fixtures/server.schema.json'])
const NEGATIVE_FIXTURES = 'test/'
const MIRRORED_PATHS = ['.mcp.json', 'assets', 'skills', '.codex-plugin/plugin.json', '.app.json'] as const

export const CREDENTIAL = new RegExp(
	[
		'dh_(?:pat|agent)_[A-Za-z0-9_-]{12,}',
		'-----BEGIN [A-Z ]+PRIVATE' + ' KEY-----',
		String.raw`Bearer\s+(?!\$\{|…|<)[A-Za-z0-9._~-]{16,}`,
		'sk-[A-Za-z0-9]{20,}',
		'xox[baprs]-[A-Za-z0-9-]{10,}',
		'gh[pousr]_[A-Za-z0-9]{36,}',
		'github_pat_[A-Za-z0-9_]{40,}',
	].join('|')
)
export const PRIVATE_MONOREPO_PATH =
	/(?:^|[\s`'"(])(?:(?:(?:\.\.?)[/\\])*(?:apps|packages|scripts|docs[/\\]plugin|\.superpowers|\.claude[/\\]skills)[/\\]|\/(?:Users|home)\/|[A-Za-z]:\\(?:Users|home)\\)/m
export const CONVEX_ID = /(?<![A-Za-z0-9_+/=-])(?=[0-9a-z]*[0-9])(?=[0-9a-z]*[a-z])[0-9a-z]{31,33}(?![A-Za-z0-9_+/=-])/
const URL_PATTERN = /https?:\/\/[^\s)"'`<>\]]+/g
const MARKDOWN_TARGET = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|<img[^>]*\ssrc="([^"]+)"/g

export type Problem = { readonly file: string; readonly rule: string; readonly message: string }

function walk(root: string, directory = root): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (IGNORED_DIRECTORIES.has(entry.name)) return []
		const full = join(directory, entry.name)
		if (entry.isSymbolicLink()) return [full]
		return entry.isDirectory() ? walk(root, full) : [full]
	})
}

function posix(root: string, file: string): string {
	return relative(root, file).split(sep).join('/')
}

function decodeText(bytes: Buffer): string | undefined {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
	} catch {
		return undefined
	}
}

function readJson(root: string, path: string, problems: Problem[]): unknown {
	const file = join(root, path)
	if (!existsSync(file)) {
		problems.push({ file: path, rule: 'required-file', message: 'file is missing' })
		return undefined
	}
	try {
		return JSON.parse(readFileSync(file, 'utf8'))
	} catch (error) {
		problems.push({ file: path, rule: 'json-parse', message: String(error) })
		return undefined
	}
}

function checkJsonFiles(root: string, files: readonly string[], problems: Problem[]): void {
	for (const path of files.filter((file) => file.endsWith('.json'))) {
		try {
			JSON.parse(readFileSync(join(root, path), 'utf8'))
		} catch (error) {
			problems.push({ file: path, rule: 'json-parse', message: String(error) })
		}
	}
}

function checkManifests(root: string, problems: Problem[]): void {
	const versions = new Map<string, string>()
	for (const manifest of MANIFESTS) {
		const value = readJson(root, manifest.path, problems)
		if (value === undefined) continue
		const failure = decodeManifest(manifest.schema, value)
		if (failure) problems.push({ file: manifest.path, rule: 'manifest-schema', message: failure })
		if (manifest.versioned && typeof (value as { version?: unknown }).version === 'string')
			versions.set(manifest.path, (value as { version: string }).version)
		for (const entry of (value as { plugins?: readonly { version?: unknown }[] }).plugins ?? [])
			if (typeof entry.version === 'string') versions.set(`${manifest.path}#plugins`, entry.version)
	}
	const expected = versions.get('server.json')
	for (const [path, version] of versions)
		if (version !== expected)
			problems.push({
				file: path.split('#')[0]!,
				rule: 'version-agreement',
				message: `version ${version} does not match server.json version ${expected}`,
			})
}

function checkRegistrySchema(root: string, problems: Problem[]): void {
	const server = readJson(root, 'server.json', problems) as { $schema?: unknown } | undefined
	const schema = JSON.parse(readFileSync(join(import.meta.dirname, '../test/fixtures/server.schema.json'), 'utf8')) as {
		$id: string
	}
	if (!server) return
	if (server.$schema !== schema.$id) {
		problems.push({
			file: 'server.json',
			rule: 'registry-schema',
			message: `$schema ${String(server.$schema)} has no vendored copy; vendored schema is ${schema.$id}`,
		})
		return
	}
	const ajv = new Ajv({ allErrors: true, strict: false })
	addFormats(ajv)
	const validate = ajv.compile(schema)
	if (!validate(server))
		problems.push({ file: 'server.json', rule: 'registry-schema', message: ajv.errorsText(validate.errors) })
}

function checkRegisteredApp(root: string, problems: Problem[]): void {
	const codex = readJson(root, '.codex-plugin/plugin.json', problems) as { apps?: unknown } | undefined
	const hasApp = existsSync(join(root, '.app.json'))
	if (hasApp !== (codex?.apps === './.app.json'))
		problems.push({
			file: '.codex-plugin/plugin.json',
			rule: 'registered-app',
			message: 'apps must be "./.app.json" exactly when a registered .app.json exists',
		})
	if (!hasApp) return
	const failure = decodeManifest(RegisteredApp, readJson(root, '.app.json', problems))
	if (failure) problems.push({ file: '.app.json', rule: 'manifest-schema', message: failure })
}

function listTree(root: string, path: string): string[] {
	const full = join(root, path)
	if (!existsSync(full)) return []
	if (!lstatSync(full).isDirectory()) return [path]
	return walk(root, full).map((file) => posix(root, file))
}

function checkMirrors(root: string, problems: Problem[]): void {
	for (const path of MIRRORED_PATHS) {
		const source = listTree(root, path)
		const mirror = listTree(root, `plugins/drophaul/${path}`).map((file) => file.slice('plugins/drophaul/'.length))
		for (const file of new Set([...source, ...mirror])) {
			const mirrorPath = `plugins/drophaul/${file}`
			if (!source.includes(file) || !mirror.includes(file)) {
				problems.push({
					file: source.includes(file) ? mirrorPath : file,
					rule: 'mirror',
					message: `${file} and ${mirrorPath} must both exist`,
				})
				continue
			}
			if (!readFileSync(join(root, file)).equals(readFileSync(join(root, mirrorPath))))
				problems.push({ file: mirrorPath, rule: 'mirror', message: `differs from ${file}` })
		}
	}
}

export function parseFrontmatter(text: string): Record<string, string> | undefined {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
	if (!match) return undefined
	try {
		const parsed = Bun.YAML.parse(match[1]!)
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
		return Object.fromEntries(
			Object.entries(parsed).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
		)
	} catch {
		return undefined
	}
}

function checkSkills(root: string, problems: Problem[]): void {
	for (const base of ['skills', 'plugins/drophaul/skills']) {
		const present = existsSync(join(root, base))
			? readdirSync(join(root, base), { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.map((entry) => entry.name)
					.sort()
			: []
		if (present.join(',') !== [...SKILLS].join(','))
			problems.push({
				file: base,
				rule: 'skill-set',
				message: `expected skills [${SKILLS.join(', ')}], found [${present.join(', ')}]`,
			})
		for (const skill of present) {
			const directory = `${base}/${skill}`
			const skillFile = `${directory}/SKILL.md`
			if (!existsSync(join(root, skillFile))) {
				problems.push({ file: skillFile, rule: 'skill-frontmatter', message: 'SKILL.md is missing' })
				continue
			}
			const frontmatter = parseFrontmatter(readFileSync(join(root, skillFile), 'utf8'))
			if (!frontmatter)
				problems.push({ file: skillFile, rule: 'skill-frontmatter', message: 'frontmatter is missing or invalid' })
			else {
				if (frontmatter.name !== skill)
					problems.push({
						file: skillFile,
						rule: 'skill-frontmatter',
						message: `name ${String(frontmatter.name)} does not match directory ${skill}`,
					})
				if (!frontmatter.description?.trim())
					problems.push({ file: skillFile, rule: 'skill-frontmatter', message: 'description is required' })
			}
			const prompts = listTree(root, directory).filter(
				(file) => file !== skillFile && file !== `${directory}/agents/openai.yaml`
			)
			for (const file of prompts)
				problems.push({
					file,
					rule: 'skill-prompt-only',
					message: 'skills may contain only SKILL.md and agents/openai.yaml',
				})
			const yamlPath = `${directory}/agents/openai.yaml`
			if (!existsSync(join(root, yamlPath))) {
				problems.push({ file: yamlPath, rule: 'skill-openai-yaml', message: 'agents/openai.yaml is missing' })
				continue
			}
			let descriptor: unknown
			try {
				descriptor = Bun.YAML.parse(readFileSync(join(root, yamlPath), 'utf8'))
			} catch (error) {
				problems.push({ file: yamlPath, rule: 'skill-openai-yaml', message: String(error) })
				continue
			}
			const failure = decodeManifest(OpenAiSkillInterface, descriptor)
			if (failure) problems.push({ file: yamlPath, rule: 'skill-openai-yaml', message: failure })
			else if (
				!(descriptor as { interface: { default_prompt: string } }).interface.default_prompt.includes(`$${skill}`)
			)
				problems.push({ file: yamlPath, rule: 'skill-openai-yaml', message: `default_prompt must invoke $${skill}` })
		}
	}
}

function checkLinks(root: string, path: string, text: string, problems: Problem[]): void {
	for (const match of text.matchAll(MARKDOWN_TARGET)) {
		const target = (match[1] ?? match[2])!
		if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue
		const clean = decodeURIComponent(target.split('#')[0]!.split('?')[0]!)
		const resolved = resolve(root, dirname(path), clean)
		if (!resolved.startsWith(resolve(root)) || !existsSync(resolved))
			problems.push({ file: path, rule: 'relative-link', message: `link target ${target} does not resolve` })
	}
}

function checkEndpoints(path: string, text: string, problems: Problem[]): void {
	for (const [url] of text.matchAll(URL_PATTERN)) {
		let parsed: URL
		try {
			parsed = new URL(url.replace(/[.,;:]+$/, ''))
		} catch {
			continue
		}
		const host = parsed.hostname
		if (host !== 'drophaul.app' && !host.endsWith('.drophaul.app')) continue
		const isApi = host === 'api.drophaul.app'
		const looksLikeEndpoint = /\/mcp\/?$/.test(parsed.pathname) && host !== 'www.drophaul.app'
		if ((isApi || looksLikeEndpoint) && parsed.href !== ENDPOINT)
			problems.push({ file: path, rule: 'endpoint', message: `${url} must be exactly ${ENDPOINT}` })
		else if (parsed.protocol !== 'https:')
			problems.push({ file: path, rule: 'endpoint', message: `${url} must use https` })
	}
}

function checkText(root: string, files: readonly string[], problems: Problem[]): void {
	for (const path of files) {
		const full = join(root, path)
		if (lstatSync(full).isSymbolicLink()) {
			problems.push({ file: path, rule: 'symlink', message: 'symbolic links are not allowed' })
			continue
		}
		const text = decodeText(readFileSync(full))
		if (text === undefined) {
			problems.push({ file: path, rule: 'binary', message: 'binary or invalid UTF-8 files are not allowed' })
			continue
		}
		if (SCAN_EXEMPT.has(path)) continue
		const credential = CREDENTIAL.exec(text)
		if (credential)
			problems.push({
				file: path,
				rule: 'credential',
				message: `credential-shaped value ${credential[0].slice(0, 12)}…`,
			})
		if (path.startsWith(NEGATIVE_FIXTURES)) continue
		const privatePath = PRIVATE_MONOREPO_PATH.exec(text)
		if (privatePath)
			problems.push({ file: path, rule: 'private-path', message: `private monorepo path ${privatePath[0].trim()}` })
		const convexId = CONVEX_ID.exec(text)
		if (convexId) problems.push({ file: path, rule: 'convex-id', message: `raw Convex-style id ${convexId[0]}` })
		checkEndpoints(path, text, problems)
		if (path.endsWith('.md')) checkLinks(root, path, text, problems)
	}
}

export function verifyBrandAsset(source: string): string | undefined {
	const svg = source
		.match(/^<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*width="(\d+)"[^>]*height="(\d+)"/s)
		?.slice(1)
		.map(Number)
	const image = source
		.match(/<image[^>]*width="(\d+)"[^>]*height="(\d+)"\s*\/>/s)
		?.slice(1)
		.map(Number)
	const encoded = source.match(/data:image\/png;base64,([^"\s]+)/)?.[1]
	if (
		svg?.length !== 4 ||
		svg.some((size) => size !== 192) ||
		image?.length !== 2 ||
		image.some((size) => size !== 192)
	)
		return 'brand asset must fully fill a square 192x192 SVG viewport'
	if (encoded === undefined) return 'brand asset must embed a PNG'
	const png = Buffer.from(encoded, 'base64')
	if (
		!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
		png.readUInt32BE(16) !== 192 ||
		png.readUInt32BE(20) !== 192
	)
		return 'brand asset must embed a complete square 192x192 PNG'
	return undefined
}

function checkLicenseAndAssets(root: string, problems: Problem[]): void {
	const license = existsSync(join(root, 'LICENSE')) ? readFileSync(join(root, 'LICENSE'), 'utf8') : ''
	if (
		!license.includes('Apache License') ||
		!license.includes('Version 2.0, January 2004') ||
		!license.includes('Copyright 2026 DropHaul') ||
		/proprietary and\s+confidential/.test(license)
	)
		problems.push({ file: 'LICENSE', rule: 'license', message: 'LICENSE must grant Apache-2.0 terms' })
	for (const path of ['assets/drophaul.svg', 'plugins/drophaul/assets/drophaul.svg']) {
		if (!existsSync(join(root, path))) {
			problems.push({ file: path, rule: 'brand-asset', message: 'file is missing' })
			continue
		}
		const failure = verifyBrandAsset(readFileSync(join(root, path), 'utf8'))
		if (failure) problems.push({ file: path, rule: 'brand-asset', message: failure })
	}
}

export function validateDistribution(root: string): Problem[] {
	const problems: Problem[] = []
	const files = walk(root)
		.map((file) => posix(root, file))
		.sort()
	checkJsonFiles(root, files, problems)
	checkManifests(root, problems)
	checkRegistrySchema(root, problems)
	checkRegisteredApp(root, problems)
	checkMirrors(root, problems)
	checkSkills(root, problems)
	checkText(root, files, problems)
	checkLicenseAndAssets(root, problems)
	return problems
}

if (import.meta.main) {
	const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..'))
	const problems = validateDistribution(root)
	for (const problem of problems) console.error(`${problem.file}: [${problem.rule}] ${problem.message}`)
	console.log(problems.length === 0 ? 'distribution is valid' : `${problems.length} problem(s)`)
	process.exitCode = problems.length === 0 ? 0 : 1
}
