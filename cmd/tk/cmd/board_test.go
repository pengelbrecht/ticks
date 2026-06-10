package cmd

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
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
	if !strings.Contains(out, "--port") || !strings.Contains(out, "--cloud") {
		t.Errorf("help output missing expected flags; got:\n%s", out)
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

	err := ExecuteArgs([]string{"board", repoDir, "--cloud"})
	if err == nil {
		t.Fatal("expected authentication error for --cloud without token, got nil")
	}
	if !strings.Contains(err.Error(), "authentication") {
		t.Errorf("expected authentication error; got: %v", err)
	}
}

// TestBoardServesUIAndAPI boots the board server on an ephemeral port (the same
// server.New/Run surface tk board uses) and verifies it serves the embedded UI
// and the /api/ticks JSON endpoint, then shuts it down.
func TestBoardServesUIAndAPI(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	tickDir := filepath.Join(repoDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	port, err := findAvailableBoardPort(38000)
	if err != nil {
		t.Fatalf("findAvailableBoardPort: %v", err)
	}

	srv, err := server.New(tickDir, port)
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
