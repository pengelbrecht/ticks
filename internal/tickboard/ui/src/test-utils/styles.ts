/**
 * Test helper for asserting on a Lit component's static styles.
 *
 * `LitElement.styles` is typed as `CSSResultGroup`, a recursive union of
 * `CSSResult`, `CSSStyleSheet`, and nested arrays. `CSSStyleSheet` has no
 * `cssText` property, so reading it directly does not type-check. The
 * components in this app author styles with the `css` template tag, which
 * always yields `CSSResult`; this helper flattens the group and extracts
 * `cssText` where present, falling back to `toString()` otherwise.
 */
import type { CSSResultGroup, CSSResult } from 'lit';

function hasCssText(value: unknown): value is CSSResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { cssText?: unknown }).cssText === 'string'
  );
}

/** Flatten a component's static `styles` into a single CSS string. */
export function styleText(styles: CSSResultGroup | undefined): string {
  if (styles === undefined) {
    return '';
  }
  if (Array.isArray(styles)) {
    return styles.map((s) => styleText(s)).join('');
  }
  if (hasCssText(styles)) {
    return styles.cssText;
  }
  return String(styles);
}
