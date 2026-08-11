#!/usr/bin/env bash
# Event hook for the herdr-ticks plugin: chime when a herd worker blocks or a
# wave finishes.
#
# herdr fires this on pane.agent_status_changed. It runs `tk herd notify`,
# which joins this repo's run-state manifests to the live agent list and
# raises at most two notifications:
#
#   blocked        sound 'request' — a worker is waiting on the operator
#   wave complete  sound 'done'    — nothing in the wave is running any more
#
# Nothing here mutates .tick beyond the notifier's own state file, renames a
# pane, moves focus or prompts an agent.
#
# WHY THERE IS NO DEBOUNCE HERE, unlike paint-hook.sh
#
# paint's debounce is a time window: events arrive in bursts, each burst wants
# one paint, and an elided paint is harmless because the next event repaints.
# Notifications are the opposite. An elided invocation can be the ONLY one that
# would have seen a blocked transition, and a blocked worker nobody was told
# about is the exact failure this hook exists to prevent. So `tk herd notify`
# is edge-triggered against persisted per-epic state instead
# (.tick/logs/herd/<epic>/.notify-state.json), and it takes a lock so two
# concurrent hook invocations cannot both decide to chime. Running it more
# often than necessary is free; running it less often is not.
#
# That state is also what makes the PAINT FEEDBACK BOUNCE harmless here: a
# pane.report_metadata from the paint hook makes herdr emit another
# pane.agent_status_changed, which fires this hook again — with the same
# statuses, so the notifier finds nothing new and says nothing. Verified live;
# see repo-wiki/herd-helper-cli.md.
#
# The manifest's `command` is an argv array with no shell, so all of the
# conditional logic lives here, and nothing ever fails loudly: a hook that
# exits non-zero on an ordinary condition fills `herdr plugin log list` with
# noise nobody can act on.
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

# The CONTROLLER checkout holds the manifests and .tick/, so repo_root comes
# first: for a worker's linked worktree herdr reports the main repository
# there, which is exactly where the run state lives.
repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$PWD"

event="${HERDR_PLUGIN_EVENT:-${HERDR_PLUGIN_EVENT_NAME:-event}}"

# Nothing to say without a tracker, and nothing to say without a run. Both are
# cheap file tests, which matters: this runs on every status change.
if [ ! -d "$repo/.tick" ]; then
  echo "notify-hook($event): $repo is not a ticks repo — nothing to notify about"
  exit 0
fi
if [ ! -d "$repo/.tick/logs/herd" ]; then
  echo "notify-hook($event): no herd run in $repo — nothing to notify about"
  exit 0
fi

# Resolve tk, in the same spirit as herdr's own HERDR_BIN_PATH:
#
#   1. $TK_BIN_PATH                            explicit override
#   2. $HERDR_PLUGIN_CONFIG_DIR/tk-bin-path    a file holding one path
#   3. PATH
#
# Step 2 is not decoration. herdr's server does not inherit the interactive
# shell's PATH, so a `tk` installed in ~/.local/bin (or any fnm/asdf shim) can
# be perfectly present and still invisible here — and an event hook has no way
# to be handed an env var. The config file is the supported answer:
#   echo /abs/path/to/tk > "$(herdr plugin config-dir pengelbrecht.herdr-ticks)/tk-bin-path"
tk="${TK_BIN_PATH:-}"
if [ -z "$tk" ] && [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ] && [ -r "$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path" ]; then
  tk="$(head -n 1 "$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path" 2>/dev/null | tr -d '[:space:]')"
fi
if [ -z "$tk" ]; then
  tk="$(command -v tk 2>/dev/null || true)"
fi
if [ -z "$tk" ] || [ ! -x "$tk" ]; then
  echo "notify-hook($event): no usable 'tk' (set TK_BIN_PATH or write one into"
  echo "  \$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path) — skipping"
  exit 0
fi

# No --epic: an event says nothing about which epic it belongs to, and every
# epic under .tick/logs/herd is judged separately, each with its own wave.
cd "$repo" || {
  echo "notify-hook($event): cannot enter $repo — skipping"
  exit 0
}

output="$("$tk" herd notify 2>&1)"
status=$?
echo "notify-hook($event): tk herd notify exited $status"
echo "$output"
# Deliberately zero: a notifier that could not notify is not a reason to mark
# the hook failed. The exit status above is the record.
exit 0
