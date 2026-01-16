package server

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestNew(t *testing.T) {
	// Create a temp .tick directory
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.Mkdir(tickDir, 0755); err != nil {
		t.Fatalf("failed to create .tick dir: %v", err)
	}

	srv, err := New(tickDir, 0)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if srv.TickDir() != tickDir {
		t.Errorf("TickDir() = %q, want %q", srv.TickDir(), tickDir)
	}
}

func TestServer_Run(t *testing.T) {
	// Create a temp .tick directory
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.Mkdir(tickDir, 0755); err != nil {
		t.Fatalf("failed to create .tick dir: %v", err)
	}

	// Use port 0 to get a random available port
	srv, err := New(tickDir, 18765)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		errChan <- srv.Run(ctx)
	}()

	// Give server time to start
	time.Sleep(100 * time.Millisecond)

	// Test that the server responds
	resp, err := http.Get("http://localhost:18765/")
	if err != nil {
		cancel()
		t.Fatalf("failed to connect to server: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cancel()
		t.Errorf("GET / status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	// Test static files
	resp, err = http.Get("http://localhost:18765/static/style.css")
	if err != nil {
		cancel()
		t.Fatalf("failed to get static file: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cancel()
		t.Errorf("GET /static/style.css status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	// Test 404 for unknown paths
	resp, err = http.Get("http://localhost:18765/unknown")
	if err != nil {
		cancel()
		t.Fatalf("failed to request unknown path: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		cancel()
		t.Errorf("GET /unknown status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}

	// Shutdown
	cancel()

	// Wait for server to stop
	select {
	case err := <-errChan:
		if err != nil && err != http.ErrServerClosed {
			t.Errorf("Run() returned unexpected error: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Error("server did not shut down in time")
	}
}

func TestStaticFS_Embedded(t *testing.T) {
	// Verify that static files are properly embedded
	files := []string{
		"static/index.html",
		"static/style.css",
		"static/app.js",
	}

	for _, f := range files {
		data, err := staticFS.ReadFile(f)
		if err != nil {
			t.Errorf("failed to read embedded file %q: %v", f, err)
			continue
		}
		if len(data) == 0 {
			t.Errorf("embedded file %q is empty", f)
		}
	}
}

// createTestTick creates a tick JSON file in the issues directory.
func createTestTick(t *testing.T, issuesDir string, tk tick.Tick) {
	t.Helper()
	data, err := json.MarshalIndent(tk, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal tick: %v", err)
	}
	path := filepath.Join(issuesDir, tk.ID+".json")
	if err := os.WriteFile(path, data, 0644); err != nil {
		t.Fatalf("failed to write tick file: %v", err)
	}
}

// baseTick returns a valid tick with required fields populated.
func baseTick(id, title string) tick.Tick {
	now := time.Now()
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    tick.StatusOpen,
		Priority:  2,
		Type:      tick.TypeTask,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func TestListTicks_Basic(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create test ticks
	task1 := baseTick("abc", "Task 1")
	task2 := baseTick("def", "Task 2")
	createTestTick(t, issuesDir, task1)
	createTestTick(t, issuesDir, task2)

	srv, err := New(tickDir, 18766)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18766/api/ticks")
	if err != nil {
		t.Fatalf("failed to request /api/ticks: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("GET /api/ticks status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result ListTicksResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(result.Ticks) != 2 {
		t.Errorf("got %d ticks, want 2", len(result.Ticks))
	}
}

func TestListTicks_Filters(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create test ticks with different properties
	task1 := baseTick("abc", "Task 1")
	task1.Status = tick.StatusOpen

	task2 := baseTick("def", "Task 2")
	task2.Status = tick.StatusClosed
	closedAt := time.Now()
	task2.ClosedAt = &closedAt

	task3 := baseTick("ghi", "Task 3")
	task3.Type = tick.TypeEpic

	task4 := baseTick("jkl", "Task 4")
	task4.Parent = "ghi"

	createTestTick(t, issuesDir, task1)
	createTestTick(t, issuesDir, task2)
	createTestTick(t, issuesDir, task3)
	createTestTick(t, issuesDir, task4)

	srv, err := New(tickDir, 18767)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	tests := []struct {
		name        string
		query       string
		wantCount   int
		wantIDs     []string
	}{
		{
			name:      "filter by status=open",
			query:     "?status=open",
			wantCount: 3,
		},
		{
			name:      "filter by status=closed",
			query:     "?status=closed",
			wantCount: 1,
			wantIDs:   []string{"def"},
		},
		{
			name:      "filter by type=epic",
			query:     "?type=epic",
			wantCount: 1,
			wantIDs:   []string{"ghi"},
		},
		{
			name:      "filter by parent",
			query:     "?parent=ghi",
			wantCount: 1,
			wantIDs:   []string{"jkl"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Get("http://localhost:18767/api/ticks" + tt.query)
			if err != nil {
				t.Fatalf("failed to request: %v", err)
			}
			defer resp.Body.Close()

			var result ListTicksResponse
			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				t.Fatalf("failed to decode: %v", err)
			}

			if len(result.Ticks) != tt.wantCount {
				t.Errorf("got %d ticks, want %d", len(result.Ticks), tt.wantCount)
			}

			if len(tt.wantIDs) > 0 {
				gotIDs := make(map[string]bool)
				for _, tk := range result.Ticks {
					gotIDs[tk.ID] = true
				}
				for _, wantID := range tt.wantIDs {
					if !gotIDs[wantID] {
						t.Errorf("expected tick %s not found", wantID)
					}
				}
			}
		})
	}
}

func TestListTicks_ComputedFields(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// blocker (open)
	blocker := baseTick("blk", "Blocker")
	blocker.Status = tick.StatusOpen
	createTestTick(t, issuesDir, blocker)

	// blocked task
	blocked := baseTick("blkd", "Blocked Task")
	blocked.BlockedBy = []string{"blk"}
	createTestTick(t, issuesDir, blocked)

	// unblocked task
	unblocked := baseTick("unb", "Unblocked Task")
	createTestTick(t, issuesDir, unblocked)

	srv, err := New(tickDir, 18768)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18768/api/ticks")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	var result ListTicksResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	tickByID := make(map[string]TickResponse)
	for _, tk := range result.Ticks {
		tickByID[tk.ID] = tk
	}

	// Check isBlocked
	if !tickByID["blkd"].IsBlocked {
		t.Error("blkd should be blocked")
	}
	if tickByID["unb"].IsBlocked {
		t.Error("unb should not be blocked")
	}

	// Check columns
	if tickByID["blkd"].Column != ColumnBacklog {
		t.Errorf("blkd column = %s, want %s", tickByID["blkd"].Column, ColumnBacklog)
	}
	if tickByID["unb"].Column != ColumnReady {
		t.Errorf("unb column = %s, want %s", tickByID["unb"].Column, ColumnReady)
	}
}

func TestComputeColumn(t *testing.T) {
	approval := tick.AwaitingApproval
	input := tick.AwaitingInput
	rejected := tick.VerdictRejected

	tests := []struct {
		name       string
		tick       tick.Tick
		isBlocked  bool
		wantColumn string
	}{
		{
			name:       "closed -> done",
			tick:       tick.Tick{Status: tick.StatusClosed},
			wantColumn: ColumnDone,
		},
		{
			name:       "open+rejected -> rejected",
			tick:       tick.Tick{Status: tick.StatusOpen, Verdict: &rejected},
			wantColumn: ColumnRejected,
		},
		{
			name:       "awaiting input -> input",
			tick:       tick.Tick{Status: tick.StatusOpen, Awaiting: &input},
			wantColumn: ColumnInput,
		},
		{
			name:       "awaiting approval -> review",
			tick:       tick.Tick{Status: tick.StatusOpen, Awaiting: &approval},
			wantColumn: ColumnReview,
		},
		{
			name:       "in_progress -> agent",
			tick:       tick.Tick{Status: tick.StatusInProgress},
			wantColumn: ColumnAgent,
		},
		{
			name:       "open+blocked -> backlog",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 2},
			isBlocked:  true,
			wantColumn: ColumnBacklog,
		},
		{
			name:       "open+low priority -> backlog",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 3},
			wantColumn: ColumnBacklog,
		},
		{
			name:       "open+unblocked+high priority -> ready",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 2},
			wantColumn: ColumnReady,
		},
		{
			name:       "legacy manual -> review",
			tick:       tick.Tick{Status: tick.StatusOpen, Manual: true},
			wantColumn: ColumnReview,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeColumn(tt.tick, tt.isBlocked)
			if got != tt.wantColumn {
				t.Errorf("computeColumn() = %s, want %s", got, tt.wantColumn)
			}
		})
	}
}

func TestComputeIsBlocked(t *testing.T) {
	openBlocker := tick.Tick{ID: "open", Status: tick.StatusOpen}
	closedBlocker := tick.Tick{ID: "closed", Status: tick.StatusClosed}
	index := map[string]tick.Tick{
		"open":   openBlocker,
		"closed": closedBlocker,
	}

	tests := []struct {
		name      string
		tick      tick.Tick
		wantBlock bool
	}{
		{
			name:      "no blockers -> not blocked",
			tick:      tick.Tick{Status: tick.StatusOpen},
			wantBlock: false,
		},
		{
			name:      "open blocker -> blocked",
			tick:      tick.Tick{Status: tick.StatusOpen, BlockedBy: []string{"open"}},
			wantBlock: true,
		},
		{
			name:      "closed blocker -> not blocked",
			tick:      tick.Tick{Status: tick.StatusOpen, BlockedBy: []string{"closed"}},
			wantBlock: false,
		},
		{
			name:      "missing blocker -> not blocked",
			tick:      tick.Tick{Status: tick.StatusOpen, BlockedBy: []string{"missing"}},
			wantBlock: false,
		},
		{
			name:      "closed tick -> not blocked",
			tick:      tick.Tick{Status: tick.StatusClosed, BlockedBy: []string{"open"}},
			wantBlock: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeIsBlocked(tt.tick, index)
			if got != tt.wantBlock {
				t.Errorf("computeIsBlocked() = %v, want %v", got, tt.wantBlock)
			}
		})
	}
}

func TestListTicks_MethodNotAllowed(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18769)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18769/api/ticks", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestApproveTick_TerminalAwaiting(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick awaiting approval (terminal state)
	task := baseTick("abc", "Task awaiting approval")
	awaiting := tick.AwaitingApproval
	task.Awaiting = &awaiting
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18770)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18770/api/ticks/abc/approve", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/abc/approve status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result ApproveTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Tick should be closed (approval is terminal)
	if !result.Closed {
		t.Error("expected closed=true for terminal awaiting state")
	}
	if result.Status != tick.StatusClosed {
		t.Errorf("status = %s, want %s", result.Status, tick.StatusClosed)
	}
	if result.Column != ColumnDone {
		t.Errorf("column = %s, want %s", result.Column, ColumnDone)
	}
}

func TestApproveTick_NonTerminalAwaiting(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick awaiting input (non-terminal state)
	task := baseTick("def", "Task awaiting input")
	awaiting := tick.AwaitingInput
	task.Awaiting = &awaiting
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18771)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18771/api/ticks/def/approve", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/def/approve status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result ApproveTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Tick should NOT be closed (input is non-terminal, approved = continue)
	if result.Closed {
		t.Error("expected closed=false for non-terminal awaiting state with approved verdict")
	}
	if result.Status == tick.StatusClosed {
		t.Errorf("status should not be closed")
	}
	// Awaiting should be cleared
	if result.Awaiting != nil {
		t.Errorf("awaiting should be nil, got %v", *result.Awaiting)
	}
}

func TestApproveTick_NotAwaiting(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick NOT awaiting human action
	task := baseTick("ghi", "Regular task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18772)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18772/api/ticks/ghi/approve", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/ghi/approve status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestApproveTick_NotFound(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18773)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18773/api/ticks/nonexistent/approve", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("POST /api/ticks/nonexistent/approve status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}
}

func TestApproveTick_MethodNotAllowed(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	task := baseTick("jkl", "Task")
	awaiting := tick.AwaitingApproval
	task.Awaiting = &awaiting
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18774)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18774/api/ticks/jkl/approve")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/ticks/jkl/approve status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestApproveTick_LegacyManual(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick with legacy Manual flag
	task := baseTick("mno", "Manual task")
	task.Manual = true
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18775)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18775/api/ticks/mno/approve", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/mno/approve status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result ApproveTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Manual=true is treated as AwaitingWork (terminal), so should close
	if !result.Closed {
		t.Error("expected closed=true for legacy manual task")
	}
	// Manual flag should be cleared
	if result.Manual {
		t.Error("expected manual=false after approval")
	}
}
