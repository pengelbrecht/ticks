// Package factory deploys the ticks cloud factory into the operator's own
// Cloudflare account.
//
// The factory is a deployable, not a deployment (D16 in
// docs/design/cloud-factory.md): ticks.sh never runs one. `tk factory deploy`
// is therefore an installer — it wraps the operator's own `wrangler` against
// their own account, and the only thing tk contributes is the bundle embedded
// in this binary, which is what pins a deployment to a tk version.
//
// The command is idempotent by construction. Provisioning asks before it
// creates, the bearer token is reused from ~/.ticksrc unless rotation is asked
// for, and the deploy itself is an upsert. Re-running is the upgrade path.
package factory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// Options configures a deploy.
type Options struct {
	// Version is the tk version the deployment is pinned to. Required; the
	// pin is what lets `tk upgrade` offer a redeploy.
	Version string

	// BundleDir is where the embedded bundle is materialized and wrangler is
	// run. Empty means the default under the ticks home directory.
	BundleDir string

	// ConfigPath overrides the ~/.ticksrc location (tests).
	ConfigPath string

	// RotateToken mints a new bearer token instead of reusing the stored one.
	RotateToken bool

	// HasCommand reports whether this tk implements a subcommand chain
	// ({"sandbox", "environment"}). The orchestrator image builds its tk from
	// this binary's own source, so this is what proves the container will be
	// able to run the entrypoint it ships with — before a multi-minute image
	// build, and with the missing subcommand named. Required: a deploy that
	// cannot ask is a deploy that cannot check.
	HasCommand func(chain []string) bool

	// SourceRef overrides the ref the image builds tk from (tests). Empty
	// means the source this binary was built from, per [SourceRef].
	SourceRef string

	// URL overrides the endpoint instead of reading it from wrangler's deploy
	// output. Needed when the Worker is served from a custom route, where
	// there is nothing to detect.
	URL string

	// Out receives progress. Nil means os.Stdout.
	Out io.Writer

	// HTTPClient verifies the deployed endpoint. Nil means a client with a
	// short timeout.
	HTTPClient *http.Client

	// verifyAttempts/verifyDelay control the retry on the post-deploy probe:
	// a fresh workers.dev route can take a few seconds to answer.
	verifyAttempts int
	verifyDelay    time.Duration

	// SkipRolloutWait accepts an unconfirmed container rollout instead of
	// failing. It is the deliberate escape hatch for an account or a wrangler
	// whose container listing this build cannot read: the deploy still says,
	// in its output, that nothing was confirmed.
	SkipRolloutWait bool

	// rolloutTimeout/rolloutPoll bound the wait for the container application
	// to report the pushed image (tests).
	rolloutTimeout time.Duration
	rolloutPoll    time.Duration

	// onSecretPut runs after `wrangler secret put` returns, so the test
	// harness can propagate the secret into its fake worker the way
	// Cloudflare does for real.
	onSecretPut func()
}

// Result describes what a deploy produced.
type Result struct {
	// URL is the factory's base endpoint.
	URL string
	// Token is the bearer token now in ~/.ticksrc.
	Token string
	// Rotated reports whether this run minted a new token.
	Rotated bool
	// Version is the tk version the deployment is pinned to.
	Version string
	// SourceRef is the ref the orchestrator image built its tk from.
	SourceRef string
	// BundleSHA identifies the deployed bundle's contents.
	BundleSHA string
	// DatabaseID is the D1 database the deployment is bound to.
	DatabaseID string
	// CreatedDatabase / CreatedBucket report first-time provisioning, so the
	// command can tell a fresh install from an upgrade.
	CreatedDatabase bool
	CreatedBucket   bool
	// WranglerVersion is the CLI that did the work.
	WranglerVersion string
	// ConfigPath is the file the credentials were written to.
	ConfigPath string
	// ImageRef is the digest-pinned orchestrator image this deploy pushed,
	// empty when wrangler's output named none.
	ImageRef string
	// ImageDigest is that image's digest — the identity a run's container
	// boots, and the one thing that tells a fix that did not work from a fix
	// that was never running.
	ImageDigest string
	// RolloutConfirmed reports whether the container application was actually
	// observed serving ImageDigest. False means the deploy is not claiming a
	// run started now boots this image.
	RolloutConfirmed bool
}

// DefaultBundleDir is where the bundle is materialized: under the ticks home
// directory, so wrangler's per-project state survives between deploys and the
// operator can inspect exactly what was uploaded.
func DefaultBundleDir() (string, error) {
	if dir := os.Getenv("TK_HOME"); dir != "" {
		return filepath.Join(dir, "factory", "bundle"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locating home directory: %w", err)
	}
	return filepath.Join(home, ".tick", "factory", "bundle"), nil
}

// Deploy installs (or upgrades) the factory in the operator's Cloudflare
// account and records the endpoint and token in ~/.ticksrc.
//
// The order is deliberate: every precondition is checked before anything is
// created, and the credential is written to ~/.ticksrc *before* the endpoint
// is verified. A token that reached Cloudflare but not the operator's disk
// would be unrecoverable — the worker only ever holds its hash — so the last
// step is the one allowed to fail.
func Deploy(ctx context.Context, opts Options) (*Result, error) {
	out := opts.Out
	if out == nil {
		out = os.Stdout
	}
	if opts.Version == "" {
		return nil, fmt.Errorf("factory deploy: no tk version to pin the deployment to")
	}

	// Before anything else — before a prerequisite probe, before a byte is
	// written, before a container image is built — prove this binary can
	// actually run the entrypoint it would ship.
	//
	// The image builds its tk from this binary's source, so "does this tk have
	// `tk sandbox environment`?" and "will the container's tk have it?" are the
	// same question. Asking it here turns a container that boots, streams, and
	// dies at exit 6 into a stop that names the subcommand.
	if opts.HasCommand == nil {
		return nil, fmt.Errorf(
			"factory deploy: this build did not supply its command set, so the orchestrator\n" +
				"image's tk cannot be checked against the entrypoint it would ship")
	}
	if err := verifyEntrypointTkCommands(opts.Version, opts.HasCommand); err != nil {
		return nil, err
	}

	bundleDir := opts.BundleDir
	if bundleDir == "" {
		var err error
		if bundleDir, err = DefaultBundleDir(); err != nil {
			return nil, err
		}
	}

	// Preconditions first: a missing prerequisite is a stop, and settling them
	// before the first `create` keeps a half-provisioned account impossible.
	// Nothing on disk is touched until they pass.
	w, wranglerVersion, err := findWrangler(ctx, out, bundleDir)
	if err != nil {
		return nil, err
	}
	if err := w.requireAuth(ctx); err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "%s %s, authenticated\n", w.label, wranglerVersion)

	// The orchestrator sandbox is a container image, and wrangler builds and
	// pushes it into the operator's own registry as part of the deploy. Both
	// halves are checked here, before anything is created: a Worker deployed
	// with a container binding whose image never got built is a factory that
	// refuses every run, with a message pointing at the very command that
	// produced it.
	dockerVersion, err := requireDocker(ctx)
	if err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "%s %s, daemon reachable\n", dockerBinary(), dockerVersion)

	pm, pmVersion, err := findPackageManager(ctx, out)
	if err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "%s %s\n", pm.label, pmVersion)

	// Everything from here runs in the bundle directory.
	if err := os.MkdirAll(bundleDir, 0o755); err != nil {
		return nil, fmt.Errorf("preparing %s: %w", bundleDir, err)
	}
	w.dir = bundleDir

	cfg, err := loadConfig(opts.ConfigPath)
	if err != nil {
		return nil, err
	}

	token := cfg.Get(ticksrc.KeyFactoryToken)
	rotated := false
	if token == "" || opts.RotateToken {
		if token, err = MintToken(); err != nil {
			return nil, err
		}
		rotated = true
	}

	// The bundle is written fresh on every run: the deployed code is this
	// binary's, or the version pin means nothing.
	if err := Materialize(bundleDir); err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "bundle %s (tk %s) staged in %s\n", shortSHA(BundleSHA()), opts.Version, bundleDir)

	// The image's build context is staged as a sibling of the bundle, because
	// that is what makes the `[[containers]]` image path in the committed
	// wrangler.toml (`../sandbox/Dockerfile`) resolve to the same tree here as
	// it does in the repository.
	// The ref the image builds its tk from — resolved here, after the
	// prerequisite probes (a missing wrangler is a more useful thing to be told
	// about first) and still before anything is created in the account. A dev
	// build over a dirty worktree, or one with no commit stamped at all, stops:
	// the image can only build a commit that exists.
	sourceRef := opts.SourceRef
	if sourceRef == "" {
		if sourceRef, err = SourceRef(opts.Version); err != nil {
			return nil, err
		}
	}

	sandboxDir := SandboxDir(bundleDir)
	if err := MaterializeSandbox(sandboxDir); err != nil {
		return nil, err
	}
	// The image's two tk pins are the deploy's answers, not the committed
	// defaults: the container's tk is built from this binary's source and
	// labelled with this binary's version, which is what keeps it in step with
	// the bundle it boots.
	if err := SetSandboxTkPins(sandboxDir, opts.Version, sourceRef); err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "orchestrator image context staged in %s (tk %s built from %s)\n",
		sandboxDir, opts.Version, sourceRef)

	// The Worker imports the Cloudflare Sandbox SDK to run a container, so the
	// staged bundle is installed before it is deployed. Local work, done before
	// the first `create`: a deploy that cannot bundle must not have provisioned
	// half an account first.
	if err := pm.installDependencies(ctx, bundleDir); err != nil {
		return nil, err
	}

	databaseID, createdDB, err := w.ensureDatabase(ctx, DatabaseName)
	if err != nil {
		return nil, fmt.Errorf("provisioning D1 database %q: %w", DatabaseName, err)
	}
	fmt.Fprintf(out, "D1 %s %s (%s)\n", DatabaseName, createdOrReused(createdDB), databaseID)

	createdBucket, err := w.ensureBucket(ctx, BucketName)
	if err != nil {
		return nil, fmt.Errorf("provisioning R2 bucket %q: %w", BucketName, err)
	}
	fmt.Fprintf(out, "R2 %s %s\n", BucketName, createdOrReused(createdBucket))

	if err := SetDatabaseID(bundleDir, databaseID); err != nil {
		return nil, err
	}
	if err := w.applyMigrations(ctx, DatabaseName); err != nil {
		return nil, fmt.Errorf("applying D1 migrations: %w", err)
	}

	deployOut, err := w.deploy(ctx)
	if err != nil {
		return nil, fmt.Errorf("deploying the factory worker: %w", err)
	}

	url := strings.TrimSuffix(opts.URL, "/")
	if url == "" {
		url = parseDeployedURL(deployOut)
	}
	if url == "" {
		url = strings.TrimSuffix(cfg.Get(ticksrc.KeyFactoryURL), "/")
	}
	if url == "" {
		return nil, fmt.Errorf(
			"the worker deployed, but wrangler's output did not name an endpoint.\n"+
				"Re-run with --url https://<your factory host> so tk can record and verify it:\n%s",
			strings.TrimSpace(deployOut))
	}

	hash, err := DeriveTokenHash(token)
	if err != nil {
		return nil, err
	}
	if err := w.putSecret(ctx, SecretName, hash); err != nil {
		return nil, fmt.Errorf("setting the %s secret: %w", SecretName, err)
	}
	if opts.onSecretPut != nil {
		opts.onSecretPut()
	}
	fmt.Fprintf(out, "%s %s\n", SecretName, tokenVerb(rotated))

	// The endpoint is known exactly here, and the Worker needs it to hand a run
	// a gateway to route model traffic through (D17). Without it, submission
	// refuses rather than booting an agent that cannot reach a model.
	if err := w.putSecret(ctx, SecretFactoryBaseURL, url); err != nil {
		return nil, fmt.Errorf("setting the %s secret: %w", SecretFactoryBaseURL, err)
	}
	if opts.onSecretPut != nil {
		opts.onSecretPut()
	}
	fmt.Fprintf(out, "%s recorded as %s\n", SecretFactoryBaseURL, url)

	if err := recordDeployment(ctx, w, opts.Version); err != nil {
		return nil, err
	}

	// Written before verification on purpose: the plaintext token exists only
	// here, so losing it to a failed probe would strand the deployment.
	cfg.Set(ticksrc.KeyFactoryURL, url)
	cfg.Set(ticksrc.KeyFactoryToken, token)
	cfg.Set(ticksrc.KeyFactoryVersion, opts.Version)
	if err := cfg.Save(); err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "credentials written to %s\n", cfg.Path())

	result := &Result{
		URL:             url,
		Token:           token,
		Rotated:         rotated,
		Version:         opts.Version,
		SourceRef:       sourceRef,
		BundleSHA:       BundleSHA(),
		DatabaseID:      databaseID,
		CreatedDatabase: createdDB,
		CreatedBucket:   createdBucket,
		WranglerVersion: wranglerVersion,
		ConfigPath:      cfg.Path(),
	}

	if err := verifyEndpoint(ctx, opts, url, token); err != nil {
		return result, err
	}
	fmt.Fprintf(out, "verified %s/health and one authenticated request\n", url)

	// The Worker is live at this point; the container application is not
	// necessarily. `wrangler deploy` creates the container rollout and returns
	// without waiting for it, so this is where the deploy stops being allowed
	// to claim readiness on the strength of an exit code (see rollout.go).
	rollout, rolloutErr := confirmContainerRollout(
		ctx, w, out, deployOut, opts.rolloutTimeout, opts.rolloutPoll, opts.SkipRolloutWait)
	result.ImageRef = rollout.Ref
	result.ImageDigest = rollout.Digest
	result.RolloutConfirmed = rollout.Confirmed
	if rolloutErr != nil {
		return result, rolloutErr
	}

	// Recorded only once the application actually reports it, so the row a run
	// stamps itself with is the image the deployment was PROVEN to serve
	// rather than the one the deploy hoped for.
	if rollout.Confirmed {
		if err := recordDeploymentImage(ctx, w, rollout.Ref, rollout.Digest); err != nil {
			return result, err
		}
	}

	return result, nil
}

func loadConfig(path string) (*ticksrc.File, error) {
	if path != "" {
		return ticksrc.LoadFrom(path)
	}
	return ticksrc.Load()
}

func createdOrReused(created bool) string {
	if created {
		return "created"
	}
	return "reused"
}

func tokenVerb(rotated bool) string {
	if rotated {
		return "set from a newly minted token"
	}
	return "refreshed from the existing token"
}

func shortSHA(sha string) string {
	if len(sha) > 12 {
		return sha[:12]
	}
	return sha
}

// sqlSafe is what may appear inside the single-quoted SQL literals below. The
// values are a version string and a hex digest, so anything outside this set
// is a bug rather than an escaping problem worth solving.
var sqlSafe = regexp.MustCompile(`^[A-Za-z0-9._:+-]*$`)

// imageRefSafe is the same guard widened by the two characters an image
// reference needs — a registry path and the `@digest` separator — and nothing
// else. A value outside it is a bug, not an escaping problem to solve.
var imageRefSafe = regexp.MustCompile(`^[A-Za-z0-9._:+/@-]*$`)

// recordDeployment stores the deployed identity in D1, so a live factory can
// answer "which tk version and which bundle are you running?" without trusting
// the operator's local ~/.ticksrc.
func recordDeployment(ctx context.Context, w *wrangler, version string) error {
	sha := BundleSHA()
	stamp := time.Now().UTC().Format(time.RFC3339)
	for _, v := range []string{version, sha, stamp} {
		if !sqlSafe.MatchString(v) {
			return fmt.Errorf("refusing to record deployment metadata containing %q", v)
		}
	}
	sql := fmt.Sprintf(
		"INSERT INTO factory_deployment (id, tk_version, bundle_sha256, deployed_at) "+
			"VALUES (1, '%s', '%s', '%s') "+
			"ON CONFLICT(id) DO UPDATE SET tk_version=excluded.tk_version, "+
			"bundle_sha256=excluded.bundle_sha256, deployed_at=excluded.deployed_at",
		version, sha, stamp)
	if err := w.execute(ctx, DatabaseName, sql); err != nil {
		return fmt.Errorf("recording the deployed version in D1: %w", err)
	}
	return nil
}

// recordDeploymentImage stores the orchestrator image the container
// application was confirmed to serve, so the Worker can stamp each run it
// starts with the image that run boots — which is what makes `tk cloud status`
// able to answer "was my fix even running?" without the operator having to
// hold two deploys in their head.
func recordDeploymentImage(ctx context.Context, w *wrangler, ref, digest string) error {
	stamp := time.Now().UTC().Format(time.RFC3339)
	for _, v := range []string{ref, digest, stamp} {
		if !imageRefSafe.MatchString(v) {
			return fmt.Errorf("refusing to record container image metadata containing %q", v)
		}
	}
	sql := fmt.Sprintf(
		"INSERT INTO factory_deployment_image (id, image_ref, image_digest, confirmed_at) "+
			"VALUES (1, '%s', '%s', '%s') "+
			"ON CONFLICT(id) DO UPDATE SET image_ref=excluded.image_ref, "+
			"image_digest=excluded.image_digest, confirmed_at=excluded.confirmed_at",
		ref, digest, stamp)
	if err := w.execute(ctx, DatabaseName, sql); err != nil {
		return fmt.Errorf("recording the rolled-out orchestrator image in D1: %w", err)
	}
	return nil
}

// healthPayload is the slice of GET /health this command reads.
type healthPayload struct {
	Status   string `json:"status"`
	Bindings struct {
		// The container binding. A deployment without it records runs it can
		// never boot, so the deploy that produced it has to fail rather than
		// report success and leave the refusal for the first submission.
		Sandboxes bool `json:"sandboxes"`
	} `json:"bindings"`
	Auth struct {
		Required   bool `json:"required"`
		Configured bool `json:"configured"`
	} `json:"auth"`
}

const (
	// A freshly pushed Worker secret can take up to roughly 30 seconds to be
	// visible at the route. Six probes with capped exponential waits cover that
	// window without leaving a permanently failed deploy hanging forever.
	defaultVerifyAttempts = 6
	defaultVerifyDelay    = 2 * time.Second
	maxVerifyDelay        = 8 * time.Second
)

type verificationFailure struct {
	err       error
	retryable bool
}

func (e *verificationFailure) Error() string { return e.err.Error() }
func (e *verificationFailure) Unwrap() error { return e.err }

func verificationError(err error, retryable bool) error {
	return &verificationFailure{err: err, retryable: retryable}
}

func isRetryableVerificationError(err error) bool {
	var failure *verificationFailure
	if errors.As(err, &failure) {
		return failure.retryable
	}
	// Keep a future probe failure safe by treating an unclassified error as
	// transient. The final bounded attempt still fails closed.
	return true
}

func verificationBackoff(base time.Duration, retryNumber int) time.Duration {
	if base <= 0 {
		base = defaultVerifyDelay
	}
	if base > maxVerifyDelay {
		base = maxVerifyDelay
	}
	for i := 1; i < retryNumber; i++ {
		if base >= maxVerifyDelay/2 {
			return maxVerifyDelay
		}
		base *= 2
	}
	return base
}

// verifyEndpoint proves the deployment actually works: /health reports the
// token secret landed, and an authenticated request is accepted. The second
// check is the one that matters — it is the only thing that can tell a hash
// derived from *this* token from one left over from another deploy.
func verifyEndpoint(ctx context.Context, opts Options, url, token string) error {
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	attempts := opts.verifyAttempts
	if attempts <= 0 {
		attempts = defaultVerifyAttempts
	}
	delay := opts.verifyDelay
	if delay <= 0 {
		delay = defaultVerifyDelay
	}

	var lastErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		lastErr = verifyOnce(ctx, client, url, token)
		if lastErr == nil {
			return nil
		}
		if attempt >= attempts || !isRetryableVerificationError(lastErr) {
			break
		}
		wait := verificationBackoff(delay, attempt)
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return ctx.Err()
		case <-timer.C:
		}
	}
	return fmt.Errorf(
		"the bundle deployed and %s holds the credentials, but verifying %s failed: %w\n"+
			"Re-run `tk factory deploy` once the endpoint is reachable; nothing is lost by running it again",
		ticksrc.FileName, url, lastErr)
}

func verifyOnce(ctx context.Context, client *http.Client, url, token string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"/health", nil)
	if err != nil {
		return verificationError(err, false)
	}
	resp, err := client.Do(req)
	if err != nil {
		return verificationError(err, true)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body := readVerificationBody(resp)
		return verificationResponseError("GET /health", resp, body)
	}
	var health healthPayload
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&health); err != nil {
		return verificationError(fmt.Errorf("GET /health did not return the factory's health payload: %w", err), true)
	}
	if !health.Bindings.Sandboxes {
		// Retryable: a fresh Worker version can take a moment to serve. If it
		// is still false at the last attempt, the deploy failed — the alternative
		// is a green deploy in front of a factory that refuses every run with a
		// message naming this very command as the remedy.
		return verificationError(fmt.Errorf(
			"GET /health reports bindings.sandboxes=false: the deployed Worker has no container "+
				"binding, so every run would be refused. Check that `wrangler deploy` built and "+
				"pushed the orchestrator image, and that Containers are available on this "+
				"Cloudflare account"), true)
	}
	if !health.Auth.Configured {
		// The worker proves this with a real derivation, not a parse, so a
		// false here means either the secret never landed or it landed in a
		// form this deployment cannot actually verify a token against. The
		// worker log says which; naming only one of them is what misdirected
		// the first live diagnosis.
		return verificationError(fmt.Errorf("GET /health reports auth.configured=false: the %s secret did not land, "+
			"or it landed but this deployment cannot derive against it (see `wrangler tail` for which)", SecretName), true)
	}

	// Any authenticated route answers this: the worker runs auth before
	// routing, so an unknown path returns 404 to a caller it accepted and 401
	// to one it did not.
	probe, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"/api/factory-deploy-check", nil)
	if err != nil {
		return verificationError(err, false)
	}
	probe.Header.Set("Authorization", "Bearer "+token)
	probeResp, err := client.Do(probe)
	if err != nil {
		return verificationError(err, true)
	}
	defer probeResp.Body.Close()
	body := readVerificationBody(probeResp)
	switch probeResp.StatusCode {
	case http.StatusUnauthorized:
		return verificationError(fmt.Errorf("the factory rejected the token in %s — the deployed %s does not match it",
			ticksrc.FileName, SecretName), false)
	case http.StatusServiceUnavailable:
		return verificationError(fmt.Errorf("the factory reports its auth is not configured (503) — the %s secret did not land",
			SecretName), true)
	}
	if isRetryableVerificationResponse(probeResp.StatusCode, body) {
		return verificationResponseError("the authenticated factory probe", probeResp, body)
	}
	return nil
}

func readVerificationBody(resp *http.Response) []byte {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	return body
}

func isRetryableVerificationResponse(status int, body []byte) bool {
	return status == 1042 || status >= 500 || strings.Contains(strings.ToLower(string(body)), "1042")
}

func verificationResponseError(operation string, resp *http.Response, body []byte) error {
	message := fmt.Sprintf("%s returned %s", operation, resp.Status)
	if detail := firstLine(body); detail != "" {
		message += ": " + detail
	}
	return verificationError(errors.New(message), isRetryableVerificationResponse(resp.StatusCode, body))
}
