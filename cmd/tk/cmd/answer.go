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
// It goes through [operator.Engine] — the same `[human]` note, the same
// verdict handling — that anything else resolving a pending entry uses, so
// `tk ask`, `tk answer` and the dashboard cannot drift into three slightly
// different versions of the same rule. A run blocked on
// [operator.Engine.Await] sees the answer through the pending store and stops
// waiting.
var answerCmd = &cobra.Command{
	Use:   "answer <id> <answer...>",
	Short: "Answer a question parked on a tick by tk ask",
	Long: `Answer the question ` + "`tk ask`" + ` parked on a tick, from the terminal.

The answer becomes a
` + "`[human]`" + ` note on the tick (or a verdict, for a --gate approve question), and
the tick stops awaiting. A run blocked on the pending entry (` + "`tk ask --collect --wait`" + `,
or an agent relayed through ` + "`tk herd wait`" + `) sees the answer and stops waiting.

For a question with options, give an option label or its id; matching is
case-insensitive. A multi-select question takes several of them. Anything else
is the free-text answer, which is what a question with no options expects (and
what an "other" answer is on a question that allows one).

The question answered is the oldest one still open on the tick. An
orchestrator/pane relay is instead answered by the question id printed by
` + "`tk herd wait`" + `. Find tick questions with ` + "`tk list --awaiting`" + `, or
the entries under .tick/pending.

Answering a --gate approve question is a verdict, so it carries the same
provenance rule as ` + "`tk approve`" + `: when TK_ACTOR is runner-shaped (the mandated
<runner>:orchestrator form) the answer is refused unless --from human attests
that a human made the call. A plain question is a note, not a verdict, and
needs no attestation.

Examples:
  tk answer abc123 eu-west-1
  tk answer abc123 "Deep Green"
  tk answer abc123 deep-green
  tk answer abc123 eu us          # a multi-select question
  tk answer abc123 approve        # an approval gate
  tk answer q4d2e8a1 Continue      # an orchestrator/pane relay question
  tk answer abc123 approve --from human   # a runner relaying a human decision

Exit codes:
  0  answered
  2  usage error (an option the question does not offer, or a runner answering
     a gate without --from human)
  3  not in a git repository
  4  no question is parked on that tick, or it is already answered`,
	Args:          cobra.MinimumNArgs(2),
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runAnswer,
}

var answerFrom string

func init() {
	answerCmd.Flags().StringVar(&answerFrom, "from", "", "provenance of a gate answer: human (a runner relaying a human decision)")

	rootCmd.AddCommand(answerCmd)
}

func runAnswer(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return answerError(cmd, NewExitError(ExitNoRepo, "failed to detect repo root: %v", err))
	}

	engine := operator.NewEngine(root)
	pending, agentRelay, err := answerAgentTarget(engine, args[0])
	if err != nil {
		return answerError(cmd, err)
	}
	tickID := args[0]
	if !agentRelay {
		project, projectErr := github.DetectProject(nil)
		if projectErr != nil {
			return answerError(cmd, NewExitError(ExitGitHub, "failed to detect project: %v", projectErr))
		}
		tickID, err = github.NormalizeID(project, args[0])
		if err != nil {
			return answerError(cmd, NewExitError(ExitNotFound, "invalid id: %v", err))
		}
		pending, err = answerTarget(engine, tickID)
		if err != nil {
			return answerError(cmd, err)
		}
	}

	// A gate answer IS a verdict, so it goes through the same guard as
	// `tk approve` — and before anything is written, so a refused answer leaves
	// the gate exactly as it found it. See verdictguard.go. The engine already
	// stamps the write "human"; this decides whether the write may happen.
	if pending.Kind == operator.PendingGate {
		if _, err := resolveVerdictActor(answerFrom, ""); err != nil {
			return answerError(cmd, err)
		}
	} else if answerFrom != "" {
		return answerError(cmd, NewExitError(ExitUsage,
			"--from applies to an approval gate (a plain answer is a note, not a verdict)"))
	}

	outcome, err := answerOutcome(pending.Question, args[1:])
	if err != nil {
		return answerError(cmd, err)
	}

	resolved, err := engine.Pending().Resolve(pending.ID, operator.PendingResolution{
		Outcome:    outcome,
		AnsweredBy: operator.AnsweredByTerminal,
		AnsweredAt: time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, operator.ErrAlreadyResolved) {
			return answerError(cmd, NewExitError(ExitNotFound,
				"question %s on %s was already answered: %s", pending.ID, answerSubject(pending, tickID), answerSummary(resolved)))
		}
		return answerError(cmd, NewExitError(ExitIO, "recording the answer to %s: %v", pending.ID, err))
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		return answerError(cmd, NewExitError(ExitIO, "applying the answer to %s: %v", pending.ID, err))
	}

	out := cmd.OutOrStdout()
	if agentRelay {
		fmt.Fprintf(out, "answered agent relay %s (%s): %s\n", pending.AgentTarget, pending.ID, outcome.Text)
		return nil
	}
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

func answerSubject(pending operator.Pending, tickID string) string {
	if pending.Kind == operator.PendingAgentRelay {
		return pending.AgentTarget
	}
	return tickID
}

// answerAgentTarget resolves the explicit question id printed for an
// orchestrator relay. It is checked before GitHub project detection because an
// agent relay is repository-local and does not need a tick/global id.
func answerAgentTarget(engine *operator.Engine, id string) (operator.Pending, bool, error) {
	entries, err := engine.Pending().List()
	if err != nil {
		return operator.Pending{}, false, NewExitError(ExitIO, "listing pending questions: %v", err)
	}
	for _, entry := range entries {
		if entry.Kind == operator.PendingAgentRelay && entry.ID == id {
			return entry, true, nil
		}
	}
	return operator.Pending{}, false, nil
}

// answerTarget picks the question this command settles: the oldest one still
// open on the tick. Agent-scoped relay questions are selected by their
// question id in [answerAgentTarget] above.
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
