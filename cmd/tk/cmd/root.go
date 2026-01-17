package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// Version is set at build time via ldflags
var Version = "dev"

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "tk",
	Short: "Multiplayer issue tracker for AI agents",
	Long: `tk is a multiplayer issue tracker designed for AI agents.

It stores issues as JSON files in .tick/issues/ for easy version control
and conflict-free merging across branches.

Agent-Human Workflow:
  tk approve <id>              Set verdict=approved on awaiting tick
  tk reject <id> [feedback]    Set verdict=rejected with optional note
  tk next --awaiting=          Get next task awaiting human (human mode)
  tk list --awaiting=          List all tasks awaiting human action
  tk note <id> "msg" --from human  Add human feedback note

Workflow Flags:
  --requires value    Pre-declared approval gate (approval|review|content)
                      Tick routes to human even if agent signals COMPLETE
  --awaiting value    Wait state (work|approval|input|review|content|escalation|checkpoint)
                      Tick assigned to human, skipped by agent

Human-Only Tasks (awaiting=work):
  Use --awaiting work to mark tasks requiring human work (not AI agent work).
  These tasks are skipped by 'tk next' and 'tk ready' (agent queues).

  Examples:
    tk create "Set up AWS credentials" --awaiting work
    tk update abc --awaiting work       # Convert existing task
    tk update abc --awaiting ""         # Return to agent queue
    tk list --awaiting work             # List human-only tasks`,
	Version: Version,
	// Run is intentionally not set - this allows subcommands or help to be shown
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// ExecuteArgs runs the command with specific args, returning an error if the command fails.
// This is used when we need to pass args from the legacy run() function.
func ExecuteArgs(args []string) error {
	rootCmd.SetArgs(args)
	return rootCmd.Execute()
}

// SetVersion allows main.go to set the version at initialization
func SetVersion(v string) {
	Version = v
	rootCmd.Version = v
}

func init() {
	// Global flags can be added here in the future
	// For example:
	// rootCmd.PersistentFlags().BoolP("json", "j", false, "Output as JSON")

	// Disable the default completion command (can be re-enabled later if needed)
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}
