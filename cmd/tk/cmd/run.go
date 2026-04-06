package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/config"
	epiccontext "github.com/pengelbrecht/ticks/internal/context"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/gc"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tickboard/cloud"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/worktree"
	"github.com/pengelbrecht/ticks/internal/wrapup"
)

var runCmd = &cobra.Command{
	Use:   "run [epic-id]",
	Short: "Run AI agent on an epic",
	Long: `Run AI agent on an epic in an isolated worktree.

Every run creates (or reuses) a git worktree so changes are isolated
from the main branch until the epic completes.

If no epic-id is specified, use --auto to auto-select the next ready epic,
or use --board to start the board UI without running an agent.

Examples:
  tk run abc123                     # Run epic
  tk run --auto                     # Auto-select next ready epic
  tk run abc123 --watch             # Watch mode
  tk run abc123 --board             # With board UI
  tk run abc123 --pr                # Auto-create draft PR
  tk run abc123 --no-merge          # Don't merge, leave branch

If .tick/wrapup.md exists, agent-driven wrapup steps run after shell steps from config.yaml.`,
	RunE: runRun,
}

var (
	runMaxIterations     int
	runMaxCost           float64
	runMaxTaskRetries    int
	runAuto              bool
	runJSONL             bool
	runVerifyOnly        bool
	runWatch             bool
	runTimeout           time.Duration
	runPoll              time.Duration
	runDebounce          time.Duration
	runIncludeStandalone bool
	runIncludeOrphans    bool
	runAll               bool
	runBoardEnabled      bool
	runBoardPort         int
	runCloudEnabled      bool
	runDevMode           bool
	runSkipWrapUp        bool
	runNoMerge           bool
	runPR                bool
	runAgent             string
)

func init() {
	runCmd.Flags().IntVar(&runMaxIterations, "max-iterations", 50, "maximum iterations per task")
	runCmd.Flags().Float64Var(&runMaxCost, "max-cost", 0, "maximum cost in USD (0=unlimited)")
	runCmd.Flags().IntVar(&runMaxTaskRetries, "max-task-retries", 3, "max retries for failed tasks")
	runCmd.Flags().BoolVar(&runAuto, "auto", false, "auto-select next ready epic if none specified")
	runCmd.Flags().BoolVar(&runJSONL, "jsonl", false, "output JSONL format for parsing")
	runCmd.Flags().BoolVar(&runVerifyOnly, "verify-only", false, "only run verification, no agent")
	runCmd.Flags().BoolVar(&runWatch, "watch", false, "watch mode - restart when tasks become ready")
	runCmd.Flags().DurationVar(&runTimeout, "timeout", 30*time.Minute, "task timeout duration")
	runCmd.Flags().DurationVar(&runPoll, "poll", 10*time.Second, "poll interval for watch mode")
	runCmd.Flags().DurationVar(&runDebounce, "debounce", 0, "debounce interval for file changes")
	runCmd.Flags().BoolVar(&runIncludeStandalone, "include-standalone", false, "include tasks without parent epic")
	runCmd.Flags().BoolVar(&runIncludeOrphans, "include-orphans", false, "include orphaned tasks")
	runCmd.Flags().BoolVar(&runAll, "all", false, "run all ready tasks, not just first")
	runCmd.Flags().BoolVar(&runBoardEnabled, "board", false, "start board UI server")
	runCmd.Flags().IntVar(&runBoardPort, "port", 3000, "board server port (requires --board)")
	runCmd.Flags().BoolVar(&runCloudEnabled, "cloud", false, "enable real-time cloud sync (implies --board)")
	runCmd.Flags().BoolVar(&runDevMode, "dev", false, "serve UI from disk for hot reload (requires --board)")
	runCmd.Flags().BoolVar(&runSkipWrapUp, "skip-wrap-up", false, "skip wrap-up phase")
	runCmd.Flags().BoolVar(&runNoMerge, "no-merge", false, "don't merge worktree branch on completion")
	runCmd.Flags().BoolVar(&runPR, "pr", false, "create draft PR after successful run")
	runCmd.Flags().StringVar(&runAgent, "agent", "", `agent backend: "claude" (direct CLI), or "acp:<name>" for ACP (e.g., "acp:codex", "acp:gemini")`)

	rootCmd.AddCommand(runCmd)
}

// runOutput is the JSONL output format for run results.
type runOutput struct {
	EpicID         string   `json:"epic_id"`
	Iterations     int      `json:"iterations"`
	TotalTokens    int      `json:"total_tokens"`
	TotalCost      float64  `json:"total_cost"`
	DurationSec    float64  `json:"duration_sec"`
	CompletedTasks []string `json:"completed_tasks"`
	ExitReason     string   `json:"exit_reason"`
	Signal         string   `json:"signal,omitempty"`
	SignalReason   string   `json:"signal_reason,omitempty"`
}

func runRun(cmd *cobra.Command, args []string) error {
	// --cloud implies --board
	if runCloudEnabled {
		runBoardEnabled = true
	}

	// --watch implies --auto (auto-select epics when watching)
	if runWatch {
		runAuto = true
	}

	// Start async garbage collection
	go func() {
		root, err := repoRoot()
		if err != nil {
			return
		}
		_, _ = gc.Cleanup(root, gc.DefaultMaxAge)
	}()

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "not in a git repository: %v", err)
	}

	tickDir := filepath.Join(root, ".tick")

	// Determine epic ID to run (single epic only)
	var epicID string
	runningAgent := true

	if len(args) > 1 {
		return NewExitError(ExitUsage, "only one epic can be run at a time; run separate tk run commands for each epic")
	}

	if len(args) == 1 {
		epicID = args[0]
	} else if runAuto {
		// Auto-select next ready epic
		client := ticks.NewClient(tickDir)
		epic, err := client.NextReadyEpic()
		if err != nil {
			return NewExitError(ExitGeneric, "failed to find ready epic: %v", err)
		}
		if epic == nil {
			if runJSONL {
				output := runOutput{ExitReason: "no ready epics"}
				enc := json.NewEncoder(os.Stdout)
				_ = enc.Encode(output)
				return nil
			}
			fmt.Println("No ready epics")
			return nil
		}
		epicID = epic.ID
	} else if runBoardEnabled {
		// Board-only mode: no agent, just serve the board
		runningAgent = false
	} else {
		return NewExitError(ExitUsage, "specify an epic-id, use --auto, or use --board")
	}

	// Verify-only mode not implemented yet
	if runVerifyOnly {
		return NewExitError(ExitUsage, "--verify-only is not yet implemented")
	}

	// Set up signal handling for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		if !runJSONL {
			fmt.Fprintln(os.Stderr, "\nShutting down...")
		}
		cancel()
	}()

	var wg sync.WaitGroup
	var boardServer *server.Server
	var cloudClient *cloud.Client

	// Start board server if requested
	if runBoardEnabled {
		// Find an available port
		actualPort, err := findAvailablePort(runBoardPort)
		if err != nil {
			return NewExitError(ExitGeneric, "failed to find available port: %v", err)
		}

		var serverOpts []server.ServerOption
		if runDevMode {
			serverOpts = append(serverOpts, server.WithDevMode(true))
		}
		boardServer, err = server.New(tickDir, actualPort, serverOpts...)
		if err != nil {
			return NewExitError(ExitGeneric, "failed to create board server: %v", err)
		}

		// Check for cloud configuration (only if --cloud specified)
		if runCloudEnabled {
			cloudCfg := cloud.LoadConfig(tickDir)
			if cloudCfg == nil {
				return NewExitError(ExitGeneric, `cloud sync requires authentication.
Add token to ~/.ticksrc:
  token=your-token-here

Get a token at https://ticks.sh/settings`)
			}
			cloudClient, err = cloud.NewClient(*cloudCfg)
			if err != nil {
				return NewExitError(ExitGeneric, "failed to create cloud client: %v", err)
			}

			// Connect server to cloud for event broadcasting
			boardServer.SetCloudClient(cloudClient)

			// Start cloud client in background
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := cloudClient.Run(ctx); err != nil && ctx.Err() == nil {
					fmt.Fprintf(os.Stderr, "Cloud client error: %v\n", err)
				}
			}()
			fmt.Printf("Cloud: syncing as %s\n", cloudCfg.BoardName)
		}

		// Start board server in background
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := boardServer.Run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
				fmt.Fprintf(os.Stderr, "Board server error: %v\n", err)
			}
		}()

		fmt.Printf("Board: http://localhost:%d\n", actualPort)
	}

	// Run agent if we have an epic
	if runningAgent {
		agentImpl, err := resolveAgent(tickDir)
		if err != nil {
			cancel()
			wg.Wait()
			return NewExitError(ExitGeneric, "%v", err)
		}
		if !agentImpl.Available() {
			cancel()
			wg.Wait()
			return NewExitError(ExitGeneric, "agent %q not found - ensure the CLI is installed and on your PATH", agentImpl.Name())
		}

		// Always create/reuse worktree
		wtManager, err := worktree.NewManager(root)
		if err != nil {
			cancel()
			wg.Wait()
			return NewExitError(ExitGeneric, "failed to create worktree manager: %v", err)
		}

		wt, err := wtManager.Create(epicID)
		if err != nil {
			if err == worktree.ErrWorktreeExists {
				wt, err = wtManager.Get(epicID)
			}
			if err != nil {
				cancel()
				wg.Wait()
				return NewExitError(ExitGeneric, "failed to create worktree: %v", err)
			}
		}

		if !runJSONL {
			fmt.Printf("Agent: %s\n", agentImpl.Name())
			fmt.Printf("Worktree: %s\n", wt.Path)
		}

		// Run engine with wave loop
		result, err := runEpic(ctx, root, epicID, agentImpl, wt.Path)
		if err != nil {
			if ctx.Err() != nil {
				// Context cancelled - output partial result if we have one
				if result != nil {
					outputResult(result)
				}
			} else {
				cancel()
				wg.Wait()
				return NewExitError(ExitGeneric, "run failed for epic %s: %v", epicID, err)
			}
		} else {
			outputResult(result)
		}

		// Phase 3: wrap-up (steps, report, merge/preserve, PR)
		if !runSkipWrapUp && result != nil {
			wrapupConfig, _ := wrapup.LoadConfig(tickDir)
			runner := &wrapup.Runner{
				WorkDir:   wt.Path,
				RepoRoot:  root,
				EpicID:    epicID,
				TickDir:   tickDir,
				WtManager: wtManager,
				Worktree:  wt,
				NoMerge:   runNoMerge,
				CreatePR:  runPR,
				JSONL:     runJSONL,
				Agent:     agentImpl,
			}
			report, wrapErr := runner.Run(ctx, wrapupConfig, result)
			if wrapErr != nil {
				fmt.Fprintf(os.Stderr, "Warning: wrap-up failed: %v\n", wrapErr)
			}
			_ = report
		} else if result != nil && !runSkipWrapUp {
			// No result, nothing to wrap up
		} else if result != nil {
			// --skip-wrap-up: fall back to legacy merge/preserve
			if engine.ShouldCleanupWorktree(result.ExitReason) && !runNoMerge {
				mergeManager, mergeErr := worktree.NewMergeManager(root)
				if mergeErr == nil {
					mergeResult, mergeErr := mergeManager.Merge(wt, worktree.MergeOptions{})
					if mergeErr != nil {
						fmt.Fprintf(os.Stderr, "Warning: merge failed: %v\n", mergeErr)
						fmt.Fprintf(os.Stderr, "Worktree preserved at: %s\n", wt.Path)
					} else if !mergeResult.Success {
						fmt.Fprintf(os.Stderr, "Warning: merge conflicts in: %v\n", mergeResult.Conflicts)
						fmt.Fprintf(os.Stderr, "Worktree preserved at: %s\n", wt.Path)
					} else {
						_ = wtManager.Remove(epicID)
						if !runJSONL {
							fmt.Printf("Merged to %s and cleaned up worktree\n", mergeResult.TargetBranch)
						}
					}
				}
			} else if !runJSONL {
				fmt.Printf("Worktree preserved for resumption: %s\n", wt.Path)
			}
		}
	} else {
		// Board-only mode: wait for shutdown signal
		fmt.Println("Press Ctrl+C to stop")
		<-ctx.Done()
	}

	// Clean up
	if cloudClient != nil {
		cloudClient.Close()
	}
	wg.Wait()

	return nil
}

func runEpic(ctx context.Context, root, epicID string, agentImpl agent.Agent, workDir string) (*engine.RunResult, error) {
	// Create dependencies
	ticksClient := ticks.NewClient(filepath.Join(root, ".tick"))
	budgetTracker := budget.NewTracker(budget.Limits{
		MaxIterations: runMaxIterations,
		MaxCost:       runMaxCost,
	})

	// Create engine
	eng := engine.NewEngine(agentImpl, ticksClient, budgetTracker)

	// Enable live run record streaming for ticks board
	runRecordStore := runrecord.NewStore(root)
	eng.SetRunRecordStore(runRecordStore)

	// Enable context generation for epics
	contextStore := epiccontext.NewStoreWithDir(filepath.Join(root, ".tick", "logs", "context"))
	contextGenerator, err := epiccontext.NewGenerator(agentImpl)
	if err == nil {
		eng.SetContextComponents(contextStore, contextGenerator)
	}

	// Set up output streaming for non-JSONL mode
	if !runJSONL {
		eng.OnOutput = func(chunk string) {
			fmt.Print(chunk)
		}
		eng.OnIterationStart = func(ctx engine.IterationContext) {
			fmt.Printf("\n=== Iteration %d: %s (%s) ===\n", ctx.Iteration, ctx.Task.ID, ctx.Task.Title)
		}
		eng.OnIterationEnd = func(result *engine.IterationResult) {
			fmt.Printf("\n--- Iteration %d complete (tokens: %d in, %d out, cost: $%.4f) ---\n",
				result.Iteration, result.TokensIn, result.TokensOut, result.Cost)
		}
		// Context generation status callbacks
		eng.OnContextGenerating = func(epicID string, taskCount int) {
			fmt.Printf("\nGenerating epic context for %s (%d tasks)...\n", epicID, taskCount)
		}
		eng.OnContextGenerated = func(epicID string, tokenCount int) {
			fmt.Printf("Context generated (~%d tokens)\n", tokenCount)
		}
		eng.OnContextLoaded = func(epicID string, content string) {
			fmt.Printf("Using existing context for %s\n", epicID)
		}
		eng.OnContextSkipped = func(epicID string, reason string) {
			fmt.Printf("Context skipped: %s\n", reason)
		}
		eng.OnContextFailed = func(epicID string, errMsg string) {
			fmt.Printf("Context generation failed: %s\n", errMsg)
		}
	}

	// Build run config
	config := engine.RunConfig{
		EpicID:            epicID,
		MaxIterations:     runMaxIterations,
		MaxCost:           runMaxCost,
		MaxTaskRetries:    runMaxTaskRetries,
		AgentTimeout:      runTimeout,
		WorkDir:           workDir,
		Watch:             runWatch,
		WatchPollInterval: runPoll,
	}

	// Run the engine
	return eng.Run(ctx, config)
}

func outputResult(result *engine.RunResult) {
	if runJSONL {
		output := runOutput{
			EpicID:         result.EpicID,
			Iterations:     result.Iterations,
			TotalTokens:    result.TotalTokens,
			TotalCost:      result.TotalCost,
			DurationSec:    result.Duration.Seconds(),
			CompletedTasks: result.CompletedTasks,
			ExitReason:     result.ExitReason,
		}
		if result.Signal != engine.SignalNone {
			output.Signal = result.Signal.String()
			output.SignalReason = result.SignalReason
		}
		enc := json.NewEncoder(os.Stdout)
		_ = enc.Encode(output)
	} else {
		fmt.Printf("\n=== Run Complete ===\n")
		fmt.Printf("Epic: %s\n", result.EpicID)
		fmt.Printf("Iterations: %d\n", result.Iterations)
		fmt.Printf("Tokens: %d\n", result.TotalTokens)
		fmt.Printf("Cost: $%.4f\n", result.TotalCost)
		fmt.Printf("Duration: %v\n", result.Duration.Round(time.Second))
		fmt.Printf("Completed tasks: %d\n", len(result.CompletedTasks))
		fmt.Printf("Exit reason: %s\n", result.ExitReason)
		if result.Signal != engine.SignalNone {
			fmt.Printf("Signal: %s\n", result.Signal)
			if result.SignalReason != "" {
				fmt.Printf("Signal reason: %s\n", result.SignalReason)
			}
		}
	}
}

// findAvailablePort finds an available port starting from the given port.
// If the port is in use, it tries the next port, up to maxAttempts times.
// Checks both IPv4 and IPv6 localhost to avoid conflicts with apps bound to one or the other.
func findAvailablePort(startPort int) (int, error) {
	const maxAttempts = 100
	for i := 0; i < maxAttempts; i++ {
		port := startPort + i
		if isPortAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+maxAttempts-1)
}

// resolveAgent determines which agent to use based on --agent flag and config.
// Flag takes precedence over config. Format:
//   - "claude" or "" → direct Claude CLI (fallback, no ACP dependency)
//   - "acp:<name>"   → ACP agent (e.g., "acp:codex", "acp:gemini", "acp:claude")
//   - "acp"          → ACP agent with name from config (default "claude")
func resolveAgent(tickDir string) (agent.Agent, error) {
	agentSpec := runAgent

	// Fall back to config if no flag
	var agentCfg *config.AgentConfig
	if agentSpec == "" {
		cfg, err := config.LoadOrDefault(filepath.Join(tickDir, "config.json"))
		if err == nil && cfg.Agent != nil {
			agentCfg = cfg.Agent
			backend := agentCfg.GetBackend()
			if backend == "acp" {
				agentSpec = "acp:" + agentCfg.GetName()
			} else {
				agentSpec = backend
			}
		}
	}

	// Default to direct Claude CLI
	if agentSpec == "" || agentSpec == "claude" {
		return agent.NewClaudeAgent(), nil
	}

	// Parse acp:<name> format
	var name string
	if agentSpec == "acp" {
		name = "claude"
	} else if len(agentSpec) > 4 && agentSpec[:4] == "acp:" {
		name = agentSpec[4:]
		if name == "" {
			return nil, fmt.Errorf("agent name required after 'acp:' (e.g., acp:codex)")
		}
	} else {
		return nil, fmt.Errorf("unknown agent %q (use 'claude' or 'acp:<name>')", agentSpec)
	}

	a := agent.NewAcpAgent(name)

	// Apply custom command from config if present
	if agentCfg != nil && len(agentCfg.GetCommand()) > 0 {
		a.Command = agentCfg.GetCommand()
	}

	return a, nil
}

// isPortAvailable checks if a port is available on all localhost interfaces.
// This prevents conflicts where another app binds to IPv6 localhost only.
func isPortAvailable(port int) bool {
	// Check IPv4 localhost
	addr4 := fmt.Sprintf("127.0.0.1:%d", port)
	l4, err := net.Listen("tcp4", addr4)
	if err != nil {
		return false
	}
	l4.Close()

	// Check IPv6 localhost
	addr6 := fmt.Sprintf("[::1]:%d", port)
	l6, err := net.Listen("tcp6", addr6)
	if err != nil {
		return false
	}
	l6.Close()

	return true
}
