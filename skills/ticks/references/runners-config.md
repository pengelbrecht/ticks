# `.tick/runners.toml` — runner routing configuration

Read [`agent-runner.md`](agent-runner.md) first for the runner-neutral contract and the capability-tier vocabulary. This file defines `.tick/runners.toml`: the per-repo configuration that decides **which substrate orchestrates a run** (herdr panes versus the harness's own subagent primitive) and **which worker serves each task role and tier**.

A worker is specified along **two explicit dimensions**, never as raw argv:

- **`kind`** — the harness dimension, herdr's `--kind` value (`claude`, `codex`, `gemini`, `pi`, …). The installed herdr binary is the authority on the valid list (`herdr agent`).
- **`model`** + optional **`effort`** — the capability dimension, in the kind's own model namespace plus a kind-neutral effort level.

The spawner compiles `model`/`effort` into that kind's native argv (`claude --model … --effort …`, `codex -m … -c model_reasoning_effort="…"`, `pi --model <provider>/<model>:<effort>`). The translation table, the model families each kind accepts, and the fail-closed rule for impossible combinations live in [`herdr-kinds.md`](herdr-kinds.md) → *[Model and effort translation](herdr-kinds.md#model-and-effort-translation)*; this document never restates them, nor the per-kind spawn and full-auto templates.

**Under the herdr substrate, "the spawner" is `tk herd spawn`.** It loads this file, resolves the role/tier cell, compiles the argv, refuses an impossible cell *before dialling herdr*, and passes the result through verbatim — so everything this document specifies about resolution order, argv order and fail-closed behaviour is enforced code, not a convention an orchestrator has to remember. `tk herd spawn --role <role> --tier <tier>` is where a config choice actually takes effect; see [`herdr-runner.md`](herdr-runner.md#the-helper-tk-herd). Under harness orchestration the same structure is read by the active adapter, which cannot enforce it the same way.

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
| `model` | string | Model id in that kind's namespace, e.g. `opus`. |
| `effort` | enum | Reasoning effort for the orchestrating model, e.g. `high`. |
| `args` | array of strings | Escape-hatch native args for that kind, appended after the compiled model/effort flags. |

### `[orchestration]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `substrate` | `"herdr"` \| `"harness"` \| `"auto"` | `"auto"` | Dispatch substrate. See [Substrate semantics](#substrate-semantics). |
| `detect` | `"env-or-socket"` \| `"env"` \| `"socket"` | `"env-or-socket"` | Which probes count as "herdr is available". |
| `socket` | string | `$HERDR_SOCKET_PATH`, else `~/.config/herdr/herdr.sock` | Socket path used by the `socket` probe. |
| `max_parallel` | integer ≥ 1 | adapter default | Concurrent workers per wave. |
| `worktree_branch_prefix` | string | `"tick/"` | Branch prefix for the worker branch (branch = `<prefix><tick-id>`). Read by `tk herd spawn` (to name the branch) and `tk herd reconcile` (to match branches to ticks), so neither hardcodes `tick/`. `cleanup` does **not** read it — it deletes the branch the manifest recorded at spawn, which is why changing the prefix mid-run still cleans up correctly. Ignored under harness orchestration — there the harness names branches. |
| `full_auto` | boolean | `true` | Start workers with their kind's full-auto arg template. When `false`, every approval prompt becomes a human escalation. |

### `[roles.<name>]`

Keys are role names matching `^[a-z][a-z0-9_-]*$`. Well-known roles: `plan`, `scout`, `implement`, `review`, `closeout`. Custom names are allowed. `[roles.implement]` is **required**; any role with no entry falls back to `implement`.

| Key | Type | Meaning |
|---|---|---|
| `kind` | string, required | herdr kind to spawn for this role — the harness dimension. |
| `model` | string | Model id **in that kind's namespace** (`opus`; `gpt-5.6-luna`; `openai-codex/gpt-5.6-sol`). Omitted means the kind's own default. Compiled into the kind's native model flag. |
| `effort` | `off` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` \| `max` | Reasoning/thinking effort, kind-neutral. Omitted means the kind's own default. Compiled into the kind's native mechanism. |
| `args` | array of strings | Escape hatch for anything the two dimensions do not express. Passed verbatim after `--` in `herdr agent start`, **appended after the compiled model/effort flags**. One argv element per entry — never a pre-joined shell string. |
| `harness` | string | Documentary note of the corresponding runner adapter. Routing uses `kind`. |
| `tiers.<economy\|balanced\|strong\|frontier>` | table | Per-tier overrides; each entry may set any of `kind`, `model`, `effort`, `args` (at least one). |

The tier names are the shared capability tiers from `agent-runner.md` — the contract is the tier name, not any model string.

Composed argv for a spawned worker is always, in order: the kind's full-auto template (from `herdr-kinds.md`, subject to `orchestration.full_auto`) → the flags compiled from `model`/`effort` → `args`.

**The effort enum is a union across kinds, not a per-kind guarantee.** `off` and `minimal` exist for pi but not for `claude --effort`; codex's accepted set belongs to the model, not the CLI. The schema checks the value's *shape*; the spawner checks whether this *kind* accepts it.

### Resolution order

For a tick with role R and chosen tier T:

1. `roles.R.tiers.T` if present → for **each** of `kind`, `model`, `effort`, `args` independently: the tier's value if it sets one, else the role's.
2. Otherwise `roles.R.kind` + `roles.R.model` + `roles.R.effort` + `roles.R.args`.
3. If role R has no entry, resolve against `implement` by the same two steps.

`kind`, `model` and `effort` are scalars, so field-wise override is well-defined: a tier that sets only `effort = "high"` keeps the role's kind and model. That is the point of splitting the dimensions out of `args` — the common case (same vendor, same model, different effort) stops requiring a restated argv list.

**Within one wave, the tier is the only per-tick routing knob.** Role comes from the tick (`tk create --role`), and the tracker only tags the *process* roles — `review` and `closeout`. Every implementation tick in a wave therefore resolves against `roles.implement`, so two same-wave ticks can only land on different kinds if they are assigned different tiers and those tiers override `kind`. That is supported and it is how the substrate's headline cross-vendor capability is exercised per tick:

```toml
[roles.implement]
kind = "codex"
model = "gpt-5.6-luna"
effort = "medium"

[roles.implement.tiers.economy]     # a tier may override the harness dimension too
kind = "claude"
model = "haiku"
```

Note that the economy tier had to restate `model`: crossing the `kind` boundary invalidates the inherited model, because model namespaces are per-kind. **A tier that changes `kind` and inherits a `model` from a different kind's family is the classic impossible cell** — see below.

Keep the tier's real meaning intact when you do this — the tier is chosen from the tick's difficulty per `agent-runner.md`, and picking a tier to reach a vendor rather than a capability level is how a hard tick ends up on a cheap model. If a repo wants vendor split along an axis that is *not* difficulty, that axis has to become a role the tracker can tag, and today it cannot.

**Args replace, they never merge.** A tier's `args` supersede the role's `args` wholesale. This is deliberate — merging two argv lists whose flags may conflict is not well-defined. It applies to `args` only: `model` and `effort` are scalars and override field-wise (above). The kind's full-auto template from `herdr-kinds.md` is prepended by the spawner and is not part of `args`.

### Shape versus compatibility

`runners-config.schema.json` validates the **shape** of a config: that `kind`/`model` look like identifiers, that `effort` is one of the known levels, that no unknown keys are present. It cannot validate **compatibility** — whether *this* kind can run *that* model — because model families are open-ended and change with every vendor release, so enumerating them in a schema would guarantee a schema that is wrong within weeks.

Compatibility is therefore enforced by the **spawner, at spawn time**, and it fails closed: an impossible cell (`kind = "claude"` with `model = "gpt-5.6-luna"`) is a config error the orchestrator must refuse with a message naming the role/tier, kind and model. It must **never** silently reroute to a kind that would accept the model, and never drop the model to fall back on the CLI's default. `herdr-kinds.md` → *[Fail closed on an impossible cell](herdr-kinds.md#fail-closed-on-an-impossible-cell)* carries the rule, the per-kind accepted families, and the message form. A config that passes the schema is not thereby routable.

Under herdr, `tk herd spawn` performs that check, verified live against herdr 0.8.0, 2026-08: a `[roles.review]` of `kind = "claude"` with `model = "gpt-x"` exits 1 with the documented message, writes no plan to stdout, creates no branch and no manifest, and makes **zero herdr calls** — the routing is compiled before the socket is dialled, so a refusal cannot leave a half-made workspace behind. That is a dated observation of one build, not a protocol guarantee.

Under harness orchestration the `kind` values are inert (the harness spawns its own subagents), but the role/tier structure still applies: the adapter maps tier names to its own model classes or reasoning-effort settings, per `agent-runner.md`. `model`/`effort` are hints there, not commands — a harness cannot spawn another vendor's model.

## Substrate semantics

### Availability

Herdr is **available** when either probe below succeeds, subject to `orchestration.detect`:

| Probe | Test | Meaning |
|---|---|---|
| `env` | `test "${HERDR_ENV:-}" = 1` | The orchestrator is running inside a herdr-managed pane. |
| `socket` | the herdr socket (`orchestration.socket`) exists and answers a read-only call | A herdr server is running and reachable. |

`detect = "env-or-socket"` (the default) means either probe suffices. `detect = "env"` and `detect = "socket"` restrict availability to that single probe. Probes are read-only: **never start a herdr server, workspace, or TUI as part of detection.** Bare `herdr` launches or attaches the TUI and must not be used to probe.

**The read-only call is `herdr status server`.** It reports `status: running`, the protocol version, and — usefully — the socket path the client actually resolved, so it doubles as the way to discover that path rather than assume it. To probe a *configured* path rather than the client default, set the environment for the call: `HERDR_SOCKET_PATH=<orchestration.socket> herdr status server`. `test -S <path>` alone is not the probe: a stale socket file outlives its server.

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
model = "opus"
effort = "high"

[roles.scout]
kind = "claude"
model = "haiku"
effort = "low"

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "medium"

[roles.implement.tiers.economy]
model = "haiku"
effort = "low"

[roles.implement.tiers.balanced]
effort = "medium"          # inherits model = "sonnet" from the role

[roles.implement.tiers.strong]
model = "opus"
effort = "high"

[roles.review]
kind = "claude"
model = "opus"
effort = "high"

[roles.review.tiers.frontier]
effort = "max"             # same model, more effort

[roles.closeout]
kind = "claude"
model = "sonnet"
```

Compiled argv for the `strong` tier of `implement`, per `herdr-kinds.md`: `--permission-mode bypassPermissions --model opus --effort high`.

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
model = "opus"
effort = "high"

[roles.scout]
kind = "codex"
harness = "codex"
model = "gpt-5.6-luna"
effort = "low"

[roles.implement]
kind = "codex"
harness = "codex"
model = "gpt-5.6-luna"
effort = "medium"

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.balanced]
effort = "medium"

[roles.implement.tiers.strong]
effort = "high"

[roles.review]
kind = "claude"
harness = "claude"
model = "opus"
effort = "high"

[roles.review.tiers.frontier]
kind = "claude"
model = "opus"
effort = "max"

[roles.closeout]
kind = "claude"
harness = "claude"
model = "sonnet"
```

The codex tiers now vary a single scalar instead of restating a `--config` argv element — and the awkward embedded quoting (`model_reasoning_effort=\"high\"`) is the spawner's problem, not the config author's. Compiled argv for `implement` at `strong`: `-a never -s workspace-write -m gpt-5.6-luna -c model_reasoning_effort="high"`.

Note this example now **pins** codex's model, which the authoring rules below warn ages badly. That is the honest trade of the model dimension: when you name a model you own keeping it current. Omit `model` entirely (keeping `effort`) to keep codex resolving `model` from `~/.codex/config.toml` — example 3 does exactly that.

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
effort = "medium"          # no `model` — codex resolves it from ~/.codex/config.toml

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.strong]
effort = "high"

[roles.review]
kind = "codex"
harness = "codex"
effort = "high"
```

### 4. Cross-provider through pi

A single `pi` kind covering every role, routing across providers by model id rather than by kind. Pi takes a provider-qualified id and carries effort as a `:<thinking>` suffix, so one kind spans vendors that `claude` and `codex` cannot reach individually — but the model ids must exist in the local pi's provider set (`pi --list-models`), and pi is not yet round-tripped as a tick implementer (see `herdr-kinds.md` → *Adding a kind*).

```toml
version = 1

[orchestrator]
harness = "pi"
kind = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"

[orchestration]
substrate = "herdr"
max_parallel = 4

[roles.plan]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"

[roles.scout]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "low"

[roles.implement]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "medium"

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.strong]
effort = "high"

[roles.implement.tiers.frontier]
model = "anthropic/claude-opus-4-6"   # cross-provider within one kind
effort = "max"

[roles.review]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"
```

Compiled argv for `implement` at `frontier`: `--model anthropic/claude-opus-4-6:max`. The same pair under `kind = "claude"` would be an impossible cell (`anthropic/claude-opus-4-6` is not a name `claude --model` takes) — the cell's validity is a property of the *kind*, which is exactly why compatibility cannot live in the schema.

## Negative cases

These are the failures a config author should expect, and where each one is caught.

### Caught by the schema (a stop before anything spawns)

| Config | Why it fails |
|---|---|
| `effort = "ultra"` | Not in the effort enum. |
| `effort = "High"` | Enum values are lowercase; no case folding. |
| `effort = 3` | Effort is a string, not an integer. |
| `model = "sonnet:high"` | `:` is rejected in `model`. Pi's `model:thinking` shorthand is what the spawner *emits*, not what the config carries — put the level in `effort`. |
| `model = ""` | Empty model. Omit the key to mean "the kind's default". |
| `[roles.implement.tiers.strong]` with no keys | A tier must set at least one of `kind`/`model`/`effort`/`args`. |
| `[roles.implement] models = "opus"` | `additionalProperties: false` — a typo'd key is an error, never a silently ignored one. |
| `[roles.implement.tiers.turbo]` | Not one of the four tier names. |

### Caught by the spawner (shape-valid, still unroutable)

| Config | Why it fails |
|---|---|
| `kind = "claude"`, `model = "gpt-5.6-luna"` | **Impossible cell.** Valid shape, incompatible pair. Refuse the spawn naming role/tier, kind and model; never reroute to codex, never drop the model. |
| `kind = "claude"`, `effort = "minimal"` | `claude --effort` accepts `low…max` only. The enum is a union across kinds. |
| `kind = "codex"`, `model = "gpt-9-imaginary"` | Well-formed, non-existent. This is the [green-start trap](herdr-kinds.md#the-green-start-trap): the pane starts green and does zero work. |
| `model = "opus"` **and** `args = ["--model", "sonnet"]` | `args` restates a compiled flag. Duplicate/conflicting argv — a config error, not a precedence puzzle. |
| `kind = "frobnicator"` | Shape-valid kind name the installed herdr does not know (`herdr agent`). |

The dividing line is the same one stated under [Shape versus compatibility](#shape-versus-compatibility): the schema knows the file format, only the spawner knows the vendor.

## Authoring rules

- **Never invent kinds.** Only kinds the installed herdr reports (`herdr agent`) are valid at run time; the schema's pattern is a shape check, not a catalog.
- **Use `model`/`effort`, not `args`, for model and effort.** They are the two dimensions the spawner understands; `args` is the escape hatch for everything else (`--add-dir`, `--search`, a `-c` override with no field of its own). A config that reaches for `args` to set a model gets no compatibility checking and risks duplicating a compiled flag.
- **Args are argv, not shell.** `["--add-dir", "/x"]`, never `["--add-dir /x"]`. Quoting inside a single argv element (as in Codex's `--config 'foo="bar"'`) is part of that element's value.
- **Omitting `model` is legal and means "the kind's own default".** Example 3 above carries `effort` and no `model`, so the spawner passes no model flag and codex resolves `model` from `~/.codex/config.toml` — verified live. That is a deliberate choice, not an oversight: it keeps the config from pinning a model string that will age. Set `model` only when a role must not follow the CLI's local default, and re-read [`herdr-kinds.md`](herdr-kinds.md)'s green-start trap before you do — a model string that the account cannot use starts green and does zero work.
- **Model strings live in the kind's namespace.** `opus` means something to `claude` and nothing to `codex`; `openai-codex/gpt-5.6-sol` means something to `pi` and nothing to either. Changing a tier's `kind` obliges you to restate its `model`.
- **Tier names are the contract**, model strings are not. Any model named in a config is a local, dated choice.
- **Keep `[roles.implement]` present.** It is the fallback for every unlisted role.
- **A config that fails schema validation is a stop, not a guess** — report the validation error and let the user fix it rather than falling back to defaults silently. **A config that passes the schema but hits an impossible cell at spawn time is equally a stop** — see [Shape versus compatibility](#shape-versus-compatibility).
