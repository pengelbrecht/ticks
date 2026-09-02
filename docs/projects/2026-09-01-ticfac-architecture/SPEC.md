# ticfac architecture

> **Status:** proposed architecture, revised 2026-09-02 (b: run state lives in the repository under `.ticfac/`; see §4.1, §10.4)
> **Scope:** extraction of Factory and execution orchestration from the pengelbrecht/ticks repository into a new ticfac repository.
> **This change:** documentation only. It does not move or modify implementation code.

This document refines the earlier extraction scope in
docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md.
That document established the one-way CLI boundary. This document adds the
target execution architecture behind that boundary, makes the split between
the tracker and the execution system explicit, and deliberately minimizes the
new framework: ticfac is a durable reconciler around tracker state, Git, and a
small executor protocol rather than a second agent platform.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

## 1. Executive decision

Create a separate ticfac repository that owns Factory as an execution
product. Keep ticks as the tracker, work-model, and contract product.

~~~text
                         read and controlled writes
                         through a versioned CLI
┌──────────────────┐  ──────────────────────────────►  ┌────────────────────┐
│      ticks       │       tk --json + contracts       │      ticfac         │
│                  │                                    │                    │
│ graph and ticks  │                                    │ orchestration      │
│ claims/status    │                                    │ reconciler         │
│ acceptance       │                                    │ executor protocol  │
│ run configuration│                                    │ role jobs          │
│ question state   │                                    │ executors          │
│ tk CLI           │                                    │ verify/publish     │
└──────────────────┘                                    │ CF durable host    │
                                                          └────────────────────┘

ticks has no dependency on ticfac.
~~~

The boundary rule is:

> **Ticks owns what work means and whether tracker state is valid. ticfac owns
> how that work is executed, supervised, verified, recovered, and integrated.**

The dependency direction is strict:

~~~text
ticfac ───────► released tk --json commands
ticfac ───────► pinned cross-language contract artifact

ticks ────────X──────► ticfac
~~~

ticfac is not a tk plugin, a Go package imported by ticks, or a hidden
subcommand dispatched by tk. It is an independent program and deployable
system. Unix composition happens through an explicit CLI and structured JSON.

## 2. Repository responsibilities

### 2.1 What stays in ticks

ticks remains deliberately boring and authoritative about the work model. It
owns:

1. The issue/tick store and the .tick/ on-disk representation.
2. Tick identity, dependency graph, readiness, claims, statuses, activities,
   process ticks, epics, roles, and lifecycle invariants.
3. Acceptance criteria and project run configuration, including declared
   testing/evidence commands, role/tier declarations, and orchestration
   limits. ticfac consumes this configuration; it does not redefine it.
4. The tk CLI for tracker reads and controlled tracker mutations. The JSON
   output is the public integration surface.
5. The durable question store and tk ask/tk answer. A transport such as
   Telegram is not part of the tracker core.
6. Tracker-domain schemas and cross-language contract sources. The contract
   fixtures currently listed in contracts/README.md remain maintained from
   this side of the boundary, or are published from a separately versioned
   contract source owned jointly by the two products.
7. tk sandbox and internal/sandbox as the tracker-owned sandbox/runtime
   contract needed by the image and local tracker workflows. This does not
   make ticks responsible for creating or supervising Factory workers.
8. The board and project-facing Cloudflare code under cloud/worker/**. That is
   the ticks.sh board, not Factory; the existing extraction spec explicitly
   distinguishes it from cloud/factory/**.
9. Tracker-domain primitives such as internal/tick, internal/wave, the question
   relay, and any other code useful without running an agent.

ticks MUST NOT contain a Factory deployment client, worker provider, agent
runner, wave supervisor, Factory credential loader, or cloud execution
controller after cutover.

### 2.2 What moves to ticfac

ticfac owns the complete execution product:

1. The deterministic reconciliation loop and durable run records.
2. Configurable role jobs and their structured request/response contracts.
3. The small executor protocol and concrete local, Herdr, Sandbox, and
   Cloudflare Computer adapters.
4. Job workspace allocation, worktrees/branches, source synchronization, and
   substrate-specific materialization.
5. Executor adapters for Claude, Codex, Pi, Prime, and other supported agents.
6. Herdr fleet integration and execution helpers.
7. Verification, evidence capture, integration, recovery, retry, cancellation,
   salvage, cleanup, budgets, and telemetry.
8. Factory-specific GitHub/gateway execution plumbing and cloud credentials.
9. The deployable Cloudflare controller, Worker/Durable Object/Workflow code,
   R2/D1 migrations, and cloud worker image or Computer executor integration.
10. Factory dashboards and Factory-specific operational commands.
11. Factory profiles, execution skills, and operator instructions that explain
    how to use ticfac.

The existing extraction inventory is the starting set: cloud/factory/**,
cloud/sandbox/**, internal/factory/**, the Factory/cloud command adapters,
Factory-specific cloud support, and execution-oriented Herdr helpers. The
exact file move is staged below so tracker-domain code is not moved merely
because it currently shares a directory.

### 2.3 The Herdr and sandbox nuance

The earlier extraction document conservatively listed all of internal/herd/**
as staying. The target architecture sharpens that decision:

- ticks keeps tracker-domain configuration and contract vocabulary, plus
  internal/herd/relay where it is part of question/communication state.
- ticfac takes Herdr process control, fleet selection,
  spawn/wait/collect/reconcile/cleanup execution, executor adapters, and
  execution dashboards.
- ticks keeps internal/sandbox and tk sandbox only as a small, stable
  runtime/configuration dependency. The cloud/sandbox image scripts and
  Factory entrypoints move to ticfac.
- A temporary compatibility build MAY leave a thin tk herd read or
  configuration surface in ticks, but it MUST NOT leave a second wave
  supervisor there. The end state has one orchestration implementation in
  ticfac.

This preserves useful tracker contracts without preserving two competing
execution systems.

## 3. The CLI and contract boundary

### 3.1 tk --json is the only tracker API

ticfac MUST consume released tk behavior, not import ticks' Go internal/
packages. The initial CLI surface should be declared in a checked-in
manifest, analogous to cloud/sandbox/required-tk-commands, with the exact
command, flags, JSON schema, and minimum tk version for each call.

Typical reads include:

~~~text
tk version --json
tk show <tick-id> --json
tk graph --json
tk list --json
tk ready --json
tk status --json
tk sandbox image --json
tk sandbox setup --json
tk sandbox substrate --json
tk sandbox worker-prompt --json
~~~

Typical controlled writes include only tracker mutations that ticfac is
authorized to perform:

~~~text
tk update <tick-id> ... --json
tk close <tick-id> ... --json
tk note <tick-id> ... --json
tk ask ... --json
~~~

The final command names and schemas are a release decision, not an invitation
for ticfac to reach into internal/. A command MUST fail closed when its
requested JSON contract is unavailable or incompatible.

One qualification, stated here so it is not discovered in Phase 4: a
Cloudflare Workflow or isolate cannot execute a Go binary, so on that host the
reconciler cannot shell out to tk. The current factory already resolves this —
it reads .tick/ records from the pushed branch through the contents API and
writes create-only tracker commits the same way, held to tk's behaviour by the
tracker-layout parity fixture. That is the model: **tk --json defines the
tracker contract; a host that cannot run tk implements the same contract in
its own language and proves it with the pinned fixtures of §3.2.** Such an
implementation is a consumer of the contract, not a second tracker — it
performs only the reads and controlled writes listed above, and a fixture
break fails its build. Every host that can run tk runs tk.

### 3.2 Pinned contracts

The current cross-language fixtures under contracts/ exist because Go and
TypeScript implementations must agree on behavior. cloud/factory/CONTRACTS.md
and cloud/factory/package.json already enforce contract checks in the cloud
package. After extraction:

- ticks publishes a versioned contract bundle, or both repositories consume a
  third contract package generated from a single source.
- ticfac pins the exact contract version in source and CI.
- CI runs the same behavioral fixtures against the Go/CLI and TypeScript
  implementations.
- A deliberate fixture break MUST fail at least one build; a copied JSON file
  without an executable check is not a contract.
- The pinned bundle includes runner config, worker boot, message context,
  tracker layout, collection vocabulary, sandbox image/configuration, and any
  new orchestration records that cross the repository boundary.

The contract is behavioral. It is not a public Go package and must not turn
ticks internals into a shared library.

### 3.3 Credentials and deployment ownership

Factory credentials belong to ticfac. The extraction plan already calls for a
separate `~/.ticfacrc`; `~/.ticksrc` must not remain a covert Factory secret
store. ticfac owns Cloudflare account credentials, model/gateway access,
subscription-broker seats, GitHub App or installation credentials, run tokens,
source access grades, and migration of those values. ticks owns no Factory
execution credential; its board-sync credentials remain a separate ticks
product concern.

The complete ownership table, the fifteen-key `~/.ticfacrc` schema, the
merge-and-drain migration, and the security rules are in
[`credentials.md`](credentials.md). The machine-readable contract fixture is
[`contracts/credential-ownership.json`](../../../contracts/credential-ownership.json).
In particular, a `read_only` source grade is enforced by the host and never
receives the operator's GitHub credential; `cancel` revokes before stopping and
a standing stop is a durable refusal to issue a replacement credential before
every boot. Metered credentials carry a telemetry-backed cost budget; a
flat-rate subscription seat carries no per-request cost budget but still has
wall-clock, cancellation, and explicit quota-exhaustion semantics.

ticfac deploy deploys the Factory product. tk does not discover, install,
upgrade, or dispatch to ticfac.

## 4. Minimal target architecture

The first design separated OrchestrationEngine, DecisionAgent, WorkerProvider,
Worker, Workspace, AgentRunner, Verification, Integration, and Recovery. Those
are useful responsibilities, but making every noun a framework abstraction
would recreate an agent platform inside ticfac. The target instead has three
durable authorities and three narrow protocols.

### 4.1 Two durable authorities, one observation source

1. **ticks:** work identity, graph, readiness, roles, acceptance, claims, and
   tracker lifecycle through tk --json.
2. **Git:** source identity, isolated implementation refs, integration refs,
   publication order, recoverable code history — **and ticfac's own run
   state**, committed as files under `.ticfac/` (§4.2, §10.4).

The **execution substrate** is not an authority. Live job handles, processes,
cursors, and workspace materialization are observations; they carry no truth
that has not been persisted to Git or the tracker.

There is no separate run database. ticks already draws this line: tracker
state is committed, `.tick/logs/` is a gitignored cache, and `.index.json` is a
rebuildable index. ticfac applies the same rule with the same layout.
Everything the reconciler needs to resume — run and attempt records,
decisions, idempotency markers, checkpoints, evidence references, budgets —
lives in the repository. What does not live there is either exhaust (logs) or
a derived index (§8.6), and neither is consulted to decide what is true.

This is the ticks principle applied to execution: **everything authoritative
lives in the repo.** A laptop and a Cloudflare host reconciling the same run
read and write the same files, which is what makes §8.2's portability claim
true rather than aspirational, and what lets a dead controller's last
checkpoint be read by anyone with a clone.

### 4.2 The reconciler

The former Orchestration Engine becomes a small deterministic reconciler. On
each invocation it reads current tracker, Git, and executor state; computes the
next valid effects; performs idempotent effects; persists a checkpoint; and can
then stop. Long autonomy comes from repeatedly restarting this loop around
durable external state, not from keeping one sophisticated agent alive.

~~~text
observe tk + Git + executor handles
                 │
                 ▼
             reconcile
                 │
      ┌──────────┼───────────┐
      ▼          ▼           ▼
 tracker effect  Git effect  start/inspect/collect job
      │          │           │
      └──────────┴───────────┘
                 │
                 ▼
          durable checkpoint
~~~

The reconciler owns preflight, readiness, admission, claims, process-tick
repair, dispatch idempotency, fan-in, configured gates, integration,
publication, closure ordering, cancellation, budgets, and cleanup. A green
deterministic gate followed by ready work advances without asking an LLM for
permission.

Two mechanics make the loop safe to restart, and both are Git primitives:

- **A checkpoint is a commit.** The reconciler commits
  `.ticfac/runs/<run-id>/checkpoint.json` on the EpicRun's integration branch
  when state changes — a decision, a dispatch, a collected result — never per
  observation. Recovery is a fetch; audit is `git log -- .ticfac/runs/<run-id>/`.
- **An effect is guarded by a compare-and-swap.** Creating a file fails if it
  already exists; updating one requires its current SHA. Dispatching attempt N
  creates `.ticfac/runs/<run-id>/attempts/<n>.json`, and a second reconciler
  racing for the same attempt is refused by the repository, not by a lock it
  might have lost. This is the primitive the signal funnel already relies on
  (the contents API is a compare-and-swap on the branch ref); a Worker reaches
  it through the GitHub contents API and a local host through
  `git push --force-with-lease`.

"Idempotent effects" therefore has a definition rather than an aspiration: an
effect is idempotent when the compare-and-swap that precedes it proves it has
not already happened.

### 4.3 The executor protocol

WorkerProvider, Worker, Workspace, and AgentRunner collapse at the portable
boundary into one executor protocol:

~~~text
start(JobSpec)       -> JobHandle
inspect(JobHandle)   -> JobStatus
cancel(JobHandle)    -> acknowledgement
collect(JobHandle)   -> JobResult
~~~

The protocol SHOULD be usable as a library or as Unix-style JSON commands:

~~~text
ticfac-exec-<name> start   < job-spec.json
ticfac-exec-<name> inspect < job-handle.json
ticfac-exec-<name> cancel  < job-handle.json
ticfac-exec-<name> collect < job-handle.json
~~~

JobSpec names the role, source revision, requested capabilities, limits,
inputs, output contract, and artifact destinations. JobHandle is a stable,
opaque, re-addressable identity. JobStatus reports lifecycle observations and
a cursor. JobResult reports terminal facts, source refs, structured role
output, and artifact/evidence references. All schemas are versioned.

The schemas themselves live in the contract bundle, at
[`contracts/job-protocol.json`](../../../contracts/job-protocol.json) —
JobSpec, JobHandle, JobStatus, the cancel acknowledgement, JobResult, the
role-result envelope (§4.4) and the evidence record (§10.1), each with a
`schema_id` and `schema_version`. The illustration below is a golden example
in that file, so it validates or a build fails; the negative examples beside it
are the documents each schema must refuse. Both readers —
`internal/factory/jobprotocol` and `cloud/factory/test/job-protocol.test.ts` —
run them.

An illustrative JobSpec is deliberately substrate-neutral:

~~~json
{
  "schema_version": 1,
  "job_id": "run-42/tick-abc/attempt-1",
  "role": "implement-tick",
  "source": {
    "repository": "git@example/repo.git",
    "base_sha": "<sha>",
    "write_ref": "refs/heads/ticfac/run-42/tick-abc/attempt-1"
  },
  "capabilities": {
    "persistence": "durable",
    "isolation": "container",
    "network": "restricted"
  },
  "inputs": [{"kind": "tick", "id": "abc"}],
  "output_schema": "ticfac.job-result.implement-tick.v1",
  "artifact_prefix": "runs/run-42/jobs/tick-abc/attempt-1/",
  "credentials": {"model": "issued-by-host", "source": "read-only"},
  "limits": {"wall_seconds": 3600, "max_cost_usd": 10}
}
~~~

Credentials are part of the protocol, not an adapter detail. The host issues
every credential a job holds — model access, and source access at a declared
grade — and records the grant in the attempt record. `cancel` MUST revoke
those credentials before requesting a stop, and a cancelled handle can never
obtain a fresh one: a kill switch is a durable refusal to issue, checked before
every boot, not a revocation a restart can undo. Cost is a property of the
credential, not of the job. A metered credential carries a cost budget
enforced from gateway telemetry; a flat-rate credential (a subscription seat
behind a broker) has no per-request cost to bound and says so — wall-clock and
cancellation still apply, and quota exhaustion is reported as its own failure
class, never as a broken route.

The Cloudflare executor translates those capabilities to Computer Workspace
and backend choices. A local or future host translates the same request to its
own primitives. Concrete backend names do not cross this seam.

An executor may internally separate provider, workspace, worker, and runner
objects where an SDK makes that useful. Those are adapter implementation
details, not mandatory ticfac-wide abstractions. Initial executors are local,
Herdr, Cloudflare Sandbox compatibility, and Cloudflare Computer. Runner/model
selection is executor configuration.

### 4.4 Role jobs replace a universal Decision Agent

There is no single long-lived Decision Agent and no expectation that one prompt
works across repositories, roles, runners, or model families. Every LLM call is
a bounded job with a role-specific contract. Initial roles are:

~~~text
plan-epic       implement-tick       review-epic
triage-failure  plan-repair          resolve-conflict
closeout-epic   evaluate-goal
~~~

Planning, implementation, review, triage, repair, and closeout can therefore
use different models, prompts, context assemblers, permissions, and budgets.
The reconciler validates each structured result and remains the only component
allowed to mutate tracker state, integrate or publish Git refs, cancel other
jobs, or dispose workspaces.

### 4.5 Per-factory and per-repository decision profiles

ticfac resolves each role invocation into a reproducible DecisionSessionSpec:

~~~text
reconciler role contract
  + factory profile
  + repository context/profile request
  + model-family renderer
  + run override within policy
  = DecisionSessionSpec
~~~

A factory profile selects, per role: profile/version, executor, runner, model,
reasoning effort, prompt variant, context budget, tool/workspace permissions,
retry policy, and fallback. Repository configuration may contribute authoring
guidance, architecture documents, standing rules, learnings, context hints, and
a requested profile. It MUST NOT weaken response schemas, evidence authority,
tracker/Git boundaries, resource budgets, required gates, or factory policy.

For example, an illustrative factory profile can route roles independently:

~~~yaml
version: 1
profiles:
  backend-service:
    roles:
      plan-epic:
        executor: cloudflare-computer
        runner: claude
        model: frontier-planner
        reasoning: high
        prompt: planning/backend-v3
        context_budget: 120000
      implement-tick:
        executor: cloudflare-computer
        runner: codex
        model: coding-default
        reasoning: medium
        prompt: implementation/backend-v5
      review-epic:
        executor: cloudflare-computer
        runner: pi
        model: frontier-reviewer
        reasoning: high
        prompt: review/backend-v4
        workspace: read-only
      closeout-epic:
        executor: cloudflare-computer
        runner: claude
        model: frontier-closeout
        prompt: closeout/default-v2
~~~

Names and file format are illustrative; the required behavior is resolution,
policy validation, versioning, and provenance.

This section describes the end state, not Phase 1. Phase 1 resolves a role to
exactly four things — executor, runner, model, prompt — and records them.
Every other field above earns its place when a real run needs it; the schema
is versioned so that is cheap. Building the full profile machinery before a
run has demanded it is the platform §4 says not to build.

Prompt/context assembly is layered and deterministic:

1. authority and safety boundary;
2. versioned role contract and response schema;
3. factory profile;
4. model-family rendering instructions;
5. ticks authoring/run policy;
6. repository instructions and selected learnings;
7. current epic/tick/Git snapshot;
8. bounded evidence and prior attempts.

Every result records the resolved profile ID and digest, executor, runner,
model, context manifest, input/output schema versions, and effective policy.
This makes behavior explainable and permits evaluation of profiles per factory,
repository family, role, and model without changing the reconciler.

### 4.6 Multi-epic hierarchy and concurrency

A Factory is a deployed execution service, not an epic instance. The hierarchy
is:

~~~text
Factory deployment
  └── repository coordination key (repository + target ref)
       ├── optional campaign/roadmap invocation
       ├── EpicRun A
       │    ├── wave
       │    └── job attempts
       └── EpicRun B
            ├── wave
            └── job attempts
~~~

`ticfac run-epic <epic-id>` is the primitive. `ticfac run <scope>
--max-epics N` is composition: it reads the ready epic frontier from tk and
starts independent EpicRuns up to policy limits. A campaign scheduler fills
capacity; it does not become a second orchestration engine.

Multiple epics MAY execute concurrently, including against one repository.
Each EpicRun receives its own integration branch/workspace and source base.
One keyed repository semaphore limits active EpicRuns, and one serialized
publisher advances the shared target ref. Hard blocked_by edges prevent
admission; soft after edges affect preference only.

The initial same-repository limit MUST remain one until concurrent tick-ID
creation, .tick/learnings.md updates, merge-driver execution, and N-slot lease
reporting are safe. When N is enabled, publication of another epic makes prior
final evidence stale: the waiting EpicRun rebases or merges the new target,
reruns its integrated gate, and reruns semantic frontier review when the change
could invalidate that review. Evidence is fingerprinted to target base SHA,
integration SHA, config digest, and decision-profile digest.

### 4.7 Verification, integration, publication, and recovery

These remain explicit commands/policies, not agent discretion:

- **Verification** runs tracker-authorized commands against a named ref and
  persists bounded evidence.
- **Integration** validates the .tick/ boundary, commits eligible source,
  merges an attempt into its EpicRun integration ref, and preserves conflicts.
- **Publication** serially advances a shared repository target only after
  freshness checks and required gates.
- **Recovery** reruns reconciliation from tk, Git, executor handles, and stored
  artifacts; it adopts or collects surviving jobs, retries within policy, and
  makes uncertainty explicit.

### 4.8 Lessons from current software-factory approaches

The simplification is intentional:

- [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) demonstrates
  that a capable coding loop can remain extremely small: model, linear history,
  and shell actions. ticfac should add durability and coordination, not obscure
  the coding loop behind a large object model.
- [GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)
  uses an ephemeral environment and returns work through normal branches, pull
  requests, and checks. Git and CI should remain first-class coordination
  mechanisms rather than being mirrored in a private database.
- [OpenHands](https://docs.openhands.dev/openhands/usage/architecture/runtime)
  separates agent logic from its runtime. It is a useful executor precedent,
  but ticfac should not rebuild a general agent runtime or event platform.
- [Gas City](https://github.com/gastownhall/gascity) favors composable
  orchestration primitives. Ticks already provides durable work and dependency
  state, so ticfac should not duplicate role hierarchies, mailboxes, or a second
  work ledger.
- [Factory](https://docs.factory.ai/software-factory/overview) supports a broad
  end-to-end software-development platform. That breadth explains abstractions
  that ticfac does not need for the narrower objective of autonomous execution
  over Ticks and Git.
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/) and
  [Restate durable agents](https://docs.restate.dev/ai/patterns/durable-agents)
  demonstrate the value of journaling external effects and restartable steps.
  ticfac should use the host's durability instead of implementing its own
  general workflow runtime.

## 5. The authoring gray area

There is a meaningful boundary between “what a good tick is” and “how a tick
is executed.” It should be resolved by separating the authoring contract from
the execution protocol, not by moving all skills to one repository.

### 5.1 Authoring belongs with ticks

Guidance that defines the quality and meaning of a tracker artifact stays in
ticks. This includes:

- what makes a tick answerable by a fresh worker;
- sizing and vertical-slice rules;
- how to write scope, constraints, file footprints, and acceptance criteria;
- how to distinguish a task, epic, project, process tick, and super tick;
- how to decompose a super tick into child ticks and dependency edges;
- how to avoid horizontal tasks, hidden cross-tick dependencies, cycles, and
  ambiguous ownership;
- how to express role, tier, priority, and risk metadata;
- how to write a definition of done and map acceptance items to authorized
  evidence;
- how to use learnings to improve future tick authoring;
- what a planning proposal must contain before tracker mutation is allowed.

The primary current material is skills/ticks/SKILL.md,
skills/ticks/references/tick-patterns.md,
skills/ticks/references/goal-design.md,
skills/ticks/references/big-picture.md, and the authoring sections of
skills/ticks/references/runners-config.md. These documents describe the
tracker artifact and the quality bar; they do not need to move merely because
a ticfac planner may consume them.

A super tick is therefore a tracker-side authoring concept: a structured
high-level unit whose job is to make a coherent, verifiable decomposition
possible. It is not a new worker substrate or a reason to put a second
orchestrator in ticks.

### 5.2 Execution belongs with ticfac

Guidance that answers “how do we run already-authored work?” belongs in ticfac:

- which executor, runner, model, and role profile to launch;
- how to form a wave and enforce max parallelism;
- how to claim, probe, confirm, wait, adopt, cancel, salvage, and dispose;
- how to select or promote a Cloudflare backend;
- how to run tests and evidence commands;
- how to merge, recover, retry, close, and clean up;
- how to route failures to a repair decision or human question.

The current skills/ticks/references/agent-runner.md contains both categories.
Its tracker protocol and authoring references can remain in ticks; its
execution loop and substrate-specific procedures should be reduced to a
contract reference and implemented/documented in ticfac. No skill should be
the only place that encodes a lifecycle invariant.

### 5.3 The handoff contract

A planning or authoring agent MAY be an LLM and MAY use read-only scouts, but
the result is a proposal. The boundary is:

~~~text
ticks authoring policy
  ├── defines what a valid tick/super tick/plan contains
  ├── validates shape, dependencies, acceptance, and safety
  └── emits a versioned plan/proposal

ticfac execution policy
  ├── chooses how to explore or implement the valid plan
  ├── executes workers and evidence
  └── returns durable outcomes to the tracker
~~~

The authoring handoff should be a versioned plan schema containing stable
client IDs, parent/role bindings, dependency edges, acceptance, scope/file
hints, and provenance. It MUST reject unknown executable fields. Model-authored
acceptance prose MUST NOT authorize shell commands; executable evidence comes
from controller-owned configuration and the contract consumed by ticfac.

This allows ticks to improve authoring guidance and validation independently,
while ticfac can change model routing, scout count, executors, and job
supervision independently.

The current just-in-time rule—only the front feasible epic receives detailed
children—remains the single-epic default. A factory configured for N concurrent
EpicRuns needs a bounded planning window of at most N feasible epics. Each
admitted epic MUST independently satisfy the tracker-owned Definition of Ready
and EPIC-SKELETON invariants before execution. ticfac may run plan-epic jobs and
submit versioned proposals, but tk remains responsible for validating and
applying the resulting tracker mutations.

## 6. Deterministic reconciliation versus agentic judgment

The current skills/ticks/references/agent-runner.md describes a loop of graph
read, claim, launch, wait, integrate, gate, close, and cleanup. That loop should
be executable code. Markdown should explain the contract and operator model,
not be the only implementation of the state machine. This does not imply that
the run is mostly non-agentic: implementation, semantic review, failure
interpretation, and repair still require substantial LLM judgment. It means
that judgment is invoked explicitly as typed role jobs.

### 6.1 Move into programmatic flows

The following are deterministic and belong in the reconciler, executor
adapters, or verification/integration commands:

| Concern | Required behavior |
|---|---|
| Run preflight | Load versioned configuration, validate limits, resolve credentials, and refuse incompatible executors. |
| Graph and claims | Read readiness, enforce dependency and claim invariants, cap concurrency, and make claims idempotently. |
| Process ticks | Create/repair the mechanical process records required by the configured run protocol. |
| Admission | Select only ready work within policy; record selection and attempt before dispatch. |
| Job launch | Resolve a role profile, materialize the workspace, persist the JobSpec before addressing the executor, confirm dispatch, and record the stable handle. |
| Liveness | Re-address by stable identity, use cursors, distinguish a live worker from a missing worker, and avoid duplicate dispatch. |
| Fan-in | Wait for all admitted work, collect all reports, and retain bounded-leg workers for the next controller checkpoint when required. |
| Cancellation | Revoke credentials, request stop, allow bounded salvage, collect durable output, then kill/dispose with a fresh liveness check. |
| Boundary | Reject .tick/ mutations before integration; use explicit read-only tk wrappers where applicable. |
| Integration | Commit source changes, merge clean branches, abort and preserve conflicts, and produce structured outcomes. |
| Gates | Run configured worker/post-wave/integrated/review commands and persist evidence before closure. |
| Progression | After successful deterministic gates, dispatch the next ready wave without requiring an LLM continue decision. |
| Closure | Close tracker state only after required evidence and required review-role results are durable; clean worktrees/branches only after tracker and integration state are durable. |
| Budgets | Enforce wall-clock, executor, wave, model, and cost budgets independently of agent prose. |
| Recovery | Reconcile manifests, durable events, branches, and executor state after restart. |
| Artifacts | Write immutable or content-addressed records with schema versions and source references. |

The existing implementations provide concrete precedents: worker-dispatch.ts
has confirmed dispatch and cancellation/salvage logic; worker-collect.ts has a
structured verdict vocabulary; and extensions/ticks-runner/merge.ts refuses
boundary violations, preserves conflicts, and delays cleanup until durability
conditions are met.

### 6.2 Keep as role-job work

The LLM remains valuable for work that is genuinely judgment-heavy:

- turning an epic or acceptance criteria into useful implementation ticks;
- choosing an implementation and editing source code;
- interpreting a test failure, review finding, or merge conflict;
- deciding whether a repair attempt is justified and what context it needs;
- deciding whether semantic gaps or new work remain after a green integrated
  gate, when the protocol reaches a review or closeout decision point;
- resolving ambiguity by asking a human or using a parked answer;
- producing a review/closeout conclusion grounded in captured evidence.

These decisions MUST be represented as structured, validated role results to
the reconciler. A Markdown skill MAY remain as documentation, versioned prompt
material, or a human workflow guide, but it MUST NOT be the sole authority for
claims, dispatch, cleanup, verification, or closeout.

### 6.3 Frontier review and closeout are epic-boundary roles

The current multi-epic protocol already places frontier-level judgment at the
epic boundary. This is intentional and becomes explicit architecture:

1. Every runnable epic has a role=review process tick blocked by all terminal
   implementation ticks.
2. The review-epic job runs at the configured frontier tier, read-only, against
   the integrated EpicRun ref. It receives the full epic diff from base to
   integration head plus tests, evidence, acceptance, and repository context.
3. The job returns a strict findings/result schema. It cannot mutate source or
   tracker state. The reconciler validates the result and creates or admits
   repair work when findings require it.
4. A role=closeout process tick is blocked by review. The closeout-epic job
   separately evaluates outside-in acceptance, captures retrospective
   learnings, and proposes planning for the next feasible epic when needed.
5. The reconciler closes process ticks and the epic only after their required
   evidence and structured outcomes are durable.

Review and closeout MUST have independently configurable decision profiles.
For example, Pi may require an explicit review role while Claude or Codex use a
different frontier model and renderer. There is no implementation-role
fallback for a required frontier review unless factory policy explicitly names
and records one.

## 7. Mapping the current runners and orchestrators

The current runner documents are capability descriptions, not the final module
boundary. The following is the target mapping.

| Current implementation | Target mapping | Notes |
|---|---|---|
| Claude runner (skills/ticks/references/claude-runner.md) | `claude` runner on the local subprocess executor, plus role profiles | Agent isolation, worktrees, background completion, continuation, and session handling are adapter concerns. Merge, tracker closure, and cleanup remain reconciler effects. |
| Codex runner (skills/ticks/references/codex-runner.md) | `codex` runner on the local subprocess executor, plus role profiles | codex exec, worktree setup, completion/output retrieval, continuation, and review map to JobSpec/Handle/Result; they do not define the epic protocol. |
| Pi runner (skills/ticks/references/pi-runner.md, extensions/ticks-runner/**) | `pi` runner on the local subprocess executor, plus reconciler source material | The extension shows where execution and orchestration are fused. Extract claims/waves/gates/merge/cleanup into reconciliation commands and keep Pi JSON subprocess handling in the executor. |
| Prime/RLM (skills/ticks/references/prime-runner.md) | Read-only/analysis executor capability | Prime's child/worktree limitations and read-only role are capabilities and profile policy. It does not become a second orchestrator. |
| Herdr (skills/ticks/references/herdr-runner.md, internal/herd/**) | Herdr executor | Heterogeneous fleet selection, process/event relay, result collection, adoption, and remote lifecycle sit behind the four-operation executor protocol. Tracker vocabulary and question relay remain in ticks. Herdr never publishes or closes work. |
| Current cloud RunWorkflow (cloud/factory/src/run-workflow.ts) | Cloudflare durable host + reconciler | It currently combines lease/retry/budget supervision, an orchestrator container, wave dispatch, worker lifecycle, collection, closeout, and finalization. The decomposition is specified in §9. |
| Current cloud Sandbox adapter (cloud/factory/src/sandbox.ts) | Compatibility Cloudflare Sandbox executor | Preserve its fakeable six-operation seam internally while presenting JobSpec/Handle/Status/Result to the reconciler. |

## 8. Cloudflare implementation direction

### 8.1 Current repository behavior

The current cloud deployment is already a separate Wrangler project in
cloud/factory/wrangler.toml. It declares Factory Durable Objects, R2/D1
bindings, a Sandbox Container class, and the image at
cloud/sandbox/Dockerfile; it is not deployed together with cloud/worker.

The current cloud/sandbox image deliberately contains both the orchestrator and
worker entrypoints and builds/pins tk inside the image. Its shell scripts
enforce the worker boundary, run the configured agent, write the worker result,
and push the worker branch/report. cloud/factory/src/worker-collect.ts then
collects the branch and RESULT-<tick-id>.md through the durable Git path.

This behavior is a useful compatibility baseline, but it should not dictate the
future controller shape. The image is a worker substrate; the controller
should not need a second coding container simply because the current
implementation uses one.

### 8.2 Cloudflare is the reference host, not the domain model

The production cloud substrate MUST fit Cloudflare directly. The initial hosted
implementation is intentionally Cloudflare-native:

~~~text
Cloudflare Worker        API, webhooks, schedules, campaign admission
Cloudflare Workflow      one durable workflow per EpicRun
Durable Object           repository semaphore and serialized publisher (a lock, not a store)
Cloudflare Computer      primary cloud executor
R2                       large logs and transcripts (exhaust, never authority)
Git + tk                 durable source, work state, and run state (.ticfac/)
~~~

ticfac MUST NOT invent a lowest-common-denominator workflow, lease, storage, or
container API over these products. The Cloudflare host should use Workflow
steps/retries/waits and Durable Object consistency directly where they simplify
the implementation.

Portability exists at the domain seams: tk JSON, Git conventions,
JobSpec/JobHandle/JobStatus/JobResult, role-result schemas, and artifact/evidence
formats contain no Cloudflare binding types. A future local daemon, Kubernetes
controller, or other durable host may run the same reconciliation rules and
executor conformance suite using its native scheduler and storage. It need not
emulate Cloudflare Workflow or Durable Objects.

The explicit non-goal is a universal cloud control plane. Cloudflare is the
reference and initial production host; substrate neutrality means replacing
edge adapters without changing work semantics, not avoiding useful Cloudflare
features.

### 8.3 Cloudflare Computer as the cloud executor foundation

The proposed cloud executor is a Cloudflare Computer adapter behind the
four-operation executor protocol. Cloudflare Computer's public preview describes a
Workspace with a virtual filesystem and pluggable execution backends, including
an isolate shell, a full Linux container shell, and JavaScript execution. See
the [Cloudflare Computer preview announcement](https://developers.cloudflare.com/changelog/post/2026-08-03-cloudflare-computer/)
and the upstream [runtime interface](https://github.com/cloudflare/computer/blob/main/docs/05_runtime_interface.md).

The executor should model one job attempt as:

~~~text
run/tick/attempt
        │
        ▼
Durable Object Workspace
  ├── source checkout / workspace files
  ├── git + artifact handles
  ├── worker-shell       (fast, constrained shell)
  ├── worker-javascript  (structured isolate execution)
  └── container-shell    (full Linux coding/test environment)
~~~

The Workspace is the shared source context; the backend is an execution choice.
The executor MUST keep the source identity, selected backend, backend lifecycle,
and synchronization cursor in the JobResult and durable attempt manifest.

The [Computer worker-shell documentation](https://github.com/cloudflare/computer/blob/main/docs/12_worker_backend.md)
describes the important durability property: worker-shell can execute through a
Dynamic Worker while using the host Durable Object's Workspace storage as the
authoritative filesystem. The [runtime documentation](https://github.com/cloudflare/computer/blob/main/docs/05_runtime_interface.md)
also makes clear that runtime.exec routes to a named backend and that the
selected backend determines the command/runtime semantics.

### 8.4 Explicit backend selection is required today

Computer backend selection is explicit. Omitting backend selects the first
configured backend; it does not perform a safe capability analysis. Therefore
ticfac MUST NOT let an LLM or an arbitrary command string select a backend
without policy validation.

The Cloudflare executor should resolve:

~~~text
(run phase, requested capability, workspace state, budget)
                         │
                         ▼
                 BackendPolicy.resolve()
                         │
          worker-shell / worker-javascript / container-shell
~~~

The selected backend, reason, and required capabilities become durable event
data. A public request may ask for a capability, but only server-side policy
can authorize the concrete backend.

### 8.5 Phase-aware isolate-to-container promotion

The initial policy should be phase-aware rather than attempting to infer the
right runtime from shell text. Static command analysis can be an optimization,
but it is not the source of truth.

| Phase | Default backend | Policy |
|---|---|---|
| Inspect/plan | worker-shell or worker-javascript | Read graph, inspect files, search, parse configuration, and produce a plan. No full toolchain required. |
| Prepare/edit before execution | isolate when required tools are available | Use the shared Workspace. Promote before a command needs native binaries, package managers, network, or a real POSIX userland. |
| First RED/TDD/RGR execution boundary | container-shell | Promote before the first real test/build/install or any operation whose result must reflect the project toolchain. Record the promotion. |
| GREEN and REFACTOR loop | container-shell | Keep the container hot across repeated edit/test cycles. Do not pay repeated cold starts or resynchronize after every test. |
| Per-tick verification | container-shell unless the command contract proves isolate-safe | Run configured evidence commands in the same hot environment when they depend on the toolchain. |
| Integrated/post-wave gate | container-shell | Run the authoritative project gate after integration, with the source ref recorded. |
| Read-only review | isolate or container according to review capability | Use an isolate for static review; use the hot container if review requires tests/builds. |
| Closeout/metadata | controller isolate | Tracker writes, artifact indexing, and state transitions do not need a coding container. |

“RGR/TDD boundary” is intentionally a capability boundary: implementation may
reach it earlier than the first test command if package installation,
compilation, native tools, or network access is needed.

Once promoted, the container remains hot through the RGR loop, per-tick
verification, and any immediately dependent integrated gate. It is released
only after source/evidence synchronization and the reconciler's durability
checks.

There is no implicit promotion in the current explicit-backend API. The
phase/capability policy and its tests are therefore a Cloudflare-executor
responsibility.

Sections 8.3–8.5 are design ahead of a preview API and are Phase 5 material.
Nothing in Phases 0–4 depends on them, and they should be re-read against the
Computer API that actually ships before any of it is implemented (§8.7).
Principle 12 applies to this document as much as to the code.

### 8.6 Durable source versus derived execution state

The executor must make restart behavior legible by separating durable facts from
reconstructable materialization.

**Durable source and evidence:**

- Git remote refs, worker branches, commits, merge commits, and source SHAs;
- .tick/ tracker state, claims, statuses, and notes through tk;
- ticfac run state under `.ticfac/` (§10.4): run and attempt records, decision
  requests/responses with the evidence references they used, executor/backend
  selection and capability decisions, terminal lifecycle facts, checkpoints;
- bounded, redacted evidence records committed beside the run state;
- Durable Object Workspace files/state and synchronization metadata, for as
  long as a job is live.

**Derived local/executor state:**

- a container or Dynamic Worker instance;
- process IDs, live stream handles, output cursors, and temporary directories;
- a local worktree path or container filesystem cache;
- package/build caches and preview processes;
- an in-memory controller object or an unpersisted dashboard view.

**Indexes and exhaust (never authority):**

- D1, if used at all, holds a rebuildable index over `.ticfac/` for dashboards
  and cost queries — the role `.index.json` plays for ticks. Losing it costs a
  rebuild, never a fact.
- R2 holds large streaming logs and transcripts. They are diagnostic material
  (§10.1); the reconciler never consults them to decide state.
- The repository Durable Object holds a lock, not truth (§9.1).

Before disposal, the executor MUST push or persist any source/evidence that the
reconciler relies on. After restart, the reconciler MUST be able to reconstruct
or declare uncertainty from durable manifests and executor inspection. A process
exit or a missing local handle is never by itself proof that a tick is complete.

### 8.7 Preview caveat and compatibility seam

Cloudflare Computer is an early preview as of this architecture date. Its
preview documentation and examples explicitly warn that APIs are unstable.
The existing Factory depends on the pinned @cloudflare/sandbox line in
cloud/factory/package.json and has a tested SandboxBinding seam.

Accordingly:

1. The Cloudflare Computer adapter MUST be behind the executor protocol and a
   feature flag/configuration choice.
2. The exact Computer package/revision and backend contract MUST be pinned.
3. Executor contract tests MUST cover Workspace persistence, backend routing,
   promotion, cancellation, adoption, synchronization, and disposal.
4. The current Sandbox executor MAY remain as a migration fallback until
   Computer parity is proven.
5. The cloud deployment MUST NOT make preview-only Computer APIs part of the
   ticks CLI contract.

The [Cloudflare Sandbox documentation](https://developers.cloudflare.com/sandbox/)
is still relevant to the current container deployment, but it is not a reason
to make the future control plane container-shaped.

## 9. Cloud orchestrator and RunWorkflow decomposition

### 9.1 Target cloud shape

The cloud orchestrator is a lightweight Worker control plane. One Cloudflare
Workflow hosts each EpicRun, while a small Durable Object coordinates repository
capacity and serial publication:

~~~text
request / webhook / schedule
              │
              ▼
Worker API / campaign scheduler
              │
              ├──────────────► RepoSemaphore Durable Object
              │                 N active epic slots + one publisher
              ▼
Workflow per EpicRun
  ├── durable reconcile checkpoints and waits
  ├── cancellation, budgets, retries, idempotency
  ├── role JobSpec creation and result validation
  ├── Computer executor calls
  └── verification, publication request, finalization
              │
              ▼
Computer Workspace + role job/container(s)
              │
              ▼
   Git: branches, reports, evidence, .ticfac/ run state
~~~

The Durable Object is a coordination lock, not a store: it grants epic slots
and serialises publication, and every fact it acts on is read from `.ticfac/`
and tk. If it is lost, the safe outcome is that nobody holds the lock until
reconciliation re-derives who should — the lease that lapsed in the current
implementation failed exactly this safe way.

Deep coding happens in jobs. The orchestrator therefore needs no orchestrator
container. It can start a role job from an isolate/service boundary, persist
the JobResult, and continue reconciliation from a durable Workflow checkpoint.
Tracker reads and controlled writes from the Workflow go through the
contract-held implementation of §3.1; nothing here needs a container in order
to talk to the tracker.
A temporary orchestrator container is justified only if a
specific control-plane operation requires a capability unavailable to the
controller; it is not the default execution model.

### 9.2 Responsibilities currently mixed into RunWorkflow

cloud/factory/src/run-workflow.ts is currently a roughly 3,500-line boundary
around run supervision. It is valuable code, but its responsibilities need to
be split by ownership rather than copied into a new monolith.

| Current responsibility/symbol | Target owner | Extraction rule |
|---|---|---|
| RunWorkflow wrapper and request entrypoint | Cloudflare host adapter | Keep thin. Decode an EpicRun request, load durable context, invoke reconciliation, and translate the result to the existing API. |
| superviseRun | Workflow host + reconciler | Keep cancellation, retry envelope, idempotency, and durable checkpointing in Workflow. Express run semantics as reconciliation transitions. |
| supervisePass | Workflow steps around reconciliation | Retain step budgets, restart handling, and terminal cleanup. Remove the assumption that every pass boots and watches an orchestrator coding container. |
| superviseWaveLoop | Reconciler | Observe graph/jobs, dispatch ready work, wait, collect, integrate, and gate. Green deterministic evidence advances automatically; role jobs are invoked only at named judgment points. |
| runWaveBatch | Reconciler + executor | Platform chunking may remain in the host. Admission, JobSpec creation, inspect/collect, and integration use the narrow protocols. |
| superviseCloudWave | Cloudflare Computer/Sandbox executor | Keep per-tick tokens, attempt manifests, salvage, collection, and teardown inside the adapter. Wave policy remains in reconciliation. |
| Sandbox process adapter | Compatibility executor implementation | Preserve the fakeable process seam from cloud/factory/src/sandbox.ts; replace “orchestrator sandbox” with a Workflow checkpoint and executor call. |
| worker-dispatch.ts lifecycle | Executor adapter + reconciliation | Preserve confirmed dispatch, inspect/adopt, timeout, cancellation, salvage, fresh liveness checks, and disposal. Persist handles/results rather than relying on Workflow-local variables. |
| worker-collect.ts | Evidence/collection adapter | Preserve the Git branch/result-report contract and verdict vocabulary. Add artifact references and schema versioning. |
| finalize | Control-plane finalizer | Keep token revocation, cost/telemetry, run record, known-resource cleanup, lease release, and API final status. It consumes reconciled terminal facts. |
| assessProgress / applyProgress | Recovery + finalizer | Keep durable-ref-based completion assessment. “Completed with uncertainty” remains an explicit outcome, never hidden success. |
| Review/closeout path | review-epic/closeout-epic jobs + reconciler | Preserve the epic-boundary process ticks and frontier routing. Jobs return structured judgment; configured checks, artifact persistence, repair admission, and tracker closure are deterministic. |

The resulting division is:

- **Cloudflare host:** make each EpicRun survive requests, isolate eviction, and
  retries; own Workflow checkpoints, the repository DO, credentials, and R2.
- **Reconciler:** compute safe next effects from tracker, Git, executor, and
  evidence facts.
- **Executor:** run one bounded role job and return a durable result on a
  concrete substrate.

### 9.3 Why Workflow still has a role

Moving lifecycle rules out of Markdown does not mean implementing a portable
workflow engine. Cloudflare Workflow supplies durable waiting, bounded steps,
cancellation, and retry across Worker isolate lifetimes. It is the native
reliability host around a small reconciler, not the place where tracker policy,
executor mechanics, and role prompts are interleaved. Another deployment host
may provide different durability while retaining the same external protocols.

## 10. Artifacts, evidence, and workspace state

### 10.1 Artifact categories

ticfac should distinguish three related objects:

1. **Source state:** Git refs/commits and tracker state that says what work
   exists and what is closed.
2. **Evidence:** a bounded, reproducible record that a configured command or
   review check ran against a named source ref and produced a result.
3. **Operational artifacts:** manifests, event logs, executor handles, model
   metadata, transcripts, and salvage records needed to explain or recover a
   run.

An evidence record should minimally contain:

~~~text
schema_version
key                              names the record, and is its filename (§10.4)
provenance:
  run_id / tick_id / attempt
  source_ref / source_sha / integration_ref
  phase / executor / workspace_id / backend
  role / profile_digest / model / context_manifest_digest
check identifier (id, kind, command)
started_at / finished_at / exit_code
stdout/stderr or artifact URI (bounded and redacted)
result / acceptance (required | advisory)
content digest and persistence URI
~~~

**There is exactly one schema for this record in the bundle:**
[`contracts/job-protocol.json`](../../../contracts/job-protocol.json)
`records.evidence`, published as `ticfac.evidence.v1`. Every field above is
required there, nullable where it can be genuinely absent: a record that omits
`integration_ref` and one that states it as null are different claims, and only
the second is evidence.

The provenance fields are one nested object, `$defs.provenance`, because §10.4
requires every committed `.ticfac/` file to carry them — a checkpoint, an
attempt and a decision carry the same object, not a similar one.
`contracts/ticfac-run-state.json` places the file and pins how it is written
(§10.4) and *references* this schema by its `schema_id` rather than describing
the record a second time; bundle 2.0.0 is the version that settled that, after
1.2.0 shipped two shapes no single document could satisfy.

Terminal output is useful diagnostic material, but it is not a completion
contract. This preserves the current worker-collect.ts rule that durable Git
refs and RESULT-<tick-id>.md reports drive collection.

### 10.2 Authority and closeout ordering

The reconciler should enforce this ordering unless a named protocol explicitly
requires a different transaction:

~~~text
worker report/evidence persisted
        │
        ▼
source branch integrated or explicitly rejected/preserved
        │
        ▼
post-wave/integrated gate persisted
        │
        ▼
tracker state closed through tk --json
        │
        ▼
worktree/branch/executor resources cleaned up
~~~

The current local implementation demonstrates the important final edge:
extensions/ticks-runner/merge.ts refuses cleanup until tracker durability and
integration ancestry are known. The cloud implementation must apply the same
invariant even when the executor is remote or the controller restarts.

### 10.3 Job workspace lifecycle

Each job has a base source identity and may have a disposable workspace
materialization. The executor MUST record:

- the source/base SHA used to create it;
- the worker branch/ref and attempt;
- the current backend and promotion history;
- pending synchronization work;
- artifact and evidence references;
- disposal eligibility.

Disposal is allowed only after the reconciler has either persisted required
source/evidence or recorded an explicit recovery/escalation outcome.

### 10.4 Run state in the repository

ticfac keeps its run state in the repository it executes against, under a dot
directory that mirrors `.tick/` in layout and in its boundary rules — but
**not** in its persistence policy, because run state and issue state have
opposite requirements (see below):

~~~text
.ticfac/
  runs/<run-id>/
    checkpoint.json            one commit per state change, pushed at once; audit = log of the run branch
    attempts/<n>.json          created once per dispatch — existence is the idempotency marker
    evidence/<key>.json        bounded, redacted evidence records (§10.1)
    decisions/<n>.json         role-job requests and validated responses, with provenance
  .index.json                  gitignored, rebuildable (D1 is the hosted equivalent)
  logs/                        gitignored exhaust
~~~

Every committed file carries a `schema_version` and the provenance fields of
an evidence record. One file per record, so concurrent EpicRuns writing
different `runs/<id>/` directories merge cleanly — the same argument ticks
makes for one file per tick.

**Why `.tick/` is committed, and why that does not transfer as-is.** `.tick/`
is committed because issue state is the project's shared memory: written by
people and agents at a few changes a day, read by everyone, alive for as long
as the project. Committing it is how status is persisted and shared, and a
local commit that is pushed later is fine. Run state is the opposite on every
axis:

| | `.tick/` (issues) | `.ticfac/` (runs) |
|---|---|---|
| Author | people and agents, any clone | one reconciler, holding the lease |
| Churn | a few writes a day | hundreds of writes per run |
| Lifetime | the project's | the run's; terminal state is all that matters afterwards |
| Reader | everyone | the reconciler, and a person reading a post-mortem |
| Durable when | eventually pushed | **pushed on origin, at once** — the writer is a sandbox that can be wiped |
| Conflict | merge by hand | compare-and-swap; a conflict is the signal |

So `.ticfac/` adopts `.tick/`'s location and boundary, and its own
persistence policy:

- **Durable means on origin.** A checkpoint that exists only in a working tree
  or a local commit does not exist. The reconciler writes, commits, and pushes
  as one operation, and the compare-and-swap of §4.2 is against the origin
  ref, not the local one. This is the exact lesson of the sandbox keeper: a
  container that dies leaves its work on origin or nowhere.
- **Churn stays on the run branch.** During a run, every state change is a
  commit on the **EpicRun's integration branch**, which already exists and
  already carries the run's merged worker work. The run's full history — every
  checkpoint, attempt, decision — is that branch's log.
- **The target ref receives the terminal record once.** At publish, the
  run's `.ticfac/runs/<id>/` lands on the target ref through the epic's PR in
  its final form only: the last checkpoint, all attempts, evidence and
  decisions — bounded files, the way a closed tick stays in `.tick/`. The
  intermediate commits do not land on main; a squash merge collapses them by
  construction. Before the run branch is deleted the reconciler tags it
  (`ticfac/run-<id>`), so the full history stays reachable for a post-mortem
  without living in the target's log. Retention of tags and of terminal run
  directories is `ticfac gc`, by age and terminal state, the way
  `.tick/activity/` is pruned.
- **A run that never publishes still has its record.** The tag is placed at
  terminal state, not at merge, so a failed or cancelled run's history is as
  reachable as a successful one's.

Rules:

- **Only the reconciler writes `.ticfac/`; workers never do.** This is the
  `.tick/` boundary rule mirrored, and it is enforced the same way. ticks never
  reads `.ticfac/`, so the one-way dependency holds.
- **It is run state, not configuration.** Profiles stay in the ticfac
  repository (§11) and run configuration stays in `.tick/runners.toml` (§2.1).
  `.ticfac/` must not become a second configuration surface.
- **Checkpoint on state change, not on observation.** A poll that learns
  nothing writes nothing.
- **Every effect is preceded by the compare-and-swap that proves it has not
  happened** (§4.2).
- A deployment MAY point `.ticfac/` at a sibling repository for operators who
  do not want execution history in the project's own history; the default is
  the project repository, because the coordination key is already
  repository + target ref.

**Where this is frozen.** Everything in this section is pinned as a contract
rather than left as prose, because two hosts implement it through different
machinery and prose does not fail a build:

| what | where |
|---|---|
| the layout, persistence policy, CAS rules, record schemas, golden and negative examples, the `.gitignore` fragment, and the CAS sequences | `contracts/ticfac-run-state.json` |
| Go reader — schemas, policy, and `git check-ignore` against the real `.gitignore` | `internal/factory/runstate/contract_test.go` |
| Go reader — the CAS sequences against an in-memory git fake | `internal/factory/runstate/cas_fake_test.go` |
| TypeScript reader — the same sequences, the same golden examples, an independently written fake and schema validator | `cloud/factory/test/ticfac-run-state.test.ts`, `cloud/factory/test/git-cas-fake.ts`, `cloud/factory/test/schema-subset.ts` |

The record schemas cover `checkpoint.json`, `attempts/<n>.json` and
`decisions/<n>.json` in full. For `evidence/<key>.json` the contract pins only
the path, the compare-and-swap mode and the envelope every committed file
carries; the record itself is §10.1's `ticfac.evidence.v1`, which
`contracts/ticfac-run-state.json` names in `references.evidence` and does not
redefine. `<key>` in the path is the record's own `key` field, so a filename, a
citation in a JobResult and the record all name the same thing.

The envelope's provenance is that same `$defs.provenance` object, copied into
this contract so its local `$ref`s resolve — the schema subset both readers
implement has no cross-file `$ref`. The copy is compared structurally by the
readers rather than trusted: bundle 1.2.0 had two spellings of this record,
each contract validated only its own examples, and both suites stayed green
while no document could satisfy both. Two rules now cross that seam and are
executable — each contract's golden evidence example is validated against the
other contract's rule, and a `schema_id` appearing in more than one contract
file must resolve to exactly one definition.

The costs are known and bounded. Write cadence at roughly ten checkpoints per
hour is negligible. A Worker pays GitHub API rate limits for these commits as
it already does for `.tick/`; batch where possible and flush bulk evidence from
a container. A compare-and-swap conflict between two reconcilers is the desired
outcome, not an error to retry blindly.

## 11. Initial ticfac repository layout

The repository should expose the narrow protocols in its directory structure,
not encode the earlier object taxonomy. Preserve the current Go/TypeScript
implementation languages during extraction; consolidation is not required.

~~~text
ticfac/
├── cmd/ticfac/                    # run-epic, run, status, cancel, deploy
├── core/
│   ├── reconcile/                 # pure next-effect rules + checkpoint types
│   ├── ticks/                     # tk --json client
│   ├── git/                       # integration, freshness, serialized publish, .ticfac/ run state
│   ├── jobs/                      # four-operation executor protocol
│   ├── roles/                     # role contracts, profiles, context assembly
│   └── evidence/                  # verification and artifact records
├── executors/
│   ├── local/                     # Claude/Codex/Pi/Prime process adapters
│   ├── herdr/                     # remote/fleet adapter
│   ├── cloudflare-sandbox/        # compatibility adapter
│   └── cloudflare-computer/       # Computer + backend/promotion policy
├── cloudflare/
│   ├── worker/                    # API, webhook, campaign admission
│   ├── workflows/epic-run/        # Workflow host for one EpicRun
│   ├── durable/repository/        # N-slot semaphore + serialized publisher
│   ├── artifacts/                 # R2 indexing/storage
│   ├── migrations/                # D1 index only; never run-state authority (§8.6)
│   └── tests/
├── profiles/                      # versioned factory/role defaults
├── schemas/                       # tk pin + Job*/role/evidence contracts
├── image/                         # compatibility worker image; no target
│                                      orchestrator image
├── skills/                        # execution/operator guidance only
├── docs/
└── README.md
~~~

Subdirectories MAY become packages only when implementation pressure requires
it. `core/reconcile` must not import a concrete executor or Cloudflare binding.
The Cloudflare host may depend on the core protocols; the core must not depend
on Workflow, Durable Object, R2, Sandbox, or Computer types.

## 12. Migration plan

The plan proceeds in contained chunks, each **gated by a real run**, not by
tests alone. Each chunk is one epic in `.tick/` whose final tick is the gate
run, the way project w1z's A1 was. Local hosts come before the Cloudflare
host: local is where the reconciler is validated cheaply, with a person
watching and no meter running, and local orchestration is used daily, so
validation there is real use. Cloud is the hardest host (no tk, wipes, step
caps, money) and meets the reconciler only once it is proven.

Two terms to keep straight. An **executor** is where a job runs and how it is
started, inspected, cancelled, and collected. A **runner** is the harness
inside the job — `claude`, `codex`, `pi`. Refactoring local orchestration means
the reconciler plus two executors; runners are unchanged.

### Phase 0: freeze behavior and the three protocols

1. Publish the tk --json command manifest and minimum version.
2. Pin the cross-language contract bundle and run it from both repositories.
3. Define JobSpec, JobHandle, JobStatus, JobResult, role-result, and evidence
   schemas before moving code —
   [`contracts/job-protocol.json`](../../../contracts/job-protocol.json), read
   from Go by `internal/factory/jobprotocol` and from TypeScript by
   `cloud/factory/test/job-protocol.test.ts`.
4. Record current cloud routes, D1/R2 keys, image tags, worker result semantics,
   and cleanup ordering as compatibility tests.
5. Define credential ownership and `~/.ticfacrc` migration (see
   [`credentials.md`](credentials.md)).
6. Define the `.ticfac/` layout, checkpoint, and compare-and-swap rules
   (§10.4) alongside the schemas; run state never lands in D1 as authority.
   Frozen as `contracts/ticfac-run-state.json`, read from Go
   (`internal/factory/runstate/`) and TypeScript
   (`cloud/factory/test/ticfac-run-state.test.ts`); the compare-and-swap
   sequences run as table tests against an in-memory git fake on both sides.
7. Inventory the lifecycle invariants the current implementation earned from
   live failures (Appendix A) and encode each as a conformance test that the
   reconciler and every executor must pass, before any reconciler code exists.
   run-workflow.ts is 3,500 lines because of these orderings; §9.2 preserves
   the symbols, this preserves the reasons. Frozen as
   [`contracts/lifecycle-invariants.json`](../../../contracts/lifecycle-invariants.json)
   — thirteen named tests over a fake reconciler/executor harness, with a named
   guard per invariant and a per-invariant negative control, read from Go by
   `internal/factory/lifecycle/` and from TypeScript by
   `cloud/factory/test/lifecycle-invariants.test.ts`. A new **executor** re-runs
   the suite; a new runner on an existing executor does not.

**Gate:** the contract bundle passes from both repositories; no behavior has
changed. Small and boring on purpose.

### Phase 1: the reconciler and the local subprocess executor

1. Create ticfac with independent CI and `ticfac run-epic <id>`. Separate from
   the start: the contract bundle is what makes the release dance cheap, and a
   separate repository is the only mechanical proof of the dependency
   direction.
2. Implement the tk client, Git integration command, evidence command, and the
   restartable reconciliation loop for one epic at concurrency one. This is the
   deterministic lifecycle — claims, waves, gates, merge, boundary checks,
   cleanup ordering — in code, and it now exists for local orchestration by
   construction rather than as a later extraction.
3. Implement the **local subprocess executor** through the four-operation
   protocol: a worktree per attempt, the runner launched headless, RESULT as
   the completion contract. Start is spawn; inspect is pid, worktree state,
   and RESULT; cancel is kill; collect is read the worktree branch. `claude`,
   `codex`, and `pi` are runner values on this one executor — the same
   worktree-per-attempt mechanism for all three, so Appendix A is tested once.
   (The current Pi JSON subprocess handling is this executor with one runner
   hardcoded.)
4. Add independently configurable implement-tick, review-epic, and
   closeout-epic profiles; preserve the EPIC-SKELETON behavior. Phase 1
   profiles resolve to executor, runner, model, prompt and nothing else
   (§4.5).
5. Demonstrate restart after dispatch, after collection, and before closure
   without duplicate work or false success.

The interactive session's own subagent tool is not an executor: the reconciler
cannot drive it from outside, so that path only works if the session is the
reconciler, which is the Markdown loop Phase 3 retires. The interactive agent
becomes an operator — it runs `ticfac run-epic`, watches, and intervenes.

**Gate:** one real epic on this repository completes through ticfac locally
with a `claude` or `codex` runner, killed and restarted at each of the three
points in step 5.

This phase is the v1 architecture test. Do not add a general event bus,
universal workflow abstraction, plugin system, or same-repository multi-epic
execution to make it pass.

### Phase 2: the Herdr executor

1. Implement the Herdr executor behind the same four operations; move
   execution-oriented Herdr process/fleet helpers from internal/herd/** into
   it. Herdr adds fleet visibility, panes, and heterogeneous runner selection
   on top of the Phase 1 contract; it does not add lifecycle.
2. Support a range of Herdr protocol versions from the start (a hard floor, a
   warn version, no upper bound) — the single most recurrent local breakage.
3. Retain tracker-domain configuration and the question relay in ticks.
4. Move internal/factory/** and Factory command files from cmd/tk/cmd/ to the
   ticfac CLI; do not retain hidden tk dispatch shims. Replace every ticks
   internal Go import with tk --json, Git, or a pinned schema.

**Gate:** a real ticks epic is run through `ticfac run-epic` on Herdr instead
of the tk herd skill ritual, by the operator, for actual work. This is the
dogfood gate and the one that proves the architecture is worth having.

### Phase 3: role jobs, and retire Markdown as lifecycle implementation

1. Run review-epic and closeout-epic as role jobs with validated results and
   evidence records, locally, on both executors.
2. Delete — not extract — the lifecycle loop from
   extensions/ticks-runner/runner.ts, merge.ts, boundary.ts, and
   agent-runner.md; Phase 1 already holds that behavior in code.
3. Keep good-tick, super-tick, Definition of Ready, roadmap, role, and
   EPIC-SKELETON authoring policy in ticks.
4. Keep a concise tracker-facing runner contract in ticks and move concrete
   role prompts, executor procedures, and operator guidance to ticfac.
5. Add conformance tests proving every executor obeys the same lifecycle and
   source/evidence boundary.

**Gate:** an epic's review and closeout run as jobs with evidence records and
no person reading runner Markdown; the ticks skill no longer contains a
lifecycle.

### Phase 4: move the Cloudflare product as a compatibility host

1. Move cloud/factory/** to ticfac/cloudflare/** while preserving routes and
   D1/R2 behavior initially.
2. Make RunWorkflow host the reconciler rather than an orchestrator coding
   container; use one Workflow per EpicRun. Tracker access goes through the
   contract-held implementation of §3.1.
3. Introduce the repository Durable Object with one slot and one serialized
   publisher. Preserve current RunRoom lease behavior behind it.
4. Move cloud/sandbox/** to ticfac/image/** and expose current SandboxBinding
   behavior through the compatibility executor.
5. Keep cloud/worker/** in ticks and verify that the ticks.sh board is absent
   from the Factory deployment.
6. Move run/attempt/decision records from D1 into `.ticfac/` on the run
   branch, pushed on origin at once (§10.4); leave D1 as a rebuildable index
   or remove it.
7. Move Factory credentials, embedding, deployment bundles, and CI.

**Gate:** project w1z A1 again — an epic completes unattended and merges its
own PR — through the new reconciler, with a restart of the Workflow mid-run.

### Phase 5: introduce Cloudflare Computer

1. Implement the Computer executor without changing Job* or role contracts.
2. Pin the preview dependency and test Workspace persistence, explicit backend
   routing, cancellation, inspection/adoption, collection, and disposal.
3. Implement phase-aware isolate-to-container promotion and keep the container
   hot through the RGR/TDD and verification loop.
4. Shadow the Sandbox executor before changing defaults; retain Sandbox as
   rollback capacity until parity and preview risk are acceptable.

**Gate:** the Phase 4 gate run repeated on the Computer executor, shadowed
against Sandbox, with matching evidence.

### Phase 6: enable multi-epic composition deliberately

1. Add `ticfac run <scope> --max-epics N` as a scheduler over independent
   run-epic primitives.
2. First permit concurrency across different repository coordination keys.
3. Enable N greater than one for the same repository only after tick-ID,
   learnings-file, merge-driver, lease/status, and freshness tests pass.
4. Serialize publication, rerun stale integrated gates, and rerun semantic
   frontier review where a changed target can invalidate it.

**Gate:** two epics in the same repository complete concurrently with
serialized publication and no stale gate.

### Phase 7: cut over and simplify ticks

1. Release ticfac and the required tk version/contracts together.
2. Remove Factory/cloud commands, packages, embedding, cloud image assets, and
   Factory CI from ticks.
3. Remove duplicate execution/orchestration implementations from ticks while
   retaining tracker authoring policy, sandbox contracts, question state, and
   the board.
4. Prove the dependency direction mechanically: ticks builds without ticfac;
   ticfac passes compatibility against a pinned ticks release.

**Gate:** ticks builds without ticfac; ticfac passes the contract bundle
against a pinned ticks release.

## 13. Design principles

1. **One-way dependency.** ticfac consumes released tracker contracts; ticks
   does not know Factory exists.
2. **Unix-shaped narrow waist.** Compose tk JSON, Git refs, executor JSON, and
   evidence files; do not require every component to share a process or SDK.
3. **Reconcile durable facts.** Long autonomy comes from restartable short
   decisions over tracker, Git, executor, and artifact state.
4. **LLM for judgment, code for invariants.** Role jobs propose bounded
   judgments; the reconciler validates and executes effects.
5. **Different roles deserve different profiles.** No universal prompt, model,
   or context strategy is assumed across factories or repositories.
6. **Cloudflare-native host, portable domain seams.** Use Workflow, Durable
   Objects, Computer, and R2 directly, while keeping Job*, role, Git, and
   evidence contracts free of Cloudflare types.
7. **Git is the ledger — for source and for run state.** Branches, commits,
   ancestry, checks, and `.ticfac/` are not duplicated into a private database.
   Everything authoritative lives in the repository, as it does for ticks.
8. **Durable facts beat liveness.** Process exits and handles are observations;
   source refs, tracker state, JobResults, and evidence are authoritative.
9. **Explicit capability/backend policy.** Selection is recorded, authorized,
   and tested rather than inferred from arbitrary model-generated shell.
10. **Least privilege.** Jobs cannot close tracker state, publish shared refs,
    dispose other jobs, or authorize evidence.
11. **Evidence before closure and freshness before publication.** Results are
    tied to the exact source/config/profile they evaluated.
12. **Extract before optimizing.** Preserve behavior behind narrow contracts,
    then simplify or replace adapters independently.
13. **Preview products stay at the edge.** Computer can be the preferred cloud
    executor without becoming a ticks or portable-core contract.

## 14. Non-goals

- Rewriting tk, the tick store, or the graph model.
- Moving cloud/worker/** or the ticks.sh board into ticfac.
- Creating a public Go API from ticks internals or a hidden tk plugin/dispatch
  mechanism for Factory.
- Building a general agent runtime, event-sourcing platform, issue tracker, or
  project-management system.
- Building a lowest-common-denominator cloud abstraction over Cloudflare.
- Requiring other hosts to emulate Cloudflare Workflow or Durable Objects.
- Making each responsibility—provider, worker, workspace, runner, decision
  agent—a mandatory public framework object.
- Using one prompt/model/profile for every repository and role.
- Creating one Factory deployment per epic.
- Enabling same-repository multi-epic publication before its known concurrency
  hazards are resolved.
- Making an LLM responsible for claims, cleanup, merge safety, publication, or
  acceptance-evidence authority.
- Inferring Cloudflare backends solely from command strings.
- Requiring an orchestrator coding container.
- Replacing Sandbox and extracting repositories in one flag-day change.
- Treating Computer preview APIs as stable without pinning and conformance
  tests.
- Keeping authoritative run state in any store the repository cannot
  reconstruct it from.

## 15. Initial completion criteria

The first production architecture is complete when all of the following hold:

- ticks builds and tests without importing or embedding Factory code.
- ticfac builds against a pinned tk --json release and contract bundle.
- `ticfac run-epic` completes and recovers one epic using only tk, Git, the
  executor protocol, configured role jobs, and evidence commands.
- Local and Cloudflare compatibility executors pass the same Job* conformance
  suite; Herdr can be added without changing reconciliation semantics.
- The Cloudflare deployment uses one Workflow per EpicRun, a repository Durable
  Object as a lock, R2 for logs, and no required orchestrator coding container.
- Authoritative run state lives under `.ticfac/` in the repository; D1 is
  absent or provably rebuildable from it; a controller restarted from a clone
  alone reconciles every in-flight attempt.
- Review and closeout execute as independently configurable epic-boundary roles
  against the integrated diff and return validated structured results.
- A job result is accepted only with durable source/report/evidence facts and
  recorded profile/context provenance.
- A restart can reconcile or explicitly escalate every in-flight attempt; it
  cannot silently redispatch or declare success from missing local state.
- Integration rejects unauthorized .tick/ mutations, preserves conflicts, and
  publication verifies evidence freshness against the current target.
- The Computer executor can promote from isolate to container at the RGR/TDD
  boundary, keep it hot through tests, synchronize durable state, and dispose
  safely.
- Multi-epic composition works across repositories. Same-repository concurrency
  remains one until the Phase 6 preconditions pass, then uses isolated EpicRuns
  and serialized publication.
- No Factory-specific command, credential, runner, or wave supervisor remains
  in ticks beyond an explicitly documented compatibility transition.

## Appendix A: Lifecycle invariants earned from live runs

Each of these was paid for by a failed cloud run before it was written down.
They are conformance tests, not guidance: a reconciler or executor that
violates one is wrong regardless of what the rest of this document says.

1. **A stop is a durable refusal to issue credentials, checked before every
   boot** — not a revocation a restart can undo. Revoke before teardown: the
   money dies first, then the work is rescued.
2. **A supervisor cannot report its own death.** A record written by the thing
   that may be gone is not evidence of its liveness. Liveness is observed from
   outside; the run record is not it.
3. **No step outlives the host's cap.** Long waits are spread across bounded
   steps that re-derive state from durable facts on each leg.
4. **Polling is the keepalive.** The interval at which a live job is addressed
   stays well under the substrate's sleep/wipe threshold, and that relationship
   is pinned by a constant or a test, not by arithmetic in two files.
5. **In-progress work is pushed on a timer.** Durability that depends on a job
   remembering to push is not durability. A process exit or a missing handle is
   never proof of completion, and a job that dies leaves its partial work on
   origin.
6. **A live job is never redispatched.** Adopt by stable identity; a fresh
   attempt is created only when the previous one is proven dead.
7. **Read back after write.** A recorded decision or wave is confirmed by
   re-reading it before anything acts on it; a write that silently did not land
   must not look like a finished epic.
8. **An in-flight state is settled by whoever finds it next**, from durable
   evidence (does the thing exist?), never by trusting the claimer to return.
9. **Never collapse distinct failure classes into one message.** An expired
   lease and a stolen one; an absent report and landed work; a record that is
   unreadable and one that is outside the epic — each reports differently.
10. **Boundaries are enforced by the substrate, not requested of the model.**
    Compliance is a property of the model. The `.tick/` and `.ticfac/` rules
    are made impossible to break, and every attempt is reported.
11. **A struck-out unit is released by a person, never by the clock.** A
    rolling window bounds the window, not the subject; a table with writes and
    no reads is not a guard.
12. **Effective budgets are reported after clamping.** An operator's number
    silently replaced by a deployment ceiling is discovered from a cancelled
    run; say the number that will govern at submission.
13. **Evidence is fingerprinted to what it evaluated** — source SHA,
    integration SHA, config digest, profile digest — and publication checks
    freshness against the current target.
