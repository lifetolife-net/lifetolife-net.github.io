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

## Current automated foundation — 7 Verified

| Channel | Public account / handle | Mode | State |
|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Auto Publish | **Verified + Agent integrated + Durable auth state** |
| Bluesky | `@lifetolife-net.bsky.social` | Auto Publish | **Verified + Agent integrated** |
| Blogger | LifeToLife / `lifetolife-net` | Auto Publish | **Verified + Agent integrated** |
| YouTube | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Facebook | Page `Life to Life` | Auto Publish | **Verified + Agent integrated** |
| Instagram | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |
| Threads | `@lifetolife_net` | Auto Publish | **Verified + Agent integrated** |

Pinterest remains **Trial API approval pending** and is not counted as Verified.

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
- **Vimeo promoted to Core** as a professional video distribution candidate.
- **Reddit remains Core**, classified as `Assisted Manual · owned-subreddit SEO`.
- **Dailymotion is deprioritized** because ease of automation alone does not justify Core priority when discovery value is weak.
- **Tumblr is the leading candidate for the next fully automated channel** because it combines official posting API support with tags/reblogs and persistent blog-style content.

## Channels under active comparison for the next fully automated integration

### Tumblr

- Official post creation API exists.
- Supports text/media/blog-style distribution with native discovery through tags/reblogs.
- Current leading candidate for the next automated channel.

### Vimeo

- Official upload API exists.
- Useful as an additional video-distribution/search asset, but discovery value is weaker than Tumblr.
- Keep Core; do not prioritize ahead of Tumblr without stronger evidence.

### Dailymotion

- Official video upload/publish API exists.
- Technically easy to integrate, but currently deprioritized because automation simplicity is not enough to justify channel priority.

### Telegram Channel

- Bot API is low-friction.
- Discovery value is weak without an existing subscriber base.
- Do not prioritize merely because automation is easy.

### Mastodon

- Official status publishing API exists.
- A v8 adapter and setup helper were prepared in GitHub.
- Activation is paused because instance policy fit and discovery value must be justified first.
- The adapter has not been deployed or verified and does not count toward the Verified total.

### LinkedIn

- Official Posts API exists.
- Removed from Core and deprioritized.
- No current implementation work planned.

## Distribution Agent infrastructure

- Worker: `lifetolife-distribution-agent`
- Production endpoint: `https://distribution-api.lifetolife.net`
- Canonical source: `workers/distribution-agent/worker-v8.js`
- Canonical config: `workers/distribution-agent/wrangler.toml`
- Common JSON route: `POST /v1/publish`
- YouTube multipart route: `POST /v1/publish/youtube`
- WordPress auth-state backend: SQLite-backed Durable Object `WordPressAuthState`, binding `WPCOM_AUTH_STATE`
- Integrated and verified targets: `facebook`, `instagram`, `threads`, `blogger`, `bluesky`, `wordpress`, `youtube`
- Prepared but paused/unverified adapter: `mastodon`

### Verified adapter paths

- Facebook: Page `/feed` -> re-query
- Instagram: `/media` -> container readiness -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: OAuth refresh -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> binary upload -> `videos.list` processing verification

## WordPress.com v8 hardening state

WordPress.com OAuth state is stabilized on a SQLite-backed Durable Object.

- Canonical `wrangler.toml` points to `worker-v8.js`.
- `WPCOM_AUTH_STATE` is bound to `WordPressAuthState`.
- Fresh OAuth state was seeded from a new PKCE flow.
- Durable state retained both refresh and access token state.
- Consecutive auth checks used the Durable Object cache.
- No WordPress post was created during the final auth-state verification.

Detailed history remains in `docs/wordpress-automation-progress.md`.

## Current totals

As of 2026-08-15 KST:

- Canonical candidates: **50 = Core 15 + Backup 35**.
- Auto Publish Verified: **7** — WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads.
- API approval pending: **1** — Pinterest.
- Assisted Manual explicitly adopted: **3** — X, TikTok, Reddit.
- Prepared but paused/unverified adapter: **Mastodon**.

## Current decision rule for the next channel

Choose the next fully automated channel by:

**discovery value × automation value × policy fit ÷ setup/review/maintenance friction**

Do not choose a platform merely because its API is easy.

Immediate priority:

1. Tumblr
2. Vimeo
3. Pinterest immediately if Trial approval arrives

X, TikTok, and Reddit are Agent-generated, human-posted channels. LinkedIn and Dailymotion are deprioritized. All future channel implementations must comply with `docs/global-distribution-platform-native-policy.md`.
