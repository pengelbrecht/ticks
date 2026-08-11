# `tk herd` helper — live smoke report

**Tick:** 5rn (epic gyz, *Herd helper CLI*) · **Date:** 2026-08-11 · **Machine:** darwin 25.2.0, herdr 0.8.0 / protocol 19, `HERDR_ENV=1`
**Script:** [`scripts/verify-herd-helper.sh`](../../scripts/verify-herd-helper.sh) · **Worker routing:** `kind = claude`, `model = haiku`, `effort = low`, full auto

## Closeout Evidence Command

The orchestrator owns `.tick/config.md`; this tick does not edit it. **Add this line to its Closeout Evidence Command section:**

```
bash scripts/verify-herd-helper.sh --quick
```

`--quick` runs setup, the fail-closed refusal demo, the full two-tick wave (spawn ×2 → wait → collect → merge → checks → close → cleanup), and the teardown assertions, skipping only the kill-9 recovery drill. It costs two live `claude --model haiku` workers and about a minute. Drop `--quick` to include the kill-9 drill (three workers, about two minutes) — worth doing before any release that touches `internal/herd/*`.

The script requires a running herdr server and `jq`; it creates a throwaway repo under `$TMPDIR` (or `--dir`), asserts its own teardown, and is re-runnable (fresh scratch dir per run).

## Result

**PASS**, 69 assertions, on the eighth run. Runs 1–6 each stopped at a different real defect and run 7 passed at 68 assertions; the focus finding (7 below) added the 69th assertion and run 8 is the one quoted here. Every defect is fixed in this worktree and listed below.

```
================ herd helper smoke: PASS ================
scratch repo            /tmp/tk-herd-smoke/tk-herd-smoke-20260811-161656-76581/repo
epic / ticks            k9v / jow nhc bpk
model / effort          haiku / low (kind claude)
assertions passed       69
wave helper calls       5  (budget 5, 2 ticks)
diagnostic helper calls 2  (refusal demo, early cleanup --preview)
kill-9 drill calls      6
total helper calls      13
wave wall time          59s
total wall time         108s
=========================================================
```

The run is re-runnable — a fresh scratch dir per run — and runs 7 and 8 are two independent clean passes.

### Helper-invocation count

The wave loop cost **5 helper invocations for 2 ticks** — the asserted budget — and the shape generalises to **N + 3**:

| # | Call | Bucket |
|---|---|---|
| 2 | `tk herd spawn jow --base <commit> --json` | wave |
| 3 | `tk herd spawn nhc --base <commit> --json` | wave |
| 4 | `tk herd wait --agents tick-jow,tick-nhc --timeout 900000 --json` | wave |
| 6 | `tk herd collect --epic k9v --json` | wave |
| 7 | `tk herd cleanup --epic k9v --apply --json` | wave |

Everything between calls 4 and 7 — `git merge` ×2, the two toy check scripts, `tk close` ×2, the tracker commit — used only `git` and `tk`. Call 1 (the refusal demo) and call 5 (`cleanup --epic --preview` run *before* the merge, to show the refusal) are counted separately as diagnostics; call 5 is a read-only dry run that mutates nothing, and the script reports both numbers rather than hiding it. **Deviation from the tick text:** the tick lists `cleanup --preview` then `--apply` inside the wave loop, which would be 6 calls for 2 ticks. The script keeps the mutating loop at 5 and moves the preview out as an explicitly-labelled diagnostic; it also uses `collect --epic` (one call for the whole wave) rather than one `collect` per tick, asserting each tick's verdict from the JSON.

### Timings (run 8)

| Step | Elapsed |
|---|---|
| setup (repo, `tk init`, epic + 3 ticks, `runners.toml`) | 1 s |
| fail-closed refusal demo | <1 s |
| `tk herd spawn` ×2 (dispatch, gated, prompts confirmed) | 22 s (11–14 s each) |
| `tk herd wait` fan-in for the wave | 36 s |
| collect + merge ×2 + toy checks + close ×2 + cleanup | 1 s |
| kill-9 drill (spawn, kill, reconcile, wait, collect, merge, close, cleanup) | 47 s |
| teardown + assertions | 1 s |
| **total** | **108 s** |

Run 7's fan-in took 51 s (`elapsed_ms: 50751`) for the same wave, so 30–60 s is the realistic range for a two-file toy tick on `haiku`.

## Evidence

Transcripts below are from **run 7** (epic `xgs`, ticks `82n`/`8zi`/`5za`), the first clean pass, except section 6 which is run 8 (epic `k9v`) because that is the run carrying the focus assertion. Both runs are identical in shape; only the generated ids differ.

### 1. Fail-closed refusal on an impossible cell (zero herdr calls)

A temporary `[roles.review]` with `kind = "claude"`, `model = "gpt-x"` was appended to the scratch `runners.toml`, then:

```
$ tk herd spawn 5za --role review --base b31c041ecb0b526adfa687c84e2e5c3b27c71a7f
Error: .tick/runners.toml [roles.review]: kind = "claude" cannot run model = "gpt-x"
(claude runs Claude-family models only). Fix the config — either a Claude model
(opus, sonnet, haiku, fable, claude-…) for this kind, or a kind that serves this
model's vendor
$ echo $?
1
```

Asserted: exit 1; the message names the role/tier cell, the kind and the model; **stdout is empty** (no plan, no reroute); `herdr workspace list` and `herdr agent list` are byte-identical before and after (zero herdr calls); no `tick/5za` branch; no manifest. Routing is compiled before the socket is dialled, so a config bug cannot leave a half-made workspace.

### 2. Spawn — compiled argv and the note line

```json
"argv": ["claude","--permission-mode","bypassPermissions","--model","haiku","--effort","low"]
```

Read back from `agent_started` via the run-state manifest — the full-auto template first, then the flags compiled from `model`/`effort`, in the documented order. The printed note line (written to the tracker by the script, not by the helper):

```
runner-state: substrate=herdr kind=claude branch=tick/82n
  worktree=/Users/peterengelbrecht/.herdr/worktrees/repo/tick-82n workspace=w5A
  base=b31c041ecb0b526adfa687c84e2e5c3b27c71a7f agent=tick-82n pane=w5A:p1
  session=7af25149-ef37-47d3-99ed-ded493a3bfb3
```

`session=` is present for both workers, captured at the gate round-trip rather than at `agent.start` — the documented behaviour, confirmed again here.

### 3. Event-driven fan-in

```json
{"workers":[{"name":"tick-82n","state":"done","pane_id":"w5A:p1","exited":false,"waited_ms":31468},
            {"name":"tick-8zi","state":"done","pane_id":"w5B:p1","exited":false,"waited_ms":50751}],
 "summary":{"settled":2,"blocked":0,"exited":0,"timed_out":null,"elapsed_ms":50751,"timeout_fired":false}}
```

One call, two workers, both `waited_ms > 0` (i.e. both were genuinely waited on rather than resolved from the opening snapshot — see finding 5). No polling anywhere in the wave loop.

### 4. Collect and the pre-merge cleanup refusal

```
$ tk herd cleanup --epic xgs --preview --json      # before the merge
Error: cleanup did not complete (82n: unmerged-branch; 8zi: unmerged-branch)

$ tk herd collect --epic xgs --json
82n  ready-to-merge  DONE  commits=2
8zi  ready-to-merge  DONE  commits=2
```

Both branches merged cleanly (`RESULT-82n.md` and `RESULT-8zi.md` did not collide), both toy check scripts passed on the integrated tree, both ticks closed, and:

```json
{"total":2,"clean":2,"refused":0,"failed":0,"ok":true}
notes: "agent tick-82n is still live (status done) on a merged branch —
        worktree.remove tears it down with the workspace"
```

### 5. Kill-9 recovery drill

`tk herd spawn 5za` → the fan-in run as `( exec tk herd wait --agents tick-5za … ) &` → `kill -9 <pid>` 5 s later, so the process driving the wave died while its worker kept running in its own pane. The fresh reconcile:

```json
{ "epic": "xgs", "branch_prefix": "tick/", "adopt": false,
  "items": [{
    "tick": "5za", "class": "live-worker",
    "reason": "herdr agent \"tick-5za\" is live (working)",
    "evidence": { "branch": "tick/5za", "branch_exists": true,
      "worktree": "/Users/peterengelbrecht/.herdr/worktrees/repo/tick-5za",
      "worktree_registered": true, "workspace_id": "w5C", "workspace_present": true,
      "base": "2f0260071ee8191a7e66a97097ab1fd7cf179891",
      "commits_ahead": 0, "commits_known": true,
      "manifest_agent": "tick-5za", "live_agent": "tick-5za",
      "live_agent_status": "working", "live_pane_id": "w5C:p1", "kind": "claude",
      "session_id": "08c334f2-980f-4cf5-8f70-65ba7c8148ac", "session_source": "agent.list" },
    "plan": { "action": "continue",
      "summary": "agent tick-5za is mid-turn — leave it alone and wait; never redispatch a live worker. The branch has no commits yet — that is not evidence of a dead worker",
      "redispatch": false,
      "commands": ["tk herd wait --agents tick-5za --timeout 1800000",
                   "herdr agent prompt tick-5za \"<what remains>\" --wait --timeout 120000"] },
    "manifest_path": ".tick/logs/herd/xgs/5za.json", "adopted": false }],
  "counts": { "live-worker": 1 } }
```

Note `commits_ahead: 0` alongside `redispatch: false` — the exact case the class exists for. The tick then completed normally: a second `tk herd wait` returned in 42 s, `tk herd collect 5za` reported `ready-to-merge DONE commits=2`, the merge applied, `check-gamma.sh` passed. **No worker output was lost.**

### 6. Teardown

```
no tick/* branches remain
no manifests remain
only the scratch checkout remains in git worktree list (= 1)
run-created workspaces still open before the run-end sweep: w5F
closing run-created workspace w5F
zero run-created workspaces remain
no pre-existing workspace was closed
zero run-created agents remain
focus is back on the workspace that had it at run start (= w4C)
```

`w5F` is the scratch repo's own **source-checkout** workspace — herdr opens it when the first worktree is created against the repo, and per-tick cleanup does not cover it. This is the second field observation of that gap (the first was the epic-`ias` smoke test), and it is why the closing sweep is asserted rather than assumed.

---

## Findings

Numbered, classified, and — for every code and doc bug — fixed in this worktree.

### 1. `agent.start` immediately after `worktree.create` fails with `agent_pane_busy` — **code bug** (fixed)

`worktree.create` returns a root pane id in ~35 ms; the pane is not an interactive shell yet.

```
worktree.create 35.5ms -> pane w4X:p1 ws w4X
attempt 1: agent.start FAILED after 1.9ms: agent_pane_busy: agent target pane w4X:p1 is not an available shell
attempt 2: agent.start FAILED after 0.9ms: agent_pane_busy: …
attempt 3: agent.start 1.0ms -> OK
```

Measured unusable at t+0.02 s, usable by t+0.32 s. **Fix:** `internal/herd/spawn` retries `agent.start` on that error code alone, bounded (12 attempts, 250 ms apart); every other start error still fails on the first attempt. `client.CodeAgentPaneBusy` added with the live evidence in its doc comment.

### 2. A `launch_pending` start is not a started agent — **code bug** (fixed)

The same call can instead succeed *immediately* with `launch_pending: true`, `interactive_ready: false`, `agent_status: "unknown"`, and the next `agent.prompt` then fails:

```
attempt 1: agent.start 2.0ms -> {"agent_status":"unknown","launch_pending":true,…}
  get 1 @0s      status=unknown ready=false pending=true
  get 3 @1.006s  status=idle    ready=false pending=true
  get 7 @3.024s  status=idle    ready=true  pending=false
agent.prompt (before readiness) -> agent_not_ready: agent probe-five is not an active named agent
agent.prompt (after readiness)  -> 2.2s, agent_status "done"
```

Two things this rules out: `agent.wait` on lifecycle status is **not** a substitute (status reaches `idle` about a second before readiness), and herdr's own blocking `herdr agent start` does the same wait internally (measured 3.05 s for a single CLI call against a settled pane). **Fix:** `spawn.Run` waits for `interactive_ready` before the gate, bounded by `--startup-timeout`. Readiness has no push event, so this is the one place the helper samples rather than blocks — documented as such.

### 3. `agent_prompt_stalled` was treated as fatal, and re-sending on it is wrong — **code bug** (fixed)

herdr reports `agent_prompt_stalled: agent prompt produced no observed state change within 5000 ms` when it sees no state change after submitting. The gate failed the whole spawn on it. The obvious fix — treat it as the documented "prompt never landed" and re-send — was tried and **also failed**, live:

```
run 4: gate prompt 1 -> agent_prompt_stalled: … status is idle and state_change_seq remained 346
run 5: gate prompt 2 -> agent_prompt_stalled: … status is done and state_change_seq remained 349
```

The seq moved 346 → 349 *between* the two attempts: the first probe had landed and been answered, and the stall report only meant the worker settled before herdr's 5 s window closed. **The error decides nothing.** Fix: on `agent_prompt_stalled` the gate waits for the worker to settle, then reads the pane and lets the existing content classification rule — which is what the adapter said all along ("read the pane before choosing"). `client.CodeAgentPromptStalled` added.

### 4. `tk herd cleanup` refused every tick with `live-worker` — **code bug** (fixed)

`internal/herd/cleanup` refused whenever herdr listed an agent for the tick, whatever its status. Interactive agent CLIs **do not exit when they finish a turn**, so at the moment cleanup is supposed to run — merged branch, closed tick, collected result — the worker is still listed. Live:

```
$ tk herd cleanup --epic 5fk --preview --json
Error: cleanup did not complete (k2s: live-worker; p5m: live-worker)
```

The command was therefore unusable in its own happy path. The adapter's rule is *"never clean a **blocked or incomplete** worker"* — and `herdr-kinds.md` states that `worktree remove --workspace` tears down worktree, workspace, pane and running agent together "with no prior exit needed (verified live)". Liveness alone was an over-generalisation of "incomplete".

**Fix:** the unmerged-branch check now runs **first** (it is the real incompleteness test), and the liveness refusal is narrowed to the two states where removal would destroy something: `blocked` (the pane is the handoff a human answers) and `working` (mid-turn, possibly about to commit). A settled live worker on a merged branch is cleaned, and the plan records it in `notes`. Tests updated; a new `TestSettledLiveWorkerOnMergedBranchIsCleaned` pins the end-of-wave case across `idle`/`done`/`unknown`.

### 5. Fire-and-forget spawn raced the wave's fan-in — **code bug** (fixed)

The worst of the six, because it fails quietly. `tk herd spawn` returned the instant `agent.prompt` was accepted, leaving the worker in the settled state the gate left it in. A `tk herd wait` issued moments later resolved that worker from its opening `agent.list` as *already settled*:

```json
{"name":"tick-k2s","state":"idle","waited_ms":28846}
{"name":"tick-p5m","state":"done","waited_ms":0}     <-- fanned in before it started
```

The wave then collected `p5m: missing-result` while its agent was still reading the prompt. **Fix:** the dispatch is confirmed by attaching `wait: {until: [working]}` to the implementer prompt, bounded by `min(--prompt-timeout, 60s)`. That costs about a second and does not serialize the wave. A timeout or a stall on that confirmation is **not** treated as failure — a trivial tick can finish before `working` is ever rendered — but it sets `Result.DispatchUnconfirmed`, and `tk herd spawn` prints a warning naming both readings so the operator knows the durable layer is what settles it.

### 6. Closing the checkout workspace first orphans per-tick worktrees — **script/operational finding** (fixed in the script; folded into the docs)

On a failed run's teardown, closing the scratch repo's source-checkout workspace also dropped the workspaces of that repo's *linked worktree* workspaces — and a workspace that is merely closed leaves its worktree on disk. Result: `~/.herdr/worktrees/repo/tick-q8n` orphaned while the sweep reported success. **Fix:** the run-end sweep removes linked-worktree workspaces (`herdr worktree remove --workspace`) **before** closing the checkout's, and no longer silences either command's errors — `worktree remove` legitimately refuses a worktree with uncommitted work, and a swallowed refusal is how a run reports a clean teardown over an orphan. The ordering rule is now stated in `herdr-runner.md` → *Cleanup*.

### 7. Teardown steals the user's focus — **herdr behaviour + our code/doc gap** (fixed on our side)

Reported live by the run coordinator while this tick was executing: the smoke flow moved the user's focus in another session. Diagnosed with a minimal read-only probe against a fresh scratch repo (one `worktree.create`, no agents), watching `focused` on every workspace at each step.

```
--- 0 baseline
    w4C label=ticks               focused=true      <- the user
--- 1 after `worktree create --cwd <repo> --branch probe/f --no-focus`
    w4C label=ticks               focused=true      <- --no-focus WORKS
    w5D label=focus-probe-repo    focused=false     <- implicitly opened SOURCE checkout
    w5E label=probe-f             focused=false     <- the worktree's workspace
--- 2 after `worktree remove --workspace w5E`
    w4C label=ticks               focused=false     <- STOLEN
    w5D label=focus-probe-repo    focused=true      <- focus moved to a neighbour
--- 3 after `workspace close w5D`
    w4C label=ticks               focused=false
    w58 label=~                   focused=true      <- and again, not back to the user
```

**The steal is at teardown, not at spawn.** `focus: false` on `worktree.create` is honoured — the hypothesis that the implicit source workspace is focused on creation is *not* what happens. What happens is that **removing or closing a workspace moves herdr's focus to a neighbouring workspace**, and because the run's own workspaces are adjacent, focus lands on them; on the final close it lands on whatever is adjacent then, not back where it started. There is no flag to prevent it: `worktree.remove` takes only `workspace_id` and `force`; `workspace.close` takes only `workspace_id`. So it is herdr behaviour, and the only remedy is for the run that moved focus to move it back.

Two related facts confirmed by the same probe:

- **`worktree.create` against a repo with no open workspace opens *two* workspaces** — the worktree's, and one for the repo's **source checkout** (`w5D`, label = repo directory name). This is the same implicit workspace the epic-`ias` smoke test left behind, now explained.
- **The response does not name it.** `worktree_created` carries `workspace`, `worktree`, `tab`, `root_pane` — there is no `source_workspace_id`. The implicit workspace is discoverable only by diffing `herdr workspace list` around the call, which is exactly why the documented run-end sweep is phrased as "zero run-created workspaces remain in the listing".

**Fixes (ours):**

- `internal/herd/cleanup` reads the focused workspace before applying a plan and restores it afterwards, via a new `client.WorkspaceFocus` (`workspace.focus`). It restores **only** a workspace that was focused before the call and still exists — never one it just removed, and never a workspace picked by any other rule. A `--preview` calls neither `session.snapshot` nor `workspace.focus`. Four tests pin this (`TestApplyRestoresStolenFocus`, `…DoesNotTouchFocusWhenItDidNotMove`, `…LeavesFocusAloneWhenTheFocusedWorkspaceIsGone`, `TestPreviewNeverTouchesFocus`).
- `scripts/verify-herd-helper.sh` records the focused workspace at baseline, restores it after the run-end sweep, and **asserts** that focus ends where it began.
- `herdr-runner.md` → *Cleanup* gains a "Teardown moves the user's focus. Put it back." section with the measurement table, plus the implicit-source-workspace explanation.

**Not ours, left alone: `w58`.** Label `~`, no checkout, one pane, cwd `/Users/peterengelbrecht`, terminal title `✳ Debug Ralph application health` — a home-directory workspace running somebody else's agent. It predates the clean smoke runs (it is in run 7's and run 8's recorded baselines, `evidence/workspaces-before.txt`), and every workspace this run created carried the scratch repo's checkout path and is accounted for in the run logs. It was never created, closed, or focused by the script, and it is still there.

Focus disposition: I restored focus to `w4C` (`ticks`) by hand after the diagnostic probe above, and run 8 ended with focus asserted back on `w4C`. It has since moved to `w58` and then to `w4A` (`walter`) with no herdr call from me in between — other sessions on this machine are active and moving it. I have deliberately not moved it again: the rule this tick implements is "put back what *your* teardown moved", not "own the focus".

### 8. Works as documented

Confirmed live, no change needed:

- **The fail-closed refusal** (finding-free; see Evidence 1) — including the "zero herdr calls" property, which the docs implied and now state.
- **`tk herd wait`'s event-driven fan-in** — one `agent.list` + one `events.subscribe`, no polling, correct `elapsed_ms`, correct `blocked`/`timed_out` accounting.
- **`tk herd collect`'s three checks and verdict ordering**, including the `.tick/` boundary diff (empty for all three workers).
- **`tk herd reconcile`'s `live-worker` classification and `redispatch: false`** after a `SIGKILL` of the driving process, with `commits_ahead: 0` — exactly the case the rule protects.
- **`--preview` is the plan `--apply` runs**, and refuses per-tick without stranding siblings.
- **`RESULT-<tick-id>.md` prevents the add/add merge conflict** — two workers, two reports, two clean merges.
- **`agent_session` after the first round-trip** for `claude`, present in both spawn manifests.

### 9. Not a defect, but worth knowing — **operational**

- `tk init` requires a GitHub remote to derive the project id; the scratch repo adds a deliberately non-resolvable `origin`. Nothing is ever pushed.
- `spawn.Run` does not clean up after a failed gate or start — that is documented and deliberate (the pane is the only place the reason is visible), but it means a *failed* spawn leaves a worktree the caller must remove. The script's failure teardown does this.
- A `claude --model haiku --effort low` worker took 31–51 s on a two-file toy tick, so a per-wave `--timeout` well above a minute is the realistic setting even for trivial work.

---

## Files changed by this tick

| File | Change |
|---|---|
| `scripts/verify-herd-helper.sh` | new — the live smoke scenario, 69 assertions, `--quick`/`--dir`/`--tk`/`--model`/`--effort`/`--keep`/`--wave-timeout` |
| `internal/herd/client/protocol.go` | `CodeAgentPaneBusy`, `CodeAgentPromptStalled`, `MethodWorkspaceFocus`, with their live evidence |
| `internal/herd/client/methods.go` | `Client.WorkspaceFocus` — used only to undo the teardown's focus steal |
| `internal/herd/spawn/spawn.go`, `doc.go` | pane-busy retry, interactive-readiness wait, gate stall handling, dispatch confirmation, `Result.DispatchUnconfirmed`, and the package contract that records why |
| `internal/herd/cleanup/cleanup.go`, `doc.go` | refusal ordering, the narrowed liveness rule, focus preservation |
| `internal/herd/cleanup/cleanup_test.go`, `fakeherd_test.go`, `cmd/tk/cmd/herd_cleanup_test.go` | updated fixtures, `TestSettledLiveWorkerOnMergedBranchIsCleaned`, four focus tests |
| `cmd/tk/cmd/herd_spawn.go`, `herd_cleanup.go` | the unconfirmed-dispatch warning; refusal help text |
| `skills/ticks/references/herdr-runner.md` | `tk herd` presented as the primary mechanism; raw herdr CLI demoted to an appendix; startup races documented |
| `skills/ticks/references/runners-config.md`, `herdr-kinds.md` | cross-references to what the helper now enforces |
| `docs/design/herd-helper-smoke-report.md` | this report |
