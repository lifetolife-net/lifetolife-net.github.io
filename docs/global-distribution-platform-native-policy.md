# LifeToLife Platform-Native Distribution Policy

Canonical policy date: 2026-08-15 KST

This is a **top-level operating rule** for LifeToLife global distribution. It applies to every current and future distribution channel, whether the final publish action is automated or manual.

## 1. No blind cross-posting

LifeToLife must **not** copy one source post unchanged across multiple platforms.

The canonical pipeline is:

`source content -> platform-native transformation -> platform-ready distribution package -> publish/hand-off -> verification/feedback`

The Distribution Agent is therefore not merely a cross-posting bot. Its responsibility is to transform a source into a package that can perform effectively on each destination platform.

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

## 3. Auto Publish channels

For an **Auto Publish** channel, the Distribution Agent should:

1. transform the source into the platform-native package,
2. validate provider-specific requirements,
3. perform the official API/MCP publish/upload,
4. re-read or otherwise verify the created object where the provider permits authoritative verification,
5. return the provider result and canonical link/ID,
6. retain enough non-secret operational metadata to diagnose failures and improve future distribution.

Automation is justified only when the value of automating the final publish is greater than the setup, review, policy, and maintenance burden.

## 4. Assisted Manual channels

For an **Assisted Manual** channel, the final platform click remains human, but content preparation is **not manual**.

The Distribution Agent/ChatGPT must prepare the complete platform-ready package and clearly tell the user what to publish.

Current explicit Assisted Manual channels:

- **X**: `x_ready_draft` with native hook, length, single-post/thread decision, media text, and link recommendation.
- **TikTok**: asset choice, caption, concise hashtags, cover/title suggestion, upload notes, CTA/link recommendation, and AI-content disclosure guidance where applicable.
- **Reddit**: `reddit_ready_post` for the owned subreddit with a natural search-oriented title, substantial self-contained body, optional canonical link, and no thin-link/repetitive-spam pattern.

The user's role should be reduced as far as practical to reviewing if desired and performing the final publish action.

## 5. Prohibited operating patterns

Do not:

- paste the same wording into every platform,
- prioritize a platform merely because its API is easy,
- create thin posts whose only purpose is to push a link,
- mass-repeat substantially identical posts in ways likely to be treated as spam,
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

As performance data accumulates, platform transformation rules should be revised. A format that performs poorly should not be preserved merely for consistency.

## 7. Source-of-truth synchronization

This policy is mirrored in the Google Sheets ledger `LifeToLife_Global_Distribution_Account_Ledger` -> `Rules` tab.

Every future Distribution Agent adapter, Assisted Manual workflow, scheduling workflow, and channel-opening decision must conform to this policy unless the canonical policy is explicitly revised in both GitHub and the Sheets ledger.
