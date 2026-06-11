package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/pengelbrecht/ticks/internal/github"
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
// If the error is an ExitError, it returns that code.
// For Cobra argument/flag validation errors, returns ExitUsage (2).
// Otherwise, it returns ExitGeneric (1).
func GetExitCode(err error) int {
	if err == nil {
		return ExitSuccess
	}
	if exitErr, ok := err.(ExitError); ok {
		return exitErr.Code
	}
	// Check for Cobra argument validation errors
	errMsg := err.Error()
	if strings.Contains(errMsg, "accepts ") && strings.Contains(errMsg, "arg(s)") {
		return ExitUsage
	}
	if strings.Contains(errMsg, "requires at least") && strings.Contains(errMsg, "arg(s)") {
		return ExitUsage
	}
	if strings.Contains(errMsg, "unknown flag") || strings.Contains(errMsg, "invalid argument") {
		return ExitUsage
	}
	return ExitGeneric
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
	listJSON = false
	listAwaitingSet = false

	// Reset create flags
	createDescription = ""
	createPriority = 2
	createType = "task"
	createOwner = ""
	createLabels = ""
	createBlockedBy = nil
	createParent = ""
	createDiscoveredFrom = ""
	createAcceptance = ""
	createDefer = ""
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
	updateAcceptance = ""
	updateDefer = ""
	updateExternalRef = ""
	updateParent = ""
	updateManual = ""
	updateBaseBranch = ""
	updateRequires = ""
	updateAwaiting = ""
	updateVerdict = ""
	updateActor = ""
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
	updateAcceptanceSet = false
	updateDeferSet = false
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

	// Reset view flags
	viewAll = false
	viewOwner = ""
	viewStatus = ""
	viewPriority = -1
	viewType = ""
	viewLabel = ""
	viewParent = ""

	// Reset import flags
	importJSON = false

	// Reset approve flags
	approveJSON = false

	// Reset reject flags
	rejectJSON = false

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

	// Reset board flags
	boardPort = 3000
	boardCloud = false
	boardDev = false
	boardHost = "127.0.0.1"
}

// SetVersion allows main.go to set the version at initialization
func SetVersion(v string) {
	Version = v
	rootCmd.Version = v
}

func init() {
	// Global flags can be added here in the future
	// For example:
	// rootCmd.PersistentFlags().BoolP("json", "j", false, "Output as JSON")

	// Disable the default completion command (can be re-enabled later if needed)
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}
