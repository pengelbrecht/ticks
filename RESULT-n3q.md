# RESULT n3q — Final review of the Phase 3 diff

Branch: `tick/n3q` (HEAD at `826c8a5b`, on top of `4223eaba`/`a8y` — the split
implementation + its migration evidence, both already merged).

Review-only tick. No source changes were made — every check below either
confirms the design bar was met, or surfaces a finding routed below rather
than fixed in place (out of scope for a review tick, and each is small).
Working tree is clean (`git status --porcelain` empty); nothing to commit.

## 1. Is the coupling actually zero? — CONFIRMED, independently

Grepped the whole tree myself, not the diff's narrative.

- `grep -rl "ticfacrc\|factory_\|KeyFactory" --include="*.go" .` — every
  production (non-`_test.go`) hit lives in `internal/factory/**`,
  `internal/gatewaytrace/**`, `internal/cloud/lease/lease.go` (a plain error
  *string* naming the file for the operator, no parse/import), or
  `cmd/tk/cmd/{cloud,factory}*.go`.
- Walked every file in `cmd/tk/cmd/*.go` **excluding** the
  `cloud*.go`/`factory*.go` wrappers and grepped each for
  `internal/factory`: zero production files. The only hits are three test
  files (`migration_e2e_test.go`, `offline_answer_test.go`,
  `board_keys_test.go`) that exist specifically to *prove* the boundary or to
  compare UI keybindings — not production coupling.
- `cmd/tk/cmd/ask.go` and `answer.go`: zero references to `credentials`,
  `factory`, `ticksrc`, or `ticfacrc` at all.
- `cmd/tk/cmd/upgrade.go`: zero references either — the spec's "Phase 3
  decisions" section flagged this file as a pre-existing `tk`-side reach into
  factory state (`KeyFactoryURL`/`KeyFactoryVersion` for the staleness
  warning); git log shows tick `10l` already moved that into `tk factory
  status` before this epic reached me, and grep confirms it stayed moved.
- `internal/gatewaytrace` *does* import `internal/factory/credentials` and
  enumerates `KeyGatewayURL`/`KeyCloudflareAPIToken`, and it is *not*
  physically under `internal/factory/`. On its own this looks like exactly
  the "coupling wearing a namespace" pattern the task description warns
  about. I checked its reachability: its only importers are
  `cmd/tk/cmd/cloud_trace.go`, `cmd/tk/cmd/factory_dashboard.go` and
  `internal/factory/dashboard/snapshot.go` — all three already
  factory-scoped. The design spec (`docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md`,
  "Phase 3 decisions") explicitly names `internal/gatewaytrace` alongside
  `internal/factory` as one of `internal/ticksrc`'s pre-split "real
  consumers... every one of them factory" — so this is a deliberate,
  documented categorization (a factory-scoped package that happens to live
  outside the `internal/factory/` directory for its own reasons), not an
  accidental leak. No new tick needed; noting it here because it was the one
  place independent grep disagreed with the "everything's under
  `internal/factory`" mental model before I traced the reachability.
- `go vet ./...`: clean.

**Verdict: zero coupling confirmed.** No package outside
`internal/factory`/`internal/gatewaytrace`/factory-scoped `cmd` files
enumerates a factory key, names the factory, or knows it has a version.

## 2. Is the migration safe on a real file? — EXERCISED BY HAND, CONFIRMED SAFE

Built the real binary (`make build` → `./bin/tk`) and drove
`tk factory status --offline` (which calls `factory.LoadCredentials()`, the
real migration path) against hand-built 0600 fixtures in scratch `$HOME`
dirs. All runs used the real binary, real files, real `os.Rename`.

| Case | Result |
|---|---|
| Populated `~/.ticksrc` (7 `factory_*` keys + board `token=`/`url=` + a comment) | Migrated correctly: `.ticfacrc` got exactly the 7 factory keys; `.ticksrc` kept `token=`, `url=`, the comment, dropped the factory lines; both files ended at `0600`; stderr printed the one-line move notice |
| Same fixture, run **twice** | 2nd run: no "Moved" message, `tk factory status` output byte-identical, files' MD5 unchanged — true no-op |
| `~/.ticksrc` with **no** `factory_*` keys | True no-op: `.ticksrc` byte-identical after, `.ticfacrc` never created |
| **No** `~/.ticksrc` at all (fresh machine) | No files created, no error, `tk factory status` reports "No factory is configured" |
| Already-migrated machine (`.ticfacrc` populated, no `.ticksrc`) | `.ticfacrc` read and reported correctly, untouched; no `.ticksrc` created |
| Simulated crash-between-writes: `.ticfacrc` already has a **rotated** `factory_token` not present in `.ticksrc`, plus `.ticksrc` still carries the **stale** old `factory_token` and a not-yet-migrated `factory_url` | Rotated value in `.ticfacrc` was **not clobbered**; the still-missing `factory_url` was copied; `.ticksrc`'s factory lines drained. Confirms the "never overwrite a value already present" invariant on a real file, not just in the unit test |
| `~/.ticksrc` at loose `0644` perms with a factory key | After migration: **both** `.ticksrc` and `.ticfacrc` end at `0600` — permissions are tightened, not merely preserved |

I could not contrive a true mid-write OS-level kill (the writes are too small
to land mid-`rename`), so I built the closest real equivalent instead: started
a run from the *file state* a crash between the two writes would leave
behind (new file already holding a value the old file hasn't caught up to)
and confirmed the merge logic resumes correctly from that state on the real
binary. The existing `TestMigrationResumesAfterACrashBetweenTheTwoWrites` in
`internal/factory/migrate_test.go` covers the same scenario at the unit level
and passes.

**Verdict: the migration is safe.** Idempotent, resumable, never clobbers a
rotated value, tightens rather than trusts existing permissions, and a
no-factory-keys or already-migrated file is a true no-op (nothing read beyond
one stat+read, nothing written).

## 3. Did the duplicate parser get resolved, or relabelled? — RESOLVED BY ELIMINATION (a documented decision, not a comment)

`internal/tickboard/cloud/client.go` still has its own hand-rolled
`readConfigFile()` for `~/.ticksrc` (`token=`/`url=`, plus a legacy
bare-first-line-is-token fallback `internal/factory/credentials` deliberately
does **not** replicate) and still does not import
`internal/factory/credentials` or anything under `internal/factory`.

This is not an oversight. The spec's "Phase 3 decisions §C" explicitly
decided **not** to converge or share a parser: `internal/ticksrc` (the
generic engine that used to serve both) is deleted outright (§B) — grep
confirmed zero production call sites read `KeyToken`/`KeyURL` through it
before the split, so there was nothing to converge. What remains is "two
files, two shapes, two owners, one reader each," and the doc records the one
real behavioral divergence (the bare-line convention) so it isn't silently
lost. `repo-wiki/credential-split.md` documents the same shape and reasons.
I independently confirmed on disk: `internal/ticksrc` does not exist as a
package anywhere in the tree, and `client.go`'s reader is unchanged and still
the sole reader of `~/.ticksrc`'s board keys.

**Verdict: separation, not relabelling.** The duplication is resolved by
elimination of the shared engine, backed by a decision doc and a
divergence-preserving test (`TestPreSplitMachine_BoardSyncStillWorksAfterMigration`,
green).

## 4. Is the Phase 4b escape hatch now structurally impossible? — YES, verified two ways

- **Static**: `cmd/tk/cmd/ask.go` and `answer.go` have zero references to
  `credentials`, `factory`, `ticksrc`, or `ticfacrc`. There is no
  `factoryOperatorChannel()`-style fallback left to read from; the import
  simply isn't there for a future command to reach through "by habit" without
  the compiler and the reviewer both noticing a new `internal/factory` import
  landing in a file that has never had one.
- **Dynamic**: `cmd/tk/cmd/offline_answer_test.go`'s
  `TestOfflineParkResolveNotifiesAgent` populates *both* a live-looking
  pre-split `~/.ticksrc` *and* a post-split `~/.ticfacrc` with a factory URL
  and bearer token, installs an `http.DefaultTransport` that fails and counts
  any request, and drives `tk ask` → `tk list --awaiting` → `tk answer`
  through the real command path. Asserts zero network calls. I ran this test
  fresh (`-count=1`) and it passes.

**Verdict: structurally impossible, not merely absent.** A future command
would have to add a new, visible `internal/factory` import to reach a factory
token — the same class of accidental one-fallback-away reachability that
caused the original Phase 4b incident no longer exists in `tk ask`/`answer`.

## Tests run

- `go test ./...` — real exit code captured before any pipe/filter (per
  `.tick/learnings.md`'s gate warning): **0**, 41/41 testable packages `ok`,
  0 `FAIL`.
- Targeted re-run with `-count=1 -v` of every migration/offline/pre-split
  test in `internal/factory` and `cmd/tk/cmd`: all pass fresh, not from
  cache.
- `go vet ./...`: clean.
- Manual migration exercises above used the real `./bin/tk` built via
  `make build` (gitignored `bin/`, not committed).

## Findings routed (not fixed in this tick — review-only)

1. **`docs/factory-credentials.md` gives operator-facing instructions that no
   longer work.** It still says the local mirror is `~/.ticksrc` (lines ~19,
   49, 58–61, 162) and tells an operator who wants to drop the local copy to
   "delete the `factory_github_token` and `factory_gateway_key` lines from
   `~/.ticksrc`" — that file no longer holds those keys post-split, so
   following this doc by hand silently does nothing. `repo-wiki/credential-split.md`
   already tracks this as a known-stale doc "explicitly deferred to the next
   tick per the `elt` design," listing `docs/factory-credentials.md`,
   `README.md`, `CHANGELOG.md`, `docs/design/cloud-factory.md`,
   `cloud/factory/README.md`, `cloud/DOMAIN_SETUP.md`, and
   `skills/ticks/references/tk-commands.md`. Recommend a small follow-up tick
   before Phase 5 (the relocation) to fix these — the `factory-credentials.md`
   case in particular is worse than "stale" since it names an action that no
   longer does what it says.

No other findings — everything else the task asked me to check came back
clean on independent verification.

STATUS: DONE
