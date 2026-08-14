const META_GRAPH = "https://graph.facebook.com/v26.0";
const THREADS_GRAPH = "https://graph.threads.net";
const ALL_META_TARGETS = ["facebook", "instagram", "threads"];

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

  const response = await fetch(url, { method, headers, body });
  const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  if (!response.ok || payload?.error) {
    const err = new Error(payload?.error?.message || `Graph request failed with HTTP ${response.status}`);
    err.status = response.status;
    err.graph = payload;
    throw err;
  }

  return payload;
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

function normalizeTargets(targets) {
  if (targets === undefined) return [...ALL_META_TARGETS];
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("targets must be a non-empty array when provided");
  }

  const unique = [...new Set(targets.map(value => String(value).toLowerCase()))];
  const invalid = unique.filter(value => !ALL_META_TARGETS.includes(value));
  if (invalid.length) throw new Error(`Unsupported target(s): ${invalid.join(", ")}`);
  return unique;
}

function validatePublishBody(body) {
  const text = String(body?.text || "").trim();
  if (!text) throw new Error("text is required");

  const targets = normalizeTargets(body.targets);
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
  return {
    message: error?.message || String(error),
    graph: error?.graph?.error
      ? {
          type: error.graph.error.type || null,
          code: error.graph.error.code || null,
          error_subcode: error.graph.error.error_subcode || null,
          message: error.graph.error.message || null,
        }
      : undefined,
  };
}

async function publishMeta(env, content) {
  const publishers = {
    facebook: () => publishFacebook(env, content),
    instagram: () => publishInstagram(env, content),
    threads: () => publishThreads(env, content),
  };

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json({
        ok: true,
        service: "lifetolife-distribution-agent",
        meta_targets: ALL_META_TARGETS,
        mode: "verified-path-v1",
      });
    }

    if (path !== "/v1/publish/meta") return new Response("Not Found", { status: 404 });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    try {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

      const body = await request.json().catch(() => null);
      if (!body) return json({ ok: false, error: "Request body must be JSON" }, 400);

      const content = validatePublishBody(body);

      if (content.dry_run) {
        return json({
          ok: true,
          dry_run: true,
          plan: {
            facebook: content.targets.includes("facebook") ? "verified text /feed + re-query" : "not targeted",
            instagram: content.targets.includes("instagram") ? "verified image /media -> /media_publish + re-query" : "not targeted",
            threads: content.targets.includes("threads") ? "verified text /threads -> /threads_publish + re-query" : "not targeted",
          },
          content: {
            text: content.text,
            image_url: content.image_url,
            targets: content.targets,
          },
        });
      }

      const outcome = await publishMeta(env, content);
      return json(
        {
          ...outcome,
          request: {
            text: content.text,
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
