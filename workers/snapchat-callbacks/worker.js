function html(body, status = 200) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeToLife Snapchat Callback</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:64px auto;padding:0 20px;line-height:1.55}code,textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}textarea{width:100%;min-height:120px;padding:12px;box-sizing:border-box}button{padding:10px 14px;margin-top:10px}</style></head><body>${body}</body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/oauth/callback") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (code) {
        return html(`
          <h1>Snapchat authorization succeeded</h1>
          <p>Copy the authorization code below. Do not share it publicly.</p>
          <textarea id="code" readonly>${escapeHtml(code)}</textarea>
          <button onclick="navigator.clipboard.writeText(document.getElementById('code').value);this.textContent='Copied'">Copy code</button>
          ${state ? `<p>State: <code>${escapeHtml(state)}</code></p>` : ""}
        `);
      }

      if (error || errorDescription) {
        return html(`
          <h1>Snapchat authorization failed</h1>
          <pre>${escapeHtml(error)}\n${escapeHtml(errorDescription)}</pre>
        `, 400);
      }

      return html("<h1>LifeToLife Snapchat OAuth callback</h1><p>No authorization response is present.</p>");
    }

    if (path === "/health") {
      return json({ ok: true, service: "lifetolife-snapchat-callbacks" });
    }

    return new Response("Not Found", { status: 404 });
  },
};
