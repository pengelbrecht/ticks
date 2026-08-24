package cmd

import (
	"net/http"
	"strings"
	"sync"
	"testing"
)

// `tk cloud logs` is the OTHER half of "what happened": stdout and stderr from
// the container, streamed to R2 during the run. It is deliberately not the same
// command as `tk cloud trace` — a harness that crashed and a model that decided
// badly are different failures with different evidence.
func TestCloudLogsPrintsTheHarnessOutput(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodGet && request.Path == "/api/runs/run_live/logs" {
			return http.StatusOK, map[string]any{
				"run_id": "run_live", "project": "acme/project", "state": "running",
				"text":  "booting orchestrator\nreconciling epic 1vn\n",
				"bytes": 42, "total_bytes": 42, "truncated": false,
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_live"}); err != nil {
		t.Fatalf("cloud logs: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "reconciling epic 1vn") {
		t.Fatalf("the harness output was not printed:\n%s", buf.String())
	}
	if len(*requests) != 1 || (*requests)[0].Auth != "Bearer tkf_test-token" {
		t.Fatalf("logs did not read the factory run surface with the factory token: %#v", *requests)
	}
}

// A log that quietly starts partway through reads as a run that started
// partway through — and the note goes ABOVE the output, where a piped read
// still sees it.
func TestCloudLogsSaysWhenTheReadWasBounded(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_big", "state": "completed",
			"text": "tail of the log\n", "bytes": 16, "total_bytes": 9_000_000, "truncated": true,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_big"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	output := buf.String()
	if !strings.Contains(output, "9000000") && !strings.Contains(output, "9,000,000") {
		t.Errorf("the truncation note does not say how much there was:\n%s", output)
	}
	if strings.Index(output, "showing the last") > strings.Index(output, "tail of the log") {
		t.Errorf("the truncation note is printed after the log:\n%s", output)
	}
}

func TestCloudLogsTailKeepsTheLastLines(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_live", "state": "running",
			"text": "one\ntwo\nthree\nfour\n", "bytes": 19, "total_bytes": 19, "truncated": false,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_live", "--tail", "2"}); err != nil {
		t.Fatalf("cloud logs --tail: %v", err)
	}
	output := buf.String()
	if strings.Contains(output, "one") || !strings.Contains(output, "three\nfour") {
		t.Fatalf("--tail 2 did not keep the last two lines:\n%s", output)
	}
}

// "Nothing printed yet" and "the sandbox never got that far" are different
// facts, and the state is what tells them apart.
func TestCloudLogsReportsAnEmptyStreamWithTheRunState(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_quiet", "state": "starting",
			"text": "", "bytes": 0, "total_bytes": 0, "truncated": false,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_quiet"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	if !strings.Contains(buf.String(), "starting") {
		t.Fatalf("an empty log does not report the run state:\n%s", buf.String())
	}
}

func TestCloudLogsSurfacesAnUnknownRun(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusNotFound, map[string]any{"error": "unknown_run", "detail": "no run run_ghost"}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "logs", "run_ghost"})
	if err == nil || !strings.Contains(err.Error(), "no run run_ghost") {
		t.Fatalf("an unknown run is not reported: %v", err)
	}
}

// A worker container's own output is a different stream from the
// orchestrator's — one per (run, tick), because a wave's containers run
// concurrently and one shared stream would interleave them into nonsense
// (tick 0fg).
func TestCloudLogsTickPrintsOneWorkersOwnOutput(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Path != "/api/runs/run_wave/logs" || request.Query.Get("tick") != "0fg" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		return http.StatusOK, map[string]any{
			"run_id": "run_wave", "state": "running", "tick_id": "0fg",
			"text":  "ticks-worker: FATAL POST /v1/chat/completions -> 404\n",
			"bytes": 52, "total_bytes": 52, "truncated": false,
			"streams": []map[string]any{{"tick_id": "0fg", "bytes": 52, "segments": 1}},
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_wave", "--tick", "0fg"}); err != nil {
		t.Fatalf("cloud logs --tick: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "FATAL POST /v1/chat/completions -> 404") {
		t.Fatalf("the worker container's own output was not printed:\n%s", buf.String())
	}
	if len(*requests) != 1 {
		t.Fatalf("logs did not make exactly one read: %#v", *requests)
	}
}

// The default read has to say which worker streams exist: an operator
// debugging a wave does not know which containers got far enough to print, and
// a flag whose valid values are unlisted is a flag nobody uses.
func TestCloudLogsNamesTheWorkerStreamsAboveTheLog(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_wave", "state": "running",
			"text": "ticks-orchestrator: dispatching wave 1\n", "bytes": 38, "total_bytes": 38,
			"truncated": false,
			"streams": []map[string]any{
				{"tick_id": "0fg", "bytes": 52, "segments": 1},
				{"tick_id": "ys3", "bytes": 900, "segments": 3},
			},
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_wave"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	output := buf.String()
	if !strings.Contains(output, "0fg") || !strings.Contains(output, "ys3") {
		t.Errorf("the worker streams are not named:\n%s", output)
	}
	if !strings.Contains(output, "--tick") {
		t.Errorf("the note does not say how to read one:\n%s", output)
	}
	if strings.Index(output, "worker streams") > strings.Index(output, "dispatching wave 1") {
		t.Errorf("the note is printed after the log, where a piped read scrolls past it:\n%s", output)
	}
}

// Three different empties, three different answers: a mistyped tick id must
// never read as "this run produced nothing" (.tick/learnings.md — never
// collapse distinct failure classes into one message).
func TestCloudLogsTellsAMissingStreamFromAnEmptyOne(t *testing.T) {
	setupCloudRepo(t, false)
	streams := []map[string]any{{"tick_id": "0fg", "bytes": 52, "segments": 1}}
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_wave", "state": "running", "tick_id": request.Query.Get("tick"),
			"text": "", "bytes": 0, "total_bytes": 0, "truncated": false, "streams": streams,
		}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "logs", "run_wave", "--tick", "zzz"}); err != nil {
		t.Fatalf("cloud logs --tick zzz: %v", err)
	}
	missing := buf.String()
	if !strings.Contains(missing, "no log stream for tick zzz") {
		t.Errorf("a tick with no stream is not reported as such:\n%s", missing)
	}
	if !strings.Contains(missing, "0fg") {
		t.Errorf("the streams that DO exist are not named:\n%s", missing)
	}

	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "logs", "run_wave", "--tick", "0fg"}); err != nil {
		t.Fatalf("cloud logs --tick 0fg: %v", err)
	}
	if !strings.Contains(buf.String(), "nothing in it") {
		t.Errorf("a stream that exists and is empty is not distinguished:\n%s", buf.String())
	}
}

// An empty --tick must not silently read the orchestrator's stream: that is
// one container's output presented as another's.
func TestCloudLogsRefusesAnEmptyTick(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{"run_id": "run_wave", "state": "running", "text": "x\n"}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "logs", "run_wave", "--tick", "  "})
	if err == nil || !strings.Contains(err.Error(), "--tick takes a tick id") {
		t.Fatalf("an empty --tick is not refused: %v", err)
	}
	if len(*requests) != 0 {
		t.Fatalf("a refused read still called the factory: %#v", *requests)
	}
}

// The trace id, on every read (D20, tick hyi).
//
// This is the third of the three joins the tick's acceptance criterion asks
// for: from a run's worker logs back to the message that caused the run. The
// id is served from the run's INDEX ROW rather than scraped out of the log
// text, because a log read is bounded from the END — so on the long-running
// container an operator most wants the id for, the stream's own banner is the
// first thing to fall off the budget. The row answers whatever the tail
// happens to hold, which is the difference between one query and a grep that
// sometimes works.
func TestCloudLogsStatesTheRunsTraceID(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_live", "state": "running",
			"trace_id": "tr_0123456789abcdef0123456789abcdef",
			"text":     "booting orchestrator\n", "bytes": 21, "total_bytes": 21,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_live"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	output := buf.String()
	if !strings.Contains(output, "tr_0123456789abcdef0123456789abcdef") {
		t.Fatalf("the run's trace id was not stated:\n%s", output)
	}
	// Above the log, where a piped read still sees it — the same rule the
	// truncation note follows.
	if strings.Index(output, "# trace:") > strings.Index(output, "booting orchestrator") {
		t.Fatalf("the trace id is printed after the log:\n%s", output)
	}
}

// A container that printed NOTHING is exactly the case Phase 2 could not
// diagnose, so the id is stated there too: "this container printed nothing" is
// a finding, and a finding an operator cannot join to the message that asked
// for it is the failure this tick exists to end.
func TestCloudLogsStatesTheTraceIDEvenWithNoOutput(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_quiet", "state": "failed",
			"trace_id": "tr_00000000000000000000000000000abc",
			"text":     "", "bytes": 0, "total_bytes": 0,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_quiet"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	if !strings.Contains(buf.String(), "tr_00000000000000000000000000000abc") {
		t.Fatalf("an empty log did not state the trace id:\n%s", buf.String())
	}
}

// A run that belongs to no chain says NOTHING, rather than "trace: none".
// Every run started before this tick has no chain, and a line that always
// prints is a line that never answers — an operator grepping for a trace id
// would match it on every run in the factory.
func TestCloudLogsSaysNothingWhenTheRunHasNoTraceID(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_old", "state": "completed",
			"text": "a run from before the chain existed\n", "bytes": 36, "total_bytes": 36,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_old"}); err != nil {
		t.Fatalf("cloud logs: %v", err)
	}
	if strings.Contains(buf.String(), "trace") {
		t.Fatalf("an untraced run mentioned a trace anyway:\n%s", buf.String())
	}
}

// ---------------------------------------------------------------- --follow ---
//
// Following a live run is owed from Phase 2: every diagnosis there was made
// after the fact, from a stream nobody could watch. The half that makes it more
// than `tail -f` is the liveness look — a supervisor cannot report its own
// death, so a follow that trusted the run record would sit forever on a stream
// nothing will ever add to.

// A follow prints each byte once. The cursor is the stream's TOTAL, because the
// read it is served is a bounded tail and only totals subtract correctly.
func TestCloudLogsFollowPrintsOnlyWhatIsNew(t *testing.T) {
	setupCloudRepo(t, false)
	var calls int
	var mu sync.Mutex
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		mu.Lock()
		calls++
		n := calls
		mu.Unlock()
		switch n {
		case 1:
			return http.StatusOK, map[string]any{
				"run_id": "run_live", "state": "running",
				"text": "one\n", "bytes": 4, "total_bytes": 4,
			}
		case 2:
			return http.StatusOK, map[string]any{
				"run_id": "run_live", "state": "running",
				"text": "one\ntwo\n", "bytes": 8, "total_bytes": 8,
			}
		default:
			return http.StatusOK, map[string]any{
				"run_id": "run_live", "state": "completed",
				"text": "one\ntwo\nthree\n", "bytes": 14, "total_bytes": 14,
			}
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_live", "--follow", "--interval", "10ms"}); err != nil {
		t.Fatalf("cloud logs --follow: %v\n%s", err, buf.String())
	}
	output := buf.String()
	for _, line := range []string{"one", "two", "three"} {
		if got := strings.Count(output, line+"\n"); got != 1 {
			t.Errorf("%q printed %d times, want once:\n%s", line, got, output)
		}
	}
	if !strings.Contains(output, "this stream is complete") {
		t.Errorf("the follow did not say the stream ended:\n%s", output)
	}
}

// A container can print faster than a follow reads. The bytes that fell past
// the read's bound are STATED — a follow that silently skipped them would be
// the same lie as a log that stops without saying so.
func TestCloudLogsFollowStatesTheBytesItMissed(t *testing.T) {
	setupCloudRepo(t, false)
	var calls int
	var mu sync.Mutex
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		mu.Lock()
		calls++
		n := calls
		mu.Unlock()
		if n == 1 {
			return http.StatusOK, map[string]any{
				"run_id": "run_fast", "state": "running", "text": "start\n", "bytes": 6, "total_bytes": 6,
			}
		}
		return http.StatusOK, map[string]any{
			"run_id": "run_fast", "state": "completed",
			"text": "tail\n", "bytes": 5, "total_bytes": 1006, "truncated": true,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_fast", "--follow", "--interval", "10ms"}); err != nil {
		t.Fatalf("cloud logs --follow: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "995 bytes were printed faster") {
		t.Errorf("the follow did not state the gap it could not read:\n%s", output)
	}
	if !strings.Contains(output, "tail") {
		t.Errorf("the follow dropped the tail it could read:\n%s", output)
	}
}

// The Phase 2 rule, enforced: the run record says `running` because the thing
// that writes it died before it could say otherwise. A follow must not wait on
// that forever.
func TestCloudLogsFollowStopsWhenTheSupervisorIsDead(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run_id": "run_2xm", "state": "running",
			"text": "booting orchestrator\n", "bytes": 21, "total_bytes": 21,
		}
	})
	configureCloudFactory(t, endpoint)
	configureCloudflareAPI(t, func(*http.Request) (int, string) {
		return http.StatusOK, erroredInstance
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_2xm", "--follow", "--interval", "10ms"}); err != nil {
		t.Fatalf("cloud logs --follow: %v\n%s", err, buf.String())
	}
	output := buf.String()
	for _, want := range []string{
		"supervisor is errored",
		"Execution timed out after 600000ms",
		"cloud:dispatch:0-1",
		"tk cloud supervisor run_2xm",
	} {
		if !strings.Contains(output, want) {
			t.Errorf("the follow did not report the dead supervisor (%q missing):\n%s", want, output)
		}
	}
	if strings.Contains(output, "tkr_") {
		t.Fatalf("the follow printed a run gateway token:\n%s", output)
	}
}

// A follow with no Cloudflare API token still follows: the liveness look is an
// added rung, not a dependency, and the warning is said once rather than beside
// every poll.
func TestCloudLogsFollowWithoutTheCloudflareTokenStillFollows(t *testing.T) {
	setupCloudRepo(t, false)
	var calls int
	var mu sync.Mutex
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		mu.Lock()
		calls++
		n := calls
		mu.Unlock()
		state := "running"
		if n >= 3 {
			state = "stopped"
		}
		return http.StatusOK, map[string]any{
			"run_id": "run_quiet", "state": state, "text": "quiet\n", "bytes": 6, "total_bytes": 6,
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "logs", "run_quiet", "--follow", "--interval", "10ms"}); err != nil {
		t.Fatalf("cloud logs --follow: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "this stream is complete") {
		t.Errorf("the follow did not run to the end of the stream:\n%s", output)
	}
	if got := strings.Count(output, "cannot check whether the supervisor is alive"); got > 1 {
		t.Errorf("the warning was repeated %d times:\n%s", got, output)
	}
}

// --interval has to be a real cadence: zero would spin.
func TestCloudLogsFollowRefusesANonPositiveInterval(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{"run_id": "run_live", "state": "running"}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "logs", "run_live", "--follow", "--interval", "0s"})
	if err == nil || !strings.Contains(err.Error(), "--interval") {
		t.Fatalf("a zero interval was accepted: %v", err)
	}
}
