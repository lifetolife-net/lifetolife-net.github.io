# LifeToLife Global Distribution Progress

Last updated: 2026-08-16 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Never blind-cross-post the same source text across platforms.** Every distribution run must transform source content into a platform-native distribution package before publish or hand-off.
- Canonical transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Mandatory search/discovery policy: `docs/global-distribution-search-discovery-policy.md`.
- Canonical flow: `source -> platform-native transformation -> search/discovery optimization -> package -> publish/hand-off -> verification -> measurement`.
- Track **Auto Publish** and **Assisted Manual** separately.
- A channel is **Verified** only after an automated publish/upload succeeds and remains authoritative/re-readable where the provider permits it.
- Secrets never belong in GitHub or the Google Sheets ledger.
- Every distribution milestone and top-level policy change must be mirrored here and in `LifeToLife_Global_Distribution_Account_Ledger`.

## Global expansion freeze — 2026-08-15

LifeToLife has reached a sufficient one-person global distribution baseline. **Do not open or integrate additional platforms merely to increase platform count.**

Current usable network:

- **Auto Publish Verified: 8** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- **Assisted Manual: 4** — X, TikTok, Reddit, Snapchat.
- **Practical usable network: 12 channels.**

Existing pending work may finish if already-approved by the provider:

- **Pinterest** — Trial API approval pending.
- **Hatena Blog** — account created; blog-opening manual anti-spam review pending; adapter prepared but publishing unverified.

If both pending channels become operational, the practical network can reach **14 channels without opening any additional platform project**.

Snapchat was added after the freeze as a reuse-only short-form distribution channel. It is **not** an active automation project: Spotlight posting is manual unless Snap later confirms Public Profile API allowlisting.

Deferred under the freeze: Dailymotion, OK.ru, Vimeo, Mastodon, Telegram, LINE, LinkedIn, ShareChat/Moj/Kwai and the rest of the candidate roster. China-local platforms are intentionally out of scope for this phase and should be reopened only as a separate China expansion project if real demand appears.

## Platform-native + search/discovery distribution rule

Canonical flow:

`source content -> platform-native transformation -> search/discovery optimization -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

Current Assisted Manual packages / hand-offs:

- X: platform-ready copy with natural search terms and no more than two relevant hashtags as a house rule.
- TikTok: real vertical asset + on-screen/spoken search phrase + caption/hashtags/cover/upload package.
- Reddit: search-oriented but self-contained community post with a substantive discussion prompt.
- Snapchat: real vertical asset + visible/spoken topic + description/#Topics for manual Spotlight upload; no auto-publish claim.

Search/discovery optimization is now a mandatory gate. Platform-native wording alone is not enough. The agent must also account for what the destination actually indexes, recommends, categorizes or can infer from the visible/spoken media.

## Current automated foundation — 8 Verified

| Channel | Public account / handle | Mode | State |
|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Auto Publish | **Verified adapter, but current campaign path exposes a draft-status defect** |
| Bluesky | `@lifetolife-net.bsky.social` | Auto Publish | **Verified + Agent integrated** |
| Blogger | LifeToLife / `lifetolife-net` | Auto Publish | **Verified + Agent integrated; labels forwarding enhancement pending** |
| YouTube | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Facebook | Page `Life to Life` | Auto Publish | **Verified + Agent integrated** |
| Instagram | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Threads | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Tumblr | `lifetolife-net` | Auto Publish | **Verified + Agent integrated + refresh-aware OAuth2 + tag field support** |

## Existing pending channels

### Pinterest

- Trial API approval pending.
- Complete only if the existing application is approved.
- Search/discovery policy is already prepared so an approved Pin should use keyword-natural title/description/topic metadata rather than generic reposting.

### Hatena Blog

- Hatena account created.
- Blog-opening request submitted for manual anti-spam review on 2026-08-15.
- Prepared source wrapper: `workers/distribution-agent/worker-v8-hatena.js`.
- Prepared setup script: `workers/distribution-agent/setup-hatena.sh`.
- Credentials are not connected and publishing remains unverified.
- If approved: connect API key -> non-posting credential verification -> one real test entry -> member-URI re-query.
- Search/discovery policy requires Japanese-web intent adaptation rather than an English duplicate article.

## Snapchat status — Assisted Manual

- Snapchat account / Business / Public Profile setup completed.
- Snap Business OAuth App created in Business Manager; do not substitute a Developer Portal app for Public Profile API use.
- OAuth callback: `https://snapchat-api.lifetolife.net/oauth/callback`.
- Callback Worker health check succeeded at `https://snapchat-api.lifetolife.net/health`.
- Public Profile verification was requested separately; it is **not** the same as Public Profile API allowlisting.
- Public Profile API allowlisting is **not confirmed and must not be recorded as formally submitted/approved**.
- A Public Profile API-related inquiry email was sent and support chat attempted transfer to an account specialist, but no receipt, case number, or allowlist confirmation was received.
- Operational decision: use manual Spotlight posting. Resume API automation only if Snap later provides an official allowlist response or confirmed support case.
- Client Secret must never be recorded in this repository or the account ledger.

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
3. Jobs must already contain platform-native and search/discovery-optimized packages. The trigger is an execution boundary, not a generic transformer.
4. Automatic targets are limited to the eight Verified channels: Facebook, Instagram, Threads, Bluesky, Blogger, WordPress.com, Tumblr, YouTube.
5. X, TikTok, Reddit and Snapchat packages may live under `assisted_manual` but are never auto-posted.
6. Per-target execution state is stored in the existing SQLite-backed Durable Object namespace.
7. A successful `job_id + target` is immutable: editing the queue file cannot republish it. Intentional republication requires a new `job_id`.
8. Failed targets may retry while successful targets are skipped.
9. Maximum ten queue JSON files per scheduled run.
10. Queue files must contain no secrets.

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

- Facebook: Page `/feed` -> re-query.
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query.
- Threads: `/threads` -> `/threads_publish` -> re-query.
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`; **current adapter does not yet forward Blogger labels**.
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`.
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> `posts.create` -> `posts.get`; **current implementation hardcodes `status: draft` and therefore requires an upgrade for public campaign search exposure**.
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification.
- Tumblr: OAuth2 `offline_access` -> refresh-aware NPF create -> authenticated re-query with uint64-safe verification; dedicated `tumblr_tags` supported.

## Search/discovery optimization pass — 2026-08-16

A full platform policy pass was completed against the current usable network.

Canonical policy: `docs/global-distribution-search-discovery-policy.md`.

The initial NUNCHI intent cluster is deliberately small and natural:

- primary: `Korean social cues`, `Korean culture`, `learn Korean`;
- contextual: `living in Korea`, `Korean communication`, `Korean etiquette`;
- concept/product: `nunchi`, `nunchi meaning`, `눈치`;
- scenario phrase where relevant: `괜찮아요`.

These are positioning/search-intent hypotheses, not claimed keyword-volume rankings.

The first job was revised **without changing its job ID**, preserving deduplication. Any already-completed target remains immutable and cannot be duplicated by the revision.

Implemented in the revised package:

- Facebook/Threads: natural search-topic wording near the opening, self-contained value before link.
- Bluesky: exact topic wording plus two precise searchable hashtags.
- Blogger: search-oriented title/body and planned labels.
- WordPress: planned public status, descriptive slug, excerpt/SEO title/SEO description and five focused tags.
- Tumblr: search-oriented body plus seven dedicated, front-loaded tags and source URL.
- X: natural keyword wording plus two relevant hashtags.
- Reddit: searchable title, substantial body and a specific discussion prompt.
- TikTok/Snapchat: search-ready vertical-media packages prepared, awaiting a real asset.
- Instagram/YouTube: search-ready media/title/caption/video-topic plans stored as deferred packages; no placeholder asset is used.

## First real marketing distribution — NUNCHI intro — 2026-08-16

- Job ID: `nunchi-intro-2026-08-16-01`
- Queue file: `distribution/queue/2026-08-16-nunchi-intro-01.json`
- Source: `https://nunchi.lifetolife.net/`
- Campaign: `nunchi_intro_20260816`
- Objective: introduce NUNCHI as a choice-based Korean social-context game and establish the first measurable distribution baseline.
- Auto Publish packages: Facebook, Threads, Bluesky, Blogger, WordPress.com, Tumblr.
- Assisted Manual packages now prepared: X, Reddit, TikTok and Snapchat; the latter two await real vertical media.
- Instagram and YouTube remain deferred until a real original media asset exists.
- Every destination package now has a destination-specific search/discovery plan and UTM where outbound linking is appropriate.

### WordPress execution finding

The queue did execute the WordPress target. A direct WordPress.com read found:

- Post ID: `10`
- title: `NUNCHI: The Meaning Between the Words`
- status: **draft**
- site timestamp: `2026-08-16T19:20:54`

This confirms the current hardcoded-draft adapter behavior affected the real campaign. The post is not being counted as a publicly searchable publication. It must be updated with the optimized title/body/slug/excerpt/taxonomy and explicitly published before WordPress search optimization can be considered complete.

No duplicate WordPress post should be created for this campaign; update Post ID 10 instead.

### Technical gaps found by the optimization pass

1. **WordPress:** existing adapter hardcodes draft. Public status and SEO/taxonomy forwarding must be added to the production adapter; current Post ID 10 should be updated rather than duplicated.
2. **Blogger:** API supports labels, but the current LifeToLife adapter does not forward them. Title/body optimization remains useful, but full technical label optimization is not yet claimable.
3. **Tumblr:** dedicated tag forwarding is already implemented and can be used immediately.
4. **Media channels:** Instagram/YouTube/TikTok/Snapchat need a real media asset. Search optimization must include visible/spoken content, not metadata alone.

## Measurement tracking

Google Sheets `LifeToLife_Global_Distribution_Account_Ledger` now contains a `Campaigns` tab. The first campaign row is updated to record the search/discovery pass, WordPress draft finding, UTM measurement plan and adapter gaps.

The `Rules` tab has also been synchronized to:

- reflect 12 usable channels and Snapchat Assisted Manual status;
- require a search/recommendation optimization pass after platform-native transformation;
- require technical verification that metadata was actually forwarded and the created object is public/indexable before claiming search optimization complete.

## Current totals

As of 2026-08-16 KST:

- **Usable distribution channels: 12** = 8 Auto Publish Verified + 4 Assisted Manual.
- **Existing pending reviews: 2** — Pinterest API Trial approval, Hatena Blog opening review.
- **Potential near-term total without additional platform expansion: 14**.
- **Snapchat API status: unresolved / no confirmed allowlist submission; manual Spotlight only.**
- **New-platform expansion: frozen.**
- **China-local expansion: intentionally out of scope.**
- **Automatic GitHub queue -> Cloudflare Cron trigger: ACTIVE.**
- **All-channel search/discovery policy: established.**
- **First campaign queue revision: search/discovery optimized without changing job ID.**
- **WordPress first-campaign publication: NOT complete — Post ID 10 is draft.**
- **Blogger label forwarding: adapter enhancement pending.**

## Next work

1. Update WordPress Post ID 10 with the optimized title/body/slug/excerpt/tags and explicitly publish it; do not create a duplicate.
2. Enhance and deploy WordPress adapter support for explicit approved public status and search metadata, then verify a future campaign end-to-end.
3. Enhance and deploy Blogger label forwarding, then verify labels on a real future post.
4. Audit provider/Durable Object results for the other first-job targets and record canonical links/IDs without republishing completed targets.
5. Create one real original vertical NUNCHI asset and distribute it through Instagram, YouTube, TikTok and Snapchat using the prepared search/discovery packages.
6. Publish the prepared X and Reddit Assisted Manual packages when appropriate and record their URLs.
7. Begin measurement by destination-specific UTM traffic, search/referral reach, engagement and downstream play behavior; revise rules from actual data.
8. Complete Pinterest or Hatena only if their existing pending reviews approve.
9. Keep Snapchat manual; only resume Public Profile API integration if Snap later provides a confirmed allowlist/support response.
