package operator

// Package operator defines the durable question the operator surface asks:
// what was said, who may answer it, and how the answer is recorded. There is
// no transport abstraction here — a question is either parked on a tick and
// answered from the terminal (`tk answer`, `tk approve`, `tk reject`), or
// answered by whatever external system resolves the pending entry on disk.

// MessageRef identifies a message a delivery surface rendered a question as.
// Both fields are opaque, provider-defined strings. It is zero for a question
// that has never been rendered anywhere but the pending store.
type MessageRef struct {
	// ChannelID is the conversation the message lives in.
	ChannelID string `json:"channel_id,omitempty"`
	// MessageID is the provider's identifier for the message itself.
	MessageID string `json:"message_id,omitempty"`
}

// IsZero reports whether the ref is unset.
func (r MessageRef) IsZero() bool { return r == MessageRef{} }

// Question mirrors the semantics of an AskUserQuestion prompt: a question with
// a small set of labelled options, optionally multi-select, optionally allowing
// a free-text answer instead of an option.
type Question struct {
	// ID correlates the question with whatever the caller is waiting on (a
	// tick, an approval gate).
	ID string `json:"id,omitempty"`
	// Header is a short label for the question (e.g. "Deploy"). Optional.
	Header string `json:"header,omitempty"`
	// Text is the question itself.
	Text string `json:"text"`
	// Options are the offered answers, in display order. May be empty for a
	// pure free-text question.
	Options []Option `json:"options,omitempty"`
	// MultiSelect allows selecting several options before committing.
	MultiSelect bool `json:"multi_select,omitempty"`
	// AllowOther offers a free-text answer in addition to the options.
	AllowOther bool `json:"allow_other,omitempty"`
}

// Option is one offered answer.
type Option struct {
	// ID is a short, stable identifier for the option, echoed back in
	// Outcome.OptionIDs.
	ID string `json:"id"`
	// Label is the option text shown to the operator.
	Label string `json:"label"`
	// Description explains the option. Optional.
	Description string `json:"description,omitempty"`
}

// OutcomeStatus says how a question ended.
type OutcomeStatus string

const (
	// OutcomeAnswered means the operator answered.
	OutcomeAnswered OutcomeStatus = "answered"
	// OutcomeCancelled means the run withdrew the question.
	OutcomeCancelled OutcomeStatus = "cancelled"
	// OutcomeTimedOut means no answer arrived in time.
	OutcomeTimedOut OutcomeStatus = "timed_out"
)

// Outcome is the resolution recorded for a question.
type Outcome struct {
	// Status says how the question ended.
	Status OutcomeStatus `json:"status"`
	// Text is a human-readable summary of the resolution.
	Text string `json:"text,omitempty"`
	// OptionIDs are the chosen options, if any.
	OptionIDs []string `json:"option_ids,omitempty"`
}
