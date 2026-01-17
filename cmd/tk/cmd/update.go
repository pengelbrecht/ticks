package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var updateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update tick fields",
	Long: `Update tick fields. All flags are optional.

Agent-Human Workflow Flags:
  --requires value    Pre-declared approval gate (approval|review|content, empty to clear)
  --awaiting value    Wait state (work|approval|input|review|content|escalation|checkpoint, empty to clear)
  --verdict value     Set verdict and trigger processing (approved|rejected)
  --manual            [DEPRECATED] Use --awaiting=work instead

Examples:
  # Route task to human for approval
  tk update abc123 --awaiting approval

  # Clear awaiting (return to agent queue)
  tk update abc123 --awaiting=

  # Add pre-declared approval gate
  tk update abc123 --requires approval

  # Mark task as needing human work (replaces --manual)
  tk update abc123 --awaiting work

  # Set verdict on awaiting tick (lower-level alternative to tk approve/reject)
  tk update abc123 --verdict approved`,
	Args: cobra.ExactArgs(1),
	RunE: runUpdate,
}

var (
	updateTitle       string
	updateDescription string
	updateNotes       string
	updateStatus      string
	updatePriority    int
	updateType        string
	updateOwner       string
	updateAddLabels   string
	updateRemoveLabels string
	updateAcceptance  string
	updateDefer       string
	updateExternalRef string
	updateParent      string
	updateManual      string
	updateRequires    string
	updateAwaiting    string
	updateVerdict     string
	updateJSON        bool

	// Track which flags were explicitly set
	updateTitleSet       bool
	updateDescriptionSet bool
	updateNotesSet       bool
	updateStatusSet      bool
	updatePrioritySet    bool
	updateTypeSet        bool
	updateOwnerSet       bool
	updateAddLabelsSet   bool
	updateRemoveLabelsSet bool
	updateAcceptanceSet  bool
	updateDeferSet       bool
	updateExternalRefSet bool
	updateParentSet      bool
	updateManualSet      bool
	updateRequiresSet    bool
	updateAwaitingSet    bool
	updateVerdictSet     bool
)

func init() {
	updateCmd.Flags().StringVar(&updateTitle, "title", "", "new title")
	updateCmd.Flags().StringVar(&updateDescription, "description", "", "new description")
	updateCmd.Flags().StringVar(&updateNotes, "notes", "", "replace notes")
	updateCmd.Flags().StringVar(&updateStatus, "status", "", "new status")
	updateCmd.Flags().IntVar(&updatePriority, "priority", 0, "new priority")
	updateCmd.Flags().StringVar(&updateType, "type", "", "new type")
	updateCmd.Flags().StringVar(&updateOwner, "owner", "", "new owner")
	updateCmd.Flags().StringVar(&updateAddLabels, "add-labels", "", "labels to add")
	updateCmd.Flags().StringVar(&updateRemoveLabels, "remove-labels", "", "labels to remove")
	updateCmd.Flags().StringVar(&updateAcceptance, "acceptance", "", "acceptance criteria")
	updateCmd.Flags().StringVar(&updateDefer, "defer", "", "defer until date (YYYY-MM-DD)")
	updateCmd.Flags().StringVar(&updateExternalRef, "external-ref", "", "external reference")
	updateCmd.Flags().StringVar(&updateParent, "parent", "", "parent epic id (use empty string to clear)")
	updateCmd.Flags().StringVar(&updateManual, "manual", "", "mark as requiring human intervention (true/false)")
	updateCmd.Flags().StringVarP(&updateRequires, "requires", "r", "", "approval gate (approval|review|content, empty to clear)")
	updateCmd.Flags().StringVarP(&updateAwaiting, "awaiting", "a", "", "wait state (work|approval|input|review|content|escalation|checkpoint, empty to clear)")
	updateCmd.Flags().StringVarP(&updateVerdict, "verdict", "v", "", "set verdict and trigger processing (approved|rejected)")
	updateCmd.Flags().BoolVar(&updateJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(updateCmd)
}

func runUpdate(cmd *cobra.Command, args []string) error {
	// Track which flags were explicitly set
	updateTitleSet = cmd.Flags().Changed("title")
	updateDescriptionSet = cmd.Flags().Changed("description")
	updateNotesSet = cmd.Flags().Changed("notes")
	updateStatusSet = cmd.Flags().Changed("status")
	updatePrioritySet = cmd.Flags().Changed("priority")
	updateTypeSet = cmd.Flags().Changed("type")
	updateOwnerSet = cmd.Flags().Changed("owner")
	updateAddLabelsSet = cmd.Flags().Changed("add-labels")
	updateRemoveLabelsSet = cmd.Flags().Changed("remove-labels")
	updateAcceptanceSet = cmd.Flags().Changed("acceptance")
	updateDeferSet = cmd.Flags().Changed("defer")
	updateExternalRefSet = cmd.Flags().Changed("external-ref")
	updateParentSet = cmd.Flags().Changed("parent")
	updateManualSet = cmd.Flags().Changed("manual")
	updateRequiresSet = cmd.Flags().Changed("requires")
	updateAwaitingSet = cmd.Flags().Changed("awaiting")
	updateVerdictSet = cmd.Flags().Changed("verdict")

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

	// Apply updates for flags that were explicitly set
	if updateTitleSet {
		t.Title = updateTitle
	}
	if updateDescriptionSet {
		t.Description = updateDescription
	}
	if updateNotesSet {
		t.Notes = updateNotes
	}
	if updateStatusSet {
		t.Status = updateStatus
		if updateStatus == tick.StatusClosed {
			now := time.Now().UTC()
			t.ClosedAt = &now
		} else {
			t.ClosedAt = nil
			t.ClosedReason = ""
		}
	}
	if updatePrioritySet {
		t.Priority = updatePriority
	}
	if updateTypeSet {
		t.Type = updateType
	}
	if updateOwnerSet {
		t.Owner = updateOwner
	}
	if updateAddLabelsSet {
		for _, label := range splitCSV(updateAddLabels) {
			t.Labels = appendUnique(t.Labels, label)
		}
	}
	if updateRemoveLabelsSet {
		for _, label := range splitCSV(updateRemoveLabels) {
			t.Labels = removeString(t.Labels, label)
		}
	}
	if updateAcceptanceSet {
		t.AcceptanceCriteria = updateAcceptance
	}
	if updateDeferSet {
		if updateDefer == "" {
			t.DeferUntil = nil
		} else {
			parsed, err := time.Parse("2006-01-02", updateDefer)
			if err != nil {
				return fmt.Errorf("invalid defer date (use YYYY-MM-DD): %w", err)
			}
			t.DeferUntil = &parsed
		}
	}
	if updateExternalRefSet {
		t.ExternalRef = updateExternalRef
	}
	if updateManualSet {
		fmt.Fprintln(os.Stderr, "Warning: --manual is deprecated, use --awaiting work instead")
		// Parse manual value
		manualVal := strings.ToLower(strings.TrimSpace(updateManual))
		isManual := manualVal == "true" || manualVal == "1" || manualVal == "yes"
		// Map manual=true to awaiting=work if awaiting not explicitly set
		if isManual && !updateAwaitingSet {
			t.SetAwaiting(tick.AwaitingWork)
		} else if !isManual {
			// manual=false clears both fields
			t.ClearAwaiting()
		}
	}
	if updateParentSet {
		t.Parent = updateParent
	}
	if updateRequiresSet {
		if updateRequires == "" {
			t.Requires = nil
		} else {
			switch updateRequires {
			case tick.RequiresApproval, tick.RequiresReview, tick.RequiresContent:
				t.Requires = &updateRequires
			default:
				return fmt.Errorf("invalid requires value: %s (must be approval, review, or content)", updateRequires)
			}
		}
	}
	if updateAwaitingSet {
		if updateAwaiting == "" {
			t.ClearAwaiting()
		} else {
			switch updateAwaiting {
			case tick.AwaitingWork, tick.AwaitingApproval, tick.AwaitingInput, tick.AwaitingReview, tick.AwaitingContent, tick.AwaitingEscalation, tick.AwaitingCheckpoint:
				t.SetAwaiting(updateAwaiting)
			default:
				return fmt.Errorf("invalid awaiting value: %s (must be work, approval, input, review, content, escalation, or checkpoint)", updateAwaiting)
			}
		}
	}
	if updateVerdictSet {
		switch updateVerdict {
		case tick.VerdictApproved, tick.VerdictRejected:
			t.Verdict = &updateVerdict
		default:
			return fmt.Errorf("invalid verdict value: %s (must be approved or rejected)", updateVerdict)
		}
	}

	t.UpdatedAt = time.Now().UTC()

	// Process verdict if it was set (triggers state machine)
	if updateVerdictSet {
		_, err := tick.ProcessVerdict(&t)
		if err != nil {
			return fmt.Errorf("failed to process verdict: %w", err)
		}
	}

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	if updateJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	return nil
}

// appendUnique appends a value to a slice only if it doesn't already exist.
func appendUnique(values []string, value string) []string {
	for _, item := range values {
		if item == value {
			return values
		}
	}
	return append(values, value)
}

// removeString removes a value from a slice.
func removeString(values []string, value string) []string {
	out := values[:0]
	for _, item := range values {
		if item == value {
			continue
		}
		out = append(out, item)
	}
	return out
}
