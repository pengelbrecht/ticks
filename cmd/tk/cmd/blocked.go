package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var blockedCmd = &cobra.Command{
	Use:   "blocked",
	Short: "List blocked ticks",
	Long: `List blocked ticks.

Blocked ticks are open ticks that have at least one open blocker.
By default, only shows ticks owned by the current user.

Examples:
  # List blocked ticks for current user
  tk blocked

  # List all blocked ticks (all owners)
  tk blocked --all

  # Output as JSON
  tk blocked --json`,
	Args: cobra.NoArgs,
	RunE: runBlocked,
}

var (
	blockedAll   bool
	blockedOwner string
	blockedJSON  bool
)

func init() {
	blockedCmd.Flags().BoolVarP(&blockedAll, "all", "a", false, "all owners")
	blockedCmd.Flags().StringVarP(&blockedOwner, "owner", "o", "", "owner")
	blockedCmd.Flags().BoolVar(&blockedJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(blockedCmd)
}

func runBlocked(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	owner, err := resolveOwner(blockedAll, blockedOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	filtered := query.Apply(ticks, query.Filter{Owner: owner})
	blocked := query.Blocked(filtered, ticks)
	query.SortByPriorityCreatedAt(blocked)

	if blockedJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(blocked); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Println(" ID   PRI  TYPE     STATUS  TITLE")
	for _, t := range blocked {
		fmt.Printf(" %-4s P%d   %-7s %-7s %s\n", t.ID, t.Priority, t.Type, t.Status, t.Title)
	}
	fmt.Printf("\n%d ticks (blocked)\n", len(blocked))
	return nil
}
