package wrapup

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/worktree"
)

func TestLoadConfig_ValidYAML(t *testing.T) {
	dir := t.TempDir()
	yaml := `wrap_up:
  - run: "go test ./..."
    name: "Tests"
    continue_on_failure: true
  - run: "go vet ./..."
    name: "Vet"
  - review: true
    prompt: "Check for security issues"
  - pr: draft
`
	if err := os.WriteFile(filepath.Join(dir, "config.yaml"), []byte(yaml), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}

	if len(cfg.Steps) != 4 {
		t.Fatalf("expected 4 steps, got %d", len(cfg.Steps))
	}

	// Step 1: run with continue_on_failure
	if cfg.Steps[0].Run != "go test ./..." {
		t.Errorf("step 0 run = %q, want %q", cfg.Steps[0].Run, "go test ./...")
	}
	if cfg.Steps[0].Name != "Tests" {
		t.Errorf("step 0 name = %q, want %q", cfg.Steps[0].Name, "Tests")
	}
	if !cfg.Steps[0].ContinueOnFailure {
		t.Error("step 0 should have continue_on_failure=true")
	}

	// Step 2: run without continue_on_failure
	if cfg.Steps[1].ContinueOnFailure {
		t.Error("step 1 should have continue_on_failure=false")
	}

	// Step 3: review
	if !cfg.Steps[2].Review {
		t.Error("step 2 should be a review step")
	}
	if cfg.Steps[2].Prompt != "Check for security issues" {
		t.Errorf("step 2 prompt = %q", cfg.Steps[2].Prompt)
	}

	// Step 4: pr
	if cfg.Steps[3].PR != "draft" {
		t.Errorf("step 3 pr = %q, want %q", cfg.Steps[3].PR, "draft")
	}
}

func TestLoadConfig_MissingFile(t *testing.T) {
	dir := t.TempDir()

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig should not error on missing file: %v", err)
	}
	if len(cfg.Steps) != 0 {
		t.Errorf("expected 0 steps, got %d", len(cfg.Steps))
	}
}

func TestLoadConfig_EmptyFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "config.yaml"), []byte(""), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig should not error on empty file: %v", err)
	}
	if len(cfg.Steps) != 0 {
		t.Errorf("expected 0 steps, got %d", len(cfg.Steps))
	}
}

func TestLoadConfig_NoWrapUpKey(t *testing.T) {
	dir := t.TempDir()
	yaml := `some_other_key: true
`
	if err := os.WriteFile(filepath.Join(dir, "config.yaml"), []byte(yaml), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig should not error: %v", err)
	}
	if len(cfg.Steps) != 0 {
		t.Errorf("expected 0 steps, got %d", len(cfg.Steps))
	}
}

func TestReportMarkdown(t *testing.T) {
	report := &Report{
		EpicID:    "abc",
		EpicTitle: "Test Epic",
		Tasks: []TaskSummary{
			{ID: "t1", Title: "Task one", Closed: true},
			{ID: "t2", Title: "Task two", Closed: false, Awaiting: "review"},
			{ID: "t3", Title: "Task three", Closed: false},
		},
		Files: []FileSummary{
			{Path: "main.go", Additions: 10, Deletions: 3},
			{Path: "test.go", Additions: 20, Deletions: 0},
		},
		Metrics: MetricsSummary{
			TotalCost:   1.2345,
			TotalTokens: 50000,
			Duration:    3 * time.Minute,
			WaveCount:   2,
		},
	}

	md := report.Markdown()

	// Check title
	if !strings.Contains(md, "## Test Epic") {
		t.Error("missing epic title")
	}

	// Check tasks
	if !strings.Contains(md, "**t1** Task one (closed)") {
		t.Error("missing closed task")
	}
	if !strings.Contains(md, "**t2** Task two (awaiting review)") {
		t.Error("missing awaiting task")
	}
	if !strings.Contains(md, "**t3** Task three (open)") {
		t.Error("missing open task")
	}

	// Check files
	if !strings.Contains(md, "`main.go` (+10/-3)") {
		t.Error("missing file summary")
	}
	if !strings.Contains(md, "2 files, +30/-3 lines") {
		t.Error("missing file totals")
	}

	// Check metrics
	if !strings.Contains(md, "$1.2345") {
		t.Error("missing cost")
	}
	if !strings.Contains(md, "50000") {
		t.Error("missing tokens")
	}
	if !strings.Contains(md, "3m0s") {
		t.Error("missing duration")
	}
}

func TestRunShellStep_Success(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	step := Step{
		Run:  "echo hello",
		Name: "Echo test",
	}

	result := r.runShellStep(context.Background(), step)
	if !result.Success {
		t.Fatalf("expected success, got error: %v", result.Error)
	}
	if !strings.Contains(result.Output, "hello") {
		t.Errorf("expected output to contain 'hello', got %q", result.Output)
	}
	if result.Name != "Echo test" {
		t.Errorf("name = %q, want %q", result.Name, "Echo test")
	}
}

func TestRunShellStep_Failure(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	step := Step{
		Run:  "exit 1",
		Name: "Failing step",
	}

	result := r.runShellStep(context.Background(), step)
	if result.Success {
		t.Fatal("expected failure")
	}
	if result.Error == nil {
		t.Fatal("expected error")
	}
}

func TestRunShellStep_DefaultName(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	step := Step{
		Run: "echo hi",
	}

	result := r.runShellStep(context.Background(), step)
	if result.Name != "echo hi" {
		t.Errorf("expected name to default to command, got %q", result.Name)
	}
}

func TestRunSteps_ContinueOnFailure(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	config := Config{
		Steps: []Step{
			{Run: "exit 1", Name: "fail-ok", ContinueOnFailure: true},
			{Run: "echo done", Name: "after-fail"},
		},
	}

	results, err := r.runSteps(context.Background(), config)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Success {
		t.Error("first step should have failed")
	}
	if !results[1].Success {
		t.Error("second step should have succeeded")
	}
}

func TestRunSteps_StopOnFailure(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	config := Config{
		Steps: []Step{
			{Run: "exit 1", Name: "fail-stop"},
			{Run: "echo should-not-run", Name: "after-fail"},
		},
	}

	results, err := r.runSteps(context.Background(), config)
	if err == nil {
		t.Fatal("expected error")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result (stopped on failure), got %d", len(results))
	}
}

func TestRunSteps_EmptyConfig(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	results, err := r.runSteps(context.Background(), Config{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

func TestRunSteps_SkipsPRSteps(t *testing.T) {
	r := &Runner{
		WorkDir: t.TempDir(),
	}

	config := Config{
		Steps: []Step{
			{PR: "draft"},
			{Run: "echo done", Name: "after-pr"},
		},
	}

	results, err := r.runSteps(context.Background(), config)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// PR step should be skipped, only the echo step runs
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Name != "after-pr" {
		t.Errorf("expected 'after-pr', got %q", results[0].Name)
	}
}

func TestRunSteps_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	r := &Runner{
		WorkDir: t.TempDir(),
	}

	config := Config{
		Steps: []Step{
			{Run: "echo should-not-run", Name: "step1"},
		},
	}

	_, err := r.runSteps(ctx, config)
	if err == nil {
		t.Fatal("expected context error")
	}
}

func TestGenerateReport_NilResult(t *testing.T) {
	r := &Runner{
		EpicID:  "test",
		TickDir: t.TempDir(),
	}

	_, err := r.generateReport(nil)
	if err == nil {
		t.Fatal("expected error for nil result")
	}
}

func TestGenerateReport_Metrics(t *testing.T) {
	// Create a minimal tick dir structure
	tickDir := t.TempDir()

	r := &Runner{
		EpicID:  "test",
		TickDir: tickDir,
		WorkDir: t.TempDir(),
		Worktree: &worktree.Worktree{
			ParentBranch: "main",
		},
	}

	result := &engine.RunResult{
		EpicID:      "test",
		Iterations:  3,
		TotalTokens: 10000,
		TotalCost:   0.5,
		Duration:    2 * time.Minute,
	}

	report, err := r.generateReport(result)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if report.EpicID != "test" {
		t.Errorf("epicID = %q, want %q", report.EpicID, "test")
	}
	if report.Metrics.TotalCost != 0.5 {
		t.Errorf("cost = %f, want 0.5", report.Metrics.TotalCost)
	}
	if report.Metrics.TotalTokens != 10000 {
		t.Errorf("tokens = %d, want 10000", report.Metrics.TotalTokens)
	}
	if report.Metrics.WaveCount != 3 {
		t.Errorf("waves = %d, want 3", report.Metrics.WaveCount)
	}
}
