package cmd

import (
	"path/filepath"

	"github.com/pengelbrecht/ticks/internal/skills"
)

// skillsConventionsDesc names the two harness-skill directory conventions
// install/diff detect at a repo root when no explicit --dir is given.
const skillsConventionsDesc = ".claude/skills/ or .agents/skills/ (or both)"

// resolveSkillsTargets resolves the install/diff target directories for a
// skill: dirFlag verbatim if given (bypassing detection entirely, as
// before), or one target per convention directory skills.DetectConventionDirs
// finds at the repo root, each joined with name. It never creates a
// convention directory the repo has not already opted into; a repo with
// neither convention is an error (exit 1) naming both conventions and the
// --dir escape, and a working directory outside any git repo is ExitNoRepo
// (3) like every other command's no-repo failure.
func resolveSkillsTargets(name, dirFlag string) ([]string, error) {
	if dirFlag != "" {
		return []string{dirFlag}, nil
	}

	root, err := repoRoot()
	if err != nil {
		// Exit 3, not 1: "no repo" is the same condition every other command
		// reports as ExitNoRepo, and it is the one an orchestrator can fix
		// (chdir, or pass --dir). A missing convention directory below is a
		// different failure and keeps its own code.
		return nil, NewExitError(ExitNoRepo,
			"not inside a git repository; run this command inside a repo with %s at its root, or pass --dir",
			skillsConventionsDesc)
	}

	convDirs, err := skills.DetectConventionDirs(root)
	if err != nil {
		return nil, NewExitError(ExitGeneric, "%v", err)
	}
	if len(convDirs) == 0 {
		return nil, NewExitError(ExitGeneric,
			"no skills convention directory found at %s (looked for %s); create one of them, or pass --dir",
			root, skillsConventionsDesc)
	}

	targets := make([]string, len(convDirs))
	for i, d := range convDirs {
		targets[i] = filepath.Join(d, name)
	}
	return targets, nil
}
