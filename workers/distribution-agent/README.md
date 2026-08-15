# LifeToLife Distribution Agent

Cloudflare Worker for the common LifeToLife publishing pipeline.

Production endpoint:

- `https://distribution-api.lifetolife.net`

## Current state

Verified common-Agent targets:

- Facebook
- Instagram
- Threads
- Blogger
- Bluesky

Implemented and awaiting live Agent verification:

- WordPress.com (verified-path v3, draft-only for the first integration pass)

Standalone Verified but not yet implemented in the Agent:

- YouTube

Pinterest remains pending API Trial approval.

## Common API

`POST /v1/publish`

Current target names:

- `facebook`
- `instagram`
- `threads`
- `bluesky`
- `blogger`
- `wordpress`

Backward-compatible Meta route:

- `POST /v1/publish/meta`

When `targets` is omitted on the Meta route, Facebook, Instagram, and Threads are targeted.

## Verified adapter paths

- Facebook: Page `/feed` -> persistent re-query
- Instagram: `/media` -> container ready -> `/media_publish` -> re-query
- Threads: `/threads` -> `/threads_publish` -> re-query
- Blogger: Google refresh token -> access token -> `posts.insert` -> `posts.get`
- Bluesky: App Password + stable DID -> `createSession` -> `createRecord` -> `getRecord`

## WordPress.com v3 adapter

The v3 adapter deliberately preserves the already-verified WordPress.com path instead of switching APIs:

1. OAuth 2.1 refresh token -> fresh access token
2. MCP `initialize`
3. `notifications/initialized`
4. `tools/call` using `wpcom-mcp-content-authoring`
5. `posts.create` as **draft**
6. `posts.get` in the same MCP session for persistent verification

Endpoints:

- OAuth token: `https://public-api.wordpress.com/oauth2-1/token`
- MCP: `https://public-api.wordpress.com/wpcom/v2/mcp/v1`

Site:

- `lifetolifeglobal.wordpress.com`

The first Agent integration remains draft-only because draft creation is the WordPress path already independently verified. Live publish should be enabled only after the draft adapter is verified and the token lifecycle is stable.

### WordPress setup / verification

Run:

```bash
bash setup-wordpress.sh
```

The script:

1. searches for the previously verified local WordPress.com OAuth token JSON without printing secrets,
2. validates the refresh token at the OAuth 2.1 token endpoint,
3. preserves a rotated refresh token if WordPress returns one,
4. stores the site, client ID, and effective refresh token as Worker secrets,
5. deploys verified-path v3,
6. checks `/health`,
7. performs a no-write dry run,
8. creates exactly one WordPress.com draft through the common Agent,
9. re-reads the created draft through MCP,
10. saves the response to `/tmp/lifetolife-wordpress-agent-test.json`.

If the old token file cannot be found or the refresh token has expired, the script stops instead of silently starting a new OAuth authorization flow.

## Other setup scripts

Meta initial setup / verification:

```bash
bash deploy-meta.sh
```

Facebook credential-only repair:

```bash
bash fix-facebook-token.sh
```

Bluesky + Blogger setup:

```bash
bash setup-bluesky-blogger.sh
```

Bluesky credential/DID repair:

```bash
bash fix-bluesky-password.sh
```

## Content fields

- `text`: required
- `targets`: required on `/v1/publish`
- `title`: optional; used by Blogger and WordPress.com
- `html`: optional; used by Blogger and WordPress.com
- `image_url`: required when Instagram is targeted
- `dry_run`: optional boolean

WordPress.com currently always creates a draft in verified-path v3.

## Result semantics

Each target returns its own result and is successful only after publishing/creation plus an authoritative follow-up read.

- HTTP `200`: all requested targets succeeded
- HTTP `207`: at least one target failed; per-target results remain available
- HTTP `400`: invalid common request or missing configuration

## Secret policy

Never commit passwords, app passwords, OAuth access/refresh tokens, client secrets, or the Distribution Agent key.

Production credentials are stored as Cloudflare Worker secrets. The local Distribution Agent key remains outside the repository at:

- `~/.config/lifetolife/distribution-agent-key`

Existing Blogger OAuth files remain outside the repository at:

- `~/.lifetolife-distribution/blogger/credentials.json`
- `~/.lifetolife-distribution/blogger/token.json`

The WordPress setup script searches existing local credential files and sends only the required values to Worker secrets; values are never written to this repository.

## Remaining sequence

1. Verify WordPress.com through the common Agent.
2. Integrate YouTube.
3. Harden the 7-channel Agent with stable OAuth lifecycle handling, idempotency, retries, logging, channel-specific content transformation, secret rotation, and scheduling.
