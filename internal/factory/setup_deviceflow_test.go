package factory

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// The GitHub rung, walked the way an operator meets it after this change: no
// PAT is created anywhere, and the credential is still proven against the
// target repository before a byte of it is stored.

// deviceHarness is a setup harness whose GitHub App exists: a fake github.com
// for the flow, a fake api.github.com for the verification, and a clock the
// poll loop runs on instead of the wall.
type deviceHarness struct {
	*setupHarness
	oauth *fakeGitHubOAuth
	clock *recordedSleeps
}

// revoke makes the REST fake stop honouring a credential, the way GitHub does
// once a user-to-server token passes its deadline.
func (g *fakeGitHub) revoke(token string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.extra, token)
}

func newDeviceHarness(t *testing.T) *deviceHarness {
	t.Helper()
	h := &deviceHarness{
		setupHarness: newSetupHarness(t, ""),
		oauth:        newFakeGitHubOAuth(t),
		clock:        newRecordedSleeps(),
	}
	// The REST fake has to accept what the flow is about to mint.
	h.github.accept(testDeviceToken)
	return h
}

func (h *deviceHarness) options(stdin string) SetupOptions {
	opts := h.setupHarness.options(stdin)
	opts.GitHubClientID = testClientID
	opts.GitHubOAuthBase = h.oauth.base()
	opts.deviceFlowNow = h.clock.clock
	opts.deviceFlowSleep = h.clock.sleep
	return opts
}

// The acceptance path: `tk factory setup` reaches a working GitHub credential
// through the device flow, with no PAT creation and no PAT prompt.
func TestSetupGetsItsGitHubCredentialFromTheDeviceFlow(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	// Only the gateway rung is answered by hand — the GitHub rung asks for
	// nothing at all now.
	stdin := strings.Join([]string{h.gateway.base(), "workers-ai", ""}, "\n")
	result, err := Setup(context.Background(), h.options(stdin))
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}

	if result.GitHubAuth != AuthDeviceFlow {
		t.Errorf("GitHubAuth = %q, want %q", result.GitHubAuth, AuthDeviceFlow)
	}
	if result.GitHubLogin != testLogin {
		t.Errorf("GitHubLogin = %q, want %q", result.GitHubLogin, testLogin)
	}
	if !result.GitHubRepoChecked {
		t.Error("the credential was stored without a live check against the target repository")
	}

	// The credential that reached the Worker is the one the flow granted.
	if got := h.secret(SecretGitHubToken); got != testDeviceToken {
		t.Errorf("Worker secret %s = %q, want the device-flow token", SecretGitHubToken, got)
	}

	rc := h.rc(t)
	if got := rc.Get(ticksrc.KeyFactoryGitHubAuth); got != AuthDeviceFlow {
		t.Errorf("%s = %q, want %q", ticksrc.KeyFactoryGitHubAuth, got, AuthDeviceFlow)
	}
	if got := rc.Get(ticksrc.KeyFactoryGitHubRefreshToken); got != testRefreshToken {
		t.Errorf("%s was not mirrored — the credential cannot be renewed without a browser",
			ticksrc.KeyFactoryGitHubRefreshToken)
	}
	expiry := rc.Get(ticksrc.KeyFactoryGitHubTokenExpires)
	if expiry == "" {
		t.Fatalf("%s is empty although GitHub sent expires_in", ticksrc.KeyFactoryGitHubTokenExpires)
	}
	if _, err := time.Parse(time.RFC3339, expiry); err != nil {
		t.Errorf("%s = %q, want RFC 3339: %v", ticksrc.KeyFactoryGitHubTokenExpires, expiry, err)
	}

	// The refresh token outlives the token it mints, so it stays on this
	// machine: a sandbox that could read it would hold a longer-lived
	// credential than the one it needs (D11).
	if got := h.secret("GITHUB_REFRESH_TOKEN"); got != "" {
		t.Errorf("the refresh token was pushed as a Worker secret: %q", got)
	}

	printed := h.out.String()
	if !strings.Contains(printed, testUserCode) {
		t.Errorf("the walk never showed the operator a code:\n%s", printed)
	}
	if strings.Contains(strings.ToLower(printed), "fine-grained pat:") {
		t.Errorf("the walk still prompts for a PAT:\n%s", printed)
	}
	if strings.Contains(printed, "personal-access-tokens/new") {
		t.Errorf("the walk still sends the operator to the PAT form:\n%s", printed)
	}
}

// Verify-before-store, on the failure this rung now exists to catch: the
// operator approved the App but did not tick the target repository. The message
// has to point at the approval screen, not at a PAT's Repository access list.
func TestSetupStopsWhenTheApprovedRepositoriesExcludeTheTarget(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	opts := h.options("")
	opts.Repo = "octo-org/not-approved"
	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup stored a credential that cannot reach the target repository")
	}
	if !strings.Contains(err.Error(), "octo-org/not-approved") {
		t.Errorf("error does not name the repository:\n%v", err)
	}
	if !strings.Contains(err.Error(), "ticks App") {
		t.Errorf("error sends the operator to the wrong screen — it must name the App approval:\n%v", err)
	}
	if got := h.secret(SecretGitHubToken); got != "" {
		t.Errorf("the unverified credential was pushed anyway: %q", got)
	}
	if got := h.rc(t).Get(ticksrc.KeyFactoryGitHubToken); got != "" {
		t.Errorf("the unverified credential was mirrored anyway: %q", got)
	}
}

// A declined approval stops the walk with a remedy, and stores nothing.
func TestSetupStopsWhenTheOperatorDeclinesTheApproval(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)
	h.oauth.scriptTokens(tokenReply{body: map[string]any{"error": "access_denied"}})

	_, err := Setup(context.Background(), h.options(""))
	if err == nil {
		t.Fatal("Setup continued past a declined approval")
	}
	if !strings.Contains(err.Error(), "--github-token") {
		t.Errorf("error does not offer the manual escape hatch:\n%v", err)
	}
	if got := h.secret(SecretGitHubToken); got != "" {
		t.Errorf("a declined approval still stored a secret: %q", got)
	}
}

// --github-token is the escape hatch, and it must not be reachable only by
// accident: supplying one bypasses the flow entirely and is recorded as what it
// is, so nothing later tries to renew a credential that has no refresh token.
func TestSetupGitHubTokenFlagBypassesTheDeviceFlow(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "workers-ai"
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}

	if result.GitHubAuth != AuthPAT {
		t.Errorf("GitHubAuth = %q, want %q", result.GitHubAuth, AuthPAT)
	}
	if got := h.secret(SecretGitHubToken); got != testPAT {
		t.Errorf("Worker secret %s = %q, want the supplied token", SecretGitHubToken, got)
	}
	if len(h.oauth.sentTokenForms()) != 0 {
		t.Error("the walk polled the device flow although a token was supplied")
	}
	rc := h.rc(t)
	if got := rc.Get(ticksrc.KeyFactoryGitHubAuth); got != AuthPAT {
		t.Errorf("%s = %q, want %q", ticksrc.KeyFactoryGitHubAuth, got, AuthPAT)
	}
	if got := rc.Get(ticksrc.KeyFactoryGitHubTokenExpires); got != "" {
		t.Errorf("%s = %q, want empty for a hand-supplied token", ticksrc.KeyFactoryGitHubTokenExpires, got)
	}
}

// A build that ships no client id keeps the old walk. Shipping a setup that is
// broken until a human registers an App would be worse than shipping no flow.
func TestSetupFallsBackToThePATPromptWithoutAClientID(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	opts := h.options(strings.Join([]string{testPAT, h.gateway.base(), "workers-ai", ""}, "\n"))
	opts.GitHubClientID = ""
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if result.GitHubAuth != AuthPAT {
		t.Errorf("GitHubAuth = %q, want %q", result.GitHubAuth, AuthPAT)
	}
	if got := h.secret(SecretGitHubToken); got != testPAT {
		t.Errorf("Worker secret %s = %q, want the typed PAT", SecretGitHubToken, got)
	}
	if !strings.Contains(h.out.String(), "personal-access-tokens/new") {
		t.Errorf("the fallback walk did not tell the operator where to create a token:\n%s", h.out.String())
	}
}

// The expiry half. A stored credential inside its refresh window is renewed
// without a browser, and the RENEWED token is what reaches the Worker — a
// refresh that only updates the local mirror leaves the factory running on the
// credential that is about to die.
func TestSetupRenewsAnExpiringStoredCredentialAndRepushesIt(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	// First walk: mint and store a credential.
	stdin := strings.Join([]string{h.gateway.base(), "workers-ai", ""}, "\n")
	if _, err := Setup(context.Background(), h.options(stdin)); err != nil {
		t.Fatalf("first setup: %v\n%s", err, h.out.String())
	}
	h.out.Reset()

	// Move the clock to inside the refresh window, and script the renewal.
	h.clock.mu.Lock()
	h.clock.now = h.clock.now.Add(7*time.Hour + 30*time.Minute)
	h.clock.mu.Unlock()
	h.github.accept("ghu_renewed")
	h.oauth.setRefresh(tokenReply{body: map[string]any{
		"access_token":             "ghu_renewed",
		"token_type":               "bearer",
		"expires_in":               28800,
		"refresh_token":            "ghr_renewed",
		"refresh_token_expires_in": 15811200,
	}})

	// Second walk: keep the (renewed) credential, re-answer the gateway rung.
	opts := h.options(strings.Join([]string{"n", "", "", ""}, "\n"))
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "workers-ai"
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("second setup: %v\n%s", err, h.out.String())
	}

	if !result.GitHubRefreshed {
		t.Fatalf("setup did not renew a credential inside its refresh window:\n%s", h.out.String())
	}
	if got := h.secret(SecretGitHubToken); got != "ghu_renewed" {
		t.Errorf("Worker secret %s = %q, want the renewed token — the factory is still running on the "+
			"expiring one", SecretGitHubToken, got)
	}
	rc := h.rc(t)
	if got := rc.Get(ticksrc.KeyFactoryGitHubToken); got != "ghu_renewed" {
		t.Errorf("%s = %q, want the renewed token", ticksrc.KeyFactoryGitHubToken, got)
	}
	if got := rc.Get(ticksrc.KeyFactoryGitHubRefreshToken); got != "ghr_renewed" {
		t.Errorf("%s = %q — GitHub rotates the refresh token, and keeping the old one strands the "+
			"credential at the next expiry", ticksrc.KeyFactoryGitHubRefreshToken, got)
	}
	if len(h.oauth.sentRefreshForms()) != 1 {
		t.Errorf("refresh requests = %d, want exactly one", len(h.oauth.sentRefreshForms()))
	}
}

// A credential with life left is reused untouched: setup is a reconfiguration
// path, not a reason to burn a refresh.
func TestSetupLeavesAHealthyStoredCredentialAlone(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	stdin := strings.Join([]string{h.gateway.base(), "workers-ai", ""}, "\n")
	if _, err := Setup(context.Background(), h.options(stdin)); err != nil {
		t.Fatalf("first setup: %v\n%s", err, h.out.String())
	}
	h.out.Reset()

	opts := h.options("n\n")
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "workers-ai"
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("second setup: %v\n%s", err, h.out.String())
	}
	if result.GitHubRefreshed {
		t.Error("setup renewed a credential with hours of life left")
	}
	if len(h.oauth.sentRefreshForms()) != 0 {
		t.Error("setup spent a refresh token it did not need")
	}
	if !strings.Contains(h.out.String(), "expires in") {
		t.Errorf("the walk never told the operator how long the credential has left:\n%s", h.out.String())
	}
}

// A device-flow credential whose refresh token has also died is not a dead end,
// and the walk must not report it as one: re-approving an App that is already
// installed is one confirmation.
func TestSetupFallsForwardWhenTheRefreshTokenIsDead(t *testing.T) {
	h := newDeviceHarness(t)
	seedDeployment(t, h.setupHarness)

	stdin := strings.Join([]string{h.gateway.base(), "workers-ai", ""}, "\n")
	if _, err := Setup(context.Background(), h.options(stdin)); err != nil {
		t.Fatalf("first setup: %v\n%s", err, h.out.String())
	}
	h.out.Reset()

	// Past both deadlines, and the REST fake stops accepting the old token.
	h.clock.mu.Lock()
	h.clock.now = h.clock.now.Add(200 * 24 * time.Hour)
	h.clock.mu.Unlock()
	h.oauth.setRefresh(tokenReply{body: map[string]any{"error": "bad_refresh_token"}})
	// GitHub itself stops honouring the expired token, which is what makes this
	// the dead-end case rather than "renewal was merely skipped".
	h.github.revoke(testDeviceToken)
	h.github.accept("ghu_reapproved")
	h.oauth.scriptTokens(tokenReply{body: map[string]any{
		"access_token": "ghu_reapproved",
		"token_type":   "bearer",
	}})

	opts := h.options("")
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "workers-ai"
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if result.GitHubAuth != AuthDeviceFlow {
		t.Errorf("GitHubAuth = %q, want a fresh device-flow credential", result.GitHubAuth)
	}
	if got := h.secret(SecretGitHubToken); got != "ghu_reapproved" {
		t.Errorf("Worker secret %s = %q, want the re-approved credential", SecretGitHubToken, got)
	}
	if !result.GitHubTokenExpiresAt.IsZero() {
		t.Errorf("GitHubTokenExpiresAt = %s, want zero — GitHub sent no expires_in", result.GitHubTokenExpiresAt)
	}
}
