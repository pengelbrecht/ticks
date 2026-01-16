package server

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"time"
)

//go:embed static/*
var staticFS embed.FS

// Server represents the tickboard HTTP server.
type Server struct {
	tickDir string
	port    int
	srv     *http.Server
}

// New creates a new tickboard server.
func New(tickDir string, port int) (*Server, error) {
	s := &Server{
		tickDir: tickDir,
		port:    port,
	}
	return s, nil
}

// Run starts the HTTP server and blocks until the context is cancelled.
func (s *Server) Run(ctx context.Context) error {
	mux := http.NewServeMux()

	// Serve static files from embedded filesystem
	staticContent, err := fs.Sub(staticFS, "static")
	if err != nil {
		return fmt.Errorf("failed to access static files: %w", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticContent))))

	// Root handler - serve index.html
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		// Serve index.html from static files
		data, err := staticFS.ReadFile("static/index.html")
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
	})

	s.srv = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := s.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
		close(errChan)
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		// Graceful shutdown with timeout
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.srv.Shutdown(shutdownCtx)
	case err := <-errChan:
		return err
	}
}

// TickDir returns the path to the .tick directory being served.
func (s *Server) TickDir() string {
	return s.tickDir
}
