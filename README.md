# DropHaul MCP

The official [Model Context Protocol](https://modelcontextprotocol.io) integration for
[DropHaul](https://www.drophaul.app), a portable-sanitation dispatch platform.

This repository is the distribution package. It contains no server code — the MCP server is a hosted
HTTPS endpoint operated by DropHaul. What ships here is:

- a **portable Agent Plugins 1.0 manifest** (`plugin.json`, `mcp.json`) using the
  literal hosted HTTPS endpoint and client-managed OAuth;
- a **Claude Code plugin** (`.claude-plugin/`, `.mcp.json`) that wires the remote server up and adds four
  workflow skills;
- a **Codex plugin** (`.codex-plugin/plugin.json`) that loads the packaged
  `.mcp.json`, plus a repository marketplace under `.agents/plugins/`;
- the same four **skills** as plain Markdown for compatible agent runtimes;
- **end-user documentation** for all four supported clients, in [`docs/`](docs/).

---

## Hosted server

The bundled configuration points at
`https://majestic-emu-550.convex.site/mcp`. OAuth sign-in is required before the
hosted endpoint grants access to DropHaul data. Installing or adding the server
does not grant data access or register a new OAuth client. For a separate
deployment, configure that client with the deployment's literal HTTPS `/mcp`
endpoint and verify the endpoint with your DropHaul operator.

## Start here

For ChatGPT, Claude.ai, Claude Desktop, and Cowork, add this literal Streamable
HTTP endpoint as a custom connection and complete client-managed OAuth:

```text
https://majestic-emu-550.convex.site/mcp
```

For Claude Code and Codex, the Git-backed package below provides the same remote
server plus the bundled workflow skills. Neither normal path requires a PAT.
The PAT section is only for an operator who deliberately needs a direct bearer
connection.

## Install

### 1. Claude Code

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

The installed adapter uses the literal hosted URL
`https://majestic-emu-550.convex.site/mcp` and client-managed OAuth; it does not
read a token environment variable or send a bundled Authorization header.

For an advanced direct-PAT setup without the plugin, add the server directly:

```bash
claude mcp add --transport http --scope local \
  --header "Authorization: Bearer ${DROPHAUL_MCP_KEY}" \
  drophaul https://majestic-emu-550.convex.site/mcp
```

More detail: [`docs/claude-code.md`](docs/claude-code.md).

### 2. Claude.ai, Claude Desktop, and Cowork

Claude connects from Anthropic's cloud, not from your machine, so the endpoint must be reachable on the
public internet. The connector uses OAuth and does not require a personal access token.

**Free / Pro / Max** — **Customize → Connectors** → **+** → **Add custom connector**, enter
`https://majestic-emu-550.convex.site/mcp`, click **Add**, then **Connect** and sign in to DropHaul.
Free accounts support one custom connector.

**Team / Enterprise** — an Owner or Primary Owner adds it once under **Organization settings →
Connectors** (**Add** → hover **Custom** → **Web**); each member then connects it from **Customize →
Connectors**.

Enable it per conversation from the **+** button → **Connectors**.

DropHaul does not currently offer public self-service OAuth client registration. If Claude reports an
unknown client, contact [support@drophaul.app](mailto:support@drophaul.app);
do not invent a client configuration or paste unrelated credentials.

More detail: [`docs/claude-ai.md`](docs/claude-ai.md).

### 3. Codex CLI

The repository is also a Codex marketplace. Add it and install DropHaul from
**Plugins** in the ChatGPT desktop app:

```bash
codex features enable mcp_2026_07_28
codex features list
codex plugin marketplace add promotion-devotion/drophaul-mcp
codex plugin add drophaul@drophaul
codex plugin list
```

For a direct MCP-only setup without the bundled skills, use:

```bash
codex features enable mcp_2026_07_28
codex features list
codex mcp add drophaul --url https://majestic-emu-550.convex.site/mcp
codex mcp login drophaul
codex mcp get drophaul --json
```

Or write `~/.codex/config.toml` directly:

```toml
[mcp_servers.drophaul]
url = "https://majestic-emu-550.convex.site/mcp"
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

`default_tools_approval_mode = "writes"` makes Codex prompt for any tool not marked read-only —
recommended for a dispatch system. Codex completes OAuth outside the
repository. Use the advanced direct-PAT section above only for a deliberate
local bearer setup, and never put a token value in TOML.

More detail: [`docs/codex.md`](docs/codex.md).

### 4. ChatGPT custom connection

1. **Settings → Security and login** → turn on **Developer mode**.
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins) and click **+**.
3. Give it a name and description.
4. Under **Connection**, enter the full URL including the `/mcp` path:
   `https://majestic-emu-550.convex.site/mcp`
5. Create the connection and complete the DropHaul OAuth sign-in.
6. Review the tools and metadata discovered from the server.

The server's OpenAI connector `search` and `fetch` shapes allow read-only tools
to support company-knowledge workflows; full operational tools require the
developer-mode connection.

ChatGPT's connector surface changes often. If the labels differ, follow OpenAI's current
[Connect your MCP server to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
guide.

**Scan Tools** belongs to the separate public plugin submission portal, not this developer connection.

More detail: [`docs/chatgpt.md`](docs/chatgpt.md).

---

## Advanced direct PAT setup

Packaged portable, Claude, and Codex adapters use client-managed OAuth and contain no token. A personal
access token is only for an operator who deliberately configures a direct local CLI connection.

1. Sign in at [DropHaul API Tokens](https://drophaul.app/settings/api-tokens) as an **owner** or **admin**. No other role
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
| `records:read`, `jobs:read`, `routes:read`, `customers:read`, `units:read`, `sites:read`, `invoices:read`, `quotes:read`, `org:read`, `self:read`, `supplies:read` | `jobs:write`, `jobs:dispatch`, `routes:write`, `routes:optimize`, `customers:write`, `units:write`, `sites:write`, `invoices:write`, `quotes:write`, `self:write`, `supplies:write` |

Scope families and safety guidance are in [`docs/security.md`](docs/security.md).

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
| [`docs/installation.md`](docs/installation.md) | Setup for all four clients and advanced PAT configuration |
| [`docs/claude-code.md`](docs/claude-code.md) | Plugin install, OAuth, and advanced direct PAT setup |
| [`docs/claude-ai.md`](docs/claude-ai.md) | Custom connector for Claude.ai, Desktop, and Cowork |
| [`docs/chatgpt.md`](docs/chatgpt.md) | Developer-mode connector and test walkthrough |
| [`docs/codex.md`](docs/codex.md) | Codex CLI OAuth and advanced PAT setup |
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
.agents/plugins/
  marketplace.json    repository-scoped Codex marketplace
plugins/drophaul/      installable Codex package
skills/
  plan-my-day/        SKILL.md + agents/openai.yaml
  optimize-routes/
  dispatch-review/
  invoice-chase/
docs/                 end-user documentation
```

This public tree intentionally contains only the portable manifests, client adapters, prompt-only
skills, license, and end-user documentation. Private service source and internal build paths are not
part of the distribution.

---

## Support

[support@drophaul.app](mailto:support@drophaul.app) — include client name and version, UTC timestamp,
company display name, tool name, expected outcome, and a redacted request ID. Never send tokens,
authorization codes, refresh tokens, client secrets, or customer payloads.
