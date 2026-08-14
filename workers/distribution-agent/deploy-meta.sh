#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
TEST_IMAGE_URL="https://placehold.co/1080x1080.jpg?text=LifeToLife+Distribution+Agent"
KEY_DIR="${HOME}/.config/lifetolife"
KEY_FILE="${KEY_DIR}/distribution-agent-key"

printf '\n[1/6] Cloudflare authentication\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi

printf '\n[2/6] Initial Worker deployment and custom domain\n'
npx wrangler deploy

printf '\n[3/6] Local agent key + Worker secrets\n'
mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

if [[ -f "$KEY_FILE" ]]; then
  DISTRIBUTION_AGENT_KEY="$(cat "$KEY_FILE")"
else
  DISTRIBUTION_AGENT_KEY="$(openssl rand -hex 32)"
  printf '%s' "$DISTRIBUTION_AGENT_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
fi

printf '%s' "$DISTRIBUTION_AGENT_KEY" | npx wrangler secret put DISTRIBUTION_AGENT_KEY >/dev/null
printf '%s' '1179071821966202' | npx wrangler secret put META_PAGE_ID >/dev/null
printf '%s' '17841440001348167' | npx wrangler secret put INSTAGRAM_USER_ID >/dev/null

printf 'Facebook Page Access Token (input hidden): '
IFS= read -r -s META_PAGE_ACCESS_TOKEN
printf '\n'
if [[ -z "$META_PAGE_ACCESS_TOKEN" ]]; then
  echo 'Facebook Page Access Token is required.' >&2
  exit 1
fi
printf '%s' "$META_PAGE_ACCESS_TOKEN" | npx wrangler secret put META_PAGE_ACCESS_TOKEN >/dev/null

printf 'Instagram Access Token (input hidden; Enter = reuse Facebook Page token): '
IFS= read -r -s INSTAGRAM_ACCESS_TOKEN
printf '\n'
if [[ -z "$INSTAGRAM_ACCESS_TOKEN" ]]; then
  INSTAGRAM_ACCESS_TOKEN="$META_PAGE_ACCESS_TOKEN"
fi
printf '%s' "$INSTAGRAM_ACCESS_TOKEN" | npx wrangler secret put INSTAGRAM_ACCESS_TOKEN >/dev/null

printf 'Threads Access Token (input hidden): '
IFS= read -r -s THREADS_ACCESS_TOKEN
printf '\n'
if [[ -z "$THREADS_ACCESS_TOKEN" ]]; then
  echo 'Threads Access Token is required.' >&2
  exit 1
fi
printf '%s' "$THREADS_ACCESS_TOKEN" | npx wrangler secret put THREADS_ACCESS_TOKEN >/dev/null

unset META_PAGE_ACCESS_TOKEN INSTAGRAM_ACCESS_TOKEN THREADS_ACCESS_TOKEN

printf '\n[4/6] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

printf '\n[5/6] Common-pipeline dry run (no publishing)\n'
curl -fsS -X POST "${WORKER_ORIGIN}/v1/publish/meta" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "text": "LifeToLife Meta Distribution Agent dry run",
  "image_url": "${TEST_IMAGE_URL}",
  "targets": ["facebook", "instagram", "threads"],
  "dry_run": true
}
JSON
printf '\n'

printf '\n[6/6] Integrated Meta publish + persistent API re-query\n'
TEST_TEXT="LifeToLife Meta Distribution Agent integrated publishing test $(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-meta-integrated-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish/meta" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON | tee "$RESPONSE_FILE"
{
  "text": "${TEST_TEXT}",
  "image_url": "${TEST_IMAGE_URL}",
  "targets": ["facebook", "instagram", "threads"]
}
JSON
printf '\n\nSaved integrated-test response: %s\n' "$RESPONSE_FILE"
printf 'Local Distribution Agent key: %s (mode 600; do not commit)\n' "$KEY_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
