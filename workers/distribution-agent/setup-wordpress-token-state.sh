#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
NAMESPACE_SUFFIX="TOKEN_STATE"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/5] Find or create Cloudflare KV namespace for TOKEN_STATE\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi

npx wrangler kv namespace list > "$TMP_DIR/kv-list.json"
KV_ID="$(python3 - "$TMP_DIR/kv-list.json" "$NAMESPACE_SUFFIX" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
suffix = sys.argv[2]
raw = path.read_text(encoding='utf-8')
try:
    items = json.loads(raw)
except Exception:
    items = []
for item in items:
    title = str(item.get('title') or '')
    if title == suffix or title.endswith('-' + suffix):
        print(item.get('id') or '')
        break
PY
)"

if [[ -z "$KV_ID" ]]; then
  CREATE_OUT="$TMP_DIR/kv-create.txt"
  npx wrangler kv namespace create TOKEN_STATE | tee "$CREATE_OUT"
  KV_ID="$(python3 - "$CREATE_OUT" <<'PY'
import re, pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
patterns = [
    r'\bid\s*=\s*["\']([0-9a-fA-F]{16,64})["\']',
    r'\bID\b[^0-9a-fA-F]+([0-9a-fA-F]{16,64})',
]
for pattern in patterns:
    m = re.search(pattern, text)
    if m:
        print(m.group(1))
        break
PY
)"
fi

if [[ -z "$KV_ID" ]]; then
  echo 'Could not determine TOKEN_STATE namespace ID.' >&2
  exit 1
fi

echo "TOKEN_STATE namespace ID: $KV_ID"
echo 'KV namespace IDs are non-secret Cloudflare resource identifiers.'

printf '\n[2/5] Bind TOKEN_STATE and switch Worker to v6\n'
cat > wrangler.toml <<EOF
name = "lifetolife-distribution-agent"
main = "worker-v6.js"
compatibility_date = "2026-08-14"
workers_dev = true

[[routes]]
pattern = "distribution-api.lifetolife.net"
custom_domain = true

[[kv_namespaces]]
binding = "TOKEN_STATE"
id = "$KV_ID"
EOF

npx wrangler deploy

printf '\n[3/5] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health" | tee "$TMP_DIR/health.json"
printf '\n'

python3 - "$TMP_DIR/health.json" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
if obj.get('mode') != 'verified-path-v6':
    raise SystemExit('Expected verified-path-v6 health response')
if obj.get('wordpress_token_state_bound') is not True:
    raise SystemExit('TOKEN_STATE binding is still false')
print('TOKEN_STATE binding: confirmed')
PY

printf '\n[4/5] Verify WordPress refresh-token rotation persistence without creating content\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
RESPONSE_FILE="/tmp/lifetolife-wordpress-token-state-verification.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/verify/wordpress-token-state" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{}' | tee "$RESPONSE_FILE"
printf '\n'

printf '\n[5/5] Summarize result\n'
python3 - "$RESPONSE_FILE" "$KV_ID" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
kv_id = sys.argv[2]
obj = json.loads(path.read_text())
if not obj.get('ok'):
    print('WordPress TOKEN_STATE integration: NOT VERIFIED')
    print('Response saved at:', path)
    raise SystemExit(1)
ver = obj.get('verification') or {}
first = obj.get('first') or {}
second = obj.get('second') or {}
print('WordPress TOKEN_STATE integration: VERIFIED')
print('KV namespace ID:', kv_id)
print('KV binding:', ver.get('token_state_bound'))
print('Second refresh source:', second.get('source'))
print('KV read confirmed:', ver.get('kv_read_confirmed'))
print('First token rotated:', first.get('refresh_token_rotated'))
print('First token persisted:', first.get('refresh_token_persisted'))
print('Second token persisted:', second.get('refresh_token_persisted'))
print('No WordPress post was created by this script.')
PY

printf '\nSaved WordPress token-state verification: %s\n' "$RESPONSE_FILE"
printf 'Local wrangler.toml now contains the non-secret KV namespace binding; do not discard it before GitHub sync.\n'
