# Use DropHaul from Claude Code

Claude Code can install the DropHaul plugin or connect directly. Use Claude
Code 2.1.64 or later for current OAuth metadata behavior.

## Install from a local distribution

From the root of an allowlisted distribution:

```sh
claude plugin marketplace add ./
claude plugin install drophaul@drophaul
```

Run `/reload-plugins`, then `/mcp`. Approve the `drophaul` server and run `whoami`.

The plugin provides four prompt-only skills:

- `/drophaul:plan-my-day`
- `/drophaul:optimize-routes`
- `/drophaul:dispatch-review`
- `/drophaul:invoice-chase`

The bundled `.mcp.json` uses the literal production endpoint `https://majestic-emu-550.convex.site/mcp` with no header or environment interpolation. Claude Code performs OAuth for the HTTP server; use the separate direct-PAT setup below only when an operator deliberately chooses a local bearer credential.

## Install from the vendor-neutral MCP hub after public package release

After publication authorization and the public repository release:

```sh
claude plugin marketplace add promotion-devotion/drophaul-mcp
claude plugin install drophaul@drophaul
```

Claude Code marketplace installation requires the Git repository above. The
repository is not considered published until an approved package push occurs
and a fresh install from GitHub passes. The local staging tree does not
substitute for publication evidence. Other MCP clients, including ChatGPT
directory review, use the deployed endpoint and public policy/support metadata;
they do not require a Claude-named repository or this marketplace package.

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

Use the plugin for team workflows; use local scope for a personal credential. Never commit a header containing the expanded token.

## Direct OAuth setup

```sh
claude mcp add --transport http --scope local drophaul-oauth \
  https://majestic-emu-550.convex.site/mcp
```

Run `/mcp`, choose `drophaul-oauth`, and follow **Authenticate**. Until public client registration is authorized, this works only with a client already registered by the operator.

Use **Clear authentication** in `/mcp` to remove local OAuth credentials. Revoke DropHaul consent as well when access should end.

See [agent testing](agent-testing.md), [security](security.md), and [troubleshooting](troubleshooting.md).
