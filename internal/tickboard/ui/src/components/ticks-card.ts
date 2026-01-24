import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled card component.
 *
 * @element ticks-card
 *
 * @slot - Card content
 * @slot header - Card header content
 * @slot footer - Card footer content
 */
@customElement('ticks-card')
export class TicksCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--surface, #313244);
      border-radius: 8px;
      overflow: hidden;
    }

    .card.interactive {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .card.interactive:hover {
      background: var(--overlay, #6c7086);
      transform: translateY(-1px);
    }

    .card.bordered {
      border: 1px solid var(--overlay, #6c7086);
    }

    .header {
      padding: 1rem;
      border-bottom: 1px solid var(--overlay, #6c7086);
    }

    .content {
      padding: 1rem;
    }

    .footer {
      padding: 1rem;
      border-top: 1px solid var(--overlay, #6c7086);
    }

    /* Remove padding if empty */
    .header:empty,
    .footer:empty {
      display: none;
    }
  `;

  @property({ type: Boolean }) interactive = false;
  @property({ type: Boolean }) bordered = false;

  render() {
    return html`
      <div class="card ${this.interactive ? 'interactive' : ''} ${this.bordered ? 'bordered' : ''}">
        <div class="header">
          <slot name="header"></slot>
        </div>
        <div class="content">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-card': TicksCard;
  }
}
