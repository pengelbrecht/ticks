import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { BoardTick, TickColumn as TickColumnType } from '../types/tick.js';

// Column color mapping using Catppuccin colors
const COLUMN_COLORS: Record<TickColumnType, string> = {
  blocked: 'var(--red)',      // #f38ba8
  ready: 'var(--yellow)',     // #f9e2af
  agent: 'var(--blue)',       // #89b4fa
  human: 'var(--mauve)',      // #cba6f7
  done: 'var(--green)',       // #a6e3a1
};

// Column display names
const COLUMN_NAMES: Record<TickColumnType, string> = {
  blocked: 'Blocked',
  ready: 'Ready',
  agent: 'In Progress',
  human: 'Needs Human',
  done: 'Done',
};

// Column icons
const COLUMN_ICONS: Record<TickColumnType, string> = {
  blocked: '⊘',
  ready: '▶',
  agent: '●',
  human: '👤',
  done: '✓',
};

@customElement('tick-column')
export class TickColumn extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 220px;
      max-width: 320px;
      background: var(--surface0);
      border-radius: 8px;
      overflow: hidden;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
    }

    .header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .column-header-wrapper {
      position: relative;
    }

    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text);
    }

    .column-icon {
      font-size: 0.75rem;
    }

    .column-count {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--surface1);
      border-radius: 999px;
      color: var(--subtext0);
      min-width: 1.5rem;
      text-align: center;
    }

    .column-content {
      flex: 1;
      padding: 0.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--subtext0);
      font-size: 0.875rem;
      padding: 2rem 1rem;
      text-align: center;
    }

    .empty-state-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    /* Responsive styles */
    @media (max-width: 768px) {
      :host {
        min-width: 260px;
        flex: 0 0 260px;
      }
    }

    @media (max-width: 480px) {
      :host {
        width: 100%;
        max-width: none;
        height: 100%;
      }
    }
  `;

  @property({ type: String })
  name: TickColumnType = 'ready';

  @property({ type: String })
  color = '';

  @property({ attribute: false })
  ticks: BoardTick[] = [];

  @property({ type: Object, attribute: false })
  epicNames: Record<string, string> = {};

  private getColumnColor(): string {
    // Use provided color or fall back to default based on name
    return this.color || COLUMN_COLORS[this.name] || 'var(--blue)';
  }

  private getColumnDisplayName(): string {
    return COLUMN_NAMES[this.name] || this.name;
  }

  private getColumnIcon(): string {
    return COLUMN_ICONS[this.name] || '•';
  }

  private handleTickSelected(e: CustomEvent) {
    // Re-dispatch the event so it bubbles up to tick-board
    this.dispatchEvent(
      new CustomEvent('tick-selected', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const columnColor = this.getColumnColor();
    const displayName = this.getColumnDisplayName();
    const icon = this.getColumnIcon();
    const tickCount = this.ticks.length;

    return html`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${columnColor}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${columnColor}">${icon}</span>
            ${displayName}
          </span>
          <span class="column-count">${tickCount}</span>
        </div>
      </div>

      <div class="column-content">
        ${tickCount === 0
          ? html`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${icon}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `
          : this.ticks.map(
              tick => html`
                <tick-card
                  .tick=${tick}
                  epic-name=${this.epicNames[tick.parent || ''] || ''}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `
            )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-column': TickColumn;
  }
}
