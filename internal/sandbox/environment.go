package sandbox

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sort"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// EnvironmentOptions describes one run-start pre-flight of one checkout.
// Environment checks come only from the checkout's validated
// `[environment.commands]` table; there is deliberately no field that accepts
// commands from a caller.
type EnvironmentOptions struct {
	Root string
	Out  io.Writer
	Env  []string
	// Timeout is the maximum time for each check. Zero disables the per-check
	// deadline; callers that run in a sandbox should set one.
	Timeout time.Duration
}

// EnvironmentResult reports the checks that were declared and the checks that
// failed. A zero Declared value is a successful, explicit no-op — it is not the
// same as a config that could not be loaded, which returns an error.
type EnvironmentResult struct {
	Declared int
	Passed   int
	Failed   []string
}

// Environment runs the checkout's validated run-start checks in stable command
// id order. It is the single reader and executor for `[environment.commands]`
// used by both the cloud entrypoint and direct `tk sandbox environment` calls.
// A failing check does not prevent later checks from running: the resulting log
// should show the complete state of the environment before the boot stops.
func Environment(ctx context.Context, opts EnvironmentOptions) (*EnvironmentResult, error) {
	out := opts.Out
	if out == nil {
		out = io.Discard
	}

	cfg, err := config.LoadRepo(opts.Root)
	if err != nil {
		fmt.Fprintf(out, "sandbox: environment checks not found — cannot load %s: %v\n", config.FileName, err)
		return nil, fmt.Errorf("sandbox environment: %w", err)
	}

	ids := environmentIDs(cfg)
	result := &EnvironmentResult{Declared: len(ids)}
	if len(ids) == 0 {
		fmt.Fprintf(out, "sandbox: no [environment.commands] in %s — nothing to check\n", config.FileName)
		return result, nil
	}

	env := opts.Env
	if len(env) == 0 {
		env = os.Environ()
	}
	for index, id := range ids {
		command := cfg.Environment.Commands[id]
		name := environmentCheckName(id, command)
		fmt.Fprintf(out, "sandbox: [%d/%d] running %s\n", index+1, len(ids), name)

		checkCtx := ctx
		cancel := func() {}
		if opts.Timeout > 0 {
			checkCtx, cancel = context.WithTimeout(ctx, opts.Timeout)
		}
		check := exec.CommandContext(checkCtx, "bash", "-c", command.Command)
		check.Dir = opts.Root
		check.Env = env
		check.Stdout = out
		check.Stderr = out
		err := check.Run()
		cancel()
		if err == nil {
			result.Passed++
			fmt.Fprintf(out, "sandbox: [%d/%d] PASS  %s\n", index+1, len(ids), name)
			continue
		}

		result.Failed = append(result.Failed, name)
		if checkCtx.Err() == context.DeadlineExceeded {
			fmt.Fprintf(out, "sandbox: [%d/%d] FAILED  %s (timed out)\n", index+1, len(ids), name)
		} else if exitErr, ok := err.(*exec.ExitError); ok {
			fmt.Fprintf(out, "sandbox: [%d/%d] FAILED  %s (exit %d)\n", index+1, len(ids), name, exitErr.ExitCode())
		} else {
			fmt.Fprintf(out, "sandbox: [%d/%d] FAILED  %s (%v)\n", index+1, len(ids), name, err)
		}
	}

	if len(result.Failed) == 0 {
		fmt.Fprintf(out, "sandbox: %d of %d environment checks green\n", result.Passed, result.Declared)
		return result, nil
	}

	fmt.Fprintf(out, "sandbox: environment pre-flight red: %d of %d checks failed\n", len(result.Failed), result.Declared)
	for _, name := range result.Failed {
		fmt.Fprintf(out, "sandbox:   failing check: %s\n", name)
	}
	return result, fmt.Errorf("environment pre-flight failed: %d of %d checks failed", len(result.Failed), result.Declared)
}

func environmentIDs(cfg *config.Config) []string {
	if cfg == nil || cfg.Environment == nil || len(cfg.Environment.Commands) == 0 {
		return nil
	}
	ids := make([]string, 0, len(cfg.Environment.Commands))
	for id := range cfg.Environment.Commands {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}

func environmentCheckName(id string, command *config.Command) string {
	if command.Description != "" {
		return command.Description + ": " + command.Command
	}
	return id + ": " + command.Command
}
