#!/usr/bin/env bash
# verify-herd-plugin.sh — live end-to-end smoke test of the herdr-ticks MISSION
# CONTROL PLUGIN against a real herdr server, in a throwaway scratch repo.
#
# WHY THIS IS A SIBLING SCRIPT AND NOT `verify-herd-helper.sh --plugin`
#
# verify-herd-helper.sh proves the `tk herd` CLI. It is a Closeout Evidence
# Command, it touches nothing outside the workspaces it creates, and a run of it
# is safe on any machine at any time. This script is a different animal: to test
# the plugin it must RELINK A MACHINE-GLOBAL herdr resource (the local plugin
# link, which is per-user, not per-repo) and write the shared `tk-bin-path` pin.
# Both are restored on every exit path, but a script that mutates global state
# has to be opted into deliberately — folding it into the helper smoke as a flag
# would mean one wrong flag on a routine verification run leaves the operator's
# plugin pointing at a deleted agent worktree. Separate script, separate blast
# radius, separate decision.
#
# What it proves, in order:
#   0. offline    the shared tk-resolution (scripts/lib/tk-resolve.sh) degrades
#                 correctly — stale pin falls THROUGH, `~` expands, CRLF and a
#                 stray second line are tolerated — and every herdr command in
#                 the plugin that can default to the focused workspace carries an
#                 explicit target. Zero herdr calls in this section.
#   1. link       the worktree's plugin is linked and reports the [[events]]
#                 UNION: five paint hooks + one notify hook.
#   2. wave       two live claude workers. One runs full-auto and finishes; the
#                 other is spawned with `full_auto = false` so it hits a real
#                 approval prompt and herdr reports it BLOCKED. The plugin log is
#                 the only verification channel there is.
#   3. paint      the paint hooks fired for the run's panes and `tk herd paint`
#                 exited 0 — and the FEEDBACK BOUNCE is visible, which is herdr
#                 acknowledging the metadata it was sent.
#   4. dashboard  the board pane opens PINNED to a run-created workspace (never
#                 the focused one) and renders this run.
#   5. notify     exactly one blocked chime and exactly one wave-complete chime,
#                 no duplicates, across the whole run.
#   6. action     `collect-tick` invoked on a real worker, its verdict raised as
#                 a notification.
#   7. teardown   cleanup refuses the blocked worker (it must), the worker is
#                 released, everything the run created is gone, focus is back
#                 where it started, and the plugin link is restored.
#
# Herdr etiquette this script obeys and asserts: explicit targets ALWAYS, never
# touch a pane/workspace/agent it did not create, --no-focus flows only, never
# `herdr server stop`, always bounded timeouts.
#
# Usage:
#   bash scripts/verify-herd-plugin.sh [options]
#
#   --dir DIR         parent directory for the scratch repo (default: $TMPDIR)
#   --tk PATH         tk binary to test (default: build ./cmd/tk into the scratch dir)
#   --model M         model for the implement role (default: haiku)
#   --effort E        effort for the implement role (default: low)
#   --keep            keep the scratch directory on success
#   --offline-only    run section 0 only; makes ZERO herdr calls
#   --timeout MS      per-worker deadline (default: 600000)
#
# Requires: bash 3.2+, git, jq, go, herdr (running server), and a herdr session.

set -euo pipefail

# ---------------------------------------------------------------- options ----

SCRATCH_PARENT="${TMPDIR:-/tmp}"
TK=""
MODEL="haiku"
EFFORT="low"
KEEP=0
OFFLINE_ONLY=0
WORKER_TIMEOUT_MS=600000

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) SCRATCH_PARENT="$2"; shift 2 ;;
    --tk) TK="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --effort) EFFORT="$2"; shift 2 ;;
    --timeout) WORKER_TIMEOUT_MS="$2"; shift 2 ;;
    --keep) KEEP=1; shift ;;
    --offline-only) OFFLINE_ONLY=1; shift ;;
    -h|--help) sed -n '2,62p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_DIR="$SRC_ROOT/plugins/herdr-ticks"
PLUGIN_ID="pengelbrecht.herdr-ticks"

# ------------------------------------------------------------- primitives ----

START_EPOCH=$(date +%s)
FAILURES=0

ts() { date +%H:%M:%S; }
elapsed() { echo "$(( $(date +%s) - START_EPOCH ))s"; }
log()  { echo "[$(ts) +$(elapsed)] $*" >&2; }
step() { echo >&2; echo "=== [$(ts) +$(elapsed)] $* ===" >&2; }
die()  { echo "FATAL: $*" >&2; exit 1; }

# Milliseconds, without assuming GNU date (macOS `date` has no %N).
now_ms() { echo "$(( $(date +%s) * 1000 ))"; }

CHECKS=0
ok() { CHECKS=$((CHECKS + 1)); log "  ok  [$CHECKS] $*"; }
assert() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$desc"; else
    FAILURES=$((FAILURES + 1))
    echo "  FAIL  $desc  (command: $*)" >&2
    die "assertion failed: $desc"
  fi
}
assert_eq() {
  local desc="$1" want="$2" got="$3"
  if [ "$want" = "$got" ]; then ok "$desc (= $got)"; else
    FAILURES=$((FAILURES + 1))
    echo "  FAIL  $desc: want [$want] got [$got]" >&2
    die "assertion failed: $desc"
  fi
}

need() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }
need git; need jq

RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
SCRATCH="$SCRATCH_PARENT/tk-herd-plugin-smoke-$RUN_ID"
REPO="$SCRATCH/repo"
EVIDENCE="$SCRATCH/evidence"
mkdir -p "$REPO" "$EVIDENCE"

# =============================================================== section 0 ====
# Offline. Nothing below dials herdr, so this section is the one that can be run
# on a laptop with no session at all — and it is where the two carry-over
# hardening fixes are pinned.

step "0/7 offline: shared tk-resolution + explicit-target lint (zero herdr calls)"

TKRESOLVE="$PLUGIN_DIR/scripts/lib/tk-resolve.sh"
assert "the shared tk-resolution exists" test -f "$TKRESOLVE"
# shellcheck source=/dev/null
. "$TKRESOLVE"

RES="$SCRATCH/resolve"
mkdir -p "$RES/cfg" "$RES/bin with space" "$RES/notabinary"
printf '#!/bin/sh\necho fake-tk\n' > "$RES/bin with space/tk"
chmod +x "$RES/bin with space/tk"

HERDR_PLUGIN_CONFIG_DIR="$RES/cfg"; export HERDR_PLUGIN_CONFIG_DIR
# Point the dev-checkout candidate at nothing so it cannot mask a result.
HERDR_PLUGIN_ROOT="$RES/nowhere"; export HERDR_PLUGIN_ROOT

# The defect this replaced: a pin naming a path that no longer exists made the
# hooks give up entirely instead of trying the next candidate. A stale pin is
# the single most likely thing to be wrong on an upgraded machine.
printf '%s\n' "$RES/deleted/tk" > "$RES/cfg/tk-bin-path"
TK_BIN="$RES/bin with space/tk"; export TK_BIN
assert_eq "a STALE pin falls through to the next candidate" \
  "$RES/bin with space/tk" "$(ticks_resolve_tk || echo NONE)"
unset TK_BIN

printf '~/definitely-not-here/tk\n' > "$RES/cfg/tk-bin-path"
assert_eq "a leading ~/ is expanded (nothing else expands it inside a file)" \
  "$HOME/definitely-not-here/tk" "$(ticks_pinned_tk)"

printf '  %s  \r\na stray second line\n' "$RES/bin with space/tk" > "$RES/cfg/tk-bin-path"
assert_eq "CRLF, surrounding space and a stray second line are tolerated; interior spaces survive" \
  "$RES/bin with space/tk" "$(ticks_pinned_tk)"
assert_eq "  ...and that pin resolves" \
  "$RES/bin with space/tk" "$(ticks_resolve_tk || echo NONE)"

printf '%s\n' "$RES/notabinary" > "$RES/cfg/tk-bin-path"
PINNED_DIR_RESULT="$(ticks_resolve_tk || echo NONE)"
assert "a pin naming a DIRECTORY is not accepted as a binary" \
  test "$PINNED_DIR_RESULT" != "$RES/notabinary"

rm -f "$RES/cfg/tk-bin-path"
assert_eq "an absent pin file is not an error" "" "$(ticks_pinned_tk)"
unset HERDR_PLUGIN_CONFIG_DIR HERDR_PLUGIN_ROOT

# Every script must use the shared resolution, not its own copy: four private
# copies are exactly how the two hooks ended up with the weaker variant.
for s in dashboard.sh paint-hook.sh notify-hook.sh action-collect-tick.sh action-retry-tick.sh; do
  assert "$s sources lib/tk-resolve.sh" \
    grep -q 'lib/tk-resolve.sh' "$PLUGIN_DIR/scripts/$s"
done
assert "no script keeps a private pinned_tk() copy" \
  test -z "$(grep -l '^pinned_tk()' "$PLUGIN_DIR"/scripts/*.sh 2>/dev/null || true)"

# EXPLICIT TARGETS ALWAYS. `plugin pane open` and `pane split` fall back to the
# FOCUSED workspace/pane when given no target, and a plugin command runs
# asynchronously — the operator may have moved to an unrelated repo by the time
# the server runs it. Every such call site must carry a target, and every script
# that builds one must have a refusal path for "no pinnable target".
CALL_SITES=0
for s in "$PLUGIN_DIR"/scripts/*.sh; do
  while IFS= read -r line; do
    # Only real invocations: a line that runs "$herdr" directly, or builds an
    # argv with `set --`. Comments and echo'd error text are prose.
    case "$line" in
      \#*) continue ;;
      *'"$herdr"'*|*'set -- '*) ;;
      *) continue ;;
    esac
    case "$line" in
      *"pane split"*)
        CALL_SITES=$((CALL_SITES + 1))
        case "$line" in
          *--pane*) ;;
          *) die "unpinned 'pane split' in $s: $line" ;;
        esac ;;
      *"plugin pane open"*)
        CALL_SITES=$((CALL_SITES + 1))
        # Built up with `set --`; the target flags are appended further down,
        # so the check is per-file rather than per-line.
        grep -q -- '--target-pane' "$s" || die "unpinned 'plugin pane open' in $s" ;;
    esac
  done < "$s"
done
assert "the lint found the call sites it is meant to guard" test "$CALL_SITES" -ge 2
ok "every 'pane split' / 'plugin pane open' call site carries an explicit target ($CALL_SITES sites)"

for s in action-open-worktree.sh action-open-tick-dashboard.sh; do
  assert "$s refuses rather than falling back to the focused target" \
    grep -qi 'refusing' "$PLUGIN_DIR/scripts/$s"
done

if [ "$OFFLINE_ONLY" = 1 ]; then
  echo
  echo "================ herd plugin smoke (offline only): PASS ================"
  printf 'assertions passed  %s\n' "$CHECKS"
  rm -rf "$SCRATCH"
  exit 0
fi

need herdr; need go

# ------------------------------------------------------------ herdr state ----

WS_BEFORE="$EVIDENCE/workspaces-before.txt"
AGENTS_BEFORE="$EVIDENCE/agents-before.txt"

herdr_workspace_ids() { herdr workspace list | jq -r '.result.workspaces[].workspace_id' | sort; }
herdr_focused_workspace() { herdr workspace list | jq -r '.result.workspaces[] | select(.focused) | .workspace_id'; }
herdr_workspace_is_linked() {
  herdr workspace list \
    | jq -e --arg id "$1" '.result.workspaces[] | select(.workspace_id==$id) | .worktree.is_linked_worktree' >/dev/null
}
herdr_agent_names() { herdr agent list | jq -r '.result.agents[]?.name // empty' | sort; }
plugin_root_now() {
  herdr plugin list --json \
    | jq -r --arg id "$PLUGIN_ID" '.result.plugins[] | select(.plugin_id==$id) | .plugin_root' 2>/dev/null || true
}
# The plugin log is the ONLY verification channel for hooks and actions:
# `action invoke` returns "running" immediately and an event hook returns
# nothing at all.
plugin_logs_since() {
  herdr plugin log list --plugin "$PLUGIN_ID" --limit 500 \
    | jq --argjson since "$1" '[.result.logs[] | select(.started_unix_ms >= $since)]'
}

RESTORE_PLUGIN_ROOT=""
PIN_FILE=""
PIN_BACKUP=""
DASH_PANE=""
TEARDOWN_DONE=0

teardown() {
  local rc=$?
  [ "$TEARDOWN_DONE" = 1 ] && return $rc
  TEARDOWN_DONE=1
  if [ $rc -ne 0 ]; then
    echo
    echo "!!! run failed (exit $rc) — best-effort teardown; scratch kept at $SCRATCH"
    KEEP=1
  fi
  # Order matters: panes and workers first, then the machine-global state.
  [ -n "$DASH_PANE" ] && herdr plugin pane close "$DASH_PANE" >/dev/null 2>&1 || true
  if [ -n "${EPIC_ID:-}" ] && [ -n "${TK:-}" ] && [ -d "$REPO" ]; then
    (cd "$REPO" && "$TK" herd cleanup --epic "$EPIC_ID" --apply >/dev/null 2>&1) || true
  fi
  close_new_workspaces 2>/dev/null || true
  restore_pin
  restore_plugin_link
  if [ "$KEEP" = 1 ]; then echo "scratch: $SCRATCH"; else rm -rf "$SCRATCH"; fi
  return $rc
}
trap teardown EXIT

# restore_plugin_link puts the operator's link back exactly where it was. This
# is machine-global state: leaving it pointed at this run's worktree would
# silently break the plugin the moment the worktree is deleted.
restore_plugin_link() {
  [ -n "$RESTORE_PLUGIN_ROOT" ] || return 0
  local now; now="$(plugin_root_now)"
  [ "$now" = "$RESTORE_PLUGIN_ROOT" ] && return 0
  log "restoring the plugin link to $RESTORE_PLUGIN_ROOT"
  herdr plugin unlink "$PLUGIN_ID" >/dev/null 2>&1 || true
  herdr plugin link "$RESTORE_PLUGIN_ROOT" >/dev/null 2>&1 \
    || echo "!!! COULD NOT RESTORE the plugin link — run: herdr plugin link $RESTORE_PLUGIN_ROOT" >&2
}

restore_pin() {
  [ -n "$PIN_FILE" ] || return 0
  if [ -n "$PIN_BACKUP" ] && [ -f "$PIN_BACKUP" ]; then
    cp "$PIN_BACKUP" "$PIN_FILE"
    log "restored the operator's tk-bin-path pin"
  else
    rm -f "$PIN_FILE"
    log "removed the tk-bin-path pin this run wrote (there was none before)"
  fi
}

close_new_workspaces() {
  local id
  [ -f "$WS_BEFORE" ] || return 0
  # Linked worktrees first: closing the source checkout's workspace drops the
  # linked ones with it and leaves their worktrees orphaned on disk.
  for id in $(comm -13 "$WS_BEFORE" <(herdr_workspace_ids)); do
    if herdr_workspace_is_linked "$id"; then
      log "removing run-created worktree workspace $id"
      herdr worktree remove --workspace "$id" || log "  worktree remove refused $id — see above"
    fi
  done
  for id in $(comm -13 "$WS_BEFORE" <(herdr_workspace_ids)); do
    log "closing run-created workspace $id"
    herdr workspace close "$id" || log "  workspace close refused $id — see above"
  done
  restore_focus
}

# restore_focus undoes focus moves THIS RUN caused, and nothing else.
#
# The naive version — "put focus back on FOCUS_BEFORE" — is wrong on a live
# machine, and measured wrong: a herdr session is shared with a human and with
# other agents, and focus legitimately moved to an unrelated pre-existing
# workspace mid-run. Yanking it back would be exactly the discourtesy this
# script exists to police, and asserting it never moved makes the test flaky for
# a reason that has nothing to do with the plugin.
#
# So the rule is asymmetric, and matches the etiquette rule itself: if focus is
# on a workspace that existed before the run, LEAVE IT — someone chose that. If
# focus is on a workspace this run created (or on nothing, because teardown
# dropped it), put it back where the run found it.
focus_is_pre_existing() {
  local now; now="$(herdr_focused_workspace)"
  [ -n "$now" ] || return 1
  grep -qx "$now" "$WS_BEFORE"
}
restore_focus() {
  [ -n "${FOCUS_BEFORE:-}" ] || return 0
  if focus_is_pre_existing; then
    local now; now="$(herdr_focused_workspace)"
    [ "$now" = "$FOCUS_BEFORE" ] || log "focus is on $now, which pre-dates this run — leaving it alone"
    return 0
  fi
  if herdr_workspace_ids | grep -qx "$FOCUS_BEFORE"; then
    log "focus landed on something this run created — restoring it to $FOCUS_BEFORE"
    herdr workspace focus "$FOCUS_BEFORE" >/dev/null || log "  could not restore focus"
  else
    log "the workspace focused at run start ($FOCUS_BEFORE) is gone — leaving herdr's choice"
  fi
}

# =============================================================== section 1 ====
step "1/7 link: point the plugin at THIS worktree and prove the [[events]] union"

[ "${HERDR_ENV:-}" = "1" ] || log "note: HERDR_ENV is not 1 — relying on the socket probe"
herdr status server > "$EVIDENCE/herdr-status.txt"
HERDR_VERSION="$(herdr --version 2>/dev/null | head -n1)"
log "herdr: $HERDR_VERSION"

herdr_workspace_ids > "$WS_BEFORE"
herdr_agent_names   > "$AGENTS_BEFORE"
FOCUS_BEFORE="$(herdr_focused_workspace)"
log "baseline: $(wc -l < "$WS_BEFORE" | tr -d ' ') workspaces, focus on ${FOCUS_BEFORE:-<none>}"

RESTORE_PLUGIN_ROOT="$(plugin_root_now)"
[ -n "$RESTORE_PLUGIN_ROOT" ] || die "the herdr-ticks plugin is not linked; link the main checkout first"
log "plugin link before this run: $RESTORE_PLUGIN_ROOT (restored on every exit path)"
echo "$RESTORE_PLUGIN_ROOT" > "$EVIDENCE/plugin-root-before.txt"

herdr plugin unlink "$PLUGIN_ID" >/dev/null
herdr plugin link "$PLUGIN_DIR" >/dev/null
assert_eq "the plugin now runs from this worktree" "$PLUGIN_DIR" "$(plugin_root_now)"

herdr plugin list --json > "$EVIDENCE/plugin-list-linked.json"
EV="$EVIDENCE/events.json"
jq --arg id "$PLUGIN_ID" '.result.plugins[] | select(.plugin_id==$id) | .events' \
  "$EVIDENCE/plugin-list-linked.json" > "$EV"
jq -r '.[] | "\(.on)  \(.command | join(" "))"' "$EV" >&2

# Carry-over (d): the merged manifest must be the UNION of the paint and notify
# hook sets, not one of them. `events.on` is unvalidated, so this reads what
# herdr actually parsed rather than what the file says.
assert_eq "five paint hooks are registered" 5 \
  "$(jq '[.[] | select(.command | index("scripts/paint-hook.sh"))] | length' "$EV")"
assert_eq "one notify hook is registered" 1 \
  "$(jq '[.[] | select(.command | index("scripts/notify-hook.sh"))] | length' "$EV")"
for e in pane.agent_status_changed pane.agent_detected pane.created pane.closed workspace.focused; do
  assert "paint is hooked on $e" \
    jq -e --arg e "$e" '[.[] | select(.on==$e and (.command | index("scripts/paint-hook.sh")))] | length == 1' "$EV"
done
assert "notify is hooked on pane.agent_status_changed" \
  jq -e '[.[] | select(.on=="pane.agent_status_changed" and (.command | index("scripts/notify-hook.sh")))] | length == 1' "$EV"
assert_eq "both hooks share pane.agent_status_changed (two entries, one event)" 2 \
  "$(jq '[.[] | select(.on=="pane.agent_status_changed")] | length' "$EV")"

# ---- the tk binary, and the pin that is the ONLY channel an event hook has ----

if [ -z "$TK" ]; then
  TK="$SCRATCH/tk"
  log "building tk from $SRC_ROOT"
  (cd "$SRC_ROOT" && go build -o "$TK" ./cmd/tk)
fi
TK="$(cd "$(dirname "$TK")" && pwd)/$(basename "$TK")"
log "tk under test: $TK"

PIN_FILE="$(herdr plugin config-dir "$PLUGIN_ID")/tk-bin-path"
mkdir -p "$(dirname "$PIN_FILE")"
if [ -f "$PIN_FILE" ]; then
  PIN_BACKUP="$EVIDENCE/tk-bin-path.backup"
  cp "$PIN_FILE" "$PIN_BACKUP"
  log "saved the operator's existing pin ($(cat "$PIN_FILE"))"
fi
printf '%s\n' "$TK" > "$PIN_FILE"
ok "pinned tk for the hooks: $PIN_FILE -> $TK"

# THE STALE-INSTALLED-TK TRAP, asserted rather than described. Without the pin,
# resolution reaches PATH — and a released `tk` on PATH may predate `tk herd`
# entirely, in which case every hook is a silent no-op that still exits 0.
if command -v tk >/dev/null 2>&1; then
  if tk herd --help >/dev/null 2>&1; then
    log "note: the tk on PATH ($(command -v tk)) does understand 'herd'"
  else
    ok "confirmed the trap this pin exists for: the tk on PATH ($(command -v tk)) has no 'herd' command"
  fi
fi

# =============================================================== section 2 ====
step "2/7 wave: scratch repo + two live workers (one full-auto, one that must BLOCK)"

cd "$REPO"
git init -q -b main .
git config user.email "smoke@example.invalid"
git config user.name "Herd Plugin Smoke"
git remote add origin "https://github.com/tk-smoke/herd-plugin-smoke.git"
echo "# herd plugin smoke scratch repo" > README.md
git add -A && git commit -q -m "initial commit"
INTEGRATION_BRANCH="epic/toy"
git checkout -q -b "$INTEGRATION_BRANCH"
"$TK" init >/dev/null
git add -A && git commit -q -m "tk init"

EPIC_ID="$("$TK" create "Toy epic for the herd plugin smoke" --type epic --json | jq -r .id)"
mk_tick() {
  "$TK" create "Add the $1 marker" --parent "$EPIC_ID" --json \
    -d 'Create exactly one file at the root of this worktree, named '"$1"'.txt,
whose only content is the single line:
   '"$2"'

Do not create any other file, do not modify any existing file, and do not push.' \
    --acceptance "$1"'.txt contains the line '"$2" | jq -r .id
}
TICK_A="$(mk_tick alpha alpha-ok)"
TICK_B="$(mk_tick beta beta-ok)"
log "epic $EPIC_ID: A=$TICK_A (full-auto) B=$TICK_B (must block)"

write_runners() {
  # $1 = full_auto
  cat > .tick/runners.toml <<TOML
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "herdr"
detect = "env-or-socket"
max_parallel = 2
worktree_branch_prefix = "tick/"
full_auto = $1

[roles.implement]
kind = "claude"
model = "$MODEL"
effort = "$EFFORT"
TOML
}
write_runners true
git add -A && git commit -q -m "toy epic $EPIC_ID"
BASE="$(git rev-parse HEAD)"

RUN_MARK="$(( $(now_ms) - 1000 ))"
log "plugin-log watermark: $RUN_MARK"

"$TK" herd spawn "$TICK_A" --base "$BASE" --json > "$EVIDENCE/spawn-A.json"
assert "argv for the full-auto worker carries the bypass template" \
  jq -e '.manifest.argv | index("bypassPermissions")' "$EVIDENCE/spawn-A.json"

# The blocked driver: `full_auto = false` omits the kind's full-auto template,
# so the worker's first write hits claude's approval prompt and herdr reports
# the pane BLOCKED. This is a REAL block — no synthetic status is injected
# anywhere in this script.
write_runners false
"$TK" herd spawn "$TICK_B" --base "$BASE" --json > "$EVIDENCE/spawn-B.json"
assert "argv for the blocking worker does NOT carry the bypass template" \
  jq -e '(.manifest.argv | index("bypassPermissions")) == null' "$EVIDENCE/spawn-B.json"
write_runners true   # leave the repo in the ordinary state

WS_A="$(jq -r .manifest.workspace_id "$EVIDENCE/spawn-A.json")"
WS_B="$(jq -r .manifest.workspace_id "$EVIDENCE/spawn-B.json")"
PANE_A="$(jq -r .manifest.pane_id "$EVIDENCE/spawn-A.json")"
PANE_B="$(jq -r .manifest.pane_id "$EVIDENCE/spawn-B.json")"
log "workers: $TICK_A in $WS_A/$PANE_A, $TICK_B in $WS_B/$PANE_B"
assert "both workers have a pinnable workspace" test -n "$WS_A" -a -n "$WS_B"

# =============================================================== section 3 ====
step "3/7 paint: the hooks fired for THIS run, and herdr acknowledged the metadata"

# Spawning creates panes and changes agent status, so the paint hooks have
# already fired by now. Give the burst a moment to drain rather than polling.
sleep 6
plugin_logs_since "$RUN_MARK" > "$EVIDENCE/logs-after-spawn.json"

PAINT_RUNS="$(jq '[.[] | select(.command | index("scripts/paint-hook.sh"))] | length' "$EVIDENCE/logs-after-spawn.json")"
log "paint-hook invocations since the watermark: $PAINT_RUNS"
assert "the paint hook fired during the wave" test "$PAINT_RUNS" -gt 0
assert "no paint-hook invocation failed" \
  jq -e '[.[] | select((.command | index("scripts/paint-hook.sh")) and .status != "succeeded")] | length == 0' \
  "$EVIDENCE/logs-after-spawn.json"

# The pin is what makes the difference between a hook that paints and a hook
# that quietly finds no usable tk.
assert "no paint-hook invocation gave up looking for tk" \
  jq -e '[.[] | select((.command | index("scripts/paint-hook.sh")) and ((.stdout // "") | test("no usable .tk.")))] | length == 0' \
  "$EVIDENCE/logs-after-spawn.json"
assert "at least one paint-hook ran 'tk herd paint' and it exited 0" \
  jq -e '[.[] | select((.stdout // "") | test("tk herd paint exited 0"))] | length > 0' \
  "$EVIDENCE/logs-after-spawn.json"
assert "a paint report names a worker of this run" \
  jq -e --arg t "$TICK_A" '[.[] | select((.stdout // "") | test($t))] | length > 0' \
  "$EVIDENCE/logs-after-spawn.json"

# READ THE PAINT BACK OFF HERDR. `workspace get` and `pane get` do not report
# painted metadata in 0.8.0, but `agent list` does: the agent object carries the
# `title`, `state_labels` and `tokens` that pane.report_metadata set. That is a
# direct acknowledgement — not an inference — so it is the primary assertion.
painted_workers() {   # painted_workers <agent-list-json> — ticks whose badge is live
  jq -r --arg a "tick-$TICK_A" --arg b "tick-$TICK_B" \
    '[.result.agents[]? | select((.name? // "") == $a or (.name? // "") == $b)
      | select((.tokens?.TICK // "") != "") | .tokens.TICK] | sort | join(" ")' "$1"
}

# First, what the HOOKS alone achieved — no manual paint yet.
herdr agent list > "$EVIDENCE/agents-painted-by-hook.json"
HOOK_PAINTED="$(painted_workers "$EVIDENCE/agents-painted-by-hook.json")"
log "workers already badged by the event hooks alone: ${HOOK_PAINTED:-<none>}"
assert "the event hook alone painted a badge herdr echoes back" test -n "$HOOK_PAINTED"

# Badges are eventually-consistent by design: the hook debounces bursts (a
# repaint 2s after the last one is skipped), so a worker spawned inside the
# window is badged by the NEXT event rather than immediately. Asserting both
# workers are badged at an arbitrary instant is therefore a race — asserting
# that a paint round-trips is not.
"$TK" herd paint --epic "$EPIC_ID" --json > "$EVIDENCE/paint.json"
assert "paint reports workspace metadata for both workers" \
  jq -e '[.badges[] | select(.painted_workspace)] | length >= 2' "$EVIDENCE/paint.json"
jq -r '.badges[] | "\(.tick)  ws=\(.workspace_id)  pane=\(.pane_id)  title=\(.title)"' "$EVIDENCE/paint.json" >&2

herdr agent list > "$EVIDENCE/agents-painted.json"
jq -r --arg a "tick-$TICK_A" '.result.agents[] | select((.name? // "")==$a) | {title, tokens, state_labels}' \
  "$EVIDENCE/agents-painted.json" >&2
for t in "$TICK_A" "$TICK_B"; do
  assert "herdr echoes the painted TICK token for $t" \
    jq -e --arg a "tick-$t" --arg t "$t" \
    '.result.agents[] | select((.name? // "")==$a) | .tokens.TICK == $t' "$EVIDENCE/agents-painted.json"
  assert "herdr echoes the painted EPIC token for $t" \
    jq -e --arg a "tick-$t" --arg e "$EPIC_ID" \
    '.result.agents[] | select((.name? // "")==$a) | .tokens.EPIC == $e' "$EVIDENCE/agents-painted.json"
  assert "herdr echoes the painted pane title for $t" \
    jq -e --arg a "tick-$t" --arg t "$t" \
    '.result.agents[] | select((.name? // "")==$a) | .title | startswith($t + " · implement")' \
    "$EVIDENCE/agents-painted.json"
done

# The feedback bounce, kept as a SECOND signal because it is what makes the
# debounce load-bearing: a pane.report_metadata carrying a title makes herdr
# emit pane.agent_status_changed for that pane, re-entering this very hook,
# which is then debounced. Losing this would mean the paint loop stopped
# self-limiting.
BOUNCES="$(jq '[.[] | select((.stdout // "") | test("repainted less than"))] | length' "$EVIDENCE/logs-after-spawn.json")"
log "debounced re-entries (the paint feedback bounce): $BOUNCES"
assert "the paint feedback bounce happened and was debounced" test "$BOUNCES" -gt 0

# =============================================================== section 4 ====
step "4/7 dashboard: the board pane opens PINNED to a run-created workspace"

PANES_BEFORE="$EVIDENCE/panes-before-dashboard.txt"
herdr pane list | jq -r '.result.panes[].pane_id' | sort > "$PANES_BEFORE"
FOCUS_PRE_DASH="$(herdr_focused_workspace)"

# A target is NOT optional. With none, `plugin pane open` lands in whatever
# workspace is FOCUSED when the server runs the command — during a wave, very
# often not this run's.
#
# And for THIS pane it must be a --target-pane specifically: the dashboard
# entrypoint is placement = "split", and herdr 0.8.0 refuses a split or zoomed
# plugin pane that is given only a workspace. Asserted rather than described,
# because it is the reason action-open-tick-dashboard.sh resolves a pane inside
# the workspace instead of passing the workspace through.
set +e
herdr plugin pane open \
  --plugin "$PLUGIN_ID" --entrypoint dashboard \
  --workspace "$WS_A" --env "TICKS_REPO=$REPO" --no-focus \
  > "$EVIDENCE/dashboard-open-workspace-only.json" 2>&1
set -e
assert "herdr refuses a SPLIT plugin pane targeted by workspace alone" \
  grep -q "target_pane_id" "$EVIDENCE/dashboard-open-workspace-only.json"

herdr plugin pane open \
  --plugin "$PLUGIN_ID" \
  --entrypoint dashboard \
  --target-pane "$PANE_A" \
  --env "TICKS_REPO=$REPO" \
  --env "TICKS_EPIC=$EPIC_ID" \
  --no-focus > "$EVIDENCE/dashboard-open.json"
sleep 8

herdr pane list | jq -r '.result.panes[].pane_id' | sort > "$EVIDENCE/panes-after-dashboard.txt"
DASH_PANE="$(comm -13 "$PANES_BEFORE" "$EVIDENCE/panes-after-dashboard.txt" | head -n 1)"
log "dashboard pane: ${DASH_PANE:-<none>}"
assert "a new pane appeared" test -n "$DASH_PANE"
DASH_WS="$(herdr pane get "$DASH_PANE" | jq -r '.result.pane.workspace_id')"
assert_eq "the dashboard opened in the PINNED workspace, not the focused one" "$WS_A" "$DASH_WS"

# --no-focus is asserted as "focus did not land ON THE THING I JUST OPENED",
# not as "focus never moved". This session is shared with a human and other
# agents; focus moving to some unrelated pre-existing workspace mid-run is
# their business, and asserting otherwise is a flake, not a finding.
FOCUS_POST_DASH="$(herdr_focused_workspace)"
assert "--no-focus held: focus did not land on the workspace the dashboard opened in" \
  test "$FOCUS_POST_DASH" != "$DASH_WS"
if [ "$FOCUS_POST_DASH" != "$FOCUS_PRE_DASH" ]; then
  log "note: focus moved $FOCUS_PRE_DASH -> $FOCUS_POST_DASH during the open; neither is this run's, so someone else moved it"
fi

herdr pane read "$DASH_PANE" --lines 60 --format text > "$EVIDENCE/dashboard-pane.txt" 2>&1 || true
cat "$EVIDENCE/dashboard-pane.txt" >&2
assert "the board rendered its header" grep -q "Ticks mission control" "$EVIDENCE/dashboard-pane.txt"
assert "the board is scoped to this run's epic" grep -q "$EPIC_ID" "$EVIDENCE/dashboard-pane.txt"
assert "the board shows this run's ticks" grep -q "$TICK_A" "$EVIDENCE/dashboard-pane.txt"

# =============================================================== section 5 ====
step "5/7 notify: one blocked chime, one wave-complete chime, no duplicates"

log "waiting for $TICK_B to hit a real approval prompt (herdr status: blocked)"
herdr agent wait "tick-$TICK_B" --until blocked --timeout "$WORKER_TIMEOUT_MS" \
  > "$EVIDENCE/wait-blocked.json" || die "worker $TICK_B never blocked — full_auto=false did not produce an approval prompt"
ok "worker $TICK_B is BLOCKED on a real approval prompt"

log "waiting for $TICK_A to settle"
herdr agent wait "tick-$TICK_A" --timeout "$WORKER_TIMEOUT_MS" > "$EVIDENCE/wait-a.json" || true

# Wait for the EVIDENCE, not for a proxy. `agent wait` returning tells us a
# worker settled; it does not tell us the hook that fires on that transition has
# run and decided. Polling the plugin log for the chime is the only honest
# signal, and a bounded deadline turns "the notification was lost" into a
# reported failure instead of a flake.
chime_count() {   # chime_count <kind> <logfile>
  jq --arg kind "$1" '
    [ .[]
      | select(.command | index("scripts/notify-hook.sh"))
      # An invocation still in flight has stdout: null — the polling loop below
      # reads the log WHILE hooks are running, so this must never explode.
      | (.stdout // "")
      | split("\n")[]
      | select(startswith("notify") and test("\\[" + $kind + "\\]"))
    ] | length' "$2"
}
CHIME_DEADLINE=$(( $(date +%s) + 120 ))
while :; do
  plugin_logs_since "$RUN_MARK" > "$EVIDENCE/logs-after-wave.json"
  if [ "$(chime_count blocked "$EVIDENCE/logs-after-wave.json")" -ge 1 ] &&
     [ "$(chime_count wave_complete "$EVIDENCE/logs-after-wave.json")" -ge 1 ]; then
    break
  fi
  if [ "$(date +%s)" -ge "$CHIME_DEADLINE" ]; then
    log "!! both chimes did not arrive within the deadline — agent statuses now:"
    herdr agent list | jq -r '.result.agents[] | "\(.name) \(.agent_status)"' >&2
    break
  fi
  sleep 5
done
NOTIFY_RUNS="$(jq '[.[] | select(.command | index("scripts/notify-hook.sh"))] | length' "$EVIDENCE/logs-after-wave.json")"
log "notify-hook invocations: $NOTIFY_RUNS"
assert "the notify hook fired" test "$NOTIFY_RUNS" -gt 0
assert "no notify-hook invocation failed" \
  jq -e '[.[] | select((.command | index("scripts/notify-hook.sh")) and .status != "succeeded")] | length == 0' \
  "$EVIDENCE/logs-after-wave.json"
assert "no notify-hook invocation gave up looking for tk" \
  jq -e '[.[] | select((.command | index("scripts/notify-hook.sh")) and ((.stdout // "") | test("no usable .tk.")))] | length == 0' \
  "$EVIDENCE/logs-after-wave.json"

# `tk herd notify` prints one `notify [kind] ...` line per notification it
# actually sent. Counting those lines across EVERY hook invocation of the run is
# the duplicate check: once-semantics live in .notify-state.json, and the paint
# feedback bounce re-enters this hook repeatedly with nothing new to say.
BLOCKED_CHIMES="$(chime_count blocked "$EVIDENCE/logs-after-wave.json")"
WAVE_CHIMES="$(chime_count wave_complete "$EVIDENCE/logs-after-wave.json")"
jq -r '.[] | select(.command | index("scripts/notify-hook.sh")) | (.stdout // "")' \
  "$EVIDENCE/logs-after-wave.json" > "$EVIDENCE/notify-hook-stdout.txt"
grep -E '^(notify|silent)' "$EVIDENCE/notify-hook-stdout.txt" | sort | uniq -c >&2 || true

assert_eq "exactly one BLOCKED chime for the whole run" 1 "$BLOCKED_CHIMES"
assert_eq "exactly one WAVE-COMPLETE chime for the whole run" 1 "$WAVE_CHIMES"
assert "the blocked chime names the blocked tick" \
  grep -q "$TICK_B" "$EVIDENCE/notify-hook-stdout.txt"
assert "repeat invocations said nothing (the once-semantics held under the bounce)" \
  grep -q "nothing new to say" "$EVIDENCE/notify-hook-stdout.txt"
assert "the blocked chime used the 'request' sound" \
  grep -qE '^notify.*\[blocked\].*sound request' "$EVIDENCE/notify-hook-stdout.txt"
assert "the wave chime used the 'done' sound" \
  grep -qE '^notify.*\[wave_complete\].*sound done' "$EVIDENCE/notify-hook-stdout.txt"

# The once-semantics are not merely "we saw one chime" — they are visible as
# REFUSALS in the log: the hook ran many more times (the paint feedback bounce
# re-enters it with the same statuses) and each repeat said why it stayed quiet.
assert "a repeat invocation refused to re-announce the blocked episode" \
  grep -q "already notified for this blocked episode" "$EVIDENCE/notify-hook-stdout.txt"
assert "a repeat invocation refused to re-announce the wave completion" \
  grep -q "completion was already notified" "$EVIDENCE/notify-hook-stdout.txt"

# =============================================================== section 6 ====
step "6/7 action: invoke collect-tick on a real worker and observe its notification"

# `plugin action invoke` takes NO target in herdr 0.8.0 — the action is handed
# the CURRENT context, so the only way to aim it at a specific worker is to
# focus that worker's workspace first. This script therefore does the one thing
# it otherwise never does, moves focus, and puts it back immediately.
ACTION_MARK="$(( $(now_ms) - 1000 ))"
FOCUS_PRE_ACTION="$(herdr_focused_workspace)"
log "focusing $WS_A only to aim the action, then putting focus back on $FOCUS_PRE_ACTION"
herdr workspace focus "$WS_A" >/dev/null
herdr plugin action invoke collect-tick --plugin "$PLUGIN_ID" > "$EVIDENCE/action-invoke.json"
sleep 10
herdr workspace focus "$FOCUS_PRE_ACTION" >/dev/null || true
# The invariant is that the run's own deliberate focus move is undone — measured
# against where focus was immediately before it, not against run start.
assert_eq "the run's own focus move was undone" \
  "$FOCUS_PRE_ACTION" "$(herdr_focused_workspace)"

plugin_logs_since "$ACTION_MARK" > "$EVIDENCE/logs-action.json"
jq -r '.[] | select(.command | index("scripts/action-collect-tick.sh")) | .stdout' \
  "$EVIDENCE/logs-action.json" > "$EVIDENCE/action-stdout.txt"
cat "$EVIDENCE/action-stdout.txt" >&2
assert "the collect-tick action ran" test -s "$EVIDENCE/action-stdout.txt"
assert "the action matched the right worker from the invocation context" \
  grep -q "Matched tick $TICK_A" "$EVIDENCE/action-stdout.txt"
assert "the action ran 'tk herd collect' and reported a verdict" \
  grep -qE 'ready-to-merge|no-commits|missing-result|boundary-violation' "$EVIDENCE/action-stdout.txt"
assert "the action raised its verdict as a notification" \
  grep -qi 'notification\|notified\|collect' "$EVIDENCE/action-stdout.txt"
assert "the collect-tick action exited 0" \
  jq -e '[.[] | select((.command | index("scripts/action-collect-tick.sh")) and .exit_code != 0)] | length == 0' \
  "$EVIDENCE/logs-action.json"

# =============================================================== section 7 ====
step "7/7 teardown: refuse the blocked worker, release it, leave nothing behind"

herdr plugin pane close "$DASH_PANE" >/dev/null
DASH_PANE=""
ok "closed the dashboard pane"

# Cleanup MUST refuse a blocked worker: removing a workspace whose agent is
# waiting on a human throws away the question it was asking.
set +e
"$TK" herd cleanup --epic "$EPIC_ID" --preview --json > "$EVIDENCE/cleanup-preview-blocked.json"
set -e
jq -r '.plans[] | "\(.tick): refused=\(.refused) reason=\(.reason // "-")"' "$EVIDENCE/cleanup-preview-blocked.json" >&2
assert "cleanup refuses the BLOCKED worker" \
  jq -e --arg t "$TICK_B" '.plans[] | select(.tick==$t) | .reason == "blocked-worker"' \
  "$EVIDENCE/cleanup-preview-blocked.json"
# This script deliberately never merges — mission control is not the wave loop —
# so the finished worker is refused as `unmerged-branch`. That is the correct
# answer and worth asserting: it is the refusal that stops a run from deleting
# work nobody integrated.
assert "cleanup refuses the finished-but-unmerged worker" \
  jq -e --arg t "$TICK_A" '.plans[] | select(.tick==$t) | .reason == "unmerged-branch"' \
  "$EVIDENCE/cleanup-preview-blocked.json"

# Release the block the way a human would: dismiss the approval prompt.
log "dismissing $TICK_B's approval prompt (esc) so it stops being blocked"
herdr agent send-keys "tick-$TICK_B" esc >/dev/null 2>&1 || true
sleep 3
herdr agent send-keys "tick-$TICK_B" esc >/dev/null 2>&1 || true
herdr agent wait "tick-$TICK_B" --until idle --until done --timeout 120000 >/dev/null 2>&1 || \
  log "  $TICK_B did not report idle/done — the teardown sweep will handle it"

set +e
"$TK" herd cleanup --epic "$EPIC_ID" --apply --json > "$EVIDENCE/cleanup-apply.json"
set -e
jq -r '.plans[] | "\(.tick): applied=\(.applied) refused=\(.refused) reason=\(.reason // "-")"' \
  "$EVIDENCE/cleanup-apply.json" >&2

assert "releasing the block let cleanup take the worker it had refused" \
  jq -e --arg t "$TICK_B" '.plans[] | select(.tick==$t) | .applied == true' \
  "$EVIDENCE/cleanup-apply.json"

# Whatever cleanup refused, the run-end sweep still owns: nothing this run
# created may outlive it. This is the duty per-tick cleanup does not cover.
close_new_workspaces
herdr_workspace_ids > "$EVIDENCE/workspaces-after.txt"
assert_eq "zero run-created workspaces remain" "" \
  "$(comm -13 "$WS_BEFORE" "$EVIDENCE/workspaces-after.txt" | tr '\n' ' ' | sed 's/ *$//')"
assert "no pre-existing workspace was closed" \
  diff -q "$WS_BEFORE" <(comm -12 "$WS_BEFORE" "$EVIDENCE/workspaces-after.txt")
herdr_agent_names > "$EVIDENCE/agents-after.txt"
assert_eq "zero run-created agents remain" "" \
  "$(comm -13 "$AGENTS_BEFORE" "$EVIDENCE/agents-after.txt" | tr '\n' ' ' | sed 's/ *$//')"
# The teardown invariant: focus is on a workspace that existed BEFORE this run.
# Removing a workspace always drags focus to a neighbour, so a run that tore
# down its workers and left focus sitting on one of them (or on nothing) has
# failed the operator. Which pre-existing workspace it landed on is not this
# script's business — see restore_focus.
assert "focus is on a workspace that pre-dates this run" focus_is_pre_existing
log "focus: $(herdr_focused_workspace) (was $FOCUS_BEFORE at run start)"
git worktree list > "$EVIDENCE/worktrees-after.txt"
assert_eq "only the scratch checkout remains in git worktree list" 1 \
  "$(wc -l < "$EVIDENCE/worktrees-after.txt" | tr -d ' ')"

restore_pin; PIN_FILE=""
restore_plugin_link
assert_eq "the operator's plugin link is restored" "$RESTORE_PLUGIN_ROOT" "$(plugin_root_now)"
RESTORE_PLUGIN_ROOT=""

# ------------------------------------------------------------------ report ---
cp -R "$EVIDENCE" "$SCRATCH/evidence-final" 2>/dev/null || true
echo
echo "================ herd plugin smoke: PASS ================"
printf 'herdr                  %s\n' "$HERDR_VERSION"
printf 'scratch repo           %s\n' "$REPO"
printf 'epic / ticks           %s / %s (auto) %s (blocked)\n' "$EPIC_ID" "$TICK_A" "$TICK_B"
printf 'paint-hook runs        %s (bounces debounced: %s)\n' "$PAINT_RUNS" "$BOUNCES"
printf 'notify-hook runs       %s\n' "$NOTIFY_RUNS"
printf 'chimes                 blocked=%s wave-complete=%s\n' "$BLOCKED_CHIMES" "$WAVE_CHIMES"
printf 'assertions passed      %s\n' "$CHECKS"
printf 'total wall time        %s\n' "$(elapsed)"
echo "========================================================="
exit 0
