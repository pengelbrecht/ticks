package cmd

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/paint"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// defaultHerdPaintTTLMs is the command's --ttl default, in milliseconds. It
// mirrors paint.DefaultTTL; the flag is expressed in ms so the whole `tk herd`
// surface takes durations the same way.
const defaultHerdPaintTTLMs = 90000

var (
	herdPaintEpic   string
	herdPaintTick   string
	herdPaintSocket string
	herdPaintTTLMs  int64
	herdPaintSeq    uint64
	herdPaintDryRun bool
	herdPaintJSON   bool
)

var herdPaintCmd = &cobra.Command{
	Use:   "paint",
	Short: "Badge this run's herdr workspaces with the tick each worker is on",
	Long: `Decorate the herdr workspaces of a herd run with tracker state, so a wave of
workers is readable at a glance instead of being six identically-labelled
windows running the same agent CLI.

For each worker this run owns it reports, from the run-state manifests
'tk herd spawn' wrote plus the tick's own record in .tick/:

  pane       title '<tick-id> · <role> · <status>', a state label for the
             worker's CURRENT agent status, and the token badges
  workspace  the same facts as tokens (TICK, ROLE, EPIC, STATUS)

The split is herdr's, not a choice: a pane carries a title, state labels and
tokens; a workspace carries tokens only. Both are painted from one badge, so
they cannot disagree.

Display-only and self-expiring
  Nothing here renames a pane, moves focus or touches an agent — a wrong badge
  is a wrong badge, never a wrong action. Every report is namespaced by this
  command's own metadata source, so it can only overwrite its own previous
  paint, and every report carries a TTL (default 90s). Stop painting and herdr
  drops the badges by itself: there is no unpaint step to forget, and a run
  that dies leaves no stale tick ids on the session. That is what makes this
  safe to run from a plugin event hook on every status change.

Ownership
  ONLY workspaces named by this run's own manifests are painted, and only when
  the live session still has them. A pane is painted only when herdr agrees it
  sits in the workspace the manifest recorded. A manifest whose workspace is
  gone is reported as skipped — the ordinary state after cleanup — not as a
  failure.

Read-only with respect to the tracker: tick status is read straight out of the
.tick/ store, never by shelling out to 'tk'.

Repainting is the normal case, and it is idempotent.

Exit codes
  0  the owned workspaces were painted (or previewed with --dry-run)
  1  herdr was unreachable or refused a report, or a manifest cannot be parsed
  2  invalid flags or arguments
  3  not inside a git repository
  4  no manifest file for that tick or epic

Examples
  tk herd paint --epic zz0
  tk herd paint --tick o83 --json
  tk herd paint --epic zz0 --ttl 30000 --dry-run`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdPaint,
}

func init() {
	herdPaintCmd.Flags().StringVar(&herdPaintEpic, "epic", "",
		"epic id whose manifest directory to paint")
	herdPaintCmd.Flags().StringVar(&herdPaintTick, "tick", "",
		"paint just this tick's worker (searched across epics unless --epic narrows it)")
	herdPaintCmd.Flags().StringVar(&herdPaintSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdPaintCmd.Flags().Int64Var(&herdPaintTTLMs, "ttl", defaultHerdPaintTTLMs,
		"how long a painted badge survives without a repaint, in milliseconds")
	herdPaintCmd.Flags().Uint64Var(&herdPaintSeq, "seq", 0,
		"sequence number ordering this paint against earlier ones (0 omits it)")
	herdPaintCmd.Flags().BoolVar(&herdPaintDryRun, "dry-run", false,
		"build and print the badges without reporting anything to herdr")
	herdPaintCmd.Flags().BoolVar(&herdPaintJSON, "json", false,
		"print one JSON document instead of the human-readable report")
	herdCmd.AddCommand(herdPaintCmd)
}

func runHerdPaint(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	if herdPaintTTLMs <= 0 {
		return NewExitError(ExitUsage, "--ttl must be a positive number of milliseconds")
	}

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	found, err := herdPaintManifests(root)
	if err != nil {
		return err
	}
	manifests := make([]state.Manifest, 0, len(found))
	for _, f := range found {
		manifests = append(manifests, f.manifest)
	}

	herd, err := herdConnect(ctx, herdPaintSocket)
	if err != nil {
		return err
	}

	res, err := paint.Run(ctx, herd, paint.Options{
		RepoRoot:  root,
		Manifests: manifests,
		TTL:       time.Duration(herdPaintTTLMs) * time.Millisecond,
		Seq:       herdPaintSeq,
		DryRun:    herdPaintDryRun,
	})
	if err != nil {
		// A herdr refusal is a run failure, not a bad command line.
		return NewExitError(ExitGeneric, "%v", err)
	}

	if herdPaintJSON {
		writeJSONLine(out, res)
		return nil
	}
	herdPaintPrint(out, res)
	return nil
}

// herdPaintManifests resolves what to paint. Unlike collect and cleanup, which
// take the tick as a positional argument, paint takes only flags: it is
// invoked from a plugin event hook, where an argv is assembled once and never
// read again, and a flag says what it means.
//
// With neither --epic nor --tick every manifest under .tick/logs/herd is
// painted. That is deliberately the default for the hook: an event says
// nothing about which epic it belongs to, and painting the whole run is the
// only answer that stays correct across waves.
func herdPaintManifests(root string) ([]foundManifest, error) {
	if herdPaintTick != "" || herdPaintEpic != "" {
		return herdManifests(root, herdPaintTick, herdPaintEpic)
	}
	return allHerdManifests(root)
}

// allHerdManifests reads every manifest under .tick/logs/herd, across epics.
//
// Absent state is NOT an error here, which is where this differs from the
// lookups collect and cleanup use: those are asked about a specific worker, so
// "no manifest" means the caller is wrong. Paint is asked "decorate whatever
// is running", and a repo with no run in flight is a perfectly good answer —
// the hook fires on every herdr event, including in repos that have never
// spawned a worker.
func allHerdManifests(root string) ([]foundManifest, error) {
	base := filepath.Join(root, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, NewExitError(ExitGeneric, "reading %s: %v", base, err)
	}
	var out []foundManifest
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		epicID := e.Name()
		manifests, err := state.List(root, epicID)
		if err != nil {
			return nil, NewExitError(ExitGeneric, "reading %s: %v", state.Dir(root, epicID), err)
		}
		for _, m := range manifests {
			out = append(out, foundManifest{m, state.Path(root, epicID, m.Tick)})
		}
	}
	return out, nil
}

// herdPaintPrint renders the badges as evidence: what was painted, on what,
// and why anything was not.
func herdPaintPrint(out io.Writer, res paint.Result) {
	verb := "painted"
	if res.DryRun {
		verb = "would paint"
	}
	for _, b := range res.Badges {
		fmt.Fprintf(out, "tick      %s  %s\n", b.Tick, b.Title)
		if b.Skipped != "" {
			fmt.Fprintf(out, "skipped   %s\n", b.Skipped)
			continue
		}
		fmt.Fprintf(out, "workspace %s\n", b.WorkspaceID)
		if b.PaneID != "" {
			fmt.Fprintf(out, "pane      %s  (agent %s)\n", b.PaneID, b.AgentStatus)
		} else {
			fmt.Fprintln(out, "pane      none in this workspace — tokens only")
		}
		fmt.Fprintf(out, "tokens    %s\n", herdPaintTokens(b.Tokens))
		for status, label := range b.StateLabels {
			fmt.Fprintf(out, "label     %s = %s\n", status, label)
		}
	}
	if len(res.Badges) == 0 {
		fmt.Fprintln(out, "no herd manifests — nothing to paint")
		return
	}
	fmt.Fprintf(out, "\n%d %s, %d skipped (source %s, ttl %dms)\n",
		res.Painted, verb, res.Skipped, res.Source, res.TTLMs)
}

// herdPaintTokens renders the token map in a stable order.
func herdPaintTokens(tokens map[string]string) string {
	var parts []string
	for _, name := range []string{paint.TokenTick, paint.TokenRole, paint.TokenEpic, paint.TokenStatus} {
		if v := tokens[name]; v != "" {
			parts = append(parts, name+"="+v)
		}
	}
	return strings.Join(parts, " ")
}
