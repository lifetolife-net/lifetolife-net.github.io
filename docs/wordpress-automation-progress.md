# LifeToLife WordPress.com Automation Progress

Last updated: 2026-08-15 (KST)

> Global channel status is maintained in `docs/global-distribution-progress.md`. This file is the detailed WordPress.com implementation record.

## Status

WordPress.com is operational through both ChatGPT's WordPress.com connector and the independent LifeToLife Distribution Agent.

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

### Independent Distribution Agent path

Publishing verification:

- OAuth 2.1 Dynamic Client Registration + PKCE: verified
- Required scope: `global`
- WordPress.com MCP endpoint: `https://public-api.wordpress.com/wpcom/v2/mcp/v1`
- MCP protocol version: `2025-06-18`
- `wpcom-mcp-content-authoring` / `posts.create`: verified
- Common Distribution Agent draft verification:
  - Post ID: `9`
  - Status: `draft`
  - Re-query confirmed persistence

## Durable Object OAuth state hardening

The first production-hardening attempt used Workers KV for a rotating refresh token. That approach was rejected because the token lifecycle requires an authoritative state store that can immediately return the newest rotated token.

The production auth-state path now uses a SQLite-backed Durable Object class `WordPressAuthState`.

Final v8 recovery/verification on 2026-08-15 KST:

- Fresh WordPress.com OAuth 2.1 public client registered through DCR.
- Current non-secret client ID: `602709`.
- Browser PKCE authorization completed successfully with `scope=global`.
- Fresh access and refresh tokens were issued locally and were never printed or committed.
- Fresh OAuth state was seeded directly into the Durable Object.
- Verification reported `durable_object_bound=true`.
- First auth source: `durable-object-cache`.
- Second auth source: `durable-object-cache`.
- `second_call_used_cached_access_token=true`.
- Durable state reported `has_refresh_token=true` and `has_access_token=true`.
- Access token had approximately 3599 seconds remaining at verification.
- Durable bootstrap source: `fresh-pkce-seed`.
- No WordPress content was created by the auth-state verification.
- Secret values were not returned by the verification endpoint.

Conclusion: **Fresh WordPress OAuth state is successfully stored and served by the Durable Object, and the v8 auth-state path is Verified.** The canonical Worker config now points to `worker-v8.js` and binds `WPCOM_AUTH_STATE`; the experimental KV binding is no longer part of the canonical config.

## Key implementation notes

1. The legacy OAuth application flow using client ID `145782` returned `invalid_client: Unknown client_id` and was abandoned.
2. The independent path uses WordPress.com's OAuth 2.1 Dynamic Client Registration plus PKCE.
3. Initial authorization with only `scope=auth` allowed MCP initialization but did not permit content authoring; `scope=global` resolved the permission issue.
4. MCP content-authoring capability also had to be enabled in WordPress.com's AI agent/MCP settings.
5. MCP calls requiring a session use `initialize`, then `notifications/initialized`, then `tools/call` within the same session.
6. Earlier refresh-token experiments invalidated the bootstrap refresh-token candidates, producing `Invalid or expired refresh token`; a fresh PKCE authorization was therefore required once.
7. The v8 recovery script registers a fresh public client, performs PKCE locally, seeds the Durable Object directly, and never writes OAuth secrets to GitHub or the account ledger.

## Security

Do **not** commit or share any of the following:

- Client secrets
- Access tokens
- Refresh tokens
- Authorization codes
- PKCE code verifiers
- Application passwords

The DCR client ID is not a secret. Token material remains in runtime/local secret storage only.

## Current conclusion

WordPress.com is ready as a LifeToLife global distribution channel via two validated paths:

1. ChatGPT WordPress.com connector publishing
2. LifeToLife Distribution Agent publishing through OAuth 2.1 + PKCE + WordPress.com MCP, with OAuth state held in a SQLite-backed Durable Object

The WordPress auth-state architecture is no longer blocking expansion of the global distribution network.
