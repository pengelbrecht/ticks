import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Tick {
  id: string;
  title: string;
  type: 'task' | 'epic' | 'bug' | 'feature';
  status: 'open' | 'closed';
  priority: number;
  description?: string;
  isBlocked?: boolean;
  awaiting?: string;
  requires?: string;
  column: string;
}

const TYPE_COLORS: Record<string, string> = {
  task: 'var(--blue)',
  epic: 'var(--mauve)',
  bug: 'var(--red)',
  feature: 'var(--green)',
};

const STATUS_ICONS: Record<string, string> = {
  open: '○',
  closed: '✓',
  blocked: '⊘',
  awaiting: '👤',
  in_progress: '●',
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
      border-radius: 6px;
      padding: 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
    }

    .card:hover {
      border-color: var(--surface2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .card:active {
      transform: scale(0.98);
    }

    .card.selected {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .card-id {
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: monospace;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      background: rgba(137, 180, 250, 0.2);
    }

    .card-id.type-task { background: rgba(137, 180, 250, 0.2); color: var(--blue); }
    .card-id.type-epic { background: rgba(203, 166, 247, 0.2); color: var(--mauve); }
    .card-id.type-bug { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .card-id.type-feature { background: rgba(166, 227, 161, 0.2); color: var(--green); }

    .card-status {
      font-size: 0.875rem;
    }

    .card-status.status-open { color: var(--overlay0); }
    .card-status.status-closed { color: var(--green); }
    .card-status.status-blocked { color: var(--red); }
    .card-status.status-awaiting { color: var(--yellow); }
    .card-status.status-in-progress {
      color: var(--peach);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .card-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 0.5rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .priority-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: monospace;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      background: var(--surface1);
    }

    .priority-badge.p0, .priority-badge.p1 {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .priority-badge.p2 {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .priority-badge.p3, .priority-badge.p4 {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .awaiting-badge {
      font-size: 0.625rem;
      font-weight: 500;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
      text-transform: uppercase;
    }

    .requires-badge {
      font-size: 0.625rem;
      font-weight: 500;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.15);
      color: var(--mauve);
      text-transform: uppercase;
    }
  `;

  @property({ type: Object }) tick!: Tick;
  @property({ type: Boolean }) selected = false;

  private getStatusClass(): string {
    if (this.tick.awaiting) return 'status-awaiting';
    if (this.tick.isBlocked) return 'status-blocked';
    if (this.tick.column === 'agent') return 'status-in-progress';
    return `status-${this.tick.status}`;
  }

  private getStatusIcon(): string {
    if (this.tick.awaiting) return STATUS_ICONS.awaiting;
    if (this.tick.isBlocked) return STATUS_ICONS.blocked;
    if (this.tick.column === 'agent') return STATUS_ICONS.in_progress;
    return STATUS_ICONS[this.tick.status] || '○';
  }

  private formatAwaiting(awaiting: string): string {
    const labels: Record<string, string> = {
      work: 'Work',
      approval: 'Approval',
      review: 'Review',
      content: 'Content',
    };
    return labels[awaiting] || awaiting;
  }

  private formatRequires(requires: string): string {
    const labels: Record<string, string> = {
      approval: 'Needs Approval',
      review: 'Needs Review',
      content: 'Content Review',
    };
    return labels[requires] || requires;
  }

  private handleClick() {
    this.dispatchEvent(new CustomEvent('card-click', {
      detail: { tick: this.tick },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="card ${this.selected ? 'selected' : ''}" @click=${this.handleClick}>
        <div class="card-header">
          <span class="card-id type-${this.tick.type}">${this.tick.id}</span>
          <span class="card-status ${this.getStatusClass()}">${this.getStatusIcon()}</span>
        </div>
        <div class="card-title" title=${this.tick.title}>${this.tick.title}</div>
        <div class="card-footer">
          <span class="priority-badge p${this.tick.priority}">P${this.tick.priority}</span>
          ${this.tick.awaiting ? html`
            <span class="awaiting-badge">${this.formatAwaiting(this.tick.awaiting)}</span>
          ` : ''}
          ${this.tick.requires && this.tick.status !== 'closed' ? html`
            <span class="requires-badge">${this.formatRequires(this.tick.requires)}</span>
          ` : ''}
        </div>
      </div>
    `;
  }
}
