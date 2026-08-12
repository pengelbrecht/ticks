package reconcile

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// Class is the classification of one in-flight tick. Every manifest lands in
// exactly one class.
type Class string

// The five classes. They are exhaustive and mutually exclusive.
const (
	// ClassLiveWorker: a live herdr agent is working this tick. Continue it;
	// never redispatch, whatever the branch looks like.
	ClassLiveWorker Class = "live-worker"
	// ClassDeadResumable: no live agent, but a native session id was recorded
	// — the cheapest recovery, a native resume in a fresh pane.
	ClassDeadResumable Class = "dead-worker-resumable"
	// ClassDeadWithWork: no live agent, no session id, but the branch carries
	// commits beyond its base. Redispatch FROM THE BRANCH — never a second one.
	ClassDeadWithWork Class = "dead-with-work"
	// ClassStaleNoWork: no live agent, no session id, no commits. A safe reset.
	ClassStaleNoWork Class = "stale-no-work"
	// ClassUnknown: the evidence contradicts itself. Surfaced with the
	// contradiction spelled out, and never auto-reset.
	ClassUnknown Class = "unknown"
)

// Action is what the plan proposes for one tick.
type Action string

// The proposed actions, one per class.
const (
	ActionContinue   Action = "continue"
	ActionResume     Action = "resume"
	ActionRedispatch Action = "redispatch-from-branch"
	ActionReset      Action = "reset"
	ActionInspect    Action = "inspect"
)

// Evidence is everything the four reconcile inputs said about one tick. It is
// reported whole, including for the classes that need only part of it, because
// the operator reading an `unknown` needs to see what disagreed.
type Evidence struct {
	Branch             string `json:"branch"`
	BranchExists       bool   `json:"branch_exists"`
	Worktree           string `json:"worktree,omitempty"`
	WorktreeRegistered bool   `json:"worktree_registered"`
	WorkspaceID        string `json:"workspace_id,omitempty"`
	WorkspacePresent   bool   `json:"workspace_present"`
	Base               string `json:"base,omitempty"`
	// CommitsAhead is the count of commits on the branch beyond Base, valid
	// only when CommitsKnown. "Cannot tell" is never folded into zero.
	CommitsAhead int  `json:"commits_ahead"`
	CommitsKnown bool `json:"commits_known"`

	ManifestAgent string `json:"manifest_agent,omitempty"`
	// LiveAgent is the herdr agent name actually found alive — the manifest's
	// name, or a respawn of it.
	LiveAgent       string `json:"live_agent,omitempty"`
	LiveAgentStatus string `json:"live_agent_status,omitempty"`
	LivePaneID      string `json:"live_pane_id,omitempty"`

	Kind string `json:"kind,omitempty"`
	// SessionID is the native session identity, from the manifest or, for a
	// worker herdr still remembers, from session.snapshot.
	SessionID     string `json:"session_id,omitempty"`
	SessionSource string `json:"session_source,omitempty"`
}

// Plan is the proposed move for one tick. Nothing here is executed: reconcile
// produces a plan and the orchestrator decides.
type Plan struct {
	Action  Action `json:"action"`
	Summary string `json:"summary"`
	// AgentName is the FRESH agent name a resume or redispatch must use — a
	// herdr name is released when its process exits and cannot be reused
	// while the reconcile is still looking at the old one.
	AgentName string `json:"agent_name,omitempty"`
	Kind      string `json:"kind,omitempty"`
	Branch    string `json:"branch,omitempty"`
	Worktree  string `json:"worktree,omitempty"`
	// Argv is the exact argv to pass after `--` in `herdr agent start`: the
	// per-kind resume form for a resumable worker, the plain spawn argv for a
	// redispatch.
	Argv []string `json:"argv,omitempty"`
	// Redispatch reports whether the plan starts a NEW worker that does not
	// carry the old session. It is false for every live worker, which is the
	// invariant that keeps a crash recovery from doubling up on a tick.
	Redispatch bool `json:"redispatch"`
	// Commands are the non-destructive next steps, ready to run.
	Commands []string `json:"commands,omitempty"`
	// ProposedMutations are destructive moves the ORCHESTRATOR may make.
	// Reconcile never runs them, and they are always empty for
	// [ClassUnknown].
	ProposedMutations []string `json:"proposed_mutations,omitempty"`
}

// Item is one classified tick.
type Item struct {
	Tick         string   `json:"tick"`
	Epic         string   `json:"epic,omitempty"`
	Class        Class    `json:"class"`
	Reason       string   `json:"reason"`
	Evidence     Evidence `json:"evidence"`
	Plan         Plan     `json:"plan"`
	ManifestPath string   `json:"manifest_path"`
	// Contradictions is non-empty only for [ClassUnknown], and each entry
	// states the two pieces of evidence that disagree.
	Contradictions []string `json:"contradictions,omitempty"`
	// Adopted reports whether --adopt refreshed this manifest.
	Adopted bool `json:"adopted"`
	// AdoptedFields names what the refresh changed.
	AdoptedFields []string `json:"adopted_fields,omitempty"`
}

// Report is the whole plan.
type Report struct {
	Epic         string         `json:"epic,omitempty"`
	BranchPrefix string         `json:"branch_prefix"`
	Adopt        bool           `json:"adopt"`
	Items        []Item         `json:"items"`
	Counts       map[string]int `json:"counts"`
	Adopted      []string       `json:"adopted,omitempty"`
}

// Herd is the slice of the herdr client this package needs: the live agent
// list, and the session snapshot that carries native session identity and
// workspace presence.
type Herd interface {
	AgentList(ctx context.Context) ([]client.AgentInfo, error)
	SessionSnapshot(ctx context.Context) (*client.SessionSnapshot, error)
}

// Options configures one reconcile.
type Options struct {
	// RepoRoot is the controller checkout.
	RepoRoot string
	// EpicID limits the reconcile to one epic. Empty reconciles every epic
	// that has manifests.
	EpicID string
	// BranchPrefix is orchestration.worktree_branch_prefix. Empty means the
	// documented default, "tick/" — but callers should pass the config's
	// value, since a run may have used another.
	BranchPrefix string
	// Adopt refreshes the manifests of live workers whose evidence is
	// consistent. It is the ONLY write this package performs.
	Adopt bool
}

// DefaultBranchPrefix is the documented default of
// orchestration.worktree_branch_prefix. It is a fallback for a caller that has
// no config, never a substitute for one that does.
const DefaultBranchPrefix = "tick/"

// Run reconciles a repository's herd run state and returns the plan.
//
// It mutates nothing except, with [Options.Adopt], the manifests of live and
// consistent workers. An error means the reconcile could not be performed
// (herdr unreachable, git unreadable) — a plan containing unknowns is a
// successful reconcile, not a failure.
func Run(ctx context.Context, h Herd, opts Options) (*Report, error) {
	if opts.RepoRoot == "" {
		return nil, fmt.Errorf("herd/reconcile: RepoRoot is required")
	}
	prefix := opts.BranchPrefix
	if prefix == "" {
		prefix = DefaultBranchPrefix
	}

	// 1. Manifests: the authority on what was dispatched.
	manifests, err := Manifests(opts.RepoRoot, opts.EpicID)
	if err != nil {
		return nil, fmt.Errorf("herd/reconcile: reading manifests: %w", err)
	}

	// 2. Git: the authority on what work exists.
	g, err := readGit(opts.RepoRoot, prefix)
	if err != nil {
		return nil, err
	}

	// 3. Live herdr.
	agents, err := h.AgentList(ctx)
	if err != nil {
		return nil, fmt.Errorf("herd/reconcile: listing herdr agents: %w", err)
	}
	liveNames := map[string]bool{}
	for _, a := range agents {
		if a.Name != nil && *a.Name != "" {
			liveNames[*a.Name] = true
		}
	}

	// 4. Snapshot: session identity for dead workers, workspaces for live ones.
	snap, err := h.SessionSnapshot(ctx)
	if err != nil {
		return nil, fmt.Errorf("herd/reconcile: reading the herdr session snapshot: %w", err)
	}
	workspaces := map[string]bool{}
	if snap != nil {
		for _, w := range snap.Workspaces {
			workspaces[w.WorkspaceID] = true
		}
	}

	report := &Report{
		Epic:         opts.EpicID,
		BranchPrefix: prefix,
		Adopt:        opts.Adopt,
		Counts:       map[string]int{},
	}
	for _, m := range manifests {
		item := classify(opts.RepoRoot, m, g, agents, snap, workspaces, liveNames)
		if opts.Adopt && adoptable(item) {
			fields, err := adopt(opts.RepoRoot, m, item)
			if err != nil {
				return nil, fmt.Errorf("herd/reconcile: adopting %s: %w", m.Tick, err)
			}
			item.Adopted = true
			item.AdoptedFields = fields
			report.Adopted = append(report.Adopted, m.Tick)
		}
		report.Counts[string(item.Class)]++
		report.Items = append(report.Items, item)
	}
	return report, nil
}

// Manifests lists the run-state manifests to reconcile: one epic's when epicID
// is set, every epic's otherwise.
func Manifests(repoRoot, epicID string) ([]state.Manifest, error) {
	if strings.TrimSpace(epicID) != "" {
		return state.List(repoRoot, epicID)
	}
	root := filepath.Join(repoRoot, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []state.Manifest
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		ms, err := state.List(repoRoot, e.Name())
		if err != nil {
			return nil, err
		}
		out = append(out, ms...)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Epic != out[j].Epic {
			return out[i].Epic < out[j].Epic
		}
		return out[i].Tick < out[j].Tick
	})
	return out, nil
}

// classify turns one manifest plus the three evidence sources into an item.
func classify(
	repoRoot string,
	m state.Manifest,
	g *gitState,
	agents []client.AgentInfo,
	snap *client.SessionSnapshot,
	workspaces map[string]bool,
	liveNames map[string]bool,
) Item {
	ev := Evidence{
		Branch:        m.Branch,
		Worktree:      m.Worktree,
		WorkspaceID:   m.WorkspaceID,
		Base:          m.Base,
		Kind:          m.Kind,
		ManifestAgent: m.Agent,
	}
	ev.BranchExists = g.hasBranch(m.Branch)
	ev.WorktreeRegistered = g.worktreeRegistered(m.Worktree)
	ev.CommitsAhead, ev.CommitsKnown = commitsAhead(repoRoot, m.Base, m.Branch)
	ev.WorkspacePresent = m.WorkspaceID != "" && workspaces[m.WorkspaceID]

	// 3. A live agent named `tick-<id>` — or a respawn, `tick-<id>-r<N>` — is
	//    a live worker for this tick.
	if live := findLive(agents, m.Agent); live != nil {
		ev.LiveAgent = derefString(live.Name)
		ev.LiveAgentStatus = string(live.AgentStatus)
		ev.LivePaneID = live.PaneID
		if live.AgentSession != nil {
			ev.SessionID = live.AgentSession.Value
			ev.SessionSource = "agent.list"
		}
	}

	// 4. Session identity for a worker that is gone: the manifest first (it was
	//    captured at the first round-trip), then the snapshot, which may still
	//    remember the agent.
	if ev.SessionID == "" && m.AgentSession != nil && m.AgentSession.Value != "" {
		ev.SessionID = m.AgentSession.Value
		ev.SessionSource = "manifest"
	}
	if ev.SessionID == "" && snap != nil {
		for _, a := range snap.Agents {
			if a.Name == nil || !IsWorkerOf(*a.Name, m.Agent) || a.AgentSession == nil {
				continue
			}
			if a.AgentSession.Value != "" {
				ev.SessionID = a.AgentSession.Value
				ev.SessionSource = "session.snapshot"
				break
			}
		}
	}

	item := Item{
		Tick:         m.Tick,
		Epic:         m.Epic,
		Evidence:     ev,
		ManifestPath: state.RelPath(m.Epic, m.Tick),
	}

	if contradictions := contradictions(m, ev); len(contradictions) > 0 {
		item.Class = ClassUnknown
		item.Contradictions = contradictions
		item.Reason = "the evidence contradicts itself"
		item.Plan = Plan{
			Action: ActionInspect,
			Summary: "inconsistent evidence — inspect by hand. Reconcile proposes NO mutation: " +
				"a reset here could delete work that a different piece of evidence says exists.",
			Branch:   m.Branch,
			Worktree: m.Worktree,
			Commands: inspectCommands(m),
		}
		return item
	}

	switch {
	case ev.LiveAgent != "":
		item.Class = ClassLiveWorker
		item.Reason = fmt.Sprintf("herdr agent %q is live (%s)", ev.LiveAgent, ev.LiveAgentStatus)
		item.Plan = livePlan(m, ev)
	case ev.SessionID != "":
		item.Class = ClassDeadResumable
		item.Reason = fmt.Sprintf("no live agent, but session %s was recorded (%s)", ev.SessionID, ev.SessionSource)
		item.Plan = resumePlan(m, ev, liveNames)
	case ev.CommitsKnown && ev.CommitsAhead > 0:
		item.Class = ClassDeadWithWork
		item.Reason = fmt.Sprintf("no live agent and no session, but %s carries %d commit(s) beyond %s",
			m.Branch, ev.CommitsAhead, shortSHA(m.Base))
		item.Plan = redispatchPlan(m, ev, liveNames)
	default:
		item.Class = ClassStaleNoWork
		item.Reason = fmt.Sprintf("no live agent, no session, and %s has no commits beyond %s",
			m.Branch, shortSHA(m.Base))
		item.Plan = resetPlan(m, ev)
	}
	return item
}

// contradictions lists the evidence conflicts that make a tick [ClassUnknown].
// Each entry names BOTH sides of the disagreement — a reader has to be able to
// act on it without re-deriving the reconcile.
func contradictions(m state.Manifest, ev Evidence) []string {
	var out []string

	if !ev.BranchExists && !ev.WorktreeRegistered {
		out = append(out, fmt.Sprintf(
			"the manifest records branch %q and worktree %q, but git has neither the branch (no match under the configured prefix) nor a worktree at that path",
			m.Branch, m.Worktree))
	} else if !ev.BranchExists && ev.WorktreeRegistered {
		out = append(out, fmt.Sprintf(
			"a worktree is registered at %q but branch %q does not exist — the branch a worker was dispatched onto is gone while its checkout remains",
			m.Worktree, m.Branch))
	}

	if ev.LiveAgent != "" && m.WorkspaceID != "" && !ev.WorkspacePresent {
		out = append(out, fmt.Sprintf(
			"agent %q is live in the herdr session but its recorded workspace %q is not in the session snapshot",
			ev.LiveAgent, m.WorkspaceID))
	}

	// A branch that exists but cannot be compared to its base is the case that
	// most needs to stay out of stale-no-work: an uncomparable branch would
	// otherwise be counted as zero commits and proposed for deletion.
	if ev.BranchExists && ev.LiveAgent == "" && !ev.CommitsKnown {
		detail := fmt.Sprintf("branch %q exists but its commits cannot be counted", m.Branch)
		if m.Base == "" {
			detail += " — the manifest records no base commit"
		} else {
			detail += fmt.Sprintf(" — base %s is not in this repository (git rev-list %s..%s failed)",
				shortSHA(m.Base), shortSHA(m.Base), m.Branch)
		}
		out = append(out, detail)
	}
	return out
}

// livePlan continues a live worker. It NEVER proposes a redispatch, and it does
// not care what the branch looks like: a branch with no commits is exactly what
// a worker that has not committed yet looks like.
func livePlan(m state.Manifest, ev Evidence) Plan {
	p := Plan{
		Action:     ActionContinue,
		AgentName:  ev.LiveAgent,
		Kind:       m.Kind,
		Branch:     m.Branch,
		Worktree:   m.Worktree,
		Redispatch: false,
	}
	switch client.AgentStatus(ev.LiveAgentStatus) {
	case client.StatusWorking:
		p.Summary = fmt.Sprintf("agent %s is mid-turn — leave it alone and wait; never redispatch a live worker", ev.LiveAgent)
	case client.StatusBlocked:
		p.Summary = fmt.Sprintf("agent %s is blocked — this is a HUMAN escalation. Leave the pane, workspace and worktree intact; never redispatch a live worker", ev.LiveAgent)
	default:
		p.Summary = fmt.Sprintf("agent %s is live and settled — continue it with the remaining work; its context is intact, which is the cheapest recovery available. Never redispatch a live worker", ev.LiveAgent)
	}
	if ev.BranchExists && ev.CommitsKnown && ev.CommitsAhead == 0 {
		p.Summary += ". The branch has no commits yet — that is not evidence of a dead worker"
	}
	p.Commands = []string{
		fmt.Sprintf("tk herd wait --agents %s --timeout 1800000", ev.LiveAgent),
		fmt.Sprintf("herdr agent prompt %s \"<what remains>\" --wait --timeout 120000", ev.LiveAgent),
	}
	return p
}

// resumePlan emits the kind's exact native resume form under a fresh agent
// name.
func resumePlan(m state.Manifest, ev Evidence, liveNames map[string]bool) Plan {
	fresh := FreshAgentName(m.Agent, liveNames)
	argv := ResumeArgv(m.Kind, m.Argv, ev.SessionID)
	p := Plan{
		Action:     ActionResume,
		AgentName:  fresh,
		Kind:       m.Kind,
		Branch:     m.Branch,
		Worktree:   m.Worktree,
		Argv:       argv,
		Redispatch: false,
	}
	if argv == nil {
		p.Summary = fmt.Sprintf(
			"session %s was recorded, but kind %q has no round-tripped resume form in herdr-kinds.md — verify it (Adding a kind) before resuming, or redispatch from the branch instead",
			ev.SessionID, m.Kind)
		return p
	}
	p.Summary = fmt.Sprintf(
		"resume session %s natively in a FRESH pane under a fresh agent name (%s) — the old name was released when the process exited",
		ev.SessionID, fresh)
	p.Commands = []string{
		fmt.Sprintf("herdr pane split --current --cwd %s --no-focus", quoteArg(m.Worktree)),
		fmt.Sprintf("herdr agent start %s --kind %s --pane <pane-id> --timeout 120000 -- %s",
			fresh, m.Kind, strings.Join(argvFlags(argv), " ")),
	}
	return p
}

// redispatchPlan starts a new worker on the EXISTING branch in the EXISTING
// worktree. One tick never gets a second branch.
func redispatchPlan(m state.Manifest, ev Evidence, liveNames map[string]bool) Plan {
	fresh := FreshAgentName(m.Agent, liveNames)
	argv := SpawnArgv(m.Kind, m.Argv)
	p := Plan{
		Action:     ActionRedispatch,
		AgentName:  fresh,
		Kind:       m.Kind,
		Branch:     m.Branch,
		Worktree:   m.Worktree,
		Argv:       argv,
		Redispatch: true,
		Summary: fmt.Sprintf(
			"no session to resume, but %s carries %d commit(s): start a fresh worker (%s) in the EXISTING worktree on the EXISTING branch, prompted with the prior state and what remains. Never a second branch for one tick",
			m.Branch, ev.CommitsAhead, fresh),
	}
	cwd := m.Worktree
	if !ev.WorktreeRegistered {
		p.Summary += ". The recorded worktree is no longer registered — re-create it on the same branch (herdr worktree create --branch " + m.Branch + ") rather than branching again"
	}
	p.Commands = []string{
		fmt.Sprintf("git -C %s log --oneline %s..%s", quoteArg(m.Worktree), shortSHA(m.Base), m.Branch),
		fmt.Sprintf("herdr agent start %s --kind %s --pane <pane-id in %s> --timeout 120000 -- %s",
			fresh, m.Kind, quoteArg(cwd), strings.Join(argvFlags(argv), " ")),
	}
	return p
}

// resetPlan proposes — never performs — the safe reset. Removing the workspace
// and deleting the branch is the ORCHESTRATOR's move.
func resetPlan(m state.Manifest, ev Evidence) Plan {
	p := Plan{
		Action:     ActionReset,
		Kind:       m.Kind,
		Branch:     m.Branch,
		Worktree:   m.Worktree,
		Redispatch: false,
		Summary: fmt.Sprintf(
			"nothing to recover: no live agent, no session, no commits on %s beyond %s. The orchestrator may reset it and redispatch from the current integration commit",
			m.Branch, shortSHA(m.Base)),
	}
	if m.WorkspaceID != "" {
		p.ProposedMutations = append(p.ProposedMutations,
			fmt.Sprintf("herdr worktree remove --workspace %s", m.WorkspaceID))
	}
	if ev.BranchExists {
		p.ProposedMutations = append(p.ProposedMutations,
			// -d, never -D: it refuses an unmerged branch, so a mis-derived
			// name cannot silently lose work.
			fmt.Sprintf("git branch -d %s", m.Branch))
	}
	return p
}

// inspectCommands are read-only probes that show the operator the same
// evidence the reconcile saw.
func inspectCommands(m state.Manifest) []string {
	cmds := []string{
		"git worktree list",
		fmt.Sprintf("git branch --list %s", m.Branch),
	}
	if m.Agent != "" {
		cmds = append(cmds, fmt.Sprintf("herdr agent explain %s", m.Agent))
	}
	return cmds
}

// adoptable reports whether --adopt may refresh this manifest: a live worker,
// no contradictions, and the git evidence that backs it still in place.
func adoptable(item Item) bool {
	return item.Class == ClassLiveWorker &&
		len(item.Contradictions) == 0 &&
		item.Evidence.BranchExists &&
		(item.Evidence.Worktree == "" || item.Evidence.WorktreeRegistered)
}

// adopt refreshes one live worker's manifest in place: the agent name herdr
// actually reports (a respawn renames the worker), its pane, and a session id
// that was not captured at spawn. Nothing else is touched, and a manifest that
// already matches reality is not rewritten.
func adopt(repoRoot string, m state.Manifest, item Item) ([]string, error) {
	ev := item.Evidence
	var changed []string
	if ev.LiveAgent != "" && ev.LiveAgent != m.Agent {
		m.Agent = ev.LiveAgent
		changed = append(changed, "agent")
	}
	if ev.LivePaneID != "" && ev.LivePaneID != m.PaneID {
		m.PaneID = ev.LivePaneID
		changed = append(changed, "pane_id")
	}
	if ev.SessionID != "" && (m.AgentSession == nil || m.AgentSession.Value != ev.SessionID) {
		kind := "id"
		if m.AgentSession != nil && m.AgentSession.Kind != "" {
			kind = m.AgentSession.Kind
		}
		m.AgentSession = &state.AgentSession{Kind: kind, Value: ev.SessionID}
		changed = append(changed, "agent_session")
	}
	if len(changed) == 0 {
		return nil, nil
	}
	if _, err := state.Write(repoRoot, m); err != nil {
		return nil, err
	}
	return changed, nil
}

// findLive returns the live agent that belongs to this manifest's worker, or
// nil. Exact name first, then a respawn of it.
func findLive(agents []client.AgentInfo, manifestAgent string) *client.AgentInfo {
	if manifestAgent == "" {
		return nil
	}
	for i := range agents {
		if agents[i].Name != nil && *agents[i].Name == manifestAgent {
			return &agents[i]
		}
	}
	for i := range agents {
		if agents[i].Name != nil && IsWorkerOf(*agents[i].Name, manifestAgent) {
			return &agents[i]
		}
	}
	return nil
}

// argvFlags drops the executable from a full argv, which is what goes after
// `--` in a herdr agent start command line.
func argvFlags(argv []string) []string {
	if len(argv) <= 1 {
		return nil
	}
	return argv[1:]
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// shortSHA abbreviates a commit for a message, leaving anything that is not a
// full hex sha alone.
func shortSHA(base string) string {
	if len(base) >= 12 && isHex(base) {
		return base[:12]
	}
	if base == "" {
		return "(no base recorded)"
	}
	return base
}

func isHex(s string) bool {
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9', r >= 'a' && r <= 'f', r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return true
}

// quoteArg quotes a path for a copy-pasteable command line when it needs it.
func quoteArg(s string) string {
	if s == "" {
		return `""`
	}
	if strings.ContainsAny(s, " \t\"'$`\\") {
		return `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
	}
	return s
}
