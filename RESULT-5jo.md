<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/72y/5jo`, base `802e8df024d4b0303bc36313d2c0312c527eee56`, harness `omp` exited 0, 1 work commit(s), 0 uncommitted path(s)._

# Tick 5jo — herd agent names collide across repos

Branch: `tick/72y/5jo` (integration commit `802e8df024d4b0303bc36313d2c0312c527eee56`, verified ancestor).

## What changed

Agent names are now repo-qualified: `tick-<repo>-<id>`, where `<repo>` is a
12-rune slug of the origin-remote basename (or checkout dir) plus a 6-hex-char
SHA-256 of the canonical repo root. The hash makes same-named checkouts
distinct; the slug keeps `herd ps` readable. A full name plus `-r99` respawn
suffix stays inside herdr's 32-char `[a-z][a-z0-9_-]{0,31}` budget.

- `internal/herd/spawn/reponame.go` (new): `RepoName(repoRoot)` — origin URL
  basename, dir-basename fallback, slug to `[a-z0-9-]`, cap at 12 runes,
  append 6-char hash. Empty root is an error.
- `internal/herd/spawn/spawn.go`: `AgentName(repo, tickID)` now joins the
  qualifier and tick id.
- `cmd/tk/cmd/herd_spawn.go`: derives the qualifier via `spawn.RepoName(root)`
  and passes it to `spawn.AgentName`; the manifest records the qualified name.
- `internal/herd/cleanup/cleanup.go`: `liveWorker(agents, recorded)` matches by
  the recorded manifest agent via `reconcile.IsWorkerOf` (exact or numeric
  respawn) — the tick-id-derived name-shape fallback is gone.
- `internal/herd/relay/relay.go`: `tickIDFromAgent` parses the tick id as the
  final base-name segment, so legacy `tick-<id>` and qualified
  `tick-<repo>-<id>` both work, as do respawns.

Reconcile and `IsWorkerOf`/`FreshAgentName` needed no code change: they already
match on the recorded manifest agent, which is now qualified at spawn.

## Tests

- `internal/herd/spawn/reponame_test.go` (new): origin URL, dir fallback,
  uniqueness of same-named checkouts, determinism, empty-root error, respawn
  budget, slug sanitisation.
- `internal/herd/spawn/spawn_test.go`: `AgentName` new shape.
- `internal/herd/cleanup/cleanup_test.go`: qualified-name respawn match;
  foreign-repo same-tick-id worker is NOT matched.
- `internal/herd/reconcile/reconcile_test.go`: foreign-repo same-tick-id worker
  is never adopted (`Class != live-worker`, no live agent).
- `internal/herd/relay/relay_test.go`: qualified and respawned qualified names.
- `cmd/tk/cmd/herd_spawn_test.go`: end-to-end manifest/note assert the
  qualified agent name.

`go test ./...` is green (all packages; `cmd/tk/cmd` 31.5s, `sandbox` 87s).
`go vet` clean on the touched packages; `gofmt` applied.

## Notes for next tick

- A worker's `-r<N>` respawn keeps the qualifier, so reconcile/cleanup matching
  stays within one repo.
- Legacy unqualified manifests (from before this fix) are no longer matched by
  cleanup's fallback; such stale manifests will refuse to be cleaned only if a
  live agent happens to share the old shape — acceptable, and the recorded name
  is the authority going forward.

STATUS: DONE