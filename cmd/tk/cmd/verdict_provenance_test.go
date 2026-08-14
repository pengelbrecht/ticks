package cmd

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// A verdict is a human's decision. An orchestrator runs with
// TK_ACTOR=<runner>:orchestrator (mandated by references/agent-runner.md), so a
// runner-shaped actor supplying a verdict is an agent clearing its own human
// gate. It must be refused unless the runner explicitly attests that it is
// relaying a real human decision with --from human.

func TestApproveRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("agent-approve")
	task.SetAwaiting(tick.AwaitingWork)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	err := ExecuteArgs([]string{"approve", task.ID})
	if err == nil {
		t.Fatal("approve as claude:orchestrator must be refused")
	}
	if !strings.Contains(err.Error(), "--from human") {
		t.Errorf("error must tell the caller how to attest, got: %v", err)
	}

	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status == tick.StatusClosed {
		t.Fatalf("refused approval must not close the tick: %+v", after)
	}
	if after.Awaiting == nil || *after.Awaiting != tick.AwaitingWork {
		t.Fatalf("refused approval must leave the gate intact: %+v", after)
	}
}

func TestRejectRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("agent-reject")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "pi:orchestrator")

	if err := ExecuteArgs([]string{"reject", task.ID, "not good enough"}); err == nil {
		t.Fatal("reject as pi:orchestrator must be refused")
	}

	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Awaiting == nil || *after.Awaiting != tick.AwaitingApproval {
		t.Fatalf("refused rejection must leave the gate intact: %+v", after)
	}
	if strings.Contains(after.Notes, "not good enough") {
		t.Fatalf("refused rejection must not persist its feedback note: %q", after.Notes)
	}
}

func TestUpdateVerdictRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("agent-update")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "codex:orchestrator")

	if err := ExecuteArgs([]string{"update", task.ID, "--verdict", "approved"}); err == nil {
		t.Fatal("update --verdict as codex:orchestrator must be refused")
	}

	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status == tick.StatusClosed {
		t.Fatalf("refused verdict must not close the tick: %+v", after)
	}
}

// --actor is provenance, not authorization: it must not launder an agent
// verdict into a human one. Only --from human attests.
func TestApproveRefusesAgentShapedActorFlagOnUpdate(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("actor-flag")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", task.ID, "--verdict", "approved", "--actor", "herdr:orchestrator"}); err == nil {
		t.Fatal("--actor herdr:orchestrator must be refused for a verdict")
	}
}

func TestApproveFromHumanStampsExactHumanActorDespiteOrchestratorEnv(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("relayed-approve")
	task.SetAwaiting(tick.AwaitingCheckpoint)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"approve", task.ID, "--from", "human"}); err != nil {
		t.Fatalf("relayed human approval must succeed: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatal(err)
	}
	for _, a := range activities {
		if a.TickID == task.ID && a.Action == tick.ActivityApprove {
			if a.Actor != "human" {
				t.Fatalf("relayed approval actor = %q, want exact human", a.Actor)
			}
			return
		}
	}
	t.Fatalf("missing approve activity: %+v", activities)
}

func TestApproveFromAgentIsRefusedOutright(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("from-agent")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"approve", task.ID, "--from", "agent"}); err == nil {
		t.Fatal("--from agent must be refused: an agent cannot clear a human gate")
	}
}

func TestApproveRejectsInvalidFromValue(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("bad-from")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"approve", task.ID, "--from", "robot"}); err == nil {
		t.Fatal("invalid --from value must be refused")
	}
}

// A bare terminal invocation (no TK_ACTOR) is the human path and stays working.
func TestApproveWithoutActorEnvStillWorks(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("bare-approve")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "")

	if err := ExecuteArgs([]string{"approve", task.ID}); err != nil {
		t.Fatalf("bare human approve must succeed: %v", err)
	}
	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status != tick.StatusClosed {
		t.Fatalf("bare human approve should close a terminal gate: %+v", after)
	}
}

// A named human actor is not runner-shaped and must keep working — this is the
// existing documented use of TK_ACTOR for a person.
func TestApproveWithNamedHumanActorStillWorks(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("named-human")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "human-reviewer")

	if err := ExecuteArgs([]string{"approve", task.ID}); err != nil {
		t.Fatalf("named human approve must succeed: %v", err)
	}
}

// Non-verdict writes are unaffected: an orchestrator still updates status,
// notes and everything else under its own actor.
func TestUpdateWithoutVerdictUnaffectedByGuard(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("status-only")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"update", task.ID, "--status", "in_progress"}); err != nil {
		t.Fatalf("non-verdict update must be unaffected: %v", err)
	}
}

func TestIsAgentActor(t *testing.T) {
	agentShaped := []string{
		"claude:orchestrator",
		"codex:orchestrator",
		"pi:orchestrator",
		"prime:orchestrator",
		"herdr:worker",
		"orchestrator",
		"Claude:Orchestrator",
	}
	for _, actor := range agentShaped {
		if !isAgentActor(actor) {
			t.Errorf("isAgentActor(%q) = false, want true", actor)
		}
	}

	humanShaped := []string{
		"",
		"human",
		"human-pete",
		"human-reviewer",
		"pete",
	}
	for _, actor := range humanShaped {
		if isAgentActor(actor) {
			t.Errorf("isAgentActor(%q) = true, want false", actor)
		}
	}
}

// tk close is the other way a gate can be cleared, and the routing error
// message advertises `--force` as the bypass. Guarding approve while leaving
// close --force open would be theatre.

func TestForceCloseOfGatedTickRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("force-gate")
	requires := tick.RequiresApproval
	task.Requires = &requires
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"close", task.ID, "--force", "--reason", "shipping it"}); err == nil {
		t.Fatal("force-closing a gated tick as a runner must be refused")
	}
	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status == tick.StatusClosed {
		t.Fatalf("refused force close must leave the tick open: %+v", after)
	}
}

func TestPlainCloseOfAwaitingWorkRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("close-human-work")
	task.SetAwaiting(tick.AwaitingWork)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "pi:orchestrator")

	if err := ExecuteArgs([]string{"close", task.ID, "--reason", "did it myself"}); err == nil {
		t.Fatal("closing a human-assigned tick as a runner must be refused")
	}
	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status == tick.StatusClosed {
		t.Fatalf("refused close must leave the human tick open: %+v", after)
	}
}

// The agent's own path stays intact: closing a --requires tick routes it to a
// human instead of closing, exactly as before.
func TestCloseRoutingStillWorksForAgentActor(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("routes-fine")
	requires := tick.RequiresApproval
	task.Requires = &requires
	task.Status = tick.StatusInProgress
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"close", task.ID, "--reason", "implemented"}); err == nil {
		t.Fatal("requires close must still return the routing error")
	}
	routed, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if routed.Awaiting == nil || *routed.Awaiting != tick.AwaitingApproval {
		t.Fatalf("agent close must still route the gate to a human: %+v", routed)
	}
}

func TestForceCloseOfGatedTickFromHumanSucceeds(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("force-relayed")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"close", task.ID, "--force", "--reason", "human said drop it", "--from", "human"}); err != nil {
		t.Fatalf("relayed human force close must succeed: %v", err)
	}
	after, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status != tick.StatusClosed {
		t.Fatalf("relayed force close should close the tick: %+v", after)
	}
}

// Force-closing an epic cascades over children and clears their gates, so it is
// gate-clearing too whenever any open child is awaiting a human.
func TestForceCloseEpicWithGatedChildRefusesAgentShapedActor(t *testing.T) {
	_, store := setupTestRepo(t)
	epic := makeTestTask("epic-force")
	epic.Type = tick.TypeEpic
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	child := makeTestTask("epic-force-child")
	child.Parent = epic.ID
	child.SetAwaiting(tick.AwaitingWork)
	if err := store.Write(child); err != nil {
		t.Fatalf("write child: %v", err)
	}

	t.Setenv("TK_ACTOR", "codex:orchestrator")

	if err := ExecuteArgs([]string{"close", epic.ID, "--force", "--reason", "done enough"}); err == nil {
		t.Fatal("force-closing an epic over a gated child as a runner must be refused")
	}
	after, err := store.Read(child.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.Status == tick.StatusClosed {
		t.Fatalf("refused cascade must leave the gated child open: %+v", after)
	}
}

// An epic force-close with no gated children is ordinary housekeeping.
func TestForceCloseEpicWithUngatedChildrenUnaffected(t *testing.T) {
	_, store := setupTestRepo(t)
	epic := makeTestTask("epic-plain")
	epic.Type = tick.TypeEpic
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	child := makeTestTask("epic-plain-child")
	child.Parent = epic.ID
	if err := store.Write(child); err != nil {
		t.Fatalf("write child: %v", err)
	}

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	if err := ExecuteArgs([]string{"close", epic.ID, "--force", "--reason", "wrapping up"}); err != nil {
		t.Fatalf("ungated epic force close must be unaffected: %v", err)
	}
}
