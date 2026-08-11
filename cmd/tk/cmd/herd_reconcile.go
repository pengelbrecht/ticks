package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/reconcile"
)

var (
	herdReconcileEpic   string
	herdReconcileConfig string
	herdReconcileSocket string
	herdReconcileJSON   bool
	herdReconcileAdopt  bool
)

var herdReconcileCmd = &cobra.Command{
	Use:   "reconcile [--epic <id>]",
	Short: "Rebuild herd run state after an orchestrator crash and print a plan",
	Long: `Reconcile a herd run from durable state and print a PLAN. Mutates nothing.

Workers spawned onto herdr are independent processes: an orchestrator that
crashes leaves them RUNNING. A fresh session must not launch a second worker
for a tick that already has a live one — this command answers what is actually
going on, in the order skills/ticks/references/herdr-runner.md fixes:

  1. manifests        .tick/logs/herd/<epic>/<tick>.json — what was dispatched
  2. git              worktree list + branch --list '<prefix>*', with the prefix
                      read from orchestration.worktree_branch_prefix
  3. agent.list       a live agent named tick-<id> (or a respawn, tick-<id>-rN)
  4. session.snapshot native session identity for workers that are gone

Every in-flight tick lands in exactly one class:

  live-worker            continue it via 'tk herd wait' / a prompt. NEVER
                         redispatch — a branch with no commits is what a worker
                         that has not committed yet looks like.
  dead-worker-resumable  a session id was recorded: the plan carries the exact
                         per-kind resume argv (claude composes --resume <id>
                         with its template; codex takes 'resume <id>' as a
                         leading subcommand) under a FRESH agent name.
  dead-with-work         no session, but the branch carries commits beyond its
                         base: redispatch FROM THE BRANCH, never a second one.
  stale-no-work          no session, no commits: a safe reset. Removing the
                         workspace and deleting the branch is the ORCHESTRATOR's
                         move; this command only proposes it.
  unknown                the evidence contradicts itself. The contradiction is
                         spelled out and NO mutation is proposed.

--adopt is the single exception to read-only: it refreshes the manifests of
live workers whose evidence is consistent (respawned agent name, current pane,
a session id that was not captured at spawn). Nothing else is written.

Exit codes
  0  a plan was produced (including one containing unknowns)
  1  the reconcile itself failed: herdr unreachable, git unreadable, adopt write
  2  invalid flags or arguments
  3  not inside a git repository

An epic with no manifests is a plan, not an error: reconcile reports an empty
plan and exits 0. It never exits 4.

Examples
  tk herd reconcile --epic gyz
  tk herd reconcile --json
  tk herd reconcile --epic gyz --adopt`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdReconcile,
}

func init() {
	herdReconcileCmd.Flags().StringVar(&herdReconcileEpic, "epic", "",
		"limit the reconcile to one epic (default: every epic with manifests)")
	herdReconcileCmd.Flags().StringVar(&herdReconcileConfig, "config", "",
		"path to runners.toml (default: <repo>/.tick/runners.toml)")
	herdReconcileCmd.Flags().StringVar(&herdReconcileSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdReconcileCmd.Flags().BoolVar(&herdReconcileJSON, "json", false,
		"print the whole plan as one JSON document")
	herdReconcileCmd.Flags().BoolVar(&herdReconcileAdopt, "adopt", false,
		"refresh the manifests of live workers found consistent (the only write this command makes)")
	herdCmd.AddCommand(herdReconcileCmd)
}

func runHerdReconcile(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	// The branch prefix is a config value. Hardcoding "tick/" would silently
	// find no branches for a run that configured another prefix, and report
	// every worker as unknown.
	cfg, err := herdLoadConfig(root, herdReconcileConfig)
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}

	herd, err := herdConnect(ctx, herdReconcileSocket)
	if err != nil {
		return err
	}

	report, err := reconcile.Run(ctx, herd, reconcile.Options{
		RepoRoot:     root,
		EpicID:       herdReconcileEpic,
		BranchPrefix: cfg.WorktreeBranchPrefix(),
		Adopt:        herdReconcileAdopt,
	})
	if err != nil {
		// An operational failure, never a classification outcome: a plan
		// containing unknowns exits 0.
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}

	if herdReconcileJSON {
		writeJSONLine(out, report)
		return nil
	}
	herdReconcilePrint(cmd, report)
	return nil
}

// herdReconcilePrint renders the plan for a human. Every line is evidence or a
// proposal; nothing here has been executed.
func herdReconcilePrint(cmd *cobra.Command, r *reconcile.Report) {
	out := cmd.OutOrStdout()
	scope := "all epics"
	if r.Epic != "" {
		scope = "epic " + r.Epic
	}
	fmt.Fprintf(out, "reconcile  %s  (branch prefix %s)\n", scope, r.BranchPrefix)
	if len(r.Items) == 0 {
		fmt.Fprintln(out, "no run-state manifests — nothing was dispatched, or the manifests are gone")
		return
	}

	for _, item := range r.Items {
		ev := item.Evidence
		fmt.Fprintf(out, "\ntick %s  %s\n", item.Tick, item.Class)
		fmt.Fprintf(out, "  why       %s\n", item.Reason)
		if ev.LiveAgent != "" {
			fmt.Fprintf(out, "  agent     %s (%s, pane %s)\n", ev.LiveAgent, ev.LiveAgentStatus, ev.LivePaneID)
		} else if ev.ManifestAgent != "" {
			fmt.Fprintf(out, "  agent     %s (not in the herdr session)\n", ev.ManifestAgent)
		}
		fmt.Fprintf(out, "  branch    %s (%s, %s)\n", ev.Branch,
			existsWord(ev.BranchExists), commitsWord(ev))
		if ev.Worktree != "" {
			fmt.Fprintf(out, "  worktree  %s (%s)\n", ev.Worktree, registeredWord(ev.WorktreeRegistered))
		}
		if ev.SessionID != "" {
			fmt.Fprintf(out, "  session   %s (%s)\n", ev.SessionID, ev.SessionSource)
		}
		for _, c := range item.Contradictions {
			fmt.Fprintf(out, "  conflict  %s\n", c)
		}
		fmt.Fprintf(out, "  plan      %s: %s\n", item.Plan.Action, item.Plan.Summary)
		if len(item.Plan.Argv) > 0 {
			fmt.Fprintf(out, "  argv      %s\n", strings.Join(item.Plan.Argv, " "))
		}
		for _, c := range item.Plan.Commands {
			fmt.Fprintf(out, "  do        %s\n", c)
		}
		for _, m := range item.Plan.ProposedMutations {
			fmt.Fprintf(out, "  propose   %s   (the orchestrator's move, not this command's)\n", m)
		}
		if item.Adopted {
			fmt.Fprintf(out, "  adopted   %s refreshed in %s\n",
				strings.Join(item.AdoptedFields, ", "), item.ManifestPath)
		}
	}

	fmt.Fprintf(out, "\nsummary   %s\n", herdReconcileCounts(r))
	if r.Adopt {
		if len(r.Adopted) == 0 {
			fmt.Fprintln(out, "adopted   nothing — no live worker's manifest needed refreshing")
		} else {
			fmt.Fprintf(out, "adopted   %s\n", strings.Join(r.Adopted, ", "))
		}
	}
}

// herdReconcileCounts renders the class tally in a fixed order, so two runs
// are diffable.
func herdReconcileCounts(r *reconcile.Report) string {
	order := []reconcile.Class{
		reconcile.ClassLiveWorker,
		reconcile.ClassDeadResumable,
		reconcile.ClassDeadWithWork,
		reconcile.ClassStaleNoWork,
		reconcile.ClassUnknown,
	}
	parts := make([]string, 0, len(order))
	for _, c := range order {
		parts = append(parts, fmt.Sprintf("%s=%d", c, r.Counts[string(c)]))
	}
	return fmt.Sprintf("%d tick(s): %s", len(r.Items), strings.Join(parts, " "))
}

func existsWord(ok bool) string {
	if ok {
		return "exists"
	}
	return "missing"
}

func registeredWord(ok bool) string {
	if ok {
		return "registered"
	}
	return "not registered"
}

func commitsWord(ev reconcile.Evidence) string {
	if !ev.CommitsKnown {
		return "commits beyond base: unknown"
	}
	return fmt.Sprintf("%d commit(s) beyond base", ev.CommitsAhead)
}
