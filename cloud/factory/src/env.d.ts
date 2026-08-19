/**
 * Bindings declared in wrangler.toml.
 *
 * This is the hand-written equivalent of what `wrangler types` generates into
 * `Cloudflare.Env` — kept by hand so the ~15k-line generated runtime types file
 * stays out of the repo, and so the binding list is readable next to the config
 * that declares it. Keep it in sync with wrangler.toml.
 */
declare namespace Cloudflare {
  interface Env {
    /** One RunRoom per active epic run. */
    RUN_ROOMS: DurableObjectNamespace<import("./run-room").RunRoom>;
    /** Run artifacts: prompts, events.jsonl, reports, diffs. */
    ARTIFACTS: R2Bucket;
    /** Signals, dispatch log, run index. */
    DB: D1Database;
  }
}
