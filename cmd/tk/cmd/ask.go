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
)

// `tk ask` parks a question on a tick so it can be answered from the
// terminal — `tk approve` / `tk reject` for a gate, or `tk answer` for a
// plain question.
//
// Everything that turns an answer into tick state (the `[human]` note, the
// cleared awaiting, a gate's verdict and its activity entry) belongs to
// [operator.Engine]. This command only decides what to ask and what to print;
// reimplementing any of the resolution rules here is how `tk ask`, `tk
// answer` and the dashboard drift apart.
const (
	// askDefaultTimeout is how long `tk ask --collect --wait` waits for an
	// answer before giving up and leaving the question parked.
	askDefaultTimeout = 10 * time.Minute

	// askGateApprove is the --gate value that turns the question into an
	// approval gate: approve/reject buttons, and an answer that is a verdict.
	askGateApprove = "approve"
	// askGateNone is the default --gate value: the answer is a note.
	askGateNone = "none"

	// Values of the resolved_by field in --json output. They name the SURFACE
	// the answer came from: "telegram" is an external bridge that resolved
	// the entry directly, "terminal" is anything local — `tk answer`, `tk
	// approve`/`tk reject`, the dashboard.
	askResolvedTelegram = "telegram"
	askResolvedTerminal = "terminal"

	// askOptionIDMaxLen caps a generated option id. Ids derived from labels
	// stay readable in JSON output and short enough for transports that carry
	// identifiers in interactive controls.
	askOptionIDMaxLen = 32
)

var askCmd = &cobra.Command{
	Use:   "ask <id>",
	Short: "Park a question on a tick for the operator to answer",
	Long: `Park a question on a tick, for the operator to answer from the terminal.

The question is registered on the tick and left there for a human to find —
` + "`tk list --awaiting`" + ` surfaces it — and answered with ` + "`tk approve`" + ` /
` + "`tk reject`" + ` (--gate approve) or ` + "`tk answer`" + ` (a plain question). The answer
becomes a note on the tick (` + "`--from human`" + `), or a verdict with --gate approve.

The question comes from --question, or from stdin as JSON with --json:

  {"question": "Which region?",
   "header":   "Deploy",
   "options":  [{"label": "eu-west-1", "description": "Ireland"},
                {"label": "us-east-1"}],
   "multi": false, "allow_other": false}

Option ids are derived from the labels ("Deep Green" -> "deep-green") unless the
option carries an explicit "id".

Not blocking:
  --async            register the question, print its id, and return
  --collect          print every settled question as a JSON line and drain it
  --collect --wait   also block on the questions still open
  --escalate-after   record a delayed-escalation window on the entry; local
                     surfaces (tk answer, the dashboard) see the question
                     immediately regardless

Output:
  --async    the question id, and nothing else, on stdout
  --json     {"id", "tick_id", "answer", "option_ids",
              "resolved_by": telegram|terminal, "telegram_user_id"}
  --collect  one JSON object per line, in the order the questions were asked

Examples:
  tk ask abc123 --question "Which region should this deploy to?"
  tk ask abc123 --question "Ship it?" --gate approve
  tk ask abc123 --question "Which region?" --async --escalate-after 5m
  tk ask --collect --wait --timeout 30m
  echo '{"question":"Pick one","options":[{"label":"A"},{"label":"B"}]}' | tk ask abc123 --json

Exit codes:
  0  registered (--async), or every --collect question settled
  2  usage error
  3  not in a git repository
  4  exit code 4: the question is parked but nobody is waiting for it in this
     process — a plain (non-async) ask never blocks; answer it with tk answer,
     or drain it later with tk ask --collect [--wait]
  5  project detection failed (the origin remote could not be read)
  7  exit code 7: --collect --wait timed out. Giving up waiting is not an
     answer: the tick stays awaiting and the question is left OPEN on disk, so
     a later tk answer — or a later run — still settles it.`,
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
)

func init() {
	askCmd.Flags().StringVar(&askQuestion, "question", "", "the question to ask the operator")
	askCmd.Flags().BoolVar(&askJSON, "json", false, "read the question from stdin as JSON and print the answer as JSON")
	askCmd.Flags().DurationVar(&askTimeout, "timeout", askDefaultTimeout, "with --collect --wait: how long to wait for an answer before giving up (exit 7; the question stays open)")
	askCmd.Flags().StringVar(&askGate, "gate", askGateNone, "gate kind: approve (verdict, approve/reject buttons) or none")
	askCmd.Flags().BoolVar(&askAsync, "async", false, "register the question, print its id, and return without erroring")
	askCmd.Flags().BoolVar(&askCollect, "collect", false, "print settled questions as JSON lines and drain them (takes no tick id)")
	askCmd.Flags().BoolVar(&askWait, "wait", false, "with --collect: also block on the questions still open")
	askCmd.Flags().DurationVar(&askEscalateAfter, "escalate-after", 0, "record a delayed-escalation window on the entry; local surfaces see the question at once")

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
	// Async registers the question and returns without erroring.
	Async bool
	// NotBefore records a delayed-escalation window on the entry
	// (--escalate-after). Local surfaces see the parked question immediately
	// regardless.
	NotBefore time.Time
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
		}); err != nil {
			return askError(cmd, err)
		}
		return nil
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

	var notBefore time.Time
	if askEscalateAfter > 0 {
		notBefore = time.Now().Add(askEscalateAfter)
	}

	res, err := askFlow(commandContext(cmd), askOptions{
		Root:      root,
		TickID:    id,
		Question:  question,
		Gate:      gate,
		Async:     askAsync,
		NotBefore: notBefore,
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
	fmt.Fprintln(cmd.OutOrStdout(), res.ID)
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
		}
		return nil
	}
	if askWait {
		return NewExitError(ExitUsage, "--wait applies to --collect only")
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

// askFlow registers the question and reports where it landed.
//
// Registration parks the tick and writes the pending entry FIRST: an ask is
// answerable from the terminal (or by whatever else resolves the pending
// entry) the moment it lands on disk, regardless of what this call returns.
//
// A plain ask reports [askParkedError] (exit 4): it never blocks waiting for
// an answer — the terminal and `tk ask --collect [--wait]` are what settle a
// parked question. --async reports success instead, since printing the id for
// a later `tk ask --collect` is the whole point of not waiting.
func askFlow(ctx context.Context, opts askOptions) (askResult, error) {
	engine := operator.NewEngine(opts.Root)
	if _, err := engine.Ticks().Read(opts.TickID); err != nil {
		return askResult{}, NewExitError(ExitNotFound, "failed to read tick: %v", err)
	}

	kind := operator.PendingAsk
	if opts.Gate {
		kind = operator.PendingGate
	}
	pending, err := engine.Register(operator.Registration{
		TickID:    opts.TickID,
		Kind:      kind,
		Question:  opts.Question,
		NotBefore: opts.NotBefore,
	})
	if err != nil {
		return askResult{}, NewExitError(ExitIO, "%v", err)
	}

	registered := askResult{ID: pending.ID, TickID: pending.TickID}
	if opts.Async {
		return registered, nil
	}
	return registered, askParkedError(pending)
}

// askParkedError reports that a question is durably parked but this process
// is not waiting on it: answer it with tk answer, or drain it with
// tk ask --collect [--wait].
func askParkedError(pending operator.Pending) error {
	return NewExitError(ExitNotFound,
		"%s is parked awaiting %s with question %s — answer it (tk answer %s <answer>, or tk approve/reject %s), "+
			"or drain it later with tk ask --collect",
		pending.TickID, pending.Awaiting, pending.ID, pending.TickID, pending.TickID)
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
	// PollInterval overrides the wait cadence. Zero means the operator
	// package default; tests shorten it.
	PollInterval time.Duration
	// Out receives one JSON line per settled question.
	Out io.Writer
}

// askCollectFlow drains the repository's settled questions: it applies each
// resolution to its tick, prints a JSON line, and removes the entry.
//
// It is the other half of --async, and the reason an entry is only deleted
// here: a question stays on disk — visible to `tk list --awaiting` and
// answerable from the terminal — until somebody has actually taken delivery
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

	runCtx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	encoder := json.NewEncoder(out)
	var open []string
	for _, entry := range entries {
		applied, settled, err := askCollectOne(runCtx, engine, entry, opts)
		if err != nil {
			cancel()
			return err
		}
		if !settled {
			open = append(open, entry.ID)
			continue
		}
		if err := encoder.Encode(askCollectedFrom(applied)); err != nil {
			cancel()
			return NewExitError(ExitIO, "printing the answer to %s: %v", entry.ID, err)
		}
		if err := engine.Pending().Delete(entry.ID); err != nil {
			cancel()
			return NewExitError(ExitIO, "draining %s: %v", entry.ID, err)
		}
	}
	cancel()

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
	// Anything answered by an external bridge is reported as telegram;
	// everything else — tk approve/reject, tk answer, the tick moving on
	// underneath the question — is a local surface.
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
