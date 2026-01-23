#!/bin/bash
# Build UI for both local embedding and CF Pages deployment
#
# Outputs:
#   - internal/tickboard/server/static/    → For go:embed in tk binary (vite outputs here)
#   - internal/tickboard/ui/dist/          → For CF Pages deployment (copied)

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

# Copy to dist/ for CF Pages deployment
echo "Copying to $UI_DIR/dist/ for CF Pages..."
rm -rf "$UI_DIR/dist"
cp -r "$STATIC_DIR" "$UI_DIR/dist"

echo ""
echo "UI built successfully:"
echo "  - $STATIC_DIR/    → go:embed in tk binary"
echo "  - $UI_DIR/dist/   → CF Pages deployment"
