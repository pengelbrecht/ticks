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
     * On a deployment this is the Durable Object namespace `[[containers]]`
     * binds the Sandbox SDK's own class to; in a test it is the structural seam
     * src/sandbox.ts defines. Both, because the run lifecycle is what needs
     * testing and a lifecycle exercisable only by starting a real container is
     * a lifecycle nobody tests — `sandboxBinding()` is what tells them apart
     * and puts the SDK behind the seam. Optional because a deployment without
     * it is a broken deploy that must say so at the point of use: the Workflow
     * fails the run naming this binding rather than looping on boots that
     * cannot happen.
     */
    SANDBOXES?:
      | import("./sandbox").SandboxBinding
      | import("./sandbox").SandboxNamespace;
    /**
     * The orchestrator image this deployment's container application serves,
     * for a deployment that pushed it into its own registry. Unset means the
     * bundled default (`DEFAULT_SANDBOX_IMAGE`).
     *
     * Load-bearing since tick x3v: a repository that declares
     * `[sandbox].image` boots that image, and this is what "does this
     * deployment serve it?" is answered against. A run whose repository
     * declares something else is refused rather than booted on the base.
     */
    SANDBOX_IMAGE?: string;
    /**
     * The reader the Run Workflow proves a run advanced the epic with: the
     * remote's branch heads, before and after (tick ehy).
     *
     * Unset on a deployment, which reads GitHub directly. It is here for the
     * same reason `SANDBOXES` accepts a structural seam — the finalize rule is
     * what needs testing, and a rule exercisable only by pushing to a real
     * repository is a rule nobody tests.
     */
    REPO_REFS?: import("./progress").RepoRefs;
    /**
     * The reader the Run Workflow resolves a repository's declared sandbox
     * image with: its tracked `.tick/runners.toml` at the submitted SHA
     * (tick x3v).
     *
     * Unset on a deployment, which reads GitHub's contents API directly. A
     * seam for the same reason `REPO_REFS` is one.
     */
    REPO_CONFIG?: import("./repo-config").RepoConfigReader;
    /** Test/deployment override; defaults to api.github.com. */
    GITHUB_API_BASE_URL?: string;
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
    /**
     * Which providers this deployment will route (wrangler `[vars]`), as a
     * comma or whitespace separated list of gateway slugs.
     *
     * Unset — the default — routes `workers-ai` only, because that is the one
     * rung billed to the operator's own Cloudflare account rather than by a
     * vendor in cash. Naming `anthropic`, `openai` or `openrouter` here is the
     * deployment saying it accepts that spend; a configured key is not, and
     * never opens a route on its own. See src/gateway.ts.
     */
    GATEWAY_ALLOWED_PROVIDERS?: string;
    /** Provider key behind the gateway; absent for the Workers AI rung. */
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    /**
     * A Cloudflare API token that can read the gateway's logs (and open an
     * authenticated gateway). It is what makes `runs.cost_usd` ground truth
     * rather than an agent's self-report (D17). A deployment with an explicit
     * cost budget must have this credential; without one, a run can still route
     * and attribute model traffic when no explicit cost budget is configured,
     * recording its cost as unknown. `tk factory setup --cloudflare-api-token`
     * is what supplies it.
     */
    CLOUDFLARE_API_TOKEN?: string;
    /** Test/deployment override; defaults to api.cloudflare.com/client/v4. */
    CLOUDFLARE_API_BASE_URL?: string;
    /**
     * This deployment's own public base URL, written by `tk factory deploy`.
     *
     * A run's sandbox is pointed at `<FACTORY_BASE_URL>/api/gateway` rather
     * than at the AI Gateway itself: the run-scoped token is exchanged for the
     * operator's provider key here, the run/tick metadata is stamped here, and
     * revocation takes effect here. A Worker cannot discover its own hostname
     * outside a request, and the Run Workflow boots sandboxes with no request
     * in hand, so the deploy records it.
     */
    FACTORY_BASE_URL?: string;
    /** Personal Telegram bot and paired operator identity for webhook mode. */
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_USER_ID?: string;
    TELEGRAM_CHAT_ID?: string;
    TELEGRAM_WEBHOOK_SECRET?: string;
    /** Test/deployment override; defaults to api.telegram.org. */
    TELEGRAM_API_BASE_URL?: string;
  }
}
