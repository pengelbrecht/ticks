package cmd

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/spf13/cobra"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
	"github.com/pengelbrecht/ticks/internal/sandbox"
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
	sandboxCmd.AddCommand(sandboxImageCmd)
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
