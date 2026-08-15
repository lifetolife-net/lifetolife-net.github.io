#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
REDIRECT_URI="http://localhost:8765/callback"
TMP_DIR="$(mktemp -d)"
CONFIG_FILE="$PWD/wrangler-v8.tmp.toml"
CALLBACK_PID=""
SAFE_ERROR_FILE="/tmp/lifetolife-wordpress-oauth-token-error.json"

cleanup() {
  if [[ -n "${CALLBACK_PID:-}" ]]; then
    kill "$CALLBACK_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
  rm -f "$CONFIG_FILE"
}
trap cleanup EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/7] Deploy v8 Durable Object OAuth seed path\n'
cat > "$CONFIG_FILE" <<'TOML'
name = "lifetolife-distribution-agent"
main = "worker-v8.js"
compatibility_date = "2026-08-14"
workers_dev = true

[[routes]]
pattern = "distribution-api.lifetolife.net"
custom_domain = true

[[durable_objects.bindings]]
name = "WPCOM_AUTH_STATE"
class_name = "WordPressAuthState"

[[migrations]]
tag = "wordpress-auth-v1"
new_sqlite_classes = ["WordPressAuthState"]
TOML

npx wrangler deploy --config "$CONFIG_FILE"

check_v8_health() {
  local outfile="$TMP_DIR/health.json"
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "${WORKER_ORIGIN}/health" > "$outfile" 2>/dev/null; then
      if python3 - "$outfile" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
ok = (
    obj.get("mode") == "verified-path-v8"
    and obj.get("wordpress_auth_state_bound") is True
    and obj.get("wordpress_auth_state_backend") == "durable-object-sqlite"
)
raise SystemExit(0 if ok else 1)
PY
      then
        return 0
      fi
    fi
    sleep 2
  done
  cat "$outfile" 2>/dev/null || true
  return 1
}

check_v8_health
echo 'v8 Durable Object binding: confirmed'

printf '\n[2/7] Register a fresh WordPress.com OAuth 2.1 public client\n'
python3 - "$REDIRECT_URI" "$TMP_DIR/registration-request.json" <<'PY'
import json, pathlib, sys
redirect_uri = sys.argv[1]
out = pathlib.Path(sys.argv[2])
request = {
    "client_name": "LifeToLife Distribution Agent CLI",
    "redirect_uris": [redirect_uri],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none",
}
out.write_text(json.dumps(request), encoding="utf-8")
PY

curl -fsS -X POST "https://public-api.wordpress.com/oauth2-1/register" \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP_DIR/registration-request.json" \
  > "$TMP_DIR/registration.json"

CLIENT_ID="$(python3 - "$TMP_DIR/registration.json" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
client_id = str(obj.get("client_id") or "").strip()
if not client_id:
    raise SystemExit("WordPress.com registration returned no client_id")
method = str(obj.get("token_endpoint_auth_method") or "none")
if method != "none":
    raise SystemExit(f"Unexpected token_endpoint_auth_method: {method}")
print(client_id)
PY
)"
echo "Fresh WordPress.com client ID: $CLIENT_ID"

printf '\n[3/7] Start PKCE authorization in the browser\n'
python3 - "$TMP_DIR" <<'PY'
import base64, hashlib, pathlib, secrets, sys
root = pathlib.Path(sys.argv[1])
# RFC 7636 verifier: 43-128 unreserved characters. token_urlsafe(64) is within range.
verifier = secrets.token_urlsafe(64)
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode("ascii").rstrip("=")
state = secrets.token_urlsafe(32)
for name, value in [("verifier", verifier), ("challenge", challenge), ("state", state)]:
    path = root / name
    path.write_text(value, encoding="utf-8")
    path.chmod(0o600)
PY

cat > "$TMP_DIR/callback_server.py" <<'PY'
import html
import http.server
import pathlib
import sys
import urllib.parse

root = pathlib.Path(sys.argv[1])
expected_state = (root / "state").read_text(encoding="utf-8")
code_file = root / "authorization_code"

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        code = (params.get("code") or [""])[0]
        state = (params.get("state") or [""])[0]
        error = (params.get("error") or [""])[0]
        error_description = (params.get("error_description") or [""])[0]
        if error:
            body = f"WordPress.com authorization failed: {html.escape(error)} {html.escape(error_description)}"
            status = 400
        elif not code or state != expected_state:
            body = "WordPress.com authorization response was invalid."
            status = 400
        else:
            code_file.write_text(code, encoding="utf-8")
            code_file.chmod(0o600)
            body = "LifeToLife WordPress.com authorization succeeded. You can close this browser tab."
            status = 200
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def log_message(self, fmt, *args):
        pass

# Bind IPv4 loopback; the registered callback URL uses localhost and resolves here on macOS.
server = http.server.HTTPServer(("127.0.0.1", 8765), Handler)
server.handle_request()
PY

python3 "$TMP_DIR/callback_server.py" "$TMP_DIR" &
CALLBACK_PID=$!
sleep 1

AUTH_URL="$(python3 - "$CLIENT_ID" "$REDIRECT_URI" "$TMP_DIR/challenge" "$TMP_DIR/state" <<'PY'
import pathlib, sys, urllib.parse
client_id, redirect_uri, challenge_file, state_file = sys.argv[1:]
params = {
    "response_type": "code",
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "code_challenge": pathlib.Path(challenge_file).read_text(),
    "code_challenge_method": "S256",
    "scope": "global",
    "state": pathlib.Path(state_file).read_text(),
}
print("https://public-api.wordpress.com/oauth2-1/authorize?" + urllib.parse.urlencode(params))
PY
)"

if command -v open >/dev/null 2>&1; then
  open "$AUTH_URL"
else
  python3 -m webbrowser "$AUTH_URL" >/dev/null 2>&1 || true
fi

echo 'Approve the LifeToLife Distribution Agent connection in the WordPress.com browser page.'

for _ in $(seq 1 300); do
  if [[ -s "$TMP_DIR/authorization_code" ]]; then
    break
  fi
  if ! kill -0 "$CALLBACK_PID" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if [[ ! -s "$TMP_DIR/authorization_code" ]]; then
  echo 'WordPress.com authorization callback was not received.' >&2
  exit 1
fi
wait "$CALLBACK_PID" || true
CALLBACK_PID=""
echo 'Browser authorization callback: received'

printf '\n[4/7] Exchange the authorization code for fresh tokens\n'
AUTH_CODE="$(cat "$TMP_DIR/authorization_code")"
CODE_VERIFIER="$(cat "$TMP_DIR/verifier")"

python3 - "$CLIENT_ID" "$REDIRECT_URI" "$AUTH_CODE" "$CODE_VERIFIER" "$TMP_DIR/token-form.txt" <<'PY'
import pathlib, sys, urllib.parse
client_id, redirect_uri, code, verifier, outfile = sys.argv[1:]
form = {
    "grant_type": "authorization_code",
    "code": code,
    "redirect_uri": redirect_uri,
    "code_verifier": verifier,
    "client_id": client_id,
}
path = pathlib.Path(outfile)
path.write_text(urllib.parse.urlencode(form), encoding="ascii")
path.chmod(0o600)
PY

HTTP_STATUS="$(curl -sS -o "$TMP_DIR/tokens.json" -w '%{http_code}' \
  -X POST "https://public-api.wordpress.com/oauth2-1/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-binary @"$TMP_DIR/token-form.txt")"
chmod 600 "$TMP_DIR/tokens.json"

if [[ "$HTTP_STATUS" != "200" ]]; then
  python3 - "$TMP_DIR/tokens.json" "$SAFE_ERROR_FILE" "$HTTP_STATUS" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
status = int(sys.argv[3])
try:
    obj = json.loads(src.read_text())
except Exception:
    obj = {}
safe = {
    "http_status": status,
    "error": obj.get("error"),
    "error_description": obj.get("error_description"),
    "message": obj.get("message"),
}
safe = {k: v for k, v in safe.items() if v is not None}
out.write_text(json.dumps(safe, indent=2), encoding="utf-8")
print(json.dumps(safe, indent=2))
PY
  echo "Safe OAuth error saved at: $SAFE_ERROR_FILE" >&2
  exit 1
fi

python3 - "$TMP_DIR/tokens.json" "$TMP_DIR/seed.json" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
obj = json.loads(src.read_text())
access = obj.get("access_token")
refresh = obj.get("refresh_token")
if not access or not refresh:
    safe = {k: obj.get(k) for k in ("error", "error_description", "scope", "expires_in") if obj.get(k) is not None}
    raise SystemExit(f"Token exchange did not return both access_token and refresh_token: {safe}")
seed = {
    "access_token": access,
    "refresh_token": refresh,
    "expires_in": int(obj.get("expires_in") or 3600),
}
out.write_text(json.dumps(seed), encoding="utf-8")
out.chmod(0o600)
print("Fresh access + refresh tokens: issued")
print("expires_in:", seed["expires_in"])
print("scope includes global:", "global" in str(obj.get("scope") or "").split())
PY

printf '\n[5/7] Store the new client ID and seed the Durable Object\n'
printf '%s' "$CLIENT_ID" | npx wrangler secret put WPCOM_CLIENT_ID --config "$CONFIG_FILE" >/dev/null

DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
curl -fsS -X POST "${WORKER_ORIGIN}/v1/admin/wordpress-auth-seed" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP_DIR/seed.json" \
  > "$TMP_DIR/seed-response.json"

python3 - "$TMP_DIR/seed-response.json" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
if not obj.get("ok"):
    raise SystemExit(f"Durable Object seed failed: {obj.get('error')}")
print("Fresh OAuth state seeded into Durable Object")
PY

printf '\n[6/7] Verify Durable Object auth state without creating WordPress content\n'
RESPONSE_FILE="/tmp/lifetolife-wordpress-fresh-auth-verification.json"
curl -fsS -X POST "${WORKER_ORIGIN}/v1/verify/wordpress-auth-state" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{}' | tee "$RESPONSE_FILE"
printf '\n'

printf '\n[7/7] Summarize result\n'
python3 - "$RESPONSE_FILE" "$CLIENT_ID" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
client_id = sys.argv[2]
obj = json.loads(path.read_text())
if not obj.get("ok"):
    print("WordPress fresh Durable Object auth: NOT VERIFIED")
    print("Response saved at:", path)
    raise SystemExit(1)
verification = obj.get("verification") or {}
state = verification.get("state") or {}
first = obj.get("first") or {}
second = obj.get("second") or {}
print("WordPress fresh Durable Object auth: VERIFIED")
print("WordPress.com client ID:", client_id)
print("First auth source:", first.get("source"))
print("Second auth source:", second.get("source"))
print("Second call used cached access token:", verification.get("second_call_used_cached_access_token"))
print("Durable state has refresh token:", state.get("has_refresh_token"))
print("Durable state has access token:", state.get("has_access_token"))
print("Durable bootstrap source:", state.get("bootstrap_source"))
print("No WordPress post was created by this script.")
PY

printf '\nSaved verification response: %s\n' "$RESPONSE_FILE"
