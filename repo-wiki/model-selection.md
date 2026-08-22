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

## Cost per completed tick, measured on real ticks (2026-08-22)

The `$0.28/tick` figure above came from benchmark-shaped work. The first cloud
runs whose substrate actually worked put `deepseek-v4-flash` on three real ticks
from this repo, with a 90-minute budget each:

| Tick | What it is | Outcome |
|---|---|---|
| `5jo` | qualify herdr agent names per repo | **finished**, correct implementation |
| `201` | scrolling in a bubbletea TUI | killed at the bound, 0 commits |
| `5qj` | workerd lifecycle noise in vitest | killed at the bound, 4 paths salvaged |

**One in three.** Flash ground through 90 minutes of 94–99%-cached calls on the
other two without converging. So the honest number is not `$0.28/tick` — it is
`$0.28` times however many attempts convergence takes, and for a tick flash
cannot finish, the cost per completed tick is **unbounded**.

### The rule this produces

**A model that does not converge costs 100% of its tokens for 0% of the work.**
That comparison dominates any per-token ranking. Rank on cost per *finished*
tick and count the failures in the denominator, or the cheap model wins on paper
while losing money.

The `WORKER_DEFAULT_MODEL` therefore moved to `deepseek-v4-pro-0813` (tick
`1cd`), which `y45` had already placed at `implement.strong`. Pro is roughly
2.4x flash per task and delivers about half its post-warm cache opportunities
against flash's 23/23 — so on a long agentic run the real multiple is worse than
the headline. It is still the cheaper choice for work flash cannot finish.

### What is still owed

This is a default, not a routing decision. `[roles.implement].tiers` already
expresses per-tick tiering for LOCAL workers; the cloud path has no plumbing for
it, so every container gets the same model whether its tick is a one-line fix or
a TUI rewrite. Per-tick tier selection on the cloud substrate is the Phase 3
candidate that would make the flash rung pay for itself again.
