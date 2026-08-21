# `.tick/runners.toml` — runner routing configuration

Read [`agent-runner.md`](agent-runner.md) first for the runner-neutral contract and the capability-tier vocabulary. This file defines `.tick/runners.toml`: the per-repo configuration that decides **which substrate orchestrates a run** (herdr panes versus the harness's own subagent primitive), **which worker serves each task role and tier**, and **which commands a run may execute, in which phase**.

Two kinds of thing live here, and the dividing line is the working rule from the config-migration epic: *if a program parses it and a mistake fails closed, it needs a schema; if a model reads it, markdown is right.* Routing (`[orchestrator]`, `[orchestration]`, `[roles]`) and the run's command surface (`[testing]`, `[evidence]`, `[evidence.acceptance]`, `[environment]`) are both parsed and both fail closed, so both are schema-validated here. Genuine prose — the `Rules` an implementer reads verbatim into its prompt — stays in `.tick/config.md`.

A worker is specified along **two explicit dimensions**, never as raw argv:

- **`kind`** — the harness dimension, herdr's `--kind` value (`claude`, `codex`, `gemini`, `pi`, …). The installed herdr binary is the authority on the valid list (`herdr agent`).
- **`model`** + optional **`effort`** — the capability dimension, in the kind's own model namespace plus a kind-neutral effort level.

The spawner compiles `model`/`effort` into that kind's native argv (`claude --model … --effort …`, `codex -m … -c model_reasoning_effort="…"`, `pi --model <provider>/<model>:<effort>`, `opencode --model <provider>/<model>` with no effort form at all). The translation table, the model families each kind accepts, and the fail-closed rule for impossible combinations live in [`herdr-kinds.md`](herdr-kinds.md) → *[Model and effort translation](herdr-kinds.md#model-and-effort-translation)*; this document never restates them, nor the per-kind spawn and full-auto templates.

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

That snippet checks **shape**. Three whole-file rules about commands sit outside what a JSON Schema can express and must be checked too — see [Caught by the config loader](#caught-by-the-config-loader). In this repo `scripts/verify-runners-config.py` does both layers for a file (`uv run --with jsonschema python scripts/verify-runners-config.py .tick/runners.toml`) and, run with no argument, self-tests the schema and validates every TOML block in this document.

## File shape

```text
version = 2                 # optional; 1 or 2 — 2 once any command table is present

[orchestrator]              # optional — preferred home for the orchestrator role
[orchestration]             # optional — substrate selection and dispatch limits
[roles.<name>]              # required — at least [roles.implement]
[roles.<name>.tiers.<tier>] # optional — per-tier overrides

[testing]                   # optional — notes; commands implementers run
[testing.commands]          #            <id> = { command = "...", description = "..." }
[evidence]                  # optional — notes; commands CLOSEOUT MAY RUN, nobody else
[evidence.commands]         #            same shape as testing.commands
[evidence.acceptance]       # optional — A<n> = "<command id>"
[environment]               # optional — notes; run-start pre-flight checks
[environment.commands]      #            same shape as testing.commands

[sandbox]                   # optional — the sandbox this repo's runs get
                            #            image / toolchain / setup
```

### `version`, and what an older reader does with a newer file

`version` is the format version the file is written for. Omitted means `1`. There are two:

| Version | Introduced | A file must declare it when |
|---|---|---|
| 1 | the original routing config | never — it is the default |
| 2 | the command surface | any of `[testing]`, `[evidence]`, `[environment]` is present |

The field exists for exactly one job, and the job was learned the hard way. On 2026-08-19 a repo migrated to the command surface and every checkout still running the previous release broke: the older `tk` did not know the three new tables, its `additionalProperties: false` rule was working perfectly, and so every `tk herd` command died with *"57 validation errors: environment.commands: unknown key; …"* — a wall of text naming no cause and no fix. The compatibility direction everyone had designed for (a new reader reading an old file) was fine; the mirror image was not.

So a reader **checks `version` before it checks shape**:

- A file declaring a version the reader understands is validated exactly as before — unknown keys still fail closed, because within a known version a typo is a typo.
- A file declaring a **newer** version is refused with one line, and nothing else is reported: `.tick/runners.toml is version 2 and this tk understands version 1; upgrade tk (tk upgrade)`. Listing the keys a reader is too old to know is never the report; it describes the reader's age as if it were the file's mistake.
- A file that carries the version 2 tables but still declares `version = 1` is **read**, not refused. The under-declaration is the writer's mistake, and every repo migrated before this gate shipped has it; refusing would break them a second way. `tk config migrate` raises the version — it is the one command that fixes an already-migrated file — and says which `tk` release every other checkout then needs.

Raise the version only when the content requires it: a routing-only file stays at 1, because a file an older `tk` can read is one it should be allowed to read.

### `[orchestrator]`

Advisory. Whichever agent is executing the run *is* the orchestrator; this section records which harness/kind the repo's configuration was written for, so a mismatch can be reported rather than silently changing routing. At least one of `harness` or `kind` must be present.

| Key | Type | Meaning |
|---|---|---|
| `harness` | string | Runner adapter that plays orchestrator: `claude`, `codex`, `pi`, `prime` (see the matching `<harness>-runner.md`). |
| `kind` | string | herdr kind to use if the orchestrator itself is ever spawned into a pane. |
| `model` | string | Model id in that kind's namespace, e.g. `opus`. See [Model id shape](#model-id-shape). |
| `effort` | enum | Reasoning effort for the orchestrating model, e.g. `high`. |
| `args` | array of strings | Escape-hatch native args for that kind, appended after the compiled model/effort flags. |

### `[orchestration]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `substrate` | `"herdr"` \| `"harness"` \| `"auto"` | `"auto"` | Dispatch substrate. See [Substrate semantics](#substrate-semantics). |
| `detect` | `"env-or-socket"` \| `"env"` \| `"socket"` | `"env-or-socket"` | Which probes count as "herdr is available". |
| `socket` | string | `$HERDR_SOCKET_PATH`, else `~/.config/herdr/herdr.sock` | Socket path used by the `socket` probe. |
| `max_parallel` | integer ≥ 1 | adapter default | Concurrent workers per wave. **Enforced, not advisory**: `tk` refuses a claim (`tk update --status in_progress`) or a `tk herd spawn` that would exceed it with exit 8, naming the ticks holding the slots. A slot is held by every in_progress non-epic child of the epic and freed by closing or releasing one. `tk graph --json` reports the width, the free slots and `dispatch.now` under `dispatch`. Unset means no cap. |
| `worktree_branch_prefix` | string | `"tick/"` | Branch prefix for the worker branch (branch = `<prefix><tick-id>`). Read by `tk herd spawn` (to name the branch) and `tk herd reconcile` (to match branches to ticks), so neither hardcodes `tick/`. `cleanup` does **not** read it — it deletes the branch the manifest recorded at spawn, which is why changing the prefix mid-run still cleans up correctly. Ignored under harness orchestration — there the harness names branches. |
| `full_auto` | boolean | `true` | Start workers with their kind's full-auto arg template. When `false`, every approval prompt becomes a human escalation. |

### `[roles.<name>]`

Keys are role names matching `^[a-z][a-z0-9_-]*$`. Well-known roles: `plan`, `scout`, `implement`, `review`, `closeout`. Custom names are allowed. `[roles.implement]` is **required**; any role with no entry falls back to `implement` **at spawn time** — see [Resolution order](#resolution-order) for the one place that fallback deliberately stops.

| Key | Type | Meaning |
|---|---|---|
| `kind` | string, required | herdr kind to spawn for this role — the harness dimension. |
| `model` | string | Model id **in that kind's namespace** (`opus`; `gpt-5.6-luna`; `openai-codex/gpt-5.6-sol`; `workers-ai/@cf/openai/gpt-oss-120b`). Omitted means the kind's own default. Compiled into the kind's native model flag. See [Model id shape](#model-id-shape). |
| `effort` | `off` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` \| `max` | Reasoning/thinking effort, kind-neutral. Omitted means the kind's own default. Compiled into the kind's native mechanism. |
| `args` | array of strings | Escape hatch for anything the two dimensions do not express. Passed verbatim after `--` in `herdr agent start`, **appended last — after the kind's computed per-spawn extras and the compiled model/effort flags**. One argv element per entry — never a pre-joined shell string. |
| `harness` | string | Documentary note of the corresponding runner adapter. Routing uses `kind`. |
| `tiers.<economy\|balanced\|strong\|frontier>` | table | Per-tier overrides; each entry may set any of `kind`, `model`, `effort`, `args` (at least one). |

The tier names are the shared capability tiers from `agent-runner.md` — the contract is the tier name, not any model string.

**Args order matters.** Composed argv for a spawned worker is always, in order: the kind's full-auto template (from `herdr-kinds.md`, subject to `orchestration.full_auto`) → the kind's **computed per-spawn extras** → the flags compiled from `model`/`effort` → `args`.

The computed extras are the one position that comes from neither the config file nor the kind's static template: they are argv a kind needs that only the *repository* can name, rendered at spawn time. Today there is exactly one — codex's `--add-dir <git-common-dir>`, which keeps a sandboxed worker able to write the git metadata of its own linked worktree (see [`herdr-kinds.md`](herdr-kinds.md#codex)). They sit next to the full-auto template because they belong to the same question, *what may this worker touch*, and they are **not** gated on `full_auto`. A kind that declares an extra and cannot render it is a spawn-time refusal, not an argv silently missing an element.

**The effort enum is a union across kinds, not a per-kind guarantee.** `off` and `minimal` exist for pi but not for `claude --effort`; codex's accepted set belongs to the model, not the CLI; **opencode has no effort mechanism at all**, so every level is refused there and a tier ladder has to be built from `model` instead. The schema checks the value's *shape*; the spawner checks whether this *kind* accepts it — including whether it has anywhere to put it.

### Resolution order

For a tick with role R and chosen tier T:

1. `roles.R.tiers.T` if present → for **each** of `kind`, `model`, `effort`, `args` independently: the tier's value if it sets one, else the role's.
2. Otherwise `roles.R.kind` + `roles.R.model` + `roles.R.effort` + `roles.R.args`.
3. If role R has no entry, resolve against `implement` by the same two steps.

**Step 3 is a spawner rule, and a consumer whose role fails closed must not apply it.** `tk herd spawn` has to produce a worker, so an unlisted role resolving to `implement` is the right answer there. A *gate* that refuses to run on a defaulted model needs the opposite answer: the pi extension reads `plan`, `scout`, `review` and `closeout` only from their own explicit tables, leaves the key unset when the table is absent, and blocks — so a repo that migrates without writing `[roles.review]` gets the same stop its `## Pi Orchestrator` block gave when it had no `review_model` line, rather than a final review quietly running on the economy implement model. Its one fallback is closeout to the planner model. Anything that spawns from this file should say explicitly which of the two rules it applies.

`kind`, `model` and `effort` are scalars, so field-wise override is well-defined: a tier that sets only `effort = "high"` keeps the role's kind and model. That is the point of splitting the dimensions out of `args` — the common case (same vendor, same model, different effort) stops requiring a restated argv list.

**Within one wave, the tier is the only per-tick routing knob.** Role comes from the tick (`tk create --role`), and the tracker only tags the *process* roles — `review` and `closeout`. Every implementation tick in a wave therefore resolves against `roles.implement`, so two same-wave ticks can only land on different kinds if they are assigned different tiers and those tiers override `kind`. That is supported and it is how the substrate's headline cross-vendor capability is exercised per tick:

```toml
# fragment
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

### One table, one kind per reader

`[roles]` is one table and more than one program reads it. `tk herd spawn` compiles a cell into a herdr spawn of that `kind`. The **pi extension** (`extensions/ticks-runner`, the runner adapter behind `/ticks-plan` and `/ticks-run`) compiles the same cell into `pi --provider/--model/--thinking` and spawns that subprocess itself. Because `model` lives **in the kind's own namespace**, a cell only means anything to the reader that dispatches that kind: `sonnet` is a `claude` id, `gpt-5.6-luna` is a `codex` id, and neither is a name `pi --model` takes.

So **one `[roles]` table cannot carry a herdr routing and a pi routing at the same time.** It carries the kind's, and a second reader may not help itself to the model string with the kind dropped.

**A reader that dispatches a kind reads only cells of that kind, and fails closed on the rest.** The pi extension refuses any role or tier whose `kind` is not `pi`: it derives no model from that cell, reports the mismatch naming the cell, the kind and the model it would otherwise have passed, and blocks the run — a config it cannot read authorizes nothing, exactly as for the whole-file rules below. It does **not** quietly leave the model unset and let `pi` pick its own default; that is the same silent substitution the spawner refuses for an impossible cell.

```text
roles.implement.tiers.balanced: kind = "codex", but this runner spawns `pi` and a model
id is in its own kind's namespace — refusing to derive implement_balanced_model =
"gpt-5.6-luna:max" from a codex role rather than hand a codex id to `pi
--provider/--model`. Give the role `kind = "pi"` and a pi model id, or run this epic
through `tk herd spawn`, the reader a codex role is written for.
```

Four things follow, and each has bitten:

- **This is a reader rule, not a file rule.** A `[roles]` table of `claude`/`codex` cells is a perfectly valid config; it is simply not addressed to the pi reader. The refusal names the reader, never the file's validity — see [Caught by a reader](#caught-by-a-reader-valid-for-one-kind-refused-by-another).
- **The deprecated `## Pi Orchestrator` block is unaffected.** It named no kind because its heading was the kind; every key in it is pi routing by construction and still resolves. The refusal exists precisely because the TOML that replaced it is a *shared* table — a migration can retarget those keys to another reader without changing a single model string's meaning to the reader they were written for.
- **`harness` does not license a kind.** Routing is `kind` (see [`[roles.<name>]`](#rolesname)); `harness = "pi"` on a `kind = "claude"` role is a documentary note on a claude cell, and the pi reader still refuses it.
- **`TICKS_PI_*_MODEL` does not rescue a refused config.** The environment still wins over the file for an individual key, but the refusal is a config error, and a run never starts on a config that produced one. Fix the file or run the epic under the substrate its `[roles]` table is for.

A repo that wants a herdr fleet of `claude`/`codex` workers **and** the pi extension's own planning and process gates cannot express both here today. It has to pick which substrate its `[roles]` table is for, and record the choice — a per-substrate routing shape is the only thing that would remove the constraint, and it does not exist yet.

### Model id shape

A model id is one or more `/`-separated segments:

```text
model     ::= segment ( "/" segment )*
segment   ::= "@"? [A-Za-z0-9] [A-Za-z0-9_.+-]*
```

as the `Model` pattern `^@?[A-Za-z0-9][A-Za-z0-9_.+-]*(/@?[A-Za-z0-9][A-Za-z0-9_.+-]*)*$`. That covers a bare alias (`opus`), a vendor id (`gpt-5.6-luna`), a cross-provider id (`openai-codex/gpt-5.6-sol`) and a provider namespace carried inside the id itself.

**A segment may lead with `@`.** Some namespaces are part of the model id, not decoration a config invents: **every** Workers AI model is `@cf/<vendor>/<name>`, so the provider-qualified form is `workers-ai/@cf/openai/gpt-oss-120b` and a repo routed at Workers AI has no other way to name its model. `@` is legal in that one position and nowhere else — `workers-ai/cf@openai/…` and `workers-ai/@/…` are both rejected, so the id stays a real constraint rather than a string with a hole in it.

**A `:` is still rejected.** Effort is its own key; pi's `model:thinking` shorthand is what the spawner *emits*, never what the config carries.

The pattern is enforced in four places that must agree — `runners-config.schema.json`, the Go loader (`internal/herd/config`), the Python reference validator (`scripts/verify-runners-config.py`, which reads the schema) and the pi extension (`extensions/ticks-runner/config.ts`) — because a file that one reader accepts and another rejects is worse than a file both refuse.

### Shape versus compatibility

`runners-config.schema.json` validates the **shape** of a config: that `kind`/`model` look like identifiers, that `effort` is one of the known levels, that no unknown keys are present. It cannot validate **compatibility** — whether *this* kind can run *that* model — because model families are open-ended and change with every vendor release, so enumerating them in a schema would guarantee a schema that is wrong within weeks.

Compatibility is therefore enforced by the **spawner, at spawn time**, and it fails closed: an impossible cell (`kind = "claude"` with `model = "gpt-5.6-luna"`) is a config error the orchestrator must refuse with a message naming the role/tier, kind and model. It must **never** silently reroute to a kind that would accept the model, and never drop the model to fall back on the CLI's default. `herdr-kinds.md` → *[Fail closed on an impossible cell](herdr-kinds.md#fail-closed-on-an-impossible-cell)* carries the rule, the per-kind accepted families, and the message form. A config that passes the schema is not thereby routable.

Under herdr, `tk herd spawn` performs that check, verified live against herdr 0.8.0, 2026-08: a `[roles.review]` of `kind = "claude"` with `model = "gpt-x"` exits 1 with the documented message, writes no plan to stdout, creates no branch and no manifest, and makes **zero herdr calls** — the routing is compiled before the socket is dialled, so a refusal cannot leave a half-made workspace behind. That is a dated observation of one build, not a protocol guarantee.

Under harness orchestration the `kind` values are inert (the harness spawns its own subagents), but the role/tier structure still applies: the adapter maps tier names to its own model classes or reasoning-effort settings, per `agent-runner.md`. `model`/`effort` are hints there, not commands — a harness cannot spawn another vendor's model.

## What a run may execute

Three tables carry commands, and **the table a command sits in is its authorisation** — there is no `phase` key, no `closeout_only` boolean, nothing a typo can flip:

| Table | Who runs it | When |
|---|---|---|
| `[testing.commands]` | implementers, per-tick verifiers, post-wave gates, final-review tests | any time |
| `[evidence.commands]` | the close-out tick, and nothing else | close-out only |
| `[environment.commands]` | the orchestrator | once, at run start, before wave 1 |

Each table maps a **command id** to a command:

```toml
# fragment
[testing.commands]
go = { command = "go test -short -count=1 ./...", description = "Go suite, short mode" }
```

`command` is run verbatim: one shell string, no template, no prose riding along, no control characters. `description` is a human label and is never executed or matched against. Ids match `^[a-z0-9][a-z0-9_-]*$` and are **unique across all three tables** — see [Caught by the config loader](#caught-by-the-config-loader).

A keyed table rather than an array of entries is the point of moving here from markdown: the id is a TOML key, so a duplicate id is a parse error before validation runs, and `[evidence.acceptance]` gets something stable to point at that is not the command's own text.

### `[testing]`

| Key | Type | Meaning |
|---|---|---|
| `notes` | string | Free-text caveats that are *not* commands — "this suite fails locally without a git identity", "the full worker suite has a known boot crash, run the targeted files". Read by a human or a model; never parsed, never executed. |
| `commands` | table | Command id → command. Handed to implementers. |

`notes` exists so the narrative hints do not have to leave the structured file to stay useful. A repo that moves its commands here and its caveats to some other file ends up with a stale copy of the caveats. **Prose is not authority:** a command mentioned only in `notes` is not authorised to run — only a command table authorises shell.

### `[evidence]`

Same two keys as `[testing]`, plus `acceptance`. Its commands are **close-out only**. This is the pre-existing rule from `agent-runner.md`, kept intact: an evidence command must never be run by an implementer, a per-tick verifier, a post-wave gate, or final-review tests. The separation is structural — a command is in `[testing.commands]` or in `[evidence.commands]`, never both (the loader rejects a config where the same command string appears in both), so there is no way to widen an evidence command's authorisation short of moving it and saying so in the diff.

### `[evidence.acceptance]`

The acceptance-item-to-command authorisation table: one acceptance item id to the id of the one command that proves it.

```toml
# fragment
[evidence.acceptance]
A1 = "package-rpc"        # an id in evidence.commands
A2 = "go"                 # or in testing.commands
```

Item ids match `^A[1-9][0-9]{0,2}$` — the `A<n>` written in the tick's acceptance criteria. The value is a command id defined in `[testing.commands]` or `[evidence.commands]`; **`[environment.commands]` is not an authorisation source** — a pre-flight check is not evidence.

This table replaces the markdown format's verbatim-and-uniquely-matching apparatus, and it is worth being precise about what changed and what did not:

- **Gone, because structure supplies it.** Exactly-one-mapping-per-item: an item is a key, so a duplicate is a TOML parse error. Repeating the command text verbatim so it can be matched: the value is an id, so there is nothing to match. Ambiguity from a command appearing twice: ids are unique, and one command string belongs to one table.
- **Unchanged, because it is semantics, not parsing.** An item whose reference names no command in the file is a **stop**, never a degradation to running something generic. An acceptance item with no mapping is unverified and leaves close-out and the epic open. And **nothing outside this file authorises shell** — not a tick description, not tracker prose, not a model's suggestion, not a command a worker read in a log. Cross-item evidence (running A2's command for A1) is still wrong; the mapping is the authority for which item a command proves.

### `[environment]`

Same two keys as `[testing]`. These are the run-start pre-flight checks: each one **tests** a precondition rather than asking a human about it (`which go`, `pg_isready -h localhost`, `git config user.email`). Run them once, before wave 1; on a failure, surface it to the user and stop — do not start a wave on a broken environment.

### Caught by the config loader

Three rules span tables, and JSON Schema has no referential integrity, so the schema cannot express them. They are **normative and fail closed** exactly like the schema's own rules, and a config that breaks one is a stop, not a warning:

| Rule | Why | Failure |
|---|---|---|
| A command id is defined in **at most one** of `testing.commands`, `evidence.commands`, `environment.commands`. | The id is the namespace an acceptance mapping resolves in; a collision makes the authorised phase of a command ambiguous. | `evidence.commands.<id>: command id is already defined in testing.commands` |
| A command **string** appears in at most one of those three tables. | This is what the markdown format's "must exist verbatim and *uniquely*" was protecting: a command reachable from two phases lets an implementer run a close-out-only command. | `evidence.commands.<id>: command is already authorised as testing.commands.<other>` |
| Every `[evidence.acceptance]` value names an id defined in `testing.commands` or `evidence.commands`. | Nothing outside this file authorises shell; an unresolvable reference has no command to run. | `evidence.acceptance.A1: "package-rcp" is not a command defined in testing.commands or evidence.commands` |

This is the same division of labour the file already draws for routing — the schema knows the format, the spawner knows the vendor, and the loader knows the file as a whole. In this repo the loader is the one behind `tk herd spawn`, and `scripts/verify-runners-config.py` is a standalone reference implementation of both layers (`uv run --with jsonschema python scripts/verify-runners-config.py .tick/runners.toml`).

## The sandbox a run gets

`[sandbox]` is the per-repo sandbox definition: what a run's container is, on top of the batteries-included base image. Everything in it is optional, and **the 99% path declares nothing** — the base image covers the common toolchain set, and a repo that needs more says so here instead of forcing a factory-wide image rebuild.

```toml
# fragment
[sandbox]
image = "registry.example.com/acme/ticks-orchestrator:0.32.0"
toolchain = ["rust@1.90.0", "python@3.13"]
setup = [
  { command = "pnpm --dir cloud/factory install --frozen-lockfile", description = "warm the pnpm store" },
  { command = "go mod download" },
]
```

| Key | Meaning |
|---|---|
| `image` | Image reference the sandbox boots. Absent means the version-pinned base image. `tk sandbox image` prints the resolved reference; `--declared-only` prints one only when the repo declares it. |
| `toolchain` | Extra `tool@version` pins provisioned through the version manager the base image already ships, into the project's persistent cache — resolved on first run, warm after. The version is required: an unpinned tool makes the warm sandbox and the cold one different environments. Ecosystem pins the image reads on its own (`go.mod`, `package.json`'s `packageManager`, `.node-version`, `.tool-versions`) do **not** belong here. |
| `setup` | Idempotent, cache-populating commands run once per sandbox, in order, after the checkout and before the harness starts. An array, not a keyed table: order is the contract and nothing refers to a setup command by id. |

### Why setup lives here and nowhere else

`setup` runs arbitrary shell inside a sandbox that holds the run's gateway credential and its GitHub token, before any worker exists. So it comes from the **tracked, PR-reviewed config file at the submitted SHA** — and from nowhere else: never a tick note, a model's suggestion, a signal payload, an API parameter or an environment variable. Adding capability to a sandbox is a pull request, not a dashboard click, which is the same rule the cloud design applies to webhook sources.

This is also the gap `[environment]` deliberately cannot close. An Environment check is **verification only** — *test, don't ask* — and a check that installs something is not a check. `setup` provisions; `[environment]` then decides whether the result is good enough to start a wave.

### What runs it, and what "once" means

One implementation serves both substrates, so a local worker warms identically to a cloud one:

- **Cloud.** The sandbox entrypoint runs `tk sandbox setup` after cloning the submitted SHA and before starting the harness. A failing setup command stops the boot with exit 6 — deliberately not best effort, because a wave started on a half-provisioned sandbox fails in every worker, at model prices.
- **Local.** `tk herd spawn` runs the same code on the freshly created worktree, between `worktree.create` and `agent.start`. `setup` only: `image` and `toolchain` describe a container, and a local worker runs on the developer's own machine, whose toolchain is not this file's to install. `[environment.commands]` is what tells a developer their machine is missing something.

*Once* is **once per checkout**: the record of what ran lives in the checkout's git directory — never in the worktree, where it would land in a worker's `git add -A` — so a fresh clone or a new worker worktree warms again (its working tree is as cold as its caches are warm), and a repeat call in the same checkout does nothing. The record is a fingerprint of the declared commands, so editing them re-warms. Commands must be idempotent regardless: the record buys time, never correctness, and a failed setup leaves none.

### Rules the loader enforces

| Rule | Why |
|---|---|
| A `setup` command string may not also appear in `testing`/`evidence`/`environment` commands. | The same whole-file rule those three already share: a command belongs to exactly one phase. |
| A tool may be pinned once. | `["rust@1.90.0", "rust@1.91.0"]` is an ambiguous sandbox; the version manager would silently pick one. |
| Unknown keys are errors, as everywhere else in this file. | A typo'd key in the one table that runs shell before any worker exists must fail closed, not be ignored. |

### What is not implemented yet

`image` is validated, resolved and reported, but **the control plane does not yet boot a declared image**: it chooses one before it has a checkout to read, so honouring `sandbox.image` needs a read of the tracked config at the submitted SHA before boot. Until then the container is told which image it actually got (`TICKS_SANDBOX_IMAGE`) and the entrypoint prints a warning naming both references, so a declared image is never silently ignored. `toolchain` and `setup` are honoured on both substrates today.

## The deprecated markdown path

`.tick/config.md` historically carried the same routing and commands as machine-parsed markdown sections. **That path is deprecated, not a second supported shape.** `.tick/runners.toml` is where a repo's structured run config lives; markdown remains readable only so a repo that has not migrated yet still runs, and every load of it emits one deprecation warning.

Move a repo across in one command, from the repo root:

```bash
tk config migrate            # read-only diff of both files
tk config migrate --apply    # write, after the whole migration parsed and validated
```

It rewrites `.tick/config.md` down to `Rules` plus the narrative `Testing` hints and merges everything else into `.tick/runners.toml`, keeping that file's existing keys and comments. A conflict it cannot resolve is a refusal, not an overwrite, and it is safe to re-run: once `config.md` has no structured sections it reports there is nothing to migrate. What lands where:

| Deprecated `.tick/config.md` section | Moves to |
|---|---|
| `## Testing` (command bullets) | `[testing.commands]` |
| `## Testing` (prose bullets, the Go/UI/worker caveats) | `testing.notes` |
| `## Closeout Evidence Commands` | `[evidence.commands]` |
| `## Acceptance Evidence` (`- A<n>: \`command\``) | `[evidence.acceptance]`, by id |
| `## Environment` | `[environment.commands]` (label after the em dash → `description`) |
| `## Pi Orchestrator` | `[roles]`, `[roles.*.tiers]`, `[orchestration]` — see below |
| `## Rules` | stays in `.tick/config.md` |

### The deprecated `## Pi Orchestrator` block

That block was key/value routing config in markdown, duplicating what `[roles]` and `[roles.*.tiers]` already express. It maps onto the **existing** roles and tiers vocabulary with no new keys — there is deliberately no second routing model:

| Markdown key | TOML location |
|---|---|
| `planner_model` | `[roles.plan]` → `model` (+ `effort`) |
| `scout_model` | `[roles.scout]` → `model` (+ `effort`) |
| `implement_economy_model` | `[roles.implement.tiers.economy]` |
| `implement_balanced_model` | `[roles.implement.tiers.balanced]` |
| `implement_strong_model` | `[roles.implement.tiers.strong]` |
| `review_model` | `[roles.review]` |
| `closeout_model` | `[roles.closeout]` |
| `max_parallel` | `[orchestration]` → `max_parallel` |

Three things a migration has to do rather than copy:

- **Split the effort suffix.** `openai-codex/gpt-5.6-sol:xhigh` is one markdown string but two fields here: `model = "openai-codex/gpt-5.6-sol"` and `effort = "xhigh"`. The `Model` pattern rejects `:` for exactly this reason — the `model:thinking` shorthand is what the spawner *emits*, not what the config carries.
- **Make the kind explicit.** The markdown block named models and never a kind; the kind was implied by the heading saying *Pi*. `kind` is required on every role here, so write `kind = "pi"`. If the repo's `[roles]` already carry another kind's routing, these keys have **no home in that table**: merging them retargets the pi extension's only routing at a reader it was never written for, which is a migration failure and not a merge conflict a warning covers. See [One table, one kind per reader](#one-table-one-kind-per-reader).
- **`max_parallel` lands in `[orchestration]`, not `[orchestrator]`.** They are different tables: `[orchestrator]` is advisory ("which harness this config was written for"), `[orchestration]` is dispatch policy.

Two vocabulary notes for a reader porting the pi extension's own routing helper. Its `review` and `closeout` "tiers" are **roles** here, not tiers — the four tier names are `economy`/`balanced`/`strong`/`frontier`, and `[roles.review]`/`[roles.closeout]` is where those models belong. Its `foundation` tier is `[roles.review]` at the `frontier` tier. Neither needs a new key.

One key in that block has **no home in this schema and does not get one**: `review_should_fix` (`repair` | `record`) is a review-outcome policy — what to do with a should-fix finding — not routing, not a command, and not a phase. Bolting it into `[orchestrator]` would start the second routing model this migration exists to remove. Until it is given a table of its own by a tick that has thought about run policy as a category, it stays where a model reads it.

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

### The `TICKS_SUBSTRATE` override

**An explicit override wins over the file.** `TICKS_SUBSTRATE` (`herdr | harness | auto`) is set by whatever *boots* a run, and it replaces `[orchestration].substrate` for that run only. Everything else in this section is unchanged by it: `harness` is still terminal and still probes nothing, `herdr` still probes and still degrades explicitly, and the checkout is **read, never rewritten** — an orchestrator that edited the tracked file would change the base every worker commits against and put a config change nobody submitted into the run's diff.

It exists because a pin in a tracked file is a statement about the runs a repository usually has, and one run can be somewhere else. The case that forced it: a **cloud sandbox**. A container has no herdr server and never will in Phase 1 of the cloud factory (herdr-in-the-cloud is a door deliberately left open, not a deliverable), while the same repository's local runs orchestrate through herdr and must keep doing so. The first cloud run that completed a real agent turn read the repo's `substrate = "herdr"`, correctly found no socket, and stopped — a correct agent on a configuration nobody had told about the container. The sandbox entrypoint now exports `TICKS_SUBSTRATE=harness`, and the orchestrator honours it.

Two rules come with it, and both are the point:

- **Fail closed.** A value that is not one of the three substrates is a stop naming the variable, never a silent fall back to the file.
- **Say it.** An override is a deliberate choice rather than a degradation, but the run still states which substrate it resolved and why before dispatching the first worker, and records it durably: `runner-state: substrate=harness requested=harness config=herdr source=TICKS_SUBSTRATE reason=explicit-override`. The `config=` field is what lets a later reader tell configured intent from actual execution without opening the file at the run's base commit.

`tk sandbox substrate` is the implementation, and it is what a boot script asks rather than parsing this file itself: two lines on stdout — the resolved substrate, then the note line — with the reasoning on stderr.

### Decision table

| `substrate` | herdr available | Result |
|---|---|---|
| `auto` (default) | yes | herdr orchestration. State it once, quietly. |
| `auto` | no | Harness orchestration via the active `<harness>-runner.md` adapter. State it once, quietly — this is `auto` working, not a fallback from anything. |
| `herdr` | yes | herdr orchestration. State it once, quietly. |
| `herdr` | no | **Explicit degradation** — see below. Loud. The run continues under harness orchestration. |
| `harness` | either | Harness orchestration, always. Herdr is not probed and not used, even inside a herdr pane. State it once, quietly. |
| any value, with `TICKS_SUBSTRATE` set | as the override's own value dictates above | The override is the request; the file's value is reported as configured intent. Announced, never silent. |

### Two registers: state everything, announce one thing

**Every run states the substrate it resolved, once, before dispatching its first worker.** Not because something went wrong — because a substrate nobody stated is one nobody can audit afterwards, and `harness` with no reason beside it is indistinguishable from a run that never looked. In a cloud sandbox the boot log is the only record that survives the container.

**One case is announced rather than stated: `substrate = "herdr"` with no herdr.** That is an assertion the environment refused, and it is loud on purpose.

The distinction is the whole point, and getting it wrong costs more than the noise. A repository that pins `herdr` when some of its runs are driven without herdr announces a degradation on *every ordinary run* — and an operator who reads a degradation every day has been trained to ignore the one that matters. Conversely, a run that resolves `harness` and says nothing at all leaves a reader unable to tell "there was no herdr here" from "nobody asked".

| | Register | What it says |
|---|---|---|
| `auto` resolving either substrate | quiet | what was asked for, what the probes found, what is dispatching |
| `harness` (terminal) | quiet | the config asked for subagents; herdr was not probed |
| `herdr` resolving herdr | quiet | the pin held |
| `herdr` with no herdr | **loud** | the degradation below, plus the setting that would have made this run ordinary |
| any value with `TICKS_SUBSTRATE` set | **loud** | a substrate the checkout did not ask for |

`tk sandbox substrate` implements both registers: the resolved substrate and the `runner-state:` note on stdout, the statement — quiet or loud — on stderr. The note distinguishes them too: `reason=auto-no-herdr` is the ordinary path, `reason=herdr-unavailable` is the refused assertion.

### Explicit degradation

`substrate = "herdr"` with herdr unavailable **must not fail the run** and **must not degrade silently**. Before dispatching the first worker, the orchestrator states the degradation to the user in its own output — naming the requested substrate, the probe(s) that failed, and the adapter it is falling back to — and then proceeds under harness orchestration. For example:

> `.tick/runners.toml` requests `substrate = "herdr"`, but herdr is unavailable (`HERDR_ENV` is unset and the resolved socket `<path>` does not answer `herdr status server`). Falling back to harness orchestration via the Claude Code adapter for this run. Cross-vendor role routing in `[roles]` will not apply — every worker runs on the orchestrating harness.

Record the same fact durably where the run is recorded (a `tk note` on the epic, e.g. `runner-state: substrate=harness requested=herdr reason=herdr-unavailable`), so a later reader can tell configured intent from actual execution.

Three consequences of the fallback are worth stating to the user when they matter:

- Cross-vendor routing is lost — `roles.*.kind` values are inert under harness orchestration.
- Branch naming follows the harness adapter, not `worktree_branch_prefix`.
- Workers no longer outlive the orchestrator; harness subagents are child processes.

`substrate = "harness"` is *not* a degradation: it is a deliberate choice. State it quietly like any other resolution; do not announce it.

### Pin, or `auto`?

`substrate = "herdr"` is an **assertion**: *herdr is reachable for every run of this repository*. Write it only when that is true. `auto` is a **policy**: *use herdr when it is there*. Most repositories mean the policy.

The same repository is commonly driven three ways, and only one of them has herdr:

1. a local harness in herdr panes — herdr;
2. a local harness with **no herdr running**, dispatching its own subagents — the skill's original mode, which predates herdr and which the cloud-factory design calls the degenerate case that must stay sacred and work offline forever;
3. a cloud sandbox, where there is no herdr server and will not be one in Phase 1.

Cases 2 and 3 are the same situation reached from different directions, and `auto` resolves both correctly by probing. A pin makes case 2 announce a broken assertion on every run and makes case 3 stop outright — which is exactly what happened to the first cloud run of this repository that completed a real agent turn.

**There is deliberately no "where am I running" signal, and adding one would be a mistake.** It was proposed after that cloud run and rejected on enumeration. Five things vary independently: the orchestrator's harness (probed per session), the orchestrator's *location* (laptop or container), whether the orchestrator sits inside a herdr pane (`HERDR_ENV`, which is a probe *input* to availability and not a config axis), the worker substrate, and each role's worker kind. `auto` already resolves the substrate correctly in every in-scope case — in a pane, outside a pane with herdr running, outside a pane without it, and in a container — so a location variable would answer a question nothing asks. Worse, it would answer it *wrongly* for a supported configuration: a **local** orchestrator driving **cloud** workers (`tk cloud spawn/wait/collect/reconcile`, D19 in the cloud-factory design) is local judgment with cloud hands, and a signal keyed on "am I in the cloud" smears the two axes together. What genuinely cannot be probed — "herdr is reachable but should not be used here" — is what `TICKS_SUBSTRATE` is for; explicit always beats a probe.

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

The codex tiers now vary a single scalar instead of restating a `--config` argv element — and the awkward embedded quoting (`model_reasoning_effort=\"high\"`) is the spawner's problem, not the config author's. Compiled argv for `implement` at `strong`, in a repo whose git common dir resolved to `/repo/.git`: `-a never -s workspace-write --add-dir /repo/.git -m gpt-5.6-luna -c model_reasoning_effort="high"`.

The `--add-dir` element is not in the config and is not `args`: it is a **computed per-spawn extra** the `codex` kind declares, rendered from the repository the worker is started in (see [`herdr-kinds.md`](herdr-kinds.md#codex)). A codex worker runs in a linked worktree, whose git metadata lives outside it, and `-s workspace-write` would otherwise sandbox the worker out of committing its own work. The path is whatever `git rev-parse --git-common-dir` reports for that repo — never a hardcoded `.git`.

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

### 5. A kind with no effort dimension: opencode

Every example above varies its tiers by `effort`, because every kind above has somewhere to put one. `opencode` does not: its interactive CLI has no effort flag, so setting `effort` anywhere in an opencode role is a spawn refusal (see [`herdr-kinds.md`](herdr-kinds.md#opencode)). The tier ladder is therefore built from `model` — which is also what a multi-provider kind makes cheap, since the whole catalogue is addressable by id.

```toml
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "herdr"
max_parallel = 3

[roles.implement]
kind = "opencode"
model = "openai/gpt-5.6-luna"     # no `effort` — opencode has no flag for it

[roles.implement.tiers.economy]
model = "openai/gpt-5.4-mini-fast"

[roles.implement.tiers.strong]
model = "openai/gpt-5.6-sol"

[roles.review]
kind = "claude"
harness = "claude"
model = "opus"
effort = "high"
```

Compiled argv for `implement` at `strong`: `--auto --model openai/gpt-5.6-sol`. Two things to carry away. First, `--auto` is opencode's entire full-auto template — it approves permissions rather than choosing a sandbox, so unlike codex there is no computed per-spawn extra and nothing extra is needed to commit from a linked worktree. Second, the model ids must be **exactly** what `opencode models` prints: a bare or misspelled id is not an error there, it is a silent fall back to the CLI's default model, which is why the spawner's family check for this kind is strict about the `<provider>/<model>` shape.

### 6. Routing plus the whole command surface

Everything above is routing. This one adds the four command tables, and is the shape a repo lands in after moving `.tick/config.md`'s structured sections here. Note what is *not* in it: no `phase` key on a command (the table is the phase), and no routing key that `[roles]`/`[roles.*.tiers]` did not already have.

```toml
version = 2

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "auto"
max_parallel = 4

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "high"

[roles.implement.tiers.economy]
model = "haiku"
effort = "low"

[roles.implement.tiers.strong]
model = "opus"

[roles.review]
kind = "claude"
model = "opus"
effort = "high"

[testing]
notes = """
Go: internal/worktree can fail locally when temporary repositories lack a git \
identity; it passes in CI. Do not chase that environmental baseline.
UI/worker: run the targeted vitest files, not the full suite — it has known \
pre-existing failures.
"""

[testing.commands]
go = { command = "go test -short -count=1 ./...", description = "Go suite, short mode" }
runner = { command = "node --test --no-warnings extensions/ticks-runner/*.test.ts", description = "Pi runner tests" }

[evidence]
notes = "Live smokes spawn real workers; budget ~90s each and never run them from a wave gate."

[evidence.commands]
herd-helper-quick = { command = "bash scripts/verify-herd-helper.sh --quick", description = "Herd helper live smoke (2 workers, ~1 min)" }
herd-plugin-offline = { command = "bash scripts/verify-herd-plugin.sh --offline-only", description = "Herd plugin offline checks (zero herdr calls)" }
package-rpc = { command = "node --no-warnings scripts/verify-pi-ticks-qfs.ts package-rpc", description = "Package RPC discovery" }

[evidence.acceptance]
A1 = "package-rpc"
A2 = "herd-helper-quick"
A3 = "herd-plugin-offline"
A4 = "go"

[environment]

[environment.commands]
go-toolchain = { command = "which go", description = "Go toolchain on PATH" }
pnpm = { command = "which pnpm", description = "pnpm on PATH (never npm/yarn in this repo)" }
git-identity = { command = "git config user.email", description = "git identity configured" }
```

`A4` points at a `[testing.commands]` id, which is allowed: close-out may run a testing command as evidence. The reverse is not — an implementer may not run `herd-helper-quick`, because it lives in `[evidence.commands]`, and no key in this file can change that.

### 7. A repo that declares its own sandbox

Routing, a small command surface, and the sandbox the repo needs on top of the base image: a toolchain the base does not carry and two warm steps. Nothing else in the file changes — a `[sandbox]` table is additive, and a repo that removes it goes back to the base image with no other edit.

```toml
version = 2

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "high"

[testing.commands]
go = { command = "go test -short -count=1 ./...", description = "Go suite, short mode" }

[environment.commands]
rust-toolchain = { command = "which cargo", description = "cargo on PATH once the sandbox is warm" }

[sandbox]
toolchain = ["rust@1.90.0"]
setup = [
  { command = "pnpm --dir cloud/factory install --frozen-lockfile", description = "warm the pnpm store" },
  { command = "go mod download", description = "warm the module cache" },
]
```

The `[environment]` check and the `[sandbox]` declaration are doing different jobs on purpose: `sandbox.toolchain` *installs* the Rust toolchain into the project's cache, and `which cargo` then *proves* the sandbox actually has it before a wave starts. Provision, then verify — never one instead of the other.

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
| `model = "workers-ai/cf@openai/gpt-oss-120b"` | `@` may only **lead** a segment, never sit inside one. |
| `model = "workers-ai/@/gpt-oss-120b"` | `@` is a namespace prefix on a segment, not a segment. |
| `model = "workers-ai//@cf/openai/gpt-oss-120b"` | An empty segment. Nothing about `@` relaxes the rest of the grammar. |
| `[roles.implement.tiers.strong]` with no keys | A tier must set at least one of `kind`/`model`/`effort`/`args`. |
| `[roles.implement] models = "opus"` | `additionalProperties: false` — a typo'd key is an error, never a silently ignored one. |
| `[roles.implement.tiers.turbo]` | Not one of the four tier names. |
| `[testing] notez = "…"` | `additionalProperties: false` in every new table too. A typo that silently degraded a repo to no-evidence is the failure this file exists to prevent. |
| `go = { command = "go test", describtion = "…" }` | Same, inside a command: only `command` and `description` exist. |
| `go = { description = "…" }` | `command` is required — a labelled entry with nothing to run is not a command. |
| `go = "go test -short ./..."` | A command is a table, not a bare string. One shape, so a consumer never branches. |
| `go = { command = "" }` | Empty command. Delete the entry instead. |
| `go = { command = "which go\u0000rm -rf /" }` | Control characters are rejected in `command`, not escaped. |
| `[evidence.acceptance] A0 = "go"`, `Item1 = "go"` | Item ids are `A<n>`, `n` ≥ 1. |
| `[evidence.acceptance] A1 = 1` | The value is a command **id**, a string. |
| `[testing.commands] Go = { … }` | Command ids are lowercase `^[a-z0-9][a-z0-9_-]*$`. |
| `[evidence.acceptance]` twice, or `A1` twice in it | Rejected by TOML itself, before the schema — which is the point of keying the table by the item id. |
| `version = 3` | Newer than the reader. Refused *before* shape, with one line naming both versions and `tk upgrade` — never a list of the keys this reader does not know. |
| `version = 0` | Below the floor. The versions are 1 and 2. |

### Caught by the config loader (shape-valid, still unusable)

| Config | Why it fails |
|---|---|
| `A1 = "package-rcp"` with no such command id | **Unresolvable authorisation.** Nothing outside this file authorises shell, so there is no command to run. A stop, never "run the closest match". |
| the same id in `[testing.commands]` and `[environment.commands]` | Ambiguous: an acceptance reference could not say which phase it meant. |
| the same command **string** in `[testing.commands]` and `[evidence.commands]` | Ambiguous authorisation — the close-out-only command becomes runnable by an implementer. This is the rule the markdown format spelled as "verbatim and *uniquely*". |
| `A1 = "go-toolchain"` where `go-toolchain` is in `[environment.commands]` | A pre-flight check is not acceptance evidence. |

See [Caught by the config loader](#caught-by-the-config-loader) for the full statement of these three rules.

### Caught by a reader (valid for one kind, refused by another)

These configs are valid, and valid for the reader they were written for. They are refused by a *different* reader, which is a property of the pair, not of the file — see [One table, one kind per reader](#one-table-one-kind-per-reader).

| Config | Read by | Why it fails |
|---|---|---|
| `[roles.implement] kind = "claude", model = "sonnet"` | the pi extension | `sonnet` is a claude id; deriving `implement_*_model` from it would put it behind `pi --model` with no provider. Refused naming the cell, the kind and the model. Fine for `tk herd spawn`. |
| `[roles.implement.tiers.balanced] kind = "codex"` under a `kind = "pi"` role | the pi extension | The tier crosses to a kind this reader does not spawn. Only that tier's key is refused; the role's other tiers still resolve. |
| `[roles.review] kind = "claude", harness = "pi"` | the pi extension | `harness` is documentary. Routing is `kind`, and the kind is claude. |

### Caught by the spawner (shape-valid, still unroutable)

| Config | Why it fails |
|---|---|
| `kind = "claude"`, `model = "gpt-5.6-luna"` | **Impossible cell.** Valid shape, incompatible pair. Refuse the spawn naming role/tier, kind and model; never reroute to codex, never drop the model. |
| `kind = "claude"`, `effort = "minimal"` | `claude --effort` accepts `low…max` only. The enum is a union across kinds. |
| `kind = "opencode"`, `effort = "high"` | opencode has **no argv form for effort** — `--variant` is a flag of the one-shot `opencode run`, and passing it to the interactive CLI kills the spawn. Refused rather than dropped: a dropped level runs the tier at the model's own default variant. Vary the tier by `model`, or select a configured agent with `args = ["--agent", "<name>"]`. |
| `kind = "opencode"`, `model = "gpt-5.6-luna"` | Not provider-qualified. opencode takes ids exactly as `opencode models` prints them (`openai/gpt-5.6-luna`); anything else is silently replaced by its default model, so the check is strict. |
| `kind = "codex"`, `model = "gpt-9-imaginary"` | Well-formed, non-existent. This is the [green-start trap](herdr-kinds.md#the-green-start-trap): the pane starts green and does zero work. Under `kind = "opencode"` the same class is *worse* — a provider-qualified but unresolvable id starts green, answers the gate correctly, and runs the whole tick on the CLI's default model. |
| `model = "opus"` **and** `args = ["--model", "sonnet"]` | `args` restates a compiled flag. Duplicate/conflicting argv — a config error, not a precedence puzzle. |
| `kind = "frobnicator"` | Shape-valid kind name the installed herdr does not know (`herdr agent`). |
| `kind = "codex"` where the repo's git common dir could not be resolved | The kind's computed `--add-dir <git-common-dir>` extra has nothing to render from. The config is fine; the *environment* is. Refused anyway — compiling the sandbox without the grant produces a worker that starts green, does the work and cannot commit it. |

The dividing line is the same one stated under [Shape versus compatibility](#shape-versus-compatibility): the schema knows the file format, only the spawner knows the vendor. The last row is a third thing again — neither shape nor vendor but the repository — and it fails closed for the same reason as the rest.

## Authoring rules

- **Never invent kinds.** Only kinds the installed herdr reports (`herdr agent`) are valid at run time; the schema's pattern is a shape check, not a catalog.
- **Use `model`/`effort`, not `args`, for model and effort.** They are the two dimensions the spawner understands; `args` is the escape hatch for everything else (`--add-dir`, `--search`, a `-c` override with no field of its own). A config that reaches for `args` to set a model gets no compatibility checking and risks duplicating a compiled flag.
- **Args are argv, not shell.** `["--add-dir", "/x"]`, never `["--add-dir /x"]`. Quoting inside a single argv element (as in Codex's `--config 'foo="bar"'`) is part of that element's value.
- **`--add-dir` in `args` is additive, not a conflict.** The spawner already compiles one for codex (the git common dir); repeated `--add-dir` elements widen the sandbox further rather than overriding each other, so it is not a reserved flag. Name the *extra* directory a tick needs — never restate the git one.
- **Omitting `model` is legal and means "the kind's own default".** Example 3 above carries `effort` and no `model`, so the spawner passes no model flag and codex resolves `model` from `~/.codex/config.toml` — verified live. That is a deliberate choice, not an oversight: it keeps the config from pinning a model string that will age. Set `model` only when a role must not follow the CLI's local default, and re-read [`herdr-kinds.md`](herdr-kinds.md)'s green-start trap before you do — a model string that the account cannot use starts green and does zero work.
- **Model strings live in the kind's namespace.** `opus` means something to `claude` and nothing to `codex`; `openai-codex/gpt-5.6-sol` means something to `pi` and nothing to either; `openai/gpt-5.6-luna` is opencode's spelling of a model codex calls `gpt-5.6-luna`. Changing a tier's `kind` obliges you to restate its `model`.
- **`effort` is not universal.** A kind may have no mechanism for it (opencode), in which case setting it is a spawn refusal, not a hint. Check [`herdr-kinds.md`](herdr-kinds.md#model-and-effort-translation) before writing an effort ladder for a kind you have not used here before, and build the ladder from `model` when there is no effort dimension.
- **Tier names are the contract**, model strings are not. Any model named in a config is a local, dated choice.
- **Keep `[roles.implement]` present.** It is the fallback for every unlisted role.
- **Write the table for one substrate.** Every cell's `model` is in its `kind`'s namespace, so a `[roles]` table is addressed to the reader that dispatches those kinds; a second reader refuses it rather than reusing the model strings. Decide whether a repo's roles are herdr routing or pi routing, and say so in a comment — see [One table, one kind per reader](#one-table-one-kind-per-reader).
- **Declare `version = 2` the moment a command table appears.** That single line is what turns a hard break on an older `tk` into one sentence telling its operator to upgrade. `tk config migrate` writes it for you, including for a file an earlier migration already moved.
- **The table is the authorisation.** Put a command in `[evidence.commands]` only if close-out is the *only* phase that may run it, and never copy it into `[testing.commands]` to "also run it in a wave" — that is the ambiguity the loader refuses. Move it and say so in the diff.
- **Name commands for what they prove, not for how they run.** The id is a stable reference an acceptance mapping and a close-out report both quote (`package-rpc`, `herd-helper-quick`), so renaming one is a contract change; rewriting the command it points at is not.
- **Prose goes in `notes`, never in a command.** `notes` is where the caveats live — flaky suites, known-failing full runs, timing. A command string carries no commentary, and a caveat in `notes` authorises nothing.
- **Every acceptance item the epic will be closed against needs a mapping.** An unmapped item is unverified, and unverified leaves close-out and the epic open. Adding an acceptance item to a tick is therefore also an edit to this file.
- **A config that fails schema validation is a stop, not a guess** — report the validation error and let the user fix it rather than falling back to defaults silently. **A config that passes the schema but hits an impossible cell at spawn time is equally a stop** — see [Shape versus compatibility](#shape-versus-compatibility).
