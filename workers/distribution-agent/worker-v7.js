import baseWorker from "./worker-v5.js";
import { DurableObject } from "cloudflare:workers";

const WPCOM_TOKEN_ENDPOINT = "https://public-api.wordpress.com/oauth2-1/token";
const WPCOM_MCP_ENDPOINT = "https://public-api.wordpress.com/wpcom/v2/mcp/v1";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
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
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function oauthMessage(response, payload) {
  return (
    payload?.error_description ||
    payload?.error?.message ||
    (typeof payload?.error === "string" ? payload.error : null) ||
    payload?.message ||
    `WordPress.com OAuth refresh failed with HTTP ${response.status}`
  );
}

export class WordPressAuthState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.refreshInFlight = null;
  }

  async exchange(refreshToken) {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: requiredEnv(this.env, "WPCOM_CLIENT_ID"),
    });

    const response = await fetch(WPCOM_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok || payload?.error || !payload?.access_token) {
      const error = new Error(oauthMessage(response, payload));
      error.oauth_status = response.status;
      throw error;
    }
    return payload;
  }

  async bootstrapCandidates() {
    const candidates = [];
    if (this.env.TOKEN_STATE) {
      try {
        const kvToken = await this.env.TOKEN_STATE.get("wordpress_refresh_token");
        if (kvToken) candidates.push({ source: "kv-migration", token: kvToken });
      } catch {
        // KV is migration-only. Ignore read failure and continue to the Worker secret.
      }
    }

    const secretToken = requiredEnv(this.env, "WPCOM_REFRESH_TOKEN");
    candidates.push({ source: "worker-secret", token: secretToken });

    const seen = new Set();
    return candidates.filter(candidate => {
      if (!candidate.token || seen.has(candidate.token)) return false;
      seen.add(candidate.token);
      return true;
    });
  }

  async refreshWithCandidate(candidate) {
    const payload = await this.exchange(candidate.token);
    const effectiveRefresh = payload.refresh_token || candidate.token;
    const expiresIn = Number(payload.expires_in || 3600);
    const expiresAt = Date.now() + Math.max(60, expiresIn) * 1000;

    await this.ctx.storage.put("refresh_token", effectiveRefresh);
    await this.ctx.storage.put("access_token", payload.access_token);
    await this.ctx.storage.put("access_expires_at", expiresAt);
    await this.ctx.storage.put("bootstrap_source", candidate.source);

    return {
      access_token: payload.access_token,
      refresh_token_rotated: effectiveRefresh !== candidate.token,
      refresh_token_persisted: true,
      refresh_token_source: candidate.source,
      expires_in: expiresIn,
      state_backend: "durable-object-sqlite",
    };
  }

  async getAccessTokenInternal() {
    const accessToken = await this.ctx.storage.get("access_token");
    const expiresAt = Number((await this.ctx.storage.get("access_expires_at")) || 0);
    const remainingMs = expiresAt - Date.now();

    if (accessToken && remainingMs > 120000) {
      return {
        access_token: accessToken,
        refresh_token_rotated: false,
        refresh_token_persisted: true,
        refresh_token_source: "durable-object-cache",
        expires_in: Math.floor(remainingMs / 1000),
        state_backend: "durable-object-sqlite",
      };
    }

    const storedRefresh = await this.ctx.storage.get("refresh_token");
    if (storedRefresh) {
      try {
        return await this.refreshWithCandidate({ source: "durable-object", token: storedRefresh });
      } catch (storedError) {
        // Recovery only: if a previous experimental KV rotation left storage stale,
        // try migration candidates before requiring a new human OAuth flow.
        const candidates = await this.bootstrapCandidates();
        let lastError = storedError;
        for (const candidate of candidates) {
          if (candidate.token === storedRefresh) continue;
          try {
            return await this.refreshWithCandidate(candidate);
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError;
      }
    }

    const candidates = await this.bootstrapCandidates();
    let lastError = new Error("No WordPress.com refresh-token candidate was available");
    for (const candidate of candidates) {
      try {
        return await this.refreshWithCandidate(candidate);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async getAccessToken() {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.getAccessTokenInternal();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async inspect() {
    const hasRefresh = Boolean(await this.ctx.storage.get("refresh_token"));
    const hasAccess = Boolean(await this.ctx.storage.get("access_token"));
    const expiresAt = Number((await this.ctx.storage.get("access_expires_at")) || 0);
    const bootstrapSource = (await this.ctx.storage.get("bootstrap_source")) || null;
    return {
      has_refresh_token: hasRefresh,
      has_access_token: hasAccess,
      access_expires_in: expiresAt > Date.now() ? Math.floor((expiresAt - Date.now()) / 1000) : 0,
      bootstrap_source: bootstrapSource,
      secret_values_returned: false,
    };
  }
}

function getWordPressAuthStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("wordpress-oauth");
}

function parseMcpBody(text, contentType) {
  if (!text) return null;
  if (String(contentType || "").includes("text/event-stream")) {
    const events = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try { events.push(JSON.parse(raw)); } catch {}
    }
    return events.length ? events[events.length - 1] : { raw: text };
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function wpcomMcpRequest(accessToken, message, sessionId = null) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const response = await fetch(WPCOM_MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });
  const text = await response.text();
  const payload = parseMcpBody(text, response.headers.get("content-type"));
  if (!response.ok || payload?.error) {
    const messageText = payload?.error?.message || payload?.message || `WordPress MCP failed with HTTP ${response.status}`;
    throw new Error(messageText);
  }
  return { payload, session_id: response.headers.get("mcp-session-id") || sessionId };
}

async function initializeWordPressMcp(accessToken) {
  const initialized = await wpcomMcpRequest(accessToken, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "LifeToLife Distribution Agent", version: "1.0.0" },
    },
  });
  if (!initialized.session_id) throw new Error("WordPress.com MCP initialize returned no session ID");
  await wpcomMcpRequest(accessToken, { jsonrpc: "2.0", method: "notifications/initialized" }, initialized.session_id);
  return initialized.session_id;
}

function extractWordPressToolData(payload) {
  const result = payload?.result;
  if (!result) throw new Error("WordPress.com MCP tool call returned no result");
  if (result.structuredContent?.data) return result.structuredContent.data;
  if (result.structuredContent) return result.structuredContent;
  const textItem = Array.isArray(result.content)
    ? result.content.find(item => item?.type === "text" && typeof item.text === "string")
    : null;
  if (textItem) {
    try {
      const parsed = JSON.parse(textItem.text);
      return parsed?.data || parsed;
    } catch {
      return { raw: textItem.text };
    }
  }
  return result;
}

async function wordpressToolCall(accessToken, sessionId, id, site, operation, params) {
  const response = await wpcomMcpRequest(
    accessToken,
    {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: "wpcom-mcp-content-authoring",
        arguments: { wpcom_site: site, action: "execute", operation, params },
      },
    },
    sessionId
  );
  return extractWordPressToolData(response.payload);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wordpressBlockContent(content) {
  if (content.html) return `<!-- wp:html -->\n${content.html}\n<!-- /wp:html -->`;
  return String(content.text)
    .split(/\n{2,}/)
    .map(block => `<!-- wp:paragraph -->\n<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>\n<!-- /wp:paragraph -->`)
    .join("\n\n");
}

async function publishWordPress(env, content) {
  const site = requiredEnv(env, "WPCOM_SITE");
  const stub = getWordPressAuthStub(env);
  const auth = await stub.getAccessToken();
  const sessionId = await initializeWordPressMcp(auth.access_token);
  const title = content.title || content.text.split(/\n/)[0].slice(0, 120) || "LifeToLife";

  const created = await wordpressToolCall(auth.access_token, sessionId, 2, site, "posts.create", {
    title: { raw: title },
    content: { raw: wordpressBlockContent(content) },
    status: "draft",
    include_fields: ["id", "status", "link", "title", "modified"],
    user_confirmed: true,
  });

  const postId = Number(created.id);
  if (!Number.isFinite(postId)) throw new Error("WordPress.com posts.create returned no numeric post ID");

  const verified = await wordpressToolCall(auth.access_token, sessionId, 3, site, "posts.get", {
    id: postId,
    include_fields: ["id", "status", "link", "title", "modified"],
  });

  return {
    ok: true,
    target: "wordpress",
    mode: "verified-mcp-draft-durable-auth",
    id: postId,
    permalink: verified.link || created.link || null,
    preview_url: `https://${site}/?p=${postId}&preview=true`,
    auth: {
      refresh_token_rotated: auth.refresh_token_rotated,
      refresh_token_persisted: auth.refresh_token_persisted,
      refresh_token_source: auth.refresh_token_source,
      state_backend: auth.state_backend,
      expires_in: auth.expires_in,
    },
    verification: {
      id: verified.id || postId,
      status: verified.status || null,
      link: verified.link || null,
      title: verified.title || null,
      modified: verified.modified || null,
    },
  };
}

function publicError(error) {
  return { message: error?.message || String(error) };
}

async function handleWordPressAuthVerify(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const stub = getWordPressAuthStub(env);
    const first = await stub.getAccessToken();
    const second = await stub.getAccessToken();
    const state = await stub.inspect();

    return json({
      ok: true,
      target: "wordpress-auth-state",
      mode: "durable-object-oauth-state-v7",
      first: {
        source: first.refresh_token_source,
        rotated: first.refresh_token_rotated,
        persisted: first.refresh_token_persisted,
        backend: first.state_backend,
        expires_in: first.expires_in,
      },
      second: {
        source: second.refresh_token_source,
        rotated: second.refresh_token_rotated,
        persisted: second.refresh_token_persisted,
        backend: second.state_backend,
        expires_in: second.expires_in,
      },
      verification: {
        durable_object_bound: Boolean(env.WPCOM_AUTH_STATE),
        second_call_used_cached_access_token: second.refresh_token_source === "durable-object-cache",
        state,
        secret_values_returned: false,
      },
    });
  } catch (error) {
    return json({
      ok: false,
      target: "wordpress-auth-state",
      mode: "durable-object-oauth-state-v7",
      error: publicError(error),
      verification: {
        durable_object_bound: Boolean(env.WPCOM_AUTH_STATE),
        secret_values_returned: false,
      },
    }, 207);
  }
}

async function handleCommonPublishWithWordPress(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  if (!body || !Array.isArray(body.targets) || !body.targets.map(String).map(v => v.toLowerCase()).includes("wordpress")) {
    return baseWorker.fetch(request, env, ctx);
  }

  if (body.dry_run === true) return baseWorker.fetch(request, env, ctx);
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  const text = String(body.text || "").trim();
  if (!text) return json({ ok: false, error: "text is required" }, 400);

  const normalizedTargets = [...new Set(body.targets.map(value => String(value).toLowerCase()))];
  const otherTargets = normalizedTargets.filter(target => target !== "wordpress");

  let wordpressResult;
  try {
    wordpressResult = await publishWordPress(env, {
      text,
      title: body.title ? String(body.title).trim() : null,
      html: body.html ? String(body.html) : null,
    });
  } catch (error) {
    wordpressResult = { ok: false, target: "wordpress", error: publicError(error) };
  }

  let otherResults = {};
  if (otherTargets.length) {
    const forwarded = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ ...body, targets: otherTargets }),
    });
    const response = await baseWorker.fetch(forwarded, env, ctx);
    const payload = await response.json().catch(() => ({}));
    otherResults = payload.results || {};
  }

  const results = { ...otherResults, wordpress: wordpressResult };
  const ok = normalizedTargets.every(target => results[target]?.ok === true);

  return json({
    ok,
    results,
    request: {
      text,
      title: body.title ? String(body.title).trim() : null,
      image_url: body.image_url ? String(body.image_url).trim() : null,
      targets: normalizedTargets,
    },
  }, ok ? 200 : 207);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json({
        ok: true,
        service: "lifetolife-distribution-agent",
        mode: "verified-path-v7",
        targets: ["facebook", "instagram", "threads", "bluesky", "blogger", "wordpress", "youtube"],
        youtube_upload_route: "/v1/publish/youtube",
        youtube_verify_route: "/v1/verify/youtube",
        wordpress_auth_state_backend: "durable-object-sqlite",
        wordpress_auth_state_bound: Boolean(env.WPCOM_AUTH_STATE),
        wordpress_legacy_kv_bound_for_migration: Boolean(env.TOKEN_STATE),
        wordpress_auth_verify_route: "/v1/verify/wordpress-auth-state",
      });
    }

    if (path === "/v1/verify/wordpress-auth-state") {
      return handleWordPressAuthVerify(request, env);
    }

    if (path === "/v1/publish") {
      return handleCommonPublishWithWordPress(request, env, ctx);
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
