//go:build integration

package context

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

// TestDependencyAnalyzer_RealAgent tests the dependency analyzer with a real Claude agent.
// Run with: go test -tags integration -v ./internal/context -run TestDependencyAnalyzer_RealAgent
//
// This test:
// 1. Creates a realistic epic with tasks that have file conflicts
// 2. Calls Claude to predict file modifications
// 3. Verifies conflicts are detected and dependencies added
func TestDependencyAnalyzer_RealAgent(t *testing.T) {
	// Check if Claude is available
	claudeAgent := agent.NewClaudeAgent()
	if !claudeAgent.Available() {
		t.Skip("claude CLI not available, skipping integration test")
	}

	// Set up temp directory with tick store
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0755); err != nil {
		t.Fatalf("failed to create tick dir: %v", err)
	}

	store := tick.NewStore(tickDir)

	// Create tasks that should have obvious file conflicts
	now := time.Now()
	tasks := []tick.Tick{
		{
			ID:          "task-add-user-model",
			Title:       "Add User model",
			Description: "Create a new User model in src/models/user.go with fields for ID, Name, Email. Include validation methods.",
			Status:      tick.StatusOpen,
			Type:        tick.TypeTask,
			Owner:       "test",
			CreatedBy:   "test",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "task-add-user-validation",
			Title:       "Add email validation to User model",
			Description: "Add an IsValidEmail() method to the User model in src/models/user.go that validates email format.",
			Status:      tick.StatusOpen,
			Type:        tick.TypeTask,
			Owner:       "test",
			CreatedBy:   "test",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "task-add-product-model",
			Title:       "Add Product model",
			Description: "Create a new Product model in src/models/product.go with fields for ID, Name, Price, Stock.",
			Status:      tick.StatusOpen,
			Type:        tick.TypeTask,
			Owner:       "test",
			CreatedBy:   "test",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	for _, task := range tasks {
		if err := store.Write(task); err != nil {
			t.Fatalf("store.Write() error = %v", err)
		}
	}

	// Create analyzer with real agent
	da := NewDependencyAnalyzer(claudeAgent, store, WithDepTimeout(2*time.Minute))

	epic := &ticks.Epic{
		ID:          "epic-models",
		Title:       "Create Data Models",
		Description: "Implement the core data models for the application including User and Product.",
	}

	ticksTasks := []ticks.Task{
		{ID: "task-add-user-model", Title: tasks[0].Title, Description: tasks[0].Description},
		{ID: "task-add-user-validation", Title: tasks[1].Title, Description: tasks[1].Description},
		{ID: "task-add-product-model", Title: tasks[2].Title, Description: tasks[2].Description},
	}

	t.Log("Running dependency analysis with real Claude agent...")
	result, err := da.Analyze(context.Background(), epic, ticksTasks)
	if err != nil {
		t.Fatalf("Analyze() error = %v", err)
	}

	// Log the results for inspection
	t.Logf("Predictions: %d", len(result.Predictions))
	for _, pred := range result.Predictions {
		t.Logf("  %s: %v", pred.TaskID, pred.Files)
	}

	t.Logf("Conflicts: %d", len(result.ConflictingPairs))
	for _, conflict := range result.ConflictingPairs {
		t.Logf("  %s <-> %s: %v", conflict.Task1, conflict.Task2, conflict.SharedFiles)
	}

	t.Logf("Added dependencies: %d", len(result.AddedDeps))
	for taskID, blockers := range result.AddedDeps {
		t.Logf("  %s blocked by: %v", taskID, blockers)
	}

	// Verify we got predictions for all tasks
	if len(result.Predictions) != 3 {
		t.Errorf("expected 3 predictions, got %d", len(result.Predictions))
	}

	// Verify conflict was detected between user-model and user-validation
	// (both should touch src/models/user.go)
	foundUserConflict := false
	for _, conflict := range result.ConflictingPairs {
		if (conflict.Task1 == "task-add-user-model" && conflict.Task2 == "task-add-user-validation") ||
			(conflict.Task1 == "task-add-user-validation" && conflict.Task2 == "task-add-user-model") {
			foundUserConflict = true
			// Check that user.go is in shared files
			hasUserFile := false
			for _, f := range conflict.SharedFiles {
				if f == "src/models/user.go" || f == "models/user.go" {
					hasUserFile = true
					break
				}
			}
			if !hasUserFile {
				t.Logf("Warning: user.go not in shared files, got: %v", conflict.SharedFiles)
			}
			break
		}
	}

	if !foundUserConflict {
		t.Error("expected conflict between task-add-user-model and task-add-user-validation")
	}

	// Verify dependency was added
	if len(result.AddedDeps) == 0 {
		t.Error("expected at least one dependency to be added")
	}

	// Verify the task was updated in the store
	validationTask, err := store.Read("task-add-user-validation")
	if err != nil {
		t.Fatalf("store.Read() error = %v", err)
	}

	// task-add-user-validation should be blocked by task-add-user-model
	// (since add-user-model comes first in the list)
	if len(validationTask.BlockedBy) == 0 {
		t.Error("task-add-user-validation should have blockers after analysis")
	} else {
		t.Logf("task-add-user-validation.BlockedBy = %v", validationTask.BlockedBy)
	}

	// Verify product task has no blockers (no conflict with user tasks)
	productTask, err := store.Read("task-add-product-model")
	if err != nil {
		t.Fatalf("store.Read() error = %v", err)
	}

	if len(productTask.BlockedBy) != 0 {
		t.Errorf("task-add-product-model should have no blockers, got %v", productTask.BlockedBy)
	}
}

// TestDependencyAnalyzer_RealAgent_NewFiles tests detection of conflicts on NEW files.
// Run with: go test -tags integration -v ./internal/context -run TestDependencyAnalyzer_RealAgent_NewFiles
func TestDependencyAnalyzer_RealAgent_NewFiles(t *testing.T) {
	claudeAgent := agent.NewClaudeAgent()
	if !claudeAgent.Available() {
		t.Skip("claude CLI not available, skipping integration test")
	}

	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	os.MkdirAll(filepath.Join(tickDir, "issues"), 0755)

	store := tick.NewStore(tickDir)

	// Two tasks that both create the same new file
	now := time.Now()
	tasks := []tick.Tick{
		{
			ID:          "task-create-config",
			Title:       "Create config module",
			Description: "Create a new config module at src/config/config.go that loads settings from environment variables.",
			Status:      tick.StatusOpen,
			Type:        tick.TypeTask,
			Owner:       "test",
			CreatedBy:   "test",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "task-add-config-validation",
			Title:       "Add config validation",
			Description: "Add validation to the config module at src/config/config.go to ensure required settings are present.",
			Status:      tick.StatusOpen,
			Type:        tick.TypeTask,
			Owner:       "test",
			CreatedBy:   "test",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	for _, task := range tasks {
		store.Write(task)
	}

	da := NewDependencyAnalyzer(claudeAgent, store, WithDepTimeout(2*time.Minute))

	epic := &ticks.Epic{
		ID:          "epic-config",
		Title:       "Configuration System",
		Description: "Build the application configuration system.",
	}

	ticksTasks := []ticks.Task{
		{ID: tasks[0].ID, Title: tasks[0].Title, Description: tasks[0].Description},
		{ID: tasks[1].ID, Title: tasks[1].Title, Description: tasks[1].Description},
	}

	t.Log("Running dependency analysis for new file conflict...")
	result, err := da.Analyze(context.Background(), epic, ticksTasks)
	if err != nil {
		t.Fatalf("Analyze() error = %v", err)
	}

	t.Logf("Predictions: %+v", result.Predictions)
	t.Logf("Conflicts: %+v", result.ConflictingPairs)
	t.Logf("Added deps: %+v", result.AddedDeps)

	// Both tasks should predict they'll touch config.go
	if len(result.ConflictingPairs) == 0 {
		t.Error("expected conflict on config.go (both tasks create/modify it)")
	}

	if len(result.AddedDeps) == 0 {
		t.Error("expected dependency to be added")
	}
}
