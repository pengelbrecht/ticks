# Local herdr workers vs the cloud factory: what survives

Both substrates run the same tick protocol. What differs is what happens when
the operator's machine does something the run did not ask for.

## Machine sleep kills local workers, and they report `done`

Measured 2026-08-21 on Phase 2 wave 1. Two of three workers ended with:

    API Error: Your computer went to sleep mid-response.
    ✻ Cooked for 1h 6m 17s

Both at ~1h06m, both after an hour of real work. herdr reported both as
`agent_status: done`, which is indistinguishable from a worker that finished.

**A killed worker looks finished at the herdr layer.** This is the green-start
trap's twin — call it a green-finish trap — and it is exactly why the shared
protocol makes commits and `RESULT-<tick>.md` the authority rather than agent
status. `tk herd collect` got it right where herdr could not: `no-commits`.

**Rule:** never read `agent_status: done` as completion. Collect, or read the
worktree. The two agents here had, respectively, an hour of uncommitted edits
and nothing at all.

## Resume in place before respawning

Claude Code survives the API error: the process stays alive at its prompt with
context intact (89% and 91% here). So the cheapest recovery is not a respawn —
it is `herdr agent prompt <name> "<what happened, what survived, continue>"`,
which keeps the whole session.

This is worth real work. One of the two had already reasoned out a better fix
than the tick proposed, and only the constant had reached disk; a fresh agent
would have had to rederive it from nothing.

When prompting an agent, capture the focused workspace first and restore it
after — `herdr agent prompt` does not steal focus, but `herdr workspace focus`
does, and a wave sweep that focuses panes yanks the operator around. See
[[herdr-session-jumping]].

Respawn only when the worktree holds nothing worth keeping. A worktree with
uncommitted work is durable handoff state, not dirt to clear — do not run
cleanup over it.

## The asymmetry that motivates the cloud substrate

Same afternoon, same laptop:

| | local herdr wave | cloud run `a1f87597` |
|---|---|---|
| outcome | 2 of 3 workers killed at ~1h | ran 78 min unattended |
| delivered | nothing committed | epic complete, PR #50 merged to `main` |
| cost | — | $4.47 |

The cloud run was untouched by anything happening on the machine that submitted
it. That is the argument for `substrate = cloud` (`bmo`) stated as a
measurement rather than a preference.

If a local wave must run, `caffeinate -i` for the duration removes this whole
failure mode.

## Dev binary vs machine-wide binary

`tk herd spawn` speaks a pinned herdr protocol version. Building `tk` from a
clean tree over `~/.local/bin/tk` reverts any local patch that binary carried —
which broke `tk herd` for every agent on the machine once already, mid-task.

Dev builds go to `./bin/tk` (gitignored); the machine-wide install is a release
action. Consequence while `3nh` is open: `bin/tk` is protocol 19 and cannot
spawn against herdr 0.8.2, so spawn has to use the machine-wide binary. That
is a bug being worked around, not a pattern to copy — see `rhe` and `3nh`.
