# `.tick/runners.toml` — runner routing configuration

Read [`agent-runner.md`](agent-runner.md) first for the runner-neutral contract and the capability-tier vocabulary. This file defines `.tick/runners.toml`: the per-repo configuration that decides **which substrate orchestrates a run** (herdr panes versus the harness's own subagent primitive) and **which agent kind + model arguments serve each task role and tier**.

"Kind" throughout this document means herdr's `--kind` value (`claude`, `codex`, `gemini`, `pi`, …) — the installed herdr binary is the authority on the valid list (`herdr agent`). Per-kind spawn and full-auto argument templates live in [`herdr-kinds.md`](herdr-kinds.md); this document never restates them.

The file is optional. Without it, the active runner adapter behaves exactly as it does today: harness-native subagents, adapter-default tier mapping. `runners.toml` only ever *adds* routing choices.

## Where the schema lives

The JSON Schema for this file is [`runners-config.schema.json`](runners-config.schema.json), next to this document — **not** in the repo's `schemas/` directory.

`schemas/` is the codegen source of truth for types shared between the Go server and the TypeScript UI: `make codegen-go` and `make codegen-ts` feed a hard-coded file list (`tick`, `activity`, `api/*`, `websocket/*`) into `go-jsonschema` and the UI's codegen, and any edit there obliges the author to regenerate and commit both outputs. `runners.toml` is neither a wire type nor a tk domain type — nothing in the Go binary or the board UI reads it — so a schema there would add a maintenance obligation and a codegen decision (include it and generate dead Go/TS types, or leave it out and have an unwired file in a directory documented as "single source of truth for shared types") with no benefit. The ticks skill is also distributed standalone, so its config schema must travel with it.

Validate a config by parsing the TOML and checking the resulting object against the schema, for example. `tomllib` is stdlib on Python 3.11+, but `jsonschema` is not — run this under `uv run --with jsonschema python …` (or any venv that has it) rather than a bare `python3`:

```bash
python3 - <<'PY'
import json, tomllib, jsonschema
schema = json.load(open("skills/ticks/references/runners-config.schema.json"))
config = tomllib.load(open(".tick/runners.toml", "rb"))
jsonschema.Draft202012Validator(schema).validate(config)
print("ok")
PY
```

## File shape

```text
version = 1                 # optional; only 1 is defined

[orchestrator]              # optional — preferred home for the orchestrator role
[orchestration]             # optional — substrate selection and dispatch limits
[roles.<name>]              # required — at least [roles.implement]
[roles.<name>.tiers.<tier>] # optional — per-tier overrides
```

### `[orchestrator]`

Advisory. Whichever agent is executing the run *is* the orchestrator; this section records which harness/kind the repo's configuration was written for, so a mismatch can be reported rather than silently changing routing. At least one of `harness` or `kind` must be present.

| Key | Type | Meaning |
|---|---|---|
| `harness` | string | Runner adapter that plays orchestrator: `claude`, `codex`, `pi`, `prime` (see the matching `<harness>-runner.md`). |
| `kind` | string | herdr kind to use if the orchestrator itself is ever spawned into a pane. |
| `args` | array of strings | Native args for that kind, e.g. reasoning effort for the orchestrating model. |

### `[orchestration]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `substrate` | `"herdr"` \| `"harness"` \| `"auto"` | `"auto"` | Dispatch substrate. See [Substrate semantics](#substrate-semantics). |
| `detect` | `"env-or-socket"` \| `"env"` \| `"socket"` | `"env-or-socket"` | Which probes count as "herdr is available". |
| `socket` | string | `$HERDR_SOCKET_PATH`, else `~/.config/herdr/herdr.sock` | Socket path used by the `socket` probe. |
| `max_parallel` | integer ≥ 1 | adapter default | Concurrent workers per wave. |
| `worktree_branch_prefix` | string | `"tick/"` | Branch prefix for `herdr worktree create` (branch = `<prefix><tick-id>`). Ignored under harness orchestration — there the harness names branches. |
| `full_auto` | boolean | `true` | Start workers with their kind's full-auto arg template. When `false`, every approval prompt becomes a human escalation. |

### `[roles.<name>]`

Keys are role names matching `^[a-z][a-z0-9_-]*$`. Well-known roles: `plan`, `scout`, `implement`, `review`, `closeout`. Custom names are allowed. `[roles.implement]` is **required**; any role with no entry falls back to `implement`.

| Key | Type | Meaning |
|---|---|---|
| `kind` | string, required | herdr kind to spawn for this role. |
| `args` | array of strings | Native agent args, passed verbatim after `--` in `herdr agent start`. One argv element per entry — never a pre-joined shell string. |
| `harness` | string | Documentary note of the corresponding runner adapter. Routing uses `kind`. |
| `tiers.<economy\|balanced\|strong\|frontier>` | table | Per-tier overrides; each entry may set `kind`, `args`, or both. |

The tier names are the shared capability tiers from `agent-runner.md` — the contract is the tier name, not any model string.

### Resolution order

For a tick with role R and chosen tier T:

1. `roles.R.tiers.T` if present → its `kind` (else `roles.R.kind`) and its `args` (else `roles.R.args`).
2. Otherwise `roles.R.kind` + `roles.R.args`.
3. If role R has no entry, resolve against `implement` by the same two steps.

**Within one wave, the tier is the only per-tick routing knob.** Role comes from the tick (`tk create --role`), and the tracker only tags the *process* roles — `review` and `closeout`. Every implementation tick in a wave therefore resolves against `roles.implement`, so two same-wave ticks can only land on different kinds if they are assigned different tiers and those tiers override `kind`. That is supported and it is how the substrate's headline cross-vendor capability is exercised per tick:

```toml
[roles.implement]
kind = "codex"
args = ["--config", "model_reasoning_effort=\"medium\""]

[roles.implement.tiers.economy]     # a tier may override `kind`, not just `args`
kind = "claude"
args = ["--model", "haiku"]
```

Keep the tier's real meaning intact when you do this — the tier is chosen from the tick's difficulty per `agent-runner.md`, and picking a tier to reach a vendor rather than a capability level is how a hard tick ends up on a cheap model. If a repo wants vendor split along an axis that is *not* difficulty, that axis has to become a role the tracker can tag, and today it cannot.

**Args replace, they never merge.** A tier's `args` supersede the role's `args` wholesale; a tier that only wants to change the model must restate the full arg list. This is deliberate — merging two argv lists whose flags may conflict is not well-defined. The kind's full-auto template from `herdr-kinds.md` is prepended by the spawner and is not part of `args`.

Under harness orchestration the `kind` values are inert (the harness spawns its own subagents), but the role/tier structure still applies: the adapter maps tier names to its own model classes or reasoning-effort settings, per `agent-runner.md`.

## Substrate semantics

### Availability

Herdr is **available** when either probe below succeeds, subject to `orchestration.detect`:

| Probe | Test | Meaning |
|---|---|---|
| `env` | `test "${HERDR_ENV:-}" = 1` | The orchestrator is running inside a herdr-managed pane. |
| `socket` | the herdr socket (`orchestration.socket`) exists and answers a read-only call | A herdr server is running and reachable. |

`detect = "env-or-socket"` (the default) means either probe suffices. `detect = "env"` and `detect = "socket"` restrict availability to that single probe. Probes are read-only: **never start a herdr server, workspace, or TUI as part of detection.** Bare `herdr` launches or attaches the TUI and must not be used to probe.

**The read-only call is `herdr status server`.** It reports `status: running`, the protocol version, and — usefully — the socket path the client actually resolved, so it doubles as the way to discover that path rather than assume it. `test -S <path>` alone is not the probe: a stale socket file outlives its server.

**Do not hardcode a socket path.** Herdr's own location has moved between releases; on herdr 0.8.0 the live socket is `~/.config/herdr/herdr.sock`, and the process environment inside a herdr pane exports it as `HERDR_SOCKET_PATH`. Resolve in this order: `orchestration.socket` if set → `$HERDR_SOCKET_PATH` → `~/.config/herdr/herdr.sock`. A config that pins the wrong path does not fail loudly; it fails as a *false negative*, degrading a perfectly healthy herdr to harness dispatch — which under `substrate = "auto"` is silent. This was reproduced in the epic-`ias` smoke test: with `detect = "socket"` and a hardcoded stale default, the decision procedure returned `harness` while the same procedure against the resolved path returned `herdr`.

### Decision table

| `substrate` | herdr available | Result |
|---|---|---|
| `auto` (default) | yes | herdr orchestration. Silent — no announcement needed. |
| `auto` | no | Harness orchestration via the active `<harness>-runner.md` adapter. Silent. |
| `herdr` | yes | herdr orchestration. |
| `herdr` | no | **Explicit degradation** — see below. The run continues under harness orchestration. |
| `harness` | either | Harness orchestration, always. Herdr is not probed and not used, even inside a herdr pane. |

### Explicit degradation

`substrate = "herdr"` with herdr unavailable **must not fail the run** and **must not degrade silently**. Before dispatching the first worker, the orchestrator states the degradation to the user in its own output — naming the requested substrate, the probe(s) that failed, and the adapter it is falling back to — and then proceeds under harness orchestration. For example:

> `.tick/runners.toml` requests `substrate = "herdr"`, but herdr is unavailable (`HERDR_ENV` is unset and the resolved socket `<path>` does not answer `herdr status server`). Falling back to harness orchestration via the Claude Code adapter for this run. Cross-vendor role routing in `[roles]` will not apply — every worker runs on the orchestrating harness.

Record the same fact durably where the run is recorded (a `tk note` on the epic, e.g. `runner-state: substrate=harness requested=herdr reason=herdr-unavailable`), so a later reader can tell configured intent from actual execution.

Three consequences of the fallback are worth stating to the user when they matter:

- Cross-vendor routing is lost — `roles.*.kind` values are inert under harness orchestration.
- Branch naming follows the harness adapter, not `worktree_branch_prefix`.
- Workers no longer outlive the orchestrator; harness subagents are child processes.

`substrate = "harness"` is *not* a degradation: it is a deliberate choice and needs no announcement.

## Worked examples

Each example below is complete and valid against `runners-config.schema.json`.

### 1. Single-vendor (Claude everywhere, tiers by model)

A Claude Code orchestrator running a Claude fleet through herdr when it is available, harness subagents otherwise. Tier variants map to model classes; the model strings here are dated examples — resolve them against what the harness offers today, as `agent-runner.md` requires.

```toml
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "auto"
max_parallel = 4

[roles.plan]
kind = "claude"
args = ["--model", "opus"]

[roles.scout]
kind = "claude"
args = ["--model", "haiku"]

[roles.implement]
kind = "claude"
args = ["--model", "sonnet"]

[roles.implement.tiers.economy]
args = ["--model", "haiku"]

[roles.implement.tiers.balanced]
args = ["--model", "sonnet"]

[roles.implement.tiers.strong]
args = ["--model", "opus"]

[roles.review]
kind = "claude"
args = ["--model", "opus"]

[roles.review.tiers.frontier]
args = ["--model", "opus"]

[roles.closeout]
kind = "claude"
args = ["--model", "sonnet"]
```

### 2. Cross-vendor (Codex implements, Claude reviews)

The case harness-native orchestration cannot express: implementation runs on a Codex subscription while review and planning run on Claude's frontier class. Codex tiers vary reasoning effort rather than model, per `codex-runner.md`. This requires herdr, so `substrate` is pinned — and the pin carries the explicit-degradation obligation above.

```toml
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "herdr"
detect = "env-or-socket"
max_parallel = 3
worktree_branch_prefix = "tick/"
full_auto = true

[roles.plan]
kind = "claude"
harness = "claude"
args = ["--model", "opus"]

[roles.scout]
kind = "codex"
harness = "codex"
args = ["--config", "model_reasoning_effort=\"low\""]

[roles.implement]
kind = "codex"
harness = "codex"
args = ["--config", "model_reasoning_effort=\"medium\""]

[roles.implement.tiers.economy]
args = ["--config", "model_reasoning_effort=\"low\""]

[roles.implement.tiers.balanced]
args = ["--config", "model_reasoning_effort=\"medium\""]

[roles.implement.tiers.strong]
args = ["--config", "model_reasoning_effort=\"high\""]

[roles.review]
kind = "claude"
harness = "claude"
args = ["--model", "opus"]

[roles.review.tiers.frontier]
kind = "claude"
args = ["--model", "opus"]

[roles.closeout]
kind = "claude"
harness = "claude"
args = ["--model", "sonnet"]
```

### 3. Forced harness (herdr installed but deliberately unused)

A repo that wants harness-native orchestration unconditionally — for example because CI runs the same config headlessly, where no herdr session exists. Herdr is never probed. The `[roles]` entries still carry tier structure, which the adapter maps onto its own model/effort settings; the `kind` values are inert here and document intent for the day the repo flips `substrate` back to `auto`.

```toml
version = 1

[orchestrator]
harness = "codex"

[orchestration]
substrate = "harness"
max_parallel = 2

[roles.implement]
kind = "codex"
harness = "codex"
args = ["--config", "model_reasoning_effort=\"medium\""]

[roles.implement.tiers.economy]
args = ["--config", "model_reasoning_effort=\"low\""]

[roles.implement.tiers.strong]
args = ["--config", "model_reasoning_effort=\"high\""]

[roles.review]
kind = "codex"
harness = "codex"
args = ["--config", "model_reasoning_effort=\"high\""]
```

## Authoring rules

- **Never invent kinds.** Only kinds the installed herdr reports (`herdr agent`) are valid at run time; the schema's pattern is a shape check, not a catalog.
- **Args are argv, not shell.** `["--model", "opus"]`, never `["--model opus"]`. Quoting inside a single argv element (as in Codex's `--config 'model_reasoning_effort="high"'`) is part of that element's value.
- **Omitting the model flag is legal and means "the kind's own default".** The Codex examples above carry a reasoning-effort `--config` and no `-m`, so the spawner passes no model and codex resolves `model` from `~/.codex/config.toml` — verified live. That is a deliberate choice, not an oversight: it keeps the config from pinning a model string that will age. Pin `-m`/`--model` in `args` only when a role must not follow the CLI's local default, and re-read [`herdr-kinds.md`](herdr-kinds.md)'s green-start trap before you do — a model string that the account cannot use starts green and does zero work.
- **Tier names are the contract**, model strings are not. Any model named in a config is a local, dated choice.
- **Keep `[roles.implement]` present.** It is the fallback for every unlisted role.
- **A config that fails schema validation is a stop, not a guess** — report the validation error and let the user fix it rather than falling back to defaults silently.
