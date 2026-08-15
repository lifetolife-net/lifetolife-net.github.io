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
    "text": "Facebook-native copy"
  }
}
```

Instagram requires a public HTTPS `image_url` accepted by the existing adapter.

```json
"instagram": {
  "type": "json",
  "body": {
    "text": "Instagram-native caption",
    "image_url": "https://example.com/image.jpg"
  }
}
```

For YouTube, the trigger downloads a public HTTPS video URL and forwards it to the existing multipart upload route.

```json
"youtube": {
  "type": "youtube_video",
  "video_url": "https://example.com/video.mp4",
  "filename": "video.mp4",
  "title": "YouTube-native title",
  "description": "YouTube-native description",
  "privacy_status": "public"
}
```

## Assisted Manual packages

X, TikTok, and Reddit remain Assisted Manual. Their complete platform-native packages live in the same job but are never auto-posted by the trigger.

```json
"assisted_manual": {
  "x": { "text": "X-ready copy" },
  "tiktok": { "caption": "TikTok-ready caption" },
  "reddit": { "title": "Reddit-ready title", "body": "Reddit-ready body" }
}
```

## Safety and retry behavior

- No secret values belong in queue files.
- The trigger stores per-target state in the existing SQLite-backed Durable Object namespace.
- Successful targets are never retried for the same `job_id`.
- Failed targets may retry up to five times for the same file revision.
- A corrected queue file revision resets failed-target retry attempts, but still cannot republish a target that already succeeded.
- A claim remains in-flight for 20 minutes to reduce duplicate work during overlapping invocations.
- The trigger processes at most ten queue JSON files per scheduled run.

## Platform-native rule

The queue is an execution boundary, not a transformation engine. Each package must already conform to `docs/global-distribution-platform-native-policy.md`. Do not submit one generic source body to all channels.
