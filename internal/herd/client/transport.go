package client

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"time"
)

// Conn is one newline-delimited-JSON connection to the herdr server.
//
// Implementations need not be safe for concurrent use; the client owns a Conn
// for the lifetime of a single call or a single event subscription.
type Conn interface {
	// WriteMessage writes one message as a single line.
	WriteMessage(ctx context.Context, line []byte) error
	// ReadMessage reads the next line, without its trailing newline.
	ReadMessage(ctx context.Context) ([]byte, error)
	// Close releases the connection. It is safe to call more than once.
	Close() error
}

// Transport opens connections to the herdr API endpoint. It is injected so
// tests can drive the client against a fake server.
type Transport interface {
	// Dial opens a new connection. Because the herdr server closes a
	// connection after answering a single request, every call dials afresh.
	Dial(ctx context.Context) (Conn, error)
	// Endpoint describes what this transport connects to, for error messages.
	Endpoint() string
}

// UnixTransport dials a herdr unix stream socket. It is the transport [New]
// uses when [Options.Transport] is nil.
type UnixTransport struct {
	// SocketPath is the unix socket to dial.
	SocketPath string
	// DialTimeout bounds a single dial. Zero means DefaultDialTimeout.
	DialTimeout time.Duration
}

// DefaultDialTimeout bounds a connection attempt when none is configured.
const DefaultDialTimeout = 5 * time.Second

// NewUnixTransport returns a UnixTransport for the given socket path.
func NewUnixTransport(socketPath string) *UnixTransport {
	return &UnixTransport{SocketPath: socketPath}
}

// Endpoint reports the socket path this transport dials.
func (t *UnixTransport) Endpoint() string { return t.SocketPath }

// Dial opens a unix stream connection to the herdr socket.
func (t *UnixTransport) Dial(ctx context.Context) (Conn, error) {
	timeout := t.DialTimeout
	if timeout <= 0 {
		timeout = DefaultDialTimeout
	}
	dialCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var d net.Dialer
	nc, err := d.DialContext(dialCtx, "unix", t.SocketPath)
	if err != nil {
		return nil, fmt.Errorf("herd/client: dial %s: %w", t.SocketPath, err)
	}
	return newNetConn(nc), nil
}

// maxLineBytes caps a single protocol line. session.snapshot on a large
// session is the biggest realistic payload; 64 MiB is generous headroom.
const maxLineBytes = 64 << 20

// netConn adapts a net.Conn to Conn with newline framing and context-aware
// deadlines. Cancelling the context closes the connection, which unblocks a
// pending read — the only way to interrupt one.
type netConn struct {
	conn   net.Conn
	reader *bufio.Reader
}

func newNetConn(nc net.Conn) *netConn {
	return &netConn{conn: nc, reader: bufio.NewReaderSize(nc, 64<<10)}
}

func (c *netConn) WriteMessage(ctx context.Context, line []byte) error {
	stop := c.applyContext(ctx)
	defer stop()

	buf := make([]byte, 0, len(line)+1)
	buf = append(buf, line...)
	buf = append(buf, '\n')
	if _, err := c.conn.Write(buf); err != nil {
		return contextErr(ctx, err)
	}
	return nil
}

func (c *netConn) ReadMessage(ctx context.Context) ([]byte, error) {
	stop := c.applyContext(ctx)
	defer stop()

	var line []byte
	for {
		chunk, isPrefix, err := c.reader.ReadLine()
		if err != nil {
			return nil, contextErr(ctx, err)
		}
		line = append(line, chunk...)
		if len(line) > maxLineBytes {
			return nil, fmt.Errorf("herd/client: protocol line exceeds %d bytes", maxLineBytes)
		}
		if !isPrefix {
			return line, nil
		}
	}
}

func (c *netConn) Close() error { return c.conn.Close() }

// applyContext installs the context deadline on the socket and arranges for
// cancellation to close it. The returned func undoes both.
func (c *netConn) applyContext(ctx context.Context) func() {
	if dl, ok := ctx.Deadline(); ok {
		_ = c.conn.SetDeadline(dl)
	} else {
		_ = c.conn.SetDeadline(time.Time{})
	}
	stop := context.AfterFunc(ctx, func() { _ = c.conn.Close() })
	return func() { stop() }
}

// contextErr prefers the context's own error, so a cancelled call reports
// context.Canceled rather than "use of closed network connection".
func contextErr(ctx context.Context, err error) error {
	if ctxErr := ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	return err
}
