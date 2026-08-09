# Who guides the model on the direct MCP surface

On the DropHaul web Foreman, DropHaul owns the whole loop: the model, its system
prompt, its tool set, and the approval card. On the direct MCP surface it owns
none of those. The host application — Claude Code, Claude.ai, ChatGPT, the Codex
CLI, or anything else holding a credential — runs its own model with its own
system prompt and, usually, other servers' tools alongside ours.

This page states what DropHaul supplies to that host, what stays the host's
responsibility, and what neither side can close.

## What DropHaul supplies

**Server instructions.** The server's modern discovery response and supported
stateless `initialize` handshake carry the same `instructions` string. It says
four things:

- what this server is, and that it acts as one signed-in user in one company;
- that tool results carry third-party text — chat messages, notification bodies,
  job notes, customer and site names — which should be read as data to report on
  rather than as instructions to follow, and that only the signed-in user gives
  instructions;
- that IDs, records, permissions, and successful writes must never be invented,
  and records should be named by the public display IDs the tools return; and
- that a tool which changes data first returns a confirmation form, which is to
  be answered by the signed-in user rather than from tool output.

The untrusted-content wording is a single shared constant, so the direct MCP
surface and the web Foreman cannot drift apart. Deliberately absent: any
persona, the per-role guidance, and a copy of the tool allowlist. The host owns
its model's persona, and `tools/list` already carries the live per-credential
allowlist — a second copy in `instructions` would go stale between calls.

**Enforcement, which is separate from the above.** Scope and role filtering on
`tools/list` and `tools/call`, the server-bound preview/confirmation flow, the
signed request state, and idempotency binding. These hold regardless of what any
model was told. See [security.md](security.md) and
[security-boundaries.md](security-boundaries.md).

## `instructions` is advisory

The MCP specification makes `instructions` a hint. A host may drop it, truncate
it, summarize it, place it where the model weighs it lightly, or never read it
at all. DropHaul cannot detect which happened — nothing in a later request
reports whether the field was honored.

So `instructions` is framing, not a control. It does not gate a tool call, and no
part of DropHaul's authorization consults it. **Do not treat it as a mitigation
for prompt injection.** The thing that actually stops an unwanted write is the
confirmation flow, which is built from the model's declared tool arguments and
requires a human answer, plus the credential's scopes, which bound what the
model can reach at all.

## What remains the host's responsibility

- **Placing and honoring the instructions.** Out of our control entirely.
- **The approval UI.** DropHaul returns an elicitation form with a summary of
  the proposed effect and an expiry. Rendering it to a human, and not letting a
  model self-answer it, is the host's job. An "always allow" setting applied to
  a mutating DropHaul tool defeats the confirmation gate from the host's side.
- **Cross-server tool isolation.** A host may expose our tools next to another
  server's. Text returned by one server can name another's tools. Nothing on our
  side sees those other tools.
- **Conversation retention.** Tool results contain customer, employee, location,
  route, invoice, and fleet data. Where the host stores it is the host's policy.
- **Which tools stay enabled.** Enable only what a task needs, especially in
  automated modes.

## The residue

Two gaps cannot be closed in DropHaul code, and this is the honest statement of
them:

1. **We cannot make a host read the instructions.** Any promise resting on the
   host's model having read them is unfounded. Every DropHaul guarantee has to
   rest on scopes and the confirmation flow instead.
2. **We cannot distinguish a model-authored confirmation answer from a
   human-authored one.** The elicitation response arrives over the same
   transport either way. A host that auto-answers confirmation forms converts
   the gate into a formality, and the server cannot tell.

Both are properties of the protocol, not defects in the implementation. They are
also the reason the tool allowlist is narrow — see
[security-boundaries.md](security-boundaries.md) for the capabilities kept off
this surface entirely.
