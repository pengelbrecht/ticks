# Cloud factory: where model spend lands

How a factory run turns into money, and which pot it comes out of. The
operator funds this project with a Cloudflare account credit, so "did this
land on the Cloudflare invoice" is a correctness question, not an accounting
detail.

## Three pots, not two

| Path | Who bills | Funded by |
|---|---|---|
| Workers AI, gateway in `postpaid` mode | Cloudflare invoice (Neurons) | account credit |
| Workers AI, gateway in `unified` mode | AI Gateway prepaid wallet | cash, +5% purchase fee |
| `anthropic` / `openai` / `openrouter` | the vendor, against the operator's own key | cash |

The trap is the middle row. Unified Billing is not a discount programme or a
payment method for the same invoice — it is a **separate prepaid balance** the
operator buys up front. Flipping one per-gateway setting therefore moves
Workers AI traffic off the credit and onto cash, at a premium, with no signal
anywhere in our telemetry. It is a single toggle in the dashboard and it is
not versioned, reviewed, or visible in `wrangler.toml`.

Read the current mode from the gateway object:

    GET /accounts/{account_id}/ai-gateway/gateways/{gateway_id}
    → result.workers_ai_billing_mode   # "postpaid" | "unified"

`postpaid` is the mode this project wants. `h4n` makes pre-flight assert it.

Cloudflare unified Workers AI and AI Gateway billing on 2026-08-07, so any
reasoning about this that predates that changelog entry is wrong.

## What the credit does not cover

Only Workers AI reaches the Cloudflare invoice at all. The other three
providers in `PROVIDERS` (`cloud/factory/src/gateway.ts`) are pass-through:
the gateway attaches the operator's vendor key and the vendor bills them
directly. Routing a run at one of those is not a cheaper or pricier choice
within one budget — it is a different wallet. `fw6` makes workers-ai the only
provider the factory will route to without an explicit opt-in.

Today the deployed Worker holds no vendor keys, so a misconfigured provider
fails closed rather than billing. That is luck, not design: the guard is the
absence of a secret, and adding one for any reason would silently remove it.

## Reading spend

Gateway logs are the cost authority (D17). The account-level billing API is
not reachable with the factory's scoped token — `billing/profile` and
`billing/history` both answer `10000 Authentication error` — so the remaining
credit balance is a dashboard-only fact. Do not build anything that depends on
reading it programmatically with this token.

Per-run spend is filtered by `run_id` metadata, so the factory's numbers are
unaffected by other traffic sharing the same gateway. The `default` gateway is
shared with unrelated operator tooling; a log query that does *not* filter by
`run_id` will pick that traffic up.

Two failure modes have already been paid for here:

- The cost query trusted a `result_info.total_pages` field the logs API does
  not send, defaulted it to 1, and stopped after 50 entries — so a run that
  had spent $49.80 reported $2.98 and sailed past a $25 ceiling. Fixed in
  `cts`; hitting the page cap is now a telemetry failure, not a total.
- Ceilings live in `wrangler.toml` (`RUN_MAX_COST_USD`,
  `RUN_MAX_WALL_CLOCK_MS`), which means changing them is a Worker redeploy.
  They are deliberately small until a run has been measured with enforcement
  that works. `wn5` adds per-run flags that may lower the ceiling, never raise it.
