package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"
	"time"
)

func TestAcpClient_Call(t *testing.T) {
	// Simulate: client writes request, agent responds.
	clientToAgent := &bytes.Buffer{}
	agentToClient, agentWriter := io.Pipe()

	client := newAcpClient(clientToAgent)

	go client.ReadLoop(agentToClient)

	// Send response from "agent" in background
	go func() {
		time.Sleep(10 * time.Millisecond)
		resp := `{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":1}}` + "\n"
		agentWriter.Write([]byte(resp))
	}()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	result, err := client.Call(ctx, "initialize", map[string]any{"protocolVersion": 1})
	if err != nil {
		t.Fatalf("Call() error: %v", err)
	}

	var parsed struct {
		ProtocolVersion int `json:"protocolVersion"`
	}
	if err := json.Unmarshal(result, &parsed); err != nil {
		t.Fatalf("unmarshal result: %v", err)
	}
	if parsed.ProtocolVersion != 1 {
		t.Errorf("protocolVersion = %d, want 1", parsed.ProtocolVersion)
	}

	// Verify request was written correctly
	var req rpcRequest
	if err := json.Unmarshal(clientToAgent.Bytes()[:bytes.IndexByte(clientToAgent.Bytes(), '\n')], &req); err != nil {
		t.Fatalf("unmarshal request: %v", err)
	}
	if req.Method != "initialize" {
		t.Errorf("request method = %q, want %q", req.Method, "initialize")
	}
	if req.ID != 1 {
		t.Errorf("request id = %d, want 1", req.ID)
	}

	agentWriter.Close()
}

func TestAcpClient_Call_Error(t *testing.T) {
	clientToAgent := &bytes.Buffer{}
	agentToClient, agentWriter := io.Pipe()

	client := newAcpClient(clientToAgent)
	go client.ReadLoop(agentToClient)

	go func() {
		time.Sleep(10 * time.Millisecond)
		resp := `{"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"Empty prompt text"}}` + "\n"
		agentWriter.Write([]byte(resp))
	}()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_, err := client.Call(ctx, "session/prompt", nil)
	if err == nil {
		t.Fatal("Call() should return error for RPC error response")
	}

	rpcErr, ok := err.(*rpcError)
	if !ok {
		t.Fatalf("error type = %T, want *rpcError", err)
	}
	if rpcErr.Code != -32602 {
		t.Errorf("error code = %d, want -32602", rpcErr.Code)
	}

	agentWriter.Close()
}

func TestAcpClient_Call_ContextCancelled(t *testing.T) {
	client := newAcpClient(&bytes.Buffer{})
	// Don't start ReadLoop — call will block until context cancelled.

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // immediately cancel

	_, err := client.Call(ctx, "initialize", nil)
	if err != context.Canceled {
		t.Errorf("Call() error = %v, want context.Canceled", err)
	}
}

func TestAcpClient_Notify(t *testing.T) {
	var buf bytes.Buffer
	client := newAcpClient(&buf)

	err := client.Notify("session/cancel", map[string]string{"sessionId": "abc"})
	if err != nil {
		t.Fatalf("Notify() error: %v", err)
	}

	var req rpcRequest
	if err := json.Unmarshal(buf.Bytes()[:bytes.IndexByte(buf.Bytes(), '\n')], &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if req.Method != "session/cancel" {
		t.Errorf("method = %q, want %q", req.Method, "session/cancel")
	}
	if req.ID != 0 {
		t.Errorf("id = %d, want 0 (notification)", req.ID)
	}
}

func TestAcpClient_Notifications(t *testing.T) {
	agentOutput := strings.Join([]string{
		`{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"s1","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"hello"}}}}`,
		`{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"s1","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":" world"}}}}`,
		"",
	}, "\n")

	client := newAcpClient(&bytes.Buffer{})

	var methods []string
	client.onNotification = func(method string, params json.RawMessage) {
		methods = append(methods, method)
	}

	err := client.ReadLoop(strings.NewReader(agentOutput))
	if err != nil {
		t.Fatalf("ReadLoop() error: %v", err)
	}

	if len(methods) != 2 {
		t.Fatalf("notification count = %d, want 2", len(methods))
	}
	for _, m := range methods {
		if m != "session/update" {
			t.Errorf("notification method = %q, want %q", m, "session/update")
		}
	}
}

func TestAcpClient_ReadLoop_MalformedJSON(t *testing.T) {
	agentOutput := "not json\n{\"jsonrpc\":\"2.0\",\"method\":\"session/update\",\"params\":{}}\n"

	client := newAcpClient(&bytes.Buffer{})

	var count int
	client.onNotification = func(method string, params json.RawMessage) {
		count++
	}

	err := client.ReadLoop(strings.NewReader(agentOutput))
	if err != nil {
		t.Fatalf("ReadLoop() error: %v", err)
	}

	if count != 1 {
		t.Errorf("notification count = %d, want 1 (should skip malformed line)", count)
	}
}

func TestAcpClient_ReadLoop_ClosesUnblocksPending(t *testing.T) {
	agentToClient, agentWriter := io.Pipe()
	client := newAcpClient(&bytes.Buffer{})

	done := make(chan error, 1)
	go func() {
		done <- client.ReadLoop(agentToClient)
	}()

	// Start a call that will never get a response
	callDone := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, err := client.Call(ctx, "test", nil)
		callDone <- err
	}()

	// Give the call time to register
	time.Sleep(20 * time.Millisecond)

	// Close the agent output — should unblock the pending call
	agentWriter.Close()

	select {
	case <-callDone:
		// Expected — call was unblocked
	case <-time.After(time.Second):
		t.Fatal("pending Call was not unblocked when ReadLoop closed")
	}
}
