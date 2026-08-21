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

## Confirmed against the operator's account (2026-08-21)

Dashboard evidence, since none of this is readable with the factory's token:

- **Workers AI is a covered product.** The Startup Program credit explicitly caps
  Workers AI at $50,000 and R2 at $10,000 — a cap is only stated for something
  that is covered. **AI Gateway is excluded** ("temporarily not covered").
- **Cloudflare classifies our traffic as Workers AI, not as AI Gateway.** The
  Workers AI usage dashboard attributes it to `@cf/deepseek-ai/deepseek-v4-pro-0813`:
  4.54M Neurons, 46.73M input tokens. At published Neuron rates that is ~$49.9,
  which matches the $49.80 the gateway logs reported to within rounding. So the
  gateway `cost` field is not a private estimate — it is the real Workers AI
  charge, and routing through a gateway did not reclassify it.
- **It had not reached billable usage yet.** Mid-cycle, the account showed
  $0.28 total (Container Memory, R2) with **no Workers AI product family at all**
  in the filter list, and the credit read $9,999.91 of $10,000 with 0% used.
  Do not read "not in billable usage" as "not charged": usage lands there on a
  lag, and the cycle had not closed.

Consequence for anyone reading a cost number here: **the Workers AI dashboard is
the reconciliation point, not the billing page.** Compare gateway-log cost against
Neurons there; the billing page only catches up at cycle close.

## The cost model, fitted from a real run

Workers AI bills in Neurons at **$0.011 per 1,000**. Fitting neurons against token
classes across 226 substantive calls of `run_62c289d1` gives round numbers, which
is a good sign the fit found the tariff rather than noise:

| Token class | Neurons/token | Relative |
|---|---|---|
| uncached input | 0.120 | 1× |
| **cached input** | **0.004** | **1/30×** |
| output | 0.360 | 3× |

The gateway log's `cost` field is therefore **net** — already discounted for
caching, not a list price. Two calls of near-identical size from that run:

    104,940 in,  15,616 cached (15%)  ->  10,866 neurons  ->  $0.1195
     87,747 in,  84,736 cached (97%)  ->     768 neurons  ->  $0.0084

Same size, 14x the cost, purely cache rate. That single ratio — a cached input
token costing a thirtieth of an uncached one — is the most important number for
anyone reasoning about what a run costs.

For that run: 3,799,364 uncached + 7,154,176 cached input and 157,709 output
came to **$5.95 actual against $15.08 modelled with no caching — 61% saved**.
The pre-`l8z` runaway cached nothing and paid full freight on all 46M tokens.

Read cached tokens from `usage_metadata.input_cached_tokens` on each gateway log
row, or `prompt_tokens_details.cached_tokens` in the response body. Nothing in D1
carries it.

## Where a run's conversation lives

Not in D1 — that holds control-plane state only (`runs`, `signals`,
`dispatch_log`, `run_gateway_token`, `run_image`, `run_progress`), no messages.
The conversation is in the AI Gateway logs, filterable by `metadata.run_id`, with
full bodies from two detail endpoints:

    GET /ai-gateway/gateways/{gw}/logs/{id}/request    -> the whole message array
    GET /ai-gateway/gateways/{gw}/logs/{id}/response   -> choices, tool_calls, usage

One trap: responses are streamed, so `choices[0].message` on the *response* is
empty — `content: null`, `tool_calls: null`. Reconstruct what the model did from
the assistant messages inside each *request* body instead, deduplicated across
calls. Reading the response and concluding "the model emitted nothing" is wrong.

`tk cloud trace` (tick `l4l`) is the intended home for this.

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
