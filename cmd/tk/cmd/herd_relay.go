package cmd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/relay"
	"github.com/pengelbrecht/ticks/internal/herdclient"
	"github.com/pengelbrecht/ticks/internal/operator"
)

var (
	herdRelayAgent   string
	herdRelayPane    string
	herdRelaySocket  string
	herdRelayGrace   time.Duration
	herdRelayTimeout time.Duration
)

// defaultHerdRelayTimeout bounds the whole relay. There is no indefinite
// mode: one blocked worker must not wedge whatever is waiting on this
// command.
const defaultHerdRelayTimeout = 30 * time.Minute

var herdRelayCmd = &cobra.Command{
	Use:   "relay --agent NAME",
	Short: "Park an operator question for one blocked herdr worker and relay the answer back",
	Long: `Turn a blocked herdr worker into a durable operator question, wait for it to
be answered, and send the answer back with herdr's agent.prompt.

This is internal/herd/relay's only caller in this repository. The wave-wait
loop that used to invoke it (` + "`tk herd wait --relay-blocked-after`" + `) moved to
ticfac along with the rest of wave execution; this command is the thin,
single-worker surface ticfac (or an operator) drives instead.

--agent names the live herdr agent (a tick-<id> worker name, e.g. tick-abc) or
a bare pane id when herdr's blocked report did not carry a live name. A
tick-<id>-shaped name is checked against .tick/logs/herd's recorded worker
manifests: a match parks a tick-scoped question, answerable with
` + "`tk answer <tick-id> <answer>`" + `. Anything else is an explicit orchestrator/pane
relay, parking an agent-scoped question answerable with
` + "`tk answer <question-id> <answer>`" + ` — printed to stderr when the question is
parked.

--grace delays escalation beyond the terminal; the pending entry is visible to
local surfaces (tk list --awaiting, the dashboard) immediately.

Exit codes
  0  the answer was relayed and the worker resumed (or moved on)
  2  invalid flags
  3  not in a git repository
  7  the command's own --timeout elapsed before an answer arrived
  1  connecting to herdr failed, or the answer could not be delivered

Examples
  tk herd relay --agent tick-abc
  tk herd relay --agent tick-abc --pane w1:p1 --grace 10m
  tk herd relay --agent w9T:p1 --timeout 1h`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdRelay,
}

func init() {
	herdRelayCmd.Flags().StringVar(&herdRelayAgent, "agent", "",
		"blocked herdr agent name or pane id (required)")
	herdRelayCmd.Flags().StringVar(&herdRelayPane, "pane", "",
		"pane id the agent ran in, when known")
	herdRelayCmd.Flags().StringVar(&herdRelaySocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdRelayCmd.Flags().DurationVar(&herdRelayGrace, "grace", 0,
		"delay before the parked question escalates past the terminal")
	herdRelayCmd.Flags().DurationVar(&herdRelayTimeout, "timeout", defaultHerdRelayTimeout,
		"hard deadline for the whole relay")
	herdCmd.AddCommand(herdRelayCmd)
}

func runHerdRelay(cmd *cobra.Command, args []string) error {
	agent := strings.TrimSpace(herdRelayAgent)
	if agent == "" {
		return NewExitError(ExitUsage, "--agent is required: name the blocked herdr agent or pane id")
	}
	if herdRelayGrace < 0 {
		return NewExitError(ExitUsage, "--grace cannot be negative")
	}
	if herdRelayTimeout <= 0 {
		return NewExitError(ExitUsage, "--timeout must be positive")
	}

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	stderr := cmd.ErrOrStderr()
	ctx, cancel := context.WithTimeout(cmd.Context(), herdRelayTimeout)
	defer cancel()

	herd, err := herdclient.New(ctx, herdclient.Options{SocketPath: herdRelaySocket, ProtocolWarning: stderr})
	if err != nil {
		return NewExitError(ExitGeneric, "connecting to herdr: %v", err)
	}

	blocked := relay.Blocked{Name: agent, PaneID: strings.TrimSpace(herdRelayPane)}
	allowUnscoped := false
	if target, eligible, targetErr := relay.ResolveRecordedTarget(root, blocked); targetErr != nil || !eligible {
		allowUnscoped = true
		if targetErr != nil {
			fmt.Fprintf(stderr, "herd: worker manifests could not be checked for %s; treating it as an explicit orchestrator relay: %v\n", agent, targetErr)
		}
		if target != "" {
			blocked.AgentName = target
		}
	} else {
		blocked.AgentName = target
	}

	state, relayErr := relay.Handle(ctx, herd, blocked, relay.Options{
		RepoRoot:      root,
		Grace:         herdRelayGrace,
		AllowUnscoped: allowUnscoped,
		OnPark: func(p operator.Pending) {
			if p.Kind == operator.PendingAgentRelay {
				fmt.Fprintf(stderr, "herd: %s is blocked; question %s is parked for terminal answer with tk answer %s <answer>\n", agent, p.ID, p.ID)
				return
			}
			fmt.Fprintf(stderr, "herd: %s is blocked; question %s is parked for terminal answer with tk answer %s <answer>\n", agent, p.ID, p.TickID)
		},
	})
	if relayErr != nil {
		return NewExitError(ExitGeneric, "%v", relayErr)
	}

	writeJSONLine(cmd.OutOrStdout(), struct {
		Agent string `json:"agent"`
		State string `json:"state"`
	}{agent, string(state)})

	if state == herdclient.StatusBlocked {
		return NewExitError(ExitTimeout, "%s is still blocked (no answer within %s)", agent, herdRelayTimeout)
	}
	return nil
}
