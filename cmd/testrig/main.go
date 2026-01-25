// Package main provides a test rig server for the CommsClient library.
// It provides real SSE and WebSocket endpoints for integration testing.
// Additionally, it can connect upstream to a Cloudflare Worker DO as a local agent.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

//go:embed static/*
var staticFS embed.FS

// Tick represents a tick for testing.
type Tick struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Status      string   `json:"status"`
	Priority    int      `json:"priority"`
	Type        string   `json:"type"`
	Parent      string   `json:"parent,omitempty"`
	Labels      []string `json:"labels,omitempty"`
	BlockedBy   []string `json:"blocked_by,omitempty"`
	Awaiting    string   `json:"awaiting,omitempty"`
	Notes       string   `json:"notes,omitempty"`
	CreatedBy   string   `json:"created_by"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// WriteOperation logs a write operation.
type WriteOperation struct {
	Type      string                 `json:"type"`
	TickID    string                 `json:"tickId,omitempty"`
	Args      map[string]interface{} `json:"args,omitempty"`
	Timestamp string                 `json:"timestamp"`
}

// Activity represents an activity log entry.
type Activity struct {
	TS     string                 `json:"ts"`
	Tick   string                 `json:"tick"`
	Action string                 `json:"action"`
	Actor  string                 `json:"actor"`
	Epic   string                 `json:"epic,omitempty"`
	Data   map[string]interface{} `json:"data,omitempty"`
}

// RunRecord represents a completed run record.
type RunRecord struct {
	SessionID  string         `json:"session_id"`
	Model      string         `json:"model"`
	StartedAt  string         `json:"started_at"`
	EndedAt    string         `json:"ended_at"`
	Output     string         `json:"output"`
	Thinking   string         `json:"thinking,omitempty"`
	Tools      []ToolRecord   `json:"tools,omitempty"`
	Metrics    MetricsRecord  `json:"metrics"`
	Success    bool           `json:"success"`
	NumTurns   int            `json:"num_turns"`
	ErrorMsg   string         `json:"error_msg,omitempty"`
}

// MetricsRecord represents run metrics.
type MetricsRecord struct {
	InputTokens         int     `json:"input_tokens"`
	OutputTokens        int     `json:"output_tokens"`
	CacheReadTokens     int     `json:"cache_read_tokens"`
	CacheCreationTokens int     `json:"cache_creation_tokens"`
	CostUsd             float64 `json:"cost_usd"`
	DurationMs          int     `json:"duration_ms"`
}

// ToolRecord represents a tool invocation.
type ToolRecord struct {
	Name       string `json:"name"`
	Input      string `json:"input,omitempty"`
	Output     string `json:"output,omitempty"`
	DurationMs int    `json:"duration_ms"`
	IsError    bool   `json:"is_error,omitempty"`
}

// RunStatus represents the run status for an epic.
type RunStatus struct {
	EpicID    string `json:"epicId"`
	IsRunning bool   `json:"isRunning"`
}

// TestServer is the test rig server.
type TestServer struct {
	mu sync.RWMutex

	// In-memory tick store
	ticks map[string]Tick

	// Activity log
	activities   []Activity
	activitiesMu sync.RWMutex

	// Run records by tick ID
	runRecords   map[string]RunRecord
	runRecordsMu sync.RWMutex

	// Context by epic ID
	contexts   map[string]string
	contextsMu sync.RWMutex

	// SSE clients for /api/events
	sseClients   map[chan string]struct{}
	sseClientsMu sync.RWMutex

	// SSE clients for /api/run-stream/:epicId
	runStreamClients   map[string]map[chan string]struct{}
	runStreamClientsMu sync.RWMutex

	// WebSocket clients for /api/sync (cloud mode simulation)
	wsClients   map[*websocket.Conn]struct{}
	wsClientsMu sync.RWMutex

	// Write operation log
	writeLog   []WriteOperation
	writeLogMu sync.RWMutex

	// Configuration
	localAgentConnected bool
	failNextWrite       error

	// Upstream client for connecting to Cloudflare Worker DO
	upstreamClient *UpstreamClient
}

// NewTestServer creates a new test server.
func NewTestServer() *TestServer {
	return &TestServer{
		ticks:               make(map[string]Tick),
		activities:          []Activity{},
		runRecords:          make(map[string]RunRecord),
		contexts:            make(map[string]string),
		sseClients:          make(map[chan string]struct{}),
		runStreamClients:    make(map[string]map[chan string]struct{}),
		wsClients:           make(map[*websocket.Conn]struct{}),
		writeLog:            []WriteOperation{},
		localAgentConnected: true, // Default to connected
	}
}

// ServeHTTP handles all requests.
func (s *TestServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS headers for browser testing
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	path := r.URL.Path

	// Route requests
	switch {
	// SSE endpoints
	case path == "/api/events" && r.Method == "GET":
		s.handleSSE(w, r)
	case strings.HasPrefix(path, "/api/run-stream/") && r.Method == "GET":
		epicID := strings.TrimPrefix(path, "/api/run-stream/")
		s.handleRunStream(w, r, epicID)

	// REST endpoints for write operations
	case path == "/api/ticks" && r.Method == "POST":
		s.handleCreateTick(w, r)
	case strings.HasPrefix(path, "/api/ticks/") && r.Method == "GET" && !strings.Contains(path, "/note") && !strings.Contains(path, "/approve") && !strings.Contains(path, "/reject") && !strings.Contains(path, "/close") && !strings.Contains(path, "/reopen"):
		tickID := extractTickID(path, "/api/ticks/")
		s.handleGetTick(w, r, tickID)
	case strings.HasPrefix(path, "/api/ticks/") && r.Method == "PATCH":
		tickID := extractTickID(path, "/api/ticks/")
		s.handleUpdateTick(w, r, tickID)
	case strings.HasPrefix(path, "/api/ticks/") && r.Method == "DELETE":
		tickID := extractTickID(path, "/api/ticks/")
		s.handleDeleteTick(w, r, tickID)
	case strings.HasSuffix(path, "/note") && r.Method == "POST":
		tickID := extractTickIDWithSuffix(path, "/note")
		s.handleAddNote(w, r, tickID)
	case strings.HasSuffix(path, "/approve") && r.Method == "POST":
		tickID := extractTickIDWithSuffix(path, "/approve")
		s.handleApprove(w, r, tickID)
	case strings.HasSuffix(path, "/reject") && r.Method == "POST":
		tickID := extractTickIDWithSuffix(path, "/reject")
		s.handleReject(w, r, tickID)
	case strings.HasSuffix(path, "/close") && r.Method == "POST":
		tickID := extractTickIDWithSuffix(path, "/close")
		s.handleClose(w, r, tickID)
	case strings.HasSuffix(path, "/reopen") && r.Method == "POST":
		tickID := extractTickIDWithSuffix(path, "/reopen")
		s.handleReopen(w, r, tickID)

	// Test control endpoints
	case path == "/test/emit" && r.Method == "POST":
		s.handleEmit(w, r)
	case path == "/test/reset" && r.Method == "POST":
		s.handleReset(w, r)
	case path == "/test/writes" && r.Method == "GET":
		s.handleGetWrites(w, r)
	case path == "/test/scenario" && r.Method == "POST":
		s.handleScenario(w, r)
	case path == "/test/local-status" && r.Method == "POST":
		s.handleLocalStatus(w, r)
	case path == "/test/fail-next" && r.Method == "POST":
		s.handleFailNext(w, r)
	case path == "/test/ticks" && r.Method == "GET":
		s.handleGetTicks(w, r)
	case path == "/test/clients" && r.Method == "GET":
		s.handleGetClients(w, r)
	case path == "/test/add-record" && r.Method == "POST":
		s.handleAddRecord(w, r)
	case path == "/test/add-context" && r.Method == "POST":
		s.handleAddContext(w, r)

	// Read endpoints
	case path == "/api/info" && r.Method == "GET":
		s.handleInfo(w, r)
	case path == "/api/activity" && r.Method == "GET":
		s.handleActivity(w, r)
	case strings.HasPrefix(path, "/api/records/") && r.Method == "GET":
		tickID := strings.TrimPrefix(path, "/api/records/")
		s.handleGetRecord(w, r, tickID)
	case strings.HasPrefix(path, "/api/run-status/") && r.Method == "GET":
		epicID := strings.TrimPrefix(path, "/api/run-status/")
		s.handleRunStatus(w, r, epicID)
	case strings.HasPrefix(path, "/api/context/") && r.Method == "GET":
		epicID := strings.TrimPrefix(path, "/api/context/")
		s.handleGetContext(w, r, epicID)

	// Health check
	case path == "/health":
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))

	default:
		http.NotFound(w, r)
	}
}

// ============================================================================
// SSE Endpoints
// ============================================================================

func (s *TestServer) handleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Create client channel
	ch := make(chan string, 100)
	s.sseClientsMu.Lock()
	s.sseClients[ch] = struct{}{}
	s.sseClientsMu.Unlock()

	defer func() {
		s.sseClientsMu.Lock()
		delete(s.sseClients, ch)
		s.sseClientsMu.Unlock()
		close(ch)
	}()

	// Send connected event
	fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
	flusher.Flush()

	log.Printf("[SSE] Client connected, total: %d", len(s.sseClients))

	// Stream events
	for {
		select {
		case msg := <-ch:
			fmt.Fprintf(w, "%s\n\n", msg)
			flusher.Flush()
		case <-r.Context().Done():
			log.Printf("[SSE] Client disconnected")
			return
		}
	}
}

func (s *TestServer) handleRunStream(w http.ResponseWriter, r *http.Request, epicID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Create client channel
	ch := make(chan string, 100)
	s.runStreamClientsMu.Lock()
	if s.runStreamClients[epicID] == nil {
		s.runStreamClients[epicID] = make(map[chan string]struct{})
	}
	s.runStreamClients[epicID][ch] = struct{}{}
	s.runStreamClientsMu.Unlock()

	defer func() {
		s.runStreamClientsMu.Lock()
		delete(s.runStreamClients[epicID], ch)
		if len(s.runStreamClients[epicID]) == 0 {
			delete(s.runStreamClients, epicID)
		}
		s.runStreamClientsMu.Unlock()
		close(ch)
	}()

	// Send connected event
	fmt.Fprintf(w, "event: connected\ndata: {\"epicId\":\"%s\"}\n\n", epicID)
	flusher.Flush()

	log.Printf("[RunStream] Client connected for epic %s", epicID)

	// Stream events
	for {
		select {
		case msg := <-ch:
			fmt.Fprintf(w, "%s\n\n", msg)
			flusher.Flush()
		case <-r.Context().Done():
			log.Printf("[RunStream] Client disconnected for epic %s", epicID)
			return
		}
	}
}

// ============================================================================
// REST Endpoints (Write Operations)
// ============================================================================

func (s *TestServer) handleCreateTick(w http.ResponseWriter, r *http.Request) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	var input struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Type        string   `json:"type"`
		Priority    int      `json:"priority"`
		Parent      string   `json:"parent"`
		Labels      []string `json:"labels"`
		BlockedBy   []string `json:"blocked_by"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	tick := Tick{
		ID:          generateID(),
		Title:       input.Title,
		Description: input.Description,
		Type:        input.Type,
		Status:      "open",
		Priority:    input.Priority,
		Parent:      input.Parent,
		Labels:      input.Labels,
		BlockedBy:   input.BlockedBy,
		CreatedBy:   "test@user",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}
	if tick.Type == "" {
		tick.Type = "task"
	}
	if tick.Priority == 0 {
		tick.Priority = 2
	}

	s.mu.Lock()
	s.ticks[tick.ID] = tick
	s.mu.Unlock()

	s.logWrite("createTick", tick.ID, map[string]interface{}{"tick": input})
	s.logActivity(tick.ID, "create", "test@user", tick.Parent)

	// Broadcast update
	s.broadcastTickEvent("create", tick.ID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.SendTickCreate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick create: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleGetTick(w http.ResponseWriter, r *http.Request, tickID string) {
	s.mu.RLock()
	tick, ok := s.ticks[tickID]
	s.mu.RUnlock()

	if !ok {
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleUpdateTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		s.mu.Unlock()
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Apply updates
	if v, ok := updates["title"].(string); ok {
		tick.Title = v
	}
	if v, ok := updates["description"].(string); ok {
		tick.Description = v
	}
	if v, ok := updates["status"].(string); ok {
		tick.Status = v
	}
	if v, ok := updates["priority"].(float64); ok {
		tick.Priority = int(v)
	}
	if v, ok := updates["awaiting"].(string); ok {
		tick.Awaiting = v
	}
	tick.UpdatedAt = time.Now().Format(time.RFC3339)

	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("updateTick", tickID, updates)
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleDeleteTick(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	s.mu.Lock()
	if _, ok := s.ticks[tickID]; !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}
	delete(s.ticks, tickID)
	s.mu.Unlock()

	s.logWrite("deleteTick", tickID, nil)
	s.broadcastTickEvent("delete", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.SendTickDelete(tickID); err != nil {
			log.Printf("[Upstream] Failed to send tick delete: %v", err)
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *TestServer) handleAddNote(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	var input struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	// Append note
	note := fmt.Sprintf("[%s] test@user: %s", time.Now().Format(time.RFC3339), input.Message)
	if tick.Notes != "" {
		tick.Notes += "\n"
	}
	tick.Notes += note
	tick.UpdatedAt = time.Now().Format(time.RFC3339)
	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("addNote", tickID, map[string]interface{}{"message": input.Message})
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleApprove(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	tick.Awaiting = ""
	tick.UpdatedAt = time.Now().Format(time.RFC3339)
	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("approveTick", tickID, nil)
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleReject(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	tick.Awaiting = ""
	tick.Status = "open"
	note := fmt.Sprintf("[%s] test@user: Rejected: %s", time.Now().Format(time.RFC3339), input.Reason)
	if tick.Notes != "" {
		tick.Notes += "\n"
	}
	tick.Notes += note
	tick.UpdatedAt = time.Now().Format(time.RFC3339)
	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("rejectTick", tickID, map[string]interface{}{"reason": input.Reason})
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleClose(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&input) // Optional reason

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	tick.Status = "closed"
	tick.UpdatedAt = time.Now().Format(time.RFC3339)
	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("closeTick", tickID, map[string]interface{}{"reason": input.Reason})
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

func (s *TestServer) handleReopen(w http.ResponseWriter, r *http.Request, tickID string) {
	if err := s.checkWritable(); err != nil {
		jsonError(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	s.mu.Lock()
	tick, ok := s.ticks[tickID]
	if !ok {
		s.mu.Unlock()
		jsonError(w, "Tick not found", http.StatusNotFound)
		return
	}

	tick.Status = "open"
	tick.UpdatedAt = time.Now().Format(time.RFC3339)
	s.ticks[tickID] = tick
	s.mu.Unlock()

	s.logWrite("reopenTick", tickID, nil)
	s.broadcastTickEvent("update", tickID)

	// Propagate to upstream if connected
	if s.upstreamClient != nil && s.upstreamClient.IsConnected() {
		if err := s.upstreamClient.sendTickUpdate(tick); err != nil {
			log.Printf("[Upstream] Failed to send tick update: %v", err)
		}
	}

	jsonResponse(w, tick)
}

// ============================================================================
// Test Control Endpoints
// ============================================================================

func (s *TestServer) handleEmit(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Target    string          `json:"target"`    // "sse", "run-stream", or "websocket"
		EpicID    string          `json:"epicId"`    // For run-stream
		EventType string          `json:"eventType"` // SSE event type
		Data      json.RawMessage `json:"data"`      // Event data
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	msg := fmt.Sprintf("event: %s\ndata: %s", input.EventType, string(input.Data))

	switch input.Target {
	case "sse":
		s.broadcastToSSE(msg)
	case "run-stream":
		s.broadcastToRunStream(input.EpicID, msg)
	case "websocket":
		s.broadcastToWebSocket(input.Data)
	default:
		// Default to SSE
		s.broadcastToSSE(msg)
	}

	jsonResponse(w, map[string]string{"status": "emitted"})
}

func (s *TestServer) handleReset(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.ticks = make(map[string]Tick)
	s.mu.Unlock()

	s.writeLogMu.Lock()
	s.writeLog = []WriteOperation{}
	s.writeLogMu.Unlock()

	s.activitiesMu.Lock()
	s.activities = []Activity{}
	s.activitiesMu.Unlock()

	s.runRecordsMu.Lock()
	s.runRecords = make(map[string]RunRecord)
	s.runRecordsMu.Unlock()

	s.contextsMu.Lock()
	s.contexts = make(map[string]string)
	s.contextsMu.Unlock()

	s.localAgentConnected = true
	s.failNextWrite = nil

	log.Printf("[TestRig] State reset")
	jsonResponse(w, map[string]string{"status": "reset"})
}

func (s *TestServer) handleGetWrites(w http.ResponseWriter, r *http.Request) {
	s.writeLogMu.RLock()
	defer s.writeLogMu.RUnlock()
	jsonResponse(w, s.writeLog)
}

func (s *TestServer) handleScenario(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	switch input.Name {
	case "tick-lifecycle":
		s.runTickLifecycleScenario()
	case "run-complete":
		s.runRunCompleteScenario()
	case "connection-flaky":
		s.runConnectionFlakyScenario()
	default:
		jsonError(w, "Unknown scenario: "+input.Name, http.StatusBadRequest)
		return
	}

	jsonResponse(w, map[string]string{"status": "running", "scenario": input.Name})
}

func (s *TestServer) handleLocalStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Connected bool `json:"connected"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.localAgentConnected = input.Connected

	// Broadcast to WebSocket clients
	msg, _ := json.Marshal(map[string]interface{}{
		"type":      "local_status",
		"connected": input.Connected,
	})
	s.broadcastToWebSocket(msg)

	jsonResponse(w, map[string]bool{"connected": input.Connected})
}

func (s *TestServer) handleFailNext(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Error string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.failNextWrite = fmt.Errorf("%s", input.Error)
	jsonResponse(w, map[string]string{"status": "configured"})
}

func (s *TestServer) handleGetTicks(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	jsonResponse(w, s.ticks)
}

func (s *TestServer) handleGetClients(w http.ResponseWriter, r *http.Request) {
	s.sseClientsMu.RLock()
	sseCount := len(s.sseClients)
	s.sseClientsMu.RUnlock()

	s.runStreamClientsMu.RLock()
	runStreamCount := 0
	runStreamEpics := []string{}
	for epicID, clients := range s.runStreamClients {
		runStreamCount += len(clients)
		runStreamEpics = append(runStreamEpics, epicID)
	}
	s.runStreamClientsMu.RUnlock()

	s.wsClientsMu.RLock()
	wsCount := len(s.wsClients)
	s.wsClientsMu.RUnlock()

	upstreamConnected := false
	if s.upstreamClient != nil {
		upstreamConnected = s.upstreamClient.IsConnected()
	}

	jsonResponse(w, map[string]interface{}{
		"sse":               sseCount,
		"runStream":         runStreamCount,
		"runStreamEpics":    runStreamEpics,
		"websocket":         wsCount,
		"localAgentOnline":  s.localAgentConnected,
		"upstreamConnected": upstreamConnected,
	})
}

func (s *TestServer) handleInfo(w http.ResponseWriter, r *http.Request) {
	// Build epics list from ticks with type=epic
	s.mu.RLock()
	epics := []map[string]string{}
	for _, tick := range s.ticks {
		if tick.Type == "epic" {
			epics = append(epics, map[string]string{
				"id":    tick.ID,
				"title": tick.Title,
			})
		}
	}
	s.mu.RUnlock()

	jsonResponse(w, map[string]interface{}{
		"repoName": "testrig/test-project",
		"epics":    epics,
	})
}

func (s *TestServer) handleActivity(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 20 // default
	if limitStr != "" {
		if l, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && l > 0 {
			// limit is set
		}
	}

	s.activitiesMu.RLock()
	activities := s.activities
	s.activitiesMu.RUnlock()

	// Apply limit
	if len(activities) > limit {
		activities = activities[:limit]
	}

	jsonResponse(w, map[string]interface{}{
		"activities": activities,
	})
}

func (s *TestServer) handleGetRecord(w http.ResponseWriter, r *http.Request, tickID string) {
	s.runRecordsMu.RLock()
	record, ok := s.runRecords[tickID]
	s.runRecordsMu.RUnlock()

	if !ok {
		jsonError(w, "Record not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, record)
}

func (s *TestServer) handleRunStatus(w http.ResponseWriter, r *http.Request, epicID string) {
	// For testing, always return not running
	jsonResponse(w, RunStatus{
		EpicID:    epicID,
		IsRunning: false,
	})
}

func (s *TestServer) handleGetContext(w http.ResponseWriter, r *http.Request, epicID string) {
	s.contextsMu.RLock()
	context, ok := s.contexts[epicID]
	s.contextsMu.RUnlock()

	if !ok {
		jsonError(w, "Context not found", http.StatusNotFound)
		return
	}

	// Return as plain text
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(context))
}

func (s *TestServer) handleAddRecord(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TickID string    `json:"tickId"`
		Record RunRecord `json:"record"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.runRecordsMu.Lock()
	s.runRecords[input.TickID] = input.Record
	s.runRecordsMu.Unlock()

	jsonResponse(w, map[string]string{"status": "added"})
}

func (s *TestServer) handleAddContext(w http.ResponseWriter, r *http.Request) {
	var input struct {
		EpicID  string `json:"epicId"`
		Context string `json:"context"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	s.contextsMu.Lock()
	s.contexts[input.EpicID] = input.Context
	s.contextsMu.Unlock()

	jsonResponse(w, map[string]string{"status": "added"})
}

// ============================================================================
// Scenarios
// ============================================================================

func (s *TestServer) runTickLifecycleScenario() {
	go func() {
		tickID := "test-" + generateID()

		// Create tick
		tick := Tick{
			ID:        tickID,
			Title:     "Test Tick Lifecycle",
			Status:    "open",
			Type:      "task",
			Priority:  2,
			CreatedBy: "scenario",
			CreatedAt: time.Now().Format(time.RFC3339),
			UpdatedAt: time.Now().Format(time.RFC3339),
		}
		s.mu.Lock()
		s.ticks[tickID] = tick
		s.mu.Unlock()
		s.broadcastTickEvent("create", tickID)

		time.Sleep(500 * time.Millisecond)

		// Update to in_progress
		s.mu.Lock()
		tick.Status = "in_progress"
		tick.UpdatedAt = time.Now().Format(time.RFC3339)
		s.ticks[tickID] = tick
		s.mu.Unlock()
		s.broadcastTickEvent("update", tickID)

		time.Sleep(500 * time.Millisecond)

		// Close
		s.mu.Lock()
		tick.Status = "closed"
		tick.UpdatedAt = time.Now().Format(time.RFC3339)
		s.ticks[tickID] = tick
		s.mu.Unlock()
		s.broadcastTickEvent("update", tickID)
	}()
}

func (s *TestServer) runRunCompleteScenario() {
	go func() {
		epicID := "epic-test"
		taskID := "task-test"

		// Task started
		s.emitRunEvent(epicID, "task-started", map[string]interface{}{
			"taskId":   taskID,
			"status":   "running",
			"numTurns": 0,
		})

		time.Sleep(300 * time.Millisecond)

		// Task update with tool
		s.emitRunEvent(epicID, "task-update", map[string]interface{}{
			"taskId":   taskID,
			"numTurns": 1,
			"activeTool": map[string]interface{}{
				"name":  "Bash",
				"input": "ls -la",
			},
		})

		time.Sleep(300 * time.Millisecond)

		// Tool activity
		s.emitRunEvent(epicID, "tool-activity", map[string]interface{}{
			"taskId": taskID,
			"tool": map[string]interface{}{
				"name":     "Bash",
				"input":    "ls -la",
				"output":   "file1.txt\nfile2.txt",
				"duration": 150,
			},
		})

		time.Sleep(300 * time.Millisecond)

		// Task completed
		s.emitRunEvent(epicID, "task-completed", map[string]interface{}{
			"taskId":   taskID,
			"success":  true,
			"numTurns": 2,
		})
	}()
}

func (s *TestServer) runConnectionFlakyScenario() {
	go func() {
		// Disconnect
		msg, _ := json.Marshal(map[string]interface{}{
			"type":      "local_status",
			"connected": false,
		})
		s.broadcastToWebSocket(msg)

		time.Sleep(1 * time.Second)

		// Reconnect
		msg, _ = json.Marshal(map[string]interface{}{
			"type":      "local_status",
			"connected": true,
		})
		s.broadcastToWebSocket(msg)
	}()
}

// ============================================================================
// Broadcasting
// ============================================================================

func (s *TestServer) broadcastTickEvent(eventType, tickID string) {
	s.mu.RLock()
	tick, ok := s.ticks[tickID]
	s.mu.RUnlock()

	// SSE broadcast
	data := map[string]string{"type": eventType, "tickId": tickID}
	dataBytes, _ := json.Marshal(data)
	msg := fmt.Sprintf("event: update\ndata: %s", string(dataBytes))
	s.broadcastToSSE(msg)

	// WebSocket broadcast
	if ok {
		wsMsg, _ := json.Marshal(map[string]interface{}{
			"type": "tick_updated",
			"tick": tick,
		})
		s.broadcastToWebSocket(wsMsg)
	} else if eventType == "delete" {
		wsMsg, _ := json.Marshal(map[string]interface{}{
			"type": "tick_deleted",
			"id":   tickID,
		})
		s.broadcastToWebSocket(wsMsg)
	}
}

func (s *TestServer) broadcastToSSE(msg string) {
	s.sseClientsMu.RLock()
	defer s.sseClientsMu.RUnlock()

	for ch := range s.sseClients {
		select {
		case ch <- msg:
		default:
			// Channel full, skip
		}
	}
}

func (s *TestServer) broadcastToRunStream(epicID, msg string) {
	s.runStreamClientsMu.RLock()
	defer s.runStreamClientsMu.RUnlock()

	if clients, ok := s.runStreamClients[epicID]; ok {
		for ch := range clients {
			select {
			case ch <- msg:
			default:
			}
		}
	}
}

func (s *TestServer) broadcastToWebSocket(data []byte) {
	s.wsClientsMu.RLock()
	defer s.wsClientsMu.RUnlock()

	for conn := range s.wsClients {
		go func(c *websocket.Conn) {
			if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("[WS] Error sending: %v", err)
			}
		}(conn)
	}
}

func (s *TestServer) emitRunEvent(epicID, eventType string, data map[string]interface{}) {
	data["timestamp"] = time.Now().Format(time.RFC3339)
	dataBytes, _ := json.Marshal(data)
	msg := fmt.Sprintf("event: %s\ndata: %s", eventType, string(dataBytes))
	s.broadcastToRunStream(epicID, msg)
}

// ============================================================================
// WebSocket Handler
// ============================================================================

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for testing
	},
}

func (s *TestServer) handleWebSocketHTTP(w http.ResponseWriter, r *http.Request) {
	ws, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}
	s.handleWebSocket(ws)
}

func (s *TestServer) handleWebSocket(ws *websocket.Conn) {
	s.wsClientsMu.Lock()
	s.wsClients[ws] = struct{}{}
	s.wsClientsMu.Unlock()

	defer func() {
		s.wsClientsMu.Lock()
		delete(s.wsClients, ws)
		s.wsClientsMu.Unlock()
		ws.Close()
	}()

	// Send connected message
	connectedMsg, _ := json.Marshal(map[string]interface{}{
		"type":         "connected",
		"connectionId": generateID(),
	})
	ws.WriteMessage(websocket.TextMessage, connectedMsg)

	// Send local status
	statusMsg, _ := json.Marshal(map[string]interface{}{
		"type":      "local_status",
		"connected": s.localAgentConnected,
	})
	ws.WriteMessage(websocket.TextMessage, statusMsg)

	// Send full state
	s.mu.RLock()
	stateMsg, _ := json.Marshal(map[string]interface{}{
		"type":  "state_full",
		"ticks": s.ticks,
	})
	s.mu.RUnlock()
	ws.WriteMessage(websocket.TextMessage, stateMsg)

	log.Printf("[WS] Client connected, total: %d", len(s.wsClients))

	// Read loop (handle incoming messages)
	for {
		_, msgBytes, err := ws.ReadMessage()
		if err != nil {
			log.Printf("[WS] Client disconnected: %v", err)
			return
		}

		// Parse and handle message
		var inMsg map[string]interface{}
		if err := json.Unmarshal(msgBytes, &inMsg); err != nil {
			continue
		}

		msgType, _ := inMsg["type"].(string)
		switch msgType {
		case "tick_update":
			// Handle tick update from client
			if tickData, ok := inMsg["tick"].(map[string]interface{}); ok {
				tickBytes, _ := json.Marshal(tickData)
				var tick Tick
				json.Unmarshal(tickBytes, &tick)

				s.mu.Lock()
				s.ticks[tick.ID] = tick
				s.mu.Unlock()

				s.broadcastTickEvent("update", tick.ID)
			}
		case "tick_delete":
			if tickID, ok := inMsg["id"].(string); ok {
				s.mu.Lock()
				delete(s.ticks, tickID)
				s.mu.Unlock()
				s.broadcastTickEvent("delete", tickID)
			}
		}
	}
}

// ============================================================================
// Helpers
// ============================================================================

func (s *TestServer) checkWritable() error {
	if s.failNextWrite != nil {
		err := s.failNextWrite
		s.failNextWrite = nil
		return err
	}
	if !s.localAgentConnected {
		return fmt.Errorf("local agent offline")
	}
	return nil
}

func (s *TestServer) logWrite(opType, tickID string, args map[string]interface{}) {
	s.writeLogMu.Lock()
	defer s.writeLogMu.Unlock()

	s.writeLog = append(s.writeLog, WriteOperation{
		Type:      opType,
		TickID:    tickID,
		Args:      args,
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (s *TestServer) logActivity(tickID, action, actor, epic string) {
	s.activitiesMu.Lock()
	defer s.activitiesMu.Unlock()

	// Prepend to activities (most recent first)
	activity := Activity{
		TS:     time.Now().Format(time.RFC3339),
		Tick:   tickID,
		Action: action,
		Actor:  actor,
		Epic:   epic,
	}
	s.activities = append([]Activity{activity}, s.activities...)
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func extractTickID(path, prefix string) string {
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(rest, "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

func extractTickIDWithSuffix(path, suffix string) string {
	// /api/ticks/{id}/note -> extract {id}
	path = strings.TrimSuffix(path, suffix)
	parts := strings.Split(path, "/")
	if len(parts) >= 3 {
		return parts[len(parts)-1]
	}
	return ""
}

var idCounter int
var idMu sync.Mutex

func generateID() string {
	idMu.Lock()
	idCounter++
	id := idCounter
	idMu.Unlock()
	return fmt.Sprintf("%03d", id)
}

// ============================================================================
// Upstream Client - Connect to Cloudflare Worker DO as local agent
// ============================================================================

// UpstreamClient connects to a Cloudflare Worker DO as a local agent.
type UpstreamClient struct {
	url       string // Full WebSocket URL including project and token
	server    *TestServer
	conn      *websocket.Conn
	connMu    sync.Mutex
	stopChan  chan struct{}
	connected bool
}

// NewUpstreamClient creates a new upstream client.
func NewUpstreamClient(upstreamURL, projectID, token string, server *TestServer) *UpstreamClient {
	// Build WebSocket URL: ws://host/api/projects/:project/sync?token=...&type=local
	encodedProject := url.PathEscape(projectID)
	wsURL := fmt.Sprintf("%s/api/projects/%s/sync?token=%s&type=local", upstreamURL, encodedProject, url.QueryEscape(token))
	return &UpstreamClient{
		url:      wsURL,
		server:   server,
		stopChan: make(chan struct{}),
	}
}

// Run connects to the upstream and handles messages until stopped.
func (u *UpstreamClient) Run(ctx context.Context) error {
	backoff := time.Second
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-ctx.Done():
			u.Close()
			return ctx.Err()
		case <-u.stopChan:
			u.Close()
			return nil
		default:
		}

		// Try to connect
		if err := u.connect(ctx); err != nil {
			log.Printf("[Upstream] Connection failed: %v (retrying in %v)", err, backoff)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			continue
		}

		log.Printf("[Upstream] Connected to %s", u.url)
		u.connected = true
		backoff = time.Second // Reset backoff

		// Send initial full sync with current ticks
		if err := u.sendFullSync(); err != nil {
			log.Printf("[Upstream] Failed to send initial sync: %v", err)
			u.connected = false
			continue
		}

		// Handle messages until disconnection
		if err := u.handleMessages(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			log.Printf("[Upstream] Disconnected: %v (reconnecting...)", err)
			u.connected = false
		}
	}
}

// connect establishes the WebSocket connection.
func (u *UpstreamClient) connect(ctx context.Context) error {
	u.connMu.Lock()
	defer u.connMu.Unlock()

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, resp, err := dialer.DialContext(ctx, u.url, nil)
	if err != nil {
		if resp != nil {
			switch resp.StatusCode {
			case 401:
				return fmt.Errorf("authentication failed: invalid token")
			case 403:
				return fmt.Errorf("access denied: no access to project")
			}
		}
		return fmt.Errorf("failed to connect: %w", err)
	}

	u.conn = conn
	return nil
}

// sendFullSync sends the current tick state to upstream.
func (u *UpstreamClient) sendFullSync() error {
	u.server.mu.RLock()
	ticks := make(map[string]Tick)
	for id, t := range u.server.ticks {
		ticks[id] = t
	}
	u.server.mu.RUnlock()

	msg := map[string]interface{}{
		"type":  "sync_full",
		"ticks": ticks,
	}
	return u.sendJSON(msg)
}

// handleMessages reads and processes messages from upstream.
func (u *UpstreamClient) handleMessages(ctx context.Context) error {
	u.connMu.Lock()
	conn := u.conn
	u.connMu.Unlock()

	if conn == nil {
		return fmt.Errorf("connection closed")
	}

	// Set up pong handler
	conn.SetPongHandler(func(appData string) error {
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	// Start ping sender
	pingDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-pingDone:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				u.connMu.Lock()
				conn := u.conn
				u.connMu.Unlock()
				if conn != nil {
					if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(10*time.Second)); err != nil {
						return
					}
				}
			}
		}
	}()
	defer close(pingDone)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		u.connMu.Lock()
		conn := u.conn
		u.connMu.Unlock()

		if conn == nil {
			return fmt.Errorf("connection closed")
		}

		conn.SetReadDeadline(time.Now().Add(90 * time.Second))

		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return nil
			}
			return fmt.Errorf("read error: %w", err)
		}

		u.handleMessage(rawMsg)
	}
}

// handleMessage processes a single message from upstream.
func (u *UpstreamClient) handleMessage(data []byte) {
	var typeOnly struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeOnly); err != nil {
		log.Printf("[Upstream] Invalid message: %v", err)
		return
	}

	switch typeOnly.Type {
	case "state_full":
		// Full state received from DO
		var msg struct {
			Type  string          `json:"type"`
			Ticks map[string]Tick `json:"ticks"`
		}
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Upstream] Invalid state_full: %v", err)
			return
		}
		u.applyRemoteState(msg.Ticks)
		log.Printf("[Upstream] Received state_full with %d ticks", len(msg.Ticks))

	case "tick_updated", "tick_created":
		// Single tick update from DO
		var msg struct {
			Type string `json:"type"`
			Tick Tick   `json:"tick"`
		}
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Upstream] Invalid tick message: %v", err)
			return
		}
		u.applyRemoteTick(msg.Tick, msg.Type == "tick_created")
		log.Printf("[Upstream] Received %s for tick %s", msg.Type, msg.Tick.ID)

	case "tick_deleted":
		// Tick deleted notification
		var msg struct {
			Type string `json:"type"`
			ID   string `json:"id"`
		}
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Upstream] Invalid tick_deleted: %v", err)
			return
		}
		u.applyRemoteDelete(msg.ID)
		log.Printf("[Upstream] Received tick_deleted for %s", msg.ID)

	case "tick_operation":
		// Operation request from cloud UI via DO
		var msg UpstreamTickOperation
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Upstream] Invalid tick_operation: %v", err)
			return
		}
		go u.handleTickOperation(msg)
		log.Printf("[Upstream] Received tick_operation: %s for tick %s", msg.Operation, msg.TickID)

	case "heartbeat":
		// Heartbeat from server - respond with heartbeat
		u.sendJSON(map[string]string{"type": "heartbeat"})

	case "local_status", "connected", "error":
		// These are expected messages we can ignore or log
		log.Printf("[Upstream] Received %s message", typeOnly.Type)

	default:
		log.Printf("[Upstream] Unknown message type: %s", typeOnly.Type)
	}
}

// UpstreamTickOperation represents an operation request from the DO.
type UpstreamTickOperation struct {
	Type      string `json:"type"`
	RequestID string `json:"requestId"`
	Operation string `json:"operation"` // add_note, approve, reject, close, reopen
	TickID    string `json:"tickId"`
	Payload   struct {
		Message string `json:"message,omitempty"`
		Reason  string `json:"reason,omitempty"`
	} `json:"payload,omitempty"`
}

// handleTickOperation handles an operation request from upstream.
func (u *UpstreamClient) handleTickOperation(op UpstreamTickOperation) {
	log.Printf("[Upstream] Handling operation %s for tick %s (requestId: %s)",
		op.Operation, op.TickID, op.RequestID)

	u.server.mu.Lock()
	tick, ok := u.server.ticks[op.TickID]
	if !ok {
		u.server.mu.Unlock()
		u.sendOperationResponse(op.RequestID, nil, fmt.Sprintf("tick not found: %s", op.TickID))
		return
	}

	now := time.Now()
	switch op.Operation {
	case "add_note":
		if op.Payload.Message == "" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "message is required for add_note")
			return
		}
		note := fmt.Sprintf("[%s] cloud: %s", now.Format(time.RFC3339), op.Payload.Message)
		if tick.Notes != "" {
			tick.Notes += "\n"
		}
		tick.Notes += note
		tick.UpdatedAt = now.Format(time.RFC3339)

	case "approve":
		if tick.Awaiting == "" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "tick is not awaiting human action")
			return
		}
		tick.Awaiting = ""
		tick.UpdatedAt = now.Format(time.RFC3339)
		// Add note
		note := fmt.Sprintf("[%s] cloud: Approved", now.Format(time.RFC3339))
		if tick.Notes != "" {
			tick.Notes += "\n"
		}
		tick.Notes += note

	case "reject":
		if tick.Awaiting == "" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "tick is not awaiting human action")
			return
		}
		if op.Payload.Reason == "" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "reason is required for reject")
			return
		}
		tick.Awaiting = ""
		tick.Status = "open"
		tick.UpdatedAt = now.Format(time.RFC3339)
		// Add note with reason
		note := fmt.Sprintf("[%s] cloud: Rejected: %s", now.Format(time.RFC3339), op.Payload.Reason)
		if tick.Notes != "" {
			tick.Notes += "\n"
		}
		tick.Notes += note

	case "close":
		if tick.Status == "closed" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "tick is already closed")
			return
		}
		tick.Status = "closed"
		tick.UpdatedAt = now.Format(time.RFC3339)
		// Add note
		note := fmt.Sprintf("[%s] cloud: Closed", now.Format(time.RFC3339))
		if op.Payload.Reason != "" {
			note += ": " + op.Payload.Reason
		}
		if tick.Notes != "" {
			tick.Notes += "\n"
		}
		tick.Notes += note

	case "reopen":
		if tick.Status != "closed" {
			u.server.mu.Unlock()
			u.sendOperationResponse(op.RequestID, nil, "tick is not closed")
			return
		}
		tick.Status = "open"
		tick.UpdatedAt = now.Format(time.RFC3339)
		note := fmt.Sprintf("[%s] cloud: Reopened", now.Format(time.RFC3339))
		if tick.Notes != "" {
			tick.Notes += "\n"
		}
		tick.Notes += note

	default:
		u.server.mu.Unlock()
		u.sendOperationResponse(op.RequestID, nil, fmt.Sprintf("unknown operation: %s", op.Operation))
		return
	}

	u.server.ticks[op.TickID] = tick
	u.server.mu.Unlock()

	// Broadcast update to local clients
	u.server.broadcastTickEvent("update", op.TickID)

	// Send success response
	u.sendOperationResponse(op.RequestID, &tick, "")

	// Also send tick_update to keep upstream in sync
	u.sendTickUpdate(tick)
}

// sendOperationResponse sends the operation response back to upstream.
func (u *UpstreamClient) sendOperationResponse(requestID string, tick *Tick, errMsg string) {
	response := map[string]interface{}{
		"type":      "tick_operation_response",
		"requestId": requestID,
		"success":   errMsg == "",
	}
	if tick != nil {
		response["tick"] = tick
	}
	if errMsg != "" {
		response["error"] = errMsg
		log.Printf("[Upstream] Operation %s failed: %s", requestID, errMsg)
	}
	u.sendJSON(response)
}

// applyRemoteState applies full state from upstream to local store.
func (u *UpstreamClient) applyRemoteState(ticks map[string]Tick) {
	u.server.mu.Lock()
	defer u.server.mu.Unlock()

	for id, remoteTick := range ticks {
		localTick, exists := u.server.ticks[id]
		if !exists {
			// Tick doesn't exist locally - create it
			u.server.ticks[id] = remoteTick
			continue
		}

		// Only apply if remote is newer (compare timestamps)
		remoteTime, _ := time.Parse(time.RFC3339, remoteTick.UpdatedAt)
		localTime, _ := time.Parse(time.RFC3339, localTick.UpdatedAt)
		if remoteTime.After(localTime) {
			u.server.ticks[id] = remoteTick
		}
	}
}

// applyRemoteTick applies a single tick update from upstream.
func (u *UpstreamClient) applyRemoteTick(remoteTick Tick, isCreate bool) {
	u.server.mu.Lock()
	defer u.server.mu.Unlock()

	localTick, exists := u.server.ticks[remoteTick.ID]
	if !exists {
		u.server.ticks[remoteTick.ID] = remoteTick
		return
	}

	// Only apply if remote is newer
	remoteTime, _ := time.Parse(time.RFC3339, remoteTick.UpdatedAt)
	localTime, _ := time.Parse(time.RFC3339, localTick.UpdatedAt)
	if remoteTime.After(localTime) {
		u.server.ticks[remoteTick.ID] = remoteTick
	}
}

// applyRemoteDelete applies a tick deletion from upstream.
func (u *UpstreamClient) applyRemoteDelete(id string) {
	u.server.mu.Lock()
	defer u.server.mu.Unlock()
	delete(u.server.ticks, id)
}

// sendTickUpdate sends a tick update to upstream.
func (u *UpstreamClient) sendTickUpdate(tick Tick) error {
	msg := map[string]interface{}{
		"type": "tick_update",
		"tick": tick,
	}
	return u.sendJSON(msg)
}

// SendTickCreate sends a tick creation to upstream.
func (u *UpstreamClient) SendTickCreate(tick Tick) error {
	msg := map[string]interface{}{
		"type": "tick_create",
		"tick": tick,
	}
	return u.sendJSON(msg)
}

// SendTickDelete sends a tick deletion to upstream.
func (u *UpstreamClient) SendTickDelete(id string) error {
	msg := map[string]interface{}{
		"type": "tick_delete",
		"id":   id,
	}
	return u.sendJSON(msg)
}

// sendJSON sends a JSON message to upstream.
func (u *UpstreamClient) sendJSON(msg interface{}) error {
	u.connMu.Lock()
	defer u.connMu.Unlock()

	if u.conn == nil {
		return fmt.Errorf("not connected")
	}

	return u.conn.WriteJSON(msg)
}

// Close closes the upstream connection.
func (u *UpstreamClient) Close() error {
	u.connMu.Lock()
	defer u.connMu.Unlock()

	if u.conn != nil {
		closeMsg := websocket.FormatCloseMessage(websocket.CloseGoingAway, "client shutting down")
		u.conn.WriteControl(websocket.CloseMessage, closeMsg, time.Now().Add(5*time.Second))
		err := u.conn.Close()
		u.conn = nil
		return err
	}
	return nil
}

// IsConnected returns true if connected to upstream.
func (u *UpstreamClient) IsConnected() bool {
	return u.connected
}

// ============================================================================
// Main
// ============================================================================

func main() {
	port := flag.Int("port", 8787, "Port to listen on")
	upstream := flag.String("upstream", "", "Upstream WebSocket URL (e.g., ws://localhost:8787)")
	project := flag.String("project", "", "Project ID for upstream connection")
	token := flag.String("token", "", "Auth token for upstream connection")
	flag.Parse()

	server := NewTestServer()

	// Set up upstream client if configured
	var upstreamClient *UpstreamClient
	if *upstream != "" {
		if *project == "" {
			log.Fatal("--project is required when --upstream is set")
		}
		if *token == "" {
			log.Fatal("--token is required when --upstream is set")
		}

		upstreamClient = NewUpstreamClient(*upstream, *project, *token, server)
		server.upstreamClient = upstreamClient

		log.Printf("[Upstream] Configured to connect to %s for project %s", *upstream, *project)
	}

	// Set up context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutdown signal received")
		cancel()
		if upstreamClient != nil {
			upstreamClient.Close()
		}
		os.Exit(0)
	}()

	// Start upstream client if configured
	if upstreamClient != nil {
		go func() {
			if err := upstreamClient.Run(ctx); err != nil && err != context.Canceled {
				log.Printf("[Upstream] Client stopped: %v", err)
			}
		}()
	}

	// Set up static file serving
	staticContent, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatal(err)
	}
	staticHandler := http.FileServer(http.FS(staticContent))

	// Set up HTTP server
	mux := http.NewServeMux()

	// WebSocket routes (using gorilla/websocket)
	mux.HandleFunc("/api/sync", server.handleWebSocketHTTP)
	mux.HandleFunc("/api/projects/", server.handleWebSocketHTTP)

	// API routes
	mux.Handle("/api/", server)
	mux.Handle("/test/", server)
	mux.Handle("/health", server)

	// Static files for root
	mux.Handle("/", staticHandler)

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("Test rig server starting on http://localhost%s", addr)
	log.Printf("Endpoints:")
	log.Printf("  UI:        GET  /")
	log.Printf("  SSE:       GET  /api/events")
	log.Printf("  RunStream: GET  /api/run-stream/:epicId")
	log.Printf("  WebSocket: WS   /api/sync")
	log.Printf("  Control:   POST /test/emit, /test/reset, /test/scenario")
	log.Printf("  Inspect:   GET  /test/writes, /test/ticks, /test/clients")
	if *upstream != "" {
		log.Printf("  Upstream:  WS   %s (project: %s)", *upstream, *project)
	}

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
		os.Exit(1)
	}
}
