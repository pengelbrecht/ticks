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
}
