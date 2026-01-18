package server

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
	if tickByID["blkd"].Column != ColumnBlocked {
		t.Errorf("blkd column = %s, want %s", tickByID["blkd"].Column, ColumnBlocked)
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
			name:       "open+rejected -> ready (rejected returns to agent queue)",
			tick:       tick.Tick{Status: tick.StatusOpen, Verdict: &rejected},
			wantColumn: ColumnReady,
		},
		{
			name:       "awaiting input -> human",
			tick:       tick.Tick{Status: tick.StatusOpen, Awaiting: &input},
			wantColumn: ColumnHuman,
		},
		{
			name:       "awaiting approval -> human",
			tick:       tick.Tick{Status: tick.StatusOpen, Awaiting: &approval},
			wantColumn: ColumnHuman,
		},
		{
			name:       "in_progress -> agent",
			tick:       tick.Tick{Status: tick.StatusInProgress},
			wantColumn: ColumnAgent,
		},
		{
			name:       "open+blocked -> blocked",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 2},
			isBlocked:  true,
			wantColumn: ColumnBlocked,
		},
		{
			name:       "open+low priority -> ready (all priorities in ready)",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 3},
			wantColumn: ColumnReady,
		},
		{
			name:       "open+unblocked+high priority -> ready",
			tick:       tick.Tick{Status: tick.StatusOpen, Priority: 2},
			wantColumn: ColumnReady,
		},
		{
			name:       "legacy manual -> human",
			tick:       tick.Tick{Status: tick.StatusOpen, Manual: true},
			wantColumn: ColumnHuman,
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

	// PUT is not allowed (GET and POST are allowed)
	req, _ := http.NewRequest(http.MethodPut, "http://localhost:18769/api/ticks", nil)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("PUT /api/ticks status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
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

func TestRejectTick_TerminalAwaiting(t *testing.T) {
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

	srv, err := New(tickDir, 18776)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"feedback": "Need more tests"}`
	resp, err := http.Post("http://localhost:18776/api/ticks/abc/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/abc/reject status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result RejectTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Terminal awaiting + rejected = NOT closed (goes back to agent)
	if result.Closed {
		t.Error("expected closed=false for terminal awaiting state with rejected verdict")
	}
	// Awaiting should be cleared
	if result.Awaiting != nil {
		t.Errorf("awaiting should be nil, got %v", *result.Awaiting)
	}
	// Notes should contain feedback
	if !strings.Contains(result.Notes, "Need more tests") {
		t.Errorf("notes should contain feedback, got: %s", result.Notes)
	}
	if !strings.Contains(result.Notes, "(from: human)") {
		t.Errorf("notes should contain '(from: human)', got: %s", result.Notes)
	}
	// Verdict is cleared (per ProcessVerdict logic) so tick returns to ready state
	// ProcessVerdict clears verdict when tick doesn't close, so column is ready
	if result.Column != ColumnReady {
		t.Errorf("column = %s, want %s", result.Column, ColumnReady)
	}
}

func TestRejectTick_NonTerminalAwaiting(t *testing.T) {
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

	srv, err := New(tickDir, 18777)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"feedback": "Cannot provide this info"}`
	resp, err := http.Post("http://localhost:18777/api/ticks/def/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/def/reject status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result RejectTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Non-terminal awaiting + rejected = closed (can't proceed)
	if !result.Closed {
		t.Error("expected closed=true for non-terminal awaiting state with rejected verdict")
	}
	if result.Status != tick.StatusClosed {
		t.Errorf("status = %s, want %s", result.Status, tick.StatusClosed)
	}
	if result.Column != ColumnDone {
		t.Errorf("column = %s, want %s", result.Column, ColumnDone)
	}
}

func TestRejectTick_NotAwaiting(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick NOT awaiting human action
	task := baseTick("ghi", "Regular task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18778)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"feedback": "rejected"}`
	resp, err := http.Post("http://localhost:18778/api/ticks/ghi/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/ghi/reject status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestRejectTick_NotFound(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18779)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"feedback": "rejected"}`
	resp, err := http.Post("http://localhost:18779/api/ticks/nonexistent/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("POST /api/ticks/nonexistent/reject status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}
}

func TestRejectTick_MethodNotAllowed(t *testing.T) {
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

	srv, err := New(tickDir, 18780)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18780/api/ticks/jkl/reject")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/ticks/jkl/reject status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestRejectTick_EmptyFeedback(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick awaiting approval
	task := baseTick("mno", "Task awaiting approval")
	awaiting := tick.AwaitingApproval
	task.Awaiting = &awaiting
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18781)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	// Empty body (no feedback) - should return 400
	reqBody := `{}`
	resp, err := http.Post("http://localhost:18781/api/ticks/mno/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/mno/reject with empty feedback status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestRejectTick_WhitespaceOnlyFeedback(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick awaiting approval
	task := baseTick("pqr", "Task awaiting approval")
	awaiting := tick.AwaitingApproval
	task.Awaiting = &awaiting
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18791)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	// Whitespace-only feedback - should return 400
	reqBody := `{"feedback": "   "}`
	resp, err := http.Post("http://localhost:18791/api/ticks/pqr/reject", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/pqr/reject with whitespace-only feedback status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestGetTick_Basic(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a test tick
	task := baseTick("abc", "Test Task")
	task.Description = "A test task description"
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18782)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18782/api/ticks/abc")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("GET /api/ticks/abc status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result GetTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.ID != "abc" {
		t.Errorf("ID = %s, want abc", result.ID)
	}
	if result.Title != "Test Task" {
		t.Errorf("Title = %s, want 'Test Task'", result.Title)
	}
	if result.Column != ColumnReady {
		t.Errorf("Column = %s, want %s", result.Column, ColumnReady)
	}
}

func TestGetTick_NotFound(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18783)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18783/api/ticks/nonexistent")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("GET /api/ticks/nonexistent status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}
}

func TestGetTick_MethodNotAllowed(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	task := baseTick("abc", "Test Task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18784)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Post("http://localhost:18784/api/ticks/abc", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("POST /api/ticks/abc status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestGetTick_WithNotes(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick with notes
	task := baseTick("abc", "Task with notes")
	task.Notes = "2024-01-15 10:30 - (from: human) First feedback\n2024-01-15 11:00 - (from: agent) Response to feedback\nSimple note without timestamp"
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18785)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18785/api/ticks/abc")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	var result GetTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(result.NotesList) != 3 {
		t.Fatalf("got %d notes, want 3", len(result.NotesList))
	}

	// First note: with timestamp and author
	if result.NotesList[0].Timestamp != "2024-01-15 10:30" {
		t.Errorf("note[0].Timestamp = %s, want '2024-01-15 10:30'", result.NotesList[0].Timestamp)
	}
	if result.NotesList[0].Author != "human" {
		t.Errorf("note[0].Author = %s, want 'human'", result.NotesList[0].Author)
	}
	if result.NotesList[0].Text != "First feedback" {
		t.Errorf("note[0].Text = %s, want 'First feedback'", result.NotesList[0].Text)
	}

	// Second note: with timestamp and author
	if result.NotesList[1].Author != "agent" {
		t.Errorf("note[1].Author = %s, want 'agent'", result.NotesList[1].Author)
	}

	// Third note: simple without timestamp
	if result.NotesList[2].Timestamp != "" {
		t.Errorf("note[2].Timestamp should be empty, got %s", result.NotesList[2].Timestamp)
	}
	if result.NotesList[2].Text != "Simple note without timestamp" {
		t.Errorf("note[2].Text = %s, want 'Simple note without timestamp'", result.NotesList[2].Text)
	}
}

func TestGetTick_WithBlockers(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create blocker ticks
	blocker1 := baseTick("blk1", "Open Blocker")
	blocker1.Status = tick.StatusOpen
	createTestTick(t, issuesDir, blocker1)

	blocker2 := baseTick("blk2", "Closed Blocker")
	blocker2.Status = tick.StatusClosed
	closedAt := time.Now()
	blocker2.ClosedAt = &closedAt
	createTestTick(t, issuesDir, blocker2)

	// Create blocked tick
	blocked := baseTick("abc", "Blocked Task")
	blocked.BlockedBy = []string{"blk1", "blk2", "missing"}
	createTestTick(t, issuesDir, blocked)

	srv, err := New(tickDir, 18786)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18786/api/ticks/abc")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	var result GetTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should be blocked (has open blocker)
	if !result.IsBlocked {
		t.Error("expected IsBlocked=true")
	}

	if len(result.BlockerDetails) != 3 {
		t.Fatalf("got %d blocker details, want 3", len(result.BlockerDetails))
	}

	// Check blocker details are correct
	blockerByID := make(map[string]BlockerDetail)
	for _, b := range result.BlockerDetails {
		blockerByID[b.ID] = b
	}

	if blockerByID["blk1"].Title != "Open Blocker" {
		t.Errorf("blk1 title = %s, want 'Open Blocker'", blockerByID["blk1"].Title)
	}
	if blockerByID["blk1"].Status != tick.StatusOpen {
		t.Errorf("blk1 status = %s, want %s", blockerByID["blk1"].Status, tick.StatusOpen)
	}

	if blockerByID["blk2"].Status != tick.StatusClosed {
		t.Errorf("blk2 status = %s, want %s", blockerByID["blk2"].Status, tick.StatusClosed)
	}

	// Missing blocker should have placeholder values
	if blockerByID["missing"].Title != "(not found)" {
		t.Errorf("missing blocker title = %s, want '(not found)'", blockerByID["missing"].Title)
	}
	if blockerByID["missing"].Status != "unknown" {
		t.Errorf("missing blocker status = %s, want 'unknown'", blockerByID["missing"].Status)
	}
}

func TestParseNotes(t *testing.T) {
	tests := []struct {
		name  string
		notes string
		want  []Note
	}{
		{
			name:  "empty notes",
			notes: "",
			want:  []Note{},
		},
		{
			name:  "simple note",
			notes: "Just a simple note",
			want:  []Note{{Text: "Just a simple note"}},
		},
		{
			name:  "note with timestamp and author",
			notes: "2024-01-15 10:30 - (from: human) Feedback message",
			want:  []Note{{Timestamp: "2024-01-15 10:30", Author: "human", Text: "Feedback message"}},
		},
		{
			name:  "note with timestamp no author",
			notes: "2024-01-15 10:30 - Some message without author",
			want:  []Note{{Timestamp: "2024-01-15 10:30", Text: "Some message without author"}},
		},
		{
			name:  "multiple notes",
			notes: "2024-01-15 10:30 - (from: human) First\n2024-01-15 11:00 - (from: agent) Second\nThird without timestamp",
			want: []Note{
				{Timestamp: "2024-01-15 10:30", Author: "human", Text: "First"},
				{Timestamp: "2024-01-15 11:00", Author: "agent", Text: "Second"},
				{Text: "Third without timestamp"},
			},
		},
		{
			name:  "blank lines ignored",
			notes: "First note\n\nSecond note\n\n",
			want: []Note{
				{Text: "First note"},
				{Text: "Second note"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseNotes(tt.notes)
			if len(got) != len(tt.want) {
				t.Fatalf("got %d notes, want %d", len(got), len(tt.want))
			}
			for i, note := range got {
				if note.Timestamp != tt.want[i].Timestamp {
					t.Errorf("note[%d].Timestamp = %s, want %s", i, note.Timestamp, tt.want[i].Timestamp)
				}
				if note.Author != tt.want[i].Author {
					t.Errorf("note[%d].Author = %s, want %s", i, note.Author, tt.want[i].Author)
				}
				if note.Text != tt.want[i].Text {
					t.Errorf("note[%d].Text = %s, want %s", i, note.Text, tt.want[i].Text)
				}
			}
		})
	}
}

func TestAddNote_Basic(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a test tick
	task := baseTick("abc", "Test Task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18787)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"message": "This is a test note"}`
	resp, err := http.Post("http://localhost:18787/api/ticks/abc/note", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/abc/note status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result AddNoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Note should be added with timestamp and author
	if !strings.Contains(result.Notes, "This is a test note") {
		t.Errorf("notes should contain message, got: %s", result.Notes)
	}
	if !strings.Contains(result.Notes, "(from: human)") {
		t.Errorf("notes should contain '(from: human)', got: %s", result.Notes)
	}
	// Should have computed fields
	if result.Column != ColumnReady {
		t.Errorf("column = %s, want %s", result.Column, ColumnReady)
	}
}

func TestAddNote_ToExistingNotes(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create a tick with existing notes
	task := baseTick("abc", "Task with notes")
	task.Notes = "2024-01-15 10:00 - (from: agent) Previous note"
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18788)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"message": "New note added"}`
	resp, err := http.Post("http://localhost:18788/api/ticks/abc/note", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("POST /api/ticks/abc/note status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var result AddNoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should contain both old and new notes
	if !strings.Contains(result.Notes, "Previous note") {
		t.Errorf("notes should contain old note, got: %s", result.Notes)
	}
	if !strings.Contains(result.Notes, "New note added") {
		t.Errorf("notes should contain new note, got: %s", result.Notes)
	}
	// New note should be on a new line
	if !strings.Contains(result.Notes, "\n") {
		t.Errorf("notes should have newline between entries, got: %s", result.Notes)
	}
}

func TestAddNote_NotFound(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18789)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"message": "Note for nonexistent tick"}`
	resp, err := http.Post("http://localhost:18789/api/ticks/nonexistent/note", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("POST /api/ticks/nonexistent/note status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}
}

func TestAddNote_EmptyMessage(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	task := baseTick("abc", "Test Task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18790)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	// Empty message should be rejected
	reqBody := `{"message": ""}`
	resp, err := http.Post("http://localhost:18790/api/ticks/abc/note", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/abc/note with empty message status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestAddNote_MissingMessage(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	task := baseTick("abc", "Test Task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18791)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	// Missing message field should be rejected
	reqBody := `{}`
	resp, err := http.Post("http://localhost:18791/api/ticks/abc/note", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks/abc/note without message status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestAddNote_MethodNotAllowed(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	task := baseTick("abc", "Test Task")
	createTestTick(t, issuesDir, task)

	srv, err := New(tickDir, 18792)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:18792/api/ticks/abc/note")
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/ticks/abc/note status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestCreateTick_Basic(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18793)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"title": "New Test Task", "description": "A test description"}`
	resp, err := http.Post("http://localhost:18793/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusCreated)
	}

	var result CreateTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify tick was created
	if result.ID == "" {
		t.Error("expected non-empty ID")
	}
	if result.Title != "New Test Task" {
		t.Errorf("Title = %s, want 'New Test Task'", result.Title)
	}
	if result.Description != "A test description" {
		t.Errorf("Description = %s, want 'A test description'", result.Description)
	}
	// Defaults
	if result.Type != tick.TypeTask {
		t.Errorf("Type = %s, want %s", result.Type, tick.TypeTask)
	}
	if result.Priority != 2 {
		t.Errorf("Priority = %d, want 2", result.Priority)
	}
	if result.Status != tick.StatusOpen {
		t.Errorf("Status = %s, want %s", result.Status, tick.StatusOpen)
	}
	if result.Owner != "tickboard" {
		t.Errorf("Owner = %s, want 'tickboard'", result.Owner)
	}
	if result.CreatedBy != "tickboard" {
		t.Errorf("CreatedBy = %s, want 'tickboard'", result.CreatedBy)
	}
	// Computed fields
	if result.Column != ColumnReady {
		t.Errorf("Column = %s, want %s", result.Column, ColumnReady)
	}
	if result.IsBlocked {
		t.Error("expected IsBlocked=false")
	}

	// Verify file was created
	tickPath := filepath.Join(issuesDir, result.ID+".json")
	if _, err := os.Stat(tickPath); os.IsNotExist(err) {
		t.Errorf("tick file was not created at %s", tickPath)
	}
}

func TestCreateTick_WithAllFields(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	// Create parent epic first
	parentEpic := baseTick("parent", "Parent Epic")
	parentEpic.Type = tick.TypeEpic
	createTestTick(t, issuesDir, parentEpic)

	srv, err := New(tickDir, 18794)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{
		"title": "Feature Task",
		"description": "Implement the feature",
		"type": "feature",
		"priority": 1,
		"parent": "parent",
		"requires": "approval"
	}`
	resp, err := http.Post("http://localhost:18794/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusCreated)
	}

	var result CreateTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.Type != tick.TypeFeature {
		t.Errorf("Type = %s, want %s", result.Type, tick.TypeFeature)
	}
	if result.Priority != 1 {
		t.Errorf("Priority = %d, want 1", result.Priority)
	}
	if result.Parent != "parent" {
		t.Errorf("Parent = %s, want 'parent'", result.Parent)
	}
	if result.Requires == nil || *result.Requires != tick.RequiresApproval {
		t.Errorf("Requires = %v, want %s", result.Requires, tick.RequiresApproval)
	}
}

func TestCreateTick_MissingTitle(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18795)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"description": "No title provided"}`
	resp, err := http.Post("http://localhost:18795/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestCreateTick_EmptyTitle(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18796)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"title": "   "}`
	resp, err := http.Post("http://localhost:18796/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestCreateTick_InvalidType(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18797)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"title": "Test", "type": "invalid_type"}`
	resp, err := http.Post("http://localhost:18797/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestCreateTick_InvalidPriority(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18798)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{"title": "Test", "priority": 10}`
	resp, err := http.Post("http://localhost:18798/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestCreateTick_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18799)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	reqBody := `{invalid json}`
	resp, err := http.Post("http://localhost:18799/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestCreateTick_LowPriorityGoesToReady(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	srv, err := New(tickDir, 18800)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = srv.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)

	// Low priority unblocked items go to ready column
	reqBody := `{"title": "Low Priority Task", "priority": 3}`
	resp, err := http.Post("http://localhost:18800/api/ticks", "application/json", strings.NewReader(reqBody))
	if err != nil {
		t.Fatalf("failed to request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("POST /api/ticks status = %d, want %d", resp.StatusCode, http.StatusCreated)
	}

	var result CreateTickResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.Column != ColumnReady {
		t.Errorf("Column = %s, want %s", result.Column, ColumnBlocked)
	}
}
