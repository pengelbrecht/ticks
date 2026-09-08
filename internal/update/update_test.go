package update

import "testing"

// TestCheckPeriodicallySkipsWhenNoCheckEnvSet pins the suppression a tk
// self-invocation relies on: a child tk reading local tracker state for
// another tk (tk cloud spawn shelling out to `tk show`/`tk list`) must not
// consult the release feed just because its parent is inside the check
// interval. Without this, every subprocess re-derives whether it is time to
// check, and a sandbox with restricted egress pays for that unconditionally.
func TestCheckPeriodicallySkipsWhenNoCheckEnvSet(t *testing.T) {
	t.Setenv(NoCheckEnv, "1")
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	if notice := CheckPeriodically("1.2.3"); notice != "" {
		t.Errorf("CheckPeriodically returned %q with %s set, want no notice and no network call", notice, NoCheckEnv)
	}
}

// TestCheckPeriodicallySkipsForDevBuildsRegardlessOfEnv guards the ordering:
// the dev-build skip already existed and must keep working whether or not
// NoCheckEnv is set.
func TestCheckPeriodicallySkipsForDevBuildsRegardlessOfEnv(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	if notice := CheckPeriodically("dev"); notice != "" {
		t.Errorf("CheckPeriodically(\"dev\") = %q, want no notice", notice)
	}
}
