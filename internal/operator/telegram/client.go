// Package telegram is the Telegram Bot API transport for the operator channel.
// It is the only place in the tree where Telegram API concepts appear: the rest
// of the system talks to [operator.Channel], and this package translates.
//
// The transport is raw net/http plus encoding/json — no third-party Bot API
// library — and every call goes through a [Client] whose base URL is
// configurable, so tests and offline evidence runs point it at a local fake Bot
// API server (see the fakebot subpackage) instead of api.telegram.org.
//
// Bot API wire structs are unexported by design. What leaves this package is a
// small, provider-neutral surface ([BotInfo], [Update], [OutgoingMessage],
// [Button]) so nothing downstream can grow a dependency on Telegram's schema.
package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	// DefaultBaseURL is the public Bot API root.
	DefaultBaseURL = "https://api.telegram.org"

	// CallbackDataMaxBytes is the Bot API limit on inline-button callback data.
	// It is why buttons carry short local ids instead of caller-supplied option
	// ids, whose length this package does not control.
	CallbackDataMaxBytes = 64

	// defaultRequestTimeout bounds a non-polling call.
	defaultRequestTimeout = 30 * time.Second

	// pollSlack is how much longer than the long-poll timeout the HTTP request
	// is allowed to take, so the server's own timeout wins the race.
	pollSlack = 15 * time.Second

	// maxResponseBytes caps how much of a response body is read.
	maxResponseBytes = 4 << 20

	parseModeHTML = "HTML"
)

// Options configures a [Client].
type Options struct {
	// Token is the bot token. Required.
	Token string
	// BaseURL overrides the API root; empty means [DefaultBaseURL].
	BaseURL string
	// UserID is the bound operator's numeric Telegram id. When non-zero,
	// GetUpdates drops updates from every other sender (the transport half of
	// the bound-user rule). Zero means no filtering, which is what pairing
	// needs: it has not learned the operator's id yet.
	UserID int64
	// HTTPClient overrides the HTTP client. It must not carry a Timeout
	// shorter than a long poll; per-request deadlines are set from the context.
	HTTPClient *http.Client
}

// Client is a Bot API client. It is safe for concurrent use, though a single
// getUpdates consumer per token is a Bot API requirement (a second one gets 409).
type Client struct {
	token      string
	baseURL    string
	userID     int64
	httpClient *http.Client

	mu     sync.Mutex
	offset int64
}

// NewClient returns a client for the given options.
func NewClient(opts Options) (*Client, error) {
	if opts.Token == "" {
		return nil, errors.New("telegram: bot token is required")
	}
	base := opts.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	if _, err := url.Parse(base); err != nil {
		return nil, fmt.Errorf("telegram: invalid API base URL %q: %w", base, err)
	}
	httpClient := opts.HTTPClient
	if httpClient == nil {
		// No client-level timeout: long polls set their own deadline from the
		// request context.
		httpClient = &http.Client{}
	}
	return &Client{
		token:      opts.Token,
		baseURL:    strings.TrimSuffix(base, "/"),
		userID:     opts.UserID,
		httpClient: httpClient,
	}, nil
}

// BaseURL is the API root this client calls.
func (c *Client) BaseURL() string { return c.baseURL }

// UserID is the bound operator id, or 0 when updates are unfiltered.
func (c *Client) UserID() int64 { return c.userID }

// Offset is the next update id this client will ask for.
func (c *Client) Offset() int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.offset
}

// SetOffset overrides the next update id to ask for. Use it to resume a poll
// loop from persisted state; GetUpdates otherwise maintains the offset itself.
func (c *Client) SetOffset(offset int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.offset = offset
}

// Error is a failed Bot API call. Transport-level failures (DNS, connection
// resets, context cancellation) are plain wrapped errors instead; only a
// response from the API produces an Error.
type Error struct {
	// Method is the Bot API method that failed.
	Method string
	// StatusCode is the HTTP status.
	StatusCode int
	// Code is Telegram's error_code, when it sent one.
	Code int
	// Description is Telegram's description, when it sent one.
	Description string
	// RetryAfter is the flood-wait Telegram asked for, if any.
	RetryAfter time.Duration
}

func (e *Error) Error() string {
	desc := e.Description
	if desc == "" {
		desc = http.StatusText(e.StatusCode)
	}
	return fmt.Sprintf("telegram: %s: %d %s", e.Method, e.StatusCode, desc)
}

// Fatal reports whether the failure is permanent for this configuration: the
// token is wrong or revoked, the bot is blocked, or another consumer owns the
// token's update stream. Callers stop polling on a fatal error and retry
// everything else.
func (e *Error) Fatal() bool {
	switch e.StatusCode {
	case http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict:
		return true
	}
	return false
}

// transportError wraps a network-level failure while keeping the bot token out
// of the message: url.Error stringifies the request URL, which contains it.
type transportError struct {
	method string
	token  string
	err    error
}

func (e *transportError) Error() string {
	msg := e.err.Error()
	if e.token != "" {
		msg = strings.ReplaceAll(msg, e.token, "<token>")
	}
	return fmt.Sprintf("telegram: %s: %s", e.method, msg)
}

func (e *transportError) Unwrap() error { return e.err }

// BotInfo is the getMe result.
type BotInfo struct {
	ID        int64
	Username  string
	FirstName string
}

// Button is one inline-keyboard button. Data is the callback payload and must be
// at most [CallbackDataMaxBytes] bytes.
type Button struct {
	Text string
	Data string
}

// OutgoingMessage is a message to send. Text is HTML (parse_mode=HTML), so
// callers escape anything interpolated into it.
type OutgoingMessage struct {
	// ChatID is the destination chat. Numeric ids are sent as numbers,
	// anything else as a string (@channelusername).
	ChatID string
	// Text is the HTML message body.
	Text string
	// Keyboard, when set, is an inline keyboard attached to the message.
	Keyboard [][]Button
	// ForceReply asks Telegram's clients to open a reply composer pre-aimed at
	// this message, which is how free-text answers get correlated back to it.
	// Ignored when Keyboard is set.
	ForceReply bool
}

// IncomingMessage is a text message from the operator.
type IncomingMessage struct {
	MessageID int64
	ChatID    int64
	FromID    int64
	Text      string
	// ReplyToMessageID is the message this one replies to, 0 if none. It is the
	// correlation key for free-text answers.
	ReplyToMessageID int64
}

// CallbackQuery is an inline-button press.
type CallbackQuery struct {
	ID        string
	FromID    int64
	Data      string
	MessageID int64
	ChatID    int64
}

// Update is one Bot API update, reduced to the two kinds this transport asks
// for. Exactly one of Message and CallbackQuery is non-nil.
type Update struct {
	ID            int64
	Message       *IncomingMessage
	CallbackQuery *CallbackQuery
}

// GetMe verifies the token and returns the bot's identity.
func (c *Client) GetMe(ctx context.Context) (BotInfo, error) {
	var res struct {
		ID        int64  `json:"id"`
		Username  string `json:"username"`
		FirstName string `json:"first_name"`
	}
	if err := c.call(ctx, "getMe", nil, &res, defaultRequestTimeout); err != nil {
		return BotInfo{}, err
	}
	return BotInfo{ID: res.ID, Username: res.Username, FirstName: res.FirstName}, nil
}

// SendMessage sends msg and returns the id of the message Telegram created.
func (c *Client) SendMessage(ctx context.Context, msg OutgoingMessage) (int64, error) {
	if msg.ChatID == "" {
		return 0, errors.New("telegram: sendMessage: chat id is required")
	}
	if msg.Text == "" {
		return 0, errors.New("telegram: sendMessage: text is required")
	}
	markup, err := replyMarkup(msg.Keyboard, msg.ForceReply)
	if err != nil {
		return 0, fmt.Errorf("telegram: sendMessage: %w", err)
	}

	req := struct {
		ChatID      chatID          `json:"chat_id"`
		Text        string          `json:"text"`
		ParseMode   string          `json:"parse_mode"`
		ReplyMarkup json.RawMessage `json:"reply_markup,omitempty"`
	}{ChatID: chatID(msg.ChatID), Text: msg.Text, ParseMode: parseModeHTML, ReplyMarkup: markup}

	var res struct {
		MessageID int64 `json:"message_id"`
	}
	if err := c.call(ctx, "sendMessage", req, &res, defaultRequestTimeout); err != nil {
		return 0, err
	}
	return res.MessageID, nil
}

// EditMessageText replaces a message's text and its inline keyboard. A nil
// keyboard clears the keyboard, which is how a resolved question stops being
// answerable.
func (c *Client) EditMessageText(ctx context.Context, chat string, messageID int64, text string, keyboard [][]Button) error {
	markup, err := replyMarkup(keyboard, false)
	if err != nil {
		return fmt.Errorf("telegram: editMessageText: %w", err)
	}
	req := struct {
		ChatID      chatID          `json:"chat_id"`
		MessageID   int64           `json:"message_id"`
		Text        string          `json:"text"`
		ParseMode   string          `json:"parse_mode"`
		ReplyMarkup json.RawMessage `json:"reply_markup,omitempty"`
	}{ChatID: chatID(chat), MessageID: messageID, Text: text, ParseMode: parseModeHTML, ReplyMarkup: markup}
	return c.call(ctx, "editMessageText", req, nil, defaultRequestTimeout)
}

// EditMessageReplyMarkup replaces only a message's inline keyboard. A nil
// keyboard clears it.
func (c *Client) EditMessageReplyMarkup(ctx context.Context, chat string, messageID int64, keyboard [][]Button) error {
	markup, err := replyMarkup(keyboard, false)
	if err != nil {
		return fmt.Errorf("telegram: editMessageReplyMarkup: %w", err)
	}
	req := struct {
		ChatID      chatID          `json:"chat_id"`
		MessageID   int64           `json:"message_id"`
		ReplyMarkup json.RawMessage `json:"reply_markup,omitempty"`
	}{ChatID: chatID(chat), MessageID: messageID, ReplyMarkup: markup}
	return c.call(ctx, "editMessageReplyMarkup", req, nil, defaultRequestTimeout)
}

// AnswerCallbackQuery acknowledges a button press, which is what stops the
// client-side spinner. text may be empty; showAlert turns the note into a modal.
func (c *Client) AnswerCallbackQuery(ctx context.Context, queryID, text string, showAlert bool) error {
	if queryID == "" {
		return errors.New("telegram: answerCallbackQuery: query id is required")
	}
	req := struct {
		CallbackQueryID string `json:"callback_query_id"`
		Text            string `json:"text,omitempty"`
		ShowAlert       bool   `json:"show_alert,omitempty"`
	}{CallbackQueryID: queryID, Text: text, ShowAlert: showAlert}
	return c.call(ctx, "answerCallbackQuery", req, nil, defaultRequestTimeout)
}

// GetUpdates long-polls for updates, waiting up to timeout for the first one.
// An idle poll returns an empty slice and no error.
//
// The offset is managed internally: each call confirms everything the previous
// one received, so updates are never delivered twice. Updates from senders other
// than the bound user are dropped here — but they are still confirmed, so a
// stranger's traffic cannot wedge the offset.
func (c *Client) GetUpdates(ctx context.Context, timeout time.Duration) ([]Update, error) {
	seconds := int(timeout / time.Second)
	if seconds < 0 {
		seconds = 0
	}
	if seconds == 0 && timeout > 0 {
		// Telegram's granularity is whole seconds; anything shorter would turn
		// a long poll into a hot loop.
		seconds = 1
	}

	req := struct {
		Offset         int64    `json:"offset"`
		Timeout        int      `json:"timeout"`
		AllowedUpdates []string `json:"allowed_updates"`
	}{Offset: c.Offset(), Timeout: seconds, AllowedUpdates: []string{"message", "callback_query"}}

	var raw []wireUpdate
	if err := c.call(ctx, "getUpdates", req, &raw, time.Duration(seconds)*time.Second+pollSlack); err != nil {
		return nil, err
	}

	updates := make([]Update, 0, len(raw))
	var highest int64
	for _, up := range raw {
		if up.UpdateID > highest {
			highest = up.UpdateID
		}
		converted, ok := c.convert(up)
		if !ok {
			continue
		}
		updates = append(updates, converted)
	}
	if highest > 0 {
		c.mu.Lock()
		if next := highest + 1; next > c.offset {
			c.offset = next
		}
		c.mu.Unlock()
	}
	return updates, nil
}

// convert reduces a wire update to an [Update], reporting false for updates this
// transport ignores: kinds it did not ask for, and anything from a sender other
// than the bound user.
func (c *Client) convert(up wireUpdate) (Update, bool) {
	switch {
	case up.Message != nil:
		msg := up.Message
		if msg.From == nil || msg.Chat == nil || msg.Text == "" {
			return Update{}, false
		}
		if c.userID != 0 && msg.From.ID != c.userID {
			return Update{}, false
		}
		out := &IncomingMessage{
			MessageID: msg.MessageID,
			ChatID:    msg.Chat.ID,
			FromID:    msg.From.ID,
			Text:      msg.Text,
		}
		if msg.ReplyToMessage != nil {
			out.ReplyToMessageID = msg.ReplyToMessage.MessageID
		}
		return Update{ID: up.UpdateID, Message: out}, true

	case up.CallbackQuery != nil:
		cq := up.CallbackQuery
		if cq.From == nil || cq.ID == "" {
			return Update{}, false
		}
		if c.userID != 0 && cq.From.ID != c.userID {
			return Update{}, false
		}
		out := &CallbackQuery{ID: cq.ID, FromID: cq.From.ID, Data: cq.Data}
		if cq.Message != nil {
			out.MessageID = cq.Message.MessageID
			if cq.Message.Chat != nil {
				out.ChatID = cq.Message.Chat.ID
			}
		}
		return Update{ID: up.UpdateID, CallbackQuery: out}, true
	}
	return Update{}, false
}

// call performs one Bot API method call. out, when non-nil, receives the decoded
// result.
func (c *Client) call(ctx context.Context, method string, req, out any, timeout time.Duration) error {
	var body io.Reader
	if req != nil {
		encoded, err := json.Marshal(req)
		if err != nil {
			return fmt.Errorf("telegram: %s: encoding request: %w", method, err)
		}
		body = bytes.NewReader(encoded)
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	endpoint := c.baseURL + "/bot" + url.PathEscape(c.token) + "/" + method
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return &transportError{method: method, token: c.token, err: err}
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return &transportError{method: method, token: c.token, err: err}
	}
	defer func() {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, maxResponseBytes))
		resp.Body.Close()
	}()

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if err != nil {
		return &transportError{method: method, token: c.token, err: err}
	}

	var envelope struct {
		OK          bool            `json:"ok"`
		Result      json.RawMessage `json:"result"`
		ErrorCode   int             `json:"error_code"`
		Description string          `json:"description"`
		Parameters  *struct {
			RetryAfter int `json:"retry_after"`
		} `json:"parameters"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return &Error{
			Method:      method,
			StatusCode:  resp.StatusCode,
			Description: fmt.Sprintf("unparseable response (%d bytes)", len(data)),
		}
	}
	if !envelope.OK || resp.StatusCode != http.StatusOK {
		apiErr := &Error{
			Method:      method,
			StatusCode:  resp.StatusCode,
			Code:        envelope.ErrorCode,
			Description: envelope.Description,
		}
		if envelope.Parameters != nil && envelope.Parameters.RetryAfter > 0 {
			apiErr.RetryAfter = time.Duration(envelope.Parameters.RetryAfter) * time.Second
		}
		return apiErr
	}
	if out != nil {
		if err := json.Unmarshal(envelope.Result, out); err != nil {
			return fmt.Errorf("telegram: %s: decoding result: %w", method, err)
		}
	}
	return nil
}

// chatID marshals as a JSON number for numeric chat ids and as a string
// otherwise, matching the Bot API's chat_id union.
type chatID string

func (c chatID) MarshalJSON() ([]byte, error) {
	if _, err := strconv.ParseInt(string(c), 10, 64); err == nil {
		return []byte(c), nil
	}
	return json.Marshal(string(c))
}

// replyMarkup encodes an inline keyboard or a force-reply request. It returns nil
// for neither, which omits reply_markup — the Bot API reading of "no keyboard",
// and therefore how an existing keyboard is cleared on an edit.
func replyMarkup(keyboard [][]Button, force bool) (json.RawMessage, error) {
	if len(keyboard) > 0 {
		type wireButton struct {
			Text         string `json:"text"`
			CallbackData string `json:"callback_data"`
		}
		rows := make([][]wireButton, 0, len(keyboard))
		for _, row := range keyboard {
			wireRow := make([]wireButton, 0, len(row))
			for _, btn := range row {
				if len(btn.Data) > CallbackDataMaxBytes {
					return nil, fmt.Errorf("callback data for button %q is %d bytes, limit is %d", btn.Text, len(btn.Data), CallbackDataMaxBytes)
				}
				if btn.Data == "" {
					return nil, fmt.Errorf("button %q has empty callback data", btn.Text)
				}
				wireRow = append(wireRow, wireButton{Text: btn.Text, CallbackData: btn.Data})
			}
			rows = append(rows, wireRow)
		}
		return json.Marshal(struct {
			InlineKeyboard [][]wireButton `json:"inline_keyboard"`
		}{InlineKeyboard: rows})
	}
	if force {
		return json.Marshal(struct {
			ForceReply bool `json:"force_reply"`
		}{ForceReply: true})
	}
	return nil, nil
}

// parseID reads a numeric Telegram id out of the string form the neutral
// interface carries (config ids are strings so non-numeric channels fit).
func parseID(s string) (int64, error) {
	if s == "" {
		return 0, errors.New("empty id")
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%q is not a numeric Telegram id", s)
	}
	return n, nil
}

// Bot API wire types. They stay unexported: nothing outside this package should
// be able to name Telegram's schema.

type wireUpdate struct {
	UpdateID      int64              `json:"update_id"`
	Message       *wireMessage       `json:"message"`
	CallbackQuery *wireCallbackQuery `json:"callback_query"`
}

type wireMessage struct {
	MessageID      int64        `json:"message_id"`
	From           *wireUser    `json:"from"`
	Chat           *wireChat    `json:"chat"`
	Text           string       `json:"text"`
	ReplyToMessage *wireMessage `json:"reply_to_message"`
}

type wireCallbackQuery struct {
	ID      string       `json:"id"`
	From    *wireUser    `json:"from"`
	Data    string       `json:"data"`
	Message *wireMessage `json:"message"`
}

type wireUser struct {
	ID       int64  `json:"id"`
	IsBot    bool   `json:"is_bot"`
	Username string `json:"username"`
}

type wireChat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}
