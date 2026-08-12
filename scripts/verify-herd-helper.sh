#!/usr/bin/env bash
# verify-herd-helper.sh — live end-to-end smoke test of the `tk herd` helper CLI
# against a real herdr server, in a throwaway scratch repo.
#
# What it proves, in order:
#   1. setup      a scratch git repo + `tk init` + a toy epic with three trivial
#                 ticks, routed at a small/fast model through .tick/runners.toml.
#   2. refusal    `tk herd spawn` fails closed on an impossible cell
#                 (kind=claude + model=gpt-x) and makes ZERO herdr calls.
#   3. wave       spawn -> wait -> collect -> merge -> checks -> close -> cleanup,
#                 driven ONLY by the helper, git and tk. The number of helper
#                 invocations the wave costs is counted and asserted.
#   4. kill -9    the driving wait is killed mid-flight (orchestrator death);
#                 `tk herd reconcile` must classify the still-running worker as
#                 live-worker and propose NO redispatch; the tick then completes
#                 normally with no worker output lost.
#   5. teardown   every workspace, worktree, branch and manifest the run created
#                 is gone, including the scratch checkout's own herdr workspace.
#
# The contract under test is skills/ticks/references/herdr-runner.md.
#
# Herdr etiquette this script obeys and asserts: --no-focus flows only (the
# helper does this), never touch a pane/workspace/agent it did not create,
# never `herdr server stop`, never bare `herdr`, always bounded timeouts.
#
# Usage:
#   bash scripts/verify-herd-helper.sh [options]
#
#   --dir DIR         parent directory for the scratch repo (default: $TMPDIR)
#   --tk PATH         tk binary to test (default: build ./cmd/tk into the scratch dir)
#   --model M         model for the implement role (default: haiku)
#   --effort E        effort for the implement role (default: low)
#   --quick           skip the kill -9 recovery drill (sections 4); everything else runs
#   --keep            keep the scratch directory on success
#   --wave-timeout MS hard deadline for a wave's fan-in (default: 900000)
#
# Requires: bash 3.2+, git, jq, herdr (running server), and a herdr session.

set -euo pipefail

# ---------------------------------------------------------------- options ----

SCRATCH_PARENT="${TMPDIR:-/tmp}"
TK=""
MODEL="haiku"
EFFORT="low"
QUICK=0
KEEP=0
WAVE_TIMEOUT_MS=900000

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) SCRATCH_PARENT="$2"; shift 2 ;;
    --tk) TK="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --effort) EFFORT="$2"; shift 2 ;;
    --wave-timeout) WAVE_TIMEOUT_MS="$2"; shift 2 ;;
    --quick) QUICK=1; shift ;;
    --keep) KEEP=1; shift ;;
    -h|--help) sed -n '2,45p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# ------------------------------------------------------------- primitives ----

START_EPOCH=$(date +%s)
FAILURES=0

ts() { date +%H:%M:%S; }
elapsed() { echo "$(( $(date +%s) - START_EPOCH ))s"; }
# The narration goes to stderr so that a command's stdout can be captured and
# asserted on verbatim — an empty stdout is itself evidence that a refusal
# produced no plan (section 2).
log()  { echo "[$(ts) +$(elapsed)] $*" >&2; }
step() { echo >&2; echo "=== [$(ts) +$(elapsed)] $* ===" >&2; }
die()  { echo "FATAL: $*" >&2; exit 1; }

# ok/assert record a numbered check result. A failed assertion is fatal: this
# is a smoke test, and continuing past a broken invariant only produces noise.
CHECKS=0
ok() { CHECKS=$((CHECKS + 1)); log "  ok  [$CHECKS] $*"; }
assert() {
  # assert <description> <test-command...>  — the command's own output is
  # silenced so the check log stays readable; evidence lives in $EVIDENCE.
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
need git; need jq; need herdr

# ------------------------------------------------------- helper-call count ----
#
# Every `tk herd ...` invocation goes through tkherd(), which counts it. The
# wave budget is the point of the exercise: a wave of N ticks must not cost a
# helper call per state transition.

HELPER_CALLS_TOTAL=0
WAVE_CALLS=0
DIAG_CALLS=0
DRILL_CALLS=0
COUNT_BUCKET="diag"   # wave | diag | drill

tkherd() {
  HELPER_CALLS_TOTAL=$((HELPER_CALLS_TOTAL + 1))
  case "$COUNT_BUCKET" in
    wave)  WAVE_CALLS=$((WAVE_CALLS + 1)) ;;
    drill) DRILL_CALLS=$((DRILL_CALLS + 1)) ;;
    *)     DIAG_CALLS=$((DIAG_CALLS + 1)) ;;
  esac
  log "helper call #$HELPER_CALLS_TOTAL [$COUNT_BUCKET]: tk herd $*"
  "$TK" herd "$@"
}

# --------------------------------------------------------------- scratch -----

RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
SCRATCH="$SCRATCH_PARENT/tk-herd-smoke-$RUN_ID"
REPO="$SCRATCH/repo"
EVIDENCE="$SCRATCH/evidence"
mkdir -p "$REPO" "$EVIDENCE"

# Baseline of everything herdr already owns. Nothing in these two lists may be
# touched, and at teardown nothing outside them may remain.
WS_BEFORE="$EVIDENCE/workspaces-before.txt"
AGENTS_BEFORE="$EVIDENCE/agents-before.txt"

herdr_workspace_ids() { herdr workspace list | jq -r '.result.workspaces[].workspace_id' | sort; }
herdr_focused_workspace() { herdr workspace list | jq -r '.result.workspaces[] | select(.focused) | .workspace_id'; }
# A workspace whose checkout is a linked worktree must be torn down with
# `worktree remove` (worktree + workspace + pane + agent, one call). Merely
# closing it orphans the worktree on disk — observed on a failed run.
herdr_workspace_is_linked() {
  herdr workspace list \
    | jq -e --arg id "$1" '.result.workspaces[] | select(.workspace_id==$id) | .worktree.is_linked_worktree' >/dev/null
}
herdr_agent_names()   { herdr agent list | jq -r '.result.agents[]?.name // empty' | sort; }

TEARDOWN_DONE=0
teardown() {
  local rc=$?
  [ "$TEARDOWN_DONE" = 1 ] && return $rc
  TEARDOWN_DONE=1
  if [ $rc -ne 0 ]; then
    echo
    echo "!!! run failed (exit $rc) — running best-effort teardown; scratch kept at $SCRATCH"
    KEEP=1
    # Best effort: never let a failed run leak workers or workspaces.
    [ -n "${EPIC_ID:-}" ] && "$TK" herd cleanup --epic "$EPIC_ID" --apply >/dev/null 2>&1 || true
    close_new_workspaces || true
  fi
  if [ "$KEEP" = 1 ]; then
    echo "scratch: $SCRATCH"
  else
    rm -rf "$SCRATCH"
  fi
  return $rc
}
trap teardown EXIT

# close_new_workspaces closes every workspace that did not exist at baseline.
# Closing a workspace never deletes files on disk; this is the run-end duty
# herdr-runner.md's cleanup rule states and per-tick cleanup does not cover.
close_new_workspaces() {
  local id
  [ -f "$WS_BEFORE" ] || return 0
  # Linked worktrees FIRST. Closing a repo's source-checkout workspace also
  # drops the workspaces of that repo's linked worktrees, and a workspace that
  # is merely closed leaves its worktree on disk — so closing the checkout
  # first orphans every per-tick worktree that is still open (observed live on
  # a failed run).
  for id in $(comm -13 "$WS_BEFORE" <(herdr_workspace_ids)); do
    if herdr_workspace_is_linked "$id"; then
      log "removing run-created worktree workspace $id"
      # Never silenced: `worktree remove` refuses a worktree with uncommitted
      # work (it is never forced), and a swallowed refusal is how a run ends
      # up reporting a clean teardown over an orphaned worktree.
      herdr worktree remove --workspace "$id" || log "  worktree remove refused $id — see above"
    fi
  done
  for id in $(comm -13 "$WS_BEFORE" <(herdr_workspace_ids)); do
    log "closing run-created workspace $id"
    herdr workspace close "$id" || log "  workspace close refused $id — see above"
  done
  restore_focus
}

# restore_focus puts the user's view back where it was. Removing or closing a
# workspace moves herdr's focus to a NEIGHBOURING workspace — whatever
# --no-focus was passed on the way in — so a run's teardown drags the user onto
# a pane the run created, and then onto whatever is adjacent when that closes.
# The run that moved it is the only thing that knows where it was.
restore_focus() {
  [ -n "${FOCUS_BEFORE:-}" ] || return 0
  local now; now="$(herdr_focused_workspace)"
  if [ "$now" = "$FOCUS_BEFORE" ]; then
    return 0
  fi
  if herdr_workspace_ids | grep -qx "$FOCUS_BEFORE"; then
    log "teardown moved focus to ${now:-<none>} — restoring it to $FOCUS_BEFORE"
    herdr workspace focus "$FOCUS_BEFORE" >/dev/null || log "  could not restore focus"
  else
    log "the workspace focused at run start ($FOCUS_BEFORE) is gone — leaving herdr's choice (${now:-<none>})"
  fi
}

# =============================================================== section 1 ====
step "1/5 setup: scratch repo, tk init, toy epic + 3 ticks, runners.toml"

log "scratch: $SCRATCH"
[ "${HERDR_ENV:-}" = "1" ] || log "note: HERDR_ENV is not 1 — relying on the socket probe"
herdr status server | tee "$EVIDENCE/herdr-status.txt"

herdr_workspace_ids > "$WS_BEFORE"
herdr_agent_names   > "$AGENTS_BEFORE"
FOCUS_BEFORE="$(herdr_focused_workspace)"
echo "$FOCUS_BEFORE" > "$EVIDENCE/focus-before.txt"
log "baseline: $(wc -l < "$WS_BEFORE" | tr -d ' ') workspaces, $(wc -l < "$AGENTS_BEFORE" | tr -d ' ') agents, focus on ${FOCUS_BEFORE:-<none>}"

if [ -z "$TK" ]; then
  # Build from the repo this script lives in.
  SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  TK="$SCRATCH/tk"
  log "building tk from $SRC_ROOT"
  (cd "$SRC_ROOT" && go build -o "$TK" ./cmd/tk)
fi
TK="$(cd "$(dirname "$TK")" && pwd)/$(basename "$TK")"
log "tk: $TK"

cd "$REPO"
git init -q -b main .
git config user.email "smoke@example.invalid"
git config user.name "Herd Smoke"
# tk init needs a GitHub remote to derive the project id. Nothing is ever
# pushed; the URL is deliberately non-resolvable.
git remote add origin "https://github.com/tk-smoke/herd-helper-smoke.git"
echo "# herd helper smoke scratch repo" > README.md
git add -A
git commit -q -m "initial commit"

# The feature/integration branch. Workers branch from its HEAD and the wave is
# merged back into it, exactly as an epic branch works in a real run.
INTEGRATION_BRANCH="epic/toy"
git checkout -q -b "$INTEGRATION_BRANCH"

"$TK" init >/dev/null
git add -A && git commit -q -m "tk init"

EPIC_ID="$("$TK" create "Toy epic for the herd helper smoke" --type epic --json | jq -r .id)"
log "epic: $EPIC_ID"

mk_tick() {
  # mk_tick <name> <marker>
  local name="$1" marker="$2"
  "$TK" create "Add the $name marker" \
    --parent "$EPIC_ID" \
    --json \
    -d 'Create exactly two files at the root of this worktree, and nothing else.

1. A file named '"$name"'.txt whose only content is the single line:
   '"$marker"'
2. An executable shell script named check-'"$name"'.sh that exits 0 when
   '"$name"'.txt contains the line '"$marker"', and exits 1 otherwise.

This is a deliberately trivial task. Do not add tests beyond the check script,
do not add a README, do not modify any existing file, and do not push.' \
    --acceptance 'Running: bash check-'"$name"'.sh
exits 0, and '"$name"'.txt contains the line '"$marker"'.' \
  | jq -r .id
}

TICK_A="$(mk_tick alpha alpha-ok)"
TICK_B="$(mk_tick beta beta-ok)"
TICK_C="$(mk_tick gamma gamma-ok)"
log "ticks: A=$TICK_A B=$TICK_B C=$TICK_C"

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
full_auto = true

[roles.implement]
kind = "claude"
model = "$MODEL"
effort = "$EFFORT"
TOML
cp .tick/runners.toml "$EVIDENCE/runners.toml"

git add -A
git commit -q -m "toy epic $EPIC_ID: ticks + runners.toml"
BASE="$(git rev-parse HEAD)"
log "integration branch $INTEGRATION_BRANCH at $BASE"

# =============================================================== section 2 ====
step "2/5 fail-closed: tk herd spawn refuses an impossible cell, dialing herdr zero times"

cp .tick/runners.toml "$SCRATCH/runners.toml.bak"
cat >> .tick/runners.toml <<'TOML'

[roles.review]
kind = "claude"
model = "gpt-x"
TOML

herdr_workspace_ids > "$EVIDENCE/ws-pre-refusal.txt"
herdr_agent_names   > "$EVIDENCE/agents-pre-refusal.txt"

set +e
COUNT_BUCKET="diag"
tkherd spawn "$TICK_C" --role review --base "$BASE" > "$EVIDENCE/refusal.out" 2> "$EVIDENCE/refusal.err"
REFUSAL_RC=$?
set -e
cat "$EVIDENCE/refusal.err"

assert_eq "impossible cell exits 1 (a stop, not a guess)" 1 "$REFUSAL_RC"
assert "refusal names the role/tier cell" grep -q "roles.review" "$EVIDENCE/refusal.err"
assert "refusal names the kind" grep -q 'claude' "$EVIDENCE/refusal.err"
assert "refusal names the model" grep -q 'gpt-x' "$EVIDENCE/refusal.err"
assert "refusal did not reroute or spawn anything" test ! -s "$EVIDENCE/refusal.out"

herdr_workspace_ids > "$EVIDENCE/ws-post-refusal.txt"
herdr_agent_names   > "$EVIDENCE/agents-post-refusal.txt"
assert "zero herdr calls: workspace list unchanged" \
  diff -q "$EVIDENCE/ws-pre-refusal.txt" "$EVIDENCE/ws-post-refusal.txt"
assert "zero herdr calls: agent list unchanged" \
  diff -q "$EVIDENCE/agents-pre-refusal.txt" "$EVIDENCE/agents-post-refusal.txt"
assert "no branch was created for the refused spawn" \
  test -z "$(git branch --list "tick/$TICK_C")"
assert "no manifest was written for the refused spawn" \
  test ! -f ".tick/logs/herd/$EPIC_ID/$TICK_C.json"

cp "$SCRATCH/runners.toml.bak" .tick/runners.toml
git add -A && git commit -q -m "restore runners.toml after refusal demo" || true

# =============================================================== section 3 ====
step "3/5 wave: spawn x2 -> wait -> collect -> merge -> checks -> close -> cleanup"

WAVE_START=$(date +%s)
COUNT_BUCKET="wave"

for t in "$TICK_A" "$TICK_B"; do
  tkherd spawn "$t" --base "$BASE" --json > "$EVIDENCE/spawn-$t.json"
  assert "manifest written for $t" test -f ".tick/logs/herd/$EPIC_ID/$t.json"
  note="$(jq -r .note "$EVIDENCE/spawn-$t.json")"
  case "$note" in
    runner-state:*substrate=herdr*kind=claude*branch=tick/$t*) ok "note line for $t: $note" ;;
    *) die "spawn note line for $t is not the documented runner-state: shape: $note" ;;
  esac
  # The helper never runs tk; writing the note is the orchestrator's job.
  "$TK" note "$t" "$note" >/dev/null
  assert "argv carries the full-auto template for $t" \
    jq -e '.manifest.argv | index("bypassPermissions")' "$EVIDENCE/spawn-$t.json"
  assert "argv carries the compiled model flag for $t" \
    jq -e --arg m "$MODEL" '.manifest.argv | index($m)' "$EVIDENCE/spawn-$t.json"
  assert "argv carries the compiled effort flag for $t" \
    jq -e --arg e "$EFFORT" '.manifest.argv | index($e)' "$EVIDENCE/spawn-$t.json"
done
log "wave dispatched in $(( $(date +%s) - WAVE_START ))s — both workers launched before anything was waited on"

# One fan-in call for the whole wave. This blocks on pushed
# pane.agent_status_changed events; there is no polling anywhere in this loop.
WAIT_START=$(date +%s)
set +e
tkherd wait --agents "tick-$TICK_A,tick-$TICK_B" --timeout "$WAVE_TIMEOUT_MS" --json > "$EVIDENCE/wait.json"
WAIT_RC=$?
set -e
WAIT_SECS=$(( $(date +%s) - WAIT_START ))
jq . "$EVIDENCE/wait.json"
assert_eq "wave fan-in exited 0" 0 "$WAIT_RC"
assert_eq "no worker timed out" 0 "$(jq '.summary.timed_out | length' "$EVIDENCE/wait.json")"
assert_eq "no worker blocked" 0 "$(jq '.summary.blocked' "$EVIDENCE/wait.json")"
assert_eq "both workers settled" 2 "$(jq '.summary.settled' "$EVIDENCE/wait.json")"
assert "the wait reports its own elapsed time (event-driven, not polled)" \
  jq -e '.summary.elapsed_ms > 0' "$EVIDENCE/wait.json"
log "fan-in returned after ${WAIT_SECS}s ($(jq -r '.summary.elapsed_ms' "$EVIDENCE/wait.json")ms by the helper's own clock)"

# Optional, and deliberately OUTSIDE the wave budget: a read-only preview run
# BEFORE the merge must refuse, because the branches are live and unmerged.
COUNT_BUCKET="diag"
set +e
tkherd cleanup --epic "$EPIC_ID" --preview --json > "$EVIDENCE/cleanup-preview-early.json"
EARLY_RC=$?
set -e
jq -r '.plans[] | "\(.tick): refused=\(.refused) reason=\(.reason // "-")"' "$EVIDENCE/cleanup-preview-early.json"
assert_eq "an early cleanup preview refuses (exit 1)" 1 "$EARLY_RC"
assert_eq "every tick is refused before the merge" 2 \
  "$(jq '[.plans[] | select(.refused)] | length' "$EVIDENCE/cleanup-preview-early.json")"
log "  refusal reasons: $(jq -r '[.plans[].reason] | join(", ")' "$EVIDENCE/cleanup-preview-early.json")"
assert "the preview touched nothing" test -f ".tick/logs/herd/$EPIC_ID/$TICK_A.json"
COUNT_BUCKET="wave"

# The durable completion authority: commits + RESULT-<id>.md + a clean .tick/
# boundary. One call collects the whole wave.
set +e
tkherd collect --epic "$EPIC_ID" --json > "$EVIDENCE/collect.json"
COLLECT_RC=$?
set -e
jq -r '.reports[] | "\(.tick)  \(.verdict)  \(.status)  commits=\(.commits)"' "$EVIDENCE/collect.json"
assert_eq "collect exited 0 (every worker ready-to-merge)" 0 "$COLLECT_RC"
for t in "$TICK_A" "$TICK_B"; do
  assert_eq "verdict for $t" "ready-to-merge" \
    "$(jq -r --arg t "$t" '.reports[] | select(.tick==$t) | .verdict' "$EVIDENCE/collect.json")"
  assert "commits exist on tick/$t" \
    jq -e --arg t "$t" '.reports[] | select(.tick==$t) | .commits > 0' "$EVIDENCE/collect.json"
  assert "no .tick/ boundary violation on tick/$t" \
    jq -e --arg t "$t" '.reports[] | select(.tick==$t) | .boundary_files | length == 0' "$EVIDENCE/collect.json"
done

# Integration is the orchestrator's job: plain git, no helper involved.
for t in "$TICK_A" "$TICK_B"; do
  git merge --no-edit "tick/$t" >/dev/null
  assert "merge of tick/$t committed cleanly" test ! -f .git/MERGE_HEAD
done
assert "alpha check passes on the integrated tree" bash check-alpha.sh
assert "beta check passes on the integrated tree" bash check-beta.sh
assert "per-tick report files did not collide" test -f "RESULT-$TICK_A.md" -a -f "RESULT-$TICK_B.md"

for t in "$TICK_A" "$TICK_B"; do
  "$TK" close "$t" >/dev/null
  assert_eq "tick $t is closed" "closed" "$("$TK" show "$t" --json | jq -r .status)"
done
git add -A && git commit -q -m "wave 1: integrate $TICK_A + $TICK_B, close both" || true

set +e
tkherd cleanup --epic "$EPIC_ID" --apply --json > "$EVIDENCE/cleanup-apply.json"
CLEAN_RC=$?
set -e
jq -r '.plans[] | "\(.tick): applied=\(.applied) refused=\(.refused)"' "$EVIDENCE/cleanup-apply.json"
assert_eq "cleanup --apply exited 0" 0 "$CLEAN_RC"
assert_eq "both ticks cleaned" 2 "$(jq '.summary.clean' "$EVIDENCE/cleanup-apply.json")"
for t in "$TICK_A" "$TICK_B"; do
  assert "workspace + branch + manifest gone for $t" test ! -f ".tick/logs/herd/$EPIC_ID/$t.json"
  assert "local branch tick/$t deleted" test -z "$(git branch --list "tick/$t")"
done

COUNT_BUCKET="diag"
WAVE_SECS=$(( $(date +%s) - WAVE_START ))
log "WAVE HELPER INVOCATIONS: $WAVE_CALLS (2 ticks, ${WAVE_SECS}s wall)"
log "  = spawn x2 + wait x1 + collect --epic x1 + cleanup --apply --epic x1"
log "  (the pre-merge cleanup --preview is a read-only dry run and is counted"
log "   separately as a diagnostic: diag calls so far = $DIAG_CALLS)"
if [ "$WAVE_CALLS" -le 5 ]; then
  ok "wave loop used $WAVE_CALLS helper invocations (budget: 5)"
else
  die "wave loop used $WAVE_CALLS helper invocations, over the budget of 5"
fi

# =============================================================== section 4 ====
if [ "$QUICK" = 1 ]; then
  step "4/5 kill -9 recovery drill: SKIPPED (--quick)"
else
step "4/5 kill -9 recovery drill: orchestrator dies mid-wait, reconcile must see a live worker"

COUNT_BUCKET="drill"
BASE2="$(git rev-parse HEAD)"
tkherd spawn "$TICK_C" --base "$BASE2" --json > "$EVIDENCE/spawn-$TICK_C.json"
"$TK" note "$TICK_C" "$(jq -r .note "$EVIDENCE/spawn-$TICK_C.json")" >/dev/null

# Run the fan-in in a subprocess that IS the tk process (exec), then kill -9 it:
# the orchestrator dies while its worker keeps running in its own pane.
( exec "$TK" herd wait --agents "tick-$TICK_C" --timeout "$WAVE_TIMEOUT_MS" \
    > "$EVIDENCE/wait-killed.json" 2>&1 ) &
DOOMED=$!
HELPER_CALLS_TOTAL=$((HELPER_CALLS_TOTAL + 1)); DRILL_CALLS=$((DRILL_CALLS + 1))
log "helper call #$HELPER_CALLS_TOTAL [drill]: tk herd wait (pid $DOOMED, about to be killed)"
sleep 5                      # let the wait subscribe; not a poll, a one-shot delay
kill -9 "$DOOMED" 2>/dev/null || true
wait "$DOOMED" 2>/dev/null || true
assert "the driving wait process is dead" test -z "$(ps -p "$DOOMED" -o pid= 2>/dev/null)"
log "orchestrator killed with SIGKILL mid-wait"

tkherd reconcile --epic "$EPIC_ID" --json > "$EVIDENCE/reconcile.json"
jq . "$EVIDENCE/reconcile.json"
CLASS="$(jq -r --arg t "$TICK_C" '.items[] | select(.tick==$t) | .class' "$EVIDENCE/reconcile.json")"
assert_eq "reconcile classifies the surviving worker" "live-worker" "$CLASS"
assert "reconcile proposes NO redispatch for a live worker" \
  jq -e --arg t "$TICK_C" '.items[] | select(.tick==$t) | .plan.redispatch == false' "$EVIDENCE/reconcile.json"
assert "reconcile proposes no mutation for a live worker" \
  jq -e --arg t "$TICK_C" '.items[] | select(.tick==$t) | (.plan.proposed_mutations // []) | length == 0' "$EVIDENCE/reconcile.json"
assert "reconcile found the live agent by name" \
  jq -e --arg t "$TICK_C" '.items[] | select(.tick==$t) | .evidence.live_agent | startswith("tick-")' "$EVIDENCE/reconcile.json"
assert "the only tick in flight is the drilled one" \
  jq -e '.items | length == 1' "$EVIDENCE/reconcile.json"

# Continue the same worker — the cheapest recovery there is. No respawn.
set +e
tkherd wait --agents "tick-$TICK_C" --timeout "$WAVE_TIMEOUT_MS" --json > "$EVIDENCE/wait-resumed.json"
RESUMED_RC=$?
set -e
assert_eq "the fresh session's fan-in exited 0" 0 "$RESUMED_RC"
assert_eq "no worker timed out after the kill" 0 \
  "$(jq '.summary.timed_out | length' "$EVIDENCE/wait-resumed.json")"

set +e
tkherd collect "$TICK_C" --epic "$EPIC_ID" --json > "$EVIDENCE/collect-$TICK_C.json"
COLLECT_C_RC=$?
set -e
jq -r '.reports[] | "\(.tick)  \(.verdict)  \(.status)  commits=\(.commits)"' "$EVIDENCE/collect-$TICK_C.json"
assert_eq "the killed orchestrator lost no worker output" "ready-to-merge" \
  "$(jq -r '.reports[0].verdict' "$EVIDENCE/collect-$TICK_C.json")"
assert "the worker's commits survived the kill" \
  jq -e '.reports[0].commits > 0' "$EVIDENCE/collect-$TICK_C.json"
assert "the worker's report survived the kill" \
  jq -e '.reports[0].result_exists' "$EVIDENCE/collect-$TICK_C.json"

git merge --no-edit "tick/$TICK_C" >/dev/null
assert "gamma check passes on the integrated tree" bash check-gamma.sh
"$TK" close "$TICK_C" >/dev/null
git add -A && git commit -q -m "wave 2: integrate $TICK_C after kill -9 recovery, close it" || true

tkherd cleanup "$TICK_C" --epic "$EPIC_ID" --apply --json > "$EVIDENCE/cleanup-$TICK_C.json"
assert "manifest for $TICK_C removed" test ! -f ".tick/logs/herd/$EPIC_ID/$TICK_C.json"
assert "branch tick/$TICK_C deleted" test -z "$(git branch --list "tick/$TICK_C")"
log "kill -9 drill used $DRILL_CALLS helper invocations"
fi

# =============================================================== section 5 ====
step "5/5 teardown: zero run-created workspaces, worktrees, branches or manifests remain"

COUNT_BUCKET="diag"

assert "no tick/* branches remain" test -z "$(git branch --list 'tick/*')"
assert "no manifests remain" test -z "$(ls -A ".tick/logs/herd/$EPIC_ID" 2>/dev/null || true)"
git worktree list > "$EVIDENCE/worktrees-after.txt"
assert_eq "only the scratch checkout remains in git worktree list" 1 \
  "$(wc -l < "$EVIDENCE/worktrees-after.txt" | tr -d ' ')"

# Per-tick cleanup does not cover the checkout's own workspace, which herdr
# opened when the first worktree was created against this repo. Closing it is
# the orchestrator's run-end duty.
herdr_workspace_ids > "$EVIDENCE/workspaces-mid.txt"
NEW_WS="$(comm -13 "$WS_BEFORE" "$EVIDENCE/workspaces-mid.txt" | tr '\n' ' ')"
log "run-created workspaces still open before the run-end sweep: ${NEW_WS:-<none>}"
close_new_workspaces
herdr_workspace_ids > "$EVIDENCE/workspaces-after.txt"
assert_eq "zero run-created workspaces remain" "" \
  "$(comm -13 "$WS_BEFORE" "$EVIDENCE/workspaces-after.txt" | tr '\n' ' ' | sed 's/ *$//')"
assert "no pre-existing workspace was closed" \
  diff -q "$WS_BEFORE" <(comm -12 "$WS_BEFORE" "$EVIDENCE/workspaces-after.txt")

herdr_agent_names > "$EVIDENCE/agents-after.txt"
assert_eq "zero run-created agents remain" "" \
  "$(comm -13 "$AGENTS_BEFORE" "$EVIDENCE/agents-after.txt" | tr '\n' ' ' | sed 's/ *$//')"

# The run must not leave the user looking somewhere else. close_new_workspaces
# already restored focus; this asserts it landed.
FOCUS_AFTER="$(herdr_focused_workspace)"
echo "$FOCUS_AFTER" > "$EVIDENCE/focus-after.txt"
assert_eq "focus is back on the workspace that had it at run start" "$FOCUS_BEFORE" "$FOCUS_AFTER"

# ------------------------------------------------------------------ report ---
echo
echo "================ herd helper smoke: PASS ================"
printf 'scratch repo            %s\n' "$REPO"
printf 'epic / ticks            %s / %s %s %s\n' "$EPIC_ID" "$TICK_A" "$TICK_B" "$TICK_C"
printf 'model / effort          %s / %s (kind claude)\n' "$MODEL" "$EFFORT"
printf 'assertions passed       %s\n' "$CHECKS"
printf 'wave helper calls       %s  (budget 5, 2 ticks)\n' "$WAVE_CALLS"
printf 'diagnostic helper calls %s  (refusal demo, early cleanup --preview)\n' "$DIAG_CALLS"
printf 'kill-9 drill calls      %s\n' "$DRILL_CALLS"
printf 'total helper calls      %s\n' "$HELPER_CALLS_TOTAL"
printf 'wave wall time          %ss\n' "$WAVE_SECS"
printf 'total wall time         %s\n' "$(elapsed)"
echo "========================================================="

exit 0
