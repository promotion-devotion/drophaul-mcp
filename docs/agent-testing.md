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

From the repository root:

```sh
bunx convex mcp start \
  --project-dir packages/backend \
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

## Evidence checklist

Record the deployment alias, client and version, credential kind, company fixture, scopes, tool names, public display IDs, request IDs, and pass/fail result. Redact all bearer values, authorization codes, refresh tokens, signed consent queries, customer contact data, and internal database IDs.
