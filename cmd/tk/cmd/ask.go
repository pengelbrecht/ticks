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
option carries an explicit "id". "multi" delivers a toggle keyboard committed
with Done; "allow_other" adds an Other… button that asks for free text and
resolves the same question.

Approving a picture:
  --photo <path>     deliver a local image as the gate itself, with the
                     approve/reject buttons under it. Requires --gate approve.
  --caption <text>   the text shown with the photo; it is the question when
                     --question is omitted

  tk ask abc123 --photo shots/board.png --gate approve --caption "New board OK?"

The photo gate blocks, resolves and edits exactly like a text gate — the same
verdict, the same [human] note, and the same flags (--timeout, --async,
--escalate-after) compose with it.

Not blocking:
  --async            register, deliver, and print the question id, then exit
  --collect          print every settled question as a JSON line and drain it
  --collect --wait   also block on the questions still open
  --escalate-after   hold channel delivery for a grace window; local surfaces
                     (tk answer, the dashboard) see the question immediately,
                     so answering in time means the phone is never disturbed

Output:
  text mode  the answer, and nothing else, on stdout (--async: the question id)
  --json     {"id", "tick_id", "answer", "option_ids",
              "resolved_by": telegram|terminal, "telegram_user_id"}
  --collect  one JSON object per line, in the order the questions were asked

Examples:
  tk ask abc123 --question "Which region should this deploy to?"
  tk ask abc123 --question "Ship it?" --gate approve --timeout 30m
  tk ask abc123 --question "Which region?" --async --escalate-after 5m
  tk ask --collect --wait --timeout 30m
  echo '{"question":"Pick one","options":[{"label":"A"},{"label":"B"}]}' | tk ask abc123 --json

Exit codes:
  0  answered (on either surface)
  2  usage error
  3  not in a git repository
  4  exit code 4: no operator channel is configured. The question is still
     registered and the tick still parked awaiting a human — degraded mode is
     the same park-and-surface behaviour as before a channel existed.
  5  project detection failed (the origin remote could not be read)
  7  exit code 7: the timeout expired. Giving up waiting is not an answer: the
     tick stays awaiting and the question is left OPEN on disk, so a later
     tk answer — or a later run — still settles it.`,
	Args:          cobra.MaximumNArgs(1),
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runAsk,
}

var (
	askQuestion      string
	askJSON          bool
	askTimeout       time.Duration
	askGate          string
	askAsync         bool
	askCollect       bool
	askWait          bool
	askEscalateAfter time.Duration
	askPhoto         string
	askCaption       string
)

func init() {
	askCmd.Flags().StringVar(&askQuestion, "question", "", "the question to ask the operator")
	askCmd.Flags().BoolVar(&askJSON, "json", false, "read the question from stdin as JSON and print the answer as JSON")
	askCmd.Flags().DurationVar(&askTimeout, "timeout", askDefaultTimeout, "how long to wait for an answer before giving up (exit 7; the question stays open)")
	askCmd.Flags().StringVar(&askGate, "gate", askGateNone, "gate kind: approve (verdict, approve/reject buttons) or none")
	askCmd.Flags().BoolVar(&askAsync, "async", false, "register and deliver the question, print its id, and return without waiting")
	askCmd.Flags().BoolVar(&askCollect, "collect", false, "print settled questions as JSON lines and drain them (takes no tick id)")
	askCmd.Flags().BoolVar(&askWait, "wait", false, "with --collect: also block on the questions still open")
	askCmd.Flags().DurationVar(&askEscalateAfter, "escalate-after", 0, "hold channel delivery for this long; local surfaces see the question at once")
	askCmd.Flags().StringVar(&askPhoto, "photo", "", "deliver this local image as the gate itself, with the approve/reject buttons under it (requires --gate approve)")
	askCmd.Flags().StringVar(&askCaption, "caption", "", "the text shown with --photo (defaults the question when --question is omitted)")

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
	// Photo is a local image delivered as the gate itself: the approve/reject
	// buttons hang under the picture. Requires Gate.
	Photo string
	// Caption is the text shown with Photo.
	Caption string
	// Async registers and delivers the question and returns without waiting.
	Async bool
	// NotBefore holds channel delivery until this instant (--escalate-after).
	// Local surfaces see the parked question immediately regardless.
	NotBefore time.Time
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
// contract: a caller reads answer/option_ids and branches on resolved_by. The
// id is what --async prints and what a later --collect line names, so the two
// halves of an asynchronous ask can be correlated.
type askResult struct {
	ID             string   `json:"id"`
	TickID         string   `json:"tick_id"`
	Answer         string   `json:"answer,omitempty"`
	OptionIDs      []string `json:"option_ids,omitempty"`
	ResolvedBy     string   `json:"resolved_by,omitempty"`
	TelegramUserID string   `json:"telegram_user_id,omitempty"`

	// consumer reports whether this run held the repository's single channel
	// poll loop. It is not part of the output — it exists so the
	// single-consumer rule is observable.
	consumer bool
}

// askCollected is one settled question, printed as a JSON line by --collect.
// It is askResult plus the two things a batch consumer needs and a single ask
// already knew: which question this is, and how it ended.
type askCollected struct {
	ID             string   `json:"id"`
	TickID         string   `json:"tick_id"`
	Question       string   `json:"question"`
	Status         string   `json:"status"`
	Answer         string   `json:"answer,omitempty"`
	OptionIDs      []string `json:"option_ids,omitempty"`
	ResolvedBy     string   `json:"resolved_by"`
	TelegramUserID string   `json:"telegram_user_id,omitempty"`
}

func runAsk(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return askError(cmd, NewExitError(ExitNoRepo, "failed to detect repo root: %v", err))
	}
	if err := askValidateFlags(args); err != nil {
		return askError(cmd, err)
	}

	if askCollect {
		if err := askCollectFlow(commandContext(cmd), askCollectOptions{
			Root:    root,
			Wait:    askWait,
			Timeout: askTimeout,
			Out:     cmd.OutOrStdout(),
			Stderr:  cmd.ErrOrStderr(),
		}); err != nil {
			return askError(cmd, err)
		}
		return nil
	}

	gate, err := askGateKind()
	if err != nil {
		return askError(cmd, err)
	}

	question, err := askQuestionFrom(cmd, gate, askCaption)
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

	var notBefore time.Time
	if askEscalateAfter > 0 {
		notBefore = time.Now().Add(askEscalateAfter)
	}

	res, err := askFlow(commandContext(cmd), askOptions{
		Root:      root,
		TickID:    id,
		Question:  question,
		Gate:      gate,
		Photo:     askPhoto,
		Caption:   askCaption,
		Async:     askAsync,
		NotBefore: notBefore,
		Timeout:   askTimeout,
		Stderr:    cmd.ErrOrStderr(),
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
	if askAsync {
		// The id is the whole point of not waiting: it is what `tk ask
		// --collect` prints back and what names the entry in .tick/pending.
		fmt.Fprintln(cmd.OutOrStdout(), res.ID)
		return nil
	}
	fmt.Fprintln(cmd.OutOrStdout(), res.Answer)
	return nil
}

// askValidateFlags rejects the flag combinations that mean two different runs.
//
// --collect is the other end of --async, not a variant of asking: it takes no
// tick id and no question, because the questions it drains were asked earlier.
func askValidateFlags(args []string) error {
	if askCollect {
		switch {
		case len(args) > 0:
			return NewExitError(ExitUsage,
				"tk ask --collect takes no tick id: it drains every settled question in the repository")
		case askAsync:
			return NewExitError(ExitUsage,
				"--async and --collect are the two halves of one flow: ask with --async, gather with --collect")
		case strings.TrimSpace(askQuestion) != "" || askJSON:
			return NewExitError(ExitUsage,
				"--collect gathers answers to questions already asked: drop --question/--json")
		case askEscalateAfter != 0:
			return NewExitError(ExitUsage, "--escalate-after applies to asking a question, not to --collect")
		case askPhoto != "" || askCaption != "":
			return NewExitError(ExitUsage, "--photo/--caption deliver a question: they mean nothing to --collect")
		}
		return nil
	}
	if err := askValidatePhotoFlags(); err != nil {
		return err
	}
	if askWait {
		return NewExitError(ExitUsage, "--wait applies to --collect only (a plain tk ask already blocks)")
	}
	if len(args) != 1 {
		return NewExitError(ExitUsage,
			"ask needs a tick id: tk ask <id> --question <text>, or tk ask --collect to gather answers")
	}
	if askEscalateAfter < 0 {
		return NewExitError(ExitUsage, "--escalate-after cannot be negative")
	}
	return nil
}

// askValidatePhotoFlags keeps --photo to the one shape this epic settled: an
// approval gate.
//
// A photo with a plain ask would raise questions this epic deliberately left
// open — what a free-text answer to a picture means, whether the picture is the
// question or context for one — and answering them by accident here is worse
// than a usage error that says so.
func askValidatePhotoFlags() error {
	if len(askCaption) > captionMaxLen {
		return NewExitError(ExitUsage,
			"--caption is %d bytes, over the %d the channel can show with a file",
			len(askCaption), captionMaxLen)
	}
	if askPhoto == "" {
		if askCaption != "" {
			return NewExitError(ExitUsage, "--caption is the text shown with --photo: it means nothing without one")
		}
		return nil
	}
	if strings.ToLower(strings.TrimSpace(askGate)) != askGateApprove {
		return NewExitError(ExitUsage,
			"--photo delivers an approval gate: pass --gate %s (a photo on a plain ask is not supported yet)", askGateApprove)
	}
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
	registration := operator.Registration{
		TickID:    opts.TickID,
		Kind:      kind,
		Question:  opts.Question,
		NotBefore: opts.NotBefore,
	}

	if opts.Photo != "" {
		return askPhotoFlow(ctx, engine, registration, opts)
	}

	// Register parks the tick AND writes the pending entry, recording the
	// awaiting value it parked as the baseline for out-of-band detection.
	// Never set awaiting separately here.
	pending, err := engine.Register(registration)
	if err != nil {
		return askResult{}, NewExitError(ExitIO, "%v", err)
	}
	registered := askResult{ID: pending.ID, TickID: pending.TickID}

	channel, channelConfig, err := askChannel()
	if err != nil {
		return registered, err
	}
	if channel == nil {
		return registered, askParkedError(pending)
	}

	return askSettleFlow(ctx, engine, channel, channelConfig, pending, opts)
}

// askPhotoFlow is the gated-attachment shape of an ask: the picture IS the
// question, and the buttons hang under it.
//
// The order is inverted from the text flow on purpose. A gate under a photo only
// exists once the upload has a message ref, so the channel comes first and the
// entry is written with [operator.Engine.RegisterDelivered] — already delivered,
// which is what stops the consumer from posting a duplicate text question on its
// next sweep. From there nothing is special: the consumer adopts the ref, a press
// routes by it, and Await/Apply settle the verdict exactly as they do for a text
// gate.
//
// Degraded mode is unchanged: with no channel configured there is nothing to
// upload to, so the question is registered and the tick parked exactly as a text
// ask would leave them, and the run exits 4.
func askPhotoFlow(ctx context.Context, engine *operator.Engine, registration operator.Registration, opts askOptions) (askResult, error) {
	channel, channelConfig, err := askChannel()
	if err != nil || channel == nil {
		pending, regErr := engine.Register(registration)
		if regErr != nil {
			return askResult{}, NewExitError(ExitIO, "%v", regErr)
		}
		registered := askResult{ID: pending.ID, TickID: pending.TickID}
		if err != nil {
			return registered, err
		}
		return registered, askParkedError(pending)
	}

	if !operator.SupportsAttachments(channel) {
		pending, regErr := engine.Register(registration)
		if regErr != nil {
			return askResult{}, NewExitError(ExitIO, "%v", regErr)
		}
		registered := askResult{ID: pending.ID, TickID: pending.TickID}
		return registered, askParkedError(pending)
	}
	// --photo names the presentation, so the kind is explicit rather than
	// resolved from the extension: a .webp screenshot asked for as a photo is
	// sent as one.
	ref, err := channel.(operator.AttachmentSender).SendAttachment(ctx, operator.Attachment{
		Path:    opts.Photo,
		Caption: opts.Caption,
		Kind:    operator.KindPhoto,
		Gate:    true,
	})
	if err != nil {
		return askResult{}, NewExitError(ExitGeneric, "delivering the photo gate to the %s channel: %v", channelTelegram, err)
	}

	pending, err := engine.RegisterDelivered(registration, ref)
	if err != nil {
		return askResult{}, NewExitError(ExitIO, "%v", err)
	}
	return askSettleFlow(ctx, engine, channel, channelConfig, pending, opts)
}

// askSettleFlow is what every ask does once the question is registered and the
// channel is open: return the id without waiting (--async), or block until one
// of the two surfaces settles it.
func askSettleFlow(
	ctx context.Context,
	engine *operator.Engine,
	channel operator.Channel,
	channelConfig operator.ChannelConfig,
	pending operator.Pending,
	opts askOptions,
) (askResult, error) {
	registered := askResult{ID: pending.ID, TickID: pending.TickID}

	if opts.Async {
		if err := askDeliverNow(ctx, engine, channel, channelConfig, pending); err != nil {
			return registered, err
		}
		return registered, nil
	}

	applied, wasConsumer, err := askAwait(ctx, engine, channel, channelConfig, pending, opts)
	if err != nil {
		registered.consumer = wasConsumer
		return registered, err
	}

	res := askResultFrom(applied)
	res.ID, res.TickID, res.consumer = pending.ID, pending.TickID, wasConsumer
	return res, nil
}

// askChannel opens the configured operator channel, reporting a nil channel
// when none is configured.
//
// A missing channel is not an error here: it is degraded mode, and only the
// caller knows whether that is fatal (a blocking ask has nobody to ask) or
// merely lossy (a collect can still drain answers into tick state).
func askChannel() (operator.Channel, operator.ChannelConfig, error) {
	if factoryOperatorEnvConfigured() {
		remote, configured, remoteErr := factoryOperatorChannel("")
		if remoteErr == nil && configured {
			return remote, operator.ChannelConfig{}, nil
		}
	}
	config, err := operator.LoadOperatorConfig()
	if err != nil {
		return nil, operator.ChannelConfig{}, NewExitError(ExitIO, "loading operator config: %v", err)
	}
	channelConfig, ok := config.Channel(channelTelegram)
	if !ok {
		remote, configured, remoteErr := factoryOperatorChannel("")
		if remoteErr == nil && configured {
			return remote, operator.ChannelConfig{}, nil
		}
		return nil, operator.ChannelConfig{}, nil
	}
	channel, err := telegram.NewChannel(channelConfig)
	if err != nil {
		return nil, channelConfig, NewExitError(ExitGeneric, "opening the %s channel: %v", channelTelegram, err)
	}
	return channel, channelConfig, nil
}

// askDeliverNow posts questions whose escalation window has passed and returns.
//
// Delivery belongs to the elected consumer, so an async run only does it when
// nobody else holds the role. When someone does, this is a no-op on purpose:
// their next sweep picks the entry up, and opening a second transport to race
// them would be how one question reaches the operator twice.
func askDeliverNow(
	ctx context.Context,
	engine *operator.Engine,
	channel operator.Channel,
	channelConfig operator.ChannelConfig,
	pending operator.Pending,
) error {
	lock, err := engine.Pending().AcquireConsumer()
	if err != nil {
		if errors.Is(err, operator.ErrConsumerBusy) {
			return nil
		}
		return NewExitError(ExitIO, "%v", err)
	}
	defer func() { _ = lock.Release() }()

	consumer := operator.NewConsumer(engine.Pending(), channel)
	consumer.TelegramUserID = channelConfig.UserID

	deliverCtx, cancel := context.WithTimeout(ctx, askSettleTimeout)
	defer cancel()
	if err := consumer.Deliver(deliverCtx); err != nil {
		if _, ok := isFactoryChannel(channel); ok {
			return askParkedError(pending)
		}
		return NewExitError(ExitGeneric, "delivering to the %s channel: %v", channelTelegram, err)
	}
	return nil
}

// askConsumer starts this run's attempt at the repository's single channel poll
// loop and returns a stop function: it waits for the loop to exit and reports
// whether this run held the consumer role.
//
// Losing the election is the normal case, not a failure: the winner delivers
// this run's questions too and writes the resolutions it is waiting for.
// Opening a second Events stream would fight it for the operator's updates. A
// fatal channel failure cancels the run, because an answer can no longer
// arrive on a dead channel.
func askConsumer(
	ctx context.Context,
	cancel context.CancelFunc,
	engine *operator.Engine,
	channel operator.Channel,
	telegramUserID string,
	interval time.Duration,
) func() (bool, error) {
	consumer := operator.NewConsumer(engine.Pending(), channel)
	consumer.TelegramUserID = telegramUserID
	consumer.Interval = interval

	done := make(chan error, 1)
	go func() {
		err := consumer.Run(ctx)
		if err != nil && !errors.Is(err, operator.ErrConsumerBusy) {
			cancel()
		}
		done <- err
	}()

	return func() (bool, error) {
		err := <-done
		switch {
		case err == nil:
			return true, nil
		case errors.Is(err, operator.ErrConsumerBusy):
			return false, nil
		default:
			return false, NewExitError(ExitGeneric, "the %s channel failed: %v", channelTelegram, err)
		}
	}
}

// askAwait runs the poll loop (or defers to whoever already does), blocks until
// the question is settled, and edits the channel message to match.
//
// It returns the applied resolution and whether this run held the consumer
// role. A timeout comes back as an [ExitTimeout] error AFTER the message has
// been settled — the operator's phone must not keep showing a live question
// nobody is listening to.
func askAwait(
	ctx context.Context,
	engine *operator.Engine,
	channel operator.Channel,
	channelConfig operator.ChannelConfig,
	pending operator.Pending,
	opts askOptions,
) (operator.Applied, bool, error) {
	runCtx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	// Exactly one process per repository talks to the transport.
	stop := askConsumer(runCtx, cancel, engine, channel, channelConfig.UserID, opts.PollInterval)

	// Await watches both surfaces and applies whatever settles the question —
	// including reporting an out-of-band resolution. Do not apply it again.
	applied, awaitErr := engine.Await(runCtx, pending.ID, opts.PollInterval)
	cancel()
	wasConsumer, consumerErr := stop()
	if consumerErr != nil {
		if _, ok := isFactoryChannel(channel); ok {
			return operator.Applied{}, wasConsumer, askParkedError(pending)
		}
		return operator.Applied{}, wasConsumer, consumerErr
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
			"no answer to %s within %s: %s is still awaiting %s, and question %s is still open — "+
				"tk answer %s <answer>, or a later run, can still settle it",
			pending.ID, opts.Timeout, applied.Pending.TickID, applied.Pending.Awaiting,
			pending.ID, applied.Pending.TickID)
	}
	return applied, wasConsumer, nil
}

// askParkedError is the degraded-mode contract shared by an absent channel and
// an optional factory surface that cannot currently deliver. Registration has
// already parked the tick before this is called, so the caller can safely leave
// the question open for tk answer or a later run.
func askParkedError(pending operator.Pending) error {
	return NewExitError(ExitNotFound,
		"operator channel %q is not configured: %s is parked awaiting %s with question %s — answer it on the tick (tk list --awaiting)",
		channelTelegram, pending.TickID, pending.Awaiting, pending.ID)
}

// askGiveUp reports how a question stood when the deadline expired.
//
// Giving up waiting is NOT a resolution: the entry is deliberately left
// unresolved, exactly as `--collect --wait` leaves the questions it timed out
// on. The run stopped listening; the question did not stop being a question, so
// a later `tk answer` — or a later run's consumer — can still settle it and
// have the answer reach the tick. Resolving it here would spend the one
// resolution the entry gets on "nobody was around", and the operator's eventual
// answer would then apply to nothing.
//
// An answer that landed while the deadline was firing wins — it is a real
// decision, and losing it to a race would be worse than waiting a moment
// longer.
func askGiveUp(engine *operator.Engine, id string, timeout time.Duration) (operator.Applied, bool, error) {
	entry, err := engine.Pending().Load(id)
	if err != nil {
		return operator.Applied{}, false, NewExitError(ExitIO, "reading the pending question %s: %v", id, err)
	}
	if entry.Resolved() {
		applied, err := engine.Apply(entry)
		if err != nil {
			return operator.Applied{}, false, NewExitError(ExitIO, "applying the resolution of %s: %v", id, err)
		}
		return applied, false, nil
	}
	// The outcome is for the channel message only — nothing is written to the
	// entry, so the question stays open on every surface.
	return operator.Applied{Pending: entry, Outcome: askTimeoutOutcome(timeout)}, true, nil
}

// askTimeoutOutcome is what the operator's phone shows when a run stops
// waiting: the question is settled as far as THIS run is concerned, and still
// open as far as the tick is concerned. Saying only "timed out" would read as
// "don't bother answering".
func askTimeoutOutcome(timeout time.Duration) operator.Outcome {
	return operator.Outcome{
		Status: operator.OutcomeTimedOut,
		Text:   fmt.Sprintf("No answer within %s — the run stopped waiting, but this question is still open", timeout),
	}
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
	if channel == nil || ref.IsZero() {
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

// askCollectOptions is one `tk ask --collect` run, resolved from the command
// line. Like [askOptions] it carries no cobra state, so tests can drive the
// flow directly.
type askCollectOptions struct {
	// Root is the repository root.
	Root string
	// Wait blocks on the questions that are still open, instead of skipping
	// them.
	Wait bool
	// Timeout bounds a waiting collect. Zero means [askDefaultTimeout].
	Timeout time.Duration
	// PollInterval overrides the wait/delivery cadence. Zero means the operator
	// package default; tests shorten it.
	PollInterval time.Duration
	// Out receives one JSON line per settled question.
	Out io.Writer
	// Stderr receives non-fatal warnings. Nil discards them.
	Stderr io.Writer
}

// askCollectFlow drains the repository's settled questions: it applies each
// resolution to its tick, settles the channel message, prints a JSON line, and
// removes the entry.
//
// It is the other half of --async, and the reason an entry is only deleted
// here: a question stays on disk — visible to `tk list --awaiting` and
// answerable from either surface — until somebody has actually taken delivery
// of the answer.
//
// The set of questions is snapshotted at the start, so a --wait run finishes
// when the questions that existed when it began are settled, rather than
// chasing new ones forever.
func askCollectFlow(ctx context.Context, opts askCollectOptions) error {
	if opts.Timeout <= 0 {
		opts.Timeout = askDefaultTimeout
	}
	out := opts.Out
	if out == nil {
		out = io.Discard
	}

	engine := operator.NewEngine(opts.Root)
	entries, err := engine.Pending().List()
	if err != nil {
		return NewExitError(ExitIO, "listing pending questions: %v", err)
	}

	// A missing channel costs the message edit, not the answer: collecting is
	// about draining resolutions into tick state, and a terminal answer needs
	// no transport at all.
	channel, channelConfig, err := askChannel()
	if err != nil {
		return err
	}

	runCtx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()
	stop := func() (bool, error) { return false, nil }
	if opts.Wait && channel != nil {
		stop = askConsumer(runCtx, cancel, engine, channel, channelConfig.UserID, opts.PollInterval)
	}

	encoder := json.NewEncoder(out)
	var open []string
	for _, entry := range entries {
		applied, settled, err := askCollectOne(runCtx, engine, entry, opts)
		if err != nil {
			cancel()
			_, _ = stop()
			return err
		}
		if !settled {
			open = append(open, entry.ID)
			continue
		}
		askSettle(ctx, channel, applied, opts.Stderr)
		if err := encoder.Encode(askCollectedFrom(applied)); err != nil {
			cancel()
			_, _ = stop()
			return NewExitError(ExitIO, "printing the answer to %s: %v", entry.ID, err)
		}
		if err := engine.Pending().Delete(entry.ID); err != nil {
			cancel()
			_, _ = stop()
			return NewExitError(ExitIO, "draining %s: %v", entry.ID, err)
		}
	}
	cancel()
	if _, err := stop(); err != nil {
		return err
	}

	if opts.Wait && len(open) > 0 {
		return NewExitError(ExitTimeout,
			"no answer within %s to %d question(s): %s — still pending and still answerable",
			opts.Timeout, len(open), strings.Join(open, ", "))
	}
	return nil
}

// askCollectOne settles one entry, reporting false when it is still open (or
// the wait ran out). A --wait run blocks on it; a plain collect skips it.
func askCollectOne(ctx context.Context, engine *operator.Engine, entry operator.Pending, opts askCollectOptions) (operator.Applied, bool, error) {
	if opts.Wait {
		applied, err := engine.Await(ctx, entry.ID, opts.PollInterval)
		switch {
		case err == nil:
			return applied, true, nil
		case errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled):
			return operator.Applied{}, false, nil
		case errors.Is(err, operator.ErrPendingNotFound):
			// Somebody else drained it while we waited.
			return operator.Applied{}, false, nil
		default:
			return operator.Applied{}, false,
				NewExitError(ExitGeneric, "waiting for an answer to %s: %v", entry.ID, err)
		}
	}

	fresh, err := engine.Pending().Load(entry.ID)
	if err != nil {
		if errors.Is(err, operator.ErrPendingNotFound) {
			return operator.Applied{}, false, nil
		}
		return operator.Applied{}, false, NewExitError(ExitIO, "reading pending question %s: %v", entry.ID, err)
	}
	if !fresh.Resolved() {
		return operator.Applied{}, false, nil
	}
	applied, err := engine.Apply(fresh)
	if err != nil {
		return operator.Applied{}, false, NewExitError(ExitIO, "applying the resolution of %s: %v", entry.ID, err)
	}
	return applied, true, nil
}

func askCollectedFrom(applied operator.Applied) askCollected {
	res := askResultFrom(applied)
	return askCollected{
		ID:             applied.Pending.ID,
		TickID:         applied.Pending.TickID,
		Question:       applied.Pending.Question.Text,
		Status:         string(applied.Outcome.Status),
		Answer:         res.Answer,
		OptionIDs:      res.OptionIDs,
		ResolvedBy:     res.ResolvedBy,
		TelegramUserID: res.TelegramUserID,
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
//
// fallback is the text to ask when --question is omitted: a photo gate's caption
// is what the operator actually reads under the picture, so repeating it in
// --question just to satisfy this would be ceremony. It is ignored under --json,
// where the question is the document's business.
func askQuestionFrom(cmd *cobra.Command, gate bool, fallback string) (operator.Question, error) {
	text := strings.TrimSpace(askQuestion)

	if !askJSON {
		if text == "" {
			text = strings.TrimSpace(fallback)
		}
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

	// Every shape in the spec is delivered as asked: a multi-select becomes a
	// toggle keyboard committed with Done, and allow_other adds a button that
	// asks for free text and resolves this same question.
	return operator.Question{
		Text:        strings.TrimSpace(spec.Question),
		Header:      strings.TrimSpace(spec.Header),
		Options:     askSpecOptions(spec.Options),
		MultiSelect: spec.Multi,
		AllowOther:  spec.AllowOther,
	}, nil
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
