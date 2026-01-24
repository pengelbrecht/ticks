import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled input component.
 *
 * @element ticks-input
 *
 * @fires input - When the input value changes
 * @fires change - When the input loses focus with a changed value
 *
 * @csspart base - The input wrapper
 * @csspart input - The input element
 * @csspart label - The label element
 */
@customElement('ticks-input')
export class TicksInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    input {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      margin: 0;
      background-color: var(--surface, #313244);
      border: 1px solid var(--overlay, #6c7086);
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.9375rem;
      color: var(--text, #cdd6f4);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    }

    input::placeholder {
      color: var(--overlay, #6c7086);
    }

    /* Override browser autofill styles */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px var(--surface, #313244) inset !important;
      -webkit-text-fill-color: var(--text, #cdd6f4) !important;
      caret-color: var(--text, #cdd6f4);
    }

    input:hover:not(:disabled) {
      border-color: var(--subtext, #a6adc8);
    }

    input:focus {
      border-color: var(--green, #a6e3a1);
      box-shadow: 0 0 0 2px rgba(166, 227, 161, 0.2);
    }

    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--surface, #313244);
    }

    /* Error state */
    :host([error]) input {
      border-color: var(--red, #f38ba8);
    }

    :host([error]) input:focus {
      border-color: var(--red, #f38ba8);
      box-shadow: 0 0 0 2px rgba(243, 139, 168, 0.2);
    }

    .error-message {
      position: absolute;
      top: 100%;
      left: 0;
      font-size: 0.75rem;
      color: var(--red, #f38ba8);
      margin-top: 0.25rem;
    }

    .input-wrapper {
      position: relative;
    }

    /* Sizes */
    :host([size="small"]) input {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }

    :host([size="large"]) input {
      padding: 1rem 1.25rem;
      font-size: 1rem;
    }
  `;

  @property({ type: String }) label = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' = 'text';
  @property({ type: String }) value = '';
  @property({ type: String }) name = '';
  @property({ type: String, reflect: true }) size: 'small' | 'medium' | 'large' = 'medium';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean, reflect: true }) error = false;
  @property({ type: String }) errorMessage = '';
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('input', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="wrapper" part="base">
        ${this.label ? html`<label part="label">${this.label}</label>` : ''}
        <div class="input-wrapper">
          <input
            part="input"
            type=${this.type}
            name=${this.name}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            minlength=${this.minlength ?? ''}
            maxlength=${this.maxlength ?? ''}
            @input=${this.handleInput}
            @change=${this.handleChange}
          />
          ${this.error && this.errorMessage ? html`<div class="error-message">${this.errorMessage}</div>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-input': TicksInput;
  }
}
