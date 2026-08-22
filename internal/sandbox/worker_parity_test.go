package sandbox

import (
	"encoding/json"
	"os"
	"testing"
)

// The per-tick worker boot contract has three readers: cloud/sandbox/worker.sh
// (the container), this package (tk, and the assertions the repository runs),
// and cloud/factory/src/worker-boot.ts (the control plane, which is what tells
// worker-dispatch.ts the command to start and the string its probe must see).
//
// This is exactly the shape of the bug this repository has already paid for
// once: a fix landed in TypeScript only, the Go half kept minting unusable
// records, and both suites were green because each was internally consistent
// (`.tick/learnings.md`, "Cross-language parity"). So all three are pinned to
// one file, and a divergence fails here — and in
// cloud/factory/test/worker-boot.test.ts — rather than in a wave of containers
// that all start cleanly and are all discarded by a probe looking for a word
// none of them prints.

const workerContractFile = "../../cloud/factory/test/fixtures/worker-boot-contract.json"

type workerContract struct {
	OrchestratorCommand string `json:"orchestrator_command"`
	WorkerCommand       string `json:"worker_command"`
	ProbeArg            string `json:"probe_arg"`
	ProbeCommand        string `json:"probe_command"`
	ProbeMarker         string `json:"probe_marker"`
	WorkerActor         string `json:"worker_actor"`
	BranchPrefix        string `json:"branch_prefix"`
	BranchExample       struct {
		Epic   string `json:"epic"`
		Tick   string `json:"tick"`
		Branch string `json:"branch"`
	} `json:"branch_example"`
	ResultFileExample struct {
		Tick string `json:"tick"`
		Path string `json:"path"`
	} `json:"result_file_example"`
	Env struct {
		Tick         string `json:"tick"`
		WorkerBranch string `json:"worker_branch"`
		Timeout      string `json:"worker_timeout"`
		Setup        string `json:"worker_setup"`
	} `json:"env"`
	SetupModes struct {
		Always string `json:"always"`
		Skip   string `json:"skip"`
	} `json:"setup_modes"`
	Boundary struct {
		TkDenied     string `json:"tk_denied"`
		ReportMarker string `json:"report_marker"`
	} `json:"boundary"`
	ExitCodes struct {
		Push   int `json:"push"`
		NoWork int `json:"no_work"`
		Agent  int `json:"agent"`
	} `json:"exit_codes"`
}

func readWorkerContract(t *testing.T) workerContract {
	t.Helper()
	body, err := os.ReadFile(workerContractFile)
	if err != nil {
		t.Fatalf("the shared contract is what all three readers are pinned to: %v", err)
	}
	var c workerContract
	if err := json.Unmarshal(body, &c); err != nil {
		t.Fatal(err)
	}
	return c
}

func TestWorkerBootContractMatchesThisPackage(t *testing.T) {
	c := readWorkerContract(t)

	for _, tc := range []struct{ name, got, want string }{
		{"orchestrator command", OrchestratorCommand, c.OrchestratorCommand},
		{"worker command", WorkerCommand, c.WorkerCommand},
		{"probe arg", WorkerProbeArg, c.ProbeArg},
		{"probe command", WorkerProbeCommand(), c.ProbeCommand},
		{"probe marker", WorkerProbeMarker, c.ProbeMarker},
		{"worker actor", WorkerActor, c.WorkerActor},
		{"branch prefix", WorkerBranchPrefix, c.BranchPrefix},
		{"tick env", EnvTick, c.Env.Tick},
		{"worker branch env", EnvWorkerBranch, c.Env.WorkerBranch},
		{"worker timeout env", EnvWorkerTimeout, c.Env.Timeout},
		{"worker setup env", EnvWorkerSetup, c.Env.Setup},
		{"setup always", WorkerSetupAlways, c.SetupModes.Always},
		{"setup skip", WorkerSetupSkip, c.SetupModes.Skip},
		// The boundary guard's two strings (tick dxk). Three readers again:
		// the shell prints them, this package asserts the container did, and
		// worker-collect.ts looks for the report marker to surface an attempt
		// that its own `.tick/` diff — clean, because the guard worked — can
		// no longer reveal.
		{"tk denied", WorkerTkDeniedMessage, c.Boundary.TkDenied},
		{"boundary report marker", WorkerBoundaryReportMarker, c.Boundary.ReportMarker},
		{"branch", WorkerBranch(c.BranchExample.Epic, c.BranchExample.Tick), c.BranchExample.Branch},
		{"result file", WorkerResultFile(c.ResultFileExample.Tick), c.ResultFileExample.Path},
	} {
		if tc.got != tc.want {
			t.Errorf("%s: this package says %q, the shared contract says %q", tc.name, tc.got, tc.want)
		}
	}

	for _, tc := range []struct {
		name      string
		got, want int
	}{
		{"push", ExitWorkerPush, c.ExitCodes.Push},
		{"no-work", ExitWorkerNoWork, c.ExitCodes.NoWork},
		{"agent", ExitWorkerAgent, c.ExitCodes.Agent},
	} {
		if tc.got != tc.want {
			t.Errorf("exit code %s: this package says %d, the shared contract says %d", tc.name, tc.got, tc.want)
		}
	}
}

// The three exit codes a worker adds must not collide with the shared ones the
// orchestrator already uses, or a caller reading an exit status cannot tell
// "the gateway refused" from "the push failed".
func TestWorkerExitCodesAreDistinctFromTheSharedOnes(t *testing.T) {
	seen := map[int]string{
		ExitConfig: "config", ExitClone: "clone", ExitTkVersion: "tk-version",
		ExitPreflight: "preflight", ExitSetup: "setup", ExitModel: "model", ExitHarness: "harness",
	}
	for code, name := range map[int]string{
		ExitWorkerPush: "worker-push", ExitWorkerNoWork: "worker-no-work", ExitWorkerAgent: "worker-agent",
	} {
		if other, clash := seen[code]; clash {
			t.Errorf("exit %d is both %s and %s", code, other, name)
		}
		seen[code] = name
	}
}
