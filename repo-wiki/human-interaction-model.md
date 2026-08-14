# Human Interaction Model (2026-08-14)

Decision: the human-interaction refinement landed as **skill-layer planning guidance only** —
`skills/ticks/references/tick-patterns.md` → *Human-in-the-loop ticks*, plus retro wiring in
`agent-runner.md`. No new tick fields, no CLI commands, no notification channel.

Governing principle, stated in the docs verbatim: **planning is interactive, execution is
autonomous.** Human attention is spent during planning, where the human is present and latency
is zero. A human tick surviving into execution should be one planning genuinely *could not*
resolve — not one nobody got around to. Corollary: planning quality is measurable as the
autonomy of the resulting graph.

Key semantics settled:
- **Three-way triage** of every anticipated human touchpoint at planning time: *resolve now*
  (questions — ask, record in `.tick/config.md` Rules or the tick description, create no tick),
  *do now* (human setup tasks — the API key, the DNS record — never become `--awaiting work`),
  *reduce* (approvals are post-work by nature; convert to a test, pre-authorize the expected
  case, agree the bar up front, or batch into the existing final-review tick).
- **Stated limit, to stop dogmatic application:** the rule is not "ask everything up front", it
  is "ask everything whose answer the work won't change". Forcing decisions that the work would
  have informed buys a worse answer plus rework.
- **Graph shaping for the survivors:** ask early / block late (wave-0 `--awaiting input` with no
  dependencies of its own), split around the decision so the human tick blocks the smallest
  committed choice, target the interface, and scrutinize every `--blocked-by` pointing at a
  human tick. Two graph-readable numbers: transitive dependents (minimize) and waves of slack
  (maximize), both visible via `tk graph`.
- **Self-correcting loop:** the epic retro harvests every mid-run `--awaiting input` /
  `--awaiting escalation` and asks "could planning have resolved this?" — planning misses become
  `.tick/learnings.md` rules; genuine surprises are named as such and dropped.
- Modality (phone-answerable vs desk-required) was decided to derive from **payload shape**
  (typed question + ≥2 options + bounded context), not from the `awaiting` type — `approval` on
  a dependency choice and `approval` on an 800-line diff are different animals. Only the
  authoring half of this shipped ("write the tick so it's answerable without reopening the
  repo"); nothing consumes the classification yet.
- **Question-asking mechanic** adapted from Matt Pocock's MIT-licensed `grilling` skill
  (github.com/mattpocock/skills, `skills/productivity/grilling`): model decisions as a tree, work
  it in rounds, ask the whole *frontier* (decisions whose prerequisites are settled) in one
  message with a recommended answer each, look facts up instead of asking, terminate when the
  frontier is empty. Two ticks-specific additions: a **pruning step** (drop branches whose answer
  the work will change — grilling has no such limit and will extract premature answers), and a
  **conversion step** (ticks planning ends at a graph, not at shared understanding). Written out
  once in `tick-patterns.md`; `goal-design.md`'s "grill me" deep pass now points at it instead of
  restating it as one-question-at-a-time, which contradicted the round-based form.
- Relationship to [goal-design](goal-design.md): same principle, different question. Goal design
  settles what *done* means; the triage settles the decisions the *work* depends on. Goal design
  runs first. The two files cross-reference each other.

Deliberately deferred (designed in discussion, not built):
- **Telegram/Slack channel** for phone-answerable questions with inline buttons wired to
  `tk approve`/`tk reject`, plus a no-button digest for desk-required work. User explicitly not
  ready to implement a channel. Transport choice was settled as *messaging channel* (not cloud
  board, not a pluggable abstraction) if and when it happens.
- **Strict park-and-continue** at runtime: the orchestrator parks a gated tick, re-plans the wave
  around it, and halts only when the feasible frontier is empty. Demoted to a safety net —
  correct graph topology makes it rarely needed, and a genuinely serial graph is unsaveable.
  Explicitly rejected: TTL defaults, speculative side-branches, headless resumption.

## Verdict provenance guard (fixed in this work)

`ProcessVerdict` closed an `awaiting work` tick on any `approved` verdict without checking the
actor, so an orchestrator could `tk approve` its own human tick — the DAG's "a human must do
this" edge had no teeth at the state-machine layer.

Settled design:
- **The state machine stays pure.** `ProcessVerdict(t *Tick)` has no actor and does not grow one;
  it is shared by the CLI, TUI, tickboard server and cloud client, which have different
  provenance stories (a keystroke IS a human). The check lives at the write path in
  `cmd/tk/cmd/verdictguard.go`.
- **Refuse runner-shaped actors** (colon-scoped, or ending in `orchestrator`) on: `tk approve`,
  `tk reject`, `tk update --verdict`, `tk close --force` over a `--requires` gate, plain
  `tk close` on an already-`--awaiting` tick, and an epic `--force` cascade over any gated child.
  `--actor` is provenance, not authorization, so it is inspected too. Routing a `--requires` tick
  with `tk close` is untouched — the agent's normal path.
- **`--from human` is the only attestation** and stamps the activity actor `human`, not the runner
  name — the same durable boundary `tk note --from human` established.
- **Explicitly not tamper-proof.** A local CLI cannot stop an agent from typing the flag. The
  guard removes the *accidental* self-approval and makes the deliberate one auditable; the
  epic-closeout **gate audit** (every gated tick has a human-actor entry in `.tick/activity/`,
  fail-closed) is the backstop. Chasing every bypass locally (`tk update --awaiting=`, direct file
  edits) was considered and rejected as a losing game — the audit catches those instead.

`tk close --force` was the surprise: it bypasses gates outright, and the routing error message
advertised it as the bypass. Guarding `approve` alone would have been cosmetic.
