package cmd

import (
	"fmt"
	"io"
	"path/filepath"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/wave"
)

// The wave-width admission gate.
//
// `[orchestration].max_parallel` used to be parsed, printed and then ignored:
// run_62c289d1 announced "wave width 3" in its boot log and dispatched seven
// implementers into one 2-vCPU container. The width lived in a prompt, and a
// width a model can talk itself out of is not a width — so it lives here now,
// on the path a dispatch actually takes.
//
// The gated act is the CLAIM: moving a tick to in_progress. That is what every
// substrate does before it starts a worker — herdr spawn, a harness subagent,
// a cloud worker container — and it is the only dispatch signal that is
// substrate-neutral, durable and visible to `tk`. Releasing or closing the
// tick frees the slot, so the count is live rather than a budget.
//
// Two surfaces are deliberately NOT gated. The board and the TUI are human
// surfaces, where "in progress" means a person is working on it. And every
// non-claim edit stays open while a wave is full: a full wave must never make
// closing or releasing a tick harder, since those are exactly the actions that
// free a slot.

// waveWidthAdmission builds the admission for claiming t, reading the width
// from the repo's `.tick/runners.toml`. A missing or width-less config admits
// everything; a config that fails to parse or validate is returned as an error
// for the caller to decide on.
func waveWidthAdmission(root string, t tick.Tick) (wave.Admission, error) {
	if t.Parent == "" || t.Type == tick.TypeEpic {
		return wave.Admission{}, nil
	}
	cfg, err := herdconfig.LoadRepo(root)
	if err != nil {
		return wave.Admission{}, err
	}
	width := cfg.MaxParallel()
	if width <= 0 {
		return wave.Admission{}, nil
	}
	all, err := tick.NewStore(filepath.Join(root, ".tick")).List()
	if err != nil {
		return wave.Admission{}, err
	}
	return wave.Admit(all, width, t), nil
}

// waveWidthGate refuses a dispatch that would exceed the configured width.
// It returns nil when there is no width, no parent epic, or a free slot.
//
// A config it cannot read warns and admits rather than refusing. Fail-closed is
// right for a command whose whole job is the config (`tk herd spawn`, the
// sandbox boot) and wrong here: the claim is also how a human moves a tick, and
// one typo in `runners.toml` must not freeze every status change in the repo.
// The warning is loud, and the commands that own the file still stop on it —
// `tk herd spawn` loads the same config immediately after this gate and reports
// the validation error itself.
func waveWidthGate(errOut io.Writer, root string, t tick.Tick) error {
	admission, err := waveWidthAdmission(root, t)
	if err != nil {
		fmt.Fprintf(errOut, "warning: %v — the wave width was not applied to this claim\n", err)
		return nil
	}
	if admission.Allowed() {
		return nil
	}
	return ExitError{
		Code:    ExitWaveFull,
		Message: admission.Refusal(t.ID, herdconfig.FileName),
	}
}
