#!/usr/bin/env bash
# Placeholder command for the herdr-ticks [[panes]] entry.
#
# The real mission-control dashboard lands in tick m05. This keeps the pane wiring
# (id/title/placement) live and exercisable in the meantime, and holds the pane open
# so it behaves like the eventual long-running TUI rather than exiting instantly.
set -euo pipefail

printf '\n'
printf '  Ticks mission control\n'
printf '  ---------------------\n'
printf '  The dashboard lands in tick m05.\n'
printf '\n'
printf '  Until then:\n'
printf '    tk board       start the ticks board web UI\n'
printf '    tk list        list ticks in this repo\n'
printf '\n'
printf '  Press Ctrl-C to close this pane.\n'
printf '\n'

# Hold the pane open. `read` with no timeout blocks without burning CPU.
while true; do
  read -r _ || sleep 3600
done
