# herdr-ticks plugin — live smoke field report

Tick `vvw`, epic `zz0` (herdr-ticks mission-control plugin). Companion to
[`herd-helper-smoke-report.md`](herd-helper-smoke-report.md), which covers the
`tk herd` CLI; this one covers the **plugin** — the pane, the five paint hooks,
the notify hook, the five actions and the `ticks://` link handler.

**Environment.** macOS 25.2, herdr 0.8.0, `claude` workers on `haiku`/low, a
live shared herdr session (a human and other agents were working in it
throughout — which turned out to matter, see finding 4).

**Script.** `scripts/verify-herd-plugin.sh`, run by hand, **seven** full live
runs. Four of them failed, yielding five findings below (one failed run produced
two) — two product bugs and three test bugs that were themselves evidence about
the substrate. Unless a line says otherwise, counts in the findings come from
the diagnostic run that produced them and will not match the final-run banner
(hook counts vary with event timing between runs). The run reported below is
the final green one:

```text
================ herd plugin smoke: PASS ================
herdr                  herdr 0.8.0
epic / ticks           lbb / 7pt (auto) ns2 (blocked)
paint-hook runs        14 (bounces debounced: 4)
notify-hook runs       15
chimes                 blocked=1 wave-complete=1
assertions passed      81
total wall time        87s
=========================================================
```

## Why a sibling script and not `verify-herd-helper.sh --plugin`

The helper smoke is safe to run on any machine at any time: it touches only
workspaces it created. Testing the plugin is not like that — it has to relink
the herdr **plugin link**, which is per-user machine-global state, and write the
shared `tk-bin-path` pin. Both are restored on every exit path (including the
failure paths, which were exercised three times), but a script that mutates
machine-global state must be opted into deliberately. Folding it in as a flag on
a Closeout Evidence Command would mean one mistyped flag on a routine run leaves
the operator's plugin pointing at a deleted agent worktree. Separate script,
separate blast radius.

The offline half needs none of that, so `--offline-only` runs the tk-resolution
and explicit-target checks with **zero herdr calls** and no session at all.

## What the run proves

| § | Claim | Evidence |
|---|---|---|
| 0 | tk-resolution degrades correctly; no unpinned herdr targets in any plugin script | 17 offline assertions, zero herdr calls |
| 1 | the worktree's plugin links and reports the `[[events]]` **union** | 5 paint hooks + 1 notify hook, both on `pane.agent_status_changed` |
| 2 | two real workers, one driven to a genuine `blocked` | `full_auto = false` → argv without `bypassPermissions` → real approval prompt |
| 3 | paint hooks fired **and herdr echoes the badge back** | `tokens.TICK`/`tokens.EPIC`/pane title round-tripped per worker |
| 4 | the board pane opens pinned to a run-created pane and renders the run | header + epic id + both tick ids + worker rows on screen |
| 5 | exactly one blocked chime, exactly one wave-complete chime | 15 hook invocations, 2 chimes, every other outcome an explicit logged refusal to repeat |
| 6 | an action runs against the right worker and notifies | `collect-tick` → `ready-to-merge`, verdict raised |
| 7 | cleanup refuses correctly, then the sweep leaves nothing | 0 run-created workspaces, 0 agents, link restored |

The board, read live out of the pane the smoke opened — the full-auto worker
working, the `full_auto = false` worker blocked on its approval prompt:

```text
Ticks mission control · epic lbb
2 workers · 1 working · 1 blocked · events live (2 panes) · 4 events, last 0s ago · re-listed 1s ago

lbb — Toy epic for the herd plugin smoke
  wave 1
    ▸   7pt   open         Add the alpha marker  [working]
        ns2   open         Add the beta marker  [blocked]
  workers
    7pt   working   claude   w6N:p1     tick/7pt
    ns2   blocked   claude   w6P:p1     tick/ns2

j/k move · g/G first/last · r reload · q quit · read-only
```

## How a REAL blocked worker is produced

No status is ever injected. `orchestration.full_auto = false` omits the kind's
full-auto template from the spawned argv, so the worker reaches its first file
write, claude raises an approval prompt, and herdr reports the pane `blocked`.
The wave is two workers spawned from **two different** `runners.toml` states —
`full_auto = true` for the first, `false` for the second — which is what lets one
wave contain both a worker that finishes and a worker that blocks, and therefore
both chimes:

```text
notify [blocked]       tick ns2 blocked — epic lbb · implement · tick-ns2 (sound request)
notify [wave_complete] wave complete: 2 workers settled — epic lbb: 7pt, ns2 (1 blocked) (sound done)
```

Both fired in the same run, which is the design: blocked counts as settled,
because a wave whose last worker is stuck on a prompt is exactly when the
operator wants to be told.

The duplicate-suppression evidence is the *refusals*, not the absence of extra
chimes. From the same run's hook log:

```text
6 silent [blocked]       ns2: already notified for this blocked episode
1 silent [wave_complete] this wave's completion was already notified
```

The hook ran 15 times (plus 8 settle re-checks — see finding 7), said exactly
two things, and explained its silence on all 23 other decisions.

## Findings

### 1. `tk` on `PATH` had no `herd` command at all — the plugin was inert (BLOCKER, fixed in docs + asserted)

**Classification: environment trap, product-documentation defect.**

Before this tick the plugin was linked, enabled and green on this machine, and
its two hooks could never have worked: the only `tk` reachable from herdr's
server was `~/.local/bin/tk` **0.19.0**, which answers `unknown command: herd`
and exits 2. The hooks — correctly — log that and exit 0, so nothing anywhere
says the plugin is dead. No badge, no chime, no error.

It had gone unnoticed because the hooks exit *before* resolving `tk` in any repo
with no run in flight, which is nearly all of them; the plugin log was full of
`no herd run in … — nothing to paint`, which looks healthy.

Fix: `tk-bin-path` is documented as a **required install step**, not a fallback,
with the trap named and a one-line check (`tk herd --help`). The smoke asserts
the trap actively — when the `tk` on `PATH` cannot do `herd`, that is recorded as
a passing check, so the report shows *why* the pin was needed on this machine.

### 2. A stale `tk-bin-path` pin disabled the hooks instead of falling through (BUG, fixed — carry-over a)

`paint-hook.sh` and `notify-hook.sh` carried a weaker copy of the pin logic than
`dashboard.sh`: they assigned the pinned string and then tested it, so a pin
naming a moved or deleted binary produced "no usable tk" and **never tried
`PATH`**. A stale pin is the single most likely thing to be wrong on an upgraded
machine, and it silently turned off painting and notifications. They also lacked
`~` expansion and mangled interior spaces (`tr -d '[:space:]'`).

Fix: one shared [`scripts/lib/tk-resolve.sh`](../../plugins/herdr-ticks/scripts/lib/tk-resolve.sh),
sourced by all five scripts that need `tk`, resolved from `${BASH_SOURCE}` so it
holds regardless of cwd. Every candidate is tested and **falls through** on
failure. Four private copies of this logic were what allowed the drift in the
first place, so the smoke asserts that no script keeps its own `pinned_tk()`.

Offline-asserted: stale pin falls through, `~/` expands, CRLF + stray second line
tolerated, interior spaces preserved, a pin naming a directory rejected, absent
pin is not an error.

### 3. `plugin pane open --workspace` cannot open a `split` pane (BUG in a fallback path, fixed — carry-over b)

Measured live, herdr 0.8.0:

```text
invalid_params: split and zoomed plugin panes target an existing pane; use target_pane_id
```

`action-open-tick-dashboard.sh` had a `--workspace` fallback for invocations
carrying no pane (a workspace-strip right-click, and the smoke's first attempt).
That branch was not a degraded path — it was a **guaranteed failure**: a split
has to split something.

Fix: the action now derives a pane — the worker's own `pane_id` from the
manifest, else any pane inside the target workspace — and refuses if it finds
neither, rather than falling back to focus. The constraint is asserted in the
smoke (§4 opens with `--workspace` on purpose and requires the refusal) so a
future herdr that lifts it is noticed rather than assumed.

### 4. An absolute "focus never moved" assertion is wrong on a shared session (TEST BUG, fixed in both smoke scripts)

Run 2 failed `opening the dashboard did not steal focus` with focus at `w4C`
instead of the run-start `w4A` — **neither of them created by the run**. A human
or another agent moved focus mid-wave, which is their right; the plugin had done
nothing.

This is the etiquette rule pointing back at the test: focus is not a safe
implicit target, and it is not a safe *invariant* either. Both smoke scripts now
assert the property that actually holds and actually matters:

- `--no-focus` held ⇔ focus did not land on the workspace the run just opened.
- teardown succeeded ⇔ focus is on a workspace that **pre-dates the run** (not
  necessarily the exact one from run start).
- `restore_focus` is now asymmetric: if focus is on a pre-existing workspace,
  leave it — someone chose that; only focus sitting on something the run created
  (or on nothing) is the run's own mess to undo.

The same latent flake was present in `scripts/verify-herd-helper.sh` and is
fixed there too. It had not fired yet only because earlier runs happened during
quiet sessions.

### 5. Stray JSON in the run-state directory became a phantom worker (BUG, fixed — carry-over c)

`.tick/logs/herd/<epic>/` is an ordinary directory. Any `.json` dropped there
parsed into a `Manifest` with an empty `Tick`, which then propagated as a worker
with a blank id through paint, collect, cleanup, reconcile and notify.

Fix: `state.Read` rejects a manifest with no `tick` field (`state.ErrNoTick`,
naming the offending path), and `state.List` **skips** it — one stray file must
not deny the operator the whole wave. A genuinely *corrupt* (unparseable)
manifest still fails loudly: that one is a file this code wrote, so silence
there would hide a real worker. Unit tests pin both halves and that the stray
file is never deleted — the package does not own it.

### 6. Two `[[events]]` entries on one event both fire (CONFIRMED — carry-over d)


The merged manifest registers `paint-hook.sh` and `notify-hook.sh` on the same
`pane.agent_status_changed`. herdr 0.8.0 runs **both**; the diagnostic run this finding came from shows 17 paint
invocations and 16 notify invocations interleaved (the final run: 14/15). The union survived the wave-3
merge intact (5 + 1), which is asserted from `herdr plugin list --json` — what
herdr actually parsed, not what the file says, since `events.on` is unvalidated.

### 7. A wave can complete in silence — the last edge races (BUG, fixed in the hook)

**Classification: real lost-notification defect, found only because a run was
repeated.**

Run 5 produced the blocked chime and **no wave-complete chime at all**. The
evidence is unambiguous: both workers were settled — `agent wait` captured
`tick-j6b` at `agent_status: done`, `state_change_seq: 545` and `tick-9uv` at
`blocked`, `seq: 546` — while the last decision the notifier ever recorded was
`silent [wave_complete] 1 of 2 workers still running`.

The mechanism is inherent to an edge-triggered notifier. It decides when an
event says a status changed, which is exactly right for `blocked`, and has one
hole at the END of a wave: when the final workers settle within moments of each
other, the hook invocations racing behind them can each read `agent.list` before
the last transition is visible. Every one concludes "still running" — and then
there are no more status changes, so no more events, so no more invocations.
Nobody is ever told the wave finished.

Earlier runs passed by luck: unrelated later activity (paint bounces, the
collect action) generated further `pane.agent_status_changed` events, and one of
those invocations saw the settled state.

Fix, in `notify-hook.sh`: a **settle re-check**. When a decision reports a wave
still incomplete, the hook sleeps briefly (`TICKS_NOTIFY_SETTLE_SECONDS`,
default 4) and asks once more. This is a re-check, not a debounce — it adds an
invocation rather than eliding one, which is the only safe direction for
notifications. It is free to be wrong: `tk herd notify` is idempotent by
construction, so a re-check with nothing new to say sends nothing and logs why.
It runs only when a wave was judged incomplete, so a settled run costs nothing,
and at most once per invocation, so it cannot recurse.

The smoke now **waits for the chime itself** with a bounded deadline rather than
waiting for `agent wait` and sampling once — the proxy signal is what let this
hide. On timeout it dumps the live agent statuses, so a lost notification is
reported as one instead of looking like a flake.

### 8. Painted metadata IS readable back — via `agent list`, not `pane get` (OBSERVATION, strengthened the test)

Initially assumed unreadable: neither `workspace get` nor `pane get` reports what
`*.report_metadata` set. But `herdr agent list` / `agent wait` return the agent
object carrying exactly those fields:

```json
"title": "j6b · implement · open",
"state_labels": {"done": "j6b open"},
"tokens": {"EPIC": "zi7", "ROLE": "implement", "STATUS": "open", "TICK": "j6b"}
```

That is a direct acknowledgement from herdr, so the smoke now asserts the
round-trip per worker — `tokens.TICK`, `tokens.EPIC` and the pane title — rather
than inferring acceptance from the feedback bounce.

The bounce assertion is kept as a second, different signal: a
`pane.report_metadata` carrying a title makes herdr emit
`pane.agent_status_changed` for that pane, re-entering the paint hook, which is
then debounced (4 bounces in the reported run). That is what makes the debounce
load-bearing rather than cosmetic — losing it would mean the paint loop stopped
self-limiting.

### 9. `plugin action invoke` has no target (OBSERVATION, shapes the test)

herdr 0.8.0's `plugin action invoke` takes only `--plugin` and the action id. It
builds the invocation context from the **focused** workspace, so aiming an action
at a specific worker from outside the UI means focusing that worker, invoking,
and focusing back. The smoke does exactly that and asserts the move is undone —
it is the one place the script deliberately moves focus.

Consequence for the plugin, not just the test: an action can be invoked with a
context the operator did not mean. Every action here therefore identifies its
worker from the manifests and prints which one it matched
(`Matched tick cv8 (epic cmb) via …`) rather than acting silently.

### 10. Badges are eventually consistent, and the test has to say so (TEST BUG, fixed)

A run failed asserting that *both* workers carried their `TICK` token at an
arbitrary instant. Only one did — correctly. The paint hook debounces bursts
(2 s), so a worker spawned inside the window gets its badge on the *next* event
rather than immediately.

The assertion was split to match the actual guarantee: (a) the event hooks alone
badge at least one worker, herdr echoing it back — proving the hook path end to
end; then (b) after an explicit `tk herd paint`, both workers round-trip. What is
guaranteed is that a paint round-trips, not that any instant is fully painted.
The README now says the same thing to operators: a missing badge a second after
spawn is normal, a missing badge a minute later is the pin.

### 11. Reading a plugin log while hooks are running (TEST BUG, fixed)

`herdr plugin log list` includes invocations still in flight, whose `stdout` is
`null`. Every `jq` expression touching `.stdout` had to become `(.stdout // "")`
— the chime-polling loop reads the log *while* hooks run, by design, so this is
the normal case rather than an edge one.

### 12. Dead scaffolding removed (CLEANUP)

`scripts/events-noop.sh` existed to give the manifest a parsed `[[events]]`
section before real hooks existed, and its own header said tick `sku` should
replace it. `sku` did; nothing has referenced it since. Removed.

## Residual notes for the next run

- The smoke never merges, so `cleanup --apply` correctly refuses the finished
  worker as `unmerged-branch` and the run-end sweep removes it. That is asserted
  deliberately (mission control is not the wave loop — the helper smoke owns the
  merge path), but it means this script does not exercise cleanup's *happy*
  path. `verify-herd-helper.sh` does.
- Releasing the blocked worker is done by sending `esc` to dismiss the approval
  prompt. It works, but it depends on claude's prompt UI; if a future kind
  blocks differently, this step needs a per-kind answer.
- The `ticks://` **link handler cannot be exercised**: herdr exposes no socket
  method to simulate a click (`plugin.link/unlink/enable/disable/list` only), and
  a Ctrl-click is a UI act. The handler's target action `open-tick-dashboard` is covered by the
  offline explicit-target lint only; neither the click routing nor a direct
  scripted invocation of that action is exercised by the smoke.
- Total live cost of a run: ~90 s, two haiku workers.
- **Residual resolved post-merge (2026-08-12):** the GitHub install path is now
  verified live — `herdr plugin install pengelbrecht/ticks/plugins/herdr-ticks --yes`
  installed, listed all five actions, invoked `open-tick-board` (exit 0, correct
  repo resolution), and its event hooks fire.
- The settle re-check (finding 7) makes each hook invocation linger 4 s while a
  wave is incomplete — 8 re-checks in the reported run. That is cheap and
  bounded, but if a future wave is much wider it is the knob to look at
  (`TICKS_NOTIFY_SETTLE_SECONDS`).

## Reproducing

```sh
bash scripts/verify-herd-plugin.sh --offline-only   # no herdr, no session
bash scripts/verify-herd-plugin.sh                  # full live run; relinks the plugin
bash scripts/verify-herd-plugin.sh --keep           # ...and keep the scratch + evidence
```

Read the script header before the live form: it relinks the herdr plugin for the
duration and restores it on every exit path.
