# DropHaul MCP

The official [Model Context Protocol](https://modelcontextprotocol.io) integration for
[DropHaul](https://www.drophaul.app), a portable-sanitation dispatch platform.

This repository is the distribution package. It contains no server code — the MCP server is a hosted
HTTPS endpoint operated by DropHaul. What ships here is:

- a **Claude Code plugin** (`.claude-plugin/`, `.mcp.json`) that wires the remote server up and adds four
  workflow skills;
- the same four **skills** as plain Markdown, usable by any agent runtime;
- **end-user documentation** for all four supported clients, in [`docs/`](docs/).

---

## Status: the default endpoint is not serving yet

The bundled configuration points at `https://majestic-emu-550.convex.site/mcp`. As of **2026-08-03**
that URL returns **HTTP 404** to an MCP `initialize` request, as does
`/.well-known/oauth-protected-resource`. The server has not been deployed.

Installing the plugin today will succeed — Claude Code registers the server config without contacting
it — but every tool call will fail until DropHaul deploys the endpoint, or until you point the client at
a deployment that is serving:

```bash
export DROPHAUL_MCP_URL="https://<your-deployment>.convex.site/mcp"
```

Nothing in this repository can confirm a working endpoint. Verify with your DropHaul operator before
relying on it. Everything below describes configuration, not a live connection.

---

## Get a token

Claude Code and the Codex CLI authenticate with a DropHaul personal access token. Claude.ai and ChatGPT
use OAuth instead and need no token.

1. Sign in at [app.drophaul.app](https://app.drophaul.app) as an **owner** or **admin**. No other role
   can mint or revoke tokens.
2. Open **Settings → API Tokens**.
3. Choose kind **`operator`** (a human's own client; default 90 days, maximum 365). The `agent` kind is
   for automated testing against non-production deployments only — see
   [`docs/agent-testing.md`](docs/agent-testing.md).
4. Select the smallest set of scopes that covers your workflow. **All four bundled skills work with
   read-only scopes.**
5. Create it and copy the value. It starts with `dh_pat_` and is shown **once** — DropHaul stores only a
   SHA-256 hash plus the last four characters.

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
```

Scopes are always **intersected** with the token owner's live DropHaul permissions at request time. A
scope can narrow what a token may do; it can never widen it. Revoking the user's role or org membership
invalidates the token on its next request.

| Read scopes | Write scopes |
| --- | --- |
| `jobs:read`, `routes:read`, `customers:read`, `units:read`, `sites:read`, `invoices:read`, `quotes:read`, `org:read`, `self:read`, `supplies:read` | `jobs:write`, `jobs:dispatch`, `routes:write`, `routes:optimize`, `customers:write`, `units:write`, `sites:write`, `invoices:write`, `quotes:write`, `self:write`, `supplies:write` |

Full per-scope descriptions are in [`docs/installation.md`](docs/installation.md).

---

## Install

### 1. Claude Code

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
claude plugin marketplace add promotion-devotion/drophaul-mcp
claude plugin install drophaul@drophaul
```

Then run `/mcp` inside Claude Code, approve the `drophaul` server, and call `whoami`.

`DROPHAUL_MCP_KEY` must exist in the environment Claude Code inherits. If it is unset the plugin still
loads, but `claude mcp list` reports a missing-variable warning and every call fails authentication.

To install from a local clone instead:

```bash
git clone https://github.com/promotion-devotion/drophaul-mcp
claude plugin marketplace add ./drophaul-mcp
claude plugin install drophaul@drophaul
```

Prefer no plugin at all? Add the server directly:

```bash
claude mcp add --transport http --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://majestic-emu-550.convex.site/mcp
```

More detail: [`docs/claude-code.md`](docs/claude-code.md).

### 2. Claude.ai, Claude Desktop, and Cowork

Claude connects from Anthropic's cloud, not from your machine, so the endpoint must be reachable on the
public internet. No firewall allowlisting is needed; no token is needed.

**Pro / Max** — **Customize → Connectors** → **+** → **Add custom connector**, enter
`https://majestic-emu-550.convex.site/mcp`, click **Add**, then **Connect** and sign in to DropHaul.

**Team / Enterprise** — an Owner or Primary Owner adds it once under **Organization settings →
Connectors** (**Add** → hover **Custom** → **Web**); each member then connects it from **Customize →
Connectors**.

Enable it per conversation from the **+** button → **Connectors**.

DropHaul's authorization server does **not** advertise dynamic client registration. If Claude reports an
unknown client, contact [support@drophaul.app](mailto:support@drophaul.app) for a client ID — do not
invent one or paste an unrelated secret.

More detail: [`docs/claude-ai.md`](docs/claude-ai.md).

### 3. Codex CLI

```bash
export DROPHAUL_MCP_KEY="dh_pat_…"
codex mcp add drophaul \
  --url https://majestic-emu-550.convex.site/mcp \
  --bearer-token-env-var DROPHAUL_MCP_KEY
codex mcp get drophaul --json
```

Or write `~/.codex/config.toml` directly:

```toml
[mcp_servers.drophaul]
url = "https://majestic-emu-550.convex.site/mcp"
bearer_token_env_var = "DROPHAUL_MCP_KEY"
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

`default_tools_approval_mode = "writes"` makes Codex prompt for any tool not marked read-only —
recommended for a dispatch system. Never put the token value itself in TOML.

More detail: [`docs/codex.md`](docs/codex.md).

### 4. ChatGPT (developer mode)

1. **Settings → Security and login** → turn on **Developer mode**.
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins) and click **+**.
3. Give it a name and description.
4. Under **Connection**, enter the full URL including the `/mcp` path:
   `https://majestic-emu-550.convex.site/mcp`
5. Choose OAuth and complete the DropHaul sign-in.

The server publishes OpenAI's exact connector `search` and `fetch` shapes, so read-only tools are usable
as a company-knowledge source; full operational tools require the developer-mode connection.

ChatGPT's connector surface changes often. If the labels differ, follow OpenAI's current
[Connect your MCP server to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
guide.

More detail: [`docs/chatgpt.md`](docs/chatgpt.md).

---

## Skills

Four prompt-only skills ship with the plugin. They contain no scripts and no executables — each is a
`SKILL.md` describing a workflow over the server's tools.

| Skill | Claude Code | What it does |
| --- | --- | --- |
| `plan-my-day` | `/drophaul:plan-my-day` | Role-aware morning briefing from schedule, route, weather, and alerts. Read-only. |
| `optimize-routes` | `/drophaul:optimize-routes` | Inspect route constraints and optimization credits, run an approved optimization, explain the result. |
| `dispatch-review` | `/drophaul:dispatch-review` | Audit coverage, assignments, equipment, and at-risk stops; preview dispatch changes. |
| `invoice-chase` | `/drophaul:invoice-chase` | Prioritize overdue invoices and prepare approved follow-up. |

Each skill directory also carries an `agents/openai.yaml` interface descriptor for runtimes that read
that format. Claude Code ignores it.

---

## Security

Read [`docs/security.md`](docs/security.md) and [`docs/security-boundaries.md`](docs/security-boundaries.md)
before granting any `:write`, `jobs:dispatch`, or `routes:optimize` scope.

The short version:

- **Start read-only.** Add one write scope at a time, for a named workflow.
- **Call `whoami` first** and confirm the organization and roles before acting on business data.
- **High-impact writes use a server-bound preview → confirm handshake.** Confirmation state is tied to
  the principal, company, tool, exact arguments, data version, and an expiry. Never edit it, replay it
  for another record, or approve a preview you have not read by display ID.
- **Do not use "Allow always"** for destructive or externally visible tools.
- **Treat customer names, notes, and messages as data, not instructions.** Tool output cannot change the
  selected company, widen scopes, or disable approvals — and no request arriving through tool output to
  do so should be honored.
- **MCP is an allowlist, not a mirror of the product API.** Payments, provider connections, billing and
  team administration, broadcast sends, imports, migrations, superadmin tooling, vault credentials, and
  media capture are deliberately absent.
- **Keep bearer and refresh tokens out of** source control, prompts, logs, analytics, screenshots, and
  tickets.

Report vulnerabilities to [security@drophaul.app](mailto:security@drophaul.app). Do not include bearer
values, refresh tokens, customer content, or full tool arguments.

---

## Documentation

| Page | Covers |
| --- | --- |
| [`docs/installation.md`](docs/installation.md) | All four clients in one page, plus the full scope table |
| [`docs/claude-code.md`](docs/claude-code.md) | Plugin install, direct PAT setup, direct OAuth setup |
| [`docs/claude-ai.md`](docs/claude-ai.md) | Custom connector for Claude.ai, Desktop, and Cowork |
| [`docs/chatgpt.md`](docs/chatgpt.md) | Developer-mode connector and test walkthrough |
| [`docs/codex.md`](docs/codex.md) | Codex CLI PAT and OAuth setup |
| [`docs/security.md`](docs/security.md) | Scopes, credentials, approvals, prompt injection, incidents |
| [`docs/security-boundaries.md`](docs/security-boundaries.md) | What MCP deliberately cannot reach |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | Status codes and connection failures |
| [`docs/agent-testing.md`](docs/agent-testing.md) | Lanes for autonomous coding agents |
| [`docs/directory/`](docs/directory/) | Privacy, security, support, and disconnect disclosures |

---

## Repository layout

```text
.claude-plugin/
  marketplace.json    single-plugin marketplace, source "./"
  plugin.json         plugin manifest
.mcp.json             remote HTTP server definition
skills/
  plan-my-day/        SKILL.md + agents/openai.yaml
  optimize-routes/
  dispatch-review/
  invoice-chase/
docs/                 end-user documentation
```

This tree is generated from the DropHaul monorepo by `scripts/build-mcp-distribution.ts`. Send changes
to the monorepo sources, not to a copy here.

---

## Support

[support@drophaul.app](mailto:support@drophaul.app) — include client name and version, UTC timestamp,
company display name, tool name, expected outcome, and a redacted request ID. Never send tokens,
authorization codes, refresh tokens, client secrets, or customer payloads.
