import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * Ticks-styled empty state component for showing when no data is available.
 *
 * @element ticks-empty-state
 *
 * @slot icon - Icon or illustration (optional)
 * @slot title - Title text
 * @slot description - Description text
 * @slot action - Action button/link (optional)
 */
@customElement('ticks-empty-state')
export class TicksEmptyState extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 2rem;
      background: var(--surface, #313244);
      border-radius: 8px;
    }

    .icon {
      margin-bottom: 1rem;
      color: var(--overlay, #6c7086);
    }

    .icon ::slotted(*) {
      width: 3rem;
      height: 3rem;
    }

    .icon svg {
      width: 3rem;
      height: 3rem;
    }

    .title {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
      margin: 0 0 0.5rem 0;
    }

    .description {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      color: var(--subtext, #a6adc8);
      margin: 0;
      max-width: 300px;
      line-height: 1.5;
    }

    .action {
      margin-top: 1.5rem;
    }
  `;

  private renderDefaultIcon() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
    `;
  }

  render() {
    return html`
      <div class="empty-state">
        <div class="icon">
          <slot name="icon">${this.renderDefaultIcon()}</slot>
        </div>
        <h3 class="title">
          <slot name="title">No items found</slot>
        </h3>
        <p class="description">
          <slot name="description">There's nothing to display here yet.</slot>
        </p>
        <div class="action">
          <slot name="action"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-empty-state': TicksEmptyState;
  }
}
