package client

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveSocketPathOrder(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("no home directory: %v", err)
	}
	defaultPath := filepath.Join(home, filepath.FromSlash(DefaultSocketPath))

	tests := []struct {
		name     string
		explicit string
		env      string
		envSet   bool
		want     string
	}{
		{
			name:     "explicit wins over env",
			explicit: "/explicit/herdr.sock",
			env:      "/env/herdr.sock",
			envSet:   true,
			want:     "/explicit/herdr.sock",
		},
		{
			name:     "explicit wins with no env",
			explicit: "/explicit/herdr.sock",
			want:     "/explicit/herdr.sock",
		},
		{
			name:   "env wins over default",
			env:    "/env/herdr.sock",
			envSet: true,
			want:   "/env/herdr.sock",
		},
		{
			name:   "empty env falls through to default",
			env:    "",
			envSet: true,
			want:   defaultPath,
		},
		{
			name: "default when nothing set",
			want: defaultPath,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if tc.envSet {
				t.Setenv(SocketPathEnv, tc.env)
			} else {
				t.Setenv(SocketPathEnv, "")
				os.Unsetenv(SocketPathEnv)
			}
			got, err := ResolveSocketPath(tc.explicit)
			if err != nil {
				t.Fatalf("ResolveSocketPath: %v", err)
			}
			if got != tc.want {
				t.Errorf("ResolveSocketPath(%q) = %q, want %q", tc.explicit, got, tc.want)
			}
		})
	}
}

func TestResolveSocketPathIsNotProbed(t *testing.T) {
	// A stale socket file outlives its server, so resolution must not depend
	// on the path existing.
	t.Setenv(SocketPathEnv, "/definitely/not/here/herdr.sock")
	got, err := ResolveSocketPath("")
	if err != nil {
		t.Fatalf("ResolveSocketPath: %v", err)
	}
	if got != "/definitely/not/here/herdr.sock" {
		t.Errorf("got %q", got)
	}
}
