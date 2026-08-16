package telegram

import (
	"context"
	"errors"
	"fmt"
	"html"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
)

// Callback data prefixes. Buttons carry a short local id — the prefix plus the
// option's index in the question — because [CallbackDataMaxBytes] is 64 and
// caller-supplied option ids have no such limit. Labels and real option ids stay
// in the Channel's pending-question state and never travel to Telegram.
const (
	cbSelect = "o" // single-select press: o<index>
	cbToggle = "t" // multi-select toggle: t<index>
	cbDone   = "d" // multi-select commit
	cbOther  = "x" // "Other…": switch to free text
)

const (
	selectedMark   = "☑"
	unselectedMark = "☐"
	doneLabel      = "Done"
	otherLabel     = "Other…"

	// otherPrompt is the force-reply message sent when the operator picks
	// "Other…" on an option question.
	otherPrompt = "Type your answer as a reply to this message."

	// freeTextHint tells the operator how a pure free-text question is answered.
	freeTextHint = "Reply to this message with your answer."

	// staleNote acknowledges a press on a question that is no longer pending.
	staleNote = "This question is already resolved."

	// DefaultPollTimeout is how long a poll waits for updates. Well under
	// Telegram's ceiling, and short enough that a cancelled run's poll loop
	// stops in bounded time.
	DefaultPollTimeout = 25 * time.Second

	// DefaultRetryBackoff is the first pause after a transient poll failure. It
	// doubles per consecutive failure, up to maxRetryBackoff.
	DefaultRetryBackoff = 2 * time.Second

	maxRetryBackoff = 30 * time.Second
)

// pendingQuestion is a delivered question the channel can still interpret
// presses for: it holds the labels, the real option ids, and the multi-select
// state that never leaves this process.
type pendingQuestion struct {
	question operator.Question
	// body is the rendered HTML of the question, reused when the message is
	// repainted or resolved.
	body string
	// selected marks chosen option indexes on a multi-select question.
	selected map[int]bool
}

// Channel is the Telegram implementation of [operator.Channel]: it delivers
// messages and questions to the paired chat, long-polls for the bound operator's
// replies, and edits a question in place once it is resolved.
//
// It is safe for concurrent use. Construct it with [NewChannel].
type Channel struct {
	// PollTimeout is the long-poll timeout; zero means [DefaultPollTimeout].
	// Set it before calling Events.
	PollTimeout time.Duration
	// RetryBackoff is the first pause after a transient poll failure; zero
	// means [DefaultRetryBackoff]. Set it before calling Events.
	RetryBackoff time.Duration

	client *Client
	chatID string
	// chatIDNum is chatID as a number, or 0 when the configured chat is not
	// numeric (an @channelusername). It is what incoming updates are matched
	// against; a zero value means the chat cannot be compared and updates are
	// let through on the sender check alone.
	chatIDNum int64

	mu      sync.Mutex
	pending map[int64]*pendingQuestion
	// prompts maps a force-reply prompt message id to the question message id it
	// belongs to, so an "Other…" answer resolves the original question.
	prompts map[int64]int64
}

// NewChannel returns a Telegram channel for the given configuration. Token and
// chat id are required; user id, when set, must be numeric — it is the bound
// operator whose traffic is the only traffic this channel accepts.
func NewChannel(cfg operator.ChannelConfig) (*Channel, error) {
	if cfg.ChatID == "" {
		return nil, errors.New("telegram: chat id is required — run tk channel setup telegram to pair")
	}
	var userID int64
	if cfg.UserID != "" {
		parsed, err := parseID(cfg.UserID)
		if err != nil {
			return nil, fmt.Errorf("telegram: user id: %w", err)
		}
		userID = parsed
	}
	client, err := NewClient(Options{
		Token:   cfg.Token,
		BaseURL: cfg.APIBase,
		UserID:  userID,
	})
	if err != nil {
		return nil, err
	}
	// A non-numeric chat id is a legal Bot API destination (@channelusername),
	// so failing to parse it is not an error — it only means updates cannot be
	// matched by chat.
	chatIDNum, _ := parseID(cfg.ChatID)
	return &Channel{
		client:    client,
		chatID:    cfg.ChatID,
		chatIDNum: chatIDNum,
		pending:   make(map[int64]*pendingQuestion),
		prompts:   make(map[int64]int64),
	}, nil
}

// Client exposes the underlying Bot API client, for flows that need the raw API
// (pairing runs getMe and polls before a chat is even known).
func (ch *Channel) Client() *Client { return ch.client }

// Send delivers a one-way message to the paired chat. Per [operator.Channel],
// text is plain text: this transport posts with parse_mode=HTML, so the text is
// escaped here — a caller's angle bracket is an angle bracket, not markup, and
// not a 400 from the Bot API's HTML parser either.
func (ch *Channel) Send(ctx context.Context, text string) error {
	_, err := ch.client.SendMessage(ctx, OutgoingMessage{ChatID: ch.chatID, Text: html.EscapeString(text)})
	return err
}

// AskDeliver renders q for Telegram and posts it: a free-text question becomes a
// force-reply message, an option question an inline keyboard, a multi-select
// question a toggle keyboard plus Done, and AllowOther adds an "Other…" button.
func (ch *Channel) AskDeliver(ctx context.Context, q operator.Question) (operator.MessageRef, error) {
	pending := &pendingQuestion{
		question: q,
		body:     renderQuestion(q),
		selected: make(map[int]bool),
	}
	msg := OutgoingMessage{
		ChatID:     ch.chatID,
		Text:       pending.body,
		Keyboard:   pending.keyboard(),
		ForceReply: len(q.Options) == 0,
	}
	messageID, err := ch.client.SendMessage(ctx, msg)
	if err != nil {
		return operator.MessageRef{}, err
	}

	ch.mu.Lock()
	ch.pending[messageID] = pending
	ch.mu.Unlock()

	return ch.ref(messageID), nil
}

// Adopt takes over a question an earlier run delivered, rebuilding the local
// state a press needs: the labels behind the buttons and, for a multi-select,
// an empty selection.
//
// It implements [operator.Adopter] and is idempotent — a message this process
// already tracks keeps the state it has, including toggles the operator made
// since. Selections made against the previous run are NOT recoverable: they
// lived in that process, so an adopted multi-select starts empty and the
// keyboard on the phone is repainted on the next toggle.
func (ch *Channel) Adopt(ref operator.MessageRef, q operator.Question) error {
	messageID, err := parseID(ref.MessageID)
	if err != nil {
		return fmt.Errorf("telegram: adopt: message ref: %w", err)
	}
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if _, ok := ch.pending[messageID]; ok {
		return nil
	}
	ch.pending[messageID] = &pendingQuestion{
		question: q,
		body:     renderQuestion(q),
		selected: make(map[int]bool),
	}
	return nil
}

// Resolve edits the question to show its outcome and clears the keyboard, so the
// message reads as settled and cannot be answered again.
func (ch *Channel) Resolve(ctx context.Context, ref operator.MessageRef, outcome operator.Outcome) error {
	messageID, err := parseID(ref.MessageID)
	if err != nil {
		return fmt.Errorf("telegram: resolve: message ref: %w", err)
	}

	ch.mu.Lock()
	pending := ch.pending[messageID]
	delete(ch.pending, messageID)
	for promptID, questionID := range ch.prompts {
		if questionID == messageID {
			delete(ch.prompts, promptID)
		}
	}
	ch.mu.Unlock()

	chat := ref.ChannelID
	if chat == "" {
		chat = ch.chatID
	}
	return ch.client.EditMessageText(ctx, chat, messageID, renderOutcome(pending, outcome), nil)
}

// Events long-polls for the bound operator's activity and translates it into
// [operator.Event]s until ctx is cancelled, then closes the stream.
//
// Transient failures (timeouts, 5xx, dropped connections) are retried with
// backoff and never surface. A fatal failure — revoked token, blocked bot,
// another getUpdates consumer on the same token — is emitted once as an
// [operator.EventError] and closes the stream.
//
// Presses that only change local state emit nothing: a multi-select toggle
// repaints the keyboard, and "Other…" sends a force-reply prompt. Both are
// acknowledged so the operator's client stops spinning.
func (ch *Channel) Events(ctx context.Context) <-chan operator.Event {
	out := make(chan operator.Event)

	pollTimeout := ch.PollTimeout
	if pollTimeout <= 0 {
		pollTimeout = DefaultPollTimeout
	}
	baseBackoff := ch.RetryBackoff
	if baseBackoff <= 0 {
		baseBackoff = DefaultRetryBackoff
	}

	go func() {
		defer close(out)
		backoff := baseBackoff
		for {
			if ctx.Err() != nil {
				return
			}
			updates, err := ch.client.GetUpdates(ctx, pollTimeout)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				var apiErr *Error
				if errors.As(err, &apiErr) && apiErr.Fatal() {
					emit(ctx, out, operator.Event{Kind: operator.EventError, Err: err})
					return
				}
				wait := backoff
				if errors.As(err, &apiErr) && apiErr.RetryAfter > wait {
					wait = apiErr.RetryAfter
				}
				if !sleep(ctx, wait) {
					return
				}
				if backoff *= 2; backoff > maxRetryBackoff {
					backoff = maxRetryBackoff
				}
				continue
			}
			backoff = baseBackoff

			for _, update := range updates {
				events, fatal := ch.handle(ctx, update)
				for _, ev := range events {
					if !emit(ctx, out, ev) {
						return
					}
				}
				if fatal != nil {
					emit(ctx, out, operator.Event{Kind: operator.EventError, Err: fatal})
					return
				}
			}
		}
	}()
	return out
}

// handle translates one update, performing whatever Telegram side effects it
// implies (acknowledging a press, repainting a keyboard, sending a prompt). It
// returns the events to deliver, and a fatal error when the channel is dead.
func (ch *Channel) handle(ctx context.Context, update Update) (events []operator.Event, fatal error) {
	switch {
	case update.Message != nil:
		return ch.handleMessage(update.Message), nil
	case update.CallbackQuery != nil:
		return ch.handleCallback(ctx, update.CallbackQuery)
	}
	return nil, nil
}

func (ch *Channel) handleMessage(msg *IncomingMessage) []operator.Event {
	// The binding is a user in a chat, not a user anywhere. The bound operator
	// writing to the bot somewhere else — a group the bot was added to, a
	// second private thread — is not this run's operator channel, so it is
	// dropped rather than delivered as an answer.
	if ch.chatIDNum != 0 && msg.ChatID != ch.chatIDNum {
		return nil
	}
	ev := operator.Event{Kind: operator.EventAnswer, Text: msg.Text, SenderID: senderID(msg.FromID)}
	if questionID, ok := ch.questionFor(msg.ReplyToMessageID); ok {
		ev.Ref = ch.ref(questionID)
	}
	return []operator.Event{ev}
}

func (ch *Channel) handleCallback(ctx context.Context, cq *CallbackQuery) ([]operator.Event, error) {
	ch.mu.Lock()
	pending := ch.pending[cq.MessageID]
	ch.mu.Unlock()

	if pending == nil {
		// The question was resolved (or this process never delivered it): the
		// tick is the source of truth, so the press changes nothing and the
		// operator is told why.
		if err := ch.answer(ctx, cq.ID, staleNote); err != nil {
			return nil, err
		}
		return nil, nil
	}

	kind, index, err := parseCallbackData(cq.Data)
	if err != nil {
		return nil, ch.answer(ctx, cq.ID, staleNote)
	}

	switch kind {
	case cbSelect:
		if index >= len(pending.question.Options) {
			return nil, ch.answer(ctx, cq.ID, staleNote)
		}
		option := pending.question.Options[index]
		if err := ch.answer(ctx, cq.ID, option.Label); err != nil {
			return nil, err
		}
		return []operator.Event{{
			Kind:      operator.EventOptionPress,
			Ref:       ch.ref(cq.MessageID),
			SenderID:  senderID(cq.FromID),
			OptionIDs: []string{option.ID},
		}}, nil

	case cbToggle:
		if index >= len(pending.question.Options) {
			return nil, ch.answer(ctx, cq.ID, staleNote)
		}
		ch.mu.Lock()
		pending.selected[index] = !pending.selected[index]
		keyboard := pending.keyboard()
		ch.mu.Unlock()

		if err := ch.answer(ctx, cq.ID, pending.question.Options[index].Label); err != nil {
			return nil, err
		}
		if err := ch.client.EditMessageReplyMarkup(ctx, ch.chatID, cq.MessageID, keyboard); err != nil {
			return nil, fatalOnly(err)
		}
		return nil, nil

	case cbDone:
		if err := ch.answer(ctx, cq.ID, doneLabel); err != nil {
			return nil, err
		}
		ch.mu.Lock()
		ids := pending.selectedIDs()
		ch.mu.Unlock()
		return []operator.Event{{
			Kind:      operator.EventMultiSelectCommit,
			Ref:       ch.ref(cq.MessageID),
			SenderID:  senderID(cq.FromID),
			OptionIDs: ids,
		}}, nil

	case cbOther:
		if err := ch.answer(ctx, cq.ID, otherLabel); err != nil {
			return nil, err
		}
		promptID, err := ch.client.SendMessage(ctx, OutgoingMessage{
			ChatID:     ch.chatID,
			Text:       otherPrompt,
			ForceReply: true,
		})
		if err != nil {
			return nil, fatalOnly(err)
		}
		ch.mu.Lock()
		ch.prompts[promptID] = cq.MessageID
		ch.mu.Unlock()
		return nil, nil
	}
	return nil, nil
}

// answer acknowledges a press. A transient failure here is not worth killing the
// stream over — the spinner stops on its own — so only a fatal error propagates.
func (ch *Channel) answer(ctx context.Context, queryID, text string) error {
	return fatalOnly(ch.client.AnswerCallbackQuery(ctx, queryID, text, false))
}

// fatalOnly keeps a fatal API error and discards everything else, for side
// effects whose failure must not take the event stream down.
func fatalOnly(err error) error {
	var apiErr *Error
	if errors.As(err, &apiErr) && apiErr.Fatal() {
		return err
	}
	return nil
}

// questionFor maps a replied-to message id to the pending question it answers:
// either the question message itself (force reply on a free-text question) or an
// "Other…" prompt tied to one.
func (ch *Channel) questionFor(replyTo int64) (int64, bool) {
	if replyTo == 0 {
		return 0, false
	}
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if _, ok := ch.pending[replyTo]; ok {
		return replyTo, true
	}
	if questionID, ok := ch.prompts[replyTo]; ok {
		return questionID, true
	}
	return 0, false
}

func (ch *Channel) ref(messageID int64) operator.MessageRef {
	return operator.MessageRef{
		ChannelID: ch.chatID,
		MessageID: strconv.FormatInt(messageID, 10),
	}
}

// keyboard renders the question's current inline keyboard, or nil for a pure
// free-text question.
func (p *pendingQuestion) keyboard() [][]Button {
	q := p.question
	if len(q.Options) == 0 {
		return nil
	}
	rows := make([][]Button, 0, len(q.Options)+2)
	for i, opt := range q.Options {
		if q.MultiSelect {
			mark := unselectedMark
			if p.selected[i] {
				mark = selectedMark
			}
			rows = append(rows, []Button{{Text: mark + " " + opt.Label, Data: cbToggle + strconv.Itoa(i)}})
			continue
		}
		rows = append(rows, []Button{{Text: opt.Label, Data: cbSelect + strconv.Itoa(i)}})
	}
	if q.MultiSelect {
		rows = append(rows, []Button{{Text: doneLabel, Data: cbDone}})
	}
	if q.AllowOther {
		rows = append(rows, []Button{{Text: otherLabel, Data: cbOther}})
	}
	return rows
}

// selectedIDs returns the caller's option ids for the current selection, in
// display order.
func (p *pendingQuestion) selectedIDs() []string {
	var ids []string
	for i, opt := range p.question.Options {
		if p.selected[i] {
			ids = append(ids, opt.ID)
		}
	}
	return ids
}

// parseCallbackData splits a button payload into its prefix and option index.
func parseCallbackData(data string) (kind string, index int, err error) {
	if data == "" {
		return "", 0, errors.New("empty callback data")
	}
	kind, rest := data[:1], data[1:]
	switch kind {
	case cbDone, cbOther:
		if rest != "" {
			return "", 0, fmt.Errorf("unexpected payload %q", data)
		}
		return kind, 0, nil
	case cbSelect, cbToggle:
		index, convErr := strconv.Atoi(rest)
		if convErr != nil || index < 0 {
			return "", 0, fmt.Errorf("unexpected option index in %q", data)
		}
		return kind, index, nil
	}
	return "", 0, fmt.Errorf("unknown callback data %q", data)
}

// renderQuestion renders a question as HTML: bold header, the question text, and
// a line per option that carries a description (button labels have no room for
// one).
func renderQuestion(q operator.Question) string {
	var b strings.Builder
	if q.Header != "" {
		b.WriteString("<b>" + html.EscapeString(q.Header) + "</b>\n")
	}
	b.WriteString(html.EscapeString(q.Text))
	for _, opt := range q.Options {
		if opt.Description == "" {
			continue
		}
		b.WriteString("\n• <b>" + html.EscapeString(opt.Label) + "</b> — " + html.EscapeString(opt.Description))
	}
	if len(q.Options) == 0 {
		b.WriteString("\n\n<i>" + freeTextHint + "</i>")
	}
	return b.String()
}

// renderOutcome renders the resolved form of a question: the original body, kept
// so the chat still reads as a record, plus what was decided.
func renderOutcome(pending *pendingQuestion, outcome operator.Outcome) string {
	var b strings.Builder
	if pending != nil {
		b.WriteString(pending.body)
		b.WriteString("\n\n")
	}
	b.WriteString("<b>" + html.EscapeString(outcomeHeading(outcome.Status)) + "</b>")
	if outcome.Text != "" {
		b.WriteString(" — " + html.EscapeString(outcome.Text))
	}
	if labels := outcomeLabels(pending, outcome.OptionIDs); labels != "" {
		b.WriteString("\n" + labels)
	}
	return b.String()
}

func outcomeHeading(status operator.OutcomeStatus) string {
	switch status {
	case operator.OutcomeAnswered:
		return "Answered"
	case operator.OutcomeCancelled:
		return "Cancelled"
	case operator.OutcomeTimedOut:
		return "Timed out"
	}
	return "Resolved"
}

// outcomeLabels renders chosen options by label where the labels are known,
// falling back to the ids.
func outcomeLabels(pending *pendingQuestion, ids []string) string {
	if len(ids) == 0 {
		return ""
	}
	labels := make([]string, 0, len(ids))
	for _, id := range ids {
		label := id
		if pending != nil {
			for _, opt := range pending.question.Options {
				if opt.ID == id {
					label = opt.Label
					break
				}
			}
		}
		labels = append(labels, html.EscapeString(label))
	}
	return "Selected: " + strings.Join(labels, ", ")
}

// emit delivers ev unless ctx is done, reporting whether the stream may continue.
func emit(ctx context.Context, out chan<- operator.Event, ev operator.Event) bool {
	select {
	case out <- ev:
		return true
	case <-ctx.Done():
		return false
	}
}

// sleep waits for d, reporting false if ctx was cancelled first.
func sleep(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return ctx.Err() == nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}
