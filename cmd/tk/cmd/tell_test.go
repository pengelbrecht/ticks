package cmd

import (
	"os"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

func TestTellConfiguredEscapesPlainTextOnce(t *testing.T) {
	channelTestHome(t)
	// In a checkout, an announcement names the project it is about (tick spq):
	// one bot serves every checkout on the machine. setupTestRepo's origin
	// makes that name deterministic.
	channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()

	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "5 < 7 & 8 > 3", "--channel", "telegram"}); err != nil {
		t.Fatalf("tell: %v\n%s", err, out.String())
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d messages, want 1 (calls: %v)", len(sent), bot.Calls())
	}
	if want := "<b>test/repo</b>\n5 &lt; 7 &amp; 8 &gt; 3"; sent[0].Text != want {
		t.Errorf("sent text = %q, want %q (project label + exactly-once HTML escaping)", sent[0].Text, want)
	}
	if sent[0].ParseMode != "HTML" {
		t.Errorf("parse mode = %q, want HTML", sent[0].ParseMode)
	}
}

// TestTellAboutNamesEpicAndTick is the completion half of the legibility
// requirement: a report in a chat several projects report into has to say what
// completed, not only that something did.
func TestTellAboutNamesEpicAndTick(t *testing.T) {
	channelTestHome(t)
	_, store := setupTestRepoWithConfig(t)
	epic := makeTestEpic("ep1")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	child := runCreateJSON(t, "a child tick", "--parent", "ep1")

	bot := fakebot.New()
	defer bot.Close()
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "--about", child.ID, "worker landed"}); err != nil {
		t.Fatalf("tell --about: %v\n%s", err, out.String())
	}
	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d messages, want 1 (calls: %v)", len(sent), bot.Calls())
	}
	for _, want := range []string{"test/repo", "epic ep1", "tick " + child.ID, "worker landed"} {
		if !strings.Contains(sent[0].Text, want) {
			t.Errorf("announcement %q does not name %q", sent[0].Text, want)
		}
	}
}

// An epic names itself as the epic and carries no tick: "epic X · tick X"
// reads as two facts where there is one.
func TestTellAboutAnEpicNamesItOnce(t *testing.T) {
	channelTestHome(t)
	_, store := setupTestRepoWithConfig(t)
	if err := store.Write(makeTestEpic("ep1")); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	bot := fakebot.New()
	defer bot.Close()
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "--about", "ep1", "epic done"}); err != nil {
		t.Fatalf("tell --about epic: %v\n%s", err, out.String())
	}
	text := bot.Sent()[0].Text
	if !strings.Contains(text, "epic ep1") {
		t.Errorf("announcement %q does not name the epic", text)
	}
	if strings.Contains(text, "tick ep1") {
		t.Errorf("announcement %q names the epic twice", text)
	}
}

// A tick id that no longer resolves costs the message its epic, never the
// announcement: tk tell is the one command a prompt calls unconditionally.
func TestTellAboutAnUnknownTickStillSends(t *testing.T) {
	channelTestHome(t)
	setupTestRepoWithConfig(t)
	bot := fakebot.New()
	defer bot.Close()
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "--about", "nope", "still sent"}); err != nil {
		t.Fatalf("tell --about an unknown tick: %v\n%s", err, out.String())
	}
	text := bot.Sent()[0].Text
	if !strings.Contains(text, "still sent") || !strings.Contains(text, "tick nope") {
		t.Errorf("announcement %q lost its text or its tick", text)
	}
}

func TestTellUnconfiguredReturnsExitFourWithoutHTTP(t *testing.T) {
	configPath := channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{"tell", "hello"})
	if err == nil {
		t.Fatal("tell with no configured channel returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Fatalf("unconfigured tell made HTTP calls: %v", calls)
	}
	if _, statErr := os.Stat(configPath); !os.IsNotExist(statErr) {
		t.Fatalf("unconfigured tell changed %s (stat error: %v)", configPath, statErr)
	}
	if printed := strings.TrimSpace(out.String()); printed == "" || strings.Contains(printed, "\n") {
		t.Errorf("unconfigured tell should print one stderr line, got %q", out.String())
	}
}

func TestTellDeliveryFailureIsNonzeroAndNamesChannel(t *testing.T) {
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	bot.FailNext("sendMessage", 500, "fake delivery failure")
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{"tell", "hello"})
	if err == nil {
		t.Fatal("tell with a failed delivery returned nil error")
	}
	if code := GetExitCode(err); code == ExitSuccess || code == ExitNotFound {
		t.Fatalf("exit code = %d, want a delivery-failure code other than 0/4: %v", code, err)
	}
	if !strings.Contains(err.Error(), "telegram") && !strings.Contains(out.String(), "telegram") {
		t.Errorf("delivery failure does not name the channel: err=%q stderr=%q", err, out.String())
	}
	if calls := bot.Calls(); len(calls) != 1 || calls[0] != "sendMessage" {
		t.Errorf("HTTP calls = %v, want one sendMessage call", calls)
	}
}

func TestTellReadsStdinWhenTextIsOmitted(t *testing.T) {
	channelTestHome(t)
	channelTestRepo(t)
	bot := fakebot.New()
	defer bot.Close()
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	out := captureChannelIO(t, "report <&>\n")

	if err := ExecuteArgs([]string{"tell"}); err != nil {
		t.Fatalf("tell from stdin: %v\n%s", err, out.String())
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d messages, want 1 (calls: %v)", len(sent), bot.Calls())
	}
	if want := "<b>test/repo</b>\nreport &lt;&amp;&gt;"; sent[0].Text != want {
		t.Errorf("stdin text = %q, want %q", sent[0].Text, want)
	}
}

func TestTellChannelFlagResetsBetweenExecutions(t *testing.T) {
	channelTestHome(t)
	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{"tell", "hello", "--channel", "slack"})
	if err == nil || GetExitCode(err) != ExitUsage {
		t.Fatalf("unsupported channel exit = %v, want usage error", err)
	}

	err = ExecuteArgs([]string{"tell", "hello"})
	if err == nil || GetExitCode(err) != ExitNotFound {
		t.Fatalf("channel flag leaked into next execution: exit = %v, want no-telegram-configured error\n%s", err, out.String())
	}
	if lines := strings.Split(strings.TrimSpace(out.String()), "\n"); len(lines) != 2 {
		t.Fatalf("tell errors should be one line each, got %d lines:\n%s", len(lines), out.String())
	}
}

func TestTellHelpDocumentsChannelAndUnconfiguredExit(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"tell", "--help"}); err != nil {
		t.Fatalf("tell --help: %v\n%s", err, out.String())
	}
	printed := out.String()
	for _, want := range []string{"--channel", "telegram", "exit code 4", "stdin"} {
		if !strings.Contains(strings.ToLower(printed), strings.ToLower(want)) {
			t.Errorf("tell --help missing %q:\n%s", want, printed)
		}
	}
}

// TestTellEmptyTextIsUsageErrorWithoutHTTP keeps an empty announcement from
// reaching the transport. The Bot API rejects an empty message anyway, so the
// only question is whether the caller learns that from `tk` or from a 400 —
// and a `tk tell` whose stdin turned out to be empty is a scripting mistake,
// not a delivery failure.
func TestTellEmptyTextIsUsageErrorWithoutHTTP(t *testing.T) {
	for _, tc := range []struct {
		name  string
		args  []string
		stdin string
	}{
		{"blank argument", []string{"tell", "   "}, ""},
		{"empty stdin", []string{"tell"}, ""},
		{"whitespace stdin", []string{"tell"}, "  \n\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			channelTestHome(t)
			bot := fakebot.New()
			defer bot.Close()
			writeChannelConfig(t, operator.ChannelConfig{
				Token:   bot.Token,
				ChatID:  "919191",
				APIBase: bot.URL(),
			})
			out := captureChannelIO(t, tc.stdin)

			err := ExecuteArgs(tc.args)
			if err == nil {
				t.Fatalf("tell with no text returned nil error\n%s", out.String())
			}
			if code := GetExitCode(err); code != ExitUsage {
				t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
			}
			if calls := bot.Calls(); len(calls) != 0 {
				t.Errorf("empty tell made HTTP calls: %v", calls)
			}
		})
	}
}
