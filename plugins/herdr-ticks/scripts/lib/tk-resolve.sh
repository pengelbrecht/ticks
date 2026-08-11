# tk-resolve.sh — the ONE tk-resolution used by every script in this plugin.
#
# Sourced, never executed. It defines two functions and touches nothing else:
#
#   ticks_resolve_tk       prints the absolute path of a usable tk, or nothing
#   ticks_tk_pin_hint      prints the copy-paste line that pins tk for good
#
# WHY A SHARED FILE
#
# Five scripts needed the same answer and, for a while, four of them had their
# own copy of it — which is exactly how the hooks ended up with the WEAKER
# variant: no `~` expansion, and (the real defect) no fall-through, so a pin
# file naming a path that no longer exists made the hook give up instead of
# trying PATH. A stale pin is the single most likely thing to be wrong on a
# machine that has been upgraded, and it silently disabled painting and
# notifications. One file, one behaviour, no drift.
#
# Sourcing is safe here even though herdr runs plugin commands with cwd = the
# plugin root: the path below is resolved from ${BASH_SOURCE}, i.e. from the
# sourcing script's own location, so it holds wherever the process was started.
#
# WHY THE PIN FILE EXISTS AT ALL
#
# herdr's SERVER does not inherit your interactive shell's PATH. A tk installed
# in ~/.local/bin, or behind an fnm/asdf/mise shim, can be perfectly present in
# your terminal and completely invisible to a plugin command — and an EVENT
# HOOK cannot be handed an env var by anyone, so `--env TK_BIN=…` is not a way
# out for the two hooks. A file in the plugin config dir is the only channel
# that reaches every entry point:
#
#   echo /abs/path/to/tk > "$(herdr plugin config-dir pengelbrecht.herdr-ticks)/tk-bin-path"

# ticks_pinned_tk prints the pinned path, or nothing.
#
# The file is hand-edited, so it is read as hand-edited text: first line only
# (a stray second line is not a second candidate), CR stripped (a file that
# travelled through Windows or a copy-paste from a browser), surrounding
# whitespace trimmed, and a leading `~/` expanded — `~` is shell syntax, and
# nothing expands it inside a file.
#
# Interior spaces are PRESERVED: "/Users/ada/My Tools/tk" is a legal path and
# every caller quotes the result.
ticks_pinned_tk() {
  local file="${HERDR_PLUGIN_CONFIG_DIR:-}/tk-bin-path"
  [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ] && [ -f "$file" ] || return 0
  local line
  line="$(head -n 1 "$file" 2>/dev/null | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  case "$line" in
    "~") printf '%s' "$HOME" ;;
    "~/"*) printf '%s' "$HOME/${line#\~/}" ;;
    *) printf '%s' "$line" ;;
  esac
}

# ticks_resolve_tk prints the first candidate that exists and is executable.
#
# EVERY candidate is tested, in order, and a candidate that fails FALLS THROUGH
# to the next one. That is the whole point: a pin naming a binary that was
# moved, renamed or deleted must degrade to "look elsewhere", never to "no tk".
#
#   1. $TK_BIN / $TK_BIN_PATH   explicit override (how the smoke test drives it)
#   2. the config-dir pin       the only channel that also reaches event hooks
#   3. ../../tk                 a dev checkout's own build — this plugin lives in
#                               a subdirectory of the ticks repo, so a developer
#                               testing a local tk gets it without pinning
#   4. PATH                     works whenever the server did inherit one
#   5. ~/.local/bin, ~/go/bin   the two usual install locations
ticks_resolve_tk() {
  local plugin_root="${HERDR_PLUGIN_ROOT:-$PWD}"
  local candidate
  for candidate in \
    "${TK_BIN:-}" \
    "${TK_BIN_PATH:-}" \
    "$(ticks_pinned_tk)" \
    "$plugin_root/../../tk" \
    "$(command -v tk 2>/dev/null || true)" \
    "$HOME/.local/bin/tk" \
    "$HOME/go/bin/tk"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ] && [ ! -d "$candidate" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

# ticks_tk_pin_hint prints the fix, naming this plugin's real id when herdr
# supplied one.
ticks_tk_pin_hint() {
  echo "herdr's server does not inherit your shell's PATH, so an installed tk can be"
  echo "invisible to a plugin command. Pin it once:"
  echo
  echo "  echo /absolute/path/to/tk > \"\$(herdr plugin config-dir ${HERDR_PLUGIN_ID:-pengelbrecht.herdr-ticks})/tk-bin-path\""
  echo
  echo "If you already pinned one, check that the path still exists — this plugin"
  echo "falls through a stale pin, so 'tk not found' means none of the candidates"
  echo "resolved. Install ticks: https://ticks.sh"
}
