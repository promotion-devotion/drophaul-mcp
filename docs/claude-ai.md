# Connect Claude.ai to DropHaul

Claude.ai, Cowork, and Claude Desktop use the same remote connector. Claude connects to the server from Anthropic's cloud rather than from your device, so the endpoint must be reachable over the public internet. Individual users add a connector in their connector settings; organization owners add it from organization connector settings. Free, Pro, Max, Team, and Enterprise plans support custom connectors; Free is limited to one. Availability also depends on the current workspace policy.

## Add the connector

1. On Free, Pro, or Max, open **Customize → Connectors** and choose **+**, then **Add custom connector**. Free supports one custom connector. On Team or Enterprise, an owner or primary owner opens **Organization settings → Connectors**, chooses **Add**, hovers **Custom**, and selects **Web**.
2. Enter this exact URL:

   ```text
   https://majestic-emu-550.convex.site/mcp
   ```

3. Choose **Add**. On Team or Enterprise, each member then opens **Customize → Connectors**, finds the connector, and chooses **Connect**; on Free, Pro, or Max, choose **Connect** yourself.
4. Sign in to DropHaul, select the company explicitly, review the requested scopes, and approve only those required.
5. In a chat, open the **+** button and select **Connectors**, enable DropHaul, and run `whoami` before any business query.

DropHaul uses OAuth authorization code with PKCE S256 and refresh-token rotation. Complete the client-managed consent flow shown by Claude; do not paste a bearer value or confidential client secret into the connector.

This live custom connector is currently available only to already registered OAuth clients; it is not a Claude directory listing or public self-service onboarding path. If **Connect** reports an OAuth setup error, contact [DropHaul support](mailto:support@drophaul.app) rather than inventing a client configuration.

## Safe first walkthrough

1. Call `whoami` and confirm the company and roles.
2. Ask for today's `get_schedule` and confirm results stay within that company.
3. Request a harmless write preview, such as an auto-dispatch preview, but do not confirm it.
4. Review the exact affected display IDs and tool approval before allowing a write.
5. Disconnect the connector in **Customize → Connectors**, then verify it no longer runs.

Disable unrelated tools before using Research. Research can make many connector calls, so leave write tools disabled for research tasks.

See [security](security.md) for scopes and approvals, or [troubleshooting](troubleshooting.md) for connection errors. Anthropic's current connector instructions are in [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
