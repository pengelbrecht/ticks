# Benchmark Summary

Dataset size: 1000 items
Cold runs: 1
Warm runs per op: 20

## Method Details

### Tick
- Repo: temp git repo with fake origin.
- Init: `tk init` (TICK_OWNER=bench).
- Data: 1000 ticks. First 20 seeded with labels/notes for filtering; rest minimal.
- Blockers: every 10th tick blocked by the first tick via `tk block`.
- Ops measured:
  - `list_open`: `tk list --json`
  - `list_label`: `tk list --label bench-hit --all --json`
  - `list_label_any`: `tk list --label-any bench-hit,bench-alt --all --json`
  - `list_title_contains`: `tk list --title-contains Seed --all --json`
  - `list_desc_contains`: `tk list --desc-contains "context for filtering" --all --json`
  - `list_notes_contains`: `tk list --notes-contains needle --all --json`
  - `ready`: `tk ready --json` (default limit=10)
  - `create`: `tk create "Bench create"`
  - `update`: `tk update <id> --status in_progress`
  - `note`: `tk note <id> "Bench note"`

### Beads
- Repo: temp git repo with fake origin.
- Init: `bd init` (BD_ACTOR=bench).
- Data: 1000 issues. First 20 seeded with labels/notes for filtering; rest minimal.
- Blockers: skipped (bd dep unstable; see script).
- Ops measured:
  - `list_open`: `bd list`
  - `list_label`: `bd list --label bench-hit`
  - `list_label_any`: `bd list --label-any bench-hit,bench-alt`
  - `list_title_contains`: `bd list --title-contains Seed`
  - `list_desc_contains`: `bd list --desc-contains "context for filtering"`
  - `list_notes_contains`: `bd list --notes-contains needle`
  - `ready`: `bd ready`
  - `create`: `bd create "Bench create"`
  - `update`: `bd update <id> --status in_progress`
  - `note`: `bd update <id> --notes "Bench note"`

## Tick (ms)
- list_open: cold 89.43 / warm median 36.63 / warm p95 41.01
- list_label: cold 35.12 / warm median 35.33 / warm p95 37.96
- list_label_any: cold 34.89 / warm median 34.71 / warm p95 38.82
- list_title_contains: cold 37.15 / warm median 36.40 / warm p95 60.82
- list_desc_contains: cold 33.79 / warm median 35.40 / warm p95 42.55
- list_notes_contains: cold 35.69 / warm median 35.55 / warm p95 37.60
- ready: cold 40.64 / warm median 35.08 / warm p95 39.15
- create: cold 15.75 / warm median 15.49 / warm p95 17.46
- update: cold 27.81 / warm median 26.73 / warm p95 30.16
- note: cold 25.48 / warm median 26.73 / warm p95 28.28

## Beads (ms)
- list_open: cold 76.08 / warm median 72.32 / warm p95 85.18
- list_label: cold 71.75 / warm median 67.10 / warm p95 81.08
- list_label_any: cold 64.28 / warm median 66.78 / warm p95 67.97
- list_title_contains: cold 66.43 / warm median 66.89 / warm p95 71.36
- list_desc_contains: cold 66.17 / warm median 65.76 / warm p95 72.77
- list_notes_contains: cold 66.17 / warm median 65.93 / warm p95 89.45
- ready: cold 82.18 / warm median 68.55 / warm p95 79.61
- create: cold 93.28 / warm median 90.62 / warm p95 121.11
- update: cold 67.45 / warm median 68.17 / warm p95 70.53
- note: cold 65.28 / warm median 67.98 / warm p95 163.25

