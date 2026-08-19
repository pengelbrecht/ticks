import { describe, expect, it } from "vitest";

// D16: the factory is self-deployed into the user's own account and ticks.sh
// never operates it. Concretely that means this bundle must never import from
// cloud/worker, and must never declare the ticks.sh worker's routes or assets.
const sources = import.meta.glob("../src/**/*.ts", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

const wranglerToml = (
  import.meta.glob("../wrangler.toml", {
    query: "?raw",
    eager: true,
    import: "default",
  }) as Record<string, string>
)["../wrangler.toml"];

/** Comments explain the separation; only real directives can violate it. */
function stripTomlComments(toml: string): string {
  return toml
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

describe("separation from cloud/worker", () => {
  it("has sources to check", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0);
  });

  it("imports nothing outside cloud/factory", () => {
    for (const [path, source] of Object.entries(sources)) {
      // Covers `import x from "y"`, `import("y")` and `import("y").Type` in
      // the .d.ts, which is where the binding types live.
      const specifiers = [...source.matchAll(/\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
        (m) => m[1]
      );

      for (const specifier of specifiers) {
        expect(specifier, `${path} imports outside cloud/factory`).not.toMatch(/(^|\/)\.\.\//);
        expect(specifier, `${path} imports from cloud/worker`).not.toMatch(/worker\//);
      }
    }
  });

  it("declares its own deployment, not the ticks.sh worker's", () => {
    const directives = stripTomlComments(wranglerToml);

    expect(directives).toContain('name = "ticks-factory"');
    // No ticks.sh custom domains, no tickboard static assets, no shared D1.
    expect(directives).not.toContain("ticks.sh");
    expect(directives).not.toContain("tickboard");
    expect(directives).not.toContain("[assets]");
    expect(directives).not.toContain("[[routes]]");
    expect(directives).not.toMatch(/database_name\s*=\s*"tickboard"/);
  });
});

describe("compatibility date", () => {
  const match = wranglerToml.match(/^compatibility_date\s*=\s*"(\d{4}-\d{2}-\d{2})"/m);

  it("is declared", () => {
    expect(match).not.toBeNull();
  });

  // DO SQLite storage and current WebSocket hibernation ergonomics need a
  // recent date; cloud/worker's 2024-04-03 is too old for both.
  it("is recent, not cloud/worker's 2024-04-03", () => {
    const date = match![1];
    expect(date).not.toBe("2024-04-03");
    expect(Date.parse(date)).toBeGreaterThanOrEqual(Date.parse("2026-01-01"));
  });
});

describe("required bindings are declared for deploy", () => {
  it("binds R2, D1 and the RunRoom durable object", () => {
    expect(wranglerToml).toMatch(/binding\s*=\s*"ARTIFACTS"/);
    expect(wranglerToml).toMatch(/binding\s*=\s*"DB"/);
    expect(wranglerToml).toMatch(/class_name\s*=\s*"RunRoom"/);
    expect(wranglerToml).toMatch(/new_sqlite_classes\s*=\s*\["RunRoom"\]/);
  });
});
