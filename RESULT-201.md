<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/72y/201`, base `436dd1c04af1ef9990dd1721938fc2d33b4019ab`, harness `omp` exited 0, 1 work commit(s), 0 uncommitted path(s)._

STATUS: PASS

Fixed tick 201: herd dashboard now scrolls to follow the cursor instead of
truncating the epic list.

## Root cause
`Model.render` always drew `body()` from line 0 while the cursor (`j`/`k`/`g`/`G`)
could move into rows that were never rendered, silently dropping epics and ticks
beyond the terminal height.

## Change
- `internal/herd/dashboard/model.go`
  - Added `boardScroll int` field.
  - Added `scrollCursorIntoView()`: pins the selected row's body line into the
    visible window; wired into `handleKey` for `j`/`k`/`g`/`G` and into the
    `SnapshotMsg` reload path after `clampCursor()`.
  - Added `clampBoardScroll()`: bounds `boardScroll` against the windowed board.
- `internal/herd/dashboard/view.go`
  - `boardLines()` now returns `(lines, cursorLines)` so cursor rows map to body
    lines (matching `rows()` ordering: epic headers then ticks, skipping
    decorations).
  - `render()` windows `boardLines()[start:end]` via `boardScroll` +
    `boardBudget()`/`boardWindow()`.
  - Replaced the "resize to see them" truncation hint with a scroll hint
    ("… N more lines (j/k to scroll)").
  - `body()` removed (had no remaining callers).

## Tests
- Added `TestBoardScrollsToFollowCursor`: `g` reaches the first epic, `G` reaches
  the last epic and its last tick, `k` scrolls back up.
- Added `TestNewTickReachableWithoutResize`: a tick created under the last epic
  is reachable via `j` without resizing.
- Added `tallBoard()` helper (single-tick epics + a final epic with many ticks).

`go test ./internal/herd/dashboard -count=1` passes (full package, 4.7s).
`go vet ./internal/herd/...` clean.

## Commit
`2a1fc51` on `tick/72y/201` — source and tests only.