import { describe, expect, it } from "vitest";

import contract from "../../../contracts/collect-vocabulary.json";
import {
  parseStatus,
  needsHuman,
  STATUS_BLOCKED,
  STATUS_DONE,
  STATUS_DONE_WITH_CONCERNS,
  STATUS_LINE,
  STATUS_NEEDS_CONTEXT,
  WORKER_VERDICTS,
  type WorkerReport,
} from "../src/worker-collect";

/**
 * The collect vocabulary has THREE implementations (tick hn1).
 *
 * This module is the third: `internal/herd/collect` reads a local herdr
 * worktree, `internal/cloud/collect` reads the same remote branch from the
 * laptop, and `worker-collect.ts` reads it from the Worker through GitHub's
 * API. The first two were the same type by import until epic 3j4; they are
 * copies now, and this one always was one.
 *
 * The failure mode of three copies is silent and it INVERTS A VERDICT: re-spell
 * `NEEDS_CONTEXT` or `ready-to-merge` in one place and a cloud run and a herd
 * run disagree about what happened to the same tick, with nothing failing
 * anywhere. So all three read `contracts/collect-vocabulary.json` — this file
 * is the Worker's end of it, and
 * `internal/{herd,cloud}/collect/contract_test.go` are the other two.
 *
 * The direction that matters: every assertion below is against the SHARED file,
 * never against another copy of the strings. A test that restated the constants
 * inline would be a fourth copy.
 */

const parseCases = contract.parse_cases.cases;

describe("the collect vocabulary, shared with the two Go implementations", () => {
  it("spells the four verdicts the way the contract does", () => {
    expect({
      ready_to_merge: WORKER_VERDICTS.readyToMerge,
      no_commits: WORKER_VERDICTS.noCommits,
      missing_result: WORKER_VERDICTS.missingResult,
      boundary_violation: WORKER_VERDICTS.boundaryViolation,
    }).toEqual({
      ready_to_merge: contract.verdicts.ready_to_merge,
      no_commits: contract.verdicts.no_commits,
      missing_result: contract.verdicts.missing_result,
      boundary_violation: contract.verdicts.boundary_violation,
    });
  });

  /**
   * `unknown` is the one verdict `internal/herd/collect` does not define: only
   * an implementation reading a REMOTE can fail to read the evidence at all.
   * `internal/cloud/collect` has it too, and pins the same contract entry.
   */
  it("spells the remote-only unknown verdict the way the contract does", () => {
    expect(WORKER_VERDICTS.unknown).toBe(contract.remote_only_verdicts.unknown);
    expect(Object.values(contract.verdicts)).not.toContain(WORKER_VERDICTS.unknown);
  });

  it("spells the four statuses the way the contract does", () => {
    expect({
      done: STATUS_DONE,
      done_with_concerns: STATUS_DONE_WITH_CONCERNS,
      needs_context: STATUS_NEEDS_CONTEXT,
      blocked: STATUS_BLOCKED,
    }).toEqual({
      done: contract.statuses.done,
      done_with_concerns: contract.statuses.done_with_concerns,
      needs_context: contract.statuses.needs_context,
      blocked: contract.statuses.blocked,
    });
  });

  /**
   * Pinned apart from the status words because dropping one is not a spelling
   * change — it silently stops a human being told about a worker that asked
   * for help.
   */
  it("escalates exactly the statuses the contract says are escalations", () => {
    const escalates = new Set<string>(contract.needs_human_statuses.statuses);
    for (const status of Object.values(contract.statuses)) {
      if (typeof status !== "string") continue; // the `why` prose
      const report = { status } as WorkerReport;
      expect(needsHuman(report), `needsHuman(${status})`).toBe(escalates.has(status));
    }
  });

  /**
   * THE ALTERNATION ORDER, pinned as text.
   *
   * `DONE_WITH_CONCERNS` must precede `DONE`, or a weakened regexp reads
   * `STATUS: DONE_WITH_CONCERNS` as `DONE` — a verdict inversion on the exact
   * status a human most needs to see. Today that inversion is defended twice:
   * by the order, and by the `\b` after the capture group (`_` is a word
   * character, so `DONE\b` cannot match inside `DONE_WITH_CONCERNS`). Because
   * the two defences overlap, NO input distinguishes a re-ordered alternation
   * on its own — which is why the pattern TEXT is pinned here, byte-for-byte,
   * against what `regexp.String()` returns in both Go implementations. The
   * `done_with_concerns_*` parse cases below catch the other half: they fail
   * the moment the `\b` guard goes.
   */
  it("holds the status-line pattern the two Go implementations hold", () => {
    expect(STATUS_LINE.source).toBe(contract.status_line_pattern.pattern);
  });

  /**
   * The trim set cannot be compared as text across a `strings.Trim` cutset and
   * a character class, so it is pinned behaviourally from both sides. A set
   * that quietly GROWS fails here as loudly as one that shrinks.
   */
  it("trims exactly the markdown decoration the contract lists", () => {
    for (const char of contract.decoration.trimmed) {
      const body = `${char}STATUS: DONE${char}`;
      expect(parseStatus(body).status, `${JSON.stringify(char)} is in the shared trim set`).toBe(
        STATUS_DONE
      );
    }
    for (const char of contract.decoration.not_trimmed) {
      const body = `${char}STATUS: DONE${char}`;
      expect(parseStatus(body).status, `${JSON.stringify(char)} is NOT in the shared trim set`).toBe(
        ""
      );
    }
  });

  it("has cases to run at all", () => {
    // A contract file that failed to load would otherwise pass every `for` loop
    // above by iterating nothing.
    expect(parseCases.length).toBeGreaterThan(0);
  });
});

/**
 * INPUT LINE -> PARSED STATUS. The constants alone would not catch a regexp
 * that stopped recognising a status line at all — which is the
 * `missing-result` verdict — nor one that read DONE_WITH_CONCERNS as DONE.
 */
describe("parseStatus against the shared cases", () => {
  for (const testCase of parseCases) {
    it(testCase.name, () => {
      expect(parseStatus(testCase.body)).toEqual({
        status: testCase.status,
        detail: testCase.detail,
        line: testCase.line,
      });
    });
  }
});
