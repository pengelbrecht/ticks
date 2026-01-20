import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { boardContext, initialBoardState, type BoardState } from '../contexts/board-context.js';
import type { BoardTick, TickColumn, Epic } from '../types/tick.js';
import { fetchTicks, fetchTick, fetchInfo, type EpicInfo, type Note, type BlockerDetail } from '../api/ticks.js';

// Column definitions for the kanban board
const COLUMNS = [
  { id: 'blocked' as TickColumn, name: 'Blocked', color: 'var(--red)', icon: '⊘' },
  { id: 'ready' as TickColumn, name: 'Agent Queue', color: 'var(--blue)', icon: '▶' },
  { id: 'agent' as TickColumn, name: 'In Progress', color: 'var(--peach)', icon: '●' },
  { id: 'human' as TickColumn, name: 'Needs Human', color: 'var(--yellow)', icon: '👤' },
  { id: 'done' as TickColumn, name: 'Done', color: 'var(--green)', icon: '✓' },
] as const;

// Column IDs in order for navigation
const COLUMN_IDS: TickColumn[] = ['blocked', 'ready', 'agent', 'human', 'done'];

/**
 * Root component for the Tick Board kanban interface.
 *
 * Provides board context to all child components via Lit Context.
 * Handles data fetching, real-time SSE updates, and keyboard navigation.
 *
 * @element tick-board
 *
 * Features:
 * - Fetches ticks and epic info from API on mount
 * - Connects to SSE endpoint for real-time updates
 * - Provides BoardState context to child components
 * - Keyboard navigation (hjkl, arrows, Enter, Esc, n, /, ?)
 * - Responsive layout with mobile tab navigation
 */
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

    /* Kanban board - Desktop */
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

    /* Mobile tab layout - hidden on desktop */
    .mobile-tab-layout {
      display: none;
    }

    /* Mobile filter drawer */
    .filter-drawer-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .filter-drawer-content label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.25rem;
      display: block;
    }

    .filter-drawer-content sl-input,
    .filter-drawer-content sl-select {
      width: 100%;
    }

    /* Tablet - Horizontal scroll with snap (481-768px) */
    @media (max-width: 768px) and (min-width: 481px) {
      main {
        padding: 0.75rem;
      }

      .kanban-board {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0.5rem;
      }

      .kanban-board tick-column {
        scroll-snap-align: start;
        flex: 0 0 280px;
        min-width: 280px;
      }
    }

    /* Mobile - Tab layout (≤480px) */
    @media (max-width: 480px) {
      main {
        display: none;
      }

      .mobile-tab-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      /* Tab group styling */
      .mobile-tab-layout sl-tab-group {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .mobile-tab-layout sl-tab-group::part(base) {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .mobile-tab-layout sl-tab-group::part(nav) {
        background: var(--surface0);
        border-bottom: 1px solid var(--surface1);
        overflow-x: auto;
        padding: 0 0.5rem;
      }

      .mobile-tab-layout sl-tab-group::part(tabs) {
        gap: 0;
      }

      .mobile-tab-layout sl-tab-group::part(body) {
        flex: 1;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab {
        font-size: 0.75rem;
        padding: 0.5rem 0.75rem;
      }

      .mobile-tab-layout sl-tab::part(base) {
        padding: 0.5rem 0.75rem;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active]::part(base) {
        color: var(--text);
      }

      /* Tab badge for count */
      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.375rem;
        margin-left: 0.375rem;
        font-size: 0.625rem;
        font-weight: 600;
        background: var(--surface1);
        border-radius: 999px;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active] .tab-badge {
        background: var(--blue);
        color: var(--base);
      }

      /* Tab panel content */
      .mobile-tab-layout sl-tab-panel {
        height: 100%;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab-panel::part(base) {
        height: 100%;
        padding: 0;
        overflow: hidden;
      }

      .mobile-column-content {
        height: calc(100vh - 140px);
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .mobile-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--subtext0);
        padding: 2rem 1rem;
        text-align: center;
      }

      .mobile-empty-state .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    }

    /* Keyboard shortcuts help dialog */
    .shortcuts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .shortcut-group h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--surface1);
      padding-bottom: 0.5rem;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--subtext1);
    }

    .shortcut-row span {
      margin-left: auto;
      color: var(--text);
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.75rem;
      background: var(--surface1);
      border: 1px solid var(--surface2, var(--overlay0));
      border-radius: 4px;
      color: var(--text);
    }

    @media (max-width: 480px) {
      .shortcuts-grid {
        grid-template-columns: 1fr;
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
  @state() private selectedTickNotes: Note[] = [];
  @state() private selectedTickBlockers: BlockerDetail[] = [];
  @state() private selectedTickParentTitle = '';
  @state() private loading = true;
  @state() private error: string | null = null;

  // Keyboard navigation state
  @state() private focusedColumnIndex = -1; // -1 means no column focused
  @state() private focusedTickIndex = -1;   // -1 means no tick focused
  @state() private showKeyboardHelp = false;
  @state() private showMobileFilterDrawer = false;

  private mediaQuery = window.matchMedia('(max-width: 480px)');

  // SSE connection for real-time updates
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.mediaQuery.addEventListener('change', this.handleMediaChange);
    document.addEventListener('keydown', this.handleKeyDown);
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
    document.removeEventListener('keydown', this.handleKeyDown);
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

    // Activity updates - dispatch event for activity feed component
    if (type === 'activity') {
      window.dispatchEvent(new CustomEvent('activity-update'));
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

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Check if an input element is currently focused.
   * Keyboard navigation should be disabled when user is typing.
   */
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    // Check for standard inputs, textareas, selects, and Shoelace components
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    // Shoelace input components
    if (tagName.startsWith('sl-') && (
      tagName.includes('input') ||
      tagName.includes('textarea') ||
      tagName.includes('select')
    )) {
      return true;
    }
    // Check if element is contenteditable
    if (activeElement.getAttribute('contenteditable') === 'true') {
      return true;
    }
    return false;
  }

  /**
   * Get ticks for the currently focused column.
   */
  private getFocusedColumnTicks(): BoardTick[] {
    if (this.focusedColumnIndex < 0 || this.focusedColumnIndex >= COLUMN_IDS.length) {
      return [];
    }
    return this.getColumnTicks(COLUMN_IDS[this.focusedColumnIndex]);
  }

  /**
   * Initialize focus to the first non-empty column.
   */
  private initializeFocus() {
    for (let i = 0; i < COLUMN_IDS.length; i++) {
      const ticks = this.getColumnTicks(COLUMN_IDS[i]);
      if (ticks.length > 0) {
        this.focusedColumnIndex = i;
        this.focusedTickIndex = 0;
        return;
      }
    }
    // No ticks anywhere, focus first column
    this.focusedColumnIndex = 0;
    this.focusedTickIndex = -1;
  }

  /**
   * Clear keyboard focus.
   */
  private clearFocus() {
    this.focusedColumnIndex = -1;
    this.focusedTickIndex = -1;
  }

  /**
   * Handle keyboard events for navigation.
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle if loading, in error state, or input is focused
    if (this.loading || this.error || this.isInputFocused()) {
      return;
    }

    // Close keyboard help on any key
    if (this.showKeyboardHelp && e.key !== '?') {
      this.showKeyboardHelp = false;
    }

    switch (e.key) {
      // Toggle keyboard help
      case '?':
        e.preventDefault();
        this.showKeyboardHelp = !this.showKeyboardHelp;
        break;

      // Navigate down: j or ArrowDown
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        this.navigateVertical(1);
        break;

      // Navigate up: k or ArrowUp
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        this.navigateVertical(-1);
        break;

      // Navigate left: h or ArrowLeft
      case 'h':
      case 'ArrowLeft':
        e.preventDefault();
        this.navigateHorizontal(-1);
        break;

      // Navigate right: l or ArrowRight
      case 'l':
      case 'ArrowRight':
        e.preventDefault();
        this.navigateHorizontal(1);
        break;

      // Open selected tick: Enter
      case 'Enter':
        e.preventDefault();
        this.openFocusedTick();
        break;

      // Close drawer/dialog or clear focus: Escape
      case 'Escape':
        e.preventDefault();
        this.handleEscape();
        break;

      // Open create dialog: n
      case 'n':
        e.preventDefault();
        this.handleCreateClick();
        break;

      // Focus search input: /
      case '/':
        e.preventDefault();
        this.focusSearchInput();
        break;
    }
  };

  /**
   * Navigate vertically within the current column.
   */
  private navigateVertical(direction: 1 | -1) {
    // Initialize focus if not set
    if (this.focusedColumnIndex < 0) {
      this.initializeFocus();
      return;
    }

    const ticks = this.getFocusedColumnTicks();
    if (ticks.length === 0) return;

    // Calculate new index with wrapping
    let newIndex = this.focusedTickIndex + direction;
    if (newIndex < 0) {
      newIndex = ticks.length - 1;
    } else if (newIndex >= ticks.length) {
      newIndex = 0;
    }

    this.focusedTickIndex = newIndex;
  }

  /**
   * Navigate horizontally between columns.
   */
  private navigateHorizontal(direction: 1 | -1) {
    // Initialize focus if not set
    if (this.focusedColumnIndex < 0) {
      this.initializeFocus();
      return;
    }

    // Calculate new column index with wrapping
    let newColumnIndex = this.focusedColumnIndex + direction;
    if (newColumnIndex < 0) {
      newColumnIndex = COLUMN_IDS.length - 1;
    } else if (newColumnIndex >= COLUMN_IDS.length) {
      newColumnIndex = 0;
    }

    this.focusedColumnIndex = newColumnIndex;

    // Adjust tick index for new column
    const ticks = this.getColumnTicks(COLUMN_IDS[newColumnIndex]);
    if (ticks.length === 0) {
      this.focusedTickIndex = -1;
    } else if (this.focusedTickIndex >= ticks.length) {
      this.focusedTickIndex = ticks.length - 1;
    } else if (this.focusedTickIndex < 0) {
      this.focusedTickIndex = 0;
    }

    // On mobile, switch active column
    if (this.isMobile) {
      this.activeColumn = COLUMN_IDS[newColumnIndex];
      this.updateBoardState();
    }
  }

  /**
   * Open the currently focused tick in the drawer.
   */
  private openFocusedTick() {
    if (this.focusedColumnIndex < 0 || this.focusedTickIndex < 0) {
      return;
    }

    const ticks = this.getFocusedColumnTicks();
    if (this.focusedTickIndex < ticks.length) {
      this.selectedTick = ticks[this.focusedTickIndex];
    }
  }

  /**
   * Handle escape key: close dialogs/drawers or clear focus.
   */
  private handleEscape() {
    if (this.showKeyboardHelp) {
      this.showKeyboardHelp = false;
    } else if (this.selectedTick) {
      this.selectedTick = null;
    } else {
      this.clearFocus();
    }
  }

  /**
   * Focus the search input in the header.
   */
  private focusSearchInput() {
    const header = this.shadowRoot?.querySelector('tick-header');
    if (header?.shadowRoot) {
      const searchInput = header.shadowRoot.querySelector('sl-input');
      if (searchInput) {
        (searchInput as HTMLElement).focus();
      }
    }
  }

  /**
   * Get the currently focused tick ID (for child components).
   */
  private getFocusedTickId(): string | null {
    if (this.focusedColumnIndex < 0 || this.focusedTickIndex < 0) {
      return null;
    }
    const ticks = this.getFocusedColumnTicks();
    if (this.focusedTickIndex < ticks.length) {
      return ticks[this.focusedTickIndex].id;
    }
    return null;
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

  private handleMobileMenuToggle() {
    this.showMobileFilterDrawer = true;
  }

  private handleMobileTabChange(e: CustomEvent) {
    const tabGroup = e.target as HTMLElement;
    const activeTab = tabGroup.querySelector('sl-tab[active]');
    if (activeTab) {
      const panel = activeTab.getAttribute('panel') as TickColumn;
      if (panel && COLUMN_IDS.includes(panel)) {
        this.activeColumn = panel;
        // Update focused column index when switching tabs
        this.focusedColumnIndex = COLUMN_IDS.indexOf(panel);
        this.focusedTickIndex = this.getColumnTicks(panel).length > 0 ? 0 : -1;
        this.updateBoardState();
      }
    }
  }

  private handleMobileSearchInput(e: CustomEvent) {
    const input = e.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.updateBoardState();
  }

  private handleMobileEpicFilterChange(e: CustomEvent) {
    const select = e.target as HTMLSelectElement;
    this.selectedEpic = select.value;
    this.updateBoardState();
  }

  // Handle activity item click - find and select the tick
  private handleActivityClick(e: CustomEvent<{ tickId: string }>) {
    const tickId = e.detail.tickId;
    const tick = this.ticks.find(t => t.id === tickId);
    if (tick) {
      this.selectedTick = tick;
    } else {
      // Tick not in current view, show toast
      if (window.showToast) {
        window.showToast({
          message: `Tick ${tickId} not found in current view`,
          variant: 'warning',
        });
      }
    }
  }

  // Handle tick selection from columns
  private async handleTickSelected(e: CustomEvent<{ tick: BoardTick }>) {
    const tick = e.detail.tick;
    this.selectedTick = tick;

    // Reset drawer details
    this.selectedTickNotes = [];
    this.selectedTickBlockers = [];
    this.selectedTickParentTitle = '';

    // Fetch full tick details (notes, blockers, etc.)
    try {
      const details = await fetchTick(tick.id);
      this.selectedTickNotes = details.notesList || [];
      this.selectedTickBlockers = details.blockerDetails || [];

      // Look up parent title if tick has a parent
      if (tick.parent) {
        const parentEpic = this.epics.find(e => e.id === tick.parent);
        this.selectedTickParentTitle = parentEpic?.title || '';
      }
    } catch (err) {
      console.error('Failed to fetch tick details:', err);
    }
  }

  // Handle drawer close
  private handleDrawerClose() {
    this.selectedTick = null;
    this.selectedTickNotes = [];
    this.selectedTickBlockers = [];
    this.selectedTickParentTitle = '';
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
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
      ></tick-header>

      <!-- Toast notification stack -->
      <tick-toast-stack></tick-toast-stack>

      <!-- Detail drawer -->
      <tick-detail-drawer
        .tick=${this.selectedTick}
        .open=${this.selectedTick !== null}
        .notesList=${this.selectedTickNotes}
        .blockerDetails=${this.selectedTickBlockers}
        parent-title=${this.selectedTickParentTitle}
        @drawer-close=${this.handleDrawerClose}
      ></tick-detail-drawer>

      <!-- Desktop/Tablet kanban board -->
      <main>
        <div class="kanban-board">
          ${COLUMNS.map((col, colIndex) => html`
            <tick-column
              name=${col.id}
              .ticks=${this.getColumnTicks(col.id)}
              .epicNames=${epicNames}
              focused-tick-id=${this.focusedColumnIndex === colIndex ? this.getFocusedTickId() ?? '' : ''}
              @tick-selected=${this.handleTickSelected}
            ></tick-column>
          `)}
        </div>
      </main>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${COLUMNS.map(col => html`
            <sl-tab
              slot="nav"
              panel=${col.id}
              ?active=${this.activeColumn === col.id}
            >
              ${col.icon}
              <span class="tab-badge">${this.getColumnTicks(col.id).length}</span>
            </sl-tab>
          `)}
          ${COLUMNS.map((col, colIndex) => html`
            <sl-tab-panel name=${col.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(col.id).length === 0
                  ? html`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${col.icon}</div>
                        <div>No ticks in ${col.name}</div>
                      </div>
                    `
                  : this.getColumnTicks(col.id).map(tick => html`
                      <tick-card
                        .tick=${tick}
                        epic-name=${epicNames[tick.parent || ''] || ''}
                        ?focused=${this.focusedColumnIndex === colIndex && this.getFocusedTickId() === tick.id}
                        @tick-selected=${this.handleTickSelected}
                      ></tick-card>
                    `)}
              </div>
            </sl-tab-panel>
          `)}
        </sl-tab-group>
      </div>

      <!-- Mobile filter drawer -->
      <sl-drawer
        label="Filters"
        placement="start"
        ?open=${this.showMobileFilterDrawer}
        @sl-after-hide=${() => { this.showMobileFilterDrawer = false; }}
      >
        <div class="filter-drawer-content">
          <div>
            <label>Search</label>
            <sl-input
              placeholder="Search by ID or title..."
              clearable
              .value=${this.searchTerm}
              @sl-input=${this.handleMobileSearchInput}
            >
              <sl-icon name="search" slot="prefix"></sl-icon>
            </sl-input>
          </div>
          <div>
            <label>Filter by Epic</label>
            <sl-select
              placeholder="All Ticks"
              clearable
              .value=${this.selectedEpic}
              @sl-change=${this.handleMobileEpicFilterChange}
            >
              ${this.epics.map(epic => html`
                <sl-option value=${epic.id}>${epic.title}</sl-option>
              `)}
            </sl-select>
          </div>
        </div>
        <sl-button
          slot="footer"
          variant="primary"
          @click=${() => { this.showMobileFilterDrawer = false; }}
        >
          Apply
        </sl-button>
      </sl-drawer>

      <!-- Keyboard shortcuts help dialog -->
      <sl-dialog
        label="Keyboard Shortcuts"
        ?open=${this.showKeyboardHelp}
        @sl-after-hide=${() => { this.showKeyboardHelp = false; }}
        class="keyboard-help-dialog"
      >
        <div class="shortcuts-grid">
          <div class="shortcut-group">
            <h4>Navigation</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>↓</kbd>
              <span>Move down</span>
            </div>
            <div class="shortcut-row">
              <kbd>k</kbd> <kbd>↑</kbd>
              <span>Move up</span>
            </div>
            <div class="shortcut-row">
              <kbd>h</kbd> <kbd>←</kbd>
              <span>Previous column</span>
            </div>
            <div class="shortcut-row">
              <kbd>l</kbd> <kbd>→</kbd>
              <span>Next column</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Actions</h4>
            <div class="shortcut-row">
              <kbd>Enter</kbd>
              <span>Open selected tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>Esc</kbd>
              <span>Close drawer / clear focus</span>
            </div>
            <div class="shortcut-row">
              <kbd>n</kbd>
              <span>Create new tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>/</kbd>
              <span>Focus search</span>
            </div>
            <div class="shortcut-row">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-board': TickBoard;
  }
}
