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

`postpaid` is the mode this project wants, and pre-flight now asserts it
(`h4n`). The expectation lives in `~/.ticksrc` as
`factory_workers_ai_billing_mode` and defaults to `postpaid`, so a factory that
was never told otherwise FAILS on unified rather than quietly spending cash:
`tk factory setup` reads the gateway object and refuses to configure a factory
that drifted, and `tk factory status` carries it as its own `workers ai billing`
rung, which `--check` turns into a nonzero exit. An operator who really did buy
a prepaid wallet opts in once with
`tk factory setup --workers-ai-billing-mode unified`. Implementation:
`internal/factory/billing.go` (`CheckWorkersAIBilling`), which is also the entry
point a run-submit path can call. Both reads need the Cloudflare API token the
telemetry rung installs — without one the mode is UNCHECKED, and both commands
say so rather than passing quietly. An absent `workers_ai_billing_mode` field
fails closed for the same reason: it is not evidence of postpaid.

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

The pre-`l8z` runaway is often quoted as having cached *nothing*. It did not:
re-read row by row (`fxf`), `run_f15efdfb` cached **11,823,872 of 46,098,950
input tokens — 25.6%** with 510 of its 892 calls at exactly zero. The "0" in the
original write-up came from the log row's `cached` boolean, which reports the
gateway RESPONSE cache and is false on every agentic call by construction. So
the real before/after for the affinity header is **25.6% → 65.3%**, not 0 → 65%,
and the honest reading of it is weaker and more useful: affinity roughly 2.5×'d
the hit rate without ever making instance routing deterministic.

Read cached tokens from `usage_metadata.input_cached_tokens` on each gateway log
row, or `prompt_tokens_details.cached_tokens` in the response body. Nothing in D1
carries it. **Never read the row's `cached` field for this** — that is the
response cache, permanently false here.

## Publishing a cached rate is not delivering one (2026-08-21, tick y45)

Six of the sixteen tool-capable models on this account publish a
`per M cached input tokens` price. Probed with a byte-identical 22.5k-token
prefix over six rounds, they do not behave alike, and the price list gives no
hint which is which:

| Model | Cached rate | Post-warm hits |
|---|---:|:---:|
| `deepseek-v4-flash-0731` | $0.014 | 23/23 |
| `kimi-k2.7-code` | $0.19 | 23/23 |
| `kimi-k2.6` | $0.16 | 18/18 |
| `deepseek-v4-pro-0813` | $0.044 | 12/24 |
| `glm-5.2` | $0.26 | 5/24 |
| `qwen3.8-27b` | $0.05 | **0/27** |

Three consequences for anyone pricing a run here:

- **A published cached rate is not a discount you will receive.** `qwen3.8-27b`
  advertises $0.05/M and billed 27 of 27 post-warm calls at its $0.45/M list
  rate. Model the cache from a probe, never from the rate card.
- **A reported cache is not a billed cache.** `gemma-4-26b-a4b-it` returns
  `cached_tokens` at ~100% of the prompt while its Neurons do not move. Score
  the Neurons, not the field — the same trap as the log row's `cached` boolean,
  one level down.
- **`result_info.total_count` on `/ai/models/search` is not a page bound.** It
  reported 291 against a real 64; it counts the platform catalog, not the
  account's slice. Page until a short page proves exhaustion.

The conversion is confirmed live rather than quoted: USD predicted from the
published per-token prices matched `neurons x $0.011 / 1000` to within 0.66%
worst case across sixteen models, and exactly on ten of them. Harness:
`scripts/bench_workers_ai_models.py`; full comparison and the per-role/tier
recommendation in `docs/workers-ai-model-selection.md`.

## What `x-session-affinity` does and does not buy

The header routes a session's calls toward one model instance, which is where a
prefix cache lives. It is worth a lot (25.6% → 65.3%) and it is **not**
stickiness. Measured on `run_62c289d1` and against the live model (`fxf`):

- **The key is per RUN, and a run is many conversations.** That run's 230 calls
  are one orchestrator plus seven implementer subagents — separable in the logs
  by the first two messages of each request body — all sharing one key. They do
  not fight: the fan-out phase cached **67.9%** with six or more conversations
  live against **52.4%** while the orchestrator ran alone, and a call following
  *another* conversation hit 65.7% against 62.4% following its own.
- **A miss is usually not a drifting prompt.** Two consecutive requests around a
  total miss were byte-identical for all 220,891 characters of the earlier one,
  same tools and options — and the later was billed 512 cached of 74,605.
- **Nothing about the key fixes it.** Four synthetic 15k-token conversations,
  one shared key vs one key each: 24.0/24.3% sequential, 40.2/7.8% concurrent,
  12.1/29.8% concurrent with the order reversed — noise, both signs. One
  conversation, alone, on its own key still missed completely on two of three
  follow-up calls.
- **Caching also warms up.** In every probe the first repeat of a prefix was
  billed at 0% and hits only appeared from the second repeat on, so a short
  conversation can pay full price throughout.

**The headroom is real but bounded.** `run_62c289d1` left 3,799,364 input tokens
uncached; billing every one of them at the cached rate would have saved
3,799,364 × (0.120 − 0.004) = 440,726 neurons = **$4.85**, taking the run from
$5.96 to about $1.11. That is the whole prize for perfect caching, and none of
it is bought by choosing a different affinity key.

The recurring signature of a miss is a *floor*: the call is billed a cached
count equal to some earlier snapshot of that conversation (~15.6k tokens in the
fan-out, 15,872 in the runaway) rather than zero, i.e. it reached an instance
that saw the conversation once and never since. Treat the remaining ~35% as
instance-side and unpurchasable by header choice; the levers that do move it are
prompt size and turn count.

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
