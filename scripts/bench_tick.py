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

        bin_path = tmp_path / "tk"
        run(["go", "build", "-o", str(bin_path), str(root / "cmd" / "tk")], cwd=str(root))

        env = os.environ.copy()
        env["TICK_OWNER"] = "bench"

        time_cmd([str(bin_path), "init"], cwd=tmp, env=env)

        ids = []
        for i in range(COUNT):
            if i < SEED_COUNT:
                label = SEED_LABEL if i < SEED_COUNT // 2 else SEED_LABEL_ALT
                desc = f"Benchmark seed {i} with context for filtering/search."
                out = run(
                    [
                        str(bin_path),
                        "create",
                        f"Seed {i} {label}",
                        "--description",
                        desc,
                        "--labels",
                        label,
                        "--json",
                    ],
                    cwd=tmp,
                    env=env,
                )
            else:
                out = run([str(bin_path), "create", f"Tick {i}", "--json"], cwd=tmp, env=env)
            tid = json.loads(out)["id"]
            ids.append(tid)
            if i < SEED_COUNT:
                run([str(bin_path), "note", tid, f"Context note seed {i} keyword: needle"], cwd=tmp, env=env)

        for i in range(0, len(ids), 10):
            if i == 0:
                continue
            time_cmd([str(bin_path), "block", ids[i], ids[0]], cwd=tmp, env=env)

        results = {
            "tool": "tick",
            "count": COUNT,
            "cold_runs": 1,
            "warm_runs": RUNS,
            "ops": {},
        }

        ops = {
            "list_open": [str(bin_path), "list", "--json"],
            "list_label": [str(bin_path), "list", "--label", SEED_LABEL, "--all", "--json"],
            "list_label_any": [
                str(bin_path),
                "list",
                "--label-any",
                f"{SEED_LABEL},{SEED_LABEL_ALT}",
                "--all",
                "--json",
            ],
            "list_title_contains": [str(bin_path), "list", "--title-contains", "Seed", "--all", "--json"],
            "list_desc_contains": [
                str(bin_path),
                "list",
                "--desc-contains",
                "context for filtering",
                "--all",
                "--json",
            ],
            "list_notes_contains": [
                str(bin_path),
                "list",
                "--notes-contains",
                "needle",
                "--all",
                "--json",
            ],
            "ready": [str(bin_path), "ready", "--json"],
            "create": [str(bin_path), "create", "Bench create"],
            "update": [str(bin_path), "update", ids[1], "--status", "in_progress"],
            "note": [str(bin_path), "note", ids[1], "Bench note"],
        }

        for name, cmd in ops.items():
            cold = time_cmd(cmd, cwd=tmp, env=env, quiet=True)
            samples = []
            for _ in range(RUNS):
                samples.append(time_cmd(cmd, cwd=tmp, env=env, quiet=True))
            results["ops"][name] = {"cold_ms": cold, "warm_ms": samples}

        out_path = root / "benchmarks" / "tick.json"
        out_path.write_text(json.dumps(results, indent=2))
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
