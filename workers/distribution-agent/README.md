# LifeToLife Distribution Agent

Cloudflare Worker entry point for the common LifeToLife publishing pipeline.

Production endpoint:

- `https://distribution-api.lifetolife.net`

## Integrated targets

The Agent intentionally reuses only publishing paths that were individually verified for LifeToLife before integration.

### Meta group

- Facebook Page: text post through `/{page-id}/feed`, followed by persistent re-query
- Instagram Business: image container through `/{ig-user-id}/media`, publish through `/{ig-user-id}/media_publish`, followed by persistent re-query
- Threads: text container through `/me/threads`, publish through `/me/threads_publish`, followed by persistent re-query

Meta 3-target integration was verified on 2026-08-15 KST.

### Text publishing group

- Bluesky: App Password -> `com.atproto.server.createSession` -> `com.atproto.repo.createRecord` -> `com.atproto.repo.getRecord`
- Blogger: OAuth refresh token -> fresh Google access token -> Blogger `posts.insert` -> `posts.get`

The Bluesky/Blogger adapter code is implemented in verified-path v2. Actual integrated publishing must be verified before these two targets are marked Agent-integrated in the canonical progress record.

## Secret policy

Do not commit any token, app password, OAuth client secret, or Distribution Agent key.

Worker credentials are stored through Wrangler secrets. The local Distribution Agent authorization key is stored outside the repository at:

- `~/.config/lifetolife/distribution-agent-key`

with file mode `600`.

The existing Blogger OAuth files remain outside the repository at:

- `~/.lifetolife-distribution/blogger/credentials.json`
- `~/.lifetolife-distribution/blogger/token.json`

`setup-bluesky-blogger.sh` reads those files locally and sends only the required values to Cloudflare Worker Secrets. It does not print or commit them.

## Meta deployment / verification

```bash
bash deploy-meta.sh
```

The script deploys the Worker, installs Meta secrets, checks `/health`, performs a dry run, and executes a Meta integrated publishing test.

For a Facebook Page token repair without repeating successful Instagram/Threads test posts:

```bash
bash fix-facebook-token.sh
```

## Bluesky + Blogger setup / verification

```bash
bash setup-bluesky-blogger.sh
```

The script:

1. validates the existing local Blogger OAuth credential/token files,
2. extracts Blogger client ID, optional client secret, and refresh token without printing them,
3. installs Blogger values as Worker secrets,
4. securely prompts once for the Bluesky App Password,
5. installs the Bluesky handle and App Password as Worker secrets,
6. deploys verified-path v2,
7. checks `/health`,
8. performs a Bluesky+Blogger dry run,
9. performs one real integrated publish to Bluesky and Blogger with persistent API re-query,
10. saves the combined response to `/tmp/lifetolife-bluesky-blogger-integrated-test.json`.

Known fixed identifiers used by the script:

- Bluesky: `lifetolife-net.bsky.social`
- Blogger Blog ID: `6980894376000692850`

## API endpoints

### Common endpoint

`POST /v1/publish`

`targets` is required and can currently contain:

- `facebook`
- `instagram`
- `threads`
- `bluesky`
- `blogger`

Example:

```bash
curl -s -X POST "https://distribution-api.lifetolife.net/v1/publish" \
  -H "Authorization: Bearer $DISTRIBUTION_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "LifeToLife example",
    "text": "LifeToLife common Distribution Agent example",
    "targets": ["bluesky", "blogger"]
  }'
```

### Backward-compatible Meta endpoint

`POST /v1/publish/meta`

This remains available for the already-verified Meta pipeline. When `targets` is omitted on this endpoint, Facebook, Instagram, and Threads are targeted.

## Content fields

- `text`: required
- `targets`: required on `/v1/publish`
- `title`: optional; used by Blogger
- `html`: optional; used by Blogger instead of escaped/plain-text HTML conversion
- `image_url`: required when Instagram is targeted
- `dry_run`: optional boolean

## Result semantics

Each target returns its own result. A target is considered successful only after publishing and a follow-up API read of the created object succeed.

- HTTP `200`: all requested targets succeeded
- HTTP `207`: at least one requested target failed, with per-target results preserved
- HTTP `400`: invalid common request or missing configuration before target execution

## Google OAuth lifecycle note

The Blogger OAuth project has been operating in Google's Testing lifecycle. Google documents that refresh tokens for an External consent screen in Testing generally expire after 7 days when non-basic scopes are involved. The current Blogger integration can therefore be verified now, but stable unattended production requires moving the OAuth consent configuration out of the temporary Testing lifecycle or otherwise establishing a production-stable authorization setup.
