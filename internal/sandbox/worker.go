package sandbox

import "fmt"

// This file is the Go half of the per-tick WORKER container's contract —
// cloud/sandbox/worker.sh, the entrypoint a worker sandbox runs (tick tap).
//
// It exists because the contract has three readers and they must not drift.
// The script is one. `cloud/factory/src/worker-boot.ts` is another: the
// dispatcher (`worker-dispatch.ts`, tick 0ds) needs the probe command, the
// string the probe's output must contain and the environment the real command
// gets, and it must be TOLD them rather than guessing — the module says so in
// as many words. This package is the third, and it is what the repository's
// tests check the other two against, through the shared fixture the parity
// test reads.
//
// One image, two roles. On Cloudflare an image belongs to the containers
// application rather than to a boot (tick x3v), so the worker container is the
// SAME image as the orchestrator container. What tells it which role it is
// playing is which entrypoint the control plane starts inside it: an
// orchestrator boot runs [OrchestratorCommand], a worker boot runs
// [WorkerCommand]. There is deliberately no role variable beside that — a
// container whose role is a flag can be started in the wrong one, while a
// container whose role is the command it was given cannot.

// The two run entrypoints the image installs. The Cloudflare sandbox control
// server keeps the container ENTRYPOINT; these are what a boot starts inside
// the running sandbox.
const (
	OrchestratorCommand = "/usr/local/bin/ticks-orchestrator"
	WorkerCommand       = "/usr/local/bin/ticks-worker"
)

// WorkerProbeArg turns [WorkerCommand] into the green-start probe.
const WorkerProbeArg = "--probe"

// WorkerProbeCommand is the trivial work a worker sandbox is asked to do
// BEFORE any real work is dispatched to it, per the green-start trap the cloud
// design requires implemented rather than assumed.
func WorkerProbeCommand() string { return WorkerCommand + " " + WorkerProbeArg }

// WorkerProbeMarker is the string the probe's stdout must CONTAIN for the
// sandbox to count as launched.
//
// Content, never the exit status: a probe that exits 0 having printed the
// wrong thing is precisely the trap (`.tick/learnings.md` — an `npx` version
// probe that prints npm's own version exits 0). It carries no version, date or
// id, because both halves of the check are a substring match and anything
// varying would make them drift.
const WorkerProbeMarker = "ticks-worker-probe-ok"

// The worker entrypoint's own inputs, beside the ones every role takes
// (EnvRepoURL, EnvBaseSHA, EnvEpic, the gateway pair, EnvHarness, …).
const (
	// EnvTick is the one tick this container implements. A worker sandbox
	// without it has nothing to do and refuses to boot rather than running
	// something else's prompt.
	EnvTick = "TICKS_TICK"
	// EnvWorkerBranch is the branch the worker's commits and its report land
	// on, exported for everything the harness spawns. The entrypoint DERIVES
	// it (see [WorkerBranch]); nothing supplies a second spelling.
	EnvWorkerBranch = "TICKS_WORKER_BRANCH"
	// EnvWorkerTimeout bounds the harness, in seconds; 0 leaves it unbounded.
	//
	// It exists because the dispatcher's own wait timeout ends in the
	// container being KILLED, and a killed container pushes nothing. A worker
	// bounded just under the dispatcher's bound turns a hung agent into a
	// pushed branch and a report — the difference between a lost tick and a
	// legible one.
	EnvWorkerTimeout = "TICKS_WORKER_TIMEOUT"
	// EnvWorkerSetup is whether this worker runs the repository's own
	// `[sandbox]` setup: `always` (the default) or `skip`.
	//
	// It is a switch because the measurement says it is the one that matters:
	// fan-out per-sandbox time degrades 3.74x at N=5 and tick kuf found ALL of
	// that in dependency install rather than the image pull. `always` is
	// correct — a worker that cannot run the repository's tests cannot
	// implement a tick — and a wave whose ticks touch no dependencies can opt
	// out of paying it N times.
	EnvWorkerSetup = "TICKS_WORKER_SETUP"
)

// Values of [EnvWorkerSetup].
const (
	WorkerSetupAlways = "always"
	WorkerSetupSkip   = "skip"
)

// WorkerActor is what the worker entrypoint exports as TK_ACTOR, joining the
// runner-shaped actor namespace beside [Actor].
const WorkerActor = "cloud:worker"

// The boundary guard (tick dxk).
//
// A worker agent may not run `tk` and may not write under `.tick/`: the
// orchestrator owns all tick state, and several workers of one wave each
// closing their own tick produce conflicting writes to the same
// `activity.jsonl` and issue files on branches that all merge into one
// integration commit. That is the conflict class the invariant exists to
// prevent, and D4's one-writer rule with it.
//
// It was a prose instruction until a real container ignored it — the worker
// prompt forbids it in the second line of its Boundaries section, and
// run_215b7cbff9dd405c80d738be45cccde5's tick 5jo ran `tk close` and committed
// the result anyway. The container is ours end to end, so the boundary is now
// ENFORCED there: the harness gets a PATH whose `tk` refuses, the clone gets a
// hook that refuses a commit staging tracker state, and the container's own
// salvage sweep leaves `.tick/` behind. None of it needs the agent's
// cooperation, which is the point.
//
// The strings below are the guard's contract with its readers. The refusal is
// what the agent is handed (and what the repository's tests assert it was);
// the report marker is what carries the attempt to a HUMAN, because a
// violation that is silently prevented trains nobody.
const (
	// WorkerTkDeniedMessage is what the harness's `tk` prints before refusing.
	WorkerTkDeniedMessage = "tk is not available to a worker agent"

	// WorkerBoundaryReportMarker heads the section the worker entrypoint
	// prepends to `RESULT-<tick>.md` when the agent tried to cross the
	// boundary. It is the string a reader — and `worker-collect.ts` — looks
	// for, so it carries no tick id, path or count.
	WorkerBoundaryReportMarker = "BOUNDARY VIOLATION ATTEMPTED"
)

// WorkerBranchPrefix is the namespace a per-tick worker's branch lives in. It
// is the other half of the branch-name ownership test the factory applies to a
// pull request (D9, with `tick-run/*` for run branches).
const WorkerBranchPrefix = "tick/"

// WorkerBranch is the branch one tick's worker container pushes: the name
// `worker-collect.ts` compares against the epic base and reads the report out
// of. Derived here and in the entrypoint from the same rule, so the container
// and the collector cannot disagree about where the work is.
func WorkerBranch(epic, tick string) string {
	return WorkerBranchPrefix + epic + "/" + tick
}

// WorkerResultFile is the report a worker's branch must carry. It mirrors
// internal/herd/spawn.ResultFile: the filename carries the tick id because
// every worker of a wave branches from the same commit, and a shared name is
// an add/add conflict on the second merge.
func WorkerResultFile(tick string) string { return "RESULT-" + tick + ".md" }

// Exit codes the worker entrypoint adds to the shared 2-8. Each is a different
// thing to do about it, which is why they are not one code.
const (
	// ExitWorkerPush reports commits that exist and an origin that would not
	// take them: the work lives only in a container about to be destroyed.
	ExitWorkerPush = 9
	// ExitWorkerNoWork reports a branch and a report that reached origin with
	// no work commits on them — the harness exited 0 having done nothing,
	// which is the exit counterpart of the green-start trap (D23) and the
	// reason completion is proved from the durable layer rather than inferred
	// from a status.
	ExitWorkerNoWork = 10
	// ExitWorkerAgent reports a harness that failed, ran out of time, or
	// exited without writing its report. All three are the agent not
	// fulfilling its contract, and the report is half of it: a tick whose only
	// account of itself was written by the entrypoint is not a tick that
	// reported. Whatever it had committed was pushed first — this code
	// describes the agent, never the durability.
	ExitWorkerAgent = 11
)

// WorkerPromptAddendum is what `tk sandbox worker-prompt` appends to the
// shared worker template.
//
// The template is written for a herdr worker in a worktree beside its
// orchestrator. Three things are different in a container and all three change
// what the agent must do: the checkout is a clone on the branch already, the
// container is destroyed at exit so only what is pushed survives, and the
// entrypoint — not the agent — commits the report and pushes the branch. An
// agent that pushed on its own, or that waited to be collected from a
// worktree, would be wrong in ways the template cannot warn it about.
func WorkerPromptAddendum(tick, branch string) string {
	return fmt.Sprintf(`
## Where you are running

You are in an ephemeral cloud container, not a worktree beside an orchestrator.
This checkout is a fresh clone and is already on %s. Everything you do here dies
with the container except what is committed on that branch — so commit as you
go, and do not wait until the end.

Do NOT push, and do not create or switch branches. When you exit, this
container's entrypoint commits %s and pushes %s for you; that push
is the only channel out. Terminal output is not read by anything.
`, branch, WorkerResultFile(tick), branch)
}
