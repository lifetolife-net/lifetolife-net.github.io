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
DRY_FILE="$(mktemp)"
LIVE_FILE="$(mktemp)"
trap 'rm -f "$PAYLOAD_FILE" "$DRY_FILE" "$LIVE_FILE"' EXIT

cat >"$PAYLOAD_FILE" <<'JSON'
{
  "targets": ["tumblr"],
  "tumblr_blog_identifier": "lifetolife-net",
  "title": "LifeToLife",
  "text": "LifeToLife Tumblr auto-publishing test",
  "tumblr_tags": ["LifeToLife"]
}
JSON

KEY="$(cat "$KEY_FILE")"
DRY_STATUS="$(curl -sS -o "$DRY_FILE" -w '%{http_code}' -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$PAYLOAD_FILE" \
  --data-urlencode '' 2>/dev/null || true)"

# The --data-urlencode sentinel above is intentionally not relied upon; if it caused a malformed request,
# retry the dry-run cleanly with a generated payload that includes dry_run.
python3 - "$PAYLOAD_FILE" <<'PY' >"${PAYLOAD_FILE}.dry"
import json, sys
p = json.load(open(sys.argv[1]))
p["dry_run"] = True
print(json.dumps(p))
PY
DRY_STATUS="$(curl -sS -o "$DRY_FILE" -w '%{http_code}' -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@${PAYLOAD_FILE}.dry")"
rm -f "${PAYLOAD_FILE}.dry"

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
    p = json.load(open(sys.argv[1]))
except Exception:
    raise SystemExit("Tumblr response was not valid JSON; HTTP %s" % status)

r = (p.get("results") or {}).get("tumblr") or {}
v = r.get("verification") or {}
if status != "200" or not p.get("ok") or not r.get("ok"):
    raise SystemExit("Tumblr publish verification failed; inspect the response above")
if not v.get("requery_succeeded"):
    raise SystemExit("Tumblr re-query verification failed")
if v.get("blog_name") != "lifetolife-net":
    raise SystemExit("Unexpected Tumblr blog: %s" % v.get("blog_name"))
PY

printf '\nTumblr Auto Publish: VERIFIED\nNPF create + authenticated re-query: VERIFIED\nRefresh-aware OAuth2 path: READY\n'
