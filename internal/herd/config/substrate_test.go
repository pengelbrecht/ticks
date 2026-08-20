package config

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// fakeProber stands in for a live herdr. Unit tests must never require a
// running server, and probes must never start one.
type fakeProber struct {
	envOK     bool
	socketOK  bool
	socketErr error

	envCalls    int
	socketCalls int
	socketPaths []string
}

func (f *fakeProber) ProbeEnv(context.Context) ProbeResult {
	f.envCalls++
	r := ProbeResult{Name: ProbeEnv, Ran: true, OK: f.envOK}
	if !r.OK {
		r.Detail = EnvVar + " is unset"
	}
	return r
}

func (f *fakeProber) ProbeSocket(_ context.Context, socketPath string) ProbeResult {
	f.socketCalls++
	f.socketPaths = append(f.socketPaths, socketPath)
	r := ProbeResult{Name: ProbeSocket, Ran: true, OK: f.socketOK}
	if !r.OK {
		r.Err = f.socketErr
		r.Detail = "the resolved socket " + socketPath + " does not answer `herdr status server`"
	}
	return r
}

// TestSubstrateDecisionTable walks the six substrate × availability cells of
// runners-config.md's decision table. The `harness` row is one row in the doc
// ("either") and two cells here, because the point of it is that availability
// is not consulted at all.
func TestSubstrateDecisionTable(t *testing.T) {
	tests := []struct {
		name string
		// substrate is the configured value; "" means the key is absent.
		substrate string
		available bool

		wantSubstrate Substrate
		wantProbed    bool
		wantDegraded  bool
		wantAnnounce  bool
		wantNote      string
	}{
		{
			name:      "cell 1: auto + available -> herdr, silent",
			substrate: "auto", available: true,
			wantSubstrate: SubstrateHerdr, wantProbed: true,
			wantNote: "runner-state: substrate=herdr requested=auto",
		},
		{
			name:      "cell 2: auto + unavailable -> harness, silent",
			substrate: "auto", available: false,
			wantSubstrate: SubstrateHarness, wantProbed: true,
			wantNote: "runner-state: substrate=harness requested=auto",
		},
		{
			name:      "cell 3: herdr + available -> herdr",
			substrate: "herdr", available: true,
			wantSubstrate: SubstrateHerdr, wantProbed: true,
			wantNote: "runner-state: substrate=herdr requested=herdr",
		},
		{
			name:      "cell 4: herdr + unavailable -> explicit degradation, run continues",
			substrate: "herdr", available: false,
			wantSubstrate: SubstrateHarness, wantProbed: true,
			wantDegraded: true, wantAnnounce: true,
			wantNote: "runner-state: substrate=harness requested=herdr reason=herdr-unavailable",
		},
		{
			name:      "cell 5: harness + herdr available -> harness, not probed",
			substrate: "harness", available: true,
			wantSubstrate: SubstrateHarness, wantProbed: false,
			wantNote: "runner-state: substrate=harness requested=harness reason=config-terminal",
		},
		{
			name:      "cell 6: harness + herdr unavailable -> harness, not probed",
			substrate: "harness", available: false,
			wantSubstrate: SubstrateHarness, wantProbed: false,
			wantNote: "runner-state: substrate=harness requested=harness reason=config-terminal",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			src := "[orchestration]\nsubstrate = \"" + tc.substrate + "\"\nsocket = \"/tmp/fake-herdr.sock\"\n" +
				"\n[orchestrator]\nharness = \"claude\"\n\n[roles.implement]\nkind = \"claude\"\n"
			cfg, err := Parse([]byte(src))
			if err != nil {
				t.Fatalf("Parse: %v", err)
			}
			// Availability is delivered through the socket probe so that the
			// harness cells can also assert the probe never ran.
			p := &fakeProber{envOK: false, socketOK: tc.available, socketErr: errors.New("connection refused")}

			d := Decide(context.Background(), cfg, p)

			if d.Substrate != tc.wantSubstrate {
				t.Errorf("Substrate = %q, want %q", d.Substrate, tc.wantSubstrate)
			}
			if d.Requested != Substrate(tc.substrate) {
				t.Errorf("Requested = %q, want %q", d.Requested, tc.substrate)
			}
			if d.Probed != tc.wantProbed {
				t.Errorf("Probed = %v, want %v", d.Probed, tc.wantProbed)
			}
			if d.Available != (tc.wantProbed && tc.available) {
				t.Errorf("Available = %v", d.Available)
			}
			if d.Degraded != tc.wantDegraded {
				t.Errorf("Degraded = %v, want %v", d.Degraded, tc.wantDegraded)
			}
			if got := d.Announcement() != ""; got != tc.wantAnnounce {
				t.Errorf("Announcement present = %v, want %v (%q)", got, tc.wantAnnounce, d.Announcement())
			}
			if got := d.NoteLine(); got != tc.wantNote {
				t.Errorf("NoteLine = %q, want %q", got, tc.wantNote)
			}

			// substrate = "harness" is terminal: NO probe, even inside a
			// herdr pane.
			if !tc.wantProbed && (p.envCalls != 0 || p.socketCalls != 0) {
				t.Errorf("substrate=harness probed anyway (env=%d socket=%d)", p.envCalls, p.socketCalls)
			}
		})
	}
}

// TestDegradationAnnouncement pins the content the doc requires: the
// requested substrate, the probe(s) that failed, the adapter being fallen
// back to, and the three consequences worth stating.
func TestDegradationAnnouncement(t *testing.T) {
	cfg, err := Parse([]byte(docExample2)) // substrate = "herdr", orchestrator.harness = "claude"
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	p := &fakeProber{envOK: false, socketOK: false, socketErr: errors.New("no such file or directory")}
	d := Decide(context.Background(), cfg, p)

	if !d.Degraded {
		t.Fatal("not degraded")
	}
	if len(d.FailedProbes) != 2 {
		t.Fatalf("FailedProbes = %v, want both env and socket", d.FailedProbes)
	}
	msg := d.Announcement()
	for _, want := range []string{
		FileName,
		`substrate = "herdr"`,
		EnvVar + " is unset",
		"does not answer",
		"claude adapter",
		"Cross-vendor role routing",
		"worktree_branch_prefix",
		"outlive the orchestrator",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("announcement missing %q:\n  %s", want, msg)
		}
	}
	if d.FallbackHarness != "claude" {
		t.Errorf("FallbackHarness = %q, want claude", d.FallbackHarness)
	}
}

func TestDetectPolicySelectsProbes(t *testing.T) {
	tests := []struct {
		detect      string
		envOK       bool
		socketOK    bool
		wantEnvRuns int
		wantSockRun int
		wantAvail   bool
	}{
		{detect: "env", envOK: true, socketOK: true, wantEnvRuns: 1, wantSockRun: 0, wantAvail: true},
		{detect: "env", envOK: false, socketOK: true, wantEnvRuns: 1, wantSockRun: 0, wantAvail: false},
		{detect: "socket", envOK: true, socketOK: true, wantEnvRuns: 0, wantSockRun: 1, wantAvail: true},
		{detect: "socket", envOK: true, socketOK: false, wantEnvRuns: 0, wantSockRun: 1, wantAvail: false},
		// env-or-socket: either suffices, and a satisfied env probe makes the
		// socket dial moot, so it is skipped.
		{detect: "env-or-socket", envOK: true, socketOK: false, wantEnvRuns: 1, wantSockRun: 0, wantAvail: true},
		{detect: "env-or-socket", envOK: false, socketOK: true, wantEnvRuns: 1, wantSockRun: 1, wantAvail: true},
		{detect: "env-or-socket", envOK: false, socketOK: false, wantEnvRuns: 1, wantSockRun: 1, wantAvail: false},
	}
	for _, tc := range tests {
		name := tc.detect + "/env=" + boolStr(tc.envOK) + "/socket=" + boolStr(tc.socketOK)
		t.Run(name, func(t *testing.T) {
			cfg, err := Parse([]byte("[orchestration]\ndetect = \"" + tc.detect + "\"\nsocket = \"/tmp/x.sock\"\n\n[roles.implement]\nkind = \"claude\"\n"))
			if err != nil {
				t.Fatalf("Parse: %v", err)
			}
			p := &fakeProber{envOK: tc.envOK, socketOK: tc.socketOK}
			d := Decide(context.Background(), cfg, p)
			if p.envCalls != tc.wantEnvRuns {
				t.Errorf("env probe ran %d times, want %d", p.envCalls, tc.wantEnvRuns)
			}
			if p.socketCalls != tc.wantSockRun {
				t.Errorf("socket probe ran %d times, want %d", p.socketCalls, tc.wantSockRun)
			}
			if d.Available != tc.wantAvail {
				t.Errorf("Available = %v, want %v", d.Available, tc.wantAvail)
			}
		})
	}
}

func TestDecideWithNilConfig(t *testing.T) {
	p := &fakeProber{envOK: true}
	d := Decide(context.Background(), nil, p)
	if d.Requested != SubstrateAuto || d.Substrate != SubstrateHerdr {
		t.Fatalf("nil config: requested=%q substrate=%q, want auto/herdr", d.Requested, d.Substrate)
	}
	if d.Announcement() != "" {
		t.Error("auto never announces")
	}
}

func TestResolveSocketOrder(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("USERPROFILE", home)

	t.Run("orchestration.socket wins", func(t *testing.T) {
		t.Setenv(SocketEnvVar, "/from/env.sock")
		cfg, err := Parse([]byte("[orchestration]\nsocket = \"/pinned/herdr.sock\"\n\n[roles.implement]\nkind = \"claude\"\n"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		got, err := ResolveSocket(cfg)
		if err != nil || got != "/pinned/herdr.sock" {
			t.Fatalf("ResolveSocket = %q, %v", got, err)
		}
	})

	t.Run("leading ~ is expanded", func(t *testing.T) {
		cfg, err := Parse([]byte("[orchestration]\nsocket = \"~/sockets/herdr.sock\"\n\n[roles.implement]\nkind = \"claude\"\n"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		got, err := ResolveSocket(cfg)
		if err != nil {
			t.Fatal(err)
		}
		if want := filepath.Join(home, "sockets", "herdr.sock"); got != want {
			t.Fatalf("ResolveSocket = %q, want %q", got, want)
		}
	})

	t.Run("then $HERDR_SOCKET_PATH", func(t *testing.T) {
		t.Setenv(SocketEnvVar, "/from/env.sock")
		got, err := ResolveSocket(nil)
		if err != nil || got != "/from/env.sock" {
			t.Fatalf("ResolveSocket = %q, %v", got, err)
		}
	})

	t.Run("then the herdr default", func(t *testing.T) {
		t.Setenv(SocketEnvVar, "")
		got, err := ResolveSocket(nil)
		if err != nil {
			t.Fatal(err)
		}
		if want := filepath.Join(home, ".config", "herdr", "herdr.sock"); got != want {
			t.Fatalf("ResolveSocket = %q, want %q", got, want)
		}
	})
}

func TestDefaultProberEnv(t *testing.T) {
	tests := []struct {
		set    bool
		value  string
		wantOK bool
	}{
		{set: false, wantOK: false},
		{set: true, value: "1", wantOK: true},
		{set: true, value: "0", wantOK: false},
		{set: true, value: "true", wantOK: false},
	}
	for _, tc := range tests {
		name := "unset"
		if tc.set {
			name = tc.value
		}
		t.Run(name, func(t *testing.T) {
			if tc.set {
				t.Setenv(EnvVar, tc.value)
			} else {
				os.Unsetenv(EnvVar)
			}
			r := DefaultProber{}.ProbeEnv(context.Background())
			if !r.Ran || r.OK != tc.wantOK {
				t.Fatalf("ProbeEnv = %+v, want OK=%v", r, tc.wantOK)
			}
		})
	}
}

// TestDefaultProberSocketBoundsItself: a socket path that cannot answer must
// fail fast, not hang the run. Nothing is listening on the temp path, so this
// exercises the dial failure without a live herdr.
func TestDefaultProberSocketFailsClosed(t *testing.T) {
	path := filepath.Join(t.TempDir(), "absent.sock")
	start := time.Now()
	r := DefaultProber{Timeout: 500 * time.Millisecond}.ProbeSocket(context.Background(), path)
	if r.OK {
		t.Fatal("probe succeeded against a socket that does not exist")
	}
	if !r.Ran || r.Err == nil {
		t.Fatalf("ProbeSocket = %+v, want a ran-and-failed result", r)
	}
	if !strings.Contains(r.Detail, path) {
		t.Errorf("detail does not name the resolved path: %q", r.Detail)
	}
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Errorf("probe took %s; it must be bounded", elapsed)
	}
}

func boolStr(b bool) string {
	if b {
		return "yes"
	}
	return "no"
}

// ---------------------------------------------------------------------------
// Explicit substrate override
//
// The cloud sandbox found this gap the expensive way: a container booted, read
// a repository whose `[orchestration].substrate` is pinned to herdr for LOCAL
// runs, correctly found no herdr socket, and had nowhere to be told that a
// harness substrate was the intended one. The override is how whatever boots a
// run says which substrate is effective there, without editing the tracked
// file the local runs depend on.
// ---------------------------------------------------------------------------

// TestOverrideWinsOverTheFile: the override is the requested substrate, the
// file's value is reported as configured intent, and `harness` is as terminal
// through an override as it is in the file — no probe runs.
func TestOverrideWinsOverTheFile(t *testing.T) {
	cfg, err := Parse([]byte("[orchestration]\nsubstrate = \"herdr\"\n\n[orchestrator]\nharness = \"claude\"\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	o, err := ParseOverride("harness", SubstrateEnvVar)
	if err != nil {
		t.Fatalf("ParseOverride: %v", err)
	}
	p := &fakeProber{}
	d := DecideOverride(context.Background(), cfg, p, o)

	if d.Substrate != SubstrateHarness {
		t.Errorf("Substrate = %q, want harness", d.Substrate)
	}
	if d.Requested != SubstrateHarness {
		t.Errorf("Requested = %q, want harness (the override IS the request)", d.Requested)
	}
	if d.Configured != SubstrateHerdr {
		t.Errorf("Configured = %q, want herdr (what the file still says)", d.Configured)
	}
	if d.Probed || p.envCalls != 0 || p.socketCalls != 0 {
		t.Errorf("an override to harness probed anyway (env=%d socket=%d)", p.envCalls, p.socketCalls)
	}
	if d.Degraded {
		t.Error("an override is a deliberate choice, never a degradation")
	}
	want := "runner-state: substrate=harness requested=harness config=herdr source=" + SubstrateEnvVar + " reason=explicit-override"
	if got := d.NoteLine(); got != want {
		t.Errorf("NoteLine = %q, want %q", got, want)
	}
	msg := d.Announcement()
	for _, want := range []string{SubstrateEnvVar, "harness", `substrate = "herdr"`, FileName, "Cross-vendor role routing"} {
		if !strings.Contains(msg, want) {
			t.Errorf("announcement missing %q:\n  %s", want, msg)
		}
	}
}

// TestOverrideToHerdrStillDegradesExplicitly: an override does not suspend the
// explicit-degradation rule. Asking for herdr where there is none degrades and
// says so, exactly as the file's own pin does.
func TestOverrideToHerdrStillDegradesExplicitly(t *testing.T) {
	cfg, err := Parse([]byte("[orchestration]\nsubstrate = \"harness\"\nsocket = \"/tmp/fake-herdr.sock\"\n\n[orchestrator]\nharness = \"claude\"\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	o, err := ParseOverride("herdr", SubstrateEnvVar)
	if err != nil {
		t.Fatalf("ParseOverride: %v", err)
	}
	d := DecideOverride(context.Background(), cfg, &fakeProber{}, o)

	if d.Substrate != SubstrateHarness || !d.Degraded {
		t.Fatalf("substrate=%q degraded=%v, want harness/true", d.Substrate, d.Degraded)
	}
	if !d.Probed {
		t.Error("an override to herdr must probe: availability is what decides")
	}
	want := "runner-state: substrate=harness requested=herdr config=harness source=" + SubstrateEnvVar + " reason=herdr-unavailable"
	if got := d.NoteLine(); got != want {
		t.Errorf("NoteLine = %q, want %q", got, want)
	}
	if !strings.Contains(d.Announcement(), "herdr is unavailable") {
		t.Errorf("announcement does not state the degradation:\n  %s", d.Announcement())
	}
}

// TestParseOverride: an empty value is "no override", and an unknown one is a
// stop. A value a reader cannot parse authorises nothing — the same fail-closed
// rule the config file itself gets.
func TestParseOverride(t *testing.T) {
	t.Run("empty is no override", func(t *testing.T) {
		o, err := ParseOverride("", SubstrateEnvVar)
		if err != nil {
			t.Fatalf("ParseOverride: %v", err)
		}
		if o.Substrate != "" {
			t.Fatalf("Substrate = %q, want none", o.Substrate)
		}
		// Whitespace only is the same thing: a variable set to nothing.
		if o, err := ParseOverride("  \n", SubstrateEnvVar); err != nil || o.Substrate != "" {
			t.Fatalf("ParseOverride(blank) = %+v, %v", o, err)
		}
	})

	t.Run("the three legal values parse", func(t *testing.T) {
		for _, want := range []Substrate{SubstrateHerdr, SubstrateHarness, SubstrateAuto} {
			o, err := ParseOverride(string(want), SubstrateEnvVar)
			if err != nil {
				t.Fatalf("ParseOverride(%q): %v", want, err)
			}
			if o.Substrate != want || o.Source != SubstrateEnvVar {
				t.Fatalf("ParseOverride(%q) = %+v", want, o)
			}
		}
	})

	t.Run("an unknown value is refused", func(t *testing.T) {
		_, err := ParseOverride("subagents", SubstrateEnvVar)
		if err == nil {
			t.Fatal("ParseOverride accepted an unknown substrate")
		}
		for _, want := range []string{SubstrateEnvVar, "subagents", "herdr", "harness", "auto"} {
			if !strings.Contains(err.Error(), want) {
				t.Errorf("error missing %q: %v", want, err)
			}
		}
	})
}

// TestDecideIsDecideOverrideWithNoOverride keeps the two entry points from
// drifting: everything the decision table pins goes through the same code.
func TestDecideIsDecideOverrideWithNoOverride(t *testing.T) {
	cfg, err := Parse([]byte("[orchestration]\nsubstrate = \"herdr\"\nsocket = \"/tmp/fake-herdr.sock\"\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	plain := Decide(context.Background(), cfg, &fakeProber{})
	overridden := DecideOverride(context.Background(), cfg, &fakeProber{}, Override{})
	if plain.NoteLine() != overridden.NoteLine() || plain.Substrate != overridden.Substrate {
		t.Fatalf("Decide = %q, DecideOverride with no override = %q", plain.NoteLine(), overridden.NoteLine())
	}
	if strings.Contains(plain.NoteLine(), "source=") {
		t.Errorf("a run with no override names one: %q", plain.NoteLine())
	}
}
