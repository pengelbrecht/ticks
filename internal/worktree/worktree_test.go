package worktree

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNewManager(t *testing.T) {
	t.Run("returns error for non-git directory", func(t *testing.T) {
		dir := t.TempDir()

		_, err := NewManager(dir)
		if err != ErrNotGitRepo {
			t.Errorf("NewManager() error = %v, want %v", err, ErrNotGitRepo)
		}
	})

	t.Run("returns manager for git directory", func(t *testing.T) {
		dir := createTempGitRepo(t)

		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}
		if m == nil {
			t.Fatal("NewManager() returned nil")
		}
		if m.repoRoot != dir {
			t.Errorf("Manager.repoRoot = %q, want %q", m.repoRoot, dir)
		}
		if m.worktreeDir != filepath.Join(dir, DefaultWorktreeDir) {
			t.Errorf("Manager.worktreeDir = %q, want %q", m.worktreeDir, filepath.Join(dir, DefaultWorktreeDir))
		}
	})

	t.Run("returns error for nonexistent directory", func(t *testing.T) {
		_, err := NewManager("/nonexistent/path")
		if err != ErrNotGitRepo {
			t.Errorf("NewManager() error = %v, want %v", err, ErrNotGitRepo)
		}
	})
}

func TestManager_Create(t *testing.T) {
	t.Run("creates worktree with new branch", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("abc123")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify worktree properties
		if wt.EpicID != "abc123" {
			t.Errorf("Worktree.EpicID = %q, want %q", wt.EpicID, "abc123")
		}
		if wt.Branch != "tick/abc123" {
			t.Errorf("Worktree.Branch = %q, want %q", wt.Branch, "tick/abc123")
		}
		expectedPath := filepath.Join(dir, DefaultWorktreeDir, "abc123")
		if wt.Path != expectedPath {
			t.Errorf("Worktree.Path = %q, want %q", wt.Path, expectedPath)
		}
		if wt.Created.IsZero() {
			t.Error("Worktree.Created should not be zero")
		}

		// Verify worktree directory exists
		if _, err := os.Stat(wt.Path); os.IsNotExist(err) {
			t.Error("Worktree directory should exist")
		}

		// Verify branch exists
		if !m.branchExists("tick/abc123") {
			t.Error("Branch tick/abc123 should exist")
		}
	})

	t.Run("creates worktree with existing branch", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create branch first
		cmd := exec.Command("git", "branch", "tick/existing")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("failed to create branch: %v", err)
		}

		wt, err := m.Create("existing")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		if wt.Branch != "tick/existing" {
			t.Errorf("Worktree.Branch = %q, want %q", wt.Branch, "tick/existing")
		}
	})

	t.Run("returns error if worktree already exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create first worktree
		_, err = m.Create("dup123")
		if err != nil {
			t.Fatalf("Create() first call error = %v", err)
		}

		// Try to create duplicate
		_, err = m.Create("dup123")
		if err != ErrWorktreeExists {
			t.Errorf("Create() second call error = %v, want %v", err, ErrWorktreeExists)
		}
	})

	t.Run("creates .worktrees directory if not exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		worktreesDir := filepath.Join(dir, DefaultWorktreeDir)
		if _, err := os.Stat(worktreesDir); !os.IsNotExist(err) {
			t.Fatal(".worktrees directory should not exist yet")
		}

		_, err = m.Create("new123")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		if _, err := os.Stat(worktreesDir); os.IsNotExist(err) {
			t.Error(".worktrees directory should exist after Create()")
		}
	})
}

func TestManager_Remove(t *testing.T) {
	t.Run("removes worktree and branch", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := m.Create("rem123")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify it exists
		if _, err := os.Stat(wt.Path); os.IsNotExist(err) {
			t.Fatal("Worktree should exist before remove")
		}

		// Remove it
		if err := m.Remove("rem123"); err != nil {
			t.Fatalf("Remove() error = %v", err)
		}

		// Verify worktree directory is gone
		if _, err := os.Stat(wt.Path); !os.IsNotExist(err) {
			t.Error("Worktree directory should not exist after Remove()")
		}

		// Verify branch is deleted
		if m.branchExists("tick/rem123") {
			t.Error("Branch tick/rem123 should not exist after Remove()")
		}
	})

	t.Run("removes worktree with uncommitted changes", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := m.Create("dirty")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Create uncommitted file in worktree
		uncommittedFile := filepath.Join(wt.Path, "uncommitted.txt")
		if err := os.WriteFile(uncommittedFile, []byte("dirty"), 0644); err != nil {
			t.Fatalf("failed to create uncommitted file: %v", err)
		}

		// Remove should still succeed (force)
		if err := m.Remove("dirty"); err != nil {
			t.Fatalf("Remove() error = %v", err)
		}

		// Verify worktree is gone
		if _, err := os.Stat(wt.Path); !os.IsNotExist(err) {
			t.Error("Worktree directory should not exist after force Remove()")
		}
	})

	t.Run("returns error for nonexistent worktree", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		err = m.Remove("nonexistent")
		if err != ErrWorktreeNotFound {
			t.Errorf("Remove() error = %v, want %v", err, ErrWorktreeNotFound)
		}
	})
}

func TestManager_Get(t *testing.T) {
	t.Run("returns worktree if exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		created, err := m.Create("get123")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Get it back
		got, err := m.Get("get123")
		if err != nil {
			t.Fatalf("Get() error = %v", err)
		}
		if got == nil {
			t.Fatal("Get() returned nil, want worktree")
		}
		if got.EpicID != created.EpicID {
			t.Errorf("Get().EpicID = %q, want %q", got.EpicID, created.EpicID)
		}
		// Compare paths by evaluating symlinks (macOS /var -> /private/var)
		gotPath, _ := filepath.EvalSymlinks(got.Path)
		createdPath, _ := filepath.EvalSymlinks(created.Path)
		if gotPath != createdPath {
			t.Errorf("Get().Path = %q, want %q", got.Path, created.Path)
		}
		if got.Branch != created.Branch {
			t.Errorf("Get().Branch = %q, want %q", got.Branch, created.Branch)
		}
	})

	t.Run("returns nil if not exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		got, err := m.Get("nonexistent")
		if err != nil {
			t.Fatalf("Get() error = %v", err)
		}
		if got != nil {
			t.Errorf("Get() = %v, want nil", got)
		}
	})
}

func TestManager_List(t *testing.T) {
	t.Run("returns empty list when no tick worktrees", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		worktrees, err := m.List()
		if err != nil {
			t.Fatalf("List() error = %v", err)
		}
		if len(worktrees) != 0 {
			t.Errorf("List() returned %d worktrees, want 0", len(worktrees))
		}
	})

	t.Run("returns all tick worktrees", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create multiple worktrees
		_, err = m.Create("list1")
		if err != nil {
			t.Fatalf("Create(list1) error = %v", err)
		}
		_, err = m.Create("list2")
		if err != nil {
			t.Fatalf("Create(list2) error = %v", err)
		}
		_, err = m.Create("list3")
		if err != nil {
			t.Fatalf("Create(list3) error = %v", err)
		}

		worktrees, err := m.List()
		if err != nil {
			t.Fatalf("List() error = %v", err)
		}
		if len(worktrees) != 3 {
			t.Errorf("List() returned %d worktrees, want 3", len(worktrees))
		}

		// Verify epic IDs
		epicIDs := make(map[string]bool)
		for _, wt := range worktrees {
			epicIDs[wt.EpicID] = true
		}
		for _, expected := range []string{"list1", "list2", "list3"} {
			if !epicIDs[expected] {
				t.Errorf("List() missing epic %q", expected)
			}
		}
	})

	t.Run("ignores non-tick worktrees", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create a tick worktree
		_, err = m.Create("epic1")
		if err != nil {
			t.Fatalf("Create(epic1) error = %v", err)
		}

		// Create a non-tick worktree directly
		otherPath := filepath.Join(dir, ".worktrees", "other")
		cmd := exec.Command("git", "worktree", "add", otherPath, "-b", "feature/other")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("failed to create non-tick worktree: %v", err)
		}

		worktrees, err := m.List()
		if err != nil {
			t.Fatalf("List() error = %v", err)
		}
		if len(worktrees) != 1 {
			t.Errorf("List() returned %d worktrees, want 1 (should ignore non-tick)", len(worktrees))
		}
		if worktrees[0].EpicID != "epic1" {
			t.Errorf("List()[0].EpicID = %q, want %q", worktrees[0].EpicID, "epic1")
		}
	})
}

func TestManager_Exists(t *testing.T) {
	t.Run("returns true if worktree exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		_, err = m.Create("exists1")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		if !m.Exists("exists1") {
			t.Error("Exists() = false, want true")
		}
	})

	t.Run("returns false if worktree not exists", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		if m.Exists("nonexistent") {
			t.Error("Exists() = true, want false")
		}
	})
}

func TestWorktree_WorkingDirectory(t *testing.T) {
	t.Run("worktree has correct working directory", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("workdir")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify we can run git commands in the worktree
		cmd := exec.Command("git", "status")
		cmd.Dir = wt.Path
		if err := cmd.Run(); err != nil {
			t.Errorf("git status in worktree failed: %v", err)
		}

		// Verify the worktree has the initial.txt file from main
		initialFile := filepath.Join(wt.Path, "initial.txt")
		if _, err := os.Stat(initialFile); os.IsNotExist(err) {
			t.Error("Worktree should contain initial.txt from main branch")
		}
	})

	t.Run("changes in worktree are isolated", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("isolated")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Create file in worktree
		worktreeFile := filepath.Join(wt.Path, "worktree-only.txt")
		if err := os.WriteFile(worktreeFile, []byte("worktree content"), 0644); err != nil {
			t.Fatalf("failed to create file in worktree: %v", err)
		}

		// Verify file doesn't exist in main repo
		mainFile := filepath.Join(dir, "worktree-only.txt")
		if _, err := os.Stat(mainFile); !os.IsNotExist(err) {
			t.Error("File created in worktree should not exist in main repo")
		}
	})
}

func TestBranchNaming(t *testing.T) {
	t.Run("branch name includes epic ID", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("abc123")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		if !strings.HasPrefix(wt.Branch, BranchPrefix) {
			t.Errorf("Branch %q should have prefix %q", wt.Branch, BranchPrefix)
		}
		if wt.Branch != "tick/abc123" {
			t.Errorf("Branch = %q, want %q", wt.Branch, "tick/abc123")
		}
	})
}

func TestManager_IsDirty(t *testing.T) {
	t.Run("returns false for clean repo", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if isDirty {
			t.Errorf("IsDirty() = true, want false for clean repo")
		}
		if len(files) != 0 {
			t.Errorf("IsDirty() files = %v, want empty", files)
		}
	})

	t.Run("returns true for modified files", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Modify a tracked file
		if err := os.WriteFile(filepath.Join(dir, "initial.txt"), []byte("modified"), 0644); err != nil {
			t.Fatalf("failed to modify file: %v", err)
		}

		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if !isDirty {
			t.Error("IsDirty() = false, want true for modified file")
		}
		if len(files) != 1 || files[0] != "initial.txt" {
			t.Errorf("IsDirty() files = %v, want [initial.txt]", files)
		}
	})

	t.Run("returns true for untracked files", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create untracked file
		if err := os.WriteFile(filepath.Join(dir, "untracked.txt"), []byte("new"), 0644); err != nil {
			t.Fatalf("failed to create file: %v", err)
		}

		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if !isDirty {
			t.Error("IsDirty() = false, want true for untracked file")
		}
		if len(files) != 1 || files[0] != "untracked.txt" {
			t.Errorf("IsDirty() files = %v, want [untracked.txt]", files)
		}
	})

	t.Run("ignores .worktrees/ directory", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create .worktrees/ directory with file
		wtDir := filepath.Join(dir, ".worktrees")
		if err := os.MkdirAll(wtDir, 0755); err != nil {
			t.Fatalf("failed to create .worktrees: %v", err)
		}
		if err := os.WriteFile(filepath.Join(wtDir, "test.txt"), []byte("ignored"), 0644); err != nil {
			t.Fatalf("failed to create file: %v", err)
		}

		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if isDirty {
			t.Errorf("IsDirty() = true, want false (should ignore .worktrees/)")
		}
		if len(files) != 0 {
			t.Errorf("IsDirty() files = %v, want empty", files)
		}
	})

	t.Run("ignores .tick/ directory", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create .tick/ directory with file
		tickDir := filepath.Join(dir, ".tick")
		if err := os.MkdirAll(tickDir, 0755); err != nil {
			t.Fatalf("failed to create .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(tickDir, "config.json"), []byte("{}"), 0644); err != nil {
			t.Fatalf("failed to create file: %v", err)
		}

		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if isDirty {
			t.Errorf("IsDirty() = true, want false (should ignore .tick/)")
		}
		if len(files) != 0 {
			t.Errorf("IsDirty() files = %v, want empty", files)
		}
	})
}

func TestManager_IsOnlyTickFilesDirty(t *testing.T) {
	t.Run("returns false for empty list", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		onlyTick, tickFiles := m.IsOnlyTickFilesDirty([]string{})
		if onlyTick {
			t.Error("IsOnlyTickFilesDirty() = true, want false for empty list")
		}
		if len(tickFiles) != 0 {
			t.Errorf("IsOnlyTickFilesDirty() tickFiles = %v, want empty", tickFiles)
		}
	})

	t.Run("returns true when only tick files dirty", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		dirtyFiles := []string{".tick/issues/abc.json", ".tick/issues/def.json"}
		onlyTick, tickFiles := m.IsOnlyTickFilesDirty(dirtyFiles)
		if !onlyTick {
			t.Error("IsOnlyTickFilesDirty() = false, want true")
		}
		if len(tickFiles) != 2 {
			t.Errorf("IsOnlyTickFilesDirty() tickFiles = %v, want 2 items", tickFiles)
		}
	})

	t.Run("returns false when mixed dirty files", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		dirtyFiles := []string{".tick/issues/abc.json", "src/main.go"}
		onlyTick, tickFiles := m.IsOnlyTickFilesDirty(dirtyFiles)
		if onlyTick {
			t.Error("IsOnlyTickFilesDirty() = true, want false for mixed files")
		}
		if tickFiles != nil {
			t.Errorf("IsOnlyTickFilesDirty() tickFiles = %v, want nil", tickFiles)
		}
	})

	t.Run("returns false when only non-tick files dirty", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		dirtyFiles := []string{"src/main.go", "README.md"}
		onlyTick, tickFiles := m.IsOnlyTickFilesDirty(dirtyFiles)
		if onlyTick {
			t.Error("IsOnlyTickFilesDirty() = true, want false for non-tick files")
		}
		if tickFiles != nil {
			t.Errorf("IsOnlyTickFilesDirty() tickFiles = %v, want nil", tickFiles)
		}
	})
}

func TestManager_AutoCommitTickFiles(t *testing.T) {
	t.Run("commits tick files successfully", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create .tick directory with files
		tickDir := filepath.Join(dir, ".tick", "issues")
		if err := os.MkdirAll(tickDir, 0755); err != nil {
			t.Fatalf("failed to create .tick/issues: %v", err)
		}
		if err := os.WriteFile(filepath.Join(tickDir, "abc.json"), []byte(`{"id":"abc"}`), 0644); err != nil {
			t.Fatalf("failed to create tick file: %v", err)
		}

		// Commit tick files
		if err := m.AutoCommitTickFiles(); err != nil {
			t.Fatalf("AutoCommitTickFiles() error = %v", err)
		}

		// Verify repo is now clean
		isDirty, files, err := m.IsDirty()
		if err != nil {
			t.Fatalf("IsDirty() error = %v", err)
		}
		if isDirty {
			t.Errorf("Repo should be clean after AutoCommitTickFiles(), dirty files: %v", files)
		}

		// Verify commit message
		cmd := exec.Command("git", "log", "-1", "--format=%s")
		cmd.Dir = dir
		output, err := cmd.Output()
		if err != nil {
			t.Fatalf("git log error = %v", err)
		}
		expectedMsg := "chore: auto-commit tick status updates"
		if strings.TrimSpace(string(output)) != expectedMsg {
			t.Errorf("Commit message = %q, want %q", strings.TrimSpace(string(output)), expectedMsg)
		}
	})

	t.Run("commits modified tick files", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create and commit .tick directory first
		tickDir := filepath.Join(dir, ".tick", "issues")
		if err := os.MkdirAll(tickDir, 0755); err != nil {
			t.Fatalf("failed to create .tick/issues: %v", err)
		}
		tickFile := filepath.Join(tickDir, "abc.json")
		if err := os.WriteFile(tickFile, []byte(`{"id":"abc","status":"open"}`), 0644); err != nil {
			t.Fatalf("failed to create tick file: %v", err)
		}
		cmd := exec.Command("git", "add", ".tick/")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("git add error = %v", err)
		}
		cmd = exec.Command("git", "commit", "-m", "Add tick file")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("git commit error = %v", err)
		}

		// Now modify the tick file
		if err := os.WriteFile(tickFile, []byte(`{"id":"abc","status":"closed"}`), 0644); err != nil {
			t.Fatalf("failed to modify tick file: %v", err)
		}

		// Verify it shows as dirty (note: .tick/ is filtered by IsDirty, so we check git status directly)
		cmd = exec.Command("git", "status", "--porcelain")
		cmd.Dir = dir
		output, err := cmd.Output()
		if err != nil {
			t.Fatalf("git status error = %v", err)
		}
		if !strings.Contains(string(output), ".tick/issues/abc.json") {
			t.Fatal("Tick file should appear as modified")
		}

		// Commit tick files
		if err := m.AutoCommitTickFiles(); err != nil {
			t.Fatalf("AutoCommitTickFiles() error = %v", err)
		}

		// Verify repo is now clean
		cmd = exec.Command("git", "status", "--porcelain")
		cmd.Dir = dir
		output, err = cmd.Output()
		if err != nil {
			t.Fatalf("git status error = %v", err)
		}
		if len(output) != 0 {
			t.Errorf("Repo should be clean after AutoCommitTickFiles(), output: %s", output)
		}
	})
}

// createTempGitRepo creates a temporary directory with an initialized git repo.
// Returns the directory path. The repo has one initial commit.
func createTempGitRepo(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()

	// Initialize git repo
	cmd := exec.Command("git", "init")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to init git repo: %v", err)
	}

	// Configure git user (needed for commits)
	cmd = exec.Command("git", "config", "user.email", "test@test.com")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to configure git email: %v", err)
	}
	cmd = exec.Command("git", "config", "user.name", "Test User")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to configure git name: %v", err)
	}

	// Create initial file and commit
	initialFile := filepath.Join(dir, "initial.txt")
	if err := os.WriteFile(initialFile, []byte("initial content"), 0644); err != nil {
		t.Fatalf("failed to create initial file: %v", err)
	}
	cmd = exec.Command("git", "add", "initial.txt")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to stage initial file: %v", err)
	}
	cmd = exec.Command("git", "commit", "-m", "Initial commit")
	cmd.Dir = dir
	if err := cmd.Run(); err != nil {
		t.Fatalf("failed to create initial commit: %v", err)
	}

	return dir
}

func TestGetCurrentBranch(t *testing.T) {
	t.Run("returns current branch name", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// The repo is on the default branch after init (usually main or master)
		branch := getCurrentBranch(dir)
		if branch == "" {
			t.Error("getCurrentBranch() returned empty string, want branch name")
		}

		// Create and checkout a known branch
		cmd := exec.Command("git", "checkout", "-b", "test-branch")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("failed to create branch: %v", err)
		}

		branch = getCurrentBranch(dir)
		if branch != "test-branch" {
			t.Errorf("getCurrentBranch() = %q, want %q", branch, "test-branch")
		}
	})
}

func TestGetCurrentBranch_DetachedHead(t *testing.T) {
	t.Run("returns empty string when HEAD is detached", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Get commit hash
		cmd := exec.Command("git", "rev-parse", "HEAD")
		cmd.Dir = dir
		output, err := cmd.Output()
		if err != nil {
			t.Fatalf("failed to get commit hash: %v", err)
		}
		commitHash := strings.TrimSpace(string(output))

		// Checkout the commit hash (detached HEAD)
		cmd = exec.Command("git", "checkout", commitHash)
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("failed to checkout commit: %v", err)
		}

		branch := getCurrentBranch(dir)
		if branch != "" {
			t.Errorf("getCurrentBranch() = %q, want empty string for detached HEAD", branch)
		}
	})
}

func TestManager_Create_RecordsParentBranch(t *testing.T) {
	t.Run("records parent branch in metadata when on a branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create and checkout a known branch
		runGit(t, dir, "checkout", "-b", "feature/test-parent")

		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("parent-test")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify ParentBranch field in returned struct
		if wt.ParentBranch != "feature/test-parent" {
			t.Errorf("Worktree.ParentBranch = %q, want %q", wt.ParentBranch, "feature/test-parent")
		}

		// Verify .tk-metadata file exists
		metaPath := filepath.Join(wt.Path, metadataFileName)
		if _, err := os.Stat(metaPath); os.IsNotExist(err) {
			t.Fatal(".tk-metadata file should exist after Create()")
		}

		// Verify metadata contains correct parentBranch
		parentBranch := readMetadata(wt.Path)
		if parentBranch != "feature/test-parent" {
			t.Errorf("readMetadata() = %q, want %q", parentBranch, "feature/test-parent")
		}
	})
}

func TestManager_Create_DetachedHead(t *testing.T) {
	t.Run("records empty parent branch in metadata when HEAD is detached", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Get commit hash and checkout (detached HEAD)
		cmd := exec.Command("git", "rev-parse", "HEAD")
		cmd.Dir = dir
		output, err := cmd.Output()
		if err != nil {
			t.Fatalf("failed to get commit hash: %v", err)
		}
		commitHash := strings.TrimSpace(string(output))

		runGit(t, dir, "checkout", commitHash)

		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := m.Create("detached-test")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify ParentBranch field is empty in returned struct
		if wt.ParentBranch != "" {
			t.Errorf("Worktree.ParentBranch = %q, want empty string for detached HEAD", wt.ParentBranch)
		}

		// Verify .tk-metadata file exists
		metaPath := filepath.Join(wt.Path, metadataFileName)
		if _, err := os.Stat(metaPath); os.IsNotExist(err) {
			t.Fatal(".tk-metadata file should exist after Create()")
		}

		// Verify metadata contains empty parentBranch
		parentBranch := readMetadata(wt.Path)
		if parentBranch != "" {
			t.Errorf("readMetadata() = %q, want empty string for detached HEAD", parentBranch)
		}
	})
}

func TestWriteReadMetadata(t *testing.T) {
	t.Run("round-trip of metadata JSON", func(t *testing.T) {
		dir := t.TempDir()

		// Write metadata
		meta := worktreeMetadata{
			ParentBranch: "main",
			CreatedAt:    time.Date(2025, 1, 15, 10, 30, 0, 0, time.UTC),
		}
		if err := writeMetadata(dir, meta); err != nil {
			t.Fatalf("writeMetadata() error = %v", err)
		}

		// Verify file exists
		metaPath := filepath.Join(dir, metadataFileName)
		if _, err := os.Stat(metaPath); os.IsNotExist(err) {
			t.Fatal("metadata file should exist after writeMetadata()")
		}

		// Read metadata back
		parentBranch := readMetadata(dir)
		if parentBranch != "main" {
			t.Errorf("readMetadata() = %q, want %q", parentBranch, "main")
		}
	})

	t.Run("readMetadata returns empty for nonexistent file", func(t *testing.T) {
		dir := t.TempDir()

		parentBranch := readMetadata(dir)
		if parentBranch != "" {
			t.Errorf("readMetadata() = %q, want empty string for nonexistent file", parentBranch)
		}
	})

	t.Run("readMetadata returns empty for invalid JSON", func(t *testing.T) {
		dir := t.TempDir()

		// Write invalid JSON
		metaPath := filepath.Join(dir, metadataFileName)
		if err := os.WriteFile(metaPath, []byte("not valid json"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}

		parentBranch := readMetadata(dir)
		if parentBranch != "" {
			t.Errorf("readMetadata() = %q, want empty string for invalid JSON", parentBranch)
		}
	})
}

func TestManager_List_PopulatesParentBranch(t *testing.T) {
	t.Run("List populates ParentBranch from metadata", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create and checkout a known branch to be the parent
		runGit(t, dir, "checkout", "-b", "feature/parent-for-list")

		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create a worktree (which writes metadata with the parent branch)
		created, err := m.Create("list-parent-test")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Verify the worktree was created with the correct parent branch
		if created.ParentBranch != "feature/parent-for-list" {
			t.Fatalf("Created worktree ParentBranch = %q, want %q", created.ParentBranch, "feature/parent-for-list")
		}

		// Now use List() to retrieve the worktree and verify ParentBranch is populated
		worktrees, err := m.List()
		if err != nil {
			t.Fatalf("List() error = %v", err)
		}

		if len(worktrees) != 1 {
			t.Fatalf("List() returned %d worktrees, want 1", len(worktrees))
		}

		listed := worktrees[0]
		if listed.EpicID != "list-parent-test" {
			t.Errorf("List()[0].EpicID = %q, want %q", listed.EpicID, "list-parent-test")
		}
		if listed.ParentBranch != "feature/parent-for-list" {
			t.Errorf("List()[0].ParentBranch = %q, want %q", listed.ParentBranch, "feature/parent-for-list")
		}
	})
}

func TestManager_List_MissingMetadata(t *testing.T) {
	t.Run("List handles missing metadata gracefully", func(t *testing.T) {
		dir := createTempGitRepo(t)
		m, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create a worktree
		wt, err := m.Create("no-meta-test")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Remove the metadata file to simulate a worktree without metadata
		metaPath := filepath.Join(wt.Path, metadataFileName)
		if err := os.Remove(metaPath); err != nil {
			t.Fatalf("failed to remove metadata file: %v", err)
		}

		// Verify metadata file is gone
		if _, err := os.Stat(metaPath); !os.IsNotExist(err) {
			t.Fatal("metadata file should not exist after removal")
		}

		// Call List() and verify it doesn't error and ParentBranch is empty
		worktrees, err := m.List()
		if err != nil {
			t.Fatalf("List() error = %v", err)
		}

		if len(worktrees) != 1 {
			t.Fatalf("List() returned %d worktrees, want 1", len(worktrees))
		}

		listed := worktrees[0]
		if listed.EpicID != "no-meta-test" {
			t.Errorf("List()[0].EpicID = %q, want %q", listed.EpicID, "no-meta-test")
		}
		if listed.ParentBranch != "" {
			t.Errorf("List()[0].ParentBranch = %q, want empty string when metadata is missing", listed.ParentBranch)
		}
	})
}
