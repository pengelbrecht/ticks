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
     * The Run Workflow each submission ignites as one instance, keyed by run
     * id (`[[workflows]]` in wrangler.toml, class `RunWorkflow`).
     *
     * Still optional in the type, and still read through
     * `runWorkflowBinding()`: a deployment whose Workflow failed to register
     * must fail closed with a 503 naming the binding rather than record runs
     * that could never boot. Typed as the structural subset src/runs.ts uses
     * so a test can substitute a recording fake for it.
     */
    RUN_WORKFLOW?: import("./runs").RunWorkflowBinding;
    /**
     * The orchestrator sandboxes a run boots — one per run in Phase 1, one per
     * tick from Phase 2 (see cloud/sandbox).
     *
     * Declared as the structural seam src/sandbox.ts defines rather than as the
     * Sandbox SDK's own type, for the reason stated there: the run lifecycle is
     * what needs testing, and a lifecycle exercisable only by starting a real
     * container is a lifecycle nobody tests. Optional because a deployment
     * without it is a broken deploy that must say so at the point of use — the
     * Workflow fails the run naming this binding rather than looping on boots
     * that cannot happen.
     */
    SANDBOXES?: import("./sandbox").SandboxBinding;
    /**
     * Budget and cadence vars for the Run Workflow (wrangler `[vars]`), so
     * enforcement is a deployment decision and never a prompt. Bounds and
     * defaults live in src/run-workflow.ts, which ignores an unusable value
     * with a log rather than letting a typo take the factory down.
     */
    RUN_MAX_WALL_CLOCK_MS?: string;
    RUN_MAX_COST_USD?: string;
    RUN_STOP_GRACE_MS?: string;
    RUN_CLOSEOUT_MS?: string;
    /**
     * A fixed observation cadence, overriding the Workflow's own backoff. Unset
     * on a real deployment; set by tests and by an operator who wants a tighter
     * loop than the default 15s→5m ramp.
     */
    RUN_POLL_INTERVAL_MS?: string;
    /**
     * Observations per orchestrator boot. Unset on a real deployment: the
     * default is chosen to keep a long run inside Cloudflare's per-instance
     * step cap, and lowering it makes a run stop cleanly sooner, not fail.
     */
    RUN_MAX_OBSERVATIONS?: string;
    /** Harness kind and model the orchestrator sandbox is started with. */
    RUN_HARNESS?: string;
    RUN_MODEL?: string;
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
    /** Personal Telegram bot and paired operator identity for webhook mode. */
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_USER_ID?: string;
    TELEGRAM_CHAT_ID?: string;
    TELEGRAM_WEBHOOK_SECRET?: string;
    /** Test/deployment override; defaults to api.telegram.org. */
    TELEGRAM_API_BASE_URL?: string;
  }
}
