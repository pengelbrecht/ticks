// Package wrapup implements the post-implementation wrap-up phase.
// It runs configurable review steps, generates a run report, and handles
// worktree merge/preserve decisions.
package wrapup

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/output"
	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/worktree"

	"gopkg.in/yaml.v3"
)

// Config represents wrap-up configuration from .tick/config.yaml.
type Config struct {
	Steps []Step
}

// Step is a single wrap-up step.
type Step struct {
	// Shell command to run
	Run  string `yaml:"run,omitempty"`
	Name string `yaml:"name,omitempty"`

	// Whether to continue if this step fails
	ContinueOnFailure bool `yaml:"continue_on_failure,omitempty"`

	// Claude review of the diff
	Review bool   `yaml:"review,omitempty"`
	Prompt string `yaml:"prompt,omitempty"`

	// PR creation: "draft" or empty
	PR string `yaml:"pr,omitempty"`
}

// StepResult is the outcome of a single step.
type StepResult struct {
	Name    string
	Success bool
	Output  string
	Error   error
}

// Report is the run summary.
type Report struct {
	EpicID      string
	EpicTitle   string
	Tasks       []TaskSummary
	Files       []FileSummary
	Metrics     MetricsSummary
	WrapupSteps []AgentStepResult
}

// TaskSummary summarises one task's outcome.
type TaskSummary struct {
	ID       string
	Title    string
	Closed   bool
	Awaiting string
	Cost     float64
	Tokens   int
}

// FileSummary summarises changes to a single file.
type FileSummary struct {
	Path      string
	Additions int
	Deletions int
}

// MetricsSummary aggregates run metrics.
type MetricsSummary struct {
	TotalCost   float64
	TotalTokens int
	Duration    time.Duration
	WaveCount   int
}

// Runner executes the wrap-up phase.
type Runner struct {
	WorkDir      string // Worktree path
	RepoRoot     string // Main repo root
	EpicID       string
	TickDir      string
	WtManager    *worktree.Manager
	MergeManager *worktree.MergeManager
	Worktree     *worktree.Worktree
	NoMerge      bool
	CreatePR     bool
	Output       *output.RunOutput
	Agent        agent.Agent
}

// Run executes the wrap-up phase: steps, report, merge/preserve, PR.
func (r *Runner) Run(ctx context.Context, config Config, result *engine.RunResult) (*Report, error) {
	// 1. Run configured steps
	stepResults, err := r.runSteps(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("wrap-up steps failed: %w", err)
	}

	// Print step summary
	for _, sr := range stepResults {
		if r.Output != nil {
			r.Output.WrapupStepResult(sr.Name, sr.Success, sr.Error)
		}
	}

	// 1b. Run agent wrapup steps from .tick/wrapup.md
	var agentStepResults []AgentStepResult
	if r.Agent != nil {
		agentStepResults, err = r.runAgentWrapupSteps(ctx)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: agent wrapup steps failed: %v\n", err)
		}
	}

	// 2. Generate report
	report, err := r.generateReport(result)
	if err != nil {
		// Non-fatal: proceed with merge even if report fails
		if r.Output != nil {
			r.Output.Warn("report generation failed: %v", err)
		}
	}

	// Attach agent step results to report
	if report != nil && len(agentStepResults) > 0 {
		report.WrapupSteps = agentStepResults
	}

	// 3. Handle merge/preserve
	merged := false
	var mergeResult *worktree.MergeResult
	if result != nil && engine.ShouldCleanupWorktree(result.ExitReason) && !r.NoMerge {
		mergeResult, err = r.handleMerge()
		if err != nil {
			if r.Output != nil {
				r.Output.Warn("merge failed: %v", err)
				r.Output.WorktreePreserved(r.WorkDir, "merge failed")
			}
		} else if mergeResult != nil && mergeResult.Success {
			merged = true
			_ = r.WtManager.Remove(r.EpicID)
			if r.Output != nil {
				r.Output.MergeSuccess(mergeResult.TargetBranch)
			}
		} else if mergeResult != nil && !mergeResult.Success {
			if r.Output != nil {
				if len(mergeResult.Conflicts) > 0 {
					r.Output.Warn("merge conflicts in: %v", mergeResult.Conflicts)
				} else {
					r.Output.Warn("merge failed: %s", mergeResult.ErrorMessage)
				}
				r.Output.WorktreePreserved(r.WorkDir, "merge conflicts")
			}
		}
	} else if r.NoMerge {
		if r.Output != nil {
			r.Output.WorktreeInfo(r.WorkDir, r.Worktree.Branch)
		}
	} else if result != nil {
		if r.Output != nil {
			r.Output.WorktreePreserved(r.WorkDir, "resumption")
		}
	}

	// 4. Create PR if requested and merge succeeded
	if r.CreatePR && merged && report != nil {
		if err := r.createPR(report, mergeResult); err != nil {
			if r.Output != nil {
				r.Output.Warn("PR creation failed: %v", err)
			}
		}
	}

	return report, nil
}

// runAgentWrapupSteps parses .tick/wrapup.md and runs agent-driven steps.
func (r *Runner) runAgentWrapupSteps(ctx context.Context) ([]AgentStepResult, error) {
	content, err := ParseWrapupFile(r.TickDir)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(content) == "" {
		return nil, nil
	}

	logsDir := filepath.Join(r.TickDir, "logs")

	// Load cached steps or parse via agent
	steps, cached := LoadCachedSteps(logsDir, r.EpicID)
	if !cached {
		opts := agent.RunOpts{WorkDir: r.WorkDir}
		steps, err = ParseWrapupSteps(ctx, r.Agent, content, opts)
		if err != nil {
			return nil, fmt.Errorf("parsing wrapup steps: %w", err)
		}
		if cacheErr := CacheSteps(logsDir, r.EpicID, steps); cacheErr != nil {
			if r.Output != nil {
				r.Output.Warn("failed to cache wrapup steps: %v", cacheErr)
			} else {
				fmt.Fprintf(os.Stderr, "Warning: failed to cache wrapup steps: %v\n", cacheErr)
			}
		}
	}

	if len(steps) == 0 {
		return nil, nil
	}

	if r.Output != nil {
		r.Output.AgentInfo(fmt.Sprintf("Running %d agent wrapup steps", len(steps)), "")
	}

	wr := &WrapupRunner{
		WorkDir: r.WorkDir,
		TickDir: r.TickDir,
		Output:  r.Output,
	}

	return wr.RunAgentSteps(ctx, steps, r.EpicID, r.Agent)
}

// runSteps executes each configured step in order.
func (r *Runner) runSteps(ctx context.Context, config Config) ([]StepResult, error) {
	var results []StepResult

	for _, step := range config.Steps {
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}

		// Skip PR steps here - handled separately after merge
		if step.PR != "" {
			continue
		}

		var sr StepResult
		if step.Run != "" {
			sr = r.runShellStep(ctx, step)
		} else if step.Review {
			sr = r.runReviewStep(ctx, step)
		} else {
			continue
		}

		results = append(results, sr)

		if !sr.Success && !step.ContinueOnFailure {
			return results, fmt.Errorf("step %q failed: %w", sr.Name, sr.Error)
		}
	}

	return results, nil
}

// runShellStep executes a shell command step.
func (r *Runner) runShellStep(_ context.Context, step Step) StepResult {
	name := step.Name
	if name == "" {
		name = step.Run
	}

	cmd := exec.Command("sh", "-c", step.Run)
	cmd.Dir = r.WorkDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return StepResult{
			Name:    name,
			Success: false,
			Output:  string(output),
			Error:   fmt.Errorf("%s: %w", strings.TrimSpace(string(output)), err),
		}
	}

	return StepResult{
		Name:    name,
		Success: true,
		Output:  string(output),
	}
}

// runReviewStep runs a diff review (prints a reminder for now; full Claude
// agent integration can be added later).
func (r *Runner) runReviewStep(_ context.Context, step Step) StepResult {
	name := step.Name
	if name == "" {
		name = "Review diff"
	}

	// Get the diff for review
	parentBranch := r.Worktree.ParentBranch
	if parentBranch == "" {
		parentBranch = "main"
	}

	cmd := exec.Command("git", "diff", parentBranch+"...HEAD", "--stat")
	cmd.Dir = r.WorkDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return StepResult{
			Name:    name,
			Success: false,
			Output:  string(output),
			Error:   fmt.Errorf("failed to get diff: %w", err),
		}
	}

	diffStat := strings.TrimSpace(string(output))
	if diffStat != "" {
		fmt.Printf("  Diff summary:\n")
		for _, line := range strings.Split(diffStat, "\n") {
			fmt.Printf("    %s\n", line)
		}
	}

	return StepResult{
		Name:    name,
		Success: true,
		Output:  diffStat,
	}
}

// generateReport creates a run report from task data and git diff stats.
func (r *Runner) generateReport(result *engine.RunResult) (*Report, error) {
	if result == nil {
		return nil, fmt.Errorf("no run result")
	}

	client := ticks.NewClient(r.TickDir)

	// Get epic title
	var epicTitle string
	epic, err := client.GetEpic(r.EpicID)
	if err == nil && epic != nil {
		epicTitle = epic.Title
	}

	// Get task summaries
	tasks, err := client.ListTasks(r.EpicID)
	var taskSummaries []TaskSummary
	if err == nil {
		for _, t := range tasks {
			ts := TaskSummary{
				ID:     t.ID,
				Title:  t.Title,
				Closed: t.IsClosed(),
			}
			if t.Awaiting != nil {
				ts.Awaiting = *t.Awaiting
			}
			taskSummaries = append(taskSummaries, ts)
		}
	}

	// Get file summaries from git diff --stat
	fileSummaries := r.getFileSummaries()

	report := &Report{
		EpicID:    r.EpicID,
		EpicTitle: epicTitle,
		Tasks:     taskSummaries,
		Files:     fileSummaries,
		Metrics: MetricsSummary{
			TotalCost:   result.TotalCost,
			TotalTokens: result.TotalTokens,
			Duration:    result.Duration,
			WaveCount:   result.Iterations,
		},
	}

	return report, nil
}

// getFileSummaries parses git diff --numstat output into FileSummary slices.
func (r *Runner) getFileSummaries() []FileSummary {
	parentBranch := r.Worktree.ParentBranch
	if parentBranch == "" {
		parentBranch = "main"
	}

	cmd := exec.Command("git", "diff", parentBranch+"...HEAD", "--numstat")
	cmd.Dir = r.WorkDir
	output, err := cmd.Output()
	if err != nil {
		return nil
	}

	var files []FileSummary
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		var add, del int
		var path string
		n, _ := fmt.Sscanf(line, "%d\t%d\t%s", &add, &del, &path)
		if n == 3 {
			files = append(files, FileSummary{
				Path:      path,
				Additions: add,
				Deletions: del,
			})
		}
	}

	return files
}

// handleMerge attempts to merge the worktree branch.
func (r *Runner) handleMerge() (*worktree.MergeResult, error) {
	if r.MergeManager == nil {
		mm, err := worktree.NewMergeManager(r.RepoRoot)
		if err != nil {
			return nil, err
		}
		r.MergeManager = mm
	}

	return r.MergeManager.Merge(r.Worktree, worktree.MergeOptions{})
}

// createPR creates a draft PR using the gh CLI.
func (r *Runner) createPR(report *Report, mergeResult *worktree.MergeResult) error {
	title := fmt.Sprintf("[tk] %s", report.EpicTitle)
	if len(title) > 72 {
		title = title[:69] + "..."
	}

	body := report.Markdown()

	args := []string{"pr", "create", "--draft", "--title", title, "--body", body}
	if mergeResult != nil && mergeResult.TargetBranch != "" {
		args = append(args, "--base", mergeResult.TargetBranch)
	}

	cmd := exec.Command("gh", args...)
	cmd.Dir = r.RepoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("gh pr create failed: %s: %w", strings.TrimSpace(string(output)), err)
	}

	if r.Output != nil {
		r.Output.PRCreated(strings.TrimSpace(string(output)))
	}
	return nil
}

// Markdown renders the report as markdown.
func (r *Report) Markdown() string {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("## %s\n\n", r.EpicTitle))

	// Tasks section
	if len(r.Tasks) > 0 {
		b.WriteString("### Tasks\n\n")
		for _, t := range r.Tasks {
			status := "open"
			if t.Closed {
				status = "closed"
			} else if t.Awaiting != "" {
				status = fmt.Sprintf("awaiting %s", t.Awaiting)
			}
			b.WriteString(fmt.Sprintf("- **%s** %s (%s)\n", t.ID, t.Title, status))
		}
		b.WriteString("\n")
	}

	// Files section
	if len(r.Files) > 0 {
		b.WriteString("### Files Changed\n\n")
		totalAdd, totalDel := 0, 0
		for _, f := range r.Files {
			b.WriteString(fmt.Sprintf("- `%s` (+%d/-%d)\n", f.Path, f.Additions, f.Deletions))
			totalAdd += f.Additions
			totalDel += f.Deletions
		}
		b.WriteString(fmt.Sprintf("\n**Total**: %d files, +%d/-%d lines\n\n", len(r.Files), totalAdd, totalDel))
	}

	// Wrapup steps section
	if len(r.WrapupSteps) > 0 {
		b.WriteString("### Wrapup Steps\n\n")
		for _, s := range r.WrapupSteps {
			check := "x"
			if s.Status != "completed" {
				check = " "
			}
			detail := fmt.Sprintf("%.1fs, $%.4f", s.Duration.Seconds(), s.Cost)
			if s.Status == "escalated" {
				detail += " (escalated)"
			} else if s.Status == "failed" {
				detail += " (failed)"
			}
			b.WriteString(fmt.Sprintf("- [%s] %s — %s\n", check, s.Title, detail))
		}
		b.WriteString("\n")
	}

	// Metrics section
	b.WriteString("### Metrics\n\n")
	b.WriteString(fmt.Sprintf("- **Cost**: $%.4f\n", r.Metrics.TotalCost))
	b.WriteString(fmt.Sprintf("- **Tokens**: %d\n", r.Metrics.TotalTokens))
	b.WriteString(fmt.Sprintf("- **Duration**: %s\n", r.Metrics.Duration.Round(time.Second)))
	b.WriteString(fmt.Sprintf("- **Waves**: %d\n", r.Metrics.WaveCount))

	return b.String()
}

// configFile holds the yaml structure for .tick/config.yaml.
type configFile struct {
	WrapUp []Step `yaml:"wrap_up"`
}

// LoadConfig reads wrap-up config from .tick/config.yaml.
// If the file doesn't exist, returns an empty config (no steps).
func LoadConfig(tickDir string) (Config, error) {
	configPath := filepath.Join(tickDir, "config.yaml")

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return Config{}, nil
		}
		return Config{}, fmt.Errorf("reading config: %w", err)
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return Config{}, nil
	}

	var cf configFile
	if err := yaml.Unmarshal(data, &cf); err != nil {
		return Config{}, fmt.Errorf("parsing config.yaml: %w", err)
	}

	return Config{Steps: cf.WrapUp}, nil
}
