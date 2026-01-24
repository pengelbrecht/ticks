import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled list item component for displaying items in a list.
 *
 * @element ticks-list-item
 *
 * @slot status - Status indicator (e.g., badge, icon)
 * @slot title - Item title
 * @slot subtitle - Item subtitle/description
 * @slot actions - Action buttons
 *
 * @fires click - Fired when the item is clicked (when interactive)
 */
@customElement('ticks-list-item')
export class TicksListItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--surface, #313244);
      border-radius: 8px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
    }

    .list-item.interactive {
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
    }

    .list-item.interactive:hover {
      background: var(--overlay, #45475a);
    }

    .list-item.interactive:active {
      transform: scale(0.995);
    }

    .status {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .title {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtitle {
      font-size: 0.75rem;
      color: var(--subtext, #a6adc8);
      margin: 0.25rem 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `;

  @property({ type: Boolean }) interactive = false;

  private handleClick(e: MouseEvent) {
    if (this.interactive) {
      this.dispatchEvent(new CustomEvent('click', {
        detail: { originalEvent: e },
        bubbles: true,
        composed: true
      }));
    }
  }

  render() {
    return html`
      <div
        class="list-item ${this.interactive ? 'interactive' : ''}"
        @click=${this.handleClick}
        role=${this.interactive ? 'button' : 'listitem'}
        tabindex=${this.interactive ? '0' : '-1'}
      >
        <div class="status">
          <slot name="status"></slot>
        </div>
        <div class="content">
          <p class="title"><slot name="title"></slot></p>
          <p class="subtitle"><slot name="subtitle"></slot></p>
        </div>
        <div class="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-list-item': TicksListItem;
  }
}
