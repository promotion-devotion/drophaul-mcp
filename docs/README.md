# DropHaul MCP documentation

Start at [installation.md](installation.md) — it covers every supported client on one page. The
per-client pages go deeper:

- [claude-code.md](claude-code.md) — Claude Code plugin, direct PAT, direct OAuth
- [claude-ai.md](claude-ai.md) — Claude.ai, Claude Desktop, and Cowork custom connector
- [chatgpt.md](chatgpt.md) — ChatGPT developer-mode connector
- [codex.md](codex.md) — Codex CLI

Read before granting write access:

- [security.md](security.md) — scopes, credentials, approvals, prompt injection, incident response
- [security-boundaries.md](security-boundaries.md) — the capabilities MCP deliberately cannot reach

When something fails:

- [troubleshooting.md](troubleshooting.md) — status codes, connection checklist, support bundle

For automated agents:

- [agent-testing.md](agent-testing.md) — the three testing lanes and their credential rules

Directory and compliance disclosures live in [directory/](directory/): [privacy](directory/privacy.md),
[security](directory/security.md), [support](directory/support.md), and
[disconnect](directory/disconnect.md).

## A note on source-file references

Several pages cite implementation files by path — `packages/shared/src/schemas/mcp.ts`,
`packages/backend/convex/mcp/oauthMetadata.ts`, and similar. Those paths refer to the private DropHaul
monorepo where the server is implemented, not to this repository. They are provenance for the claim
being made, not files you can open here.
