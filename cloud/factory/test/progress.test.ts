import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

import {
  changedBranches,
  compareSnapshots,
  githubRepoRefs,
  MAX_REF_PAGES,
  snapshotRefs,
  type RepoRefs,
} from "../src/progress";

/**
 * The durable-evidence probe: what the remote's refs say happened.
 *
 * These are the unit half of tick ehy. The lifecycle half — that a run whose
 * harness exits 0 with none of this is `stopped` and not `completed` — is in
 * run-workflow.test.ts, driving the real Workflow.
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

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

describe("what counts as the epic moving", () => {
  it("sees a branch that appeared", () => {
    expect(changedBranches({ main: SHA_A }, { main: SHA_A, "epic/ko8": SHA_B })).toEqual([
      "epic/ko8",
    ]);
  });

  it("sees a branch that advanced", () => {
    expect(changedBranches({ main: SHA_A }, { main: SHA_B })).toEqual(["main"]);
  });

  // Merging the epic branch and deleting it is the successful ending. A
  // comparison that only looked forward would read it as a run that did nothing.
  it("sees a branch that was merged and cleaned up", () => {
    expect(changedBranches({ main: SHA_A, "epic/ko8": SHA_B }, { main: SHA_A })).toEqual([
      "epic/ko8",
    ]);
  });

  it("sees nothing when the remote is untouched", () => {
    expect(changedBranches({ main: SHA_A }, { main: SHA_A })).toEqual([]);
  });
});

describe("the verdict two reads support", () => {
  it("calls an unchanged remote no progress, and says so in the operator's words", () => {
    const verdict = compareSnapshots(
      { ok: true, refs: { main: SHA_A } },
      { ok: true, refs: { main: SHA_A } }
    );
    expect(verdict.state).toBe("none");
    expect(verdict.detail).toMatch(/no branch on origin changed/i);
  });

  it("names the branches that moved", () => {
    const verdict = compareSnapshots(
      { ok: true, refs: { main: SHA_A } },
      { ok: true, refs: { main: SHA_A, "epic/ko8": SHA_B } }
    );
    expect(verdict.state).toBe("advanced");
    expect(verdict.detail).toContain("epic/ko8");
  });

  // "Nothing moved" and "nobody could tell" are different facts about a run —
  // the same distinction `cost_source` draws between a zero and an unknown.
  it("refuses to call an unreadable remote either way", () => {
    const before = compareSnapshots(
      { ok: false, detail: "GitHub answered HTTP 503" },
      { ok: true, refs: {} }
    );
    expect(before.state).toBe("unknown");
    expect(before.detail).toContain("503");

    const after = compareSnapshots(
      { ok: true, refs: {} },
      { ok: false, detail: "GitHub answered HTTP 403" }
    );
    expect(after.state).toBe("unknown");
    expect(after.detail).toContain("403");
  });
});

// ------------------------------------------------------------ the reader ---

/** Stands in for GitHub's refs listing, one page at a time. */
function stubGitHub(pages: { ref: string; object: { sha: string } }[][]): {
  urls: string[];
  headers: Record<string, string>[];
  restore: () => void;
} {
  const urls: string[] = [];
  const headers: Record<string, string>[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://github.example.test")) return original(input as RequestInfo, init);
    urls.push(url);
    headers.push((init?.headers ?? {}) as Record<string, string>);
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    return Response.json(pages[page - 1] ?? []);
  }) as typeof fetch;
  return { urls, headers, restore: () => void (globalThis.fetch = original) };
}

describe("reading the remote's heads", () => {
  it("returns branch heads without the refs/heads/ prefix", async () => {
    set("GITHUB_API_BASE_URL", "https://github.example.test");
    set("GITHUB_TOKEN", "ghp_repo_scoped");
    const github = stubGitHub([
      [
        { ref: "refs/heads/main", object: { sha: SHA_A } },
        { ref: "refs/heads/epic/ko8", object: { sha: SHA_B } },
      ],
    ]);

    try {
      await expect(githubRepoRefs(env).list("acme/project")).resolves.toEqual({
        main: SHA_A,
        "epic/ko8": SHA_B,
      });
      expect(github.urls[0]).toContain("/repos/acme/project/git/matching-refs/heads/");
      // GitHub rejects an API request with no user agent outright.
      expect(github.headers[0]!["user-agent"]).toBeTruthy();
      expect(github.headers[0]!.authorization).toBe("Bearer ghp_repo_scoped");
    } finally {
      github.restore();
    }
  });

  // A truncated listing is worse than no listing: the branch that moved could
  // be the one past the cut, and the comparison would answer "none" with
  // confidence it has not earned.
  it("refuses rather than truncating a repository with too many branches", async () => {
    set("GITHUB_API_BASE_URL", "https://github.example.test");
    const full = Array.from({ length: 100 }, (_unused, index) => ({
      ref: `refs/heads/b${index}`,
      object: { sha: SHA_A },
    }));
    const github = stubGitHub(Array.from({ length: MAX_REF_PAGES + 1 }, () => full));

    try {
      const snapshot = await snapshotRefs(env, "acme/project");
      expect(snapshot.ok).toBe(false);
      expect(snapshot.ok === false && snapshot.detail).toContain("branches");
    } finally {
      github.restore();
    }
  });

  it("reports an unreachable remote as unreadable rather than throwing", async () => {
    const failing: RepoRefs = {
      async list(): Promise<Record<string, string>> {
        throw new Error("GitHub answered HTTP 503 for the branch listing");
      },
    };
    set("REPO_REFS", failing);

    const snapshot = await snapshotRefs(env, "acme/project");
    expect(snapshot.ok).toBe(false);
    expect(snapshot.ok === false && snapshot.detail).toContain("503");
  });
});
