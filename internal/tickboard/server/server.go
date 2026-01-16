package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

//go:embed static/*
var staticFS embed.FS

// Server represents the tickboard HTTP server.
type Server struct {
	tickDir string
	port    int
	srv     *http.Server
}

// New creates a new tickboard server.
func New(tickDir string, port int) (*Server, error) {
	s := &Server{
		tickDir: tickDir,
		port:    port,
	}
	return s, nil
}

// Run starts the HTTP server and blocks until the context is cancelled.
func (s *Server) Run(ctx context.Context) error {
	mux := http.NewServeMux()

	// Serve static files from embedded filesystem
	staticContent, err := fs.Sub(staticFS, "static")
	if err != nil {
		return fmt.Errorf("failed to access static files: %w", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticContent))))

	// API endpoint: list ticks with filters
	mux.HandleFunc("/api/ticks", s.handleListTicks)

	// API endpoint: approve a tick
	mux.HandleFunc("/api/ticks/", s.handleTickActions)

	// Root handler - serve index.html
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		// Serve index.html from static files
		data, err := staticFS.ReadFile("static/index.html")
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
	})

	s.srv = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := s.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
		close(errChan)
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		// Graceful shutdown with timeout
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.srv.Shutdown(shutdownCtx)
	case err := <-errChan:
		return err
	}
}

// TickDir returns the path to the .tick directory being served.
func (s *Server) TickDir() string {
	return s.tickDir
}

// Column represents kanban board columns.
const (
	ColumnBacklog  = "backlog"
	ColumnReady    = "ready"
	ColumnAgent    = "agent"
	ColumnReview   = "review"
	ColumnInput    = "input"
	ColumnRejected = "rejected"
	ColumnDone     = "done"
)

// TickResponse is a tick with computed fields for the API response.
type TickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
}

// ListTicksResponse is the response body for GET /api/ticks.
type ListTicksResponse struct {
	Ticks []TickResponse `json:"ticks"`
}

// handleListTicks handles GET /api/ticks with query filters.
func (s *Server) handleListTicks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Load all ticks
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load ticks: %v", err), http.StatusInternalServerError)
		return
	}

	// Build index for blocked calculation
	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, t := range allTicks {
		tickIndex[t.ID] = t
	}

	// Parse query params for filtering
	q := r.URL.Query()
	filter := query.Filter{
		Status: q.Get("status"),
		Type:   q.Get("type"),
		Parent: q.Get("parent"),
	}

	// Handle awaiting filter
	if awaitingParam := q.Get("awaiting"); awaitingParam != "" {
		filter.Awaiting = &awaitingParam
	}

	// Apply filters
	filtered := query.Apply(allTicks, filter)

	// Build response with computed fields
	response := ListTicksResponse{
		Ticks: make([]TickResponse, 0, len(filtered)),
	}

	for _, t := range filtered {
		isBlocked := computeIsBlocked(t, tickIndex)
		column := computeColumn(t, isBlocked)

		response.Ticks = append(response.Ticks, TickResponse{
			Tick:      t,
			IsBlocked: isBlocked,
			Column:    column,
		})
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// computeIsBlocked checks if a tick has open blockers.
func computeIsBlocked(t tick.Tick, index map[string]tick.Tick) bool {
	if t.Status == tick.StatusClosed {
		return false
	}
	if len(t.BlockedBy) == 0 {
		return false
	}
	for _, blockerID := range t.BlockedBy {
		blocker, ok := index[blockerID]
		if !ok {
			// Missing blocker treated as closed (handles orphaned references)
			continue
		}
		if blocker.Status != tick.StatusClosed {
			return true
		}
	}
	return false
}

// computeColumn determines which kanban column a tick belongs to.
// Column logic:
//   - backlog: open + (blocked OR priority>=3)
//   - ready: open + unblocked + !awaiting
//   - agent: in_progress + !awaiting
//   - review: awaiting in (approval,review,content,work)
//   - input: awaiting in (input,escalation,checkpoint)
//   - rejected: verdict=rejected + open
//   - done: closed
func computeColumn(t tick.Tick, isBlocked bool) string {
	// done: closed
	if t.Status == tick.StatusClosed {
		return ColumnDone
	}

	// rejected: verdict=rejected + open (includes in_progress)
	if t.Verdict != nil && *t.Verdict == tick.VerdictRejected {
		return ColumnRejected
	}

	// Get awaiting type (handles legacy Manual field)
	awaitingType := t.GetAwaitingType()

	// input: awaiting in (input,escalation,checkpoint)
	switch awaitingType {
	case tick.AwaitingInput, tick.AwaitingEscalation, tick.AwaitingCheckpoint:
		return ColumnInput
	}

	// review: awaiting in (approval,review,content,work)
	switch awaitingType {
	case tick.AwaitingApproval, tick.AwaitingReview, tick.AwaitingContent, tick.AwaitingWork:
		return ColumnReview
	}

	// agent: in_progress + !awaiting
	if t.Status == tick.StatusInProgress {
		return ColumnAgent
	}

	// backlog: open + (blocked OR priority>=3)
	if isBlocked || t.Priority >= 3 {
		return ColumnBacklog
	}

	// ready: open + unblocked + !awaiting
	return ColumnReady
}

// handleTickActions routes requests to /api/ticks/:id/action endpoints.
func (s *Server) handleTickActions(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/ticks/:id/approve
	path := strings.TrimPrefix(r.URL.Path, "/api/ticks/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}

	tickID := parts[0]
	action := parts[1]

	switch action {
	case "approve":
		s.handleApproveTick(w, r, tickID)
	default:
		http.NotFound(w, r)
	}
}

// ApproveTickResponse is the response body for POST /api/ticks/:id/approve.
type ApproveTickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
	Closed    bool   `json:"closed"`
}

// handleApproveTick handles POST /api/ticks/:id/approve.
func (s *Server) handleApproveTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Load the tick
	tickPath := filepath.Join(s.tickDir, "issues", tickID+".json")
	data, err := os.ReadFile(tickPath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Tick not found", http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to read tick: %v", err), http.StatusInternalServerError)
		return
	}

	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse tick: %v", err), http.StatusInternalServerError)
		return
	}

	// Validate tick is awaiting human action
	if !t.IsAwaitingHuman() {
		http.Error(w, "Tick is not awaiting human action", http.StatusBadRequest)
		return
	}

	// Handle legacy Manual flag by converting to Awaiting field
	// This ensures ProcessVerdict works correctly
	if t.Manual && t.Awaiting == nil {
		t.SetAwaiting(tick.AwaitingWork)
	}

	// Set verdict to approved
	verdict := tick.VerdictApproved
	t.Verdict = &verdict
	t.UpdatedAt = time.Now()

	// Process the verdict
	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to process verdict: %v", err), http.StatusInternalServerError)
		return
	}

	// Save the tick
	updatedData, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to marshal tick: %v", err), http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(tickPath, updatedData, 0644); err != nil {
		http.Error(w, fmt.Sprintf("Failed to save tick: %v", err), http.StatusInternalServerError)
		return
	}

	// Build response with computed fields
	// Load all ticks for blocked calculation
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		// Non-fatal: return tick without computed fields
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ApproveTickResponse{
			Tick:   t,
			Closed: closed,
		})
		return
	}

	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, tk := range allTicks {
		tickIndex[tk.ID] = tk
	}

	isBlocked := computeIsBlocked(t, tickIndex)
	column := computeColumn(t, isBlocked)

	response := ApproveTickResponse{
		Tick:      t,
		IsBlocked: isBlocked,
		Column:    column,
		Closed:    closed,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}
