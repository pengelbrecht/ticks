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
	Short: "Compare installed skill directories against the embedded bundle",
	Long: `Compare installed skill directories against the embedded bundle.

Without --dir, tk detects skill directory conventions at the repo root:
.claude/skills/ and .agents/skills/. It diffs every one that exists, one
report each. Neither existing is an error: create one of them at the repo
root, or pass --dir to compare elsewhere (e.g. the user-level
~/.claude/skills/<name>).

Each report lists files added on disk (not in the bundle), removed (in the
bundle but missing on disk), and changed (present in both with different
bytes), plus that target's stamped tk version against this binary's
version.

Exit codes
  0  every detected (or given) target matches the embedded bundle exactly,
     including the stamped tk version
  1  drift in any target: files differ, a stamped version doesn't match
     this binary, or (with no --dir) neither convention directory exists at
     the repo root
  2  usage error
  4  no such skill is embedded in this binary`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runSkillsDiff,
}

func init() {
	skillsDiffCmd.Flags().StringVar(&skillsDiffDir, "dir", "",
		"installed directory to compare (default: detect .claude/skills/, .agents/skills/ at the repo root)")
	skillsCmd.AddCommand(skillsDiffCmd)
}

func runSkillsDiff(cmd *cobra.Command, args []string) error {
	name := args[0]

	if _, err := skills.Paths(name); err != nil {
		return NewExitError(ExitNotFound, "%v", err)
	}

	targets, err := resolveSkillsTargets(name, skillsDiffDir)
	if err != nil {
		return err
	}

	multi := len(targets) > 1
	drift := false
	for _, dir := range targets {
		diff, err := skills.DiffDir(name, dir)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		if multi {
			fmt.Fprintf(os.Stdout, "%s:\n%s\n", dir, diff.String())
		} else {
			fmt.Fprintln(os.Stdout, diff.String())
		}
		if !diff.OK() {
			drift = true
		}
	}
	if drift {
		return NewExitError(ExitGeneric, "drift detected")
	}
	return nil
}
