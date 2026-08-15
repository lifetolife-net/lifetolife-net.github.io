#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

HATENA_ID_VALUE="${1:-}"
HATENA_BLOG_ID_VALUE="${2:-}"

cat <<'TXT'
LifeToLife Hatena Blog setup

Prerequisites:
1. Create a Hatena account and Hatena Blog.
2. In Hatena Blog settings -> Advanced settings -> AtomPub, identify:
   - Hatena ID
   - Blog ID (normally the original *.hatenablog.com domain)
   - API key
3. Never paste the API key into GitHub, Google Sheets, chat, shell history, or screenshots.

This script stores the credentials as Cloudflare Worker secrets, deploys the prepared
Hatena wrapper, verifies AtomPub access without creating a post, and performs a dry run.
It does NOT create a Hatena post.
TXT

if [[ -z "$HATENA_ID_VALUE" ]]; then
  printf "\nHatena ID: "
  IFS= read -r HATENA_ID_VALUE
fi

if [[ -z "$HATENA_BLOG_ID_VALUE" ]]; then
  printf "Hatena Blog ID (for example lifetolife.hatenablog.com): "
  IFS= read -r HATENA_BLOG_ID_VALUE
fi

if [[ -z "$HATENA_ID_VALUE" || -z "$HATENA_BLOG_ID_VALUE" ]]; then
  echo "ERROR: Hatena ID and Blog ID are required" >&2
  exit 1
fi

if [[ "$HATENA_BLOG_ID_VALUE" == http://* || "$HATENA_BLOG_ID_VALUE" == https://* || "$HATENA_BLOG_ID_VALUE" == */* ]]; then
  echo "ERROR: Blog ID must be the blog domain only, not a URL or path" >&2
  exit 1
fi

printf "Hatena Blog API key (input hidden): "
IFS= read -rs HATENA_API_KEY_VALUE
printf "\n"

if [[ -z "$HATENA_API_KEY_VALUE" ]]; then
  echo "ERROR: no API key supplied" >&2
  exit 1
fi

printf '%s' "$HATENA_ID_VALUE" | npx wrangler secret put HATENA_ID
printf '%s' "$HATENA_BLOG_ID_VALUE" | npx wrangler secret put HATENA_BLOG_ID
printf '%s' "$HATENA_API_KEY_VALUE" | npx wrangler secret put HATENA_API_KEY
unset HATENA_API_KEY_VALUE

npx wrangler deploy

HEALTH="$(curl -fsS https://distribution-api.lifetolife.net/health)"
python3 - "$HEALTH" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
print("Worker mode:", p.get("mode"))
print("Hatena adapter:", p.get("hatena_publish_adapter"))
print("Hatena auth mode:", p.get("hatena_auth_mode"))
if p.get("hatena_publish_adapter") != "prepared-unverified":
    raise SystemExit("Hatena wrapper is not active")
PY

KEY_FILE="$HOME/.config/lifetolife/distribution-agent-key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Worker deployed. Distribution Agent key file not found; skipping authenticated Hatena checks."
  echo "No Hatena post was created by this script."
  exit 0
fi

KEY="$(cat "$KEY_FILE")"
VERIFY="$(curl -fsS -X POST https://distribution-api.lifetolife.net/v1/verify/hatena \
  -H "Authorization: Bearer $KEY")"

python3 - "$VERIFY" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
if not p.get("ok") or not p.get("service_document_reachable"):
    raise SystemExit("Hatena AtomPub credential verification failed")
if p.get("secret_values_returned") is not False:
    raise SystemExit("Unexpected secret exposure marker")
print("Hatena AtomPub credential check: OK")
print("Blog ID:", p.get("blog_id"))
print("Service document HTTP status:", p.get("http_status"))
PY

DRY_RUN="$(curl -fsS -X POST https://distribution-api.lifetolife.net/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  --data '{"title":"LifeToLife Hatena adapter dry run","text":"No post should be created by this request.","targets":["hatena"],"dry_run":true}')"
unset KEY

python3 - "$DRY_RUN" <<'PY'
import json, sys
p = json.loads(sys.argv[1])
if not p.get("ok") or not p.get("dry_run") or "hatena" not in (p.get("plan") or {}):
    raise SystemExit("Hatena Distribution Agent dry run did not return the expected plan")
if p.get("secret_values_returned") is not False:
    raise SystemExit("Unexpected secret exposure marker")
print("Hatena Distribution Agent dry run: OK")
print("No Hatena post was created by this script.")
PY
