# Ticks Makefile
# Code generation and development tasks

BIN_DIR := bin
DEV_BINARY := $(BIN_DIR)/tk

SCHEMAS_DIR := schemas
GO_GENERATED_DIR := internal/types/generated
GO_JSONSCHEMA := $(shell go env GOPATH)/bin/go-jsonschema

.PHONY: help build install codegen codegen-ts codegen-go clean-generated

help:
	@echo "Available targets:"
	@echo "  build        - Build the dev binary to ./bin/tk (gitignored)"
	@echo "  install      - Install tk machine-wide (needs TK_ALLOW_MACHINE_INSTALL=1)"
	@echo "  codegen      - Generate all code from JSON schemas"
	@echo "  codegen-ts   - Generate TypeScript types"
	@echo "  codegen-go   - Generate Go types"
	@echo "  clean-generated - Remove all generated files"

# Development build.
#
# Always ./bin/tk, never the machine-wide binary: ~/.local/bin/tk is shared by
# every shell and agent on this machine and may carry a local patch that a
# fresh build would silently revert. Run what you built with ./bin/tk.
build:
	@mkdir -p $(BIN_DIR)
	go build -o $(DEV_BINARY) ./cmd/tk
	@echo "Built $(DEV_BINARY) - run it as ./bin/tk"

# Machine-wide install. Deliberate by design: the script refuses unless
# TK_ALLOW_MACHINE_INSTALL=1 is set. Use `make build` while developing.
install:
	@scripts/install-tk.sh

# Full codegen
codegen: codegen-ts codegen-go
	@echo "Code generation complete!"

# TypeScript code generation
codegen-ts:
	@echo "Generating TypeScript types..."
	cd internal/tickboard/ui && pnpm run codegen

# Go code generation
# Note: All schemas are generated into a single file to avoid duplicate type definitions
codegen-go: $(GO_JSONSCHEMA)
	@echo "Generating Go types from JSON schemas..."
	@mkdir -p $(GO_GENERATED_DIR)

	@# Generate all types into a single file (run from schemas dir for ref resolution)
	@# Using --only-models to avoid duplicate UnmarshalJSON methods
	cd $(SCHEMAS_DIR) && $(GO_JSONSCHEMA) \
		--package generated \
		--only-models \
		--output ../$(GO_GENERATED_DIR)/types.go \
		--resolve-extension json \
		tick.schema.json \
		activity.schema.json \
		api/requests.schema.json \
		api/responses.schema.json \
		websocket/messages.schema.json

	@# Format generated Go files
	go fmt $(GO_GENERATED_DIR)/...

	@echo "Go types generated in $(GO_GENERATED_DIR)/types.go"

# Install go-jsonschema if not present
$(GO_JSONSCHEMA):
	@echo "Installing go-jsonschema..."
	go install github.com/atombender/go-jsonschema@latest

# Clean generated files
clean-generated:
	@echo "Removing generated files..."
	rm -rf $(GO_GENERATED_DIR)
	rm -rf internal/tickboard/ui/src/types/generated
