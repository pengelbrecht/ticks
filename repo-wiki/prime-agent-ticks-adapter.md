# Prime Agent Ticks Adapter

`skills/ticks/references/prime-runner.md` is the canonical instruction file; this page records only the runtime constraints that shaped it, so the adapter's design choices stay explicable without re-deriving them from the `prime-agent` source.

## Why the adapter is a hybrid

Prime Agent's in-process children (`await rlm(...)`) accept only `name` and `model` — **there is no `cwd` kwarg**, and a child is constructed with its parent's working directory. A single Prime Agent session therefore cannot place children in different git worktrees, which is the primitive the whole Ticks wave protocol rests on.

The adapter resolves this by splitting dispatch by role:

- **Implementers** are separate `prime-agent -p --cwd <worktree>` processes — real cwd isolation, exit-code completion, and `--autonomous-gate` as a host-enforced per-tick test gate.
- **Read-only roles** (planning scouts, planner, reviewers, close-out) are RLM children in the controller checkout, where sharing the parent's cwd is correct anyway, and where `agent_message` continuation, `agent_observe`, and per-child model selection are worth having.

If `rlm.run` ever gains `cwd`, the two surfaces collapse into one and the adapter should be simplified.

## Runtime facts the adapter depends on

Verified against prime-agent 0.7.0. These are the claims most likely to rot; re-check them before trusting the adapter after a major upgrade.

- **Depth.** `RLM_MAX_DEPTH` defaults to `1`, so children cannot spawn grandchildren. The orchestrator — not a planner child — must be the fan-out point for scouts.
- **Model selection.** `rlm.find_models()` is bounded to live, non-expired credentials and returns `provider/id` selectors; an unavailable selector fails the spawn rather than degrading. Omitting `model=` silently inherits the parent's model.
- **`find_models` is a credential filter, not a quota filter.** A throttled or zero-credit provider still lists. Providers drop out only on expired credentials or a 401/403 that marked the auth source stale (in-memory, per worker process).
- **No failover, no quota API.** Auto-retry re-calls the same model (3 attempts, exponential backoff) and never substitutes a provider; nothing reports credits, balance, or rate-limit headroom, and rate-limit response headers are discarded. Cross-provider failover is therefore orchestrator policy, and reactive.
- **Failure classification.** Provider errors carry a stable kind and message prefix. Credit exhaustion arrives as `invalid_request` (400), *not* `rate_limit` (429) — the trap any failover policy has to encode.
- **A provider-failed RLM child settles as `completed`, not `error`**, with no reply and an empty preview; the cause is only in the child's session JSONL diagnostics. Waves must settle on reports received, never on registry status.
- **`--mode json` leaves the exit code at `0` on a model error.** Only `-p` text mode sets exit 1, which is why the adapter dispatches implementers in text mode.
- **Autonomous limits** are checked as continuations → turns → tokens → elapsed. The token cap (80,000, excluding cache reads) binds before the 30-minute timeout on real implementation ticks.
- **Sessions are leased by canonical path**, so each lane needs its own `--session-dir`.

## Boundaries this adapter does not cross

- The continual harness (memories, skills, prompt notes, subagent specs) is **harness-private**. It is never handoff state; anything a future run needs is mirrored into `.tick/`, `docs/`, or `AGENTS.md` first.
- Kernel variables and the RLM child registry are an optimization only. Cross-runner handoff remains git plus `.tick/`, never a Prime Agent session ID or `rlm_child_id`.
