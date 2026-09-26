---
type: architecture
source: from-chat
covers: [contracts, internal/tkcontract, internal/operator, cmd/tk/cmd/ask.go, cmd/tk/cmd/answer.go]
status: active
---

## Compiled Truth

**ticks is the tracker; ticfac (github.com/pengelbrecht/ticfac) runs epics.**
Decided 2026-09-26 (epic `chz`). Everything that executes work, the sandbox
image, the factory Worker, and the formats only the executor reads live in
ticfac. The hosted ticks.sh board is retired, not moved.

### What stays in ticks

- The tracker: the `.tick/` store and its merge drivers, query, `tk graph`
  (waves as a display of the dependency graph, not a dispatch plan), the TUI,
  the local board (`tk board`), gc, beads import, and the `tk --json` surface.
- Authoring policy: roles (review/close-out), `--requires` / `--awaiting` gates
  including checkpoint, the EPIC-SKELETON convention, and the epic definition
  of done as `[A<n>]` items. These shape the graph; they do not run it.
- The question store: `tk ask` parks a question on a tick and `tk answer`
  settles it from the terminal (`internal/operator` minus any transport).
- The ticks skill (`skills/ticks/`), which covers tracker use and authoring.

### What ticfac owns

Running epics (`ticfac run-epic`), the container image, remote transports for
operator questions, `.tick/runners.toml` (ticfac reads it; ticks does not), and
every contract format that only an executor implements.

### The interface is the `tk` CLI, not a Go API

ticfac reaches ticks by running `tk … --json`, never by importing ticks'
`internal/` packages. Nothing is promoted out of `internal/`: a public Go API is
a permanent promise, and freezing the tracker's internals for one consumer is
what the CLI boundary avoids. The `tk --json` surface is pinned by
`contracts/tk-json-manifest.json` (see [[cross-language-contracts]]).

### Safe deletion order

ticfac builds the `tk` inside its container from a pinned ticks commit and
verifies vendored contracts against pinned commits, so deleting execution code
from ticks main breaks nothing in ticfac. Files removed from ticks are recovered
from history at the commit before the cut.

## Timeline
- 2026-08-27 — boundary mapped and the factory extraction scoped (project `a4n`).
- 2026-09-26 — ownership decided: ticks becomes tracker-only (epic `chz`); the
  ticks.sh board is retired; execution, the sandbox image and the executor
  contracts go to ticfac.
