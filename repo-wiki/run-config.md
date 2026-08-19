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
