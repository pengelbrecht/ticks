# herdr-ticks — Ticks mission control

A [herdr](https://herdr.dev) plugin that surfaces [Ticks](https://ticks.sh) issue tracking
inside the multiplexer: a mission-control dashboard pane and actions that reach the tick
board without leaving herdr.

Requires herdr **0.8.0+**. macOS and Linux.

## Status

Scaffold. What ships today:

| Section | Id | State |
| --- | --- | --- |
| `[[panes]]` | `dashboard` | **Working** — launches `tk herd dashboard`, the live read-only run board |
| `[[actions]]` | `open-tick-board` | **Working** — finds/opens the `tk board` web UI |
| `[[events]]` | `workspace.renamed` | Inert no-op — shape template for tick `sku` |

## Install

```sh
herdr plugin install pengelbrecht/ticks/plugins/herdr-ticks
```

(The plugin lives in a subdirectory of the `ticks` repo, hence the
`owner/repo/subdir` form.)

## Development

Work against the checkout directly — no install, no copy:

```sh
# Link the working tree (absolute path required)
herdr plugin link /abs/path/to/ticks/plugins/herdr-ticks

# Confirm herdr parsed the manifest
herdr plugin list --plugin pengelbrecht.herdr-ticks --json

# Exercise the action
herdr plugin action list --plugin pengelbrecht.herdr-ticks
herdr plugin action invoke open-tick-board --plugin pengelbrecht.herdr-ticks

# Read what the command actually printed (stdout/stderr/exit code)
herdr plugin log list

# Open / close the dashboard pane. Note: the pane is chosen with --entrypoint (the
# [[panes]] id), and `close` takes the herdr PANE id from the open result, not the
# entrypoint id.
herdr plugin pane open --plugin pengelbrecht.herdr-ticks --entrypoint dashboard
herdr plugin pane close <pane-id>

# Done
herdr plugin unlink pengelbrecht.herdr-ticks
```

There is no hot reload: after editing `herdr-plugin.toml`, `unlink` and `link` again.
Script edits take effect on the next invocation without re-linking.

A manifest error fails the `link` loudly with a `plugin_manifest_parse_failed` error
naming the offending line — if `link` returns a plugin object, the manifest parsed.

## Manifest schema notes

Verified live against herdr 0.8.0. See the comments in `herdr-plugin.toml` for the
authoritative list; the load-bearing ones:

- Top-level `id` is reported as `plugin_id` by `herdr plugin list --json`.
- `command` is an **argv array** — no shell. Pipelines and conditionals go in `scripts/`.
- `contexts` is a closed enum: `global`, `workspace`, `tab`, `pane`, `selection`.
- `placement` is a closed enum: `overlay`, `popup`, `split`, `tab`, `zoomed`. (The
  `herdr plugin pane open --placement` flag accepts a narrower set — no `popup`.)
- `events.on` is **not** validated — a typo parses fine and silently never fires.
- Action ids must be unique across the whole manifest, even across `platforms` gates.

## Runtime environment

herdr runs every plugin command with **cwd = the plugin root**, so relative script paths
resolve, but the cwd tells you nothing about the user's repo. Read the context instead:

| Variable | Contents |
| --- | --- |
| `HERDR_PLUGIN_CONTEXT_JSON` | JSON: `workspace_id`/`workspace_label`/`workspace_cwd`, `worktree` (`repo_root`, `repo_name`, `checkout_path`, `is_linked_worktree`, `repo_key`), `tab_id`/`tab_label`, `focused_pane_id`/`focused_pane_cwd`/`focused_pane_agent`/`focused_pane_status`, `invocation_source`, `correlation_id` |
| `HERDR_PLUGIN_ID` | `pengelbrecht.herdr-ticks` |
| `HERDR_PLUGIN_ACTION_ID` | The invoked action id (actions only) |
| `HERDR_PLUGIN_ROOT` | This directory |
| `HERDR_PLUGIN_CONFIG_DIR` | `~/.config/herdr/plugins/config/<plugin_id>` (also `herdr plugin config-dir <id>`) |
| `HERDR_PLUGIN_STATE_DIR` | `~/.local/state/herdr/plugins/<plugin_id>` |
| `HERDR_SOCKET_PATH`, `HERDR_BIN_PATH` | For calling back into herdr |
| `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, `HERDR_PANE_ID` | Ids of the invoking context |

`scripts/open-tick-board.sh` resolves its target repo as
`worktree.repo_root` → `focused_pane_cwd` → `workspace_cwd` → `$PWD`.

## Layout

```
plugins/herdr-ticks/
  herdr-plugin.toml              manifest
  README.md                      this file
  scripts/
    dashboard.sh                 [[panes]] dashboard — launches `tk herd dashboard`
    open-tick-board.sh           [[actions]] open-tick-board
    events-noop.sh               [[events]] inert template for tick sku
```
