package spawn

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// repoNamePattern is the shape every qualifier must satisfy: it feeds a herdr
// agent name, so it has to start with a lowercase letter and stay inside
// `[a-z0-9-]` (no underscores — slugName strips them). The slug is capped at
// 12 runes and the hash is 6 hex, so a qualifier is at most 19 chars.
var repoNamePattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,18}$`)

// TestRepoNameFromOriginURL pins that the qualifier's readable part comes from
// the origin remote, not the checkout directory.
func TestRepoNameFromOriginURL(t *testing.T) {
	root := initTestRepo(t)
	runGit(t, root, "remote", "add", "origin", "git@github.com:acme/widgets.git")

	got, err := RepoName(root)
	if err != nil {
		t.Fatalf("RepoName: %v", err)
	}
	if !strings.HasPrefix(got, "widgets-") {
		t.Errorf("RepoName = %q, want a widgets- prefix", got)
	}
	assertRepoNameValid(t, got)
}

// TestRepoNameFallsBackToDir pins the no-remote case: the qualifier is the
// checkout's own directory name.
func TestRepoNameFallsBackToDir(t *testing.T) {
	base := t.TempDir()
	root := filepath.Join(base, "My_Repo")
	if err := mkdir(root); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	runGit(t, root, "init", "-b", "main")
	runGit(t, root, "commit", "--allow-empty", "-m", "base")

	got, err := RepoName(root)
	if err != nil {
		t.Fatalf("RepoName: %v", err)
	}
	if !strings.HasPrefix(got, "my-repo-") {
		t.Errorf("RepoName = %q, want a slugged my-repo- prefix (underscores stripped)", got)
	}
	assertRepoNameValid(t, got)
}

// TestRepoNameUniqueness pins the reason the hash exists: two same-named
// checkouts sharing one herdr server must still get distinct qualifiers, or the
// collision the issue describes comes back through the qualifier.
func TestRepoNameUniqueness(t *testing.T) {
	first := filepath.Join(t.TempDir(), "same")
	second := filepath.Join(t.TempDir(), "same")
	for _, dir := range []string{first, second} {
		if err := mkdir(dir); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		runGit(t, dir, "init", "-b", "main")
		runGit(t, dir, "commit", "--allow-empty", "-m", "base")
	}

	a, err := RepoName(first)
	if err != nil {
		t.Fatalf("RepoName(first): %v", err)
	}
	b, err := RepoName(second)
	if err != nil {
		t.Fatalf("RepoName(second): %v", err)
	}
	if a == b {
		t.Errorf("two distinct checkouts named %q produced the same qualifier %q", "same", a)
	}
	assertRepoNameValid(t, a)
	assertRepoNameValid(t, b)
}

// TestRepoNameIsDeterministic pins that the qualifier is stable across calls
// for one checkout — a manifest written at spawn is matched again at cleanup.
func TestRepoNameIsDeterministic(t *testing.T) {
	root := initTestRepo(t)
	runGit(t, root, "remote", "add", "origin", "https://example.com/acme/widgets.git")

	a, err := RepoName(root)
	if err != nil {
		t.Fatalf("RepoName: %v", err)
	}
	b, err := RepoName(root)
	if err != nil {
		t.Fatalf("RepoName: %v", err)
	}
	if a != b {
		t.Errorf("RepoName is not stable: %q then %q", a, b)
	}
}

// TestRepoNameEmptyRoot pins that an empty root fails closed instead of
// yielding a qualifier built from "" and a meaningless hash.
func TestRepoNameEmptyRoot(t *testing.T) {
	if _, err := RepoName(""); err == nil {
		t.Error("RepoName(\"\") succeeded; an empty repo root is an error")
	}
}

// TestRepoNameFitsRespawnBudget pins the 32-char ceiling end to end: a long
// repo slug is capped at 12 runes, so a full qualified name plus a respawn
// suffix still fits herdr's agent-name pattern.
func TestRepoNameFitsRespawnBudget(t *testing.T) {
	root := filepath.Join(t.TempDir(), "an-extremely-long-repository-name-that-would-overflow")
	if err := mkdir(root); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	runGit(t, root, "init", "-b", "main")
	runGit(t, root, "commit", "--allow-empty", "-m", "base")

	qualifier, err := RepoName(root)
	if err != nil {
		t.Fatalf("RepoName: %v", err)
	}
	full := AgentName(qualifier, "1aw")
	withRespawn := full + "-r99"
	if !agentNamePattern.MatchString(withRespawn) {
		t.Errorf("qualified name with respawn %q does not match herdr's %s", withRespawn, agentNamePattern)
	}
}

// TestSlugName pins the sanitisation that makes any directory or remote name
// herdr-safe.
func TestSlugName(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"My_Repo", "my-repo"},
		{"a.b/c:d", "a-b-c-d"},
		{"  padded  ", "padded"},
		{"", ""},
	} {
		if got := slugName(tc.in); got != tc.want {
			t.Errorf("slugName(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func assertRepoNameValid(t *testing.T, got string) {
	t.Helper()
	if !repoNamePattern.MatchString(got) {
		t.Errorf("qualifier %q does not match %s", got, repoNamePattern)
	}
}

func mkdir(p string) error {
	return os.MkdirAll(p, 0o755)
}
