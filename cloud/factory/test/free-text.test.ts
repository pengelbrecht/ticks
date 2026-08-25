import { describe, expect, it } from "vitest";

import {
  bareTextOf,
  renderFreeTextRefusal,
  resolveFreeText,
  type FreeTextCandidate,
} from "../src/free-text";

/**
 * The correctness boundary of a free-text answer.
 *
 * The rule is the operator's and it is fail-closed on purpose: one open
 * question resolves, two or more refuse. The reason is provenance rather than
 * tidiness — an approval carries human authority into the verdict guard, so a
 * guess does not answer the wrong question, it attributes the operator's
 * consent to another project's gate.
 */

function candidate(
  project: string,
  id: string,
  extra: Partial<FreeTextCandidate["entry"]> = {}
): FreeTextCandidate {
  return {
    project,
    entry: {
      id,
      question: { text: "Ship it?" },
      ...extra,
    } as FreeTextCandidate["entry"],
  };
}

describe("what counts as a bare message", () => {
  const chat = { id: -1001919191 };
  const from = { id: 424242 };

  it("is the text of a message that replies to nothing", () => {
    expect(bareTextOf({ message: { message_id: 92, chat, from, text: "  main  " } })).toBe("main");
  });

  it("is not a reply — the deterministic path owns that message and may refuse it", () => {
    expect(
      bareTextOf({
        message: { message_id: 92, chat, from, text: "main", reply_to_message: { message_id: 91 } },
      })
    ).toBeNull();
  });

  // A forum threads the first message of a topic onto the topic-creation
  // service message, so Telegram calls it a reply. Somebody typing into a
  // topic is answering nothing, which makes it bare text, not a correlation.
  it("is bare text when the only 'reply' is the topic-creation service message", () => {
    expect(
      bareTextOf({
        message: {
          message_id: 92,
          chat,
          from,
          message_thread_id: 91,
          reply_to_message: { message_id: 91, forum_topic_created: { name: "acme/web" } },
          text: "main",
        },
      })
    ).toBe("main");
  });

  it("is not a callback press", () => {
    expect(
      bareTextOf({
        callback_query: { id: "cb-1", from, data: "q:q123:0", message: { message_id: 91, chat } },
      })
    ).toBeNull();
  });

  it("is not a command — privacy mode delivers those to the bot too", () => {
    expect(bareTextOf({ message: { message_id: 92, chat, from, text: "/start" } })).toBeNull();
  });

  it("is not an empty or whitespace-only message", () => {
    expect(bareTextOf({ message: { message_id: 92, chat, from, text: "   " } })).toBeNull();
    expect(bareTextOf({ message: { message_id: 92, chat, from } })).toBeNull();
  });
});

describe("a bare answer resolves exactly one question, or refuses", () => {
  it("resolves the single open question when there is exactly one", () => {
    const only = candidate("acme/web", "q-web");
    expect(resolveFreeText("main", [only])).toEqual({
      kind: "resolved",
      candidate: only,
      outcome: { status: "answered", text: "main" },
    });
  });

  it("matches an option by label or id, exactly as a reply-to answer does", () => {
    const gate = candidate("acme/web", "q-web", {
      question: {
        text: "Ship it?",
        options: [
          { id: "approve", label: "Approve" },
          { id: "reject", label: "Reject" },
        ],
      },
    });
    expect(resolveFreeText("approve", [gate])).toMatchObject({
      kind: "resolved",
      outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
    });
    expect(resolveFreeText("Reject", [gate])).toMatchObject({
      kind: "resolved",
      outcome: { status: "answered", text: "Reject", option_ids: ["reject"] },
    });
  });

  it("refuses when two questions are open in DIFFERENT projects — the count is the total", () => {
    const web = candidate("acme/web", "q-web", { epic: "4f2", tick_id: "8sm" });
    const api = candidate("acme/api", "q-api", { epic: "9kk", tick_id: "3ab" });
    const resolution = resolveFreeText("approve", [web, api]);
    expect(resolution).toEqual({ kind: "refused", reason: "ambiguous", candidates: [web, api] });
  });

  it("refuses when two questions are open in the SAME project", () => {
    const first = candidate("acme/web", "q-one");
    const second = candidate("acme/web", "q-two");
    expect(resolveFreeText("main", [first, second])).toMatchObject({
      kind: "refused",
      reason: "ambiguous",
    });
  });

  it("refuses rather than guess when the one open question's options do not match", () => {
    const gate = candidate("acme/web", "q-web", {
      question: {
        text: "Ship it?",
        options: [
          { id: "approve", label: "Approve" },
          { id: "reject", label: "Reject" },
        ],
      },
    });
    expect(resolveFreeText("yes please", [gate])).toMatchObject({
      kind: "refused",
      reason: "unmatched",
      candidates: [gate],
    });
  });

  it("takes free text on an options question that allows one", () => {
    const gate = candidate("acme/web", "q-web", {
      question: {
        text: "Ship it?",
        allow_other: true,
        options: [{ id: "approve", label: "Approve" }],
      },
    });
    expect(resolveFreeText("hold until Monday", [gate])).toMatchObject({
      kind: "resolved",
      outcome: { status: "answered", text: "hold until Monday" },
    });
  });

  it("does nothing at all when no question is open", () => {
    expect(resolveFreeText("main", [])).toEqual({ kind: "none" });
  });
});

describe("the refusal is useful enough to act on", () => {
  const web = candidate("acme/web", "q-web", {
    epic: "4f2",
    tick_id: "8sm",
    question: {
      text: "Ship it?",
      options: [
        { id: "approve", label: "Approve" },
        { id: "reject", label: "Reject" },
      ],
    },
  });
  const api = candidate("acme/api", "q-api", {
    epic: "9kk",
    tick_id: "3ab",
    question: { text: "Which base branch?" },
  });

  it("names every candidate's project, epic and tick, and its question", () => {
    const text = renderFreeTextRefusal({
      kind: "refused",
      reason: "ambiguous",
      candidates: [web, api],
    });
    // The same composition every other message uses, not a second format.
    expect(text).toContain("acme/web · epic 4f2 · tick 8sm");
    expect(text).toContain("acme/api · epic 9kk · tick 3ab");
    expect(text).toContain("Ship it?");
    expect(text).toContain("Which base branch?");
  });

  it("says how to answer each one unambiguously", () => {
    const text = renderFreeTextRefusal({
      kind: "refused",
      reason: "ambiguous",
      candidates: [web, api],
    });
    expect(text).toMatch(/reply/i);
    // The options of the gate are the other unambiguous way to settle it.
    expect(text).toContain("Approve");
    expect(text).toContain("Reject");
  });

  it("states that nothing was answered, so silence is never read as consent", () => {
    const text = renderFreeTextRefusal({
      kind: "refused",
      reason: "ambiguous",
      candidates: [web, api],
    });
    expect(text).toMatch(/nothing was answered/i);
    expect(text).toContain("2");
  });

  it("says which options it wanted when the single question's options did not match", () => {
    const text = renderFreeTextRefusal({
      kind: "refused",
      reason: "unmatched",
      candidates: [web],
    });
    expect(text).toMatch(/nothing was answered/i);
    expect(text).toContain("Approve");
    expect(text).toContain("acme/web · epic 4f2 · tick 8sm");
  });
});
