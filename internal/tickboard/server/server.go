package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

//go:embed static/*
var staticFS embed.FS

// EventPusher interface for cloud event broadcasting.
type EventPusher interface {
	PushEvent(eventType string, payload interface{}) error
}

// Server represents the tickboard HTTP server.
type Server struct {
	tickDir string
	port    int
	srv     *http.Server

	// SSE client management
	sseClients   map[chan string]struct{}
	sseClientsMu sync.RWMutex

	// File watcher
	watcher *fsnotify.Watcher

	// Cloud client for event broadcasting
	cloudClient EventPusher
}

// New creates a new tickboard server.
func New(tickDir string, port int) (*Server, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create file watcher: %w", err)
	}

	s := &Server{
		tickDir:    tickDir,
		port:       port,
		sseClients: make(map[chan string]struct{}),
		watcher:    watcher,
	}
	return s, nil
}

// SetCloudClient sets the cloud client for event broadcasting.
func (s *Server) SetCloudClient(client EventPusher) {
	s.cloudClient = client
}

// pushCloudEvent sends an event to the cloud if connected.
func (s *Server) pushCloudEvent(eventType string, payload interface{}) {
	if s.cloudClient == nil {
		return
	}
	if err := s.cloudClient.PushEvent(eventType, payload); err != nil {
		fmt.Fprintf(os.Stderr, "cloud: failed to push event: %v\n", err)
	}
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

	// API endpoint: SSE events
	mux.HandleFunc("/api/events", s.handleSSE)

	// API endpoint: board info (repo name, epics)
	mux.HandleFunc("/api/info", s.handleInfo)

	// API endpoint: activity feed
	mux.HandleFunc("/api/activity", s.handleActivity)

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

	// Start file watcher for .tick/issues directory
	issuesDir := filepath.Join(s.tickDir, "issues")
	if err := s.watcher.Add(issuesDir); err != nil {
		return fmt.Errorf("failed to watch issues directory: %w", err)
	}

	// Watch activity directory for changes
	activityDir := filepath.Join(s.tickDir, "activity")
	os.MkdirAll(activityDir, 0o755) // Ensure it exists
	if err := s.watcher.Add(activityDir); err != nil {
		// Non-fatal: activity watching is optional
		fmt.Fprintf(os.Stderr, "warning: failed to watch activity directory: %v\n", err)
	}

	// Start watching for file changes
	go s.watchFiles(ctx)

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
		s.watcher.Close()
		return s.srv.Shutdown(shutdownCtx)
	case err := <-errChan:
		s.watcher.Close()
		return err
	}
}

// TickDir returns the path to the .tick directory being served.
func (s *Server) TickDir() string {
	return s.tickDir
}

// handleSSE handles GET /api/events for Server-Sent Events.
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create channel for this client
	clientChan := make(chan string, 10)

	// Register client
	s.sseClientsMu.Lock()
	s.sseClients[clientChan] = struct{}{}
	s.sseClientsMu.Unlock()

	// Unregister on disconnect
	defer func() {
		s.sseClientsMu.Lock()
		delete(s.sseClients, clientChan)
		close(clientChan)
		s.sseClientsMu.Unlock()
	}()

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Send initial connection message
	fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
	flusher.Flush()

	// Stream events to client
	for {
		select {
		case <-r.Context().Done():
			return
		case msg, ok := <-clientChan:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: update\ndata: %s\n\n", msg)
			flusher.Flush()
		}
	}
}

// broadcast sends a message to all connected SSE clients.
func (s *Server) broadcast(msg string) {
	s.sseClientsMu.RLock()
	defer s.sseClientsMu.RUnlock()

	for clientChan := range s.sseClients {
		select {
		case clientChan <- msg:
		default:
			// Client buffer full, skip
		}
	}
}

// watchFiles watches the issues directory for changes and broadcasts updates.
func (s *Server) watchFiles(ctx context.Context) {
	// Separate debounce timers for activity and tick events
	var activityTimer *time.Timer
	var tickTimer *time.Timer
	debounceDelay := 100 * time.Millisecond

	// Track the last tick event for the closure
	var lastTickEvent fsnotify.Event

	for {
		select {
		case <-ctx.Done():
			if activityTimer != nil {
				activityTimer.Stop()
			}
			if tickTimer != nil {
				tickTimer.Stop()
			}
			return
		case event, ok := <-s.watcher.Events:
			if !ok {
				return
			}

			// Handle activity log changes
			if strings.HasSuffix(event.Name, "activity.jsonl") {
				// Debounce activity updates
				if activityTimer != nil {
					activityTimer.Stop()
				}
				activityTimer = time.AfterFunc(debounceDelay, func() {
					s.broadcast(`{"type":"activity"}`)
					s.pushCloudEvent("update", map[string]string{"type": "activity"})
				})
				continue
			}

			// Only care about .json files for tick changes
			if !strings.HasSuffix(event.Name, ".json") {
				continue
			}

			// Capture event for closure
			lastTickEvent = event

			// Debounce tick changes
			if tickTimer != nil {
				tickTimer.Stop()
			}
			tickTimer = time.AfterFunc(debounceDelay, func() {
				// Determine event type
				eventType := "update"
				if lastTickEvent.Op&fsnotify.Create == fsnotify.Create {
					eventType = "create"
				} else if lastTickEvent.Op&fsnotify.Remove == fsnotify.Remove {
					eventType = "delete"
				}

				// Extract tick ID from filename
				tickID := strings.TrimSuffix(filepath.Base(lastTickEvent.Name), ".json")

				// Broadcast the change locally
				msg := fmt.Sprintf(`{"type":"%s","tickId":"%s"}`, eventType, tickID)
				s.broadcast(msg)

				// Push to cloud
				s.pushCloudEvent("update", map[string]string{"type": eventType, "tickId": tickID})
			})

		case err, ok := <-s.watcher.Errors:
			if !ok {
				return
			}
			// Log error but continue
			fmt.Fprintf(os.Stderr, "file watcher error: %v\n", err)
		}
	}
}

// EpicInfo represents an epic for the filter dropdown.
type EpicInfo struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// InfoResponse is the response body for GET /api/info.
type InfoResponse struct {
	RepoName string     `json:"repoName"`
	Epics    []EpicInfo `json:"epics"`
}

// handleInfo handles GET /api/info.
func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get repo name from parent of .tick directory
	repoName := filepath.Base(filepath.Dir(s.tickDir))
	if repoName == "." || repoName == "/" {
		repoName = "Tick Board"
	}

	// Load all ticks to find epics
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load ticks: %v", err), http.StatusInternalServerError)
		return
	}

	// Filter for open epics
	var epics []EpicInfo
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic && t.Status == tick.StatusOpen {
			epics = append(epics, EpicInfo{
				ID:    t.ID,
				Title: t.Title,
			})
		}
	}

	response := InfoResponse{
		RepoName: repoName,
		Epics:    epics,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ActivityResponse is the response body for GET /api/activity.
type ActivityResponse struct {
	Activities []tick.Activity `json:"activities"`
}

// handleActivity handles GET /api/activity.
func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse limit from query params (default 50)
	limit := 50
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := fmt.Sscanf(limitParam, "%d", &limit); err != nil || l != 1 {
			limit = 50
		}
		if limit > 200 {
			limit = 200 // Cap at 200
		}
	}

	// Read activity log
	store := tick.NewStore(s.tickDir)
	activities, err := store.ReadActivity(limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read activity: %v", err), http.StatusInternalServerError)
		return
	}

	// Reverse to show most recent first
	for i, j := 0, len(activities)-1; i < j; i, j = i+1, j-1 {
		activities[i], activities[j] = activities[j], activities[i]
	}

	response := ActivityResponse{
		Activities: activities,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Column represents kanban board columns.
const (
	ColumnBlocked = "blocked"
	ColumnReady   = "ready"
	ColumnAgent   = "agent"
	ColumnHuman   = "human"
	ColumnDone    = "done"
)

// TickResponse is a tick with computed fields for the API response.
type TickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
}

// Note represents a parsed note entry.
type Note struct {
	Timestamp string `json:"timestamp,omitempty"`
	Author    string `json:"author,omitempty"`
	Text      string `json:"text"`
}

// BlockerDetail contains information about a blocker tick.
type BlockerDetail struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

// GetTickResponse is the response body for GET /api/ticks/:id.
type GetTickResponse struct {
	tick.Tick
	IsBlocked      bool            `json:"isBlocked"`
	Column         string          `json:"column"`
	NotesList      []Note          `json:"notesList"`
	BlockerDetails []BlockerDetail `json:"blockerDetails"`
}

// ListTicksResponse is the response body for GET /api/ticks.
type ListTicksResponse struct {
	Ticks []TickResponse `json:"ticks"`
}

// handleListTicks handles GET /api/ticks with query filters and POST /api/ticks for creating.
func (s *Server) handleListTicks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListTicksGet(w, r)
	case http.MethodPost:
		s.handleCreateTick(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleListTicksGet handles GET /api/ticks with query filters.
func (s *Server) handleListTicksGet(w http.ResponseWriter, r *http.Request) {

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
//   - blocked: open + has open blockers
//   - ready: open + unblocked + !awaiting (includes rejected+open, so agent can retry)
//   - agent: in_progress + !awaiting
//   - human: any awaiting type (approval,review,content,work,input,escalation,checkpoint)
//   - done: closed
func computeColumn(t tick.Tick, isBlocked bool) string {
	// done: closed
	if t.Status == tick.StatusClosed {
		return ColumnDone
	}

	// Get awaiting type (handles legacy Manual field)
	awaitingType := t.GetAwaitingType()

	// human: any awaiting type
	if awaitingType != "" {
		return ColumnHuman
	}

	// agent: in_progress + !awaiting
	if t.Status == tick.StatusInProgress {
		return ColumnAgent
	}

	// blocked: open + has open blockers
	if isBlocked {
		return ColumnBlocked
	}

	// ready: open + unblocked + !awaiting (all priorities)
	// Note: Rejected+open ticks also go here so agent can see feedback and retry
	return ColumnReady
}

// parseNotes parses the Notes string into a slice of Note structs.
// Notes format: "YYYY-MM-DD HH:MM - (from: author) text" or just "text"
func parseNotes(notes string) []Note {
	if notes == "" {
		return []Note{}
	}

	var result []Note
	lines := strings.Split(notes, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		note := Note{Text: line}

		// Try to parse timestamp: "YYYY-MM-DD HH:MM - "
		if len(line) >= 18 && line[4] == '-' && line[7] == '-' && line[10] == ' ' && line[13] == ':' {
			// Check for " - " separator after timestamp
			if idx := strings.Index(line[16:], " - "); idx != -1 {
				note.Timestamp = line[:16]
				remainder := line[16+idx+3:] // Skip " - "

				// Try to parse author: "(from: author) "
				if strings.HasPrefix(remainder, "(from: ") {
					if endIdx := strings.Index(remainder, ") "); endIdx != -1 {
						note.Author = remainder[7:endIdx]
						note.Text = remainder[endIdx+2:]
					} else {
						note.Text = remainder
					}
				} else {
					note.Text = remainder
				}
			}
		}

		result = append(result, note)
	}

	return result
}

// handleTickActions routes requests to /api/ticks/:id and /api/ticks/:id/action endpoints.
func (s *Server) handleTickActions(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/ticks/:id or /api/ticks/:id/action
	path := strings.TrimPrefix(r.URL.Path, "/api/ticks/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}

	tickID := parts[0]

	// GET /api/ticks/:id - get single tick
	// PATCH /api/ticks/:id - update tick fields
	if len(parts) == 1 {
		if r.Method == http.MethodPatch {
			s.handleUpdateTick(w, r, tickID)
			return
		}
		s.handleGetTick(w, r, tickID)
		return
	}

	// /api/ticks/:id/action
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}

	action := parts[1]

	switch action {
	case "approve":
		s.handleApproveTick(w, r, tickID)
	case "reject":
		s.handleRejectTick(w, r, tickID)
	case "note":
		s.handleAddNote(w, r, tickID)
	case "close":
		s.handleCloseTick(w, r, tickID)
	default:
		http.NotFound(w, r)
	}
}

// handleGetTick handles GET /api/ticks/:id.
func (s *Server) handleGetTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if r.Method != http.MethodGet {
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

	// Load all ticks for blocked calculation and blocker details
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load ticks: %v", err), http.StatusInternalServerError)
		return
	}

	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, tk := range allTicks {
		tickIndex[tk.ID] = tk
	}

	// Compute isBlocked and column
	isBlocked := computeIsBlocked(t, tickIndex)
	column := computeColumn(t, isBlocked)

	// Parse notes
	notesList := parseNotes(t.Notes)

	// Build blocker details
	blockerDetails := make([]BlockerDetail, 0, len(t.BlockedBy))
	for _, blockerID := range t.BlockedBy {
		if blocker, ok := tickIndex[blockerID]; ok {
			blockerDetails = append(blockerDetails, BlockerDetail{
				ID:     blocker.ID,
				Title:  blocker.Title,
				Status: blocker.Status,
			})
		} else {
			// Include missing blockers with unknown status
			blockerDetails = append(blockerDetails, BlockerDetail{
				ID:     blockerID,
				Title:  "(not found)",
				Status: "unknown",
			})
		}
	}

	response := GetTickResponse{
		Tick:           t,
		IsBlocked:      isBlocked,
		Column:         column,
		NotesList:      notesList,
		BlockerDetails: blockerDetails,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// ApproveTickResponse is the response body for POST /api/ticks/:id/approve.
type ApproveTickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
	Closed    bool   `json:"closed"`
}

// RejectTickRequest is the request body for POST /api/ticks/:id/reject.
type RejectTickRequest struct {
	Feedback string `json:"feedback"`
}

// AddNoteRequest is the request body for POST /api/ticks/:id/note.
type AddNoteRequest struct {
	Message string `json:"message"`
}

// AddNoteResponse is the response body for POST /api/ticks/:id/note.
type AddNoteResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
	NotesList []Note `json:"notesList"`
}

// RejectTickResponse is the response body for POST /api/ticks/:id/reject.
type RejectTickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
	Closed    bool   `json:"closed"`
}

// UpdateTickRequest is the request body for PATCH /api/ticks/:id.
type UpdateTickRequest struct {
	Priority *int    `json:"priority,omitempty"`
	Type     *string `json:"type,omitempty"`
	Parent   *string `json:"parent,omitempty"`
	Owner    *string `json:"owner,omitempty"`
	Requires *string `json:"requires,omitempty"`
}

// CloseTickRequest is the request body for POST /api/ticks/:id/close.
type CloseTickRequest struct {
	Reason string `json:"reason,omitempty"`
}

// CloseTickResponse is the response body for POST /api/ticks/:id/close.
type CloseTickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
}

// CreateTickRequest is the request body for POST /api/ticks.
type CreateTickRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description,omitempty"`
	Type        string  `json:"type,omitempty"`
	Priority    *int    `json:"priority,omitempty"`
	Parent      string  `json:"parent,omitempty"`
	Requires    *string `json:"requires,omitempty"`
}

// CreateTickResponse is the response body for POST /api/ticks.
type CreateTickResponse struct {
	tick.Tick
	IsBlocked bool   `json:"isBlocked"`
	Column    string `json:"column"`
}

// getGitUser returns the git user name, or "human" if not available.
func getGitUser() string {
	cmd := exec.Command("git", "config", "user.name")
	out, err := cmd.Output()
	if err != nil {
		return "human"
	}
	name := strings.TrimSpace(string(out))
	if name == "" {
		return "human"
	}
	return name
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

	// Add approval note with git user
	gitUser := getGitUser()
	note := fmt.Sprintf("%s - (from: %s) Approved", time.Now().Format("2006-01-02 15:04"), gitUser)
	if t.Notes != "" {
		t.Notes = t.Notes + "\n" + note
	} else {
		t.Notes = note
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

// handleRejectTick handles POST /api/ticks/:id/reject.
func (s *Server) handleRejectTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req RejectTickRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate feedback is provided
	if strings.TrimSpace(req.Feedback) == "" {
		http.Error(w, "feedback is required", http.StatusBadRequest)
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
	if t.Manual && t.Awaiting == nil {
		t.SetAwaiting(tick.AwaitingWork)
	}

	// Add feedback as note with git user
	gitUser := getGitUser()
	note := fmt.Sprintf("%s - (from: %s) Rejected: %s", time.Now().Format("2006-01-02 15:04"), gitUser, req.Feedback)
	if t.Notes != "" {
		t.Notes = t.Notes + "\n" + note
	} else {
		t.Notes = note
	}

	// Set verdict to rejected
	verdict := tick.VerdictRejected
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
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		// Non-fatal: return tick without computed fields
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RejectTickResponse{
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

	response := RejectTickResponse{
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

// handleAddNote handles POST /api/ticks/:id/note.
func (s *Server) handleAddNote(w http.ResponseWriter, r *http.Request, tickID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req AddNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate message is provided
	if req.Message == "" {
		http.Error(w, "message field is required", http.StatusBadRequest)
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

	// Add timestamped note
	note := fmt.Sprintf("%s - (from: human) %s", time.Now().Format("2006-01-02 15:04"), req.Message)
	if t.Notes != "" {
		t.Notes = t.Notes + "\n" + note
	} else {
		t.Notes = note
	}
	t.UpdatedAt = time.Now()

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
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		// Non-fatal: return tick without computed fields but with notesList
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AddNoteResponse{Tick: t, NotesList: parseNotes(t.Notes)})
		return
	}

	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, tk := range allTicks {
		tickIndex[tk.ID] = tk
	}

	isBlocked := computeIsBlocked(t, tickIndex)
	column := computeColumn(t, isBlocked)
	notesList := parseNotes(t.Notes)

	response := AddNoteResponse{
		Tick:      t,
		IsBlocked: isBlocked,
		Column:    column,
		NotesList: notesList,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// handleUpdateTick handles PATCH /api/ticks/:id.
func (s *Server) handleUpdateTick(w http.ResponseWriter, r *http.Request, tickID string) {
	// Parse request body
	var req UpdateTickRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
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

	// Cannot edit closed ticks
	if t.Status == tick.StatusClosed {
		http.Error(w, "Cannot edit closed tick", http.StatusBadRequest)
		return
	}

	// Cannot edit in_progress ticks (agent working)
	if t.Status == tick.StatusInProgress {
		http.Error(w, "Cannot edit tick while agent is working", http.StatusBadRequest)
		return
	}

	// Apply updates
	if req.Priority != nil {
		t.Priority = *req.Priority
	}
	if req.Type != nil {
		t.Type = *req.Type
	}
	if req.Parent != nil {
		t.Parent = *req.Parent
	}
	if req.Owner != nil {
		t.Owner = *req.Owner
	}
	if req.Requires != nil {
		if *req.Requires == "" {
			t.Requires = nil
		} else {
			t.Requires = req.Requires
		}
	}

	t.UpdatedAt = time.Now()

	// Validate the updated tick
	if err := t.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid tick: %v", err), http.StatusBadRequest)
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
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GetTickResponse{Tick: t})
		return
	}

	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, tk := range allTicks {
		tickIndex[tk.ID] = tk
	}

	isBlocked := computeIsBlocked(t, tickIndex)
	column := computeColumn(t, isBlocked)
	notesList := parseNotes(t.Notes)

	// Build blocker details
	blockerDetails := make([]BlockerDetail, 0, len(t.BlockedBy))
	for _, blockerID := range t.BlockedBy {
		if blocker, ok := tickIndex[blockerID]; ok {
			blockerDetails = append(blockerDetails, BlockerDetail{
				ID:     blocker.ID,
				Title:  blocker.Title,
				Status: blocker.Status,
			})
		}
	}

	response := GetTickResponse{
		Tick:           t,
		IsBlocked:      isBlocked,
		Column:         column,
		NotesList:      notesList,
		BlockerDetails: blockerDetails,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleCloseTick handles POST /api/ticks/:id/close.
func (s *Server) handleCloseTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body (optional reason)
	var req CloseTickRequest
	if r.Body != nil {
		json.NewDecoder(r.Body).Decode(&req) // Ignore errors - reason is optional
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

	// Cannot close already closed ticks
	if t.Status == tick.StatusClosed {
		http.Error(w, "Tick is already closed", http.StatusBadRequest)
		return
	}

	// Cannot close ticks with requires gate (must use approve/reject)
	if t.Requires != nil && *t.Requires != "" {
		http.Error(w, "Tick has a workflow gate - use approve/reject instead", http.StatusBadRequest)
		return
	}

	// Cannot close in_progress ticks (agent working)
	if t.Status == tick.StatusInProgress {
		http.Error(w, "Cannot close tick while agent is working", http.StatusBadRequest)
		return
	}

	// Close the tick
	t.Status = tick.StatusClosed
	now := time.Now()
	t.ClosedAt = &now
	t.UpdatedAt = now
	if req.Reason != "" {
		t.ClosedReason = req.Reason
	}

	// Add close note
	gitUser := getGitUser()
	noteText := "Closed"
	if req.Reason != "" {
		noteText = fmt.Sprintf("Closed: %s", req.Reason)
	}
	note := fmt.Sprintf("%s - (from: %s) %s", now.Format("2006-01-02 15:04"), gitUser, noteText)
	if t.Notes != "" {
		t.Notes = t.Notes + "\n" + note
	} else {
		t.Notes = note
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

	// Build response
	response := CloseTickResponse{
		Tick:      t,
		IsBlocked: false,
		Column:    ColumnDone,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleCreateTick(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req CreateTickRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required field: title
	if strings.TrimSpace(req.Title) == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	// Set defaults
	tickType := tick.TypeTask
	if req.Type != "" {
		tickType = req.Type
	}

	priority := 2 // default medium priority
	if req.Priority != nil {
		priority = *req.Priority
	}

	// Create store for ID generation and saving
	store := tick.NewStore(s.tickDir)

	// Load existing tick IDs to check for collisions
	existingTicks, err := store.List()
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("Failed to load existing ticks: %v", err), http.StatusInternalServerError)
		return
	}
	existingIDs := make(map[string]bool, len(existingTicks))
	for _, t := range existingTicks {
		existingIDs[t.ID] = true
	}

	// Generate unique ID
	idGen := tick.NewIDGenerator(nil)
	newID, _, err := idGen.Generate(func(id string) bool {
		return existingIDs[id]
	}, 3)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate tick ID: %v", err), http.StatusInternalServerError)
		return
	}

	// Create the tick
	now := time.Now()
	newTick := tick.Tick{
		ID:          newID,
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Status:      tick.StatusOpen,
		Priority:    priority,
		Type:        tickType,
		Owner:       "tickboard",
		CreatedBy:   "tickboard",
		CreatedAt:   now,
		UpdatedAt:   now,
		Parent:      req.Parent,
		Requires:    req.Requires,
	}

	// Validate the tick
	if err := newTick.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid tick: %v", err), http.StatusBadRequest)
		return
	}

	// Save the tick
	if err := store.Write(newTick); err != nil {
		http.Error(w, fmt.Sprintf("Failed to save tick: %v", err), http.StatusInternalServerError)
		return
	}

	// Build response with computed fields
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		// Non-fatal: return tick without computed fields
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(CreateTickResponse{Tick: newTick})
		return
	}

	tickIndex := make(map[string]tick.Tick, len(allTicks))
	for _, tk := range allTicks {
		tickIndex[tk.ID] = tk
	}

	isBlocked := computeIsBlocked(newTick, tickIndex)
	column := computeColumn(newTick, isBlocked)

	response := CreateTickResponse{
		Tick:      newTick,
		IsBlocked: isBlocked,
		Column:    column,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}
