# Spike: remote herdr fleet recipe (document-first)

*herdr 0.8.0, 2026-08-12. No live remote run — this is the executable recipe, ready the moment a host is named.*

## What `--remote` actually is

`herdr --remote <ssh-target> [--session <name>]` attaches a local **client** (TUI) to a **remote herdr server** over SSH — the server, its panes, its agents, and its socket all live on the remote machine. It is a viewing/controlling relationship, not a work-shipping one. Consequence: a "remote fleet" means running the *orchestrator on the remote host* (or at least pointing `tk herd`'s socket at the remote server), not beaming local worktrees across.

## The recipe (untested until a host is named)

Remote host requirements: herdr installed + server running (`herdr server` under tmux/launchd, or via a `moshi <dir>` session per the moshi host conventions); repo checkout; `tk` ≥ 0.22.0 (`curl -fsSL https://ticks.sh/install | sh`); worker agent CLIs (`claude`, `codex`) authenticated; herdr integrations installed (`herdr integration install claude codex`) **and their one-time codex startup gates cleared interactively once** (workspace trust + hooks review — see repo-wiki/herd-helper-cli.md).

Two operating modes:
1. **Orchestrator-on-remote (recommended)**: SSH/moshi in, run the epic exactly as locally — everything this repo built works unchanged because it's all socket-local on that machine. Attach the local TUI with `herdr --remote <host>` to watch the fleet + dashboard live.
2. **Local orchestrator, remote fleet (exotic)**: forward the remote socket (`ssh -L /tmp/remote-herdr.sock:$HOME/.config/herdr/herdr.sock <host>`) and point `HERDR_SOCKET_PATH`/`orchestration.socket` at it. `tk herd spawn` would then create worktrees *on the remote* — but `collect`/`cleanup`/manifests assume local filesystem access to worktrees and `.tick/`, so this mode needs real work (remote-aware collect, or a shared filesystem). **Not supported today; documented as the gap.**

## Verdict

Mode 1 is available *now* with zero code: it composes herdr's remote attach with the existing substrate, and pairs naturally with the moshi hosts. Mode 2 is a genuine feature (remote-aware durable layer) — only worth ticking if a concrete multi-machine need appears. Next step when you name a host: run `scripts/verify-herd-helper.sh --quick` there via mode 1 and attach with `--remote` to watch.
