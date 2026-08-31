package gatewaytrace

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

type gatewayRequest struct {
	Path  string
	Query url.Values
	Auth  string
}

type roundTripper func(*http.Request) (*http.Response, error)

func (f roundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// fakeGateway serves the AI Gateway logs API and records what was asked of it.
func fakeGateway(t *testing.T, handler func(gatewayRequest) (int, any)) (*Client, *[]gatewayRequest) {
	t.Helper()
	var mu sync.Mutex
	seen := make([]gatewayRequest, 0)
	client := &http.Client{Transport: roundTripper(func(r *http.Request) (*http.Response, error) {
		record := gatewayRequest{Path: r.URL.Path, Query: r.URL.Query(), Auth: r.Header.Get("Authorization")}
		mu.Lock()
		seen = append(seen, record)
		mu.Unlock()

		status, body := handler(record)
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		return &http.Response{
			StatusCode: status,
			Status:     fmt.Sprintf("%d %s", status, http.StatusText(status)),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(string(encoded))),
			Request:    r,
		}, nil
	})}
	return New(Config{Account: "acct", Gateway: "gw", Token: "cf-token"}, client), &seen
}

func logRowJSON(id, created string, tokensIn, cached, tokensOut int, cost float64) map[string]any {
	return map[string]any{
		"id":             id,
		"created_at":     created,
		"model":          "@cf/model",
		"provider":       "workers-ai",
		"success":        true,
		"cost":           cost,
		"tokens_in":      tokensIn,
		"tokens_out":     tokensOut,
		"duration":       1200,
		"metadata":       map[string]string{"run_id": "run_1", "tick_id": "abc"},
		"usage_metadata": map[string]any{"input_cached_tokens": cached},
	}
}

// The prefix-cache hit rate is only knowable from usage_metadata, and it is the
// number the caching work is graded on (tick l8z).
func TestCallsReadCachedTokensFromUsageMetadata(t *testing.T) {
	client, seen := fakeGateway(t, func(request gatewayRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"success": true,
			"result": []any{
				logRowJSON("b", "2026-08-20T10:01:00Z", 60000, 0, 200, 0.30),
				logRowJSON("a", "2026-08-20T10:00:00Z", 40000, 36800, 100, 0.20),
			},
		}
	})

	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want 2", len(calls))
	}
	// The API answers newest first; a conversation read backwards is not one.
	if calls[0].ID != "a" || calls[0].Index != 1 || calls[1].ID != "b" || calls[1].Index != 2 {
		t.Fatalf("calls are not oldest-first and numbered: %+v", calls)
	}
	if calls[0].CachedTokens != 36800 {
		t.Errorf("cached tokens = %d, want 36800", calls[0].CachedTokens)
	}
	rate, ok := calls[0].CacheRate()
	if !ok || rate < 0.91 || rate > 0.93 {
		t.Errorf("cache rate = %v (%v), want ~0.92", rate, ok)
	}
	if _, ok := calls[1].CacheRate(); !ok {
		t.Errorf("a call with input tokens has a rate even when it is zero")
	}

	totals := Sum(calls)
	if totals.TokensIn != 100000 || totals.CachedTokens != 36800 || totals.TokensOut != 300 {
		t.Errorf("totals = %+v", totals)
	}
	if totals.Cost < 0.49 || totals.Cost > 0.51 {
		t.Errorf("total cost = %v, want 0.50", totals.Cost)
	}

	if (*seen)[0].Auth != "Bearer cf-token" {
		t.Errorf("logs query did not present the Cloudflare API token: %q", (*seen)[0].Auth)
	}
}

// usage_metadata arrives as an object on some rungs and as a JSON string on
// others. Reporting 0% for a run that was in fact caching answers the caching
// question backwards, so both shapes are read.
func TestCachedTokensAcceptAStringifiedUsageMetadata(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		row := logRowJSON("a", "2026-08-20T10:00:00Z", 1000, 0, 10, 0.01)
		row["usage_metadata"] = `{"input_cached_tokens":768}`
		return http.StatusOK, map[string]any{"success": true, "result": []any{row}}
	})
	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if calls[0].CachedTokens != 768 {
		t.Fatalf("cached tokens = %d, want 768", calls[0].CachedTokens)
	}
}

// The API knows metadata.key and metadata.value as parallel columns; a dotted
// metadata.run_id is answered with error 7001 over an HTTP 400.
func TestCallsFilterOnTheMetadataKeyValuePair(t *testing.T) {
	client, seen := fakeGateway(t, func(gatewayRequest) (int, any) {
		return http.StatusOK, map[string]any{"success": true, "result": []any{}}
	})
	if _, err := client.Calls(context.Background(), "run_62c289d1"); err != nil {
		t.Fatalf("Calls: %v", err)
	}
	raw := (*seen)[0].Query.Get("filters")
	var filters []GatewayLogFilter
	if err := json.Unmarshal([]byte(raw), &filters); err != nil {
		t.Fatalf("filters %q is not JSON: %v", raw, err)
	}
	want := []GatewayLogFilter{
		{Key: "metadata.key", Operator: "eq", Value: []string{"run_id"}},
		{Key: "metadata.value", Operator: "eq", Value: []string{"run_62c289d1"}},
	}
	if fmt.Sprint(filters) != fmt.Sprint(want) {
		t.Fatalf("filters = %v, want %v", filters, want)
	}
	if got := (*seen)[0].Query.Get("per_page"); got != "50" {
		t.Errorf("per_page = %q, want 50 (51 is answered HTTP 400)", got)
	}
}

// A filter the API ignores would turn one run's trace into the whole gateway's.
func TestCallsReapplyTheRunFilterLocally(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		other := logRowJSON("z", "2026-08-20T10:02:00Z", 10, 0, 1, 0.01)
		other["metadata"] = map[string]string{"run_id": "run_other"}
		return http.StatusOK, map[string]any{
			"success": true,
			"result":  []any{logRowJSON("a", "2026-08-20T10:00:00Z", 10, 0, 1, 0.01), other},
		}
	})
	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if len(calls) != 1 || calls[0].ID != "a" {
		t.Fatalf("another run's rows reached this run's trace: %+v", calls)
	}
}

// The only end-of-log signal this API gives is a short page: it sends no
// total_pages, and reading one (absent, defaulted to 1) is what once ended a
// paged read after 50 of 892 rows.
func TestCallsPageUntilAShortPageProvesExhaustion(t *testing.T) {
	client, seen := fakeGateway(t, func(request gatewayRequest) (int, any) {
		page := request.Query.Get("page")
		rows := make([]any, 0, PageSize)
		count := PageSize
		if page == "3" {
			count = 2
		}
		for i := 0; i < count; i++ {
			rows = append(rows, logRowJSON(fmt.Sprintf("%s-%02d", page, i),
				fmt.Sprintf("2026-08-20T1%s:%02d:00Z", page, i), 10, 5, 1, 0.01))
		}
		return http.StatusOK, map[string]any{"success": true, "result": rows}
	})
	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if len(calls) != 2*PageSize+2 {
		t.Fatalf("calls = %d, want %d", len(calls), 2*PageSize+2)
	}
	if len(*seen) != 3 {
		t.Fatalf("pages read = %d, want 3", len(*seen))
	}
}

// A truncated read presented as a complete trace is the same wrongness that let
// a truncated cost query pass a budget it had already blown. Hitting the cap is
// a failure, not a number.
func TestCallsFailRatherThanTruncateAtThePageCap(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		rows := make([]any, 0, PageSize)
		for i := 0; i < PageSize; i++ {
			rows = append(rows, logRowJSON(fmt.Sprintf("r%d", i), "2026-08-20T10:00:00Z", 10, 5, 1, 0.01))
		}
		return http.StatusOK, map[string]any{"success": true, "result": rows}
	})
	_, err := client.Calls(context.Background(), "run_1")
	if err == nil {
		t.Fatal("a read that hit the page cap returned a trace as if it were complete")
	}
	if !strings.Contains(err.Error(), "floor") {
		t.Fatalf("the cap failure does not say what was read is a floor: %v", err)
	}
}

// A revoked token and a rejected filter both read as "no trace" without this.
func TestCallsNameTheRemedyForARejectedToken(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		return http.StatusForbidden, map[string]any{"success": false}
	})
	_, err := client.Calls(context.Background(), "run_1")
	if err == nil || !strings.Contains(err.Error(), "tk factory setup --cloudflare-api-token") {
		t.Fatalf("a rejected token does not name its remedy: %v", err)
	}

	refusing, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"success": false,
			"errors":  []any{map[string]any{"message": "Invalid enum value"}},
		}
	})
	_, err = refusing.Calls(context.Background(), "run_1")
	if err == nil || !strings.Contains(err.Error(), "Invalid enum value") {
		t.Fatalf("a 200 body saying success:false is not reported as a refusal: %v", err)
	}
}

func TestDetailBodiesAreReadFromTheirOwnEndpoints(t *testing.T) {
	client, seen := fakeGateway(t, func(request gatewayRequest) (int, any) {
		switch {
		case strings.HasSuffix(request.Path, "/logs/call-1/request"):
			return http.StatusOK, map[string]any{"messages": []any{map[string]any{"role": "user", "content": "hi"}}}
		case strings.HasSuffix(request.Path, "/logs/call-1/response"):
			// Envelope shape, and a streamed response: choices carry nothing.
			return http.StatusOK, map[string]any{
				"success": true,
				"result":  map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": nil}}}},
			}
		}
		return http.StatusNotFound, map[string]any{}
	})

	body, err := client.RequestBody(context.Background(), "call-1")
	if err != nil {
		t.Fatalf("RequestBody: %v", err)
	}
	if !strings.Contains(string(body), `"role":"user"`) {
		t.Fatalf("request body = %s", body)
	}
	response, err := client.ResponseBody(context.Background(), "call-1")
	if err != nil {
		t.Fatalf("ResponseBody: %v", err)
	}
	if !strings.Contains(string(response), "choices") {
		t.Fatalf("the {success,result} envelope was not unwrapped: %s", response)
	}
	if len(*seen) != 2 {
		t.Fatalf("detail requests = %d, want 2", len(*seen))
	}
}

func TestConfigFromNamesWhichHalfIsMissing(t *testing.T) {
	path := filepath.Join(t.TempDir(), credentials.FileName)
	file, err := credentials.LoadFrom(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if _, err := ConfigFrom(file); err == nil || !strings.Contains(err.Error(), "tk factory setup") {
		t.Fatalf("an unconfigured gateway does not name setup: %v", err)
	}

	file.Set(credentials.KeyGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-id/my-gw")
	// A factory that routes model traffic but was never given a log-reading
	// token is a documented state; "no trace" must not read as "no factory".
	_, err = ConfigFrom(file)
	if err == nil || !strings.Contains(err.Error(), "--cloudflare-api-token") {
		t.Fatalf("a missing telemetry token does not name its own remedy: %v", err)
	}

	file.Set(credentials.KeyCloudflareAPIToken, "cf-token")
	config, err := ConfigFrom(file)
	if err != nil {
		t.Fatalf("ConfigFrom: %v", err)
	}
	if config.Account != "acct-id" || config.Gateway != "my-gw" || config.Token != "cf-token" {
		t.Fatalf("config = %+v", config)
	}

	file.Set(credentials.KeyGatewayURL, "https://api.anthropic.com")
	if _, err := ConfigFrom(file); err == nil || !strings.Contains(err.Error(), "account") {
		t.Fatalf("a gateway with no logs API is not reported: %v", err)
	}
}

// Any constant crossing the Go/TS boundary needs a cross-implementation check:
// the Worker reads these logs for cost and this package reads them for the
// conversation, and a half-applied fix leaves both suites internally green.
func TestFilterVocabularyMatchesTheWorkersOwn(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("..", "..", "cloud", "factory", "src", "gateway.ts"))
	if err != nil {
		t.Skipf("the factory worker source is not in this checkout: %v", err)
	}
	text := string(source)
	for _, filter := range metadataFilters("run_id", "run_1") {
		if !strings.Contains(text, `"`+filter.Key+`"`) {
			t.Errorf("cloud/factory/src/gateway.ts does not accept filter key %q", filter.Key)
		}
		if !strings.Contains(text, `"`+filter.Operator+`"`) {
			t.Errorf("cloud/factory/src/gateway.ts does not accept filter operator %q", filter.Operator)
		}
	}
	if !strings.Contains(text, fmt.Sprintf("GATEWAY_LOG_MAX_PAGE_SIZE = %d", PageSize)) {
		t.Errorf("PageSize %d no longer matches GATEWAY_LOG_MAX_PAGE_SIZE in cloud/factory/src/gateway.ts", PageSize)
	}
	if !strings.Contains(text, fmt.Sprintf("MAX_LOG_PAGES = %d", MaxPages)) {
		t.Errorf("MaxPages %d no longer matches MAX_LOG_PAGES in cloud/factory/src/gateway.ts", MaxPages)
	}
}

// The trace id rides on the same metadata the run id does (D20, tick hyi), so
// `tk cloud trace` can say which chain a run's model traffic belongs to
// without asking the control plane anything — which is the whole reason this
// command can still answer for a run whose factory is unreachable.
func TestCallsReadTheTraceIDFromMetadata(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		row := logRowJSON("a", "2026-08-20T10:00:00Z", 1000, 0, 10, 0.01)
		row["metadata"] = map[string]string{
			"run_id":   "run_1",
			"tick_id":  "abc",
			"trace_id": "tr_0123456789abcdef0123456789abcdef",
		}
		return http.StatusOK, map[string]any{"success": true, "result": []any{row}}
	})
	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if calls[0].TraceID != "tr_0123456789abcdef0123456789abcdef" {
		t.Fatalf("trace id = %q, want the stamped one", calls[0].TraceID)
	}
}

// A run made before trace ids existed reports an EMPTY chain, not a
// placeholder: "this run had no chain" and "this call belongs to chain X" have
// to stay different answers, or every pre-hyi run reads as one shared chain.
func TestCallsLeaveTheTraceIDEmptyWhenNothingStampedOne(t *testing.T) {
	client, _ := fakeGateway(t, func(gatewayRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"success": true,
			"result":  []any{logRowJSON("a", "2026-08-20T10:00:00Z", 1000, 0, 10, 0.01)},
		}
	})
	calls, err := client.Calls(context.Background(), "run_1")
	if err != nil {
		t.Fatalf("Calls: %v", err)
	}
	if calls[0].TraceID != "" {
		t.Fatalf("trace id = %q, want empty for an untraced run", calls[0].TraceID)
	}
}
