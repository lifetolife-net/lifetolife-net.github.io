import baseWorker, { WordPressAuthState as BaseWordPressAuthState } from "./worker-v8.js";

const UA = "LifeToLife-Distribution-Agent/1.0 (+https://lifetolife.net)";
const SCOPE = "basic write offline_access";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function authorize(request, env) {
  return (request.headers.get("authorization") || "") === `Bearer ${requiredEnv(env, "DISTRIBUTION_AGENT_KEY")}`;
}

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

function publicError(error) {
  const p = error?.providerPayload;
  return {
    message: error?.message || String(error),
    provider: error?.provider || undefined,
    details: p ? {
      code: p?.errors?.[0]?.code || p?.error?.code || undefined,
      message: p?.errors?.[0]?.detail || p?.errors?.[0]?.title || p?.error_description || p?.error?.message || p?.message || undefined,
    } : undefined,
  };
}

function providerError(response, payload, fallback) {
  const error = new Error(
    payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title || payload?.error_description ||
    payload?.error?.message || payload?.message || fallback || `Tumblr request failed with HTTP ${response.status}`
  );
  error.provider = "tumblr";
  error.providerPayload = payload;
  error.status = response.status;
  return error;
}

function tumblrStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("tumblr-oauth");
}

export class WordPressAuthState extends BaseWordPressAuthState {
  async getTumblrOAuthSecrets() {
    return {
      access_token: (await this.ctx.storage.get("tumblr_access_token")) || null,
      refresh_token: (await this.ctx.storage.get("tumblr_refresh_token")) || null,
      access_expires_at: Number(await this.ctx.storage.get("tumblr_access_expires_at") || 0),
    };
  }
}

async function refreshToken(env, refreshTokenValue) {
  const response = await fetch("https://api.tumblr.com/v2/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8", "user-agent": UA },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
      client_id: requiredEnv(env, "TUMBLR_CLIENT_ID"),
      client_secret: requiredEnv(env, "TUMBLR_CLIENT_SECRET"),
    }).toString(),
  });
  const payload = await readJson(response);
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    throw providerError(response, payload, "Tumblr OAuth2 refresh failed");
  }
  await tumblrStub(env).seedTumblrOAuth({
    access_token: String(payload.access_token),
    refresh_token: String(payload.refresh_token),
    expires_in: Number(payload.expires_in || 3600),
    scope: payload.scope ? String(payload.scope) : SCOPE,
  });
  return String(payload.access_token);
}

async function accessToken(env, forceRefresh = false) {
  const state = await tumblrStub(env).getTumblrOAuthSecrets();
  const expiresAt = Number(state?.access_expires_at || 0);
  if (!forceRefresh && state?.access_token && expiresAt > Date.now() + 120000) return String(state.access_token);
  if (!state?.refresh_token) throw new Error("Tumblr refresh token missing; re-authorize with offline_access");
  return refreshToken(env, String(state.refresh_token));
}

async function tumblrApi(env, path, { method = "GET", body } = {}, canRetry = true) {
  const token = await accessToken(env);
  const response = await fetch(`https://api.tumblr.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "user-agent": UA,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401 && canRetry) {
    await accessToken(env, true);
    return tumblrApi(env, path, { method, body }, false);
  }
  const payload = await readJson(response);
  if (!response.ok || Number(payload?.meta?.status || response.status) >= 400) {
    throw providerError(response, payload, `${method} ${path} failed`);
  }
  return payload;
}

async function resolveBlog(env, requested) {
  const info = await tumblrApi(env, "/v2/user/info");
  const blogs = Array.isArray(info?.response?.user?.blogs) ? info.response.user.blogs : [];
  if (!blogs.length) throw new Error("Tumblr account has no writable blogs");
  if (!requested) return blogs.find(blog => blog?.primary === true) || blogs[0];
  const wanted = String(requested).trim().toLowerCase().replace(/\/$/, "");
  const match = blogs.find(blog => {
    const name = String(blog?.name || "").toLowerCase();
    const url = String(blog?.url || "").toLowerCase().replace(/\/$/, "");
    return wanted === name || wanted === `${name}.tumblr.com` || wanted === url;
  });
  if (!match) throw new Error(`Tumblr blog is not writable by this account: ${requested}`);
  return match;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(",");
  if (value === undefined || value === null) return null;
  return String(value).trim() || null;
}

async function publishTumblr(env, body) {
  const blog = await resolveBlog(env, body.tumblr_blog_identifier);
  const blogName = String(blog?.name || "").trim();
  if (!blogName) throw new Error("Could not resolve Tumblr blog name");

  const blocks = [];
  if (body.title) blocks.push({ type: "text", text: body.title });
  if (body.text && body.text !== body.title) blocks.push({ type: "text", text: body.text });
  if (!blocks.length) throw new Error("Tumblr post requires text or title");

  const tags = normalizeTags(body.tumblr_tags);
  const created = await tumblrApi(env, `/v2/blog/${encodeURIComponent(blogName)}/posts`, {
    method: "POST",
    body: {
      content: blocks,
      state: "published",
      ...(tags ? { tags } : {}),
      ...(body.tumblr_source_url ? { source_url: body.tumblr_source_url } : {}),
    },
  });
  const id = String(created?.response?.id || "");
  if (!id) throw new Error("Tumblr create response contained no post id");

  const fetched = await tumblrApi(env, `/v2/blog/${encodeURIComponent(blogName)}/posts/${encodeURIComponent(id)}?post_format=npf`);
  const post = fetched?.response || {};
  const baseUrl = String(blog?.url || `https://${blogName}.tumblr.com/`).replace(/\/$/, "");
  return {
    ok: true,
    target: "tumblr",
    mode: "oauth2-refresh-aware-npf-create-plus-requery-v8",
    id,
    permalink: post.post_url || post.url || `${baseUrl}/post/${id}`,
    verification: {
      id: String(post.id || id),
      blog_name: blogName,
      blog_url: blog?.url || null,
      type: post.type || null,
      content_blocks: Array.isArray(post.content) ? post.content.length : null,
      requery_succeeded: String(post.id || "") === id,
      refresh_token_continuity: true,
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
  if (!targets.includes("tumblr")) return baseWorker.fetch(request, env, ctx);
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  const text = String(body?.text || "").trim();
  const title = body?.title ? String(body.title).trim() : null;
  if (!text && !title) return json({ ok: false, error: "text or title is required" }, 400);
  const otherTargets = targets.filter(target => target !== "tumblr");

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
      plan: { ...basePlan, tumblr: "OAuth2 offline_access -> refresh-aware NPF POST /posts -> GET /posts/:id" },
      content: { text, title, targets, tumblr_blog_identifier: body?.tumblr_blog_identifier || null, tumblr_tags: body?.tumblr_tags || null },
    });
  }

  let tumblrResult;
  try {
    tumblrResult = await publishTumblr(env, {
      text,
      title,
      tumblr_blog_identifier: body?.tumblr_blog_identifier ? String(body.tumblr_blog_identifier).trim() : null,
      tumblr_tags: body?.tumblr_tags,
      tumblr_source_url: body?.tumblr_source_url ? String(body.tumblr_source_url).trim() : body?.source_url ? String(body.source_url).trim() : null,
    });
  } catch (error) {
    tumblrResult = { ok: false, target: "tumblr", error: publicError(error) };
  }

  let baseStatus = 200;
  let baseResults = {};
  if (otherTargets.length) {
    const response = await baseWorker.fetch(forwardRequest(request, { ...body, targets: otherTargets }), env, ctx);
    baseStatus = response.status;
    const payload = await response.json().catch(() => ({ results: {} }));
    baseResults = payload?.results || {};
  }

  const results = { ...baseResults, tumblr: tumblrResult };
  const ok = targets.every(target => results[target]?.ok === true);
  return json({
    ok,
    results,
    request: { text, title, targets, tumblr_blog_identifier: body?.tumblr_blog_identifier || null, tumblr_tags: body?.tumblr_tags || null },
    base_http_status: otherTargets.length ? baseStatus : null,
  }, ok ? 200 : 207);
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/health") {
      const response = await baseWorker.fetch(request, env, ctx);
      const payload = await response.json();
      return json({ ...payload, tumblr_publish_adapter: "prepared-unverified", tumblr_refresh_aware: true });
    }
    if (path === "/v1/publish" && request.method === "POST") return handlePublish(request, env, ctx);
    return baseWorker.fetch(request, env, ctx);
  },
};
