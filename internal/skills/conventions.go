package skills

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// ConventionSubdirs are the skill-directory conventions tk detects at a repo
// root when no explicit install/diff target is given: .claude/skills
// (Claude Code) and .agents/skills (the emerging cross-harness convention).
// Together they cover ~99% of the harnesses tk targets, which is why
// detection replaces an explicit target-scope flag. Order is stable so
// multi-target install/diff output is deterministic.
var ConventionSubdirs = []string{".claude/skills", ".agents/skills"}

// DetectConventionDirs reports which of ConventionSubdirs exist as
// directories directly under root, as absolute paths, preserving
// ConventionSubdirs order. It only reads — it never creates a convention
// directory the repo has not already opted into.
func DetectConventionDirs(root string) ([]string, error) {
	var found []string
	for _, sub := range ConventionSubdirs {
		p := filepath.Join(root, filepath.FromSlash(sub))
		info, err := os.Stat(p)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return nil, fmt.Errorf("stat %s: %w", p, err)
		}
		if info.IsDir() {
			found = append(found, p)
		}
	}
	return found, nil
}
