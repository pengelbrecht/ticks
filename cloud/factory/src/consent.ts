/**
 * The consent label, and the label reading every GitHub surface shares.
 *
 * Phase 3 established one sentence for issues (`github-issues.ts`): *an issue
 * without the agreed label is not a signal, however it is worded.* Tick ytd
 * extends the same vocabulary to pull requests, where it is the escape hatch
 * rather than the primary gate — see `pr-review.ts` for why a PR is gated on
 * the AUTHOR first and on this label second.
 *
 * The vocabulary lives here rather than in either source for the reason
 * `untrusted-text.ts` exists (tick 0vb): two copies of a consent label is two
 * consent labels, and the surface that drifts is the one nobody re-reads. It
 * is also the only arrangement without an import cycle — `github-issues.ts`
 * hands `pull_request` deliveries to `pr-review.ts`, so `pr-review.ts` must
 * not reach back into it for a constant.
 *
 * ## Why a label is a human press, and not merely a string
 *
 * GitHub will not let a user without *triage* (or higher) permission add a
 * label to an issue or a pull request. A stranger opening a PR against a
 * public repository therefore cannot label it, and cannot ask the API to open
 * it pre-labelled either. So the label's PRESENCE is evidence that somebody
 * with standing in the repository acted — which is exactly what "a human
 * press" has to mean when the press has to happen on GitHub rather than in the
 * operator's chat.
 *
 * Two consequences worth stating rather than implying:
 *
 *  - A label is consent by somebody with triage rights, not necessarily by the
 *    operator who enrolled the repository. Enrolment is what says *this
 *    repository may spend my money at all*; the label says *this one*.
 *  - Removing the label is not a revocation to track, because the label on the
 *    object IS the state. `github-issues.ts` spells out the redelivery
 *    ordering that makes this matter.
 */

/** The consent label, when a deployment does not name its own. */
export const DEFAULT_CONSENT_LABEL = "tk";

/** The consent label this deployment agreed on. */
export function consentLabel(env: { GITHUB_CONSENT_LABEL?: string | undefined }): string {
  const raw = env.GITHUB_CONSENT_LABEL;
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_CONSENT_LABEL;
  return raw.trim();
}

/**
 * The label names on an issue or pull request payload.
 *
 * Tolerant of both shapes GitHub sends — an array of objects with a `name`,
 * and (in a few older or hand-built payloads) an array of plain strings —
 * because a shape this reader does not understand must read as NO labels,
 * which is the fail-closed direction for a consent check.
 */
export function labelNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry !== null && typeof entry === "object") {
        const name = (entry as { name?: unknown }).name;
        return typeof name === "string" ? name : "";
      }
      return "";
    })
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/** GitHub label names are unique case-insensitively, so consent is matched that way. */
export function carriesLabel(names: string[], label: string): boolean {
  const wanted = label.toLowerCase();
  return names.some((name) => name.toLowerCase() === wanted);
}
