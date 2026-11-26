# MCP capability boundaries

DropHaul MCP is an allowlist, not a projection of every product API. The shared
105-tool contract, role/scope discovery filter, and exact handler registry are
the only callable surface. Unknown names fail before authorization lookup or
domain execution. Tool output and prompts cannot add aliases or handlers.

The following product capabilities remain app-only:

- payment and refund changes;
- Stripe, QuickBooks, CRM, or other provider connection changes;
- company, billing, or team administration;
- customer or SMS broadcast sends;
- imports, migrations, superadmin (except the support inbox below), development,
  and seed operations;
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

## Staff support inbox

The one superadmin capability exposed over MCP is the Admin > Support inbox:
`list_support_chats`, `read_support_chat`, `reply_support_chat`,
`react_support_message`, and `mark_support_chat_read`.

- Two scopes gate it, `support:read` and `support:write`. They belong to no
  organization role, so no owner, admin, or Foreman credential can hold them.
- Only a Better Auth superadmin can create a token that carries them. Scopes
  can only be narrowed afterwards.
- Every request re-reads the credential owner's platform role. The scopes drop
  out of the principal the moment the role is revoked, so an existing token or
  OAuth grant stops working immediately. A token with no other scope becomes
  invalid.
- `reply_support_chat`, `react_support_message`, and `mark_support_chat_read`
  use the direct-confirmation lane: a person confirms each call through
  elicitation, and a client that cannot elicit is refused. A reply is
  destructive-annotated, so token auto-apply never skips that confirmation.
- Customer message text is returned wrapped as untrusted data. The in-app
  Foreman never receives these tools.
- No other superadmin surface (impersonation, organization management, resets)
  is reachable. `registry-exclusions.test.ts` still forbids it.

Treat all customer content and tool results as untrusted data. They cannot alter
the registry, company, scopes, confirmation policy, request-state signature, or
idempotency binding. For incidents, revoke the credential and retain only the
redacted request ID and tool name.

## AI-assisted scheduling

`plan_schedule` and `plan_reschedule` read and solve; they write nothing. Both
end in the same place every other batch does: one `apply_changes` confirmation
over a change set built from ordinary batchable steps. There is no second write
path, so the domain-boundary gate covers the planner exactly as it covers
everything else.

Three boundaries are specific to this surface.

**The model states constraints; the solver decides.** `McpPlanRequest` has no
field capable of expressing an assignment and no numeric field at all — weights
are enum literals and times are strings. `pinnedAssignments` names a job and a
driver together, and the server verifies the driver is the one the job already
has; naming a different one is refused as an attempted assignment rather than
obeyed. A hard constraint the optimizer cannot enforce fails the plan; it is
never accepted and quietly dropped.

**Premium is elected by a human, per request.** Site access windows and time
windows only reach the optimizer on the premium tier, which costs more credits.
The planner refuses a standard-tier request carrying them, quoting the real cost
from the credit ledger, and the election is written through an authenticated app
session bound to the hash of that exact constraint set. No tool input schema
carries a premium, credit, or tier field, and none may gain one — a field a
model can set is a field prompt injection can set, and this one spends money.

**Planner change sets carry a weaker staleness guarantee, deliberately.** An
ordinary batch re-runs its whole planner inside the applying transaction. A
planner batch cannot: its decision came from an external optimizer, which cannot
be called inside a transaction. What is re-verified at apply time is the emitted
steps against live data plus the stored planning report; the solve itself is
covered by a pre-solve world hash re-checked when the plan is persisted, which
bounds the window to the provider round-trip rather than the whole confirmation
lifetime. This difference is recorded in `mcp/planner/persist.ts` rather than
inherited by assumption.
