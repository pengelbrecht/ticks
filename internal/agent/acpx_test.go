package agent

import (
	"context"
	"testing"
	"time"
)

func TestAcpxAgent_Name(t *testing.T) {
	tests := []struct {
		agentName string
		want      string
	}{
		{"claude", "acpx:claude"},
		{"codex", "acpx:codex"},
		{"gemini", "acpx:gemini"},
	}

	for _, tt := range tests {
		a := NewAcpxAgent(tt.agentName)
		if got := a.Name(); got != tt.want {
			t.Errorf("NewAcpxAgent(%q).Name() = %q, want %q", tt.agentName, got, tt.want)
		}
	}
}

func TestAcpxAgent_Available(t *testing.T) {
	// acpx is unlikely to be installed in test environment
	a := &AcpxAgent{AgentName: "claude", Command: "nonexistent-acpx-binary-xyz"}
	if a.Available() {
		t.Error("Available() = true for nonexistent command, want false")
	}
}

func TestAcpxAgent_command(t *testing.T) {
	tests := []struct {
		name  string
		agent *AcpxAgent
		want  string
	}{
		{
			name:  "default command",
			agent: &AcpxAgent{AgentName: "claude"},
			want:  "acpx",
		},
		{
			name:  "custom command",
			agent: &AcpxAgent{AgentName: "claude", Command: "/usr/local/bin/acpx"},
			want:  "/usr/local/bin/acpx",
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

func TestAcpxAgent_Run_ContextCancellation(t *testing.T) {
	a := &AcpxAgent{AgentName: "claude", Command: "sleep"}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := a.Run(ctx, "10", RunOpts{})
	if err == nil {
		t.Error("Run() with cancelled context should return error")
	}
}

func TestAcpxAgent_Run_Timeout(t *testing.T) {
	a := &AcpxAgent{AgentName: "claude", Command: "sleep"}

	ctx := context.Background()
	opts := RunOpts{
		Timeout: 100 * time.Millisecond,
	}

	start := time.Now()
	_, err := a.Run(ctx, "10", opts)
	elapsed := time.Since(start)

	if err == nil {
		t.Error("Run() should timeout")
	}

	if elapsed > 1*time.Second {
		t.Errorf("Run() took %v, expected timeout around 100ms", elapsed)
	}
}

func TestNewAcpxAgent(t *testing.T) {
	a := NewAcpxAgent("codex")
	if a.AgentName != "codex" {
		t.Errorf("AgentName = %q, want %q", a.AgentName, "codex")
	}
	if a.Command != "acpx" {
		t.Errorf("Command = %q, want %q", a.Command, "acpx")
	}
}
