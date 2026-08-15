#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

INSTANCE="${1:-https://mastodon.social}"
INSTANCE="${INSTANCE%/}"

if [[ ! "$INSTANCE" =~ ^https://[^/]+$ ]]; then
  echo "ERROR: instance must be an HTTPS origin, for example https://mastodon.social" >&2
  exit 1
fi

cat <<'TXT'
LifeToLife Mastodon setup

Prerequisites:
1. A Mastodon account already exists on the chosen instance.
2. Create an application/access token in that account with at least:
   - write:statuses
   - read:statuses
3. Keep the token out of GitHub, Sheets, shell history, and screenshots.
TXT

printf "\nInstance: %s\n" "$INSTANCE"

INSTANCE_JSON="$(curl -fsS "$INSTANCE/api/v2/instance")"
python3 - "$INSTANCE_JSON" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
print("Instance API reachable:", p.get("domain") or p.get("title") or "yes")
PY

printf "Mastodon access token (input hidden): "
IFS= read -rs MASTODON_TOKEN
printf "\n"

if [[ -z "$MASTODON_TOKEN" ]]; then
  echo "ERROR: no access token supplied" >&2
  exit 1
fi

printf '%s' "$INSTANCE" | npx wrangler secret put MASTODON_BASE_URL
printf '%s' "$MASTODON_TOKEN" | npx wrangler secret put MASTODON_ACCESS_TOKEN
unset MASTODON_TOKEN

npx wrangler deploy

HEALTH="$(curl -fsS https://distribution-api.lifetolife.net/health)"
python3 - "$HEALTH" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
print("Worker mode:", p.get("mode"))
print("Mastodon adapter:", p.get("mastodon_adapter"))
print("Mastodon base URL configured:", p.get("mastodon_base_url_configured"))
print("Mastodon access token configured:", p.get("mastodon_access_token_configured"))
PY

KEY_FILE="$HOME/.config/lifetolife/distribution-agent-key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Worker deployed. Distribution Agent key file not found; skipping authenticated dry run."
  exit 0
fi

KEY="$(cat "$KEY_FILE")"
DRY_RUN="$(curl -fsS -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  --data '{"text":"LifeToLife Mastodon adapter dry run","targets":["mastodon"],"dry_run":true}')"
unset KEY

python3 - "$DRY_RUN" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
if not p.get("ok") or not p.get("dry_run") or "mastodon" not in (p.get("plan") or {}):
    raise SystemExit("Mastodon dry run did not return the expected plan")
print("Mastodon Distribution Agent dry run: OK")
print("No Mastodon post was created by this script.")
PY
