package collect

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// The collect vocabulary has THREE implementations (tick hn1).
//
// This package is one; internal/cloud/collect is the second, reading a remote
// branch from the laptop; cloud/factory/src/worker-collect.ts is the third,
// reading the same remote from the Worker. The first two were the SAME TYPE by
// import until epic 3j4 stopped the cloud path importing ticks internals, so
// drift between them used to be impossible by construction. They are copies now.
//
// The failure that creates is silent and it INVERTS A VERDICT: re-spell
// NEEDS_CONTEXT or ready-to-merge in one place and a cloud run and a herd run
// disagree about what happened to the same tick, with nothing failing anywhere.
// So all three read contracts/collect-vocabulary.json and a one-sided edit
// fails a build. The file's own `why` explains what it pins and why the status
// regexp — not just the constants — is part of the contract.
const collectVocabularyFile = "../../../contracts/collect-vocabulary.json"

type collectVocabulary struct {
	Verdicts struct {
		ReadyToMerge      string `json:"ready_to_merge"`
		NoCommits         string `json:"no_commits"`
		MissingResult     string `json:"missing_result"`
		BoundaryViolation string `json:"boundary_violation"`
	} `json:"verdicts"`
	RemoteOnlyVerdicts struct {
		Unknown string `json:"unknown"`
	} `json:"remote_only_verdicts"`
	Statuses struct {
		Done             string `json:"done"`
		DoneWithConcerns string `json:"done_with_concerns"`
		NeedsContext     string `json:"needs_context"`
		Blocked          string `json:"blocked"`
	} `json:"statuses"`
	NeedsHumanStatuses struct {
		Statuses []string `json:"statuses"`
	} `json:"needs_human_statuses"`
	StatusLinePattern struct {
		Pattern string `json:"pattern"`
	} `json:"status_line_pattern"`
	Decoration struct {
		Trimmed    string `json:"trimmed"`
		NotTrimmed string `json:"not_trimmed"`
	} `json:"decoration"`
	ParseCases struct {
		Cases []collectParseCase `json:"cases"`
	} `json:"parse_cases"`
}

type collectParseCase struct {
	Name   string `json:"name"`
	Body   string `json:"body"`
	Status string `json:"status"`
	Detail string `json:"detail"`
	Line   string `json:"line"`
}

func loadCollectVocabulary(t *testing.T) collectVocabulary {
	t.Helper()
	body, err := os.ReadFile(collectVocabularyFile)
	if err != nil {
		t.Fatalf("the shared vocabulary is what all three implementations are pinned to: %v", err)
	}
	var v collectVocabulary
	if err := json.Unmarshal(body, &v); err != nil {
		t.Fatalf("parsing %s: %v", collectVocabularyFile, err)
	}
	if len(v.ParseCases.Cases) == 0 {
		t.Fatal("no parse cases: a contract with nothing in it guards nothing")
	}
	return v
}

func TestVerdictsMatchTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	for _, tc := range []struct {
		field string
		got   Verdict
		want  string
	}{
		{"ready_to_merge", ReadyToMerge, v.Verdicts.ReadyToMerge},
		{"no_commits", NoCommits, v.Verdicts.NoCommits},
		{"missing_result", MissingResult, v.Verdicts.MissingResult},
		{"boundary_violation", BoundaryViolation, v.Verdicts.BoundaryViolation},
	} {
		if string(tc.got) != tc.want {
			t.Errorf("verdict %s = %q, the shared vocabulary says %q — "+
				"re-spelling one of three implementations makes a cloud run and a "+
				"herd run silently disagree about the same tick", tc.field, tc.got, tc.want)
		}
	}
}

func TestStatusesMatchTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	for _, tc := range []struct {
		field string
		got   string
		want  string
	}{
		{"done", StatusDone, v.Statuses.Done},
		{"done_with_concerns", StatusDoneWithConcerns, v.Statuses.DoneWithConcerns},
		{"needs_context", StatusNeedsContext, v.Statuses.NeedsContext},
		{"blocked", StatusBlocked, v.Statuses.Blocked},
	} {
		if tc.got != tc.want {
			t.Errorf("status %s = %q, the shared vocabulary says %q", tc.field, tc.got, tc.want)
		}
	}
}

// The escalation set is pinned separately from the status words because
// dropping one of them is not a spelling change — it silently stops a human
// being told about a worker that asked for help.
func TestNeedsHumanMatchesTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	escalates := map[string]bool{}
	for _, s := range v.NeedsHumanStatuses.Statuses {
		escalates[s] = true
	}
	for _, status := range []string{
		v.Statuses.Done, v.Statuses.DoneWithConcerns,
		v.Statuses.NeedsContext, v.Statuses.Blocked,
	} {
		got := Report{Status: status}.NeedsHuman()
		if got != escalates[status] {
			t.Errorf("NeedsHuman(%q) = %v, the shared vocabulary says %v", status, got, escalates[status])
		}
	}
}

// The regexp SOURCE is pinned, not merely its behaviour, and this is the only
// assertion in the repository that makes the DONE_WITH_CONCERNS-before-DONE
// alternation ORDER enforceable.
//
// Today that ordering is defended twice — by the order itself, and by the `\b`
// after the capture group, since `_` is a word character and `DONE\b` therefore
// cannot match inside `DONE_WITH_CONCERNS`. Because the two defences overlap,
// no INPUT distinguishes a re-ordered alternation on its own. Pinning the
// pattern text does: re-order it and this fails before behaviour has changed,
// while the done_with_concerns_* parse cases below fail the moment the `\b`
// guard is what goes.
func TestStatusLinePatternMatchesTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	if got := statusLine.String(); got != v.StatusLinePattern.Pattern {
		t.Errorf("statusLine pattern is\n  %s\nthe shared vocabulary says\n  %s\n"+
			"All three implementations hold this pattern byte-for-byte. If the change "+
			"is intended, change contracts/collect-vocabulary.json and all three.", got, v.StatusLinePattern.Pattern)
	}
}

// The markdown trim set cannot be compared as text across Go and TypeScript —
// one is a strings.Trim cutset, the other a character class — so it is pinned
// behaviourally from both sides. A set that quietly GROWS fails here as loudly
// as one that shrinks.
func TestDecorationSetMatchesTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	for _, r := range v.Decoration.Trimmed {
		body := string(r) + "STATUS: DONE" + string(r)
		if status, _, _ := ParseStatus(body); status != StatusDone {
			t.Errorf("%q is in the shared decoration set but ParseStatus(%q) found no status", string(r), body)
		}
	}
	for _, r := range v.Decoration.NotTrimmed {
		body := string(r) + "STATUS: DONE" + string(r)
		if status, _, _ := ParseStatus(body); status != "" {
			t.Errorf("%q is NOT in the shared decoration set, but ParseStatus(%q) trimmed it and found %q",
				string(r), body, status)
		}
	}
	if strings.Trim(v.Decoration.Trimmed, decoration) != "" {
		t.Errorf("this package's decoration cutset %q does not cover the shared set %q",
			decoration, v.Decoration.Trimmed)
	}
}

// INPUT LINE -> PARSED STATUS. The constants alone would not catch a regexp
// that stopped recognising a status line at all, which is the missing-result
// verdict, nor one that read DONE_WITH_CONCERNS as DONE.
func TestParseStatusMatchesTheSharedVocabulary(t *testing.T) {
	v := loadCollectVocabulary(t)
	for _, tc := range v.ParseCases.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			status, detail, line := ParseStatus(tc.Body)
			if status != tc.Status {
				t.Errorf("status = %q, the shared vocabulary says %q", status, tc.Status)
			}
			if detail != tc.Detail {
				t.Errorf("detail = %q, the shared vocabulary says %q", detail, tc.Detail)
			}
			if line != tc.Line {
				t.Errorf("line = %q, the shared vocabulary says %q", line, tc.Line)
			}
		})
	}
}
