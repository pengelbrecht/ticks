#!/usr/bin/env bash
# "Open worktree" action for the herdr-ticks plugin.
#
# Right-click a herd worker's workspace or pane and get a plain shell sitting in
# THAT worker's worktree, split into the worker's own workspace, without stealing
# focus. Nothing is sent to the agent and nothing in .tick is touched.
#
# How the target worker is found — this is the whole trick, and it is the same in
# all three action-*.sh scripts:
#
#   HERDR_PLUGIN_CONTEXT_JSON names the invocation target (workspace_id,
#   focused_pane_id, worktree.repo_root, …). The run-state manifests written by
#   `tk herd spawn` — .tick/logs/herd/<epic>/<tick>.json — record `pane_id` and
#   `workspace_id` for every worker. Matching one against the other maps
#   "the thing the operator right-clicked" onto "the tick".
#
#   The manifests live in the CONTROLLER checkout, and herdr reports
#   `worktree.repo_root` as the main repository even for a worker's linked
#   worktree — so repo_root is exactly the right place to look.
#
# herdr runs plugin commands with cwd = the plugin root, so nothing here may be
# derived from $PWD. See README.md for the full env contract.
set -uo pipefail

ctx="${HERDR_PLUGIN_CONTEXT_JSON:-}"

# Pull a string field out of the context JSON without requiring jq. The context
# is one flat-ish document; the first match for a key is the one we want.
ctx_field() {
  local key="$1"
  [ -n "$ctx" ] || return 0
  printf '%s' "$ctx" |
    sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

# Pull a string field out of a run-state manifest. `tk herd spawn` writes them
# with json.MarshalIndent, so every field is on its own line.
mf_field() {
  sed -n "s/^[[:space:]]*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1
}

repo="${TICKS_REPO:-}"
[ -n "$repo" ] || repo="$(ctx_field repo_root)"
[ -n "$repo" ] || repo="$(ctx_field workspace_cwd)"
[ -n "$repo" ] || repo="$(ctx_field focused_pane_cwd)"

pane="$(ctx_field focused_pane_id)"
[ -n "$pane" ] || pane="${HERDR_PANE_ID:-}"
workspace="$(ctx_field workspace_id)"
[ -n "$workspace" ] || workspace="${HERDR_WORKSPACE_ID:-}"

echo "Open worktree — repo: ${repo:-<unknown>} pane: ${pane:-<none>} workspace: ${workspace:-<none>}"

if [ -z "$repo" ] || [ ! -d "$repo/.tick/logs/herd" ]; then
  echo "No herd run state in ${repo:-<unknown>} (.tick/logs/herd is missing)."
  echo "This action only works on a workspace or pane that belongs to a herd worker."
  exit 0
fi

# Match the invocation target against the manifests: the pane id first, because
# it is exact, then the workspace id, because a right-click on the workspace
# strip carries no pane.
manifest=""
if [ -n "$pane" ]; then
  for f in "$repo"/.tick/logs/herd/*/*.json; do
    [ -f "$f" ] || continue
    if [ "$(mf_field "$f" pane_id)" = "$pane" ]; then
      manifest="$f"
      break
    fi
  done
fi
if [ -z "$manifest" ] && [ -n "$workspace" ]; then
  for f in "$repo"/.tick/logs/herd/*/*.json; do
    [ -f "$f" ] || continue
    if [ "$(mf_field "$f" workspace_id)" = "$workspace" ]; then
      manifest="$f"
      break
    fi
  done
fi

if [ -z "$manifest" ]; then
  echo "No herd worker matches this pane/workspace — nothing to open."
  echo "(Manifests searched: $repo/.tick/logs/herd/*/*.json)"
  exit 0
fi

tick="$(mf_field "$manifest" tick)"
worktree="$(mf_field "$manifest" worktree)"
target_pane="$(mf_field "$manifest" pane_id)"
echo "Matched tick $tick via $manifest"

if [ -z "$worktree" ] || [ ! -d "$worktree" ]; then
  echo "Worker $tick has no live worktree at '${worktree:-<empty>}' — it may already be cleaned up."
  exit 0
fi

herdr="${HERDR_BIN_PATH:-}"
[ -n "$herdr" ] || herdr="$(command -v herdr 2>/dev/null || true)"
if [ -z "$herdr" ] || [ ! -x "$herdr" ]; then
  echo "No usable 'herdr' binary (HERDR_BIN_PATH unset and none on PATH) — cannot split."
  exit 1
fi

# Split the WORKER's pane, so the new shell lands in the worker's own workspace,
# and --no-focus so the operator's cursor stays where it was. `--cwd` is the
# worktree path herdr itself chose at spawn time, read from the manifest and
# never re-derived.
split_target="${target_pane:-$pane}"
echo "Splitting pane $split_target with cwd $worktree (no focus)"
out="$("$herdr" pane split --pane "$split_target" --cwd "$worktree" --direction down --no-focus 2>&1)"
status=$?
echo "$out"
if [ $status -ne 0 ]; then
  echo "herdr pane split failed (exit $status)."
  exit 1
fi
echo "Opened a shell in $worktree for tick $tick."
