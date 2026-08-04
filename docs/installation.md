# Install the DropHaul MCP server

One page covering every supported client: Claude Code, Claude.ai, ChatGPT, and the Codex CLI. Per-surface detail lives in [claude-code.md](claude-code.md), [claude-ai.md](claude-ai.md), [chatgpt.md](chatgpt.md), and [codex.md](codex.md). Failure modes are in [troubleshooting.md](troubleshooting.md).

## Endpoint

```text
https://majestic-emu-550.convex.site/mcp
```

That is the production Convex deployment (`majestic-emu-550`) HTTP action. Staging uses the same path on its own `*.convex.site` host — set `DROPHAUL_MCP_URL` to the exact staging `/mcp` URL when testing.

The server speaks **Streamable HTTP** (`POST` + `OPTIONS` only — no `GET` session stream, no legacy SSE endpoint). It accepts either a DropHaul personal access token as a bearer credential, or an OAuth 2.1 authorization-code + PKCE (S256) flow discoverable at `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, and `/.well-known/oauth-protected-resource/mcp`.

## 1. Mint a personal access token

Tokens are the simplest credential and the only one Claude Code and the Codex CLI need.

1. Sign in at [app.drophaul.app](https://app.drophaul.app) as an **owner** or **admin**. Both `mcp/tokens.create` and `mcp/tokens.revoke` call `auth.requireAnyRole(['owner', 'admin'])`, so no other role can mint or revoke.
2. Open **Settings → API Tokens** (`apps/web/src/routes/(user)/(org)/settings/api-tokens.tsx`), which calls the `mcp/tokens.ts` `create` mutation.
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

Scopes are always **intersected** with the token owner's effective DropHaul permissions at request time. A scope can narrow what a token may do; it can never widen it. Grant the smallest set that covers your workflow — read-only scopes are enough for all four bundled skills. The canonical list is `MCP_SCOPES` in `packages/shared/src/schemas/mcp.ts`, and the scope → permission rollup is `MCP_SCOPE_PERMISSIONS` in the same file.

## 2. Claude Code

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
claude plugin marketplace add promotion-devotion/drophaul-mcp
claude plugin install drophaul@drophaul
```

To install from a local clone of this repository:

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
{
  "mcpServers": {
    "drophaul": {
      "type": "http",
      "url": "${DROPHAUL_MCP_URL:-https://majestic-emu-550.convex.site/mcp}",
      "headers": { "Authorization": "Bearer ${DROPHAUL_MCP_KEY}" }
    }
  }
}
```

`DROPHAUL_MCP_KEY` must be set in the environment Claude Code inherits. If it is unset, Claude Code still loads the server but reports a missing-variable warning in `claude mcp list` and every call fails authentication.

Prefer no plugin? Add the server directly:

```bash
claude mcp add --transport http --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://majestic-emu-550.convex.site/mcp
```

## 3. Claude.ai and Claude Desktop (custom connector)

Claude connects **from Anthropic's cloud**, not from your machine — true for Claude Desktop and Cowork as well. The endpoint is publicly reachable, so no firewall allowlisting is required.

**Pro and Max**

1. Go to **Customize → Connectors**.
2. Click **+**, then **Add custom connector**.
3. Enter `https://majestic-emu-550.convex.site/mcp`.
4. Click **Add**, then **Connect**, and complete the DropHaul sign-in.

**Team and Enterprise**

1. An Owner or Primary Owner goes to **Organization settings → Connectors**, clicks **Add**, hovers **Custom**, and selects **Web**.
2. They enter the same URL and click **Add**.
3. Each member then goes to **Customize → Connectors**, finds the connector, and clicks **Connect**.

Enable it per conversation from the **+** button → **Connectors**.

> **OAuth client registration.** The DropHaul authorization server deliberately does **not** advertise a dynamic client registration endpoint (`packages/backend/convex/mcp/oauthMetadata.ts`; asserted by `oauthMetadata.test.ts`). Clients are provisioned by the internal `mcp/oauthClients.ts` `provision` mutation. If Claude reports an unknown client, use **Advanced settings** on the connector to supply an OAuth Client ID and Secret issued by DropHaul — contact support. Do not invent a client or paste an unrelated secret.

Connector URLs are not editable in place; remove and re-add to change one.

## 4. ChatGPT (developer mode connector)

1. Open **Settings → Security and login** and turn on **Developer mode**.
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins) and click **+**.
3. Give it a name and description.
4. Under **Connection**, enter the server URL including the `/mcp` path: `https://majestic-emu-550.convex.site/mcp`
5. Complete the OAuth sign-in when prompted.

The server publishes the exact OpenAI connector `search` and `fetch` shapes — `search` takes only `{ query }` and returns `results[]` of `{ id, title, url }`; `fetch` takes only `{ id }` and returns `{ id, title, text, url, metadata? }`, both closed (`additionalProperties: false`). See `packages/shared/src/schemas/mcp-tools/schemas.ts` and the shape assertions in `policy-matrix.test.ts`.

ChatGPT's connector surface changes frequently. If the menu labels differ, follow OpenAI's current [Connect your MCP server to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt) guide.

## 5. Codex CLI

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
codex mcp add drophaul \
  --url https://majestic-emu-550.convex.site/mcp \
  --bearer-token-env-var DROPHAUL_MCP_KEY
```

Or edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.drophaul]
url = "https://majestic-emu-550.convex.site/mcp"
bearer_token_env_var = "DROPHAUL_MCP_KEY"
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

`default_tools_approval_mode = "writes"` makes Codex prompt for any tool not marked read-only — recommended for a dispatch system.

For the OAuth flow instead of a bearer token, omit `bearer_token_env_var` and run `codex mcp login drophaul`. Use `codex mcp list` to inspect configured servers and `/mcp` inside the Codex TUI to see active ones.

## Safety

- Call `whoami` first and confirm the organization and roles before acting on business data.
- Write and dispatch tools go through an explicit preview → confirm handshake; never confirm a write you have not reviewed by display ID.
- Read [security.md](security.md) and [security-boundaries.md](security-boundaries.md) before granting any `:write`, `jobs:dispatch`, or `routes:optimize` scope.
