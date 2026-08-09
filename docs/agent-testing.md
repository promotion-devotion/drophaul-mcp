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

Autonomous coding agents may not receive a production agent token. There is no override procedure.

For a named production smoke test, a human owner or admin may create a short-lived, least-privilege **operator** PAT, remain present for the session, approve each write, record request IDs, and revoke the token immediately afterward. Prefer OAuth for normal human clients.

Never:

- seed or mint an `agent` token in production;
- enable production through a staging environment alias;
- give an agent access to production Convex env, data, logs, tables, one-off queries, or deployment tools;
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
