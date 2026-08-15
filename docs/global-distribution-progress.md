# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic API/MCP automation path.
- Track account creation, API access, standalone verification, and Distribution Agent integration separately.
- A channel is **Verified** only after automated publishing/upload succeeds and the created object remains authoritative and re-readable where the platform permits it.
- Human login/approval steps may remain manual; routine publishing should be handled by the LifeToLife Distribution Agent.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in GitHub or the Google Sheets ledger.
- Every distribution milestone must be mirrored in both this document and `LifeToLife_Global_Distribution_Account_Ledger`.

## Network objective

The original global rollout target is **core 15 + backup 35 = 50 API-capable platform/channel candidates**.

- The number `50` refers to platform/channel endpoints in the candidate distribution network, **not necessarily 50 separate login accounts**. A single management identity can control multiple channels, as with the Meta portfolio.
- The currently verified 7 channels are the first completed integration tranche, not the end of channel rollout.
- Continue account/API opening toward the **core 15** first, then validate the **backup 35** in priority order.
- Candidate selection should preserve the original constraints: automation-capable API/MCP path, audience/reach weighting, and regional coverage including South America, Southeast Asia, and India.
- A platform whose current API automation path is uncertain remains a candidate only; do not create an account or use browser-workaround automation until the official automation path is verified.

## Current channel status

| Channel | Public account / handle | Standalone automation | Distribution Agent | Next action |
|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | **Verified** | **Verified + integrated** | Connect persistent refresh-token rotation state |
| Pinterest | LifeToLife | **Pending Trial approval** | Not applicable yet | Wait for approval, then verify actual pin creation |
| Bluesky | `@lifetolife-net.bsky.social` | **Verified** | **Verified + integrated** | Operate through Agent; optional domain handle later |
| Blogger | LifeToLife / `lifetolife-net` | **Verified** | **Verified + integrated** | Stabilize Google OAuth lifecycle |
| Facebook | Page `Life to Life` | **Verified** | **Verified + integrated** | Operate through Agent |
| Instagram | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| Threads | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| YouTube | `@lifetolife_net` | **Verified** | **Verified + integrated** | Stabilize Google OAuth lifecycle; production upload policy |

## Verified channel notes

### WordPress.com

- Site: `lifetolifeglobal.wordpress.com`
- Standalone verification: ChatGPT WordPress.com connector and terminal OAuth 2.1/PKCE/MCP path.
- Distribution Agent path: OAuth 2.1 refresh -> MCP initialize -> `wpcom-mcp-content-authoring/posts.create` as draft -> `posts.get`.
- Agent draft ID: `9`
- Agent title: `LifeToLife Distribution Agent WordPress draft test 2026-08-15T01:50:45Z`
- Re-query confirmed the same ID, `draft` status, title, link, and modified timestamp.
- OAuth response returned `expires_in=3600` and `refresh_token_rotated=true`.

Conclusion: **WordPress.com draft creation through the common Distribution Agent is Verified.** Persistent runtime storage for rotated refresh tokens remains an operational hardening requirement. Current `/health` has reported `wordpress_token_state_bound: false`.

### Bluesky

- Account: `@lifetolife-net.bsky.social`
- DID: `did:plc:smxnvmbrwgxukp3xsw4zbz2j`
- Standalone and Agent authentication: App Password.
- Agent authentication identity was changed from handle to stable DID after Worker-side handle authentication returned `AuthenticationRequired` while local validation succeeded.
- Agent verification record key: `3mt3iwvjicf2d`
- URI: `at://did:plc:smxnvmbrwgxukp3xsw4zbz2j/app.bsky.feed.post/3mt3iwvjicf2d`
- CID: `bafyreicinv7zzlinzj36wad6fkunosoygwuwjugdvoujpii6t64bx2kzra`
- `getRecord` returned the same URI, CID, text, type, and timestamp.

Conclusion: **Bluesky publishing through the common Distribution Agent is Verified.**

### Blogger

- Blog ID: `6980894376000692850`
- URL: `https://lifetolife-net.blogspot.com/`
- Agent path: Google OAuth refresh -> `posts.insert` -> `posts.get`.
- Agent test post ID: `7783253598875718440`
- Persistent re-query returned the same ID, title, URL, published time, and updated time.

Conclusion: **Blogger publishing through the common Distribution Agent is Verified.** Google OAuth lifecycle remains a production-hardening item.

### YouTube

- Channel: `LifeToLife`
- Handle: `@lifetolife_net`
- Channel ID: `UCzB_Os4W_7MiVDpGbXfsqxA`
- API: YouTube Data API v3
- Scopes used: `youtube.upload`, `youtube.readonly`, `youtube.force-ssl`
- Standalone persistent verification video: `llXXvCyOMiw`, which reached `processed/succeeded` and remained retrievable.

Agent integration sequence on 2026-08-15 KST:

1. Initial tiny embedded MP4 upload returned video ID `PjboQXHBHOw`, but repeated `videos.list` re-queries returned no item.
2. v5 changed an empty immediate read from a terminal error into a polling condition and added `/v1/verify/youtube`; `PjboQXHBHOw` still remained absent after 20 reads, ruling out ordinary propagation delay.
3. Before retrying upload, the Worker verified the previous known-good video `llXXvCyOMiw` with the current credentials, confirming channel identity/read access.
4. The retry discarded the tiny embedded sample and generated a normal standard H.264/AAC MP4 with `ffmpeg`.
5. Distribution Agent resumable upload succeeded with video ID `TH1Kr7aK2co`.
6. Upload HTTP status: `200`.
7. Privacy: `private`.
8. `videos.list(part=snippet,status,processingDetails)` confirmed `uploadStatus=processed` and `processingStatus=succeeded`.
9. No other channel was published by the YouTube verification script.

Conclusion: **YouTube private video upload through the common LifeToLife Distribution Agent is Verified.** The failed tiny-MP4 IDs are retained only as diagnostic history and are not considered successful verification objects.

### Facebook

- Page: `Life to Life`
- Page ID: `1179071821966202`
- Working Page Access Token path: direct known Page ID lookup with `?fields=name,access_token`.
- Agent repair post ID: `1179071821966202_122101703007437192`
- Persistent re-query returned the same message and permalink.

Conclusion: **Facebook publishing through the common Distribution Agent is Verified.**

### Instagram

- Business account: `@lifetolife_net`
- Instagram User ID: `17841440001348167`
- Agent container ID: `18083507975333379`
- Published media ID: `18014959226941168`
- Permalink: `https://www.instagram.com/p/DcB4Grcgbu8/`
- Re-query confirmed media type, username, caption persistence, and timestamp.

Conclusion: **Instagram image publishing through the common Distribution Agent is Verified.**

### Threads

- Profile: `@lifetolife_net`
- Callback worker: `https://threads-api.lifetolife.net`
- Agent container ID: `18081252476368456`
- Published media ID: `18065529290746474`
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
- Common JSON route: `POST /v1/publish`
- Backward-compatible Meta route: `POST /v1/publish/meta`
- YouTube multipart upload route: `POST /v1/publish/youtube`
- YouTube verification-only route: `POST /v1/verify/youtube`
- Current deployed mode during final YouTube verification: `verified-path-v5`
- Integrated and verified targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`, `wordpress`, `youtube`

Verified adapter paths:

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 refresh -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification

All provider credentials and the Distribution Agent authorization key are stored outside GitHub and the account ledger.

### Threads callback Worker

- Worker: `lifetolife-threads-callbacks`
- Domain: `https://threads-api.lifetolife.net`
- Purpose: Threads OAuth callback, deauthorization callback, and data-deletion callback.

### Google Cloud

- Project: `LifeToLife Distribution`
- Project identifier: `lifetolife-distribution`
- APIs prepared and verified: Blogger API, YouTube Data API v3.
- Google OAuth long-lived unattended operation remains a production-hardening item for Blogger and YouTube.

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

- Original candidate network target: **50 platform/channel candidates** — **core 15 + backup 35**.
- Distribution-facing accounts/channels or management hubs currently recorded in the ledger: **9**.
- Standalone automated publishing verified: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- Integrated and verified in the common LifeToLife Distribution Agent: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- Verified but not yet Agent-integrated: **0 channels** among the currently opened/verified set.
- API approval pending: **1** — Pinterest.
- The 7-channel integration milestone does **not** complete the 50-candidate rollout.

## Immediate queue

1. Repair and complete persistent WordPress refresh-token rotation state (`TOKEN_STATE`) without creating content.
2. Restore/confirm the canonical **core 15 + backup 35** candidate roster before opening the next account; current repository records contain the 7 completed channels and Pinterest, but not the full original 50-name roster.
3. Continue account creation/API verification until the **core 15** is filled, using official API/MCP paths only.
4. After the core 15, validate the backup 35 in weighted priority order, preserving global regional coverage including South America, Southeast Asia, and India.
5. Keep production hardening in parallel where it blocks unattended operation: Google OAuth lifecycle, idempotency, retry/backoff, structured logs, secret rotation, and scheduling.
6. Keep Pinterest in approval-wait state; do not repeatedly check it manually.
7. Cleanup of verification posts/videos is optional and non-blocking.
8. Keep this document and the Google Sheets account ledger synchronized after every milestone.
