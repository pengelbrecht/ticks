# RESULT-qvm

Branch: `tick/qvm`

## Summary

Implemented `tk skills list` and `tk skills get <name> [--full] [--json]`, consuming
`internal/skills` (the previous tick's embedded-bundle API). Both registered as cobra
commands under a new `skills` parent, plus in main.go's legacy dispatch switch and usage
text, per `.tick/learnings.md` "This repo's build".

## Files changed

- `cmd/tk/cmd/skills.go` — new parent `skills` command.
- `cmd/tk/cmd/skills_list.go` — `tk skills list [--json]`: prints each embedded skill name
  and `internal/skills.Version()`; `--json` emits `{"version":..., "skills":[...]}`.
- `cmd/tk/cmd/skills_get.go` — `tk skills get <name> [--full] [--json]`: prints SKILL.md by
  default; `--full` prints SKILL.md then every other file in the skill (its `references/`
  files), each preceded by a `--- <path> ---` separator line — matches the format
  `agent-browser skills get core --full` uses (verified live against the installed
  `agent-browser` binary: blank line, `--- references/<file> ---`, blank line, content).
  Unknown skill returns `NewExitError(ExitNotFound, ...)` (exit 4, typed via `ExitError`,
  never a `GetExitCode` substring). `--json` emits `{"name":..., "files":[{"path","content"}...]}`.
- `cmd/tk/cmd/skills_test.go` — new tests (see below).
- `cmd/tk/cmd/root.go` —
  - `SetVersion` now also calls `skills.SetVersion(v)`, so `tk skills list`'s reported
    version tracks the real tk build version instead of always reporting `"dev"`. This
    wiring didn't exist yet; `internal/skills/doc.go` calls it out as expected but says it
    "cannot import cmd/tk/cmd" — the propagation has to happen from this side.
  - `ResetFlags()` gained resets for `skillsListJSON`, `skillsGetFull`, `skillsGetJSON`.
- `cmd/tk/main.go` — added `"skills"` to the legacy dispatch switch, to the update-check
  skip list (it's a local, offline, no-repo-needed command like `version`/`snippet`), to the
  top-level commands list, and a new "Skill Bundle:" usage section.
- `cmd/tk/cmd/multi_blocker_test.go` — **bug fix**, not scope creep: the shared
  `captureStdoutArgs` test helper only started draining the `os.Pipe()` after the command
  under test finished. `tk skills get <name> --full` writes ~300KB (the whole `skills/ticks`
  tree) to stdout in one command, which exceeds the OS pipe buffer (~64KB on macOS) and
  deadlocked the test process — confirmed live: the test hung for 5+ minutes at near-zero
  CPU before I killed it and diagnosed it. Fixed by draining the pipe in a goroutine
  concurrently with the command run. This is a latent bug that would bite any future test
  with large output, not something specific to my two new command files, so I fixed it in
  place rather than routing around it (per the repo's "surface and fix pre-existing
  problems" convention) — it was in the direct path of getting my own tests green.

## Tests added (cmd/tk/cmd/skills_test.go)

- `TestSkillsListShowsSkillsAndVersion` — human output contains `"ticks"` and the version
  set via `SetVersion`.
- `TestSkillsListJSON` — `--json` shape has `version` and `skills` containing `"ticks"`.
- `TestSkillsGetPrintsSkillMD` — `tk skills get ticks` output is byte-for-byte SKILL.md.
- `TestSkillsGetFullContainsEveryFileOnce` — `--full` output starts with SKILL.md content,
  and every other file in `skills.Paths("ticks")` appears exactly once with its
  `--- path ---` header exactly once.
- `TestSkillsGetUnknownSkillExitsNotFound` — `GetExitCode` == `ExitNotFound` (4).
- `TestSkillsGetUsageErrorExitsUsage` — missing positional arg == `ExitUsage` (2), distinct
  from the not-found case.
- `TestSkillsFlagsResetAcrossExecutions` — `--full`/`--json` on `get` and `--json` on `list`
  don't leak into the next in-process `ExecuteArgs` call.

## Test evidence

- `gofmt -l cmd internal` — clean, no output.
- `go vet ./...` — clean, no output.
- `go build ./...` — clean.
- `go test -short -count=1 ./cmd/tk/cmd/... -run 'Skills' -v` — all 7 new tests PASS.
- `go test -short -count=1 ./...` — full suite green, exit 0 (all packages `ok`, no
  failures); confirmed by reading the command's own exit code directly (not through a
  pipeline), per `.tick/learnings.md` "Orchestrator gates".
- `TestLegacyDispatchCoversAllCobraCommands` (cmd/tk/main_test.go) — passes, includes a
  `skills` subtest.

## Notes for the next tick / reviewer

- Only one skill (`ticks`) is embedded today, so `list`'s multi-skill behavior and `get`'s
  per-file separator on a skill with several `references/` files are exercised, but a
  second embedded skill would give more real-world signal on `list`'s formatting.
- `skills.Paths(name)` returns paths sorted with `SKILL.md` first purely because `'S' <
  'r'` in ASCII; `skills_get.go`'s `collectSkillFiles` does **not** rely on that — it
  explicitly separates `SKILL.md` from the rest so the ordering guarantee doesn't depend on
  filename casing.
- The `captureStdoutArgs` fix in `multi_blocker_test.go` is a real behavior change to a
  shared helper other test files also use (`board_test.go`, `after_test.go` do not use it,
  but several others do) — it only makes the helper strictly more correct (concurrent drain
  instead of drain-after-close), so it shouldn't affect any existing passing test, and the
  full suite run above confirms that.

STATUS: DONE
