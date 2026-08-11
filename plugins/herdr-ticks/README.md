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
| `[[events]]` | 5 hooks → `paint-hook.sh` | **Working** — badges herd workspaces with tick id, role and status |
| `[[events]]` | 1 hook → `notify-hook.sh` | **Working** — chimes when a worker blocks (`request`) or a wave finishes (`done`) |

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
    paint-hook.sh                [[events]] runs `tk herd paint` on the badge-relevant events
    notify-hook.sh               [[events]] runs `tk herd notify` on pane.agent_status_changed
```

## Workspace badges

The event hooks run `tk herd paint`, which reports **display-only** metadata for every
herdr workspace the invoking repo's herd run owns:

| Target | What is painted | herdr method |
| --- | --- | --- |
| the worker's agent pane | title `<tick-id> · <role> · <status>`, a state label for the live agent status, token badges | `pane.report_metadata` |
| the worker's workspace | the same facts as tokens (`TICK`, `ROLE`, `EPIC`, `STATUS`) | `workspace.report_metadata` |

The split is herdr's: a **pane** carries a title, state labels and tokens; a **workspace**
carries **tokens only**. Both are painted from one badge so they cannot disagree.

Three properties make this safe to run on every event:

- **Display-only.** Nothing renames a pane, moves focus, or touches an agent.
- **Sourced.** Every report is namespaced (`tk-herd-paint`), so a paint can only ever
  overwrite this run's own previous paint — never another plugin's.
- **TTL'd** (90s default). Stop painting and herdr drops the badges by itself. There is
  no unpaint step to forget, and a dead run leaves no stale tick ids on the session.

Only workspaces named by the run's own manifests (`.tick/logs/herd/`) are ever painted.
`tk herd paint` reads `.tick/` read-only and never shells out to another `tk`.

`paint-hook.sh` resolves `tk` from `$TK_BIN_PATH`, then
`$HERDR_PLUGIN_CONFIG_DIR/tk-bin-path`, then `PATH`. The middle step matters: **herdr's
server does not inherit your interactive shell's `PATH`**, so a `tk` in `~/.local/bin`
can be installed and still invisible to a hook. Point at it once with

```sh
echo "$(command -v tk)" > "$(herdr plugin config-dir pengelbrecht.herdr-ticks)/tk-bin-path"
```

**The debounce is load-bearing.** Measured live: a `pane.report_metadata` carrying a title
or state labels makes herdr emit `pane.agent_status_changed` for that pane — one of the
hooked events. A paint therefore re-triggers the hook once; the bounce lands within
milliseconds, inside the debounce window, and the loop stops. Do not set
`TICKS_PAINT_DEBOUNCE_SECONDS=0`.

The hook exits 0 and prints why
in any repo with no `.tick/` or no run in flight, and debounces bursts
(`$TICKS_PAINT_DEBOUNCE_SECONDS`, default 2s).

## Notifications

`notify-hook.sh` runs `tk herd notify` on `pane.agent_status_changed`. It raises the two
things in a run a human has to hear about:

| Trigger | Sound | Title |
| --- | --- | --- |
| a herd worker enters `blocked` | `request` | `tick <id> blocked` |
| every in-flight worker of an epic has settled | `done` | `wave complete: <n> workers settled` |

Settled means `idle`, `done` or `blocked`. Blocked counts as settled deliberately: the
wave will not progress without you either way, and a wave whose last worker is stuck on an
approval prompt is exactly when you want to be told — so both chimes can fire at once.

**One transition, one notification.** `notification.show` is not the metadata channel: it
has no TTL, it is not idempotent, and every call is another interruption. So the decision
is edge-triggered against state persisted per epic beside the manifests,

```
.tick/logs/herd/<epic>/.notify-state.json
```

taken under a lock so two concurrent hook invocations cannot both chime. A blocked worker
is announced once and re-armed when it stops being blocked (block → answer → block chimes
twice, which is two requests). A wave completion is announced once and re-armed when a
**new worker manifest** joins — a teardown that shrinks the roster does not re-announce.

That is also what makes the **paint feedback bounce** harmless here rather than something
to debounce away: the bounce re-runs the notifier with the same statuses, so it finds
nothing new and logs why. There is deliberately **no time-window debounce** on this hook —
an elided invocation could be the only one that would have seen a blocked transition,
while an elided *paint* is simply repainted by the next event.

**Focus safety.** `notification.show` carries no pane or workspace target — it is an
overlay herdr renders on the foreground client — so this hook can never open, split or
steal anything in the workspace you happen to be looking at. `position` is left unset so
your own placement preference wins.

Only workers named by the run's own manifests are ever considered, `tk` is resolved the
same way as in `paint-hook.sh`, and the hook exits 0 with an explanation in any repo with
no `.tick/` or no run in flight.
