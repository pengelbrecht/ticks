//go:build !windows

package sandbox

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/cgi"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
)

// The container half of the factory's read-only git door (tick jwd).
//
// A read-only run is deliberately not given the operator's GitHub credential
// (tick pzf): it holds its own `tkr_` run token and its remote points at the
// factory's `/api/git/<owner>/<repo>.git` rather than at github.com. The first
// unattended loop this repository ever ran died there, in 28 seconds, with:
//
//	fatal: Authentication failed for 'https://<factory>/api/git/<owner>/<repo>.git/'
//
// and the whole of the fault is one missing response header. Git speaks HTTP
// auth through libcurl with `CURLAUTH_ANY`, which chooses its scheme from the
// `WWW-Authenticate` header of the 401. A 401 that carries no challenge names
// no scheme, so curl sends NO `Authorization` header on the retry — the
// credential helper answered, git held the run's token, and the token never
// left the container. The door parsed a Basic header it never asked for.
//
// These tests run the real `clone_at_sha` from cloud/sandbox/common.sh against
// a real smart-HTTP git server behind a gate that reproduces the door's
// authentication semantics, and assert the property that was missing rather
// than the code that was written: what the SERVER sees. The unattended run is
// the acceptance criterion, and this is what makes a second one worth paying
// for.

// ---------------------------------------------------------------------------
// Git isolation. Read this before adding a test to this file.
// ---------------------------------------------------------------------------
//
// These tests spawn a REAL git against a REAL HTTP remote that answers 401.
// That is the only way to prove the property under test — what the client
// actually sends — and it is also a loaded gun on a developer's machine: git
// resolves credential helpers from the SYSTEM config too, and macOS ships
// `credential-osxkeychain` there. A git that falls through to it pops a
// keychain dialog on somebody's desktop and waits for a human, which is both a
// hang and a rude thing to do to a person who typed `go test ./...`.
//
// So there is exactly ONE way to run git in this file: {@link doorGit} for a
// command, {@link isolatedGitEnv} for anything that builds its own. Nothing
// here may exec git directly, and nothing may reuse the
// package's shared `git()` helper, which inherits the host's environment on
// purpose for tests that want it. `TestGitInThisFileIsIsolated` is the
// backstop: it fails if this file grows a bare git invocation.

// isolatedGitEnv is the complete environment a git spawned by this file runs
// in. It is an ALLOWLIST rather than an addition to os.Environ(), so an
// inherited GIT_* on the developer's shell cannot reach in either.
//
// home must be a directory this test owns.
func isolatedGitEnv(home string) []string {
	return []string{
		"PATH=" + os.Getenv("PATH"),
		"HOME=" + home,
		// The three config scopes, all pointed somewhere harmless. NOSYSTEM is
		// honoured by every git that ships today; GIT_CONFIG_SYSTEM is set
		// beside it anyway, because "should be honoured" is not a standard
		// worth holding a stranger's keychain dialog to.
		"GIT_CONFIG_NOSYSTEM=1",
		"GIT_CONFIG_SYSTEM=/dev/null",
		"GIT_CONFIG_GLOBAL=" + filepath.Join(home, ".gitconfig"),
		// Nothing may fall back to a human: a prompt in a container is a hang,
		// and a prompt on a developer's machine is a dialog they did not ask
		// for.
		"GIT_TERMINAL_PROMPT=0",
		"GIT_ASKPASS=",
		"SSH_ASKPASS=",
		"GIT_AUTHOR_NAME=ticks test", "GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=ticks test", "GIT_COMMITTER_EMAIL=test@example.com",
	}
}

// doorGit runs one git command under {@link isolatedGitEnv}. Every git in this
// file goes through it.
func doorGit(t *testing.T, home, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = isolatedGitEnv(home)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return strings.TrimSpace(string(out))
}

// The backstop for the rule above: this file may not spawn a git any other way.
// A future test that execs git for itself, or reaches for the package's shared
// helper, is a future keychain dialog on somebody's machine — and this catches
// it at `go test` rather than at the dialog.
func TestGitInThisFileIsIsolated(t *testing.T) {
	body, err := os.ReadFile("git_door_test.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(body)
	// One construction site, inside doorGit itself.
	// Assembled rather than written out, so this line is not itself a match.
	if n := strings.Count(source, "exec.Command("+`"git"`); n != 1 {
		t.Errorf("%d direct git invocations in this file, want exactly 1 (doorGit): every git here must run under isolatedGitEnv", n)
	}
	// The package's shared helper (entrypoint_test.go) inherits the host
	// environment, including the system gitconfig this file exists to stay away
	// from. The pattern matches a bare call to it and not doorGit's.
	if bare := regexp.MustCompile(`(^|[^A-Za-z0-9_.])git\(t,`).FindAllString(source, -1); len(bare) > 0 {
		t.Errorf("this file calls the package's shared git() helper %d time(s); it inherits the host's system gitconfig — use doorGit", len(bare))
	}
	if !strings.Contains(source, `"GIT_CONFIG_NOSYSTEM=1"`) || !strings.Contains(source, `"GIT_CONFIG_SYSTEM=/dev/null"`) {
		t.Error("both system-config guards must stay in isolatedGitEnv")
	}
}

// gitDoor is a smart-HTTP git server guarded like the factory's `/api/git`
// route: anonymous requests get a 401 with the door's JSON body, and only a
// credentialled request reaches the repository.
type gitDoor struct {
	server *httptest.Server
	// challenge is whether the 401 carries `WWW-Authenticate: Basic`. False is
	// the door as it shipped, and the bug.
	challenge bool

	mu sync.Mutex
	// seen records every request, in order, so a test can assert what the
	// client actually SENT rather than what the server would have accepted.
	// The agent is kept because two different clients reach this door: git
	// itself, and the container's own diagnostic probe — which sends Basic
	// pre-emptively on purpose and would otherwise mask git's silence.
	seen []doorRequest
}

type doorRequest struct {
	auth  string
	agent string
}

func (d *gitDoor) record(r *http.Request) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.seen = append(d.seen, doorRequest{
		auth:  r.Header.Get("Authorization"),
		agent: r.Header.Get("User-Agent"),
	})
}

func (d *gitDoor) presented() []doorRequest {
	d.mu.Lock()
	defer d.mu.Unlock()
	return append([]doorRequest(nil), d.seen...)
}

// fromGit is what git itself sent, with the container's diagnostic probe
// filtered out.
func (d *gitDoor) fromGit() []doorRequest {
	var out []doorRequest
	for _, r := range d.presented() {
		if strings.HasPrefix(r.agent, "git/") {
			out = append(out, r)
		}
	}
	return out
}

// credentialled reports whether any request arrived carrying the token — the
// one question the production log could not answer.
func (d *gitDoor) credentialled(token string) bool {
	for _, r := range d.fromGit() {
		if basicPassword(r.auth) == token {
			return true
		}
	}
	return false
}

func basicPassword(header string) string {
	if !strings.HasPrefix(header, "Basic ") {
		return ""
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(strings.TrimPrefix(header, "Basic ")))
	if err != nil {
		return ""
	}
	_, password, _ := strings.Cut(string(decoded), ":")
	return password
}

// newGitDoor publishes repo (a real repository directory) over smart HTTP,
// behind the factory door's auth semantics.
func newGitDoor(t *testing.T, repo, token string, challenge bool) *gitDoor {
	t.Helper()
	backend := gitHTTPBackend(t)
	door := &gitDoor{challenge: challenge}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		door.record(r)
		auth := r.Header.Get("Authorization")

		if basicPassword(auth) != token {
			// Exactly the shape src/credentials.ts refuses with: a JSON body
			// naming the check that failed, and — the fix — the challenge that
			// tells git which scheme to answer with.
			if door.challenge {
				w.Header().Set("WWW-Authenticate", `Basic realm="ticks-factory", charset="UTF-8"`)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, `{"error":"run_token_required","detail":"model traffic must present its run's gateway token"}`)
			return
		}

		// Past the credential, this is the read half of git, served for real.
		// The upstream is a local repository rather than GitHub; what is under
		// test is the door, not who is behind it.
		(&cgi.Handler{
			Path: backend,
			Env: []string{
				"GIT_PROJECT_ROOT=" + filepath.Dir(repo),
				"GIT_HTTP_EXPORT_ALL=1",
			},
		}).ServeHTTP(w, r)
	})

	door.server = httptest.NewServer(handler)
	t.Cleanup(door.server.Close)
	return door
}

func gitHTTPBackend(t *testing.T) string {
	t.Helper()
	backend := filepath.Join(doorGit(t, t.TempDir(), "", "--exec-path"), "git-http-backend")
	if _, err := os.Stat(backend); err != nil {
		t.Skipf("no git-http-backend in this git installation: %v", err)
	}
	return backend
}

// doorFixture builds a repository, publishes it through a door, and returns
// everything `clone_at_sha` needs to reach it.
type doorFixture struct {
	door  *gitDoor
	url   string
	sha   string
	token string
	work  string
	home  string
}

func newDoorFixture(t *testing.T, challenge bool) *doorFixture {
	t.Helper()
	root := t.TempDir()
	home := filepath.Join(root, "home")
	source := filepath.Join(root, "ticks.git")
	for _, dir := range []string{home, source} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	// A bare repository, because that is what a git remote is.
	doorGit(t, home, root, "init", "-q", "--bare", "-b", "main", source)
	seed := filepath.Join(root, "seed")
	if err := os.MkdirAll(seed, 0o755); err != nil {
		t.Fatal(err)
	}
	doorGit(t, home, seed, "init", "-q", "-b", "main")
	if err := os.WriteFile(filepath.Join(seed, "README.md"), []byte("the repository a run clones\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	doorGit(t, home, seed, "add", "-A")
	doorGit(t, home, seed, "commit", "-q", "-m", "first")
	doorGit(t, home, seed, "remote", "add", "origin", source)
	doorGit(t, home, seed, "push", "-q", "origin", "main")
	sha := doorGit(t, home, seed, "rev-parse", "HEAD")

	token := "tkr_the_runs_own_credential"
	door := newGitDoor(t, source, token, challenge)
	return &doorFixture{
		door:  door,
		url:   door.server.URL + "/ticks.git",
		sha:   sha,
		token: token,
		work:  filepath.Join(root, "work"),
		home:  home,
	}
}

// clone sources cloud/sandbox/common.sh and calls the real `clone_at_sha`, the
// same function both entrypoints call, with the environment a read-only run is
// actually booted with: `GITHUB_TOKEN` carrying the run's own token and
// `TICKS_REPO_URL` pointing at the factory's door.
func (f *doorFixture) clone(t *testing.T) (string, int) {
	t.Helper()
	common, err := Path(CommonScript)
	if err != nil {
		t.Fatalf("locating %s: %v", CommonScript, err)
	}
	if err := os.MkdirAll(f.home, 0o755); err != nil {
		t.Fatal(err)
	}
	script := fmt.Sprintf(`set -euo pipefail
ME=ticks-orchestrator
source %q
clone_at_sha
`, common)
	cmd := exec.Command("bash", "-c", script)
	// The same allowlist every other git in this file runs under, plus the four
	// variables the control plane actually sets on a read-only container. Not
	// os.Environ(): an inherited GIT_* or GITHUB_TOKEN on the developer's shell
	// would be a second credential in a test about credentials.
	cmd.Env = append(isolatedGitEnv(f.home),
		"GITHUB_TOKEN="+f.token,
		"TICKS_REPO_URL="+f.url,
		"TICKS_BASE_SHA="+f.sha,
		"TICKS_WORKDIR="+f.work,
	)
	out, err := cmd.CombinedOutput()
	code := 0
	if err != nil {
		exit, ok := err.(*exec.ExitError)
		if !ok {
			t.Fatalf("running clone_at_sha: %v\n%s", err, out)
		}
		code = exit.ExitCode()
	}
	return string(out), code
}

// The acceptance criterion, in the small: a read-only run clones through the
// factory's git door with its own run credential, and the DOOR saw the token.
func TestReadOnlyRunClonesThroughTheGitDoorWithItsOwnCredential(t *testing.T) {
	f := newDoorFixture(t, true)
	out, code := f.clone(t)
	if code != 0 {
		t.Fatalf("clone_at_sha exited %d, want 0 — a read-only run cannot get its code\n%s", code, out)
	}
	if !f.door.credentialled(f.token) {
		t.Errorf("the door never saw the run's credential, yet the clone passed:\n%v", f.door.presented())
	}
	head := doorGit(t, f.home, f.work, "rev-parse", "HEAD")
	if head != f.sha {
		t.Errorf("checked out %s, want the submitted %s", head, f.sha)
	}

	// The credential the door saw came from the helper `clone_at_sha` installs
	// and from nowhere else. If the host's system config had reached in, this
	// is where a second helper would show up — and on macOS that second helper
	// is a keychain dialog in front of a person.
	helpers := doorGit(t, f.home, f.work, "config", "--get-all", "credential.helper")
	lines := strings.Split(helpers, "\n")
	if len(lines) != 1 || !strings.Contains(lines[0], "username=x-access-token") {
		t.Errorf("git resolved %d credential helpers, want only the one clone_at_sha installs:\n%s", len(lines), helpers)
	}
}

// The regression, stated as the property rather than as the header: a door
// that refuses without challenging never receives the credential the container
// is holding. Every request arrives anonymous.
//
// This is the test that would have caught tick jwd. The factory's own suite was
// green throughout, because every case there SET the Authorization header by
// hand — it proved the door could parse a credential, never that a git client
// would send one.
func TestAGitDoorThatDoesNotChallengeNeverReceivesTheCredential(t *testing.T) {
	f := newDoorFixture(t, false)
	out, code := f.clone(t)
	if code == 0 {
		t.Fatalf("the clone passed without a challenge; this fixture cannot detect the bug\n%s", out)
	}
	sent := f.door.fromGit()
	if len(sent) == 0 {
		t.Fatal("the door was never reached by git at all; this is not the failure under test")
	}
	for i, r := range sent {
		if r.auth != "" {
			t.Fatalf("git request %d carried %q — an unchallenged git is supposed to send nothing", i, r.auth)
		}
	}
	// git's own account of this is `fatal: Authentication failed`, which names
	// neither the door nor the reason and cost a whole unattended run. The
	// container must say more than git does.
	if !strings.Contains(out, "no WWW-Authenticate header") {
		t.Errorf("the container did not name what the door refused and why:\n%s", out)
	}
	if !strings.Contains(out, "run_token_required") {
		t.Errorf("the door's own refusal never reached the log:\n%s", out)
	}
}

// A credential the door does challenge for and then rejects is a DIFFERENT
// failure with a different fix — the run's token, not the door — and the
// container must not report the two the same way. Collapsing distinct failure
// classes into one message is what `.tick/learnings.md` already forbids.
func TestARejectedCredentialIsReportedAsARejectedCredential(t *testing.T) {
	f := newDoorFixture(t, true)
	f.token = "tkr_a_token_this_door_does_not_know"
	out, code := f.clone(t)
	if code == 0 {
		t.Fatalf("a stranger's token cloned successfully\n%s", out)
	}
	if !f.door.credentialled("tkr_a_token_this_door_does_not_know") {
		t.Errorf("git never sent the credential to a door that challenged for it:\n%v", f.door.presented())
	}
	if strings.Contains(out, "no WWW-Authenticate header") {
		t.Errorf("a rejected credential was reported as the door's bug:\n%s", out)
	}
	if !strings.Contains(out, "run_token_required") {
		t.Errorf("the door's own refusal never reached the log:\n%s", out)
	}
}

// The two ends of this contract are written in different languages and neither
// imports the other: the door is TypeScript in cloud/factory/src, the container
// is bash in cloud/sandbox. `.tick/learnings.md` already has the rule — a
// constant crossing that boundary needs a test that reads both sides — and this
// one had no test at all, which is how a door that parsed Basic without ever
// asking for it shipped.
func TestTheDoorAndTheContainerAgreeAboutTheChallenge(t *testing.T) {
	dir, err := Dir()
	if err != nil {
		t.Fatalf("locating cloud/sandbox: %v", err)
	}
	door, err := os.ReadFile(filepath.Join(filepath.Dir(dir), "factory", "src", "credentials.ts"))
	if err != nil {
		t.Fatalf("reading the door: %v", err)
	}
	for _, want := range []string{
		// The scheme must be Basic: it is the only one git's credential helper
		// can answer with a username and a password.
		`GIT_AUTH_CHALLENGE = 'Basic `,
		// And it must actually be attached to the 401, not merely declared.
		`"WWW-Authenticate": GIT_AUTH_CHALLENGE`,
	} {
		if !strings.Contains(string(door), want) {
			t.Errorf("cloud/factory/src/credentials.ts no longer contains %q — a 401 without a Basic challenge is a clone a read-only run cannot make", want)
		}
	}

	common, err := Path(CommonScript)
	if err != nil {
		t.Fatalf("locating %s: %v", CommonScript, err)
	}
	body, err := os.ReadFile(common)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "www-authenticate") {
		t.Error("cloud/sandbox/common.sh no longer looks for the challenge, so a door that stops sending one would again be reported as `Authentication failed`")
	}
}
