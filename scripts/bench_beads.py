#!/usr/bin/env python3
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path

RUNS = int(os.environ.get("BENCH_RUNS", "20"))
COUNT = int(os.environ.get("BENCH_COUNT", "1000"))
SEED_COUNT = int(os.environ.get("BENCH_SEED_COUNT", "20"))
SEED_LABEL = "bench-hit"
SEED_LABEL_ALT = "bench-alt"


def run(cmd, cwd=None, env=None):
    return subprocess.check_output(cmd, cwd=cwd, env=env, text=True)


def time_cmd(cmd, cwd=None, env=None, quiet=False):
    start = time.perf_counter()
    stdout = subprocess.DEVNULL if quiet else None
    stderr = subprocess.DEVNULL if quiet else None
    subprocess.check_call(cmd, cwd=cwd, env=env, stdout=stdout, stderr=stderr)
    end = time.perf_counter()
    return (end - start) * 1000.0


def main():
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        run(["git", "init"], cwd=tmp)
        run(["git", "remote", "add", "origin", "https://github.com/example/example.git"], cwd=tmp)

        env = os.environ.copy()
        env["BD_ACTOR"] = "bench"

        time_cmd(["bd", "init"], cwd=tmp, env=env)

        ids = []
        for i in range(COUNT):
            if i < SEED_COUNT:
                label = SEED_LABEL if i < SEED_COUNT // 2 else SEED_LABEL_ALT
                out = run(
                    [
                        "bd",
                        "create",
                        f"Seed {i} {label}",
                        "--description",
                        f"Benchmark seed {i} with context for filtering/search.",
                        "--notes",
                        f"Context note seed {i} keyword: needle",
                        "--labels",
                        label,
                        "--json",
                    ],
                    cwd=tmp,
                    env=env,
                )
            else:
                out = run(
                    ["bd", "create", f"Issue {i}", "--description", "Benchmark issue", "--json"],
                    cwd=tmp,
                    env=env,
                )
            tid = json.loads(out)["id"]
            ids.append(tid)

        # Skip blocker setup due to bd dep instability in some versions.

        results = {
            "tool": "beads",
            "count": COUNT,
            "cold_runs": 1,
            "warm_runs": RUNS,
            "ops": {},
        }

        ops = {
            "list_open": ["bd", "list"],
            "list_label": ["bd", "list", "--label", SEED_LABEL],
            "list_label_any": ["bd", "list", "--label-any", f"{SEED_LABEL},{SEED_LABEL_ALT}"],
            "list_title_contains": ["bd", "list", "--title-contains", "Seed"],
            "list_desc_contains": ["bd", "list", "--desc-contains", "context for filtering"],
            "list_notes_contains": ["bd", "list", "--notes-contains", "needle"],
            "ready": ["bd", "ready"],
            "create": ["bd", "create", "Bench create"],
            "update": ["bd", "update", ids[1], "--status", "in_progress"],
            "note": ["bd", "update", ids[1], "--notes", "Bench note"],
        }

        for name, cmd in ops.items():
            cold = time_cmd(cmd, cwd=tmp, env=env, quiet=True)
            samples = []
            for _ in range(RUNS):
                samples.append(time_cmd(cmd, cwd=tmp, env=env, quiet=True))
            results["ops"][name] = {"cold_ms": cold, "warm_ms": samples}

        out_path = root / "benchmarks" / "beads.json"
        out_path.write_text(json.dumps(results, indent=2))
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
