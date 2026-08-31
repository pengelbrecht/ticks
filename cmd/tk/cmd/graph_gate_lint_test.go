package cmd

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// The planning lint: an open gated child with no "gate:" justification is
// flagged; a justified one, a checkpoint boundary, and an escalation are not.
// A warning surface only — the graph must still render.

func TestGraphUnjustifiedGateLint(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}

	if err := store.Write(makeTestEpic("epi")); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	write := func(id string, mutate func(*tick.Tick)) {
		tk := makeTestTask(id)
		tk.Parent = "epi"
		mutate(&tk)
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", id, err)
		}
	}

	requires := tick.RequiresApproval
	write("bad", func(t *tick.Tick) { t.Requires = &requires })

	requires2 := tick.RequiresApproval
	write("gud", func(t *tick.Tick) {
		t.Requires = &requires2
		t.Notes = "2026-08-30 10:00 - gate: copy tone is a taste call planning cannot settle"
	})

	// "investigate:" embeds the substring but is prose, not a justification —
	// it must NOT pass the lint (word-boundary match).
	requires3 := tick.RequiresApproval
	write("inv", func(t *tick.Tick) {
		t.Requires = &requires3
		t.Notes = "2026-08-30 10:01 - investigate: the retry path before deciding"
	})

	input := tick.AwaitingInput
	write("inp", func(t *tick.Tick) { t.Awaiting = &input })

	checkpoint := tick.AwaitingCheckpoint
	write("chk", func(t *tick.Tick) { t.Awaiting = &checkpoint })

	escalation := tick.AwaitingEscalation
	write("esc", func(t *tick.Tick) { t.Awaiting = &escalation })

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi", "--json"})
	})
	var g graphOutput
	if err := json.Unmarshal([]byte(out), &g); err != nil {
		t.Fatalf("decode graph json: %v\n%s", err, out)
	}

	want := map[string]bool{"bad": true, "inp": true, "inv": true}
	got := map[string]bool{}
	for _, id := range g.UnjustifiedGates {
		got[id] = true
	}
	if len(got) != len(want) || !got["bad"] || !got["inp"] || !got["inv"] {
		t.Errorf("unjustified_gates = %v, want exactly [bad inp inv]", g.UnjustifiedGates)
	}

	// Human output warns but still renders the graph.
	ResetFlags()
	human := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi"})
	})
	if !strings.Contains(human, "unjustified human gates") {
		t.Errorf("human output should carry the lint warning:\n%s", human)
	}
	if !strings.Contains(human, "Wave") {
		t.Errorf("lint must not suppress the graph itself:\n%s", human)
	}
}
