# LifeToLife Platform-Native Distribution Policy

Canonical policy date: 2026-08-16 KST

This is a **top-level operating rule** for LifeToLife global distribution. It applies to every current and future distribution channel, whether the final publish action is automated or manual.

The end-to-end definition of `publish / 발행` is canonical in `docs/global-publication-pipeline.md`. Platform transformation and search optimization are mandatory stages inside that larger Publication Pipeline.

## 1. No blind cross-posting

LifeToLife must **not** copy one source post unchanged across multiple platforms.

The canonical distribution segment is:

`source content -> platform-native transformation -> search/discovery optimization -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

The complete Publication Pipeline additionally includes target declaration, required media production, QA, explicit approval, distribution verification and measurement.

The Distribution Agent is therefore not merely a cross-posting bot. Its responsibility is to transform a source into a package that can perform effectively on each destination platform.

The mandatory platform-specific search/discovery rules are defined in `docs/global-distribution-search-discovery-policy.md`.

## 2. Platform-native transformation is mandatory

For every destination, adapt the package to the platform's current native behavior and discovery mechanics. Depending on the platform, this includes:

- opening hook and information order,
- title and post length,
- long-form vs short-form structure,
- single post vs thread/series,
- caption and description,
- tags / hashtags,
- search-oriented keywords without keyword stuffing,
- link placement and whether a link should be included at all,
- CTA style,
- image/video selection,
- aspect ratio, duration, cover/title, thumbnail and other media requirements,
- accessibility metadata where useful,
- AI-generated-content disclosure requirements,
- subreddit/community/context-specific framing,
- platform policy and spam-risk constraints,
- any other destination-specific metadata needed for discovery or presentation.

A platform-ready package may therefore be materially different in wording, length, asset choice, and structure from the source and from packages created for other platforms.

**Platform-native transformation alone is not sufficient.** Before `ready + publish`, every package must also pass the destination-specific search/discovery policy. This includes the wording that people can search, recommendation signals that the platform can infer, and metadata/taxonomy that the destination actually indexes.

## 3. Auto Publish channels

For an **Auto Publish** channel, the Distribution Agent should:

1. transform the source into the platform-native package,
2. apply the search/discovery optimization pass,
3. validate provider-specific requirements,
4. perform the official API/MCP publish/upload,
5. re-read or otherwise verify the created object where the provider permits authoritative verification,
6. return the provider result and canonical link/ID,
7. retain enough non-secret operational metadata to diagnose failures and improve future distribution.

Automation is justified only when the value of automating the final publish is greater than the setup, review, policy, and maintenance burden.

A campaign intended for public discovery must not silently end as a draft, private object, placeholder asset, or otherwise non-indexable object unless that state was explicitly requested.

## 4. Assisted Manual channels

For an **Assisted Manual** channel, the final platform click remains human, but content preparation is **not manual**.

The Distribution Agent/ChatGPT must prepare the complete platform-ready, search/discovery-optimized package and clearly tell the user what to publish.

Current explicit Assisted Manual channels:

- **X**: `x_ready_draft` with native hook, length, single-post/thread decision, media text, search terms/hashtags, and link recommendation.
- **TikTok**: asset choice, on-screen/spoken search phrase, caption, concise hashtags, cover/title suggestion, upload notes, CTA/link recommendation, and AI-content disclosure guidance where applicable.
- **Reddit**: `reddit_ready_post` for the owned subreddit with a natural search-oriented title, substantial self-contained body, optional canonical link, and no thin-link/repetitive-spam pattern.
- **Snapchat**: manual Spotlight hand-off with visible/spoken topic, description/keywords/#Topics where available, completion-oriented vertical asset, and no auto-publish claim while Public Profile API allowlisting remains unconfirmed.

The user's role should be reduced as far as practical to reviewing if desired and performing the final publish action.

## 5. Prohibited operating patterns

Do not:

- paste the same wording into every platform,
- prioritize a platform merely because its API is easy,
- create thin posts whose only purpose is to push a link,
- mass-repeat substantially identical posts in ways likely to be treated as spam,
- stuff keywords, tags, or hashtags merely to increase apparent coverage,
- optimize metadata for a query that the visible/spoken content does not actually satisfy,
- ignore platform-specific media or disclosure rules,
- require the user to learn and manually reproduce each platform's optimization practices when the Agent can prepare them,
- optimize for channel count at the expense of actual discovery or usefulness.

## 6. Success criteria

Success is not the number of channels connected.

Evaluate distribution by a combination of:

- discovery/recommendation reach,
- search/indexing value,
- click-through or downstream action where relevant,
- engagement appropriate to the platform,
- content/platform fit,
- persistence and reusability of the published asset,
- human effort required,
- API/policy/maintenance burden.

As performance data accumulates, platform transformation and search/discovery rules should be revised. A format that performs poorly should not be preserved merely for consistency.

A full Publication is `DONE` only according to `docs/global-publication-pipeline.md`; partial channel execution is not equivalent to completion.

## 7. Source-of-truth synchronization

This policy is mirrored in the Google Sheets ledger `LifeToLife_Global_Distribution_Account_Ledger` -> `Rules` tab.

The detailed per-platform implementation is canonical in `docs/global-distribution-search-discovery-policy.md` and should be summarized in the Sheets ledger.

The end-to-end publication state machine is canonical in `docs/global-publication-pipeline.md`.

Every future Distribution Agent adapter, Assisted Manual workflow, scheduling workflow, and channel-opening decision must conform to these policies unless the canonical policy is explicitly revised in both GitHub and the Sheets ledger.
