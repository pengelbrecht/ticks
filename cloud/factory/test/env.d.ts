/// <reference types="@cloudflare/vitest-pool-workers/types" />
// `cloudflare:test`'s `env` is typed as `Cloudflare.Env`, declared in
// src/env.d.ts — the test harness sees exactly the worker's bindings.

declare namespace Cloudflare {
  interface Env {
    /** Test-only binding populated by vitest.config.ts from migrations/. */
    TEST_MIGRATIONS: D1Migration[];
  }
}
