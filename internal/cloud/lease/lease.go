// Package lease answers one question: which arbiter decides who may drive a
// project's `.tick/` right now, and who is holding it.
//
// # One lease, wherever the orchestrator sits (D19)
//
// A project has exactly ONE dispatch arbiter (D4 fixes one enforcement point
// per project), and which one it is depends on enrolment, not on where the
// orchestrator runs:
//
//   - Enrolled with a cloud factory → the project's RunRoom. A LOCAL run takes
//     the same lease a cloud run takes, so a laptop session and the 06:00
//     sweep cannot both be inside `.tick/`. The lease is taken by the run
//     submission itself, which is why this package hands out no token: the
//     arbiter that grants it is the factory, and a second grant path is a
//     second arbiter.
//   - Not enrolled → the local file lease the runner already uses. Enrolment
//     UPGRADES the arbiter and never installs a second one, so nothing here
//     writes a lease file: a Go copy of the file lease, taken alongside the
//     RunRoom lease on an enrolled project, is precisely the second
//     enforcement point D4 forbids.
//
// # The degenerate case stays sacred
//
// A local orchestrator on the `harness` or `herdr` substrate with no cloud
// enrolment keeps working offline, forever. [Resolve] therefore makes no
// network call at all when no factory is configured: the answer is already
// known, and asking would tax the plane-mode story the factory is additive to.
package lease

import (
	"fmt"
	"strings"
)

// Kind names an arbiter.
type Kind string

const (
	// RunRoom is the factory's per-project Durable Object: the arbiter for an
	// enrolled project, whatever the orchestrator's location.
	RunRoom Kind = "runroom"
	// File is the local file lease, the arbiter for an un-enrolled project.
	File Kind = "file"
)

// Origin is where the orchestrator holding a lease sits. It mirrors
// `LeaseOrigin` in cloud/factory/src/run-room.ts: the RunRoom records it so a
// refusal can say whether the run in the way is a laptop session or a
// scheduled cloud run — two very different next actions.
type Origin string

const (
	// OriginLocal: an orchestrator on someone's machine driving cloud workers.
	OriginLocal Origin = "local"
	// OriginCloud: a Workflow-hosted orchestrator.
	OriginCloud Origin = "cloud"
)

// Arbiter is the single lease authority in force for one project.
type Arbiter struct {
	Kind Kind
	// Project is the canonical owner/repo pair, empty for the file arbiter
	// when no project could be detected.
	Project string
	// Factory reports whether a factory endpoint is configured at all. A
	// project can have a factory configured and still be arbitrated by the
	// file lease: enrolment, not configuration, is what upgrades it.
	Factory bool
	// Enrolled reports whether the project is enrolled with that factory.
	Enrolled bool
}

// Resolve names the arbiter in force. enrolled is only consulted when a
// factory is configured; a caller with no factory must never have had to ask
// the network to learn that.
func Resolve(project string, factoryConfigured, enrolled bool) Arbiter {
	a := Arbiter{Project: project, Factory: factoryConfigured, Enrolled: factoryConfigured && enrolled}
	if a.Enrolled {
		a.Kind = RunRoom
		return a
	}
	a.Kind = File
	return a
}

// Upgraded reports whether this project's arbiter is the RunRoom, i.e. cloud
// dispatch is arbitrated centrally and no local lease file may be written for
// it.
func (a Arbiter) Upgraded() bool { return a.Kind == RunRoom }

// Explain is the one sentence a command prints about the arbiter it is
// working under, so a run's own output says which authority refused it or let
// it through.
func (a Arbiter) Explain() string {
	if a.Upgraded() {
		return fmt.Sprintf(
			"lease arbiter: the RunRoom for %s — an enrolled project takes the same lease whether the orchestrator is local or a cloud run",
			a.Project)
	}
	if a.Factory {
		return fmt.Sprintf(
			"lease arbiter: the local file lease — %s is not enrolled with the configured factory, so nothing central arbitrates it",
			a.projectName())
	}
	return "lease arbiter: the local file lease — no cloud factory is configured, so this checkout arbitrates itself and works offline"
}

// DispatchRefusal is what a dispatch verb says when the arbiter is the file
// lease: cloud workers cannot be dispatched, and the reason is enrolment, not
// a broken command.
//
// It deliberately does not propose falling back to another substrate. A run
// that declares `cloud` and quietly dispatches herdr panes is the failure the
// substrate values exist to prevent; choosing another substrate for one run is
// the operator's explicit statement (TICKS_SUBSTRATE), never a command's
// silent recovery.
func (a Arbiter) DispatchRefusal() string {
	if a.Factory {
		return fmt.Sprintf(
			"%s is not enrolled with the configured factory, so it has no cloud workers to dispatch and the local file lease still arbitrates it. "+
				"Enrol it (POST /api/projects) and retry; the herdr and harness substrates keep working here in the meantime.",
			a.projectName())
	}
	return "no cloud factory is configured for this checkout (~/.ticksrc has no factory_url/factory_token), so there is nowhere to dispatch cloud workers. " +
		"Run 'tk factory setup' to enrol this project, or drive this wave on a local substrate — the local file lease already arbitrates it, offline."
}

func (a Arbiter) projectName() string {
	if strings.TrimSpace(a.Project) == "" {
		return "this project"
	}
	return a.Project
}

// Holder is whoever currently holds a project's lease, as the arbiter reports
// it. The token is never part of it: handing a refused caller the holder's
// release credential is the one thing compare-and-delete exists to prevent.
type Holder struct {
	RunID       string `json:"run_id"`
	Epic        string `json:"epic,omitempty"`
	Origin      Origin `json:"origin,omitempty"`
	RequestedBy string `json:"requested_by,omitempty"`
	ExpiresAt   string `json:"expires_at,omitempty"`
}

// HeldError is the refusal a dispatch gets when someone else holds the lease.
// Its message NAMES the holder: "the project is busy" is not actionable, and
// an operator has to be able to tell their own laptop session from a
// scheduled cloud run without opening a dashboard.
type HeldError struct {
	Project string
	Holder  Holder
}

func (e HeldError) Error() string {
	holder := e.Holder.RunID
	if holder == "" {
		holder = "another run"
	}
	msg := fmt.Sprintf("cloud dispatch refused: the dispatch lease for %s is held by %s", projectOr(e.Project), holder)
	if e.Holder.Epic != "" {
		msg += fmt.Sprintf(" (epic %s", e.Holder.Epic)
		if e.Holder.Origin != "" {
			msg += ", " + string(e.Holder.Origin) + " orchestrator"
		}
		msg += ")"
	} else if e.Holder.Origin != "" {
		msg += fmt.Sprintf(" (%s orchestrator)", string(e.Holder.Origin))
	}
	if e.Holder.ExpiresAt != "" {
		msg += " until " + e.Holder.ExpiresAt
	}
	msg += ". One project, one lease: wait for that run to finish or stop it with 'tk cloud stop " + holder + "'."
	return msg
}

func projectOr(project string) string {
	if strings.TrimSpace(project) == "" {
		return "this project"
	}
	return project
}
