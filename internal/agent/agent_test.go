package agent

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestClaudeAgent_Name(t *testing.T) {
	agent := NewClaudeAgent()
	if got := agent.Name(); got != "claude" {
		t.Errorf("Name() = %q, want %q", got, "claude")
	}
}

func TestClaudeAgent_Available(t *testing.T) {
	agent := NewClaudeAgent()
	// This test just verifies the method runs without error
	// The actual result depends on whether claude is installed
	_ = agent.Available()
}

func TestClaudeAgent_Available_CustomCommand(t *testing.T) {
	agent := &ClaudeAgent{Command: "nonexistent-claude-binary-xyz"}
	if agent.Available() {
		t.Error("Available() = true for nonexistent command, want false")
	}
}

func TestClaudeAgent_command(t *testing.T) {
	tests := []struct {
		name  string
		agent *ClaudeAgent
		want  string
	}{
		{
			name:  "default command",
			agent: &ClaudeAgent{},
			want:  "claude",
		},
		{
			name:  "custom command",
			agent: &ClaudeAgent{Command: "/usr/local/bin/claude"},
			want:  "/usr/local/bin/claude",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.agent.command(); got != tt.want {
				t.Errorf("command() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestClaudeAgent_Run_ContextCancellation(t *testing.T) {
	// Skip if echo is not available (Windows)
	if _, err := exec.LookPath("echo"); err != nil {
		t.Skip("echo not available")
	}

	// Create an agent with a mock command that would take a long time
	agent := &ClaudeAgent{Command: "sleep"}

	// Create a context that's already cancelled
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := agent.Run(ctx, "10", RunOpts{})
	if err == nil {
		t.Error("Run() with cancelled context should return error")
	}
	if !strings.Contains(err.Error(), "cancel") && !strings.Contains(err.Error(), "context") {
		// On some systems it may fail with different errors
		t.Logf("Run() error: %v (may be expected)", err)
	}
}

func TestClaudeAgent_Run_Timeout(t *testing.T) {
	// Skip if sleep is not available
	if _, err := exec.LookPath("sleep"); err != nil {
		t.Skip("sleep not available")
	}

	// Create an agent with sleep command
	agent := &ClaudeAgent{Command: "sleep"}

	ctx := context.Background()
	opts := RunOpts{
		Timeout: 100 * time.Millisecond,
	}

	start := time.Now()
	_, err := agent.Run(ctx, "10", opts)
	elapsed := time.Since(start)

	if err == nil {
		t.Error("Run() should timeout")
	}

	// Should timeout before 1 second
	if elapsed > 1*time.Second {
		t.Errorf("Run() took %v, expected timeout around 100ms", elapsed)
	}
}

func TestClaudeAgent_Run_UsesNativeWorktree(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("shell script fixture uses POSIX sh")
	}

	tmpDir := t.TempDir()
	argsFile := filepath.Join(tmpDir, "args.txt")
	cwdFile := filepath.Join(tmpDir, "cwd.txt")
	scriptPath := filepath.Join(tmpDir, "fake-claude.sh")

	script := fmt.Sprintf(`#!/bin/sh
if [ "$1" = "--help" ]; then
  echo "--worktree [name]"
  exit 0
fi

printf '%%s\n' "$@" > %q
pwd > %q

cat <<'EOF'
{"type":"system","subtype":"init","session_id":"test-session","model":"sonnet"}
{"type":"result","subtype":"success","result":"ok","duration_ms":1,"num_turns":1,"total_cost_usd":0,"usage":{"input_tokens":1,"output_tokens":1,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}
EOF
`, argsFile, cwdFile)

	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		t.Fatalf("failed to write fake claude script: %v", err)
	}

	agent := &ClaudeAgent{Command: scriptPath}
	repoRoot := filepath.Join(tmpDir, "repo")
	workDir := filepath.Join(repoRoot, ".claude", "worktrees", "tk-epic1")
	if err := os.MkdirAll(workDir, 0755); err != nil {
		t.Fatalf("failed to create fake repo/worktree dirs: %v", err)
	}
	opts := RunOpts{
		WorkDir:      workDir,
		WorktreeName: "tk-epic1",
		RepoRoot:     repoRoot,
	}

	result, err := agent.Run(context.Background(), "say ok", opts)
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if result == nil {
		t.Fatal("Run() returned nil result")
	}

	argsData, err := os.ReadFile(argsFile)
	if err != nil {
		t.Fatalf("failed to read args file: %v", err)
	}
	argsText := string(argsData)
	if !strings.Contains(argsText, "--worktree") {
		t.Fatalf("expected --worktree in args, got:\n%s", argsText)
	}
	if !strings.Contains(argsText, "tk-epic1") {
		t.Fatalf("expected worktree name in args, got:\n%s", argsText)
	}
	if !strings.Contains(argsText, "say ok") {
		t.Fatalf("expected prompt in args, got:\n%s", argsText)
	}

	cwdData, err := os.ReadFile(cwdFile)
	if err != nil {
		t.Fatalf("failed to read cwd file: %v", err)
	}
	gotCwd := strings.TrimSpace(string(cwdData))
	wantCwd, err := filepath.EvalSymlinks(repoRoot)
	if err != nil {
		wantCwd = repoRoot
	}
	if gotCwd != wantCwd {
		t.Errorf("cwd = %q, want %q", gotCwd, wantCwd)
	}
}

func TestRunOpts_Defaults(t *testing.T) {
	opts := RunOpts{}
	if opts.Stream != nil {
		t.Error("Stream should be nil by default")
	}
	if opts.MaxTokens != 0 {
		t.Error("MaxTokens should be 0 by default")
	}
	if opts.Timeout != 0 {
		t.Error("Timeout should be 0 by default")
	}
	if opts.WorkDir != "" {
		t.Error("WorkDir should be empty by default")
	}
}

func TestRunOpts_WorkDir(t *testing.T) {
	opts := RunOpts{
		WorkDir: "/custom/work/dir",
	}
	if opts.WorkDir != "/custom/work/dir" {
		t.Errorf("WorkDir = %q, want %q", opts.WorkDir, "/custom/work/dir")
	}
}

func TestResult_Fields(t *testing.T) {
	result := &Result{
		Output:    "test output",
		TokensIn:  100,
		TokensOut: 200,
		Cost:      1.50,
		Duration:  5 * time.Second,
	}

	if result.Output != "test output" {
		t.Errorf("Output = %q, want %q", result.Output, "test output")
	}
	if result.TokensIn != 100 {
		t.Errorf("TokensIn = %d, want %d", result.TokensIn, 100)
	}
	if result.TokensOut != 200 {
		t.Errorf("TokensOut = %d, want %d", result.TokensOut, 200)
	}
	if result.Cost != 1.50 {
		t.Errorf("Cost = %f, want %f", result.Cost, 1.50)
	}
	if result.Duration != 5*time.Second {
		t.Errorf("Duration = %v, want %v", result.Duration, 5*time.Second)
	}
}

func TestErrTimeout(t *testing.T) {
	// Verify ErrTimeout is a sentinel error
	if ErrTimeout == nil {
		t.Fatal("ErrTimeout should not be nil")
	}
	if ErrTimeout.Error() != "agent timed out" {
		t.Errorf("ErrTimeout.Error() = %q, want %q", ErrTimeout.Error(), "agent timed out")
	}
}
