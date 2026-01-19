import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SlDrawer } from '@shoelace-style/shoelace';

interface Tick {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: number;
  description?: string;
  isBlocked?: boolean;
  awaiting?: string;
  requires?: string;
  column: string;
}

@customElement('tick-detail-drawer')
export class TickDetailDrawer extends LitElement {
  static styles = css`
    :host {
      --size: 420px;
    }

    sl-drawer::part(panel) {
      background: var(--mantle);
      border-left: 1px solid var(--surface0);
    }

    sl-drawer::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-drawer::part(title) {
      font-size: 1rem;
      font-weight: 600;
    }

    sl-drawer::part(close-button) {
      font-size: 1.25rem;
    }

    sl-drawer::part(body) {
      padding: 1.25rem;
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .id-badge {
      font-size: 0.75rem;
      font-weight: 600;
      font-family: monospace;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .id-badge.type-task { background: rgba(137, 180, 250, 0.2); color: var(--blue); }
    .id-badge.type-epic { background: rgba(203, 166, 247, 0.2); color: var(--mauve); }
    .id-badge.type-bug { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .id-badge.type-feature { background: rgba(166, 227, 161, 0.2); color: var(--green); }

    .title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.4;
      margin-bottom: 1.25rem;
    }

    .section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--subtext0);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      padding-bottom: 0.375rem;
      border-bottom: 1px solid var(--surface0);
    }

    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .field-label {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--overlay1);
      text-transform: uppercase;
    }

    .field-value {
      font-size: 0.875rem;
      color: var(--text);
    }

    .description {
      font-size: 0.875rem;
      color: var(--subtext1);
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--surface0);
    }

    .note-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    sl-textarea::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    sl-textarea::part(textarea) {
      color: var(--text);
    }

    @media (max-width: 480px) {
      :host {
        --size: 100%;
      }

      .fields {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ type: Object }) tick: Tick | null = null;
  @state() private isOpen = false;

  open() {
    this.isOpen = true;
    const drawer = this.shadowRoot?.querySelector('sl-drawer') as SlDrawer;
    drawer?.show();
  }

  close() {
    this.isOpen = false;
    const drawer = this.shadowRoot?.querySelector('sl-drawer') as SlDrawer;
    drawer?.hide();
  }

  private handleClose() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleApprove() {
    this.dispatchEvent(new CustomEvent('approve'));
    this.close();
  }

  private handleReject() {
    this.dispatchEvent(new CustomEvent('reject'));
    this.close();
  }

  private formatPriority(priority: number): string {
    const labels = ['Critical', 'High', 'Medium', 'Low', 'Backlog'];
    return `P${priority} - ${labels[priority] || 'Unknown'}`;
  }

  private formatType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private formatRequires(requires: string): string {
    const labels: Record<string, string> = {
      approval: 'Needs approval',
      review: 'Needs review (code)',
      content: 'Needs review (content)',
    };
    return labels[requires] || requires;
  }

  render() {
    if (!this.tick) {
      return html`<sl-drawer></sl-drawer>`;
    }

    const showActions = this.tick.awaiting || this.tick.requires;

    return html`
      <sl-drawer
        label="Tick Details"
        placement="end"
        style="--size: ${this.style.getPropertyValue('--size') || '420px'}"
        @sl-hide=${this.handleClose}
      >
        <div class="header-badges">
          <span class="id-badge type-${this.tick.type}">${this.tick.id}</span>
          <sl-badge variant=${this.tick.status === 'closed' ? 'success' : 'neutral'}>
            ${this.tick.status === 'closed' ? '✓ Closed' : '○ Open'}
          </sl-badge>
        </div>

        <h2 class="title">${this.tick.title}</h2>

        <div class="section">
          <h3 class="section-title">Details</h3>
          <div class="fields">
            <div class="field">
              <span class="field-label">Type</span>
              <span class="field-value">${this.formatType(this.tick.type)}</span>
            </div>
            <div class="field">
              <span class="field-label">Priority</span>
              <span class="field-value">${this.formatPriority(this.tick.priority)}</span>
            </div>
            <div class="field">
              <span class="field-label">Status</span>
              <span class="field-value">${this.tick.column}</span>
            </div>
            ${this.tick.requires ? html`
              <div class="field">
                <span class="field-label">Workflow</span>
                <span class="field-value">${this.formatRequires(this.tick.requires)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${this.tick.description ? html`
          <div class="section">
            <h3 class="section-title">Description</h3>
            <p class="description">${this.tick.description}</p>
          </div>
        ` : ''}

        <div class="section">
          <h3 class="section-title">Add Note</h3>
          <div class="note-form">
            <sl-textarea placeholder="Add a note..." rows="3"></sl-textarea>
            <sl-button variant="primary" size="small" style="align-self: flex-end;">
              Add Note
            </sl-button>
          </div>
        </div>

        ${showActions ? html`
          <div class="actions">
            <sl-button variant="success" @click=${this.handleApprove}>
              <sl-icon slot="prefix" name="check-lg"></sl-icon>
              Approve
            </sl-button>
            <sl-button variant="danger" @click=${this.handleReject}>
              <sl-icon slot="prefix" name="x-lg"></sl-icon>
              Reject
            </sl-button>
          </div>
        ` : html`
          <div class="actions">
            <sl-button variant="neutral">
              Close Tick
            </sl-button>
          </div>
        `}
      </sl-drawer>
    `;
  }
}
