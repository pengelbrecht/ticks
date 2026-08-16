package cmd

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"html"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
)

// The operator channel is how an autonomous run reaches the human who launched
// it. This command owns the two things a human does with it directly: pair a
// bot with this machine, and ask whether the pairing still works.
//
// The split of state it writes is the whole security model: the credential goes
// only to the global config under the ticks home (0600, never the repo), and
// the repo — if the operator opts in — gets the public identity alone, so a
// checkout can name its operator without carrying a secret (fact A11).

const (
	// channelTelegram is the only channel implemented today. Setup takes the
	// name as an argument anyway so adding one is a new case, not a new command.
	channelTelegram = "telegram"

	// defaultPairTimeout bounds the wait for /start. Long enough to install
	// the app and find the bot, short enough that a forgotten terminal is not
	// left polling forever.
	defaultPairTimeout = 5 * time.Minute

	// pairCodeBytes is the entropy behind the one-time pairing code. Five bytes
	// is eight base32 characters: enough that a stranger who finds the bot
	// cannot guess the code inside the pairing window, short enough to retype.
	pairCodeBytes = 5

	// pairRetryBackoff is the first pause after a transient poll failure while
	// pairing. It doubles, capped at pairMaxBackoff.
	pairRetryBackoff = 2 * time.Second
	pairMaxBackoff   = 15 * time.Second

	// repoTickDir is the repository's tick directory, and repoMappingRel the
	// tracked mapping inside it as it is shown to the operator.
	repoTickDir    = ".tick"
	repoMappingRel = repoTickDir + "/" + operator.MappingFileName
)

var channelCmd = &cobra.Command{
	Use:   "channel",
	Short: "Configure and inspect the operator channel (Telegram)",
	Long: `Manage the messaging channel an autonomous run uses to reach you.

'tk channel setup telegram' pairs your personal bot with this machine: it
verifies the token, prints a one-time pairing code, and waits for you to send
'/start <code>' to the bot. Once paired, the credential is written to the
global operator config in the ticks home directory (0600) — never to the
repository. The repository only ever gets your public identity (bot username
and numeric user id), and only if you say yes when offered.

'tk channel status' reports what is configured, who it is paired with, and
whether the token still works.`,
}

var channelSetupCmd = &cobra.Command{
	Use:   "setup <channel>",
	Short: "Pair a messaging channel with this machine",
	Long: `Pair a channel's bot with this machine.

The only channel today is 'telegram'. Create a bot with @BotFather, then:

  tk channel setup telegram

The token may be given with --token instead of typed at the prompt. Setup
verifies it with getMe, prints a one-time pairing code and a t.me link, and
waits (default 5m) for '/start <code>' to arrive from you. The sender of that
message becomes the bound operator: traffic from anyone else is ignored from
then on.

On success the token, your user id, the chat id and the bot username are
written to the operator config in the ticks home directory with 0600
permissions, a confirmation is sent to the paired chat, and — inside a repo
with a .tick directory — you are offered a tracked, secret-free mapping entry
so this checkout knows which operator you are.`,
	Args: cobra.ExactArgs(1),
	RunE: runChannelSetup,
}

var channelStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show operator channel configuration and pairing state",
	Long: `Report each configured operator channel: bot username, the paired operator's
identity, whether this repository maps a tk operator name onto it, and whether
the token is still accepted.

The token check is a live getMe call; --offline skips it. A rejected token is
always reported, but only --check turns it into a nonzero exit, so a status
call can be made unconditionally in a script. With nothing configured, status
says so and exits 0.`,
	Args: cobra.NoArgs,
	RunE: runChannelStatus,
}

var (
	channelSetupToken   string
	channelSetupAPIBase string
	channelSetupTimeout time.Duration

	channelStatusOffline bool
	channelStatusCheck   bool
	channelStatusAPIBase string
)

func init() {
	channelSetupCmd.Flags().StringVar(&channelSetupToken, "token", "", "bot token (prompted for when omitted)")
	channelSetupCmd.Flags().StringVar(&channelSetupAPIBase, "api-base", "", "override the channel API root (testing)")
	channelSetupCmd.Flags().DurationVar(&channelSetupTimeout, "pair-timeout", defaultPairTimeout, "how long to wait for the pairing message")
	_ = channelSetupCmd.Flags().MarkHidden("api-base")
	_ = channelSetupCmd.Flags().MarkHidden("pair-timeout")

	channelStatusCmd.Flags().BoolVar(&channelStatusOffline, "offline", false, "skip the live token check")
	channelStatusCmd.Flags().BoolVar(&channelStatusCheck, "check", false, "exit nonzero when a configured token is rejected")
	channelStatusCmd.Flags().StringVar(&channelStatusAPIBase, "api-base", "", "override the channel API root (testing)")
	_ = channelStatusCmd.Flags().MarkHidden("api-base")

	channelCmd.AddCommand(channelSetupCmd)
	channelCmd.AddCommand(channelStatusCmd)
	rootCmd.AddCommand(channelCmd)
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

func runChannelSetup(cmd *cobra.Command, args []string) error {
	name := strings.ToLower(strings.TrimSpace(args[0]))
	if name != channelTelegram {
		return NewExitError(ExitUsage, "unknown channel %q — the only channel today is %q", args[0], channelTelegram)
	}
	return setupTelegram(cmd)
}

func setupTelegram(cmd *cobra.Command) error {
	out := cmd.OutOrStdout()
	ctx := commandContext(cmd)

	// One buffered reader for the whole flow: a second bufio.Reader over the
	// same input would lose whatever the first one read ahead into its buffer,
	// so a piped-in "token\ny\n" would answer only the first prompt.
	in := bufio.NewReader(cmd.InOrStdin())

	token := strings.TrimSpace(channelSetupToken)
	if token == "" {
		var err error
		token, err = promptForToken(cmd, in)
		if err != nil {
			return err
		}
	}
	if token == "" {
		return NewExitError(ExitUsage, "a bot token is required — create one with @BotFather, then pass --token or type it at the prompt")
	}

	client, err := telegram.NewClient(telegram.Options{
		Token:   token,
		BaseURL: channelSetupAPIBase,
		// UserID stays zero: pairing is what learns the operator's id, so
		// updates cannot be filtered by it yet.
	})
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	bot, err := client.GetMe(ctx)
	if err != nil {
		return NewExitError(ExitGeneric, "verifying the bot token: %v", err)
	}

	code, err := pairingCode()
	if err != nil {
		return NewExitError(ExitGeneric, "generating a pairing code: %v", err)
	}

	fmt.Fprintf(out, "Bot verified: @%s (%s)\n\n", bot.Username, bot.FirstName)
	fmt.Fprintf(out, "Open this link and press Start, or send the bot the message below:\n")
	fmt.Fprintf(out, "  https://t.me/%s?start=%s\n", bot.Username, code)
	fmt.Fprintf(out, "  /start %s\n\n", code)
	fmt.Fprintf(out, "Pairing code: %s\n", code)
	fmt.Fprintf(out, "Waiting up to %s for the pairing message...\n", channelSetupTimeout)

	msg, err := awaitPairing(ctx, client, code, channelSetupTimeout)
	if err != nil {
		return err
	}

	// Nothing is persisted before this point: a timed-out or cancelled pairing
	// leaves no partial configuration behind.
	cfg, err := operator.LoadOperatorConfig()
	if err != nil {
		return NewExitError(ExitIO, "%v", err)
	}
	cfg.SetChannel(channelTelegram, operator.ChannelConfig{
		Token:       token,
		UserID:      strconv.FormatInt(msg.FromID, 10),
		ChatID:      strconv.FormatInt(msg.ChatID, 10),
		BotUsername: bot.Username,
		APIBase:     channelSetupAPIBase,
	})
	if err := operator.SaveOperatorConfig(cfg); err != nil {
		return NewExitError(ExitIO, "%v", err)
	}

	configPath, err := operator.ConfigPath()
	if err != nil {
		return NewExitError(ExitIO, "%v", err)
	}
	fmt.Fprintf(out, "\nPaired with Telegram user %d in chat %d.\n", msg.FromID, msg.ChatID)
	fmt.Fprintf(out, "Credentials written to %s (0600).\n", configPath)

	// The confirmation proves the binding in the direction that matters — tk
	// can reach the operator — but a send failure does not undo a real pairing,
	// so it is reported and the flow continues.
	if _, err := client.SendMessage(ctx, telegram.OutgoingMessage{
		ChatID: strconv.FormatInt(msg.ChatID, 10),
		Text: fmt.Sprintf("Paired with <b>tk</b> on this machine. Autonomous runs can now reach you here.\n\nBot: @%s",
			html.EscapeString(bot.Username)),
	}); err != nil {
		fmt.Fprintf(cmd.ErrOrStderr(), "warning: pairing succeeded but the confirmation message failed: %v\n", err)
	}

	return offerRepoMapping(cmd, in, bot.Username, msg.FromID)
}

// promptForToken reads the token from the command's input. It is never echoed
// back, never logged, and never written anywhere but the global config.
func promptForToken(cmd *cobra.Command, in *bufio.Reader) (string, error) {
	fmt.Fprint(cmd.OutOrStdout(), "Telegram bot token (from @BotFather): ")
	line, err := readLine(in)
	if err != nil {
		return "", NewExitError(ExitIO, "reading the bot token: %v", err)
	}
	return strings.TrimSpace(line), nil
}

// awaitPairing long-polls until a '/start <code>' message arrives, the deadline
// passes, or the channel dies. Transient failures are retried with backoff:
// a flaky network should not cost the operator the pairing window.
func awaitPairing(ctx context.Context, client *telegram.Client, code string, timeout time.Duration) (*telegram.IncomingMessage, error) {
	deadline := time.Now().Add(timeout)
	backoff := time.Duration(0)

	for {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			return nil, NewExitError(ExitGeneric, "timed out after %s waiting for '/start %s' — nothing was written; run the command again to retry", timeout, code)
		}

		poll := telegram.DefaultPollTimeout
		if remaining < poll {
			poll = remaining
		}
		updates, err := client.GetUpdates(ctx, poll)
		if err != nil {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return nil, NewExitError(ExitGeneric, "pairing cancelled: %v", ctxErr)
			}
			var apiErr *telegram.Error
			if errors.As(err, &apiErr) && apiErr.Fatal() {
				return nil, NewExitError(ExitGeneric, "pairing failed: %v", err)
			}
			backoff = nextPairBackoff(backoff)
			if wait := min(backoff, time.Until(deadline)); wait > 0 {
				timer := time.NewTimer(wait)
				select {
				case <-ctx.Done():
					timer.Stop()
					return nil, NewExitError(ExitGeneric, "pairing cancelled: %v", ctx.Err())
				case <-timer.C:
				}
			}
			continue
		}
		backoff = 0

		for _, update := range updates {
			if update.Message == nil {
				continue
			}
			if matchesStart(update.Message.Text, code) {
				return update.Message, nil
			}
			// Anything else — a wrong code, an unrelated message, a stranger —
			// is ignored, and the flow keeps waiting for the real one.
		}
	}
}

// matchesStart reports whether text is the pairing message for code. It accepts
// the '/start@botname <code>' form Telegram uses in groups.
func matchesStart(text, code string) bool {
	fields := strings.Fields(text)
	if len(fields) != 2 {
		return false
	}
	verb := fields[0]
	if at := strings.Index(verb, "@"); at >= 0 {
		verb = verb[:at]
	}
	return strings.EqualFold(verb, "/start") && fields[1] == code
}

// offerRepoMapping asks whether to record the operator's public identity in the
// repository's tracked mapping, which is what lets a checkout resolve the
// operator behind a tk owner name. Declining is the default, and the offer is
// skipped entirely outside a repo that has a .tick directory.
func offerRepoMapping(cmd *cobra.Command, in *bufio.Reader, botUsername string, userID int64) error {
	out := cmd.OutOrStdout()

	root, err := repoRoot()
	if err != nil {
		return nil
	}
	if _, err := os.Stat(filepath.Join(root, repoTickDir)); err != nil {
		return nil
	}
	name, err := github.DetectOwner(nil)
	if err != nil {
		fmt.Fprintf(cmd.ErrOrStderr(), "note: could not resolve this repo's operator name, skipping the %s entry: %v\n",
			repoMappingRel, err)
		return nil
	}

	fmt.Fprintf(out, "\nRecord operator %q in %s? It is tracked by git and holds no secret — only @%s and user id %d. [y/N] ",
		name, repoMappingRel, botUsername, userID)
	answer, err := readLine(in)
	if err != nil {
		return NewExitError(ExitIO, "reading the response: %v", err)
	}
	if !isYes(answer) {
		fmt.Fprintf(out, "Skipped — run 'tk channel setup telegram' again, or edit %s by hand, to add it later.\n", repoMappingRel)
		return nil
	}

	if err := operator.UpsertOperator(root, name, channelTelegram, operator.OperatorIdentity{
		BotUsername: botUsername,
		UserID:      userID,
	}); err != nil {
		return NewExitError(ExitIO, "writing %s: %v", repoMappingRel, err)
	}
	fmt.Fprintf(out, "Wrote %s (commit it to share the mapping with the team).\n", repoMappingRel)
	return nil
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

func runChannelStatus(cmd *cobra.Command, _ []string) error {
	out := cmd.OutOrStdout()
	ctx := commandContext(cmd)

	cfg, err := operator.LoadOperatorConfig()
	if err != nil {
		return NewExitError(ExitIO, "%v", err)
	}
	configPath, err := operator.ConfigPath()
	if err != nil {
		return NewExitError(ExitIO, "%v", err)
	}

	if len(cfg.Channels) == 0 {
		fmt.Fprintln(out, "No operator channel is configured.")
		fmt.Fprintln(out, "Run 'tk channel setup telegram' to pair your bot.")
		return nil
	}

	names := make([]string, 0, len(cfg.Channels))
	for name := range cfg.Channels {
		names = append(names, name)
	}
	sort.Strings(names)

	fmt.Fprintf(out, "Operator config: %s\n", configPath)

	var dead []string
	for _, name := range names {
		channel := cfg.Channels[name]
		fmt.Fprintf(out, "\n%s\n", name)
		fmt.Fprintf(out, "  bot           %s\n", formatBotUsername(channel.BotUsername))
		fmt.Fprintf(out, "  operator      user %s in chat %s\n", orNone(channel.UserID), orNone(channel.ChatID))
		if channel.APIBase != "" {
			fmt.Fprintf(out, "  api base      %s\n", channel.APIBase)
		}
		fmt.Fprintf(out, "  repo mapping  %s\n", repoMappingState(name, channel))

		switch {
		case channel.Token == "":
			// A channel entry with no credential cannot be used at all, so it
			// counts as dead for --check rather than as an unchecked one.
			fmt.Fprintf(out, "  token         missing — re-run 'tk channel setup %s'\n", name)
			dead = append(dead, name)
		case channelStatusOffline:
			fmt.Fprintf(out, "  token         not checked (--offline)\n")
		case name != channelTelegram:
			fmt.Fprintf(out, "  token         not checked (no live check for %s)\n", name)
		default:
			if info, err := checkTelegramToken(ctx, channel); err != nil {
				fmt.Fprintf(out, "  token         rejected: %v\n", err)
				dead = append(dead, name)
			} else {
				fmt.Fprintf(out, "  token         live (@%s)\n", info.Username)
			}
		}
	}

	if len(dead) > 0 && channelStatusCheck {
		return NewExitError(ExitGeneric, "token rejected for: %s", strings.Join(dead, ", "))
	}
	return nil
}

// checkTelegramToken asks the Bot API whether the stored token still works.
func checkTelegramToken(ctx context.Context, channel operator.ChannelConfig) (telegram.BotInfo, error) {
	base := channel.APIBase
	if channelStatusAPIBase != "" {
		base = channelStatusAPIBase
	}
	client, err := telegram.NewClient(telegram.Options{Token: channel.Token, BaseURL: base})
	if err != nil {
		return telegram.BotInfo{}, err
	}
	return client.GetMe(ctx)
}

// repoMappingState describes whether the current repository names the paired
// identity, which is what 'tk whoami' needs to resolve an operator.
func repoMappingState(channelName string, channel operator.ChannelConfig) string {
	root, err := repoRoot()
	if err != nil {
		return "not in a repository"
	}
	if _, err := os.Stat(operator.MappingPath(root)); os.IsNotExist(err) {
		return fmt.Sprintf("none (%s does not exist)", repoMappingRel)
	}
	mapping, err := operator.LoadMapping(root)
	if err != nil {
		return fmt.Sprintf("unreadable: %v", err)
	}

	var names []string
	for name, byChannel := range mapping.Operators {
		identity, ok := byChannel[channelName]
		if !ok {
			continue
		}
		if channel.UserID != "" && strconv.FormatInt(identity.UserID, 10) != channel.UserID {
			continue
		}
		names = append(names, name)
	}
	if len(names) == 0 {
		return fmt.Sprintf("none (%s has no entry for this identity)", repoMappingRel)
	}
	sort.Strings(names)
	return strings.Join(names, ", ")
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// commandContext returns the command's context, falling back to Background so a
// command invoked without one still runs.
func commandContext(cmd *cobra.Command) context.Context {
	if ctx := cmd.Context(); ctx != nil {
		return ctx
	}
	return context.Background()
}

// pairingCode returns a fresh one-time code. Base32 without padding keeps it to
// the characters Telegram allows in a /start payload and to ones a human can
// read off a terminal and type into a phone.
func pairingCode() (string, error) {
	buf := make([]byte, pairCodeBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf), nil
}

// readLine reads one line, returning it without the newline. A final line with
// no trailing newline is still honoured: EOF is not an error here, an empty
// answer simply means "no".
func readLine(in *bufio.Reader) (string, error) {
	line, err := in.ReadString('\n')
	line = strings.TrimRight(line, "\r\n")
	if errors.Is(err, io.EOF) {
		return line, nil
	}
	return line, err
}

func isYes(answer string) bool {
	switch strings.ToLower(strings.TrimSpace(answer)) {
	case "y", "yes":
		return true
	}
	return false
}

func formatBotUsername(username string) string {
	if username == "" {
		return "(unknown)"
	}
	return "@" + username
}

func orNone(value string) string {
	if value == "" {
		return "(none)"
	}
	return value
}

func nextPairBackoff(current time.Duration) time.Duration {
	if current == 0 {
		return pairRetryBackoff
	}
	if doubled := current * 2; doubled < pairMaxBackoff {
		return doubled
	}
	return pairMaxBackoff
}
