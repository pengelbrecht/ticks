package herdclient

import (
	"context"
	"encoding/json"
	"time"
)

// millis converts a duration to herdr's timeout_ms, returning nil for
// non-positive durations so the field is omitted and the server default holds.
func millis(d time.Duration) *uint64 {
	if d <= 0 {
		return nil
	}
	ms := uint64(d / time.Millisecond)
	if ms == 0 {
		ms = 1
	}
	return &ms
}

// Ping performs the ping handshake and reports the server's version and
// protocol. [New] calls it; call it again to check liveness.
//
// Substrate detection must bound this call. A stale socket file can be
// connectable yet never answer, and the availability probe of
// runners-config.md is supposed to degrade to harness orchestration rather
// than hang. Ping is bounded by the earlier of the caller's deadline and
// [Options.CallTimeout], so a short CallTimeout is enough — but do not pass a
// context with no deadline and CallTimeout disabled.
func (c *Client) Ping(ctx context.Context) (ServerInfo, error) {
	var info ServerInfo
	err := c.call(ctx, MethodPing, resultPong, struct{}{}, &info)
	return info, err
}

// AgentWaitOptions is the inline wait attached to agent.prompt.
type AgentWaitOptions struct {
	// Until is the set of statuses that ends the wait. Empty means herdr's
	// default.
	Until []AgentStatus `json:"until,omitempty"`
	// Timeout bounds the wait. Zero means herdr's default.
	Timeout time.Duration `json:"-"`
}

// MarshalJSON renders Timeout as herdr's timeout_ms.
func (o AgentWaitOptions) MarshalJSON() ([]byte, error) {
	type wire AgentWaitOptions
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(o), millis(o.Timeout)})
}

// AgentPromptParams are the parameters of agent.prompt.
type AgentPromptParams struct {
	// Target is a pane id or agent name. Required.
	Target string `json:"target"`
	// Text is the prompt to deliver. Required.
	Text string `json:"text"`
	// Wait, when non-nil, makes the call block until the agent reaches one
	// of the given statuses — a prompt-and-wait in one round trip.
	Wait *AgentWaitOptions `json:"wait,omitempty"`
}

// AgentPrompt sends a prompt to a running agent, optionally waiting for it to
// settle. Because the inline wait may run long, AgentPrompt does not apply the
// client's default call timeout when Wait is set — bound it with the context
// or with Wait.Timeout.
func (c *Client) AgentPrompt(ctx context.Context, params AgentPromptParams) (*AgentInfo, error) {
	var out struct {
		Agent AgentInfo `json:"agent"`
	}
	var err error
	if params.Wait != nil {
		err = c.callNoTimeout(ctx, MethodAgentPrompt, resultAgentPrompted, params, &out)
	} else {
		err = c.call(ctx, MethodAgentPrompt, resultAgentPrompted, params, &out)
	}
	if err != nil {
		return nil, err
	}
	return &out.Agent, nil
}

// AgentGet returns one agent by pane id or agent name. An unknown target is an
// [APIError] with [CodeAgentNotFound].
func (c *Client) AgentGet(ctx context.Context, target string) (*AgentInfo, error) {
	params := struct {
		Target string `json:"target"`
	}{Target: target}
	var out struct {
		Agent AgentInfo `json:"agent"`
	}
	if err := c.call(ctx, MethodAgentGet, resultAgentInfo, params, &out); err != nil {
		return nil, err
	}
	return &out.Agent, nil
}
