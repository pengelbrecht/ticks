// Package collect verifies what a CLOUD worker left behind, reading only the
// durable layer — the branch it pushed to the remote.
//
// It is `internal/herd/collect` pointed at a remote instead of a worktree. A
// container clones, pushes `tick/<epic>/<tick>` with `RESULT-<tick>.md`
// COMMITTED on it, and is destroyed: there is no worktree left to read, and
// there is no terminal output that may be read (the collect rule
// skills/ticks/references/herdr-runner.md states applies to every substrate).
//
// The three checks and their order are the herd package's — commits beyond
// the base, a report with a STATUS line, an empty `.tick/` boundary diff — so
// a container-per-tick substrate and a herdr-pane substrate never disagree
// about what "ready to merge" means for the same tick.
// `cloud/factory/src/worker-collect.ts` is the third implementation of the
// same rules, for the Workflow-hosted orchestrator.
//
// The verdicts and statuses were the herd package's BY IMPORT until epic 3j4
// stopped this path importing ticks internals; they are copies now. What holds
// them together is contracts/collect-vocabulary.json, which all three
// implementations read — see [Verdict].
//
// One verdict is added: [Unknown], for evidence that could not be READ. A
// remote that will not answer is not a worker that failed, exactly as
// worker-collect.ts refuses to report an unreadable remote as a failing
// verdict. The distinction matters most on a laptop, which is the one place
// this package runs and the one place the network routinely disappears.
package collect

import (
	"bytes"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"

	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
)

// Verdict is the structured answer for one worker.
//
// # These values are INTENTIONAL TWINS of internal/herd/collect's
//
// They were the same type by import until epic 3j4 stopped the factory and
// the cloud path importing ticks internals. They are now a copy, and the copy
// is deliberate — but the SHARED MEANING is real and did not go away with the
// import.
//
// The risk this creates, stated plainly: a verdict string is a contract
// between three implementations of one rule set — this package,
// internal/herd/collect, and cloud/factory/src/worker-collect.ts. If a value
// here drifts from its twin, a cloud run and a herd run silently disagree
// about what "ready to merge" or "needs context" means for the same tick, and
// nothing fails loudly. Never rename or re-spell one of these without
// changing all three.
//
// # What enforces that (tick hn1)
//
// contracts/collect-vocabulary.json. All three implementations read it —
// contract_test.go here, internal/herd/collect/contract_test.go, and
// cloud/factory/test/collect-vocabulary.test.ts — so a one-sided edit fails a
// build instead of shipping. It pins more than these constants: the status
// line REGEXP is in it too, byte-for-byte, because the
// DONE_WITH_CONCERNS-before-DONE alternation order and the markdown
// decoration set are as much a part of the vocabulary as the words are.
type Verdict string

// The verdicts, in the order the checks run: the first failing check wins.
const (
	// ReadyToMerge: commits exist, the report carries a status, and the
	// `.tick/` boundary diff is empty.
	ReadyToMerge Verdict = "ready-to-merge"
	// NoCommits: the branch is missing or has nothing beyond the base. It
	// means "the worker did not finish", never "done with no changes".
	NoCommits Verdict = "no-commits"
	// MissingResult: no RESULT-<tick-id>.md on the branch, or one with no
	// recognisable final STATUS: line.
	MissingResult Verdict = "missing-result"
	// BoundaryViolation: the branch touches `.tick/`. The orchestrator owns
	// all tracker state.
	BoundaryViolation Verdict = "boundary-violation"

	// Unknown: the durable evidence could not be read at all — an unreachable
	// remote, a base commit this checkout does not have. It is never a verdict
	// ON the worker, and a caller must not treat it as one. This one has no
	// twin: only a laptop reading a remote can fail this way.
	Unknown Verdict = "unknown"
)

// The four statuses a worker's report may end with. Twins of
// internal/herd/collect's, under the same warning as the verdicts above:
// StatusNeedsContext in particular is what a cloud run and a herd run must
// agree means the same thing.
const (
	StatusDone             = "DONE"
	StatusDoneWithConcerns = "DONE_WITH_CONCERNS"
	StatusNeedsContext     = "NEEDS_CONTEXT"
	StatusBlocked          = "BLOCKED"
)

// statusLine matches a report's final status line. DONE_WITH_CONCERNS is first
// in the alternation so it is never truncated to DONE.
var statusLine = regexp.MustCompile(
	`^STATUS:[ \t]*(DONE_WITH_CONCERNS|DONE|NEEDS_CONTEXT|BLOCKED)\b[ \t]*(?:[-–—:][ \t]*)?(.*)$`)

// decoration is the markdown a report line may be wrapped in. Workers write
// prose, and a status line inside a bullet or bolded is still a status line.
const decoration = " \t>-*#`"

// parseStatus finds the FINAL status line of a report and splits it into the
// status word, the detail after it, and the raw line. Everything is empty when
// the report carries no recognisable status.
//
// A twin of internal/herd/collect.ParseStatus, and the third reader of the
// same line is cloud/factory/src/worker-collect.ts. See the Verdict comment:
// the regexp above is the contract, not this function.
func parseStatus(body string) (status, detail, line string) {
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

// git runs one git command in repoRoot and returns its trimmed stdout. A
// non-zero exit yields an error carrying the command and git's own stderr, so
// the message an operator reads is git's rather than `exit status 128`.
//
// This is a COPY of internal/herd/gitcmd.Run rather than an import of it,
// and the same call is made at every one of this file's six call sites — a
// single local helper is what kept those consistent when gitcmd was shared,
// and it is what keeps them consistent now. Shelling out to `tk` instead was
// considered and rejected for all six: they are plumbing reads of the local
// object database (ls-remote, fetch, rev-list, diff, ls-tree, show), not
// tracker questions, and `tk` has no verb for any of them.
func git(repoRoot string, args ...string) (string, error) {
	cmd := exec.Command("git", append([]string{"-C", repoRoot}, args...)...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}

// ResultFile is the report artifact a cloud worker commits to its branch.
func ResultFile(tickID string) string { return "RESULT-" + tickID + ".md" }

// Report is one cloud worker's collect outcome. Every field is evidence, so a
// caller that disagrees with the verdict can see what it was computed from.
type Report struct {
	Tick    string `json:"tick"`
	Epic    string `json:"epic,omitempty"`
	Project string `json:"project,omitempty"`
	RunID   string `json:"run_id,omitempty"`

	Verdict      Verdict `json:"verdict"`
	Status       string  `json:"status,omitempty"`
	StatusDetail string  `json:"status_detail,omitempty"`
	StatusLine   string  `json:"status_line,omitempty"`

	// Branch, Base and Remote come from the manifest, never a derivation.
	Branch string `json:"branch"`
	Base   string `json:"base"`
	Remote string `json:"remote,omitempty"`
	// BranchExists reports whether the remote carries the branch at all.
	BranchExists bool `json:"branch_exists"`
	// RemoteSHA is what the remote says the branch points at.
	RemoteSHA string `json:"remote_sha,omitempty"`
	// Commits counts commits on the branch beyond the base.
	Commits int `json:"commits"`

	// ResultPath is the report artifact this collect looked for, ON THE
	// BRANCH — a cloud worker commits it, because nothing else survives the
	// container.
	ResultPath   string `json:"result_path"`
	ResultExists bool   `json:"result_exists"`

	// BoundaryFiles are the `.tick/` paths the branch touches.
	BoundaryFiles []string `json:"boundary_files"`

	// ManifestPath is where the run state was read from.
	ManifestPath string `json:"manifest_path,omitempty"`
	// Detail says why an Unknown verdict could not be computed. Empty
	// otherwise: a readable verdict explains itself through its evidence.
	Detail string `json:"detail,omitempty"`
}

// OK reports whether this worker is ready to merge. It is the exit-code gate.
func (r Report) OK() bool { return r.Verdict == ReadyToMerge }

// NeedsHuman reports whether the worker's own status is an escalation,
// independent of the verdict.
func (r Report) NeedsHuman() bool {
	return r.Status == StatusBlocked || r.Status == StatusNeedsContext
}

// Settled reports whether the durable layer shows this worker finished: the
// branch carries the committed report. It is what `tk cloud wait` blocks on —
// a container that is destroyed leaves no process to watch, so "the report
// reached the remote" is the only completion signal there is.
func (r Report) Settled() bool { return r.ResultExists }

// Collect verifies one manifest's durable result against the remote.
//
// repoRoot is the local checkout the wave was submitted from: its remote is
// where the worker pushed, and its object database is where the base commit
// lives. Nothing is written to the working tree — the branch is fetched into
// the remote-tracking namespace only.
//
// An error means the check could not even be attempted (a manifest with no
// branch). Everything else — including an unreachable remote — comes back as
// a report, because a caller collecting a wave must not lose four good
// verdicts to one bad one.
func Collect(repoRoot string, m cloudstate.Manifest, manifestPath string) (Report, error) {
	remote := m.Remote
	if remote == "" {
		remote = cloudstate.DefaultRemote
	}
	r := Report{
		Tick:          m.Tick,
		Epic:          m.Epic,
		Project:       m.Project,
		RunID:         m.RunID,
		Branch:        m.Branch,
		Base:          m.Base,
		Remote:        remote,
		ResultPath:    ResultFile(m.Tick),
		BoundaryFiles: []string{},
		ManifestPath:  manifestPath,
	}
	if m.Branch == "" {
		return r, fmt.Errorf("cloud/collect: manifest for %s records no branch", m.Tick)
	}
	if m.Base == "" {
		return r, fmt.Errorf("cloud/collect: manifest for %s records no base commit", m.Tick)
	}

	sha, err := remoteHead(repoRoot, remote, m.Branch)
	if err != nil {
		r.Verdict = Unknown
		r.Detail = fmt.Sprintf("the remote %s could not be read: %v", remote, err)
		return r, nil
	}
	if sha == "" {
		// The remote answered and does not have the branch. That is evidence,
		// not a failure to read: the worker pushed nothing.
		r.Verdict = NoCommits
		return r, nil
	}
	r.BranchExists = true
	r.RemoteSHA = sha

	ref := trackingRef(remote, m.Branch)
	if _, err := git(repoRoot, "fetch", "--quiet", remote,
		"+refs/heads/"+m.Branch+":"+ref); err != nil {
		r.Verdict = Unknown
		r.Detail = fmt.Sprintf("the branch %s could not be fetched from %s: %v", m.Branch, remote, err)
		return r, nil
	}

	count, err := commitCount(repoRoot, m.Base, ref)
	if err != nil {
		r.Verdict = Unknown
		r.Detail = fmt.Sprintf("commits on %s could not be counted against %s: %v", m.Branch, m.Base, err)
		return r, nil
	}
	r.Commits = count

	files, err := boundaryFiles(repoRoot, m.Base, ref)
	if err != nil {
		r.Verdict = Unknown
		r.Detail = fmt.Sprintf("the .tick/ boundary diff for %s could not be taken: %v", m.Branch, err)
		return r, nil
	}
	r.BoundaryFiles = files

	// The report. Read even when there are no commits: a container that
	// reported BLOCKED without committing says so here, and that is the most
	// useful thing the operator can be told.
	body, found, err := showFile(repoRoot, ref, r.ResultPath)
	if err != nil {
		r.Verdict = Unknown
		r.Detail = fmt.Sprintf("%s could not be read from %s: %v", r.ResultPath, m.Branch, err)
		return r, nil
	}
	if found {
		r.ResultExists = true
		r.Status, r.StatusDetail, r.StatusLine = parseStatus(body)
	}

	r.Verdict = verdictFor(r)
	return r, nil
}

// verdictFor applies the herd adapter's checks in its order and returns the
// first failure. All the evidence is already in the report.
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

// trackingRef is the remote-tracking ref a worker branch is fetched into.
// Fetching into refs/remotes/ rather than refs/heads/ is deliberate: a local
// branch of the same name would collide with a herdr worktree's branch and
// with the operator's own checkout.
func trackingRef(remote, branch string) string {
	return "refs/remotes/" + remote + "/" + branch
}

// remoteHead asks the remote what a branch points at. "" means the remote
// answered and does not have it; an error means the remote did not answer.
func remoteHead(repoRoot, remote, branch string) (string, error) {
	out, err := git(repoRoot, "ls-remote", "--heads", remote, "refs/heads/"+branch)
	if err != nil {
		return "", err
	}
	fields := strings.Fields(out)
	if len(fields) == 0 {
		return "", nil
	}
	return fields[0], nil
}

func commitCount(repoRoot, base, ref string) (int, error) {
	out, err := git(repoRoot, "rev-list", "--count", base+".."+ref)
	if err != nil {
		return 0, err
	}
	n, convErr := strconv.Atoi(strings.TrimSpace(out))
	if convErr != nil {
		return 0, fmt.Errorf("unexpected rev-list output %q: %w", out, convErr)
	}
	return n, nil
}

// boundaryFiles is the mandatory `.tick/` check, in the three-dot form the
// adapter specifies: what the branch changed relative to the merge base.
func boundaryFiles(repoRoot, base, ref string) ([]string, error) {
	out, err := git(repoRoot, "diff", "--name-only", base+"..."+ref, "--", ".tick/")
	if err != nil {
		return nil, err
	}
	files := []string{}
	for _, line := range strings.Split(out, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			files = append(files, line)
		}
	}
	return files, nil
}

// showFile reads one path out of a ref. found is false when the ref simply
// does not carry the path, which is an ordinary answer; an error is reserved
// for a git that could not look.
//
// Presence is asked with `ls-tree`, which exits 0 and prints nothing for a
// path a ref does not carry, rather than with `cat-file -e`, whose non-zero
// exit means both "absent" and "this repository is broken". Collapsing those
// two would report an unreadable object database as a worker that wrote no
// report — the failure class the Unknown verdict exists to keep separate.
func showFile(repoRoot, ref, path string) (body string, found bool, err error) {
	listed, err := git(repoRoot, "ls-tree", "--name-only", ref, "--", path)
	if err != nil {
		return "", false, err
	}
	if strings.TrimSpace(listed) == "" {
		return "", false, nil
	}
	out, err := git(repoRoot, "show", ref+":"+path)
	if err != nil {
		return "", false, err
	}
	return out, true, nil
}
