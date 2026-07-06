# DevMeta × Ticks — Analysis and Synthesis Proposals

*2026-07-05 — analysis of `~/.claude/commands/devmeta/` (current devmeta) vs `pengelbrecht/ticks` (tk 0.19 + the distributable ticks skill).*

## Executive summary

The two frameworks have converged: ticks now contains structural, upstream-maintained versions of almost every DevMeta idea — `.tick/config.md` mirrors `.devmeta/devmeta.md`, the epic-close retro mirrors the I&A cycle, project checkpoints mirror increment boundaries, and the same discipline rules (scope never shrinks, no known-failure closes, anti-stall) appear verbatim. What ticks lacks is exactly what you value most: the **narrative historical record** (increment dirs, ia-cycle reports, project history) and the **interactive scoping ceremony**. What DevMeta lacks is why ticks feels faster: tick-grain parallelism instead of feature-grain, model tiering, no PR-per-unit ceremony, and a state machine that lives in the tracker (drift-proof resume) instead of in prose across six command files.

**Recommendation: P1 now, P3 in parallel.** Rebuild DevMeta as a thin two-command overlay on the *stock* ticks skill — `start-increment` keeps the interactive dialogue and `_overview.md`, then maps increment→project and iteration→epic, **authoring the DevMeta record-keeping contract directly into each epic's close-out tick description** (ticks makes meta-work into ticks, so no fork is needed). `go` becomes a thin launcher that reads `.devmeta/devmeta.md` and defers to the ticks runner protocol. In parallel, propose upstreaming optional `## Close-out` / `## Records` sections for `.tick/config.md` so the overlay can eventually shrink to a config file. Avoid forking (the repo moved 0.18→0.19 in two weeks — forks will rot) and avoid a full rewrite. Drop the feature layer and PR-per-feature; stop pruning closed ticks; adopt the 150-line learnings cap and per-tick model tiers.

Net effect: you keep predictability (now enforced structurally rather than by prose), the record system, the local-adaptation hook, and deep I&A — and gain ticks' speed, resume robustness, and free upstream maintenance.

## 1. What each framework actually is

**DevMeta** is a *delivery lifecycle engine*: increment → iteration → feature → task, driven by six slash commands (`go`, `start-increment-spec`, `plan-iteration`, `run`, `reflect`, `status`). It uses `tk` as its state store but keeps the process definition in the command prose. Its distinctive assets are the **durable record system** (`.devmeta/increments/<NN>-<XXX>/` with `_overview.md`, per-iteration `status.md`, `ia-cycles/` reports, plus `project-history.md` and `lessons-learned.md`) and the **deep I&A cycle** (13 steps: learnings harvest, code-drift review, outside-in gap verification, living-docs audit, plan reassessment, git tag).

**Ticks** is two things: the `tk` CLI (a git-native issue tracker) and a *distributable orchestration skill* (SKILL.md + references) that turns any harness into an epic runner: project → epic → tick, one tick = one implementer = one worktree = one branch, waves from `tk graph`, structural process ticks (EPIC-SKELETON: `--role review` + `--role closeout`), an epic-close retro, `.tick/config.md` (Testing/Environment/Rules) and `.tick/learnings.md` (150-line hard cap).

## 2. Concept mapping — the convergence is striking

| DevMeta | Ticks | Fit |
|---|---|---|
| Increment (stop at boundary) | **Project** (checkpoint boundary, `--awaiting checkpoint`) | Near-exact |
| Iteration (auto-continue, I&A after) | **Epic** (auto-continue, retro in close-out tick) | Near-exact |
| Feature (unit of context, sequential tasks) | *(no analog — tick is finer-grained)* | The real divergence |
| Task | Tick | Exact |
| I&A cycle (`reflect`) | Epic-close retro (harvest → promote → compact → outside-in verify → drift review → report) | Same DNA, ticks is ~70% of it |
| "Last I&A task = first task of next iteration" (prompt trick) | Close-out tick "flesh out next feasible epic" (structural, `--role closeout`) | Ticks version is drift-proof |
| `.devmeta/devmeta.md` (Testing/Environment/Additional Rules) | `.tick/config.md` (Testing/Environment/Rules) | Same idea, runner-neutral |
| `.devmeta/lessons-learned.md` (unbounded) | `.tick/learnings.md` (150-line cap + compaction at every retro) | Ticks version manages context tax |
| `<increment-dir>/base-branch` file | `tk update <epic> --base-branch` (first-class field) | Ticks version is queryable |
| Scope-never-shrinks, no known-failure closes, anti-stall rules | Identical "Discipline rules" in agent-runner.md | Shared philosophy |
| Increment record dirs, project-history.md, ia-cycle reports | *(retro report = close reason / tick note only)* | **DevMeta's unmatched asset** |
| Interactive `start-increment-spec` dialogue, verify-on-screen, exit criteria | SKILL.md Step 2 "close the gaps" (lighter) | DevMeta richer |

Almost everything DevMeta pioneered exists in ticks in a *sharper, structural* form — except the narrative record and the interactive scoping ceremony.

## 3. Pros and cons

### DevMeta — pros
1. **Historical record**: human-readable markdown per increment. Ticks' record is tick JSON + notes + close reasons — machine-good, narrative-poor.
2. **Predictable cadence**: fixed Plan → Execute → I&A rhythm; iteration map + exit criteria + verify-on-screen acceptance written up front.
3. **Deepest reflection**: living-docs audit of `docs/current/`, pattern-problem detection, plan reassessment, git tags — beyond ticks' retro.
4. **`.devmeta/devmeta.md`** local-adaptation hook (though ticks now has the equivalent).
5. Battle-tested by you; you trust it.

### DevMeta — cons (why it's slower)
1. **Coarse parallelism grain.** Feature = one long subagent session doing tasks sequentially; the wave barrier sits at feature level. Ticks parallelizes at *tick* level with per-tick worktrees and optional dependency-driven launching.
2. **Heavy ceremony encoded as ticks**: re-ground tasks after every feature, "commit metadata to base branch" tasks, iteration `status.md` updates, `context-log.md`, feature spec files, PR-per-feature *and* PR-per-iteration (run.md has workers `gh pr create`; go.md also has an iteration-level "Create PR" task — a real drift example between the command files).
3. **No model tiering.** Everything runs at session tier. Ticks dispatches economy/balanced/strong/frontier per tick and mandates frontier only for planning and final review.
4. **State machine in prose across 6 files.** go.md, run.md, reflect.md each restate parts of the loop; they can (and do) drift.
5. **Resume by interpretation.** The "last I&A task is real work" trick papers over the stall boundary; ticks solves it structurally (`tk next --json` returns `action: implement|plan|await` + `role`, and `missing_process_ticks` makes a broken skeleton machine-repairable).
6. **Prunes closed ticks** (reflect Step 9 deletes them), destroying the machine-side history and forcing markdown to carry everything.
7. Claude-only, hand-maintained, no upstream.

### Ticks — pros
1. **Fast**: fine grain, wide waves, direct orchestrator merges (no per-unit PR ceremony), wave-level test gate, tier-optimized dispatch.
2. **Structural meta-work**: EPIC-SKELETON with `--role`, self-healing pre-flight, JSON action routing → resume is "re-invoke the skill, run `tk next`".
3. **Self-contained tick doctrine** + Definition of Ready checklist → cheap fresh agents can execute reliably.
4. **Context-tax discipline**: learnings capped at 150 lines with forced compaction; "read fresh at point of use".
5. **Human gates**: awaiting states (work/approval/input/review/content/escalation/checkpoint), project checkpoints, `--autonomous` override.
6. **Cross-runner** (Claude/Codex/Pi adapters), multiplayer owner scoping, TUI/board monitoring, upstream-maintained and fast-moving (0.18 → 0.19 in two weeks).

### Ticks — cons (vs your needs)
1. **No narrative record.** Retro report lands in a close reason or note; no increment directories, no project history, no per-iteration status files.
2. **Lighter scoping ceremony** — no equivalent of the interactive `start-increment-spec` dialogue with on-screen/under-the-hood deliverables and exit criteria.
3. **Increment-shaped workflow is opt-in convention** (Rung 1 project), not the default; nothing enforces your cadence unless you author it at planning time.
4. **Config sections are fixed** (Testing/Environment/Rules) — no lifecycle hooks like "after every iteration, update the docs" (though the Rules section and close-out tick descriptions can carry such instructions).
5. Retro's docs treatment ("fix or delete the doc proven wrong") is narrower than DevMeta's whole-of-`docs/current/` audit.

## 4. Commands vs skill — the structural tension

DevMeta is **six slash commands**; ticks is **one skill with references**. Three real differences, one deeper one:

1. **Loading model.** A command loads its full prose into context on invocation — all six files must each restate shared context (each devmeta file repeats the devmeta.md-reading preamble). A skill uses progressive disclosure: a ~450-line SKILL.md plus references loaded only when needed (`agent-runner.md`, the harness adapter, `tick-patterns.md`). Cheaper and less drift-prone.
2. **Invocation model.** Commands are user-invoked only. A skill's description auto-triggers — Claude reaches for the ticks protocol whenever it sees `.tick/` or tk phrases, mid-session, without you asking. DevMeta never self-activates.
3. **Distribution.** `npx skills add pengelbrecht/ticks` + `tk upgrade` vs hand-maintained personal files. The skill is also runner-neutral (Codex/Pi adapters); your commands are Claude-only.
4. **The deeper one: where the state machine lives.** DevMeta encodes the lifecycle *in the command set* — each command is a phase, `go` is the driver that calls the others, and correctness depends on the prose in six files agreeing. Ticks encodes the lifecycle *in the tracker* — roles, actions, awaiting states, blocked-by edges — and the skill is just the protocol manual. Any entry point converges because `tk next` routes. That's why ticks resumes trivially and DevMeta needs "do NOT run these commands manually, it breaks the loop" warnings.

Note the platform has mostly collapsed the surface distinction (commands are exposed through the Skill tool now). What remains real is 1–4 above. Implication for any synthesis: **keep at most two thin commands as ergonomic entry points, put the protocol in a skill, and push all state into tk.** DevMeta's "internal commands" (plan-iteration, run, reflect) should not survive as commands — they're phases, and phases belong in the tracker + skill references.

## 5. Why ticks runs faster — summary of mechanics

- Parallelism at tick grain, not feature grain; dependency-driven launching beats wave barriers on uneven waves.
- No PR ceremony per unit — orchestrator merges branches, tests per wave; PR only where CI policy demands (configurable in `.tick/config.md` Rules).
- Model tiering: mechanical ticks on cheap models; frontier only for planning/review.
- Less bookkeeping in the hot loop (no re-ground/status/context-log/metadata-commit tasks); reflection concentrated in one structural close-out tick.
- Structured routing (`action`, `role`) instead of markdown interpretation at every step.

## 6. Synthesis proposals

### P1 — Overlay skill on stock ticks (RECOMMENDED, works today)
Keep tk + the stock ticks skill untouched. Build a small local layer (`devmeta` v4) with two entry points:

- **`/devmeta:start-increment`** — keeps the interactive scoping dialogue and writes `.devmeta/increments/increment-<NN>-<XXX>/_overview.md` exactly as today. Then, instead of DevMeta's iteration ticks, it creates the tk structure the ticks skill expects:
  - one **project** tick = the increment (its checkpoint boundary reproduces "stop at increment end");
  - one **epic per iteration** — front epic fleshed out, downstream epics rough-scope only (`--blocked-by` / `--after`), each with a goal-compatible definition of done taken from the iteration's "Verify on screen" section;
  - each epic's **close-out tick description authored to carry the DevMeta I&A contract**: write the retro report to `<increment-dir>/ia-cycles/iteration-<N>.md`, update `.devmeta/project-history.md`, run the living-docs audit, apply `.devmeta/devmeta.md` hooks, tag `iteration-<NN>-<XXX>.<M>`. This is the key insight: *ticks makes meta-work into ticks, so DevMeta's record-keeping can ride inside the close-out tick without touching the skill.*
- **`/devmeta:go`** — thin: read `.devmeta/devmeta.md`, then execute per the ticks skill (agent-runner.md + claude-runner.md), with standing rules: PR per epic to base branch with `--merge`, never prune closed ticks, honor the increment checkpoint.
- **Config bridge**: keep `.devmeta/devmeta.md` as your hook file; have `start-increment` generate/refresh `.tick/config.md` from its Testing/Environment/Rules sections so implementers get them the ticks-native way. Extra DevMeta-only sections (e.g. `## After each iteration`) stay in devmeta.md and are consumed by the close-out tick text.

Pros: zero fork maintenance, upstream improvements free, full record system preserved, fastest engine. Cons: the record contract is enforced by tick descriptions + overlay prompts rather than by the skill itself.

### P1′ — lifecycle-addressed config.md as the local wedge (refined P1, RECOMMENDED)
The lifecycle-addressed sections (see P3 refinement below) work as a *local* mechanism today, without upstreaming and without a fork, because `config.md` is prompt-consumed, not tk-parsed. Structure `.tick/config.md` with `## At run start`, `## For implementers`, `## At epic close-out`, `## At project checkpoint` — the close-out section carries the whole DevMeta I&A contract (report → `<increment-dir>/ia-cycles/`, project-history update, docs audit, tag).

Enforcement, in layers:
1. **Pointer in the close-out tick** (the load-bearing layer): planning authors every epic's close-out tick description with one line — *"Also execute `## At epic close-out` from `.tick/config.md`."* Close-out tick descriptions are contractual in the *stock* skill (the orchestrator executes what the tick says), and the EPIC-SKELETON invariant guarantees the tick exists (machine-checked via `missing_process_ticks`). So the record contract is enforced by ticks' own structural mechanism; config.md is just the content store. One line survives any planner; the content is standing.
2. **Overlay skill sentence**: `/devmeta:go` states "honor lifecycle-addressed sections in `.tick/config.md`, and when creating or repairing EPIC-SKELETON process ticks, author them from the template in `## At epic close-out`" — covers runs where planning forgot the pointer and the pre-flight repair path (the skill's self-healing step would otherwise create process ticks from its own pointer-less templates).
3. Optional CLAUDE.md backstop line.

**Injection points — who writes the pointer, and when.** Process ticks cannot be pre-created for unfleshed downstream epics (the close-out must be `--blocked-by` the final review, which is blocked by last-wave ticks that don't exist yet; pre-creating children also suppresses `needs_planning`). So injection happens at each epic's flesh-out moment, through three doors:
- **Front epic:** `/devmeta:start-increment` creates its skeleton directly, with the enriched close-out description.
- **Downstream epics:** propagation **by reference, not by copy** — the close-out description says "flesh out the next feasible epic and author its process ticks *per the template in `.tick/config.md` → `## At epic close-out`*". The canonical text lives in config.md, so there is no telephone-game decay across epic generations; each new close-out is regenerated from the same source.
- **Repair path / stock-skill runs:** the overlay sentence in `/devmeta:go` (layer 2 above). A cheap lint in `go` — list `--role closeout` ticks and check descriptions contain the pointer — catches the residual gap.

Note what "control" means here: the overlay owns the *authoring convention for meta-work ticks*, not a fork and not the engine. The stock skill deliberately turned process into data (meta-work as ticks); the wedge customizes process by writing data, which is exactly what keeps it upstream-compatible.

This also resolves the two-config-files awkwardness: **fold `.devmeta/devmeta.md` into `.tick/config.md`** — the beloved local-adaptation hook survives, relocated to the runner-neutral location that implementers and orchestrators already read. `.devmeta/` remains purely the record tree (increments, history) — data, not config. Keep the `## For implementers` channel lean (it is paid N×); large templates live in `.devmeta/templates/` referenced by path.

Forward-compatibility is the clincher: if Peter upstreams lifecycle addressing (P3), the local file doesn't change by a byte — the wedge simply becomes contractual and the pointer lines become redundant-but-harmless. And the pitch to Peter strengthens from proposal to field report: "I've been running this shape locally; here's the diff that makes it official."

### P2 — Minimal fork of the ticks skill
Fork `skills/ticks`, add one step to the loop: "Step 0.5: read `.devmeta/devmeta.md` if present; honor its Records / After-iteration sections during close-out and at project checkpoints." Everything else stock; rebase periodically.
Pros: contract lives inside the skill. Cons: the repo moves fast (0.18→0.19 in two weeks) — fork rot is a near-certainty. Only do this if P1's prompt-level enforcement proves leaky *and* P3 is rejected.

### P3 — Upstream "lifecycle hooks" to pengelbrecht/ticks
Propose extending `.tick/config.md` with optional sections consumed at lifecycle points, e.g. `## Close-out` (extra retro steps: report destination path, docs audit, history file) and possibly `## Scoping` (template for epic definitions of done). It fits the file's stated philosophy ("purely additive", "read fresh at point of use") and the retro already writes a report — this just parameterizes destination and adds steps. If accepted, DevMeta collapses to: one config file + one start-increment command. **Pursue in parallel with P1** — P1 works today; P3 makes most of it disappear into upstream.

**Context discovered 2026-07-05:** `docs/design/execution-model-v2-epic-chaining-and-learning-loop.md` in the ticks repo (2026-06-10, DRAFT) explicitly names DevMeta as its source — Peter reviewed the harness and adopted its lifecycle (roadmap chaining, retro/learning loop, meta-work-as-ticks, config.md, discipline rules) onto ticks' execution mechanics. The 0.18/0.19 releases are that spec shipped. Its non-goals consciously rejected three DevMeta pieces: the `.devmeta/` parallel state tree, tick pruning, and (deferred) feature-worker mode. So the narrative-record layer is the one thing he scoped out — and the pitch must respect *why*: what he rejected was **duplicated live state** (status.md mirroring tick state, the metadata-commit ceremony). Records/Close-out are **immutable narrative outputs**, not state — write-once reports with no sync problem. That distinction is the core of the pitch.

**What P3 concretely entails (verified against the repo):**
- **Zero Go changes.** `tk` never parses `config.md` (grep confirms: it appears only in skill markdown and design docs; the binary only parses `config.json` for `policy.autonomous_mode`). This is a skill-docs-only PR — exactly the "Phase 1: shippable without any tk release" pattern the v2 spec itself used.
- **Diff surface (~40–80 lines of markdown, 2 files):**
  1. `skills/ticks/SKILL.md` — extend the `.tick/config.md` section list (Step 0, item 5) with two optional, orchestrator-only sections: `## Records` (durable report destinations: retro reports → `<dir>/<epic>.md`, project-completion reports → path) and `## Close-out` (extra orchestrator steps appended to every epic-close retro: history file update, docs audit, git tag).
  2. `references/agent-runner.md` — three sentences of wiring: "Run-start" section lists the new sections and states they are never inlined into implementer prompts (zero per-agent context tax, unlike Rules); Retro step 6 writes the full report to the Records destination when configured (close reason keeps a one-line summary either way); retro then executes Close-out steps; the project-checkpoint stop-report also goes to the Records destination.
  - Adapters (claude/codex/pi-runner.md) need nothing — the sections are runner-neutral prose.
- **Does it change Peter's current use? No, by construction.** Absent sections → byte-identical behavior; his existing three-section config.md files are untouched; no tk upgrade or migration; older skill versions reading a config.md *with* the new sections just ignore the unrecognized headers. His only cost: a few lines more skill text and one conditional branch in the retro. Side benefits for him: durable report files are a better cross-runner handoff artifact than close reasons, and multiplayer teams (his stated differentiator) get an auditable narrative history without ticks itself becoming opinionated.
- **Likely objections and counters:** (a) *slippery slope to a hook system* — it's two prose sections, orchestrator-only, no execution semantics in tk; (b) *context tax* — read once at retro time by the orchestrator only; (c) *"just author it into close-out tick descriptions"* (= P1) — works, but must be re-authored by every planner at every planning pass; config.md makes it a standing repo contract that survives whoever plans, which is the same argument the v2 spec used for config.md's test commands vs per-prompt injection.

**Refinement (2026-07-05): strict sections vs free form.** Do the "recognized sections" need to stay a fixed list? Analysis: the sections look like a topic taxonomy but are really **delivery addresses** — each encodes *when* it is read and *into whose context it goes* (Testing → handed to implementers; Environment → executed once at run start; Rules → inlined into every implementer prompt, a cost paid N times; Records/Close-out → orchestrator-only at boundaries, paid once). Fully free-form config would force every reader — including economy-tier implementers — to read the whole file and infer what applies to them and when: per-agent context tax, misrouting risk (a close-out instruction applied mid-implementation), non-determinism run to run, and no explicit cost model when adding content. It would also dissolve the guarantees the record contract depends on — the opposite of DevMeta's predictability requirement. But the topic-name list *is* the slippery-slope surface (every new need = a new blessed name).

The better shape: **strict routing, free content** — replace topic sections with a small closed set of *lifecycle-addressed* sections: `## At run start`, `## For implementers`, `## At epic close-out`, `## At project checkpoint` (existing names kept as aliases/sugar). Lifecycle points are a naturally closed, stable set (they are structural features of the loop); topics are open-ended. Enumerate the closed set, free the open one. Under this shape, `## Records` isn't even needed as a blessed name — the report destination is just content under `## At epic close-out`. This is simultaneously *freer* than today (projects hook any point without an upstream PR) and *stricter about the thing that matters* (routing/cost), and it closes the slippery slope permanently. Recommended as the primary P3 pitch, with the two-named-sections version as the minimal fallback.

**Final design statement (2026-07-05): named sections, possibly empty, wired deterministically to lifecycle points by the skill.** The skill defines the full vocabulary and its wiring table; a project's config.md fills in whichever sections it needs — absent or empty sections are no-ops (the existing "purely additive" philosophy). Proposed wiring:

| Section | Consumer | When | Context cost |
|---|---|---|---|
| `## Testing` (legacy name kept — dual consumer) | implementers + orchestrator | per tick; wave-end verification | N× (small) |
| `## At run start` (subsumes Environment) | orchestrator | once, before wave 1 (executable checks) | 1× |
| `## For implementers` (subsumes Rules) | every implementer | inlined in each prompt | **N×** — keep lean |
| `## At wave end` | orchestrator | after each wave's merges | waves× |
| `## At epic close-out` | orchestrator | during the retro | 1× per epic |
| `## At project checkpoint` | orchestrator | at the boundary stop | 1× per project |

Nuances: (a) determinism here is *contractual* (skill text instructs the consultation), the same trust level as the retro procedure itself — not code-enforced; (b) an optional Phase-2 `tk` assist would make routing near-mechanical: when `tk next --json` returns a `role: closeout` tick, embed the `## At epic close-out` content in the payload, so the orchestrator doesn't even need to remember to read the file — mirrors the v2 spec's own "Phase 1 skill-only, Phase 2 CLI" pattern; (c) `tk init` could scaffold a template config.md with all named sections empty + comments, making the contract discoverable; (d) locally (P1′) you adopt the identical section names now, with the pointer-in-close-out-tick as interim wiring — when upstream wires it natively, the pointer becomes redundant and nothing else changes.

### P7 — Warm-chain dispatch + cold-start-aware economic gate (from the calibration run; recovers devmeta's feature economy)

*Added 2026-07-06 after the calibration verdict (§11): warm-sequential beat cold-parallel on raw wall-clock (3h15 vs 3h52) because the economic gate priced provisioning but not **cold starts** — a fresh per-tick implementer re-reads the world (20–35 min/tick) where a warm worker, amortizing codebase understanding across tasks, does comparable work in 4–9 min.*

**The proposal — a third dispatch mode.** Between solo-tick and parallel-wave, add **warm-chain**: one implementer executes an ordered chain of related ticks in one worktree, one branch, one context — committing per tick (`tick <id>: …`, preserving the audit trail), reporting per-tick status lines, still never touching `tk` (the orchestrator closes each chain tick at integration). A chain integrates like one unit: one candidate merge, one post-merge gate; per-tick attribution survives in the commits. Chains compose with parallelism: **K disjoint chains run in parallel worktrees** — which is exactly devmeta's feature-worker model (the one idea the synthesis discarded, and the v2 spec's deferred open question #1) recovered *inside* ticks mechanics: worktree isolation, orchestrator-owned state, structural skeleton, and the retro all unchanged.

**The gate, refined.** Per wave, compare honestly:
- *parallel-wave wall* ≈ max(cold tick times) + width × serial-gate time + provisioning
- *warm-chain(s) wall* ≈ per chain: first task cold + rest warm (~⅓–½ of cold), chains in parallel

Heuristics over false precision: **chain** small (≲20-min), same-subsystem ticks; **go wide** with fresh implementers when ticks are hour-scale (cold-start amortizes inside the tick) or genuinely unrelated; **parallel chains** when a wave partitions into 2–3 cohesive groups. The profile records the *observed* warm/cold ratio after the first epic so later gates use measured numbers, not folklore.

**Sizing doctrine shifts (consciously):** tick-patterns' "1–3 agent iterations per tick" was calibrated to cold implementers. Under warm-chains, small ticks stay legitimate *as chain links* — the unit of dispatch becomes the chain, while the tick remains the unit of tracking, attribution, and resume (a dead chain resumes from its last committed tick).

**Where it lives:** skill only (agent-runner: dispatch-modes section + chain prompt variant + retro "dispatch-mode ledger"; claude-runner: chain = one Agent, SendMessage continuation; profile: warm/cold ratio). No tk changes. Upstream story: completes the pitch as the empirical answer to the v2 spec's own open question, with the run-2 vs calibration pair as evidence.

**Experiment (run 3, pre-registered):** `bench/tix-synthesis-3`, same brief, zero seeded knowledge, P6+P7 skill, same roadmap shape as run 2. Hypothesis: the gate picks warm-chains for E1/E2's small-tick waves and parallel warm-chains (one per feature) for E3; **target: beat both 3h15m (calibration) and 3h52m (run 2) with 0 interventions and full records.** Falsifier: if run 3 lands slower than the calibration, the chain overhead (chain planning + per-tick reporting) exceeds the cold-start saving and P7 needs rework.

### P8 — Constraint-surface partitioning (planning doctrine; codifies run 3's discovery)

*Added 2026-07-06 after run 3 (§12). Not new machinery — a doctrine promotion: run 3's E3 partition beat the pre-registered hypothesis by regrouping work across feature lines, and the skill text should say why so the behavior is contractual rather than emergent.*

**The doctrine.** Partition an epic by its **constraint surfaces**, jointly, with dispatch-mode selection in the loop — not by feature taxonomy with file-checks bolted on:

1. **Shared files (seams):** when two deliverables edit the same file, prefer **merging the edits into one tick** over sequencing two ticks — a seam owned by one tick cannot conflict (run 3 unified the `QuoteShow.tsx` status-control + download-button edits and deleted run 2's only conflict). Sequence only when the edits are too large to co-own.
2. **Shared un-isolable resources (from the profile):** work touching a shared singleton (one test DB, a migration chain) concentrates into **one tick or chain per wave** — "never two DB-touching ticks in the same parallel wave" generalized to any post-merge-venue resource.
3. **Cold-start cohesion (from the gate):** small, same-subsystem ticks group into **warm-chains**; only hour-scale or genuinely unrelated work earns fresh parallel implementers.
4. **Vertical slicing is demoted to the default *within* a constraint group** — the right shape when no surface says otherwise, overridable across feature lines when surfaces conflict with taxonomy (run 3's E3: DB-together horizontally, contracts-together, UI-seam-together, edge-function-alone).

**Consequence:** partitioning, dispatch modes, and verify venues become one joint decision against the profile, not pipeline stages. The work-to-file matrix becomes a **work-to-constraint matrix** (files + resources + cohesion).

**Evidence status (honest):** derived from one observed instance (run 3 E3, 0 conflicts, ~20m saved) plus first-principles unification of rules the skill already carries separately (lockfile serialization, wave-safety, foundation extraction, DB doctrine, chain heuristic). No dedicated experiment needed — P8 codifies what the P7 engine already did; the next real project validates it incidentally.

**Diff surface:** `tick-patterns.md` (partitioning procedure: constraint matrix, seam-merge preference, resource clustering, vertical-slicing demotion), `SKILL.md` (parallel-design section: name the doctrine), `agent-runner.md` (planning tier: co-design with the gate). Skill-prose only.

### P4 — Full rewrite: devmeta v4 as a native skill
Rewrite DevMeta as a proper skill (SKILL.md + references, progressive disclosure) that adopts ticks' execution protocol wholesale (per-tick worktrees, roles, tiers, structural skeleton) but keeps DevMeta vocabulary and the record system as first-class protocol steps. Reference the ticks skill's files rather than copying them.
Pros: maximum control and coherence. Cons: you become the maintainer of a second orchestration protocol that will trail upstream. Only worth it if you decide to *diverge* philosophically (e.g., keep feature-level workers).

### P5 — Convention only, no new skill
Stock ticks skill + a planning-template document in `.devmeta/` ("when planning an increment, create a project + epics like this, with these close-out descriptions"). Zero code. Weakest guarantees — nothing invokes the template automatically. Fine as a stopgap while building P1.

### P6 — Execution-readiness contract + inferred project profile (from the live run; upstream candidate)

*Added 2026-07-06, encapsulating the section-9 findings from the first synthesized-ticks benchmark run.* Where P3 fixes the **close** of the loop (record-keeping at boundaries), P6 fixes the **start**: today the skill quietly cannot deliver its headline feature — tick-grain parallelism — for any deps-bearing repo, because a git worktree is an isolated *source* tree, not a *runnable* one, and because test suites that share a singleton resource cannot verify concurrently. The live run proved it: 2.4× faster to F1+F2 than devmeta-ng, but with a fully linear git graph — the parallelism lever was never pulled.

Four pieces, one contract:

1. **Runnable worktrees.** The dispatch lifecycle gains a step: *create → **provision (make runnable)** → dispatch → verify → merge → cleanup*. Stated as a goal, ecosystem-agnostic ("a fresh worktree must be runnable and, for parallel waves, test-isolated, before an implementer works in it") — never as a hardcoded command.
2. **Two-mode verify.** Test tiers are classified *parallel-safe* (per-tick verify in the worktree, today's model), *isolable* (per-tick after per-worktree resource provisioning), or *shared-singleton* — where verification **moves to the orchestrator, post-merge, serially**: merge tick → run suite → green → merge next, preserving per-tick attribution. This consciously amends the "implementer verifies before DONE" invariant for the shared tier; the skill's existing post-merge wave check is promoted from safety net to primary gate.
3. **Inference-primary characterization — the framework figures it out; the human authors none of it.** A **project-start step** loads what is already known (profile, learnings, CI/test-runner config, package manager), detects staleness, and generates/updates a **maintained project execution profile** (e.g. `.tick/profile.md`): runnability recipe, per-worktree provisioning recipe, test-tier map with parallelism classification, resulting verify-mode, confidence per item. Idempotent and incremental — a self-maintaining `/init` for *execution* characteristics. **Safety-biased**: parallelize only on positive proof of isolation; absence of evidence of sharing is not evidence of isolation. Maintained at retro when an epic's diff touches the build/test setup. Config is demoted to the one thing inference cannot see: out-of-repo shared resources (staging DBs, rate-limited APIs) and confirmed mis-inference corrections.
4. **Test-parallelism as a planning input.** The wave predicate expands from *disjoint files* to *disjoint files AND (no shared un-isolable test resource OR serial post-merge verify) AND runnable in parallel*. Usually a project-level verify-mode; per-tick resource matrix only when multiple isolable resources exist. The isolate-vs-serialize choice is an architectural call made in the breakdown, not a runtime scramble.

**Allocation** (the settled division): the **skill** owns the contract (provisioning step, two-mode verify, characterization step) — fundamental, generic; the **profile** records and maintains the inferred facts; **planning** consumes them; **learnings** keeps ad-hoc gotchas as before; **config** only declares out-of-repo facts; the **binary** stays out (at most optional worktree-lifecycle naming helpers — provisioning is execution, which ticks disclaims).

**As an upstream pitch, P6 is stronger than P3**: it unblocks ticks' selling point for every real-world repo (node_modules / venv / target-dir all hit this), it is Phase-1 skill-prose-only except the profile artifact convention, and the live benchmark run supplies the evidence ("your engine won on ceremony and tiering, and left its main lever untouched — here is why, and the fix"). P3 and P6 compose: P3 gives boundaries durable outputs; P6 gives waves real inputs.

**Red-team pass (2026-07-06) — blind spots found in P6-as-drafted, and their fixes (folded into the fork implementation):**

1. *Merge-then-verify dirties integration.* "Merge → test → next" discovers a shared-tier failure **after** the merge landed; integration sits red. Fix: verify on a **merge candidate** — `git merge --no-commit`, run the shared tier, commit on green / abort on red. Attribution preserved, no red integration commits.
2. *DONE/close semantics fork silently.* In serial-verify mode, implementer `DONE` no longer means "acceptance verified", and "no known-failure closes" breaks unless the close moves. Rule: in serial mode `tk close` happens **after the post-merge green**, not on the DONE report; DONE means "implemented + in-worktree tiers pass".
3. *Attribution is a heuristic.* Green-before/red-after points at the just-merged tick, but the root cause can be an earlier tick's latent bug exposed by this one (semantic conflict). The fix may land in either tick; the protocol must say so.
4. *Static staleness detection has false negatives.* A new test hitting a fixed port changes testability without touching anything that looks like "build/test setup". Add a **runtime tripwire**: flaky or nondeterministic parallel verifies ⇒ downgrade the tier's classification to shared-singleton immediately and note it in the profile — don't wait for input-hash invalidation.
5. *Shared-deps provisioning is mutable shared state.* A junctioned/symlinked dependency dir breaks if any implementer runs an install mid-task. Add an explicit **no-install boundary** for implementers under shared-deps provisioning; dependency-adding ticks get private provisioning or run solo (extends the existing lockfile-serialization rule from commits to the acts themselves).
6. *"Isolable" is an economic choice, not a free tier.* N per-worktree test DBs cost RAM/ports/startup; sometimes serial post-merge verify is cheaper than paying for isolation. The profile records the cost; the orchestrator chooses isolate-vs-serialize per run.
7. *Claude adapter ordering gap (the exact run-1 failure).* Under `isolation: "worktree"` the harness creates the worktree at agent launch — the orchestrator cannot provision first. Resolution: implementer **self-provisions as its first step** from the profile recipe, or the orchestrator pre-creates worktrees manually (deterministic naming) and dispatches without isolation. Adapter must say this explicitly.
8. *Three overlapping knowledge files will drift.* Profile vs learnings vs config need routing: the retro's promote-by-tier table gains a **profile destination** — execution characteristics (build/run/test/parallelism facts) go to `.tick/profile.md`, not learnings; learnings keeps ad-hoc gotchas; config keeps only out-of-repo facts.
9. *"Two modes" is the wrong shape.* It is a per-tier **venue map** (each test tier → in-worktree or post-merge), not a binary run mode: typecheck/lint/unit stay in worktrees even when the integration tier goes serial. The profile records `tier → venue`, and "serial post-merge" is just the venue of the shared tier.
10. *Degenerate cases.* No test suite at all → the venue map holds only build/typecheck gates; first-run discovery must happen solo before wave 1 (foundation tick or orchestrator-primed) so N agents don't race the discovery.
11. *Over-provisioning — no economic gate (2026-07-06 follow-up).* The heavy-lift worry: full provisioning can be expensive (an `npm ci` per worktree is minutes × N; per-worktree test DBs cost RAM/ports/startup), and run 1 proved sequential is not catastrophic — it beat the old engines ~2.4× to F1+F2 with zero parallelism. **Parallelism is a marginal win on top of the ceremony/tiering wins, not the whole value**, so over-eager provisioning can cost more than it buys on narrow waves of small ticks. The existing dampeners (venue map shrinks what a worktree must support; "isolable is a cost decision"; cheap-sharing recipes; deliberate sequential stays legitimate) cover most of it, but the skill said "choose per run" without a decision rule. Fix: an explicit **economic gate** — provision a wave wide only when the expected saving, roughly *(wave width − 1) × average tick duration*, clearly exceeds the total provisioning cost the profile records. A 2-wide wave of ten-minute ticks fails; a 3-wide wave of hour-long features passes easily. When it fails, sequential is the *correct* choice — deliberate and noted. P6's obligation is "never **silently** lose parallelism," not "always pay for it."
12. *No amortizer — pool worktrees.* Create/provision/destroy per tick multiplies provisioning cost by tick count. Fix: reuse provisioned worktrees across ticks and waves (reset to the integration commit between ticks, new branch per tick); one provisioning then pays for many ticks, and cleanup happens at pool retirement (epic end), which also shifts the economic gate's arithmetic toward parallelism on long epics.

## 7. Design decisions inside the synthesis (whichever proposal)

1. **Let the feature layer go.** Features existed to fit work into one subagent context. Ticks' answer — self-contained tick descriptions + foundation-first partitioning + vertical slicing — is better and finer-grained. Sequential chains via `--blocked-by` reproduce "sequential tasks within a feature" when genuinely needed.
2. **Stop pruning closed ticks.** Closed tick JSONs (+ notes, close reasons, activity) become the machine layer of the historical record; the markdown reports remain the narrative layer. Two layers, both git-tracked.
3. **Keep PR-per-iteration, drop PR-per-feature.** Epic branch = iteration branch; one PR per epic into the base branch, `--merge` not squash (both frameworks agree squash destroys the audit trail). Encode in `.tick/config.md` Rules.
4. **Keep the interactive scoping dialogue** — it's DevMeta's second-best asset and ticks has nothing like it. It also produces the epic definitions of done that make the whole run goal-compatible/hand-off-safe.
5. **Adopt tiering immediately** — even before any other change, dispatching mechanical ticks at economy tier is a free speed/cost win DevMeta never had.
6. **Adopt the 150-line learnings cap.** Migrate `.devmeta/lessons-learned.md` content: operational gotchas → `.tick/learnings.md` (capped), architectural knowledge → `docs/`, rules → CLAUDE.md — exactly the retro's promote-by-tier table, which is DevMeta's own Step 2 categorization sharpened.
7. **Increment completion report** = the project checkpoint's stop message; write it to the increment dir before stopping.

## 8. Recommendation

**P1 now, P3 in parallel.** Build the two-command overlay (start-increment + go) on the stock ticks skill; author the record contract into project/epic/close-out tick descriptions at planning time; bridge `.devmeta/devmeta.md` → `.tick/config.md`. Simultaneously open the upstream conversation about config-file lifecycle sections — the repo's philosophy suggests it would land. Avoid forking (P2) and a full rewrite (P4) unless upstream stalls.

*Updated 2026-07-06, post-live-run:* lead the upstream conversation with **P6** (execution-readiness contract + inferred project profile) and bring **P3** alongside it — P6 unblocks ticks' headline feature and carries benchmark evidence; P3 rides the same PR shape. Locally, both are already realized: P1′/P3 in the fork's skill edits, P6's lessons folded into the next run's setup.

What you keep: predictability (cadence now enforced *structurally* by project/epic/close-out ticks — stronger than prose), the increment record dirs, the local-adaptation hook, deep I&A (inside close-out ticks). What you gain: tick-grain parallelism, model tiering, drift-proof resume, upstream maintenance, cross-runner portability, human gates. What you give up: the feature layer and the PR-per-feature ceremony — both of which are the slowness.

## 10. Run 2 verdict (2026-07-06): P6 validated end-to-end

*(Chronologically follows section 9 — kept adjacent to the recommendation for visibility.)*

Run 2 (`bench/tix-synthesis-2`, atomic-crm, same brief, **zero seeded knowledge** — no Testing/Environment config, no learnings, no profile) delivered the **entire increment F1–F5 in 3h 52m** (46 commits, ~18 subagents, 0 human interventions), stopping at the project checkpoint as designed. Comparison:

| Run | Scope | Wall-clock | Git graph | Interventions |
|---|---|---|---|---|
| devmeta-ng / devmeta-3 (June, old models) | F1+F2, stalled at 1.2 | ~5.5–6.5 h | linear | multiple restarts |
| Run 1 — synthesis pre-P6 | F1+F2, stopped mid-F3 | ~2h 37m | linear (no parallelism) | 0 |
| **Run 2 — P6** | **F1–F5 complete, all epics closed** | **3h 52m** | **three 3-wide parallel waves** | **0** |

Every P6 mechanism fired and is evidenced in-repo:
- **Auto-bootstrap:** `.tick/profile.md` inferred at step 0.5 with a solo probe — including hazards no prior run knew (tsBuildInfo writes-through-junction → `--incremental false`; never `rm -rf` a junction). Independently re-derived everything run 1 had been hand-fed (ESLint-gate/prettier noise, cosmetic supabase 404) plus the functions-vitest config.
- **Provisioning recipe:** junction `node_modules` from the main checkout — near-zero cost, validated before wave 1; no-install boundary held; cleanup respected the junction hazard (main checkout intact).
- **Venue map, safety-biased:** typecheck+lint in-worktree; vitest (browser singleton), migrations (:54322 singleton), build → post-merge serial. Zero tripwire downgrades.
- **Economic gate, per wave, with arithmetic** (recorded in the completion report's parallelism postmortem): ≈15s provisioning vs 40–70 min savings → three 3-wide waves; pooling assessed and skipped as a *noted* call; zero silent degradations.
- **Candidate-merge integration:** serial merges, post-merge gates green first-try in E1/E2; in E3 the predicted `QuoteShow.tsx` seam produced exactly one mechanical conflict (~2 min, resolved per the skill's allowance; the shared FakeRest file auto-merged).
- **Learning loop closed measurably:** run 1's mid-run hand-fixed view-grant bug became run 2's proactively-prevented non-event, from a learnings rule the run authored itself one epic earlier — and E2's contract implementer *proved* the fix (`set role authenticated; select…`) unprompted.
- **Record contract:** three ia-cycle retros, per-epic history narrative, three tags, overview maintained, `completion.md` with gates status + postmortem + metrics scaffold; closed ticks unpruned.

Artifacts: `.tick/profile.md`, `.devmeta/increments/increment-2-par/completion.md` (+ `ia-cycles/`), tags `bench-par-*`. Open items were correctly left human: interactive Gate-5 smoke, the pre-existing Prettier/CRLF decision, `tk close urf`. **Caveat for the benchmark claim:** run 2 vs the June runs confounds engine and model generations — a calibration run of the *original devmeta* on current models (planned: `bench/devmeta-calib`) isolates the engine effect.

## 11. Calibration verdict (2026-07-06, `bench/devmeta-calib`): original devmeta × current models — and a surprise

**The run completed the full brief** — the first original-devmeta run ever to do so: F1–F5 shipped, five iterations + five I&A cycles, tags `iteration-1-cal.1–.5`, all gates 1–4 verified per-iteration, increment closed with a completion report. Timeline (git-authoritative): start ≈09:05 → close 12:48 = 3h43m wall, **≈3h15m active** (minus the ~30-min stall gap). 35 commits, 71 tracker ticks, **1 human intervention**.

| F1–F5 complete | Original × June | Original × current | P6 × current |
|---|---|---|---|
| Wall-clock (active) | never finished (F1+F2 ≈ 5.5–6.5h) | **~3h15m** | 3h52m |
| Interventions | several restarts | **1** (boundary stall) | **0** |
| Tracker objects | — | 71 ticks | 22 ticks |
| Config required | hand-authored | hand-authored (seeded) | **none (inferred)** |
| Git graph | linear | linear (sequential) | 3× 3-wide parallel waves |

**Finding 1 — models dominate raw speed.** June's engines died at 40% scope after ~6h; the same engine on current models finished everything in ~3h15m. The bulk of run 2's speedup over June was model uplift, not engine.

**Finding 2 — the stall reproduced; continuation robustness is an engine property.** The session halted at the 1.1R→1.2 boundary ("Let me create its branch and start on T1" — then stopped), on the same models that crossed every boundary and checkpoint under structural continuation with zero interventions. Prose rules lose to tick-structural routing exactly where devmeta history predicted.

**Finding 3 — the surprise: warm-sequential edged out cold-parallel on raw time (3h15 vs 3h52).** Three honest causes: (a) the calibration was *seeded* with a hand config while P6 spent ~12 min bootstrapping its profile; (b) P6 paid its machinery costs (probe, per-candidate serial gates, three frontier adversarial reviews); (c) most importantly, **the cold-start tax**: calib's single warm worker did tasks in ~4–9 min that cost run 2's fresh per-tick implementers 20–35 min each, because a warm worker amortizes codebase understanding across tasks while every fresh implementer re-reads the world. On narrow waves of small ticks with fast models, that tax cancels the parallelism dividend.

**Implication — the economic gate is incomplete (P6 refinement #2).** The gate priced *provisioning* but not *cold starts*. True comparison per wave: `width × cold-tick-time (parallel, wall = max + serial gates)` vs `Σ warm-task-time (sequential, one context)`. The refined rule: parallelize when ticks are large enough that cold-start amortizes (hour-scale, deep work) or the wave is wide; hand a chain of small related ticks to **one warm worker** instead. This empirically vindicates the "feature-worker mode" that Peter's own execution-model-v2 spec deferred as open question #1 — the synthesis should propose it as a *third dispatch mode* (solo-tick / parallel-wave / warm-chain), selected by the same economic gate. DevMeta's feature-as-unit-of-context, which the synthesis discarded, turns out to encode a real economy the tick-pure model lacks.

**What P6 retains decisively:** zero interventions (structural continuation), zero-config bootstrap, machine-checkable resume, 3× less tracker ceremony, worktree isolation as a safety property (calib's shared-tree was safe only because sequential), and the parallel headroom for briefs wider than this one. **What the original engine proved it still owns:** warm-context throughput and a narrative record that demonstrably transferred knowledge across iterations (the cents→whole-currency flag from 1.1R landed correctly in 1.3's trigger).

Environment note: the engine adapted to the unpushable `origin` by merging locally without PRs — same de-facto behavior as June; logged as environment, not intervention.

## 12. Run 3 verdict (2026-07-06, `bench/tix-synthesis-3`): P7 validated — with honest margins

Run 3 (P6+P7, zero seeded knowledge, identical setup to run 2) delivered **F1–F5 complete in 3h10m** (first artifact commit 13:46 → checkpoint 16:57; 34 commits; **0 interventions**; 283 tests passing; gates 1–4 green, gate 5 human; tags `bench-wch-f1/f2/e3`; full record trail incl. per-epic dispatch-mode ledgers and a checkpoint dispatch postmortem).

| F1–F5, identical brief | June | Calibration (orig × current) | Run 2 (P6) | **Run 3 (P6+P7)** |
|---|---|---|---|---|
| Wall-clock | DNF (~6h → 40%) | ~3h13m active* | 3h52m | **~3h10–3h22m*** |
| Interventions | several | 1 (stall) | 0 | **0** |
| Merge conflicts | — | — (sequential) | 1 mechanical | **0** (seam eliminated at planning) |
| Isolation / records / bootstrap | none / rich / hand-config | none / rich / hand-config | full / full / inferred | **full / full (+ledgers) / inferred** |

\* Measurement-basis honesty: the calibration's first commit *excludes* its ~25-min bootstrap while runs 2/3's first commits *include* theirs; on a session-kickoff basis all three land within ±10 min of each other's noise floor (run 3 also ate a ~12-min one-time browser-hang). **Verdict: run 3 decisively beats run 2 (−40m+) and statistically ties the calibration on time** — while dominating it on every non-time axis (0 vs 1 interventions, isolation, inferred bootstrap, machine-checkable resume, 3× less tracker ceremony was run 2's number and run 3 stayed lean at 20 ticks).

**The falsifier did not fire** (run 3 is not slower than the calibration), and the primary claim lands in its strongest form: **P7 recovered the warm-context economy that made the original engine fast, without giving back any of P6's structural wins.** The gate used **all three dispatch modes**, each where its arithmetic won: E1 = one warm-chain (1 cold start instead of 3–4); E2 = foundation-chain then **parallel warm-chains** (measured: saved ~9.5m); E3 = two parallel-waves (saved ~17m + ~3m). Measured warm/cold ratio ≈ ⅓–½, confirming the calibration prior.

**The unplanned discovery — constraint-surface partitioning.** The pre-registered hypothesis ("parallel warm-chains one per feature for E3") was beaten by the engine itself: it regrouped **across features by constraint surface** — all DB work in one tick (singleton), pure-TS contracts together, and **the `QuoteShow.tsx` seam merged into a single tick**, structurally eliminating the conflict that was run 2's only integration hiccup. Partitioning by what actually constrains concurrency (shared resources, shared files, cold-start economics) rather than by feature taxonomy is a better doctrine than the one we wrote; it should be promoted into the skill's planning guidance.

**Noise floor caveat:** each cell is a single run; ±10–15 min swings from environmental one-offs (browser hangs, registry traps) are within observed variance. The robust conclusions are the structural ones — interventions, conflicts, records, bootstrap — plus the direction and rough magnitude of the P7 time effect vs run 2.

Method note — shared-DB contamination check: the local Supabase singleton persists across branches, so each run inherits its predecessor's schema (run 2 inherited run 1's, calib inherited run 2's, run 3 inherits calib's — the dirty-start condition is *uniform*, hence not a bias). Forensics: the calibration authored a fully independent migration set (no file overlap with run 2's), `supabase db diff` generates from the branch's migration history via shadow DBs (leftover live-DB tables provide no shortcut — if anything they obstruct `migration up` until a reset), and every iteration's gate re-validated "applies on a **fresh** reset", which replays only the branch's own migrations. Conclusion: no cross-run DB advantage; the calibration's one real asymmetric edge remains the hand-seeded config (finding 3a).

## 9. Live-run finding (2026-07-05): the worktree-parallelism gap, and where to fix it

The first synthesized-ticks benchmark run (atomic-crm, Quotes & Products) reached F1+F2 in ~2h37m vs ~5.5–6.5h for devmeta-ng/devmeta-3 to the same point — but the git graph is **fully linear, zero worktree branches**. The engine ran everything **sequentially in the shared tree**; the tick-grain parallelism lever was never pulled. So the speedup came from less ceremony + model tiering + a tighter self-correcting loop, **not** from parallel worktrees.

**Root cause (not what it looks like).** It isn't "`isolation: worktree` is broken." A git worktree is an isolated *source* tree, not an isolated *runnable* tree: `node_modules` (gitignored, npm, hundreds of MB) is absent in a fresh worktree, and the repo's vitest runs single-instance chromium browser mode. So a worktree agent literally can't `npm test` without a slow `npm ci`, and two can't test concurrently. The orchestrator correctly refused to ship untested code and fell back to shared-tree sequential. "Isolation didn't engage" is the *symptom*; "worktrees aren't runnable or parallel-test-safe out of the box" is the *cause*. This is a **general** gap (any node_modules / venv / target-dir ecosystem hits it), not repo-specific.

**The missing thing is a step, not a command.** The ticks execution model teaches *create worktree → dispatch → verify → merge → cleanup*. It never teaches *make the worktree runnable* or *make N concurrent verifies not contend*. The implementer prompt even says "run the tests named in acceptance" but never "install deps first" — it silently assumes a runnable tree. Redefining "isolated" to mean **isolated *and runnable*** is the fix, and that redefinition is fundamental → it belongs in the skill, not config.

**Fix allocation — generic mechanism, project recipe discovered and recorded.** The provisioning "how" must never be hardcoded per-ecosystem in the skill *or* config. The skill states a goal ("make it runnable/testable"); the run discovers the project-specific recipe and records it in learnings; config is only an optional seed.

| Layer | Owns | Rationale |
|---|---|---|
| **Skill / adapter** (fundamental, generic) | A goal-stated imperative in the dispatch lifecycle: *"a fresh worktree must be made **runnable** (deps/env present) and, for parallel waves, **test-isolated** (no shared singleton the concurrent verifies contend on) before an implementer works in it. The recipe is project-specific: apply the one recorded in `.tick/learnings.md`; if none exists, do whatever the project needs, confirm the tests run, and **record the recipe in learnings** so later worktrees and runs skip the discovery."* Ecosystem-agnostic — never names npm/pip/cargo/mklink. Plus one implementer-prompt line to self-provision from learnings. | Mechanism + invariant, not a command. Belongs where worktree create/cleanup already live. |
| **`.tick/learnings.md`** (default home for the recipe) | The *discovered*, project-specific recipe in the normal Problem→Cause→Rule format — e.g. "node_modules is gitignored → junction/symlink it from the main checkout; vitest browser mode is a singleton → headless + per-worktree port." Accumulates once, reused thereafter. | Exactly what learnings is for, and it's already read fresh by every implementer (prompt step 1) and at planning, already capped/compacted. **Self-bootstrapping**: no human needs the recipe up front — the agent discovers it (a failed test reporting "node_modules missing" is a discoverable signal) and records it. Matches DevMeta's self-learning ethos: discovered once, then free. |
| **config.md `## Worktree setup`** (optional seed) | An *optional* up-front declaration of the recipe, for teams that already know it and want run-1 determinism (skip the discovery cost). | Purely additive override; absent → learnings is the home. Still project-command content, never fundamental. |
| **Core binary `tk`** (optional) | At most worktree *lifecycle* helpers (deterministic naming, create/cleanup), **never** provisioning (execution ticks disclaims). | Unchanged. |

So the fundamental, generic part ("make it runnable, record what that took") is **skill**; the project-specific recipe self-accumulates in **learnings**; config is an optional seed. Nothing ecosystem-specific is baked into the mechanism, and nothing fundamental lands in config — the whole ask.

**Bootstrapping under parallelism.** Discovery must happen *once* before the first parallel wave, or N implementers rediscover it and race on the learnings write. Two clean alignments: foundation-first partitioning usually makes wave 1 a single foundation tick (discovery happens solo, recorded before any parallel wave); or the orchestrator primes the recipe at first-worktree creation. Waves 2+ then read the recorded recipe and apply it in seconds.

**What this run *would* have recorded.** With the generic instruction in place, the first worktree attempt on atomic-crm would have hit "tests can't run — node_modules absent," made the tree runnable (a `node_modules` junction/symlink from the main checkout is one near-instant option, safe because dep-changing ticks are already serialized by the lockfile rule), noted the vitest browser-mode singleton needs per-worktree isolation, and written both to `.tick/learnings.md` — after which a 3-wide wave self-provisions from that recipe. Instead, lacking the instruction, the run fell back to shared-tree sequential and recorded *that workaround* in project-history: the finding is captured, just as a serialization note rather than a reusable provisioning recipe.

**Test parallelism is a *second, separate* axis — and the orchestrator, not the implementer, owns it.** "Runnable" and "test-parallel-safe" are different constraints, and conflating them hides who can discover each:

- **Runnable** (deps/env present) is a *per-worktree* property. Either party discovers it — a solo implementer's test fails loudly ("module not found"). Recorded in learnings; provisioned per worktree (above).
- **Test-parallel-safe** (no shared test DB / fixed port / singleton service that concurrent runs corrupt) is a *cross-tick* property. **The implementer is structurally blind to it** — running solo in its worktree it sees green; the contention exists only *because* siblings run at the same time. Only the **orchestrator** sees the concurrency, so only the orchestrator can discover it — and it discovers it the hard way (per-tick runs pass, but the post-merge suite fails or goes flaky) unless it is declared up front. So: **declare it in config.md if known** (mark which test tier shares state); otherwise the orchestrator discovers it from a broken/flaky wave and **records it in learnings**, which then also feeds *planning* (serialize the contending ticks, or plan for post-merge verify).

**When the suite can't parallelize, split implement from verify.** A shared-test-DB suite cannot run N-concurrently in worktrees, so verification must move *out* of the parallel implementers and onto the merged tree, serially. The right shape:

1. **Implement** all wave ticks in parallel worktrees (the expensive part still parallelizes).
2. Each implementer runs only the **parallel-safe** subset in isolation (typecheck, lint, pure unit tests) — cheap sanity, no shared resource.
3. **Integrate serially, test per merge:** merge tick 1 → run the shared-resource suite on the merged tree → green → merge tick 2 → run → … A failure attributes cleanly to the just-merged tick (green before, red after).
4. A failure at step *k* redispatches tick *k* (rebase on integration head, fix, re-merge, re-test).

This preserves attribution *and* resource-safety *and* parallel implementation — the only serialized part is merge-plus-integration-test, which is inherently serial when the test resource is shared. It is a real change to the ticks invariant "the implementer verifies before reporting DONE": for the non-parallel-safe test tier, **verification moves to the orchestrator, post-merge**. The model already holds the seed — "verify the wave after merging; two branches can merge clean and still break each other" — this promotes that post-merge verify from a safety net to the *primary* gate for shared-resource suites, and makes it per-tick-serial for attribution.

Ownership, then: the **skill** carries the two-mode verify contract (parallel per-tick verify when test-isolated; serial post-merge verify when not) — fundamental, generic. The **orchestrator** classifies the suite (discovering it if undeclared). **learnings** records the classification (and the per-worktree isolation recipe if one exists). **config** optionally declares the classification up front. The **binary** stays out. Note the clean three-way split of test tiers: *parallel-safe* (unit/pure) → per-tick in-worktree; *isolable* (DB-per-worktree spinnable) → per-tick after per-worktree provisioning; *shared-singleton* (one test DB/service) → serial post-merge, orchestrator-owned.

**Does test-parallelism belong in the high-level breakdown? Yes — the breakdown's job *is* to decide what runs at once.** Partitioning today optimizes one concurrency hazard (file collisions at merge); a shared un-isolable test resource is the same *kind* of hazard at a different phase (collision at verify). So the definition of a "wave" — "ticks that can run at once" — expands from *touch disjoint files* to *touch disjoint files **and** (share no un-isolable test resource **or** verify serially post-merge) **and** are runnable in parallel*. Same machinery, richer safety predicate. Three refinements on how it enters planning:

1. **Usually a project-level *mode*, not a per-tick attribute.** File-sharing is per-tick (which files this tick edits). Test-resource-sharing is most often global — the whole integration tier shares one DB — so it sets the run's *verification strategy* (parallel per-tick vs serial post-merge), which the planner must know because it redefines what "parallelize" even means. Only when a project has *multiple isolable* test resources does it become a genuine per-tick partition input: a resource matrix beside the file matrix (serialize ticks sharing resource X, parallelize across disjoint ones).
2. **Softer than file-disjointness — it offers a choice.** A file collision *must* serialize (no escape). A test-resource collision resolves *either* by serializing verification *or* by isolating the resource (DB-per-worktree). Which one is an architectural call — and architectural calls belong in planning, not a runtime scramble. That is the strongest reason to hoist it into the breakdown: the planner decides "stand up per-worktree test DBs, or accept serial verify?" up front, because that choice sets the achievable parallel frontier.
3. **Inferred at run start, not hand-declared.** The framework *infers* the classification by analyzing the project before wave 1 (a read-only characterization task at planning tier), rather than waiting for a human to write it down.

**Inference-primary (2026-07-06): the framework figures it out, uses it, and maintains it — the human does not hand-author it.** A capable agent characterizes a project's testability far more reliably than a human remembers to: static analysis of the test setup surfaces per-test transactions / schema-per-worker / testcontainers-per-worker (→ isolable) versus a fixed `DATABASE_URL` / singleton fixtures / fixed ports (→ shared singleton), and trivially reads the package manager + gitignore for runnability. So the **source of truth is inference recorded in learnings**, not a declaration in config. Three properties make this safe and durable:

- **Safety-biased.** The errors are asymmetric: inferring "parallel-safe" wrongly corrupts a wave or ships a silent race; inferring "not safe" wrongly costs only speed. So the rule is *parallelize only on positive proof of isolation* — absence of evidence of sharing is **not** evidence of isolation, and defaults to serial post-merge. "I didn't see a shared DB, so it's fine" is exactly the optimistic error to forbid.
- **Recorded, not frozen — a cache, not a fact.** The inference lands in learnings so it isn't re-derived every run, but it is *invalidated and re-characterized* when its inputs change (test runner / harness / deps change). The close-out retro is the natural maintenance hook — it already reads the epic diff, so it re-characterizes when the diff touched the test setup. Same spirit as ticks' derived `target_date` signal: computed, never a stale hand-entry.
- **Config demoted to a narrow override.** Config keeps exactly one residual job: stating what the repo *cannot reveal* — an out-of-repo shared resource (a staging DB, a rate-limited external API) that no static analysis can see — or correcting a confirmed mis-inference. It is a fallback for the inference's blind spots, not the source of truth.

So the loop is **infer → (safety-bias) → record → consume in planning (waves + verify-mode) → maintain at retro**, config as an optional override for out-of-repo facts only. The **orchestrator** does the inference (a cheap read-only characterization sub-agent — the exploration-tier pattern planning already uses); the **breakdown** consumes it; the **skill** enforces the two-mode verify contract; the **binary** stays out. The human implementer authors none of it.

**The mechanism: a project-start characterization step (2026-07-06).** The inference is not something each wave re-does ad hoc — it is a first-class **project-start step** that *sees what is already known, then generates or updates the understanding*:

1. **Load what's known** — the existing project profile (if any), any config overrides, `.tick/learnings.md`, `CLAUDE.md`/`AGENTS.md`, CI config, the test-runner config, package manager + gitignore.
2. **Detect staleness** — compare the recorded characterization against the current commit / deps / test-harness state; re-derive only what changed, keep everything still confirmed.
3. **Generate / update** — fill missing pieces, refresh stale ones: runnability recipe, per-worktree provisioning recipe, test-tier map with the (safety-biased) parallelism classification, the resulting verify-mode, and a confidence per item.
4. **Persist** — write the updated understanding so planning consumes it and later runs start from it.

It is **idempotent and incremental**: the first run generates the profile from scratch; later runs mostly validate and refresh it (near-free when nothing changed). This gives the inference-primary model a name and a home — a *maintained project execution profile*, distinct from `.tick/learnings.md` (which stays for ad-hoc Problem→Cause→Rule gotchas) because it is *structured* and *re-derived on input change* rather than appended. It can be a dedicated artifact (e.g. `.tick/profile.md`) or a structured section of learnings; the dedicated artifact is cleaner because its maintenance trigger (inputs changed) differs from a gotcha's (discovered once). Think of it as a self-maintaining `/init` for the project's *execution* characteristics (build / run / test / parallelism), not its architecture.

Closed loop: **characterize at project-start (generate/update) → record in the profile → consume in planning → maintain at retro when the diff touches the test/build setup**. Nothing hand-authored by the human; config is only the out-of-repo-fact escape hatch.

**Second, structural, missed-parallelism note.** This setup mapped each feature F1–F5 to a separate **epic**, and ticks' continuation model runs epics **sequentially** (epic→epic auto-continue). So even with working worktrees, F3‖F4‖F5 would not run concurrently at the epic level — cross-epic parallelism isn't a thing the engine exploits. To get a genuine 3-wide wave, the independent features should have been **parallel implementation ticks inside one epic**, not three epics. Setup lesson for the next run; orthogonal to the worktree fix (which governs within-epic wave parallelism).

**Upstream implication.** This is a stronger candidate to raise with Peter than the record-keeping hooks (P3): it unblocks ticks' *headline* selling point (tick-grain parallelism), and today the skill quietly can't deliver it for any deps-bearing repo. Same "Phase 1 skill-only" shape — the provisioning step + implementer-prompt line are pure prose; a `## Worktree setup` config section is the only new surface, and it's project-command content, not mechanism.
