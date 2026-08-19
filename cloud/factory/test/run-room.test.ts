import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { RunRoom } from "../src/run-room";

describe("RunRoom durable object", () => {
  it("is registered and addressable by project + epic", async () => {
    const id = env.RUN_ROOMS.idFromName("ticks:63t");
    const stub = env.RUN_ROOMS.get(id);

    const res = await stub.fetch("https://run-room/status");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      object: "RunRoom",
      phase: "placeholder",
      lease: null,
    });
  });

  it("refuses everything else until Phase 1 lands the lease", async () => {
    const stub = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName("ticks:63t"));

    const res = await stub.fetch("https://run-room/lease");

    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toMatchObject({ error: "not_implemented" });
  });

  it("uses SQLite-backed storage (needed by the Phase 1 lease)", async () => {
    const id = env.RUN_ROOMS.idFromName("ticks:sqlite-check");
    const stub = env.RUN_ROOMS.get(id);

    await runInDurableObject(stub, async (_instance: RunRoom, state) => {
      state.storage.sql.exec("CREATE TABLE IF NOT EXISTS probe (k TEXT PRIMARY KEY)");
      state.storage.sql.exec("INSERT OR REPLACE INTO probe (k) VALUES ('lease')");

      const rows = [...state.storage.sql.exec<{ k: string }>("SELECT k FROM probe")];
      expect(rows).toEqual([{ k: "lease" }]);
    });
  });
});
