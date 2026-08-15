#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
WORKERS_DEV_ORIGIN="https://lifetolife-distribution-agent.jisooyoun-cafe.workers.dev"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
TMP_DIR="$(mktemp -d)"
CONFIG_FILE="$PWD/wrangler-v7.tmp.toml"
trap 'rm -rf "$TMP_DIR"; rm -f "$CONFIG_FILE"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/6] Locate the legacy TOKEN_STATE KV namespace for one-time migration\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi

npx wrangler kv namespace list > "$TMP_DIR/kv-list.json"
python3 - "$TMP_DIR/kv-list.json" "$TMP_DIR/kv-id.txt" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
items = json.loads(src.read_text(encoding="utf-8"))
for item in items:
    title = str(item.get("title") or "")
    if title == "TOKEN_STATE" or title.endswith("-TOKEN_STATE"):
        value = str(item.get("id") or "").strip()
        if value:
            out.write_text(value, encoding="utf-8")
            break
PY

if [[ ! -s "$TMP_DIR/kv-id.txt" ]]; then
  echo 'TOKEN_STATE KV namespace was not found. Stop rather than risk bootstrapping from a possibly stale Worker secret.' >&2
  exit 1
fi
KV_ID="$(cat "$TMP_DIR/kv-id.txt")"
echo "Legacy TOKEN_STATE KV namespace ID: $KV_ID"
echo 'It will be used only as the first migration candidate; ongoing auth state will use a Durable Object.'

printf '\n[2/6] Build explicit v7 config with SQLite-backed Durable Object\n'
cat > "$CONFIG_FILE" <<EOF
name = "lifetolife-distribution-agent"
main = "worker-v7.js"
compatibility_date = "2026-08-14"
workers_dev = true

[[routes]]
pattern = "distribution-api.lifetolife.net"
custom_domain = true

[[kv_namespaces]]
binding = "TOKEN_STATE"
id = "$KV_ID"

[[durable_objects.bindings]]
name = "WPCOM_AUTH_STATE"
class_name = "WordPressAuthState"

[[migrations]]
tag = "wordpress-auth-v1"
new_sqlite_classes = ["WordPressAuthState"]
EOF

python3 - "$CONFIG_FILE" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    'main = "worker-v7.js"',
    'binding = "TOKEN_STATE"',
    'name = "WPCOM_AUTH_STATE"',
    'class_name = "WordPressAuthState"',
    'new_sqlite_classes = ["WordPressAuthState"]',
]
missing = [value for value in required if value not in text]
if missing:
    raise SystemExit(f"Generated v7 config is missing: {missing}")
print('Explicit v7 config: validated')
PY

printf '\n[3/6] Deploy v7 with Durable Object auth state\n'
npx wrangler deploy --config "$CONFIG_FILE"

printf '\n[4/6] Verify v7 health on workers.dev and custom domain\n'
check_health() {
  local origin="$1"
  local label="$2"
  local outfile="$3"
  local ok=0
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "${origin}/health" > "$outfile" 2>/dev/null; then
      if python3 - "$outfile" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
ok = (
    obj.get("mode") == "verified-path-v7"
    and obj.get("wordpress_auth_state_bound") is True
    and obj.get("wordpress_auth_state_backend") == "durable-object-sqlite"
)
raise SystemExit(0 if ok else 1)
PY
      then
        ok=1
        break
      fi
    fi
    sleep 2
  done

  echo "${label} health:"
  cat "$outfile" 2>/dev/null || true
  printf '\n'
  if [[ "$ok" -ne 1 ]]; then
    echo "${label} did not reach verified-path-v7 with Durable Object auth state." >&2
    return 1
  fi
  echo "${label}: verified-path-v7 + Durable Object auth state"
}

check_health "$WORKERS_DEV_ORIGIN" "workers.dev" "$TMP_DIR/health-workers-dev.json"
check_health "$WORKER_ORIGIN" "custom domain" "$TMP_DIR/health-custom-domain.json"

printf '\n[5/6] Migrate/verify WordPress OAuth state without creating content\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
RESPONSE_FILE="/tmp/lifetolife-wordpress-durable-auth-verification.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/verify/wordpress-auth-state" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{}' | tee "$RESPONSE_FILE"
printf '\n'

printf '\n[6/6] Summarize result\n'
python3 - "$RESPONSE_FILE" "$KV_ID" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
kv_id = sys.argv[2]
obj = json.loads(path.read_text())
if not obj.get("ok"):
    print("WordPress Durable Object auth state: NOT VERIFIED")
    print("Response saved at:", path)
    raise SystemExit(1)
first = obj.get("first") or {}
second = obj.get("second") or {}
verification = obj.get("verification") or {}
state = verification.get("state") or {}
print("WordPress Durable Object auth state: VERIFIED")
print("Legacy KV migration namespace ID:", kv_id)
print("First auth source:", first.get("source"))
print("First token rotated:", first.get("rotated"))
print("First token persisted:", first.get("persisted"))
print("Second auth source:", second.get("source"))
print("Second call used cached access token:", verification.get("second_call_used_cached_access_token"))
print("Durable state has refresh token:", state.get("has_refresh_token"))
print("Durable state has access token:", state.get("has_access_token"))
print("Durable bootstrap source:", state.get("bootstrap_source"))
print("No WordPress post was created by this script.")
PY

printf '\nSaved verification response: %s\n' "$RESPONSE_FILE"
printf 'After verification, the legacy KV binding can be removed in a later cleanup deploy; it is not used for ongoing token rotation.\n'
