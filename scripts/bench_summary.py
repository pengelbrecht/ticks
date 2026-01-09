#!/usr/bin/env python3
import json
import statistics
from pathlib import Path

root = Path(__file__).resolve().parents[1]

beads = json.loads((root / "benchmarks" / "beads.json").read_text())
tick = json.loads((root / "benchmarks" / "tick.json").read_text())


def summarize(data):
    summary = {}
    for op, payload in data["ops"].items():
        warm = payload["warm_ms"]
        med = statistics.median(warm)
        p95 = statistics.quantiles(warm, n=20)[-1]
        summary[op] = (payload["cold_ms"], med, p95)
    return summary

beads_summary = summarize(beads)
tick_summary = summarize(tick)

lines = []
lines.append("# Benchmark Summary")
lines.append("")
lines.append(f"Dataset size: {tick['count']} items")
lines.append(f"Cold runs: {tick['cold_runs']}")
lines.append(f"Warm runs per op: {tick['warm_runs']}")
lines.append("")
lines.append("## Method Details")
lines.append("")
lines.append("### Tick")
lines.append("- Repo: temp git repo with fake origin.")
lines.append("- Init: `tk init` (TICK_OWNER=bench).")
lines.append("- Data: 100 ticks created via `tk create \"Tick N\" --json`.")
lines.append("- Blockers: every 10th tick blocked by the first tick via `tk block`.")
lines.append("- Ops measured:")
lines.append("  - `list_open`: `tk list --json`")
lines.append("  - `ready`: `tk ready --json` (default limit=10)")
lines.append("  - `create`: `tk create \"Bench create\"`")
lines.append("  - `update`: `tk update <id> --status in_progress`")
lines.append("  - `note`: `tk note <id> \"Bench note\"`")
lines.append("")
lines.append("### Beads")
lines.append("- Repo: temp git repo with fake origin.")
lines.append("- Init: `bd init` (BD_ACTOR=bench).")
lines.append("- Data: 100 issues via `bd create \"Issue N\" --description \"Benchmark issue\" --json`.")
lines.append("- Blockers: skipped (bd dep unstable; see script).")
lines.append("- Ops measured:")
lines.append("  - `list_open`: `bd list`")
lines.append("  - `ready`: `bd ready`")
lines.append("  - `create`: `bd create \"Bench create\"`")
lines.append("  - `update`: `bd update <id> --status in_progress`")
lines.append("  - `note`: `bd update <id> --notes \"Bench note\"`")
lines.append("")
lines.append("## Tick (ms)")
for op, (cold, med, p95) in tick_summary.items():
    lines.append(f"- {op}: cold {cold:.2f} / warm median {med:.2f} / warm p95 {p95:.2f}")
lines.append("")
lines.append("## Beads (ms)")
for op, (cold, med, p95) in beads_summary.items():
    lines.append(f"- {op}: cold {cold:.2f} / warm median {med:.2f} / warm p95 {p95:.2f}")
lines.append("")

(root / "benchmarks" / "summary.md").write_text("\n".join(lines) + "\n")
