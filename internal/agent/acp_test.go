package agent

import (
	"testing"
)

func TestAcpAgent_Name(t *testing.T) {
	tests := []struct {
		agentName string
		want      string
	}{
		{"claude", "acp:claude"},
		{"codex", "acp:codex"},
		{"gemini", "acp:gemini"},
	}

	for _, tt := range tests {
		a := NewAcpAgent(tt.agentName)
		if got := a.Name(); got != tt.want {
			t.Errorf("NewAcpAgent(%q).Name() = %q, want %q", tt.agentName, got, tt.want)
		}
	}
}

func TestAcpAgent_Available(t *testing.T) {
	// Agent with nonexistent command
	a := &AcpAgent{AgentName: "test", Command: []string{"nonexistent-binary-xyz"}}
	if a.Available() {
		t.Error("Available() = true for nonexistent command, want false")
	}
}

func TestAcpAgent_Available_NoCommand(t *testing.T) {
	// Agent with unknown name and no command override
	a := &AcpAgent{AgentName: "unknown-agent-xyz"}
	if a.Available() {
		t.Error("Available() = true for unknown agent with no command, want false")
	}
}

func TestAcpAgent_command(t *testing.T) {
	tests := []struct {
		name  string
		agent *AcpAgent
		want  []string
	}{
		{
			name:  "default claude command",
			agent: &AcpAgent{AgentName: "claude"},
			want:  []string{"npx", "claude-code-acp"},
		},
		{
			name:  "default codex command",
			agent: &AcpAgent{AgentName: "codex"},
			want:  []string{"npx", "codex-acp"},
		},
		{
			name:  "default gemini command",
			agent: &AcpAgent{AgentName: "gemini"},
			want:  []string{"gemini"},
		},
		{
			name:  "custom command override",
			agent: &AcpAgent{AgentName: "claude", Command: []string{"/usr/local/bin/my-agent", "--acp"}},
			want:  []string{"/usr/local/bin/my-agent", "--acp"},
		},
		{
			name:  "unknown agent no default",
			agent: &AcpAgent{AgentName: "unknown"},
			want:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.agent.command()
			if len(got) != len(tt.want) {
				t.Fatalf("command() = %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("command()[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestNewAcpAgent(t *testing.T) {
	a := NewAcpAgent("codex")
	if a.AgentName != "codex" {
		t.Errorf("AgentName = %q, want %q", a.AgentName, "codex")
	}
	if len(a.Command) != 0 {
		t.Errorf("Command = %v, want nil", a.Command)
	}
}

func TestAcpAgent_ImplementsSessionAgent(t *testing.T) {
	var a Agent = NewAcpAgent("claude")
	sa, ok := a.(SessionAgent)
	if !ok {
		t.Fatal("AcpAgent should implement SessionAgent")
	}
	if sa.Name() != "acp:claude" {
		t.Errorf("Name() = %q, want %q", sa.Name(), "acp:claude")
	}
}

func TestClaudeAgent_DoesNotImplementSessionAgent(t *testing.T) {
	var a Agent = NewClaudeAgent()
	_, ok := a.(SessionAgent)
	if ok {
		t.Fatal("ClaudeAgent should NOT implement SessionAgent")
	}
}

func TestDefaultAgentCommands(t *testing.T) {
	// Verify all expected agents are registered
	expected := []string{"claude", "codex", "gemini"}
	for _, name := range expected {
		cmd, ok := DefaultAgentCommands[name]
		if !ok {
			t.Errorf("DefaultAgentCommands missing %q", name)
			continue
		}
		if len(cmd) == 0 {
			t.Errorf("DefaultAgentCommands[%q] is empty", name)
		}
	}
}
