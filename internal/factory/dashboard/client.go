package dashboard

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// defaultHarnessBytes is what a Loader reads when its caller leaves
// HarnessBytes zero — a screenful of scrollback, not a log dump. It is the
// library's own fallback, not a published default: `tk factory dashboard`
// owns the default for its `--tail-bytes` flag (defaultFactoryDashboardTailBytes
// in cmd/tk/cmd/factory_dashboard.go), so the always-compiled root command
// does not import this package to reset one flag.
const defaultHarnessBytes = 64 << 10

// Run is the factory's run index row, as `GET /api/observe` reports it.
type Run struct {
	RunID       string  `json:"run_id"`
	Project     string  `json:"project"`
	Epic        string  `json:"epic"`
	BaseSHA     string  `json:"base_sha"`
	RequestedBy string  `json:"requested_by"`
	State       string  `json:"state"`
	StartedAt   string  `json:"started_at"`
	EndedAt     string  `json:"ended_at"`
	CostUSD     float64 `json:"cost_usd"`
}

// Active reports whether the run is one the factory still considers live. It
// mirrors ACTIVE_RUN_STATES in cloud/factory/src/runs.ts.
func (r Run) Active() bool {
	switch r.State {
	case "starting", "running", "stopping":
		return true
	}
	return false
}

// Lease is the project's dispatch lease as everyone but its holder sees it —
// the fencing token is never served (see cloud/factory/src/run-room.ts).
type Lease struct {
	RunID       string `json:"run_id"`
	Epic        string `json:"epic"`
	Origin      string `json:"origin"`
	RequestedBy string `json:"requested_by"`
	AcquiredAt  string `json:"acquired_at"`
	ExpiresAt   string `json:"expires_at"`
}

// Queued is a submission parked behind the lease.
type Queued struct {
	RunID     string `json:"run_id"`
	Project   string `json:"project"`
	Epic      string `json:"epic"`
	BlockedBy string `json:"blocked_by"`
	QueuedAt  string `json:"queued_at"`
	ExpiresAt string `json:"expires_at"`
}

// ProjectStatus is one project's arbiter state.
type ProjectStatus struct {
	Project string   `json:"project"`
	Lease   *Lease   `json:"lease"`
	Queued  []Queued `json:"queued"`
}

// Workflow is the Run Workflow instance a run is executing.
type Workflow struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// Phase is where in the Workflow a run is.
type Phase struct {
	State    string    `json:"state"`
	Workflow *Workflow `json:"workflow"`
}

// Image is the orchestrator container image a run actually booted. The digest
// is here because a rollout is asynchronous, and an invisible digest turns
// "the fix was never running" into "the fix did not work" (tick z1b).
type Image struct {
	Ref    string `json:"image_ref"`
	Digest string `json:"image_digest"`
}

// Boot is which boot attempt a run is on, derived from the gateway credentials
// it was issued — one rotation per boot, and never a token hash.
type Boot struct {
	Attempt      int    `json:"attempt"`
	Boots        int    `json:"boots"`
	LastIssuedAt string `json:"last_issued_at"`
}

// Progress is what the durable layer said about a finished run.
type Progress struct {
	Progress string `json:"progress"`
	Detail   string `json:"detail"`
}

// Stop is a recorded stop request.
type Stop struct {
	Mode        string `json:"mode"`
	RequestedBy string `json:"requested_by"`
	RequestedAt string `json:"requested_at"`
}

// Gate is one pending question as the factory's Worker reports it, mirroring
// `PendingEntry` in cloud/factory/src/run-room.ts.
//
// This is a WIRE type, not a borrowed tracker type. The board only ever
// DECODES it out of `GET /api/observe`; it never registers, answers or stores
// a question. The Worker is the other end, so the Worker's shape — not the
// tracker's — is what this has to match, and the two differ: the Worker
// carries an `epic` the tracker's own entry does not, because a chat serving
// many projects has to name project + epic + tick. Field names are those the
// deployed Worker already sends, so the wire format is byte-identical and no
// Worker change is needed.
type Gate struct {
	ID     string `json:"id"`
	TickID string `json:"tick_id,omitempty"`
	// Epic is the epic the question was asked from. The Worker adds it; the
	// tracker's entry has no such field.
	Epic string `json:"epic,omitempty"`
	// AgentTarget correlates an agent-relay question, which has no tick id.
	AgentTarget string         `json:"agent_target,omitempty"`
	Kind        GateKind       `json:"kind"`
	Awaiting    string         `json:"awaiting,omitempty"`
	Question    GateQuestion   `json:"question"`
	Ref         GateMessageRef `json:"ref,omitzero"`
	CreatedAt   string         `json:"created_at"`
	NotBefore   string         `json:"not_before,omitempty"`
	// Resolution is nil until the question is answered or ruled moot.
	Resolution *GateResolution `json:"resolution,omitempty"`
}

// GateKind says whether a gate's answer is a note, a verdict, or a reply
// relayed to an agent.
type GateKind string

const (
	// GateAsk is a question whose answer becomes a note on the tick.
	GateAsk GateKind = "ask"
	// GateApproval is an approval gate: the answer is a verdict.
	GateApproval GateKind = "gate"
	// GateAgentRelay is a question answered back to a running agent.
	GateAgentRelay GateKind = "agent_relay"
)

// GateAnsweredBy records which surface produced a resolution.
type GateAnsweredBy string

const (
	// GateAnsweredByTelegram means the operator answered on the channel.
	GateAnsweredByTelegram GateAnsweredBy = "telegram"
	// GateAnsweredByTerminal means the answer came from a local surface.
	GateAnsweredByTerminal GateAnsweredBy = "terminal"
	// GateAnsweredByOutOfBand means nobody answered: the tick left the state
	// it was waiting on, so the question is moot.
	GateAnsweredByOutOfBand GateAnsweredBy = "out_of_band"
)

// GateQuestion is what the operator was asked.
type GateQuestion struct {
	ID     string `json:"id,omitempty"`
	Header string `json:"header,omitempty"`
	Text   string `json:"text"`
	// Options carry only id and label on this wire: the Worker's
	// `QuestionOption` has no description field, so nothing sends one.
	Options     []GateOption `json:"options,omitempty"`
	MultiSelect bool         `json:"multi_select,omitempty"`
	AllowOther  bool         `json:"allow_other,omitempty"`
}

// GateOption is one offered answer.
type GateOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// GateMessageRef is the delivered channel message, zero until delivery.
type GateMessageRef struct {
	ChannelID string `json:"channel_id,omitempty"`
	MessageID string `json:"message_id,omitempty"`
}

// IsZero reports whether the ref is unset.
func (r GateMessageRef) IsZero() bool { return r == GateMessageRef{} }

// GateResolution is how a question ended.
type GateResolution struct {
	Outcome        GateOutcome    `json:"outcome"`
	AnsweredBy     GateAnsweredBy `json:"answered_by"`
	TelegramUserID string         `json:"telegram_user_id,omitempty"`
	AnsweredAt     string         `json:"answered_at"`
	AppliedAt      string         `json:"applied_at,omitempty"`
}

// GateOutcome is the answer itself.
type GateOutcome struct {
	Status    string   `json:"status"`
	Text      string   `json:"text,omitempty"`
	OptionIDs []string `json:"option_ids,omitempty"`
}

// Delivered reports whether the question has reached the channel.
func (g Gate) Delivered() bool { return !g.Ref.IsZero() }

// Resolved reports whether the question has been answered or ruled moot.
func (g Gate) Resolved() bool { return g.Resolution != nil }

// Focus is everything the factory knows about the one run being watched.
type Focus struct {
	Run      Run       `json:"run"`
	Phase    Phase     `json:"phase"`
	Lease    *Lease    `json:"lease"`
	Queued   []Queued  `json:"queued"`
	Gates    []Gate    `json:"gates"`
	Stop     *Stop     `json:"stop"`
	Image    *Image    `json:"image"`
	Progress *Progress `json:"progress"`
	Boot     Boot      `json:"boot"`
}

// Refusal is one row of dispatch_log: what the deterministic policy decided
// and why. A refused submission never becomes a run, so this is the only
// record that it was ever asked for.
type Refusal struct {
	RunID    string `json:"run_id"`
	TickID   string `json:"tick_id"`
	Decision string `json:"decision"`
	Reason   string `json:"reason"`
	At       string `json:"at"`
}

// Refused reports whether this decision declined work, which is what the board
// shows: an ignition is already visible as a run.
func (r Refusal) Refused() bool { return strings.TrimSpace(r.Reason) != "" }

// Event is one forwarded run_event, as the RunRoom's tail keeps it (tick bne).
// It is the protocol's own vocabulary, not a second one: type, source, status
// and message come straight off `RunEventMessage`.
type Event struct {
	At        string `json:"at"`
	Epic      string `json:"epic"`
	Tick      string `json:"tick"`
	Source    string `json:"source"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	Message   string `json:"message"`
	Delivered bool   `json:"delivered"`
}

// Observation is one board frame: everything `GET /api/observe` answers with.
type Observation struct {
	ObservedAt    string          `json:"observed_at"`
	Runs          []Run           `json:"runs"`
	Projects      []ProjectStatus `json:"projects"`
	Dispatch      []Refusal       `json:"dispatch"`
	EventsProject string          `json:"events_project"`
	Events        []Event         `json:"events"`
	// Gates are the project's pending questions. They hang off the PROJECT
	// rather than a run: a question outlives the run that asked it, and a
	// factory with nothing running can still have one parked in front of it.
	Gates        []Gate `json:"gates"`
	EventsDetail string `json:"events_detail"`
	Focus        *Focus `json:"focus"`
}

// Harness is the tail of a run's R2 output stream.
type Harness struct {
	RunID      string `json:"run_id"`
	Project    string `json:"project"`
	State      string `json:"state"`
	Text       string `json:"text"`
	Bytes      int    `json:"bytes"`
	TotalBytes int    `json:"total_bytes"`
	Truncated  bool   `json:"truncated"`
}

// ObserveQuery bounds one frame. Zero fields take the factory's defaults.
type ObserveQuery struct {
	Project  string
	Run      string
	Runs     int
	Events   int
	Dispatch int
}

// Client reads a deployed factory. It is READ-ONLY by construction: every
// method issues a GET, and there is no method here that posts, so a dashboard
// built on it cannot start, stop or steer a run however it is driven (D21).
type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

// NewClient builds a client for a factory endpoint and its bearer token.
func NewClient(baseURL, token string, httpClient *http.Client) (*Client, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	token = strings.TrimSpace(token)
	if baseURL == "" || token == "" {
		return nil, fmt.Errorf("no factory is configured; run 'tk factory setup' first")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("factory endpoint is invalid; run 'tk factory setup' to configure it")
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{baseURL: baseURL, token: token, http: httpClient}, nil
}

// Endpoint is the factory this client reads, for the board's header.
func (c *Client) Endpoint() string { return c.baseURL }

// APIError is a factory answer that was not a 2xx.
type APIError struct {
	Status int
	Detail string
}

func (e APIError) Error() string {
	if e.Detail == "" {
		return fmt.Sprintf("factory returned HTTP %d", e.Status)
	}
	return fmt.Sprintf("factory returned HTTP %d: %s", e.Status, e.Detail)
}

func (c *Client) get(ctx context.Context, path string, into any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("create factory request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("factory GET %s failed: %w", path, err)
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if readErr != nil {
		return fmt.Errorf("read factory response: %w", readErr)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return APIError{Status: resp.StatusCode, Detail: apiDetail(data)}
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, into); err != nil {
		return fmt.Errorf("decode factory response: %w", err)
	}
	return nil
}

func apiDetail(body []byte) string {
	var response struct {
		Error  string `json:"error"`
		Detail string `json:"detail"`
	}
	_ = json.Unmarshal(body, &response)
	for _, candidate := range []string{response.Detail, response.Error, string(body)} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

// Observe reads one board frame.
func (c *Client) Observe(ctx context.Context, query ObserveQuery) (Observation, error) {
	values := url.Values{}
	if query.Project != "" {
		values.Set("project", query.Project)
	}
	if query.Run != "" {
		values.Set("run", query.Run)
	}
	for name, value := range map[string]int{"runs": query.Runs, "events": query.Events, "dispatch": query.Dispatch} {
		if value > 0 {
			values.Set(name, strconv.Itoa(value))
		}
	}
	path := "/api/observe"
	if encoded := values.Encode(); encoded != "" {
		path += "?" + encoded
	}
	var observation Observation
	if err := c.get(ctx, path, &observation); err != nil {
		return Observation{}, err
	}
	return observation, nil
}

// Harness reads the tail of a run's stored output. It is bounded from the END:
// what a run being debugged is read for is what it just printed.
func (c *Client) Harness(ctx context.Context, runID string, maxBytes int) (Harness, error) {
	path := "/api/runs/" + url.PathEscape(runID) + "/logs"
	if maxBytes > 0 {
		path += "?max_bytes=" + strconv.Itoa(maxBytes)
	}
	var harness Harness
	if err := c.get(ctx, path, &harness); err != nil {
		return Harness{}, err
	}
	return harness, nil
}
