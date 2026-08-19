import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// The factory harness mirrors cloud/worker/test in intent — real workerd,
// bindings read straight from wrangler.toml, so a failure means the deployable
// config is wrong rather than that a mock drifted. It does NOT mirror its
// versions: cloud/worker is on vitest 3 + pool-workers 0.9 (where the pool was
// configured through `test.poolOptions.workers`); this bundle is on vitest 4 +
// pool-workers 0.21, where the pool is a Vite plugin.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
