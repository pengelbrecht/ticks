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
    /** One RunRoom per project: dispatch lease + pending questions. */
    RUN_ROOMS: DurableObjectNamespace<import("./run-room").RunRoom>;
    /** Run artifacts: prompts, events.jsonl, reports, diffs. */
    ARTIFACTS: R2Bucket;
    /** Signals, dispatch log, run index, project enrolment. */
    DB: D1Database;
    /**
     * The Run Workflow (tick ldr) each submission ignites as one instance,
     * keyed by run id. Optional in the type — and absent from wrangler.toml —
     * until that tick binds it: the routes fail closed with a 503 naming the
     * binding rather than recording runs that could never boot. Typed as the
     * structural subset src/runs.ts uses so this bundle compiles either way.
     */
    RUN_WORKFLOW?: import("./runs").RunWorkflowBinding;
    /**
     * How long a queued submission stays ignitable, in ms (D22). A wrangler
     * `[vars]` value, so the window is a deployment decision; bounds and the
     * default live in src/runs.ts.
     */
    RUN_QUEUE_TTL_MS?: string;
    /**
     * Worker secret (not a wrangler.toml binding): the salted PBKDF2 record for
     * the current factory token — `pbkdf2-sha256$<iterations>$<salt>$<key>`.
     * Set with `wrangler secret put FACTORY_TOKEN_HASH`; optional in the type
     * because an un-provisioned deployment must fail closed rather than fail to
     * compile. See src/auth.ts.
     */
    FACTORY_TOKEN_HASH?: string;
    /**
     * Worker secrets set by `tk factory setup`, not wrangler.toml bindings.
     * Each one is optional in the type for the same reason as the hash above:
     * an un-provisioned deployment must fail closed at the point of use, not
     * fail to compile. `tk factory status` re-checks all of them from the
     * operator's local mirror; nothing here is ever readable back out of the
     * Worker. See docs/factory-credentials.md.
     */
    /** Fine-grained, repo-scoped GitHub PAT runs clone and push with. */
    GITHUB_TOKEN?: string;
    /** The operator's AI Gateway base URL — all model traffic goes through it. */
    AI_GATEWAY_BASE_URL?: string;
    /** Provider key behind the gateway; absent for the Workers AI rung. */
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
  }
}
