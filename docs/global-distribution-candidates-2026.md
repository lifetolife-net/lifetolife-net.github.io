# LifeToLife Global Distribution Candidate Network — 2026 API Revalidation v1

Canonical snapshot: **2026-08-15 KST**

This file maintains the reconstructed 50-endpoint strategic distribution roster for LifeToLife.

## Selection rules

- Target size is exactly **Core 15 + Backup 35 = 50 platform/channel endpoints**.
- A candidate may be **Auto Publish** or **Assisted Manual**.
- `Auto Publish`: the Distribution Agent performs final provider API publish/upload and verification.
- `Assisted Manual`: the Agent transforms the source into a platform-ready package; the human performs only the final publish action.
- Strategic Core status is based on discovery/search value and fit, not API simplicity alone.
- Secrets never belong in this file or the Google Sheets ledger.
- Re-check official provider documentation before spending money, requesting review, or opening a new integration.

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
| 9 | TikTok | Content Posting API exists, intentionally not integrated | Public Direct Post requires review/audit | **Core · Assisted Manual** |
| 10 | Vimeo | Vimeo video upload API | Developer app; upload access may require approval | API confirmed; **low priority / Core status under review** |
| 11 | Reddit | Manual publish to user-owned subreddit | Public subreddit; API approval/commercial restrictions apply | **Core · Assisted Manual · owned-subreddit SEO** |
| 12 | Telegram Channel | Bot API `sendMessage` | Bot must be channel administrator | API confirmed; **low discovery value / Core status under review** |
| 13 | Mastodon | `POST /api/v1/statuses` -> status re-query | Instance account + user token | Adapter prepared; **activation paused** |
| 14 | Tumblr | OAuth2 + NPF `POST /v2/blog/{blog}/posts` -> authenticated GET | OAuth app; `basic write offline_access` | **Verified + Agent integrated + refresh-aware auth** |
| 15 | Dailymotion | API v2 upload + video create/publish | Developer credentials + `video.manage` | API confirmed; **deprioritized / Core status under review** |

Tumblr became the eighth Auto Publish Verified endpoint on 2026-08-15. Verified test post: `825010270001856512`, permalink `https://www.tumblr.com/blog/view/lifetolife-net/825010270001856512`. The first verifier exposed a JavaScript precision issue because Tumblr post IDs are unsigned 64-bit integers; the authenticated GET itself succeeded, and a uint64-safe verification layer was committed.

## Backup 35

| Rank | Platform / channel | Primary write path | 2026 decision / caveat |
|---:|---|---|---|
| 16 | X | X API v2 exists but is intentionally not integrated | **Assisted Manual**: existing account; Agent prepares X-ready draft, human posts |
| 17 | LinkedIn | LinkedIn Posts API `POST /rest/posts` | **Removed from Core**; deprioritized |
| 18 | Apple News | Apple News API article create/publish | Publisher/channel approval required |
| 19 | DEV Community / Forem | Forem API create article | API confirmed |
| 20 | Hatena Blog | AtomPub create/edit entries | Japan coverage |
| 21 | Ghost / Ghost(Pro) | Ghost Admin API `POST /admin/posts/` | API confirmed |
| 22 | beehiiv | API v2 create publication post | Plan/API-key requirements may apply |
| 23 | Kit | API v3 create broadcast | Former ConvertKit |
| 24 | Buttondown | Email publishing API | API confirmed |
| 25 | Mailchimp | Marketing API create/send campaign | API confirmed |
| 26 | MailerLite | Campaign create/schedule/send API | API confirmed |
| 27 | Brevo | Create email campaign + send API | API confirmed |
| 28 | LINE Official Account | Messaging API broadcast/push | Japan/Thailand/Taiwan/SEA coverage |
| 29 | Discord | Incoming Webhook execute message | API confirmed |
| 30 | Slack | Web API `chat.postMessage` | API confirmed |
| 31 | Matrix | Client-Server API room event/message send | Open API confirmed |
| 32 | Lemmy | Lemmy API create post | Federated communities |
| 33 | PeerTube | REST video upload | Federated video |
| 34 | Misskey | API `notes/create` | Japan/fediverse coverage |
| 35 | Viber Channels | Channels Post API `/pa/post` | Commercial/channel constraints may apply |
| 36 | OK.ru | API `mediatopic.post` | Russia/CIS coverage |
| 37 | Flickr | Upload API | API confirmed |
| 38 | Qiita | Qiita API v2 `POST /api/v2/items` | Japan tech audience |
| 39 | Telegraph | Telegraph API `createPage` | API confirmed |
| 40 | Write.as / WriteFreely | Write.as/WriteFreely post APIs | Host-specific auth varies |
| 41 | Micro.blog | Micropub publishing | Official publishing protocol supported |
| 42 | SoundCloud | API track upload | OAuth/app access applies |
| 43 | Podbean | Upload + publish episode API | Reconfirm before activation |
| 44 | Discourse | API create topic/post | API confirmed |
| 45 | ActivityPub self-hosted actor | W3C ActivityPub federation | Requires own actor/server implementation |
| 46 | WebSub + RSS distribution | W3C WebSub around canonical RSS/Atom | Syndication endpoint rather than hosted audience |
| 47 | IndexNow | URL submission API | Search/indexing endpoint |
| 48 | Nostr relays | NIP event publishing | Relay policy varies |
| 49 | GitHub Discussions | GraphQL `createDiscussion` | Developer/community distribution |
| 50 | GIPHY | Upload API | Production-key limits apply |

## Assisted Manual channels

### TikTok

Do not pursue Content Posting API approval/audit for now. The Agent prepares final asset choice, caption, concise hashtags, cover/title suggestion, upload notes, CTA/link recommendation, and AI-content disclosure guidance when applicable. The human performs final publish.

### X

Do not integrate the X posting API. The Agent prepares an `x_ready_draft` adapted for X hook, length, thread choice, link use, and media caption; the human performs final publish.

### Reddit

Use the user-owned subreddit as an Assisted Manual searchable archive/discussion surface. The Agent prepares `reddit_ready_post` with a natural search-oriented title, substantial self-contained body, optional canonical link only when useful, and subreddit-appropriate context. Avoid repetitive thin-link posting.

## Current activation logic after 8 Verified automated channels

- **Operate/harden:** WordPress.com, Bluesky, Blogger, YouTube, Facebook, Instagram, Threads, Tumblr.
- **Pinterest:** keep approval wait state; implement immediately if Trial approval arrives.
- **TikTok / X / Reddit:** Assisted Manual; no posting-API integration work now.
- **LinkedIn / Dailymotion:** deprioritized.
- **Vimeo:** not the default next integration; re-rank before spending setup time.
- **Telegram / Mastodon:** do not prioritize merely because APIs are easy; discovery value and policy fit must justify activation.

The next fully automated channel is chosen by **discovery value × automation value × policy fit ÷ setup/review/maintenance friction**.
