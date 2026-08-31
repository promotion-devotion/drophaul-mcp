# DropHaul MCP marketplace release matrix

This matrix separates repository readiness, hosted-client acceptance, vendor
submission, approval, and publication. Never promote one state based on
evidence from another.

## Universal user journey

Every supported directory install must complete this journey without a PAT,
copied endpoint, CLI command, or hand-edited configuration:

1. Find **DropHaul** in the host directory and choose **Install** or **Connect**.
2. Sign in through OAuth 2.1 authorization code + S256 PKCE.
3. Select a company and review the minimum role-appropriate scopes.
4. Return to the host with DropHaul connected.
5. Run `whoami` and confirm the company and current roles.
6. See three useful starter prompts for the current role.

## Hosted-client acceptance

Use staging, a disposable company, and a short-lived reviewer identity. Follow
[agent-testing.md](agent-testing.md); never record credentials, authorization
codes, refresh tokens, internal IDs, or customer data.

| Check | Claude Code | Claude.ai | Codex | ChatGPT |
| --- | --- | --- | --- | --- |
| Directory/package install starts OAuth | Pending | Pending | Pending | Pending |
| Company and least-privilege scope consent | Pending | Pending | Pending | Pending |
| `whoami` returns the reviewer company | Pending | Pending | Pending | Pending |
| Public-ID search and fetch agree | Pending | Pending | Pending | Pending |
| Read-only schedule succeeds | Pending | Pending | Pending | Pending |
| Preview performs zero business writes | Pending | Pending | Pending | Pending |
| Approved write creates exactly one business effect and receipt | Pending | Pending | Pending | Pending |
| Stale plan rejects with zero writes | Pending | Pending | Pending | Pending |
| Lost response replays the exact result | Pending | Pending | Pending | Pending |
| Refresh token rotates; old token is rejected | Pending | Pending | Pending | Pending |
| Disconnect/revoke rejects the next read | Pending | Pending | Pending | Pending |
| Redacted evidence and fixture cleanup recorded | Pending | Pending | Pending | Pending |

**Claude.ai status:** no complete hosted-client acceptance run is recorded.
Keep the Claude.ai column pending until the current client completes this
matrix; do not infer compatibility or incompatibility from historical protocol
documentation.

Acceptance requires every row to pass for a host before that host is described
as install-ready. Record the host/version, UTC timestamp, deployment identity,
public display IDs, redacted request references, result, and cleanup.

## Official MCP Registry

The distributable root contains `server.json` for the public remote server.
Publishing improves ecosystem discovery but does not submit DropHaul to either
vendor directory.

1. Build and verify the allowlisted public distribution.
2. Install the current official `mcp-publisher` release.
3. From the public `promotion-devotion/drophaul-mcp` checkout, run
   `mcp-publisher login github` or configure GitHub OIDC for its release.
4. Run `mcp-publisher publish` against the reviewed `server.json`.
5. Record the immutable registry name, version, response, and listing.

The registry namespace is `io.github.promotion-devotion/drophaul`. Increment
the semantic version for every metadata update; registry versions are
immutable.

## Anthropic Connectors Directory

Repository prerequisites include the public HTTPS endpoint, OAuth, exact tool
annotations, bounded output, public legal/support documentation, a populated
reviewer company, reproducible prompts, and 3–5 screenshots for any MCP App UI.

External operator steps:

1. Use a Team organization whose submitter is an Owner or Primary Owner, or an
   Enterprise organization whose submitter has **Directory** or the
   broader **Libraries** permission.
2. Prepare the exact endpoint, OAuth/CIMD details, listing assets, privacy and
   support fields, populated test account, use cases, and screenshots.
3. Complete the Claude.ai hosted-client column and run every discovered tool
   against disposable fixtures.
4. Create the submission in Claude admin **Directory submissions** and complete
   the seven required acknowledgements.
5. Submit, address feedback, and record the receipt, approval, publication
   event, and exact public listing URL as separate states.

The Git-backed Claude Code package is a separate installation channel; it is
not evidence of a Claude Connectors Directory listing.

## OpenAI Plugins Directory

The directory is shared by ChatGPT and Codex. Repository prerequisites include
a public production endpoint, verified publisher, configured OpenAI domain
challenge, current OAuth/CIMD metadata, tool scan, public legal/support pages,
reviewer account, starter prompts, and reproducible positive/negative tests.

External operator steps:

1. Complete both Codex and ChatGPT hosted-client columns above.
2. Have an authorized verified publisher create the OpenAI apps portal draft
   and verify the MCP domain challenge.
3. Scan tools, enter current test observations and supported countries, then
   submit.
4. After approval, publish the reviewed version and record its directory URL.

Portal draft, submission receipt, approval, and publication are four different
states. Do not claim a public listing until the final URL is reachable.

## Release status vocabulary

- **Prepared** — repository artifacts and deterministic tests pass.
- **Hosted-client verified** — the full staging matrix passed in that client.
- **Submitted** — the vendor portal issued a submission receipt.
- **Approved** — the vendor accepted that exact version.
- **Published** — users can discover and install it from the public directory.
