package cmd

import (
	"errors"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/skills"
)

var (
	skillsInstallDir   string
	skillsInstallForce bool
)

var skillsInstallCmd = &cobra.Command{
	Use:   "install <name>",
	Short: "Install a skill from the embedded bundle to disk",
	Long: `Install a skill from the embedded bundle to disk.

Without --dir, installs to the conventional Claude Code location,
~/.claude/skills/<name>. Pass --dir to install elsewhere, e.g. for another
agent harness.

Install writes a stamp file (.tk-skills-version) at the root of the
installed directory, recording the tk version and install time.
Re-installing over an already-stamped directory is the normal upgrade path:
the old tree is replaced. Install refuses a target directory that already
has other content and no stamp — it may be hand-edited, or belong to
something else entirely — unless --force is given.

The swap is atomic-ish: the new tree is written to a temp directory
alongside the target, then the old target (if any) is removed and the temp
directory renamed into place. Nothing from the old tree carries over.

Exit codes
  0  installed
  2  usage error, or the target exists and is not tk-managed (pass --force
     or remove it first)
  4  no such skill is embedded in this binary`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runSkillsInstall,
}

func init() {
	skillsInstallCmd.Flags().StringVar(&skillsInstallDir, "dir", "",
		"install target directory (default: ~/.claude/skills/<name>)")
	skillsInstallCmd.Flags().BoolVar(&skillsInstallForce, "force", false,
		"overwrite a target directory even if it has no tk stamp")
	skillsCmd.AddCommand(skillsInstallCmd)
}

func runSkillsInstall(cmd *cobra.Command, args []string) error {
	name := args[0]

	if _, err := skills.Paths(name); err != nil {
		return NewExitError(ExitNotFound, "%v", err)
	}

	dir := skillsInstallDir
	if dir == "" {
		d, err := skills.DefaultDir(name)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		dir = d
	}

	stamp, err := skills.Install(name, dir, skillsInstallForce)
	if err != nil {
		if errors.Is(err, skills.ErrUnmanaged) {
			return NewExitError(ExitUsage, "%v (pass --force to overwrite)", err)
		}
		return NewExitError(ExitGeneric, "%v", err)
	}

	fmt.Fprintf(os.Stdout, "installed %s %s to %s\n", name, stamp.Version, dir)
	return nil
}
