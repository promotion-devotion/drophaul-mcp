# Install the DropHaul MCP server

One page covering every supported client: Claude Code, Claude.ai, ChatGPT, and the Codex CLI. Per-surface detail lives in [claude-code.md](claude-code.md), [claude-ai.md](claude-ai.md), [chatgpt.md](chatgpt.md), and [codex.md](codex.md). Failure modes are in [troubleshooting.md](troubleshooting.md).

## Endpoint

```text
https://api.drophaul.app/mcp
```

That is the canonical production HTTP action. The legacy production `convex.site` origin remains available for ingress, but its discovery documents advertise the canonical issuer, resource, token, and JWKS URLs. Access tokens minted for the legacy issuer/audience are not accepted. A refresh token may produce a canonical access token automatically if the client omits `resource`; an explicitly legacy resource is not rewritten. If refresh fails, reconnect at the canonical URL. Staging uses the same path on its own `*.convex.site` host; configure a staging URL directly in the client being tested.

The server speaks strict, stateless **MCP 2026-07-28 over HTTP**. Requests use
`POST`; `OPTIONS` serves CORS; `GET` and `DELETE` explicitly return 405 because
there is no session stream or termination operation. Every request carries its
protocol version and client capabilities, every current DropHaul result is one
JSON response, and `server/discover` replaces `initialize`. It accepts either a
DropHaul personal access token as a bearer credential, or an OAuth 2.1 authorization-code + PKCE (S256) flow discoverable at `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, and `/.well-known/oauth-protected-resource/mcp`.

## Choose a setup path

For ChatGPT, Claude.ai, Claude Desktop, and Cowork, add the literal endpoint
above as a custom Streamable HTTP connection and complete client-managed OAuth.
For Claude Code and Codex, install the Git-backed package to get the same remote
server plus the bundled workflow skills. Neither normal path requires copying
a PAT.

## Claude Code

Use Claude Code 2.1.232 or later and pin its v2 MCP runtime before installing:

```bash
claude --version
export MCP_SDK_GENERATION=v2
export MCP_PROTOCOL_NEGOTIATION=auto
```

The overrides prevent cloud-hosted, app-gateway, and disabled feature-fetch
environments from falling back to the legacy runtime.

Add the published DropHaul marketplace, then install its plugin:

```bash
claude plugin marketplace add promotion-devotion/drophaul-mcp
claude plugin install drophaul@drophaul
```

Run `/reload-plugins`, then `/mcp`, approve the `drophaul` server, and call `whoami`.

The plugin bundles the remote server plus four prompt-only skills:

| Skill | Use it for |
| --- | --- |
| `/drophaul:plan-my-day` | Role-aware morning briefing from schedule, route, weather, and alerts. |
| `/drophaul:optimize-routes` | Review and improve route sequencing before committing changes. |
| `/drophaul:dispatch-review` | Audit coverage, assignments, and at-risk stops. |
| `/drophaul:invoice-chase` | Prioritize overdue and uninvoiced work for follow-up. |

The bundled `.mcp.json`:

```json
{"mcpServers":{"drophaul":{"type":"http","url":"https://api.drophaul.app/mcp"}}}
```

The bundled adapter contains no bearer header or credential environment
variable. Claude Code completes OAuth for the HTTP server.

Prefer no plugin?

### Advanced direct PAT setup

Add the server with a deliberately local bearer credential:

```bash
claude mcp add --transport http --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://api.drophaul.app/mcp
```

## Claude.ai and Claude Desktop

Claude connects **from Anthropic's cloud**, not from your machine — true for
Claude Desktop and Cowork as well.

**Free, Pro, and Max**

Free accounts support one custom connector.

1. Go to **Customize → Connectors**.
2. Click **+**, then **Add custom connector**.
3. Enter `https://api.drophaul.app/mcp`.
4. Click **Add**, then **Connect**, and complete the DropHaul sign-in.

**Team and Enterprise**

1. An Owner or Primary Owner goes to **Organization settings → Connectors**, clicks **Add**, hovers **Custom**, and selects **Web**.
2. They enter the same URL and click **Add**.
3. Each member then goes to **Customize → Connectors**, finds the connector, and clicks **Connect**.

Enable it per conversation from the **+** button → **Connectors**.

DropHaul supports Client ID Metadata Documents (CIMD) for public OAuth clients;
it does not advertise a dynamic client registration endpoint. If Claude cannot
connect, use the
[troubleshooting guide](troubleshooting.md) and contact
[support](mailto:support@drophaul.app); do not invent client credentials or
paste unrelated tokens.

Connector URLs are not editable in place; remove and re-add to change one.

## ChatGPT custom connector

1. Open **Settings → Security and login** and turn on **Developer mode**.
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins) and click **+**.
3. Give it a name and description.
4. Under **Connection**, enter the server URL including the `/mcp` path: `https://api.drophaul.app/mcp`
5. Create the connection, complete the OAuth sign-in, and review the requested scopes.
6. Review the tools and metadata discovered from the server.

The server publishes closed OpenAI connector `search` and `fetch` shapes: `search` takes only `{ query }` and returns `results[]` of `{ id, title, url }`; `fetch` takes only `{ id }` and returns `{ id, title, text, url, metadata? }`.

**Scan Tools** belongs to the separate public plugin submission portal. It is not a step in the developer connection above.

ChatGPT's connector surface changes frequently. If the menu labels differ, follow OpenAI's current [Connect your MCP server to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt) guide.

## Codex CLI (client-managed OAuth)

The published repository is a Codex marketplace:

```bash
codex features enable mcp_2026_07_28
codex features list
codex plugin marketplace add promotion-devotion/drophaul-mcp
codex plugin add drophaul@drophaul
codex plugin list
```

For a direct MCP-only setup without the packaged skills, use:

```bash
codex features enable mcp_2026_07_28
codex features list
codex mcp add drophaul --url https://api.drophaul.app/mcp
codex mcp login drophaul
```

Or edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.drophaul]
url = "https://api.drophaul.app/mcp"
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

`default_tools_approval_mode = "writes"` makes Codex prompt for any tool not marked read-only — recommended for a dispatch system.

Use `codex mcp list` to inspect configured servers and `/mcp` inside the Codex
TUI to see active ones. The hosted OAuth flow supports public-client
registration through CIMD. The PAT flow below remains an advanced
local/developer setup only.

## Advanced: personal access token

Personal access tokens are for deliberate direct-bearer setups only. The
custom OAuth, Claude package, and Codex package paths contain no PAT.

1. Sign in at [DropHaul API Tokens](https://drophaul.app/settings/api-tokens)
   as an **owner** or **admin**. No other role can mint or revoke tokens.
2. Choose **Create token** and pick `operator` for a human-controlled client, or
   `agent` only for non-production autonomous-agent testing described in
   [agent-testing.md](agent-testing.md).
3. Select the smallest scopes needed, create the token, and copy the `dh_pat_…`
   value once. DropHaul stores only its hash and last four characters.
4. Export it only in the local client process:

   ```bash
   export DROPHAUL_MCP_KEY="dh_pat_…"
   ```

Never commit the token or paste it into shared configuration. Scopes are always
intersected with the owner's live permissions, and revocation takes effect on
the next request.

## Safety

- Call `whoami` first and confirm the organization and roles before acting on business data.
- Write and dispatch tools go through an explicit preview → confirm handshake; never confirm a write you have not reviewed by display ID.
- Read [security.md](security.md) and [security-boundaries.md](security-boundaries.md) before granting any `:write`, `jobs:dispatch`, or `routes:optimize` scope.
