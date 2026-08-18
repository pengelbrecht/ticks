// Package relay turns a herdr blocked status into a durable operator question
// and sends the first answer back to the same agent.
//
// It deliberately owns no transport poll loop. The caller starts the
// repository's single operator.Consumer; this package only registers the
// question, waits on its durable pending entry, applies the answer, and uses
// herdr's agent.prompt to resume the worker.
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

	// settleTimeout gives the operator channel a short, detached window to
	// remove its interactive controls after the answer has been sent on.
	settleTimeout = 15 * time.Second
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
	// Channel is the configured operator channel. It may be nil: the question
	// remains answerable from a terminal, but cannot be delivered to Telegram.
	Channel operator.Channel
	// Grace delays channel delivery. The pending entry is visible to local
	// surfaces immediately.
	Grace time.Duration
	// PollInterval bounds how often the pending entry is checked. Zero uses the
	// operator package default.
	PollInterval time.Duration
	// PromptTimeout bounds Herdr's prompt-and-confirm round trip. Zero uses
	// DefaultPromptTimeout.
	PromptTimeout time.Duration
	// OnPark is called after the durable question is registered.
	OnPark func(operator.Pending)
	// Warning receives a non-fatal channel-settle failure. The answer and the
	// tick have already been applied when this is called.
	Warning func(error)
}

// ResolveRecordedTarget returns the exact Herdr target to prompt when a
// blocked result belongs to a worker manifest. The manifest set is the
// controller's boundary: a pane or agent name that was not dispatched as a
// tick worker — notably the orchestrator's own pane — is not eligible for an
// automatic answer relay.
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
	target := strings.TrimSpace(blocked.AgentName)
	if target == "" {
		target = strings.TrimSpace(blocked.Name)
	}
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

// Handle parks an operator question for the blocked worker, waits for a
// terminal or Telegram answer, and sends an answer back to the same Herdr
// target. It returns the worker state that the outer wait should continue
// watching: working resumes the existing wait, idle/done settle it, and
// blocked leaves it blocked.
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

	target := strings.TrimSpace(blocked.AgentName)
	if target == "" {
		target = strings.TrimSpace(blocked.Name)
	}
	tickID, err := tickIDFromAgent(target)
	if err != nil {
		return client.StatusBlocked, err
	}

	engine := opts.Engine
	if engine == nil {
		engine = operator.NewEngine(opts.RepoRoot)
	}
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

	state, promptErr := prompt(ctx, controller, target, answer, opts.PromptTimeout)
	if promptErr != nil {
		return client.StatusBlocked, promptErr
	}
	if applied.Pending.Ref.IsZero() || opts.Channel == nil {
		return state, nil
	}

	settleCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), settleTimeout)
	defer cancel()
	if err := opts.Channel.Resolve(settleCtx, applied.Pending.Ref, outcome); err != nil && opts.Warning != nil {
		opts.Warning(fmt.Errorf("settling operator question %s: %w", pending.ID, err))
	}
	return state, nil
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
