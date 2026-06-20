package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

// TestOverlayPreservesLeftRight checks that overlay draws fg at (x, y) while
// keeping the bg content to the left and right of the fg block intact, and
// leaves rows outside the fg block untouched.
func TestOverlayPreservesLeftRight(t *testing.T) {
	bg := strings.Join([]string{
		"0123456789",
		"abcdefghij",
		"ABCDEFGHIJ",
	}, "\n")
	fg := "XX\nYY"

	got := overlay(bg, fg, 3, 1)
	want := strings.Join([]string{
		"0123456789", // untouched (above fg block)
		"abcXXfghij", // bg left "abc" + "XX" + bg right "fghij"
		"ABCYYFGHIJ", // bg left "ABC" + "YY" + bg right "FGHIJ"
	}, "\n")
	if got != want {
		t.Fatalf("overlay mismatch:\n got: %q\nwant: %q", got, want)
	}
}

// TestOverlayPreservesDimensions checks that overlaying a small block onto a
// larger canvas keeps the exact line count and per-line visible width.
func TestOverlayPreservesDimensions(t *testing.T) {
	const w, h = 40, 10
	var rows []string
	for i := 0; i < h; i++ {
		rows = append(rows, strings.Repeat(".", w))
	}
	bg := strings.Join(rows, "\n")

	box := strings.Join([]string{
		strings.Repeat("#", 8),
		strings.Repeat("#", 8),
		strings.Repeat("#", 8),
	}, "\n")

	got := overlay(bg, box, 5, 2)
	lines := strings.Split(got, "\n")
	if len(lines) != h {
		t.Fatalf("line count = %d, want %d", len(lines), h)
	}
	for i, ln := range lines {
		if wv := ansi.StringWidth(ln); wv != w {
			t.Errorf("line %d width = %d, want %d", i, wv, w)
		}
	}
}

// TestOverlayANSIAwareSlicing checks that overlay slices a bg line carrying ANSI
// color escapes by VISIBLE columns (not byte offsets), so escapes are not split
// and the visible width stays correct.
func TestOverlayANSIAwareSlicing(t *testing.T) {
	// A 10-column wide colored bg line ("0123456789" wrapped in red SGR).
	colored := "\x1b[31m" + "0123456789" + "\x1b[0m"
	bg := colored
	if ansi.StringWidth(bg) != 10 {
		t.Fatalf("precondition: colored width = %d, want 10", ansi.StringWidth(bg))
	}

	got := overlay(bg, "XX", 4, 0)
	if w := ansi.StringWidth(got); w != 10 {
		t.Fatalf("result width = %d, want 10 (slicing must be column-correct)", w)
	}
	// Visible-only content: stripping escapes should show the box covering cols 4-5.
	if plain := ansi.Strip(got); plain != "0123XX6789" {
		t.Fatalf("visible content = %q, want %q", plain, "0123XX6789")
	}
}
