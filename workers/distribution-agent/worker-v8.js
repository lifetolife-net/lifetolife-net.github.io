import baseWorker, { WordPressAuthState as BaseWordPressAuthState } from "./worker-v7.js";

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

export class WordPressAuthState extends BaseWordPressAuthState {
  async seedFreshOAuth({ refresh_token, access_token, expires_in }) {
    if (!refresh_token || !access_token) throw new Error("refresh_token and access_token are required");
    const expiresIn = Math.max(60, Number(expires_in || 3600));
    const expiresAt = Date.now() + expiresIn * 1000;

    await this.ctx.storage.put("refresh_token", refresh_token);
    await this.ctx.storage.put("access_token", access_token);
    await this.ctx.storage.put("access_expires_at", expiresAt);
    await this.ctx.storage.put("bootstrap_source", "fresh-pkce-seed");

    return {
      ok: true,
      state_backend: "durable-object-sqlite",
      bootstrap_source: "fresh-pkce-seed",
      expires_in: expiresIn,
      secret_values_returned: false,
    };
  }
}

function authStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("wordpress-oauth");
}

async function handleSeed(request, env) {
  if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = await request.json().catch(() => null);
    if (!body?.refresh_token || !body?.access_token) {
      return json({ ok: false, error: "refresh_token and access_token are required" }, 400);
    }
    const result = await authStub(env).seedFreshOAuth({
      refresh_token: String(body.refresh_token),
      access_token: String(body.access_token),
      expires_in: Number(body.expires_in || 3600),
    });
    return json({
      ok: true,
      target: "wordpress-auth-state",
      mode: "fresh-pkce-seed-v8",
      result,
      verification: {
        durable_object_bound: Boolean(env.WPCOM_AUTH_STATE),
        secret_values_returned: false,
      },
    });
  } catch (error) {
    return json({
      ok: false,
      target: "wordpress-auth-state",
      mode: "fresh-pkce-seed-v8",
      error: { message: error?.message || String(error) },
      verification: {
        durable_object_bound: Boolean(env.WPCOM_AUTH_STATE),
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
        mode: "verified-path-v8",
        wordpress_auth_state_bound: Boolean(env.WPCOM_AUTH_STATE),
        wordpress_auth_state_backend: "durable-object-sqlite",
        wordpress_auth_seed_route: "/v1/admin/wordpress-auth-seed",
      });
    }

    if (path === "/v1/admin/wordpress-auth-seed") {
      return handleSeed(request, env);
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
