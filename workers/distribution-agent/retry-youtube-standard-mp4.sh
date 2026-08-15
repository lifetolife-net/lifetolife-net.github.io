#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WORKER_ORIGIN="https://distribution-api.lifetolife.net"
KNOWN_GOOD_VIDEO_ID="llXXvCyOMiw"
AGENT_KEY_FILE="${HOME}/.config/lifetolife/distribution-agent-key"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$AGENT_KEY_FILE" ]]; then
  echo "Missing Distribution Agent key: $AGENT_KEY_FILE" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is not installed or not on PATH. No YouTube upload was attempted." >&2
  exit 1
fi

DISTRIBUTION_AGENT_KEY="$(cat "$AGENT_KEY_FILE")"

printf '\n[1/4] Verify previously persistent YouTube video with current Worker credentials\n'
KNOWN_GOOD_RESPONSE="$TMP_DIR/known-good.json"
HTTP_CODE="$(curl -sS -o "$KNOWN_GOOD_RESPONSE" -w '%{http_code}' \
  -X POST "${WORKER_ORIGIN}/v1/verify/youtube" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -H 'Content-Type: application/json' \
  --data "{\"video_id\":\"${KNOWN_GOOD_VIDEO_ID}\"}")"
cat "$KNOWN_GOOD_RESPONSE"
printf '\n'

python3 - "$KNOWN_GOOD_RESPONSE" "$HTTP_CODE" <<'PY'
import json, sys
path, http_code = sys.argv[1], int(sys.argv[2])
with open(path, encoding='utf-8') as f:
    data = json.load(f)
y = ((data.get('results') or {}).get('youtube') or {})
v = y.get('verification') or {}
if http_code >= 300 or data.get('ok') is not True or y.get('ok') is not True:
    raise SystemExit('Known-good YouTube video could not be verified with current Worker credentials. No new upload will be attempted.')
if v.get('upload_status') != 'processed' or v.get('processing_status') != 'succeeded':
    raise SystemExit(f"Known-good video is visible but not processed/succeeded: upload={v.get('upload_status')} processing={v.get('processing_status')}. No new upload attempted.")
print('Known-good YouTube read path: verified (processed / succeeded)')
PY

printf '\n[2/4] Generate standards-compliant H.264/AAC MP4 with ffmpeg\n'
VIDEO_FILE="$TMP_DIR/lifetolife-youtube-standard-test.mp4"
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i 'color=c=black:s=640x360:r=30:d=5' \
  -f lavfi -i 'anullsrc=channel_layout=stereo:sample_rate=48000' \
  -shortest -t 5 \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p -profile:v high -level 3.0 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$VIDEO_FILE"

if [[ ! -s "$VIDEO_FILE" ]]; then
  echo 'ffmpeg did not create a non-empty MP4. No upload attempted.' >&2
  exit 1
fi

FILE_SIZE="$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE")"
printf 'Generated MP4: %s bytes\n' "$FILE_SIZE"
if command -v ffprobe >/dev/null 2>&1; then
  ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type,width,height,pix_fmt \
    -of json "$VIDEO_FILE"
fi

printf '\n[3/4] Upload exactly one new private standard MP4 through Distribution Agent\n'
TEST_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE_FILE="/tmp/lifetolife-youtube-standard-agent-test.json"
HTTP_CODE="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
  -X POST "${WORKER_ORIGIN}/v1/publish/youtube" \
  -H "Authorization: Bearer ${DISTRIBUTION_AGENT_KEY}" \
  -F "video=@${VIDEO_FILE};type=video/mp4" \
  -F "title=LifeToLife Distribution Agent standard MP4 private test ${TEST_STAMP}" \
  -F 'description=Private standards-compliant H.264/AAC verification upload from LifeToLife Distribution Agent.' \
  -F 'privacy_status=private')"
cat "$RESPONSE_FILE"
printf '\n'

printf '\n[4/4] Summarize result\n'
python3 - "$RESPONSE_FILE" "$HTTP_CODE" <<'PY'
import json, sys
path, http_code = sys.argv[1], int(sys.argv[2])
with open(path, encoding='utf-8') as f:
    data = json.load(f)
y = ((data.get('results') or {}).get('youtube') or {})
if data.get('ok') is True and y.get('ok') is True:
    v = y.get('verification') or {}
    print('YouTube Agent integration: VERIFIED')
    print('Video ID:', y.get('id'))
    print('Upload HTTP status:', y.get('upload_http_status'))
    print('Privacy:', v.get('privacy_status'))
    print('Upload status:', v.get('upload_status'))
    print('Processing status:', v.get('processing_status'))
else:
    print('YouTube Agent integration: NOT VERIFIED')
    print('HTTP status:', http_code)
    print('Full response saved for diagnosis.')
PY

printf '\nSaved YouTube standard-MP4 response: %s\n' "$RESPONSE_FILE"
printf 'No other channel was published by this script.\n'
