package cmd

import (
	"fmt"
	"io"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
)

var tellCmd = &cobra.Command{
	Use:   "tell [text...]",
	Short: "Send a one-way announcement to the operator",
	Long: `Send a plain-text announcement to the configured operator channel.

The only channel today is Telegram. With no text arguments, tell reads the
message from stdin, so a prompt can announce unconditionally with:

  echo "report" | tk tell

Exit codes:
  0  message sent
  2  usage error (an unknown --channel, or no text in the arguments or on stdin)
  4  exit code 4: no channel configured (one explanatory line is printed to stderr)
  other nonzero  the configured channel could not deliver the message

Text is sent as plain text; the channel transport escapes markup for Telegram.
The command does not create or change operator configuration.`,
	Args:          cobra.ArbitraryArgs,
	SilenceErrors: true,
	SilenceUsage:  true,
	RunE:          runTell,
}

var tellChannel string

func init() {
	tellCmd.Flags().StringVar(&tellChannel, "channel", channelTelegram, "operator channel to use")
	rootCmd.AddCommand(tellCmd)
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

	text, err := tellText(cmd, args)
	if err != nil {
		return tellError(cmd, NewExitError(ExitIO, "reading announcement text: %v", err))
	}
	// An announcement with nothing in it is a scripting mistake — an empty
	// pipeline, a variable that never got set — and the Bot API would reject it
	// anyway. Say so here rather than spending a round trip to be told.
	if strings.TrimSpace(text) == "" {
		return tellError(cmd, NewExitError(ExitUsage,
			"tell needs something to say: tk tell <text...>, or pipe the message in on stdin"))
	}

	channel, err := telegram.NewChannel(channelConfig)
	if err != nil {
		return tellError(cmd, NewExitError(ExitGeneric, "sending via %s: %v", channelName, err))
	}
	if err := channel.Send(commandContext(cmd), text); err != nil {
		return tellError(cmd, NewExitError(ExitGeneric, "sending via %s: %v", channelName, err))
	}
	return nil
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
