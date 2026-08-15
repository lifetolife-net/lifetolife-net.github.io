import baseWorker, { WordPressAuthState } from "./worker-v8-tumblr-safe-verify.js";

export { WordPressAuthState };

const UA = "LifeToLife-Distribution-Agent/1.0 (+https://lifetolife.net)";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return String(value);
}

function authorize(request, env) {
  return (request.headers.get("authorization") || "") === `Bearer ${requiredEnv(env, "DISTRIBUTION_AGENT_KEY")}`;
}

function publicError(error) {
  return {
    message: error?.message || String(error),
    provider: error?.provider || undefined,
    details: error?.providerDetails || undefined,
  };
}

function providerError(response, text, fallback) {
  const compact = String(text || "").replace(/\s+/g, " ").trim().slice(0, 600);
  const error = new Error(compact || fallback || `Hatena request failed with HTTP ${response.status}`);
  error.provider = "hatena";
  error.status = response.status;
  error.providerDetails = { http_status: response.status, response_excerpt: compact || undefined };
  return error;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function extractTag(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, "").trim()) : null;
}

function extractLink(xml, rel) {
  const safeRel = String(rel).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re1 = new RegExp(`<link\\b[^>]*\\brel=["']${safeRel}["'][^>]*\\bhref=["']([^"']+)["'][^>]*>`, "i");
  const re2 = new RegExp(`<link\\b[^>]*\\bhref=["']([^"']+)["'][^>]*\\brel=["']${safeRel}["'][^>]*>`, "i");
  const match = String(xml || "").match(re1) || String(xml || "").match(re2);
  return match ? decodeXml(match[1]) : null;
}

function normalizeCategories(value) {
  const input = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return [...new Set(input.map(v => String(v).trim()).filter(Boolean))].slice(0, 20);
}

function base64Ascii(value) {
  try {
    return btoa(value);
  } catch {
    throw new Error("Hatena ID/API key must be compatible with HTTP Basic authentication");
  }
}

function hatenaBaseUrl(env) {
  const id = requiredEnv(env, "HATENA_ID").trim();
  const blogId = requiredEnv(env, "HATENA_BLOG_ID").trim();
  if (!id || !blogId) throw new Error("HATENA_ID and HATENA_BLOG_ID must not be empty");
  return `https://blog.hatena.ne.jp/${encodeURIComponent(id)}/${encodeURIComponent(blogId)}/atom`;
}

function hatenaCollectionUrl(env) {
  return `${hatenaBaseUrl(env)}/entry`;
}

function hatenaHeaders(env, { xml = false } = {}) {
  const id = requiredEnv(env, "HATENA_ID").trim();
  const apiKey = requiredEnv(env, "HATENA_API_KEY");
  return {
    Authorization: `Basic ${base64Ascii(`${id}:${apiKey}`)}`,
    Accept: "application/atom+xml",
    "user-agent": UA,
    ...(xml ? { "content-type": "application/atom+xml; charset=utf-8" } : {}),
  };
}

async function hatenaFetch(env, url, { method = "GET", xmlBody } = {}) {
  const response = await fetch(url, {
    method,
    headers: hatenaHeaders(env, { xml: xmlBody !== undefined }),
    body: xmlBody,
  });
  const text = await response.text();
  if (!response.ok) throw providerError(response, text, `${method} ${url} failed`);
  return { response, text };
}

function makeEntryXml(env, { title, text, categories, draft }) {
  const id = requiredEnv(env, "HATENA_ID").trim();
  const categoryXml = normalizeCategories(categories)
    .map(category => `<category term="${xmlEscape(category)}" />`)
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app">` +
    `<title>${xmlEscape(title)}</title>` +
    `<author><name>${xmlEscape(id)}</name></author>` +
    `<content type="text/plain">${xmlEscape(text)}</content>` +
    categoryXml +
    `<app:control><app:draft>${draft ? "yes" : "no"}</app:draft><app:preview>no</app:preview></app:control>` +
    `</entry>`;
}

async function verifyHatenaAccess(env) {
  const serviceUrl = hatenaBaseUrl(env);
  const verified = await hatenaFetch(env, serviceUrl, { method: "GET" });
  return {
    ok: true,
    target: "hatena-auth",
    mode: "atompub-service-document-check-v8",
    service_document_reachable: verified.response.status === 200,
    http_status: verified.response.status,
    blog_id: requiredEnv(env, "HATENA_BLOG_ID").trim(),
    secret_values_returned: false,
  };
}

async function publishHatena(env, body) {
  const collectionUrl = hatenaCollectionUrl(env);
  const xml = makeEntryXml(env, body);
  const created = await hatenaFetch(env, collectionUrl, { method: "POST", xmlBody: xml });
  if (created.response.status !== 201) {
    throw providerError(created.response, created.text, `Hatena create returned HTTP ${created.response.status}, expected 201`);
  }

  const memberUri = created.response.headers.get("location") || extractLink(created.text, "edit");
  if (!memberUri) throw new Error("Hatena create response contained no Location/member URI");
  const memberUrl = new URL(memberUri, collectionUrl).toString();
  if (!memberUrl.startsWith("https://blog.hatena.ne.jp/")) throw new Error("Hatena member URI did not use the expected HTTPS origin");

  const verified = await hatenaFetch(env, memberUrl, { method: "GET" });
  const permalink = extractLink(verified.text, "alternate");
  const entryId = extractTag(verified.text, "id") || extractTag(created.text, "id");
  const fetchedTitle = extractTag(verified.text, "title");

  return {
    ok: true,
    target: "hatena",
    mode: "atompub-basic-create-plus-member-requery-v8",
    id: entryId,
    member_uri: memberUrl,
    permalink,
    verification: {
      requery_succeeded: true,
      member_http_status: verified.response.status,
      title: fetchedTitle,
      draft: Boolean(body.draft),
      blog_id: requiredEnv(env, "HATENA_BLOG_ID").trim(),
      secret_values_returned: false,
    },
  };
}

function forwardRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
}

async function handlePublish(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  const targets = Array.isArray(body?.targets) ? [...new Set(body.targets.map(v => String(v).toLowerCase()))] : [];
  if (!targets.includes("hatena")) return baseWorker.fetch(request, env, ctx);
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  const text = String(body?.text || "").trim();
  const title = String(body?.title || "").trim();
  if (!title) return json({ ok: false, error: "title is required for Hatena Blog" }, 400);
  if (!text) return json({ ok: false, error: "text is required for Hatena Blog" }, 400);
  const otherTargets = targets.filter(target => target !== "hatena");
  const draft = body?.hatena_draft === true;

  if (body?.dry_run === true) {
    let basePlan = {};
    if (otherTargets.length) {
      const response = await baseWorker.fetch(forwardRequest(request, { ...body, targets: otherTargets, dry_run: true }), env, ctx);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) return json(payload, response.status);
      basePlan = payload.plan || {};
    }
    return json({
      ok: true,
      dry_run: true,
      plan: { ...basePlan, hatena: "HTTPS Basic auth (Hatena ID + blog API key) -> AtomPub POST /atom/entry -> GET Location member URI" },
      content: { title, text, targets, hatena_categories: normalizeCategories(body?.hatena_categories), hatena_draft: draft },
      secret_values_returned: false,
    });
  }

  let hatenaResult;
  try {
    hatenaResult = await publishHatena(env, {
      title,
      text,
      categories: body?.hatena_categories,
      draft,
    });
  } catch (error) {
    hatenaResult = { ok: false, target: "hatena", error: publicError(error) };
  }

  let baseStatus = 200;
  let baseResults = {};
  if (otherTargets.length) {
    const response = await baseWorker.fetch(forwardRequest(request, { ...body, targets: otherTargets }), env, ctx);
    baseStatus = response.status;
    const payload = await response.json().catch(() => ({ results: {} }));
    baseResults = payload?.results || {};
  }

  const results = { ...baseResults, hatena: hatenaResult };
  const ok = targets.every(target => results[target]?.ok === true);
  return json({
    ok,
    results,
    request: { title, text, targets, hatena_categories: normalizeCategories(body?.hatena_categories), hatena_draft: draft },
    base_http_status: otherTargets.length ? baseStatus : null,
  }, ok ? 200 : 207);
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/v1/verify/hatena" && request.method === "POST") {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      try {
        return json(await verifyHatenaAccess(env));
      } catch (error) {
        return json({ ok: false, target: "hatena-auth", error: publicError(error), secret_values_returned: false }, 502);
      }
    }
    if (path === "/health") {
      const response = await baseWorker.fetch(request, env, ctx);
      const payload = await response.json().catch(() => ({}));
      return json({ ...payload, hatena_publish_adapter: "prepared-unverified", hatena_auth_mode: "basic-over-https" }, response.status);
    }
    if (path === "/v1/publish" && request.method === "POST") return handlePublish(request, env, ctx);
    return baseWorker.fetch(request, env, ctx);
  },
};
