package cloud

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gorilla/websocket"

	"github.com/pengelbrecht/ticks/internal/tick"
)

const (
	// DefaultCloudURL is the default ticks.sh WebSocket endpoint (relay mode).
	DefaultCloudURL = "wss://ticks.sh/agent"

	// DefaultSyncURL is the default ticks.sh WebSocket endpoint (sync mode).
	DefaultSyncURL = "wss://ticks.sh/api/projects"

	// EnvToken is the environment variable for the cloud token.
	EnvToken = "TICKS_TOKEN"

	// EnvCloudURL is the environment variable to override the cloud URL.
	EnvCloudURL = "TICKS_URL"

	// ConfigFileName is the name of the config file in user's home directory.
	ConfigFileName = ".ticksrc"
)

// ClientMode defines how the client communicates with the cloud.
type ClientMode string

const (
	// ModeRelay uses the legacy relay protocol (proxy HTTP requests).
	ModeRelay ClientMode = "relay"

	// ModeSync uses the new DO sync protocol (real-time tick sync).
	ModeSync ClientMode = "sync"
)

// SyncState represents the connection state for sync mode.
type SyncState int

const (
	// SyncDisconnected means not connected to the cloud.
	SyncDisconnected SyncState = iota
	// SyncConnecting means attempting to connect.
	SyncConnecting
	// SyncConnected means connected and syncing.
	SyncConnected
	// SyncError means last connection attempt failed.
	SyncError
)

func (s SyncState) String() string {
	switch s {
	case SyncDisconnected:
		return "disconnected"
	case SyncConnecting:
		return "connecting"
	case SyncConnected:
		return "connected"
	case SyncError:
		return "error"
	default:
		return "unknown"
	}
}

// Client manages the connection to ticks.sh cloud.
type Client struct {
	token      string
	cloudURL   string
	boardName  string
	machineID  string
	localAddr  string // e.g., "http://localhost:3000"
	tickDir    string // path to .tick directory
	mode       ClientMode

	conn   *websocket.Conn
	connMu sync.Mutex

	// Reconnection state
	reconnecting bool
	stopChan     chan struct{}

	// Sync state tracking
	syncState   SyncState
	syncStateMu sync.RWMutex
	lastSync    time.Time

	// Offline queue for pending changes (sync mode)
	pendingMessages   []json.RawMessage
	pendingMessagesMu sync.Mutex

	// Sync mode: file watcher
	watcher *fsnotify.Watcher

	// Sync mode: callback for remote changes (optional)
	OnRemoteChange func(t tick.Tick)

	// Sync mode: state change callback (optional)
	OnStateChange func(state SyncState)

	// Sync mode: track pending files to avoid echo
	pendingWrites   map[string]time.Time
	pendingWritesMu sync.Mutex
}

// Config holds the cloud client configuration.
type Config struct {
	Token     string
	CloudURL  string
	BoardName string
	MachineID string
	LocalAddr string
	TickDir   string     // path to .tick directory (required for sync mode)
	Mode      ClientMode // relay or sync (default: relay)
}

// Message types for WebSocket communication.
type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// RegisterMessage is sent to register the board with the cloud.
type RegisterMessage struct {
	Token     string `json:"token"`
	BoardName string `json:"board_name"`
	MachineID string `json:"machine_id"`
}

// RequestMessage is a relayed HTTP request from the cloud.
type RequestMessage struct {
	ID      string            `json:"id"`
	Method  string            `json:"method"`
	Path    string            `json:"path"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
}

// ResponseMessage is the response to send back to the cloud.
type ResponseMessage struct {
	ID         string            `json:"id"`
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers,omitempty"`
	Body       string            `json:"body,omitempty"`
}

// EventMessage is an event pushed to the cloud for SSE broadcast.
type EventMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// SyncFullMessage sends all ticks to the DO for initial sync.
type SyncFullMessage struct {
	Type  string               `json:"type"` // "sync_full"
	Ticks map[string]tick.Tick `json:"ticks"`
}

// TickUpdateMessage sends a single tick update to the DO.
type TickUpdateMessage struct {
	Type string    `json:"type"` // "tick_update" or "tick_create"
	Tick tick.Tick `json:"tick"`
}

// TickDeleteMessage notifies DO of tick deletion.
type TickDeleteMessage struct {
	Type string `json:"type"` // "tick_delete"
	ID   string `json:"id"`
}

// StateFullMessage is received from DO with full tick state.
type StateFullMessage struct {
	Type  string               `json:"type"` // "state_full"
	Ticks map[string]tick.Tick `json:"ticks"`
}

// TickUpdatedMessage is received from DO when a tick is updated.
type TickUpdatedMessage struct {
	Type string    `json:"type"` // "tick_updated" or "tick_created"
	Tick tick.Tick `json:"tick"`
}

// TickDeletedMessage is received from DO when a tick is deleted.
type TickDeletedMessage struct {
	Type string `json:"type"` // "tick_deleted"
	ID   string `json:"id"`
}

// TickOperationRequest is received from DO when cloud UI wants to perform an operation.
type TickOperationRequest struct {
	Type      string `json:"type"`       // "tick_operation"
	RequestID string `json:"requestId"`  // Unique ID to correlate response
	Operation string `json:"operation"`  // "add_note", "approve", "reject", "close", "reopen"
	TickID    string `json:"tickId"`     // ID of the tick to operate on
	Payload   struct {
		Message string `json:"message,omitempty"` // For add_note
		Reason  string `json:"reason,omitempty"`  // For reject, close
	} `json:"payload,omitempty"`
}

// TickOperationResponse is sent back to DO after performing an operation.
type TickOperationResponse struct {
	Type      string     `json:"type"`              // "tick_operation_response"
	RequestID string     `json:"requestId"`         // Matches the request ID
	Success   bool       `json:"success"`           // Whether the operation succeeded
	Tick      *tick.Tick `json:"tick,omitempty"`    // Updated tick on success
	Error     string     `json:"error,omitempty"`   // Error message on failure
}

// RunEventMessage sends live output events to the DO.
type RunEventMessage struct {
	Type   string        `json:"type"`            // "run_event"
	EpicID string        `json:"epicId"`          // The epic being worked on
	TaskID string        `json:"taskId,omitempty"` // Task ID (if task-level output)
	Source string        `json:"source"`          // "ralph", "swarm-orchestrator", "swarm-subagent"
	Event  RunEventData  `json:"event"`           // The event data
}

// RunEventData contains the details of a run event.
type RunEventData struct {
	Type       string                 `json:"type"`                 // Event type: task-started, task-update, etc.
	Output     string                 `json:"output,omitempty"`     // Current output text
	Status     string                 `json:"status,omitempty"`     // Status text
	NumTurns   int                    `json:"numTurns,omitempty"`   // Number of turns
	Iteration  int                    `json:"iteration,omitempty"`  // Iteration number
	Success    bool                   `json:"success,omitempty"`    // Whether completed successfully
	Metrics    *RunEventMetrics       `json:"metrics,omitempty"`    // Cost/token metrics
	ActiveTool *RunEventTool          `json:"activeTool,omitempty"` // Currently active tool
	Message    string                 `json:"message,omitempty"`    // Human-readable message
	Timestamp  string                 `json:"timestamp"`            // ISO timestamp
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

// NewClient creates a new cloud client with the given configuration.
func NewClient(cfg Config) (*Client, error) {
	if cfg.Token == "" {
		return nil, fmt.Errorf("token is required")
	}

	mode := cfg.Mode
	if mode == "" {
		mode = ModeRelay // default to relay for backward compatibility
	}

	cloudURL := cfg.CloudURL
	if cloudURL == "" {
		if mode == ModeSync {
			cloudURL = DefaultSyncURL
		} else {
			cloudURL = DefaultCloudURL
		}
	}

	// Sync mode requires tickDir
	if mode == ModeSync && cfg.TickDir == "" {
		return nil, fmt.Errorf("tickDir is required for sync mode")
	}

	return &Client{
		token:         cfg.Token,
		cloudURL:      cloudURL,
		boardName:     cfg.BoardName,
		machineID:     cfg.MachineID,
		localAddr:     cfg.LocalAddr,
		tickDir:       cfg.TickDir,
		mode:          mode,
		stopChan:      make(chan struct{}),
		pendingWrites: make(map[string]time.Time),
	}, nil
}

// LoadConfig loads the cloud configuration from environment and config file.
// Returns nil config if no token is configured (cloud is optional).
func LoadConfig(tickDir string, localPort int) *Config {
	// Read config file
	fileCfg := readConfigFile()

	// Try environment variable first, fall back to config file
	token := os.Getenv(EnvToken)
	if token == "" {
		token = fileCfg.Token
	}

	// No token means cloud is not configured
	if token == "" {
		return nil
	}

	// Get cloud URL: env var > config file > let NewClient choose default based on mode
	cloudURL := os.Getenv(EnvCloudURL)
	if cloudURL == "" {
		cloudURL = fileCfg.URL
	}
	// Don't set default here - NewClient will choose based on mode

	// Derive board name from .tick directory or parent directory name
	boardName := deriveBoardName(tickDir)

	// Generate a machine ID (use hostname for simplicity)
	machineID, _ := os.Hostname()
	if machineID == "" {
		machineID = "unknown"
	}

	return &Config{
		Token:     token,
		CloudURL:  cloudURL,
		BoardName: boardName,
		MachineID: machineID,
		LocalAddr: fmt.Sprintf("http://localhost:%d", localPort),
		TickDir:   tickDir,
		Mode:      ModeRelay, // default to relay; caller can change to ModeSync
	}
}

// configFile holds values read from ~/.ticksrc.
type configFile struct {
	Token string
	URL   string
}

// readConfigFile reads token and URL from ~/.ticksrc.
func readConfigFile() configFile {
	var cfg configFile

	home, err := os.UserHomeDir()
	if err != nil {
		return cfg
	}

	configPath := filepath.Join(home, ConfigFileName)
	data, err := os.ReadFile(configPath)
	if err != nil {
		return cfg
	}

	// Key=value format: token=xxx, url=xxx
	content := strings.TrimSpace(string(data))
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "token=") {
			cfg.Token = strings.TrimPrefix(line, "token=")
		} else if strings.HasPrefix(line, "url=") {
			cfg.URL = strings.TrimPrefix(line, "url=")
		} else if cfg.Token == "" {
			// Legacy: first non-empty line without key= is token
			cfg.Token = line
		}
	}
	return cfg
}

// deriveBoardName returns the full repo name in format "owner/repo[:worktree]".
// Falls back to directory name if git info is unavailable.
func deriveBoardName(tickDir string) string {
	repoDir := filepath.Dir(tickDir)

	// Try to get the remote URL
	cmd := exec.Command("git", "-C", repoDir, "remote", "get-url", "origin")
	out, err := cmd.Output()
	if err != nil {
		// Fallback to directory name
		return filepath.Base(repoDir)
	}

	// Parse the remote URL to extract owner/repo
	remoteURL := strings.TrimSpace(string(out))
	repoName := parseGitRemote(remoteURL)
	if repoName == "" {
		return filepath.Base(repoDir)
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

// Connect establishes the WebSocket connection to the cloud.
func (c *Client) Connect(ctx context.Context) error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	// Build the connection URL based on mode
	var wsURL string
	// URL-encode board name for path (encodes / as %2F)
	encodedBoardName := url.PathEscape(c.boardName)
	if c.mode == ModeSync {
		// Sync mode: connect to /api/projects/:project/sync with token in query
		wsURL = fmt.Sprintf("%s/%s/sync?token=%s&type=local", c.cloudURL, encodedBoardName, c.token)
	} else {
		// Relay mode: connect to /agent endpoint with auth info in URL
		// This allows the main worker to validate before passing to DO
		wsURL = fmt.Sprintf("%s?token=%s&board=%s&machine=%s", c.cloudURL, url.QueryEscape(c.token), url.QueryEscape(c.boardName), url.QueryEscape(c.machineID))
	}

	// Extract hostname for TLS ServerName (needed if connecting via IP)
	cloudHost := "ticks.sh"
	if strings.Contains(c.cloudURL, "://") {
		parts := strings.SplitN(c.cloudURL, "://", 2)
		if len(parts) == 2 {
			hostPort := strings.SplitN(parts[1], "/", 2)[0]
			cloudHost = strings.SplitN(hostPort, ":", 2)[0]
		}
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
		TLSClientConfig: &tls.Config{
			ServerName: cloudHost,
		},
		NetDialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// Force IPv4 by resolving and picking IPv4 address
			hostPart, port, err := net.SplitHostPort(addr)
			if err != nil {
				return (&net.Dialer{}).DialContext(ctx, network, addr)
			}

			ips, err := net.LookupIP(hostPart)
			if err != nil {
				return (&net.Dialer{}).DialContext(ctx, network, addr)
			}

			// Find first IPv4 address
			for _, ip := range ips {
				if ip4 := ip.To4(); ip4 != nil {
					return (&net.Dialer{}).DialContext(ctx, "tcp4", net.JoinHostPort(ip4.String(), port))
				}
			}

			return (&net.Dialer{}).DialContext(ctx, network, addr)
		},
	}

	conn, resp, err := dialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		// Check for specific auth errors from response
		if resp != nil {
			// Debug: print full response info
			fmt.Fprintf(os.Stderr, "cloud: WebSocket dial failed - status=%d url=%s\n", resp.StatusCode, wsURL)
			switch resp.StatusCode {
			case 401:
				return fmt.Errorf("authentication failed: missing or invalid token")
			case 403:
				return fmt.Errorf("access denied: token invalid, expired, or no access to project")
			}
		}
		return fmt.Errorf("failed to connect to cloud: %w", err)
	}

	c.conn = conn

	// Relay mode: send registration message
	if c.mode == ModeRelay {
		regMsg := RegisterMessage{
			Token:     c.token,
			BoardName: c.boardName,
			MachineID: c.machineID,
		}
		regData, _ := json.Marshal(regMsg)
		msg := Message{Type: "register", Data: regData}

		if err := conn.WriteJSON(msg); err != nil {
			conn.Close()
			c.conn = nil
			return fmt.Errorf("failed to register with cloud: %w", err)
		}
	}
	// Sync mode: authentication is handled by token in URL query param

	return nil
}

// Run connects to the cloud and handles messages until context is cancelled.
// It automatically reconnects with exponential backoff on disconnection.
func (c *Client) Run(ctx context.Context) error {
	backoff := time.Second
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-ctx.Done():
			c.setSyncState(SyncDisconnected)
			c.Close()
			return ctx.Err()
		case <-c.stopChan:
			c.setSyncState(SyncDisconnected)
			c.Close()
			return nil
		default:
		}

		c.setSyncState(SyncConnecting)

		// Try to connect
		if err := c.Connect(ctx); err != nil {
			c.setSyncState(SyncError)
			pending := c.PendingCount()
			if pending > 0 {
				fmt.Fprintf(os.Stderr, "cloud: connection failed: %v (retrying in %v, %d pending)\n", err, backoff, pending)
			} else {
				fmt.Fprintf(os.Stderr, "cloud: connection failed: %v (retrying in %v)\n", err, backoff)
			}
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			// Exponential backoff
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			continue
		}

		c.setSyncState(SyncConnected)

		if c.mode == ModeSync {
			fmt.Fprintf(os.Stderr, "cloud: connected (sync mode) to %s as %s\n", c.cloudURL, c.boardName)
		} else {
			fmt.Fprintf(os.Stderr, "cloud: connected (relay mode) to %s as %s/%s\n", c.cloudURL, c.boardName, c.machineID)
		}
		backoff = time.Second // Reset backoff on successful connection

		// Sync mode: start file watcher and send initial state
		if c.mode == ModeSync {
			if err := c.startSyncMode(ctx); err != nil {
				fmt.Fprintf(os.Stderr, "cloud: sync setup failed: %v (reconnecting...)\n", err)
				c.setSyncState(SyncError)
				continue
			}

			// Flush any pending messages from offline queue
			if err := c.flushPendingMessages(); err != nil {
				fmt.Fprintf(os.Stderr, "cloud: flush failed: %v (will retry)\n", err)
			}
		}

		// Handle messages until disconnection
		if err := c.handleMessages(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			c.setSyncState(SyncDisconnected)
			fmt.Fprintf(os.Stderr, "cloud: disconnected: %v (reconnecting...)\n", err)
		}

		// Stop file watcher on disconnect (will restart on reconnect)
		c.stopFileWatcher()
	}
}

// handleMessages reads and processes messages from the cloud.
func (c *Client) handleMessages(ctx context.Context) error {
	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		return fmt.Errorf("connection closed")
	}

	// Set up pong handler to reset read deadline when pong received
	conn.SetPongHandler(func(appData string) error {
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	// Start ping sender goroutine to keep connection alive
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
				c.connMu.Lock()
				conn := c.conn
				c.connMu.Unlock()
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

		c.connMu.Lock()
		conn := c.conn
		c.connMu.Unlock()

		if conn == nil {
			return fmt.Errorf("connection closed")
		}

		// Set read deadline (extended by pong handler)
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))

		// Read raw message
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return nil
			}
			return fmt.Errorf("read error: %w", err)
		}

		// Handle the message based on mode
		if c.mode == ModeSync {
			// Sync mode: messages are direct JSON (not wrapped in {type, data})
			c.handleSyncMessageRaw(rawMsg)
		} else {
			// Relay mode: messages use {type, data} wrapper
			var msg Message
			if err := json.Unmarshal(rawMsg, &msg); err != nil {
				fmt.Fprintf(os.Stderr, "cloud: invalid message: %v\n", err)
				continue
			}
			c.handleRelayMessage(msg)
		}
	}
}

// handleRelayMessage handles messages in relay mode.
func (c *Client) handleRelayMessage(msg Message) {
	switch msg.Type {
	case "ping":
		// Respond with pong
		c.sendMessage(Message{Type: "pong"})

	case "registered":
		// Registration confirmed by server - no action needed

	case "request":
		// Handle relayed HTTP request
		var req RequestMessage
		if err := json.Unmarshal(msg.Data, &req); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: invalid request message: %v\n", err)
			return
		}
		go c.handleRequest(req)

	case "error":
		fmt.Fprintf(os.Stderr, "cloud: server error: %s\n", string(msg.Data))

	default:
		fmt.Fprintf(os.Stderr, "cloud: unknown message type: %s\n", msg.Type)
	}
}

// handleSyncMessageRaw handles raw JSON messages in sync mode.
// Sync mode uses direct JSON format: {"type": "...", ...} without the relay wrapper.
func (c *Client) handleSyncMessageRaw(data []byte) {
	// First extract just the type field
	var typeOnly struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeOnly); err != nil {
		fmt.Fprintf(os.Stderr, "cloud: invalid sync message: %v\n", err)
		return
	}

	switch typeOnly.Type {
	case "state_full":
		// Full state received from DO (initial sync or after our sync_full)
		var stateMsg StateFullMessage
		if err := json.Unmarshal(data, &stateMsg); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: invalid state_full message: %v\n", err)
			return
		}
		c.applyRemoteState(stateMsg.Ticks)

	case "tick_updated", "tick_created":
		// Single tick update from DO
		var tickMsg TickUpdatedMessage
		if err := json.Unmarshal(data, &tickMsg); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: invalid tick message: %v\n", err)
			return
		}
		c.applyRemoteTick(tickMsg.Tick)

	case "tick_deleted":
		// Tick deleted notification from DO
		var delMsg TickDeletedMessage
		if err := json.Unmarshal(data, &delMsg); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: invalid tick_deleted message: %v\n", err)
			return
		}
		c.applyRemoteDelete(delMsg.ID)

	case "tick_operation":
		// Operation request from cloud UI (via DO)
		var opMsg TickOperationRequest
		if err := json.Unmarshal(data, &opMsg); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: invalid tick_operation message: %v\n", err)
			return
		}
		go c.handleTickOperation(opMsg)

	case "error":
		var errMsg struct {
			Message string `json:"message"`
		}
		json.Unmarshal(data, &errMsg)
		fmt.Fprintf(os.Stderr, "cloud: server error: %s\n", errMsg.Message)

	default:
		fmt.Fprintf(os.Stderr, "cloud: unknown sync message type: %s\n", typeOnly.Type)
	}
}

// handleRequest processes a relayed HTTP request.
func (c *Client) handleRequest(req RequestMessage) {
	// Build the local URL
	url := c.localAddr + req.Path

	// Create the HTTP request
	var body io.Reader
	if req.Body != "" {
		body = strings.NewReader(req.Body)
	}

	httpReq, err := http.NewRequest(req.Method, url, body)
	if err != nil {
		c.sendResponse(ResponseMessage{
			ID:         req.ID,
			StatusCode: 500,
			Body:       fmt.Sprintf("failed to create request: %v", err),
		})
		return
	}

	// Copy headers
	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	// Execute the request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.sendResponse(ResponseMessage{
			ID:         req.ID,
			StatusCode: 502,
			Body:       fmt.Sprintf("local request failed: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	respBody, _ := io.ReadAll(resp.Body)

	// Build response headers
	headers := make(map[string]string)
	for k := range resp.Header {
		headers[k] = resp.Header.Get(k)
	}

	// Send response back to cloud
	c.sendResponse(ResponseMessage{
		ID:         req.ID,
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       string(respBody),
	})
}

// sendMessage sends a message to the cloud.
func (c *Client) sendMessage(msg Message) error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	if c.conn == nil {
		return fmt.Errorf("not connected")
	}

	return c.conn.WriteJSON(msg)
}

// sendResponse sends a response message to the cloud.
func (c *Client) sendResponse(resp ResponseMessage) error {
	data, _ := json.Marshal(resp)
	return c.sendMessage(Message{Type: "response", Data: data})
}

// Close closes the connection to the cloud with a proper WebSocket close handshake.
func (c *Client) Close() error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	if c.conn != nil {
		// Send proper WebSocket close frame so DO detects disconnect immediately
		closeMsg := websocket.FormatCloseMessage(websocket.CloseGoingAway, "client shutting down")
		c.conn.WriteControl(websocket.CloseMessage, closeMsg, time.Now().Add(5*time.Second))
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

// Stop signals the client to stop and close.
func (c *Client) Stop() {
	close(c.stopChan)
}

// IsConnected returns true if the client is currently connected.
func (c *Client) IsConnected() bool {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	return c.conn != nil
}

// GetSyncState returns the current sync state.
func (c *Client) GetSyncState() SyncState {
	c.syncStateMu.RLock()
	defer c.syncStateMu.RUnlock()
	return c.syncState
}

// setSyncState updates the sync state and calls the callback if set.
func (c *Client) setSyncState(state SyncState) {
	c.syncStateMu.Lock()
	c.syncState = state
	if state == SyncConnected {
		c.lastSync = time.Now()
	}
	c.syncStateMu.Unlock()

	if c.OnStateChange != nil {
		c.OnStateChange(state)
	}
}

// GetLastSync returns the time of the last successful sync.
func (c *Client) GetLastSync() time.Time {
	c.syncStateMu.RLock()
	defer c.syncStateMu.RUnlock()
	return c.lastSync
}

// PendingCount returns the number of queued messages waiting to be sent.
func (c *Client) PendingCount() int {
	c.pendingMessagesMu.Lock()
	defer c.pendingMessagesMu.Unlock()
	return len(c.pendingMessages)
}

// queueMessage adds a message to the offline queue.
func (c *Client) queueMessage(data json.RawMessage) {
	c.pendingMessagesMu.Lock()
	defer c.pendingMessagesMu.Unlock()
	c.pendingMessages = append(c.pendingMessages, data)
}

// flushPendingMessages sends all queued messages.
func (c *Client) flushPendingMessages() error {
	c.pendingMessagesMu.Lock()
	pending := c.pendingMessages
	c.pendingMessages = nil
	c.pendingMessagesMu.Unlock()

	if len(pending) == 0 {
		return nil
	}

	fmt.Fprintf(os.Stderr, "cloud: flushing %d pending messages\n", len(pending))

	for _, data := range pending {
		c.connMu.Lock()
		conn := c.conn
		c.connMu.Unlock()

		if conn == nil {
			// Re-queue and abort
			c.pendingMessagesMu.Lock()
			c.pendingMessages = append(pending, c.pendingMessages...)
			c.pendingMessagesMu.Unlock()
			return fmt.Errorf("connection closed while flushing")
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			// Re-queue remaining and abort
			c.pendingMessagesMu.Lock()
			c.pendingMessages = append(pending, c.pendingMessages...)
			c.pendingMessagesMu.Unlock()
			return fmt.Errorf("write failed: %w", err)
		}
	}

	return nil
}

// PushEvent sends an event to the cloud for SSE broadcast to connected clients.
// eventType is the SSE event type (e.g., "tick_update", "tick_create").
// payload is the event data to be JSON-serialized.
func (c *Client) PushEvent(eventType string, payload interface{}) error {
	event := EventMessage{
		Type:    eventType,
		Payload: payload,
	}
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}
	return c.sendMessage(Message{Type: "event", Data: data})
}

// ============================================================================
// Sync Mode Methods
// ============================================================================

// startSyncMode initializes sync mode: starts file watcher and sends initial state.
func (c *Client) startSyncMode(ctx context.Context) error {
	// Create file watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create file watcher: %w", err)
	}
	c.watcher = watcher

	// Watch the issues directory
	issuesDir := filepath.Join(c.tickDir, "issues")
	if err := watcher.Add(issuesDir); err != nil {
		watcher.Close()
		c.watcher = nil
		return fmt.Errorf("failed to watch issues directory: %w", err)
	}

	// Load all ticks and send initial state
	ticks, err := c.loadAllTicks()
	if err != nil {
		watcher.Close()
		c.watcher = nil
		return fmt.Errorf("failed to load ticks: %w", err)
	}

	if err := c.SyncFullState(ticks); err != nil {
		watcher.Close()
		c.watcher = nil
		return fmt.Errorf("failed to send initial state: %w", err)
	}

	// Start watching for file changes in background
	go c.watchFileChanges(ctx)

	return nil
}

// stopFileWatcher stops the file watcher if running.
func (c *Client) stopFileWatcher() {
	if c.watcher != nil {
		c.watcher.Close()
		c.watcher = nil
	}
}

// loadAllTicks loads ticks from .tick/issues/ for syncing.
// Only syncs open ticks and recently closed ticks (within 24h) to reduce payload size.
func (c *Client) loadAllTicks() (map[string]tick.Tick, error) {
	store := tick.NewStore(c.tickDir)
	allTicks, err := store.List()
	if err != nil {
		return nil, err
	}

	// Include open ticks + ticks closed within the last 24 hours
	closedCutoff := time.Now().Add(-24 * time.Hour)
	result := make(map[string]tick.Tick)
	for _, t := range allTicks {
		// Include if: not closed (ClosedAt is nil) OR closed recently
		if t.ClosedAt == nil || t.ClosedAt.After(closedCutoff) {
			result[t.ID] = t
		}
	}
	return result, nil
}

// watchFileChanges watches for changes in .tick/issues/ and syncs to DO.
func (c *Client) watchFileChanges(ctx context.Context) {
	debounce := make(map[string]time.Time)
	const debounceDelay = 100 * time.Millisecond

	for {
		// Check if watcher is still valid
		if c.watcher == nil {
			return
		}

		select {
		case <-ctx.Done():
			return
		case event, ok := <-c.watcher.Events:
			if !ok {
				return
			}

			// Only handle .json files
			if !strings.HasSuffix(event.Name, ".json") {
				continue
			}

			// Debounce: skip if we just processed this file
			if lastTime, exists := debounce[event.Name]; exists {
				if time.Since(lastTime) < debounceDelay {
					continue
				}
			}
			debounce[event.Name] = time.Now()

			// Check if this is a file we just wrote (from remote change)
			c.pendingWritesMu.Lock()
			if writeTime, exists := c.pendingWrites[event.Name]; exists {
				if time.Since(writeTime) < time.Second {
					// Skip - this is an echo of our own write
					delete(c.pendingWrites, event.Name)
					c.pendingWritesMu.Unlock()
					continue
				}
				delete(c.pendingWrites, event.Name)
			}
			c.pendingWritesMu.Unlock()

			if event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
				// File created or modified - sync to DO
				t, err := c.loadTickFromFile(event.Name)
				if err != nil {
					fmt.Fprintf(os.Stderr, "cloud: failed to load tick %s: %v\n", event.Name, err)
					continue
				}
				if err := c.SyncTick(t); err != nil {
					fmt.Fprintf(os.Stderr, "cloud: failed to sync tick %s: %v\n", t.ID, err)
				}
			} else if event.Op&fsnotify.Remove != 0 {
				// File removed - notify DO
				id := c.extractTickID(event.Name)
				if id != "" {
					if err := c.SyncDelete(id); err != nil {
						fmt.Fprintf(os.Stderr, "cloud: failed to sync delete %s: %v\n", id, err)
					}
				}
			}

		case err, ok := <-c.watcher.Errors:
			if !ok {
				return
			}
			fmt.Fprintf(os.Stderr, "cloud: file watcher error: %v\n", err)
		}
	}
}

// loadTickFromFile loads a tick from a .json file.
func (c *Client) loadTickFromFile(path string) (tick.Tick, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return tick.Tick{}, err
	}

	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		return tick.Tick{}, err
	}
	return t, nil
}

// extractTickID extracts the tick ID from a file path.
func (c *Client) extractTickID(path string) string {
	base := filepath.Base(path)
	if strings.HasSuffix(base, ".json") {
		return strings.TrimSuffix(base, ".json")
	}
	return ""
}

// SyncTick sends a tick update to the DO.
func (c *Client) SyncTick(t tick.Tick) error {
	msg := TickUpdateMessage{
		Type: "tick_update",
		Tick: t,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		// Queue for later when reconnected
		c.queueMessage(data)
		return nil
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		// Connection failed, queue for later
		c.queueMessage(data)
		return nil
	}

	return nil
}

// SyncFullState sends all ticks to the DO for initial sync.
func (c *Client) SyncFullState(ticks map[string]tick.Tick) error {
	msg := SyncFullMessage{
		Type:  "sync_full",
		Ticks: ticks,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.connMu.Lock()
	defer c.connMu.Unlock()

	if c.conn == nil {
		return fmt.Errorf("not connected")
	}

	return c.conn.WriteMessage(websocket.TextMessage, data)
}

// SyncDelete notifies the DO of a tick deletion.
func (c *Client) SyncDelete(id string) error {
	msg := TickDeleteMessage{
		Type: "tick_delete",
		ID:   id,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		// Queue for later when reconnected
		c.queueMessage(data)
		return nil
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		// Connection failed, queue for later
		c.queueMessage(data)
		return nil
	}

	return nil
}

// applyRemoteState applies full state from DO to local .tick/issues/.
func (c *Client) applyRemoteState(ticks map[string]tick.Tick) {
	store := tick.NewStore(c.tickDir)

	for id, remoteTick := range ticks {
		localTick, err := store.Read(id)
		if err != nil {
			// Tick doesn't exist locally - create it
			c.writeTickLocally(remoteTick)
			continue
		}

		// Only apply if remote is newer
		if remoteTick.UpdatedAt.After(localTick.UpdatedAt) {
			c.writeTickLocally(remoteTick)
		}
	}
}

// applyRemoteTick applies a single tick update from DO to local .tick/issues/.
func (c *Client) applyRemoteTick(remoteTick tick.Tick) {
	store := tick.NewStore(c.tickDir)

	localTick, err := store.Read(remoteTick.ID)
	if err != nil {
		// Tick doesn't exist locally - create it
		c.writeTickLocally(remoteTick)
		return
	}

	// Only apply if remote is newer
	if remoteTick.UpdatedAt.After(localTick.UpdatedAt) {
		c.writeTickLocally(remoteTick)
	}

	// Call the callback if set
	if c.OnRemoteChange != nil {
		c.OnRemoteChange(remoteTick)
	}
}

// applyRemoteDelete deletes a tick file locally.
func (c *Client) applyRemoteDelete(id string) {
	path := filepath.Join(c.tickDir, "issues", id+".json")

	// Mark as pending to avoid echo
	c.pendingWritesMu.Lock()
	c.pendingWrites[path] = time.Now()
	c.pendingWritesMu.Unlock()

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "cloud: failed to delete local tick %s: %v\n", id, err)
	}
}

// writeTickLocally writes a tick to .tick/issues/, tracking as pending to avoid echo.
func (c *Client) writeTickLocally(t tick.Tick) {
	path := filepath.Join(c.tickDir, "issues", t.ID+".json")

	// Mark as pending to avoid echo
	c.pendingWritesMu.Lock()
	c.pendingWrites[path] = time.Now()
	c.pendingWritesMu.Unlock()

	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "cloud: failed to marshal tick %s: %v\n", t.ID, err)
		return
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "cloud: failed to write tick %s: %v\n", t.ID, err)
	}
}

// handleTickOperation handles operation requests from cloud UI via DO.
func (c *Client) handleTickOperation(req TickOperationRequest) {
	fmt.Printf("cloud: handling operation %s for tick %s (requestId: %s)\n",
		req.Operation, req.TickID, req.RequestID)

	// Load the tick
	path := filepath.Join(c.tickDir, "issues", req.TickID+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		c.sendOperationResponse(req.RequestID, nil, fmt.Sprintf("tick not found: %v", err))
		return
	}

	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		c.sendOperationResponse(req.RequestID, nil, fmt.Sprintf("failed to parse tick: %v", err))
		return
	}

	// Perform the operation
	now := time.Now()
	switch req.Operation {
	case "add_note":
		if req.Payload.Message == "" {
			c.sendOperationResponse(req.RequestID, nil, "message is required for add_note")
			return
		}
		note := fmt.Sprintf("%s - (from: cloud) %s", now.Format("2006-01-02 15:04"), req.Payload.Message)
		if t.Notes != "" {
			t.Notes = t.Notes + "\n" + note
		} else {
			t.Notes = note
		}
		t.UpdatedAt = now

	case "approve":
		if t.Awaiting == nil || *t.Awaiting == "" {
			c.sendOperationResponse(req.RequestID, nil, "tick is not awaiting human action")
			return
		}
		verdict := tick.VerdictApproved
		t.Verdict = &verdict
		t.UpdatedAt = now
		// Process the verdict (may close the tick)
		tick.ProcessVerdict(&t)
		// Add note
		note := fmt.Sprintf("%s - (from: cloud) Approved", now.Format("2006-01-02 15:04"))
		if t.Notes != "" {
			t.Notes = t.Notes + "\n" + note
		} else {
			t.Notes = note
		}

	case "reject":
		if t.Awaiting == nil || *t.Awaiting == "" {
			c.sendOperationResponse(req.RequestID, nil, "tick is not awaiting human action")
			return
		}
		if req.Payload.Reason == "" {
			c.sendOperationResponse(req.RequestID, nil, "reason is required for reject")
			return
		}
		verdict := tick.VerdictRejected
		t.Verdict = &verdict
		t.UpdatedAt = now
		// Process the verdict
		tick.ProcessVerdict(&t)
		// Add note with reason
		note := fmt.Sprintf("%s - (from: cloud) Rejected: %s", now.Format("2006-01-02 15:04"), req.Payload.Reason)
		if t.Notes != "" {
			t.Notes = t.Notes + "\n" + note
		} else {
			t.Notes = note
		}

	case "close":
		if t.Status == tick.StatusClosed {
			c.sendOperationResponse(req.RequestID, nil, "tick is already closed")
			return
		}
		// Use HandleClose which respects requires gates
		routed := tick.HandleClose(&t, req.Payload.Reason)
		if routed {
			// Tick was routed to awaiting state instead of closed
			note := fmt.Sprintf("%s - (from: cloud) Close requested, awaiting %s", now.Format("2006-01-02 15:04"), *t.Awaiting)
			if t.Notes != "" {
				t.Notes = t.Notes + "\n" + note
			} else {
				t.Notes = note
			}
		} else {
			// Tick was closed directly
			note := fmt.Sprintf("%s - (from: cloud) Closed", now.Format("2006-01-02 15:04"))
			if req.Payload.Reason != "" {
				note += ": " + req.Payload.Reason
			}
			if t.Notes != "" {
				t.Notes = t.Notes + "\n" + note
			} else {
				t.Notes = note
			}
		}

	case "reopen":
		if t.Status != tick.StatusClosed {
			c.sendOperationResponse(req.RequestID, nil, "tick is not closed")
			return
		}
		t.Status = tick.StatusOpen
		t.ClosedAt = nil
		t.ClosedReason = ""
		t.Awaiting = nil
		t.Verdict = nil
		t.UpdatedAt = now
		note := fmt.Sprintf("%s - (from: cloud) Reopened", now.Format("2006-01-02 15:04"))
		if t.Notes != "" {
			t.Notes = t.Notes + "\n" + note
		} else {
			t.Notes = note
		}

	default:
		c.sendOperationResponse(req.RequestID, nil, fmt.Sprintf("unknown operation: %s", req.Operation))
		return
	}

	// Save the tick using writeTickLocally (marks as pending to avoid echo)
	c.writeTickLocally(t)

	// Send success response
	c.sendOperationResponse(req.RequestID, &t, "")

	// Also send tick_update to DO to broadcast to other clients
	updateMsg := TickUpdateMessage{
		Type: "tick_update",
		Tick: t,
	}
	c.sendSyncMessage(updateMsg)
}

// sendOperationResponse sends the operation response back to the DO.
func (c *Client) sendOperationResponse(requestID string, t *tick.Tick, errMsg string) {
	response := TickOperationResponse{
		Type:      "tick_operation_response",
		RequestID: requestID,
		Success:   errMsg == "",
		Tick:      t,
		Error:     errMsg,
	}

	if errMsg != "" {
		fmt.Fprintf(os.Stderr, "cloud: operation %s failed: %s\n", requestID, errMsg)
	}

	c.sendSyncMessage(response)
}

// sendSyncMessage sends a message in sync mode (direct JSON, no wrapper).
func (c *Client) sendSyncMessage(msg interface{}) error {
	data, err := json.Marshal(msg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "cloud: failed to marshal sync message: %v\n", err)
		return err
	}

	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		// Queue for later when reconnected
		c.queueMessage(data)
		return nil
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		// Connection failed, queue for later
		c.queueMessage(data)
		return nil
	}

	return nil
}

// SendRunEvent sends a run event to the DO for broadcast to cloud clients.
// Run events are transient (not queued when offline) since live output is ephemeral.
func (c *Client) SendRunEvent(event RunEventMessage) error {
	if c.mode != ModeSync {
		return nil // Only supported in sync mode
	}

	event.Type = "run_event"

	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		// Not connected - skip since run events are ephemeral
		return nil
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal run event: %w", err)
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		// Connection failed - skip since run events are ephemeral
		return nil
	}

	return nil
}

