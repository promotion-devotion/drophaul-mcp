---
name: invoice-chase
description: Review unpaid DropHaul invoices, prioritize customer follow-up, and safely prepare or send approved invoice reminders. Use when an owner or admin asks for an aging review, overdue-invoice list, collection plan, resend workflow, or invoice follow-up summary.
---

# Invoice Chase

Separate collection analysis from any customer-facing action.

## Workflow

1. Call `whoami`. Stop if invoice tools are not available for the selected company.
2. Resolve an explicit as-of date and bounded invoice date range. Call `list_invoices`, following returned cursors until the requested range is covered.
3. Call `get_invoice` for overdue or disputed candidates. Use `get_customer` and `list_customer_contacts` only when contact context is needed.
4. Group invoices by urgency: newly due, overdue, severely overdue, disputed or incomplete, and already paid. Use public invoice and customer display IDs.
5. Draft a follow-up plan with amount, due date, last known status, contact path, and the next action. Do not invent payment promises, disputes, or contact details.
6. If the user asks to resend an invoice, state the exact invoice, recipient information returned by the tools, and expected side effect. Ask for explicit approval.
7. Call `resend_invoice` only with the returned preview or confirmation state and a fresh idempotency key. Never edit confirmation state, and never treat approval of one invoice as approval of a batch.
8. Report the receipt and any delivery failure. Do not retry with a new key unless the user approves a new send.

## Safety

- Keep the initial review read-only. Do not send chat messages or create invoices as part of an invoice chase.
- Never include credentials, internal IDs, unrelated customer data, or full contact lists in the summary.
- If an invoice appears paid, void, disputed, or missing a recipient, stop the send and explain why.
- Phrase drafts professionally and factually; do not threaten fees, collections, or service suspension unless the returned record and user instruction explicitly support it.
