# Goal Design (project-level goals, 2026-08-14)

Decision: goals became a **skill-layer-only** concept — `skills/ticks/references/goal-design.md`
plus wiring in SKILL.md / big-picture.md / agent-runner.md. No new tick fields, no CLI commands.
Rationale: `acceptance_criteria` was carrying two loads (task gates vs. epic/project goals), and
the Acceptance Evidence machinery already assumed enumerable `A<n>` items that were never
structurally items. The fix structures the convention, not the schema: fact sheets as
`[A<n>]`-marked lines in the project's `acceptance_criteria` (the Pi adapter already prefers
stable `[A<n>]` IDs), goal statement in the description.

Key semantics settled:
- Project checkpoint = fact-by-fact verification (same fail-closed evidence rules as epic
  closeout), human-judgment facts are the sign-off agenda.
- Autonomous mode: **verification failure outranks checkpoint flow-through** — all
  auto-verifiable facts pass + zero human-judgment facts, or stop and escalate.
- Goal-gap repair epics are proposed, never created unilaterally (roadmap changes stay human).
- `A<n>` IDs must be unique across containers — `.tick/config.md` Acceptance Evidence is one
  namespace and ambiguity fails closed.

Deliberately deferred: (a) structured acceptance items in the tick JSON schema — prove the
convention first; (b) per-container evidence scoping in the Pi closeout parser — needed only if
fact-sheet projects get heavy use. Protocol shape adapted from plannotator's setup-goal skill
(interview + fact sheet), which ticks was weak on, while keeping ticks' stronger execution and
verification machinery.
