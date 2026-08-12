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

# Resolve tk exactly as every other script in this plugin does — one shared
# implementation, see lib/tk-resolve.sh. The pin file matters most HERE: an
# event hook is the one entry point nobody can hand an env var to, and a hook
# that cannot find tk is a blocked worker nobody gets told about.
. "$(dirname "${BASH_SOURCE[0]}")/lib/tk-resolve.sh"

tk="$(ticks_resolve_tk || true)"
if [ -z "$tk" ]; then
  echo "notify-hook($event): no usable 'tk' — skipping. Pin one with:"
  echo "  echo /abs/path/to/tk > \"\$(herdr plugin config-dir ${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks})/tk-bin-path\""
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

# THE LAST EDGE IS THE ONE THAT CAN BE LOST — re-check once when a wave is
# still incomplete.
#
# This notifier is edge-triggered: it decides when an event says a status
# changed. That is exactly right for `blocked`, and it has one hole at the END
# of a wave. When the final workers settle within moments of each other, the
# hook invocations racing behind them can each read `agent.list` before the last
# transition is visible, so every one of them concludes "still running" — and
# then there is no further status change, so no further event, so no further
# invocation. The wave completes in silence.
#
# Measured live on 2026-08-11 (herdr 0.8.0, scripts/verify-herd-plugin.sh): two
# workers settled at state_change_seq 545 and 546, both hooks fired, and the
# last decision recorded was "1 of 2 workers still running". No wave-complete
# chime was ever sent.
#
# The fix is a settle re-check, not a debounce: sleep briefly and ask again.
# It is safe to be wrong about needing it — `tk herd notify` is idempotent by
# construction (once-semantics in .notify-state.json under a lock), so a
# re-check with nothing new to say sends nothing and logs why. It runs ONLY
# when a wave was judged incomplete, so a settled run costs nothing, and it
# happens at most once per invocation, so it cannot recurse.
case "$output" in
  *"workers still running"*)
    settle="${TICKS_NOTIFY_SETTLE_SECONDS:-4}"
    if [ "$settle" -gt 0 ] 2>/dev/null; then
      sleep "$settle"
      recheck="$("$tk" herd notify 2>&1)"
      echo "notify-hook($event): settle re-check after ${settle}s exited $?"
      echo "$recheck"
    fi
    ;;
esac

# Deliberately zero: a notifier that could not notify is not a reason to mark
# the hook failed. The exit status above is the record.
exit 0
