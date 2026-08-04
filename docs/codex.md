# Use DropHaul from Codex

DropHaul exposes one Streamable HTTP endpoint:

```text
https://majestic-emu-550.convex.site/mcp
```

Use either a scoped personal access token (PAT) or OAuth. Do not configure both on the same Codex server entry.

## PAT setup

Create an **operator** token in DropHaul at **Settings → API Tokens**. Choose only the scopes needed for the task, copy the secret once, and store it in your shell or secret manager:

```sh
export DROPHAUL_MCP_KEY='<paste the one-time token here>'
codex mcp add drophaul \
  --url https://majestic-emu-550.convex.site/mcp \
  --bearer-token-env-var DROPHAUL_MCP_KEY
codex mcp get drophaul --json
```

The equivalent `~/.codex/config.toml` entry is:

```toml
[mcp_servers.drophaul]
url = "https://majestic-emu-550.convex.site/mcp"
bearer_token_env_var = "DROPHAUL_MCP_KEY"
```

Start a new Codex session after setting the environment variable. Never put the token value in TOML, a prompt, shell history, a repository file, or a screenshot.

## OAuth setup

OAuth uses a public client registered by the DropHaul operator. Public pre-login client registration remains disabled until its external security authorization is complete, so obtain the client ID through the support channel before this flow:

```sh
export DROPHAUL_OAUTH_CLIENT_ID='<registered public client id>'
codex mcp add drophaul-oauth \
  --url https://majestic-emu-550.convex.site/mcp \
  --oauth-client-id "$DROPHAUL_OAUTH_CLIENT_ID" \
  --oauth-resource https://majestic-emu-550.convex.site/mcp
codex mcp login drophaul-oauth
codex mcp get drophaul-oauth --json
```

The browser flow signs in to DropHaul, requires an explicit company selection, and shows the requested scopes. Codex stores and refreshes OAuth credentials separately from the repository. Use `codex mcp logout drophaul-oauth` to clear them.

## Verify a clean session

1. Run `whoami`; verify the user, company, and roles before reading business data.
2. Run one bounded read, such as `get_schedule` for an explicit date.
3. For a staging CRUD check, create one disposable record with a unique idempotency key, fetch it by its public display ID, retry the exact create with the same key, and verify there is still one record.
4. Revoke the credential in **Settings → API Tokens** or disconnect OAuth, then verify the next call is denied.

Use the [agent-testing lanes](agent-testing.md) for coding-agent work. Read [security](security.md) before enabling writes and [troubleshooting](troubleshooting.md) when setup fails.

## Remove the server

```sh
codex mcp remove drophaul
codex mcp remove drophaul-oauth
```

Removing a configuration does not revoke a PAT. Revoke it in DropHaul too.
