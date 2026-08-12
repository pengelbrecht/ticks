# RESULT-4dm

Branch: `tick/4dm`
Base ancestor check: passed (`git merge-base --is-ancestor fb5f4034e65a687bd333ff739f38ae914dfafff3 HEAD`).

## What changed

`internal/herd/dashboard` only (as scoped — did not touch `cmd/`, `plugins/`, or other herd packages):

- **`fswatch.go` (new)** — `FSWatcher` type. Watches `.tick/issues` and
  `.tick/logs/herd` (plus each existing epic subdirectory under it) with
  `github.com/fsnotify/fsnotify`, using the same package `internal/tickboard/server/server.go`
  already uses for the web board. On a relevant event it starts/resets a
  500ms trailing debounce timer (`DefaultFSDebounce`); when it fires it calls
  `emit(ReloadMsg{})` — **not** a new message type — so it feeds the exact
  same reload path `Watcher`'s stream-death recovery already uses. Dot-prefixed
  files (`.notify-state.json`, and `internal/herd/state.Write`'s
  `.`+tick+`.json.*` temp names) and non-dot `.tmp`-bearing temp names
  (`internal/tick.Store`'s `id.RANDOM.tmp` convention) are filtered by
  `relevantFSEvent` before they ever reach the debounce. A `Create` event for
  a new directory directly under `.tick/logs/herd` triggers `fsw.Add` on it,
  so a newly spawned epic's manifest directory is watched without waiting for
  the 30s safety re-list. Any failure (watcher creation, no watchable
  directories, a later fsnotify error) is reported via `FSWatchMsg{Up, Err}`
  rather than panicking or blocking.
- **`model.go`** — `Model` now owns an `*FSWatcher` built with
  `NewFSWatcher(cfg.RepoRoot, watcher.emit)` — it hands the herdr `Watcher`'s
  own (unexported, same-package) `emit` method to the fs watcher, so fsnotify
  events and herdr's pushed events land on the *one* channel the model
  already drains with `m.watcher.Next()`. No second polling loop, no second
  `tea.Cmd`. `Init` starts it alongside the herdr watcher; `Close` stops it.
  A new `Update` case for `FSWatchMsg` records/clears `m.fsWatchErr` and
  re-arms `m.watcher.Next()` like every other message on that channel.
- **`view.go`** — header's `problems` line now also surfaces
  `"fswatch: <err>"` when `m.fsWatchErr != nil`, next to the existing
  `load:`/`herdr:` notes.
- **`doc.go`** — added a "Tracker changes have no herdr event" section
  explaining why `FSWatcher` exists and that it shares `ReloadMsg` with the
  herdr recovery path rather than inventing a second mechanism.
- **Tests**: `fswatch_test.go` (new) drives a real `FSWatcher` against a real
  temp repo + real fsnotify (same convention as `watch_test.go` against
  `herdtest`, not synthetic messages) — one write → one debounced reload;
  a burst of 5 writes → one reload; dot-prefixed + `.tmp`-suffixed writes
  produce no reload; a manifest written into a brand-new epic directory is
  still picked up; a repo with no `.tick` at all degrades
  (`FSWatchMsg{Up:false}`) without hanging. `model_test.go` adds
  `TestFSWatchErrorIsRenderedAndTickerStillReloads` (header note appears/clears,
  and the safety ticker still produces a reload command while fswatch is
  down) and extends `TestEventMessagesReArmTheWatcher` to cover `FSWatchMsg`.

## Verification

- `gofmt -l .` — clean.
- `go vet ./...` — clean.
- `go build ./...` — clean.
- `go test -short -count=1 ./internal/herd/dashboard/...` — all pass (including race: `go test -race -short -count=1 ./internal/herd/dashboard/...`).
- `go test -short -count=1 ./...` (full suite, real exit code checked) — green
  on the second run. The first full-suite run had one failure,
  `internal/tui: TestSmokeGolden`, a teatest golden timing check; it is
  unrelated to this change (`internal/tui` does not import
  `internal/herd/dashboard`, nothing in this diff touches it), and it passed
  reliably both standalone (`go test ./internal/tui/...`, twice) and inside a
  second full-suite run. Consistent with the flaky-golden-under-parallel-load
  pattern already noted in `.tick/learnings.md` — flagging per house rule
  ("don't skip pre-existing problems") but did not chase it since it's
  outside this tick's package boundary and not reproducible in isolation.

## Notes for whoever integrates this

- The dynamic new-epic-directory watch has an inherent small race common to
  any fsnotify-based recursive watch: the directory must be `Add`ed before a
  file written moments later inside it is observed. In practice
  `internal/herd/state.Write` does `MkdirAll` then several syscalls
  (`CreateTemp`, `Write`, `Sync`, `Close`, `Chmod`, `Rename`) before the final
  rename, which is enough window in testing; the 30s safety ticker is the
  backstop if a given filesystem/OS combination is ever slower than that.
- `FSWatcher` doesn't retry watching `.tick/logs/herd` if it doesn't exist
  yet at `Start` (e.g. a dashboard opened before the epic's first spawn) —
  it reports degraded and relies on the safety ticker to eventually surface
  the directory once it appears. Widening this (e.g. also watching `.tick`
  itself for `logs/herd` to appear) would be a straightforward follow-up if
  that scenario turns out to matter in practice; left out here to stay in
  scope.

STATUS: DONE
