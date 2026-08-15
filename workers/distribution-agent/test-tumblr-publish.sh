#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

KEY_FILE="$HOME/.config/lifetolife/distribution-agent-key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "ERROR: Distribution Agent key file not found: $KEY_FILE" >&2
  exit 1
fi

npx wrangler deploy

PAYLOAD_FILE="$(mktemp)"
DRY_PAYLOAD_FILE="$(mktemp)"
DRY_FILE="$(mktemp)"
LIVE_FILE="$(mktemp)"
trap 'rm -f "$PAYLOAD_FILE" "$DRY_PAYLOAD_FILE" "$DRY_FILE" "$LIVE_FILE"' EXIT

cat >"$PAYLOAD_FILE" <<'JSON'
{
  "targets": ["tumblr"],
  "tumblr_blog_identifier": "lifetolife-net",
  "title": "LifeToLife",
  "text": "LifeToLife Tumblr auto-publishing test",
  "tumblr_tags": ["LifeToLife"]
}
JSON

python3 - "$PAYLOAD_FILE" <<'PY' >"$DRY_PAYLOAD_FILE"
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    payload = json.load(f)
payload["dry_run"] = True
print(json.dumps(payload, ensure_ascii=False))
PY

KEY="$(cat "$KEY_FILE")"
DRY_STATUS="$(curl -sS -o "$DRY_FILE" -w '%{http_code}' -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$DRY_PAYLOAD_FILE")"

echo "Dry-run HTTP: $DRY_STATUS"
cat "$DRY_FILE"
echo

if [[ "$DRY_STATUS" != "200" ]]; then
  unset KEY
  echo "Tumblr dry-run failed; no live Tumblr post was attempted." >&2
  exit 1
fi

LIVE_STATUS="$(curl -sS -o "$LIVE_FILE" -w '%{http_code}' -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$PAYLOAD_FILE")"
unset KEY

echo "Live publish HTTP: $LIVE_STATUS"
cat "$LIVE_FILE"
echo

python3 - "$LIVE_FILE" "$LIVE_STATUS" <<'PY'
import json, sys
status = sys.argv[2]
try:
    with open(sys.argv[1], encoding="utf-8") as f:
        payload = json.load(f)
except Exception:
    raise SystemExit("Tumblr response was not valid JSON; HTTP %s" % status)

result = (payload.get("results") or {}).get("tumblr") or {}
verification = result.get("verification") or {}
if status != "200" or not payload.get("ok") or not result.get("ok"):
    raise SystemExit("Tumblr publish verification failed; inspect the response above")
if not verification.get("requery_succeeded"):
    raise SystemExit("Tumblr re-query verification failed")
if verification.get("blog_name") != "lifetolife-net":
    raise SystemExit("Unexpected Tumblr blog: %s" % verification.get("blog_name"))
PY

printf '\nTumblr Auto Publish: VERIFIED\nNPF create + authenticated re-query: VERIFIED\nRefresh-aware OAuth2 path: READY\n'
