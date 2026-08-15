# Mission-control board (`tk herd dashboard`, 2026-08-15)

The read-only run board in `internal/herd/dashboard`, rendered into a herdr pane by
`plugins/herdr-ticks`. Three behaviours settled here are easy to re-break, because each one looks
like a harmless simplification.

## Never pin the board to an epic

`tk herd dashboard` with no `--epic` watches **every** epic with run state under
`.tick/logs/herd/`, so an unpinned board follows a multi-epic project run by itself. The run-start
ritual used to pass `--env TICKS_EPIC=<epic>`, which pins it — and the board then shows a
*finished* epic for the rest of the run while workers and panes are live elsewhere. The operator
sees an empty board and concludes the run stalled (field-observed 2026-08-14: the user asked why
the running agents were missing, two epics after the pinned one had closed). `TICKS_EPIC` is for
the deliberate single-epic case, which is what the `ticks://` link handler wants.

## Epic order is activity order, and `done` must not count

`SortEpics` (called at the end of `Loader.Load`): running workers desc → open ticks desc → epic id.

- **Running excludes `idle` and `done`** — herdr's own `client.TerminalStatuses` — and excludes
  `StatusGone`. This is the whole point of the sort. A closed epic keeps its `done` manifests
  until cleanup, so counting them pins finished epics to the top, which is the bug being fixed.
- **`blocked` counts as running.** An agent waiting on a human is the most active thing on the
  board.
- **The id tiebreak is not cosmetic.** The board reloads on a timer *and* on every filesystem
  event, and the cursor is an index into the flattened row list, so a merely-valid ordering would
  reshuffle rows under the cursor between two refreshes that saw identical state.

## Fold state is seeded once per epic, never re-derived

Epics whose ticks are all closed render folded to one line. Epic headers are cursor rows;
`enter` on a header folds/unfolds, `enter` on a tick opens the detail view. `Selected()` returns
false on a header and `SelectedEpic()` is the seam.

`Model.seedEpicDefaults` records the default the first time an epic appears and never revisits it.
Two independent reasons, both discovered by breaking them:

1. An operator's explicit toggle must survive the next refresh, which lands within a second.
2. An epic that closes its **last** tick while being watched must not fold up under the cursor.
   Re-deriving the default on every snapshot did exactly that — the tick left the selection list
   while its detail view was open, and the detail pane rendered "no tick selected". Caught by
   `TestDetailReflectsSnapshotRefresh`.

## Worker rows show the resolved model

`WorkerRow.Model` is the *resolved* capability dimension from the manifest. Empty means "the
kind's own default, never a substituted value", so it renders as an em dash rather than a guessed
name. Kind alone (`claude`) cannot distinguish a haiku worker from an opus one, which is the
entire point of tier routing — and after a cross-vendor tier the kind is the only field that
changes.

## The review phase is invisible here

Review is deliberately not a herd-helper capability, so a reviewer is a harness subagent at the
controller checkout: no pane, absent from `herdr agent list`, absent from this board and from the
badges. An operator watching a run sees the implementers go quiet and then nothing for the length
of a whole-epic diff review. The orchestrator must *say* when it dispatches a review; the board
cannot. See `skills/ticks/references/herdr-runner.md` → Limitations.
