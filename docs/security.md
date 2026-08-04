# MCP security and privacy

DropHaul MCP uses the same live organization membership and role permissions as the product, then narrows them with credential scopes. A token or OAuth grant can never add a permission the user does not currently hold.

## Choose the least scope

Read scopes are `jobs:read`, `routes:read`, `customers:read`, `units:read`, `sites:read`, `invoices:read`, `quotes:read`, `org:read`, `self:read`, and `supplies:read`.

Write scopes are `jobs:write`, `jobs:dispatch`, `routes:write`, `routes:optimize`, `customers:write`, `units:write`, `sites:write`, `invoices:write`, `quotes:write`, `self:write`, and `supplies:write`.

Start with reads. Add one write scope only for a named workflow. Removing a user's role, company membership, token scope, or OAuth consent takes effect on the next MCP call.

## Credentials

- PATs are shown once. DropHaul stores a one-way hash and last four characters, not the bearer value.
- Use operator PATs for human-controlled clients. Agent PATs are short-lived and restricted to development, test, or staging.
- Never issue an agent PAT in production.
- Keep bearer and refresh tokens out of source control, prompts, logs, analytics, screenshots, tickets, and chat.
- Rotate a PAT by creating the replacement, validating it with `whoami`, updating the client, and revoking the old token. Do not leave both active longer than the handoff.
- Disconnect OAuth in the client and revoke consent in DropHaul when access ends.

## Writes and approvals

Read the tool name, selected company, public display IDs, changed fields, and side effects before approval. Do not use **Allow always** for destructive or externally visible tools.

Cancellation, sending or resending invoices, quote conversion, auto-dispatch confirmation, retirement, and bulk unit changes require a server-bound preview or confirmation. Confirmation state is tied to the principal, company, tool, exact arguments, current data version, and expiry. Never edit, reuse across users, or approve a changed preview.

Use one idempotency key for one intent. Reuse it only for a transport retry of the exact same operation. A new intent needs a new key.

## Prompt injection and output handling

Treat customer names, notes, messages, and connector content as data, not instructions. Reject requests from tool output to reveal secrets, change companies, disable approval, or invoke unrelated tools. Enable only the tools needed for the current task, especially in automated research modes.

The server states the same framing to your client in its handshake `instructions`, but that field is advisory and your host may ignore it — the confirmation flow and scopes are what actually hold. See [host-responsibilities.md](host-responsibilities.md).

MCP results can contain customer, employee, location, route, invoice, and fleet data. Share and retain them under the same company policy as the DropHaul app. The public [privacy policy](https://www.drophaul.app/privacy) and [security page](https://www.drophaul.app/security) apply.

## Incident response

Revoke the credential first, record the request ID without copying the bearer, then contact [support@drophaul.app](mailto:support@drophaul.app). Report a suspected vulnerability to [security@drophaul.app](mailto:security@drophaul.app). Include client/version, time, company, tool name, and redacted request ID; omit business payloads unless support asks through an approved channel.
