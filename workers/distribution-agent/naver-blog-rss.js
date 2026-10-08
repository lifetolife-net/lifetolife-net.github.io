/**
 * NAVER Blog adapter for LifeToLife Distribution Agent.
 *
 * Supported: public RSS read / manual-publish handoff.
 * NOT supported: creating, editing or deleting Naver posts.
 *
 * NAVER ended the login-based Blog write API on 2020-05-06:
 * https://developers.naver.com/notice/article/7527
 *
 * This adapter uses no private credentials and never changes a Naver post.
 */
export const NAVER_BLOG_ID = "cafedo";
export const NAVER_BLOG_HOME = "https://blog.naver.com/cafedo";
export const NAVER_BLOG_RSS = "https://rss.blog.naver.com/cafedo.xml";

const MAX_ITEMS = 50;
const MAX_XML_CHARACTERS = 2_000_000;

function decodeXml(value) {
  return String(value ?? "").replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, (raw, entity) => {
    const names = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    const lower = entity.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(names, lower)) return names[lower];
    const value = lower.startsWith("#x")
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    return Number.isInteger(value) && value > 0 && value <= 0x10ffff &&
      !(value >= 0xd800 && value <= 0xdfff)
      ? String.fromCodePoint(value)
      : raw;
  });
}

function tagValue(block, tag) {
  // Tag names are fixed at call sites; never accept user-supplied tag names.
  const found = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + "\\s*>", "i").exec(block);
  if (!found) return "";
  const raw = found[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(raw);
  return decodeXml(cdata ? cdata[1] : raw).trim();
}

function plainText(value, maxLength = 500) {
  const result = decodeXml(String(value))
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result.slice(0, maxLength);
}

function cleanPostUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !["blog.naver.com", "m.blog.naver.com"].includes(parsed.hostname)) {
    return null;
  }
  const match = /^\/cafedo\/([0-9]+)\/?$/.exec(parsed.pathname);
  if (!match) return null;
  return {
    post_id: match[1],
    url: "https://blog.naver.com/cafedo/" + match[1],
  };
}

/**
 * Parse public RSS feed. This is a recent-items feed, NOT a complete
 * historical archive. Summaries must NOT be represented as complete posts.
 */
export function parseNaverBlogRss(xml, requestedLimit = 20) {
  if (typeof xml !== "string" || xml.length < 20 || xml.length > MAX_XML_CHARACTERS) {
    throw new Error("Invalid RSS size");
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    throw new Error("Unexpected DTD in RSS");
  }
  const limit = Number(requestedLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ITEMS) {
    throw new Error("limit must be an integer between 1 and 50");
  }
  if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) {
    throw new Error("Not an RSS feed");
  }
  const header = xml.split(/<item(?:\s|>)/i, 1)[0];
  const posts = [];
  const seen = new Set();
  const itemRegex = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi;
  for (const match of xml.matchAll(itemRegex)) {
    const chunk = match[1];
    const location = cleanPostUrl(tagValue(chunk, "link"));
    if (!location || seen.has(location.post_id)) continue;
    seen.add(location.post_id);
    const title = plainText(tagValue(chunk, "title"), 250);
    if (!title) continue;
    posts.push({
      post_id: location.post_id,
      title,
      url: location.url,
      published_at: tagValue(chunk, "pubDate").slice(0, 100),
      category: plainText(tagValue(chunk, "category"), 120),
      excerpt: plainText(tagValue(chunk, "description"), 500),
      excerpt_only: true,
    });
    if (posts.length >= limit) break;
  }
  return {
    provider: "naver_blog",
    blog_id: NAVER_BLOG_ID,
    blog_title: plainText(tagValue(header, "title"), 160),
    blog_url: NAVER_BLOG_HOME,
    feed_url: NAVER_BLOG_RSS,
    access: "public_rss_read_only",
    publish_capability: "assisted_manual_only",
    items_returned: posts.length,
    historical_archive_complete: false,
    posts,
  };
}

export async function fetchNaverBlogRss({ fetcher = fetch, limit = 20 } = {}) {
  if (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > MAX_ITEMS) {
    throw new Error("limit must be an integer between 1 and 50");
  }
  const response = await fetcher(NAVER_BLOG_RSS, {
    method: "GET",
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error("NAVER RSS unavailable: HTTP " + response.status);
  }
  const xml = await response.text();
  return parseNaverBlogRss(xml, Number(limit));
}

/** Prepared copy does not authorize, create or simulate a Naver Blog post. */
export function prepareNaverManualDraft({ publication_id, title, body, related_urls = [] }) {
  if (!publication_id || !title || !body) {
    throw new Error("publication_id, title and body are required");
  }
  return {
    channel: "naver_blog_cafedo",
    mode: "assisted_manual",
    status: "draft_requires_manual_publish",
    publication_id: String(publication_id),
    title: String(title).trim(),
    body: String(body).trim(),
    related_urls: related_urls.filter((url) => {
      try {
        const u = new URL(url);
        return u.protocol === "https:" && !u.username && !u.password;
      } catch {
        return false;
      }
    }),
    manual_destination: NAVER_BLOG_HOME,
    note: "Human review and native Naver Blog posting required; never mark published without permalink.",
  };
}
