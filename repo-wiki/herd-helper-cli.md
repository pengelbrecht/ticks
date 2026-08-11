# Herd Helper CLI (`tk herd`, `internal/herd/*`)

Layer 2 of the herdr agent-agnostic orchestrator (design: `docs/design/herdr-orchestrator.md`; conventions: `skills/ticks/references/herdr-runner.md`, which after epic `gyz` presents the helper as the primary mechanism). Built by epic `gyz` on branch `epic/gyz`, stacked on `epic/ias` (PR #37).

## Package map

- `internal/herd/client` — typed unix-socket JSON client, protocol 19 pinned fail-closed. The socket serves one request per connection; only `events.subscribe` streams. Dual event-envelope spellings handled (session-wide/`events.wait` = underscored; the three pane-scoped subscriptions = dotted, no `data.type`); a live drift-guard test fails loudly if herdr changes this. Current-status replay on subscribe is **conditional on a matching `agent_status` filter**. Client validates subscription scoping before dialing (herdr silently ignores unknown fields). `CallTimeout` is a hard ceiling (min with caller deadline).
- `internal/herd/config` — strict `.tick/runners.toml` loader (BurntSushi/toml for complete unknown-key reporting + present-vs-omitted), tier resolution (`roles.R.tiers.T` → `roles.R` → `roles.implement`, args replace never merge), per-kind model/effort→argv compilation with typed `RefusalError` (fail-closed on impossible kind×model cells), six-cell substrate `Decide` with injectable prober.
- `internal/herd/state` — atomic run-state manifests under `.tick/logs/herd/<epic>/<tick>.json` (gitignored local run state; the one path under `.tick/` the helper may write).
- `internal/herd/spawn` — worktree.create → agent.start → **first-round-trip content gate** (echo-anchored classification: silent-drop→re-send once / error-content→fail with excerpt / answered) → real prompt (non-blocking dispatch by default; `tk herd wait` is the fan-in) → manifest + `runner-state:` note line. Session ids captured post-gate.
- `internal/herd/wait` — event-driven fan-in: three filtered subscriptions per worker (idle/done/blocked) so the conditional-replay contract closes the list→subscribe race by construction; reconcile-then-resubscribe once on stream death; no polling.
- `internal/herd/collect` — four artifact-presence verdicts (ready-to-merge / no-commits / missing-result / boundary-violation), parsed worker `STATUS` reported independently (BLOCKED-with-commits is mergeable + escalate line). Never merges.
- `internal/herd/cleanup` — preview-is-the-plan; workspace remove → `branch -d` (never -D) → manifest last; refuses `blocked|working` workers and unmerged branches (liveness deliberately narrowed: interactive CLIs never exit, so "live" alone is not "incomplete"). Restores pre-call focus after `--apply` (removing/closing a workspace moves focus to a neighbour and herdr has no flag to prevent it).
- `internal/herd/reconcile` — five-class crash plan (live-worker / dead-resumable / dead-with-work / stale-no-work / unknown); contradictions outrank (incl. uncountable-branch → unknown, never stale); exact per-kind resume argv under fresh `-r<N>` names; read-only except `--adopt`.

## Live-verified operational facts (epic gyz smoke, herdr 0.8.0)

- Fresh worktree pane isn't a usable shell for ~0.3 s (`agent_pane_busy`) — spawn retries bounded.
- `agent.start` returns `launch_pending`; wait for `interactive_ready`, not status (~3 s).
- `agent_prompt_stalled` is a non-signal: it fires even when the worker answered <1 s. Settle, read the pane, let the gate classify.
- Fire-and-forget dispatch races the fan-in — spawn confirms dispatch by waiting bounded for `working` (non-fatal `DispatchUnconfirmed` warning).
- `worktree.create` against a repo with no open workspace opens TWO workspaces (worktree + implicit source checkout; the response names only one) — cleanup must cover the source workspace.
- Focus: `--no-focus` works on create; workspace remove/close ALWAYS moves focus and never returns it — hence cleanup's focus restore.

## Conventions

Exit codes: every herd command returns explicit `ExitError`; never rely on `GetExitCode` message-substring classification (known misreader; global fix is a decided next-epic tick). Smoke: `bash scripts/verify-herd-helper.sh [--quick]` (also a Closeout Evidence Command in `.tick/config.md`); full mode includes the kill-9 reconcile drill. Field report: `docs/design/herd-helper-smoke-report.md`.
