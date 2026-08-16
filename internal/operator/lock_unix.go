//go:build unix

package operator

import (
	"errors"
	"os"
	"syscall"
)

// tryLockFile takes an exclusive advisory lock without blocking. It reports
// false (and no error) when another open file description already holds it.
//
// flock locks belong to the open file description, not the process, so two
// separate opens exclude each other even inside one process — which is what
// makes the single-consumer rule testable without spawning a second binary.
func tryLockFile(file *os.File) (bool, error) {
	err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
	switch {
	case err == nil:
		return true, nil
	case errors.Is(err, syscall.EWOULDBLOCK), errors.Is(err, syscall.EAGAIN):
		return false, nil
	default:
		return false, err
	}
}

// unlockFile drops the advisory lock. Closing the file would drop it too; doing
// it explicitly keeps the handoff obvious at the call site.
func unlockFile(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
}
