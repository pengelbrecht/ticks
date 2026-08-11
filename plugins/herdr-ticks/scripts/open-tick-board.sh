#!/usr/bin/env bash
# "Open tick board" action for the herdr-ticks plugin.
#
# Finds the ticks board (the local web UI served by `tk board`) for the repository the
# invoking workspace/pane is sitting in, prints its URL, and opens it in the browser.
# If no board is listening it prints the exact command to start one.
#
# herdr runs this with cwd = the plugin root, so the target repo comes from the
# invocation context, never from the process cwd:
#   HERDR_PLUGIN_CONTEXT_JSON  worktree.repo_root / focused_pane_cwd / workspace_cwd
# See README.md for the full env contract.
#
# Read-only: this never mutates .tick state.
set -uo pipefail

ctx="${HERDR_PLUGIN_CONTEXT_JSON:-}"

# Pull a top-level-ish string field out of the context JSON without requiring jq.
ctx_field() {
  local key="$1"
  [ -n "$ctx" ] || return 0
  printf '%s' "$ctx" |
    sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$PWD"

echo "Ticks board — repo: $repo"

if [ ! -d "$repo/.tick" ]; then
  echo "No .tick directory in $repo — this repository is not tracked by ticks."
  echo "Run 'tk init' there first."
  exit 0
fi

# `tk board` binds 3000 by default and walks upward to the first free port.
board_url=""
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  if curl -fsS --max-time 1 "http://127.0.0.1:${port}/api/info" >/dev/null 2>&1; then
    board_url="http://127.0.0.1:${port}"
    break
  fi
done

if [ -z "$board_url" ]; then
  echo "No ticks board is listening on 127.0.0.1:3000-3009."
  echo "Start one with:  tk board \"$repo\""
  echo "It will then be reachable at http://127.0.0.1:3000"
  exit 0
fi

echo "Board is live at $board_url"

opener=""
if command -v open >/dev/null 2>&1; then
  opener="open"
elif command -v xdg-open >/dev/null 2>&1; then
  opener="xdg-open"
fi

if [ -n "$opener" ]; then
  "$opener" "$board_url" >/dev/null 2>&1 && echo "Opened in your browser."
else
  echo "No 'open'/'xdg-open' available — visit the URL above."
fi
