package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/beads"
	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize a .tick directory in the current repository",
	Long: `Initialize a .tick directory in the current repository.

This command creates the .tick directory structure, detects the GitHub
repository and owner, and sets up the merge driver for conflict-free merging.

Use --import-beads to also import any existing beads issues after initialization.`,
	RunE: runInit,
}

var importBeads bool

func init() {
	initCmd.Flags().BoolVar(&importBeads, "import-beads", false, "import beads issues after init")
	rootCmd.AddCommand(initCmd)
}

func runInit(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}
	owner, err := github.DetectOwner(nil)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	tickDir := filepath.Join(root, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755); err != nil {
		return fmt.Errorf("failed to create .tick directory: %w", err)
	}

	if err := config.Save(filepath.Join(tickDir, "config.json"), config.Default()); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	if err := os.WriteFile(filepath.Join(tickDir, ".gitignore"), []byte(".index.json\nlogs/\n"), 0o644); err != nil {
		return fmt.Errorf("failed to write .gitignore: %w", err)
	}

	if err := github.EnsureGitAttributes(root); err != nil {
		return fmt.Errorf("failed to update .gitattributes: %w", err)
	}
	if err := github.ConfigureMergeDriver(root); err != nil {
		return fmt.Errorf("failed to configure merge driver: %w", err)
	}

	fmt.Printf("Detected GitHub repo: %s\n", project)
	fmt.Printf("Detected user: %s\n\n", owner)
	fmt.Println("Initialized .tick/")

	// Import beads if requested
	if importBeads {
		beadsFile := beads.FindBeadsFile(root)
		if beadsFile == "" {
			fmt.Println("\nNo beads file found to import.")
		} else {
			issues, err := beads.ParseFile(beadsFile)
			if err != nil {
				return fmt.Errorf("failed to parse beads file: %w", err)
			}
			store := tick.NewStore(tickDir)
			result, err := beads.Import(issues, store, owner)
			if err != nil {
				return fmt.Errorf("failed to import beads: %w", err)
			}
			fmt.Printf("\nImported %d beads issues (%d skipped)\n", result.Imported, result.Skipped)
		}
	}

	fmt.Println()
	fmt.Println("Add the following to your CLAUDE.md or AGENTS.md:")
	fmt.Println()
	fmt.Print(snippetText)

	return nil
}

// repoRoot returns the root directory of the git repository.
func repoRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("not in a git repository")
		}
		dir = parent
	}
}

// snippetText is the CLAUDE.md snippet shown after init.
const snippetText = `## Ticks

This project uses ` + "`tk`" + ` for issue tracking. Use ticks for work that spans sessions, has dependencies, or is discovered during other work. Use TodoWrite for simple single-session tasks.

**Essential commands:**
` + "```" + `
tk next                  # next ready tick
tk next EPIC_ID          # next ready tick in epic
tk create "title"        # create issue
tk update ID --status in_progress
tk note ID "message"     # log progress
tk close ID              # mark done
` + "```" + `

**Dependencies & epics:**
` + "```" + `
tk next --epic           # next ready epic
tk block ID BLOCKER_ID   # ID is blocked by BLOCKER_ID
tk create "task" --parent EPIC_ID
tk update ID --parent EPIC_ID  # move to epic
` + "```" + `

**Agent-Human workflow:**
` + "```" + `
tk update ID --awaiting approval   # hand off to human
tk update ID --awaiting=           # return to agent queue
` + "```" + `

Awaiting states: work, approval, input, review, content, escalation, checkpoint.
Use ` + "`--requires approval`" + ` at creation for tasks needing sign-off before close.

Commands show your ticks by default. Use ` + "`--all`" + ` to see everyone's (e.g. ` + "`tk next --all`" + `).

All commands support ` + "`--help`" + ` for options.
`
