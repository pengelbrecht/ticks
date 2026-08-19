import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// These prove the wrangler.toml bindings resolve inside workerd, not that a
// mock exists: an R2 round-trip and a real D1 statement.
describe("R2 artifacts binding", () => {
  it("round-trips a run artifact", async () => {
    const key = "runs/demo/run_1/artifacts/n3e/report.md";

    await env.ARTIFACTS.put(key, "STATUS: DONE\n");
    const object = await env.ARTIFACTS.get(key);

    expect(object).not.toBeNull();
    await expect(object!.text()).resolves.toBe("STATUS: DONE\n");
  });

  it("lists artifacts under a run prefix", async () => {
    await env.ARTIFACTS.put("runs/demo/run_2/run.json", "{}");
    await env.ARTIFACTS.put("runs/demo/run_2/artifacts/n3e/prompt.md", "hi");

    const listed = await env.ARTIFACTS.list({ prefix: "runs/demo/run_2/" });

    expect(listed.objects.map((o) => o.key).sort()).toEqual([
      "runs/demo/run_2/artifacts/n3e/prompt.md",
      "runs/demo/run_2/run.json",
    ]);
  });

  it("reports a missing key as null rather than throwing", async () => {
    await expect(env.ARTIFACTS.get("runs/demo/nope")).resolves.toBeNull();
  });
});

describe("D1 binding", () => {
  it("executes a statement", async () => {
    const row = await env.DB.prepare("SELECT 1 AS one").first<{ one: number }>();

    expect(row).toEqual({ one: 1 });
  });

  // The factory's own tables land with the phase that needs them (signals,
  // dispatch log); this only proves DDL + DML reach a real database.
  it("creates and queries a table", async () => {
    await env.DB.exec("CREATE TABLE IF NOT EXISTS smoke (id TEXT PRIMARY KEY)");
    await env.DB.prepare("INSERT OR REPLACE INTO smoke (id) VALUES (?)").bind("n3e").run();

    const row = await env.DB.prepare("SELECT id FROM smoke WHERE id = ?")
      .bind("n3e")
      .first<{ id: string }>();

    expect(row?.id).toBe("n3e");
  });
});
