package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
	"unicode"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
)

// `tk ask` is the blocking half of the operator surface: it parks a question on
// a tick, delivers it to the operator's channel, and waits for an answer from
// EITHER surface — the phone or the terminal.
//
// Everything that turns an answer into tick state (the `[human]` note, the
// cleared awaiting, a gate's verdict and its activity entry) belongs to
// [operator.Engine]. This command only decides what to ask, who runs the poll
// loop, and what to print; reimplementing any of the resolution rules here is
// how `tk ask`, `tk answer` and the dashboard drift apart.
const (
	// askDefaultTimeout is how long a question waits before the run gives up
	// and leaves it parked for a human to find later.
	askDefaultTimeout = 10 * time.Minute

	// askSettleTimeout bounds the final channel edit. It runs on a context
	// detached from the wait, because the most important message to settle is
	// the one whose wait just expired.
	askSettleTimeout = 15 * time.Second

	// askGateApprove is the --gate value that turns the question into an
	// approval gate: approve/reject buttons, and an answer that is a verdict.
	askGateApprove = "approve"
	// askGateNone is the default --gate value: the answer is a note.
	askGateNone = "none"

	// Values of the resolved_by field in --json output. They name the SURFACE
	// the answer came from, which is what a caller branches on: "telegram" is
	// the operator's device, "terminal" is anything local — `tk approve`, the
	// TUI, the dashboard.
	askResolvedTelegram = "telegram"
	askResolvedTerminal = "terminal"

	// askOptionIDMaxLen caps a generated option id. Ids derived from labels
	// stay readable in JSON output and short enough for transports that carry
	// identifiers in interactive controls.
	askOptionIDMaxLen = 32
)

var askCmd = &cobra.Command{
	Use:   "ask <id>",
	Short: "Ask the operator a question and block until it is answered",
	Long: `Ask the operator a question, park it on a tick, and block until it is answered.

The question is delivered to the configured operator channel (Telegram today)
and parked on the tick at the same time, so it can be answered on either
surface: a reply on the phone, or ` + "`tk approve`" + ` / ` + "`tk reject`" + ` in a terminal.
Whichever lands first ends the wait. The answer becomes a note on the tick
(` + "`--from human`" + `), or a verdict with --gate approve, and the channel message is
edited to show what was decided.

The question comes from --question, or from stdin as JSON with --json:

  {"question": "Which region?",
   "header":   "Deploy",
   "options":  [{"label": "eu-west-1", "description": "Ireland"},
                {"label": "us-east-1"}],
   "multi": false, "allow_other": false}

Option ids are derived from the labels ("Deep Green" -> "deep-green") unless the
option carries an explicit "id". Multi-select and "other" are accepted in the
JSON shape but delivered as a single-select question for now.

Output:
  text mode  the answer, and nothing else, on stdout
  --json     {"answer", "option_ids", "resolved_by": telegram|terminal, "telegram_user_id"}

Examples:
  tk ask abc123 --question "Which region should this deploy to?"
  tk ask abc123 --question "Ship it?" --gate approve --timeout 30m
  echo '{"question":"Pick one","options":[{"label":"A"},{"label":"B"}]}' | tk ask abc123 --json

Exit codes:
  0  answered (on either surface)
  2  usage error
  3  not in a git repository
  4  exit code 4: no operator channel is configured. The question is still
     registered and the tick still parked awaiting a human — degraded mode is
     the same park-and-surface behaviour as before a channel existed.
  5  exit code 5: the timeout expired. The tick stays awaiting and the pending
     question is left on disk, so a later run or a human can still settle it.`,
	Args:          cobra.ExactArgs(1),
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runAsk,
}

var (
	askQuestion string
	askJSON     bool
	askTimeout  time.Duration
	askGate     string
)

func init() {
	askCmd.Flags().StringVar(&askQuestion, "question", "", "the question to ask the operator")
	askCmd.Flags().BoolVar(&askJSON, "json", false, "read the question from stdin as JSON and print the answer as JSON")
	askCmd.Flags().DurationVar(&askTimeout, "timeout", askDefaultTimeout, "how long to wait for an answer before giving up (exit 5)")
	askCmd.Flags().StringVar(&askGate, "gate", askGateNone, "gate kind: approve (verdict, approve/reject buttons) or none")

	rootCmd.AddCommand(askCmd)
}

// askOptions is one ask, resolved from the command line. It carries no cobra
// state so the flow can be driven directly (including concurrently) by tests.
type askOptions struct {
	// Root is the repository root.
	Root string
	// TickID is the tick to park the question on.
	TickID string
	// Question is what the operator sees.
	Question operator.Question
	// Gate makes the answer a verdict instead of a note.
	Gate bool
	// Timeout bounds the wait. Zero means [askDefaultTimeout].
	Timeout time.Duration
	// PollInterval overrides the wait/delivery cadence. Zero means the
	// operator package default; tests shorten it.
	PollInterval time.Duration
	// Stderr receives non-fatal warnings (an applied answer whose channel edit
	// failed). Nil discards them.
	Stderr io.Writer
}

// askResult is what the command prints. The JSON field names are the machine
// contract: a caller reads answer/option_ids and branches on resolved_by.
type askResult struct {
	Answer         string   `json:"answer"`
	OptionIDs      []string `json:"option_ids,omitempty"`
	ResolvedBy     string   `json:"resolved_by"`
	TelegramUserID string   `json:"telegram_user_id,omitempty"`

	// consumer reports whether this run held the repository's single channel
	// poll loop. It is not part of the output — it exists so the
	// single-consumer rule is observable.
	consumer bool
}

func runAsk(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return askError(cmd, NewExitError(ExitNoRepo, "failed to detect repo root: %v", err))
	}

	gate, err := askGateKind()
	if err != nil {
		return askError(cmd, err)
	}

	question, err := askQuestionFrom(cmd, gate)
	if err != nil {
		return askError(cmd, err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return askError(cmd, NewExitError(ExitGitHub, "failed to detect project: %v", err))
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return askError(cmd, NewExitError(ExitNotFound, "invalid id: %v", err))
	}

	res, err := askFlow(commandContext(cmd), askOptions{
		Root:     root,
		TickID:   id,
		Question: question,
		Gate:     gate,
		Timeout:  askTimeout,
		Stderr:   cmd.ErrOrStderr(),
	})
	if err != nil {
		return askError(cmd, err)
	}

	if askJSON {
		data, err := json.MarshalIndent(res, "", "  ")
		if err != nil {
			return askError(cmd, NewExitError(ExitIO, "encoding the answer: %v", err))
		}
		fmt.Fprintln(cmd.OutOrStdout(), string(data))
		return nil
	}
	fmt.Fprintln(cmd.OutOrStdout(), res.Answer)
	return nil
}

// askFlow registers the question, delivers it, and blocks until either surface
// settles it.
//
// The order is deliberate: the entry and the parked tick come FIRST, before the
// channel is even looked up, so an unconfigured or broken channel degrades to
// exactly what the tracker did before channels existed — a tick a human can
// find with `tk list --awaiting`.
func askFlow(ctx context.Context, opts askOptions) (askResult, error) {
	if opts.Timeout <= 0 {
		opts.Timeout = askDefaultTimeout
	}
	engine := operator.NewEngine(opts.Root)
	if _, err := engine.Ticks().Read(opts.TickID); err != nil {
		return askResult{}, NewExitError(ExitNotFound, "failed to read tick: %v", err)
	}

	kind := operator.PendingAsk
	if opts.Gate {
		kind = operator.PendingGate
	}
	// Register parks the tick AND writes the pending entry, recording the
	// awaiting value it parked as the baseline for out-of-band detection.
	// Never set awaiting separately here.
	pending, err := engine.Register(operator.Registration{
		TickID:   opts.TickID,
		Kind:     kind,
		Question: opts.Question,
	})
	if err != nil {
		return askResult{}, NewExitError(ExitIO, "%v", err)
	}

	config, err := operator.LoadOperatorConfig()
	if err != nil {
		return askResult{}, NewExitError(ExitIO, "loading operator config: %v", err)
	}
	channelConfig, ok := config.Channel(channelTelegram)
	if !ok {
		return askResult{}, NewExitError(ExitNotFound,
			"operator channel %q is not configured: %s is parked awaiting %s with question %s — answer it on the tick (tk list --awaiting)",
			channelTelegram, opts.TickID, pending.Awaiting, pending.ID)
	}
	channel, err := telegram.NewChannel(channelConfig)
	if err != nil {
		return askResult{}, NewExitError(ExitGeneric, "opening the %s channel: %v", channelTelegram, err)
	}

	applied, wasConsumer, err := askWait(ctx, engine, channel, channelConfig, pending, opts)
	if err != nil {
		return askResult{consumer: wasConsumer}, err
	}

	res := askResultFrom(applied)
	res.consumer = wasConsumer
	return res, nil
}

// askWait runs the poll loop (or defers to whoever already does), blocks until
// the question is settled, and edits the channel message to match.
//
// It returns the applied resolution and whether this run held the consumer
// role. A timeout comes back as an [ExitTimeout] error AFTER the message has
// been settled — the operator's phone must not keep showing a live question
// nobody is listening to.
func askWait(
	ctx context.Context,
	engine *operator.Engine,
	channel operator.Channel,
	channelConfig operator.ChannelConfig,
	pending operator.Pending,
	opts askOptions,
) (operator.Applied, bool, error) {
	runCtx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	// Exactly one process per repository talks to the transport. Losing the
	// election is the normal case, not a failure: the winner delivers this
	// question too and writes the resolution this run is waiting for. Opening a
	// second Events stream would fight it for the operator's updates.
	consumer := operator.NewConsumer(engine.Pending(), channel)
	consumer.TelegramUserID = channelConfig.UserID
	consumer.Interval = opts.PollInterval

	done := make(chan error, 1)
	go func() {
		err := consumer.Run(runCtx)
		if err != nil && !errors.Is(err, operator.ErrConsumerBusy) {
			// The channel is dead. Stop waiting for an answer that can no
			// longer arrive on it.
			cancel()
		}
		done <- err
	}()

	// Await watches both surfaces and applies whatever settles the question —
	// including reporting an out-of-band resolution. Do not apply it again.
	applied, awaitErr := engine.Await(runCtx, pending.ID, opts.PollInterval)
	cancel()
	consumerErr := <-done
	wasConsumer := consumerErr == nil

	if consumerErr != nil && !errors.Is(consumerErr, operator.ErrConsumerBusy) {
		return operator.Applied{}, wasConsumer,
			NewExitError(ExitGeneric, "the %s channel failed: %v", channelTelegram, consumerErr)
	}

	timedOut := false
	if awaitErr != nil {
		if !errors.Is(awaitErr, context.DeadlineExceeded) {
			return operator.Applied{}, wasConsumer,
				NewExitError(ExitGeneric, "waiting for an answer to %s: %v", pending.ID, awaitErr)
		}
		applied, timedOut, awaitErr = askGiveUp(engine, pending.ID, opts.Timeout)
		if awaitErr != nil {
			return operator.Applied{}, wasConsumer, awaitErr
		}
	}

	askSettle(ctx, channel, applied, opts.Stderr)

	if timedOut {
		return applied, wasConsumer, NewExitError(ExitTimeout,
			"no answer to %s within %s: %s is still awaiting %s, question %s is still pending",
			pending.ID, opts.Timeout, applied.Pending.TickID, applied.Pending.Awaiting, pending.ID)
	}
	return applied, wasConsumer, nil
}

// askGiveUp records the expired deadline on the pending entry and reports
// whether the question really did time out.
//
// A timed-out resolution is not an answer, so [operator.Engine.Apply] touches
// no tick state: the tick stays awaiting and the entry stays on disk for a
// later run or a human. An answer that landed while the deadline was firing
// wins — it is a real decision, and losing it to a race would be worse than
// waiting a moment longer.
func askGiveUp(engine *operator.Engine, id string, timeout time.Duration) (operator.Applied, bool, error) {
	entry, err := engine.Pending().Resolve(id, operator.PendingResolution{
		Outcome: operator.Outcome{
			Status: operator.OutcomeTimedOut,
			Text:   fmt.Sprintf("No answer within %s", timeout),
		},
		AnsweredBy: operator.AnsweredByTerminal,
		AnsweredAt: time.Now().UTC(),
	})
	answered := errors.Is(err, operator.ErrAlreadyResolved)
	if err != nil && !answered {
		return operator.Applied{}, false, NewExitError(ExitIO, "recording the timeout on %s: %v", id, err)
	}

	applied, err := engine.Apply(entry)
	if err != nil {
		return operator.Applied{}, false, NewExitError(ExitIO, "applying the resolution of %s: %v", id, err)
	}
	return applied, !answered, nil
}

// askSettle edits the delivered message to show how the question ended. It runs
// on every resolution path — answered, out of band, timed out — so a question
// on the operator's phone never stays interactive after it stopped meaning
// anything.
//
// A failed edit is a warning, not a failure: the answer is already in tick
// state, and reporting an error would tell the caller their decision was lost.
func askSettle(ctx context.Context, channel operator.Channel, applied operator.Applied, stderr io.Writer) {
	ref := applied.Pending.Ref
	if ref.IsZero() {
		// Never delivered (an unconfigured or slow channel): nothing to edit.
		return
	}
	// Detached from the wait's context, which for a timeout has already expired.
	settleCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), askSettleTimeout)
	defer cancel()

	if err := channel.Resolve(settleCtx, ref, applied.Outcome); err != nil && stderr != nil {
		fmt.Fprintf(stderr, "warning: %s settled on the tick but its %s message was not updated: %v\n",
			applied.Pending.TickID, channelTelegram, err)
	}
}

func askResultFrom(applied operator.Applied) askResult {
	res := askResult{
		Answer:     applied.Outcome.Text,
		OptionIDs:  applied.Outcome.OptionIDs,
		ResolvedBy: askResolvedTerminal,
	}
	// Anything that is not the channel is a local surface: `tk approve`, the
	// TUI, or the tick moving on underneath the question.
	if r := applied.Pending.Resolution; r != nil && r.AnsweredBy == operator.AnsweredByTelegram {
		res.ResolvedBy = askResolvedTelegram
		res.TelegramUserID = r.TelegramUserID
	}
	return res
}

func askGateKind() (bool, error) {
	switch strings.ToLower(strings.TrimSpace(askGate)) {
	case "", askGateNone:
		return false, nil
	case askGateApprove:
		return true, nil
	default:
		return false, NewExitError(ExitUsage, "unknown --gate %q (want %s or %s)", askGate, askGateApprove, askGateNone)
	}
}

// askSpec is the JSON question shape read from stdin under --json. It mirrors
// an AskUserQuestion prompt so a prompt-shaped question survives the trip.
type askSpec struct {
	Question   string          `json:"question"`
	Header     string          `json:"header"`
	Options    []askSpecOption `json:"options"`
	Multi      bool            `json:"multi"`
	AllowOther bool            `json:"allow_other"`
}

type askSpecOption struct {
	// ID is optional; without it the id is derived from the label.
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// askQuestionFrom builds the question from --question or from the JSON on
// stdin.
func askQuestionFrom(cmd *cobra.Command, gate bool) (operator.Question, error) {
	text := strings.TrimSpace(askQuestion)

	if !askJSON {
		if text == "" {
			return operator.Question{}, NewExitError(ExitUsage,
				"ask needs a question: --question <text>, or --json with the question on stdin")
		}
		return operator.Question{Text: text}, nil
	}
	if text != "" {
		return operator.Question{}, NewExitError(ExitUsage, "--question and --json are mutually exclusive")
	}

	data, err := io.ReadAll(cmd.InOrStdin())
	if err != nil {
		return operator.Question{}, NewExitError(ExitIO, "reading the question from stdin: %v", err)
	}
	var spec askSpec
	if err := json.Unmarshal(data, &spec); err != nil {
		return operator.Question{}, NewExitError(ExitUsage, "parsing the question from stdin: %v", err)
	}
	if strings.TrimSpace(spec.Question) == "" {
		return operator.Question{}, NewExitError(ExitUsage, `the question on stdin needs a non-empty "question" field`)
	}
	if gate && len(spec.Options) > 0 {
		return operator.Question{}, NewExitError(ExitUsage,
			"--gate %s renders its own %s/%s buttons: drop the options", askGateApprove, operator.OptionApprove, operator.OptionReject)
	}

	q := operator.Question{
		Text:    strings.TrimSpace(spec.Question),
		Header:  strings.TrimSpace(spec.Header),
		Options: askSpecOptions(spec.Options),
	}
	// Multi-select and "other" are accepted so a caller's question shape does
	// not have to change, but this tick delivers a single-select question. Say
	// so on stderr rather than silently answering a different question than the
	// one that was asked.
	if spec.Multi || spec.AllowOther {
		fmt.Fprintln(cmd.ErrOrStderr(), "note: multi-select and free-text 'other' are delivered as a single-select question")
	}
	return q, nil
}

// askSpecOptions converts the spec's options, assigning an id to each one that
// does not carry its own.
func askSpecOptions(specs []askSpecOption) []operator.Option {
	if len(specs) == 0 {
		return nil
	}
	used := make(map[string]bool, len(specs))
	out := make([]operator.Option, 0, len(specs))
	for i, spec := range specs {
		id := strings.TrimSpace(spec.ID)
		if id == "" {
			id = askOptionID(spec.Label, i, used)
		}
		used[id] = true
		out = append(out, operator.Option{
			ID:          id,
			Label:       spec.Label,
			Description: spec.Description,
		})
	}
	return out
}

// askOptionID derives a stable, readable id from an option label ("Deep Green"
// -> "deep-green"), falling back to its position and de-duplicating collisions.
func askOptionID(label string, index int, used map[string]bool) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(label) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			dash = false
		case b.Len() > 0 && !dash:
			b.WriteByte('-')
			dash = true
		}
	}
	id := strings.Trim(b.String(), "-")
	if len(id) > askOptionIDMaxLen {
		id = strings.Trim(id[:askOptionIDMaxLen], "-")
	}
	if id == "" {
		id = fmt.Sprintf("option%d", index+1)
	}
	base := id
	for n := 2; used[id]; n++ {
		id = fmt.Sprintf("%s-%d", base, n)
	}
	return id
}

// askError keeps the legacy entry point useful: cmd/tk/main.go receives only
// the typed exit code from ExecuteArgs, so the command must emit its own
// actionable error line.
func askError(cmd *cobra.Command, err error) error {
	fmt.Fprintln(cmd.ErrOrStderr(), err)
	return err
}
