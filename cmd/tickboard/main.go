package main

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

	"github.com/pengelbrecht/ticks/internal/tickboard/cloud"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
)

var Version = "dev"

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

var (
	port int
)

var rootCmd = &cobra.Command{
	Use:   "tickboard [path]",
	Short: "Web kanban board for ticks",
	Long: `Tick Board - A local web server that displays ticks in a kanban board interface.

The server looks for a .tick directory in the specified path or current directory.
It provides a web interface for viewing and interacting with ticks.`,
	Args: cobra.MaximumNArgs(1),
	RunE: runServer,
}

func init() {
	rootCmd.Flags().IntVarP(&port, "port", "p", 3000, "port to listen on")
	rootCmd.Version = Version
}

func runServer(cmd *cobra.Command, args []string) error {
	// Determine the path to serve
	var repoPath string
	if len(args) > 0 {
		repoPath = args[0]
	} else {
		cwd, err := os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get current directory: %w", err)
		}
		repoPath = cwd
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		return fmt.Errorf("failed to resolve path: %w", err)
	}

	// Find .tick directory
	tickDir, err := findTickDir(absPath)
	if err != nil {
		return err
	}

	// Create and start server
	srv, err := server.New(tickDir, port)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
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

	fmt.Printf("Starting Tick Board server at http://localhost:%d\n", port)
	fmt.Printf("Serving ticks from: %s\n", tickDir)

	// Check for cloud configuration
	cloudCfg := cloud.LoadConfig(tickDir, port)
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
		return fmt.Errorf("server error: %w", err)
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
			return "", fmt.Errorf("no .tick directory found in %s", path)
		}
		return "", fmt.Errorf("failed to access .tick directory: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf(".tick exists but is not a directory")
	}
	return tickDir, nil
}
