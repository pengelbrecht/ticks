// Package state persists the per-worker run state a herdr wave produces.
//
// # Why this lives under .tick/logs/
//
// The tracker rule is that `.tick/` is orchestrator-owned: a worker never
// writes there. A herd run-state manifest is not tracker state — it records
// which herdr workspace, pane, worktree and agent session a spawn produced, so
// that a later `tk herd collect` or a fresh session's reconcile can find the
// work again without guessing. It is local, per-machine, disposable, and
// already excluded from git by `.tick/.gitignore` (`logs/`).
//
// That is why exactly one path is written: [Path], i.e.
// `.tick/logs/herd/<epic-id>/<tick-id>.json`. Nothing else under `.tick/` is
// touched by this package, and nothing here writes tracker state — the
// `runner-state:` note stays the orchestrator's job, which is why [NoteLine]
// only renders the text and never runs `tk`.
//
// # Atomicity
//
// [Write] writes to a temporary file in the destination directory and renames
// it into place, so a reader either sees the previous manifest or the complete
// new one — never a half-written JSON document. A crashed write leaves no
// temp file behind.
package state
