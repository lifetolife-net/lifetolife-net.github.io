const META_GRAPH = "https://graph.facebook.com/v26.0";
const THREADS_GRAPH = "https://graph.threads.net";
const BLUESKY_PDS = "https://bsky.social";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const BLOGGER_API = "https://www.googleapis.com/blogger/v3";
const WPCOM_TOKEN_ENDPOINT = "https://public-api.wordpress.com/oauth2-1/token";
const WPCOM_MCP_ENDPOINT = "https://public-api.wordpress.com/wpcom/v2/mcp/v1";

const META_TARGETS = ["facebook", "instagram", "threads"];
const TEXT_TARGETS = ["bluesky", "blogger", "wordpress"];
const ALL_TARGETS = [...META_TARGETS, ...TEXT_TARGETS];

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readJsonResponse(response) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return payload;
}

function providerError(provider, response, payload, fallback) {
  const err = new Error(
    payload?.error?.message ||
      payload?.error_description ||
      payload?.message ||
      (typeof payload?.error === "string" ? payload.error : null) ||
      fallback ||
      `${provider} request failed with HTTP ${response.status}`
  );
  err.status = response.status;
  err.provider = provider;
  err.providerPayload = payload;
  return err;
}

async function fetchJson(url, options = {}, provider = "external") {
  const response = await fetch(url, options);
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error) {
    throw providerError(provider, response, payload);
  }
  return payload;
}

async function graphRequest(base, path, token, { method = "GET", params = {} } = {}) {
  const url = new URL(`${base}/${String(path).replace(/^\/+/, "")}`);
  const headers = { Authorization: `Bearer ${token}` };
  let body;

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  } else {
    headers["content-type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    const encoded = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) encoded.set(key, String(value));
    }
    body = encoded.toString();
  }

  return fetchJson(url, { method, headers, body }, "meta");
}

async function publishFacebook(env, content) {
  const pageId = requiredEnv(env, "META_PAGE_ID");
  const token = requiredEnv(env, "META_PAGE_ACCESS_TOKEN");

  const created = await graphRequest(META_GRAPH, `${pageId}/feed`, token, {
    method: "POST",
    params: { message: content.text },
  });

  const verified = await graphRequest(META_GRAPH, created.id, token, {
    params: { fields: "id,message,permalink_url" },
  });

  return {
    ok: true,
    target: "facebook",
    mode: "verified-text-feed",
    id: created.id,
    permalink: verified.permalink_url || null,
    verification: verified,
  };
}

async function waitForInstagramContainer(token, creationId) {
  let last = null;

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    last = await graphRequest(META_GRAPH, creationId, token, {
      params: { fields: "id,status_code,status" },
    });

    const status = last.status_code || last.status;
    if (status === "FINISHED") return last;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram container entered terminal status: ${status}`);
    }
    await sleep(1500);
  }

  throw new Error(`Instagram container was not ready in time (last status: ${last?.status_code || last?.status || "unknown"})`);
}

async function publishInstagram(env, content) {
  if (!content.image_url) {
    throw new Error("Instagram target requires image_url in verified-path mode");
  }

  const igUserId = requiredEnv(env, "INSTAGRAM_USER_ID");
  const token = env.INSTAGRAM_ACCESS_TOKEN || requiredEnv(env, "META_PAGE_ACCESS_TOKEN");

  const container = await graphRequest(META_GRAPH, `${igUserId}/media`, token, {
    method: "POST",
    params: {
      image_url: content.image_url,
      caption: content.text,
    },
  });

  await waitForInstagramContainer(token, container.id);

  const published = await graphRequest(META_GRAPH, `${igUserId}/media_publish`, token, {
    method: "POST",
    params: { creation_id: container.id },
  });

  const verified = await graphRequest(META_GRAPH, published.id, token, {
    params: { fields: "id,media_type,permalink,caption,timestamp,username" },
  });

  return {
    ok: true,
    target: "instagram",
    mode: "verified-image-publish",
    container_id: container.id,
    id: published.id,
    permalink: verified.permalink || null,
    verification: verified,
  };
}

async function publishThreads(env, content) {
  const token = requiredEnv(env, "THREADS_ACCESS_TOKEN");

  const container = await graphRequest(THREADS_GRAPH, "me/threads", token, {
    method: "POST",
    params: {
      media_type: "TEXT",
      text: content.text,
    },
  });

  const published = await graphRequest(THREADS_GRAPH, "me/threads_publish", token, {
    method: "POST",
    params: { creation_id: container.id },
  });

  const verified = await graphRequest(THREADS_GRAPH, published.id, token, {
    params: { fields: "id,media_product_type,media_type,permalink,username,text,timestamp" },
  });

  return {
    ok: true,
    target: "threads",
    mode: "verified-text-publish",
    container_id: container.id,
    id: published.id,
    permalink: verified.permalink || null,
    verification: verified,
  };
}

async function createBlueskySession(env) {
  const identifier = requiredEnv(env, "BLUESKY_IDENTIFIER");
  const password = requiredEnv(env, "BLUESKY_APP_PASSWORD");

  return fetchJson(
    `${BLUESKY_PDS}/xrpc/com.atproto.server.createSession`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    },
    "bluesky"
  );
}

function parseAtUri(uri) {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(String(uri || ""));
  if (!match) throw new Error(`Unexpected Bluesky AT URI: ${uri}`);
  return { repo: match[1], collection: match[2], rkey: match[3] };
}

async function publishBluesky(env, content) {
  const session = await createBlueskySession(env);
  const record = {
    $type: "app.bsky.feed.post",
    text: content.text,
    createdAt: new Date().toISOString(),
  };

  const created = await fetchJson(
    `${BLUESKY_PDS}/xrpc/com.atproto.repo.createRecord`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record,
      }),
    },
    "bluesky"
  );

  const parts = parseAtUri(created.uri);
  const verifyUrl = new URL(`${BLUESKY_PDS}/xrpc/com.atproto.repo.getRecord`);
  verifyUrl.searchParams.set("repo", parts.repo);
  verifyUrl.searchParams.set("collection", parts.collection);
  verifyUrl.searchParams.set("rkey", parts.rkey);

  const verified = await fetchJson(
    verifyUrl,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } },
    "bluesky"
  );

  const handle = session.handle || requiredEnv(env, "BLUESKY_IDENTIFIER");
  return {
    ok: true,
    target: "bluesky",
    mode: "verified-createRecord",
    id: parts.rkey,
    uri: created.uri,
    cid: created.cid || null,
    permalink: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(parts.rkey)}`,
    verification: {
      uri: verified.uri || created.uri,
      cid: verified.cid || null,
      value: verified.value || null,
    },
  };
}

async function getBloggerAccessToken(env) {
  const params = new URLSearchParams({
    client_id: requiredEnv(env, "BLOGGER_CLIENT_ID"),
    refresh_token: requiredEnv(env, "BLOGGER_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });

  if (env.BLOGGER_CLIENT_SECRET) params.set("client_secret", env.BLOGGER_CLIENT_SECRET);

  const token = await fetchJson(
    GOOGLE_TOKEN_ENDPOINT,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
    "google-oauth"
  );

  if (!token.access_token) throw new Error("Google token refresh returned no access_token");
  return token.access_token;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(text) {
  return String(text)
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

async function bloggerRequest(path, accessToken, { method = "GET", query = {}, body } = {}) {
  const url = new URL(`${BLOGGER_API}/${String(path).replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const options = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  return fetchJson(url, options, "blogger");
}

async function publishBlogger(env, content) {
  const blogId = requiredEnv(env, "BLOGGER_BLOG_ID");
  const accessToken = await getBloggerAccessToken(env);
  const title = content.title || content.text.split(/\n/)[0].slice(0, 120) || "LifeToLife";
  const html = content.html || plainTextToHtml(content.text);

  const created = await bloggerRequest(`blogs/${blogId}/posts`, accessToken, {
    method: "POST",
    query: { isDraft: "false" },
    body: {
      kind: "blogger#post",
      blog: { id: blogId },
      title,
      content: html,
    },
  });

  const verified = await bloggerRequest(`blogs/${blogId}/posts/${created.id}`, accessToken);

  return {
    ok: true,
    target: "blogger",
    mode: "verified-posts.insert",
    id: created.id,
    permalink: verified.url || created.url || null,
    verification: {
      id: verified.id || created.id,
      title: verified.title || null,
      url: verified.url || null,
      published: verified.published || null,
      updated: verified.updated || null,
      status: verified.status || null,
    },
  };
}

async function getWordPressAccessToken(env) {
  const refreshToken = requiredEnv(env, "WPCOM_REFRESH_TOKEN");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: requiredEnv(env, "WPCOM_CLIENT_ID"),
  });

  const token = await fetchJson(
    WPCOM_TOKEN_ENDPOINT,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
    "wordpress-oauth"
  );

  if (!token.access_token) throw new Error("WordPress.com token refresh returned no access_token");
  return {
    access_token: token.access_token,
    refresh_token_rotated: Boolean(token.refresh_token && token.refresh_token !== refreshToken),
    expires_in: token.expires_in || null,
  };
}

function parseMcpBody(text, contentType) {
  if (!text) return null;
  if (String(contentType || "").includes("text/event-stream")) {
    const events = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        events.push(JSON.parse(raw));
      } catch {
        // Ignore non-JSON SSE data lines.
      }
    }
    return events.length ? events[events.length - 1] : { raw: text };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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
    throw providerError("wordpress-mcp", response, payload || { raw: text });
  }
  return {
    payload,
    session_id: response.headers.get("mcp-session-id") || sessionId,
  };
}

async function initializeWordPressMcp(accessToken) {
  const initialized = await wpcomMcpRequest(accessToken, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "LifeToLife Distribution Agent",
        version: "1.0.0",
      },
    },
  });

  const sessionId = initialized.session_id;
  if (!sessionId) throw new Error("WordPress.com MCP initialize returned no MCP session ID");

  await wpcomMcpRequest(
    accessToken,
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    },
    sessionId
  );

  return sessionId;
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

function wordpressBlockContent(content) {
  if (content.html) {
    return `<!-- wp:html -->\n${content.html}\n<!-- /wp:html -->`;
  }
  return String(content.text)
    .split(/\n{2,}/)
    .map(block => `<!-- wp:paragraph -->\n<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>\n<!-- /wp:paragraph -->`)
    .join("\n\n");
}

async function wordpressToolCall(accessToken, sessionId, id, operation, params) {
  const response = await wpcomMcpRequest(
    accessToken,
    {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: "wpcom-mcp-content-authoring",
        arguments: {
          wpcom_site: requiredEnv({ WPCOM_SITE: params.__site }, "WPCOM_SITE"),
          action: "execute",
          operation,
          params: params.value,
        },
      },
    },
    sessionId
  );
  return extractWordPressToolData(response.payload);
}

async function publishWordPress(env, content) {
  const site = requiredEnv(env, "WPCOM_SITE");
  const tokenInfo = await getWordPressAccessToken(env);
  const accessToken = tokenInfo.access_token;
  const sessionId = await initializeWordPressMcp(accessToken);
  const title = content.title || content.text.split(/\n/)[0].slice(0, 120) || "LifeToLife";

  const created = await wordpressToolCall(accessToken, sessionId, 2, "posts.create", {
    __site: site,
    value: {
      title: { raw: title },
      content: { raw: wordpressBlockContent(content) },
      status: "draft",
      include_fields: ["id", "status", "link", "title", "modified"],
      user_confirmed: true,
    },
  });

  const postId = Number(created.id);
  if (!Number.isFinite(postId)) throw new Error("WordPress.com posts.create returned no numeric post ID");

  const verified = await wordpressToolCall(accessToken, sessionId, 3, "posts.get", {
    __site: site,
    value: {
      id: postId,
      include_fields: ["id", "status", "link", "title", "modified"],
    },
  });

  return {
    ok: true,
    target: "wordpress",
    mode: "verified-mcp-draft",
    id: postId,
    permalink: verified.link || created.link || null,
    preview_url: `https://${site}/?p=${postId}&preview=true`,
    auth: {
      refresh_token_rotated: tokenInfo.refresh_token_rotated,
      expires_in: tokenInfo.expires_in,
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

function normalizeTargets(targets, { defaultTargets = null } = {}) {
  if (targets === undefined && defaultTargets) return [...defaultTargets];
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("targets must be a non-empty array");
  }

  const unique = [...new Set(targets.map(value => String(value).toLowerCase()))];
  const invalid = unique.filter(value => !ALL_TARGETS.includes(value));
  if (invalid.length) throw new Error(`Unsupported target(s): ${invalid.join(", ")}`);
  return unique;
}

function validatePublishBody(body, options = {}) {
  const text = String(body?.text || "").trim();
  if (!text) throw new Error("text is required");

  const targets = normalizeTargets(body.targets, options);
  const imageUrl = body.image_url ? String(body.image_url).trim() : null;

  if (targets.includes("instagram") && !imageUrl) {
    throw new Error("image_url is required when instagram is targeted");
  }

  if (imageUrl) {
    let parsed;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new Error("image_url must be a valid URL");
    }
    if (parsed.protocol !== "https:") throw new Error("image_url must use https");
  }

  return {
    text,
    title: body?.title ? String(body.title).trim() : null,
    html: body?.html ? String(body.html) : null,
    image_url: imageUrl,
    targets,
    dry_run: body?.dry_run === true,
  };
}

function authorize(request, env) {
  const expected = requiredEnv(env, "DISTRIBUTION_AGENT_KEY");
  const supplied = request.headers.get("authorization") || "";
  return supplied === `Bearer ${expected}`;
}

function publicError(error) {
  const payload = error?.providerPayload;
  return {
    message: error?.message || String(error),
    provider: error?.provider || undefined,
    details: payload
      ? {
          error:
            typeof payload.error === "string"
              ? payload.error
              : payload.error?.type || payload.error?.code || payload.error?.message || undefined,
          code: payload.error?.code || undefined,
          error_subcode: payload.error?.error_subcode || undefined,
          message:
            payload.error?.message || payload.error_description || payload.message || undefined,
        }
      : undefined,
  };
}

function publisherMap(env, content) {
  return {
    facebook: () => publishFacebook(env, content),
    instagram: () => publishInstagram(env, content),
    threads: () => publishThreads(env, content),
    bluesky: () => publishBluesky(env, content),
    blogger: () => publishBlogger(env, content),
    wordpress: () => publishWordPress(env, content),
  };
}

async function publishTargets(env, content) {
  const publishers = publisherMap(env, content);
  const entries = await Promise.all(
    content.targets.map(async target => {
      try {
        return [target, await publishers[target]()];
      } catch (error) {
        return [target, { ok: false, target, error: publicError(error) }];
      }
    })
  );

  const results = Object.fromEntries(entries);
  const ok = content.targets.every(target => results[target]?.ok === true);
  return { ok, results };
}

function dryRunPlan(content) {
  const plan = {};
  for (const target of content.targets) {
    if (target === "facebook") plan.facebook = "verified text /feed + re-query";
    if (target === "instagram") plan.instagram = "verified image /media -> /media_publish + re-query";
    if (target === "threads") plan.threads = "verified text /threads -> /threads_publish + re-query";
    if (target === "bluesky") plan.bluesky = "App Password + stable DID -> createSession -> createRecord -> getRecord";
    if (target === "blogger") plan.blogger = "refresh token -> access token -> posts.insert -> posts.get";
    if (target === "wordpress") plan.wordpress = "OAuth 2.1 refresh -> MCP initialize -> posts.create draft -> posts.get";
  }
  return plan;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json({
        ok: true,
        service: "lifetolife-distribution-agent",
        targets: ALL_TARGETS,
        meta_targets: META_TARGETS,
        mode: "verified-path-v3",
      });
    }

    const isMetaEndpoint = path === "/v1/publish/meta";
    const isCommonEndpoint = path === "/v1/publish";
    if (!isMetaEndpoint && !isCommonEndpoint) return new Response("Not Found", { status: 404 });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    try {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

      const body = await request.json().catch(() => null);
      if (!body) return json({ ok: false, error: "Request body must be JSON" }, 400);

      const content = validatePublishBody(body, {
        defaultTargets: isMetaEndpoint ? META_TARGETS : null,
      });

      if (isMetaEndpoint) {
        const nonMeta = content.targets.filter(target => !META_TARGETS.includes(target));
        if (nonMeta.length) {
          return json({ ok: false, error: `Meta endpoint does not accept: ${nonMeta.join(", ")}` }, 400);
        }
      }

      if (content.dry_run) {
        return json({
          ok: true,
          dry_run: true,
          plan: dryRunPlan(content),
          content: {
            text: content.text,
            title: content.title,
            image_url: content.image_url,
            targets: content.targets,
          },
        });
      }

      const outcome = await publishTargets(env, content);
      return json(
        {
          ...outcome,
          request: {
            text: content.text,
            title: content.title,
            image_url: content.image_url,
            targets: content.targets,
          },
        },
        outcome.ok ? 200 : 207
      );
    } catch (error) {
      return json({ ok: false, error: publicError(error) }, 400);
    }
  },
};
