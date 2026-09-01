package cmd

import (
	"net/http"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory"
)

// Tick t4y.
//
// CI remediation decides whether it may push to a branch from a positive
// record that something created it, not from the branch's name. The write side
// for a container is this command, and these tests pin the three properties
// that make it a boundary rather than a convenience:
//
//   - it posts to the branch door, never anywhere else;
//   - it carries the RUN's own gateway token, never the operator's factory
//     token, so a stop that revokes the run reaches this too (D17);
//   - it names nothing about identity in the body. The project, the run and the
//     epic are the factory's to derive from the credential — a container that
//     could name them could record a branch on behalf of a run it is not.
//
// And the fourth, which is not about this command at all: the sandbox scripts
// call it, so the record is written by the substrate rather than asked of an
// agent's prompt.

func TestCloudBranchRecordsThroughTheRunsOwnDoor(t *testing.T) {
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodPost && request.Path == "/api/branches" {
			return http.StatusCreated, map[string]any{"recorded": true}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	t.Setenv(cloudEnvRunID, "run_t4y")
	t.Setenv(cloudEnvEpic, "epic1")
	t.Setenv(cloudEnvFactoryURL, endpoint)
	t.Setenv(cloudEnvFactoryToken, "tkr_run_scoped")
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "branch", "tick-run/epic1", "--detail", "run branch"}); err != nil {
		t.Fatalf("cloud branch: %v\n%s", err, buf.String())
	}

	if len(*requests) != 1 {
		t.Fatalf("factory received %d request(s), want exactly one", len(*requests))
	}
	got := (*requests)[0]
	if got.Path != "/api/branches" {
		t.Fatalf("cloud branch posted to %s, want /api/branches", got.Path)
	}
	if got.Auth != "Bearer tkr_run_scoped" {
		t.Errorf("authorization = %q, want the run's own gateway token", got.Auth)
	}
	if got.Body["branch"] != "tick-run/epic1" {
		t.Errorf("branch = %#v", got.Body["branch"])
	}
	if got.Body["detail"] != "run branch" {
		t.Errorf("detail = %#v", got.Body["detail"])
	}
	// Identity is the credential's to establish. A body that named the project,
	// the run or the owner would be a container asserting what only the
	// control plane may decide.
	for _, forbidden := range []string{"project", "run_id", "epic", "owner"} {
		if _, present := got.Body[forbidden]; present {
			t.Errorf("the request body names %q; identity comes from the token, not the body", forbidden)
		}
	}
	if out := buf.String(); !strings.Contains(out, "recorded tick-run/epic1") {
		t.Errorf("cloud branch said nothing about what it recorded:\n%s", out)
	}
}

func TestCloudBranchReportsAnAlreadyRecordedBranchWithoutFailing(t *testing.T) {
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		// The door answers 200 with recorded:false when somebody got there
		// first. Records are evidence and are never overwritten.
		return http.StatusOK, map[string]any{"recorded": false}
	})
	t.Setenv(cloudEnvRunID, "run_t4y")
	t.Setenv(cloudEnvFactoryURL, endpoint)
	t.Setenv(cloudEnvFactoryToken, "tkr_run_scoped")
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "branch", "tick-run/epic1"}); err != nil {
		t.Fatalf("cloud branch on an already-recorded branch: %v\n%s", err, buf.String())
	}
	if out := buf.String(); !strings.Contains(out, "already recorded") {
		t.Errorf("cloud branch did not say the branch was already decided:\n%s", out)
	}
}

func TestCloudBranchSurfacesTheFactorysOwnRefusal(t *testing.T) {
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusBadRequest, map[string]any{
			"error":  "branch_outside_epic",
			"detail": "tick/other/meo belongs to epic \"other\"",
		}
	})
	t.Setenv(cloudEnvRunID, "run_t4y")
	t.Setenv(cloudEnvFactoryURL, endpoint)
	t.Setenv(cloudEnvFactoryToken, "tkr_run_scoped")
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "branch", "tick/other/meo"})
	if err == nil {
		t.Fatal("cloud branch accepted a branch the factory refused")
	}
	// Verbatim, not reinterpreted: "that is not your epic" and "your token is
	// dead" are different operator problems and must stay distinguishable.
	if !strings.Contains(err.Error(), "branch_outside_epic") {
		t.Errorf("refusal lost the factory's own reason: %v", err)
	}
}

func TestCloudBranchWithoutAFactoryCredentialSaysWhatThatCosts(t *testing.T) {
	t.Setenv(cloudEnvFactoryURL, "")
	t.Setenv(cloudEnvFactoryToken, "")
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "branch", "tick-run/epic1"})
	if err == nil {
		t.Fatal("cloud branch claimed to record a branch with no factory to record it with")
	}
	// The consequence is named rather than left to be discovered: an
	// unrecorded branch is refused by remediation and reported in the digest.
	if !strings.Contains(err.Error(), "daily digest") {
		t.Errorf("the failure did not say what an unrecorded branch costs: %v", err)
	}
}

// The record must not depend on an agent choosing to write it. Both sandbox
// entrypoints create a branch, and both have to record the one they created —
// `.tick/learnings.md`, tick dxk: a boundary the substrate can enforce must
// not rest on instruction-following.
func TestSandboxScriptsRecordTheBranchesTheyCreate(t *testing.T) {
	for _, name := range []string{"entrypoint.sh", "worker.sh"} {
		data, err := factory.ReadSandboxFile(name)
		if err != nil {
			t.Fatalf("reading %s: %v", name, err)
		}
		if !strings.Contains(string(data), "record_branch \"$") {
			t.Errorf("%s creates a branch and never records it with the factory", name)
		}
	}

	common, err := factory.ReadSandboxFile("common.sh")
	if err != nil {
		t.Fatalf("reading common.sh: %v", err)
	}
	if !strings.Contains(string(common), "tk cloud branch") {
		t.Error("common.sh's record_branch does not call `tk cloud branch`")
	}

	// And the image has to have the subcommand, or a container boots and dies
	// mid-run with "unknown command".
	commands, err := factory.EntrypointTkCommands()
	if err != nil {
		t.Fatalf("EntrypointTkCommands: %v", err)
	}
	found := false
	for _, c := range commands {
		if c == "cloud branch" {
			found = true
		}
	}
	if !found {
		t.Errorf("`cloud branch` is not in the derived required-tk-commands set: %q", commands)
	}
}
