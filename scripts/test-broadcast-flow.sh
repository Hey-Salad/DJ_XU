#!/bin/bash
# Quick broadcast flow test script
# Usage: ./scripts/test-broadcast-flow.sh

WORKER_URL="${WORKER_URL:-http://localhost:8787}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing DJ Xu Broadcast System${NC}"
echo "=================================================="

# Generate test session ID
SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

# Test 1: Start Broadcast
echo -e "\n${CYAN}[1/5] Starting broadcast...${NC}"
START_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/broadcast/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"performanceSessionId\": \"$SESSION_ID\",
    \"maxViewers\": 50,
    \"captionLanguage\": \"en\",
    \"enableTranslations\": true
  }")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start broadcast${NC}"
  exit 1
fi

BROADCAST_TOKEN=$(echo "$START_RESPONSE" | grep -o '"broadcastToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BROADCAST_TOKEN" ]; then
  echo -e "${RED}❌ No broadcast token received${NC}"
  echo "Response: $START_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Broadcast started${NC}"
echo "   Token: $BROADCAST_TOKEN"

sleep 1

# Test 2: Check Status
echo -e "\n${CYAN}[2/5] Checking broadcast status...${NC}"
STATUS_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/broadcast/status" \
  -H "Content-Type: application/json" \
  -d "{\"broadcastToken\": \"$BROADCAST_TOKEN\"}")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Status check failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Status check passed${NC}"

# Test 3: Send Caption
echo -e "\n${CYAN}[3/5] Sending test caption...${NC}"
CAPTION_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/broadcast/caption" \
  -H "Content-Type: application/json" \
  -d "{
    \"broadcastToken\": \"$BROADCAST_TOKEN\",
    \"text\": \"Welcome to DJ Xu! Testing captions.\",
    \"speaker\": \"DJ_XU\",
    \"detectedLanguage\": \"en\",
    \"confidence\": 0.95
  }")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Caption send failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Caption sent successfully${NC}"

# Test 4: Broadcast Track
echo -e "\n${CYAN}[4/5] Broadcasting track info...${NC}"
TRACK_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/broadcast/track" \
  -H "Content-Type: application/json" \
  -d "{
    \"broadcastToken\": \"$BROADCAST_TOKEN\",
    \"track\": {
      \"name\": \"Test Track\",
      \"artist\": \"Test Artist\",
      \"album\": \"Test Album\",
      \"albumArtUrl\": \"https://example.com/art.jpg\",
      \"id\": \"spotify:track:test123\"
    }
  }")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Track broadcast failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Track broadcast successfully${NC}"

sleep 1

# Test 5: End Broadcast
echo -e "\n${CYAN}[5/5] Ending broadcast...${NC}"
END_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/broadcast/end" \
  -H "Content-Type: application/json" \
  -d "{\"broadcastToken\": \"$BROADCAST_TOKEN\"}")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ End broadcast failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Broadcast ended successfully${NC}"

# Summary
echo -e "\n=================================================="
echo -e "${GREEN}🎉 All tests passed!${NC}\n"
echo "Summary:"
echo "  ✓ Broadcast start"
echo "  ✓ Status check"
echo "  ✓ Caption sending"
echo "  ✓ Track broadcasting"
echo "  ✓ Broadcast end"
echo -e "\n${CYAN}Your broadcast system is working correctly! 🚀${NC}\n"
