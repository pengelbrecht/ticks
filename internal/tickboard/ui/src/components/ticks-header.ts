import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Ticks-styled header component for app headers.
 *
 * @element ticks-header
 *
 * @slot logo - Logo area (left)
 * @slot nav - Navigation area (center, optional)
 * @slot user - User info/actions area (right)
 */
@customElement('ticks-header')
export class TicksHeader extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: var(--crust, #11111b);
      border-bottom: 1px solid var(--surface, #313244);
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
    }

    :host([sticky]) header {
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      header {
        padding: 0.75rem 1rem;
      }

      .nav {
        display: none;
      }
    }
  `;

  @property({ type: Boolean, reflect: true }) sticky = false;

  render() {
    return html`
      <header>
        <div class="logo">
          <slot name="logo"></slot>
        </div>
        <div class="nav">
          <slot name="nav"></slot>
        </div>
        <div class="user">
          <slot name="user"></slot>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-header': TicksHeader;
  }
}
