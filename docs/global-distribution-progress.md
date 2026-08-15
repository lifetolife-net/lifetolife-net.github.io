# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic path to API/MCP-based automation.
- Track account creation, API access, standalone publishing verification, and Distribution Agent integration separately.
- Do not treat account creation or a successful API response alone as automation completion; created content must persist and be re-readable where the platform permits it.
- Human login/approval steps may remain manual, but routine publishing should ultimately be handled by the LifeToLife Distribution Agent.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in this repository or the Google Sheets ledger.

## Current channel status

| Channel | Public account / handle | Standalone automation | Distribution Agent | Next action |
|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | **Verified** | Not yet integrated | Integrate next; preserve existing OAuth 2.1 / PKCE / MCP path |
| Pinterest | LifeToLife | **Pending Trial approval** | Not applicable yet | Wait for approval, then verify actual pin creation |
| Bluesky | `@lifetolife-net.bsky.social` | **Verified** | **Verified + integrated** | Operate through Agent; optionally move handle to `@lifetolife.net` |
| Blogger | LifeToLife / `lifetolife-net` | **Verified** | **Verified + integrated** | Operate through Agent; stabilize Google OAuth lifecycle |
| Facebook | Page `Life to Life` | **Verified** | **Verified + integrated** | Operate through Agent |
| Instagram | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| Threads | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| YouTube | `@lifetolife_net` | **Verified** | Not yet integrated | Integrate after WordPress; stabilize Google OAuth lifecycle |

## Verified channels

### 1. WordPress.com

- Site: `lifetolifeglobal.wordpress.com`
- Verified through two independent paths:
  1. ChatGPT WordPress.com connector
  2. Terminal/MCP client using OAuth 2.1 Dynamic Client Registration + PKCE + WordPress.com MCP
- Both paths successfully created draft posts.
- Detailed notes: `docs/wordpress-automation-progress.md`

Status: **Standalone Verified; Distribution Agent integration pending.**

### 2. Bluesky

Standalone verification on 2026-08-14:

- Account: `@lifetolife-net.bsky.social`
- DID: `did:plc:smxnvmbrwgxukp3xsw4zbz2j`
- Authentication: App Password
- Session: `com.atproto.server.createSession`
- Publishing: `com.atproto.repo.createRecord`
- Collection: `app.bsky.feed.post`
- Initial verification URI: `at://did:plc:smxnvmbrwgxukp3xsw4zbz2j/app.bsky.feed.post/3mt24l25w4l22`

Distribution Agent integration on 2026-08-15 KST:

- Initial Agent attempts using the handle as `BLUESKY_IDENTIFIER` returned `AuthenticationRequired / Invalid identifier or password` even though local credential validation succeeded.
- Recovery path validated the same App Password locally, extracted the stable DID, validated login again with the DID, and stored the DID as the Worker-side identifier.
- Agent test text: `LifeToLife Distribution Agent Bluesky DID repair test 2026-08-15T01:19:14Z`
- Agent record key: `3mt3iwvjicf2d`
- URI: `at://did:plc:smxnvmbrwgxukp3xsw4zbz2j/app.bsky.feed.post/3mt3iwvjicf2d`
- CID: `bafyreicinv7zzlinzj36wad6fkunosoygwuwjugdvoujpii6t64bx2kzra`
- Permalink: `https://bsky.app/profile/lifetolife-net.bsky.social/post/3mt3iwvjicf2d`
- Persistent verification: `com.atproto.repo.getRecord` returned the same URI, CID, text, record type, and timestamp.

Conclusion: **Bluesky publishing through the common LifeToLife Distribution Agent is Verified.** The Worker uses the stable DID for authentication identity.

### 3. Blogger

Standalone verification on 2026-08-14:

- Blog ID: `6980894376000692850`
- Blog URL: `https://lifetolife-net.blogspot.com/`
- Google Cloud project: `LifeToLife Distribution`
- OAuth client: `LifeToLife Blogger Publisher`
- Scope: `https://www.googleapis.com/auth/blogger`
- Publishing: `posts.insert`
- Initial test post ID: `3206693250991989192`
- Initial test post was deleted after successful verification.

Distribution Agent integration on 2026-08-15 KST:

- Existing local OAuth files were reused from `~/.lifetolife-distribution/blogger/`.
- Worker stores the Blogger client metadata and refresh token as Cloudflare secrets; values are not written to GitHub or the ledger.
- Agent refreshes a Google access token, calls `posts.insert`, then verifies with `posts.get`.
- Agent test post ID: `7783253598875718440`
- Title: `LifeToLife Distribution Agent integrated test 2026-08-15T01:09:57Z`
- Permalink: `https://lifetolife-net.blogspot.com/2026/08/lifetolife-distribution-agent.html`
- Persistent re-query returned the same ID, title, URL, published time, and updated time.

Conclusion: **Blogger publishing through the common LifeToLife Distribution Agent is Verified.** Stable unattended production still requires attention to the Google OAuth consent/testing lifecycle.

### 4. YouTube

- Channel: `LifeToLife`
- Handle: `@lifetolife_net`
- Channel ID: `UCzB_Os4W_7MiVDpGbXfsqxA`
- API: YouTube Data API v3
- Scopes used: `youtube.upload`, `youtube.readonly`, `youtube.force-ssl`
- First upload anomaly: video ID `KW1viXDoxEU` was returned but the video disappeared immediately afterward; cause unresolved.
- Persistent verification upload: video ID `llXXvCyOMiw`
- API polling reached processed/succeeded.
- The video remained retrievable by API and visible in YouTube Studio.

Status: **Standalone Verified; Distribution Agent integration pending.** Google OAuth lifecycle must be stabilized for unattended production.

### 5. Facebook

- Meta Business Portfolio: `LifeToLife`
- Meta Developer App: `LifeToLife Distribution`
- Page: `Life to Life`
- Page ID: `1179071821966202`
- Permissions verified: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `public_profile`
- `/me/accounts` returned an empty array during setup; direct lookup by known Page ID with `?fields=name,access_token` is the working Page Access Token path.
- Initial standalone post ID: `1179071821966202_122101542843437192`

Distribution Agent integration:

- First Meta 3-target Agent run failed on Facebook with OAuth `#200` while Instagram and Threads succeeded because the wrong Facebook credential had been placed in the Worker.
- Correct Page Access Token was re-derived, validated, and replaced as a Worker secret.
- Agent repair post ID: `1179071821966202_122101703007437192`
- Permalink: `https://www.facebook.com/122101544457437192/posts/122101703007437192`
- Persistent re-query returned the same message and permalink.

Conclusion: **Facebook publishing through the common Distribution Agent is Verified.**

### 6. Instagram

- Business account: `@lifetolife_net`
- Instagram User ID: `17841440001348167`
- Permissions include `instagram_basic`, `instagram_content_publish`, and required Page permissions.
- Standalone media ID: `18004092830779466`
- Standalone permalink: `https://www.instagram.com/p/DcBrsUGiZWm/`
- WordPress-hosted media initially failed while WordPress was in Coming Soon mode; media ingestion succeeded after the site became public.

Distribution Agent integration:

- Container ID: `18083507975333379`
- Published Media ID: `18014959226941168`
- Permalink: `https://www.instagram.com/p/DcB4Grcgbu8/`
- Re-query confirmed image type, username, caption persistence, and timestamp.

Conclusion: **Instagram image publishing through the common Distribution Agent is Verified.**

### 7. Threads

- Profile: `@lifetolife_net`
- Meta Developer App: `LifeToLife Distribution`
- Permissions include `threads_basic` and `threads_content_publish`.
- OAuth/deauthorization/data-deletion callbacks are hosted by `lifetolife-threads-callbacks` at `https://threads-api.lifetolife.net`.
- Standalone media ID: `18119437411883307`
- Standalone permalink: `https://www.threads.com/@lifetolife_net/post/DcB1SBKCZ9f`

Distribution Agent integration:

- Container ID: `18081252476368456`
- Published Media ID: `18065529290746474`
- Permalink: `https://www.threads.com/@lifetolife_net/post/DcB4GZ7moT5`
- Re-query confirmed media product/type, username, original text, and timestamp.

Conclusion: **Threads text publishing through the common Distribution Agent is Verified.**

## Approval pending

### Pinterest

- LifeToLife account is open.
- Pinterest API Trial access has been requested.
- Current state: **Trial access pending**.
- Do not mark Pinterest automation Verified until actual pin creation and persistence are confirmed after approval.

## Distribution Agent infrastructure

### Common Worker

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Common route: `POST /v1/publish`
- Backward-compatible Meta route: `POST /v1/publish/meta`
- Current verified common targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`
- Mode: `verified-path-v2`

Current verified adapter paths:

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh token -> fresh access token -> `posts.insert` -> `posts.get`
- Bluesky: App Password with stable DID -> `createSession` -> `createRecord` -> `getRecord`

All provider credentials and the Distribution Agent authorization key are stored outside GitHub and the account ledger. Cloudflare Worker secrets are used for production credentials.

### Threads callback Worker

- Worker: `lifetolife-threads-callbacks`
- Domain: `https://threads-api.lifetolife.net`
- Purpose: Threads OAuth callback, deauthorization callback, and data-deletion callback

### Google Cloud

- Project: `LifeToLife Distribution`
- Project identifier: `lifetolife-distribution`
- APIs prepared: Blogger API, YouTube Data API v3
- Blogger and YouTube standalone API verification are complete.
- Google OAuth lifecycle remains a production-hardening item for long-lived unattended operation.

### Account ledger

Operational account management is mirrored in Google Sheets:

- `LifeToLife_Global_Distribution_Account_Ledger`

It tracks public account/handle, management account, API method, verification state, Agent state, next action, and secret-storage policy. Secret values are intentionally excluded.

## Account-management policy

Default global management account:

- `jisooyoun.cafe@gmail.com`

Rules:

1. Passwords are stored only in the password manager, never in GitHub or the account ledger.
2. API keys, app passwords, OAuth tokens, refresh tokens, and client secrets are stored only in environment variables or a dedicated secret store.
3. Enable 2FA where available and store recovery codes separately.
4. Every new channel/API milestone must be reflected in both this document and the Google Sheets ledger.
5. A channel is marked **Verified** only after an automated publish/upload succeeds and the created content persists through platform processing or an equivalent authoritative re-query.
6. Paused or abandoned channels remain in the record with an explicit status rather than being silently removed.

## Current totals

As of 2026-08-15 KST:

- Distribution-facing accounts/channels or management hubs recorded: **9**
- Standalone automated publishing verified: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads
- Integrated and verified in the common LifeToLife Distribution Agent: **5 channels** — Facebook, Instagram, Threads, Blogger, Bluesky
- Verified but not yet Agent-integrated: **2 channels** — WordPress.com, YouTube
- API approval pending: **1** — Pinterest
- Open publishable channels with standalone automation still unverified: **0**

## Immediate queue

1. Integrate WordPress.com into the common Distribution Agent while preserving its already-verified OAuth 2.1 / PKCE / MCP publishing path.
2. Integrate YouTube as the final currently Verified media-upload adapter.
3. After 7-channel Agent integration, add production hardening: content transformation per channel, idempotency, retries, logging, secret rotation, and scheduling.
4. Stabilize Google OAuth clients for long-lived unattended Blogger/YouTube operation.
5. Keep Pinterest in approval-wait state; do not repeatedly check it manually.
6. Cleanup of verification posts is optional and non-blocking.
7. Keep this document and the Google Sheets account ledger synchronized after every account/API milestone.
