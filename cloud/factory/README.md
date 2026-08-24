# ticks factory worker

Control plane for cloud epic runs. **Self-deployed into your own Cloudflare
account** (decision D16 in `docs/design/cloud-factory.md`): ticks.sh never
operates the factory, and this bundle is completely separate from
`cloud/worker` — it never imports from it and never deploys with it.

It serves the operator command surface (UC1b): submit a run, stop one, ask
what is happening, and enrol the repositories it is allowed to run. The run
itself is owned by the **Run Workflow** (`src/run-workflow.ts`), which boots the
orchestrator sandbox, watches it, enforces the budgets and finalizes — see
"The run lifecycle" below.

## Layout

| Path | What it is |
|---|---|
| `wrangler.toml` | Bindings + migrations. `compatibility_date` is recent on purpose: DO SQLite storage and current WebSocket hibernation both need it. |
| `src/index.ts` | Worker entry: routing only — status codes, methods, body shapes. `GET /health` is open; everything else needs the bearer token. |
| `src/runs.ts` | Submission, stop and status policy: the lease, enrolment, the queue window, the `dispatch_log` trail, and the Run Workflow seam. |
| `src/telegram.ts` | Telegram webhook filtering, RunRoom question delivery, first-wins answer rendering, and threaded reports. |
| `src/db.ts` | Typed D1 accessors: runs, signals, dispatch log, project enrolment, run gateway tokens. |
| `src/gateway.ts` | The run's model path (D17): routing through the operator's AI Gateway, run/tick metadata, gateway-log cost telemetry, and the run-token kill switch. |
| `src/auth.ts` | Single-tenant bearer auth (D16) — mint, salted PBKDF2 hash, constant-time verify, route middleware. |
| `scripts/mint-factory-token.mjs` | Operator-side mint/rotate tool for hand rotation. Imports `src/auth.ts`. `tk factory deploy` mints in Go instead — see "Mint and rotate". |
| `migrations/` | D1 migrations, applied by `tk factory deploy` before it deploys. |
| `src/run-room.ts` | `RunRoom` DO — one per project: the dispatch lease, the pending-question (gate) store, the submission queue and the stop record. Reconcile alarms land later. |
| `src/run-workflow.ts` | `RunWorkflow` — one durable instance per run: boot, watch, budgets, clean stop, finalize. Everything below it is disposable; this is not. |
| `src/sandbox.ts` | The orchestrator sandbox seam: what a container has to be, and the environment `cloud/sandbox`'s entrypoint is started with. |
| `src/artifacts.ts` | The R2 artifact tree, and the harness log stream written *during* the run. |
| `src/observe.ts` | `GET /api/observe` — one read-only frame for `tk factory dashboard`: the listing, a focused run's phase/image/boot/gates, the `dispatch_log` refusals, and the `run_event` tail the room keeps. |
| `src/env.d.ts` | Hand-written `Cloudflare.Env` (what `wrangler types` would generate). Keep in sync with `wrangler.toml`. |
| `test/` | vitest + `@cloudflare/vitest-pool-workers`: real workerd, bindings read from `wrangler.toml`. |

## Develop

```sh
pnpm install
pnpm test          # vitest in workerd
pnpm typecheck
pnpm dev           # local worker on :8788
```

## The run surface

Every route below needs the bearer token. The RunRoom DO decides; `src/index.ts`
only turns that decision into a status code.

| Route | What it does |
|---|---|
| `POST /api/runs` | Submit `{project, epic, base_sha, requested_by, notify?, queue?, queue_ttl_ms?}`. `201` started, `409` refused naming the holding run, `202` parked (with `queue: true`), `403` project not enrolled, `503` no Run Workflow bound **or no AI Gateway configured** (the detail names `tk factory setup`). |
| `GET /api/runs` | The run index plus, for every project it mentions, that project's lease and queued submissions. Filters: `project`, `state`, `limit`. |
| `GET /api/runs/:id` | One run: index row, Workflow step state, lease, open gates, queued submissions, stop record. |
| `POST /api/runs/:id/stop` | Stop a run. Default (`{"mode":"clean"}`) is D15's clean stop: finish the in-flight tick, then review and closeout. `{"mode":"hard"}` (`tk cloud stop --now`) revokes the run's gateway credentials in this request and forbids any later boot from minting another — no closeout, no more spend. The response says which stop was performed and how many live credentials it killed. |
| `GET /api/runs/:id/logs` | The run's harness output — stdout and stderr, streamed to R2 during the run. `{run_id, project, state, text, bytes, total_bytes, truncated}`. Bounded from the END (the tail is what a run being debugged is read for) and the bound is stated, never silent; `max_bytes` narrows it further and is refused above the read bound rather than clamped. Read-only: it observes a run and cannot steer one, so it does not widen D21's command vocabulary. |
| `GET/POST /api/projects`, `DELETE /api/projects/:owner/:repo` | Project enrolment. |
| `POST /api/projects/:owner/:repo/pending` | Register a cloud ask in the project's RunRoom; `{notify:"telegram"}` delivers it to the paired Telegram chat. |
| `GET /api/projects/:owner/:repo/pending` | Read open pending entries; `include_resolved=true` lets the terminal report the winning surface. |
| `POST /api/projects/:owner/:repo/pending/:id/answer` | Terminal answer. RunRoom arbitrates first-wins and returns `409` with the winner when already resolved. |
| `POST /api/projects/:owner/:repo/reports` | Send a completion report, optionally with `ref` to reply in the originating Telegram thread. |
| `GET /api/ci/escalations` | What the CI remediation loop is waiting on a person for: every branch it struck out and gave up on, and every fault its `check_run` door hit and had no rule for. |
| `POST /api/ci/escalations/clear` | Release one of them — `{project, branch, cleared_by?}` for a branch, `{fault, cleared_by?}` for a fault. **This is the only thing that reopens an escalated branch**: the strike window rolling over does not, deliberately (tick `uls`). Releasing a branch also forgives the strikes that struck it out, so it starts from a full budget. `404` when nothing was open under that name — an operator who clears the wrong branch must find out rather than read a success. |

**The submission boundary is a pushed sha.** `base_sha` must be a full 40-hex
commit and `project` the canonical `owner/repo` pair — remote URLs are refused
rather than parsed, because `internal/github` already owns that parsing in Go
and a second parser in TypeScript would be a format to keep in parity for no
gain.

**Enrolment is a security boundary, not bookkeeping.** The bearer token says
*you are this deployment's operator*; it does not say which repositories the
operator pointed their GitHub credential at. A submission for an unenrolled
project is refused before the lease is asked for, so a leaked or over-shared
token cannot aim the factory at every repo its PAT can reach.

**A refused submission on a leased project names the holder** (`lease_held_by:<run>`,
D22). With `queue: true` it parks in the DO instead, ignites when the lease
releases, is visible to `status`, and expires on a window — `RUN_QUEUE_TTL_MS`
in `wrangler.toml`, overridable per submission. A queue that silently ignites
work hours later is worse than a refusal.

**Stop is control-plane state, never a message.** It writes a stop record into
the RunRoom and flips the run's index state; the Run Workflow reads that record
at a step boundary and enforces it. A wedged or adversarial orchestrator cannot
decline a stop it is never asked about.

**Every ignition and every refusal is written to `dispatch_log`** with a reason
from the closed policy vocabulary (`lease_held_by` for contention,
`awaiting_approval` for an unenrolled project, `budget_exhausted` when a run's
spend trips), so "why did this not run" — and "why did this stop" — is
answerable from D1 rather than from a log line.

## The run lifecycle

Once a submission has the lease, `src/runs.ts` creates one Workflow instance
whose id **is** the run id, and hands the run over. From there the Workflow owns
it (`src/run-workflow.ts`):

    context → boot → watch … watch → [clean stop → closeout] → finalize

- **The sandbox is disposable, the run is not.** A dead orchestrator is a
  reboot, not a failure: the replacement is a *fresh* container booted with
  `TICKS_PHASE=reconcile`, whose first instruction is the reconcile protocol
  (evidence order: worker manifests → git → live sandboxes). Boots are bounded
  (`MAX_SANDBOX_BOOTS`), and an entrypoint exit that is a *configuration*
  verdict — 2 config, 3 clone, 4 tk version, 5 pre-flight, 6 `[sandbox]` — is
  never retried, because another container reaches the identical answer.
- **Which image it boots is the repository's call when it makes one.** Before
  any container exists, the Workflow reads the tracked `.tick/runners.toml` at
  the submitted SHA (`src/repo-config.ts`) and boots the `[sandbox].image` it
  declares; a repository that declares none gets this deployment's own. The
  declaration comes from the PR-reviewed file and never from a submission —
  an image is arbitrary code, and the container holds the run's credentials.
  A declared image this deployment cannot serve **fails the run** naming both
  references rather than booting the base: an image belongs to the
  `[[containers]]` application built at deploy time, so honouring one means
  deploying a factory that serves it and naming it in `SANDBOX_IMAGE`. The
  read is best effort — a Worker that refused every run on a GitHub hiccup
  would be worse than the silence it replaced — and the container is the
  backstop: it refuses a boot that is not what its checkout declares.
- **A run reports itself to a board, if there is one (tick bne).** The Workflow
  emits `run_event` messages — `epic-started` before anything boots,
  `task-started` per tick before its worker container is dispatched,
  `task-completed` carrying that tick's COLLECT verdict, `epic-completed` at
  finalize — through the project's RunRoom, which forwards them to
  `POST /api/projects/:project/run-events` on the board named by
  `BOARD_BASE_URL` with the credential in the `BOARD_TOKEN` secret. Both are
  **unset by default and neither is a dependency**: a factory runs identically
  with no board at all, because the stream is observability and never control.
  Nothing about a run's outcome depends on an event landing — a publish cannot
  throw, is not retried, and is bounded by a short timeout — and a run whose
  every event is dropped completes and collects exactly the same way. A tick
  shows as successful only when collect said `ready-to-merge`; a worker's own
  `STATUS:` line is carried as text and decides nothing. `costUsd` on the
  stream comes from AI Gateway telemetry alone, and a read that failed carries
  no cost rather than a zero. Whether a board is listening or not, the room
  keeps the last 50 events on its `/status` probe, so "is this run still
  alive?" is answerable without a browser.
- **Budgets are enforced here, never in a prompt (D14).** `RUN_MAX_WALL_CLOCK_MS`
  and `RUN_MAX_COST_USD` are checked at every observation against the elapsed
  time the Workflow measured and the `cost_usd` on the index row, which is read
  back from the gateway's own logs at every observation — not an agent
  self-report. A model can be talked out of a budget; a Workflow step cannot.
  And a trip does not stop at killing a process: the run's gateway token is
  revoked, so an orchestrator that survives its own kill still cannot spend.
  Those two vars are the deployment's **ceiling**, and one submission can ask
  for less: `tk cloud run <epic> --max-cost 2.50 --max-wall-clock 45m` rides
  the submit payload (`max_cost_usd`, `max_wall_clock_ms`) into the Run
  Workflow's config, so trying something cheap-and-bounded is a per-invocation
  choice rather than an edit to `wrangler.toml` and a redeploy. A submission
  may only ever lower a budget — a value above the ceiling is clamped to it and
  logged — because the ceiling is the operator's standing decision and a
  submission is something an agent can make. A submitted cost budget counts as
  configured, so a run whose gateway cost telemetry cannot be read refuses to
  boot rather than spending unmeasured. A budget parked by `--queue` is stored
  with the entry and travels to ignition. **A cloud wave's worker containers
  are bounded by that same allowance (tick 5fg):** each worker's harness budget
  is what the run has LEFT, capped by the measured 90-minute default (or a
  deployment's `RUN_WORKER_BUDGET_MS`), and the wave waits exactly one push
  margin longer. It used to be a flat 30-minute constant that ignored
  `--max-wall-clock` entirely, which killed three healthy containers at ~29
  minutes on a run submitted with 90.
- **Exhaustion is a clean stop, identical to `POST /api/runs/:id/stop` (D15).**
  Both trip the same branch: the in-flight work gets `RUN_STOP_GRACE_MS` to
  land, then a `closeout` orchestrator reconciles and runs review and closeout
  on what is done. There is no "abandon the run" path — an abandoned run leaves
  merged work with no tracker state.
- **Whether the credential dies before or after that window is the difference
  between a stop and a kill.** A clean stop revokes at the END of the grace
  window, so in-flight work can land. A budget trip, a lost lease and an
  operator's `--now` revoke at the START of it: a run already over its
  allowance has no claim on the grace period's spend. A hard stop goes further
  and is durable — `supervisePass` reads the stop record before it credentials
  any boot, in every pass, so the supervisor can no longer undo an operator's
  revocation the way it did on the run that motivated this (tick gyl).
- **Harness output streams to R2 during the run, never at exit (D20).** The
  crashed run is exactly the run whose logs you need. Each observation flushes
  what the orchestrator printed since the last one as an immutable segment under
  `runs/<project>/<run_id>/artifacts/orchestrator/harness/`, readable while the
  run is still going; `harness.log` is a copy written at finalize, never the
  source of truth.
- **Finalize always runs.** Completed, stopped, failed or never-booted: the
  lease is released, the index row reaches a terminal state, the containers are
  destroyed and `run.json` says why. A run that ends without releasing its lease
  wedges the project until the lease ttl expires.
- **Completion is proved, never inferred from an exit status (D23).** A harness
  exits 0 when it has nothing left to say, which is not the same as having done
  something — the first run whose boot chain fully succeeded printed 271 bytes,
  dispatched no wave, pushed no branch, left the epic's ticks open, and was
  recorded COMPLETED and charged for. So the exit status decides only whether to
  reboot; the terminal state is decided against the durable layer. `src/progress.ts`
  reads the remote's branch heads before the first boot and again at the end: any
  branch that appeared, moved or was deleted is a run that **advanced** the epic
  (`completed`); nothing at all is a run that **stopped** without progress; and a
  remote that could not be read is `unknown`, which leaves the run `completed`
  and says so rather than inventing either verdict. The verdict is stamped in
  `run_progress` (migrations/0006) and in `run.json`, and `tk cloud status <run>`
  prints it beside the state.

The observation cadence starts at 15s and backs off to 5m — fast where failures
and first output happen, affordable across a multi-hour run within Cloudflare's
per-instance step cap. `RUN_POLL_INTERVAL_MS` overrides it with a fixed gap.

### The reconcile protocol (`src/reconcile.ts`)

A supervisor that dies mid-wave is replaced by one that runs the same dispatch
step again — a completed `step.do` is checkpointed and never re-runs, but one
that was *in flight* when the isolate died starts from the top, and
`cloud:dispatch:<n>` is the step that boots containers. So the wave establishes
what is actually going on before it starts anything, on **every** attempt at
that step, from durable state only:

1. **Worker manifests** (`runs/<project>/<run>/artifacts/<tick>/manifest.json`)
   — the authority on what was *dispatched*. Written **before** the tick's
   container is addressed, because addressing a container is what provisions
   it: an absent manifest is therefore a durable statement that no container
   exists for that tick, and nothing else in the protocol can say that. It is
   also why a tick no manifest names is never probed — probing it would boot
   the container the reconcile exists to avoid booting.
2. **Git** — the authority on what *work exists*, read through the same
   `WorkerCollector` a live wave collects with. Never a container's terminal
   output.
3. **The live sandbox list** (`OrchestratorSandbox.listProcesses`) — the
   authority on what is *still running*, asked only of containers a manifest
   names.

Every tick lands in exactly one class: `live-worker`, `already-landed`,
`dead-with-work`, `stale-no-work`, `never-dispatched`, `unknown`. Two rules
matter more than the labels:

- **A live worker is never redispatched, whatever its branch looks like.** The
  process list is consulted before git, and a branch with no commits is exactly
  what a worker that has not committed yet looks like — Phase 1 paid for that
  when a worker died mid-turn holding 643 uncommitted lines and settled looking
  finished. A live worker is *adopted*: the wave waits on the process that is
  already there, so the container gets no second probe and no second worker.
- **"Cannot tell" is never folded into "nothing is there".** A container whose
  process list cannot be read, a remote that answers 503, a manifest listing
  that failed — each is `unknown`, reported with both sides of the
  contradiction, proposing no mutation at all.

Cold reconstruction always works (axiom 1). Nothing depends on a container
surviving or a snapshot restoring: an evicted container reports no live
process, the plan falls through to the git evidence, and the tick is dispatched
again onto its **existing** branch, which `cloud/sandbox/worker.sh` adopts from
origin. That is the same recovery, only slower — paid for in whatever the dead
container had not pushed. Each batch's verdict is recorded in the dispatch log
as `cloud_reconcile:<batch>:<counts>`.

### The evidence seam

Progress is read through `RepoRefs` (`src/progress.ts`) for the same reason the
container is read through `SandboxBinding`: the finalize rule is what needs
testing, and a rule exercisable only by pushing to a real GitHub repository is a
rule nobody tests. A deployment gets the GitHub reader — `matching-refs/heads/`,
authenticated with the repo-scoped PAT the factory already clones with; a test
assigns its own to `env.REPO_REFS`. Comparison is over *all* heads rather than
over a branch-naming convention, because naming is an adapter's choice and the
reconcile protocol already treats git rather than a name as authoritative. The
cost is that a human pushing an unrelated branch mid-run reads as progress —
the forgiving direction, and the one that cannot turn a run that really did the
work into a false negative.

### The sandbox seam

`wrangler.toml` binds `SANDBOXES` to the Cloudflare Sandbox SDK's own Durable
Object class (re-exported from `src/index.ts`), and a `[[containers]]`
application attaches the orchestrator image (`cloud/sandbox`) to that class. On
a deployment the binding is therefore a Durable Object namespace;
`sandboxBinding()` in `src/sandbox.ts` is what puts the SDK's `getSandbox`
behind the seam's five methods, and what accepts a fake in its place.

The seam itself is declared structurally rather than typed against the SDK, and
it is **optional**: a deployment without it fails each run with a message naming
the binding instead of looping on boots that cannot happen. The reason is testability — the run lifecycle is the thing
worth proving, and a lifecycle exercisable only by starting a real container is
a lifecycle nobody tests. `test/run-workflow.test.ts` drives the real Workflow,
the real lease, the real D1 index and the real R2 bucket, and substitutes only
the container: that is what lets a test kill an orchestrator mid-run and read
the log stream while the run is still going.

### The model path (D17)

All cloud model traffic goes through the operator's own AI Gateway, and it gets
there through this Worker. A sandbox is handed `<FACTORY_BASE_URL>/api/gateway`
as its gateway and a **run gateway token** as its only model credential; the
`/api/gateway/<provider>/...` route exchanges that token for the operator's
provider key, stamps `cf-aig-metadata` with the run and tick ids the token was
issued for, and forwards to the gateway.

| Rule | Why |
|---|---|
| No gateway configured → submissions are refused, naming `tk factory setup` | The absence of a gateway is an actionable stop at submission, never a silent fall back to a vendor default. A base URL pointed at a vendor host is refused the same way. |
| Only `workers-ai` is routed unless `GATEWAY_ALLOWED_PROVIDERS` names another | Workers AI bills to the operator's own Cloudflare account — the invoice their credit is on — while `anthropic`, `openai` and `openrouter` bill by the vendor in cash, and from this hop down the two are indistinguishable. A cash-billed route is refused with a 403 stating which invoice it would land on, so a mistyped or edited model id stops here instead of moving every run's spend onto a card. The opt-in is a wrangler `[vars]` list and a redeploy; a configured key is deliberately not one. |
| The route is exempt from the factory bearer token, and does not accept it | A sandbox must never hold the credential that commands the control plane. The run token can do exactly one thing. |
| Metadata is stamped, not accepted | Any `cf-aig-*` header the caller sent is dropped first, so an agent can neither misattribute its spend nor opt out of being attributed. |
| Cost comes from `GET .../ai-gateway/gateways/<gw>/logs`, filtered by run id | An agent can misreport; an invoice cannot. Needs `CLOUDFLARE_API_TOKEN`; without it a run with no explicit cost budget records its cost as unknown rather than as `$0`, while an explicit budget refuses before sandbox boot. |
| Every boot rotates the token; a trip, a stop and finalize revoke it | The kill switch works on a wedged or adversarial orchestrator, and no run ever leaves a live credential behind. Closeout gets a fresh token — a stop must still reach review and closeout (D15). |
| A hard stop is a durable refusal to mint, not a one-off revocation | Revoking a token stopped nothing on a live run, because the next boot minted a replacement — closeout boots included, since that pass enforces no budgets and so read no stop record. Only deleting the container application halted the spend. Now every boot of every pass checks for a standing hard stop before it credentials anything, and a hard stop mid-closeout trips the closeout too. |
| The `workers-ai` route rewrites `messages[].content` from OpenAI content parts to a string | Workers AI's `/v1/chat/completions` is OpenAI-*compatible*, not OpenAI: it takes content as a string, while omp sends parts. Every model call already passes through here, so the one documented dialect difference is normalised at the one hop that already reads the request. A part with no string form (an image, audio, a file) is refused with a 400 naming the message and the part — a translation layer that silently dropped it would reach the model as a prompt with a hole in it. |

## Auth: secrets, not accounts

One deployment serves one operator, so there is no user table and no signup
(D16). `tk factory deploy` mints a token on the operator's machine, keeps the
plaintext in `~/.ticksrc`, and pushes only a derived hash into the Worker
secret `FACTORY_TOKEN_HASH`. The worker never sees the plaintext and therefore
cannot leak it.

The stored record is self-describing, salted, and stretched — deliberately not
the unsalted `SHA-256(token)` used by `cloud/worker/src/auth.ts` (a ticks.sh
board-sync problem on its own track, which this bundle never builds on):

```
pbkdf2-sha256$<iterations>$<base64url salt>$<base64url derived key>
```

The iteration count lives in the record, so changing the cost later needs a new
secret rather than a migration. `src/auth.ts` mints and accepts at 100,000 —
**Cloudflare Workers caps PBKDF2 there**: `crypto.subtle.deriveBits` throws on
the edge above 100,000 iterations, so a higher record makes every authenticated
request a 503. Local workerd does not enforce the cap, so a guard test in
`test/auth.test.ts` does (`PLATFORM_MAX_ITERATIONS`). Nothing is lost to it:
the credential is 256 bits of CSPRNG output, not a password, so stretching is
not what makes it hard to guess.

| Path | Auth |
|---|---|
| `GET /health` | Open — liveness has to answer before a token exists. |
| `/api/hooks/**` | Open **today** for the future GitHub/Sentry webhook family; those sources cannot carry the operator's token and gain per-source shared secrets with Phase 3 (UC6). |
| `POST /api/channels/telegram/webhook` | Open to Telegram; paired `TELEGRAM_USER_ID` + `TELEGRAM_CHAT_ID` filter updates at the transport, with optional `TELEGRAM_WEBHOOK_SECRET`. |
| everything else | `Authorization: Bearer <factory token>` |

Auth runs *before* routing, so an unauthenticated caller gets the same 401 for
a real path and a nonsense one and cannot map the route table. A missing or
unusable `FACTORY_TOKEN_HASH` is a `503 auth_not_configured`, never a pass —
an unprovisioned factory fails closed. `GET /health` reports
`auth: { required, configured }` so a deploy can confirm the secret landed
without presenting a token; it never echoes the hash or any part of it.
`configured` is proven, not assumed: health derives against the stored
record's own salt and iteration count, so it reads `false` for a record that
parses but that this runtime refuses to run — the contradiction (health green,
every request 503) that made the first live failure expensive.

### Mint and rotate

Rotation needs **no redeploy**: the worker reads the secret on every request
and never caches it, so the previous token stops working as soon as the new
secret is live.

```sh
pnpm mint-token                                    # prints token + hash
# store the token in ~/.ticksrc (chmod 0600), then:
pnpm mint-token --hash-only | npx wrangler secret put FACTORY_TOKEN_HASH

# re-derive a record for a token you already hold (idempotent redeploy):
node scripts/mint-factory-token.mjs --token tkf_... --hash-only \
  | npx wrangler secret put FACTORY_TOKEN_HASH
```

`tk factory deploy --rotate-token` does the same thing without Node in the
loop: the mint and the PBKDF2 derivation are reimplemented in Go
(`internal/factory/token.go`), pinned to a golden record produced by
`src/auth.ts` itself so the two cannot drift. This script stays as the
Node-side tool for hand rotation and needs Node >= 22.6 for native TypeScript
type stripping (Node 24 has it on by default), because it imports
`src/auth.ts` directly rather than re-implementing the derivation.

## Deploy

`tk factory deploy` is the supported path. It wraps everything below against the
operator's own account, is idempotent, and pins the deployment to the tk version
whose embedded copy of this directory it uploaded (D16, "upgrades ride the repo"):

```sh
pnpm add -g wrangler   # or npm install -g wrangler — `npx wrangler` also works
wrangler login
# Docker (or another engine wrangler can drive) must be running: the deploy
# builds the orchestrator container image and pushes it to your own registry.
tk factory deploy
```

It creates or reuses `ticks-factory` (D1) and `ticks-factory-artifacts` (R2),
rewrites `database_id` in its own staged copy of `wrangler.toml`, installs the
bundle's runtime dependencies, builds and pushes the orchestrator image, applies
`migrations/`, deploys, pushes `FACTORY_TOKEN_HASH`, writes `factory_url` /
`factory_token` / `factory_version` into `~/.ticksrc`, and then proves the
result by calling `/health` — which must report the `sandboxes` binding — and
making one authenticated request. Re-running upgrades in place and keeps the
token unless `--rotate-token` is passed.

The last step is the container rollout, and it is the one `wrangler deploy` does
not perform: wrangler builds the image, pushes it, asks Cloudflare to roll it
out and returns as soon as the rollout has been *created*, so the Worker goes
live while the container application is still serving the previous image and a
run started in that window boots the old code. `tk factory deploy` polls
`wrangler containers list --json` until the `ticks-orchestrator` application
reports the digest it just pushed, and exits nonzero naming both digests if it
cannot confirm that (`--skip-rollout-wait` opts out and says so). The confirmed
digest lands in `factory_deployment_image`, and each run is stamped with it in
`run_image` as it ignites, which is what `tk cloud status <run>` reports as the
image that run booted.

Three prerequisites, each a stop with its own message rather than a deploy that
half-works: a logged-in **wrangler**, a running **Docker** (the image), and
**pnpm** (the Worker imports the Sandbox SDK, so the staged bundle is installed
from the embedded lockfile before it is bundled).

The bundle is staged in `~/.tick/factory/bundle` (override with `--bundle-dir`)
and the image's build context beside it in `~/.tick/factory/sandbox`, so the
`[[containers]]` image path (`../sandbox/Dockerfile`) means the same thing there
as it does in this repository. Both directories are tk's, rewritten on every
deploy, and are where to look to see exactly what was uploaded. The Go side of the deploy lives in
`internal/factory`; `scripts/verify-factory-deploy.sh` exercises it end to end
against a stateful wrangler stand-in, since CI has no Cloudflare account.

### By hand

The same steps, for a deployment tk is not driving:

```sh
pnpm install --prod --frozen-lockfile     # the Worker imports @cloudflare/sandbox
npx wrangler r2 bucket create ticks-factory-artifacts
npx wrangler d1 create ticks-factory      # paste the printed database_id into wrangler.toml
npx wrangler d1 migrations apply ticks-factory --remote
npx wrangler deploy                       # builds and pushes ../sandbox as the container image
pnpm mint-token --hash-only | npx wrangler secret put FACTORY_TOKEN_HASH
curl https://ticks-factory.<your-subdomain>.workers.dev/health   # auth.configured: true
```

`wrangler.toml` ships a placeholder `database_id` so local dev and the test
harness work out of the box; a real deploy needs your own id.
