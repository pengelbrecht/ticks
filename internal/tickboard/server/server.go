package server

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
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
	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tick"
)

//go:embed static/*
var staticFS embed.FS

// EventPusher interface for cloud event broadcasting.
type EventPusher interface {
	PushEvent(eventType string, payload interface{}) error
}

// RunEventPusher interface for pushing run events to cloud (sync mode).
type RunEventPusher interface {
	SendRunEvent(event RunEventMessage) error
}

// RunEventMessage for cloud sync (matches cloud.RunEventMessage).
type RunEventMessage struct {
	Type   string       `json:"type"`
	EpicID string       `json:"epicId"`
	TaskID string       `json:"taskId,omitempty"`
	Source string       `json:"source"`
	Event  RunEventData `json:"event"`
}

// RunEventData contains the details of a run event.
type RunEventData struct {
	Type       string           `json:"type"`
	Output     string           `json:"output,omitempty"`
	Status     string           `json:"status,omitempty"`
	NumTurns   int              `json:"numTurns,omitempty"`
	Iteration  int              `json:"iteration,omitempty"`
	Success    bool             `json:"success,omitempty"`
	Metrics    *RunEventMetrics `json:"metrics,omitempty"`
	ActiveTool *RunEventTool    `json:"activeTool,omitempty"`
	Message    string           `json:"message,omitempty"`
	Timestamp  string           `json:"timestamp"`
}

// RunEventMetrics contains cost and token metrics.
type RunEventMetrics struct {
	InputTokens         int     `json:"inputTokens"`
	OutputTokens        int     `json:"outputTokens"`
	CacheReadTokens     int     `json:"cacheReadTokens"`
	CacheCreationTokens int     `json:"cacheCreationTokens"`
	CostUSD             float64 `json:"costUsd"`
	DurationMS          int64   `json:"durationMs"`
}

// RunEventTool contains info about an active tool.
type RunEventTool struct {
	Name     string `json:"name"`
	Input    string `json:"input,omitempty"`
	Duration int64  `json:"duration,omitempty"`
}

// Server represents the ticks board HTTP server.
type Server struct {
	tickDir string
	port    int
	devMode bool // serve UI from disk instead of embedded
	srv     *http.Server

	// SSE client management
	sseClients   map[chan string]struct{}
	sseClientsMu sync.RWMutex

	// Run stream SSE clients (per epic)
	runStreamClients   map[string]map[chan RunStreamEvent]struct{}
	runStreamClientsMu sync.RWMutex

	// File watcher
	watcher *fsnotify.Watcher

	// Separate watcher for records directory (run streaming)
	recordsWatcher *fsnotify.Watcher

	// Cloud client for event broadcasting
	cloudClient EventPusher
}

// RunStreamEvent represents an SSE event for run streaming.
type RunStreamEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// ServerOption configures the server.
type ServerOption func(*Server)

// WithDevMode enables dev mode, serving UI from disk instead of embedded.
func WithDevMode(enabled bool) ServerOption {
	return func(s *Server) {
		s.devMode = enabled
	}
}

// New creates a new ticks board server.
func New(tickDir string, port int, opts ...ServerOption) (*Server, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create file watcher: %w", err)
	}

	recordsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		watcher.Close()
		return nil, fmt.Errorf("failed to create records watcher: %w", err)
	}

	s := &Server{
		tickDir:          tickDir,
		port:             port,
		sseClients:       make(map[chan string]struct{}),
		runStreamClients: make(map[string]map[chan RunStreamEvent]struct{}),
		watcher:          watcher,
		recordsWatcher:   recordsWatcher,
	}

	for _, opt := range opts {
		opt(s)
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

// uiDir returns the path to the UI dist directory for dev mode.
func (s *Server) uiDir() string {
	repoRoot := filepath.Dir(s.tickDir)
	return filepath.Join(repoRoot, "internal", "tickboard", "ui", "dist")
}

// readUIFile reads a file from the UI, either from disk (dev) or embedded (release).
func (s *Server) readUIFile(path string) ([]byte, error) {
	if s.devMode {
		return os.ReadFile(filepath.Join(s.uiDir(), path))
	}
	return staticFS.ReadFile("static/" + path)
}

// Run starts the HTTP server and blocks until the context is cancelled.
func (s *Server) Run(ctx context.Context) error {
	mux := http.NewServeMux()

	if s.devMode {
		// Dev mode: serve from disk for hot reload
		uiDir := s.uiDir()
		fmt.Fprintf(os.Stderr, "Dev mode: serving UI from %s\n", uiDir)

		mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(filepath.Join(uiDir, "assets")))))
		mux.Handle("/shoelace/", http.StripPrefix("/shoelace/", http.FileServer(http.Dir(filepath.Join(uiDir, "shoelace")))))
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(uiDir))))
	} else {
		// Release mode: serve from embedded filesystem
		staticContent, err := fs.Sub(staticFS, "static")
		if err != nil {
			return fmt.Errorf("failed to access static files: %w", err)
		}

		// Serve Vite-bundled assets at /assets/ (JS/CSS bundles with hashed names)
		assetsContent, err := fs.Sub(staticFS, "static/assets")
		if err != nil {
			return fmt.Errorf("failed to access assets files: %w", err)
		}
		mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.FS(assetsContent))))

		// Serve Shoelace icons at /shoelace/ (used by Shoelace components)
		shoelaceContent, err := fs.Sub(staticFS, "static/shoelace")
		if err != nil {
			return fmt.Errorf("failed to access shoelace files: %w", err)
		}
		mux.Handle("/shoelace/", http.StripPrefix("/shoelace/", http.FileServer(http.FS(shoelaceContent))))

		// Serve remaining static files (PWA assets, favicons) at /static/
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticContent))))
	}

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

	// API endpoint: run records
	mux.HandleFunc("/api/records/", s.handleRecords)

	// API endpoint: run status for an epic
	mux.HandleFunc("/api/run-status/", s.handleRunStatus)

	// API endpoint: SSE stream for run updates
	mux.HandleFunc("/api/run-stream/", s.handleRunStream)

	// API endpoint: context documents
	mux.HandleFunc("/api/context/", s.handleContext)

	// Root handler - serve index.html and PWA assets at root paths
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Serve index.html for root path
		if path == "/" {
			data, err := s.readUIFile("index.html")
			if err != nil {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(data)
			return
		}

		// Serve PWA and favicon files from root paths
		// These files are commonly requested at root level by browsers
		rootFiles := map[string]string{
			"/manifest.json":        "application/manifest+json",
			"/sw.js":                "application/javascript",
			"/favicon.ico":          "image/x-icon",
			"/favicon.svg":          "image/svg+xml",
			"/favicon-16x16.png":    "image/png",
			"/favicon-32x32.png":    "image/png",
			"/apple-touch-icon.png": "image/png",
			"/icon.svg":             "image/svg+xml",
			"/icon-192.png":         "image/png",
			"/icon-512.png":         "image/png",
			"/icon-maskable.svg":    "image/svg+xml",
			"/icon-maskable-192.png": "image/png",
			"/icon-maskable-512.png": "image/png",
		}

		if contentType, ok := rootFiles[path]; ok {
			data, err := s.readUIFile(path[1:]) // strip leading /
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", contentType)
			w.Write(data)
			return
		}

		http.NotFound(w, r)
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

	// Watch records directory for run streaming
	recordsDir := filepath.Join(s.tickDir, "logs", "records")
	os.MkdirAll(recordsDir, 0o755) // Ensure it exists
	if err := s.recordsWatcher.Add(recordsDir); err != nil {
		// Non-fatal: records watching is optional
		fmt.Fprintf(os.Stderr, "warning: failed to watch records directory: %v\n", err)
	}

	// Start watching for file changes
	go s.watchFiles(ctx)

	// Start watching for records changes (run streaming)
	go s.watchRecords(ctx)

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
		s.recordsWatcher.Close()
		return s.srv.Shutdown(shutdownCtx)
	case err := <-errChan:
		s.watcher.Close()
		s.recordsWatcher.Close()
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

// getRepoName returns the full repo name in format "owner/repo[:worktree]".
// Falls back to directory name if git info is unavailable.
func (s *Server) getRepoName() string {
	repoDir := filepath.Dir(s.tickDir)

	// Try to get the remote URL
	cmd := exec.Command("git", "-C", repoDir, "remote", "get-url", "origin")
	out, err := cmd.Output()
	if err != nil {
		// Fallback to directory name
		name := filepath.Base(repoDir)
		if name == "." || name == "/" {
			return "Tick Board"
		}
		return name
	}

	// Parse the remote URL to extract owner/repo
	remoteURL := strings.TrimSpace(string(out))
	repoName := parseGitRemote(remoteURL)
	if repoName == "" {
		name := filepath.Base(repoDir)
		if name == "." || name == "/" {
			return "Tick Board"
		}
		return name
	}

	// Check if this is a worktree
	cmd = exec.Command("git", "-C", repoDir, "rev-parse", "--show-toplevel")
	topLevel, err := cmd.Output()
	if err == nil {
		topLevelDir := strings.TrimSpace(string(topLevel))
		currentBase := filepath.Base(repoDir)
		topBase := filepath.Base(topLevelDir)
		// If the current directory name differs from the repo root, it's a worktree
		if currentBase != topBase && topLevelDir != repoDir {
			repoName = repoName + ":" + currentBase
		}
	}

	return repoName
}

// parseGitRemote extracts "owner/repo" from a git remote URL.
// Supports HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git).
func parseGitRemote(remoteURL string) string {
	// Remove trailing .git
	remoteURL = strings.TrimSuffix(remoteURL, ".git")

	var ownerRepo string

	// SSH format: git@github.com:owner/repo
	if strings.HasPrefix(remoteURL, "git@") {
		// Extract the path after the ":"
		parts := strings.SplitN(remoteURL, ":", 2)
		if len(parts) == 2 {
			ownerRepo = parts[1]
		}
	}

	// HTTPS format: https://github.com/owner/repo
	if ownerRepo == "" && strings.Contains(remoteURL, "://") {
		// Parse URL and extract path
		parts := strings.SplitN(remoteURL, "://", 2)
		if len(parts) == 2 {
			hostPath := parts[1]
			// Remove host
			slashIdx := strings.Index(hostPath, "/")
			if slashIdx != -1 {
				ownerRepo = hostPath[slashIdx+1:]
			}
		}
	}

	if ownerRepo == "" {
		return ""
	}

	return ownerRepo
}

// handleInfo handles GET /api/info.
func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get full repo name from git
	repoName := s.getRepoName()

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

// handleRecords routes requests to /api/records/:tickId.
func (s *Server) handleRecords(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/records/:tickId
	path := strings.TrimPrefix(r.URL.Path, "/api/records/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	// Remove any trailing slash
	tickID := strings.TrimSuffix(path, "/")
	if tickID == "" {
		http.NotFound(w, r)
		return
	}

	// Only GET method is supported
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get the run record
	store := runrecord.NewStore(filepath.Dir(s.tickDir))
	record, err := store.Read(tickID)
	if err != nil {
		if errors.Is(err, runrecord.ErrNotFound) {
			http.Error(w, "Run record not found", http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to read run record: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

// RunStatusResponse is the response body for GET /api/run-status/:epicId.
type RunStatusResponse struct {
	EpicID     string                  `json:"epicId"`
	IsRunning  bool                    `json:"isRunning"`
	ActiveTask *ActiveTaskStatus       `json:"activeTask,omitempty"`
	Metrics    *runrecord.LiveRecord   `json:"metrics,omitempty"`
}

// ActiveTaskStatus contains information about the currently active task.
type ActiveTaskStatus struct {
	TickID      string                   `json:"tickId"`
	Title       string                   `json:"title"`
	Status      string                   `json:"status"`
	ActiveTool  *agent.ToolRecord        `json:"activeTool,omitempty"`
	NumTurns    int                      `json:"numTurns"`
	Metrics     agent.MetricsRecord      `json:"metrics"`
	LastUpdated string                   `json:"lastUpdated"`
}

// handleRunStatus handles GET /api/run-status/:epicId.
func (s *Server) handleRunStatus(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/run-status/:epicId
	path := strings.TrimPrefix(r.URL.Path, "/api/run-status/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	// Remove any trailing slash
	epicID := strings.TrimSuffix(path, "/")
	if epicID == "" {
		http.NotFound(w, r)
		return
	}

	// Only GET method is supported
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Load all ticks to find tasks in this epic
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load ticks: %v", err), http.StatusInternalServerError)
		return
	}

	// Verify the epic exists
	epicExists := false
	for _, t := range allTicks {
		if t.ID == epicID && t.Type == tick.TypeEpic {
			epicExists = true
			break
		}
	}
	if !epicExists {
		http.Error(w, "Epic not found", http.StatusNotFound)
		return
	}

	// Filter tasks belonging to this epic
	var epicTasks []tick.Tick
	for _, t := range allTicks {
		if t.Parent == epicID {
			epicTasks = append(epicTasks, t)
		}
	}

	// Check for live records for any of the epic's tasks
	store := runrecord.NewStore(filepath.Dir(s.tickDir))
	response := RunStatusResponse{
		EpicID:    epicID,
		IsRunning: false,
	}

	// Look for active runs by checking .live.json files
	for _, t := range epicTasks {
		if store.LiveExists(t.ID) {
			liveRecord, err := store.ReadLive(t.ID)
			if err != nil {
				continue // Skip if we can't read
			}

			response.IsRunning = true
			response.Metrics = liveRecord
			response.ActiveTask = &ActiveTaskStatus{
				TickID:      t.ID,
				Title:       t.Title,
				Status:      liveRecord.Status,
				ActiveTool:  liveRecord.ActiveTool,
				NumTurns:    liveRecord.NumTurns,
				Metrics:     liveRecord.Metrics,
				LastUpdated: liveRecord.LastUpdated.Format("2006-01-02T15:04:05Z07:00"),
			}
			break // Only one task can be active at a time
		}
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
	IsBlocked          bool    `json:"isBlocked"`
	Column             string  `json:"column"`
	VerificationStatus *string `json:"verificationStatus,omitempty"` // "verified", "failed", "pending", or nil
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

	// Create runrecord store for verification status lookup
	recordStore := runrecord.NewStore(filepath.Dir(s.tickDir))

	// Build response with computed fields
	response := ListTicksResponse{
		Ticks: make([]TickResponse, 0, len(filtered)),
	}

	for _, t := range filtered {
		isBlocked := computeIsBlocked(t, tickIndex)
		column := computeColumn(t, isBlocked)
		verificationStatus := computeVerificationStatus(t, recordStore)

		response.Ticks = append(response.Ticks, TickResponse{
			Tick:               t,
			IsBlocked:          isBlocked,
			Column:             column,
			VerificationStatus: verificationStatus,
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

// computeVerificationStatus returns the verification status for a tick.
// Returns nil for non-tasks or open tasks.
// Returns "verified", "failed", or "pending" for closed tasks based on run record.
func computeVerificationStatus(t tick.Tick, store *runrecord.Store) *string {
	// Only show verification for tasks
	if t.Type != tick.TypeTask {
		return nil
	}

	// Only show verification for closed tasks (verification runs on task close)
	if t.Status != tick.StatusClosed {
		return nil
	}

	// Try to read run record
	record, err := store.Read(t.ID)
	if err != nil || record == nil {
		// No run record - verification pending or not run
		pending := "pending"
		return &pending
	}

	// Check verification results
	if record.Verification == nil {
		// Has run record but no verification results - pending
		pending := "pending"
		return &pending
	}

	if record.Verification.AllPassed {
		verified := "verified"
		return &verified
	}

	failed := "failed"
	return &failed
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
	case "reopen":
		s.handleReopenTick(w, r, tickID)
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

// handleReopenTick handles POST /api/ticks/:id/reopen.
func (s *Server) handleReopenTick(w http.ResponseWriter, r *http.Request, tickID string) {
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

	// Can only reopen closed ticks
	if t.Status != tick.StatusClosed {
		http.Error(w, "Tick is not closed", http.StatusBadRequest)
		return
	}

	// Reopen the tick
	t.Status = tick.StatusOpen
	t.ClosedAt = nil
	t.ClosedReason = ""
	now := time.Now()
	t.UpdatedAt = now

	// Clear any verdict/awaiting state from workflow
	t.Awaiting = nil
	t.Verdict = nil

	// Add reopen note
	gitUser := getGitUser()
	note := fmt.Sprintf("%s - (from: %s) Reopened", now.Format("2006-01-02 15:04"), gitUser)
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
	response := map[string]interface{}{
		"tick":   t,
		"column": ColumnReady,
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
		Owner:       "ticks-board",
		CreatedBy:   "ticks-board",
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

// RunStreamEventData contains the event data for run stream SSE events.
type RunStreamEventData struct {
	TaskID     string                   `json:"taskId,omitempty"`
	EpicID     string                   `json:"epicId,omitempty"`
	Iteration  int                      `json:"iteration,omitempty"`
	Delta      string                   `json:"delta,omitempty"`
	Timestamp  string                   `json:"timestamp,omitempty"`
	Tool       *agent.ToolRecord        `json:"tool,omitempty"`
	Status     string                   `json:"status,omitempty"`
	Success    bool                     `json:"success,omitempty"`
	Metrics    *agent.MetricsRecord     `json:"metrics,omitempty"`
	Output     string                   `json:"output,omitempty"`
	NumTurns   int                      `json:"numTurns,omitempty"`
	ActiveTool *agent.ToolRecord        `json:"activeTool,omitempty"`
	Message    string                   `json:"message,omitempty"`    // Human-readable status message (for context events)
	TaskCount  int                      `json:"taskCount,omitempty"`  // Number of tasks (for context_generating)
	TokenCount int                      `json:"tokenCount,omitempty"` // Estimated token count (for context_generated/context_loaded)
}

// handleRunStream handles GET /api/run-stream/:epicId for SSE streaming of run updates.
func (s *Server) handleRunStream(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/run-stream/:epicId
	path := strings.TrimPrefix(r.URL.Path, "/api/run-stream/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	// Remove any trailing slash
	epicID := strings.TrimSuffix(path, "/")
	if epicID == "" {
		http.NotFound(w, r)
		return
	}

	// Only GET method is supported
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Verify the epic exists
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load ticks: %v", err), http.StatusInternalServerError)
		return
	}

	epicExists := false
	var epicTasks []tick.Tick
	for _, t := range allTicks {
		if t.ID == epicID && t.Type == tick.TypeEpic {
			epicExists = true
		}
		if t.Parent == epicID {
			epicTasks = append(epicTasks, t)
		}
	}
	if !epicExists {
		http.Error(w, "Epic not found", http.StatusNotFound)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create channel for this client
	clientChan := make(chan RunStreamEvent, 20)

	// Register client for this epic
	s.runStreamClientsMu.Lock()
	if s.runStreamClients[epicID] == nil {
		s.runStreamClients[epicID] = make(map[chan RunStreamEvent]struct{})
	}
	s.runStreamClients[epicID][clientChan] = struct{}{}
	s.runStreamClientsMu.Unlock()

	// Unregister on disconnect
	defer func() {
		s.runStreamClientsMu.Lock()
		delete(s.runStreamClients[epicID], clientChan)
		if len(s.runStreamClients[epicID]) == 0 {
			delete(s.runStreamClients, epicID)
		}
		close(clientChan)
		s.runStreamClientsMu.Unlock()
	}()

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Send initial connection message with current state
	store := runrecord.NewStore(filepath.Dir(s.tickDir))
	for _, t := range epicTasks {
		if store.LiveExists(t.ID) {
			liveRecord, err := store.ReadLive(t.ID)
			if err != nil {
				continue
			}
			// Send current state as task-update event
			eventData := RunStreamEventData{
				TaskID:    t.ID,
				Status:    liveRecord.Status,
				Output:    liveRecord.Output,
				NumTurns:  liveRecord.NumTurns,
				Metrics:   &liveRecord.Metrics,
				Timestamp: liveRecord.LastUpdated.Format(time.RFC3339),
			}
			if liveRecord.ActiveTool != nil {
				eventData.ActiveTool = liveRecord.ActiveTool
			}
			data, _ := json.Marshal(eventData)
			fmt.Fprintf(w, "event: task-update\ndata: %s\n\n", data)
		}
	}

	// Send connected event
	connectedData, _ := json.Marshal(map[string]string{"epicId": epicID})
	fmt.Fprintf(w, "event: connected\ndata: %s\n\n", connectedData)
	flusher.Flush()

	// Stream events to client
	for {
		select {
		case <-r.Context().Done():
			return
		case event, ok := <-clientChan:
			if !ok {
				return
			}
			data, err := json.Marshal(event.Data)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, data)
			flusher.Flush()
		}
	}
}

// broadcastRunStreamEvent sends an event to all connected run stream clients for an epic.
func (s *Server) broadcastRunStreamEvent(epicID string, eventType string, data interface{}) {
	s.runStreamClientsMu.RLock()
	clients, ok := s.runStreamClients[epicID]
	s.runStreamClientsMu.RUnlock()

	// Send to local SSE clients
	if ok {
		event := RunStreamEvent{
			Type: eventType,
			Data: data,
		}

		s.runStreamClientsMu.RLock()
		for clientChan := range clients {
			select {
			case clientChan <- event:
			default:
				// Client buffer full, skip
			}
		}
		s.runStreamClientsMu.RUnlock()
	}

	// Send to cloud if connected (sync mode)
	s.pushRunEventToCloud(epicID, eventType, data)
}

// pushRunEventToCloud sends a run event to the cloud if connected.
func (s *Server) pushRunEventToCloud(epicID string, eventType string, data interface{}) {
	if s.cloudClient == nil {
		return
	}

	// Check if cloud client supports run events (sync mode)
	pusher, ok := s.cloudClient.(RunEventPusher)
	if !ok {
		return
	}

	// Extract taskId from data if present
	var taskID string
	if d, ok := data.(RunStreamEventData); ok {
		taskID = d.TaskID
	}

	// Build the run event message
	event := RunEventMessage{
		Type:   "run_event",
		EpicID: epicID,
		TaskID: taskID,
		Source: "ralph", // Default to ralph; swarm will set its own source
	}

	// Convert data to RunEventData
	if d, ok := data.(RunStreamEventData); ok {
		event.Event = RunEventData{
			Type:      eventType,
			Output:    d.Output,
			Status:    d.Status,
			NumTurns:  d.NumTurns,
			Iteration: d.Iteration,
			Success:   d.Success,
			Message:   d.Message,
			Timestamp: time.Now().Format(time.RFC3339),
		}
		if d.Metrics != nil {
			event.Event.Metrics = &RunEventMetrics{
				InputTokens:         d.Metrics.InputTokens,
				OutputTokens:        d.Metrics.OutputTokens,
				CacheReadTokens:     d.Metrics.CacheReadTokens,
				CacheCreationTokens: d.Metrics.CacheCreationTokens,
				CostUSD:             d.Metrics.CostUSD,
				DurationMS:          int64(d.Metrics.DurationMS),
			}
		}
		if d.ActiveTool != nil {
			event.Event.ActiveTool = &RunEventTool{
				Name:     d.ActiveTool.Name,
				Input:    d.ActiveTool.Input,
				Duration: int64(d.ActiveTool.Duration),
			}
		}
	} else {
		event.Event = RunEventData{
			Type:      eventType,
			Timestamp: time.Now().Format(time.RFC3339),
		}
	}

	if err := pusher.SendRunEvent(event); err != nil {
		fmt.Fprintf(os.Stderr, "cloud: failed to push run event: %v\n", err)
	}
}

// watchRecords watches the records directory for .live.json changes and broadcasts updates.
func (s *Server) watchRecords(ctx context.Context) {
	debounceTimers := make(map[string]*time.Timer)
	debounceDelay := 100 * time.Millisecond

	// Track previous live file states to detect changes
	previousStates := make(map[string]string) // tickID -> last known status

	for {
		select {
		case <-ctx.Done():
			for _, timer := range debounceTimers {
				timer.Stop()
			}
			return
		case event, ok := <-s.recordsWatcher.Events:
			if !ok {
				return
			}

			filename := filepath.Base(event.Name)

			// Handle epic live files (_epic-<epicId>.live.json) - for swarm orchestrator
			if runrecord.IsEpicLiveFile(filename) {
				epicID := runrecord.ParseEpicLiveFilename(filename)
				if epicID == "" {
					continue
				}

				// Debounce per epic
				debounceKey := "epic_live_" + epicID
				if timer, exists := debounceTimers[debounceKey]; exists {
					timer.Stop()
				}

				capturedEpicID := epicID
				capturedEvent := event
				debounceTimers[debounceKey] = time.AfterFunc(debounceDelay, func() {
					s.handleEpicLiveRecordChange(capturedEpicID, capturedEvent.Op, previousStates)
				})
				continue
			}

			// Handle task live files (<taskId>.live.json)
			if strings.HasSuffix(filename, ".live.json") {
				tickID := strings.TrimSuffix(filename, ".live.json")

				// Debounce per tick
				if timer, exists := debounceTimers[tickID]; exists {
					timer.Stop()
				}

				// Capture for closure
				capturedTickID := tickID
				capturedEvent := event

				debounceTimers[tickID] = time.AfterFunc(debounceDelay, func() {
					s.handleLiveRecordChange(capturedTickID, capturedEvent.Op, previousStates)
				})
				continue
			}

			// Handle epic status files (_epic-<epicId>.status.json)
			if runrecord.IsEpicStatusFile(filename) {
				epicID := runrecord.ParseEpicStatusFilename(filename)
				if epicID == "" {
					continue
				}

				// Debounce per epic
				debounceKey := "epic_status_" + epicID
				if timer, exists := debounceTimers[debounceKey]; exists {
					timer.Stop()
				}

				capturedEpicID := epicID
				debounceTimers[debounceKey] = time.AfterFunc(debounceDelay, func() {
					s.handleEpicStatusChange(capturedEpicID)
				})
				continue
			}

			// Handle finalized .json files (when .live.json is renamed to .json)
			if strings.HasSuffix(filename, ".json") && !strings.HasSuffix(filename, ".live.json") {
				// This might be a finalization (rename from .live.json to .json)
				if event.Op&fsnotify.Create == fsnotify.Create || event.Op&fsnotify.Rename == fsnotify.Rename {
					tickID := strings.TrimSuffix(filename, ".json")

					// Debounce per tick
					if timer, exists := debounceTimers[tickID+"_final"]; exists {
						timer.Stop()
					}

					capturedTickID := tickID

					debounceTimers[tickID+"_final"] = time.AfterFunc(debounceDelay, func() {
						s.handleRecordFinalized(capturedTickID, previousStates)
					})
				}
			}

		case err, ok := <-s.recordsWatcher.Errors:
			if !ok {
				return
			}
			fmt.Fprintf(os.Stderr, "records watcher error: %v\n", err)
		}
	}
}

// handleLiveRecordChange processes a change to a .live.json file.
func (s *Server) handleLiveRecordChange(tickID string, op fsnotify.Op, previousStates map[string]string) {
	store := runrecord.NewStore(filepath.Dir(s.tickDir))

	// Check if live file was deleted (task ending)
	if op&fsnotify.Remove == fsnotify.Remove {
		delete(previousStates, tickID)
		return
	}

	// Read the live record
	liveRecord, err := store.ReadLive(tickID)
	if err != nil {
		return
	}

	// Find which epic this task belongs to
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		return
	}

	var parentEpicID string
	for _, t := range allTicks {
		if t.ID == tickID {
			parentEpicID = t.Parent
			break
		}
	}

	if parentEpicID == "" {
		return
	}

	// Determine event type based on status changes
	prevStatus := previousStates[tickID]
	currentStatus := liveRecord.Status

	eventData := RunStreamEventData{
		TaskID:    tickID,
		Status:    currentStatus,
		NumTurns:  liveRecord.NumTurns,
		Metrics:   &liveRecord.Metrics,
		Timestamp: liveRecord.LastUpdated.Format(time.RFC3339),
	}

	// If this is a new run (no previous state)
	if prevStatus == "" {
		eventData.Iteration = liveRecord.NumTurns
		s.broadcastRunStreamEvent(parentEpicID, "task-started", eventData)
	}

	// Update with current output delta and tool activity
	eventData.Output = liveRecord.Output
	if liveRecord.ActiveTool != nil {
		eventData.ActiveTool = liveRecord.ActiveTool
		s.broadcastRunStreamEvent(parentEpicID, "tool-activity", RunStreamEventData{
			TaskID:    tickID,
			Tool:      liveRecord.ActiveTool,
			Status:    liveRecord.ActiveTool.Name,
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}

	// Broadcast general update
	s.broadcastRunStreamEvent(parentEpicID, "task-update", eventData)

	// Update previous state
	previousStates[tickID] = currentStatus
}

// handleEpicLiveRecordChange processes a change to an epic live record (_epic-<id>.live.json).
// This is used for swarm orchestrator output streaming.
func (s *Server) handleEpicLiveRecordChange(epicID string, op fsnotify.Op, previousStates map[string]string) {
	store := runrecord.NewStore(filepath.Dir(s.tickDir))
	stateKey := "_epic_" + epicID // Use prefix to avoid collision with task states

	// Check if live file was deleted (swarm ending)
	if op&fsnotify.Remove == fsnotify.Remove {
		delete(previousStates, stateKey)
		return
	}

	// Read the epic live record
	liveRecord, err := store.ReadEpicLive(epicID)
	if err != nil {
		return
	}

	// Determine event type based on status changes
	prevStatus := previousStates[stateKey]
	currentStatus := liveRecord.Status

	eventData := RunStreamEventData{
		EpicID:    epicID,
		Status:    currentStatus,
		NumTurns:  liveRecord.NumTurns,
		Metrics:   &liveRecord.Metrics,
		Timestamp: liveRecord.LastUpdated.Format(time.RFC3339),
	}

	// If this is a new run (no previous state), emit epic-started
	if prevStatus == "" {
		s.broadcastRunStreamEvent(epicID, "epic-started", RunStreamEventData{
			EpicID:    epicID,
			Status:    "running",
			Message:   "Swarm orchestrator started",
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}

	// Update with current output delta and tool activity
	eventData.Output = liveRecord.Output
	if liveRecord.ActiveTool != nil {
		eventData.ActiveTool = liveRecord.ActiveTool
		s.broadcastRunStreamEvent(epicID, "tool-activity", RunStreamEventData{
			EpicID:    epicID,
			Tool:      liveRecord.ActiveTool,
			Status:    liveRecord.ActiveTool.Name,
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}

	// Broadcast general update (use task-update for compatibility with live panel)
	s.broadcastRunStreamEvent(epicID, "task-update", eventData)

	// Update previous state
	previousStates[stateKey] = currentStatus
}

// handleRecordFinalized processes when a run record is finalized (task completed).
func (s *Server) handleRecordFinalized(tickID string, previousStates map[string]string) {
	store := runrecord.NewStore(filepath.Dir(s.tickDir))

	// Read the finalized record
	record, err := store.Read(tickID)
	if err != nil {
		return
	}

	// Find which epic this task belongs to
	issuesDir := filepath.Join(s.tickDir, "issues")
	allTicks, err := query.LoadTicksParallel(issuesDir)
	if err != nil {
		return
	}

	var parentEpicID string
	var epicTasks []tick.Tick
	for _, t := range allTicks {
		if t.ID == tickID {
			parentEpicID = t.Parent
		}
		if t.Parent != "" {
			epicTasks = append(epicTasks, t)
		}
	}

	if parentEpicID == "" {
		return
	}

	// Broadcast task-completed event
	eventData := RunStreamEventData{
		TaskID:    tickID,
		Success:   record.Success,
		Metrics:   &record.Metrics,
		NumTurns:  record.NumTurns,
		Timestamp: record.EndedAt.Format(time.RFC3339),
	}
	s.broadcastRunStreamEvent(parentEpicID, "task-completed", eventData)

	// Clean up previous state
	delete(previousStates, tickID)

	// Check if all tasks in the epic are complete
	allComplete := true
	for _, t := range epicTasks {
		if t.Parent == parentEpicID && t.Status != tick.StatusClosed {
			allComplete = false
			break
		}
	}

	if allComplete {
		s.broadcastRunStreamEvent(parentEpicID, "epic-completed", RunStreamEventData{
			EpicID:    parentEpicID,
			Success:   true,
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}
}

// handleEpicStatusChange processes a change to an epic status file.
// This broadcasts context generation events to connected SSE clients.
func (s *Server) handleEpicStatusChange(epicID string) {
	store := runrecord.NewStore(filepath.Dir(s.tickDir))

	status, err := store.ReadEpicStatus(epicID)
	if err != nil {
		return
	}

	// Map status to SSE event type
	var eventType string
	switch status.Status {
	case "context_generating":
		eventType = "context-generating"
	case "context_generated":
		eventType = "context-generated"
	case "context_loaded":
		eventType = "context-loaded"
	case "context_failed":
		eventType = "context-failed"
	case "context_skipped":
		eventType = "context-skipped"
	default:
		// Unknown status, use generic epic-status event
		eventType = "epic-status"
	}

	// Broadcast to connected clients
	s.broadcastRunStreamEvent(epicID, eventType, RunStreamEventData{
		EpicID:     epicID,
		Status:     status.Status,
		Message:    status.Message,
		TaskCount:  status.TaskCount,
		TokenCount: status.TokenCount,
		Timestamp:  status.LastUpdated.Format(time.RFC3339),
	})
}

// handleContext handles GET /api/context/:epicId.
// Returns the raw markdown content of the context document for an epic.
func (s *Server) handleContext(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/context/:epicId
	path := strings.TrimPrefix(r.URL.Path, "/api/context/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	// Remove any trailing slash
	epicID := strings.TrimSuffix(path, "/")
	if epicID == "" {
		http.NotFound(w, r)
		return
	}

	// Only GET method is supported
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the context file
	contextPath := filepath.Join(s.tickDir, "logs", "context", epicID+".md")
	data, err := os.ReadFile(contextPath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Context document not found", http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to read context document: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Write(data)
}
