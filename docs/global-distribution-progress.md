# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- **Top-level rule: never blind-cross-post the same source text across platforms.** Every distribution run must transform source content into a platform-native distribution package before publish or hand-off.
- Canonical transformation policy: `docs/global-distribution-platform-native-policy.md`.
- Track **Auto Publish** and **Assisted Manual** channels separately.
- `Auto Publish`: the Distribution Agent performs platform-native transformation, final provider API publish/upload, and verification where possible.
- `Assisted Manual`: the Agent still prepares the complete platform-native package, but the human performs only the final publish action.
- A channel is **Verified** only after an automated publish/upload succeeds and remains authoritative/re-readable where the platform permits it.
- Do not integrate an API merely because it exists. Discovery value, search value, review burden, maintenance cost, platform policy fit, and the value of automating the final click all matter.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in GitHub or the Google Sheets ledger.
- Every distribution milestone and top-level operating-policy change must be mirrored in this document and `LifeToLife_Global_Distribution_Account_Ledger`.

## Platform-native distribution rule

The Distribution Agent is not a generic cross-posting bot.

Canonical flow:

`source content -> platform-native transformation -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

Each destination must be adapted for the platform's own discovery and presentation mechanics, including where relevant title/hook, length, post/thread structure, tags or hashtags, search phrasing, link use, CTA, image/video selection, aspect ratio/duration/cover, accessibility metadata, AI-content disclosure, community/subreddit context, and provider policy constraints.

The same source may therefore produce materially different outputs for WordPress, Instagram, X, TikTok, Reddit, Tumblr, and other destinations.

Current Assisted Manual packages are:

- X: `x_ready_draft`
- TikTok: platform-ready asset/caption/hashtag/cover/upload package
- Reddit: `reddit_ready_post` for the owned subreddit

The user's platform-specific optimization work should be minimized; the Agent prepares the package and the user performs only the final publish action on Assisted Manual channels.

Detailed canonical rules: `docs/global-distribution-platform-native-policy.md`.

## Canonical network

Target: **Core 15 + Backup 35 = 50 platform/channel endpoints**.

The reconstructed 2026 candidate roster is maintained in:

- `docs/global-distribution-candidates-2026.md`
- Google Sheets `LifeToLife_Global_Distribution_Account_Ledger` -> `Candidates 50`

The 50-channel portfolio is strategic; it is not a requirement to automate the final posting action on every platform.

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

Pinterest remains **Trial API approval pending** and is not counted as Verified.

## Tumblr verification — 2026-08-15

Tumblr is the eighth fully verified Auto Publish target.

- OAuth2 authorization-code flow completed with scopes `basic write offline_access`.
- Durable Object state contains both access and refresh tokens; secret values are never returned.
- Access-token refresh path is implemented using the stored refresh token.
- NPF post creation succeeded for blog `lifetolife-net`.
- Verified test post ID: `825010270001856512`.
- Verified permalink: `https://www.tumblr.com/blog/view/lifetolife-net/825010270001856512`.
- Authenticated post re-query succeeded and returned NPF `blocks` with two content blocks.
- Tumblr post IDs are unsigned 64-bit integers. The initial verifier compared a JSON-parsed numeric re-query ID with the exact create-response ID; JavaScript number precision rounded the re-query value and produced a false `requery_succeeded: false` even though the GET itself succeeded.
- A uint64-safe verification layer is committed so successful authenticated GET-by-exact-created-ID is the verification proof; it does not rely on unsafe numeric equality.

## Assisted Manual channels

### X

Decision: **do not integrate the X posting API**.

During each relevant distribution run, the Agent creates an `x_ready_draft` native to X rather than copied from another channel. It adapts opening hook, post length, single post vs short thread, link inclusion only when useful, and media caption/accompanying text.

After automated channels finish, the user receives the X-ready draft and performs the final publish.

### TikTok

Decision: **do not pursue TikTok Content Posting API approval/audit for now**.

TikTok remains strategically Core because of discovery value, but final publishing is Assisted Manual.

During each relevant distribution run, the Agent prepares when applicable final video/image asset choice, caption, concise hashtags, cover/title suggestion, upload notes, CTA/link recommendation, and AI-generated-content disclosure guidance.

The user performs only the final TikTok publish.

### Reddit — owned subreddit SEO/discovery channel

Decision: **keep Reddit Core, using the user's own subreddit as an Assisted Manual public search/discovery archive**.

During each relevant distribution run, the Agent prepares a `reddit_ready_post` containing a natural search-oriented title, substantial self-contained body, optional canonical LifeToLife link only when useful, subreddit-appropriate context, and no repetitive thin-link/spam pattern.

The user performs the final Reddit post for now.

## Core portfolio changes on 2026-08-15

- **LinkedIn removed from Core** and moved to Backup/deprioritized.
- **Reddit remains Core**, classified as `Assisted Manual · owned-subreddit SEO`.
- **Dailymotion is deprioritized** because ease of automation alone does not justify Core priority when discovery value is weak.
- **Tumblr completed full Auto Publish verification** and is now an operating channel rather than a candidate.
- Vimeo remains a lower-priority video candidate and is not the default next integration.
- Mastodon activation remains paused pending stronger policy/discovery justification.
- Telegram remains low priority because discovery is weak without an existing subscriber base.

## Distribution Agent infrastructure

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Base v8 source: `workers/distribution-agent/worker-v8.js`
- Tumblr publish layer: `workers/distribution-agent/worker-v8-tumblr-publish.js`
- Current uint64-safe entry layer: `workers/distribution-agent/worker-v8-tumblr-safe-verify.js`
- Canonical config: `workers/distribution-agent/wrangler.toml`
- Common JSON route: `POST /v1/publish`
- YouTube multipart route: `POST /v1/publish/youtube`
- WordPress/Tumblr auth-state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`
- Integrated and verified targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`, `wordpress`, `youtube`, `tumblr`
- Prepared but paused/unverified adapter: `mastodon`

### Verified adapter paths

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification
- Tumblr: OAuth2 `offline_access` -> refresh-aware NPF `POST /v2/blog/{blog}/posts` -> authenticated `GET /v2/blog/{blog}/posts/{id}`; uint64-safe verification uses successful GET-by-exact-created-ID rather than JavaScript numeric ID equality

## WordPress.com v8 hardening state

WordPress.com OAuth state is stabilized on a SQLite-backed Durable Object.

- `WPCOM_AUTH_STATE` remains bound to `WordPressAuthState` through the current v8 entry layers.
- Fresh OAuth state was seeded from a new PKCE flow.
- Durable state retained both refresh and access token state.
- Consecutive auth checks used the Durable Object cache.
- No WordPress post was created during the final auth-state verification.

Detailed history remains in `docs/wordpress-automation-progress.md`.

## Current totals

As of 2026-08-15 KST:

- Canonical candidates: **50 = Core 15 + Backup 35**.
- Auto Publish Verified: **8** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- API approval pending: **1** — Pinterest.
- Assisted Manual explicitly adopted: **3** — X, TikTok, Reddit.
- Prepared but paused/unverified adapter: **Mastodon**.

## Current decision rule for the next channel

Choose the next fully automated channel by:

**discovery value × automation value × policy fit ÷ setup/review/maintenance friction**

Do not choose a platform merely because its API is easy.

Current queue:

1. Operate and harden the eight verified Auto Publish channels.
2. Pinterest moves immediately into implementation when Trial approval arrives.
3. Re-rank the remaining candidates before opening another account; Vimeo, Dailymotion, Telegram, Mastodon, and LinkedIn should not be promoted merely because their APIs are easy.

X, TikTok, and Reddit are Agent-generated, human-posted channels. All future channel implementations must comply with `docs/global-distribution-platform-native-policy.md`.
