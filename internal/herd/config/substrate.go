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

// SubstrateEnvVar is the environment variable that overrides the configured
// substrate for one run. It is how whatever BOOTS a run states the substrate
// that is effective where the run actually executes, without editing the
// tracked config the repository's other runs depend on.
//
// The case it exists for: a cloud sandbox. `.tick/runners.toml` pins
// `substrate = "herdr"` because that is right for local runs on a machine with
// a herdr server; a container has no herdr server and never will in Phase 1.
// The container is told so through this variable rather than by rewriting the
// checkout, which would change the file every worker then commits against.
const SubstrateEnvVar = "TICKS_SUBSTRATE"

// Override is an explicit substrate choice supplied from outside the checkout.
// The zero value means "no override" — the file decides, as it always has.
//
// An override is a deliberate choice, never a degradation, and it does not
// suspend any of the decision procedure's other rules: an override to `herdr`
// still probes, and still degrades explicitly when herdr is unavailable.
type Override struct {
	// Substrate is the overriding value, or "" when there is no override.
	Substrate Substrate
	// Source names where it came from, for the announcement and the note —
	// [SubstrateEnvVar] for the environment. An override with no source is
	// unattributable, which is the one thing a run-state note must never be.
	Source string
}

// ParseOverride parses one override value from source, fail-closed.
//
// An empty or blank value is no override and no error: the variable is simply
// not set. Anything that is not one of the three substrate values is refused
// rather than ignored — a substrate a reader cannot parse authorises nothing,
// and silently falling back to the file is how a run ends up on a substrate
// nobody asked for.
func ParseOverride(value, source string) (Override, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return Override{}, nil
	}
	switch s := Substrate(trimmed); s {
	case SubstrateHerdr, SubstrateHarness, SubstrateAuto:
		return Override{Substrate: s, Source: source}, nil
	default:
		return Override{}, fmt.Errorf("%s=%q is not a substrate: expected %q, %q or %q",
			source, trimmed, SubstrateHerdr, SubstrateHarness, SubstrateAuto)
	}
}

// Decision is the outcome of the substrate decision procedure: which
// substrate orchestrates this run, and everything the caller needs to
// announce and durably note it.
type Decision struct {
	// Requested is the substrate this run asked for: the override when one is
	// in force, otherwise the configured value (auto when unset).
	Requested Substrate
	// Configured is what the checkout's own config says, whether or not an
	// override displaced it. Kept so a note can report configured intent and
	// actual execution side by side.
	Configured Substrate
	// Override is the explicit override in force, or the zero value when the
	// file decided on its own.
	Override Override
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
	return DecideOverride(ctx, cfg, p, Override{})
}

// DecideOverride runs the same procedure with an explicit [Override] in force.
//
// The override supplies the REQUEST — nothing else. Every other rule holds
// unchanged: `harness` is still terminal and still forbids probing, `herdr`
// still probes and still degrades explicitly when herdr is unavailable, and
// the configured value is still reported so a reader can tell what the
// repository asked for from what this run actually did.
func DecideOverride(ctx context.Context, cfg *Config, p Prober, o Override) Decision {
	if p == nil {
		p = DefaultProber{}
	}

	d := Decision{
		Requested:       cfg.Substrate(),
		Configured:      cfg.Substrate(),
		Override:        o,
		Detect:          cfg.Detect(),
		Env:             ProbeResult{Name: ProbeEnv},
		Socket:          ProbeResult{Name: ProbeSocket},
		FallbackHarness: cfg.OrchestratorHarness(),
	}
	if o.Substrate != "" {
		d.Requested = o.Substrate
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

// Announcement returns the text the orchestrator must state LOUDLY before
// dispatching the first worker, or "" when nothing needs that register.
//
// Only two things earn it: an explicit degradation (an assertion the
// environment refused) and an explicit override (a substrate the checkout did
// not ask for). Everything else resolved exactly what the config asked for, and
// says so through [Decision.Resolution] instead.
//
// The distinction is the point, not a nicety. A repository that pins
// `substrate = "herdr"` when its runs are sometimes driven without herdr — a
// local session with no herdr server, the skill's original mode and the
// degenerate case the cloud-factory design calls sacred — announces a
// degradation on every ordinary run, and an operator who reads that every day
// has been trained to ignore the announcement that matters. The fix for such a
// repository is `substrate = "auto"`, which is why the degradation names it.
func (d Decision) Announcement() string {
	switch {
	case d.Override.Substrate != "" && d.Degraded:
		// Both facts, in the order they happened: what displaced the file, and
		// then what the probes did with it.
		return d.overrideAnnouncement() + " " + d.degradedAnnouncement()
	case d.Override.Substrate != "":
		return d.overrideAnnouncement()
	case d.Degraded:
		return d.degradedAnnouncement()
	}
	return ""
}

// overrideAnnouncement states which substrate an override put in force, what
// the checkout asked for instead, and — when the effective substrate is
// harness — the same consequences a degradation names. An override is not a
// degradation, but the run still has to SAY what it resolved and why: a
// substrate nobody announced is one nobody can audit afterwards.
func (d Decision) overrideAnnouncement() string {
	msg := fmt.Sprintf(
		"%s=%s is set for this run, so the effective substrate is %s; %s requests substrate = %q, which stands for runs where it applies (the checkout is not modified).",
		d.Override.Source, string(d.Override.Substrate), string(d.Substrate), FileName, string(d.Configured))
	if d.Substrate == SubstrateHarness && !d.Degraded {
		msg += " " + harnessConsequences
	}
	return msg
}

func (d Decision) degradedAnnouncement() string {
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
	source := FileName
	if d.Override.Substrate != "" {
		source = d.Override.Source
	}
	msg := fmt.Sprintf(
		"%s requests substrate = %q, but herdr is unavailable (%s). Falling back to harness orchestration via %s adapter for this run. %s",
		source, string(d.Requested), why, adapter, harnessConsequences)
	if d.Override.Substrate == "" {
		// The pin is an assertion — "herdr is reachable for every run of this
		// repository" — and the environment just refused it. A repository whose
		// runs are not all alike is asserting something it does not mean, so
		// the loud message says what to write instead of only what went wrong.
		msg += fmt.Sprintf(
			" If this repository is sometimes driven without herdr, substrate = %q is the truthful setting: it uses herdr when it is there and dispatches subagents when it is not, without calling either one a failure.",
			string(SubstrateAuto))
	}
	return msg
}

// Resolution returns the one thing every run says about the substrate it
// resolved. It is never empty: a resolution nobody stated is one nobody can
// audit after the fact, and that is as true of the ordinary path as of the
// broken one.
//
// The register is what differs. When something must be stated loudly this IS
// [Decision.Announcement] — the same words, so a caller printing both does not
// say it twice. Otherwise it is a quiet sentence: what was asked for, what was
// probed, what is dispatching. No degradation vocabulary and no consequences
// paragraph, because nothing was degraded and nothing was substituted.
func (d Decision) Resolution() string {
	if msg := d.Announcement(); msg != "" {
		return msg
	}
	switch {
	case !d.Probed:
		return fmt.Sprintf(
			"%s requests substrate = %q: workers are dispatched as subagents of the orchestrating harness, and herdr is not probed for.",
			FileName, string(d.Requested))
	case d.Available:
		return fmt.Sprintf(
			"%s requests substrate = %q and herdr answered (%s): workers are dispatched as herdr panes.",
			FileName, string(d.Requested), d.availabilityDetail())
	default:
		// The ordinary case this method exists for: `auto` is a policy — use
		// herdr when it is there — and finding it absent is that policy
		// working, not a fallback from anything.
		return fmt.Sprintf(
			"%s requests substrate = %q and no herdr is running (%s): workers are dispatched as subagents of the orchestrating harness, which is what %q asks for.",
			FileName, string(d.Requested), d.probeDetail(), string(SubstrateAuto))
	}
}

// availabilityDetail names the probe that found herdr.
func (d Decision) availabilityDetail() string {
	for _, r := range []ProbeResult{d.Env, d.Socket} {
		if r.Ran && r.OK {
			return r.String()
		}
	}
	return "an availability probe succeeded"
}

// probeDetail names the probes that did not.
func (d Decision) probeDetail() string {
	reasons := make([]string, 0, len(d.FailedProbes))
	for _, r := range d.FailedProbes {
		reasons = append(reasons, r.Detail)
	}
	if len(reasons) == 0 {
		return "no availability probe succeeded"
	}
	return strings.Join(reasons, ", ")
}

// harnessConsequences is what running on harness dispatch costs a run whose
// [roles] table was written for herdr. Stated once, because a degradation and
// an override arrive at the same place and must describe it identically.
const harnessConsequences = "Cross-vendor role routing in [roles] will not apply — every worker runs on the orchestrating harness, " +
	"branch naming follows the harness adapter rather than worktree_branch_prefix, and workers no longer outlive the orchestrator."

// NoteLine returns the durable one-liner to record where the run is recorded
// (a `tk note` on the epic), so a later reader can tell configured intent
// from actual execution.
func (d Decision) NoteLine() string {
	line := fmt.Sprintf("runner-state: substrate=%s requested=%s", string(d.Substrate), string(d.Requested))
	if d.Override.Substrate != "" {
		// Configured intent and its source, so a later reader can tell a
		// container that was TOLD its substrate from a repository that pinned
		// one — without opening the file at the run's base commit.
		line += fmt.Sprintf(" config=%s source=%s", string(d.Configured), d.Override.Source)
	}
	switch {
	case d.Degraded:
		line += " reason=herdr-unavailable"
	case d.Override.Substrate != "":
		line += " reason=explicit-override"
	case !d.Probed:
		line += " reason=config-terminal"
	case d.Probed && !d.Available:
		// Distinct from `herdr-unavailable` on purpose. Both ran on subagents
		// with no herdr in sight; one is a policy working and the other is an
		// assertion that failed, and a reader grepping run-state notes months
		// later has only this line to tell them apart.
		line += " reason=auto-no-herdr"
	}
	return line
}
