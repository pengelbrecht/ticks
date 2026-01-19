import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { boardContext, initialBoardState, type BoardState } from '../contexts/board-context.js';
import type { BoardTick, TickColumn, Epic } from '../types/tick.js';
import { fetchTicks, fetchTick, fetchInfo, type EpicInfo } from '../api/ticks.js';

// Column definitions for the kanban board
const COLUMNS = [
  { id: 'blocked' as TickColumn, name: 'Blocked', color: 'var(--red)', icon: '⊘' },
  { id: 'ready' as TickColumn, name: 'Agent Queue', color: 'var(--blue)', icon: '▶' },
  { id: 'agent' as TickColumn, name: 'In Progress', color: 'var(--peach)', icon: '●' },
  { id: 'human' as TickColumn, name: 'Needs Human', color: 'var(--yellow)', icon: '👤' },
  { id: 'done' as TickColumn, name: 'Done', color: 'var(--green)', icon: '✓' },
] as const;

@customElement('tick-board')
export class TickBoard extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Loading and error states */
    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      color: var(--text);
    }

    .loading-spinner {
      font-size: 2rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .error-state sl-alert {
      max-width: 400px;
      margin-bottom: 1rem;
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

    /* Responsive */
    @media (max-width: 768px) {
      .kanban-board {
        gap: 0.75rem;
      }
    }

    @media (max-width: 480px) {
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

      .kanban-board tick-column {
        display: none;
      }

      .kanban-board tick-column.mobile-active {
        display: flex;
      }
    }
  `;

  // Provide board context to all child components
  @provide({ context: boardContext })
  @state()
  boardState: BoardState = { ...initialBoardState };

  // Local state
  @state() private ticks: BoardTick[] = [];
  @state() private epics: EpicInfo[] = [];
  @state() private repoName = '';
  @state() private selectedEpic = '';
  @state() private searchTerm = '';
  @state() private activeColumn: TickColumn = 'blocked';
  @state() private isMobile = window.matchMedia('(max-width: 480px)').matches;
  @state() private selectedTick: BoardTick | null = null;
  @state() private loading = true;
  @state() private error: string | null = null;

  private mediaQuery = window.matchMedia('(max-width: 480px)');

  // SSE connection for real-time updates
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.mediaQuery.addEventListener('change', this.handleMediaChange);
    this.loadData();
    this.connectSSE();
  }

  private async loadData() {
    this.loading = true;
    this.error = null;

    try {
      // Fetch ticks and info in parallel
      const [ticks, info] = await Promise.all([
        fetchTicks(),
        fetchInfo(),
      ]);

      this.ticks = ticks;
      this.epics = info.epics;
      this.repoName = info.repoName;
      this.updateBoardState();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Failed to load board data:', err);
    } finally {
      this.loading = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mediaQuery.removeEventListener('change', this.handleMediaChange);
    this.disconnectSSE();
  }

  // ============================================================================
  // SSE Real-time Updates
  // ============================================================================

  /**
   * Connect to the SSE endpoint for real-time tick updates.
   * Uses exponential backoff for reconnection on errors.
   */
  private connectSSE() {
    // Clean up any existing connection
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource('/api/events');

    // Reset reconnect delay on successful connection
    this.eventSource.addEventListener('connected', () => {
      this.reconnectDelay = 1000;
      console.log('[SSE] Connected to server');
    });

    // Handle tick updates
    this.eventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; tickId?: string };
        this.handleRealtimeUpdate(data);
      } catch (err) {
        console.error('[SSE] Failed to parse update:', err);
      }
    });

    // Handle connection errors with exponential backoff
    this.eventSource.onerror = () => {
      console.log('[SSE] Connection error, will reconnect...');
      this.eventSource?.close();
      this.eventSource = null;
      this.scheduleReconnect();
    };
  }

  /**
   * Disconnect from SSE and clean up timers.
   */
  private disconnectSSE() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(`[SSE] Reconnecting after ${this.reconnectDelay}ms...`);
      this.connectSSE();
    }, this.reconnectDelay);

    // Exponential backoff: double the delay for next time, up to max
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Handle a real-time update from the server.
   * Fetches fresh tick data and updates local state.
   */
  private async handleRealtimeUpdate(data: { type: string; tickId?: string }) {
    const { type, tickId } = data;

    // Activity updates - reload all data for now
    if (type === 'activity') {
      // Activity changed, but we don't currently display activity in the board
      // Could add activity indicator in the future
      return;
    }

    if (!tickId) {
      console.warn('[SSE] Received update without tickId:', data);
      return;
    }

    switch (type) {
      case 'create':
      case 'update': {
        // Fetch the updated tick from the server
        try {
          const response = await fetchTick(tickId);
          const updatedTick: BoardTick = {
            ...response,
            is_blocked: response.isBlocked,
          };

          // Find existing tick in our list
          const existingIndex = this.ticks.findIndex(t => t.id === tickId);

          if (existingIndex >= 0) {
            // Update existing tick
            this.ticks = [
              ...this.ticks.slice(0, existingIndex),
              updatedTick,
              ...this.ticks.slice(existingIndex + 1),
            ];
          } else {
            // Add new tick (only if it's a task, not an epic)
            if (updatedTick.type !== 'epic') {
              this.ticks = [...this.ticks, updatedTick];
            }
          }

          this.updateBoardState();
        } catch (err) {
          console.error(`[SSE] Failed to fetch tick ${tickId}:`, err);
        }
        break;
      }

      case 'delete': {
        // Remove tick from our list
        const tickIndex = this.ticks.findIndex(t => t.id === tickId);
        if (tickIndex >= 0) {
          this.ticks = [
            ...this.ticks.slice(0, tickIndex),
            ...this.ticks.slice(tickIndex + 1),
          ];
          this.updateBoardState();
        }
        break;
      }

      default:
        console.warn('[SSE] Unknown update type:', type);
    }
  }

  private handleMediaChange = (e: MediaQueryListEvent) => {
    this.isMobile = e.matches;
    this.updateBoardState();
  };

  // Update the shared board state when local state changes
  private updateBoardState() {
    // Convert EpicInfo to Epic for context (Epic requires all Tick fields)
    // For now, we'll cast as the context primarily uses id/title from epics
    this.boardState = {
      ticks: this.ticks,
      epics: this.epics as unknown as Epic[],
      selectedEpic: this.selectedEpic,
      searchTerm: this.searchTerm,
      activeColumn: this.activeColumn,
      isMobile: this.isMobile,
    };
  }

  // Event handlers for tick-header
  private handleSearchChange(e: CustomEvent<{ value: string }>) {
    this.searchTerm = e.detail.value;
    this.updateBoardState();
  }

  private handleEpicFilterChange(e: CustomEvent<{ value: string }>) {
    this.selectedEpic = e.detail.value;
    this.updateBoardState();
  }

  private handleCreateClick() {
    // TODO: Open create tick dialog in future task
    console.log('Create tick clicked');
  }

  private handleMenuToggle() {
    // TODO: Open mobile menu drawer in future task
    console.log('Menu toggle clicked');
  }

  // Handle tick selection from columns
  private handleTickSelected(e: CustomEvent<{ tick: BoardTick }>) {
    this.selectedTick = e.detail.tick;
    console.log('Tick selected:', e.detail.tick.id);
  }

  private handleMobileColumnChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.activeColumn = select.value as TickColumn;
    this.updateBoardState();
  }

  // Get filtered ticks for a column
  private getFilteredTicks(): BoardTick[] {
    let filtered = this.ticks;

    // Filter by search term (match ID or title, case-insensitive)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        tick =>
          tick.id.toLowerCase().includes(term) ||
          tick.title.toLowerCase().includes(term) ||
          (tick.description && tick.description.toLowerCase().includes(term))
      );
    }

    // Filter by selected epic (parent matches)
    if (this.selectedEpic) {
      filtered = filtered.filter(tick => tick.parent === this.selectedEpic);
    }

    return filtered;
  }

  private getColumnTicks(columnId: TickColumn): BoardTick[] {
    return this.getFilteredTicks().filter(tick => tick.column === columnId);
  }

  // Build epic name lookup map for tick-column
  private getEpicNames(): Record<string, string> {
    const names: Record<string, string> = {};
    for (const epic of this.epics) {
      names[epic.id] = epic.title;
    }
    return names;
  }

  render() {
    // Show loading state
    if (this.loading) {
      return html`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;
    }

    // Show error state
    if (this.error) {
      return html`
        <div class="error-state">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Failed to load board</strong><br>
            ${this.error}
          </sl-alert>
          <sl-button variant="primary" @click=${this.loadData}>Retry</sl-button>
        </div>
      `;
    }

    const epicNames = this.getEpicNames();

    return html`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMenuToggle}
      ></tick-header>

      <!-- Toast notification stack -->
      <tick-toast-stack></tick-toast-stack>

      <!-- Mobile column selector -->
      <div class="mobile-column-select">
        <sl-select .value=${this.activeColumn} @sl-change=${this.handleMobileColumnChange}>
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
              class=${this.activeColumn === col.id ? 'mobile-active' : ''}
              name=${col.id}
              .ticks=${this.getColumnTicks(col.id)}
              .epicNames=${epicNames}
              @tick-selected=${this.handleTickSelected}
            ></tick-column>
          `)}
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-board': TickBoard;
  }
}
