package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// EnvVar is the environment variable herdr exports inside a managed pane. The
// `env` probe is `test "${HERDR_ENV:-}" = 1`.
const EnvVar = "HERDR_ENV"

// EnvValue is the value EnvVar must hold for the env probe to succeed.
const EnvValue = "1"

// SocketEnvVar is the environment variable holding the socket path herdr's
// server is listening on, re-exported from the client package so callers of
// this package need not import both.
const SocketEnvVar = client.SocketPathEnv

// DefaultProbeTimeout bounds the socket probe. It is deliberately short: a
// stale socket file can be connectable yet never answer, and the availability
// probe is supposed to degrade to harness orchestration rather than hang.
const DefaultProbeTimeout = 2 * time.Second

// ProbeName identifies one availability probe.
type ProbeName string

// The two probes runners-config.md defines.
const (
	ProbeEnv    ProbeName = "env"
	ProbeSocket ProbeName = "socket"
)

// ProbeResult is one probe's outcome. Ran is false when the configured
// `detect` policy excluded the probe, or when an earlier probe already
// established availability — probes are read-only and there is no reason to
// dial a socket whose answer cannot change the decision.
type ProbeResult struct {
	Name   ProbeName
	Ran    bool
	OK     bool
	Detail string
	Err    error
}

// String renders the probe for a degradation announcement.
func (p ProbeResult) String() string {
	switch {
	case !p.Ran:
		return string(p.Name) + " (not probed)"
	case p.OK:
		return string(p.Name) + " (ok)"
	case p.Detail != "":
		return string(p.Name) + ": " + p.Detail
	case p.Err != nil:
		return string(p.Name) + ": " + p.Err.Error()
	default:
		return string(p.Name) + " (failed)"
	}
}

// Prober runs the two read-only availability probes. Production code uses
// [DefaultProber]; tests inject a fake so that no unit test needs a live
// herdr.
//
// An implementation must never start a herdr server, workspace or TUI. Bare
// `herdr` launches or attaches the TUI and must not be used to probe.
type Prober interface {
	// ProbeEnv reports whether the orchestrator is running inside a
	// herdr-managed pane.
	ProbeEnv(ctx context.Context) ProbeResult
	// ProbeSocket reports whether a herdr server answers a read-only call at
	// socketPath. socketPath is already resolved and ~-expanded.
	ProbeSocket(ctx context.Context, socketPath string) ProbeResult
}

// DefaultProber probes the real environment: HERDR_ENV for the env probe, and
// a bounded ping over the herdr unix socket for the socket probe.
type DefaultProber struct {
	// Timeout bounds the socket probe. Zero means [DefaultProbeTimeout].
	Timeout time.Duration
}

// ProbeEnv implements [Prober].
func (d DefaultProber) ProbeEnv(context.Context) ProbeResult {
	got := os.Getenv(EnvVar)
	r := ProbeResult{Name: ProbeEnv, Ran: true, OK: got == EnvValue}
	if !r.OK {
		if got == "" {
			r.Detail = EnvVar + " is unset"
		} else {
			r.Detail = fmt.Sprintf("%s=%q, want %q", EnvVar, got, EnvValue)
		}
	}
	return r
}

// ProbeSocket implements [Prober]. It dials the socket and issues a single
// ping; `New` performs that handshake and fails closed on a protocol
// mismatch. `test -S <path>` alone is not the probe — a stale socket file
// outlives its server.
//
// The context is bounded here as well as by the client's own CallTimeout:
// CallTimeout is a hard ceiling, but Ping's documentation is explicit that a
// probe must still bound its own context rather than rely on it.
func (d DefaultProber) ProbeSocket(ctx context.Context, socketPath string) ProbeResult {
	timeout := d.Timeout
	if timeout <= 0 {
		timeout = DefaultProbeTimeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	c, err := client.New(ctx, client.Options{
		SocketPath:  socketPath,
		DialTimeout: timeout,
		CallTimeout: timeout,
	})
	if err != nil {
		return ProbeResult{
			Name: ProbeSocket, Ran: true, OK: false, Err: err,
			Detail: fmt.Sprintf("the resolved socket %s does not answer a read-only call: %v", socketPath, err),
		}
	}
	if _, err := c.Ping(ctx); err != nil {
		return ProbeResult{
			Name: ProbeSocket, Ran: true, OK: false, Err: err,
			Detail: fmt.Sprintf("the resolved socket %s does not answer a read-only call: %v", socketPath, err),
		}
	}
	return ProbeResult{Name: ProbeSocket, Ran: true, OK: true, Detail: "answered at " + socketPath}
}

// Decision is the outcome of the substrate decision procedure: which
// substrate orchestrates this run, and everything the caller needs to
// announce and durably note it.
type Decision struct {
	// Requested is the configured substrate (auto when unset).
	Requested Substrate
	// Substrate is the effective substrate: herdr or harness, never auto.
	Substrate Substrate
	// Detect is the probe policy that applied.
	Detect Detect
	// Probed reports whether availability was probed at all. It is false for
	// substrate = "harness", which is terminal: herdr is not probed and not
	// used, even inside a herdr pane.
	Probed bool
	// Available reports whether herdr was found available. Meaningless when
	// Probed is false.
	Available bool
	// Env and Socket carry each probe's outcome.
	Env    ProbeResult
	Socket ProbeResult
	// SocketPath is the path the socket probe resolved to, or "" when the
	// probe did not run or the path could not be resolved.
	SocketPath string
	// SocketPathErr is set when the socket probe was wanted but the path
	// could not be resolved (no home directory).
	SocketPathErr error
	// Degraded marks the explicit-degradation cell: substrate = "herdr" was
	// requested and herdr is unavailable. The run continues under harness
	// orchestration but must not do so silently.
	Degraded bool
	// FailedProbes names the probes that ran and failed. Populated for the
	// degradation announcement.
	FailedProbes []ProbeResult
	// FallbackHarness is the adapter the run falls back to, from
	// orchestrator.harness. "" when the config does not name one — the caller
	// then substitutes the harness it is actually running.
	FallbackHarness string
}

// Decide runs the substrate decision procedure from runners-config.md.
//
// It is config-first: substrate = "harness" is terminal and NO probe runs.
// Otherwise the probes selected by orchestration.detect run, read-only, and
// availability decides between herdr and harness orchestration. Under
// substrate = "herdr" an unavailable herdr is an explicit degradation, never
// a failed run — the caller announces [Decision.Announcement] and durably
// records [Decision.NoteLine].
//
// cfg may be nil ("no .tick/runners.toml"), which means substrate auto,
// detect env-or-socket. p may be nil, which means [DefaultProber].
func Decide(ctx context.Context, cfg *Config, p Prober) Decision {
	if p == nil {
		p = DefaultProber{}
	}

	d := Decision{
		Requested:       cfg.Substrate(),
		Detect:          cfg.Detect(),
		Env:             ProbeResult{Name: ProbeEnv},
		Socket:          ProbeResult{Name: ProbeSocket},
		FallbackHarness: cfg.OrchestratorHarness(),
	}

	// Config first. `harness` is a deliberate choice, not a degradation, and
	// it forbids probing outright — even inside a herdr pane.
	if d.Requested == SubstrateHarness {
		d.Substrate = SubstrateHarness
		return d
	}

	d.Probed = true
	wantEnv := d.Detect == DetectEnv || d.Detect == DetectEnvOrSocket
	wantSocket := d.Detect == DetectSocket || d.Detect == DetectEnvOrSocket

	if wantEnv {
		d.Env = p.ProbeEnv(ctx)
		if d.Env.OK {
			d.Available = true
		}
	}
	// Only dial when the answer can still change the decision. Skipping a
	// probe whose result is already moot keeps detection as read-only and as
	// cheap as the doc requires.
	if wantSocket && !d.Available {
		path, err := ResolveSocket(cfg)
		if err != nil {
			d.SocketPathErr = err
			d.Socket = ProbeResult{Name: ProbeSocket, Ran: true, OK: false, Err: err, Detail: err.Error()}
		} else {
			d.SocketPath = path
			d.Socket = p.ProbeSocket(ctx, path)
			if d.Socket.OK {
				d.Available = true
			}
		}
	}

	for _, r := range []ProbeResult{d.Env, d.Socket} {
		if r.Ran && !r.OK {
			d.FailedProbes = append(d.FailedProbes, r)
		}
	}

	if d.Available {
		d.Substrate = SubstrateHerdr
		return d
	}
	d.Substrate = SubstrateHarness
	d.Degraded = d.Requested == SubstrateHerdr
	return d
}

// ResolveSocket resolves the socket path the `socket` probe should dial, in
// the documented order: orchestration.socket (with a leading ~ expanded),
// then $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock. It is nil-safe.
//
// Prefer leaving orchestration.socket unset. A pinned path that no longer
// matches the installed herdr does not fail loudly; it fails as a false
// negative, degrading a healthy herdr to harness dispatch — silently, under
// substrate = "auto".
func ResolveSocket(cfg *Config) (string, error) {
	explicit, err := expandHome(cfg.ConfiguredSocket())
	if err != nil {
		return "", err
	}
	return client.ResolveSocketPath(explicit)
}

func expandHome(path string) (string, error) {
	if path == "" || !strings.HasPrefix(path, "~") {
		return path, nil
	}
	if path != "~" && !strings.HasPrefix(path, "~/") {
		return path, nil
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return "", client.ErrNoHomeDir
	}
	if path == "~" {
		return home, nil
	}
	return filepath.Join(home, filepath.FromSlash(strings.TrimPrefix(path, "~/"))), nil
}

// Announcement returns the text the orchestrator must state to the user
// before dispatching the first worker, or "" when nothing needs announcing.
//
// Only the explicit-degradation cell produces text. auto/available,
// auto/unavailable and herdr/available are silent, and substrate = "harness"
// is a deliberate choice that needs no announcement.
func (d Decision) Announcement() string {
	if !d.Degraded {
		return ""
	}
	adapter := d.FallbackHarness
	if adapter == "" {
		adapter = "the active"
	} else {
		adapter = "the " + adapter
	}
	reasons := make([]string, 0, len(d.FailedProbes))
	for _, r := range d.FailedProbes {
		reasons = append(reasons, r.Detail)
	}
	why := strings.Join(reasons, " and ")
	if why == "" {
		why = "no availability probe succeeded"
	}
	return fmt.Sprintf(
		"%s requests substrate = %q, but herdr is unavailable (%s). Falling back to harness orchestration via %s adapter for this run. "+
			"Cross-vendor role routing in [roles] will not apply — every worker runs on the orchestrating harness, "+
			"branch naming follows the harness adapter rather than worktree_branch_prefix, and workers no longer outlive the orchestrator.",
		FileName, string(d.Requested), why, adapter)
}

// NoteLine returns the durable one-liner to record where the run is recorded
// (a `tk note` on the epic), so a later reader can tell configured intent
// from actual execution.
func (d Decision) NoteLine() string {
	line := fmt.Sprintf("runner-state: substrate=%s requested=%s", string(d.Substrate), string(d.Requested))
	switch {
	case d.Degraded:
		line += " reason=herdr-unavailable"
	case !d.Probed:
		line += " reason=config-terminal"
	}
	return line
}
