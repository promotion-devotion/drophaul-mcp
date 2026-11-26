import { expect, test } from 'bun:test'
import { runSmoke } from '../tooling/smoke'

const ENDPOINT = 'https://api.example.test/mcp'
const ISSUER = 'https://api.example.test'
const PRM = `${ISSUER}/.well-known/oauth-protected-resource/mcp`
const SCHEME = 'Bearer'

type Routes = Record<string, () => Response>

function authorizationServer(overrides: Record<string, unknown> = {}): () => Response {
	return () =>
		Response.json({
			issuer: ISSUER,
			authorization_endpoint: 'https://app.example.test/authorize',
			token_endpoint: `${ISSUER}/token`,
			jwks_uri: `${ISSUER}/jwks`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			code_challenge_methods_supported: ['S256'],
			...overrides,
		})
}

function healthyRoutes(): Routes {
	const prm = () =>
		Response.json({ resource: ENDPOINT, authorization_servers: [ISSUER], bearer_methods_supported: ['header'] })
	return {
		[`POST ${ENDPOINT}`]: () =>
			Response.json(
				{ jsonrpc: '2.0', id: 1, error: { code: -32001, message: 'Unauthorized.' } },
				{ status: 401, headers: { 'www-authenticate': `${SCHEME} resource_metadata="${PRM}", scope="self:read"` } }
			),
		[`GET ${PRM}`]: prm,
		[`GET ${ISSUER}/.well-known/oauth-protected-resource`]: prm,
		[`GET ${ISSUER}/.well-known/oauth-authorization-server`]: authorizationServer(),
		[`GET ${ISSUER}/jwks`]: () => Response.json({ keys: [{ kty: 'OKP' }] }),
	}
}

function fetcherFor(routes: Routes) {
	return async (input: string, init?: RequestInit) => {
		if (init?.headers && new Headers(init.headers).has('authorization'))
			throw new Error('smoke must never authenticate')
		const route = routes[`${init?.method ?? 'GET'} ${input}`]
		return route ? route() : new Response('not found', { status: 404 })
	}
}

function failed(checks: Awaited<ReturnType<typeof runSmoke>>): string[] {
	return checks.filter((check) => !check.ok).map((check) => check.name)
}

test('a healthy deployment passes every discovery check', async () => {
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(healthyRoutes())))).toEqual([])
})

test('an endpoint that answers without a token fails', async () => {
	const routes = healthyRoutes()
	routes[`POST ${ENDPOINT}`] = () => Response.json({ jsonrpc: '2.0', id: 1, result: {} })
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toContain('unauthenticated_challenge')
})

test('a 401 without resource_metadata fails', async () => {
	const routes = healthyRoutes()
	routes[`POST ${ENDPOINT}`] = () =>
		Response.json({ error: { code: -32001 } }, { status: 401, headers: { 'www-authenticate': 'Bearer' } })
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toContain('unauthenticated_challenge')
})

test('protected resource metadata naming another resource fails', async () => {
	const routes = healthyRoutes()
	routes[`GET ${PRM}`] = () =>
		Response.json({ resource: 'https://other.example.test/mcp', authorization_servers: [ISSUER] })
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toContain(
		'protected_resource_metadata /.well-known/oauth-protected-resource/mcp'
	)
})

test('a mismatched issuer fails', async () => {
	const routes = healthyRoutes()
	routes[`GET ${ISSUER}/.well-known/oauth-authorization-server`] = authorizationServer({
		issuer: 'https://evil.example.test',
	})
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toEqual(['authorization_server_metadata'])
})

test('an authorization server without S256 PKCE fails', async () => {
	const routes = healthyRoutes()
	routes[`GET ${ISSUER}/.well-known/oauth-authorization-server`] = authorizationServer({
		code_challenge_methods_supported: ['plain'],
	})
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toEqual(['pkce_s256'])
})

test('an empty key set fails', async () => {
	const routes = healthyRoutes()
	routes[`GET ${ISSUER}/jwks`] = () => Response.json({ keys: [] })
	expect(failed(await runSmoke(ENDPOINT, fetcherFor(routes)))).toEqual(['jwks_published'])
})
