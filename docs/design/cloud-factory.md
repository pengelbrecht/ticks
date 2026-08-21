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
- **One factory, many projects.** The unit of deployment is the *account*, not
  the repo: the RunRoom lease is per project (`idFromName(project)`), so
  two repos run concurrently without contending; every D1 row carries the
  project, and R2 keys are project-prefixed. Adding a repo is enrolment, not
  deployment. Consequently the account-scoped resource names are fixed
  (`ticks-factory`, `ticks-factory-artifacts`) and `~/.ticksrc` holds one
  endpoint — a second factory in the same account is not supported and is not
  meant to be. Deploy a second factory only for deliberate separation (billing,
  blast radius, credential grades), which means a second Cloudflare account.
  **Enrolment is a security boundary, not bookkeeping:** without it the bearer
  token alone would let any holder submit any `owner/repo`, turning the factory
  into an arbitrary-code runner for the whole of GitHub.
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
- **The RunRoom DO** (one per project, `idFromName(project)` — the lease
  arbitrates *between* epic runs, so an epic-scoped room would arbitrate
  nothing):
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

**Completion is proved, not inferred (D23).** The green-start trap has an exit
counterpart: a harness exits 0 when it has nothing left to say, which is not the
same as having done something. The first cloud run whose boot chain fully
succeeded produced 271 bytes — it stated the substrate it had resolved and the
note it intended to record, then exited — and was marked COMPLETED and charged
for, having dispatched no wave, pushed no branch and left every one of the
epic's ticks open. So the exit status decides only whether to reboot a
container; whether the *run* finished is decided from the durable layer, by
comparing the remote's branch heads at run start against the heads at run end
(`cloud/factory/src/progress.ts`). Nothing changed means the run **stopped**,
not completed; a remote that could not be read is recorded as `unknown`, which
is a third fact rather than a quiet version of either — the same distinction
`run.cost_source` draws between a zero and an unknown. `tk cloud status <run>`
prints the verdict beside the state.

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
| Board live view | Existing `ProjectRoom` DO — the `run_event` protocol got its first producers in tick bne |

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

- **Ground-truth cost telemetry.** `run_event.metrics.costUsd` used to be
  whatever the agent said it was. Gateway logs are the actual spend, per run
  (runs tag requests with run/tick IDs via gateway metadata headers), which is
  what the Workflow's budget enforcement (D14/D15) reads. An agent can
  misreport; a gateway invoice cannot.

  *As built (tick bne):* the only way a cost reaches the stream is
  `gatewayMetrics()`, which takes gateway.ts's `SpendResult` and nothing else
  — no builder accepts a bare number, so an agent's claimed cost has no
  parameter to enter through, and per-tick worker events carry no metrics at
  all. A telemetry read that failed publishes NO cost rather than a zero:
  unknown and free are different facts about a run.
- **A kill switch at the credential layer.** The Workflow can revoke a run's
  gateway token when a budget trips or a human hits stop — enforcement that
  works even on a wedged or adversarial agent, consistent with the doc's rule
  that budgets never live in prompts. Revocation is refused on the very next
  request; what a live incident proved it also has to be is *durable*, because
  a revocation the next boot re-credentials is not a kill switch (see the hard
  stop under UC1b).

  *As built (Phase 1):* the run's gateway is the factory Worker's own
  `/api/gateway` prefix, and the credential a sandbox carries is a run token
  minted per orchestrator boot. The Worker exchanges it for the operator's
  provider key and stamps the run/tick metadata itself, so attribution cannot
  be forged or suppressed by the agent and the vendor key never enters a
  container; revocation is a D1 write that the next model request hits. Every
  boot rotates, every trip and stop revokes, and finalize leaves nothing live.
  See `cloud/factory/src/gateway.ts`.
- **Caching, rate limits, and logs** in one place, owned by the user, no
  third-party data path unless they choose one (OpenRouter is an opt-in rung,
  not a dependency).

**Prompt caching is where an agentic run's money is.** A measured runaway run
spent $49.80 on 46,098,950 input tokens against 1,019,075 output tokens: 98% of
the spend was re-sending context, and not one of its 892 calls hit a cache
(`cached_tokens: 0` on a 71,759-token prompt whose opening bytes were proved
identical on two requests hours apart). Two different caches sit behind the
gateway and only one of them is worth anything here:

- The **gateway response cache** (`cf-aig-cache-ttl`) matches an identical
  request to a stored response. Every turn of an agentic loop sends a different
  request, so it would hit approximately never; it is deliberately left off.
- **Prefix caching** bills the leading, unchanged span of a prompt at a cached
  rate instead of re-processing it. That is exactly the shape of a loop, whose
  prompt grows by appending while its first tens of thousands of tokens stay
  fixed. Workers AI enables it by default on select models — but the cache
  lives on the model instance, so it only pays if the run's calls keep reaching
  the same one. Cloudflare's instruction is to "use the `x-session-affinity`
  header with a unique session identifier"; the factory's gateway Worker sets
  it to the **run id** (`SESSION_AFFINITY_HEADER` in
  `cloud/factory/src/gateway.ts`), stamped the same way `cf-aig-metadata` is —
  the caller cannot choose or suppress its own affinity, because an agent that
  could would be able to park on another run's instance or scatter its own
  calls.

One key for a whole run is deliberate, and the alternative was measured rather
than argued (tick fxf). Under the harness substrate a run is not one
conversation — it is an orchestrator plus N implementer subagents, all spending
the same run token, so one affinity key carries N message arrays that share
nothing past the harness preamble. The reading that they evict each other off
the single instance the key routes to is wrong. In `run_62c289d1` (230 calls,
65.3% of 10,954,464 input tokens cached, $5.96 against a modelled $15.08
uncached) the eight conversations separate cleanly in the gateway logs by the
first two messages of each request body, and the seven-way fan-out phase cached
BETTER than the serial one: 67.9% with six or more conversations live against
52.4% while the orchestrator ran alone, and 65.7% for a call whose predecessor
belonged to another conversation against 62.4% for one that followed its own.
Nor was the prompt head drifting: two consecutive requests around a total miss
were byte-identical over the whole 220,891 characters of the earlier one, and
the later was billed 512 cached tokens of 74,605. Three controlled probes (four
synthetic 15k-token conversations, one shared key against a key each) landed
within noise and disagreed on the sign — 24.0/24.3 sequential, 40.2/7.8
concurrent, 12.1/29.8 concurrent with the order reversed — and a fourth showed
why: ONE conversation, alone, on its own key still missed completely on two of
three follow-up calls. The header buys routing that is real but statistical;
the input a run still pays full price for is instance-side behaviour a finer
key does not steer, while a body-derived key would hand the choice of instance
back to the agent. `sessionAffinityKey` is the one place the value is chosen,
and it takes the run row and nothing else.

Affinity is only half of it: "a single token difference invalidates the cache
from that point onward", so anything the factory injects at the head of the
message array has to be a function of the run rather than of the moment. The
factory contributes exactly one such thing — the prompt that
`cloud/sandbox/entrypoint.sh` composes and hands the harness as `-p` — and
`internal/sandbox/prompt_prefix_test.go` is the standing check on it: no date,
clock, unix timestamp or uuid in the composed prompt; two boots of the same run
produce the same prompt byte for byte; and the prompt builders shell out to
nothing that varies (`date`, `$RANDOM`, `uuidgen`, `hostname`, `$SECONDS`).
What a harness itself puts in front of that is outside this boundary and is
checked by measurement, not by reading a header back: run the same epic twice
and compare `cached_tokens` and cost per call across the runs. A run whose
prefix is 60k of a 70k-token prompt should show most of its input billed at the
cached rate from the second call onward.

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
serves an OpenAI-*compatible* endpoint, which is not the same as an OpenAI one,
and the difference is load-bearing. Its `/v1/chat/completions` takes
`messages[].content` as a **string**; omp sends OpenAI CONTENT PARTS
(`[{"type":"text","text":"…"}]`) for user messages, and the first live run to
reach the skill loop over this route died on exactly that
(`Bad input: … Type mismatch of /messages/0/content, array not in string`).
So the route does ride the **pi** kind (or any kind with a configurable
OpenAI-style provider) — but only because the factory's own gateway Worker
normalises content parts into a string on the `workers-ai` route, in
`stringifyContentParts` (`cloud/factory/src/gateway.ts`), and refuses any part
with no string form rather than dropping it. Read "OpenAI-compatible" here as
"OpenAI-shaped, with one documented difference handled at the proxy" — a
harness that sends anything richer than text through this rung will meet that
refusal, not a silent truncation. **Dated correction (2026-08-21, tick y45):**
the account's OpenAI-compatible endpoint now accepts content parts on all
sixteen tool-capable models — the array shape was probed live against every one
of them and every one returned 200. The failure above was real when it
happened; the platform moved. `stringifyContentParts` **stays** anyway: it is
now belt-and-braces rather than load-bearing, it fails closed on a part with no
string form, and this epic has twice been burned by taking one dated
observation of platform behaviour as a standing guarantee — which cuts in both
directions. The `claude` kind expects Anthropic-shaped APIs and stays pointed
at Anthropic models. pi is still the natural default kind for cloud workers;
picking a default MODEL for it is a harness-compat question as much as a
capability one — that choice is now made and measured in
[`workers-ai-model-selection.md`](../workers-ai-model-selection.md), which
prices every model the account serves per completed tick and recommends a model
per role and tier — because the rung's wire shape is part of what the harness
has to speak.

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
   messages (the protocol in `schemas/websocket/messages.schema.json`) to the
   RunRoom, which forwards to `ProjectRoom` — the board shows the run live,
   from anywhere.

   *As built (tick bne):* `src/run-events.ts` builds the messages, the Run
   Workflow emits them (`epic-started` before anything boots, `task-started`
   per tick before its container is dispatched, `task-completed` carrying the
   COLLECT verdict, `epic-completed` at finalize before the index row goes
   terminal), and `RunRoom.publishRunEvents` forwards them to the board's
   `POST /api/projects/:project/run-events`. Every step of that path is best
   effort and cannot throw: the board is observability, so a run whose events
   are all dropped completes and collects identically. An unconfigured board
   (`BOARD_BASE_URL`/`BOARD_TOKEN` unset) is the default, not a degraded mode.
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
- **The run branch is pushed continuously, by the container, not at closeout.**
  The durability above is a property of a *pushed* branch, and for a while
  nothing pushed until closeout — so a run that never reached closeout had
  never pushed at all, and one that worked for 4.4 hours across seven ticks
  lost every commit when its container was destroyed. The orchestrator sandbox
  therefore runs a **run keeper** beside the harness (`cloud/sandbox`,
  *The run branch, and why it is pushed continuously*): every 60 seconds it
  fast-forward-pushes `tick-run/<epic-id>` if it has moved — after each worker
  branch merges, after each wave integrates — and prints a heartbeat carrying
  HEAD and commits-since-base, so a container that is thinking is
  distinguishable from one that is hung. It is mechanical rather than
  prompted, for the same reason budgets are (D14): durability that depends on
  an agent remembering to push is not durability. Nothing is pushed until the
  run has committed something, so the ref comparison that decides whether a run
  advanced anything stays honest. Merging to the default branch is unchanged —
  it still waits for closeout and the PR + CI gate.
- **A closeout PR names the commits it did not create.** The run branch
  descends from the SHA the run was submitted at, which is whatever branch the
  operator was standing on. A run submitted from an epic branch that is ahead
  of the default branch therefore carries that epic into its own PR, and
  merging it lands those commits on the default branch under *this* run's CI
  gate rather than their own — it happened once, and the carried epic's PR was
  recorded merged by a PR nobody opened for it. `tk cloud pr-body` builds the
  closeout PR body and lists that cargo (`<merge target>..<submitted sha>`)
  above the run's own commits, under a heading saying what merging it does; a
  PR carrying nothing says so positively. It fails rather than reporting a
  clean PR when the checkout cannot resolve the merge target: the sandbox's
  shallow clone can see one ref, and a body that certified every PR as clean
  because it could not look would be worse than none.
- **Notification is a run parameter, not config** — the requester chooses the
  channel per submission; the default comes from `.tick/operators.json`.

### UC1b — Operator commands a cloud run

*"The run is in the cloud, not in my terminal. I want to start one, stop one,
and see what's going on — from wherever I am."*

Three arrangements hide behind "how do I talk to the factory," and only the
second one needs anything new:

| | Operator → orchestrator | Mechanism |
|---|---|---|
| **Local orchestrator → cloud workers** (D19) | same terminal | typing. No transport, no delivery point. |
| **Cloud orchestrator → cloud workers** | headless harness in a Sandbox with no reachable stdin | **this use case** |
| **Automatic trigger → cloud orchestrator** | no operator in the loop | signal → tick → dispatcher (D1) |

**The arrow is a command surface, not a conversation.** The operator does not
chat with the orchestrator, steer it mid-tick, or inject prompts into its
harness. One closed verb vocabulary is exposed on every transport:

| Verb | Terminal | Telegram | GitHub |
|---|---|---|---|
| ignite | `tk cloud run <epic>` | `/run <epic>` | `/tk run` on an issue (UC3) |
| clean stop | `tk cloud stop <run>` | `/stop` | — |
| hard stop | `tk cloud stop <run> --now` | — | — |
| what is happening | `tk cloud status` | `/status` | — |
| answer a parked question | `tk answer <id> …` | inline keyboard (ships today) | — |

Reading a run is a separate axis from commanding one, and the two must not be
counted together:

| Observation (read-only) | Terminal | Record it reads |
|---|---|---|
| what the container printed | `tk cloud logs <run>` | the harness stream in R2 (D20) |
| what the model said and decided | `tk cloud trace <run>` | AI Gateway logs, filtered on `metadata.run_id` (D17) |

**Flow.**

1. The operator issues a verb on any transport. Terminal commands authenticate
   with the factory bearer token; Telegram authorizes at the transport (paired
   operator only, UC2's rule); GitHub requires write permission (UC3's rule).
2. The Worker resolves the verb against the RunRoom DO — the single arbiter,
   single-threaded by construction, so three transports need no cross-transport
   locking.
3. `run` takes the lease and starts a Run Workflow (UC1, unchanged). `stop`
   finishes the in-flight tick, then goes straight to review/closeout on what is
   done. `status` reads Workflow step state plus the DO's lease and gate state.
4. Reports and questions come back on the return arrow that already exists
   (gates, pending entries, completion reports).

**Decisions forced.**

- **No mid-run mutation channel; stop-and-restart is the steering path.** There
  is no operator inbox the orchestrator drains, no "also do X" mid-wave, no
  free-text steer. To change what a run is doing: stop it, edit the tracker
  from a normal checkout, `tk cloud run` again. The fresh orchestrator's first
  instruction is the reconcile protocol, which adopts the pushed state and
  continues — a path that must be bulletproof anyway, because it is how a dead
  orchestrator recovers. This keeps the axiom intact rather than carving an
  exception into it: **the tracker is read at run start, not during**, and there
  is exactly one `.tick/` writer per project (D4). It also disposes of a
  mechanical trap — an operator writing a tick to the default branch mid-run is
  writing to a branch the run cannot see, since the run is pinned to `base_sha`
  and commits to `tick-run/<epic-id>`.
- **Observation is not command; `logs` and `trace` do not widen the vocabulary.**
  D21 fixes the operator-to-orchestrator COMMAND vocabulary at `run`, `stop`,
  `status` and `answer`. `tk cloud logs` and `tk cloud trace` are read-only
  observation: they read records a run has already written — R2 harness output
  and AI Gateway logs — and there is no path from either to the orchestrator.
  Nothing is delivered, no state is mutated, and a wedged orchestrator answers
  them exactly as well as a healthy one, because it is not consulted. So the
  count of `tk cloud` subcommands is not the count of D21's verbs, and it is
  said here explicitly so the next reader does not conclude otherwise (tick
  l4l). The two are deliberately separate commands rather than one: a harness
  that crashed and a model that decided badly are different failures with
  different evidence, and a single command with two answers to "what happened"
  serves neither.
- **A clean stop is the budget stop.** `tk cloud stop` is D15's code path with a
  human trigger instead of a spend trigger — finish the in-flight tick, run
  review/closeout on what is done. There is no "abandon the run" verb, because
  an abandoned run leaves merged work with no tracker state.
- **A clean stop has no teeth when the budget is already breached, so there is
  a hard one.** Finishing in-flight work is right for an ordinary stop and
  wrong for a runaway: a live run at 2x its budget with no durable output kept
  spending through its own clean stop, and a hand-written token revocation was
  undone by the supervisor's next boot, until the container application itself
  was deleted. `tk cloud stop --now` (`{"mode":"hard"}` on `/stop`) revokes the
  run's gateway credentials **in the request that asks for it**, before the
  state flip and before the Workflow is told anything, and the stop record
  keeps them dead: no later boot of that run — closeout included — may mint
  another. It costs review and closeout, which is the trade an operator is
  making knowingly; the clean stop remains the default and still runs them. A
  budget trip takes the same revoke-first path automatically without recording
  a hard stop, so the unwind into closeout still happens on a fresh credential.
  Both stops report which one was performed, and a hard stop reports how many
  live credentials it killed. Stop mode only ever escalates: `hard` supersedes
  a standing `clean` record, `clean` never softens a `hard` one.
- **Stop does not travel through the orchestrator.** A wedged or adversarial
  orchestrator will not honour a message it never reads, so `stop` is enforced
  at the Workflow and gateway-token layer (D17's kill switch), consistent with
  budgets living in the Workflow rather than the prompt. Every other verb is
  control-plane state the orchestrator reads at a wave boundary.
- **Commands are parsed; free text is triaged. The split is deterministic.** On
  Telegram, a message beginning with a registered command never reaches UC2's
  triage model, and an *unrecognized* `/command` is an error reply — never
  triage input, or a typo'd `/ruh pay-4` silently becomes a bug report titled
  "ruh pay-4". Registering `/run`, `/stop`, `/status` with BotFather joins the
  walk `tk channel setup telegram` already performs.
- **Ignition on a leased project refuses, with an opt-in queue.** A second `run`
  while the lease is held is rejected with the holder's run ID (UC1). Because
  "run epic xyz" typed from a phone should not simply bounce, `--queue` (and the
  Telegram equivalent) parks the submission in the DO and ignites it when the
  lease releases. Queued submissions are visible to `status` and expire on a
  configurable window — a queue that silently ignites work hours later is worse
  than a refusal.

### UC1c — Two epics at once, on one repo

*"The factory has been running `pay-4` all evening. I also want `auth-9` moving.
Same repo. Can it?"*

**Today: no, deliberately.** The dispatch lease is one per project — `runs.ts`
takes `RUN_ROOMS.idFromName(project)` and the room keeps a single-row
`dispatch_lease` — so a second submission is refused naming the holder
(`lease_held_by:<run>`), or parks with `--queue` (D22). That is D4 enforced at
ignition: exactly one `.tick/` writer per project.

D4 is right about **tracker writes** and too wide as a limit on **runs**. A
factory that can only ever run one epic at a time is a serial machine, and the
question is whether the exclusive thing can be narrowed from *the project* to
*the tracker mutation*. It can — but not for free, and the price is paid in
places that have no machinery yet. What follows is verified rather than
assumed; the reproductions are in `repo-wiki/concurrent-epics.md`.

#### What actually conflicts

Two epics touch disjoint sets of tick files, and `.tick/` is a directory of
per-tick JSON with a field-level merge driver. Most of the tracker is therefore
not contended at all:

| Surface | Two epics at once | Why |
|---|---|---|
| `.tick/issues/<id>.json`, different ids | no conflict | different files; git has nothing to merge |
| `.tick/pending/<qid>.json` | no conflict | question ids are unique by registration |
| `.tick/activity/activity.jsonl` | clean **where the driver runs** | `tick-activity` unions on `(ts, tick, action, actor)` and sorts |
| `.tick/issues/<id>.json`, **same id** | fails closed, illegibly | ids are minted against one checkout (`internal/tick/id.go` asks `exists` about the local tree), so two runs can mint one 3-char id for two different ticks. git presents this as add/add with an empty base; the driver cannot parse it and exits non-zero, so git records a conflict instead of fusing two unrelated ticks through the field merge. Pinned by `TestMergeFileRefusesAddAdd`. The operator, however, sees `failed to read base: unexpected end of JSON input` and a usage dump — neither the collision nor the fix |
| a tick claimed by both runs | not reachable by dispatch | a tick has one parent; each run dispatches its own epic's subtree. A tick shared as a cross-epic `--blocked-by` is *read* by both and closed by one — the merge driver's monotonic status rank already handles that |
| `.tick/learnings.md` | conflicts, and dangerously | the retro **compacts** the file (rewrite under a 150-line cap), so two closeouts rewrite the same lines with no driver; a careless resolution silently drops the other epic's rules |
| `.tick/config.md`, `.tick/runners.toml`, `CHANGELOG.md` | ordinary text conflicts | shared prose, resolvable, and already expected between two ticks in one wave |
| `tick-run/<epic>`, `tick/<epic>/<tick>` | no conflict | separate refs, epic-namespaced, pushed independently; git updates refs atomically per ref |
| merge into the default branch | **the serialisation point** | below |

**The merge drivers are local git config, and GitHub does not have them.** This
is the finding that decides the shape. `merge=tick` and `merge=tick-activity`
resolve to commands in `.git/config`, installed by `tk init` in a checkout;
GitHub's server-side merge runs neither. Verified: two branches appending
different lines to `activity.jsonl` merge clean with the driver and conflict
without it. Serial epics never hit this — the second branches off the first's
merge, so only one side has touched the tail. Two concurrent epics both append
from a shared base, so **every second concurrent epic PR conflicts on
`activity.jsonl` on the server** and has to be resolved in a checkout that has
the driver. Nothing is corrupted; a step that is invisible today becomes
mandatory, and it is mandatory on the human's path, not the run's.

So the honest inventory is: the tracker is *nearly* concurrency-safe by
construction, and the three things that are not — id minting, the compacted
`learnings.md`, and the driverless server-side merge — are all at **closeout**,
not during the run.

#### Lease granularity

| Option | What it gives | What it costs |
|---|---|---|
| **A. Project-exclusive** (today) | D4 with no reasoning required; one writer, one PR, one Telegram thread | a serial factory |
| **B. Per-epic lease + a narrow tracker-write lease** | concurrent runs; the commit to `.tick/` serialised globally | the lease has to be taken across a *container's* git operations, which the control plane cannot see or fence. Rebuilds a distributed write lock over git — the thing git already solved |
| **C. Per-epic lease + per-run branch, merged at closeout** | concurrent runs; contention handled by the tool built for it | the closeout seams above become load-bearing, and the merge into the default branch still serialises |

**C is the shape**, because it is what the run already does: each run commits to
`tick-run/<epic-id>`, pushes it continuously, and merges at closeout behind the
PR + CI gate. Concurrency does not need a new mechanism, only permission — and
the seams closed.

The correct restatement of D4 is therefore: **what must be exclusive is the
merge of tracker state into the default branch, not the run.** That is already
serialised by something outside the factory — GitHub merges one PR at a time
into one branch, and this repo's rule requires green CI on each — so the second
epic's PR rebases onto the first and re-runs CI. That is the cost, and it is a
CI run, not a lock.

#### Decision: serial by default, as policy rather than as an axiom

Concurrency stays **off**, with the cap expressed as a number that defaults to
today's behaviour instead of as a property of the architecture:

- The RunRoom lease becomes an **N-slot lease** — the same compare-and-delete
  release, the same alarm expiry, the same refusal naming the holders, with
  `slots` instead of a single row. `N = 1` is today's refusal, byte for byte.
- `N` comes from `[orchestration].max_concurrent_runs` in the project's
  `.tick/runners.toml`, **default 1**, read by the dispatcher at submission.
  It is dispatch policy, so it lives in versioned config and is enforced in the
  control plane, never in a prompt (D14) — the same rule `max_parallel` now
  follows on the claim path.
- A second ceiling is the deployment's: `max_instances = 3` in the factory's
  `wrangler.toml` bounds concurrent containers **across all projects**, and the
  headroom above one run exists for the overlap a reboot creates. A factory-wide
  `FACTORY_MAX_CONCURRENT_RUNS` refuses at submission with a logged dispatch
  reason (D20) rather than letting a container start fail minutes later. The
  arithmetic a cap has to respect is `sum over runs (1 orchestrator +
  max_parallel workers)`: `max_parallel` is per epic, so two concurrent epics
  multiply the wave width as well as the orchestrators.

**Why not raise the default now.** Every seam that concurrency stresses is at
closeout, which is exactly where a run is least supervised: the operator is
asleep, and a botched `learnings.md` compaction or a silently dropped tick is
discovered days later. A collision would also be rare enough to be untested in
practice — 3-char ids and a retro that usually works — which is the profile of
a bug that lands once, in the dark, on the tracker itself. Serial costs latency;
concurrent-before-the-seams costs correctness on the one file that records what
the factory did.

**What becomes possible when the default rises**, and what stays serialised:
two epics ignite, run and push independently, ask questions independently, and
report independently. Their merges into the default branch remain one at a time,
their `.tick/` conflicts are resolved by the drivers in a checkout that has
them, and the second PR pays a CI re-run.

#### Prerequisites (each a tick, none large)

1. **Tick ids survive concurrent minting.** Either mint with a per-run
   discriminator, or teach the driver to *name* the collision: an add/add on
   `.tick/issues/<id>.json` should say "two runs minted `<id>` for different
   ticks; rename one" instead of a JSON parse error. Failing closed is already
   proven; being legible is not.
2. **The retro appends, or merges, but does not blind-rewrite.** Compaction on a
   concurrent branch must reconcile against the base it forked from — or move
   compaction out of closeout and into a periodic, single-writer pass.
3. **The driverless server-side merge is handled once, not per incident.**
   Either the closeout rebases the run branch onto the default branch (in the
   container, where the drivers are installed) before opening the PR, or a CI
   job resolves `.tick/` conflicts with `tk merge-file` / `tk merge-activity`.
4. **The N-slot lease**, with `[orchestration].max_concurrent_runs` (default 1)
   and the factory-wide ceiling above it.
5. **`status` shows the project's slots**, not a boolean: which runs hold them,
   which submissions are queued behind them, and the two caps that produced the
   number.

#### Telegram across concurrent epics

Gates carry run/tick/epic identity, and the machine path is already
epic-agnostic in the right way:

- **Buttons are unambiguous, and stay so.** Callback data is `q:<question-id>:<n>`
  (or `r:<message-id>:<n>` for ids too long for Telegram's 64-byte limit), and
  the webhook resolves it against the RunRoom entry with that id. Two epics in
  one project change nothing: a press names one question.
- **Reply-to is unambiguous, and becomes the common path.** In a group with bot
  privacy mode on — the recommended configuration for topics — the bot only sees
  commands and replies to its own messages, so a free-text answer is
  reply-scoped by construction.
- **The bare-text rules hold for N epics as written**, because they count *open
  questions*, not projects: exactly one open question anywhere resolves it, two
  or more must refuse and list the candidates. What must change is the list —
  candidates are named by **project + epic + tick**, since "two open questions"
  in one project is now a normal state rather than a sign of two repos.
- **A topic is a project, not an epic.** Forum topics are created at enrolment
  and are the project's durable identity; an epic is transient, and per-epic
  topics would churn the sidebar and leave project-scoped traffic — UC2 triage
  drafts, dispatcher refusals, budget alerts — with no topic to land in. Epic
  identity belongs in the message text, which every gate, report and completion
  must carry anyway for a shared chat to be legible at all.

**Decisions forced.**

- **What is exclusive is the tracker's merge into the default branch, not the
  project.** D4 stands as a rule about writers; it stops being a rule about runs.
- **Concurrency is a number with a default of 1.** Shipping the slot lease
  without raising the default is the whole point: the refusal stays exactly as
  it is today, and turning it on later is a config change against seams that
  have been closed on purpose rather than a re-argument of this section.
- **The caps live with the dispatcher.** Per-project in versioned config,
  factory-wide in the deployment, both enforced at submission with a logged
  reason — never in a prompt, and never discovered when a container fails to
  start.
- **Telegram needs legibility, not new arbitration.** Ids already disambiguate
  the machine path; epic identity in the message text and in the refusal list is
  what the human needs.

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

## Observability: troubleshooting a headless factory

A factory with no terminal has no scrollback. Every layer must leave a trace
durable enough to debug *after* the pieces that produced it are gone — the
sandbox torn down, the DO hibernated, the Workflow completed. Two principles
govern the design:

**One trace ID threads the whole causal chain.** A signal gets a `signal_id`
at the Worker's front door; the tick it creates records it; the run that
dispatches the tick carries `run_id`; every worker attempt carries
`run_id/tick_id/attempt`. These IDs appear in: Workers logs, Workflow step
names, DO log lines, R2 object keys, AI Gateway metadata headers (D17), the
`run_event` stream, and the commit trailers on run-branch commits. "Why did
this PR do that?" must resolve by following one ID down the stack, never by
timestamp archaeology.

**Results come from git; diagnostics come from logs — and both are captured.**
The collect axiom (terminal output is never a *result* channel) stays intact,
but its contrapositive matters for debugging: harness output is the *primary
diagnostic* channel — the green-start trap was literally diagnosed from pane
content. So worker and orchestrator sandboxes stream their harness output
continuously during the run, never export-at-exit: a sandbox that dies
mid-tick must leave its logs behind, because the crashed runs are exactly the
ones worth debugging.

What each layer emits, and where it lands:

| Layer | What | Where |
|---|---|---|
| Ingestion | Signal received (redacted payload digest), dedup verdict, tick written / parked / dropped-below-threshold — every signal accounted for, including the ignored ones | D1 `signals` table (queryable: "why didn't my webhook make a tick") |
| Dispatch | Every ignition *and refusal* with its reason from the deterministic policy: `budget_exhausted`, `lease_held_by:<run>`, `flake_gate:red_on_base`, `awaiting:approval`, `strike_out` | D1 `dispatch_log` + a note on the tick when the refusal is tick-specific |
| Control plane | Workflow step history (durable execution gives this for free), DO transitions (lease acquire/release, gate parked/answered), structured Workers logs | Workflows instance status API + Workers Logs / `wrangler tail` for live |
| Run | The Pi extension's artifact tree, adopted wholesale as the cloud schema: `runs/<project>/<run_id>/{run.json, artifacts/<tick_id>/{prompt.md, events.jsonl, harness.log, report.md, epic.diff, attempts/}}` — plus `reconcile.json` per orchestrator reboot | R2, streamed during the run |
| Model traffic | Per-request logs with run/tick metadata, tokens, cost — ground truth for D17 budgets | AI Gateway logs |
| Tracker | The existing audit trail, unchanged: `.tick/activity/activity.jsonl`, actor-stamped notes, `run-state:` notes | git |

**Why D1 for signals and dispatch, not the logging pipeline:** those rows are
operational state first and observability second — the dispatcher reads them
synchronously to decide (dedup by `external_ref`, strike counting, the
flake gate's pass-history check), so they must be exactly-once, queryable,
and retained on the factory's terms. Cloudflare's logging services trade
exactly those properties for volume (sampling, short retention, no SQL reads
from the hot path) — right for telemetry, wrong for audit records that policy
depends on. The split is by role and rate: low-rate load-bearing records →
D1; high-volume streams → R2 and gateway logs; invocation noise → Workers
Logs. (Analytics Engine may later serve aggregate *metrics* — spend per day,
runs per week — a different job than the audit trail; a Tail Worker/Logpush
export stays an option for users who want logs in their own stack, never a
dependency.)

Three rules keep it useful rather than voluminous:

- **Log the vocabulary, not prose.** Failure events use the taxonomy this
  repo already named — `green_start_trap`, `no_commits`, `missing_result`,
  `boundary_violation`, `recheck_failed`, `protocol_mismatch` — so a
  troubleshooting session starts from a known failure mode, and new incidents
  that fit no name are themselves a signal (the taxonomy grows by documented
  incident, as it always has here).
- **Two commands read the two records; a joined view comes later.** The
  layers above produce two different kinds of evidence for one run, and they
  are read by two commands rather than one, because a harness that crashed and
  a model that decided badly are different failures:

  - `tk cloud logs <run>` — the harness stream in R2: what the container
    printed. Readable mid-run (that is why the stream is segments), bounded
    from the END with the bound stated, since the tail is what a run being
    debugged is read for.
  - `tk cloud trace <run>` — the model conversation from AI Gateway, filtered
    on the `run_id` the proxy stamps: message roles, tool calls and their
    arguments, tokens in/out and cached per call, cost per call. `--call N`
    dumps one exchange in full, `--tools` lists just the tool calls, `--cache`
    is the per-call prefix-cache table, `--json` the raw rows.

  Two things about `trace` are not obvious and cost real time when guessed at.
  **Responses are streamed**, so a logged response body carries
  `choices[0].message.content: null` and `tool_calls: null` — reading it and
  concluding the model emitted nothing is wrong. What the model said is
  reconstructed from the assistant messages inside each REQUEST body,
  deduplicated across calls: an agentic harness replays the whole conversation
  every call, so call N's request holds every turn up to N-1. And **the prefix
  cache is only measurable from `usage_metadata.input_cached_tokens`** on the
  log row, which is what makes `--cache` the answer to "is caching actually
  hitting" (tick l8z) — per call, because one changed token near the head of
  the prompt invalidates the prefix and an average hides exactly that swing.

  `trace` reads the operator's own gateway directly with the Cloudflare API
  token `tk factory setup --cloudflare-api-token` installs, so it works
  against a factory whose Worker is wedged. A factory without that token
  routes and attributes model traffic but has no trace and no cost budget;
  the refusal says so and names the remedy, because "no trace" must not read
  as "no factory". The joined story across all six layers for one ID — signal
  → dispatch decision → workflow steps → harness log → gateway spend →
  tracker notes — is still the destination, and `--follow` for a live tail
  with it.
- **Redact at the front door, retain by tier.** Secrets never enter any log
  (webhook payloads are digested, tokens are IDs); harness logs and events
  are the user's own code in their own account and are kept verbatim.
  Retention: D1 rows and R2 artifacts age out on a configurable window
  (default 90 days), except `report.md`/`retro.md`, whose durable homes are
  git and the tracker anyway.

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
| D20 | One trace ID (`signal_id`/`run_id`/`tick_id`) threads every layer; harness output streams to R2 during the run (diagnostics), never export-at-exit; every dispatch refusal is logged with its policy reason; failure events use the named taxonomy; `tk factory trace` joins the story across layers | observability |
| D21 | Operator → cloud orchestrator is a closed command vocabulary (`run`, `stop`, `status`, `answer`) on three transports (terminal, Telegram, GitHub) arbitrated by the RunRoom DO — never a chat, a prompt injection, or a mid-run mutation channel. The tracker is read at run start, not during; steering is stop → edit → restart, riding the reconcile path. `stop` is enforced at the Workflow/gateway layer so it survives a wedged orchestrator. On Telegram, commands are parsed and free text is triaged, with an unrecognized `/command` an error rather than triage input. Read-only observation (`tk cloud status`/`logs`/`trace`) is a separate axis and does not widen this vocabulary: it reads records the run already wrote and cannot reach the orchestrator at all | UC1b |
| D22 | Ignition on a leased project refuses with the holder's run ID; `--queue` is the opt-in park-and-ignite-on-release, visible to `status` and expiring on a configurable window | UC1b |
| D23 | A run's terminal state is decided against durable evidence (the remote's refs before and after), never against the harness's exit status: `completed` means the epic moved, `stopped` means the run ended without moving it, and an unreadable remote is recorded as `unknown` rather than as either | UC1, axiom 1 |
| D24 | Prompt caching is a first-class cost lever: the gateway Worker sets `x-session-affinity` to the run id so a run's calls keep reaching the model instance holding its cached prefix, and everything the factory injects at the head of the message array is a function of the run rather than of the moment (checked in `internal/sandbox/prompt_prefix_test.go`). The key stays per RUN, not per conversation, on measurement: a fan-out run's subagents cache better together than the orchestrator does alone, and a per-conversation key tested within noise of a shared one while handing the agent influence over its own instance (tick fxf). The gateway's response cache stays off — an agentic loop never repeats a request | model access |
| D25 | Two epics at once on one repo is a policy question, not an architectural one: what must be exclusive is the tracker's merge into the DEFAULT BRANCH, not the run, so the project lease becomes an N-slot lease with `[orchestration].max_concurrent_runs` (default 1 — today's refusal, unchanged) under a factory-wide ceiling bounded by `max_instances`. Concurrency stays off until the three closeout seams close: ids are minted per checkout, the retro compacts `.tick/learnings.md` by rewrite, and GitHub's server-side merge has none of the tick merge drivers. Telegram needs legibility (project + epic + tick on every gate, report and refusal list), not new arbitration — button and reply-to answers are already id-scoped | UC1c |

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

   *Deploy half shipped* (`internal/factory`, `cmd/tk/cmd/factory.go`): one
   idempotent command provisions D1 + R2, applies `cloud/factory/migrations`,
   mints the bearer token and pushes its hash, deploys the embedded bundle, and
   records `factory_url` / `factory_token` / `factory_version` in `~/.ticksrc`.
   The bundle is embedded in the tk binary the way skills are, so a deployment
   is pinned to a tk version and `tk upgrade` points at a redeploy. The
   orchestrator image is pinned the same way and to the same code: the deploy
   rewrites the staged Dockerfile's `TK_SOURCE_REF` to its own source, and the
   image builds tk from it, so the container's tk and the bundle it boots are
   never a release apart (`cloud/sandbox/README.md`, "The image's tk is built
   from the deployed source"). wrangler is
   resolved as a global binary or through `npx wrangler`, and every capability
   question is answered functionally — attempt the operation, surface the API
   error — never by parsing `wrangler whoami` scopes, which under-report what a
   token can do. CI has no Cloudflare account, so the end-to-end evidence is
   `scripts/verify-factory-deploy.sh` against a stateful wrangler stand-in.
   The deploy's last step is the container rollout, which `wrangler deploy`
   creates and does not wait for: it polls `wrangler containers list --json`
   until the `ticks-orchestrator` application reports the digest this deploy
   pushed, and fails with that comparison spelled out rather than reporting a
   readiness it cannot prove — a green deploy in front of a stale container is
   what makes a correct fix look broken. The confirmed digest is recorded in
   `factory_deployment_image` and stamped onto each run (`run_image`), so
   `tk cloud status <run>` names the image that run booted.
   The credential walk-through (`tk factory setup`) is still open.
3. **Bump `compatibility_date`** (currently 2024-04-03) in the factory bundle —
   DO SQLite storage and current WebSocket hibernation ergonomics are needed.
4. **R2 binding** in the factory bundle for run artifacts.
5. **Retire the vestigial `ralph | swarm-*` enum** in the `run_event` schema in
   favor of substrate-shaped sources (`cloud:orchestrator`, `cloud:worker`,
   `harness`, `herdr`, `pi`) before a producer starts emitting it for real.

## Phases

1. **Phase 1 — the trojan horse.** `tk cloud run <epic>` (UC1) with a *single*
   sandbox: the orchestrator runs the existing skill loop using the existing
   `harness` substrate (subagents) inside one container — which the container
   is *told*, through `TICKS_SUBSTRATE`, rather than left to infer: a repo's
   `[orchestration].substrate` pin is a statement about its local runs, and the
   first run to complete a real agent turn correctly stopped on one
   (`cloud/sandbox/README.md` → *The substrate, and why a container is told*). No RunRoom fan-out
   yet beyond the lease and gates. Ships the whole pipeline end to end —
   auth, secrets, git credentials, sandbox lifecycle, budget enforcement,
   Telegram gates from a phone — with zero new orchestration logic. The
   terminal rung of UC1b's command surface ships here too (`run`, `stop`,
   `status`, `--queue`), because a run you cannot stop or inspect is not
   shippable; the Telegram and GitHub rungs of the same vocabulary arrive with
   their transports in Phase 3.
2. **Phase 2 — real fan-out.** Per-tick worker sandboxes; substrate `cloud` in
   `runners.toml`; reconcile-on-reboot; `run_event` producers; R2 artifacts.
   Landed so far: the dispatch mechanism (0ds), the worker entrypoint (tap),
   and the Run Workflow call site (b6e) that fans a submitted wave out into
   per-tick containers instead of one orchestrator running harness-native
   subagents. NOT landed: `Substrate` in `internal/herd/config/types.go` still
   has no `cloud` value (only `herdr`/`harness`/`auto`) — a repository cannot
   yet *declare* `[orchestration].substrate = "cloud"` and have `tk` agree it
   means anything, so b6e's trigger is submission-level (`tick_ids` present on
   `POST /api/runs`) rather than a repo-config read. Extending the Go enum,
   and the CLI plumbing to populate `tick_ids` from a locally-computed wave,
   are follow-up ticks.
3. **Phase 3 — signals.** The funnel + UC2/UC3/UC6 ingestion, webhook-mode
   Telegram, `external_ref` dedup, and the Telegram/GitHub rungs of UC1b's
   command vocabulary (BotFather command registration, the parse-vs-triage
   split).
4. **Phase 4 — the loops.** UC4 CI-failure remediation (flake gate, strike
   budget), UC5 PR review (credential grades), UC7 sweeps (dispatcher policy,
   cron).

Order rationale: each phase is independently useful, and the risky loops
(4) arrive only after budgets, gates, and reconcile (1–2) are proven.

## Open questions

- **Where does `wave.Compute` run for the dispatcher?** Decided, narrowly, by
  tick b6e (the Run Workflow's `dispatchWave` call site): NOT in the Worker.
  `RunWorkflowParams.tick_ids` carries an already-resolved wave in from the
  submission, and readiness is computed where `tk graph`/`wave.Compute`
  already runs correctly and is already tested — the submitter — rather than
  ported a second time into TypeScript (`.tick/learnings.md`'s "Cross-language
  parity, parsers and formats" is exactly the failure class a second port
  risks). What is still open: the Go CLI side of this (`tk cloud run` naming a
  wave and passing `--tick-ids`) does not exist yet, so today `tick_ids` is
  reachable only by calling `POST /api/runs` directly. A submitter that wants
  ITERATIVE fan-out (wave 2 after wave 1 merges, not just one wave per run) is
  also not addressed — b6e's cloud-wave pass always hands off to a real
  orchestrator boot (`closeout` phase) after dispatching its one wave, which
  can itself compute and drive further waves under the `harness` substrate,
  but does not yet re-enter the per-tick cloud path for them. Both are
  follow-up ticks, not silently assumed away.
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
