package cmd

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/collect"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

var (
	herdCollectEpic string
	herdCollectJSON bool
)

var herdCollectCmd = &cobra.Command{
	Use:   "collect [tick-id]",
	Short: "Verify a herdr worker's durable result and print a verdict (never merges)",
	Long: `Check what a herdr worker actually left behind, and say whether it is
mergeable. This command NEVER merges: the orchestrator owns integration.

A settled worker proves nothing — skills/ticks/references/herdr-runner.md is
explicit that a wait means "worth looking now" and that terminal scraping is
forbidden as a result channel. What counts is the durable layer, and this
command checks exactly it, reading branch, base commit and worktree path out of
the run-state manifest 'tk herd spawn' wrote (herdr chose the worktree path;
nothing here re-derives it):

  1. commits   the branch exists and has commits beyond the recorded base
  2. result    RESULT-<tick-id>.md is in the worktree and ends with a
               STATUS: line (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED)
  3. boundary  git diff --name-only <base>...<branch> -- .tick/ is empty

Verdicts
  ready-to-merge      all three checks pass
  no-commits          the branch is missing or empty — the worker did not
                      finish; it does NOT mean "done with no changes"
  missing-result      no report, or a report with no status line
  boundary-violation  the branch touches .tick/, which the orchestrator owns

The verdict is the first failing check in that order, but every check always
runs: a missing-result report still lists any boundary files it found.

Verdict and status are independent. A worker can commit, write its report and
still say BLOCKED — that is ready-to-merge with a status the orchestrator must
escalate. The output flags it; do not read a zero exit as "no human needed".

With a tick id, one worker is collected; the manifest is found by tick id
across epics unless --epic narrows it. With --epic and no tick id, every
manifest of that epic is collected — the whole wave in one call.

Exit codes
  0  every collected worker is ready-to-merge
  1  any other verdict, or the check could not be performed (including a
     manifest that exists but cannot be parsed)
  2  invalid flags or arguments
  3  not inside a git repository
  4  no manifest file for that tick or epic

Examples
  tk herd collect nhk
  tk herd collect nhk --epic gyz --json
  tk herd collect --epic gyz`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runHerdCollect,
}

func init() {
	herdCollectCmd.Flags().StringVar(&herdCollectEpic, "epic", "",
		"epic id whose manifest directory to read (required when no tick id is given)")
	herdCollectCmd.Flags().BoolVar(&herdCollectJSON, "json", false,
		"print one JSON document instead of the human-readable report")
	herdCmd.AddCommand(herdCollectCmd)
}

func runHerdCollect(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	var tickID string
	if len(args) == 1 {
		tickID = args[0]
	}
	found, err := herdManifests(root, tickID, herdCollectEpic)
	if err != nil {
		return err
	}

	reports := make([]collect.Report, 0, len(found))
	ready := 0
	for _, f := range found {
		r, err := collect.Collect(root, f.manifest, f.path)
		if err != nil {
			// Explicit exit code: GetExitCode's message heuristics would
			// otherwise misread a git error mentioning "invalid" or
			// "unknown" as a usage error.
			return NewExitError(ExitGeneric, "%v", err)
		}
		if r.OK() {
			ready++
		}
		reports = append(reports, r)
	}

	if herdCollectJSON {
		writeJSONLine(out, struct {
			Reports []collect.Report `json:"reports"`
			Summary herdCollectSum   `json:"summary"`
		}{reports, herdCollectSummary(reports, ready)})
	} else {
		for i, r := range reports {
			if i > 0 {
				fmt.Fprintln(out)
			}
			herdCollectPrint(out, r)
		}
		if len(reports) > 1 {
			fmt.Fprintf(out, "\n%d/%d ready-to-merge\n", ready, len(reports))
		}
	}

	if ready != len(reports) {
		return ExitError{Code: ExitGeneric, Message: herdCollectFailure(reports)}
	}
	return nil
}

// herdCollectSum is the machine-readable tail of --json.
type herdCollectSum struct {
	Total      int  `json:"total"`
	Ready      int  `json:"ready"`
	NeedsHuman int  `json:"needs_human"`
	OK         bool `json:"ok"`
}

func herdCollectSummary(reports []collect.Report, ready int) herdCollectSum {
	needsHuman := 0
	for _, r := range reports {
		if r.NeedsHuman() {
			needsHuman++
		}
	}
	return herdCollectSum{
		Total:      len(reports),
		Ready:      ready,
		NeedsHuman: needsHuman,
		OK:         ready == len(reports),
	}
}

// herdCollectPrint renders one report as evidence, not as prose: every line is
// something the operator can go and look at.
func herdCollectPrint(out io.Writer, r collect.Report) {
	fmt.Fprintf(out, "tick      %s  %s\n", r.Tick, r.Verdict)
	if r.BranchExists {
		fmt.Fprintf(out, "branch    %s  (%d commit(s) beyond %s)\n", r.Branch, r.Commits, shortSHA(r.Base))
	} else {
		fmt.Fprintf(out, "branch    %s  (no such branch)\n", r.Branch)
	}
	switch {
	case r.Status != "":
		line := "STATUS: " + r.Status
		if r.StatusDetail != "" {
			line += " — " + r.StatusDetail
		}
		fmt.Fprintf(out, "result    %s\n          %s\n", r.ResultPath, line)
	case r.ResultExists:
		fmt.Fprintf(out, "result    %s  (no STATUS: line)\n", r.ResultPath)
	default:
		fmt.Fprintf(out, "result    %s  (missing)\n", r.ResultPath)
	}
	if len(r.BoundaryFiles) > 0 {
		fmt.Fprintf(out, "boundary  VIOLATION — the branch touches %s\n", strings.Join(r.BoundaryFiles, ", "))
	} else {
		fmt.Fprintln(out, "boundary  clean (no .tick/ changes)")
	}
	if r.NeedsHuman() {
		fmt.Fprintf(out, "escalate  the worker reported %s — this is a human escalation whatever the verdict says\n", r.Status)
	}
	if r.ManifestPath != "" {
		fmt.Fprintf(out, "manifest  %s\n", r.ManifestPath)
	}
}

// herdCollectFailure is the one-line reason for a non-zero exit.
func herdCollectFailure(reports []collect.Report) string {
	var parts []string
	for _, r := range reports {
		if !r.OK() {
			parts = append(parts, r.Tick+": "+string(r.Verdict))
		}
	}
	return "not ready to merge (" + strings.Join(parts, "; ") + ")"
}

func shortSHA(sha string) string {
	if len(sha) > 8 {
		return sha[:8]
	}
	return sha
}

// ---------------------------------------------------------------------------
// Manifest lookup, shared with `tk herd cleanup`.
// ---------------------------------------------------------------------------

// foundManifest is a manifest and the file it was read from. The path matters:
// cleanup removes it, and collect prints it as evidence.
type foundManifest struct {
	manifest state.Manifest
	path     string
}

// herdManifests locates the run state for a tick, or for a whole epic.
//
// With an epic it is a direct read; without one the epic directories are
// scanned, because `.tick/logs/herd/<epic>/<tick>.json` is keyed by epic and a
// caller should not have to remember which epic a tick belongs to. A tick id
// is unique, so more than one hit is a corrupted layout, not an ambiguity to
// resolve by guessing.
func herdManifests(root, tickID, epicID string) ([]foundManifest, error) {
	if tickID == "" {
		if strings.TrimSpace(epicID) == "" {
			return nil, NewExitError(ExitUsage,
				"give a tick id, or --epic <id> to work on a whole wave")
		}
		manifests, err := state.List(root, epicID)
		if err != nil {
			return nil, NewExitError(ExitGeneric, "reading %s: %v", state.Dir(root, epicID), err)
		}
		if len(manifests) == 0 {
			return nil, NewExitError(ExitNotFound,
				"no herd manifests for epic %s under %s/ — nothing was spawned, or it was already cleaned up",
				epicID, state.RelDir+"/"+state.EpicDir(epicID))
		}
		out := make([]foundManifest, 0, len(manifests))
		for _, m := range manifests {
			out = append(out, foundManifest{m, state.Path(root, epicID, m.Tick)})
		}
		return out, nil
	}

	if epicID != "" {
		path := state.Path(root, epicID, tickID)
		m, err := state.Read(path)
		if err != nil {
			// Only an absent file is "not found". A manifest that exists but
			// cannot be parsed must not report 4: a caller that treats 4 as
			// "nothing was spawned" would spawn a duplicate worker on top of a
			// live one. The scan branch below already reports 1 for the same
			// file, so both lookups agree.
			if os.IsNotExist(err) {
				return nil, NewExitError(ExitNotFound, "no herd manifest at %s: %v",
					state.RelPath(epicID, tickID), err)
			}
			return nil, NewExitError(ExitGeneric, "reading %s: %v",
				state.RelPath(epicID, tickID), err)
		}
		return []foundManifest{{m, path}}, nil
	}

	paths, err := herdManifestPaths(root, tickID)
	if err != nil {
		return nil, NewExitError(ExitGeneric, "%v", err)
	}
	switch len(paths) {
	case 0:
		return nil, NewExitError(ExitNotFound,
			"no herd manifest for tick %s under %s/ — it was never spawned by 'tk herd spawn', or cleanup already removed it",
			tickID, state.RelDir)
	case 1:
		m, err := state.Read(paths[0])
		if err != nil {
			return nil, NewExitError(ExitGeneric, "%v", err)
		}
		return []foundManifest{{m, paths[0]}}, nil
	default:
		return nil, NewExitError(ExitGeneric,
			"tick %s has %d manifests (%s) — pass --epic to say which run you mean",
			tickID, len(paths), strings.Join(paths, ", "))
	}
}

// herdManifestPaths finds every `<tick-id>.json` across the epic directories.
func herdManifestPaths(root, tickID string) ([]string, error) {
	base := filepath.Join(root, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading %s: %w", base, err)
	}
	var paths []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		path := filepath.Join(base, e.Name(), tickID+".json")
		if _, err := os.Stat(path); err == nil {
			paths = append(paths, path)
		}
	}
	sort.Strings(paths)
	return paths, nil
}
