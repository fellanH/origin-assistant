#!/usr/bin/env bash
#
# Origin Quick Start Script
# Automates initial setup for new users cloning or forking this repo.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENTRY_POINT="$PROJECT_DIR/dist/entry-bootstrap.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄"
echo "  █░▄▄▀██░▄▄▄░██░▄▄▀██▄░▄██░▄▄▀██░▀██░██░▄▄▀█"
echo "  █░█████░███░██░▀▀▄███░███░▀▀░██░█░█░██░▀▀░█"
echo "  █░▀▀▄██░▀▀▀░██░██░██▀░▀██░██░██░██▄░██░██░█"
echo "  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀"
echo "           ORIGIN QUICK START"
echo ""

# Check prerequisites
info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node 22+ first."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    error "Node.js version 22+ required. Found: $(node -v)"
fi
success "Node.js $(node -v)"

if ! command -v pnpm &> /dev/null; then
    warn "pnpm not found. Installing..."
    npm install -g pnpm
fi
success "pnpm $(pnpm -v)"

# Install dependencies
info "Installing dependencies..."
cd "$PROJECT_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
success "Dependencies installed"

# Build the project
info "Building project..."
pnpm build
success "Build complete"

# Detect shell and config file
detect_shell_config() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
        echo "$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
        echo "$HOME/.bashrc"
    else
        echo "$HOME/.profile"
    fi
}

SHELL_CONFIG=$(detect_shell_config)
ALIAS_LINE="alias origin='node $ENTRY_POINT'"

# Add alias if not already present
info "Setting up 'origin' alias..."
if grep -q "alias origin=" "$SHELL_CONFIG" 2>/dev/null; then
    warn "Alias 'origin' already exists in $SHELL_CONFIG"
else
    echo "" >> "$SHELL_CONFIG"
    echo "# Origin CLI alias" >> "$SHELL_CONFIG"
    echo "$ALIAS_LINE" >> "$SHELL_CONFIG"
    success "Added alias to $SHELL_CONFIG"
fi

# Source the alias for this session
eval "$ALIAS_LINE"

# Check if already configured
CONFIG_FILE="$HOME/.openclaw/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
    info "Existing configuration found at $CONFIG_FILE"
    echo ""
    read -p "Run onboarding wizard anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        success "Quick start complete!"
        echo ""
        echo "You can now use Origin:"
        echo "  origin --help          Show all commands"
        echo "  origin onboard         Run setup wizard"
        echo "  origin gateway run     Start the gateway"
        echo "  origin channels status Check channel status"
        echo ""
        echo "Restart your terminal or run: source $SHELL_CONFIG"
        exit 0
    fi
fi

# Run onboarding
echo ""
info "Starting onboarding wizard..."
echo ""
node "$ENTRY_POINT" onboard

echo ""
success "Quick start complete!"
echo ""
echo "You can now use Origin:"
echo "  origin --help          Show all commands"
echo "  origin gateway run     Start the gateway"
echo "  origin channels status Check channel status"
echo ""
echo "Restart your terminal or run: source $SHELL_CONFIG"
