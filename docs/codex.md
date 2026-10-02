# Use DropHaul from Codex

DropHaul exposes one Streamable HTTP endpoint:

```text
https://api.drophaul.app/mcp
```

Use the client-managed OAuth setup for normal installs. Do not configure a PAT and OAuth on the same Codex server entry.

## Plugin marketplace package

The generated repository includes a repo-scoped marketplace at
`.agents/plugins/marketplace.json` and an installable package at
`plugins/drophaul`.
DropHaul uses the strict `2026-07-28` MCP wire contract. On Codex 0.148.0 the
matching runtime is still an under-development feature and is disabled by
default, so enable it and verify that its effective state is `true` before
installing or connecting:

```sh
codex features enable mcp_2026_07_28
codex features list
```

Add its repository as a marketplace, install DropHaul, and inspect the result:

```sh
codex plugin marketplace add promotion-devotion/drophaul-mcp
codex plugin add drophaul@drophaul
codex plugin list
```

## OAuth setup

```sh
codex mcp add drophaul --url https://api.drophaul.app/mcp
codex mcp login drophaul
codex mcp get drophaul --json
```

The browser flow signs in to DropHaul, requires an explicit company selection, and shows the requested scopes. Codex stores and refreshes OAuth credentials separately from the repository. Use `codex mcp logout drophaul` to clear them.

DropHaul publishes Client ID Metadata Documents (CIMD) for public OAuth clients.
Complete the client-managed OAuth flow; no separate client registration step is
required. If login reports an unknown or unsupported client, verify that Codex
supports CIMD and contact [support](mailto:support@drophaul.app).

## Advanced PAT setup

Create an **operator** token at [DropHaul API Tokens](https://drophaul.app/settings/api-tokens). Choose only the scopes needed for the task, copy the secret once, and store it in your shell or secret manager:

```sh
export DROPHAUL_MCP_KEY='<paste the one-time token here>'
codex mcp add drophaul \
  --url https://api.drophaul.app/mcp \
  --bearer-token-env-var DROPHAUL_MCP_KEY
codex mcp get drophaul --json
```

The equivalent `~/.codex/config.toml` entry is:

```toml
[mcp_servers.drophaul]
url = "https://api.drophaul.app/mcp"
bearer_token_env_var = "DROPHAUL_MCP_KEY"
```

Start a new Codex session after setting the environment variable. Never put the token value in TOML, a prompt, shell history, a repository file, or a screenshot.

## Verify a clean session

1. Run `whoami`; verify the user, company, and roles before reading business data.
2. Run one bounded read, such as `get_schedule` for an explicit date.
3. For a staging CRUD check, create one disposable record with a unique idempotency key, fetch it by its public display ID, retry the exact create with the same key, and verify there is still one record.
4. Revoke the credential in **Settings → API Tokens** or disconnect OAuth, then verify the next call is denied.

Use the [agent-testing lanes](agent-testing.md) for coding-agent work. Read [security](security.md) before enabling writes and [troubleshooting](troubleshooting.md) when setup fails.

## Remove the server

```sh
codex mcp remove drophaul
```

Removing a configuration does not revoke a PAT. Revoke it in DropHaul too.
