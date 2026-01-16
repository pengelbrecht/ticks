package server

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	// Create a temp .tick directory
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.Mkdir(tickDir, 0755); err != nil {
		t.Fatalf("failed to create .tick dir: %v", err)
	}

	srv, err := New(tickDir, 0)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	if srv.TickDir() != tickDir {
		t.Errorf("TickDir() = %q, want %q", srv.TickDir(), tickDir)
	}
}

func TestServer_Run(t *testing.T) {
	// Create a temp .tick directory
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.Mkdir(tickDir, 0755); err != nil {
		t.Fatalf("failed to create .tick dir: %v", err)
	}

	// Use port 0 to get a random available port
	srv, err := New(tickDir, 18765)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		errChan <- srv.Run(ctx)
	}()

	// Give server time to start
	time.Sleep(100 * time.Millisecond)

	// Test that the server responds
	resp, err := http.Get("http://localhost:18765/")
	if err != nil {
		cancel()
		t.Fatalf("failed to connect to server: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cancel()
		t.Errorf("GET / status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	// Test static files
	resp, err = http.Get("http://localhost:18765/static/style.css")
	if err != nil {
		cancel()
		t.Fatalf("failed to get static file: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cancel()
		t.Errorf("GET /static/style.css status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	// Test 404 for unknown paths
	resp, err = http.Get("http://localhost:18765/unknown")
	if err != nil {
		cancel()
		t.Fatalf("failed to request unknown path: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		cancel()
		t.Errorf("GET /unknown status = %d, want %d", resp.StatusCode, http.StatusNotFound)
	}

	// Shutdown
	cancel()

	// Wait for server to stop
	select {
	case err := <-errChan:
		if err != nil && err != http.ErrServerClosed {
			t.Errorf("Run() returned unexpected error: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Error("server did not shut down in time")
	}
}

func TestStaticFS_Embedded(t *testing.T) {
	// Verify that static files are properly embedded
	files := []string{
		"static/index.html",
		"static/style.css",
		"static/app.js",
	}

	for _, f := range files {
		data, err := staticFS.ReadFile(f)
		if err != nil {
			t.Errorf("failed to read embedded file %q: %v", f, err)
			continue
		}
		if len(data) == 0 {
			t.Errorf("embedded file %q is empty", f)
		}
	}
}
