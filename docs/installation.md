# Install the DropHaul MCP server

One page covering every supported client: Claude Code, Claude.ai, ChatGPT, and the Codex CLI. Per-surface detail lives in [claude-code.md](claude-code.md), [claude-ai.md](claude-ai.md), [chatgpt.md](chatgpt.md), and [codex.md](codex.md). Failure modes are in [troubleshooting.md](troubleshooting.md).

## Endpoint

```text
https://majestic-emu-550.convex.site/mcp
```

That is the production Convex deployment (`majestic-emu-550`) HTTP action. Staging uses the same path on its own `*.convex.site` host; configure a staging URL directly in the client being tested.

The server speaks **Streamable HTTP** (`POST` + `OPTIONS` only — no `GET` session stream, no legacy SSE endpoint). It accepts either a DropHaul personal access token as a bearer credential, or an OAuth 2.1 authorization-code + PKCE (S256) flow discoverable at `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, and `/.well-known/oauth-protected-resource/mcp`.

> **Current external status:** a sanctioned staging MCP smoke completed the
> handshake, listed 98 tools, and called the read-only identity tool. The
> staging metadata predates the release candidate's complete tool annotations
> and OAuth security schemes. Production OpenAI OAuth installation, refresh,
> and disconnect still require dogfood after the reviewed backend is deployed.
> Do not treat this package as a public listing or approved connection.

## Advanced: personal access token

Personal access tokens are available for deliberate direct-bearer setups; the packaged Claude, portable, and Codex adapters use client-managed OAuth instead.

1. Sign in at [app.drophaul.app](https://app.drophaul.app) as an **owner** or **admin**. Both `mcp/tokens.create` and `mcp/tokens.revoke` call `auth.requireAnyRole(['owner', 'admin'])`, so no other role can mint or revoke.
2. Open **Settings → API Tokens**.
3. Pick a **kind**:
   - `operator` — a human's own Claude / ChatGPT / Claude Code use. Default **90 days**, maximum **365**.
   - `agent` — autonomous coding-agent testing. Default **14 days**, maximum **30**. Rejected on production deployments; see [agent-testing.md](agent-testing.md).
4. Select scopes (table below), create, and copy the value. It starts with `dh_pat_` and is shown **once** — the database stores only its SHA-256 hex plus the last 4 characters for display.

Export it before starting your client:

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
```

Never commit the token and never paste it into a shared config file. Revoke from the same screen the moment a device or client is no longer trusted; revocation is immediate and idempotent. Membership revoked after issuance also invalidates the token on the next request.

### Token scopes

| Scope | Grants |
| --- | --- |
| `jobs:read` | View jobs and their details. |
| `jobs:write` | Create, update, and cancel jobs. |
| `jobs:dispatch` | Assign, dispatch, and complete jobs. |
| `routes:read` | View routes and stops. |
| `routes:write` | Create and update routes. |
| `routes:optimize` | Run route optimization. |
| `customers:read` | View customers and their details. |
| `customers:write` | Create and update customers. |
| `units:read` | View units and fleet records. |
| `units:write` | Update units and fleet records. |
| `sites:read` | View job sites. |
| `sites:write` | Create and update job sites. |
| `invoices:read` | View invoices. |
| `invoices:write` | Create, update, and send invoices. |
| `quotes:read` | View quotes. |
| `quotes:write` | Create, update, and send quotes. |
| `org:read` | View organization, reporting, and integration data. |
| `self:read` | View the token owner's own information. |
| `self:write` | Update the token owner's own information. |
| `supplies:read` | View inventory and supplies. |
| `supplies:write` | Create, update, and use supplies. |

Scopes are always **intersected** with the token owner's effective DropHaul permissions at request time. A scope can narrow what a token may do; it can never widen it. Grant the smallest set that covers your workflow — read-only scopes are enough for all four bundled skills.

## Claude Code

The current public `promotion-devotion/drophaul-mcp` repository is not the
final package and is not a supported installation source. Use only a validated
local distribution until the final release is published.

From the root of that validated local distribution:

```bash
claude plugin marketplace add ./
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
{"mcpServers":{"drophaul":{"type":"http","url":"https://majestic-emu-550.convex.site/mcp"}}}
```

The bundled adapter contains no bearer header or credential environment variable. Claude Code completes OAuth for the HTTP server.

Prefer no plugin?

### Advanced direct PAT setup

Add the server with a deliberately local bearer credential:

```bash
claude mcp add --transport http --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://majestic-emu-550.convex.site/mcp
```

## Claude.ai and Claude Desktop (custom connector)

Claude connects **from Anthropic's cloud**, not from your machine — true for Claude Desktop and Cowork as well. The endpoint must therefore be reachable from Anthropic's cloud; verify any network policy with your DropHaul operator.

**Free, Pro, and Max**

Free accounts support one custom connector.

1. Go to **Customize → Connectors**.
2. Click **+**, then **Add custom connector**.
3. Enter `https://majestic-emu-550.convex.site/mcp`.
4. Click **Add**, then **Connect**, and complete the DropHaul sign-in.

**Team and Enterprise**

1. An Owner or Primary Owner goes to **Organization settings → Connectors**, clicks **Add**, hovers **Custom**, and selects **Web**.
2. They enter the same URL and click **Add**.
3. Each member then goes to **Customize → Connectors**, finds the connector, and clicks **Connect**.

Enable it per conversation from the **+** button → **Connectors**.

> **Limited availability.** DropHaul does not currently offer public self-service OAuth client registration. Only clients already registered with DropHaul can complete this custom-connector flow. If Claude reports an unknown client, contact [support](mailto:support@drophaul.app); do not invent a client configuration or paste unrelated credentials.

Connector URLs are not editable in place; remove and re-add to change one.

## ChatGPT custom connector

1. Open **Settings → Security and login** and turn on **Developer mode**.
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins) and click **+**.
3. Give it a name and description.
4. Under **Connection**, enter the server URL including the `/mcp` path: `https://majestic-emu-550.convex.site/mcp`
5. Create the connection, complete the OAuth sign-in, and review the requested scopes.
6. Review the tools and metadata discovered from the server.

The server publishes closed OpenAI connector `search` and `fetch` shapes: `search` takes only `{ query }` and returns `results[]` of `{ id, title, url }`; `fetch` takes only `{ id }` and returns `{ id, title, text, url, metadata? }`.

**Scan Tools** belongs to the separate public plugin submission portal. It is not a step in the developer connection above.

ChatGPT's connector surface changes frequently. If the menu labels differ, follow OpenAI's current [Connect your MCP server to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt) guide.

## Codex CLI (client-managed OAuth)

```bash
codex mcp add drophaul --url https://majestic-emu-550.convex.site/mcp
codex mcp login drophaul
```

Or edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.drophaul]
url = "https://majestic-emu-550.convex.site/mcp"
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

`default_tools_approval_mode = "writes"` makes Codex prompt for any tool not marked read-only — recommended for a dispatch system.

Use `codex mcp list` to inspect configured servers and `/mcp` inside the Codex TUI to see active ones. The live OAuth flow works only for a Codex client already registered with DropHaul; adding the server does not register one. The PAT flow above is advanced local/developer setup only.

## Safety

- Call `whoami` first and confirm the organization and roles before acting on business data.
- Write and dispatch tools go through an explicit preview → confirm handshake; never confirm a write you have not reviewed by display ID.
- Read [security.md](security.md) and [security-boundaries.md](security-boundaries.md) before granting any `:write`, `jobs:dispatch`, or `routes:optimize` scope.
