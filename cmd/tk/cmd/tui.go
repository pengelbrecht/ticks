package cmd

import (
	"fmt"
	"path/filepath"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/muesli/termenv"
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/tui"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Open the unified interactive terminal app",
	Long: `Open the unified terminal app: a persistent shell with a navigation
sidebar, swappable content views (List today; Board/Roadmap/Timeline later),
and a read-only detail pane.

Supports filtering by owner, status, priority, type, label, and parent.`,
	Args: cobra.NoArgs,
	RunE: runTUI,
}

var (
	tuiAll      bool
	tuiOwner    string
	tuiStatus   string
	tuiPriority int
	tuiType     string
	tuiLabel    string
	tuiParent   string
)

func init() {
	tuiCmd.Flags().BoolVarP(&tuiAll, "all", "a", false, "all owners")
	tuiCmd.Flags().StringVarP(&tuiOwner, "owner", "o", "", "owner")
	tuiCmd.Flags().StringVarP(&tuiStatus, "status", "s", "", "status (open|closed|all)")
	tuiCmd.Flags().IntVarP(&tuiPriority, "priority", "p", -1, "priority (0-4)")
	tuiCmd.Flags().StringVarP(&tuiType, "type", "t", "", "type (task|epic|bug|feature|chore)")
	tuiCmd.Flags().StringVarP(&tuiLabel, "label", "l", "", "label")
	tuiCmd.Flags().StringVar(&tuiParent, "parent", "", "parent epic id")

	rootCmd.AddCommand(tuiCmd)
}

func runTUI(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	owner, err := resolveOwner(tuiAll, tuiOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	var priority *int
	if tuiPriority >= 0 {
		p := tuiPriority
		priority = &p
	}

	status := strings.TrimSpace(tuiStatus)
	if status == "all" {
		status = ""
	}

	filter := query.Filter{
		Owner:    owner,
		Status:   status,
		Priority: priority,
		Type:     strings.TrimSpace(tuiType),
		Label:    strings.TrimSpace(tuiLabel),
		Parent:   strings.TrimSpace(tuiParent),
	}

	filtered := query.Apply(ticks, filter)

	// Pin TrueColor so terminals that misreport capabilities (e.g.
	// TERM=screen under tmux) still get full color. Tests pin their own
	// profile via tui.PinColorProfile for deterministic goldens (§11).
	tui.PinColorProfile(termenv.TrueColor)

	storePath := filepath.Join(root, ".tick")
	app := tui.NewApp(filtered, storePath, owner)
	defer app.Close() // Clean up filesystem watcher
	if _, err := tea.NewProgram(app, tea.WithAltScreen()).Run(); err != nil {
		return fmt.Errorf("failed to run tui: %w", err)
	}
	return nil
}
