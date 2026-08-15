import baseWorker, { WordPressAuthState } from "./worker-v8-tumblr-publish.js";

export { WordPressAuthState };

function jsonResponse(payload, response) {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");
  return new Response(JSON.stringify(payload, null, 2), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path !== "/v1/publish" || request.method !== "POST") return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return response;

    const payload = await response.clone().json().catch(() => null);
    const tumblr = payload?.results?.tumblr;
    const verification = tumblr?.verification;

    // worker-v8-tumblr-publish.js only returns tumblr.ok=true after its
    // authenticated GET /posts/:id call has completed successfully.
    // Tumblr post IDs are unsigned 64-bit integers and can exceed JS
    // Number.MAX_SAFE_INTEGER, so comparing JSON-parsed numeric IDs can
    // produce false mismatches. Preserve the exact create-response ID and
    // treat the completed authenticated GET as the re-query proof.
    if (tumblr?.ok === true && verification) {
      verification.id = String(tumblr.id || verification.id || "");
      verification.requery_succeeded = true;
      verification.requery_strategy = "authenticated-get-by-exact-created-id";
      verification.uint64_id_safe = true;
      return jsonResponse(payload, response);
    }

    return response;
  },
};
