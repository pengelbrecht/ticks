package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var noteCmd = &cobra.Command{
	Use:   "note <id> \"message\"",
	Short: "Add a timestamped note to a tick",
	Long: `Add a timestamped note to a tick.

The --from flag marks the source of the note for agent-human handoffs:
  - agent: Context about work, questions, PR links (default)
  - human: Feedback, answers, direction for the agent

Examples:
  # Agent adding context (default)
  tk note abc123 "PR ready: https://github.com/org/repo/pull/456"

  # Human providing feedback after rejection
  tk note abc123 "Use friendlier language in error messages" --from human

  # Human answering a question
  tk note abc123 "Use Stripe for payment processing" --from human

  # Edit notes in $EDITOR
  tk note abc123 --edit

Note: tk reject <id> "feedback" automatically adds a human-marked note.`,
	Args: cobra.MinimumNArgs(1),
	RunE: runNote,
}

var (
	noteEdit bool
	noteFrom string
)

func init() {
	noteCmd.Flags().BoolVar(&noteEdit, "edit", false, "edit notes in $EDITOR")
	noteCmd.Flags().StringVar(&noteFrom, "from", "agent", "note author: agent or human")
	rootCmd.AddCommand(noteCmd)
}

func runNote(cmd *cobra.Command, args []string) error {
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

	if noteEdit {
		editor := strings.TrimSpace(os.Getenv("EDITOR"))
		if editor == "" {
			return fmt.Errorf("EDITOR is not set")
		}

		tmp, err := os.CreateTemp("", "tick-notes-*.txt")
		if err != nil {
			return fmt.Errorf("failed to create temp file: %w", err)
		}
		defer os.Remove(tmp.Name())

		if _, err := tmp.WriteString(t.Notes); err != nil {
			_ = tmp.Close()
			return fmt.Errorf("failed to write temp file: %w", err)
		}
		if err := tmp.Close(); err != nil {
			return fmt.Errorf("failed to close temp file: %w", err)
		}

		editorCmd := exec.Command(editor, tmp.Name())
		editorCmd.Stdin = os.Stdin
		editorCmd.Stdout = os.Stdout
		editorCmd.Stderr = os.Stderr
		if err := editorCmd.Run(); err != nil {
			return fmt.Errorf("editor failed: %w", err)
		}

		updated, err := os.ReadFile(tmp.Name())
		if err != nil {
			return fmt.Errorf("failed to read temp file: %w", err)
		}
		t.Notes = string(updated)
		t.UpdatedAt = time.Now().UTC()
		if err := store.WriteAs(t, resolveActor("")); err != nil {
			return fmt.Errorf("failed to update tick: %w", err)
		}
		return nil
	}

	if len(args) < 2 {
		return fmt.Errorf("note text is required")
	}
	note := strings.TrimSpace(strings.Join(args[1:], " "))
	if note == "" {
		return fmt.Errorf("note text is required")
	}

	// Validate --from flag
	if noteFrom != "agent" && noteFrom != "human" {
		return NewExitError(ExitUsage, "invalid --from value: %s (must be agent or human)", noteFrom)
	}

	timestamp := time.Now().Format("2006-01-02 15:04")
	var line string
	if noteFrom == "human" {
		line = fmt.Sprintf("%s - [human] %s", timestamp, note)
	} else {
		line = fmt.Sprintf("%s - %s", timestamp, note)
	}
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
	} else {
		t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
	}
	t.UpdatedAt = time.Now().UTC()
	actor := resolveActor("")
	if noteFrom == "human" {
		// --from human is a durable provenance boundary, not merely a display
		// substring.  In particular, do not let TK_ACTOR=*:orchestrator turn a
		// human-confirmed dashboard/input note into an orchestrator-authored one.
		actor = "human"
	}
	if err := store.WriteAs(t, actor); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}
	return nil
}
