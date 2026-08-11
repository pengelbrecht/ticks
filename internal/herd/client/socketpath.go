package client

import (
	"errors"
	"os"
	"path/filepath"
)

// SocketPathEnv is the environment variable herdr exports inside a managed
// pane, holding the path of the socket its server is listening on.
const SocketPathEnv = "HERDR_SOCKET_PATH"

// DefaultSocketPath is the path used when neither an explicit path nor
// SocketPathEnv supplies one. It is relative to the user's home directory.
const DefaultSocketPath = ".config/herdr/herdr.sock"

// ErrNoHomeDir is returned by ResolveSocketPath when the default path is
// needed but the user's home directory cannot be determined.
var ErrNoHomeDir = errors.New("herd/client: cannot resolve default herdr socket path: no home directory")

// ResolveSocketPath returns the herdr socket path to dial, in the order
// documented by skills/ticks/references/runners-config.md:
//
//  1. explicit, when non-empty (this is `orchestration.socket` from
//     .tick/runners.toml);
//  2. $HERDR_SOCKET_PATH, when set and non-empty;
//  3. ~/.config/herdr/herdr.sock.
//
// The path is not probed — a stale socket file outlives its server, so
// existence proves nothing. Dial and call instead.
func ResolveSocketPath(explicit string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if env := os.Getenv(SocketPathEnv); env != "" {
		return env, nil
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return "", ErrNoHomeDir
	}
	return filepath.Join(home, filepath.FromSlash(DefaultSocketPath)), nil
}
