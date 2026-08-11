#!/usr/bin/env bash
# "Collect tick" action for the herdr-ticks plugin.
#
# Right-click a herd worker's workspace or pane and ask `tk herd collect` what
# that worker actually left behind — commits, RESULT-<tick>.md, boundary — then
# put the verdict on screen as a herdr notification.
#
# `tk herd collect` NEVER merges and never mutates .tick; this action inherits
# that. The verdict is a report, not a decision: integration stays the
# orchestrator's job.
#
# Target resolution is identical in all three action-*.sh scripts:
# HERDR_PLUGIN_CONTEXT_JSON names the invoked workspace/pane, the run-state
# manifests under .tick/logs/herd/<epic>/<tick>.json record pane_id and
# workspace_id, and matching one against the other names the tick.
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

# notify is best-effort: a plugin action that cannot toast is still allowed to
# have done its work, and the full report is on stdout for `herdr plugin log`.
notify() {
  [ -n "$herdr" ] && [ -x "$herdr" ] || return 0
  "$herdr" notification show "$1" --body "$2" --sound none >/dev/null 2>&1 ||
    echo "(notification failed — verdict above is the record)"
}

repo="${TICKS_REPO:-}"
[ -n "$repo" ] || repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"

pane="$(ctx_field focused_pane_id)"
[ -n "$pane" ] || pane="${HERDR_PANE_ID:-}"
workspace="$(ctx_field workspace_id)"
[ -n "$workspace" ] || workspace="${HERDR_WORKSPACE_ID:-}"

echo "Collect tick — repo: ${repo:-<unknown>} pane: ${pane:-<none>} workspace: ${workspace:-<none>}"

if [ -z "$repo" ] || [ ! -d "$repo/.tick/logs/herd" ]; then
  echo "No herd run state in ${repo:-<unknown>} — nothing to collect."
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
  echo "No herd worker matches this pane/workspace — nothing to collect."
  exit 0
fi

tick="$(mf_field "$manifest" tick)"
epic="$(mf_field "$manifest" epic)"
echo "Matched tick $tick (epic ${epic:-<none>}) via $manifest"

# Resolve tk the way every script in this plugin does. herdr's SERVER does not
# inherit the interactive shell's PATH, so the config-dir pin is not optional
# decoration — see paint-hook.sh and README.md.
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
  notify "tk not found" "Pin tk in the plugin config dir to collect $tick."
  exit 1
fi

cd "$repo" || { echo "Cannot enter $repo"; exit 1; }

if [ -n "$epic" ]; then
  out="$("$tk" herd collect "$tick" --epic "$epic" --json 2>&1)"
else
  out="$("$tk" herd collect "$tick" --json 2>&1)"
fi
status=$?
echo "tk herd collect exited $status"
echo "$out"

# Verdict extraction. jq when it is there; otherwise the field is on its own
# line because the report is MarshalIndent'ed, so sed is a faithful fallback.
verdict=""
tick_status=""
commits=""
if command -v jq >/dev/null 2>&1; then
  verdict="$(printf '%s' "$out" | jq -r '.reports[0].verdict // empty' 2>/dev/null)"
  tick_status="$(printf '%s' "$out" | jq -r '.reports[0].status // empty' 2>/dev/null)"
  commits="$(printf '%s' "$out" | jq -r '.reports[0].commits // empty' 2>/dev/null)"
fi
if [ -z "$verdict" ]; then
  verdict="$(printf '%s' "$out" | sed -n 's/.*"verdict"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  tick_status="$(printf '%s' "$out" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
fi

if [ -z "$verdict" ]; then
  # A collect that could not run at all (exit 2/3/4) is still news worth showing.
  echo "No verdict in the collect output."
  notify "collect failed" "$tick: tk herd collect exited $status — see herdr plugin log list"
  exit 1
fi

body="$tick"
[ -n "$epic" ] && body="$body · epic $epic"
[ -n "$tick_status" ] && body="$body · STATUS: $tick_status"
[ -n "$commits" ] && body="$body · $commits commit(s)"

# Title IS the verdict, per the action contract: the operator reads one word and
# knows whether the branch is mergeable.
notify "$verdict" "$body"
echo "Notified: $verdict — $body"
exit 0
