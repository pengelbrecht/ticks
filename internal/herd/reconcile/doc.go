// Package reconcile rebuilds a herd run's state after the orchestrator died.
//
// Workers spawned onto a herdr substrate are independent processes: an
// orchestrator that crashes or exhausts its context leaves them RUNNING. That
// is the substrate's headline advantage and its one novel failure mode — a
// fresh session must not launch a second worker for a tick that already has a
// live one. This package answers "what is actually going on" from durable
// evidence, and produces a PLAN. It mutates nothing.
//
// # Reconcile order
//
// skills/ticks/references/herdr-runner.md fixes the order, and [Run] follows
// it exactly:
//
//  1. Manifests ([state.List]) — the authority on what was dispatched: branch,
//     worktree, workspace, pane, agent name, agent session, base.
//  2. Git — `git worktree list` and `git branch --list '<prefix>*'`, with the
//     prefix taken from `orchestration.worktree_branch_prefix`. The default is
//     "tick/" but it is configurable, so nothing here hardcodes it.
//  3. Live herdr — `agent.list`. An agent named `tick-<id>`, or a respawn of it
//     (`tick-<id>-r<N>`), is a live worker for that tick.
//  4. `session.snapshot` — native session identity for workers that are gone,
//     and workspace presence for workers that are not.
//
// # The five classes
//
// Every manifest lands in exactly one of [ClassLiveWorker],
// [ClassDeadResumable], [ClassDeadWithWork], [ClassStaleNoWork] and
// [ClassUnknown]. Two of those classifications carry a rule that matters more
// than the label:
//
//   - A live worker is NEVER redispatched, whatever the branch looks like. A
//     branch with no commits is what a worker that has not committed yet looks
//     like; redispatching on that evidence destroys work in progress and
//     produces two workers on one tick.
//   - Inconsistent evidence is [ClassUnknown] and never auto-resets. The
//     contradiction is spelled out in [Item.Contradictions] for a human, and
//     the plan proposes no mutation at all.
//
// # Read-only, apart from --adopt
//
// [Run] performs no git writes, starts no agent and removes nothing. The one
// exception is [Options.Adopt], which refreshes the manifest of a live worker
// whose evidence is consistent — recording the respawned agent name, its pane
// and the session id herdr now reports, so the next command in the run has
// accurate state. Nothing else is written, and a worker that is not live and
// consistent is never adopted.
package reconcile
