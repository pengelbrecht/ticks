#!/usr/bin/env bash
# Event hook for the herdr-ticks plugin: repaint the run's workspace badges.
#
# herdr fires this on the pane/tab/workspace events that can change what a
# badge should say. It runs `tk herd paint`, which reports display-only,
# TTL'd metadata for every workspace this repo's herd run owns — a tick id,
# a role, a tracker status. Nothing here mutates .tick, renames a pane or
# moves focus; the worst a bad run can do is leave a badge unpainted until
# the next event.
#
# The manifest's `command` is an argv array with no shell, so all of the
# conditional logic lives here:
#
#   * resolve the repo from the invocation context, never from cwd — herdr
#     runs plugin commands with cwd = the plugin root (see README.md)
#   * do nothing at all in a repo with no ticks and no herd run in flight,
#     which is most of them
#   * debounce, which is LOAD-BEARING, not a nicety. Two reasons: events
#     arrive in bursts, and — measured live against herdr 0.8.0 — a
#     pane.report_metadata carrying a title or state labels makes herdr emit
#     `pane.agent_status_changed` for that pane, which is one of the events
#     hooked here. So a paint re-triggers this hook. The bounce arrives
#     within milliseconds, well inside the window, so the second invocation
#     is debounced and the loop stops after exactly one extra paint. Setting
#     TICKS_PAINT_DEBOUNCE_SECONDS to 0 would turn that into a live loop.
#   * never fail loudly: a hook that exits non-zero on an ordinary condition
#     fills `herdr plugin log list` with noise nobody can act on.
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

# The CONTROLLER checkout is what holds the manifests and .tick/, so
# repo_root comes first: for a worker's linked worktree herdr reports the
# main repository there, which is exactly where the run state lives.
repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$PWD"

event="${HERDR_PLUGIN_EVENT:-${HERDR_PLUGIN_EVENT_NAME:-event}}"

# Nothing to paint without a tracker, and nothing to paint without a run.
# Both checks are cheap file tests, which matters: this runs on every event.
if [ ! -d "$repo/.tick" ]; then
  echo "paint-hook($event): $repo is not a ticks repo — nothing to paint"
  exit 0
fi
if [ ! -d "$repo/.tick/logs/herd" ]; then
  echo "paint-hook($event): no herd run in $repo — nothing to paint"
  exit 0
fi

# Resolve tk, in the same spirit as herdr's own HERDR_BIN_PATH:
#
#   1. $TK_BIN_PATH                            explicit override
#   2. $HERDR_PLUGIN_CONFIG_DIR/tk-bin-path    a file holding one path
#   3. PATH
#
# Step 2 is not decoration. herdr's server does not inherit the interactive
# shell's PATH, so a `tk` installed in ~/.local/bin (or any fnm/asdf shim)
# can be perfectly present and still invisible here — and an event hook has
# no way to be handed an env var. The config file is the supported answer:
#   echo /abs/path/to/tk > "$(herdr plugin config-dir pengelbrecht.herdr-ticks)/tk-bin-path"
tk="${TK_BIN_PATH:-}"
if [ -z "$tk" ] && [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ] && [ -r "$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path" ]; then
  tk="$(head -n 1 "$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path" 2>/dev/null | tr -d '[:space:]')"
fi
if [ -z "$tk" ]; then
  tk="$(command -v tk 2>/dev/null || true)"
fi
if [ -z "$tk" ] || [ ! -x "$tk" ]; then
  echo "paint-hook($event): no usable 'tk' (set TK_BIN_PATH or write one into"
  echo "  \$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path) — skipping"
  exit 0
fi

# Debounce. Events arrive in bursts and each burst wants exactly one paint.
# The stamp lives in the plugin's own state dir, keyed by repo so two repos
# never debounce each other.
state_dir="${HERDR_PLUGIN_STATE_DIR:-${TMPDIR:-/tmp}}"
mkdir -p "$state_dir" 2>/dev/null
key="$(printf '%s' "$repo" | tr -c 'A-Za-z0-9' '-')"
stamp="$state_dir/paint-$key.stamp"
debounce="${TICKS_PAINT_DEBOUNCE_SECONDS:-2}"

now="$(date +%s)"
if [ -f "$stamp" ]; then
  last="$(cat "$stamp" 2>/dev/null || echo 0)"
  case "$last" in
    ''|*[!0-9]*) last=0 ;;
  esac
  if [ "$((now - last))" -lt "$debounce" ]; then
    echo "paint-hook($event): repainted less than ${debounce}s ago — skipping"
    exit 0
  fi
fi
printf '%s' "$now" > "$stamp" 2>/dev/null

# Paint every manifest of the run. No --epic: an event says nothing about
# which epic it belongs to, and the whole run is the only answer that stays
# correct across waves. `tk herd paint` reads .tick read-only and never
# shells out to another tk.
cd "$repo" || {
  echo "paint-hook($event): cannot enter $repo — skipping"
  exit 0
}

output="$("$tk" herd paint 2>&1)"
status=$?
echo "paint-hook($event): tk herd paint exited $status"
echo "$output"
# Deliberately zero: a painter that cannot paint is not a reason to mark the
# hook failed. The exit status above is the record.
exit 0
