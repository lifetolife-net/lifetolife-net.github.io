#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
BLUESKY_HANDLE="lifetolife-net.bsky.social"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/4] Validate Bluesky App Password locally with handle\n'
printf 'Bluesky App Password (input hidden): '
IFS= read -r -s BLUESKY_APP_PASSWORD
printf '\n'
if [[ -z "$BLUESKY_APP_PASSWORD" ]]; then
  echo 'Bluesky App Password is required.' >&2
  exit 1
fi

VALIDATION_JSON="$(
  BLUESKY_HANDLE="$BLUESKY_HANDLE" BLUESKY_APP_PASSWORD="$BLUESKY_APP_PASSWORD" python3 - <<'PY'
import json, os, sys, urllib.request, urllib.error

def create_session(identifier, password):
    payload = json.dumps({"identifier": identifier, "password": password}).encode()
    req = urllib.request.Request(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "LifeToLife-Distribution-Agent-Setup/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            body = json.load(e)
        except Exception:
            body = {"message": e.read().decode("utf-8", "replace")}
        raise RuntimeError(json.dumps({"status": e.code, "error": body}, ensure_ascii=False))

password = os.environ["BLUESKY_APP_PASSWORD"]
handle = os.environ["BLUESKY_HANDLE"]
try:
    by_handle = create_session(handle, password)
    did = by_handle.get("did")
    resolved_handle = by_handle.get("handle")
    if not did:
        raise RuntimeError("Handle login returned no DID")
    by_did = create_session(did, password)
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
    sys.exit(1)

print(json.dumps({
    "ok": True,
    "did": did,
    "handle": resolved_handle,
    "active": by_handle.get("active"),
    "did_login_ok": by_did.get("did") == did,
}, ensure_ascii=False))
PY
)" || {
  unset BLUESKY_APP_PASSWORD
  echo 'Bluesky local login validation failed. No Worker secret was changed.' >&2
  exit 1
}

echo "$VALIDATION_JSON"
if ! python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("ok") and d.get("did_login_ok") else 1)' <<<"$VALIDATION_JSON"; then
  unset BLUESKY_APP_PASSWORD
  echo 'Bluesky DID login validation failed. No Worker secret was changed.' >&2
  exit 1
fi

BLUESKY_DID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["did"])' <<<"$VALIDATION_JSON")"
RESOLVED_HANDLE="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("handle") or "")' <<<"$VALIDATION_JSON")"

echo "Validated Bluesky handle: ${RESOLVED_HANDLE}"
echo "Validated Bluesky DID: ${BLUESKY_DID}"

printf '\n[2/4] Replace Worker Bluesky identifier with validated DID and replace App Password\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi
printf '%s\n' "$BLUESKY_DID" | npx wrangler secret put BLUESKY_IDENTIFIER >/dev/null
printf '%s\n' "$BLUESKY_APP_PASSWORD" | npx wrangler secret put BLUESKY_APP_PASSWORD >/dev/null
unset BLUESKY_APP_PASSWORD
printf 'Worker Bluesky identifier now uses the stable DID.\n'

printf '\n[3/4] Allow the new Worker version to become active and check service health\n'
sleep 5
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

printf '\n[4/4] Bluesky-only Distribution Agent publish + persistent API re-query\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-bluesky-repair-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON | tee "$RESPONSE_FILE"
{
  "text": "LifeToLife Distribution Agent Bluesky DID repair test ${TEST_STAMP}",
  "targets": ["bluesky"]
}
JSON
printf '\n\nSaved Bluesky repair response: %s\n' "$RESPONSE_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
