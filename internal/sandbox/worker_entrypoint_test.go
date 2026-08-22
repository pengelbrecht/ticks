//go:build !windows

package sandbox

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// End-to-end tests for cloud/sandbox/worker.sh — the per-tick worker container
// entrypoint (tick tap).
//
// The script is driven for real: a real git remote, a real clone, a real
// branch, a real push. Everything the container cannot have in a test is
// stubbed the way entrypoint_test.go stubs it — `tk`, the harness, `curl`, the
// version manager — because what is under test is what the ENTRYPOINT does
// with those answers, not the answers. In particular the harness stub is a
// stand-in agent: it commits (or does not), writes a report (or does not), and
// exits with whatever the case is about, which is the only way to exercise the
// thing this script exists for — what happens AFTER the agent stops.

type workerFixture struct {
	t        *testing.T
	root     string
	source   string // the "remote"
	workdir  string
	binDir   string
	home     string
	baseSHA  string
	env      map[string]string
	tkRecord string
	record   string
	epic     string
	tick     string
}

const (
	workerTestEpic = "1vn"
	workerTestTick = "tap"
)

// newWorkerFixture builds a source repository holding one tick, the stub
// binaries the container reaches for, and the environment the dispatcher sets.
func newWorkerFixture(t *testing.T) *workerFixture {
	t.Helper()
	root := t.TempDir()
	source := filepath.Join(root, "source")
	binDir := filepath.Join(root, "bin")
	home := filepath.Join(root, "home")
	for _, d := range []string{source, binDir, home} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	git(t, source, "init", "-q", "-b", "main")
	if err := os.MkdirAll(filepath.Join(source, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	write(t, filepath.Join(source, ".tick", "config.md"), "# Tick Run Configuration\n")
	write(t, filepath.Join(source, "hello.txt"), "hello\n")
	git(t, source, "add", "-A")
	git(t, source, "commit", "-q", "-m", "base")
	base := git(t, source, "rev-parse", "HEAD")

	f := &workerFixture{
		t: t, root: root, source: source,
		workdir:  filepath.Join(root, "work"),
		binDir:   binDir,
		home:     home,
		baseSHA:  base,
		tkRecord: filepath.Join(root, "tk-record"),
		record:   filepath.Join(root, "harness-record"),
		epic:     workerTestEpic,
		tick:     workerTestTick,
	}
	f.writeStubs()

	f.env = map[string]string{
		"PATH":                   binDir + string(os.PathListSeparator) + os.Getenv("PATH"),
		"HOME":                   home,
		"XDG_CONFIG_HOME":        filepath.Join(home, ".config"),
		EnvRepoURL:               source,
		EnvBaseSHA:               base,
		EnvEpic:                  workerTestEpic,
		EnvTick:                  workerTestTick,
		EnvGatewayBaseURL:        testGatewayURL,
		EnvGatewayToken:          testGatewayToken,
		EnvWorkdir:               f.workdir,
		EnvCacheDir:              filepath.Join(root, "cache"),
		EnvTkVersion:             "0.31.0",
		EnvRunID:                 "run_worker",
		EnvModel:                 "claude-fable-5",
		"TICKS_TEST_TK_RECORD":   f.tkRecord,
		"TICKS_TEST_TK_VERSION":  "0.31.0",
		"TICKS_TEST_RECORD":      f.record,
		"TICKS_TEST_CURL_RECORD": filepath.Join(root, "curl-record"),
		// The stand-in agent's default behaviour: do the job properly.
		"TICKS_TEST_WORKER_COMMIT": "1",
		"TICKS_TEST_WORKER_RESULT": "STATUS: DONE",
	}
	return f
}

func (f *workerFixture) writeStubs() {
	t := f.t
	// The stand-in agent. It is handed the prompt like a real harness, and it
	// does what the case wants an agent to have done: commit work, write a
	// report, exit.
	writeStub(t, filepath.Join(f.binDir, "omp"), harnessStubPreamble+`{
  printf 'CWD=%s\n' "$PWD"
  for a in "$@"; do printf 'ARG=%s\n' "$a"; done
} > "$TICKS_TEST_RECORD"
if [ -n "${TICKS_TEST_WORKER_DIRTY:-}" ]; then printf 'half a tick\n' > partial.txt; fi
if [ -n "${TICKS_TEST_WORKER_SLEEP:-}" ]; then sleep "$TICKS_TEST_WORKER_SLEEP"; fi
if [ -n "${TICKS_TEST_WORKER_COMMIT:-}" ]; then
  printf 'work\n' > worked.txt
  git add worked.txt
  git commit -q -m "tick ${TICKS_TICK}: the work"
fi
if [ -n "${TICKS_TEST_WORKER_RESULT:-}" ]; then
  printf '# %s\n\nI did the thing.\n\n%s\n' "${TICKS_TICK}" "${TICKS_TEST_WORKER_RESULT}" > "RESULT-${TICKS_TICK}.md"
fi
exit "${TICKS_TEST_WORKER_EXIT:-0}"
`)
	writeStub(t, filepath.Join(f.binDir, "claude"), harnessStubPreamble+`exit 0
`)
	writeStub(t, filepath.Join(f.binDir, "mise"), "exit 0\n")
	// `tk` delegates the same four questions the orchestrator asks plus the
	// worker's own prompt. What tk really does with each is proved against the
	// real implementation elsewhere; this records that the entrypoint asked.
	writeStub(t, filepath.Join(f.binDir, "tk"), `case "$1" in
  version) echo "tk ${TICKS_TEST_TK_VERSION}" ;;
  sandbox)
    printf '%s\n' "$*" >> "$TICKS_TEST_TK_RECORD"
    case "$2" in
      model) [ -z "${TICKS_TEST_SANDBOX_MODEL:-}" ] || printf '%s\n' "$TICKS_TEST_SANDBOX_MODEL" ;;
      image) ;;
      toolchain) ;;
      setup) exit "${TICKS_TEST_SANDBOX_SETUP_EXIT:-0}" ;;
      environment) exit "${TICKS_TEST_ENV_EXIT:-0}" ;;
      worker-prompt)
        if [ -n "${TICKS_TEST_PROMPT_EXIT:-}" ]; then exit "$TICKS_TEST_PROMPT_EXIT"; fi
        printf '%s\n' "${TICKS_TEST_PROMPT:-implement the tick}"
        ;;
    esac
    ;;
  *) exit 0 ;;
esac
`)
	writeStub(t, filepath.Join(f.binDir, "curl"), `out=""
prev=""
for a in "$@"; do
  case "$prev" in -o) out="$a" ;; esac
  prev="$a"
done
printf '%s\n' "$*" >> "$TICKS_TEST_CURL_RECORD"
[ -z "$out" ] || printf '{"ok":true}' > "$out"
printf '%s' "${TICKS_TEST_CURL_STATUS:-200}"
`)
}

func (f *workerFixture) command(args ...string) *exec.Cmd {
	f.t.Helper()
	script, err := Path(WorkerScript)
	if err != nil {
		f.t.Fatalf("locating %s: %v", WorkerScript, err)
	}
	cmd := exec.Command("bash", append([]string{script}, args...)...)
	cmd.Dir = f.root
	env := []string{}
	for k, v := range f.env {
		env = append(env, k+"="+v)
	}
	cmd.Env = env
	return cmd
}

func (f *workerFixture) run(args ...string) (string, int) {
	f.t.Helper()
	out, err := f.command(args...).CombinedOutput()
	code := 0
	if err != nil {
		exit, ok := err.(*exec.ExitError)
		if !ok {
			f.t.Fatalf("running the worker entrypoint: %v\n%s", err, out)
		}
		code = exit.ExitCode()
	}
	return string(out), code
}

// remoteBranch reports whether origin carries the branch, and its commit count
// beyond the base — read from the REMOTE, which is the only channel a worker
// has and the only one collect looks at.
func (f *workerFixture) remoteBranch(branch string) (bool, int) {
	f.t.Helper()
	cmd := exec.Command("git", "rev-parse", "--verify", "-q", "refs/heads/"+branch)
	cmd.Dir = f.source
	if err := cmd.Run(); err != nil {
		return false, 0
	}
	count := git(f.t, f.source, "rev-list", "--count", f.baseSHA+"..refs/heads/"+branch)
	n := 0
	fmt.Sscanf(count, "%d", &n)
	return true, n
}

// remoteFile returns a file's contents at the branch tip on origin.
func (f *workerFixture) remoteFile(branch, path string) (string, bool) {
	f.t.Helper()
	cmd := exec.Command("git", "show", "refs/heads/"+branch+":"+path)
	cmd.Dir = f.source
	out, err := cmd.Output()
	if err != nil {
		return "", false
	}
	return string(out), true
}

// remoteLog returns the branch's commit subjects on origin, newest first.
func (f *workerFixture) remoteLog(branch string) []string {
	f.t.Helper()
	out := git(f.t, f.source, "log", "--format=%s", branch)
	if strings.TrimSpace(out) == "" {
		return nil
	}
	return strings.Split(strings.TrimSpace(out), "\n")
}

func (f *workerFixture) tkCalls() string {
	f.t.Helper()
	b, err := os.ReadFile(f.tkRecord)
	if err != nil {
		return ""
	}
	return string(b)
}

func (f *workerFixture) harnessRecord() string {
	f.t.Helper()
	b, err := os.ReadFile(f.record)
	if err != nil {
		return ""
	}
	return string(b)
}

// --------------------------------------------------------------- the probe ---

// The green-start trap is only a trap if the container promises the marker the
// dispatcher checks for. This is that promise, asserted against the constant
// the control plane reads out of internal/sandbox.
func TestWorkerProbePrintsTheMarkerTheDispatcherChecksFor(t *testing.T) {
	f := newWorkerFixture(t)
	out, code := f.run(WorkerProbeArg)
	if code != 0 {
		t.Fatalf("the probe failed in a healthy container (exit %d):\n%s", code, out)
	}
	mustContain(t, out, WorkerProbeMarker, "the probe's marker")
	// It is trivial work, and it must stay trivial: no clone, no model call.
	if strings.Contains(out, "checked out") {
		t.Error("the probe cloned the repository; it is meant to be trivial work run before dispatch")
	}
	if _, err := os.Stat(f.workdir); err == nil {
		t.Error("the probe created the checkout directory")
	}
}

// A probe that exits 0 having printed the wrong thing is exactly the trap, so
// a broken container must not print the marker at all.
func TestWorkerProbeWithholdsTheMarkerWhenTheContainerIsBroken(t *testing.T) {
	for name, broken := range map[string]string{
		"no tk":      "tk",
		"no harness": "omp",
	} {
		t.Run(name, func(t *testing.T) {
			f := newWorkerFixture(t)
			if err := os.Remove(filepath.Join(f.binDir, broken)); err != nil {
				t.Fatal(err)
			}
			// The host's own tk and harness are on the developer's PATH and
			// would answer for the one just removed, which would make this a
			// test of the host rather than of the container. The probe needs
			// only the base system beside the stubs.
			f.env["PATH"] = f.binDir + string(os.PathListSeparator) + "/usr/bin:/bin:/usr/sbin:/sbin"
			out, code := f.run(WorkerProbeArg)
			if strings.Contains(out, WorkerProbeMarker) {
				t.Errorf("a container with no %s still printed the probe marker:\n%s", broken, out)
			}
			if code == 0 {
				t.Errorf("a container with no %s passed its own probe", broken)
			}
		})
	}
}

// ---------------------------------------------------------- the happy path ---

func TestWorkerPushesTheBranchAndTheReport(t *testing.T) {
	f := newWorkerFixture(t)
	out, code := f.run()
	if code != 0 {
		t.Fatalf("a worker that did its job exited %d:\n%s", code, out)
	}

	branch := WorkerBranch(f.epic, f.tick)
	exists, commits := f.remoteBranch(branch)
	if !exists {
		t.Fatalf("origin has no %s — collect reads git and nothing else, so this run does not exist:\n%s", branch, out)
	}
	// The agent's commit plus the entrypoint's report commit.
	if commits != 2 {
		t.Errorf("%s carries %d commit(s) beyond the base, want 2 (the work and the report)", branch, commits)
	}
	if _, ok := f.remoteFile(branch, "worked.txt"); !ok {
		t.Error("the agent's work is not on the pushed branch")
	}
	report, ok := f.remoteFile(branch, WorkerResultFile(f.tick))
	if !ok {
		t.Fatal("the report is not COMMITTED on the pushed branch; collect reads it off the branch, not out of a worktree")
	}
	mustContain(t, report, "STATUS: DONE", "the agent's own verdict")
	mustContain(t, report, "ticks-worker", "the container facts the entrypoint prepends")
	// The agent's verdict is the LAST status line, which is what
	// collect.ParseStatus reads. An annotation that moved it would silently
	// change every worker's reported outcome.
	if idx := strings.LastIndex(report, "STATUS:"); idx == -1 || !strings.Contains(report[idx:], "DONE") {
		t.Errorf("the entrypoint's annotation displaced the agent's status line:\n%s", report)
	}
}

// A worker implements; it does not plan waves. Routing every per-tick
// container at the orchestrator's frontier cell is a silent multiple on a
// wave's bill, so the entrypoint asks for the implement cell by name.
func TestWorkerRoutesItselfAtTheImplementRole(t *testing.T) {
	f := newWorkerFixture(t)
	delete(f.env, EnvModel)
	f.env["TICKS_TEST_SANDBOX_MODEL"] = "anthropic/claude-fable-5"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	mustContain(t, f.tkCalls(), "sandbox model --root", "the model delegation")
	mustContain(t, f.tkCalls(), "--role implement", "the worker's own routing cell")
}

// The job comes from the tracker in the checkout, read by tk, and reaches the
// harness. A worker started on a prompt it did not get is a container burning
// model budget on nothing.
func TestWorkerRunsTheHarnessOnTheTicksOwnPrompt(t *testing.T) {
	f := newWorkerFixture(t)
	f.env["TICKS_TEST_PROMPT"] = "IMPLEMENT-TICK-TAP-PLEASE"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	mustContain(t, f.tkCalls(), "sandbox worker-prompt", "the prompt delegation")
	mustContain(t, f.tkCalls(), "--tick "+f.tick, "the tick the prompt is for")
	mustContain(t, f.harnessRecord(), "IMPLEMENT-TICK-TAP-PLEASE", "the prompt the harness was given")
}

func TestWorkerRefusesAPromptItCouldNotBuild(t *testing.T) {
	f := newWorkerFixture(t)
	f.env["TICKS_TEST_PROMPT_EXIT"] = "1"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("a worker with no prompt exited %d, want %d:\n%s", code, ExitConfig, out)
	}
	if f.harnessRecord() != "" {
		t.Error("the harness was started with no prompt")
	}
}

// --------------------------------------------------------- the exit classes ---

// The exit counterpart of the green-start trap: a harness exits 0 when it has
// nothing left to say, which is not the same as having done something.
func TestWorkerReportsAnEmptyBranchAsItsOwnClass(t *testing.T) {
	f := newWorkerFixture(t)
	delete(f.env, "TICKS_TEST_WORKER_COMMIT")
	out, code := f.run()
	if code != ExitWorkerNoWork {
		t.Fatalf("a harness that exited 0 having committed nothing gave exit %d, want %d:\n%s",
			code, ExitWorkerNoWork, out)
	}
	// The report still has to reach origin: it is the only channel, and "it
	// did nothing and here is why" is the most useful thing an operator gets.
	branch := WorkerBranch(f.epic, f.tick)
	if _, ok := f.remoteFile(branch, WorkerResultFile(f.tick)); !ok {
		t.Error("the report was not pushed, so nothing says why the tick is unimplemented")
	}
}

func TestWorkerReportsAFailedHarnessSeparatelyFromAnEmptyBranch(t *testing.T) {
	f := newWorkerFixture(t)
	f.env["TICKS_TEST_WORKER_EXIT"] = "3"
	out, code := f.run()
	if code != ExitWorkerAgent {
		t.Fatalf("a failed harness gave exit %d, want %d:\n%s", code, ExitWorkerAgent, out)
	}
	// Whatever it managed to commit is pushed FIRST: the exit code describes
	// the agent, never the durability.
	branch := WorkerBranch(f.epic, f.tick)
	if _, ok := f.remoteFile(branch, "worked.txt"); !ok {
		t.Error("a failed harness's committed work was not pushed")
	}
}

// A report is the only channel; an absent one is indistinguishable from a
// container that never ran, so the entrypoint writes one saying exactly that
// rather than leaving the tick silent.
func TestWorkerWritesAReportWhenTheHarnessDidNot(t *testing.T) {
	f := newWorkerFixture(t)
	delete(f.env, "TICKS_TEST_WORKER_RESULT")
	out, code := f.run()
	if code != ExitWorkerAgent {
		t.Fatalf("a harness that wrote no report gave exit %d, want %d:\n%s", code, ExitWorkerAgent, out)
	}
	branch := WorkerBranch(f.epic, f.tick)
	report, ok := f.remoteFile(branch, WorkerResultFile(f.tick))
	if !ok {
		t.Fatal("no report reached origin at all")
	}
	mustContain(t, report, "STATUS: BLOCKED", "a status a collector can act on")
	mustContain(t, report, "wrote no report", "why the report is not the agent's")
}

// The worst outcome this script can produce: work that exists only in a
// container about to be destroyed. It gets its own code so a caller can retry
// rather than diagnose the tick.
func TestWorkerReportsAFailedPushAsItsOwnClass(t *testing.T) {
	f := newWorkerFixture(t)
	hook := filepath.Join(f.source, ".git", "hooks", "update")
	writeStub(t, hook, "echo 'origin refuses this ref' >&2\nexit 1\n")
	out, code := f.run()
	if code != ExitWorkerPush {
		t.Fatalf("an unpushable branch gave exit %d, want %d:\n%s", code, ExitWorkerPush, out)
	}
	mustContain(t, out, "ONLY in this container", "what a failed push costs")
}

// -------------------------------------------------------------- the branch ---

// An earlier attempt's pushed work is evidence collect explicitly still looks
// for, so a retry continues that branch instead of overwriting it.
func TestWorkerAdoptsAnEarlierAttemptOnTheSameBase(t *testing.T) {
	f := newWorkerFixture(t)
	branch := WorkerBranch(f.epic, f.tick)
	// An earlier attempt: one commit on the branch, on top of this base.
	git(t, f.source, "branch", branch, f.baseSHA)
	prior := filepath.Join(f.root, "prior")
	git(t, f.root, "clone", "-q", "-b", branch, f.source, prior)
	write(t, filepath.Join(prior, "earlier.txt"), "earlier\n")
	git(t, prior, "add", "-A")
	git(t, prior, "commit", "-q", "-m", "an earlier attempt")
	git(t, prior, "push", "-q", "origin", branch)

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	mustContain(t, out, "adopted "+branch, "the adoption of the earlier attempt")
	if _, ok := f.remoteFile(branch, "earlier.txt"); !ok {
		t.Error("the earlier attempt's work was destroyed by this one")
	}
	if _, ok := f.remoteFile(branch, "worked.txt"); !ok {
		t.Error("this attempt's work is missing")
	}
}

// A branch from another base belongs to a run at another base. Taking its name
// would overwrite exactly what the mechanism exists to preserve.
func TestWorkerPushesBesideABranchFromAnotherBase(t *testing.T) {
	f := newWorkerFixture(t)
	branch := WorkerBranch(f.epic, f.tick)
	// An ORPHAN branch: it has to not descend from this run's base, or
	// adoption would be the correct answer and this case would prove nothing.
	git(t, f.source, "checkout", "-q", "--orphan", "elsewhere")
	git(t, f.source, "rm", "-q", "-rf", ".")
	write(t, filepath.Join(f.source, "unrelated.txt"), "unrelated\n")
	git(t, f.source, "add", "-A")
	git(t, f.source, "commit", "-q", "-m", "another base entirely")
	other := git(t, f.source, "rev-parse", "HEAD")
	git(t, f.source, "branch", branch, other)
	git(t, f.source, "checkout", "-q", "main")

	out, code := f.run()
	if code != 0 && code != ExitWorkerNoWork {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	if got := git(t, f.source, "rev-parse", "refs/heads/"+branch); got != other {
		t.Errorf("%s moved from %s to %s — another base's work was overwritten", branch, other[:8], got[:8])
	}
	// This attempt still has to reach origin, beside it rather than over it.
	beside := branch + "-" + f.env[EnvRunID]
	mustContain(t, out, "pushing this attempt to "+beside, "where this attempt went instead")
	if exists, _ := f.remoteBranch(beside); !exists {
		t.Errorf("this attempt was not pushed anywhere; origin has no %s", beside)
	}
}

// ------------------------------------------------------------- the inputs ---

func TestWorkerRefusesABootWithNoTick(t *testing.T) {
	f := newWorkerFixture(t)
	delete(f.env, EnvTick)
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("a worker with no tick exited %d, want %d:\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, EnvTick, "the input that is missing")
}

func TestWorkerRefusesAnUnknownSetupMode(t *testing.T) {
	f := newWorkerFixture(t)
	f.env[EnvWorkerSetup] = "maybe"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d:\n%s", code, ExitConfig, out)
	}
}

// ---------------------------------------------------------- the setup lever ---

// Dependency install is where kuf found all of fan-out's 3.74x degradation, so
// the elapsed cost is printed per boot rather than left to be re-derived.
func TestWorkerTimesTheRepositorySetup(t *testing.T) {
	f := newWorkerFixture(t)
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	mustContain(t, f.tkCalls(), "sandbox setup", "the repository's own setup")
	mustContain(t, out, "repository setup took", "the per-boot cost of the step fan-out pays N times")
}

func TestWorkerSkipsSetupWhenTheWaveAsksItTo(t *testing.T) {
	f := newWorkerFixture(t)
	f.env[EnvWorkerSetup] = WorkerSetupSkip
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	if strings.Contains(f.tkCalls(), "sandbox setup") {
		t.Error("TICKS_WORKER_SETUP=skip still ran the repository's setup")
	}
	mustContain(t, out, "does NOT run the repository's [sandbox] setup", "what skipping costs")
}

// ------------------------------------------------------------- the bound ---

// The dispatcher's wait timeout ends in the container being KILLED, and a
// killed container pushes nothing. A worker that bounds itself first turns a
// hung agent into a pushed branch plus a report.
func TestWorkerBoundsTheHarnessAndStillPushes(t *testing.T) {
	f := newWorkerFixture(t)
	if _, err := exec.LookPath("timeout"); err != nil {
		t.Skip("no timeout(1) on this host; the bound is a no-op here by design")
	}
	f.env["TICKS_TEST_WORKER_SLEEP"] = "30"
	f.env[EnvWorkerTimeout] = "1"
	out, code := f.run()
	if code != ExitWorkerAgent {
		t.Fatalf("a bounded, hung harness gave exit %d, want %d:\n%s", code, ExitWorkerAgent, out)
	}
	mustContain(t, out, "did not finish within 1s", "the bound firing")
	branch := WorkerBranch(f.epic, f.tick)
	if _, ok := f.remoteFile(branch, WorkerResultFile(f.tick)); !ok {
		t.Error("a bounded worker pushed nothing, which is what the bound exists to prevent")
	}
}

// ---------------------------------------------------------- the salvage ---

// tick 5fg. Run run_2e66e765's three containers each made 393+ real model
// calls and were then killed by the bound above. Everything the harness had
// written but not yet committed was destroyed with the container: the script
// COUNTED the dirty paths into the report header and then threw them away.
//
// A container about to be destroyed is the wrong place to leave a file. The
// work is committed on its own, clearly labelled, so a reviewer can keep it or
// drop it — either is better than the run paying for work it does not keep.
func TestWorkerSalvagesUncommittedWorkRatherThanDiscardingIt(t *testing.T) {
	f := newWorkerFixture(t)
	delete(f.env, "TICKS_TEST_WORKER_COMMIT")
	f.env["TICKS_TEST_WORKER_DIRTY"] = "1"
	f.env["TICKS_TEST_WORKER_EXIT"] = "124"
	out, code := f.run()
	if code != ExitWorkerAgent {
		t.Fatalf("a killed harness gave exit %d, want %d:\n%s", code, ExitWorkerAgent, out)
	}
	branch := WorkerBranch(f.epic, f.tick)
	if _, ok := f.remoteFile(branch, "partial.txt"); !ok {
		t.Error("the harness's uncommitted work never reached origin; it died with the container")
	}
	report, ok := f.remoteFile(branch, WorkerResultFile(f.tick))
	if !ok {
		t.Fatal("no report reached origin at all")
	}
	// The header counts what the agent left behind BEFORE the salvage, so a
	// reader can tell agent commits from container-salvaged ones.
	mustContain(t, report, "uncommitted path(s)", "the container's own facts")
	mustContain(t, out, "salvag", "the salvage saying it happened")
}

// The salvage must never swallow the report: that file is committed on its own
// with the agent's STATUS line intact, and a salvage commit that carried it
// would make the report indistinguishable from the work.
func TestWorkerSalvageLeavesTheReportItsOwnCommit(t *testing.T) {
	f := newWorkerFixture(t)
	f.env["TICKS_TEST_WORKER_DIRTY"] = "1"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d:\n%s", code, out)
	}
	branch := WorkerBranch(f.epic, f.tick)
	subjects := f.remoteLog(branch)
	if len(subjects) == 0 {
		t.Fatal("no commits on origin")
	}
	if !strings.Contains(subjects[0], "worker report") {
		t.Errorf("the tip commit is %q, want the report's own commit", subjects[0])
	}
	if _, ok := f.remoteFile(branch, "partial.txt"); !ok {
		t.Error("the uncommitted work was not salvaged")
	}
}
