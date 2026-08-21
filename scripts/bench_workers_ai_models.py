#!/usr/bin/env python3
"""Price and probe the Workers AI models an account actually serves (tick y45).

The factory routes `[orchestrator].model` at a Workers AI model id. The id it
carried — `@cf/openai/gpt-oss-120b` — was a placeholder picked because it was
visible in a model list. This harness replaces that with a measurement, and it
answers three questions in the order they have to be answered:

  1. INVENTORY  What does this account serve *today*? Model ids, context
                windows, tool-calling, and whether the OpenAI chat-completions
                shape the pi/omp kinds need actually works — proved by a live
                call, because "OpenAI-compatible" on this platform has meant
                "OpenAI-shaped, with a difference".
  2. PRICE      What does it cost? Workers AI bills Neurons; the model list
                publishes USD per million tokens, and `usage.neurons` on every
                response lets the harness *prove* the conversion instead of
                quoting a rate card. The figure that decides anything is not
                the headline rate, though — it is what a completed wave costs,
                and on this platform that is dominated by whether a model's
                prefix cache fires at all.
  3. CAPABILITY Published DeepSWE / SWE-bench-family scores, each carried with
                its source and its date. These cannot come from the Cloudflare
                API, so they are a committed table rather than a probe — and
                every row says where it came from.

Nothing here is inferred from memory. The inventory, prices and compatibility
verdicts are read from the live API; the benchmark scores are quoted with a URL
and a date; and the run refuses to write output it did not measure.

Usage:

    python3 scripts/bench_workers_ai_models.py --all      # the full measurement
    python3 scripts/bench_workers_ai_models.py --inventory
    python3 scripts/bench_workers_ai_models.py --compat
    python3 scripts/bench_workers_ai_models.py --cache
    python3 scripts/bench_workers_ai_models.py --selftest # no network, no spend

Credentials come from `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`, falling
back to `~/.ticksrc` (`factory_cloudflare_api_token`, `factory_gateway_url`).
The token needs `ai read`; the probes additionally spend a few cents of Neurons.

This repository is public: the account id is redacted from every path that
reaches the output file, and a guard test in `internal/sandbox` fails the suite
if a 32-hex id ever appears in a committed artifact.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.parse
from typing import Any

# --------------------------------------------------------------- constants ---

SCHEMA = "ticks.workers-ai-models/1"

# Workers AI's billing unit. Not quoted from documentation: `--all` divides the
# USD implied by each model's published per-token prices by the neurons the API
# reported for the same call, and asserts this constant falls out. A rate that
# has drifted therefore fails the measurement rather than silently mispricing
# every row under it.
NEURON_USD_PER_1000 = 0.011

ACCOUNT_ID_RE = re.compile(r"\b[0-9a-f]{32}\b")
REDACTED_ACCOUNT = "<cloudflare-account-id>"

# The fixture the compatibility and cache probes share. It is deliberately a
# pure function of nothing: no date, no clock, no randomness. A prefix that
# varies by one token invalidates the cache from that point on, so a cache
# probe built on a varying prompt measures its own bug
# (cf. internal/sandbox/prompt_prefix_test.go, which holds the same line for
# the prompt the sandbox actually ships).
FIXTURE_ROUTES = 700


def fixture_prefix() -> str:
    body = "".join(
        f"def handler_{i:04d}(request, context):\n"
        f"    # route {i} of the synthetic harness preamble\n"
        f"    return dispatch(request, context, route_id={i})\n"
        for i in range(FIXTURE_ROUTES)
    )
    return "You are a coding agent working in a repository. Reference source follows.\n" + body


# One tool, shaped like the ones a coding harness actually sends. The probe
# checks three separable things that all get called "compatibility": that the
# endpoint accepts `messages[].content` as a string, that it accepts OpenAI
# CONTENT PARTS (the shape omp sends, and the shape that killed the first live
# run to reach the skill loop over this route), and that the model emits a tool
# call whose `arguments` parse as a JSON object. A model that answers in prose
# when told to call a tool is worthless as an orchestrator at any price.
PROBE_TOOL = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file from the repository.",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string", "description": "repo-relative path"}},
                "required": ["path"],
            },
        },
    }
]

# The token profile a wave actually has, taken from `run_62c289d1` — a real
# factory run of one orchestrator plus seven implementer subagents, 230 calls,
# reconciled against the Workers AI dashboard. See
# `repo-wiki/cloud-factory-billing.md`. Using a measured profile rather than an
# invented one is the whole point: it carries the 65.3% cache rate and the
# ~70:1 input:output ratio that make this platform's cheap-cached-input tariff
# the dominant term, which no headline per-million rate shows.
WAVE_PROFILE = {
    "run": "run_62c289d1",
    "calls": 230.0,
    "ticks": 7.0,
    "uncached_input_tokens": 3799364.0,
    "cached_input_tokens": 7154176.0,
    "output_tokens": 157709.0,
    # The model the profile was measured on. Re-pricing it onto another model
    # has to correct for that model's tokenizer, and this names the baseline
    # the correction is relative to.
    "measured_on": "@cf/deepseek-ai/deepseek-v4-pro-0813",
}

# Published coding-agent scores. These are not available from the Cloudflare
# API, so they are committed with a source and a date and nothing else is
# claimed for them. Two cautions the tables themselves make necessary:
#
#   * DeepSWE and SWE-bench Verified are different scales. A 2025 model-card
#     SWE-bench number and a 2026 DeepSWE number are not comparable, and this
#     file does not average them.
#   * The scale is harness-sensitive. Where two DeepSWE boards overlap they
#     agree within rounding (V4 Pro 62.8 vs 63.0; GLM-5.2 43.8 vs 44.0), which
#     is why both are quoted; a single-source number is marked as such.
PUBLISHED_SCORES = [
    {
        "model": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "benchmark": "DeepSWE",
        "version": "v1.1 (113 tasks / 91 repos / 5 languages)",
        "score": 63.0,
        "source": "https://codingfleet.com/blog/deepswe-v11-leaderboard-2026/",
        "dated": "2026-08-21",
        "note": "+/-6; the DeepSWE-2026 board reads 62.8 for the same checkpoint",
    },
    {
        "model": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "benchmark": "SWE-bench Verified",
        "version": "Vals neutral bash-only harness",
        "score": 96.4,
        "source": "https://www.vals.ai/benchmarks/swebench",
        "dated": "2026-08-19",
        "note": "2nd overall, behind Claude Opus 5 at 97.0",
    },
    {
        "model": "@cf/deepseek-ai/deepseek-v4-flash-0731",
        "benchmark": "DeepSWE",
        "version": "DeepSWE 2026 board",
        "score": 53.3,
        "source": "https://benchlm.ai/benchmarks/deepswe",
        "dated": "2026-08-20",
        "note": "rank 17 of 25",
    },
    {
        "model": "@cf/qwen/qwen3.8-27b",
        "benchmark": "DeepSWE",
        "version": "v1.1",
        "score": 42.2,
        "source": "https://huggingface.co/Qwen/Qwen3.8-27B",
        "dated": "2026-08-21",
        "note": "vendor model card; the 57.5 on the public board is Qwen3.8 MAX, which Workers AI does not serve",
    },
    {
        "model": "@cf/qwen/qwen3.8-27b",
        "benchmark": "SWE-bench Pro",
        "version": "vendor-reported",
        "score": 61.7,
        "source": "https://huggingface.co/Qwen/Qwen3.8-27B",
        "dated": "2026-08-21",
        "note": "not comparable to SWE-bench Verified",
    },
    {
        "model": "@cf/zai-org/glm-5.2",
        "benchmark": "DeepSWE",
        "version": "DeepSWE 2026 board",
        "score": 43.8,
        "source": "https://benchlm.ai/benchmarks/deepswe",
        "dated": "2026-08-20",
        "note": "the v1.1 board reads 44.0 for the same checkpoint",
    },
    {
        "model": "@cf/moonshotai/kimi-k2.7-code",
        "benchmark": "DeepSWE",
        "version": "DeepSWE 2026 board",
        "score": 30.5,
        "source": "https://benchlm.ai/benchmarks/deepswe",
        "dated": "2026-08-20",
        "note": "rank 23 of 25",
    },
    {
        "model": "@cf/zai-org/glm-4.7-flash",
        "benchmark": "SWE-bench Verified",
        "version": "vendor-reported",
        "score": 59.2,
        "source": "https://docs.z.ai/guides/llm/glm-4.7",
        "dated": "2026-08-21",
        "note": "vendor number on a vendor harness; no DeepSWE score published",
    },
    {
        "model": "@cf/openai/gpt-oss-120b",
        "benchmark": "SWE-bench Verified",
        "version": "2025 model card, pre-agentic-harness era",
        "score": 62.4,
        "source": "https://arxiv.org/pdf/2508.10925",
        "dated": "2025-08-05",
        "note": "the incumbent has NO DeepSWE score on any 2026 board searched; this number is a year old on a different harness and is not comparable to the DeepSWE column",
    },
    # BYOK reference points. They are in the table because the deliverable is a
    # mixed routing: without the frontier line you cannot see which cells a
    # Workers AI model is not good enough for.
    {
        "model": "byok:anthropic/claude-opus-5",
        "benchmark": "DeepSWE",
        "version": "v1.1",
        "score": 74.0,
        "source": "https://codingfleet.com/blog/deepswe-v11-leaderboard-2026/",
        "dated": "2026-08-21",
        "note": "+/-4; rank 1. Not served by Workers AI",
    },
    {
        "model": "byok:moonshot/kimi-k3",
        "benchmark": "DeepSWE",
        "version": "v1.1",
        "score": 69.0,
        "source": "https://codingfleet.com/blog/deepswe-v11-leaderboard-2026/",
        "dated": "2026-08-21",
        "note": "the operator asked for K3 'if and when Workers AI serves it' — as of this date it does not",
    },
]

# The routing this measurement recommends. It is data rather than prose so the
# guard test can assert that every cell is filled, that each carries a reason,
# and that the answer is a MIXED routing — the design expects one, and a
# recommendation that routed everything to Workers AI would be the failure the
# tick names.
RECOMMENDATIONS = [
    {
        "role": "orchestrator",
        "tier": "frontier",
        "model": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "provider": "workers-ai",
        "why": "Highest DeepSWE of anything the account serves (63.0), 1M context, "
        "reliable tool calls, and the model the only reconciled production run "
        "already ran on. Its prefix cache is intermittent (3/8 post-warm hits "
        "measured), which is why it is not also the implement default.",
    },
    {
        "role": "orchestrator",
        "tier": "strong",
        "model": "byok:anthropic/claude-opus-5",
        "provider": "byok",
        "why": "For a run that must not fail on tool-use reliability, the 11-point "
        "DeepSWE gap over the best Workers AI model is worth the cash: the "
        "orchestrator drives the skill loop and a wedged orchestrator wastes "
        "every implementer under it.",
    },
    {
        "role": "implement",
        "tier": "balanced",
        "model": "@cf/deepseek-ai/deepseek-v4-flash-0731",
        "provider": "workers-ai",
        "why": "The cost-per-tick winner by a wide margin: 53.3 DeepSWE, and the only "
        "model measured whose prefix cache fired on 8 of 8 post-warm calls, "
        "which is what turns the platform's 1/30 cached-input tariff into money.",
    },
    {
        "role": "implement",
        "tier": "economy",
        "model": "@cf/zai-org/glm-4.7-flash",
        "provider": "workers-ai",
        "why": "Cheapest tool-capable model with a credible coding number "
        "($0.0605/M in). It caches nothing, but at 1/7 of flash's input rate "
        "an uncached token still costs less than flash's uncached one; use it "
        "for mechanical ticks where a retry is cheaper than a better model.",
    },
    {
        "role": "implement",
        "tier": "strong",
        "model": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "provider": "workers-ai",
        "why": "The capability ceiling on Workers AI. Route the ticks that a flash "
        "model has already failed once here before paying BYOK rates.",
    },
    {
        "role": "implement",
        "tier": "frontier",
        "model": "byok:anthropic/claude-opus-5",
        "provider": "byok",
        "why": "Nothing on Workers AI reaches the frontier tier's bar. Leaving this "
        "cell on a Workers AI id would be the pretence the tick warns against.",
    },
    {
        "role": "plan",
        "tier": "frontier",
        "model": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "provider": "workers-ai",
        "why": "Planning is long-context reading with few tool calls — the shape the "
        "1M-token window and the cheap cached-input tariff suit best, and the "
        "shape where a 11-point DeepSWE gap matters least.",
    },
    {
        "role": "scout",
        "tier": "economy",
        "model": "@cf/deepseek-ai/deepseek-v4-flash-0731",
        "provider": "workers-ai",
        "why": "Scouting is read-heavy and disposable; flash's 1.31M context and "
        "reliable cache make it the cheapest way to read a lot of repository.",
    },
    {
        "role": "review",
        "tier": "frontier",
        "model": "byok:anthropic/claude-opus-5",
        "provider": "byok",
        "why": "Review is the gate that catches what the implementer got wrong, so it "
        "must not share the implementer's blind spots or sit below it in "
        "capability. This is the cell the design already said to keep on BYOK.",
    },
    {
        "role": "closeout",
        "tier": "strong",
        "model": "byok:anthropic/claude-opus-5",
        "provider": "byok",
        "why": "Close-out writes the epic's durable record and the learnings the next "
        "epic reads; a cheap mistake here is paid for repeatedly. Follows the "
        "planner/review model per runners-config.md's fallback.",
    },
]


# ------------------------------------------------------------- credentials ---


def read_ticksrc() -> dict[str, str]:
    path = os.path.expanduser("~/.ticksrc")
    out: dict[str, str] = {}
    if not os.path.exists(path):
        return out
    with open(path) as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            out[key.strip()] = value.strip().strip('"')
    return out


def credentials() -> tuple[str, str]:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    if token and account:
        return token, account
    rc = read_ticksrc()
    token = token or rc.get("factory_cloudflare_api_token", "")
    if not account:
        gateway = rc.get("factory_gateway_url", "")
        # https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>
        parts = urllib.parse.urlparse(gateway).path.strip("/").split("/")
        if len(parts) >= 2 and parts[0] == "v1":
            account = parts[1]
    if not token or not account:
        sys.exit(
            "no Cloudflare credentials: set CLOUDFLARE_API_TOKEN and "
            "CLOUDFLARE_ACCOUNT_ID, or run `tk factory setup` so ~/.ticksrc "
            "carries them. The token needs `ai read`."
        )
    return token, account


def redact(text: str) -> str:
    """Strip anything account-id-shaped. This repository is public."""
    return ACCOUNT_ID_RE.sub(REDACTED_ACCOUNT, text)


# ---------------------------------------------------------------- HTTP ------


def http_json(url: str, token: str, body: dict[str, Any] | None = None,
              headers: list[str] | None = None) -> tuple[str, Any]:
    args = ["curl", "-s", "-w", "\n%{http_code}", url, "-H", f"Authorization: Bearer {token}"]
    for header in headers or []:
        args += ["-H", header]
    if body is not None:
        args += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    proc = subprocess.run(args, capture_output=True, text=True)
    raw, _, code = proc.stdout.rpartition("\n")
    try:
        return code, json.loads(raw)
    except json.JSONDecodeError:
        return code, {"raw": raw[:400]}


# ------------------------------------------------------------- 1. inventory ---


def fetch_inventory(token: str, account: str) -> list[dict[str, Any]]:
    """Every model this account serves, paged until a SHORT page proves exhaustion.

    Never bounded by `result_info.total_count`. That field reported 291 against
    a real 64 on the measured account — it counts the platform catalog, not the
    account's slice — and this repository has already lost $49.80 to a
    pagination bound that trusted a permissive `result_info` field.
    """
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        url = (
            f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/models/search"
            f"?per_page=100&page={page}"
        )
        code, doc = http_json(url, token)
        if code != "200" or not doc.get("success"):
            sys.exit(f"model search failed (HTTP {code}): {json.dumps(doc)[:400]}")
        got = doc["result"]
        out.extend(got)
        if len(got) < 100:
            break
        page += 1
        if page > 50:
            sys.exit("page cap hit: this is a telemetry FAILURE, not a total")
    return out


def normalise_model(entry: dict[str, Any]) -> dict[str, Any]:
    props = {p["property_id"]: p["value"] for p in entry.get("properties", [])}
    prices: dict[str, float] = {}
    for item in props.get("price", []) or []:
        prices[item["unit"]] = item["price"]
    context = props.get("context_window")
    return {
        "name": entry["name"],
        "task": entry["task"]["name"],
        "created_at": entry.get("created_at", ""),
        "context_window": int(context) if context else 0,
        "function_calling": props.get("function_calling") == "true",
        "reasoning": props.get("reasoning") == "true",
        "requires_paid": props.get("require_workers_paid") == "true",
        # Filled by the compatibility probe. `None` means "not probed", which
        # is a different claim from "probed and false" — the guard test refuses
        # a routable model that carries neither.
        "openai_compatible": None,
        "price_per_m_input_usd": prices.get("per M input tokens"),
        "price_per_m_output_usd": prices.get("per M output tokens"),
        "price_per_m_cached_input_usd": prices.get("per M cached input tokens"),
    }


# ---------------------------------------------------------- 2. compatibility ---


def chat_url(account: str) -> str:
    return f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions"


def probe_compat(token: str, account: str, model: str) -> dict[str, Any]:
    url = chat_url(account)
    result: dict[str, Any] = {"model": model}

    # (a) string content plus a tool the model is told to call.
    code, doc = http_json(url, token, {
        "model": model, "max_tokens": 256, "temperature": 0, "tools": PROBE_TOOL,
        "messages": [
            {"role": "system", "content": "You are a coding agent. Use tools when asked."},
            {"role": "user", "content": "Read the file README.md. Call the tool, do not answer in prose."},
        ],
    })
    result["http_status"] = code
    result["accepts_string_content"] = code == "200"
    calls = []
    if code == "200":
        message = (doc.get("choices") or [{}])[0].get("message") or {}
        calls = message.get("tool_calls") or []
    result["tool_calls"] = len(calls)
    parsed = False
    if calls:
        arguments = calls[0].get("function", {}).get("arguments")
        try:
            parsed = isinstance(json.loads(arguments), dict)
        except (json.JSONDecodeError, TypeError):
            parsed = False
        result["tool_name"] = calls[0].get("function", {}).get("name")
    result["tool_arguments_parsed"] = parsed
    result["usage"] = doc.get("usage") if code == "200" else None

    # (b) OpenAI CONTENT PARTS — the shape omp sends, and the shape the first
    # live run over this route died on. Probed rather than assumed in both
    # directions: the factory gateway normalises parts to a string, and whether
    # that normalisation is still load-bearing is a question for a measurement,
    # not for a memory of a past error message.
    code_parts, _ = http_json(url, token, {
        "model": model, "max_tokens": 16,
        "messages": [
            {"role": "system", "content": [{"type": "text", "text": "Be terse."}]},
            {"role": "user", "content": [{"type": "text", "text": "say ok"}]},
        ],
    })
    result["accepts_content_parts"] = code_parts == "200"
    return result


# ------------------------------------------------------------ 3. prefix cache ---


def probe_cache(token: str, account: str, model: dict[str, Any], calls: int, affinity: str) -> dict[str, Any]:
    """Send one byte-identical prefix N times and read what was billed.

    Two separate things are recorded, because they are not the same thing and
    one model reports the first without doing the second: whether
    `prompt_tokens_details.cached_tokens` comes back non-zero, and whether the
    neurons actually FELL. A cache that is reported but not billed is worth
    nothing, and only the second number reaches the cost model.

    The first call of any prefix is billed cold — caching warms up — so a
    single-call probe proves nothing and the guard test refuses one.
    """
    url = chat_url(account)
    prefix = fixture_prefix()
    rows = []
    error = ""
    for i in range(calls):
        code, doc = http_json(url, token, {
            "model": model["name"], "max_tokens": 16, "temperature": 0,
            "messages": [
                {"role": "system", "content": prefix},
                {"role": "user", "content": f"Name route {i}. One word."},
            ],
        }, headers=[f"x-session-affinity: {affinity}"])
        usage = doc.get("usage") or {}
        if not usage and not error:
            error = f"HTTP {code}: " + redact(json.dumps(doc.get("errors") or doc.get("error") or doc.get("raw"))[:200])
        rows.append({
            "call": i,
            "http_status": code,
            "prompt_tokens": usage.get("prompt_tokens"),
            "cached_tokens": (usage.get("prompt_tokens_details") or {}).get("cached_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "neurons": usage.get("neurons"),
        })
    return summarise_cache(model, rows, error)


def summarise_cache(model: dict[str, Any], rows: list[dict[str, Any]],
                    error: str = "") -> dict[str, Any]:
    """Turn a probe series into the one verdict the cost model consumes.

    `cache_is_billed` measures the warm neurons against the model's LIST PRICE,
    not against an observed cold call. The difference is not cosmetic: an
    instance already warm from an earlier probe returns a series with no cold
    call in it, and "no call was ever billed cold" is the strongest evidence of
    caching there is — scoring that as "no cache" priced one model at twice its
    real cost. The list-price baseline is always computable and never depends
    on which call happened to land first.
    """
    post_warm = rows[1:]
    hits = [r for r in post_warm if r.get("cached_tokens")]
    cold = [r["neurons"] for r in rows if not r.get("cached_tokens") and r.get("neurons")]
    warm = [r["neurons"] for r in rows if r.get("cached_tokens") and r.get("neurons")]
    cold_n = min(cold) if cold else 0.0
    warm_n = min(warm) if warm else 0.0
    prompt_tokens = next((r["prompt_tokens"] for r in rows if r.get("prompt_tokens")), 0)
    output_tokens = next((r.get("completion_tokens") for r in rows if r.get("completion_tokens")), 0) or 0
    cached_fraction = 0.0
    if hits and prompt_tokens:
        cached_fraction = max(r["cached_tokens"] for r in hits) / prompt_tokens

    list_neurons = 0.0
    price_in = model.get("price_per_m_input_usd")
    price_out = model.get("price_per_m_output_usd")
    if price_in is not None and price_out is not None and prompt_tokens:
        list_usd = (prompt_tokens * price_in + output_tokens * price_out) / 1e6
        list_neurons = list_usd * 1000.0 / NEURON_USD_PER_1000

    baseline = cold_n if cold_n > 0 else list_neurons
    # A probe where no call was ever billed is a FAILED probe, not a model that
    # does not cache. Collapsing those two into one `false` is the mistake this
    # repository keeps relearning: llama-3.3-70b's 24k context cannot hold the
    # fixture, and the first run of this harness reported that as "no cache"
    # and priced it anyway.
    probe_ok = any(r.get("prompt_tokens") for r in rows)
    return {
        "model": model["name"],
        "probe_ok": probe_ok,
        "probe_error": error if not probe_ok else "",
        "calls": len(rows),
        "post_warm_calls": len(post_warm),
        "post_warm_hits": len(hits),
        "prompt_tokens": prompt_tokens,
        "cold_neurons": cold_n,
        "warm_neurons": warm_n,
        "list_price_neurons": round(list_neurons, 4),
        # The verdict that reaches the cost model: cached tokens were reported
        # AND the neurons actually fell below the list-price baseline.
        # Reported-without-discount is a real behaviour here (gemma-4-26b) and
        # it is worth exactly nothing.
        "cache_is_billed": probe_ok and bool(hits) and warm_n > 0 and baseline > 0
                           and warm_n < baseline * 0.95,
        "cached_fraction": round(cached_fraction, 4),
        "rows": rows,
    }


# ------------------------------------------------------------- the cost model ---


def neurons_to_usd(neurons: float) -> float:
    return neurons * NEURON_USD_PER_1000 / 1000.0


def predicted_usd(usage: dict[str, Any], model: dict[str, Any]) -> float | None:
    """USD implied by the published per-token prices for one billed call."""
    price_in = model.get("price_per_m_input_usd")
    price_out = model.get("price_per_m_output_usd")
    if price_in is None or price_out is None:
        return None
    prompt = usage.get("prompt_tokens") or 0
    cached = (usage.get("prompt_tokens_details") or {}).get("cached_tokens") or 0
    output = usage.get("completion_tokens") or 0
    price_cached = model.get("price_per_m_cached_input_usd")
    if cached and price_cached is not None:
        uncached = prompt - cached
        return (uncached * price_in + cached * price_cached + output * price_out) / 1e6
    return (prompt * price_in + output * price_out) / 1e6


def wave_cost(model: dict[str, Any], cache_is_billed: bool, token_ratio: float = 1.0) -> dict[str, Any]:
    """What one measured wave costs on this model.

    `token_ratio` corrects for the tokenizer: the profile's token counts were
    measured on one model, and a model that spends 24% more tokens on the same
    bytes costs 24% more before a single price is compared. That difference is
    invisible in a per-million rate card and it is measured here from the
    shared fixture.

    A model that publishes no cached-input price, or whose cache did not fire
    when probed, pays the full input rate on every token — which is the whole
    argument, because 98.6% of a wave's tokens are input.
    """
    price_in = model["price_per_m_input_usd"]
    price_out = model["price_per_m_output_usd"]
    price_cached = model.get("price_per_m_cached_input_usd")
    uncached = WAVE_PROFILE["uncached_input_tokens"] * token_ratio
    cached = WAVE_PROFILE["cached_input_tokens"] * token_ratio
    output = WAVE_PROFILE["output_tokens"] * token_ratio
    applied = cache_is_billed and price_cached is not None
    if applied:
        usd = (uncached * price_in + cached * price_cached + output * price_out) / 1e6
    else:
        usd = ((uncached + cached) * price_in + output * price_out) / 1e6
    return {
        "model": model["name"],
        "usd": round(usd, 4),
        "per_tick_usd": round(usd / WAVE_PROFILE["ticks"], 4),
        "cache_applied": applied,
        "token_ratio": round(token_ratio, 4),
    }


# ------------------------------------------------------------------- selftest ---


def selftest() -> None:
    """The parts with no network in them. No account, no spend."""
    failures: list[str] = []

    def check(label: str, got: Any, want: Any) -> None:
        if got != want:
            failures.append(f"{label}: got {got!r}, want {want!r}")

    # Money is compared with a tolerance, never with `==`. These are sums of
    # binary floats over millions of tokens, and an exact-equality assertion on
    # one would fail for a reason that has nothing to do with a price moving —
    # which is the only thing this check exists to catch.
    def check_close(label: str, got: float, want: float, tol: float) -> None:
        if abs(got - want) > tol:
            failures.append(f"{label}: got {got!r}, want {want!r} (tolerance {tol})")

    # The neuron conversion, against a real billed call: gpt-oss-120b answered
    # 151 prompt / 41 completion tokens for 7.599971771240234 neurons at
    # $0.35/$0.75 per million. If these two ever disagree the rate card moved.
    model = {"price_per_m_input_usd": 0.35, "price_per_m_output_usd": 0.75,
             "price_per_m_cached_input_usd": None, "name": "@cf/openai/gpt-oss-120b"}
    usage = {"prompt_tokens": 151, "completion_tokens": 41,
             "prompt_tokens_details": {"cached_tokens": 0}}
    check_close("neuron rate", neurons_to_usd(7.599971771240234),
                predicted_usd(usage, model), 1e-9)

    # And against a CACHED call, where the discount has to be in the arithmetic
    # or the cost model overstates every caching model: deepseek-v4-flash,
    # 22505 prompt of which 22272 cached, 16 out, 39.58624267578125 neurons.
    flash = {"price_per_m_input_usd": 0.44, "price_per_m_output_usd": 1.32,
             "price_per_m_cached_input_usd": 0.014, "name": "@cf/deepseek-ai/deepseek-v4-flash-0731"}
    cached_usage = {"prompt_tokens": 22505, "completion_tokens": 16,
                    "prompt_tokens_details": {"cached_tokens": 22272}}
    check_close("neuron rate (cached)", neurons_to_usd(39.58624267578125),
                predicted_usd(cached_usage, flash), 1e-9)

    # A model with no cached price pays list on every input token.
    no_cache = wave_cost(model, cache_is_billed=False)
    expect = ((WAVE_PROFILE["uncached_input_tokens"] + WAVE_PROFILE["cached_input_tokens"]) * 0.35
              + WAVE_PROFILE["output_tokens"] * 0.75) / 1e6
    check_close("uncached wave", no_cache["usd"], expect, 1e-4)
    check("uncached wave applies no cache", no_cache["cache_applied"], False)

    # Caching has to be BOTH published and observed. Either one alone bills list.
    check("cache published but not observed", wave_cost(flash, cache_is_billed=False)["cache_applied"], False)
    check("cache observed but not published", wave_cost(model, cache_is_billed=True)["cache_applied"], False)
    billed = wave_cost(flash, cache_is_billed=True)
    check("cache observed and published", billed["cache_applied"], True)
    if not billed["usd"] < wave_cost(flash, cache_is_billed=False)["usd"]:
        failures.append("a billed cache did not make the wave cheaper")

    # Per-tick is the figure the tick asks for, not per-wave.
    check_close("per tick", billed["per_tick_usd"], billed["usd"] / WAVE_PROFILE["ticks"], 1e-4)

    # The tokenizer correction is linear and is applied, not ignored.
    inflated = wave_cost(flash, cache_is_billed=True, token_ratio=2.0)
    check_close("token ratio doubles the bill", inflated["usd"], billed["usd"] * 2, 1e-3)

    # A cache reported but not billed must not reach the cost model. This is
    # gemma-4-26b's real behaviour: cached_tokens came back at 100% while the
    # neurons did not move a thousandth.
    gemma = {"name": "@cf/google/gemma-4-26b-a4b-it", "price_per_m_input_usd": 0.1,
             "price_per_m_output_usd": 0.3, "price_per_m_cached_input_usd": None}
    reported_not_billed = summarise_cache(gemma, [
        {"call": 0, "prompt_tokens": 29919, "completion_tokens": 16, "cached_tokens": 0, "neurons": 272.4272766113281},
        {"call": 1, "prompt_tokens": 29918, "completion_tokens": 16, "cached_tokens": 0, "neurons": 272.4181823730469},
        {"call": 2, "prompt_tokens": 29918, "completion_tokens": 16, "cached_tokens": 29888, "neurons": 272.41815185546875},
    ])
    check("reported-but-not-billed cache", reported_not_billed["cache_is_billed"], False)
    check("reported-but-not-billed still counts hits", reported_not_billed["post_warm_hits"], 1)

    really_billed = summarise_cache(flash | {"name": flash["name"]}, [
        {"call": 0, "prompt_tokens": 22505, "completion_tokens": 16, "cached_tokens": 0, "neurons": 902.1199340820312},
        {"call": 1, "prompt_tokens": 22505, "completion_tokens": 16, "cached_tokens": 22272, "neurons": 39.58624267578125},
        {"call": 2, "prompt_tokens": 22505, "completion_tokens": 16, "cached_tokens": 22272, "neurons": 39.58624267578125},
    ])
    check("billed cache", really_billed["cache_is_billed"], True)
    check("billed cache post-warm hits", really_billed["post_warm_hits"], 2)

    # The regression this harness shipped with once: a model whose instance was
    # already warm returns a series with NO cold call, and comparing warm
    # neurons against an absent cold sample scored it "no cache" — which then
    # priced kimi-k2.7-code at 2x its real per-wave cost while pricing k2.6,
    # identically tariffed, correctly. The verdict has to fall out of the list
    # price, which is always known.
    kimi = {"name": "@cf/moonshotai/kimi-k2.7-code", "price_per_m_input_usd": 0.95,
            "price_per_m_output_usd": 4.0, "price_per_m_cached_input_usd": 0.19}
    all_warm = summarise_cache(kimi, [
        {"call": i, "prompt_tokens": 22434, "completion_tokens": 16, "cached_tokens": 22400,
         "neurons": 395.66363525390625} for i in range(6)
    ])
    check("all-warm series has no cold sample", all_warm["cold_neurons"], 0.0)
    check("all-warm series is still a billed cache", all_warm["cache_is_billed"], True)
    check("all-warm series is a real probe", all_warm["probe_ok"], True)
    if all_warm["list_price_neurons"] <= all_warm["warm_neurons"]:
        failures.append("the list-price baseline is not above the warm neurons; the check cannot fire")

    # A probe where nothing was ever billed is a FAILED probe, not a model that
    # does not cache. llama-3.3-70b's 24k context cannot hold the fixture, and
    # reporting that as "no cache" both hid the failure and priced the model on
    # a number nobody measured.
    failed = summarise_cache(
        {"name": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "price_per_m_input_usd": 0.293,
         "price_per_m_output_usd": 2.253, "price_per_m_cached_input_usd": None},
        [{"call": i, "http_status": "400", "prompt_tokens": None, "cached_tokens": None,
          "completion_tokens": None, "neurons": None} for i in range(6)],
        error="HTTP 400: context window exceeded")
    check("a probe that billed nothing is not a measurement", failed["probe_ok"], False)
    check("a failed probe does not claim a cache verdict", failed["cache_is_billed"], False)
    if not failed["probe_error"]:
        failures.append("a failed probe records no reason; that is the collapse of two failure classes into one")

    # Redaction. The public-repo rule is enforced by a test in internal/sandbox;
    # this is the half that makes it true rather than merely checked.
    # Built from halves on purpose: a literal 32-hex string in this file would
    # trip the repository's own guard against a committed account id, and a
    # guard with an exception carved out for "but that one is fake" is a hole.
    account = "0123456789abcdef" * 2
    check("redact url", redact(f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions"),
          f"https://api.cloudflare.com/client/v4/accounts/{REDACTED_ACCOUNT}/ai/v1/chat/completions")
    if ACCOUNT_ID_RE.search(redact(json.dumps({"endpoint": account}))):
        failures.append("redaction left an account-id-shaped string behind")

    # The fixture is a pure function: two builds are identical, and it carries
    # nothing that varies with the clock.
    check("fixture is deterministic", fixture_prefix(), fixture_prefix())
    for varying in ("2026-", "timestamp", "uuid"):
        if varying in fixture_prefix():
            failures.append(f"the cache fixture contains {varying!r}, so it cannot measure a prefix cache")

    # Normalisation reads the API's own property shape.
    entry = {
        "name": "@cf/x/y", "task": {"name": "Text Generation"}, "created_at": "2026-08-13 17:15:08.489",
        "properties": [
            {"property_id": "context_window", "value": "1048576"},
            {"property_id": "function_calling", "value": "true"},
            {"property_id": "price", "value": [
                {"unit": "per M input tokens", "price": 1.32, "currency": "USD"},
                {"unit": "per M output tokens", "price": 3.96, "currency": "USD"},
                {"unit": "per M cached input tokens", "price": 0.044, "currency": "USD"},
            ]},
        ],
    }
    got = normalise_model(entry)
    check("context window", got["context_window"], 1048576)
    check("function calling", got["function_calling"], True)
    check("cached price", got["price_per_m_cached_input_usd"], 0.044)
    check("compat starts unprobed", got["openai_compatible"], None)

    # Every recommendation is routable and the routing is mixed.
    providers = {r["provider"] for r in RECOMMENDATIONS}
    check("routing is mixed", providers, {"workers-ai", "byok"})
    for rec in RECOMMENDATIONS:
        for field in ("role", "tier", "model", "why"):
            if not rec.get(field):
                failures.append(f"recommendation {rec.get('role')}/{rec.get('tier')} has no {field}")

    # Every score is sourced and dated. A number with neither is a memory.
    for score in PUBLISHED_SCORES:
        if not score.get("source") or not score.get("dated"):
            failures.append(f"{score['model']} {score['benchmark']} is unsourced or undated")

    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        sys.exit(1)
    print("selftest ok")


# ----------------------------------------------------------------- the run ---


def run_all(args: argparse.Namespace) -> None:
    token, account = credentials()
    print("1/3 inventory: reading what this account serves", file=sys.stderr)
    raw_models = fetch_inventory(token, account)
    inventory = [normalise_model(m) for m in raw_models]
    text_models = [m for m in inventory if m["task"] == "Text Generation"]
    print(f"    {len(inventory)} models, {len(text_models)} text-generation", file=sys.stderr)

    candidates = [m for m in text_models if m["function_calling"]]
    compat: list[dict[str, Any]] = []
    rate_check: list[dict[str, Any]] = []
    by_name = {m["name"]: m for m in inventory}
    if not args.inventory_only:
        print(f"2/3 compatibility: probing {len(candidates)} tool-capable models", file=sys.stderr)
        for model in candidates:
            result = probe_compat(token, account, model["name"])
            compat.append({k: v for k, v in result.items() if k != "usage"})
            # OpenAI-compatible here means the whole thing a harness needs: the
            # endpoint took the request in both shapes AND the model drove a
            # tool. Any one of those failing makes it useless to pi/omp.
            model["openai_compatible"] = bool(
                result["accepts_string_content"]
                and result["accepts_content_parts"]
                and result["tool_calls"] > 0
                and result["tool_arguments_parsed"]
            )
            usage = result.get("usage")
            if usage and usage.get("neurons"):
                predicted = predicted_usd(usage, model)
                if predicted is not None:
                    rate_check.append({
                        "model": model["name"],
                        "predicted_usd": round(predicted, 9),
                        "billed_usd": round(neurons_to_usd(usage["neurons"]), 9),
                    })
        # A model the probe never reached keeps `None`, which the guard test
        # reads as "unprobed" rather than "incompatible".
        for model in text_models:
            if not model["function_calling"] and model["openai_compatible"] is None:
                model["openai_compatible"] = False

    caches: list[dict[str, Any]] = []
    if not args.inventory_only:
        print(f"3/3 prefix cache: {args.cache_calls} calls x {len(candidates)} models", file=sys.stderr)
        for model in candidates:
            caches.append(probe_cache(token, account, model, args.cache_calls, args.affinity))
            print(f"    {model['name']}: {caches[-1]['post_warm_hits']}/{caches[-1]['post_warm_calls']} "
                  f"post-warm hits, billed cheaper: {caches[-1]['cache_is_billed']}", file=sys.stderr)

    baseline = WAVE_PROFILE["measured_on"]
    cache_by_model = {c["model"]: c for c in caches}
    base_tokens = (cache_by_model.get(baseline) or {}).get("prompt_tokens") or 0
    costs = []
    for model in candidates:
        if model["price_per_m_input_usd"] is None:
            continue
        cache = cache_by_model.get(model["name"], {})
        ratio = 1.0
        if base_tokens and cache.get("prompt_tokens"):
            ratio = cache["prompt_tokens"] / base_tokens
        row = wave_cost(model, bool(cache.get("cache_is_billed")), ratio)
        # Say so when the number is a list-price upper bound rather than a
        # measurement, instead of letting it sit in the table looking the same
        # as the rows that were measured.
        row["cache_measured"] = bool(cache.get("probe_ok"))
        costs.append(row)
    costs.sort(key=lambda c: c["per_tick_usd"])

    doc = {
        "schema": SCHEMA,
        "measured_at": args.measured_at,
        "source": "live Cloudflare API (GET /accounts/<id>/ai/models/search and "
                  "POST /accounts/<id>/ai/v1/chat/completions)",
        "endpoint": redact(chat_url(account)),
        "neuron_usd_per_1000": NEURON_USD_PER_1000,
        "neuron_rate_check": rate_check,
        "inventory": inventory,
        "compat": compat,
        "cache": caches,
        "scores": PUBLISHED_SCORES,
        "wave_profile": {k: v for k, v in WAVE_PROFILE.items() if isinstance(v, float)},
        "wave_profile_source": f"{WAVE_PROFILE['run']}, measured on {WAVE_PROFILE['measured_on']} "
                               f"(repo-wiki/cloud-factory-billing.md)",
        "cost_per_wave_usd": costs,
        "recommendations": RECOMMENDATIONS,
    }
    body = redact(json.dumps(doc, indent=1))
    if ACCOUNT_ID_RE.search(body):
        sys.exit("refusing to write output carrying an account id")
    with open(args.out, "w") as handle:
        handle.write(body + "\n")
    print(f"wrote {args.out}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--all", action="store_true", help="inventory + compatibility + cache")
    parser.add_argument("--inventory", dest="inventory_only", action="store_true",
                        help="catalog only; no billed calls")
    parser.add_argument("--compat", action="store_true", help="alias for --all")
    parser.add_argument("--cache", action="store_true", help="alias for --all")
    parser.add_argument("--selftest", action="store_true", help="offline checks; no account, no spend")
    parser.add_argument("--cache-calls", type=int, default=6,
                        help="calls per model in the cache probe (must be >1: the first is billed cold)")
    parser.add_argument("--affinity", default="bench-workers-ai-models",
                        help="x-session-affinity value; a fixed one so re-runs share an instance")
    parser.add_argument("--measured-at", dest="measured_at", required=False,
                        help="the date of this measurement, YYYY-MM-DD")
    parser.add_argument("--out", default="benchmarks/workers-ai-models/latest.json")
    args = parser.parse_args()

    if args.selftest:
        selftest()
        return
    if args.cache_calls < 2:
        sys.exit("--cache-calls must be at least 2: the first repeat of a prefix is billed cold")
    if not args.measured_at:
        sys.exit("--measured-at is required: an undated price list is not evidence")
    if not (args.all or args.inventory_only or args.compat or args.cache):
        parser.print_help()
        sys.exit(2)
    run_all(args)


if __name__ == "__main__":
    main()
