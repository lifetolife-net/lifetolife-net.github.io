#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
WORKERS_DEV_ORIGIN="https://lifetolife-distribution-agent.jisooyoun-cafe.workers.dev"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
NAMESPACE_SUFFIX="TOKEN_STATE"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/6] Find or create Cloudflare KV namespace for TOKEN_STATE\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi

KV_ID_FILE="$TMP_DIR/kv-id.txt"
: > "$KV_ID_FILE"

npx wrangler kv namespace list > "$TMP_DIR/kv-list.json"
python3 - "$TMP_DIR/kv-list.json" "$NAMESPACE_SUFFIX" "$KV_ID_FILE" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1])
suffix = sys.argv[2]
out = pathlib.Path(sys.argv[3])
try:
    items = json.loads(src.read_text(encoding="utf-8"))
except Exception:
    items = []
for item in items:
    title = str(item.get("title") or "")
    if title == suffix or title.endswith("-" + suffix):
        value = str(item.get("id") or "").strip()
        if value:
            out.write_text(value, encoding="utf-8")
        break
PY

KV_ID="$(cat "$KV_ID_FILE")"

if [[ -z "$KV_ID" ]]; then
  CREATE_OUT="$TMP_DIR/kv-create.txt"
  npx wrangler kv namespace create TOKEN_STATE | tee "$CREATE_OUT"
  python3 - "$CREATE_OUT" "$KV_ID_FILE" <<'PY'
import pathlib, re, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
text = src.read_text(encoding="utf-8", errors="replace")
patterns = [
    r"\bid\s*=\s*[\"']([0-9a-fA-F]{16,64})[\"']",
    r"\bID\b[^0-9a-fA-F]+([0-9a-fA-F]{16,64})",
]
for pattern in patterns:
    match = re.search(pattern, text)
    if match:
        out.write_text(match.group(1), encoding="utf-8")
        break
PY
  KV_ID="$(cat "$KV_ID_FILE")"
fi

if [[ -z "$KV_ID" ]]; then
  echo 'Could not determine TOKEN_STATE namespace ID.' >&2
  exit 1
fi

echo "TOKEN_STATE namespace ID: $KV_ID"
echo 'KV namespace IDs are non-secret Cloudflare resource identifiers.'

printf '\n[2/6] Build an explicit v6 Wrangler config and validate it\n'
CONFIG_FILE="$TMP_DIR/wrangler-v6.toml"
cat > "$CONFIG_FILE" <<EOF
name = "lifetolife-distribution-agent"
main = "$PWD/worker-v6.js"
compatibility_date = "2026-08-14"
workers_dev = true

[[routes]]
pattern = "distribution-api.lifetolife.net"
custom_domain = true

[[kv_namespaces]]
binding = "TOKEN_STATE"
id = "$KV_ID"
EOF

python3 - "$CONFIG_FILE" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    'name = "lifetolife-distribution-agent"',
    'worker-v6.js',
    'binding = "TOKEN_STATE"',
    'distribution-api.lifetolife.net',
]
missing = [x for x in required if x not in text]
if missing:
    raise SystemExit(f"Generated v6 Wrangler config is missing: {missing}")
print("Explicit v6 Wrangler config: validated")
PY

printf '\n[3/6] Deploy v6 with the explicit config path\n'
npx wrangler deploy --config "$CONFIG_FILE" --cwd "$PWD"

printf '\n[4/6] Verify v6 health on workers.dev and custom domain\n'
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
raise SystemExit(0 if obj.get("mode") == "verified-path-v6" and obj.get("wordpress_token_state_bound") is True else 1)
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
    echo "${label} did not reach verified-path-v6 with TOKEN_STATE=true." >&2
    return 1
  fi
  echo "${label}: verified-path-v6 + TOKEN_STATE=true"
}

check_health "$WORKERS_DEV_ORIGIN" "workers.dev" "$TMP_DIR/health-workers-dev.json"
check_health "$WORKER_ORIGIN" "custom domain" "$TMP_DIR/health-custom-domain.json"

printf '\n[5/6] Verify WordPress refresh-token rotation persistence without creating content\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
RESPONSE_FILE="/tmp/lifetolife-wordpress-token-state-verification.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/verify/wordpress-token-state" \
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
    print("WordPress TOKEN_STATE integration: NOT VERIFIED")
    print("Response saved at:", path)
    raise SystemExit(1)
ver = obj.get("verification") or {}
first = obj.get("first") or {}
second = obj.get("second") or {}
print("WordPress TOKEN_STATE integration: VERIFIED")
print("KV namespace ID:", kv_id)
print("KV binding:", ver.get("token_state_bound"))
print("Second refresh source:", second.get("source"))
print("KV read confirmed:", ver.get("kv_read_confirmed"))
print("First token rotated:", first.get("refresh_token_rotated"))
print("First token persisted:", first.get("refresh_token_persisted"))
print("Second token persisted:", second.get("refresh_token_persisted"))
print("No WordPress post was created by this script.")
PY

printf '\nSaved WordPress token-state verification: %s\n' "$RESPONSE_FILE"
printf 'TOKEN_STATE namespace ID is non-secret and may be synced into the canonical Wrangler config after verification.\n'
