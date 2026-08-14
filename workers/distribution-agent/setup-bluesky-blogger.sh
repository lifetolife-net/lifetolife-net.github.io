#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
BLOGGER_DIR="${HOME}/.lifetolife-distribution/blogger"
BLOGGER_CREDENTIALS="${BLOGGER_DIR}/credentials.json"
BLOGGER_TOKEN="${BLOGGER_DIR}/token.json"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

printf '\n[1/6] Existing local credentials check\n'
if [[ ! -f "$BLOGGER_CREDENTIALS" ]]; then
  echo "Missing Blogger credentials file: $BLOGGER_CREDENTIALS" >&2
  exit 1
fi
if [[ ! -f "$BLOGGER_TOKEN" ]]; then
  echo "Missing Blogger token file: $BLOGGER_TOKEN" >&2
  exit 1
fi
if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

python3 - "$BLOGGER_CREDENTIALS" "$BLOGGER_TOKEN" "$TMP_DIR" <<'PY'
import json, os, sys
credentials_path, token_path, out_dir = sys.argv[1:]
with open(credentials_path, encoding="utf-8") as f:
    credentials = json.load(f)
with open(token_path, encoding="utf-8") as f:
    token = json.load(f)
client = credentials.get("installed") or credentials.get("web") or {}
client_id = token.get("client_id") or client.get("client_id")
client_secret = token.get("client_secret") or client.get("client_secret") or ""
refresh_token = token.get("refresh_token")
scopes = token.get("scopes") or []
if isinstance(scopes, str):
    scopes = scopes.split()
if not client_id:
    raise SystemExit("Blogger OAuth client_id was not found in credentials/token JSON")
if not refresh_token:
    raise SystemExit("Blogger refresh_token was not found in token.json")
if scopes and "https://www.googleapis.com/auth/blogger" not in scopes:
    raise SystemExit("token.json does not contain the Blogger OAuth scope")
for name, value in {
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": refresh_token,
}.items():
    path = os.path.join(out_dir, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(value)
    os.chmod(path, 0o600)
print("Blogger local OAuth files: valid")
print("Blogger refresh token: present")
PY

printf '\n[2/6] Cloudflare authentication and Worker secrets\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi

printf '%s' '6980894376000692850' | npx wrangler secret put BLOGGER_BLOG_ID >/dev/null
cat "$TMP_DIR/client_id" | npx wrangler secret put BLOGGER_CLIENT_ID >/dev/null
if [[ -s "$TMP_DIR/client_secret" ]]; then
  cat "$TMP_DIR/client_secret" | npx wrangler secret put BLOGGER_CLIENT_SECRET >/dev/null
fi
cat "$TMP_DIR/refresh_token" | npx wrangler secret put BLOGGER_REFRESH_TOKEN >/dev/null

printf '%s' 'lifetolife-net.bsky.social' | npx wrangler secret put BLUESKY_IDENTIFIER >/dev/null
printf 'Bluesky App Password (input hidden): '
IFS= read -r -s BLUESKY_APP_PASSWORD
printf '\n'
if [[ -z "$BLUESKY_APP_PASSWORD" ]]; then
  echo 'Bluesky App Password is required.' >&2
  exit 1
fi
printf '%s' "$BLUESKY_APP_PASSWORD" | npx wrangler secret put BLUESKY_APP_PASSWORD >/dev/null
unset BLUESKY_APP_PASSWORD

echo 'Blogger + Bluesky Worker secrets installed. Values were not printed.'

printf '\n[3/6] Deploy verified-path v2 Worker\n'
npx wrangler deploy

printf '\n[4/6] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"

printf '\n[5/6] Bluesky + Blogger common-pipeline dry run (no publishing)\n'
curl -fsS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "title": "LifeToLife Distribution Agent dry run",
  "text": "LifeToLife Bluesky + Blogger Distribution Agent dry run",
  "targets": ["bluesky", "blogger"],
  "dry_run": true
}
JSON
printf '\n'

printf '\n[6/6] Bluesky + Blogger integrated publish + persistent API re-query\n'
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TEST_TEXT="LifeToLife Distribution Agent Bluesky + Blogger integrated publishing test ${TEST_STAMP}"
TEST_TITLE="LifeToLife Distribution Agent integrated test ${TEST_STAMP}"
RESPONSE_FILE="/tmp/lifetolife-bluesky-blogger-integrated-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON | tee "$RESPONSE_FILE"
{
  "title": "${TEST_TITLE}",
  "text": "${TEST_TEXT}",
  "targets": ["bluesky", "blogger"]
}
JSON
printf '\n\nSaved integrated-test response: %s\n' "$RESPONSE_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
