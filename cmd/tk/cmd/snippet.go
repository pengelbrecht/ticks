package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var snippetCmd = &cobra.Command{
	Use:   "snippet",
	Short: "Print CLAUDE.md snippet for AI context",
	Long:  `Print a markdown snippet suitable for including in CLAUDE.md to give AI agents context about using tk for issue tracking.`,
	Args:  cobra.NoArgs,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Print(snippetText)
	},
}

func init() {
	rootCmd.AddCommand(snippetCmd)
}
