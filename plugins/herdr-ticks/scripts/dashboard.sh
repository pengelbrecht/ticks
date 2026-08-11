#!/usr/bin/env bash
# [[panes]] dashboard — launch `tk herd dashboard` for the invoking repository.
#
# herdr runs this with cwd = the plugin root and passes the invocation context in
# the environment, so BOTH things this needs have to be resolved, never assumed:
#
#   the repo   TICKS_REPO (an explicit pin, e.g. `pane open --env TICKS_REPO=…`)
#              → HERDR_PLUGIN_CONTEXT_JSON's worktree.repo_root → focused_pane_cwd
#              → workspace_cwd → $PWD.  The cwd is the plugin, not the user's repo.
#   the binary TK_BIN → a locally built ./tk two levels up (this plugin lives in a
#              subdirectory of the ticks repo, so a dev checkout's own build wins)
#              → $PATH → the usual install locations.  A herdr pane's shell is not
#              guaranteed to be a login shell, so $PATH alone is not enough.
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

plugin_root="${HERDR_PLUGIN_ROOT:-$PWD}"

tk=""
for candidate in \
  "${TK_BIN:-}" \
  "$plugin_root/../../tk" \
  "$(command -v tk 2>/dev/null || true)" \
  "$HOME/.local/bin/tk" \
  "$HOME/go/bin/tk"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    tk="$candidate"
    break
  fi
done

if [ -z "$tk" ]; then
  echo "Ticks mission control"
  echo
  echo "Could not find the 'tk' binary."
  echo "Install ticks (https://ticks.sh), or set TK_BIN to its absolute path."
  hold
fi

cd "$repo" || { echo "Cannot enter $repo"; hold; }

# exec so the TUI owns the pane's terminal directly and Ctrl-C reaches it.
exec "$tk" herd dashboard "$@"
