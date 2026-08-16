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
	if sent[0].Text != "5 &lt; 7 &amp; 8 &gt; 3" {
		t.Errorf("sent text = %q, want exactly-once HTML escaping", sent[0].Text)
	}
	if sent[0].ParseMode != "HTML" {
		t.Errorf("parse mode = %q, want HTML", sent[0].ParseMode)
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
	if sent[0].Text != "report &lt;&amp;&gt;" {
		t.Errorf("stdin text = %q, want newline-stripped plain text escaped once", sent[0].Text)
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
