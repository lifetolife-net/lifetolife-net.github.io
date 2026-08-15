# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Never blind-cross-post the same source text across platforms.** Every distribution run must transform source content into a platform-native distribution package before publish or hand-off.
- Canonical transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Track **Auto Publish** and **Assisted Manual** separately.
- A channel is **Verified** only after an automated publish/upload succeeds and remains authoritative/re-readable where the provider permits it.
- Secrets never belong in GitHub or the Google Sheets ledger.
- Every distribution milestone and top-level policy change must be mirrored here and in `LifeToLife_Global_Distribution_Account_Ledger`.

## Global expansion freeze — 2026-08-15

LifeToLife has reached a sufficient one-person global distribution baseline. **Do not open or integrate additional platforms merely to increase platform count.**

Current usable network:

- **Auto Publish Verified: 8** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- **Assisted Manual: 3** — X, TikTok, Reddit.
- **Practical usable network: 11 channels.**

Existing pending work may finish if already-approved by the provider:

- **Pinterest** — Trial API approval pending.
- **Hatena Blog** — account created; blog-opening manual anti-spam review pending; adapter prepared but publishing unverified.

If both pending channels become operational, the practical network can reach **13 channels without opening any new platform project**.

Deferred under the freeze: Dailymotion, OK.ru, Vimeo, Mastodon, Telegram, LINE, LinkedIn, ShareChat/Moj/Kwai and the rest of the candidate roster. China-local platforms are intentionally out of scope for this phase and should be reopened only as a separate China expansion project if real demand appears.

## Platform-native distribution rule

Canonical flow:

`source content -> platform-native transformation -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

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
- Complete only if the existing application is approved.

### Hatena Blog

- Hatena account created.
- Blog-opening request submitted for manual anti-spam review on 2026-08-15.
- Prepared source wrapper: `workers/distribution-agent/worker-v8-hatena.js`.
- Prepared setup script: `workers/distribution-agent/setup-hatena.sh`.
- Credentials are not connected and publishing remains unverified.
- If approved: connect API key -> non-posting credential verification -> one real test entry -> member-URI re-query.

## Automatic distribution trigger — ACTIVE

The automatic execution layer was deployed on 2026-08-15.

Components:

- Canonical wrapper: `workers/distribution-agent/worker-v8-trigger.js`.
- Canonical config: `workers/distribution-agent/wrangler.toml`.
- Cloudflare Cron: `*/5 * * * *` (every five minutes, UTC scheduler).
- Queue: `distribution/queue/*.json`.
- Job schema: `distribution/JOB_SCHEMA.md`.
- Example: `distribution/examples/job-v1.example.json`.
- Deployment helper: `workers/distribution-agent/deploy-trigger.sh`.

Live `/health` returned the trigger routes after deployment, confirming the trigger wrapper is active:

- `trigger_run_route`: `/v1/trigger/run`
- `trigger_status_route`: `/v1/trigger/status?job_id=...`
- canonical code additionally reports `distribution_trigger: github-queue-cron-v1`.

The exact new Cloudflare Version ID was not captured in the chat transcript; the previous pre-trigger Version ID was `42bd43fb-f786-4d25-82eb-8895490f0cd9` and must not be treated as the current trigger-build ID.

### Trigger behavior and safety

1. Every five minutes the scheduled handler checks the GitHub queue.
2. Only `schema = lifetolife.distribution-job.v1`, `status = ready`, `approval = publish` jobs execute.
3. Jobs must already contain platform-native packages. The trigger is an execution boundary, not a generic cross-posting transformer.
4. Automatic targets are limited to the eight Verified channels: Facebook, Instagram, Threads, Bluesky, Blogger, WordPress.com, Tumblr, YouTube.
5. X, TikTok and Reddit packages may live under `assisted_manual` but are never auto-posted.
6. Per-target execution state is stored in the existing SQLite-backed Durable Object namespace.
7. A successful `job_id + target` is immutable: editing the queue file cannot republish it. Intentional republication requires a new `job_id`.
8. Failed targets may retry while successful targets are skipped.
9. Maximum ten queue JSON files per scheduled run.
10. Queue files must contain no secrets.

Immediately after trigger deployment, the queue contained only `distribution/queue/README.md` and **zero runnable JSON jobs**, so deployment itself created no post.

## Distribution Agent infrastructure

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Current canonical source entry: `workers/distribution-agent/worker-v8-trigger.js` — **deployed / active**.
- Base v8 source: `workers/distribution-agent/worker-v8.js`.
- Tumblr publish layer: `workers/distribution-agent/worker-v8-tumblr-publish.js`.
- Tumblr uint64-safe layer: `workers/distribution-agent/worker-v8-tumblr-safe-verify.js`.
- Hatena layer: `workers/distribution-agent/worker-v8-hatena.js` — prepared, unverified.
- Common JSON route: `POST /v1/publish`.
- YouTube multipart route: `POST /v1/publish/youtube`.
- Trigger run route: `POST /v1/trigger/run`.
- Trigger state route: `GET /v1/trigger/status?job_id=...`.
- WordPress/Tumblr/trigger state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`.

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
- **Existing pending reviews: 2** — Pinterest API Trial approval, Hatena Blog opening review.
- **Potential near-term total without new expansion: 13**.
- **New-platform expansion: frozen.**
- **China-local expansion: intentionally out of scope.**
- **Automatic GitHub queue -> Cloudflare Cron trigger: ACTIVE.**

## Next work

1. Use the first real approved content as the first end-to-end queue execution; do not create meaningless public test posts merely for trigger testing.
2. For every approved item, prepare distinct platform-native packages and commit a `ready + publish` queue job.
3. Verify the first real job's per-target Durable Object status and deduplication.
4. Complete Pinterest or Hatena only if their existing pending reviews approve.
5. Shift effort from platform-count expansion to actual distribution, measurement, discovery, conversion and monetization.
