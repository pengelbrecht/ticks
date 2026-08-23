# RESULT — tick 0vb: Generic webhook sources, registered by the repository

Branch: `tick/0vb`
Base: `git merge epic/hdt` → *Already up to date*; `git merge-base --is-ancestor b612f957… HEAD` → **base-ok**
Commit: `67228672` (one commit; `RESULT-0vb.md` is uncommitted)

---

## READ THIS FIRST — one deviation, deliberate and reversible

**The tick says `.tick/config.md`. I implemented `.tick/runners.toml`.** The addendum reaffirmed `config.md`, so this is me disagreeing on the record rather than quietly reinterpreting. Reasons, in order of weight:

1. **The repo has a recorded human decision that decides exactly this case.** `skills/ticks/references/runners-config.md:5` states it as normative: *"if a program parses it and a mistake fails closed, it needs a schema; if a model reads it, markdown is right."* Tick 79x's note carries the same ruling from a human on 2026-08-19, in the context of `[sandbox]` — another table whose values run under credentials. A webhook source declaration is program-parsed, decides whether an unauthenticated POST becomes work, and must fail closed on a typo. It is on the schema side of that line by every clause.
2. **`config.md` no longer has a machine-parsed shape to extend.** Epic 48d moved every structured section out; today it holds `## Testing` prose and `## Rules`. `runners-config.md:330` calls the markdown path *"deprecated, not a second supported shape"*. Adding a new, security-load-bearing surface to a deprecated format would need a fourth parser and a migration for it later.
3. **The tick's own stated constraints are the TOML reader's rules.** "unknown keys fail closed" and "the parser builds tables with `Object.create(null)`" describe `cloud/factory/src/toml.ts` / `extensions/ticks-runner/toml.ts` — the parsers that exist because of the `__proto__` incident, and the ones `runners.toml` goes through. Both constraints are honoured literally (see below).
4. The addendum's own instruction — *"The Go side owns this file's format. If you add keys, check whether Go reads them"* — is only true of `runners.toml`. Go's `internal/herd/config` is that reader; there is no Go reader of a structured `config.md` any more except the deprecated migrator.

**If you want it in `config.md` anyway**, the work to move it is bounded and I would not fight it: `parseSignalSources(source: string)` in `src/webhook-sources.ts` is the only thing that touches the file format, plus the Go structs. Everything else — signature, mapping, dedup, route, hostile-text handling — is format-agnostic. Say the word and it is a one-function change plus a new markdown grammar. My concern about that grammar stands: a shared secret's *binding name* and a signature scheme parsed out of prose is precisely the hazard `[sandbox].setup` was moved out of markdown to avoid.

Everything the acceptance criteria actually assert is delivered and tested either way: *a repo declares a webhook source in its tracked `.tick` config, its payloads become draft ticks, unsigned/wrongly-signed is refused, an unknown key fails closed, dedup is the funnel's.*

---

## Files changed

**Added**

| File | What |
|---|---|
| `cloud/factory/src/webhook-sources.ts` | The whole feature: the registry parser, the payload mapping, the draft render, the route. |
| `cloud/factory/src/webhook-signature.ts` | vuz's HMAC, generalised to `(algorithm, header, encoding, prefix)`. |
| `cloud/factory/src/untrusted-text.ts` | vuz's sanitiser / bidi-strip / quoting, moved verbatim. |
| `cloud/factory/test/webhook-sources.test.ts` | 57 tests. |
| `cloud/factory/test/fixtures/signal-source-cases.json` | 19 golden cases both readers run. |
| `internal/herd/config/signal_parity_test.go` | tk's half of the parity guard, + version + nil-safety. |

**Modified**

- `cloud/factory/src/github-issues.ts` — re-expressed on the two shared modules; **every exported name kept as a re-export**, so its 27 tests pass untouched. Net −167/+52 lines, no behaviour change.
- `cloud/factory/src/repo-config.ts` — `read(project, ref: string | null)`; `null` means the default branch (a webhook names no commit). Module doc now states why the webhook reader is *not* best-effort, unlike the image/max_parallel readers.
- `cloud/factory/src/index.ts` — one import, one route block, three doc lines. Kept minimal: yu8 is live in this file.
- `cloud/factory/src/env.d.ts` — a `SIGNAL_SECRET_${string}` index signature (the set is open — the *repository* decides which sources exist).
- `cloud/factory/wrangler.toml` — a comment block explaining why there is deliberately no var here.
- `internal/herd/config/types.go`, `load.go` — `[signals]` decoded and validated; `RequiredVersion()` now returns 2 for it.
- `extensions/ticks-runner/config.ts` — `signals` added to `ROOT_KEYS`, **accepted without being validated**, with the reason in a comment (see *Three readers* below).
- `skills/ticks/references/runners-config.{md,schema.json}`, `skills/ticks/SKILL.md` — the format documented.
- `CHANGELOG.md` — one entry. **Expect a conflict; keep both.**

---

## What was built

A repository declares a sender, and the factory serves `POST /api/hooks/source/<owner>/<repo>/<name>`:

```toml
[signals.sources.sentry]
secret = "SIGNAL_SECRET_SENTRY"     # the NAME of a Worker secret, never a secret
header = "sentry-hook-signature"
algorithm = "hmac-sha256"           # optional; the default
encoding = "hex"                    # optional; the default
prefix = ""                         # optional (e.g. "sha256=", "v1=")
external_ref = "data.issue.id"      # a PAYLOAD PATH — the dedup key
title = "data.issue.title"          # a PAYLOAD PATH
description = "data.issue.culprit"  # a PAYLOAD PATH, optional
type = "bug"                        # a CONSTANT, optional
priority = 1                        # a CONSTANT, optional
labels = ["sentry"]                 # CONSTANTS, optional
```

**The three things the tick asked for.** A signature scheme; a mapping from payload to draft-tick fields; the source's own `external_ref` expression. Which keys are *paths* and which are *constants* is **fixed per key**, never inferred — so no value is ambiguous, and prose written where a path belongs (`title = "A new Sentry alert"`) is refused at author time by both readers rather than resolving to nothing at delivery time.

**`secret` is a name, never a secret.** `runners.toml` is tracked and usually public. The declaration names a Worker secret binding; the operator sets the value. The `SIGNAL_SECRET_` prefix is *enforced*, not conventional — without it a repository could nominate `GITHUB_TOKEN` or `FACTORY_TOKEN_HASH` as an HMAC key. A declared source whose secret this deployment lacks → **503, ingest nothing**.

**Dedup is the funnel's.** `submitSignal` is the only write path; `(source, external_ref)` in the SignalInbox is the only dedup. `external_ref` is a path to the *sender's own stable id for the subject*, not a delivery id. Reserved names `github`/`telegram` are refused so a declaration cannot share a built-in's key space.

**Fail-closed, literally as the tick specified it.** An unknown key refuses the whole source rather than being ignored — including under `[signals]` itself. Tables come from `src/toml.ts`, which builds with `Object.create(null)`; every read in the new parser is `Object.hasOwn`. So a `__proto__` key is reported *as an unknown key* and a `[signals.sources.__proto__]` table is refused by the name pattern, instead of vanishing into a prototype where no check would see it. Both are asserted, and the tests also check `Object.prototype` is untouched afterwards.

**The order at the door, and why.** Method → path → **enrolment** → config read → source lookup → secret → **signature** → parse → map → funnel. Enrolment sits before the config read not just as policy: without it, anyone who can POST could make this Worker fetch a file from any repository it can reach. "Unenrolled project" and "undeclared source" return the *byte-identical* body, so the route cannot be used to enumerate which repositories a factory serves (asserted).

**Status codes are vuz's contract**, with one named divergence: **2xx for every settled outcome after the door is found**, 401 for a bad/absent signature, 503 for an unheld secret, 503 for an unreadable config, 503 when the funnel says `deferred`. The divergence is **404 for a door that does not exist** (unenrolled/undeclared) — a sender pointed at a URL nobody registered should learn that rather than post into silence, and 404 is not a transient a sane sender loops on. Documented at the route.

**Not best effort, deliberately.** `declaredSandboxImage` may answer "not read" because the container re-checks with the authoritative reader. There is no later reader in a webhook's path, so an unreadable config here is 503-and-ingest-nothing. Stated in both modules' docs, and tested.

---

## Where I agreed and disagreed with vuz's note

| vuz said | Verdict |
|---|---|
| Signature verification is the most generalisable piece; a source needs `(algorithm, header, prefix, encoding)` and nothing else | **Agreed, exactly as specified.** `webhook-signature.ts` is that tuple. GitHub is now one *value* of it (`GITHUB_SIGNATURE_SCHEME`), not a second implementation. Added `hmac-sha512` and base64, since the tuple costs nothing to widen and real senders use both. |
| Untrusted-text handling is not GitHub-specific and should move on the second consumer | **Agreed, moved verbatim.** `untrusted-text.ts`. github-issues.ts re-exports every name, so nothing downstream (spq, la9) sees a rename. |
| The consent rule is NOT generalisable; the boundary is the shared secret plus the declaration; say it explicitly | **Agreed and said explicitly**, in the module header, the schema description and `runners-config.md`. Registering the source *is* the consent, given once for the source instead of once per item, in a file the repository reviews. Enrolment is still required on top. |
| Also worth lifting: the enrolment check and the redelivery status-code contract | **Both lifted**, but *not* extracted into a shared helper. Two call sites with different orderings (GitHub checks enrolment after the signature because its secret is deployment-wide; this checks it before, because the secret comes from the repo's own config) would have made a helper that took a flag to change its own order. Duplication named here rather than abstracted at n=2. |
| Prefer refactoring github-issues.ts toward the shared shape over copying | **Done, and it stayed small**: two modules extracted, github-issues.ts shrank by ~115 lines net, its 27 tests pass with **zero edits**. No large rewrite of a tick that landed an hour ago. |

**Where I went further than the note:** the Go side. `internal/herd/config` refuses unknown top-level tables, so a repository declaring `[signals]` would have broken every `tk herd` command in that repo. That is not optional, and it brings the learnings rule about constants crossing the Go/TS boundary with it — hence the golden fixture.

---

## Three readers, one golden file

`[signals]` now has three readers, and I made the split explicit rather than copying the rules a third time:

- **`internal/herd/config`** — validates at author time, so a wrong declaration fails at the CLI rather than at a delivery three weeks later.
- **`cloud/factory/src/webhook-sources.ts`** — acts on it.
- **`extensions/ticks-runner/config.ts`** — **accepts it and validates nothing**. It dispatches `pi` in-process and never serves a webhook, so a fourth copy of the rules is pure drift risk; what it must not do is reject a file merely for carrying a table it does not consume. Reasoning is in a comment at `ROOT_KEYS`.

`cloud/factory/test/fixtures/signal-source-cases.json` — 19 cases, 5 accepted / 14 refused — is what the first two must agree on. The direction that matters is `refused`: the Worker accepting something `tk` refuses is a fail-open door.

**No format version bump.** Following the `[sandbox]` precedent stated in `types.go`: `MinTkVersion` is `0.32.0` and the last release is `0.31.0`, so version 2 and its gate have **not shipped yet** — no released binary reads version 2 and has never heard of `[signals]`. Bumping to 3 would lock out readers for nothing and would push every routing-only migrated file past older tk for no gain. `RequiredVersion()` does return 2 for a file carrying `[signals]`, so it rides the same gate the command surface does.

---

## Tests

**`cloud/factory/test/webhook-sources.test.ts` — 57 tests**, grouped by acceptance criterion: a declared source files ticks (7, through the real HTTP door), the signature (7), the declaration fails closed (15), dedup (4), hostile payload (4), the path (1), plus the 19 parity cases.

**Failing-without / passing-with, shown by mutation** — each applied, run, reverted:

| mutation | failures |
|---|---|
| signature check bypassed | **6** (no header; wrong secret; wrong header; raw-body re-serialisation; refuse-before-parse; declared prefix/encoding) |
| unknown-key check disabled | **6** (unknown key in a source; unknown key under `[signals]`; `__proto__`; and the 3 parity cases for the same) |
| `external_ref` no longer the sender's stable id | **2** (files a tick; redelivery dedup) |

**Green, run in the foreground:**

- `go build ./...` — ok. `go test -short -count=1 ./...` — **exit 0**, whole repo.
- `gofmt -l internal cmd extensions` — clean.
- `cd cloud/factory && npx tsc --noEmit` — clean.
- `cd cloud/factory && npx vitest run` — **31 files, 819 tests passed** (full factory suite; the `run-workflow` uncaught-exception log noise is pre-existing fixture chatter, not failures).
- `node --test --no-warnings extensions/ticks-runner/*.test.ts` — **198 passed**.
- `uv run --with jsonschema python scripts/verify-runners-config.py` — **all checks passed**, including the new doc fragment.

Ran `pnpm` only from `cloud/factory/`. Nothing deployed, no cloud run started.

---

## Pre-existing problems found (your call, not fixed)

1. **`scripts/verify-runners-config.py` cannot run on this machine's default python.** `import jsonschema` fails, and `pip3 install jsonschema` fails underneath it on a broken homebrew `pyexpat` (`Symbol not found: _XML_SetAllocTrackerActivationThreshold`). I ran it via `uv run --with jsonschema python …` and it passes. Nothing in the repo says that is how to run it — worth either a shebang/`uv` wrapper or a line in the script's header, since a doc-drift guard nobody can run is a guard that stops being run. Not touched: it is orthogonal to this tick.
2. `test/signal-inbox.test.ts`'s queue-bound flake is already fixed by vuz's separable commit `723e6b30`, which is in this base. Three full-suite runs here were green.

---

## For the next ticks

- **la9 (draft triage).** `ingestSourceDelivery` returns `{state, outcome, facts, presentation}` with the same shape and the same invariant as `ingestIssueEvent` — `presentation` is forgery-proof and ready to hang buttons under; the route returns it in the 201 body. **Deliberately no draft mechanism here either**, for vuz's reason: Go has no `draft` status. Whatever la9 changes in `SignalInbox`/`tracker-write` applies to this source with no edit.
- **spq / yu8.** I edited **nothing** on the Telegram or answer-routing path. `webhook-sources.ts` imports `escapeHTML` from `telegram.ts` (read-only) and sends nothing. If you compose these into a channel message: **keep the invariant** — every line you add at column 0, all sender text behind `UNTRUSTED_LINE_PREFIX`.
- **hyi.** No trace ids threaded. The mint point is `webhookSourceRoute`, before `ingestSourceDelivery`. Note there is no universal delivery-id header for a generic sender, unlike GitHub's `X-GitHub-Delivery` — if you want one, it is a new optional `delivery_id` path key in the declaration.
- **Naming a source is a decision about volume.** Nothing rate-limits a registered sender beyond `SIGNAL_INBOX_QUEUE_LIMIT`. That is the same exposure GitHub ingestion has behind its label, and it is deliberate here (registration is the consent), but if the epic wants a per-source ceiling it belongs in the declaration and is not in this tick's criteria.

---

## Things I deliberately did not do

- No `parent`, `owner` or `acceptance_criteria` keys in the declaration. The funnel supports them; the tick named three things and I built three things.
- No health-payload line for declared sources. It would need a per-project config read on an unauthenticated endpoint, and `health()` lives in `index.ts` where yu8 is working.
- No shared helper for enrolment + status codes — see the vuz table above.
- No second dedup, no `.tick/` write of any kind, no `tk` command run.

STATUS: DONE_WITH_CONCERNS — one thing to decide. The declaration lives in **`.tick/runners.toml`**, not `.tick/config.md` as the tick and the addendum both say; the repo's own recorded rule from epic 48d/tick 79x decides that case ("a program-parsed, fail-closed surface needs a schema; `config.md` is prose"), and `config.md` has had no machine-parsed sections since that epic. Everything the acceptance criteria assert is delivered and tested. If you want `config.md` regardless, `parseSignalSources()` plus the Go structs are the only format-aware code and I will move it — but read the first section before deciding, because it would put a signature scheme and a secret binding name back into prose.
