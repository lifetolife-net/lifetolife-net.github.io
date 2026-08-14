function html(body, status = 200) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeToLife Threads Callback</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:64px auto;padding:0 20px;line-height:1.55}code,textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}textarea{width:100%;min-height:120px;padding:12px;box-sizing:border-box}button{padding:10px 14px;margin-top:10px}</style></head><body>${body}</body></html>`, {
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

function base64UrlToBytes(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  const binary = atob(input);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function bytesToHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignedRequest(signedRequest, secret) {
  const [encodedSig, payload] = String(signedRequest || "").split(".");
  if (!encodedSig || !payload) throw new Error("Malformed signed_request");

  const payloadText = new TextDecoder().decode(base64UrlToBytes(payload));
  const data = JSON.parse(payloadText);

  if (secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSig),
      new TextEncoder().encode(payload)
    );
    if (!ok) throw new Error("Invalid signed_request signature");
  }

  return data;
}

async function readSignedRequest(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return body.signed_request || "";
  }
  const form = await request.formData().catch(() => new FormData());
  return form.get("signed_request") || "";
}

function confirmationCode(seed) {
  const bytes = new TextEncoder().encode(seed || crypto.randomUUID());
  return crypto.subtle.digest("SHA-256", bytes).then(buf => bytesToHex(new Uint8Array(buf)).slice(0, 24));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/threads/oauth-callback") {
      if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (code) {
        const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
        return html(`<h1>Threads authorization succeeded</h1><p>Copy the authorization code below.</p><textarea id="code" readonly>${escaped}</textarea><button onclick="navigator.clipboard.writeText(document.getElementById('code').value);this.textContent='Copied'">Copy code</button>`);
      }

      if (error || errorDescription) {
        return html(`<h1>Threads authorization failed</h1><pre>${String(error || "")}\n${String(errorDescription || "")}</pre>`, 400);
      }

      return html("<h1>LifeToLife Threads OAuth callback</h1><p>No authorization response is present.</p>");
    }

    if (path === "/threads/deauthorize") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const signedRequest = await readSignedRequest(request);
      try {
        const payload = await verifySignedRequest(signedRequest, env.THREADS_APP_SECRET || "");
        console.log("Threads deauthorize", JSON.stringify({ user_id: payload.user_id || null }));
        return json({ success: true });
      } catch (err) {
        console.log("Threads deauthorize callback received without verified payload", String(err));
        return json({ success: true });
      }
    }

    if (path === "/threads/data-deletion") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const signedRequest = await readSignedRequest(request);
      let userId = "unknown";
      try {
        const payload = await verifySignedRequest(signedRequest, env.THREADS_APP_SECRET || "");
        userId = String(payload.user_id || "unknown");
      } catch (err) {
        console.log("Threads data deletion callback payload could not be verified", String(err));
      }

      const code = await confirmationCode(`${userId}:${Date.now()}`);
      const statusUrl = `${url.origin}/threads/data-deletion-status?code=${encodeURIComponent(code)}`;
      console.log("Threads data deletion request", JSON.stringify({ user_id: userId, confirmation_code: code }));
      return json({ url: statusUrl, confirmation_code: code });
    }

    if (path === "/threads/data-deletion-status") {
      if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
      const code = url.searchParams.get("code") || "";
      return html(`<h1>LifeToLife data deletion request</h1><p>Request received.</p><p>Confirmation code: <code>${code.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></p><p>LifeToLife Distribution does not currently persist Threads user content or profile data outside the access credentials required for the connected account. Any stored credentials associated with a disconnected account are removed from the distribution system.</p>`);
    }

    if (path === "/health") {
      return json({ ok: true, service: "lifetolife-threads-callbacks" });
    }

    return new Response("Not Found", { status: 404 });
  },
};
