#!/usr/bin/env bash
# "Retry tick" action for the herdr-ticks plugin — ADVISORY ONLY.
#
# This action spawns nothing, kills nothing and writes nothing. It runs
# `tk herd reconcile --epic <id> --json`, finds the targeted tick's
# classification, and tells the operator what the ORCHESTRATOR should do.
#
# Why it stops there, deliberately:
#
#   Reconcile's whole contract is "one actor decides". The five classes exist
#   because a crashed orchestrator leaves LIVE workers behind, and the one
#   unforgivable move is starting a second worker for a tick that already has
#   one — a branch with no commits is exactly what a worker that has not
#   committed yet looks like. A right-click that could redispatch would be a
#   second actor mutating the run, racing the orchestrator that owns dispatch.
#   So this surfaces the plan and the operator hands it to the orchestrator.
#
# Target resolution is identical in all three action-*.sh scripts: the invoked
# workspace/pane comes from HERDR_PLUGIN_CONTEXT_JSON, the run-state manifests
# under .tick/logs/herd/<epic>/<tick>.json record pane_id and workspace_id, and
# matching one against the other names the tick.
set -uo pipefail

ctx="${HERDR_PLUGIN_CONTEXT_JSON:-}"

ctx_field() {
  local key="$1"
  [ -n "$ctx" ] || return 0
  printf '%s' "$ctx" |
    sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

mf_field() {
  sed -n "s/^[[:space:]]*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1
}

herdr="${HERDR_BIN_PATH:-}"
[ -n "$herdr" ] || herdr="$(command -v herdr 2>/dev/null || true)"

notify() {
  [ -n "$herdr" ] && [ -x "$herdr" ] || return 0
  "$herdr" notification show "$1" --body "$2" --sound none >/dev/null 2>&1 ||
    echo "(notification failed — the plan above is the record)"
}

repo="${TICKS_REPO:-}"
[ -n "$repo" ] || repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"

pane="$(ctx_field focused_pane_id)"
[ -n "$pane" ] || pane="${HERDR_PANE_ID:-}"
workspace="$(ctx_field workspace_id)"
[ -n "$workspace" ] || workspace="${HERDR_WORKSPACE_ID:-}"

echo "Retry tick (advisory) — repo: ${repo:-<unknown>} pane: ${pane:-<none>} workspace: ${workspace:-<none>}"

if [ -z "$repo" ] || [ ! -d "$repo/.tick/logs/herd" ]; then
  echo "No herd run state in ${repo:-<unknown>} — nothing to reconcile."
  exit 0
fi

manifest=""
if [ -n "$pane" ]; then
  for f in "$repo"/.tick/logs/herd/*/*.json; do
    [ -f "$f" ] || continue
    if [ "$(mf_field "$f" pane_id)" = "$pane" ]; then manifest="$f"; break; fi
  done
fi
if [ -z "$manifest" ] && [ -n "$workspace" ]; then
  for f in "$repo"/.tick/logs/herd/*/*.json; do
    [ -f "$f" ] || continue
    if [ "$(mf_field "$f" workspace_id)" = "$workspace" ]; then manifest="$f"; break; fi
  done
fi

if [ -z "$manifest" ]; then
  echo "No herd worker matches this pane/workspace — nothing to reconcile."
  exit 0
fi

tick="$(mf_field "$manifest" tick)"
epic="$(mf_field "$manifest" epic)"
echo "Matched tick $tick (epic ${epic:-<none>}) via $manifest"

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
  "${HERDR_PLUGIN_ROOT:-$PWD}/../../tk" \
  "$(command -v tk 2>/dev/null || true)" \
  "$HOME/.local/bin/tk" \
  "$HOME/go/bin/tk"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then tk="$candidate"; break; fi
done

if [ -z "$tk" ]; then
  echo "Could not find the 'tk' binary. Pin it once:"
  echo "  echo /absolute/path/to/tk > \"\$(herdr plugin config-dir ${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks})/tk-bin-path\""
  notify "tk not found" "Pin tk in the plugin config dir to reconcile $tick."
  exit 1
fi

cd "$repo" || { echo "Cannot enter $repo"; exit 1; }

# Read-only by construction: no --adopt, ever. Reconcile mutates nothing without
# that flag, and this action must not be the thing that writes a manifest.
if [ -n "$epic" ]; then
  out="$("$tk" herd reconcile --epic "$epic" --json 2>&1)"
else
  out="$("$tk" herd reconcile --json 2>&1)"
fi
status=$?
echo "tk herd reconcile exited $status"
echo "$out"

if [ $status -ne 0 ]; then
  notify "reconcile failed" "$tick: tk herd reconcile exited $status — see herdr plugin log list"
  exit 1
fi

# Extract this tick's item. jq first, python3 second; both emit the same four
# tab-separated fields so the rest of the script does not care which ran.
fields=""
if command -v jq >/dev/null 2>&1; then
  fields="$(printf '%s' "$out" | jq -r --arg t "$tick" '
    (.items[]? | select(.tick == $t)) as $i
    | [$i.class, $i.plan.action, ($i.plan.summary // ""), (($i.plan.argv // []) | join(" "))]
    | @tsv' 2>/dev/null | head -n 1)"
fi
if [ -z "$fields" ] && command -v python3 >/dev/null 2>&1; then
  fields="$(printf '%s' "$out" | python3 -c '
import json, sys
tick = sys.argv[1]
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for item in doc.get("items", []):
    if item.get("tick") == tick:
        plan = item.get("plan", {})
        print("\t".join([
            item.get("class", ""),
            plan.get("action", ""),
            plan.get("summary", ""),
            " ".join(plan.get("argv") or []),
        ]))
        break
' "$tick" 2>/dev/null | head -n 1)"
fi

if [ -z "$fields" ]; then
  echo "Could not extract $tick from the reconcile plan (no jq and no python3, or the tick is not in this plan)."
  notify "reconcile plan ready" "$tick: read the full plan in herdr plugin log list"
  exit 0
fi

class="$(printf '%s' "$fields" | cut -f1)"
action="$(printf '%s' "$fields" | cut -f2)"
summary="$(printf '%s' "$fields" | cut -f3)"
argv="$(printf '%s' "$fields" | cut -f4)"

# One line per class saying what the ORCHESTRATOR does next. The wording is
# deliberately imperative about who acts: never this action.
case "$class" in
  live-worker)
    advice="Worker is ALIVE — continue it (tk herd wait). Do NOT redispatch." ;;
  dead-worker-resumable)
    advice="Dead but resumable — orchestrator resumes under a fresh agent name." ;;
  dead-with-work)
    advice="Dead with commits — orchestrator redispatches FROM THE BRANCH, never a second worker." ;;
  stale-no-work)
    advice="Stale, no commits — orchestrator may reset (remove workspace, delete branch)." ;;
  unknown)
    advice="Evidence contradicts itself — inspect before touching anything." ;;
  *)
    advice="Unrecognised class; read the plan." ;;
esac

body="$tick"
[ -n "$epic" ] && body="$body · epic $epic"
body="$body · plan: ${action:-?} — $advice"
[ -n "$argv" ] && body="$body · argv: $argv"

echo
echo "class:   $class"
echo "action:  $action"
echo "summary: $summary"
[ -n "$argv" ] && echo "argv:    $argv"
echo "advice:  $advice"
echo "This action changed nothing. Dispatch belongs to the orchestrator."

notify "$class" "$body"
exit 0
