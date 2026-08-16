package cmd

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

// ---------------------------------------------------------------------------
// Fixtures
//
// The whole flow runs against fakebot over real HTTP, so these tests exercise
// the same code path as A31's evidence run: the only difference is --api-base.
// ---------------------------------------------------------------------------

// syncBuffer is an io.Writer a test goroutine may read while the command under
// test writes to it. The pairing tests need that: the pairing code is generated
// by the command, so the "operator" can only send /start <code> after reading
// the code off the command's own output.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// captureChannelIO redirects the command's output to a synchronized buffer and
// its input to stdin, so a test never blocks on the real terminal.
func captureChannelIO(t *testing.T, stdin string) *syncBuffer {
	t.Helper()
	buf := &syncBuffer{}
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)
	rootCmd.SetIn(strings.NewReader(stdin))
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
		rootCmd.SetIn(nil)
	})
	return buf
}

// channelTestHome points the global operator config at a temp dir and returns
// the path operator.json will be written to.
func channelTestHome(t *testing.T) string {
	t.Helper()
	home := t.TempDir()
	t.Setenv(operator.HomeEnv, home)
	return filepath.Join(home, operator.ConfigFileName)
}

// channelTestRepo is a git repo with a .tick directory: what setup needs before
// it offers the tracked mapping entry.
func channelTestRepo(t *testing.T) string {
	t.Helper()
	repo, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repo, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	return repo
}

var pairingCodeRE = regexp.MustCompile(`Pairing code:\s+(\S+)`)

// pairWhenPrompted watches the command's output for the pairing code and then
// sends "/start <code>" from userID as the operator would. prefix lets a caller
// send something else first (a wrong code) from the same goroutine.
func pairWhenPrompted(t *testing.T, bot *fakebot.Bot, out *syncBuffer, userID, chatID int64) {
	t.Helper()
	go func() {
		deadline := time.Now().Add(10 * time.Second)
		for time.Now().Before(deadline) {
			if m := pairingCodeRE.FindStringSubmatch(out.String()); m != nil {
				bot.PushMessage(userID, chatID, "/start "+m[1])
				return
			}
			time.Sleep(5 * time.Millisecond)
		}
	}()
}

func loadChannelConfig(t *testing.T) operator.OperatorConfig {
	t.Helper()
	cfg, err := operator.LoadOperatorConfig()
	if err != nil {
		t.Fatalf("load operator config: %v", err)
	}
	return cfg
}

// assertNoTokenUnderTick is fact A11: nothing token-shaped, and not the literal
// token either, anywhere under the repo's .tick directory.
func assertNoTokenUnderTick(t *testing.T, repo, token string) {
	t.Helper()
	shaped := regexp.MustCompile(`\d+:[A-Za-z0-9_-]{30,}`)
	root := filepath.Join(repo, ".tick")
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		data, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		if bytes.Contains(data, []byte(token)) {
			t.Errorf("%s contains the bot token", path)
		}
		if shaped.Match(data) {
			t.Errorf("%s contains a token-shaped string", path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

// TestChannelSetupTelegramPairs is the A31 happy path: pairing completes
// against fakebot, the secret lands in the 0600 global config, the tracked
// mapping gets the non-secret entry, and the paired chat gets a confirmation.
func TestChannelSetupTelegramPairs(t *testing.T) {
	configPath := channelTestHome(t)
	repo := channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()

	out := captureChannelIO(t, "y\n")
	pairWhenPrompted(t, bot, out, 424242, 919191)

	err := ExecuteArgs([]string{
		"channel", "setup", "telegram",
		"--token", bot.Token,
		"--api-base", bot.URL(),
		"--pair-timeout", "20s",
	})
	if err != nil {
		t.Fatalf("channel setup telegram: %v\n%s", err, out.String())
	}

	// Global config: contents.
	cfg := loadChannelConfig(t)
	tg, ok := cfg.Channel("telegram")
	if !ok {
		t.Fatalf("no telegram entry in %s\n%s", configPath, out.String())
	}
	if tg.Token != bot.Token {
		t.Errorf("token = %q, want %q", tg.Token, bot.Token)
	}
	if tg.UserID != "424242" {
		t.Errorf("user_id = %q, want %q", tg.UserID, "424242")
	}
	if tg.ChatID != "919191" {
		t.Errorf("chat_id = %q, want %q", tg.ChatID, "919191")
	}
	if tg.BotUsername != bot.Me().Username {
		t.Errorf("bot_username = %q, want %q", tg.BotUsername, bot.Me().Username)
	}
	if tg.APIBase != bot.URL() {
		t.Errorf("api_base = %q, want %q", tg.APIBase, bot.URL())
	}

	// Global config: permissions.
	info, err := os.Stat(configPath)
	if err != nil {
		t.Fatalf("stat %s: %v", configPath, err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("%s mode = %04o, want 0600", configPath, perm)
	}

	// Tracked mapping: the non-secret entry, offered and accepted.
	mapping, err := operator.LoadMapping(repo)
	if err != nil {
		t.Fatalf("load mapping: %v", err)
	}
	if len(mapping.Operators) != 1 {
		t.Fatalf("mapping has %d operators, want 1: %+v", len(mapping.Operators), mapping.Operators)
	}
	for name, byChannel := range mapping.Operators {
		identity, ok := byChannel["telegram"]
		if !ok {
			t.Fatalf("operator %q has no telegram identity: %+v", name, byChannel)
		}
		if identity.UserID != 424242 {
			t.Errorf("mapped user id = %d, want 424242", identity.UserID)
		}
		if identity.BotUsername != bot.Me().Username {
			t.Errorf("mapped bot username = %q, want %q", identity.BotUsername, bot.Me().Username)
		}
	}

	// A11: no credential anywhere under .tick.
	assertNoTokenUnderTick(t, repo, bot.Token)

	// The paired chat is told pairing worked.
	sent := bot.Sent()
	if len(sent) == 0 {
		t.Fatalf("no confirmation message sent\n%s", out.String())
	}
	last := sent[len(sent)-1]
	if last.ChatID != "919191" {
		t.Errorf("confirmation chat = %q, want %q", last.ChatID, "919191")
	}

	printed := out.String()
	if !strings.Contains(printed, "https://t.me/"+bot.Me().Username+"?start=") {
		t.Errorf("output has no deep link:\n%s", printed)
	}
	if strings.Contains(printed, bot.Token) {
		t.Errorf("output echoed the bot token:\n%s", printed)
	}
}

// TestChannelSetupTelegramIgnoresWrongCode pins that a /start carrying the
// wrong code neither pairs nor stops the flow — and that the token can come
// from the interactive prompt instead of the flag.
func TestChannelSetupTelegramIgnoresWrongCode(t *testing.T) {
	channelTestHome(t)
	channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()

	// A stranger's /start with a bogus code, queued before the flow starts.
	bot.PushMessage(111, 222, "/start NOTTHECODE")

	// Token typed at the prompt, then "n" to the tracked-mapping offer.
	out := captureChannelIO(t, bot.Token+"\nn\n")
	pairWhenPrompted(t, bot, out, 424242, 919191)

	err := ExecuteArgs([]string{
		"channel", "setup", "telegram",
		"--api-base", bot.URL(),
		"--pair-timeout", "20s",
	})
	if err != nil {
		t.Fatalf("channel setup telegram: %v\n%s", err, out.String())
	}

	tg, ok := loadChannelConfig(t).Channel("telegram")
	if !ok {
		t.Fatalf("no telegram entry after pairing\n%s", out.String())
	}
	if tg.UserID != "424242" || tg.ChatID != "919191" {
		t.Errorf("bound to %s/%s, want 424242/919191 — the wrong-code sender paired",
			tg.UserID, tg.ChatID)
	}
	// "n" at the offer means the tracked file is never created.
	if _, err := os.Stat(operator.MappingPath(".")); !os.IsNotExist(err) {
		t.Errorf("declined mapping offer still wrote %s (err=%v)", operator.MappingPath("."), err)
	}
}

// TestChannelSetupTelegramTimeout pins the timeout contract: nonzero exit and
// no partial global config left behind.
func TestChannelSetupTelegramTimeout(t *testing.T) {
	configPath := channelTestHome(t)
	repo := channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()

	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{
		"channel", "setup", "telegram",
		"--token", bot.Token,
		"--api-base", bot.URL(),
		"--pair-timeout", "300ms",
	})
	if err == nil {
		t.Fatalf("setup with no /start returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code == ExitSuccess {
		t.Errorf("exit code = %d, want nonzero", code)
	}
	if _, statErr := os.Stat(configPath); !os.IsNotExist(statErr) {
		t.Errorf("timed-out setup left %s behind (err=%v)", configPath, statErr)
	}
	if _, statErr := os.Stat(operator.MappingPath(repo)); !os.IsNotExist(statErr) {
		t.Errorf("timed-out setup wrote the tracked mapping (err=%v)", statErr)
	}
}

// TestChannelSetupRejectsUnknownChannel keeps the usage gate typed.
func TestChannelSetupRejectsUnknownChannel(t *testing.T) {
	channelTestHome(t)
	captureChannelIO(t, "")

	err := ExecuteArgs([]string{"channel", "setup", "carrier-pigeon"})
	if err == nil {
		t.Fatal("setup of an unknown channel returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

// writeChannelConfig seeds the global config the way setup would have.
func writeChannelConfig(t *testing.T, cfg operator.ChannelConfig) {
	t.Helper()
	var global operator.OperatorConfig
	global.SetChannel("telegram", cfg)
	if err := operator.SaveOperatorConfig(global); err != nil {
		t.Fatalf("save operator config: %v", err)
	}
}

// TestChannelStatusNothingConfigured is half of A32: a friendly message, exit 0.
func TestChannelStatusNothingConfigured(t *testing.T) {
	channelTestHome(t)
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"channel", "status"}); err != nil {
		t.Fatalf("channel status: %v\n%s", err, out.String())
	}
	printed := out.String()
	if !strings.Contains(printed, "No operator channel is configured") {
		t.Errorf("output does not say nothing is configured:\n%s", printed)
	}
	if !strings.Contains(printed, "tk channel setup telegram") {
		t.Errorf("output does not point at setup:\n%s", printed)
	}
}

// TestChannelStatusReportsPairing is the other half of A32: identity, mapping
// presence and a live token check.
func TestChannelStatusReportsPairing(t *testing.T) {
	channelTestHome(t)
	repo := channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()

	writeChannelConfig(t, operator.ChannelConfig{
		Token:       bot.Token,
		UserID:      "424242",
		ChatID:      "919191",
		BotUsername: bot.Me().Username,
		APIBase:     bot.URL(),
	})
	if err := operator.UpsertOperator(repo, "tester@example.com", "telegram", operator.OperatorIdentity{
		BotUsername: bot.Me().Username,
		UserID:      424242,
	}); err != nil {
		t.Fatalf("upsert operator: %v", err)
	}

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"channel", "status"}); err != nil {
		t.Fatalf("channel status: %v\n%s", err, out.String())
	}

	printed := out.String()
	for _, want := range []string{"telegram", "@" + bot.Me().Username, "424242", "919191", "tester@example.com", "live"} {
		if !strings.Contains(printed, want) {
			t.Errorf("status output missing %q:\n%s", want, printed)
		}
	}
	if strings.Contains(printed, bot.Token) {
		t.Errorf("status printed the bot token:\n%s", printed)
	}
	if calls := bot.Calls(); len(calls) == 0 {
		t.Errorf("status did not verify the token with getMe (calls: %v)", calls)
	}
}

// TestChannelStatusOfflineSkipsGetMe pins --offline: no network at all.
func TestChannelStatusOfflineSkipsGetMe(t *testing.T) {
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()

	writeChannelConfig(t, operator.ChannelConfig{
		Token:       bot.Token,
		UserID:      "424242",
		ChatID:      "919191",
		BotUsername: bot.Me().Username,
		APIBase:     bot.URL(),
	})

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"channel", "status", "--offline"}); err != nil {
		t.Fatalf("channel status --offline: %v\n%s", err, out.String())
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("--offline still called the API: %v", calls)
	}
	if printed := out.String(); !strings.Contains(printed, "@"+bot.Me().Username) {
		t.Errorf("offline status did not report the bot:\n%s", printed)
	}
}

// TestChannelStatusDeadToken: a rejected token is reported either way, but only
// --check turns it into a nonzero exit.
func TestChannelStatusDeadToken(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()

	seed := func(t *testing.T) {
		t.Helper()
		channelTestHome(t)
		writeChannelConfig(t, operator.ChannelConfig{
			Token:       "revoked-token",
			UserID:      "424242",
			ChatID:      "919191",
			BotUsername: bot.Me().Username,
			APIBase:     bot.URL(),
		})
	}

	t.Run("reported, exit 0", func(t *testing.T) {
		seed(t)
		out := captureChannelIO(t, "")
		if err := ExecuteArgs([]string{"channel", "status"}); err != nil {
			t.Fatalf("status with a dead token exited nonzero without --check: %v\n%s", err, out.String())
		}
		if printed := out.String(); !strings.Contains(printed, "rejected") {
			t.Errorf("dead token not reported:\n%s", printed)
		}
	})

	t.Run("--check exits nonzero", func(t *testing.T) {
		seed(t)
		out := captureChannelIO(t, "")
		err := ExecuteArgs([]string{"channel", "status", "--check"})
		if err == nil {
			t.Fatalf("status --check with a dead token returned nil error\n%s", out.String())
		}
		if code := GetExitCode(err); code == ExitSuccess {
			t.Errorf("exit code = %d, want nonzero", code)
		}
	})
}

// TestChannelStatusMissingToken: an entry with no credential is unusable, so it
// is reported and, under --check, fails — without any network call.
func TestChannelStatusMissingToken(t *testing.T) {
	channelTestHome(t)
	writeChannelConfig(t, operator.ChannelConfig{
		UserID:      "424242",
		ChatID:      "919191",
		BotUsername: "ticks_operator_bot",
	})

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"channel", "status"}); err != nil {
		t.Fatalf("status with a missing token exited nonzero without --check: %v\n%s", err, out.String())
	}
	if printed := out.String(); !strings.Contains(printed, "missing") {
		t.Errorf("missing token not reported:\n%s", printed)
	}

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"channel", "status", "--check"}); err == nil {
		t.Error("status --check with a missing token returned nil error")
	}
}

// TestChannelCommandRegistered pins the registration the legacy dispatch test
// also depends on: `tk channel` is a real, visible command with both
// subcommands.
func TestChannelCommandRegistered(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"channel", "--help"}); err != nil {
		t.Fatalf("channel --help: %v\n%s", err, out.String())
	}
	printed := out.String()
	for _, want := range []string{"setup", "status"} {
		if !strings.Contains(printed, want) {
			t.Errorf("channel --help does not list %q:\n%s", want, printed)
		}
	}

	var found bool
	for _, name := range CommandNames() {
		if name == "channel" {
			found = true
		}
	}
	if !found {
		t.Errorf("channel is not a visible root command: %v", CommandNames())
	}
}
