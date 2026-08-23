package factory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// The GitHub device flow — how `tk factory setup` gets a GitHub credential
// without asking anyone to hand-create a personal access token.
//
// The operator reads a short code, opens github.com/login/device, approves the
// ticks App and picks which repositories it may touch. GitHub hosts every step;
// tk only prints a code and polls. What comes back is a user-to-server token
// bounded by the App's declared permissions AND by the repositories chosen at
// approval time, revoked by uninstalling the App — narrower than a `gh auth
// token` (every repo, plus admin:org) and cheaper than a fine-grained PAT (a
// multi-screen form in the GitHub UI).
//
// See githubapp.go for why only the PUBLIC client id is involved, and why the
// private-key rung is deliberately not this.

const (
	// defaultGitHubOAuthBase is where the device flow lives. It is github.com,
	// NOT api.github.com — the REST host used by every other probe here.
	defaultGitHubOAuthBase = "https://github.com"

	deviceCodePath  = "/login/device/code"
	accessTokenPath = "/login/oauth/access_token"

	deviceCodeGrant   = "urn:ietf:params:oauth:grant-type:device_code"
	refreshTokenGrant = "refresh_token"

	// minPollInterval is the floor GitHub documents. Polling faster earns a
	// slow_down and eventually burns the device code.
	minPollInterval = 5 * time.Second
	// slowDownStep is what GitHub asks a poller to add on slow_down.
	slowDownStep = 5 * time.Second
	// maxDeviceFlowWait bounds the whole walk even if GitHub advertises a
	// longer expires_in: an install step that can hang for an hour is not an
	// install step.
	maxDeviceFlowWait = 15 * time.Minute
)

// DeviceFlowOptions configures one device-flow run.
type DeviceFlowOptions struct {
	// ClientID is the App's PUBLIC client id. Required.
	ClientID string
	// OAuthBase overrides https://github.com (GHES, tests).
	OAuthBase string
	// HTTPClient makes the calls. Nil means a client with a short timeout.
	HTTPClient *http.Client
	// Out is where the code and the approval URL are printed. Nil means
	// stdout. Nothing secret is ever written here — the user code is a
	// one-time approval code, and the token it yields never is.
	Out io.Writer

	// now and sleep are the clock. Tests replace them so the poll cadence is
	// asserted on rather than waited out.
	now   func() time.Time
	sleep func(context.Context, time.Duration) error
}

func (o DeviceFlowOptions) client() *http.Client {
	if o.HTTPClient != nil {
		return o.HTTPClient
	}
	return &http.Client{Timeout: 15 * time.Second}
}

func (o DeviceFlowOptions) base() string {
	return strings.TrimSuffix(ResolveGitHubOAuthBase(o.OAuthBase), "/")
}

func (o DeviceFlowOptions) clock() time.Time {
	if o.now != nil {
		return o.now()
	}
	return time.Now()
}

func (o DeviceFlowOptions) wait(ctx context.Context, d time.Duration) error {
	if o.sleep != nil {
		return o.sleep(ctx, d)
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (o DeviceFlowOptions) out() io.Writer {
	if o.Out != nil {
		return o.Out
	}
	return os.Stdout
}

// DeviceCode is what GitHub hands back for the operator to approve.
type DeviceCode struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

// UserToken is a user-to-server credential, plus everything needed to know when
// it stops working and whether it can be renewed without a browser.
//
// ExpiresAt is ZERO when the token does not expire. That is not an edge case:
// an App registered with "Expire user authorization tokens" turned off issues
// exactly that, and it is the recommended registration for a shipped App, which
// has no client secret to refresh with.
type UserToken struct {
	AccessToken      string
	TokenType        string
	ExpiresAt        time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

// Expires reports whether this credential has a deadline at all.
func (t UserToken) Expires() bool { return !t.ExpiresAt.IsZero() }

// tokenResponse is the access_token endpoint's payload in both its shapes:
// GitHub answers 200 for a refusal too, with an `error` field instead.
type tokenResponse struct {
	AccessToken           string `json:"access_token"`
	TokenType             string `json:"token_type"`
	ExpiresIn             int    `json:"expires_in"`
	RefreshToken          string `json:"refresh_token"`
	RefreshTokenExpiresIn int    `json:"refresh_token_expires_in"`

	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
	Interval         int    `json:"interval"`
}

func (r tokenResponse) token(now time.Time) UserToken {
	token := UserToken{AccessToken: r.AccessToken, TokenType: r.TokenType, RefreshToken: r.RefreshToken}
	if r.ExpiresIn > 0 {
		token.ExpiresAt = now.Add(time.Duration(r.ExpiresIn) * time.Second)
	}
	if r.RefreshTokenExpiresIn > 0 {
		token.RefreshExpiresAt = now.Add(time.Duration(r.RefreshTokenExpiresIn) * time.Second)
	}
	return token
}

// DeviceFlow runs the whole walk: request a code, show it, poll until the
// operator approves it. It returns the granted user-to-server token.
//
// It does NOT verify the token against anything — that is the caller's job, and
// deliberately so: verify-before-store is the discipline of the setup rung, and
// a flow that both mints and blesses its own credential hides the failure this
// rung exists to catch (an App approved on the wrong repositories).
func DeviceFlow(ctx context.Context, opts DeviceFlowOptions) (*UserToken, error) {
	if strings.TrimSpace(opts.ClientID) == "" {
		return nil, errors.New("no GitHub App client id is configured for this build — " +
			"pass --github-token to supply a credential directly")
	}

	code, err := requestDeviceCode(ctx, opts)
	if err != nil {
		return nil, err
	}

	out := opts.out()
	fmt.Fprintf(out, "\nOpen %s and enter this code:\n\n", code.VerificationURI)
	fmt.Fprintf(out, "    %s\n\n", code.UserCode)
	fmt.Fprintf(out, "GitHub will ask which repositories the ticks factory may use — the\n")
	fmt.Fprintf(out, "credential is bounded to exactly what you pick there, and revoking it\n")
	fmt.Fprintf(out, "is uninstalling the App. Waiting for your approval...\n")

	return pollForUserToken(ctx, opts, code)
}

// requestDeviceCode asks GitHub for a code pair. Its failures are their own
// class: nothing has been shown to the operator yet, so an error here is a
// configuration problem (wrong client id, wrong host), never a declined
// approval.
func requestDeviceCode(ctx context.Context, opts DeviceFlowOptions) (*DeviceCode, error) {
	form := url.Values{"client_id": {opts.ClientID}}
	body, status, err := postForm(ctx, opts, opts.base()+deviceCodePath, form)
	if err != nil {
		return nil, fmt.Errorf("requesting a device code from %s: %w", opts.base(), err)
	}

	var code DeviceCode
	if err := json.Unmarshal(body, &code); err != nil || code.DeviceCode == "" || code.UserCode == "" {
		var refusal tokenResponse
		_ = json.Unmarshal(body, &refusal)
		detail := strings.TrimSpace(refusal.ErrorDescription)
		if detail == "" {
			detail = strings.TrimSpace(refusal.Error)
		}
		if detail == "" {
			detail = fmt.Sprintf("HTTP %d: %s", status, firstLine(body))
		}
		return nil, fmt.Errorf("GitHub refused the device code request for client id %s: %s\n"+
			"Check the App is registered with the device flow enabled, or pass --github-token to "+
			"supply a credential directly", opts.ClientID, detail)
	}
	if code.VerificationURI == "" {
		code.VerificationURI = opts.base() + "/login/device"
	}
	return &code, nil
}

// pollForUserToken waits for the approval, honouring GitHub's own cadence: the
// advertised interval, +5s on every slow_down, and a hard stop at the device
// code's own expiry so a walk cannot hang on a browser tab nobody opened.
func pollForUserToken(ctx context.Context, opts DeviceFlowOptions, code *DeviceCode) (*UserToken, error) {
	interval := time.Duration(code.Interval) * time.Second
	if interval < minPollInterval {
		interval = minPollInterval
	}

	lifetime := time.Duration(code.ExpiresIn) * time.Second
	if lifetime <= 0 || lifetime > maxDeviceFlowWait {
		lifetime = maxDeviceFlowWait
	}
	deadline := opts.clock().Add(lifetime)

	form := url.Values{
		"client_id":   {opts.ClientID},
		"device_code": {code.DeviceCode},
		"grant_type":  {deviceCodeGrant},
	}

	for {
		if err := opts.wait(ctx, interval); err != nil {
			return nil, err
		}
		if !opts.clock().Before(deadline) {
			return nil, fmt.Errorf("the device code expired before it was approved — "+
				"run `tk factory setup` again and enter the new code at %s", code.VerificationURI)
		}

		body, status, err := postForm(ctx, opts, opts.base()+accessTokenPath, form)
		if err != nil {
			return nil, fmt.Errorf("polling GitHub for the approved token: %w", err)
		}
		var reply tokenResponse
		if err := json.Unmarshal(body, &reply); err != nil {
			return nil, fmt.Errorf("GitHub answered the token poll with something that is not JSON (HTTP %d): %s",
				status, firstLine(body))
		}

		switch reply.Error {
		case "":
			if reply.AccessToken == "" {
				return nil, errors.New("GitHub reported success but returned no token")
			}
			token := reply.token(opts.clock())
			return &token, nil
		case "authorization_pending":
			continue
		case "slow_down":
			// GitHub may name the new interval; when it does not, its
			// documented remedy is +5s. Take whichever is slower.
			bumped := interval + slowDownStep
			if advertised := time.Duration(reply.Interval) * time.Second; advertised > bumped {
				bumped = advertised
			}
			interval = bumped
			continue
		default:
			return nil, deviceFlowRefusal(opts.ClientID, code.VerificationURI, reply)
		}
	}
}

// deviceFlowRefusal turns GitHub's error code into the remedy for THAT code.
// Collapsing these into one message is how an operator ends up re-reading the
// wrong half of the docs: "you declined" and "this App cannot do device flow"
// are fixed in completely different places.
func deviceFlowRefusal(clientID, verificationURI string, reply tokenResponse) error {
	detail := strings.TrimSpace(reply.ErrorDescription)
	switch reply.Error {
	case "expired_token":
		return fmt.Errorf("the device code expired before it was approved — "+
			"run `tk factory setup` again and enter the new code at %s", verificationURI)
	case "access_denied":
		return errors.New("the approval was declined at github.com — " +
			"run `tk factory setup` again to retry, or pass --github-token to supply a credential directly")
	case "device_flow_disabled":
		return errors.New("this GitHub App does not have the device flow enabled — " +
			"enable it in the App's settings, or pass --github-token to supply a credential directly")
	case "incorrect_client_credentials", "unauthorized_client":
		return fmt.Errorf("GitHub does not recognise the client id %s (%s) — "+
			"this tk build names an App that does not exist or cannot use the device flow",
			clientID, orUnknownReason(detail, reply.Error))
	case "incorrect_device_code":
		return errors.New("GitHub rejected the device code — run `tk factory setup` again")
	default:
		return fmt.Errorf("GitHub refused the device flow: %s", orUnknownReason(detail, reply.Error))
	}
}

func orUnknownReason(detail, code string) string {
	if detail != "" {
		return detail
	}
	return code
}

// RefreshUserToken renews a user-to-server token from its refresh token.
//
// A shipped App has no client secret to present, and GitHub may therefore
// refuse the exchange outright. That is not a broken credential: re-running the
// device flow on an App the operator has ALREADY approved is a single browser
// confirmation with no repository picking, so the refusal points there rather
// than at a PAT.
func RefreshUserToken(ctx context.Context, opts DeviceFlowOptions, refreshToken string) (*UserToken, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, errors.New("no refresh token is stored for this credential")
	}
	if strings.TrimSpace(opts.ClientID) == "" {
		return nil, errors.New("no GitHub App client id is configured for this build")
	}

	form := url.Values{
		"client_id":     {opts.ClientID},
		"grant_type":    {refreshTokenGrant},
		"refresh_token": {refreshToken},
	}
	body, status, err := postForm(ctx, opts, opts.base()+accessTokenPath, form)
	if err != nil {
		return nil, fmt.Errorf("refreshing the GitHub credential: %w", err)
	}

	var reply tokenResponse
	if err := json.Unmarshal(body, &reply); err != nil {
		return nil, fmt.Errorf("GitHub answered the refresh with something that is not JSON (HTTP %d): %s",
			status, firstLine(body))
	}
	if reply.Error != "" || reply.AccessToken == "" {
		return nil, fmt.Errorf("GitHub refused to refresh the credential (%s) — "+
			"run `tk factory setup` to approve it again, which is one confirmation for an App you have "+
			"already installed", orUnknownReason(strings.TrimSpace(reply.ErrorDescription), orUnknownReason(reply.Error, "no token returned")))
	}
	token := reply.token(opts.clock())
	return &token, nil
}

// postForm makes one form-encoded POST asking for JSON back, which is what
// turns GitHub's default form-encoded OAuth replies into parseable ones.
func postForm(ctx context.Context, opts DeviceFlowOptions, endpoint string, form url.Values) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := opts.client().Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}
