import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { readFileSync } from "fs";

// Read schema from file
const schema = readFileSync("./schema.sql", "utf-8");

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // Configure test-specific bindings with schema
          d1Databases: {
            DB: schema,
          },
        },
        // Keep isolated storage off. These suites hold WebSocket / Durable
        // Object connections open across the test boundary, which makes the
        // per-test storage rollback assert ("Isolated storage failed" /
        // "Expected .sqlite, got ...sqlite-shm" — see workers-sdk#11031). The
        // Cloudflare docs explicitly recommend shared storage for WebSocket +
        // Durable Object tests.
        isolatedStorage: false,
        // Run every test file serially in one worker. Combined with the
        // single-thread pool below, this stops the two suites from running
        // concurrently against the shared D1 instance, where one suite's
        // reset/reseed would wipe the other's seeded auth tokens mid-run.
        singleWorker: true,
      },
    },
    include: ["test/**/*.test.ts"],
    // Force the runner onto a single worker thread and disable file-level
    // parallelism so the shared-storage suites never interleave.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
