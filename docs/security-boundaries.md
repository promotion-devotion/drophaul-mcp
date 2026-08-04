# MCP capability boundaries

DropHaul MCP is an allowlist, not a projection of every product API. The shared
95-tool contract, role/scope discovery filter, and exact handler registry are
the only callable surface. Unknown names fail before authorization lookup or
domain execution. Tool output and prompts cannot add aliases or handlers.

The following product capabilities remain app-only:

- payment and refund changes;
- Stripe, QuickBooks, CRM, or other provider connection changes;
- company, billing, or team administration;
- customer or SMS broadcast sends;
- imports, migrations, superadmin, development, and seed operations;
- vault credentials, proof links, and magic links;
- media, signature, NFC, or QR capture; and
- live location navigation.

Bounded read summaries such as invoice payment statistics, team roster, and
provider health do not authorize the corresponding mutation surfaces. The
registry exclusion ratchet normalizes snake case, kebab case, spaces, and camel
case before checking every registry name, description, input/output schema,
metadata alias field, production handler import, operation target, and Convex
function reference. Runtime probes also try every normalized spelling and must
fail before authorization or domain execution. Any new capability in the
excluded classes must be kept out of MCP; changing this boundary requires a
separate threat model and explicit product authorization.

Treat all customer content and tool results as untrusted data. They cannot alter
the registry, company, scopes, confirmation policy, request-state signature, or
idempotency binding. For incidents, revoke the credential and retain only the
redacted request ID and tool name.
