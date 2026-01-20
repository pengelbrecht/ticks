package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/checkpoint"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/gc"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

var resumeCmd = &cobra.Command{
	Use:   "resume <checkpoint-id>",
	Short: "Resume a run from a checkpoint",
	Long: `Resume an AI agent run from a saved checkpoint.

Checkpoints are saved periodically during runs and can be used to
resume after interruptions or failures.

Examples:
  tk resume abc-7                  # Resume from checkpoint abc-7
  tk resume abc-7 --max-iterations 20  # Override max iterations
  tk resume abc-7 --skip-verify    # Skip verification on resume
  tk resume abc-7 --jsonl          # Output JSONL format`,
	Args: cobra.ExactArgs(1),
	RunE: runResume,
}

var (
	resumeMaxIterations int
	resumeMaxCost       float64
	resumeSkipVerify    bool
	resumeJSONL         bool
)

func init() {
	resumeCmd.Flags().IntVar(&resumeMaxIterations, "max-iterations", 50, "maximum iterations per task (override checkpoint)")
	resumeCmd.Flags().Float64Var(&resumeMaxCost, "max-cost", 0, "maximum cost in USD (0=unlimited)")
	resumeCmd.Flags().BoolVar(&resumeSkipVerify, "skip-verify", false, "skip verification after task completion")
	resumeCmd.Flags().BoolVar(&resumeJSONL, "jsonl", false, "output JSONL format for parsing")

	rootCmd.AddCommand(resumeCmd)
}

// resumeOutput is the JSONL output format for resume results.
type resumeOutput struct {
	CheckpointID   string   `json:"checkpoint_id"`
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

func runResume(cmd *cobra.Command, args []string) error {
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

	checkpointID := args[0]

	// Load the checkpoint
	checkpointMgr := checkpoint.NewManager()
	cp, err := checkpointMgr.Load(checkpointID)
	if err != nil {
		return NewExitError(ExitNotFound, "failed to load checkpoint: %v", err)
	}

	// Prepare resume - handles worktree recreation if needed
	workDir, err := checkpointMgr.PrepareResume(cp, root)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to prepare resume: %v", err)
	}

	// Create the agent
	claudeAgent := agent.NewClaudeAgent()
	if !claudeAgent.Available() {
		return NewExitError(ExitGeneric, "claude CLI not found - install from https://claude.ai/code")
	}

	// Set up signal handling for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		if !resumeJSONL {
			fmt.Fprintln(os.Stderr, "\nInterrupted - finishing current iteration...")
		}
		cancel()
	}()

	// Create dependencies
	ticksClient := ticks.NewClient(filepath.Join(root, ".tick"))
	budgetTracker := budget.NewTracker(budget.Limits{
		MaxIterations: resumeMaxIterations,
		MaxCost:       resumeMaxCost,
	})

	// Create engine
	eng := engine.NewEngine(claudeAgent, ticksClient, budgetTracker, checkpointMgr)

	// Enable verification unless skipped
	if !resumeSkipVerify {
		eng.EnableVerification()
	}

	// Set up output streaming for non-JSONL mode
	if !resumeJSONL {
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
	}

	// Build run config with checkpoint resume
	config := engine.RunConfig{
		EpicID:        cp.EpicID,
		MaxIterations: resumeMaxIterations,
		MaxCost:       resumeMaxCost,
		ResumeFrom:    checkpointID,
		SkipVerify:    resumeSkipVerify,
		RepoRoot:      root,
		WorkDir:       workDir,
	}

	// Run the engine
	result, err := eng.Run(ctx, config)
	if err != nil {
		if ctx.Err() != nil {
			// Context cancelled - output partial result if we have one
			if result != nil {
				outputResumeResult(checkpointID, result)
			}
			return nil
		}
		return NewExitError(ExitGeneric, "resume failed: %v", err)
	}

	outputResumeResult(checkpointID, result)
	return nil
}

func outputResumeResult(checkpointID string, result *engine.RunResult) {
	if resumeJSONL {
		output := resumeOutput{
			CheckpointID:   checkpointID,
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
		fmt.Printf("\n=== Resume Complete ===\n")
		fmt.Printf("Checkpoint: %s\n", checkpointID)
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
