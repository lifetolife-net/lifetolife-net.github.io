import baseWorker, { WordPressAuthState as BaseWordPressAuthState } from "./worker-v7.js";

const TUMBLR_REDIRECT_URI = "https://distribution-api.lifetolife.net/oauth/tumblr/callback";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function html(body, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>LifeToLife Tumblr OAuth</title><body style="font-family:system-ui;max-width:720px;margin:64px auto;padding:0 24px"><h1>LifeToLife Tumblr OAuth</h1>${body}</body>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function authorize(request, env) {
  const expected = requiredEnv(env, "DISTRIBUTION_AGENT_KEY");
  return (request.headers.get("authorization") || "") === `Bearer ${expected}`;
}

async function readJsonResponse(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

function publicError(error) {
  const payload = error?.providerPayload;
  return {
    message: error?.message || String(error),
    provider: error?.provider || undefined,
    details: payload ? {
      error: typeof payload.error === "string" ? payload.error : payload.error?.type || payload.error?.code || undefined,
      code: payload.error?.code || undefined,
      message: payload.error?.message || payload.error_description || payload.message || undefined,
    } : undefined,
  };
}

function providerError(provider, response, payload, fallback) {
  const error = new Error(payload?.error_description || payload?.error?.message || payload?.message || (typeof payload?.error === "string" ? payload.error : null) || fallback || `${provider} request failed with HTTP ${response.status}`);
  error.status = response.status;
  error.provider = provider;
  error.providerPayload = payload;
  return error;
}

function authStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("wordpress-oauth");
}

function tumblrAuthStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("tumblr-oauth");
}

async function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function handleTumblrOAuthStart(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const state = await randomState();
  await tumblrAuthStub(env).prepareTumblrOAuthState({ state, expires_at: Date.now() + 10 * 60 * 1000 });

  const url = new URL("https://www.tumblr.com/oauth2/authorize");
  url.searchParams.set("client_id", requiredEnv(env, "TUMBLR_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "basic write");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", TUMBLR_REDIRECT_URI);

  return json({
    ok: true,
    target: "tumblr",
    mode: "oauth2-authorization-code-v8",
    authorization_url: url.toString(),
    redirect_uri: TUMBLR_REDIRECT_URI,
    secret_values_returned: false,
  });
}

async function handleTumblrOAuthCallback(request, env) {
  const url = new URL(request.url);
  const providerErrorValue = url.searchParams.get("error");
  if (providerErrorValue) {
    return html(`<p>Authorization was not completed.</p><p><code>${providerErrorValue.replace(/[<>&]/g, "")}</code></p>`, 400);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return html("<p>Missing OAuth code or state.</p>", 400);

  const stateCheck = await tumblrAuthStub(env).consumeTumblrOAuthState({ state });
  if (!stateCheck?.ok) return html("<p>OAuth state is invalid or expired. Start the Tumblr authorization again.</p>", 400);

  const response = await fetch("https://api.tumblr.com/v2/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: requiredEnv(env, "TUMBLR_CLIENT_ID"),
      client_secret: requiredEnv(env, "TUMBLR_CLIENT_SECRET"),
      redirect_uri: TUMBLR_REDIRECT_URI,
    }).toString(),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error || !payload?.access_token) {
    return html(`<p>Token exchange failed. HTTP ${response.status}.</p><p>No secret values were displayed.</p>`, 502);
  }

  await tumblrAuthStub(env).seedTumblrOAuth({
    access_token: String(payload.access_token),
    refresh_token: payload.refresh_token ? String(payload.refresh_token) : null,
    expires_in: Number(payload.expires_in || 3600),
    scope: payload.scope ? String(payload.scope) : "basic write",
  });

  return html("<p><strong>Authorization complete.</strong></p><p>Tumblr OAuth tokens were stored in the LifeToLife Durable Object. No token value is shown here.</p><p>You can return to the terminal.</p>");
}

async function handleTumblrAuthState(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const state = await tumblrAuthStub(env).inspectTumblrOAuth();
  return json({ ok: true, target: "tumblr-auth-state", ...state, secret_values_returned: false });
}

function mastodonBaseUrl(env) {
  const raw = String(requiredEnv(env, "MASTODON_BASE_URL")).trim().replace(/\/+$/, "");
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") throw new Error("MASTODON_BASE_URL must use https");
  if (parsed.pathname !== "/" && parsed.pathname !== "") throw new Error("MASTODON_BASE_URL must be an instance origin without a path");
  return parsed.origin;
}

async function mastodonJson(env, path, { method = "GET", body, idempotencyKey } = {}) {
  const encodedBody = body !== undefined ? new URLSearchParams(Object.entries(body).filter(([, value]) => value !== undefined && value !== null)).toString() : undefined;
  const response = await fetch(`${mastodonBaseUrl(env)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requiredEnv(env, "MASTODON_ACCESS_TOKEN")}`,
      ...(body !== undefined ? { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: encodedBody,
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error) throw providerError("mastodon", response, payload, `Mastodon API request failed: ${method} ${path}`);
  return payload;
}

async function publishMastodon(env, content) {
  const created = await mastodonJson(env, "/api/v1/statuses", {
    method: "POST",
    body: { status: content.text, ...(content.mastodon_visibility ? { visibility: content.mastodon_visibility } : {}) },
    idempotencyKey: content.idempotency_key || null,
  });
  if (!created?.id) throw new Error("Mastodon status creation returned no id");
  const verified = await mastodonJson(env, `/api/v1/statuses/${encodeURIComponent(created.id)}`);
  return { ok: true, target: "mastodon", mode: "prepared-post-statuses-plus-requery-v8", id: String(created.id), permalink: verified.url || created.url || null, verification: { id: String(verified.id || created.id), url: verified.url || created.url || null, created_at: verified.created_at || created.created_at || null, visibility: verified.visibility || created.visibility || null } };
}

function forwardedJsonRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
}

async function handleCommonPublishWithMastodon(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  const normalizedTargets = Array.isArray(body?.targets) ? [...new Set(body.targets.map(value => String(value).toLowerCase()))] : [];
  if (!normalizedTargets.includes("mastodon")) return baseWorker.fetch(request, env, ctx);
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const text = String(body?.text || "").trim();
  if (!text) return json({ ok: false, error: "text is required" }, 400);
  const otherTargets = normalizedTargets.filter(target => target !== "mastodon");
  const visibility = body?.mastodon_visibility ? String(body.mastodon_visibility).trim().toLowerCase() : null;
  if (visibility && !new Set(["public", "unlisted", "private", "direct"]).has(visibility)) return json({ ok: false, error: "mastodon_visibility must be public, unlisted, private, or direct" }, 400);

  if (body?.dry_run === true) {
    let basePlan = {};
    if (otherTargets.length) {
      const response = await baseWorker.fetch(forwardedJsonRequest(request, { ...body, targets: otherTargets, dry_run: true }), env, ctx);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) return json(payload, response.status);
      basePlan = payload.plan || {};
    }
    return json({ ok: true, dry_run: true, plan: { ...basePlan, mastodon: "OAuth user token with write:statuses -> POST /api/v1/statuses -> GET /api/v1/statuses/:id" }, content: { text, title: body?.title ? String(body.title).trim() : null, image_url: body?.image_url ? String(body.image_url).trim() : null, targets: normalizedTargets, mastodon_visibility: visibility } });
  }

  let mastodonResult;
  try { mastodonResult = await publishMastodon(env, { text, mastodon_visibility: visibility, idempotency_key: body?.idempotency_key ? String(body.idempotency_key) : null }); }
  catch (error) { mastodonResult = { ok: false, target: "mastodon", error: publicError(error) }; }

  let basePayload = { ok: true, results: {} };
  let baseStatus = 200;
  if (otherTargets.length) {
    const response = await baseWorker.fetch(forwardedJsonRequest(request, { ...body, targets: otherTargets }), env, ctx);
    baseStatus = response.status;
    basePayload = await response.json().catch(() => ({ ok: false, results: {}, error: { message: `Base Distribution Agent returned HTTP ${response.status}` } }));
  }
  const results = { ...(basePayload?.results || {}), mastodon: mastodonResult };
  const ok = normalizedTargets.every(target => results[target]?.ok === true);
  return json({ ok, results, request: { text, title: body?.title ? String(body.title).trim() : null, image_url: body?.image_url ? String(body.image_url).trim() : null, targets: normalizedTargets, mastodon_visibility: visibility }, base_http_status: otherTargets.length ? baseStatus : null }, ok ? 200 : 207);
}

export class WordPressAuthState extends BaseWordPressAuthState {
  async seedFreshOAuth({ refresh_token, access_token, expires_in }) {
    if (!refresh_token || !access_token) throw new Error("refresh_token and access_token are required");
    const expiresIn = Math.max(60, Number(expires_in || 3600));
    await this.ctx.storage.put("refresh_token", refresh_token);
    await this.ctx.storage.put("access_token", access_token);
    await this.ctx.storage.put("access_expires_at", Date.now() + expiresIn * 1000);
    await this.ctx.storage.put("bootstrap_source", "fresh-pkce-seed");
    return { ok: true, state_backend: "durable-object-sqlite", bootstrap_source: "fresh-pkce-seed", expires_in: expiresIn, secret_values_returned: false };
  }

  async prepareTumblrOAuthState({ state, expires_at }) {
    if (!state) throw new Error("state is required");
    await this.ctx.storage.put("tumblr_oauth_state", String(state));
    await this.ctx.storage.put("tumblr_oauth_state_expires_at", Number(expires_at));
    return { ok: true };
  }

  async consumeTumblrOAuthState({ state }) {
    const expected = await this.ctx.storage.get("tumblr_oauth_state");
    const expiresAt = Number(await this.ctx.storage.get("tumblr_oauth_state_expires_at") || 0);
    const ok = Boolean(expected && state && expected === state && expiresAt > Date.now());
    await this.ctx.storage.delete("tumblr_oauth_state");
    await this.ctx.storage.delete("tumblr_oauth_state_expires_at");
    return { ok };
  }

  async seedTumblrOAuth({ access_token, refresh_token, expires_in, scope }) {
    if (!access_token) throw new Error("access_token is required");
    const expiresIn = Math.max(60, Number(expires_in || 3600));
    await this.ctx.storage.put("tumblr_access_token", access_token);
    if (refresh_token) await this.ctx.storage.put("tumblr_refresh_token", refresh_token);
    await this.ctx.storage.put("tumblr_access_expires_at", Date.now() + expiresIn * 1000);
    await this.ctx.storage.put("tumblr_scope", scope || "basic write");
    await this.ctx.storage.put("tumblr_bootstrap_source", "oauth2-authorization-code");
    return { ok: true, secret_values_returned: false };
  }

  async inspectTumblrOAuth() {
    const accessToken = await this.ctx.storage.get("tumblr_access_token");
    const refreshToken = await this.ctx.storage.get("tumblr_refresh_token");
    const expiresAt = Number(await this.ctx.storage.get("tumblr_access_expires_at") || 0);
    const scope = await this.ctx.storage.get("tumblr_scope");
    const bootstrapSource = await this.ctx.storage.get("tumblr_bootstrap_source");
    return {
      durable_object_bound: true,
      has_access_token: Boolean(accessToken),
      has_refresh_token: Boolean(refreshToken),
      access_expires_in: expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0,
      scope: scope || null,
      bootstrap_source: bootstrapSource || null,
    };
  }
}

async function handleSeed(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await request.json().catch(() => null);
    if (!body?.refresh_token || !body?.access_token) return json({ ok: false, error: "refresh_token and access_token are required" }, 400);
    const result = await authStub(env).seedFreshOAuth({ refresh_token: String(body.refresh_token), access_token: String(body.access_token), expires_in: Number(body.expires_in || 3600) });
    return json({ ok: true, target: "wordpress-auth-state", mode: "fresh-pkce-seed-v8", result, verification: { durable_object_bound: Boolean(env.WPCOM_AUTH_STATE), secret_values_returned: false } });
  } catch (error) {
    return json({ ok: false, target: "wordpress-auth-state", mode: "fresh-pkce-seed-v8", error: { message: error?.message || String(error) }, verification: { durable_object_bound: Boolean(env.WPCOM_AUTH_STATE), secret_values_returned: false } }, 207);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      const response = await baseWorker.fetch(request, env, ctx);
      const base = await response.json();
      return json({ ...base, mode: "verified-path-v8", wordpress_auth_state_bound: Boolean(env.WPCOM_AUTH_STATE), wordpress_auth_state_backend: "durable-object-sqlite", wordpress_auth_seed_route: "/v1/admin/wordpress-auth-seed", tumblr_oauth2: "prepared-unverified", tumblr_client_id_configured: Boolean(env.TUMBLR_CLIENT_ID), tumblr_client_secret_configured: Boolean(env.TUMBLR_CLIENT_SECRET), mastodon_adapter: "prepared-unverified", mastodon_base_url_configured: Boolean(env.MASTODON_BASE_URL), mastodon_access_token_configured: Boolean(env.MASTODON_ACCESS_TOKEN) });
    }

    if (path === "/v1/admin/wordpress-auth-seed") return handleSeed(request, env);
    if (path === "/v1/admin/tumblr-oauth-start") return handleTumblrOAuthStart(request, env);
    if (path === "/v1/verify/tumblr-auth-state") return handleTumblrAuthState(request, env);
    if (path === "/oauth/tumblr/callback") return handleTumblrOAuthCallback(request, env);
    if (path === "/v1/publish" && request.method === "POST") return handleCommonPublishWithMastodon(request, env, ctx);
    return baseWorker.fetch(request, env, ctx);
  },
};
