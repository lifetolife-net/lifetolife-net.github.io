# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Top-level rule: never blind-cross-post the same source text across platforms.** Every distribution run must transform source content into a platform-native distribution package before publish or hand-off.
- Canonical transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Track **Auto Publish** and **Assisted Manual** channels separately.
- `Auto Publish`: the Distribution Agent performs platform-native transformation, final provider API publish/upload, and verification where possible.
- `Assisted Manual`: the Agent prepares the complete platform-native package; the human performs only the final publish action.
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
- **Hatena Blog** — account exists; blog-opening manual review pending. Distribution Agent adapter is prepared but not deployed.

If both pending channels become operational, the practical network can reach **13 channels without opening any new platform project**.

### What is now deferred

- Dailymotion — API capability confirmed, but no activation under the expansion freeze.
- OK.ru — API capability confirmed, but Russia/CIS expansion is not required for the current baseline.
- Vimeo, Mastodon, Telegram, LINE, LinkedIn and the remaining candidate roster stay research/backup only.
- India- or Latin-America-specific services such as ShareChat/Moj/Kwai are not opened merely for geographic completeness; the current global platforms already provide substantial reach in those regions.

### China decision

**China-local platform expansion is intentionally out of scope for this phase.**

China is a meaningful separate ecosystem, but entering it is not treated as a missing checkbox in a generic global distribution plan. Current official developer onboarding for major Chinese platforms involves substantially more platform-specific qualification and review than the existing LifeToLife network. For example, Douyin's current open-platform onboarding is institution-oriented and states that individual developer admission is not currently open; Kuaishou's developer onboarding requires qualification review including enterprise, legal-representative and administrator information. Both platforms expose content publishing APIs, so the limitation is not technical feasibility but the additional operating/compliance layer.

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
- The Hatena wrapper has **not** been deployed to production.
- If the blog-opening review is approved, connect the blog API key, run non-posting credential verification, then create one real test entry and re-query the returned member URI.

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
- Latest deployed Version ID: `42bd43fb-f786-4d25-82eb-8895490f0cd9`
- Base v8 source: `workers/distribution-agent/worker-v8.js`
- Tumblr publish layer: `workers/distribution-agent/worker-v8-tumblr-publish.js`
- Tumblr uint64-safe layer: `workers/distribution-agent/worker-v8-tumblr-safe-verify.js`
- Prepared Hatena source entry: `workers/distribution-agent/worker-v8-hatena.js` (**not deployed**)
- Canonical config: `workers/distribution-agent/wrangler.toml`
- Common JSON route: `POST /v1/publish`
- YouTube multipart route: `POST /v1/publish/youtube`
- WordPress/Tumblr auth-state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`
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

## Next work

1. Operate and harden the existing 11-channel distribution workflow.
2. Complete Pinterest only if its existing Trial application is approved.
3. Complete Hatena only if its existing blog-opening review is approved.
4. Do **not** open Dailymotion, OK.ru, China-local platforms, or other new endpoints unless future evidence shows a clear distribution need.
5. Shift effort from platform-count expansion to actual content distribution, measurement, discovery, conversion and monetization.
