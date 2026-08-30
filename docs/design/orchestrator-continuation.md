# Orchestrator Continuation: Decide-and-Log + External Supervision

Design spec for making long autonomous runs complete without mid-epic stalls. Doctrine half (shipped with this doc): `skills/ticks/references/agent-runner.md` → *Decide and log*, the chat-ban and PR-gate discipline rules, `run-charter.md`, and *Standing orders* in `.tick/config.md`. This doc specifies the mechanical half — the parts that need `tk` code or plugin hooks.

## Problem

Orchestrators stall mid-epic with questions for the operator or requests for approval to proceed, despite extensive anti-stall doctrine in the skill ("run continuously", "name the stall instinct", the operator-channel routing table). Field-observed 2026-08-30 across repeated long herdr runs, in **both** shapes herdr distinguishes on the orchestrator's pane:

- **`blocked`** — the orchestrator's harness raised an approval/question UI (often a tool-permission prompt: the orchestrator, unlike workers, is launched by hand without a full-auto template).
- **`idle`** — the orchestrator voluntarily ended its turn with an actionable frontier ("should I continue?", a summary instead of a dispatch, a stop after a close).

Two root causes, and neither is fixed by more prose:

1. **Continuation is 100% instruction-following.** Every anti-stall rule is text read at run start; by wave 3 it is buried under merge output and test logs, while the harness's own system prompt ("confirm before proceeding") is always recent. `.tick/learnings.md` already states the general law: *a boundary the substrate can enforce must not rest on instruction-following.*
2. **Asking discharges responsibility, and no competing act does.** Facing a judgment call, the model can silently guess (forbidden, and feels wrong) or ask (blocks the run). There is no sanctioned "I decided, here's why, review it later."

The fix is two-pronged: reduce stall **frequency** (give the model the competing act — decide-and-log, standing orders; shipped as doctrine, upgraded to a verb below) and cap stall **cost** (supervise the orchestrator from outside its own loop, so a stall becomes a nudge or a chime instead of hours of dead run). Instruction-following will never reach zero stalls; only the second prong bounds the damage.

## Mechanisms

### 1. `tk decide` — a first-class provisional-decision verb

Today's convention is `tk note <tick-id> "decision: <question> → <choice> — <why>"`. Promote it to a verb so it is structured, queryable, and surfaced without prose-parsing:

```bash
tk decide <tick-id> --question "…" --choice "…" --reason "…" [--class <standing-order-class>]
tk list --decisions [--epic <id>]     # every decision in scope, as a table / --json
```

- Storage: a typed note (`kind: decision`) on the tick — travels with `.tick/`, survives handoff, no schema migration beyond the note kind.
- Surfacing: `tk list --decisions` feeds the **Decisions taken** table that retro reports, checkpoint reports, and PR bodies must carry (doctrine already requires the table; the verb makes it mechanical). The mission-control board and `tk herd dashboard` can render a decisions count per epic.
- `--class` records which standing order authorized it, closing the audit loop: a decision with no class and no reversibility argument is what the retro flags for human review.
- Provenance: stamped with `TK_ACTOR` like every tracker write. A decision is never a gate-clear — `tk approve`/`tk answer` semantics are untouched, and the CLI refuses `tk decide` on a tick holding a `--requires`/`--awaiting` gate (that is the human's decision by definition).

### 2. `tk frontier --check` — the neutral continuation predicate

One question, answered mechanically: *is this run legitimately at rest?*

```bash
tk frontier --check [<epic-or-project-id>]   # exit 0: actionable work exists; exit 1: at rest
tk frontier [--json]                          # human/machine-readable: what is actionable and why
```

Actionable (exit 0): `dispatch.now` non-empty; an unblocked review or closeout tick; `tk next` returning `action: plan`; a settled-but-uncollected herdr worker (manifest present, no durable close); a merged-but-ungated wave (integrated gate evidence missing). At rest (exit 1): every open path ends in an `--awaiting` gate, a checkpoint boundary (autonomous mode off), or the roadmap is done.

The predicate is substrate- and harness-neutral: it reads only `.tick/` state, `tk graph`/`tk next`, and (when present) herd manifests. Everything that *enforces* it is a thin per-harness or per-substrate wiring:

- **Herdr (primary)**: the watchdog below.
- **Claude Code**: a Stop hook running `tk frontier --check`; exit 0 blocks the stop with the frontier summary on stderr.
- **Codex / Pi / Prime**: their equivalent turn-end or wrapper mechanism, each a few lines, documented in the matching adapter when built.

### 3. Herdr watchdog — supervision from outside the orchestrator's loop

The orchestrator is an agent in a pane; herdr pushes `pane.agent_status_changed` for it like any worker. The `herdr-ticks` plugin (already hooked on that event for badges and chimes) gains an orchestrator branch:

- **Registration.** The orchestrator's pane/agent identity must be known. `tk herd watch <agent-or-pane-id> --orchestrator` writes it into the run's manifest directory (`.tick/logs/herd/<epic>/orchestrator.json`); the run-start ritual gains this one line. (Subsumed by mechanism 4 when it lands.)
- **On `idle`:** run `tk frontier --check`. Actionable → `herdr agent prompt <orchestrator> "Frontier is actionable: <summary from tk frontier>. Continue per run-continuously; re-read run-charter.md."` Bounded: N nudges (default 3) with backoff, tracked in the manifest; exhausted → chime + operator-channel `tk tell` ("orchestrator idle with actionable frontier, nudges exhausted"). At rest → do nothing; the run is legitimately waiting.
- **On `blocked`:** never drive the UI (the worker rule holds for the orchestrator). Read the pane for the question text, park it as an agent-scoped question exactly as `tk herd wait --relay-blocked-after` does for a watched non-tick target, deliver it to the operator channel after the grace window, and prompt the answer back. Chime — a third notification sound alongside worker-blocked and wave-settled: *the run itself wants a human*.
- The nudge prompt is the context-decay countermeasure in mechanical form: the rule arrives as the most recent thing in the orchestrator's context, precisely when it matters.

### 4. `tk herd orchestrate <epic>` — the orchestrator as a spawned agent

The endpoint of "the orchestrator is an agent too": spawn it through the helper, with everything workers already get —

- the kind's **full-auto template** compiled into its argv (eliminating the permission-prompt `blocked` class mechanically);
- watchdog **registration** automatic (no manual `tk herd watch`);
- a launch prompt carrying the charter, standing orders, and the epic id;
- a manifest, so `tk herd reconcile` can classify a dead orchestrator and the resume argv is one command away.

Every piece (template compilation, content gate, manifests, pane supervision, relay) exists for workers; this is symmetry, not new machinery. Routing: `[roles.orchestrate]` in `runners.toml`, frontier tier by default.

### 5. Planning lint — unjustified gates

The gate-creation side of the stall: "resolve is the default; awaiting is the exception you justify" is doctrine with no check. Add a warning to `tk graph` (and a validation to the Pi planner's apply path): any `--awaiting`/`--requires` tick with no note stating why planning could not resolve it. Warning, not refusal — gates stay cheap to create interactively; the lint targets planner output.

## What this deliberately does not do

- **No auto-answering of approval UIs**, orchestrator or worker. Relay and chime, never synthesize consent.
- **No gate weakening.** `tk decide` refuses gated ticks; approval/input/escalation/work gates keep their exact semantics; autonomous mode still bypasses only checkpoints.
- **No new state store.** Decisions are typed notes; watchdog state lives in the existing gitignored herd manifest directory.

## Delivery sketch

1. **`tk decide` + `tk list --decisions`** — small, pure `tk`; unlocks the mechanical Decisions-taken table. (The doctrine already works today via `decision:` notes, so this is an upgrade, not a blocker.)
2. **`tk frontier --check`** — read-only aggregation over existing graph/next/manifest data.
3. **Watchdog hooks in `herdr-ticks`** + `tk herd watch --orchestrator` — depends on 2.
4. **`tk herd orchestrate`** — depends on 3; subsumes manual registration and launch templates.
5. **Planning lint** — independent; anytime.

Field validation for each: the measure is stalls-per-epic on real runs (both shapes, from `herdr agent explain` at stall time), before vs after. The 2026-08-30 baseline: both shapes occur routinely enough that the operator describes runs as "frequently stuck".
