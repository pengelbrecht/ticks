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
