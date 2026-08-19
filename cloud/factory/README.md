# ticks factory worker

Control plane for cloud epic runs. **Self-deployed into your own Cloudflare
account** (decision D16 in `docs/design/cloud-factory.md`): ticks.sh never
operates the factory, and this bundle is completely separate from
`cloud/worker` — it never imports from it and never deploys with it.

Today it does almost nothing: a health route and a placeholder `RunRoom`
Durable Object. It is deployable from day one so later phases add behaviour to
a live bundle instead of standing one up under pressure.

## Layout

| Path | What it is |
|---|---|
| `wrangler.toml` | Bindings + migrations. `compatibility_date` is recent on purpose: DO SQLite storage and current WebSocket hibernation both need it. |
| `src/index.ts` | Worker entry. `GET /health`; everything else 404s. |
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

## Deploy (one-time setup)

The account-specific resources do not exist until you create them:

```sh
npx wrangler r2 bucket create ticks-factory-artifacts
npx wrangler d1 create ticks-factory      # paste the printed database_id into wrangler.toml
npx wrangler deploy
curl https://ticks-factory.<your-subdomain>.workers.dev/health
```

`wrangler.toml` ships a placeholder `database_id` so local dev and the test
harness work out of the box; a real deploy needs your own id. `tk factory
deploy` will wrap this walk-through later.
