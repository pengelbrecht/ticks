# Proposed Ticks Upgrades

*Implemented on this fork (`mkelk/ticks-melk`, default branch `2026-07-05-synthesis`) and
exercised across four runs of one full-stack brief. A companion analysis document records the
per-run results and forensics in detail; this document is self-contained and states the
proposals and their rationale.*

---

## Executive overview

Ticks operates at the tick level: one tick = one worktree = one mergeable branch, `tk graph`
waves, orchestrator-owned state. Running a delivery campaign on it surfaced two things not yet
covered by the model.

1. **Worktree isolation does not imply a runnable or concurrently-testable tree.** A git
   worktree isolates *source*, but dependency directories are gitignored, so a fresh worktree
   cannot build or test until provisioned; and test tiers that share a singleton (one DB, a
   fixed port, a browser runner) cannot verify concurrently. Without handling this, an
   orchestrator that cannot verify in a worktree falls back to shared-tree sequential
   execution. In the first run this happened without a signal — the git graph was fully linear.
2. **There is no defined seam for method-adaptation.** A team layering its own delivery
   discipline (scoping, records, checkpoints) on the engine had no way to do so except by
   forking the skill.

The proposals divide along that line, and so does this document.

- **Part 1 — stand-alone engine changes.** They apply to any ticks project with no
  configuration: make a worktree runnable before use, decide per wave whether parallelism pays,
  and partition by what constrains concurrency rather than by feature. Observed effect across
  the later runs: multi-wide parallel execution, no merge conflicts, no mid-run interventions.
- **Part 2 — one adaptation seam.** Lifecycle-addressed `.tick/config.md` sections let a project
  inject steps at boundaries the engine already owns, without forking. An example method built
  on this seam is referenced below.

All changes are skill-prose only (no `tk` binary change) except two optional CLI conveniences
noted inline. One further change was drafted and not adopted; its reasoning is recorded at the
end.

A subsequent editorial pass rewrote the skill text so these mechanisms read as one design
rather than additions: the run loop and mental model route through the dispatch gate natively;
waves are consistently framed as feasibility, not a dispatch order; terminology was unified
(test tier vs capability tier, dispatch unit); change-relative narration was removed; SKILL.md's
prerequisites were split from a new "Project files the runner uses" section (declared / inferred /
learned / live); and "never silently degrade" became a named discipline rule. No mechanism
changed in that pass.

---

## Part 1 — Stand-alone engine changes

No configuration or opt-in.

### Execution readiness: the project profile

**Problem.** A fresh worktree cannot build or test (gitignored `node_modules`/venv/`target`),
and shared-singleton test tiers cannot run concurrently. An orchestrator unable to verify in a
worktree reverts to shared-tree sequential execution.

**Mechanism.** A characterization step at run start writes and maintains `.tick/profile.md`: an
inferred **provisioning recipe** (what makes a worktree runnable, validated by a solo probe
before the first wave), a **tier→venue map** (each test tier runs *in-worktree* when it is
provably isolated, else *post-merge, serial* on a merge candidate), and required services. The
routing is conservative: a tier is treated as parallel-safe only on positive evidence of
isolation, since a wrong "parallel" corrupts silently while a wrong "serial" only costs time.
Post-merge verification uses candidate merges (`git merge --no-commit` → verify → commit or
abort) so the integration branch is not left broken and a failure attributes to the merged tick.

**Observed.** The later runs provisioned runnable worktrees and executed waves in parallel; the
profile was derived from an empty project config each run.

**Touches.** `SKILL.md` (project-files section) · `agent-runner.md` (profile, provisioning, venues,
run-start and wave-end loop steps, retro re-characterisation).

### Dispatch economics: warm-chains

**Problem.** A fresh per-tick implementer re-reads the codebase before working (~20–35 min in
the benchmark), which a single warm worker amortises across several related tasks (~4–9 min
each). For small ticks, per-tick parallelism can therefore be slower than one sequential
worker — a warm sequential engine matched the parallel one on wall-clock in one run.

**Mechanism.** Three dispatch modes — **solo**, **parallel-wave**, and **warm-chain** (one
implementer runs an ordered chain of related ticks in one worktree, committing and reporting
per tick) — chosen per wave by a gate that compares the cost of cold starts plus provisioning
against a warm chain. The profile records the measured warm/cold ratio for later decisions.
Disjoint chains still run in parallel worktrees; the orchestrator still owns all state; the
skeleton and retro are unchanged. This is the feature-worker mode deferred as open question #1
in the execution-model-v2 spec, expressed within existing ticks mechanics.

**Observed.** The gate selected all three modes across one run where each was cheapest, with the
arithmetic recorded per wave.

**Touches.** `agent-runner.md` (dispatch modes, gate, chain prompt variant, retro ledger) ·
`claude-runner.md` (a chain maps to one agent).

### Constraint-surface partitioning

**Problem.** Partitioning clustered by shared *files* only, with vertical slicing as the
backbone rule. That serialises independent work and lets a shared "seam" file collide at merge.

**Mechanism.** Partition by constraint surface: a seam file is given to **one tick** (owning
both edits avoids the conflict that sequencing two ticks only defers); a shared un-isolable
resource is confined to **one tick per wave**, across feature lines if needed; small cohesive
ticks form a **chain**. Vertical slicing becomes the default *within* a constraint group rather
than the top-level rule. Partitioning, dispatch mode, and verify venue are decided together
against the profile.

**Observed.** One run produced this partition from an empty state with the rationale citing the
rules, and integrated with no merge conflicts; the seam that had produced the single conflict in
an earlier run was placed in one tick.

**Touches.** `tick-patterns.md` (work-to-constraint matrix, resolution order) · `SKILL.md`
(parallel design) · `agent-runner.md` (planning tier).

### Review-depth ledger

A line in the retro records what the epic-final review ran, time spent, and findings by
severity. It changes no behaviour (the always-review default stands); it records review cost
and yield as data.

---

## Part 2 — Adaptation seam

### Lifecycle-addressed config sections

**Mechanism.** `.tick/config.md` sections are treated as delivery addresses, each wired to one
consumption point. The recognised set is extended with orchestrator-only sections addressed to
lifecycle boundaries:

| Section | Consumed at | Cost |
|---|---|---|
| `Testing` | implementers + wave-end verification | per implementer |
| `At run start` (alias `Environment`) | once, before the first wave | 1× |
| `For implementers` (alias `Rules`) | inlined in every implementer prompt | N× |
| `At wave end` | after each wave integrates | per wave |
| `At epic close-out` | inside the epic retro | 1× per epic |
| `At project checkpoint` | at the project boundary stop | 1× per project |

Absent or empty sections are no-ops; the change is additive skill-docs only, with no `tk`
change. A method uses these sections to run its own steps (extra retro work, a durable report
destination, tagging) at boundaries the engine already reaches, instead of forking the skill.
The sections carry declared steps and write-once outputs, not live state — consistent with the
execution-model-v2 non-goal of avoiding duplicated state, and with the existing "read fresh at
point of use" rule.

**Config as method, not state.** These sections resolve per-increment facts (an increment id, a
report directory) from the project's own files rather than embedding them, so `config.md` is
edited to change the *method*, not per increment. This follows the same separation used
elsewhere: live state in `tk`, inferred facts in the profile, records in the method's own tree,
declared method in config.

**Example method.** A delivery method built on these sections plus roadmap conventions, with no
change to the engine — interactive increment scoping, an autonomous run, and per-increment
narrative records with checkpoints, packaged as argument-routed entry points over the unchanged
ticks skill. Its record-keeping runs under `At epic close-out` and `At project checkpoint`; the
engine is unaware of it. It lives in a separate repository
([`mkelk/skills` → `skills/dmtix/`](https://github.com/mkelk/skills)) and is not part of this
proposal — it is cited as evidence that a heavyweight method needs only the config seam, not an
engine fork.

**Optional CLI convenience.** `tk next --json` could include the matching `At epic close-out`
content when it returns a close-out tick, so the orchestrator need not re-read config
separately. Not required; the sections work without it.

**Touches.** `SKILL.md` (project-files section table) · `agent-runner.md` (run-start reading, retro
steps, checkpoint). Adapters unchanged.

---

## Not adopted: a review-depth ladder

A per-epic review-depth ladder selected by risk signals was drafted and set aside. The evidence
for it was one ambiguous case (a long review that did find and fix real issues), and its
failure asymmetry is the reverse of the dispatch gate's: skipping a needed review has open-ended
cost, while running an unneeded one costs bounded time. On that asymmetry the current
always-review default is already the conservative choice, and machinery whose main effect is to
permit less review is hard to justify from one data point. Only the observability ledger
(Part 1) was kept; the rest is left for real-project data.

---

## Allocation

| Concern | Owner |
|---|---|
| Execution mechanism (provisioning, venues, dispatch, partitioning, gates) | the skill |
| Inferred, measured project facts (recipe, tier→venue, warm/cold ratio) | `.tick/profile.md` |
| Operational gotchas | `.tick/learnings.md` (150-line cap) |
| Declared method + facts the repo cannot reveal | `.tick/config.md` |
| Live state | `tk` |
| A method's narrative records | the method's own tree |
| `tk` binary | unchanged (two optional conveniences noted inline) |

The config sections and the profile are complementary: the profile supplies waves with runnable
inputs; the config sections let boundaries emit declared outputs. Part 1 addresses parallel
execution on real repositories; Part 2 defines a seam for methods so they need not fork the
engine.
