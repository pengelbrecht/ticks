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

### 1. `tk decide` + `tk decisions` — a first-class provisional-decision verb *(shipped)*

The hand-rolled convention was `tk note <tick-id> "decision: <question> → <choice> — <why>"`. The verb makes it structured, queryable, and surfaced without prose-parsing (the note-line format is unchanged underneath, so hand-rolled lines from older runs still parse):

```bash
tk decide <tick-id> --question "…" --choice "…" --reason "…" [--class <standing-order-class>]
tk decisions [container-id] [--json]   # every decision in scope — the Decisions-taken table
```

- Storage: a structured `decision:` note line on the tick — travels with `.tick/`, survives handoff, no schema migration.
- Surfacing: `tk decisions` feeds the **Decisions taken** table that retro reports, checkpoint reports, and PR bodies must carry (doctrine already requires the table; the verb makes it mechanical). Scoped form walks the container's whole subtree; closed ticks included, because review-by-exception happens after the fact.
- `--class` records which standing order authorized it, closing the audit loop: a decision with no class and no reversibility argument is what the retro flags for human review.
- Provenance: stamped with `TK_ACTOR` like every tracker write. A decision is never a gate-clear — `tk approve`/`tk answer` semantics are untouched, and the CLI refuses `tk decide` on an *awaiting* tick (the parked question is the human's by definition). A `--requires` tick still accepts decisions: the gate routes it to a human at close, and the recorded decisions are exactly what that human reviews there.

### 2. `tk frontier --check` — the neutral continuation predicate *(shipped)*

One question, answered mechanically: *is this run legitimately at rest?*

```bash
tk frontier --check [<epic-id>]   # exit 0: actionable work exists; exit 1: at rest; 2+: the check failed
tk frontier [--json]              # human/machine-readable: what is actionable and why
```

Actionable (exit 0): a ready open tick (labeled `implement`, or `review`/`closeout` by its role); an unblocked childless epic (`plan`); a herd worker whose `RESULT-<tick>.md` exists in its recorded worktree (`collect` — the worker finished and nobody collected it). At rest (exit 1): every open path ends in an `--awaiting` gate (autonomous mode flows through checkpoint boundaries, same as `tk next`), work is in flight, or the scope is done. Deliberately *not* actionable: an in-flight worker without a result file — whether a silent worker is stale is reconcile's judgment call, and nudging an orchestrator whose fleet is legitimately running would be noise. (The originally sketched "merged-but-ungated wave" signal needs a durable wave-gate journal that does not exist yet; it joins the predicate if/when one does.)

The predicate is substrate- and harness-neutral: it reads only `.tick/` state, `tk graph`/`tk next`, and (when present) herd manifests. Everything that *enforces* it is a thin per-harness or per-substrate wiring:

- **Herdr (primary)**: the watchdog below.
- **Claude Code**: a Stop hook running `tk frontier --check`; exit 0 blocks the stop with the frontier summary on stderr.
- **Codex / Pi / Prime**: their equivalent turn-end or wrapper mechanism, each a few lines, documented in the matching adapter when built.

### 3. Herdr watchdog — supervision from outside the orchestrator's loop *(shipped)*

The orchestrator is an agent in a pane; herdr pushes `pane.agent_status_changed` for it like any worker. Two commands plus one plugin hook:

- **Registration: `tk herd watch <agent-or-pane>`** — the run registers its orchestrator at run start, right after opening the dashboard pane. Explicit target, herdr's own rule; nothing guesses which pane the orchestrator is. State (registration + the guard's episode memory) lives in `.tick/logs/herd/.watch-orchestrator.json` — one file for the run, not per-epic, because the orchestrator spans epic boundaries the same way the unpinned dashboard does. `--nudge-max` (default 3) and `--nudge-interval` (default 2m) set the policy; `--status` / `--clear` manage it.
- **Judgment: `tk herd guard`** — run by the plugin's `guard-hook.sh` on every `pane.agent_status_changed` (edge-triggered against the persisted state under a lock, same discipline as `tk herd notify`, so event storms and the paint feedback bounce judge once). The decision table: `working` → re-arm the episode; `idle`/`done` → consult the frontier predicate — at rest: nothing; actionable: `agent.prompt` the nudge (restating the charter, `tk next`, end-on-a-dispatch), at most nudge-max per episode with the interval floor between, then one `request` chime ("orchestrator stalled") and silence; `blocked` → one `request` chime ("orchestrator blocked") — the guard **never** drives an approval UI, for the orchestrator exactly as for workers.
- The nudge prompt is the context-decay countermeasure in mechanical form: the rule arrives as the most recent thing in the orchestrator's context, precisely when it matters.
- *Follow-up:* relaying the blocked orchestrator's question over the operator channel (as `tk herd wait --relay-blocked-after` does for a watched non-tick target) so the chime reaches a human who is away from the machine. The chime ships first; the relay reuses the ask machinery and needs live-herdr validation of pane-question extraction.

### 4. `tk herd orchestrate <epic>` — the orchestrator as a spawned agent *(deferred: needs live herdr)*

The endpoint of "the orchestrator is an agent too": spawn it through the helper, with everything workers already get —

- the kind's **full-auto template** compiled into its argv (eliminating the permission-prompt `blocked` class mechanically);
- watchdog **registration** automatic (no manual `tk herd watch`);
- a launch prompt carrying the charter, standing orders, and the epic id;
- a manifest, so `tk herd reconcile` can classify a dead orchestrator and the resume argv is one command away.

Every piece (template compilation, content gate, manifests, pane supervision) exists for workers; this is symmetry, not new machinery. Routing: `[roles.orchestrate]` in `runners.toml`, frontier tier by default. **Why deferred:** the orchestrator needs a pane at the *controller checkout*, and the herd client models no pane-creation method that is not `worktree.create` — the missing wire shape has to be pinned against a live herdr (this repo's rule: verified, never guessed) before the command can exist. Until then the manual form is documented in `herdr-runner.md` → *The orchestrator is an agent too*: launch with the kind's full-auto template, then `tk herd watch`.

### 5. Planning lint — unjustified gates *(shipped)*

The gate-creation side of the stall: "resolve is the default; awaiting is the exception you justify" was doctrine with no check. `tk graph` now warns on any open gated child (`--requires`, or a planning-time `--awaiting` — checkpoint and escalation excluded) with no `gate:` justification line in its description or notes, and reports the same list as `unjustified_gates` in `--json`. The justification convention is one note: `tk note <id> "gate: <why planning could not settle this>"`. Warning, never refusal — gates stay cheap to create interactively; the lint targets planner output. (A matching validation in the Pi planner's apply path remains open.)

## What this deliberately does not do

- **No auto-answering of approval UIs**, orchestrator or worker. Relay and chime, never synthesize consent.
- **No gate weakening.** `tk decide` refuses gated ticks; approval/input/escalation/work gates keep their exact semantics; autonomous mode still bypasses only checkpoints.
- **No new state store.** Decisions are typed notes; watchdog state lives in the existing gitignored herd manifest directory.

## Delivery status

1. **`tk decide` + `tk decisions`** — shipped.
2. **`tk frontier --check`** — shipped.
3. **`tk herd watch` + `tk herd guard` + the plugin's guard hook** — shipped (operator-channel relay of a blocked orchestrator's question remains open).
4. **`tk herd orchestrate`** — deferred; needs a live herdr to pin the pane-at-checkout method (see above). Manual form documented in `herdr-runner.md`.
5. **Planning lint in `tk graph`** — shipped (the Pi planner apply-path validation remains open).

Field validation for each: the measure is stalls-per-epic on real runs (both shapes, from `herdr agent explain` at stall time), before vs after. The 2026-08-30 baseline: both shapes occur routinely enough that the operator describes runs as "frequently stuck".
