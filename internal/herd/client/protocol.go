package client

import (
	"encoding/json"
	"errors"
	"fmt"
)

// ProtocolVersion is the herdr API protocol this package is written against
// (herdr 0.8.0). [New] fails closed when the server reports anything else.
const ProtocolVersion uint32 = 19

// Method names, exactly as herdr spells them.
const (
	MethodPing              = "ping"
	MethodSessionSnapshot   = "session.snapshot"
	MethodWorktreeCreate    = "worktree.create"
	MethodWorktreeList      = "worktree.list"
	MethodWorktreeRemove    = "worktree.remove"
	MethodAgentStart        = "agent.start"
	MethodAgentPrompt       = "agent.prompt"
	MethodAgentWait         = "agent.wait"
	MethodAgentList         = "agent.list"
	MethodAgentGet          = "agent.get"
	MethodPaneRead          = "pane.read"
	MethodPaneWaitForOutput = "pane.wait_for_output"
	MethodEventsSubscribe   = "events.subscribe"
	MethodEventsWait        = "events.wait"
)

// Result discriminators, the `result.type` value each method answers with.
const (
	resultPong                = "pong"
	resultSessionSnapshot     = "session_snapshot"
	resultWorktreeCreated     = "worktree_created"
	resultWorktreeList        = "worktree_list"
	resultWorktreeRemoved     = "worktree_removed"
	resultAgentStarted        = "agent_started"
	resultAgentPrompted       = "agent_prompted"
	resultAgentInfo           = "agent_info"
	resultAgentList           = "agent_list"
	resultPaneRead            = "pane_read"
	resultOutputMatched       = "output_matched"
	resultSubscriptionStarted = "subscription_started"
	resultWaitMatched         = "wait_matched"
)

// Error codes observed from herdr 0.8.0 / protocol 19. The set is open-ended —
// treat an unrecognised code as an opaque server error rather than a bug.
const (
	// CodeTimeout is returned by the waiting methods (agent.wait,
	// events.wait, pane.wait_for_output) when their deadline elapses.
	CodeTimeout = "timeout"
	// CodeInvalidRequest means the envelope or params failed to parse.
	CodeInvalidRequest = "invalid_request"
	// CodeAgentNotFound means the agent target does not resolve.
	CodeAgentNotFound = "agent_not_found"
	// CodePaneNotFound means the pane id does not resolve.
	CodePaneNotFound = "pane_not_found"
	// CodeWorkspaceNotFound means the workspace id does not resolve.
	CodeWorkspaceNotFound = "workspace_not_found"
)

// request is the wire request envelope.
type request struct {
	ID     string `json:"id"`
	Method string `json:"method"`
	Params any    `json:"params"`
}

// response is the wire reply envelope. Exactly one of Result and Error is set.
// On a parse failure the server answers with an empty ID, so callers must not
// require the ID to match before reading Error.
type response struct {
	ID     string          `json:"id"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  *errorBody      `json:"error,omitempty"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// APIError is a structured error response from the herdr server.
type APIError struct {
	// Method is the API method that produced the error.
	Method string
	// RequestID is the id the server echoed; empty for envelope parse errors.
	RequestID string
	// Code is the machine-readable error code, e.g. [CodeTimeout].
	Code string
	// Message is herdr's human-readable message.
	Message string
}

// Error implements error.
func (e *APIError) Error() string {
	return fmt.Sprintf("herdr %s failed: %s: %s", e.Method, e.Code, e.Message)
}

// IsTimeout reports whether this error is herdr's wait timeout.
func (e *APIError) IsTimeout() bool { return e != nil && e.Code == CodeTimeout }

// AsAPIError extracts an *APIError from err, if there is one in its chain.
func AsAPIError(err error) (*APIError, bool) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return apiErr, true
	}
	return nil, false
}

// IsTimeout reports whether err is a herdr wait timeout ([CodeTimeout]). It is
// the check the wait/collect commands want: a timed-out wait is a normal
// outcome, not a transport failure.
func IsTimeout(err error) bool {
	apiErr, ok := AsAPIError(err)
	return ok && apiErr.IsTimeout()
}

// IsCode reports whether err is an [APIError] carrying the given code.
func IsCode(err error, code string) bool {
	apiErr, ok := AsAPIError(err)
	return ok && apiErr.Code == code
}

// ProtocolMismatchError is returned by [New] when the server's protocol
// version differs from [ProtocolVersion]. The client fails closed: no call is
// attempted against a server whose wire format it does not know.
type ProtocolMismatchError struct {
	// Endpoint is the socket path that was dialled.
	Endpoint string
	// Expected is [ProtocolVersion].
	Expected uint32
	// Actual is the protocol the server reported.
	Actual uint32
	// ServerVersion is the herdr version string the server reported.
	ServerVersion string
}

// Error implements error.
func (e *ProtocolMismatchError) Error() string {
	return fmt.Sprintf(
		"herd/client: herdr protocol mismatch at %s: server reports protocol %d (herdr %s), this client is pinned to protocol %d — refusing to continue",
		e.Endpoint, e.Actual, e.ServerVersion, e.Expected,
	)
}

// UnexpectedResultError means the server answered a method with a result
// discriminator this client does not expect — a symptom of protocol drift
// that slipped past the version check.
type UnexpectedResultError struct {
	// Method is the API method that was called.
	Method string
	// Want is the result.type this client expected.
	Want string
	// Got is the result.type the server sent.
	Got string
}

// Error implements error.
func (e *UnexpectedResultError) Error() string {
	return fmt.Sprintf("herd/client: %s returned result type %q, expected %q", e.Method, e.Got, e.Want)
}
