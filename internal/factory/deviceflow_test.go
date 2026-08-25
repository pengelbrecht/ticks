package factory

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// A fake github.com OAuth host
//
// The device flow is two endpoints on github.com (not the REST API host), so
// the tests stand up a real one rather than mocking at the function boundary:
// a request this fake never sees is a request production would not have made
// either.
// ---------------------------------------------------------------------------

const (
	testClientID     = "Iv23liEXAMPLECLIENTID"
	testDeviceCode   = "3584d83530557fdd1f46af8289938c8ef79f9dc5"
	testUserCode     = "WDJB-MJHT"
	testDeviceToken  = "ghu_EXAMPLEuserToServerToken0000000000"
	testRefreshToken = "ghr_EXAMPLErefreshToken000000000000000"
)

// tokenReply is one scripted answer from the access_token endpoint.
type tokenReply struct {
	status int
	body   map[string]any
}

type fakeGitHubOAuth struct {
	server *httptest.Server

	mu sync.Mutex
	// deviceReply is what /login/device/code answers with.
	deviceReply map[string]any
	// deviceStatus is its HTTP status (0 means 200).
	deviceStatus int
	// tokenReplies is consumed in order; the last one repeats forever.
	tokenReplies []tokenReply
	// refreshReply answers a grant_type=refresh_token request.
	refreshReply tokenReply

	// Everything the fake observed, so a test can assert on what was SENT and
	// not only on what came back.
	deviceForms  []url.Values
	tokenForms   []url.Values
	refreshForms []url.Values
}

func newFakeGitHubOAuth(t *testing.T) *fakeGitHubOAuth {
	t.Helper()
	f := &fakeGitHubOAuth{
		deviceReply: map[string]any{
			"device_code":      testDeviceCode,
			"user_code":        testUserCode,
			"verification_uri": "https://github.com/login/device",
			"expires_in":       900,
			"interval":         5,
		},
		tokenReplies: []tokenReply{{body: map[string]any{
			"access_token":             testDeviceToken,
			"token_type":               "bearer",
			"expires_in":               28800,
			"refresh_token":            testRefreshToken,
			"refresh_token_expires_in": 15811200,
		}}},
	}
	f.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		form := r.PostForm
		f.mu.Lock()
		defer f.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case deviceCodePath:
			f.deviceForms = append(f.deviceForms, form)
			if f.deviceStatus != 0 {
				w.WriteHeader(f.deviceStatus)
			}
			_ = json.NewEncoder(w).Encode(f.deviceReply)
		case accessTokenPath:
			if form.Get("grant_type") == refreshTokenGrant {
				f.refreshForms = append(f.refreshForms, form)
				if f.refreshReply.status != 0 {
					w.WriteHeader(f.refreshReply.status)
				}
				_ = json.NewEncoder(w).Encode(f.refreshReply.body)
				return
			}
			f.tokenForms = append(f.tokenForms, form)
			reply := f.tokenReplies[len(f.tokenReplies)-1]
			if len(f.tokenForms) <= len(f.tokenReplies) {
				reply = f.tokenReplies[len(f.tokenForms)-1]
			}
			if reply.status != 0 {
				w.WriteHeader(reply.status)
			}
			_ = json.NewEncoder(w).Encode(reply.body)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(f.server.Close)
	return f
}

func (f *fakeGitHubOAuth) base() string { return f.server.URL }

func (f *fakeGitHubOAuth) scriptTokens(replies ...tokenReply) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.tokenReplies = replies
}

func (f *fakeGitHubOAuth) setRefresh(reply tokenReply) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.refreshReply = reply
}

func (f *fakeGitHubOAuth) sentTokenForms() []url.Values {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]url.Values(nil), f.tokenForms...)
}

func (f *fakeGitHubOAuth) sentRefreshForms() []url.Values {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]url.Values(nil), f.refreshForms...)
}

// recordedSleeps captures the poll cadence instead of waiting it out, so the
// backoff is asserted on rather than merely survived.
type recordedSleeps struct {
	mu   sync.Mutex
	list []time.Duration
	now  time.Time
}

func newRecordedSleeps() *recordedSleeps {
	return &recordedSleeps{now: time.Date(2026, 8, 20, 12, 0, 0, 0, time.UTC)}
}

// sleep advances the fake clock rather than the real one: a poll deadline
// derived from expires_in has to be reachable in a test that never waits.
func (r *recordedSleeps) sleep(ctx context.Context, d time.Duration) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.list = append(r.list, d)
	r.now = r.now.Add(d)
	return ctx.Err()
}

func (r *recordedSleeps) clock() time.Time {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.now
}

func (r *recordedSleeps) durations() []time.Duration {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]time.Duration(nil), r.list...)
}

func deviceFlowTestOptions(f *fakeGitHubOAuth, clock *recordedSleeps, out *bytes.Buffer) DeviceFlowOptions {
	return DeviceFlowOptions{
		ClientID:  testClientID,
		OAuthBase: f.base(),
		Out:       out,
		now:       clock.clock,
		sleep:     clock.sleep,
	}
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

// The headline: no PAT is created anywhere. The operator reads a code, approves
// it in a browser, and the flow hands back a user-to-server token.
func TestDeviceFlowPrintsTheCodeAndReturnsTheApprovedToken(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	out := &bytes.Buffer{}
	start := clock.clock()

	f.scriptTokens(
		tokenReply{body: map[string]any{"error": "authorization_pending"}},
		tokenReply{body: map[string]any{
			"access_token":             testDeviceToken,
			"token_type":               "bearer",
			"expires_in":               28800,
			"refresh_token":            testRefreshToken,
			"refresh_token_expires_in": 15811200,
		}},
	)

	token, err := DeviceFlow(context.Background(), deviceFlowTestOptions(f, clock, out))
	if err != nil {
		t.Fatalf("DeviceFlow: %v\n%s", err, out.String())
	}

	if token.AccessToken != testDeviceToken {
		t.Errorf("AccessToken = %q, want the token the flow was granted", token.AccessToken)
	}
	if token.RefreshToken != testRefreshToken {
		t.Errorf("RefreshToken = %q, want the refresh token GitHub issued", token.RefreshToken)
	}
	// expires_in is resolved against the clock at the moment of the grant, not
	// against when the walk started: the operator's approval took however long
	// it took, and dating the deadline from before that overstates the life.
	if got := token.ExpiresAt.Sub(clock.clock()); got != 28800*time.Second {
		t.Errorf("ExpiresAt is %s from the grant, want 8h (expires_in resolved against the clock)", got)
	}
	if !token.ExpiresAt.After(start) {
		t.Errorf("ExpiresAt = %s, want a deadline after the walk began (%s)", token.ExpiresAt, start)
	}
	if token.RefreshExpiresAt.IsZero() {
		t.Error("RefreshExpiresAt is zero although GitHub sent refresh_token_expires_in")
	}

	// The operator cannot approve a code they were never shown.
	printed := out.String()
	if !strings.Contains(printed, testUserCode) {
		t.Errorf("the flow never printed the user code:\n%s", printed)
	}
	if !strings.Contains(printed, "https://github.com/login/device") {
		t.Errorf("the flow never printed where to approve it:\n%s", printed)
	}
	// A user-to-server token is bounded by what the operator picks here, so the
	// prompt has to say that repositories are chosen at approval time.
	if !strings.Contains(strings.ToLower(printed), "repositor") {
		t.Errorf("the flow never told the operator they choose repositories:\n%s", printed)
	}
	// No PAT instructions anywhere on the happy path.
	if strings.Contains(strings.ToLower(printed), "personal access token") {
		t.Errorf("the device flow still tells the operator to create a PAT:\n%s", printed)
	}

	// Only the PUBLIC client id is ever sent: a shipped App has no secret to
	// send, and the private-key rung is a different credential entirely.
	for _, form := range f.sentTokenForms() {
		if form.Get("client_id") != testClientID {
			t.Errorf("token request client_id = %q, want %q", form.Get("client_id"), testClientID)
		}
		if form.Get("client_secret") != "" {
			t.Error("the device flow sent a client_secret — a shipped App has none")
		}
		if form.Get("grant_type") != deviceCodeGrant {
			t.Errorf("token request grant_type = %q, want %q", form.Get("grant_type"), deviceCodeGrant)
		}
	}
}

// slow_down is GitHub telling the poller it is too fast; ignoring it gets the
// device code rate-limited out of the flow.
func TestDeviceFlowBacksOffWhenGitHubSaysSlowDown(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	out := &bytes.Buffer{}

	f.scriptTokens(
		tokenReply{body: map[string]any{"error": "slow_down", "interval": 10}},
		tokenReply{body: map[string]any{"error": "authorization_pending"}},
		tokenReply{body: map[string]any{"access_token": testDeviceToken, "token_type": "bearer"}},
	)

	token, err := DeviceFlow(context.Background(), deviceFlowTestOptions(f, clock, out))
	if err != nil {
		t.Fatalf("DeviceFlow: %v\n%s", err, out.String())
	}
	if token.AccessToken != testDeviceToken {
		t.Fatalf("AccessToken = %q", token.AccessToken)
	}
	// A token with no expires_in does not expire: that is the shipped App's
	// recommended registration, and it must not be recorded as "expired now".
	if !token.ExpiresAt.IsZero() {
		t.Errorf("ExpiresAt = %s, want zero when GitHub sent no expires_in", token.ExpiresAt)
	}

	sleeps := clock.durations()
	if len(sleeps) < 3 {
		t.Fatalf("sleeps = %v, want one before each of the three polls", sleeps)
	}
	if sleeps[0] != 5*time.Second {
		t.Errorf("first poll interval = %s, want the 5s GitHub advertised", sleeps[0])
	}
	if sleeps[1] < 10*time.Second {
		t.Errorf("interval after slow_down = %s, want at least the 10s GitHub asked for", sleeps[1])
	}
	if sleeps[2] < sleeps[1] {
		t.Errorf("the slowed interval was not kept: %v", sleeps)
	}
}

// Each terminal error is its own failure class with its own remedy — collapsing
// them into "device flow failed" sends the operator looking in the wrong place.
func TestDeviceFlowTerminalErrorsAreDistinctAndActionable(t *testing.T) {
	for _, tc := range []struct {
		name  string
		code  string
		wants []string
	}{
		{"expired", "expired_token", []string{"expired", "tk factory setup"}},
		{"denied", "access_denied", []string{"declined"}},
		{"disabled", "device_flow_disabled", []string{"device flow", "--github-token"}},
		{"badclient", "incorrect_client_credentials", []string{testClientID}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newFakeGitHubOAuth(t)
			clock := newRecordedSleeps()
			out := &bytes.Buffer{}
			f.scriptTokens(tokenReply{body: map[string]any{"error": tc.code}})

			_, err := DeviceFlow(context.Background(), deviceFlowTestOptions(f, clock, out))
			if err == nil {
				t.Fatalf("DeviceFlow succeeded on %s", tc.code)
			}
			for _, want := range tc.wants {
				if !strings.Contains(err.Error(), want) {
					t.Errorf("error for %s does not mention %q:\n%v", tc.code, want, err)
				}
			}
		})
	}
}

// A device code has its own deadline. Polling past it forever is a hang, and a
// hang in an install walk reads as a broken product.
func TestDeviceFlowGivesUpAtTheCodesOwnDeadline(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	out := &bytes.Buffer{}
	f.mu.Lock()
	f.deviceReply["expires_in"] = 20
	f.mu.Unlock()
	f.scriptTokens(tokenReply{body: map[string]any{"error": "authorization_pending"}})

	_, err := DeviceFlow(context.Background(), deviceFlowTestOptions(f, clock, out))
	if err == nil {
		t.Fatal("DeviceFlow polled past the device code's own expiry")
	}
	if !strings.Contains(err.Error(), "expired") {
		t.Errorf("error does not say the code expired:\n%v", err)
	}
	if got := len(clock.durations()); got > 6 {
		t.Errorf("polled %d times inside a 20s window — the deadline is not bounding the loop", got)
	}
}

// A device-code request GitHub refuses is not a token problem, and it must not
// be reported as one.
func TestDeviceFlowReportsARefusedDeviceCodeRequest(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	out := &bytes.Buffer{}
	f.mu.Lock()
	f.deviceStatus = http.StatusNotFound
	f.deviceReply = map[string]any{"error": "Not Found"}
	f.mu.Unlock()

	_, err := DeviceFlow(context.Background(), deviceFlowTestOptions(f, clock, out))
	if err == nil {
		t.Fatal("DeviceFlow continued past a refused device-code request")
	}
	if !strings.Contains(err.Error(), "device code") {
		t.Errorf("error does not name the step that failed:\n%v", err)
	}
	if len(f.sentTokenForms()) != 0 {
		t.Error("the flow polled for a token it never obtained a device code for")
	}
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

func TestRefreshUserTokenRotatesBothHalves(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	f.setRefresh(tokenReply{body: map[string]any{
		"access_token":             "ghu_rotated",
		"token_type":               "bearer",
		"expires_in":               28800,
		"refresh_token":            "ghr_rotated",
		"refresh_token_expires_in": 15811200,
	}})

	opts := deviceFlowTestOptions(f, clock, &bytes.Buffer{})
	token, err := RefreshUserToken(context.Background(), opts, testRefreshToken)
	if err != nil {
		t.Fatalf("RefreshUserToken: %v", err)
	}
	if token.AccessToken != "ghu_rotated" {
		t.Errorf("AccessToken = %q, want the rotated token", token.AccessToken)
	}
	if token.RefreshToken != "ghr_rotated" {
		t.Errorf("RefreshToken = %q — GitHub rotates the refresh token too, and dropping it "+
			"strands the credential at the next expiry", token.RefreshToken)
	}

	forms := f.sentRefreshForms()
	if len(forms) != 1 {
		t.Fatalf("refresh requests = %d, want 1", len(forms))
	}
	if forms[0].Get("client_id") != testClientID {
		t.Errorf("refresh client_id = %q", forms[0].Get("client_id"))
	}
	if forms[0].Get("refresh_token") != testRefreshToken {
		t.Errorf("refresh_token = %q", forms[0].Get("refresh_token"))
	}
}

// A shipped App has no client secret, so GitHub may refuse the refresh
// outright. That is a recoverable state — one browser confirmation — and the
// error has to say so instead of reading as "your credential is broken".
func TestRefreshUserTokenPointsAtTheDeviceFlowWhenGitHubRefuses(t *testing.T) {
	f := newFakeGitHubOAuth(t)
	clock := newRecordedSleeps()
	f.setRefresh(tokenReply{body: map[string]any{
		"error":             "bad_refresh_token",
		"error_description": "The refresh token passed is incorrect or expired.",
	}})

	opts := deviceFlowTestOptions(f, clock, &bytes.Buffer{})
	_, err := RefreshUserToken(context.Background(), opts, testRefreshToken)
	if err == nil {
		t.Fatal("RefreshUserToken accepted a refusal")
	}
	if !strings.Contains(err.Error(), "tk factory setup") {
		t.Errorf("error does not name the command that recovers it:\n%v", err)
	}
}

// ---------------------------------------------------------------------------
// The shipped App's identity
// ---------------------------------------------------------------------------

// The client id is PUBLIC by construction — it is the whole point of the rung —
// but it still has exactly one place it is filled in, and an explicit answer
// beats the environment, which beats the shipped constant.
func TestResolveGitHubAppClientIDPrefersTheExplicitAnswer(t *testing.T) {
	t.Setenv(GitHubAppClientIDEnv, "Iv23liFROMENV")

	if got := ResolveGitHubAppClientID("Iv23liEXPLICIT"); got != "Iv23liEXPLICIT" {
		t.Errorf("explicit answer = %q, want it to win", got)
	}
	if got := ResolveGitHubAppClientID(""); got != "Iv23liFROMENV" {
		t.Errorf("environment answer = %q, want it to win over the constant", got)
	}
}

func TestResolveGitHubAppClientIDFallsBackToTheShippedConstant(t *testing.T) {
	t.Setenv(GitHubAppClientIDEnv, "")
	if got := ResolveGitHubAppClientID(""); got != strings.TrimSpace(GitHubAppClientID) {
		t.Errorf("fallback = %q, want the shipped constant %q", got, GitHubAppClientID)
	}
}
