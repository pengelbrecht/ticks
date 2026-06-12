package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var snippetCmd = &cobra.Command{
	Use:   "snippet",
	Short: "Print agent-instructions snippet for AI context",
	Long:  `Print a runner-neutral markdown snippet suitable for AGENTS.md, CLAUDE.md, or another AI agent instruction file.`,
	Args:  cobra.NoArgs,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Print(snippetText)
	},
}

func init() {
	rootCmd.AddCommand(snippetCmd)
}
