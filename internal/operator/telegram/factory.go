package telegram

// This file is the cloud-connected Telegram channel. The Bot API consumer is
// the factory Worker in webhook mode; this side only mirrors the checkout's
// pending entry into the project's RunRoom and watches that same entry for a
// resolution. Keeping the HTTP client here, behind operator.Channel, means a
// cloud sandbox uses the existing ask/await/apply machinery and does not grow a
// second gate implementation.

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
)

const (
	defaultFactoryPollInterval = 250 * time.Millisecond
	maxFactoryResponseBytes    = 4 << 20
)

// FactoryConfig points a cloud-connected channel at one factory and project.
// Token is the same bearer credential written by tk factory deploy; it is never
// included in an error string or request path.
type FactoryConfig struct {
	URL     string
	Token   string
	Project string

	HTTPClient   *http.Client
	PollInterval time.Duration
}

// FactoryChannel implements operator.Channel through the factory's RunRoom
// pending API. It is safe for concurrent use: ask's consumer and a terminal
// command may share the same channel object in tests, while the RunRoom remains
// the authority for cross-process arbitration in production.
type FactoryChannel struct {
	baseURL  string
	token    string
	project  string
	client   *http.Client
	interval time.Duration

	mu   sync.Mutex
	seen map[string]struct{}
	refs map[operator.MessageRef]string
}

// NewFactoryChannel validates a factory channel configuration.
func NewFactoryChannel(cfg FactoryConfig) (*FactoryChannel, error) {
	base := strings.TrimRight(strings.TrimSpace(cfg.URL), "/")
	if base == "" {
		return nil, errors.New("factory: URL is required")
	}
	parsed, err := url.Parse(base)
	if err != nil || parsed.Scheme != "https" && parsed.Scheme != "http" || parsed.Host == "" {
		return nil, fmt.Errorf("factory: invalid URL %q", cfg.URL)
	}
	if strings.TrimSpace(cfg.Token) == "" {
		return nil, errors.New("factory: token is required")
	}
	project := strings.Trim(strings.TrimSpace(cfg.Project), "/")
	parts := strings.Split(project, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("factory: project must be owner/repo, got %q", cfg.Project)
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{}
	}
	interval := cfg.PollInterval
	if interval <= 0 {
		interval = defaultFactoryPollInterval
	}
	return &FactoryChannel{
		baseURL:  base,
		token:    cfg.Token,
		project:  project,
		client:   client,
		interval: interval,
		seen:     make(map[string]struct{}),
		refs:     make(map[operator.MessageRef]string),
	}, nil
}

// Project is the canonical owner/repo this channel addresses.
func (c *FactoryChannel) Project() string { return c.project }

// Send posts a completion or one-way report to the paired Telegram chat.
func (c *FactoryChannel) Send(ctx context.Context, text string) error {
	return c.sendReport(ctx, operator.MessageRef{}, text)
}

// SendReply posts a completion report threaded under a Telegram message. It is
// an optional capability used by the cloud Workflow's completion path.
func (c *FactoryChannel) SendReply(ctx context.Context, ref operator.MessageRef, text string) error {
	return c.sendReport(ctx, ref, text)
}

func (c *FactoryChannel) sendReport(ctx context.Context, ref operator.MessageRef, text string) error {
	var reply *operator.MessageRef
	if !ref.IsZero() {
		reply = &ref
	}
	_, err := c.do(ctx, http.MethodPost, c.projectPath("reports"), struct {
		Text string               `json:"text"`
		Ref  *operator.MessageRef `json:"ref,omitempty"`
	}{Text: text, Ref: reply}, nil)
	return err
}

// RegisterPending mirrors the complete local pending entry into RunRoom. The
// Worker then delivers it to Telegram and records the returned MessageRef in
// the same DO row before this method returns.
func (c *FactoryChannel) RegisterPending(ctx context.Context, pending operator.Pending) (operator.MessageRef, error) {
	var response struct {
		Entry operator.Pending `json:"entry"`
	}
	_, err := c.do(ctx, http.MethodPost, c.projectPath("pending"), struct {
		ID          string               `json:"id"`
		TickID      string               `json:"tick_id,omitempty"`
		AgentTarget string               `json:"agent_target,omitempty"`
		Kind        operator.PendingKind `json:"kind"`
		Awaiting    string               `json:"awaiting,omitempty"`
		Question    operator.Question    `json:"question"`
		NotBefore   time.Time            `json:"not_before,omitzero"`
		Notify      string               `json:"notify"`
	}{
		ID: pending.ID, TickID: pending.TickID, AgentTarget: pending.AgentTarget,
		Kind: pending.Kind, Awaiting: pending.Awaiting, Question: pending.Question,
		NotBefore: pending.NotBefore, Notify: "telegram",
	}, &response)
	if err != nil {
		var already *FactoryAlreadyRegisteredError
		if errors.As(err, &already) && !already.Entry.Ref.IsZero() {
			c.rememberRef(already.Entry.ID, already.Entry.Ref)
			return already.Entry.Ref, nil
		}
		return operator.MessageRef{}, err
	}
	if response.Entry.Ref.IsZero() {
		return operator.MessageRef{}, errors.New("factory: pending question was registered without a Telegram message ref")
	}
	c.rememberRef(response.Entry.ID, response.Entry.Ref)
	return response.Entry.Ref, nil
}

// AskDeliver is the interface-compatible fallback for callers that only have a
// display question. Consumer.Deliver uses RegisterPending when available, so
// normal cloud asks preserve tick/kind metadata as well.
func (c *FactoryChannel) AskDeliver(ctx context.Context, q operator.Question) (operator.MessageRef, error) {
	if q.ID == "" {
		id, err := operator.NewQuestionID()
		if err != nil {
			return operator.MessageRef{}, err
		}
		q.ID = id
	}
	kind := operator.PendingAsk
	if len(q.Options) == 2 && q.Options[0].ID == operator.OptionApprove && q.Options[1].ID == operator.OptionReject {
		kind = operator.PendingGate
	}
	return c.RegisterPending(ctx, operator.Pending{ID: q.ID, Kind: kind, Question: q})
}

// Adopt is intentionally a no-op: RunRoom already stores the question and
// Telegram's webhook uses the durable ref, so there is no process-local button
// state to rebuild.
func (c *FactoryChannel) Adopt(operator.MessageRef, operator.Question) error { return nil }

// Resolve asks the Worker to render a local/out-of-band resolution on Telegram.
// Phone and terminal answers are settled by their answering route; this call is
// the cloud waiter's idempotent final reconciliation.
func (c *FactoryChannel) Resolve(ctx context.Context, ref operator.MessageRef, outcome operator.Outcome) error {
	if ref.IsZero() {
		return fmt.Errorf("factory: no pending question for message ref %+v", ref)
	}
	c.mu.Lock()
	id := c.refs[ref]
	c.mu.Unlock()
	if id == "" {
		entries, err := c.ListPending(ctx, "")
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if entry.Ref == ref {
				id = entry.ID
				break
			}
		}
	}
	if id == "" {
		return fmt.Errorf("factory: no pending question for message ref %+v", ref)
	}
	_, err := c.do(ctx, http.MethodPost, c.projectPath("pending", id, "settle"), struct {
		Outcome operator.Outcome `json:"outcome"`
	}{Outcome: outcome}, nil)
	return err
}

// ListPending returns the RunRoom's durable entries. Resolved entries are
// included so tk answer can tell a terminal user who won on Telegram.
func (c *FactoryChannel) ListPending(ctx context.Context, tickID string) ([]operator.Pending, error) {
	query := "?include_resolved=true"
	if tickID != "" {
		query += "&tick_id=" + url.QueryEscape(tickID)
	}
	var response struct {
		Pending []operator.Pending `json:"pending"`
	}
	_, err := c.do(ctx, http.MethodGet, c.projectPath("pending")+query, nil, &response)
	return response.Pending, err
}

// Answer resolves one entry as a terminal answer. The DO's conditional update
// remains the first-wins arbiter; a loser receives FactoryAlreadyAnsweredError.
func (c *FactoryChannel) Answer(ctx context.Context, id string, outcome operator.Outcome) (operator.Pending, error) {
	var response struct {
		Entry operator.Pending `json:"entry"`
	}
	_, err := c.do(ctx, http.MethodPost, c.projectPath("pending", id, "answer"), struct {
		Outcome operator.Outcome `json:"outcome"`
	}{Outcome: outcome}, &response)
	if err != nil {
		return response.Entry, err
	}
	if response.Entry.Ref.IsZero() == false {
		c.rememberRef(response.Entry.ID, response.Entry.Ref)
	}
	return response.Entry, nil
}

// Events watches resolved remote entries and translates them into the neutral
// operator stream. In particular, it preserves terminal provenance instead of
// pretending a terminal resolution came from Telegram.
func (c *FactoryChannel) Events(ctx context.Context) <-chan operator.Event {
	out := make(chan operator.Event)
	go func() {
		defer close(out)
		ticker := time.NewTicker(c.interval)
		defer ticker.Stop()
		for {
			if err := c.emitResolved(ctx, out); err != nil {
				if ctx.Err() != nil {
					return
				}
				// A transient factory outage must not turn a live gate into a
				// false answer. Retry on the next sweep; a future ask can report a
				// persistent failure through its normal timeout/error path.
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
	return out
}

func (c *FactoryChannel) emitResolved(ctx context.Context, out chan<- operator.Event) error {
	entries, err := c.ListPending(ctx, "")
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.Resolution == nil || entry.Ref.IsZero() {
			continue
		}
		c.mu.Lock()
		_, seen := c.seen[entry.ID]
		if !seen {
			c.seen[entry.ID] = struct{}{}
		}
		c.mu.Unlock()
		if seen {
			continue
		}
		c.rememberRef(entry.ID, entry.Ref)
		ev := remoteEvent(entry)
		select {
		case out <- ev:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return nil
}

func remoteEvent(entry operator.Pending) operator.Event {
	resolution := entry.Resolution
	ev := operator.Event{
		Ref:        entry.Ref,
		SenderID:   resolution.TelegramUserID,
		AnsweredBy: resolution.AnsweredBy,
		Text:       resolution.Outcome.Text,
		OptionIDs:  append([]string(nil), resolution.Outcome.OptionIDs...),
	}
	switch {
	case entry.Question.MultiSelect:
		ev.Kind = operator.EventMultiSelectCommit
	case len(resolution.Outcome.OptionIDs) > 0:
		ev.Kind = operator.EventOptionPress
	default:
		ev.Kind = operator.EventAnswer
	}
	return ev
}

// FactoryAlreadyRegisteredError is returned when a retry races an existing
// registration. The existing entry is exposed so delivery can reuse its ref.
type FactoryAlreadyRegisteredError struct {
	Detail string
	Entry  operator.Pending
}

func (e *FactoryAlreadyRegisteredError) Error() string {
	if e.Detail != "" {
		return "factory: " + e.Detail
	}
	return "factory: question is already registered"
}

// FactoryAlreadyAnsweredError identifies the winner of the RunRoom race.
type FactoryAlreadyAnsweredError struct {
	Detail string
	Entry  operator.Pending
}

func (e *FactoryAlreadyAnsweredError) Error() string {
	if e.Detail != "" {
		return "factory: " + e.Detail
	}
	return "factory: question was already answered"
}

func (c *FactoryChannel) rememberRef(id string, ref operator.MessageRef) {
	if id == "" || ref.IsZero() {
		return
	}
	c.mu.Lock()
	c.refs[ref] = id
	c.mu.Unlock()
}

func (c *FactoryChannel) projectPath(parts ...string) string {
	segments := strings.Split(c.project, "/")
	all := []string{"api", "projects", segments[0], segments[1]}
	all = append(all, parts...)
	for i, segment := range all {
		all[i] = url.PathEscape(segment)
	}
	return "/" + path.Join(all...)
}

func (c *FactoryChannel) do(ctx context.Context, method, endpoint string, body any, out any) (int, error) {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return 0, fmt.Errorf("factory: encoding request: %w", err)
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+endpoint, reader)
	if err != nil {
		return 0, fmt.Errorf("factory: creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("factory: request: %w", err)
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(io.LimitReader(resp.Body, maxFactoryResponseBytes))
	if readErr != nil {
		return resp.StatusCode, fmt.Errorf("factory: reading response: %w", readErr)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, c.remoteError(resp.StatusCode, data)
	}
	if out != nil && len(bytes.TrimSpace(data)) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			return resp.StatusCode, fmt.Errorf("factory: decoding response: %w", err)
		}
	}
	return resp.StatusCode, nil
}

func (c *FactoryChannel) remoteError(status int, data []byte) error {
	var payload struct {
		Error  string           `json:"error"`
		Detail string           `json:"detail"`
		Entry  operator.Pending `json:"entry"`
	}
	_ = json.Unmarshal(data, &payload)
	switch payload.Error {
	case "already_registered":
		return &FactoryAlreadyRegisteredError{Detail: payload.Detail, Entry: payload.Entry}
	case "already_answered":
		return &FactoryAlreadyAnsweredError{Detail: payload.Detail, Entry: payload.Entry}
	}
	detail := strings.TrimSpace(payload.Detail)
	if detail == "" {
		detail = strings.TrimSpace(payload.Error)
	}
	if detail == "" {
		detail = http.StatusText(status)
	}
	return fmt.Errorf("factory: %s: %s", http.StatusText(status), detail)
}
