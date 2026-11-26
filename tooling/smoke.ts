import { ENDPOINT } from './manifests'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>
export type Check = { readonly name: string; readonly ok: boolean; readonly detail: string }

const INITIALIZE = {
	jsonrpc: '2.0',
	id: 'drophaul-mcp-smoke',
	method: 'initialize',
	params: {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'drophaul-mcp-distribution-smoke', version: '1.0.0' },
	},
}

async function readJson(fetcher: Fetcher, url: string): Promise<{ status: number; body: Record<string, unknown> }> {
	const response = await fetcher(url, { headers: { accept: 'application/json' }, redirect: 'manual' })
	let body: Record<string, unknown> = {}
	try {
		const parsed = await response.json()
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
			body = parsed as Record<string, unknown>
	} catch {}
	return { status: response.status, body }
}

function resourceMetadataUrl(challenge: string): string | undefined {
	return challenge.match(/^Bearer\s.*\bresource_metadata="(https:\/\/[^"]+)"/)?.[1]
}

function includes(value: unknown, expected: string): boolean {
	return Array.isArray(value) && value.includes(expected)
}

export async function runSmoke(endpoint: string = ENDPOINT, fetcher: Fetcher = fetch): Promise<Check[]> {
	const resource = new URL(endpoint)
	const origin = resource.origin
	const checks: Check[] = []

	const unauthenticated = await fetcher(endpoint, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
		body: JSON.stringify(INITIALIZE),
		redirect: 'manual',
	})
	const challenge = unauthenticated.headers.get('www-authenticate') ?? ''
	const advertised = resourceMetadataUrl(challenge)
	let errorCode: unknown
	try {
		errorCode = ((await unauthenticated.json()) as { error?: { code?: unknown } }).error?.code
	} catch {}
	checks.push({
		name: 'unauthenticated_challenge',
		ok:
			unauthenticated.status === 401 &&
			advertised === `${origin}/.well-known/oauth-protected-resource${resource.pathname}` &&
			errorCode === -32001,
		detail: `HTTP ${unauthenticated.status}; resource_metadata=${advertised ?? 'missing'}; error=${String(errorCode)}`,
	})

	const metadataUrls = [
		...new Set([
			`${origin}/.well-known/oauth-protected-resource${resource.pathname}`,
			`${origin}/.well-known/oauth-protected-resource`,
			...(advertised ? [advertised] : []),
		]),
	]
	let authorizationServer: string | undefined
	for (const url of metadataUrls) {
		const { status, body } = await readJson(fetcher, url)
		const servers = body.authorization_servers
		const ok =
			status === 200 &&
			body.resource === endpoint &&
			Array.isArray(servers) &&
			servers.length === 1 &&
			servers[0] === origin
		if (ok) authorizationServer ??= servers[0] as string
		checks.push({
			name: `protected_resource_metadata ${new URL(url).pathname}`,
			ok,
			detail: `HTTP ${status}; resource=${String(body.resource)}; authorization_servers=${JSON.stringify(servers)}`,
		})
	}

	if (!authorizationServer) {
		checks.push({ name: 'authorization_server_metadata', ok: false, detail: 'no authorization server advertised' })
		return checks
	}
	const issuer = new URL(authorizationServer)
	const issuerPath = issuer.pathname === '/' ? '' : issuer.pathname
	const metadataUrl = `${issuer.origin}/.well-known/oauth-authorization-server${issuerPath}`
	const { status, body } = await readJson(fetcher, metadataUrl)
	const httpsEndpoint = (value: unknown) => typeof value === 'string' && value.startsWith('https://')
	checks.push({
		name: 'authorization_server_metadata',
		ok:
			status === 200 &&
			body.issuer === authorizationServer &&
			httpsEndpoint(body.authorization_endpoint) &&
			httpsEndpoint(body.token_endpoint) &&
			httpsEndpoint(body.jwks_uri) &&
			includes(body.response_types_supported, 'code') &&
			includes(body.grant_types_supported, 'authorization_code'),
		detail: `HTTP ${status}; issuer=${String(body.issuer)}`,
	})
	checks.push({
		name: 'pkce_s256',
		ok: includes(body.code_challenge_methods_supported, 'S256'),
		detail: `code_challenge_methods_supported=${JSON.stringify(body.code_challenge_methods_supported)}`,
	})
	if (httpsEndpoint(body.jwks_uri)) {
		const jwks = await readJson(fetcher, body.jwks_uri as string)
		const keys = jwks.body.keys
		checks.push({
			name: 'jwks_published',
			ok: jwks.status === 200 && Array.isArray(keys) && keys.length > 0,
			detail: `HTTP ${jwks.status}; ${Array.isArray(keys) ? keys.length : 0} key(s)`,
		})
	} else checks.push({ name: 'jwks_published', ok: false, detail: 'jwks_uri missing' })
	return checks
}

if (import.meta.main) {
	const checks = await runSmoke(process.env.MCP_SMOKE_ENDPOINT || ENDPOINT)
	for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`)
	process.exitCode = checks.every((check) => check.ok) ? 0 : 1
}
