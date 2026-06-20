package query

import (
	"github.com/pengelbrecht/ticks/internal/tick"
)

// gatesHuman reports whether a tick should be treated as awaiting human action
// for the purpose of selection (planning / ready), given the autonomous-mode
// switch.
//
// When autonomous is false this is exactly tick.IsAwaitingHuman() — behavior is
// byte-identical to the pre-autonomous-mode path.
//
// When autonomous is true, a tick whose ONLY reason to be gated is
// awaiting: checkpoint (the project close-out boundary, design §5/§8) is treated
// as NOT awaiting, so continuation flows through the project boundary. Every
// other awaiting type — approval, input, review, content, escalation, work, and
// the legacy Manual flag — continues to gate exactly as before. The bypass is
// scoped strictly to AwaitingCheckpoint and never weakens any other gate.
func gatesHuman(t tick.Tick, autonomous bool) bool {
	if !t.IsAwaitingHuman() {
		return false
	}
	if !autonomous {
		return true
	}
	// Autonomous mode: bypass ONLY a pure checkpoint await. GetAwaitingType()
	// returns the single active awaiting value, so a checkpoint await cannot be
	// masking some other gating type.
	if t.GetAwaitingType() == tick.AwaitingCheckpoint {
		return false
	}
	return true
}
