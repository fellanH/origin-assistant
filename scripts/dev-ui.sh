#!/usr/bin/env bash
#
# Start Gateway + UI for development
# Usage: ./scripts/dev-ui.sh
#
# Starts both the gateway server and ui-next dev server concurrently.
# Press Ctrl+C to stop both.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting Origin dev environment...${NC}"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $GATEWAY_PID $UI_PID 2>/dev/null || true
    wait $GATEWAY_PID $UI_PID 2>/dev/null || true
    echo -e "${GREEN}Done${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start gateway (skip channels for faster startup)
echo -e "${GREEN}[gateway]${NC} Starting on port 18789..."
OPENCLAW_SKIP_CHANNELS=1 node scripts/run-node.mjs --dev gateway &
GATEWAY_PID=$!

# Give gateway a moment to start
sleep 2

# Start ui-next
echo -e "${GREEN}[ui-next]${NC} Starting on port 3000..."
cd ui-next && pnpm dev &
UI_PID=$!

cd "$PROJECT_DIR"

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Gateway:${NC}  http://localhost:18789"
echo -e "${GREEN}  UI:${NC}       http://localhost:3000"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for either process to exit
wait $GATEWAY_PID $UI_PID
