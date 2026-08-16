# LifeToLife Global Distribution Progress

Last updated: 2026-08-16 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Never blind-cross-post the same source text across platforms.**
- Canonical end-to-end publication process: `docs/global-publication-pipeline.md`.
- Canonical platform transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Mandatory search/discovery policy: `docs/global-distribution-search-discovery-policy.md`.
- A publication is not complete when copy is written, a queue file is created, an API call succeeds, or only some channels are posted.
- Full publication state machine:

`SOURCE_FINAL -> TARGETS_DEFINED -> PLATFORM_TRANSFORMED -> DISCOVERY_OPTIMIZED -> MEDIA_READY -> QA_PASSED -> APPROVED_TO_PUBLISH -> DISTRIBUTED -> VERIFIED -> MEASUREMENT_STARTED -> DONE`

- Track **Auto Publish** and **Assisted Manual** separately inside one higher-level Publication.
- Secrets never belong in GitHub or the Google Sheets ledger.
- Every major distribution milestone and top-level policy change must be mirrored here and in `LifeToLife_Global_Distribution_Account_Ledger`.

## Global expansion freeze — 2026-08-15

LifeToLife has reached a sufficient one-person global distribution baseline. **Do not open or integrate additional platforms merely to increase platform count.**

Current usable network:

- **Auto Publish Verified: 8** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- **Assisted Manual: 4** — X, TikTok, Reddit, Snapchat.
- **Practical usable network: 12 channels.**

Existing pending work may finish if already approved by the provider:

- **Pinterest** — Trial API approval pending.
- **Hatena Blog** — account created; blog-opening manual anti-spam review pending; adapter prepared but publishing unverified.

If both pending channels become operational, the practical network can reach **14 channels without opening another platform project**.

Snapchat is a reuse-only short-form distribution channel and remains manual Spotlight unless Snap later confirms Public Profile API allowlisting.

Deferred under the freeze: Dailymotion, OK.ru, Vimeo, Mastodon, Telegram, LINE, LinkedIn, ShareChat/Moj/Kwai and the rest of the candidate roster. China-local platforms remain out of scope unless a separate China expansion project is justified by real demand.

## End-to-end Publication Pipeline — established 2026-08-16

Canonical document: `docs/global-publication-pipeline.md`.

A **Publication** is now the unit of work. One Publication contains:

- canonical source content,
- target manifest,
- platform-native text packages,
- per-platform search/discovery optimization,
- required derived media including short-form video/audio/captions,
- QA state,
- explicit publish approval,
- Auto Publish and Assisted Manual execution,
- provider/manual verification,
- URLs/IDs/UTM data,
- measurement state.

### Hard gate before live queue

A new full-publication job may receive `status = ready` and `approval = publish` only after:

1. source is final;
2. intended targets are declared;
3. every intended target has a platform-native package;
4. every intended target has passed its search/discovery optimization pass;
5. all required media assets are real and ready, or media is explicitly not required by that target manifest;
6. publication QA has passed.

The queue is therefore the **APPROVED_TO_PUBLISH execution boundary**, not a workspace for unfinished drafts.

`distribution/JOB_SCHEMA.md` now documents a higher-level `publication` gate object for all future full-publication jobs. The currently deployed trigger still mechanically checks only schema/status/approval, so the job-generation/QA layer must enforce the new gate until the trigger itself is upgraded and redeployed.

### Definition of DONE

A Publication is `DONE` only when every intended target is either:

- actually published and verified, or
- explicitly `not_applicable` with a reason;

and:

- no intended video/media target remains deferred,
- publication URLs/IDs are recorded,
- measurement has started in the campaign ledger.

## Platform-native + search/discovery distribution rule

Canonical distribution segment:

`source -> platform-native transformation -> search/discovery optimization -> platform-ready package`

Search/discovery optimization is a mandatory stage separate from native rewriting. The agent must account for what each destination indexes, recommends, categorizes or can infer from visible/spoken content.

Current Assisted Manual behavior:

- X: platform-ready copy with natural search terms and a small relevant hashtag set.
- TikTok: real vertical asset + on-screen/spoken search phrase + caption/hashtags/cover/upload package.
- Reddit: search-oriented but self-contained community post with a substantive discussion prompt.
- Snapchat: real vertical asset + visible/spoken topic + description/#Topics for manual Spotlight upload.

## Current automated foundation — 8 Verified adapters

| Channel | Public account / handle | Mode | Current implementation state |
|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Auto Publish | Verified adapter; current campaign path exposed a hardcoded-draft defect |
| Bluesky | `@lifetolife-net.bsky.social` | Auto Publish | Verified + Agent integrated |
| Blogger | LifeToLife / `lifetolife-net` | Auto Publish | Verified + Agent integrated; labels forwarding enhancement pending |
| YouTube | `@lifetolife_net` | Auto Publish | Verified + Agent integrated |
| Facebook | Page `Life to Life` | Auto Publish | Verified + Agent integrated |
| Instagram | `@lifetolife_net` | Auto Publish | Verified + Agent integrated |
| Threads | `@lifetolife_net` | Auto Publish | Verified + Agent integrated |
| Tumblr | `lifetolife-net` | Auto Publish | Verified + Agent integrated + refresh-aware OAuth2 + dedicated tag support |

## Existing pending channels

### Pinterest

- Trial API approval pending.
- Complete only if the existing application is approved.
- Search/discovery rules are already prepared for future Pin packages.

### Hatena Blog

- Hatena account created.
- Blog-opening request submitted for manual anti-spam review on 2026-08-15.
- Prepared wrapper: `workers/distribution-agent/worker-v8-hatena.js`.
- Prepared setup script: `workers/distribution-agent/setup-hatena.sh`.
- Credentials are not connected and publishing remains unverified.
- If approved: connect API key -> non-posting credential verification -> one real entry -> member-URI re-query.
- Future Hatena content must be adapted to Japanese search intent rather than copied from English posts.

## Snapchat status — Assisted Manual

- Snapchat account / Business / Public Profile setup completed.
- Snap Business OAuth App created in Business Manager.
- OAuth callback: `https://snapchat-api.lifetolife.net/oauth/callback`.
- Callback Worker health check succeeded.
- Public Profile verification and Public Profile API allowlisting are separate.
- Public Profile API allowlisting is **not confirmed and must not be recorded as formally submitted/approved**.
- A related inquiry email was sent and support chat attempted transfer, but no receipt/case/allowlist confirmation was received.
- Operational decision: manual Spotlight only until an official allowlist response arrives.

## Automatic distribution trigger — ACTIVE

Components:

- Canonical wrapper: `workers/distribution-agent/worker-v8-trigger.js`.
- Canonical config: `workers/distribution-agent/wrangler.toml`.
- Cloudflare Cron: `*/5 * * * *`.
- Queue: `distribution/queue/*.json`.
- Job schema: `distribution/JOB_SCHEMA.md`.
- Example: `distribution/examples/job-v1.example.json`.
- Deployment helper: `workers/distribution-agent/deploy-trigger.sh`.

Trigger routes:

- `POST /v1/trigger/run`
- `GET /v1/trigger/status?job_id=...`

Current trigger behavior:

1. checks the GitHub queue every five minutes;
2. mechanically executes only `schema = lifetolife.distribution-job.v1`, `status = ready`, `approval = publish`;
3. auto-targets only Facebook, Instagram, Threads, Bluesky, Blogger, WordPress.com, Tumblr and YouTube;
4. never auto-posts X, TikTok, Reddit or Snapchat;
5. stores per-target execution state in SQLite-backed Durable Object storage;
6. treats successful `job_id + target` as immutable;
7. retries failed targets up to the configured limit;
8. processes at most ten queue JSON files per scheduled run.

The new Publication readiness object is documented but **not yet enforced in deployed trigger code**. A trigger upgrade is required before this becomes a technical hard gate rather than an operational hard gate.

## Distribution Agent infrastructure

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Current canonical source entry: `workers/distribution-agent/worker-v8-trigger.js`.
- Base v8 source: `workers/distribution-agent/worker-v8.js`.
- Tumblr publish layer: `workers/distribution-agent/worker-v8-tumblr-publish.js`.
- Tumblr uint64-safe layer: `workers/distribution-agent/worker-v8-tumblr-safe-verify.js`.
- Hatena layer: `workers/distribution-agent/worker-v8-hatena.js` — prepared, unverified.
- Common JSON route: `POST /v1/publish`.
- YouTube multipart route: `POST /v1/publish/youtube`.
- WordPress/Tumblr/trigger state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`.

### Known adapter gaps

1. **WordPress:** current implementation hardcodes `status: draft`. Public status and SEO/taxonomy forwarding require an adapter upgrade.
2. **Blogger:** current adapter publishes title/body but does not yet forward Blogger labels.
3. **Tumblr:** dedicated tag forwarding is already implemented.
4. **Instagram/YouTube/TikTok/Snapchat:** require real media. Search optimization must include the actual visible/spoken content, not metadata alone.

## Search/discovery optimization pass — 2026-08-16

Canonical policy: `docs/global-distribution-search-discovery-policy.md`.

Initial NUNCHI intent cluster:

- primary: `Korean social cues`, `Korean culture`, `learn Korean`;
- contextual: `living in Korea`, `Korean communication`, `Korean etiquette`;
- concept/product: `nunchi`, `nunchi meaning`, `눈치`;
- scenario phrase where relevant: `괜찮아요`.

These are positioning/search-intent hypotheses, not claimed keyword-volume rankings. Actual performance data should change the rules over time.

## Legacy first NUNCHI intro campaign — HOLD

The earlier campaign predates the complete Publication Pipeline.

- Job ID: `nunchi-intro-2026-08-16-01`
- Queue file: `distribution/queue/2026-08-16-nunchi-intro-01.json`
- Original source positioning: generic NUNCHI intro.
- Some targets may already have completed execution under the immutable `job_id + target` history.
- WordPress created Post ID `10` as a draft at `2026-08-16T19:20:54` site time, confirming the hardcoded-draft defect.

On 2026-08-16 the queue file was changed from:

- `status: ready`
- `approval: publish`

to:

- `status: hold`
- `approval: hold`
- `legacy_partial: true`

Reason: **Building NUNCHI #1 is now the canonical source for the first full end-to-end Publication.** Unfinished targets from the legacy package must not keep retrying or create additional pre-pipeline posts. Completed target history remains preserved and must not be duplicated.

The WordPress draft ID 10 is treated as a legacy partial artifact, not as a completed public publication.

## First canonical full Publication source

The first proper full-pipeline source is:

**`Building NUNCHI #1: Can You Turn “Nunchi” Into a Game?`**

This source must now move through the Publication state machine from the beginning:

1. preserve/finalize the readable article as the source of truth;
2. define the intended 12-channel target manifest;
3. create platform-native derivatives;
4. run per-platform search/discovery optimization;
5. derive the real short-form vertical video package including narration/audio/captions;
6. create YouTube Shorts / Instagram Reels / TikTok / Snapchat variants as needed;
7. run QA;
8. only then create the new `ready + publish` queue job;
9. distribute;
10. verify every intended target;
11. register URLs/IDs and start measurement;
12. mark Publication `DONE` only after those conditions are satisfied.

## Measurement tracking

Google Sheets `LifeToLife_Global_Distribution_Account_Ledger` contains a `Campaigns` tab for execution and performance tracking.

The `Rules` tab has been synchronized with:

- the 12-channel operating network,
- mandatory platform-native transformation,
- mandatory search/discovery optimization,
- the full Publication state machine,
- the definition of `DONE`,
- the queue-entry gate.

The legacy first campaign row is now recorded as **HOLD — legacy partial campaign; no further retries**.

## Current totals

As of 2026-08-16 KST:

- **Usable distribution channels: 12** = 8 Auto Publish Verified + 4 Assisted Manual.
- **Existing pending reviews: 2** — Pinterest API Trial approval, Hatena Blog opening review.
- **Potential near-term total without platform expansion: 14**.
- **New-platform expansion: frozen.**
- **Automatic GitHub queue -> Cloudflare Cron trigger: ACTIVE.**
- **Platform-native policy: established.**
- **All-channel search/discovery policy: established.**
- **End-to-end Publication Pipeline: established.**
- **Legacy first NUNCHI intro job: HOLD.**
- **First canonical full Publication source: Building NUNCHI #1.**
- **WordPress public-status/SEO adapter enhancement: pending.**
- **Blogger label forwarding enhancement: pending.**

## Next work

1. Build the first canonical Publication package from `Building NUNCHI #1`.
2. Declare its intended target manifest across the usable network.
3. Produce all platform-native text derivatives.
4. Run the destination-specific search/discovery optimization pass on every intended target.
5. Produce the real short-form vertical media master with narration/audio/captions and derive Shorts/Reels/TikTok/Spotlight variants.
6. Run full publication QA.
7. Upgrade/deploy the WordPress public-status/SEO path and Blogger labels path before claiming those optimizations technically complete.
8. Add technical enforcement of the Publication readiness gate to the trigger so incomplete jobs cannot execute even if accidentally marked `ready + publish`.
9. After explicit approval, create the new queue job and distribute.
10. Verify every Auto Publish and Assisted Manual target, record URLs/IDs, start measurement and only then mark the Publication `DONE`.
11. Complete Pinterest or Hatena only if their existing pending reviews approve.
12. Keep Snapchat manual unless a confirmed official API allowlist response arrives.
