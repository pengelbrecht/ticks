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
 * ## Why the buttons carry the draft id
 *
 * Callback data is `d:<draft id>:<verb>`, so a press names exactly one
 * proposal in exactly one project. That is what makes this surface independent
 * of yu8's free-text rules: a typed message has to be disambiguated against
 * every open question in the deployment and refuses when it cannot, while a
 * press cannot be ambiguous in the first place. It is also why the id is
 * random rather than sequential — in a shared chat, a guessable id is a
 * button somebody else's press could land on.
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
import { sanitizeUntrustedLine } from "./github-issues";
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

import type { Env } from "./index";

/** The callback namespace for a decision. `q:`/`r:` are the RunRoom's; this is not one. */
export const DRAFT_CALLBACK_PREFIX = "d";
/** The callback namespace for retyping a proposal before it is filed. */
export const DRAFT_TYPE_CALLBACK_PREFIX = "y";

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

/** What a press means. */
export type DraftCallback =
  | { kind: "decide"; draft_id: string; action: DraftAction }
  | { kind: "retype"; draft_id: string; type: string };

export function draftCallbackData(draftID: string, action: DraftAction): string {
  return `${DRAFT_CALLBACK_PREFIX}:${draftID}:${action}`;
}

export function draftTypeCallbackData(draftID: string, type: string): string {
  return `${DRAFT_TYPE_CALLBACK_PREFIX}:${draftID}:${type}`;
}

/**
 * Reads one callback payload, or returns null.
 *
 * Null for anything that is not this module's, which is how the webhook route
 * can offer the draft surface a press first and still hand a question's press
 * to the RunRoom: the two namespaces cannot collide, so neither has to know
 * about the other's ids.
 */
export function parseDraftCallback(data: unknown): DraftCallback | null {
  if (typeof data !== "string") return null;
  const parts = data.split(":");
  if (parts.length !== 3) return null;
  const [namespace, draftID, verb] = parts as [string, string, string];
  if (!/^[0-9a-f]{4,32}$/.test(draftID)) return null;
  if (namespace === DRAFT_CALLBACK_PREFIX) {
    return (DRAFT_ACTIONS as readonly string[]).includes(verb)
      ? { kind: "decide", draft_id: draftID, action: verb as DraftAction }
      : null;
  }
  if (namespace === DRAFT_TYPE_CALLBACK_PREFIX) {
    return (DRAFT_TYPE_CHOICES as readonly string[]).includes(verb)
      ? { kind: "retype", draft_id: draftID, type: verb }
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
 * The block a source did not compose, composed from structural fields only.
 *
 * A fallback rather than the normal path: a source that knows which of its
 * text is untrusted renders its own (see `renderIssueDraft`). The title is
 * flattened and escaped here anyway, because this function has no way to
 * promise the caller did.
 */
function fallbackBlock(draft: Draft): string {
  return [
    "<b>Draft tick — nothing runs until a human says so</b>",
    `<b>Project:</b> ${escapeHTML(draft.project)}`,
    `<b>Source:</b> ${escapeHTML(draft.source)} — ${escapeHTML(draft.external_ref)}`,
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
      { text: "Create", callback_data: draftCallbackData(draft.id, "create") },
      { text: "Dispatch", callback_data: draftCallbackData(draft.id, "dispatch") },
      { text: "Discard", callback_data: draftCallbackData(draft.id, "discard") },
    ],
    DRAFT_TYPE_CHOICES.map((type) => ({
      text: type === draft.type ? `• ${type}` : type,
      callback_data: draftTypeCallbackData(draft.id, type),
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

/** Which project's inbox holds this draft. */
export async function findDraft(
  env: Env,
  draftID: string
): Promise<{ enrolment: EnrolledProject; draft: Draft } | null> {
  for (const enrolment of await listEnrolledProjects(env.DB)) {
    const draft = await inboxFor(env, enrolment.project).getDraft(draftID);
    if (draft !== null) return { enrolment, draft };
  }
  return null;
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
  const found = await findDraft(env, callback.draft_id);
  if (found === null) {
    return {
      toast: "That proposal is no longer here.",
      body: { ok: true, draft: false, matched: false, reason: "unknown_draft" },
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
