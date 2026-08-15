# LifeToLife Distribution Agent

Cloudflare Worker for the common LifeToLife publishing pipeline.

Production endpoint:

- `https://distribution-api.lifetolife.net`

Canonical deployment:

- source: `worker-v8.js`
- config: `wrangler.toml`
- WordPress OAuth state: SQLite-backed Durable Object `WordPressAuthState`

## Current state

Verified common-Agent targets: **7**

- Facebook
- Instagram
- Threads
- Blogger
- Bluesky
- WordPress.com
- YouTube

Prepared but not yet deployed/verified:

- Mastodon

Approval pending:

- Pinterest API Trial access

The canonical 2026 rollout target is tracked in:

- `docs/global-distribution-progress.md`
- `docs/global-distribution-candidates-2026.md`
- Google Sheets `LifeToLife_Global_Distribution_Account_Ledger`

## Common API

`POST /v1/publish`

Verified JSON target names:

- `facebook`
- `instagram`
- `threads`
- `bluesky`
- `blogger`
- `wordpress`

Prepared JSON target name:

- `mastodon`

YouTube uses the multipart route implemented in the existing base chain.

Backward-compatible Meta route:

- `POST /v1/publish/meta`

## Verified adapter paths

- Facebook: Page `/feed` -> persistent re-query
- Instagram: `/media` -> container ready -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: Google refresh token -> access token -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`
- WordPress.com: OAuth 2.1 + SQLite-backed Durable Object auth state -> MCP initialize -> draft `posts.create` -> `posts.get`
- YouTube: Google OAuth refresh -> resumable `videos.insert` -> upload -> `videos.list` processing verification

## WordPress.com v8 auth state

The canonical v8 architecture preserves the independently verified WordPress.com MCP publishing path while moving OAuth state to a SQLite-backed Durable Object.

Important properties:

- `wrangler.toml` points to `worker-v8.js`.
- `WPCOM_AUTH_STATE` binds `WordPressAuthState`.
- fresh PKCE state can be seeded through the protected admin route without returning secret values.
- access tokens can be served from Durable Object cache between calls.
- the final auth-state verification created no WordPress post.

Setup/re-auth helpers remain in this directory.

## Mastodon adapter — prepared, not Verified

The v8 wrapper now recognizes `mastodon` on `POST /v1/publish` without altering the existing verified base chain.

Prepared path:

1. user access token with `write:statuses` and `read:statuses`
2. form-encoded `POST /api/v1/statuses`
3. optional request `idempotency_key` -> Mastodon `Idempotency-Key` header
4. `GET /api/v1/statuses/:id` authoritative readback

Optional common request field:

- `mastodon_visibility`: `public`, `unlisted`, `private`, or `direct`

Required Worker runtime values after the account exists:

- `MASTODON_BASE_URL`
- `MASTODON_ACCESS_TOKEN`

The adapter remains inactive when those values are absent.

Setup helper:

```bash
bash setup-mastodon.sh https://mastodon.social
```

The script:

1. verifies that the instance API is reachable,
2. accepts the access token through hidden terminal input,
3. stores instance URL and token as Worker secrets,
4. deploys canonical v8,
5. checks `/health`,
6. performs an authenticated **dry run only**.

It deliberately does **not** create a live Mastodon post. Live verification is a separate explicit milestone after the account/token setup succeeds.

## Other setup scripts

Meta setup / repair:

```bash
bash deploy-meta.sh
bash fix-facebook-token.sh
```

Bluesky + Blogger:

```bash
bash setup-bluesky-blogger.sh
bash fix-bluesky-password.sh
```

YouTube:

```bash
bash setup-youtube.sh
bash retry-youtube-standard-mp4.sh
```

WordPress.com:

```bash
bash setup-wordpress.sh
bash setup-wordpress-auth-do.sh
bash reauth-wordpress-durable.sh
```

## Common content fields

- `text`: required
- `targets`: required on `/v1/publish`
- `title`: optional; used by Blogger and WordPress.com
- `html`: optional; used by Blogger and WordPress.com
- `image_url`: required when Instagram is targeted
- `dry_run`: optional boolean
- `idempotency_key`: optional; currently forwarded to Mastodon when Mastodon is targeted
- `mastodon_visibility`: optional Mastodon-specific visibility

WordPress.com currently creates drafts on the verified common-Agent path.

## Result semantics

Each target is successful only after publishing/creation plus an authoritative follow-up read where the provider supports one.

- HTTP `200`: all requested targets succeeded
- HTTP `207`: at least one target failed; per-target results remain available
- HTTP `400`: invalid common request or missing configuration

## Secret policy

Never commit passwords, app passwords, OAuth access/refresh tokens, client secrets, or the Distribution Agent key.

Production credentials are stored in runtime secret storage. The local Distribution Agent key remains outside the repository at:

- `~/.config/lifetolife/distribution-agent-key`

Existing provider credential files also remain outside this repository.

## Immediate sequence

1. Create the LifeToLife Mastodon account on the selected instance.
2. Create a token with `read:statuses` + `write:statuses`.
3. Run `setup-mastodon.sh` to store secrets, deploy v8, and dry-run.
4. Perform one live Mastodon Agent post plus persistent re-query.
5. If successful, mark Mastodon as channel #8 Verified in both GitHub and Google Sheets.
6. Continue the Core 15 activation queue.
