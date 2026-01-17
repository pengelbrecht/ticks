package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/beads"
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var importCmd = &cobra.Command{
	Use:   "import [file]",
	Short: "Import ticks from external sources",
	Long: `Import ticks from external sources (beads format).

If no file is specified, auto-detects .beads/issues.jsonl in the repo root.
The special argument "beads" also triggers auto-detection.

Examples:
  tk import                    # Auto-detect beads file
  tk import beads              # Explicit auto-detect
  tk import path/to/file.jsonl # Import from specific file`,
	Args: cobra.MaximumNArgs(1),
	RunE: runImport,
}

var importJSON bool

func init() {
	importCmd.Flags().BoolVar(&importJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(importCmd)
}

func runImport(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	// Check if ticks is initialized
	if _, err := os.Stat(filepath.Join(root, ".tick")); os.IsNotExist(err) {
		return fmt.Errorf("ticks not initialized. Run `tk init` first")
	}

	// Determine source file
	var sourcePath string
	if len(args) > 0 && args[0] != "beads" {
		// Explicit file path provided
		sourcePath = args[0]
	} else {
		// Auto-detect beads file
		sourcePath = beads.FindBeadsFile(root)
		if sourcePath == "" {
			return fmt.Errorf("no beads file found. Looked for .beads/issues.jsonl")
		}
	}

	// Parse beads file
	issues, err := beads.ParseFile(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to parse beads file: %w", err)
	}

	// Get current git user for owner
	owner, err := github.DetectOwner(nil)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	// Import
	store := tick.NewStore(filepath.Join(root, ".tick"))
	result, err := beads.Import(issues, store, owner)
	if err != nil {
		return fmt.Errorf("import failed: %w", err)
	}

	if importJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(result); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("Imported %d issues (%d skipped)\n", result.Imported, result.Skipped)
	return nil
}
