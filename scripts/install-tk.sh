#!/bin/sh
# Install tk machine-wide — deliberately, never as a side effect of iterating.
#
# The binary at $INSTALL_DIR/tk is shared by every shell and every agent on
# this machine, and it may be carrying a hand-applied local patch. Building
# over it from a clean tree silently reverts that patch and can break other
# agents mid-task, so this script fails closed unless the caller asks for a
# machine-wide install explicitly.
#
# Dev builds do not come through here: `make build` writes ./bin/tk.
#
# Usage:
#   TK_ALLOW_MACHINE_INSTALL=1 make install
#   TK_ALLOW_MACHINE_INSTALL=1 INSTALL_DIR=/usr/local/bin scripts/install-tk.sh
#
# Environment:
#   TK_ALLOW_MACHINE_INSTALL   must be 1; the explicit opt-in
#   INSTALL_DIR                install target dir (default: $HOME/.local/bin)
#   GO                         go toolchain to build with (default: go)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
GO="${GO:-go}"
TARGET="$INSTALL_DIR/tk"

if [ "$TK_ALLOW_MACHINE_INSTALL" != "1" ]; then
    cat >&2 <<MSG
refusing to install tk machine-wide.

$TARGET is shared by every shell and agent on this machine, and may be
carrying a local patch that a fresh build would silently revert.

For development, build the local binary instead:

    make build       # writes ./bin/tk (gitignored)
    ./bin/tk --help

If you really do want to replace the machine-wide binary, ask for it:

    TK_ALLOW_MACHINE_INSTALL=1 make install
MSG
    exit 1
fi

mkdir -p "$INSTALL_DIR"
# Resolve to an absolute path: the build runs from the repo root, so a
# relative INSTALL_DIR would otherwise land in the wrong place.
INSTALL_DIR="$(cd "$INSTALL_DIR" && pwd)"
TARGET="$INSTALL_DIR/tk"

echo "Installing tk to $TARGET ..."
cd "$REPO_ROOT"
"$GO" build -o "$TARGET" ./cmd/tk
echo "Installed $TARGET"
