package github

import "testing"

func TestParseProjectFromRemote(t *testing.T) {
	cases := []struct {
		name   string
		remote string
		want   string
		ok     bool
	}{
		{"https", "https://github.com/petere/chefswiz.git", "petere/chefswiz", true},
		{"https no git", "https://github.com/petere/chefswiz", "petere/chefswiz", true},
		{"ssh", "git@github.com:petere/chefswiz.git", "petere/chefswiz", true},
		{"ssh no git", "git@github.com:petere/chefswiz", "petere/chefswiz", true},
		{"ssh url", "ssh://git@github.com:22/petere/chefswiz.git", "petere/chefswiz", true},
		{"sandbox proxy", "http://local_proxy@127.0.0.1:38611/git/pengelbrecht/ticks", "pengelbrecht/ticks", true},
		{"sandbox proxy git suffix", "http://local_proxy@127.0.0.1:38611/git/pengelbrecht/ticks.git", "pengelbrecht/ticks", true},
		{"invalid", "git@github.com", "", false},
		{"invalid url no path", "https://github.com", "", false},
		{"empty", "", "", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ParseProjectFromRemote(tc.remote)
			if tc.ok && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !tc.ok && err == nil {
				t.Fatalf("expected error")
			}
			if tc.ok && got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

func TestDetectProject(t *testing.T) {
	project, err := DetectProject(func(string, ...string) ([]byte, error) {
		return []byte("https://github.com/petere/chefswiz.git"), nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if project != "petere/chefswiz" {
		t.Fatalf("expected project petere/chefswiz, got %s", project)
	}
}
