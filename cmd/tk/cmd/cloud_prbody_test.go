package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// prBodyRepo builds the topology that produced tick 6tt: a default branch, an
// epic branch two commits ahead of it, and a run branch that was submitted from
// the epic branch's HEAD. Merging the run branch to main lands the epic's two
// commits as well — the cargo this command exists to name.
//
// It returns the repo path and the SHA the run was submitted from.
func prBodyRepo(t *testing.T) (repo, runBase string) {
	t.Helper()
	repo = t.TempDir()
	execTestCmd(t, repo, "git", "init", repo)
	execTestCmd(t, repo, "git", "checkout", "-b", "main")
	execTestCmd(t, repo, "git", "config", "user.email", "operator@example.com")
	execTestCmd(t, repo, "git", "config", "user.name", "Operator")
	prBodyCommit(t, repo, "base.txt", "base of everything")

	execTestCmd(t, repo, "git", "checkout", "-b", "epic/ko8")
	prBodyCommit(t, repo, "ko8-one.txt", "tick kji: first epic commit")
	prBodyCommit(t, repo, "ko8-two.txt", "tick uzx: second epic commit")
	runBase = strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "HEAD")))

	execTestCmd(t, repo, "git", "checkout", "-b", "tick-run/gj9")
	prBodyCommit(t, repo, "gj9-one.txt", "tick abc: work this run did")
	prBodyCommit(t, repo, "gj9-two.txt", "tick def: more work this run did")

	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir to pr-body repo: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(origDir) })
	return repo, runBase
}

func prBodyCommit(t *testing.T, repo, file, subject string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(repo, file), []byte(subject+"\n"), 0o644); err != nil {
		t.Fatalf("write %s: %v", file, err)
	}
	execTestCmd(t, repo, "git", "add", file)
	execTestCmd(t, repo, "git", "commit", "-m", subject)
}

// The whole point: a closeout PR whose diff carries commits the run never made
// must say so, name them, and say what merging it does to them.
func TestCloudPRBodyNamesTheCommitsTheRunDidNotCreate(t *testing.T) {
	_, runBase := prBodyRepo(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{
		"cloud", "pr-body",
		"--base", "main", "--head", "tick-run/gj9", "--run-base", runBase, "--epic", "gj9",
	}); err != nil {
		t.Fatalf("cloud pr-body: %v\n%s", err, buf.String())
	}
	body := buf.String()

	for _, subject := range []string{"tick kji: first epic commit", "tick uzx: second epic commit"} {
		if !strings.Contains(body, subject) {
			t.Errorf("carried commit %q is not in the body:\n%s", subject, body)
		}
	}
	if !strings.Contains(body, "Carried commits: 2") {
		t.Errorf("the body does not count the carried commits:\n%s", body)
	}
	if !strings.Contains(body, "main") || !strings.Contains(body, "did not create") {
		t.Errorf("the body does not say what merging it does to them:\n%s", body)
	}
	// The run's own commits are reported separately, never as cargo.
	created := strings.Index(body, "this run created")
	carried := strings.Index(body, "Carried commits")
	if created < 0 || carried < 0 || created < carried {
		t.Fatalf("the body does not separate cargo from the run's own work:\n%s", body)
	}
	if strings.Contains(body[carried:created], "tick abc: work this run did") {
		t.Errorf("a commit the run created was listed as cargo:\n%s", body)
	}
	if !strings.Contains(body, "tick abc: work this run did") {
		t.Errorf("the run's own commits are missing:\n%s", body)
	}
}

// A run submitted from the merge target carries nothing, and the body has to
// say that positively — silence reads as "not checked".
func TestCloudPRBodySaysWhenThereIsNoCargo(t *testing.T) {
	repo, _ := prBodyRepo(t)
	mainSHA := strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "main")))
	execTestCmd(t, repo, "git", "checkout", "-b", "tick-run/clean", "main")
	prBodyCommit(t, repo, "clean.txt", "tick xyz: the only work in this PR")
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{
		"cloud", "pr-body",
		"--base", "main", "--head", "tick-run/clean", "--run-base", mainSHA,
	}); err != nil {
		t.Fatalf("cloud pr-body: %v\n%s", err, buf.String())
	}
	body := buf.String()
	if !strings.Contains(body, "Carried commits: none") {
		t.Errorf("a clean PR body does not say so:\n%s", body)
	}
	if !strings.Contains(body, "tick xyz: the only work in this PR") {
		t.Errorf("the run's own commit is missing:\n%s", body)
	}
}

// The sandbox already knows the answers: the run branch, the SHA it was
// submitted from and the epic are in its environment, so closeout gets a body
// from a bare invocation.
func TestCloudPRBodyDefaultsToTheSandboxEnvironment(t *testing.T) {
	_, runBase := prBodyRepo(t)
	t.Setenv("TICKS_RUN_BRANCH", "tick-run/gj9")
	t.Setenv("TICKS_BASE_SHA", runBase)
	t.Setenv("TICKS_EPIC", "gj9")
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "pr-body"}); err != nil {
		t.Fatalf("cloud pr-body: %v\n%s", err, buf.String())
	}
	body := buf.String()
	if !strings.Contains(body, "gj9") {
		t.Errorf("the body does not name the epic from the environment:\n%s", body)
	}
	if !strings.Contains(body, "tick kji: first epic commit") {
		t.Errorf("the body did not enumerate the cargo from the environment:\n%s", body)
	}
}

// Fail closed. A merge target this checkout cannot resolve — the shallow clone
// a sandbox boots with is exactly that — must be an error, never a body that
// reports no cargo because it could not look.
func TestCloudPRBodyRefusesAnUnresolvableMergeTarget(t *testing.T) {
	_, runBase := prBodyRepo(t)
	buf := captureCmdOutput(t)

	err := ExecuteArgs([]string{
		"cloud", "pr-body",
		"--base", "origin/nowhere", "--head", "tick-run/gj9", "--run-base", runBase,
	})
	if err == nil {
		t.Fatalf("an unresolvable merge target produced a body:\n%s", buf.String())
	}
	if !strings.Contains(err.Error(), "origin/nowhere") {
		t.Errorf("the error does not name the ref it could not resolve: %v", err)
	}
}

// The run branch must descend from the SHA the run was submitted from, or
// "what this run created" is a guess.
func TestCloudPRBodyRefusesAHeadThatDoesNotDescendFromTheRunBase(t *testing.T) {
	repo, _ := prBodyRepo(t)
	execTestCmd(t, repo, "git", "checkout", "-b", "tick-run/elsewhere", "main")
	prBodyCommit(t, repo, "elsewhere.txt", "tick zzz: another base entirely")
	elsewhere := strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "HEAD")))
	buf := captureCmdOutput(t)

	err := ExecuteArgs([]string{
		"cloud", "pr-body",
		"--base", "main", "--head", "tick-run/gj9", "--run-base", elsewhere,
	})
	if err == nil {
		t.Fatalf("a head off the run base produced a body:\n%s", buf.String())
	}
	if !strings.Contains(err.Error(), "tick-run/gj9") {
		t.Errorf("the error does not name the branch: %v", err)
	}
}

// Without the submitted SHA the command cannot tell cargo from the run's own
// work, so it says what it needs instead of guessing.
func TestCloudPRBodyRefusesWithoutARunBase(t *testing.T) {
	prBodyRepo(t)
	t.Setenv("TICKS_BASE_SHA", "")
	buf := captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "pr-body", "--base", "main", "--head", "tick-run/gj9"})
	if err == nil {
		t.Fatalf("a missing run base produced a body:\n%s", buf.String())
	}
	if !strings.Contains(err.Error(), "--run-base") || !strings.Contains(err.Error(), "TICKS_BASE_SHA") {
		t.Errorf("the error does not say how to supply the run base: %v", err)
	}
}
