package cleanup

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/gitcmd"
	"github.com/pengelbrecht/ticks/internal/herd/reconcile"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// Herd is the slice of the herdr client this package needs. [client.Client]
// satisfies it; tests inject the same client over a fake server.
type Herd interface {
	AgentList(ctx context.Context) ([]client.AgentInfo, error)
	WorktreeRemove(ctx context.Context, params client.WorktreeRemoveParams) (*client.WorktreeRemoved, error)
	// SessionSnapshot and WorkspaceFocus exist only to preserve focus across
	// the teardown — see [preserveFocus].
	SessionSnapshot(ctx context.Context) (*client.SessionSnapshot, error)
	WorkspaceFocus(ctx context.Context, workspaceID string) (*client.WorkspaceInfo, error)
}

// Action names one removable thing.
type Action string

// The three actions, in the order they are executed.
const (
	RemoveWorkspace Action = "remove-workspace"
	DeleteBranch    Action = "delete-branch"
	RemoveManifest  Action = "remove-manifest"
)

// Reason is why a tick was refused.
type Reason string

// The refusal reasons. Each maps to a categorical rule in herdr-runner.md.
const (
	// LiveWorker: herdr still lists an agent for this tick.
	LiveWorker Reason = "live-worker"
	// BlockedWorker: the worker is blocked — durable handoff state.
	BlockedWorker Reason = "blocked-worker"
	// UnmergedBranch: `git branch -d` would refuse, so this does too.
	UnmergedBranch Reason = "unmerged-branch"
	// RecheckFailed: the apply-time liveness re-check could not be taken, so
	// this plan's worker cannot be proven safe to tear down. See [recheck].
	RecheckFailed Reason = "recheck-failed"
)

// Step is one planned removal.
type Step struct {
	Action Action `json:"action"`
	// Target is the workspace id, branch name or manifest path.
	Target string `json:"target"`
	// Applied reports whether this step actually ran and succeeded.
	Applied bool `json:"applied"`
	// Error is why it did not, when it was attempted and failed.
	Error string `json:"error,omitempty"`
}

// Plan is one tick's cleanup: what would be removed, or what was.
type Plan struct {
	Tick        string `json:"tick"`
	Epic        string `json:"epic,omitempty"`
	Branch      string `json:"branch,omitempty"`
	Worktree    string `json:"worktree,omitempty"`
	WorkspaceID string `json:"workspace_id,omitempty"`
	// Agent is the agent name recorded at spawn.
	Agent string `json:"agent,omitempty"`
	// ManifestPath is the run-state file, removed last.
	ManifestPath string `json:"manifest_path,omitempty"`

	// Steps are the removals, in execution order.
	Steps []Step `json:"steps"`

	// Refused reports that nothing will be (or was) touched.
	Refused bool `json:"refused"`
	// Reason and Detail explain a refusal.
	Reason Reason `json:"reason,omitempty"`
	Detail string `json:"detail,omitempty"`

	// Applied reports that this plan was executed and every step succeeded.
	Applied bool `json:"applied"`

	// Notes record what was already gone, so a preview is not silent about
	// a step it omitted.
	Notes []string `json:"notes,omitempty"`

	// repoRoot is where the branch delete runs. Unexported and off the JSON
	// shape: it is plumbing, not part of the plan's contract.
	repoRoot string
}

// OK reports whether this plan is clean: not refused, and — after an apply —
// fully executed.
func (p Plan) OK() bool {
	if p.Refused {
		return false
	}
	for _, s := range p.Steps {
		if s.Error != "" {
			return false
		}
	}
	return true
}

// Options is one cleanup run.
type Options struct {
	// RepoRoot is the controller checkout: the branch lives in its ref
	// namespace and the merged check is taken against its HEAD.
	RepoRoot string
	// Manifests are the workers to clean, already located by the caller.
	Manifests []state.Manifest
	// ManifestPaths are the files those manifests came from, indexed by
	// tick id. A tick with no entry keeps its manifest (nothing to remove).
	ManifestPaths map[string]string
	// Apply performs the plan. False — the default — previews it.
	Apply bool
}

// Run builds one plan per manifest and, with [Options.Apply], executes the
// plans that were not refused. The returned plans are the same either way:
// preview is the plan apply would run, not a separate description of it.
//
// An error means the plans could not be built (herdr unreachable). A failure
// while applying one plan is recorded on its step and does not abort the rest:
// one wedged workspace must not strand the wave's other manifests.
//
// With Apply, every plan's worker liveness is re-checked immediately before
// its own destructive step — see [recheck] for why the opening snapshot is
// not enough.
func Run(ctx context.Context, h Herd, opts Options) ([]Plan, error) {
	agents, err := h.AgentList(ctx)
	if err != nil {
		return nil, fmt.Errorf("herd/cleanup: listing herdr agents: %w", err)
	}

	plans := make([]Plan, 0, len(opts.Manifests))
	for _, m := range opts.Manifests {
		plans = append(plans, planFor(opts.RepoRoot, m, opts.ManifestPaths[m.Tick], agents))
	}
	if !opts.Apply {
		return plans, nil
	}

	// Whose pane the user is looking at, before this teardown moves it.
	focusBefore := focusedWorkspace(ctx, h)

	for i := range plans {
		if recheck(ctx, h, &plans[i]) {
			apply(ctx, h, &plans[i])
		}
	}

	if note := preserveFocus(ctx, h, focusBefore); note != "" && len(plans) > 0 {
		plans[len(plans)-1].Notes = append(plans[len(plans)-1].Notes, note)
	}
	return plans, nil
}

// focusedWorkspace reads the currently focused workspace id, or "" if it
// cannot be determined. A failure here is never fatal: focus is a courtesy,
// and a teardown must not stop because the session snapshot was unreadable.
func focusedWorkspace(ctx context.Context, h Herd) string {
	snap, err := h.SessionSnapshot(ctx)
	if err != nil || snap == nil || snap.FocusedWorkspaceID == nil {
		return ""
	}
	return *snap.FocusedWorkspaceID
}

// preserveFocus puts the user's view back where it was.
//
// Removing a workspace moves herdr's focus to a NEIGHBOURING workspace, and it
// does so regardless of the `focus: false` this run passed on the way in.
// Measured live: with focus on the user's own workspace, removing one worker's
// workspace moved focus onto the run's implicitly-opened source-checkout
// workspace; closing that one in turn moved focus onto an unrelated workspace.
// So a wave's teardown silently drags the user somewhere else, and the run
// that caused it is the only thing that knows where they were.
//
// It restores only a workspace that (a) was focused before this call ran and
// (b) still exists — never one this run removed, and never a workspace chosen
// by any other rule. If focus did not move, nothing is called.
func preserveFocus(ctx context.Context, h Herd, before string) string {
	if before == "" {
		return ""
	}
	snap, err := h.SessionSnapshot(ctx)
	if err != nil || snap == nil {
		return ""
	}
	if snap.FocusedWorkspaceID != nil && *snap.FocusedWorkspaceID == before {
		return "" // focus never moved
	}
	var stillThere bool
	for _, w := range snap.Workspaces {
		if w.WorkspaceID == before {
			stillThere = true
			break
		}
	}
	if !stillThere {
		return "" // the focused workspace was one of ours; leave herdr's choice alone
	}
	if _, err := h.WorkspaceFocus(ctx, before); err != nil {
		return "focus moved to another workspace during teardown and could not be restored: " + err.Error()
	}
	return "restored focus to workspace " + before + " — removing a workspace moves herdr's focus to a neighbour"
}

// planFor builds one tick's plan, refusals first.
func planFor(repoRoot string, m state.Manifest, manifestPath string, agents []client.AgentInfo) Plan {
	p := Plan{
		Tick:         m.Tick,
		Epic:         m.Epic,
		Branch:       m.Branch,
		Worktree:     m.Worktree,
		WorkspaceID:  m.WorkspaceID,
		Agent:        m.Agent,
		ManifestPath: manifestPath,
		Steps:        []Step{},
		repoRoot:     repoRoot,
	}

	// 1. An unmerged branch would lose work. This is the "incomplete worker"
	//    test with teeth, and it runs FIRST: its answer decides whether
	//    anything here is safe to remove at all.
	branchPresent := m.Branch != "" && branchExists(repoRoot, m.Branch)
	if branchPresent && !branchMerged(repoRoot, m.Branch) {
		p.refuse(UnmergedBranch, fmt.Sprintf(
			"%s is not merged into HEAD — git branch -d would refuse, and so does this", m.Branch))
		return p
	}

	// 2. A worker that is BLOCKED or WORKING is never torn down.
	//
	//    Liveness alone is not a refusal. Treating it as one made this
	//    command unusable in its own happy path: an interactive agent CLI
	//    does not exit when it finishes a turn, so a wave's workers are
	//    still listed by herdr at exactly the moment cleanup is meant to
	//    run — every tick of a live smoke run refused with live-worker on a
	//    merged, closed, collected branch. herdr-runner.md's rule is "never
	//    clean a BLOCKED or INCOMPLETE worker", incompleteness is the merged
	//    check above, and worktree.remove is documented to tear down the
	//    worktree, workspace, pane and running agent together with no prior
	//    exit needed.
	//
	//    What remains are the two states where removal would destroy
	//    something: blocked, whose pane IS the handoff a human answers, and
	//    working, which may be mid-turn and about to commit.
	if a := liveWorker(agents, m.Agent); a != nil {
		name := agentName(a)
		switch a.AgentStatus {
		case client.StatusBlocked:
			p.refuse(BlockedWorker, fmt.Sprintf(
				"%s is blocked — the pane is the handoff state; attach, answer, then re-run cleanup", name))
			return p
		case client.StatusWorking:
			p.refuse(LiveWorker, fmt.Sprintf(
				"%s is still working — it may be mid-turn and about to commit; wait for it to settle", name))
			return p
		default:
			p.Notes = append(p.Notes, fmt.Sprintf(
				"agent %s is still live (status %s) on a merged branch — worktree.remove tears it down with the workspace",
				name, a.AgentStatus))
		}
	}

	if m.WorkspaceID != "" {
		p.Steps = append(p.Steps, Step{Action: RemoveWorkspace, Target: m.WorkspaceID})
	} else {
		p.Notes = append(p.Notes, "manifest records no workspace id — nothing to remove in herdr")
	}
	if branchPresent {
		p.Steps = append(p.Steps, Step{Action: DeleteBranch, Target: m.Branch})
	} else if m.Branch != "" {
		p.Notes = append(p.Notes, "branch "+m.Branch+" is already gone")
	}
	if manifestPath != "" {
		p.Steps = append(p.Steps, Step{Action: RemoveManifest, Target: manifestPath})
	}
	return p
}

func (p *Plan) refuse(reason Reason, detail string) {
	p.Refused = true
	p.Reason = reason
	p.Detail = detail
	p.Steps = []Step{}
}

// recheck re-reads the worker's live status immediately before this plan's
// destructive step, and reports whether the plan may proceed.
//
// The opening agent.list in [Run] is ONE snapshot shared by every plan, and a
// wave's teardown walks its plans in sequence: an agent that was idle when the
// snapshot was taken can be prompted, or wake itself, and be mid-turn by the
// time its own worktree.remove is issued. That window is the whole plan list
// wide, and worktree.remove kills the pane and the running agent together —
// so the check that authorises the removal has to be taken next to the
// removal, not at the top of the run.
//
// A plan whose worker has since gone `working` or `blocked` flips to the same
// refusal [planFor] would have produced; the wave's other plans are unaffected
// (their own re-checks decide them). A re-check that cannot be taken at all is
// also a refusal: "herdr did not answer" is not evidence that tearing an agent
// down is safe, and the manifest survives to be cleaned on a later run.
func recheck(ctx context.Context, h Herd, p *Plan) bool {
	if p.Refused {
		return false
	}
	agents, err := h.AgentList(ctx)
	if err != nil {
		p.refuse(RecheckFailed, fmt.Sprintf(
			"could not re-read herdr's agent list before removing anything: %v — nothing was touched", err))
		return false
	}
	a := liveWorker(agents, p.Agent)
	if a == nil {
		return true
	}
	name := agentName(a)
	switch a.AgentStatus {
	case client.StatusBlocked:
		p.refuse(BlockedWorker, fmt.Sprintf(
			"%s became blocked after this plan was built — the pane is the handoff state; attach, answer, then re-run cleanup", name))
		return false
	case client.StatusWorking:
		p.refuse(LiveWorker, fmt.Sprintf(
			"%s started working after this plan was built — it may be mid-turn and about to commit; wait for it to settle", name))
		return false
	}
	return true
}

// apply executes one plan in order, stopping at the first failure so the
// manifest — always last — survives an incomplete teardown.
func apply(ctx context.Context, h Herd, p *Plan) {
	if p.Refused {
		return
	}
	for i := range p.Steps {
		s := &p.Steps[i]
		var err error
		switch s.Action {
		case RemoveWorkspace:
			// Never Force: uncommitted work in the worktree means the
			// collect step has not been believed yet. consumeOwnResultFile
			// is the one narrow exception — it only ever removes the tick's
			// own already-archived RESULT file, and only when nothing else
			// is dirty.
			consumeOwnResultFile(p)
			_, err = h.WorktreeRemove(ctx, client.WorktreeRemoveParams{WorkspaceID: s.Target})
		case DeleteBranch:
			// -d, never -D: git itself is the last guard.
			_, err = gitcmd.Run(p.repoRoot, "branch", "-d", s.Target)
		case RemoveManifest:
			err = os.Remove(s.Target)
		}
		if err != nil {
			s.Error = err.Error()
			return
		}
		s.Applied = true
	}
	p.Applied = true
}

// consumeOwnResultFile deletes this tick's own uncommitted RESULT file from
// the worktree when it is the ONLY dirt there, archiving it beside the
// manifest first so the report survives the worktree.
//
// The hardened worker template deliberately leaves RESULT-<tick-id>.md
// uncommitted, and worktree.remove without Force refuses any dirty worktree
// — so an otherwise-clean worker always tripped that guard, and every
// post-fix cleanup failed at remove-workspace. This is the one narrow,
// load-bearing exception: it acts only when git status reports exactly one
// line, untracked, with the exact expected name. Any other modification or
// untracked file is left completely alone, and worktree.remove refuses on
// it exactly as it always has — this must never be widened to Force.
//
// A worktree that cannot be inspected (missing, not a git checkout) is left
// alone too: silence here is not evidence that removal is safe, so
// worktree.remove is called exactly as it would have been before this
// function existed.
func consumeOwnResultFile(p *Plan) {
	if p.Worktree == "" || p.ManifestPath == "" {
		return
	}
	out, err := gitcmd.Run(p.Worktree, "status", "--porcelain", "--untracked-files=all")
	if err != nil {
		return
	}
	var entries []string
	for _, line := range strings.Split(out, "\n") {
		if line = strings.TrimRight(line, "\r"); line != "" {
			entries = append(entries, line)
		}
	}
	if len(entries) != 1 || entries[0] != "?? "+spawn.ResultFile(p.Tick) {
		return
	}

	resultPath := filepath.Join(p.Worktree, spawn.ResultFile(p.Tick))
	body, err := os.ReadFile(resultPath)
	if err != nil {
		return
	}
	archivePath := filepath.Join(filepath.Dir(p.ManifestPath), p.Tick+".RESULT.md")
	if err := os.WriteFile(archivePath, body, 0o644); err != nil {
		return
	}
	if err := os.Remove(resultPath); err != nil {
		return
	}
	p.Notes = append(p.Notes, fmt.Sprintf(
		"archived %s to %s and removed it — the only dirt in the worktree, so worktree.remove could proceed without force",
		spawn.ResultFile(p.Tick), archivePath))
}

// liveWorker finds the herdr agent belonging to this tick, if any.
//
// The match is against the agent name the manifest recorded at spawn, not a
// name derived from the tick id. A tick id is only unique within its repo, but
// a herdr agent name is global across every repo sharing the server, so the
// recorded name is qualified with the repo: matching its own worker by the
// recorded name is the only way to avoid adopting a foreign repo's worker that
// happens to hold the same tick id.
//
// A restart needs a fresh agent name (herdr releases a name only when the
// process exits), so the second worker for a tick is `<name>-r2`. [reconcile]
// .IsWorkerOf] recognises both the exact name and a numeric respawn of it.
// recorded is the agent name the manifest captured at spawn; with none
// recorded there is nothing authoritative to match, so no agent is matched.
func liveWorker(agents []client.AgentInfo, recorded string) *client.AgentInfo {
	if recorded == "" {
		return nil
	}
	for i := range agents {
		name := agentName(&agents[i])
		if name == "" {
			continue
		}
		if reconcile.IsWorkerOf(name, recorded) {
			return &agents[i]
		}
	}
	return nil
}

// agentName is the herdr agent name of a listing entry, or "".
func agentName(a *client.AgentInfo) string {
	if a == nil || a.Name == nil {
		return ""
	}
	return *a.Name
}

// branchExists reports whether a local branch ref resolves.
func branchExists(repoRoot, branch string) bool {
	_, err := gitcmd.Run(repoRoot, "rev-parse", "--verify", "--quiet", "refs/heads/"+branch)
	return err == nil
}

// branchMerged reports whether every commit on the branch is already reachable
// from HEAD — the same question `git branch -d` asks. Run cleanup while still
// on the integration branch: after a later squash-merge the SHAs differ and
// this correctly says no.
func branchMerged(repoRoot, branch string) bool {
	_, err := gitcmd.Run(repoRoot, "merge-base", "--is-ancestor", "refs/heads/"+branch, "HEAD")
	return err == nil
}
