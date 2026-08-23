package factory

import (
	"os"
	"strings"
)

// The ticks GitHub App — the identity `tk factory setup` authenticates the
// operator against, and the one thing on the whole credential ladder that ships
// WITH tk rather than being provisioned by the operator.
//
// Why it can ship at all: the device flow mints a USER-TO-SERVER token, and a
// user-to-server token needs only the App's PUBLIC client id. Nothing secret is
// distributed, so "a deployable, not a deployment" (D16) is intact — GitHub
// hosts the approval, ticks.sh operates nothing.
//
// The line NOT to cross: INSTALLATION tokens — the per-run, ~1h, repo-scoped
// credential D11 calls the gold standard — are minted with the App's PRIVATE
// KEY. A shared App must never carry that key, in this repo or in a released
// binary, because any holder of it could mint tokens for every installation of
// the App. So the shipped rung is user-to-server, bounded by the App's declared
// permissions and by the repositories the operator picks at approval time; the
// private-key rung stays the documented upgrade for an operator who registers
// their own App under their own account.

// GitHubAppClientID is the ticks GitHub App's public OAuth client id.
//
// THIS IS THE ONE PLACE IT IS FILLED IN. Registering the App is a browser
// action on an account this repository cannot reach, so the constant ships
// empty and `tk factory setup` selects the device flow only when a client id
// actually resolves — an empty one keeps the PAT prompt, rather than shipping a
// walk that is broken until a human acts. The registration checklist is in
// docs/factory-credentials.md.
//
// A GitHub App client id looks like `Iv23li...`. It is public by construction:
// it is printed in the device-flow request every operator makes, and it grants
// nothing on its own.
const GitHubAppClientID = ""

// GitHubAppClientIDEnv overrides the shipped constant. It exists for three
// readers: a maintainer testing a registration before it is committed, an
// operator on GitHub Enterprise Server whose App lives on another host, and the
// integration tests, which point the whole flow at a local fake.
const GitHubAppClientIDEnv = "TICKS_GITHUB_APP_CLIENT_ID"

// GitHubOAuthBaseEnv overrides https://github.com — the host the device flow
// runs against, which is NOT the REST API host. GHES puts both somewhere else.
const GitHubOAuthBaseEnv = "TICKS_GITHUB_OAUTH_BASE"

// ResolveGitHubAppClientID settles which App the device flow authenticates
// against: an explicit answer (flag) first, then the environment, then the
// shipped constant. An empty result means "no App is configured in this build",
// which is a supported state, not an error.
func ResolveGitHubAppClientID(explicit string) string {
	if id := strings.TrimSpace(explicit); id != "" {
		return id
	}
	if id := strings.TrimSpace(os.Getenv(GitHubAppClientIDEnv)); id != "" {
		return id
	}
	return strings.TrimSpace(GitHubAppClientID)
}

// ResolveGitHubOAuthBase settles the host the device flow talks to.
func ResolveGitHubOAuthBase(explicit string) string {
	if base := strings.TrimSpace(explicit); base != "" {
		return strings.TrimSuffix(base, "/")
	}
	if base := strings.TrimSpace(os.Getenv(GitHubOAuthBaseEnv)); base != "" {
		return strings.TrimSuffix(base, "/")
	}
	return defaultGitHubOAuthBase
}
