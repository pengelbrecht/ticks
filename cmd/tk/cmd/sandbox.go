package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/sandbox"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// `tk sandbox` is the per-repo sandbox definition — the `[sandbox]` table of
// `.tick/runners.toml` — applied to a checkout.
//
// It exists so the cloud entrypoint and `tk herd spawn` warm identically off
// one implementation instead of two: the container shells out to
// `tk sandbox setup` after its clone, the spawner calls the same package on a
// fresh worktree. A repository that declares nothing gets the base image and a
// no-op, which is the 99% path.
//
// The commands come from the tracked file in the checkout and from nowhere
// else. There is deliberately no flag that supplies one.

var (
	sandboxRoot         string
	sandboxForce        bool
	sandboxStamp        string
	sandboxTkVerRaw     string
	sandboxDeclaredOnly bool
	sandboxModelRole    string
	sandboxModelTier    string
	sandboxPromptTick   string
	sandboxPromptBranch string
	sandboxPromptBase   string
)

var sandboxCmd = &cobra.Command{
	Use:   "sandbox",
	Short: "Inspect and apply this repo's [sandbox] declaration",
	Long: `Report and apply the ` + "`[sandbox]`" + ` table of .tick/runners.toml.

A repository declares its own sandbox in tracked config: the image it boots,
extra toolchain provisioned through the version manager the base image ships,
and idempotent setup commands that warm its caches. Declaring nothing — the
usual case — means the version-pinned base image and no setup.

The setup commands run arbitrary shell inside a sandbox that holds a run's
credentials, so they are read ONLY from the tracked, PR-reviewed config in the
checkout: never from a tick note, a model, a signal payload or an API
parameter. Adding capability to a sandbox is a pull request.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var sandboxImageCmd = &cobra.Command{
	Use:   "image",
	Short: "Print the image reference this repo's sandbox boots",
	Long: `Print the image a sandbox for this checkout boots.

That is ` + "`sandbox.image`" + ` when the repository declares one, else the base image
pinned to this tk version. Whatever boots a sandbox takes the reference as a
parameter, so this is the value it asks for.`,
	Args: cobra.NoArgs,
	RunE: runSandboxImage,
}

var sandboxToolchainCmd = &cobra.Command{
	Use:   "toolchain",
	Short: "Print the extra tool@version pins this repo declares",
	Long: `Print the ` + "`sandbox.toolchain`" + ` pins, one per line, in file order.

These are the tools the base image does not carry, provisioned through its
version manager into the project's persistent cache on first run and warm
after. Ecosystem pins the image already reads on its own (go.mod,
package.json's packageManager, .node-version, .tool-versions) do not belong
here and are not printed.`,
	Args: cobra.NoArgs,
	RunE: runSandboxToolchain,
}

var sandboxModelCmd = &cobra.Command{
	Use:   "model",
	Short: "Print the model this repo routes the orchestrator to",
	Long: `Print the model a cloud container booting on this checkout runs on.

With no ` + "`--role`" + `, that is the orchestrator's cell: ` + "`orchestrator.model`" + ` when the
repository sets one, else the role/tier table resolved for role ` + "`orchestrator`" + `
at the frontier tier — which falls back to ` + "`roles.implement`" + ` like any other
role the config does not name.

With ` + "`--role`" + `, it is that role's cell of the role/tier table, at ` + "`--tier`" + ` when
one is given. A per-tick worker container asks for ` + "`--role implement`" + `: the
orchestrator's frontier cell plans waves and reviews epics, and routing every
worker at it is a silent multiple on a wave's bill. ` + "`orchestrator.model`" + ` is not
consulted for a named role — that entry is the orchestrator's.

Nothing is printed when the config routes no model. That is not a default: a
harness handed no model does not fail, it hangs, so whatever boots one refuses
to start rather than guessing a model on the repository's behalf.`,
	Args: cobra.NoArgs,
	RunE: runSandboxModel,
}

var sandboxSubstrateCmd = &cobra.Command{
	Use:   "substrate",
	Short: "Print the dispatch substrate a run on this checkout resolves",
	Long: `Print the substrate this run dispatches workers through, and the note to record.

Two lines on stdout, in this order: the resolved substrate (` + "`herdr`" + `,
` + "`harness`" + ` or ` + "`cloud`" + `), and the ` + "`runner-state:`" + ` line to record on the epic with
` + "`tk note`" + `. Why it resolved that way — and the wave width that comes with it —
goes to stderr, where a boot log reads it.

Resolution is the decision procedure of runners-config.md, with one addition:
$` + herdconfig.SubstrateEnvVar + ` overrides ` + "`[orchestration].substrate`" + ` for this run.
That is how whatever BOOTS a run states the substrate that is effective where it
actually executes — a cloud sandbox has no herdr server and never will in Phase
1, while the same repository's local runs orchestrate through herdr. The
checkout is read, never rewritten: the file keeps saying what the repository
means everywhere else.

An override to ` + "`harness`" + ` or ` + "`cloud`" + ` is terminal and probes nothing.
An override to ` + "`herdr`" + ` probes read-only exactly as a pinned ` + "`herdr`" + ` does,
and degrades explicitly — announced and noted — when herdr is unavailable. A
value that is not a substrate is a stop, never a silent fall back to the file.

` + "`cloud`" + ` is terminal for a stronger reason than ` + "`harness`" + ` is: it says
WHERE the workers run, and a herdr server listening on this machine cannot
change that. It says nothing about where the ORCHESTRATOR sits — a local session
driving cloud workers is a supported shape — which is also why a worker
container running ON that substrate is told ` + "`harness`" + ` for itself rather
than inheriting the repository's ` + "`cloud`" + ` declaration and dispatching
containers from inside a container.

Every resolution is stated on stderr, in one of two registers. A pinned
` + "`herdr`" + ` that cannot be had is loud: an assertion the environment refused.
` + "`auto`" + ` finding no herdr is quiet: that is what ` + "`auto`" + ` asks for, and a
repository that announced a degradation on every ordinary run would teach its
operator to ignore the one that matters.`,
	Args: cobra.NoArgs,
	RunE: runSandboxSubstrate,
}

var sandboxSetupCmd = &cobra.Command{
	Use:   "setup",
	Short: "Run this repo's declared setup commands, once per checkout",
	Long: `Run the ` + "`sandbox.setup`" + ` commands of .tick/runners.toml, in order, once.

"Once" is per checkout: the record of what ran lives in the checkout's git
directory, so a fresh clone or a new worker worktree warms again — its working
tree is as cold as its caches are warm — and a repeat call in the same checkout
does nothing. Setup commands must be idempotent regardless; the record buys
time, never correctness.

A failing command is a stop that names it, and leaves no record: a
half-provisioned sandbox that reports itself warm is worse than a cold one.`,
	Args: cobra.NoArgs,
	RunE: runSandboxSetup,
}

var sandboxEnvironmentCmd = &cobra.Command{
	Use:   "environment",
	Short: "Run this repo's declared environment checks",
	Long: `Run the run-start checks from [environment.commands] in .tick/runners.toml.

The checks are verification only: they test the checkout's environment before
the first wave and never ask for human action. A repository with no checks is a
successful, explicit no-op; an unreadable config or a failing check is a stop.`,
	Args: cobra.NoArgs,
	RunE: runSandboxEnvironment,
}

func init() {
	sandboxCmd.PersistentFlags().StringVar(&sandboxRoot, "root", "",
		"checkout to read .tick/runners.toml from (default: the repo containing the working directory)")
	sandboxImageCmd.Flags().StringVar(&sandboxTkVerRaw, "tk-version", "",
		"tk version the base image is pinned to (default: this tk's version)")
	sandboxImageCmd.Flags().BoolVar(&sandboxDeclaredOnly, "declared-only", false,
		"print only an image the repository itself declares, and nothing when it declares none")
	sandboxSetupCmd.Flags().BoolVar(&sandboxForce, "force", false,
		"run the setup commands even when this checkout is already warm")
	sandboxSetupCmd.Flags().StringVar(&sandboxStamp, "stamp", "",
		"path of the warm record (default: <git-dir>/ticks/sandbox-setup)")
	sandboxModelCmd.Flags().StringVar(&sandboxModelRole, "role", "",
		"role cell to resolve (default: the orchestrator's own cell)")
	sandboxModelCmd.Flags().StringVar(&sandboxModelTier, "tier", "",
		"tier to resolve --role at (economy, balanced, strong, frontier)")
	sandboxWorkerPromptCmd.Flags().StringVar(&sandboxPromptTick, "tick", "",
		"the tick the worker implements (required)")
	sandboxWorkerPromptCmd.Flags().StringVar(&sandboxPromptBranch, "branch", "",
		"the branch the worker works on (default: tick/<epic>/<tick>)")
	sandboxWorkerPromptCmd.Flags().StringVar(&sandboxPromptBase, "base", "",
		"the base commit the branch was cut from, named in the prompt so the worker can verify it")
	sandboxCmd.AddCommand(sandboxWorkerPromptCmd)
	sandboxCmd.AddCommand(sandboxImageCmd)
	sandboxCmd.AddCommand(sandboxModelCmd)
	sandboxCmd.AddCommand(sandboxSubstrateCmd)
	sandboxCmd.AddCommand(sandboxToolchainCmd)
	sandboxCmd.AddCommand(sandboxSetupCmd)
	sandboxCmd.AddCommand(sandboxEnvironmentCmd)
	rootCmd.AddCommand(sandboxCmd)
}

// sandboxCheckout resolves the checkout to read. `--root` wins so the caller
// that has just cloned somewhere (the sandbox entrypoint) does not have to cd.
func sandboxCheckout() (string, error) {
	if sandboxRoot != "" {
		return sandboxRoot, nil
	}
	root, err := repoRoot()
	if err != nil {
		return "", NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}
	return root, nil
}

func runSandboxImage(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}
	version := sandboxTkVerRaw
	if version == "" {
		version = Version
	}
	ref, declared, err := sandbox.Image(root, sandbox.BaseImage(version))
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	if sandboxDeclaredOnly && !declared {
		// Silence is the answer: this repository asks for no image of its own,
		// which is the 99% path. A caller comparing what it booted against
		// what the repository wants has nothing to compare.
		return nil
	}
	fmt.Fprintln(cmd.OutOrStdout(), ref)
	if declared {
		// Never silent: a repository asking for its own image is a fact the
		// operator reading a boot log should see, not a value substituted
		// behind their back.
		fmt.Fprintf(cmd.ErrOrStderr(), "note: %s declares this image; whatever boots the sandbox must pass it\n", root)
	}
	return nil
}

func runSandboxModel(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}
	if sandboxModelTier != "" && !herdSpawnKnownTier(sandboxModelTier) {
		return NewExitError(ExitUsage, "unknown --tier %q (want one of %s)",
			sandboxModelTier, strings.Join(herdSpawnTierNames(), ", "))
	}
	var routed sandbox.RoutedModel
	var err2 error
	if sandboxModelRole == "" {
		routed, err2 = sandbox.OrchestratorModel(root)
	} else {
		routed, err2 = sandbox.RoleModel(root, sandboxModelRole, herdconfig.Tier(sandboxModelTier))
	}
	if err2 != nil {
		return ExitError{Code: ExitGeneric, Message: err2.Error()}
	}
	if routed.Model == "" {
		// Silence on stdout is the answer a caller parses; the reason goes to
		// stderr, so a boot log says WHY there is no model rather than only
		// that there is none.
		if sandboxModelRole == "" {
			fmt.Fprintf(cmd.ErrOrStderr(),
				"note: %s routes no model for the orchestrator — set [orchestrator].model, or a model on the role it falls back to ([roles.implement])\n",
				herdconfig.FileName)
		} else {
			fmt.Fprintf(cmd.ErrOrStderr(),
				"note: %s routes no model for role %s — set a model on [roles.%s] (or on [roles.implement], which it falls back to)\n",
				herdconfig.FileName, sandboxModelRole, sandboxModelRole)
		}
		return nil
	}
	fmt.Fprintln(cmd.OutOrStdout(), routed.Model)
	fmt.Fprintf(cmd.ErrOrStderr(), "note: routed by %s\n", routed.Source)
	return nil
}

func runSandboxSubstrate(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}
	resolved, err := sandbox.OrchestratorSubstrate(cmd.Context(), sandbox.SubstrateOptions{
		Root:     root,
		Override: os.Getenv(herdconfig.SubstrateEnvVar),
	})
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}

	// stdout is the machine contract: the substrate a script acts on, then the
	// note a run records. Both, because a caller that had to derive the note
	// itself would derive a second spelling of it.
	fmt.Fprintln(cmd.OutOrStdout(), string(resolved.Substrate))
	fmt.Fprintln(cmd.OutOrStdout(), resolved.NoteLine())

	// stderr is the reason, and there is always one. A degradation or an
	// override is stated loudly because the protocol requires it; the ordinary
	// paths state themselves quietly, because a boot log is the only record an
	// ephemeral sandbox leaves and "harness" with no explanation beside it is
	// indistinguishable from a run that never looked.
	fmt.Fprintf(cmd.ErrOrStderr(), "note: %s\n", resolved.Resolution())
	if resolved.MaxParallel > 0 {
		// The other `[orchestration]` key a cloud boot inherits from a local
		// pin. It is honoured, not overridden — but under the harness substrate
		// it means concurrent subagents inside ONE sandbox rather than
		// independent panes, which is worth saying out loud.
		fmt.Fprintf(cmd.ErrOrStderr(), "note: wave width %d from %s [orchestration].max_parallel",
			resolved.MaxParallel, herdconfig.FileName)
		switch resolved.Substrate {
		case herdconfig.SubstrateHarness:
			fmt.Fprint(cmd.ErrOrStderr(), " — under the harness substrate that is concurrent subagents in one sandbox")
		case herdconfig.SubstrateCloud:
			fmt.Fprint(cmd.ErrOrStderr(), " — under the cloud substrate that is concurrent worker containers, and a deployment's own instance ceiling can lower it further")
		}
		fmt.Fprintln(cmd.ErrOrStderr())
		// Said once, here, because this line used to be the whole of the
		// width: run_62c289d1 printed it and then dispatched seven. It is now
		// enforced where a dispatch is admitted, so a reader of the boot log
		// knows the number is binding rather than advisory.
		fmt.Fprintf(cmd.ErrOrStderr(),
			"note: the width is enforced on the dispatch path — claiming a %d+1th tick in a wave (tk update --status in_progress, tk herd spawn) is refused with exit %d until a slot frees\n",
			resolved.MaxParallel, ExitWaveFull)
	}
	return nil
}

func runSandboxToolchain(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}
	specs, err := sandbox.Toolchain(root)
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	for _, spec := range specs {
		fmt.Fprintln(cmd.OutOrStdout(), spec)
	}
	return nil
}

func runSandboxSetup(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}
	res, err := sandbox.Setup(cmd.Context(), sandbox.SetupOptions{
		Root:  root,
		Out:   cmd.OutOrStdout(),
		Force: sandboxForce,
		Stamp: sandboxStamp,
	})
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	if res.Declared == 0 {
		fmt.Fprintf(cmd.OutOrStdout(), "sandbox: no [sandbox] setup in %s — nothing to warm\n", herdconfig.FileName)
	}
	return nil
}

func runSandboxEnvironment(cmd *cobra.Command, args []string) error {
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}

	_, err = sandbox.Environment(cmd.Context(), sandbox.EnvironmentOptions{
		Root:    root,
		Out:     cmd.OutOrStdout(),
		Timeout: sandboxEnvironmentTimeout(),
	})
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	return nil
}

func sandboxEnvironmentTimeout() time.Duration {
	const defaultTimeout = 120 * time.Second
	raw := os.Getenv("TICKS_PREFLIGHT_TIMEOUT")
	if raw == "" {
		return defaultTimeout
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return defaultTimeout
	}
	return time.Duration(seconds) * time.Second
}

// ---------------------------------------------------------------------------
// tk sandbox worker-prompt
//
// The job one per-tick worker container is given, rendered from the tracker in
// the checkout it has just cloned.
//
// It exists so the container's entrypoint (cloud/sandbox/worker.sh) never
// learns the tracker format — the same delegation as `tk sandbox model` and
// `tk sandbox setup` — and, more importantly, so a container-per-tick worker
// and a herdr-pane worker are handed the SAME job. Both render
// internal/herd/spawn.BuildPrompt. Two templates for one substrate boundary is
// the shape of divergence this repository has already paid for once, and it
// would show up as two substrates disagreeing about what a tick asked for.
//
// The container addendum is the only difference, and it is the difference that
// is REAL: a herdr worker lives in a worktree beside its orchestrator, while
// this one lives in a container that is about to be destroyed, and what
// survives is what its entrypoint pushes.
// ---------------------------------------------------------------------------

var sandboxWorkerPromptCmd = &cobra.Command{
	Use:   "worker-prompt",
	Short: "Print the prompt a per-tick worker container runs on",
	Long: `Print the job one per-tick worker container is given for a tick.

Rendered from the tick in this checkout with the same template ` + "`tk herd spawn`" + `
gives a herdr worker, plus the facts that are true only in a container: the
checkout is a clone rather than a worktree, nothing but the pushed branch
survives, and the entrypoint — not the agent — commits the report and pushes.

The tick is read from the checkout and from nowhere else, so what a worker is
asked to do comes from the tracker state at the submitted SHA.`,
	Args: cobra.NoArgs,
	RunE: runSandboxWorkerPrompt,
}

func runSandboxWorkerPrompt(cmd *cobra.Command, args []string) error {
	if sandboxPromptTick == "" {
		return NewExitError(ExitUsage, "--tick is required: a worker container implements exactly one tick")
	}
	root, err := sandboxCheckout()
	if err != nil {
		return err
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(sandboxPromptTick)
	if err != nil {
		// The same boundary every other lookup draws: only an ABSENT tick is
		// 4. A tick file that exists and cannot be parsed is a real failure —
		// booting a worker on top of damaged state is worse than not booting.
		return notFoundIfMissing(fmt.Sprintf("failed to read tick %s", sandboxPromptTick), err)
	}

	var epic tick.Tick
	if t.Parent != "" {
		if parent, err := store.Read(t.Parent); err == nil {
			epic = parent
		} else {
			epic.ID = t.Parent
		}
	}

	branch := sandboxPromptBranch
	if branch == "" {
		branch = sandbox.WorkerBranch(epic.ID, t.ID)
	}

	prompt := spawn.BuildPrompt(spawn.PromptInput{
		TickID:      t.ID,
		Title:       t.Title,
		Description: t.Description,
		Acceptance:  t.AcceptanceCriteria,
		EpicID:      epic.ID,
		EpicTitle:   epic.Title,
		Branch:      branch,
		Base:        sandboxPromptBase,
	})

	fmt.Fprint(cmd.OutOrStdout(), prompt)
	fmt.Fprint(cmd.OutOrStdout(), sandbox.WorkerPromptAddendum(t.ID, branch))
	return nil
}
