# LifeToLife Global Distribution Candidate Network — 2026 API Revalidation v1

Canonical snapshot: **2026-08-15 KST**

This file restores the missing candidate-network baseline for LifeToLife global distribution.

The exact historical 50-name roster was not preserved in the repository or the Google Sheets ledger. Therefore this snapshot reconstructs the roster from the original operating rules and revalidates it against official API/protocol documentation available in 2026.

## Selection rules

- Target size is exactly **Core 15 + Backup 35 = 50 platform/channel endpoints**.
- A candidate may be classified as either **Auto Publish** or **Assisted Manual**.
- `Auto Publish` means the Distribution Agent performs the final provider API publish/upload.
- `Assisted Manual` means the Agent still transforms the source into a platform-ready package, but the human performs the final platform publish action.
- A platform can remain strategically Core even when final posting is manual if discovery/search value is high and API integration cost/review friction is not worth maintaining.
- Account opening, API access, live publish verification, and common Distribution Agent integration are separate milestones.
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
| 9 | TikTok | Content Posting API exists, but not used operationally | Public Direct Post requires app review/audit | **Core · Assisted Manual** |
| 10 | Vimeo | Vimeo video upload API | Developer app; upload access may require approval | API confirmed; promoted to Core after LinkedIn removal |
| 11 | Reddit | Manual publish to user-owned subreddit; API only if separately approved | Public subreddit; Reddit API approval/commercial restrictions apply | **Core · Assisted Manual · owned-subreddit SEO** |
| 12 | Telegram Channel | Bot API `sendMessage` to channel | Bot must be channel administrator | API confirmed; low discovery value; Core status under review |
| 13 | Mastodon | `POST /api/v1/statuses` -> status re-query | Instance account + user token | Adapter prepared; activation paused pending instance/policy fit |
| 14 | Tumblr | Tumblr API v2 create post | OAuth app/user auth | API confirmed; unopened |
| 15 | Dailymotion | API v2 upload + video create/publish | Developer credentials + `video.manage` | API confirmed; unopened |

### Core interpretation

The Core table is a **strategic portfolio**, not merely an API-automation list.

The current 7 Verified channels remain the automated foundation. Pinterest remains Core despite approval latency because of discovery value. TikTok remains Core because of discovery value, but LifeToLife will **not** pursue TikTok Direct Post API approval for now. Instead the Agent will prepare a TikTok-ready publishing package and the human will perform the final upload/publish in the TikTok app.

Reddit remains Core for a different reason: the user already controls a subreddit. LifeToLife will treat that subreddit as a **public, searchable archive and discussion surface**, not as a destination for blind mass cross-posting into unrelated communities. The Agent should prepare a Reddit-native title/body package optimized for clarity and search intent, while the human performs the final post unless Reddit separately approves an appropriate API use case.

For TikTok, the Agent package should include when relevant:

- final video/image asset selection,
- platform-ready caption,
- concise hashtags,
- cover/title suggestion,
- upload notes,
- link/CTA recommendation,
- AI-generated-content disclosure guidance when applicable.

For Reddit, the Agent package should include when relevant:

- search-oriented but natural post title,
- self-contained body text rather than thin link spam,
- canonical LifeToLife link only when it genuinely adds value,
- concise context explaining why the post belongs in the owned subreddit,
- no repetitive mass-posting pattern.

## Backup 35

| Rank | Platform / channel | Primary write path | 2026 decision / caveat |
|---:|---|---|---|
| 16 | X | X API v2 exists but is intentionally not integrated | **Assisted Manual**: existing account; Agent prepares X-ready draft, human posts |
| 17 | LinkedIn | LinkedIn Posts API `POST /rest/posts` | **Removed from Core**; professional-network fit and review burden do not justify priority |
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
| 43 | Podbean | Upload + publish episode API | Official API docs exist; reconfirm before activation because API documentation is older |
| 44 | Discourse | API create topic/post | API confirmed |
| 45 | ActivityPub self-hosted actor | W3C ActivityPub client/server + federation | Protocol confirmed; requires own actor/server implementation |
| 46 | WebSub + RSS distribution | W3C WebSub around canonical RSS/Atom | Protocol confirmed; syndication endpoint rather than hosted audience |
| 47 | IndexNow | URL submission API | API confirmed; search/indexing distribution endpoint |
| 48 | Nostr relays | NIP event publishing to relays | Open protocol confirmed; relay policy varies |
| 49 | GitHub Discussions | GraphQL `createDiscussion` | API confirmed; developer/community distribution |
| 50 | GIPHY | Upload API | API confirmed; developer/production key limits apply |

## Assisted Manual channels

### TikTok

Operational decision: **do not integrate the Content Posting API for now**.

During every relevant distribution run, the Agent should produce a TikTok-ready package. The human receives a reminder and performs the final publish. This avoids app-review/audit work while retaining TikTok's discovery value.

### X

Operational decision: **do not integrate the X posting API**.

During every relevant distribution run, the Agent should produce an `x_ready_draft` optimized for X rather than copying another channel's text. The draft should adapt hook, length, thread-vs-single-post choice, link use, and media caption. The human performs the final publish using the existing X account.

### Reddit

Operational decision: **use the user's own subreddit as an Assisted Manual search/discovery channel**.

The Agent prepares `reddit_ready_post` with a natural title, substantial body, optional canonical link, and subreddit-appropriate context. The human publishes it to the owned subreddit. This avoids unnecessary Reddit API approval/commercial-use risk while preserving the value of a public forum page that Google can crawl and potentially surface in forum/discussion search features.

Do not turn this into repetitive thin-link posting. Reddit's spam rules prohibit mass-posting repetitive content for exposure or financial gain, including abuse facilitated by bots or generative AI tools.

## Explicit exclusions from the canonical 50

### Medium

Medium is not in the 2026 canonical candidate network because the official API is no longer supported for new integrations.

### Browser-only or unofficial automation

Platforms without a credible official publishing interface remain outside the canonical 50 unless they are deliberately handled as Assisted Manual channels for strategic discovery value.

## Regional coverage check

- **South America:** Facebook, Instagram, YouTube, Threads, TikTok, X.
- **India / South Asia:** YouTube, Instagram, Facebook, TikTok.
- **Southeast Asia:** Facebook, Instagram, YouTube, TikTok, LINE, Viber.
- **Japan:** YouTube, Instagram, X, LINE Official Account, Hatena, Qiita, Misskey.
- **Europe / CIS:** Mastodon/fediverse, Viber, OK.ru.
- **Open/federated web:** Bluesky/AT Protocol, Mastodon, Lemmy, PeerTube, Misskey, ActivityPub, WebSub, Nostr.

## Current activation logic after the 7 Verified automated channels

- **TikTok:** Assisted Manual; no API approval work for now.
- **X:** Assisted Manual; no API integration work.
- **Reddit:** Assisted Manual to the owned subreddit; treat it as a searchable content archive, not mass distribution.
- **LinkedIn:** removed from Core and deprioritized.
- **Pinterest:** keep approval wait state; verify immediately when Trial access arrives.
- **Dailymotion / Tumblr:** strongest remaining candidates for the next fully automated channel opening.
- **Vimeo:** promoted to Core as a second professional video-distribution candidate.
- **Telegram / Mastodon:** retain as candidates, but do not prioritize merely because their APIs are easy; discovery value and operating-policy fit matter.

The next fully automated channel should be selected by **discovery value × automation value × friction**, not by API simplicity alone.
