# NUNCHI Publication Loop

Canonical name: **NUNCHI Publication Loop**
Canonical date: 2026-08-16 KST

This is the permanent recurring operating loop for publishing and distributing NUNCHI content.

## Naming

- **LifeToLife Publication Pipeline** = the general end-to-end publishing engine used by LifeToLife products.
- **NUNCHI Publication Loop** = the repeated NUNCHI-specific operation that runs the Publication Pipeline again and again for every NUNCHI content item.
- **Publication Cycle** = one complete iteration of the NUNCHI Publication Loop for one canonical source item.

Examples:

- `Building NUNCHI #1` = Publication Cycle 1 source.
- `Building NUNCHI #2` = a later Publication Cycle source.
- A gameplay clip, release note, character story, culture explainer, feature update, development diary, or other approved NUNCHI source may each start its own Publication Cycle.

## Permanent rule

Whenever the user says any of the following in the NUNCHI project:

- `발행하자`
- `배포하자`
- `발행 파이프라인 돌려`
- `Publication Loop 돌려`
- `NUNCHI Publication Loop`

interpret it as a request to run one complete Publication Cycle unless the user explicitly limits the scope.

A Publication Cycle means:

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

The detailed requirements are defined in `docs/global-publication-pipeline.md`.

## Non-negotiable gates

Every cycle must preserve these rules:

1. The canonical source comes first; SEO must not flatten or replace it.
2. Every target receives a platform-native transformation.
3. Every target receives a platform-specific search/discovery optimization pass.
4. Media-required channels must receive real media, including narration/audio/captions when appropriate; no placeholder asset is allowed merely to complete channel count.
5. `ready + publish` is allowed only after content, discovery optimization, media, and QA are complete.
6. Distribution success is not completion; every target must be verified.
7. Measurement must begin before the cycle is `DONE`.
8. Actual performance should feed the next Publication Cycle so the loop improves over time.

## Repetition and scale

This loop is intended to run hundreds or thousands of times. Therefore the process must not depend on conversational memory alone.

The source of truth is this repository documentation plus the Google Sheets campaign ledger. Future automation should read and enforce these states rather than relying on an assistant remembering an informal conversation.

## Learning loop

After each Publication Cycle:

`publish -> measure -> learn -> update transformation/search/media rules -> next source -> next Publication Cycle`

This feedback loop is part of the NUNCHI Publication Loop, not optional post-processing.

## Related canonical files

- `docs/global-publication-pipeline.md`
- `docs/global-distribution-platform-native-policy.md`
- `docs/global-distribution-search-discovery-policy.md`
- `distribution/JOB_SCHEMA.md`
- `docs/global-distribution-progress.md`
- Google Sheets: `LifeToLife_Global_Distribution_Account_Ledger`
