package cmd

import (
	"fmt"
	"io"
	"strings"

	"github.com/spf13/cobra"

	cloudcollect "github.com/pengelbrecht/ticks/internal/cloud/collect"
)

var (
	cloudCollectEpic string
	cloudCollectJSON bool
)

var cloudCollectCmd = &cobra.Command{
	Use:   "collect [tick-id] --epic <id>",
	Short: "Verify a cloud worker's durable result and print a verdict (never merges)",
	Long: `Check what a cloud worker container actually left behind, and say whether it
is mergeable. This command NEVER merges: the orchestrator owns integration.

A cloud worker is destroyed when it exits, so there is no worktree to read and
no terminal output that may be read. The durable layer is the branch it pushed,
and this command checks exactly it — the same three checks, in the same order,
that 'tk herd collect' runs against a local worktree:

  1. commits   the remote has the branch and it has commits beyond the base
  2. result    RESULT-<tick-id>.md is COMMITTED on that branch and ends with a
               STATUS: line (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED)
  3. boundary  git diff --name-only <base>...<branch> -- .tick/ is empty

Verdicts
  ready-to-merge      all three checks pass
  no-commits          the remote does not have the branch, or it is empty
  missing-result      no report on the branch, or one with no status line
  boundary-violation  the branch touches .tick/, which the orchestrator owns
  unknown             the evidence could not be READ — an unreachable remote is
                      not a worker that failed, and is never reported as one

Verdict and status are independent: a worker can push work, write its report
and still say BLOCKED. That is ready-to-merge with a status to escalate.

This is a D19 dispatch verb — the orchestrator reading its own workers'
durable evidence, mirroring 'tk herd collect' — not an operator command, and
D21's closed operator-to-orchestrator vocabulary is unchanged by it.

The branch is fetched into refs/remotes/<remote>/... only. Nothing is checked
out, no local branch is created, and the working tree is untouched.

Exit codes
  0  every collected worker is ready-to-merge
  1  any other verdict, or the check could not be performed
  2  invalid flags or arguments
  3  not inside a git repository
  4  no cloud manifest for that tick or epic

Examples
  tk cloud collect --epic 1vn
  tk cloud collect bmo --epic 1vn --json`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runCloudCollect,
}

func init() {
	cloudCollectCmd.Flags().StringVar(&cloudCollectEpic, "epic", "",
		"epic whose dispatched wave to collect (default: every epic with manifests)")
	cloudCollectCmd.Flags().BoolVar(&cloudCollectJSON, "json", false,
		"print one JSON document instead of the human-readable report")
	cloudCmd.AddCommand(cloudCollectCmd)
}

type cloudCollectSummary struct {
	Total  int `json:"total"`
	Ready  int `json:"ready"`
	Human  int `json:"needs_human"`
	Unread int `json:"unknown"`
}

func runCloudCollect(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	var tickIDs []string
	if len(args) == 1 {
		tickIDs = []string{args[0]}
	}
	verb, err := cloudWaveOpen(cloudCollectEpic, tickIDs)
	if err != nil {
		return err
	}
	reports, err := cloudCollectAll(verb.root, verb.manifests)
	if err != nil {
		return err
	}

	summary := cloudCollectSummary{Total: len(reports)}
	for _, r := range reports {
		if r.OK() {
			summary.Ready++
		}
		if r.NeedsHuman() {
			summary.Human++
		}
		if r.Verdict == cloudcollect.Unknown {
			summary.Unread++
		}
	}

	if cloudCollectJSON {
		writeJSONLine(out, struct {
			Reports []cloudcollect.Report `json:"reports"`
			Summary cloudCollectSummary   `json:"summary"`
		}{reports, summary})
	} else {
		for i, r := range reports {
			if i > 0 {
				fmt.Fprintln(out)
			}
			printCloudCollectReport(out, r)
		}
		fmt.Fprintf(out, "\n%d/%d ready to merge", summary.Ready, summary.Total)
		if summary.Human > 0 {
			fmt.Fprintf(out, ", %d need a human", summary.Human)
		}
		if summary.Unread > 0 {
			fmt.Fprintf(out, ", %d could not be read", summary.Unread)
		}
		fmt.Fprintln(out)
	}

	if summary.Ready != summary.Total {
		return ExitError{Code: ExitGeneric, Message: fmt.Sprintf(
			"%d of %d cloud worker(s) are not ready to merge", summary.Total-summary.Ready, summary.Total)}
	}
	return nil
}

func printCloudCollectReport(out io.Writer, r cloudcollect.Report) {
	fmt.Fprintf(out, "%s  %s\n", r.Tick, r.Verdict)
	fmt.Fprintf(out, "  branch: %s", r.Branch)
	if r.RemoteSHA != "" {
		fmt.Fprintf(out, " @ %s", r.RemoteSHA)
	}
	fmt.Fprintln(out)
	fmt.Fprintf(out, "  base: %s  commits: %d\n", r.Base, r.Commits)
	if r.ResultExists {
		fmt.Fprintf(out, "  report: %s", r.ResultPath)
		if r.Status != "" {
			fmt.Fprintf(out, " — %s", r.Status)
			if r.StatusDetail != "" {
				fmt.Fprintf(out, ": %s", r.StatusDetail)
			}
		}
		fmt.Fprintln(out)
	} else {
		fmt.Fprintf(out, "  report: %s is not on the branch\n", r.ResultPath)
	}
	if len(r.BoundaryFiles) > 0 {
		fmt.Fprintf(out, "  boundary: %s\n", strings.Join(r.BoundaryFiles, ", "))
	}
	if r.Detail != "" {
		fmt.Fprintf(out, "  detail: %s\n", r.Detail)
	}
	if r.NeedsHuman() {
		fmt.Fprintln(out, "  escalate: the worker's own status asks for a human, whatever the verdict says")
	}
}
