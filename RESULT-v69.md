# RESULT — tick v69: Embedded skills bundle (root embed package + internal/skills)

Branch: `tick/v69`
Base: contains integration commit `8baf8a292a8d0d0c70c8d38acaa9ab6236b443d0` (verified with
`git merge-base --is-ancestor`).

## Files changed

New files only — no `cmd/` changes, no changes under `skills/`.

- `embedded.go` (new, module-root package `ticks`) — `//go:embed all:skills` + `SkillsFS() embed.FS`.
- `internal/skills/doc.go` — package doc, including the honest embed-freshness reasoning.
- `internal/skills/skills.go` — `List`, `Files`, `Read`, `Paths`, `Version`, `SetVersion`.
- `internal/skills/verify.go` — `Verify(root string) (Drift, error)`, `Drift` + `OK()`/`String()`.
- `internal/skills/skills_test.go` — tests (below).

## API (what the next ticks consume)

```go
skills.List() []string                      // ["ticks"], sorted; auto-picks up new skills/<name>/
skills.Files(name) (fs.FS, error)           // rooted AT the skill: "SKILL.md", "references/x.md"
skills.Read(name, path) ([]byte, error)     // path traversal / unknown skill / missing file => error
skills.Paths(name) ([]string, error)        // sorted file list, slash-separated, skill-relative
skills.Version() string                     // "dev" until SetVersion
skills.SetVersion(v string)                 // "" resets to "dev"
skills.Verify(root string) (Drift, error)   // root CONTAINS skills/; paths are "ticks/SKILL.md"
```

`Drift{Checked, Missing, Extra, Differing}`; `OK()` true when identical; `String()` renders a
summary for both the clean and drifted case.

## Decisions worth knowing

**Embed lives at the module root, embedding `skills` (not `skills/ticks`).** A `go:embed` path
can't escape its package dir, so the root was the only option (module root had no `.go` file
before; it does now, package `ticks`, importable as `github.com/pengelbrecht/ticks`). Embedding
the whole `skills/` dir rather than `skills/ticks` means a second skill added later is picked up
with no code change. `all:` prefix so dot/underscore-prefixed files are not silently dropped.
`go build ./...` and `go vet ./...` are clean with the new root package.

**Version — no second source, but it needs one line of wiring in a later tick.**
`internal/skills` CANNOT import `cmd/tk/cmd`: tick qvm makes `cmd/tk/cmd` import
`internal/skills`, which would be an import cycle. The single source stays `main.Version`
(goreleaser `-X main.Version` in `.goreleaser.yaml`), propagated in via `skills.SetVersion`,
mirroring the existing `cobracmd.SetVersion` pattern. Until it's wired, `Version()` returns
`"dev"`.

> **Action for tick qvm:** add `skills.SetVersion(v)` inside `SetVersion` in
> `cmd/tk/cmd/root.go` (line ~537). That function is already the single funnel — `cmd/tk/main.go`'s
> `init()` calls it with `main.Version` — so one line covers real binaries and in-process command
> tests, with no `main.go` change. `tk skills list` will report `dev` if this is skipped; worth a
> test that asserts the version shown matches `cmd.Version` after `SetVersion`.

**Why there is no "embed freshness" CI guard (and what replaced it).** The tick's own concern was
right: a test comparing the bundle to `skills/` on disk is a tautology — `go test` recompiles the
embed from the very tree it compares against, so it can never fail. That reasoning is written up
in `internal/skills/doc.go`. What actually guarantees a released binary matches its docs is
build-time coupling plus goreleaser building from the tag. In place of the tautological guard:
`TestLoadBearingFilesPresent` asserts each load-bearing file exists with a per-file size floor set
well below current sizes (a truncated/placeholder/empty file trips it; ordinary edits don't churn
it). `TestVerifyRepoTree` still runs Verify against the repo tree, but as a smoke test of Verify's
plumbing — it is labelled as such, not sold as a freshness guard.

## Tests added (`internal/skills/skills_test.go`)

- `TestList` — enumerates `["ticks"]`.
- `TestFilesEnumeratesFullTree` — embedded file list == on-disk `skills/ticks` file list exactly;
  asserts `SKILL.md`, `references/runners-config.schema.json`, and >= 10 `references/*.md`.
- `TestLoadBearingFilesPresent` — 14 files with size floors (see above).
- `TestPaths`, `TestReadMatchesDisk`, `TestUnknownSkill` (unknown skill, missing file, `../` traversal).
- `TestVersionDefaultsToDev` — default, round-trip, empty-resets-to-dev.
- `TestVerifyRepoTree` — clean result against the repo tree.
- `TestVerifyDetectsDrift` — temp copy of `skills/`, then three injected drifts (changed / removed /
  added file), each asserted into the right `Drift` bucket, plus a missing-root error case.

Drift tests were mutation-checked: blinding `Verify`'s comparison loop makes the changed-file and
missing-file subtests fail, so they genuinely fire.

## Verification

- `gofmt -l embedded.go internal/skills` — clean
- `go vet ./...` — clean
- `go build ./...` — OK
- `go test -short -count=1 ./...` — **exit 0**, whole repo green, incl.
  `ok github.com/pengelbrecht/ticks/internal/skills` (and `internal/worktree` passed locally).

No build artifacts produced; `git status` shows only the new source files. `.gitignore` needed no change.

## Notes for the epic

- Nothing under `skills/` or `cmd/` was touched, per boundaries.
- I did not write to `repo-wiki/` — parallel workers editing shared wiki pages conflict at merge.
  The two facts worth capturing there are the root-embed constraint and the version-wiring funnel;
  both are documented in `embedded.go` / `internal/skills/doc.go` and repeated above.
- For tick g67 (`tk skills diff` against an INSTALLED tree): `Verify` expects a root that *contains*
  `skills/`, so it is not the right primitive for a single installed skill dir like
  `~/.claude/skills/ticks`. Build that comparison on `Paths()` + `Read()` (or add a sibling
  `VerifySkill(name, dir)` in `internal/skills`) rather than bending `Verify`.

STATUS: DONE
