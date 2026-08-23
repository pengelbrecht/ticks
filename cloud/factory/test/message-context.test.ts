import { describe, expect, it } from "vitest";

import fixture from "./fixtures/message-context.json";

import {
  MESSAGE_CONTEXT_EPIC_PREFIX,
  MESSAGE_CONTEXT_SEPARATOR,
  MESSAGE_CONTEXT_TICK_PREFIX,
  contextLine,
  withContext,
  type MessageContext,
} from "../src/message-context";

// The other reader of this fixture is
// internal/operator/message_context_parity_test.go. Both compose the line a
// human uses to tell two projects apart in one shared chat, and a drift
// between them is invisible unless something checks.
describe("the project/epic/tick line", () => {
  it("composes every line the shared fixture pins", () => {
    for (const testCase of fixture.cases) {
      expect(contextLine(testCase.context as MessageContext), testCase.name).toBe(testCase.line);
    }
  });

  it("prefixes a message exactly as the shared fixture pins", () => {
    for (const example of fixture.prefix_examples) {
      expect(withContext(example.context as MessageContext, example.body), example.name).toBe(
        example.prefixed
      );
    }
  });

  it("uses the separators the shared fixture pins", () => {
    expect(MESSAGE_CONTEXT_SEPARATOR).toBe(fixture.separator);
    expect(MESSAGE_CONTEXT_EPIC_PREFIX).toBe(fixture.epic_prefix);
    expect(MESSAGE_CONTEXT_TICK_PREFIX).toBe(fixture.tick_prefix);
  });

  it("composes distinguishable messages for two projects asking the same question", () => {
    const question = "Approve the merge?";
    const web = withContext({ project: "acme/web", epic: "4f2", tick: "8sm" }, question);
    const api = withContext({ project: "acme/api", epic: "4f2", tick: "8sm" }, question);

    expect(web).not.toBe(api);
    expect(web).toContain("acme/web");
    expect(api).toContain("acme/api");
    expect(web).not.toContain("acme/api");
    expect(api).not.toContain("acme/web");
  });
});
