package tick

import (
	"bufio"
	"os"
	"path/filepath"
)

// LearningsCap is the maximum recommended line count for .tick/learnings.md.
const LearningsCap = 150

// CheckLearningsCap counts the lines in <tickDir>/learnings.md and reports
// whether the file exceeds LearningsCap.
//
// If the file does not exist, (0, false, nil) is returned.
// An empty file is treated as 0 lines (over = false).
// Lint errors (unexpected OS errors) are swallowed: (0, false, nil).
func CheckLearningsCap(tickDir string) (lines int, over bool, err error) {
	path := filepath.Join(tickDir, "learnings.md")

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, false, nil
		}
		// Swallow unexpected errors — lint must never block a command.
		return 0, false, nil
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	count := 0
	for scanner.Scan() {
		count++
	}
	if scanErr := scanner.Err(); scanErr != nil {
		// Swallow — lint must never fail a command.
		return 0, false, nil
	}

	return count, count > LearningsCap, nil
}
