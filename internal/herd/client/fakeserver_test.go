package client

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The fake herdr server these tests run against lives in
// internal/herd/herdtest — one canonical fake for the whole repo. This file is
// only the seam: local names for the shared types, and the two constructors
// that dial the fake through the production unix transport.
//
// herdtest deliberately does not import this package (that would be an import
// cycle with these in-package tests), so the wiring is here rather than there.

// fakeRequest is a decoded request as the fake server saw it.
type fakeRequest = herdtest.Request

// fakeConnWriter lets a handler push extra lines (push events) after its reply.
type fakeConnWriter = herdtest.ConnWriter

// fakeHandler answers one request.
type fakeHandler = herdtest.Handler

// fakeServer is an in-process unix-socket server speaking the herdr wire
// protocol — a real listener on a real socket, so these tests exercise the
// production UnixTransport and its newline framing rather than a stubbed Conn.
type fakeServer = herdtest.Server

// pongResult is the captured protocol-20 ping reply.
const pongResult = herdtest.PongResult

// newFakeServer starts a fake herdr server that answers every request with the
// given handler.
func newFakeServer(t *testing.T, handler fakeHandler) *fakeServer {
	t.Helper()
	return herdtest.New(t, herdtest.Config{Handler: handler})
}

// respond writes a success envelope wrapping the given result JSON.
func respond(w *fakeConnWriter, id, resultJSON string) error {
	return herdtest.Respond(w, id, resultJSON)
}

// respondErr writes an error envelope.
func respondErr(w *fakeConnWriter, id, code, message string) error {
	return herdtest.RespondErr(w, id, code, message)
}

// pongResultProtocol builds a ping reply advertising an arbitrary protocol.
func pongResultProtocol(protocol int) string {
	return herdtest.PongResultProtocol(protocol)
}

// newTestClient starts a fake server with the given routes and returns a
// client connected to it through the production unix transport.
func newTestClient(t *testing.T, routes map[string]fakeHandler) (*Client, *fakeServer) {
	t.Helper()
	return newTestClientOpts(t, routes, Options{})
}

// newTestClientOpts is newTestClient with caller-supplied options; SocketPath
// is always overridden to point at the fake server.
//
// The fake runs strict: it answers ping from the captured protocol-20 reply so
// every test gets past the handshake for free, serves whatever the test
// routed, and rejects everything else. Nothing about this package's behaviour
// may depend on a reply the test did not ask for.
func newTestClientOpts(t *testing.T, routes map[string]fakeHandler, opts Options) (*Client, *fakeServer) {
	t.Helper()
	srv := herdtest.New(t, herdtest.Config{Strict: true, Routes: routes})
	opts.SocketPath = srv.Path()
	c, err := New(t.Context(), opts)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return c, srv
}

// loadFixture reads a captured protocol payload from testdata.
func loadFixture(t *testing.T, name string) string {
	t.Helper()
	return herdtest.Fixture(t, name)
}

// loadEventLines reads a captured NDJSON event fixture, dropping its "#"
// provenance comments.
func loadEventLines(t *testing.T, name string) []string {
	t.Helper()
	return herdtest.EventLines(t, name)
}
