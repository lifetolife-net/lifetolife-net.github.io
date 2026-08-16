# LifeToLife Distribution Job v1

Canonical trigger input schema: `lifetolife.distribution-job.v1`.

The trigger polls `distribution/queue/*.json` every 5 minutes. A queue job is only executable with explicit `status: ready` and `approval: publish`.

## Required envelope

```json
{
  "schema": "lifetolife.distribution-job.v1",
  "job_id": "unique-stable-id",
  "status": "ready",
  "approval": "publish",
  "source": {},
  "auto_publish": {},
  "assisted_manual": {}
}
```

`job_id` is the permanent deduplication identity. After a target succeeds for a job ID, editing that file cannot republish the same target. Use a new `job_id` for an intentional new publication.

Optional scheduling guards:

- `not_before`: ISO-8601 timestamp. The job is skipped until that time.
- `expires_at`: ISO-8601 timestamp. The job is skipped after that time.

## Mandatory search/discovery pass

Before a real campaign becomes `ready + publish`, every destination package must conform to both:

- `docs/global-distribution-platform-native-policy.md`
- `docs/global-distribution-search-discovery-policy.md`

Recommended source metadata:

```json
"source": {
  "title": "Canonical source title",
  "canonical_url": "https://example.com/",
  "campaign": "campaign_key",
  "search_discovery_pass": "completed-YYYY-MM-DD",
  "primary_intent": "primary audience query/topic",
  "secondary_intents": ["supporting intent"]
}
```

Intent fields document the strategy; they do not claim keyword search-volume rankings.

## Auto Publish packages

Current trigger targets are the eight verified channels:

- `facebook`
- `instagram`
- `threads`
- `bluesky`
- `blogger`
- `wordpress`
- `tumblr`
- `youtube`

For JSON targets, use a platform-specific body. The trigger forces `targets` to contain only the current target before calling the Distribution Agent.

```json
"facebook": {
  "type": "json",
  "body": {
    "text": "Facebook-native, search/discovery-aware copy"
  }
}
```

Instagram requires a public HTTPS `image_url` accepted by the existing adapter. The visible media should satisfy the same topic as the caption rather than relying on metadata alone.

```json
"instagram": {
  "type": "json",
  "body": {
    "text": "Instagram-native caption",
    "image_url": "https://example.com/image.jpg"
  }
}
```

Blogger packages should carry search-oriented title/body plus labels when supported by the deployed adapter:

```json
"blogger": {
  "type": "json",
  "body": {
    "title": "Concise search-oriented title",
    "text": "Useful self-contained article body",
    "blogger_labels": ["Specific topic", "Related topic"]
  }
}
```

WordPress packages may document the desired public/search metadata. These fields require the corresponding adapter support to be deployed before they are considered technically active:

```json
"wordpress": {
  "type": "json",
  "body": {
    "title": "Search-oriented visible title",
    "text": "Useful article body",
    "wordpress_status": "publish",
    "wordpress_slug": "descriptive-slug",
    "wordpress_excerpt": "Accurate concise description",
    "wordpress_seo_title": "Search title",
    "wordpress_seo_description": "Search description",
    "wordpress_tags": ["Specific topic"]
  }
}
```

Tumblr's deployed publish layer accepts dedicated tags and an optional source URL:

```json
"tumblr": {
  "type": "json",
  "body": {
    "title": "Tumblr-native title",
    "text": "Tumblr-native body",
    "tumblr_tags": ["most important tag", "second tag"],
    "tumblr_source_url": "https://example.com/"
  }
}
```

For YouTube, the trigger downloads a public HTTPS video URL and forwards it to the existing multipart upload route. Title, description and the actual video content should target the same viewer intent.

```json
"youtube": {
  "type": "youtube_video",
  "video_url": "https://example.com/video.mp4",
  "filename": "video.mp4",
  "title": "YouTube-native search title",
  "description": "YouTube-native description",
  "privacy_status": "public"
}
```

## Media that does not exist yet

Do not add Instagram or YouTube to `auto_publish` with fake/placeholder media. A job may preserve the approved future package under an ignored top-level planning object such as `deferred_auto_publish` until a real asset exists. The trigger only executes packages inside `auto_publish`.

## Assisted Manual packages

X, TikTok, Reddit and Snapchat remain Assisted Manual. Their complete platform-native/search-ready packages may live in the same job but are never auto-posted by the trigger.

```json
"assisted_manual": {
  "x": {
    "text": "X-ready copy with natural query terms and at most two relevant hashtags"
  },
  "tiktok": {
    "asset_required": true,
    "on_screen_hook": "Visible search phrase",
    "spoken_topic": "Topic expressed in the video",
    "caption": "TikTok-ready caption",
    "hashtags": ["RelevantTopic"]
  },
  "reddit": {
    "title": "Natural searchable Reddit title",
    "body": "Substantial self-contained body"
  },
  "snapchat": {
    "asset_required": true,
    "spotlight_hook": "Visible topic",
    "description": "Spotlight-ready description",
    "topics": ["Relevant Topic"]
  }
}
```

Snapchat remains a manual Spotlight hand-off until Public Profile API allowlisting is formally confirmed.

## Safety and retry behavior

- No secret values belong in queue files.
- The trigger stores per-target state in the existing SQLite-backed Durable Object namespace.
- Successful targets are never retried for the same `job_id`.
- Failed targets may retry up to five times for the same file revision.
- A corrected queue file revision resets failed-target retry attempts, but still cannot republish a target that already succeeded.
- A claim remains in-flight for 20 minutes to reduce duplicate work during overlapping invocations.
- The trigger processes at most ten queue JSON files per scheduled run.
- Search/discovery optimization must never be used as a reason to circumvent platform spam, originality, or disclosure rules.

## Adapter capability warning

Queue metadata is not the same as deployed capability. A field is considered active only when the production adapter actually forwards it to the provider and the resulting object is verified.

As of 2026-08-16:

- Tumblr `tumblr_tags` is implemented in the canonical v8 source chain.
- Blogger `blogger_labels` is documented but the current deployed adapter path must be enhanced before label forwarding can be claimed.
- WordPress public status/slug/excerpt/SEO/taxonomy fields are documented but the current adapter hardcodes draft creation; an adapter upgrade is required before public search optimization can be claimed.

## Platform-native rule

The queue is an execution boundary, not a transformation engine. Each package must already conform to both canonical distribution policies. Do not submit one generic source body to all channels.
