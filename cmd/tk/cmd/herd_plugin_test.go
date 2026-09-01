package cmd

import (
	"strings"
	"testing"
)

// The case that actually happened, and the reason this check exists at all:
// the plugin was INSTALLED and ENABLED and could not fire the guard, because it
// was pinned to a commit older than guard-hook.sh. Every presence check passes
// here; only a capability check fails.
func TestPluginStatusInstalledAndEnabledIsNotEnough(t *testing.T) {
	st := pluginStatus{HerdrPresent: true, Installed: true, Enabled: true, GuardCapable: false, Version: "0.1.0"}
	if st.healthy() {
		t.Fatal("a plugin without the guard hook must not be healthy")
	}
	if got := st.problem(); got == "" {
		t.Fatal("an unhealthy status must name its problem")
	}
}

// The version is useless as a signal and must never become one: the plugin
// reported 0.1.0 both before and after the guard hook landed.
func TestPluginStatusIgnoresVersionAsASignal(t *testing.T) {
	stale := pluginStatus{HerdrPresent: true, Installed: true, Enabled: true, Version: "0.1.0"}
	current := pluginStatus{HerdrPresent: true, Installed: true, Enabled: true, Version: "0.1.0", GuardCapable: true}
	if stale.healthy() || !current.healthy() {
		t.Fatal("health must come from the guard hook, not the version string")
	}
}

func TestPluginStatusProblemOrdering(t *testing.T) {
	cases := []struct {
		name string
		st   pluginStatus
		want string
	}{
		{"no herdr", pluginStatus{}, "herdr is not on PATH"},
		{"not installed", pluginStatus{HerdrPresent: true}, "the herdr-ticks plugin is not installed"},
		{"disabled", pluginStatus{HerdrPresent: true, Installed: true}, "the herdr-ticks plugin is installed but disabled"},
		{"too old", pluginStatus{HerdrPresent: true, Installed: true, Enabled: true}, "predates the guard hook"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := c.st.problem()
			if got == "" {
				t.Fatalf("%s should report a problem", c.name)
			}
			if !strings.Contains(got, c.want) {
				t.Errorf("problem = %q, want it to mention %q", got, c.want)
			}
		})
	}
	healthy := pluginStatus{HerdrPresent: true, Installed: true, Enabled: true, GuardCapable: true}
	if got := healthy.problem(); got != "" {
		t.Errorf("healthy status should report no problem, got %q", got)
	}
}
