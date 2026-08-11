package spawn

import (
	"encoding/json"
	"strings"
	"testing"
)

// baseOptions is a spawn whose only variable is what the fake pane shows.
func baseOptions() Options {
	return Options{
		RepoRoot:  "/repo",
		Branch:    "tick/1aw",
		Base:      "abc1234",
		AgentName: "tick-1aw",
		Kind:      "claude",
		Argv:      []string{"--permission-mode", "bypassPermissions", "--model", "sonnet"},
		Prompt:    "implement the tick",
	}
}

// TestRunHappyPath pins the whole sequence: worktree, start, one gate
// round-trip that reads the answer out of the pane, then the real prompt.
func TestRunHappyPath(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneAfterAnswer(DefaultGateProbe))
	c := srv.Client(t)

	res, err := Run(t.Context(), c, baseOptions())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	if res.WorktreePath != "/herdr/worktrees/repo/tick-1aw" {
		t.Errorf("WorktreePath = %q, want the path read off the response", res.WorktreePath)
	}
	if res.WorkspaceID != "w7" || res.PaneID != "w7:p1" {
		t.Errorf("workspace/pane = %q/%q, want w7/w7:p1", res.WorkspaceID, res.PaneID)
	}
	if res.GateAttempts != 1 {
		t.Errorf("GateAttempts = %d, want 1", res.GateAttempts)
	}
	if res.AgentSession == nil || res.AgentSession.Value != "sess-123" {
		t.Errorf("AgentSession = %+v, want the id captured after the gate", res.AgentSession)
	}
	if res.PromptWaited {
		t.Error("PromptWaited = true, want dispatch without blocking by default")
	}

	// Two prompts: the gate probe, then the implementer prompt. Only one
	// pane read is needed when the first probe lands.
	if n := srv.countMethod("agent.prompt"); n != 2 {
		t.Errorf("agent.prompt calls = %d, want 2 (gate + implementer prompt)", n)
	}
	if n := srv.countMethod("pane.read"); n != 1 {
		t.Errorf("pane.read calls = %d, want 1", n)
	}

	// Order matters: the pane must be read before the real prompt is sent.
	methods := srv.Methods()
	want := []string{"ping", "worktree.create", "agent.start", "agent.prompt", "pane.read", "agent.prompt"}
	if strings.Join(methods, ",") != strings.Join(want, ",") {
		t.Errorf("call sequence = %v, want %v", methods, want)
	}
}

// TestRunPassesArgvVerbatim pins that the compiled argv reaches agent.start
// untouched and in order — the spawner never merges or reorders it.
func TestRunPassesArgvVerbatim(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneAfterAnswer(DefaultGateProbe))
	c := srv.Client(t)

	opts := baseOptions()
	if _, err := Run(t.Context(), c, opts); err != nil {
		t.Fatalf("Run: %v", err)
	}

	for _, req := range srv.Requests() {
		if req.Method != "agent.start" {
			continue
		}
		var p struct {
			Args           []string `json:"args"`
			Name, Kind     string
			PaneID         string `json:"pane_id"`
			TimeoutMs      uint64 `json:"timeout_ms"`
			UnusedTiebreak string
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			t.Fatalf("decode agent.start params: %v", err)
		}
		if strings.Join(p.Args, " ") != strings.Join(opts.Argv, " ") {
			t.Errorf("agent.start args = %v, want %v verbatim", p.Args, opts.Argv)
		}
		if p.PaneID != "w7:p1" {
			t.Errorf("agent.start pane_id = %q, want the root pane from worktree.create", p.PaneID)
		}
		if p.TimeoutMs != 120000 {
			t.Errorf("agent.start timeout_ms = %d, want the default 120000", p.TimeoutMs)
		}
		return
	}
	t.Fatal("no agent.start request recorded")
}

// TestRunGateSilentDropThenSuccess pins the recovery the adapter documents: a
// probe that never reached the composer is re-sent once, and that works.
func TestRunGateSilentDropThenSuccess(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneUntouched, paneAfterAnswer(DefaultGateProbe))
	c := srv.Client(t)

	res, err := Run(t.Context(), c, baseOptions())
	if err != nil {
		t.Fatalf("Run after a re-sent probe: %v", err)
	}
	if res.GateAttempts != 2 {
		t.Errorf("GateAttempts = %d, want 2", res.GateAttempts)
	}
	if n := srv.countMethod("agent.prompt"); n != 3 {
		t.Errorf("agent.prompt calls = %d, want 3 (two probes + implementer prompt)", n)
	}
}

// TestRunGateSilentDropTwice pins that a second dropped probe is a failure,
// not a third attempt.
func TestRunGateSilentDropTwice(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneUntouched, paneUntouched)
	c := srv.Client(t)

	_, err := Run(t.Context(), c, baseOptions())
	if err == nil {
		t.Fatal("Run with a twice-dropped probe returned nil error")
	}
	var gerr *GateError
	if !asGateError(err, &gerr) {
		t.Fatalf("error = %v, want a *GateError", err)
	}
	if gerr.Outcome != GateSilentDrop {
		t.Errorf("Outcome = %q, want %q", gerr.Outcome, GateSilentDrop)
	}
	if gerr.Attempts != 2 {
		t.Errorf("Attempts = %d, want 2", gerr.Attempts)
	}
	// The implementer prompt must never be sent past a failed gate: two
	// probes and nothing else.
	if n := srv.countMethod("agent.prompt"); n != 2 {
		t.Errorf("agent.prompt calls = %d, want exactly the 2 probes", n)
	}
}

// TestRunGateErrorContent pins the green-start trap: the probe echoed, the
// answer did not follow, so the spawn fails and reports what the pane shows.
func TestRunGateErrorContent(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneErrorContent(DefaultGateProbe))
	c := srv.Client(t)

	_, err := Run(t.Context(), c, baseOptions())
	if err == nil {
		t.Fatal("Run against an erroring pane returned nil error")
	}
	var gerr *GateError
	if !asGateError(err, &gerr) {
		t.Fatalf("error = %v, want a *GateError", err)
	}
	if gerr.Outcome != GateErrorContent {
		t.Errorf("Outcome = %q, want %q", gerr.Outcome, GateErrorContent)
	}
	if gerr.Attempts != 1 {
		t.Errorf("Attempts = %d, want 1 — an echoed probe is never re-sent", gerr.Attempts)
	}
	if !strings.Contains(gerr.Excerpt, "not supported") {
		t.Errorf("Excerpt = %q, want the pane's error text", gerr.Excerpt)
	}
	if !strings.Contains(err.Error(), "not supported") {
		t.Errorf("error message = %q, want it to carry the pane excerpt", err.Error())
	}
	if n := srv.countMethod("agent.prompt"); n != 1 {
		t.Errorf("agent.prompt calls = %d, want 1 — an echoed probe is never re-sent", n)
	}
}

// TestClassify pins the three-way decision directly, including the trap the
// naive implementation falls into: the probe text itself contains the expected
// answer, so a whole-pane search would pass a dropped probe.
func TestClassify(t *testing.T) {
	probe := DefaultGateProbe
	cases := []struct {
		name string
		text string
		want GateOutcome
	}{
		{"answered", paneAfterAnswer(probe), GateAnswered},
		{"silent drop", paneUntouched, GateSilentDrop},
		{"error content", paneErrorContent(probe), GateErrorContent},
		{"echo with no answer at all", "> " + probe + "\n\n❯ \n", GateErrorContent},
		{"empty pane", "", GateSilentDrop},
		{"echo re-flowed across lines", "> Reply with the\n  single word OK\n\n⏺ OK\n", GateAnswered},
		{"answer only before the echo", "OK\n> " + probe + "\n", GateErrorContent},
		// Substring traps: a bare Contains("OK") calls each of these answered,
		// which reports a dead worker as a working round-trip.
		{"BROKEN is not OK", "> " + probe + "\n\n■ BROKEN pipe\n", GateErrorContent},
		{"TOKEN is not OK", "> " + probe + "\n\n■ TOKEN limit exceeded\n", GateErrorContent},
		{"OKTA is not OK", "> " + probe + "\n\n■ OKTA login required\n", GateErrorContent},
		// LastIndex means the last echo wins: a re-sent probe that was answered
		// the first time and dropped the second is not answered.
		{
			"answer before the last echo only",
			"> " + probe + "\n\n⏺ OK\n\n> " + probe + "\n\n❯ \n",
			GateErrorContent,
		},
		{
			"answer after the last echo",
			"> " + probe + "\n\n❯ \n\n> " + probe + "\n\n⏺ OK\n",
			GateAnswered,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Classify(tc.text, probe, DefaultGateExpect); got != tc.want {
				t.Errorf("Classify = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestRunValidatesAgentName pins that an unusable herdr agent name is caught
// before anything is dialled.
func TestRunValidatesAgentName(t *testing.T) {
	srv := newFakeHerd(t)
	c := srv.Client(t)
	before := srv.Dials()

	opts := baseOptions()
	opts.AgentName = "Tick-1AW"
	if _, err := Run(t.Context(), c, opts); err == nil {
		t.Fatal("Run with an invalid agent name returned nil error")
	}
	if srv.Dials() != before {
		t.Errorf("dials = %d, want no new connection for a client-side validation failure", srv.Dials()-before)
	}
}

// TestAgentNameShape pins the name the wait engine matches on.
func TestAgentNameShape(t *testing.T) {
	if got := AgentName("1AW"); got != "tick-1aw" {
		t.Errorf("AgentName = %q, want tick-1aw", got)
	}
}

// TestBuildPrompt pins the parts of the worker prompt the result contract
// depends on.
func TestBuildPrompt(t *testing.T) {
	got := BuildPrompt(PromptInput{
		TickID:      "1aw",
		Title:       "tk herd spawn",
		Description: "do the thing",
		Acceptance:  "tests green",
		EpicID:      "gyz",
		EpicTitle:   "Herd helper CLI",
		Branch:      "tick/1aw",
		Base:        "abc1234",
	})
	for _, want := range []string{
		"branch tick/1aw",
		"RESULT-1aw.md",
		"abc1234",
		"Herd helper CLI (gyz)",
		"do the thing",
		"tests green",
		"Do NOT run any `tk` command",
		"STATUS: DONE",
		"STATUS: BLOCKED",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("prompt missing %q\n---\n%s", want, got)
		}
	}
	if strings.Contains(got, "RESULT.md\n") {
		t.Error("prompt names a shared RESULT.md, which collides on the second merge of a wave")
	}
}

// asGateError is errors.As without the import ceremony in every test.
func asGateError(err error, target **GateError) bool {
	for err != nil {
		if g, ok := err.(*GateError); ok {
			*target = g
			return true
		}
		u, ok := err.(interface{ Unwrap() error })
		if !ok {
			return false
		}
		err = u.Unwrap()
	}
	return false
}
