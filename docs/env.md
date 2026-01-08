# Environment Variables and JSON Output

## Environment Variables

- `TICK_OWNER`: override owner detection
- `TICK_DIR`: override the `.tick` directory location
- `NO_COLOR`: disable colored output

## JSON Output

All commands accept `--json` for machine-readable output.

Examples:

```bash
# Get next ready tick
 tk ready --json | jq '.[0]'

# Create and capture ID
 ID=$(tk create "New task" --json | jq -r '.id')

# Structured stats
 tk stats --all --json
```
