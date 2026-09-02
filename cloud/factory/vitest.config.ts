import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// The factory harness mirrors cloud/worker/test in intent — real workerd,
// bindings read straight from wrangler.toml, so a failure means the deployable
// config is wrong rather than that a mock drifted. It does NOT mirror its
// versions: cloud/worker is on vitest 3 + pool-workers 0.9 (where the pool was
// configured through `test.poolOptions.workers`); this bundle is on vitest 4 +
// pool-workers 0.21, where the pool is a Vite plugin.
export default defineConfig(async () => {
  // `import.meta.url` is standard and typed by vite/client, so the config
  // needs no Node type definitions (this bundle does not ship @types/node).
  const migrationsPath = new URL("./migrations", import.meta.url).pathname;
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // The Workers test runtime starts D1 empty. Keep the migration
          // objects in the test runtime so setup can apply the same SQL that
          // `tk factory deploy` applies from this directory.
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      // One test file at a time. The suite runs inside real workerd, and
      // run-workflow.test.ts drives Workflows, Durable Objects and D1 with
      // wall-clock budgets; when other files run beside it on a 2-vCPU CI
      // runner it fails with hung-context cancellations, "evicted mid-commit"
      // and "no such table" — state torn out from under a live test, not code
      // under test. Observed on every CI run of epic 692 (which added ~150
      // tests in new files) while main stayed green; the file alone passes.
      // Serial files cost minutes, not correctness. (Legacy tick 5qj.)
      fileParallelism: false,
    },
  };
});
