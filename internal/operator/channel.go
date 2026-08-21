// Package operator defines the channel-neutral contract for reaching the human
// operator who launched an autonomous run: send them text, ask them a question,
// stream their replies back, and mark a question resolved once the run has acted
// on the answer.
//
// Nothing in this package knows about a specific messaging provider. Concrete
// transports (Telegram today, others later) live in subpackages and implement
// [Channel]; [FakeChannel] is the in-memory double used by tests.
package operator

import (
	"context"
	"path/filepath"
	"strings"
)

// Channel is the operator-facing transport. It is deliberately sized to the two
// interactions a run needs: tell (Send) and ask (AskDeliver + Events + Resolve).
//
// Every method takes a context; implementations must honor its cancellation and
// deadline on the underlying I/O (HTTP requests, long polls) rather than
// checking it once and then blocking.
//
// Implementations must be safe for concurrent use.
type Channel interface {
	// Send delivers a one-way message to the operator. No reply is expected.
	//
	// text is PLAIN TEXT. Callers pass it through unmodified — including
	// anything interpolated into it, such as a branch name or an error
	// message — and never markup for a particular transport. An
	// implementation that renders markup (Telegram sends HTML) escapes the
	// text before it goes on the wire, so the operator reads what the caller
	// wrote.
	Send(ctx context.Context, text string) error

	// AskDeliver posts a question and returns a reference to the delivered
	// message so it can later be resolved (edited) once an answer is in.
	AskDeliver(ctx context.Context, q Question) (MessageRef, error)

	// Events streams operator activity — free-text answers, option presses and
	// multi-select commits — until ctx is cancelled, at which point the
	// implementation closes the returned channel.
	//
	// Transient transport errors (timeouts, 5xx, dropped connections) are
	// retried internally and are NOT surfaced here. A single [EventError] is
	// emitted only for a fatal channel failure — auth rejection, a revoked
	// bot, a permanently unusable configuration — after which the
	// implementation closes the stream. Consumers must treat an EventError as
	// "this channel is dead": stop expecting further events and fall back
	// (log, fail the gate, ask in-session) rather than retrying the stream.
	Events(ctx context.Context) <-chan Event

	// Resolve records the final outcome of a previously delivered question on
	// the transport: typically editing the message to show what was decided and
	// removing any interactive controls so it cannot be answered twice.
	Resolve(ctx context.Context, ref MessageRef, outcome Outcome) error
}

// Adopter is an optional [Channel] capability: taking ownership of a question
// this process never delivered.
//
// A transport that keeps per-question state in memory — Telegram holds the
// option labels and multi-select selection behind the buttons — cannot
// interpret a press on a message an earlier run posted. The durable pending
// store has both the ref and the question, so [Consumer.Deliver] hands them
// back through Adopt on every sweep, which is what makes `tk ask --async`
// followed by `tk ask --collect` in another process work at all.
//
// Adopt must be idempotent: it is called on every sweep for every delivered,
// unresolved question, and must not disturb state the transport already holds
// for that message. A transport that needs no local state does not implement
// it.
type Adopter interface {
	Adopt(ref MessageRef, q Question) error
}

// Format selects how a channel renders a [FormattedText].
//
// It is an open string enum on purpose: a transport switches on the formats it
// knows and rejects one it does not, so a later format can be introduced
// without invalidating implementations that predate it.
type Format string

// FormatMarkdownLite is the markup subset that every supported transport can
// render, chosen so one authored string means the same thing everywhere. It is
// deliberately small: an element is in the subset only if BOTH Telegram HTML and
// Slack Block Kit can express it without loss.
//
// The subset, element by element, and what each becomes on the wire:
//
//	element      MarkdownLite       Telegram HTML              Slack Block Kit (mrkdwn)
//	bold         **text**           <b>text</b>                *text*
//	italic       _text_             <i>text</i>                _text_
//	inline code  `text`             <code>text</code>          `text`
//	code block   ```text```         <pre>text</pre>            ```text```
//	link         [label](url)       <a href="url">label</a>    <url|label>
//
// The `_` italic rule has no word-boundary requirement, so snake_case
// identifiers in interpolated text get partially italicized (and Slack's
// mrkdwn, which does require boundaries, would render such input
// differently). Wrap identifiers in backticks rather than passing them bare.
//
// Nothing else is in the subset — headings, tables, images, blockquotes, lists,
// strikethrough and nested emphasis have no agreed equivalent, so a transport
// renders those characters literally rather than guessing at one. Text outside
// the markup is escaped per transport (HTML entities on Telegram), so the
// operator reads what the caller wrote.
const FormatMarkdownLite Format = "markdown_lite"

// FormattedText is a message the operator should see rendered.
type FormattedText struct {
	// Text is the message in Format's markup.
	Text string `json:"text"`
	// Format says how to interpret Text. Zero is not a format: a caller names
	// one (today [FormatMarkdownLite]) and a transport that does not know it
	// reports an error rather than sending the markup raw.
	Format Format `json:"format"`
}

// FormattedSender is an optional [Channel] capability: sending a message with
// markup rather than as plain text.
//
// It is separate from [Channel.Send] rather than an option on it because the two
// have different contracts. Send is PLAIN TEXT — callers pass interpolated
// values (branch names, error messages) through untouched and the transport
// escapes them — and that guarantee does not change. SendFormatted moves the
// escaping burden onto the caller for the markup it authors, which only code
// that knows it is writing markup should take on.
//
// A transport that cannot render markup simply does not implement this, and
// callers probe with [SupportsFormatted] and fall back to Send.
type FormattedSender interface {
	SendFormatted(ctx context.Context, msg FormattedText) error
}

// AttachmentKind says how a channel should present an attached file.
type AttachmentKind string

const (
	// KindAuto resolves the kind from the file extension (see
	// [Attachment.ResolvedKind]). It is the zero value, so an [Attachment] that
	// names only a path gets sensible handling.
	KindAuto AttachmentKind = ""
	// KindDocument sends the file as-is, with its name preserved.
	KindDocument AttachmentKind = "document"
	// KindPhoto sends the file as an inline image. Transports may re-encode or
	// downscale a photo, which is why it is never the fallback for a file whose
	// type is uncertain.
	KindPhoto AttachmentKind = "photo"
)

// Attachment is a local file to deliver to the operator.
type Attachment struct {
	// Path is the local file to upload. Channels read it at send time; nothing
	// in this package copies or retains it.
	Path string `json:"path"`
	// Caption is the text shown with the file. Plain text, escaped by the
	// transport exactly like [Channel.Send].
	Caption string `json:"caption,omitempty"`
	// Kind says how to present the file; zero ([KindAuto]) resolves by
	// extension.
	Kind AttachmentKind `json:"kind,omitempty"`
	// Gate asks the transport to put approve/reject controls ([GateOptions])
	// under the attachment, making it an approval gate the operator can settle
	// in place. A press arrives on [Channel.Events] as an [EventOptionPress]
	// carrying the returned [MessageRef], exactly as a press on a delivered
	// question does.
	Gate bool `json:"gate,omitempty"`
}

// ResolvedKind returns the kind to send this attachment as: the explicit Kind
// when set, otherwise one derived from the file extension.
//
// Only .png, .jpg and .jpeg auto-resolve to [KindPhoto]. The list is short by
// design — a photo send is a lossy, re-encoding path on real transports, and an
// animation or an unknown binary is better off arriving intact as a document —
// so anything else auto-resolves to [KindDocument]. A caller that knows better
// sets Kind explicitly.
func (a Attachment) ResolvedKind() AttachmentKind {
	if a.Kind == KindPhoto || a.Kind == KindDocument {
		return a.Kind
	}
	switch strings.ToLower(filepath.Ext(a.Path)) {
	case ".png", ".jpg", ".jpeg":
		return KindPhoto
	default:
		return KindDocument
	}
}

// AttachmentSender is an optional [Channel] capability: delivering a local file
// — a screenshot, a report, a log — to the operator.
//
// It returns the [MessageRef] the file landed as, which is what lets a gated
// attachment ([Attachment.Gate]) be treated exactly like a delivered question:
// the caller registers a pending gate against that ref
// ([Engine.RegisterDelivered]), and from there delivery, routing and resolution
// are the existing machinery. There is no attachment-flavoured AskDeliver on
// purpose — a photo gate is composed by the caller from a send plus a
// registration, so neither [Channel] nor the ask engine grows a second delivery
// path.
//
// A transport without file upload does not implement this, and callers probe
// with [SupportsAttachments].
type AttachmentSender interface {
	SendAttachment(ctx context.Context, a Attachment) (MessageRef, error)
}

// SupportsFormatted reports whether ch can render markup ([FormattedSender]).
// Callers that probe false send plain text through [Channel.Send] instead.
func SupportsFormatted(ch Channel) bool {
	_, ok := ch.(FormattedSender)
	return ok
}

// SupportsAttachments reports whether ch can upload files
// ([AttachmentSender]). Callers that probe false report the file's path in text
// rather than failing.
func SupportsAttachments(ch Channel) bool {
	_, ok := ch.(AttachmentSender)
	return ok
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
	// EventError is a fatal channel failure, carried in [Event.Err]. It is
	// the last event on the stream: the implementation closes the stream
	// after emitting it, and the consumer treats the channel as dead.
	// Transient errors never appear here — they are retried internally.
	EventError EventKind = "error"
)

// Event is something the operator did on the channel, or — for [EventError] —
// the channel giving up.
type Event struct {
	// Kind classifies the event.
	Kind EventKind `json:"kind"`
	// Ref is the question message this event answers. Zero when the operator
	// sent something unprompted.
	Ref MessageRef `json:"ref,omitempty"`
	// SenderID identifies the operator who produced this event, as the
	// transport reports it (a Telegram user id). It is the provenance a
	// resolution is stamped with: the transport already drops traffic from
	// anyone but the bound operator, so reading the id off the event says who
	// actually decided rather than restating who the run was configured for.
	// Empty when the transport does not report a sender.
	SenderID string `json:"sender_id,omitempty"`
	// AnsweredBy preserves provenance when a cloud transport relays a resolution
	// that the RunRoom already arbitrated. Empty means the local transport should
	// use its normal channel provenance.
	AnsweredBy AnsweredBy `json:"answered_by,omitempty"`
	// Text carries the operator's free text for EventAnswer.
	Text string `json:"text,omitempty"`
	// OptionIDs are the [Option.ID] values pressed or selected.
	OptionIDs []string `json:"option_ids,omitempty"`
	// Err is the fatal transport failure on an EventError, and nil on every
	// other kind. It does not serialize; log or wrap it instead.
	Err error `json:"-"`
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
