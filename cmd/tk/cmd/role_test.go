package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// setupTestRepoWithConfig is setupTestRepo plus the .tick/config.json that
// tk create requires.
func setupTestRepoWithConfig(t *testing.T) (string, *tick.Store) {
	t.Helper()
	repoDir, store := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	if err := config.Save(filepath.Join(repoDir, ".tick", "config.json"), config.Default()); err != nil {
		t.Fatalf("save config: %v", err)
	}
	return repoDir, store
}

// runCreateJSON runs `tk create ... --json` via ExecuteArgs and parses the
// created tick from stdout.
func runCreateJSON(t *testing.T, args ...string) tick.Tick {
	t.Helper()
	out := captureStdout(t, func() error {
		return ExecuteArgs(append([]string{"create"}, append(args, "--json")...))
	})
	var created tick.Tick
	if err := json.Unmarshal([]byte(out), &created); err != nil {
		t.Fatalf("parse create json: %v\noutput: %s", err, out)
	}
	return created
}

// TestCreateWithRole verifies --role persists structurally on the tick.
func TestCreateWithRole(t *testing.T) {
	_, store := setupTestRepoWithConfig(t)

	epic := makeTestEpic("ep1")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	for _, role := range []string{tick.RoleReview, tick.RoleCloseout} {
		created := runCreateJSON(t, "Process tick "+role, "--parent", "ep1", "--role", role)
		if created.Role != role {
			t.Errorf("expected role %q on created tick, got %q", role, created.Role)
		}
		// Re-read from the store: the role must be persisted, not just echoed.
		stored, err := store.Read(created.ID)
		if err != nil {
			t.Fatalf("read created tick: %v", err)
		}
		if stored.Role != role {
			t.Errorf("expected persisted role %q, got %q", role, stored.Role)
		}
	}
}

// TestCreateRoleValidation verifies invalid role values and role-on-epic are rejected.
func TestCreateRoleValidation(t *testing.T) {
	setupTestRepoWithConfig(t)

	if err := ExecuteArgs([]string{"create", "Bad role", "--role", "bogus"}); err == nil {
		t.Errorf("expected error for invalid role value")
	}
	if err := ExecuteArgs([]string{"create", "Epic with role", "-t", "epic", "--role", "review"}); err == nil {
		t.Errorf("expected error for --role on an epic")
	}
}

// TestUpdateRole verifies setting and clearing role via tk update.
func TestUpdateRole(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("t1r")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "t1r", "--role", "review"}); err != nil {
		t.Fatalf("update --role review: %v", err)
	}
	got, err := store.Read("t1r")
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if got.Role != tick.RoleReview {
		t.Errorf("expected role review after update, got %q", got.Role)
	}

	if err := ExecuteArgs([]string{"update", "t1r", "--role", ""}); err != nil {
		t.Fatalf("update --role='': %v", err)
	}
	got, err = store.Read("t1r")
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if got.Role != "" {
		t.Errorf("expected role cleared, got %q", got.Role)
	}

	if err := ExecuteArgs([]string{"update", "t1r", "--role", "bogus"}); err == nil {
		t.Errorf("expected error for invalid role value")
	}

	epic := makeTestEpic("e1r")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	if err := ExecuteArgs([]string{"update", "e1r", "--role", "closeout"}); err == nil {
		t.Errorf("expected error for --role on an epic")
	}
}

// TestGraphMissingProcessTicks verifies the missing_process_ticks signal in
// tk graph --json across skeleton states.
func TestGraphMissingProcessTicks(t *testing.T) {
	t.Run("both_missing", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epa")
		task := makeTestTask("ta1")
		task.Parent = "epa"
		for _, x := range []tick.Tick{epic, task} {
			if err := store.Write(x); err != nil {
				t.Fatalf("write %s: %v", x.ID, err)
			}
		}

		out := runGraphJSON(t, "epa")
		if len(out.MissingProcessTicks) != 2 ||
			out.MissingProcessTicks[0] != tick.RoleReview ||
			out.MissingProcessTicks[1] != tick.RoleCloseout {
			t.Errorf("expected missing_process_ticks=[review closeout], got %v", out.MissingProcessTicks)
		}
	})

	t.Run("review_present_closeout_missing", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epb")
		task := makeTestTask("tb1")
		task.Parent = "epb"
		review := makeTestTask("tb2")
		review.Parent = "epb"
		review.Role = tick.RoleReview
		review.BlockedBy = []string{"tb1"}
		for _, x := range []tick.Tick{epic, task, review} {
			if err := store.Write(x); err != nil {
				t.Fatalf("write %s: %v", x.ID, err)
			}
		}

		out := runGraphJSON(t, "epb")
		if len(out.MissingProcessTicks) != 1 || out.MissingProcessTicks[0] != tick.RoleCloseout {
			t.Errorf("expected missing_process_ticks=[closeout], got %v", out.MissingProcessTicks)
		}
	})

	t.Run("complete_skeleton", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epc")
		task := makeTestTask("tc1")
		task.Parent = "epc"
		task.Description = "Update README.md wording"
		task.AcceptanceCriteria = "README.md contains the corrected text"
		task.Labels = []string{"mechanical", "tier:economy"}
		review := makeTestTask("tc2")
		review.Parent = "epc"
		review.Role = tick.RoleReview
		review.BlockedBy = []string{"tc1"}
		closeout := makeTestTask("tc3")
		closeout.Parent = "epc"
		closeout.Role = tick.RoleCloseout
		closeout.BlockedBy = []string{"tc2"}
		for _, x := range []tick.Tick{epic, task, review, closeout} {
			if err := store.Write(x); err != nil {
				t.Fatalf("write %s: %v", x.ID, err)
			}
		}

		out := runGraphJSON(t, "epc")
		if len(out.MissingProcessTicks) != 0 {
			t.Errorf("expected empty missing_process_ticks, got %v", out.MissingProcessTicks)
		}
		// The role must surface on graph tasks so orchestrators can route them.
		gt, _, ok := findGraphTask(out, "tc2")
		if !ok {
			t.Fatalf("tc2 not found in graph output")
		}
		if gt.Role != tick.RoleReview {
			t.Errorf("expected role review on tc2 graph task, got %q", gt.Role)
		}
		implementation, _, ok := findGraphTask(out, "tc1")
		if !ok {
			t.Fatalf("tc1 not found in graph output")
		}
		if implementation.Description != task.Description || implementation.AcceptanceCriteria != task.AcceptanceCriteria || implementation.Type != task.Type || len(implementation.Labels) != 2 {
			t.Errorf("graph task did not preserve routing metadata: %+v", implementation)
		}
	})

	t.Run("closed_process_ticks_still_satisfy", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epd")
		review := makeTestTask("td1")
		review.Parent = "epd"
		review.Role = tick.RoleReview
		review.Status = tick.StatusClosed
		closeout := makeTestTask("td2")
		closeout.Parent = "epd"
		closeout.Role = tick.RoleCloseout
		closeout.Status = tick.StatusClosed
		open := makeTestTask("td3")
		open.Parent = "epd"
		for _, x := range []tick.Tick{epic, review, closeout, open} {
			if err := store.Write(x); err != nil {
				t.Fatalf("write %s: %v", x.ID, err)
			}
		}

		out := runGraphJSON(t, "epd")
		if len(out.MissingProcessTicks) != 0 {
			t.Errorf("closed process ticks must satisfy the skeleton, got missing=%v", out.MissingProcessTicks)
		}
	})

	t.Run("childless_epic_reports_empty", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epe")
		if err := store.Write(epic); err != nil {
			t.Fatalf("write epic: %v", err)
		}

		out := runGraphJSON(t, "epe")
		if !out.NeedsPlanning {
			t.Errorf("expected needs_planning=true for childless epic")
		}
		if len(out.MissingProcessTicks) != 0 {
			t.Errorf("childless epic must not report missing process ticks (planning is the signal), got %v", out.MissingProcessTicks)
		}
	})

	t.Run("all_children_closed_without_skeleton", func(t *testing.T) {
		_, store := setupTestRepo(t)
		epic := makeTestEpic("epf")
		task := makeTestTask("tf1")
		task.Parent = "epf"
		task.Status = tick.StatusClosed
		for _, x := range []tick.Tick{epic, task} {
			if err := store.Write(x); err != nil {
				t.Fatalf("write %s: %v", x.ID, err)
			}
		}

		out := runGraphJSON(t, "epf")
		if len(out.MissingProcessTicks) != 2 {
			t.Errorf("legacy epic with closed children and no skeleton must report both roles missing, got %v", out.MissingProcessTicks)
		}
	})
}

// TestGraphHumanOutputMissingProcessTicks verifies the human-readable warning line.
func TestGraphHumanOutputMissingProcessTicks(t *testing.T) {
	_, store := setupTestRepo(t)
	epic := makeTestEpic("eph")
	task := makeTestTask("th1")
	task.Parent = "eph"
	for _, x := range []tick.Tick{epic, task} {
		if err := store.Write(x); err != nil {
			t.Fatalf("write %s: %v", x.ID, err)
		}
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "eph"})
	})
	if !strings.Contains(out, "missing process ticks") {
		t.Errorf("expected human output to warn about missing process ticks, got:\n%s", out)
	}
}

// TestNextJSONIncludesRole verifies tk next --json surfaces the role field so
// orchestrators can branch on it (final-review/close-out routing).
func TestNextJSONIncludesRole(t *testing.T) {
	_, store := setupTestRepo(t)
	epic := makeTestEpic("epn")
	review := makeTestTask("tn1")
	review.Parent = "epn"
	review.Role = tick.RoleReview
	for _, x := range []tick.Tick{epic, review} {
		if err := store.Write(x); err != nil {
			t.Fatalf("write %s: %v", x.ID, err)
		}
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"next", "epn", "--json", "--all"})
	})
	var m map[string]any
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("parse next json: %v\noutput: %s", err, out)
	}
	if m["role"] != tick.RoleReview {
		t.Errorf("expected role=review in tk next --json, got %v", m["role"])
	}
	if m["action"] != "implement" {
		t.Errorf("expected action=implement, got %v", m["action"])
	}
}
