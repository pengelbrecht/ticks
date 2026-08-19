package factory

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// PrerequisiteError reports that the deploy stopped before doing anything
// because something the operator must provide is missing — wrangler itself, or
// a wrangler that is not logged in. It is a distinct type because a missing
// prerequisite is a stop with an actionable message, never a silent default
// (D16: the factory runs in the operator's own account or not at all).
type PrerequisiteError struct {
	// What is missing, in one noun phrase ("wrangler", "a logged-in wrangler").
	Missing string
	// Detail is the actionable remedy, printed under the summary.
	Detail string
	// Err is the underlying failure, if any.
	Err error
}

func (e *PrerequisiteError) Error() string {
	msg := fmt.Sprintf("%s is required to deploy the factory but is not available", e.Missing)
	if e.Detail != "" {
		msg += "\n" + e.Detail
	}
	return msg
}

func (e *PrerequisiteError) Unwrap() error { return e.Err }

// installHint is printed when no wrangler can be found. It names pnpm first
// because this repo is pnpm-only, but a global npm install is what most
// operators have.
const installHint = "Install it with `pnpm add -g wrangler` (or `npm install -g wrangler`),\n" +
	"or install it in a project so `npx wrangler` resolves. Then run `wrangler login`\n" +
	"to connect your Cloudflare account."

// wranglerCandidate is one way to invoke the CLI. bin is either a command
// resolved through PATH or an absolute path to a local project binary.
type wranglerCandidate struct {
	bin    string
	prefix []string
	label  string
}

// wranglerCandidates are the PATH-based ways to invoke the CLI. A global
// binary is the simplest, but plenty of operators only ever run `npx wrangler`.
//
// Both npx forms pass the flag that means "do not install anything": tk must
// never pull a package off the network behind the operator's back, and a
// wrangler that is genuinely absent has to surface as the actionable stop
// below. `--no` is current npm; `--no-install` is what older npx understands.
var wranglerCandidates = []wranglerCandidate{
	{bin: "wrangler", label: "wrangler"},
	{bin: "npx", prefix: []string{"--no", "wrangler"}, label: "npx wrangler"},
	{bin: "npx", prefix: []string{"--no-install", "wrangler"}, label: "npx wrangler"},
}

// wrangler runs the Cloudflare CLI in a fixed working directory.
type wrangler struct {
	bin    string
	prefix []string
	label  string
	dir    string
	// out receives wrangler's own progress output, so a real deploy is not
	// silent while it uploads.
	out io.Writer
}

// findWrangler resolves how to invoke the CLI, by *running* each candidate
// rather than by inspecting the environment: the only proof that a wrangler
// works is a wrangler that answered. Nothing else in the deploy can proceed
// without one, so failure here is the canonical PrerequisiteError.
//
// The probe runs in the caller's working directory — `--version` reads no
// config — so no directory has to exist before the precondition is settled.
// A directly named PATH binary remains the first choice when it validates.
// Local project copies come before the npx fallbacks because they are the
// dependency selected by this repository (and the staged bundle's
// dependency), while npx can report its own version without doing any work.
func findWrangler(ctx context.Context, out io.Writer, bundleDir string) (*wrangler, string, error) {
	startDir, err := os.Getwd()
	if err != nil {
		startDir = ""
	}
	return findWranglerFrom(ctx, out, bundleDir, startDir)
}

func findWranglerFrom(ctx context.Context, out io.Writer, bundleDir, startDir string) (*wrangler, string, error) {
	var lastErr error
	candidates := localWranglerCandidates(bundleDir, startDir)
	pathCandidates := make([]wranglerCandidate, 0, len(candidates)+len(wranglerCandidates))
	// Keep the direct PATH candidate ahead of local copies, but keep local
	// copies ahead of npx: npx has a known false-positive --version response.
	pathCandidates = append(pathCandidates, wranglerCandidates[0])
	pathCandidates = append(pathCandidates, candidates...)
	pathCandidates = append(pathCandidates, wranglerCandidates[1:]...)

	for _, candidate := range pathCandidates {
		bin, err := exec.LookPath(candidate.bin)
		if err != nil {
			lastErr = err
			continue
		}
		w := &wrangler{bin: bin, prefix: candidate.prefix, label: candidate.label, out: out}
		version, err := w.probeVersion(ctx)
		if err != nil {
			lastErr = err
			continue
		}
		return w, version, nil
	}
	return nil, "", &PrerequisiteError{Missing: "wrangler", Detail: installHint, Err: lastErr}
}

// localWranglerCandidates checks the two project-owned copies that can exist
// without a global install. The staged bundle preserves node_modules between
// deploys, while the repository copy is the factory package's devDependency.
// Both are direct executable paths: no package manager is asked to download
// anything on the operator's behalf.
func localWranglerCandidates(bundleDir, startDir string) []wranglerCandidate {
	var candidates []wranglerCandidate
	if bundleDir != "" {
		for _, candidatePath := range []string{
			filepath.Join(bundleDir, "node_modules", ".bin", "wrangler"),
			filepath.Join(bundleDir, "wrangler"),
		} {
			path, ok := absolutePath(candidatePath)
			if !ok {
				continue
			}
			candidates = append(candidates, wranglerCandidate{
				bin:   path,
				label: "staged bundle Wrangler",
			})
		}
	}

	if path := findRepositoryFactoryWrangler(startDir); path != "" {
		candidates = append(candidates, wranglerCandidate{
			bin:   path,
			label: "cloud/factory/node_modules/.bin/wrangler",
		})
	}
	return candidates
}

func absolutePath(path string) (string, bool) {
	abs, err := filepath.Abs(path)
	return abs, err == nil
}

func findRepositoryFactoryWrangler(startDir string) string {
	if startDir == "" {
		return ""
	}
	dir, ok := absolutePath(startDir)
	if !ok {
		return ""
	}
	if info, err := os.Stat(dir); err == nil && !info.IsDir() {
		dir = filepath.Dir(dir)
	}

	for {
		candidate := filepath.Join(dir, "cloud", "factory", "node_modules", ".bin", "wrangler")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

// commandError carries what a failed wrangler invocation said, so callers can
// decide (existence probes) or report (everything else) without re-running it.
type commandError struct {
	args   []string
	output string
	err    error
}

func (e *commandError) Error() string {
	return fmt.Sprintf("wrangler %s failed: %v\n%s", strings.Join(e.args, " "), e.err, strings.TrimSpace(e.output))
}

func (e *commandError) Unwrap() error { return e.err }

// run invokes wrangler and returns its combined output. stdin is supplied for
// `secret put`, which reads the secret value from it; every other call gets an
// empty stdin, which is also what keeps wrangler non-interactive (it never
// prompts when stdin is not a terminal).
func (w *wrangler) run(ctx context.Context, stdin string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, w.bin, append(append([]string(nil), w.prefix...), args...)...)
	cmd.Dir = w.dir
	cmd.Stdin = strings.NewReader(stdin)
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	out := buf.String()
	if err != nil {
		return out, &commandError{args: args, output: out, err: err}
	}
	return out, nil
}

// probeVersion asks the candidate for its version. It is the "is this really a
// working wrangler" test, and its output identifies the CLI that did the work.
func (w *wrangler) probeVersion(ctx context.Context) (string, error) {
	out, err := w.run(ctx, "", "--version")
	if err != nil {
		return "", err
	}
	version := strings.TrimSpace(lastNonEmptyLine(out))
	if !isWranglerVersion(version) {
		return "", fmt.Errorf("version probe did not identify Wrangler (got %q)", version)
	}
	return version, nil
}

var semverPattern = regexp.MustCompile(`(?i)(?:^|[^0-9])v?[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?(?:$|[^0-9])`)
var plausibleWranglerVersionPattern = regexp.MustCompile(`(?i)(?:^|[^0-9])v?(?:3|4)\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?(?:$|[^0-9])`)

func isWranglerVersion(version string) bool {
	if version == "" || !semverPattern.MatchString(version) {
		return false
	}
	// Wrangler currently reports a 3.x or 4.x version without its name. Keep
	// accepting that form, while also allowing a future major version when the
	// CLI identifies itself explicitly.
	return plausibleWranglerVersionPattern.MatchString(version) ||
		strings.Contains(strings.ToLower(version), "wrangler")
}

// requireAuth fails unless wrangler holds credentials for a Cloudflare account.
// This is a precondition, not a step: every later command would fail anyway,
// and each would report it as its own unrelated problem.
//
// It reads the exit code and nothing else. `wrangler whoami` prints a scope
// table whose contents do not predict what the token can do — an operator
// whose whoami lists no "r2" scope can still list and create R2 buckets — so
// every capability question is answered by attempting the operation and
// surfacing the real API error, never by parsing this output.
func (w *wrangler) requireAuth(ctx context.Context) error {
	if _, err := w.run(ctx, "", "whoami"); err != nil {
		return &PrerequisiteError{
			Missing: "a logged-in wrangler",
			Detail: "Run `wrangler login` (or set CLOUDFLARE_API_TOKEN) so wrangler can reach\n" +
				"your Cloudflare account, then run `tk factory deploy` again.",
			Err: err,
		}
	}
	return nil
}

// d1Database is one entry of `wrangler d1 list --json`.
type d1Database struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
}

// jsonArray extracts the first top-level JSON array from wrangler's output.
// wrangler prints banners and update notices around its JSON, so the raw
// stream is not parseable as-is.
func jsonArray(out string) (string, bool) {
	start := strings.Index(out, "[")
	end := strings.LastIndex(out, "]")
	if start == -1 || end == -1 || end < start {
		return "", false
	}
	return out[start : end+1], true
}

// listDatabases returns the account's D1 databases.
func (w *wrangler) listDatabases(ctx context.Context) ([]d1Database, error) {
	out, err := w.run(ctx, "", "d1", "list", "--json")
	if err != nil {
		return nil, err
	}
	raw, ok := jsonArray(out)
	if !ok {
		return nil, fmt.Errorf("could not read the database list from `wrangler d1 list --json`:\n%s", strings.TrimSpace(out))
	}
	var dbs []d1Database
	if err := json.Unmarshal([]byte(raw), &dbs); err != nil {
		return nil, fmt.Errorf("could not parse `wrangler d1 list --json`: %w", err)
	}
	return dbs, nil
}

// findDatabase returns the id of the named database, or "" when the account
// does not have one.
func (w *wrangler) findDatabase(ctx context.Context, name string) (string, error) {
	dbs, err := w.listDatabases(ctx)
	if err != nil {
		return "", err
	}
	for _, db := range dbs {
		if db.Name == name {
			return db.UUID, nil
		}
	}
	return "", nil
}

// ensureDatabase returns the id of the named D1 database, creating it if the
// account does not have one. The id always comes from a fresh list rather than
// from the create output, so both paths read it the same documented way.
func (w *wrangler) ensureDatabase(ctx context.Context, name string) (id string, created bool, err error) {
	id, err = w.findDatabase(ctx, name)
	if err != nil {
		return "", false, err
	}
	if id != "" {
		return id, false, nil
	}
	if _, err := w.run(ctx, "", "d1", "create", name); err != nil {
		return "", false, err
	}
	id, err = w.findDatabase(ctx, name)
	if err != nil {
		return "", true, err
	}
	if id == "" {
		return "", true, fmt.Errorf("created D1 database %q but it is not in `wrangler d1 list`; re-run `tk factory deploy`", name)
	}
	return id, true, nil
}

// bucketExists probes for an R2 bucket. `r2 bucket info` is the direct answer;
// older wranglers do not have it, so the bucket list is the fallback. When
// neither probe can answer, it reports false and lets the create attempt
// decide — never an error, because "I could not tell" must not fail a deploy
// whose bucket is fine.
func (w *wrangler) bucketExists(ctx context.Context, name string) bool {
	if _, err := w.run(ctx, "", "r2", "bucket", "info", name); err == nil {
		return true
	}
	out, err := w.run(ctx, "", "r2", "bucket", "list")
	if err != nil {
		return false
	}
	return listMentionsName(out, name)
}

// listMentionsName looks for name as a whole field in tabular wrangler output,
// so a bucket called "ticks-factory-artifacts-old" is not mistaken for
// "ticks-factory-artifacts".
func listMentionsName(out, name string) bool {
	for _, line := range strings.Split(out, "\n") {
		for _, field := range strings.FieldsFunc(line, func(r rune) bool {
			return r == ' ' || r == '\t' || r == '|' || r == ',' || r == '"' || r == '│'
		}) {
			if strings.TrimSpace(field) == name {
				return true
			}
		}
	}
	return false
}

// ensureBucket creates the R2 bucket unless the account already has it.
func (w *wrangler) ensureBucket(ctx context.Context, name string) (created bool, err error) {
	if w.bucketExists(ctx, name) {
		return false, nil
	}
	if _, err := w.run(ctx, "", "r2", "bucket", "create", name); err != nil {
		// A create can lose a race with another deploy, or fail because the
		// probes above could not see an existing bucket. Re-probe before
		// reporting: an existing bucket is the outcome we wanted.
		if w.bucketExists(ctx, name) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// applyMigrations runs the bundle's D1 migrations against the remote database.
func (w *wrangler) applyMigrations(ctx context.Context, name string) error {
	out, err := w.run(ctx, "", "d1", "migrations", "apply", name, "--remote")
	if err != nil {
		return err
	}
	w.echo(out)
	return nil
}

// execute runs one SQL statement against the remote database.
func (w *wrangler) execute(ctx context.Context, name, sql string) error {
	_, err := w.run(ctx, "", "d1", "execute", name, "--remote", "--command", sql)
	return err
}

// deploy uploads the bundle and returns wrangler's output.
func (w *wrangler) deploy(ctx context.Context) (string, error) {
	out, err := w.run(ctx, "", "deploy")
	if err != nil {
		return out, err
	}
	w.echo(out)
	return out, nil
}

// putSecret writes a Worker secret, passing the value on stdin so it never
// appears in the process table.
func (w *wrangler) putSecret(ctx context.Context, name, value string) error {
	_, err := w.run(ctx, value, "secret", "put", name)
	return err
}

func (w *wrangler) echo(out string) {
	if w.out == nil {
		return
	}
	trimmed := strings.TrimRight(out, "\n")
	if trimmed == "" {
		return
	}
	fmt.Fprintln(w.out, indent(trimmed, "  "))
}

func indent(s, prefix string) string {
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = prefix + l
	}
	return strings.Join(lines, "\n")
}

func lastNonEmptyLine(s string) string {
	lines := strings.Split(strings.TrimSpace(s), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.TrimSpace(lines[i]) != "" {
			return lines[i]
		}
	}
	return ""
}

// urlPattern matches the endpoint wrangler prints after a deploy. http is
// accepted alongside https because the endpoint is not always a workers.dev
// host — a local or proxied deployment is still what the operator deployed,
// and refusing to read it would only push them to pass --url by hand.
var urlPattern = regexp.MustCompile(`https?://[A-Za-z0-9._~%+-]+(?::[0-9]+)?(?:/[A-Za-z0-9._~%+/-]*)?`)

// docsHosts are the URLs wrangler prints that are not the deployment.
var docsHosts = []string{"developers.cloudflare.com", "dash.cloudflare.com", "workers.cloudflare.com", "github.com"}

// parseDeployedURL pulls the deployment's base URL out of `wrangler deploy`
// output. Detection is best-effort by nature — a custom route or a
// workers_dev = false config prints something else entirely — so a caller that
// gets "" must stop and ask for --url rather than guess.
func parseDeployedURL(out string) string {
	for _, match := range urlPattern.FindAllString(out, -1) {
		candidate := strings.TrimRight(match, ".,)")
		scheme, rest, ok := strings.Cut(candidate, "://")
		if !ok {
			continue
		}
		host := candidate
		if i := strings.Index(rest, "/"); i >= 0 {
			host = scheme + "://" + rest[:i]
		}
		skip := false
		for _, docs := range docsHosts {
			if strings.Contains(host, docs) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}
		return strings.TrimSuffix(host, "/")
	}
	return ""
}
