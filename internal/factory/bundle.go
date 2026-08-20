package factory

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"

	ticks "github.com/pengelbrecht/ticks"
)

// bundleRoot is the prefix the embedded FS uses for the factory tree.
const bundleRoot = "cloud/factory"

// sandboxRoot is the prefix the embedded FS uses for the orchestrator image's
// build context.
const sandboxRoot = "cloud/sandbox"

// SandboxDirName is the directory the image context is staged in, as a sibling
// of the bundle directory.
//
// A sibling and not a subdirectory because wrangler.toml's `[[containers]]`
// image path has to resolve identically in this repository and in the staged
// copy: `cloud/factory` next to `cloud/sandbox` there, `<...>/bundle` next to
// `<...>/sandbox` here. One relative path, true in both places, so the
// committed config is the deployed config.
const SandboxDirName = "sandbox"

// placeholderDatabaseID is the database_id committed in wrangler.toml. It
// keeps `wrangler dev` and the vitest harness working out of the box; a real
// deploy replaces it with the id of the operator's own D1 database.
const placeholderDatabaseID = "00000000-0000-0000-0000-000000000000"

// WranglerConfigFile is the bundle's config file name, relative to the
// materialized directory.
const WranglerConfigFile = "wrangler.toml"

// WorkerName / DatabaseName / BucketName are the account-scoped resource names
// the bundle declares. They are read back out of the committed wrangler.toml
// by the tests, but stated here because the deploy has to name them on the
// wrangler command line before the config is ever read.
const (
	WorkerName   = "ticks-factory"
	DatabaseName = "ticks-factory"
	BucketName   = "ticks-factory-artifacts"
)

// SecretName is the Worker secret holding the token hash (src/auth.ts).
const SecretName = "FACTORY_TOKEN_HASH"

// SecretFactoryBaseURL is the Worker secret holding the factory's own public
// base URL.
//
// A Worker cannot discover its own hostname outside a request, and the Run
// Workflow boots sandboxes with no request in hand — so the deploy, which is
// the one place the endpoint is known, records it. A run's sandbox is pointed
// at `<FACTORY_BASE_URL>/api/gateway` (D17): the run-scoped gateway token is
// exchanged for the operator's provider key there, the run and tick metadata
// is stamped there, and revoking the token takes effect there.
//
// A secret rather than a wrangler.toml var for the same reason the gateway URL
// is one: it names the operator's deployment, and this repository is public.
const SecretFactoryBaseURL = "FACTORY_BASE_URL"

var (
	pathsOnce sync.Once
	pathsList []string
	pathsErr  error

	sandboxPathsOnce sync.Once
	sandboxPathsList []string
	sandboxPathsErr  error

	shaOnce  sync.Once
	shaValue string
)

// BundlePaths returns every file in the embedded bundle, as slash-separated
// paths relative to the bundle root, sorted.
func BundlePaths() []string {
	pathsOnce.Do(func() {
		fsys := ticks.FactoryFS()
		err := fs.WalkDir(fsys, bundleRoot, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			rel, relErr := filepath.Rel(bundleRoot, p)
			if relErr != nil {
				return relErr
			}
			pathsList = append(pathsList, filepath.ToSlash(rel))
			return nil
		})
		if err != nil {
			// Unreachable: the tree is embedded at compile time.
			pathsErr = err
			return
		}
		sort.Strings(pathsList)
	})
	if pathsErr != nil {
		return nil
	}
	return append([]string(nil), pathsList...)
}

// ReadBundleFile returns the contents of one embedded bundle file.
func ReadBundleFile(p string) ([]byte, error) {
	return ticks.FactoryFS().ReadFile(path.Join(bundleRoot, p))
}

// SandboxPaths returns every file in the embedded orchestrator image context,
// as slash-separated paths relative to cloud/sandbox, sorted.
func SandboxPaths() []string {
	sandboxPathsOnce.Do(func() {
		fsys := ticks.SandboxFS()
		err := fs.WalkDir(fsys, sandboxRoot, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			rel, relErr := filepath.Rel(sandboxRoot, p)
			if relErr != nil {
				return relErr
			}
			sandboxPathsList = append(sandboxPathsList, filepath.ToSlash(rel))
			return nil
		})
		if err != nil {
			// Unreachable: the tree is embedded at compile time.
			sandboxPathsErr = err
			return
		}
		sort.Strings(sandboxPathsList)
	})
	if sandboxPathsErr != nil {
		return nil
	}
	return append([]string(nil), sandboxPathsList...)
}

// ReadSandboxFile returns the contents of one embedded image-context file.
func ReadSandboxFile(p string) ([]byte, error) {
	return ticks.SandboxFS().ReadFile(path.Join(sandboxRoot, p))
}

// SandboxDir is where the image context is staged for a given bundle
// directory: its sibling, per SandboxDirName.
func SandboxDir(bundleDir string) string {
	return filepath.Join(filepath.Dir(filepath.Clean(bundleDir)), SandboxDirName)
}

// MaterializeSandbox writes the embedded image context to dir.
//
// Same contract as Materialize: every file tk owns is rewritten and anything
// tk wrote before and no longer ships is removed, so what Docker builds is
// exactly this binary's image and the tk version the deployment is pinned to
// means something about the container too.
func MaterializeSandbox(dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("preparing orchestrator image directory: %w", err)
	}

	owned := make(map[string]bool)
	for _, p := range SandboxPaths() {
		data, err := ReadSandboxFile(p)
		if err != nil {
			return fmt.Errorf("reading the embedded orchestrator image context: %w", err)
		}
		dest := filepath.Join(dir, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return fmt.Errorf("preparing %s: %w", filepath.Dir(dest), err)
		}
		// The Dockerfile chmods the scripts it installs, so the staged copies
		// do not need the executable bit — which //go:embed drops anyway.
		if err := os.WriteFile(dest, data, 0o644); err != nil {
			return fmt.Errorf("writing %s: %w", dest, err)
		}
		owned[filepath.ToSlash(p)] = true
	}

	return pruneStale(dir, owned)
}

// BundleSHA is a content hash over the whole embedded bundle: every path and
// its bytes, in sorted order. It identifies the deployed code independently of
// the tk version string, so a factory deployed from a dev build is still
// distinguishable from one deployed from another dev build.
func BundleSHA() string {
	shaOnce.Do(func() {
		h := sha256.New()
		for _, p := range BundlePaths() {
			data, err := ReadBundleFile(p)
			if err != nil {
				// Unreachable: the path came from the same embedded FS.
				continue
			}
			fmt.Fprintf(h, "%s\n%d\n", p, len(data))
			h.Write(data)
		}
		// The orchestrator image is part of what a deploy installs, so a
		// Dockerfile change has to change this hash: a factory whose recorded
		// bundle sha is unchanged while the container it boots is different
		// would make the deployment record a lie.
		for _, p := range SandboxPaths() {
			data, err := ReadSandboxFile(p)
			if err != nil {
				continue
			}
			fmt.Fprintf(h, "%s/%s\n%d\n", SandboxDirName, p, len(data))
			h.Write(data)
		}
		shaValue = hex.EncodeToString(h.Sum(nil))
	})
	return shaValue
}

// Materialize writes the embedded bundle to dir, which is created if needed.
//
// Every file tk owns is rewritten and any file tk wrote on a previous run and
// no longer ships is deleted, so the tree on disk is exactly this binary's
// bundle — that is what makes the version pin meaningful. Files the operator
// added themselves survive only if they are outside the directories the bundle
// owns; the deploy treats this directory as tk's, not the operator's.
func Materialize(dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("preparing factory bundle directory: %w", err)
	}

	owned := make(map[string]bool)
	for _, p := range BundlePaths() {
		data, err := ReadBundleFile(p)
		if err != nil {
			return fmt.Errorf("reading embedded factory bundle: %w", err)
		}
		dest := filepath.Join(dir, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return fmt.Errorf("preparing %s: %w", filepath.Dir(dest), err)
		}
		// 0o644, not 0o444: SetDatabaseID rewrites wrangler.toml on the next
		// deploy and a read-only copy would fail the second run.
		if err := os.WriteFile(dest, data, 0o644); err != nil {
			return fmt.Errorf("writing %s: %w", dest, err)
		}
		owned[filepath.ToSlash(p)] = true
	}

	return pruneStale(dir, owned)
}

// pruneStale removes files under the bundle's own directories that this
// binary's bundle does not ship. It deliberately ignores anything wrangler
// writes for itself (.wrangler/) and anything installed (node_modules/).
func pruneStale(dir string, owned map[string]bool) error {
	return filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, relErr := filepath.Rel(dir, p)
		if relErr != nil {
			return relErr
		}
		slash := filepath.ToSlash(rel)
		if slash == "." {
			return nil
		}
		if d.IsDir() {
			if slash == ".wrangler" || slash == "node_modules" {
				return fs.SkipDir
			}
			return nil
		}
		if owned[slash] {
			return nil
		}
		return os.Remove(p)
	})
}

// databaseIDPattern matches the single database_id assignment in wrangler.toml.
var databaseIDPattern = regexp.MustCompile(`(?m)^(\s*database_id\s*=\s*)"[^"]*"`)

// validDatabaseID is Cloudflare's D1 database id: a UUID. Validating before
// substitution keeps anything that could break out of the TOML string — or
// redirect the deploy at another account's database — out of the config.
var validDatabaseID = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// SetDatabaseID rewrites the materialized wrangler.toml to bind D1 to the
// operator's own database. Everything else in the file is left byte-identical.
func SetDatabaseID(dir, id string) error {
	if !validDatabaseID.MatchString(strings.TrimSpace(id)) {
		return fmt.Errorf("%q is not a D1 database id (expected a UUID)", id)
	}
	configPath := filepath.Join(dir, WranglerConfigFile)
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("reading %s: %w", configPath, err)
	}
	if !databaseIDPattern.Match(data) {
		return fmt.Errorf("%s has no database_id to set", configPath)
	}
	updated := databaseIDPattern.ReplaceAll(data, []byte(`${1}"`+strings.TrimSpace(id)+`"`))
	if err := os.WriteFile(configPath, updated, 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", configPath, err)
	}
	return nil
}
