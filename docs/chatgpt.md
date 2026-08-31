# Connect ChatGPT to DropHaul

Add DropHaul as a custom MCP connection in ChatGPT developer mode. The
connection uses client-managed OAuth, so do not create or paste a personal
access token.

## Create the app

1. Open **Settings → Security and login** and turn on **Developer mode**. Availability can depend on account and workspace policy.
2. Go to [ChatGPT Plugins](https://chatgpt.com/plugins) and select the plus button.
3. Enter a user-facing name and description.
4. Under **Connection**, enter the exact MCP endpoint, including the `/mcp` path:

   ```text
   https://majestic-emu-550.convex.site/mcp
   ```

5. Create the connection. ChatGPT follows the server's OAuth discovery; do not paste a bearer value or client secret into the connection.
6. Complete DropHaul sign-in, choose the company, and review the scopes.
7. Review the tools and metadata discovered from the server.

DropHaul's OAuth metadata advertises refresh support, and a refresh remains bound to the same client, company, user, resource, and narrowed scopes. If ChatGPT cached older discovery metadata, open the connection at [ChatGPT Plugins](https://chatgpt.com/plugins) and select **Refresh**.

## Test the app

1. Start a new chat and add the DropHaul connection from the tools menu.
2. Run `whoami`, then a bounded `search` query.
3. Pass one returned result ID to `fetch`; do not invent the ID or URL.
4. Run one role-visible read tool.
5. Request a write, inspect ChatGPT's approval prompt and DropHaul's preview, then either reject it or approve that exact operation.
6. Disconnect and reconnect; confirm the company and scopes have not widened.
7. Revoke consent and verify both the access and refresh paths fail.

Company knowledge can use read-only tools from the server. Eligibility as a company knowledge source requires the standard `search` and `fetch` tool input schemas plus `readOnlyHint: true` on the other read-only tools; DropHaul publishes both. Full operational tools require the developer-mode connection.

See [security](security.md) and [troubleshooting](troubleshooting.md). OpenAI's current developer-connection workflow is documented in [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt). **Scan Tools** is a separate step in the public plugin submission portal, not part of this developer connection.
