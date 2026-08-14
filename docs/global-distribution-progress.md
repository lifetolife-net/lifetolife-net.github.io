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
| Facebook | Page: `Life to Life` | Open | Connected through Meta Business portfolio | Not yet verified | Verify Meta API publishing path |
| Instagram | Existing LifeToLife promotional account | Business account; connected to LifeToLife portfolio | Meta Business connection complete | Not yet verified | Verify Instagram publishing API path |
| Threads | Profile created from connected Instagram account | Open | Meta / Threads automation path not yet verified | Not yet verified | Verify Threads publishing API path |
| YouTube | `@lifetolife_net` | Open | OAuth/channel identity verified; second `videos.insert` test reached processed/succeeded and remains retrievable by API | **Verification on hold** | Confirm video `llXXvCyOMiw` is still present in YouTube Studio, then restore Verified |

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

Account connection alone is not considered publishing verification. Facebook, Instagram, and Threads remain **automation unverified** until API-created content succeeds and persists.

### YouTube

- Channel title: `LifeToLife`
- Channel handle: `@lifetolife_net`
- Channel ID: `UCzB_Os4W_7MiVDpGbXfsqxA`
- Google Cloud project: `LifeToLife Distribution`
- OAuth scopes configured: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/youtube.force-ssl`
- OAuth authorization for upload/read-only completed successfully with a separate YouTube token file.
- Authenticated channel identity was verified through `channels.list(mine=true)` and matched `LifeToLife / @lifetolife_net`.
- First test: `videos.insert` returned verification video ID `KW1viXDoxEU`, but the user observed that it disappeared immediately after upload. The exact cause remains unresolved.
- Second test: `videos.insert` returned verification video ID `llXXvCyOMiw`.
- Polling through `videos.list(part=status,processingDetails)` reached `status.uploadStatus == processed` and `processingDetails.processingStatus == succeeded`.
- The second test video remained retrievable by API after processing.
- Final verification is intentionally still on hold until the user confirms the same private video remains visible in YouTube Studio, because the first anomaly was observed at the UI/content level.

Verification requirement to restore YouTube to **Verified**:

1. `videos.insert` returns a video ID. **Passed** for `llXXvCyOMiw`.
2. `videos.list` reaches processed/succeeded. **Passed**.
3. The same private video remains retrievable by API after processing. **Passed**.
4. The same private video remains visible in YouTube Studio. **Pending**.
5. Only after step 4 passes should YouTube be restored to **Verified**.

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
- First YouTube `videos.insert` request returned `KW1viXDoxEU`, but the video disappeared immediately afterward.
- Second YouTube `videos.insert` test returned `llXXvCyOMiw`; API polling confirmed processed/succeeded and continued API retrieval.
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
- Actual automated publishing verified: **3 channels** — WordPress.com, Bluesky, Blogger
- API approval pending: **1** — Pinterest
- Open channels with publishing automation still unverified or on hold: Facebook, Instagram, Threads, YouTube

## Immediate queue

1. Confirm YouTube video `llXXvCyOMiw` is still present in YouTube Studio.
2. If present, restore YouTube to **Verified** and record the successful persistent test.
3. Keep Pinterest in approval-wait state; do not spend time repeatedly checking it manually.
4. Then verify the next Meta auto-publishing channel.
5. Keep this document and the Google Sheets account ledger synchronized after every account/API milestone.
