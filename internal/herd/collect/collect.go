package collect

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/gitcmd"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// Verdict is the structured answer for one worker.
type Verdict string

// The four verdicts. They are ordered as checks: the first failing check wins,
// in the order herdr-runner.md's collect recipe runs them.
const (
	// ReadyToMerge: commits exist, the report carries a status, and the
	// `.tick/` boundary diff is empty. The orchestrator — never this
	// package — does the merge.
	ReadyToMerge Verdict = "ready-to-merge"
	// NoCommits: the branch is missing or has nothing beyond the base. Per
	// the adapter this means "the worker did not finish", never "done with
	// no changes".
	NoCommits Verdict = "no-commits"
	// MissingResult: no RESULT-<tick-id>.md in the worktree, or one with no
	// recognisable final STATUS: line.
	MissingResult Verdict = "missing-result"
	// BoundaryViolation: the branch touches `.tick/`. The orchestrator owns
	// all tracker state; agent-runner.md's strip-and-note recovery applies.
	BoundaryViolation Verdict = "boundary-violation"
)

// The four statuses a worker's report may end with.
const (
	StatusDone             = "DONE"
	StatusDoneWithConcerns = "DONE_WITH_CONCERNS"
	StatusNeedsContext     = "NEEDS_CONTEXT"
	StatusBlocked          = "BLOCKED"
)

// statusLine matches a report's final status line. DONE_WITH_CONCERNS is first
// in the alternation so it is never truncated to DONE (and could not be
// anyway: `_` is a word character, so `DONE\b` does not match inside it).
var statusLine = regexp.MustCompile(
	`^STATUS:[ \t]*(DONE_WITH_CONCERNS|DONE|NEEDS_CONTEXT|BLOCKED)\b[ \t]*(?:[-–—:][ \t]*)?(.*)$`)

// decoration is the markdown a report line may be wrapped in. Workers write
// prose, and a status line inside a bullet or bolded is still a status line.
const decoration = " \t>-*#`"

// Report is one worker's collect outcome. Every field is evidence: a caller
// that disagrees with the verdict can see exactly what it was computed from.
type Report struct {
	Tick string `json:"tick"`
	Epic string `json:"epic,omitempty"`
	// Verdict is the structured answer; see the constants.
	Verdict Verdict `json:"verdict"`
	// Status is the parsed report status, empty when there was none.
	Status string `json:"status,omitempty"`
	// StatusDetail is the text after the status word, e.g. what to
	// double-check for DONE_WITH_CONCERNS.
	StatusDetail string `json:"status_detail,omitempty"`
	// StatusLine is the raw line the status was parsed from.
	StatusLine string `json:"status_line,omitempty"`

	// Branch and Base come from the manifest, never from a derivation.
	Branch string `json:"branch"`
	Base   string `json:"base"`
	// BranchExists reports whether the local ref resolves at all.
	BranchExists bool `json:"branch_exists"`
	// Commits counts commits on the branch beyond the base.
	Commits int `json:"commits"`

	// Worktree is the path herdr chose, as recorded at spawn.
	Worktree string `json:"worktree"`
	// ResultPath is the report artifact this collect looked for.
	ResultPath string `json:"result_path"`
	// ResultExists reports whether that file was there.
	ResultExists bool `json:"result_exists"`

	// BoundaryFiles are the `.tick/` paths the branch touches. Non-empty is
	// a violation, and it is reported whatever the verdict turned out to be.
	BoundaryFiles []string `json:"boundary_files"`

	// ManifestPath is where the run state was read from.
	ManifestPath string `json:"manifest_path,omitempty"`
}

// OK reports whether this worker is ready to merge. It is the exit-code gate.
func (r Report) OK() bool { return r.Verdict == ReadyToMerge }

// NeedsHuman reports whether the worker's own status is an escalation —
// independent of the verdict, because a BLOCKED worker can still have left a
// perfectly mergeable branch behind.
func (r Report) NeedsHuman() bool {
	return r.Status == StatusBlocked || r.Status == StatusNeedsContext
}

// Collect verifies one manifest's durable result. repoRoot is the controller
// checkout: the branch lives in its ref namespace, and the boundary diff is
// taken there.
//
// An error means the check could not be performed (a bad base commit, git
// missing) — never "the worker failed", which is a verdict.
func Collect(repoRoot string, m state.Manifest, manifestPath string) (Report, error) {
	r := Report{
		Tick:          m.Tick,
		Epic:          m.Epic,
		Branch:        m.Branch,
		Base:          m.Base,
		Worktree:      m.Worktree,
		ManifestPath:  manifestPath,
		BoundaryFiles: []string{},
	}
	if m.Branch == "" {
		return r, fmt.Errorf("herd/collect: manifest for %s records no branch", m.Tick)
	}
	if m.Base == "" {
		return r, fmt.Errorf("herd/collect: manifest for %s records no base commit", m.Tick)
	}

	ref := "refs/heads/" + m.Branch
	r.BranchExists = BranchExists(repoRoot, m.Branch)

	if r.BranchExists {
		n, err := commitCount(repoRoot, m.Base, ref)
		if err != nil {
			return r, err
		}
		r.Commits = n

		files, err := boundaryFiles(repoRoot, ref)
		if err != nil {
			return r, err
		}
		r.BoundaryFiles = files
	}

	// The report artifact. Read it even when there are no commits: a worker
	// that reported BLOCKED without committing says so here, and that is
	// the most useful thing the operator can be told.
	if m.Worktree != "" {
		r.ResultPath = filepath.Join(m.Worktree, spawn.ResultFile(m.Tick))
		if body, err := os.ReadFile(r.ResultPath); err == nil {
			r.ResultExists = true
			r.Status, r.StatusDetail, r.StatusLine = ParseStatus(string(body))
		} else if !os.IsNotExist(err) {
			return r, fmt.Errorf("herd/collect: reading %s: %w", r.ResultPath, err)
		}
	}

	r.Verdict = verdictFor(r)
	return r, nil
}

// verdictFor applies the checks in herdr-runner.md's order and returns the
// first failure. All the evidence is already in the report, so the label is a
// summary, not a filter.
func verdictFor(r Report) Verdict {
	switch {
	case !r.BranchExists || r.Commits == 0:
		return NoCommits
	case !r.ResultExists || r.Status == "":
		return MissingResult
	case len(r.BoundaryFiles) > 0:
		return BoundaryViolation
	default:
		return ReadyToMerge
	}
}

// ParseStatus finds the FINAL status line of a report and splits it into the
// status word, the detail after it, and the raw line. Everything is empty when
// the report carries no recognisable status.
func ParseStatus(body string) (status, detail, line string) {
	for _, raw := range strings.Split(body, "\n") {
		trimmed := strings.Trim(strings.TrimRight(raw, "\r"), decoration)
		m := statusLine.FindStringSubmatch(trimmed)
		if m == nil {
			continue
		}
		// Keep scanning: the contract is the *final* status line, and a
		// report may quote the template's four options above it.
		status = m[1]
		detail = strings.TrimSpace(strings.Trim(m[2], decoration))
		line = trimmed
	}
	return status, detail, line
}

// BranchExists reports whether a local branch ref resolves in repoRoot.
func BranchExists(repoRoot, branch string) bool {
	_, err := git(repoRoot, "rev-parse", "--verify", "--quiet", "refs/heads/"+branch)
	return err == nil
}

// commitCount counts commits on ref beyond base.
func commitCount(repoRoot, base, ref string) (int, error) {
	out, err := git(repoRoot, "rev-list", "--count", base+".."+ref)
	if err != nil {
		return 0, err
	}
	n, convErr := strconv.Atoi(strings.TrimSpace(out))
	if convErr != nil {
		return 0, fmt.Errorf("herd/collect: unexpected rev-list output %q: %w", out, convErr)
	}
	return n, nil
}

// boundaryFiles is the mandatory `.tick/` check, in the three-dot form the
// adapter specifies: what the branch changed relative to its merge-base with
// HEAD, not what the base has since gained.
//
// HEAD is the controller checkout's current integration commit, so the diff is
// `merge-base(HEAD, ref)..ref`. When the worker merged the integration branch
// to pick up a stale spawn base, the merge-base is that merge commit's tip and
// the orchestrator's `.tick/` commits it brought in are excluded. When the
// worker never merged and HEAD advanced past the spawn base, the merge-base is
// still the spawn base and the worker's own changes remain the only diff.
func boundaryFiles(repoRoot, ref string) ([]string, error) {
	out, err := git(repoRoot, "diff", "--name-only", "HEAD..."+ref, "--", ".tick/")
	if err != nil {
		return nil, err
	}
	files := []string{}
	for _, l := range strings.Split(out, "\n") {
		if l = strings.TrimSpace(l); l != "" {
			files = append(files, l)
		}
	}
	return files, nil
}

// git runs one git command in repoRoot, tagging the shared runner's error
// with this package's name.
func git(repoRoot string, args ...string) (string, error) {
	out, err := gitcmd.Run(repoRoot, args...)
	if err != nil {
		return "", fmt.Errorf("herd/collect: %w", err)
	}
	return out, nil
}
