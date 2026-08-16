package cmd

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/operator"
)

// `tk answer` is the terminal half of what `tk ask` parks.
//
// It exists so the local surface is not second-class: the same question can be
// settled from the phone or from a terminal, and both go through
// [operator.Engine] — the same `[human]` note, the same verdict handling, the
// same edit to the delivered channel message. A run blocked in `tk ask` sees
// the answer through the pending store and stops waiting.
var answerCmd = &cobra.Command{
	Use:   "answer <id> <answer...>",
	Short: "Answer a question parked on a tick by tk ask",
	Long: `Answer the question ` + "`tk ask`" + ` parked on a tick, from the terminal.

This is the local twin of answering on the phone. The answer becomes a
` + "`[human]`" + ` note on the tick (or a verdict, for a --gate approve question), the
tick stops awaiting, and the message delivered to the operator channel is
edited to show what was decided — exactly as a button press would leave it. A
run blocked in ` + "`tk ask`" + ` stops waiting and reports the answer.

For a question with options, give an option label or its id; matching is
case-insensitive. A multi-select question takes several of them. Anything else
is the free-text answer, which is what a question with no options expects (and
what an "other" answer is on a question that allows one).

The question answered is the oldest one still open on the tick. Find them with
` + "`tk list --awaiting`" + `, or the entries under .tick/pending.

Examples:
  tk answer abc123 eu-west-1
  tk answer abc123 "Deep Green"
  tk answer abc123 deep-green
  tk answer abc123 eu us          # a multi-select question
  tk answer abc123 approve        # an approval gate

Exit codes:
  0  answered
  2  usage error (an option the question does not offer)
  3  not in a git repository
  4  no question is parked on that tick, or it is already answered`,
	Args:          cobra.MinimumNArgs(2),
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runAnswer,
}

func init() {
	rootCmd.AddCommand(answerCmd)
}

func runAnswer(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return answerError(cmd, NewExitError(ExitNoRepo, "failed to detect repo root: %v", err))
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		return answerError(cmd, NewExitError(ExitGitHub, "failed to detect project: %v", err))
	}
	tickID, err := github.NormalizeID(project, args[0])
	if err != nil {
		return answerError(cmd, NewExitError(ExitNotFound, "invalid id: %v", err))
	}

	engine := operator.NewEngine(root)
	pending, err := answerTarget(engine, tickID)
	if err != nil {
		return answerError(cmd, err)
	}

	outcome, err := answerOutcome(pending.Question, args[1:])
	if err != nil {
		return answerError(cmd, err)
	}

	// Resolve first, apply second — the same order the channel consumer uses,
	// so whichever surface gets there first owns the answer and the other one
	// loses cleanly instead of writing a second note.
	resolved, err := engine.Pending().Resolve(pending.ID, operator.PendingResolution{
		Outcome:    outcome,
		AnsweredBy: operator.AnsweredByTerminal,
		AnsweredAt: time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, operator.ErrAlreadyResolved) {
			return answerError(cmd, NewExitError(ExitNotFound,
				"question %s on %s was already answered: %s", pending.ID, tickID, answerSummary(resolved)))
		}
		return answerError(cmd, NewExitError(ExitIO, "recording the answer to %s: %v", pending.ID, err))
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		return answerError(cmd, NewExitError(ExitIO, "applying the answer to %s: %v", pending.ID, err))
	}

	// The channel message is edited on the same terms as a phone answer. A
	// missing channel is not a failure: the answer is already in tick state.
	channel, _, channelErr := askChannel()
	if channelErr == nil {
		askSettle(commandContext(cmd), channel, applied, cmd.ErrOrStderr())
	} else {
		fmt.Fprintf(cmd.ErrOrStderr(), "warning: %s answered, but its %s message was not updated: %v\n",
			tickID, channelTelegram, channelErr)
	}

	out := cmd.OutOrStdout()
	switch {
	case applied.OutOfBand:
		fmt.Fprintf(out, "answered %s (%s), but the tick had already moved on — nothing changed on it\n",
			tickID, pending.ID)
	case applied.AlreadyApplied:
		fmt.Fprintf(out, "answered %s (%s): %s\n", tickID, pending.ID, outcome.Text)
	case applied.Closed:
		fmt.Fprintf(out, "answered %s (%s): %s (closed)\n", tickID, pending.ID, outcome.Text)
	default:
		fmt.Fprintf(out, "answered %s (%s): %s\n", tickID, pending.ID, outcome.Text)
	}
	return nil
}

// answerTarget picks the question this command settles: the oldest one still
// open on the tick.
//
// Oldest-first matters when a run parked more than one question: answering the
// newest would leave the older one stranded behind a tick that is no longer
// awaiting, which is the state the engine reads as out of band.
func answerTarget(engine *operator.Engine, tickID string) (operator.Pending, error) {
	entries, err := engine.Pending().List()
	if err != nil {
		return operator.Pending{}, NewExitError(ExitIO, "listing pending questions: %v", err)
	}
	answered := 0
	for _, entry := range entries {
		if entry.TickID != tickID {
			continue
		}
		if entry.Resolved() {
			answered++
			continue
		}
		return entry, nil
	}
	if answered > 0 {
		return operator.Pending{}, NewExitError(ExitNotFound,
			"every question on %s is already answered (run tk ask --collect to drain them)", tickID)
	}
	return operator.Pending{}, NewExitError(ExitNotFound,
		"no question is parked on %s (tk list --awaiting shows what is waiting)", tickID)
}

// answerOutcome turns the words a human typed into the outcome the engine
// applies.
//
// An option question is answered by label or id — that is what the operator can
// see, and what a script read out of `tk ask --json`. A typo must NOT quietly
// become a free-text answer to a question that only offers buttons; it is a
// usage error naming the options. Free text is accepted where the question
// actually allows it: no options at all, or allow_other.
func answerOutcome(q operator.Question, words []string) (operator.Outcome, error) {
	text := strings.TrimSpace(strings.Join(words, " "))
	if text == "" {
		return operator.Outcome{}, NewExitError(ExitUsage, "answer needs an answer: tk answer <id> <answer...>")
	}
	if len(q.Options) == 0 {
		return operator.Outcome{Status: operator.OutcomeAnswered, Text: text}, nil
	}

	// The whole answer as one option first: a label may contain spaces.
	if opt, ok := answerMatchOption(q, text); ok {
		return operator.Outcome{Status: operator.OutcomeAnswered, Text: opt.Label, OptionIDs: []string{opt.ID}}, nil
	}
	if len(words) > 1 && q.MultiSelect {
		ids := make([]string, 0, len(words))
		labels := make([]string, 0, len(words))
		for _, word := range words {
			opt, ok := answerMatchOption(q, word)
			if !ok {
				ids = nil
				break
			}
			ids = append(ids, opt.ID)
			labels = append(labels, opt.Label)
		}
		if len(ids) > 0 {
			return operator.Outcome{
				Status:    operator.OutcomeAnswered,
				Text:      strings.Join(labels, ", "),
				OptionIDs: ids,
			}, nil
		}
	}
	if q.AllowOther {
		return operator.Outcome{Status: operator.OutcomeAnswered, Text: text}, nil
	}
	return operator.Outcome{}, NewExitError(ExitUsage,
		"%q is not one of the options: %s", text, answerOptionList(q))
}

// answerMatchOption resolves one word (or the whole answer) to an option by id
// or label, case-insensitively.
func answerMatchOption(q operator.Question, text string) (operator.Option, bool) {
	want := strings.ToLower(strings.TrimSpace(text))
	for _, opt := range q.Options {
		if strings.ToLower(opt.ID) == want || strings.ToLower(opt.Label) == want {
			return opt, true
		}
	}
	return operator.Option{}, false
}

// answerOptionList renders the offered options for an error message, naming
// both what the operator sees and what a script would pass.
func answerOptionList(q operator.Question) string {
	parts := make([]string, 0, len(q.Options))
	for _, opt := range q.Options {
		if opt.Label != "" && !strings.EqualFold(opt.Label, opt.ID) {
			parts = append(parts, fmt.Sprintf("%s (%s)", opt.Label, opt.ID))
			continue
		}
		parts = append(parts, opt.ID)
	}
	return strings.Join(parts, ", ")
}

// answerSummary describes how a question already ended, for the error a second
// answer gets.
func answerSummary(p operator.Pending) string {
	if p.Resolution == nil {
		return "unknown"
	}
	text := strings.TrimSpace(p.Resolution.Outcome.Text)
	if text == "" {
		text = string(p.Resolution.Outcome.Status)
	}
	return fmt.Sprintf("%s (via %s)", text, p.Resolution.AnsweredBy)
}

// answerError keeps the legacy entry point useful: cmd/tk/main.go receives only
// the typed exit code from ExecuteArgs, so the command must emit its own
// actionable error line.
func answerError(cmd *cobra.Command, err error) error {
	fmt.Fprintln(cmd.ErrOrStderr(), err)
	return err
}
