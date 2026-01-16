package cloud

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// DefaultCloudURL is the default tickboard.io WebSocket endpoint.
	DefaultCloudURL = "wss://tickboard.io/agent"

	// EnvToken is the environment variable for the cloud token.
	EnvToken = "TICKBOARD_TOKEN"

	// EnvCloudURL is the environment variable to override the cloud URL.
	EnvCloudURL = "TICKBOARD_URL"

	// ConfigFileName is the name of the config file in user's home directory.
	ConfigFileName = ".tickboardrc"
)

// Client manages the connection to tickboard.io cloud.
type Client struct {
	token      string
	cloudURL   string
	boardName  string
	machineID  string
	localAddr  string // e.g., "http://localhost:3000"

	conn   *websocket.Conn
	connMu sync.Mutex

	// Reconnection state
	reconnecting bool
	stopChan     chan struct{}
}

// Config holds the cloud client configuration.
type Config struct {
	Token     string
	CloudURL  string
	BoardName string
	MachineID string
	LocalAddr string
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

// NewClient creates a new cloud client with the given configuration.
func NewClient(cfg Config) (*Client, error) {
	if cfg.Token == "" {
		return nil, fmt.Errorf("token is required")
	}

	cloudURL := cfg.CloudURL
	if cloudURL == "" {
		cloudURL = DefaultCloudURL
	}

	return &Client{
		token:     cfg.Token,
		cloudURL:  cloudURL,
		boardName: cfg.BoardName,
		machineID: cfg.MachineID,
		localAddr: cfg.LocalAddr,
		stopChan:  make(chan struct{}),
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

	// Get cloud URL: env var > config file > default
	cloudURL := os.Getenv(EnvCloudURL)
	if cloudURL == "" {
		cloudURL = fileCfg.URL
	}
	if cloudURL == "" {
		cloudURL = DefaultCloudURL
	}

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
	}
}

// configFile holds values read from ~/.tickboardrc.
type configFile struct {
	Token string
	URL   string
}

// readConfigFile reads token and URL from ~/.tickboardrc.
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

// deriveBoardName gets the board name from the tick directory.
func deriveBoardName(tickDir string) string {
	// tickDir is like /path/to/repo/.tick
	// We want the repo name (parent of .tick)
	parent := filepath.Dir(tickDir)
	return filepath.Base(parent)
}

// Connect establishes the WebSocket connection to the cloud.
func (c *Client) Connect(ctx context.Context) error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, c.cloudURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to cloud: %w", err)
	}

	c.conn = conn

	// Send registration message
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

	return nil
}

// Run connects to the cloud and handles messages until context is cancelled.
// It automatically reconnects with exponential backoff on disconnection.
func (c *Client) Run(ctx context.Context) error {
	backoff := time.Second
	maxBackoff := 5 * time.Minute

	for {
		select {
		case <-ctx.Done():
			c.Close()
			return ctx.Err()
		case <-c.stopChan:
			c.Close()
			return nil
		default:
		}

		// Try to connect
		if err := c.Connect(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "cloud: connection failed: %v (retrying in %v)\n", err, backoff)
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

		fmt.Fprintf(os.Stderr, "cloud: connected to %s as %s/%s\n", c.cloudURL, c.boardName, c.machineID)
		backoff = time.Second // Reset backoff on successful connection

		// Handle messages until disconnection
		if err := c.handleMessages(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			fmt.Fprintf(os.Stderr, "cloud: disconnected: %v (reconnecting...)\n", err)
		}
	}
}

// handleMessages reads and processes messages from the cloud.
func (c *Client) handleMessages(ctx context.Context) error {
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

		// Set read deadline
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return nil
			}
			return fmt.Errorf("read error: %w", err)
		}

		// Handle the message
		switch msg.Type {
		case "ping":
			// Respond with pong
			c.sendMessage(Message{Type: "pong"})

		case "request":
			// Handle relayed HTTP request
			var req RequestMessage
			if err := json.Unmarshal(msg.Data, &req); err != nil {
				fmt.Fprintf(os.Stderr, "cloud: invalid request message: %v\n", err)
				continue
			}
			go c.handleRequest(req)

		case "error":
			fmt.Fprintf(os.Stderr, "cloud: server error: %s\n", string(msg.Data))

		default:
			fmt.Fprintf(os.Stderr, "cloud: unknown message type: %s\n", msg.Type)
		}
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

// Close closes the connection to the cloud.
func (c *Client) Close() error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	if c.conn != nil {
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

