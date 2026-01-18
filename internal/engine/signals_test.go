package engine

import (
	"testing"
)

func TestSignal_String(t *testing.T) {
	tests := []struct {
		signal Signal
		want   string
	}{
		{SignalNone, "NONE"},
		{SignalComplete, "COMPLETE"},
		{SignalEject, "EJECT"},
		{SignalBlocked, "BLOCKED"},
		{SignalApprovalNeeded, "APPROVAL_NEEDED"},
		{SignalInputNeeded, "INPUT_NEEDED"},
		{SignalReviewRequested, "REVIEW_REQUESTED"},
		{SignalContentReview, "CONTENT_REVIEW"},
		{SignalEscalate, "ESCALATE"},
		{SignalCheckpoint, "CHECKPOINT"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := tt.signal.String(); got != tt.want {
				t.Errorf("Signal.String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseSignals(t *testing.T) {
	tests := []struct {
		name       string
		output     string
		wantSignal Signal
		wantReason string
	}{
		{
			name:       "no signal in empty output",
			output:     "",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "no signal in regular output",
			output:     "I've completed the task. The tests pass.",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "complete signal",
			output:     "All tasks are done. <promise>COMPLETE</promise>",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "complete signal at start",
			output:     "<promise>COMPLETE</promise> and here is some trailing text",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "complete signal in middle of text",
			output:     "Some text before <promise>COMPLETE</promise> and after",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "eject signal with reason",
			output:     "This requires a large install. <promise>EJECT: Need to install Docker (>5GB)</promise>",
			wantSignal: SignalEject,
			wantReason: "Need to install Docker (>5GB)",
		},
		{
			name:       "eject signal with simple reason",
			output:     "<promise>EJECT: Large SDK required</promise>",
			wantSignal: SignalEject,
			wantReason: "Large SDK required",
		},
		{
			name:       "eject signal with spaces after colon",
			output:     "<promise>EJECT:   Multiple spaces</promise>",
			wantSignal: SignalEject,
			wantReason: "Multiple spaces",
		},
		{
			name:       "blocked signal with reason",
			output:     "Cannot proceed. <promise>BLOCKED: Missing API key for external service</promise>",
			wantSignal: SignalBlocked,
			wantReason: "Missing API key for external service",
		},
		{
			name:       "blocked signal with simple reason",
			output:     "<promise>BLOCKED: Unclear requirements</promise>",
			wantSignal: SignalBlocked,
			wantReason: "Unclear requirements",
		},
		{
			name:       "blocked signal with spaces after colon",
			output:     "<promise>BLOCKED:   Need clarification</promise>",
			wantSignal: SignalBlocked,
			wantReason: "Need clarification",
		},
		{
			name:       "complete takes priority over eject",
			output:     "<promise>COMPLETE</promise> <promise>EJECT: some reason</promise>",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "complete takes priority over blocked",
			output:     "<promise>BLOCKED: reason</promise> <promise>COMPLETE</promise>",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "eject takes priority over blocked",
			output:     "<promise>BLOCKED: reason1</promise> <promise>EJECT: reason2</promise>",
			wantSignal: SignalEject,
			wantReason: "reason2",
		},
		{
			name:       "multiline output with complete",
			output:     "Line 1\nLine 2\n<promise>COMPLETE</promise>\nLine 4",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "multiline output with eject",
			output:     "Working...\nFound issue\n<promise>EJECT: Need Xcode</promise>\nDone",
			wantSignal: SignalEject,
			wantReason: "Need Xcode",
		},
		{
			name:       "partial promise tag is not a signal",
			output:     "<promise>COMPLETE",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "incomplete eject is not a signal",
			output:     "<promise>EJECT: reason",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "wrong case is not a signal",
			output:     "<promise>complete</promise>",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "promise in text is not signal",
			output:     "I promise to COMPLETE this task",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "eject with colon in reason",
			output:     "<promise>EJECT: Error: disk full</promise>",
			wantSignal: SignalEject,
			wantReason: "Error: disk full",
		},
		{
			name:       "blocked with special characters",
			output:     "<promise>BLOCKED: Need credentials for https://api.example.com</promise>",
			wantSignal: SignalBlocked,
			wantReason: "Need credentials for https://api.example.com",
		},
		// New handoff signal types
		{
			name:       "approval needed signal with context",
			output:     "Ready for review. <promise>APPROVAL_NEEDED: Please approve the database migration</promise>",
			wantSignal: SignalApprovalNeeded,
			wantReason: "Please approve the database migration",
		},
		{
			name:       "approval needed signal without context",
			output:     "<promise>APPROVAL_NEEDED</promise>",
			wantSignal: SignalApprovalNeeded,
			wantReason: "",
		},
		{
			name:       "input needed signal with context",
			output:     "<promise>INPUT_NEEDED: What should the default timeout be?</promise>",
			wantSignal: SignalInputNeeded,
			wantReason: "What should the default timeout be?",
		},
		{
			name:       "input needed signal without context",
			output:     "<promise>INPUT_NEEDED</promise>",
			wantSignal: SignalInputNeeded,
			wantReason: "",
		},
		{
			name:       "review requested signal with context",
			output:     "<promise>REVIEW_REQUESTED: Please review the API changes before I continue</promise>",
			wantSignal: SignalReviewRequested,
			wantReason: "Please review the API changes before I continue",
		},
		{
			name:       "review requested signal without context",
			output:     "<promise>REVIEW_REQUESTED</promise>",
			wantSignal: SignalReviewRequested,
			wantReason: "",
		},
		{
			name:       "content review signal with context",
			output:     "<promise>CONTENT_REVIEW: Please verify the generated documentation is accurate</promise>",
			wantSignal: SignalContentReview,
			wantReason: "Please verify the generated documentation is accurate",
		},
		{
			name:       "content review signal without context",
			output:     "<promise>CONTENT_REVIEW</promise>",
			wantSignal: SignalContentReview,
			wantReason: "",
		},
		{
			name:       "escalate signal with context",
			output:     "<promise>ESCALATE: This security issue requires senior engineer review</promise>",
			wantSignal: SignalEscalate,
			wantReason: "This security issue requires senior engineer review",
		},
		{
			name:       "escalate signal without context",
			output:     "<promise>ESCALATE</promise>",
			wantSignal: SignalEscalate,
			wantReason: "",
		},
		{
			name:       "checkpoint signal with context",
			output:     "<promise>CHECKPOINT: Saving state before refactoring</promise>",
			wantSignal: SignalCheckpoint,
			wantReason: "Saving state before refactoring",
		},
		{
			name:       "checkpoint signal without context",
			output:     "<promise>CHECKPOINT</promise>",
			wantSignal: SignalCheckpoint,
			wantReason: "",
		},
		// Priority tests for new signals
		{
			name:       "complete takes priority over approval needed",
			output:     "<promise>APPROVAL_NEEDED: review</promise> <promise>COMPLETE</promise>",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "eject takes priority over input needed",
			output:     "<promise>INPUT_NEEDED: question</promise> <promise>EJECT: reason</promise>",
			wantSignal: SignalEject,
			wantReason: "reason",
		},
		{
			name:       "blocked takes priority over review requested",
			output:     "<promise>REVIEW_REQUESTED: review</promise> <promise>BLOCKED: blocked</promise>",
			wantSignal: SignalBlocked,
			wantReason: "blocked",
		},
		{
			name:       "approval needed takes priority over input needed",
			output:     "<promise>INPUT_NEEDED: input</promise> <promise>APPROVAL_NEEDED: approval</promise>",
			wantSignal: SignalApprovalNeeded,
			wantReason: "approval",
		},
		{
			name:       "unknown signal returns none",
			output:     "<promise>UNKNOWN_SIGNAL: something</promise>",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "escalate with colon in context",
			output:     "<promise>ESCALATE: Error: critical failure detected</promise>",
			wantSignal: SignalEscalate,
			wantReason: "Error: critical failure detected",
		},
		// Additional edge cases
		{
			name:       "signal with empty context after colon",
			output:     "<promise>EJECT: </promise>",
			wantSignal: SignalEject,
			wantReason: "",
		},
		{
			name:       "signal with only whitespace context",
			output:     "<promise>BLOCKED:    </promise>",
			wantSignal: SignalBlocked,
			wantReason: "",
		},
		{
			name:       "multiple signals of same type returns first context",
			output:     "<promise>CHECKPOINT: first checkpoint</promise> some text <promise>CHECKPOINT: second checkpoint</promise>",
			wantSignal: SignalCheckpoint,
			wantReason: "first checkpoint",
		},
		{
			name:       "signal embedded in code block style text",
			output:     "```\n<promise>COMPLETE</promise>\n```",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "signal with newline in surrounding text",
			output:     "Task done\n<promise>APPROVAL_NEEDED: security change</promise>\nWaiting",
			wantSignal: SignalApprovalNeeded,
			wantReason: "security change",
		},
		{
			name:       "review requested with PR URL",
			output:     "<promise>REVIEW_REQUESTED: github.com/pr/123</promise>",
			wantSignal: SignalReviewRequested,
			wantReason: "github.com/pr/123",
		},
		{
			name:       "content review with description",
			output:     "<promise>CONTENT_REVIEW: error messages</promise>",
			wantSignal: SignalContentReview,
			wantReason: "error messages",
		},
		{
			name:       "checkpoint with phase info",
			output:     "<promise>CHECKPOINT: phase 1 done</promise>",
			wantSignal: SignalCheckpoint,
			wantReason: "phase 1 done",
		},
		{
			name:       "input needed with question",
			output:     "<promise>INPUT_NEEDED: which database?</promise>",
			wantSignal: SignalInputNeeded,
			wantReason: "which database?",
		},
		{
			name:       "escalate with security concern",
			output:     "<promise>ESCALATE: found security vuln</promise>",
			wantSignal: SignalEscalate,
			wantReason: "found security vuln",
		},
		{
			name:       "signal with very long context",
			output:     "<promise>BLOCKED: This is a very long context string that contains multiple sentences explaining the blocking reason. It includes details about what went wrong and what needs to happen next.</promise>",
			wantSignal: SignalBlocked,
			wantReason: "This is a very long context string that contains multiple sentences explaining the blocking reason. It includes details about what went wrong and what needs to happen next.",
		},
		{
			name:       "signal with unicode characters in context",
			output:     "<promise>INPUT_NEEDED: What encoding to use? UTF-8 → UTF-16?</promise>",
			wantSignal: SignalInputNeeded,
			wantReason: "What encoding to use? UTF-8 → UTF-16?",
		},
		{
			name:       "signal at very end of output",
			output:     "All done!<promise>COMPLETE</promise>",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "signal at very start of output",
			output:     "<promise>COMPLETE</promise>All done!",
			wantSignal: SignalComplete,
			wantReason: "",
		},
		{
			name:       "mixed case signal not recognized",
			output:     "<promise>Complete</promise>",
			wantSignal: SignalNone,
			wantReason: "",
		},
		{
			name:       "signal with tabs in context",
			output:     "<promise>EJECT: needs\tinstall</promise>",
			wantSignal: SignalEject,
			wantReason: "needs\tinstall",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSignal, gotReason := ParseSignals(tt.output)
			if gotSignal != tt.wantSignal {
				t.Errorf("ParseSignals() signal = %v, want %v", gotSignal, tt.wantSignal)
			}
			if gotReason != tt.wantReason {
				t.Errorf("ParseSignals() reason = %q, want %q", gotReason, tt.wantReason)
			}
		})
	}
}

// TestParseSignals_AllTypes tests all signal types with context extraction
// as specified in the task requirements.
func TestParseSignals_AllTypes(t *testing.T) {
	tests := []struct {
		name    string
		output  string
		wantSig Signal
		wantCtx string
	}{
		{"complete", "<promise>COMPLETE</promise>", SignalComplete, ""},
		{"eject", "<promise>EJECT: needs npm install</promise>", SignalEject, "needs npm install"},
		{"blocked", "<promise>BLOCKED: missing API key</promise>", SignalBlocked, "missing API key"},
		{"approval", "<promise>APPROVAL_NEEDED: security change</promise>", SignalApprovalNeeded, "security change"},
		{"input", "<promise>INPUT_NEEDED: which database?</promise>", SignalInputNeeded, "which database?"},
		{"review", "<promise>REVIEW_REQUESTED: github.com/pr/123</promise>", SignalReviewRequested, "github.com/pr/123"},
		{"content", "<promise>CONTENT_REVIEW: error messages</promise>", SignalContentReview, "error messages"},
		{"escalate", "<promise>ESCALATE: found security vuln</promise>", SignalEscalate, "found security vuln"},
		{"checkpoint", "<promise>CHECKPOINT: phase 1 done</promise>", SignalCheckpoint, "phase 1 done"},
		{"no_signal", "just some text", SignalNone, ""},
		{"no_context", "<promise>COMPLETE</promise>", SignalComplete, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sig, ctx := ParseSignals(tt.output)
			if sig != tt.wantSig {
				t.Errorf("ParseSignals() signal = %v, want %v", sig, tt.wantSig)
			}
			if ctx != tt.wantCtx {
				t.Errorf("ParseSignals() context = %q, want %q", ctx, tt.wantCtx)
			}
		})
	}
}

// TestParseSignals_SignalPriority tests that signal priority is correctly applied.
func TestParseSignals_SignalPriority(t *testing.T) {
	tests := []struct {
		name    string
		output  string
		wantSig Signal
	}{
		{
			name:    "complete highest priority",
			output:  "<promise>CHECKPOINT: x</promise><promise>COMPLETE</promise><promise>ESCALATE: y</promise>",
			wantSig: SignalComplete,
		},
		{
			name:    "eject over all handoff signals",
			output:  "<promise>APPROVAL_NEEDED: x</promise><promise>EJECT: y</promise><promise>INPUT_NEEDED: z</promise>",
			wantSig: SignalEject,
		},
		{
			name:    "blocked over handoff signals",
			output:  "<promise>REVIEW_REQUESTED: x</promise><promise>BLOCKED: y</promise><promise>CONTENT_REVIEW: z</promise>",
			wantSig: SignalBlocked,
		},
		{
			name:    "approval over input",
			output:  "<promise>INPUT_NEEDED: x</promise><promise>APPROVAL_NEEDED: y</promise>",
			wantSig: SignalApprovalNeeded,
		},
		{
			name:    "input over review",
			output:  "<promise>REVIEW_REQUESTED: x</promise><promise>INPUT_NEEDED: y</promise>",
			wantSig: SignalInputNeeded,
		},
		{
			name:    "review over content",
			output:  "<promise>CONTENT_REVIEW: x</promise><promise>REVIEW_REQUESTED: y</promise>",
			wantSig: SignalReviewRequested,
		},
		{
			name:    "content over escalate",
			output:  "<promise>ESCALATE: x</promise><promise>CONTENT_REVIEW: y</promise>",
			wantSig: SignalContentReview,
		},
		{
			name:    "escalate over checkpoint",
			output:  "<promise>CHECKPOINT: x</promise><promise>ESCALATE: y</promise>",
			wantSig: SignalEscalate,
		},
		{
			name:    "checkpoint is lowest priority signal",
			output:  "<promise>CHECKPOINT: only signal</promise>",
			wantSig: SignalCheckpoint,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sig, _ := ParseSignals(tt.output)
			if sig != tt.wantSig {
				t.Errorf("ParseSignals() signal = %v, want %v", sig, tt.wantSig)
			}
		})
	}
}

// TestParseSignals_EdgeCases tests additional edge cases for signal parsing.
func TestParseSignals_EdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		output  string
		wantSig Signal
		wantCtx string
	}{
		{
			name:    "signal surrounded by other XML-like tags",
			output:  "<result><promise>COMPLETE</promise></result>",
			wantSig: SignalComplete,
			wantCtx: "",
		},
		{
			name:    "signal with HTML entities in context",
			output:  "<promise>INPUT_NEEDED: Use &lt;tag&gt; or [tag]?</promise>",
			wantSig: SignalInputNeeded,
			wantCtx: "Use &lt;tag&gt; or [tag]?",
		},
		{
			name:    "signal with numbers in context",
			output:  "<promise>EJECT: needs 10GB disk space</promise>",
			wantSig: SignalEject,
			wantCtx: "needs 10GB disk space",
		},
		{
			name:    "signal with parentheses in context",
			output:  "<promise>BLOCKED: missing env var (AWS_SECRET_KEY)</promise>",
			wantSig: SignalBlocked,
			wantCtx: "missing env var (AWS_SECRET_KEY)",
		},
		{
			name:    "signal with quotes in context",
			output:  `<promise>INPUT_NEEDED: What should "name" field contain?</promise>`,
			wantSig: SignalInputNeeded,
			wantCtx: `What should "name" field contain?`,
		},
		{
			name:    "malformed opening tag",
			output:  "< promise>COMPLETE</promise>",
			wantSig: SignalNone,
			wantCtx: "",
		},
		{
			name:    "malformed closing tag",
			output:  "<promise>COMPLETE</promise >",
			wantSig: SignalNone,
			wantCtx: "",
		},
		{
			name:    "nested promise tags ignored",
			output:  "<promise><promise>COMPLETE</promise></promise>",
			wantSig: SignalComplete,
			wantCtx: "",
		},
		{
			name:    "signal with leading/trailing whitespace in context trimmed",
			output:  "<promise>APPROVAL_NEEDED:   padded context   </promise>",
			wantSig: SignalApprovalNeeded,
			wantCtx: "padded context",
		},
		{
			name:    "empty promise tag",
			output:  "<promise></promise>",
			wantSig: SignalNone,
			wantCtx: "",
		},
		{
			name:    "promise tag with only spaces",
			output:  "<promise>   </promise>",
			wantSig: SignalNone,
			wantCtx: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sig, ctx := ParseSignals(tt.output)
			if sig != tt.wantSig {
				t.Errorf("ParseSignals() signal = %v, want %v", sig, tt.wantSig)
			}
			if ctx != tt.wantCtx {
				t.Errorf("ParseSignals() context = %q, want %q", ctx, tt.wantCtx)
			}
		})
	}
}
