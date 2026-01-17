package cmd

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var labelCmd = &cobra.Command{
	Use:   "label",
	Short: "Manage labels on a tick",
	Long: `Manage labels on a tick.

Subcommands:
  add    Add a label to a tick
  rm     Remove a label from a tick
  list   List labels on a tick`,
}

var labelAddCmd = &cobra.Command{
	Use:   "add <id> <label>",
	Short: "Add a label to a tick",
	Args:  cobra.ExactArgs(2),
	RunE:  runLabelAdd,
}

var labelRmCmd = &cobra.Command{
	Use:   "rm <id> <label>",
	Short: "Remove a label from a tick",
	Args:  cobra.ExactArgs(2),
	RunE:  runLabelRm,
}

var labelListCmd = &cobra.Command{
	Use:   "list <id>",
	Short: "List labels on a tick",
	Args:  cobra.ExactArgs(1),
	RunE:  runLabelList,
}

func init() {
	labelCmd.AddCommand(labelAddCmd)
	labelCmd.AddCommand(labelRmCmd)
	labelCmd.AddCommand(labelListCmd)
	rootCmd.AddCommand(labelCmd)
}

func runLabelAdd(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	t.Labels = appendUnique(t.Labels, args[1])
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	return nil
}

func runLabelRm(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	t.Labels = removeString(t.Labels, args[1])
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	return nil
}

func runLabelList(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	for _, label := range t.Labels {
		fmt.Println(label)
	}

	return nil
}
