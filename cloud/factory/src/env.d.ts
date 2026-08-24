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
    /**
     * One SignalInbox per project: the funnel a signal becomes a tick through
     * (tick 8sm). It serialises this control plane's writes to a project's
     * `.tick/` and dedups redeliveries on `(source, external_ref)`.
     */
    SIGNAL_INBOXES: DurableObjectNamespace<import("./signal-inbox").SignalInbox>;
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
    /**
     * The reader a cloud wave's per-tick verdicts are collected with: the
     * durable git layer, never a worker sandbox's terminal output (tick b6e,
     * `worker-collect.ts`).
     *
     * Unset on a deployment, which reads GitHub's compare and contents APIs
     * directly. A seam for the same reason `REPO_CONFIG` is one.
     */
    WORKER_COLLECTOR?: import("./worker-collect").WorkerCollector;
    /**
     * The reader `POST /api/wave` proves a requested wave's ticks belong to
     * the run's epic with: their tracked `.tick/issues/<id>.json` records at
     * the commit the wave's containers will clone (tick kya).
     *
     * Unset on a deployment, which reads GitHub's contents API directly. A
     * seam for the same reason `REPO_CONFIG` is one.
     */
    TICK_TRACKER?: import("./tick-membership").TrackerReader;
    /**
     * The reader GitHub issue ingestion re-checks consent with at delivery
     * time: the labels the issue carries NOW, not the ones its webhook payload
     * photographed (tick t2x).
     *
     * Unset on a deployment, which reads GitHub's issue-labels API directly. A
     * seam for the same reason `TICK_TRACKER` is one — and the only way the
     * rule worth testing here is exercisable at all: a delivery that arrives
     * after the label was removed cannot be staged against real GitHub.
     */
    ISSUE_LABELS?: import("./github-issues").IssueLabelReader;
    /**
     * The one GitHub write this factory makes on a run's behalf: the review
     * comment a read-only PR review run hands in (tick v7g).
     *
     * Unset on a deployment, which posts through GitHub's issue-comments API
     * with the operator's token. A seam for the same reason `ISSUE_LABELS` is
     * one — at-most-once posting, the scoping to the run's own pull request,
     * and the anti-forgery invariant on what is sent are not exercisable
     * against real GitHub.
     */
    REVIEW_COMMENTER?: import("./pr-review").ReviewCommenter;
    /**
     * The writer the SignalInbox commits a signal's tick record with: one
     * CREATE of `.tick/issues/<id>.json` through GitHub's contents API (tick
     * 8sm).
     *
     * Unset on a deployment, which writes to GitHub directly. A seam for the
     * same reason `TICK_TRACKER` is one — and the only way the rules worth
     * testing here (ordering under concurrency, dedup on redelivery, retry
     * against a run pushing tracker state) are exercisable at all.
     */
    TICK_WRITER?: import("./tracker-write").TrackerWriter;
    /**
     * What the CI-failure flake gate asks GitHub: a check's conclusions on a
     * ref, and a request to run it again (tick meo).
     *
     * Unset on a deployment, which reads GitHub's check-runs API directly. A
     * seam for the same reason `ISSUE_LABELS` is one — the cases the gate
     * exists for are exactly the ones real GitHub cannot be made to stage: a
     * check that passed once and failed once on identical code, a base branch
     * already red, a re-run GitHub declines.
     */
    CHECK_HISTORY?: import("./ci-remediation").CheckHistoryReader;
    /**
     * Where the RunRoom forwards a run's `run_event` stream (tick bne).
     *
     * Unset on a deployment that reports to a board, which posts to
     * `BOARD_BASE_URL` directly. A seam for the same reason
     * `WORKER_COLLECTOR` is one — and the one that lets a test prove the
     * load-bearing claim: a run whose every event is dropped still completes
     * and still collects.
     */
    RUN_EVENTS?: import("./run-events").RunEventSink;
    /**
     * The ticks.sh board (or a self-hosted one) this factory reports a live
     * run to, and the board token it authenticates with (tick bne).
     *
     * BOTH are optional and neither is a dependency: a factory is
     * self-deployed into the operator's own account (D16) and runs identically
     * with no board at all. Absent, run events are recorded on the RunRoom's
     * own tail and go nowhere else — the stream is observability, so losing it
     * costs the run nothing. `BOARD_BASE_URL` is a wrangler `[vars]` value;
     * `BOARD_TOKEN` is a Worker secret (`wrangler secret put BOARD_TOKEN`),
     * because it is a credential for someone else's service.
     */
    BOARD_BASE_URL?: string;
    BOARD_TOKEN?: string;
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
    /**
     * How long one dispatch leg of a cloud wave watches its containers, in ms
     * (tick 2xm). Unset on a real deployment: the default is derived from
     * Cloudflare's per-step execution cap (`src/workflow-limits.ts`), and a
     * value above what a step may spend is clamped down to it rather than
     * honoured — a leg that outlives its step kills the whole run.
     */
    RUN_WAVE_LEG_MS?: string;
    /**
     * A ceiling on what any ONE worker container's harness may spend, in ms
     * (tick 5fg). Unset on a real deployment: the default is derived from
     * measurement (`DEFAULT_WORKER_HARNESS_BUDGET_MS`) and bounded by the
     * run's own remaining wall clock, which is the bound that matters. Set it
     * to stop a single long tick from eating a generous run allowance.
     */
    RUN_WORKER_BUDGET_MS?: string;
    /**
     * Harness kind and model a run is started with — the orchestrator sandbox,
     * and any per-tick worker container the run dispatches unless the worker
     * vars below are what the deployment wants instead. This is the run's own
     * choice and it outranks them.
     */
    RUN_HARNESS?: string;
    RUN_MODEL?: string;
    /**
     * This deployment's standing harness and model for a per-tick WORKER
     * container (tick 1cd). Unset on a real deployment: the built-in default
     * is `omp` on `deepseek-v4-pro-0813`, chosen on run_215b7cbff9's evidence
     * that flash failed to converge on two of three real ticks inside a
     * 90-minute budget — see `WORKER_DEFAULT_MODEL` in src/worker-boot.ts for
     * the measurement and what pro costs.
     *
     * Set `RUN_WORKER_MODEL` to route workers somewhere else — back to
     * `workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731` for a wave of small
     * ticks, say — without editing TypeScript. Resolution order is
     * run submission > deployment var > built-in default (`workerModel`).
     */
    RUN_WORKER_HARNESS?: string;
    RUN_WORKER_MODEL?: string;
    /**
     * The `[[containers]] max_instances` ceiling from this file (tick b6e) —
     * a second declaration of the same number, because wrangler does not
     * expose a container application's own config back to the Worker at
     * runtime. A cloud wave's dispatch width is bounded by it, so raising the
     * ceiling without raising this reintroduces exactly the silent
     * serialization wave 3 measured, just one layer up. Bounds and the
     * default live in src/run-workflow.ts.
     */
    FACTORY_MAX_INSTANCES?: string;
    /**
     * How long a queued submission stays ignitable, in ms (D22). A wrangler
     * `[vars]` value, so the window is a deployment decision; bounds and the
     * default live in src/runs.ts.
     */
    RUN_QUEUE_TTL_MS?: string;
    /**
     * How long a signal's commit waits between attempts, in ms (tick 8sm). A
     * wrangler `[vars]` value: how long to wait out a cloud run pushing
     * tracker state is a property of how a repository is used. Bounds and the
     * default live in src/signal-inbox.ts.
     */
    SIGNAL_COMMIT_RETRY_MS?: string;
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
    /**
     * The shared secret GitHub signs every webhook delivery with (tick vuz).
     *
     * A Worker secret, not a `[vars]` value, and optional in the type for the
     * same reason every other credential here is: an un-provisioned deployment
     * must fail closed at the point of use. `src/github-issues.ts` answers 503
     * and ingests nothing without it — a factory that cannot tell GitHub apart
     * from anyone else who can POST JSON must accept nothing, not everything.
     */
    GITHUB_WEBHOOK_SECRET?: string;
    /**
     * The label a maintainer applies to say "this issue is for the machine"
     * (wrangler `[vars]`, D7). Defaults to `tk` when unset.
     *
     * A deployment decision rather than a constant because the word belongs to
     * the repository's own issue-triage vocabulary, and a repo that already
     * uses `tk` for something else must be able to name a different one
     * without a source edit.
     */
    GITHUB_CONSENT_LABEL?: string;
    /**
     * The shared secrets for the generic webhook sources a repository declares
     * in its own `.tick/runners.toml` (tick 0vb).
     *
     * Worker secrets, one per declared source, named `SIGNAL_SECRET_<SOURCE>`.
     * They are an index signature rather than named keys because the set is
     * open: which sources exist is the REPOSITORY's decision, made in a file
     * this deployment does not own, so no fixed list here could be right.
     *
     * The declaration names the binding, never the value — `runners.toml` is
     * tracked and public, and a secret written into it is a secret published.
     * `src/webhook-sources.ts` bounds what a repository may nominate to this
     * prefix so a declaration cannot reach for `GITHUB_TOKEN` or
     * `FACTORY_TOKEN_HASH`, and answers 503 for a source whose secret this
     * deployment does not hold.
     */
    [signalSecret: `SIGNAL_SECRET_${string}`]: string | undefined;
  }
}
