# Use DropHaul from Claude Code

Claude Code can install the DropHaul plugin or connect directly. Use Claude
Code 2.1.232 or later, whose v2 MCP runtime can negotiate DropHaul's strict
`2026-07-28` wire contract. Before installing, verify the runtime explicitly:

```sh
claude --version
export MCP_SDK_GENERATION=v2
export MCP_PROTOCOL_NEGOTIATION=auto
```

The environment overrides matter in cloud-hosted environments, app-gateway
sessions, or installations where feature-flag fetching is disabled; those
cases may otherwise retain the legacy runtime even on a current version.

## Install the published package

Add the public DropHaul marketplace, then install its plugin:

```sh
claude plugin marketplace add promotion-devotion/drophaul-mcp
claude plugin install drophaul@drophaul
```

Run `/reload-plugins`, then `/mcp`. Approve the `drophaul` server and run `whoami`.

The plugin provides four prompt-only skills:

- `/drophaul:plan-my-day`
- `/drophaul:optimize-routes`
- `/drophaul:dispatch-review`
- `/drophaul:invoice-chase`

The bundled `.mcp.json` uses the literal production endpoint
`https://majestic-emu-550.convex.site/mcp` with no header or environment
interpolation. The package uses client-managed OAuth for the HTTP server; use
the separate direct-PAT setup below only when an operator deliberately chooses
a local bearer credential.

This Git-backed marketplace is the standard technical installation path for
Claude Code.

## Advanced direct PAT setup

```sh
export DROPHAUL_MCP_KEY='<paste the one-time token here>'
claude mcp add \
  --transport http \
  --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://majestic-emu-550.convex.site/mcp
claude mcp get drophaul
```

Create the operator token at
[DropHaul API Tokens](https://drophaul.app/settings/api-tokens). The value is
shown once.

Use the plugin for team workflows; use local scope for a personal credential. Never commit a header containing the expanded token.

## Direct OAuth setup

```sh
claude mcp add --transport http --scope local drophaul-oauth \
  https://majestic-emu-550.convex.site/mcp
```

Run `/mcp`, choose `drophaul-oauth`, and follow **Authenticate**. If the client
is not recognized, contact [DropHaul support](mailto:support@drophaul.app); do
not invent client credentials.

Use **Clear authentication** in `/mcp` to remove local OAuth credentials. Revoke DropHaul consent as well when access should end.

See [agent testing](agent-testing.md), [security](security.md), and [troubleshooting](troubleshooting.md).
