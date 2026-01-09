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
- list_open: cold 95.62 / warm median 36.07 / warm p95 38.97
- list_label: cold 36.03 / warm median 36.14 / warm p95 42.79
- list_label_any: cold 35.95 / warm median 35.24 / warm p95 37.62
- list_title_contains: cold 34.79 / warm median 36.46 / warm p95 87.09
- list_desc_contains: cold 36.65 / warm median 35.48 / warm p95 46.57
- list_notes_contains: cold 34.51 / warm median 35.69 / warm p95 39.90
- ready: cold 35.91 / warm median 35.98 / warm p95 38.18
- create: cold 16.60 / warm median 15.91 / warm p95 17.63
- update: cold 29.21 / warm median 27.17 / warm p95 29.46
- note: cold 28.20 / warm median 26.72 / warm p95 29.73

## Beads (ms)
- list_open: cold 79.84 / warm median 71.48 / warm p95 85.12
- list_label: cold 68.07 / warm median 68.32 / warm p95 86.25
- list_label_any: cold 68.45 / warm median 67.50 / warm p95 74.87
- list_title_contains: cold 67.39 / warm median 68.14 / warm p95 74.12
- list_desc_contains: cold 76.32 / warm median 69.07 / warm p95 78.81
- list_notes_contains: cold 112.70 / warm median 69.39 / warm p95 79.50
- ready: cold 74.74 / warm median 68.29 / warm p95 72.42
- create: cold 94.59 / warm median 91.65 / warm p95 96.85
- update: cold 67.03 / warm median 67.96 / warm p95 73.15
- note: cold 66.42 / warm median 68.87 / warm p95 81.26

