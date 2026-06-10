# Execution Model v2 — Epic Chaining, Learning Loop, and Resumable Orchestration

**Status:** DRAFT
**Date:** 2026-06-10
**Sources:** Review of the DevMeta harness (`/tmp/devmeta-review/devmeta/`, friend's increment-driven slash-command framework built on `tk`), compared against the current ticks skill (`claude-runner.md`, `tick-patterns.md`).

## Motivation

Ticks' execution model is strong at the **micro layer**: one tick = one subagent = one worktree = one mergeable branch, wave parallelism from `tk graph`, a status protocol (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), per-tick model selection, and a hard invariant that the orchestrator owns all tick state.

It is weak at the **macro layer**:

1. **Epics don't chain.** When an epic completes, the run stops. There is no roadmap concept, no just-in-time detailing of the next epic, and the handoff between epics is discretionary rather than structural — exactly the boundary where agents historically stall.
2. **Nothing is learned between epics.** Tick notes die with the epic. There is no mechanism that harvests what implementers discovered, promotes it to the right permanent home, and guarantees future agents read it.
3. **Orchestration is session-bound.** The run plan (which wave, what's merged, what's next) lives only in the Claude session. If the session dies mid-epic, tick state survives but the process does not — a human has to reconstruct where things stood.

The DevMeta harness solves all three (increment → iteration lifecycle, I&A reflection cycles, `tk next`-driven re-entrancy) but does so with heavy ceremony, duplicated state between markdown and ticks, workers mutating shared tick metadata, and no worktree isolation. This spec adopts DevMeta's lifecycle ideas on top of ticks' execution mechanics, keeping ticks' invariants intact.

## Goals

- A **roadmap** of sequenced epics where only the front epic is fleshed out, and epic→epic transition happens without a human re-prompt (unless a checkpoint is requested).
- A **learning loop**: an epic-close retro that harvests learnings, promotes them into tiered destinations, and a guarantee that every future implementer prompt includes the operational tier.
- **Resumable orchestration**: a run interrupted at any point can be resumed by re-invoking the skill, with no state reconstruction.
- Smaller adoptions: foundation-first partitioning, per-project runner config, and explicit discipline rules.

## Non-goals

- No `.devmeta/`-style parallel state tree. Tick state stays in ticks; this spec adds exactly two conventional files under `.tick/` (`learnings.md`, `config.md`).
- No change to the micro execution invariants: orchestrator owns all tick state; implementers never run `tk` or touch `.tick/`; parallel agents run in isolated worktrees.
- No tick pruning. History is a feature (and the retro's raw material). DevMeta's delete-closed-ticks step is explicitly rejected.
- Feature-worker execution mode (one subagent running a sequential chain of ticks) is **deferred** — see Open Questions.

---

## 1. Epic chaining (roadmap)

### Concept

A roadmap is a chain of epics linked with the existing `--blocked-by` mechanism. Only the **front** epic (the unblocked one) has child ticks. Downstream epics exist as parent-only ticks whose descriptions carry rough scope — a paragraph plus a deliverables list, not detailed tasks. This is just-in-time detailing: future epics stay cheap to reorder or rescope because no detailed planning is invested in them.

```bash
tk create "Auth foundation" -t epic -d "<rough scope>"          # epic A — fleshed out now
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>   # epic B — parent only
tk create "Billing" -t epic -d "<rough scope>" --blocked-by <B>           # epic C — parent only
```

### Structural continuity (the DevMeta trick)

The reason agents stall at epic boundaries is that "what's next" becomes a discretionary judgment. The fix is to make the transition itself a tick. When the front epic is planned, the skill creates as its **final child task**:

> **"Close out <epic A>: run epic retro, then flesh out <epic B> into ticks"**

This task is real work, not a handoff marker. Executing it means: run the retro (§2), then read epic B's rough scope, partition it (§4), create its child ticks, and continue with `tk graph <B>`. The boundary decision point is eliminated structurally.

### Human gates per boundary

Whether a boundary auto-continues is decided at roadmap creation time using existing mechanisms: create the downstream epic with `--awaiting checkpoint` (or `--requires approval`) to force a stop, or with neither to flow through. Default: **auto-continue**. Roadmap-level changes (adding/removing/reordering epics) remain human decisions — the agent may propose them in the retro report but not execute them unilaterally.

### `tk` changes

- `tk next` (and `tk graph`) currently have no answer for "an unblocked epic with no children." New behavior: `tk next` returns the epic itself with a planning hint (e.g. `action: plan` in `--json`), meaning "this epic needs to be fleshed out." This makes the re-entrant loop (§3) total: every state maps to an action.
- `tk roadmap` (nice-to-have, can ship later): renders the epic chain with status — done / active / queued — essentially `tk graph` at epic granularity.
- **TUI / tickboard roadmap awareness** (same phase as `tk roadmap`, same underlying query): a roadmap view showing the epic chain — done / active / queued, with badges for gated boundaries (`--awaiting checkpoint` / `--requires approval`). The tickboard matters most here: it's the human monitoring surface during long autonomous runs, and "which epic is active, how many remain, is anything waiting on me" is exactly what you want at a glance. No new data model — roadmaps are derived entirely from existing epic + `blocked-by` + awaiting fields.

### Skill changes

- New planning guidance: for multi-epic scopes, create the roadmap as parent-only epics; flesh out only the front epic; always append the close-out task.
- The existing "for phased specs, create ticks for the current phase only" guidance is subsumed by this section.

---

## 2. Learning loop (epic-close retro)

### Storage: `.tick/learnings.md`

Operational learnings live in `.tick/learnings.md` — not `docs/`. Rationale: `.tick/` is already version-controlled by design and travels with the tracker; and because the runner owns the implementer prompt template, it can **guarantee** injection (a learnings file nobody reads is dead weight — DevMeta's key insight is wiring both the write side and the read side).

Format: short Problem → Cause → Rule entries under category headers. **Hard cap: 150 lines.** Every implementer and every planning pass reads the file in full, so its size is a per-agent context tax.

### The retro (runs inside every epic close-out task)

1. **Harvest.** Read all tick notes from the epic (`tk notes` per tick), all DONE_WITH_CONCERNS reports, and anything the orchestrator noted during integration (merge conflicts, re-dispatches, blocked ticks).
2. **Promote by tier.** Each learning goes to exactly one destination:

   | Learning kind | Destination |
   |---|---|
   | Rule that would have prevented a mistake, applies to any future work | `CLAUDE.md` (keep it terse; respect its size) |
   | Permanent architectural / how-the-codebase-works knowledge | `docs/` |
   | Operational gotcha for future implementer agents (test quirks, env traps, recurring build issues) | `.tick/learnings.md` |
   | One-off detail, only matters to this epic | stays in tick notes (already persisted — do nothing) |
   | A doc proven wrong by this epic | fix or delete the doc |

3. **Compact.** Re-read `.tick/learnings.md` after adding entries: merge duplicates, delete entries the codebase has outgrown, enforce the 150-line cap. (This is the step DevMeta is missing; its lessons file grows forever.)
4. **Outside-in verification.** For each scope item of the epic, verify against the *code*, not the tick status: the behavior exists, tests cover it, acceptance commands actually pass. Gaps get fixed now or surfaced to the human — never silently deferred into the next epic (see §6, scope immutability).
5. **Drift review.** Skim the epic's full diff for agent-typical patches: workaround flags, suppressed errors, copy-paste variants, defensive bloat, `HACK`/`workaround` comments. Real drift becomes cleanup ticks in the next epic (scope may grow; it may not shrink).
6. **Retro report.** A short summary written as the close reason / a note on the epic tick: learnings promoted (by destination), verification table, drift found, proposed roadmap adjustments (for the human).

### Consumption (the other half)

Learnings are read **by reference, fresh, at the point of use** — never injected verbatim from the orchestrator's context. The orchestrator session spans epic boundaries, so a copy it inlined before a retro would be stale after one; and implementers already have the current version in their worktree (it's version-controlled under `.tick/`). Three consumption points:

1. **Implementing.** The implementer prompt template in `claude-runner.md` gains an instruction: *read `.tick/learnings.md` (if present) before starting* — alongside the existing "read the relevant existing code" step.
2. **Planning and authoring ticks.** This is arguably the primary consumer: most learnings change how ticks should be *written* (sizing, file footprints, test commands, gotchas to spell out in descriptions), not just how they're executed. The tick authoring guidelines (`tick-patterns.md`, Definition of Ready preamble) and the partitioning procedure (§4) both gain a first step: re-read `.tick/learnings.md` before authoring or partitioning.
3. **Retro.** The retro (§2 above) reads it as input to compaction.

The skill text instructs the orchestrator to re-read the file at each of these points rather than relying on any earlier in-context copy.

---

## 3. Resumable orchestration

### Meta-work as ticks

Today the orchestration plan exists only in the session. Fix: when the skill plans an epic, it also creates the **process steps as ticks**, blocked appropriately:

```
Epic A
├── <implementation ticks, waves as usual>
├── "Final review of epic A diff"            --blocked-by <last wave>
└── "Close out epic A: retro + plan epic B"  --blocked-by <final review>
```

With §1's `tk next` change, the loop becomes total and re-entrant: *whatever* `tk next` returns — an implementation tick (dispatch it), a review tick (review), a close-out tick (retro + plan next), or an unchilded epic (plan it) — there is exactly one action. **Resuming a dead run is just re-invoking the skill**, which starts at `tk graph`/`tk next` and continues. No state reconstruction, no setup.

### Stale state recovery

On (re)entry, the skill checks for ticks stuck `in_progress` with no corresponding live agent and resets them to `open` (DevMeta's recovery rule: completed work stays closed, incomplete work re-opens). Worktree branches left behind by a dead session are listed and either merged (if the agent reported DONE before dying) or deleted.

### Base branch persistence

The orchestrator records the run's base branch on the epic tick itself (a note, or a field if `tk` grows one) at run start — asked once if ambiguous, then never again. Merges, final review diffs (`git diff <base>...HEAD`), and resume all read it from there instead of assuming `main`.

### Invariant preserved

Implementers still never touch `tk` or `.tick/`. All tick mutations — including the meta-ticks — are the orchestrator's. This is what keeps `.tick/` free of merge conflicts; DevMeta's worker-owned tick state and its "commit 30–40 dirty metadata files" ceremony are explicitly rejected.

---

## 4. Foundation-first partitioning

Formalize the skill's partitioning guidance into a procedure (DevMeta's `plan-iteration` algorithm, adapted to tick granularity):

0. Re-read `.tick/learnings.md` — partitioning and tick-authoring mistakes are a recurring learning category (§2).
1. List every deliverable in the epic.
2. Build a **work-to-file matrix**: per deliverable, files created / modified.
3. **Cluster by shared files** — deliverables touching the same files become sequential (`--blocked-by`) or merge into one tick.
4. **Extract the foundation**: shared types, schemas, contracts, config, persistence → one or more wave-1 ticks that everything else blocks on.
5. **Maximize the parallel frontier** after foundation; verify with `tk graph` that no same-wave ticks share files.

This replaces the current scattered guidance ("define shared contracts first", "wave safety") with one named, ordered procedure. It lives in `tick-patterns.md`; no CLI change.

---

## 5. Per-project runner config: `.tick/config.md`

A conventional markdown file with three recognized sections, read fresh by the skill at run start and by implementers from their worktree (same by-reference rule as `.tick/learnings.md`, §2):

- **Testing** — exact test commands, including surgical per-package invocations.
- **Environment** — pre-flight checks run once before the first wave (CLI tools present, services up). *Test, don't ask.*
- **Rules** — project-specific constraints for implementers.

Fallback when absent: current behavior (implementers discover test commands themselves). This kills the most common repeated failure — every fresh agent re-deriving (or guessing wrong) how to run the tests.

Why not CLAUDE.md: CLAUDE.md is for humans-and-agents working interactively in the repo; `.tick/config.md` is specifically the contract for dispatched implementers and is injected wholesale. Projects may of course reference one from the other.

---

## 6. Discipline rules (skill text)

Adopted into `claude-runner.md`, near-verbatim from DevMeta:

- **Scope never shrinks.** The agent may split, merge, or reorder ticks, and scope may grow (bugs, discovered gaps) — but only the human removes scope. If outside-in verification (§2) finds an undelivered scope item, it gets fixed now, not relabeled "follow-up."
- **No known-failure closes.** A tick cannot close with failing acceptance. There is no "close with known issues" state; either it passes or it's open/blocked/awaiting.
- **Name the stall instinct.** Completing a large body of work triggers the instinct to summarize and hand control back. Epic boundaries with a close-out tick are waypoints, not stopping points; the existing "run continuously" rule is strengthened with this explicit framing.
- **Two-tier stopping rule.** Intra-roadmap epic boundaries auto-continue (unless gated, §1). The *roadmap* end — or a checkpoint/approval gate — is the hard stop where a completion report is written and the session yields.

---

## Implementation phasing

| Phase | Contents | Touches |
|---|---|---|
| 1 | Skill-only: epic close-out task convention, retro procedure, `.tick/learnings.md` + prompt injection, discipline rules, foundation-first partitioning, `.tick/config.md` | skill docs only — shippable without any `tk` release |
| 2 | `tk next`/`tk graph`: unchilded-unblocked epic → `action: plan`; stale `in_progress` listing to support recovery | `tk` CLI |
| 3 | Meta-work-as-ticks + full re-entrant loop in the skill (depends on phase 2) | skill + docs |
| 4 | Nice-to-haves: `tk roadmap`, roadmap views in TUI + tickboard, base-branch as a first-class epic field, learnings-cap lint | `tk` CLI + TUI/tickboard |

Phase 1 delivers both of the original goals (multi-epic flow and the learning loop) with zero code changes, which also makes it the cheapest way to validate the design by dogfooding it on phases 2–4 themselves.

## Open questions

1. **Feature-worker mode.** DevMeta's unit of execution is a feature (one subagent runs a sequential task chain, sized to ~60–70% of context), which amortizes codebase-reading across tasks. Ticks' per-tick fresh agents are cleaner but pay repeated cold-start cost on tightly coupled chains. Worth a follow-up spec: `tk graph` could mark sequential chains, and the orchestrator could assign a chain to one worker. Deferred because it weakens the "every tick is self-contained" discipline and complicates retry granularity.
2. **Learnings scoping.** One global `.tick/learnings.md`, or per-area files once a repo grows (UI vs CLI vs worker)? Start global with the 150-line cap; revisit if compaction starts discarding still-useful entries.
3. **Retro depth vs cost.** The drift review reads the epic's full diff. For very large epics this could be a Workflow fan-out (the skill already allows this for final review). Default to single-pass; allow opt-up.
4. **`tk next` semantics change** (returning epics needing planning) is a behavior change for any existing automation that assumes `tk next` only returns tasks. Gate behind `--include-planning` first, or version it? Leaning: new field in `--json` output is additive and safe; the human-readable output can change freely.
