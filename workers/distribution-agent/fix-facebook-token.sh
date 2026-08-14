#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PAGE_ID="1179071821966202"
WORKER_ORIGIN="https://distribution-api.lifetolife.net"
KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing local Distribution Agent key: $KEY_FILE" >&2
  exit 1
fi

printf 'Facebook Page Access Token (input hidden): '
IFS= read -r -s PAGE_TOKEN
printf '\n'

if [[ -z "$PAGE_TOKEN" ]]; then
  echo 'Token is required.' >&2
  exit 1
fi

printf '\n[1/3] Verify that the token identifies the Life to Life Page\n'
IDENTITY="$(curl -sS -G 'https://graph.facebook.com/v26.0/me' \
  --data-urlencode 'fields=id,name' \
  --data-urlencode "access_token=${PAGE_TOKEN}")"
printf '%s\n' "$IDENTITY"

TOKEN_ID="$(printf '%s' "$IDENTITY" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id", ""))' 2>/dev/null || true)"
if [[ "$TOKEN_ID" != "$PAGE_ID" ]]; then
  echo >&2
  echo "STOP: this token does not identify Page ${PAGE_ID}." >&2
  echo "Copy the access_token value returned INSIDE the Graph API response for:" >&2
  echo "  /${PAGE_ID}?fields=name,access_token" >&2
  echo "Do not copy the User Access Token shown in Graph API Explorer's token box." >&2
  exit 1
fi

printf '\n[2/3] Store the validated Page token as a Cloudflare Worker secret\n'
printf '%s' "$PAGE_TOKEN" | npx wrangler secret put META_PAGE_ACCESS_TOKEN >/dev/null
unset PAGE_TOKEN

printf '\n[3/3] Facebook-only Distribution Agent publish + persistent re-query\n'
DISTRIBUTION_AGENT_KEY="$(cat "$KEY_FILE")"
TEST_TEXT="LifeToLife Distribution Agent Facebook repair test $(date -u +%Y-%m-%dT%H:%M:%SZ)"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish/meta" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "text": "${TEST_TEXT}",
  "targets": ["facebook"]
}
JSON
printf '\n'
