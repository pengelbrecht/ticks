# Spike: `pane.graphics` board rendering

*herdr 0.8.0, 2026-08-12 — isolated session probe; raw socket (CLI does not expose the group).*

## Findings

- **API surface**: `pane.graphics.set` (`pane_id`, `format: png|rgb|rgba`, `image_width/height`, `data_base64`, optional `placement {grid_cols, grid_rows, viewport_col, viewport_row}`), plus `clear` and `info`.
- **Gated**: requires `experimental.kitty_graphics = true` in herdr config — otherwise every call returns `feature_disabled`. Probed by starting the isolated server with a scratch `HERDR_CONFIG_PATH`.
- **Set succeeds server-side** with a generated 480×160 PNG (`scripts/experiments/waves-chart.go`, a wave-progress chart in the board palette). `info` then reports `cell_size_unavailable` in a headless session: placement math needs the attached client's cell metrics, and rendering needs a kitty-graphics-capable terminal (Ghostty/kitty/WezTerm; not Terminal.app).

## Verdict

Plausible but double-gated: a graphical board mode (chart panes beside the TUI dashboard) would work only where (a) the user opts into `experimental.kitty_graphics` and (b) the outer terminal speaks kitty graphics. That's a fine *optional* enhancement — e.g. `tk herd dashboard --chart` rendering wave progress as an image — but it can never be the default, and the TUI board must stay fully capable without it. Not worth a tick until someone actually runs with the flag on.

**To see the demo live** (user action, machine-global): add `[experimental] kitty_graphics = true` to `~/.config/herdr/config.toml`, reload (`herdr server reload-config`), then `go run scripts/experiments/waves-chart.go` and a `pane.graphics.set` at any pane — the spike's raw-socket call is in this file's history.
