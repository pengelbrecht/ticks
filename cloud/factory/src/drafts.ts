/**
 * Draft-tick triage: the human gate between "something arrived" and "the
 * factory spent money on it" (tick la9).
 *
 * A signal reaches the operator channel as a PROPOSAL with three buttons —
 * Create, Dispatch, Discard — and nothing has been written to the repository
 * when it does. This module is the surface: the message, the keyboard, the
 * callback vocabulary and what each press does. The proposal itself lives in
 * `signal-inbox.ts`, which is also the only thing that can turn one into a
 * tick.
 *
 * ## Why the draft is not a tick with a flag on it
 *
 * A tick marked `draft` would be a tick: in `.tick/issues/`, in a `git pull`,
 * and in front of every reader that forgets to filter it — `tk next`, `tk
 * ready`, a wave's sweep. The filter is the bug waiting to happen, so there is
 * no filter. A pending draft has no tick id, no record and no commit; the
 * tracker's status vocabulary has three values and none of them is `draft`
 * (`internal/tick/tick.go`, pinned by the parity fixture), so it could not be
 * written as a record even by a writer that tried.
 *
 * ## Why the buttons carry the project AND the draft id
 *
 * Callback data is `d:<project handle>:<draft id>:<verb>`, so a press names
 * exactly one proposal in exactly one project. That is what makes this surface
 * independent of yu8's free-text rules: a typed message has to be
 * disambiguated against every open question in the deployment and refuses when
 * it cannot, while a press cannot be ambiguous in the first place. It is also
 * why the id is random rather than sequential — in a shared chat, a guessable
 * id is a button somebody else's press could land on.
 *
 * The project half is younger than the draft half and it is there because the
 * epic's stated property — an approval can never be attributed to the wrong
 * project's gate — rested on nothing but keyspace odds without it. A draft id
 * is 48 random bits and is unique only within ONE project's inbox table; a
 * press that named only the id was resolved by asking every enrolled project
 * in turn and taking the first inbox that answered, so two projects that both
 * minted the same id would silently decide the wrong one's proposal. Naming
 * the pair makes that structural rather than improbable: see
 * {@link projectHandle} and {@link findDraft}, which refuse an ambiguous pair
 * instead of picking from it.
 *
 * ## Why the message must name its project
 *
 * A Create button under a message that does not say which repository it files
 * into is a trap, and this is a chat one bot serves many projects from. Every
 * proposal is rendered under the same context line the gates and reports use
 * (`message-context.ts`, tick spq) and posted into the project's own forum
 * topic from its enrolment record.
 *
 * ## Why the source composes the block and this module only frames it
 *
 * The proposal contains text a stranger wrote. `github-issues.ts` renders that
 * text under an invariant — every line the factory wrote begins at column 0
 * with `<b>`, every line the reporter wrote begins with `> ` — precisely so a
 * body imitating a gate message cannot forge one. Buttons make that sharper: a
 * spoofed message is a spoofed button. So this module never re-wraps or
 * un-quotes the block it is given; every line it adds of its own begins at
 * column 0 with `<b>`, and the invariant holds over the composed message.
 */

import { getEnrolledProject, listEnrolledProjects, type EnrolledProject } from "./db";
import { contextLine, type MessageContext } from "./message-context";
import { parseSubmission, submitRun } from "./runs";
import {
  DRAFT_ACTIONS,
  inboxFor,
  type Draft,
  type DraftAction,
  type DraftDecision,
} from "./signal-inbox";
import {
  editTelegramHTML,
  escapeHTML,
  sendTelegramHTML,
  type InlineButton,
  type TelegramRuntimeEnv,
} from "./telegram";
// Straight from the shared module rather than through `github-issues.ts`'s
// re-export: this surface renders drafts from EVERY source, and reaching the
// generic sanitiser through one source's module is how the next reader learns
// the wrong thing about who owns it.
import { sanitizeUntrustedLine } from "./untrusted-text";

import type { Env } from "./index";

/** The callback namespace for a decision. `q:`/`r:` are the RunRoom's; this is not one. */
export const DRAFT_CALLBACK_PREFIX = "d";
/** The callback namespace for retyping a proposal before it is filed. */
export const DRAFT_TYPE_CALLBACK_PREFIX = "y";

/** How many hex characters of {@link projectHandle} ride in a callback payload. */
export const PROJECT_HANDLE_CHARS = 8;

/**
 * A short, stable stand-in for `owner/repo` inside a callback payload.
 *
 * Telegram caps `callback_data` at 64 bytes and a project path is unbounded
 * prose (`some-long-organisation/some-long-repository` is ordinary), so the
 * project cannot simply be concatenated in. This is a DERIVED handle rather
 * than one assigned at enrolment for two reasons: it needs no new durable
 * state, no migration and no backfill for projects already enrolled, and it
 * cannot go stale — the handle of a project is a pure function of its name, so
 * a message posted before a redeploy still resolves after one.
 *
 * FNV-1a, and deliberately not a cryptographic hash: this value is not a
 * secret and guessing it buys nothing. The draft id is the unguessable half
 * (48 random bits) and stays so; this half only has to SAY which project the
 * press is for, and {@link findDraft} verifies it against the inbox that
 * actually holds the draft. It is also synchronous, which `crypto.subtle` is
 * not, so a keyboard can be rendered without an await.
 *
 * A collision between two enrolled projects is not a misattribution: it is a
 * refusal. See {@link findDraft}.
 */
export function projectHandle(project: string): string {
  // FNV-1a 32-bit. `Math.imul` keeps the multiply in 32-bit space, which a
  // plain `*` does not once the product passes 2^53.
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(project);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(PROJECT_HANDLE_CHARS, "0");
}

/**
 * The types a human may retype a proposal to.
 *
 * `epic` is deliberately absent: an epic is a container a human plans into,
 * and one arriving from a webhook as a single issue is not one. Everything
 * else `tk` has is here, because `github-issues.ts` files every consented
 * issue as a `bug` (UC3's case, never read from the issue text) and being
 * wrong about that should cost one press before the tick exists.
 */
export const DRAFT_TYPE_CHOICES = ["bug", "feature", "task", "chore"] as const;

/** What a press means. Every one of them names the PAIR it decides. */
export type DraftCallback =
  | { kind: "decide"; project_handle: string; draft_id: string; action: DraftAction }
  | { kind: "retype"; project_handle: string; draft_id: string; type: string };

export function draftCallbackData(project: string, draftID: string, action: DraftAction): string {
  return `${DRAFT_CALLBACK_PREFIX}:${projectHandle(project)}:${draftID}:${action}`;
}

export function draftTypeCallbackData(project: string, draftID: string, type: string): string {
  return `${DRAFT_TYPE_CALLBACK_PREFIX}:${projectHandle(project)}:${draftID}:${type}`;
}

/**
 * Reads one callback payload, or returns null.
 *
 * Null for anything that is not this module's, which is how the webhook route
 * can offer the draft surface a press first and still hand a question's press
 * to the RunRoom: the two namespaces cannot collide, so neither has to know
 * about the other's ids.
 *
 * A three-part payload — this module's shape before the project handle was
 * added — is also null. It is not accepted as a legacy form on purpose: a
 * payload that cannot say which project it decides is exactly the press this
 * change exists to stop resolving, and keeping a branch that resolves it
 * anyway would keep the hole open for as long as one old message survives in
 * the chat. The cost is that a proposal posted before the upgrade answers
 * "that proposal is no longer here" — the signal itself is untouched in the
 * inbox and `tk` can still show it.
 */
export function parseDraftCallback(data: unknown): DraftCallback | null {
  if (typeof data !== "string") return null;
  const parts = data.split(":");
  if (parts.length !== 4) return null;
  const [namespace, handle, draftID, verb] = parts as [string, string, string, string];
  if (!new RegExp(`^[0-9a-f]{${PROJECT_HANDLE_CHARS}}$`).test(handle)) return null;
  if (!/^[0-9a-f]{4,32}$/.test(draftID)) return null;
  if (namespace === DRAFT_CALLBACK_PREFIX) {
    return (DRAFT_ACTIONS as readonly string[]).includes(verb)
      ? { kind: "decide", project_handle: handle, draft_id: draftID, action: verb as DraftAction }
      : null;
  }
  if (namespace === DRAFT_TYPE_CALLBACK_PREFIX) {
    return (DRAFT_TYPE_CHOICES as readonly string[]).includes(verb)
      ? { kind: "retype", project_handle: handle, draft_id: draftID, type: verb }
      : null;
  }
  return null;
}

// ------------------------------------------------------------- the message ---

/** The context line every proposal carries: which project this would be filed into. */
export function draftContext(draft: Draft): MessageContext {
  return {
    project: draft.project,
    ...(draft.signal.parent === undefined ? {} : { epic: draft.signal.parent }),
    ...(draft.tick_id === null ? {} : { tick: draft.tick_id }),
  };
}

/**
 * How much of an external ref this block shows. A dedup key, not prose — the
 * funnel accepts up to `MAX_EXTERNAL_REF` (512) characters of it, and a
 * proposal is not the place to render all of them.
 */
export const MAX_RENDERED_EXTERNAL_REF = 120;

/**
 * The block a source did not compose, composed from structural fields only.
 *
 * A fallback rather than the normal path: a source that knows which of its
 * text is untrusted renders its own (see `renderIssueDraft`). Every value that
 * did not originate in this factory is flattened through
 * {@link sanitizeUntrustedLine} and then escaped here anyway, because this
 * function has no way to promise the caller did.
 *
 * `external_ref` is attacker-chosen exactly as the title is: it is whatever
 * the source's own id for the delivery happens to be, and a generic source
 * (tick 0vb) puts up to 512 characters of it in. Escaping alone is not enough
 * — `escapeHTML` touches `&`, `<`, `>` and `"` and nothing else, so a raw
 * newline in it would open a line at column 0 and a bidi override would
 * reorder what follows, both of which are the forgery this module's invariant
 * exists to make impossible. The sanitiser is what strips them, and every
 * untrusted single-line value in this Worker goes through it.
 *
 * `project` and `source` are NOT untrusted: the funnel validates them against
 * `PROJECT_PATTERN` and `SIGNAL_SOURCE_PATTERN` before a draft exists, so
 * neither can carry a line break in the first place.
 */
function fallbackBlock(draft: Draft): string {
  return [
    "<b>Draft tick — nothing runs until a human says so</b>",
    `<b>Project:</b> ${escapeHTML(draft.project)}`,
    `<b>Source:</b> ${escapeHTML(draft.source)} — ${escapeHTML(
      sanitizeUntrustedLine(draft.external_ref, MAX_RENDERED_EXTERNAL_REF)
    )}`,
    `<b>Title:</b> ${escapeHTML(sanitizeUntrustedLine(draft.title, 180))}`,
  ].join("\n");
}

/**
 * One proposal as the channel shows it.
 *
 * Every line this function contributes starts at column 0 with `<b>`; the
 * source's block is passed through untouched. So the anti-forgery invariant
 * the source keeps is the invariant the composed message has.
 */
export function renderDraft(draft: Draft): string {
  const context = contextLine(draftContext(draft));
  const block = draft.presentation.trim() === "" ? fallbackBlock(draft) : draft.presentation;
  return [
    ...(context === "" ? [] : [`<b>${escapeHTML(context)}</b>`]),
    block,
    `<b>Type:</b> ${escapeHTML(draft.type)} — Create files it as this.`,
    "<b>Nothing has been filed yet.</b> Create accepts it as an open tick. " +
      "Dispatch accepts it and starts a run. Discard files nothing and settles the signal.",
  ].join("\n");
}

/** The same message once a human has decided, with what the decision did. */
export function renderDecidedDraft(draft: Draft, footer: string): string {
  const context = contextLine(draftContext(draft));
  const block = draft.presentation.trim() === "" ? fallbackBlock(draft) : draft.presentation;
  return [...(context === "" ? [] : [`<b>${escapeHTML(context)}</b>`]), block, footer].join("\n");
}

/** The three verbs, and the retype row under them. */
export function draftKeyboard(draft: Draft): InlineButton[][] {
  return [
    [
      { text: "Create", callback_data: draftCallbackData(draft.project, draft.id, "create") },
      { text: "Dispatch", callback_data: draftCallbackData(draft.project, draft.id, "dispatch") },
      { text: "Discard", callback_data: draftCallbackData(draft.project, draft.id, "discard") },
    ],
    DRAFT_TYPE_CHOICES.map((type) => ({
      text: type === draft.type ? `• ${type}` : type,
      callback_data: draftTypeCallbackData(draft.project, draft.id, type),
    })),
  ];
}

/** Which topic this project's messages go into, from its enrolment record. */
function routingFor(enrolment: EnrolledProject): { topic_id?: string } {
  return enrolment.telegram_topic_id === undefined
    ? {}
    : { topic_id: enrolment.telegram_topic_id };
}

/**
 * Posts one proposal into the project's topic and remembers where it landed.
 *
 * The ref is stored on the draft so a decision can be shown on the same
 * message rather than as a loose reply — a chat where the button is still
 * there after it has been pressed is a chat where it gets pressed twice.
 */
export async function deliverDraft(
  env: Env,
  enrolment: EnrolledProject,
  draft: Draft
): Promise<Draft> {
  const ref = await sendTelegramHTML(env as TelegramRuntimeEnv, renderDraft(draft), {
    ...routingFor(enrolment),
    keyboard: draftKeyboard(draft),
  });
  const updated = await inboxFor(env, draft.project).attachDraftMessage(draft.id, {
    channel_id: ref.channel_id ?? "",
    message_id: ref.message_id ?? "",
  });
  return updated ?? draft;
}

/** Re-renders a proposal in place, after a retype. */
async function refreshDraft(env: Env, draft: Draft): Promise<void> {
  if (draft.message === null) return;
  await editTelegramHTML(env as TelegramRuntimeEnv, draft.message, renderDraft(draft), {
    keyboard: draftKeyboard(draft),
  });
}

/** Settles a proposal's message: the decision, and no buttons left to press. */
async function settleDraftMessage(env: Env, draft: Draft, footer: string): Promise<void> {
  if (draft.message === null) return;
  await editTelegramHTML(env as TelegramRuntimeEnv, draft.message, renderDecidedDraft(draft, footer), {
    keyboard: [],
  });
}

// ------------------------------------------------------------- the decision ---

/**
 * What resolving a press's `(project handle, draft id)` pair found.
 *
 * Three cases, not two: `ambiguous` is the one that makes the binding
 * structural. See {@link findDraft}.
 */
export type DraftLookup =
  | { state: "found"; enrolment: EnrolledProject; draft: Draft }
  | { state: "unknown" }
  | { state: "ambiguous"; projects: string[] };

/**
 * Resolves the pair a press names, or refuses to.
 *
 * The press carries a project handle and a draft id, and BOTH are checked: the
 * enrolled projects are narrowed to the ones whose {@link projectHandle}
 * matches, and only their inboxes are asked. That is the whole change from the
 * scan this used to be, and it is what turns "the first inbox that answers" —
 * a rule that silently decides another project's draft when two ids collide —
 * into an answer about the pair the operator actually pressed.
 *
 * The handle is derived, so two enrolled projects CAN in principle share one.
 * That is not a misattribution here, it is a refusal: if more than one of them
 * holds a draft with this id, the press names two proposals and this function
 * says so rather than choosing. An approval is therefore never attributed to
 * the wrong project's gate — not improbably, but by construction. (One
 * matching project holding the draft is the only case that decides anything,
 * so a handle collision between projects that do NOT both hold the id costs
 * nothing at all.)
 */
export async function findDraft(
  env: Env,
  projectHandleWanted: string,
  draftID: string
): Promise<DraftLookup> {
  const candidates = (await listEnrolledProjects(env.DB)).filter(
    (enrolment) => projectHandle(enrolment.project) === projectHandleWanted
  );
  const found: { enrolment: EnrolledProject; draft: Draft }[] = [];
  for (const enrolment of candidates) {
    const draft = await inboxFor(env, enrolment.project).getDraft(draftID);
    if (draft !== null) found.push({ enrolment, draft });
  }
  if (found.length === 0) return { state: "unknown" };
  if (found.length > 1) {
    return { state: "ambiguous", projects: found.map((hit) => hit.enrolment.project).sort() };
  }
  return { state: "found", enrolment: found[0]!.enrolment, draft: found[0]!.draft };
}

/** What the channel says back, and what the route reports. */
export type DraftPressResult = {
  /** The short line the callback toast shows. */
  toast: string;
  /** The JSON body of the webhook response. */
  body: Record<string, unknown>;
};

/**
 * One press, all the way through: decide, ignite if asked, then say so on the
 * message that carried the button.
 */
export async function handleDraftPress(
  env: Env,
  callback: DraftCallback,
  decidedBy: string
): Promise<DraftPressResult> {
  const found = await findDraft(env, callback.project_handle, callback.draft_id);
  if (found.state === "unknown") {
    return {
      toast: "That proposal is no longer here.",
      body: { ok: true, draft: false, matched: false, reason: "unknown_draft" },
    };
  }
  if (found.state === "ambiguous") {
    // Nothing is decided and nothing is filed. Two enrolled projects hold a
    // draft with this id behind one handle, so the press names two proposals —
    // and deciding either of them would be exactly the misattribution this
    // pair exists to prevent.
    console.error(
      `factory drafts: press ${callback.project_handle}:${callback.draft_id} names ` +
        `${found.projects.join(" and ")}; nothing was decided`
    );
    return {
      toast: "That press names more than one proposal. Nothing was decided.",
      body: {
        ok: false,
        draft: true,
        decided: false,
        matched: false,
        reason: "ambiguous_draft",
        projects: found.projects,
      },
    };
  }
  const { enrolment } = found;

  if (callback.kind === "retype") {
    const edit = await inboxFor(env, found.draft.project).setDraftType(
      found.draft.id,
      callback.type,
      decidedBy
    );
    if (!edit.ok) {
      return {
        toast:
          edit.error === "already_decided"
            ? "That proposal has already been decided."
            : edit.detail,
        body: { ok: true, draft: true, retyped: false, reason: edit.error },
      };
    }
    await refreshDraft(env, edit.draft).catch((error) =>
      console.error(`factory drafts: retype render failed for ${edit.draft.id}: ${String(error)}`)
    );
    return {
      toast: `This would be filed as a ${callback.type}.`,
      body: { ok: true, draft: true, retyped: true, draft_id: edit.draft.id, type: callback.type },
    };
  }

  const decision = await inboxFor(env, found.draft.project).decide(
    found.draft.id,
    callback.action,
    decidedBy
  );
  return await presentDecision(env, enrolment, callback.action, decision, decidedBy);
}

async function presentDecision(
  env: Env,
  enrolment: EnrolledProject,
  action: DraftAction,
  decision: DraftDecision,
  decidedBy: string
): Promise<DraftPressResult> {
  if (decision.state === "unknown_draft") {
    return {
      toast: "That proposal is no longer here.",
      body: { ok: true, draft: false, matched: false, reason: "unknown_draft" },
    };
  }

  if (decision.state === "already_decided") {
    const draft = decision.draft;
    return {
      toast:
        draft.state === "committing"
          ? "That proposal is being filed right now."
          : `Already ${draft.state}${draft.decided_by === null ? "" : ` by ${draft.decided_by}`}.`,
      body: {
        ok: true,
        draft: true,
        decided: false,
        already_decided: true,
        draft_id: draft.id,
        state: draft.state,
      },
    };
  }

  if (decision.state === "deferred") {
    // Nothing was written and the draft is still pending, so the honest answer
    // is "press again" rather than a settled-looking message edit.
    return {
      toast: "Nothing was filed — the tracker did not settle. Try again.",
      body: {
        ok: false,
        draft: true,
        decided: false,
        reason: decision.reason,
        detail: decision.detail,
        draft_id: decision.draft.id,
      },
    };
  }

  if (decision.state === "discarded") {
    const draft = decision.draft;
    await settleDraftMessage(
      env,
      draft,
      `<b>Discarded by ${escapeHTML(decidedBy)}.</b> Nothing was filed. The signal is settled, ` +
        "so its source will not propose it again."
    ).catch((error) =>
      console.error(`factory drafts: discard render failed for ${draft.id}: ${String(error)}`)
    );
    return {
      toast: "Discarded. Nothing was filed.",
      body: {
        ok: true,
        draft: true,
        decided: true,
        action: "discard",
        draft_id: draft.id,
        project: draft.project,
      },
    };
  }

  if (decision.state === "reconciled") {
    // A press that landed on a proposal an evicted instance left mid-commit,
    // and the tracker says the commit had in fact landed. Nothing was filed by
    // THIS press and nothing was started; what changed is that the inbox has
    // caught up with the repository, and the message finally says which tick
    // the proposal became instead of a button that does nothing forever.
    const draft = decision.draft;
    await settleDraftMessage(
      env,
      draft,
      `<b>Already filed as tick ${escapeHTML(decision.tick_id)}</b> in ${escapeHTML(draft.project)}. ` +
        "An earlier press committed it and this factory was interrupted before it could say so; " +
        "the tracker has been checked and nothing was filed twice."
    ).catch((error) =>
      console.error(`factory drafts: reconcile render failed for ${draft.id}: ${String(error)}`)
    );
    return {
      toast: `Already filed as tick ${decision.tick_id}.`,
      body: {
        ok: true,
        draft: true,
        decided: false,
        reconciled: true,
        draft_id: draft.id,
        project: draft.project,
        tick_id: decision.tick_id,
        state: draft.state,
      },
    };
  }

  // Accepted: the tick exists from here on, whatever happens to the run.
  const draft = decision.draft;
  const filed =
    `<b>Created by ${escapeHTML(decidedBy)}</b> — tick ${escapeHTML(decision.tick_id)} is open in ` +
    `${escapeHTML(draft.project)} (${escapeHTML(decision.commit_sha.slice(0, 12))}).`;

  if (action === "create") {
    await settleDraftMessage(env, draft, filed).catch((error) =>
      console.error(`factory drafts: create render failed for ${draft.id}: ${String(error)}`)
    );
    return {
      toast: `Created tick ${decision.tick_id}.`,
      body: {
        ok: true,
        draft: true,
        decided: true,
        action: "create",
        draft_id: draft.id,
        project: draft.project,
        tick_id: decision.tick_id,
        path: decision.path,
        commit_sha: decision.commit_sha,
      },
    };
  }

  const ignition = await igniteDraft(env, draft, decision.tick_id, decision.commit_sha, decidedBy);
  const decided =
    ignition.run_id === null
      ? `${filed}\n<b>The run did not start:</b> ${escapeHTML(ignition.detail)}`
      : `${filed}\n<b>Run ${escapeHTML(ignition.run_id)} started.</b>`;
  await settleDraftMessage(env, ignition.draft, decided).catch((error) =>
    console.error(`factory drafts: dispatch render failed for ${draft.id}: ${String(error)}`)
  );
  void enrolment;
  return {
    toast:
      ignition.run_id === null
        ? `Created tick ${decision.tick_id}; the run did not start.`
        : `Created tick ${decision.tick_id} and started ${ignition.run_id}.`,
    body: {
      ok: true,
      draft: true,
      decided: true,
      action: "dispatch",
      draft_id: draft.id,
      project: draft.project,
      tick_id: decision.tick_id,
      path: decision.path,
      commit_sha: decision.commit_sha,
      ...(ignition.run_id === null
        ? { run_started: false, detail: ignition.detail }
        : { run_started: true, run_id: ignition.run_id }),
    },
  };
}

/**
 * The run half of Dispatch.
 *
 * The base sha is the commit that carries the accepted tick, which is exactly
 * right and not a convenience: the run clones at a commit, and this is the
 * first commit in which the tick it was dispatched to work exists.
 *
 * A tick with a parent is dispatched as a one-tick wave under that epic; a
 * tick without one IS the epic the run works through, because a run is
 * addressed by an epic and there is no other tick to name. A refusal — the
 * project is busy, the deployment has no Workflow binding — is reported and
 * never retried silently: the tick is filed either way, and an operator who
 * can see why can press run themselves.
 */
async function igniteDraft(
  env: Env,
  draft: Draft,
  tickID: string,
  commitSHA: string,
  requestedBy: string
): Promise<{ run_id: string | null; detail: string; draft: Draft }> {
  const parent = draft.signal.parent;
  const parsed = parseSubmission({
    project: draft.project,
    epic: parent ?? tickID,
    base_sha: commitSHA,
    requested_by: requestedBy,
    // THE FAR SIDE OF THE DISCONTINUITY (D20, tick hyi). This id was minted
    // when a message arrived, possibly days ago, and has been sitting in the
    // inbox's draft row ever since; the press that got here was made by a
    // different person on a different surface from a different request. It is
    // read out of durable state and handed on, and `parseSubmission` keeps a
    // supplied id rather than minting — which is the whole reason it keeps one.
    // A draft admitted before trace ids existed carries none, and the
    // submission mints its own rather than pretending to a chain it lacks.
    ...(draft.trace_id === "" ? {} : { trace_id: draft.trace_id }),
    queue: false,
    ...(parent === undefined ? {} : { tick_ids: [tickID] }),
  });
  if (!parsed.ok) {
    return { run_id: null, detail: parsed.detail, draft };
  }

  const result = await submitRun(env, parsed.submission);
  if (result.outcome !== "started") {
    const detail =
      result.outcome === "refused"
        ? `${draft.project} is busy with run ${result.holder.run_id}`
        : result.outcome === "queued"
          ? `queued behind run ${result.holder.run_id}`
          : result.detail;
    return { run_id: null, detail, draft };
  }

  const runID = result.started.run.run_id;
  const updated = await inboxFor(env, draft.project).attachDraftRun(draft.id, runID);
  return { run_id: runID, detail: "", draft: updated ?? draft };
}

/**
 * Posts a freshly admitted proposal, when the deployment has a channel and the
 * project is enrolled.
 *
 * Failures are logged, never thrown: the draft is durable in the inbox the
 * moment `submit` returns, and a Telegram outage must not turn a settled
 * ingestion into a redelivery that proposes it a second time.
 */
export async function announceDraft(env: Env, project: string, draftID: string): Promise<Draft | null> {
  const enrolment = await getEnrolledProject(env.DB, project);
  if (enrolment === null) return null;
  const draft = await inboxFor(env, project).getDraft(draftID);
  if (draft === null) return null;
  try {
    return await deliverDraft(env, enrolment, draft);
  } catch (error) {
    console.error(`factory drafts: could not post draft ${draftID} for ${project}: ${String(error)}`);
    return draft;
  }
}
