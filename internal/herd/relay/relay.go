// Package relay turns a herdr blocked status into a durable operator question
// and sends the first answer back to the same agent.
//
// It registers the question, waits on its durable pending entry for a
// terminal answer (`tk answer`, or the tick itself moving on out of band),
// applies the answer, and uses herdr's agent.prompt to resume the target.
package relay

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/reconcile"
	"github.com/pengelbrecht/ticks/internal/herd/wait"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

const (
	// DefaultPromptTimeout bounds the confirmation that herdr accepted the
	// operator's answer and started processing it.
	DefaultPromptTimeout = 30 * time.Second
)

// Controller is the part of the herdr client needed to resume a blocked agent.
// client.Client satisfies it; the small interface keeps relay tests local.
type Controller interface {
	AgentPrompt(context.Context, client.AgentPromptParams) (*client.AgentInfo, error)
	AgentGet(context.Context, string) (*client.AgentInfo, error)
}

// Options configures one blocked-agent relay.
type Options struct {
	// RepoRoot is the repository whose tick is awaiting the answer.
	RepoRoot string
	// Engine is the durable operator state machine. When nil, one is created
	// for RepoRoot.
	Engine *operator.Engine
	// Grace delays escalation beyond the terminal. The pending entry is
	// visible to local surfaces immediately.
	Grace time.Duration
	// PollInterval bounds how often the pending entry is checked. Zero uses the
	// operator package default.
	PollInterval time.Duration
	// PromptTimeout bounds Herdr's prompt-and-confirm round trip. Zero uses
	// DefaultPromptTimeout.
	PromptTimeout time.Duration
	// AllowUnscoped permits a target without a tick-shaped name to use an
	// agent-scoped pending question. This is for an explicitly watched
	// orchestrator pane; ordinary worker relays remain tick-scoped.
	AllowUnscoped bool
	// OnPark is called after the durable question is registered.
	OnPark func(operator.Pending)
}

// ResolveRecordedTarget returns the exact Herdr target to prompt when a
// blocked result belongs to a worker manifest. It is a preference/identity
// check, not a requirement for an explicitly enabled orchestrator relay.
//
// A respawn is accepted through reconcile.IsWorkerOf. When the wait was keyed
// by pane id and Herdr did not include the live name in its result, the
// manifest's recorded agent name is the best durable target available.
func ResolveRecordedTarget(repoRoot string, blocked wait.Result) (string, bool, error) {
	if strings.TrimSpace(repoRoot) == "" {
		return "", false, errors.New("herd/relay: no repository root")
	}
	manifests, err := reconcile.Manifests(repoRoot, "")
	if err != nil {
		return "", false, fmt.Errorf("herd/relay: listing worker manifests: %w", err)
	}
	target := TargetFromResult(blocked)
	for _, manifest := range manifests {
		if target != "" && manifest.Agent != "" && reconcile.IsWorkerOf(target, manifest.Agent) {
			// A stale manifest must not authorize a reused agent name in a
			// different pane (the orchestrator could otherwise inherit an old
			// tick-* name after Herdr released it). Exact pane evidence wins.
			if blocked.PaneID == "" || manifest.PaneID == "" || blocked.PaneID == manifest.PaneID {
				return target, true, nil
			}
		}
		if blocked.PaneID != "" && blocked.PaneID == manifest.PaneID && manifest.Agent != "" {
			return manifest.Agent, true, nil
		}
	}
	return "", false, nil
}

// TargetFromResult returns the live agent name when Herdr supplied one, or the
// caller's pane/name target otherwise. A pane id is a valid agent.prompt
// target, which is important for an orchestrator whose agent name is not
// recorded as a tick worker.
func TargetFromResult(blocked wait.Result) string {
	target := strings.TrimSpace(blocked.AgentName)
	if target == "" {
		target = strings.TrimSpace(blocked.Name)
	}
	return target
}

// Handle parks an operator question for the blocked worker, waits for a
// terminal answer, and sends it back to the same Herdr target. It returns the
// worker state that the outer wait should continue watching: working resumes
// the existing wait, idle/done settle it, and blocked leaves it blocked.
func Handle(ctx context.Context, controller Controller, blocked wait.Result, opts Options) (client.AgentStatus, error) {
	if controller == nil {
		return client.StatusBlocked, errors.New("herd/relay: no herdr controller")
	}
	if strings.TrimSpace(opts.RepoRoot) == "" {
		return client.StatusBlocked, errors.New("herd/relay: no repository root")
	}
	if opts.Grace < 0 {
		return client.StatusBlocked, errors.New("herd/relay: grace period cannot be negative")
	}

	target := TargetFromResult(blocked)
	engine := opts.Engine
	if engine == nil {
		engine = operator.NewEngine(opts.RepoRoot)
	}
	tickID, tickErr := tickIDFromAgent(target)
	if tickErr != nil {
		if !opts.AllowUnscoped {
			return client.StatusBlocked, tickErr
		}
		return handleAgent(ctx, controller, blocked, target, engine, opts)
	}
	return handleTick(ctx, controller, blocked, target, tickID, engine, opts)
}

func handleTick(ctx context.Context, controller Controller, blocked wait.Result, target, tickID string, engine *operator.Engine, opts Options) (client.AgentStatus, error) {
	now := time.Now()
	pending, err := engine.Register(operator.Registration{
		TickID:   tickID,
		Kind:     operator.PendingAsk,
		Awaiting: tick.AwaitingEscalation,
		Question: operator.Question{
			Header: "Agent blocked",
			Text: fmt.Sprintf(
				"Agent %s is blocked and waiting for human input on tick %s (pane %s). Reply with the instruction to send back to the agent.",
				target, tickID, blocked.PaneID,
			),
		},
		NotBefore: now.Add(opts.Grace),
	})
	if err != nil {
		return client.StatusBlocked, fmt.Errorf("herd/relay: registering the blocked-agent question: %w", err)
	}
	if opts.OnPark != nil {
		opts.OnPark(pending)
	}

	applied, err := engine.Await(ctx, pending.ID, opts.PollInterval)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return client.StatusBlocked, nil
		}
		return client.StatusBlocked, fmt.Errorf("herd/relay: waiting for the answer to %s: %w", pending.ID, err)
	}

	outcome, answered := answerOutcome(applied)
	if !answered {
		if applied.OutOfBand {
			return currentState(ctx, controller, target)
		}
		return client.StatusBlocked, nil
	}

	answer := strings.TrimSpace(outcome.Text)
	if answer == "" {
		answer = strings.Join(outcome.OptionIDs, ", ")
	}
	if answer == "" {
		return client.StatusBlocked, fmt.Errorf("herd/relay: operator answer to %s was empty", pending.ID)
	}

	return prompt(ctx, controller, target, answer, opts.PromptTimeout)
}

// handleAgent is the orchestrator path. It does not invent a tick for the
// orchestrator's question; the durable pending entry is correlated directly
// to the Herdr target and is canceled if the operator handles the pane in the
// terminal during the grace window.
func handleAgent(ctx context.Context, controller Controller, blocked wait.Result, target string, engine *operator.Engine, opts Options) (client.AgentStatus, error) {
	pending, err := engine.RegisterAgentRelay(target, operator.Question{
		Header: "Orchestrator blocked",
		Text: fmt.Sprintf(
			"Agent %s is blocked and waiting for human input in pane %s. Reply with the instruction to send back to the agent.",
			target, blocked.PaneID,
		),
	}, time.Now().Add(opts.Grace))
	if err != nil {
		return client.StatusBlocked, fmt.Errorf("herd/relay: registering the orchestrator question: %w", err)
	}
	if opts.OnPark != nil {
		opts.OnPark(pending)
	}

	interval := opts.PollInterval
	if interval <= 0 {
		interval = operator.DefaultPollInterval
	}
	for {
		stored, loadErr := engine.Pending().Load(pending.ID)
		if loadErr != nil {
			return client.StatusBlocked, fmt.Errorf("herd/relay: waiting for the answer to %s: %w", pending.ID, loadErr)
		}
		if stored.Resolved() {
			applied, applyErr := engine.Apply(stored)
			if applyErr != nil {
				return client.StatusBlocked, fmt.Errorf("herd/relay: applying the answer to %s: %w", pending.ID, applyErr)
			}
			outcome, answered := answerOutcome(applied)
			if !answered {
				return currentState(ctx, controller, target)
			}
			answer := strings.TrimSpace(outcome.Text)
			if answer == "" {
				answer = strings.Join(outcome.OptionIDs, ", ")
			}
			if answer == "" {
				return client.StatusBlocked, fmt.Errorf("herd/relay: operator answer to %s was empty", pending.ID)
			}
			return prompt(ctx, controller, target, answer, opts.PromptTimeout)
		}

		state, stateErr := currentState(ctx, controller, target)
		if stateErr != nil {
			return client.StatusBlocked, stateErr
		}
		if state != client.StatusBlocked {
			// A terminal operator handled the pane directly. Resolve the durable
			// question as moot so a consumer cannot deliver it after the grace
			// deadline.
			_, resolveErr := engine.Pending().Resolve(pending.ID, operator.PendingResolution{
				Outcome:    operator.Outcome{Status: operator.OutcomeCancelled, Text: "Handled in the terminal"},
				AnsweredBy: operator.AnsweredByOutOfBand,
				AnsweredAt: time.Now().UTC(),
			})
			if resolveErr != nil && !errors.Is(resolveErr, operator.ErrAlreadyResolved) {
				return client.StatusBlocked, fmt.Errorf("herd/relay: canceling the terminal-handled question %s: %w", pending.ID, resolveErr)
			}
			return state, nil
		}

		select {
		case <-ctx.Done():
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				return client.StatusBlocked, nil
			}
			return client.StatusBlocked, ctx.Err()
		case <-time.After(interval):
		}
	}
}

// answerOutcome preserves an answer that another local process already
// applied. Engine.Apply reports that race as out-of-band because the tick is
// no longer awaiting, but the durable pending resolution is still the answer
// that must be sent to Herdr.
func answerOutcome(applied operator.Applied) (operator.Outcome, bool) {
	if p := applied.Pending.Resolution; p != nil && p.Outcome.Status == operator.OutcomeAnswered {
		return p.Outcome, true
	}
	if applied.Outcome.Status == operator.OutcomeAnswered {
		return applied.Outcome, true
	}
	return operator.Outcome{}, false
}

func currentState(ctx context.Context, controller Controller, target string) (client.AgentStatus, error) {
	info, err := controller.AgentGet(ctx, target)
	if err != nil {
		return client.StatusBlocked, fmt.Errorf("herd/relay: checking %q after an out-of-band answer: %w", target, err)
	}
	if info == nil {
		return client.StatusBlocked, fmt.Errorf("herd/relay: Herdr returned no agent for %q", target)
	}
	switch info.AgentStatus {
	case client.StatusWorking, client.StatusIdle, client.StatusDone, client.StatusBlocked:
		return info.AgentStatus, nil
	default:
		return client.StatusBlocked, fmt.Errorf("herd/relay: %q returned unknown status %q after an out-of-band answer", target, info.AgentStatus)
	}
}

func prompt(ctx context.Context, controller Controller, target, answer string, timeout time.Duration) (client.AgentStatus, error) {
	if timeout <= 0 {
		timeout = DefaultPromptTimeout
	}
	info, err := controller.AgentPrompt(ctx, client.AgentPromptParams{
		Target: target,
		Text:   answer,
		Wait: &client.AgentWaitOptions{
			Until:   []client.AgentStatus{client.StatusWorking},
			Timeout: timeout,
		},
	})
	if err != nil {
		// A short prompt confirmation can race a trivial answer or Herdr's
		// stall detector. Match spawn's verified fallback: inspect the live
		// state before declaring that the operator answer was lost.
		if client.IsTimeout(err) || client.IsCode(err, client.CodeAgentPromptStalled) {
			after, getErr := controller.AgentGet(ctx, target)
			if getErr == nil && after.AgentStatus != client.StatusUnknown {
				return checkedState(target, after.AgentStatus)
			}
		}
		return client.StatusBlocked, fmt.Errorf("herd/relay: sending the operator answer to %q: %w", target, err)
	}
	if info == nil {
		return client.StatusBlocked, fmt.Errorf("herd/relay: Herdr returned no agent after prompting %q", target)
	}
	return checkedState(target, info.AgentStatus)
}

func checkedState(target string, state client.AgentStatus) (client.AgentStatus, error) {
	switch state {
	case client.StatusWorking, client.StatusIdle, client.StatusDone:
		return state, nil
	case client.StatusBlocked:
		return client.StatusBlocked, fmt.Errorf("herd/relay: %q is still blocked after the operator answer", target)
	default:
		return client.StatusBlocked, fmt.Errorf("herd/relay: %q returned unknown status %q after prompting", target, state)
	}
}

func tickIDFromAgent(agent string) (string, error) {
	base, _ := reconcile.SplitRespawn(agent)
	if !strings.HasPrefix(base, "tick-") || len(base) == len("tick-") {
		return "", fmt.Errorf("herd/relay: agent %q is not a tick worker; use a tick-<id> agent name", agent)
	}
	return strings.TrimPrefix(base, "tick-"), nil
}
