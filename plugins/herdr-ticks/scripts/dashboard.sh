#!/usr/bin/env bash
# [[panes]] dashboard — launch `tk herd dashboard` for the invoking repository.
#
# herdr runs this with cwd = the plugin root and passes the invocation context in
# the environment, so BOTH things this needs have to be resolved, never assumed:
#
#   the repo   TICKS_REPO (an explicit pin, e.g. `pane open --env TICKS_REPO=…`)
#              → HERDR_PLUGIN_CONTEXT_JSON's worktree.repo_root → focused_pane_cwd
#              → workspace_cwd → $PWD.  The cwd is the plugin, not the user's repo.
#   the binary TK_BIN / TK_BIN_PATH → $HERDR_PLUGIN_CONFIG_DIR/tk-bin-path → a
#              locally built ./tk two levels up (this plugin lives in a subdirectory
#              of the ticks repo, so a dev checkout's own build wins) → $PATH → the
#              usual install locations.
#
#              $PATH alone is NOT enough, and not merely because a pane's shell may
#              not be a login shell: herdr's SERVER does not inherit your interactive
#              shell's $PATH at all, so a tk installed in ~/.local/bin can be
#              invisible here (measured by tick o83 while wiring paint-hook.sh).
#              `tk-bin-path` in the plugin config dir is the shared escape hatch both
#              scripts in this plugin honour — one file, one convention.
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

# The user's pinned path, if they wrote one. First line only, whitespace trimmed,
# and `~` expanded — a config file is hand-edited, so it is treated as such.
pinned_tk() {
  local file="${HERDR_PLUGIN_CONFIG_DIR:-}/tk-bin-path"
  [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ] && [ -f "$file" ] || return 0
  local line
  line="$(head -n 1 "$file" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  case "$line" in
    "~/"*) printf '%s' "$HOME/${line#\~/}" ;;
    *) printf '%s' "$line" ;;
  esac
}

tk=""
for candidate in \
  "${TK_BIN:-}" \
  "${TK_BIN_PATH:-}" \
  "$(pinned_tk)" \
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
  echo "herdr's server does not inherit your shell's PATH, so an installed tk can be"
  echo "invisible here. Pin it explicitly:"
  echo
  echo "  echo /absolute/path/to/tk > \"\$(herdr plugin config-dir ${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks})/tk-bin-path\""
  echo
  echo "Or install ticks: https://ticks.sh"
  hold
fi

cd "$repo" || { echo "Cannot enter $repo"; hold; }

# exec so the TUI owns the pane's terminal directly and Ctrl-C reaches it.
exec "$tk" herd dashboard "$@"
