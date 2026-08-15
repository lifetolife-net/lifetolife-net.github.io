import baseWorker from "./worker-v5.js";

const WPCOM_TOKEN_ENDPOINT = "https://public-api.wordpress.com/oauth2-1/token";

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

async function refreshWordPressToken(env) {
  if (!env.TOKEN_STATE) {
    throw new Error("TOKEN_STATE KV binding is not configured");
  }

  const stored = await env.TOKEN_STATE.get("wordpress_refresh_token");
  const current = stored || requiredEnv(env, "WPCOM_REFRESH_TOKEN");
  const source = stored ? "token-state" : "worker-secret";

  let seeded = false;
  if (!stored) {
    await env.TOKEN_STATE.put("wordpress_refresh_token", current);
    seeded = true;
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current,
    client_id: requiredEnv(env, "WPCOM_CLIENT_ID"),
  });

  const response = await fetch(WPCOM_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok || payload?.error || !payload?.access_token) {
    const message =
      payload?.error_description ||
      payload?.error?.message ||
      (typeof payload?.error === "string" ? payload.error : null) ||
      `WordPress.com OAuth refresh failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const rotated = Boolean(payload.refresh_token && payload.refresh_token !== current);
  let persisted = seeded;
  if (rotated) {
    await env.TOKEN_STATE.put("wordpress_refresh_token", payload.refresh_token);
    persisted = true;
  }

  return {
    source,
    seeded,
    refresh_token_rotated: rotated,
    refresh_token_persisted: persisted,
    expires_in: payload.expires_in || null,
  };
}

async function handleWordPressTokenStateVerify(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const first = await refreshWordPressToken(env);
    const second = await refreshWordPressToken(env);
    const kvReadConfirmed = second.source === "token-state";

    return json({
      ok: kvReadConfirmed,
      target: "wordpress-token-state",
      mode: "oauth-refresh-rotation-persistence-v6",
      first,
      second,
      verification: {
        token_state_bound: Boolean(env.TOKEN_STATE),
        kv_read_confirmed: kvReadConfirmed,
        secret_values_returned: false,
      },
    }, kvReadConfirmed ? 200 : 207);
  } catch (error) {
    return json({
      ok: false,
      target: "wordpress-token-state",
      error: { message: error?.message || String(error) },
      verification: {
        token_state_bound: Boolean(env.TOKEN_STATE),
        secret_values_returned: false,
      },
    }, 207);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      const response = await baseWorker.fetch(request, env, ctx);
      const base = await response.json();
      return json({
        ...base,
        mode: "verified-path-v6",
        wordpress_token_state_bound: Boolean(env.TOKEN_STATE),
        wordpress_token_state_verify_route: "/v1/verify/wordpress-token-state",
      });
    }

    if (path === "/v1/verify/wordpress-token-state") {
      return handleWordPressTokenStateVerify(request, env);
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
