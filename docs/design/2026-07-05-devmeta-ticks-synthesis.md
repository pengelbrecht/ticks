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

### P4 — Full rewrite: devmeta v4 as a native skill
Rewrite DevMeta as a proper skill (SKILL.md + references, progressive disclosure) that adopts ticks' execution protocol wholesale (per-tick worktrees, roles, tiers, structural skeleton) but keeps DevMeta vocabulary and the record system as first-class protocol steps. Reference the ticks skill's files rather than copying them.
Pros: maximum control and coherence. Cons: you become the maintainer of a second orchestration protocol that will trail upstream. Only worth it if you decide to *diverge* philosophically (e.g., keep feature-level workers).

### P5 — Convention only, no new skill
Stock ticks skill + a planning-template document in `.devmeta/` ("when planning an increment, create a project + epics like this, with these close-out descriptions"). Zero code. Weakest guarantees — nothing invokes the template automatically. Fine as a stopgap while building P1.

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

What you keep: predictability (cadence now enforced *structurally* by project/epic/close-out ticks — stronger than prose), the increment record dirs, the local-adaptation hook, deep I&A (inside close-out ticks). What you gain: tick-grain parallelism, model tiering, drift-proof resume, upstream maintenance, cross-runner portability, human gates. What you give up: the feature layer and the PR-per-feature ceremony — both of which are the slowness.
