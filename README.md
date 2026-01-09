# tick

A multiplayer-first issue tracker for AI coding agents. Tick stores each issue
as a single JSON file, making git merges clean and predictable.

## Install

Build and use locally:

```bash
go build -o tk ./cmd/tk
./tk init
```

Or install to your `$GOPATH/bin` (make sure it's in your `$PATH`):

```bash
go install ./cmd/tk
tk init
```

## Quick Start

```bash
tk init

tk create "Fix auth timeout" -t bug -p 1 -d "Users logged out after 5 minutes"
tk ready

tk note <id> "Investigating token expiry"
tk update <id> --status in_progress

tk close <id> --reason "Fixed in commit abc123"
```

## TUI

```bash
tk view
```

- Fold/unfold epics with `space` or `enter`.
- Search with `/`.
- Focus an epic with `z` (press `z` again or `esc` to clear).
- Details pane shows the selected tick.

## Environment Variables

- `TICK_OWNER`: override owner detection
- `TICK_DIR`: override `.tick` directory location
- `NO_COLOR`: disable colored output

## JSON Output

All commands accept `--json` for machine-readable output.

```bash
# Get next ready tick
 tk ready --json | jq '.[0]'

# Create and capture ID
 ID=$(tk create "New task" --json | jq -r '.id')

# Structured stats
 tk stats --all --json
```

## Reference

See `SPEC.md` for the full specification and architecture notes.
