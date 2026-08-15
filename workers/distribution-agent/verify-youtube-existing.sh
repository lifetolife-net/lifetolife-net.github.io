#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
VIDEO_ID="${1:-PjboQXHBHOw}"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
RESPONSE_FILE="/tmp/lifetolife-youtube-existing-verification.json"

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/3] Deploy verified-path v5\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi
npx wrangler deploy

printf '\n[2/3] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

printf '\n[3/3] Re-query existing YouTube upload without uploading another video\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
curl -sS -X POST "${WORKER_ORIGIN}/v1/verify/youtube" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"video_id\":\"${VIDEO_ID}\"}" \
  | tee "$RESPONSE_FILE"

printf '\n\nSaved YouTube verification response: %s\n' "$RESPONSE_FILE"
printf 'Video ID checked: %s\n' "$VIDEO_ID"
printf 'No new YouTube video was uploaded by this script.\n'
