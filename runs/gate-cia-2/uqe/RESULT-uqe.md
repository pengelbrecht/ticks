# uqe — tk self-invocation pays the update check

## What changed

`tk cloud spawn` reads local tracker state by invoking `tk show --json` and
`tk list --all --json` as subprocesses (`cloudTkJSON` in `cmd/tk/cmd/cloud.go`,
via `resolveCloudTkBinary`). Those self-invocations went through the same
`update.CheckPeriodically` path as an interactive user command, paying a
release-feed-shaped check twice per spawn even though the child is reading
local state, not a user checking for upgrades.

Checked for an existing suppression mechanism first (per the tick's ask):
grepped for `TK_NO_`, `TK_DISABLE`, `TK_SKIP`, and all `TK_*` env vars already
read in the repo (`TK_ACTOR`, `TK_JSON_CONTRACT`, `TK_HOME`). None of them
cover this. `resolveCloudTkBinary` already returns an `extraEnv []string` the
caller merges into the child's environment (`cloudTkJSON`), but every call
site passed `nil` — it was an unused hook. Reused that hook rather than adding
a new plumbing path:

- `cmd/tk/cmd/cloud.go`: `resolveCloudTkBinary` now returns
  `[]string{"TK_NO_UPDATE_CHECK=1"}` as `extraEnv` on both return paths
  (self-exe and PATH fallback) — either way the child is tk reading its own
  tracker.
- `cmd/tk/main.go`: `run()` now skips `checkPeriodically` (renamed from a
  direct `update.CheckPeriodically` call to a package var, same seam pattern
  as `cloudTkBinary` in cloud.go, so a test can spy on it) when
  `os.Getenv("TK_NO_UPDATE_CHECK") != ""`.

## Tests

- `cmd/tk/cmd/cloud_tk_test.go`: `TestResolveCloudTkBinarySuppressesUpdateCheck`
  — asserts `resolveCloudTkBinary`'s extraEnv includes `TK_NO_UPDATE_CHECK=1`.
- `cmd/tk/main_test.go`: `TestNoUpdateCheckEnvSkipsCheck` — spies on
  `checkPeriodically` via the new package var, drives `run()` through a real
  init'd repo, and proves the update check runs once without the env var and
  zero additional times with `TK_NO_UPDATE_CHECK=1` set. This is a
  test-first-style regression guard: the check itself is invisible in output
  (it's cached/silent for a "no update" result), so an output-based test would
  not have caught a regression here — spying on the call was the only way to
  make the behavior observable.

Ran, in the foreground:

- `go build ./...` — clean
- `go vet ./...` — clean
- `go test ./cmd/tk/...` — pass, including the two new tests
- `go test ./...` (full suite) — all packages pass

## Scope note

Left `.claude/settings.json` untouched — it showed as locally modified
(repo-wiki hook config) before I started and is unrelated to this tick; not
committed.

## For the next tick

Nothing outstanding. The `extraEnv` hook in `resolveCloudTkBinary` is now
exercised (was previously always `nil`); any future addition to that env
should append to the same slice rather than introducing a second mechanism.

STATUS: DONE
