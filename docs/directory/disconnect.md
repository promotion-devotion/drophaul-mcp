# Disconnect DropHaul

1. In Claude or ChatGPT, open the DropHaul connection and choose **Disconnect**.
2. In DropHaul, open **Settings → API & integrations → Connected apps** and
   revoke the matching consent. This invalidates access and refresh credentials.
3. If a personal access token was used, revoke that token separately.
4. Confirm a new `whoami` call fails. If access persists, contact
   [support@drophaul.app](mailto:support@drophaul.app) with a redacted request ID.

Disconnecting a client does not delete operational records created through
approved calls. Use normal DropHaul retention and correction workflows.
