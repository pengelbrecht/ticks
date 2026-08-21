package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// The AI Gateway logs API, stood up in-process. The rows are shaped like the
// live ones, including the part that matters most: a streamed response body,
// whose choices carry no content at all.
type traceGatewayRequest struct {
	Path  string
	Query url.Values
	Auth  string
}

func newTraceGateway(t *testing.T, handler func(traceGatewayRequest) (int, any)) *[]traceGatewayRequest {
	t.Helper()
	var mu sync.Mutex
	seen := make([]traceGatewayRequest, 0)
	previous := cloudTraceHTTPClient
	cloudTraceHTTPClient = &http.Client{Transport: cloudRoundTripper(func(r *http.Request) (*http.Response, error) {
		mu.Lock()
		seen = append(seen, traceGatewayRequest{Path: r.URL.Path, Query: r.URL.Query(), Auth: r.Header.Get("Authorization")})
		mu.Unlock()

		status, body := handler(traceGatewayRequest{Path: r.URL.Path, Query: r.URL.Query()})
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		return &http.Response{
			StatusCode: status,
			Status:     http.StatusText(status),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(string(encoded))),
			Request:    r,
		}, nil
	})}
	t.Cleanup(func() { cloudTraceHTTPClient = previous })
	return &seen
}

func configureTraceGateway(t *testing.T) {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryURL, "https://factory.test")
	config.Set(ticksrc.KeyFactoryToken, "tkf_test-token")
	config.Set(ticksrc.KeyFactoryGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-id/ticks-gw")
	config.Set(ticksrc.KeyFactoryCloudflareAPIToken, "cf-test-token")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
	}
}

func traceRow(id, created string, tokensIn, cached, tokensOut int, cost float64) map[string]any {
	return map[string]any{
		"id":             id,
		"created_at":     created,
		"model":          "@cf/qwen/qwen3-coder",
		"provider":       "workers-ai",
		"success":        true,
		"cost":           cost,
		"tokens_in":      tokensIn,
		"tokens_out":     tokensOut,
		"duration":       9000,
		"metadata":       map[string]string{"run_id": "run_62c289d1e57942cea5fef6c1a508a0fd", "tick_id": "l4l"},
		"usage_metadata": map[string]any{"input_cached_tokens": cached},
	}
}

// A streamed response, which is every response an agent harness gets: the
// message is there and it is empty.
func streamedResponse() map[string]any {
	return map[string]any{
		"id": "chatcmpl-1",
		"choices": []any{map[string]any{
			"index":         0,
			"finish_reason": "tool_calls",
			"message":       map[string]any{"role": "assistant", "content": nil, "tool_calls": nil},
		}},
		"usage": map[string]any{"prompt_tokens": 40000, "completion_tokens": 120},
	}
}

// The two-call conversation the tests read: call 2's request replays call 1's
// head and adds the assistant turn and its tool result.
func traceRequestBody(call int) map[string]any {
	messages := []any{
		map[string]any{"role": "system", "content": "You are the cloud orchestrator."},
		map[string]any{"role": "user", "content": "Run epic 1vn."},
	}
	if call >= 2 {
		messages = append(messages,
			map[string]any{
				"role":    "assistant",
				"content": "Dispatching wave 1.",
				"tool_calls": []any{map[string]any{
					"id":       "call_a",
					"type":     "function",
					"function": map[string]any{"name": "bash", "arguments": `{"command":"tk herd spawn l4l"}`},
				}},
			},
			map[string]any{"role": "tool", "tool_call_id": "call_a", "content": "spawned l4l"},
		)
	}
	return map[string]any{"model": "@cf/qwen/qwen3-coder", "messages": messages}
}

// Serves a two-call run: rows newest-first (as the live API does), request
// bodies per call, and an empty streamed response for both.
func traceRunGateway(t *testing.T) *[]traceGatewayRequest {
	t.Helper()
	return newTraceGateway(t, func(request traceGatewayRequest) (int, any) {
		switch {
		case strings.HasSuffix(request.Path, "/logs/call2/request"):
			return http.StatusOK, traceRequestBody(2)
		case strings.HasSuffix(request.Path, "/logs/call1/request"):
			return http.StatusOK, traceRequestBody(1)
		case strings.HasSuffix(request.Path, "/response"):
			return http.StatusOK, streamedResponse()
		case strings.HasSuffix(request.Path, "/logs"):
			return http.StatusOK, map[string]any{
				"success": true,
				"result": []any{
					traceRow("call2", "2026-08-20T10:05:00Z", 60000, 0, 240, 0.30),
					traceRow("call1", "2026-08-20T10:00:00Z", 40000, 36800, 120, 0.20),
				},
			}
		}
		return http.StatusNotFound, map[string]any{"success": false}
	})
}

// THE trap this command exists to avoid: responses are streamed, so
// choices[0].message comes back with content null and tool_calls null. A trace
// that read responses would report a model that said nothing. What it said is
// reconstructed from the assistant messages in the request bodies.
func TestCloudTraceReconstructsTheConversationFromRequestBodies(t *testing.T) {
	configureTraceGateway(t)
	seen := traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd"}); err != nil {
		t.Fatalf("cloud trace: %v\n%s", err, buf.String())
	}
	output := buf.String()

	for _, want := range []string{
		"Dispatching wave 1.",             // the assistant turn the response never carried
		"bash",                            // its tool call
		`{"command":"tk herd spawn l4l"}`, // and the arguments
		"spawned l4l",                     // the tool result
		"You are the cloud orchestrator.",
	} {
		if !strings.Contains(output, want) {
			t.Errorf("trace output is missing %q:\n%s", want, output)
		}
	}
	if strings.Count(output, "You are the cloud orchestrator.") != 1 {
		t.Errorf("the replayed system prompt was not deduplicated across calls:\n%s", output)
	}
	if !strings.Contains(output, "responses are streamed") {
		t.Errorf("the output does not say where the conversation came from:\n%s", output)
	}

	// The default view never reads response bodies: they are empty by
	// construction, so fetching them would double the requests to learn nothing.
	for _, request := range *seen {
		if strings.HasSuffix(request.Path, "/response") {
			t.Errorf("the default view read a streamed response body: %s", request.Path)
		}
	}
	if (*seen)[0].Auth != "Bearer cf-test-token" {
		t.Errorf("the trace did not present the operator's Cloudflare API token: %q", (*seen)[0].Auth)
	}
}

// Per-call rates are the point: prefix caching is invalidated by one changed
// token near the head of the prompt, so an average hides exactly the swing
// that says whether it is working.
func TestCloudTraceCacheViewShowsPerCallHitRates(t *testing.T) {
	configureTraceGateway(t)
	seen := traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--cache"}); err != nil {
		t.Fatalf("cloud trace --cache: %v\n%s", err, buf.String())
	}
	output := buf.String()

	if !strings.Contains(output, "92.0%") {
		t.Errorf("the cached call's hit rate is missing:\n%s", output)
	}
	if !strings.Contains(output, "0.0%") {
		t.Errorf("the uncached call is not shown as 0%%:\n%s", output)
	}
	if !strings.Contains(output, "36,800 of 100,000") {
		t.Errorf("the run-level cache total is missing:\n%s", output)
	}
	if !strings.Contains(output, "input_cached_tokens") {
		t.Errorf("the cache view does not name where the number comes from:\n%s", output)
	}

	// The cache table answers its question from the log rows alone; reading
	// bodies for it would be a request per call for nothing.
	for _, request := range *seen {
		if strings.HasSuffix(request.Path, "/request") || strings.HasSuffix(request.Path, "/response") {
			t.Errorf("--cache read a detail body it does not need: %s", request.Path)
		}
	}
}

func TestCloudTraceToolsListsOnlyTheToolCalls(t *testing.T) {
	configureTraceGateway(t)
	traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--tools"}); err != nil {
		t.Fatalf("cloud trace --tools: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "1 tool call") || !strings.Contains(output, "tk herd spawn l4l") {
		t.Fatalf("--tools did not list the tool call:\n%s", output)
	}
	if strings.Contains(output, "You are the cloud orchestrator.") {
		t.Errorf("--tools printed conversation prose:\n%s", output)
	}
}

func TestCloudTraceCallDumpsOneExchangeInFull(t *testing.T) {
	configureTraceGateway(t)
	seen := traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--call", "2"}); err != nil {
		t.Fatalf("cloud trace --call 2: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "call 2 of 2") {
		t.Fatalf("--call did not identify the exchange:\n%s", output)
	}
	if !strings.Contains(output, `{"command":"tk herd spawn l4l"}`) {
		t.Errorf("--call did not print the tool arguments in full:\n%s", output)
	}
	// The response IS shown here — with what it is worth stated, so nobody
	// reads an empty message as a model that produced nothing.
	if !strings.Contains(output, "Response body") || !strings.Contains(output, "chatcmpl-1") {
		t.Errorf("--call did not print the response body:\n%s", output)
	}
	if !strings.Contains(output, "NEXT call's request") {
		t.Errorf("--call does not explain the empty streamed response:\n%s", output)
	}

	reads := 0
	for _, request := range *seen {
		if strings.HasSuffix(request.Path, "/request") || strings.HasSuffix(request.Path, "/response") {
			reads++
			if !strings.Contains(request.Path, "call2") {
				t.Errorf("--call 2 read another call's body: %s", request.Path)
			}
		}
	}
	if reads != 2 {
		t.Errorf("--call read %d bodies, want exactly the one exchange's two", reads)
	}
}

func TestCloudTraceRefusesACallNumberThatDoesNotExist(t *testing.T) {
	configureTraceGateway(t)
	traceRunGateway(t)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--call", "9"})
	if err == nil || !strings.Contains(err.Error(), "no call 9") {
		t.Fatalf("an out-of-range --call is not refused clearly: %v", err)
	}
}

func TestCloudTraceJSONEmitsTheRawGatewayRows(t *testing.T) {
	configureTraceGateway(t)
	traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--json"}); err != nil {
		t.Fatalf("cloud trace --json: %v\n%s", err, buf.String())
	}
	var payload struct {
		RunID  string `json:"run_id"`
		Totals struct {
			Calls        int     `json:"calls"`
			TokensIn     int     `json:"tokens_in"`
			CachedTokens int     `json:"cached_tokens"`
			Cost         float64 `json:"cost_usd"`
		} `json:"totals"`
		Calls []map[string]any `json:"calls"`
	}
	if err := json.Unmarshal(buf.Bytes(), &payload); err != nil {
		t.Fatalf("--json did not emit JSON: %v\n%s", err, buf.String())
	}
	if payload.RunID != "run_62c289d1e57942cea5fef6c1a508a0fd" || payload.Totals.Calls != 2 {
		t.Fatalf("payload = %+v", payload)
	}
	if payload.Totals.TokensIn != 100000 || payload.Totals.CachedTokens != 36800 {
		t.Errorf("totals = %+v", payload.Totals)
	}
	// Raw rows: the fields the API sent, not a projection of them.
	if payload.Calls[0]["usage_metadata"] == nil || payload.Calls[0]["metadata"] == nil {
		t.Errorf("--json dropped fields from the raw rows: %+v", payload.Calls[0])
	}
	if payload.Calls[0]["id"] != "call1" {
		t.Errorf("--json rows are not oldest-first: %+v", payload.Calls[0])
	}
}

// A run id that made no calls and a run id this gateway never saw are the same
// silence; the command says so rather than printing an empty table.
func TestCloudTraceSaysWhenNoCallsCarryTheRunID(t *testing.T) {
	configureTraceGateway(t)
	newTraceGateway(t, func(traceGatewayRequest) (int, any) {
		return http.StatusOK, map[string]any{"success": true, "result": []any{}}
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_unknown"}); err != nil {
		t.Fatalf("cloud trace: %v", err)
	}
	if !strings.Contains(buf.String(), "No AI Gateway calls") || !strings.Contains(buf.String(), "made no model call") {
		t.Fatalf("an empty trace does not distinguish the two facts:\n%s", buf.String())
	}
}

// A factory that routes model traffic but was never given a log-reading token
// is a documented, supported state: cost telemetry is optional. "No trace"
// must not read as "no factory".
func TestCloudTraceWithoutCostTelemetryNamesItsOwnRemedy(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryURL, "https://factory.test")
	config.Set(ticksrc.KeyFactoryToken, "tkf_test-token")
	config.Set(ticksrc.KeyFactoryGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-id/ticks-gw")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
	}
	captureCmdOutput(t)

	err = ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd"})
	if err == nil || !strings.Contains(err.Error(), "--cloudflare-api-token") {
		t.Fatalf("a missing telemetry token does not name its remedy: %v", err)
	}
}

func TestCloudTraceRefusesTwoViewsAtOnce(t *testing.T) {
	configureTraceGateway(t)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--tools", "--cache"})
	if err == nil || !strings.Contains(err.Error(), "one at a time") {
		t.Fatalf("two views at once are not refused: %v", err)
	}
}

// The filter has to be the pair the API accepts: a dotted metadata.run_id is
// answered with error 7001 over an HTTP 400.
func TestCloudTraceFiltersOnTheRunIDMetadataPair(t *testing.T) {
	configureTraceGateway(t)
	seen := traceRunGateway(t)
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd", "--cache"}); err != nil {
		t.Fatalf("cloud trace: %v", err)
	}
	filters := (*seen)[0].Query.Get("filters")
	if !strings.Contains(filters, `"metadata.key"`) || !strings.Contains(filters, `"metadata.value"`) {
		t.Fatalf("filters = %s", filters)
	}
	if !strings.Contains(filters, "run_62c289d1e57942cea5fef6c1a508a0fd") {
		t.Fatalf("the run id is not in the filter: %s", filters)
	}
	if got := (*seen)[0].Path; !strings.Contains(got, "/accounts/acct-id/ai-gateway/gateways/ticks-gw/logs") {
		t.Fatalf("the trace read the wrong gateway: %s", got)
	}
}

func TestHumanIntGroupsThousands(t *testing.T) {
	for _, testCase := range []struct {
		in   int
		want string
	}{
		{0, "0"}, {999, "999"}, {1000, "1,000"}, {999040, "999,040"}, {-1234, "-1,234"},
	} {
		if got := humanInt(testCase.in); got != testCase.want {
			t.Errorf("humanInt(%d) = %q, want %q", testCase.in, got, testCase.want)
		}
	}
	_ = fmt.Sprint()
}

// A conversation silently missing a call's turns reads as a model that went
// quiet. A body that cannot be read is named instead.
func TestCloudTraceNamesACallWhoseBodyCouldNotBeRead(t *testing.T) {
	configureTraceGateway(t)
	newTraceGateway(t, func(request traceGatewayRequest) (int, any) {
		switch {
		case strings.HasSuffix(request.Path, "/logs/call2/request"):
			return http.StatusOK, traceRequestBody(2)
		case strings.HasSuffix(request.Path, "/logs/call1/request"):
			return http.StatusInternalServerError, map[string]any{"success": false}
		case strings.HasSuffix(request.Path, "/logs"):
			return http.StatusOK, map[string]any{
				"success": true,
				"result": []any{
					traceRow("call2", "2026-08-20T10:05:00Z", 60000, 0, 240, 0.30),
					traceRow("call1", "2026-08-20T10:00:00Z", 40000, 36800, 120, 0.20),
				},
			}
		}
		return http.StatusNotFound, map[string]any{"success": false}
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", "run_62c289d1e57942cea5fef6c1a508a0fd"}); err != nil {
		t.Fatalf("cloud trace: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "incomplete: the request body for call 1") {
		t.Fatalf("an unreadable body was not named:\n%s", output)
	}
	// The calls table still stands: the rows were readable even though a body
	// was not, and the token accounting comes from the rows.
	if !strings.Contains(output, "36,800") {
		t.Errorf("the calls table was dropped along with the body:\n%s", output)
	}
	t.Logf("rendered trace:\n%s", output)
}
