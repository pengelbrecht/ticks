package cmd

import (
	"github.com/spf13/cobra"
)

// herdCmd is the parent of the herd helper subcommands: the layer-2 CLI an
// orchestrator uses to drive a herdr session (spawn a wave, wait for it,
// collect it) without shelling out to the herdr CLI for capabilities it does
// not expose.
var herdCmd = &cobra.Command{
	Use:   "herd",
	Short: "Drive a herdr session: spawn, wait for and collect a wave of agent workers",
	Long: `Helper commands for orchestrating a wave of coding agents in a herdr session.

herdr's own CLI cannot express event-driven fan-in — 'herd wait' talks to the
herdr unix socket directly and blocks on pushed pane.agent_status_changed
events rather than polling.

The orchestration contract these commands implement — dispatch discipline,
wait discipline and the durable result contract that is the real completion
authority — is documented in skills/ticks/references/herdr-runner.md.

The socket is resolved from --socket, then $HERDR_SOCKET_PATH, then
~/.config/herdr/herdr.sock.`,
}

func init() {
	rootCmd.AddCommand(herdCmd)
}
