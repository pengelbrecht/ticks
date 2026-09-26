#!/bin/bash
# Build the board UI for embedding in the tk binary
#
# Output:
#   - internal/tickboard/server/static/    → go:embed in tk binary (vite outputs here)

set -e

# Get repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

UI_DIR="$REPO_ROOT/internal/tickboard/ui"
STATIC_DIR="$REPO_ROOT/internal/tickboard/server/static"

cd "$UI_DIR"

# Install deps if needed
if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Get version from git if available
VERSION="${VERSION:-$(git describe --tags 2>/dev/null || echo 'dev')}"
export VERSION

echo "Building UI version $VERSION..."

# Build (vite.config.ts outputs to ../server/static/)
pnpm run build

echo ""
echo "UI built successfully: $STATIC_DIR/ (go:embed in tk binary)"
