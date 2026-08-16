package operator

import "strings"

// mdCodeFence opens and closes a [FormatMarkdownLite] code block.
const mdCodeFence = "```"

// StripMarkdownLite removes [FormatMarkdownLite] markup, leaving the text the
// markup was wrapped around.
//
// It exists for the capability fallback: a caller that authored markup finds a
// channel that cannot render it ([SupportsFormatted] reports false) and sends
// the message through [Channel.Send] instead. Passing the markup through raw
// would show the operator asterisks and backticks; dropping the message would
// lose it. Stripping keeps what was said.
//
// The rules are exactly the renderer's, so what a transport WOULD have rendered
// is what comes off here:
//
//   - The subset is bold, italic, inline code, code block and link, and nothing
//     else. Headings, lists, tables and strikethrough are not markup, so their
//     characters survive.
//   - An unclosed or empty marker is literal ("**oops" is text), because it is
//     literal when rendered too.
//   - A link keeps its target — "[label](url)" becomes "label (url)" — since the
//     url is content the operator cannot recover once it is gone. A label that
//     already is the url is not repeated.
//   - Nothing is escaped. The result is plain text for [Channel.Send], which
//     escapes per transport itself.
func StripMarkdownLite(src string) string {
	var b strings.Builder
	plain := 0
	for i := 0; i < len(src); {
		stripped, width, ok := stripElement(src, i)
		if !ok {
			i++
			continue
		}
		if i > plain {
			b.WriteString(src[plain:i])
		}
		b.WriteString(stripped)
		i += width
		plain = i
	}
	if plain < len(src) {
		b.WriteString(src[plain:])
	}
	return b.String()
}

// stripElement strips the subset element starting at src[i], reporting how many
// bytes it consumed. It reports false when no element starts there, which leaves
// the byte to be copied literally.
func stripElement(src string, i int) (stripped string, width int, ok bool) {
	rest := src[i:]
	switch {
	case strings.HasPrefix(rest, mdCodeFence):
		if inner, n, matched := mdDelimited(rest, mdCodeFence); matched {
			return inner, n, true
		}
	case rest[0] == '`':
		if inner, n, matched := mdDelimited(rest, "`"); matched {
			return inner, n, true
		}
	case strings.HasPrefix(rest, "**"):
		if inner, n, matched := mdDelimited(rest, "**"); matched {
			return inner, n, true
		}
	case rest[0] == '_':
		if inner, n, matched := mdDelimited(rest, "_"); matched {
			return inner, n, true
		}
	case rest[0] == '[':
		// "![alt](url)" is an image, outside the subset and literal when
		// rendered, so it stays literal here too.
		if i > 0 && src[i-1] == '!' {
			return "", 0, false
		}
		return stripLink(rest)
	}
	return "", 0, false
}

// mdDelimited matches marker…marker at the start of s and returns the text
// between them plus the total width. Empty content does not match — a bare pair
// of markers is literal — and neither does a missing closing marker.
func mdDelimited(s, marker string) (inner string, width int, ok bool) {
	body := s[len(marker):]
	end := strings.Index(body, marker)
	if end <= 0 {
		return "", 0, false
	}
	return body[:end], 2*len(marker) + end, true
}

// stripLink matches "[label](url)" at the start of s, keeping both halves.
func stripLink(s string) (stripped string, width int, ok bool) {
	label := strings.Index(s, "]")
	if label <= 1 || label+1 >= len(s) || s[label+1] != '(' {
		return "", 0, false
	}
	target := strings.Index(s[label+2:], ")")
	if target <= 0 {
		return "", 0, false
	}
	end := label + 2 + target
	text, url := s[1:label], s[label+2:end]
	if url == text {
		return text, end + 1, true
	}
	return text + " (" + url + ")", end + 1, true
}
