# Benchmark Summary

Dataset size: 100 items
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
- list_open: cold 17.95 / warm median 16.07 / warm p95 17.06
- ready: cold 15.73 / warm median 16.09 / warm p95 18.53
- create: cold 14.08 / warm median 13.86 / warm p95 14.43
- update: cold 23.90 / warm median 23.58 / warm p95 25.23
- note: cold 23.77 / warm median 23.73 / warm p95 25.86

## Beads (ms)
- list_open: cold 64.42 / warm median 59.34 / warm p95 78.87
- ready: cold 58.35 / warm median 58.26 / warm p95 64.12
- create: cold 80.64 / warm median 77.43 / warm p95 80.61
- update: cold 61.04 / warm median 58.06 / warm p95 61.97
- note: cold 58.79 / warm median 57.56 / warm p95 73.80

