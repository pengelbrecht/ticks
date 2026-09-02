# ticfac roadmap: where the extraction stands and what runs where

The architecture for ticfac (execution and orchestration extracted from
ticks) is `docs/projects/2026-09-01-ticfac-architecture/SPEC.md`. This page
records the decisions taken when it was reviewed and filed (2026-09-02), and
how it relates to the earlier factory-extraction project.

## Two projects, one lineage

- **a4n** (`docs/projects/2026-08-27-factory-extraction/`) did the decoupling:
  Phase 1 cut the Go dependency (tk --json), Phase 3 split the credential file,
  Phase 5a cut the last cross-repo edges. Its Phase 5 (5hm, "create ticfac and
  move") was gated on a planning session about what the factory should *be*.
- **hzm** is the outcome of that session: the spec above, filed as eight phase
  epics. Phase 0 was **692** (closed 2026-09-02); Phase 1 is **4ik**. 5hm's four inherited move notes (embedded.go
  bundle pin, required-tk-commands scanner, cloud/worker stays, two binaries
  and `tk cloud` → `ticfac`) are copied onto hzm Phases 1 and 4. Closing
  5hm/krg as superseded is proposed, not done — roadmap changes are Peter's.

## Phase 0 outcome (epic 692, closed 2026-09-02)

Ran under herdr in one day: four waves plus two repair waves, ten implementation
ticks, all closed after integrated gates. What exists now, all under `contracts/`
as bundle **3.0.0** with a Go and a TypeScript reader each:

| Step | Contract | Readers |
|---|---|---|
| 1 tk --json manifest | `tk-json-manifest.json` | `internal/tkcontract`, `cloud/factory/test/tk-json-manifest.test.ts` |
| 2 versioned bundle | `bundle.json` + `CHANGELOG.md` (append-only `version_digests` ledger) | `internal/contracts`, `cloud/factory/scripts/contracts.mjs` |
| 3 Job* / role-result / evidence | `job-protocol.json` | `internal/factory/jobprotocol`, `test/job-protocol.test.ts` |
| 4 cloud compatibility | `cloud/factory/test/phase0-compat.test.ts` (reads worker.sh and wrangler.toml) | — |
| 5 credential ownership | `credential-ownership.json` + `docs/.../credentials.md` (tied by a test) | `internal/factory/credentials`, `test/credential-ownership.test.ts` |
| 6 `.ticfac/` run state + CAS | `ticfac-run-state.json` (7 executable CAS sequences over a git fake) | `internal/factory/runstate`, `test/ticfac-run-state.test.ts` |
| 7 Appendix A invariants | `lifecycle-invariants.json` (13 invariants, fake harness, per-guard negative controls) | `internal/factory/lifecycle`, `test/lifecycle-invariants.test.ts` |

Decisions logged during the run: the evidence record is defined once (nested
provenance, closed) in job-protocol and referenced by run-state; the strict
JSON-Schema subset (`internal/tkcontract/schema.go`, mirrored exactly by
`cloud/factory/test/json-schema.ts`) is the only validator; the manifest
records which SPEC §3.1 commands are not yet published (`tk sandbox … --json`,
`tk ask --json`). Seams the run paid for: two same-wave ticks each cutting the
bundle version (one owner per wave now, see `.tick/learnings.md`); the herd
guard judging a repo-wide frontier (tick t62).

## Decisions made at review time

- **Run state lives in `.ticfac/`, not D1.** Same location and boundary rules
  as `.tick/`, but its own persistence policy: durable means *pushed on
  origin at once*, churn stays on the run branch, the target ref gets the
  terminal record once at publish, the run branch is tagged at terminal state.
  D1 is at most a rebuildable index. Rationale: issue state is few writes,
  many readers, project lifetime; run state is one machine writer, hundreds
  of writes, dies with the run, written from a sandbox that can be wiped.
- **Local hosts before Cloudflare.** Phase 1 reconciler + local subprocess
  executor, Phase 2 Herdr, Phase 3 role jobs and Markdown-loop deletion,
  Phase 4 Cloudflare. Cloud is the hardest host (no tk, wipes, step caps,
  money) and meets the reconciler only once proven. Every phase ends with a
  gate that is a real run.
- **Executor vs runner.** Claude, Codex and Pi are *runners* on one local
  subprocess executor (worktree per attempt, runner launched headless, RESULT
  as completion contract). Herdr is a second executor that adds visibility.
  The interactive session's own subagent tool is not an executor; the session
  is an operator that runs `ticfac run-epic`.
- **ticfac is a separate repository from Phase 1**, not carved out later. The
  Phase 0 contract bundle makes the two-repo release dance cheap; a separate
  repo is the only mechanical proof of the dependency direction.
- **Phase 0 runs entirely in the ticks repo.** The "both repositories" that
  run the contract bundle in Phase 0 are the Go and TypeScript implementations
  already here (tk and cloud/factory). The ticfac repo appears in Phase 1.
- **Credentials are protocol, cost is a credential property.** JobSpec carries
  the grant; `cancel` revokes first; a kill switch is a durable refusal to
  issue. A flat-rate subscription seat has no cost budget and says so.
- **Appendix A** lists thirteen lifecycle invariants earned from live runs;
  Phase 0 makes them a conformance suite that every executor must pass —
  shipped in bundle `2.1.0` as `contracts/lifecycle-invariants.json`, run
  against a fake harness so it exists before the reconciler does
  ([[lifecycle-invariants-suite]]).

See also: [[factory-ticks-boundary]], [[cross-language-contracts]],
[[credential-split]], [[local-worker-durability]],
[[lifecycle-invariants-suite]].
