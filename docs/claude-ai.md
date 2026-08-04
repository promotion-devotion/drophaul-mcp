# Connect Claude.ai to DropHaul

Claude.ai, Cowork, and Claude Desktop use the same remote connector. Custom connectors are available on Free, Pro, Max, Team, and Enterprise plans, with Free limited to one; Team and Enterprise workspaces require an owner or primary owner to add the organization connector. Claude connects to the server from Anthropic's cloud rather than from your device, so the endpoint must be reachable over the public internet.

## Add the connector

1. On Pro or Max, open **Customize → Connectors** and choose **+**, then **Add custom connector**. On Team or Enterprise, an owner or primary owner opens **Organization settings → Connectors**, chooses **Add**, hovers **Custom**, and selects **Web**.
2. Enter this exact URL:

   ```text
   https://majestic-emu-550.convex.site/mcp
   ```

3. Choose **Add**. On Team or Enterprise, each member then opens **Customize → Connectors**, finds the connector, and chooses **Connect**; on Pro or Max, choose **Connect** yourself.
4. Sign in to DropHaul, select the company explicitly, review the requested scopes, and approve only those required.
5. In a chat, open the **+** button and select **Connectors**, enable DropHaul, and run `whoami` before any business query.

DropHaul uses OAuth authorization code with PKCE S256 and refresh-token rotation. Claude's current published callback is `https://claude.ai/api/mcp/auth_callback`; operators must register that exact callback for the pre-registered public client. Do not add a trailing slash or a substitute callback.

Public CIMD/DCR onboarding is not advertised until its external security approval is complete. If **Connect** reports an unknown client, contact [DropHaul support](mailto:support@drophaul.app); do not manually create a confidential client or paste a client secret into Claude.

## Safe first walkthrough

1. Call `whoami` and confirm the company and roles.
2. Ask for today's `get_schedule` and confirm results stay within that company.
3. Request a harmless write preview, such as an auto-dispatch preview, but do not confirm it.
4. Review the exact affected display IDs and tool approval before allowing a write.
5. Disconnect the connector in **Customize → Connectors**, then verify it no longer runs.

Disable unrelated tools before using Research. Research can make many connector calls, so leave write tools disabled for research tasks.

See [security](security.md) for scopes and approvals, or [troubleshooting](troubleshooting.md) for connection errors. Anthropic's current connector instructions are in [Get started with custom connectors using remote MCP](https://support.anthropic.com/en/articles/11175166-about-custom-integrations-using-remote-mcp).
