import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BOUNDARY_REPORT_MARKER,
  collectFromGithub,
  githubWorkerCollector,
  needsHuman,
  parseStatus,
  resultFile,
  STATUS_BLOCKED,
  STATUS_DONE,
  STATUS_DONE_WITH_CONCERNS,
  STATUS_NEEDS_CONTEXT,
} from "../src/worker-collect";

/**
 * Per-tick worker collect (tick 0ds): the durable-layer-only verdict, ported
 * from `internal/herd/collect/collect.go` onto GitHub's compare and
 * contents APIs — a worker sandbox pushes and exits, so there is no local
 * worktree left to read the way `tk herd collect` reads one.
 */

const saved: Record<string, unknown> = {};
function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}
afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
    delete saved[name];
  }
});

const API = "https://github.example.test";
const PROJECT = "acme/project";
const BASE = "a".repeat(40);
const BRANCH = "tick/1vn/0ds";

// -------------------------------------------------------------- the stub ---

type StubRoute = {
  compare?: { status: number; body: unknown };
  contents?: { status: number; body: unknown };
};

/** Stands in for GitHub's compare and contents endpoints. */
function stubGithub(route: StubRoute): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(API)) return original(input as RequestInfo, init);
    calls.push(url);
    if (url.includes("/compare/") && route.compare !== undefined) {
      return Response.json(route.compare.body, { status: route.compare.status });
    }
    if (url.includes("/contents/") && route.contents !== undefined) {
      return Response.json(route.contents.body, { status: route.contents.status });
    }
    return new Response("unexpected request in test", { status: 500 });
  }) as typeof fetch;
  return { calls, restore: () => void (globalThis.fetch = original) };
}

/** UTF-8-safe base64, matching how GitHub actually encodes file contents. */
function b64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function compareOK(ahead_by: number, files: string[] = []): { status: number; body: unknown } {
  return {
    status: 200,
    body: { ahead_by, files: files.map((filename) => ({ filename })) },
  };
}

const RESULT_PATH = resultFile("0ds");

beforeEach(() => {
  set("GITHUB_API_BASE_URL", API);
  set("GITHUB_TOKEN", "ghp_repo_scoped");
});

// ---------------------------------------------------------- status parse ---

describe("parseStatus", () => {
  it("finds a plain status line", () => {
    const { status, detail } = parseStatus("Some notes\n\nSTATUS: DONE\n");
    expect(status).toBe(STATUS_DONE);
    expect(detail).toBe("");
  });

  it("never truncates DONE_WITH_CONCERNS to DONE", () => {
    const { status, detail } = parseStatus("STATUS: DONE_WITH_CONCERNS — double-check the seam");
    expect(status).toBe(STATUS_DONE_WITH_CONCERNS);
    expect(detail).toBe("double-check the seam");
  });

  it("strips list/quote/heading decoration around the line", () => {
    const { status } = parseStatus("- **STATUS: BLOCKED**");
    expect(status).toBe(STATUS_BLOCKED);
  });

  it("keeps only the FINAL status line when a report quotes the template's options", () => {
    const body = [
      "A final line, exactly one of:",
      "STATUS: DONE",
      "STATUS: DONE_WITH_CONCERNS — ...",
      "STATUS: NEEDS_CONTEXT — ...",
      "STATUS: BLOCKED — ...",
      "",
      "STATUS: NEEDS_CONTEXT — missing the base sha",
    ].join("\n");
    const { status, detail } = parseStatus(body);
    expect(status).toBe(STATUS_NEEDS_CONTEXT);
    expect(detail).toBe("missing the base sha");
  });

  it("reports nothing for a report with no recognisable status line", () => {
    expect(parseStatus("Implemented the thing.\n")).toEqual({ status: "", detail: "", line: "" });
  });
});

describe("needsHuman", () => {
  it("flags BLOCKED and NEEDS_CONTEXT, not DONE or DONE_WITH_CONCERNS", () => {
    const base = {
      tick_id: "0ds",
      branch: BRANCH,
      base_sha: BASE,
      verdict: "ready-to-merge" as const,
      branch_exists: true,
      commits: 1,
      result_path: RESULT_PATH,
      result_exists: true,
      status_detail: "",
      status_line: "",
      boundary_files: [],
      detail: "",
    };
    expect(needsHuman({ ...base, status: STATUS_BLOCKED })).toBe(true);
    expect(needsHuman({ ...base, status: STATUS_NEEDS_CONTEXT })).toBe(true);
    expect(needsHuman({ ...base, status: STATUS_DONE })).toBe(false);
    expect(needsHuman({ ...base, status: STATUS_DONE_WITH_CONCERNS })).toBe(false);
  });
});

// --------------------------------------------------------------- collect ---

describe("collectFromGithub", () => {
  it("is ready-to-merge: commits beyond base, a DONE report, no boundary files", async () => {
    const github = stubGithub({
      compare: compareOK(3),
      contents: { status: 200, body: { content: b64("work\n\nSTATUS: DONE\n"), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("ready-to-merge");
      expect(report.branch_exists).toBe(true);
      expect(report.commits).toBe(3);
      expect(report.status).toBe(STATUS_DONE);
      expect(report.boundary_files).toEqual([]);
      expect(github.calls[0]).toContain(`/repos/${PROJECT}/compare/${BASE}...${encodeURIComponent(BRANCH)}`);
      expect(github.calls[1]).toContain(`/repos/${PROJECT}/contents/${RESULT_PATH}?ref=`);
    } finally {
      github.restore();
    }
  });

  it("is no-commits when the branch does not exist on origin", async () => {
    const github = stubGithub({ compare: { status: 404, body: { message: "Not Found" } } });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("no-commits");
      expect(report.branch_exists).toBe(false);
      expect(report.detail).toContain(BRANCH);
    } finally {
      github.restore();
    }
  });

  it("is no-commits — never done-with-no-changes — when the branch exists but has nothing beyond base", async () => {
    const github = stubGithub({
      compare: compareOK(0),
      contents: { status: 404, body: { message: "Not Found" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("no-commits");
      expect(report.branch_exists).toBe(true);
      expect(report.commits).toBe(0);
    } finally {
      github.restore();
    }
  });

  it("still reads the result file when there are no commits, so a BLOCKED report without a push is visible", async () => {
    const github = stubGithub({
      compare: compareOK(0),
      contents: { status: 200, body: { content: b64("STATUS: BLOCKED — no gateway credential"), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("no-commits");
      expect(report.status).toBe(STATUS_BLOCKED);
      expect(needsHuman(report)).toBe(true);
    } finally {
      github.restore();
    }
  });

  it("is missing-result when the report file is absent from the branch", async () => {
    const github = stubGithub({
      compare: compareOK(2),
      contents: { status: 404, body: { message: "Not Found" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("missing-result");
      expect(report.result_exists).toBe(false);
    } finally {
      github.restore();
    }
  });

  it("is missing-result when the report exists but carries no recognisable STATUS: line", async () => {
    const github = stubGithub({
      compare: compareOK(2),
      contents: { status: 200, body: { content: b64("Implemented the thing.\n"), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("missing-result");
      expect(report.result_exists).toBe(true);
      expect(report.status).toBe("");
    } finally {
      github.restore();
    }
  });

  it("is boundary-violation when the branch touches .tick/, whatever the report says", async () => {
    const github = stubGithub({
      compare: compareOK(1, ["src/thing.go", ".tick/issues/0ds.json"]),
      contents: { status: 200, body: { content: b64("STATUS: DONE"), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("boundary-violation");
      expect(report.boundary_files).toEqual([".tick/issues/0ds.json"]);
    } finally {
      github.restore();
    }
  });

  // Tick dxk. The container now REFUSES the violation instead of asking the
  // agent not to commit it, which inverts what this collector sees: the branch
  // comes back clean and ready-to-merge for exactly the runs where a model
  // ignored an explicit instruction. Without this, the guard's whole point —
  // that the attempt reaches a human — would end at the report file nobody
  // greps.
  it("surfaces a prevented boundary violation the report declares, on a branch that is otherwise clean", async () => {
    const body = [
      "_ticks-worker: branch `tick/1vn/0ds`, base `aaaa`, harness `omp` exited 0._",
      "",
      `> **${BOUNDARY_REPORT_MARKER}.** This agent tried to write tracker state.`,
      "> - the agent ran `tk close 0ds`",
      "",
      "STATUS: DONE",
    ].join("\n");
    const github = stubGithub({
      compare: compareOK(2, ["src/thing.go"]),
      contents: { status: 200, body: { content: b64(body), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      // The guard worked, so the branch is mergeable and the verdict says so.
      expect(report.verdict).toBe("ready-to-merge");
      expect(report.boundary_files).toEqual([]);
      // And the attempt is still visible.
      expect(report.boundary_attempted).toBe(true);
    } finally {
      github.restore();
    }
  });

  it("does not claim a boundary attempt on a report that never mentions one", async () => {
    const github = stubGithub({
      compare: compareOK(2),
      contents: { status: 200, body: { content: b64("Implemented it.\n\nSTATUS: DONE"), encoding: "base64" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.boundary_attempted).toBe(false);
    } finally {
      github.restore();
    }
  });

  it("reports unknown, not a failing verdict, when the compare API cannot be read", async () => {
    const github = stubGithub({ compare: { status: 503, body: { message: "service unavailable" } } });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("unknown");
      expect(report.detail).toContain("503");
    } finally {
      github.restore();
    }
  });

  it("reports unknown, not missing-result, when the contents API cannot be read", async () => {
    const github = stubGithub({
      compare: compareOK(1),
      contents: { status: 500, body: { message: "internal error" } },
    });
    try {
      const report = await collectFromGithub(env, PROJECT, { tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("unknown");
      expect(report.detail).toContain("500");
    } finally {
      github.restore();
    }
  });
});

describe("githubWorkerCollector", () => {
  it("reads the same verdict collectFromGithub would, through the WorkerCollector seam", async () => {
    const github = stubGithub({
      compare: compareOK(1),
      contents: { status: 200, body: { content: b64("STATUS: DONE"), encoding: "base64" } },
    });
    try {
      const collector = githubWorkerCollector(env, PROJECT);
      const report = await collector.collect({ tick_id: "0ds", branch: BRANCH, base_sha: BASE });
      expect(report.verdict).toBe("ready-to-merge");
    } finally {
      github.restore();
    }
  });
});
