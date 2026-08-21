# Choosing a model for the factory

Measured on the operator's own account, 2026-08-21 (ticks `y45`, `fxf`, `l8z`).
Re-runnable: `scripts/bench_workers_ai_models.py`, raw output under
`benchmarks/workers-ai-models/`. The full write-up is
`docs/workers-ai-model-selection.md`; this page is the part that generalises.

## Publishing a cached rate is not delivering one

This is the finding worth carrying to any other project. Six tool-capable
models on this account all advertise a `per M cached input tokens` price.
Probed with a **byte-identical 22.5k-token prefix over six rounds**, they do
not behave alike, and nothing in the price list distinguishes them:

| Model | Cached rate | Post-warm hits |
|---|---:|:---:|
| `deepseek-v4-flash-0731` | $0.014 | 23/23 |
| `kimi-k2.7-code` | $0.19 | 23/23 |
| `kimi-k2.6` | $0.16 | 18/18 |
| `deepseek-v4-pro-0813` | $0.044 | 12/24 |
| `glm-5.2` | $0.26 | 5/24 |
| `qwen3.8-27b` | $0.05 | **0/27** |

For an agentic loop — where the prompt grows by appending and the first tens of
thousands of tokens never change — a model that does not cache is disqualified
regardless of its benchmark score, because the loop re-buys its whole context
on every call. `qwen3.8-27b` looked like a strong candidate on price and score
and is unusable here for that reason alone.

**Rule:** probe the cache before selecting on price or leaderboard. A published
cached rate is a tariff, not a promise.

## Cache behaviour has three separate causes, and they were confused twice

Debugging a low hit rate means separating:

1. **No affinity.** Prefix caching lives on a model instance; without
   `x-session-affinity` a run's calls scatter and every one meets a cold
   prefix. This was `l8z`: 892 calls, 46M input tokens, **zero** cache hits.
2. **A varying prefix.** One token different invalidates from that point on.
   Worth pinning with a test on whatever the factory injects at the head of the
   message array — but note what the *harness* puts in front of that is often
   outside a repo's control.
3. **The model, or its instance.** Even with affinity set and a byte-identical
   prefix, hits are not guaranteed — see the table above, and note that a miss
   is usually a *floor* rather than a zero (the call is billed a cached count
   equal to an early snapshot of the conversation, i.e. it reached an instance
   that saw it once and never since).

`fxf` concluded from run data that residual misses were instance-side;
`y45` then showed the same model delivers only 12/24 post-warm hits in a
controlled probe. Both were right within their evidence. Do not stop at the
first plausible cause.

Two things measurement *ruled out*, against expectation: concurrent
conversations do not interfere (fan-out cached **67.9%** against **52.4%** for
a lone orchestrator), and caching **warms up** — the first repeat of a prefix
always bills zero, so short conversations may never cache at all.

## Cost per completed tick, not per million tokens

Token prices do not rank models the way the work does: a cheaper model that
caches poorly, or needs more turns, loses. Rank on cost per *finished* tick.
Measured here: `implement`/`balanced` at **$0.28/tick** on
`deepseek-v4-flash`, `economy` at **$0.11/tick** on `glm-4.7-flash`.

And keep BYOK where the platform genuinely falls short — on this account
nothing was good enough for `review` and `closeout`. See
[[cloud-factory-billing]] for which wallet each choice spends from.
