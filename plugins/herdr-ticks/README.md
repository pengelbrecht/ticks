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
| `[[actions]]` | `open-worktree` | **Working** — splits a shell into the right-clicked worker's worktree |
| `[[actions]]` | `collect-tick` | **Working** — `tk herd collect`, verdict raised as a notification |
| `[[actions]]` | `retry-tick` | **Working, advisory** — `tk herd reconcile` classification; dispatches nothing |
| `[[actions]]` | `open-tick-dashboard` | **Working** — dashboard scoped to a tick's epic; also the link-handler target |
| `[[link_handlers]]` | `ticks-tick-ref` | **Working for `ticks://` URLs**; bare tick ids are not clickable — see below |
| `[[events]]` | 5 hooks → `paint-hook.sh` | **Working** — badges herd workspaces with tick id, role and status |

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

`herdr plugin action invoke` takes **no context flags**: it builds the invocation
context from the workspace/pane that is FOCUSED when the request lands, and
ignores `HERDR_PANE_ID`/`HERDR_WORKSPACE_ID` in the caller's environment
(measured — an invoke with those set reported the focused workspace instead).
To exercise an action against a specific worker, focus that workspace, invoke,
and focus back. `invoke` returns `running` immediately; only
`herdr plugin log list` shows what the command printed and its exit code.

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
| `HERDR_PLUGIN_CLICKED_URL` | The clicked URL (link handlers only; also in the context as `clicked_url`) |
| `HERDR_PLUGIN_LINK_HANDLER_ID` | The link handler that matched (also in the context as `link_handler_id`) |
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
    action-open-worktree.sh      [[actions]] open-worktree
    action-collect-tick.sh       [[actions]] collect-tick
    action-retry-tick.sh         [[actions]] retry-tick (advisory)
    action-open-tick-dashboard.sh  [[actions]] open-tick-dashboard + [[link_handlers]] target
    events-noop.sh               [[events]] inert template for tick sku
    paint-hook.sh                [[events]] runs `tk herd paint` on the badge-relevant events
```

## Herd-worker actions

Three context-menu entries act on the herd worker the operator right-clicked.

| Action | What it runs | Mutates |
| --- | --- | --- |
| **Open worktree** | `herdr pane split --pane <worker pane> --cwd <worktree> --no-focus` | nothing — a plain shell, split into the worker's own workspace |
| **Collect tick** | `tk herd collect <tick> --epic <epic> --json`, verdict → `herdr notification show` (title = the verdict, sound none) | nothing — collect never merges and never writes `.tick` |
| **Retry tick** | `tk herd reconcile --epic <epic> --json`, this tick's class → notification | **nothing, deliberately** |

### How an action knows WHICH worker

`HERDR_PLUGIN_CONTEXT_JSON` names the invocation target — `workspace_id`,
`focused_pane_id`, `worktree.repo_root`. The run-state manifests `tk herd spawn`
writes to `.tick/logs/herd/<epic>/<tick>.json` record `pane_id` and
`workspace_id` for every worker. Matching one against the other maps the click
onto a tick; the pane id is tried first because it is exact, then the workspace
id, because a right-click on the workspace strip carries no pane.

The manifests live in the **controller** checkout, and herdr reports
`worktree.repo_root` as the main repository even for a worker's linked worktree —
so `repo_root` is exactly where to look. A workspace herdr does not recognise as
a repo checkout reports no `worktree` block at all, hence the
`repo_root` → `workspace_cwd` → `focused_pane_cwd` ladder. On a pane with no
matching manifest every action prints why and exits 0: a menu entry that shouts
at an ordinary pane is worse than one that quietly says "not a herd worker".

### Why "Retry tick" does not retry

Reconcile's contract is that **one actor decides**. Its five classes exist
because a crashed orchestrator leaves *live* workers behind, and the one
unforgivable move is starting a second worker for a tick that already has one — a
branch with no commits is exactly what a worker that has not committed yet looks
like. A right-click that could redispatch would be a second actor mutating the
run, racing the orchestrator that owns dispatch. So the action reports the
classification and the exact next move (continue / resume + argv /
redispatch-from-branch / reset / inspect), and stops. The action description says
so where the operator reads it.

## Link handling is URL-only

Verified live against herdr 0.8.0, not assumed:

- A link handler is handed a **clicked URL**: the manifest field is `pattern`,
  the context field is `clicked_url`, the env var is
  `HERDR_PLUGIN_CLICKED_URL`, and handlers fire on **Ctrl-click** of a link
  herdr's terminal already recognises (plain left-click is not routed to
  plugins).
- `pattern` is **not** validated for URL shape. A `pattern = "^[0-9a-z]{3}$"`
  links cleanly, with no warning, and appears verbatim in
  `herdr plugin list --json` — and can then never fire, because the string it
  is matched against is a clicked URL that a bare word never becomes. This is
  the same trap as `events.on`: it parses, it links, it is silent forever.
- There is no socket method to invoke a link handler either
  (`herdr api schema --json` exposes only `plugin.link/unlink/enable/disable/list`),
  so nothing outside the UI can simulate a click.

So bare tick ids in pane text **cannot** be made clickable today. The registered
fallback is a URL form ticks can actually print:

```text
ticks://<tick>            e.g. ticks://5yt
ticks://<epic>/<tick>     e.g. ticks://zz0/5yt
```

Ctrl-clicking one opens the mission-control dashboard scoped to that tick's epic
(the epic is resolved from the manifest directory when the reference omits it).
`scripts/action-open-tick-dashboard.sh` already parses a bare id as well, so when
herdr grows non-URL link patterns only the `pattern` in the manifest changes.

The dashboard pane is opened with `--env TICKS_REPO=<controller repo>` and
`--env TICKS_EPIC=<epic>`. `scripts/dashboard.sh` honours `TICKS_REPO` today;
until it also forwards `TICKS_EPIC` to `tk herd dashboard --epic`, a link click
opens the dashboard on the right repository showing **every** epic instead of
one — degraded, never broken.

## Etiquette: explicit targets, always

**The user may be focused anywhere.** They jump between sessions constantly, and
the focused workspace is never a safe implicit target — a pane opened "here"
lands in whatever unrelated repo they happened to be looking at.

Measured live during this plugin's own verification: `herdr plugin pane open`
with no `--target-pane`/`--workspace` opened a Ticks dashboard in an unrelated
workspace, because a plugin command runs asynchronously and focus had moved
between the invocation and the command.

The rules every script here follows, and every new one must:

- `plugin pane open` always pins `--target-pane <pane>` (or `--workspace <id>`),
  derived from `HERDR_PLUGIN_CONTEXT_JSON` or from the manifest. With neither
  available the script **refuses to open anything** rather than fall back to
  focus.
- `pane split` always pins `--pane <id>` — for a worker action, the worker's own
  pane out of the manifest, so the split lands in the worker's workspace.
- Everything passes `--no-focus`. Nothing in this plugin moves the operator's
  cursor.
- The same applies while testing: verify against workspaces and panes the run
  itself created, and close them afterwards.

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
