//go:build !windows

package agent

import (
	"os"
	"os/exec"
	"syscall"
)

// setProcessGroup puts the child in a new process group so the entire tree
// (npm + node children) can be signaled at once on Close().
func setProcessGroup(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// killProcessGroup force-kills the process group led by proc, addressed via
// the negative PID.
func killProcessGroup(proc *os.Process) {
	_ = syscall.Kill(-proc.Pid, syscall.SIGKILL)
}
