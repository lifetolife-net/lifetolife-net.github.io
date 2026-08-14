# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic path to API/MCP-based automation.
- Track account creation, API access, and actual publishing verification separately.
- Do not treat account creation alone as automation completion.
- A successful API response alone is not sufficient when the created content does not persist through platform processing.
- Do not store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, or PKCE verifiers in this repository.
- Human login/approval steps may remain manual, but routine publishing should ultimately be handled by the LifeToLife Distribution Agent.

## Current channel status

| Channel | Public account / handle | Account status | API / automation status | Actual publish verification | Next action |
|---|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Open | ChatGPT connector + OAuth 2.1 / PKCE + WordPress.com MCP operational | **Verified** | Production token refresh / secret storage integration |
| Pinterest | LifeToLife | Open | Trial API access requested | **Pending approval** | Wait for Trial access approval, then verify actual pin creation |
| Bluesky | `@lifetolife-net.bsky.social` | Open | App Password + AT Protocol API operational | **Verified** | Consider moving handle to `@lifetolife.net`; integrate into Distribution Agent |
| Blogger | LifeToLife / `lifetolife-net` | Open | Blogger API + Desktop OAuth operational | **Verified** | Integrate into Distribution Agent; move OAuth out of temporary Testing lifecycle for stable operation |
| Facebook | Page: `Life to Life` | Open | Meta Developer App `LifeToLife Distribution`; Page Access Token path operational; Graph API post creation and persistent re-read verified | **Verified** | Integrate into Distribution Agent; clean up verification post |
| Instagram | `@lifetolife_net` | Business account; connected to LifeToLife portfolio | Instagram Graph API publishing operational; `instagram_basic` + `instagram_content_publish` and Page permissions connected | **Verified** | Integrate into Distribution Agent |
| Threads | `@lifetolife_net` | Open | Threads API OAuth + publishing operational; callback endpoints hosted on Cloudflare Worker | **Verified** | Integrate into Distribution Agent; move token handling to secret storage |
| YouTube | `@lifetolife_net` | Open | YouTube Data API v3 + OAuth operational; persistent private upload verified through API and YouTube Studio | **Verified** | Integrate into Distribution Agent; move OAuth out of temporary Testing lifecycle for stable operation |

## Verified channels

### 1. WordPress.com

WordPress.com is operational through two independent publishing paths.

1. ChatGPT WordPress.com connector
2. Independent terminal/MCP client using OAuth 2.1 Dynamic Client Registration + PKCE + WordPress.com MCP

Both paths successfully created draft posts.

Detailed implementation and troubleshooting notes are maintained in:

- `docs/wordpress-automation-progress.md`

### 2. Bluesky

Bluesky automation was verified on 2026-08-14.

- Account: `@lifetolife-net.bsky.social`
- Account type: personal account; no separate business account required for this automation path
- Authentication: Bluesky App Password
- Direct-message permission: **not granted**
- Session authentication: verified through `com.atproto.server.createSession`
- Publishing: verified through `com.atproto.repo.createRecord`
- Collection: `app.bsky.feed.post`
- Test post text: `LifeToLife Bluesky auto-publishing test`
- Returned record URI: `at://did:plc:smxnvmbrwgxukp3xsw4zbz2j/app.bsky.feed.post/3mt24l25w4l22`
- Validation status: `valid`

Conclusion: Bluesky is ready to be integrated into the LifeToLife Distribution Agent.

### 3. Blogger

Blogger automation was verified on 2026-08-14.

- Blog name: `LifeToLife`
- Blog ID: `6980894376000692850`
- Blog URL: `https://lifetolife-net.blogspot.com/`
- Google Cloud project: `LifeToLife Distribution`
- Authentication: Desktop OAuth client `LifeToLife Blogger Publisher`
- OAuth scope: `https://www.googleapis.com/auth/blogger`
- Authenticated blog discovery: verified through `blogs.listByUser(userId="self")`
- Publishing: verified through `posts.insert`
- Test post title: `LifeToLife Blogger auto-publishing test`
- Returned post ID: `3206693250991989192`
- Returned status: `LIVE`
- Returned URL: `https://lifetolife-net.blogspot.com/2026/08/lifetolife-blogger-auto-publishing-test.html`
- Verification post cleanup: deleted successfully after validation on 2026-08-14.

Conclusion: Blogger's API publishing path works and is ready for Distribution Agent integration. The OAuth app is still in Google's Testing lifecycle, so long-lived unattended operation must account for that lifecycle before production deployment.

### 4. YouTube

YouTube automated upload was verified on 2026-08-14.

- Channel title: `LifeToLife`
- Channel handle: `@lifetolife_net`
- Channel ID: `UCzB_Os4W_7MiVDpGbXfsqxA`
- Google Cloud project: `LifeToLife Distribution`
- OAuth scopes configured: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/youtube.force-ssl`
- OAuth authorization for upload/read-only completed successfully with a separate YouTube token file.
- Authenticated channel identity was verified through `channels.list(mine=true)` and matched `LifeToLife / @lifetolife_net`.
- First test anomaly: `videos.insert` returned video ID `KW1viXDoxEU`, but the video disappeared immediately after upload; the exact cause remains unresolved and is retained as an anomaly record.
- Second verification test: `videos.insert` returned video ID `llXXvCyOMiw`.
- API polling through `videos.list(part=status,processingDetails)` reached `status.uploadStatus == processed` and `processingDetails.processingStatus == succeeded`.
- The second test video remained retrievable by API after processing.
- The user confirmed the same private video remained visible in YouTube Studio after processing.

Conclusion: YouTube's persistent private API upload path is verified and is ready for Distribution Agent integration. The Google OAuth app is still in Testing, so long-lived unattended operation must account for that lifecycle before production deployment.

### 5. Facebook

Facebook Page automated publishing was verified on 2026-08-14.

- Meta Business Portfolio: `LifeToLife`
- Meta Developer App: `LifeToLife Distribution`
- Facebook Page: `Life to Life`
- Facebook Page ID: `1179071821966202`
- Required permissions confirmed through `GET /me/permissions`: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, and `public_profile` all returned `granted`.
- `GET /me/accounts` unexpectedly returned an empty `data` array, so Page discovery through that route was not usable in this session.
- The working fallback was direct Page lookup using the known Page ID with `?fields=name,access_token`, which returned the Page Access Token.
- The Page Access Token was validated with `GET /me?fields=id,name`, which resolved to `Life to Life` / `1179071821966202` rather than the personal user.
- Publishing: verified through `POST /1179071821966202/feed`.
- Test post text: `LifeToLife Facebook auto-publishing test`.
- Returned post ID: `1179071821966202_122101542843437192`.
- Persistence verification: `GET /1179071821966202_122101542843437192?fields=id,message,permalink_url` returned the same post ID, the original message, and a Facebook permalink.

Conclusion: Facebook Page auto-publishing is verified and ready for Distribution Agent integration. The `/me/accounts` discovery anomaly should remain documented, but it is no longer a blocker because the direct Page-ID-to-Page-Access-Token path works.

### 6. Instagram

Instagram automated publishing was verified on 2026-08-15 KST.

- Meta Developer App: `LifeToLife Distribution`
- Instagram Business account: `@lifetolife_net`
- Instagram User ID: `17841440001348167`
- Permissions connected: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- The WordPress-hosted media initially could not be fetched while the WordPress site was in Coming Soon mode. After the site visibility was changed to public, media ingestion succeeded.
- Media container ID: `18083470502333379`
- Published Media ID: `18004092830779466`
- Re-query confirmed `media_type=IMAGE`, username `lifetolife_net`, caption persistence, and timestamp.
- Permalink: `https://www.instagram.com/p/DcBrsUGiZWm/`

Conclusion: Instagram image auto-publishing and persistent re-query are verified and ready for Distribution Agent integration.

### 7. Threads

Threads automated publishing was verified on 2026-08-15 KST.

- Threads profile: `@lifetolife_net`
- Meta Developer App: `LifeToLife Distribution`
- Permissions include `threads_basic` and `threads_content_publish`; additional Threads permissions were also granted during testing.
- OAuth callback, deauthorization callback, and data-deletion callback endpoints are hosted by the Cloudflare Worker `lifetolife-threads-callbacks`.
- Custom callback domain: `https://threads-api.lifetolife.net`
- Test publishing used the Threads API host `https://graph.threads.net`.
- Test post text: `LifeToLife Threads auto-publishing test`
- Published Threads Media ID: `18119437411883307`
- Persistence re-query confirmed `media_product_type=THREADS`, `media_type=TEXT_POST`, username `lifetolife_net`, original text, and timestamp `2026-08-14T17:18:36+0000`.
- Permalink: `https://www.threads.com/@lifetolife_net/post/DcB1SBKCZ9f`

Conclusion: Threads automatic text publishing and persistent re-query are verified and ready for Distribution Agent integration.

## Approval pending

### Pinterest

- LifeToLife account is open.
- Pinterest API Trial access has been requested.
- Current state: **Trial access pending**.
- No automated publishing success should be recorded until actual pin creation is verified after approval.

## Distribution infrastructure

### Meta distribution group

The LifeToLife Meta-side distribution path is now operational across all currently targeted Meta publishing surfaces:

- Meta Business Portfolio: `LifeToLife`
- Meta Developer App: `LifeToLife Distribution`
- Facebook Page: `Life to Life` — **Verified**
- Instagram Business account: `@lifetolife_net` — **Verified**
- Threads profile: `@lifetolife_net` — **Verified**
- Threads callbacks hosted on Cloudflare Worker with custom domain `threads-api.lifetolife.net`

Current Meta status: Facebook, Instagram, and Threads are all **Verified** for actual API-created content plus persistent re-query.

### Google Cloud

- Project: `LifeToLife Distribution`
- Project identifier used in setup: `lifetolife-distribution`
- Purpose: Google-side API/OAuth infrastructure for the LifeToLife Distribution Agent
- Relevant APIs already prepared include Blogger API and YouTube Data API v3.
- Blogger Desktop OAuth client `LifeToLife Blogger Publisher` created on 2026-08-14.
- Blogger OAuth scope `https://www.googleapis.com/auth/blogger` added on 2026-08-14.
- Blogger OAuth authorization, authenticated blog discovery, and live API post creation verified on 2026-08-14.
- Blogger verification post deleted after successful validation on 2026-08-14.
- YouTube upload OAuth scope `https://www.googleapis.com/auth/youtube.upload` added on 2026-08-14.
- YouTube read-only OAuth scope `https://www.googleapis.com/auth/youtube.readonly` added on 2026-08-14.
- YouTube OAuth authorization and authenticated channel identity verification completed on 2026-08-14.
- First YouTube `videos.insert` request returned `KW1viXDoxEU`, but the video disappeared immediately afterward; this remains an unresolved anomaly record.
- Second YouTube `videos.insert` test returned `llXXvCyOMiw`; API polling confirmed processed/succeeded, continued API retrieval, and persistent visibility in YouTube Studio.
- YouTube delete-capable OAuth scope `https://www.googleapis.com/auth/youtube.force-ssl` was added during cleanup investigation.

### Account ledger

A separate Google Sheets account ledger is maintained for operational account management:

- `LifeToLife_Global_Distribution_Account_Ledger`

It tracks account/handle, management email, API access state, automation verification, next action, and secret-storage policy. Passwords and token values are intentionally excluded.

## Account-management policy

The default global management account is:

- `jisooyoun.cafe@gmail.com`

Rules:

1. Passwords are stored only in the password manager, never in GitHub or the account ledger.
2. API keys, app passwords, OAuth tokens, and client secrets are stored only in environment variables or a dedicated secret store.
3. Enable 2FA where available and store recovery codes separately from the ledger.
4. Every new channel must be added to both this canonical progress document and the account ledger as soon as it is opened.
5. A channel is marked **Verified** only after an actual automated publish/upload succeeds and the created content persists through platform processing and the intended platform surface.
6. Paused or abandoned channels should remain in the record with status changed rather than being silently removed.

## Current totals

As of 2026-08-15 KST:

- Distribution-facing accounts/channels or management hubs recorded: **9**
- Actual automated publishing verified: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads
- API approval pending: **1** — Pinterest
- Open channels with publishing automation still unverified: **0 among currently opened publishable channels**

## Immediate queue

1. Integrate the verified Meta publishers — Facebook, Instagram, and Threads — into the common LifeToLife Distribution Agent.
2. Move Threads access token handling into environment variables / secret storage; do not store token values in GitHub or the account ledger.
3. Keep Pinterest in approval-wait state; do not spend time repeatedly checking it manually.
4. Keep YouTube verification video `llXXvCyOMiw` private for now as the persistence reference.
5. Keep this document and the Google Sheets account ledger synchronized after every account/API milestone.
