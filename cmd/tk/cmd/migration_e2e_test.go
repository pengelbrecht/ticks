package cmd

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// This file is the evidence tick for the credential split (epic 9hu, tick
// a8y): it proves, with the real command wiring (ExecuteArgs/
// ExecuteArgsContext — the same path board_test.go and offline_answer_test.go
// call "the real binary"), that a machine whose ~/.ticksrc still has the
// pre-split shape keeps working after upgrading to a build with the split
// applied.
//
// Values below are obviously fake, not credential-shaped literals — the
// public-repo guard correctly refuses those in a tracked file, exactly what
// it caught in the offline guard (see cmd/tk/cmd/offline_answer_test.go and
// the "de-shape" fix, commit 5c4e0760). Where a value has to actually pass a
// live check (factory_url, factory_gateway_url, factory_github_token,
// factory_gateway_key), it points at a local test server or matches that
// server's expected credential instead of looking like a real one.

const (
	migrationTestPAT        = "ghu_abcdefabcdefabcdefabcdefabcdefabcdefab"
	migrationTestGatewayKey = "sk-ant-abcdefabcdefabcdef"
	migrationTestRepo       = "acme/widgets"
)

// preSplitFixture is the shape a real ~/.ticksrc has on a machine that ran
// `tk factory deploy` before the credential split: all fifteen factory_*
// keys, alongside board sync's own token=/url=, a comment, and a legacy bare
// token line (internal/tickboard/cloud's reader treats an unprefixed first
// line as a board token; the migration must leave it alone).
func preSplitFixture(factoryURL, gatewayURL string) string {
	return strings.Join([]string{
		"# ticks config",
		"bare-legacy-board-token",
		"token=board-token",
		"url=wss://ticks.sh/api/projects",
		"factory_url=" + factoryURL,
		"factory_token=tkf_abcdefabcdefabcdef",
		"factory_version=1.9.0",
		"factory_github_token=" + migrationTestPAT,
		"factory_github_login=acme-bot",
		"factory_github_repo=" + migrationTestRepo,
		"factory_github_auth=device-flow",
		"factory_github_token_expires_at=2026-09-30T00:00:00Z",
		"factory_github_refresh_token=ghr_abcdefabcdefabcdefabcdefabcdefabcdefab",
		"factory_github_refresh_token_expires_at=2026-12-31T00:00:00Z",
		"factory_gateway_url=" + gatewayURL,
		"factory_gateway_provider=anthropic",
		"factory_gateway_key=" + migrationTestGatewayKey,
		"factory_cloudflare_api_token=cf-abcdefabcdefabcdef",
		"factory_workers_ai_billing_mode=postpaid",
		"",
	}, "\n")
}

// fakeDeployedFactory stands up a factory endpoint that already has a token
// hash pushed, as a real `tk factory deploy` from before the split would have
// left it — simulating the deployment itself, not merely a stub that always
// says yes. It reuses fakeFactory (factory_test.go), which requires the
// Authorization header on any non-/health route and 401s without it.
func fakeDeployedFactory(t *testing.T) string {
	t.Helper()
	stateDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(stateDir, "secret-FACTORY_TOKEN_HASH"), []byte("pbkdf2-sha256$1$AAAA$BBBB"), 0o600); err != nil {
		t.Fatal(err)
	}
	srv := fakeFactory(t, func() string { return stateDir })
	return srv.URL
}

// fakeCloudflareLogs stands in for the AI Gateway logs endpoint the cost
// telemetry rung reads.
func fakeCloudflareLogs(t *testing.T) string {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "result": []any{}})
	}))
	t.Cleanup(srv.Close)
	return srv.URL
}

// requireMode fails the test unless path has exactly the given permission
// bits — the credential files carry bearer tokens and must never be group-
// or world-readable.
func requireMode(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat %s: %v", path, err)
	}
	if perm := info.Mode().Perm(); perm != want {
		t.Errorf("%s mode = %o, want %o", path, perm, want)
	}
}

// stderrCapture redirects the raw os.Stderr (not cobra's cmd.ErrOrStderr) for
// the duration of a test. The migration notice and the cloud client's
// "connected" line are both fmt.Fprintf(os.Stderr, ...) calls made outside
// cobra's output plumbing, so captureCmdOutput's rootCmd.SetErr does not see
// them.
type stderrCapture struct {
	orig *os.File
	r, w *os.File
}

func captureStderr(t *testing.T) *stderrCapture {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	c := &stderrCapture{orig: os.Stderr, r: r, w: w}
	os.Stderr = w
	t.Cleanup(func() {
		if c.w != nil {
			os.Stderr = c.orig
			_ = c.w.Close()
		}
		_ = c.r.Close()
	})
	return c
}

// stop restores os.Stderr and returns everything written since capture
// started. Call it once; capturing more after stop is not supported.
func (c *stderrCapture) stop() string {
	os.Stderr = c.orig
	_ = c.w.Close()
	data, _ := io.ReadAll(c.r)
	c.w = nil
	return string(data)
}

// TestPreSplitMachine_FactoryStillAuthenticatesAfterMigration is the epic's
// core acceptance criterion: a pre-split ~/.ticksrc, exercised through a real
// factory-credential-touching command (`tk factory status`, live — not
// --offline), migrates to ~/.ticfacrc and the factory still authenticates.
// It also proves the migration is idempotent: a second run changes nothing
// and prints nothing.
func TestPreSplitMachine_FactoryStillAuthenticatesAfterMigration(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	factoryURL := fakeDeployedFactory(t)
	githubBase, gatewayBase := fakeCredentialEndpoints(t, migrationTestPAT, migrationTestRepo, migrationTestGatewayKey)
	cfBase := fakeCloudflareLogs(t)

	legacyPath := filepath.Join(home, ".ticksrc")
	ticfacPath := filepath.Join(home, credentials.FileName)
	if err := os.WriteFile(legacyPath, []byte(preSplitFixture(factoryURL, gatewayBase)), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(ticfacPath); !os.IsNotExist(err) {
		t.Fatalf("~/.ticfacrc already exists before the first factory command ran")
	}

	buf := captureCmdOutput(t)
	stderr := captureStderr(t)
	err := ExecuteArgs([]string{"factory", "status",
		"--github-api-base", githubBase,
		"--cloudflare-api-base", cfBase,
	})
	notice := stderr.stop()
	out := buf.String()
	if err != nil {
		t.Fatalf("tk factory status: %v\n%s", err, out)
	}

	// What a user actually sees: the one-time migration notice, on stderr,
	// naming the count and both files.
	if !strings.Contains(notice, "Moved 15 factory credential(s) from") ||
		!strings.Contains(notice, ".ticksrc") || !strings.Contains(notice, credentials.FileName) {
		t.Errorf("migration notice missing or the wrong shape:\n%s", notice)
	}

	// The factory still authenticates, live, through the split.
	if !strings.Contains(out, "live, and it accepts your token") {
		t.Errorf("status does not report the factory as authenticated post-migration:\n%s", out)
	}

	// ~/.ticfacrc now carries the full key set, at 0600.
	requireMode(t, ticfacPath, 0o600)
	rc, err := os.ReadFile(ticfacPath)
	if err != nil {
		t.Fatalf("~/.ticfacrc: %v", err)
	}
	for _, want := range []string{
		"factory_url=" + factoryURL,
		"factory_token=tkf_abcdefabcdefabcdef",
		"factory_version=1.9.0",
		"factory_github_token=" + migrationTestPAT,
		"factory_github_login=acme-bot",
		"factory_github_repo=" + migrationTestRepo,
		"factory_github_auth=device-flow",
		"factory_github_token_expires_at=2026-09-30T00:00:00Z",
		"factory_github_refresh_token=ghr_abcdefabcdefabcdefabcdefabcdefabcdefab",
		"factory_github_refresh_token_expires_at=2026-12-31T00:00:00Z",
		"factory_gateway_url=" + gatewayBase,
		"factory_gateway_provider=anthropic",
		"factory_gateway_key=" + migrationTestGatewayKey,
		"factory_cloudflare_api_token=cf-abcdefabcdefabcdef",
		"factory_workers_ai_billing_mode=postpaid",
	} {
		if !strings.Contains(string(rc), want) {
			t.Errorf("~/.ticfacrc missing %q:\n%s", want, rc)
		}
	}

	// ~/.ticksrc keeps every board/comment/legacy line, drops every
	// factory_* line, and stays 0600.
	requireMode(t, legacyPath, 0o600)
	legacy, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatalf("~/.ticksrc: %v", err)
	}
	legacyStr := string(legacy)
	for _, want := range []string{"# ticks config", "bare-legacy-board-token", "token=board-token", "url=wss://ticks.sh/api/projects"} {
		if !strings.Contains(legacyStr, want) {
			t.Errorf("~/.ticksrc lost %q:\n%s", want, legacyStr)
		}
	}
	if strings.Contains(legacyStr, "factory_") {
		t.Errorf("~/.ticksrc still carries factory_* lines after migration:\n%s", legacyStr)
	}

	// Idempotency: a second factory-touching command is a true no-op.
	rcBefore, _ := os.ReadFile(ticfacPath)
	legacyBefore, _ := os.ReadFile(legacyPath)
	infoBefore, err := os.Stat(ticfacPath)
	if err != nil {
		t.Fatal(err)
	}

	stderr2 := captureStderr(t)
	if err := ExecuteArgs([]string{"factory", "status",
		"--github-api-base", githubBase,
		"--cloudflare-api-base", cfBase,
	}); err != nil {
		t.Fatalf("second tk factory status: %v", err)
	}
	notice2 := stderr2.stop()
	if strings.Contains(notice2, "Moved") {
		t.Errorf("second run printed a migration notice; a fully migrated file must stay silent:\n%s", notice2)
	}

	rcAfter, _ := os.ReadFile(ticfacPath)
	legacyAfter, _ := os.ReadFile(legacyPath)
	infoAfter, err := os.Stat(ticfacPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(rcBefore) != string(rcAfter) {
		t.Errorf("second run changed ~/.ticfacrc:\nbefore:\n%s\nafter:\n%s", rcBefore, rcAfter)
	}
	if string(legacyBefore) != string(legacyAfter) {
		t.Errorf("second run changed ~/.ticksrc:\nbefore:\n%s\nafter:\n%s", legacyBefore, legacyAfter)
	}
	if !infoBefore.ModTime().Equal(infoAfter.ModTime()) {
		t.Errorf("second run rewrote ~/.ticfacrc (mtime %v -> %v) though nothing changed", infoBefore.ModTime(), infoAfter.ModTime())
	}
}

// TestFactoryFreeFile_UntouchedByMigration is the epic's other acceptance
// bullet: a ~/.ticksrc with no factory_* keys at all (an operator who never
// deployed a factory) is left byte-for-byte untouched, and the command still
// works.
func TestFactoryFreeFile_UntouchedByMigration(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	legacyPath := filepath.Join(home, ".ticksrc")
	content := "# ticks config\ntoken=board-token\nurl=wss://ticks.sh/api/projects\n"
	if err := os.WriteFile(legacyPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	before, err := os.Stat(legacyPath)
	if err != nil {
		t.Fatal(err)
	}

	stderr := captureStderr(t)
	buf := captureCmdOutput(t)
	err = ExecuteArgs([]string{"factory", "status", "--offline"})
	notice := stderr.stop()
	if err != nil {
		t.Fatalf("tk factory status --offline: %v\n%s", err, buf.String())
	}
	if notice != "" {
		t.Errorf("a factory-free ~/.ticksrc produced migration output, want silence:\n%s", notice)
	}

	after, err := os.Stat(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if !before.ModTime().Equal(after.ModTime()) {
		t.Errorf("~/.ticksrc with no factory keys was rewritten: mtime %v -> %v", before.ModTime(), after.ModTime())
	}
	data, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != content {
		t.Errorf("~/.ticksrc content changed:\nbefore:\n%s\nafter:\n%s", content, data)
	}
	requireMode(t, legacyPath, 0o600)

	if _, statErr := os.Stat(filepath.Join(home, credentials.FileName)); !os.IsNotExist(statErr) {
		t.Error("~/.ticfacrc was created even though there was nothing to migrate")
	}

	if out := buf.String(); !strings.Contains(out, "tk factory setup") {
		t.Errorf("status with nothing configured does not say what to run:\n%s", out)
	}
}

// TestPreSplitMachine_BoardSyncStillWorksAfterMigration proves the epic's
// remaining bullet: board sync — internal/tickboard/cloud's own,
// independent ~/.ticksrc reader — still works once the file has gone through
// the factory-credential migration. It drives the real `tk board --cloud`
// command against a local fake ticks.sh sync endpoint and confirms the
// board's initial state actually reaches it.
func TestPreSplitMachine_BoardSyncStillWorksAfterMigration(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	legacyPath := filepath.Join(home, ".ticksrc")
	if err := os.WriteFile(legacyPath, []byte(preSplitFixture("https://example.invalid", "https://example.invalid/v1/acct/gw")), 0o600); err != nil {
		t.Fatal(err)
	}

	// Migrate first (offline: only the migration side effect is needed here,
	// not a live factory check), so this test proves board sync survives the
	// split's actual on-disk end state, not merely the pre-split shape.
	if err := ExecuteArgs([]string{"factory", "status", "--offline"}); err != nil {
		t.Fatalf("tk factory status --offline (migration only): %v", err)
	}
	legacy, err := os.ReadFile(legacyPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(legacy), "token=board-token") || strings.Contains(string(legacy), "factory_") {
		t.Fatalf("migration did not leave the expected board-sync shape:\n%s", legacy)
	}

	// A fake ticks.sh sync endpoint: upgrades to WebSocket and records every
	// message it receives, so a real initial sync push is observable rather
	// than assumed from a successful dial.
	received := make(chan []byte, 4)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Upgrade(w, r, nil, 1024, 1024)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			select {
			case received <- msg:
			default:
			}
		}
	}))
	t.Cleanup(srv.Close)
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http")
	t.Setenv("TICKS_URL", wsURL)

	repoDir, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick", "issues"), 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}

	stderr := captureStderr(t)
	ctx, cancel := context.WithCancel(context.Background())
	errCh := make(chan error, 1)
	go func() {
		errCh <- ExecuteArgsContext(ctx, []string{"board", repoDir, "--cloud", "-p", "0"})
	}()

	select {
	case msg := <-received:
		var payload map[string]any
		if jsonErr := json.Unmarshal(msg, &payload); jsonErr != nil {
			t.Errorf("board did not push valid JSON to the cloud: %v", jsonErr)
		} else if payload["type"] != "sync_full" {
			t.Errorf("first message from board sync was %v, want sync_full", payload["type"])
		}
	case err := <-errCh:
		t.Fatalf("tk board --cloud exited before syncing: %v", err)
	case <-time.After(10 * time.Second):
		t.Fatal("board never pushed an initial sync to the cloud")
	}

	cancel()
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("tk board --cloud returned an error on shutdown: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("tk board --cloud did not shut down within 10s")
	}

	if notice := stderr.stop(); !strings.Contains(notice, "connected to "+wsURL) {
		t.Errorf("board sync never reported connecting with the migrated ~/.ticksrc token/url:\n%s", notice)
	}
}
