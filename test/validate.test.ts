import { afterEach, describe, expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateDistribution } from '../tooling/validate'

const ROOT = join(import.meta.dirname, '..')
const copies: string[] = []

function copyRepository(): string {
	const target = mkdtempSync(join(tmpdir(), 'drophaul-mcp-validate-'))
	copies.push(target)
	cpSync(ROOT, target, {
		recursive: true,
		filter: (source) => !/[/\\](?:node_modules|\.git)(?:[/\\]|$)/.test(source.slice(ROOT.length)),
	})
	return target
}

function editJson(root: string, path: string, edit: (value: Record<string, any>) => void): void {
	const value = JSON.parse(readFileSync(join(root, path), 'utf8'))
	edit(value)
	writeFileSync(join(root, path), `${JSON.stringify(value, null, '\t')}\n`)
}

function append(root: string, path: string, text: string): void {
	writeFileSync(join(root, path), readFileSync(join(root, path), 'utf8') + text)
}

function rulesFor(root: string, file?: string): string[] {
	return validateDistribution(root)
		.filter((problem) => file === undefined || problem.file === file)
		.map((problem) => problem.rule)
}

afterEach(() => {
	for (const copy of copies.splice(0)) rmSync(copy, { recursive: true, force: true })
})

test('the committed distribution satisfies every rule', () => {
	expect(validateDistribution(ROOT)).toEqual([])
})

describe('manifests', () => {
	test('a malformed JSON file is reported', () => {
		const root = copyRepository()
		writeFileSync(join(root, 'docs/extra.json'), '{"a":')
		expect(rulesFor(root, 'docs/extra.json')).toContain('json-parse')
	})

	test('server.json must satisfy the vendored MCP Registry schema', () => {
		const root = copyRepository()
		editJson(root, 'server.json', (server) => {
			server.remotes[0].headers = [{ name: 42 }]
		})
		expect(rulesFor(root, 'server.json')).toContain('registry-schema')
	})

	test('server.json may not declare a schema we have not vendored', () => {
		const root = copyRepository()
		editJson(root, 'server.json', (server) => {
			server.$schema = 'https://static.modelcontextprotocol.io/schemas/2099-01-01/server.schema.json'
		})
		expect(rulesFor(root, 'server.json')).toContain('registry-schema')
	})

	test('unknown manifest keys are rejected so typos cannot ship', () => {
		const root = copyRepository()
		editJson(root, '.codex-plugin/plugin.json', (plugin) => {
			plugin.interface.supportUrl = plugin.interface.supportURL
			delete plugin.interface.supportURL
		})
		expect(rulesFor(root, '.codex-plugin/plugin.json')).toContain('manifest-schema')
	})

	test.each(['supportURL', 'privacyPolicyURL', 'termsOfServiceURL', 'websiteURL'])('%s is required', (field) => {
		const root = copyRepository()
		editJson(root, 'plugins/drophaul/.codex-plugin/plugin.json', (plugin) => {
			delete plugin.interface[field]
		})
		expect(rulesFor(root, 'plugins/drophaul/.codex-plugin/plugin.json')).toContain('manifest-schema')
	})

	test('directory URLs must be https', () => {
		const root = copyRepository()
		editJson(root, '.codex-plugin/plugin.json', (plugin) => {
			plugin.interface.privacyPolicyURL = 'http://www.drophaul.app/privacy'
		})
		expect(rulesFor(root, '.codex-plugin/plugin.json')).toContain('manifest-schema')
	})

	test('the Codex manifest may only link apps when a registered .app.json exists', () => {
		const root = copyRepository()
		editJson(root, '.codex-plugin/plugin.json', (plugin) => {
			plugin.apps = './.app.json'
		})
		expect(rulesFor(root, '.codex-plugin/plugin.json')).toContain('registered-app')
	})
})

describe('versions', () => {
	test.each([
		'plugin.json',
		'.claude-plugin/plugin.json',
		'.codex-plugin/plugin.json',
		'plugins/drophaul/.codex-plugin/plugin.json',
	])('%s must match the server.json version', (path) => {
		const root = copyRepository()
		editJson(root, path, (manifest) => {
			manifest.version = '9.9.9'
		})
		expect(rulesFor(root, path)).toContain('version-agreement')
	})

	test('a marketplace entry version must match server.json', () => {
		const root = copyRepository()
		editJson(root, '.claude-plugin/marketplace.json', (marketplace) => {
			marketplace.plugins[0].version = '0.0.1'
		})
		expect(rulesFor(root, '.claude-plugin/marketplace.json')).toContain('version-agreement')
	})
})

describe('endpoint', () => {
	test.each(['mcp.json', '.mcp.json', 'server.json'])('%s must point at the production endpoint', (path) => {
		const root = copyRepository()
		const text = readFileSync(join(root, path), 'utf8').replace(
			'https://api.drophaul.app/mcp',
			'https://staging.drophaul.app/mcp'
		)
		writeFileSync(join(root, path), text)
		expect(rulesFor(root, path)).toEqual(expect.arrayContaining(['endpoint']))
	})

	test.each([
		'https://api.drophaul.app/mcp/v2',
		'https://api.drophaul.app/sse',
		'http://api.drophaul.app/mcp',
		'https://convex.drophaul.app/mcp',
	])('documentation may not reference %s', (url) => {
		const root = copyRepository()
		append(root, 'docs/codex.md', `\nConnect to ${url} instead.\n`)
		expect(rulesFor(root, 'docs/codex.md')).toContain('endpoint')
	})

	test('the marketing MCP page is not an endpoint', () => {
		const root = copyRepository()
		append(root, 'docs/codex.md', '\nRead https://www.drophaul.app/mcp for an overview.\n')
		expect(rulesFor(root, 'docs/codex.md')).toEqual([])
	})
})

describe('mirrors', () => {
	test.each([
		'plugins/drophaul/.mcp.json',
		'plugins/drophaul/skills/plan-my-day/SKILL.md',
		'plugins/drophaul/skills/invoice-chase/agents/openai.yaml',
		'plugins/drophaul/assets/drophaul.svg',
	])('%s must be byte-identical to its root copy', (path) => {
		const root = copyRepository()
		append(root, path, ' ')
		expect(rulesFor(root, path)).toContain('mirror')
	})

	test('a file present only in the root skills is reported as missing from the mirror', () => {
		const root = copyRepository()
		writeFileSync(join(root, 'skills/plan-my-day/agents/extra.yaml'), 'a: 1\n')
		expect(rulesFor(root, 'plugins/drophaul/skills/plan-my-day/agents/extra.yaml')).toContain('mirror')
	})
})

describe('skills', () => {
	test('the frontmatter name must match the directory', () => {
		const root = copyRepository()
		for (const base of ['skills', 'plugins/drophaul/skills']) {
			const path = join(root, base, 'dispatch-review/SKILL.md')
			writeFileSync(path, readFileSync(path, 'utf8').replace('name: dispatch-review', 'name: dispatch'))
		}
		expect(rulesFor(root, 'skills/dispatch-review/SKILL.md')).toEqual(['skill-frontmatter'])
	})

	test('a description is required', () => {
		const root = copyRepository()
		const path = join(root, 'skills/plan-my-day/SKILL.md')
		writeFileSync(path, readFileSync(path, 'utf8').replace(/^description: .*$/m, 'description: ""'))
		expect(rulesFor(root, 'skills/plan-my-day/SKILL.md')).toContain('skill-frontmatter')
	})

	test('agents/openai.yaml must parse', () => {
		const root = copyRepository()
		writeFileSync(join(root, 'skills/optimize-routes/agents/openai.yaml'), 'interface:\n  display_name: [unclosed\n')
		expect(rulesFor(root, 'skills/optimize-routes/agents/openai.yaml')).toContain('skill-openai-yaml')
	})

	test('agents/openai.yaml must invoke its own skill', () => {
		const root = copyRepository()
		const path = join(root, 'skills/invoice-chase/agents/openai.yaml')
		writeFileSync(path, readFileSync(path, 'utf8').replaceAll('$invoice-chase', '$plan-my-day'))
		expect(rulesFor(root, 'skills/invoice-chase/agents/openai.yaml')).toContain('skill-openai-yaml')
	})

	test('skills stay prompt-only', () => {
		const root = copyRepository()
		mkdirSync(join(root, 'skills/plan-my-day/scripts'))
		writeFileSync(join(root, 'skills/plan-my-day/scripts/run.sh'), 'echo hi\n')
		expect(rulesFor(root, 'skills/plan-my-day/scripts/run.sh')).toContain('skill-prompt-only')
	})

	test('the skill set is fixed', () => {
		const root = copyRepository()
		rmSync(join(root, 'plugins/drophaul/skills/invoice-chase'), { recursive: true })
		expect(rulesFor(root, 'plugins/drophaul/skills')).toContain('skill-set')
	})
})

describe('markdown links', () => {
	test.each([
		'[guide](missing.md)',
		'![logo](../assets/missing.svg)',
		'<img src="nowhere.png" alt="">',
		'[escape](../../outside.md)',
	])('%s must resolve inside the repository', (link) => {
		const root = copyRepository()
		append(root, 'docs/installation.md', `\n${link}\n`)
		expect(rulesFor(root, 'docs/installation.md')).toContain('relative-link')
	})

	test('existing relative targets, anchors, and external links pass', () => {
		const root = copyRepository()
		append(
			root,
			'docs/installation.md',
			'\n[a](codex.md#setup) [b](#top) [c](mailto:x@example.com) ![d](../assets/drophaul.svg)\n'
		)
		expect(rulesFor(root, 'docs/installation.md')).toEqual([])
	})
})

describe('content scanning', () => {
	test.each([
		['a personal access token', ['dh', 'pat', 'abcdefghijklmnop'].join('_')],
		['a bearer value', `Bearer ${'a1b2c3d4'.repeat(3)}`],
		['a private key', ['-----BEGIN RSA PRIVATE', 'KEY-----'].join(' ')],
		['an API key', `sk-${'A1'.repeat(12)}`],
		['a GitHub token', `ghp_${'a1'.repeat(18)}`],
	])('%s is rejected', (_label, secret) => {
		const root = copyRepository()
		append(root, 'docs/security.md', `\n${secret}\n`)
		expect(rulesFor(root, 'docs/security.md')).toContain('credential')
	})

	test('documented placeholders are not credentials', () => {
		const root = copyRepository()
		append(
			root,
			'docs/security.md',
			// biome-ignore lint/suspicious/noTemplateCurlyInString: the shell placeholder is the documented literal under test
			'\nexport DROPHAUL_MCP_KEY="dh_pat_…"\nAuthorization: Bearer ${DROPHAUL_MCP_KEY}\n'
		)
		expect(rulesFor(root, 'docs/security.md')).toEqual([])
	})

	test('raw Convex document ids are rejected', () => {
		const root = copyRepository()
		append(root, 'docs/troubleshooting.md', '\nJob j57a2b3c4d5e6f7g8h9j0k1m2n3p4q5r failed.\n')
		expect(rulesFor(root, 'docs/troubleshooting.md')).toContain('convex-id')
	})

	test('private monorepo paths are rejected', () => {
		const root = copyRepository()
		append(root, 'docs/troubleshooting.md', `\nSee ${['packages', 'backend', 'convex'].join('/')} for details.\n`)
		expect(rulesFor(root, 'docs/troubleshooting.md')).toContain('private-path')
	})

	test('binary files are rejected', () => {
		const root = copyRepository()
		writeFileSync(join(root, 'docs/image.png'), Buffer.from([137, 80, 78, 71, 0, 255, 254]))
		expect(rulesFor(root, 'docs/image.png')).toContain('binary')
	})

	test('symbolic links are rejected', () => {
		const root = copyRepository()
		symlinkSync(join(root, 'README.md'), join(root, 'docs/link.md'))
		expect(rulesFor(root, 'docs/link.md')).toContain('symlink')
	})
})

describe('license and brand asset', () => {
	test('the license must stay Apache-2.0', () => {
		const root = copyRepository()
		writeFileSync(join(root, 'LICENSE'), 'All rights reserved. Proprietary and confidential.\n')
		expect(rulesFor(root, 'LICENSE')).toContain('license')
	})

	test('the brand asset must stay a square 192px image', () => {
		const root = copyRepository()
		for (const path of ['assets/drophaul.svg', 'plugins/drophaul/assets/drophaul.svg']) {
			const file = join(root, path)
			writeFileSync(file, readFileSync(file, 'utf8').replace('viewBox="0 0 192 192"', 'viewBox="0 0 192 96"'))
		}
		expect(rulesFor(root, 'assets/drophaul.svg')).toContain('brand-asset')
	})
})
