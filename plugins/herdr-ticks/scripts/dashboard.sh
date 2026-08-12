#!/usr/bin/env bash
# [[panes]] dashboard — launch `tk herd dashboard` for the invoking repository.
#
# herdr runs this with cwd = the plugin root and passes the invocation context in
# the environment, so BOTH things this needs have to be resolved, never assumed:
#
#   the repo   TICKS_REPO (an explicit pin, e.g. `pane open --env TICKS_REPO=…`)
#              → HERDR_PLUGIN_CONTEXT_JSON's worktree.repo_root → focused_pane_cwd
#              → workspace_cwd → $PWD.  The cwd is the plugin, not the user's repo.
#   the binary scripts/lib/tk-resolve.sh — the one resolution every script in this
#              plugin uses. Read it for the candidate order and for why the
#              config-dir pin exists at all (herdr's server does not inherit your
#              interactive shell's $PATH).
#
# See README.md for the full env contract. Read-only: it never mutates .tick.
set -uo pipefail

ctx="${HERDR_PLUGIN_CONTEXT_JSON:-}"

# Pull a string field out of the context JSON without requiring jq.
ctx_field() {
  local key="$1"
  [ -n "$ctx" ] || return 0
  printf '%s' "$ctx" |
    sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

# hold keeps the pane on screen after a failure so the operator can read why,
# instead of the split vanishing the instant it is opened.
hold() {
  echo
  echo "Press Ctrl-C to close this pane."
  while true; do
    read -r _ || sleep 3600
  done
}

repo="${TICKS_REPO:-}"
[ -n "$repo" ] || repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$PWD"

if [ ! -d "$repo/.tick" ]; then
  echo "Ticks mission control"
  echo
  echo "No .tick directory in: $repo"
  echo "This repository is not tracked by ticks — run 'tk init' there first."
  hold
fi

# One tk-resolution for the whole plugin, sourced from the script's own
# directory (cwd is the plugin root, but never rely on that).
. "$(dirname "${BASH_SOURCE[0]}")/lib/tk-resolve.sh"

tk="$(ticks_resolve_tk || true)"
if [ -z "$tk" ]; then
  echo "Ticks mission control"
  echo
  echo "Could not find the 'tk' binary."
  ticks_tk_pin_hint
  hold
fi

cd "$repo" || { echo "Cannot enter $repo"; hold; }

# TICKS_EPIC (set by e.g. the link-handler action) scopes the board to one epic.
if [ -n "${TICKS_EPIC:-}" ]; then
  set -- --epic "$TICKS_EPIC" "$@"
fi

# exec so the TUI owns the pane's terminal directly and Ctrl-C reaches it.
exec "$tk" herd dashboard "$@"
