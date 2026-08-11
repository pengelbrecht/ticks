package cmd

import (
	"fmt"
	"io"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/cleanup"
	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

var (
	herdCleanupEpic    string
	herdCleanupSocket  string
	herdCleanupJSON    bool
	herdCleanupPreview bool
	herdCleanupApply   bool
)

var herdCleanupCmd = &cobra.Command{
	Use:   "cleanup [tick-id]",
	Short: "List (or perform) the per-tick teardown of a herdr run: workspace, branch, manifest",
	Long: `Tear down what one herdr worker left behind, from its run-state manifest:

  1. the herdr workspace  (worktree.remove on the recorded workspace id)
  2. the local branch     (git branch -d — never -D)
  3. the manifest itself  (removed LAST, so a failed teardown stays visible)

--preview is the DEFAULT and prints the plan without touching anything;
--apply performs exactly that plan. Both are built by the same code, so a
preview is a promise rather than a description.

Refusals — never touched, per skills/ticks/references/herdr-runner.md
  live-worker      herdr still lists an agent for this tick. A respawned
                   worker carries a fresh name (tick-<id>-r2), so the match is
                   a prefix match on tick-<id>.
  blocked-worker   the pane IS the handoff state: a human attaches, answers,
                   and hands the worker back. Never clean it.
  unmerged-branch  git branch -d would refuse, so this refuses first. Run
                   cleanup while still on the integration branch — after a
                   later squash-merge the SHAs differ and this correctly says
                   no.
  missing manifest with no recorded state there is nothing safe to remove.

One tick is cleaned by id; --epic with no id cleans a whole wave, and one
refused tick never strands the others.

NOT COVERED: the run's own checkout workspace. Opening a worktree against a
repo also opens a workspace for that repo's source checkout, and nothing here
removes it. Closing it at run end is the orchestrator's duty:
'herdr workspace list' then 'herdr workspace close <id>' for every workspace
the run opened. "Cleanup complete" means zero run-created workspaces remain in
that listing, not just zero per-tick worktrees.

Exit codes
  0  every tick was cleaned (--apply), or previewed with no refusal
  1  a refusal, a failed removal, or herdr was unreachable
  2  invalid flags or arguments
  4  no manifest for that tick or epic

Examples
  tk herd cleanup nhk
  tk herd cleanup nhk --apply
  tk herd cleanup --epic gyz --preview --json`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runHerdCleanup,
}

func init() {
	herdCleanupCmd.Flags().StringVar(&herdCleanupEpic, "epic", "",
		"epic id whose manifest directory to read (required when no tick id is given)")
	herdCleanupCmd.Flags().StringVar(&herdCleanupSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdCleanupCmd.Flags().BoolVar(&herdCleanupJSON, "json", false,
		"print one JSON document instead of the human-readable plan")
	herdCleanupCmd.Flags().BoolVar(&herdCleanupPreview, "preview", false,
		"print the plan without touching anything (the default)")
	herdCleanupCmd.Flags().BoolVar(&herdCleanupApply, "apply", false,
		"perform the plan: remove workspace, delete branch, remove manifest")
	herdCmd.AddCommand(herdCleanupCmd)
}

func runHerdCleanup(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	if herdCleanupPreview && herdCleanupApply {
		return NewExitError(ExitUsage, "--preview and --apply are mutually exclusive")
	}
	apply := herdCleanupApply

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	var tickID string
	if len(args) == 1 {
		tickID = args[0]
	}
	found, err := herdManifests(root, tickID, herdCleanupEpic)
	if err != nil {
		return err
	}
	manifests := make([]state.Manifest, 0, len(found))
	paths := make(map[string]string, len(found))
	for _, f := range found {
		manifests = append(manifests, f.manifest)
		paths[f.manifest.Tick] = f.path
	}

	herd, err := client.New(ctx, client.Options{SocketPath: herdCleanupSocket})
	if err != nil {
		// Explicit exit code: GetExitCode's message heuristics would
		// otherwise read a dial error such as "connect: invalid argument" as
		// a usage error.
		return NewExitError(ExitGeneric, "connecting to herdr: %v", err)
	}

	plans, err := cleanup.Run(ctx, herd, cleanup.Options{
		RepoRoot:      root,
		Manifests:     manifests,
		ManifestPaths: paths,
		Apply:         apply,
	})
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	mode := "preview"
	if apply {
		mode = "apply"
	}
	if herdCleanupJSON {
		writeJSONLine(out, struct {
			Mode    string          `json:"mode"`
			Plans   []cleanup.Plan  `json:"plans"`
			Summary herdCleanupSumm `json:"summary"`
		}{mode, plans, herdCleanupSummary(plans)})
	} else {
		for i, p := range plans {
			if i > 0 {
				fmt.Fprintln(out)
			}
			herdCleanupPrint(out, p, apply)
		}
		if !apply && herdCleanupSummary(plans).OK {
			fmt.Fprintln(out, "\nnothing removed — re-run with --apply to perform this plan")
		}
	}

	if s := herdCleanupSummary(plans); !s.OK {
		return ExitError{Code: ExitGeneric, Message: herdCleanupFailure(plans)}
	}
	return nil
}

// herdCleanupSumm is the machine-readable tail of --json.
type herdCleanupSumm struct {
	Total   int  `json:"total"`
	Clean   int  `json:"clean"`
	Refused int  `json:"refused"`
	Failed  int  `json:"failed"`
	OK      bool `json:"ok"`
}

func herdCleanupSummary(plans []cleanup.Plan) herdCleanupSumm {
	var s herdCleanupSumm
	s.Total = len(plans)
	for _, p := range plans {
		switch {
		case p.Refused:
			s.Refused++
		case !p.OK():
			s.Failed++
		default:
			s.Clean++
		}
	}
	s.OK = s.Refused == 0 && s.Failed == 0
	return s
}

// herdCleanupPrint renders one plan: the refusal and its reason, or the steps
// with what actually happened to each.
func herdCleanupPrint(out io.Writer, p cleanup.Plan, applied bool) {
	if p.Refused {
		fmt.Fprintf(out, "tick      %s  REFUSED (%s)\n", p.Tick, p.Reason)
		fmt.Fprintf(out, "          %s\n", p.Detail)
		return
	}
	verb := "would remove"
	if applied {
		verb = "removed"
	}
	fmt.Fprintf(out, "tick      %s  %s\n", p.Tick, verb)
	for _, s := range p.Steps {
		switch {
		case s.Error != "":
			fmt.Fprintf(out, "  FAILED  %-16s %s\n          %s\n", s.Action, s.Target, s.Error)
		case applied && !s.Applied:
			fmt.Fprintf(out, "  skipped %-16s %s (an earlier step failed)\n", s.Action, s.Target)
		default:
			fmt.Fprintf(out, "  %-8s%-16s %s\n", "", s.Action, s.Target)
		}
	}
	for _, n := range p.Notes {
		fmt.Fprintf(out, "  note    %s\n", n)
	}
}

// herdCleanupFailure is the one-line reason for a non-zero exit.
func herdCleanupFailure(plans []cleanup.Plan) string {
	var parts []string
	for _, p := range plans {
		switch {
		case p.Refused:
			parts = append(parts, p.Tick+": "+string(p.Reason))
		case !p.OK():
			parts = append(parts, p.Tick+": removal failed")
		}
	}
	return "cleanup did not complete (" + strings.Join(parts, "; ") + ")"
}
