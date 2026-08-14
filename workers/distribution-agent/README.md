# LifeToLife Distribution Agent

Cloudflare Worker entry point for the common LifeToLife publishing pipeline.

Production endpoint after deployment:

- `https://distribution-api.lifetolife.net`

## Current scope

Phase 1 intentionally reuses only API paths that have already been individually verified for LifeToLife:

- Facebook Page: text post through `/{page-id}/feed`, followed by persistent re-query
- Instagram Business: image container through `/{ig-user-id}/media`, publish through `/{ig-user-id}/media_publish`, followed by persistent re-query
- Threads: text container through `/me/threads`, publish through `/me/threads_publish`, followed by persistent re-query

The common request can target all three or any subset. In Phase 1, `image_url` is consumed by Instagram; Facebook and Threads stay on their already-verified text paths.

## Secret policy

Do not commit any token or secret value.

Worker credentials are stored through Wrangler secrets. The local Distribution Agent authorization key is stored outside the repository at:

- `~/.config/lifetolife/distribution-agent-key`

with file mode `600`.

## Guided deployment and integrated test

Run:

```bash
bash deploy-meta.sh
```

The script:

1. checks Cloudflare authentication,
2. deploys the Worker and `distribution-api.lifetolife.net` custom domain,
3. creates or reuses a local Distribution Agent key,
4. securely prompts for the Facebook/Instagram/Threads access tokens without echoing them,
5. stores credentials as Worker secrets,
6. checks `/health`,
7. executes a no-publish dry run,
8. executes one real Meta 3-target integrated publishing test and saves the combined response to `/tmp/lifetolife-meta-integrated-test.json`.

The test image is a public HTTPS JPEG from `placehold.co` so Instagram can ingest it without adding a new LifeToLife media-hosting dependency solely for verification.

## Manual secret setup

If needed, the equivalent Wrangler secret names are:

```bash
npx wrangler secret put DISTRIBUTION_AGENT_KEY
npx wrangler secret put META_PAGE_ID
npx wrangler secret put META_PAGE_ACCESS_TOKEN
npx wrangler secret put INSTAGRAM_USER_ID
npx wrangler secret put INSTAGRAM_ACCESS_TOKEN
npx wrangler secret put THREADS_ACCESS_TOKEN
```

`INSTAGRAM_ACCESS_TOKEN` may reuse the Facebook Page token when that token is valid for the already-verified Instagram publishing path.

## Health check

```bash
curl -s https://distribution-api.lifetolife.net/health
```

Expected service name: `lifetolife-distribution-agent`.

## API request

```bash
curl -s -X POST "https://distribution-api.lifetolife.net/v1/publish/meta" \
  -H "Authorization: Bearer $DISTRIBUTION_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "LifeToLife Meta Distribution Agent integrated publishing test",
    "image_url": "https://placehold.co/1080x1080.jpg?text=LifeToLife+Distribution+Agent",
    "targets": ["facebook", "instagram", "threads"]
  }'
```

The response reports each platform independently. `ok: true` means every requested target published successfully and the created object was re-read from the platform API. A partial failure returns HTTP 207 and preserves each platform's result so a failed target can be diagnosed without repeating successful individual verification work.
