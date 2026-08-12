# Herdr substrate — live heterogeneous smoke test (field report)

Tick `j6k`, epic `ias` (Herdr runner adapter & conventions), wave 4.

This is the validation gate for everything waves 1–3 shipped. The run was executed
**following only the shipped docs**, in reading order: `skills/ticks/SKILL.md` →
`references/agent-runner.md` (substrate section) → `references/herdr-runner.md` →
`references/runners-config.md` → `references/herdr-kinds.md`. Where the docs were ambiguous
or wrong, that is recorded below as a finding rather than silently compensated for; every
doc bug and doc gap found is fixed in the same commit as this report.

Environment: herdr 0.8.0 (protocol 19), `tk` 0.19.0, macOS. Orchestrator ran inside a herdr
pane (`HERDR_ENV=1`, `HERDR_WORKSPACE_ID=w4C`).

## Part 1 — the live heterogeneous run

### Setup

A throwaway repo at `…/scratchpad/herdr-smoke/repo`: `git init`, an initial commit
(`README.md`, `AGENTS.md`), `tk init`, and a feature branch `epic/toy` to orchestrate on.

Toy epic `xuy` — *Toy heterogeneous smoke epic* — with two trivial, fully independent ticks,
each "create a small file + a runnable check":

| Tick | Task | Check |
|---|---|---|
| `ca7` | `checks/greeting.txt` = `hello-from-claude` | `checks/check-greeting.sh` exits 0 iff the file matches |
| `buy` | `checks/farewell.txt` = `bye-from-codex` | `checks/check-farewell.sh` exits 0 iff the file matches |

`.tick/runners.toml` pinned the substrate and routed the two ticks cross-vendor. Because
routing is by role+tier and both ticks are implementation ticks, the split is expressed
through the **tier** — see finding 7:

```toml
[orchestration]
substrate = "herdr"
detect = "env-or-socket"
max_parallel = 2
worktree_branch_prefix = "tick/"
full_auto = true

[roles.implement]                       # default: codex
kind = "codex"
args = ["--config", "model_reasoning_effort=\"medium\""]

[roles.implement.tiers.economy]         # tier override changes the *kind*
kind = "claude"
args = ["--model", "haiku"]

[roles.implement.tiers.balanced]
kind = "codex"
args = ["--config", "model_reasoning_effort=\"medium\""]
```

Validated against the shipped schema exactly as `runners-config.md` prescribes → `ok`.

### Substrate decision

`substrate = "herdr"` → not terminal → probe. `detect = "env-or-socket"`, `env` probe passes
(`HERDR_ENV=1`). One probe run, result `herdr`. Recorded on the epic:
`tk note xuy "runner-state: substrate=herdr"`.

### Dispatch

One `herdr worktree create --cwd <repo-root> --branch tick/<id> --base <integration-commit>
--no-focus` per tick, both before any worker started, integration commit `f081dabd`:

| Tick | Pane | Workspace | Worktree path |
|---|---|---|---|
| `ca7` | `w4F:p1` | `w4F` | `~/.herdr/worktrees/repo/tick-ca7` |
| `buy` | `w4G:p1` | `w4G` | `~/.herdr/worktrees/repo/tick-buy` |

`runner-state:` notes were written at spawn time, before the worker processes existed, as
`herdr-runner.md` requires. Then one `herdr agent start` per tick, both launched before any
wait, with the kind's full-auto template prepended to the role/tier args. The echoed `argv`
confirmed both landed:

```
tick-ca7  argv: ["claude","--permission-mode","bypassPermissions","--model","haiku"]
tick-buy  argv: ["codex","-a","never","-s","workspace-write","--config","model_reasoning_effort=\"medium\""]
```

Per-worker kind/model as actually executed, read from the panes rather than from the config:
`tick-ca7` = **claude / Haiku 4.5**, `tick-buy` = **codex / gpt-5.6-luna, medium effort**.
Two vendors, one wave — the capability no harness-native subagent primitive can express.

### First-round-trip content gate — caught a real failure on first use

The gate fired immediately, and on **both** workers. `herdr agent prompt … --wait
--timeout 120000` returned a normal `agent_prompted` with a settled status (`idle` for
claude, `done` for codex), and both panes showed an **untouched composer** — claude's empty
`❯`, codex's `› Improve documentation in @filename` placeholder — with no echo of the prompt
anywhere. Zero work, two green responses. Re-sending the identical prompt worked immediately
for both; codex then printed `• OK` and claude `⏺ OK`, and `agent_session` appeared on both
prompt responses.

This is a *different* failure from the documented green-start trap (which is a bad model
string producing a real turn that errors). Here the submission itself was dropped, and the
documented remedy — kill, fix routing, respawn — would have been wrong and expensive.
See finding 3.

### Wait discipline and fan-in

Interim fan-in as documented: one backgrounded `herdr agent wait <name> --timeout 600000`
per worker, then block on the shell jobs. No polling, no blind `sleep`, `--timeout` on every
wait. Both returned `agent_status: done`.

The doc's warning that `--wait` tracks lifecycle rather than turns was borne out: `tick-ca7`'s
wait response carried `terminal_title: "✳ Acknowledge simple request"` — the title of the
*gate* turn, not the implementation turn. Treating that as completion would have collected an
empty branch. The durable-layer check was the real authority, exactly as specified.

### Collect, boundary, merge, gate, close

Results collected only from commits + report file; no terminal scraping.

```
$ git -C <wt-ca7> log --oneline f081dabd..tick/ca7
fdd77dd Add result report for tick ca7
dbbc04c tick ca7: greeting file + check

$ git -C <wt-buy> log --oneline f081dabd..tick/buy
4ed15b6 tick buy: add result report
dc22314 tick buy: farewell file + check
```

Both report files ended `STATUS: DONE`. Boundary check clean on both branches — `git diff
--name-only HEAD...tick/<id> -- .tick/` printed nothing for each, so the prompt's `tk`/`.tick/`
prohibition held under both vendors with no policy layer enforcing it.

Merge of `tick/ca7` succeeded. **Merge of `tick/buy` failed**:

```
Auto-merging RESULT.md
CONFLICT (add/add): Merge conflict in RESULT.md
```

This is finding 4, and it is structural rather than incidental — see below. Resolved for the
run by splitting the two reports into `RESULT-ca7.md` / `RESULT-buy.md`.

Integrated post-wave gate, run against the merged tree (not per-worktree):

```
$ bash checks/check-greeting.sh ; echo $?   → 0
$ bash checks/check-farewell.sh ; echo $?   → 0
```

Both ticks then closed durably with `tk close`, and only then cleanup:
`herdr worktree remove --workspace w4F` / `w4G` (each removed worktree + workspace + pane +
running agent in one call), then `git branch -d tick/ca7` / `tick/buy`, both accepted because
the branches were merged. `herdr agent list` afterwards showed only the user's own pre-existing
agents; `git worktree list` showed only the main checkout. Nothing this run did not create was
touched, and every pane/workspace was created with `--no-focus`.

## Part 2 — fallback demonstration

The substrate decision procedure from `runners-config.md` → *Substrate semantics* and
`agent-runner.md` step 1–3 was implemented literally as a script that traces each step, so a
step **not** taken is visible as absent (`PROBES_RUN`). Four cells were run.

### Cell A — `substrate = "herdr"`, herdr unavailable

`HERDR_ENV` unset (`env -u HERDR_ENV`) and `socket = /nonexistent/herdr.sock`:

```
probe env:    FAIL (HERDR_ENV is unset)
probe socket: FAIL (/nonexistent/herdr.sock is not a reachable herdr socket)
PROBES_RUN=2
RESULT=harness (EXPLICIT DEGRADATION required)
```

The degradation was announced in the orchestrator's own output, naming the requested
substrate, both failed probes, and the fallback adapter, plus the three consequences the doc
says to state when they matter (cross-vendor routing lost, branch naming follows the harness
adapter, workers no longer outlive the orchestrator). The durable artifact was written to the
toy epic and verified:

```
$ tk notes xuy
2026-08-11 13:36 - runner-state: substrate=herdr
2026-08-11 13:41 - runner-state: substrate=harness requested=herdr reason=herdr-unavailable
```

The run continues under harness dispatch and never fails. **Scoping:** no harness-native
worker was actually dispatched for this cell — the toy ticks were already complete and closed
under the herdr substrate. What is demonstrated here is the decision procedure, the
announcement content, and the durable artifact; harness-native dispatch itself is covered by
the four harness adapters' own verification and was out of scope for this tick.

### Cell B — `substrate = "harness"` performs no probe

`HERDR_ENV=1` and a live, reachable socket — i.e. herdr is *demonstrably* available:

```
step1: substrate=harness is terminal -> harness dispatch
PROBES_RUN=0
RESULT=harness (no probe, no announcement)
```

Terminal before probing, as specified, and correctly silent (this is a deliberate choice, not
a degradation).

### Controls

Two extra cells were run to isolate finding 1, and they are what makes it decisive:

| Cell | `detect` | Socket path | Result |
|---|---|---|---|
| Control 2 | `socket` | `~/.herdr/herdr.sock` (**the documented default**) | `harness` — degraded |
| Control 3 | `socket` | `~/.config/herdr/herdr.sock` (**the real path**) | `herdr` |

Same machine, same instant, same healthy herdr server. Only the path differs.

## Findings

Classified as **doc bug** (docs say something false), **doc gap** (docs omit something an
orchestrator needs), **herdr behavior** (a property of the tool worth documenting), or
**works-as-documented**.

### 1. Documented default herdr socket path is wrong — `doc bug`, high

Docs said the socket defaults to `~/.herdr/herdr.sock` (`agent-runner.md`,
`runners-config.md` ×3, `runners-config.schema.json` ×2). On herdr 0.8.0 that path does not
exist; the live socket is `~/.config/herdr/herdr.sock`, exported into every herdr pane as
`HERDR_SOCKET_PATH`.

Severity comes from the failure mode: this never errors. A `detect = "socket"` config on the
documented default returns "herdr unavailable" against a perfectly healthy server — which
under `substrate = "auto"` degrades to harness dispatch *silently*, so a repo could lose
cross-vendor routing indefinitely without a single diagnostic. Proven by Control 2 vs
Control 3 above.

**Fixed:** all five sites now specify the resolution order `orchestration.socket` →
`$HERDR_SOCKET_PATH` → `~/.config/herdr/herdr.sock`, with an explicit warning against pinning
a path and a note that the false-negative is the dangerous direction.

### 2. No read-only socket probe command was ever named — `doc gap`, medium

The docs require the socket to "answer a read-only call" while correctly forbidding bare
`herdr` (which launches the TUI), but never say *which* call. An orchestrator following the
docs literally has a forbidden option and no permitted one, and the obvious substitute
(`test -S <path>`) is wrong — a stale socket file outlives its server.

`herdr status server` is the right probe: read-only, and it prints the resolved socket path,
so it doubles as the discovery mechanism for finding 1.

**Fixed:** named in `runners-config.md`, `agent-runner.md`, `herdr-runner.md`, and the schema.

### 3. The first prompt after `agent start` can be silently dropped — `herdr behavior`, high; the documented remedy was wrong — `doc gap`

Described in full under Part 1. Both kinds, same wave: a green `agent_prompted` with a settled
status and an untouched composer. herdr reports `interactive_ready: true` as soon as it
recognizes the agent, but the CLI may still be painting its startup UI and drops the
submission. `herdr agent prompt --help` documents an `agent_prompt_stalled` result for exactly
this shape ("requires an observed state change within 5000ms"); it did not fire here, presumably
because startup itself produced an observable state change.

The gate caught it — this is a strong vindication of the gate's existence — but the doc
prescribed a single remedy ("kill it, fix the routing, respawn") that is wrong for this case:
respawning costs a full startup and lands in the same race.

**Fixed:** `herdr-runner.md` and `herdr-kinds.md` now split the two failures behind an
unanswered gate by what the *pane* shows — no echo of the prompt → re-send once; prompt echoed
with an error or no answer → green-start trap, kill and fix routing. Re-send once, then treat
a second failure as the second case.

### 4. `RESULT.md` collides across every parallel wave — `doc bug`, high

The result contract mandated a report at the fixed path `RESULT.md` in the worker's worktree,
and the worker prompt template instructed the worker to commit it. Every worker in a wave
branches from the same integration commit, so N ≥ 2 workers each *add* the same path, and the
second merge of every wave is a guaranteed `add/add` conflict. Reproduced verbatim.

This is not an edge case — it fires on every multi-worker wave, which is the substrate's
entire purpose. It also silently damages history when "resolved" naively: keeping one side
discards the other tick's report.

**Fixed:** the report artifact is now `RESULT-<tick-id>.md` throughout `herdr-runner.md` —
capability table, result contract, collect snippet, worker prompt template (all four
references), and the limitations section — with the rationale stated so it is not "simplified"
back later.

### 5. `agent_session` is not dependable on the claude start response — `doc bug`, medium

`herdr-kinds.md`'s capability matrix said claude's `agent_session` is "present **at start**",
in explicit contrast to codex's "after the first prompt". Observed here: the `agent_started`
response for `tick-ca7` carried no `agent_session` key at all; the id first appeared on the
`agent prompt` response. (The doc's own earlier live evidence *did* show one at start, so this
is a race, not a flat reversal.)

Consequence is on the crash-recovery path: an orchestrator that trusts the table and records
`agent_session` at spawn time for claude intermittently records nothing, and loses the cheapest
recovery available — native resume of a live-context worker.

**Fixed:** matrix row now reads "not dependable at start", with a note in the claude section
and the rule generalized in `herdr-runner.md` (capture at the first round-trip **for every
kind**, not just codex) including its crash-recovery cross-reference.

### 6. Worktree location is undocumented and is not inside the repo — `doc gap`, medium

`herdr worktree create` placed worktrees under herdr's own state directory —
`~/.herdr/worktrees/<repo-name>/<branch-with-slashes-flattened>`, so `tick/ca7` in repo `repo`
became `~/.herdr/worktrees/repo/tick-ca7`. The docs said to read the worktree path from the
response but never said where it lands, and the flattening (`/` → `-`) is not obvious. An
orchestrator that assumes a repo-relative worktree will look in the wrong place for the report
file, and the doc's identifier list named `.result.root_pane.pane_id` precisely while leaving
the other two as prose.

**Fixed:** exact JSON pointers for all three identifiers, plus a note on the actual location,
the `--path` escape hatch, and the two consequences (repo `.gitignore` is irrelevant to
placement; collect-step commands need explicit `-C "$worktree"`).

### 7. No per-tick vendor routing within a wave except via the tier — `doc gap`, medium

`runners.toml` routes by role + tier. A tick's role comes from `tk create --role`, and the
tracker only accepts the *process* roles (`tk create --help`: `--role string  process-tick role
in an epic skeleton (review|closeout)`). So every implementation tick in a wave resolves against
`roles.implement`, and two same-wave ticks can only reach different vendors if they carry
different tiers *and* those tiers override `kind`.

That works — it is how this run achieved heterogeneity — and `runners-config.md` did permit a
tier to set `kind`. But nothing said this is *the* mechanism for the substrate's headline
capability, and the honest caveat was missing: the tier means task difficulty, so using it as a
vendor selector risks putting a hard tick on a cheap model.

**Fixed:** `runners-config.md` now states the constraint, shows the tier-overrides-`kind`
pattern explicitly, and warns about conflating the two axes — noting that a non-difficulty
vendor axis would require a role the tracker can tag, which today it cannot. Flagged for the
epic review as a possible follow-up (see below).

### 8. `herdr agent prompt` has no file or stdin input — `doc gap`, low-medium

`herdr-runner.md` said the prompt "is passed as the argument to `herdr agent prompt` … so it
can be long". True, but `<TEXT>` is a positional argv with no `--file` flag and no stdin path,
so a multi-hundred-line template must reach argv through the shell. In practice each worker's
prompt has to be rendered to a scratch file and dispatched via `"$(cat …)"` from a small
script — which is what this run did.

**Fixed:** one paragraph after the template stating the mechanism and warning that a quoting
mistake in a very long argument fails silently.

### 9. Codex examples pin no model, contradicting the verified kind template — `doc gap`, low

`herdr-kinds.md`'s verified codex template is `-m <model> -a never -s workspace-write`, but
`runners-config.md`'s cross-vendor example gives codex `args` containing only a reasoning-effort
`--config`. Spawning faithfully from that config passes no `-m` at all. It worked — codex
resolved `model = "gpt-5.6-luna"` from `~/.codex/config.toml` — but the docs never said the
omission was intentional, leaving an orchestrator to guess whether to synthesize a model string
(and guessing one is precisely what the green-start trap punishes).

**Fixed:** authoring rule stating that omitting the model flag is legal and means "the kind's
own configured default", with a pointer to the green-start trap for when you do pin one.

### 10. Two cleanup recipes across two docs, with no cross-reference — `doc gap`, low

`herdr-kinds.md` says "exit the agent, then `herdr pane close <pane-id>`"; `herdr-runner.md`
says `herdr worktree remove --workspace <id>`. Observed: `worktree remove --workspace` tore
down worktree, workspace, pane, and the running agent in a single call with no prior exit. The
`pane close` recipe applies to scratch panes made with `herdr pane split`, not to worktree
workers, but nothing said so.

**Fixed:** `herdr-kinds.md` now scopes its recipe to self-made scratch panes and points at
`herdr-runner.md` for worktree workers and for the ordering rule.

### 11. The validation snippet's dependency is not stdlib — `doc gap`, low

`runners-config.md`'s copy-paste validator imports `jsonschema`, which is not in the standard
library; a bare `python3` run fails with `ModuleNotFoundError` on a clean machine (it did here).
**Fixed:** one clause pointing at `uv run --with jsonschema python …`.

### 12. `tk init` requires a git remote — `herdr behavior` (tracker, out of scope), low

On a fresh `git init` repo with no remote, `tk init` fails: `Error: failed to detect project:
failed to read git remote: exit status 2`. Adding a dummy `origin` unblocked it. Not a herdr
or substrate-docs issue and **not fixed here** — reported because it will bite anyone
scripting a scratch repo, and the error names the cause only indirectly.

### 13. Repeated `runner-state:` notes are not distinguishable — `doc gap`, low, not fixed

The toy epic ends with two contradictory `runner-state:` lines (one per Part), because the note
key carries no run identity. In a real run only one is written, so this is an artifact of
demonstrating both cells against one epic rather than a defect. Recorded rather than fixed —
adding a run marker to the note format is a design change, not a doc correction, and belongs to
the epic review if it wants it.

### Works as documented

Worth stating explicitly, since the value of this exercise is as much confirmation as critique:

- The three-call spawn flow (`worktree create` → `agent start` → gate) worked exactly as
  written, first time, for both kinds.
- `--no-focus` throughout; the user's own panes never stole focus and were never touched.
- The `argv` echo on `agent_started` is a genuinely reliable proof that flags landed, and is
  the right thing to check instead of trusting the template.
- The **spawn-time** `runner-state:` note is a real improvement over the Claude adapter's
  report-time note — branch, worktree, workspace, and base were all durable before any worker
  process existed, so there was never a window of unattributable state.
- The prohibition on terminal scraping as a result channel: correct, and the durable-layer
  collect worked cleanly under both vendors.
- The `--wait`-is-not-completion warning: confirmed live (stale-turn match on `tick-ca7`).
- The boundary story: with **no** policy layer, both workers respected the prompt's `tk`/`.tick/`
  prohibition, and the mandatory pre-merge `.tick/` diff check confirmed it. The docs are right
  that this check is the only real enforcement, and right to call it non-negotiable.
- `git branch -d` as the cleanup guard, and cleanup strictly after durable close: both worked.
- The `substrate = "harness"` terminal-before-probing rule: verified, zero probes.
- The cross-vendor `runners.toml` validated against the shipped schema unchanged.

## For the epic's final review

- **Finding 4 is the one that would have broken a real epic on its first multi-worker wave.**
  The fix is mechanical, but reviewers should confirm the rename is complete and consistent
  across `herdr-runner.md` — the worker template refers to the artifact four times.
- **Finding 1 deserves a second opinion on the resolution order.** `$HERDR_SOCKET_PATH` is
  observed in this herdr version's pane environment; whether it is a stable, documented
  contract of herdr's or an implementation detail was not verified against herdr's own docs.
  The fallback path is version-specific by nature.
- **Finding 7 may warrant a design follow-up rather than only a doc note.** If cross-vendor
  routing within a wave is a headline capability, routing it through the difficulty tier is a
  load-bearing workaround. The clean fix is a per-tick routing key the tracker can carry
  (a free-form `--role`, or an explicit routing label), which is a `tk` change and outside
  this epic.
- **Finding 3 is a timing race**, so its absence in a future run does not mean it is fixed. The
  gate plus re-send is the durable mitigation; keep both.
- The fallback cell's scoping (no harness-native worker actually dispatched) is stated above
  and was deliberate.
