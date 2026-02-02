#!/usr/bin/env bash
#
# Origin Dev Helper
# Common development tasks in one place
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo ""
    echo -e "${CYAN}Origin Dev Helper${NC}"
    echo ""
    echo "Usage: ./scripts/dev-helper.sh <command>"
    echo ""
    echo "Commands:"
    echo "  build        Build the project"
    echo "  dev          Run CLI in dev mode"
    echo "  gateway      Start gateway (fast mode, no channels)"
    echo "  gateway-full Start gateway with all channels"
    echo "  test         Run all tests"
    echo "  test-watch   Run tests in watch mode"
    echo "  lint         Run linter"
    echo "  fix          Auto-fix lint issues"
    echo "  clean        Clean build artifacts"
    echo "  reset        Reset dev config"
    echo "  logs         Show recent gateway logs"
    echo "  status       Show channel status"
    echo ""
}

cmd_build() {
    echo -e "${BLUE}Building...${NC}"
    cd "$PROJECT_DIR"
    pnpm build
    echo -e "${GREEN}Build complete${NC}"
}

cmd_dev() {
    cd "$PROJECT_DIR"
    shift 2>/dev/null || true
    pnpm dev "$@"
}

cmd_gateway() {
    echo -e "${BLUE}Starting gateway (fast mode)...${NC}"
    cd "$PROJECT_DIR"
    OPENCLAW_SKIP_CHANNELS=1 pnpm dev gateway run --force
}

cmd_gateway_full() {
    echo -e "${BLUE}Starting gateway (all channels)...${NC}"
    cd "$PROJECT_DIR"
    pnpm dev gateway run --force
}

cmd_test() {
    cd "$PROJECT_DIR"
    pnpm test
}

cmd_test_watch() {
    cd "$PROJECT_DIR"
    pnpm test --watch
}

cmd_lint() {
    cd "$PROJECT_DIR"
    pnpm lint
}

cmd_fix() {
    cd "$PROJECT_DIR"
    pnpm lint:fix
}

cmd_clean() {
    echo -e "${YELLOW}Cleaning build artifacts...${NC}"
    cd "$PROJECT_DIR"
    rm -rf dist/
    rm -rf node_modules/.cache/
    echo -e "${GREEN}Clean complete${NC}"
}

cmd_reset() {
    echo -e "${YELLOW}Resetting dev config...${NC}"
    rm -rf ~/.openclaw-dev/
    echo -e "${GREEN}Dev config reset${NC}"
}

cmd_logs() {
    cd "$PROJECT_DIR"
    if [ -f ~/.openclaw/gateway.log ]; then
        tail -100 ~/.openclaw/gateway.log
    else
        echo "No gateway logs found"
    fi
}

cmd_status() {
    cd "$PROJECT_DIR"
    pnpm dev channels status
}

# Main
case "${1:-help}" in
    build)       cmd_build ;;
    dev)         cmd_dev "$@" ;;
    gateway)     cmd_gateway ;;
    gateway-full) cmd_gateway_full ;;
    test)        cmd_test ;;
    test-watch)  cmd_test_watch ;;
    lint)        cmd_lint ;;
    fix)         cmd_fix ;;
    clean)       cmd_clean ;;
    reset)       cmd_reset ;;
    logs)        cmd_logs ;;
    status)      cmd_status ;;
    help|--help|-h|"")
        show_help ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1 ;;
esac
