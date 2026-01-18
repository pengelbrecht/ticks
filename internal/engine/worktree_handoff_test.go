package engine

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/checkpoint"
	"github.com/pengelbrecht/ticks/internal/worktree"
)

// =============================================================================
// Test Infrastructure for Worktree + Handoff Integration Tests
// =============================================================================

// worktreeMockAgent supports multi-response scenarios with work directory tracking.
type worktreeMockAgent struct {
	name         string
	available    bool
	responses    []mockResponse
	callCount    int
	lastPrompts  []string
	lastWorkDirs []string // Track the WorkDir used in each call
}

func newWorktreeMockAgent() *worktreeMockAgent {
	return &worktreeMockAgent{
		name:      "worktree-test-agent",
		available: true,
	}
}

func (m *worktreeMockAgent) Name() string    { return m.name }
func (m *worktreeMockAgent) Available() bool { return m.available }

func (m *worktreeMockAgent) queueResponse(output string) {
	m.responses = append(m.responses, mockResponse{
		output:    output,
		tokensIn:  1000,
		tokensOut: 500,
		cost:      0.01,
	})
}

func (m *worktreeMockAgent) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.lastPrompts = append(m.lastPrompts, prompt)
	m.lastWorkDirs = append(m.lastWorkDirs, opts.WorkDir)

	if m.callCount >= len(m.responses) {
		// Return empty result to gracefully end
		return &agent.Result{
			Output:    "",
			TokensIn:  100,
			TokensOut: 50,
			Cost:      0.001,
			Duration:  10 * time.Millisecond,
		}, nil
	}

	resp := m.responses[m.callCount]
	m.callCount++

	if resp.err != nil {
		return nil, resp.err
	}

	return &agent.Result{
		Output:    resp.output,
		TokensIn:  resp.tokensIn,
		TokensOut: resp.tokensOut,
		Cost:      resp.cost,
		Duration:  100 * time.Millisecond,
	}, nil
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

// =============================================================================
// Worktree + Handoff Integration Tests
// =============================================================================

// TestWorktree_PreservedOnHandoff tests that worktree exists after handoff signal
// and is not cleaned up when tasks are awaiting human intervention.
func TestWorktree_PreservedOnHandoff(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock ticks client with task
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Make security changes")

	// Setup agent to emit handoff signal
	agentMock := newWorktreeMockAgent()
	agentMock.queueResponse("Changes made! <promise>APPROVAL_NEEDED: security review</promise>")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run with worktree enabled
	ctx := context.Background()
	result, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})

	// Assert: No error
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Assert: Exit reason indicates tasks awaiting human
	if result.ExitReason != ExitReasonTasksAwaitingHuman {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonTasksAwaitingHuman)
	}

	// Assert: Worktree should still exist (preserved for handoff)
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	if !wtManager.Exists("epic1") {
		t.Error("worktree should exist after handoff - it should be preserved for resumption")
	}

	// Assert: Agent was run in the worktree directory
	if len(agentMock.lastWorkDirs) == 0 {
		t.Fatal("agent was never called")
	}
	expectedWorktreePath := filepath.Join(repoRoot, ".worktrees", "epic1")
	if agentMock.lastWorkDirs[0] != expectedWorktreePath {
		t.Errorf("agent WorkDir = %q, want %q", agentMock.lastWorkDirs[0], expectedWorktreePath)
	}
}

// TestWorktree_SameWorktreeAfterRejection tests that after human rejection,
// the agent resumes work in the same worktree with changes preserved.
func TestWorktree_SameWorktreeAfterRejection(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock ticks client
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Write error messages")

	// Create worktree manager
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	// Pre-create worktree (simulating resumed run)
	wt, err := wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	worktreePath := wt.Path

	// Create a file in the worktree to simulate agent work
	testFile := filepath.Join(worktreePath, "agent_work.txt")
	if err := os.WriteFile(testFile, []byte("work in progress"), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Setup agent with two responses (content review, then complete)
	agentMock := newWorktreeMockAgent()
	agentMock.queueResponse("Done! <promise>CONTENT_REVIEW: error messages</promise>")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// First run: hands off to human
	ctx := context.Background()
	_, err = engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("first engine.Run() error = %v", err)
	}

	// Verify worktree still exists
	if !wtManager.Exists("epic1") {
		t.Fatal("worktree should exist after handoff")
	}

	// Verify agent_work.txt still exists in worktree
	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		t.Error("agent_work.txt should still exist in worktree after handoff")
	}

	// Simulate human rejection with feedback
	mock.SimulateHumanRejection("task1", "Too harsh, soften the tone")

	// Queue second agent response
	agentMock.queueResponse("Fixed! <promise>COMPLETE</promise>")

	// Reset budget for second run
	b2 := budget.NewTracker(budget.Limits{MaxIterations: 10})
	engine2 := NewEngine(agentMock, mock, b2, c)

	// Second run: agent should resume in same worktree
	_, err = engine2.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("second engine.Run() error = %v", err)
	}

	// Verify agent was called again with the same worktree path
	if len(agentMock.lastWorkDirs) < 2 {
		t.Fatalf("agent should have been called at least twice, got %d calls", len(agentMock.lastWorkDirs))
	}

	// Both runs should use the same worktree
	if agentMock.lastWorkDirs[0] != agentMock.lastWorkDirs[1] {
		t.Errorf("agent should use same worktree: first=%q, second=%q",
			agentMock.lastWorkDirs[0], agentMock.lastWorkDirs[1])
	}

	// Verify the file still exists
	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		t.Error("agent_work.txt should still exist after second run")
	}
}

// TestWorktree_ChangesNotLost tests that uncommitted changes in the worktree
// are preserved across handoff cycles.
func TestWorktree_ChangesNotLost(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Create worktree manager and worktree
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Make uncommitted changes in the worktree
	modifiedFile := filepath.Join(wt.Path, "initial.txt")
	if err := os.WriteFile(modifiedFile, []byte("modified content"), 0644); err != nil {
		t.Fatalf("failed to modify file: %v", err)
	}

	newFile := filepath.Join(wt.Path, "new_feature.go")
	if err := os.WriteFile(newFile, []byte("package main\n\nfunc NewFeature() {}"), 0644); err != nil {
		t.Fatalf("failed to create new file: %v", err)
	}

	// Setup mock client and agent
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Implement feature")

	agentMock := newWorktreeMockAgent()
	agentMock.queueResponse("Feature done! <promise>APPROVAL_NEEDED: review</promise>")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine - should handoff and preserve worktree
	ctx := context.Background()
	result, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify exit due to awaiting
	if result.ExitReason != ExitReasonTasksAwaitingHuman {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonTasksAwaitingHuman)
	}

	// Verify worktree still exists
	if !wtManager.Exists("epic1") {
		t.Fatal("worktree should exist after handoff")
	}

	// Verify modified content is preserved
	content, err := os.ReadFile(modifiedFile)
	if err != nil {
		t.Fatalf("failed to read modified file: %v", err)
	}
	if string(content) != "modified content" {
		t.Errorf("modified content = %q, want %q", string(content), "modified content")
	}

	// Verify new file is preserved
	if _, err := os.Stat(newFile); os.IsNotExist(err) {
		t.Error("new_feature.go should still exist")
	}

	// Verify changes don't exist in main repo
	mainFile := filepath.Join(repoRoot, "new_feature.go")
	if _, err := os.Stat(mainFile); !os.IsNotExist(err) {
		t.Error("new_feature.go should NOT exist in main repo (isolated in worktree)")
	}
}

// TestWorktree_CleanupOnEpicComplete tests that worktree is only cleaned up
// when the epic is fully complete (all tasks done).
func TestWorktree_CleanupOnEpicComplete(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock with task that agent will complete
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Simple task")

	agentMock := newWorktreeMockAgent()
	// Agent completes the task (emits COMPLETE which is ignored, but agent should call tk close)
	// For the mock, we simulate the agent closing the task by queueing a response
	// and then having the mock mark it closed after the iteration
	agentMock.queueResponse("Done! All work complete.")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	// Pre-create worktree to simulate previous work
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}
	_, err = wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Verify worktree exists before run
	if !wtManager.Exists("epic1") {
		t.Fatal("worktree should exist before run")
	}

	engine := NewEngine(agentMock, mock, b, c)

	// Hook into engine to close task after first iteration (simulating agent calling tk close)
	engine.OnIterationEnd = func(result *IterationResult) {
		// Simulate agent closing the task via tk close
		mock.CloseTask("task1", "Completed")
	}

	// Run engine - should complete epic and cleanup worktree
	ctx := context.Background()
	result, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify exit reason indicates completion
	if result.ExitReason != ExitReasonAllTasksCompleted {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonAllTasksCompleted)
	}

	// Verify worktree was cleaned up
	if wtManager.Exists("epic1") {
		t.Error("worktree should be cleaned up after epic completion")
	}
}

// TestWorktree_NotCleanedUpOnBudgetLimit tests that worktree is preserved
// when the run ends due to budget limits.
func TestWorktree_NotCleanedUpOnBudgetLimit(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock with task
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Long running task")

	agentMock := newWorktreeMockAgent()
	// Queue response without completion
	agentMock.queueResponse("Working on it...")

	checkpointDir := t.TempDir()
	// Budget with 0 iterations - will stop immediately after first iteration
	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine
	ctx := context.Background()
	result, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify exit reason is budget related
	if result.ExitReason == ExitReasonAllTasksCompleted || result.ExitReason == ExitReasonNoTasksFound {
		t.Errorf("ExitReason should NOT indicate completion: %q", result.ExitReason)
	}

	// Verify worktree is preserved
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	if !wtManager.Exists("epic1") {
		t.Error("worktree should be preserved after budget limit (for potential resume)")
	}
}

// TestWorktree_ParallelEpicsIsolated tests that multiple epics can have
// separate worktrees that don't interfere with each other.
func TestWorktree_ParallelEpicsIsolated(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Create worktree manager
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	// Create worktrees for two epics
	wt1, err := wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create(epic1) error = %v", err)
	}
	wt2, err := wtManager.Create("epic2")
	if err != nil {
		t.Fatalf("Create(epic2) error = %v", err)
	}

	// Verify they have different paths
	if wt1.Path == wt2.Path {
		t.Error("epic1 and epic2 should have different worktree paths")
	}

	// Create unique files in each worktree
	file1 := filepath.Join(wt1.Path, "epic1_work.txt")
	if err := os.WriteFile(file1, []byte("epic1 content"), 0644); err != nil {
		t.Fatalf("failed to create file in epic1 worktree: %v", err)
	}

	file2 := filepath.Join(wt2.Path, "epic2_work.txt")
	if err := os.WriteFile(file2, []byte("epic2 content"), 0644); err != nil {
		t.Fatalf("failed to create file in epic2 worktree: %v", err)
	}

	// Verify files exist only in their respective worktrees
	if _, err := os.Stat(filepath.Join(wt1.Path, "epic2_work.txt")); !os.IsNotExist(err) {
		t.Error("epic2_work.txt should NOT exist in epic1's worktree")
	}
	if _, err := os.Stat(filepath.Join(wt2.Path, "epic1_work.txt")); !os.IsNotExist(err) {
		t.Error("epic1_work.txt should NOT exist in epic2's worktree")
	}

	// Verify neither exists in main repo
	if _, err := os.Stat(filepath.Join(repoRoot, "epic1_work.txt")); !os.IsNotExist(err) {
		t.Error("epic1_work.txt should NOT exist in main repo")
	}
	if _, err := os.Stat(filepath.Join(repoRoot, "epic2_work.txt")); !os.IsNotExist(err) {
		t.Error("epic2_work.txt should NOT exist in main repo")
	}

	// Verify both worktrees have different branches
	if wt1.Branch == wt2.Branch {
		t.Error("epic1 and epic2 should have different branches")
	}
	if wt1.Branch != "ticker/epic1" {
		t.Errorf("wt1.Branch = %q, want %q", wt1.Branch, "ticker/epic1")
	}
	if wt2.Branch != "ticker/epic2" {
		t.Errorf("wt2.Branch = %q, want %q", wt2.Branch, "ticker/epic2")
	}
}

// TestWorktree_ExistingWorktreeReused tests that when running an epic that
// already has a worktree, it reuses the existing worktree instead of failing.
func TestWorktree_ExistingWorktreeReused(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Pre-create worktree with some work
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Add some work to the worktree
	workFile := filepath.Join(wt.Path, "previous_work.txt")
	if err := os.WriteFile(workFile, []byte("previous iteration work"), 0644); err != nil {
		t.Fatalf("failed to create work file: %v", err)
	}

	// Setup mock
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Continue work")

	agentMock := newWorktreeMockAgent()
	agentMock.queueResponse("Continuing! <promise>APPROVAL_NEEDED: review</promise>")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine - should reuse existing worktree
	ctx := context.Background()
	_, err = engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify agent used the existing worktree
	if len(agentMock.lastWorkDirs) == 0 {
		t.Fatal("agent should have been called")
	}
	// Compare paths by evaluating symlinks (macOS /var -> /private/var)
	gotPath, _ := filepath.EvalSymlinks(agentMock.lastWorkDirs[0])
	wantPath, _ := filepath.EvalSymlinks(wt.Path)
	if gotPath != wantPath {
		t.Errorf("agent WorkDir = %q, want existing worktree %q", agentMock.lastWorkDirs[0], wt.Path)
	}

	// Verify previous work is still there
	content, err := os.ReadFile(workFile)
	if err != nil {
		t.Fatalf("failed to read work file: %v", err)
	}
	if string(content) != "previous iteration work" {
		t.Errorf("work file content = %q, want %q", string(content), "previous iteration work")
	}
}

// TestWorktree_CommittedChangesOnBranch tests that changes committed in the
// worktree are on the epic's branch and isolated from main.
func TestWorktree_CommittedChangesOnBranch(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Create worktree manager and worktree
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	wt, err := wtManager.Create("epic1")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Make changes and commit them in the worktree
	newFile := filepath.Join(wt.Path, "feature.go")
	if err := os.WriteFile(newFile, []byte("package main"), 0644); err != nil {
		t.Fatalf("failed to create file: %v", err)
	}

	// Git add and commit in the worktree
	cmd := exec.Command("git", "add", "feature.go")
	cmd.Dir = wt.Path
	if err := cmd.Run(); err != nil {
		t.Fatalf("git add failed: %v", err)
	}

	cmd = exec.Command("git", "commit", "-m", "Add feature")
	cmd.Dir = wt.Path
	if err := cmd.Run(); err != nil {
		t.Fatalf("git commit failed: %v", err)
	}

	// Verify the commit exists on the epic branch
	cmd = exec.Command("git", "log", "--oneline", "-1")
	cmd.Dir = wt.Path
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("git log failed: %v", err)
	}
	if len(output) == 0 {
		t.Error("expected commit log output")
	}

	// Verify the file does NOT exist in main repo (different branch)
	mainFile := filepath.Join(repoRoot, "feature.go")
	if _, err := os.Stat(mainFile); !os.IsNotExist(err) {
		t.Error("feature.go should NOT exist in main repo (commit is on epic branch)")
	}

	// Verify we can switch back to main and not see the file
	cmd = exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoRoot
	mainBranch, _ := cmd.Output()
	t.Logf("Main repo is on branch: %s", string(mainBranch))

	// The worktree is on its own branch
	cmd = exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = wt.Path
	wtBranch, _ := cmd.Output()
	t.Logf("Worktree is on branch: %s", string(wtBranch))

	if string(mainBranch) == string(wtBranch) {
		t.Error("main repo and worktree should be on different branches")
	}
}

// TestWorktree_CleanupOnNoTasksFound tests that worktree is cleaned up
// when there are no tasks to process.
func TestWorktree_CleanupOnNoTasksFound(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock with no tasks (empty epic)
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Empty Epic")
	// No tasks added

	agentMock := newWorktreeMockAgent()

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine
	ctx := context.Background()
	result, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify exit reason
	if result.ExitReason != ExitReasonNoTasksFound {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonNoTasksFound)
	}

	// Verify worktree was cleaned up
	wtManager, err := worktree.NewManager(repoRoot)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	if wtManager.Exists("epic1") {
		t.Error("worktree should be cleaned up when no tasks found")
	}
}

// TestWorktree_WorkDirPassedToAgent tests that the worktree path is correctly
// passed to the agent via RunOpts.WorkDir.
func TestWorktree_WorkDirPassedToAgent(t *testing.T) {
	// Setup real git repo
	repoRoot := createTempGitRepo(t)

	// Setup mock
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Do work")

	agentMock := newWorktreeMockAgent()
	agentMock.queueResponse("Working... <promise>APPROVAL_NEEDED: check</promise>")

	checkpointDir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine
	ctx := context.Background()
	_, err := engine.Run(ctx, RunConfig{
		EpicID:      "epic1",
		UseWorktree: true,
		RepoRoot:    repoRoot,
	})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Verify agent received correct WorkDir
	if len(agentMock.lastWorkDirs) == 0 {
		t.Fatal("agent should have been called at least once")
	}

	workDir := agentMock.lastWorkDirs[0]

	// WorkDir should be under .worktrees
	worktreesDir := filepath.Join(repoRoot, ".worktrees")
	if !strings.HasPrefix(workDir, worktreesDir) {
		t.Errorf("WorkDir = %q, should be under %q", workDir, worktreesDir)
	}

	// WorkDir should contain epic1
	if filepath.Base(workDir) != "epic1" {
		t.Errorf("WorkDir base = %q, want %q", filepath.Base(workDir), "epic1")
	}

	// WorkDir should exist and be a git worktree
	if _, err := os.Stat(workDir); os.IsNotExist(err) {
		t.Errorf("WorkDir %q should exist", workDir)
	}

	// Verify it's a valid git directory
	cmd := exec.Command("git", "status")
	cmd.Dir = workDir
	if err := cmd.Run(); err != nil {
		t.Errorf("WorkDir should be a valid git directory: %v", err)
	}
}
