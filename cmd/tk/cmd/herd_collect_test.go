package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/collect"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// ---------------------------------------------------------------------------
// Fixtures. setupTestRepo chdirs into a real temp git repo, which is what
// repoRoot() resolves; every check these commands make is a real git question,
// so the repo is real too.
// ---------------------------------------------------------------------------

// setupHerdRepo makes a repo with one commit and returns it plus that commit,
// standing in for the integration commit a worker branched from.
func setupHerdRepo(t *testing.T) (repo, base string) {
	t.Helper()
	repo, _ = setupTestRepo(t)
	writeHerdFile(t, filepath.Join(repo, "README.md"), "base\n")
	execTestCmd(t, repo, "git", "add", "-A")
	execTestCmd(t, repo, "git", "commit", "-m", "base")
	return repo, herdGitOut(t, repo, "rev-parse", "HEAD")
}

func writeHerdFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// herdGitOut runs git in dir and returns its trimmed output.
func herdGitOut(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("git %s: %v", strings.Join(args, " "), err)
	}
	return strings.TrimSpace(string(out))
}

// herdWorkerBranch creates the worker's branch with the given files committed
// on it, then returns to the starting branch.
func herdWorkerBranch(t *testing.T, repo, branch, base string, files map[string]string) {
	t.Helper()
	execTestCmd(t, repo, "git", "checkout", "-q", "-b", branch, base)
	for name, body := range files {
		writeHerdFile(t, filepath.Join(repo, name), body)
	}
	execTestCmd(t, repo, "git", "add", "-A")
	execTestCmd(t, repo, "git", "commit", "-m", "work on "+branch)
	execTestCmd(t, repo, "git", "checkout", "-q", "-")
}

// herdWorktree is a stand-in for the path herdr chose: a plain directory with
// the worker's report in it. The commands must read the RECORDED path and
// never derive one.
func herdWorktree(t *testing.T, tickID, result string) string {
	t.Helper()
	dir := t.TempDir()
	if result != "" {
		writeHerdFile(t, filepath.Join(dir, "RESULT-"+tickID+".md"), result)
	}
	return dir
}

// herdManifest writes a manifest exactly where `tk herd spawn` would.
func herdManifest(t *testing.T, repo string, m state.Manifest) string {
	t.Helper()
	path, err := state.Write(repo, m)
	if err != nil {
		t.Fatalf("state.Write: %v", err)
	}
	return path
}

// captureHerdOutput splits stdout from stderr. cobra prints "Error: ..." to
// the error writer, and a --json test must parse stdout alone.
func captureHerdOutput(t *testing.T) (out, errOut *bytes.Buffer) {
	t.Helper()
	out, errOut = &bytes.Buffer{}, &bytes.Buffer{}
	rootCmd.SetOut(out)
	rootCmd.SetErr(errOut)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return out, errOut
}

func herdBaseManifest(tickID, epicID, branch, base, worktree string) state.Manifest {
	return state.Manifest{
		Tick: tickID, Epic: epicID, Branch: branch, Base: base,
		Worktree: worktree, WorkspaceID: "w-" + tickID, Agent: "tick-" + tickID,
		PaneID: "w1:p1", Kind: "claude",
	}
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

func TestHerdCollectReadyToMerge(t *testing.T) {
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
	wt := herdWorktree(t, "nhk", "report\n\nSTATUS: DONE\n")
	herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "collect", "nhk"}); err != nil {
		t.Fatalf("herd collect: %v\n%s", err, buf.String())
	}
	out := buf.String()
	for _, want := range []string{"ready-to-merge", "tick/nhk", "STATUS: DONE", "boundary  clean"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
}

func TestHerdCollectVerdicts(t *testing.T) {
	cases := []struct {
		name    string
		files   map[string]string // committed on the branch; nil means no branch
		result  string            // report body; empty means no report
		verdict collect.Verdict
	}{
		{"no-commits", nil, "STATUS: DONE\n", collect.NoCommits},
		{"missing-result", map[string]string{"a.go": "package a\n"}, "", collect.MissingResult},
		{"boundary-violation", map[string]string{
			"a.go": "package a\n", ".tick/ticks/x.json": "{}\n",
		}, "STATUS: DONE\n", collect.BoundaryViolation},
		{"ready-to-merge", map[string]string{"a.go": "package a\n"}, "STATUS: DONE\n", collect.ReadyToMerge},
	}
	for _, c := range cases {
		t.Run(string(c.verdict), func(t *testing.T) {
			repo, base := setupHerdRepo(t)
			if c.files != nil {
				herdWorkerBranch(t, repo, "tick/nhk", base, c.files)
			} else {
				execTestCmd(t, repo, "git", "branch", "tick/nhk", base)
			}
			wt := herdWorktree(t, "nhk", c.result)
			herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
			buf, _ := captureHerdOutput(t)

			err := ExecuteArgs([]string{"herd", "collect", "nhk", "--json"})
			doc := decodeCollectJSON(t, buf.String())
			if len(doc.Reports) != 1 {
				t.Fatalf("reports = %d, want 1", len(doc.Reports))
			}
			if doc.Reports[0].Verdict != c.verdict {
				t.Errorf("verdict = %q, want %q", doc.Reports[0].Verdict, c.verdict)
			}
			if c.verdict == collect.ReadyToMerge {
				if err != nil {
					t.Errorf("exit = %v, want 0 for ready-to-merge", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("verdict %s exited 0", c.verdict)
			}
			if code := GetExitCode(err); code != ExitGeneric {
				t.Errorf("exit code = %d, want %d", code, ExitGeneric)
			}
		})
	}
}

type collectDoc struct {
	Reports []collect.Report `json:"reports"`
	Summary struct {
		Total      int  `json:"total"`
		Ready      int  `json:"ready"`
		NeedsHuman int  `json:"needs_human"`
		OK         bool `json:"ok"`
	} `json:"summary"`
}

func decodeCollectJSON(t *testing.T, out string) collectDoc {
	t.Helper()
	var doc collectDoc
	if err := json.Unmarshal([]byte(out), &doc); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, out)
	}
	return doc
}

// TestHerdCollectStatusParsing pins all four statuses plus the missing-line
// case, through the command.
func TestHerdCollectStatusParsing(t *testing.T) {
	cases := []struct {
		body       string
		wantStatus string
		wantHuman  bool
	}{
		{"STATUS: DONE\n", "DONE", false},
		{"STATUS: DONE_WITH_CONCERNS — check the socket path\n", "DONE_WITH_CONCERNS", false},
		{"STATUS: NEEDS_CONTEXT — which base commit?\n", "NEEDS_CONTEXT", true},
		{"STATUS: BLOCKED — no network\n", "BLOCKED", true},
		{"I forgot the status line entirely\n", "", false},
	}
	for _, c := range cases {
		t.Run(c.wantStatus+"|", func(t *testing.T) {
			repo, base := setupHerdRepo(t)
			herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
			wt := herdWorktree(t, "nhk", c.body)
			herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
			buf, _ := captureHerdOutput(t)

			_ = ExecuteArgs([]string{"herd", "collect", "nhk", "--json"})
			doc := decodeCollectJSON(t, buf.String())
			r := doc.Reports[0]
			if r.Status != c.wantStatus {
				t.Errorf("status = %q, want %q", r.Status, c.wantStatus)
			}
			if c.wantStatus == "" {
				if r.Verdict != collect.MissingResult {
					t.Errorf("verdict = %q, want missing-result for a statusless report", r.Verdict)
				}
				return
			}
			if r.Verdict != collect.ReadyToMerge {
				t.Errorf("verdict = %q, want ready-to-merge", r.Verdict)
			}
			if got := doc.Summary.NeedsHuman > 0; got != c.wantHuman {
				t.Errorf("needs_human = %v, want %v for %s", got, c.wantHuman, c.wantStatus)
			}
		})
	}
}

// TestHerdCollectBlockedStatusIsFlagged pins that a mergeable-shaped branch
// from a BLOCKED worker still tells the operator to escalate.
func TestHerdCollectBlockedStatusIsFlagged(t *testing.T) {
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
	wt := herdWorktree(t, "nhk", "STATUS: BLOCKED — needs a human decision\n")
	herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "collect", "nhk"}); err != nil {
		t.Fatalf("herd collect: %v", err)
	}
	if !strings.Contains(buf.String(), "escalate") {
		t.Errorf("a BLOCKED report was not flagged for escalation:\n%s", buf.String())
	}
}

// TestHerdCollectWholeEpic pins the wave form: one call, one report per
// manifest, and a non-zero exit if any of them is not ready.
func TestHerdCollectWholeEpic(t *testing.T) {
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/aaa", base, map[string]string{"a.go": "package a\n"})
	execTestCmd(t, repo, "git", "branch", "tick/bbb", base)
	herdManifest(t, repo, herdBaseManifest("aaa", "gyz", "tick/aaa", base,
		herdWorktree(t, "aaa", "STATUS: DONE\n")))
	herdManifest(t, repo, herdBaseManifest("bbb", "gyz", "tick/bbb", base,
		herdWorktree(t, "bbb", "STATUS: DONE\n")))
	buf, _ := captureHerdOutput(t)

	err := ExecuteArgs([]string{"herd", "collect", "--epic", "gyz", "--json"})
	if err == nil {
		t.Fatal("a wave with one empty branch exited 0")
	}
	doc := decodeCollectJSON(t, buf.String())
	if doc.Summary.Total != 2 || doc.Summary.Ready != 1 || doc.Summary.OK {
		t.Errorf("summary = %+v, want 2 total / 1 ready / not ok", doc.Summary)
	}
}

// TestHerdCollectFindsManifestWithoutEpic pins that a caller need not remember
// which epic a tick belongs to.
func TestHerdCollectFindsManifestWithoutEpic(t *testing.T) {
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
	wt := herdWorktree(t, "nhk", "STATUS: DONE\n")
	herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "collect", "nhk", "--json"}); err != nil {
		t.Fatalf("herd collect: %v\n%s", err, buf.String())
	}
	doc := decodeCollectJSON(t, buf.String())
	if got := doc.Reports[0].ManifestPath; !strings.HasSuffix(filepath.ToSlash(got), "/gyz/nhk.json") {
		t.Errorf("manifest_path = %q, want the epic's manifest", got)
	}
}

func TestHerdCollectMissingManifestIsNotFound(t *testing.T) {
	setupHerdRepo(t)
	err := ExecuteArgs([]string{"herd", "collect", "nhk"})
	if err == nil {
		t.Fatal("collect with no manifest returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}

// TestHerdCollectCorruptManifestIsGeneric pins that a manifest which exists but
// cannot be parsed is never reported as "not found" (exit 4), in either lookup
// branch. Exit 4 means nothing was spawned; a caller acting on it after a
// truncated write would spawn a second worker on top of a live one.
func TestHerdCollectCorruptManifestIsGeneric(t *testing.T) {
	for _, tc := range []struct {
		name string
		args []string
	}{
		{"direct epic lookup", []string{"herd", "collect", "--epic", "gyz", "nhk"}},
		{"scan without epic", []string{"herd", "collect", "nhk"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo, _ := setupHerdRepo(t)
			writeHerdFile(t, state.Path(repo, "gyz", "nhk"), "{not json")

			err := ExecuteArgs(tc.args)
			if err == nil {
				t.Fatal("collect over a corrupt manifest returned nil error")
			}
			if code := GetExitCode(err); code != ExitGeneric {
				t.Errorf("exit code = %d, want %d (generic): %v", code, ExitGeneric, err)
			}
		})
	}
}

func TestHerdCollectNoArgsWithoutEpicIsUsage(t *testing.T) {
	setupHerdRepo(t)
	err := ExecuteArgs([]string{"herd", "collect"})
	if err == nil {
		t.Fatal("collect with neither a tick id nor --epic returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
}

// TestHerdCollectNeverMerges pins the headline prohibition: the working tree
// and HEAD are exactly where they were.
func TestHerdCollectNeverMerges(t *testing.T) {
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
	wt := herdWorktree(t, "nhk", "STATUS: DONE\n")
	herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
	before := herdGitOut(t, repo, "rev-parse", "HEAD")
	statusBefore := herdGitOut(t, repo, "status", "--porcelain")

	if err := ExecuteArgs([]string{"herd", "collect", "nhk"}); err != nil {
		t.Fatalf("herd collect: %v", err)
	}
	if after := herdGitOut(t, repo, "rev-parse", "HEAD"); after != before {
		t.Errorf("HEAD moved from %s to %s — collect must never merge", before, after)
	}
	if status := herdGitOut(t, repo, "status", "--porcelain"); status != statusBefore {
		t.Errorf("working tree changed after collect:\n%s", status)
	}
	if branches := herdGitOut(t, repo, "branch", "--list"); !strings.Contains(branches, "tick/nhk") {
		t.Errorf("branch list = %q, want the worker branch untouched", branches)
	}
}

// TestHerdCollectFlagsResetBetweenExecutions pins the ResetFlags contract.
func TestHerdCollectFlagsResetBetweenExecutions(t *testing.T) {
	setupHerdRepo(t)
	_ = ExecuteArgs([]string{"herd", "collect", "nhk", "--epic", "gyz", "--json"})
	_ = ExecuteArgs([]string{"herd", "collect", "nhk"})
	if herdCollectJSON {
		t.Error("herdCollectJSON leaked across executions")
	}
	if herdCollectEpic != "" {
		t.Errorf("herdCollectEpic = %q, want it reset", herdCollectEpic)
	}
}
