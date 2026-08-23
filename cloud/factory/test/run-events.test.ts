import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

import type { SpendResult } from "../src/gateway";
import {
  RUN_EVENT_SOURCES,
  boardEventPath,
  epicCompleted,
  epicStarted,
  gatewayMetrics,
  publishRunEvents,
  runEventSink,
  tickCompleted,
  tickStarted,
  type RunEventMessage,
  type RunEventSink,
} from "../src/run-events";
import { MAX_RECENT_EVENTS } from "../src/run-room";

/**
 * `run_event` producers (tick bne).
 *
 * The protocol had no producers at all. These pin what the first honest ones
 * are allowed to say: substrate-shaped sources, a cost that can only have come
 * from AI Gateway telemetry, and a publish path that cannot fail a run.
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

/** A sink that remembers everything and can be told to fail. */
class RecordingSink implements RunEventSink {
  readonly published: { project: string; event: RunEventMessage }[] = [];
  fail: string | null = null;

  async publish(project: string, event: RunEventMessage) {
    if (this.fail !== null) throw new Error(this.fail);
    this.published.push({ project, event });
    return { delivered: true, detail: "ok" };
  }
}

const spent = (cost: number): SpendResult => ({ ok: true, cost_usd: cost, requests: 3 });
const unreadable: SpendResult = {
  ok: false,
  kind: "unavailable",
  detail: "the logs API answered HTTP 502",
};

describe("the sources are the substrate-shaped ones", () => {
  it("declares exactly the schema's RunEventSource enum", () => {
    // Pinned against schemas/websocket/messages.schema.json. Tick zjp retired
    // `ralph`/`swarm` for these; a producer that reintroduced one would put a
    // value on the wire that no schema describes.
    expect([...RUN_EVENT_SOURCES]).toEqual([
      "cloud:orchestrator",
      "cloud:worker",
      "harness",
      "herdr",
      "pi",
    ]);
  });

  it("attributes the run's own events to cloud:orchestrator and a tick's to cloud:worker", () => {
    expect(epicStarted({ epic: "ko8", run_id: "run_1", status: "2 ticks" }).source).toBe(
      "cloud:orchestrator"
    );
    expect(
      epicCompleted({
        epic: "ko8",
        run_id: "run_1",
        state: "completed",
        detail: "done",
        spend: spent(1),
      }).source
    ).toBe("cloud:orchestrator");
    expect(tickStarted({ epic: "ko8", tick: "aaa", batch: 1 }).source).toBe("cloud:worker");
    expect(
      tickCompleted({
        epic: "ko8",
        tick: "aaa",
        verdict: "ready-to-merge",
        status: "DONE",
        detail: "",
      }).source
    ).toBe("cloud:worker");
  });

  it("scopes a tick's event to its own tick and leaves the run's unscoped", () => {
    expect(tickStarted({ epic: "ko8", tick: "aaa", batch: 1 }).taskId).toBe("aaa");
    expect(epicStarted({ epic: "ko8", run_id: "run_1", status: "x" }).taskId).toBeUndefined();
  });
});

describe("costUsd can only come from gateway telemetry", () => {
  it("carries the gateway's number when the read succeeded", () => {
    const message = epicCompleted({
      epic: "ko8",
      run_id: "run_1",
      state: "completed",
      detail: "done",
      spend: spent(4.31),
    });

    expect(message.event.metrics?.costUsd).toBe(4.31);
  });

  it("publishes NO cost when telemetry could not be read, never a zero", () => {
    // An unknown cost and a free run are different facts. A zero here is the
    // same class of lie as a truncated page total reported as a run's spend.
    const message = epicCompleted({
      epic: "ko8",
      run_id: "run_1",
      state: "stopped",
      detail: "stopped",
      spend: unreadable,
      duration_ms: 1_000,
    });

    expect(message.event.metrics?.costUsd).toBeUndefined();
    expect(message.event.metrics?.durationMs).toBe(1_000);
  });

  it("has no metrics at all on a per-tick event, so a worker cannot self-report a cost", () => {
    // The structural half of the rule: `tickCompleted` has no parameter an
    // agent's claimed cost would fit, so a self-report has no door back in.
    const message = tickCompleted({
      epic: "ko8",
      tick: "aaa",
      verdict: "ready-to-merge",
      status: "DONE",
      detail: "ready to merge",
    });

    expect(message.event.metrics).toBeUndefined();
    expect(tickStarted({ epic: "ko8", tick: "aaa", batch: 1 }).event.metrics).toBeUndefined();
  });

  it("yields nothing at all when there is neither a readable cost nor a duration", () => {
    expect(gatewayMetrics(unreadable)).toBeNull();
  });
});

describe("collect is the completion authority, not the report", () => {
  it("calls a tick successful only on ready-to-merge", () => {
    const verdicts = ["ready-to-merge", "no-commits", "missing-result", "boundary-violation", "unknown"];
    const success = verdicts.map(
      (verdict) =>
        tickCompleted({ epic: "ko8", tick: "aaa", verdict, status: "DONE", detail: "" }).event
          .success
    );

    expect(success).toEqual([true, false, false, false, false]);
  });

  it("carries a worker's own STATUS line as text without letting it decide success", () => {
    // A worker that writes STATUS: DONE onto a branch with no commits is the
    // case collect exists to catch. The board shows the claim AND the verdict;
    // only the verdict is `success`.
    const message = tickCompleted({
      epic: "ko8",
      tick: "aaa",
      verdict: "no-commits",
      status: "DONE",
      detail: "the branch has no commits beyond the base",
    });

    expect(message.event.success).toBe(false);
    expect(message.event.status).toBe("no-commits");
    expect(message.event.message).toContain("DONE");
  });
});

describe("publishing is best effort and cannot fail a run", () => {
  it("delivers a batch through the project's RunRoom to the configured sink", async () => {
    const sink = new RecordingSink();
    set("RUN_EVENTS", sink);

    const deliveries = await publishRunEvents(env, "owner/repo-events-ok", [
      epicStarted({ epic: "ko8", run_id: "run_1", status: "2 ticks" }),
      tickStarted({ epic: "ko8", tick: "aaa", batch: 1 }),
    ]);

    expect(deliveries.map((d) => d.delivered)).toEqual([true, true]);
    expect(sink.published.map((p) => p.event.event.type)).toEqual(["epic-started", "task-started"]);
    expect(sink.published[0]!.project).toBe("owner/repo-events-ok");
  });

  it("reports a throwing sink as undelivered rather than raising", async () => {
    const sink = new RecordingSink();
    sink.fail = "the board is down";
    set("RUN_EVENTS", sink);

    const deliveries = await publishRunEvents(env, "owner/repo-events-down", [
      epicStarted({ epic: "ko8", run_id: "run_1", status: "x" }),
    ]);

    expect(deliveries[0]!.delivered).toBe(false);
    expect(deliveries[0]!.detail).toContain("the board is down");
  });

  it("says so plainly when no board is configured at all", async () => {
    set("RUN_EVENTS", undefined);
    set("BOARD_BASE_URL", undefined);
    set("BOARD_TOKEN", undefined);

    const deliveries = await publishRunEvents(env, "owner/repo-events-none", [
      epicStarted({ epic: "ko8", run_id: "run_1", status: "x" }),
    ]);

    expect(deliveries[0]!.delivered).toBe(false);
    expect(deliveries[0]!.detail).toContain("no board is configured");
  });

  it("refuses to forward an event whose source is not substrate-shaped", async () => {
    const sink = new RecordingSink();
    set("RUN_EVENTS", sink);

    const [delivery] = await publishRunEvents(env, "owner/repo-events-bad", [
      { ...epicStarted({ epic: "ko8", run_id: "run_1", status: "x" }), source: "ralph" } as never,
    ]);

    expect(delivery!.delivered).toBe(false);
    expect(delivery!.detail).toContain("ralph");
    expect(sink.published).toHaveLength(0);
  });

  it("does nothing, and asks the room for nothing, on an empty batch", async () => {
    const sink = new RecordingSink();
    set("RUN_EVENTS", sink);

    await expect(publishRunEvents(env, "owner/repo-events-empty", [])).resolves.toEqual([]);
    expect(sink.published).toHaveLength(0);
  });
});

describe("the room keeps a bounded live tail", () => {
  it("shows the forwarded stream newest first on /status", async () => {
    const sink = new RecordingSink();
    set("RUN_EVENTS", sink);
    const project = "owner/repo-events-tail";

    await publishRunEvents(env, project, [
      epicStarted({ epic: "ko8", run_id: "run_1", status: "1 tick", at: "2026-08-21T10:00:00.000Z" }),
      tickStarted({ epic: "ko8", tick: "aaa", batch: 1, at: "2026-08-21T10:00:01.000Z" }),
    ]);

    const room = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    const status = (await (await room.fetch("https://run-room/status")).json()) as {
      recent_events: { type: string; tick: string | null; source: string; delivered: boolean }[];
    };

    expect(status.recent_events.map((e) => e.type)).toEqual(["task-started", "epic-started"]);
    expect(status.recent_events[0]!.tick).toBe("aaa");
    expect(status.recent_events[0]!.source).toBe("cloud:worker");
    expect(status.recent_events.every((e) => e.delivered)).toBe(true);
  });

  it("records an undelivered event too — a live run and a dead board are different facts", async () => {
    const sink = new RecordingSink();
    sink.fail = "the board is down";
    set("RUN_EVENTS", sink);
    const project = "owner/repo-events-tail-down";

    await publishRunEvents(env, project, [
      epicStarted({ epic: "ko8", run_id: "run_1", status: "x" }),
    ]);

    const room = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    const events = await room.recentEvents();

    expect(events).toHaveLength(1);
    expect(events[0]!.delivered).toBe(false);
  });

  it("never grows past the cap, however long the run talks", async () => {
    const sink = new RecordingSink();
    set("RUN_EVENTS", sink);
    const project = "owner/repo-events-cap";

    await publishRunEvents(
      env,
      project,
      Array.from({ length: MAX_RECENT_EVENTS + 20 }, (_, i) =>
        tickStarted({ epic: "ko8", tick: `t${i}`, batch: 1 })
      )
    );

    const room = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    const events = await room.recentEvents();

    expect(events).toHaveLength(MAX_RECENT_EVENTS);
    // The newest survived; the oldest were trimmed.
    expect(events[0]!.tick).toBe(`t${MAX_RECENT_EVENTS + 19}`);
  });
});

describe("the board sink", () => {
  it("is absent unless both the base URL and the token are configured", () => {
    set("RUN_EVENTS", undefined);
    set("BOARD_BASE_URL", "https://board.example.com");
    set("BOARD_TOKEN", undefined);
    expect(runEventSink(env)).toBeNull();

    set("BOARD_TOKEN", "board-token");
    expect(runEventSink(env)).not.toBeNull();
  });

  it("posts to the project's run-events route with the board token", async () => {
    set("RUN_EVENTS", undefined);
    set("BOARD_BASE_URL", "https://board.example.com/");
    set("BOARD_TOKEN", "board-token");

    const seen: { url: string; auth: string | null; body: unknown }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      seen.push({
        url,
        auth: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body ?? "null")),
      });
      return Response.json({ ok: true });
    }) as typeof fetch;

    try {
      const sink = runEventSink(env)!;
      const delivery = await sink.publish(
        "owner/repo",
        epicStarted({ epic: "ko8", run_id: "run_1", status: "x" })
      );

      expect(delivery.delivered).toBe(true);
      expect(seen[0]!.url).toBe(`https://board.example.com${boardEventPath("owner/repo")}`);
      expect(seen[0]!.url).toContain("owner%2Frepo");
      expect(seen[0]!.auth).toBe("Bearer board-token");
      expect(seen[0]!.body).toMatchObject({ type: "run_event", epicId: "ko8" });
    } finally {
      globalThis.fetch = original;
    }
  });

  it("reports a refusing board as undelivered", async () => {
    set("RUN_EVENTS", undefined);
    set("BOARD_BASE_URL", "https://board.example.com");
    set("BOARD_TOKEN", "board-token");

    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ error: "nope" }, { status: 403 })) as typeof fetch;
    try {
      const delivery = await runEventSink(env)!.publish(
        "owner/repo",
        epicStarted({ epic: "ko8", run_id: "run_1", status: "x" })
      );
      expect(delivery).toMatchObject({ delivered: false });
      expect(delivery.detail).toContain("403");
    } finally {
      globalThis.fetch = original;
    }
  });
});
