package sandbox

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// This file is the per-repo sandbox definition in force: the `[sandbox]` table
// of `.tick/runners.toml`, read out of one checkout and applied to it.
//
// SECURITY BOUNDARY. `setup` runs arbitrary shell inside a sandbox that holds
// the run's credentials, before any worker starts. Its only source is the
// tracked, PR-reviewed config file in the checkout — which, in a cloud run, is
// the submitted SHA, and in a local run is the base commit the worktree was
// created from. Nothing else authorises a setup command: not a tick note, not
// a model's suggestion, not a signal payload, not an API parameter, not an
// environment variable. There is deliberately no option on [SetupOptions] that
// supplies commands, so there is nothing for a caller to be talked into.
// Adding capability to a sandbox is a pull request, not a dashboard click.
//
// One implementation serves both substrates: the cloud entrypoint calls it
// through `tk sandbox setup` after the clone, and `tk herd spawn` calls it on
// a fresh worktree. A local worker therefore warms identically to a cloud one,
// off the same table.

// stampDirName is the directory inside the checkout's git dir where the record
// of what was provisioned lives.
const stampDirName = "ticks"

// stampFileName records the fingerprint of the setup that last succeeded.
const stampFileName = "sandbox-setup"

// stampFormat prefixes the fingerprint so a future change to what is hashed
// invalidates every old stamp instead of silently matching one.
const stampFormat = "ticks-sandbox-setup-v1"

// SetupOptions is one warm of one checkout.
//
// Note what is absent: any way to pass commands in. The commands come from the
// tracked config at Root, or the call does nothing.
type SetupOptions struct {
	// Root is the checkout to warm. Its `.tick/runners.toml` is the only
	// source of setup commands.
	Root string
	// Out receives progress and the commands' own output. Nil discards it,
	// which no caller should want: a warm step's output is the only evidence
	// of what a sandbox was given.
	Out io.Writer
	// Force re-runs setup even when the stamp says this checkout is already
	// warm. Setup is required to be idempotent, so this is safe by contract.
	Force bool
	// Stamp overrides the stamp file's path. Empty derives it from the
	// checkout's git directory, which is where it belongs: outside the
	// worktree, so it can never land in a worker's commit, and gone when the
	// checkout is.
	Stamp string
	// Env is the environment the commands run with. Empty inherits this
	// process's. It is never a source of commands.
	Env []string
}

// SetupResult reports what one warm did. Declared and Ran differ exactly when
// the checkout was already warm.
type SetupResult struct {
	// Declared is how many setup commands the tracked config carries.
	Declared int
	// Ran is the commands executed, in order.
	Ran []string
	// Skipped reports that the stamp matched and nothing needed doing.
	Skipped bool
	// Stamp is the stamp file's path, or "" when this checkout has nowhere to
	// keep one (no git directory) and setup therefore runs every time.
	Stamp string
	// Fingerprint is the identity of the setup that ran or was skipped.
	Fingerprint string
}

// Setup runs the checkout's declared setup commands, once.
//
// "Once" is per checkout, not per repository: the stamp lives in the
// checkout's git directory, so a fresh clone — a rebooted sandbox, a new
// worker worktree — warms again, which is correct, because its working tree is
// as cold as its caches are warm. A repeat call in the same checkout is a
// no-op. Commands are required to be idempotent regardless; the stamp buys
// time, never correctness.
//
// A failing command is a stop that names the command, and it leaves no stamp:
// a half-provisioned sandbox that reports itself warm is worse than a cold
// one.
func Setup(ctx context.Context, opts SetupOptions) (*SetupResult, error) {
	out := opts.Out
	if out == nil {
		out = io.Discard
	}

	cfg, err := config.LoadRepo(opts.Root)
	if err != nil {
		// An unreadable config authorises nothing. It is never a reason to run
		// the part that happened to parse.
		return nil, fmt.Errorf("sandbox setup: %w", err)
	}
	commands := cfg.SandboxSetup()
	res := &SetupResult{Declared: len(commands)}
	if len(commands) == 0 {
		// Silence, deliberately: the 99% path declares nothing, and a warm
		// hook that narrates its own absence on every spawn is noise. The
		// caller has Declared == 0 and can say so where it is worth saying —
		// `tk sandbox setup` does, in a boot log somebody reads.
		return res, nil
	}

	res.Fingerprint = fingerprint(commands)
	res.Stamp = opts.Stamp
	if res.Stamp == "" {
		res.Stamp = stampPath(opts.Root)
	}
	if res.Stamp == "" {
		fmt.Fprintln(out, "sandbox: no git directory to record the warm in; setup runs every time (it is required to be idempotent)")
	} else if !opts.Force && stampMatches(res.Stamp, res.Fingerprint) {
		fmt.Fprintf(out, "sandbox: already warm — %d setup command(s) ran in this checkout\n", len(commands))
		res.Skipped = true
		return res, nil
	}

	env := opts.Env
	if len(env) == 0 {
		env = os.Environ()
	}
	for i, cmd := range commands {
		label := cmd.Command
		if cmd.Description != "" {
			label = cmd.Description + ": " + cmd.Command
		}
		fmt.Fprintf(out, "sandbox: [%d/%d] %s\n", i+1, len(commands), label)
		c := exec.CommandContext(ctx, "bash", "-c", cmd.Command)
		c.Dir = opts.Root
		c.Env = env
		c.Stdout = out
		c.Stderr = out
		if err := c.Run(); err != nil {
			// Distinct failure classes stay distinct: the command, its
			// position and its status, so a log read after the sandbox is gone
			// says which line of tracked config to fix.
			return res, fmt.Errorf("sandbox setup: [%d/%d] %s: %w (from %s in the checkout at the submitted commit)",
				i+1, len(commands), label, err, config.FileName)
		}
		res.Ran = append(res.Ran, cmd.Command)
	}

	if res.Stamp != "" {
		if err := writeStamp(res.Stamp, res.Fingerprint); err != nil {
			// The warm succeeded; only the record of it did not. That costs
			// the next call a repeat of idempotent work, so it is reported and
			// not failed.
			fmt.Fprintf(out, "sandbox: warning: cannot record the warm in %s: %v\n", res.Stamp, err)
		}
	}
	fmt.Fprintf(out, "sandbox: %d setup command(s) green\n", len(res.Ran))
	return res, nil
}

// Toolchain reports the `tool@version` pins the checkout declares, in file
// order. Empty when the repository declares none, which is the common case:
// the base image already carries this factory's toolchain set, and the
// ecosystem's own pins (go.mod, packageManager, .node-version) are read by the
// image without anything being declared here.
func Toolchain(root string) ([]string, error) {
	cfg, err := config.LoadRepo(root)
	if err != nil {
		return nil, fmt.Errorf("sandbox toolchain: %w", err)
	}
	return cfg.SandboxToolchain(), nil
}

// Image reports the image reference this checkout's sandbox boots: the one it
// declares, else base. The second return says which, so a caller can report a
// declared image loudly rather than substituting one silently.
func Image(root, base string) (string, bool, error) {
	cfg, err := config.LoadRepo(root)
	if err != nil {
		return "", false, fmt.Errorf("sandbox image: %w", err)
	}
	if declared := cfg.SandboxImage(); declared != "" {
		return declared, true, nil
	}
	return base, false, nil
}

// BaseImage is the version-pinned base image reference for a tk version. It is
// what a sandbox boots when the repository declares nothing — the same string
// [DefaultImage] derives from the Dockerfile's own pin, available to a caller
// that has a version but not this repository's checkout.
func BaseImage(tkVersion string) string {
	return ImageName + ":" + tkVersion
}

// fingerprint identifies one setup declaration. Descriptions are deliberately
// excluded: they are documentation, and re-warming a sandbox because a comment
// was reworded is time spent for nothing.
func fingerprint(commands []*config.Command) string {
	h := sha256.New()
	fmt.Fprintf(h, "%s\n%d\n", stampFormat, len(commands))
	for _, c := range commands {
		fmt.Fprintf(h, "%d:%s\n", len(c.Command), c.Command)
	}
	return hex.EncodeToString(h.Sum(nil))
}

// stampPath is the stamp file inside the checkout's git directory, or "" when
// there is none.
//
// The git directory, not the worktree: a file in the worktree would be swept
// into a worker's `git add -A` commit, and a file in a shared cache would
// declare a fresh checkout warm when its working tree is empty. For a linked
// worktree `--absolute-git-dir` is that worktree's own private directory, so
// each worker stamps itself.
func stampPath(root string) string {
	cmd := exec.Command("git", "-C", root, "rev-parse", "--absolute-git-dir")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	dir := strings.TrimSpace(string(out))
	if dir == "" {
		return ""
	}
	return filepath.Join(dir, stampDirName, stampFileName)
}

func stampMatches(path, want string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(b)) == want
}

func writeStamp(path, value string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(value+"\n"), 0o644)
}
