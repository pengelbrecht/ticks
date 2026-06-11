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

If --port is given explicitly, the board binds exactly that port and fails if
it is busy. Without --port it starts at 3000 and takes the first free port.

By default the board binds 127.0.0.1 (loopback only). Use --host 0.0.0.0 to
expose the board on all interfaces (LAN / Docker).

Examples:
  tk board                        # Serve the current repo on port 3000 (or next free)
  tk board -p 8080                # Serve on port 8080 exactly
  tk board /path/to/repo          # Serve a different repo
  tk board --host 0.0.0.0         # Expose on all interfaces (LAN / Docker)
  tk board --cloud                # Also mirror ticks to ticks.sh (requires a token)`,
	Args: cobra.MaximumNArgs(1),
	RunE: runBoard,
}

var (
	boardPort  int
	boardCloud bool
	boardDev   bool
	boardHost  string
)

func init() {
	boardCmd.Flags().IntVarP(&boardPort, "port", "p", 3000, "port to listen on")
	boardCmd.Flags().StringVar(&boardHost, "host", "127.0.0.1", "host/IP to bind (default 127.0.0.1; use 0.0.0.0 to expose on all interfaces)")
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

	// Bind the listener BEFORE announcing anything. Probe-then-bind is racy:
	// on macOS, SO_REUSEADDR lets a 127.0.0.1/[::1] probe succeed while a
	// wildcard listener already holds the port, so a second board would print
	// a banner and then fail to bind. Holding the listener up front means the
	// banner is only ever printed for a socket we actually own.
	listener, port, err := bindBoardListener(boardHost, boardPort, cmd.Flags().Changed("port"))
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	// The server closes the listener on shutdown; this covers early-error
	// returns below (double Close on a TCP listener is harmless).
	defer listener.Close()

	serverOpts := []server.ServerOption{server.WithListener(listener)}
	if boardDev {
		serverOpts = append(serverOpts, server.WithDevMode(true))
	}

	boardServer, err := server.New(tickDir, port, serverOpts...)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to create board server: %v", err)
	}

	// Graceful shutdown on SIGINT/SIGTERM, cancellable by tests via cmd.Context().
	ctx, cancel := context.WithCancel(cmd.Context())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		select {
		case <-sigCh:
			// Stop relaying immediately so a second Ctrl+C during a hung
			// shutdown force-kills the process conventionally.
			signal.Stop(sigCh)
			fmt.Fprintln(os.Stderr, "\nShutting down...")
			cancel()
		case <-ctx.Done():
			signal.Stop(sigCh)
		}
	}()

	var wg sync.WaitGroup

	// Optional cloud sync. The cloud client is fully self-contained: it runs
	// its own file watcher and WebSocket sync loop, so the server does not need
	// to know about it.
	var cloudClient *cloud.Client
	var cloudBoardName string
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
		cloudBoardName = cfg.BoardName

		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := cloudClient.Run(ctx); err != nil && ctx.Err() == nil {
				fmt.Fprintf(os.Stderr, "Cloud client error: %v\n", err)
			}
		}()
	}

	// Start the board server. If it fails, surface the error as the command's
	// exit status instead of blocking until Ctrl+C.
	var serverErr error
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := boardServer.Run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr = err
			cancel()
		}
	}()

	// The bind already succeeded, so the banner is truthful.
	fmt.Printf("Board running at http://%s:%d\n", boardBannerHost(boardHost), port)
	if cloudClient != nil {
		fmt.Printf("Cloud sync: %s\n", cloudBoardName)
	}
	fmt.Println("Press Ctrl+C to stop")

	<-ctx.Done()

	if cloudClient != nil {
		cloudClient.Close()
	}
	wg.Wait()

	// wg.Wait() above orders this read after the goroutine's write.
	if serverErr != nil {
		return NewExitError(ExitGeneric, "board server error: %v", serverErr)
	}
	return nil
}

// bindBoardListener binds the board's TCP listener on the given host and
// returns it with the actual bound port.
//
// When the port was requested explicitly (exact=true), only that port is
// tried — a busy port is an error, not an excuse to serve somewhere the user
// didn't ask for. Otherwise it scans upward from startPort and takes the
// first free port.
//
// host is typically "127.0.0.1" (loopback-only, the default) or "0.0.0.0"
// (all interfaces). An empty host is treated as "127.0.0.1".
func bindBoardListener(host string, startPort int, exact bool) (net.Listener, int, error) {
	if host == "" {
		host = "127.0.0.1"
	}
	addr := func(port int) string { return fmt.Sprintf("%s:%d", host, port) }

	if exact {
		l, err := net.Listen("tcp", addr(startPort))
		if err != nil {
			return nil, 0, fmt.Errorf("port %d is unavailable: %v (is another board already running? pick a different port with -p)", startPort, err)
		}
		return l, boundPort(l), nil
	}

	const maxAttempts = 100
	for i := 0; i < maxAttempts; i++ {
		port := startPort + i
		l, err := net.Listen("tcp", addr(port))
		if err == nil {
			return l, boundPort(l), nil
		}
	}
	return nil, 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+maxAttempts-1)
}

// boardBannerHost returns the host string to print in the "Board running at"
// banner. 127.0.0.1 and :: are both displayed as "localhost" for readability;
// 0.0.0.0 is kept as-is (or displayed as the literal address) so users know
// the board is accessible on all interfaces.
func boardBannerHost(host string) string {
	switch host {
	case "127.0.0.1", "::1", "":
		return "localhost"
	default:
		return host
	}
}

// boundPort returns the port a listener is actually bound to (resolves ":0").
func boundPort(l net.Listener) int {
	if addr, ok := l.Addr().(*net.TCPAddr); ok {
		return addr.Port
	}
	return 0
}
