package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/skills"
)

// resolveActor determines the actor for an activity entry using the precedence:
//
//	--actor flag > TK_ACTOR env > default (empty, caller falls back to tick owner)
//
// Pass the value of the --actor flag (empty string if not set).
func resolveActor(flagActor string) string {
	if flagActor != "" {
		return flagActor
	}
	if env := os.Getenv("TK_ACTOR"); env != "" {
		return env
	}
	return ""
}

// Version is set at build time via ldflags
var Version = "dev"

// Exit codes matching the legacy CLI behavior
const (
	ExitSuccess  = 0
	ExitGeneric  = 1
	ExitUsage    = 2
	ExitNoRepo   = 3
	ExitNotFound = 4
	ExitGitHub   = 5
	ExitIO       = 6

	// ExitTimeout reports that a blocking command gave up waiting: `tk ask`
	// whose question nobody answered in time. It has its own slot because a
	// blocking ask can also fail project detection (ExitGitHub), and an
	// orchestrator branching on "still unanswered" must not have to read stderr
	// to tell the two apart.
	ExitTimeout = 7
)

// ExitError is an error that carries a specific exit code.
// Use this to return errors with specific exit codes from Cobra commands.
type ExitError struct {
	Code    int
	Message string
}

func (e ExitError) Error() string {
	return e.Message
}

// NewExitError creates a new ExitError with the given code and message.
func NewExitError(code int, format string, args ...interface{}) error {
	return ExitError{
		Code:    code,
		Message: fmt.Sprintf(format, args...),
	}
}

// GetExitCode returns the exit code from an error.
//
// Classification is TYPED, never textual: an error carries [ExitError]
// somewhere in its unwrap chain or it does not. Anything else is ExitGeneric
// (1). Usage errors (2) reach here as ExitError because the two places that
// produce them — cobra's flag parser and cobra's positional-argument
// validators — are converted at the source by usageFlagError and usageArgs.
//
// The previous implementation classified by message substring, which read any
// error text containing "invalid argument" as a usage error. A unix-socket
// dial failure says exactly that ("connect: invalid argument"), so an
// unreachable herdr told orchestrators to fix a command line that was already
// correct. Substrings are gone; do not reintroduce them. A command that needs
// a specific exit code returns NewExitError at the point it knows the reason.
func GetExitCode(err error) int {
	if err == nil {
		return ExitSuccess
	}
	var exitErr ExitError
	if errors.As(err, &exitErr) {
		return exitErr.Code
	}
	return ExitGeneric
}

// usageFlagError converts a cobra/pflag flag-parsing failure ("unknown flag",
// `invalid argument "x" for "--priority" flag`) into an explicit ExitUsage
// error. Installed on the root command; cobra's FlagErrorFunc lookup walks up
// to the parent, so every subcommand — including ones added later — inherits
// it without opting in.
func usageFlagError(_ *cobra.Command, err error) error {
	if err == nil {
		return nil
	}
	// pflag's help sentinel is control flow, not a usage failure.
	if errors.Is(err, pflag.ErrHelp) {
		return err
	}
	var exitErr ExitError
	if errors.As(err, &exitErr) {
		return err
	}
	return NewExitError(ExitUsage, "%v", err)
}

// usageArgs wraps a positional-argument validator so its rejection carries
// ExitUsage explicitly. cobra.ExactArgs and friends return plain errors
// ("accepts 1 arg(s), received 0"); classifying those by message is what
// GetExitCode used to do, so the conversion happens here instead, at the
// validator that knows the failure is about the command line.
//
// A validator that already returns an ExitError keeps its own code — commands
// with a custom Args func can still say "not found" or "no repo".
func usageArgs(validate cobra.PositionalArgs) cobra.PositionalArgs {
	if validate == nil {
		return nil
	}
	return func(cmd *cobra.Command, args []string) error {
		err := validate(cmd, args)
		if err == nil {
			return nil
		}
		var exitErr ExitError
		if errors.As(err, &exitErr) {
			return err
		}
		return NewExitError(ExitUsage, "%v", err)
	}
}

var usageArgsOnce sync.Once

// installUsageArgs wraps every registered command's Args validator once per
// process. Doing it centrally (rather than at each of the ~40 declaration
// sites) means a newly added command is classified correctly by construction.
// Commands that leave Args nil are untouched: cobra's nil behaviour also
// covers "unknown command", which is not a flag/arity failure.
func installUsageArgs() {
	usageArgsOnce.Do(func() {
		var walk func(*cobra.Command)
		walk = func(cmd *cobra.Command) {
			cmd.Args = usageArgs(cmd.Args)
			for _, sub := range cmd.Commands() {
				walk(sub)
			}
		}
		walk(rootCmd)
	})
}

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "tk",
	Short: "Multiplayer issue tracker for AI agents",
	Long: `tk is a multiplayer issue tracker designed for AI agents.

It stores issues as JSON files in .tick/issues/ for easy version control
and conflict-free merging across branches.

Agent-Human Workflow:
  tk approve <id>              Set verdict=approved on awaiting tick
  tk reject <id> <feedback>    Set verdict=rejected with required feedback
  tk next --awaiting=          Get next task awaiting human (human mode)
  tk list --awaiting=          List all tasks awaiting human action
  tk note <id> "msg" --from human  Add human feedback note

Workflow Flags:
  --requires value    Pre-declared approval gate (approval|review|content)
                      Tick routes to human even if agent signals COMPLETE
  --awaiting value    Wait state (work|approval|input|review|content|escalation|checkpoint)
                      Tick assigned to human, skipped by agent

Human-Only Tasks (awaiting=work):
  Use --awaiting work to mark tasks requiring human work (not AI agent work).
  These tasks are skipped by 'tk next' and 'tk ready' (agent queues).

  Examples:
    tk create "Set up AWS credentials" --awaiting work
    tk update abc --awaiting work       # Convert existing task
    tk update abc --awaiting ""         # Return to agent queue
    tk list --awaiting work             # List human-only tasks`,
	Version: Version,
	// Run is intentionally not set - this allows subcommands or help to be shown

	// PersistentPreRunE lazily registers git merge drivers on every command
	// invocation so that fresh clones and CI environments get the drivers
	// without requiring an explicit `tk init`.
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Skip for commands that don't need a git repo or that ARE the merge
		// driver themselves (to avoid recursion/noise).
		skip := map[string]bool{
			"version":        true,
			"upgrade":        true,
			"snippet":        true,
			"merge-file":     true,
			"merge-activity": true,
		}
		if skip[cmd.Name()] {
			return nil
		}

		root, err := repoRoot()
		if err != nil {
			// Not in a git repo — skip silently.
			return nil
		}
		// Best-effort: ignore errors so a driver registration failure
		// never blocks normal tk usage.
		_ = github.CheckAndInstallMergeDrivers(root)
		return nil
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	installUsageArgs()
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// ExecuteArgs runs the command with specific args, returning an error if the command fails.
// This is used when we need to pass args from the legacy run() function.
func ExecuteArgs(args []string) error {
	return ExecuteArgsContext(context.Background(), args)
}

// ExecuteArgsContext is ExecuteArgs with a caller-supplied context. The context
// is propagated to commands via cmd.Context(), which lets callers (tests) stop
// long-running commands such as 'tk board'.
func ExecuteArgsContext(ctx context.Context, args []string) error {
	installUsageArgs()

	// Reset all flags to their default values before each execution.
	// This is necessary because Cobra uses global variables for flag values,
	// and when running multiple commands in the same process (e.g., tests),
	// flag values persist between executions.
	ResetFlags()

	// Reset Cobra's flag tracking for all subcommands.
	// This ensures cmd.Flags().Changed() returns false for flags
	// that weren't provided in the current invocation.
	resetCobraFlags(rootCmd)

	// Cobra only copies the root context into a subcommand whose own context
	// is still nil (cobra command.go: "if cmd.ctx == nil"). After a previous
	// Execute in this process, subcommands keep their stale context, so a new
	// ctx would never reach cmd.Context(). Set it explicitly everywhere.
	setContextAll(rootCmd, ctx)

	rootCmd.SetArgs(args)
	return rootCmd.ExecuteContext(ctx)
}

// setContextAll sets ctx on a command and all of its subcommands.
func setContextAll(cmd *cobra.Command, ctx context.Context) {
	cmd.SetContext(ctx)
	for _, sub := range cmd.Commands() {
		setContextAll(sub, ctx)
	}
}

// CommandNames returns the names of all visible subcommands registered on the
// root command. main.go's legacy dispatch switch must cover every one of them;
// its test uses this to keep the two registries in sync.
func CommandNames() []string {
	var names []string
	for _, c := range rootCmd.Commands() {
		if c.Hidden || c.Name() == "help" || c.Name() == "completion" {
			continue
		}
		names = append(names, c.Name())
	}
	return names
}

// resetCobraFlags resets the Cobra flag tracking for a command and all its subcommands.
// This is necessary because Cobra's Changed() tracking persists across multiple
// Execute() calls in the same process.
func resetCobraFlags(cmd *cobra.Command) {
	cmd.Flags().VisitAll(func(f *pflag.Flag) {
		f.Changed = false
	})
	// Cobra's auto-generated --help flag is read by value, not by Changed. If a
	// prior invocation in this process passed --help, the value sticks to "true"
	// and every later command short-circuits to printing help. Restore it to its
	// default so ExecuteArgs can be reused across commands (tests, legacy run()).
	if helpFlag := cmd.Flags().Lookup("help"); helpFlag != nil {
		_ = helpFlag.Value.Set(helpFlag.DefValue)
		helpFlag.Changed = false
	}
	for _, subCmd := range cmd.Commands() {
		resetCobraFlags(subCmd)
	}
}

// ResetFlags resets all command flags to their default values.
// This must be called before each command execution to prevent flag
// values from persisting across multiple executions in the same process.
func ResetFlags() {
	// Reset list flags
	listAll = false
	listOwner = ""
	listStatus = ""
	listPriority = -1
	listType = ""
	listLabel = ""
	listLabelAny = ""
	listParent = ""
	listTitleContains = ""
	listDescContains = ""
	listNotesContains = ""
	listManual = false
	listAwaiting = ""
	listOverdue = false
	listDueBefore = ""
	listSort = ""
	listJSON = false
	listAwaitingSet = false

	// Reset create flags
	createDescription = ""
	createPriority = 2
	createType = "task"
	createOwner = ""
	createLabels = ""
	createBlockedBy = nil
	createAfter = ""
	createParent = ""
	createDiscoveredFrom = ""
	createAcceptance = ""
	createDefer = ""
	createTargetDate = ""
	createExternalRef = ""
	createManual = false
	createRequires = ""
	createAwaiting = ""
	createJSON = false

	// Reset update flags
	updateTitle = ""
	updateDescription = ""
	updateNotes = ""
	updateStatus = ""
	updatePriority = 0
	updateType = ""
	updateOwner = ""
	updateAddLabels = ""
	updateRemoveLabels = ""
	updateAfter = ""
	updateAcceptance = ""
	updateDefer = ""
	updateTargetDate = ""
	updateExternalRef = ""
	updateParent = ""
	updateManual = ""
	updateBaseBranch = ""
	updateRequires = ""
	updateAwaiting = ""
	updateVerdict = ""
	updateActor = ""
	updateFrom = ""
	updateJSON = false
	updateTitleSet = false
	updateDescriptionSet = false
	updateNotesSet = false
	updateStatusSet = false
	updatePrioritySet = false
	updateTypeSet = false
	updateOwnerSet = false
	updateAddLabelsSet = false
	updateRemoveLabelsSet = false
	updateAfterSet = false
	updateAcceptanceSet = false
	updateDeferSet = false
	updateTargetDateSet = false
	updateExternalRefSet = false
	updateParentSet = false
	updateManualSet = false
	updateBaseBranchSet = false
	updateRequiresSet = false
	updateAwaitingSet = false
	updateVerdictSet = false

	// Reset ready flags
	readyAll = false
	readyOwner = ""
	readyLimit = 0
	readyLabel = ""
	readyLabelAny = ""
	readyTitleContains = ""
	readyDescContains = ""
	readyNotesContains = ""
	readyIncludeManual = false
	readyIncludeAwaiting = false
	readyJSON = false

	// Reset next flags
	nextAll = false
	nextOwner = ""
	nextAwaiting = ""
	nextAwaitingSet = false
	nextEpic = false
	nextIncludeManual = false
	nextJSON = false
	nextAutonomous = false

	// Reset blocked flags
	blockedAll = false
	blockedOwner = ""
	blockedJSON = false

	// Reset note flags
	noteEdit = false
	noteFrom = "agent"

	// Reset close flags
	closeReason = ""
	closeForce = false
	closeJSON = false
	closeActor = ""
	closeFrom = ""

	// Reset show flags
	showJSON = false

	// Reset reopen flags
	reopenJSON = false

	// Reset delete flags
	deleteForce = false

	// Reset deps flags
	depsJSON = false

	// Reset graph flags
	graphAll = false
	graphJSON = false

	// Reset roadmap flags
	roadmapJSON = false

	// Reset status flags
	statusJSON = false

	// Reset stats flags
	statsAll = false
	statsJSON = false

	// Reset labels flags
	labelsJSON = false

	// Reset tui flags
	tuiAll = false
	tuiOwner = ""
	tuiStatus = ""
	tuiPriority = -1
	tuiType = ""
	tuiLabel = ""
	tuiParent = ""

	// Reset import flags
	importJSON = false

	// Reset approve flags
	approveJSON = false
	approveFrom = ""

	// Reset reject flags
	rejectJSON = false
	rejectFrom = ""

	// Reset rebuild flags
	rebuildJSON = false

	// Reset whoami flags
	whoamiJSON = false

	// Reset init flags
	importBeads = false

	// Reset gc flags
	gcDryRun = false
	gcMaxAge = "30d"

	// Reset merge flags
	mergeForce = false
	mergeDeleteBranch = true
	mergeDryRun = false
	mergeYes = false

	// Reset herd wait flags
	herdWaitAgents = nil
	herdWaitTimeout = defaultHerdWaitTimeoutMs
	herdWaitSocket = ""
	herdWaitJSON = false

	// Reset herd spawn flags
	herdSpawnRole = "implement"
	herdSpawnTier = ""
	herdSpawnConfig = ""
	herdSpawnSocket = ""
	herdSpawnBase = ""
	herdSpawnJSON = false
	herdSpawnWait = false
	herdSpawnStartupTimeout = defaultHerdSpawnStartupTimeoutMs
	herdSpawnGateTimeout = defaultHerdSpawnGateTimeoutMs
	herdSpawnPromptTimeout = defaultHerdSpawnPromptTimeoutMs

	// Reset herd reconcile flags
	herdReconcileEpic, herdReconcileConfig, herdReconcileSocket, herdReconcileJSON, herdReconcileAdopt = "", "", "", false, false
	// Reset herd collect flags
	herdCollectEpic, herdCollectJSON = "", false

	// Reset herd dashboard flags
	herdDashboardEpic, herdDashboardSocket, herdDashboardInterval = "", "", defaultHerdDashboardIntervalMs

	// Reset herd cleanup flags
	herdCleanupEpic, herdCleanupSocket, herdCleanupJSON = "", "", false
	herdCleanupPreview, herdCleanupApply = false, false

	// Reset herd paint flags
	herdPaintEpic, herdPaintTick, herdPaintSocket, herdPaintTTLMs, herdPaintSeq, herdPaintDryRun, herdPaintJSON = "", "", "", defaultHerdPaintTTLMs, 0, false, false

	// Reset herd notify flags
	herdNotifyEpic, herdNotifySocket, herdNotifyDryRun, herdNotifyJSON = "", "", false, false

	// Reset board flags
	boardPort = 3000
	boardCloud = false
	boardDev = false
	boardHost = "127.0.0.1"

	// Reset channel flags
	channelSetupToken = ""
	channelSetupAPIBase = ""
	channelSetupTimeout = defaultPairTimeout
	channelStatusOffline = false
	channelStatusCheck = false
	channelStatusAPIBase = ""
	tellChannel = channelTelegram

	// Reset ask flags
	askQuestion = ""
	askJSON = false
	askTimeout = askDefaultTimeout
	askGate = askGateNone
	askAsync = false
	askCollect = false
	askWait = false
	askEscalateAfter = 0

	// Reset answer flags
	answerFrom = ""

	// Reset skills flags
	skillsListJSON = false
	skillsGetFull = false
	skillsGetJSON = false
	skillsInstallDir = ""
	skillsInstallForce = false
	skillsDiffDir = ""
}

// SetVersion allows main.go to set the version at initialization
func SetVersion(v string) {
	Version = v
	rootCmd.Version = v
	// Propagate to internal/skills so 'tk skills list' reports the same
	// version this build's other version surfaces report — see that
	// package's doc.go for why it cannot read main.Version itself.
	skills.SetVersion(v)
}

func init() {
	// Global flags can be added here in the future
	// For example:
	// rootCmd.PersistentFlags().BoolP("json", "j", false, "Output as JSON")

	// Disable the default completion command (can be re-enabled later if needed)
	rootCmd.CompletionOptions.DisableDefaultCmd = true

	// Flag-parse failures are usage errors (exit 2), typed at the source.
	// Subcommands inherit this through cobra's FlagErrorFunc parent lookup.
	rootCmd.SetFlagErrorFunc(usageFlagError)
}
