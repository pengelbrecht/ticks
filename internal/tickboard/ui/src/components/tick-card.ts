import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { BoardTick, TickType } from '../types/tick.js';

// Priority colors: 0=critical→red, 1=high→peach, 2=medium→yellow, 3=low→green
const PRIORITY_COLORS: Record<number, string> = {
  0: 'var(--red)',
  1: 'var(--peach)',
  2: 'var(--yellow)',
  3: 'var(--green)',
  4: 'var(--subtext0)',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Backlog',
};

// Type badge variants mapping to Shoelace badge variants
const TYPE_VARIANTS: Record<TickType, string> = {
  bug: 'danger',
  feature: 'primary',
  task: 'neutral',
  epic: 'warning',
  chore: 'neutral',
};

@customElement('tick-card')
export class TickCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .card:hover {
      border-color: var(--overlay0);
    }

    .card.selected {
      border-color: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
    }

    .card.focused {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px var(--blue);
      outline: none;
    }

    .card.focused.selected {
      box-shadow: 0 0 0 2px var(--sapphire);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .priority-indicator {
      width: 4px;
      min-height: 100%;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
    }

    .header-content {
      flex: 1;
      min-width: 0;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      margin: 0;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .epic-name {
      font-size: 0.625rem;
      color: var(--subtext0);
      margin-top: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .epic-name::before {
      content: '↳';
      opacity: 0.7;
    }

    .priority-tooltip {
      font-size: 0.625rem;
    }
  `;

  @property({ attribute: false })
  tick!: BoardTick;

  @property({ type: Boolean })
  selected = false;

  @property({ type: Boolean })
  focused = false;

  @property({ type: String, attribute: 'epic-name' })
  epicName?: string;

  @query('.card')
  private cardElement!: HTMLDivElement;

  updated(changedProperties: Map<string, unknown>) {
    // Scroll into view when becoming focused
    if (changedProperties.has('focused') && this.focused && this.cardElement) {
      this.cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent('tick-selected', {
        detail: { tick: this.tick },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getPriorityColor(): string {
    return PRIORITY_COLORS[this.tick.priority] ?? PRIORITY_COLORS[2];
  }

  private getPriorityLabel(): string {
    return PRIORITY_LABELS[this.tick.priority] ?? 'Unknown';
  }

  render() {
    const { tick, selected, focused, epicName } = this;

    return html`
      <div
        class="card ${selected ? 'selected' : ''} ${focused ? 'focused' : ''}"
        @click=${this.handleClick}
        role="button"
        tabindex=${focused ? '0' : '-1'}
        aria-label="Tick ${tick.id}: ${tick.title}"
      >
        <div class="card-header">
          <sl-tooltip content="Priority: ${this.getPriorityLabel()}" placement="left">
            <div
              class="priority-indicator"
              style="background-color: ${this.getPriorityColor()}"
            ></div>
          </sl-tooltip>
          <div class="header-content">
            <div class="tick-id">${tick.id}</div>
            <h4 class="tick-title">${tick.title}</h4>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-badge type-badge type-${tick.type}">${tick.type}</span>
          <span class="meta-badge status-${tick.status}">${tick.status.replace('_', ' ')}</span>
          ${tick.is_blocked
            ? html`<span class="meta-badge blocked">⊘ blocked</span>`
            : null}
          ${tick.manual
            ? html`<span class="meta-badge manual">👤 manual</span>`
            : null}
          ${tick.awaiting
            ? html`<span class="meta-badge awaiting">⏳ ${tick.awaiting}</span>`
            : null}
        </div>

        ${epicName
          ? html`<div class="epic-name">${epicName}</div>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-card': TickCard;
  }
}
