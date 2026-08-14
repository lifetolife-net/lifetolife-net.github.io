# LifeToLife Distribution Agent

Cloudflare Worker entry point for the common LifeToLife publishing pipeline.

## Current scope

Phase 1 intentionally reuses only API paths that have already been individually verified for LifeToLife:

- Facebook Page: text post through `/{page-id}/feed`, followed by persistent re-query
- Instagram Business: image container through `/{ig-user-id}/media`, publish through `/{ig-user-id}/media_publish`, followed by persistent re-query
- Threads: text container through `/me/threads`, publish through `/me/threads_publish`, followed by persistent re-query

The common request can target all three or any subset. In Phase 1, `image_url` is consumed by Instagram; Facebook and Threads stay on their already-verified text paths.

## Secret policy

Do not commit any token or secret value.

Set these through Wrangler secrets:

```bash
wrangler secret put DISTRIBUTION_AGENT_KEY
wrangler secret put META_PAGE_ID
wrangler secret put META_PAGE_ACCESS_TOKEN
wrangler secret put INSTAGRAM_USER_ID
wrangler secret put INSTAGRAM_ACCESS_TOKEN
wrangler secret put THREADS_ACCESS_TOKEN
```

`INSTAGRAM_ACCESS_TOKEN` is optional when the same token used in `META_PAGE_ACCESS_TOKEN` is valid for the Instagram publishing calls, but keeping the two names separate is preferred for future credential rotation.

## Deploy

From this directory:

```bash
npx wrangler deploy
```

## Health check

```bash
curl -s https://<worker-url>/health
```

Expected service name: `lifetolife-distribution-agent`.

## Dry run

A dry run validates the common payload without publishing anything:

```bash
curl -s -X POST "https://<worker-url>/v1/publish/meta" \
  -H "Authorization: Bearer $DISTRIBUTION_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "LifeToLife Meta Distribution Agent dry run",
    "image_url": "https://<public-image-url>",
    "targets": ["facebook", "instagram", "threads"],
    "dry_run": true
  }'
```

## Integrated publish test

Use one public HTTPS image that Meta can fetch. The image is required because Instagram is included in the target set.

```bash
curl -s -X POST "https://<worker-url>/v1/publish/meta" \
  -H "Authorization: Bearer $DISTRIBUTION_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "LifeToLife Meta Distribution Agent integrated publishing test",
    "image_url": "https://<public-image-url>",
    "targets": ["facebook", "instagram", "threads"]
  }'
```

The response reports each platform independently. `ok: true` means every requested target published successfully and the created object was re-read from the platform API. A partial failure returns HTTP 207 and preserves each platform's result so a failed target can be diagnosed without repeating successful individual verification work.
