# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Top-level rule: never blind-cross-post the same source text across platforms.** Every distribution run must transform source content into a platform-native distribution package before publish or hand-off.
- Canonical transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Track **Auto Publish** and **Assisted Manual** channels separately.
- `Auto Publish`: the Distribution Agent performs platform-native transformation, final provider API publish/upload, and verification where possible.
- `Assisted Manual`: the Agent prepares the complete platform-native package, but the human performs only the final publish action.
- A channel is **Verified** only after an automated publish/upload succeeds and remains authoritative/re-readable where the platform permits it.
- Secrets never belong in GitHub or the Google Sheets ledger.
- Every distribution milestone and top-level operating-policy change must be mirrored here and in `LifeToLife_Global_Distribution_Account_Ledger`.

## Global expansion freeze — 2026-08-15

LifeToLife has reached a sufficient one-person global distribution baseline. **Do not open or integrate additional platforms merely to increase the platform count.**

Current usable network:

- **Auto Publish Verified: 8**
  - WordPress.com
  - Bluesky
  - Blogger
  - YouTube
  - Facebook
  - Instagram
  - Threads
  - Tumblr
- **Assisted Manual: 3**
  - X
  - TikTok
  - Reddit

Therefore the current practical distribution network is **11 usable publishing channels**.

Existing pending work may finish if the provider approves it:

- **Pinterest** — Trial API approval pending.
- **Hatena Blog** — account exists; blog-opening manual review pending. Distribution Agent adapter is prepared but not yet verified.

If both pending channels become operational, the practical network can reach **13 channels without opening any new platform project**.

### What is now deferred

- Dailymotion — API capability confirmed, but no activation under the expansion freeze.
- OK.ru — API capability confirmed, but Russia/CIS expansion is not required for the current baseline.
- Vimeo, Mastodon, Telegram, LINE, LinkedIn and the remaining candidate roster stay research/backup only.
- India- or Latin-America-specific services such as ShareChat/Moj/Kwai are not opened merely for geographic completeness; the current global platforms already provide substantial reach in those regions.

### China decision

**China-local platform expansion is intentionally out of scope for this phase.**

China is a meaningful separate ecosystem, but entering it is not treated as a missing checkbox in a generic global distribution plan. Current official developer onboarding for major Chinese platforms involves substantially more platform-specific qualification and review than the existing LifeToLife network. Douyin and Kuaishou both expose publishing APIs, but the additional developer/business qualification and review layer makes China a separate future expansion project rather than part of the current baseline.

Reopen China only if there is evidence of real Chinese-market demand or a suitable local/organizational operating path. Until then, no Douyin, Kuaishou, WeChat, Weibo, Xiaohongshu or Bilibili expansion work is required.

## Platform-native distribution rule

Canonical flow:

`source content -> platform-native transformation -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

Each destination must be adapted for its own discovery and presentation mechanics, including where relevant title/hook, length, post/thread structure, tags/hashtags, search phrasing, link use, CTA, image/video selection, aspect ratio/duration/cover, accessibility metadata, AI-content disclosure, community context, and provider policy constraints.

Current Assisted Manual packages:

- X: `x_ready_draft`
- TikTok: platform-ready asset/caption/hashtag/cover/upload package
- Reddit: `reddit_ready_post` for the owned subreddit

## Current automated foundation — 8 Verified

| Channel | Public account / handle | Mode | State |
|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Auto Publish | **Verified + Agent integrated + Durable auth state** |
| Bluesky | `@lifetolife-net.bsky.social` | Auto Publish | **Verified + Agent integrated** |
| Blogger | LifeToLife / `lifetolife-net` | Auto Publish | **Verified + Agent integrated** |
| YouTube | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Facebook | Page `Life to Life` | Auto Publish | **Verified + Agent integrated** |
| Instagram | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Threads | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Tumblr | `lifetolife-net` | Auto Publish | **Verified + Agent integrated + refresh-aware OAuth2** |

## Existing pending channels

### Pinterest

- Trial API approval pending.
- Do not perform additional expansion work while waiting.
- If approval arrives, complete the already-planned integration and verification.

### Hatena Blog

- Hatena account created.
- Blog creation was diverted to manual anti-spam review; opening request submitted on 2026-08-15.
- Provider response is expected after review.
- Prepared source wrapper: `workers/distribution-agent/worker-v8-hatena.js`.
- Prepared setup script: `workers/distribution-agent/setup-hatena.sh`.
- Hatena credentials are not connected and Hatena publishing remains unverified.
- If the blog-opening review is approved, connect the blog API key, run non-posting credential verification, then create one real test entry and re-query the returned member URI.

## Automatic distribution trigger — source prepared, production deploy pending

The next stage is no longer platform expansion. It is automatic execution of approved distribution jobs.

Prepared components:

- Canonical trigger wrapper: `workers/distribution-agent/worker-v8-trigger.js`.
- Canonical config now points to `worker-v8-trigger.js`.
- Cloudflare Cron configured in `wrangler.toml`: `*/5 * * * *` (UTC).
- Queue: `distribution/queue/*.json`.
- Job schema: `distribution/JOB_SCHEMA.md`.
- Safe example: `distribution/examples/job-v1.example.json`.
- Safe deployment helper: `workers/distribution-agent/deploy-trigger.sh`.

Trigger behavior:

1. Every five minutes the scheduled handler reads the public GitHub queue.
2. Only jobs with `schema = lifetolife.distribution-job.v1`, `status = ready`, and `approval = publish` are executable.
3. Queue jobs must already contain **platform-native packages per destination**. The trigger is an execution boundary, not a blind cross-posting transformer.
4. Current automatic targets are the eight Verified channels only: Facebook, Instagram, Threads, Bluesky, Blogger, WordPress.com, Tumblr, YouTube.
5. X, TikTok, and Reddit packages may be stored in the same job as `assisted_manual`, but the trigger never posts them automatically.
6. Per-target execution state is stored in the existing SQLite-backed Durable Object namespace.
7. Once a `job_id + target` succeeds, later edits to that queue file cannot republish it. Intentional republication requires a new `job_id`.
8. Failed targets may retry, while already-successful targets are skipped.
9. The trigger processes at most ten queue JSON files per scheduled run.
10. Queue files must never contain secrets.

The queue currently contains **no runnable JSON job**. Therefore deploying the trigger wrapper does not itself create any post.

### Trigger deployment state

- Source: **prepared and committed**.
- `wrangler.toml`: **updated to trigger wrapper + 5-minute Cron**.
- Production Worker: **not yet redeployed with this trigger build**.
- Current live Version ID therefore remains `42bd43fb-f786-4d25-82eb-8895490f0cd9` until the deployment step is executed.
- After deployment, `/health` should report `distribution_trigger: github-queue-cron-v1`.
- Authenticated manual execution route: `POST /v1/trigger/run`.
- Authenticated job-state route: `GET /v1/trigger/status?job_id=...`.

## Tumblr verification — 2026-08-15

Tumblr is the eighth fully verified Auto Publish target.

- OAuth2 authorization-code flow completed with scopes `basic write offline_access`.
- Durable Object retains access and refresh token state; secret values are never returned.
- NPF post creation and authenticated post re-query succeeded.
- Verified test post ID: `825010270001856512`.
- Verified permalink: `https://www.tumblr.com/blog/view/lifetolife-net/825010270001856512`.
- Tumblr post IDs are unsigned 64-bit integers; the canonical verification layer avoids JavaScript numeric precision errors and treats successful authenticated GET-by-exact-created-ID as verification proof.

## Distribution Agent infrastructure

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Latest deployed Version ID: `42bd43fb-f786-4d25-82eb-8895490f0cd9` (**pre-trigger deployment**)
- Base v8 source: `workers/distribution-agent/worker-v8.js`
- Tumblr publish layer: `workers/distribution-agent/worker-v8-tumblr-publish.js`
- Tumblr uint64-safe layer: `workers/distribution-agent/worker-v8-tumblr-safe-verify.js`
- Hatena layer: `workers/distribution-agent/worker-v8-hatena.js` (prepared, unverified)
- Current canonical source entry: `workers/distribution-agent/worker-v8-trigger.js` (**prepared, deploy pending**)
- Canonical config: `workers/distribution-agent/wrangler.toml`
- Common JSON route: `POST /v1/publish`
- YouTube multipart route: `POST /v1/publish/youtube`
- Trigger run route after deployment: `POST /v1/trigger/run`
- Trigger state route after deployment: `GET /v1/trigger/status?job_id=...`
- WordPress/Tumblr/trigger state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`
- Integrated and verified targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`, `wordpress`, `youtube`, `tumblr`

### Verified adapter paths

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification
- Tumblr: OAuth2 `offline_access` -> refresh-aware NPF create -> authenticated re-query with uint64-safe verification

## Current totals

As of 2026-08-15 KST:

- **Usable distribution channels: 11** = 8 Auto Publish Verified + 3 Assisted Manual.
- **Auto Publish Verified: 8** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- **Assisted Manual: 3** — X, TikTok, Reddit.
- **Existing pending reviews: 2** — Pinterest API Trial approval, Hatena Blog opening review.
- **Potential near-term total without new expansion: 13** if both pending channels become operational.
- **New-platform expansion: frozen.**
- **China-local platform expansion: intentionally out of scope.**
- **Automatic queue trigger: source/config prepared; production deployment pending.**

## Next work

1. Deploy the prepared trigger wrapper and confirm `/health` reports the trigger metadata. No runnable queue job exists, so this deployment is non-posting.
2. Create one deliberately safe first queue job and verify automatic execution + Durable Object deduplication.
3. Thereafter, when content is approved, ChatGPT/Distribution Agent prepares per-platform native packages and commits a `ready + publish` queue job; the Cron trigger performs the eight-channel automatic execution where that content type has a valid package.
4. Complete Pinterest only if its existing Trial application is approved.
5. Complete Hatena only if its existing blog-opening review is approved.
6. Do **not** open Dailymotion, OK.ru, China-local platforms, or other new endpoints unless future evidence shows a clear distribution need.
7. Shift effort from platform-count expansion to actual content distribution, measurement, discovery, conversion and monetization.
