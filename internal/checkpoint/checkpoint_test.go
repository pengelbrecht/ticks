package checkpoint

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestNewManager(t *testing.T) {
	m := NewManager()
	if m == nil {
		t.Fatal("NewManager() returned nil")
	}
	if m.Dir() != ".tick/logs/checkpoints" {
		t.Errorf("Dir() = %q, want %q", m.Dir(), ".tick/logs/checkpoints")
	}
}

func TestNewManagerWithDir(t *testing.T) {
	m := NewManagerWithDir("/custom/path")
	if m.Dir() != "/custom/path" {
		t.Errorf("Dir() = %q, want %q", m.Dir(), "/custom/path")
	}
}

func TestManager_SaveAndLoad(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{
		ID:             "abc-5",
		Timestamp:      time.Now().Truncate(time.Second),
		EpicID:         "abc",
		Iteration:      5,
		TotalTokens:    10000,
		TotalCost:      1.50,
		CompletedTasks: []string{"task1", "task2"},
		GitCommit:      "abc123def456",
	}

	// Save
	if err := m.Save(cp); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify file exists
	filename := filepath.Join(dir, "abc-5.json")
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Fatal("checkpoint file was not created")
	}

	// Load
	loaded, err := m.Load("abc-5")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	// Verify fields
	if loaded.ID != cp.ID {
		t.Errorf("ID = %q, want %q", loaded.ID, cp.ID)
	}
	if loaded.EpicID != cp.EpicID {
		t.Errorf("EpicID = %q, want %q", loaded.EpicID, cp.EpicID)
	}
	if loaded.Iteration != cp.Iteration {
		t.Errorf("Iteration = %d, want %d", loaded.Iteration, cp.Iteration)
	}
	if loaded.TotalTokens != cp.TotalTokens {
		t.Errorf("TotalTokens = %d, want %d", loaded.TotalTokens, cp.TotalTokens)
	}
	if loaded.TotalCost != cp.TotalCost {
		t.Errorf("TotalCost = %f, want %f", loaded.TotalCost, cp.TotalCost)
	}
	if len(loaded.CompletedTasks) != len(cp.CompletedTasks) {
		t.Errorf("CompletedTasks length = %d, want %d", len(loaded.CompletedTasks), len(cp.CompletedTasks))
	}
	if loaded.GitCommit != cp.GitCommit {
		t.Errorf("GitCommit = %q, want %q", loaded.GitCommit, cp.GitCommit)
	}
}

func TestManager_Save_EmptyID(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{
		ID: "",
	}

	err := m.Save(cp)
	if err == nil {
		t.Fatal("Save() should error on empty ID")
	}
}

func TestManager_Load_NotFound(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	_, err := m.Load("nonexistent")
	if err == nil {
		t.Fatal("Load() should error on nonexistent checkpoint")
	}
}

func TestManager_List(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	// Create multiple checkpoints
	now := time.Now()
	checkpoints := []*Checkpoint{
		{ID: "abc-1", Timestamp: now.Add(-2 * time.Hour), EpicID: "abc", Iteration: 1},
		{ID: "abc-5", Timestamp: now.Add(-1 * time.Hour), EpicID: "abc", Iteration: 5},
		{ID: "xyz-3", Timestamp: now, EpicID: "xyz", Iteration: 3},
	}

	for _, cp := range checkpoints {
		if err := m.Save(cp); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}

	// List all
	list, err := m.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(list) != 3 {
		t.Errorf("List() returned %d checkpoints, want 3", len(list))
	}

	// Should be sorted by timestamp, newest first
	if list[0].ID != "xyz-3" {
		t.Errorf("first checkpoint = %q, want %q (newest)", list[0].ID, "xyz-3")
	}
}

func TestManager_List_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	list, err := m.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(list) != 0 {
		t.Errorf("List() returned %d checkpoints, want 0", len(list))
	}
}

func TestManager_List_NonexistentDir(t *testing.T) {
	m := NewManagerWithDir("/nonexistent/path/checkpoints")

	list, err := m.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(list) != 0 {
		t.Errorf("List() should return nil or empty for nonexistent dir")
	}
}

func TestManager_ListForEpic(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	// Create checkpoints for different epics
	checkpoints := []*Checkpoint{
		{ID: "abc-1", Timestamp: time.Now(), EpicID: "abc", Iteration: 1},
		{ID: "abc-5", Timestamp: time.Now(), EpicID: "abc", Iteration: 5},
		{ID: "abc-10", Timestamp: time.Now(), EpicID: "abc", Iteration: 10},
		{ID: "xyz-3", Timestamp: time.Now(), EpicID: "xyz", Iteration: 3},
	}

	for _, cp := range checkpoints {
		if err := m.Save(cp); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}

	// List for epic "abc"
	list, err := m.ListForEpic("abc")
	if err != nil {
		t.Fatalf("ListForEpic() error = %v", err)
	}

	if len(list) != 3 {
		t.Errorf("ListForEpic(abc) returned %d checkpoints, want 3", len(list))
	}

	// Should be sorted by iteration, newest first
	if list[0].Iteration != 10 {
		t.Errorf("first checkpoint iteration = %d, want 10 (highest)", list[0].Iteration)
	}
}

func TestManager_Latest(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	// Create checkpoints
	checkpoints := []*Checkpoint{
		{ID: "abc-1", Timestamp: time.Now(), EpicID: "abc", Iteration: 1},
		{ID: "abc-5", Timestamp: time.Now(), EpicID: "abc", Iteration: 5},
		{ID: "abc-10", Timestamp: time.Now(), EpicID: "abc", Iteration: 10},
	}

	for _, cp := range checkpoints {
		if err := m.Save(cp); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}

	// Get latest
	latest, err := m.Latest("abc")
	if err != nil {
		t.Fatalf("Latest() error = %v", err)
	}

	if latest == nil {
		t.Fatal("Latest() returned nil")
	}

	if latest.Iteration != 10 {
		t.Errorf("Latest() iteration = %d, want 10", latest.Iteration)
	}
}

func TestManager_Latest_NoCheckpoints(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	latest, err := m.Latest("abc")
	if err != nil {
		t.Fatalf("Latest() error = %v", err)
	}

	if latest != nil {
		t.Error("Latest() should return nil when no checkpoints exist")
	}
}

func TestManager_Delete(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{ID: "abc-5", EpicID: "abc", Iteration: 5}
	if err := m.Save(cp); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Delete
	if err := m.Delete("abc-5"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	// Verify deleted
	_, err := m.Load("abc-5")
	if err == nil {
		t.Error("checkpoint should be deleted")
	}
}

func TestManager_Delete_Nonexistent(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	// Should not error on nonexistent
	if err := m.Delete("nonexistent"); err != nil {
		t.Errorf("Delete() error = %v, want nil", err)
	}
}

func TestGenerateID(t *testing.T) {
	tests := []struct {
		epicID    string
		iteration int
		want      string
	}{
		{"abc", 1, "abc-1"},
		{"abc", 10, "abc-10"},
		{"h8d", 42, "h8d-42"},
	}

	for _, tt := range tests {
		got := GenerateID(tt.epicID, tt.iteration)
		if got != tt.want {
			t.Errorf("GenerateID(%q, %d) = %q, want %q", tt.epicID, tt.iteration, got, tt.want)
		}
	}
}

func TestNewCheckpoint(t *testing.T) {
	cp := NewCheckpoint("abc", 5, 10000, 1.50, []string{"task1", "task2"})

	if cp.ID != "abc-5" {
		t.Errorf("ID = %q, want %q", cp.ID, "abc-5")
	}
	if cp.EpicID != "abc" {
		t.Errorf("EpicID = %q, want %q", cp.EpicID, "abc")
	}
	if cp.Iteration != 5 {
		t.Errorf("Iteration = %d, want %d", cp.Iteration, 5)
	}
	if cp.TotalTokens != 10000 {
		t.Errorf("TotalTokens = %d, want %d", cp.TotalTokens, 10000)
	}
	if cp.TotalCost != 1.50 {
		t.Errorf("TotalCost = %f, want %f", cp.TotalCost, 1.50)
	}
	if len(cp.CompletedTasks) != 2 {
		t.Errorf("CompletedTasks length = %d, want %d", len(cp.CompletedTasks), 2)
	}
	if cp.Timestamp.IsZero() {
		t.Error("Timestamp should not be zero")
	}
	// GitCommit may or may not be set depending on whether we're in a git repo
}

func TestGetGitCommit(t *testing.T) {
	// This test just ensures GetGitCommit doesn't panic
	// The actual value depends on whether we're in a git repo
	commit := GetGitCommit()
	t.Logf("GetGitCommit() = %q", commit)
	// In the ticker repo, we should get a commit
	if commit == "" {
		t.Log("Warning: GetGitCommit() returned empty string (may not be in git repo)")
	}
}

func TestNewCheckpointWithWorktree(t *testing.T) {
	cp := NewCheckpointWithWorktree("abc", 5, 10000, 1.50, []string{"task1"}, "/path/to/worktree", "ticker/abc")

	if cp.ID != "abc-5" {
		t.Errorf("ID = %q, want %q", cp.ID, "abc-5")
	}
	if cp.WorktreePath != "/path/to/worktree" {
		t.Errorf("WorktreePath = %q, want %q", cp.WorktreePath, "/path/to/worktree")
	}
	if cp.WorktreeBranch != "ticker/abc" {
		t.Errorf("WorktreeBranch = %q, want %q", cp.WorktreeBranch, "ticker/abc")
	}
}

func TestManager_SaveAndLoad_WithWorktree(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{
		ID:             "abc-5",
		Timestamp:      time.Now().Truncate(time.Second),
		EpicID:         "abc",
		Iteration:      5,
		TotalTokens:    10000,
		TotalCost:      1.50,
		CompletedTasks: []string{"task1", "task2"},
		GitCommit:      "abc123def456",
		WorktreePath:   "/home/test/.worktrees/abc",
		WorktreeBranch: "ticker/abc",
	}

	// Save
	if err := m.Save(cp); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Load
	loaded, err := m.Load("abc-5")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	// Verify worktree fields
	if loaded.WorktreePath != cp.WorktreePath {
		t.Errorf("WorktreePath = %q, want %q", loaded.WorktreePath, cp.WorktreePath)
	}
	if loaded.WorktreeBranch != cp.WorktreeBranch {
		t.Errorf("WorktreeBranch = %q, want %q", loaded.WorktreeBranch, cp.WorktreeBranch)
	}
}

func TestPrepareResume_NormalMode(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{
		ID:     "abc-5",
		EpicID: "abc",
		// No worktree fields - normal mode
	}

	workDir, err := m.PrepareResume(cp, "/some/repo")
	if err != nil {
		t.Fatalf("PrepareResume() error = %v", err)
	}
	if workDir != "." {
		t.Errorf("workDir = %q, want %q", workDir, ".")
	}
}

func TestPrepareResume_WorktreeExists(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	// Create a directory to simulate existing worktree
	worktreePath := filepath.Join(dir, "worktrees", "abc")
	if err := os.MkdirAll(worktreePath, 0755); err != nil {
		t.Fatalf("creating worktree dir: %v", err)
	}

	cp := &Checkpoint{
		ID:             "abc-5",
		EpicID:         "abc",
		WorktreePath:   worktreePath,
		WorktreeBranch: "ticker/abc",
	}

	workDir, err := m.PrepareResume(cp, dir)
	if err != nil {
		t.Fatalf("PrepareResume() error = %v", err)
	}
	if workDir != worktreePath {
		t.Errorf("workDir = %q, want %q", workDir, worktreePath)
	}
}

func TestPrepareResume_WorktreeGone_NoBranch(t *testing.T) {
	dir := t.TempDir()
	m := NewManagerWithDir(dir)

	cp := &Checkpoint{
		ID:             "abc-5",
		EpicID:         "abc",
		WorktreePath:   "/nonexistent/path", // Doesn't exist
		WorktreeBranch: "",                  // No branch to recreate from
	}

	_, err := m.PrepareResume(cp, dir)
	if err != ErrWorktreeGone {
		t.Errorf("PrepareResume() error = %v, want ErrWorktreeGone", err)
	}
}

func TestPrepareResume_RecreatesWorktreeFromBranch(t *testing.T) {
	// Create a temporary git repository
	repoDir := t.TempDir()

	// Initialize git repo
	initCmd := exec.Command("git", "init")
	initCmd.Dir = repoDir
	if output, err := initCmd.CombinedOutput(); err != nil {
		t.Fatalf("git init failed: %s: %v", output, err)
	}

	// Configure git user for commits
	configCmds := [][]string{
		{"git", "config", "user.email", "test@test.com"},
		{"git", "config", "user.name", "Test User"},
	}
	for _, args := range configCmds {
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = repoDir
		if output, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%s failed: %s: %v", args, output, err)
		}
	}

	// Create initial commit
	testFile := filepath.Join(repoDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("writing test file: %v", err)
	}
	addCmd := exec.Command("git", "add", ".")
	addCmd.Dir = repoDir
	if output, err := addCmd.CombinedOutput(); err != nil {
		t.Fatalf("git add failed: %s: %v", output, err)
	}
	commitCmd := exec.Command("git", "commit", "-m", "initial")
	commitCmd.Dir = repoDir
	if output, err := commitCmd.CombinedOutput(); err != nil {
		t.Fatalf("git commit failed: %s: %v", output, err)
	}

	// Create a branch that we can recreate the worktree from
	branchCmd := exec.Command("git", "branch", "ticker/abc")
	branchCmd.Dir = repoDir
	if output, err := branchCmd.CombinedOutput(); err != nil {
		t.Fatalf("git branch failed: %s: %v", output, err)
	}

	// Create checkpoint pointing to non-existent worktree but valid branch
	m := NewManagerWithDir(t.TempDir())
	cp := &Checkpoint{
		ID:             "abc-5",
		EpicID:         "abc",
		WorktreePath:   filepath.Join(repoDir, ".worktrees", "old-path"), // Doesn't exist
		WorktreeBranch: "ticker/abc",
	}

	// PrepareResume should recreate the worktree from the branch
	workDir, err := m.PrepareResume(cp, repoDir)
	if err != nil {
		t.Fatalf("PrepareResume() error = %v", err)
	}

	expectedPath := filepath.Join(repoDir, ".worktrees", "abc")
	if workDir != expectedPath {
		t.Errorf("workDir = %q, want %q", workDir, expectedPath)
	}

	// Verify worktree was actually created
	if _, err := os.Stat(workDir); os.IsNotExist(err) {
		t.Error("worktree directory was not created")
	}

	// Cleanup worktree
	cleanupCmd := exec.Command("git", "worktree", "remove", workDir, "--force")
	cleanupCmd.Dir = repoDir
	_ = cleanupCmd.Run()
}

func TestPrepareResume_BranchGone(t *testing.T) {
	// Create a temporary git repository
	repoDir := t.TempDir()

	// Initialize git repo
	initCmd := exec.Command("git", "init")
	initCmd.Dir = repoDir
	if output, err := initCmd.CombinedOutput(); err != nil {
		t.Fatalf("git init failed: %s: %v", output, err)
	}

	// Configure git user for commits
	configCmds := [][]string{
		{"git", "config", "user.email", "test@test.com"},
		{"git", "config", "user.name", "Test User"},
	}
	for _, args := range configCmds {
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = repoDir
		if output, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%s failed: %s: %v", args, output, err)
		}
	}

	// Create initial commit
	testFile := filepath.Join(repoDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("writing test file: %v", err)
	}
	addCmd := exec.Command("git", "add", ".")
	addCmd.Dir = repoDir
	if output, err := addCmd.CombinedOutput(); err != nil {
		t.Fatalf("git add failed: %s: %v", output, err)
	}
	commitCmd := exec.Command("git", "commit", "-m", "initial")
	commitCmd.Dir = repoDir
	if output, err := commitCmd.CombinedOutput(); err != nil {
		t.Fatalf("git commit failed: %s: %v", output, err)
	}

	// Create checkpoint pointing to non-existent worktree AND non-existent branch
	m := NewManagerWithDir(t.TempDir())
	cp := &Checkpoint{
		ID:             "abc-5",
		EpicID:         "abc",
		WorktreePath:   filepath.Join(repoDir, ".worktrees", "abc"), // Doesn't exist
		WorktreeBranch: "ticker/abc",                                // Branch doesn't exist either
	}

	_, err := m.PrepareResume(cp, repoDir)
	if err != ErrWorktreeGone {
		t.Errorf("PrepareResume() error = %v, want ErrWorktreeGone", err)
	}
}
