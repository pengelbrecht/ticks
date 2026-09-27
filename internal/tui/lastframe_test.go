package tui

import "testing"

// TestLastFrameSplitsOnSingleLineCursorUp pins the frame splitter against the
// one-line repaint: ansi.CursorUp(1) is "\x1b[A" with no count, and bubbletea
// emits it after the two-line "Loading...\n" frame. Missing it let "Loading..."
// leak into goldens whenever the window size arrived after the first render.
func TestLastFrameSplitsOnSingleLineCursorUp(t *testing.T) {
	raw := "Loading...\n\x1b[Aframe line 1\nframe line 2"
	if got, want := lastFrame([]byte(raw)), "frame line 1\nframe line 2"; got != want {
		t.Errorf("lastFrame: got %q, want %q", got, want)
	}
}
