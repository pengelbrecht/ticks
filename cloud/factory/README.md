# ticks factory worker

Control plane for cloud epic runs. **Self-deployed into your own Cloudflare
account** (decision D16 in `docs/design/cloud-factory.md`): ticks.sh never
operates the factory, and this bundle is completely separate from
`cloud/worker` — it never imports from it and never deploys with it.

It serves the operator command surface (UC1b): submit a run, stop one, ask
what is happening, and enrol the repositories it is allowed to run. The run
itself is owned by the Run Workflow, which boots the orchestrator sandbox and
lives on its own tick; until that binding exists, submissions fail closed
rather than recording runs that could never boot.

## Layout

| Path | What it is |
|---|---|
| `wrangler.toml` | Bindings + migrations. `compatibility_date` is recent on purpose: DO SQLite storage and current WebSocket hibernation both need it. |
| `src/index.ts` | Worker entry: routing only — status codes, methods, body shapes. `GET /health` is open; everything else needs the bearer token. |
| `src/runs.ts` | Submission, stop and status policy: the lease, enrolment, the queue window, the `dispatch_log` trail, and the Run Workflow seam. |
| `src/telegram.ts` | Telegram webhook filtering, RunRoom question delivery, first-wins answer rendering, and threaded reports. |
| `src/db.ts` | Typed D1 accessors: runs, signals, dispatch log, project enrolment. |
| `src/auth.ts` | Single-tenant bearer auth (D16) — mint, salted PBKDF2 hash, constant-time verify, route middleware. |
| `scripts/mint-factory-token.mjs` | Operator-side mint/rotate tool for hand rotation. Imports `src/auth.ts`. `tk factory deploy` mints in Go instead — see "Mint and rotate". |
| `migrations/` | D1 migrations, applied by `tk factory deploy` before it deploys. |
| `src/run-room.ts` | `RunRoom` DO — one per project: the dispatch lease, the pending-question (gate) store, the submission queue and the stop record. Reconcile alarms land later. |
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
| `POST /api/projects/:owner/:repo/pending` | Register a cloud ask in the project's RunRoom; `{notify:"telegram"}` delivers it to the paired Telegram chat. |
| `GET /api/projects/:owner/:repo/pending` | Read open pending entries; `include_resolved=true` lets the terminal report the winning surface. |
| `POST /api/projects/:owner/:repo/pending/:id/answer` | Terminal answer. RunRoom arbitrates first-wins and returns `409` with the winner when already resolved. |
| `POST /api/projects/:owner/:repo/reports` | Send a completion report, optionally with `ref` to reply in the originating Telegram thread. |

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
`awaiting_approval` for an unenrolled project), so "why did this not run" is
answerable from D1 rather than from a log line.

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
