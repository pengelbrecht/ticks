package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// listOutput wraps the output for JSON formatting.
type listOutput struct {
	Ticks   []tick.Tick `json:"ticks"`
	Filters *listFilter `json:"filters,omitempty"`
}

// listFilter captures the search/filter options applied to list output.
type listFilter struct {
	TitleContains string   `json:"title_contains,omitempty"`
	DescContains  string   `json:"desc_contains,omitempty"`
	NotesContains string   `json:"notes_contains,omitempty"`
	LabelAny      []string `json:"label_any,omitempty"`
}

var listCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List ticks with optional filters",
	Long: `List ticks with optional filters.

By default, only shows ticks owned by the current user.
Use --all to show all owners.

Awaiting Filter Examples:
  # All ticks awaiting human action
  tk list --awaiting=

  # Only ticks awaiting approval
  tk list --awaiting approval

  # Ticks awaiting approval or review
  tk list --awaiting approval,review

  # Show what needs your attention (JSON)
  tk list --awaiting= --json | jq '.ticks[] | {id, title, awaiting}'`,
	Args: cobra.NoArgs,
	RunE: runList,
}

var (
	listAll           bool
	listOwner         string
	listStatus        string
	listPriority      int
	listType          string
	listLabel         string
	listLabelAny      string
	listParent        string
	listTitleContains string
	listDescContains  string
	listNotesContains string
	listManual        bool
	listAwaiting      string
	listJSON          bool
)

// listAwaitingSet tracks whether --awaiting flag was explicitly provided
var listAwaitingSet bool

func init() {
	listCmd.Flags().BoolVarP(&listAll, "all", "a", false, "all owners")
	listCmd.Flags().StringVarP(&listOwner, "owner", "o", "", "owner")
	listCmd.Flags().StringVarP(&listStatus, "status", "s", "", "status (open|closed|all)")
	listCmd.Flags().IntVarP(&listPriority, "priority", "p", -1, "priority (0-4)")
	listCmd.Flags().StringVarP(&listType, "type", "t", "", "type (task|epic|bug|feature|chore)")
	listCmd.Flags().StringVarP(&listLabel, "label", "l", "", "label")
	listCmd.Flags().StringVar(&listLabelAny, "label-any", "", "label-any (comma-separated)")
	listCmd.Flags().StringVar(&listParent, "parent", "", "parent epic id")
	listCmd.Flags().StringVar(&listTitleContains, "title-contains", "", "title contains (case-insensitive)")
	listCmd.Flags().StringVar(&listDescContains, "desc-contains", "", "description contains (case-insensitive)")
	listCmd.Flags().StringVar(&listNotesContains, "notes-contains", "", "notes contains (case-insensitive)")
	listCmd.Flags().BoolVar(&listManual, "manual", false, "show only manual tasks (requires human intervention)")
	listCmd.Flags().StringVar(&listAwaiting, "awaiting", "", "filter by awaiting status (empty = all awaiting, or specific type(s) comma-separated)")
	listCmd.Flags().BoolVar(&listJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(listCmd)
}

func runList(cmd *cobra.Command, args []string) error {
	// Track whether --awaiting was explicitly set (even if empty)
	listAwaitingSet = cmd.Flags().Changed("awaiting")

	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	owner, err := resolveOwner(listAll, listOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	var priority *int
	if listPriority >= 0 {
		p := listPriority
		priority = &p
	}

	status := strings.TrimSpace(listStatus)
	if status == "all" {
		status = ""
	}

	filter := query.Filter{
		Owner:         owner,
		Status:        status,
		Priority:      priority,
		Type:          strings.TrimSpace(listType),
		Label:         strings.TrimSpace(listLabel),
		LabelAny:      splitCSV(listLabelAny),
		Parent:        strings.TrimSpace(listParent),
		TitleContains: strings.TrimSpace(listTitleContains),
		DescContains:  strings.TrimSpace(listDescContains),
		NotesContains: strings.TrimSpace(listNotesContains),
	}

	filtered := query.Apply(ticks, filter)

	// Filter by manual status if requested
	if listManual {
		var manualTicks []tick.Tick
		for _, t := range filtered {
			if t.Manual {
				manualTicks = append(manualTicks, t)
			}
		}
		filtered = manualTicks
	}

	// Filter by awaiting status if requested
	if listAwaitingSet {
		awaitingVal := strings.TrimSpace(listAwaiting)
		var awaitingTicks []tick.Tick
		if awaitingVal == "" {
			// Empty string means all awaiting ticks
			for _, t := range filtered {
				if t.IsAwaitingHuman() {
					awaitingTicks = append(awaitingTicks, t)
				}
			}
		} else {
			// Filter by specific awaiting type(s)
			types := splitCSV(awaitingVal)
			typeSet := make(map[string]bool)
			for _, typ := range types {
				typeSet[typ] = true
			}
			for _, t := range filtered {
				if t.IsAwaitingHuman() && typeSet[t.GetAwaitingType()] {
					awaitingTicks = append(awaitingTicks, t)
				}
			}
		}
		filtered = awaitingTicks
	}

	query.SortByPriorityCreatedAt(filtered)

	if listJSON {
		output := listOutput{Ticks: filtered}
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

	// Build open ticks map for blocked detection
	openTicks := make(map[string]bool)
	for _, t := range ticks {
		if t.Status != tick.StatusClosed {
			openTicks[t.ID] = true
		}
	}

	// Print header
	header := fmt.Sprintf(" %-4s  %s  %-7s  %s  %s", "ID", "PRI", "TYPE", "ST", "TITLE")
	fmt.Println(styles.DimStyle.Render(header))

	for _, t := range filtered {
		// Check if blocked
		isBlocked := false
		if t.Status == tick.StatusOpen && len(t.BlockedBy) > 0 {
			for _, blockerID := range t.BlockedBy {
				if openTicks[blockerID] {
					isBlocked = true
					break
				}
			}
		}

		statusIcon := styles.RenderTickStatusWithBlocked(t, isBlocked)
		fmt.Printf(" %-4s  %s  %-7s  %s   %s\n",
			t.ID,
			styles.RenderPriority(t.Priority),
			styles.RenderType(t.Type),
			statusIcon,
			t.Title,
		)
	}
	fmt.Printf("\n%d ticks\n", len(filtered))
	return nil
}

// resolveOwner resolves the owner to use based on flags.
func resolveOwner(allOwners bool, ownerFlag string) (string, error) {
	if allOwners {
		return "", nil
	}
	owner := strings.TrimSpace(ownerFlag)
	if owner != "" {
		return owner, nil
	}
	return github.DetectOwner(nil)
}
