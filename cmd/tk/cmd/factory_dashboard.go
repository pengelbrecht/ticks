package cmd

// This file is the reason a `tk` build still compiles factory code: the import
// of internal/factory/dashboard below. That was measured rather than argued —
// it costs 163 KB of a 22.7 MB binary (0.72%), no third-party dependency and no
// measurable compile time — and the deliberate decision is to leave it until the
// factory command files leave the repo, rather than pay for a build tag that
// would not even remove internal/factory (cloud_logs.go and cloud_supervisor.go
// import it for the supervisor read). Numbers and reasoning:
// repo-wiki/factory-ticks-boundary.md, "What factory code costs a `tk` build".

import (
	"net/http"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/muesli/termenv"
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/factory"
	"github.com/pengelbrecht/ticks/internal/factory/credentials"
	"github.com/pengelbrecht/ticks/internal/factory/dashboard"
	"github.com/pengelbrecht/ticks/internal/gatewaytrace"
	"github.com/pengelbrecht/ticks/internal/tui"
)

var (
	factoryDashboardProject   string
	factoryDashboardInterval  int64
	factoryDashboardCost      int64
	factoryDashboardTailBytes int
	factoryDashboardNoCost    bool
)

// defaultFactoryDashboardIntervalMs is how often the board re-reads the
// factory. It is the update mechanism here, unlike `tk herd dashboard` where
// events are: a deployed factory pushes its `run_event` stream to a BOARD, and
// what a local terminal can read is the tail the RunRoom keeps.
const defaultFactoryDashboardIntervalMs = int64(2 * 1000)

// defaultFactoryDashboardCostMs is how often gateway telemetry is re-totalled.
// Each pass pages the AI Gateway logs API, so it is deliberately far slower
// than a frame.
const defaultFactoryDashboardCostMs = int64(30 * 1000)

// defaultFactoryDashboardTailBytes is how much of a run's harness output tail
// `--tail-bytes` reads: a screenful of scrollback, not a log dump. The board
// polls it every couple of seconds, and the operator who wants the whole
// stream has `tk cloud logs`.
//
// It lives here, with the flag it is the default for and beside the other two
// defaults for this same command, rather than in internal/factory/dashboard.
// This is a `tk` flag default: root.go resets every flag to it, and the root
// command — always compiled, factory installed or not — should not have to
// import factory code to learn the default value of one of its own flags.
// internal/factory/dashboard keeps its own fallback for the different question
// of what a Loader does when a programmatic caller leaves HarnessBytes zero.
const defaultFactoryDashboardTailBytes = 64 << 10

var factoryDashboardCmd = &cobra.Command{
	Use:   "dashboard",
	Short: "Live read-only board of the cloud factory: runs, phase, output, gates, refusals",
	Long: `Watch your deployed factory from a local terminal: the runs it is executing,
the phase and boot each one is on, what its container is printing right now,
the gates waiting for an answer, and the submissions it refused and why.

It is the cloud counterpart to 'tk herd dashboard' and shares its keys and its
fold behaviour, so an operator who has driven one drives this one.

Read-only, and observability rather than authority. It takes no actions, and
every request it makes is a GET: the board is not the completion authority —
closeout is — and a board that could stop or start a run would invite acting
on a view that is a second or two old. If it ever gains actions they route
through the same closed command surface as 'tk cloud run/stop/answer' (D21).

It works when the factory does not. A read that fails does not clear the
screen: the board keeps the last state it knew, labels it STALE with its age
and says what went wrong. A board opened while the factory is already down
shows the frame the previous session left on disk, labelled the same way — an
operator debugging a broken factory is exactly who needs this most.

Cost comes from AI Gateway telemetry, never from a run's own claim, so it
needs the Cloudflare API token 'tk factory setup --cloudflare-api-token'
installs. Without it the board says the cost is unread rather than showing a
zero, and everything else still works.

Keys
  j / k   move selection / scroll output   g / G   first / last
  enter   open run detail, or fold a row   esc     close detail, or quit
  r       reload now                       q       quit

Exit codes
  0  the dashboard exited cleanly
  1  the dashboard could not start (no factory configured, bad flags)

Examples
  tk factory dashboard
  tk factory dashboard --project owner/repo
  tk factory dashboard --interval 5000 --no-cost`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runFactoryDashboard,
}

func init() {
	factoryDashboardCmd.Flags().StringVar(&factoryDashboardProject, "project", "",
		"project to watch as owner/repo (default: every project with runs)")
	factoryDashboardCmd.Flags().Int64Var(&factoryDashboardInterval, "interval", defaultFactoryDashboardIntervalMs,
		"how often to re-read the factory, in milliseconds")
	factoryDashboardCmd.Flags().Int64Var(&factoryDashboardCost, "cost-interval", defaultFactoryDashboardCostMs,
		"how often to re-total AI Gateway spend, in milliseconds")
	factoryDashboardCmd.Flags().IntVar(&factoryDashboardTailBytes, "tail-bytes", defaultFactoryDashboardTailBytes,
		"how much of the harness output tail each frame reads")
	factoryDashboardCmd.Flags().BoolVar(&factoryDashboardNoCost, "no-cost", false,
		"skip gateway cost telemetry entirely")

	factoryCmd.AddCommand(factoryDashboardCmd)
}

func runFactoryDashboard(cmd *cobra.Command, args []string) error {
	if factoryDashboardInterval <= 0 {
		return NewExitError(ExitUsage, "--interval must be a positive number of milliseconds")
	}
	if factoryDashboardCost <= 0 {
		return NewExitError(ExitUsage, "--cost-interval must be a positive number of milliseconds")
	}
	if factoryDashboardTailBytes <= 0 {
		return NewExitError(ExitUsage, "--tail-bytes must be a positive number of bytes")
	}

	config, err := factory.LoadCredentials()
	if err != nil {
		return NewExitError(ExitGeneric, "cannot read factory configuration: %v", err)
	}
	client, err := dashboard.NewClient(
		config.Get(credentials.KeyURL),
		config.Get(credentials.KeyToken),
		&http.Client{Timeout: 15 * time.Second},
	)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	// A factory without a log-reading token is a normal, documented state:
	// cost telemetry is optional. The board says so in its header rather than
	// refusing to start, because every other thing it shows still works —
	// and a silently missing cost column reads as a free run.
	var costs dashboard.CostSource
	var notes []string
	if !factoryDashboardNoCost {
		traceConfig, err := gatewaytrace.ConfigFrom(config)
		if err != nil {
			notes = append(notes, "cost telemetry unavailable: "+err.Error())
		} else {
			costs = dashboard.GatewayCost{Client: gatewaytrace.New(traceConfig, nil)}
		}
	}

	// Pin the colour profile the way `tk tui` and `tk herd dashboard` do:
	// terminals that misreport under a multiplexer otherwise lose all colour.
	tui.PinColorProfile(termenv.TrueColor)

	var cache dashboard.Cache
	if path, err := dashboard.CachePath(client.Endpoint()); err == nil {
		cache = dashboard.Cache{Path: path}
	}

	model := dashboard.New(cmd.Context(), dashboard.Config{
		Source:          client,
		Costs:           costs,
		Project:         strings.TrimSpace(factoryDashboardProject),
		Endpoint:        client.Endpoint(),
		RefreshInterval: time.Duration(factoryDashboardInterval) * time.Millisecond,
		CostInterval:    time.Duration(factoryDashboardCost) * time.Millisecond,
		HarnessBytes:    factoryDashboardTailBytes,
		Cache:           cache,
		Notes:           notes,
	})
	defer model.Close()

	program := tea.NewProgram(model,
		tea.WithAltScreen(),
		tea.WithContext(cmd.Context()),
		tea.WithInput(cmd.InOrStdin()),
		tea.WithOutput(cmd.OutOrStdout()))
	if _, err := program.Run(); err != nil {
		return NewExitError(ExitGeneric, "factory dashboard: %v", err)
	}
	return nil
}
