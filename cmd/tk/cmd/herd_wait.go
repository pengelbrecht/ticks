package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/relay"
	"github.com/pengelbrecht/ticks/internal/herd/wait"
	"github.com/pengelbrecht/ticks/internal/operator"
)

var (
	herdWaitAgents     []string
	herdWaitTimeout    int64
	herdWaitSocket     string
	herdWaitJSON       bool
	herdWaitRelayAfter time.Duration
)

// defaultHerdWaitTimeoutMs is the wait's deadline when the caller supplies
// none. There is no indefinite mode: one wedged worker must not wedge a wave.
const defaultHerdWaitTimeoutMs = int64(30 * 60 * 1000)

var herdWaitCmd = &cobra.Command{
	Use:   "wait --agents NAME[,NAME...]",
	Short: "Block until every named herdr worker has settled",
	Long: `Wait for a wave of herdr agent workers to settle, driven by pushed events.

Current state is resolved first with a single agent.list: workers that have
already settled (idle, done or blocked) are reported immediately, and workers
herdr does not know are reported as "exited" rather than waited on. The rest
are watched through ONE events.subscribe stream — there is no polling loop.
If that stream breaks, the wait reconciles against agent.list and resubscribes
once; a second failure is an error.

A settled worker means "worth looking now", never "the work is finished". The
durable completion authority is the commits on tick/<id> plus RESULT-<id>.md,
per skills/ticks/references/herdr-runner.md.

Output
  One JSON line per worker as it settles, then a summary line:
    {"name":…,"state":…,"pane_id":…,"exited":…,"waited_ms":…}
    {"type":"summary","settled":…,"blocked":…,"exited":…,"timed_out":[…],…}
  State is the settled agent status, "exited" for an absent worker, or the
  last known status for a worker the timeout caught.
  With --json, a single document {"workers":[…],"summary":{…}} is printed at
  the end instead.

Blocked-agent relay
  --relay-blocked-after is opt-in. When set, a blocked tick is parked as an
	operator question immediately, but delivery to Telegram waits for the grace
  period. A local tk answer <tick> <answer> during that window wins and no
  Telegram question is sent. An unanswered question is delivered through the
  configured operator channel, and the response is sent back with herdr's
  agent.prompt. Without this flag, blocked remains a terminal wait outcome.

Exit codes
  0  every worker settled in idle or done (or was absent)
  1  a worker settled in blocked, the timeout fired, or the wait failed
  2  invalid flags or arguments

Examples
  tk herd wait --agents tick-a,tick-b --timeout 1800000
  tk herd wait --agents tick-a --json --socket /tmp/herdr.sock`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdWait,
}

func init() {
	herdWaitCmd.Flags().StringSliceVar(&herdWaitAgents, "agents", nil,
		"herdr agent names (or pane ids) to wait for, comma-separated (required)")
	herdWaitCmd.Flags().Int64Var(&herdWaitTimeout, "timeout", defaultHerdWaitTimeoutMs,
		"hard deadline for the whole wait, in milliseconds")
	herdWaitCmd.Flags().StringVar(&herdWaitSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdWaitCmd.Flags().BoolVar(&herdWaitJSON, "json", false,
		"print one JSON document at the end instead of streaming a line per worker")
	herdWaitCmd.Flags().DurationVar(&herdWaitRelayAfter, "relay-blocked-after", 0,
		"after this grace period, relay blocked-agent questions through the operator channel (opt-in)")
	herdCmd.AddCommand(herdWaitCmd)
}

func runHerdWait(cmd *cobra.Command, args []string) error {
	names, err := herdWaitWorkers(herdWaitAgents)
	if err != nil {
		return err
	}
	if herdWaitTimeout <= 0 {
		return NewExitError(ExitUsage, "--timeout must be a positive number of milliseconds")
	}
	if herdWaitRelayAfter < 0 {
		return NewExitError(ExitUsage, "--relay-blocked-after cannot be negative")
	}

	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	stderr := cmd.ErrOrStderr()

	herd, err := herdConnect(ctx, herdWaitSocket)
	if err != nil {
		return err
	}

	// The relay is deliberately opt-in. Opening the operator channel, and
	// owning the repository's one consumer loop, only happens when the caller
	// has explicitly asked for blocked-agent escalation.
	runCtx := ctx
	var relayCancel context.CancelFunc
	var relayRoot string
	var relayEngine *operator.Engine
	var relayChannel operator.Channel
	var relayConfig operator.ChannelConfig
	var consumerDone chan error
	if herdWaitRelayAfter > 0 {
		root, rootErr := repoRoot()
		if rootErr != nil {
			return NewExitError(ExitNoRepo, "failed to detect repo root: %v", rootErr)
		}
		relayRoot = root
		relayEngine = operator.NewEngine(root)
		relayChannel, relayConfig, err = askChannel()
		if err != nil {
			return err
		}
		runCtx, relayCancel = context.WithCancel(ctx)
		if relayChannel != nil {
			consumerDone = make(chan error, 1)
			consumer := operator.NewConsumer(relayEngine.Pending(), relayChannel)
			consumer.TelegramUserID = relayConfig.UserID
			go func() {
				consumerErr := consumer.Run(runCtx)
				if consumerErr != nil && !errors.Is(consumerErr, operator.ErrConsumerBusy) {
					relayCancel()
				}
				consumerDone <- consumerErr
			}()
		}
	}
	if relayCancel != nil {
		defer relayCancel()
	}

	opts := wait.Options{
		Workers: names,
		Timeout: time.Duration(herdWaitTimeout) * time.Millisecond,
	}
	if !herdWaitJSON {
		// Stream each worker as it lands, so a long wave reports progress.
		opts.OnSettle = func(r wait.Result) { writeJSONLine(out, r) }
	}

	if herdWaitRelayAfter > 0 {
		var logMu sync.Mutex
		log := func(format string, args ...any) {
			logMu.Lock()
			defer logMu.Unlock()
			fmt.Fprintf(stderr, format, args...)
		}
		opts.OnBlocked = func(blockedCtx context.Context, r wait.Result) (client.AgentStatus, error) {
			target, eligible, targetErr := relay.ResolveRecordedTarget(relayRoot, r)
			if targetErr != nil {
				log("warning: blocked agent %s was not relayed because worker manifests could not be checked: %v\n",
					r.Name, targetErr)
				return client.StatusBlocked, nil
			}
			if !eligible {
				log("herd: blocked agent %s is not a recorded tick worker; leaving it blocked without an automatic relay\n",
					r.Name)
				return client.StatusBlocked, nil
			}
			r.AgentName = target
			state, relayErr := relay.Handle(blockedCtx, herd, r, relay.Options{
				RepoRoot:      relayRoot,
				Engine:        relayEngine,
				Channel:       relayChannel,
				Grace:         herdWaitRelayAfter,
				PromptTimeout: 30 * time.Second,
				OnPark: func(p operator.Pending) {
					if relayChannel == nil {
						log("herd: %s is blocked; question %s is parked for terminal answer (no operator channel configured)\n",
							r.Name, p.ID)
						return
					}
					log("herd: %s is blocked; question %s is parked locally and will reach Telegram after %s unless answered with tk answer %s <answer>\n",
						r.Name, p.ID, herdWaitRelayAfter, p.TickID)
				},
				Warning: func(warn error) { log("warning: %v\n", warn) },
			})
			if relayErr == nil {
				log("herd: operator answer relayed to %s; worker state is %s\n", r.Name, state)
			}
			return state, relayErr
		}
	}

	summary, waitErr := wait.Wait(runCtx, herd, opts)
	if relayCancel != nil {
		relayCancel()
	}
	if consumerDone != nil {
		consumerErr := <-consumerDone
		if consumerErr != nil && !errors.Is(consumerErr, operator.ErrConsumerBusy) {
			return NewExitError(ExitGeneric, "the %s channel failed: %v", channelTelegram, consumerErr)
		}
	}
	err = waitErr
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	if herdWaitJSON {
		writeJSONLine(out, struct {
			Workers []wait.Result `json:"workers"`
			Summary *wait.Summary `json:"summary"`
		}{summary.Workers, summary})
	} else {
		writeJSONLine(out, herdWaitSummaryLine(summary))
	}

	if !summary.OK() {
		return ExitError{Code: ExitGeneric, Message: herdWaitFailureMessage(summary)}
	}
	return nil
}

// herdWaitWorkers normalises the --agents flag: trimmed, non-empty, unique,
// order preserved.
func herdWaitWorkers(raw []string) ([]string, error) {
	seen := make(map[string]bool, len(raw))
	var names []string
	for _, name := range raw {
		name = strings.TrimSpace(name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	if len(names) == 0 {
		return nil, NewExitError(ExitUsage, "--agents is required: name at least one herdr agent to wait for")
	}
	return names, nil
}

// herdWaitSummaryLine is the trailing line of the streaming output. It repeats
// the counts rather than the per-worker rows, which have already been printed.
type herdWaitSummary struct {
	Type         string   `json:"type"`
	Settled      int      `json:"settled"`
	Blocked      int      `json:"blocked"`
	Exited       int      `json:"exited"`
	TimedOut     []string `json:"timed_out"`
	ElapsedMs    int64    `json:"elapsed_ms"`
	TimeoutFired bool     `json:"timeout_fired"`
	OK           bool     `json:"ok"`
}

func herdWaitSummaryLine(s *wait.Summary) herdWaitSummary {
	timedOut := s.TimedOut
	if timedOut == nil {
		timedOut = []string{}
	}
	return herdWaitSummary{
		Type:         "summary",
		Settled:      s.Settled,
		Blocked:      s.Blocked,
		Exited:       s.Exited,
		TimedOut:     timedOut,
		ElapsedMs:    s.ElapsedMs,
		TimeoutFired: s.TimeoutFired,
		OK:           s.OK(),
	}
}

// herdWaitFailureMessage explains a non-zero exit in one line.
func herdWaitFailureMessage(s *wait.Summary) string {
	var parts []string
	if s.Blocked > 0 {
		var blocked []string
		for _, r := range s.Workers {
			if r.State == string(client.StatusBlocked) {
				blocked = append(blocked, r.Name)
			}
		}
		parts = append(parts, "blocked: "+strings.Join(blocked, ", "))
	}
	if s.TimeoutFired {
		parts = append(parts, fmt.Sprintf("timed out after %dms: %s",
			s.ElapsedMs, strings.Join(s.TimedOut, ", ")))
	}
	return "wave did not finish cleanly (" + strings.Join(parts, "; ") + ")"
}

// writeJSONLine prints one compact JSON document followed by a newline.
func writeJSONLine(w io.Writer, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		fmt.Fprintf(w, "{\"error\":%q}\n", err.Error())
		return
	}
	fmt.Fprintln(w, string(body))
}
