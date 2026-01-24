package worktree

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNewConflictHandler(t *testing.T) {
	t.Run("creates handler with merge manager", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)
		if ch == nil {
			t.Fatal("NewConflictHandler() returned nil")
		}
		if ch.repoRoot != dir {
			t.Errorf("ConflictHandler.repoRoot = %q, want %q", ch.repoRoot, dir)
		}
		if ch.merge != mm {
			t.Error("ConflictHandler.merge should reference the provided MergeManager")
		}
	})
}

func TestConflictHandler_HandleConflict(t *testing.T) {
	t.Run("aborts merge and stores conflict state", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("handle-conflict")
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
		result, err := mm.Merge(wt, MergeOptions{})
		if err != nil {
			t.Fatalf("Merge() error = %v", err)
		}
		if result.Success {
			t.Skip("Expected conflict but merge succeeded")
		}

		// Now handle the conflict
		ch := NewConflictHandler(dir, mm)
		beforeHandle := time.Now()
		state := ch.HandleConflict(wt, result.Conflicts, result.TargetBranch)

		// Verify state is populated correctly
		if state.EpicID != wt.EpicID {
			t.Errorf("ConflictState.EpicID = %q, want %q", state.EpicID, wt.EpicID)
		}
		if state.Branch != wt.Branch {
			t.Errorf("ConflictState.Branch = %q, want %q", state.Branch, wt.Branch)
		}
		if state.WorktreePath != wt.Path {
			t.Errorf("ConflictState.WorktreePath = %q, want %q", state.WorktreePath, wt.Path)
		}
		if len(state.Conflicts) == 0 {
			t.Error("ConflictState.Conflicts should not be empty")
		}
		if state.DetectedAt.Before(beforeHandle) {
			t.Error("ConflictState.DetectedAt should be after HandleConflict was called")
		}

		// Verify merge was aborted
		if mm.HasConflict() {
			t.Error("Merge should be aborted after HandleConflict")
		}

		// Verify worktree still exists (preserved for inspection)
		if _, err := os.Stat(wt.Path); os.IsNotExist(err) {
			t.Error("Worktree should still exist after HandleConflict")
		}
	})

	t.Run("stores conflict in handler for retrieval", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Create a mock worktree (we don't need a real conflict for this test)
		wt := &Worktree{
			EpicID: "test-epic",
			Branch: "tick/test-epic",
			Path:   "/path/to/worktree",
		}
		conflicts := []string{"file1.txt", "file2.txt"}

		state := ch.HandleConflict(wt, conflicts, "main")

		// Verify we can retrieve the conflict
		if !ch.HasConflict("test-epic") {
			t.Error("HasConflict() should return true after HandleConflict")
		}

		retrieved := ch.GetConflict("test-epic")
		if retrieved == nil {
			t.Fatal("GetConflict() returned nil")
		}
		if retrieved.EpicID != state.EpicID {
			t.Errorf("GetConflict().EpicID = %q, want %q", retrieved.EpicID, state.EpicID)
		}

		// Verify it's in active conflicts list
		active := ch.GetActiveConflicts()
		if len(active) != 1 {
			t.Errorf("GetActiveConflicts() returned %d conflicts, want 1", len(active))
		}
	})
}

func TestConflictHandler_CheckResolved(t *testing.T) {
	t.Run("returns false when conflict not registered", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		if ch.CheckResolved("nonexistent") {
			t.Error("CheckResolved() should return false for unregistered epic")
		}
	})

	t.Run("detects when branch is manually merged", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree with a change that won't conflict
		wt, err := wm.Create("manual-resolve")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make a commit in worktree (non-conflicting)
		newFile := filepath.Join(wt.Path, "new-file.txt")
		if err := os.WriteFile(newFile, []byte("new content"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "new-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add new file")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Register a "conflict" (simulating what would happen in real scenario)
		ch.HandleConflict(wt, []string{"some-file.txt"}, mm.MainBranch())

		// Verify conflict is registered
		if !ch.HasConflict("manual-resolve") {
			t.Fatal("Conflict should be registered")
		}

		// Now manually merge the branch (simulating user resolution)
		runGit(t, dir, "checkout", mm.MainBranch())
		runGit(t, dir, "merge", wt.Branch, "--no-ff", "-m", "Manual merge")

		// Check if resolved
		if !ch.CheckResolved("manual-resolve") {
			t.Error("CheckResolved() should return true after manual merge")
		}

		// Conflict should be removed from tracking
		if ch.HasConflict("manual-resolve") {
			t.Error("Conflict should be removed after CheckResolved returns true")
		}
	})

	t.Run("returns false when branch not yet merged", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree with a change
		wt, err := wm.Create("unresolved")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make a commit in worktree
		newFile := filepath.Join(wt.Path, "unresolved-file.txt")
		if err := os.WriteFile(newFile, []byte("content"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "unresolved-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add file")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Register conflict
		ch.HandleConflict(wt, []string{"some-file.txt"}, mm.MainBranch())

		// Check without merging - should be false
		if ch.CheckResolved("unresolved") {
			t.Error("CheckResolved() should return false when branch not merged")
		}

		// Conflict should still be tracked
		if !ch.HasConflict("unresolved") {
			t.Error("Conflict should still be tracked")
		}
	})
}

func TestConflictHandler_GetActiveConflicts(t *testing.T) {
	t.Run("returns empty list when no conflicts", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		active := ch.GetActiveConflicts()
		if len(active) != 0 {
			t.Errorf("GetActiveConflicts() returned %d conflicts, want 0", len(active))
		}
	})

	t.Run("returns all active conflicts", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Register multiple conflicts
		wt1 := &Worktree{EpicID: "epic1", Branch: "tick/epic1", Path: "/path/1"}
		wt2 := &Worktree{EpicID: "epic2", Branch: "tick/epic2", Path: "/path/2"}
		wt3 := &Worktree{EpicID: "epic3", Branch: "tick/epic3", Path: "/path/3"}

		ch.HandleConflict(wt1, []string{"a.txt"}, "main")
		ch.HandleConflict(wt2, []string{"b.txt", "c.txt"}, "main")
		ch.HandleConflict(wt3, []string{"d.txt"}, "main")

		active := ch.GetActiveConflicts()
		if len(active) != 3 {
			t.Errorf("GetActiveConflicts() returned %d conflicts, want 3", len(active))
		}

		// Verify all epics are present
		epicIDs := make(map[string]bool)
		for _, c := range active {
			epicIDs[c.EpicID] = true
		}
		for _, expected := range []string{"epic1", "epic2", "epic3"} {
			if !epicIDs[expected] {
				t.Errorf("GetActiveConflicts() missing epic %q", expected)
			}
		}
	})

	t.Run("returns copies to avoid races", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		wt := &Worktree{EpicID: "copy-test", Branch: "tick/copy-test", Path: "/path"}
		ch.HandleConflict(wt, []string{"file.txt"}, "main")

		// Get conflict and modify the returned slice
		active := ch.GetActiveConflicts()
		if len(active) == 0 {
			t.Fatal("Should have one conflict")
		}

		// Modify the returned conflict
		active[0].Conflicts = append(active[0].Conflicts, "modified.txt")

		// Original should be unchanged
		original := ch.GetConflict("copy-test")
		if len(original.Conflicts) != 1 {
			t.Errorf("Original conflicts modified: got %d, want 1", len(original.Conflicts))
		}
	})
}

func TestConflictHandler_ClearConflict(t *testing.T) {
	t.Run("removes conflict from tracking", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		wt := &Worktree{EpicID: "clear-test", Branch: "tick/clear-test", Path: "/path"}
		ch.HandleConflict(wt, []string{"file.txt"}, "main")

		if !ch.HasConflict("clear-test") {
			t.Fatal("Conflict should exist before clear")
		}

		ch.ClearConflict("clear-test")

		if ch.HasConflict("clear-test") {
			t.Error("Conflict should not exist after clear")
		}
	})

	t.Run("no error for nonexistent conflict", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Should not panic
		ch.ClearConflict("nonexistent")
	})
}

func TestConflictHandler_HasConflict(t *testing.T) {
	t.Run("returns false for no conflict", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		if ch.HasConflict("any-epic") {
			t.Error("HasConflict() should return false when no conflicts")
		}
	})

	t.Run("returns true for registered conflict", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		wt := &Worktree{EpicID: "has-test", Branch: "tick/has-test", Path: "/path"}
		ch.HandleConflict(wt, []string{"file.txt"}, "main")

		if !ch.HasConflict("has-test") {
			t.Error("HasConflict() should return true for registered conflict")
		}
	})
}

func TestConflictState_ConflictInfo(t *testing.T) {
	t.Run("generates readable conflict info", func(t *testing.T) {
		state := &ConflictState{
			EpicID:       "info-epic",
			Branch:       "tick/info-epic",
			Conflicts:    []string{"file1.txt", "file2.txt"},
			WorktreePath: "/path/to/worktree",
			DetectedAt:   time.Now(),
		}

		info := state.ConflictInfo()

		// Verify key information is present
		if !strings.Contains(info, "info-epic") {
			t.Error("ConflictInfo should contain epic ID")
		}
		if !strings.Contains(info, "tick/info-epic") {
			t.Error("ConflictInfo should contain branch name")
		}
		if !strings.Contains(info, "/path/to/worktree") {
			t.Error("ConflictInfo should contain worktree path")
		}
		if !strings.Contains(info, "file1.txt") {
			t.Error("ConflictInfo should contain conflicting files")
		}
		if !strings.Contains(info, "file2.txt") {
			t.Error("ConflictInfo should contain conflicting files")
		}
		if !strings.Contains(info, "git merge") {
			t.Error("ConflictInfo should contain resolution instructions")
		}
	})

	t.Run("uses custom target branch in instructions", func(t *testing.T) {
		state := &ConflictState{
			EpicID:       "feature-epic",
			Branch:       "tick/feature-epic",
			Conflicts:    []string{"api.go"},
			WorktreePath: "/path/to/worktree",
			DetectedAt:   time.Now(),
			TargetBranch: "feature/auth",
		}

		info := state.ConflictInfo()

		// Verify it uses the target branch, not hardcoded "main"
		if !strings.Contains(info, "git checkout feature/auth") {
			t.Error("ConflictInfo should use TargetBranch in checkout instruction")
		}
		if strings.Contains(info, "git checkout main") {
			t.Error("ConflictInfo should not hardcode 'main' when TargetBranch is set")
		}
	})

	t.Run("defaults to main when TargetBranch is empty", func(t *testing.T) {
		state := &ConflictState{
			EpicID:       "default-epic",
			Branch:       "tick/default-epic",
			Conflicts:    []string{"file.go"},
			WorktreePath: "/path/to/worktree",
			DetectedAt:   time.Now(),
			TargetBranch: "", // Empty - should default to main
		}

		info := state.ConflictInfo()

		if !strings.Contains(info, "git checkout main") {
			t.Error("ConflictInfo should default to 'main' when TargetBranch is empty")
		}
	})
}

func TestConflictHandler_isBranchMerged(t *testing.T) {
	t.Run("returns true for merged branch", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree
		wt, err := wm.Create("merged-branch")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make commit in worktree
		newFile := filepath.Join(wt.Path, "merged-file.txt")
		if err := os.WriteFile(newFile, []byte("content"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "merged-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add file")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		// Merge the branch
		runGit(t, dir, "checkout", mm.MainBranch())
		runGit(t, dir, "merge", wt.Branch, "--no-ff", "-m", "Merge")

		ch := NewConflictHandler(dir, mm)

		if !ch.isBranchMerged(wt.Branch) {
			t.Error("isBranchMerged() should return true for merged branch")
		}
	})

	t.Run("returns false for unmerged branch", func(t *testing.T) {
		dir := createTempGitRepo(t)
		wm, err := NewManager(dir)
		if err != nil {
			t.Fatalf("NewManager() error = %v", err)
		}

		// Create worktree with unmerged changes
		wt, err := wm.Create("unmerged-branch")
		if err != nil {
			t.Fatalf("Create() error = %v", err)
		}

		// Make commit in worktree
		newFile := filepath.Join(wt.Path, "unmerged-file.txt")
		if err := os.WriteFile(newFile, []byte("content"), 0644); err != nil {
			t.Fatalf("failed to write file: %v", err)
		}
		runGit(t, wt.Path, "add", "unmerged-file.txt")
		runGit(t, wt.Path, "commit", "-m", "Add file")

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		if ch.isBranchMerged(wt.Branch) {
			t.Error("isBranchMerged() should return false for unmerged branch")
		}
	})

	t.Run("returns true for deleted branch", func(t *testing.T) {
		dir := createTempGitRepo(t)

		mm, err := NewMergeManager(dir)
		if err != nil {
			t.Fatalf("NewMergeManager() error = %v", err)
		}

		ch := NewConflictHandler(dir, mm)

		// Non-existent branch should be considered "merged"
		if !ch.isBranchMerged("tick/nonexistent") {
			t.Error("isBranchMerged() should return true for non-existent branch")
		}
	})
}
