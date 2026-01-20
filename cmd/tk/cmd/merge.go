package cmd

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/worktree"
)

var mergeCmd = &cobra.Command{
	Use:   "merge <epic-id>",
	Short: "Merge a completed epic branch into main",
	Long: `Merge a completed epic's worktree branch into the main branch.

This command merges changes made during an epic's development back into main.
If the epic used a worktree, it merges the worktree branch and removes the worktree.

Examples:
  tk merge abc123                 # Merge epic abc123 branch into main
  tk merge abc123 --force         # Merge even if epic not fully closed
  tk merge abc123 --dry-run       # Show what would be merged
  tk merge abc123 --no-delete-branch  # Keep branch after merge`,
	Args: cobra.ExactArgs(1),
	RunE: runMerge,
}

var (
	mergeForce        bool
	mergeDeleteBranch bool
	mergeDryRun       bool
	mergeYes          bool
)

func init() {
	mergeCmd.Flags().BoolVar(&mergeForce, "force", false, "force merge even if epic not fully closed")
	mergeCmd.Flags().BoolVar(&mergeDeleteBranch, "delete-branch", true, "delete branch after merge")
	mergeCmd.Flags().BoolVar(&mergeDryRun, "dry-run", false, "show what would be merged without doing it")
	mergeCmd.Flags().BoolVarP(&mergeYes, "yes", "y", false, "skip confirmation prompt")

	rootCmd.AddCommand(mergeCmd)
}

func runMerge(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "not in a git repository: %v", err)
	}

	epicID := args[0]

	// Create ticks client to check epic status
	ticksClient := ticks.NewClient(filepath.Join(root, ".tick"))

	// Get the epic
	epic, err := ticksClient.GetEpic(epicID)
	if err != nil {
		return NewExitError(ExitNotFound, "epic not found: %v", err)
	}

	// Check if epic is closed (unless --force)
	if !mergeForce {
		if epic.Status != "closed" {
			// Check if all tasks are closed
			hasOpen, err := ticksClient.HasOpenTasks(epicID)
			if err != nil {
				return NewExitError(ExitGeneric, "failed to check tasks: %v", err)
			}
			if hasOpen {
				return NewExitError(ExitGeneric, "epic %s has open tasks - close all tasks or use --force", epicID)
			}
		}
	}

	// Create worktree manager
	wtManager, err := worktree.NewManager(root)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to create worktree manager: %v", err)
	}

	// Check if worktree exists for this epic
	wt, err := wtManager.Get(epicID)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to check worktree: %v", err)
	}

	var branchToMerge string
	var hasWorktree bool

	if wt != nil {
		// Worktree exists - merge its branch
		branchToMerge = wt.Branch
		hasWorktree = true
	} else {
		// No worktree - check if a ticker branch exists
		branchToMerge = worktree.BranchPrefix + epicID
		if !branchExists(root, branchToMerge) {
			return NewExitError(ExitNotFound, "no worktree or branch found for epic %s", epicID)
		}
	}

	// Get the main branch name
	mainBranch, err := getMainBranch(root)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to get main branch: %v", err)
	}

	// Check current branch
	currentBranch, err := getCurrentBranch(root)
	if err != nil {
		return NewExitError(ExitGeneric, "failed to get current branch: %v", err)
	}

	// Ensure we're on main branch
	if currentBranch != mainBranch {
		return NewExitError(ExitGeneric, "must be on %s branch to merge (currently on %s)", mainBranch, currentBranch)
	}

	// Check for uncommitted changes in main repo
	dirty, dirtyFiles, err := wtManager.IsDirty()
	if err != nil {
		return NewExitError(ExitGeneric, "failed to check repo status: %v", err)
	}
	if dirty {
		// Filter out .tick files which are allowed to be dirty
		onlyTick, _ := wtManager.IsOnlyTickFilesDirty(dirtyFiles)
		if !onlyTick {
			return NewExitError(ExitGeneric, "main repository has uncommitted changes - commit or stash them first")
		}
	}

	// Show what will happen
	fmt.Printf("Epic:   %s (%s)\n", epic.ID, epic.Title)
	fmt.Printf("Branch: %s\n", branchToMerge)
	fmt.Printf("Into:   %s\n", mainBranch)
	if hasWorktree {
		fmt.Printf("Worktree: %s (will be removed)\n", wt.Path)
	}

	if mergeDryRun {
		// Show commits that would be merged
		fmt.Println("\nCommits to merge:")
		output, err := gitLog(root, mainBranch+".."+branchToMerge)
		if err != nil {
			return NewExitError(ExitGeneric, "failed to get commit log: %v", err)
		}
		if output == "" {
			fmt.Println("  (no new commits)")
		} else {
			fmt.Println(output)
		}
		fmt.Println("\n(dry run - no changes made)")
		return nil
	}

	// Ask for confirmation unless --yes
	if !mergeYes {
		fmt.Print("\nProceed with merge? [y/N] ")
		reader := bufio.NewReader(os.Stdin)
		response, err := reader.ReadString('\n')
		if err != nil {
			return NewExitError(ExitIO, "failed to read response: %v", err)
		}
		response = strings.TrimSpace(strings.ToLower(response))
		if response != "y" && response != "yes" {
			fmt.Println("Merge cancelled")
			return nil
		}
	}

	// Perform the merge
	fmt.Printf("\nMerging %s into %s...\n", branchToMerge, mainBranch)

	mergeErr := gitMerge(root, branchToMerge, epic.Title)
	if mergeErr != nil {
		// Check if it's a merge conflict
		if ismergeConflict(mergeErr) {
			// Abort the merge
			_ = gitMergeAbort(root)
			return NewExitError(ExitGeneric, "merge conflict detected - resolve manually or abort:\n  git merge %s\n  # resolve conflicts\n  git commit", branchToMerge)
		}
		return NewExitError(ExitGeneric, "merge failed: %v", mergeErr)
	}

	fmt.Println("Merge successful!")

	// Remove worktree if it exists
	if hasWorktree {
		fmt.Printf("Removing worktree at %s...\n", wt.Path)
		if err := wtManager.Remove(epicID); err != nil {
			// Log but don't fail - merge was successful
			fmt.Fprintf(os.Stderr, "warning: failed to remove worktree: %v\n", err)
		} else {
			fmt.Println("Worktree removed")
		}
	} else if mergeDeleteBranch {
		// Delete the branch if no worktree (worktree.Remove already deletes branch)
		fmt.Printf("Deleting branch %s...\n", branchToMerge)
		if err := gitDeleteBranch(root, branchToMerge); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to delete branch: %v\n", err)
		} else {
			fmt.Println("Branch deleted")
		}
	}

	return nil
}

// branchExists checks if a git branch exists.
func branchExists(repoRoot, branch string) bool {
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	cmd.Dir = repoRoot
	return cmd.Run() == nil
}

// getMainBranch returns the name of the main branch (main or master).
func getMainBranch(repoRoot string) (string, error) {
	// Check for 'main' first
	if branchExists(repoRoot, "main") {
		return "main", nil
	}
	// Fall back to 'master'
	if branchExists(repoRoot, "master") {
		return "master", nil
	}
	// Try to get the default branch from remote
	cmd := exec.Command("git", "remote", "show", "origin")
	cmd.Dir = repoRoot
	output, err := cmd.Output()
	if err == nil {
		// Parse "HEAD branch: main" line
		for _, line := range strings.Split(string(output), "\n") {
			if strings.Contains(line, "HEAD branch:") {
				parts := strings.Split(line, ":")
				if len(parts) == 2 {
					return strings.TrimSpace(parts[1]), nil
				}
			}
		}
	}
	return "", fmt.Errorf("could not determine main branch")
}

// getCurrentBranch returns the current git branch.
func getCurrentBranch(repoRoot string) (string, error) {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoRoot
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// gitLog returns the log of commits between two refs.
func gitLog(repoRoot, revRange string) (string, error) {
	cmd := exec.Command("git", "log", "--oneline", revRange)
	cmd.Dir = repoRoot
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// gitMerge merges a branch into the current branch.
func gitMerge(repoRoot, branch, epicTitle string) error {
	// Use --no-ff to always create a merge commit
	message := fmt.Sprintf("Merge branch '%s'\n\nEpic: %s", branch, epicTitle)
	cmd := exec.Command("git", "merge", "--no-ff", "-m", message, branch)
	cmd.Dir = repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(output)), err)
	}
	return nil
}

// gitMergeAbort aborts an in-progress merge.
func gitMergeAbort(repoRoot string) error {
	cmd := exec.Command("git", "merge", "--abort")
	cmd.Dir = repoRoot
	return cmd.Run()
}

// gitDeleteBranch deletes a local branch.
func gitDeleteBranch(repoRoot, branch string) error {
	cmd := exec.Command("git", "branch", "-D", branch)
	cmd.Dir = repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(output)), err)
	}
	return nil
}

// ismergeConflict checks if an error is a merge conflict.
func ismergeConflict(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	return strings.Contains(errStr, "conflict") || strings.Contains(errStr, "merge conflict")
}
