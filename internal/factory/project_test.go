package factory

import "testing"

// TestParseProjectFromRemoteHandlesEveryRemoteForm keeps the copy in setup.go
// honest. The original in internal/github covers the same forms, and a copy
// with no test of its own is the half of a duplication that rots first.
func TestParseProjectFromRemoteHandlesEveryRemoteForm(t *testing.T) {
	for name, tc := range map[string]struct{ remote, want string }{
		"ssh scp form":     {"git@github.com:example-org/repo.git", "example-org/repo"},
		"https form":       {"https://github.com/example-org/repo.git", "example-org/repo"},
		"https no suffix":  {"https://github.com/example-org/repo", "example-org/repo"},
		"ssh url form":     {"ssh://git@github.com:22/example-org/repo.git", "example-org/repo"},
		"proxied sandbox":  {"http://local_proxy@127.0.0.1:8080/git/example-org/repo", "example-org/repo"},
		"trailing newline": {"https://github.com/example-org/repo.git\n", "example-org/repo"},
	} {
		got, err := parseProjectFromRemote(tc.remote)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if got != tc.want {
			t.Fatalf("%s: got %q, want %q", name, got, tc.want)
		}
	}

	for name, remote := range map[string]string{
		"no host separator": "github.com-example-org-repo",
		"only one segment":  "https://github.com/repo",
		"empty":             "",
	} {
		if got, err := parseProjectFromRemote(remote); err == nil {
			t.Fatalf("%s: expected an error, got %q", name, got)
		}
	}
}
