/// <reference types="@cloudflare/vitest-pool-workers/types" />
// `cloudflare:test`'s `env` is typed as `Cloudflare.Env`, declared in
// src/env.d.ts — the test harness sees exactly the worker's bindings.

declare namespace Cloudflare {
  interface Env {
    /** Test-only binding populated by vitest.config.ts from migrations/. */
    TEST_MIGRATIONS: D1Migration[];
  }
}

/**
 * Vite's `?raw` suffix, used by `tk-json-manifest.test.ts` to read
 * `cloud/factory/required-tk-commands` — a plain text file, not a module.
 * The factory suite runs inside workerd, which has no filesystem, so a file
 * that is not JSON has to arrive through the bundler or not at all.
 */
declare module "*?raw" {
  const content: string;
  export default content;
}
