package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var createCmd = &cobra.Command{
	Use:     "create <title>",
	Aliases: []string{"new"},
	Short:   "Create a new tick (task or epic)",
	Long: `Create a new tick (task or epic).

Supports full agent-human workflow with --requires and --awaiting flags.

Agent-Human Workflow Flags:
  --requires value    Pre-declared approval gate (approval|review|content)
                      When set, tick routes to human even if agent signals COMPLETE.
                      The 'requires' value persists through rejection cycles.
  --awaiting value    Immediate human assignment (work|approval|input|review|content|escalation|checkpoint)
                      Tick is skipped by agent until human responds.
  --manual            [DEPRECATED] Use --awaiting=work instead

Examples:
  # Simple task
  tk create "Fix login bug" -d "Users can't login with SSO"

  # Task requiring approval before closing (even after agent completes)
  tk create "Update auth flow" --requires approval

  # Task requiring content/design review
  tk create "Redesign error messages" --requires content

  # Task assigned directly to human (skipped by agent)
  tk create "Configure AWS credentials" --awaiting work

  # Task under an epic with PR review required
  tk create "Implement payment API" --parent abc123 --requires review`,
	Args: cobra.MinimumNArgs(1),
	RunE: runCreate,
}

var (
	createDescription    string
	createPriority       int
	createType           string
	createOwner          string
	createLabels         string
	createBlockedBy      string
	createParent         string
	createDiscoveredFrom string
	createAcceptance     string
	createDefer          string
	createExternalRef    string
	createManual         bool
	createRequires       string
	createAwaiting       string
	createJSON           bool
)

func init() {
	createCmd.Flags().StringVarP(&createDescription, "description", "d", "", "detailed description")
	createCmd.Flags().IntVarP(&createPriority, "priority", "p", 2, "priority 0-4")
	createCmd.Flags().StringVarP(&createType, "type", "t", tick.TypeTask, "type (task|epic|bug|feature|chore)")
	createCmd.Flags().StringVarP(&createOwner, "owner", "o", "", "owner")
	createCmd.Flags().StringVarP(&createLabels, "labels", "l", "", "comma-separated labels")
	createCmd.Flags().StringVarP(&createBlockedBy, "blocked-by", "b", "", "comma-separated blocker ids")
	createCmd.Flags().StringVar(&createParent, "parent", "", "parent epic id")
	createCmd.Flags().StringVar(&createDiscoveredFrom, "discovered-from", "", "source tick id")
	createCmd.Flags().StringVar(&createAcceptance, "acceptance", "", "acceptance criteria")
	createCmd.Flags().StringVar(&createDefer, "defer", "", "defer until date (YYYY-MM-DD)")
	createCmd.Flags().StringVar(&createExternalRef, "external-ref", "", "external reference (e.g. gh-42)")
	createCmd.Flags().BoolVar(&createManual, "manual", false, "mark as requiring human intervention (skipped by tk next)")
	createCmd.Flags().StringVarP(&createRequires, "requires", "r", "", "approval gate (approval|review|content)")
	createCmd.Flags().StringVarP(&createAwaiting, "awaiting", "a", "", "wait state (work|approval|input|review|content|escalation|checkpoint)")
	createCmd.Flags().BoolVar(&createJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(createCmd)
}

func runCreate(cmd *cobra.Command, args []string) error {
	title := strings.TrimSpace(strings.Join(args, " "))
	if title == "" {
		return fmt.Errorf("title is required")
	}

	// Validate requires flag if provided
	requiresVal := strings.TrimSpace(createRequires)
	if requiresVal != "" {
		switch requiresVal {
		case tick.RequiresApproval, tick.RequiresReview, tick.RequiresContent:
			// valid
		default:
			return NewExitError(ExitUsage, "invalid requires value: %s (must be approval, review, or content)", requiresVal)
		}
	}

	// Validate awaiting flag if provided
	awaitingVal := strings.TrimSpace(createAwaiting)
	if awaitingVal != "" {
		switch awaitingVal {
		case tick.AwaitingWork, tick.AwaitingApproval, tick.AwaitingInput, tick.AwaitingReview, tick.AwaitingContent, tick.AwaitingEscalation, tick.AwaitingCheckpoint:
			// valid
		default:
			return NewExitError(ExitUsage, "invalid awaiting value: %s (must be work, approval, input, review, content, escalation, or checkpoint)", awaitingVal)
		}
	}

	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	cfg, err := config.Load(filepath.Join(root, ".tick", "config.json"))
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	creator, err := github.DetectOwner(nil)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	owner := creator
	if strings.TrimSpace(createOwner) != "" {
		owner = strings.TrimSpace(createOwner)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	gen := tick.NewIDGenerator(nil)
	id, newLen, err := gen.Generate(func(candidate string) bool {
		_, err := os.Stat(filepath.Join(root, ".tick", "issues", candidate+".json"))
		return err == nil
	}, cfg.IDLength)
	if err != nil {
		return fmt.Errorf("failed to generate id: %w", err)
	}

	now := time.Now().UTC()
	var deferUntil *time.Time
	if createDefer != "" {
		parsed, err := time.Parse("2006-01-02", createDefer)
		if err != nil {
			return fmt.Errorf("invalid defer date (use YYYY-MM-DD): %w", err)
		}
		deferUntil = &parsed
	}

	// Set requires pointer only if value provided
	var requires *string
	if requiresVal != "" {
		requires = &requiresVal
	}

	// Set awaiting pointer only if value provided
	var awaiting *string
	if awaitingVal != "" {
		awaiting = &awaitingVal
	}

	// Handle deprecated --manual flag
	if createManual {
		fmt.Fprintln(os.Stderr, "Warning: --manual is deprecated, use --awaiting work instead")
		// Map manual to awaiting=work if awaiting not already set
		if awaiting == nil {
			awaitingWork := tick.AwaitingWork
			awaiting = &awaitingWork
		}
	}

	t := tick.Tick{
		ID:                 id,
		Title:              title,
		Description:        strings.TrimSpace(createDescription),
		Status:             tick.StatusOpen,
		Priority:           createPriority,
		Type:               strings.TrimSpace(createType),
		Owner:              owner,
		Labels:             splitCSV(createLabels),
		BlockedBy:          splitCSV(createBlockedBy),
		Parent:             strings.TrimSpace(createParent),
		DiscoveredFrom:     strings.TrimSpace(createDiscoveredFrom),
		AcceptanceCriteria: strings.TrimSpace(createAcceptance),
		DeferUntil:         deferUntil,
		ExternalRef:        strings.TrimSpace(createExternalRef),
		Manual:             false, // Never set Manual=true for new ticks; --manual maps to awaiting=work
		Requires:           requires,
		Awaiting:           awaiting,
		CreatedBy:          creator,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to write tick: %w", err)
	}

	if newLen != cfg.IDLength {
		cfg.IDLength = newLen
		if err := config.Save(filepath.Join(root, ".tick", "config.json"), cfg); err != nil {
			return fmt.Errorf("failed to update config: %w", err)
		}
	}

	if createJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("%s\n", t.ID)
	return nil
}

// splitCSV splits a comma-separated string into a slice of trimmed non-empty strings.
func splitCSV(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}
