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

Without --dir, tk detects skill directory conventions at the repo root:
.claude/skills/ and .agents/skills/. It installs into every one that
exists, both if both do — each gets the full tree and its own stamp.
Neither existing is an error: create one of them at the repo root, or pass
--dir to install elsewhere (e.g. the user-level ~/.claude/skills/<name>).

Install writes a stamp file (.tk-skills-version) at the root of each
installed directory, recording the tk version and install time.
Re-installing over an already-stamped directory is the normal upgrade path:
the old tree is replaced. Install refuses a target directory that already
has other content and no stamp — it may be hand-edited, or belong to
something else entirely — unless --force is given; refusal and --force
apply independently to each detected target.

The swap is atomic-ish per target: the new tree is written to a temp
directory alongside the target, then the old target (if any) is removed
and the temp directory renamed into place. Nothing from the old tree
carries over.

Exit codes
  0  installed into every target
  1  no --dir and neither .claude/skills/ nor .agents/skills/ exists at the
     repo root; or a target failed for a reason other than being unmanaged
  2  usage error, or a target exists and is not tk-managed (pass --force or
     remove it first)
  3  no --dir and the working directory isn't inside a git repository
  4  no such skill is embedded in this binary`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runSkillsInstall,
}

func init() {
	skillsInstallCmd.Flags().StringVar(&skillsInstallDir, "dir", "",
		"install target directory (default: detect .claude/skills/, .agents/skills/ at the repo root)")
	skillsInstallCmd.Flags().BoolVar(&skillsInstallForce, "force", false,
		"overwrite a target directory even if it has no tk stamp")
	skillsCmd.AddCommand(skillsInstallCmd)
}

func runSkillsInstall(cmd *cobra.Command, args []string) error {
	name := args[0]

	if _, err := skills.Paths(name); err != nil {
		return NewExitError(ExitNotFound, "%v", err)
	}

	targets, err := resolveSkillsTargets(name, skillsInstallDir)
	if err != nil {
		return err
	}

	var failCount int
	var failCode int
	for _, dir := range targets {
		stamp, err := skills.Install(name, dir, skillsInstallForce)
		if err != nil {
			failCount++
			if errors.Is(err, skills.ErrUnmanaged) {
				fmt.Fprintf(os.Stdout, "refused %s: %v (pass --force to overwrite)\n", dir, err)
				if failCode == 0 {
					failCode = ExitUsage
				}
			} else {
				fmt.Fprintf(os.Stdout, "failed %s: %v\n", dir, err)
				failCode = ExitGeneric
			}
			continue
		}
		fmt.Fprintf(os.Stdout, "installed %s %s to %s\n", name, stamp.Version, dir)
	}
	if failCount > 0 {
		return NewExitError(failCode, "%d of %d skill install target(s) failed", failCount, len(targets))
	}
	return nil
}
