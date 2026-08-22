//go:build !windows

package sandbox

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The worker container's BOUNDARY GUARD (tick dxk).
//
// Observed live in run_215b7cbff9dd405c80d738be45cccde5, tick 5jo: the first
// cloud worker container in this project's history to complete real work made
// a correct, substantial implementation commit — and then ran `tk close` and
// committed the result, touching `.tick/activity/activity.jsonl` and
// `.tick/issues/5jo.json`. The worker prompt forbids exactly that, in the
// second line of its Boundaries section. The instruction was right and was
// ignored.
//
// It was ignored by the tier the factory routes containers at, so it is a fact
// to design around rather than a bug to file: an agent that CANNOT invoke `tk`
// and CANNOT commit under `.tick/` does not need to be persuaded not to. The
// container is ours end to end, so the boundary is enforced here rather than
// requested in prose.
//
// What is under test is that enforcement, in the three shapes a violation
// actually takes — the tracker CLI, a direct write that gets committed, and a
// direct write left dirty for the container's own salvage to sweep up — plus
// the thing that makes it useful: every one of them reaches a human through
// the report, because a violation that is silently prevented trains nobody.
//
// Defence in depth, deliberately. `cloud/factory/src/worker-collect.ts`
// already fails a branch that touches `.tick/` with `boundary-violation`, the
// way `tk herd collect` does, so tracker state could never have MERGED. What
// it could do — and did — is convert a tick whose work was good into a branch
// the collector refuses wholesale. The guard is what keeps the good commit.

// workerAgent replaces the fixture's stand-in agent with one that does the job
// properly and ALSO does `body` — the boundary-crossing thing the case is
// about. It commits real work first and writes a DONE report last, so what
// each case proves is the guard's effect and never a broken agent.
func workerAgent(f *workerFixture, body string) {
	f.t.Helper()
	writeStub(f.t, filepath.Join(f.binDir, "omp"), harnessStubPreamble+`printf 'work\n' > worked.txt
git add worked.txt
git commit -q -m "tick ${TICKS_TICK}: the work"
`+body+`
printf '# %s\n\nI did the thing.\n\nSTATUS: DONE\n' "$TICKS_TICK" > "RESULT-${TICKS_TICK}.md"
exit 0
`)
}

// remoteTickPaths returns the `.tick/` paths a pushed branch changed relative
// to the base — the same three-dot question `worker-collect.ts` asks GitHub,
// asked here of the origin the container actually pushed to. Non-empty is the
// violation, whatever the report says.
func (f *workerFixture) remoteTickPaths(branch string) []string {
	f.t.Helper()
	out := git(f.t, f.source, "diff", "--name-only", f.baseSHA+"...refs/heads/"+branch, "--", ".tick")
	out = strings.TrimSpace(out)
	if out == "" {
		return nil
	}
	return strings.Split(out, "\n")
}

func (f *workerFixture) reportOnOrigin(branch string) string {
	f.t.Helper()
	report, ok := f.remoteFile(branch, WorkerResultFile(f.tick))
	if !ok {
		f.t.Fatal("no report reached origin at all; it is the only channel this container has")
	}
	return report
}

// --------------------------------------------------------------- the shim ---

// The strongest of the options this tick weighed, and the cheapest: an agent
// that cannot invoke `tk` cannot mutate tracker state by any route through it,
// including ones nobody enumerated. The split is clean because the entrypoint
// needs `tk` only BEFORE the harness starts (the version check, the model
// cell, the toolchain, the setup, the pre-flight and the prompt) and never
// after it — so the denial can be scoped to the harness and everything it
// spawns, and the container keeps its own tk.
func TestWorkerDeniesTheAgentTkAndSaysTheAttemptHappened(t *testing.T) {
	f := newWorkerFixture(t)
	attempt := filepath.Join(f.root, "tk-attempt")
	f.env["TICKS_TEST_TK_ATTEMPT"] = attempt
	// Through a nested shell, not directly: a harness runs its bash tool calls
	// as CHILDREN, so what has to be denied is `tk` as resolved by a process
	// the container never launched itself. A guard that only shadowed the
	// harness's own `tk` would pass a direct call and miss every real one.
	workerAgent(f, `bash -c 'tk close "$TICKS_TICK"' >"$TICKS_TEST_TK_ATTEMPT" 2>&1
printf 'exit=%s\n' "$?" >>"$TICKS_TEST_TK_ATTEMPT"`)

	out, code := f.run()
	if code != 0 {
		t.Fatalf("a worker whose agent's tk call was refused exited %d; the refusal must not cost the tick its work:\n%s", code, out)
	}

	got, err := os.ReadFile(attempt)
	if err != nil {
		t.Fatalf("the agent never got to try `tk close`, so this proves nothing: %v\n%s", err, out)
	}
	if strings.Contains(string(got), "exit=0") {
		t.Errorf("the agent's `tk close` SUCCEEDED inside the container — the boundary is still only requested:\n%s", got)
	}
	mustContain(t, string(got), WorkerTkDeniedMessage, "the refusal the agent is handed")

	// The entrypoint's own tk is untouched: the guard is the agent's PATH, not
	// the container's. A guard that denied both would have taken the prompt
	// with it and this run would never have started.
	mustContain(t, f.tkCalls(), "sandbox worker-prompt", "the entrypoint's own tk still answering")

	branch := WorkerBranch(f.epic, f.tick)
	if paths := f.remoteTickPaths(branch); len(paths) != 0 {
		t.Errorf("%s changed tracker state anyway: %v", branch, paths)
	}
	if _, ok := f.remoteFile(branch, "worked.txt"); !ok {
		t.Error("the agent's real work is missing from the branch; the guard cost the tick what it came for")
	}

	report := f.reportOnOrigin(branch)
	mustContain(t, report, WorkerBoundaryReportMarker, "the attempt reaching a human")
	mustContain(t, report, "tk close", "what the agent actually tried")
	// The agent's own verdict is still the last word: the container reports
	// facts above it and never rewrites the line collect reads.
	if idx := strings.LastIndex(report, "STATUS:"); idx == -1 || !strings.Contains(report[idx:], "DONE") {
		t.Errorf("the boundary annotation displaced the agent's status line:\n%s", report)
	}
}

// --------------------------------------------------------------- the hook ---

// The shim closes the route the observed agent took. It does not close a
// direct write, and an agent told it may not run `tk` may well reach for the
// files instead — so the clone refuses to COMMIT them too. This is the check
// that catches a route through no tool at all.
func TestWorkerRefusesACommitThatWritesTrackerState(t *testing.T) {
	f := newWorkerFixture(t)
	attempt := filepath.Join(f.root, "commit-attempt")
	f.env["TICKS_TEST_COMMIT_ATTEMPT"] = attempt
	workerAgent(f, `mkdir -p .tick/issues
printf '{"id":"%s","status":"closed"}\n' "$TICKS_TICK" > ".tick/issues/${TICKS_TICK}.json"
printf '\nclosed by the agent\n' >> .tick/config.md
git add -A
git commit -q -m "tick ${TICKS_TICK}: close" >"$TICKS_TEST_COMMIT_ATTEMPT" 2>&1
printf 'exit=%s\n' "$?" >>"$TICKS_TEST_COMMIT_ATTEMPT"`)

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}

	got, err := os.ReadFile(attempt)
	if err != nil {
		t.Fatalf("the agent never got to try the commit: %v\n%s", err, out)
	}
	if strings.Contains(string(got), "exit=0") {
		t.Errorf("the agent COMMITTED tracker state; only the collector stands between that and a merge:\n%s", got)
	}

	branch := WorkerBranch(f.epic, f.tick)
	if paths := f.remoteTickPaths(branch); len(paths) != 0 {
		t.Errorf("%s carries tracker state: %v", branch, paths)
	}
	// The real work is what the run paid for, and a refused commit must not
	// take it down with it.
	if _, ok := f.remoteFile(branch, "worked.txt"); !ok {
		t.Error("the agent's real work is missing from the branch")
	}
	report := f.reportOnOrigin(branch)
	mustContain(t, report, WorkerBoundaryReportMarker, "the attempt reaching a human")
	mustContain(t, report, ".tick/issues/", "which tracker file the agent wrote")
}

// ------------------------------------------------------------ the salvage ---

// The container commits everything the harness left dirty (tick 5fg), so the
// salvage is itself a route into `.tick/`: an agent whose commit was refused
// leaves the tracker files sitting in the worktree, and a sweep that took them
// would launder the violation into a commit the container itself authored.
func TestWorkerSalvageNeverCarriesTrackerState(t *testing.T) {
	f := newWorkerFixture(t)
	workerAgent(f, `printf 'half a tick\n' > partial.txt
printf '\ntampered\n' >> .tick/config.md
mkdir -p .tick/activity
printf '{"kind":"close"}\n' >> .tick/activity/activity.jsonl`)

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	branch := WorkerBranch(f.epic, f.tick)
	if paths := f.remoteTickPaths(branch); len(paths) != 0 {
		t.Errorf("the salvage swept tracker state onto %s: %v", branch, paths)
	}
	// Everything else the harness left behind is still rescued: the guard
	// narrows the salvage, it does not disable it.
	if _, ok := f.remoteFile(branch, "partial.txt"); !ok {
		t.Error("the guard cost the salvage the agent's real uncommitted work")
	}
	report := f.reportOnOrigin(branch)
	mustContain(t, report, WorkerBoundaryReportMarker, "the attempt reaching a human")
	mustContain(t, report, ".tick/activity/activity.jsonl", "the tracker file the agent wrote")
}

// ------------------------------------------------------------ the silence ---

// The annotation is a signal, so it may not become boilerplate: a worker that
// respected the boundary must produce a report with nothing about boundaries
// in it, or the marker means nothing when it does appear.
func TestWorkerSaysNothingAboutBoundariesWhenTheAgentRespectedThem(t *testing.T) {
	f := newWorkerFixture(t)
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	report := f.reportOnOrigin(WorkerBranch(f.epic, f.tick))
	if strings.Contains(report, WorkerBoundaryReportMarker) {
		t.Errorf("a well-behaved worker's report claims a boundary violation:\n%s", report)
	}
}
