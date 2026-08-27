import { describe, expect, it } from "vitest";

import {
  DEFAULT_TICK_PRIORITY,
  DEFAULT_TICK_STATUS,
  DEFAULT_TICK_TYPE,
  EXTERNAL_REF_SEPARATOR,
  MAX_COMMIT_ATTEMPTS,
  MAX_TICK_ID_LENGTH,
  MIN_TICK_ID_LENGTH,
  TICK_ID_ALPHABET,
  TICK_ID_ATTEMPTS_PER_LENGTH,
  base64Utf8,
  commitMessage,
  commitTickRecord,
  encodeTickRecord,
  formatExternalRef,
  githubTrackerWriter,
  newTickID,
  parseExternalRef,
  tickIDCandidates,
  trackerWriter,
  type TrackerWriteResult,
  type TrackerWriter,
} from "../src/tracker-write";
import { tickRecordPath } from "../src/tick-membership";

import layout from "../../../contracts/tracker-layout.json";

const PROJECT = "acme/ticks";
const NOW = "2026-08-23T10:00:00.000Z";

const record = (over: Partial<Parameters<typeof encodeTickRecord>[0]> = {}) => ({
  id: "abc",
  title: "a signal became a tick",
  owner: "operator@example.com",
  external_ref: formatExternalRef("telegram", "8412"),
  created_by: "operator@example.com",
  at: NOW,
  ...over,
});

// The write half of the same pin tick-membership.test.ts makes on the read
// half. It is the stricter half: a reader that misunderstands the format says
// "unreadable", a writer that misunderstands it commits a record Go's own
// Store would have refused — into the operator's repository, where the only
// way back out is another commit.
describe("the record this Worker writes is the record Go writes", () => {
  it("mints ids from Go's alphabet and lengths", () => {
    expect(TICK_ID_ALPHABET).toBe(layout.written_by_the_control_plane.id_alphabet);
    expect(MIN_TICK_ID_LENGTH).toBe(layout.written_by_the_control_plane.id_min_length);
    expect(MAX_TICK_ID_LENGTH).toBe(layout.written_by_the_control_plane.id_max_length);
    expect(TICK_ID_ATTEMPTS_PER_LENGTH).toBe(
      layout.written_by_the_control_plane.id_attempts_per_length
    );

    for (const id of tickIDCandidates()) {
      expect(id).toMatch(/^[a-z0-9]{3,4}$/);
    }
    // Go widens to four characters after three attempts at three; so does the
    // candidate list, in that order.
    const candidates = tickIDCandidates();
    expect(candidates.slice(0, 3).every((id) => id.length === 3)).toBe(true);
    expect(candidates.slice(3).every((id) => id.length === 4)).toBe(true);
  });

  it("carries every field Go's Validate insists on, with tk create's defaults", () => {
    const parsed = JSON.parse(encodeTickRecord(record())) as Record<string, unknown>;

    for (const field of layout.written_by_the_control_plane.required_fields) {
      expect(parsed, `a written record must carry ${field}`).toHaveProperty(field);
    }
    expect(parsed.status).toBe(layout.written_by_the_control_plane.default_status);
    expect(parsed.type).toBe(layout.written_by_the_control_plane.default_type);
    expect(parsed.priority).toBe(layout.written_by_the_control_plane.default_priority);
    expect(DEFAULT_TICK_STATUS).toBe(layout.written_by_the_control_plane.default_status);
    expect(DEFAULT_TICK_TYPE).toBe(layout.written_by_the_control_plane.default_type);
    expect(DEFAULT_TICK_PRIORITY).toBe(layout.written_by_the_control_plane.default_priority);
    expect(parsed.created_at).toBe(NOW);
    expect(parsed.updated_at).toBe(NOW);
  });

  it("writes Go's field order and indentation, so an alternating write is a one-line diff", () => {
    const text = encodeTickRecord(record({ description: "why", parent: "hdt", labels: ["signal"] }));

    // json.MarshalIndent(t, "", "  "), no trailing newline.
    expect(text).toBe(JSON.stringify(JSON.parse(text), null, layout.written_by_the_control_plane.json_indent));
    expect(text.endsWith("\n")).toBe(false);
    expect(Object.keys(JSON.parse(text))).toEqual([
      "id",
      "title",
      "description",
      "status",
      "priority",
      "type",
      "owner",
      "labels",
      "parent",
      "external_ref",
      "created_by",
      "created_at",
      "updated_at",
    ]);
  });

  it("omits what Go omits rather than writing empty strings", () => {
    const parsed = JSON.parse(encodeTickRecord(record())) as Record<string, unknown>;

    expect(parsed).not.toHaveProperty("parent");
    expect(parsed).not.toHaveProperty("description");
    expect(parsed).not.toHaveProperty("labels");
    expect(parsed).not.toHaveProperty("acceptance_criteria");
  });
});

describe("the external ref a signal leaves on the record", () => {
  it("carries the whole dedup key, source first", () => {
    expect(EXTERNAL_REF_SEPARATOR).toBe(
      layout.written_by_the_control_plane.external_ref_separator
    );
    expect(formatExternalRef("telegram", "8412")).toBe("telegram:8412");
    expect(parseExternalRef("telegram:8412")).toEqual({ source: "telegram", ref: "8412" });
  });

  it("splits on the first separator only, because refs are often URLs", () => {
    const ref = "https://github.com/acme/ticks/issues/42";

    expect(parseExternalRef(formatExternalRef("github", ref))).toEqual({ source: "github", ref });
  });

  it("refuses a value that is not a source-qualified ref", () => {
    expect(parseExternalRef("8412")).toBeNull();
    expect(parseExternalRef(":8412")).toBeNull();
    expect(parseExternalRef("telegram:")).toBeNull();
    expect(parseExternalRef("Telegram:8412")).toBeNull();
  });
});

describe("base64 of a record", () => {
  // btoa alone throws above U+00FF, and a signal's title is whatever a human
  // typed into Telegram. The first emoji would have taken the funnel down.
  it("encodes UTF-8 rather than latin1", () => {
    const text = encodeTickRecord(record({ title: "ship the 🚀 — naïve, résumé, 日本語" }));

    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(base64Utf8(text)), (c) => c.charCodeAt(0))
    );
    expect(decoded).toBe(text);
    expect(JSON.parse(decoded).title).toContain("🚀");
  });

  it("encodes a record larger than one chunk", () => {
    const text = encodeTickRecord(record({ description: "x".repeat(100_000) }));

    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(base64Utf8(text)), (c) => c.charCodeAt(0))
    );
    expect(decoded).toBe(text);
  });
});

describe("the commit message", () => {
  it("names the tick and the signal it came from", () => {
    const message = commitMessage("abc", "a signal became a tick", "telegram:8412");

    expect(message.split("\n")[0]).toBe("tick abc: a signal became a tick");
    expect(message).toContain("telegram:8412");
    expect(message).toContain(".tick/issues/abc.json");
  });

  it("bounds the subject so git log stays readable", () => {
    const message = commitMessage("abc", "x".repeat(300), "telegram:8412");

    expect(message.split("\n")[0].length).toBeLessThanOrEqual(72);
  });
});

// --------------------------------------------------------- GitHub's answers ---

function respondWith(handler: (request: Request) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const seen: Request[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input as never, init);
    seen.push(request.clone());
    return handler(request);
  }) as typeof fetch;
  return { seen, restore: () => void (globalThis.fetch = original) };
}

const env = (over: Record<string, unknown> = {}) =>
  ({ GITHUB_API_BASE_URL: "https://github.test", GITHUB_TOKEN: "ghp_test", ...over }) as never;

describe("the contents API, asked to create one file", () => {
  it("PUTs base64 content to the record's path and reports the commit", async () => {
    const fetching = respondWith(
      () =>
        new Response(JSON.stringify({ content: { sha: "blob1" }, commit: { sha: "commit1" } }), {
          status: 201,
        })
    );
    try {
      const result = await githubTrackerWriter(env()).create(PROJECT, tickRecordPath("abc"), {
        content: "{}",
        message: "tick abc: x",
        branch: "main",
      });

      expect(result).toEqual({ state: "created", commit_sha: "commit1", content_sha: "blob1" });
      const request = fetching.seen[0];
      expect(request.method).toBe("PUT");
      expect(request.url).toBe("https://github.test/repos/acme/ticks/contents/.tick/issues/abc.json");
      expect(request.headers.get("authorization")).toBe("Bearer ghp_test");
      expect(request.headers.get("user-agent")).toBe("ticks-factory");
      const body = (await request.json()) as Record<string, unknown>;
      expect(body.branch).toBe("main");
      expect(atob(body.content as string)).toBe("{}");
      // The load-bearing absence: `sha` is the only way the contents API can
      // REPLACE a blob, and this writer never sends one. A create that cannot
      // name a version it is replacing cannot lose an update.
      expect(body).not.toHaveProperty("sha");
    } finally {
      fetching.restore();
    }
  });

  it("omits the branch when the signal named none, so the default branch takes it", async () => {
    const fetching = respondWith(
      () => new Response(JSON.stringify({ commit: { sha: "c" } }), { status: 201 })
    );
    try {
      await githubTrackerWriter(env()).create(PROJECT, "p", { content: "{}", message: "m" });

      expect(await fetching.seen[0].json()).not.toHaveProperty("branch");
    } finally {
      fetching.restore();
    }
  });

  it("reads a 409 as the branch moving, not as a failure", async () => {
    const fetching = respondWith(() => new Response("conflict", { status: 409 }));
    try {
      const result = await githubTrackerWriter(env()).create(PROJECT, "p", {
        content: "{}",
        message: "m",
      });

      expect(result.state).toBe("conflict");
    } finally {
      fetching.restore();
    }
  });

  it("reads a 422 as the id being taken", async () => {
    const fetching = respondWith(() => new Response("exists", { status: 422 }));
    try {
      const result = await githubTrackerWriter(env()).create(PROJECT, "p", {
        content: "{}",
        message: "m",
      });

      expect(result.state).toBe("exists");
    } finally {
      fetching.restore();
    }
  });

  it("throws on anything that is not an answer about this write", async () => {
    const fetching = respondWith(() => new Response("boom", { status: 502 }));
    try {
      await expect(
        githubTrackerWriter(env()).create(PROJECT, "p", { content: "{}", message: "m" })
      ).rejects.toThrow(/502/);
    } finally {
      fetching.restore();
    }
  });

  // A 2xx naming no commit would put a tick id in the dedup index for a record
  // that is not in the repository — and the redelivery that could still have
  // filed it is exactly what the index then suppresses.
  it("refuses to call a 2xx with no commit a commit", async () => {
    const fetching = respondWith(() => new Response(JSON.stringify({ content: {} }), { status: 201 }));
    try {
      await expect(
        githubTrackerWriter(env()).create(PROJECT, "p", { content: "{}", message: "m" })
      ).rejects.toThrow(/named no commit/);
    } finally {
      fetching.restore();
    }
  });

  it("is what a deployment gets, and a test's writer is what a test gets", () => {
    const injected: TrackerWriter = { create: async () => ({ state: "conflict", detail: "" }) };

    expect(trackerWriter({ TICK_WRITER: injected } as never)).toBe(injected);
    expect(trackerWriter(env())).not.toBe(injected);
  });
});

// ------------------------------------------------------------- the retries ---

function scriptedWriter(script: (TrackerWriteResult | Error)[]) {
  const paths: string[] = [];
  const writer: TrackerWriter = {
    async create(_project, path) {
      paths.push(path);
      const next = script.shift();
      if (next === undefined) throw new Error("the script ran out");
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return { writer, paths };
}

const created = (sha: string): TrackerWriteResult => ({
  state: "created",
  commit_sha: sha,
  content_sha: "blob",
});

describe("committing one record", () => {
  const options = (over: Record<string, unknown> = {}) => ({
    project: PROJECT,
    candidates: ["aaa", "bbb", "ccc"],
    retryMs: 0,
    record: {
      title: "a signal became a tick",
      owner: "operator@example.com",
      external_ref: "telegram:8412",
      created_by: "operator@example.com",
      at: NOW,
    },
    ...over,
  });

  it("commits the first candidate when the tracker does not hold it", async () => {
    const { writer, paths } = scriptedWriter([created("commit1")]);

    const outcome = await commitTickRecord(writer, options());

    expect(outcome).toEqual({
      state: "committed",
      tick_id: "aaa",
      path: ".tick/issues/aaa.json",
      commit_sha: "commit1",
      attempts: 1,
    });
    expect(paths).toEqual([".tick/issues/aaa.json"]);
  });

  // The id check IS the write, so two Workers racing for one id cannot both
  // believe they won it — the loser is told the path exists and moves on.
  it("takes the next id when the tracker already holds one, without a backoff", async () => {
    const { writer, paths } = scriptedWriter([
      { state: "exists", detail: "taken" },
      created("commit2"),
    ]);

    const outcome = await commitTickRecord(writer, options());

    expect(outcome).toMatchObject({ state: "committed", tick_id: "bbb", attempts: 2 });
    expect(paths).toEqual([".tick/issues/aaa.json", ".tick/issues/bbb.json"]);
  });

  // The tick's own hazard: a cloud run pushing tracker state while a signal is
  // being committed. The ref CAS refuses the write having committed nothing;
  // the SAME id is retried on top of whatever landed.
  it("keeps the id and retries when the branch moved under it", async () => {
    const { writer, paths } = scriptedWriter([
      { state: "conflict", detail: "409" },
      { state: "conflict", detail: "409" },
      created("commit3"),
    ]);

    const outcome = await commitTickRecord(writer, options());

    expect(outcome).toMatchObject({ state: "committed", tick_id: "aaa", attempts: 3 });
    expect(paths).toEqual([
      ".tick/issues/aaa.json",
      ".tick/issues/aaa.json",
      ".tick/issues/aaa.json",
    ]);
  });

  it("retries a read that was not an answer at all, and says which it was", async () => {
    const { writer } = scriptedWriter([new Error("GitHub answered HTTP 502"), created("commit4")]);

    const outcome = await commitTickRecord(writer, options());

    expect(outcome).toMatchObject({ state: "committed", attempts: 2 });
  });

  it("gives an exhausted commit back rather than claiming one", async () => {
    const { writer } = scriptedWriter(
      Array.from({ length: MAX_COMMIT_ATTEMPTS }, () => ({
        state: "conflict" as const,
        detail: "409 the branch keeps moving",
      }))
    );

    const outcome = await commitTickRecord(writer, options());

    expect(outcome.state).toBe("unsettled");
    expect(outcome).toMatchObject({ attempts: MAX_COMMIT_ATTEMPTS });
    if (outcome.state === "unsettled") expect(outcome.detail).toContain("branch conflict");
  });

  it("gives up honestly when every candidate id is taken", async () => {
    const { writer } = scriptedWriter([
      { state: "exists", detail: "taken" },
      { state: "exists", detail: "taken" },
      { state: "exists", detail: "taken" },
    ]);

    const outcome = await commitTickRecord(writer, options());

    expect(outcome.state).toBe("unsettled");
    if (outcome.state === "unsettled") expect(outcome.detail).toContain("every candidate id");
  });

  it("waits longer after each conflict", async () => {
    const slept: number[] = [];
    const { writer } = scriptedWriter([
      { state: "conflict", detail: "409" },
      { state: "conflict", detail: "409" },
      created("commit5"),
    ]);

    await commitTickRecord(writer, options({ retryMs: 10, sleep: async (ms: number) => void slept.push(ms) }));

    expect(slept).toEqual([10, 20]);
  });
});

describe("minting an id", () => {
  it("uses every character of the alphabet and nothing else", () => {
    const alphabet = new Set<string>();
    for (let i = 0; i < 2000; i += 1) for (const c of newTickID(4)) alphabet.add(c);

    expect([...alphabet].sort().join("")).toBe([...TICK_ID_ALPHABET].sort().join(""));
  });

  it("can be forced to collide, which is the case that otherwise goes untested", () => {
    expect(newTickID(3, () => 0)).toBe("aaa");
    expect(newTickID(4, () => 0)).toBe("aaaa");
  });
});
