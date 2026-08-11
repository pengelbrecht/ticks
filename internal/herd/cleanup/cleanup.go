package cleanup

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// Herd is the slice of the herdr client this package needs. [client.Client]
// satisfies it; tests inject the same client over a fake server.
type Herd interface {
	AgentList(ctx context.Context) ([]client.AgentInfo, error)
	WorktreeRemove(ctx context.Context, params client.WorktreeRemoveParams) (*client.WorktreeRemoved, error)
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
	for i := range plans {
		apply(ctx, h, &plans[i])
	}
	return plans, nil
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

	// 1. A worker herdr still knows is never cleaned. Blocked is called out
	//    separately because the response differs: it is a human handoff,
	//    not "come back later".
	if a := liveWorker(agents, m); a != nil {
		name := agentName(a)
		if a.AgentStatus == client.StatusBlocked {
			p.refuse(BlockedWorker, fmt.Sprintf(
				"%s is blocked — the pane is the handoff state; attach, answer, then re-run cleanup", name))
		} else {
			p.refuse(LiveWorker, fmt.Sprintf("%s is still live (status %s)", name, a.AgentStatus))
		}
		return p
	}

	// 2. An unmerged branch would lose work. Checked, not attempted.
	branchPresent := m.Branch != "" && branchExists(repoRoot, m.Branch)
	if branchPresent && !branchMerged(repoRoot, m.Branch) {
		p.refuse(UnmergedBranch, fmt.Sprintf(
			"%s is not merged into HEAD — git branch -d would refuse, and so does this", m.Branch))
		return p
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
			// collect step has not been believed yet.
			_, err = h.WorktreeRemove(ctx, client.WorktreeRemoveParams{WorkspaceID: s.Target})
		case DeleteBranch:
			// -d, never -D: git itself is the last guard.
			_, err = git(p.repoRoot, "branch", "-d", s.Target)
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

// liveWorker finds the herdr agent belonging to this tick, if any.
//
// The match is by prefix on `tick-<id>`: a restart needs a fresh agent name
// (herdr releases a name only when the process exits), so the second worker
// for a tick is `tick-<id>-r2`. An exact-name check would read that respawned
// worker as "gone" and clean a live pane out from under it.
func liveWorker(agents []client.AgentInfo, m state.Manifest) *client.AgentInfo {
	prefixes := []string{spawn.AgentName(m.Tick)}
	if m.Agent != "" && m.Agent != prefixes[0] {
		prefixes = append(prefixes, m.Agent)
	}
	for i := range agents {
		name := agentName(&agents[i])
		if name == "" {
			continue
		}
		for _, p := range prefixes {
			if name == p || strings.HasPrefix(name, p+"-") {
				return &agents[i]
			}
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
	_, err := git(repoRoot, "rev-parse", "--verify", "--quiet", "refs/heads/"+branch)
	return err == nil
}

// branchMerged reports whether every commit on the branch is already reachable
// from HEAD — the same question `git branch -d` asks. Run cleanup while still
// on the integration branch: after a later squash-merge the SHAs differ and
// this correctly says no.
func branchMerged(repoRoot, branch string) bool {
	_, err := git(repoRoot, "merge-base", "--is-ancestor", "refs/heads/"+branch, "HEAD")
	return err == nil
}

// git runs one git command in repoRoot and returns its trimmed stdout.
func git(repoRoot string, args ...string) (string, error) {
	cmd := exec.Command("git", append([]string{"-C", repoRoot}, args...)...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}
