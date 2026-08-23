# Run config: `.tick/runners.toml` + `.tick/config.md`

Owner docs: `skills/ticks/references/runners-config.md` (semantics),
`runners-config.schema.json` (shape), `internal/herd/config` (Go loader),
`extensions/ticks-runner/config.ts` (TS loader). Epic `48d`.

## One shape, one fallback

The working rule from epic `48d`: *if a program parses it and a mistake fails
closed, it needs a schema; if a model reads it, markdown is right.*

- **`.tick/runners.toml`** — everything parsed: `[orchestrator]`,
  `[orchestration]`, `[roles.*]`, and the command surface `[testing]`,
  `[evidence]`, `[evidence.acceptance]`, `[environment]`.
- **`.tick/config.md`** — `Rules` (read verbatim into every implementer
  prompt) and narrative testing hints. Prime's ordered failover chains stay
  here too: `[roles.*]` carries one model per cell and the schema has no home
  for a chain (see `prime-runner.md`).
- The markdown structured sections are a **deprecated fallback**: still parsed,
  one warning per load, documented in exactly one place —
  `runners-config.md` → *The deprecated markdown path* — with `tk config migrate`.

## What the table a command sits in buys you

Authorisation is structural. `[testing.commands]` serves implementers and every
gate; `[evidence.commands]` serves close-out alone; `[environment.commands]` is
the run-start pre-flight and is **never** an evidence source. There is no phase
key a typo can flip. The markdown format's "must exist verbatim and uniquely"
apparatus is gone because ids are TOML keys: duplicates are parse errors,
`[evidence.acceptance]` points at an id rather than repeating command text, and
the loader rejects a command string reachable from two tables. What survives is
semantic and still fails closed: **nothing outside the config file authorises
shell**, an unresolvable mapping is a stop rather than a degradation to
something generic, and evidence is item-scoped.

## Version 2 and the old-reader gate (tick `wge`)

The compatibility direction the epic designed for was *new reader, old file*
(a current `tk` reading a legacy `config.md`). The mirror image — **old reader,
new file** — was never tested, and it broke live on 2026-08-19: minutes after
this repo migrated, installed `tk` 0.30.0 died on every `tk herd` command with
`.tick/runners.toml: 57 validation errors: environment.commands: unknown key; …`.
Nothing was wrong with fail-closed unknown keys; the reader was simply older
than the file and had no way to say so.

The rules now, enforced in both readers (`internal/herd/config`, and
`extensions/ticks-runner/config.ts` for pi):

- A file carrying `[testing]`/`[evidence]`/`[environment]` is **version 2**
  (`config.CommandSurfaceVersion`); routing-only files stay at 1, because a
  file an older `tk` can read should stay readable by it.
- `version` is read **before** shape, by a probe struct that decodes nothing
  else. Newer than the binary ⇒ one line, and only that line:
  `.tick/runners.toml is version 2 and this tk understands version 1; upgrade tk (tk upgrade)`.
- Inside a version the binary understands, unknown keys still fail closed —
  the gate is about ordering, not about weakening tick `728`.
- **Under-declaration is read, not refused.** A file with the version 2 tables
  still saying `version = 1` is exactly what `tk config migrate` wrote in the
  window before this shipped; refusing it would break those repos a second
  way. `tk config migrate` raises the version instead — and does so even when
  `config.md` has nothing left to migrate, which is the only way an
  already-migrated repo ever gets its `version = 2`.
- `config.MinTkVersion` names the release the migration warning tells the
  operator to install everywhere else. Keep it in step with the CHANGELOG.

## This repo's own migration (tick `sqt`)

`tk config migrate --apply` moved Testing/Closeout Evidence/Acceptance
Evidence/Environment into `.tick/runners.toml` and left `config.md` with Rules
plus the four narrative Go/UI/worker hints (also mirrored into `testing.notes`).
Two judgement calls worth knowing:

- **Existing TOML wins over the legacy block.** The migration reported six
  `preserved existing …` warnings — this repo's `[roles.implement]` claude/codex
  routing and `max_parallel = 3` were kept over the legacy `Pi Orchestrator`
  values. That is the tool's designed behaviour, not a conflict to resolve.
- **The migration's `[roles.plan]`/`[roles.scout]`/`[roles.review]` at
  `kind = "pi"` were deliberately NOT taken.** `[roles]` is one shared table.
  With `implement` on claude/codex, adding pi roles would produce a file no
  substrate here can execute, and it would silently change what
  `tk herd spawn --role review` resolves to — those roles previously fell back
  to `[roles.implement]`. Dropping them keeps spawn behaviour byte-identical to
  pre-migration. A comment in `.tick/runners.toml` records this.

Guarded by `internal/herd/config/repoconfig_test.go` (the migration is a no-op
on this repo's own files; every role×tier cell resolves and compiles) and
`internal/skills/runconfig_docs_test.go` (no skill file presents the markdown
sections as current; the fallback has exactly one home).

## `[orchestrator].model` has a reader now (tick `cmb`)

`[orchestrator]` was advisory when it was written — "which harness/kind this
config was intended for", used for the degradation announcement and nothing
else. The cloud sandbox gave its `model` cell a consumer: a container boots a
harness, and a harness handed no model does not fail, it hangs at "Working..."
forever. `tk sandbox model` is what reads it:

1. `[orchestrator].model`;
2. else `Resolve("orchestrator", frontier)` — which falls through to
   `[roles.implement]` like any other unnamed role, so a repository that never
   thought about cloud runs still routes one.

Nothing routed prints nothing and exits 0; the *boot script* is what refuses,
because "no model" is a run-start decision, not a config-read one. Two
consequences for anyone editing this table:

- The `frontier` tier is the orchestrator's cell. A `[roles.implement.tiers.frontier]`
  variant now changes what a cloud orchestrator runs on, not just what a
  frontier-tier implementer gets.
- **Model ids for cloud runs must be provider-qualified** (`workers-ai/…`,
  `anthropic/…`, `openai/…`, `openrouter/…`) unless they are recognisably one
  vendor's (`claude-…`, an alias, `gpt-…`). The prefix picks the AI Gateway
  route; an id with no derivable provider stops the boot rather than guessing.
  Workers AI ids are the awkward case: the real id is `@cf/<vendor>/<name>` and
  `@` is not legal under the schema's `Model` pattern, so the config writes
  `workers-ai/meta/llama-3.3-70b-instruct-fp8-fast` and
  `cloud/sandbox/entrypoint.sh` restores the `@cf/` namespace.
- **Workers AI is OpenAI-*compatible*, not OpenAI.** Its `/v1/chat/completions`
  takes `messages[].content` as a string; omp sends OpenAI content parts. The
  factory's gateway Worker normalises the two on the `workers-ai` route
  (`stringifyContentParts` in `cloud/factory/src/gateway.ts`) and refuses a part
  with no string form rather than dropping it. Nothing in `runners.toml` or the
  container has to know — but a `400 … Type mismatch of /messages/N/content` on
  a run's first real call means the deployed factory predates that translation.

See `cloud/sandbox/README.md` → *The model, and why a boot proves it* for the
boot-side half (route selection, the one-token gateway probe, exit 7).

## `substrate = "cloud"` is a real value now (tick `ddv`)

`Substrate` in `internal/herd/config/types.go` knew `herdr`, `harness` and
`auto`. That is why the Run Workflow's per-tick fan-out (tick `b6e`) triggers on
a **submission** carrying `tick_ids` rather than on repo config: there was no
config to read. The cost of the workaround was a repository whose declared
substrate and whose actual substrate could disagree with nothing reconciling
them.

Four decisions, all enforced rather than documented:

1. **`cloud` is terminal, like `harness`, and probes nothing.** The reason is
   stronger than `harness`'s: the value says *where the workers run*, and a
   herdr server listening on the orchestrator's own machine cannot change that
   answer. `Decide` returns it with `Probed = false` and
   `reason=config-terminal`.
2. **It says nothing about where the orchestrator sits.** Local-orchestrator ×
   cloud-workers is a supported cell of the design's matrix (D19), which is also
   why the long-standing "there is no *am I in the cloud* signal" rule survives
   untouched.
3. **`tk herd spawn` refuses it — exit 9, `ExitWrongSubstrate`.** It is the
   herdr substrate's dispatch verb; running it under `cloud` would put a local
   pane on the branch a worker container is already pushing to. The gate
   (`cmd/tk/cmd/substrate_gate.go`) runs after the config load and before
   routing, so a refusal costs zero herdr dials. `harness` and `auto` are
   deliberately **not** refused: neither is dispatched by a `tk` verb, so
   `tk herd spawn` there is an operator choosing herdr for one worker, not two
   substrates racing for one branch.
4. **`TICKS_SUBSTRATE` reconciles it in both directions.** `=herdr` is how an
   operator says "a local worker really is what I want, for this run"; `=harness`
   is what the sandbox entrypoint already defaults to, and that default is now
   load-bearing — a container left to inherit a checkout's `cloud` declaration
   would dispatch containers from inside a container. The note records both
   halves: `substrate=harness requested=harness config=cloud
   source=TICKS_SUBSTRATE reason=explicit-override`.

**No version bump.** A value is not a key: an older `tk` meeting
`substrate = "cloud"` already prints one line naming the key, the value and the
values it accepts, which is exactly what the version gate exists to produce.
Bumping would lock that reader out of every *other* key in the file for nothing.

**The enum crosses a language boundary**, so `TestSubstrateEnumMatchesTheSchema`
pins the Go `Substrates` slice against `runners-config.schema.json`'s enum in
order — the cross-implementation golden test `.tick/learnings.md` requires,
because two internally-consistent readers is exactly how a half-applied change
survives a green suite.

**Still not real: the local dispatch path.** `tk cloud spawn/wait/collect/
reconcile` (D19, tick `bmo`) does not exist, so a local orchestrator meeting
`cloud` has nothing to dispatch through and must stop and say so rather than
quietly running the wave on another substrate. Declaring `cloud` today is a
statement of intent that `tk` enforces rather than ignores.
