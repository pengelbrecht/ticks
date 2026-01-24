import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled button component.
 *
 * @element ticks-button
 *
 * @slot - Button content
 *
 * @csspart base - The button element
 */
@customElement('ticks-button')
export class TicksButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      line-height: 1.4;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Primary - Ticks Green */
    button.primary {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    button.primary:hover:not(:disabled) {
      background: #b8e8b3;
    }

    button.primary:active:not(:disabled) {
      background: #96d991;
    }

    /* Secondary */
    button.secondary {
      background: var(--surface, #313244);
      color: var(--text, #cdd6f4);
    }

    button.secondary:hover:not(:disabled) {
      background: #3b3d50;
    }

    button.secondary:active:not(:disabled) {
      background: #2a2b3d;
    }

    /* Danger */
    button.danger {
      background: var(--red, #f38ba8);
      color: var(--crust, #11111b);
    }

    button.danger:hover:not(:disabled) {
      background: #f5a0b8;
    }

    button.danger:active:not(:disabled) {
      background: #f17898;
    }

    /* Ghost */
    button.ghost {
      background: transparent;
      color: var(--text, #cdd6f4);
    }

    button.ghost:hover:not(:disabled) {
      background: var(--surface, #313244);
    }

    /* Sizes */
    button.small {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    button.large {
      padding: 0.875rem 1.75rem;
      font-size: 1rem;
    }

    /* Full width */
    :host([full]) button {
      width: 100%;
    }
  `;

  @property({ type: String }) variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
  @property({ type: String }) size: 'small' | 'medium' | 'large' = 'medium';
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';

  private handleClick() {
    // For submit buttons, find parent form and submit it
    // (native submit doesn't work across shadow DOM boundaries)
    if (this.type === 'submit') {
      const form = this.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  }

  render() {
    return html`
      <button
        part="base"
        class="${this.variant} ${this.size}"
        ?disabled=${this.disabled}
        type="button"
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-button': TicksButton;
  }
}
