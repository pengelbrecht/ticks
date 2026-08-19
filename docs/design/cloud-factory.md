# Cloud Factory: Schedule- and Event-Driven Orchestration on Cloudflare

> **Status: design exploration.** Nothing here is implemented. This doc exists to
> pressure-test the architecture against concrete use cases before any code is
> written. The companion reading is
> [`skills/ticks/references/agent-runner.md`](../../skills/ticks/references/agent-runner.md)
> (the orchestration contract every substrate must satisfy) and
> [`cloud/worker/src/project-room.ts`](../../cloud/worker/src/project-room.ts)
> (the existing multiplayer Durable Object).

## The problem

Ticks today has world-class *durable coordination* (git + `.tick/` as the source
of truth, orchestrators that reconstruct from artifacts) but every orchestrator
runs on a laptop: Claude Code in a terminal, the Pi extension as a local process
supervisor, herd as a client to a local herdr socket. Close the lid and the
factory stops. There is also no way for anything to *start* a run except a human
typing in a terminal.

A factory needs two properties ticks currently lacks:

1. **Always-on orchestration** — runs survive the operator's laptop sleeping.
2. **Signal-driven ignition** — work starts from events (an issue, a CI failure,
   a Telegram message, a clock) rather than only from a keyboard.

## Inherited axioms (non-negotiable)

These come from decisions already made and paid for in this repo. The cloud
factory must not relitigate them:

1. **Git and `.tick/` are the durable coordination layer.** Everything else —
   Durable Object state, sandbox filesystems, Workflow step results, session
   IDs — is convenience state that must be reconstructable from git + `.tick/`
   + run artifacts. (This is the axiom that made `tk herd reconcile` possible;
   it is also exactly the constraint Cloudflare's eviction/hibernation model
   imposes. Ticks is accidentally already Cloudflare-shaped.)
2. **The harness plays the orchestrator.** An agent following the skill loop
   drives each run. `tk run` — a Go-code orchestrator — was deleted, not
   rearchitected (`docs/projects/2026-03-25-tk-run-rearchitecture/SPEC.md`).
   The cloud control plane schedules, observes, and gates; it never plans or
   reasons.
3. **The cloud is a substrate, not a product fork.** `.tick/runners.toml`
   already resolves two substrates (`harness`, `herdr`). Cloud is the third
   value, satisfying the same spawn/wait/collect/reconcile contract.
4. **Workers never write `.tick/`.** The orchestrator owns tracker mutations
   (the Pi extension's boundary model, now backed by real container isolation
   instead of chmod-and-prompts).
5. **Capabilities and tiers, never hardcoded model names.** Cloud substrate
   config routes through the same tier vocabulary as everything else.
6. **Human verdicts carry human provenance.** `--gate approve` verdicts and the
   `--from human` attestation rule (`cmd/tk/cmd/verdictguard.go`) apply
   unchanged; the factory adds new places gates fire, never new ways to skip
   them.

And one new axiom this doc introduces:

7. **Signals never start compute directly. Signals create or update ticks; a
   dispatcher decides what runs.** Every ingestion path does one cheap, dumb
   thing — write a tick. A separate dispatch policy evaluates the ready
   frontier and ignites runs. This decoupling is what gives the factory dedup,
   budget gating, approval gating, and a complete audit chain (every run traces
   to a tick, every tick to a signal) without any per-signal-source logic.

## Deployment model: a personal factory, not a hosted service

Ticks has users beyond its author, and the factory must not turn the project
into a service its author operates for them. Running other people's agents
means holding their model keys, executing their code, absorbing their compute
costs, and owning their abuse surface — none of which "for now" (or possibly
ever) belongs on ticks.sh.

The repo already made this exact call once: the operator channel uses a
**personal Telegram bot per user** rather than a shared bot, explicitly because
a shared bot "would need a hosted relay in front of it"
(`docs/operator-channel.md`). The factory follows the same philosophy:

- **The factory is a deployable, not a deployment.** It ships in the repo
  (`cloud/factory/`) as a Worker + DO + Workflow + Sandbox bundle, and
  `tk factory deploy` (a wrapper over `wrangler deploy` that creates the D1/R2
  bindings, registers the Workflow, and sets secrets) installs it into **the
  user's own Cloudflare account**. Their compute, their model API keys, their
  spend, their blast radius. Cloudflare's floor for DOs/Workflows/Sandboxes is
  the paid Workers plan (~$5/mo) — that cost lands on the user, stated up
  front.
- **One deployment, one operator (team-shared is fine, multi-tenant is not).**
  A factory serves the Cloudflare account it lives in. A team sharing a repo
  shares one factory — the RunRoom lease already arbitrates concurrent
  submissions, and `.tick/operators.json` already maps identities. What no
  deployment ever does is serve strangers.
- **ticks.sh is unchanged**: install script, docs, and the existing
  local-authoritative board sync. It never gains factory endpoints. (A user's
  personal factory *may* optionally host its own board sync so power users are
  fully self-contained — their `ProjectRoom`, their data.)
- **Auth collapses to secrets, not accounts.** A single-tenant factory needs
  no user table: `tk factory deploy` mints a bearer token into `~/.ticksrc`
  and stores its hash as a Worker secret; webhook sources get per-source
  shared secrets; Telegram keeps its paired-operator rule. The unsalted-SHA-256
  problem in `cloud/worker/src/auth.ts` remains a ticks.sh (board sync) issue
  to fix on its own track — the factory simply never builds on it.
- **Upgrades ride the repo.** `tk factory deploy` pins the deployed bundle to
  the `tk` version; upgrading tk offers to redeploy. No fleet of factories for
  the project to migrate — each user redeploys on their own schedule, same as
  any self-hosted tool.
- **The door stays open, unbought.** Nothing hardcodes single-tenancy into
  data shapes (DOs are already namespaced by project; R2 keys and routes carry
  the project ID), so a hosted multi-tenant offering remains *possible* later.
  But no isolation, billing, or quota machinery is built until that day — the
  design refuses to pay for a service it isn't operating.

One consequence worth naming: **GitHub credentials become the user's problem
to provision, so the default must be low-friction.** The per-run installation
tokens in D11 presuppose a GitHub App, and "create your own GitHub App" is a
heavy first-run ask. The pragmatic ladder: start with a fine-grained PAT
scoped to the target repo (easy, adequate for a personal factory), document
the personal-GitHub-App upgrade path for those who want per-run token minting
and the two credential grades enforced at the platform level. `tk factory
setup` walks whichever rung the user picks — exactly as `tk channel setup
telegram` walks BotFather today.

## The three-layer liveness model

The design separates components by *what is allowed to die*:

| Layer | Runs on | Lifetime | Can it die mid-run? |
|---|---|---|---|
| **Control plane** | Cloudflare Workflow + Durable Objects | Durable execution — effectively immortal | No. Workflows checkpoint every step; DOs survive eviction by design. |
| **Orchestrator agent** | One Cloudflare Sandbox per run | Minutes to hours | Yes — context exhaustion, container eviction, API failure. Expected, recoverable. |
| **Worker agents** | One Sandbox per tick | Minutes | Yes — ephemeral by design. |

**Control plane.** Two pieces:

- **The Run Workflow** (Cloudflare Workflows): owns one run's lifecycle — boot
  the orchestrator sandbox, watch it, enforce wall-clock and cost budgets,
  retry a dead orchestrator, finalize. Workflows give durable execution with
  per-step checkpointing, so "the thing supervising the run" cannot itself be
  lost.
- **The RunRoom DO** (one per active epic run, `idFromName(project + epic)`):
  owns the state that is filesystem-shaped today and awkward for it — the
  dispatch lease (today: the Pi extension's checkout-scoped file lease with
  compare-and-delete semantics), pending operator questions (today:
  `.tick/pending/` + flock), reconcile alarms, and live event fan-out to the
  board via the existing `ProjectRoom`.

**Orchestrator agent.** A headless harness (`claude -p` / `codex exec` with the
ticks skill) inside a named sandbox, running the exact loop from
`agent-runner.md`: `tk graph --json` → EPIC-SKELETON repair → waves → spawn →
wait → collect → merge → integrated gate → close → review → closeout. When it
dies, the Workflow boots a fresh orchestrator whose first instruction is the
reconcile protocol (evidence order: manifests → git → live sandbox list),
which this repo already specifies and field-tested under herd. Sandbox
snapshot/restore makes warm resume cheap, but is an optimization — cold
reconstruction from git must always work (axiom 1).

**Worker agents.** One sandbox per tick: clone at the epic base, branch
`tick/<epic-id>/<tick-id>`, implement, push branch + `RESULT-<tick-id>.md`,
exit. Collect reads *only* what survived in git — commits, the result file,
the `.tick/` boundary diff — never sandbox terminal output. All spawn-time
failure modes documented for herd apply verbatim to headless CLIs in
containers and the dispatcher must implement the same defenses: the
**green-start trap** (a cleanly-started process that did nothing — probe with
trivial work before dispatching real work), **confirmed dispatch** (wait for
evidence of work starting, not just process start), and **expiring liveness**
(re-check aliveness immediately before any destructive action).

## Primitive mapping

| Ticks concept today | Cloudflare primitive |
|---|---|
| Epic run lifecycle (waves, gates, merge, closeout) | Workflow instance |
| Implementer per tick | Sandbox (named container: sleeps idle, wakes on demand, snapshot/restore) |
| `herd wait` fan-in | Workflow step awaiting sandbox exits |
| `herd reconcile` | Fresh orchestrator sandbox + RunRoom DO alarm |
| Pi durable lease (compare-and-delete file) | RunRoom DO state |
| `.tick/pending/` + `.consumer.lock` flock | RunRoom DO + alarms |
| Run artifacts (`events.jsonl`, `report.md`, `epic.diff`, prompts, attempts) | R2 |
| Telegram 25s long-poll | Worker webhook route |
| `defer_until`, escalation timeouts, `target_date` approach | DO alarms / scheduled tasks |
| Morning sweeps, budget windows | Cron triggers |
| Board live view | Existing `ProjectRoom` DO — the orphaned `run_event` protocol finally gets producers |

Deliberately **not** used at this scale: Queues (Workflow fan-out covers
dispatch) and KV (DO storage and D1 cover it). Workers AI is *not* on that
list — it's a first-class provider rung for deployments that want inference on
the same account as the compute (see "Workers AI as a provider" below).
Lightweight means resisting every primitive we don't need yet.

## Model access and harness choice for cloud agents

Two questions hide inside "which LLM do cloud agents use," and they have
different answers. **Model access** is which vendor/model serves a tier;
**harness** is what drives the agentic loop. Conflating them is how factories
end up welded to one vendor.

### Model access: everything through a gateway

All model traffic from every cloud agent — orchestrator, workers, the triage
call — flows through **one gateway endpoint in the user's own Cloudflare
account** (AI Gateway, which the self-deployed model gets for free), with the
user's keys behind it: direct vendor keys (BYOK per provider) or an aggregator
like OpenRouter behind the gateway for one-key-everything. Harnesses point at
it via their base-URL override (`ANTHROPIC_BASE_URL` and equivalents — every
supported CLI has one); pi routes natively per provider.

This buys three things beyond vendor-agnosticism:

- **Ground-truth cost telemetry.** Today `run_event.metrics.costUsd` trusts
  the agent's self-report. Gateway logs are the actual spend, per run (runs
  tag requests with run/tick IDs via gateway metadata headers), which is what
  the Workflow's budget enforcement (D14/D15) should read. An agent can
  misreport; a gateway invoice cannot.
- **A kill switch at the credential layer.** The Workflow can revoke a run's
  gateway token when a budget trips or a human hits stop — enforcement that
  works even on a wedged or adversarial agent, consistent with the doc's rule
  that budgets never live in prompts.
- **Caching, rate limits, and logs** in one place, owned by the user, no
  third-party data path unless they choose one (OpenRouter is an opt-in rung,
  not a dependency).

The tier vocabulary is unchanged (axiom 5): `.tick/runners.toml` still maps
role → kind/model/effort; the gateway is plumbing below that table, not a new
name in it. The green-start trap defense becomes *more* important with
indirection — a mistyped gateway route produces exactly the cleanly-started,
zero-work agent that the probe gate exists to catch.

**Workers AI as a provider.** For a factory living in the user's Cloudflare
account, Workers AI is not an also-ran — it's the rung where *inference bills
to the same account, credit pool, and gateway as everything else*. Workers AI
serves open-weight frontier models (DeepSeek-class and similar) over
OpenAI-compatible endpoints, fronts natively through AI Gateway (so D17's
telemetry and kill switch apply unchanged), and for a user holding Cloudflare
credit it makes agent inference effectively pre-paid. The tier table is built
for exactly this mix: route `economy` and `balanced` tiers to
`workers-ai/<model>` and keep `strong` (or just the review/closeout roles) on
a BYOK frontier vendor — the same cross-vendor-per-tier pattern this repo
already runs locally (its own `runners.toml` routes the balanced tier to a
different vendor than the strong tier). Harness compatibility note: Workers AI
models speak the OpenAI-compatible shape, so they ride the **pi** kind (or any
kind with a configurable OpenAI-style provider); the `claude` kind expects
Anthropic-shaped APIs and stays pointed at Anthropic models. One more reason
pi is the natural default kind for cloud workers.

One honest cost note: laptop runs often ride a flat-rate subscription; cloud
agents run on metered API keys. The gateway makes that spend visible and
capped, but it does not make it free — this is a real adoption consideration
and another reason budget policy is first-class rather than bolted on. (The
Workers AI rung softens it substantially for anyone with Cloudflare credit:
compute, storage, and inference all draw one pre-paid pool.)

### Harness: CLI-in-sandbox for implementers, programmatic only at the edges

The tempting modern answer is a programmatic agent — Cloudflare's Agents
SDK / Project Think fibers / the Flue harness work — instead of a CLI in a
container. Rejected for the implementer layer, for now, on three grounds:

1. **The sandbox is needed anyway.** Implementers require a real filesystem,
   shell, git, and language toolchains. A Worker-resident agent would RPC into
   that same sandbox for every tool call — a new protocol and added latency to
   move the loop somewhere with fewer capabilities.
2. **Rebuilding the harness is the `tk run` lesson one layer down.** Tool-use,
   editing, context management, and sub-agents are a fast-moving target that
   vendors continuously improve; the skill's adapters already encode their
   mechanics. A bespoke programmatic loop starts behind and stays behind.
3. **The pluggability already exists.** The kind×tier table (claude | codex |
   pi) *is* the harness abstraction. **pi is the LLM-agnostic answer inside
   the existing design**: a supported kind, multi-provider by construction,
   and pointed at the gateway it reaches any model without new machinery. A
   deployment that wants one vendor-neutral default sets `kind = pi` in
   `runners.toml` and is done.

**oh-my-pi (`omp`) as a candidate default kind.** omp
(github.com/can1357/oh-my-pi) is a batteries-included superset of pi —
hash-anchored edits, LSP/DAP, subagents, plan mode, hindsight memory — and
four of its properties are specifically factory-shaped:

- **Config inheritance**: on first run omp picks up rules, skills, and MCP
  servers from `.claude`, `.codex`, `.cursor`, etc. — so the ticks skill
  installed the normal way is loaded with zero omp-specific packaging. The
  orchestrator sandbox image stays harness-thin.
- **Native subagents** make omp viable as the *orchestrator* harness on the
  `harness` substrate — which is exactly what the Phase 1 single-sandbox play
  needs — on the vendor-neutral path. That upgrades Phase 1 from
  "claude-first" to "omp-first" without touching the plan's shape.
- **Multi-provider like pi**, so the Workers AI rung applies unchanged.
- **Hindsight memory** (retain/learn/recall, per-session compression) is
  genuinely useful for a factory whose workers are ephemeral — but it is
  *convenience state under axiom 1*: an omp memory directory may persist
  between runs via sandbox snapshot or R2 as an accelerator, while
  `.tick/learnings.md` remains the durable, git-tracked, harness-neutral
  memory. A run that loses omp's memory must lose speed, never correctness.

Practical costs, stated honestly: omp enters the kind table as its own kind
(`omp`, adapter derived from `pi-runner.md` — likely a thin delta), the
sandbox image needs its Bun runtime, and it is a young community project —
pin the version in the image and let the green-start probe do its job on
upgrades. None of that changes the architecture; that's the kind table doing
what it's for.

Where programmatic *is* right: the control plane's own LLM touchpoints — the
UC2 triage draft, and any future signal classifier — are single structured
calls with no tools, made directly against the gateway with no harness at
all. And the door stays open the cheap way: a matured Think/Flue-style agent
enters as another kind in the table — an additive experiment behind the
same spawn/wait/collect contract — never as a platform rewrite.

### Local orchestrators drive the cloud substrate too

The substrate abstraction separates *who orchestrates* (harness, anywhere)
from *how workers are dispatched* (substrate). Nothing in the cloud
substrate's contract requires the Workflow-hosted orchestrator — and the
design treats that as a requirement, not an accident:

- **The run API is orchestrator-location-agnostic.** The same Worker
  endpoints the Workflow-hosted orchestrator calls are exposed to the CLI as
  `tk cloud spawn / wait / collect / reconcile`, mirroring the `tk herd` verb
  family. An "old-fashioned" local orchestrator — Claude Code in a terminal,
  omp, the Pi extension — sets `substrate = "cloud"` and drives worker
  sandboxes from the laptop: local judgment, cloud hands. Five parallel
  implementers stop costing local worktrees, CPU, or battery, and a lid-close
  mid-wave loses only the orchestrator — the failure mode every runner is
  already required to recover from.
- **One lease, wherever the orchestrator sits.** On a factory-enrolled
  project, a *local* run acquires the same RunRoom lease as a cloud run —
  otherwise a laptop session and the 06:00 sweep collide on `.tick/`.
  Un-enrolled projects keep the local file lease; enrollment upgrades the
  arbiter and never installs a second one (D4 has exactly one enforcement
  point per project).
- **Handoff is reconcile, not a feature.** Durable state is git + `.tick/` +
  artifacts (axiom 1), so "started locally, cloud takes over" is UC1
  submission plus the existing reconcile protocol adopting the run's pushed
  state — and pulling a cloud run back to the laptop is the same move in
  reverse (acquire the lease, reconcile, continue). Neither direction needs
  new machinery; both are tests the substrate must pass.
- **The degenerate case stays sacred.** A fully local orchestrator on the
  `harness` or `herdr` substrate with no cloud enrollment at all keeps
  working, offline, forever. The factory is additive. Ticks' no-daemon,
  works-on-a-plane story is a feature other users rely on and this design
  never taxes it.

The resulting matrix — any orchestrator location × any substrate — is the
test of whether the abstraction held:

| Orchestrator ↓ / Workers → | `harness` (subagents) | `herdr` (local CLIs) | `cloud` (sandboxes) |
|---|---|---|---|
| Local terminal | today | today | **`tk cloud` verbs** |
| Cloud Workflow | **Phase 1** | (door open, not needed) | **Phase 2** |

## Signal ingestion: the funnel

```
  signals                    tracker                dispatch              execution
┌──────────────┐        ┌───────────────┐      ┌───────────────┐     ┌──────────────────┐
│ local agent   │        │               │      │  Dispatcher    │     │ Run Workflow      │
│ telegram      │  ───▶  │  tick written │ ───▶ │  (cron + DO    │ ──▶ │  └ orchestrator   │
│ github issue  │ signal │  to git       │ ready│  alarms;       │ignite│     sandbox       │
│ github CI     │ → tick │  (.tick/…)    │frontier│ policy: budget,│     │     └ worker      │
│ github PR     │        │               │      │  gates, caps)  │     │        sandboxes  │
│ webhook       │        │               │      │                │     │                   │
│ cron          │        └───────────────┘      └───────────────┘     └──────────────────┘
└──────────────┘                                                             │
        ▲                                                                    ▼
        └──────────────── gates & reports: Telegram / PR / board ◀── git: branches, PRs
```

Every arrow into the tracker is the same tiny operation. Every signal source is
therefore ~50 lines of translation, not a new integration surface. The tick
schema already carries the dispatcher's vocabulary: `defer_until`,
`target_date`, `requires: approval`, `awaiting: checkpoint`, `blocked_by` vs
`after`, `priority`. The schema was designed for a dispatcher that doesn't
exist yet; this fills that seat.

**Who writes the tick, mechanically?** Signals arrive at the Worker, which has
no checkout. Options considered:

- *(a)* Worker writes `.tick/issues/<id>.json` via the GitHub contents API,
  committing to the default branch.
- *(b)* Worker parks the signal in a DO inbox; the next run's orchestrator
  materializes ticks at run start.
- *(c)* A tiny long-lived "scribe" sandbox per project holds a checkout and
  applies tracker writes.

**Decision: (a) with (b) as buffer.** Tick files are small, independent JSON
files with a field-level merge driver — the single-file GitHub commit API fits
them exactly, and a tick must be *visible* (board, `tk list`, other agents)
the moment the signal lands, not when the next run starts. When the contents
API write conflicts (push race), the signal parks in the DO inbox and a DO
alarm retries. Option (c) is rejected as a standing process with standing
credentials — exactly the always-on daemon ticks has avoided everywhere else.

---

## Use cases

Each use case names the trigger, walks the flow through the layers, and — the
point of this doc — records the design decisions it forces.

### UC1 — Local agent hands work to the factory

*"I've been pairing with Claude Code on my laptop all morning. We've planned an
epic (`tk create --epic`, children, deps). It's 6pm. I tell my local agent:
'hand this to the factory and keep me posted on Telegram.'"*

**Flow.**

1. The local agent runs `tk cloud run pay-4 --notify telegram`. The command
   pushes the current branch (the epic's ticks must be visible to the cloud —
   unpushed local state does not exist as far as the factory is concerned;
   the command refuses to submit an epic whose tick files aren't on the
   remote), then POSTs to the Worker with the agent token from `~/.ticksrc`
   (`TICKS_TOKEN` — the existing token model from `tk board --cloud`).
2. The Worker validates the token, resolves the project (owner/repo, as
   `internal/github` does today), and asks the RunRoom DO for the dispatch
   lease. Lease held by another run → reject with the holder's run ID (same
   semantics as the Pi extension's checkout lease, now actually global instead
   of per-machine).
3. Lease acquired → start a Run Workflow: `{project, epic, base_sha,
   requested_by, notify}`.
4. Workflow boots the orchestrator sandbox: clone at `base_sha`, verify `tk`
   version, run `.tick/config.md` Environment pre-flight, export
   `TK_ACTOR=cloud:orchestrator`, then start the headless harness on the skill
   loop.
5. Waves execute in worker sandboxes. The orchestrator emits `run_event`
   messages (the protocol in `schemas/websocket/messages.schema.json`, today
   orphaned) to the RunRoom, which forwards to `ProjectRoom` — the board shows
   the run live, from anywhere.
6. Review and closeout process ticks run (EPIC-SKELETON, unchanged). The epic
   branch becomes a PR. Telegram: *"pay-4 complete: 6 ticks, 4 merged clean, 1
   DONE_WITH_CONCERNS (see note), PR #212. Cost $4.31."*
7. Next morning, `git pull` — the laptop was never part of the run.

**Decisions forced.**

- **The submission boundary is a pushed SHA.** The factory never sees local
  state. This makes `tk cloud run` trivially safe to call from any agent — the
  worst case is "epic not pushed," an error, not a partial run. It also pins
  the run to a base: mid-run pushes to the default branch don't shift the
  ground under running waves (the post-wave integrated gate and final PR merge
  are where drift reconciles, exactly as today).
- **`TK_ACTOR=cloud:orchestrator`** joins the runner-shaped actor namespace,
  so the verdict guard's human-attestation rule applies to cloud runs with
  zero new code.
- **Tracker writes during a run** happen in the orchestrator sandbox's
  checkout and are pushed as commits on a run branch (`tick-run/<epic-id>`),
  merged to the default branch at closeout — the control plane never writes
  git during a run; there is exactly one `.tick/` writer per project at a
  time, and the lease enforces it. If the run dies permanently, its `.tick/`
  state (claims, notes, closes for merged work) is on the pushed run branch —
  durable, recoverable, and mergeable by the field-level merge driver.
- **Notification is a run parameter, not config** — the requester chooses the
  channel per submission; the default comes from `.tick/operators.json`.

### UC2 — Telegram, directly

*"Standing in line for coffee: I message my bot — 'the login page 500s on
Safari when the session cookie is stale. Probably the refresh path.'"*

**Flow.**

1. Telegram webhook → Worker route (`/api/channels/telegram/webhook`). Sender
   ID must match the paired operator (`user_id` binding from `tk channel
   setup`) — everyone else is dropped at the transport, same rule as today's
   long-poll.
2. The message is free text, not a command. A **triage step** (one cheap model
   call — the only LLM invocation in the entire ingestion layer, and the only
   exception to "the control plane never reasons"; it classifies and drafts,
   never decides) turns it into a draft tick: title, description, `type: bug`,
   suggested priority. It does *not* create the tick yet.
3. The bot replies with the draft and inline buttons: **Create** / **Create +
   dispatch now** / **Edit** / **Discard** — reusing the existing inline-
   keyboard machinery (64-byte callback data, short local IDs) from
   `internal/operator/telegram`.
4. **Create** → tick lands via the funnel (Worker commits the JSON file),
   stamped `created_by: telegram:<user_id>`, with the original message
   verbatim in a note (the triage summary is a convenience; the human's words
   are the durable record).
5. **Create + dispatch now** → tick + a single-tick run through the dispatcher
   (budget checks still apply — "now" means "next," not "bypass policy").
   Otherwise it waits for UC7's morning sweep or manual dispatch.
6. Completion reports back on the same chat, threading the original message.

**Decisions forced.**

- **Webhook mode replaces long-poll for cloud-connected projects.** Telegram
  allows one `getUpdates` consumer per token; today that's the laptop's
  `operator.Consumer` flock-holder. A project can't have both the laptop
  long-polling and the Worker webhooking the same bot. The channel config
  gains a mode: `poll` (local-only, today's behavior) or `webhook` (Worker
  receives everything and *relays* terminal-bound questions to the RunRoom
  pending store, which the laptop reads via the existing pending-entry watch).
  Dual-surface answering survives: phone answers via webhook, terminal answers
  via `tk answer` syncing through the DO instead of flock — first-wins is now
  arbitrated by the DO (single-threaded by construction) instead of the apply
  lock, and losing surfaces get the same "already answered by …" message.
- **Free-text triage is drafting, not authority.** The human confirms before a
  tick exists. This keeps axiom 7 honest (the signal → tick step stays dumb;
  the human is the classifier of last resort) and prevents a mistyped message
  from igniting compute.
- **Identity mapping**: `telegram:<user_id>` → tk operator name resolves via
  the tracked `.tick/operators.json`, which already exists for exactly this
  purpose and never holds credentials.

### UC3 — GitHub issue in

*"A collaborator (or a user) files issue #87: 'CSV export drops rows with
embedded newlines.' A maintainer labels it `tk`."*

**Flow.**

1. GitHub webhook (`issues.labeled`, label `tk`) → Worker. Signature verified
   against the webhook secret; repo must match the project registration.
2. Tick created via the funnel: title/body from the issue, `type: bug`,
   `external_ref: github:pengelbrecht/ticks#87` (schema field exists),
   `created_by: github:<labeler>`. The Worker comments on the issue: *"Tracked
   as `k7p`. It will be picked up by the next dispatch window."*
3. Dedup: if a tick with that `external_ref` already exists, the signal
   becomes a note on it, not a sibling.
4. The dispatcher (UC7) picks it up in the next window, or a maintainer
   escalates: `/tk run` as an issue comment (maintainer-permission-gated)
   dispatches it immediately.
5. On completion the run's PR body links the issue (`Fixes #87`); the issue
   gets one status comment with the outcome and the `RESULT` summary. GitHub
   auto-closes on merge.

**Decisions forced.**

- **The label is the consent boundary.** Auto-ingesting *every* issue makes
  outsiders' text into agent instructions — a prompt-injection front door and
  a budget DoS. A maintainer applying `tk` (or commenting `/tk …` with write
  permission) is the explicit act that turns untrusted input into work. The
  issue body still gets handled as untrusted *data* inside the run (it goes in
  the tick description; the orchestrator prompt frames it as a bug report to
  verify, not instructions to follow).
- **`external_ref` is the dedup key** for every GitHub-shaped signal (issues,
  PRs, check runs), which is why it's the funnel's second required lookup.
- **One status comment per outcome, not a play-by-play.** The board and
  Telegram are the live surfaces; GitHub gets terse bookends (tracked / done-
  or-blocked). Noise in the issue thread is how factories lose their hosts'
  goodwill.

### UC4 — CI fails on a factory PR

*"The pay-4 PR from UC1 was green when opened. A maintainer pushed a tweak to
main; the PR's re-run now fails `test/csv_roundtrip_test.go`."*

**Flow.**

1. `check_run.completed` (conclusion: failure) webhook on a PR whose head
   branch matches `tick-run/*` or `tick/*` → this is *our* PR; the factory
   owns driving it to green.
2. The signal maps through `external_ref` to the originating epic. A remediation
   tick is created on it: `type: bug`, `blocked_by: []`,
   `discovered_from: <closeout tick>`, description carrying the check name,
   failing job URL, and the head/base SHAs.
3. **Flake gate before ignition:** the dispatcher checks (i) is this check also
   red on the base branch? → then it's not ours; park the tick
   `awaiting: input` with a note, don't burn compute; (ii) did the same check
   pass on this exact head SHA before? → re-run once via the checks API before
   creating a sandbox. Only a reproduced, ours-branch failure ignites.
4. A single-tick run dispatches: worker sandbox clones the PR head, reproduces
   the failure *first* (a fix for a failure you can't reproduce is a guess),
   fixes, proves the same check green locally, pushes to the PR branch.
5. Repeat on subsequent failures — with a **strike budget** (default 3
   remediation runs per PR per day). Strike-out parks the epic
   `awaiting: escalation` and fires a Telegram gate with the failure history:
   the human decides between "keep trying," "I'll take it," and "close the
   PR."

**Decisions forced.**

- **This loop is what makes it a factory rather than a launcher** — the output
  (a PR) feeds back in as a signal. It is also the highest-risk loop in the
  system: CI flake × eager redispatch = unbounded spend. Hence the flake gate
  and strike budget live in the *dispatcher* (policy layer), not in the agent
  prompt (which can be argued out of anything).
- **Branch-name namespace is the ownership test.** `tick-run/*` and `tick/*`
  heads are factory-owned (drive to green); everything else is UC5's problem
  (review, don't push). This must be a hard rule the webhook router applies,
  not a judgment call.
- **Remediation ticks are real ticks** — visible on the board, noted on the
  epic, countable in the retro. The factory's self-repair history is part of
  the durable record, which is what lets a human audit "why did this PR take
  11 commits."

### UC5 — PR opened by someone (or something) else

*"A first-time contributor opens PR #219 touching the merge driver. Separately,
Dependabot opens its weekly bump PRs."*

**Flow.**

1. `pull_request.opened` webhook → classify by author + head namespace:
   factory-owned (UC4's rules) / trusted-bot (allowlist: dependabot, renovate)
   / human-external.
2. **Human-external:** a review tick is created (`role: review`-adjacent but
   distinct — `type: task`, label `pr-review`, `external_ref` to the PR). A
   single-sandbox run checks out the PR head **read-only**: no push
   credentials in the sandbox at all — the review sandbox's GitHub token is
   scoped to `contents:read` + `pull_requests:write`. It produces a review
   (inline comments + summary verdict) posted as a PR review, and a note on
   the tick. It never pushes to the contributor's branch, never approves for
   merge — the verdict vocabulary is comment/request-changes; *approval stays
   human* (axiom 6 applied to code review).
3. **Trusted-bot:** the dispatcher may go one step further per policy: run the
   test suite against the bump in a sandbox and post the result; auto-merge
   only if the repo has explicitly opted in (`.tick/config.md` rule) *and* CI
   is green *and* the bump is semver-patch.
4. The review tick closes when the PR closes (webhook `pull_request.closed` →
   funnel → status resolution).

**Decisions forced.**

- **Two credential grades of sandbox.** UC1/UC4 sandboxes carry push-capable
  tokens; UC5 review sandboxes carry read+comment tokens. The gold standard is
  per-run GitHub App installation tokens (repo-scoped, expiring with the run);
  a personal deployment on a fine-grained PAT approximates the grades with two
  PATs (push-scoped and read+comment) until the user upgrades to their own App
  (see the credential ladder in the deployment model). The Workflow decides the grade at boot from the use case; a sandbox
  never holds more than its use case needs. This is the single most important
  security decision in the design — it bounds what a prompt-injected agent
  (reviewing hostile PR content!) can do to the repo at the credential layer,
  not the prompt layer.
- **External PR content is hostile input by default.** The review prompt frames
  the diff and description as data under review. The defense is the credential
  scope above, not trust in the framing.
- **The factory reviews; humans approve.** Writing "LGTM, merging" into an
  agent's mouth is how review theater happens. The verdict guard philosophy
  extends: a merge of external code is a human verdict.

### UC6 — Generic webhooks (Sentry as the worked example)

*"Sentry fires: `TypeError: cannot read 'refresh' of undefined` in
`session.ts`, 214 events in the last hour, release 0.31.0."*

**Flow.**

1. `POST /api/hooks/<project>/<source>` with a per-source shared secret.
   Sources are registered in `.tick/config.md` under a new `Webhooks` section
   (tracked, reviewable — adding a signal source is a PR, not a dashboard
   click).
2. A per-source translation (a few lines: field mapping + dedup key) turns the
   payload into the funnel shape: title, description, `type`, `priority`
   mapping, `external_ref: sentry:<issue-id>`, and a **threshold rule** (e.g.
   only ingest at ≥100 events/hour or `level: error`).
3. Dedup by `external_ref`: recurring alerts annotate the existing tick and can
   *escalate its priority* (P2 → P1 at 10× the event rate) — the one mutation
   the funnel may make besides create-and-note.
4. Dispatch per the normal policy. High-priority ingest can page through the
   operator channel (`tk tell`) without dispatching — visibility and ignition
   stay independently configurable per source.

**Decisions forced.**

- **Translation is config-plus-code shipped in the repo**, not a UI. Each
  source is a small module in the Worker with its dedup key and threshold
  policy in `.tick/config.md`. Fifty lines per source is the budget; a source
  that needs more is a sign it wants its own upstream aggregator.
- **Thresholds live at ingestion, budgets at dispatch.** Two different
  valves: "is this signal worth a tick" (per-source, cheap) and "is this tick
  worth compute now" (global, budgeted). Conflating them is how factories
  either drown in noise or go deaf.
- **Priority escalation via recurrence** is allowed; *automatic dispatch* via
  recurrence is not (it still flows through the budget). An error storm
  should raise urgency, not multiply spend.

### UC7 — "Time": the morning bug sweep

*"Every weekday at 06:00 Copenhagen: triage what came in overnight, fix what's
cheap and safe, have results on my phone by 08:00. Budget: $10."*

**Flow.**

1. Cron trigger (`0 4 * * 1-5` UTC) → the dispatcher DO for each enrolled
   project.
2. The dispatcher evaluates the ready frontier *without a model*: open ticks,
   not awaiting anything, not blocked (`wave.Compute` semantics — already a
   pure Go library with no runtime attached; it compiles to the Worker via a
   thin port or runs inside the orchestrator, decision deferred), filtered by
   the sweep policy from `.tick/config.md`:

   ```markdown
   ## Sweeps
   - morning-bugs: cron "0 4 * * 1-5", filter "type:bug priority<=2 unblocked",
     max_ticks 5, budget_usd 10, tier economy, gate_on_complete telegram
   ```

3. Selection is deterministic: priority, then age, then ID — no model call, no
   judgment, fully auditable ("why did it pick these five" must have a boring
   answer).
4. One Run Workflow ignites with the selected set as a synthetic epic
   (`sweep-2026-08-19`, children = the five ticks — buckets are already free
   and passive in the hierarchy model). Normal loop, economy tier, per-run
   budget enforced by the Workflow: hitting $10 finishes the in-flight tick,
   then goes straight to review/closeout on what's done — a budget stop is a
   *clean* stop, never an abandoned run.
5. 07:40, Telegram: *"Morning sweep: 4/5 done (PRs #221–#224), 1 blocked
   (needs a decision on locale handling — reply here). $7.80."* The blocked
   tick's question is a parked pending entry — answering it from the phone
   resumes that tick in the *next* sweep, or immediately with a button.

**Decisions forced.**

- **The dispatcher is deterministic policy, not an agent.** Everything about
  *whether and what* to run is dumb, versioned config in the repo. Everything
  about *how* is the orchestrator agent. This line — policy is code, judgment
  is the model — is the doc's answer to nearly every "should the factory
  decide X" question, and it's what keeps 06:00 spend predictable.
- **Budgets are enforced in the Workflow, not the prompt.** The `run_event`
  protocol already carries per-task `costUsd` and token counts; the Workflow
  aggregates and acts. A model can be talked out of a budget; a Workflow step
  cannot.
- **Sweeps compose with gates.** A sweep-selected tick with
  `requires: approval` fires its gate instead of running — time-based
  ignition never bypasses the approval machinery (axiom 6 again).
- **Synthetic sweep epics keep the EPIC-SKELETON invariant** — review and
  closeout process ticks apply to sweeps too, so even the 06:00 batch gets an
  integrated gate and a retro note. No second-class runs.

---

## Cross-cutting decisions (consolidated)

Collected from the use cases; each appears above in context.

| # | Decision | Forced by |
|---|---|---|
| D1 | Signals → ticks → dispatcher → runs; ingestion never ignites compute directly | all |
| D2 | Worker commits tick JSON via GitHub contents API; DO inbox as conflict buffer; no standing scribe process | UC2, UC3, UC6 |
| D3 | Submission boundary is a pushed SHA; factory never sees local state | UC1 |
| D4 | One `.tick/` writer per project, enforced by the RunRoom lease; run-branch commits, merged at closeout | UC1, axiom 4 |
| D5 | Telegram channel gains webhook mode; DO replaces flock as the dual-surface arbiter | UC2 |
| D6 | Free-text signals are drafted by a cheap triage model but confirmed by a human before a tick exists | UC2 |
| D7 | Label/`/tk` comment = consent boundary for third-party text becoming work | UC3 |
| D8 | `external_ref` is the universal dedup key; recurring signals annotate and may escalate priority, never multiply ticks | UC3, UC6 |
| D9 | Branch namespace (`tick/*`, `tick-run/*`) is the ownership test: drive ours to green, review theirs read-only | UC4, UC5 |
| D10 | Flake gate + strike budget on the CI-failure loop live in the dispatcher, not the prompt | UC4 |
| D11 | Two credential grades of sandbox: push-scoped (own work) vs read+comment (external review); never long-lived broad secrets in sandboxes. Personal deployments start on a repo-scoped fine-grained PAT; a personal GitHub App (per-run installation tokens) is the documented upgrade path | UC5, deployment model |
| D12 | Factory reviews; humans approve external merges — verdict-guard philosophy extended to code review | UC5 |
| D13 | Ingestion thresholds (per source) and dispatch budgets (global) are separate valves | UC6 |
| D14 | Dispatcher is deterministic, versioned policy in `.tick/config.md`; budget enforcement lives in the Workflow | UC7 |
| D15 | Budget exhaustion is a clean stop: finish in-flight, run review/closeout on what's done | UC7 |
| D16 | The factory is self-deployed into the user's Cloudflare account (`tk factory deploy`); single-tenant, secrets-not-accounts auth; ticks.sh never operates it. Data shapes stay project-namespaced so a hosted offering remains possible later, unbuilt | deployment model |
| D17 | All cloud model traffic routes through the user's AI Gateway (Workers AI, BYOK vendors, or OpenRouter behind it): ground-truth cost telemetry feeds budget enforcement, and revoking a run's gateway token is the kill switch | model access |
| D18 | Implementer harnesses stay CLIs in sandboxes, pluggable via the kind×tier table (pi/omp = the vendor-neutral kinds; omp the candidate cloud default for its subagents, config inheritance, and memory); programmatic agents serve only tool-less control-plane calls, and a matured Think/Flue harness may join as another kind, never as a rewrite | harness choice |
| D19 | The cloud substrate is drivable by any orchestrator location: the run API doubles as `tk cloud spawn/wait/collect/reconcile` for local orchestrators, enrolled projects share one RunRoom lease across local and cloud runs, and handoff in either direction is submission + reconcile, never bespoke machinery | local orchestrators |

## What this is *not*

- **Not a rewrite of the tracker.** D1 tick files, the merge driver, the
  hierarchy/roles model, the operator engine — all unchanged. The existing
  `ProjectRoom` mirror model (local-authoritative, cloud-ephemeral) also stays
  for board sync; the factory adds a *second* kind of cloud presence (runs),
  not a new source of truth.
- **Not an orchestrator in the Worker.** The control plane never walks the
  wave graph. That code path was deleted once already.
- **Not a platform UI.** The surfaces are git, `tk`, Telegram, and GitHub;
  the board stays optional observability. Headless is the product.
- **Not a hosted service.** Nobody operates a factory for anyone else; each
  user deploys their own (deployment model above). The project ships the
  blueprint, not the plant.

## Prerequisites (blocking, before any factory code)

1. **The factory bundle is single-tenant from day one** (deployment model
   above): minted bearer token as a Worker secret, no user table, no shared
   endpoints on ticks.sh. This *replaces* the earlier idea of building the
   factory on the existing cloud auth — `cloud/worker/src/auth.ts` (unsalted
   SHA-256 for passwords and tokens) still needs fixing, but as a ticks.sh
   board-sync issue on its own track; the factory never touches it.
2. **`tk factory deploy` / `tk factory setup`** — the wrangler-wrapping deploy
   command and the credential walk-through (Cloudflare account, GitHub PAT or
   App, Telegram webhook, per-source webhook secrets). This is the factory's
   install story and gates everything else.
3. **Bump `compatibility_date`** (currently 2024-04-03) in the factory bundle —
   DO SQLite storage and current WebSocket hibernation ergonomics are needed.
4. **R2 binding** in the factory bundle for run artifacts.
5. **Retire the vestigial `ralph | swarm-*` enum** in the `run_event` schema in
   favor of substrate-shaped sources (`cloud:orchestrator`, `cloud:worker`,
   `harness`, `herdr`, `pi`) before a producer starts emitting it for real.

## Phases

1. **Phase 1 — the trojan horse.** `tk cloud run <epic>` (UC1) with a *single*
   sandbox: the orchestrator runs the existing skill loop using the existing
   `harness` substrate (subagents) inside one container. No RunRoom fan-out
   yet beyond the lease and gates. Ships the whole pipeline end to end —
   auth, secrets, git credentials, sandbox lifecycle, budget enforcement,
   Telegram gates from a phone — with zero new orchestration logic.
2. **Phase 2 — real fan-out.** Per-tick worker sandboxes; substrate `cloud` in
   `runners.toml`; reconcile-on-reboot; `run_event` producers; R2 artifacts.
3. **Phase 3 — signals.** The funnel + UC2/UC3/UC6 ingestion, webhook-mode
   Telegram, `external_ref` dedup.
4. **Phase 4 — the loops.** UC4 CI-failure remediation (flake gate, strike
   budget), UC5 PR review (credential grades), UC7 sweeps (dispatcher policy,
   cron).

Order rationale: each phase is independently useful, and the risky loops
(4) arrive only after budgets, gates, and reconcile (1–2) are proven.

## Open questions

- **Where does `wave.Compute` run for the dispatcher?** Port the (small, pure)
  Go library to TS in the Worker, or have the dispatcher only *count* ready
  ticks and leave graph computation to the orchestrator sandbox. Leaning to
  the latter — the dispatcher needs "is there ready work under this filter,"
  not the full wave structure.
- **Multi-repo projects.** Everything above assumes project == one repo (as
  `internal/github` project detection does today). Factory 2.0-style
  cross-repo signals are out of scope until a real use case forces the issue.
- **herdr in the cloud?** A herdr server inside a long-lived sandbox would
  make substrate `herdr` work remotely too (the stdlib socket client would
  need a WebSocket dial path). Not needed for the factory; noted as a door
  deliberately left open.
- **Sweep selection vs. planning.** UC7 dispatches *existing* ready ticks. A
  richer sweep ("triage overnight signals *and plan* fixes") means the
  orchestrator runs planning first — allowed today by the skill's empty-epic
  path, but the budget accounting for "planning that produces no dispatchable
  work" needs a policy.
