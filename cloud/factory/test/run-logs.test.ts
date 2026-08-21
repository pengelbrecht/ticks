import { env, SELF } from "cloudflare:test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HARNESS_TAIL_MAX_BYTES, readHarnessTail, writeHarnessSegment } from "../src/artifacts";
import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { insertRun } from "../src/db";

/**
 * `tk cloud logs <run>` — what the container printed.
 *
 * The other half of "what happened" lives in AI Gateway and is read by
 * `tk cloud trace`; these two are deliberately separate commands, because a
 * harness that crashed and a model that decided badly are different failures
 * with different evidence.
 *
 * Both are read-only. Neither widens the operator-to-orchestrator command
 * vocabulary D21 fixes at run/stop/status/answer: they observe a run, and
 * nothing here can steer one.
 */

const BASE = "https://factory.example.com";
const PROJECT = "example-org/example-repo";

let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
});

const get = (path: string, headers: Record<string, string> = { Authorization: `Bearer ${token}` }) =>
  SELF.fetch(`${BASE}${path}`, { headers });

async function recordedRun(runID: string): Promise<void> {
  await insertRun(env.DB, {
    run_id: runID,
    project: PROJECT,
    epic: "l4l",
    base_sha: "b".repeat(40),
    requested_by: "operator@example.com",
    state: "running",
    started_at: new Date(0).toISOString(),
    ended_at: null,
    cost_usd: 0,
  });
}

describe("the harness tail reader", () => {
  it("returns the whole stream when it fits, in flush order", async () => {
    const runID = "run_tail_small";
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "first\n");
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 2, "second\n");

    const output = await readHarnessTail(env.ARTIFACTS, PROJECT, runID);
    expect(output.text).toBe("first\nsecond\n");
    expect(output.truncated).toBe(false);
    expect(output.bytes).toBe(output.total_bytes);
  });

  it("keeps the END of an oversized stream and says it did", async () => {
    const runID = "run_tail_big";
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "oldest\n");
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 2, "middle\n");
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 3, "newest\n");

    // A budget that fits one flush: the tail is what a run being debugged is
    // read for, and the boundary falls between flushes rather than mid-line.
    const output = await readHarnessTail(env.ARTIFACTS, PROJECT, runID, 7);
    expect(output.text).toBe("newest\n");
    expect(output.truncated).toBe(true);
    expect(output.total_bytes).toBe(21);
    expect(output.bytes).toBe(7);
  });

  it("reports an empty stream as empty rather than truncated", async () => {
    const output = await readHarnessTail(env.ARTIFACTS, PROJECT, "run_tail_none");
    expect(output).toEqual({ text: "", bytes: 0, total_bytes: 0, truncated: false });
  });
});

describe("GET /api/runs/:id/logs", () => {
  it("serves the run's harness output with the run's own identity", async () => {
    const runID = "run_logs_ok";
    await recordedRun(runID);
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "booting orchestrator\n");

    const res = await get(`/api/runs/${runID}/logs`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      run_id: runID,
      project: PROJECT,
      state: "running",
      text: "booting orchestrator\n",
      bytes: 21,
      total_bytes: 21,
      truncated: false,
    });
  });

  it("is a 404 for a run this factory never recorded", async () => {
    const res = await get("/api/runs/run_missing/logs");
    expect(res.status).toBe(404);
  });

  it("requires the factory bearer token", async () => {
    const res = await SELF.fetch(`${BASE}/api/runs/run_logs_ok/logs`);
    expect(res.status).toBe(401);
  });

  it("is GET only — reading logs is not a way to command a run (D21)", async () => {
    const res = await SELF.fetch(`${BASE}/api/runs/run_logs_ok/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(405);
  });

  it("refuses a max_bytes past the read bound rather than silently clamping", async () => {
    const runID = "run_logs_bound";
    await recordedRun(runID);
    const res = await get(`/api/runs/${runID}/logs?max_bytes=${HARNESS_TAIL_MAX_BYTES + 1}`);
    expect(res.status).toBe(400);
  });
});
