package cmd

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// tellTestBot is a configured telegram channel pointed at a fake Bot API.
func tellTestBot(t *testing.T) *fakebot.Bot {
	t.Helper()
	channelTestHome(t)
	bot := fakebot.New()
	t.Cleanup(bot.Close)
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		UserID:  "424242",
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	return bot
}

// writeTempFile writes content under a fresh temp dir and returns its path. The
// name carries the extension, which is what an auto-resolved attachment kind is
// read from.
func writeTempFile(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
	return path
}

// plainOnlyChannel is an [operator.Channel] and nothing more: it deliberately
// does NOT implement FormattedSender or AttachmentSender, which is how a test
// reaches the capability fallbacks. Every call is forwarded to a FakeChannel, so
// what the fallback actually sent is still observable.
type plainOnlyChannel struct{ inner *operator.FakeChannel }

func (c plainOnlyChannel) Send(ctx context.Context, text string) error {
	return c.inner.Send(ctx, text)
}

func (c plainOnlyChannel) AskDeliver(ctx context.Context, q operator.Question) (operator.MessageRef, error) {
	return c.inner.AskDeliver(ctx, q)
}

func (c plainOnlyChannel) Events(ctx context.Context) <-chan operator.Event {
	return c.inner.Events(ctx)
}

func (c plainOnlyChannel) Resolve(ctx context.Context, ref operator.MessageRef, outcome operator.Outcome) error {
	return c.inner.Resolve(ctx, ref, outcome)
}

// ---------------------------------------------------------------------------
// --format
// ---------------------------------------------------------------------------

// TestTellFormatSendsRenderedMarkup pins the whole point of --format: the markup
// the caller authored reaches the operator rendered, not as literal asterisks.
func TestTellFormatSendsRenderedMarkup(t *testing.T) {
	bot := tellTestBot(t)
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "**Deploy done** — see `tk list`", "--format"}); err != nil {
		t.Fatalf("tell --format: %v\n%s", err, out.String())
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d messages, want 1 (calls: %v)", len(sent), bot.Calls())
	}
	want := "<b>Deploy done</b> — see <code>tk list</code>"
	if sent[0].Text != want {
		t.Errorf("sent text = %q, want %q", sent[0].Text, want)
	}
	if sent[0].ParseMode != "HTML" {
		t.Errorf("parse mode = %q, want HTML", sent[0].ParseMode)
	}
}

// TestTellFormatReadsStdin keeps the stdin path working under --format: a prompt
// pipes a report in exactly as it does for a plain tell.
func TestTellFormatReadsStdin(t *testing.T) {
	bot := tellTestBot(t)
	out := captureChannelIO(t, "**done**\n")

	if err := ExecuteArgs([]string{"tell", "--format"}); err != nil {
		t.Fatalf("tell --format from stdin: %v\n%s", err, out.String())
	}
	sent := bot.Sent()
	if len(sent) != 1 || sent[0].Text != "<b>done</b>" {
		t.Fatalf("sent = %+v, want one rendered message", sent)
	}
}

// TestTellPlainPathIsByteIdenticalWithMarkupInIt is the regression guard the
// acceptance criteria name: adding --format must not change what a plain tell
// puts on the wire. Markup characters in a plain announcement stay literal —
// they are text somebody wrote, escaped exactly once.
func TestTellPlainPathIsByteIdenticalWithMarkupInIt(t *testing.T) {
	bot := tellTestBot(t)
	out := captureChannelIO(t, "")

	if err := ExecuteArgs([]string{"tell", "**not bold** 5 < 7 & `not code`"}); err != nil {
		t.Fatalf("tell: %v\n%s", err, out.String())
	}
	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d messages, want 1", len(sent))
	}
	want := "**not bold** 5 &lt; 7 &amp; `not code`"
	if sent[0].Text != want {
		t.Errorf("plain tell text = %q, want %q", sent[0].Text, want)
	}
}

// TestTellFormatFallsBackWhenTheChannelCannotRenderMarkup covers the capability
// probe: a channel without FormattedSender gets the message as plain text with
// the markup stripped, plus a note saying so — the announcement still lands.
func TestTellFormatFallsBackWhenTheChannelCannotRenderMarkup(t *testing.T) {
	fake := operator.NewFakeChannel()
	channel := plainOnlyChannel{inner: fake}
	var stderr strings.Builder

	payload := tellPayload{Text: "**Deploy done** — see [the board](https://x.test/b)", Format: true}
	if err := tellSend(context.Background(), channel, payload, &stderr); err != nil {
		t.Fatalf("tellSend: %v", err)
	}

	sent := fake.Sent()
	want := "Deploy done — see the board (https://x.test/b)"
	if len(sent) != 1 || sent[0] != want {
		t.Fatalf("Sent() = %#v, want [%q]", sent, want)
	}
	if formatted := fake.Formatted(); len(formatted) != 0 {
		t.Errorf("a channel without FormattedSender received %#v", formatted)
	}
	if !strings.Contains(stderr.String(), "markup") {
		t.Errorf("fallback did not note the downgrade on stderr: %q", stderr.String())
	}
}

// TestTellFormatUsesTheCapabilityWhenItIsThere is the other half of the probe:
// a channel that CAN render markup is never routed through the strip.
func TestTellFormatUsesTheCapabilityWhenItIsThere(t *testing.T) {
	fake := operator.NewFakeChannel()
	var stderr strings.Builder

	payload := tellPayload{Text: "**Deploy done**", Format: true}
	if err := tellSend(context.Background(), fake, payload, &stderr); err != nil {
		t.Fatalf("tellSend: %v", err)
	}
	formatted := fake.Formatted()
	if len(formatted) != 1 {
		t.Fatalf("Formatted() = %#v, want one message", formatted)
	}
	if formatted[0].Text != "**Deploy done**" || formatted[0].Format != operator.FormatMarkdownLite {
		t.Errorf("formatted message = %#v, want the markup as MarkdownLite", formatted[0])
	}
	if sent := fake.Sent(); len(sent) != 0 {
		t.Errorf("a formatted send also went out as plain text: %#v", sent)
	}
	if stderr.String() != "" {
		t.Errorf("a supported send warned anyway: %q", stderr.String())
	}
}

// ---------------------------------------------------------------------------
// --file
// ---------------------------------------------------------------------------

// TestTellFileRoutesByKind pins the routing --file exists for: an image goes up
// as a photo so it renders inline, anything else as a document so it arrives
// intact, and --as overrides both.
func TestTellFileRoutesByKind(t *testing.T) {
	for _, tc := range []struct {
		name       string
		file       string
		args       []string
		wantMethod string
		wantField  string
	}{
		{"png auto-resolves to a photo", "board.png", nil, "sendPhoto", "photo"},
		{"log auto-resolves to a document", "run.log", nil, "sendDocument", "document"},
		{"--as document overrides a png", "board.png", []string{"--as", "document"}, "sendDocument", "document"},
		{"--as photo overrides an unknown extension", "shot.webp", []string{"--as", "photo"}, "sendPhoto", "photo"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			bot := tellTestBot(t)
			out := captureChannelIO(t, "")
			path := writeTempFile(t, tc.file, "file body")

			args := append([]string{"tell", "--file", path, "--caption", "the nightly board"}, tc.args...)
			if err := ExecuteArgs(args); err != nil {
				t.Fatalf("tell --file: %v\n%s", err, out.String())
			}

			files := bot.Files()
			if len(files) != 1 {
				t.Fatalf("uploaded %d files, want 1 (calls: %v)", len(files), bot.Calls())
			}
			if files[0].Method != tc.wantMethod || files[0].Field != tc.wantField {
				t.Errorf("upload = %s/%s, want %s/%s", files[0].Method, files[0].Field, tc.wantMethod, tc.wantField)
			}
			if files[0].Filename != tc.file {
				t.Errorf("filename = %q, want %q", files[0].Filename, tc.file)
			}
			if string(files[0].Content) != "file body" {
				t.Errorf("uploaded content = %q, want the file's bytes", files[0].Content)
			}
			if files[0].Caption != "the nightly board" {
				t.Errorf("caption = %q, want the --caption text", files[0].Caption)
			}
			if sent := bot.Sent(); len(sent) != 0 {
				t.Errorf("tell --file also sent a text message: %+v", sent)
			}
		})
	}
}

// TestTellFileWithoutCaptionSendsNone keeps the caption optional.
func TestTellFileWithoutCaptionSendsNone(t *testing.T) {
	bot := tellTestBot(t)
	out := captureChannelIO(t, "")
	path := writeTempFile(t, "run.log", "lines")

	if err := ExecuteArgs([]string{"tell", "--file", path}); err != nil {
		t.Fatalf("tell --file: %v\n%s", err, out.String())
	}
	files := bot.Files()
	if len(files) != 1 || files[0].Caption != "" {
		t.Fatalf("Files() = %+v, want one upload with no caption", files)
	}
}

// TestTellFileFallsBackWhenTheChannelCannotUpload covers the attachment probe:
// a channel without AttachmentSender still tells the operator what happened and
// where the file is, rather than failing the announcement.
func TestTellFileFallsBackWhenTheChannelCannotUpload(t *testing.T) {
	fake := operator.NewFakeChannel()
	channel := plainOnlyChannel{inner: fake}
	var stderr strings.Builder

	payload := tellPayload{File: "/tmp/board.png", Caption: "the nightly board"}
	if err := tellSend(context.Background(), channel, payload, &stderr); err != nil {
		t.Fatalf("tellSend: %v", err)
	}
	sent := fake.Sent()
	if len(sent) != 1 {
		t.Fatalf("Sent() = %#v, want one plain message", sent)
	}
	if !strings.Contains(sent[0], "/tmp/board.png") || !strings.Contains(sent[0], "the nightly board") {
		t.Errorf("fallback message = %q, want the caption and the path", sent[0])
	}
	if attachments := fake.Attachments(); len(attachments) != 0 {
		t.Errorf("a channel without AttachmentSender received %#v", attachments)
	}
	if !strings.Contains(stderr.String(), "upload") {
		t.Errorf("fallback did not note the downgrade on stderr: %q", stderr.String())
	}
}

// TestTellFileUnconfiguredIsExitFourWithoutHTTP holds the existing contract on
// the new path: nothing is uploaded and nothing is attempted when there is no
// channel to upload to.
func TestTellFileUnconfiguredIsExitFourWithoutHTTP(t *testing.T) {
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	out := captureChannelIO(t, "")
	path := writeTempFile(t, "board.png", "png")

	err := ExecuteArgs([]string{"tell", "--file", path, "--caption", "board"})
	if err == nil {
		t.Fatalf("tell --file with no configured channel returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Fatalf("unconfigured tell --file made HTTP calls: %v", calls)
	}
}

// TestTellFormatUnconfiguredIsExitFourWithoutHTTP is the same contract for the
// other new path.
func TestTellFormatUnconfiguredIsExitFourWithoutHTTP(t *testing.T) {
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{"tell", "**hello**", "--format"})
	if err == nil {
		t.Fatalf("tell --format with no configured channel returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Fatalf("unconfigured tell --format made HTTP calls: %v", calls)
	}
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

// TestTellRichUsageErrors keeps every rejected combination typed as a usage
// error and off the wire.
func TestTellRichUsageErrors(t *testing.T) {
	for _, tc := range []struct {
		name string
		args func(path string) []string
	}{
		{"--format with --file", func(p string) []string { return []string{"tell", "hi", "--format", "--file", p} }},
		{"--caption without --file", func(string) []string { return []string{"tell", "hi", "--caption", "nope"} }},
		{"--as without --file", func(string) []string { return []string{"tell", "hi", "--as", "photo"} }},
		{"unknown --as", func(p string) []string { return []string{"tell", "--file", p, "--as", "sticker"} }},
		{"text arguments with --file", func(p string) []string { return []string{"tell", "words", "--file", p} }},
		{"over-long caption", func(p string) []string {
			return []string{"tell", "--file", p, "--caption", strings.Repeat("x", captionMaxLen+1)}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			bot := tellTestBot(t)
			out := captureChannelIO(t, "")
			path := writeTempFile(t, "board.png", "png")

			err := ExecuteArgs(tc.args(path))
			if err == nil {
				t.Fatalf("%s returned nil error\n%s", tc.name, out.String())
			}
			if code := GetExitCode(err); code != ExitUsage {
				t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
			}
			if calls := bot.Calls(); len(calls) != 0 {
				t.Errorf("a rejected tell made HTTP calls: %v", calls)
			}
		})
	}
}

// TestTellRichFlagsResetBetweenExecutions guards the in-process quirk: a --file
// or --format left over from an earlier execution would silently change the next
// announcement.
func TestTellRichFlagsResetBetweenExecutions(t *testing.T) {
	bot := tellTestBot(t)
	out := captureChannelIO(t, "")
	path := writeTempFile(t, "board.png", "png")

	if err := ExecuteArgs([]string{"tell", "--file", path, "--as", "document", "--caption", "board"}); err != nil {
		t.Fatalf("tell --file: %v\n%s", err, out.String())
	}
	if err := ExecuteArgs([]string{"tell", "**plain**"}); err != nil {
		t.Fatalf("tell: %v\n%s", err, out.String())
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("sent %d text messages, want 1 (files: %d)", len(sent), len(bot.Files()))
	}
	if sent[0].Text != "**plain**" {
		t.Errorf("second tell text = %q — did --format leak in?", sent[0].Text)
	}
	if files := bot.Files(); len(files) != 1 {
		t.Errorf("uploaded %d files, want 1 — did --file leak into the second tell?", len(files))
	}
}

// TestTellHelpDocumentsRichFlags keeps the new surface discoverable where a
// caller looks for it.
func TestTellHelpDocumentsRichFlags(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"tell", "--help"}); err != nil {
		t.Fatalf("tell --help: %v\n%s", err, out.String())
	}
	printed := strings.ToLower(out.String())
	for _, want := range []string{"--format", "--file", "--caption", "--as", "markdownlite"} {
		if !strings.Contains(printed, strings.ToLower(want)) {
			t.Errorf("tell --help missing %q:\n%s", want, out.String())
		}
	}
}
