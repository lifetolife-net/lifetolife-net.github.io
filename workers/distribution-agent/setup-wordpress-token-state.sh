#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo 'Workers KV is eventually consistent and is not safe for rotating WordPress OAuth refresh-token state.'
echo 'Use the strongly consistent Durable Object migration instead.'
exec bash ./setup-wordpress-auth-do.sh
