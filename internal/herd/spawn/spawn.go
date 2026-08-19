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

// The startup races between `worktree.create` and a usable agent, measured
// live against herdr 0.8.0 / protocol 19 (see
// docs/design/herd-helper-smoke-report.md):
//
//  1. The pane is not a shell yet. `worktree.create` returns a root pane id
//     within ~35ms, and `agent.start` against that pane fails outright with
//     agent_pane_busy ("… is not an available shell") for the first few
//     hundred milliseconds. Retried on that code alone.
//
//  2. The launch is accepted but PENDING. The same call can instead succeed
//     immediately with `launch_pending: true`, `interactive_ready: false` and
//     `agent_status: unknown` — herdr typed the command into the pane but has
//     not detected the agent yet. `agent.prompt` against that agent fails with
//     agent_not_ready ("… is not an active named agent"), and `agent.wait`
//     does not help: the status reaches idle ~1s before readiness does.
//     Measured convergence: interactive_ready at ~3.0s after the start.
//
// Both are startup races, not rejections, and both are bounded so a wedged
// pane cannot hang a wave. Readiness has no push event, so it is the one place
// this package samples rather than blocks — herdr's own CLI does the same
// thing behind its blocking `herdr agent start`.
// paneReadyBackoff is the delay between agent_pane_busy retries, and between
// interactive-readiness samples. Measured pane-ready is ~0.3s, so this samples
// a handful of times across the normal race and the caller's startup timeout
// sets the ceiling.
//
// It is a var only so a test can compress the retry window; production never
// reassigns it.
var paneReadyBackoff = 250 * time.Millisecond

const (
	// maxDispatchConfirm caps the wait for a dispatched implementer prompt
	// to be observed as `working`. It is a confirmation, not the work: a
	// worker that has not started a minute after the prompt landed is
	// better reported than waited on.
	maxDispatchConfirm = 60 * time.Second
)

// dispatchConfirmTimeout bounds the "did the prompt actually start the
// worker" wait by the smaller of the caller's prompt timeout and
// [maxDispatchConfirm].
func dispatchConfirmTimeout(promptTimeout time.Duration) time.Duration {
	if promptTimeout > 0 && promptTimeout < maxDispatchConfirm {
		return promptTimeout
	}
	return maxDispatchConfirm
}

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

	// Warm optionally prepares the freshly created worktree before the agent
	// is started in it — the repository's own `[sandbox]` setup, so a local
	// worker gets the same provisioned tree a cloud sandbox does off the same
	// tracked declaration.
	//
	// It runs between `worktree.create` and `agent.start`, which is the only
	// window where the tree exists and nothing is reading it yet. A failure is
	// a spawn failure: a worker started in a tree its repository said needed
	// warming, and did not get, fails its tick in a way nobody can read back.
	// Nil skips it.
	Warm func(worktreePath string) error
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
	// DispatchUnconfirmed reports that the implementer prompt was submitted
	// but herdr never observed the worker start. The spawn is not failed on
	// it — a trivial tick can finish before `working` is ever rendered — but
	// a caller should say so, because it is also what a lost prompt looks
	// like, and the durable layer is what settles the question.
	DispatchUnconfirmed bool
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

	// 1b. Warm the tree, before anything is looking at it. The commands come
	//     from the worktree's own tracked config at the base commit — the same
	//     source, and the same code, a cloud sandbox reads after its clone.
	if opts.Warm != nil {
		if err := opts.Warm(res.WorktreePath); err != nil {
			return res, fmt.Errorf("herd/spawn: warming worktree %s for branch %s: %w",
				res.WorktreePath, opts.Branch, err)
		}
	}

	// 2. Start the worker in that pane with the pre-ordered argv, retrying
	//    only while the freshly created pane has not become a usable shell.
	started, err := startWhenPaneReady(ctx, c, client.AgentStartParams{
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

	// 2b. A pending launch is not a started agent. Prompting one fails with
	//     agent_not_ready, which the gate would report as a spawn failure for
	//     a worker that was merely still coming up.
	if !started.Agent.InteractiveReady {
		ready, err := waitInteractiveReady(ctx, c, opts.AgentName, opts.StartupTimeout)
		if err != nil {
			return res, fmt.Errorf("herd/spawn: waiting for agent %q to become interactive in pane %s: %w",
				opts.AgentName, res.PaneID, err)
		}
		res.FinalStatus = ready.AgentStatus
	}

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
		if opts.WaitForPrompt {
			params.Wait = &client.AgentWaitOptions{
				Until:   client.TerminalStatuses,
				Timeout: opts.PromptTimeout,
			}
		} else {
			// Not fire-and-forget: dispatch is confirmed by waiting for the
			// worker to START WORKING, which is cheap (about a second) and
			// does not serialize the wave.
			//
			// Returning the instant the submission is accepted looks free
			// and is not. The worker is still sitting in the settled state
			// the gate left it in, so a `tk herd wait` issued moments later
			// resolves it from its opening agent.list as ALREADY SETTLED and
			// returns waited_ms: 0 — a wave that fans in before any of the
			// work starts. Reproduced live: one worker of a two-worker wave
			// came back `done` with waited_ms 0 and collected as
			// missing-result while its agent was still reading the prompt.
			params.Wait = &client.AgentWaitOptions{
				Until:   []client.AgentStatus{client.StatusWorking},
				Timeout: dispatchConfirmTimeout(opts.PromptTimeout),
			}
		}
		info, err := c.AgentPrompt(ctx, params)
		if err != nil {
			// A dispatch-confirm wait that elapses, or a stall report, is
			// not proof the prompt was lost — a worker can finish a trivial
			// tick before herdr ever renders it `working`. Fall back to what
			// herdr says the agent is now; the durable layer, not this call,
			// is the completion authority.
			if opts.WaitForPrompt || !(client.IsTimeout(err) || client.IsCode(err, client.CodeAgentPromptStalled)) {
				return res, fmt.Errorf("herd/spawn: submitting the implementer prompt to %q: %w", opts.AgentName, err)
			}
			after, getErr := c.AgentGet(ctx, opts.AgentName)
			if getErr != nil {
				return res, fmt.Errorf("herd/spawn: submitting the implementer prompt to %q: %w", opts.AgentName, err)
			}
			res.DispatchUnconfirmed = true
			res.FinalStatus = after.AgentStatus
			return res, nil
		}
		res.PromptWaited = opts.WaitForPrompt
		res.FinalStatus = info.AgentStatus
		if info.AgentSession != nil {
			res.AgentSession = info.AgentSession
		}
	}

	return res, nil
}

// startWhenPaneReady calls agent.start, retrying ONLY while herdr reports
// [client.CodeAgentPaneBusy] — the freshly created worktree pane has not
// finished bringing its shell up yet.
//
// This is deliberately not a general retry. Every other failure (a bad kind, a
// name collision, a missing pane) is returned on the first attempt, because
// retrying those only delays a stop the operator has to act on anyway. The
// last error is returned unchanged when the pane never becomes usable, so the
// message an operator sees is still herdr's own.
//
// The retry window is the CALLER'S startup timeout, not a fixed attempt count.
// It used to be twelve tries at 250ms — a hard ~3s ceiling that ignored
// --startup-timeout entirely, so an operator who asked for two minutes of
// patience because the machine is loaded still got three seconds of it. The
// poll interval is unchanged; only the ceiling moved.
func startWhenPaneReady(ctx context.Context, c *client.Client, params client.AgentStartParams) (*client.AgentStarted, error) {
	return startWhenPaneReadyWithin(ctx, c, params, paneReadyWindow(params.StartupTimeout), paneReadyBackoff)
}

// paneReadyWindow is how long agent_pane_busy is retried for: whatever the
// caller allowed the agent to start in. A zero timeout means "herdr's own
// default", which this package cannot read, so it uses its own documented
// default rather than inventing a shorter one.
func paneReadyWindow(startupTimeout time.Duration) time.Duration {
	if startupTimeout <= 0 {
		return DefaultStartupTimeout
	}
	return startupTimeout
}

// startWhenPaneReadyWithin is [startWhenPaneReady] with its bounds spelled
// out, so a test can drive the window and the interval directly instead of
// spending the real ones.
func startWhenPaneReadyWithin(ctx context.Context, c *client.Client, params client.AgentStartParams,
	window, interval time.Duration) (*client.AgentStarted, error) {
	deadline := time.Now().Add(window)
	for {
		started, err := c.AgentStart(ctx, params)
		if err == nil {
			return started, nil
		}
		if !client.IsCode(err, client.CodeAgentPaneBusy) {
			return nil, err
		}
		// Only sleep for a retry that would still land inside the window.
		if !time.Now().Add(interval).Before(deadline) {
			return nil, err
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(interval):
		}
	}
}

// waitInteractiveReady blocks until herdr reports the agent as interactive, or
// until the deadline. It samples `agent.get` because readiness is not a
// lifecycle status and therefore has no push event: an agent reaches
// `agent_status: idle` about a second before `interactive_ready` flips, so
// waiting on the status is a wait that returns too early.
//
// A deadline that elapses is an error carrying the last state seen, never a
// silent continue: prompting a not-yet-interactive agent fails with
// agent_not_ready, and reporting that as a gate failure would blame the model
// routing for a startup race.
func waitInteractiveReady(ctx context.Context, c *client.Client, name string, timeout time.Duration) (*client.AgentInfo, error) {
	deadline := time.Now().Add(timeout)
	var last *client.AgentInfo
	for {
		info, err := c.AgentGet(ctx, name)
		if err == nil {
			last = info
			if info.InteractiveReady {
				return info, nil
			}
		}
		if time.Now().After(deadline) {
			status := "no agent.get response"
			if last != nil {
				status = fmt.Sprintf("last status %s, launch_pending %v", last.AgentStatus, last.LaunchPending)
			}
			return nil, fmt.Errorf("herdr never reported interactive_ready within %s (%s)", timeout, status)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(paneReadyBackoff):
		}
	}
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
			// agent_prompt_stalled is herdr saying "I saw no state change
			// after submitting". It is NOT proof the prompt was dropped:
			// live, a claude worker that answered the probe in under a
			// second produced this error too, having settled before herdr's
			// stall window closed — and a re-send on that evidence stalls
			// again for the same reason. So this error decides nothing.
			// Fall through to the pane, which is the documented arbiter of
			// dropped-versus-answered, and let Classify rule.
			if !client.IsCode(err, client.CodeAgentPromptStalled) {
				return nil, attempt, fmt.Errorf("herd/spawn: gate prompt %d to %q: %w", attempt, opts.AgentName, err)
			}
			// The stalled call did not wait, so give the worker the settle
			// the successful path gets before the pane is judged. A worker
			// that never received anything is already settled and this
			// returns at once.
			if settled, werr := c.AgentWait(ctx, client.AgentWaitParams{
				Target:  opts.AgentName,
				Until:   client.TerminalStatuses,
				Timeout: opts.GateTimeout,
			}); werr == nil {
				last = settled
			}
		} else {
			last = info
		}

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
	if containsWord(tail, normalizeWS(expect)) {
		return GateAnswered
	}
	return GateErrorContent
}

// containsWord reports whether want occurs in text as a whole token rather than
// as a substring of a longer word. A bare substring test passes "BROKEN pipe",
// "TOKEN limit" and "OKTA login required" for the default "OK" expectation,
// which classifies a dead worker as answered. Word boundaries are only applied
// on an end that is itself a word character, so a punctuation-delimited
// expectation still matches.
func containsWord(text, want string) bool {
	if want == "" {
		return false
	}
	pattern := regexp.QuoteMeta(want)
	if isWordByte(want[0]) {
		pattern = `\b` + pattern
	}
	if isWordByte(want[len(want)-1]) {
		pattern += `\b`
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		// Unreachable: the pattern is quoted literal text.
		return strings.Contains(text, want)
	}
	return re.MatchString(text)
}

func isWordByte(b byte) bool {
	return b == '_' || (b >= '0' && b <= '9') || (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z')
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
