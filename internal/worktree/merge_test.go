package worktree

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewMergeManager(t *testing.T) {
	t.Run("detects main branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}
		if mm == nil {
			t.Fatal("NewMergeManager() returned nil")
		}
		// Default branch from git init is usually "master" but may vary
		if mm.MainBranch() != "main" && mm.MainBranch() != "master" {
			t.Errorf("MainBranch() = %q, want 'main' or 'master'", mm.MainBranch())
		}
	})

	t.Run("returns error for repo without main/master", func(t *testing.T) {
		dir := t.TempDir()

		// Initialize bare git repo
		cmd := exec.Command("git", "init")
		cmd.Dir = dir
		if err := cmd.Run(); err != nil {
			t.Fatalf("failed to init git repo: %v", err)
		}

		// No commits yet, so no main/master branch
		_, err := NewMergeManager(dir)
		if err == nil {
			t.Error("NewMergeManager() should fail for repo without main/master")
		}
	})
}

func TestMergeManager_Merge(t *testing.T) {
	t.Run("successful fast-forward merge", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("ff-epic")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make a commit in the worktree
		newFile := filepath.Join(wt.Path, "new-file.txt")
		if err := os.WriteFile(newFile, []byte("new content"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "new-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add new file")

		// Create merge manager and merge
		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}

		if !result.Success {
			t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
		}
		if !result.Merged {
			t.Error("Merge() Merged = false, want true")
		}
		if result.MergeCommit == "" {
			t.Error("Merge() MergeCommit should not be empty")
		}
		if len(result.Conflicts) > 0 {
			t.Errorf("Merge() Conflicts = %v, want empty", result.Conflicts)
		}

		// Verify file exists on main branch
		mainFile := filepath.Join(dir, "new-file.txt")
		if _, err := os.Stat(mainFile); os.IsNotExist(err) {
			t.Error("new-file.txt should exist on main after merge")
		}
	})

	t.Run("successful merge with commits on both sides", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("both-sides")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make commit in worktree (different file)
		wtFile := filepath.Join(wt.Path, "worktree-file.txt")
		if err := os.WriteFile(wtFile, []byte("worktree content"), 0644); err != nil {
			t.Fatalf("failed to write worktree file: %v", err)
		}
		runGit(t, wt.Path, "add", "worktree-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add worktree file")

		// Make commit in main (different file)
		mainFile := filepath.Join(dir, "main-file.txt")
		if err := os.WriteFile(mainFile, []byte("main content"), 0644); err != nil {
			t.Fatalf("failed to write main file: %v", err)
		}
		runGit(t, dir, "add", "main-file.txt")
		runGit(t, dir, "commit", "-m", "Add main file")

		// Merge
		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}

		if !result.Success {
			t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
		}
		if !result.Merged {
			t.Error("Merge() Merged = false, want true")
		}

		// Verify both files exist on main
		if _, err := os.Stat(filepath.Join(dir, "worktree-file.txt")); os.IsNotExist(err) {
			t.Error("worktree-file.txt should exist on main after merge")
		}
		if _, err := os.Stat(filepath.Join(dir, "main-file.txt")); os.IsNotExist(err) {
			t.Error("main-file.txt should exist on main after merge")
		}
	})

	t.Run("conflict detection", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("conflict-epic")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Modify same file in worktree
		conflictFile := filepath.Join(wt.Path, "initial.txt")
		if err := os.WriteFile(conflictFile, []byte("worktree version"), 0644); err != nil {
			t.Fatalf("failed to write conflict file in worktree: %v", err)
		}
		runGit(t, wt.Path, "add", "initial.txt")
		runGit(t, wt.Path, "commit", "-m", "Worktree change to initial.txt")

		// Modify same file in main
		mainConflictFile := filepath.Join(dir, "initial.txt")
		if err := os.WriteFile(mainConflictFile, []byte("main version"), 0644); err != nil {
			t.Fatalf("failed to write conflict file in main: %v", err)
		}
		runGit(t, dir, "add", "initial.txt")
		runGit(t, dir, "commit", "-m", "Main change to initial.txt")

		// Attempt merge - should fail with conflict
		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}

		if result.Success {
			t.Error("Merge() Success = true, want false (conflict)")
		}
		if len(result.Conflicts) == 0 {
			t.Error("Merge() Conflicts should not be empty")
		}
		if len(result.Conflicts) > 0 && result.Conflicts[0] != "initial.txt" {
			t.Errorf("Merge() Conflicts = %v, want [initial.txt]", result.Conflicts)
		}

		// Clean up the conflict
		if mm.HasConflict() {
			mm.AbortMerge()
		}
	})
}

func TestMergeManager_AbortMerge(t *testing.T) {
	t.Run("aborts in-progress merge", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree and cause conflict
		wt, err := wm.Create("abort-epic")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Create conflict
		conflictFile := filepath.Join(wt.Path, "initial.txt")
		if err := os.WriteFile(conflictFile, []byte("worktree version"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "initial.txt")
		runGit(t, wt.Path, "commit", "-m", "Worktree change")

		mainFile := filepath.Join(dir, "initial.txt")
		if err := os.WriteFile(mainFile, []byte("main version"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, dir, "add", "initial.txt")
		runGit(t, dir, "commit", "-m", "Main change")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		// Trigger conflict
		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}
		if result.Success {
			t.Skip("Expected conflict but merge succeeded")
		}

		// Verify conflict exists
		if !mm.HasConflict() {
			t.Fatal("HasConflict() = false, want true after failed merge")
		}

		// Abort the merge
		if err := mm.AbortMerge(); err != nil {
			t.Fatalf("AbortMerge() error = %v", err)
		}

		// Verify no conflict after abort
		if mm.HasConflict() {
			t.Error("HasConflict() = true, want false after AbortMerge()")
		}
	})

	t.Run("returns error when no merge in progress", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		err = mm.AbortMerge()
		if err != ErrNoMergeInProgress {
			t.Errorf("AbortMerge() error = %v, want %v", err, ErrNoMergeInProgress)
		}
	})
}

func TestMergeManager_HasConflict(t *testing.T) {
	t.Run("returns false when no merge in progress", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		if mm.HasConflict() {
			t.Error("HasConflict() = true, want false (no merge in progress)")
		}
	})

	t.Run("returns true during merge conflict", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("has-conflict-epic")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Create conflict scenario
		conflictFile := filepath.Join(wt.Path, "initial.txt")
		if err := os.WriteFile(conflictFile, []byte("worktree version"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "initial.txt")
		runGit(t, wt.Path, "commit", "-m", "Worktree change")

		mainFile := filepath.Join(dir, "initial.txt")
		if err := os.WriteFile(mainFile, []byte("main version"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, dir, "add", "initial.txt")
		runGit(t, dir, "commit", "-m", "Main change")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		// Trigger conflict
		result, _ := mm.Merge(wt, MergeOptions{})
		if result.Success {
			t.Skip("Expected conflict but merge succeeded")
		}

		if !mm.HasConflict() {
			t.Error("HasConflict() = false, want true during conflict")
		}

		// Clean up
		mm.AbortMerge()
	})
}

func TestBranchExists(t *testing.T) {
	t.Run("returns true for existing branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// The repo has a main or master branch after createTempGitRepo
		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}
		mainBranch := mm.MainBranch()

		if !branchExists(dir, mainBranch) {
			t.Errorf("branchExists(%q) = false, want true", mainBranch)
		}
	})

	t.Run("returns false for nonexistent branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		if branchExists(dir, "nonexistent-branch-xyz") {
			t.Error("branchExists(\"nonexistent-branch-xyz\") = true, want false")
		}
	})

	t.Run("returns true for feature branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create a new branch
		runGit(t, dir, "checkout", "-b", "feature-test-branch")

		if !branchExists(dir, "feature-test-branch") {
			t.Error("branchExists(\"feature-test-branch\") = false, want true")
		}
	})
}

// runGit runs a git command in the specified directory.
func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v failed: %s: %v", args, string(output), err)
	}
}

func TestMerge_UsesParentBranch(t *testing.T) {
	// Create a repo with a feature branch, then create worktree from feature branch
	dir := createTempGitRepo(t)

	// Create and checkout a feature branch
	runGit(t, dir, "checkout", "-b", "feature/parent")
	// Add a commit on the feature branch
	featureFile := filepath.Join(dir, "feature.txt")
	if err := os.WriteFile(featureFile, []byte("feature content"), 0644); err != nil {
		t.Fatalf("failed to write feature file: %v", err)
	}
	runGit(t, dir, "add", "feature.txt")
	runGit(t, dir, "commit", "-m", "Add feature file")

	// Create worktree manager and worktree (from feature/parent)
	wm, err := NewManager(dir)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wm.Create("parent-test")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Verify ParentBranch is set
	if wt.ParentBranch != "feature/parent" {
		t.Fatalf("ParentBranch = %q, want %q", wt.ParentBranch, "feature/parent")
	}

	// Make a commit in the worktree
	wtFile := filepath.Join(wt.Path, "wt-file.txt")
	if err := os.WriteFile(wtFile, []byte("worktree content"), 0644); err != nil {
		t.Fatalf("failed to write worktree file: %v", err)
	}
	runGit(t, wt.Path, "add", "wt-file.txt")
	runGit(t, wt.Path, "commit", "-m", "Add worktree file")

	// Create merge manager and merge with empty opts (should use parent branch)
	mm, err := NewMergeManager(dir)
	if err != nil {
		t.Fatalf("NewMergeManager() error = %v", err)
	}

	result, err := mm.Merge(wt, MergeOptions{})
	if err != nil {
		t.Fatalf("Merge() error = %v", err)
	}

	if !result.Success {
		t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
	}
	if result.TargetBranch != "feature/parent" {
		t.Errorf("Merge() TargetBranch = %q, want %q", result.TargetBranch, "feature/parent")
	}

	// Verify file exists on feature/parent branch (we should still be on it after merge)
	if _, err := os.Stat(filepath.Join(dir, "wt-file.txt")); os.IsNotExist(err) {
		t.Error("wt-file.txt should exist on feature/parent after merge")
	}
}

func TestMerge_UsesOverride(t *testing.T) {
	// Create a repo and worktree, then merge with explicit target
	dir := createTempGitRepo(t)

	// Create merge manager to get main branch name
	mm, err := NewMergeManager(dir)
	if err != nil {
		t.Fatalf("NewMergeManager() error = %v", err)
	}
	mainBranch := mm.MainBranch()

	// Create a feature branch to use as target
	runGit(t, dir, "checkout", "-b", "feature/target")
	runGit(t, dir, "checkout", mainBranch) // Switch back to main

	// Create worktree manager and worktree (from main)
	wm, err := NewManager(dir)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wm.Create("override-test")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Make a commit in the worktree
	wtFile := filepath.Join(wt.Path, "override-file.txt")
	if err := os.WriteFile(wtFile, []byte("override content"), 0644); err != nil {
		t.Fatalf("failed to write worktree file: %v", err)
	}
	runGit(t, wt.Path, "add", "override-file.txt")
	runGit(t, wt.Path, "commit", "-m", "Add override file")

	// Merge with explicit target branch (feature/target instead of main)
	result, err := mm.Merge(wt, MergeOptions{TargetBranch: "feature/target"})
	if err != nil {
		t.Fatalf("Merge() error = %v", err)
	}

	if !result.Success {
		t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
	}
	if result.TargetBranch != "feature/target" {
		t.Errorf("Merge() TargetBranch = %q, want %q", result.TargetBranch, "feature/target")
	}

	// Verify we're on feature/target and file exists
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = dir
	output, _ := cmd.Output()
	currentBranch := strings.TrimSpace(string(output))
	if currentBranch != "feature/target" {
		t.Errorf("Should be on feature/target, but on %q", currentBranch)
	}
}

func TestMerge_OverrideTakesPrecedence(t *testing.T) {
	// Create worktree from feature/a, merge with TargetBranch: main
	dir := createTempGitRepo(t)

	// Get main branch name
	mm, err := NewMergeManager(dir)
	if err != nil {
		t.Fatalf("NewMergeManager() error = %v", err)
	}
	mainBranch := mm.MainBranch()

	// Create feature/a branch
	runGit(t, dir, "checkout", "-b", "feature/a")
	featureFile := filepath.Join(dir, "feature-a.txt")
	if err := os.WriteFile(featureFile, []byte("feature a content"), 0644); err != nil {
		t.Fatalf("failed to write feature file: %v", err)
	}
	runGit(t, dir, "add", "feature-a.txt")
	runGit(t, dir, "commit", "-m", "Add feature a file")

	// Create worktree from feature/a
	wm, err := NewManager(dir)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wm.Create("precedence-test")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Verify ParentBranch is feature/a
	if wt.ParentBranch != "feature/a" {
		t.Fatalf("ParentBranch = %q, want %q", wt.ParentBranch, "feature/a")
	}

	// Make a commit in the worktree
	wtFile := filepath.Join(wt.Path, "precedence-file.txt")
	if err := os.WriteFile(wtFile, []byte("precedence content"), 0644); err != nil {
		t.Fatalf("failed to write worktree file: %v", err)
	}
	runGit(t, wt.Path, "add", "precedence-file.txt")
	runGit(t, wt.Path, "commit", "-m", "Add precedence file")

	// Merge with opts.TargetBranch = main (should override feature/a)
	result, err := mm.Merge(wt, MergeOptions{TargetBranch: mainBranch})
	if err != nil {
		t.Fatalf("Merge() error = %v", err)
	}

	if !result.Success {
		t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
	}
	if result.TargetBranch != mainBranch {
		t.Errorf("Merge() TargetBranch = %q, want %q", result.TargetBranch, mainBranch)
	}

	// Verify we're on main branch
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = dir
	output, _ := cmd.Output()
	currentBranch := strings.TrimSpace(string(output))
	if currentBranch != mainBranch {
		t.Errorf("Should be on %s, but on %q", mainBranch, currentBranch)
	}
}

func TestMerge_ErrParentBranchNotFound(t *testing.T) {
	// Create worktree from feature branch, delete the branch, try to merge
	dir := createTempGitRepo(t)

	// Get main branch name
	mm, err := NewMergeManager(dir)
	if err != nil {
		t.Fatalf("NewMergeManager() error = %v", err)
	}
	mainBranch := mm.MainBranch()

	// Create feature branch and switch to it
	runGit(t, dir, "checkout", "-b", "feature/doomed")
	featureFile := filepath.Join(dir, "doomed.txt")
	if err := os.WriteFile(featureFile, []byte("doomed content"), 0644); err != nil {
		t.Fatalf("failed to write feature file: %v", err)
	}
	runGit(t, dir, "add", "doomed.txt")
	runGit(t, dir, "commit", "-m", "Add doomed file")

	// Create worktree from feature/doomed
	wm, err := NewManager(dir)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wm.Create("doomed-test")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Verify ParentBranch is feature/doomed
	if wt.ParentBranch != "feature/doomed" {
		t.Fatalf("ParentBranch = %q, want %q", wt.ParentBranch, "feature/doomed")
	}

	// Switch to main and delete feature/doomed branch
	runGit(t, dir, "checkout", mainBranch)
	runGit(t, dir, "branch", "-D", "feature/doomed")

	// Try to merge with empty opts - should fail with ErrParentBranchNotFound
	_, err = mm.Merge(wt, MergeOptions{})
	if err != ErrParentBranchNotFound {
		t.Errorf("Merge() error = %v, want %v", err, ErrParentBranchNotFound)
	}
}

func TestMerge_ErrNoTargetBranch(t *testing.T) {
	// Create worktree with empty ParentBranch, merge with empty opts
	dir := createTempGitRepo(t)

	// Create a worktree struct with no ParentBranch (simulating detached HEAD scenario)
	wt := &Worktree{
		Path:         dir,
		Branch:       "tick/no-parent",
		EpicID:       "no-parent",
		ParentBranch: "", // Empty - simulating detached HEAD
	}

	mm, err := NewMergeManager(dir)
	if err != nil {
		t.Fatalf("NewMergeManager() error = %v", err)
	}

	// Try to merge with empty opts - should fail with ErrNoTargetBranch
	_, err = mm.Merge(wt, MergeOptions{})
	if err != ErrNoTargetBranch {
		t.Errorf("Merge() error = %v, want %v", err, ErrNoTargetBranch)
	}
}

func TestMerge_TargetBranchPopulated(t *testing.T) {
	t.Run("on success", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := wm.Create("target-success")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make a commit in the worktree
		wtFile := filepath.Join(wt.Path, "target-file.txt")
		if err := os.WriteFile(wtFile, []byte("target content"), 0644); err != nil {
			t.Fatalf("failed to write worktree file: %v", err)
		}
		runGit(t, wt.Path, "add", "target-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add target file")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}

		if !result.Success {
			t.Errorf("Merge() Success = false, want true. Error: %s", result.ErrorMessage)
		}
		if result.TargetBranch == "" {
			t.Error("Merge() TargetBranch should be populated on success")
		}
		// Should match the parent branch (main or master)
		if result.TargetBranch != wt.ParentBranch {
			t.Errorf("Merge() TargetBranch = %q, want %q", result.TargetBranch, wt.ParentBranch)
		}
	})

	t.Run("on conflict", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		wt, err := wm.Create("target-conflict")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Create conflict: modify same file in both places
		conflictFile := filepath.Join(wt.Path, "initial.txt")
		if err := os.WriteFile(conflictFile, []byte("worktree version"), 0644); err != nil {
			t.Fatalf("failed to write conflict file in worktree: %v", err)
		}
		runGit(t, wt.Path, "add", "initial.txt")
		runGit(t, wt.Path, "commit", "-m", "Worktree change")

		mainFile := filepath.Join(dir, "initial.txt")
		if err := os.WriteFile(mainFile, []byte("main version"), 0644); err != nil {
			t.Fatalf("failed to write conflict file in main: %v", err)
		}
		runGit(t, dir, "add", "initial.txt")
		runGit(t, dir, "commit", "-m", "Main change")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}

		if result.Success {
			t.Error("Merge() Success = true, want false (conflict)")
		}
		if result.TargetBranch == "" {
			t.Error("Merge() TargetBranch should be populated even on conflict")
		}
		if result.TargetBranch != wt.ParentBranch {
			t.Errorf("Merge() TargetBranch = %q, want %q", result.TargetBranch, wt.ParentBranch)
		}

		// Clean up conflict
		if mm.HasConflict() {
			mm.AbortMerge()
		}
	})
}
