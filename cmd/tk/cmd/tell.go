package cmd

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
)

// captionMaxLen caps a --caption client-side, on `tk tell --file` and on
// `tk ask --photo` alike.
//
// Telegram allows 1024 characters on a media caption and the transport does not
// check, so an over-long caption fails as an opaque 400 after the file has
// already gone up the wire. The margin below the real limit is deliberate: a
// gated photo's caption is rewritten on resolution to carry the caption AND the
// verdict, and that rewrite must still fit.
const captionMaxLen = 900

const (
	// tellAsPhoto and tellAsDocument are the --as values: they override the
	// kind an attachment would otherwise resolve to from its extension.
	tellAsPhoto    = "photo"
	tellAsDocument = "document"
)

var tellCmd = &cobra.Command{
	Use:   "tell [text...]",
	Short: "Send a one-way announcement to the operator",
	Long: `Send a plain-text announcement to the configured operator channel.

The only channel today is Telegram. With no text arguments, tell reads the
message from stdin, so a prompt can announce unconditionally with:

  echo "report" | tk tell

Rich announcements:
  --format           read the text as MarkdownLite and send it rendered
  --file <path>      upload a local file instead of a message
  --caption <text>   the text shown with --file (plain text)
  --as photo|document  override how --file is presented (default: by extension)

MarkdownLite is the markup every supported channel can render: **bold**,
_italic_, ` + "`inline code`" + `, ` + "```code block```" + ` and [label](url), and nothing else — text
outside those elements is shown literally. A channel that cannot render markup
gets the message as plain text with the markup stripped, and a note on stderr.

--format and --file are mutually exclusive: one sends a message, the other
sends a file.

Exit codes:
  0  message sent
  2  usage error (an unknown --channel, no text in the arguments or on stdin,
     or --format together with --file)
  4  exit code 4: no channel configured (one explanatory line is printed to stderr)
  other nonzero  the configured channel could not deliver the message

Text is sent as plain text unless --format is given; the channel transport
escapes markup for Telegram. The command does not create or change operator
configuration.`,
	Args:          cobra.ArbitraryArgs,
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runTell,
}

var (
	tellChannel string
	tellFormat  bool
	tellFile    string
	tellCaption string
	tellAs      string
)

func init() {
	tellCmd.Flags().StringVar(&tellChannel, "channel", channelTelegram, "operator channel to use")
	tellCmd.Flags().BoolVar(&tellFormat, "format", false, "read the text as MarkdownLite and send it rendered (plain text if the channel cannot)")
	tellCmd.Flags().StringVar(&tellFile, "file", "", "upload this local file instead of sending a message")
	tellCmd.Flags().StringVar(&tellCaption, "caption", "", "the text shown with --file")
	tellCmd.Flags().StringVar(&tellAs, "as", "", "how to present --file: photo or document (default: by extension)")
	rootCmd.AddCommand(tellCmd)
}

// tellPayload is one announcement, resolved from the command line. Like
// [askOptions] it carries no cobra state, so tests can drive the send directly —
// including against a channel that implements none of the optional capabilities.
type tellPayload struct {
	// Text is the message. Empty on the --file path.
	Text string
	// Format sends Text as MarkdownLite rather than as plain text.
	Format bool
	// File is a local path to upload instead of sending a message.
	File string
	// Caption is the text shown with File.
	Caption string
	// Kind overrides how File is presented; zero resolves by extension.
	Kind operator.AttachmentKind
}

func runTell(cmd *cobra.Command, args []string) error {
	channelName := strings.ToLower(strings.TrimSpace(tellChannel))
	if channelName != channelTelegram {
		return tellError(cmd, NewExitError(ExitUsage,
			"unsupported operator channel %q (the only channel today is %q)", tellChannel, channelTelegram))
	}

	config, err := operator.LoadOperatorConfig()
	if err != nil {
		return tellError(cmd, NewExitError(ExitIO, "loading operator config: %v", err))
	}
	channelConfig, ok := config.Channel(channelName)
	if !ok {
		return tellError(cmd, NewExitError(ExitNotFound, "operator channel %q is not configured", channelName))
	}

	payload, err := tellPayloadFrom(cmd, args)
	if err != nil {
		return tellError(cmd, err)
	}

	channel, err := telegram.NewChannel(channelConfig)
	if err != nil {
		return tellError(cmd, NewExitError(ExitGeneric, "sending via %s: %v", channelName, err))
	}
	if err := tellSend(commandContext(cmd), channel, payload, cmd.ErrOrStderr()); err != nil {
		return tellError(cmd, err)
	}
	return nil
}

// tellPayloadFrom resolves the flags and arguments into one announcement,
// rejecting the combinations that mean two different sends.
func tellPayloadFrom(cmd *cobra.Command, args []string) (tellPayload, error) {
	if tellFormat && tellFile != "" {
		return tellPayload{}, NewExitError(ExitUsage,
			"--format sends a message and --file sends a file: pick one (a file's text is --caption)")
	}
	if len(tellCaption) > captionMaxLen {
		return tellPayload{}, NewExitError(ExitUsage,
			"--caption is %d bytes, over the %d the channel can show with a file",
			len(tellCaption), captionMaxLen)
	}

	if tellFile == "" {
		if tellCaption != "" {
			return tellPayload{}, NewExitError(ExitUsage, "--caption is the text shown with --file: pass a file, or say it as the message")
		}
		if tellAs != "" {
			return tellPayload{}, NewExitError(ExitUsage, "--as says how to present --file: it means nothing without one")
		}
		text, err := tellText(cmd, args)
		if err != nil {
			return tellPayload{}, NewExitError(ExitIO, "reading announcement text: %v", err)
		}
		// An announcement with nothing in it is a scripting mistake — an empty
		// pipeline, a variable that never got set — and the Bot API would reject
		// it anyway. Say so here rather than spending a round trip to be told.
		if strings.TrimSpace(text) == "" {
			return tellPayload{}, NewExitError(ExitUsage,
				"tell needs something to say: tk tell <text...>, or pipe the message in on stdin")
		}
		return tellPayload{Text: text, Format: tellFormat}, nil
	}

	// The file IS the message, so there is no second one to read: text
	// arguments would silently go nowhere, and reading stdin that nobody is
	// writing to would hang.
	if len(args) > 0 {
		return tellPayload{}, NewExitError(ExitUsage,
			"tk tell --file sends the file: put the words with it in --caption, not in the arguments")
	}
	kind, err := tellAttachmentKind()
	if err != nil {
		return tellPayload{}, err
	}
	return tellPayload{File: tellFile, Caption: tellCaption, Kind: kind}, nil
}

// tellAttachmentKind maps --as onto an attachment kind. Empty is
// [operator.KindAuto], which resolves from the file's extension.
func tellAttachmentKind() (operator.AttachmentKind, error) {
	switch strings.ToLower(strings.TrimSpace(tellAs)) {
	case "":
		return operator.KindAuto, nil
	case tellAsPhoto:
		return operator.KindPhoto, nil
	case tellAsDocument:
		return operator.KindDocument, nil
	default:
		return operator.KindAuto, NewExitError(ExitUsage,
			"unknown --as %q (want %s or %s)", tellAs, tellAsPhoto, tellAsDocument)
	}
}

// tellSend delivers the announcement, choosing the send the channel is capable
// of.
//
// Rich sends are OPTIONAL channel capabilities ([operator.SupportsFormatted],
// [operator.SupportsAttachments]), so a channel that lacks one degrades to plain
// [operator.Channel.Send] with a note on stderr rather than failing: the
// announcement reaching the operator in a plainer shape beats it not reaching
// them at all.
func tellSend(ctx context.Context, channel operator.Channel, p tellPayload, stderr io.Writer) error {
	switch {
	case p.File != "":
		return tellSendFile(ctx, channel, p, stderr)
	case p.Format:
		return tellSendFormatted(ctx, channel, p, stderr)
	default:
		if err := channel.Send(ctx, p.Text); err != nil {
			return NewExitError(ExitGeneric, "sending via %s: %v", channelTelegram, err)
		}
		return nil
	}
}

func tellSendFormatted(ctx context.Context, channel operator.Channel, p tellPayload, stderr io.Writer) error {
	if !operator.SupportsFormatted(channel) {
		if stderr != nil {
			fmt.Fprintf(stderr, "warning: the %s channel does not render markup — sending the message as plain text with the markup stripped\n", channelTelegram)
		}
		if err := channel.Send(ctx, operator.StripMarkdownLite(p.Text)); err != nil {
			return NewExitError(ExitGeneric, "sending via %s: %v", channelTelegram, err)
		}
		return nil
	}
	err := channel.(operator.FormattedSender).SendFormatted(ctx, operator.FormattedText{
		Text:   p.Text,
		Format: operator.FormatMarkdownLite,
	})
	if err != nil {
		return NewExitError(ExitGeneric, "sending via %s: %v", channelTelegram, err)
	}
	return nil
}

func tellSendFile(ctx context.Context, channel operator.Channel, p tellPayload, stderr io.Writer) error {
	if !operator.SupportsAttachments(channel) {
		if stderr != nil {
			fmt.Fprintf(stderr, "warning: the %s channel does not upload files — sending a message that names %s instead\n", channelTelegram, p.File)
		}
		if err := channel.Send(ctx, tellFileFallbackText(p)); err != nil {
			return NewExitError(ExitGeneric, "sending via %s: %v", channelTelegram, err)
		}
		return nil
	}
	_, err := channel.(operator.AttachmentSender).SendAttachment(ctx, operator.Attachment{
		Path:    p.File,
		Caption: p.Caption,
		Kind:    p.Kind,
	})
	if err != nil {
		return NewExitError(ExitGeneric, "sending via %s: %v", channelTelegram, err)
	}
	return nil
}

// tellFileFallbackText is what an operator reads when their channel cannot carry
// the file: the caption they would have seen, and where the file actually is.
func tellFileFallbackText(p tellPayload) string {
	if strings.TrimSpace(p.Caption) == "" {
		return "file: " + p.File
	}
	return p.Caption + "\nfile: " + p.File
}

func tellText(cmd *cobra.Command, args []string) (string, error) {
	if len(args) > 0 {
		return strings.Join(args, " "), nil
	}

	data, err := io.ReadAll(cmd.InOrStdin())
	if err != nil {
		return "", err
	}
	return strings.TrimRight(string(data), "\r\n"), nil
}

// tellError keeps the legacy entry point useful: cmd/tk/main.go receives only
// the typed exit code from ExecuteArgs, so the command must emit its own
// actionable error line.
func tellError(cmd *cobra.Command, err error) error {
	fmt.Fprintln(cmd.ErrOrStderr(), err)
	return err
}
