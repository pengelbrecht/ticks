# Herdr Kinds — Capability Matrix

Read [`agent-runner.md`](agent-runner.md) first. This file is the **per-kind lookup table** for driving a Herdr-managed coding agent as a tick implementer: how to spawn one non-interactively with the model and permission mode you intend, whether its lifecycle state is trustworthy, and how to get back into its native session after the pane is gone. The orchestration loop that consumes this table lives in `herdr-runner.md`; the runner selection that decides you are on Herdr at all (`substrate = herdr | harness | auto` in `.tick/runners.toml`) lives in `runners-config.md`.

A **kind** is Herdr's `--kind` value — the canonical executable it knows how to launch and detect. As of the version verified here, `herdr agent start --help` lists:

```
pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode,
opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki
```

Two of those — **claude** and **codex** — are verified below as tick implementers. The rest are reachable through the same three-step recipe in [Adding a kind](#adding-a-kind); do not assume a template for a kind nobody has round-tripped.

## The spawn contract

**In a tick run you do not type these calls: `tk herd spawn` does, and it also handles the startup races and the content gate that the raw sequence leaves to you ([`herdr-runner.md`](herdr-runner.md#the-helper-tk-herd)).** The contract below is what the helper implements and what you need when *verifying a new kind* — the loop in [Adding a kind](#adding-a-kind) is exactly this, run by hand in a scratch pane.

Herdr does not launch processes out of nowhere. A worker is a **pane running the agent's own CLI**, and Herdr attaches lifecycle tracking to it:

```bash
# 1. Make a pane. Read .result.pane.pane_id from the response.
herdr pane split --current --direction down --cwd "<worktree>" --no-focus

# 2. Start the agent in it. Everything after `--` is the native CLI's argv.
herdr agent start <name> --kind <kind> --pane <pane-id> --timeout 120000 -- <native args>

# 3. Drive it.
herdr agent prompt <name> "<text>" --wait --timeout <ms>
```

Three properties of this contract matter for orchestration:

- **Args after `--` are passed through verbatim.** The `agent_started` response echoes the exact `argv` it executed — always read it back as your proof that the model and permission flags landed, rather than trusting the template.
- **The pane must be at an interactive shell prompt**, and `--cwd` is where model selection meets isolation: point it at the tick's worktree so the agent's own project-instruction discovery (`CLAUDE.md` / `AGENTS.md`) resolves from the worktree, not the controller checkout.
- **`start` succeeding means "the expected agent was detected and is ready for input"** — nothing more. See [The green-start trap](#the-green-start-trap).

Cleanup is symmetric and mandatory: exit the agent, then `herdr pane close <pane-id>` for every pane you created. Never `herdr server stop`; never touch a pane, workspace, or agent you did not create.

That two-step is for panes you made yourself with `herdr pane split` — a scratch pane for verifying a kind, say. A worker spawned through `herdr worktree create` is cleaned up in **one** call instead: `herdr worktree remove --workspace <id>` tears down the worktree, the workspace, its pane, and the running agent together, with no prior exit needed (verified live). Do not do both; see `herdr-runner.md` → *Cleanup* for the ordering rule that governs when either is allowed to run at all.

## Capability matrix

| Kind | Model flag | Full-auto / skip-permissions | Integration (this machine) | `agent_session` kind | Native resume |
|---|---|---|---|---|---|
| `claude` | `--model <alias\|full-name>` | `--permission-mode bypassPermissions` (or `--dangerously-skip-permissions`) | **current (v7)** — `~/.claude/hooks/herdr-agent-state.sh` | `id` (UUID), **not dependable at start** — see below | `claude --resume <id>` |
| `codex` | `-m, --model <MODEL>` | `-a never -s workspace-write` (or `--dangerously-bypass-approvals-and-sandbox`) | **outdated (v6 < v7)** — `~/.codex/herdr-agent-state.sh` | `id` (UUID), appears **after the first prompt** | `codex resume <id>` |

Everything in that table was read from the CLIs' own `--help` and then round-tripped live; flag names drift between releases, so re-verify with `--help` rather than copying this table into a new environment unchecked.

## Model and effort translation

`.tick/runners.toml` specifies a worker along **two dimensions**: `kind` (the harness — this file's subject) and `model` + optional `effort` (the capability). Those two fields are kind-neutral in the config and are **compiled by the spawner** into the kind's native argv. This section is the translation table; the config-side rules live in [`runners-config.md`](runners-config.md).

The spawner under this substrate is `tk herd spawn`: the compilation below, its fixed argv order, and the fail-closed refusal further down are implemented there, and the argv herdr echoed on `agent_started` is recorded in the run-state manifest as the ground truth for what actually landed.

Compiled argv order is fixed: **full-auto template → compiled `model`/`effort` flags → `args` verbatim.**

| Kind | `model = "M"` compiles to | `effort = "E"` compiles to | Verified against |
|---|---|---|---|
| `claude` | `--model M` | `--effort E` | `claude --help`: `--effort <level>` — `(low, medium, high, xhigh, max)` |
| `codex` | `-m M` | `-c model_reasoning_effort="E"` | `codex --help`: no reasoning-effort flag exists; effort is a config override via `-c <key=value>` |
| `pi` | `--model M` (M is a full `<provider>/<model>` id) | appended as `:E` on the model id → `--model M:E` (equivalently `--thinking E`) | `pi --help`: `--model <pattern>` "supports `provider/id` and optional `:<thinking>`"; `--thinking <level>` — `off, minimal, low, medium, high, xhigh, max` |

The `claude` and `codex` rows are round-tripped live (see their sections below). The `pi` row is **read from `pi --help` only** — pi is not yet verified as a tick implementer, so run [Adding a kind](#adding-a-kind) before routing a role to it.

Worked examples of the compilation:

```text
kind="claude" model="opus"          effort="high"   ->  --model opus --effort high
kind="codex"  model="gpt-5.6-luna"  effort="max"    ->  -m gpt-5.6-luna -c model_reasoning_effort="max"
kind="pi"     model="openai-codex/gpt-5.6-sol" effort="xhigh"
                                                    ->  --model openai-codex/gpt-5.6-sol:xhigh
```

`effort` is optional everywhere. Omitting it means "the kind's own default" — the same reasoning as omitting `model` (see the [green-start trap](#the-green-start-trap) and `runners-config.md`'s authoring rules): codex reads `model_reasoning_effort` from `~/.codex/config.toml`, claude uses its session default, pi uses the model's default thinking level.

### Which models each kind accepts

The matrix is **sparse**. A kind is a specific vendor CLI authenticated against a specific account, and it can only run models from the family that CLI serves:

| Kind | Accepts | Examples | Rejects |
|---|---|---|---|
| `claude` | Claude-family only — aliases for the latest model in a family, or full names | `opus`, `sonnet`, `haiku`, `fable`, `claude-fable-5` | any `gpt-*`, `gemini-*`, or `<provider>/<model>` id |
| `codex` | OpenAI models the authenticated Codex account may use | `gpt-5.6-luna`, `gpt-5.6-sol` | Claude/Gemini names; also *plausible-looking* OpenAI names the account is not entitled to |
| `pi` | Cross-provider, so a **provider-qualified** id is the norm | `openai-codex/gpt-5.6-sol`, `openai/gpt-4o`, `anthropic/claude-sonnet-…` | ids for providers the local pi has no credentials for |

Effort levels are sparse too: `claude --effort` accepts `low, medium, high, xhigh, max` (no `off`/`minimal`); `pi --thinking` accepts `off, minimal, low, medium, high, xhigh, max`; codex's `model_reasoning_effort` is a config string whose accepted set is the model's, not the CLI's (`max` is live on this machine's `~/.codex/config.toml`).

Do not treat any model string here as durable. These are dated observations; `pi --list-models` and the vendor CLIs are the authority, and `.tick/config.md`'s *Pi Orchestrator* section carries the ids a given repo actually runs.

### Fail closed on an impossible cell

**The schema validates shape; the spawner enforces compatibility.** `runners-config.schema.json` cannot enumerate model families — they are open-ended and change between releases — so `kind = "claude"` with `model = "gpt-5.6-luna"` is a perfectly *valid* config document. It is still an impossible cell.

**Rule: before spawning, check the model against the kind's accepted family. On a mismatch, refuse the spawn with a clear message naming the role/tier, the kind, and the model — and never silently reroute** to a kind that would accept the model, never drop the model and fall back to the CLI's default. Both of those turn a config bug into a run that quietly did the wrong work on the wrong vendor.

`tk herd spawn` enforces this, and enforces it **before it dials herdr** — verified live against herdr 0.8.0, 2026-08: the refusal below exits 1 having made zero herdr calls, so no workspace, worktree, branch or manifest exists to clean up afterwards. Dated example; re-verify against your own build.

```text
.tick/runners.toml [roles.implement.tiers.strong]: kind = "claude" cannot run
model = "gpt-5.6-luna" (claude runs Claude-family models only). Fix the config —
either kind = "codex" for that model, or a Claude model for that kind.
```

This is a stop, matching `runners-config.md`'s rule that a config the orchestrator cannot honour halts the run rather than being guessed around. The cost of *not* stopping is documented right below: an unusable model name starts green, prompts green, and does zero work.

## claude

**Verified template.**

```bash
herdr agent start <name> --kind claude --pane <pane-id> --timeout 120000 \
  -- --model sonnet --permission-mode bypassPermissions
```

- **Model.** `--model` takes an alias for the latest model in a family (`fable`, `opus`, `sonnet`) or a full name (`claude-fable-5`). Prefer the alias — it survives model refreshes, which matters for a template committed to a skill. Effort is a separate axis: `--effort <low|medium|high|xhigh|max>`.
- **Full auto.** `--permission-mode bypassPermissions` is the flag to reach for. It sets the mode for the session and shows up in the pane footer as `⏵⏵ bypass permissions on`. `--dangerously-skip-permissions` is the equivalent blunt form and `--allow-dangerously-skip-permissions` only *enables the option* without turning it on — do not confuse the three. The `--permission-mode` spelling is preferable because the same flag reaches the non-bypass modes (`acceptEdits`, `auto`, `plan`, `manual`, `dontAsk`) when a tick should run gated.
- **Worth knowing.** `--add-dir` widens tool access beyond the worktree; `--session-id <uuid>` lets the orchestrator *choose* the session id up front instead of discovering it afterwards, which is the cheapest way to make the resume story deterministic.

**Live evidence.**

```
$ herdr agent start htg-claude --kind claude --pane w4C:p2 --timeout 120000 \
    -- --model sonnet --permission-mode bypassPermissions
{"result":{"agent":{"agent":"claude","agent_status":"idle","interactive_ready":true,
  "agent_session":{"agent":"claude","kind":"id","source":"herdr:claude",
                   "value":"c13950d3-e722-46f3-87bd-7079658b475d"}},
  "argv":["claude","--model","sonnet","--permission-mode","bypassPermissions"]}}

$ herdr agent prompt htg-claude "Reply with the single word OK" --wait --timeout 120000
{"result":{"agent":{"agent_status":"idle", ...}}}

$ herdr agent read htg-claude   # tail
❯ Reply with the single word OK
⏺ OK
  ⏵⏵ bypass permissions on (shift+tab to cycle)
```

The pane banner confirmed `Sonnet 5 with medium effort` and the worktree cwd, so both halves of the template took effect.

**`agent_session` on the start response is not dependable.** The run above got one; a later run on the same machine (herdr 0.8.0, `--model haiku`) got an `agent_started` response with no `agent_session` key at all, and the id first appeared on the `agent prompt` response. Whether it is present at start appears to depend on how quickly the integration hook reports in, which is a race you do not control. **Capture `agent_session` after the first round-trip for every kind, not just codex** — an orchestrator that reads it only from `agent_started` will intermittently record nothing and lose the cheap resume path.

## codex

**Verified template.**

```bash
herdr agent start <name> --kind codex --pane <pane-id> --timeout 120000 \
  -- -m <model> -a never -s workspace-write
```

- **Model.** `-m, --model <MODEL>`. Codex resolves the default from `model = "..."` in `~/.codex/config.toml`; when in doubt read that file rather than guessing a model string (see [The green-start trap](#the-green-start-trap) for why guessing is expensive here). Reasoning effort is config, not a flag: `-c model_reasoning_effort="high"`.
- **Full auto.** There is no `--full-auto` flag on the interactive `codex` CLI at the version verified here. Full autonomy is the **pair** `-a never` (never ask for approval; failures are returned to the model) plus `-s workspace-write` (the sandbox the agent may write in). `--dangerously-bypass-approvals-and-sandbox` is the harder form — skips approvals *and* removes the sandbox — and is only appropriate when the surrounding environment is itself sandboxed. For tick implementers in a git worktree, `-a never -s workspace-write` is the right default: the agent is unblocked but the sandbox still bounds the blast radius. Add `--add-dir <dir>` if a tick legitimately needs to write outside its worktree.
- **Worth knowing.** `-C, --cd <DIR>` sets the agent's working root independently of the pane's cwd, and `--search` enables web search without per-call approval.

**Live evidence.**

```
$ herdr agent start htg-codex2 --kind codex --pane w4C:p2 --timeout 120000 \
    -- -m gpt-5.6-luna -a never -s workspace-write
{"result":{"agent":{"agent":"codex","agent_status":"idle","interactive_ready":true},
  "argv":["codex","-m","gpt-5.6-luna","-a","never","-s","workspace-write"]}}
  # note: no agent_session on the start response

$ herdr agent prompt htg-codex2 "Reply with the single word OK" --wait --timeout 120000
{"result":{"agent":{"agent_status":"idle",
  "agent_session":{"agent":"codex","kind":"id","source":"herdr:codex",
                   "value":"019ff08d-023c-7f70-b602-b7b798fcd531"}}}}

$ herdr pane read <pane-id>   # tail
│ model:     gpt-5.6-luna max   /model to change           │
› Reply with the single word OK
• OK
```

**The codex session id is not available until after the first prompt.** Any orchestrator that records `agent_session` at spawn time will record nothing for codex. Capture it after the first successful round-trip.

## Integrations

`herdr integration status` reports, per kind, whether Herdr's hook/extension is installed in that agent's own config tree:

```
$ herdr integration status
pi: outdated (v5 < v8) (/Users/…/.pi/agent/extensions/herdr-agent-state.ts)
claude: current (v7) (/Users/…/.claude/hooks/herdr-agent-state.sh)
codex: outdated (v6 < v7) (/Users/…/.codex/herdr-agent-state.sh)
copilot: not installed (…)
… (16 kinds listed)
```

**Why this matters.** Without an integration, Herdr infers `idle | working | blocked | done` from the terminal — OSC titles and prompt-box rendering. That is a heuristic over a TUI that the vendor is free to restyle in any release. With an integration, the agent's own hooks report lifecycle transitions and session identity to Herdr directly, which is what makes `herdr agent prompt --wait` and `herdr agent wait --until done` safe to build a wave loop on. The `agent_session.source` values observed above (`herdr:claude`, `herdr:codex`) are the integration reporting session identity through `herdr pane report-agent-session`.

**When status says `outdated`, the fix is `herdr integration install <kind>`** — same command as a fresh install; it upgrades in place. Do this before an epic run, not during one. An outdated integration is not automatically broken (codex at v6 against a v7 expectation still round-tripped cleanly here), but it is the first thing to rule out when lifecycle state goes wrong.

`herdr agent explain <name>` tells you which signal actually decided the current state, and is the diagnostic to reach for before believing or disbelieving a status:

```
$ herdr agent explain htg-claude2        $ herdr agent explain htg-codex-r
agent: claude                            agent: codex
state: working                           state: idle
rule: osc_title_working (priority=1100)  rule: osc_title_idle (priority=100)
evidence: "⠐ Count to five slowly"       evidence: "agent-a5c1efa27088b6d37"
```

Note what this shows: on this machine, even with claude's integration `current`, the *winning* signal for these transitions was a screen rule. Integrations raise the floor — they supply session identity and authoritative transitions — but the state you read is whichever signal is currently highest-priority. Treat `explain` as the ground truth about **why** a state is what it is.

## Resume

Herdr exposes each agent's native session identity on `herdr api snapshot` (and on `agent get` / `agent prompt` responses) under `agent_session`:

```bash
herdr api snapshot | jq '.result.snapshot.agents[]
  | select(.name=="<name>") | {name, agent, agent_session}'
```

`agent_session.kind` is `id` for both verified kinds (other kinds may report `path`); `value` is the token the native CLI's resume flag takes. Both CLIs also print it on exit, which is a useful cross-check that Herdr's view is the real one:

| Kind | On exit the CLI prints | Resume through Herdr |
|---|---|---|
| `claude` | `Resume this session with: claude --resume <uuid>` | `herdr agent start <n> --kind claude --pane <p> -- --model sonnet --permission-mode bypassPermissions --resume <uuid>` |
| `codex` | `To continue this session, run codex resume <uuid>` | `herdr agent start <n> --kind codex --pane <p> -- resume <uuid> -m <model> -a never -s workspace-write` |

Both were verified live: after `C-c C-c`-ing each agent and restarting it in the same pane with the resume form, `herdr pane read` showed the prior turn (`Reply with the single word OK` → `OK`) replayed in the restored transcript, and for claude the `agent_session.value` was unchanged across the restart.

Note the shape difference. Claude's resume is a **flag** that composes with the rest of the spawn template. Codex's is a **subcommand** — `resume` and its `SESSION_ID` come first in argv, then the ordinary flags (`-m`, `-a`, `-s` all exist on `codex resume` too). Both accept a picker when the id is omitted; an orchestrator must always pass the id, because a picker is an interactive prompt that will hang the wave.

Two escape hatches worth knowing: `claude --fork-session` resumes into a *new* session id (useful when you want the context but not to mutate the original), and `codex fork --last` is codex's equivalent. `claude --session-id <uuid>` inverts the problem entirely by letting the orchestrator assign the id before the process exists.

## The green-start trap

`herdr agent start` returning `agent_status: idle, interactive_ready: true` means Herdr found the expected agent at a prompt. It does **not** mean the agent can do work. Observed live:

```
$ herdr agent start htg-codex --kind codex --pane w4C:p2 -- -m gpt-5.1-codex -a never -s workspace-write
{"result":{"agent":{"agent_status":"idle","interactive_ready":true}, "argv":[…]}}   # green

$ herdr agent prompt htg-codex "Reply with the single word OK" --wait --timeout 120000
{"result":{"agent":{"agent_status":"idle", …}}}                                     # also green

$ herdr pane read <pane-id>
⚠ Model metadata for `gpt-5.1-codex` not found. Defaulting to fallback metadata…
■ {"type":"error","status":400,"error":{"message":"The 'gpt-5.1-codex' model is not
   supported when using Codex with a ChatGPT account."}}
```

An invalid model name produced a clean start, a clean prompt, and a settled `idle` state — with zero work done. Lifecycle state describes the *terminal*, not the *turn*.

**Rule: gate a worker on the content of its first round-trip, not on its lifecycle status.** Send a trivial prompt whose answer you can pattern-match (`Reply with the single word OK`) and read the pane for the answer before handing it a tick. This is cheap and it catches the whole class of model-name, auth, and quota failures that otherwise surface as a silently empty implementer report an hour later. `tk herd spawn` performs this gate on every worker and fails the spawn with a pane excerpt when it does not pass — so under the helper the trap is closed by construction; the rule still matters when you are verifying a kind by hand.

**A second, unrelated failure hides behind the same green response: the first prompt can simply not land.** Observed on both verified kinds in one wave — `herdr agent prompt … --wait --timeout 120000` returned a normal `agent_prompted` with a settled status while the pane still showed an untouched composer (claude's empty `❯`, codex's `› Improve documentation in @filename` placeholder) and no echo of the prompt text. The CLI was still painting its startup UI when herdr, having already seen `interactive_ready: true`, submitted. Re-sending the identical prompt worked immediately for both. Tell the two apart by reading the pane: **no echo of your prompt → re-send it; your prompt echoed with an error or no answer → the green-start trap, kill and fix the routing.** `herdr-runner.md`'s first-round-trip gate carries the same split.

## Adding a kind

To extend the matrix to any of the other `--kind` values, run exactly the loop that produced the two entries above — and do not write a row you have not run:

1. **Read the real flags.** `<cli> --help` for the model flag and the approval/permission flag; do not transcribe from memory or from another kind's shape. Note whether resume is a flag or a subcommand.
2. **Round-trip it live.** Split a scratch pane, `herdr agent start` with your candidate template, confirm the echoed `argv`, `herdr agent prompt … --wait`, and **read the pane** for the expected answer (per [the green-start trap](#the-green-start-trap)). Record `herdr agent get` and the `agent_session` from `herdr api snapshot`.
3. **Verify resume.** Exit with `C-c`, restart in the same pane with the resume form, and confirm the prior turn is present in the restored transcript.
4. **Record the integration state.** `herdr integration status` names the kind's hook path and version; install or upgrade with `herdr integration install <kind>` if the wave loop will depend on lifecycle states.
5. **Clean up.** Exit the agent and `herdr pane close <pane-id>` for every pane you created.

Operational notes that bit during verification and will bite again: `herdr agent send-keys` uses **`C-c`**, not `ctrl-c` (the latter errors `unsupported key`); an agent name is released as soon as the process exits, so a restart in the same pane needs a fresh `<name>`; and `herdr agent prompt --wait` without `--until` matches `idle | done | blocked` and does not track turns, so an already-working agent's current turn can satisfy your wait.
