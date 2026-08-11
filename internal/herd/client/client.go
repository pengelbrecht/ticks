package client

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"sync/atomic"
	"time"
)

// DefaultCallTimeout bounds a single request/response exchange when neither
// [Options.CallTimeout] nor the caller's context supplies a deadline. The
// waiting methods (agent.wait, events.wait, pane.wait_for_output) manage their
// own budget and are exempt — see [Options.CallTimeout].
const DefaultCallTimeout = 30 * time.Second

// Options configures [New].
type Options struct {
	// SocketPath is the explicit socket to dial. Empty means resolve per
	// [ResolveSocketPath]. Ignored when Transport is set.
	SocketPath string
	// Transport overrides the default unix-socket transport. Tests inject a
	// fake here; production code leaves it nil.
	Transport Transport
	// DialTimeout bounds a connection attempt. Zero means
	// [DefaultDialTimeout]. Ignored when Transport is set.
	DialTimeout time.Duration
	// CallTimeout bounds a non-waiting call that the caller's context does
	// not already bound. Zero means [DefaultCallTimeout]; negative means no
	// client-imposed timeout.
	CallTimeout time.Duration
}

// Client is a typed herdr API client. It is safe for concurrent use: each call
// dials its own connection, as the protocol requires.
type Client struct {
	transport   Transport
	socketPath  string
	callTimeout time.Duration
	server      ServerInfo
	seq         atomic.Uint64
}

// New resolves the socket path, performs the ping handshake and pins the
// protocol version. It returns a [ProtocolMismatchError] — and no usable
// client — when the server speaks a protocol other than [ProtocolVersion].
func New(ctx context.Context, opts Options) (*Client, error) {
	transport := opts.Transport
	socketPath := opts.SocketPath
	if transport == nil {
		resolved, err := ResolveSocketPath(opts.SocketPath)
		if err != nil {
			return nil, err
		}
		socketPath = resolved
		transport = &UnixTransport{SocketPath: resolved, DialTimeout: opts.DialTimeout}
	} else if socketPath == "" {
		socketPath = transport.Endpoint()
	}

	callTimeout := opts.CallTimeout
	if callTimeout == 0 {
		callTimeout = DefaultCallTimeout
	}

	c := &Client{transport: transport, socketPath: socketPath, callTimeout: callTimeout}

	info, err := c.Ping(ctx)
	if err != nil {
		return nil, err
	}
	if info.Protocol != ProtocolVersion {
		return nil, &ProtocolMismatchError{
			Endpoint:      transport.Endpoint(),
			Expected:      ProtocolVersion,
			Actual:        info.Protocol,
			ServerVersion: info.Version,
		}
	}
	c.server = info
	return c, nil
}

// SocketPath reports the socket path this client resolved to.
func (c *Client) SocketPath() string { return c.socketPath }

// ServerInfo reports what the handshake learned about the server.
func (c *Client) ServerInfo() ServerInfo { return c.server }

// nextID returns a fresh request id. Ids only need to be unique per
// connection, but a monotonic client-wide counter makes logs readable.
func (c *Client) nextID() string {
	return "tk-" + strconv.FormatUint(c.seq.Add(1), 10)
}

// callTimeoutCtx applies the client's default call timeout unless the caller
// already set a deadline or the client opted out.
func (c *Client) callTimeoutCtx(ctx context.Context) (context.Context, context.CancelFunc) {
	if c.callTimeout <= 0 {
		return ctx, func() {}
	}
	if _, ok := ctx.Deadline(); ok {
		return ctx, func() {}
	}
	return context.WithTimeout(ctx, c.callTimeout)
}

// Call sends one request and decodes its result into out, which may be nil to
// discard it. It is the escape hatch for methods this package does not type;
// prefer the typed methods, which also verify the result discriminator.
//
// Call does not impose the client's default timeout — pass a context with a
// deadline. The typed methods apply the default for you.
func (c *Client) Call(ctx context.Context, method string, params any, out any) error {
	raw, err := c.callRaw(ctx, method, params)
	if err != nil {
		return err
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("herd/client: decoding %s result: %w", method, err)
	}
	return nil
}

// callRaw performs one request/response exchange on a fresh connection and
// returns the raw `result` object.
func (c *Client) callRaw(ctx context.Context, method string, params any) (json.RawMessage, error) {
	conn, id, err := c.send(ctx, method, params)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	line, err := conn.ReadMessage(ctx)
	if err != nil {
		return nil, fmt.Errorf("herd/client: reading %s response: %w", method, err)
	}
	return decodeResponse(method, id, line)
}

// send dials, writes the request and returns the live connection plus the id
// used, leaving the caller to read. The caller owns closing the connection.
func (c *Client) send(ctx context.Context, method string, params any) (Conn, string, error) {
	if params == nil {
		params = struct{}{}
	}
	id := c.nextID()
	payload, err := json.Marshal(request{ID: id, Method: method, Params: params})
	if err != nil {
		return nil, "", fmt.Errorf("herd/client: encoding %s request: %w", method, err)
	}

	conn, err := c.transport.Dial(ctx)
	if err != nil {
		return nil, "", err
	}
	if err := conn.WriteMessage(ctx, payload); err != nil {
		conn.Close()
		return nil, "", fmt.Errorf("herd/client: sending %s request: %w", method, err)
	}
	return conn, id, nil
}

// decodeResponse maps one reply line onto a result payload or an error.
//
// An error body is honoured whatever id it carries: herdr answers envelope
// parse failures with an empty id, and a failing subscription probe with a
// derived id such as "<id>:sub:1:probe".
func decodeResponse(method, wantID string, line []byte) (json.RawMessage, error) {
	var resp response
	if err := json.Unmarshal(line, &resp); err != nil {
		return nil, fmt.Errorf("herd/client: malformed %s response: %w", method, err)
	}
	if resp.Error != nil {
		return nil, &APIError{
			Method:    method,
			RequestID: resp.ID,
			Code:      resp.Error.Code,
			Message:   resp.Error.Message,
		}
	}
	if len(resp.Result) == 0 {
		return nil, fmt.Errorf("herd/client: %s response has neither result nor error", method)
	}
	if resp.ID != wantID {
		return nil, fmt.Errorf("herd/client: %s response id %q does not match request id %q", method, resp.ID, wantID)
	}
	return resp.Result, nil
}

// resultType reads the discriminator off a result payload.
func resultType(raw json.RawMessage) string {
	var probe struct {
		Type string `json:"type"`
	}
	_ = json.Unmarshal(raw, &probe)
	return probe.Type
}

// decodeTyped checks the result discriminator and decodes into out.
func decodeTyped(method, want string, raw json.RawMessage, out any) error {
	if got := resultType(raw); got != want {
		return &UnexpectedResultError{Method: method, Want: want, Got: got}
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("herd/client: decoding %s result: %w", method, err)
	}
	return nil
}

// call is the typed-method helper: default timeout, request, discriminator
// check, decode.
func (c *Client) call(ctx context.Context, method, wantType string, params any, out any) error {
	ctx, cancel := c.callTimeoutCtx(ctx)
	defer cancel()
	raw, err := c.callRaw(ctx, method, params)
	if err != nil {
		return err
	}
	return decodeTyped(method, wantType, raw, out)
}

// callNoTimeout is the helper for the waiting methods, whose duration is set
// by their own timeout_ms parameter rather than the client's default.
func (c *Client) callNoTimeout(ctx context.Context, method, wantType string, params any, out any) error {
	raw, err := c.callRaw(ctx, method, params)
	if err != nil {
		return err
	}
	return decodeTyped(method, wantType, raw, out)
}
