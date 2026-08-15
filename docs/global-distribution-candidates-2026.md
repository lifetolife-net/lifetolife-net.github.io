# LifeToLife Global Distribution Candidate Network — 2026 API Revalidation v2

Canonical snapshot: **2026-08-15 KST**

This file maintains the reconstructed 50-endpoint strategic distribution roster for LifeToLife.

## Selection rules

- Target size is exactly **Core 15 + Backup 35 = 50 platform/channel endpoints**.
- A candidate may be **Auto Publish** or **Assisted Manual**.
- `Auto Publish`: the Distribution Agent performs final provider API publish/upload and verification.
- `Assisted Manual`: the Agent transforms the source into a platform-ready package; the human performs only the final publish action.
- Strategic Core status is based on discovery/search value and fit, not API simplicity alone.
- Regional discovery surfaces may outrank globally available but follower-only or hosting-only channels.
- Secrets never belong in this file or the Google Sheets ledger.
- Re-check official provider documentation before spending money, requesting review, or opening a new integration.

## Core 15 — re-ranked 2026-08-15

| Rank | Platform / channel | Primary write path | Access / gate | LifeToLife state on 2026-08-15 |
|---:|---|---|---|---|
| 1 | YouTube | YouTube Data API v3 `videos.insert` | OAuth + quota | **Verified + Agent integrated** |
| 2 | Instagram Professional | `/media` -> `/media_publish` | Professional account + Meta app | **Verified + Agent integrated** |
| 3 | Facebook Pages | Graph API Page `/feed` | Meta app + Page token | **Verified + Agent integrated** |
| 4 | TikTok | Content Posting API exists, intentionally not integrated | Public Direct Post requires review/audit | **Core · Assisted Manual** |
| 5 | Threads | `/threads` -> `/threads_publish` | Threads OAuth | **Verified + Agent integrated** |
| 6 | Pinterest | Pinterest API v5 `POST /pins` | Trial/Standard API approval | **Trial approval pending** |
| 7 | X | Posting API intentionally not integrated | Existing account; paid API not required for Assisted Manual | **Core · Assisted Manual** |
| 8 | WordPress.com | WordPress.com MCP `posts.create` -> `posts.get` | OAuth 2.1 / PKCE | **Verified + Agent v8 Durable Object auth** |
| 9 | Reddit | Manual publish to user-owned subreddit | Public subreddit; API approval/commercial restrictions apply | **Core · Assisted Manual · owned-subreddit SEO** |
| 10 | Blogger | Blogger API `posts.insert` -> `posts.get` | Google OAuth | **Verified + Agent integrated** |
| 11 | Bluesky | AT Protocol `createRecord` -> `getRecord` | App Password / session | **Verified + Agent integrated** |
| 12 | Tumblr | OAuth2 + NPF `POST /v2/blog/{blog}/posts` -> authenticated GET | OAuth app; `basic write offline_access` | **Verified + Agent integrated + refresh-aware auth** |
| 13 | Hatena Blog | AtomPub `POST /atom/entry` -> member `GET` | Hatena account + blog API key; HTTPS Basic | **Adapter prepared · blog-opening manual review pending · NEXT** |
| 14 | Dailymotion | API v2 upload session -> profile video create/publish | OAuth2 + `video.manage` | **Auto Publish candidate #2** |
| 15 | OK.ru | REST `mediatopic.post` -> topic re-query | Developer rights + OAuth platform/app keys | **Regional Auto Publish candidate #3** |

### Why the Core changed

- **X moves from Backup to Core.** Core is strategic, not synonymous with API-integrated. X retains meaningful public discovery value while remaining Assisted Manual to avoid API cost/maintenance.
- **Hatena Blog moves into Core and becomes the next activation target.** Its official AtomPub API still supports create/read/update/delete, including authenticated entry creation and member re-query. The Distribution Agent wrapper, non-posting credential verification route, and safe setup script are committed. During blog creation Hatena flagged unusual activity and required a manual blog-opening request; that request was submitted on 2026-08-15 and is awaiting review.
- **Dailymotion remains Core but is re-ranked behind Hatena.** Its current API v2 supports programmatic upload plus video creation/publication and can reuse LifeToLife video assets, but setup is heavier than Hatena.
- **OK.ru moves into Core** as a regional social-feed endpoint for Russia/CIS. Official documentation supports automated group/user feed posting via the OAuth platform and `mediatopic.post`, but developer rights/app setup add friction.
- **Vimeo, Mastodon and Telegram move to Backup.** Vimeo is primarily hosting/professional video and requires upload access; Mastodon is easy to automate but weaker in incremental discovery; Telegram is follower/subscriber-driven rather than organic discovery-first.
- **Apple News is demoted and parked.** The API exists, but Apple states that News publishing is for professional journalistic publications based in Apple News territories (Australia, Canada, UK, US). A Korea-based LifeToLife publication is therefore not a current activation target.

Tumblr became the eighth Auto Publish Verified endpoint on 2026-08-15. Verified test post: `825010270001856512`, permalink `https://www.tumblr.com/blog/view/lifetolife-net/825010270001856512`. The first verifier exposed a JavaScript precision issue because Tumblr post IDs are unsigned 64-bit integers; the authenticated GET itself succeeded, and a uint64-safe verification layer was committed.

## Backup 35

| Rank | Platform / channel | Primary write path | 2026 decision / caveat |
|---:|---|---|---|
| 16 | Vimeo | Vimeo API video upload | API confirmed; upload access required; lower discovery than Dailymotion |
| 17 | Mastodon | `POST /api/v1/statuses` -> status re-query | Adapter prepared; activation paused; easy API alone is insufficient |
| 18 | Telegram Channel | Bot API `sendMessage` | API confirmed; subscriber-driven, weak zero-base discovery |
| 19 | LINE Official Account | Messaging API broadcast/push | API confirmed; sends to friends/followers rather than open discovery |
| 20 | LinkedIn | LinkedIn Posts API `POST /rest/posts` | Deprioritized; weak fit for general LifeToLife distribution |
| 21 | DEV Community / Forem | Forem API create article | API confirmed; strong developer-topic constraint |
| 22 | Ghost / Ghost(Pro) | Ghost Admin API `POST /admin/posts/` | API confirmed; mostly owned-media redundancy |
| 23 | beehiiv | API v2 create publication post | Plan/API-key requirements may apply |
| 24 | Kit | API v3 create broadcast | Former ConvertKit; subscriber-first |
| 25 | Buttondown | Email publishing API | API confirmed; subscriber-first |
| 26 | Mailchimp | Marketing API create/send campaign | API confirmed; subscriber-first |
| 27 | MailerLite | Campaign create/schedule/send API | API confirmed; subscriber-first |
| 28 | Brevo | Create email campaign + send API | API confirmed; subscriber-first |
| 29 | Apple News | Apple News API article create/publish | **Parked:** current publisher eligibility conflicts with Korea-based LifeToLife |
| 30 | Discord | Incoming Webhook execute message | API confirmed; community/follower-driven |
| 31 | Slack | Web API `chat.postMessage` | API confirmed; private/workspace distribution |
| 32 | Matrix | Client-Server API room event/message send | Open API confirmed; room-membership driven |
| 33 | Lemmy | Lemmy API create post | Federated communities; instance/community fit required |
| 34 | PeerTube | REST video upload | Federated video; instance discovery varies |
| 35 | Misskey | API `notes/create` | Japan/fediverse coverage; instance-specific discovery |
| 36 | Viber Channels | Channels Post API `/pa/post` | Commercial/channel constraints may apply |
| 37 | Flickr | Upload API | API confirmed; media/search backup |
| 38 | Qiita | Qiita API v2 `POST /api/v2/items` | Japan tech audience; topic-fit constraint |
| 39 | Telegraph | Telegraph API `createPage` | API confirmed; weak native discovery |
| 40 | Write.as / WriteFreely | Write.as/WriteFreely post APIs | Host-specific auth varies; limited incremental reach |
| 41 | Micro.blog | Micropub publishing | Official publishing protocol supported; indie-web niche |
| 42 | SoundCloud | API track upload | OAuth/app access applies; audio-specific |
| 43 | Podbean | Upload + publish episode API | Reconfirm before activation; podcast-specific |
| 44 | Discourse | API create topic/post | API confirmed; requires relevant forum/community |
| 45 | ActivityPub self-hosted actor | W3C ActivityPub federation | Requires own actor/server implementation; infrastructure rather than audience |
| 46 | WebSub + RSS distribution | W3C WebSub around canonical RSS/Atom | Syndication endpoint rather than hosted audience |
| 47 | IndexNow | IndexNow URL submission API | Search/indexing endpoint rather than social audience |
| 48 | Nostr relays | NIP event publishing | Relay policy varies; fragmented discovery |
| 49 | GitHub Discussions | GraphQL `createDiscussion` | Developer/community distribution; topic-fit constraint |
| 50 | GIPHY | Upload API | Production-key limits apply; format-specific |

## Assisted Manual channels

### TikTok

Do not pursue Content Posting API approval/audit for now. The Agent prepares final asset choice, caption, concise hashtags, cover/title suggestion, upload notes, CTA/link recommendation, and AI-generated-content disclosure guidance when applicable. The human performs final publish.

### X

Do not integrate the X posting API. X is now **Core** because Core reflects distribution value rather than automation mode. The Agent prepares an `x_ready_draft` adapted for X hook, length, thread choice, link use, and media caption; the human performs final publish.

### Reddit

Use the user-owned subreddit as an Assisted Manual searchable archive/discussion surface. The Agent prepares `reddit_ready_post` with a natural search-oriented title, substantial self-contained body, optional canonical link only when useful, and subreddit-appropriate context. Avoid repetitive thin-link posting.

## Current activation queue after 8 Verified automated channels

1. **Hatena Blog — NEXT, manual review pending.** Wait for Hatena's response to the submitted blog-opening request. On approval, obtain the blog API key, run `workers/distribution-agent/setup-hatena.sh` to store secrets/deploy/verify access/dry-run without posting, then create one test entry and re-query its returned member URI.
2. **Dailymotion — second.** Open/confirm channel + developer application, obtain OAuth access with `video.manage`, upload a private/unlisted test first, then publish/re-query.
3. **OK.ru — third.** Obtain developer rights, create an OAuth-enabled app, then test `mediatopic.post` on the owned profile/group and re-query the resulting topic.
4. **Pinterest — jumps ahead immediately when Trial approval arrives.**
5. Operate/harden the eight Verified Auto Publish channels continuously.

Mastodon, Telegram and Vimeo are now Backup and must not be promoted merely because their APIs are easy. Apple News is not an activation target while LifeToLife remains Korea-based under Apple's current publisher eligibility rules.

The next fully automated channel is chosen by **discovery value × automation value × policy fit ÷ setup/review/maintenance friction**.
