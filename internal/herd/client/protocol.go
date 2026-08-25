package client

import (
	"encoding/json"
	"errors"
	"fmt"
)

// ProtocolVersion is the herdr API protocol this package is written against
// (herdr 0.8.2). [New] accepts it and anything newer; see [MinProtocolVersion]
// for the hard floor and [ProtocolWarnVersion] for the warning threshold.
//
// Bumped 19 -> 20 for herdr 0.8.2.
//
// THE 19 -> 20 SHAPE DIFF, taken 2026-08-25 against a live 0.8.2 server rather
// than assumed. `session.snapshot` is identical at the top level — no key
// added, removed or renamed — and every difference below it is ADDITIVE:
// `panes[]` gained `agent`, `agent_session`, `foreground_cwd`; `agents[]`
// gained `agent_session`, `cwd`, `foreground_cwd`, `state_change_seq`. Nothing
// this client decodes disappeared or changed meaning. The captured `pong`
// matches the live one exactly.
//
// That is the evidence the forward-compatible policy below rests on: a newer
// server was observed to only ADD. It is one dated observation against one
// version, not a guarantee — which is why the floor is still a hard stop.
//
// The testdata/ fixtures remain deliberately 0.8.0-era CURATED scenarios (two
// workspaces, two panes, one agent) rather than live dumps: they exist to pin
// decoding of a known shape, and a live capture would churn them every time
// the operator opens a window. Their provenance headers say what they are.
const ProtocolVersion uint32 = 20

// MinProtocolVersion is the lowest protocol [New] will talk to. A server below
// it is a hard stop: its response shapes are older than anything this client
// has ever decoded, so continuing is a guess. This is the documented minimum
// of the supported range, not the current pin — it changes only when support
// for an old protocol is dropped.
//
// Today it equals [ProtocolVersion]: the pinned protocol is also the floor of
// the supported range.
const MinProtocolVersion uint32 = 20

// ProtocolWarnVersion is the highest protocol [New] accepts without a warning.
// A server newer than this is assumed forward-compatible — it can only have
// added shapes this client does not ask for — and [New] proceeds, routing the
// warning to [Options.ProtocolWarning] when the caller supplied one. There is
// no hard upper bound: an incompatible protocol is expected to arrive as a
// bumped minimum, not a break announced under the same version.
//
// Today it equals [ProtocolVersion] and [MinProtocolVersion]: only the pinned
// protocol is silent, anything newer warns.
const ProtocolWarnVersion uint32 = 20

// Method names, exactly as herdr spells them.
const (
	MethodPing              = "ping"
	MethodSessionSnapshot   = "session.snapshot"
	MethodWorktreeCreate    = "worktree.create"
	MethodWorktreeList      = "worktree.list"
	MethodWorktreeRemove    = "worktree.remove"
	MethodWorkspaceFocus    = "workspace.focus"
	MethodAgentStart        = "agent.start"
	MethodAgentPrompt       = "agent.prompt"
	MethodAgentWait         = "agent.wait"
	MethodAgentList         = "agent.list"
	MethodAgentGet          = "agent.get"
	MethodPaneRead          = "pane.read"
	MethodPaneWaitForOutput = "pane.wait_for_output"
	// MethodPaneReportMetadata and MethodWorkspaceReportMetadata are the
	// display-only metadata channels: a source reports title, state labels
	// and tokens for a pane, or tokens for a workspace. Nothing they write
	// is authoritative — herdr renders it and expires it.
	MethodPaneReportMetadata      = "pane.report_metadata"
	MethodWorkspaceReportMetadata = "workspace.report_metadata"
	MethodEventsSubscribe         = "events.subscribe"
	MethodEventsWait              = "events.wait"
	// MethodNotificationShow raises a desktop/toast notification on the
	// operator's foreground herdr client. Like the metadata channel it is
	// display-only — it changes nothing about a pane or an agent — but
	// unlike the metadata channel it is EPHEMERAL and INTERRUPTIVE: there
	// is no TTL and no idempotence, so every call the operator can hear is
	// a separate interruption. Callers must decide not to call it twice.
	MethodNotificationShow = "notification.show"
)

// Result discriminators, the `result.type` value each method answers with.
const (
	resultPong                = "pong"
	resultSessionSnapshot     = "session_snapshot"
	resultWorktreeCreated     = "worktree_created"
	resultWorktreeList        = "worktree_list"
	resultWorktreeRemoved     = "worktree_removed"
	resultWorkspaceInfo       = "workspace_info"
	resultAgentStarted        = "agent_started"
	resultAgentPrompted       = "agent_prompted"
	resultAgentInfo           = "agent_info"
	resultAgentList           = "agent_list"
	resultPaneRead            = "pane_read"
	resultOutputMatched       = "output_matched"
	resultSubscriptionStarted = "subscription_started"
	resultWaitMatched         = "wait_matched"
	resultNotificationShow    = "notification_show"
	// resultOK is the bare acknowledgement the report_metadata methods
	// answer with — verified live against herdr 0.8.0 / protocol 19; they
	// echo no pane or workspace object back.
	resultOK = "ok"
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
	// CodeAgentPaneBusy means agent.start's target pane is not sitting at an
	// available shell prompt. Observed live as a STARTUP RACE: the pane
	// worktree.create hands back is not a usable shell for the first few
	// hundred milliseconds of its life, so an agent.start issued immediately
	// after the create fails with this code and succeeds on a retry. It is
	// therefore transient, not a rejection — see internal/herd/spawn.
	CodeAgentPaneBusy = "agent_pane_busy"
	// CodeAgentPromptStalled means agent.prompt observed no state change
	// after submitting. It is herdr's own detection of the DROPPED FIRST
	// PROMPT documented in skills/ticks/references/herdr-kinds.md: the CLI
	// was still painting its startup UI and never received the text. The
	// documented recovery is to send it again, so this code is transient on
	// a first prompt — see internal/herd/spawn's gate.
	CodeAgentPromptStalled = "agent_prompt_stalled"
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

// ProtocolMismatchError is returned by [New] when the server's protocol is
// below [MinProtocolVersion]. The client fails closed: no call is attempted
// against a server whose wire format it cannot know. The supported range is
// [MinProtocolVersion]..[ProtocolWarnVersion]; the error text names the
// minimum, which is what the server failed to meet.
type ProtocolMismatchError struct {
	// Endpoint is the socket path that was dialled.
	Endpoint string
	// Min is [MinProtocolVersion], the bottom of the supported range.
	Min uint32
	// Actual is the protocol the server reported.
	Actual uint32
	// ServerVersion is the herdr version string the server reported.
	ServerVersion string
}

// Error implements error.
func (e *ProtocolMismatchError) Error() string {
	return fmt.Sprintf(
		"herd/client: herdr protocol mismatch at %s: server reports protocol %d (herdr %s), this client requires at least protocol %d — refusing to continue",
		e.Endpoint, e.Actual, e.ServerVersion, e.Min,
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
