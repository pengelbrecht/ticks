# Benchmark Plan: beads vs tick

## Goal
Compare beads and tick performance on common workflows with consistent data volume and hardware.

## Dataset
- 100, 500, 1000 ticks/issues.
- Mix: 70% open, 20% in_progress, 10% closed.
- 10% blocked_by references (1-2 blockers).
- Labels: 1-3 per tick, 5 unique labels.
- 10% epics with 3-10 children.

## Operations
1. List all open items
2. List ready items
3. Create a new item
4. Update status (open -> in_progress)
5. Add note

## Measurements
- Median and p95 wall time per operation.
- Cold vs warm runs (cache effects).
- CPU usage if available.

## Method
- Prepare fixtures once per tool.
- Run each operation 20 times per dataset size.
- Report median/p95 and total dataset size.

## Outputs
- `benchmarks/results.json`
- `benchmarks/summary.md`
