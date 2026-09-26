# tk Command Reference

Complete reference for the Ticks CLI.

## Creating Ticks

```bash
tk create "Title" [flags]
```

| Flag | Description |
|------|-------------|
| `-d, --description` | Tick description |
| `--acceptance` | Acceptance criteria (how to verify done): the command the gate runs, with its flags. For an epic or project, one `[A<n>]`-marked line per item, each runnable (names its proving command) or marked not yet runnable |
| `--gloss` | Optional short label, at most 40 characters, shown as `id (gloss)` by `tk list` / `tk show`; when empty, readers fall back to the title cut to 40 characters. Set it when the title is longer than a few words |
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
tk create "Add email validation to the registration form" --gloss "signup email validation" \
  -d "Validate email format on registration form" \
  --acceptance "\`go test ./internal/validation/... -run TestEmail\` passes, under the gate's flags"

# Epic, definition of done as [A<n>] items
tk create "Auth System" -t epic -d "Complete authentication implementation" \
  --acceptance "[A1] Sign-up, login and logout work end-to-end — \`make e2e\`.
[A2] (not yet runnable — judged at final review) Session expiry matches the security policy."

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

A tick with a gloss is headed `id (gloss)` in `tk show`, and `tk list` shows the gloss in place of the title. `--json` carries `gloss` as its own field, omitted when unset; a program showing ticks to a person falls back to the title cut to 40 characters.

## Updating Ticks

```bash
tk update <id> [flags]
```

| Flag | Description |
|------|-------------|
| `--title` | New title |
| `--gloss` | New short label (at most 40 characters) shown as `id (gloss)` |
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
                                  # missing_process_ticks (EPIC-SKELETON roles no child has),
                                  # unjustified_gates and readiness (Definition-of-Ready
                                  # lint: id + misses, warn-only)
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

## Decisions (decide and log)

The sanctioned alternative to asking mid-run — see SKILL.md → *Decide and log*.

```bash
tk decide <id> --question "Which DB driver?" --choice "pgx" \
  --reason "maintained, ctx support" [--class library-choice]
tk decisions               # every recorded decision (the Decisions-taken table)
tk decisions <epic-id>     # scoped to a container's subtree; --json for reports
```

`tk decide` refuses a tick that is awaiting a human (that decision is the human's —
use `tk answer`/`tk approve`); a `--requires` tick accepts decisions, which the
human then reviews at the gate. Underneath it is a structured `decision:` note
line, so hand-written notes in that format parse too.

## Frontier (the continuation predicate)

```bash
tk frontier [scope-id]         # what is actionable, in progress, waiting
tk frontier --check            # exit 0: actionable; 1: legitimately at rest; 2+: check failed
tk frontier --json             # machine-readable
```

Actionable = a ready open tick (implement/review/closeout by role) or an epic needing
planning. Work already in progress is never actionable — the predicate must not nudge a
run that is legitimately working.

## Questions (tk ask / tk answer)

```bash
tk ask <id> --question "Which region?"        # park a plain question on a tick
tk ask <id> --question "Ship it?" --gate approve   # park an approval gate
tk ask <id> --question "…" --async            # register, print the question id, return
tk ask --collect [--wait] [--timeout 10m]     # print settled answers as JSON lines and drain them
tk answer <id> <answer...>                    # answer a parked question (a [human] note)
tk answer <id> approve --from human           # answer an approval gate, relaying a human's verdict
```

`--json` reads the question (with options) from stdin and prints the answer as JSON. A parked
question shows up in `tk list --awaiting`; `tk approve` / `tk reject` also settle a `--gate approve`
question.

## Running an Epic

Ticks does not run epics; [ticfac](https://github.com/pengelbrecht/ticfac) does. See SKILL.md →
*Running an epic*.

## Web Board

```bash
tk board [path] [flags]
```

| Flag | Description |
|------|-------------|
| `-p, --port N` | Port to listen on (default 3000) |
| `--host ADDR` | Host/IP to bind (default `127.0.0.1`; use `0.0.0.0` to expose on all interfaces / LAN) |
| `--dev` | Serve the UI from source instead of embedded assets |

Opens a local web interface for viewing and managing ticks. By default the board is only reachable from the local machine (loopback). Pass `--host 0.0.0.0` to make it accessible on the local network.

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
