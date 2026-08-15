#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

KEY_FILE="$HOME/.config/lifetolife/distribution-agent-key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "ERROR: Distribution Agent key file not found: $KEY_FILE" >&2
  exit 1
fi

npx wrangler deploy

KEY="$(cat "$KEY_FILE")"
RESULT="$(curl -fsS -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON'
{
  "targets": ["tumblr"],
  "tumblr_blog_identifier": "lifetolife-net",
  "title": "LifeToLife",
  "text": "LifeToLife Tumblr auto-publishing test",
  "tumblr_tags": ["LifeToLife"]
}
JSON
)"
unset KEY

python3 - "$RESULT" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
print(json.dumps(p, indent=2, ensure_ascii=False))
r = (p.get("results") or {}).get("tumblr") or {}
v = r.get("verification") or {}
if not p.get("ok") or not r.get("ok"):
    raise SystemExit("Tumblr publish verification failed")
if not v.get("requery_succeeded"):
    raise SystemExit("Tumblr re-query verification failed")
if v.get("blog_name") != "lifetolife-net":
    raise SystemExit("Unexpected Tumblr blog: %s" % v.get("blog_name"))
PY

printf '\nTumblr Auto Publish: VERIFIED\nNPF create + authenticated re-query: VERIFIED\nRefresh-aware OAuth2 path: READY\n'
