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
		if tickResult["verdict"] != nil {
			t.Errorf("expected verdict to be cleared, got %v", tickResult["verdict"])
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
