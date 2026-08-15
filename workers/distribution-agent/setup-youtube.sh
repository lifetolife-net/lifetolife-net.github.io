#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
EXPECTED_CHANNEL_ID="UCzB_Os4W_7MiVDpGbXfsqxA"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

printf '\n[1/6] Find previously verified YouTube OAuth token\n'
python3 - "$HOME" "$TMP_DIR" <<'PY'
import json, os, pathlib, sys
home = pathlib.Path(sys.argv[1]).expanduser()
out = pathlib.Path(sys.argv[2])
roots = [home / ".lifetolife-distribution", home / ".config"]
candidates = []
for p in home.iterdir():
    if p.is_file():
        try:
            if p.stat().st_size < 1_000_000:
                candidates.append(p)
        except OSError:
            pass
for root in roots:
    if not root.exists():
        continue
    for dirpath, dirnames, filenames in os.walk(root):
        if len(pathlib.Path(dirpath).relative_to(root).parts) >= 5:
            dirnames[:] = []
        for name in filenames:
            p = pathlib.Path(dirpath) / name
            try:
                if p.stat().st_size < 1_000_000:
                    candidates.append(p)
            except OSError:
                pass

def vals(obj, key):
    outv = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                outv.append(v)
            outv.extend(vals(v, key))
    elif isinstance(obj, list):
        for v in obj:
            outv.extend(vals(v, key))
    return outv

parsed = []
seen = set()
for p in candidates:
    if p in seen:
        continue
    seen.add(p)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        continue
    parsed.append((p, data))

matches = []
for p, data in parsed:
    refreshes = [v for v in vals(data, "refresh_token") if isinstance(v, str) and v]
    if not refreshes:
        continue
    scopes = vals(data, "scopes") + vals(data, "scope")
    scope_text = " ".join(
        " ".join(v) if isinstance(v, list) else str(v)
        for v in scopes
    )
    client_ids = [str(v) for v in vals(data, "client_id") if v]
    client_secrets = [str(v) for v in vals(data, "client_secret") if v]
    score = 0
    if "youtube.upload" in scope_text:
        score += 200
    if "youtube.readonly" in scope_text:
        score += 50
    if "youtube.force-ssl" in scope_text:
        score += 20
    lname = p.name.lower()
    if "youtube" in lname:
        score += 100
    if "token" in lname:
        score += 20
    matches.append({
        "score": score,
        "mtime": p.stat().st_mtime,
        "path": p,
        "refresh": refreshes[0],
        "client_id": client_ids[0] if client_ids else "",
        "client_secret": client_secrets[0] if client_secrets else "",
        "scope_text": scope_text,
    })

if not matches:
    raise SystemExit("Could not find a local OAuth token JSON containing a refresh_token.")
matches.sort(key=lambda x: (x["score"], x["mtime"]), reverse=True)
selected = matches[0]
if "youtube.upload" not in selected["scope_text"]:
    raise SystemExit(f"Best token candidate does not contain youtube.upload scope: {selected['path']}")

client_id = selected["client_id"]
client_secret = selected["client_secret"]
if not client_id or not client_secret:
    for p, data in parsed:
        installed = data.get("installed") if isinstance(data, dict) else None
        web = data.get("web") if isinstance(data, dict) else None
        client = installed or web or {}
        cid = client.get("client_id")
        if cid and (not client_id or cid == client_id):
            client_id = client_id or cid
            client_secret = client_secret or client.get("client_secret", "")
            if client_id and client_secret:
                break

if not client_id:
    raise SystemExit("YouTube OAuth client_id was not found in the selected token or nearby credentials JSON.")

for name, value in {
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": selected["refresh"],
}.items():
    path = out / name
    path.write_text(value, encoding="utf-8")
    os.chmod(path, 0o600)

print(f"Selected YouTube token file: {selected['path']}")
print("youtube.upload scope: present")
print(f"Client ID: {client_id}")
print("Client secret: present" if client_secret else "Client secret: absent")
print("Refresh token: present (value hidden)")
PY

printf '\n[2/6] Validate Google refresh token and LifeToLife YouTube channel identity\n'
python3 - "$TMP_DIR" "$EXPECTED_CHANNEL_ID" <<'PY'
import json, pathlib, sys, urllib.parse, urllib.request, urllib.error
out = pathlib.Path(sys.argv[1])
expected = sys.argv[2]
client_id = (out / "client_id").read_text().strip()
client_secret = (out / "client_secret").read_text().strip()
refresh_token = (out / "refresh_token").read_text().strip()
params = {
    "client_id": client_id,
    "refresh_token": refresh_token,
    "grant_type": "refresh_token",
}
if client_secret:
    params["client_secret"] = client_secret
req = urllib.request.Request(
    "https://oauth2.googleapis.com/token",
    data=urllib.parse.urlencode(params).encode(),
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        token = json.load(resp)
except urllib.error.HTTPError as e:
    raise SystemExit(f"Google refresh-token validation failed (HTTP {e.code}): {e.read().decode('utf-8','replace')}")
access = token.get("access_token")
if not access:
    raise SystemExit("Google refresh response returned no access_token")
url = "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true"
req2 = urllib.request.Request(url, headers={"Authorization": f"Bearer {access}"})
try:
    with urllib.request.urlopen(req2, timeout=30) as resp:
        data = json.load(resp)
except urllib.error.HTTPError as e:
    raise SystemExit(f"YouTube channel identity check failed (HTTP {e.code}): {e.read().decode('utf-8','replace')}")
items = data.get("items") or []
if not items:
    raise SystemExit("YouTube channels.list(mine=true) returned no channel")
channel = items[0]
channel_id = channel.get("id")
title = (channel.get("snippet") or {}).get("title")
print(f"Authenticated YouTube channel: {title} / {channel_id}")
if channel_id != expected:
    raise SystemExit(f"Wrong YouTube channel. Expected {expected}, got {channel_id}")
print("LifeToLife channel identity: verified")
PY

printf '\n[3/6] Install YouTube Worker secrets and deploy v4\n'
if ! npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler login
fi
cat "$TMP_DIR/client_id" | npx wrangler secret put YOUTUBE_CLIENT_ID >/dev/null
if [[ -s "$TMP_DIR/client_secret" ]]; then
  cat "$TMP_DIR/client_secret" | npx wrangler secret put YOUTUBE_CLIENT_SECRET >/dev/null
fi
cat "$TMP_DIR/refresh_token" | npx wrangler secret put YOUTUBE_REFRESH_TOKEN >/dev/null
npx wrangler deploy

printf '\n[4/6] Health check\n'
curl -fsS "${WORKER_ORIGIN}/health"
printf '\n'

printf '\n[5/6] Build tiny private YouTube verification video locally\n'
VIDEO_FILE="$TMP_DIR/lifetolife-youtube-agent-test.mp4"
python3 - "$VIDEO_FILE" <<'PY'
import base64, pathlib, sys
b64 = "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOybW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAt10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAKAAAABaAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAIAAABAAAAAAJVbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACAG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAcBzdGJsAAAAwHN0c2QAAAAAAAAAAQAAALBhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAKAAWgBIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANmF2Y0MBZAAK/+EAGWdkAAqs2UKN+TARAAADAAEAAAMAFA8SJZYBAAZo6+PLIsD9+PgAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAAG4AAAAAAAAAAGHN0dHMAAAAAAAAAAQAAAAoAAAQAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAABgY3R0cwAAAAAAAAAKAAAAAQAACAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAAQAACAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAoAAAABAAAAPHN0c3oAAAAAAAAAAAAAAAoAAALlAAAAEAAAAA0AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAVAAAAFHN0Y28AAAAAAAAAAQAAA+IAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYxLjcuMTAzAAAACGZyZWUAAAN4bWRhdAAAAq4GBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMiBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0zIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0xMCBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAC9liIQAEf/+94gfMstvnGrXchHnrS6tH1DuRng0eBKr1XWQ3rp3ldUFRAAawIwIgQAAAAxBmiRsQQ/+qlUAPGAAAAAJQZ5CeId/AGhBAAAACQGeYXRDfwCUgAAAAAkBnmNqQ38AlIEAAAASQZpoSahBaJlMCHf//qmWAOaBAAAAC0GehkURLDv/AGhBAAAACQGepXRDfwCUgQAAAAkBnqdqQ38AlIAAAAARQZqpSahBbJlMCG///qeEAcc="
path = pathlib.Path(sys.argv[1])
path.write_bytes(base64.b64decode(b64))
print(f"Verification MP4: {path} ({path.stat().st_size} bytes)")
PY

printf '\n[6/6] YouTube private upload + videos.list processing verification\n'
DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-youtube-agent-test.json"

curl -sS -X POST "${WORKER_ORIGIN}/v1/publish/youtube" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -F "video=@${VIDEO_FILE};type=video/mp4" \
  -F "title=LifeToLife Distribution Agent YouTube private test ${TEST_STAMP}" \
  -F "description=Automated private verification upload from the LifeToLife Distribution Agent." \
  -F "privacy_status=private" \
  | tee "$RESPONSE_FILE"
printf '\n\nSaved YouTube Agent response: %s\n' "$RESPONSE_FILE"
printf 'Worker endpoint: %s\n' "$WORKER_ORIGIN"
