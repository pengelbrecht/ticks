# The `.tick/` boundary is enforced in the worker container, not requested in the prompt

Recorded 2026-08-22 during tick dxk (epic 1vn).

## The evidence

`run_215b7cbff9dd405c80d738be45cccde5`, tick `5jo`, branch `tick/72y/5jo` on
origin — the first cloud worker container in this project's history to complete
real work. It made two commits:

| Commit | What it is |
|---|---|
| `e0898b00` | `herd: qualify agent names per repo` — a correct, substantial implementation of its tick |
| `b999290f` | `tick 5jo: close` — the agent ran `tk close` and committed `.tick/activity/activity.jsonl` + `.tick/issues/5jo.json` |

The worker prompt forbids exactly this, in the second line of its Boundaries
section (`internal/herd/spawn/prompt.go`): *"Do NOT run any `tk` command and do
NOT touch the `.tick/` directory — the orchestrator owns all tick state."*

**The instruction was right and was ignored.** The worker model is
`deepseek-v4-flash`, the economy/balanced tier the factory has routed containers
at since ys3. An instruction-following gap at that tier is a fact to design
around, not a bug to file against the model.

## Why it is not just one stray commit

Several workers of one wave each closing their own tick write the same
`activity.jsonl` and the same issue files, on branches that all merge into one
integration commit. That is the exact conflict class the boundary invariant
exists to prevent, and D4's one-writer rule with it.

## It was a hardening, not a hole — verify this first if it recurs

`cloud/factory/src/worker-collect.ts` **already** fails a branch touching
`.tick/` with `boundary-violation`, in `verdictFor`, from a three-dot GitHub
compare — the same three checks and the same ordering as
`internal/herd/collect/collect.go`. So tracker state could never have *merged*
on either substrate.

What it could do, and did, is **discard the good commit with the bad one**: the
verdict is per-branch, so `e0898b00` was refused along with `b999290f`. That is
what the guard buys back.

## The fix (tick dxk): three layers in `cloud/sandbox/worker.sh`

| Layer | Closes |
|---|---|
| A `tk` shim, first on the harness's `PATH` | Every route through the tracker CLI, including unenumerated ones |
| A `pre-commit` hook in the clone | A direct write to `.tick/` the agent then commits — invisible to any `PATH` edit |
| A sweep of `.tick/` before the salvage | The container's own rescue commit (tick 5fg) laundering a violation into a commit it authored |

**The PATH split is clean, and this is the non-obvious part.** Every `tk` the
worker entrypoint needs — `verify_tk`, `sandbox model`, `sandbox toolchain`,
`sandbox setup`, `sandbox environment`, `sandbox worker-prompt` — runs *before*
`run_harness`, and nothing after it needs `tk` at all. So `PATH` is rewritten
around the harness call alone and restored afterwards. Because a harness runs
its bash tool calls as **children**, the shim reaches the process a real agent's
`tk close` actually comes from; a guard that only shadowed the harness binary
itself would miss every real invocation.

The container's own commits (salvage, report) pass `--no-verify`. The hook
exists to stop the agent, and the report is this container's only channel — an
agent that left tracker state staged must not be able to take the report down
with it.

## Every attempt is reported

A `BOUNDARY VIOLATION ATTEMPTED` block is prepended to `RESULT-<tick>.md`,
above the agent's words and never near its `STATUS:` line, naming what was
tried. It is written **only when there was an attempt** — a marker every report
carried would mean nothing on the report where it matters.

`worker-collect.ts` reads the same marker into `WorkerReport.boundary_attempted`
because the guard *working* inverts what the collector sees: the branch comes
back clean and `ready-to-merge` for exactly the runs a human most needs to hear
about, so `boundary_files` can no longer reveal them.

The refusal text and the report marker are pinned across the shell,
`internal/sandbox/worker.go` and TypeScript via
`cloud/factory/test/fixtures/worker-boot-contract.json`, beside the probe
marker.

## Known limit

The shim is a `PATH` shadow. A harness that ran its tool calls through a **login
shell** (`bash -lc`, which re-sources `/etc/profile`) could reorder `PATH` and
resolve the real `tk`. That is why the hook and the sweep exist rather than the
shim alone, and why `worker-collect.ts`'s branch check stays as the last line.
Tests drive the shim through a nested `bash -c` child, which is the shape that
matters; the login-shell case is not exercised.

Pinned by `internal/sandbox/worker_boundary_test.go` (four cases, real git
remote and real push) and two cases in
`cloud/factory/test/worker-collect.test.ts`.
