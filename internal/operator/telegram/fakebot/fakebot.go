// Package fakebot serves just enough of the Telegram Bot API, over httptest, for
// tests and offline evidence runs to exercise a real HTTP client end to end:
// getMe, capture of sendMessage / editMessageText / editMessageReplyMarkup /
// answerCallbackQuery, and getUpdates fed from a scripted queue with real Bot API
// offset semantics.
//
// It deliberately does not import the telegram client package: the two speak only
// HTTP and JSON, so a bug in the client's wire format cannot be cancelled out by a
// shared Go type.
//
// A Bot is safe for concurrent use: a test goroutine may push updates and read
// captures while the code under test polls.
package fakebot

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"time"
)

// DefaultToken is the bot token a Bot accepts unless told otherwise. Requests
// carrying any other token are answered 401, like the real API.
const DefaultToken = "fake-bot-token:AAoperator"

// DefaultMaxPollWait caps how long getUpdates blocks, regardless of the timeout
// the caller asked for. Tests keep their long polls honest (the client really
// waits and really gets an empty batch) without paying Telegram's seconds-scale
// granularity.
const DefaultMaxPollWait = 150 * time.Millisecond

// BotUser is the getMe result.
type BotUser struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}

// SentMessage is one captured sendMessage call, plus the message id the fake
// assigned to it.
type SentMessage struct {
	MessageID   int64
	ChatID      string
	Text        string
	ParseMode   string
	ReplyMarkup json.RawMessage
}

// Edit is one captured editMessageText or editMessageReplyMarkup call. Text is
// empty for a markup-only edit, and ReplyMarkup is empty when the call omitted
// it — which is how the Bot API clears an inline keyboard.
type Edit struct {
	ChatID      string
	MessageID   int64
	Text        string
	ReplyMarkup json.RawMessage
}

// Answer is one captured answerCallbackQuery call.
type Answer struct {
	CallbackQueryID string
	Text            string
	ShowAlert       bool
}

type failure struct {
	status      int
	description string
}

type queuedUpdate struct {
	id   int64
	body map[string]any
}

// Bot is a running fake Bot API server.
//
// The zero value is not usable — construct it with [New] and Close it when the
// test ends.
type Bot struct {
	// Token is the token the bot accepts. Set at construction.
	Token string
	// MaxPollWait caps getUpdates blocking; see [DefaultMaxPollWait]. Set it
	// before the code under test starts polling.
	MaxPollWait time.Duration

	server *httptest.Server

	mu             sync.Mutex
	me             BotUser
	queue          []queuedUpdate
	nextUpdateID   int64
	nextMessageID  int64
	offsets        []int64
	allowedUpdates []string
	calls          []string
	sent           []SentMessage
	edits          []Edit
	markupEdits    []Edit
	answers        []Answer
	failures       map[string][]failure

	// pushed is signalled (non-blocking) whenever an update is queued, so a
	// blocked getUpdates returns promptly instead of waiting out its timeout.
	pushed chan struct{}
}

// New starts a fake Bot API server. The caller must Close it.
func New() *Bot {
	b := &Bot{
		Token:       DefaultToken,
		MaxPollWait: DefaultMaxPollWait,
		me: BotUser{
			ID:        7000001,
			IsBot:     true,
			FirstName: "Ticks Operator",
			Username:  "ticks_operator_bot",
		},
		nextUpdateID:  1,
		nextMessageID: 100,
		failures:      make(map[string][]failure),
		pushed:        make(chan struct{}, 1),
	}
	b.server = httptest.NewServer(http.HandlerFunc(b.handle))
	return b
}

// Close shuts the server down.
func (b *Bot) Close() { b.server.Close() }

// URL is the API base URL to hand a client (no trailing slash, no /bot prefix).
func (b *Bot) URL() string { return b.server.URL }

// SetMe replaces the getMe result.
func (b *Bot) SetMe(me BotUser) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.me = me
}

// Me returns the current getMe result.
func (b *Bot) Me() BotUser {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.me
}

// FailNext queues one failure response for the named API method (e.g.
// "getUpdates"). Queued failures are consumed in order, before any real
// handling, which lets a test drive both transient (500) and fatal (401)
// transport paths.
func (b *Bot) FailNext(method string, status int, description string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures[method] = append(b.failures[method], failure{status: status, description: description})
}

// PushMessage queues a plain text message update from userID in chatID and
// returns the message id it was given.
func (b *Bot) PushMessage(userID, chatID int64, text string) int64 {
	return b.PushReply(userID, chatID, 0, text)
}

// PushReply queues a text message update that replies to replyTo (0 for none)
// and returns the message id it was given.
func (b *Bot) PushReply(userID, chatID, replyTo int64, text string) int64 {
	b.mu.Lock()
	msgID := b.nextMessageID
	b.nextMessageID++
	msg := map[string]any{
		"message_id": msgID,
		"date":       0,
		"from":       map[string]any{"id": userID, "is_bot": false, "first_name": "Operator"},
		"chat":       map[string]any{"id": chatID, "type": "private"},
		"text":       text,
	}
	if replyTo != 0 {
		msg["reply_to_message"] = map[string]any{
			"message_id": replyTo,
			"date":       0,
			"chat":       map[string]any{"id": chatID, "type": "private"},
		}
	}
	b.queueLocked(map[string]any{"message": msg})
	b.mu.Unlock()
	return msgID
}

// PushCallback queues a callback query update — an inline-keyboard press on
// messageID carrying data — and returns the callback query id it was given.
func (b *Bot) PushCallback(userID, chatID, messageID int64, data string) string {
	b.mu.Lock()
	queryID := "cb" + strconv.FormatInt(b.nextUpdateID, 10)
	b.queueLocked(map[string]any{
		"callback_query": map[string]any{
			"id":   queryID,
			"from": map[string]any{"id": userID, "is_bot": false, "first_name": "Operator"},
			"data": data,
			"message": map[string]any{
				"message_id": messageID,
				"date":       0,
				"chat":       map[string]any{"id": chatID, "type": "private"},
			},
		},
	})
	b.mu.Unlock()
	return queryID
}

// queueLocked appends an update body under the next update id. b.mu must be held.
func (b *Bot) queueLocked(body map[string]any) {
	id := b.nextUpdateID
	b.nextUpdateID++
	b.queue = append(b.queue, queuedUpdate{id: id, body: body})
	select {
	case b.pushed <- struct{}{}:
	default:
	}
}

// Offsets returns the offset parameter of every getUpdates call, in order.
func (b *Bot) Offsets() []int64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]int64(nil), b.offsets...)
}

// AllowedUpdates returns the allowed_updates list of the most recent getUpdates
// call, nil if it did not send one.
func (b *Bot) AllowedUpdates() []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]string(nil), b.allowedUpdates...)
}

// Calls returns the name of every API method called, in order.
func (b *Bot) Calls() []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]string(nil), b.calls...)
}

// Sent returns the captured sendMessage calls, in order.
func (b *Bot) Sent() []SentMessage {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]SentMessage(nil), b.sent...)
}

// Edits returns the captured editMessageText calls, in order.
func (b *Bot) Edits() []Edit {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]Edit(nil), b.edits...)
}

// MarkupEdits returns the captured editMessageReplyMarkup calls, in order.
func (b *Bot) MarkupEdits() []Edit {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]Edit(nil), b.markupEdits...)
}

// Answers returns the captured answerCallbackQuery calls, in order.
func (b *Bot) Answers() []Answer {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]Answer(nil), b.answers...)
}

func (b *Bot) handle(w http.ResponseWriter, r *http.Request) {
	token, method, ok := splitPath(r.URL.Path)
	if !ok {
		writeError(w, http.StatusNotFound, "Not Found")
		return
	}
	if token != b.Token {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Bad Request: unreadable body")
		return
	}

	b.mu.Lock()
	b.calls = append(b.calls, method)
	var injected *failure
	if queued := b.failures[method]; len(queued) > 0 {
		f := queued[0]
		b.failures[method] = queued[1:]
		injected = &f
	}
	b.mu.Unlock()

	if injected != nil {
		writeError(w, injected.status, injected.description)
		return
	}

	switch method {
	case "getMe":
		writeResult(w, b.Me())
	case "sendMessage":
		b.sendMessage(w, body)
	case "editMessageText":
		b.editMessageText(w, body)
	case "editMessageReplyMarkup":
		b.editMessageReplyMarkup(w, body)
	case "answerCallbackQuery":
		b.answerCallbackQuery(w, body)
	case "getUpdates":
		b.getUpdates(w, r, body)
	default:
		writeError(w, http.StatusNotFound, "Not Found: method not found")
	}
}

type sendMessageRequest struct {
	ChatID      json.RawMessage `json:"chat_id"`
	Text        string          `json:"text"`
	ParseMode   string          `json:"parse_mode"`
	ReplyMarkup json.RawMessage `json:"reply_markup"`
}

func (b *Bot) sendMessage(w http.ResponseWriter, body []byte) {
	var req sendMessageRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Bad Request: "+err.Error())
		return
	}
	chatID := scalarString(req.ChatID)
	if chatID == "" {
		writeError(w, http.StatusBadRequest, "Bad Request: chat_id is empty")
		return
	}
	if req.Text == "" {
		writeError(w, http.StatusBadRequest, "Bad Request: message text is empty")
		return
	}

	b.mu.Lock()
	msgID := b.nextMessageID
	b.nextMessageID++
	b.sent = append(b.sent, SentMessage{
		MessageID:   msgID,
		ChatID:      chatID,
		Text:        req.Text,
		ParseMode:   req.ParseMode,
		ReplyMarkup: cloneRaw(req.ReplyMarkup),
	})
	b.mu.Unlock()

	writeResult(w, map[string]any{
		"message_id": msgID,
		"date":       0,
		"chat":       map[string]any{"id": chatValue(chatID), "type": "private"},
		"text":       req.Text,
	})
}

type editRequest struct {
	ChatID      json.RawMessage `json:"chat_id"`
	MessageID   int64           `json:"message_id"`
	Text        string          `json:"text"`
	ParseMode   string          `json:"parse_mode"`
	ReplyMarkup json.RawMessage `json:"reply_markup"`
}

func (b *Bot) editMessageText(w http.ResponseWriter, body []byte) {
	var req editRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Bad Request: "+err.Error())
		return
	}
	if req.MessageID == 0 {
		writeError(w, http.StatusBadRequest, "Bad Request: message identifier is not specified")
		return
	}
	edit := Edit{
		ChatID:      scalarString(req.ChatID),
		MessageID:   req.MessageID,
		Text:        req.Text,
		ReplyMarkup: cloneRaw(req.ReplyMarkup),
	}
	b.mu.Lock()
	b.edits = append(b.edits, edit)
	b.mu.Unlock()
	writeResult(w, map[string]any{
		"message_id": req.MessageID,
		"date":       0,
		"chat":       map[string]any{"id": chatValue(edit.ChatID), "type": "private"},
		"text":       req.Text,
	})
}

func (b *Bot) editMessageReplyMarkup(w http.ResponseWriter, body []byte) {
	var req editRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Bad Request: "+err.Error())
		return
	}
	if req.MessageID == 0 {
		writeError(w, http.StatusBadRequest, "Bad Request: message identifier is not specified")
		return
	}
	edit := Edit{
		ChatID:      scalarString(req.ChatID),
		MessageID:   req.MessageID,
		ReplyMarkup: cloneRaw(req.ReplyMarkup),
	}
	b.mu.Lock()
	b.markupEdits = append(b.markupEdits, edit)
	b.mu.Unlock()
	writeResult(w, map[string]any{
		"message_id": req.MessageID,
		"date":       0,
		"chat":       map[string]any{"id": chatValue(edit.ChatID), "type": "private"},
	})
}

func (b *Bot) answerCallbackQuery(w http.ResponseWriter, body []byte) {
	var req struct {
		CallbackQueryID string `json:"callback_query_id"`
		Text            string `json:"text"`
		ShowAlert       bool   `json:"show_alert"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Bad Request: "+err.Error())
		return
	}
	if req.CallbackQueryID == "" {
		writeError(w, http.StatusBadRequest, "Bad Request: query id is empty")
		return
	}
	b.mu.Lock()
	b.answers = append(b.answers, Answer{
		CallbackQueryID: req.CallbackQueryID,
		Text:            req.Text,
		ShowAlert:       req.ShowAlert,
	})
	b.mu.Unlock()
	writeResult(w, true)
}

func (b *Bot) getUpdates(w http.ResponseWriter, r *http.Request, body []byte) {
	var req struct {
		Offset         int64    `json:"offset"`
		Timeout        int      `json:"timeout"`
		AllowedUpdates []string `json:"allowed_updates"`
	}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &req); err != nil {
			writeError(w, http.StatusBadRequest, "Bad Request: "+err.Error())
			return
		}
	}

	b.mu.Lock()
	b.offsets = append(b.offsets, req.Offset)
	b.allowedUpdates = append([]string(nil), req.AllowedUpdates...)
	wait := b.MaxPollWait
	b.mu.Unlock()

	if asked := time.Duration(req.Timeout) * time.Second; asked < wait {
		wait = asked
	}

	deadline := time.NewTimer(wait)
	defer deadline.Stop()
	for {
		if updates := b.takeUpdates(req.Offset); len(updates) > 0 {
			writeResult(w, updates)
			return
		}
		if wait <= 0 {
			writeResult(w, []any{})
			return
		}
		select {
		case <-b.pushed:
		case <-deadline.C:
			writeResult(w, []any{})
			return
		case <-r.Context().Done():
			writeResult(w, []any{})
			return
		}
	}
}

// takeUpdates applies Bot API offset semantics: updates below offset are
// confirmed (dropped from the queue) and everything from offset on is returned,
// staying queued until a later offset confirms it.
func (b *Bot) takeUpdates(offset int64) []map[string]any {
	b.mu.Lock()
	defer b.mu.Unlock()

	if offset > 0 {
		kept := b.queue[:0]
		for _, up := range b.queue {
			if up.id >= offset {
				kept = append(kept, up)
			}
		}
		b.queue = kept
	}

	out := make([]map[string]any, 0, len(b.queue))
	for _, up := range b.queue {
		if up.id < offset {
			continue
		}
		body := make(map[string]any, len(up.body)+1)
		body["update_id"] = up.id
		for k, v := range up.body {
			body[k] = v
		}
		out = append(out, body)
	}
	return out
}

// splitPath parses /bot<token>/<method>.
func splitPath(path string) (token, method string, ok bool) {
	trimmed := strings.TrimPrefix(path, "/")
	slash := strings.Index(trimmed, "/")
	if slash < 0 {
		return "", "", false
	}
	prefix, method := trimmed[:slash], trimmed[slash+1:]
	if !strings.HasPrefix(prefix, "bot") || method == "" || strings.Contains(method, "/") {
		return "", "", false
	}
	return strings.TrimPrefix(prefix, "bot"), method, true
}

// scalarString renders a JSON scalar (number or string) as a plain string, so a
// chat id sent either way is captured identically.
func scalarString(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return strings.TrimSpace(string(raw))
}

// chatValue renders a captured chat id the way the real API does: a number for
// numeric ids, a string for @usernames.
func chatValue(chatID string) any {
	if n, err := strconv.ParseInt(chatID, 10, 64); err == nil {
		return n
	}
	return chatID
}

func cloneRaw(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), raw...)
}

func writeResult(w http.ResponseWriter, result any) {
	payload, err := json.Marshal(result)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("fakebot: encoding result: %v", err))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true,"result":`))
	_, _ = w.Write(payload)
	_, _ = w.Write([]byte(`}`))
}

func writeError(w http.ResponseWriter, status int, description string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":          false,
		"error_code":  status,
		"description": description,
	})
}
