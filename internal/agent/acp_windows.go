//go:build windows

package agent

import (
	"os"
	"os/exec"
)

// setProcessGroup is a no-op on Windows: process-group semantics differ, and
// killProcessGroup falls back to terminating the single process.
func setProcessGroup(cmd *exec.Cmd) {}

// killProcessGroup force-kills the process on Windows. Child processes are not
// reaped through a group here, mirroring the limited cleanup available without
// a job object.
func killProcessGroup(proc *os.Process) {
	_ = proc.Kill()
}
