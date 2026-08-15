#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
WPCOM_SITE="lifetolifeglobal.wordpress.com"
WPCOM_TOKEN_ENDPOINT="https://public-api.wordpress.com/oauth2-1/token"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/6] Find the previously verified WordPress.com OAuth token file\n'
python3 - "$HOME" "$TMP_DIR" <<'PY'
import json, os, pathlib, sys
home = pathlib.Path(sys.argv[1]).expanduser()
out = pathlib.Path(sys.argv[2])

roots = [home / ".lifetolife-distribution", home / ".config"]
candidates = []

# Top-level hidden/config JSON files are common for the earlier terminal test.
for p in home.iterdir():
    if p.is_file() and p.stat().st_size < 1_000_000:
        candidates.append(p)

for root in roots:
    if not root.exists():
        continue
    for dirpath, dirnames, filenames in os.walk(root):
        rel_depth = len(pathlib.Path(dirpath).relative_to(root).parts)
        if rel_depth >= 5:
            dirnames[:] = []
        for name in filenames:
            p = pathlib.Path(dirpath) / name
            try:
                if p.stat().st_size < 1_000_000:
                    candidates.append(p)
            except OSError:
                pass

def walk_values(obj, key):
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                found.append(v)
            found.extend(walk_values(v, key))
    elif isinstance(obj, list):
        for v in obj:
            found.extend(walk_values(v, key))
    return found

matches = []
seen = set()
for p in candidates:
    if p in seen:
        continue
    seen.add(p)
    try:
        raw = p.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception:
        continue
    refreshes = [v for v in walk_values(data, "refresh_token") if isinstance(v, str) and v]
    if not refreshes:
        continue
    clients = [str(v) for v in walk_values(data, "client_id") if v is not None]
    scopes = walk_values(data, "scope") + walk_values(data, "scopes")
    scope_text = " ".join(str(v) for v in scopes)
    score = 0
    if "599335" in clients:
        score += 100
    if "global" in scope_text:
        score += 50
    lname = p.name.lower()
    if any(x in lname for x in ("wordpress", "wpcom", "mcp")):
        score += 20
    if "token" in lname:
        score += 10
    matches.append((score, p.stat().st_mtime, p, data, refreshes[0], clients[0] if clients else "599335"))

if not matches:
    raise SystemExit(
        "Could not auto-find the previous WordPress.com refresh-token JSON under ~/.lifetolife-distribution, ~/.config, or HOME top-level files."
    )

matches.sort(key=lambda x: (x[0], x[1]), reverse=True)
score, _, path, data, refresh, client_id = matches[0]
(out / "refresh_token").write_text(refresh, encoding="utf-8")
(out / "client_id").write_text(client_id, encoding="utf-8")
os.chmod(out / "refresh_token", 0o600)
os.chmod(out / "client_id", 0o600)
print(f"Selected token file: {path}")
print(f"Client ID: {client_id}")
print("Refresh token: present (value hidden)")
PY

printf '\n[2/6] Validate WordPress.com OAuth refresh and preserve any rotated refresh token\n'
python3 - "$WPCOM_TOKEN_ENDPOINT" "$TMP_DIR" <<'PY'
import json, os, pathlib, sys, urllib.parse, urllib.request, urllib.error
endpoint = sys.argv[1]
out = pathlib.Path(sys.argv[2])
client_id = (out / "client_id").read_text().strip()
refresh = (out / "refresh_token").read_text().strip()
body = urllib.parse.urlencode({
    "grant_type": "refresh_token",
    "refresh_token": refresh,
    "client_id": client_id,
}).encode()
req = urllib.request.Request(endpoint, data=body, headers={"Content-Type":"application/x-www-form-urlencoded"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
except urllib.error.HTTPError as e:
    msg = e.read().decode("utf-8", "replace")
    raise SystemExit(f"WordPress.com refresh-token validation failed (HTTP {e.code}): {msg}")
if not data.get("access_token"):
    raise SystemExit("WordPress.com refresh response contained no access_token")
effective_refresh = data.get("refresh_token") or refresh
(out / "effective_refresh_token").write_text(effective_refresh, encoding="utf-8")
os.chmod(out / "effective_refresh_token", 0o600)
print("WordPress.com OAuth refresh: valid")
print("Access token: issued (value hidden)")
print("Refresh token rotated during validation:", effective_refresh != refresh)
print("expires_in:", data.get("expires_in"))
PY

printf '\n[3/6] Install WordPress.com Worker secrets and deploy verified-path v3\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi
printf '%s' "$WPCOM_SITE" | npx wrangler secret put WPCOM_SITE >/dev/null
cat "$TMP_DIR/client_id" | npx wrangler secret put WPCOM_CLIENT_ID >/dev/null
cat "$TMP_DIR/effective_refresh_token" | npx wrangler secret put WPCOM_REFRESH_TOKEN >/dev/null
npx wrangler deploy

printf '\n[4/6] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"

printf '\n[5/6] WordPress.com Agent dry run (no write)\n'
curl -fsS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "title": "LifeToLife WordPress Distribution Agent dry run",
  "text": "LifeToLife WordPress.com Distribution Agent dry run",
  "targets": ["wordpress"],
  "dry_run": true
}
JSON
printf '\n'

printf '\n[6/6] WordPress.com draft creation + persistent MCP re-query\n'
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-wordpress-agent-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON | tee "$RESPONSE_FILE"
{
  "title": "LifeToLife Distribution Agent WordPress draft test ${TEST_STAMP}",
  "text": "LifeToLife Distribution Agent WordPress.com draft integration test ${TEST_STAMP}",
  "targets": ["wordpress"]
}
JSON
printf '\n\nSaved WordPress.com Agent response: %s\n' "$RESPONSE_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
