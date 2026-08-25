package cmd

import (
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/muesli/termenv"
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/dashboard"
	"github.com/pengelbrecht/ticks/internal/tui"
)

var (
	herdDashboardEpic     string
	herdDashboardSocket   string
	herdDashboardInterval int64
)

// defaultHerdDashboardIntervalMs is the safety re-list period. It is not the
// update mechanism — status changes arrive as pushed events — so it is slow on
// purpose.
const defaultHerdDashboardIntervalMs = int64(30 * 1000)

var herdDashboardCmd = &cobra.Command{
	Use:   "dashboard",
	Short: "Live read-only board of a herdr run: waves, ticks and worker states",
	Long: `Watch a herdr run in a terminal dashboard: the epic's execution waves and
ticks beside the workers herdr is actually running.

Read-only in two senses. It takes no actions — no spawn, no cancel, no merge.
And it never mutates or even invokes the tracker: tick state is read straight
off .tick/, and run state off the manifests 'tk herd spawn' wrote under
.tick/logs/herd/, exactly the way 'tk herd collect' reads them. No 'tk'
subprocess is ever run.

Updates are event-driven. One events.subscribe stream carries, per worker pane,
one subscription per concrete agent status, so herdr PUSHES every status change
and the board repaints in milliseconds without polling. A slow re-list (see
--interval) runs alongside purely as a safety net: it picks up a newly spawned
worker's manifest, a tick closed on disk, or a pane that vanished, and it is
what tells the subscription its pane set changed. If the stream dies the board
reloads, resubscribes and says so in its header rather than exiting.

Keys
  j / k   move selection / scroll detail   g / G   first / last
  enter   open tick detail, or close it    esc     close detail, or quit
  r       reload now                       q       quit

Exit codes
  0  the dashboard exited cleanly
  1  the dashboard could not start (no herdr, unreadable tick state)
  3  not inside a git repository

Examples
  tk herd dashboard
  tk herd dashboard --epic zz0
  tk herd dashboard --socket /tmp/herdr.sock --interval 60000`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdDashboard,
}

func init() {
	herdDashboardCmd.Flags().StringVar(&herdDashboardEpic, "epic", "",
		"epic id to watch (default: every epic that has run state)")
	herdDashboardCmd.Flags().StringVar(&herdDashboardSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdDashboardCmd.Flags().Int64Var(&herdDashboardInterval, "interval", defaultHerdDashboardIntervalMs,
		"safety re-list period in milliseconds (events, not this, drive updates)")
	herdCmd.AddCommand(herdDashboardCmd)
}

func runHerdDashboard(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}
	if herdDashboardInterval <= 0 {
		return NewExitError(ExitUsage, "--interval must be a positive number of milliseconds")
	}

	ctx := cmd.Context()

	// A dashboard without herdr is still worth showing (manifests and ticks
	// render; statuses read "unknown"), but a herdr that IS reachable is the
	// whole point, so a dial failure is reported rather than swallowed.
	herd, err := herdConnect(ctx, herdDashboardSocket, cmd.ErrOrStderr())
	if err != nil {
		return err
	}

	// Pin the color profile the way `tk tui` does: terminals that misreport
	// under a multiplexer (TERM=screen) otherwise lose all colour, and a
	// herdr plugin pane is exactly such a terminal.
	tui.PinColorProfile(termenv.TrueColor)

	model := dashboard.New(ctx, dashboard.Config{
		RepoRoot:        root,
		Epic:            herdDashboardEpic,
		Herd:            herd,
		RefreshInterval: time.Duration(herdDashboardInterval) * time.Millisecond,
	})
	defer model.Close()

	p := tea.NewProgram(model,
		tea.WithAltScreen(),
		tea.WithContext(ctx),
		tea.WithInput(cmd.InOrStdin()),
		tea.WithOutput(cmd.OutOrStdout()))
	if _, err := p.Run(); err != nil {
		return NewExitError(ExitGeneric, "dashboard: %v", err)
	}
	return nil
}
