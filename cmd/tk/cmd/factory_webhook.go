package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/spf13/cobra"
)

// Webhook mode is how the operator channel reaches the Worker: the Bot API
// allows exactly one update consumer per token, and in a cloud deployment that
// consumer is the factory's own front door rather than a local process. This
// command is the operator's control over it — the registration itself is a
// factory route, because the bot token is a Worker secret and the privacy-mode
// check and the deployment's own public URL both live there.

const factoryWebhookPath = "/api/channels/telegram/webhook/registration"

var (
	factoryWebhookDelete bool
	factoryWebhookStatus bool
)

var factoryWebhookCmd = &cobra.Command{
	Use:   "webhook",
	Short: "Register, inspect or withdraw the factory's Telegram webhook",
	Long: `Point Telegram at your factory, so the operator channel is delivered at the
front door instead of long-polled by a local process.

  tk factory webhook            register (or re-register) the webhook
  tk factory webhook --status   report what Telegram believes it is
  tk factory webhook --delete   withdraw it and go back to polling

Registration is done BY the factory, not by this command: the bot token is a
Worker secret, the URL Telegram has to reach is the deployment's own, and the
bot's group privacy mode is checked before anything is registered. Privacy mode
must stay ON — in a group the bot then sees only commands and replies to its own
messages, which is the blast radius this design chose; inline button presses
reach it either way, so gates keep working. A bot with privacy mode off is
refused, and the fix is in @BotFather (/setprivacy -> Enable), not here.

Registering also STOPS every long poll on the same token, including
'tk channel setup telegram' — which is why that command refuses to pair while a
webhook is registered unless you pass --reclaim.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runFactoryWebhook,
}

func init() {
	factoryWebhookCmd.Flags().BoolVar(&factoryWebhookDelete, "delete", false,
		"withdraw the registration and hand the bot's updates back to polling")
	factoryWebhookCmd.Flags().BoolVar(&factoryWebhookStatus, "status", false,
		"report what Telegram believes the webhook is, changing nothing")
	factoryCmd.AddCommand(factoryWebhookCmd)
}

func runFactoryWebhook(cmd *cobra.Command, args []string) error {
	if factoryWebhookDelete && factoryWebhookStatus {
		return NewExitError(ExitUsage, "--delete withdraws the webhook and --status only reads it: pick one")
	}
	client, err := newCloudClient()
	if err != nil {
		return NewExitError(ExitUsage, "%v", err)
	}

	method := http.MethodPost
	switch {
	case factoryWebhookDelete:
		method = http.MethodDelete
	case factoryWebhookStatus:
		method = http.MethodGet
	}

	data, err := client.request(commandContext(cmd), method, factoryWebhookPath, nil)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	var report struct {
		URL                string   `json:"url"`
		AllowedUpdates     []string `json:"allowed_updates"`
		PrivacyMode        bool     `json:"privacy_mode"`
		Secret             bool     `json:"secret"`
		PendingUpdateCount int      `json:"pending_update_count"`
		LastErrorMessage   string   `json:"last_error_message"`
	}
	if err := json.Unmarshal(data, &report); err != nil {
		return NewExitError(ExitGeneric, "the factory's answer could not be read: %v", err)
	}

	out := cmd.OutOrStdout()
	switch {
	case factoryWebhookDelete:
		fmt.Fprintln(out, "Webhook withdrawn. The bot's updates are pollable again.")
	case report.URL == "":
		fmt.Fprintln(out, "No webhook is registered; the bot is in polling mode.")
	default:
		fmt.Fprintf(out, "Webhook: %s\n", report.URL)
		if len(report.AllowedUpdates) > 0 {
			fmt.Fprintf(out, "Updates: %v\n", report.AllowedUpdates)
		}
		if report.PrivacyMode {
			fmt.Fprintln(out, "Privacy mode: on (the bot sees only commands and replies to its own messages)")
		}
		if report.Secret {
			fmt.Fprintln(out, "Secret token: set (Telegram echoes it on every delivery)")
		}
		if report.PendingUpdateCount > 0 {
			fmt.Fprintf(out, "Pending updates: %d\n", report.PendingUpdateCount)
		}
		if report.LastErrorMessage != "" {
			fmt.Fprintf(out, "Last delivery error: %s\n", report.LastErrorMessage)
		}
	}
	return nil
}
