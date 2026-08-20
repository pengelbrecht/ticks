package factory

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"
)

// The container rollout is the half of a deploy that `wrangler deploy` does
// not wait for.
//
// Wrangler builds the image, pushes it, calls `modifyApplication` with the new
// configuration and then POSTs a rollout — and returns as soon as the rollout
// has been *created*. The rollout itself is asynchronous, so `wrangler deploy`
// exits while the container application is still serving the previous image.
//
// That gap is not cosmetic. A run started immediately after a green deploy
// boots the PREVIOUS container, which makes a correct fix look like it did not
// work: two consecutive runs produced byte-identical harness output across a
// deploy that had rebuilt and pushed a new image. The natural response to that
// signal is to go looking for a second bug that does not exist, which is the
// most expensive kind of false signal a deploy can emit.
//
// So the deploy waits here, and it waits on the one thing that is actually
// observable through the CLI the operator already has: the image the container
// application reports. `wrangler containers list --json` prints, per
// application, `{id, name, state, instances, image, version, ...}` where
// `image` is the digest-pinned reference the application is configured with
// and `state` is derived from live instance health (`provisioning` while any
// instance is starting or scheduling, `degraded` when one has failed). The
// wait converges when that reference carries the digest this deploy pushed and
// no instance is mid-transition.
//
// What it deliberately does NOT do is report success it cannot prove. A
// rollout that has not converged inside the bound, an application the account
// does not list, a deploy whose output named no digest — each of those ends the
// deploy with a message saying exactly which one it was. `--skip-rollout-wait`
// is the escape hatch, and it says in the output that nothing was confirmed.

// ContainerAppName is the `[[containers]]` application the bundle declares.
// Wrangler creates and looks the application up by exactly this name (it is
// `containerConfig.name`), so it is also the name the rollout wait asks about.
// It must stay in step with cloud/factory/wrangler.toml.
const ContainerAppName = "ticks-orchestrator"

const (
	// How long the rollout may take before the deploy stops waiting. A
	// container rollout is a registry pull plus a placement, so minutes is
	// the right order; an unbounded wait for something that may never happen
	// is its own failure mode.
	defaultRolloutTimeout = 5 * time.Minute
	defaultRolloutPoll    = 5 * time.Second
)

// pushedImagePattern matches a digest-pinned reference to the orchestrator
// image. Wrangler prints the container application's configuration — the whole
// snippet for a new application, a diff for an existing one — and the image
// line inside it is the only place the pushed digest appears at normal
// verbosity (the push itself logs the digest at debug level only).
//
// Anchoring on the application name is what keeps this from matching the
// hundreds of `sha256:` digests a Docker build log contains: the base image,
// every layer, every cache mount. Only the reference wrangler is deploying
// carries `ticks-orchestrator` in its path.
var pushedImagePattern = regexp.MustCompile(
	`[A-Za-z0-9._/-]*` + regexp.QuoteMeta(ContainerAppName) + `[A-Za-z0-9._:/-]*@sha256:[0-9a-f]{64}`)

// digestPattern pulls the digest out of an image reference.
var digestPattern = regexp.MustCompile(`sha256:[0-9a-f]{64}`)

// parsePushedImage returns the digest-pinned orchestrator image reference in
// wrangler's deploy output, and its digest.
//
// The LAST match wins: when wrangler prints a diff for an existing
// application, the previous image is on the `-` side and the new one on the
// `+` side below it. Empty when the output names none, which is a "cannot
// confirm", never a "nothing changed".
func parsePushedImage(out string) (ref, digest string) {
	matches := pushedImagePattern.FindAllString(out, -1)
	if len(matches) == 0 {
		return "", ""
	}
	ref = matches[len(matches)-1]
	return ref, digestPattern.FindString(ref)
}

// containerApp is one entry of `wrangler containers list --json`.
//
// The field set is wrangler's own JSON projection of the dashboard
// application record, not the raw API object: id, name, state, instances,
// image, version, timestamps. Only what the wait reads is declared.
type containerApp struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	State string `json:"state"`
	// Instances is the live instance count, which is 0 for an idle factory:
	// a container exists only while a run does. It is reported, never waited
	// on — "no instances" is the healthy resting state here.
	Instances int    `json:"instances"`
	Image     string `json:"image"`
	Version   int    `json:"version"`
}

// digest returns the image digest this application is configured with, or ""
// when its image reference is not digest-pinned.
func (a containerApp) digest() string { return digestPattern.FindString(a.Image) }

// settled reports whether the application is between transitions. Wrangler
// derives `provisioning` from instances that are starting or scheduling and
// `degraded` from instances that have failed; `active` and `ready` are the two
// resting states (with and without live instances).
func (a containerApp) settled() bool { return a.State == "active" || a.State == "ready" }

// listContainerApps returns the account's container applications.
func (w *wrangler) listContainerApps(ctx context.Context) ([]containerApp, error) {
	out, err := w.run(ctx, "", "containers", "list", "--json")
	if err != nil {
		return nil, err
	}
	raw, ok := jsonArray(out)
	if !ok {
		return nil, fmt.Errorf("could not read the container application list from "+
			"`wrangler containers list --json`:\n%s", strings.TrimSpace(out))
	}
	var apps []containerApp
	if err := json.Unmarshal([]byte(raw), &apps); err != nil {
		return nil, fmt.Errorf("could not parse `wrangler containers list --json`: %w", err)
	}
	return apps, nil
}

// findContainerApp returns the named application, or false when the listing
// does not have one.
func findContainerApp(apps []containerApp, name string) (containerApp, bool) {
	for _, app := range apps {
		if app.Name == name {
			return app, true
		}
	}
	return containerApp{}, false
}

// RolloutError reports that the deploy could not prove the container
// application is serving the image it just pushed.
//
// It is its own type because the deployment itself succeeded: the bundle is
// uploaded, the secrets landed and ~/.ticksrc holds the credentials. What
// failed is the confirmation, and the remedy is to wait and look rather than
// to undo anything. Saying that plainly is the whole point — the alternative
// is the green deploy that sends the operator hunting for a bug that is not
// there.
type RolloutError struct {
	// Expected is the digest this deploy pushed, "" when it could not be read.
	Expected string
	// Serving is the digest the application last reported, "" when unknown.
	Serving string
	// Reason names which confirmation failed, in one sentence.
	Reason string
	// Waited is how long the wait ran before giving up. Zero when the wait
	// never started.
	Waited time.Duration
	// Err is the underlying failure, if any.
	Err error
}

func (e *RolloutError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "the factory deployed, but the %s container rollout could not be confirmed: %s",
		ContainerAppName, e.Reason)
	if e.Expected != "" {
		fmt.Fprintf(&b, "\n  image this deploy pushed: %s", e.Expected)
	}
	if e.Serving != "" {
		fmt.Fprintf(&b, "\n  image the application reports: %s", e.Serving)
	}
	if e.Waited > 0 {
		fmt.Fprintf(&b, "\n  waited: %s", e.Waited.Round(time.Second))
	}
	b.WriteString("\n" +
		"Nothing is lost and nothing needs undoing — the bundle, the secrets and your\n" +
		"credentials all landed. What is not proven is that a run started NOW would boot\n" +
		"the image this deploy built rather than the previous one, which is why this is\n" +
		"not being reported as success.\n" +
		"Check `wrangler containers list` until the image matches, then re-run\n" +
		"`tk factory deploy` (it is idempotent), or deploy with --skip-rollout-wait to\n" +
		"accept the unconfirmed state deliberately.")
	return b.String()
}

func (e *RolloutError) Unwrap() error { return e.Err }

// rolloutOutcome is what a confirmed (or deliberately skipped) rollout leaves
// for the Result and for the operator.
type rolloutOutcome struct {
	// Ref is the digest-pinned image reference the deploy pushed.
	Ref string
	// Digest is the image digest the application was confirmed to serve.
	Digest string
	// Confirmed reports whether the application actually answered with it.
	Confirmed bool
}

// confirmContainerRollout waits for the container application to report the
// image this deploy pushed, and reports honestly when it cannot.
func confirmContainerRollout(
	ctx context.Context,
	w *wrangler,
	out io.Writer,
	deployOut string,
	timeout, poll time.Duration,
	skip bool,
) (rolloutOutcome, error) {
	ref, digest := parsePushedImage(deployOut)
	outcome := rolloutOutcome{Ref: ref, Digest: digest}

	if skip {
		fmt.Fprintf(out, "container rollout NOT confirmed (--skip-rollout-wait): "+
			"a run started now may still boot the previous image\n")
		if ref != "" {
			fmt.Fprintf(out, "  image this deploy pushed: %s\n", ref)
		}
		return outcome, nil
	}

	if digest == "" {
		// Not a parse bug to shrug at: without the digest there is nothing to
		// compare the application against, so the deploy cannot tell a rolled
		// out image from a stale one — the exact condition this wait exists
		// to remove.
		return outcome, &RolloutError{
			Reason: "wrangler's deploy output named no digest-pinned " + ContainerAppName +
				" image, so there is nothing to compare the application against",
		}
	}

	if timeout <= 0 {
		timeout = defaultRolloutTimeout
	}
	if poll <= 0 {
		poll = defaultRolloutPoll
	}

	fmt.Fprintf(out, "waiting for the %s container application to serve %s\n",
		ContainerAppName, shortDigest(digest))

	started := time.Now()
	deadline := started.Add(timeout)
	var lastServing string
	var lastErr error
	for attempt := 1; ; attempt++ {
		apps, err := w.listContainerApps(ctx)
		switch {
		case err != nil:
			lastErr = err
		default:
			lastErr = nil
			app, ok := findContainerApp(apps, ContainerAppName)
			switch {
			case !ok:
				lastErr = fmt.Errorf("the account lists no container application named %q", ContainerAppName)
			default:
				lastServing = app.digest()
				if lastServing == digest && app.settled() {
					fmt.Fprintf(out, "container application %s is serving %s (%s)\n",
						ContainerAppName, shortDigest(digest), app.State)
					outcome.Confirmed = true
					return outcome, nil
				}
			}
		}

		if !time.Now().Add(poll).Before(deadline) {
			break
		}
		if attempt == 1 {
			// One line, not one per poll: a five-minute wait must not bury
			// the deploy's own output.
			fmt.Fprintf(out, "  rollout in progress; polling every %s for up to %s\n",
				poll.Round(time.Second), timeout.Round(time.Second))
		}
		timer := time.NewTimer(poll)
		select {
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
			return outcome, ctx.Err()
		case <-timer.C:
		}
	}

	failure := &RolloutError{
		Expected: ref,
		Serving:  lastServing,
		Waited:   time.Since(started),
		Err:      lastErr,
	}
	switch {
	case lastErr != nil:
		failure.Reason = "the container application could not be read: " + lastErr.Error()
	case lastServing == "":
		failure.Reason = "the container application reports no digest-pinned image"
	default:
		failure.Reason = "the container application is still serving a different image"
	}
	return outcome, failure
}

func shortDigest(digest string) string {
	hex := strings.TrimPrefix(digest, "sha256:")
	if len(hex) > 12 {
		return "sha256:" + hex[:12]
	}
	return digest
}
