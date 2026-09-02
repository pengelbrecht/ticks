import { env, SELF } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import bootContract from "../../../contracts/worker-boot-contract.json";
import collectContract from "../../../contracts/collect-vocabulary.json";

import {
  BRANCH_CLAIM_PREFIX,
  GATEWAY_PREFIX,
  GIT_PREFIX,
  HEALTH_PATH,
  REVIEW_PREFIX,
  TELEGRAM_WEBHOOK_PATH,
  WAVE_PATH,
  WEBHOOK_PREFIX,
  deriveTokenHash,
  isAuthExempt,
  mintFactoryToken,
} from "../src/auth";
import {
  CONTROL_PLANE_LOG_EPOCH,
  harnessLogKey,
  harnessSegmentKey,
  harnessStreamPrefix,
  orchestratorPrefix,
  reconcileKey,
  runPrefix,
  runRecordKey,
  waveOutcomesKey,
  waveRequestKey,
  workerLogSegmentKey,
  workerLogStreamPrefix,
  workerManifestKey,
} from "../src/artifacts";
import {
  getDeploymentImage,
  getRunImage,
  insertRunImage,
  listRunGatewayTokens,
} from "../src/db";
import {
  authorizeRunCredential,
  issueRunToken,
  revokeRunTokens,
} from "../src/gateway";
import {
  DEFAULT_SANDBOX_IMAGE,
  deploymentImage,
  resolveSandboxImage,
} from "../src/sandbox";
import { effectiveRunBudget } from "../src/run-workflow";
import {
  WORKER_DEFAULT_HARNESS,
  WORKER_DEFAULT_MODEL,
  WORKER_EXIT,
  WORKER_PUSH_MARGIN_MS,
  MIN_WORKER_HARNESS_BUDGET_MS,
  DEFAULT_WORKER_HARNESS_BUDGET_MS,
  workerBranch,
  workerHarness,
  workerHarnessBudgetMs,
  workerModel,
  workerResultFile,
  waveWaitTimeoutMs,
} from "../src/worker-boot";
import {
  BOUNDARY_REPORT_MARKER,
  STATUS_BLOCKED,
  STATUS_DONE,
  STATUS_DONE_WITH_CONCERNS,
  STATUS_NEEDS_CONTEXT,
  WORKER_VERDICTS,
  needsHuman,
  parseStatus,
  resultFile,
  type WorkerCollector,
  type WorkerReport,
  type WorkerTask,
} from "../src/worker-collect";
import {
  dispatchWave,
  waveCanceller,
  workerSandboxName,
  type Sleeper,
  type WorkSpec,
} from "../src/worker-dispatch";
import type {
  OrchestratorSandbox,
  SandboxBinding,
  SandboxOutput,
  SandboxProcessState,
  SandboxProcessView,
} from "../src/sandbox";

/**
 * PHASE 0 COMPATIBILITY SUITE — the cloud factory's externally observable
 * behaviour, frozen (ticfac SPEC §12 Phase 0 step 4, tick mrq).
 *
 * `docs/projects/2026-09-01-ticfac-architecture/SPEC.md` §12 Phase 0 step 4:
 * "Record current cloud routes, D1/R2 keys, image tags, worker result
 * semantics, and cleanup ordering as compatibility tests." Phase 4 moves the
 * Cloudflare product to ticfac as a *compatibility host* (§12 Phase 4), and a
 * move is only a move if the surface on the other side is the same one. This
 * file is what makes drift a failing test rather than a live-run discovery.
 *
 * **What belongs here, and what does not.** Every other file in `test/`
 * exercises one module's rules. This one asserts nothing about how a rule is
 * reached; it pins what an outside observer sees — a status code, a key
 * string, a column, an ordering. It is deliberately redundant with the
 * module suites, because the redundancy is the point: a refactor that changes
 * a module's internals and keeps this green has preserved the contract, and
 * one that turns this red has changed it whether or not that was intended.
 *
 * Every `describe` names the SPEC section or the Appendix A invariant it
 * protects. Appendix A ("Lifecycle invariants earned from live runs") is
 * conformance, not guidance: an executor that violates one is wrong.
 *
 * No test here ignites a run (`.tick/learnings.md`, "Cloudflare"): the wave
 * tests drive `dispatchWave` against a fake sandbox binding, and the Workflow
 * is never created.
 *
 * **CI.** `vitest.config.ts` includes `test/**\/*.test.ts`, `pnpm test` runs
 * `vitest run`, and the `factory` job in `.github/workflows/ci.yml` runs
 * `pnpm test` — so this file is registered by being in this directory.
 * Nothing lists test files by name; there is no second place to update.
 *
 * See `repo-wiki/phase0-compat-suite.md` for the surface-by-surface table and
 * for what this file deliberately does NOT reach (the sandbox shell scripts).
 */

const BASE = "https://factory.example.com";

let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
});

function bearer(): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ===========================================================================
// SPEC §8.1 — HTTP routes and their auth grades
// ===========================================================================

/**
 * The four credential grades this Worker's doors are behind. They are a
 * *contract*, not an implementation detail: a run's container must never hold
 * the operator's token (D16/D17), so which grade a path is behind is the
 * security boundary Phase 4 has to carry across unchanged.
 */
type Grade =
  /** No credential at all: liveness must answer before a token exists. */
  | "open"
  /** The operator's factory bearer token. */
  | "factory"
  /** A run-scoped gateway credential, held by a sandbox and revocable. */
  | "run-token"
  /** A signature over the raw body: GitHub, Telegram, a declared source. */
  | "webhook-signature";

/**
 * The route table as an outside caller sees it. Paths are spelled literally
 * rather than composed from the exported constants, because a constant that
 * moves in step with the code it is compared against pins nothing — these are
 * the URLs a deployed factory answers on, and `route constants` below is what
 * ties them back to the modules that declare them.
 */
const ROUTES: ReadonlyArray<{ path: string; grade: Grade }> = [
  { path: "/health", grade: "open" },
  { path: "/api/wave", grade: "run-token" },
  { path: "/api/branches", grade: "run-token" },
  { path: "/api/review", grade: "run-token" },
  { path: "/api/gateway/v1/messages", grade: "run-token" },
  { path: "/api/git/o/r/info/refs", grade: "run-token" },
  { path: "/api/hooks/github", grade: "webhook-signature" },
  { path: "/api/hooks/source/o/r/sentry", grade: "webhook-signature" },
  { path: "/api/channels/telegram/webhook", grade: "webhook-signature" },
  { path: "/api/channels/telegram/webhook/registration", grade: "factory" },
  { path: "/api/runs", grade: "factory" },
  { path: "/api/runs/run_compat", grade: "factory" },
  { path: "/api/runs/run_compat/stop", grade: "factory" },
  { path: "/api/runs/run_compat/logs", grade: "factory" },
  { path: "/api/projects", grade: "factory" },
  { path: "/api/observe", grade: "factory" },
  { path: "/api/sweeps", grade: "factory" },
  { path: "/api/ci/escalations", grade: "factory" },
  { path: "/api/ci/branches", grade: "factory" },
];

/** The RFC 6750 challenge the FACTORY door — and only it — answers with. */
const FACTORY_CHALLENGE = 'Bearer realm="ticks-factory"';

describe("SPEC §8.1: the route table and its auth grades", () => {
  it("pins each route's exemption from the factory bearer token", () => {
    // `isAuthExempt` is the one function that decides this, and it is
    // consulted before routing, so its answer IS the grade.
    const exempt = ROUTES.map((route) => `${route.path} ${isAuthExempt(route.path)}`);
    const expected = ROUTES.map(
      (route) => `${route.path} ${route.grade !== "factory"}`
    );
    expect(exempt).toEqual(expected);
  });

  it("pins the route constants the modules declare against the paths served", () => {
    // The other half of the table above: a module that re-spells its path
    // would otherwise move the door and leave this file describing the old
    // one. `auth.ts` declares the registry and imports nothing, so these are
    // the spellings every other module is pinned to.
    expect(HEALTH_PATH).toBe("/health");
    expect(WAVE_PATH).toBe("/api/wave");
    expect(BRANCH_CLAIM_PREFIX).toBe("/api/branches");
    expect(REVIEW_PREFIX).toBe("/api/review");
    expect(GATEWAY_PREFIX).toBe("/api/gateway");
    expect(GIT_PREFIX).toBe("/api/git");
    expect(WEBHOOK_PREFIX).toBe("/api/hooks");
    expect(TELEGRAM_WEBHOOK_PATH).toBe("/api/channels/telegram/webhook");
  });

  it("refuses every factory-graded route without the operator's token", async () => {
    const seen: string[] = [];
    for (const route of ROUTES.filter((r) => r.grade === "factory")) {
      const response = await SELF.fetch(`${BASE}${route.path}`);
      seen.push(
        `${route.path} ${response.status} ${response.headers.get("WWW-Authenticate")}`
      );
    }
    expect(seen).toEqual(
      ROUTES.filter((r) => r.grade === "factory").map(
        (r) => `${r.path} 401 ${FACTORY_CHALLENGE}`
      )
    );
  });

  it("never answers a run-token, webhook or open route with the factory challenge", async () => {
    // A door whose caller is a sandbox or GitHub must not demand a credential
    // neither can carry. The status varies by route (each has its own
    // authorization); what must not vary is that none of them asks for the
    // operator's BEARER token.
    for (const route of ROUTES.filter((r) => r.grade !== "factory")) {
      const response = await SELF.fetch(`${BASE}${route.path}`, { method: "POST" });
      const challenge = response.headers.get("WWW-Authenticate") ?? "";
      expect(`${route.path} ${challenge.startsWith("Bearer")}`).toBe(`${route.path} false`);
    }
  });

  it("challenges the git door as Basic, because that is what a git client sends", async () => {
    // The read-only git door (D11) carries the run's credential the way git
    // presents one — a `credential.helper` in the container produces Basic
    // auth, not a bearer header — so its challenge is deliberately not the
    // factory's, and a client that got the factory's would never retry.
    const response = await SELF.fetch(`${BASE}/api/git/o/r/info/refs`);

    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="ticks-factory", charset="UTF-8"'
    );
  });

  it("authenticates before it routes, so an unauthenticated caller cannot map the table", async () => {
    const anonymous = await SELF.fetch(`${BASE}/api/not-a-route`);
    const authenticated = await SELF.fetch(`${BASE}/api/not-a-route`, bearer());

    // Same path, two answers: 401 says nothing about whether the route exists.
    expect(anonymous.status).toBe(401);
    expect(authenticated.status).toBe(404);
    await expect(authenticated.json()).resolves.toEqual({ error: "not_found" });
  });

  it("serves /health unauthenticated with binding presence and the auth verdict", async () => {
    const response = await SELF.fetch(`${BASE}/health`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      bindings: Record<string, boolean>;
      auth: { required: boolean; configured: boolean };
    };
    expect(body.status).toBe("ok");
    // The binding names are what `tk factory deploy` reads to decide a deploy
    // landed; a rename is a broken deploy check, not a cosmetic change.
    expect(Object.keys(body.bindings).sort()).toEqual([
      "artifacts",
      "db",
      "run_rooms",
      "run_workflow",
      "sandboxes",
      "signal_inboxes",
    ]);
    expect(body.auth.required).toBe(true);
    expect(body.auth.configured).toBe(true);
  });

  /**
   * The method guards, with the `Allow` header each answers with. A 405 that
   * forgets `Allow` is not a compatible 405: it is what a client reads to
   * know what it should have sent.
   */
  const METHOD_GUARDS: ReadonlyArray<{
    method: string;
    path: string;
    allow: string;
    authenticated: boolean;
  }> = [
    { method: "DELETE", path: "/health", allow: "GET, HEAD", authenticated: false },
    { method: "GET", path: "/api/wave", allow: "POST", authenticated: false },
    { method: "GET", path: "/api/branches", allow: "POST", authenticated: false },
    { method: "GET", path: "/api/review", allow: "POST", authenticated: false },
    { method: "PUT", path: "/api/runs", allow: "GET, POST", authenticated: true },
    { method: "POST", path: "/api/runs/run_compat", allow: "GET", authenticated: true },
    { method: "GET", path: "/api/runs/run_compat/stop", allow: "POST", authenticated: true },
    { method: "POST", path: "/api/runs/run_compat/logs", allow: "GET", authenticated: true },
    { method: "POST", path: "/api/sweeps", allow: "GET", authenticated: true },
  ];

  it("answers a wrong method with 405 and the Allow header", async () => {
    const seen: string[] = [];
    for (const guard of METHOD_GUARDS) {
      const response = await SELF.fetch(`${BASE}${guard.path}`, {
        method: guard.method,
        ...(guard.authenticated ? bearer() : {}),
      });
      seen.push(
        `${guard.method} ${guard.path} ${response.status} ${response.headers.get("Allow")}`
      );
    }
    expect(seen).toEqual(
      METHOD_GUARDS.map((g) => `${g.method} ${g.path} 405 ${g.allow}`)
    );
  });
});

// ===========================================================================
// SPEC §8.1 / §10.4 — D1 table and key shapes
// ===========================================================================

type ColumnInfo = { name: string; pk: number; notnull: number };

async function columns(table: string): Promise<ColumnInfo[]> {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<ColumnInfo>();
  return info.results;
}

async function tableSQL(name: string): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?"
  )
    .bind(name)
    .first<{ sql: string }>();
  return row?.sql ?? "";
}

/**
 * The tables and keys the cloud factory's records live in today.
 *
 * Asserted as a SUBSET of what the database has, not an equality: an additive
 * migration is a compatible change and must not turn this red, while a
 * removed column or a moved primary key is exactly the drift this catches.
 * §10.4 is what bounds the ambition — D1 is an index over durable facts, so
 * what has to survive Phase 4 is the *identity* of a record (its key) and the
 * fields a reader outside this bundle asks for.
 */
const D1_SHAPE: ReadonlyArray<{ table: string; pk: string[]; columns: string[] }> = [
  {
    table: "runs",
    pk: ["run_id"],
    columns: [
      "run_id",
      "project",
      "epic",
      "base_sha",
      "requested_by",
      "state",
      "started_at",
      "ended_at",
      "cost_usd",
    ],
  },
  {
    table: "signals",
    pk: ["signal_id"],
    columns: [
      "signal_id",
      "source",
      "external_ref",
      "payload_digest",
      "verdict",
      "tick_id",
      "received_at",
    ],
  },
  // No primary key by design: the dispatch log is an append-only trace, and a
  // tick may be decided about more than once within a run.
  { table: "dispatch_log", pk: [], columns: ["run_id", "tick_id", "decision", "reason", "at"] },
  {
    table: "run_gateway_token",
    // The HASH is the key: the plaintext exists in the sandbox and nowhere
    // else, so nothing can look a credential up by its value.
    pk: ["token_hash"],
    columns: [
      "token_hash",
      "run_id",
      "tick_id",
      "attempt",
      "issued_at",
      "revoked_at",
      "revoked_reason",
    ],
  },
  { table: "run_image", pk: ["run_id"], columns: ["image_ref", "image_digest", "recorded_at"] },
  { table: "run_progress", pk: ["run_id"], columns: ["progress", "detail", "recorded_at"] },
  { table: "enrolled_project", pk: ["project"], columns: ["enrolled_by", "enrolled_at"] },
  {
    table: "factory_deployment",
    pk: ["id"],
    columns: ["tk_version", "bundle_sha256", "deployed_at"],
  },
  {
    table: "factory_deployment_image",
    pk: ["id"],
    columns: ["image_ref", "image_digest", "confirmed_at"],
  },
];

/** The lookups the control plane cannot afford to lose. */
const D1_INDEXES = [
  "idx_dispatch_log_run_tick_at",
  "idx_run_gateway_token_run",
  "idx_runs_project_epic",
  "idx_signals_tick_id",
];

describe("SPEC §8.1/§10.4: D1 table and key shapes", () => {
  it("keeps every table's primary key where a reader outside this bundle expects it", async () => {
    const seen: string[] = [];
    for (const shape of D1_SHAPE) {
      const info = await columns(shape.table);
      const pk = info
        .filter((column) => column.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((column) => column.name);
      seen.push(`${shape.table} [${pk.join(", ")}]`);
    }
    expect(seen).toEqual(D1_SHAPE.map((s) => `${s.table} [${s.pk.join(", ")}]`));
  });

  it("keeps every recorded column present", async () => {
    const missing: string[] = [];
    for (const shape of D1_SHAPE) {
      const names = new Set((await columns(shape.table)).map((column) => column.name));
      for (const column of shape.columns) {
        if (!names.has(column)) missing.push(`${shape.table}.${column}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps the indexes the control plane's lookups depend on", async () => {
    const rows = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name"
    ).all<{ name: string }>();
    const present = new Set(rows.results.map((row) => row.name));

    expect(D1_INDEXES.filter((name) => !present.has(name))).toEqual([]);
  });

  it("holds the deployment tables to one row (D16: one factory, one operator)", async () => {
    // The CHECK is the enforcement, and it is observable: a second row is
    // rejected by the database rather than by a caller remembering not to
    // write one.
    expect(await tableSQL("factory_deployment")).toContain("CHECK (id = 1)");
    expect(await tableSQL("factory_deployment_image")).toContain("CHECK (id = 1)");

    await expect(
      env.DB.prepare(
        "INSERT INTO factory_deployment (id, tk_version, bundle_sha256, deployed_at) VALUES (2, 'v', 'sha', 'now')"
      ).run()
    ).rejects.toThrow();
  });

  it("dedups a signal on its external reference", async () => {
    // The redelivery guard, in the schema rather than in a code path: a
    // webhook that arrives twice must not become two ticks.
    expect(await tableSQL("signals")).toContain("UNIQUE");

    const insert = (id: string) =>
      env.DB.prepare(
        `INSERT INTO signals (signal_id, source, external_ref, payload_digest, verdict, tick_id, received_at)
         VALUES (?, 'github', 'compat-external-ref', 'digest', 'accepted', NULL, '2026-09-02T00:00:00Z')`
      )
        .bind(id)
        .run();

    await insert("sig_compat_1");
    await expect(insert("sig_compat_2")).rejects.toThrow();
  });

  it("constrains a dispatch decision's reason to the recorded vocabulary", async () => {
    // A reason outside the list is a spelling nobody reads; the CHECK is what
    // makes a new one a migration rather than a silent free-text field.
    const sql = await tableSQL("dispatch_log");
    for (const reason of [
      "budget_exhausted",
      "lease_held_by",
      "flake_gate",
      "awaiting_approval",
      "strike_out",
    ]) {
      expect(sql).toContain(`'${reason}'`);
    }

    await expect(
      env.DB.prepare(
        "INSERT INTO dispatch_log (run_id, tick_id, decision, reason, at) VALUES ('run_compat', 'mrq', 'refused', 'made_up', 'now')"
      ).run()
    ).rejects.toThrow();
  });
});

// ===========================================================================
// SPEC §10.1 — R2 key layout
// ===========================================================================

describe("SPEC §10.1: the R2 artifact key layout", () => {
  it("pins every key a run writes", () => {
    const project = "acme/widgets";
    const run = "run_compat";

    expect(runPrefix(project, run)).toBe("runs/acme/widgets/run_compat/");
    expect(runRecordKey(project, run)).toBe("runs/acme/widgets/run_compat/run.json");
    expect(orchestratorPrefix(project, run)).toBe(
      "runs/acme/widgets/run_compat/artifacts/orchestrator/"
    );
    expect(harnessStreamPrefix(project, run)).toBe(
      "runs/acme/widgets/run_compat/artifacts/orchestrator/harness/"
    );
    expect(harnessSegmentKey(project, run, 2, 9)).toBe(
      "runs/acme/widgets/run_compat/artifacts/orchestrator/harness/002/000009.log"
    );
    expect(harnessLogKey(project, run)).toBe(
      "runs/acme/widgets/run_compat/artifacts/orchestrator/harness.log"
    );
    expect(reconcileKey(project, run, 3)).toBe(
      "runs/acme/widgets/run_compat/artifacts/orchestrator/reconcile/003.json"
    );
    expect(waveOutcomesKey(project, run, 1)).toBe(
      "runs/acme/widgets/run_compat/artifacts/wave/001.json"
    );
    expect(waveRequestKey(project, run, 1)).toBe(
      "runs/acme/widgets/run_compat/artifacts/wave-request/001.json"
    );
    expect(workerManifestKey(project, run, "mrq")).toBe(
      "runs/acme/widgets/run_compat/artifacts/mrq/manifest.json"
    );
    expect(workerLogStreamPrefix(project, run, "mrq")).toBe(
      "runs/acme/widgets/run_compat/artifacts/mrq/harness/"
    );
    expect(workerLogSegmentKey(project, run, "mrq", 1756771200000, 4)).toBe(
      "runs/acme/widgets/run_compat/artifacts/mrq/harness/1756771200000/000004.log"
    );
  });

  it("keeps a tick's artifacts under the run prefix, so one list finds a whole run", async () => {
    // §10.1's three categories all live under one prefix on purpose: the run
    // record, the orchestrator's stream, and each tick's own folder. A reader
    // salvaging a dead run lists one thing.
    const project = "acme/prefix";
    const run = "run_prefix";
    await env.ARTIFACTS.put(runRecordKey(project, run), "{}");
    await env.ARTIFACTS.put(harnessSegmentKey(project, run, 1, 1), "orchestrator\n");
    await env.ARTIFACTS.put(workerManifestKey(project, run, "mrq"), "{}");
    await env.ARTIFACTS.put(workerLogSegmentKey(project, run, "mrq", 1756771200000, 1), "worker\n");

    const listed = await env.ARTIFACTS.list({ prefix: runPrefix(project, run) });

    expect(listed.objects.map((object) => object.key)).toEqual([
      "runs/acme/prefix/run_prefix/artifacts/mrq/harness/1756771200000/000001.log",
      "runs/acme/prefix/run_prefix/artifacts/mrq/manifest.json",
      "runs/acme/prefix/run_prefix/artifacts/orchestrator/harness/001/000001.log",
      "runs/acme/prefix/run_prefix/run.json",
    ]);
  });

  it("keeps R2's lexicographic list order equal to numeric order", async () => {
    // R2 has no append: a stream is a sequence of immutable segments a reader
    // concatenates IN KEY ORDER. Zero padding is what makes that reader
    // correct — `10.log` sorting before `9.log` silently reorders a log.
    const project = "acme/order";
    const run = "run_order";
    for (const seq of [1, 9, 10, 100]) {
      await env.ARTIFACTS.put(harnessSegmentKey(project, run, 1, seq), `${seq}\n`);
    }

    const listed = await env.ARTIFACTS.list({ prefix: harnessStreamPrefix(project, run) });
    const bodies = await Promise.all(
      listed.objects.map(async (object) => (await env.ARTIFACTS.get(object.key))!.text())
    );

    expect(bodies.join("")).toBe("1\n9\n10\n100\n");
  });

  it("sorts the control plane's log banner before every byte a container writes", async () => {
    // Epoch 0 is reserved for the header the CONTROL PLANE writes before the
    // container is addressed: a container that dies in its image pull prints
    // nothing, and that is exactly the log someone reads.
    expect(CONTROL_PLANE_LOG_EPOCH).toBe(0);

    const project = "acme/banner";
    const run = "run_banner";
    await env.ARTIFACTS.put(
      workerLogSegmentKey(project, run, "mrq", CONTROL_PLANE_LOG_EPOCH, 1),
      "banner\n"
    );
    await env.ARTIFACTS.put(
      workerLogSegmentKey(project, run, "mrq", Date.now(), 1),
      "container\n"
    );

    const listed = await env.ARTIFACTS.list({
      prefix: workerLogStreamPrefix(project, run, "mrq"),
    });
    const bodies = await Promise.all(
      listed.objects.map(async (object) => (await env.ARTIFACTS.get(object.key))!.text())
    );

    expect(bodies).toEqual(["banner\n", "container\n"]);
  });
});

// ===========================================================================
// SPEC §8.1/§8.4 — image tags, and the deployment vars that select model/route
// ===========================================================================

describe("SPEC §8.1/§8.4: the orchestrator image and the vars that select it", () => {
  const originalImage = env.SANDBOX_IMAGE;

  afterEach(() => {
    if (originalImage === undefined) delete env.SANDBOX_IMAGE;
    else env.SANDBOX_IMAGE = originalImage;
  });

  it("names the container application wrangler.toml declares", () => {
    // `[[containers]] name` in wrangler.toml. The image is fixed by the
    // deploy on this substrate, so this string is what a run's boot asks for
    // and what its `run_image` stamp records.
    expect(DEFAULT_SANDBOX_IMAGE).toBe("ticks-orchestrator");
    expect(deploymentImage(env)).toBe(DEFAULT_SANDBOX_IMAGE);
  });

  it("lets a deployment say which image it serves, and only a deployment", () => {
    env.SANDBOX_IMAGE = "registry.example.com/ticks-orchestrator:2026-09-02";
    expect(deploymentImage(env)).toBe("registry.example.com/ticks-orchestrator:2026-09-02");

    // A repository may DECLARE an image, but a declaration this deployment
    // does not serve is refused rather than pulled: §8.4's explicit backend
    // selection, one layer down.
    expect(
      resolveSandboxImage({ declared: null, deployment: "ticks-orchestrator" })
    ).toEqual({ ok: true, image: "ticks-orchestrator", source: "base" });
    expect(
      resolveSandboxImage({ declared: "ticks-orchestrator:latest", deployment: "ticks-orchestrator" })
    ).toEqual({ ok: true, image: "ticks-orchestrator:latest", source: "declared" });
    expect(
      resolveSandboxImage({ declared: "someone/else:1", deployment: "ticks-orchestrator" }).ok
    ).toBe(false);
  });

  it("stamps the image a run booted so it stays true after the next deploy", async () => {
    // Two runs producing identical output across a deploy is
    // indistinguishable from a fix that did not work — unless the image each
    // booted is recorded per run rather than only per deployment.
    await insertRunImage(
      env.DB,
      "run_image_compat",
      { image_ref: "ticks-orchestrator:abc", image_digest: "sha256:abc" },
      "2026-09-02T00:00:00Z"
    );

    await expect(getRunImage(env.DB, "run_image_compat")).resolves.toEqual({
      image_ref: "ticks-orchestrator:abc",
      image_digest: "sha256:abc",
    });
    // The deployment row is written only once a rollout is CONFIRMED, so an
    // empty one is a factory that has not proven which image it serves.
    await expect(getDeploymentImage(env.DB)).resolves.toBeNull();
  });

  it("pins the deployment vars wrangler.toml declares, and their values", () => {
    // These are read from the real `env` inside workerd, so this is the
    // deployable config rather than a copy of it. They are the numbers that
    // govern a run: change one and every future run changes with it.
    const vars = env as unknown as Record<string, unknown>;
    const declared = Object.fromEntries(
      Object.keys(vars)
        .filter((name) => typeof vars[name] === "string" && name !== "FACTORY_TOKEN_HASH")
        .sort()
        .map((name) => [name, vars[name]])
    );
    expect(declared).toEqual({
      FACTORY_MAX_INSTANCES: "3",
      GITHUB_CONSENT_LABEL: "tk",
      RUN_CLOSEOUT_MS: "1800000",
      RUN_MAX_COST_USD: "40",
      RUN_MAX_WALL_CLOCK_MS: "14400000",
      RUN_QUEUE_TTL_MS: "1800000",
      RUN_STOP_GRACE_MS: "300000",
      SIGNAL_COMMIT_RETRY_MS: "250",
      SWEEP_MAX_PROJECTS: "4",
      SWEEP_MAX_TICKS: "5",
      SWEEP_MAX_TIER: "economy",
    });
  });

  it("leaves the model-and-route vars unset, so the built-in default governs", () => {
    // Deliberate, and documented in wrangler.toml: an unset
    // GATEWAY_ALLOWED_PROVIDERS is `workers-ai` alone — the rung billed to the
    // operator's own Cloudflare account rather than to a card — and an unset
    // RUN_WORKER_* leaves WORKER_DEFAULT_*. Setting one of these is a
    // deployment decision about spend, so a value appearing here is news.
    const vars = env as unknown as Record<string, unknown>;
    for (const name of [
      "GATEWAY_ALLOWED_PROVIDERS",
      "RUN_WORKER_MODEL",
      "RUN_WORKER_HARNESS",
      "RUN_MODEL",
      "RUN_HARNESS",
      "SANDBOX_IMAGE",
      "BOARD_BASE_URL",
    ]) {
      expect(`${name}=${String(vars[name])}`).toBe(`${name}=undefined`);
    }
  });

  it("resolves a worker's model and harness by run > deployment var > built-in default", () => {
    // The ladder tick 1cd built, and the thing Phase 4 must not reorder: a
    // choice made about ONE run outranks a deployment's standing one, which
    // outranks the constant.
    expect(WORKER_DEFAULT_HARNESS).toBe("omp");
    expect(WORKER_DEFAULT_MODEL).toBe("workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813");

    expect(workerModel(null, null)).toBe(WORKER_DEFAULT_MODEL);
    expect(workerModel(null, "workers-ai/deployment")).toBe("workers-ai/deployment");
    expect(workerModel("workers-ai/run", "workers-ai/deployment")).toBe("workers-ai/run");
    // Blank is unset, not "let the container decide": an exported empty
    // TICKS_MODEL is a defeated default, not a choice.
    expect(workerModel("   ", "workers-ai/deployment")).toBe("workers-ai/deployment");

    expect(workerHarness(null, null)).toBe(WORKER_DEFAULT_HARNESS);
    expect(workerHarness(null, "codex")).toBe("codex");
    expect(workerHarness("claude", "codex")).toBe("claude");
  });

  it("reports an effective budget after the deployment ceiling clamps it (Appendix A #12)", () => {
    // Appendix A #12: "Effective budgets are reported after clamping. An
    // operator's number silently replaced by a deployment ceiling is
    // discovered from a cancelled run; say the number that will govern at
    // submission."
    const clamped = effectiveRunBudget(env, {
      max_cost_usd: 1_000,
      max_wall_clock_ms: 24 * 60 * 60_000,
    });

    expect(clamped.requested_max_cost_usd).toBe(1_000);
    expect(clamped.requested_max_wall_clock_ms).toBe(24 * 60 * 60_000);
    expect(clamped.cost_clamped).toBe(true);
    expect(clamped.wall_clock_clamped).toBe(true);
    // The number that will actually govern — the deployment's, not the ask.
    expect(clamped.max_cost_usd).toBe(40);
    expect(clamped.max_wall_clock_ms).toBe(14_400_000);

    const within = effectiveRunBudget(env, { max_cost_usd: 5, max_wall_clock_ms: 60_000 });
    expect(within.cost_clamped).toBe(false);
    expect(within.wall_clock_clamped).toBe(false);
    expect(within.max_cost_usd).toBe(5);
  });
});

// ===========================================================================
// SPEC §10.1 — worker RESULT semantics
// ===========================================================================

describe("SPEC §10.1: what a worker's RESULT report means", () => {
  it("pins the branch and report a worker is collected from", () => {
    // The three readers of this contract — the container, tk, and this
    // control plane — are pinned to contracts/worker-boot-contract.json, and
    // Phase 4 moves only one of them.
    expect(workerBranch("1vn", "tap")).toBe(bootContract.branch_example.branch);
    expect(workerResultFile("tap")).toBe(bootContract.result_file_example.path);
    expect(resultFile("mrq")).toBe("RESULT-mrq.md");
    expect(workerBranch("692", "mrq")).toBe("tick/692/mrq");
  });

  it("pins the verdict vocabulary the two Go implementations share", () => {
    // One rule set, three implementations (internal/herd/collect,
    // internal/cloud/collect, this bundle). Re-spell one and a cloud run and
    // a herd run disagree about what happened to the same tick with nothing
    // failing anywhere — so the spellings come from the shared contract.
    expect(WORKER_VERDICTS.readyToMerge).toBe(collectContract.verdicts.ready_to_merge);
    expect(WORKER_VERDICTS.noCommits).toBe(collectContract.verdicts.no_commits);
    expect(WORKER_VERDICTS.missingResult).toBe(collectContract.verdicts.missing_result);
    expect(WORKER_VERDICTS.boundaryViolation).toBe(collectContract.verdicts.boundary_violation);
    expect(WORKER_VERDICTS.unknown).toBe(collectContract.remote_only_verdicts.unknown);

    expect([STATUS_DONE, STATUS_DONE_WITH_CONCERNS, STATUS_NEEDS_CONTEXT, STATUS_BLOCKED]).toEqual([
      collectContract.statuses.done,
      collectContract.statuses.done_with_concerns,
      collectContract.statuses.needs_context,
      collectContract.statuses.blocked,
    ]);
  });

  it("reads the FINAL status line, and never truncates DONE_WITH_CONCERNS to DONE", () => {
    // A report may quote the template's four options above its own line; the
    // contract is the last one. Getting the alternation order wrong inverts
    // the verdict on exactly the status a human most needs to see.
    const body = [
      "Options:",
      "STATUS: DONE",
      "STATUS: BLOCKED",
      "",
      "> - **STATUS: DONE_WITH_CONCERNS — check the migration ordering**",
      "",
    ].join("\n");

    expect(parseStatus(body)).toEqual({
      status: STATUS_DONE_WITH_CONCERNS,
      detail: "check the migration ordering",
      // The markdown a worker wrapped it in is trimmed from the line too: a
      // status inside a bullet or bolded is still a status.
      line: "STATUS: DONE_WITH_CONCERNS — check the migration ordering",
    });
    expect(parseStatus("no status here")).toEqual({ status: "", detail: "", line: "" });
  });

  it("escalates BLOCKED and NEEDS_CONTEXT to a human, and nothing else", () => {
    const report = (status: string): WorkerReport => ({
      tick_id: "mrq",
      branch: "tick/692/mrq",
      base_sha: "b".repeat(40),
      verdict: WORKER_VERDICTS.readyToMerge,
      branch_exists: true,
      commits: 1,
      result_path: "RESULT-mrq.md",
      result_exists: true,
      status,
      status_detail: "",
      status_line: `STATUS: ${status}`,
      boundary_files: [],
      detail: "",
    });

    expect(needsHuman(report(STATUS_BLOCKED))).toBe(true);
    expect(needsHuman(report(STATUS_NEEDS_CONTEXT))).toBe(true);
    expect(needsHuman(report(STATUS_DONE))).toBe(false);
    expect(needsHuman(report(STATUS_DONE_WITH_CONCERNS))).toBe(false);
  });

  /**
   * The three fallback reports `cloud/sandbox/worker.sh` writes when the agent
   * wrote none, verbatim in their status lines.
   *
   * The point of all three is one rule: **the exit code is not the verdict.**
   * Run run_215b7cbf wrote "BLOCKED, re-dispatch" on all three of its
   * containers and only one earned it — exit 0 with two real work commits was
   * told to redo finished work, and exit 124 with a salvaged tree would have
   * had it discarded. What survived on the branch decides; the exit code only
   * colours the wording.
   */
  const FALLBACK_REPORTS: ReadonlyArray<{ shape: string; line: string; status: string }> = [
    {
      shape: "nothing landed",
      line:
        "STATUS: BLOCKED — the harness exited 124, wrote no report, and nothing landed on tick/692/mrq; re-dispatch this tick",
      status: STATUS_BLOCKED,
    },
    {
      shape: "exit 0 with work on the branch",
      line:
        "STATUS: DONE_WITH_CONCERNS — the harness exited 0 and 2 work commit(s) landed on tick/692/mrq, but no agent report exists; review the branch, and note nothing describes the work but the diff",
      status: STATUS_DONE_WITH_CONCERNS,
    },
    {
      shape: "a failed harness with work on the branch",
      line:
        "STATUS: NEEDS_CONTEXT — the harness exited 124 and 1 work commit(s) landed on tick/692/mrq; a human has to review what is there before this tick is run again",
      status: STATUS_NEEDS_CONTEXT,
    },
  ];

  it("parses each fallback report the container writes when the agent wrote none", () => {
    const parsed = FALLBACK_REPORTS.map(
      (fallback) => `${fallback.shape}: ${parseStatus(fallback.line).status}`
    );
    expect(parsed).toEqual(
      FALLBACK_REPORTS.map((fallback) => `${fallback.shape}: ${fallback.status}`)
    );

    // Exit 0 is not "done" and a nonzero exit is not "unimplemented": both
    // fallbacks with work on the branch keep a human in the loop, and the one
    // with nothing on it is the only shape that may advise a re-dispatch.
    expect(FALLBACK_REPORTS[0]!.line).toContain("re-dispatch this tick");
    expect(FALLBACK_REPORTS[1]!.line).not.toContain("re-dispatch");
    expect(FALLBACK_REPORTS[2]!.line).not.toContain("re-dispatch");
  });

  it("carries a prevented boundary violation in the report, where the branch cannot", () => {
    // The container REFUSES the write, so the branch is clean and the verdict
    // is ready-to-merge — which is precisely why the attempt has to be
    // reported in words. Appendix A #10: boundaries are enforced by the
    // substrate, and every attempt is reported.
    expect(BOUNDARY_REPORT_MARKER).toBe(bootContract.boundary.report_marker);
    expect(WORKER_EXIT).toEqual(bootContract.exit_codes);
  });

  it("reserves the push margin out of a worker's budget, so a killed container still pushed", () => {
    // Appendix A #5: "In-progress work is pushed on a timer… a job that dies
    // leaves its partial work on origin." This is the supervisor's half of
    // that: the wait ends by KILLING the container, and a killed container
    // pushes nothing — unless its own budget ended a margin earlier.
    expect(WORKER_PUSH_MARGIN_MS).toBe(60_000);
    expect(waveWaitTimeoutMs(90 * 60_000)).toBe(90 * 60_000 + WORKER_PUSH_MARGIN_MS);

    // A worker can never be given more time than the run it belongs to, and
    // the margin comes out of what is left — never out of thin air.
    expect(workerHarnessBudgetMs()).toBe(DEFAULT_WORKER_HARNESS_BUDGET_MS);
    expect(workerHarnessBudgetMs({ remaining_wall_clock_ms: 20 * 60_000 })).toBe(
      20 * 60_000 - WORKER_PUSH_MARGIN_MS
    );
    // …and never so little that it fails every worker rather than rescuing any.
    expect(workerHarnessBudgetMs({ remaining_wall_clock_ms: 61_000 })).toBe(
      MIN_WORKER_HARNESS_BUDGET_MS
    );
  });
});

// ===========================================================================
// The fake sandbox substrate the wave-ordering tests drive
// ===========================================================================

/**
 * A fake `SandboxBinding` that records the ORDER of everything a wave does to
 * a container. It is the same seam `test/worker-dispatch.test.ts` uses; what
 * this one adds is the shared journal, because ordering is what §10.2 and
 * Appendix A #1 are about.
 */
class JournalProcess {
  state: SandboxProcessState = "running";
  exit_code: number | null = null;
  output = "";

  constructor(
    readonly id: string,
    readonly command: string
  ) {}

  say(text: string): void {
    this.output += text;
  }

  finish(code: number): void {
    this.state = code === 0 ? "completed" : "failed";
    this.exit_code = code;
  }

  get view(): SandboxProcessView {
    return { id: this.id, state: this.state, exit_code: this.exit_code };
  }
}

class JournalSandbox implements OrchestratorSandbox {
  readonly processes: JournalProcess[] = [];
  destroyed = false;
  #next = 0;

  constructor(
    readonly name: string,
    readonly journal: string[]
  ) {}

  async startProcess(command: string): Promise<SandboxProcessView> {
    const process = new JournalProcess(`${this.name}-p${++this.#next}`, command);
    this.processes.push(process);
    this.journal.push(`start:${this.name}:${command}`);
    return process.view;
  }

  async getProcess(id: string): Promise<SandboxProcessView | null> {
    return this.processes.find((process) => process.id === id)?.view ?? null;
  }

  async listProcesses(): Promise<SandboxProcessView[]> {
    return this.processes.map((process) => ({ ...process.view, command: process.command }));
  }

  async readOutput(id: string, offset: number): Promise<SandboxOutput> {
    const process = this.processes.find((candidate) => candidate.id === id);
    if (process === undefined) return { text: "", offset };
    return { text: process.output.slice(offset), offset: process.output.length };
  }

  async killProcess(id: string): Promise<void> {
    this.journal.push(`kill:${this.name}`);
    const process = this.processes.find((candidate) => candidate.id === id);
    if (process === undefined) return;
    process.state = "failed";
    process.exit_code = 143;
  }

  async destroy(): Promise<void> {
    this.journal.push(`destroy:${this.name}`);
    this.destroyed = true;
  }
}

class JournalBinding implements SandboxBinding {
  readonly booted: JournalSandbox[] = [];
  readonly gets: string[] = [];
  readonly #byName = new Map<string, JournalSandbox>();

  constructor(readonly journal: string[]) {}

  async get(name: string): Promise<OrchestratorSandbox> {
    this.gets.push(name);
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new JournalSandbox(name, this.journal);
      this.#byName.set(name, sandbox);
      this.booted.push(sandbox);
    }
    return sandbox;
  }
}

/**
 * A collector that never receives a sandbox — the structural half of "exit is
 * not proof". It cannot read a container's exit code because it is handed no
 * way to reach one; every field of its input is a durable fact.
 */
class JournalCollector implements WorkerCollector {
  readonly seenKeys: string[][] = [];

  constructor(
    readonly journal: string[],
    readonly verdict: WorkerReport["verdict"] = WORKER_VERDICTS.readyToMerge
  ) {}

  async collect(task: WorkerTask): Promise<WorkerReport> {
    this.journal.push(`collect:${task.tick_id}`);
    this.seenKeys.push(Object.keys(task).sort());
    return {
      tick_id: task.tick_id,
      branch: task.branch,
      base_sha: task.base_sha,
      verdict: this.verdict,
      branch_exists: this.verdict !== WORKER_VERDICTS.noCommits,
      commits: this.verdict === WORKER_VERDICTS.noCommits ? 0 : 1,
      result_path: resultFile(task.tick_id),
      result_exists: true,
      status: STATUS_DONE,
      status_detail: "",
      status_line: "STATUS: DONE",
      boundary_files: [],
      detail: "",
    };
  }
}

const PROBE = { command: "/usr/local/bin/ticks-worker --probe", expect: "ticks-worker-probe-ok" };
const SPEC: WorkSpec = {
  probe: PROBE,
  command: "/usr/local/bin/ticks-worker",
  env: {},
  salvage: {
    command: "/usr/local/bin/ticks-worker --cancel",
    env: {},
    marker: "ticks-worker-cancel-requested",
  },
};

const task = (tickID: string): WorkerTask => ({
  tick_id: tickID,
  branch: workerBranch("692", tickID),
  base_sha: "b".repeat(40),
});

/** Drives every live process one stage forward per sleep. */
function stagedSleeper(
  binding: JournalBinding,
  opts: { finishWork: boolean }
): Sleeper {
  const spoke = new Set<string>();
  return async () => {
    for (const sandbox of binding.booted) {
      const process = sandbox.processes.at(-1);
      if (process === undefined || process.state !== "running") continue;
      if (process.command === PROBE.command) {
        process.say(`${PROBE.expect}\n`);
        process.finish(0);
        continue;
      }
      if (!spoke.has(process.id)) {
        spoke.add(process.id);
        process.say("implementing\n");
        continue;
      }
      if (opts.finishWork) process.finish(0);
    }
  };
}

const WAVE_TIMINGS = {
  probe_timeout_ms: 2_000,
  probe_poll_ms: 1,
  confirm_timeout_ms: 2_000,
  confirm_poll_ms: 1,
  wait_timeout_ms: 30 * 60_000,
  wait_poll_ms: 15_000,
};

// ===========================================================================
// SPEC §10.2 / Appendix A #1 — cleanup ordering
// ===========================================================================

describe("SPEC §10.2 and Appendix A #1: revoke before teardown, evidence before cleanup", () => {
  it("persists the worker's evidence before the container is destroyed", async () => {
    // §10.2's ordering: "worker report/evidence persisted → … → worktree/
    // branch/executor resources cleaned up". Collect reads the durable layer,
    // so on the ordinary path it runs while the container is still up and the
    // teardown follows it.
    const journal: string[] = [];
    const binding = new JournalBinding(journal);
    const collector = new JournalCollector(journal);

    await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run_compat", tickID),
      [task("mrq")],
      () => SPEC,
      { ...WAVE_TIMINGS, sleep: stagedSleeper(binding, { finishWork: true }) },
      collector
    );

    const collectAt = journal.indexOf("collect:mrq");
    const destroyAt = journal.indexOf(`destroy:${workerSandboxName("run_compat", "mrq")}`);
    expect(collectAt).toBeGreaterThanOrEqual(0);
    expect(destroyAt).toBeGreaterThanOrEqual(0);
    expect(collectAt).toBeLessThan(destroyAt);
  });

  it("revokes the run's credential before any container is torn down", async () => {
    // Appendix A #1: "Revoke before teardown: the money dies first, then the
    // work is rescued." Destroying a container is the stronger stop and the
    // slower one, and every second of teardown is a second the harness inside
    // it can still spend — so the credential dies the instant the wave is
    // found cancelled, ahead of the teardowns.
    const journal: string[] = [];
    const binding = new JournalBinding(journal);
    const collector = new JournalCollector(journal);
    const tasks = [task("mrq"), task("wl7")];

    // Cancel once every container is in its wait — a batch in flight, not a
    // wave that never started.
    const inWait = () =>
      tasks.every(
        (candidate) =>
          binding.gets.filter(
            (name) => name === workerSandboxName("run_compat", candidate.tick_id)
          ).length >= 2
      );
    const cancel = waveCanceller(
      async () =>
        inWait() ? { reason: "stopped:hard", detail: "the operator stopped this run" } : null,
      {
        poll_ms: 0,
        on_cancel: async () => {
          journal.push("revoke");
        },
      }
    );

    await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run_compat", tickID),
      tasks,
      () => SPEC,
      {
        ...WAVE_TIMINGS,
        sleep: stagedSleeper(binding, { finishWork: false }),
        cancel,
        salvage_grace_ms: 0,
        salvage_poll_ms: 1,
      },
      collector
    );

    const revokeAt = journal.indexOf("revoke");
    const destroys = journal
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.startsWith("destroy:"))
      .map(({ index }) => index);

    // Exactly one revoke for the whole wave: the canceller is shared, so the
    // first worker to see the stop decides it for all of them.
    expect(journal.filter((entry) => entry === "revoke")).toEqual(["revoke"]);
    expect(destroys).toHaveLength(tasks.length);
    for (const destroyAt of destroys) expect(revokeAt).toBeLessThan(destroyAt);

    // …and the container was ASKED to stop and push inside the window the
    // revoke bought, before it was destroyed.
    const salvageAt = journal.findIndex((entry) => entry.includes("--cancel"));
    expect(revokeAt).toBeLessThan(salvageAt);
    expect(salvageAt).toBeLessThan(destroys[0]!);
  });

  it("keeps a revoked credential refused, so nothing a restart does re-issues it", async () => {
    // Appendix A #1 again, at the credential layer: a stop is a durable
    // refusal to ISSUE, checked before every boot — not a revocation a
    // restart can undo. Revoking the row is what stops a wedged orchestrator
    // that ignores every message it is sent.
    await env.DB.prepare(
      `INSERT OR REPLACE INTO runs (run_id, project, epic, base_sha, requested_by, state, started_at, ended_at, cost_usd)
       VALUES ('run_revoke', 'acme/widgets', '692', 'b', 'operator', 'running', '2026-09-02T00:00:00Z', NULL, 0)`
    ).run();

    const issued = await issueRunToken(env, {
      run_id: "run_revoke",
      tick_id: "692",
      attempt: 1,
    });
    await expect(
      authorizeRunCredential(env, issued.token).then((result) => result.ok)
    ).resolves.toBe(true);

    const revoked = await revokeRunTokens(env, "run_revoke", "stopped:hard");
    expect(revoked).toBe(1);

    const denied = await authorizeRunCredential(env, issued.token);
    expect(denied.ok).toBe(false);
    // Four verdicts, kept distinct: "revoked" must never read as "unknown",
    // or an operator confirming their kill switch worked cannot tell.
    expect(denied.ok === false && denied.denial.error).toBe("run_token_revoked");
    expect(denied.ok === false && denied.denial.status).toBe(403);

    // A reboot rotates rather than reuses: the previous boot's credential is
    // dead before the replacement's is live, so two orchestrators can never
    // both be spending against one run.
    const reissued = await issueRunToken(env, {
      run_id: "run_revoke",
      tick_id: "692",
      attempt: 2,
    });
    expect(reissued.token).not.toBe(issued.token);
    const tokens = await listRunGatewayTokens(env.DB, "run_revoke");
    expect(tokens.map((row) => `${row.attempt}:${row.revoked_at === null ? "live" : "dead"}`)).toEqual([
      "1:dead",
      "2:live",
    ]);
  });

  it("hands collect only durable facts, so a container's exit cannot be the verdict", async () => {
    // §10.1: "Terminal output is useful diagnostic material, but it is not a
    // completion contract." The collector is handed a tick, a branch and a
    // base — no sandbox, no process, no exit code — so a container that
    // exited 0 having pushed nothing still collects as `no-commits`.
    const journal: string[] = [];
    const binding = new JournalBinding(journal);
    const collector = new JournalCollector(journal, WORKER_VERDICTS.noCommits);

    const [outcome] = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run_compat", tickID),
      [task("mrq")],
      () => SPEC,
      { ...WAVE_TIMINGS, sleep: stagedSleeper(binding, { finishWork: true }) },
      collector
    );

    expect(collector.seenKeys).toEqual([["base_sha", "branch", "tick_id"]]);
    expect(outcome!.wait?.exit_code).toBe(0);
    expect(outcome!.collect.verdict).toBe(WORKER_VERDICTS.noCommits);
    expect(outcome!.collect.commits).toBe(0);
  });
});
