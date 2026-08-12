#!/usr/bin/env bash
# "Open tick dashboard" — the [[link_handlers]] target, and a right-click action
# in its own right.
#
# Given a tick id it opens the mission-control dashboard pane ([[panes]]
# `dashboard`, owned by scripts/dashboard.sh) scoped to that tick's epic.
#
# Where the tick id comes from, in order:
#
#   1. $TICKS_TICK                   explicit override (how this is smoke-tested;
#                                    link clicks cannot be simulated over the API)
#   2. $HERDR_PLUGIN_CLICKED_URL     set by herdr when a registered link handler
#      / context `clicked_url`       fires. See the URL-ONLY note below.
#   3. the invoked pane/workspace    matched against the run-state manifests,
#                                    same as the other action-*.sh scripts
#
# URL-ONLY, and why the registered pattern is `ticks://…`
# ------------------------------------------------------
# herdr 0.8.0 hands a link handler a *clicked URL*: the manifest field is
# `pattern`, the context field is `clicked_url`, the env var is
# `HERDR_PLUGIN_CLICKED_URL`, and handlers fire on Ctrl-click of a link herdr's
# terminal has already recognised. A bare `5yt` in pane output is not a link, so
# no pattern — however permissive — can make herdr offer it. There is also no
# socket method to invoke a link handler, so nothing outside the UI can force it.
#
# The honest consequence: this plugin registers `ticks://<epic>/<tick>` and
# `ticks://<tick>`, which ARE clickable URL forms, and anything printing tick
# references into a pane can emit them. Bare tick ids stay unclickable until
# herdr grows non-URL link patterns. The parser below still accepts a bare id,
# so the day that changes, only the manifest pattern needs editing.
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
  "$herdr" notification show "$1" --body "$2" --sound none >/dev/null 2>&1 || true
}

repo="${TICKS_REPO:-}"
[ -n "$repo" ] || repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"

pane="$(ctx_field focused_pane_id)"
[ -n "$pane" ] || pane="${HERDR_PANE_ID:-}"
workspace="$(ctx_field workspace_id)"
[ -n "$workspace" ] || workspace="${HERDR_WORKSPACE_ID:-}"

clicked="${HERDR_PLUGIN_CLICKED_URL:-}"
[ -n "$clicked" ] || clicked="$(ctx_field clicked_url)"

echo "Open tick dashboard — repo: ${repo:-<unknown>} clicked: ${clicked:-<none>}"

tick="${TICKS_TICK:-}"
epic="${TICKS_EPIC:-}"

# Parse a clicked reference. Accepts ticks://<tick>, ticks://<epic>/<tick>, and
# a bare id (unreachable today — see the URL-ONLY note above — but harmless).
if [ -z "$tick" ] && [ -n "$clicked" ]; then
  ref="${clicked#ticks://}"
  ref="${ref%%[?#]*}"
  ref="${ref%/}"
  case "$ref" in
    */*)
      epic="${ref%%/*}"
      tick="${ref##*/}"
      ;;
    *)
      tick="$ref"
      ;;
  esac
fi

# No link, no override: fall back to the pane/workspace the operator invoked
# this on, exactly like the other actions.
if [ -z "$tick" ] && [ -n "$repo" ] && [ -d "$repo/.tick/logs/herd" ]; then
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
  if [ -n "$manifest" ]; then
    tick="$(mf_field "$manifest" tick)"
    [ -n "$epic" ] || epic="$(mf_field "$manifest" epic)"
    # The manifest records the worker's own pane, which is a better target than
    # anything else when the invocation carried only a workspace — see the
    # target resolution below for why a PANE specifically is required.
    [ -n "$pane" ] || pane="$(mf_field "$manifest" pane_id)"
  fi
fi

if [ -z "$tick" ]; then
  echo "No tick id: no ticks:// link, no TICKS_TICK, and no herd worker on this pane/workspace."
  exit 0
fi

if [ -z "$repo" ]; then
  echo "Could not resolve a repository from the invocation context."
  exit 0
fi

# Resolve the epic from the run state when the reference did not carry one: the
# manifest directory IS the epic id.
if [ -z "$epic" ] && [ -d "$repo/.tick/logs/herd" ]; then
  for f in "$repo"/.tick/logs/herd/*/"$tick".json; do
    [ -f "$f" ] || continue
    d="$(dirname "$f")"
    epic="$(basename "$d")"
    [ "$epic" = "no-epic" ] && epic=""
    break
  done
fi

echo "Tick $tick → epic ${epic:-<all epics>} in $repo"

if [ -z "$herdr" ] || [ ! -x "$herdr" ]; then
  echo "No usable 'herdr' binary — cannot open the dashboard pane."
  exit 1
fi

# The dashboard pane is scripts/dashboard.sh, which reads TICKS_REPO. TICKS_EPIC
# narrows it to one epic (`tk herd dashboard --epic`); a dashboard.sh that does
# not yet forward TICKS_EPIC simply shows every epic — degraded, never broken.
#
# --target-pane is NOT optional, for two independent reasons.
#
# ETIQUETTE: `plugin pane open` with no target opens the pane in whatever
# workspace happens to be FOCUSED at the moment the SERVER runs the command,
# which is not necessarily the one the link was clicked in — a plugin command
# runs asynchronously and focus can move in between (measured live). Pinning is
# what keeps the dashboard beside the tick reference the operator clicked.
#
# AND IT IS A HARD API REQUIREMENT for this pane. The `dashboard` entrypoint is
# `placement = "split"`, and herdr 0.8.0 refuses a split or zoomed plugin pane
# that is given only a workspace:
#
#   invalid_params: split and zoomed plugin panes target an existing pane;
#                   use target_pane_id
#
# (Measured 2026-08-11, herdr 0.8.0, by scripts/verify-herd-plugin.sh — it is
# what turned this from a silent fallback into a refusal.) So a `--workspace`
# fallback is not a degraded path, it is a guaranteed failure: a split has to
# split SOMETHING. When the invocation carries no pane, resolve one inside the
# target workspace rather than pretending a workspace will do.
if [ -z "$pane" ] && [ -n "$workspace" ] && [ -n "$herdr" ] && [ -x "$herdr" ]; then
  pane="$("$herdr" pane list 2>/dev/null |
    sed -n 's/.*"pane_id"[[:space:]]*:[[:space:]]*"\('"$workspace"':[^"]*\)".*/\1/p' |
    head -n 1)"
  [ -n "$pane" ] && echo "No pane in the invocation context — splitting $pane, the first pane of workspace $workspace"
fi

if [ -z "$pane" ]; then
  # No pinnable pane means the only remaining behaviour is "wherever the user
  # happens to be looking", and that is never acceptable: the operator may be
  # in an unrelated repo's workspace. Refusing is the correct answer.
  echo "No pane in the invocation context and none resolvable from workspace"
  echo "${workspace:-<none>} — refusing to open a pane into whatever workspace is"
  echo "focused. Nothing was opened."
  exit 0
fi

set -- plugin pane open \
  --plugin "${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks}" \
  --entrypoint dashboard \
  --env "TICKS_REPO=$repo" \
  --target-pane "$pane" \
  --no-focus
[ -n "$epic" ] && set -- "$@" --env "TICKS_EPIC=$epic"

out="$("$herdr" "$@" 2>&1)"
status=$?
echo "$out"
if [ $status -ne 0 ]; then
  echo "herdr plugin pane open failed (exit $status)."
  notify "dashboard failed" "$tick: could not open the ticks dashboard pane"
  exit 1
fi
echo "Opened the ticks dashboard for ${epic:+epic $epic, }tick $tick."
exit 0
