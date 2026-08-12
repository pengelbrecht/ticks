package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Exit-code normalization across the whole command surface.
//
// Two conditions an orchestrator has to branch on mechanically:
//
//	no repo -> 3 (ExitNoRepo)   — the working directory is not inside a git repo
//	no tick -> 4 (ExitNotFound) — the id resolves to no tick file
//
// Before this table ~25 commands reported both as 1 (generic failure) because
// they wrapped repoRoot() and store.Read() with a bare fmt.Errorf, while
// approve/reject/merge and the tk herd family already returned the typed
// codes. Classification is now central — repoRoot() itself carries
// ExitNoRepo, notFoundIfMissing() carries ExitNotFound — so a command added
// later inherits it instead of opting in.

// runOutsideRepo executes args from a directory with no .git in its ancestry.
func runOutsideRepo(t *testing.T, args []string) error {
	t.Helper()
	chdirOutsideAnyRepo(t)
	captureCmdOutput(t)
	_, err := captureStdoutStr(t, func() error { return ExecuteArgs(args) })
	return err
}

// TestNoRepoExitsNoRepo pins exit 3 for every command that resolves the repo
// root. Commands that never call repoRoot() (version, whoami, snippet,
// upgrade, board, the merge drivers) are deliberately absent.
func TestNoRepoExitsNoRepo(t *testing.T) {
	for _, tc := range []struct {
		name string
		args []string
	}{
		// Previously exit 1 — plain fmt.Errorf around repoRoot().
		{"init", []string{"init"}},
		{"create", []string{"create", "A title"}},
		{"show", []string{"show", "abc"}},
		{"update", []string{"update", "abc", "--status", "in_progress"}},
		{"close", []string{"close", "abc"}},
		{"reopen", []string{"reopen", "abc"}},
		{"delete", []string{"delete", "abc", "--force"}},
		{"block", []string{"block", "abc", "def"}},
		{"unblock", []string{"unblock", "abc", "def"}},
		{"note", []string{"note", "abc", "a note"}},
		{"notes", []string{"notes", "abc"}},
		{"list", []string{"list"}},
		{"ready", []string{"ready"}},
		{"next", []string{"next"}},
		{"blocked", []string{"blocked"}},
		{"label add", []string{"label", "add", "abc", "x"}},
		{"label rm", []string{"label", "rm", "abc", "x"}},
		{"label list", []string{"label", "list", "abc"}},
		{"labels", []string{"labels"}},
		{"deps", []string{"deps", "abc"}},
		{"graph", []string{"graph", "abc"}},
		{"roadmap", []string{"roadmap"}},
		{"status", []string{"status"}},
		{"stats", []string{"stats"}},
		{"rebuild", []string{"rebuild"}},
		{"migrate", []string{"migrate"}},
		{"gc", []string{"gc"}},
		{"import", []string{"import"}},
		{"tui", []string{"tui"}},
		{"skills install", []string{"skills", "install", "ticks"}},
		{"skills diff", []string{"skills", "diff", "ticks"}},

		// Already exit 3 before this change — must stay 3.
		{"approve", []string{"approve", "abc"}},
		{"reject", []string{"reject", "abc", "not good enough"}},
		{"merge", []string{"merge", "abc"}},
		{"herd collect", []string{"herd", "collect", "--epic", "ep1"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := runOutsideRepo(t, tc.args)
			if err == nil {
				t.Fatalf("tk %s outside a repo returned nil error", strings.Join(tc.args, " "))
			}
			if code := GetExitCode(err); code != ExitNoRepo {
				t.Errorf("exit code = %d, want %d (no repo): %v", code, ExitNoRepo, err)
			}
		})
	}
}

// seedTickRepo builds a temp git repo holding one real tick (id "aaa"), so a
// lookup of a different id is a genuine "no such tick" and not an empty store.
func seedTickRepo(t *testing.T) string {
	t.Helper()
	repoDir, store := setupTestRepo(t)
	if err := store.Write(makeTestTask("aaa")); err != nil {
		t.Fatalf("write seed tick: %v", err)
	}
	return repoDir
}

// TestMissingTickExitsNotFound pins exit 4 for every command whose positional
// id names a tick that does not exist.
func TestMissingTickExitsNotFound(t *testing.T) {
	for _, tc := range []struct {
		name string
		args []string
	}{
		// Previously exit 1 — plain fmt.Errorf around store.Read()/Delete().
		{"show", []string{"show", "zzz"}},
		{"update", []string{"update", "zzz", "--status", "in_progress"}},
		{"close", []string{"close", "zzz"}},
		{"reopen", []string{"reopen", "zzz"}},
		{"delete", []string{"delete", "zzz", "--force"}},
		{"block", []string{"block", "zzz", "aaa"}},
		{"block missing blocker", []string{"block", "aaa", "zzz"}},
		{"unblock", []string{"unblock", "zzz", "aaa"}},
		{"note", []string{"note", "zzz", "a note"}},
		{"notes", []string{"notes", "zzz"}},
		{"label add", []string{"label", "add", "zzz", "x"}},
		{"label rm", []string{"label", "rm", "zzz", "x"}},
		{"label list", []string{"label", "list", "zzz"}},
		{"deps", []string{"deps", "zzz"}},
		{"graph", []string{"graph", "zzz"}},
		{"roadmap", []string{"roadmap", "zzz"}},

		// Already exit 4 before this change — must stay 4.
		{"approve", []string{"approve", "zzz"}},
		{"reject", []string{"reject", "zzz", "not good enough"}},
		{"merge", []string{"merge", "zzz"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			seedTickRepo(t)
			captureCmdOutput(t)
			_, err := captureStdoutStr(t, func() error { return ExecuteArgs(tc.args) })
			if err == nil {
				t.Fatalf("tk %s returned nil error", strings.Join(tc.args, " "))
			}
			if code := GetExitCode(err); code != ExitNotFound {
				t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
			}
		})
	}
}

// TestCorruptTickIsNotNotFound pins the boundary the herd family already
// draws (see herdCollectManifests): only an ABSENT tick is 4. A tick file
// that exists but cannot be parsed is a real failure (1) — a caller reading 4
// as "this id was never created" would otherwise recreate work on top of a
// damaged file.
func TestCorruptTickIsNotNotFound(t *testing.T) {
	repoDir := seedTickRepo(t)
	corrupt := filepath.Join(repoDir, ".tick", "issues", "bbb.json")
	if err := os.WriteFile(corrupt, []byte("{not json"), 0o644); err != nil {
		t.Fatalf("write corrupt tick: %v", err)
	}

	captureCmdOutput(t)
	_, err := captureStdoutStr(t, func() error { return ExecuteArgs([]string{"show", "bbb"}) })
	if err == nil {
		t.Fatal("tk show on a corrupt tick returned nil error")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic): %v", code, ExitGeneric, err)
	}
}
