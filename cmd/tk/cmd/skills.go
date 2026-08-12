package cmd

import (
	"github.com/spf13/cobra"
)

// skillsCmd is the parent of the skills inspection subcommands: tk serves
// the same skills/ tree it ships in the repo, straight from the embedded
// bundle in internal/skills, so an agent can read them without a network
// fetch or a separate install step.
var skillsCmd = &cobra.Command{
	Use:   "skills",
	Short: "Inspect the skill bundle embedded in this tk binary",
	Long: `Inspect the skill bundle embedded in this tk binary.

The bundle is version-matched to this tk build: 'tk skills list' reports the
tk version each skill ships with, and 'tk skills get <name>' prints a
skill's SKILL.md (or, with --full, the whole bundle) straight from the
binary.`,
}

func init() {
	rootCmd.AddCommand(skillsCmd)
}
