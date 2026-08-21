package wave

// Wave width — the dispatch-side half of this package.
//
// Compute above answers "which ticks COULD run in parallel"; this file answers
// "how many may be in flight AT ONCE", which is a different question with a
// different source. The first is graph shape; the second is operator policy,
// `[orchestration].max_parallel` in `.tick/runners.toml`.
//
// It exists because the two were conflated and the conflation cost a run. On
// run_62c289d1 the boot log printed "wave width 3 from .tick/runners.toml
// [orchestration].max_parallel", `tk graph --json` then reported a widest wave
// of seven under the SAME key name (`max_parallel`), and the orchestrator did
// what the tool told it: seven implementers in one 2-vCPU container, more than
// double the configured burn, on a run that exhausted its budget.
//
// So the width is enforced where a dispatch is admitted rather than described
// where a model may read it: a width a model can talk itself out of is not a
// width.

import (
	"fmt"
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Admission is one dispatch decision: the configured width, who already holds
// a slot, and whether the claim being made fits.
type Admission struct {
	// Width is `[orchestration].max_parallel`. Zero means no configured
	// width — the adapter's own default applies and nothing is refused.
	Width int
	// InFlight are the ids already holding a slot, sorted. The tick being
	// claimed is never among them, so a re-claim of a tick that is already
	// in flight is always admitted (it holds its own slot).
	InFlight []string
	// Parent is the epic the width is counted under. A tick with no parent
	// is not wave dispatch and is never gated.
	Parent string
}

// Free reports how many more implementers may be dispatched. It is negative-
// safe (a wave that is already over width reports 0) and reports -1 for "no
// configured width", which callers render as unlimited rather than as a number.
func (a Admission) Free() int {
	if a.Width <= 0 {
		return -1
	}
	free := a.Width - len(a.InFlight)
	if free < 0 {
		return 0
	}
	return free
}

// Allowed reports whether one more implementer may be dispatched.
func (a Admission) Allowed() bool {
	return a.Width <= 0 || len(a.InFlight) < a.Width
}

// Refusal is the message a refused dispatch carries. It names the width, its
// source, and every slot holder, because the only useful next action is to
// wait for one of THOSE to finish — and an orchestrator that cannot see which
// ticks hold the slots waits on the wrong one.
func (a Admission) Refusal(claiming, source string) string {
	return fmt.Sprintf(
		"wave width %d is full: %d implementer(s) already in flight under %s (%s). "+
			"Claiming %s would make %d. The width is %s [orchestration].max_parallel, "+
			"and it is enforced here rather than left to the prompt. "+
			"Collect a finished worker and close or release its tick to free a slot, "+
			"or raise max_parallel if this machine can carry more.",
		a.Width, len(a.InFlight), a.Parent, strings.Join(a.InFlight, ", "),
		claiming, len(a.InFlight)+1, source)
}

// Admit builds the [Admission] for dispatching claiming under its parent epic.
//
// A slot is held by every non-epic sibling under the same parent whose status
// is in_progress. That is the substrate-neutral definition of "in flight": it
// is what the herdr substrate's spawn, the harness substrate's subagent and a
// cloud worker container all have in common, because the shared protocol
// claims the tick before dispatching the worker and releases it on collect.
//
// A tick with no parent is not part of a wave — Admission.Width is left at 0
// so nothing is refused.
func Admit(all []tick.Tick, width int, claiming tick.Tick) Admission {
	if claiming.Parent == "" || width <= 0 {
		return Admission{Parent: claiming.Parent}
	}
	return Admission{
		Width:    width,
		Parent:   claiming.Parent,
		InFlight: InFlight(all, claiming.Parent, claiming.ID),
	}
}

// InFlight returns the sorted ids holding a slot under parent, excluding the
// id in exclude (empty excludes nothing). It is the one definition of "in
// flight" shared by the gate that refuses a dispatch and the graph that
// advertises how many are free — two answers derived separately would drift,
// and the drift between graph width and configured width is the defect this
// file was written for.
func InFlight(all []tick.Tick, parent, exclude string) []string {
	if parent == "" {
		return nil
	}
	var ids []string
	for _, t := range all {
		if t.Parent != parent || t.ID == exclude {
			continue
		}
		if t.Type == tick.TypeEpic || t.Status != tick.StatusInProgress {
			continue
		}
		ids = append(ids, t.ID)
	}
	sort.Strings(ids)
	return ids
}
