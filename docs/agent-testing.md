# MCP agent testing lanes

Choose one lane before starting. Never reuse credentials or deployment settings between lanes.

## Lane 1: DropHaul product staging

Use this lane to test the same `/mcp` transport, authorization, tool registry, idempotency, and audit behavior that clients use in production.

- Target a staging Convex site ending in `/mcp`, never the production endpoint.
- Ask an operator to seed a short-lived **agent** PAT for a disposable staging company and test user.
- Enable issuance only when both deployment signals name the same safe environment:

```text
CONVEX_ENV=staging
MCP_AGENT_TOKEN_ENVIRONMENT=staging
```

- Give the token only the scopes required by the scenario.
- Use deterministic fixture names, public display IDs, and unique idempotency keys.
- Revoke the token and remove fixtures after the run.

Agent tokens fail closed outside `development`, `test`, or `staging`. Production must never set `MCP_AGENT_TOKEN_ENVIRONMENT`.

## Disposable test accounts

Agents and QA runs create throwaway accounts instead of reusing real ones. A disposable account:

- uses an address on the reserved `@agents.drophaul.test` domain (`.test` is reserved by RFC 2606, so mail is never delivered);
- is recorded in the `disposableAccounts` table with a public `displayId` (`DSP-…`) and an expiry;
- is created already email-verified, with its own company;
- is never sent to PostHog, and never gets a Stripe customer, a referral code, welcome or drip emails, a Resend audience entry, or a marketing lead notification.

Public sign-up can never create a reserved-domain account, on any deployment, whatever the settings below. Only the disposable path can, because it signs its own sign-up request with a key the public endpoints do not have.

### Where it is enabled

| Deployment | Enabled by | Rules |
| --- | --- | --- |
| Development, test, staging | `CONVEX_ENV` and `MCP_AGENT_TOKEN_ENVIRONMENT` naming the same safe environment | Expiry 7 days by default, up to 30. Fixture dataset, agent PAT, and optional superadmin through the internal seed functions. |
| Production | `DISPOSABLE_ACCOUNTS_ENABLED=true` | Expiry 1 day by default, up to 7. User and company only: no fixtures, no agent PAT, no superadmin. At most 50 live disposable accounts and 10 new ones per hour. |
| Anywhere else | Nothing set | Every disposable entry point fails closed; the HTTP routes answer 404. |

`DISPOSABLE_ACCOUNTS_ENABLED` never enables agent tokens. Production must still never set `MCP_AGENT_TOKEN_ENVIRONMENT`, so an account created there authenticates as a person, not as an agent.

### Environment variables

Set these on the Convex deployment, never in a repository file:

- `DISPOSABLE_ACCOUNTS_ENABLED`: `true` turns the feature on without agent tokens (production).
- `DISPOSABLE_ACCOUNTS_SECRET`: at least 32 random characters. Only the bearer secret for the HTTP routes — without it they answer 503. It is never the signing key for the internal sign-up marker; that key is derived from `BETTER_AUTH_SECRET` and never leaves the deployment, so holding this bearer secret cannot be used to mint a marker or call the public sign-up endpoint directly.
- `CONVEX_ENV` and `MCP_AGENT_TOKEN_ENVIRONMENT`: the staging gate described in Lane 1. Never set in production.

### HTTP flow

Use this from a QA runner that should not hold Convex deploy access. The base URL is the deployment's Convex site URL. Keep the secret in a file or a secret store, never in shell history, a prompt, or an issue. Every request needs `Authorization: Bearer <DISPOSABLE_ACCOUNTS_SECRET>` and `Content-Type: application/json`, and bodies are limited to 4 KB with no extra fields.

Create an account. Pick a unique local part per run and a strong password of at least 12 characters:

```sh
curl -sS -X POST "$CONVEX_SITE_URL/disposable-accounts" \
  -H "Authorization: Bearer $(cat /secure/path/disposable-accounts-secret)" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-2026-09-23-a@agents.drophaul.test","password":"<unique strong password>","companyName":"QA Run A","label":"qa run A","expiresInDays":1}'
```

A `201` returns `displayId`, `email`, and `expiresAt`. Sign in to the web or native app with the same address and password to run the scenario.

Check that the account signs in, without a browser:

```sh
curl -sS -X POST "$CONVEX_SITE_URL/disposable-accounts/verify-sign-in" \
  -H "Authorization: Bearer $(cat /secure/path/disposable-accounts-secret)" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-2026-09-23-a@agents.drophaul.test","password":"<the same password>"}'
```

It returns `ok` and the Better Auth status code only.

Delete the account when the run ends:

```sh
curl -sS -X DELETE "$CONVEX_SITE_URL/disposable-accounts" \
  -H "Authorization: Bearer $(cat /secure/path/disposable-accounts-secret)" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-2026-09-23-a@agents.drophaul.test"}'
```

It returns `status` (`deleted` or `already_deleted`) and organization counts.

Responses: `404` when the feature is disabled on the deployment, `503` when the secret is not configured, `401` for a missing or wrong secret, `429` when the shared rate limit (about 120 requests an hour) is spent, `400` or `413` for a malformed or oversized body, and `422` when the request is refused, for example an address off the reserved domain, an expiry over the limit, a full cap, or an account that is not recorded. Responses never include internal database IDs, tokens, or cookies.

### Internal seed functions

Operators with deploy access to a staging deployment can run the same operations with `bunx convex run --deployment <staging deployment>` from the configured DropHaul Convex backend workspace. Never point these commands at `--prod` or the production deployment.

```sh
bunx convex run --deployment <staging deployment> seed:agentSignupAndSeed \
  '{"email":"qa-2026-09-23-a@agents.drophaul.test","password":"<unique strong password>","companyName":"QA Run A","label":"qa run A","expiresInDays":2}'
bunx convex run --deployment <staging deployment> seed:verifyDisposableSignIn \
  '{"email":"qa-2026-09-23-a@agents.drophaul.test","password":"<the same password>"}'
bunx convex run --deployment <staging deployment> seed:deleteDisposableAccount \
  '{"email":"qa-2026-09-23-a@agents.drophaul.test"}'
```

On staging, `seed:agentSignupAndSeed` also lays down a small fixture dataset and returns an agent PAT in `token`. The PAT is printed once, so treat the output as a secret and do not paste it into issues, logs, or prompts.

### Deletion and cleanup

Deletion removes the Better Auth user with its sessions, accounts, and memberships; every company where the account is the only member, with all of that company's data; and the app profile with its user-scoped rows (tokens, devices, preferences). If another member was added to one of its companies, the company stays and only the disposable account's membership is removed. A repeat delete returns `already_deleted`. Deletion refuses any account that is not both on the reserved domain and recorded in `disposableAccounts`.

Automatic cleanup: the `purge-expired-disposable-accounts` cron runs daily at 04:40 UTC on every deployment where disposable accounts are enabled, production included, and deletes accounts past `expiresAt`, 20 per batch, scheduling another batch while more are due. A failed purge is retried the next day. Deletion leaves a tombstone record for 30 days so repeated deletes stay no-ops. Where the feature is disabled, the cron does nothing and logs `disposableAccounts.purge_skipped`. Its logs carry counts only, never addresses.

## Lane 2: official Convex development MCP

Use Convex's official local MCP server for inspecting and running functions on a personal development deployment. This is not the DropHaul product MCP and does not validate customer-facing transport or scope behavior.

From the configured DropHaul Convex backend workspace:

```sh
bunx convex mcp start \
  --deployment dev \
  --disable-tools envGet,envList,envRemove,envSet,data,logs,runOneoffQuery,tables
```

This leaves the function specification, normal function runner, status, and insights tools available on the personal dev deployment while disabling environment-secret access and broad data/log surfaces. Do not add `--prod`, `--cautiously-allow-production-pii`, or `--dangerously-enable-production-deployments`.

## Lane 3: production

Use the owner's own OAuth session, or a short-lived, least-privilege **operator** PAT that is revoked when the run ends. Prefer a non-production deployment whenever the scenario does not actually need production data.

Note that agent-kind tokens still fail closed here, in code rather than by convention: `agentTokensAllowedFor` requires `CONVEX_ENV` and `MCP_AGENT_TOKEN_ENVIRONMENT` to both be present and to name the same `development`, `test`, or `staging` environment. Production sets neither, so a production run authenticates as a person, not as an agent.

Batched writes (`plan_changes` → `apply_changes`) are the intended shape for anything that changes more than one record: the plan is reviewable before it commits, and the batch commits atomically or not at all.

Never:

- enable production through a staging environment alias;
- give an agent access to production Convex env, logs, tables, one-off queries, or deployment tools;
- disable preview/confirmation or idempotency checks;
- copy a production credential into CI, an issue, a prompt, or a repository file.

## Foreman secret smoke test

Most Foreman seal → server-proof → decrypt tests run on fabricated key material. The guarded live-secret smoke test is the one check that reads a development deployment's configuration and exercises the real path.

It is opt-in and skips visibly without the guard, so it never runs in CI or in a normal `bun run test`. Run it from the repo root:

```sh
bun run test:foreman-secrets-smoke
```

That script is the only supported invocation: it enables the guarded smoke suite and runs the focused test. Without the guard, the suite is skipped rather than contacting a live deployment.

It is deliberately **not** wired into the CI `test` job. It reaches a live staging Convex deployment and reads the Vercel project env, both of which need an authenticated CLI session that CI does not have and must not be handed (see the lane rules above). A CI job that cannot authenticate either reddens every PR or gets quietly marked continue-on-error — both are worse than an honest manual gate. Run it by hand after changing anything on the seal → server-proof → decrypt path, and after rotating either secret.

- Target defaults to the staging deployment. Override with `FOREMAN_SMOKE_CONVEX_DEPLOYMENT`; the production deployment and any `prod` ref are refused before a single CLI call.
- Requires an authenticated Convex CLI and, for the Vercel-side presence check, an authenticated Vercel CLI.
- With the guard set but a secret missing, it fails and names the variable. It never skips its way to green.
- It writes nothing: `convex env get` and the Vercel project-env API are read-only, and no Convex document or file is created.
- No plaintext secret is printed, logged, or placed in an assertion message.

`FOREMAN_INTERNAL_SECRET` is stored on Vercel as a **sensitive** variable, so Vercel never returns its value. Equality between the Vercel and Convex copies therefore cannot be machine-checked; the test asserts the Vercel variable exists, targets the environment paired with the deployment, and has not been downgraded to a readable kind. A genuine mismatch still surfaces only as a runtime `FOREMAN_SERVER_PROOF_INVALID` from the deployed caller.

## Evidence checklist

Record the deployment alias, client and version, credential kind, company fixture, scopes, tool names, public display IDs, request IDs, and pass/fail result. Redact all bearer values, authorization codes, refresh tokens, signed consent queries, customer contact data, and internal database IDs.

## Reproducible hosted-client acceptance

The release gate is modern-first. Before a Claude, ChatGPT, or Codex
walkthrough, exercise the stateless `2026-07-28` flow — `server/discover` →
`tools/list` → authenticated `tools/call` — with the secret-safe harness. It
also asserts every required modern wire family: `resultType`, server identity,
the intended cache hints, unsupported-version errors, unknown-method HTTP 404,
removed initialize, and session-method HTTP 405 responses. Pass the credential by file so it never
appears in shell history or process arguments:

```sh
MCP_ACCEPTANCE_ENDPOINT=https://staging.example.test/mcp \
MCP_ACCEPTANCE_TOKEN_FILE=/secure/path/agent-token.txt \
MCP_ACCEPTANCE_PERFORMANCE_SAMPLES=10 \
bun run smoke:mcp-release
```

The harness gates `server/discover`, `tools/list`, `whoami`, `list_jobs`, and
`search` independently; it never averages an unrelated operation into an SLO.
The first request is reported separately without claiming process or network
isolation, and the remaining nine or more samples form the subsequent-request
distribution. Staging defaults are subsequent-request p50 1.5 seconds, p95 2.5
seconds, maximum 4 seconds, and first-sample p95 4 seconds. Override them with
`MCP_ACCEPTANCE_WARM_P50_MS`, `MCP_ACCEPTANCE_WARM_P95_MS`,
`MCP_ACCEPTANCE_WARM_MAX_MS`, and `MCP_ACCEPTANCE_FIRST_SAMPLE_P95_MS`. A timeout,
network error, 5xx, or other non-success response fails the operation gate.

The public endpoint is deliberately modern-only. A `2025-11-25` initialize
request and a modern-enveloped `initialize` request must both fail; GET/DELETE
session operations must return 405. The release report contains only protocol
version, credential kind, pass/fail checks, and per-operation first/subsequent latency.
It never serializes bearer material, response payloads, request IDs, public
record IDs, or tenant identifiers. These automate
transport readiness; they do not replace the deployed OAuth
login/consent/refresh/revoke gate.

Modern cache policy is intentional rather than the SDK's conservative default:

- `server/discover`, `resources/list`, and the static widget
  `resources/read` results are public for five minutes.
- Credential-filtered `tools/list` results are private for one minute.
- Tasks, subscriptions, and change-notification capabilities remain
  unadvertised until DropHaul supports them end to end.
