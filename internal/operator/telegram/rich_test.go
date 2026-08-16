package telegram

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

var (
	_ operator.FormattedSender  = (*Channel)(nil)
	_ operator.AttachmentSender = (*Channel)(nil)
	_ operator.Adopter          = (*Channel)(nil)
)

const testUserID = 4242

// writeFile drops content at name under a fresh temp dir and returns the path.
func writeFile(t *testing.T, name string, content []byte) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatalf("writing %s: %v", path, err)
	}
	return path
}

// pngBytes is a plausible PNG header — enough for a fake upload to look like one.
var pngBytes = []byte("\x89PNG\r\n\x1a\nfake image bytes")

func TestMarkdownLiteToHTML(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		// The subset, element by element (the mapping table on
		// operator.FormatMarkdownLite is the spec).
		{"bold", "**ship it**", "<b>ship it</b>"},
		{"italic", "_soon_", "<i>soon</i>"},
		{"inline code", "`go test`", "<code>go test</code>"},
		{"code block", "```go test ./...```", "<pre>go test ./...</pre>"},
		{"link", "[the run](https://example.test/run/1)", `<a href="https://example.test/run/1">the run</a>`},

		// Text outside the markup is escaped...
		{"plain text is escaped", "a < b & c > d", "a &lt; b &amp; c &gt; d"},
		{"quotes are escaped", `he said "go"`, "he said &#34;go&#34;"},
		// ...and so is interpolated text inside a rendered element.
		{"text inside bold is escaped", "**<script>alert(1)</script>**", "<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>"},
		{"text inside italic is escaped", "_a & b_", "<i>a &amp; b</i>"},
		{"text inside inline code is escaped", "`if a < b {`", "<code>if a &lt; b {</code>"},
		{"text inside a code block is escaped", "```<b>x</b>```", "<pre>&lt;b&gt;x&lt;/b&gt;</pre>"},
		{"link label and url are escaped", "[a & b](https://x.test/?q=1&r=2)", `<a href="https://x.test/?q=1&amp;r=2">a &amp; b</a>`},
		{"a quote in a url cannot break out of the href", `[x](https://x.test/" onmouseover=")`, `<a href="https://x.test/&#34; onmouseover=&#34;">x</a>`},

		{"elements mix with surrounding text", "run **abc** in `main.go` now", "run <b>abc</b> in <code>main.go</code> now"},
		{"several elements in one line", "**a** _b_ `c`", "<b>a</b> <i>b</i> <code>c</code>"},
		{"utf8 outside and inside markup survives", "**søk** ✅ à", "<b>søk</b> ✅ à"},

		// Everything outside the subset renders literally.
		{"heading", "# Heading", "# Heading"},
		{"strikethrough", "~~gone~~", "~~gone~~"},
		{"list markers", "- one\n- two", "- one\n- two"},
		{"blockquote", "> quoted", "&gt; quoted"},
		{"image", "![alt](https://x.test/i.png)", "![alt](https://x.test/i.png)"},
		{"nested markup inside bold is literal", "**a `b` c**", "<b>a `b` c</b>"},
		{"code block wins over inline code", "```a `b` c```", "<pre>a `b` c</pre>"},

		// Unclosed or empty markup is text, not markup.
		{"unclosed bold", "**oops", "**oops"},
		{"unclosed italic", "_oops", "_oops"},
		{"unclosed inline code", "`oops", "`oops"},
		{"unclosed code block", "```oops", "```oops"},
		{"empty bold", "****", "****"},
		{"empty inline code", "``", "``"},
		{"link without a url", "[label]", "[label]"},
		{"link with an unclosed url", "[label](https://x.test", "[label](https://x.test"},
		{"empty label", "[](https://x.test)", "[](https://x.test)"},
		{"empty input", "", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := markdownLiteToHTML(tc.in); got != tc.want {
				t.Errorf("markdownLiteToHTML(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestSendFormattedRendersMarkdownLite(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	msg := operator.FormattedText{
		Text:   "**Done** — see `main.go` and [the run](https://example.test/run/1) <thanks>",
		Format: operator.FormatMarkdownLite,
	}
	if err := ch.SendFormatted(context.Background(), msg); err != nil {
		t.Fatalf("SendFormatted() error: %v", err)
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("Sent() = %#v, want exactly one message", sent)
	}
	want := `<b>Done</b> — see <code>main.go</code> and <a href="https://example.test/run/1">the run</a> &lt;thanks&gt;`
	if sent[0].Text != want {
		t.Errorf("sent text = %q, want %q", sent[0].Text, want)
	}
	if sent[0].ParseMode != "HTML" {
		t.Errorf("parse_mode = %q, want HTML", sent[0].ParseMode)
	}
	if len(sent[0].ReplyMarkup) != 0 {
		t.Errorf("reply_markup = %s, want none on a formatted tell", sent[0].ReplyMarkup)
	}
}

// TestSendFormattedRejectsUnknownFormat pins the contract's enforcement point:
// an unknown or zero format is the transport's error, never markup on the wire.
func TestSendFormattedRejectsUnknownFormat(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	for _, format := range []operator.Format{"", "html", "markdown", "markdown_v2"} {
		t.Run(string(format), func(t *testing.T) {
			err := ch.SendFormatted(context.Background(), operator.FormattedText{Text: "**raw**", Format: format})
			if err == nil {
				t.Fatalf("SendFormatted(format=%q) = nil, want an error", format)
			}
			if !strings.Contains(err.Error(), string(operator.FormatMarkdownLite)) {
				t.Errorf("error %q should name the format this transport does render", err)
			}
		})
	}
	if sent := bot.Sent(); len(sent) != 0 {
		t.Errorf("Sent() = %#v, want nothing on the wire for an unsupported format", sent)
	}
}

func TestSendAttachmentRoutesPhotoAndDocument(t *testing.T) {
	cases := []struct {
		name       string
		file       string
		kind       operator.AttachmentKind
		wantMethod string
		wantField  string
	}{
		{"auto png is a photo", "board.png", operator.KindAuto, "sendPhoto", "photo"},
		{"auto jpg is a photo", "board.jpg", operator.KindAuto, "sendPhoto", "photo"},
		{"auto gif is a document", "demo.gif", operator.KindAuto, "sendDocument", "document"},
		{"auto log is a document", "run.log", operator.KindAuto, "sendDocument", "document"},
		{"explicit document beats a photo extension", "board.png", operator.KindDocument, "sendDocument", "document"},
		{"explicit photo beats a document extension", "blob.bin", operator.KindPhoto, "sendPhoto", "photo"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			bot := fakebot.New()
			defer bot.Close()
			ch := newTestChannel(t, bot)

			path := writeFile(t, tc.file, pngBytes)
			ref, err := ch.SendAttachment(context.Background(), operator.Attachment{Path: path, Kind: tc.kind})
			if err != nil {
				t.Fatalf("SendAttachment() error: %v", err)
			}
			if ref.IsZero() {
				t.Fatal("SendAttachment returned a zero ref")
			}

			files := bot.Files()
			if len(files) != 1 {
				t.Fatalf("Files() = %#v, want exactly one upload", files)
			}
			got := files[0]
			if got.Method != tc.wantMethod || got.Field != tc.wantField {
				t.Errorf("upload = %s/%s, want %s/%s", got.Method, got.Field, tc.wantMethod, tc.wantField)
			}
			if got.Filename != tc.file {
				t.Errorf("filename = %q, want %q", got.Filename, tc.file)
			}
			if string(got.Content) != string(pngBytes) {
				t.Errorf("uploaded %d bytes, want the file's %d", len(got.Content), len(pngBytes))
			}
			if got.ChatID != "4242" {
				t.Errorf("chat_id = %q, want 4242", got.ChatID)
			}
			if len(got.ReplyMarkup) != 0 {
				t.Errorf("reply_markup = %s, want none on an ungated attachment", got.ReplyMarkup)
			}
			if want := strconv.FormatInt(got.MessageID, 10); ref.MessageID != want {
				t.Errorf("ref message id = %q, want %q", ref.MessageID, want)
			}
		})
	}
}

// TestSendAttachmentEscapesCaption holds the plain-text guarantee: a caption is
// caller text, so the transport escapes it exactly like Send does.
func TestSendAttachmentEscapesCaption(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	path := writeFile(t, "run.log", []byte("log"))
	if _, err := ch.SendAttachment(context.Background(), operator.Attachment{
		Path:    path,
		Caption: `branch <feat/a&b> "done"`,
	}); err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}

	files := bot.Files()
	if len(files) != 1 {
		t.Fatalf("Files() = %#v, want exactly one upload", files)
	}
	want := "branch &lt;feat/a&amp;b&gt; &#34;done&#34;"
	if files[0].Caption != want {
		t.Errorf("caption = %q, want %q", files[0].Caption, want)
	}
	if files[0].ParseMode != "HTML" {
		t.Errorf("parse_mode = %q, want HTML", files[0].ParseMode)
	}
}

func TestSendAttachmentOmitsCaptionFieldsWhenEmpty(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	path := writeFile(t, "run.log", []byte("log"))
	if _, err := ch.SendAttachment(context.Background(), operator.Attachment{Path: path}); err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	if got := bot.Files()[0].Caption; got != "" {
		t.Errorf("caption = %q, want empty", got)
	}
}

// TestGatedAttachmentPressFlowsThroughEvents is the epic's payoff on this
// transport: approve/reject controls under an uploaded photo, and a press that
// arrives as an EventOptionPress carrying the attachment's own ref and the
// presser's id — the same shape a press on a delivered question has.
func TestGatedAttachmentPressFlowsThroughEvents(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := ch.Events(ctx)

	path := writeFile(t, "board.png", pngBytes)
	ref, err := ch.SendAttachment(ctx, operator.Attachment{Path: path, Caption: "New board", Gate: true})
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}

	files := bot.Files()
	if len(files) != 1 || files[0].Method != "sendPhoto" {
		t.Fatalf("Files() = %#v, want one sendPhoto", files)
	}
	kb := parseInlineKeyboard(t, files[0].ReplyMarkup)
	if len(kb.InlineKeyboard) != 2 {
		t.Fatalf("keyboard = %#v, want two rows (approve, reject)", kb.InlineKeyboard)
	}
	if got := kb.InlineKeyboard[0][0].Text; got != "Approve" {
		t.Errorf("first button = %q, want Approve", got)
	}
	if got := kb.InlineKeyboard[1][0].Text; got != "Reject" {
		t.Errorf("second button = %q, want Reject", got)
	}

	messageID, err := strconv.ParseInt(ref.MessageID, 10, 64)
	if err != nil {
		t.Fatalf("ref message id %q is not numeric: %v", ref.MessageID, err)
	}
	bot.PushCallback(testUserID, testUserID, messageID, kb.InlineKeyboard[1][0].CallbackData)

	ev := recvEvent(t, events)
	if ev.Kind != operator.EventOptionPress {
		t.Fatalf("event kind = %q, want %q", ev.Kind, operator.EventOptionPress)
	}
	if ev.Ref != ref {
		t.Errorf("event ref = %+v, want the attachment ref %+v", ev.Ref, ref)
	}
	if ev.SenderID != strconv.Itoa(testUserID) {
		t.Errorf("event sender = %q, want %d", ev.SenderID, testUserID)
	}
	if len(ev.OptionIDs) != 1 || ev.OptionIDs[0] != operator.OptionReject {
		t.Errorf("event options = %#v, want [%s]", ev.OptionIDs, operator.OptionReject)
	}
	waitFor(t, "the press to be acknowledged", func() bool { return len(bot.Answers()) > 0 })

	// Resolving settles the caption in place — a media message has no text to
	// edit — and clears the controls.
	outcome := operator.Outcome{Status: operator.OutcomeAnswered, Text: "Not yet", OptionIDs: []string{operator.OptionReject}}
	if err := ch.Resolve(ctx, ref, outcome); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}
	edits := bot.CaptionEdits()
	if len(edits) != 1 {
		t.Fatalf("CaptionEdits() = %#v, want exactly one", edits)
	}
	if edits[0].MessageID != messageID {
		t.Errorf("caption edit message id = %d, want %d", edits[0].MessageID, messageID)
	}
	for _, want := range []string{"New board", "Answered", "Not yet", "Reject"} {
		if !strings.Contains(edits[0].Text, want) {
			t.Errorf("resolved caption %q should mention %q", edits[0].Text, want)
		}
	}
	if len(edits[0].ReplyMarkup) != 0 {
		t.Errorf("resolved caption keeps a keyboard: %s", edits[0].ReplyMarkup)
	}
	if textEdits := bot.Edits(); len(textEdits) != 0 {
		t.Errorf("Edits() = %#v, want no editMessageText on a media message", textEdits)
	}

	// A press after the gate is settled changes nothing and says so.
	bot.PushCallback(testUserID, testUserID, messageID, kb.InlineKeyboard[0][0].CallbackData)
	waitFor(t, "the stale press to be acknowledged", func() bool {
		for _, a := range bot.Answers() {
			if a.Text == staleNote {
				return true
			}
		}
		return false
	})
	select {
	case ev, ok := <-events:
		if ok {
			t.Fatalf("stale press produced an event: %#v", ev)
		}
	default:
	}
}

// TestGatedAttachmentAdoptedByAnotherProcess covers the ref's adoptability: the
// process that uploaded the photo is gone, and a later consumer hands the gate
// back through Adopt so the press still routes and the message still settles.
func TestGatedAttachmentAdoptedByAnotherProcess(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()

	sender := newTestChannel(t, bot)
	path := writeFile(t, "board.png", pngBytes)
	ref, err := sender.SendAttachment(context.Background(), operator.Attachment{Path: path, Caption: "New board", Gate: true})
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	messageID, err := strconv.ParseInt(ref.MessageID, 10, 64)
	if err != nil {
		t.Fatalf("ref message id %q is not numeric: %v", ref.MessageID, err)
	}

	// A fresh process: it never delivered the attachment, and learns the gate
	// only through Adopt.
	consumer := newTestChannel(t, bot)
	gate := operator.Question{Text: "Ship this board?", Options: operator.GateOptions()}
	if err := consumer.Adopt(ref, gate); err != nil {
		t.Fatalf("Adopt() error: %v", err)
	}
	if err := consumer.Adopt(ref, gate); err != nil {
		t.Fatalf("Adopt() is not idempotent: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := consumer.Events(ctx)

	bot.PushCallback(testUserID, testUserID, messageID, "o0")
	ev := recvEvent(t, events)
	if ev.Kind != operator.EventOptionPress || ev.Ref != ref {
		t.Fatalf("event = %#v, want an option press on %+v", ev, ref)
	}
	if len(ev.OptionIDs) != 1 || ev.OptionIDs[0] != operator.OptionApprove {
		t.Errorf("event options = %#v, want [%s]", ev.OptionIDs, operator.OptionApprove)
	}

	// The adopting process was never told the message carries media; it settles
	// the caption anyway rather than leaving live buttons on a decided gate.
	if err := consumer.Resolve(ctx, ref, operator.Outcome{Status: operator.OutcomeAnswered, OptionIDs: []string{operator.OptionApprove}}); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}
	edits := bot.CaptionEdits()
	if len(edits) != 1 || edits[0].MessageID != messageID {
		t.Fatalf("CaptionEdits() = %#v, want one edit on %d", edits, messageID)
	}
	if !strings.Contains(edits[0].Text, "Approve") {
		t.Errorf("resolved caption %q should name the chosen option", edits[0].Text)
	}
}

func TestSendAttachmentRejectsMissingFile(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	missing := filepath.Join(t.TempDir(), "nope.png")
	_, err := ch.SendAttachment(context.Background(), operator.Attachment{Path: missing})
	if err == nil {
		t.Fatal("SendAttachment() = nil, want an error for a missing file")
	}
	if !strings.Contains(err.Error(), missing) {
		t.Errorf("error %q should name the missing path", err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("Calls() = %#v, want nothing on the wire for a missing file", calls)
	}
}

func TestSendAttachmentRejectsEmptyPath(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	if _, err := ch.SendAttachment(context.Background(), operator.Attachment{}); err == nil {
		t.Fatal("SendAttachment() = nil, want an error for an empty path")
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("Calls() = %#v, want nothing on the wire", calls)
	}
}

func TestSendAttachmentRejectsDirectory(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	dir := t.TempDir()
	if _, err := ch.SendAttachment(context.Background(), operator.Attachment{Path: dir}); err == nil {
		t.Fatal("SendAttachment() = nil, want an error for a directory")
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("Calls() = %#v, want nothing on the wire", calls)
	}
}

// TestSendAttachmentRejectsOversizeFile checks the client-side limit: Telegram
// caps bot uploads at 50 MB, and finding that out from a 400 after streaming the
// whole file is worse than saying so before the first byte leaves.
func TestSendAttachmentRejectsOversizeFile(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	// Sparse: the file reports an over-limit size without costing the disk.
	path := filepath.Join(t.TempDir(), "huge.bin")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("creating %s: %v", path, err)
	}
	if err := f.Truncate(MaxUploadBytes + 1); err != nil {
		f.Close()
		t.Skipf("cannot create a sparse %d-byte file here: %v", MaxUploadBytes+1, err)
	}
	if err := f.Close(); err != nil {
		t.Fatalf("closing %s: %v", path, err)
	}

	_, err = ch.SendAttachment(context.Background(), operator.Attachment{Path: path})
	if err == nil {
		t.Fatal("SendAttachment() = nil, want an error for an oversize file")
	}
	if !strings.Contains(err.Error(), strconv.Itoa(MaxUploadBytes)) {
		t.Errorf("error %q should state the limit (%d bytes)", err, MaxUploadBytes)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("Calls() = %#v, want nothing on the wire for an oversize file", calls)
	}
}

func TestSendAttachmentAtTheSizeLimitIsSent(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	path := writeFile(t, "small.bin", []byte("just under the wire"))
	if _, err := ch.SendAttachment(context.Background(), operator.Attachment{Path: path}); err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	if got := len(bot.Files()); got != 1 {
		t.Errorf("Files() has %d uploads, want 1", got)
	}
}
