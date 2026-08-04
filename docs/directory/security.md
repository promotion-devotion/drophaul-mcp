# Directory security disclosure

Every request re-resolves the credential, company membership, roles, and
scopes. The registry filters discovery and repeats authorization at execution.
Destructive operations require a short-lived preview bound to the principal,
company, tool, exact arguments, live data version, and expiry. Retries use an
idempotency receipt, so the same approved intent writes once.

DropHaul does not expose payment or refund changes, provider connection changes,
company/billing/team administration, broadcast sends, imports, migrations,
superadmin/development/seed tools, vault credentials, proof or magic links,
media/signature/tag capture, or live navigation.

Report vulnerabilities to [security@drophaul.app](mailto:security@drophaul.app).
Do not include bearer values, refresh tokens, customer content, or full tool
arguments. Include the client/version, time, tool name, and redacted request ID.
