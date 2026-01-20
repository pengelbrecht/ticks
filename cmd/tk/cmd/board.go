package cmd

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/gc"
	"github.com/pengelbrecht/ticks/internal/tickboard/cloud"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
)

var boardCmd = &cobra.Command{
	Use:   "board [path]",
	Short: "Web kanban board for ticks",
	Long: `Tick Board - A local web server that displays ticks in a kanban board interface.

The server looks for a .tick directory in the specified path or current directory.
It provides a web interface for viewing and interacting with ticks.

Examples:
  # Start board server on default port (3000)
  tk board

  # Start on a specific port
  tk board --port 8080

  # Serve ticks from a specific directory
  tk board /path/to/repo`,
	Args: cobra.MaximumNArgs(1),
	RunE: runBoard,
}

var boardPort int

func init() {
	boardCmd.Flags().IntVarP(&boardPort, "port", "p", 3000, "port to listen on")

	rootCmd.AddCommand(boardCmd)
}

func runBoard(cmd *cobra.Command, args []string) error {
	// Determine the path to serve
	var repoPath string
	if len(args) > 0 {
		repoPath = args[0]
	} else {
		cwd, err := os.Getwd()
		if err != nil {
			return NewExitError(ExitGeneric, "failed to get current directory: %v", err)
		}
		repoPath = cwd
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to resolve path: %v", err)
	}

	// Find .tick directory
	tickDir, err := findTickDir(absPath)
	if err != nil {
		return err
	}

	// Run garbage collection asynchronously (non-blocking)
	go func() {
		result, err := gc.Cleanup(absPath, gc.DefaultMaxAge)
		if err != nil {
			fmt.Fprintf(os.Stderr, "gc: cleanup error: %v\n", err)
		} else if len(result.Errors) > 0 {
			for _, e := range result.Errors {
				fmt.Fprintf(os.Stderr, "gc: %v\n", e)
			}
		}
	}()

	// Create and start server
	srv, err := server.New(tickDir, boardPort)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to create server: %v", err)
	}

	// Setup graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\nShutting down server...")
		cancel()
	}()

	fmt.Printf("Starting Tick Board server at http://localhost:%d\n", boardPort)
	fmt.Printf("Serving ticks from: %s\n", tickDir)

	// Check for cloud configuration
	cloudCfg := cloud.LoadConfig(tickDir, boardPort)
	var cloudClient *cloud.Client
	if cloudCfg != nil {
		var err error
		cloudClient, err = cloud.NewClient(*cloudCfg)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: failed to create cloud client: %v\n", err)
		} else {
			// Connect server to cloud for event broadcasting
			srv.SetCloudClient(cloudClient)

			// Start cloud client in background
			go func() {
				if err := cloudClient.Run(ctx); err != nil && ctx.Err() == nil {
					fmt.Fprintf(os.Stderr, "Cloud client error: %v\n", err)
				}
			}()
			fmt.Printf("Cloud: connecting to %s as %s\n", cloudCfg.CloudURL, cloudCfg.BoardName)
		}
	}

	fmt.Println("Press Ctrl+C to stop")

	if err := srv.Run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return NewExitError(ExitGeneric, "server error: %v", err)
	}

	// Clean up cloud client
	if cloudClient != nil {
		cloudClient.Close()
	}

	return nil
}

// findTickDir looks for a .tick directory in the given path.
// Returns the path to the .tick directory if found, or an error if not.
func findTickDir(path string) (string, error) {
	tickDir := filepath.Join(path, ".tick")
	info, err := os.Stat(tickDir)
	if err != nil {
		if os.IsNotExist(err) {
			return "", NewExitError(ExitNoRepo, "no .tick directory found in %s", path)
		}
		return "", NewExitError(ExitGeneric, "failed to access .tick directory: %v", err)
	}
	if !info.IsDir() {
		return "", NewExitError(ExitGeneric, ".tick exists but is not a directory")
	}
	return tickDir, nil
}
