package cmd

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/tickboard/cloud"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
)

var boardCmd = &cobra.Command{
	Use:   "board [path]",
	Short: "Start the local board web UI",
	Long: `Start the ticks board: a local web server that serves the embedded UI and
the read/write API for the .tick directory.

The optional path argument is the repository directory to serve (default: the
current directory). The board watches .tick for changes and streams them to the
browser over Server-Sent Events.

Examples:
  tk board                    # Serve the current repo on port 3000
  tk board -p 8080            # Serve on port 8080
  tk board /path/to/repo      # Serve a different repo
  tk board --cloud            # Also mirror ticks to ticks.sh (requires a token)`,
	Args: cobra.MaximumNArgs(1),
	RunE: runBoard,
}

var (
	boardPort  int
	boardCloud bool
	boardDev   bool
)

func init() {
	boardCmd.Flags().IntVarP(&boardPort, "port", "p", 3000, "port to listen on")
	boardCmd.Flags().BoolVar(&boardCloud, "cloud", false, "mirror ticks to ticks.sh in real time (requires a token)")
	boardCmd.Flags().BoolVar(&boardDev, "dev", false, "serve UI from disk for hot reload (development only)")

	rootCmd.AddCommand(boardCmd)
}

func runBoard(cmd *cobra.Command, args []string) error {
	// Resolve the repo directory: explicit arg or current working directory.
	repoDir := ""
	if len(args) == 1 {
		repoDir = args[0]
	}
	if repoDir == "" {
		var err error
		repoDir, err = os.Getwd()
		if err != nil {
			return NewExitError(ExitGeneric, "failed to determine working directory: %v", err)
		}
	}

	absRepo, err := filepath.Abs(repoDir)
	if err != nil {
		return NewExitError(ExitUsage, "invalid path %q: %v", repoDir, err)
	}

	info, err := os.Stat(absRepo)
	if err != nil {
		return NewExitError(ExitUsage, "cannot serve %q: %v", repoDir, err)
	}
	if !info.IsDir() {
		return NewExitError(ExitUsage, "cannot serve %q: not a directory", repoDir)
	}

	tickDir := filepath.Join(absRepo, ".tick")
	if _, err := os.Stat(tickDir); err != nil {
		return NewExitError(ExitUsage, "no .tick directory in %q (run 'tk init' first): %v", absRepo, err)
	}

	// Find an available port starting at the requested one so two boards
	// don't collide.
	port, err := findAvailableBoardPort(boardPort)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to find available port: %v", err)
	}

	var serverOpts []server.ServerOption
	if boardDev {
		serverOpts = append(serverOpts, server.WithDevMode(true))
	}

	boardServer, err := server.New(tickDir, port, serverOpts...)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to create board server: %v", err)
	}

	// Graceful shutdown on SIGINT/SIGTERM.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Fprintln(os.Stderr, "\nShutting down...")
		cancel()
	}()

	var wg sync.WaitGroup

	// Optional cloud sync. The cloud client is fully self-contained: it runs
	// its own file watcher and WebSocket sync loop, so the server does not need
	// to know about it.
	var cloudClient *cloud.Client
	if boardCloud {
		cfg := cloud.LoadConfig(tickDir)
		if cfg == nil {
			return NewExitError(ExitGeneric, `cloud sync requires authentication.
Add token to ~/.ticksrc:
  token=your-token-here

Get a token at https://ticks.sh/settings`)
		}

		cloudClient, err = cloud.NewClient(*cfg)
		if err != nil {
			return NewExitError(ExitGeneric, "failed to create cloud client: %v", err)
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := cloudClient.Run(ctx); err != nil && ctx.Err() == nil {
				fmt.Fprintf(os.Stderr, "Cloud client error: %v\n", err)
			}
		}()

		fmt.Printf("Cloud sync: %s\n", cfg.BoardName)
	}

	// Start the board server.
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := boardServer.Run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			fmt.Fprintf(os.Stderr, "Board server error: %v\n", err)
		}
	}()

	fmt.Printf("Board running at http://localhost:%d\n", port)
	fmt.Println("Press Ctrl+C to stop")

	<-ctx.Done()

	if cloudClient != nil {
		cloudClient.Close()
	}
	wg.Wait()

	return nil
}

// findAvailableBoardPort returns the first available port at or above startPort.
// It probes both IPv4 and IPv6 localhost so the board doesn't collide with an
// app bound to only one of them.
func findAvailableBoardPort(startPort int) (int, error) {
	const maxAttempts = 100
	for i := 0; i < maxAttempts; i++ {
		port := startPort + i
		if isBoardPortAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+maxAttempts-1)
}

// isBoardPortAvailable reports whether the given port is free on both IPv4 and
// IPv6 localhost.
func isBoardPortAvailable(port int) bool {
	l4, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return false
	}
	l4.Close()

	l6, err := net.Listen("tcp6", fmt.Sprintf("[::1]:%d", port))
	if err != nil {
		return false
	}
	l6.Close()

	return true
}
