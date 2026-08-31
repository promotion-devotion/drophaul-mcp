# Troubleshoot DropHaul MCP

Always confirm the endpoint is the exact HTTPS URL ending in `/mcp`. DropHaul does not expose `/mcp/pat`, an SSE alias, or a session URL. The endpoint accepts `POST` and CORS `OPTIONS`; opening it with `GET` is not a health check.

## Connection checklist

1. Confirm the client supports Streamable HTTP and the current MCP protocol.
2. Confirm the endpoint is `https://majestic-emu-550.convex.site/mcp` or the exact assigned staging endpoint.
3. For a packaged portable, Claude, or Codex install, complete the client-managed OAuth flow. These packages contain no bearer header or token environment variable.
4. Only for an advanced direct-PAT setup, confirm the environment variable exists in the process that launches the client and the header expands to `Authorization: Bearer …`.
5. For OAuth, refetch protected-resource and authorization-server metadata. DropHaul supports Client ID Metadata Documents (CIMD) for public OAuth clients, so complete the client-managed OAuth flow without a separate client registration step.
6. Run `whoami` before any other tool.

## Common failures

### 400 or protocol error

Upgrade the client. DropHaul rejects unsupported versions, batches, legacy sessions, oversized bodies, wrong media types, and header/body method or tool-name mismatches. Do not fix this by changing the endpoint.

### 401 Unauthorized

The credential is missing, malformed, expired, revoked, or no longer bound to a live user/company membership. PAT failures intentionally look alike. Create or reconnect a credential; never ask support to recover a bearer.

For OAuth, verify the challenge points to `/.well-known/oauth-protected-resource/mcp` on the same site origin.

### 403 Insufficient scope

The authenticated OAuth grant lacks one or more scopes required by the tool, or the request origin is not allowed. Reconnect and grant only the missing scope. If the scope is present, confirm the user's current role still has the required permission.

### 404 or method not found

Use exact tool names from `tools/list`. Tool lists are filtered by current role and scopes. A tool absent from the list is not available to that principal.

### 409, stale preview, or confirmation rejected

Fetch a new preview. Do not edit confirmation state or replay it for another record, company, user, or changed argument set.

### 429 Rate limited

Honor `Retry-After`, stop parallel retries, and reuse the same idempotency key for the same pending write. Do not switch credentials to avoid a limit.

### 500 Internal error

Retry one read once. For a write, retry only with the original idempotency key. If it persists, record the `X-Request-ID` or the request ID in the JSON-RPC error and contact support.

### Claude plugin does not load

Run `claude plugin marketplace update drophaul`, reinstall if needed, then `/reload-plugins`. Use `/mcp` to complete OAuth for the project/plugin server. A direct PAT configuration is an advanced alternative only.

### OAuth browser returns to a dead page

For Claude Code, copy the full callback URL from the browser into the CLI prompt when offered. For Claude.ai or ChatGPT, restart the client-managed OAuth flow. If the client reports an unknown or unsupported client, verify that it supports CIMD and contact support; do not invent a callback, client ID, or secret.

## Support bundle

Send [support@drophaul.app](mailto:support@drophaul.app) the client name/version, timestamp and timezone, environment, credential kind, selected company name, tool name, HTTP status, and redacted request ID. Never send tokens, authorization codes, refresh tokens, client secrets, signed consent URLs, or customer payloads.
