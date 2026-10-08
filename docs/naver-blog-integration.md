# NAVER Blog cafedo — Distribution Agent integration

Status: **read-only RSS adapter implemented in repository; deployed Worker route not yet verified** (2026-10-09 KST).

## Official API limitations
- NAVER discontinued the login-based Blog **write/post API on 2020-05-06**:
  https://developers.naver.com/notice/article/7527
- The current official **Blog Search API** is read-only and requires a separate NAVER Developers application, client ID and secret. Its search results are not a full edit/read API for a specific blogger:
  https://developers.naver.com/docs/serviceapi/search/blog/blog.md
- Public RSS remains supported and requires no login/client secret. Use HTTPS with HTTP/1.1 or later:
  https://developers.naver.com/notice/article/27228
- **DO NOT** use old writePost Swagger artifacts, cookie replay, undocumented endpoints, CAPTCHA bypass, headless-browser bulk posting, or the separate **Google Blogger** API to post to NAVER.

## Bound identity
- Blog: https://blog.naver.com/cafedo
- Read feed: https://rss.blog.naver.com/cafedo.xml
- Content: user's personally written BOM-reading notes; not an automatic GGEODI ad channel.
- Canon/YouTube mapping remains independent and evidence-grounded.
- No NAVER OAuth, access token, or secret is required to read the public RSS feed.

## Implementation
- Source: workers/distribution-agent/naver-blog-rss.js
- Tests: workers/distribution-agent/tests/naver-blog-rss.test.mjs
- Cloudflare Worker source integration: workers/distribution-agent/worker-v8-trigger.js
- Proposed endpoint **after deployment**: GET /v1/naver/blog/cafedo?limit=20
- The GET route requires the existing Distribution Agent Bearer credential.
- Range: limit 1–50; read the same fixed RSS URL regardless of user input.
- Data: blog name, canonical post URLs, post IDs, titles, dates, categories, short excerpts.
- **RSS excerpts are not the entire original posts**. Recent feed contents are not a full historical archive.
- The route returns 405 for non-GET requests, with a notice that publishing is manual.
- No automatic RSS polling job or publishing task is scheduled by this change.
- The production Auto Publish allowlist stays exactly the same eight platforms; NAVER is **not** an auto-publish target.

## Publication handoff
For a campaign with genuinely relevant NAVER content, Distribution Agent may create an optional assisted-manual NAVER copy pack (title, full user-approved body, source/related URLs).
- Do not auto-create or auto-edit the Naver post.
- User checks copy and publishes through the NAVER Blog editor.
- Only after actual publication, record the canonical Naver permalink and manual verification in the campaign ledger.
- An assisted-manual NAVER target must be marked incomplete until its permalink has been confirmed; do not mark the full publication as DONE early.
- Do not assume NAVER cafedo is the right channel for GGEODI product advertising merely because both are operated by the same person.

## Before enabling the production endpoint
1. Run Node test: node --test workers/distribution-agent/tests/naver-blog-rss.test.mjs.
2. Confirm HTTPS RSS returns expected cafedo posts without credentials.
3. Verify production Worker build resolves the new static import.
4. Deploy/redeploy only through the existing authorized Cloudflare Wrangler workflow with a pre-deploy baseline and rollback option.
5. Confirm Worker /health advertises the NAVER read mode; send an **authorized GET** to the new route and recheck current auto_targets still lists only the original eight.
6. Confirm no posts were created on NAVER and no unknown account credentials were accessed.

> Do not claim "production API connected" merely from a successful repository commit or local RSS fetch. Deployed production route is a separate verification gate.
