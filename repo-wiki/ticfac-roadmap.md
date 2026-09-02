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
  epics. Phase 0 is **692**. 5hm's four inherited move notes (embedded.go
  bundle pin, required-tk-commands scanner, cloud/worker stays, two binaries
  and `tk cloud` → `ticfac`) are copied onto hzm Phases 1 and 4. Closing
  5hm/krg as superseded is proposed, not done — roadmap changes are Peter's.

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
  Phase 0 makes them a conformance suite that every executor must pass.

See also: [[factory-ticks-boundary]], [[cross-language-contracts]],
[[credential-split]], [[local-worker-durability]].
