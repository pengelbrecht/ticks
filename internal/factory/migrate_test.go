package factory

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// legacyFixture is the shape a real, pre-split ~/.ticksrc has on a machine
// that already ran `tk factory setup`: all fifteen factory_* keys with
// realistic-looking values, alongside board sync's token=/url=, a comment,
// and a legacy bare token line (internal/tickboard/cloud's reader treats an
// unprefixed first line as a token; this migration must leave it alone).
const legacyFixture = `# ticks config
bare-legacy-board-token
token=board-token
url=wss://ticks.sh/api/projects
factory_url=https://ticks-factory.acme.workers.dev
factory_token=tkf_abcdefabcdefabcdef
factory_version=1.9.0
factory_github_token=ghu_abcdefabcdefabcdefabcdefabcdefabcdefab
factory_github_login=acme-bot
factory_github_repo=acme/widgets
factory_github_auth=device-flow
factory_github_token_expires_at=2026-09-30T00:00:00Z
factory_github_refresh_token=ghr_abcdefabcdefabcdefabcdefabcdefabcdefab
factory_github_refresh_token_expires_at=2026-12-31T00:00:00Z
factory_gateway_url=https://gateway.ai.cloudflare.com/v1/acct-id/ticks-gw
factory_gateway_provider=anthropic
factory_gateway_key=sk-ant-abcdefabcdefabcdef
factory_cloudflare_api_token=cf-abcdefabcdefabcdef
factory_workers_ai_billing_mode=postpaid
`

var legacyFactoryKeys = []string{
	credentials.KeyURL, credentials.KeyToken, credentials.KeyVersion,
	credentials.KeyGitHubToken, credentials.KeyGitHubLogin, credentials.KeyGitHubRepo,
	credentials.KeyGitHubAuth, credentials.KeyGitHubTokenExpires,
	credentials.KeyGitHubRefreshToken, credentials.KeyGitHubRefreshExpires,
	credentials.KeyGatewayURL, credentials.KeyGatewayProvider, credentials.KeyGatewayKey,
	credentials.KeyCloudflareAPIToken, credentials.KeyWorkersAIBillingMode,
}

func writeLegacyFixture(t *testing.T, path string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(legacyFixture), 0o600); err != nil {
		t.Fatal(err)
	}
}

// (a) all fifteen values land in ~/.ticfacrc and are readable by the new
// factory credential constants.
func TestMigrationMovesAllFactoryKeys(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	writeLegacyFixture(t, legacyPath)

	creds, err := loadCredentialsAt(credsPath, legacyPath)
	if err != nil {
		t.Fatalf("loadCredentialsAt: %v", err)
	}

	want := map[string]string{
		credentials.KeyURL:                  "https://ticks-factory.acme.workers.dev",
		credentials.KeyToken:                "tkf_abcdefabcdefabcdef",
		credentials.KeyVersion:              "1.9.0",
		credentials.KeyGitHubToken:          "ghu_abcdefabcdefabcdefabcdefabcdefabcdefab",
		credentials.KeyGitHubLogin:          "acme-bot",
		credentials.KeyGitHubRepo:           "acme/widgets",
		credentials.KeyGitHubAuth:           "device-flow",
		credentials.KeyGitHubTokenExpires:   "2026-09-30T00:00:00Z",
		credentials.KeyGitHubRefreshToken:   "ghr_abcdefabcdefabcdefabcdefabcdefabcdefab",
		credentials.KeyGitHubRefreshExpires: "2026-12-31T00:00:00Z",
		credentials.KeyGatewayURL:           "https://gateway.ai.cloudflare.com/v1/acct-id/ticks-gw",
		credentials.KeyGatewayProvider:      "anthropic",
		credentials.KeyGatewayKey:           "sk-ant-abcdefabcdefabcdef",
		credentials.KeyCloudflareAPIToken:   "cf-abcdefabcdefabcdef",
		credentials.KeyWorkersAIBillingMode: "postpaid",
	}
	for key, wantValue := range want {
		if got := creds.Get(key); got != wantValue {
			t.Errorf("credentials.Get(%s) = %q, want %q", key, got, wantValue)
		}
	}

	// Re-read from disk: Save() actually happened, not just the in-memory File.
	reloaded, err := credentials.LoadFrom(credsPath)
	if err != nil {
		t.Fatalf("reload %s: %v", credsPath, err)
	}
	for key, wantValue := range want {
		if got := reloaded.Get(key); got != wantValue {
			t.Errorf("on disk, %s.Get(%s) = %q, want %q", credsPath, key, got, wantValue)
		}
	}

	info, err := os.Stat(credsPath)
	if err != nil {
		t.Fatal(err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("%s mode = %o, want 0600", credsPath, perm)
	}
}

// (b) ~/.ticksrc retains token=, url=, the comment, and the bare line,
// verbatim, with zero factory_* lines.
func TestMigrationPreservesEverythingElseInTheLegacyFile(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	writeLegacyFixture(t, legacyPath)

	if _, err := loadCredentialsAt(credsPath, legacyPath); err != nil {
		t.Fatalf("loadCredentialsAt: %v", err)
	}

	data, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	got := string(data)
	for _, want := range []string{
		"# ticks config", "bare-legacy-board-token", "token=board-token", "url=wss://ticks.sh/api/projects",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("legacy file lost %q after migration:\n%s", want, got)
		}
	}
	if strings.Contains(got, "factory_") {
		t.Errorf("legacy file still carries a factory_* line after migration:\n%s", got)
	}

	info, err := os.Stat(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("%s mode = %o, want 0600", legacyPath, perm)
	}
}

// (c) a second run is a true no-op: no notice, no file touched.
func TestMigrationSecondRunIsANoOp(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	writeLegacyFixture(t, legacyPath)

	if _, err := loadCredentialsAt(credsPath, legacyPath); err != nil {
		t.Fatalf("first loadCredentialsAt: %v", err)
	}
	legacyBefore, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	credsBefore, err := os.ReadFile(credsPath)
	if err != nil {
		t.Fatal(err)
	}
	legacyInfoBefore, _ := os.Stat(legacyPath)
	credsInfoBefore, _ := os.Stat(credsPath)

	if _, err := loadCredentialsAt(credsPath, legacyPath); err != nil {
		t.Fatalf("second loadCredentialsAt: %v", err)
	}

	legacyAfter, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	credsAfter, err := os.ReadFile(credsPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(legacyBefore) != string(legacyAfter) {
		t.Errorf("legacy file content changed on a no-op run:\nbefore:\n%s\nafter:\n%s", legacyBefore, legacyAfter)
	}
	if string(credsBefore) != string(credsAfter) {
		t.Errorf("credentials file content changed on a no-op run:\nbefore:\n%s\nafter:\n%s", credsBefore, credsAfter)
	}
	legacyInfoAfter, _ := os.Stat(legacyPath)
	credsInfoAfter, _ := os.Stat(credsPath)
	if legacyInfoBefore.ModTime() != legacyInfoAfter.ModTime() {
		t.Error("legacy file was rewritten on a no-op run (mtime changed)")
	}
	if credsInfoBefore.ModTime() != credsInfoAfter.ModTime() {
		t.Error("credentials file was rewritten on a no-op run (mtime changed)")
	}
}

// Running on a file with no factory keys at all (fresh install, or board
// sync configured but no factory ever deployed) must not create ~/.ticfacrc
// or touch ~/.ticksrc.
func TestMigrationNoFactoryKeysIsANoOp(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	if err := os.WriteFile(legacyPath, []byte("token=board-token\nurl=wss://ticks.sh/api/projects\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	creds, err := loadCredentialsAt(credsPath, legacyPath)
	if err != nil {
		t.Fatalf("loadCredentialsAt: %v", err)
	}
	if creds.Get(credentials.KeyURL) != "" {
		t.Errorf("a fresh migration invented a factory_url: %q", creds.Get(credentials.KeyURL))
	}
	if _, err := os.Stat(credsPath); !os.IsNotExist(err) {
		t.Errorf("~/.ticfacrc was created despite no factory keys to migrate")
	}
	data, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "token=board-token\nurl=wss://ticks.sh/api/projects\n" {
		t.Errorf("legacy file touched despite no factory keys:\n%s", data)
	}
}

// A file that has never seen a factory at all (no ~/.ticksrc, no
// ~/.ticfacrc) must not error and must not create either file.
func TestMigrationNoFilesAtAll(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)

	creds, err := loadCredentialsAt(credsPath, legacyPath)
	if err != nil {
		t.Fatalf("loadCredentialsAt on two missing files: %v", err)
	}
	if creds.Get(credentials.KeyToken) != "" {
		t.Error("a File over two missing files reported a value")
	}
	if _, err := os.Stat(credsPath); !os.IsNotExist(err) {
		t.Error("~/.ticfacrc was created from nothing")
	}
	if _, err := os.Stat(legacyPath); !os.IsNotExist(err) {
		t.Error("~/.ticksrc was created from nothing")
	}
}

// A value already present in ~/.ticfacrc (e.g. set by --rotate-token after
// the first migration) must never be clobbered by a stale copy left in
// ~/.ticksrc — the case a crash-resumed migration must get right.
func TestMigrationNeverOverwritesAnExistingValue(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	if err := os.WriteFile(legacyPath, []byte("factory_token=stale-pre-migration-token\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	fresh, err := credentials.LoadFrom(credsPath)
	if err != nil {
		t.Fatal(err)
	}
	fresh.Set(credentials.KeyToken, "rotated-post-migration-token")
	if err := fresh.Save(); err != nil {
		t.Fatal(err)
	}

	creds, err := loadCredentialsAt(credsPath, legacyPath)
	if err != nil {
		t.Fatalf("loadCredentialsAt: %v", err)
	}
	if got := creds.Get(credentials.KeyToken); got != "rotated-post-migration-token" {
		t.Errorf("factory_token = %q, want the rotated value preserved", got)
	}

	// The stale leftover line is still drained from ~/.ticksrc even though it
	// was never copied — this is the "finishes the drain" half of resumability.
	data, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "factory_") {
		t.Errorf("stale factory_* line was not drained from the legacy file:\n%s", data)
	}
}

// Simulates a crash between the two writes in loadCredentialsAt: ~/.ticfacrc
// already holds everything (from the "half" that completed before the crash)
// but ~/.ticksrc still carries the old lines. The next run must finish the
// drain without erroring or duplicating anything.
func TestMigrationResumesAfterACrashBetweenTheTwoWrites(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)
	writeLegacyFixture(t, legacyPath)

	// First run completes normally...
	if _, err := loadCredentialsAt(credsPath, legacyPath); err != nil {
		t.Fatalf("first loadCredentialsAt: %v", err)
	}
	// ...then simulate the crash: restore the legacy file as if its own
	// rewrite never happened, leaving ~/.ticfacrc as the completed first run
	// left it.
	writeLegacyFixture(t, legacyPath)

	creds, err := loadCredentialsAt(credsPath, legacyPath)
	if err != nil {
		t.Fatalf("resumed loadCredentialsAt: %v", err)
	}
	if got := creds.Get(credentials.KeyGitHubToken); got != "ghu_abcdefabcdefabcdefabcdefabcdefabcdefab" {
		t.Errorf("factory_github_token = %q after resume", got)
	}
	data, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "factory_") {
		t.Errorf("resumed run did not finish draining the legacy file:\n%s", data)
	}
	for _, want := range []string{"# ticks config", "bare-legacy-board-token", "token=board-token"} {
		if !strings.Contains(string(data), want) {
			t.Errorf("resumed run lost %q from the legacy file:\n%s", want, data)
		}
	}
}

// (d) a stub-server `tk factory status` call against the migrated
// ~/.ticfacrc succeeds, standing in for "still authenticates".
func TestMigratedCredentialsStillAuthenticateAgainstStatus(t *testing.T) {
	h := newHarness(t)
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, ".ticksrc")
	credsPath := filepath.Join(dir, credentials.FileName)

	// Deploy for real first, producing a valid ~/.ticfacrc-shaped file and a
	// worker that will actually authenticate the token it wrote.
	opts := h.options()
	opts.ConfigPath = credsPath
	result, err := Deploy(context.Background(), opts)
	if err != nil {
		t.Fatalf("Deploy: %v", err)
	}

	// Now behave as if that same token had instead been sitting in
	// ~/.ticksrc all along (the pre-split shape), and let the migration path
	// pick it up before Status runs.
	if err := os.Remove(credsPath); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(legacyPath, []byte(
		"factory_url="+result.URL+"\nfactory_token="+result.Token+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := loadCredentialsAt(credsPath, legacyPath); err != nil {
		t.Fatalf("loadCredentialsAt: %v", err)
	}

	statusOpts := StatusOptions{ConfigPath: credsPath, HTTPClient: h.server.Client()}
	report, err := Status(context.Background(), statusOpts)
	if err != nil {
		t.Fatalf("Status after migration: %v", err)
	}
	if !report.Deployment.Configured || !report.Deployment.OK {
		t.Errorf("Status after migration did not authenticate against the deployed factory: %+v", report.Deployment)
	}
}
