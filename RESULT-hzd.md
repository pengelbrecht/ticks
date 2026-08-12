# RESULT — tick hzd

Branch: `tick/hzd`

## Base verification

`git merge-base --is-ancestor 4b507eb7181135068dc5d4e0259102340022267b HEAD` — OK, integration commit present.

## Spec correction applied mid-turn

The user corrected the task description live: the second convention directory is
**`.agents/skills`** (plural "agents"), not `.agent/skills` as the tick text said. I had
already implemented the singular form; renamed everywhere (detection logic, error
messages, help text, README, all tests) before committing. Verified with a final
`grep -rn '\.agent\b'` sweep across `cmd/tk`, `internal/skills`, `README.md` — zero hits.
Detection targets are exactly `<repo-root>/.claude/skills/` and
`<repo-root>/.agents/skills/`.

## What changed

- `internal/skills/conventions.go` (new): `ConventionSubdirs = [".claude/skills",
  ".agents/skills"]` and `DetectConventionDirs(root)`, which stats each convention
  subdir under root and returns the ones that exist as directories, in stable order.
  Read-only — never creates anything. Tested in `internal/skills/conventions_test.go`
  (neither/claude-only/agent-only/both/non-dir-ignored).
- `cmd/tk/cmd/skills_targets.go` (new): `resolveSkillsTargets(name, dirFlag)` — the
  shared install/diff target resolver. `--dir` bypasses detection entirely (unchanged
  behavior). Otherwise it resolves the repo root via the existing package-level
  `repoRoot()` (from `cmd/tk/cmd/init.go`, reused rather than duplicated) and returns one
  target per detected convention dir, each joined with the skill name. Neither
  convention present, or not inside a repo, is `NewExitError(ExitGeneric, ...)` — exit 1,
  per the tick ("exit 4 semantics are wrong here — use 1"). The two error messages both
  name `.claude/skills/` and `.agents/skills/` and the `--dir` escape; the outside-repo
  variant additionally says "not inside a git repository".
- `cmd/tk/cmd/skills_install.go`: `runSkillsInstall` now loops over
  `resolveSkillsTargets(...)` and installs into every target, continuing past a
  per-target failure rather than aborting on the first one. Per-target outcome (success
  or refusal) is printed to stdout, one line each. If every failure was
  `skills.ErrUnmanaged`, the aggregated exit is `ExitUsage` (2); any other failure
  upgrades it to `ExitGeneric` (1). `--force` and the atomic-swap install path are
  unchanged — they still apply per target, exactly as the existing `internal/skills`
  `Install` already did.
- `cmd/tk/cmd/skills_diff.go`: `runSkillsDiff` loops the same way; each target's
  `DiffDir` report prints (prefixed with its path when there's more than one target,
  unprefixed — byte-identical to the old single-target output — when there's exactly
  one, so the pre-existing single-`--dir` tests didn't need touching). Overall exit is 1
  if any target drifts, 0 only if every target is clean.
- Help text (`Long`/flag descriptions) in both commands, `cmd/tk/main.go`'s usage
  printout, and the README's Skills section + the `Skill (Claude Code / Codex)`
  quickstart were updated to describe detection-first behavior. README edits were kept
  to the sentence + flag rows + a short quickstart caveat, per the tick's "minimal" ask.
- `skills.DefaultDir` (the old `~/.claude/skills/<name>` resolver) is untouched and
  still has its own passing unit test, but the cmd layer no longer calls it — the human
  decision recorded in the tick has no home-directory fallback in the default path,
  only the `--dir` escape hatch (which can still point at `~/.claude/skills/<name>` for
  a user-level install, and the quickstart now shows that explicitly).

## Tests added

- `internal/skills/conventions_test.go`: 5 tests for `DetectConventionDirs` (neither,
  claude-only, agent-only, both — order preserved — and a file-not-dir edge case).
- `cmd/tk/cmd/skills_detection_test.go`: 12 tests covering every acceptance-criteria
  cell — claude-only install, agent-only install, both (each independently stamped and
  diffable), neither → error naming both conventions + `--dir`, outside-a-repo → error
  mentioning "repository", per-target unmanaged refusal (managed target installs,
  unmanaged target refused, exit == `ExitUsage`), `--dir` bypassing detection for both
  install and diff, diff detecting both targets independently, and diff's aggregate
  exit-1-if-any-drifts contract.
- All pre-existing `skills_install_test.go` / `skills_diff_test.go` tests pass unchanged
  (they all pass `--dir` explicitly, so none touch detection).

## Verification run

- `go build ./...` — clean.
- `gofmt -l .` — no output.
- `go vet ./...` — clean.
- `go test -short -count=1 ./...` — full suite green (exit 0, no FAIL), run twice (once
  before, once after the `.agent`→`.agents` rename) per `.tick/config.md`.

## Notes for the next tick / reviewer

- `repo-wiki/herd-helper-cli.md` line 39 still says `.agent/skills` (singular) in a
  design-decision note it recorded earlier in this epic — now stale after the user's
  live correction. I left it alone since it's outside this tick's file scope
  (`cmd/tk/cmd/skills*.go` + `internal/skills` + README), but it should be corrected to
  `.agents/skills` so the wiki doesn't contradict the shipped behavior.
- No new cobra subcommands were added (install/diff already existed), so no
  `cmd/tk/main.go` legacy-switch registration or `ResetFlags()` changes were needed —
  no new persistent flag vars were introduced either.

STATUS: DONE
