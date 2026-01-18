package engine

import (
	"regexp"
	"strings"
)

// Signal represents a Ralph control signal emitted by an agent.
type Signal int

const (
	// SignalNone indicates no signal was detected in the output.
	SignalNone Signal = iota

	// SignalComplete indicates the epic is complete (all tasks done).
	SignalComplete

	// SignalEject indicates the agent needs to exit for a large install or similar.
	SignalEject

	// SignalBlocked indicates the agent is blocked (missing credentials, unclear requirements, etc).
	// Legacy signal - maps to InputNeeded for backwards compatibility.
	SignalBlocked

	// SignalApprovalNeeded indicates the agent needs human approval before proceeding.
	SignalApprovalNeeded

	// SignalInputNeeded indicates the agent needs human input/information to continue.
	SignalInputNeeded

	// SignalReviewRequested indicates the agent wants a human to review work before continuing.
	SignalReviewRequested

	// SignalContentReview indicates the agent needs human review of generated content.
	SignalContentReview

	// SignalEscalate indicates the agent is escalating to a human due to complexity or risk.
	SignalEscalate

	// SignalCheckpoint indicates the agent has reached a checkpoint and is saving state.
	SignalCheckpoint
)

// String returns the string representation of the signal.
func (s Signal) String() string {
	switch s {
	case SignalComplete:
		return "COMPLETE"
	case SignalEject:
		return "EJECT"
	case SignalBlocked:
		return "BLOCKED"
	case SignalApprovalNeeded:
		return "APPROVAL_NEEDED"
	case SignalInputNeeded:
		return "INPUT_NEEDED"
	case SignalReviewRequested:
		return "REVIEW_REQUESTED"
	case SignalContentReview:
		return "CONTENT_REVIEW"
	case SignalEscalate:
		return "ESCALATE"
	case SignalCheckpoint:
		return "CHECKPOINT"
	default:
		return "NONE"
	}
}

// signalPatterns maps signal strings to Signal constants.
var signalPatterns = map[string]Signal{
	"COMPLETE":         SignalComplete,
	"EJECT":            SignalEject,
	"BLOCKED":          SignalBlocked,
	"APPROVAL_NEEDED":  SignalApprovalNeeded,
	"INPUT_NEEDED":     SignalInputNeeded,
	"REVIEW_REQUESTED": SignalReviewRequested,
	"CONTENT_REVIEW":   SignalContentReview,
	"ESCALATE":         SignalEscalate,
	"CHECKPOINT":       SignalCheckpoint,
}

// signalPriority defines the order in which signals are checked.
// Higher priority signals (lower index) take precedence when multiple signals are present.
var signalPriority = []string{
	"COMPLETE",
	"EJECT",
	"BLOCKED",
	"APPROVAL_NEEDED",
	"INPUT_NEEDED",
	"REVIEW_REQUESTED",
	"CONTENT_REVIEW",
	"ESCALATE",
	"CHECKPOINT",
}

// signalPattern matches <promise>SIGNAL_TYPE</promise> or <promise>SIGNAL_TYPE: context</promise>
// Captures the signal type and optional context after the colon.
var signalPattern = regexp.MustCompile(`<promise>(\w+)(?::\s*(.+?))?</promise>`)

// ParseSignals scans the agent output for Ralph control signals.
// It returns the detected signal and any associated context text.
// If multiple signals are present, priority order is used (Complete > Eject > Blocked > others).
// Format: <promise>SIGNAL_TYPE</promise> or <promise>SIGNAL_TYPE: context</promise>
func ParseSignals(output string) (Signal, string) {
	// Find all matches in the output
	matches := signalPattern.FindAllStringSubmatch(output, -1)
	if len(matches) == 0 {
		return SignalNone, ""
	}

	// Build a map of found signals to their contexts
	foundSignals := make(map[string]string)
	for _, match := range matches {
		signalStr := match[1]
		context := ""
		if len(match) > 2 {
			context = strings.TrimSpace(match[2])
		}
		// Only store the first occurrence of each signal type
		if _, exists := foundSignals[signalStr]; !exists {
			foundSignals[signalStr] = context
		}
	}

	// Return the highest priority signal found
	for _, signalStr := range signalPriority {
		if context, found := foundSignals[signalStr]; found {
			if signal, ok := signalPatterns[signalStr]; ok {
				return signal, context
			}
		}
	}

	return SignalNone, ""
}
