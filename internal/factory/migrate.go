package factory

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// legacyFileName is ~/.ticksrc's name — the pre-split file board sync still
// owns (internal/tickboard/cloud/client.go). It is spelled here rather than
// imported, because internal/ticksrc no longer exists: this migration is the
// one place factory code is allowed to know that name at all.
const legacyFileName = ".ticksrc"

// legacyPrefix marked a ~/.ticksrc line as factory-owned, pre-split.
const legacyPrefix = "factory_"

// LoadCredentials reads ~/.ticfacrc, first migrating any factory_* lines
// still sitting in ~/.ticksrc into it. Call this — never credentials.Load()
// directly — at the top of any command that touches factory credentials, so
// a machine that deployed a factory before this split keeps authenticating
// after upgrading: `tk factory setup`, `tk factory deploy`, `tk factory
// status`, `tk cloud …`, `tk factory dashboard`. Commands with no factory
// business (`tk ask`, `tk answer`, core `tk` commands) must never call this —
// that is the whole point of the split (see internal/factory/credentials).
func LoadCredentials() (*credentials.File, error) {
	credsPath, err := credentials.Path()
	if err != nil {
		return nil, err
	}
	legacyPath, err := legacyConfigPath()
	if err != nil {
		return nil, err
	}
	return loadCredentialsAt(credsPath, legacyPath)
}

func legacyConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locating home directory: %w", err)
	}
	return filepath.Join(home, legacyFileName), nil
}

// loadCredentialsAt is LoadCredentials with both file locations named
// explicitly, so a test can exercise the merge-and-drain without ever
// touching a real home directory.
//
// It never writes a partially-migrated file: a value is durably Save()d into
// credsPath before the line that carried it is ever removed from legacyPath,
// and it never overwrites a value credsPath already has (a token rotated
// after migration must not be clobbered by a stale copy of the pre-migration
// one). It is idempotent and resumable from any crash point, because it never
// trusts a record of "migration already ran" — it re-derives what to do from
// the two files' CURRENT content on every call. A process killed between the
// two writes below leaves credsPath correct and legacyPath still carrying the
// now-redundant old lines; the next call finds them again and finishes the
// drain. A legacyPath with zero factory_* lines (a fresh install, or a
// machine that already finished migrating) is a true no-op: nothing is read
// beyond the stat+read of legacyPath, nothing is written, nothing is printed.
func loadCredentialsAt(credsPath, legacyPath string) (*credentials.File, error) {
	creds, err := credentials.LoadFrom(credsPath)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(legacyPath)
	if err != nil {
		if os.IsNotExist(err) {
			return creds, nil
		}
		return nil, fmt.Errorf("reading %s: %w", legacyPath, err)
	}

	content := strings.TrimRight(string(data), "\n")
	var legacyLines []string
	if content != "" {
		legacyLines = strings.Split(content, "\n")
	}

	kept := make([]string, 0, len(legacyLines))
	found := 0
	copied := 0
	for _, line := range legacyLines {
		key := legacyLineKey(line)
		if !strings.HasPrefix(key, legacyPrefix) {
			kept = append(kept, line)
			continue
		}
		found++
		if creds.Get(key) == "" {
			_, value, _ := strings.Cut(strings.TrimSpace(line), "=")
			creds.Set(key, strings.TrimSpace(value))
			copied++
		}
		// Dropped from legacyPath either way: its value is now in credsPath,
		// either just copied or already there from an earlier, interrupted run.
	}

	if found == 0 {
		return creds, nil
	}

	if err := creds.Save(); err != nil {
		return nil, fmt.Errorf("writing %s: %w", creds.Path(), err)
	}

	newContent := ""
	if len(kept) > 0 {
		newContent = strings.Join(kept, "\n") + "\n"
	}
	if err := writeOwnerOnly(legacyPath, newContent); err != nil {
		return nil, fmt.Errorf("writing %s: %w", legacyPath, err)
	}

	if copied > 0 {
		fmt.Fprintf(os.Stderr,
			"Moved %d factory credential(s) from %s to %s. Board sync credentials in %s are unchanged. See docs/factory-credentials.md.\n",
			copied, legacyPath, creds.Path(), legacyPath)
	}

	return creds, nil
}

// legacyLineKey mirrors the key= parsing internal/ticksrc used to do, without
// importing that now-deleted package: the key half of a `key=value` line, or
// "" for a comment, a blank line or any other unrecognised line.
func legacyLineKey(line string) string {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" || strings.HasPrefix(trimmed, "#") {
		return ""
	}
	key, _, ok := strings.Cut(trimmed, "=")
	if !ok {
		return ""
	}
	return strings.TrimSpace(key)
}

// writeOwnerOnly replaces path atomically with owner-only permissions, the
// same pattern credentials.File.Save uses — a crash cannot leave a
// half-written ~/.ticksrc, and a file that was too permissive is tightened by
// the swap.
func writeOwnerOnly(path, content string) error {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, ".ticksrc-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	if err := tmp.Chmod(0o600); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.WriteString(content); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
