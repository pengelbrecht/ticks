# Benchmark Summary

Dataset size: 1000 items
Cold runs: 1
Warm runs per op: 20

## Method Details

### Tick
- Repo: temp git repo with fake origin.
- Init: `tk init` (TICK_OWNER=bench).
- Data: 100 ticks created via `tk create "Tick N" --json`.
- Blockers: every 10th tick blocked by the first tick via `tk block`.
- Ops measured:
  - `list_open`: `tk list --json`
  - `ready`: `tk ready --json` (default limit=10)
  - `create`: `tk create "Bench create"`
  - `update`: `tk update <id> --status in_progress`
  - `note`: `tk note <id> "Bench note"`

### Beads
- Repo: temp git repo with fake origin.
- Init: `bd init` (BD_ACTOR=bench).
- Data: 100 issues via `bd create "Issue N" --description "Benchmark issue" --json`.
- Blockers: skipped (bd dep unstable; see script).
- Ops measured:
  - `list_open`: `bd list`
  - `ready`: `bd ready`
  - `create`: `bd create "Bench create"`
  - `update`: `bd update <id> --status in_progress`
  - `note`: `bd update <id> --notes "Bench note"`

## Tick (ms)
- list_open: cold 82.08 / warm median 32.45 / warm p95 37.60
- ready: cold 31.53 / warm median 31.75 / warm p95 32.59
- create: cold 13.73 / warm median 13.43 / warm p95 13.85
- update: cold 23.09 / warm median 22.69 / warm p95 23.11
- note: cold 21.95 / warm median 22.69 / warm p95 24.23

## Beads (ms)
- list_open: cold 65.76 / warm median 60.32 / warm p95 70.32
- ready: cold 58.67 / warm median 57.68 / warm p95 63.29
- create: cold 74.58 / warm median 75.64 / warm p95 77.51
- update: cold 59.08 / warm median 57.16 / warm p95 70.66
- note: cold 56.90 / warm median 56.66 / warm p95 57.81

