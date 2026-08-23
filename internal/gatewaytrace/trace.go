// Package gatewaytrace reads a cloud run's model conversation back out of the
// operator's AI Gateway logs.
//
// D1 holds control-plane state only — runs, signals, dispatch_log,
// run_gateway_token, run_image, run_progress — and deliberately no messages.
// The conversation is not missing, though: every model call a run makes is
// proxied through the operator's own AI Gateway (D17), which keeps the request
// and response bodies and lets them be filtered by the `run_id` the proxy
// stamps into `cf-aig-metadata`. This package is the reader for that record.
//
// Two things make the reader less obvious than "GET the response bodies":
//
//   - **Responses are streamed, so they arrive empty.** A log row's response
//     body has `choices[0].message.content: null` and `tool_calls: null` for
//     every streamed call, which is all of them. Reading the response and
//     concluding the model emitted nothing is wrong. What the model actually
//     said is recovered from the *request* bodies instead: an agentic harness
//     replays the whole conversation on every call, so each request carries the
//     assistant turns (and their tool calls) from every call before it.
//     Reconstruct walks the requests in order and keeps each message the first
//     time it appears.
//
//   - **Cached tokens live on the log row, not in the body.** Prefix caching is
//     reported as `usage_metadata.input_cached_tokens`, which is the only place
//     the hit rate can be measured from — the acceptance criterion behind the
//     caching work (tick l8z).
//
// The credentials are the operator's own, read from ~/.ticksrc: the gateway URL
// names the Cloudflare account and gateway, and the Cloudflare API token is the
// same one `tk factory setup --cloudflare-api-token` verified against this
// gateway's logs. Nothing here talks to the factory Worker, and nothing here
// can steer a run — see the D21 note in docs/design/cloud-factory.md.
package gatewaytrace

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// DefaultAPIBase is Cloudflare's REST root, matching internal/factory.
const DefaultAPIBase = "https://api.cloudflare.com/client/v4"

// PageSize mirrors GATEWAY_LOG_MAX_PAGE_SIZE in cloud/factory/src/gateway.ts:
// the logs API answers `per_page=51` with HTTP 400 "Number must be less than or
// equal to 50". It is the API's limit, not a policy of ours.
const PageSize = 50

// MaxPages mirrors MAX_LOG_PAGES in cloud/factory/src/gateway.ts. Reaching it
// is a failure rather than a total: a truncated read presented as a complete
// trace is the same shape of wrongness that let a truncated cost query pass a
// budget it had already blown.
const MaxPages = 200

// Config is everything needed to read one gateway's logs.
type Config struct {
	// APIBase is Cloudflare's REST root; empty means DefaultAPIBase.
	APIBase string
	// Account and Gateway come out of the operator's AI Gateway base URL.
	Account string
	Gateway string
	// Token is a Cloudflare API token with AI Gateway read access.
	Token string
}

// GatewayIDs pulls the account and gateway out of a Cloudflare AI Gateway base
// URL (https://gateway.ai.cloudflare.com/v1/<account>/<gateway>). A gateway
// hosted anywhere else has no logs API to read, which the caller reports rather
// than guessing at.
func GatewayIDs(gatewayURL string) (account, gateway string, ok bool) {
	parsed, err := url.Parse(strings.TrimSpace(gatewayURL))
	if err != nil {
		return "", "", false
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 3 || parts[0] != "v1" || parts[1] == "" || parts[2] == "" {
		return "", "", false
	}
	return parts[1], parts[2], true
}

// ConfigFrom builds a Config from ~/.ticksrc.
//
// Each refusal names the command that fixes it and says which half is missing:
// a factory that routes model traffic but was never given a log-reading token
// is a normal, documented state (cost telemetry is optional), and "no trace" is
// not the same fact as "no factory".
func ConfigFrom(file *ticksrc.File) (Config, error) {
	gatewayURL := strings.TrimSpace(file.Get(ticksrc.KeyFactoryGatewayURL))
	if gatewayURL == "" {
		return Config{}, fmt.Errorf(
			"no AI Gateway is configured, so this run's model conversation cannot be read; run 'tk factory setup' first")
	}
	account, gateway, ok := GatewayIDs(gatewayURL)
	if !ok {
		return Config{}, fmt.Errorf(
			"the configured gateway does not name a Cloudflare account and gateway, so its logs cannot be read; "+
				"point it at https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway> with 'tk factory setup' (got %q)",
			gatewayURL)
	}
	token := strings.TrimSpace(file.Get(ticksrc.KeyFactoryCloudflareAPIToken))
	if token == "" {
		return Config{}, fmt.Errorf(
			"no Cloudflare API token is configured, so the AI Gateway logs this trace reads cannot be reached; " +
				"run 'tk factory setup --cloudflare-api-token <token>'")
	}
	return Config{Account: account, Gateway: gateway, Token: token}, nil
}

// Client reads one gateway's logs.
type Client struct {
	config Config
	http   *http.Client
}

// New builds a Client. A nil http client gets one with a bounded timeout.
func New(config Config, client *http.Client) *Client {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	if strings.TrimSpace(config.APIBase) == "" {
		config.APIBase = DefaultAPIBase
	}
	config.APIBase = strings.TrimRight(config.APIBase, "/")
	return &Client{config: config, http: client}
}

// Call is one proxied model call: the log row, never a body.
type Call struct {
	// Index is 1-based in chronological order — the number `--call N` takes.
	Index int    `json:"call"`
	ID    string `json:"id"`
	// CreatedAt is the row's timestamp verbatim; Time is it parsed, zero when
	// it is not RFC3339.
	CreatedAt string    `json:"created_at"`
	Time      time.Time `json:"-"`
	Model     string    `json:"model"`
	Provider  string    `json:"provider"`
	Success   bool      `json:"success"`
	// Cached is the gateway's RESPONSE cache, which never helps an agentic loop
	// (it never repeats a request). It is not the prefix cache — that is
	// CachedTokens.
	Cached       bool    `json:"cached"`
	Cost         float64 `json:"cost"`
	TokensIn     int     `json:"tokens_in"`
	TokensOut    int     `json:"tokens_out"`
	CachedTokens int     `json:"cached_tokens"`
	DurationMS   int     `json:"duration_ms"`
	RunID        string  `json:"run_id"`
	TickID       string  `json:"tick_id,omitempty"`
	// TraceID is the identifier that joins this call to the message that
	// caused the run and to the container that made it (D20, tick hyi). It is
	// stamped on every proxied request by the factory's gateway proxy, out of
	// the RUN ROW rather than out of anything a caller sent, so an agent
	// cannot file its own spend under somebody else's chain.
	//
	// Empty for a call made by a run that predates trace ids. Empty rather
	// than a placeholder, so "this run had no chain" and "this call belongs to
	// chain X" stay different answers.
	TraceID string `json:"trace_id,omitempty"`
	// Raw is the log row exactly as the API sent it, for --json.
	Raw json.RawMessage `json:"-"`
}

// CacheRate is the share of this call's input tokens served from the prefix
// cache. A call with no input tokens has no rate rather than a zero one.
func (c Call) CacheRate() (float64, bool) {
	if c.TokensIn <= 0 {
		return 0, false
	}
	return float64(c.CachedTokens) / float64(c.TokensIn), true
}

// Totals is the run-level roll-up of its calls.
type Totals struct {
	Calls        int     `json:"calls"`
	TokensIn     int     `json:"tokens_in"`
	TokensOut    int     `json:"tokens_out"`
	CachedTokens int     `json:"cached_tokens"`
	Cost         float64 `json:"cost_usd"`
}

// CacheRate is the run's overall prefix-cache hit rate.
func (t Totals) CacheRate() (float64, bool) {
	if t.TokensIn <= 0 {
		return 0, false
	}
	return float64(t.CachedTokens) / float64(t.TokensIn), true
}

// Sum rolls calls up.
func Sum(calls []Call) Totals {
	total := Totals{Calls: len(calls)}
	for _, call := range calls {
		total.TokensIn += call.TokensIn
		total.TokensOut += call.TokensOut
		total.CachedTokens += call.CachedTokens
		total.Cost += call.Cost
	}
	return total
}

type logRow struct {
	ID            string            `json:"id"`
	CreatedAt     string            `json:"created_at"`
	Model         string            `json:"model"`
	Provider      string            `json:"provider"`
	Success       bool              `json:"success"`
	Cached        bool              `json:"cached"`
	Cost          float64           `json:"cost"`
	TokensIn      int               `json:"tokens_in"`
	TokensOut     int               `json:"tokens_out"`
	Duration      int               `json:"duration"`
	Metadata      map[string]string `json:"metadata"`
	UsageMetadata json.RawMessage   `json:"usage_metadata"`
}

type logPage struct {
	Success *bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
	Result []json.RawMessage `json:"result"`
}

// Calls reads every gateway log row stamped with this run id, oldest first.
//
// The filter is sent to the API *and* re-applied locally: a filter the API
// ignored would otherwise turn one run's trace into the whole gateway's.
func (c *Client) Calls(ctx context.Context, runID string) ([]Call, error) {
	filters, err := json.Marshal(metadataFilters("run_id", runID))
	if err != nil {
		return nil, fmt.Errorf("encode gateway log filters: %w", err)
	}

	calls := make([]Call, 0)
	for page := 1; page <= MaxPages; page++ {
		endpoint := fmt.Sprintf("%s?per_page=%d&page=%d&filters=%s",
			c.logsURL(), PageSize, page, url.QueryEscape(string(filters)))
		body, err := c.get(ctx, endpoint)
		if err != nil {
			return nil, err
		}
		var payload logPage
		if err := json.Unmarshal(body, &payload); err != nil {
			return nil, fmt.Errorf("decode the AI Gateway logs response: %w", err)
		}
		if payload.Success != nil && !*payload.Success {
			message := "the API reported failure"
			if len(payload.Errors) > 0 && payload.Errors[0].Message != "" {
				message = payload.Errors[0].Message
			}
			return nil, fmt.Errorf("the AI Gateway logs API refused this query: %s", message)
		}

		for _, raw := range payload.Result {
			var row logRow
			if err := json.Unmarshal(raw, &row); err != nil {
				return nil, fmt.Errorf("decode an AI Gateway log row: %w", err)
			}
			// Defensive: only this run's calls belong in this run's trace.
			if row.Metadata["run_id"] != runID {
				continue
			}
			call := Call{
				ID:           row.ID,
				CreatedAt:    row.CreatedAt,
				Model:        row.Model,
				Provider:     row.Provider,
				Success:      row.Success,
				Cached:       row.Cached,
				Cost:         row.Cost,
				TokensIn:     row.TokensIn,
				TokensOut:    row.TokensOut,
				CachedTokens: cachedTokens(row.UsageMetadata),
				DurationMS:   row.Duration,
				RunID:        row.Metadata["run_id"],
				TickID:       row.Metadata["tick_id"],
				TraceID:      row.Metadata["trace_id"],
				Raw:          append(json.RawMessage(nil), raw...),
			}
			if parsed, err := time.Parse(time.RFC3339, row.CreatedAt); err == nil {
				call.Time = parsed
			}
			calls = append(calls, call)
		}

		// A page shorter than the one asked for is the only end-of-log signal
		// this API gives: it sends no `total_pages`, and reading one (absent,
		// so defaulted to 1) is what once ended a paged read after 50 of 892
		// rows.
		if len(payload.Result) < PageSize {
			return order(calls), nil
		}
	}

	return nil, fmt.Errorf(
		"run %s has more than %d AI Gateway log rows, which is more than one trace read pages through; "+
			"what was read is a floor rather than this run's calls, so it is not shown — "+
			"read it from the AI Gateway dashboard instead",
		runID, MaxPages*PageSize)
}

// order sorts calls oldest first and numbers them. The logs API answers newest
// first, and a conversation read backwards is not a conversation.
func order(calls []Call) []Call {
	sort.SliceStable(calls, func(i, j int) bool {
		if calls[i].Time.Equal(calls[j].Time) {
			return calls[i].ID < calls[j].ID
		}
		return calls[i].Time.Before(calls[j].Time)
	})
	for i := range calls {
		calls[i].Index = i + 1
	}
	return calls
}

// cachedTokens reads usage_metadata.input_cached_tokens, the prefix-cache
// counter. The field is accepted as an object or as a JSON string holding one,
// because gateway metadata is stringified on some rungs and not on others, and
// a trace that silently reported 0% for a run that was in fact caching would
// answer the caching question backwards.
func cachedTokens(raw json.RawMessage) int {
	if len(raw) == 0 {
		return 0
	}
	var usage struct {
		InputCachedTokens int `json:"input_cached_tokens"`
	}
	if err := json.Unmarshal(raw, &usage); err == nil {
		return usage.InputCachedTokens
	}
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return 0
	}
	if err := json.Unmarshal([]byte(encoded), &usage); err != nil {
		return 0
	}
	return usage.InputCachedTokens
}

// RequestBody is the body the gateway forwarded upstream for one call: the
// whole message array, which is where a run's conversation actually lives.
func (c *Client) RequestBody(ctx context.Context, callID string) (json.RawMessage, error) {
	return c.detail(ctx, callID, "request")
}

// ResponseBody is the body the provider answered with. For a streamed call —
// which is every call an agent harness makes — its `choices[0].message` is
// empty, so it is useful for usage and status and never for content.
func (c *Client) ResponseBody(ctx context.Context, callID string) (json.RawMessage, error) {
	return c.detail(ctx, callID, "response")
}

func (c *Client) detail(ctx context.Context, callID, kind string) (json.RawMessage, error) {
	body, err := c.get(ctx, c.logsURL()+"/"+url.PathEscape(callID)+"/"+kind)
	if err != nil {
		return nil, err
	}
	return unwrap(body), nil
}

// unwrap tolerates both shapes the detail endpoints answer in: the provider
// body directly, or Cloudflare's `{success, result}` envelope around it.
func unwrap(body []byte) json.RawMessage {
	var envelope struct {
		Success *bool           `json:"success"`
		Result  json.RawMessage `json:"result"`
	}
	if err := json.Unmarshal(body, &envelope); err == nil && envelope.Success != nil && len(envelope.Result) > 0 {
		var encoded string
		if err := json.Unmarshal(envelope.Result, &encoded); err == nil && json.Valid([]byte(encoded)) {
			return json.RawMessage(encoded)
		}
		return envelope.Result
	}
	return json.RawMessage(body)
}

func (c *Client) logsURL() string {
	return fmt.Sprintf("%s/accounts/%s/ai-gateway/gateways/%s/logs",
		c.config.APIBase, url.PathEscape(c.config.Account), url.PathEscape(c.config.Gateway))
}

func (c *Client) get(ctx context.Context, endpoint string) ([]byte, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create the AI Gateway logs request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+c.config.Token)
	request.Header.Set("Accept", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("the AI Gateway logs API could not be reached: %w", err)
	}
	defer func() { _ = response.Body.Close() }()
	body, readErr := io.ReadAll(io.LimitReader(response.Body, 16<<20))
	if readErr != nil {
		return nil, fmt.Errorf("read the AI Gateway logs response: %w", readErr)
	}
	if response.StatusCode >= 300 {
		// The status alone hides why: a rejected filter and a revoked token
		// both read as "no trace" otherwise.
		switch {
		case response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden:
			return nil, fmt.Errorf(
				"the AI Gateway logs API rejected this Cloudflare API token (%s); it needs AI Gateway read access — "+
					"reconfigure it with 'tk factory setup --cloudflare-api-token <token>'", response.Status)
		case response.StatusCode == http.StatusNotFound:
			return nil, fmt.Errorf("the AI Gateway logs API answered %s: no gateway %q in account %s",
				response.Status, c.config.Gateway, c.config.Account)
		default:
			return nil, fmt.Errorf("the AI Gateway logs API answered %s: %s",
				response.Status, strings.TrimSpace(string(body)))
		}
	}
	return body, nil
}

// GatewayLogFilter is one clause of the logs API's `filters` parameter.
type GatewayLogFilter struct {
	Key      string   `json:"key"`
	Operator string   `json:"operator"`
	Value    []string `json:"value"`
}

// metadataFilters selects the rows one piece of request attribution owns.
//
// Metadata is two parallel columns here, not a dotted key: the API knows
// `metadata.key` and `metadata.value` and answers a `metadata.run_id` filter
// with error 7001 over an HTTP 400. This is the same pair
// cloud/factory/src/gateway.ts sends, and trace_test.go pins them together.
func metadataFilters(name, value string) []GatewayLogFilter {
	return []GatewayLogFilter{
		{Key: "metadata.key", Operator: "eq", Value: []string{name}},
		{Key: "metadata.value", Operator: "eq", Value: []string{value}},
	}
}
