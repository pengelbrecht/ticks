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
| `src/db.ts` | Typed D1 accessors: runs, signals, dispatch log, project enrolment. |
| `src/auth.ts` | Single-tenant bearer auth (D16) — mint, salted PBKDF2 hash, constant-time verify, route middleware. |
| `scripts/mint-factory-token.mjs` | Operator-side mint/rotate tool for hand rotation. Imports `src/auth.ts`. `tk factory deploy` mints in Go instead — see "Mint and rotate". |
| `migrations/` | D1 migrations, applied by `tk factory deploy` before it deploys. |
| `src/run-room.ts` | `RunRoom` DO — one per project: the dispatch lease, the pending-question (gate) store, the submission queue and the stop record. Reconcile alarms land later. |
| `src/run-workflow.ts` | `RunWorkflow` — one durable instance per run: boot, watch, budgets, clean stop, finalize. Everything below it is disposable; this is not. |
| `src/sandbox.ts` | The orchestrator sandbox seam: what a container has to be, and the environment `cloud/sandbox`'s entrypoint is started with. |
| `src/artifacts.ts` | The R2 artifact tree, and the harness log stream written *during* the run. |
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
| `POST /api/runs` | Submit `{project, epic, base_sha, requested_by, notify?, queue?, queue_ttl_ms?}`. `201` started, `409` refused naming the holding run, `202` parked (with `queue: true`), `403` project not enrolled, `503` no Run Workflow bound. |
| `GET /api/runs` | The run index plus, for every project it mentions, that project's lease and queued submissions. Filters: `project`, `state`, `limit`. |
| `GET /api/runs/:id` | One run: index row, Workflow step state, lease, open gates, queued submissions, stop record. |
| `POST /api/runs/:id/stop` | A clean stop (D15): finish the in-flight tick, then review and closeout. |
| `GET/POST /api/projects`, `DELETE /api/projects/:owner/:repo` | Project enrolment. |

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
  verdict — 2 config, 3 clone, 4 tk version, 5 pre-flight — is never retried,
  because another container reaches the identical answer.
- **Budgets are enforced here, never in a prompt (D14).** `RUN_MAX_WALL_CLOCK_MS`
  and `RUN_MAX_COST_USD` are checked at every observation against the elapsed
  time the Workflow measured and the `cost_usd` on the index row (ground truth
  from AI Gateway telemetry, not an agent self-report). A model can be talked
  out of a budget; a Workflow step cannot.
- **Exhaustion is a clean stop, identical to `POST /api/runs/:id/stop` (D15).**
  Both trip the same branch: the in-flight work gets `RUN_STOP_GRACE_MS` to
  land, then a `closeout` orchestrator reconciles and runs review and closeout
  on what is done. There is no "abandon the run" path — an abandoned run leaves
  merged work with no tracker state.
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

The observation cadence starts at 15s and backs off to 5m — fast where failures
and first output happen, affordable across a multi-hour run within Cloudflare's
per-instance step cap. `RUN_POLL_INTERVAL_MS` overrides it with a fixed gap.

### The sandbox seam

`env.SANDBOXES` is declared structurally in `src/sandbox.ts` rather than typed
against the Cloudflare Sandbox SDK, and it is **optional**: a deployment without
it fails each run with a message naming the binding instead of looping on boots
that cannot happen. The reason is testability — the run lifecycle is the thing
worth proving, and a lifecycle exercisable only by starting a real container is
a lifecycle nobody tests. `test/run-workflow.test.ts` drives the real Workflow,
the real lease, the real D1 index and the real R2 bucket, and substitutes only
the container: that is what lets a test kill an orchestrator mid-run and read
the log stream while the run is still going.

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
| `/api/hooks/**` | Open **today**. GitHub, Telegram and Sentry cannot carry the operator's token; Phase 3 lands these routes together with per-source shared secrets (UC6). No such route exists yet. |
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
tk factory deploy
```

It creates or reuses `ticks-factory` (D1) and `ticks-factory-artifacts` (R2),
rewrites `database_id` in its own staged copy of `wrangler.toml`, applies
`migrations/`, deploys, pushes `FACTORY_TOKEN_HASH`, writes `factory_url` /
`factory_token` / `factory_version` into `~/.ticksrc`, and then proves the
result by calling `/health` and making one authenticated request. Re-running
upgrades in place and keeps the token unless `--rotate-token` is passed.

The bundle is staged in `~/.tick/factory/bundle` (override with `--bundle-dir`);
that directory is tk's, rewritten on every deploy, and is where to look to see
exactly what was uploaded. The Go side of the deploy lives in
`internal/factory`; `scripts/verify-factory-deploy.sh` exercises it end to end
against a stateful wrangler stand-in, since CI has no Cloudflare account.

### By hand

The same steps, for a deployment tk is not driving:

```sh
npx wrangler r2 bucket create ticks-factory-artifacts
npx wrangler d1 create ticks-factory      # paste the printed database_id into wrangler.toml
npx wrangler d1 migrations apply ticks-factory --remote
npx wrangler deploy
pnpm mint-token --hash-only | npx wrangler secret put FACTORY_TOKEN_HASH
curl https://ticks-factory.<your-subdomain>.workers.dev/health   # auth.configured: true
```

`wrangler.toml` ships a placeholder `database_id` so local dev and the test
harness work out of the box; a real deploy needs your own id.
