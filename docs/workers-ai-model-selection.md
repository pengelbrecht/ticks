# Workers AI model selection: which model runs which role

**Measured 2026-08-21** against the live Cloudflare API on the operator's own
account — `GET /accounts/<id>/ai/models/search` for the catalog and prices,
`POST /accounts/<id>/ai/v1/chat/completions` for compatibility, tool-calling
and prefix-cache behaviour. Nothing here is quoted from memory or a blog post.

Harness: [`scripts/bench_workers_ai_models.py`](../scripts/bench_workers_ai_models.py).
Raw output:
[`benchmarks/workers-ai-models/2026-08-21-workers-ai.json`](../benchmarks/workers-ai-models/2026-08-21-workers-ai.json).
Guarded by `go test ./internal/sandbox -run WorkersAIModel`.

**Availability and prices move.** This is a dated snapshot of one account, not a
constant. Re-run `python3 scripts/bench_workers_ai_models.py --all
--measured-at <date>` and commit the new raw file beside the old one. The
probes cost a few cents of Neurons; the inventory alone (`--inventory`) costs
nothing.

This is the inference half of a wave's price. The other half — what a container
costs to start — is [`sandbox-start-benchmark.md`](sandbox-start-benchmark.md)
(tick kuf). Together they price a wave.

## The short version

The incumbent `@cf/openai/gpt-oss-120b` was a placeholder, and measurement does
not defend it: it is **twice the cost per completed tick** of the best option,
it has **no published DeepSWE score on any 2026 board**, and it is one of the
models whose prefix cache never fired in 5 post-warm calls — on a workload
where 98.6% of the tokens are input, that last fact is most of the bill.

| Cell | Route to | Why in one line |
|---|---|---|
| `orchestrator` / `frontier` | `workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813` | Best DeepSWE on the account (63.0), 1M context, and the model the only reconciled production run already ran on |
| `implement` / `balanced` | `workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731` | $0.28/tick — the cost winner, and the most reliable cache measured |
| `implement` / `economy` | `workers-ai/@cf/zai-org/glm-4.7-flash` | $0.11/tick; caches nothing but is cheap enough that it does not matter |
| `implement` / `strong` | `workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813` | The capability ceiling available on Workers AI |
| `implement` / `frontier`, `review`, `closeout` | **BYOK frontier** | Nothing on Workers AI is good enough — see [Where BYOK stays](#where-byok-stays) |

The two candidates the tick named head-to-head: **deepseek-v4-flash wins, and
qwen3.8-27b loses badly** — 3.4× the cost per tick for 11 fewer DeepSWE points.
The reasons are in [Price](#2-price) and they are not the headline rate.

## 1. Inventory — what this account actually serves

64 models, 29 of them text generation, 16 of those tool-capable. Every
tool-capable model was probed live.

**A pagination note that cost real money once.** `result_info.total_count`
reported **291** against a real **64**: it counts the platform catalog, not the
account's slice. The harness pages until a *short page* proves exhaustion and
treats a page cap as a telemetry failure — never bounding on a `result_info`
field, which is exactly how a previous budget query in this repo reported
$2.98 on a run that spent $49.80.

### The comparison table

All 16 tool-capable text-generation models, cheapest per completed tick first.
Prices are USD per million tokens, read from the model list on 2026-08-21.

| Model | Ctx | OpenAI-compat | In | Out | Cached in | Cache fires? | DeepSWE | $/tick |
|---|---:|:---:|---:|---:|---:|:---:|---:|---:|
| `@cf/ibm-granite/granite-4.0-h-micro` | 131,000 | **no** ¹ | 0.017 | 0.112 | — | 0/5 | — | 0.029 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 32,768 | yes | 0.0509 | 0.335 | — | 0/5 | — | 0.102 |
| `@cf/zai-org/glm-4.7-flash` | 131,072 | yes | 0.0605 | 0.400 | — | 0/5 | 59.2 ² | 0.110 |
| `@cf/google/gemma-4-26b-a4b-it` | 256,000 | yes | 0.100 | 0.300 | — | 4/5 ³ | — | 0.217 |
| **`@cf/deepseek-ai/deepseek-v4-flash-0731`** | **1,310,720** | yes | 0.440 | 1.320 | **0.014** | **5/5** | **53.3** | **0.283** |
| `@cf/openai/gpt-oss-20b` | 128,000 | yes | 0.200 | 0.300 | — | 0/5 | — | 0.330 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 131,000 | yes | 0.270 | 0.850 | — | 0/5 | — | 0.440 |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 24,000 | yes | 0.293 | 2.253 | — | probe failed ⁴ | — | 0.509 |
| `@cf/openai/gpt-oss-120b` *(incumbent)* | 128,000 | yes | 0.350 | 0.750 | — | 0/5 | none ⁵ | 0.582 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 128,000 | yes | 0.351 | 0.555 | — | 0/5 | — | 0.659 |
| `@cf/moonshotai/kimi-k2.6` | 262,144 | yes | 0.950 | 4.000 | 0.160 | 5/5 | — | 0.767 |
| `@cf/moonshotai/kimi-k2.7-code` | 262,144 | yes | 0.950 | 4.000 | 0.190 | 5/5 | 30.5 | 0.797 |
| **`@cf/deepseek-ai/deepseek-v4-pro-0813`** | **1,048,576** | yes | 1.320 | 3.960 | **0.044** | 5/5 ⁶ | **63.0** | **0.851** |
| `@cf/nvidia/nemotron-3-120b-a12b` | 256,000 | yes | 0.500 | 1.500 | — | 0/5 | — | 0.958 |
| `@cf/qwen/qwen3.8-27b` | 262,144 | yes | 0.450 | 3.200 | 0.050 ⁷ | **0/5** | 42.2 | 0.961 |
| `@cf/zai-org/glm-5.2` | 262,144 | yes | 1.400 | 4.400 | 0.260 ⁷ | 0/5 | 43.8 | 2.438 |

1. **granite-4.0-h-micro emits tool-call `arguments` double-JSON-encoded** —
   a string containing a JSON string rather than a JSON object — and it does so
   *nondeterministically at temperature 0*. The committed run caught the
   malformed shape; a five-call stability probe on the identical prompt
   returned the correct shape five times out of five. Same prompt, same
   temperature, both shapes. A harness that parses `arguments` will crash on a
   coin flip, and it cannot retry its way out of a fault it cannot predict.
   This is what probing "OpenAI-compatible" rather than assuming it buys, and
   it is why the cheapest row in the table is not the recommendation.
2. Vendor-reported SWE-bench Verified, not DeepSWE. Different scale — see
   [Capability](#3-capability).
3. **Reported but not billed.** gemma-4-26b returns `cached_tokens` at ~100% of
   the prompt while its Neurons do not move by a thousandth. A cache that is
   reported and not discounted is worth nothing, and the harness scores the
   Neurons, not the field.
4. HTTP 413. Its 24,000-token context cannot hold a 22.5k-token fixture plus
   the response reservation — which is also the reason it is unusable for an
   agentic loop whose prompts run to 70k+. Its `$/tick` is a list-price upper
   bound, flagged `cache_measured: false` in the raw file, not a measurement.
5. See [Capability](#3-capability). The incumbent's only published SWE-bench
   number is from its 2025 model card on a pre-agentic harness.
6. The committed run caught it warm; it is intermittent across rounds — see
   the cross-round table below.
7. **Publishes a cached-input price and never delivers one.** See below — this
   is the finding that decides the tick's headline question.

### OpenAI-compatibility, probed rather than assumed

All 16 tool-capable models accept `messages[].content` as a **string**, all 16
accept OpenAI **content parts** (`[{"type":"text",…}]`), and all 16 emitted a
tool call when told to. Only granite's `arguments` failed to parse.

That content-parts result **contradicts the standing note in
`docs/design/cloud-factory.md`**, which records a live run dying on
`Type mismatch of /messages/0/content, array not in string`. As of 2026-08-21
the account's OpenAI-compatible endpoint accepts the array shape on every
tool-capable model. Two things follow, and only one of them is a change:

- The observation is real and dated. The platform moved.
- **`stringifyContentParts` in `cloud/factory/src/gateway.ts` should stay.** It
  is now belt-and-braces rather than load-bearing, and belt-and-braces on a
  platform that has already changed under this epic twice is worth its keep.
  It also fails closed on a part with no string form, which is the behaviour we
  want whichever way the endpoint currently leans. Removing it on the strength
  of one dated probe would be the assumption this tick exists to stop making.

## 2. Price

Workers AI bills **Neurons**. The model list publishes USD per million tokens
and every response carries `usage.neurons`, so the conversion is *proved* here
rather than quoted: across 16 models, USD predicted from the published
per-token prices matched `neurons × $0.011 / 1000` to within **0.66%** worst
case (and exactly, to nine decimal places, on ten of them). The residual is the
published prices being rounded to 3–4 significant figures; Neurons are the
ground truth. **`NEURON_USD_PER_1000 = 0.011` is confirmed against the live
API, not remembered.**

### Cost per completed tick, not per million tokens

The headline rate is close to useless here, for three measured reasons.

**A wave is 98.6% input tokens.** The profile is `run_62c289d1` — a real
factory run, one orchestrator plus seven implementer subagents, 230 calls,
reconciled against the Workers AI dashboard (`repo-wiki/cloud-factory-billing.md`):
3,799,364 uncached input + 7,154,176 cached input + 157,709 output, seven ticks
completed. Every model in the table is priced against that same profile.

**A cached input token costs a thirtieth of an uncached one** — where the model
delivers one. That single ratio reorders the table against the rate card:
`deepseek-v4-flash` lists at **2.2× `gpt-oss-20b`'s input rate** ($0.44/M
against $0.20/M) and still comes out **14% cheaper per tick**, because its
7.15M cached input tokens bill at $0.014/M while gpt-oss-20b's bill at $0.20/M.
Between two models that both fail to cache the ranking collapses back onto the
rate card — `glm-5.2` costs 22× `glm-4.7-flash` per tick on a 23× rate
difference — which is precisely the point: the cache is the only thing that
breaks the correlation, and it is invisible in a price list.

**Tokenizers are not equal.** On one byte-identical fixture the same text costs
22,434 tokens on kimi, 22,505 on deepseek, 23,189 on gpt-oss-120b and **27,855
on qwen3.8-27b** — a 23.8% tokenizer tax before a single price is compared. The
cost model applies each model's measured ratio, relative to the model the wave
profile was measured on.

Consistency check: the model prices `deepseek-v4-pro-0813` at **$5.955** for
that wave, against the **$5.95** the run was actually billed. That is arithmetic
reproducing a reconciled invoice, not an independent validation — the profile
came from that run — but it means the table's other rows are being computed the
same way the real bill was.

### The finding that decides the headline question

Six models publish a `per M cached input tokens` price. **Publishing one is not
delivering one.**

Post-warm hits below are aggregated over every probe round run on 2026-08-21 —
six rounds, of which the committed raw file is the last. Two of the rounds were
run without the `x-session-affinity` header as a control.

| Model | Publishes cached price | Post-warm hits, all rounds | Verdict |
|---|:---:|:---:|---|
| `deepseek-v4-flash-0731` | $0.014 | **23/23** | Delivers, reliably |
| `kimi-k2.7-code` | $0.19 | 23/23 | Delivers, reliably |
| `kimi-k2.6` | $0.16 | 18/18 | Delivers, reliably |
| `deepseek-v4-pro-0813` | $0.044 | 12/24 | Delivers, intermittently |
| `glm-5.2` | $0.26 | 5/24 | Delivers, rarely |
| **`qwen3.8-27b`** | **$0.05** | **0/27** | **Never — 27 post-warm calls, with and without `x-session-affinity`** |
| `gpt-oss-120b` *(incumbent)* | none | 0/18 | Publishes no cached rate and bills none |

`qwen3.8-27b` is the operator's named candidate and it is the one that fails
hardest. It advertises a cached-input rate 9× cheaper than its own list rate
($0.05/M against $0.45/M) and never once billed at it. Add the 23.8% tokenizer
tax and a $3.20/M output rate, and the model that *looks* mid-priced at $0.45/M
input costs **$0.96 per tick — 3.4× deepseek-v4-flash** — while scoring 11
DeepSWE points below it.

Two cautions on reading this table. Affinity buys statistical routing, not
stickiness (`repo-wiki/cloud-factory-billing.md`), so a hit rate is a
distribution, not a switch — but 0 of 27 is not a distribution. And caching
warms up: the first repeat of a prefix is always billed cold, which is why the
harness refuses a single-call probe.

## 3. Capability

Scores are carried in the harness with a URL and a date because the Cloudflare
API does not serve them. **Read the two columns as separate scales.** DeepSWE
and SWE-bench Verified are different benchmarks; a 2025 model-card SWE-bench
number and a 2026 DeepSWE number are not comparable, and nothing here averages
them. Even within SWE-bench Verified the harness dominates — the same
DeepSeek-V4-Pro checkpoint reads 80.6% on DeepSeek's own report and 96.4% on
Vals' neutral bash-only harness.

Where two DeepSWE boards overlap they agree within rounding (V4 Pro 62.8 vs
63.0; GLM-5.2 43.8 vs 44.0), which is why both are cited.

| Model | DeepSWE | SWE-bench family | Served on Workers AI |
|---|---:|---|:---:|
| Claude Opus 5 (BYOK) | **74.0** ±4 | 97.0 Verified (Vals) | no |
| Kimi K3 (BYOK) | 69.0 | — | **no** |
| `deepseek-v4-pro-0813` | **63.0** ±6 | 96.4 Verified (Vals) | **yes** |
| `deepseek-v4-flash-0731` | 53.3 | — | **yes** |
| `glm-5.2` | 43.8 | — | **yes** |
| `qwen3.8-27b` | 42.2 | 61.7 SWE-bench Pro | **yes** |
| `kimi-k2.7-code` | 30.5 | — | **yes** |
| `glm-4.7-flash` | — | 59.2 Verified (vendor) | **yes** |
| `gpt-oss-120b` *(incumbent)* | **none published** | 62.4 Verified (2025 model card) | **yes** |

Three things this table settles:

- **Kimi K3 is not served.** The tick asked for it "if and when Workers AI
  serves it"; as of 2026-08-21 it does not. What the account serves is the
  K2.x line, which is simultaneously the *weakest* graded model in the
  inventory (30.5) and among the *most expensive* per tick ($0.80). Kimi is out
  on both axes, and it should be re-examined the day K3 appears.
- **Qwen3.8-27B is not Qwen3.8 Max.** Public boards list Qwen3.8 Max at 57.5;
  Workers AI serves the **27B**, whose own model card reads **42.2**. Reading
  the family's headline number onto the served checkpoint would overstate it by
  15 points.
- **The incumbent has no score on the benchmark family that matters.** No 2026
  DeepSWE board searched carries `gpt-oss-120b`, and BenchLM's own profile for
  it shows two of 402 benchmark slots filled, neither a SWE-bench variant. Its
  62.4% SWE-bench Verified is a year old on a pre-agentic harness. The
  placeholder was never measured for this job, which is the whole reason this
  tick exists.

For the orchestrator role specifically, the relevant capability is **driving
tool calls reliably over a long loop**, not one-shot patch quality. Nothing in
the public boards measures that directly. The strongest evidence available is
in-harness: the one reconciled production run drove 230 calls across eight
conversations on `deepseek-v4-pro-0813` without a routing failure. That is one
run, and it is the strongest evidence there is — which is itself worth stating
plainly rather than dressing up.

## The recommendation, per role and tier

The routing vocabulary is the existing one (`skills/ticks/references/runners-config.md`):
roles `plan`, `scout`, `implement`, `review`, `closeout` plus the
`orchestrator` cell, tiers `economy`, `balanced`, `strong`, `frontier`. These
recommendations are also machine-readable in the raw file, and the guard test
fails if a cell here disagrees with one there.

| Role | Tier | Model | Provider |
|---|---|---|---|
| `orchestrator` | `frontier` | `@cf/deepseek-ai/deepseek-v4-pro-0813` | workers-ai |
| `orchestrator` | `strong` | `byok:anthropic/claude-opus-5` | **BYOK** |
| `implement` | `economy` | `@cf/zai-org/glm-4.7-flash` | workers-ai |
| `implement` | `balanced` | `@cf/deepseek-ai/deepseek-v4-flash-0731` | workers-ai |
| `implement` | `strong` | `@cf/deepseek-ai/deepseek-v4-pro-0813` | workers-ai |
| `implement` | `frontier` | `byok:anthropic/claude-opus-5` | **BYOK** |
| `plan` | `frontier` | `@cf/deepseek-ai/deepseek-v4-pro-0813` | workers-ai |
| `scout` | `economy` | `@cf/deepseek-ai/deepseek-v4-flash-0731` | workers-ai |
| `review` | `frontier` | `byok:anthropic/claude-opus-5` | **BYOK** |
| `closeout` | `strong` | `byok:anthropic/claude-opus-5` | **BYOK** |

**`orchestrator` — `deepseek-v4-pro-0813`.** It is the best-scoring model the
account serves (63.0 DeepSWE), it carries a 1M-token context that a long skill
loop will use, it drove tool calls correctly on every probe, and it is what the
only reconciled production run actually ran on. It is *not* also the implement
default: its cache is intermittent (12 hits in 24 post-warm calls), which is
affordable once per run on the orchestrator and expensive multiplied across a
fan-out.

**`implement` / `balanced` — `deepseek-v4-flash-0731`.** The cost-per-tick
winner among models with a credible coding score, and one of three whose cache
fired on every post-warm call in every round — the other two being the Kimi
pair, which cost 2.8× more per tick for a DeepSWE score 23 points lower. 1.31M
context, 53.3 DeepSWE, $0.28/tick — half the incumbent's price, for a model the
incumbent has no published score to be compared against.

**`implement` / `economy` — `glm-4.7-flash`.** Cheapest tool-capable model with
a credible coding number (59.2 vendor-reported SWE-bench Verified) at
$0.0605/M input. It caches nothing, but at a seventh of flash's input rate its
uncached token is still cheaper than flash's uncached one. Use it where a retry
costs less than a better model — mechanical edits, doc touch-ups, renames.
`granite-4.0-h-micro` is cheaper still and is **excluded**: its tool arguments
are malformed on a coin flip, and a harness cannot retry its way out of that.

**`plan` / `scout`.** Planning and scouting are long-context reading with few
tool calls — the shape where the million-token windows and the cheap
cached-input tariff pay most and where the capability gap matters least. Plan
on `v4-pro` for the judgement; scout on `v4-flash` because scouting is
disposable and read-heavy.

## Where BYOK stays

**A Workers AI model is not good enough for `review`, `closeout`, or the
`frontier` implement tier.** Stating that plainly is part of the deliverable:
the design expects a mixed routing, and a recommendation that routed everything
to Workers AI to make the credit story tidy would be worse than none.

- **`review` — BYOK frontier.** Review exists to catch what the implementer got
  wrong. A reviewer at or below the implementer's capability shares its blind
  spots and turns the gate into a rubber stamp. The best model the account
  serves is 11 DeepSWE points below the frontier; on the review cell that gap
  is the product.
- **`closeout` — BYOK frontier.** Close-out writes the epic's durable record
  and the `learnings.md` entries the next epic reads. A cheap mistake there is
  paid for repeatedly by every run after it.
- **`implement` / `frontier` — BYOK.** The tier name is a promise. Leaving a
  Workers AI id in that cell because it is the best Workers AI has would make
  the tier vocabulary lie.
- **`orchestrator` / `strong` — BYOK, as an escape hatch.** For a run that must
  not fail on tool-use reliability, the frontier gap is worth cash: a wedged
  orchestrator wastes every implementer under it, so its failure is the most
  expensive one in the system.

The honest economic frame: Workers AI inference draws the same prepaid
Cloudflare pool as compute and storage, so for an operator holding credit these
cells are effectively pre-paid, while the BYOK cells are cash. That is a real
advantage and it is not a reason to route a cell that needs frontier capability
to a model that does not have it. The mixed table is the point — route the
volume to the credit and the judgement to the frontier.

## What is not measured here

- **Nothing was run end-to-end.** These are catalog reads, single-call
  compatibility probes, and a synthetic prefix-cache series. Cost per tick is a
  *model* over a real token profile, not seven ticks re-run on sixteen models.
  The next step, if the recommendation is doubted, is to run one real epic on
  `v4-flash` and compare its gateway-log cost against this table.
- **Per-model tool-use reliability over a long loop** is the property the
  orchestrator cell most depends on, and one probe call per model does not
  measure it. `granite` is proof the property is real and that a single probe
  can only catch the loudest failures.
- **These probes went direct to `api.cloudflare.com`, not through the factory
  gateway.** The gateway adds `x-session-affinity` and `cf-aig-metadata` and
  normalises content parts; none of that should change a price, but it has not
  been measured on this path.
- **The scores are quoted, not reproduced.** Every row carries its URL and its
  date. Where a number could not be sourced the cell says so rather than
  guessing — that is why the incumbent's DeepSWE cell reads "none published".

## Applying it

This document does not change any routing. `[orchestrator].model` and the
`[roles.*]` tables live in `.tick/runners.toml`, which is tracker state the
orchestrator owns. The change this recommends is:

```toml
[orchestrator]
model = "workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813"

[roles.implement]
kind = "pi"
model = "workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731"

[roles.implement.tiers.economy]
model = "workers-ai/@cf/zai-org/glm-4.7-flash"

[roles.implement.tiers.strong]
model = "workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813"
```

with `[roles.review]` and `[roles.closeout]` left on their BYOK frontier
models. Note that `[roles.review]` and `[roles.closeout]` must be written
explicitly — a gate whose role has no table of its own blocks rather than
falling back to the implement model, which is the behaviour that stops a final
review from quietly running on the economy tier.
