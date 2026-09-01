# Orchestrator stall countermeasures: what is load-bearing, and what is optional

Verified 2026-09-01. Long autonomous runs stall on the **orchestrator**, not on
the fleet. Workers cannot stall on a permission prompt — `tk herd spawn`
compiles their kind's full-auto template into the argv — so the one agent nobody
was protecting is the pane driving the run.

There are now four countermeasures. They are not equivalent, and the difference
that matters is **what has to be true of the machine** for each to work.

| Countermeasure | Where it lives | Fires without herdr? | Without a plugin? |
|---|---|---|---|
| `tk close` continuation verdict | `cmd/tk/cmd/close.go` | yes | yes |
| `tk frontier --check` | `cmd/tk/cmd/frontier.go` | yes | yes |
| `tk decide` + standing orders | CLI + `.tick/config.md` | yes | yes |
| herdr guard (`tk herd watch`/`guard`) | CLI + **herdr plugin hook** | no | **no** |

## The lesson: a countermeasure must not be optional infrastructure

The herdr guard is a good mechanism and, for herdr-orchestrated runs, depending
on the plugin is a deliberate and accepted trade — that is where the stalls
actually happen. But it shipped into `plugins/herdr-ticks/`, a component whose
own documentation says:

> **None of this is on the orchestrator's critical path.** The plugin is display
> and convenience... a machine with no plugin installed runs waves identically.
> Do not make the loop depend on it.

So the anti-stall guard was placed inside the component explicitly marked
optional, cosmetic, and never to be depended on — and distributed through a
third-party multiplexer's plugin registry. The consequences were not
hypothetical: **the guard never fired once between shipping (2026-08-31) and
2026-09-01**, for four independent reasons, any one of which was sufficient.

1. Nothing ever ran `tk herd watch` — the command had **zero callers** in the
   codebase and existed only to be typed by hand.
2. The installed plugin was from Aug 12 and did not contain `guard-hook.sh` at
   all.
3. The whole watchdog sat in an unreleased `[0.32.0]`, reachable only from a
   `tk dev` build.
4. The designed auto-arming endpoint (`tk herd orchestrate`) is deferred,
   blocked on a herdr wire shape (`internal/herd/client/protocol.go` models no
   pane-creation method but `worktree.create`).

Both failure paths were **silent by construction**: `guard-hook.sh` file-tests
for the registration and exits 0, then `tk herd guard` no-ops on the same
absence again. Nothing ever printed an error, which is why it went unnoticed.

## The asymmetry that caused it

A **worker** is supervised as a side effect of being dispatched: `tk herd spawn`
writes its manifest, and `tk herd notify` enumerates those manifests to find the
roster. The **orchestrator** had no manifest, so it was supervised only if
somebody remembered a run-start ritual.

The fix closes it at the point that created it: the first `tk herd spawn` of a
run arms the watch, reading `HERDR_PANE_ID` — which spawn has, because the
orchestrator is the process running it. An explicit `tk herd watch <target>`
still wins and is never overwritten; re-arming per spawn would reset the guard's
episode memory mid-stall.

**`HERDR_PANE_ID` is not the banned "focused pane" default.** That rule exists
because asking herdr what is *focused* answers a question about the operator.
herdr sets `HERDR_PANE_ID` in the pane's own shell, so reading it is the server
naming the process's own identity. Only a direct child of that shell has it — an
orchestrator running `tk` does, a plugin event hook does not.

## Why the countermeasure kept being built the way the disease works

The continuation doctrine's own diagnosis is that *"every continuation rule was
prompt-enforced and decayed with context distance."* Then arming was documented
as prose in exactly one reference file, and the mechanical trigger was put in an
optional plugin. Both are the same mistake the doctrine describes.

The test to apply to any future countermeasure: **can it be uninstalled,
forgotten, or left stale?** `tk close`'s verdict cannot — it rides a command the
orchestrator is already running, so it costs nothing to keep and cannot drift out
of the loop. That property, not the wording of the message, is what makes it
reliable.

## Gotchas

- **Volume is part of the design.** The `tk close` verdict is loud only on an
  epic or closeout-role close; ordinary wave closes get one line. A banner that
  fires unconditionally is noise, and noise is how a real signal gets ignored.
- **Advisory always.** Arming failure and an unevaluable frontier are both
  silent. A run without a safety net is worse off than one with it, but far
  better off than one whose dispatch or close was *failed* by the safety net.
- **`tk` has no plugin system.** `plugins/herdr-ticks/` is a **herdr** plugin
  shipped from this repo (`herdr plugin install pengelbrecht/ticks/plugins/herdr-ticks`),
  loaded by the multiplexer, not by `tk`. There is no Claude Code plugin here
  either — the third distribution is `skills/ticks/`, read by the harness.
- **Tests inherit `HERDR_PANE_ID`** when the suite runs inside a herdr pane, so
  any test of the no-target path must `t.Setenv("HERDR_PANE_ID", "")` or it
  silently exercises the fallback instead.

## Timeline
- 2026-08-31 — watchdog ships (`35c4b8ef`), armed by nothing.
- 2026-09-01 — spawn-arming + `tk close` verdict; guard makes its first
  judgment. Follow-ups: `0vz` (trigger still plugin-only), `uhw` (smoke does not
  check the guard hook), `0yo` (`tk herd orchestrate` deferred).
