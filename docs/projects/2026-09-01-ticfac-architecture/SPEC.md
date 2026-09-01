# ticfac architecture

> **Status:** proposed architecture, 2026-09-01
> **Scope:** extraction of Factory and execution orchestration from the pengelbrecht/ticks repository into a new ticfac repository.
> **This change:** documentation only. It does not move or modify implementation code.

This document refines the earlier extraction scope in
docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md.
That document established the one-way CLI boundary. This document adds the
target execution architecture behind that boundary and makes the split between
the tracker and the execution system explicit.

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
│ claims/status    │                                    │ decision agent     │
│ acceptance       │                                    │ workers/providers  │
│ run configuration│                                    │ runners            │
│ question state   │                                    │ verify/integrate   │
│ tk CLI           │                                    │ recovery           │
└──────────────────┘                                    │ cloud controller  │
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

1. The orchestration engine and its durable run state machine.
2. Decision-agent integration and structured decision records.
3. Worker providers and worker lifecycle management.
4. Workspace allocation, worktrees/branches, source synchronization, and
   provider-specific workspace materialization.
5. Agent runners for Claude, Codex, Pi, Prime, and other supported agents.
6. Herdr fleet integration and execution helpers.
7. Verification, evidence capture, integration, recovery, retry, cancellation,
   salvage, cleanup, budgets, and telemetry.
8. Factory-specific GitHub/gateway execution plumbing and cloud credentials.
9. The deployable Cloudflare controller, Worker/Durable Object/Workflow code,
   R2/D1 migrations, and cloud worker image or Computer provider integration.
10. Factory dashboards and Factory-specific operational commands.
11. Factory skills and runner instructions that explain how to use ticfac.

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
  spawn/wait/collect/reconcile/cleanup execution, provider adapters, and
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
separate ~/.ticfacrc; ~/.ticksrc must not remain a covert Factory secret store.
ticfac owns Cloudflare account credentials, Factory gateway tokens, runner
credentials, and migration of those values. ticks retains only credentials
needed for the tracker/board product.

ticfac deploy deploys the Factory product. tk does not discover, install,
upgrade, or dispatch to ticfac.

## 4. Target abstractions

The following are conceptual ports. They can initially be implemented by the
existing TypeScript and Go components; the extraction is not a flag-day rewrite.

### 4.1 Orchestration Engine

The Orchestration Engine is a deterministic state machine that consumes a
tracker snapshot, run configuration, provider capabilities, worker events, and
decision responses. It emits validated effects and durable records.

It owns:

- preflight and configuration validation;
- repair of missing deterministic process state;
- readiness calculation and claim caps;
- wave formation and dispatch admission;
- worker lifecycle transitions and fan-in;
- provisional result collection;
- integration and integrated verification gates;
- tracker closure and cleanup ordering;
- retries, cancellation, budgets, reconciliation, and terminal state.

It MUST be restartable from durable records. It MUST NOT infer lifecycle state
from an agent's prose or from a process exit alone.

A useful shape is:

~~~text
snapshot ──► Engine.advance()
                │
                ├── deterministic effects
                │     claim / dispatch / wait / collect / verify /
                │     integrate / close / cleanup / recover
                │
                └── DecisionRequest (only when judgment is required)
                              │
                              ▼
                       DecisionResponse
~~~

The Engine is the authority that accepts or rejects a decision response. A
decision can propose a retry, a clarification question, a new wave, a provider
change, or a review outcome; only the Engine can execute the corresponding
state transition.

### 4.2 Decision Agent

The Decision Agent is the narrow LLM-facing component. It receives a bounded,
structured context rather than an implicit repository-wide prompt:

- epic/tick descriptions and acceptance criteria;
- current graph and completed work;
- worker reports and verification artifacts;
- integration/conflict details;
- available provider capabilities and budget;
- questions already parked and their answers.

It returns a versioned response such as continue, repair, redispatch, ask,
blocked, accept, or review. The response includes reasons and references to
evidence, but it does not directly mutate .tick/, merge Git, close a tick,
kill another worker, or delete a workspace.

The Decision Agent retains judgment for:

- decomposition and implementation planning;
- interpreting ambiguous acceptance criteria;
- deciding whether a failure is likely repairable;
- choosing a repair strategy or requesting human context;
- deciding whether the next wave should proceed after evidence is available;
- resolving ambiguity by asking a human or using a parked answer;
- reviewing the integrated result and writing a closeout/review conclusion.

It does not retain judgment for mechanical lifecycle invariants.

### 4.3 WorkerProvider

WorkerProvider is the capability-based execution substrate. It answers “where
can this worker run?” and manages worker resources, but it does not decide what
the epic means.

Conceptually:

~~~text
WorkerProvider
  capabilities(request) -> CapabilitySet
  create(spec)         -> WorkerHandle
  adopt(identity)      -> WorkerHandle | absent
  wait(handle, cursor) -> WorkerEvent(s)
  signal(handle, kind) -> acknowledgement
  collect(handle)      -> WorkerReport
  dispose(handle)      -> acknowledgement
~~~

The provider MUST expose stable identities and durable lifecycle events. It
MUST support adoption/reconciliation where the substrate can outlive the
controller. It MAY implement admission limits, but the Engine remains the
source of run-level policy.

Providers include local worktree processes, Herdr fleets, the current
Cloudflare Sandbox adapter, and the proposed Cloudflare Computer adapter.

### 4.4 Worker

A Worker is one execution attempt for one tick. The identity is at least:

~~~text
(run_id, tick_id, attempt, provider, workspace_id, source_sha)
~~~

The Worker owns agent execution and reports facts:

- started/probed/confirmed state;
- source and workspace identity;
- agent runner and model identity;
- exit/cancel/timeout state;
- branch/commit/result report;
- command evidence and artifact references;
- provider/backend details.

A Worker MUST NOT close its own tracker tick or integrate its own branch. It may
write source files, a branch, and a result report according to the worker
contract.

### 4.5 Workspace

A Workspace is the source and artifact context made available to a Worker. It
includes:

- a repository checkout or virtual filesystem;
- a base source ref and an isolated worker ref;
- the .tick/ boundary policy;
- configured environment and credentials with least privilege;
- artifact/evidence locations;
- optional execution backends.

The Workspace abstraction hides whether the implementation is a local Git
worktree, a Herdr checkout, a Cloudflare Computer Workspace, or a current
Sandbox container. Source and evidence must be synchronized before a disposable
substrate is released.

### 4.6 AgentRunner

An AgentRunner adapts one coding/reasoning agent to the Worker lifecycle:

~~~text
AgentRunner
  prepare(context)          -> launch specification
  launch(spec)              -> process/session handle
  observe(handle, cursor)   -> output/events
  continue(handle, context) -> acknowledgement or new handle
  stop(handle, reason)      -> acknowledgement
  classify(result)          -> runner outcome
~~~

It owns prompt construction, agent-specific startup, continuation/resume, and
transcript handling. It MUST NOT own Git integration or tracker closure. The
same agent runner can be used by different providers, and the same provider
can host multiple agents.

### 4.7 Verification, integration, and recovery

These are explicit Engine ports/policies, not incidental helper functions.

- **Verification** runs commands declared by the tracker project/run
  configuration, captures structured results, and evaluates acceptance. It
  includes worker-level checks, post-wave/integrated gates, and read-only review
  checks.
- **Integration** validates the .tick/ boundary, commits eligible source
  changes, merges the worker ref, records conflicts, and leaves rejected work
  available for repair. It never silently discards a worker branch.
- **Recovery** reconciles durable manifests with live provider state, adopts
  workers that survived a controller restart, salvages a cancellable worker,
  revokes credentials before grace periods, retries only within policy, and
  escalates irrecoverable uncertainty.

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

- which provider or runner to launch;
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
while ticfac can change model routing, scout count, providers, and worker
supervision independently.

## 6. Deterministic engine versus agentic judgment

The current skills/ticks/references/agent-runner.md describes a loop of graph
read, claim, launch, wait, integrate, gate, close, and cleanup. That loop should
be executable code. Markdown should explain the contract and operator model,
not be the only implementation of the state machine.

### 6.1 Move into programmatic flows

The following are deterministic and belong in the Engine, providers, or
verification/integration modules:

| Concern | Required behavior |
|---|---|
| Run preflight | Load versioned configuration, validate limits, resolve credentials, and refuse incompatible providers. |
| Graph and claims | Read readiness, enforce dependency and claim invariants, cap concurrency, and make claims idempotently. |
| Process ticks | Create/repair the mechanical process records required by the configured run protocol. |
| Admission | Select only ready work within policy; record selection and attempt before dispatch. |
| Worker launch | Materialize the workspace, write the manifest before provider addressing, probe, confirm actual dispatch, and record the stable identity. |
| Liveness | Re-address by stable identity, use cursors, distinguish a live worker from a missing worker, and avoid duplicate dispatch. |
| Fan-in | Wait for all admitted work, collect all reports, and retain bounded-leg workers for the next controller checkpoint when required. |
| Cancellation | Revoke credentials, request stop, allow bounded salvage, collect durable output, then kill/dispose with a fresh liveness check. |
| Boundary | Reject .tick/ mutations before integration; use explicit read-only tk wrappers where applicable. |
| Integration | Commit source changes, merge clean branches, abort and preserve conflicts, and produce structured outcomes. |
| Gates | Run configured worker/post-wave/integrated/review commands and persist evidence before closure. |
| Closure | Close tracker state only after required evidence is durable; clean worktrees/branches only after tracker and integration state are durable. |
| Budgets | Enforce wall-clock, provider, wave, model, and cost budgets independently of agent prose. |
| Recovery | Reconcile manifests, durable events, branches, and provider state after restart. |
| Artifacts | Write immutable or content-addressed records with schema versions and source references. |

The existing implementations provide concrete precedents: worker-dispatch.ts
has confirmed dispatch and cancellation/salvage logic; worker-collect.ts has a
structured verdict vocabulary; and extensions/ticks-runner/merge.ts refuses
boundary violations, preserves conflicts, and delays cleanup until durability
conditions are met.

### 6.2 Keep as Decision Agent work

The LLM remains valuable for work that is genuinely judgment-heavy:

- turning an epic or acceptance criteria into useful implementation ticks;
- choosing an implementation and editing source code;
- interpreting a test failure, review finding, or merge conflict;
- deciding whether a repair attempt is justified and what context it needs;
- deciding whether new work is needed after a green integrated gate;
- resolving ambiguity by asking a human or using a parked answer;
- producing a review/closeout conclusion grounded in captured evidence.

These decisions MUST be represented as structured, validated requests to the
Engine. A Markdown skill MAY remain as documentation, prompt material, or a
human workflow guide, but it MUST NOT be the sole authority for claims,
dispatch, cleanup, verification, or closeout.

## 7. Mapping the current runners and orchestrators

The current runner documents are capability descriptions, not the final module
boundary. The following is the target mapping.

| Current implementation | Target mapping | Notes |
|---|---|---|
| Claude runner (skills/ticks/references/claude-runner.md) | Local WorkerProvider + Claude AgentRunner | Agent isolation, worktrees, background completion, continuation, and session handling belong to the runner/provider. Merge, tracker closure, and cleanup belong to the Engine. |
| Codex runner (skills/ticks/references/codex-runner.md) | Local WorkerProvider + Codex AgentRunner | codex exec, worktree setup, completion/output retrieval, continuation, and review are adapter capabilities; they do not define the wave protocol. |
| Pi runner (skills/ticks/references/pi-runner.md, extensions/ticks-runner/**) | Pi AgentRunner plus the shared Engine | The current extension is the clearest proof that execution and orchestration are fused. Move its claims/waves/gates/merge/cleanup logic into the Engine and keep Pi JSON subprocess handling as the runner adapter. |
| Prime/RLM (skills/ticks/references/prime-runner.md) | Read-only or analysis-capable AgentRunner + local process WorkerProvider | Prime's child/worktree limitations and read-only role are capabilities/policy. It must not become a second orchestrator. |
| Herdr (skills/ticks/references/herdr-runner.md, internal/herd/**) | Herdr WorkerProvider and execution adapters | Herdr's heterogeneous fleet, process/event relay, durable result collection, adoption, and remote lifecycle belong in ticfac. Tracker-domain config/vocabulary and the question relay remain in ticks. Herdr helpers never merge or close tracker work. |
| Current cloud RunWorkflow (cloud/factory/src/run-workflow.ts) | Cloud control-plane supervisor + shared Engine + Cloudflare WorkerProvider | It currently combines lease/retry/budget supervision, an orchestrator container, wave dispatch, worker lifecycle, collection, closeout, and finalization. The decomposition is specified in §9. |
| Current cloud Sandbox adapter (cloud/factory/src/sandbox.ts) | Compatibility SandboxWorkerProvider / process adapter | Preserve its fakeable six-operation seam during extraction. It becomes a provider implementation, not the abstraction that owns the Engine. |

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

### 8.2 Cloudflare Computer as the WorkerProvider foundation

The proposed cloud provider is a CloudflareComputerWorkerProvider built behind
the WorkerProvider port. Cloudflare Computer's public preview describes a
Workspace with a virtual filesystem and pluggable execution backends, including
an isolate shell, a full Linux container shell, and JavaScript execution. See
the [Cloudflare Computer preview announcement](https://developers.cloudflare.com/changelog/post/2026-08-03-cloudflare-computer/)
and the upstream [runtime interface](https://github.com/cloudflare/computer/blob/main/docs/05_runtime_interface.md).

The provider should model one Worker attempt as:

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
The provider MUST keep the source identity, selected backend, backend lifecycle,
and synchronization cursor in the Worker manifest.

The [Computer worker-shell documentation](https://github.com/cloudflare/computer/blob/main/docs/12_worker_backend.md)
describes the important durability property: worker-shell can execute through a
Dynamic Worker while using the host Durable Object's Workspace storage as the
authoritative filesystem. The [runtime documentation](https://github.com/cloudflare/computer/blob/main/docs/05_runtime_interface.md)
also makes clear that runtime.exec routes to a named backend and that the
selected backend determines the command/runtime semantics.

### 8.3 Explicit backend selection is required today

Computer backend selection is explicit. Omitting backend selects the first
configured backend; it does not perform a safe capability analysis. Therefore
ticfac MUST not let an LLM or an arbitrary command string select a backend
without policy validation.

The provider should resolve:

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

### 8.4 Phase-aware isolate-to-container promotion

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
only after source/evidence synchronization and the Engine's durability checks.

There is no implicit promotion in the current explicit-backend API. The
phase/capability policy and its tests are therefore a ticfac responsibility.

### 8.5 Durable source versus derived execution state

The provider must make restart behavior legible by separating durable facts from
reconstructable materialization.

**Durable source and evidence:**

- Git remote refs, worker branches, commits, merge commits, and source SHAs;
- .tick/ tracker state, claims, statuses, and notes through tk;
- Durable Object Workspace files/state and synchronization metadata;
- D1 run/attempt/event records;
- R2 manifests, reports, logs selected as evidence, and verification artifacts;
- Decision Requests/Responses and the evidence references they used;
- provider/backend selection, capability decision, and terminal lifecycle facts.

**Derived local/provider state:**

- a container or Dynamic Worker instance;
- process IDs, live stream handles, output cursors, and temporary directories;
- a local worktree path or container filesystem cache;
- package/build caches and preview processes;
- an in-memory controller object or an unpersisted dashboard view.

Before disposal, the provider MUST push or persist any source/evidence that the
Engine relies on. After restart, the Engine MUST be able to reconstruct or
declare uncertainty from durable manifests and provider adoption. A process
exit or a missing local handle is never by itself proof that a tick is complete.

### 8.6 Preview caveat and compatibility seam

Cloudflare Computer is an early preview as of this architecture date. Its
preview documentation and examples explicitly warn that APIs are unstable.
The existing Factory depends on the pinned @cloudflare/sandbox line in
cloud/factory/package.json and has a tested SandboxBinding seam.

Accordingly:

1. CloudflareComputerWorkerProvider MUST be behind the provider interface and
   a feature flag/configuration choice.
2. The exact Computer package/revision and backend contract MUST be pinned.
3. Provider contract tests MUST cover Workspace persistence, backend routing,
   promotion, cancellation, adoption, synchronization, and disposal.
4. The current Sandbox provider MAY remain as a migration fallback until
   Computer parity is proven.
5. The cloud deployment MUST NOT make preview-only Computer APIs part of the
   ticks CLI contract.

The [Cloudflare Sandbox documentation](https://developers.cloudflare.com/sandbox/)
is still relevant to the current container deployment, but it is not a reason
to make the future control plane container-shaped.

## 9. Cloud orchestrator and RunWorkflow decomposition

### 9.1 Target cloud shape

The cloud orchestrator should be a lightweight controller built from a Worker,
Durable Object state, and Workflow-style durable checkpoints/retries where
needed:

~~~text
request / webhook / schedule
              │
              ▼
Cloud control plane
  ├── lease, cancellation, budgets, retries, idempotency
  ├── durable run/attempt/event state
  ├── Engine checkpoints and DecisionAgent calls
  ├── Computer WorkerProvider calls
  └── finalization and evidence indexing
              │
              ▼
Computer Workspace + worker agent/container(s)
              │
              ▼
       Git branches + reports + evidence
~~~

Deep coding happens in workers. The orchestrator therefore likely needs no
orchestrator container. It can call the Decision Agent from an isolate/service
boundary, persist the response, and continue the Engine from a durable
checkpoint. A temporary orchestrator container is justified only if a
specific control-plane operation requires a capability unavailable to the
controller; it is not the default execution model.

### 9.2 Responsibilities currently mixed into RunWorkflow

cloud/factory/src/run-workflow.ts is currently a roughly 3,500-line boundary
around run supervision. It is valuable code, but its responsibilities need to
be split by ownership rather than copied into a new monolith.

| Current responsibility/symbol | Target owner | Extraction rule |
|---|---|---|
| RunWorkflow wrapper and request entrypoint | Cloud control-plane adapter | Keep thin. Decode request, load durable context, invoke the Engine, and translate the result to the existing API. |
| superviseRun | Control plane + Engine | Keep lease acquisition, cancellation, retry envelope, and durable checkpointing in the controller. Move run semantics to Engine transitions. |
| supervisePass | Control-plane supervisor, with Engine checkpoint | Retain Workflow step budgets, lease renewal, restart/reconcile handling, and terminal cleanup. Remove the assumption that every pass boots and watches an orchestrator coding container. |
| superviseWaveLoop | Orchestration Engine + Decision Agent | The alternating worker-wave/decision loop becomes an explicit state machine. The Decision Agent decides whether/why to continue; the Engine dispatches and gates deterministically. |
| runWaveBatch | Engine using WorkerProvider; Workflow as durable envelope | Chunking may remain a platform-limit adapter. Reconcile, admit, dispatch, wait, collect, and integrate become provider/Engine effects rather than ad hoc Workflow choreography. |
| superviseCloudWave | Cloudflare Computer/Sandbox WorkerProvider + Engine | Keep per-tick tokens, worker manifests, salvage, collection, and teardown as provider lifecycle capabilities. Keep wave policy in the Engine. |
| Sandbox process adapter | Provider implementation | Preserve the fakeable process seam from cloud/factory/src/sandbox.ts; replace “orchestrator sandbox” with a controller checkpoint and worker provider. |
| worker-dispatch.ts lifecycle | WorkerProvider + Recovery | Preserve confirmed dispatch, adoption, timeout, cancellation, salvage, fresh liveness checks, and disposal. Emit durable events rather than relying on Workflow-local variables. |
| worker-collect.ts | Evidence/collection adapter | Preserve the Git branch/result-report contract and verdict vocabulary. Add artifact references and schema versioning. |
| finalize | Control-plane finalizer | Keep token revocation, cost/telemetry, run record, known-resource cleanup, lease release, and API final status. It consumes Engine terminal facts. |
| assessProgress / applyProgress | Recovery + finalizer | Keep durable-ref-based completion assessment. “Completed with uncertainty” remains an explicit outcome, never hidden success. |
| Review/closeout path | Engine + Decision Agent + Verification | The agent may review; configured read-only checks and artifact persistence are deterministic; tracker closure remains Engine-owned. |

The resulting division is:

- **Control plane:** make the run survive requests, isolates, regions, and
  retries; own leases, budgets, credentials, durable events, and cleanup.
- **Orchestration Engine:** execute the run state machine using tracker facts,
  provider ports, verification, integration, and bounded agent decisions.
- **WorkerProvider:** make one worker attempt execute and recover on a concrete
  substrate.

### 9.3 Why Workflow still has a role

Moving the Engine out of Markdown does not mean eliminating Cloudflare
Workflow-style durability. The control plane still needs durable waiting,
bounded steps, cancellation, and retry across Worker isolate lifetimes. The
important change is that Workflow is a reliability envelope around an explicit
Engine, not the place where all policy, provider mechanics, and agent prompts
are interleaved.

## 10. Artifacts, evidence, and workspace state

### 10.1 Artifact categories

ticfac should distinguish three related objects:

1. **Source state:** Git refs/commits and tracker state that says what work
   exists and what is closed.
2. **Evidence:** a bounded, reproducible record that a configured command or
   review check ran against a named source ref and produced a result.
3. **Operational artifacts:** manifests, event logs, provider handles, model
   metadata, transcripts, and salvage records needed to explain or recover a
   run.

An evidence record should minimally contain:

~~~text
schema_version
run_id / tick_id / attempt
source_ref / source_sha / integration_ref
phase / provider / workspace_id / backend
command or check identifier
started_at / finished_at / exit_code
stdout/stderr or artifact URI (bounded and redacted)
result / acceptance status
content digest and persistence URI
~~~

Terminal output is useful diagnostic material, but it is not a completion
contract. This preserves the current worker-collect.ts rule that durable Git
refs and RESULT-<tick-id>.md reports drive collection.

### 10.2 Authority and closeout ordering

The Engine should enforce this ordering unless a named protocol explicitly
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
worktree/branch/provider resources cleaned up
~~~

The current local implementation demonstrates the important final edge:
extensions/ticks-runner/merge.ts refuses cleanup until tracker durability and
integration ancestry are known. The cloud implementation must apply the same
invariant even when the provider is remote or the controller restarts.

### 10.3 Workspace lifecycle

Each Workspace has a base source identity and a disposable execution
materialization. The provider MUST record:

- the source/base SHA used to create it;
- the worker branch/ref and attempt;
- the current backend and promotion history;
- pending synchronization work;
- artifact and evidence references;
- disposal eligibility.

Disposal is allowed only after the Engine has either persisted required
source/evidence or recorded an explicit recovery/escalation outcome.

## 11. Initial ticfac repository layout

The first repository should preserve the current polyglot implementation shape
long enough to make extraction safe. Go can continue to host the local CLI and
local execution helpers; TypeScript can continue to host the Cloudflare
controller and cloud providers. Consolidation can happen after behavior is
covered by contracts.

~~~text
ticfac/
├── cmd/
│   └── ticfac/                         # deploy, run, status, workers, review
├── internal/
│   ├── engine/                         # deterministic state machine
│   ├── decisions/                      # DecisionAgent port and schemas
│   ├── ticks/                          # tk --json client and pinned adapters
│   ├── contracts/                      # contract loading/checking
│   ├── workers/                        # Worker, provider, lifecycle records
│   ├── workspaces/                     # local worktrees and source identity
│   ├── runners/                        # runner-neutral interfaces
│   ├── verification/                   # command evidence and gates
│   ├── integration/                    # boundary, commit, merge, conflicts
│   ├── recovery/                       # reconcile, adopt, salvage, retry
│   ├── artifacts/                      # manifests, evidence, reports
│   ├── credentials/                    # ~/.ticfacrc and cloud secrets
│   └── controlplane/                   # local run supervision/status
├── runners/
│   ├── claude/
│   ├── codex/
│   ├── pi/
│   └── prime/
├── providers/
│   ├── local/
│   ├── herdr/
│   ├── cloudflare-sandbox/             # compatibility provider
│   └── cloudflare-computer/            # phase-aware Computer provider
├── cloud/
│   ├── controller/                     # Worker/DO/Workflow control plane
│   ├── computer/                       # Computer bindings and backend policy
│   ├── migrations/                     # D1 migrations owned by ticfac
│   └── tests/
├── image/
│   ├── Dockerfile                      # worker image, if still required
│   ├── worker.sh
│   ├── orchestrator.sh                # temporary compatibility only
│   ├── common.sh / preflight.sh
│   └── required-tk-commands
├── contracts/
├── schemas/
├── skills/
├── docs/
├── embedded.go                         # ticfac assets, not ticks assets
└── README.md
~~~

This is an initial module map, not a demand to rename every package during the
first move. The key structural rule is that engine, providers, runners, and
cloud control code are in the new repository and depend on the ticks
client/contract boundary, never on ticks internals.

## 12. Migration plan

### Phase 0: freeze the boundary

1. Publish the initial tk --json command manifest and minimum version.
2. Pin the cross-language contract bundle and make both current cloud and local
   tests consume it.
3. Define worker/report/manifest/evidence schemas before moving code.
4. Define credential ownership and the ~/.ticfacrc migration behavior.
5. Record current cloud routes, D1 migrations, R2 keys, image tags, and
   deployment expectations as compatibility tests.

### Phase 1: create the repository without changing behavior

1. Create ticfac with the layout above and independent CI.
2. Copy the relevant tests and contract fixtures first; keep expected behavior
   unchanged.
3. Create the tk --json client and pinned-contract checker.
4. Add a compatibility SandboxWorkerProvider that uses the existing
   SandboxBinding seam.

### Phase 2: move the cloud product

1. Move cloud/factory/** to ticfac/cloud/controller/**, preserving current
   route and D1/R2 behavior initially.
2. Move cloud/sandbox/** to ticfac/image/**, including the two entrypoints,
   worker boundary guard, tk pin/build logic, and required command manifest.
3. Move cloud migrations, deployment scripts, Factory dashboards, and
   Factory-specific observability with the cloud product.
4. Replace imports of contracts/ with the pinned contract bundle.
5. Keep cloud/worker/** in ticks and verify it is not accidentally included in
   the Factory deployment.

### Phase 3: move local Factory and command adapters

1. Move internal/factory/** and its dashboard/deploy/status code to
   ticfac/internal/controlplane and ticfac/cmd/ticfac.
2. Move Factory/cloud command files from cmd/tk/cmd/ to the ticfac CLI.
   tk factory and tk cloud are not retained as hidden dispatch shims.
3. Replace every internal Go import with tk --json, Git, or a ticfac internal
   interface.
4. Move Factory credentials, source-pin logic, deployment bundles, and
   Factory-only CI out of ticks.
5. Remove Factory embedding from the ticks root embedded.go; ticfac gets its own
   embedding/build assets.

### Phase 4: extract the shared execution engine

1. Move deterministic parts of extensions/ticks-runner/runner.ts, merge.ts,
   and boundary.ts into Engine/integration/verification modules.
2. Keep Pi JSON subprocess handling as the first AgentRunner adapter.
3. Add Claude, Codex, Prime, and Herdr adapters behind the same ports, using
   current runner references as compatibility requirements.
4. Move execution-oriented Herdr commands/helpers and provider lifecycle code;
   retain tracker-domain configuration and question relay in ticks.
5. Keep skills/ticks/references/agent-runner.md as a short tracker-facing
   contract and move execution-specific instructions to ticfac skills.

### Phase 5: introduce Computer behind the provider port

1. Implement CloudflareComputerWorkerProvider without changing Engine
   semantics.
2. Establish the durable Workspace/source model and provider manifests.
3. Implement explicit backend policy and phase-aware isolate-to-container
   promotion.
4. Test hot-container RGR/TDD loops, source synchronization, cancellation,
   adoption, artifact persistence, and disposal.
5. Run the Computer provider in controlled/shadow mode against the existing
   Sandbox provider before making it the default.
6. Keep the Sandbox provider as rollback capacity until parity and preview risk
   are acceptable.

### Phase 6: cut over and simplify ticks

1. Release ticfac and the required tk contract/version together.
2. Remove Factory/cloud commands, Factory packages, Factory embedding, cloud
   image assets, and Factory CI from ticks.
3. Remove the duplicate wave/orchestration implementation from ticks.
4. Retain only tracker-domain sandbox/configuration primitives and the board.
5. Update installation, skills, deployment, and operator documentation.
6. Prove the final dependency direction mechanically: ticks builds without
   ticfac; ticfac runs its tk --json compatibility suite against a pinned ticks
   release.

## 13. Design principles

1. **One-way dependency.** ticfac consumes released tracker contracts; the
   tracker does not know Factory exists.
2. **Deterministic lifecycle.** Claims, resource ownership, waits, gates,
   integration, closeout, and cleanup are code and durable state transitions.
3. **LLM for judgment, code for invariants.** Models propose decisions; the
   Engine validates and executes effects.
4. **Durable facts beat process liveness.** Git refs, tracker state, reports,
   and evidence are authoritative; exits and live handles are observations.
5. **Provider capability, not provider identity.** Policies request capabilities
   and phases; adapters choose concrete substrates.
6. **Explicit backend policy.** Backend selection is recorded, authorized, and
   tested. It is not guessed from arbitrary shell text.
7. **Restartability is normal.** Every external action is idempotent or has a
   durable compensating/recovery record.
8. **Least privilege at the boundary.** Workers get read-only tracker access
   unless a specific Engine effect requires controlled mutation; .tick/ remains
   protected by both provider and integration checks.
9. **Evidence before closure.** A successful-looking agent response cannot close
   a tick without the configured evidence contract.
10. **Extract without rewriting.** Preserve behavior and contracts first;
    improve architecture in separately testable steps.
11. **Keep the tracker small.** A feature that can run without a tracker should
    not become a tracker dependency merely because it started there.
12. **Preview products stay behind adapters.** Cloudflare Computer can become
    the preferred provider without becoming a cross-repository contract or a
    hard-coded assumption in the Engine.

## 14. Non-goals

- Rewriting tk, the tick store, or the graph model.
- Moving cloud/worker/**, the ticks.sh board, into ticfac.
- Creating a public Go API from ticks internals for Factory.
- Adding a tk plugin/dispatch mechanism to preserve an unshipped tk factory
  command.
- Making ticfac a general-purpose issue tracker or project-management system.
- Making an LLM responsible for resource cleanup, claims, merge safety, or
  acceptance evidence.
- Inferring cloud backends solely from command strings.
- Requiring an orchestrator container for the cloud target.
- Replacing the current Sandbox deployment in the same change as the repository
  extraction.
- Treating Cloudflare Computer preview APIs as stable without a provider seam,
  version pin, and compatibility tests.
- Solving all runner UX differences in the first extraction.

## 15. Initial completion criteria

The extraction is architecturally complete when all of the following are true:

- ticks builds and tests without importing or embedding Factory code.
- ticfac builds and tests against a pinned tk --json release and contract
  bundle.
- The existing cloud run can be represented as a control-plane run invoking
  the shared Engine and a WorkerProvider, with no required orchestrator coding
  container.
- At least one local provider, one remote/Herdr provider, and the compatibility
  cloud provider implement the same Worker lifecycle contract.
- A worker result is accepted only with durable source/report/evidence facts.
- A controller restart can reconcile or explicitly escalate every in-flight
  attempt; it cannot silently redispatch or declare success from missing local
  state.
- Integration rejects .tick/ mutations and preserves merge conflicts for
  repair.
- The Computer provider can promote from isolate to container at the RGR/TDD
  boundary, keep the container hot through its test loop, synchronize durable
  state, and safely dispose it.
- No Factory-specific command, credential, runner, or wave supervisor remains
  in ticks beyond an explicitly documented compatibility transition.
