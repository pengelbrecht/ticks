import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { SlDrawer, SlDialog, SlSelect } from '@shoelace-style/shoelace';

interface Tick {
  id: string;
  title: string;
  type: 'task' | 'epic' | 'bug' | 'feature';
  status: 'open' | 'closed';
  priority: number;
  description?: string;
  parent?: string;
  isBlocked?: boolean;
  awaiting?: string;
  requires?: string;
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
}

// Sample data
const SAMPLE_TICKS: Tick[] = [
  { id: 'abc', title: 'Setup database migrations', type: 'task', status: 'open', priority: 1, column: 'blocked', isBlocked: true, description: 'Configure Postgres migrations with golang-migrate' },
  { id: 'def', title: 'API rate limiting blocked by auth', type: 'task', status: 'open', priority: 2, column: 'blocked', isBlocked: true },
  { id: 'ghi', title: 'Implement user authentication', type: 'feature', status: 'open', priority: 0, column: 'ready', description: 'Add JWT-based authentication with refresh tokens' },
  { id: 'jkl', title: 'Fix login redirect bug', type: 'bug', status: 'open', priority: 1, column: 'ready' },
  { id: 'mno', title: 'Add dark mode support', type: 'feature', status: 'open', priority: 2, column: 'ready' },
  { id: 'pqr', title: 'Refactor API handlers', type: 'task', status: 'open', priority: 2, column: 'agent', description: 'AI agent currently working on this task' },
  { id: 'stu', title: 'Review PR #123', type: 'task', status: 'open', priority: 1, column: 'human', awaiting: 'review', requires: 'review' },
  { id: 'vwx', title: 'Approve deployment plan', type: 'task', status: 'open', priority: 0, column: 'human', awaiting: 'approval', requires: 'approval' },
  { id: 'yza', title: 'Setup CI/CD pipeline', type: 'task', status: 'closed', priority: 2, column: 'done' },
  { id: 'bcd', title: 'Write unit tests', type: 'task', status: 'closed', priority: 3, column: 'done' },
  { id: 'efg', title: 'Documentation update', type: 'task', status: 'closed', priority: 3, column: 'done' },
];

const COLUMNS = [
  { id: 'blocked', name: 'Blocked', color: 'var(--red)', icon: '⊘' },
  { id: 'ready', name: 'Agent Queue', color: 'var(--blue)', icon: '▶' },
  { id: 'agent', name: 'In Progress', color: 'var(--peach)', icon: '●' },
  { id: 'human', name: 'Needs Human', color: 'var(--yellow)', icon: '👤' },
  { id: 'done', name: 'Done', color: 'var(--green)', icon: '✓' },
];

@customElement('tick-board')
export class TickBoard extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Header */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background-color: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--rosewater);
      margin: 0;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      max-width: 600px;
    }

    .header-center sl-input {
      flex: 1;
      max-width: 250px;
    }

    .header-center sl-select {
      min-width: 180px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile menu button */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .menu-toggle:hover {
      background: var(--surface1);
    }

    /* Kanban board */
    main {
      flex: 1;
      padding: 1rem;
      overflow: hidden;
    }

    .kanban-board {
      display: flex;
      gap: 1rem;
      height: calc(100vh - 80px);
      overflow-x: auto;
    }

    tick-column {
      flex: 1;
      min-width: 220px;
      max-width: 320px;
    }

    /* Mobile column selector */
    .mobile-column-select {
      display: none;
      padding: 0.75rem 1rem;
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .mobile-column-select sl-select {
      width: 100%;
    }

    /* Toast container */
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .toast-container sl-alert {
      min-width: 280px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-center {
        display: none;
      }

      .menu-toggle {
        display: block;
      }

      .kanban-board {
        gap: 0.75rem;
      }

      tick-column {
        min-width: 260px;
        flex: 0 0 260px;
      }
    }

    @media (max-width: 480px) {
      header {
        padding: 0.75rem 1rem;
      }

      .repo-badge {
        display: none;
      }

      .header-left h1 {
        font-size: 1.125rem;
      }

      main {
        padding: 0;
      }

      .mobile-column-select {
        display: block;
      }

      .kanban-board {
        display: block;
        height: calc(100vh - 140px);
        overflow-y: auto;
      }

      tick-column {
        display: none;
        width: 100%;
        max-width: none;
        height: 100%;
      }

      tick-column.mobile-active {
        display: flex;
      }
    }
  `;

  @state() private ticks: Tick[] = SAMPLE_TICKS;
  @state() private searchTerm = '';
  @state() private selectedEpic = '';
  @state() private selectedTick: Tick | null = null;
  @state() private mobileColumn = 'blocked';
  @state() private toasts: Array<{ id: number; message: string; variant: string }> = [];

  private toastId = 0;

  private get filteredTicks() {
    return this.ticks.filter(tick => {
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        if (!tick.id.toLowerCase().includes(term) && !tick.title.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (this.selectedEpic && tick.parent !== this.selectedEpic) {
        return false;
      }
      return true;
    });
  }

  private getColumnTicks(columnId: string) {
    return this.filteredTicks.filter(tick => tick.column === columnId);
  }

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  private handleEpicFilter(e: Event) {
    const select = e.target as SlSelect;
    this.selectedEpic = select.value as string;
  }

  private handleMobileColumnChange(e: Event) {
    const select = e.target as SlSelect;
    this.mobileColumn = select.value as string;
  }

  private handleCardClick(e: CustomEvent) {
    const tick = e.detail.tick as Tick;
    this.selectedTick = tick;
    const drawer = this.shadowRoot?.querySelector('tick-detail-drawer') as any;
    drawer?.open();
  }

  private handleCloseDrawer() {
    this.selectedTick = null;
  }

  private handleCreateClick() {
    const dialog = this.shadowRoot?.querySelector('#create-dialog') as SlDialog;
    dialog?.show();
  }

  private handleCreateSubmit() {
    const dialog = this.shadowRoot?.querySelector('#create-dialog') as SlDialog;
    dialog?.hide();
    this.showToast('Tick created successfully', 'success');
  }

  private handleApprove() {
    if (this.selectedTick) {
      this.showToast(`Approved: ${this.selectedTick.id}`, 'success');
      // In real app, update tick status
    }
  }

  private handleReject() {
    if (this.selectedTick) {
      this.showToast(`Rejected: ${this.selectedTick.id}`, 'warning');
    }
  }

  private showToast(message: string, variant: string = 'primary') {
    const id = ++this.toastId;
    this.toasts = [...this.toasts, { id, message, variant }];

    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 4000);
  }

  render() {
    return html`
      <header>
        <div class="header-left">
          <button class="menu-toggle" @click=${() => this.showToast('Menu clicked', 'primary')}>☰</button>
          <h1>Tick Board</h1>
          <span class="repo-badge">ticks</span>
        </div>

        <div class="header-center">
          <sl-input
            placeholder="Search by ID or title..."
            size="small"
            clearable
            @sl-input=${this.handleSearch}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          <sl-select
            placeholder="All Ticks"
            size="small"
            clearable
            @sl-change=${this.handleEpicFilter}
          >
            <sl-option value="epic-1">Epic: Auth System</sl-option>
            <sl-option value="epic-2">Epic: API Refactor</sl-option>
            <sl-option value="orphaned">Orphaned Tasks</sl-option>
          </sl-select>
        </div>

        <div class="header-right">
          <sl-dropdown>
            <sl-button slot="trigger" size="small" variant="default">
              <sl-icon name="lightning-charge"></sl-icon>
            </sl-button>
            <sl-menu>
              <sl-menu-item>
                <sl-icon slot="prefix" name="check-circle"></sl-icon>
                abc closed
              </sl-menu-item>
              <sl-menu-item>
                <sl-icon slot="prefix" name="arrow-right"></sl-icon>
                def moved to ready
              </sl-menu-item>
              <sl-menu-item>
                <sl-icon slot="prefix" name="plus-circle"></sl-icon>
                ghi created
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>

          <sl-tooltip content="Create new tick">
            <sl-button variant="primary" size="small" @click=${this.handleCreateClick}>
              <sl-icon name="plus-lg"></sl-icon>
            </sl-button>
          </sl-tooltip>
        </div>
      </header>

      <!-- Mobile column selector -->
      <div class="mobile-column-select">
        <sl-select value=${this.mobileColumn} @sl-change=${this.handleMobileColumnChange}>
          ${COLUMNS.map(col => html`
            <sl-option value=${col.id}>
              ${col.icon} ${col.name} (${this.getColumnTicks(col.id).length})
            </sl-option>
          `)}
        </sl-select>
      </div>

      <main>
        <div class="kanban-board">
          ${COLUMNS.map(col => html`
            <tick-column
              class=${this.mobileColumn === col.id ? 'mobile-active' : ''}
              name=${col.name}
              columnId=${col.id}
              color=${col.color}
              .ticks=${this.getColumnTicks(col.id)}
              @card-click=${this.handleCardClick}
            ></tick-column>
          `)}
        </div>
      </main>

      <!-- Detail drawer -->
      <tick-detail-drawer
        .tick=${this.selectedTick}
        @close=${this.handleCloseDrawer}
        @approve=${this.handleApprove}
        @reject=${this.handleReject}
      ></tick-detail-drawer>

      <!-- Create dialog -->
      <sl-dialog id="create-dialog" label="Create Tick">
        <sl-input label="Title" placeholder="Enter tick title" required></sl-input>
        <br>
        <sl-textarea label="Description" placeholder="Optional description"></sl-textarea>
        <br>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <sl-select label="Type" value="task">
            <sl-option value="task">Task</sl-option>
            <sl-option value="bug">Bug</sl-option>
            <sl-option value="feature">Feature</sl-option>
            <sl-option value="epic">Epic</sl-option>
          </sl-select>
          <sl-select label="Priority" value="2">
            <sl-option value="0">P0 - Critical</sl-option>
            <sl-option value="1">P1 - High</sl-option>
            <sl-option value="2">P2 - Medium</sl-option>
            <sl-option value="3">P3 - Low</sl-option>
          </sl-select>
        </div>
        <sl-button slot="footer" variant="default" @click=${() => (this.shadowRoot?.querySelector('#create-dialog') as SlDialog)?.hide()}>Cancel</sl-button>
        <sl-button slot="footer" variant="primary" @click=${this.handleCreateSubmit}>Create</sl-button>
      </sl-dialog>

      <!-- Toast notifications -->
      <div class="toast-container">
        ${this.toasts.map(toast => html`
          <sl-alert variant=${toast.variant} open closable duration="4000">
            <sl-icon slot="icon" name=${toast.variant === 'success' ? 'check-circle' : toast.variant === 'warning' ? 'exclamation-triangle' : 'info-circle'}></sl-icon>
            ${toast.message}
          </sl-alert>
        `)}
      </div>
    `;
  }
}
