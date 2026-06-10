package cmd

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tickboard/server"
)

// TestBoardHelp verifies the board command is registered and its --help works
// through the same ExecuteArgs path the binary uses.
func TestBoardHelp(t *testing.T) {
	setupTestRepo(t)

	out, err := captureStdoutArgs(t, []string{"board", "--help"})
	if err != nil {
		t.Fatalf("tk board --help: %v", err)
	}
	if !strings.Contains(out, "board") {
		t.Errorf("help output missing command name; got:\n%s", out)
	}
	if !strings.Contains(out, "--port") || !strings.Contains(out, "--cloud") || !strings.Contains(out, "--host") {
		t.Errorf("help output missing expected flags; got:\n%s", out)
	}
}

// TestExecuteArgsHelpFlagDoesNotLeak is a regression test for the sticky
// --help value: cobra's auto-generated help flag is read by value, so without
// the reset in resetCobraFlags, any command run after a --help invocation in
// the same process silently short-circuited to printing help (returning nil).
func TestExecuteArgsHelpFlagDoesNotLeak(t *testing.T) {
	setupTestRepo(t)

	if _, err := captureStdoutArgs(t, []string{"board", "--help"}); err != nil {
		t.Fatalf("tk board --help: %v", err)
	}

	// This must reach RunE and fail on the bad path. If the help value leaked,
	// cobra would print help instead and return nil.
	if err := ExecuteArgs([]string{"board", "/no/such/directory/really"}); err == nil {
		t.Fatal("expected path error; --help value leaked across ExecuteArgs invocations")
	}
}

// TestBoardBadPath verifies a nonexistent path arg produces a clear error
// rather than a panic.
func TestBoardBadPath(t *testing.T) {
	setupTestRepo(t)

	err := ExecuteArgs([]string{"board", "/no/such/directory/really"})
	if err == nil {
		t.Fatal("expected error for bad path, got nil")
	}
	if !strings.Contains(err.Error(), "/no/such/directory/really") {
		t.Errorf("error should name the bad path; got: %v", err)
	}
}

// TestBoardCloudWithoutToken verifies that --cloud without a configured token
// returns the authentication error (and does not panic).
func TestBoardCloudWithoutToken(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick", "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	// Isolate from any real ~/.ticksrc or env token so LoadConfig deterministically
	// returns nil (not authenticated).
	t.Setenv("HOME", t.TempDir())
	t.Setenv("TICKS_TOKEN", "")

	err := ExecuteArgs([]string{"board", repoDir, "--cloud", "-p", "0"})
	if err == nil {
		t.Fatal("expected authentication error for --cloud without token, got nil")
	}
	if !strings.Contains(err.Error(), "authentication") {
		t.Errorf("expected authentication error; got: %v", err)
	}
}

// TestBoardExplicitPortInUse reproduces the blocker scenario: the same
// loopback address already holds the port (as another running board would).
// An explicit -p on that port must fail fast with a clear error instead of
// printing a banner and serving nothing.
//
// Note: on macOS a wildcard listener does NOT conflict with a subsequent
// loopback bind on the same port (SO_REUSEADDR semantics). The occupant must
// be a loopback listener to match the default bind address of tk board.
func TestBoardExplicitPortInUse(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick", "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	// Occupy a port with a loopback bind — matching what a running board uses
	// by default (127.0.0.1). A wildcard occupant would NOT conflict on macOS.
	occupant, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer occupant.Close()
	port := occupant.Addr().(*net.TCPAddr).Port

	start := time.Now()
	err = ExecuteArgs([]string{"board", repoDir, "-p", strconv.Itoa(port)})
	if err == nil {
		t.Fatal("expected error for explicitly requested busy port, got nil")
	}
	if !strings.Contains(err.Error(), strconv.Itoa(port)) {
		t.Errorf("error should name the busy port %d; got: %v", port, err)
	}
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Errorf("busy-port failure took %v; expected fail-fast", elapsed)
	}
}

// TestBoardServerErrorReturnsError verifies the failure path: if the server
// cannot start (here: .tick exists but issues/ is missing, so the file watcher
// fails), runBoard returns a non-nil error instead of blocking until Ctrl+C.
func TestBoardServerErrorReturnsError(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	// .tick without issues/ — server.Run fails when watching the issues dir.
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}

	done := make(chan error, 1)
	go func() {
		done <- ExecuteArgs([]string{"board", repoDir, "-p", "0"})
	}()

	select {
	case err := <-done:
		if err == nil {
			t.Fatal("expected server error to propagate, got nil")
		}
		if !strings.Contains(err.Error(), "board server error") {
			t.Errorf("expected board server error; got: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("runBoard blocked instead of returning the server error")
	}
}

// TestBoardCommandWiring drives the real command end to end: runBoard binds
// the listener first, prints the banner only for a socket it owns, serves the
// embedded UI and API, and shuts down cleanly when the context is cancelled.
func TestBoardCommandWiring(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick", "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	// Capture stdout via a pipe so the banner can be read while the command runs.
	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w
	t.Cleanup(func() {
		os.Stdout = origStdout
		_ = w.Close()
		_ = r.Close()
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() {
		// -p 0 binds an ephemeral port; the banner reports the actual one.
		errCh <- ExecuteArgsContext(ctx, []string{"board", repoDir, "-p", "0"})
	}()

	// Read stdout until the banner names the bound port; keep draining after
	// so later prints never block on a full pipe.
	bannerRe := regexp.MustCompile(`Board running at http://localhost:(\d+)`)
	portCh := make(chan int, 1)
	go func() {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			if m := bannerRe.FindStringSubmatch(scanner.Text()); m != nil {
				p, _ := strconv.Atoi(m[1])
				portCh <- p
				break
			}
		}
		for scanner.Scan() {
		}
	}()

	var port int
	select {
	case port = <-portCh:
	case err := <-errCh:
		t.Fatalf("board exited before printing the banner: %v", err)
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for the board banner")
	}

	// The listener is bound before the banner is printed, so connections must
	// succeed immediately — no readiness polling.
	base := "http://127.0.0.1:" + strconv.Itoa(port)

	resp, err := http.Get(base + "/api/ticks")
	if err != nil {
		t.Fatalf("GET /api/ticks: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/ticks status: got %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("GET /api/ticks body not JSON: %v\nbody: %s", err, body)
	}
	if _, ok := payload["ticks"]; !ok {
		t.Errorf("GET /api/ticks JSON missing \"ticks\" key; got: %s", body)
	}

	resp, err = http.Get(base + "/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET / status: got %d, want 200", resp.StatusCode)
	}
	indexBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	lower := strings.ToLower(string(indexBody))
	if !strings.Contains(lower, "<!doctype html") && !strings.Contains(lower, "<html") {
		t.Errorf("GET / did not serve HTML index; got:\n%s", indexBody)
	}

	// Cancel the command's context and confirm a clean exit.
	cancel()
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("board returned error on shutdown: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("board did not shut down within 10s")
	}
}

// TestBoardServesUIAndAPI boots the server package directly on a pre-bound
// listener (the WithListener surface tk board uses) and verifies it serves the
// embedded UI and the /api/ticks JSON endpoint, then shuts it down.
func TestBoardServesUIAndAPI(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	tickDir := filepath.Join(repoDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	port := l.Addr().(*net.TCPAddr).Port

	srv, err := server.New(tickDir, port, server.WithListener(l))
	if err != nil {
		t.Fatalf("server.New: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() { errCh <- srv.Run(ctx) }()

	base := "http://127.0.0.1:" + strconv.Itoa(port)
	waitForServer(t, base+"/api/ticks")

	// GET /api/ticks -> 200, JSON with a "ticks" key.
	resp, err := http.Get(base + "/api/ticks")
	if err != nil {
		t.Fatalf("GET /api/ticks: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/ticks status: got %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("GET /api/ticks body not JSON: %v\nbody: %s", err, body)
	}
	if _, ok := payload["ticks"]; !ok {
		t.Errorf("GET /api/ticks JSON missing \"ticks\" key; got: %s", body)
	}

	// GET / -> 200 serving the embedded index.html.
	resp, err = http.Get(base + "/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET / status: got %d, want 200", resp.StatusCode)
	}
	indexBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !strings.Contains(strings.ToLower(string(indexBody)), "<!doctype html") &&
		!strings.Contains(strings.ToLower(string(indexBody)), "<html") {
		t.Errorf("GET / did not serve HTML index; got:\n%s", indexBody)
	}

	// Shut down and confirm Run returns without error.
	cancel()
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("server.Run returned error on shutdown: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("server did not shut down within 5s")
	}
}

// TestBoardDefaultBindIsLoopback verifies that the default bind address is
// 127.0.0.1 (loopback only). The listener address returned by bindBoardListener
// must be a 127.0.0.1 TCP address.
func TestBoardDefaultBindIsLoopback(t *testing.T) {
	l, port, err := bindBoardListener("127.0.0.1", 0, false)
	if err != nil {
		t.Fatalf("bindBoardListener: %v", err)
	}
	defer l.Close()

	if port == 0 {
		t.Fatal("expected non-zero port")
	}

	addr, ok := l.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("listener address is not *net.TCPAddr: %T", l.Addr())
	}
	if !addr.IP.Equal(net.ParseIP("127.0.0.1")) {
		t.Errorf("expected listener on 127.0.0.1, got %s", addr.IP)
	}
}

// TestBoardHostFlagBindsWildcard verifies that --host 0.0.0.0 causes
// bindBoardListener to bind the wildcard address (all interfaces).
func TestBoardHostFlagBindsWildcard(t *testing.T) {
	l, port, err := bindBoardListener("0.0.0.0", 0, false)
	if err != nil {
		t.Fatalf("bindBoardListener with 0.0.0.0: %v", err)
	}
	defer l.Close()

	if port == 0 {
		t.Fatal("expected non-zero port")
	}

	addr, ok := l.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("listener address is not *net.TCPAddr: %T", l.Addr())
	}
	// A wildcard bind on 0.0.0.0 results in IP == 0.0.0.0 (all-zeros).
	if !addr.IP.IsUnspecified() {
		t.Errorf("expected wildcard (unspecified) listener address, got %s", addr.IP)
	}
}

// TestBoardBannerHost verifies the URL host printed in the banner.
func TestBoardBannerHost(t *testing.T) {
	cases := []struct {
		host string
		want string
	}{
		{"127.0.0.1", "localhost"},
		{"::1", "localhost"},
		{"", "localhost"},
		{"0.0.0.0", "0.0.0.0"},
		{"192.168.1.10", "192.168.1.10"},
	}
	for _, c := range cases {
		got := boardBannerHost(c.host)
		if got != c.want {
			t.Errorf("boardBannerHost(%q) = %q, want %q", c.host, got, c.want)
		}
	}
}

// waitForServer polls url until it answers or the deadline passes.
func waitForServer(t *testing.T, url string) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := http.Get(url)
		if err == nil {
			resp.Body.Close()
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("server at %s did not become ready within 5s", url)
}
