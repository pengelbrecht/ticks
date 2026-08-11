// Package gitcmd is the one git runner the herd engines share.
//
// cleanup, collect and reconcile each need the same three-line shell-out:
// run git in a specific checkout, take its stdout, and turn a non-zero exit
// into an error that says what git itself said. Three private copies of that
// drifted — one returned untrimmed stdout and the bare `exit status 128`,
// which is the least useful thing an operator can be shown. This is the
// single definition; callers wrap it with their own package context.
package gitcmd

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

// Run executes one git command in repoRoot and returns its trimmed stdout.
//
// A non-zero exit yields an error carrying the command and git's own stderr
// (falling back to the exec error when git said nothing), so the message an
// operator reads is git's, not the runner's.
func Run(repoRoot string, args ...string) (string, error) {
	cmd := exec.Command("git", append([]string{"-C", repoRoot}, args...)...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}
