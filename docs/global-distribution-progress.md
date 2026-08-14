# LifeToLife Global Distribution Progress

Last updated: 2026-08-14 (KST)

This document is the canonical progress record for LifeToLife's global distribution and auto-publishing network.

## Operating principle

- Open distribution channels only when there is a realistic path to API/MCP-based automation.
- Track account creation, API access, and actual publishing verification separately.
- Do not treat account creation alone as automation completion.
- Do not store passwords, API keys, app passwords, access tokens, refresh tokens, client secrets, authorization codes, or PKCE verifiers in this repository.
- Human login/approval steps may remain manual, but routine publishing should ultimately be handled by the LifeToLife Distribution Agent.

## Current channel status

| Channel | Public account / handle | Account status | API / automation status | Actual publish verification | Next action |
|---|---|---|---|---|---|
| WordPress.com | `lifetolifeglobal.wordpress.com` | Open | ChatGPT connector + OAuth 2.1 / PKCE + WordPress.com MCP operational | **Verified** | Production token refresh / secret storage integration |
| Pinterest | LifeToLife | Open | Trial API access requested | **Pending approval** | Wait for Trial access approval, then verify actual pin creation |
| Bluesky | `@lifetolife-net.bsky.social` | Open | App Password + AT Protocol API operational | **Verified** | Consider moving handle to `@lifetolife.net`; integrate into Distribution Agent |
| Blogger | LifeToLife / `lifetolife-net` | Open | Blogger API enabled; Google OAuth path prepared | Not yet verified | Create/use OAuth client and verify actual post creation |
| Facebook | Page: `Life to Life` | Open | Connected through Meta Business portfolio | Not yet verified | Verify Meta API publishing path |
| Instagram | Existing LifeToLife promotional account | Business account; connected to LifeToLife portfolio | Meta Business connection complete | Not yet verified | Verify Instagram publishing API path |
| Threads | Profile created from connected Instagram account | Open | Meta / Threads automation path not yet verified | Not yet verified | Verify Threads publishing API path |
| YouTube | `@lifetolife_net` | Open | Google / YouTube automation path not yet verified | Not yet verified | Verify YouTube upload path |

## Verified channels

### 1. WordPress.com

WordPress.com is operational through two independent publishing paths.

1. ChatGPT WordPress.com connector
2. Independent terminal/MCP client using OAuth 2.1 Dynamic Client Registration + PKCE + WordPress.com MCP

Both paths successfully created draft posts.

Detailed implementation and troubleshooting notes are maintained in:

- `docs/wordpress-automation-progress.md`

### 2. Bluesky

Bluesky automation was verified on 2026-08-14.

- Account: `@lifetolife-net.bsky.social`
- Account type: personal account; no separate business account required for this automation path
- Authentication: Bluesky App Password
- Direct-message permission: **not granted**
- Session authentication: verified through `com.atproto.server.createSession`
- Publishing: verified through `com.atproto.repo.createRecord`
- Collection: `app.bsky.feed.post`
- Test post text: `LifeToLife Bluesky auto-publishing test`
- Returned record URI: `at://did:plc:smxnvmbrwgxukp3xsw4zbz2j/app.bsky.feed.post/3mt24l25w4l22`
- Validation status: `valid`

Conclusion: Bluesky is ready to be integrated into the LifeToLife Distribution Agent.

## Approval pending

### Pinterest

- LifeToLife account is open.
- Pinterest API Trial access has been requested.
- Current state: **Trial access pending**.
- No automated publishing success should be recorded until actual pin creation is verified after approval.

## Open but automation not yet verified

### Blogger

- LifeToLife Blogger presence is open.
- Blogger API is enabled.
- The remaining milestone is OAuth client use plus an actual API-created post.

### Meta distribution group

The LifeToLife Meta-side account structure is open:

- Meta Business Portfolio: `LifeToLife`
- Facebook Page: `Life to Life`
- Instagram: existing promotional account converted to Business and connected to the LifeToLife portfolio
- Threads: profile created from the connected Instagram account

Account connection alone is not considered publishing verification. Facebook, Instagram, and Threads remain **automation unverified** until API-created content succeeds.

### YouTube

- Channel handle: `@lifetolife_net`
- Channel exists and is reserved for LifeToLife distribution.
- Automated upload has not yet been verified.

## Distribution infrastructure

### Google Cloud

- Project: `LifeToLife Distribution`
- Project identifier used in setup: `lifetolife-distribution`
- Purpose: Google-side API/OAuth infrastructure for the LifeToLife Distribution Agent
- Relevant APIs already prepared include Blogger API and YouTube Data API v3.

### Account ledger

A separate Google Sheets account ledger is maintained for operational account management:

- `LifeToLife_Global_Distribution_Account_Ledger`

It tracks account/handle, management email, API access state, automation verification, next action, and secret-storage policy. Passwords and token values are intentionally excluded.

## Account-management policy

The default global management account is:

- `jisooyoun.cafe@gmail.com`

Rules:

1. Passwords are stored only in the password manager, never in GitHub or the account ledger.
2. API keys, app passwords, OAuth tokens, and client secrets are stored only in environment variables or a dedicated secret store.
3. Enable 2FA where available and store recovery codes separately from the ledger.
4. Every new channel must be added to both this canonical progress document and the account ledger as soon as it is opened.
5. A channel is marked **Verified** only after an actual automated publish/upload succeeds.
6. Paused or abandoned channels should remain in the record with status changed rather than being silently removed.

## Current totals

As of 2026-08-14:

- Distribution-facing accounts/channels or management hubs recorded: **9**
- Actual automated publishing verified: **2 channels** — WordPress.com, Bluesky
- API approval pending: **1** — Pinterest
- Open channels with publishing automation still unverified: Blogger, Facebook, Instagram, Threads, YouTube

## Immediate queue

1. Keep Pinterest in approval-wait state; do not spend time repeatedly checking it manually.
2. Verify the next low-friction auto-publishing channel.
3. Continue integrating each successfully verified publisher into the common LifeToLife Distribution Agent.
4. Keep this document and the Google Sheets account ledger synchronized after every account/API milestone.
