package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// tk decisions renders the Decisions-taken table: every `decision:` note line
// in scope, parsed back into question/choice/reason/class. It is the read half
// of tk decide, and the table the retro report, checkpoint report and PR body
// carry so the human reviews decisions by exception.

var decisionsCmd = &cobra.Command{
	Use:   "decisions [container-id]",
	Short: "List decisions recorded with tk decide (the Decisions-taken table)",
	Long: `List the provisional decisions recorded on ticks with tk decide.

With a container id (an epic or project), lists decisions on the container and
every descendant. Without one, lists decisions across all ticks.

Closed ticks are included: a decision does not stop mattering when its tick
closes — the table exists precisely so a human can review the run's judgment
calls after the fact.

Examples:
  tk decisions              # every recorded decision
  tk decisions abc          # decisions in epic/project abc's subtree
  tk decisions abc --json   # machine-readable, for report generation`,
	Args: cobra.MaximumNArgs(1),
	RunE: runDecisions,
}

var decisionsJSON bool

func init() {
	decisionsCmd.Flags().BoolVar(&decisionsJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(decisionsCmd)
}

// decisionEntry is one parsed decision line.
type decisionEntry struct {
	TickID    string `json:"tick_id"`
	TickTitle string `json:"tick_title"`
	At        string `json:"at"` // "2006-01-02 15:04", as recorded in the note
	Question  string `json:"question,omitempty"`
	Choice    string `json:"choice,omitempty"`
	Reason    string `json:"reason,omitempty"`
	Class     string `json:"class,omitempty"`
	// Raw is the full decision body after "decision: ", kept verbatim so a
	// line whose free text confuses the separator parse loses nothing.
	Raw string `json:"raw"`
}

type decisionsOutput struct {
	Decisions []decisionEntry `json:"decisions"`
}

// decisionLineRe matches a decision note line as tk decide writes it (and as
// the hand-written `tk note <id> "decision: …"` convention produces). The
// optional [human] marker keeps a manually relayed human decision parseable.
var decisionLineRe = regexp.MustCompile(`^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) - (?:\[human\] )?decision: (.+)$`)

// classSuffixRe extracts the trailing [class:<class>] marker.
var classSuffixRe = regexp.MustCompile(`\s*\[class:([^\[\]]+)\]\s*$`)

// parseDecisionBody splits a decision body into question/choice/reason/class.
// It is best-effort: the separators are the ones formatDecisionLine writes,
// and a body that lacks them keeps everything in Raw with the structured
// fields empty rather than being dropped.
func parseDecisionBody(body string) (question, choice, reason, class string) {
	if m := classSuffixRe.FindStringSubmatch(body); m != nil {
		class = strings.TrimSpace(m[1])
		body = strings.TrimSpace(classSuffixRe.ReplaceAllString(body, ""))
	}
	q, rest, ok := strings.Cut(body, " → ")
	if !ok {
		return "", "", "", class
	}
	question = strings.TrimSpace(q)
	c, r, ok := strings.Cut(rest, " — ")
	if !ok {
		return question, strings.TrimSpace(rest), "", class
	}
	return question, strings.TrimSpace(c), strings.TrimSpace(r), class
}

// decisionsFromNotes extracts every decision line from one tick's notes.
func decisionsFromNotes(t tick.Tick) []decisionEntry {
	var out []decisionEntry
	for _, line := range strings.Split(t.Notes, "\n") {
		m := decisionLineRe.FindStringSubmatch(strings.TrimRight(line, "\r"))
		if m == nil {
			continue
		}
		body := m[2]
		question, choice, reason, class := parseDecisionBody(body)
		out = append(out, decisionEntry{
			TickID:    t.ID,
			TickTitle: t.Title,
			At:        m[1],
			Question:  question,
			Choice:    choice,
			Reason:    reason,
			Class:     class,
			Raw:       body,
		})
	}
	return out
}

// subtreeIDs returns rootID and every descendant id, walking Parent edges over
// the full tick universe.
func subtreeIDs(rootID string, all []tick.Tick) map[string]bool {
	in := map[string]bool{rootID: true}
	// Ticks are a forest; iterate until the frontier stops growing rather than
	// assuming any parent-before-child ordering in the slice.
	for {
		grew := false
		for _, t := range all {
			if t.Parent != "" && in[t.Parent] && !in[t.ID] {
				in[t.ID] = true
				grew = true
			}
		}
		if !grew {
			return in
		}
	}
}

func runDecisions(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	all, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	var scope map[string]bool
	if len(args) > 0 {
		project, err := github.DetectProject(nil)
		if err != nil {
			return fmt.Errorf("failed to detect project: %w", err)
		}
		containerID, err := github.NormalizeID(project, args[0])
		if err != nil {
			return fmt.Errorf("invalid id: %w", err)
		}
		if _, err := store.Read(containerID); err != nil {
			return notFoundIfMissing("failed to read container", err)
		}
		scope = subtreeIDs(containerID, all)
	}

	var entries []decisionEntry
	for _, t := range all {
		if scope != nil && !scope[t.ID] {
			continue
		}
		entries = append(entries, decisionsFromNotes(t)...)
	}

	// Chronological, then by tick for a stable order within one minute.
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].At != entries[j].At {
			return entries[i].At < entries[j].At
		}
		return entries[i].TickID < entries[j].TickID
	})

	if decisionsJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(decisionsOutput{Decisions: entries}); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	if len(entries) == 0 {
		fmt.Println("No decisions recorded")
		return nil
	}
	for _, e := range entries {
		// Raw carries the full body verbatim, class suffix included.
		fmt.Printf("%s  %s  %s\n", e.TickID, e.At, e.Raw)
	}
	fmt.Printf("\n%d decision(s)\n", len(entries))
	return nil
}
