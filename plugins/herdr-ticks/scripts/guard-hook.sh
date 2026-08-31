#!/usr/bin/env bash
# Event hook for the herdr-ticks plugin: supervise the run's ORCHESTRATOR.
#
# herdr fires this on pane.agent_status_changed. It runs `tk herd guard`,
# which judges the orchestrator registered with `tk herd watch` (a no-op in
# repos that never registered one):
#
#   idle + actionable frontier   nudge the orchestrator to continue — at most
#                                nudge-max times per stall episode, never
#                                closer together than nudge-interval
#   idle + frontier at rest      nothing: an idle orchestrator is legitimate
#   blocked                      chime once (sound 'request') — the run itself
#                                wants a human; the guard NEVER answers an
#                                approval UI
#   working                      re-arm the episode memory
#
# Like notify-hook.sh there is NO debounce here, and for the same reason: an
# elided invocation could be the only one that saw the stall transition. The
# guard is edge-triggered against persisted state instead
# (.tick/logs/herd/.watch-orchestrator.json, read-decide-write under a lock),
# so repeat invocations with nothing new to say send nothing and say so. The
# paint feedback bounce lands here too and is harmless for the same reason.
#
# The manifest's `command` is an argv array with no shell, so the conditional
# logic lives here, and nothing ever fails loudly: a hook that exits non-zero
# on an ordinary condition fills `herdr plugin log list` with noise.
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

# The CONTROLLER checkout holds the watch state and .tick/, so repo_root comes
# first (for a worker's linked worktree herdr reports the main repository
# there, which is exactly where the run state lives).
repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$PWD"

event="${HERDR_PLUGIN_EVENT:-${HERDR_PLUGIN_EVENT_NAME:-event}}"

# Cheap file tests before anything heavier: this runs on every status change,
# and a repo with no registered orchestrator watch has nothing to guard.
if [ ! -f "$repo/.tick/logs/herd/.watch-orchestrator.json" ]; then
  echo "guard-hook($event): no orchestrator watch in $repo — nothing to guard"
  exit 0
fi

# Resolve tk exactly as every other script in this plugin does — one shared
# implementation, see lib/tk-resolve.sh. The pin file matters most for event
# hooks: nobody can hand a hook an env var, and a hook that cannot find tk is
# a stalled orchestrator nobody gets told about.
. "$(dirname "${BASH_SOURCE[0]}")/lib/tk-resolve.sh"

tk="$(ticks_resolve_tk || true)"
if [ -z "$tk" ]; then
  echo "guard-hook($event): no usable 'tk' — skipping. Pin one with:"
  echo "  echo /abs/path/to/tk > \"\$(herdr plugin config-dir ${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks})/tk-bin-path\""
  exit 0
fi

cd "$repo" || {
  echo "guard-hook($event): cannot enter $repo — skipping"
  exit 0
}

output="$("$tk" herd guard 2>&1)"
echo "guard-hook($event): tk herd guard exited $?"
echo "$output"

# Deliberately zero: a guard that could not judge is not a reason to mark the
# hook failed. The exit status above is the record.
exit 0
