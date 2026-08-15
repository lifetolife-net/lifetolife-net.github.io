# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic official API/MCP/official-protocol automation path.
- Track account creation, API access, standalone verification, and Distribution Agent integration separately.
- A channel is **Verified** only after automated publishing/upload succeeds and the created object remains authoritative and re-readable where the platform permits it.
- Human login/approval steps may remain manual; routine publishing should be handled by the LifeToLife Distribution Agent.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in GitHub or the Google Sheets ledger.
- Every distribution milestone must be mirrored in both this document and `LifeToLife_Global_Distribution_Account_Ledger`.

## Network objective — 2026 canonical freeze

The global rollout target remains **Core 15 + Backup 35 = 50 API-capable platform/channel endpoints**.

The exact historical 50-name roster was not preserved in either the repository or the account ledger. On 2026-08-15 the roster was therefore reconstructed from the original rules and revalidated against current official write/publish APIs and supported protocols.

The new canonical roster is now frozen in:

- `docs/global-distribution-candidates-2026.md`
- Google Sheets `LifeToLife_Global_Distribution_Account_Ledger` -> tab `Candidates 50`

`50` means platform/channel endpoints, not necessarily 50 separate login accounts.

### Core 15

| Strategic rank | Channel | 2026 API path | Current LifeToLife state |
|---:|---|---|---|
| 1 | YouTube | YouTube Data API v3 `videos.insert` | **Verified + Agent integrated** |
| 2 | Facebook Pages | Graph API Page `/feed` | **Verified + Agent integrated** |
| 3 | Instagram Professional | `/media` -> `/media_publish` | **Verified + Agent integrated** |
| 4 | Threads | `/threads` -> `/threads_publish` | **Verified + Agent integrated** |
| 5 | WordPress.com | MCP `posts.create` -> `posts.get` | **Verified + Agent v8 Durable Object auth** |
| 6 | Blogger | `posts.insert` -> `posts.get` | **Verified + Agent integrated** |
| 7 | Bluesky | AT Protocol `createRecord` -> `getRecord` | **Verified + Agent integrated** |
| 8 | Pinterest | API v5 `POST /pins` | **Trial approval pending** |
| 9 | TikTok | Content Posting API Direct Post | API confirmed; public posting gated by app review/audit |
| 10 | LinkedIn | Posts API `POST /rest/posts` | API confirmed; permission/product gating |
| 11 | Reddit | Developer Platform user actions / submit post | API confirmed; developer/platform/community gating |
| 12 | Telegram Channel | Bot API `sendMessage` | API confirmed; unopened |
| 13 | Mastodon | `POST /api/v1/statuses` -> re-query | **Opening started; Agent v8 adapter committed; account/token pending** |
| 14 | Tumblr | Tumblr API v2 create post | API confirmed; unopened |
| 15 | Dailymotion | upload + video create/publish | API confirmed; unopened |

The Core list is strategic. The **activation order is friction-aware**, so Mastodon is being opened before the higher-reach but review-gated Core candidates.

### Backup 35

The canonical backup roster is:

X, Vimeo, Apple News, DEV Community / Forem, Hatena Blog, Ghost / Ghost(Pro), beehiiv, Kit, Buttondown, Mailchimp, MailerLite, Brevo, LINE Official Account, Discord, Slack, Matrix, Lemmy, PeerTube, Misskey, Viber Channels, OK.ru, Flickr, Qiita, Telegraph, Write.as / WriteFreely, Micro.blog, SoundCloud, Podbean, Discourse, ActivityPub self-hosted actor, WebSub + RSS distribution, IndexNow, Nostr relays, GitHub Discussions, and GIPHY.

Detailed API-path/gating notes are in `docs/global-distribution-candidates-2026.md` and the Sheets `Candidates 50` tab.

### Important 2026 exclusions / demotions

- **Medium is excluded**: its official API project states that the API is no longer supported and new integrations are not accepted.
- **X is Backup rather than Core**: official write API access exists, but 2026 access is pay-per-use, so it is not the next best use of zero/low marketing budget.
- Browser-workaround-only channels remain outside the canonical 50.

## Current channel status

| Channel | Public account / handle | Standalone automation | Distribution Agent | Next action |
|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | **Verified** | **Verified + integrated + Durable auth state** | Operate through Agent |
| Pinterest | LifeToLife | **Pending Trial approval** | Not applicable yet | Wait for approval, then verify actual pin creation |
| Bluesky | `@lifetolife-net.bsky.social` | **Verified** | **Verified + integrated** | Operate through Agent; optional domain handle later |
| Blogger | LifeToLife / `lifetolife-net` | **Verified** | **Verified + integrated** | Stabilize Google OAuth lifecycle |
| Facebook | Page `Life to Life` | **Verified** | **Verified + integrated** | Operate through Agent |
| Instagram | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| Threads | `@lifetolife_net` | **Verified** | **Verified + integrated** | Operate through Agent |
| YouTube | `@lifetolife_net` | **Verified** | **Verified + integrated** | Stabilize Google OAuth lifecycle; production upload policy |
| Mastodon | not created yet | Not verified | **Adapter prepared in GitHub v8; not deployed/verified** | Create account + token, deploy v8, live publish + re-query |

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
10. Durable state reported `has_refresh_token=true` and `has_access_token=true`, with bootstrap source `fresh-pkce-seed`.
11. No WordPress post was created by the final auth-state verification.
12. Canonical `workers/distribution-agent/wrangler.toml` points to `worker-v8.js` and binds `WPCOM_AUTH_STATE`; the experimental KV binding is absent from canonical config.

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
- Initial tiny embedded MP4 Agent upload `PjboQXHBHOw` disappeared and is retained only as diagnostic history.
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

## Opening in progress — Mastodon

Mastodon is the next low-friction Core channel.

2026 official path selected:

- create status: `POST /api/v1/statuses`
- authoritative readback: `GET /api/v1/statuses/:id`
- user-token scopes for the LifeToLife adapter: `write:statuses` + `read:statuses`
- optional `Idempotency-Key` is supported by the adapter when supplied by the common request.

Repository work already completed:

- Canonical `worker-v8.js` now contains a Mastodon wrapper adapter around the existing v7/base chain.
- Existing WordPress Durable Object behavior remains intact; `wrangler.toml` still points to `worker-v8.js`.
- The Mastodon adapter is inactive unless `MASTODON_BASE_URL` and `MASTODON_ACCESS_TOKEN` are configured.
- `/health` reports only boolean Mastodon configuration state; it never returns secret values.
- `workers/distribution-agent/setup-mastodon.sh` stores the instance/token as Worker secrets, deploys the Worker, and performs a no-write Agent dry run.

Current boundary:

- No Mastodon account has been recorded yet.
- No Mastodon token is configured in the Worker.
- The updated v8 source has **not** yet been deployed to Cloudflare.
- No Mastodon post has been created or verified.

Therefore Mastodon remains **Opening / Unverified**, not part of the verified-channel count.

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
- Prepared but unverified target in repository source: `mastodon`.

Verified adapter paths:

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification

Prepared path:

- Mastodon: user token -> `POST /api/v1/statuses` -> `GET /api/v1/statuses/:id`

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

- Canonical candidate network: **50 platform/channel candidates — Core 15 + Backup 35**.
- Canonical 50-name roster: **restored/reconstructed and frozen** in GitHub + Sheets.
- Open distribution-facing accounts/channels or management hubs counted by the ledger summary: **9**.
- Additional channel in opening state: **1 — Mastodon** (account not yet created).
- Standalone automated publishing verified: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- Integrated and verified in the common Distribution Agent: **7 channels** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- API approval pending: **1 — Pinterest**.
- Prepared Agent adapter not yet deployed/verified: **1 — Mastodon**.

## Immediate queue

1. **Mastodon:** create the LifeToLife account on the selected instance, create a user token with `read:statuses` + `write:statuses`, run `workers/distribution-agent/setup-mastodon.sh`, then perform exactly one live Agent publish and persistent re-query.
2. If Mastodon verifies, mark it channel **#8 Verified** in both GitHub and Sheets.
3. Open **Telegram Channel** next unless Pinterest approval arrives first.
4. Then proceed through Tumblr and Dailymotion while TikTok, LinkedIn, Reddit, and Pinterest remain parallel gated Core tracks.
5. Keep Google OAuth lifecycle hardening for Blogger/YouTube in parallel where it blocks unattended operation.
6. Add production controls in parallel: content transformation, idempotency, retry/backoff, structured logs, secret rotation, and scheduling.
7. Re-check official API policy again immediately before activating every candidate because platform access rules can change.
