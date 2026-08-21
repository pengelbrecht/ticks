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
