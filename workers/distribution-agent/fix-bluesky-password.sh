#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
BLUESKY_IDENTIFIER="lifetolife-net.bsky.social"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/3] Validate Bluesky App Password locally before saving it\n'
printf 'Bluesky App Password (input hidden): '
IFS= read -r -s BLUESKY_APP_PASSWORD
printf '\n'
if [[ -z "$BLUESKY_APP_PASSWORD" ]]; then
  echo 'Bluesky App Password is required.' >&2
  exit 1
fi

VALIDATION_JSON="$(
  BLUESKY_IDENTIFIER="$BLUESKY_IDENTIFIER" BLUESKY_APP_PASSWORD="$BLUESKY_APP_PASSWORD" python3 - <<'PY'
import json, os, sys, urllib.request, urllib.error
payload = json.dumps({
    "identifier": os.environ["BLUESKY_IDENTIFIER"],
    "password": os.environ["BLUESKY_APP_PASSWORD"],
}).encode()
req = urllib.request.Request(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
except urllib.error.HTTPError as e:
    try:
        body = json.load(e)
    except Exception:
        body = {"message": e.read().decode("utf-8", "replace")}
    print(json.dumps({"ok": False, "status": e.code, "error": body}))
    sys.exit(1)
except Exception as e:
    print(json.dumps({"ok": False, "error": {"message": str(e)}}))
    sys.exit(1)
print(json.dumps({
    "ok": True,
    "did": data.get("did"),
    "handle": data.get("handle"),
    "active": data.get("active"),
}))
PY
)" || {
  unset BLUESKY_APP_PASSWORD
  echo 'Bluesky login validation failed. The App Password was NOT saved to Cloudflare.' >&2
  exit 1
}

echo "$VALIDATION_JSON"
if ! python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("ok") else 1)' <<<"$VALIDATION_JSON"; then
  unset BLUESKY_APP_PASSWORD
  echo 'Bluesky login validation failed. The App Password was NOT saved to Cloudflare.' >&2
  exit 1
fi

printf '\n[2/3] Replace only BLUESKY_APP_PASSWORD Worker secret\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi
printf '%s' "$BLUESKY_APP_PASSWORD" | npx wrangler secret put BLUESKY_APP_PASSWORD >/dev/null
unset BLUESKY_APP_PASSWORD
echo 'Bluesky App Password secret replaced.'

printf '\n[3/3] Bluesky-only Distribution Agent publish + persistent API re-query\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-bluesky-repair-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON | tee "$RESPONSE_FILE"
{
  "text": "LifeToLife Distribution Agent Bluesky repair test ${TEST_STAMP}",
  "targets": ["bluesky"]
}
JSON
printf '\n\nSaved Bluesky repair response: %s\n' "$RESPONSE_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
