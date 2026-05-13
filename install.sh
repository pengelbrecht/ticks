#!/bin/sh
set -e

# Ticks installer
# Usage: curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh | sh

REPO="pengelbrecht/ticks"
BINARY="tk"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
    linux*) OS="linux" ;;
    darwin*) OS="darwin" ;;
    *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Get latest version (resolve the /releases/latest redirect to avoid GitHub API rate limits in shared-IP envs)
LATEST_URL=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest")
VERSION=${LATEST_URL##*/v}
if [ -z "$VERSION" ] || [ "$VERSION" = "$LATEST_URL" ]; then
    echo "Failed to get latest version"
    exit 1
fi

echo "Installing tk v$VERSION for $OS/$ARCH..."

# Download URL
URL="https://github.com/$REPO/releases/download/v$VERSION/${BINARY}_${VERSION}_${OS}_${ARCH}.tar.gz"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download and extract
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

curl -fsSL "$URL" | tar -xz -C "$TMPDIR"
mv "$TMPDIR/$BINARY" "$INSTALL_DIR/$BINARY"
chmod +x "$INSTALL_DIR/$BINARY"

echo "Installed tk to $INSTALL_DIR/$BINARY"

# Check if in PATH
case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
        echo ""
        echo "Add to your PATH:"
        echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
        ;;
esac

echo ""
echo "Run 'tk version' to verify installation"
