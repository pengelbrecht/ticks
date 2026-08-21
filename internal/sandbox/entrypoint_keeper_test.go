//go:build !windows

package sandbox

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// The harness stub that behaves like an orchestrator: it commits, and then
// waits to see that commit ON ORIGIN while it is still running. That wait is
// the whole assertion — a run that only pushes at closeout never satisfies it,
// which is exactly the run that lost four hours of work on seven ticks when
// its container was destroyed.
const committingHarnessStub = harnessStubPreamble + `{
  printf 'CWD=%s\n' "$PWD"
  env
} > "$TICKS_TEST_RECORD"
printf 'harness: working\n'
printf 'work\n' > tick-gm5.txt
git add -A >/dev/null 2>&1
git commit -q -m 'tick gm5: implement' >/dev/null 2>&1
sha="$(git rev-parse HEAD)"
printf '%s\n' "$sha" > "$TICKS_TEST_COMMIT_RECORD"
i=0
while [ "$i" -lt 300 ]; do
  remote="$(git ls-remote origin "refs/heads/$TICKS_TEST_WATCH_BRANCH" 2>/dev/null | awk '{ print $1 }')"
  if [ "$remote" = "$sha" ]; then
    printf '%s\n' "$sha" > "$TICKS_TEST_PUSH_RECORD"
    break
  fi
  i=$((i + 1))
  sleep 0.1
done
printf 'harness: done\n'
`

// keeping wires the fixture up for a run whose harness commits: a one-second
// keeper, and the three record files the stub above writes.
func (f *fixture) keeping(watch string) (commitRecord, pushRecord string) {
	f.t.Helper()
	commitRecord = filepath.Join(f.root, "commit-record")
	pushRecord = filepath.Join(f.root, "push-record")
	f.env[EnvKeeperInterval] = "1"
	f.env["TICKS_TEST_WATCH_BRANCH"] = watch
	f.env["TICKS_TEST_COMMIT_RECORD"] = commitRecord
	f.env["TICKS_TEST_PUSH_RECORD"] = pushRecord
	writeStub(f.t, filepath.Join(f.binDir, "omp"), committingHarnessStub)
	return commitRecord, pushRecord
}

// sourceRef reads a branch on the "remote", empty when it has none.
func (f *fixture) sourceRef(branch string) string {
	f.t.Helper()
	cmd := exec.Command("git", "rev-parse", "--verify", "-q", "refs/heads/"+branch)
	cmd.Dir = f.source
	out, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// pushEarlierRunWork puts a commit on the run branch of the "remote", as an
// earlier boot's keeper would have: descended from this run's base, carrying
// work this boot must not redo.
func (f *fixture) pushEarlierRunWork(branch string) string {
	f.t.Helper()
	git(f.t, f.source, "checkout", "-q", "-b", branch)
	if err := os.WriteFile(filepath.Join(f.source, "merged.txt"), []byte("wave one\n"), 0o644); err != nil {
		f.t.Fatal(err)
	}
	git(f.t, f.source, "add", "-A")
	git(f.t, f.source, "commit", "-q", "-m", "tick 201: merged in wave one")
	head := git(f.t, f.source, "rev-parse", "HEAD")
	git(f.t, f.source, "checkout", "-q", "main")
	return head
}

func readTrimmed(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

// heartbeats counts the keeper's timed liveness lines in a run's output.
func heartbeats(out string) []string {
	beats := []string{}
	for _, line := range strings.Split(out, "\n") {
		if strings.Contains(line, "keeper +") {
			beats = append(beats, line)
		}
	}
	return beats
}

// THE tick: a run's work reaches origin while the run is still alive, so a
// container that is killed, evicted or budget-stopped leaves it recoverable.
func TestEntrypointPushesTheRunBranchWhileTheHarnessIsStillRunning(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	commitRecord, pushRecord := f.keeping(RunBranch("ko8"))

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}

	committed := readTrimmed(t, commitRecord)
	if committed == "" {
		t.Fatalf("the harness stub never committed\n%s", out)
	}
	if pushed := readTrimmed(t, pushRecord); pushed != committed {
		t.Fatalf("the run branch was not on origin while the harness was still running "+
			"(saw %q, want %q) — a killed run would lose the work\n%s", pushed, committed, out)
	}
	if remote := f.sourceRef(RunBranch("ko8")); remote != committed {
		t.Errorf("origin's %s is %q, want the run's commit %q", RunBranch("ko8"), remote, committed)
	}
	mustContain(t, f.harnessRecord(), EnvRunBranch+"="+RunBranch("ko8"),
		"the harness is told which branch carries the run")
}

// The run branch is stated in the prompt with the durability rule attached: an
// agent that does not know its commits are being pushed cannot be expected to
// commit as it goes.
func TestEntrypointTellsTheHarnessAboutTheRunBranch(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if out, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, RunBranch("ko8"), "the prompt names the run branch")
	mustContain(t, rec, EnvRunBranch+"="+RunBranch("ko8"), "the run branch is exported")
}

// The other half of the same incident: the stream froze at one offset for four
// hours while the run was demonstrably working, so productive work and a hang
// were indistinguishable from outside — which is what made killing it look
// correct. Liveness is printed on a timer, not at turn boundaries.
func TestEntrypointHeartbeatsWhileTheHarnessIsSilent(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvKeeperInterval] = "1"
	writeStub(t, filepath.Join(f.binDir, "omp"), harnessStubPreamble+"sleep 4\n")

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	beats := heartbeats(out)
	if len(beats) < 2 {
		t.Fatalf("%d heartbeat(s) in four silent seconds — a working run is "+
			"indistinguishable from a hung one\n%s", len(beats), out)
	}
	if beats[0] == beats[len(beats)-1] {
		t.Errorf("every heartbeat is identical, so the stream carries no progress:\n%s",
			strings.Join(beats, "\n"))
	}
}

// A run that commits nothing must push nothing. The Workflow decides whether a
// run ACTUALLY did something by comparing the remote's refs before and after
// (tick ehy, src/progress.ts); a keeper that staked its branch at the base on
// every boot would turn "the epic never moved" into "advanced".
func TestEntrypointPushesNothingWhenTheRunCommitsNothing(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvKeeperInterval] = "1"
	writeStub(t, filepath.Join(f.binDir, "omp"), harnessStubPreamble+"sleep 3\n")

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if remote := f.sourceRef(RunBranch("ko8")); remote != "" {
		t.Errorf("a run that committed nothing pushed %s at %s — that reads as progress it did not make",
			RunBranch("ko8"), remote)
	}
	if len(heartbeats(out)) == 0 {
		t.Errorf("a silent run printed no heartbeat either\n%s", out)
	}
}

// The recovery half: a boot that finds the run branch on origin continues it
// instead of starting the epic again from the base. Without this, the second
// boot is behind the durable state and could never fast-forward it.
func TestEntrypointAdoptsAPushedRunBranch(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	earlier := f.pushEarlierRunWork(RunBranch("ko8"))
	f.env[EnvPhase] = PhaseReconcile

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if head := git(t, f.workdir, "rev-parse", "HEAD"); head != earlier {
		t.Fatalf("the reboot checked out %s, want the pushed run branch %s — it would redo merged work\n%s",
			head, earlier, out)
	}
	if branch := git(t, f.workdir, "rev-parse", "--abbrev-ref", "HEAD"); branch != RunBranch("ko8") {
		t.Errorf("the checkout is on %q, want %q", branch, RunBranch("ko8"))
	}
	mustContain(t, out, "adopted", "the boot log says it continued an earlier boot's work")
	mustContain(t, f.harnessRecord(), "already carries", "the prompt says the branch is not the bare base")
}

// A run branch left behind by a run at a DIFFERENT base is another run's work.
// Taking its name would overwrite exactly what this mechanism exists to
// preserve, so it is left alone and this run pushes beside it.
func TestEntrypointLeavesAnUnrelatedRunBranchAlone(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	empty := git(t, f.source, "hash-object", "-t", "tree", os.DevNull)
	orphan := git(t, f.source, "commit-tree", empty, "-m", "another run's work")
	git(t, f.source, "update-ref", "refs/heads/"+RunBranch("ko8"), orphan)

	fallback := RunBranch("ko8") + "-run_test"
	commitRecord, pushRecord := f.keeping(fallback)

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if remote := f.sourceRef(RunBranch("ko8")); remote != orphan {
		t.Fatalf("origin's %s moved from %s to %s — an earlier run's work was overwritten",
			RunBranch("ko8"), orphan, remote)
	}
	committed := readTrimmed(t, commitRecord)
	if pushed := readTrimmed(t, pushRecord); pushed == "" || pushed != committed {
		t.Fatalf("this run's work never reached %s (saw %q, want %q)\n%s", fallback, pushed, committed, out)
	}
	mustContain(t, out, fallback, "the boot log names the branch it pushed instead")
	mustContain(t, f.harnessRecord(), EnvRunBranch+"="+fallback, "the harness is told the branch it got")
}

// The contract the image documents is the contract the script implements.
func TestSandboxReadmeDocumentsTheRunKeeper(t *testing.T) {
	path, err := Path("README.md")
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	readme := string(b)
	for _, want := range []string{EnvKeeperInterval, EnvRunBranch, RunBranchPrefix} {
		mustContain(t, readme, want, "the entrypoint contract documents the run keeper")
	}
}
