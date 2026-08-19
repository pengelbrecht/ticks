/*
 * These are the only legacy content exceptions. Each entry is an exact path +
 * exact literal match, and each reason documents why the value remains until
 * the fixture/history is deliberately rewritten. New secrets or identifiers
 * must never be added here to make the guard quiet.
 */
const legacyOperatorEmail = ["pe", "@", "writeflow.com"].join("");

export const PUBLIC_REPO_ALLOWLIST = Object.freeze([
  {
    path: "internal/tickboard/cloud/client_test.go",
    rule: "email",
    literal: legacyOperatorEmail,
    reason: "Pre-existing cloud requester identity regression fixture on main.",
  },
  {
    path: ".tick/issues/xps.json",
    rule: "email",
    literal: legacyOperatorEmail,
    reason: "Pre-existing closed tick fixture on main records the same requester identity.",
  },
  {
    path: ".tick/issues/h3l.json",
    rule: "email",
    literal: ["peter", "@", "engelbrecht.dk"].join(""),
    line: 5,
    reason: "Pre-existing human approval note on main; this exact historical line is tracker data.",
  },
  {
    path: ".tick/activity/activity.jsonl",
    rule: "email",
    literal: ["peter", "@", "engelbrecht.dk"].join(""),
    line: 509,
    reason: "Pre-existing audit entry mirrors the h3l approval note; this exact historical line is tracker data.",
  },
]);

/*
 * The tracker also serializes actor/owner/created_by metadata. These identities
 * predate this guard and are handled separately from authored note content;
 * an unknown identity in those fields remains a finding.
 */
export const LEGACY_TRACKER_IDENTITIES = Object.freeze([
  ["peter", "@", "engelbrecht.dk"].join(""),
  ["noreply", "@", "anthropic.com"].join(""),
  ["morten", "@", "elk.dk"].join(""),
]);
