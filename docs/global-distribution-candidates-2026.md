# LifeToLife Global Distribution Candidate Network — 2026 API Revalidation v1

Canonical snapshot: **2026-08-15 KST**

This file restores the missing candidate-network baseline for LifeToLife global distribution.

The exact historical 50-name roster was not preserved in the repository or the Google Sheets ledger. Therefore this snapshot reconstructs the roster from the original operating rules and revalidates it against official API/protocol documentation available in 2026.

## Selection rules

- Target size is exactly **Core 15 + Backup 35 = 50 platform/channel endpoints**.
- A candidate must have a realistic official write/publish API, official automation interface, or open publishing protocol. Browser-only workaround automation does not qualify.
- Account opening, API access, live publish verification, and common Distribution Agent integration are separate milestones.
- High-reach but gated APIs may remain Core; the operational activation queue can still favor a lower-friction Core candidate first.
- Regional coverage is preserved through global and regional channels relevant to South America, Southeast Asia, India, Japan, Europe/CIS, and the open/federated web.
- Secrets never belong in this file or the Google Sheets ledger.
- API policy changes are expected. Re-check official documentation again immediately before spending money, requesting a review, or building a provider-specific adapter.

## Core 15

| Rank | Platform / channel | Primary write path | Access / gate | LifeToLife state on 2026-08-15 |
|---:|---|---|---|---|
| 1 | YouTube | YouTube Data API v3 `videos.insert` | OAuth + quota | **Verified + Agent integrated** |
| 2 | Facebook Pages | Graph API Page `/feed` | Meta app + Page token | **Verified + Agent integrated** |
| 3 | Instagram Professional | `/media` -> `/media_publish` | Professional account + Meta app | **Verified + Agent integrated** |
| 4 | Threads | `/threads` -> `/threads_publish` | Threads OAuth | **Verified + Agent integrated** |
| 5 | WordPress.com | WordPress.com MCP `posts.create` -> `posts.get` | OAuth 2.1 / PKCE | **Verified + Agent v8 Durable Object auth** |
| 6 | Blogger | Blogger API `posts.insert` -> `posts.get` | Google OAuth | **Verified + Agent integrated** |
| 7 | Bluesky | AT Protocol `createRecord` -> `getRecord` | App Password / session | **Verified + Agent integrated** |
| 8 | Pinterest | Pinterest API v5 `POST /pins` | Trial/Standard API approval | **Trial approval pending** |
| 9 | TikTok | Content Posting API Direct Post | Public posting requires app review/audit | API confirmed; unopened |
| 10 | LinkedIn | Posts API `POST /rest/posts` | Product/permission access | API confirmed; unopened |
| 11 | Reddit | Reddit Developer Platform user actions / submit post | App/platform approval and community policy | API confirmed; unopened |
| 12 | Telegram Channel | Bot API `sendMessage` to channel | Bot must be channel administrator | API confirmed; unopened |
| 13 | Mastodon | `POST /api/v1/statuses` -> status re-query | Instance account + user token | **Opening started; v8 adapter committed; account/token pending** |
| 14 | Tumblr | Tumblr API v2 create post | OAuth app/user auth | API confirmed; unopened |
| 15 | Dailymotion | API v2 upload + video create/publish | Developer credentials + `video.manage` | API confirmed; unopened |

### Core interpretation

The Core table is a **strategic portfolio**, not the account-opening order. The current 7 Verified channels remain Core. Pinterest stays Core despite approval latency because of its discovery value. TikTok, LinkedIn, and Reddit stay Core despite review friction because of reach/community value.

The operational activation queue prioritizes low-friction paths that can become fully verified without blocking on platform review.

## Backup 35

| Rank | Platform / channel | Primary write path | 2026 decision / caveat |
|---:|---|---|---|
| 16 | X | X API v2 `POST /2/tweets` | API confirmed; **deferred because write access is pay-per-use** |
| 17 | Vimeo | Vimeo video upload API | API confirmed; upload access may require developer approval |
| 18 | Apple News | Apple News API article create/publish | API confirmed; Publisher/channel approval required |
| 19 | DEV Community / Forem | Forem API create article | API confirmed |
| 20 | Hatena Blog | AtomPub create/edit entries | API confirmed; Japan coverage |
| 21 | Ghost / Ghost(Pro) | Ghost Admin API `POST /admin/posts/` | API confirmed |
| 22 | beehiiv | API v2 create publication post | API confirmed; plan/API-key requirements may apply |
| 23 | Kit | API v3 create broadcast | API confirmed; former ConvertKit |
| 24 | Buttondown | Email publishing API | API confirmed |
| 25 | Mailchimp | Marketing API create/send campaign | API confirmed |
| 26 | MailerLite | Campaign create/schedule/send API | API confirmed |
| 27 | Brevo | Create email campaign + send API | API confirmed |
| 28 | LINE Official Account | Messaging API broadcast/push | API confirmed; Japan/Thailand/Taiwan/SEA coverage |
| 29 | Discord | Incoming Webhook execute message | API confirmed |
| 30 | Slack | Web API `chat.postMessage` | API confirmed |
| 31 | Matrix | Client-Server API room event/message send | Open API confirmed |
| 32 | Lemmy | Lemmy API create post | API confirmed; federated communities |
| 33 | PeerTube | REST video upload | API confirmed; federated video |
| 34 | Misskey | API `notes/create` | API confirmed; Japan/fediverse coverage |
| 35 | Viber Channels | Channels Post API `/pa/post` | API confirmed; commercial/channel constraints may apply |
| 36 | OK.ru | API `mediatopic.post` | API confirmed; Russia/CIS coverage |
| 37 | Flickr | Upload API | API confirmed |
| 38 | Qiita | Qiita API v2 `POST /api/v2/items` | API confirmed; Japan tech audience |
| 39 | Telegraph | Telegraph API `createPage` | API confirmed |
| 40 | Write.as / WriteFreely | Write.as/WriteFreely post APIs | API confirmed; host-specific auth varies |
| 41 | Micro.blog | Micropub publishing | Official publishing protocol supported |
| 42 | SoundCloud | API track upload | API confirmed; OAuth/app access applies |
| 43 | Podbean | Upload + publish episode API | Official API docs exist; **reconfirm before activation because API documentation is older** |
| 44 | Discourse | API create topic/post | API confirmed |
| 45 | ActivityPub self-hosted actor | W3C ActivityPub client/server + federation | Protocol confirmed; requires own actor/server implementation |
| 46 | WebSub + RSS distribution | W3C WebSub around canonical RSS/Atom | Protocol confirmed; syndication endpoint rather than hosted audience |
| 47 | IndexNow | URL submission API | API confirmed; search/indexing distribution endpoint |
| 48 | Nostr relays | NIP event publishing to relays | Open protocol confirmed; relay policy varies |
| 49 | GitHub Discussions | GraphQL `createDiscussion` | API confirmed; developer/community distribution |
| 50 | GIPHY | Upload API | API confirmed; developer/production key limits apply |

## Explicit exclusions from the canonical 50

### Medium

Medium is **not** in the 2026 canonical candidate network. Its official API repository states that the API is no longer supported and that new integrations are not accepted. Historical API availability is not sufficient for LifeToLife's unattended publishing requirement.

### Browser-only or unofficial automation

Platforms without a currently credible official write/publish interface are excluded even if they have large audiences. They can be reconsidered only if an official API or supported partner interface becomes available.

## Regional coverage check

The 50-candidate portfolio preserves meaningful regional reach without relying on unofficial automation:

- **South America:** Facebook, Instagram, YouTube, Threads, TikTok, Telegram, X backup.
- **India / South Asia:** YouTube, Instagram, Facebook, Telegram, TikTok.
- **Southeast Asia:** Facebook, Instagram, YouTube, TikTok, Telegram, LINE, Viber.
- **Japan:** YouTube, Instagram, X backup, LINE Official Account, Hatena, Qiita, Misskey.
- **Europe / CIS:** Telegram, Mastodon/fediverse, Viber, OK.ru.
- **Open/federated web:** Bluesky/AT Protocol, Mastodon, Lemmy, PeerTube, Misskey, ActivityPub, WebSub, Nostr.

## Operational activation queue after the current 7 Verified channels

1. **Mastodon** — next. Official write API is straightforward and the Agent v8 adapter is already committed. Human boundary: account creation, password/email confirmation, and access-token creation.
2. **Telegram Channel** — low-friction Bot API; create channel + bot, make bot administrator, verify send + readback/authoritative message identity where possible.
3. **Tumblr** — OAuth + create-post path.
4. **Dailymotion** — second automated video endpoint.
5. Continue the high-reach gated Core paths in parallel: Pinterest approval, TikTok app review, LinkedIn product/permission setup, Reddit developer access.

The activation queue can change when a pending approval arrives, but the Core 15 membership should remain stable unless an API is withdrawn or a materially better official distribution endpoint appears.
