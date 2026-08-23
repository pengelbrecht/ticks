package cmd

import (
	"net/http"
	"strings"
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
