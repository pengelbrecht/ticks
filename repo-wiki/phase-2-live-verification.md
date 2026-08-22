# Phase 2 final review: the code is verified, the deployment is not

Recorded 2026-08-22 during tick oun (epic 1vn final review). The Phase 2 code
(per-tick container isolation, the three spawn defences, one lease across
local/cloud orchestrators, reconcile-on-reboot, run_event-stays-observability)
reads as correct and is thoroughly unit/integration tested — 216 `vitest`
cases in `cloud/factory`, the full Go suite, both green. But **the deployed
factory this repo's `~/.ticksrc` points at has never run any of it**, and nothing
short of checking the live account would have shown that.

## What was checked, and how

Read-only HTTP against the real deployed Worker (`ticks-factory.pe-1a0.workers.dev`,
via the bearer token already in `~/.ticksrc` — no `tk` command, nothing mutated):

| Check | Result |
|---|---|
| `GET /health` | 200, all bindings present (`run_rooms`, `artifacts`, `db`, `run_workflow`, `sandboxes`) |
| `GET /api/runs` | 200, real run history — but every run is epic `72y` or `gj9`, all ended by 2026-08-21T12:14Z |
| `GET /api/observe` (tick t9s's dashboard read) | **404 `not_found`** — identical to a nonexistent path |
| `GET /api/projects` | 200, `pengelbrecht/ticks` enrolled |

`wrangler deployments list` (read-only, using `factory_cloudflare_api_token`
from `~/.ticksrc`) confirms why: the last **Upload** deployment landed
**2026-08-21T10:34:58Z**, followed only by secret-change deploys through
10:39:37Z. `factory_version` in `~/.ticksrc` is literally `"dev"`.

## Why that matters

Every Phase 2 tick that makes `dispatchWave` real — 0ds (spawn defences),
tap (worker entrypoint), b6e (wiring it into the Run Workflow), bmo (`tk cloud`
verbs), s7f (reconcile-on-reboot), bne (run_event producers), k24
(cancellation), t9s (the `/api/observe` dashboard route this 404 proves is
missing) — merged commits timestamped from 18:09 to past 20:00 on 2026-08-21,
**after** the last upload. The deployed bundle predates the entire per-tick-
container mechanism. Concretely, this means:

- No real Cloudflare Sandbox has ever booted a per-tick worker container.
- No real Run Workflow has ever executed `dispatchWave`, a real credential
  batch-issue, or a real cancellation mid-wave.
- The reconcile protocol's live-sandbox-list branch (`probeLiveness`) has
  never been asked about a real container.
- `tk factory dashboard` / `/api/observe` cannot be exercised against this
  deployment at all right now — it 404s.
- Every "as built" measurement Phase 2 tick notes cite (kuf's cold/warm/hot
  numbers, x3v's image-per-application finding) was taken **off-platform with
  Docker**, explicitly caveated in the ticks themselves as "treat as shape, not
  as Cloudflare absolutes" — that caveat is still live; nothing since has
  closed it.

This is exactly the shape of gap the epic's final-review tick was written to
catch ("Phase 1 shipped four defects that only live execution found") — Phase
2 simply hasn't had its live-execution pass yet. The unit tests being green
proves the logic is internally consistent; it proves nothing about the actual
Cloudflare Sandbox/Workflow/DO APIs, which vitest's `workerd` pool fakes
(`FakeSandboxes` in `cloud/factory/test/run-workflow.test.ts`) rather than
calls for real.

## What was deliberately not attempted

Redeploying the factory (`tk factory deploy`) or dispatching a real wave
against it were both out of bounds for this tick: the former is a `tk`
command (explicitly forbidden for this review), and both are costly,
hard-to-reverse actions against shared production infrastructure — spending
real money, using the account's real GitHub write token, and pushing real
branches — that a review-only tick has no standing to trigger unilaterally.
That decision, and a real dispatched wave to watch, belongs to whoever closes
this epic next.

## Recommendation

Before this epic is marked done with confidence: redeploy the factory from
this branch, then dispatch a real multi-tick wave (`tk cloud spawn` or
`tk cloud run`) and watch it end to end — boot, probe, confirm, wait, collect,
teardown, and a deliberate reconcile (kill the orchestrator mid-wave, confirm
the replacement adopts the live worker rather than double-dispatching it).
That is the one thing 216 passing tests cannot stand in for.

---

# The wave that was actually dispatched (2026-08-22)

The recommendation above was taken. Recorded here because the run refuted a
hypothesis this repo had spent seven paid runs on, and because the numbers
change the cost model.

## Per-tick fan-out had never once succeeded, and the reason was one line

Every worker container from the first seven runs died at boot with **exit 7**
(`EXIT_MODEL`), and each run's diagnosis was inferred from a dispatch log that
was never designed to answer the question. The actual cause:

| Layer | What it resolved | Result |
|---|---|---|
| `cloud/sandbox/worker.sh` | `model_role="implement"` — correct; a worker must not run the orchestrator's frontier model | — |
| `.tick/runners.toml` `[roles.implement]` | `kind="claude"`, `model="sonnet"` | provider `anthropic` |
| the factory gateway | routes `workers-ai` only (`GATEWAY_ALLOWED_PROVIDERS` unset, no `ANTHROPIC_API_KEY`) | `probe_model` dies `EXIT_MODEL` |

Deterministic: every worker, every wave. The orchestrator never hit it because
`[orchestrator].model` is a `workers-ai/…` id and its probe returned HTTP 200
in the very same run.

**The trap to remember:** `[roles.implement]` is *shared* between the cloud
worker and `tk herd spawn`'s local worker CLIs. Repointing it at a Workers AI
model fixes the container and breaks every local run, because a local worker
has no gateway credential. The fix therefore belongs to the FACTORY, not the
repository: `workerBootEnv` defaults `TICKS_HARNESS=omp` and `TICKS_MODEL` to
the factory's own worker model, and `resolve_model` already gives a
control-plane `TICKS_MODEL` priority over role routing, so no shell change was
needed.

That default was flash (`deepseek-v4-flash-0731`) until tick `1cd`, which made
it `deepseek-v4-pro-0813` on run 3's evidence below and added the rung that had
been missing: `RUN_WORKER_MODEL` / `RUN_WORKER_HARNESS` are wrangler `[vars]`,
so the worker's route is a deploy rather than a source edit. Resolution order
is **run submission > deployment var > built-in default** (`workerModel` in
`cloud/factory/src/worker-boot.ts`). Still no shell change — both vars are
applied Worker-side, into the same `TICKS_MODEL`/`TICKS_HARNESS` the container
already reads.

Corollary worth stating plainly: **cloud workers must run `omp`, not `claude`.**
`common.sh` refuses the `claude` harness against a non-anthropic provider by
design, so "Workers AI only" and "workers run omp" are the same constraint.

## What the run proved

`run_2e66e765f74c4192b2b9a24a6e8415cf`, epic `72y`, wave `201,5jo,5qj,gm5`:

- **Zero exit-7 boots.** Three containers booted, cloned, passed pre-flight
  and probed green concurrently.
- **`deepseek-v4-flash` sustains a real agentic loop** — 393+ calls with
  genuine tool use (vitest runs, source reads). This is the first evidence for
  flash as an *implementer*; every earlier data point was the orchestrator tier.
- **Prompt cache 95–99%**, sustained. Compare the 60–65% that `v4-pro` runs
  settled at, which `fxf` attributed largely to instance-side routing. This
  matches `y45`'s probe exactly (flash 23/23 post-warm hits, v4-pro 12/24), so
  **any per-tick cost model built on 60–65% is badly pessimistic for workers.**
  A cached input token is 0.004 neurons against 0.120 uncached.
- **Repository setup took 0s** on a warm cache — worth holding against `kuf`'s
  finding that dependency install, not image pull, was the whole of the 3.74x
  fan-out degradation at N=5.

## What it refuted

**A 30-minute worker budget kills real work just before it commits.** All three
containers were killed at exit 124 with **zero work commits**, having done
substantial real work. `CLOUD_WAVE_WAIT_TIMEOUT_MS = 30 * 60_000` and the
harness bound derives from it — so the run's own `--max-wall-clock 90m` was
ignored. `y45` had already measured a *complete one-tick epic* at 78 minutes on
the faster-stepping `v4-pro`. Filed as `5fg`.

This is the most expensive failure shape available: the run pays for every
token and keeps none of the work. The push margin did its job — three legible
branches with reports instead of three destroyed containers — so read the
timeout as a budget error, not a substrate defect.

## Observability, and why it mattered here

Two ticks landed before this run and between them turned a seven-run mystery
into a three-minute read:

- **`ys3`** persists the dispatch *outcome* (launched, probe verdict, exit code)
  at `dispatchWave`'s return site, where no branch can miss it. That is what
  produced `exit_code: 7` instead of another inference.
- **`0fg`** streams each container's own stdout/stderr to its own R2 key, read
  with `tk cloud logs <run> --tick <id>`. That is what named *which* of
  `common.sh`'s five `EXIT_MODEL` deaths it was.

**Known gap:** the worker streams stop growing once the harness starts — every
one ends at `Working...`. Boot diagnostics stream reliably, which is what `0fg`
was for; the harness's own stdout does not reach R2 the way the orchestrator
sandbox's does.

## The defect that was hiding behind all the others

Both live runs ended the same way, and the run record never said so:

    GET /accounts/<acc>/workflows/ticks-run/instances/<run_id>
    status: errored
    error:  {"message": "Execution timed out after 600000ms", "name": "Error"}
    last step: cloud:dispatch:0-1

**Cloudflare Workflows caps a single step's execution at 10 minutes.**
`superviseCloudWave` wraps `dispatchWave` in one `step.do()`, and `dispatchWave`
blocks until the whole wave settles — up to 90 minutes since `5fg`. So the
cloud-wave path is architecturally guaranteed to kill its own supervisor on any
wave that takes longer than ten minutes, which is every real wave.

Note the counter-intuitive interaction: **raising the worker budget made this
worse.** A longer wave is a longer blocking step. `5fg` is still right — killing
agents at 29 minutes was a real defect — but the two fixes only help together.

### What one dead supervisor looked like from outside

Every symptom below was previously read as a separate problem:

| Symptom | Actual cause |
|---|---|
| `tk cloud status` says `running` for 97 minutes | only the Workflow writes that column, and it is dead |
| containers still making model calls long after | orphaned; nothing collects or tears them down |
| `lease: null` on a "live" run | nothing left alive to renew it |
| a run stuck in `stopping` forever | a hard stop asks the Workflow to wind down; there is none |

### The rule

**Read the Workflow instance, not the run record, when a cloud run misbehaves.**
The run record is written *by* the thing that may have died — it cannot report
its own death. The instance API is read-only and needs only
`factory_cloudflare_api_token`.

More generally: a supervisor's own liveness must be observable from outside the
supervisor. This one had no such channel, so seven runs of diagnosis went into
the workers while the thing watching them was already gone.

### The pattern that does work

`supervisePass` on the single-sandbox path has supervised multi-hour runs
without tripping the cap: `MAX_OBSERVATIONS` with a stretching `pollDelay`, each
observation its own short step. Long waits belong across many bounded steps,
re-deriving state from the durable layer each time so a retried or resumed step
does not depend on a closure that no longer exists.
