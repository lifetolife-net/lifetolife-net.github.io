# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic official API/MCP automation path.
- Track account creation, API access, standalone verification, and Distribution Agent integration separately.
- A channel is **Verified** only after automated publishing/upload succeeds and the created object remains authoritative and re-readable where the platform permits it.
- Human login/approval steps may remain manual; routine publishing should be handled by the LifeToLife Distribution Agent.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in GitHub or the Google Sheets ledger.
- Every distribution milestone must be mirrored in both this document and `LifeToLife_Global_Distribution_Account_Ledger`.

## Network objective

The original global rollout target is **core 15 + backup 35 = 50 API-capable platform/channel candidates**.

- `50` means platform/channel endpoints, not necessarily 50 separate login accounts.
- The currently verified 7 channels are the first completed integration tranche, not the end of channel rollout.
- Continue toward the **core 15** first, then validate the **backup 35** in weighted priority order.
- Candidate selection preserves audience/reach weighting and regional coverage including South America, Southeast Asia, and India.
- Platforms without a verified official automation path remain candidates only; do not depend on browser-workaround automation.

## Current channel status

| Channel | Public account / handle | Standalone automation | Distribution Agent | Next action |
|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | **Verified** | **Verified + integrated + Durable auth state** | Operate through Agent; no longer blocks expansion |
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
- Standalone verification: ChatGPT WordPress.com connector and independent terminal OAuth 2.1/PKCE/MCP path.
- Common Agent draft verification: post ID `9`, persistent `posts.get` re-query succeeded.
- OAuth 2.1 refresh tokens rotate.

Operational hardening history on 2026-08-15 KST:

1. Workers KV `TOKEN_STATE` was tested for rotated refresh-token persistence and rejected as the ongoing authoritative token store.
2. The canonical architecture was changed to a SQLite-backed Durable Object class `WordPressAuthState`.
3. Earlier refresh experiments invalidated the available bootstrap refresh-token candidates, producing `Invalid or expired refresh token`.
4. A fresh OAuth 2.1 Dynamic Client Registration + PKCE authorization was completed locally.
5. Current non-secret WordPress.com public client ID: `602709`.
6. Fresh access/refresh token state was seeded directly into the Durable Object; secret values were never printed or committed.
7. Final verification returned `durable_object_bound=true`.
8. First and second auth calls both used `durable-object-cache`.
9. `second_call_used_cached_access_token=true`.
10. Durable state reported both `has_refresh_token=true` and `has_access_token=true`, with bootstrap source `fresh-pkce-seed`.
11. No WordPress post was created by the final auth-state verification.
12. Canonical `workers/distribution-agent/wrangler.toml` now points to `worker-v8.js` and binds `WPCOM_AUTH_STATE`; the experimental KV binding is removed from the canonical config.

Conclusion: **WordPress publishing remains Verified, and the v8 Durable Object OAuth state path is Verified. WordPress auth-state hardening no longer blocks distribution-network expansion.**

Detailed notes: `docs/wordpress-automation-progress.md`.

### Bluesky

- Account: `@lifetolife-net.bsky.social`
- DID: `did:plc:smxnvmbrwgxukp3xsw4zbz2j`
- Agent verification record key: `3mt3iwvjicf2d`
- Persistent `getRecord` verification succeeded.

Conclusion: **Bluesky publishing through the common Distribution Agent is Verified.**

### Blogger

- Blog ID: `6980894376000692850`
- URL: `https://lifetolife-net.blogspot.com/`
- Agent test post ID: `7783253598875718440`
- `posts.insert` followed by persistent `posts.get` verification succeeded.

Conclusion: **Blogger publishing through the common Distribution Agent is Verified.** Google OAuth lifecycle remains a production-hardening item.

### YouTube

- Channel: `LifeToLife`
- Handle: `@lifetolife_net`
- Channel ID: `UCzB_Os4W_7MiVDpGbXfsqxA`
- Standalone persistent verification video: `llXXvCyOMiw`.
- Initial tiny embedded MP4 Agent upload `PjboQXHBHOw` disappeared and was retained only as diagnostic history.
- Standard H.264/AAC retry succeeded through the common Agent:
  - Video ID: `TH1Kr7aK2co`
  - Privacy: `private`
  - Upload HTTP status: `200`
  - Upload status: `processed`
  - Processing status: `succeeded`

Conclusion: **YouTube private video upload through the common LifeToLife Distribution Agent is Verified.**

### Facebook

- Page: `Life to Life`
- Page ID: `1179071821966202`
- Agent post ID: `1179071821966202_122101703007437192`
- Persistent re-query succeeded.

Conclusion: **Facebook publishing through the common Distribution Agent is Verified.**

### Instagram

- Business account: `@lifetolife_net`
- Instagram User ID: `17841440001348167`
- Agent container ID: `18083507975333379`
- Published media ID: `18014959226941168`
- Persistent re-query succeeded.

Conclusion: **Instagram image publishing through the common Distribution Agent is Verified.**

### Threads

- Profile: `@lifetolife_net`
- Agent container ID: `18081252476368456`
- Published media ID: `18065529290746474`
- Persistent re-query succeeded.

Conclusion: **Threads text publishing through the common Distribution Agent is Verified.**

## Approval pending

### Pinterest

- LifeToLife account is open.
- Pinterest API Trial access has been requested.
- Current state: **Trial access pending**.
- Do not mark Pinterest Verified until actual pin creation and persistence are confirmed.

## Distribution Agent infrastructure

### Common Worker

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Canonical source: `worker-v8.js`
- Canonical config: `workers/distribution-agent/wrangler.toml`
- Common JSON route: `POST /v1/publish`
- Backward-compatible Meta route: `POST /v1/publish/meta`
- YouTube multipart upload route: `POST /v1/publish/youtube`
- YouTube verification-only route: `POST /v1/verify/youtube`
- WordPress auth-state verification route: `POST /v1/verify/wordpress-auth-state`
- WordPress auth-state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`.
- Integrated and verified targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`, `wordpress`, `youtube`.

Verified adapter paths:

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification

All provider credentials and the Distribution Agent authorization key are stored outside GitHub and the account ledger.

### Threads callback Worker

- Worker: `lifetolife-threads-callbacks`
- Domain: `https://threads-api.lifetolife.net`

### Google Cloud

- Project: `LifeToLife Distribution`
- Project identifier: `lifetolife-distribution`
- APIs prepared and verified: Blogger API, YouTube Data API v3.
- Google OAuth long-lived unattended operation remains a production-hardening item for Blogger and YouTube.

## Account-management policy

Default global management account: `jisooyoun.cafe@gmail.com`.

1. Passwords remain only in the password manager.
2. API keys, app passwords, OAuth tokens, refresh tokens, and client secrets remain only in environment/runtime secret storage.
3. Enable 2FA where available and keep recovery codes separate.
4. Every channel/API milestone must be reflected in both this document and the Google Sheets ledger.
5. Paused or abandoned channels remain in the record with explicit status.

## Current totals

As of 2026-08-15 KST:

- Original candidate network target: **50 platform/channel candidates — core 15 + backup 35**.
- Distribution-facing accounts/channels or management hubs currently recorded in the ledger: **9**.
- Standalone automated publishing verified: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- Integrated and verified in the common Distribution Agent: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- API approval pending: **1** — Pinterest.
- The 7-channel milestone does **not** complete the 50-candidate rollout.

## Immediate queue

1. Restore/confirm the canonical **core 15 + backup 35** candidate roster; the repository does not yet contain the full original 50-name list.
2. Re-verify the current official API/MCP automation path for candidate platforms before account creation because platform APIs and access policies change.
3. Continue account creation/API verification until the **core 15** is filled. The current 7 Verified channels count toward that core set only where they still rank highly after the refreshed comparison.
4. After the core 15, validate the backup 35 in weighted priority order, preserving South America, Southeast Asia, India, and other global reach.
5. Keep Google OAuth lifecycle hardening for Blogger/YouTube in parallel where it blocks unattended operation.
6. Add production controls in parallel: content transformation, idempotency, retry/backoff, structured logs, secret rotation, and scheduling.
7. Keep Pinterest in approval-wait state without repeated manual checking.
8. Keep this document and the Google Sheets account ledger synchronized after every milestone.
