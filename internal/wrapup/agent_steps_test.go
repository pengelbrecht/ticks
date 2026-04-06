package wrapup

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// stepMockAgent implements agent.Agent for testing one-shot execution.
type stepMockAgent struct {
	name      string
	responses []string // responses returned in order per Run call
	callCount int
}

func (m *stepMockAgent) Name() string    { return m.name }
func (m *stepMockAgent) Available() bool  { return true }
func (m *stepMockAgent) Run(_ context.Context, _ string, _ agent.RunOpts) (*agent.Result, error) {
	if m.callCount >= len(m.responses) {
		return nil, fmt.Errorf("no more responses")
	}
	resp := m.responses[m.callCount]
	m.callCount++
	return &agent.Result{
		Output:    resp,
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
		Duration:  time.Millisecond * 100,
	}, nil
}

// stepMockSession implements agent.Session for testing.
type stepMockSession struct {
	responses []string
	callCount int
	closed    bool
}

func (s *stepMockSession) Prompt(_ context.Context, _ string, _ agent.RunOpts) (*agent.Result, error) {
	if s.closed {
		return nil, fmt.Errorf("session closed")
	}
	if s.callCount >= len(s.responses) {
		return nil, fmt.Errorf("no more responses")
	}
	resp := s.responses[s.callCount]
	s.callCount++
	return &agent.Result{
		Output:    resp,
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
		Duration:  time.Millisecond * 100,
	}, nil
}

func (s *stepMockSession) Close() error {
	s.closed = true
	return nil
}

// stepMockSessionAgent implements agent.SessionAgent for testing.
type stepMockSessionAgent struct {
	stepMockAgent
	session *stepMockSession
}

func (m *stepMockSessionAgent) Open(_ context.Context, _ agent.RunOpts) (agent.Session, error) {
	return m.session, nil
}

func TestRunAgentSteps_SessionAgent_AllComplete(t *testing.T) {
	session := &stepMockSession{
		responses: []string{
			"Done step 1 <promise>STEP_DONE</promise>",
			"Done step 2 <promise>STEP_DONE</promise>",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1", Verify: "Check 1"},
		{Title: "Step 2", Prompt: "Do step 2", Verify: "Check 2"},
	}

	dir := t.TempDir()
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: filepath.Join(dir, ".tick"),
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	for i, r := range results {
		if r.Status != "completed" {
			t.Errorf("step %d: expected completed, got %s", i, r.Status)
		}
		if r.Attempts != 1 {
			t.Errorf("step %d: expected 1 attempt, got %d", i, r.Attempts)
		}
	}

	if !session.closed {
		t.Error("session was not closed")
	}
}

func TestRunAgentSteps_RetryOnMissingSignal(t *testing.T) {
	session := &stepMockSession{
		responses: []string{
			"I did some work but forgot the signal",
			"OK here it is <promise>STEP_DONE</promise>",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1", Verify: "Check 1"},
	}

	dir := t.TempDir()
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: filepath.Join(dir, ".tick"),
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if results[0].Status != "completed" {
		t.Errorf("expected completed, got %s", results[0].Status)
	}
	if results[0].Attempts != 2 {
		t.Errorf("expected 2 attempts, got %d", results[0].Attempts)
	}
	if results[0].Cost != 0.02 {
		t.Errorf("expected cost 0.02, got %f", results[0].Cost)
	}
}

func TestRunAgentSteps_EscalateHandling(t *testing.T) {
	session := &stepMockSession{
		responses: []string{
			"Cannot do this <promise>ESCALATE: requires manual config</promise>",
			"Done step 2 <promise>STEP_DONE</promise>",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1"},
		{Title: "Step 2", Prompt: "Do step 2"},
	}

	dir := t.TempDir()
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: filepath.Join(dir, ".tick"),
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if results[0].Status != "escalated" {
		t.Errorf("expected escalated, got %s", results[0].Status)
	}
	if results[0].ErrorMsg != "requires manual config" {
		t.Errorf("expected escalation reason, got %q", results[0].ErrorMsg)
	}
	if results[1].Status != "completed" {
		t.Errorf("expected step 2 completed, got %s", results[1].Status)
	}
}

func TestRunAgentSteps_OneShotFallback(t *testing.T) {
	ag := &stepMockAgent{
		name: "test",
		responses: []string{
			"Done <promise>STEP_DONE</promise>",
		},
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1"},
	}

	dir := t.TempDir()
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: filepath.Join(dir, ".tick"),
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Status != "completed" {
		t.Errorf("expected completed, got %s", results[0].Status)
	}
}

func TestRunAgentSteps_MaxRetriesExceeded(t *testing.T) {
	session := &stepMockSession{
		responses: []string{
			"working on it",
			"still working",
			"not done yet",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1"},
	}

	dir := t.TempDir()
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: filepath.Join(dir, ".tick"),
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if results[0].Status != "failed" {
		t.Errorf("expected failed, got %s", results[0].Status)
	}
	if results[0].Attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", results[0].Attempts)
	}
}

func TestRunAgentSteps_CrashRecovery(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	logsDir := filepath.Join(tickDir, "logs")

	// Pre-populate progress file with one completed step
	progress := StepProgress{
		EpicID:    "test-epic",
		StartedAt: time.Now().Add(-time.Minute),
		Steps: []StepProgressEntry{
			{Title: "Step 1", Status: "completed", Attempts: 1, Cost: 0.01, TokensIn: 100, TokensOut: 50},
		},
	}
	pDir := progressDir(logsDir)
	if err := os.MkdirAll(pDir, 0o755); err != nil {
		t.Fatal(err)
	}
	data, _ := json.MarshalIndent(progress, "", "  ")
	if err := os.WriteFile(progressPath(logsDir, "test-epic"), data, 0o644); err != nil {
		t.Fatal(err)
	}

	// Agent only needs to handle step 2
	session := &stepMockSession{
		responses: []string{
			"Done step 2 <promise>STEP_DONE</promise>",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1"},
		{Title: "Step 2", Prompt: "Do step 2"},
	}

	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: tickDir,
	}

	results, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	// Step 1 should be restored from progress
	if results[0].Status != "completed" {
		t.Errorf("step 1: expected completed (from recovery), got %s", results[0].Status)
	}
	if results[0].Cost != 0.01 {
		t.Errorf("step 1: expected cost 0.01 from recovery, got %f", results[0].Cost)
	}

	// Step 2 should be freshly executed
	if results[1].Status != "completed" {
		t.Errorf("step 2: expected completed, got %s", results[1].Status)
	}

	// Agent session should only have been called once (for step 2)
	if session.callCount != 1 {
		t.Errorf("expected 1 session call (skipping step 1), got %d", session.callCount)
	}
}

func TestRunAgentSteps_EmptySteps(t *testing.T) {
	ag := &stepMockAgent{name: "test"}
	runner := &WrapupRunner{WorkDir: t.TempDir(), TickDir: t.TempDir()}

	results, err := runner.RunAgentSteps(context.Background(), nil, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if results != nil {
		t.Errorf("expected nil results for empty steps, got %v", results)
	}
}

func TestRunAgentSteps_ProgressPersistence(t *testing.T) {
	session := &stepMockSession{
		responses: []string{
			"Done <promise>STEP_DONE</promise>",
		},
	}
	ag := &stepMockSessionAgent{
		stepMockAgent: stepMockAgent{name: "test"},
		session:   session,
	}

	steps := []WrapupStep{
		{Title: "Step 1", Prompt: "Do step 1"},
	}

	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	runner := &WrapupRunner{
		WorkDir: dir,
		TickDir: tickDir,
	}

	_, err := runner.RunAgentSteps(context.Background(), steps, "test-epic", ag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify progress file was written
	logsDir := filepath.Join(tickDir, "logs")
	saved := loadProgress(logsDir, "test-epic")
	if saved == nil {
		t.Fatal("expected progress file to be written")
	}
	if len(saved.Steps) != 1 {
		t.Fatalf("expected 1 step in progress, got %d", len(saved.Steps))
	}
	if saved.Steps[0].Status != "completed" {
		t.Errorf("expected completed in progress, got %s", saved.Steps[0].Status)
	}
}
