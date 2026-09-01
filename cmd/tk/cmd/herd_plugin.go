package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

// The herdr-ticks plugin, from tk's side: is it installed, enabled, and does it
// actually carry the guard hook?
//
// This exists because the guard's mechanical trigger is the plugin's
// pane.agent_status_changed hook, and that dependency failed silently in the
// worst possible way. Field-observed 2026-09-01: the plugin was installed and
// enabled, so every "is the plugin there?" check would have passed — and it was
// pinned to a commit three weeks older than guard-hook.sh, so the guard was
// never invoked once. Presence is not capability.
//
// Hence the check is for the HOOK, never for a version string: the plugin
// reports version "0.1.0" both before and after the guard landed, so a version
// comparison would have reported healthy throughout.

const (
	// tickPluginID is the plugin's own manifest id.
	tickPluginID = "pengelbrecht.herdr-ticks"
	// tickPluginSource is the install coordinate: owner/repo/subdir.
	tickPluginSource = "pengelbrecht/ticks/plugins/herdr-ticks"
	// guardHookScript is the capability marker. A plugin whose event table does
	// not mention it cannot invoke tk herd guard, whatever its version says.
	guardHookScript = "guard-hook.sh"
)

type pluginEvent struct {
	On      string   `json:"on"`
	Command []string `json:"command"`
}

type pluginEntry struct {
	PluginID string        `json:"plugin_id"`
	Version  string        `json:"version"`
	Enabled  bool          `json:"enabled"`
	Events   []pluginEvent `json:"events"`
	Source   struct {
		ResolvedCommit string `json:"resolved_commit"`
	} `json:"source"`
}

// pluginStatus is what the command reports and what spawn's warning branches on.
type pluginStatus struct {
	HerdrPresent bool   `json:"herdr_present"`
	Installed    bool   `json:"installed"`
	Enabled      bool   `json:"enabled"`
	GuardCapable bool   `json:"guard_capable"`
	Version      string `json:"version,omitempty"`
	Commit       string `json:"commit,omitempty"`
}

// healthy reports whether the guard can actually fire.
func (s pluginStatus) healthy() bool {
	return s.Installed && s.Enabled && s.GuardCapable
}

// problem names the single most useful thing wrong, or "" when healthy.
func (s pluginStatus) problem() string {
	switch {
	case !s.HerdrPresent:
		return "herdr is not on PATH"
	case !s.Installed:
		return "the herdr-ticks plugin is not installed"
	case !s.Enabled:
		return "the herdr-ticks plugin is installed but disabled"
	case !s.GuardCapable:
		return "the installed herdr-ticks plugin predates the guard hook, so the orchestrator watchdog can never fire"
	}
	return ""
}

// inspectTicksPlugin asks herdr what is installed. It never starts a server,
// workspace or TUI: `herdr plugin list` is read-only, unlike bare `herdr`.
func inspectTicksPlugin(ctx context.Context) pluginStatus {
	var st pluginStatus

	bin := strings.TrimSpace(os.Getenv("HERDR_BIN_PATH"))
	if bin == "" {
		bin = "herdr"
	}
	if _, err := exec.LookPath(bin); err != nil {
		return st
	}
	st.HerdrPresent = true

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, bin, "plugin", "list", "--json").Output()
	if err != nil {
		return st
	}

	var envelope struct {
		Result struct {
			Plugins []pluginEntry `json:"plugins"`
		} `json:"result"`
	}
	if err := json.Unmarshal(out, &envelope); err != nil {
		return st
	}

	for _, p := range envelope.Result.Plugins {
		if p.PluginID != tickPluginID {
			continue
		}
		st.Installed = true
		st.Enabled = p.Enabled
		st.Version = p.Version
		st.Commit = p.Source.ResolvedCommit
		for _, e := range p.Events {
			for _, arg := range e.Command {
				if strings.Contains(arg, guardHookScript) {
					st.GuardCapable = true
				}
			}
		}
		break
	}
	return st
}

// installTicksPlugin installs or updates the plugin from GitHub. Networked and
// mutating: only ever run when the operator asked for it with --install.
func installTicksPlugin(ctx context.Context) error {
	bin := strings.TrimSpace(os.Getenv("HERDR_BIN_PATH"))
	if bin == "" {
		bin = "herdr"
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, "plugin", "install", tickPluginSource, "--yes")
	cmd.Stdout = os.Stderr // progress is diagnostics, never this command's output
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

var (
	herdPluginInstall bool
	herdPluginCheck   bool
	herdPluginJSON    bool
)

var herdPluginCmd = &cobra.Command{
	Use:   "plugin",
	Short: "Report (or install) the herdr-ticks plugin that triggers the orchestrator guard",
	Long: `Report whether the herdr-ticks plugin can actually fire the orchestrator
watchdog, and optionally install or update it.

Under the herdr substrate, what INVOKES tk herd guard is the plugin's
pane.agent_status_changed hook. Everything else about the watchdog lives in tk,
so this is the one environment dependency in the anti-stall path — and it failed
silently once already: the plugin was installed and enabled, and pinned to a
commit three weeks older than the guard hook, so the guard never ran.

The check is therefore for the HOOK, not for a version. The plugin reports
version 0.1.0 both before and after the guard landed, so a version comparison
would have reported healthy the whole time.

Run this at orchestration start; --install is idempotent and also updates a
stale install.

Nothing here starts a herdr server, workspace or TUI: the status path is
herdr plugin list, which is read-only.

Exit codes
  0  healthy (or, without --check, simply reported)
  1  the install failed
  2  invalid flags
 10  --check and the guard cannot fire (not installed, disabled, or too old)

Examples
  tk herd plugin                # report status
  tk herd plugin --install      # install or update, then report
  tk herd plugin --check        # exit 10 unless the guard can fire`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdPlugin,
}

func init() {
	herdPluginCmd.Flags().BoolVar(&herdPluginInstall, "install", false, "install or update the plugin from GitHub, then report")
	herdPluginCmd.Flags().BoolVar(&herdPluginCheck, "check", false, "exit 10 unless the guard hook can fire")
	herdPluginCmd.Flags().BoolVar(&herdPluginJSON, "json", false, "output as JSON")
	herdCmd.AddCommand(herdPluginCmd)
}

func runHerdPlugin(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	ctx := cmd.Context()
	if ctx == nil {
		ctx = context.Background()
	}

	st := inspectTicksPlugin(ctx)

	if herdPluginInstall {
		if !st.HerdrPresent {
			return NewExitError(ExitGeneric, "herdr is not on PATH — nothing to install into")
		}
		if err := installTicksPlugin(ctx); err != nil {
			return NewExitError(ExitGeneric, "herdr plugin install failed: %v", err)
		}
		st = inspectTicksPlugin(ctx)
	}

	if herdPluginJSON {
		writeJSONLine(out, st)
	} else {
		fmt.Fprintf(out, "herdr        %s\n", yesNo(st.HerdrPresent))
		fmt.Fprintf(out, "installed    %s\n", yesNo(st.Installed))
		fmt.Fprintf(out, "enabled      %s\n", yesNo(st.Enabled))
		fmt.Fprintf(out, "guard hook   %s\n", yesNo(st.GuardCapable))
		if st.Commit != "" {
			fmt.Fprintf(out, "commit       %s\n", st.Commit)
		}
		if p := st.problem(); p != "" {
			fmt.Fprintf(out, "\n%s.\nFix: tk herd plugin --install\n", p)
		}
	}

	if herdPluginCheck && !st.healthy() {
		return NewExitError(ExitPluginUnhealthy, "%s", st.problem())
	}
	return nil
}

func yesNo(b bool) string {
	if b {
		return "yes"
	}
	return "no"
}
