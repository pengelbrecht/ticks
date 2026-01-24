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
	"github.com/pengelbrecht/ticks/internal/checkpoint"
	epiccontext "github.com/pengelbrecht/ticks/internal/context"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/gc"
	"github.com/pengelbrecht/ticks/internal/parallel"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/swarm"
	"github.com/pengelbrecht/ticks/internal/tickboard/cloud"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/worktree"
)

var runCmd = &cobra.Command{
	Use:   "run [epic-id...]",
	Short: "Run AI agent on epics",
	Long: `Run AI agent on one or more epics until tasks are complete.

If no epic-id is specified, use --auto to auto-select the next ready epic,
or use --board to start the board UI without running an agent.

Execution modes:
  --ralph (default)  Ralph iteration loop - orchestrates tasks via Go engine
  --swarm            Swarm mode - spawns Claude to orchestrate parallel subagents

Examples:
  tk run abc123                     # Run agent on epic abc123 (ralph mode)
  tk run abc123 --swarm             # Run using swarm orchestration
  tk run abc123 --swarm --max-agents 3  # Swarm with max 3 parallel agents
  tk run abc123 def456              # Run agent on multiple epics (sequential)
  tk run abc def --parallel 2       # Run 2 epics in parallel with worktrees
  tk run --auto                     # Auto-select next ready epic
  tk run abc123 --max-iterations 10 # Limit to 10 iterations per task
  tk run abc123 --max-cost 5.00     # Stop if cost exceeds $5.00
  tk run abc123 --worktree          # Run in isolated git worktree
  tk run abc123 --watch             # Watch mode - restart when tasks ready
  tk run abc123 --jsonl             # Output JSONL format for parsing
  tk run abc123 --board             # Run agent with board UI on :3000
  tk run --board                    # Board UI only, no agent
  tk run --board --port 8080        # Board UI on custom port
  tk run abc123 --cloud             # Run with real-time cloud sync (implies --board)
  tk run --cloud                    # Board UI with cloud sync, no agent
  tk run --board --dev              # Board with hot reload from disk`,
	RunE: runRun,
}

var (
	runMaxIterations     int
	runMaxCost           float64
	runCheckpointEvery   int
	runMaxTaskRetries    int
	runAuto              bool
	runJSONL             bool
	runSkipVerify        bool
	runVerifyOnly        bool
	runWorktree          bool
	runParallel          int
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
	runSwarmMode         bool
	runRalphMode         bool
	runMaxAgents         int
)

func init() {
	runCmd.Flags().IntVar(&runMaxIterations, "max-iterations", 50, "maximum iterations per task")
	runCmd.Flags().Float64Var(&runMaxCost, "max-cost", 0, "maximum cost in USD (0=unlimited)")
	runCmd.Flags().IntVar(&runCheckpointEvery, "checkpoint-interval", 5, "checkpoint every N iterations")
	runCmd.Flags().IntVar(&runMaxTaskRetries, "max-task-retries", 3, "max retries for failed tasks")
	runCmd.Flags().BoolVar(&runAuto, "auto", false, "auto-select next ready epic if none specified")
	runCmd.Flags().BoolVar(&runJSONL, "jsonl", false, "output JSONL format for parsing")
	runCmd.Flags().BoolVar(&runSkipVerify, "skip-verify", false, "skip verification after task completion")
	runCmd.Flags().BoolVar(&runVerifyOnly, "verify-only", false, "only run verification, no agent")
	runCmd.Flags().BoolVar(&runWorktree, "worktree", false, "run in isolated git worktree")
	runCmd.Flags().IntVar(&runParallel, "parallel", 1, "run N epics in parallel (uses worktrees)")
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
	runCmd.Flags().BoolVar(&runSwarmMode, "swarm", false, "use swarm mode (Claude orchestrates parallel subagents)")
	runCmd.Flags().BoolVar(&runRalphMode, "ralph", false, "use ralph mode (Go engine iteration loop, default)")
	runCmd.Flags().IntVar(&runMaxAgents, "max-agents", 5, "maximum parallel subagents per wave (swarm mode only)")

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
	// Validate mode flags
	if runSwarmMode && runRalphMode {
		return NewExitError(ExitUsage, "cannot use both --swarm and --ralph")
	}

	// --cloud implies --board
	if runCloudEnabled {
		runBoardEnabled = true
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

	// Determine epic IDs to run
	epicIDs := args
	runningAgent := true
	if len(epicIDs) == 0 {
		if runAuto {
			// Auto-select next ready epic
			client := ticks.NewClient(tickDir)
			epic, err := client.NextReadyEpic()
			if err != nil {
				return NewExitError(ExitGeneric, "failed to find ready epic: %v", err)
			}
			if epic == nil {
				if runJSONL {
					// Output empty result
					output := runOutput{ExitReason: "no ready epics"}
					enc := json.NewEncoder(os.Stdout)
					_ = enc.Encode(output)
					return nil
				}
				fmt.Println("No ready epics")
				return nil
			}
			epicIDs = []string{epic.ID}
		} else if runBoardEnabled {
			// Board-only mode: no agent, just serve the board
			runningAgent = false
		} else {
			return NewExitError(ExitUsage, "specify epic-id(s), use --auto, or use --board")
		}
	}

	// Verify-only mode not implemented yet
	if runVerifyOnly {
		return NewExitError(ExitUsage, "--verify-only is not yet implemented")
	}

	// Parallel mode requires worktree
	if runParallel > 1 {
		runWorktree = true
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

		// Check for cloud configuration
		cloudCfg := cloud.LoadConfig(tickDir, actualPort)
		if runCloudEnabled {
			// --cloud requires authentication
			if cloudCfg == nil {
				return NewExitError(ExitGeneric, `cloud sync requires authentication.
Add token to ~/.ticksrc:
  token=your-token-here

Get a token at https://ticks.sh/settings`)
			}
			// Enable sync mode for real-time DO sync
			cloudCfg.Mode = cloud.ModeSync
		}
		if cloudCfg != nil {
			cloudClient, err = cloud.NewClient(*cloudCfg)
			if err != nil {
				if runCloudEnabled {
					// --cloud explicitly requested, fail hard
					return NewExitError(ExitGeneric, "failed to create cloud client: %v", err)
				}
				fmt.Fprintf(os.Stderr, "Warning: failed to create cloud client: %v\n", err)
			} else {
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
				if runCloudEnabled {
					fmt.Printf("Cloud: syncing to DO as %s\n", cloudCfg.BoardName)
				} else {
					fmt.Printf("Cloud: connecting to %s as %s\n", cloudCfg.CloudURL, cloudCfg.BoardName)
				}
			}
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

	// Run agent if we have epics
	if runningAgent {
		// Swarm mode: use Claude to orchestrate parallel subagents
		if runSwarmMode {
			swarmRunner := swarm.NewRunner(runMaxAgents)
			if !swarmRunner.Available() {
				cancel()
				wg.Wait()
				return NewExitError(ExitGeneric, "claude CLI not found - install from https://claude.ai/code")
			}

			// Set up output streaming
			if !runJSONL {
				swarmRunner.OnOutput = func(chunk string) {
					fmt.Print(chunk)
				}
				swarmRunner.OnStart = func(epicID string) {
					fmt.Printf("\n🐝 Starting swarm for epic %s (max %d agents)...\n", epicID, runMaxAgents)
				}
				swarmRunner.OnEnd = func(epicID string, result *swarm.Result) {
					if result.Success {
						fmt.Printf("\n✅ Swarm completed for epic %s (duration: %v)\n", epicID, result.Duration.Round(time.Second))
					} else {
						fmt.Printf("\n❌ Swarm failed for epic %s: %v\n", epicID, result.Error)
					}
				}
			}

			// Set up run record store for live streaming (if board is running)
			var runRecordStore *runrecord.Store
			if runBoardEnabled {
				runRecordStore = runrecord.NewStore(root)
			}

			// Run each epic with swarm
			for _, epicID := range epicIDs {
				// Set up OnState callback to write epic live records
				if runRecordStore != nil {
					currentEpicID := epicID // Capture for closure
					swarmRunner.OnState = func(snap agent.AgentStateSnapshot) {
						_ = runRecordStore.WriteEpicLive(currentEpicID, snap)
					}
				}
				var workDir string

				// Set up worktree if requested
				var wtManager *worktree.Manager
				var wt *worktree.Worktree
				if runWorktree {
					var err error
					wtManager, err = worktree.NewManager(root)
					if err != nil {
						cancel()
						wg.Wait()
						return NewExitError(ExitGeneric, "failed to create worktree manager: %v", err)
					}

					wt, err = wtManager.Create(epicID)
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
					workDir = wt.Path
					if !runJSONL {
						fmt.Printf("📂 Using worktree: %s\n", workDir)
					}
				}

				// Run swarm
				result, err := swarmRunner.Run(ctx, epicID, workDir)

				// Clean up epic live record after run (success or failure)
				if runRecordStore != nil {
					_ = runRecordStore.DeleteEpicLive(epicID)
				}

				if err != nil {
					if ctx.Err() != nil {
						break
					}
					cancel()
					wg.Wait()
					return NewExitError(ExitGeneric, "swarm failed for epic %s: %v", epicID, err)
				}

				// Handle worktree merge if successful
				if runWorktree && wt != nil && result.Success {
					mergeManager, err := worktree.NewMergeManager(root)
					if err == nil {
						if !runJSONL {
							fmt.Printf("🔀 Merging worktree to main...\n")
						}
						mergeResult, mergeErr := mergeManager.Merge(wt)
						if mergeErr != nil {
							fmt.Fprintf(os.Stderr, "Warning: merge failed: %v\n", mergeErr)
						} else if !mergeResult.Success {
							fmt.Fprintf(os.Stderr, "Warning: merge conflicts in: %v\n", mergeResult.Conflicts)
							fmt.Fprintf(os.Stderr, "Worktree preserved at: %s\n", wt.Path)
						} else {
							// Cleanup worktree on successful merge
							_ = wtManager.Remove(epicID)
							if !runJSONL {
								fmt.Printf("✅ Merged and cleaned up worktree\n")
							}
						}
					}
				}

				// Output result in JSONL mode
				if runJSONL {
					output := runOutput{
						EpicID:     epicID,
						DurationSec: result.Duration.Seconds(),
						ExitReason: "swarm completed",
					}
					if !result.Success {
						output.ExitReason = fmt.Sprintf("swarm failed: %v", result.Error)
					}
					enc := json.NewEncoder(os.Stdout)
					_ = enc.Encode(output)
				}

				if ctx.Err() != nil {
					break
				}
			}
		} else {
			// Ralph mode (default): use Go engine iteration loop
			claudeAgent := agent.NewClaudeAgent()
			if !claudeAgent.Available() {
				cancel() // Stop board server too
				wg.Wait()
				return NewExitError(ExitGeneric, "claude CLI not found - install from https://claude.ai/code")
			}

			// Parallel execution with worktrees
			if runParallel > 1 && len(epicIDs) > 1 {
				parallelResult, err := runParallelEpics(ctx, root, epicIDs, claudeAgent)
				if err != nil {
					cancel()
					wg.Wait()
					return NewExitError(ExitGeneric, "parallel run failed: %v", err)
				}
				outputParallelResult(parallelResult)
			} else {
				// Run each epic sequentially
				for _, epicID := range epicIDs {
					result, err := runEpic(ctx, root, epicID, claudeAgent)
					if err != nil {
						if ctx.Err() != nil {
							// Context cancelled - output partial result if we have one
							if result != nil {
								outputResult(result)
							}
							break
						}
						cancel() // Stop board server too
						wg.Wait()
						return NewExitError(ExitGeneric, "run failed for epic %s: %v", epicID, err)
					}

					outputResult(result)

					// Stop if context cancelled
					if ctx.Err() != nil {
						break
					}
				}
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

func runEpic(ctx context.Context, root, epicID string, agentImpl agent.Agent) (*engine.RunResult, error) {
	// Create dependencies
	ticksClient := ticks.NewClient(filepath.Join(root, ".tick"))
	budgetTracker := budget.NewTracker(budget.Limits{
		MaxIterations: runMaxIterations,
		MaxCost:       runMaxCost,
	})
	checkpointMgr := checkpoint.NewManager()

	// Create engine
	eng := engine.NewEngine(agentImpl, ticksClient, budgetTracker, checkpointMgr)

	// Enable live run record streaming for ticks board
	runRecordStore := runrecord.NewStore(root)
	eng.SetRunRecordStore(runRecordStore)

	// Enable verification unless skipped
	if !runSkipVerify {
		eng.EnableVerification()
	}

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
			fmt.Printf("\n📚 Generating epic context for %s (%d tasks)...\n", epicID, taskCount)
		}
		eng.OnContextGenerated = func(epicID string, tokenCount int) {
			fmt.Printf("✓ Context generated (~%d tokens)\n", tokenCount)
		}
		eng.OnContextLoaded = func(epicID string, content string) {
			fmt.Printf("📖 Using existing context for %s\n", epicID)
		}
		eng.OnContextSkipped = func(epicID string, reason string) {
			fmt.Printf("⏭ Context skipped: %s\n", reason)
		}
		eng.OnContextFailed = func(epicID string, errMsg string) {
			fmt.Printf("⚠ Context generation failed: %s\n", errMsg)
		}
	}

	// Build run config
	config := engine.RunConfig{
		EpicID:            epicID,
		MaxIterations:     runMaxIterations,
		MaxCost:           runMaxCost,
		CheckpointEvery:   runCheckpointEvery,
		MaxTaskRetries:    runMaxTaskRetries,
		AgentTimeout:      runTimeout,
		SkipVerify:        runSkipVerify,
		UseWorktree:       runWorktree,
		RepoRoot:          root,
		Watch:             runWatch,
		WatchPollInterval: runPoll,
		DebounceInterval:  runDebounce,
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

func runParallelEpics(ctx context.Context, root string, epicIDs []string, agentImpl agent.Agent) (*parallel.ParallelResult, error) {
	tickDir := filepath.Join(root, ".tick")

	// Create worktree manager
	wtManager, err := worktree.NewManager(root)
	if err != nil {
		return nil, fmt.Errorf("creating worktree manager: %w", err)
	}

	// Create merge manager
	mergeManager, err := worktree.NewMergeManager(root)
	if err != nil {
		return nil, fmt.Errorf("creating merge manager: %w", err)
	}

	// Create shared budget tracker
	sharedBudget := budget.NewTracker(budget.Limits{
		MaxIterations: runMaxIterations * len(epicIDs), // Scale by epic count
		MaxCost:       runMaxCost,
	})

	// Create run record store for live updates
	runRecordStore := runrecord.NewStore(root)

	// Engine factory creates an engine for each epic
	engineFactory := func(epicID string) *engine.Engine {
		ticksClient := ticks.NewClient(tickDir)
		// Each epic gets its own budget slice, but shares the tracker
		epicBudget := budget.NewTracker(budget.Limits{
			MaxIterations: runMaxIterations,
			MaxCost:       runMaxCost / float64(len(epicIDs)), // Divide cost budget
		})
		checkpointMgr := checkpoint.NewManager()

		eng := engine.NewEngine(agentImpl, ticksClient, epicBudget, checkpointMgr)
		eng.SetRunRecordStore(runRecordStore)

		if !runSkipVerify {
			eng.EnableVerification()
		}

		// Context generation for epics
		contextStore := epiccontext.NewStoreWithDir(filepath.Join(tickDir, "logs", "context"))
		contextGenerator, err := epiccontext.NewGenerator(agentImpl)
		if err == nil {
			eng.SetContextComponents(contextStore, contextGenerator)
		}

		// Set up output streaming for non-JSONL mode
		if !runJSONL {
			eng.OnOutput = func(chunk string) {
				fmt.Printf("[%s] %s", epicID, chunk)
			}
			eng.OnIterationStart = func(ctx engine.IterationContext) {
				fmt.Printf("\n=== [%s] Iteration %d: %s (%s) ===\n", epicID, ctx.Iteration, ctx.Task.ID, ctx.Task.Title)
			}
			eng.OnIterationEnd = func(result *engine.IterationResult) {
				fmt.Printf("\n--- [%s] Iteration %d complete (tokens: %d, cost: $%.4f) ---\n",
					epicID, result.Iteration, result.TokensIn+result.TokensOut, result.Cost)
			}
		}

		return eng
	}

	// Create parallel runner config
	runnerConfig := parallel.RunnerConfig{
		EpicIDs:         epicIDs,
		MaxParallel:     runParallel,
		SharedBudget:    sharedBudget,
		WorktreeManager: wtManager,
		MergeManager:    mergeManager,
		EngineFactory:   engineFactory,
		EngineConfig: engine.RunConfig{
			MaxIterations:     runMaxIterations,
			MaxCost:           runMaxCost / float64(len(epicIDs)),
			CheckpointEvery:   runCheckpointEvery,
			MaxTaskRetries:    runMaxTaskRetries,
			AgentTimeout:      runTimeout,
			SkipVerify:        runSkipVerify,
			RepoRoot:          root,
			Watch:             runWatch,
			WatchPollInterval: runPoll,
			DebounceInterval:  runDebounce,
		},
	}

	// Create runner
	runner := parallel.NewRunner(runnerConfig)

	// Set up callbacks for status updates
	if !runJSONL {
		runner.SetCallbacks(parallel.RunnerCallbacks{
			OnEpicStart: func(epicID string) {
				fmt.Printf("\n🚀 Starting epic %s\n", epicID)
			},
			OnEpicComplete: func(epicID string, result *engine.RunResult) {
				fmt.Printf("\n✅ Epic %s completed (%d tasks, $%.4f)\n", epicID, len(result.CompletedTasks), result.TotalCost)
			},
			OnEpicFailed: func(epicID string, err error) {
				fmt.Printf("\n❌ Epic %s failed: %v\n", epicID, err)
			},
			OnEpicConflict: func(epicID string, conflict *parallel.ConflictState) {
				fmt.Printf("\n⚠️  Epic %s has merge conflicts in: %v\n", epicID, conflict.Files)
				fmt.Printf("   Worktree preserved at: %s\n", conflict.Worktree)
			},
			OnStatusChange: func(epicID string, status string) {
				// Could be used for TUI updates
			},
			OnMessage: func(message string) {
				if message != "" {
					fmt.Printf("ℹ️  %s\n", message)
				}
			},
		})
	}

	// Run all epics in parallel
	return runner.Run(ctx)
}

// parallelOutput is the JSONL output format for parallel run results.
type parallelOutput struct {
	TotalCost    float64                  `json:"total_cost"`
	TotalTokens  int                      `json:"total_tokens"`
	DurationSec  float64                  `json:"duration_sec"`
	AllSuccess   bool                     `json:"all_success"`
	EpicStatuses map[string]epicStatusOut `json:"epic_statuses"`
}

type epicStatusOut struct {
	Status         string   `json:"status"`
	Iterations     int      `json:"iterations,omitempty"`
	TotalTokens    int      `json:"total_tokens,omitempty"`
	TotalCost      float64  `json:"total_cost,omitempty"`
	CompletedTasks []string `json:"completed_tasks,omitempty"`
	Error          string   `json:"error,omitempty"`
	ConflictFiles  []string `json:"conflict_files,omitempty"`
}

func outputParallelResult(result *parallel.ParallelResult) {
	if runJSONL {
		output := parallelOutput{
			TotalCost:    result.TotalCost,
			TotalTokens:  result.TotalTokens,
			DurationSec:  result.Duration.Seconds(),
			AllSuccess:   result.AllSuccess,
			EpicStatuses: make(map[string]epicStatusOut),
		}
		for epicID, status := range result.Statuses {
			out := epicStatusOut{Status: status.Status}
			if status.Result != nil {
				out.Iterations = status.Result.Iterations
				out.TotalTokens = status.Result.TotalTokens
				out.TotalCost = status.Result.TotalCost
				out.CompletedTasks = status.Result.CompletedTasks
			}
			if status.Error != nil {
				out.Error = status.Error.Error()
			}
			if status.Conflict != nil {
				out.ConflictFiles = status.Conflict.Files
			}
			output.EpicStatuses[epicID] = out
		}
		enc := json.NewEncoder(os.Stdout)
		_ = enc.Encode(output)
	} else {
		fmt.Printf("\n=== Parallel Run Complete ===\n")
		fmt.Printf("Total cost: $%.4f\n", result.TotalCost)
		fmt.Printf("Total tokens: %d\n", result.TotalTokens)
		fmt.Printf("Duration: %v\n", result.Duration.Round(time.Second))
		fmt.Printf("All success: %v\n", result.AllSuccess)
		fmt.Printf("\nEpic statuses:\n")
		for epicID, status := range result.Statuses {
			fmt.Printf("  %s: %s", epicID, status.Status)
			if status.Result != nil {
				fmt.Printf(" (%d tasks completed, $%.4f)", len(status.Result.CompletedTasks), status.Result.TotalCost)
			}
			if status.Error != nil {
				fmt.Printf(" - error: %v", status.Error)
			}
			if status.Conflict != nil {
				fmt.Printf(" - conflicts: %v", status.Conflict.Files)
			}
			fmt.Println()
		}
	}
}

// findAvailablePort finds an available port starting from the given port.
// If the port is in use, it tries the next port, up to maxAttempts times.
func findAvailablePort(startPort int) (int, error) {
	const maxAttempts = 100
	for i := 0; i < maxAttempts; i++ {
		port := startPort + i
		addr := fmt.Sprintf(":%d", port)
		listener, err := net.Listen("tcp", addr)
		if err == nil {
			listener.Close()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+maxAttempts-1)
}
