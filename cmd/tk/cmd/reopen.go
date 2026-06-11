package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var reopenCmd = &cobra.Command{
	Use:   "reopen <id>",
	Short: "Reopen a closed tick",
	Long: `Reopen a closed tick.

Examples:
  tk reopen abc123          # Reopen tick
  tk reopen abc123 --json   # Output reopened tick as JSON`,
	Args: cobra.ExactArgs(1),
	RunE: runReopen,
}

var (
	reopenJSON bool
)

func init() {
	reopenCmd.Flags().BoolVar(&reopenJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(reopenCmd)
}

func runReopen(cmd *cobra.Command, args []string) error {
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

	t.Status = tick.StatusOpen
	t.ClosedAt = nil
	t.ClosedReason = ""
	t.StartedAt = nil
	t.UpdatedAt = time.Now().UTC()

	if err := store.WriteAs(t, resolveActor("")); err != nil {
		return fmt.Errorf("failed to reopen tick: %w", err)
	}

	if reopenJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
	}

	return nil
}
