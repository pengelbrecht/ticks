package agent

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
)

// acpClient is a JSON-RPC 2.0 client over NDJSON stdio.
// It writes requests to the agent's stdin and reads responses/notifications
// from the agent's stdout.
type acpClient struct {
	writer io.Writer
	mu     sync.Mutex // serializes writes

	nextID atomic.Int64

	// pending tracks in-flight requests awaiting responses.
	pending   map[int64]chan *rpcResponse
	pendingMu sync.Mutex

	// onNotification is called for each JSON-RPC notification received.
	onNotification func(method string, params json.RawMessage)
}

// rpcRequest is a JSON-RPC 2.0 request.
type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int64  `json:"id,omitempty"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

// rpcResponse is a JSON-RPC 2.0 response.
type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      *int64          `json:"id,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

// rpcError is a JSON-RPC 2.0 error object.
type rpcError struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}

func (e *rpcError) Error() string {
	return fmt.Sprintf("RPC error %d: %s", e.Code, e.Message)
}

// rpcNotification is a JSON-RPC 2.0 notification (no id).
type rpcNotification struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

// newAcpClient creates a new ACP client that writes to w.
// Call ReadLoop with the agent's stdout to start processing responses.
func newAcpClient(w io.Writer) *acpClient {
	return &acpClient{
		writer:  w,
		pending: make(map[int64]chan *rpcResponse),
	}
}

// Call sends a JSON-RPC request and waits for the response.
func (c *acpClient) Call(ctx context.Context, method string, params any) (json.RawMessage, error) {
	id := c.nextID.Add(1)

	ch := make(chan *rpcResponse, 1)
	c.pendingMu.Lock()
	c.pending[id] = ch
	c.pendingMu.Unlock()

	defer func() {
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
	}()

	req := rpcRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	if err := c.send(req); err != nil {
		return nil, fmt.Errorf("send %s: %w", method, err)
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case resp, ok := <-ch:
		if !ok || resp == nil {
			return nil, fmt.Errorf("connection closed before response to %s", method)
		}
		if resp.Error != nil {
			return nil, resp.Error
		}
		return resp.Result, nil
	}
}

// Notify sends a JSON-RPC notification (no response expected).
func (c *acpClient) Notify(method string, params any) error {
	req := rpcRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	}
	return c.send(req)
}

// send marshals and writes a JSON-RPC message followed by a newline.
func (c *acpClient) send(msg any) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	data = append(data, '\n')
	_, err = c.writer.Write(data)
	return err
}

// ReadLoop reads NDJSON from r, dispatching responses to pending calls
// and notifications to the onNotification callback.
// It blocks until r is closed or an error occurs.
func (c *acpClient) ReadLoop(r io.Reader) error {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		// Peek to determine if this is a response (has "id") or notification (has "method" but no "id").
		var peek struct {
			ID     *int64          `json:"id"`
			Method string          `json:"method"`
			Result json.RawMessage `json:"result"`
			Error  *rpcError       `json:"error"`
			Params json.RawMessage `json:"params"`
		}
		if err := json.Unmarshal(line, &peek); err != nil {
			continue // skip malformed lines
		}

		if peek.ID != nil {
			// Response to a pending request.
			resp := &rpcResponse{
				ID:     peek.ID,
				Result: peek.Result,
				Error:  peek.Error,
			}
			c.pendingMu.Lock()
			ch, ok := c.pending[*peek.ID]
			c.pendingMu.Unlock()
			if ok {
				ch <- resp
			}
		} else if peek.Method != "" {
			// Notification.
			if c.onNotification != nil {
				c.onNotification(peek.Method, peek.Params)
			}
		}
	}

	// When the reader closes, unblock any pending calls.
	c.pendingMu.Lock()
	for _, ch := range c.pending {
		close(ch)
	}
	c.pendingMu.Unlock()

	return scanner.Err()
}
