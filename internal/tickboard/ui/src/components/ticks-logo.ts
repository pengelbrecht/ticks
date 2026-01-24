import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks logo component - supports icon (tk_ in box) and logotype (ticks text) variants.
 *
 * @element ticks-logo
 *
 * @prop {string} variant - 'icon' for tk_ in rounded box, 'logotype' for ticks text
 * @prop {number} size - Height in pixels
 * @prop {string} href - Optional link URL
 */
@customElement('ticks-logo')
export class TicksLogo extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
    }

    a, span {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    a:hover {
      text-decoration: none;
    }

    svg {
      display: block;
    }
  `;

  /** Logo variant: 'icon' shows tk_ in box, 'logotype' shows ticks text */
  @property({ type: String }) variant: 'logotype' | 'icon' = 'logotype';
  @property({ type: String }) href = '';
  @property({ type: Number }) size = 28;

  private renderLogotype() {
    // "ticks" text with Geist Mono and glow - from ticks-logotype.svg
    const filterId = `glow-logotype-${Math.random().toString(36).substr(2, 9)}`;
    return html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" role="img" aria-label="ticks"
           style="height: ${this.size}px; width: auto;">
        <defs>
          <filter id="${filterId}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <text x="60" y="20"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="28"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${filterId})">ticks</text>
      </svg>
    `;
  }

  private renderIcon() {
    // "tk_" in rounded dark box with glow - from ticks-icon.svg
    const filterId = `glow-icon-${Math.random().toString(36).substr(2, 9)}`;
    return html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="tk_"
           style="height: ${this.size}px; width: ${this.size}px;">
        <defs>
          <filter id="${filterId}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="#1e1e2e"/>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#313244" stroke-width="2"/>
        <text x="32" y="32"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="22"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${filterId})">tk_</text>
      </svg>
    `;
  }

  render() {
    const logo = this.variant === 'icon' ? this.renderIcon() : this.renderLogotype();

    if (this.href) {
      return html`<a href=${this.href}>${logo}</a>`;
    }
    return html`<span>${logo}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-logo': TicksLogo;
  }
}
