#!/usr/bin/env bash
#
# Start Gateway + UI in production mode
# Usage: ./scripts/prod.sh
#
# - Kills any existing gateway/ui-next processes
# - Runs the full gateway with all channels enabled
# - Starts ui-next and opens browser
# - Press Ctrl+C to stop both

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

GATEWAY_PORT=18789
UI_PORT=3000

info() { echo -e "${BLUE}[info]${NC} $1"; }
ok() { echo -e "${GREEN}[ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1"; }

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║     ORIGIN — Production Mode          ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Kill existing processes
cleanup_existing() {
    local killed=0

    # Kill existing gateway processes
    if pgrep -f "openclaw.*gateway" > /dev/null 2>&1; then
        warn "Killing existing gateway process..."
        pkill -9 -f "openclaw.*gateway" 2>/dev/null || true
        killed=1
    fi

    # Kill processes on gateway port
    if lsof -ti:$GATEWAY_PORT > /dev/null 2>&1; then
        warn "Killing process on port $GATEWAY_PORT..."
        lsof -ti:$GATEWAY_PORT | xargs kill -9 2>/dev/null || true
        killed=1
    fi

    # Kill existing next dev on UI port
    if lsof -ti:$UI_PORT > /dev/null 2>&1; then
        warn "Killing process on port $UI_PORT..."
        lsof -ti:$UI_PORT | xargs kill -9 2>/dev/null || true
        killed=1
    fi

    if [ $killed -eq 1 ]; then
        sleep 1
        ok "Cleaned up existing processes"
    fi
}

# Trap Ctrl+C to kill both processes
cleanup() {
    echo ""
    warn "Shutting down..."
    kill $GATEWAY_PID $UI_PID 2>/dev/null || true
    wait $GATEWAY_PID $UI_PID 2>/dev/null || true
    ok "Stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Clean up any existing processes first
cleanup_existing

# Check if config exists
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
    err "No config found at ~/.openclaw/openclaw.json"
    info "Run: pnpm openclaw onboard"
    exit 1
fi

# Start gateway in production mode
info "Starting gateway on port $GATEWAY_PORT..."
node scripts/run-node.mjs gateway run --force 2>&1 &
GATEWAY_PID=$!

# Wait for gateway to be ready
info "Waiting for gateway..."
for i in {1..30}; do
    if curl -s "http://localhost:$GATEWAY_PORT" > /dev/null 2>&1; then
        ok "Gateway ready"
        break
    fi
    if ! kill -0 $GATEWAY_PID 2>/dev/null; then
        err "Gateway failed to start"
        exit 1
    fi
    sleep 1
done

# Start ui-next
info "Starting UI on port $UI_PORT..."
cd ui-next && pnpm dev 2>&1 &
UI_PID=$!
cd "$PROJECT_DIR"

# Wait for UI to be ready, then open browser
info "Waiting for UI..."
for i in {1..30}; do
    if curl -s "http://localhost:$UI_PORT" > /dev/null 2>&1; then
        ok "UI ready"
        sleep 1
        # Open browser (macOS)
        open "http://localhost:$UI_PORT" 2>/dev/null || true
        break
    fi
    if ! kill -0 $UI_PID 2>/dev/null; then
        err "UI failed to start"
        kill $GATEWAY_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Gateway:${NC}  http://localhost:$GATEWAY_PORT"
echo -e "${GREEN}  UI:${NC}       http://localhost:$UI_PORT"
echo -e "${CYAN}────────────────────────────────────────────${NC}"
echo -e "  Config:   ~/.openclaw/openclaw.json"
echo -e "  Channels: pnpm openclaw channels status"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop"
echo ""

# Wait for either process to exit
wait $GATEWAY_PID $UI_PID
