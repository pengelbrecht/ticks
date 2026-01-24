import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled alert component for notifications and messages.
 *
 * @element ticks-alert
 *
 * @slot - Alert message content
 * @slot icon - Custom icon (optional)
 *
 * @fires close - Fired when the alert is closed
 */
@customElement('ticks-alert')
export class TicksAlert extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .icon {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .close-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .close-btn svg {
      width: 1rem;
      height: 1rem;
    }

    /* Success variant */
    .alert.success {
      background: rgba(166, 227, 161, 0.15);
      color: var(--green, #a6e3a1);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .alert.success .close-btn {
      color: var(--green, #a6e3a1);
    }

    /* Error variant */
    .alert.error {
      background: rgba(243, 139, 168, 0.15);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .alert.error .close-btn {
      color: var(--red, #f38ba8);
    }

    /* Warning variant */
    .alert.warning {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .alert.warning .close-btn {
      color: var(--yellow, #f9e2af);
    }

    /* Info variant */
    .alert.info {
      background: rgba(137, 220, 235, 0.15);
      color: var(--blue, #89dceb);
      border: 1px solid rgba(137, 220, 235, 0.3);
    }

    .alert.info .close-btn {
      color: var(--blue, #89dceb);
    }
  `;

  @property({ type: String }) variant: 'success' | 'error' | 'warning' | 'info' = 'info';
  @property({ type: Boolean }) closable = false;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private renderDefaultIcon() {
    switch (this.variant) {
      case 'success':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      case 'error':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      case 'warning':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      case 'info':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
  }

  render() {
    return html`
      <div class="alert ${this.variant}" role="alert">
        <span class="icon">
          <slot name="icon">${this.renderDefaultIcon()}</slot>
        </span>
        <div class="content">
          <slot></slot>
        </div>
        ${this.closable ? html`
          <button class="close-btn" @click=${this.handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-alert': TicksAlert;
  }
}
