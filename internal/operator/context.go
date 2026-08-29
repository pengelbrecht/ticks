package operator

import "strings"

// The pieces of the project/epic/tick line, named so the parity test can pin
// them against contracts/message-context.json rather than
// only comparing whole lines.
const (
	messageContextSeparator  = " · "
	messageContextEpicPrefix = "epic "
	messageContextTickPrefix = "tick "
)

// MessageContext is which project, epic and tick a message is about.
//
// It exists because ONE bot and ONE chat now serve MANY projects — one factory
// does — and machine routing being unambiguous is not the same thing as a human
// being able to read the chat. The RunRoom is per project, question ids are
// unique by registration and callback data carries the question id, so a press
// has always landed on the right question; what was missing is that nothing put
// the project into the message TEXT, so two repositories asking the same
// question produced two indistinguishable messages.
//
// Every gate message, report and completion is composed through [Prefix], so
// the answer to "which repo is this about?" is in the message itself rather
// than in the reader's memory of which run they started last.
//
// The zero value is a legitimate value: a context nothing is known about
// composes no prefix at all, never an empty frame.
type MessageContext struct {
	// Project is the canonical owner/repo pair.
	Project string `json:"project,omitempty"`
	// Epic is the epic tick id a run is working through, when there is one.
	Epic string `json:"epic,omitempty"`
	// Tick is the tick the message is about, when there is one.
	Tick string `json:"tick,omitempty"`
}

// IsZero reports whether the context names nothing.
func (c MessageContext) IsZero() bool { return c.Line() == "" }

// Line renders the context as one plain-text line: "acme/web · epic 4f2 · tick
// 8sm". Fields are trimmed, and an empty one is omitted rather than rendered as
// an empty slot.
//
// It is PLAIN TEXT, like everything else crossing [Channel.Send]: transports
// escape it and may wrap it in their own emphasis, but they do not re-derive
// it. The exact string is pinned by
// contracts/message-context.json, because the Worker composes
// the same line for the same chat.
func (c MessageContext) Line() string {
	parts := make([]string, 0, 3)
	if project := strings.TrimSpace(c.Project); project != "" {
		parts = append(parts, project)
	}
	if epic := strings.TrimSpace(c.Epic); epic != "" {
		parts = append(parts, messageContextEpicPrefix+epic)
	}
	if tick := strings.TrimSpace(c.Tick); tick != "" {
		parts = append(parts, messageContextTickPrefix+tick)
	}
	return strings.Join(parts, messageContextSeparator)
}

// Prefix puts the context line above body, separated by one newline.
//
// A context that names nothing returns body unchanged: a message with no
// project to name reads better without a blank header than with one.
func (c MessageContext) Prefix(body string) string {
	line := c.Line()
	if line == "" {
		return body
	}
	if body == "" {
		return line
	}
	return line + "\n" + body
}
