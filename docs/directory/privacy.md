# Directory privacy disclosure

DropHaul sends only data needed to answer the selected tool call. Depending on
the tool, results may contain company operations, employee assignments,
customers, sites, routes, fleet records, invoices, or quotes. The client and its
model provider process returned data under the customer's chosen provider terms.

DropHaul MCP usage events contain the tool name, surface, credential kind,
current role, outcome, latency, scope denial, rate-limit state, confirmation
state, and request correlation. They never contain tool arguments, result
content, bearer values, refresh tokens, or conversation text.

Usage-event rows are stored for operational analytics and audit. The current
service does not automatically delete or aggregate these usage-event rows on a
fixed schedule. Data returned to Claude, ChatGPT, Claude Code, or Codex is
retained by that client under the customer's selected provider terms; DropHaul
does not control that client-side retention.

Credentials are hashed or encrypted as described in the public
[privacy policy](https://www.drophaul.app/privacy). Disconnect the client and
revoke its DropHaul consent to stop future access. Contact
[privacy@drophaul.app](mailto:privacy@drophaul.app) for privacy requests.
