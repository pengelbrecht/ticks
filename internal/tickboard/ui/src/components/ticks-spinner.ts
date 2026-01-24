import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled spinner component for loading states.
 *
 * @element ticks-spinner
 */
@customElement('ticks-spinner')
export class TicksSpinner extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      display: inline-block;
      border-radius: 50%;
      border-style: solid;
      border-color: var(--green, #a6e3a1);
      border-top-color: transparent;
      animation: spin 0.8s linear infinite;
    }

    /* Sizes */
    .spinner.small {
      width: 1rem;
      height: 1rem;
      border-width: 2px;
    }

    .spinner.medium {
      width: 1.5rem;
      height: 1.5rem;
      border-width: 2px;
    }

    .spinner.large {
      width: 2.5rem;
      height: 2.5rem;
      border-width: 3px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: String }) size: 'small' | 'medium' | 'large' = 'medium';

  render() {
    return html`
      <div
        class="spinner ${this.size}"
        role="status"
        aria-label="Loading"
      ></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-spinner': TicksSpinner;
  }
}
