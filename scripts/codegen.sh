#!/bin/bash
# Code generation script for ticks project
# Generates TypeScript and Go types from JSON schemas

set -e

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Ticks Code Generation"
echo "=========================================="
echo ""

# Check for --check flag
CHECK_MODE=false
if [[ "$1" == "--check" ]]; then
    CHECK_MODE=true
    echo "Running in check mode (no files will be modified)"
    echo ""
fi

# Generate TypeScript types
echo "Generating TypeScript types..."
echo "----------------------------------------"
cd internal/tickboard/ui
if $CHECK_MODE; then
    pnpm run codegen:check
else
    pnpm run codegen
fi
cd "$PROJECT_ROOT"
echo ""

# Generate Go types
echo "Generating Go types..."
echo "----------------------------------------"
if $CHECK_MODE; then
    # In check mode, generate to temp file and compare
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    cd schemas
    $(go env GOPATH)/bin/go-jsonschema \
        --package generated \
        --only-models \
        --output "$TEMP_DIR/types.go" \
        --resolve-extension json \
        tick.schema.json \
        activity.schema.json \
        api/requests.schema.json \
        api/responses.schema.json \
        websocket/messages.schema.json
    cd "$PROJECT_ROOT"

    gofmt -w "$TEMP_DIR/types.go"

    if ! diff -q "$TEMP_DIR/types.go" internal/types/generated/types.go > /dev/null 2>&1; then
        echo "ERROR: Go types are out of date!"
        echo "Run './scripts/codegen.sh' to update."
        exit 1
    fi
    echo "Go types are up to date."
else
    make codegen-go
fi
echo ""

echo "=========================================="
echo "Code generation complete!"
echo "=========================================="
