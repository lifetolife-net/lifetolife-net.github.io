#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "[1/2] Deploy canonical Distribution Agent trigger wrapper"
npx wrangler deploy

echo
 echo "[2/2] Check public health metadata"
curl -fsS "https://distribution-api.lifetolife.net/health"
echo

echo "Trigger deployment command completed. No queue publish was manually invoked by this script."
