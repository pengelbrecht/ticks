package spawn

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// Gate defaults. The probe is deliberately one short line: pane reads are
// matched after unwrapping, and a single line is never wrapped, so the echo
// survives whatever box the CLI paints around it.
const (
	// DefaultGateProbe is the trivial prompt whose answer is pattern-matched.
	DefaultGateProbe = "Reply with the single word OK"
	// DefaultGateExpect is the answer that counts as a working round-trip.
	DefaultGateExpect = "OK"
	// maxGateAttempts is 2: the adapter says re-send once, then stop.
	maxGateAttempts = 2
	// defaultPaneLines is how much pane tail the gate reads and excerpts.
	defaultPaneLines = 60
	// excerptLines is how many trailing pane lines a failure reports.
	excerptLines = 20
)

// Timeout defaults, in the shape herdr-runner.md's examples use.
const (
	DefaultStartupTimeout = 120 * time.Second
	DefaultGateTimeout    = 120 * time.Second
	DefaultPromptTimeout  = 120 * time.Second
)

// agentNamePattern is herdr's own constraint on an agent name.
var agentNamePattern = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,31}$`)

// AgentName renders the agent name for a tick. The wait engine matches on the
// agent name, so this shape is a contract, not a label.
func AgentName(tickID string) string { return "tick-" + strings.ToLower(tickID) }

// Options is one worker's spawn.
type Options struct {
	// RepoRoot is the repository to create the worktree in — the controller
	// checkout, never a worktree.
	RepoRoot string
	// Branch is the worker's branch, `<prefix><tick-id>`.
	Branch string
	// Base is the integration commit the branch starts from. Pinning it is
	// what keeps wave N from branching off wave N-1's pre-merge tree.
	Base string
	// Label optionally names the workspace herdr opens.
	Label string

	// AgentName is the herdr agent name. Required.
	AgentName string
	// Kind is the herdr agent kind. Required.
	Kind string
	// Argv is the compiled spawn argv, already in the fixed order
	// (full-auto template → model/effort flags → args). Passed verbatim.
	Argv []string

	// Prompt is the real implementer prompt, sent once the gate passes.
	Prompt string

	// GateProbe / GateExpect override the gate's probe and expected answer.
	GateProbe  string
	GateExpect string

	// StartupTimeout bounds `agent.start`; it must sit in the client's
	// validated range. Zero uses [DefaultStartupTimeout].
	StartupTimeout time.Duration
	// GateTimeout bounds each gate round-trip. Zero uses [DefaultGateTimeout].
	GateTimeout time.Duration
	// PromptTimeout bounds the implementer-prompt call. Zero uses
	// [DefaultPromptTimeout].
	PromptTimeout time.Duration
	// WaitForPrompt makes the implementer prompt block until the worker
	// settles. It is off by default: a wave is dispatched first and waited
	// on afterwards (`tk herd wait`), and blocking here serializes it.
	WaitForPrompt bool

	// PaneLines caps the gate's pane read. Zero uses the package default.
	PaneLines uint32
}

// Result is what a successful spawn produced. Every identifier is read out of
// a response; none is predicted.
type Result struct {
	Branch       string
	WorktreePath string
	WorkspaceID  string
	PaneID       string
	AgentName    string
	Kind         string
	// Argv is the argv herdr echoed on agent_started — the ground truth for
	// what the model/effort compilation produced.
	Argv []string
	// AgentSession is the native session id, captured after the gate. Nil
	// when the kind reported none even then.
	AgentSession *client.AgentSessionInfo
	// GateAttempts is 1, or 2 when the first probe was silently dropped.
	GateAttempts int
	// PromptWaited reports whether the implementer prompt blocked on the
	// worker settling.
	PromptWaited bool
	// FinalStatus is the status of the last response seen.
	FinalStatus client.AgentStatus
}

// GateOutcome classifies one gate round-trip.
type GateOutcome string

// The three outcomes the adapter distinguishes.
const (
	// GateAnswered: the probe echoed and the expected answer follows it.
	GateAnswered GateOutcome = "answered"
	// GateSilentDrop: no echo of the probe anywhere — the submission never
	// landed. Recoverable by re-sending.
	GateSilentDrop GateOutcome = "silent-drop"
	// GateErrorContent: the probe echoed, the answer did not follow. The
	// green-start trap: fix the routing, do not re-send.
	GateErrorContent GateOutcome = "error-content"
)

// GateError is a failed first-round-trip gate. It always carries a pane
// excerpt, because the pane is the only place the real reason is visible.
type GateError struct {
	Agent    string
	Kind     string
	Outcome  GateOutcome
	Attempts int
	PaneID   string
	Excerpt  string
}

func (e *GateError) Error() string {
	var reason string
	switch e.Outcome {
	case GateSilentDrop:
		reason = fmt.Sprintf("the probe never reached the composer in %d attempts (no echo in the pane)", e.Attempts)
	default:
		reason = "the probe was echoed but not answered — the agent started clean and cannot do work (stale model string, auth or quota)"
	}
	return fmt.Sprintf("herd/spawn: first-round-trip gate failed for agent %q (kind %q): %s.\nPane %s:\n%s",
		e.Agent, e.Kind, reason, e.PaneID, e.Excerpt)
}

// Run spawns one gated worker: worktree, agent start, content gate, prompt.
//
// It never cleans up on failure. A pane that failed its gate is diagnostic
// state — the operator reads it, fixes the routing, and removes the workspace
// deliberately.
func Run(ctx context.Context, c *client.Client, opts Options) (*Result, error) {
	if err := opts.validate(); err != nil {
		return nil, err
	}
	opts.applyDefaults()

	// 1. Worktree + branch + workspace + root pane, in one call.
	wtParams := client.WorktreeCreateParams{
		Cwd:    client.Ptr(opts.RepoRoot),
		Branch: client.Ptr(opts.Branch),
		Focus:  false,
	}
	if opts.Base != "" {
		wtParams.Base = client.Ptr(opts.Base)
	}
	if opts.Label != "" {
		wtParams.Label = client.Ptr(opts.Label)
	}
	created, err := c.WorktreeCreate(ctx, wtParams)
	if err != nil {
		return nil, fmt.Errorf("herd/spawn: creating worktree for branch %s: %w", opts.Branch, err)
	}

	res := &Result{
		Branch:       opts.Branch,
		WorktreePath: created.Worktree.Path,
		WorkspaceID:  created.Workspace.WorkspaceID,
		PaneID:       created.RootPane.PaneID,
		AgentName:    opts.AgentName,
		Kind:         opts.Kind,
	}

	// 2. Start the worker in that pane with the pre-ordered argv.
	started, err := c.AgentStart(ctx, client.AgentStartParams{
		Name:           opts.AgentName,
		Kind:           opts.Kind,
		PaneID:         res.PaneID,
		Args:           opts.Argv,
		StartupTimeout: opts.StartupTimeout,
	})
	if err != nil {
		return res, fmt.Errorf("herd/spawn: starting agent %q (kind %s) in pane %s: %w",
			opts.AgentName, opts.Kind, res.PaneID, err)
	}
	res.Argv = started.Argv
	res.FinalStatus = started.Agent.AgentStatus

	// 3. The gate. Lifecycle state proved nothing above; pane content does.
	gated, attempts, err := runGate(ctx, c, opts, res.PaneID)
	res.GateAttempts = attempts
	if err != nil {
		return res, err
	}
	if gated != nil {
		res.FinalStatus = gated.AgentStatus
		res.AgentSession = gated.AgentSession
	}
	// agent_session appears at different moments per kind; if the prompt
	// response did not carry it, ask once now that a round-trip has happened.
	if res.AgentSession == nil {
		if info, err := c.AgentGet(ctx, opts.AgentName); err == nil && info.AgentSession != nil {
			res.AgentSession = info.AgentSession
		}
	}

	// 4. The real implementer prompt.
	if opts.Prompt != "" {
		params := client.AgentPromptParams{Target: opts.AgentName, Text: opts.Prompt}
		promptCtx := ctx
		if opts.WaitForPrompt {
			params.Wait = &client.AgentWaitOptions{
				Until:   client.TerminalStatuses,
				Timeout: opts.PromptTimeout,
			}
		} else {
			// Fire-and-forget dispatch still needs a bound: a submission
			// that hangs must not hang the wave.
			var cancel context.CancelFunc
			promptCtx, cancel = context.WithTimeout(ctx, opts.PromptTimeout)
			defer cancel()
		}
		info, err := c.AgentPrompt(promptCtx, params)
		if err != nil {
			return res, fmt.Errorf("herd/spawn: submitting the implementer prompt to %q: %w", opts.AgentName, err)
		}
		res.PromptWaited = opts.WaitForPrompt
		res.FinalStatus = info.AgentStatus
		if info.AgentSession != nil {
			res.AgentSession = info.AgentSession
		}
	}

	return res, nil
}

// runGate performs the first-round-trip content gate, re-sending once when the
// probe is silently dropped. It returns the agent info of the round-trip that
// passed.
func runGate(ctx context.Context, c *client.Client, opts Options, paneID string) (*client.AgentInfo, int, error) {
	var last *client.AgentInfo
	for attempt := 1; attempt <= maxGateAttempts; attempt++ {
		info, err := c.AgentPrompt(ctx, client.AgentPromptParams{
			Target: opts.AgentName,
			Text:   opts.GateProbe,
			Wait: &client.AgentWaitOptions{
				Until:   client.TerminalStatuses,
				Timeout: opts.GateTimeout,
			},
		})
		if err != nil {
			return nil, attempt, fmt.Errorf("herd/spawn: gate prompt %d to %q: %w", attempt, opts.AgentName, err)
		}
		last = info

		read, err := c.PaneRead(ctx, client.PaneReadParams{
			PaneID: paneID,
			// Unwrapped: the probe and its answer must be matched as
			// written, not as the terminal happened to fold them.
			Source: client.SourceRecentUnwrapped,
			Lines:  client.Ptr(opts.PaneLines),
		})
		if err != nil {
			return nil, attempt, fmt.Errorf("herd/spawn: reading pane %s for the gate: %w", paneID, err)
		}

		switch Classify(read.Text, opts.GateProbe, opts.GateExpect) {
		case GateAnswered:
			return last, attempt, nil
		case GateSilentDrop:
			// The CLI was still painting its startup UI. Re-sending is the
			// documented recovery; killing and respawning lands in the same
			// race one full startup later.
			if attempt < maxGateAttempts {
				continue
			}
			return nil, attempt, &GateError{
				Agent: opts.AgentName, Kind: opts.Kind, Outcome: GateSilentDrop,
				Attempts: attempt, PaneID: paneID, Excerpt: Excerpt(read.Text),
			}
		default:
			return nil, attempt, &GateError{
				Agent: opts.AgentName, Kind: opts.Kind, Outcome: GateErrorContent,
				Attempts: attempt, PaneID: paneID, Excerpt: Excerpt(read.Text),
			}
		}
	}
	// Unreachable: the loop returns on every path.
	return last, maxGateAttempts, nil
}

// Classify decides a gate round-trip from pane content alone.
//
// The three outcomes are told apart by two questions, in order:
//
//  1. Is the probe echoed in the pane at all? No → the submission was dropped
//     before it reached the composer ([GateSilentDrop]). This is the case that
//     is worth re-sending, and it is invisible from the prompt response, which
//     comes back green either way.
//  2. Does the expected answer appear *after* the last echo? Yes →
//     [GateAnswered]. No → [GateErrorContent]: the prompt landed and the agent
//     could not answer it.
//
// The answer is searched strictly after the echo because the probe text itself
// contains the expected answer ("Reply with the single word OK"); searching the
// whole pane would pass every dropped probe that got echoed by anything.
// Whitespace is collapsed on both sides so a CLI's own indentation, gutter or
// re-flow does not defeat the match.
func Classify(paneText, probe, expect string) GateOutcome {
	text := normalizeWS(paneText)
	needle := normalizeWS(probe)
	if needle == "" {
		return GateErrorContent
	}
	idx := strings.LastIndex(text, needle)
	if idx < 0 {
		return GateSilentDrop
	}
	tail := text[idx+len(needle):]
	if strings.Contains(tail, normalizeWS(expect)) {
		return GateAnswered
	}
	return GateErrorContent
}

// Excerpt is the tail of a pane read, for a failure message.
func Excerpt(paneText string) string {
	lines := strings.Split(strings.TrimRight(paneText, "\n"), "\n")
	// Blank rows are the bulk of a terminal snapshot and carry nothing.
	kept := lines[:0]
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			kept = append(kept, strings.TrimRight(l, " \t"))
		}
	}
	if len(kept) > excerptLines {
		kept = kept[len(kept)-excerptLines:]
	}
	if len(kept) == 0 {
		return "  (pane is empty)"
	}
	return "  " + strings.Join(kept, "\n  ")
}

// normalizeWS collapses every run of whitespace to a single space and trims,
// so matching survives terminal re-flow and gutter padding.
func normalizeWS(s string) string { return strings.Join(strings.Fields(s), " ") }

func (o Options) validate() error {
	if o.RepoRoot == "" {
		return fmt.Errorf("herd/spawn: RepoRoot is required (the repository the worktree is created in)")
	}
	if o.Branch == "" {
		return fmt.Errorf("herd/spawn: Branch is required")
	}
	if o.Kind == "" {
		return fmt.Errorf("herd/spawn: Kind is required")
	}
	if !agentNamePattern.MatchString(o.AgentName) {
		return fmt.Errorf("herd/spawn: agent name %q does not match herdr's %s", o.AgentName, agentNamePattern)
	}
	return nil
}

func (o *Options) applyDefaults() {
	if o.GateProbe == "" {
		o.GateProbe = DefaultGateProbe
	}
	if o.GateExpect == "" {
		o.GateExpect = DefaultGateExpect
	}
	if o.StartupTimeout == 0 {
		o.StartupTimeout = DefaultStartupTimeout
	}
	if o.GateTimeout == 0 {
		o.GateTimeout = DefaultGateTimeout
	}
	if o.PromptTimeout == 0 {
		o.PromptTimeout = DefaultPromptTimeout
	}
	if o.PaneLines == 0 {
		o.PaneLines = defaultPaneLines
	}
}
