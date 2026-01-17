package cmd

import (
	"fmt"
	"path/filepath"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/tui"
)

var viewCmd = &cobra.Command{
	Use:   "view",
	Short: "Open interactive TUI for browsing ticks",
	Long: `Open an interactive TUI for browsing and viewing ticks.

Supports filtering by owner, status, priority, type, label, and parent.`,
	Args: cobra.NoArgs,
	RunE: runView,
}

var (
	viewAll      bool
	viewOwner    string
	viewStatus   string
	viewPriority int
	viewType     string
	viewLabel    string
	viewParent   string
)

func init() {
	viewCmd.Flags().BoolVarP(&viewAll, "all", "a", false, "all owners")
	viewCmd.Flags().StringVarP(&viewOwner, "owner", "o", "", "owner")
	viewCmd.Flags().StringVarP(&viewStatus, "status", "s", "", "status (open|closed|all)")
	viewCmd.Flags().IntVarP(&viewPriority, "priority", "p", -1, "priority (0-4)")
	viewCmd.Flags().StringVarP(&viewType, "type", "t", "", "type (task|epic|bug|feature|chore)")
	viewCmd.Flags().StringVarP(&viewLabel, "label", "l", "", "label")
	viewCmd.Flags().StringVar(&viewParent, "parent", "", "parent epic id")

	rootCmd.AddCommand(viewCmd)
}

func runView(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	owner, err := resolveOwner(viewAll, viewOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	var priority *int
	if viewPriority >= 0 {
		p := viewPriority
		priority = &p
	}

	status := strings.TrimSpace(viewStatus)
	if status == "all" {
		status = ""
	}

	filter := query.Filter{
		Owner:    owner,
		Status:   status,
		Priority: priority,
		Type:     strings.TrimSpace(viewType),
		Label:    strings.TrimSpace(viewLabel),
		Parent:   strings.TrimSpace(viewParent),
	}

	filtered := query.Apply(ticks, filter)

	storePath := filepath.Join(root, ".tick")
	model := tui.NewModel(filtered, storePath)
	defer model.Close() // Clean up filesystem watcher
	if _, err := tea.NewProgram(model, tea.WithAltScreen()).Run(); err != nil {
		return fmt.Errorf("failed to run view: %w", err)
	}
	return nil
}
