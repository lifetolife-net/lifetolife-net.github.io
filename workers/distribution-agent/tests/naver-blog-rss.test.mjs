import assert from "node:assert/strict";
import test from "node:test";
import {
  NAVER_BLOG_RSS,
  fetchNaverBlogRss,
  parseNaverBlogRss,
  prepareNaverManualDraft,
} from "../naver-blog-rss.js";

const sample = '<?xml version="1.0"?>' +
  '<rss version="2.0"><channel><title><![CDATA[도서출판 봄나라]]></title>' +
  '<item><title><![CDATA[봄 1. 한번 깨어나 살자꾸나!]]></title>' +
  '<link>https://blog.naver.com/cafedo/224335657877?fromRss=true</link>' +
  '<pubDate>Fri, 03 Jul 2026 20:22:07 +0900</pubDate>' +
  '<category><![CDATA[제1권]]></category>' +
  '<description><![CDATA[<p>저자의 실제 <b>낭독</b></p>]]></description></item>' +
  '<item><title>other</title><link>https://evil.example.net/cafedo/1</link></item>' +
  '<item><title>same</title><link>https://blog.naver.com/cafedo/224335657877</link></item>' +
  '</channel></rss>';

test("parses the expected blog and canonicalizes each unique post", () => {
  const parsed = parseNaverBlogRss(sample, 10);
  assert.equal(parsed.blog_id, "cafedo");
  assert.equal(parsed.blog_title, "도서출판 봄나라");
  assert.equal(parsed.items_returned, 1);
  assert.equal(parsed.posts[0].post_id, "224335657877");
  assert.equal(parsed.posts[0].url, "https://blog.naver.com/cafedo/224335657877");
  assert.equal(parsed.posts[0].excerpt, "저자의 실제 낭독");
  assert.equal(parsed.posts[0].excerpt_only, true);
  assert.equal(parsed.historical_archive_complete, false);
  assert.equal(parsed.publish_capability, "assisted_manual_only");
});

test("rejects DTD and invalid limit", () => {
  assert.throws(() => parseNaverBlogRss('<!DOCTYPE rss>' + sample), /DTD/);
  assert.throws(() => parseNaverBlogRss(sample, 51), /limit/);
  assert.throws(() => parseNaverBlogRss(sample, 0), /limit/);
});

test("makes a single fixed-origin read-only request", async () => {
  let usedUrl;
  const fetcher = async (url, opts) => {
    usedUrl = url;
    assert.equal(opts.method, "GET");
    assert.equal(opts.redirect, "error");
    return { ok: true, text: async () => sample };
  };
  const parsed = await fetchNaverBlogRss({ fetcher, limit: 5 });
  assert.equal(usedUrl, NAVER_BLOG_RSS);
  assert.equal(parsed.items_returned, 1);
});

test("manual draft never claims a Naver post was published", () => {
  const draft = prepareNaverManualDraft({
    publication_id: "bom-1",
    title: "본문 안내",
    body: "출처를 정확히 밝혀 주세요.",
    related_urls: ["https://canon.bomnara.com/bom/000002/", "javascript:alert(1)"],
  });
  assert.equal(draft.mode, "assisted_manual");
  assert.equal(draft.status, "draft_requires_manual_publish");
  assert.deepEqual(draft.related_urls, ["https://canon.bomnara.com/bom/000002/"]);
  assert.ok(!Object.hasOwn(draft, "published_url"));
});
