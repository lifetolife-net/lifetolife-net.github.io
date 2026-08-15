# LifeToLife Global Distribution Progress

Last updated: 2026-08-15 (KST)

This document is the canonical progress record for LifeToLife's global distribution and publishing network.

## Operating principle

- Track **Auto Publish** and **Assisted Manual** channels separately.
- `Auto Publish`: the Distribution Agent performs the final provider API publish/upload and verifies the created object where possible.
- `Assisted Manual`: the Agent prepares a platform-native publishing package, but the human performs the final publish action.
- A channel is **Verified** only after an automated publish/upload succeeds and remains authoritative/re-readable where the platform permits it.
- Do not integrate an API merely because it exists. Discovery value, review burden, maintenance cost, platform policy fit, and the value of automating the final click all matter.
- Never store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, PKCE verifiers, or the Distribution Agent authorization key in GitHub or the Google Sheets ledger.
- Every distribution milestone must be mirrored in this document and `LifeToLife_Global_Distribution_Account_Ledger`.

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

Reason: posting itself is simple enough that OAuth/API cost and maintenance are not worth automating the final click.

During each relevant distribution run, the Agent should create an `x_ready_draft` that is native to X rather than copied from another channel. It should adapt:

- opening hook,
- post length,
- single post vs short thread,
- link inclusion only when useful,
- media caption / accompanying text.

After the automated channels finish, the user should be shown the X-ready draft with a clear reminder to publish it manually.

### TikTok

Decision: **do not pursue TikTok Content Posting API approval/audit for now**.

TikTok remains strategically Core because of discovery value, but final publishing is **Assisted Manual**.

During each relevant distribution run, the Agent should prepare a TikTok-ready package containing when applicable:

- final video/image asset choice,
- caption,
- concise hashtags,
- cover/title suggestion,
- upload notes,
- CTA/link recommendation,
- AI-generated-content disclosure guidance when applicable.

The user performs the final publish in TikTok. No TikTok posting token, OAuth lifecycle, or Direct Post integration is required under the current policy.

## Channels under active comparison for the next fully automated integration

### Dailymotion

- Official video upload/publish API exists.
- Strong implementation fit because the existing YouTube pipeline already handles video metadata, upload, and verification patterns.
- Candidate for the next automated channel.

### Tumblr

- Official post creation API exists.
- Supports text/media/blog-style distribution with native discovery through tags/reblogs.
- Candidate for the next automated channel.

### LinkedIn

- Official Posts API exists.
- Permission/product review friction is meaningful.
- Keep Core/strategic, but do not prioritize solely for API completeness.

### Reddit

- Official developer posting actions exist.
- High discovery value, but subreddit-specific rules make blind cross-post automation unsuitable.
- Assisted Manual may ultimately be more appropriate than common broadcast automation.

### Telegram Channel

- Bot API is low-friction.
- Discovery value is weak without an existing subscriber base.
- Do not prioritize merely because automation is easy.

### Mastodon

- Official status publishing API exists.
- A v8 adapter and setup helper were prepared in GitHub.
- Activation is **paused** because instance policy fit and discovery value must be justified first.
- The adapter has not been deployed or verified and does not count toward the Verified total.

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
- Assisted Manual explicitly adopted: **2** — X and TikTok.
- Prepared but paused/unverified adapter: **Mastodon**.

## Current decision rule for the next channel

Choose the next fully automated channel by:

**discovery value × automation value × policy fit ÷ setup/review/maintenance friction**

Do not choose a platform merely because its API is easy.

Immediate comparison priority:

1. Dailymotion
2. Tumblr
3. LinkedIn / Reddit depending permission and community-fit tradeoffs
4. Pinterest immediately if Trial approval arrives

X and TikTok are not API-integration tasks under the current policy; they are Agent-generated, human-posted channels.
