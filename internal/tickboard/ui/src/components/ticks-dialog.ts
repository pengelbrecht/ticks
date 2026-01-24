import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * Ticks-styled dialog/modal component.
 *
 * @element ticks-dialog
 *
 * @slot title - Dialog title
 * @slot - Dialog content
 * @slot footer - Dialog footer (typically buttons)
 *
 * @fires close - Fired when the dialog is closed
 */
@customElement('ticks-dialog')
export class TicksDialog extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .backdrop.open {
      opacity: 1;
      visibility: visible;
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      z-index: 1001;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface, #313244);
      border-radius: 8px;
      min-width: 320px;
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .dialog.open {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--surface, #313244);
    }

    .title {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--subtext, #a6adc8);
      opacity: 0.7;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .close-btn:hover {
      opacity: 1;
      background: var(--surface, #313244);
    }

    .close-btn svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .content {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      color: var(--text, #cdd6f4);
      line-height: 1.5;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--surface, #313244);
    }

    .footer:empty {
      display: none;
    }
  `;

  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) closeOnBackdrop = true;
  @property({ type: Boolean }) closeOnEscape = true;

  @query('.dialog') private dialogEl!: HTMLElement;

  private previousActiveElement: Element | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this.previousActiveElement = document.activeElement;
        document.addEventListener('keydown', this.handleKeyDown);
        this.updateComplete.then(() => {
          this.trapFocus();
        });
      } else {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.previousActiveElement instanceof HTMLElement) {
          this.previousActiveElement.focus();
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.closeOnEscape) {
      this.close();
    } else if (e.key === 'Tab') {
      this.handleTab(e);
    }
  }

  private handleBackdropClick(e: MouseEvent) {
    if (this.closeOnBackdrop && e.target === e.currentTarget) {
      this.close();
    }
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private trapFocus() {
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }
  }

  private getFocusableElements(): NodeListOf<Element> {
    return this.shadowRoot!.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  private handleTab(e: KeyboardEvent) {
    const focusable = Array.from(this.getFocusableElements()) as HTMLElement[];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  render() {
    return html`
      <div
        class="backdrop ${this.open ? 'open' : ''}"
        @click=${this.handleBackdropClick}
      ></div>
      <div
        class="dialog ${this.open ? 'open' : ''}"
        role="dialog"
        aria-modal="true"
      >
        <div class="header">
          <h2 class="title"><slot name="title">Dialog</slot></h2>
          <button class="close-btn" @click=${this.close} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
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
    'ticks-dialog': TicksDialog;
  }
}
