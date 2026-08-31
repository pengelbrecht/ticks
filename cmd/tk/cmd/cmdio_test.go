package cmd

import (
	"bytes"
	"strings"
	"sync"
	"testing"
)

// syncBuffer is an io.Writer a test goroutine may read while the command under
// test writes to it.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// captureChannelIO redirects the command's output to a synchronized buffer and
// its input to stdin, so a test never blocks on the real terminal.
func captureChannelIO(t *testing.T, stdin string) *syncBuffer {
	t.Helper()
	buf := &syncBuffer{}
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)
	rootCmd.SetIn(strings.NewReader(stdin))
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
		rootCmd.SetIn(nil)
	})
	return buf
}

// channelTestHome points TK_HOME at an empty temp directory, isolating a test
// from anything a real ~/.tick would otherwise carry, and returns that
// directory.
func channelTestHome(t *testing.T) string {
	t.Helper()
	home := t.TempDir()
	t.Setenv("TK_HOME", home)
	return home
}
