package cmd

import (
	"bytes"
	"net/http"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// cmdStreams keeps stdout and stderr apart, which captureCmdOutput does not:
// a note that belongs on stderr is only proved to be there by a test that can
// tell the two streams apart.
type cmdStreams struct {
	Out bytes.Buffer
	Err bytes.Buffer
}

func captureCmdOutputStreams(t *testing.T) *cmdStreams {
	t.Helper()
	streams := &cmdStreams{}
	rootCmd.SetOut(&streams.Out)
	rootCmd.SetErr(&streams.Err)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return streams
}

// A gateway an operator can read with no factory configured at all: trace is a
// gateway command, and the factory is only reachable for resolving a prefix.
func configureTraceGatewayWithoutFactory(t *testing.T) {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-id/ticks-gw")
	config.Set(ticksrc.KeyFactoryCloudflareAPIToken, "cf-test-token")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
	}
}

// The run id in the tick that found this: a full one, and the head an operator
// actually has to hand after a wrapped terminal line or a truncating copy.
const (
	fullTestRunID  = "run_62c289d1e57942cea5fef6c1a508a0fd"
	shortTestRunID = "run_62c289d1"
	siblingRunID   = "run_62c289d1aaaa4aaabaaacaaadaaaeaaa"
)

// A run index answer with the given run ids, shaped like the factory's.
func cloudRunIndex(ids ...string) map[string]any {
	runs := make([]any, 0, len(ids))
	for _, id := range ids {
		runs = append(runs, map[string]any{
			"run_id": id, "state": "completed", "epic": "1vn", "project": "acme/project",
		})
	}
	return map[string]any{"runs": runs}
}

// A run id is "run_" plus 32 hex characters. That shape is the whole basis for
// telling a prefix from an id, so it is pinned rather than assumed.
func TestCloudRunIDPrefixRecognition(t *testing.T) {
	for _, testCase := range []struct {
		id   string
		want bool
	}{
		{shortTestRunID, true},
		{"run_6", true},
		{fullTestRunID, false},        // a whole id is not a prefix of one
		{"run_live", false},           // not hex: cannot be the head of an id
		{"run_", false},               // no head at all
		{"", false},                   // ditto
		{"62c289d1", false},           // not a run id at all
		{fullTestRunID + "aa", false}, // longer than an id
	} {
		if got := isCloudRunIDPrefix(testCase.id); got != testCase.want {
			t.Errorf("isCloudRunIDPrefix(%q) = %v, want %v", testCase.id, got, testCase.want)
		}
	}
}

// THE bug (tick c5i): `tk cloud trace run_62c289d1` answered "No AI Gateway
// calls are stamped with run run_62c289d1" — true of the prefix, false of the
// run, and read by the operator as "this run has no telemetry". The prefix is
// resolved against the runs the factory knows about before the gateway is
// asked anything.
func TestCloudTraceResolvesAShortRunIDAgainstTheFactory(t *testing.T) {
	configureTraceGateway(t)
	_, factory := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodGet && request.Path == "/api/runs" {
			return http.StatusOK, cloudRunIndex(fullTestRunID, "run_"+strings.Repeat("b", 32))
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	gateway := traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", shortTestRunID}); err != nil {
		t.Fatalf("cloud trace %s: %v\n%s", shortTestRunID, err, buf.String())
	}
	output := buf.String()

	if strings.Contains(output, "No AI Gateway calls") {
		t.Fatalf("a prefix was answered with a confident negative:\n%s", output)
	}
	if !strings.Contains(output, "Dispatching wave 1.") {
		t.Errorf("the resolved run's conversation was not read:\n%s", output)
	}
	// Said, not done silently: the operator asked about one string and was
	// answered about another.
	if !strings.Contains(output, shortTestRunID) || !strings.Contains(output, fullTestRunID) {
		t.Errorf("the resolution is not reported:\n%s", output)
	}
	// The gateway is filtered on the FULL id — the prefix never reaches it.
	if len(*gateway) == 0 {
		t.Fatal("the gateway was never read")
	}
	filters := (*gateway)[0].Query.Get("filters")
	if !strings.Contains(filters, fullTestRunID) {
		t.Errorf("the gateway filter does not carry the resolved id: %s", filters)
	}
	if len(*factory) != 1 || (*factory)[0].Query.Get("limit") == "" {
		t.Errorf("the run index was not read with a widened window: %#v", *factory)
	}
}

// A prefix that names more than one run is refused with both ids, never
// resolved to whichever came back first.
func TestCloudTraceRefusesAnAmbiguousRunIDPrefix(t *testing.T) {
	configureTraceGateway(t)
	newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, cloudRunIndex(fullTestRunID, siblingRunID)
	})
	gateway := traceRunGateway(t)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "trace", shortTestRunID})
	if err == nil {
		t.Fatal("an ambiguous prefix was resolved instead of refused")
	}
	for _, want := range []string{fullTestRunID, siblingRunID} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("the refusal does not name %s: %v", want, err)
		}
	}
	if len(*gateway) != 0 {
		t.Errorf("an ambiguous prefix still reached the gateway: %#v", *gateway)
	}
}

// The window the index answers with is bounded, so "no match" is a statement
// about that window and never about the run. It must not read as one.
func TestCloudTraceRefusesAnUnmatchedPrefixWithoutADenial(t *testing.T) {
	configureTraceGateway(t)
	newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, cloudRunIndex("run_" + strings.Repeat("c", 32))
	})
	gateway := traceRunGateway(t)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "trace", shortTestRunID})
	if err == nil {
		t.Fatal("an unresolvable prefix was not refused")
	}
	if !strings.Contains(err.Error(), "prefix") && !strings.Contains(err.Error(), "head of a run id") {
		t.Errorf("the refusal does not say the argument is a prefix: %v", err)
	}
	if !strings.Contains(err.Error(), "index") {
		t.Errorf("the refusal does not say what was searched: %v", err)
	}
	if len(*gateway) != 0 {
		t.Errorf("an unresolved prefix still reached the gateway: %#v", *gateway)
	}
}

// A whole run id costs no lookup: the fast path must not acquire a dependency
// on the factory for a command that reads the gateway.
func TestCloudTraceDoesNotConsultTheFactoryForAFullRunID(t *testing.T) {
	configureTraceGateway(t)
	_, factory := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusInternalServerError, map[string]any{"error": "the index must not be read"}
	})
	traceRunGateway(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "trace", fullTestRunID}); err != nil {
		t.Fatalf("cloud trace %s: %v\n%s", fullTestRunID, err, buf.String())
	}
	if len(*factory) != 0 {
		t.Errorf("a full run id was still resolved against the factory: %#v", *factory)
	}
}

// The resolution note is a diagnostic, not data: --json has to stay parseable.
func TestCloudTraceResolutionNoteStaysOutOfTheJSON(t *testing.T) {
	configureTraceGateway(t)
	newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, cloudRunIndex(fullTestRunID)
	})
	traceRunGateway(t)
	buf := captureCmdOutputStreams(t)

	if err := ExecuteArgs([]string{"cloud", "trace", shortTestRunID, "--json"}); err != nil {
		t.Fatalf("cloud trace --json: %v", err)
	}
	if strings.Contains(buf.Out.String(), "resolved") {
		t.Errorf("the resolution note was written to stdout, where it corrupts --json:\n%s", buf.Out.String())
	}
	if !strings.Contains(buf.Err.String(), fullTestRunID) {
		t.Errorf("the resolution was not reported on stderr:\n%s", buf.Err.String())
	}
	if !strings.Contains(buf.Out.String(), `"run_id": "`+fullTestRunID+`"`) {
		t.Errorf("--json does not report the resolved run id:\n%s", buf.Out.String())
	}
}

// The same trap on the other two run-scoped reads: `tk cloud logs` answers a
// prefix with the factory's 404, and `tk cloud status` with the same.
func TestCloudLogsResolvesAShortRunID(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch request.Path {
		case "/api/runs":
			return http.StatusOK, cloudRunIndex(fullTestRunID)
		case "/api/runs/" + fullTestRunID + "/logs":
			return http.StatusOK, map[string]any{
				"run_id": fullTestRunID, "state": "completed",
				"text": "reconciling epic 1vn\n", "bytes": 21, "total_bytes": 21,
			}
		}
		return http.StatusNotFound, map[string]any{"error": "unknown_run"}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", shortTestRunID}); err != nil {
		t.Fatalf("cloud logs %s: %v\n%s", shortTestRunID, err, buf.String())
	}
	if !strings.Contains(buf.String(), "reconciling epic 1vn") {
		t.Fatalf("the resolved run's log was not printed:\n%s", buf.String())
	}
	if len(*requests) != 2 {
		t.Errorf("logs made %d factory requests, want the index read plus the log read: %#v", len(*requests), *requests)
	}
}

func TestCloudStatusResolvesAShortRunID(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch request.Path {
		case "/api/runs":
			return http.StatusOK, cloudRunIndex(fullTestRunID)
		case "/api/runs/" + fullTestRunID:
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": fullTestRunID, "state": "completed", "epic": "1vn"},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "unknown_run"}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "status", shortTestRunID}); err != nil {
		t.Fatalf("cloud status %s: %v\n%s", shortTestRunID, err, buf.String())
	}
	if !strings.Contains(buf.String(), "Cloud run "+fullTestRunID) {
		t.Fatalf("status did not report the resolved run:\n%s", buf.String())
	}
}

// A prefix resolved from the lease or the queue is still resolved: those runs
// are exactly the ones an operator is watching, and a live run is the most
// likely thing to have a half-copied id.
func TestCloudStatusResolvesAPrefixHeldByTheLease(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch request.Path {
		case "/api/runs":
			return http.StatusOK, map[string]any{
				"runs": []any{},
				"projects": []any{map[string]any{
					"project": "acme/project",
					"lease":   map[string]any{"run_id": fullTestRunID, "epic": "1vn"},
					"queued":  []any{map[string]any{"run_id": siblingRunID, "blocked_by": fullTestRunID}},
				}},
			}
		case "/api/runs/" + fullTestRunID:
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": fullTestRunID, "state": "running", "epic": "1vn"},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "unknown_run"}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "status", "run_62c289d1e"}); err != nil {
		t.Fatalf("cloud status: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "state: running") {
		t.Fatalf("the lease holder was not resolved from the index:\n%s", buf.String())
	}
}

// `tk cloud trace` reads the operator's gateway, not the factory — but only
// the factory can name its runs. Without one, a prefix is refused for what it
// is instead of being passed through to a negative.
func TestCloudTraceWithoutAFactoryRefusesAPrefixPlainly(t *testing.T) {
	configureTraceGatewayWithoutFactory(t)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "trace", shortTestRunID})
	if err == nil {
		t.Fatal("a prefix with no factory to resolve it against was not refused")
	}
	if !strings.Contains(err.Error(), shortTestRunID) {
		t.Errorf("the refusal does not name the argument: %v", err)
	}
	if !strings.Contains(err.Error(), "factory") {
		t.Errorf("the refusal does not say what is missing: %v", err)
	}
}
