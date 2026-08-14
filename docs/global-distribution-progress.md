# LifeToLife Global Distribution Progress

Last updated: 2026-08-14 (KST)

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
| Instagram | Existing LifeToLife promotional account | Business account; connected to LifeToLife portfolio | Meta Business connection complete | Not yet verified | Verify Instagram publishing API path using the now-working Meta/Page setup |
| Threads | Profile created from connected Instagram account | Open | Meta / Threads automation path not yet verified | Not yet verified | Verify Threads publishing API path after Instagram |
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

## Approval pending

### Pinterest

- LifeToLife account is open.
- Pinterest API Trial access has been requested.
- Current state: **Trial access pending**.
- No automated publishing success should be recorded until actual pin creation is verified after approval.

## Open but automation not yet fully verified

### Meta distribution group

The LifeToLife Meta-side account structure is open:

- Meta Business Portfolio: `LifeToLife`
- Facebook Page: `Life to Life`
- Instagram: existing promotional account converted to Business and connected to the LifeToLife portfolio
- Threads: profile created from the connected Instagram account
- Meta Developer App: `LifeToLife Distribution` created on 2026-08-14
- Facebook use case: `Manage everything on your Page` / page management use case configured
- Graph API Explorer permissions confirmed through `GET /me/permissions`: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, and `public_profile` all returned `granted`
- `GET /me/accounts` still returned an empty `data` array, but this was bypassed successfully using the known Facebook Page ID to request `name,access_token` directly
- Page Access Token identity was confirmed with `GET /me?fields=id,name` as `Life to Life` / `1179071821966202`
- Facebook actual API post creation succeeded and the created post was re-read successfully with its message and permalink intact

Current Meta status: Facebook is **Verified**. Instagram and Threads remain **automation unverified** until their own API-created content succeeds and persists.

## Distribution infrastructure

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

As of 2026-08-14:

- Distribution-facing accounts/channels or management hubs recorded: **9**
- Actual automated publishing verified: **5 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook
- API approval pending: **1** — Pinterest
- Open channels with publishing automation still unverified: Instagram, Threads

## Immediate queue

1. Keep YouTube verification video `llXXvCyOMiw` private for now as the persistence reference.
2. Keep Pinterest in approval-wait state; do not spend time repeatedly checking it manually.
3. Clean up the Facebook verification post after the successful persistence check if desired; retain the post ID in this record.
4. Verify Instagram auto-publishing next using the existing Meta setup, then verify Threads.
5. Continue integrating each successfully verified publisher into the common LifeToLife Distribution Agent.
6. Keep this document and the Google Sheets account ledger synchronized after every account/API milestone.
