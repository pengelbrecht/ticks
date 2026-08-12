# Spike: mission-control layout restore via `layout.export` / `layout.apply`

*herdr 0.8.0, protocol 19, 2026-08-12 — probed in an isolated named session (`herdr --session tkexp server`), main session untouched. All calls raw-socket (the CLI does not expose the `layout` group).*

## What works

- **`layout.export` (params `{}`)** returns the focused workspace's focused tab as a tree: splits with direction+ratio, panes with `pane_id` + `cwd`, plus `focused_pane_id`/`zoomed`. Per-tab scope — a full "mission control" snapshot is one export per workspace.
- **`layout.apply` (`{root, tab_id}` — `tab_id` XOR `workspace_id`, both is `invalid_target`)** rebuilds the tree. Panes referencing a live `pane_id` are **adopted** (process intact — verified: the adopted pane kept its identity across a scramble/restore cycle); nodes without a live id are **created fresh**.
- **The killer feature: pane nodes accept `command`, `env`, `label`, `cwd`.** An applied node with `command: ["bash","-lc",…]` genuinely launches the process (verified via `pane.process_info`: the command was the live foreground process). So a saved layout can relaunch the dashboard — restore is *shape + processes*, not just shape.
- `layout.set_split_ratio` works with `pane_id` + `ratio` (the `path` form wants a boolean descent vector; `pane_id` is easier).

## Quirks to design around

1. **Apply is rebuild-as-new-tab.** Applying to `w1:t1` produced tab `w1:t2` and retired `t1` (tab ids are never reused). Anything keyed to the old tab id goes stale; adopted panes keep their pane ids.
2. **Apply does not restore the ratio of an adopted tree in place** in all cases — after a ratio scramble, re-applying the saved root left the scrambled ratio in one trial (likely because export-with-`{}` reads the *focused* tab and focus had moved to the new tab). Multi-tab focus semantics need pinning before this is productized.
3. Headless-session panes run processes but render no readable scrollback (`pane.read` empty while `process_info` shows the live process) — evidence needs `process_info`, not reads, in test sessions.

## Verdict

Worth a real tick, with sharpened semantics: a `tk herd layout save/restore` that (a) exports every run-related workspace, (b) enriches the dashboard node with its plugin command + `TICKS_EPIC` env so restore relaunches it, (c) treats apply's new-tab behavior as expected and re-resolves ids afterwards. Demo: `scripts/experiments/mission-control-layout.sh`.
