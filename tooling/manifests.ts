import { Schema } from 'effect'

export const ENDPOINT = 'https://api.drophaul.app/mcp'
export const REGISTRY_NAME = 'io.github.promotion-devotion/drophaul'
export const REPOSITORY_URL = 'https://github.com/promotion-devotion/drophaul-mcp'
export const AGENT_PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
export const AGENT_MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json'

const SemVer = Schema.String.check(Schema.isPattern(/^\d+\.\d+\.\d+$/))
const HttpsUrl = Schema.String.check(Schema.isPattern(/^https:\/\/[^\s]+$/))
const Text = Schema.NonEmptyString
const Email = Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/))
const Keywords = Schema.Array(Text)

const Author = Schema.Struct({
	name: Text,
	email: Email,
	url: Schema.optionalKey(HttpsUrl),
})

export const ClaudePlugin = Schema.Struct({
	name: Schema.Literal('drophaul'),
	version: SemVer,
	description: Text,
	author: Author,
	homepage: HttpsUrl,
	repository: Schema.Literal(REPOSITORY_URL),
	license: Schema.Literal('Apache-2.0'),
	keywords: Keywords,
})

export const ClaudeMarketplace = Schema.Struct({
	name: Schema.Literal('drophaul'),
	owner: Author,
	description: Text,
	plugins: Schema.Tuple([
		Schema.Struct({
			name: Schema.Literal('drophaul'),
			source: Schema.Literal('./'),
			version: Schema.optionalKey(SemVer),
			description: Text,
			homepage: HttpsUrl,
			repository: Schema.Literal(REPOSITORY_URL),
			category: Text,
			tags: Keywords,
		}),
	]),
})

export const CodexPlugin = Schema.Struct({
	name: Schema.Literal('drophaul'),
	version: SemVer,
	description: Text,
	author: Author,
	homepage: HttpsUrl,
	repository: Schema.Literal(REPOSITORY_URL),
	license: Schema.Literal('Apache-2.0'),
	keywords: Keywords,
	skills: Schema.Literal('./skills/'),
	mcpServers: Schema.Literal('./.mcp.json'),
	apps: Schema.optionalKey(Schema.Literal('./.app.json')),
	interface: Schema.Struct({
		displayName: Text,
		shortDescription: Text,
		longDescription: Text,
		developerName: Text,
		category: Text,
		capabilities: Keywords,
		websiteURL: HttpsUrl,
		supportURL: HttpsUrl,
		privacyPolicyURL: HttpsUrl,
		termsOfServiceURL: HttpsUrl,
		brandColor: Schema.String.check(Schema.isPattern(/^#[0-9A-Fa-f]{6}$/)),
		composerIcon: Schema.Literal('./assets/drophaul.svg'),
		logo: Schema.Literal('./assets/drophaul.svg'),
		defaultPrompt: Keywords,
	}),
})

export const CodexMarketplace = Schema.Struct({
	name: Schema.Literal('drophaul'),
	interface: Schema.Struct({ displayName: Text }),
	plugins: Schema.Tuple([
		Schema.Struct({
			name: Schema.Literal('drophaul'),
			version: Schema.optionalKey(SemVer),
			source: Schema.Struct({ source: Schema.Literal('local'), path: Schema.Literal('./plugins/drophaul') }),
			policy: Schema.Struct({
				installation: Schema.Literal('AVAILABLE'),
				authentication: Schema.Literal('ON_INSTALL'),
			}),
			category: Schema.Literal('Business & Operations'),
		}),
	]),
})

export const PortablePlugin = Schema.Struct({
	$schema: Schema.Literal(AGENT_PLUGIN_SCHEMA),
	name: Schema.Literal('drophaul'),
	version: SemVer,
	description: Text,
	author: Author,
	homepage: HttpsUrl,
	repository: Schema.Literal(REPOSITORY_URL),
	license: Schema.Literal('Apache-2.0'),
	keywords: Keywords,
})

export const PortableMcp = Schema.Struct({
	$schema: Schema.Literal(AGENT_MCP_SCHEMA),
	mcpServers: Schema.Struct({
		drophaul: Schema.Struct({ type: Schema.Literal('streamable-http'), url: Schema.Literal(ENDPOINT) }),
	}),
})

export const ClaudeMcp = Schema.Struct({
	mcpServers: Schema.Struct({
		drophaul: Schema.Struct({ type: Schema.Literal('http'), url: Schema.Literal(ENDPOINT) }),
	}),
})

export const RegisteredApp = Schema.Struct({
	apps: Schema.Struct({
		drophaul: Schema.Struct({
			id: Schema.String.check(Schema.isPattern(/^plugin_asdk_app_[A-Za-z0-9]+$/)),
			category: Schema.optionalKey(Text),
		}),
	}),
})

export const RegistryServer = Schema.Struct({
	$schema: Schema.Literal('https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'),
	name: Schema.Literal(REGISTRY_NAME),
	title: Schema.Literal('DropHaul'),
	description: Text,
	version: SemVer,
	repository: Schema.Struct({ url: Schema.Literal(REPOSITORY_URL), source: Schema.Literal('github') }),
	remotes: Schema.Tuple([Schema.Struct({ type: Schema.Literal('streamable-http'), url: Schema.Literal(ENDPOINT) })]),
})

export const OpenAiSkillInterface = Schema.Struct({
	interface: Schema.Struct({
		display_name: Text,
		short_description: Text,
		default_prompt: Text,
	}),
})

export const MANIFESTS = [
	{ path: 'server.json', schema: RegistryServer, versioned: true },
	{ path: 'plugin.json', schema: PortablePlugin, versioned: true },
	{ path: 'mcp.json', schema: PortableMcp, versioned: false },
	{ path: '.mcp.json', schema: ClaudeMcp, versioned: false },
	{ path: '.claude-plugin/plugin.json', schema: ClaudePlugin, versioned: true },
	{ path: '.claude-plugin/marketplace.json', schema: ClaudeMarketplace, versioned: false },
	{ path: '.codex-plugin/plugin.json', schema: CodexPlugin, versioned: true },
	{ path: '.agents/plugins/marketplace.json', schema: CodexMarketplace, versioned: false },
	{ path: 'plugins/drophaul/.codex-plugin/plugin.json', schema: CodexPlugin, versioned: true },
	{ path: 'plugins/drophaul/.mcp.json', schema: ClaudeMcp, versioned: false },
] as const

export function decodeManifest(schema: Schema.Decoder<unknown>, value: unknown): string | undefined {
	try {
		Schema.decodeUnknownSync(schema)(value, { onExcessProperty: 'error', errors: 'all' })
		return undefined
	} catch (error) {
		return error instanceof Error ? error.message : String(error)
	}
}
