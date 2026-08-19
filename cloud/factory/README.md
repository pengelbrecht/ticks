# ticks factory worker

Control plane for cloud epic runs. **Self-deployed into your own Cloudflare
account** (decision D16 in `docs/design/cloud-factory.md`): ticks.sh never
operates the factory, and this bundle is completely separate from
`cloud/worker` — it never imports from it and never deploys with it.

Today it does almost nothing: a health route, single-tenant bearer auth, and
a placeholder `RunRoom` Durable Object. It is deployable from day one so later
phases add behaviour to a live bundle instead of standing one up under
pressure.

## Layout

| Path | What it is |
|---|---|
| `wrangler.toml` | Bindings + migrations. `compatibility_date` is recent on purpose: DO SQLite storage and current WebSocket hibernation both need it. |
| `src/index.ts` | Worker entry. `GET /health` is open; every other route needs the bearer token, then 404s. |
| `src/auth.ts` | Single-tenant bearer auth (D16) — mint, salted PBKDF2 hash, constant-time verify, route middleware. |
| `scripts/mint-factory-token.mjs` | Operator-side mint/rotate tool. Imports `src/auth.ts`, so there is one implementation. |
| `src/run-room.ts` | `RunRoom` DO placeholder — the dispatch lease, operator gates and reconcile alarms land in Phase 1. |
| `src/env.d.ts` | Hand-written `Cloudflare.Env` (what `wrangler types` would generate). Keep in sync with `wrangler.toml`. |
| `test/` | vitest + `@cloudflare/vitest-pool-workers`: real workerd, bindings read from `wrangler.toml`. |

## Develop

```sh
pnpm install
pnpm test          # vitest in workerd
pnpm typecheck
pnpm dev           # local worker on :8788
```

## Auth: secrets, not accounts

One deployment serves one operator, so there is no user table and no signup
(D16). `tk factory deploy` (tick 7c1) mints a token on the operator's machine,
keeps the plaintext in `~/.ticksrc`, and pushes only a derived hash into the
Worker secret `FACTORY_TOKEN_HASH`. The worker never sees the plaintext and
therefore cannot leak it.

The stored record is self-describing, salted, and stretched — deliberately not
the unsalted `SHA-256(token)` used by `cloud/worker/src/auth.ts` (a ticks.sh
board-sync problem on its own track, which this bundle never builds on):

```
pbkdf2-sha256$<iterations>$<base64url salt>$<base64url derived key>
```

The iteration count lives in the record, so raising the cost later needs a new
secret rather than a migration. `src/auth.ts` accepts 100,000–1,000,000 and
mints at 210,000 (~13ms in workerd).

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

`tk factory deploy --rotate-token` will wrap this. The script needs Node >= 22.6
for native TypeScript type stripping (Node 24 has it on by default) because it
imports `src/auth.ts` directly rather than re-implementing the derivation.

## Deploy (one-time setup)

The account-specific resources do not exist until you create them:

```sh
npx wrangler r2 bucket create ticks-factory-artifacts
npx wrangler d1 create ticks-factory      # paste the printed database_id into wrangler.toml
npx wrangler deploy
pnpm mint-token --hash-only | npx wrangler secret put FACTORY_TOKEN_HASH
curl https://ticks-factory.<your-subdomain>.workers.dev/health   # auth.configured: true
```

`wrangler.toml` ships a placeholder `database_id` so local dev and the test
harness work out of the box; a real deploy needs your own id. `tk factory
deploy` will wrap this walk-through later.
