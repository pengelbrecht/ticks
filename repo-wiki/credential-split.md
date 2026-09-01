# The credential split: ~/.ticksrc vs ~/.ticfacrc

Decided in tick `elt`, implemented in tick `0oa` (2026-08-31). Supersedes the
"30 `KeyFactory*` constants in `~/.ticksrc`" description in
`factory-ticks-boundary.md` and `phase-2-live-verification.md`, which describe
the pre-split state.

## Current shape

- **`~/.ticksrc`** (0600) — board sync only (`token=`, `url=`), owned solely
  by `internal/tickboard/cloud/client.go`'s own hand-rolled reader
  (`readConfigFile()`). `internal/ticksrc` (the package) no longer exists —
  deleted, not deprecated.
- **`~/.ticfacrc`** (0600) — every factory credential (fifteen `factory_*`
  keys, on-disk spelling unchanged), owned solely by
  `internal/factory/credentials` (`credentials.File`, `credentials.Key*`).
  Nothing outside `internal/factory` and `cmd/tk/cmd/{cloud,factory}*.go`
  imports this package.

Two files, two shapes, two owners, one reader each. No shared parser package
between them — `internal/factory` relocates whole in a later phase, and Go
forbids an external module importing another module's `internal/`, so a
shared package would just be a dependency edge that phase has to cut again.
The ~90 lines of file-mechanics (line-oriented, atomic temp+rename, 0600,
Get/Set/Save) are duplicated once rather than shared.

## Migration: `factory.LoadCredentials()`

Every factory-credential-touching command (`tk factory setup/deploy/status`,
`tk cloud …`, `tk factory dashboard`) calls `factory.LoadCredentials()`
instead of `credentials.Load()` directly. On every invocation it:

1. Scans `~/.ticksrc` for `factory_*`-prefixed lines (plain string scan, no
   parser needed).
2. Copies each one `~/.ticfacrc` doesn't already have a value for — verbatim,
   same key spelling, so a crash-resumed copy can't clobber a value rotated
   after a prior partial migration.
3. If any were found: saves `~/.ticfacrc`, then rewrites `~/.ticksrc` with
   every `factory_*` line stripped (comments, `token=`, `url=`, any other
   line preserved verbatim), then prints a one-line stderr notice — only when
   something was actually copied this run, not on a resumed drain of
   already-migrated leftovers.
4. If none were found (fresh install, or migration already complete):
   true no-op, nothing read beyond the stat+read of `~/.ticksrc`, nothing
   written, nothing printed.

Implementation: `internal/factory/migrate.go`. Resumable from a crash between
its two writes — see `TestMigrationResumesAfterACrashBetweenTheTwoWrites` in
`internal/factory/migrate_test.go`.

## Why not a namespaced API served from ticks

Rejected explicitly in tick `elt`'s decision (see the spec doc). The prior
incident: `tk ask`/`tk answer` — plain terminal commands — silently read
`~/.ticksrc` and made live HTTPS calls to a deployed factory, because a
fallback chain found the file was reachable. A namespaced API "that refuses
to define factory keys" still hands out factory-scoped values from ticks
code on request — same reachability, just less visibly. Physical separation
(a different file, a package nothing outside `internal/factory` imports)
makes the leak structurally impossible instead of merely undocumented.
`cmd/tk/cmd/offline_answer_test.go`'s `TestOfflineParkResolveNotifiesAgent`
guards this for both the legacy and post-split file shapes.

## Known-stale docs (not fixed by tick `0oa` — explicitly deferred to the
## next tick per the `elt` design)

`docs/factory-credentials.md`, `README.md`, `CHANGELOG.md`,
`docs/design/cloud-factory.md`, `cloud/factory/README.md`,
`cloud/DOMAIN_SETUP.md`, and `skills/ticks/references/tk-commands.md` all
still say `~/.ticksrc` where they mean the factory credential file. Fix them
to say `~/.ticfacrc` and link this page.
