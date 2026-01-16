package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestCLIWorkflow(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	out, code := captureStdout(func() int {
		return run([]string{"tk", "create", "Test", "tick", "-t", "bug", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("expected create exit %d, got %d", exitSuccess, code)
	}
	var created map[string]any
	if err := json.Unmarshal([]byte(out), &created); err != nil {
		t.Fatalf("parse create json: %v", err)
	}
	id, ok := created["id"].(string)
	if !ok || id == "" {
		t.Fatalf("expected id in create output")
	}
	if created["type"] != "bug" {
		t.Fatalf("expected type bug, got %v", created["type"])
	}

	showOut, code := captureStdout(func() int {
		return run([]string{"tk", "show", "--json", id})
	})
	if code != exitSuccess {
		t.Fatalf("expected show exit %d, got %d", exitSuccess, code)
	}
	var shown map[string]any
	if err := json.Unmarshal([]byte(showOut), &shown); err != nil {
		t.Fatalf("parse show json: %v", err)
	}
	if shown["id"] != id {
		t.Fatalf("expected show id %s, got %v", id, shown["id"])
	}

	listOut, code := captureStdout(func() int {
		return run([]string{"tk", "list", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("expected list exit %d, got %d", exitSuccess, code)
	}
	if !bytes.Contains([]byte(listOut), []byte(id)) {
		t.Fatalf("expected list to include id %s", id)
	}

	if _, err := os.Stat(filepath.Join(repo, ".tick", "issues", id+".json")); err != nil {
		t.Fatalf("expected tick file: %v", err)
	}
}

func captureStdout(fn func() int) (string, int) {
	orig := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	code := fn()
	_ = w.Close()
	os.Stdout = orig

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	return buf.String(), code
}

func runGit(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	return cmd.Run()
}

func TestApproveCommand(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("no_id_returns_usage_error", func(t *testing.T) {
		_, code := captureStdout(func() int {
			return run([]string{"tk", "approve"})
		})
		if code != exitUsage {
			t.Errorf("expected exit code %d, got %d", exitUsage, code)
		}
	})

	t.Run("not_found_returns_not_found_error", func(t *testing.T) {
		_, code := captureStdout(func() int {
			return run([]string{"tk", "approve", "zzz"})
		})
		if code != exitNotFound {
			t.Errorf("expected exit code %d, got %d", exitNotFound, code)
		}
	})

	t.Run("not_awaiting_returns_usage_error", func(t *testing.T) {
		// Create a tick that is not awaiting human
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Not awaiting tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse create json: %v", err)
		}
		id := created["id"].(string)

		// Try to approve - should fail since not awaiting
		_, code = captureStdout(func() int {
			return run([]string{"tk", "approve", id})
		})
		if code != exitUsage {
			t.Errorf("expected exit code %d for not awaiting tick, got %d", exitUsage, code)
		}
	})

	t.Run("approve_awaiting_approval_closes_tick", func(t *testing.T) {
		// Create a tick with requires=approval (will route to human on close)
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Needs approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse create json: %v", err)
		}
		id := created["id"].(string)

		// Manually set awaiting=approval to simulate agent handoff
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, err := os.ReadFile(tickPath)
		if err != nil {
			t.Fatalf("read tick: %v", err)
		}
		var tickData map[string]any
		if err := json.Unmarshal(data, &tickData); err != nil {
			t.Fatalf("parse tick: %v", err)
		}
		tickData["awaiting"] = "approval"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		if err := os.WriteFile(tickPath, newData, 0o644); err != nil {
			t.Fatalf("write tick: %v", err)
		}

		// Approve
		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		if err := json.Unmarshal([]byte(approveOut), &result); err != nil {
			t.Fatalf("parse approve json: %v", err)
		}

		if result["closed"] != true {
			t.Errorf("expected closed=true, got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] != "closed" {
			t.Errorf("expected status=closed, got %v", tickResult["status"])
		}
		if tickResult["awaiting"] != nil {
			t.Errorf("expected awaiting to be cleared, got %v", tickResult["awaiting"])
		}
		if tickResult["verdict"] != "approved" {
			t.Errorf("expected verdict to be preserved as approved, got %v", tickResult["verdict"])
		}
	})

	t.Run("approve_awaiting_checkpoint_returns_to_agent", func(t *testing.T) {
		// Create a tick
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Checkpoint tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse create json: %v", err)
		}
		id := created["id"].(string)

		// Manually set awaiting=checkpoint
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, err := os.ReadFile(tickPath)
		if err != nil {
			t.Fatalf("read tick: %v", err)
		}
		var tickData map[string]any
		if err := json.Unmarshal(data, &tickData); err != nil {
			t.Fatalf("parse tick: %v", err)
		}
		tickData["awaiting"] = "checkpoint"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		if err := os.WriteFile(tickPath, newData, 0o644); err != nil {
			t.Fatalf("write tick: %v", err)
		}

		// Approve
		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		if err := json.Unmarshal([]byte(approveOut), &result); err != nil {
			t.Fatalf("parse approve json: %v", err)
		}

		// Checkpoint should NOT close on approve
		if result["closed"] != false {
			t.Errorf("expected closed=false for checkpoint, got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] == "closed" {
			t.Error("expected tick to remain open after checkpoint approval")
		}
	})

	t.Run("approve_manual_tick", func(t *testing.T) {
		// Create a manual tick
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Manual tick", "--manual", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse create json: %v", err)
		}
		id := created["id"].(string)

		// Approve - manual flag is treated as awaiting=work
		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		if err := json.Unmarshal([]byte(approveOut), &result); err != nil {
			t.Fatalf("parse approve json: %v", err)
		}

		// Manual (awaiting=work) closes on approve
		if result["closed"] != true {
			t.Errorf("expected closed=true for manual tick approval, got %v", result["closed"])
		}
	})

	t.Run("approve_awaiting_review_closes_tick", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Review tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse create json: %v", err)
		}
		id := created["id"].(string)

		// Set awaiting=review
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "review"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(approveOut), &result)

		if result["closed"] != true {
			t.Errorf("expected closed=true for review approval, got %v", result["closed"])
		}
	})

	t.Run("approve_awaiting_content_closes_tick", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Content tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=content
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "content"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(approveOut), &result)

		if result["closed"] != true {
			t.Errorf("expected closed=true for content approval, got %v", result["closed"])
		}
	})

	t.Run("approve_awaiting_work_closes_tick", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Work tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=work
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "work"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(approveOut), &result)

		if result["closed"] != true {
			t.Errorf("expected closed=true for work approval, got %v", result["closed"])
		}
	})

	t.Run("approve_awaiting_input_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Input tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=input
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "input"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(approveOut), &result)

		if result["closed"] != false {
			t.Errorf("expected closed=false for input approval (returns to agent), got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] == "closed" {
			t.Error("expected tick to remain open after input approval")
		}
	})

	t.Run("approve_awaiting_escalation_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Escalation tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=escalation
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "escalation"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		approveOut, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(approveOut), &result)

		if result["closed"] != false {
			t.Errorf("expected closed=false for escalation approval (returns to agent), got %v", result["closed"])
		}
	})
}

func TestRejectCommand(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("no_id_returns_usage_error", func(t *testing.T) {
		_, code := captureStdout(func() int {
			return run([]string{"tk", "reject"})
		})
		if code != exitUsage {
			t.Errorf("expected exit code %d, got %d", exitUsage, code)
		}
	})

	t.Run("not_found_returns_not_found_error", func(t *testing.T) {
		_, code := captureStdout(func() int {
			return run([]string{"tk", "reject", "zzz"})
		})
		if code != exitNotFound {
			t.Errorf("expected exit code %d, got %d", exitNotFound, code)
		}
	})

	t.Run("not_awaiting_returns_usage_error", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Not awaiting reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		_, code = captureStdout(func() int {
			return run([]string{"tk", "reject", id})
		})
		if code != exitUsage {
			t.Errorf("expected exit code %d for not awaiting tick, got %d", exitUsage, code)
		}
	})

	t.Run("reject_awaiting_approval_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Approval reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=approval
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "approval"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		// Terminal states return to agent on reject (not closed)
		if result["closed"] != false {
			t.Errorf("expected closed=false for approval rejection, got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] == "closed" {
			t.Error("expected tick to remain open after approval rejection")
		}
		if tickResult["awaiting"] != nil {
			t.Errorf("expected awaiting to be cleared, got %v", tickResult["awaiting"])
		}
	})

	t.Run("reject_awaiting_review_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Review reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "review"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		if result["closed"] != false {
			t.Errorf("expected closed=false for review rejection, got %v", result["closed"])
		}
	})

	t.Run("reject_awaiting_content_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Content reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "content"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		if result["closed"] != false {
			t.Errorf("expected closed=false for content rejection, got %v", result["closed"])
		}
	})

	t.Run("reject_awaiting_work_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Work reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "work"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		if result["closed"] != false {
			t.Errorf("expected closed=false for work rejection, got %v", result["closed"])
		}
	})

	t.Run("reject_awaiting_input_closes_tick", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Input reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=input
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "input"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		// Non-terminal input closes on reject (can't proceed)
		if result["closed"] != true {
			t.Errorf("expected closed=true for input rejection, got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] != "closed" {
			t.Errorf("expected status=closed, got %v", tickResult["status"])
		}
	})

	t.Run("reject_awaiting_escalation_closes_tick", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Escalation reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=escalation
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "escalation"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		// Non-terminal escalation closes on reject (won't do)
		if result["closed"] != true {
			t.Errorf("expected closed=true for escalation rejection, got %v", result["closed"])
		}

		tickResult := result["tick"].(map[string]any)
		if tickResult["status"] != "closed" {
			t.Errorf("expected status=closed, got %v", tickResult["status"])
		}
	})

	t.Run("reject_awaiting_checkpoint_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Checkpoint reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=checkpoint
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "checkpoint"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		// Checkpoint never closes, always returns to agent
		if result["closed"] != false {
			t.Errorf("expected closed=false for checkpoint rejection, got %v", result["closed"])
		}
	})

	t.Run("reject_with_feedback_adds_note", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Feedback tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=approval
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "approval"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		// Reject with feedback
		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "Please fix the error handling", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		tickResult := result["tick"].(map[string]any)
		notes, ok := tickResult["notes"].(string)
		if !ok || notes == "" {
			t.Fatalf("expected notes to be set, got %v", tickResult["notes"])
		}

		// Check that feedback is in notes with [human] prefix
		if !bytes.Contains([]byte(notes), []byte("[human]")) {
			t.Errorf("expected notes to contain [human] prefix, got: %s", notes)
		}
		if !bytes.Contains([]byte(notes), []byte("Please fix the error handling")) {
			t.Errorf("expected notes to contain feedback, got: %s", notes)
		}
	})

	t.Run("reject_manual_tick_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Manual reject tick", "--manual", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Reject - manual flag is treated as awaiting=work (terminal)
		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		var result map[string]any
		json.Unmarshal([]byte(rejectOut), &result)

		// Manual (awaiting=work) is terminal, so reject returns to agent
		if result["closed"] != false {
			t.Errorf("expected closed=false for manual tick rejection, got %v", result["closed"])
		}
	})

	t.Run("reject_with_json_output", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "JSON reject tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set awaiting=input (closes on reject)
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		tickData["awaiting"] = "input"
		tickData["status"] = "in_progress"
		newData, _ := json.MarshalIndent(tickData, "", "  ")
		os.WriteFile(tickPath, newData, 0o644)

		rejectOut, code := captureStdout(func() int {
			return run([]string{"tk", "reject", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected reject exit %d, got %d", exitSuccess, code)
		}

		// Verify JSON output format
		var result map[string]any
		if err := json.Unmarshal([]byte(rejectOut), &result); err != nil {
			t.Fatalf("failed to parse JSON output: %v", err)
		}

		if _, ok := result["tick"]; !ok {
			t.Error("expected 'tick' field in JSON output")
		}
		if _, ok := result["closed"]; !ok {
			t.Error("expected 'closed' field in JSON output")
		}
	})
}

func TestNoteFromFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("note_default_no_prefix", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Note test tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Add note with default --from (agent)
		code = run([]string{"tk", "note", id, "Agent note here"})
		if code != exitSuccess {
			t.Fatalf("expected note exit %d, got %d", exitSuccess, code)
		}

		// Read tick and check notes
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		notes := tickData["notes"].(string)

		if bytes.Contains([]byte(notes), []byte("[human]")) {
			t.Errorf("expected no [human] prefix for default --from, got: %s", notes)
		}
		if !bytes.Contains([]byte(notes), []byte("Agent note here")) {
			t.Errorf("expected note text in notes, got: %s", notes)
		}
	})

	t.Run("note_from_agent_no_prefix", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Agent note tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Add note with explicit --from agent
		code = run([]string{"tk", "note", id, "Explicit agent note", "--from", "agent"})
		if code != exitSuccess {
			t.Fatalf("expected note exit %d, got %d", exitSuccess, code)
		}

		// Read tick and check notes
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		notes := tickData["notes"].(string)

		if bytes.Contains([]byte(notes), []byte("[human]")) {
			t.Errorf("expected no [human] prefix for --from agent, got: %s", notes)
		}
		if !bytes.Contains([]byte(notes), []byte("Explicit agent note")) {
			t.Errorf("expected note text in notes, got: %s", notes)
		}
	})

	t.Run("note_from_human_adds_prefix", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Human note tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Add note with --from human
		code = run([]string{"tk", "note", id, "Human feedback here", "--from", "human"})
		if code != exitSuccess {
			t.Fatalf("expected note exit %d, got %d", exitSuccess, code)
		}

		// Read tick and check notes
		tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
		data, _ := os.ReadFile(tickPath)
		var tickData map[string]any
		json.Unmarshal(data, &tickData)
		notes := tickData["notes"].(string)

		if !bytes.Contains([]byte(notes), []byte("[human]")) {
			t.Errorf("expected [human] prefix for --from human, got: %s", notes)
		}
		if !bytes.Contains([]byte(notes), []byte("Human feedback here")) {
			t.Errorf("expected note text in notes, got: %s", notes)
		}
	})

	t.Run("note_from_invalid_fails", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Invalid from tick", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Add note with invalid --from value
		code = run([]string{"tk", "note", id, "Some note", "--from", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid --from, got %d", exitUsage, code)
		}
	})
}

func TestUpdateRequiresFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("set_requires_approval", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with --requires approval
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--requires", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["requires"] != "approval" {
			t.Errorf("expected requires=approval, got %v", updated["requires"])
		}
	})

	t.Run("set_requires_review", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with --requires review
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--requires", "review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["requires"] != "review" {
			t.Errorf("expected requires=review, got %v", updated["requires"])
		}
	})

	t.Run("set_requires_content", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with --requires content
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--requires", "content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["requires"] != "content" {
			t.Errorf("expected requires=content, got %v", updated["requires"])
		}
	})

	t.Run("clear_requires_with_empty", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test clear requires", "--requires", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		if created["requires"] != "approval" {
			t.Fatalf("expected requires=approval after create, got %v", created["requires"])
		}

		// Clear with --requires=
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--requires=", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["requires"] != nil {
			t.Errorf("expected requires=nil after clearing, got %v", updated["requires"])
		}
	})

	t.Run("invalid_requires_value_fails", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test invalid requires", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Try invalid value
		code = run([]string{"tk", "update", id, "--requires", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid requires value, got %d", exitUsage, code)
		}
	})

	t.Run("short_flag_r_works", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test short flag", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with -r approval
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "-r", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["requires"] != "approval" {
			t.Errorf("expected requires=approval with -r flag, got %v", updated["requires"])
		}
	})
}

func TestUpdateAwaitingFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("set_awaiting_work", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "work" {
			t.Errorf("expected awaiting=work, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_approval", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "approval" {
			t.Errorf("expected awaiting=approval, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_input", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting input", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "input", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "input" {
			t.Errorf("expected awaiting=input, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_review", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "review" {
			t.Errorf("expected awaiting=review, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_content", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "content" {
			t.Errorf("expected awaiting=content, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_escalation", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting escalation", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "escalation", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "escalation" {
			t.Errorf("expected awaiting=escalation, got %v", updated["awaiting"])
		}
	})

	t.Run("set_awaiting_checkpoint", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting checkpoint", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting", "checkpoint", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "checkpoint" {
			t.Errorf("expected awaiting=checkpoint, got %v", updated["awaiting"])
		}
	})

	t.Run("clear_awaiting_with_empty", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test clear awaiting", "--awaiting", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		if created["awaiting"] != "work" {
			t.Fatalf("expected awaiting=work after create, got %v", created["awaiting"])
		}

		// Clear with --awaiting=
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--awaiting=", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != nil {
			t.Errorf("expected awaiting=nil after clearing, got %v", updated["awaiting"])
		}
	})

	t.Run("invalid_awaiting_value_fails", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test invalid awaiting", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Try invalid value
		code = run([]string{"tk", "update", id, "--awaiting", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid awaiting value, got %d", exitUsage, code)
		}
	})

	t.Run("short_flag_a_works", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test short flag", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with -a work
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "-a", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["awaiting"] != "work" {
			t.Errorf("expected awaiting=work with -a flag, got %v", updated["awaiting"])
		}
	})
}

func TestUpdateVerdictFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("verdict_approved_closes_awaiting_approval", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test verdict approved", "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set verdict=approved
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--verdict", "approved", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		// ProcessVerdict should have cleared awaiting and closed the tick
		if updated["status"] != "closed" {
			t.Errorf("expected status=closed after approved verdict on awaiting=approval, got %v", updated["status"])
		}
		if updated["awaiting"] != nil {
			t.Errorf("expected awaiting=nil after verdict processing, got %v", updated["awaiting"])
		}
	})

	t.Run("verdict_rejected_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test verdict rejected", "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set verdict=rejected
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--verdict", "rejected", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		// ProcessVerdict should have cleared awaiting but NOT closed (rejected on approval returns to agent)
		if updated["status"] == "closed" {
			t.Errorf("expected status != closed after rejected verdict on awaiting=approval, got %v", updated["status"])
		}
		if updated["awaiting"] != nil {
			t.Errorf("expected awaiting=nil after verdict processing, got %v", updated["awaiting"])
		}
	})

	t.Run("verdict_approved_on_input_returns_to_agent", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test input approved", "--awaiting", "input", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set verdict=approved on input (should return to agent, not close)
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--verdict", "approved", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		// Input + approved = returns to agent (not closed)
		if updated["status"] == "closed" {
			t.Errorf("expected status != closed after approved verdict on awaiting=input, got %v", updated["status"])
		}
	})

	t.Run("verdict_rejected_on_input_closes", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test input rejected", "--awaiting", "input", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Set verdict=rejected on input (should close)
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--verdict", "rejected", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		// Input + rejected = closes (can't proceed)
		if updated["status"] != "closed" {
			t.Errorf("expected status=closed after rejected verdict on awaiting=input, got %v", updated["status"])
		}
	})

	t.Run("invalid_verdict_value_fails", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test invalid verdict", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Try invalid value
		code = run([]string{"tk", "update", id, "--verdict", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid verdict value, got %d", exitUsage, code)
		}
	})

	t.Run("short_flag_v_works", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test short flag", "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with -v approved
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "-v", "approved", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		if updated["status"] != "closed" {
			t.Errorf("expected status=closed with -v approved flag, got %v", updated["status"])
		}
	})

	t.Run("verdict_on_non_awaiting_tick_is_no_op", func(t *testing.T) {
		// Per task spec: "Unlike approve/reject commands, this doesn't automatically validate
		// that awaiting is set. The verdict processing will handle the edge case (no-op if not awaiting)."
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test no awaiting", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)
		origStatus := created["status"]

		// Set verdict on tick without awaiting
		out, code = captureStdout(func() int {
			return run([]string{"tk", "update", id, "--verdict", "approved", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected update exit %d, got %d", exitSuccess, code)
		}

		var updated map[string]any
		json.Unmarshal([]byte(out), &updated)
		// Should not close (no-op since not awaiting)
		if updated["status"] != origStatus {
			t.Errorf("expected status unchanged for verdict on non-awaiting tick, got %v", updated["status"])
		}
		// Verdict should still be set even if processing was no-op
		if updated["verdict"] != "approved" {
			t.Errorf("expected verdict=approved to be set, got %v", updated["verdict"])
		}
	})
}

func TestCreateRequiresFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("create_with_requires_approval", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires approval", "--requires", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["requires"] != "approval" {
			t.Errorf("expected requires=approval, got %v", created["requires"])
		}
	})

	t.Run("create_with_requires_review", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires review", "--requires", "review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["requires"] != "review" {
			t.Errorf("expected requires=review, got %v", created["requires"])
		}
	})

	t.Run("create_with_requires_content", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test requires content", "--requires", "content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["requires"] != "content" {
			t.Errorf("expected requires=content, got %v", created["requires"])
		}
	})

	t.Run("create_without_requires", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test no requires", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["requires"] != nil {
			t.Errorf("expected requires=nil, got %v", created["requires"])
		}
	})

	t.Run("invalid_requires_value_fails", func(t *testing.T) {
		code := run([]string{"tk", "create", "Test invalid requires", "--requires", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid requires value, got %d", exitUsage, code)
		}
	})

	t.Run("short_flag_r_works", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test short flag", "-r", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["requires"] != "approval" {
			t.Errorf("expected requires=approval with -r flag, got %v", created["requires"])
		}
	})
}

func TestCreateAwaitingFlag(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("create_with_awaiting_work", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting work", "--awaiting", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "work" {
			t.Errorf("expected awaiting=work, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_approval", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting approval", "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "approval" {
			t.Errorf("expected awaiting=approval, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_input", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting input", "--awaiting", "input", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "input" {
			t.Errorf("expected awaiting=input, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_review", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting review", "--awaiting", "review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "review" {
			t.Errorf("expected awaiting=review, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_content", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting content", "--awaiting", "content", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "content" {
			t.Errorf("expected awaiting=content, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_escalation", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting escalation", "--awaiting", "escalation", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "escalation" {
			t.Errorf("expected awaiting=escalation, got %v", created["awaiting"])
		}
	})

	t.Run("create_with_awaiting_checkpoint", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test awaiting checkpoint", "--awaiting", "checkpoint", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "checkpoint" {
			t.Errorf("expected awaiting=checkpoint, got %v", created["awaiting"])
		}
	})

	t.Run("create_without_awaiting", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test no awaiting", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != nil {
			t.Errorf("expected awaiting=nil, got %v", created["awaiting"])
		}
	})

	t.Run("invalid_awaiting_value_fails", func(t *testing.T) {
		code := run([]string{"tk", "create", "Test invalid awaiting", "--awaiting", "invalid"})
		if code != exitUsage {
			t.Errorf("expected exit %d for invalid awaiting value, got %d", exitUsage, code)
		}
	})

	t.Run("short_flag_a_works", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test short flag", "-a", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		if created["awaiting"] != "work" {
			t.Errorf("expected awaiting=work with -a flag, got %v", created["awaiting"])
		}
	})
}

// TestManualFlagDeprecation verifies that --manual flag is deprecated and maps to awaiting=work
func TestManualFlagDeprecation(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	t.Run("create_with_manual_sets_awaiting_work_not_manual", func(t *testing.T) {
		// Using --manual should set awaiting=work and NOT set manual=true
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test manual flag", "--manual", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		if err := json.Unmarshal([]byte(out), &created); err != nil {
			t.Fatalf("parse json: %v", err)
		}

		// Should have awaiting=work
		if created["awaiting"] != "work" {
			t.Errorf("expected awaiting=work when using --manual, got %v", created["awaiting"])
		}

		// Should NOT have manual=true (field should be absent or false)
		if created["manual"] == true {
			t.Error("--manual flag should NOT set manual=true, only awaiting=work")
		}
	})

	t.Run("update_with_manual_true_sets_awaiting_work", func(t *testing.T) {
		// Create a normal tick first
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test update manual", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with --manual=true
		code = run([]string{"tk", "update", id, "--manual=true"})
		if code != exitSuccess {
			t.Fatalf("failed to update tick: exit %d", code)
		}

		// Verify the tick has awaiting=work and manual=false
		out, code = captureStdout(func() int {
			return run([]string{"tk", "show", "--json", id})
		})
		if code != exitSuccess {
			t.Fatalf("failed to show tick: exit %d", code)
		}
		var shown map[string]any
		json.Unmarshal([]byte(out), &shown)

		if shown["awaiting"] != "work" {
			t.Errorf("expected awaiting=work after --manual=true, got %v", shown["awaiting"])
		}
		if shown["manual"] == true {
			t.Error("--manual=true should NOT set manual=true, only awaiting=work")
		}
	})

	t.Run("update_with_manual_false_clears_awaiting", func(t *testing.T) {
		// Create a tick with awaiting=work
		out, code := captureStdout(func() int {
			return run([]string{"tk", "create", "Test clear manual", "--awaiting", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("failed to create tick: exit %d", code)
		}
		var created map[string]any
		json.Unmarshal([]byte(out), &created)
		id := created["id"].(string)

		// Update with --manual=false (should clear awaiting)
		code = run([]string{"tk", "update", id, "--manual=false"})
		if code != exitSuccess {
			t.Fatalf("failed to update tick: exit %d", code)
		}

		// Verify the tick has no awaiting
		out, code = captureStdout(func() int {
			return run([]string{"tk", "show", "--json", id})
		})
		if code != exitSuccess {
			t.Fatalf("failed to show tick: exit %d", code)
		}
		var shown map[string]any
		json.Unmarshal([]byte(out), &shown)

		if shown["awaiting"] != nil {
			t.Errorf("expected awaiting=nil after --manual=false, got %v", shown["awaiting"])
		}
		if shown["manual"] == true {
			t.Error("--manual=false should clear manual field")
		}
	})
}

func TestListAwaitingFilter(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	// Create ticks with different awaiting states
	var normalTickID, approvalTickID, reviewTickID, manualTickID string

	// Normal tick (no awaiting)
	out, code := captureStdout(func() int {
		return run([]string{"tk", "create", "Normal tick", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create normal tick: exit %d", code)
	}
	var created map[string]any
	json.Unmarshal([]byte(out), &created)
	normalTickID = created["id"].(string)

	// Tick awaiting approval
	out, code = captureStdout(func() int {
		return run([]string{"tk", "create", "Approval tick", "--awaiting", "approval", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create approval tick: exit %d", code)
	}
	json.Unmarshal([]byte(out), &created)
	approvalTickID = created["id"].(string)

	// Tick awaiting review
	out, code = captureStdout(func() int {
		return run([]string{"tk", "create", "Review tick", "--awaiting", "review", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create review tick: exit %d", code)
	}
	json.Unmarshal([]byte(out), &created)
	reviewTickID = created["id"].(string)

	// Manual tick (backwards compat - should be treated as awaiting work)
	out, code = captureStdout(func() int {
		return run([]string{"tk", "create", "Manual tick", "--manual", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create manual tick: exit %d", code)
	}
	json.Unmarshal([]byte(out), &created)
	manualTickID = created["id"].(string)

	t.Run("awaiting_empty_filters_all_awaiting", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "list", "--awaiting=", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("list --awaiting= failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should include approval, review, and manual ticks (3 total)
		if len(listResult.Ticks) != 3 {
			t.Errorf("expected 3 awaiting ticks, got %d", len(listResult.Ticks))
		}

		// Should NOT include normal tick
		for _, tick := range listResult.Ticks {
			if tick["id"] == normalTickID {
				t.Errorf("normal tick should not be in awaiting list")
			}
		}
	})

	t.Run("awaiting_specific_type_filters_correctly", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "list", "--awaiting", "approval", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("list --awaiting approval failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should only include approval tick
		if len(listResult.Ticks) != 1 {
			t.Errorf("expected 1 approval tick, got %d", len(listResult.Ticks))
		}
		if len(listResult.Ticks) > 0 && listResult.Ticks[0]["id"] != approvalTickID {
			t.Errorf("expected approval tick id %s, got %v", approvalTickID, listResult.Ticks[0]["id"])
		}
	})

	t.Run("awaiting_comma_separated_filters_multiple", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "list", "--awaiting", "approval,review", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("list --awaiting approval,review failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should include approval and review ticks (2 total)
		if len(listResult.Ticks) != 2 {
			t.Errorf("expected 2 ticks (approval, review), got %d", len(listResult.Ticks))
		}

		// Should NOT include normal or manual tick
		for _, tick := range listResult.Ticks {
			if tick["id"] == normalTickID || tick["id"] == manualTickID {
				t.Errorf("unexpected tick %s in filtered list", tick["id"])
			}
		}
	})

	t.Run("awaiting_work_includes_manual_ticks", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "list", "--awaiting", "work", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("list --awaiting work failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should include manual tick (backwards compat: Manual=true maps to awaiting=work)
		if len(listResult.Ticks) != 1 {
			t.Errorf("expected 1 work tick (manual), got %d", len(listResult.Ticks))
		}
		if len(listResult.Ticks) > 0 && listResult.Ticks[0]["id"] != manualTickID {
			t.Errorf("expected manual tick id %s, got %v", manualTickID, listResult.Ticks[0]["id"])
		}
	})

	t.Run("awaiting_combines_with_other_filters", func(t *testing.T) {
		// Use --all to ensure we see all owners, combined with --awaiting
		out, code := captureStdout(func() int {
			return run([]string{"tk", "list", "--awaiting", "review", "--all", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("list --awaiting review --all failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should still only include review tick
		if len(listResult.Ticks) != 1 {
			t.Errorf("expected 1 review tick, got %d", len(listResult.Ticks))
		}
		if len(listResult.Ticks) > 0 && listResult.Ticks[0]["id"] != reviewTickID {
			t.Errorf("expected review tick id %s, got %v", reviewTickID, listResult.Ticks[0]["id"])
		}
	})

	// Suppress unused variable warnings
	_ = normalTickID
	_ = approvalTickID
	_ = reviewTickID
	_ = manualTickID
}

func TestReadyAwaitingFilter(t *testing.T) {
	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	if err := os.Setenv("TICK_OWNER", "tester"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("TICK_OWNER") })

	if code := run([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %d", exitSuccess, code)
	}

	// Create ticks with different awaiting states
	var normalTickID, approvalTickID, manualTickID string

	// Normal tick (no awaiting)
	out, code := captureStdout(func() int {
		return run([]string{"tk", "create", "Normal tick", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create normal tick: exit %d", code)
	}
	var created map[string]any
	json.Unmarshal([]byte(out), &created)
	normalTickID = created["id"].(string)

	// Tick awaiting approval
	out, code = captureStdout(func() int {
		return run([]string{"tk", "create", "Approval tick", "--awaiting", "approval", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create approval tick: exit %d", code)
	}
	json.Unmarshal([]byte(out), &created)
	approvalTickID = created["id"].(string)

	// Manual tick (backwards compat - should be treated as awaiting work)
	out, code = captureStdout(func() int {
		return run([]string{"tk", "create", "Manual tick", "--manual", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("failed to create manual tick: exit %d", code)
	}
	json.Unmarshal([]byte(out), &created)
	manualTickID = created["id"].(string)

	t.Run("ready_excludes_awaiting_by_default", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "ready", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("ready failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should only include normal tick (1 total)
		if len(listResult.Ticks) != 1 {
			t.Errorf("expected 1 ready tick, got %d", len(listResult.Ticks))
		}

		// Should NOT include awaiting or manual ticks
		for _, tick := range listResult.Ticks {
			if tick["id"] == approvalTickID || tick["id"] == manualTickID {
				t.Errorf("awaiting/manual tick %s should not be in ready list by default", tick["id"])
			}
		}
	})

	t.Run("ready_include_awaiting_shows_all", func(t *testing.T) {
		out, code := captureStdout(func() int {
			return run([]string{"tk", "ready", "--include-awaiting", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("ready --include-awaiting failed: exit %d", code)
		}
		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should include all 3 ticks
		if len(listResult.Ticks) != 3 {
			t.Errorf("expected 3 ready ticks with --include-awaiting, got %d", len(listResult.Ticks))
		}

		// Verify all expected ticks are present
		ids := make(map[string]bool)
		for _, tick := range listResult.Ticks {
			ids[tick["id"].(string)] = true
		}
		if !ids[normalTickID] || !ids[approvalTickID] || !ids[manualTickID] {
			t.Errorf("expected all three ticks, got ids: %v", ids)
		}
	})

	t.Run("ready_include_manual_deprecated_still_works", func(t *testing.T) {
		// --include-manual is deprecated but should still work (maps to --include-awaiting)
		// Warning is printed to stderr, we just verify the command succeeds
		out, code := captureStdout(func() int {
			return run([]string{"tk", "ready", "--include-manual", "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("ready --include-manual failed: exit %d", code)
		}

		var listResult struct {
			Ticks []map[string]any `json:"ticks"`
		}
		json.Unmarshal([]byte(out), &listResult)

		// Should include all 3 ticks (same as --include-awaiting)
		if len(listResult.Ticks) != 3 {
			t.Errorf("expected 3 ready ticks with deprecated --include-manual, got %d", len(listResult.Ticks))
		}
	})

	// Suppress unused variable warnings
	_ = normalTickID
	_ = approvalTickID
	_ = manualTickID
}
