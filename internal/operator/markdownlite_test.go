package operator

import "testing"

// TestStripMarkdownLite pins the plain-text fallback: the markers of the five
// subset elements come off, everything outside the subset survives literally,
// and a link keeps its target because a url is content, not markup.
func TestStripMarkdownLite(t *testing.T) {
	for _, tc := range []struct {
		name string
		src  string
		want string
	}{
		{"plain text is untouched", "nothing to strip here", "nothing to strip here"},
		{"bold", "ship **abc123** now", "ship abc123 now"},
		{"italic", "ship _abc123_ now", "ship abc123 now"},
		{"inline code", "run `tk close abc123`", "run tk close abc123"},
		{"code block", "before ```go\nx := 1\n``` after", "before go\nx := 1\n after"},
		{"link keeps its target", "see [the board](https://x.test/b)", "see the board (https://x.test/b)"},
		{"link whose label is the url", "[https://x.test](https://x.test)", "https://x.test"},
		{"several elements", "**a** and _b_ and `c`", "a and b and c"},
		{"unclosed marker is literal", "**oops", "**oops"},
		{"empty pair is literal", "a ** b", "a ** b"},
		{"outside the subset stays literal", "# Heading\n- item\n~~gone~~", "# Heading\n- item\n~~gone~~"},
		{"image is not a link", "![alt](https://x.test/i.png)", "![alt](https://x.test/i.png)"},
		{"no escaping happens", "5 < 7 & **8 > 3**", "5 < 7 & 8 > 3"},
		{"empty input", "", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := StripMarkdownLite(tc.src); got != tc.want {
				t.Errorf("StripMarkdownLite(%q) = %q, want %q", tc.src, got, tc.want)
			}
		})
	}
}

// TestStripMarkdownLiteIsIdempotentOnStrippedText guards the fallback path: a
// message that carried no markup to begin with must come out byte-identical, so
// routing a plain announcement through the strip is never lossy.
func TestStripMarkdownLiteIsIdempotentOnStrippedText(t *testing.T) {
	src := "deploy finished: 3 ticks closed, 1 blocked (see run 42)"
	once := StripMarkdownLite(src)
	if once != src {
		t.Fatalf("StripMarkdownLite changed markup-free text: %q", once)
	}
	if twice := StripMarkdownLite(once); twice != once {
		t.Errorf("StripMarkdownLite is not idempotent: %q then %q", once, twice)
	}
}
