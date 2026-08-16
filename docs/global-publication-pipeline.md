# LifeToLife End-to-End Publication Pipeline

Canonical policy date: 2026-08-16 KST

This document defines what LifeToLife means by **publish / 발행**.

A publication is not complete when copy is written, a queue job is created, or an API returns success. A publication is complete only when the source has been transformed for the intended platforms, search/discovery optimization has been applied, required media variants have been produced, QA has passed, publication has been explicitly approved, distribution has executed, created objects have been verified, and measurement has started.

Canonical flow:

`source final -> target manifest -> platform-native transformation -> platform search/discovery optimization -> media derivation -> final per-platform package -> QA -> publish approval -> distribution -> verification -> measurement`

## 1. One publication object

Every content release is managed as one **Publication** object with one stable `publication_id`.

The Publication contains:

- canonical source content,
- objective and audience,
- intended target manifest,
- platform-specific text packages,
- platform-specific search/discovery fields,
- derived image/video/audio assets,
- assisted-manual hand-off packages,
- QA state,
- explicit publish approval,
- provider publication results,
- canonical URLs/IDs,
- UTM information,
- measurement state and later performance observations.

A platform may be marked `not_applicable` only with an explicit reason. Completion is based on the declared target manifest, not on blindly maximizing channel count.

## 2. Pipeline stages and hard gates

### P0 — SOURCE_FINAL

The canonical human-facing source is finalized first.

For a Building NUNCHI entry this means the actual readable article/story is the source of truth. SEO wording must not replace the source with a keyword-stuffed synthetic article.

Required:

- canonical title,
- canonical body,
- campaign objective,
- canonical destination URL if one exists.

### P1 — TARGETS_DEFINED

Declare the intended channels for this publication before transformation.

Each channel must be one of:

- `auto_publish`,
- `assisted_manual`,
- `not_applicable` with reason,
- `deferred_asset` only while the publication is still in production.

A publication cannot reach final completion while an intended target remains `deferred_asset`.

### P2 — PLATFORM_TRANSFORMED

Create a native package for every intended platform.

Examples:

- WordPress/Blogger: long-form article package,
- Facebook/Threads: native social post,
- Bluesky/X: compact post,
- Reddit: community-native self-contained discussion post,
- Tumblr: text + tag-native package,
- Shorts/Reels/TikTok/Spotlight: vertical-video package.

Blind cross-posting is prohibited.

### P3 — DISCOVERY_OPTIMIZED

Run the mandatory per-platform search/discovery pass defined in `docs/global-distribution-search-discovery-policy.md`.

This stage is separate from platform transformation and cannot be skipped.

Depending on platform it can include:

- search-oriented title,
- opening query/problem,
- slug,
- search description/excerpt,
- labels/tags/hashtags,
- topic/category metadata,
- on-screen search phrase,
- spoken search phrase,
- thumbnail/cover wording,
- platform-specific CTA and link placement.

The governing rule is: **content first, optimization second**. Search optimization must help the original content become discoverable without flattening its voice.

### P4 — MEDIA_READY

Produce all media required by the target manifest.

For short-form NUNCHI distribution, the default derived asset is a 9:16 vertical master with:

- a 20–40 second script where appropriate,
- English narration for global-facing material unless the content calls for another language,
- authentic Korean words/phrases when they are part of the teaching/social cue,
- burned or platform-ready captions,
- visible hook,
- NUNCHI/product visuals or intentionally created illustration/graphics,
- clean audio mix,
- no placeholder media.

Create platform variants when the first seconds, cover, caption, CTA, duration, disclosure, or metadata should differ.

**Prototype audio is not production audio.** Free-plan or otherwise non-commercially licensed TTS may be used to select voices, test pacing, and review editorial direction, but it must never be embedded in a media asset that is about to enter public/commercial distribution unless its license explicitly allows that use. Before P4 can be marked `MEDIA_READY` for a commercial/publication cycle, every narration, dialogue, music, sound effect, image, and video component must have publication-appropriate usage rights.

For ElevenLabs specifically in the current NUNCHI workflow: Free-plan output is for internal voice selection/prototyping only. If ElevenLabs is used for a public NUNCHI release, the final narration/dialogue audio must be regenerated under a plan/license that permits commercial use before the final MP4 is rendered.

Text-only publications may mark this stage `not_required`, but only when no intended target requires media.

### P5 — QA_PASSED

Run publication QA before approval.

Minimum checks:

- source and platform packages are complete,
- search/discovery pass recorded for every intended target,
- links resolve to the intended destination,
- destination-specific UTM parameters are correct where used,
- no placeholder text/media remains,
- no unintended duplicated copy across channels,
- title/caption length and required fields are valid,
- video format/aspect ratio/audio/captions are valid where required,
- visible/spoken video topic matches metadata,
- disclosure requirements are satisfied where applicable,
- every media component has publication-appropriate usage rights and no prototype-only audio remains,
- public/private/draft state requested for each target is intentional,
- no completed `publication_id/job_id + target` will be accidentally republished.

QA failure returns the publication to the relevant earlier stage.

### P6 — APPROVED_TO_PUBLISH

Only after P0–P5 are complete may the publication receive explicit publish approval.

For automatic distribution this is the boundary at which a queue job may become:

- `status = ready`
- `approval = publish`

**No draft content package should enter the live queue merely because some channel copy is ready.**

### P7 — DISTRIBUTED

Execute distribution.

- Auto Publish targets: Distribution Agent performs the provider action.
- Assisted Manual targets: the complete platform-ready package is handed off so the remaining human action is the final platform publish/upload click.

A provider HTTP/API success alone does not complete the publication.

### P8 — VERIFIED

Verify every intended target after publication.

Record where available:

- provider object ID,
- canonical permalink,
- publication/public visibility state,
- re-query result,
- final title/caption/content identity,
- video processing/publication status.

Assisted Manual targets are marked complete only after their actual published URL/ID is recorded.

If verification shows `draft`, `private`, broken media, incorrect copy, or other unintended state, the target is not complete.

### P9 — MEASUREMENT_STARTED

Write the publication record to the canonical campaign ledger and begin measurement.

Minimum tracking:

- `publication_id` / campaign ID,
- target,
- permalink/ID,
- UTM source where relevant,
- content format,
- publish date/time,
- initial search/discovery phrase,
- baseline execution state.

Later observations can include impressions/reach, search/referral traffic, CTR, comments/replies, saves/shares, watch time/retention/completion, and downstream NUNCHI sessions/actions.

## 3. Definition of DONE

A Publication is `DONE` only when:

1. every intended target is verified published or explicitly `not_applicable` with a reason;
2. no intended media target remains deferred;
3. provider/manual publication URLs or IDs are recorded;
4. the campaign ledger has entered measurement state.

`queue created`, `API request sent`, `copy finished`, `video rendered`, or `some channels published` are intermediate states, never `DONE`.

## 4. Standard state machine

Use these states in order:

`SOURCE_FINAL`
-> `TARGETS_DEFINED`
-> `PLATFORM_TRANSFORMED`
-> `DISCOVERY_OPTIMIZED`
-> `MEDIA_READY`
-> `QA_PASSED`
-> `APPROVED_TO_PUBLISH`
-> `DISTRIBUTED`
-> `VERIFIED`
-> `MEASUREMENT_STARTED`
-> `DONE`

If a failure is discovered, move the publication back to the earliest stage that must be corrected rather than patching later output blindly.

## 5. Automation boundary

The long-term automation goal is:

**input:** one finalized source content item + objective

**system performs:**

1. target selection,
2. platform-native transformations,
3. per-platform search/discovery optimization,
4. short-form script extraction,
5. narration/audio preparation,
6. vertical media assembly,
7. captions and platform variants,
8. automated QA,
9. creation of one reviewable Publication package,
10. after explicit approval, automatic and assisted-manual distribution,
11. provider/manual verification,
12. campaign-ledger registration.

Human work should be concentrated at source approval and any platform that still requires a final manual publish action.

## 6. Current NUNCHI starting point

`Building NUNCHI #1: Can You Turn “Nunchi” Into a Game?` is the canonical source for the first full use of this pipeline.

The earlier `nunchi-intro-2026-08-16-01` queue job predates this pipeline and must be treated as a partial/legacy first campaign run, not as proof that the full Publication process is complete.

The next proper publication should begin again from the canonical Building NUNCHI #1 source, produce all intended platform packages and required short-form assets, pass discovery optimization and QA, and only then receive publish approval.

## 7. Related canonical documents

- Platform-native transformation: `docs/global-distribution-platform-native-policy.md`
- Search/discovery optimization: `docs/global-distribution-search-discovery-policy.md`
- Distribution queue schema: `distribution/JOB_SCHEMA.md`
- Network state/progress: `docs/global-distribution-progress.md`
- Measurement/account ledger: Google Sheets `LifeToLife_Global_Distribution_Account_Ledger`
