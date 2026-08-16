package telegram

import (
	"html"
	"strings"
)

// codeFence opens and closes a MarkdownLite code block.
const codeFence = "```"

// markdownLiteToHTML renders [operator.FormatMarkdownLite] as the HTML this
// transport sends (parse_mode=HTML).
//
// The subset is exactly bold, italic, inline code, code block and link — the
// mapping table on operator.FormatMarkdownLite is the spec. Two rules follow
// from it and are what this function is careful about:
//
//   - Everything that is not a rendered element is escaped, so an operator sees
//     the characters the caller wrote and the Bot API's HTML parser never
//     chokes on a stray angle bracket. That includes the text inside an element:
//     a branch name interpolated into **…** is escaped before it is bolded.
//   - Anything outside the subset — headings, lists, images, strikethrough,
//     nested emphasis — is not markup here, so it renders literally rather than
//     being guessed at. Unclosed or empty markers are literal for the same
//     reason: "**oops" is text.
func markdownLiteToHTML(src string) string {
	var b strings.Builder
	plain := 0
	for i := 0; i < len(src); {
		rendered, width, ok := renderElement(src, i)
		if !ok {
			i++
			continue
		}
		if i > plain {
			b.WriteString(html.EscapeString(src[plain:i]))
		}
		b.WriteString(rendered)
		i += width
		plain = i
	}
	if plain < len(src) {
		b.WriteString(html.EscapeString(src[plain:]))
	}
	return b.String()
}

// renderElement renders the subset element starting at src[i], reporting how
// many bytes it consumed. It reports false when no element starts there, which
// leaves the byte to be escaped as plain text.
func renderElement(src string, i int) (rendered string, width int, ok bool) {
	rest := src[i:]
	switch {
	case strings.HasPrefix(rest, codeFence):
		if inner, n, matched := delimited(rest, codeFence); matched {
			return "<pre>" + html.EscapeString(inner) + "</pre>", n, true
		}
	case rest[0] == '`':
		if inner, n, matched := delimited(rest, "`"); matched {
			return "<code>" + html.EscapeString(inner) + "</code>", n, true
		}
	case strings.HasPrefix(rest, "**"):
		if inner, n, matched := delimited(rest, "**"); matched {
			return "<b>" + html.EscapeString(inner) + "</b>", n, true
		}
	case rest[0] == '_':
		if inner, n, matched := delimited(rest, "_"); matched {
			return "<i>" + html.EscapeString(inner) + "</i>", n, true
		}
	case rest[0] == '[':
		// "![alt](url)" is an image, which is outside the subset: rendering its
		// link half would turn a picture the caller asked for into a stray "!"
		// and a hyperlink, so the whole thing stays literal.
		if i > 0 && src[i-1] == '!' {
			return "", 0, false
		}
		return renderLink(rest)
	}
	return "", 0, false
}

// delimited matches marker…marker at the start of s and returns the text
// between them plus the total width. Empty content does not match — a bare pair
// of markers is literal — and neither does a missing closing marker.
func delimited(s, marker string) (inner string, width int, ok bool) {
	body := s[len(marker):]
	end := strings.Index(body, marker)
	if end <= 0 {
		return "", 0, false
	}
	return body[:end], 2*len(marker) + end, true
}

// renderLink matches "[label](url)" at the start of s. The url is escaped as an
// attribute value, so a quote in it cannot break out of the href.
func renderLink(s string) (rendered string, width int, ok bool) {
	label := strings.Index(s, "]")
	if label <= 1 || label+1 >= len(s) || s[label+1] != '(' {
		return "", 0, false
	}
	target := strings.Index(s[label+2:], ")")
	if target <= 0 {
		return "", 0, false
	}
	end := label + 2 + target
	return `<a href="` + html.EscapeString(s[label+2:end]) + `">` + html.EscapeString(s[1:label]) + "</a>", end + 1, true
}
