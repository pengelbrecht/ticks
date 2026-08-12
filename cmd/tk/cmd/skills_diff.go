package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/skills"
)

var skillsDiffDir string

var skillsDiffCmd = &cobra.Command{
	Use:   "diff <name>",
	Short: "Compare an installed skill directory against the embedded bundle",
	Long: `Compare an installed skill directory against the embedded bundle.

Without --dir, compares the conventional Claude Code location,
~/.claude/skills/<name>. Reports files added on disk (not in the bundle),
removed (in the bundle but missing on disk), and changed (present in both
with different bytes), plus the target's stamped tk version against this
binary's version.

Exit codes
  0  the installed directory matches the embedded bundle exactly, including
     the stamped tk version
  1  drift: files differ, or the stamped version does not match this binary
  2  usage error
  4  no such skill is embedded in this binary`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runSkillsDiff,
}

func init() {
	skillsDiffCmd.Flags().StringVar(&skillsDiffDir, "dir", "",
		"installed directory to compare (default: ~/.claude/skills/<name>)")
	skillsCmd.AddCommand(skillsDiffCmd)
}

func runSkillsDiff(cmd *cobra.Command, args []string) error {
	name := args[0]

	if _, err := skills.Paths(name); err != nil {
		return NewExitError(ExitNotFound, "%v", err)
	}

	dir := skillsDiffDir
	if dir == "" {
		d, err := skills.DefaultDir(name)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		dir = d
	}

	diff, err := skills.DiffDir(name, dir)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	fmt.Fprintln(os.Stdout, diff.String())
	if !diff.OK() {
		return NewExitError(ExitGeneric, "drift detected")
	}
	return nil
}
