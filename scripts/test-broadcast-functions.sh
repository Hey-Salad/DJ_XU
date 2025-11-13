#!/usr/bin/env bash
set -euo pipefail

# Test the Supabase Edge Function broadcast flow end-to-end.
# Usage:
#   BROADCAST_URL=https://<project>.supabase.co/functions/v1 ./scripts/test-broadcast-functions.sh

BROADCST_BASE="${BROADCAST_URL:-}"
if [[ -z "$BROADCST_BASE" ]]; then
  echo "Set BROADCAST_URL to your Supabase Functions base (e.g., https://<ref>.supabase.co/functions/v1)" >&2
  exit 1
fi

json() { jq -r "$1" <<<"$2"; }

echo "[1/5] Starting broadcast..."
START=$(curl -s -X POST "$BROADCST_BASE/broadcast/start" \
  -H 'Content-Type: application/json' \
  -d '{"performanceSessionId":"test-'"$(date +%s)"'","maxViewers":50,"captionLanguage":"en"}')
echo "$START" | jq .

TOKEN=$(json '.broadcastToken' "$START")
[[ -z "$TOKEN" ]] && echo "Failed to get broadcast token" >&2 && exit 2

echo "\n[2/5] Checking status..."
STATUS=$(curl -s -X POST "$BROADCST_BASE/broadcast/status" \
  -H 'Content-Type: application/json' \
  -d '{"broadcastToken":"'"$TOKEN"'"}')
echo "$STATUS" | jq .

echo "\n[3/5] Sending caption..."
CAP=$(curl -s -X POST "$BROADCST_BASE/broadcast/caption" \
  -H 'Content-Type: application/json' \
  -d '{"broadcastToken":"'"$TOKEN"'","text":"Testing 1-2 from script"}')
echo "$CAP" | jq .

echo "\n[4/5] Broadcasting track..."
TR=$(curl -s -X POST "$BROADCST_BASE/broadcast/track" \
  -H 'Content-Type: application/json' \
  -d '{"broadcastToken":"'"$TOKEN"'","track":{"name":"Test Track","artist":"DJ XU"}}')
echo "$TR" | jq .

echo "\n[5/5] Ending broadcast..."
END=$(curl -s -X POST "$BROADCST_BASE/broadcast/end" \
  -H 'Content-Type: application/json' \
  -d '{"broadcastToken":"'"$TOKEN"'"}')
echo "$END" | jq .

echo "\nDone. Token: $TOKEN"

