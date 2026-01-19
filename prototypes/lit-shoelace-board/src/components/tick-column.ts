import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Tick {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: number;
  column: string;
}

@customElement('tick-column')
export class TickColumn extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--mantle);
      border-radius: 8px;
      border: 1px solid var(--surface0);
      overflow: hidden;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .column-header h2 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--base);
      border-radius: 9999px;
    }

    /* Column-specific colors */
    :host([columnId="blocked"]) .column-header {
      border-top: 3px solid var(--red);
    }
    :host([columnId="blocked"]) .count-badge {
      background: var(--red);
    }

    :host([columnId="ready"]) .column-header {
      border-top: 3px solid var(--blue);
    }
    :host([columnId="ready"]) .count-badge {
      background: var(--blue);
    }

    :host([columnId="agent"]) .column-header {
      border-top: 3px solid var(--peach);
    }
    :host([columnId="agent"]) .count-badge {
      background: var(--peach);
    }

    :host([columnId="human"]) .column-header {
      border-top: 3px solid var(--yellow);
    }
    :host([columnId="human"]) .count-badge {
      background: var(--yellow);
    }

    :host([columnId="done"]) .column-header {
      border-top: 3px solid var(--green);
    }
    :host([columnId="done"]) .count-badge {
      background: var(--green);
    }

    .column-content {
      flex: 1;
      padding: 0.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .column-content::-webkit-scrollbar {
      width: 6px;
    }

    .column-content::-webkit-scrollbar-track {
      background: var(--mantle);
      border-radius: 3px;
    }

    .column-content::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    .column-content::-webkit-scrollbar-thumb:hover {
      background: var(--surface2);
    }

    .empty-state {
      color: var(--overlay0);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
      font-style: italic;
    }

    /* Mobile adjustments */
    @media (max-width: 480px) {
      :host {
        border-radius: 0;
        border: none;
        background: var(--base);
      }

      .column-header {
        display: none;
      }

      .column-content {
        padding: 0.75rem;
        padding-bottom: max(1rem, env(safe-area-inset-bottom));
      }
    }
  `;

  @property() name = '';
  @property() columnId = '';
  @property() color = '';
  @property({ type: Array }) ticks: Tick[] = [];

  render() {
    return html`
      <div class="column-header">
        <h2>${this.name}</h2>
        <span class="count-badge">${this.ticks.length}</span>
      </div>
      <div class="column-content">
        ${this.ticks.length === 0 ? html`
          <p class="empty-state">No items</p>
        ` : this.ticks.map(tick => html`
          <tick-card .tick=${tick}></tick-card>
        `)}
      </div>
    `;
  }
}
