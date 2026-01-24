import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Ticks-styled code display component.
 *
 * @element ticks-code
 *
 * @slot - Code content
 */
@customElement('ticks-code')
export class TicksCode extends LitElement {
  static styles = css`
    :host {
      display: inline;
    }

    :host([block]) {
      display: block;
    }

    /* Inline code */
    code {
      font-family: var(--font-mono, 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace);
      font-size: 0.875em;
      background: var(--surface, #313244);
      color: var(--green, #a6e3a1);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    /* Block code */
    .code-block {
      position: relative;
      background: var(--mantle, #181825);
      border-radius: 6px;
      overflow: hidden;
    }

    .code-block pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
    }

    .code-block code {
      display: block;
      background: none;
      padding: 0;
      font-size: 0.8125rem;
      line-height: 1.6;
      color: var(--subtext, #a6adc8);
    }

    .copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: var(--surface, #313244);
      border: none;
      border-radius: 4px;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext, #a6adc8);
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .code-block:hover .copy-btn {
      opacity: 1;
    }

    .copy-btn:hover {
      background: var(--overlay, #6c7086);
    }

    .copy-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .copy-btn.copied {
      color: var(--green, #a6e3a1);
    }
  `;

  @property({ type: Boolean, reflect: true }) block = false;
  @property({ type: Boolean }) copyable = false;

  @state() private copied = false;

  private async handleCopy() {
    const slot = this.shadowRoot?.querySelector('slot');
    const nodes = slot?.assignedNodes({ flatten: true }) || [];
    const text = nodes.map(node => node.textContent).join('').trim();

    try {
      await navigator.clipboard.writeText(text);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }

  render() {
    if (this.block) {
      return html`
        <div class="code-block">
          <pre><code><slot></slot></code></pre>
          ${this.copyable ? html`
            <button
              class="copy-btn ${this.copied ? 'copied' : ''}"
              @click=${this.handleCopy}
              aria-label="${this.copied ? 'Copied!' : 'Copy code'}"
            >
              ${this.copied ? html`
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ` : html`
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              `}
            </button>
          ` : ''}
        </div>
      `;
    }

    return html`<code><slot></slot></code>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-code': TicksCode;
  }
}
