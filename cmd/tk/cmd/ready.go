package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var readyCmd = &cobra.Command{
	Use:   "ready",
	Short: "List ready (unblocked) ticks",
	Long: `List ready (unblocked) ticks.

Ready ticks are open, not blocked by other open ticks, and not awaiting human action.
By default, only shows ticks owned by the current user.

Use --include-awaiting to include tasks that are awaiting human action.

Examples:
  # List ready ticks for current user
  tk ready

  # List all ready ticks (all owners)
  tk ready --all

  # Include tasks awaiting human action
  tk ready --include-awaiting

  # Filter by label
  tk ready --label urgent`,
	Args: cobra.NoArgs,
	RunE: runReady,
}

var (
	readyAll             bool
	readyOwner           string
	readyLimit           int
	readyLabel           string
	readyLabelAny        string
	readyTitleContains   string
	readyDescContains    string
	readyNotesContains   string
	readyIncludeAwaiting bool
	readyIncludeManual   bool
	readyJSON            bool
)

func init() {
	readyCmd.Flags().BoolVarP(&readyAll, "all", "a", false, "all owners")
	readyCmd.Flags().StringVarP(&readyOwner, "owner", "o", "", "owner")
	readyCmd.Flags().IntVarP(&readyLimit, "limit", "n", 10, "max results")
	readyCmd.Flags().StringVarP(&readyLabel, "label", "l", "", "label")
	readyCmd.Flags().StringVar(&readyLabelAny, "label-any", "", "label-any (comma-separated)")
	readyCmd.Flags().StringVar(&readyTitleContains, "title-contains", "", "title contains (case-insensitive)")
	readyCmd.Flags().StringVar(&readyDescContains, "desc-contains", "", "description contains (case-insensitive)")
	readyCmd.Flags().StringVar(&readyNotesContains, "notes-contains", "", "notes contains (case-insensitive)")
	readyCmd.Flags().BoolVar(&readyIncludeAwaiting, "include-awaiting", false, "include tasks awaiting human action (excluded by default)")
	readyCmd.Flags().BoolVar(&readyIncludeManual, "include-manual", false, "deprecated: use --include-awaiting instead")
	readyCmd.Flags().BoolVar(&readyJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(readyCmd)
}

func runReady(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	owner, err := resolveOwner(readyAll, readyOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	// Deprecation warning for --include-manual
	if readyIncludeManual {
		fmt.Fprintf(os.Stderr, "warning: --include-manual is deprecated, use --include-awaiting instead\n")
	}

	filter := query.Filter{
		Owner:         owner,
		Label:         strings.TrimSpace(readyLabel),
		LabelAny:      splitCSV(readyLabelAny),
		TitleContains: strings.TrimSpace(readyTitleContains),
		DescContains:  strings.TrimSpace(readyDescContains),
		NotesContains: strings.TrimSpace(readyNotesContains),
	}
	filtered := query.Apply(ticks, filter)

	// Use ReadyIncludeAwaiting when --include-awaiting or deprecated --include-manual is set
	var ready []tick.Tick
	if readyIncludeAwaiting || readyIncludeManual {
		ready = query.ReadyIncludeAwaiting(filtered, ticks)
	} else {
		ready = query.Ready(filtered, ticks)
	}

	query.SortByPriorityCreatedAt(ready)

	if readyLimit > 0 && len(ready) > readyLimit {
		ready = ready[:readyLimit]
	}

	if readyJSON {
		output := listOutput{Ticks: ready}
		// Include filter metadata if any search filters are present
		if filter.TitleContains != "" || filter.DescContains != "" || filter.NotesContains != "" || len(filter.LabelAny) > 0 {
			output.Filters = &listFilter{
				TitleContains: filter.TitleContains,
				DescContains:  filter.DescContains,
				NotesContains: filter.NotesContains,
				LabelAny:      filter.LabelAny,
			}
		}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(output); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Println(" ID   PRI  TYPE     STATUS  TITLE")
	for _, t := range ready {
		fmt.Printf(" %-4s P%d   %-7s %-7s %s\n", t.ID, t.Priority, t.Type, t.Status, t.Title)
	}
	fmt.Printf("\n%d ticks (ready)\n", len(ready))
	return nil
}
