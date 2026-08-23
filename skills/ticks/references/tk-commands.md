# tk Command Reference

Complete reference for the Ticks CLI.

## Creating Ticks

```bash
tk create "Title" [flags]
```

| Flag | Description |
|------|-------------|
| `-d, --description` | Tick description |
| `--acceptance` | Acceptance criteria (how to verify done) |
| `-t, --type` | Type: `task` (default), `epic`, `bug`, `feature`, `chore` |
| `-p, --priority` | Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Backlog |
| `-l, --labels` | Comma-separated labels |
| `--parent` | Parent epic ID |
| `-b, --blocked-by` | Blocking tick ID(s) — repeat the flag or comma-separate (`-b a -b c` ≡ `-b a,c`) — hard dependency: tick is not ready until blockers close |
| `--after` | Soft ordering preference: tick ID(s) this tick prefers to run after. Never gates readiness — `tk next` sorts soft-deferred candidates last but never hides them. Missing or closed targets are ignored |
| `-r, --requires` | Pre-declared approval gate: `approval`, `review`, `content` |
| `-a, --awaiting` | Immediate human assignment: `work`, `approval`, `input`, `review`, `content`, `escalation`, `checkpoint` |
| `--role` | Process-tick role in an epic's EPIC-SKELETON: `review` (final review) or `closeout` (retro + plan next). Structural — `tk graph --json` detects a missing skeleton from this field. Not valid on epics themselves |
| `--defer` | Defer until date (YYYY-MM-DD) |
| `--external-ref` | External reference (e.g., gh-42) |

> Long flags require double dashes (`--acceptance`, `--parent`, `--blocked-by`). A single dash is only for letter shorthands (`-d`, `-t`, `-p`, `-l`, `-b`, `-a`, `-r`).

**Examples:**
```bash
# Basic task
tk create "Fix login bug" -d "Users can't login with special chars" -p 1

# Task with acceptance criteria
tk create "Add email validation" \
  -d "Validate email format on registration form" \
  --acceptance "All validation tests pass"

# Epic
tk create "Auth System" -t epic -d "Complete authentication implementation"

# Task with dependencies
tk create "Add OAuth" --parent abc --blocked-by def,ghi

# Hard vs soft ordering — skip-ahead in action:
tk create "Migrate user data" --blocked-by <a>   # b — genuinely needs long-running a; not ready until a closes
tk create "Polish onboarding copy" --after <b>   # c — prefers to run after b, but is never blocked by it
# While a is still open, b is infeasible — tk next skips ahead and returns c,
# so c proceeds in parallel with a instead of waiting on the preferred order.

# Task requiring approval
tk create "Update auth flow" --requires approval -d "Security-sensitive change"

# Human-only task (skipped by agent)
tk create "Configure AWS credentials" --awaiting work

# EPIC-SKELETON process ticks (see SKILL.md Big picture)
tk create "Final review of epic diff" --parent <epic> --role review -b <last-wave-ticks>
tk create "Close out epic: retro + plan next" --parent <epic> --role closeout -b <review-tick>
```

## Listing Ticks

```bash
tk list [flags]
```

| Flag | Description |
|------|-------------|
| `-t, --type` | Filter by type: `task`, `epic`, `bug`, `feature`, `chore` |
| `-s, --status` | Filter by status: `open`, `closed`, `all` |
| `-p, --priority` | Filter by priority (0-4) |
| `-l, --label` | Filter by label |
| `--parent` | Filter by parent epic |
| `-a, --all` | Show all owners (default: current user only) |
| `--awaiting` | Filter by awaiting status |
| `--json` | Output as JSON |

**Special commands:**
```bash
tk ready                    # List ready (unblocked) tasks
tk blocked                  # List blocked tasks
tk next <epic-id>           # Get next task for agent in epic
tk next --awaiting=         # Get next task for human
```

**Awaiting filters:**
```bash
tk list --awaiting=             # All ticks awaiting human action
tk list --awaiting approval     # Only ticks awaiting approval
tk list --awaiting input,review # Multiple awaiting types
```

## Viewing Ticks

```bash
tk show <id> [--json]
```

If the tick has soft-ordering preferences, `tk show` renders them on an `After:` line, separate from its hard blockers.

## Updating Ticks

```bash
tk update <id> [flags]
```

| Flag | Description |
|------|-------------|
| `--title` | New title |
| `--description` | New description |
| `--priority` | New priority |
| `--status` | New status: `open`, `in_progress`, `closed` |
| `--add-labels` / `--remove-labels` | Add or remove labels |
| `--parent` | New parent epic (empty string to clear) |
| `--after` | Set soft-ordering preference tick ID(s) (`--after ""` to clear) |
| `-a, --awaiting` | Set awaiting status (or `--awaiting=` to clear) |
| `-r, --requires` | Set approval gate (empty to clear) |
| `-v, --verdict` | Set verdict: `approved`, `rejected` (see *Human Verdicts* — a runner must add `--from human`) |
| `--role` | Set process-tick role: `review`, `closeout` (`--role ""` to clear); used to repair an epic whose skeleton ticks exist but lack roles |

(`tk update` has no single-letter shorthands except `-a`, `-r`, `-v` — use the long form for the rest.)

## Status Changes

```bash
tk close <id>                    # Close
tk close <id> --reason "reason"  # Close with reason
tk close <id> --force            # Close epic with all children, or bypass a requires gate
tk reopen <id>                   # Reopen closed tick
```

### Wave width (the dispatch gate)

`tk update <id> --status in_progress` is the claim every substrate makes before it starts a
worker, so it is where `[orchestration].max_parallel` is enforced — the width is not left to
the orchestrator's restraint:

- A slot is held by every **in_progress non-epic child of the same epic**; closing or releasing
  one frees it. Re-claiming a tick that already holds its slot is always admitted.
- A claim beyond the width is refused with **exit 8**, naming the width, its source and the
  ticks holding the slots. Refused is not failed — retry the claim when a slot frees.
- `tk herd spawn` applies the same gate before it dials herdr, so a refusal costs zero dials.
- `tk herd spawn` also refuses with **exit 9** when the run dispatches through a substrate it
  does not serve — `[orchestration].substrate = "cloud"`, or `$TICKS_SUBSTRATE=cloud`. The
  workers are containers there, so a herdr pane would be a second worker on a branch one of
  them is already pushing to. Set `TICKS_SUBSTRATE=herdr` (or `auto`) for the run if a local
  herdr worker is genuinely what you want; the checkout is read, never rewritten.
- Nothing else is gated: closing, releasing and every other field edit stay open while a wave
  is full, and the TUI/board (human surfaces) are not gated at all.
- No `[orchestration].max_parallel` means no cap. `tk graph --json` → `dispatch` reports the
  width, the slots in flight and free, and `dispatch.now` — the ids to launch right now.

## Human Verdicts

Commands for humans responding to agent handoffs:

```bash
tk approve <id>             # Approve tick awaiting human verdict
tk reject <id> "feedback"   # Reject — feedback message is required (added as a human note)
```

**Only a human clears a human gate.** A verdict is refused when the resolved actor is
runner-shaped — the `<runner>:orchestrator` form every runner exports at run start, or any
colon-scoped identity. This covers `tk approve`, `tk reject`, `tk update --verdict`, and the
closes that clear a gate rather than route it (`tk close --force` over a `--requires` gate, and
plain `tk close` on a tick already `--awaiting`). `--actor` is provenance, not authorization: a
runner-shaped `--actor` is refused too.

```bash
tk approve <id> --from human     # a runner relaying a decision a human actually made
```

`--from human` is the only attestation, and it stamps the activity actor `human` rather than the
runner name — the same durable provenance boundary `tk note --from human` already uses. It is
deliberately not tamper-proof: a local CLI cannot stop a determined agent from typing the flag.
What it stops is the *accidental* self-approval, and it makes the deliberate one auditable —
epic close-out asserts every gate was cleared by a human actor.

Unaffected: `tk close` on a `--requires` tick that has not been routed yet still routes it to a
human, which is the agent's normal path.

**What happens on verdict:**

| awaiting | approved | rejected |
|----------|----------|----------|
| `work` | Closes tick | (invalid) |
| `approval` | Closes tick | Back to agent |
| `input` | Back to agent (with answer) | Closes tick |
| `review` | Closes tick (merge PR) | Back to agent |
| `content` | Closes tick | Back to agent |
| `escalation` | Back to agent (with direction) | Closes tick |
| `checkpoint` | Back to agent (next phase) | Back to agent (redo) |

## Dependencies

```bash
tk block <id> <blocker-id>...     # Add blocker(s) (id is now blocked by each blocker-id)
tk unblock <id> <blocker-id>      # Remove blocker
tk deps <id>                      # Show dependency tree
tk graph <epic-id> [--json]       # Waves + parallelism; JSON carries needs_planning,
                                  # missing_process_ticks (EPIC-SKELETON roles no child has)
                                  # and dispatch{max_parallel,in_flight,free,now} — the
                                  # configured wave width and the ids to launch right now
```

These commands manage **hard** dependencies (`blocked_by` — feasibility: the tick is not ready until its blockers close). **Soft** ordering preferences are managed with `--after` on `tk create` / `tk update` (clear with `--after ""`); they affect `tk next` ordering only and never gate readiness.

## Notes

```bash
tk note <id> "note text"              # Add note (default: from agent)
tk note <id> "note text" --from human # Human note (feedback, answers)
tk notes <id>                         # List notes
```

**Use `--from human` for:**
- Human providing feedback after rejecting work
- Human answering a question (INPUT_NEEDED)
- Human giving direction on escalation

## Running an Epic

This skill runs epics through a runner-neutral orchestration protocol — see `agent-runner.md`, then the Claude Code, Codex, or Pi adapter. The standalone `tk run` runner (along with its `tk resume` / `tk checkpoints` companions) has been removed. The `tk merge` command remains available for merging a completed epic's worktree branch.

## Cloud Substrate

The dispatch verbs for `[orchestration].substrate = "cloud"`, mirroring `tk herd`'s
vocabulary one for one so an orchestrator swapping substrates keeps its loop (D19 in
`docs/design/cloud-factory.md`). They are the ORCHESTRATOR's own hands — dispatching,
fanning in, reading verdicts, recovering — not the operator's `tk cloud run/stop/status`
vocabulary for commanding a cloud run.

```bash
tk cloud spawn <epic> --ticks a,b,c   # one worker container per tick
tk cloud wait --epic <id>             # fan in on the durable layer
tk cloud collect [<tick>] --epic <id> # verdicts from the pushed branches; never merges
tk cloud reconcile [--epic <id>]      # read-only recovery plan; mutates nothing
```

| Command | Description |
|---------|-------------|
| `tk cloud spawn` | Refuses first and cheaply: exit 9 when the run does not dispatch containers, exit 4 for an unknown tick, exit 1 for a tick outside the epic, for a project not enrolled with a factory, and for a lease another run holds (the refusal names the holder). Then pushes, submits the wave, and writes `.tick/logs/cloud/<epic>/<tick>.json` per tick. |
| `tk cloud wait` | A cloud worker settles when `RESULT-<tick>.md` reaches its branch on the remote — a destroyed container leaves no process to watch. `--timeout`/`--poll` in ms; a run that has ended reports its stragglers as `exited` rather than waiting out the deadline. |
| `tk cloud collect` | The same three checks (commits, report + `STATUS:` line, empty `.tick/` boundary diff) and the same four verdicts as `tk herd collect`, read off the remote. Adds `unknown`: an unreachable remote is not a worker that failed. Exit 0 only when every worker is `ready-to-merge`. |
| `tk cloud reconcile` | Classes: `settled`, `live-worker`, `dead-with-work`, `stale-no-work`, `unknown`. A run state that cannot be read counts as ALIVE — never redispatch a live worker; a branch with no commits is one that has not pushed yet. |

**One lease per project, wherever the orchestrator sits.** An enrolled project's dispatch
takes the same RunRoom lease a cloud run takes (recorded `origin: local`); an un-enrolled
one keeps the local file lease and cannot dispatch containers. A checkout with no factory
configured never reaches the network to discover that — offline stays offline.

`--ticks` is required and is never guessed: the wave is what the orchestrator computed
(`tk graph --json` → `dispatch.now`), and this verb dispatches it.

## Sandbox

```bash
tk sandbox image [--root DIR] [--declared-only] [--tk-version V]
tk sandbox model [--root DIR]
tk sandbox toolchain [--root DIR]
tk sandbox setup [--root DIR] [--force] [--stamp PATH]
tk sandbox environment [--root DIR]
```

Reads the `[sandbox]` table of `.tick/runners.toml` — the per-repo sandbox definition (`runners-config.md` → *The sandbox a run gets*) — and applies it to a checkout.

| Command | Description |
|---------|-------------|
| `tk sandbox image` | Print the image the sandbox boots: the declared one, else the base image pinned to this tk version. `--declared-only` prints nothing when the repo declares none. |
| `tk sandbox model` | Print the model this repo routes the orchestrator to: `[orchestrator].model`, else role `orchestrator` at the `frontier` tier (which falls back to `[roles.implement]`). Prints nothing when nothing is routed — that is a stop for whatever boots a sandbox, not a default to substitute. |
| `tk sandbox toolchain` | Print the declared `tool@version` pins, one per line. |
| `tk sandbox setup` | Run the declared setup commands, in order, once per checkout. `--force` ignores the warm record. |
| `tk sandbox environment` | Run the `[environment.commands]` run-start checks. Verification only — a repo with none is an explicit no-op; a failing check is a stop. |

The setup commands come from the tracked config in the checkout and from nowhere else — no flag supplies one. A repo that declares no `[sandbox]` table gets the base image and a no-op, which is the usual case. `tk herd spawn` runs the same setup on a new worker worktree, and the cloud sandbox entrypoint runs it after its clone, so a local worker and a cloud one warm identically.

## Web Board

```bash
tk board [path] [flags]
```

| Flag | Description |
|------|-------------|
| `-p, --port N` | Port to listen on (default 3000) |
| `--host ADDR` | Host/IP to bind (default `127.0.0.1`; use `0.0.0.0` to expose on all interfaces / LAN) |
| `--cloud` | Sync the board to ticks.sh (token in `~/.ticksrc`) |
| `--dev` | Serve the UI from source instead of embedded assets |

Opens a web interface for viewing and managing ticks. By default the board is only reachable from the local machine (loopback). Pass `--host 0.0.0.0` to make it accessible on the local network.

## Maintenance

```bash
tk gc [flags]                     # Garbage collect old logs
```

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be deleted |
| `--max-age duration` | Max age for logs (default 30d) |

## Output Formats

Most commands support `--json`:

```bash
tk list --json | jq '.ticks[] | select(.priority == 1)'
tk show abc --json | jq '.description'
```

## Awaiting States Reference

| awaiting | Meaning | Human Action |
|----------|---------|--------------|
| `work` | Human must do the task | Complete work, then approve |
| `approval` | Agent done, needs sign-off | Review and approve/reject |
| `input` | Agent needs information | Provide answer in note, approve |
| `review` | PR needs code review | Review PR, approve/reject |
| `content` | UI/copy needs judgment | Judge quality, approve/reject |
| `escalation` | Agent found issue | Decide direction, approve/reject |
| `checkpoint` | Phase complete | Verify, approve to continue |
