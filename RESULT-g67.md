# RESULT-g67

Branch: `tick/g67`

## Summary

Added `tk skills install <name> [--dir PATH] [--force]` and
`tk skills diff <name> [--dir PATH]` to the existing `tk skills` group
(list/get were added by tick qvm).

## Files changed

- `internal/skills/install.go` (new): `Install(name, dir, force)`,
  `DefaultDir(name)` (`~/.claude/skills/<name>`), `ReadStamp(dir)`,
  `Stamp` struct, `StampFile` const (`.tk-skills-version`, JSON-encoded:
  skill/version/installed_at), `ErrUnmanaged`.
- `internal/skills/diff.go` (new): `DiffDir(name, dir)` → `InstallDiff`
  (Added/Removed/Changed file lists + StampVersion/BundleVersion), with
  `OK()` and `String()`.
- `cmd/tk/cmd/skills_install.go` (new): `tk skills install` command.
- `cmd/tk/cmd/skills_diff.go` (new): `tk skills diff` command.
- `cmd/tk/cmd/root.go`: added the three new flag vars to `ResetFlags()`.
- `cmd/tk/main.go`: added the two new subcommands to the `printUsage()`
  "Skill Bundle" block (no legacy-switch change needed — `skills` was
  already routed as a group by tick qvm; `CommandNames()`/
  `TestLegacyDispatchCoversAllCobraCommands` only checks top-level command
  names, and `skills` already covers it).

## Tests added

- `internal/skills/install_test.go`: fresh install writes tree + stamp;
  install into an existing *empty* dir needs no stamp; upgrade over a
  stamped dir succeeds and drops leftover files not in the new bundle;
  refusal on a non-empty unmanaged dir (content untouched, wraps
  `ErrUnmanaged`); `--force` (well, `force=true`) overrides the refusal and
  drops the old content; unknown skill errors; `DefaultDir` convention.
- `internal/skills/diff_test.go`: identical-after-install is `OK()`;
  editing a file is reported in `Changed`; removing/adding a file is
  reported in `Removed`/`Added`; a version-only mismatch (stamp version !=
  bundle version, all files byte-identical) is still reported as drift;
  missing target dir is an error, not drift; unknown skill errors; a
  stamp-removed (unmanaged) dir reports drift even with identical bytes.
- `cmd/tk/cmd/skills_install_test.go` / `skills_diff_test.go`: same
  scenarios through the CLI (`ExecuteArgs`/`captureStdoutArgs`), checking
  exit codes (`ExitNotFound`=4 for unknown skill, `ExitUsage`=2 for the
  unmanaged refusal, `ExitGeneric`=1 for diff drift, 0 for identical), and
  a flags-reset-across-executions test per each new command's flag set.
  Every cmd-layer test passes `--dir` pointing at a `t.TempDir()` — none
  ever touch the real `~/.claude`.

## Design notes for the next reader

- **Stamp file**: `.tk-skills-version` at the root of the installed
  directory, JSON: `{"skill":..., "version":..., "installed_at":...}`.
  It's excluded from `DiffDir`'s Added/Removed/Changed comparison (it's
  metadata, not bundle content).
- **"Unmanaged" definition**: a *non-empty* existing directory with no
  stamp file is unmanaged and refused without `--force`. An *empty*
  existing directory (e.g. one a caller already created, like
  `t.TempDir()`) is treated the same as a nonexistent one — nothing to
  lose, so no stamp is required. This was a judgment call; the tick text
  only said "refuses to overwrite a directory that has no stamp" without
  addressing the empty case explicitly.
- **Swap semantics**: write full tree + stamp to a temp dir created
  alongside the target (`os.MkdirTemp(parent, base+".tk-tmp-*")`), then
  `os.RemoveAll(target)` (if it existed) followed by `os.Rename(tmp,
  target)`. This is atomic-ish, not atomic — there's a window between the
  RemoveAll and the Rename where the target path doesn't exist. Documented
  in both the `Install` doc comment and the `install` command's `--help`
  text. Nothing from the old tree is preserved, even on a stamped upgrade
  (a hand-added extra file under a stamped dir is silently dropped on
  upgrade — covered by `TestInstallUpgradesStampedDirAndDropsExtras`).
- **`diff` drift definition**: `OK()` requires *both* zero
  added/removed/changed files *and* a non-empty stamp version equal to the
  binary's bundle version. So a byte-identical directory whose stamp
  predates the current binary version is still reported as drift (exit 1)
  — this is intentional per the tick's "stamp version vs binary version"
  requirement and is covered by `TestDiffDirVersionMismatchAloneIsDrift` /
  `TestSkillsDiffVersionMismatchExitsOne`.
- Reused `skills.Paths`/`skills.Read`/`skills.Version` from the qvm tick;
  did not touch or reuse `internal/skills/verify.go`'s `Verify`/`Drift` —
  those compare a *repo checkout* (`root/skills/<name>/...`) against the
  whole bundle for CI/freshness purposes, a different shape than a single
  installed skill directory (`dir` = the skill root itself, no `skills/`
  or `<name>/` prefix). `DiffDir`/`InstallDiff` are new, parallel types for
  the install-target shape rather than a refactor of `Verify`.

## Verification run

- `go build ./...` — clean
- `gofmt -l .` — no output
- `go vet ./...` — clean
- `go test -short -count=1 ./...` — all packages `ok` (including
  `internal/skills`, `cmd/tk`, `cmd/tk/cmd`)

STATUS: DONE
