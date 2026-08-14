# LifeToLife WordPress.com Automation Progress

Last updated: 2026-08-14 (KST)

## Status

WordPress.com distribution channel is operational through both ChatGPT's WordPress.com connector and an independent terminal/MCP client.

### Site

- WordPress.com site: `lifetolifeglobal.wordpress.com`
- Site creation: complete

### ChatGPT / WordPress.com connector path

- WordPress.com connector available and connected
- `posts.create` capability verified
- Test draft created successfully
  - Post ID: `6`
  - Title: `LifeToLife automation test`
  - Status: `draft`

### Independent terminal / MCP path

The independent LifeToLife Distribution Agent path was verified end-to-end.

- OAuth 2.1 Dynamic Client Registration: complete
- Registered client ID: `599335`
- Token endpoint auth method: `none`
- PKCE authorization flow: complete
- Access token issuance: verified
- Refresh token issuance: verified
- Required OAuth scope corrected from `auth` to `global`
- Granted scopes include `global`, `auth`, `openid`, `profile`, `email`, `users`, `sites`, `posts`, `comments`, `taxonomy`, `media`, and others
- WordPress.com MCP endpoint connection: verified
  - Endpoint: `https://public-api.wordpress.com/wpcom/v2/mcp/v1`
  - MCP protocol version verified: `2025-06-18`
  - Server: `WordPress.com MCP Server`
- MCP Content Authoring enabled in WordPress.com AI agent settings
- `wpcom-mcp-content-authoring` / `posts.create` schema retrieval: verified
- Terminal draft creation: verified
  - Post ID: `7`
  - Title: `LifeToLife terminal MCP test`
  - Status: `draft`
  - Link: `https://lifetolifeglobal.wordpress.com/?p=7`

## Key implementation notes

1. The legacy OAuth application flow using client ID `145782` repeatedly returned `invalid_client: Unknown client_id` at the token endpoint and was abandoned for the independent agent path.
2. The working independent path uses WordPress.com's OAuth 2.1 Dynamic Client Registration plus PKCE.
3. Initial OAuth 2.1 authorization with `scope=auth` allowed MCP initialization but `posts.create` failed with:
   `Required scope: global. Granted scope(s): auth.`
4. Re-authorizing with `scope=global` resolved the write-permission issue.
5. MCP write capability also had to be enabled at WordPress.com's AI agent/MCP settings page. Once writing was enabled, `posts.create` became available.
6. MCP calls that require a session must perform `initialize`, then `notifications/initialized`, and then `tools/call` within the same MCP session.

## Security

Do **not** commit or share any of the following:

- Client secrets
- Access tokens
- Refresh tokens
- Authorization codes
- PKCE code verifiers
- Application passwords

Local credential/token files used during testing must remain outside GitHub and should have restrictive permissions.

## Current conclusion

WordPress.com is ready as a LifeToLife global distribution channel via two validated paths:

1. ChatGPT WordPress.com connector publishing
2. Independent LifeToLife Distribution Agent publishing through OAuth 2.1 + PKCE + WordPress.com MCP

The independent path is suitable as the foundation for unattended/server-side distribution once token refresh and production credential storage are incorporated into the Distribution Agent.
