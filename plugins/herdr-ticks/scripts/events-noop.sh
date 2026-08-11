#!/usr/bin/env bash
# Inert [[events]] handler — the shape template for herdr-ticks event hooks.
#
# Wired to `workspace.renamed` in herdr-plugin.toml purely so the manifest ships a parsed,
# live `events` section. It does nothing. Tick sku owns the real notification wiring and
# should replace this (and the manifest's `on`) rather than invent a different shape.
#
# The invocation context arrives in the environment, same as for actions:
#   HERDR_PLUGIN_CONTEXT_JSON, HERDR_PLUGIN_ROOT, HERDR_PLUGIN_STATE_DIR,
#   HERDR_PLUGIN_CONFIG_DIR, HERDR_SOCKET_PATH, HERDR_BIN_PATH,
#   HERDR_WORKSPACE_ID, HERDR_TAB_ID, HERDR_PANE_ID
# Stdout/stderr and the exit code land in `herdr plugin log list`.
set -euo pipefail

exit 0
