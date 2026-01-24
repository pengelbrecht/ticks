import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled badge component.
 *
 * @element ticks-badge
 *
 * @slot - Badge content
 */
@customElement('ticks-badge')
export class TicksBadge extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
    }

    /* Variants */
    .badge.green {
      background: rgba(166, 227, 161, 0.15);
      color: var(--green, #a6e3a1);
    }

    .badge.red {
      background: rgba(243, 139, 168, 0.15);
      color: var(--red, #f38ba8);
    }

    .badge.yellow {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
    }

    .badge.blue {
      background: rgba(137, 220, 235, 0.15);
      color: var(--blue, #89dceb);
    }

    .badge.peach {
      background: rgba(250, 179, 135, 0.15);
      color: var(--peach, #fab387);
    }

    .badge.mauve {
      background: rgba(203, 166, 247, 0.15);
      color: var(--mauve, #cba6f7);
    }

    .badge.neutral {
      background: var(--surface, #313244);
      color: var(--subtext, #a6adc8);
    }

    /* Dot indicator */
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Pill style */
    .badge.pill {
      border-radius: 999px;
      padding: 0.25rem 0.625rem;
    }
  `;

  @property({ type: String }) variant: 'green' | 'red' | 'yellow' | 'blue' | 'peach' | 'mauve' | 'neutral' = 'neutral';
  @property({ type: Boolean }) dot = false;
  @property({ type: Boolean }) pill = false;

  render() {
    return html`
      <span class="badge ${this.variant} ${this.pill ? 'pill' : ''}">
        ${this.dot ? html`<span class="dot"></span>` : ''}
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-badge': TicksBadge;
  }
}
