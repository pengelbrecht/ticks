// Package operator defines the channel-neutral contract for reaching the human
// operator who launched an autonomous run: send them text, ask them a question,
// stream their replies back, and mark a question resolved once the run has acted
// on the answer.
//
// Nothing in this package knows about a specific messaging provider. Concrete
// transports (Telegram today, others later) live in subpackages and implement
// [Channel]; [FakeChannel] is the in-memory double used by tests.
package operator

import "context"

// Channel is the operator-facing transport. It is deliberately sized to the two
// interactions a run needs: tell (Send) and ask (AskDeliver + Events + Resolve).
//
// Implementations must be safe for concurrent use.
type Channel interface {
	// Send delivers a one-way message to the operator. No reply is expected.
	Send(text string) error

	// AskDeliver posts a question and returns a reference to the delivered
	// message so it can later be resolved (edited) once an answer is in.
	AskDeliver(q Question) (MessageRef, error)

	// Events streams operator activity — free-text answers, option presses and
	// multi-select commits — until ctx is cancelled, at which point the
	// implementation closes the returned channel.
	Events(ctx context.Context) <-chan Event

	// Resolve records the final outcome of a previously delivered question on
	// the transport: typically editing the message to show what was decided and
	// removing any interactive controls so it cannot be answered twice.
	Resolve(ref MessageRef, outcome Outcome) error
}

// MessageRef identifies a message that a channel has delivered. Both fields are
// opaque, provider-defined strings (for Telegram: chat id and message id).
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
	// tick, an approval gate). Channels pass it through untouched.
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
	// Event.OptionIDs and Outcome.OptionIDs. Keep it short: transports may
	// have tight limits on identifiers carried in interactive controls
	// (Telegram callback data is capped at 64 bytes).
	ID string `json:"id"`
	// Label is the option text shown to the operator.
	Label string `json:"label"`
	// Description explains the option. Optional.
	Description string `json:"description,omitempty"`
}

// EventKind classifies an operator event.
type EventKind string

const (
	// EventAnswer is free text the operator typed — either a reply to a
	// question or, when Ref is zero, an unsolicited message.
	EventAnswer EventKind = "answer"
	// EventOptionPress is a single option chosen on a non-multi-select
	// question.
	EventOptionPress EventKind = "option_press"
	// EventMultiSelectCommit is a multi-select question committed with the
	// options selected at that moment (possibly none).
	EventMultiSelectCommit EventKind = "multi_select_commit"
)

// Event is something the operator did on the channel.
type Event struct {
	// Kind classifies the event.
	Kind EventKind `json:"kind"`
	// Ref is the question message this event answers. Zero when the operator
	// sent something unprompted.
	Ref MessageRef `json:"ref,omitempty"`
	// Text carries the operator's free text for EventAnswer.
	Text string `json:"text,omitempty"`
	// OptionIDs are the [Option.ID] values pressed or selected.
	OptionIDs []string `json:"option_ids,omitempty"`
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

// Outcome is the resolution a channel renders back onto a delivered question.
type Outcome struct {
	// Status says how the question ended.
	Status OutcomeStatus `json:"status"`
	// Text is a human-readable summary of the resolution, shown in place of
	// the interactive controls.
	Text string `json:"text,omitempty"`
	// OptionIDs are the chosen options, if any.
	OptionIDs []string `json:"option_ids,omitempty"`
}
