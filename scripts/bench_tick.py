#!/usr/bin/env python3
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path

RUNS = int(os.environ.get("BENCH_RUNS", "20"))
COUNT = int(os.environ.get("BENCH_COUNT", "100"))


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
            out = run([str(bin_path), "create", f"Tick {i}", "--json"], cwd=tmp, env=env)
            tid = json.loads(out)["id"]
            ids.append(tid)

        for i in range(0, len(ids), 10):
            if i == 0:
                continue
            time_cmd([str(bin_path), "block", ids[i], ids[0]], cwd=tmp, env=env)

        results = {"tool": "tick", "count": COUNT, "runs": RUNS, "ops": {}}

        ops = {
            "list_open": [str(bin_path), "list", "--json"],
            "ready": [str(bin_path), "ready", "--json"],
            "create": [str(bin_path), "create", "Bench create"],
            "update": [str(bin_path), "update", ids[1], "--status", "in_progress"],
            "note": [str(bin_path), "note", ids[1], "Bench note"],
        }

        for name, cmd in ops.items():
            samples = []
            for _ in range(RUNS):
            samples.append(time_cmd(cmd, cwd=tmp, env=env, quiet=True))
        results["ops"][name] = samples

        out_path = root / "benchmarks" / "tick.json"
        out_path.write_text(json.dumps(results, indent=2))
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
