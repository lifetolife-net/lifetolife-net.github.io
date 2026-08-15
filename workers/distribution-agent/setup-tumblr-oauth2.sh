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
START_JSON="$(curl -fsS -X POST https://distribution-api.lifetolife.net/v1/admin/tumblr-oauth-start \
  -H "Authorization: Bearer $KEY")"
unset KEY

AUTH_URL="$(python3 - "$START_JSON" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
if not p.get("ok") or not p.get("authorization_url"):
    raise SystemExit("Tumblr OAuth start failed")
print(p["authorization_url"])
PY
)"

printf 'Opening Tumblr authorization in your browser...\n'
open "$AUTH_URL"

cat <<'TXT'

Approve the LifeToLife Distribution Agent in Tumblr.
After Tumblr redirects to distribution-api.lifetolife.net, the browser should say:
  Authorization complete.

Then return here and press Enter.
TXT
read -r _

KEY="$(cat "$KEY_FILE")"
STATE_JSON="$(curl -fsS https://distribution-api.lifetolife.net/v1/verify/tumblr-auth-state \
  -H "Authorization: Bearer $KEY")"
unset KEY

python3 - "$STATE_JSON" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
print(json.dumps({
    "ok": p.get("ok"),
    "target": p.get("target"),
    "durable_object_bound": p.get("durable_object_bound"),
    "has_access_token": p.get("has_access_token"),
    "has_refresh_token": p.get("has_refresh_token"),
    "access_expires_in": p.get("access_expires_in"),
    "scope": p.get("scope"),
    "bootstrap_source": p.get("bootstrap_source"),
    "secret_values_returned": p.get("secret_values_returned"),
}, indent=2))
if not p.get("ok") or not p.get("has_access_token"):
    raise SystemExit("Tumblr OAuth verification failed")
PY

printf '\nTumblr OAuth bootstrap: VERIFIED\nNo Tumblr post was created by this script.\n'
