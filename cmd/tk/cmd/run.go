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
	"strconv"
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
	"github.com/pengelbrecht/ticks/internal/pool"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/swarm"
	"github.com/pengelbrecht/ticks/internal/taskrunner"
	"github.com/pengelbrecht/ticks/internal/tick"
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
  --pool [N] (default)  Pool mode - N concurrent workers (auto from wave analysis if omitted)
  --ralph               Ralph iteration loop - orchestrates tasks via Go engine
  --swarm               Swarm mode - spawns Claude to orchestrate parallel subagents

Examples:
  tk run abc123                     # Run epic abc123 with pool workers
  tk run --auto                     # Auto-select next ready epic
  tk run --watch                    # Grind through all epics until Ctrl+C (implies --auto)
  tk run abc123 --watch             # Run abc123, then keep finding more epics
  tk run abc123 def456              # Run multiple epics sequentially
  tk run abc def --parallel 2       # Run 2 epics in parallel with worktrees
  tk run abc123 --ralph             # Run using ralph iteration loop
  tk run abc123 --swarm             # Run using swarm orchestration
  tk run abc123 --pool 4            # Pool mode with explicit 4 workers
  tk run abc123 --board             # Run with board UI on :3000
  tk run abc123 --cloud             # Run with real-time cloud sync (implies --board)
  tk run --board                    # Board UI only, no agent`,
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
	runPoolMode          string // "auto", number, or "" (disabled)
	runStaleTimeout      time.Duration
	runSkipDepAnalysis   bool
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
	runCmd.Flags().BoolVar(&runRalphMode, "ralph", false, "use ralph mode (Go engine iteration loop)")
	runCmd.Flags().IntVar(&runMaxAgents, "max-agents", 5, "maximum parallel subagents per wave (swarm mode only)")
	runCmd.Flags().StringVar(&runPoolMode, "pool", "", "pool mode: auto (from wave analysis) or N workers")
	runCmd.Flags().Lookup("pool").NoOptDefVal = "auto" // --pool without value means auto
	runCmd.Flags().DurationVar(&runStaleTimeout, "stale-timeout", time.Hour, "timeout for stale task recovery in pool mode")
	runCmd.Flags().BoolVar(&runSkipDepAnalysis, "skip-dep-analysis", false, "skip dependency analysis for file conflicts (pool mode)")

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
	modeCount := 0
	if runSwarmMode {
		modeCount++
	}
	if runRalphMode {
		modeCount++
	}
	if runPoolMode != "" {
		modeCount++
	}
	if modeCount > 1 {
		return NewExitError(ExitUsage, "cannot combine --swarm, --ralph, and --pool flags")
	}

	// Default to pool mode if no mode explicitly specified
	if modeCount == 0 {
		runPoolMode = "auto"
	}

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
						mergeResult, mergeErr := mergeManager.Merge(wt, worktree.MergeOptions{})
						if mergeErr != nil {
							fmt.Fprintf(os.Stderr, "Warning: merge failed: %v\n", mergeErr)
						} else if !mergeResult.Success {
							fmt.Fprintf(os.Stderr, "Warning: merge conflicts in: %v\n", mergeResult.Conflicts)
							fmt.Fprintf(os.Stderr, "Worktree preserved at: %s\n", wt.Path)
						} else {
							// Cleanup worktree on successful merge
							_ = wtManager.Remove(epicID)
							if !runJSONL {
								fmt.Printf("✅ Merged to %s and cleaned up worktree\n", mergeResult.TargetBranch)
							}
						}
					}
				}

				// Output result in JSONL mode
				if runJSONL {
					output := runOutput{
						EpicID:      epicID,
						DurationSec: result.Duration.Seconds(),
						ExitReason:  "swarm completed",
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
		} else if runPoolMode != "" {
			// Pool mode: parallel workers processing tasks within each epic
			claudeAgent := agent.NewClaudeAgent()
			if !claudeAgent.Available() {
				cancel()
				wg.Wait()
				return NewExitError(ExitGeneric, "claude CLI not found - install from https://claude.ai/code")
			}

			// Parallel execution with worktrees (combined with pool)
			if runParallel > 1 && len(epicIDs) > 1 {
				// For parallel epics, compute pool size from first epic (or use explicit)
				poolSize, err := resolvePoolSize(tickDir, epicIDs[0], runPoolMode)
				if err != nil {
					cancel()
					wg.Wait()
					return NewExitError(ExitGeneric, "failed to determine pool size: %v", err)
				}
				parallelResult, err := runParallelEpicsWithPool(ctx, root, epicIDs, claudeAgent, poolSize, runStaleTimeout)
				if err != nil {
					cancel()
					wg.Wait()
					return NewExitError(ExitGeneric, "parallel pool run failed: %v", err)
				}
				outputParallelResult(parallelResult)
			} else {
				// Run each epic with pool, optionally in watch mode
				client := ticks.NewClient(tickDir)
				epicQueue := make([]string, len(epicIDs))
				copy(epicQueue, epicIDs)

				for {
					// Process all epics in queue
					for len(epicQueue) > 0 {
						epicID := epicQueue[0]
						epicQueue = epicQueue[1:]

						// Compute pool size for this epic (auto or explicit)
						poolSize, err := resolvePoolSize(tickDir, epicID, runPoolMode)
						if err != nil {
							cancel()
							wg.Wait()
							return NewExitError(ExitGeneric, "failed to determine pool size for %s: %v", epicID, err)
						}

						result, err := runEpicWithPool(ctx, root, epicID, claudeAgent, poolSize, runStaleTimeout)
						if err != nil {
							if ctx.Err() != nil {
								break
							}
							cancel()
							wg.Wait()
							return NewExitError(ExitGeneric, "pool run failed for epic %s: %v", epicID, err)
						}
						_ = result // result summary already printed by runEpicWithPool

						if ctx.Err() != nil {
							break
						}
					}

					// Exit if not in watch mode or context cancelled
					if !runWatch || ctx.Err() != nil {
						break
					}

					// Watch mode: look for next ready epic
					if !runJSONL {
						fmt.Println("Watch mode: looking for next ready epic...")
					}

					for {
						epic, err := client.NextReadyEpic()
						if err != nil {
							if !runJSONL {
								fmt.Printf("Error finding ready epic: %v\n", err)
							}
						} else if epic != nil {
							if !runJSONL {
								fmt.Printf("Found ready epic: %s (%s)\n", epic.ID, epic.Title)
							}
							epicQueue = append(epicQueue, epic.ID)
							break
						}

						// No epic ready, wait and poll
						if !runJSONL {
							fmt.Printf("No ready epics, polling in %v...\n", runPoll)
						}

						select {
						case <-ctx.Done():
							if !runJSONL {
								fmt.Println("Watch mode: shutting down")
							}
							break
						case <-time.After(runPoll):
							// Continue polling
						}

						if ctx.Err() != nil {
							break
						}
					}

					if ctx.Err() != nil {
						break
					}
				}
			}
		} else {
			// Ralph mode: use Go engine iteration loop
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

// runEpicWithPool runs a single epic using pool mode with N parallel workers.
func runEpicWithPool(ctx context.Context, root, epicID string, agentImpl agent.Agent, poolSize int, staleTimeout time.Duration) (*pool.Result, error) {
	tickDir := filepath.Join(root, ".tick")

	// Calculate total phases: context + dependencies (if enabled) + stale_recovery + workers
	totalPhases := 4 // context, dependencies, stale_recovery, workers
	if runSkipDepAnalysis || poolSize <= 1 {
		totalPhases = 3 // context, stale_recovery, workers (skip dependencies)
	}

	// Create reporter
	reporter := pool.NewPoolReporter(runJSONL, epicID, poolSize, totalPhases)

	if !runJSONL {
		fmt.Printf("Starting pool run with %d workers for epic %s\n\n", poolSize, epicID)
	}

	// Generate/load epic context (shared by all workers)
	epicContextContent := ensurePoolEpicContext(ctx, tickDir, epicID, agentImpl, reporter)

	// Run dependency analysis to detect file conflicts and get predictions
	filePredictions := make(map[string][]string)
	if !runSkipDepAnalysis && poolSize > 1 {
		predictions := runDependencyAnalysis(ctx, tickDir, epicID, agentImpl, reporter)
		if predictions != nil {
			filePredictions = predictions
		}
	}

	// Create pool config with a RunTask function that wraps the agent execution
	cfg := pool.Config{
		PoolSize:     poolSize,
		StaleTimeout: staleTimeout,
		EpicID:       epicID,
		TickDir:      tickDir,
		EpicContext:  epicContextContent,
		RunTask:      createPoolTaskRunner(ctx, root, agentImpl, epicContextContent, filePredictions),
	}

	// Set up phase callback for pool-internal phases
	cfg.OnPhase = func(event pool.PhaseEvent) {
		switch event.Phase {
		case "stale_recovery":
			if event.Status == "starting" {
				reporter.PhaseStart("Recovering stale tasks")
			} else {
				reporter.PhaseDone(event.Detail)
			}
		case "workers":
			if event.Status == "starting" {
				reporter.PhaseStart(fmt.Sprintf("Running %s", event.Detail))
				if !runJSONL {
					fmt.Println() // newline after workers phase for cleaner output
				}
			}
			// Workers phase doesn't have a "done" status - it runs until complete
		}
	}

	// Set up task status callback
	cfg.OnStatus = func(event pool.TaskEvent) {
		switch event.Status {
		case "starting":
			reporter.TaskStart(event.WorkerID, event.TaskID, event.Title)
		case "completed":
			reporter.TaskDone(event.WorkerID, event.TaskID, event.Title, event.Cost, event.Duration)
		case "failed":
			reporter.TaskFail(event.WorkerID, event.TaskID, event.Title, event.Error)
		}
	}

	result, err := pool.RunPool(ctx, cfg)
	if err != nil {
		return nil, err
	}

	reporter.Summary(result)
	return result, nil
}

// createPoolTaskRunner creates a RunTask function for pool workers.
// This wraps the agent execution logic to work with pool mode.
// Uses TaskRunner for consistent run record and live streaming support.
func createPoolTaskRunner(ctx context.Context, root string, agentImpl agent.Agent, epicContext string, filePredictions map[string][]string) func(ctx context.Context, task *tick.Tick) (bool, float64, int) {
	tickDir := filepath.Join(root, ".tick")

	// Create shared stores (thread-safe for concurrent workers)
	recordStore := runrecord.NewStore(root)
	tickClient := ticks.NewClient(tickDir)

	// Create a TaskRunner for each task invocation
	// This gives us run records and live streaming like ralph mode
	return func(ctx context.Context, task *tick.Tick) (success bool, cost float64, tokens int) {
		// Build prompt for the task (includes shared epic context and file predictions)
		predictedFiles := filePredictions[task.ID]
		prompt := buildPoolTaskPrompt(task, epicContext, predictedFiles)

		// Create runner with run record support
		runner := taskrunner.New(taskrunner.Config{
			Agent:       agentImpl,
			TickClient:  tickClient,
			RecordStore: recordStore,
			Timeout:     runTimeout,
		})

		// Run the task with full run record tracking
		result := runner.Run(ctx, task.ID, prompt)
		if result.Error != nil {
			return false, 0, 0
		}

		return true, result.Cost, result.TokensIn + result.TokensOut
	}
}

// buildPoolTaskPrompt builds a prompt for a pool task.
// Includes shared epic context, predicted files, and rich instructions.
func buildPoolTaskPrompt(task *tick.Tick, epicContext string, predictedFiles []string) string {
	var prompt string

	// Include epic context first (if available)
	if epicContext != "" {
		prompt = `## Epic Context

The following context was generated for this epic. Use it to understand the codebase.

` + epicContext + `

`
	}

	prompt += fmt.Sprintf(`## Current Task

**[%s] %s**
`, task.ID, task.Title)

	if task.Description != "" {
		prompt += fmt.Sprintf("\n%s\n", task.Description)
	}

	// Include predicted files if available
	if len(predictedFiles) > 0 {
		prompt += "\n## Predicted Files\n\n"
		prompt += "Based on analysis, this task will likely need to modify:\n"
		for _, f := range predictedFiles {
			prompt += fmt.Sprintf("- %s\n", f)
		}
		prompt += "\nUse this as a starting point, but modify other files if needed.\n"
	}

	prompt += fmt.Sprintf(`
## Instructions

1. **Complete the task** - Implement the required functionality as specified in the acceptance criteria.
2. **Run tests** - Ensure all existing tests pass and add new tests if appropriate.
3. **Commit your changes** - Create a commit with the task ID in the message (e.g., "feat(module): implement feature [%s]").
4. **Close the task** - Run %s when complete. The reason should summarize HOW you solved the task.
5. **Add a note** - Run %s to leave context about what you did, learnings, or gotchas.

## If You Get Blocked

If you cannot complete the task:
- Use %s to signal the issue
- Do NOT close tasks that aren't actually done

## Handoff Signals

When you need human involvement, emit a signal and the system will hand off the task:

| Signal | When to Use |
|--------|-------------|
| %s | Need human to answer a question |
| %s | Found unexpected issue needing direction |
| %s | Cannot complete - requires human work |

**IMPORTANT:** Include complete context in signals - the human only sees the signal reason.

## Rules

1. **One task only** - Focus only on your assigned task. Do not work on other tasks.
2. **No questions** - You are autonomous. Make reasonable decisions based on the context provided.
3. **Always leave notes** - Add a note summarizing what you did and any context.
4. **Don't modify tick internals** - Never modify .tick/ unless explicitly required by the task.
5. **Never revert other tasks' work** - Code in the repo was committed by other workers and is intentional. If you think existing code is wrong, leave a note or escalate.

Begin working on the task now.`,
		task.ID,
		"`tk close "+task.ID+" --reason \"<solution summary>\"`",
		"`tk note "+task.ID+" \"<message>\"`",
		"`tk block "+task.ID+" --reason \"<what's blocking>\"`",
		"`<promise>INPUT_NEEDED: question</promise>`",
		"`<promise>ESCALATE: issue</promise>`",
		"`<promise>EJECT: reason</promise>`",
	)

	return prompt
}

// resolvePoolSize determines the pool size from the mode string.
// "auto" computes from wave analysis (capped at 10), otherwise parses as int.
func resolvePoolSize(tickDir, epicID, mode string) (int, error) {
	if mode == "auto" {
		maxWave := computeMaxWaveWidth(tickDir, epicID)
		if maxWave < 1 {
			maxWave = 1
		}
		if maxWave > 10 {
			maxWave = 10
		}
		if !runJSONL {
			fmt.Printf("Pool: auto-detected %d workers from wave analysis\n", maxWave)
		}
		return maxWave, nil
	}

	// Parse as integer
	size, err := strconv.Atoi(mode)
	if err != nil {
		return 0, fmt.Errorf("invalid pool size %q: must be 'auto' or a number", mode)
	}
	if size < 1 {
		return 0, fmt.Errorf("pool size must be at least 1")
	}
	return size, nil
}

// computeMaxWaveWidth analyzes the epic's dependency graph and returns
// the maximum number of tasks that can run in parallel (max wave width).
func computeMaxWaveWidth(tickDir, epicID string) int {
	store := tick.NewStore(tickDir)

	// Get all ticks
	allTicks, err := store.List()
	if err != nil {
		return 1 // fallback
	}

	// Filter to open tasks under this epic
	var tasks []tick.Tick
	taskSet := make(map[string]bool)
	for _, t := range allTicks {
		if t.Parent == epicID && t.Type != tick.TypeEpic && t.Status != tick.StatusClosed {
			tasks = append(tasks, t)
			taskSet[t.ID] = true
		}
	}

	if len(tasks) == 0 {
		return 1
	}

	// Build in-degree map (count of open blockers within epic)
	inDegree := make(map[string]int)
	blocks := make(map[string][]string)
	for _, t := range tasks {
		inDegree[t.ID] = 0
	}
	for _, t := range tasks {
		for _, blockerID := range t.BlockedBy {
			if taskSet[blockerID] {
				inDegree[t.ID]++
				blocks[blockerID] = append(blocks[blockerID], t.ID)
			}
		}
	}

	// Compute waves using Kahn's algorithm
	remaining := make(map[string]bool)
	for _, t := range tasks {
		remaining[t.ID] = true
	}

	maxParallel := 0
	for len(remaining) > 0 {
		// Find all tasks with no remaining blockers
		var ready []string
		for _, t := range tasks {
			if remaining[t.ID] && inDegree[t.ID] == 0 {
				ready = append(ready, t.ID)
			}
		}

		if len(ready) == 0 {
			break // cycle detected
		}

		if len(ready) > maxParallel {
			maxParallel = len(ready)
		}

		// Remove ready tasks and update inDegree
		for _, id := range ready {
			delete(remaining, id)
			for _, dependentID := range blocks[id] {
				if remaining[dependentID] {
					inDegree[dependentID]--
				}
			}
		}
	}

	if maxParallel < 1 {
		return 1
	}
	return maxParallel
}

// ensurePoolEpicContext generates or loads epic context for pool mode.
// Uses the same context store as the engine for consistency.
// Returns empty string if context generation fails (non-fatal).
func ensurePoolEpicContext(ctx context.Context, tickDir, epicID string, agentImpl agent.Agent, reporter *pool.PoolReporter) string {
	// Create context store
	contextStore := epiccontext.NewStoreWithDir(filepath.Join(tickDir, "logs", "context"))

	// Check if context already exists
	if contextStore.Exists(epicID) {
		content, err := contextStore.Load(epicID)
		if err == nil && content != "" {
			tokenCount := len(content) / 4 // rough estimate
			reporter.PhaseStart("Loading cached context")
			reporter.PhaseDone(fmt.Sprintf("~%d tokens", tokenCount))
			return content
		}
	}

	// Get epic and tasks to generate context
	ticksClient := ticks.NewClient(tickDir)
	epic, err := ticksClient.GetEpic(epicID)
	if err != nil {
		reporter.PhaseSkip("Generating epic context", err.Error())
		return ""
	}

	tasks, err := ticksClient.ListTasks(epicID)
	if err != nil {
		reporter.PhaseSkip("Generating epic context", err.Error())
		return ""
	}

	// Skip for single-task epics (no benefit)
	if len(tasks) <= 1 {
		reporter.PhaseSkip("Generating epic context", "single-task epic")
		return ""
	}

	// Generate context
	reporter.PhaseStart(fmt.Sprintf("Generating epic context (%d tasks)", len(tasks)))

	contextGenerator, err := epiccontext.NewGenerator(agentImpl)
	if err != nil {
		reporter.PhaseDone(fmt.Sprintf("failed: %v", err))
		return ""
	}

	content, err := contextGenerator.Generate(ctx, epic, tasks)
	if err != nil {
		reporter.PhaseDone(fmt.Sprintf("failed: %v", err))
		return ""
	}

	// Save for future runs
	_ = contextStore.Save(epicID, content)

	tokenCount := len(content) / 4 // rough estimate
	reporter.PhaseDone(fmt.Sprintf("~%d tokens", tokenCount))

	return content
}

// runDependencyAnalysis analyzes tasks for file conflicts and adds dependencies.
// Returns a map of task ID -> predicted files for use in task prompts.
// Returns nil if analysis fails (non-fatal, pool continues without it).
func runDependencyAnalysis(ctx context.Context, tickDir, epicID string, agentImpl agent.Agent, reporter *pool.PoolReporter) map[string][]string {
	ticksClient := ticks.NewClient(tickDir)

	// Get epic and tasks
	epic, err := ticksClient.GetEpic(epicID)
	if err != nil {
		reporter.PhaseSkip("Analyzing dependencies", err.Error())
		return nil
	}

	tasks, err := ticksClient.ListTasks(epicID)
	if err != nil {
		reporter.PhaseSkip("Analyzing dependencies", err.Error())
		return nil
	}

	// Skip for single-task epics (no conflicts possible)
	if len(tasks) <= 1 {
		reporter.PhaseSkip("Analyzing dependencies", "single-task epic")
		return nil
	}

	reporter.PhaseStart(fmt.Sprintf("Analyzing dependencies (%d tasks)", len(tasks)))

	// Create analyzer and run
	store := tick.NewStore(tickDir)
	analyzer := epiccontext.NewDependencyAnalyzer(agentImpl, store)

	result, err := analyzer.Analyze(ctx, epic, tasks)
	if err != nil {
		reporter.PhaseDone(fmt.Sprintf("failed: %v", err))
		return nil
	}

	// Report results
	if len(result.AddedDeps) > 0 {
		reporter.PhaseDone(fmt.Sprintf("%d dependencies added", len(result.AddedDeps)))
	} else if len(result.ConflictingPairs) > 0 {
		reporter.PhaseDone(fmt.Sprintf("%d conflicts (already handled)", len(result.ConflictingPairs)))
	} else {
		reporter.PhaseDone("no conflicts")
	}

	// Build predictions map for task prompts
	predictions := make(map[string][]string)
	for _, pred := range result.Predictions {
		predictions[pred.TaskID] = pred.Files
	}

	return predictions
}

// runParallelEpicsWithPool runs multiple epics in parallel worktrees, each with pool mode.
func runParallelEpicsWithPool(ctx context.Context, root string, epicIDs []string, agentImpl agent.Agent, poolSize int, staleTimeout time.Duration) (*parallel.ParallelResult, error) {
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
		MaxIterations: runMaxIterations * len(epicIDs),
		MaxCost:       runMaxCost,
	})

	// Run record store for live updates
	runRecordStore := runrecord.NewStore(root)

	// Engine factory that uses pool mode for each epic
	engineFactory := func(epicID string) *engine.Engine {
		ticksClient := ticks.NewClient(tickDir)
		epicBudget := budget.NewTracker(budget.Limits{
			MaxIterations: runMaxIterations,
			MaxCost:       runMaxCost / float64(len(epicIDs)),
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
	// Note: For parallel + pool, we use the standard parallel runner with pool-aware execution
	// Each epic will run its pool within its own worktree
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
		// Pass pool config to runner
		PoolSize:     poolSize,
		StaleTimeout: staleTimeout,
	}

	runner := parallel.NewRunner(runnerConfig)

	// Set up callbacks
	if !runJSONL {
		runner.SetCallbacks(parallel.RunnerCallbacks{
			OnEpicStart: func(epicID string) {
				fmt.Printf("\nStarting epic %s with %d pool workers\n", epicID, poolSize)
			},
			OnEpicComplete: func(epicID string, result *engine.RunResult) {
				fmt.Printf("\nEpic %s completed (%d tasks, $%.4f)\n", epicID, len(result.CompletedTasks), result.TotalCost)
			},
			OnEpicFailed: func(epicID string, err error) {
				fmt.Printf("\nEpic %s failed: %v\n", epicID, err)
			},
			OnEpicConflict: func(epicID string, conflict *parallel.ConflictState) {
				fmt.Printf("\nEpic %s has merge conflicts in: %v\n", epicID, conflict.Files)
				fmt.Printf("   Worktree preserved at: %s\n", conflict.Worktree)
			},
			OnStatusChange: func(epicID string, status string) {},
			OnMessage: func(message string) {
				if message != "" {
					fmt.Printf("%s\n", message)
				}
			},
		})
	}

	return runner.Run(ctx)
}
