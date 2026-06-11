import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { boardContext, initialBoardState, type BoardState } from '../contexts/board-context.js';
import type { BoardTick, TickColumn, Epic } from '../types/tick.js';
import { type Note, type BlockerDetail } from '../api/ticks.js';
import {
  // Connection stores
  $isCloudMode,
  $localClientConnected,
  $isReadOnly,
  $effectiveConnectionStatus,
  setCloudMode,
  setLocalMode,
  // Tick stores
  $ticksList,
  $epics,
  $repoName,
  $selectedTick,
  $selectedTickNotes,
  $selectedTickBlockers,
  $selectedTickParentTitle,
  $loading,
  $error,
  updateTick,
  removeTick,
  selectTick,
  setRepoName,
  setLoading,
  setError,
  setTicks,
  // Comms
  initCommsAutoConnect,
  initLocalComms,
  initCloudComms,
  disconnectComms,
  // Read operations (comms wrappers)
  fetchTicks,
  fetchInfo,
  fetchTickDetails,
  fetchActivity,
  // Roadmap
  $roadmap,
  $roadmapLoading,
  $roadmapError,
  loadRoadmap,
} from '../stores/index.js';
import type { Activity } from '../api/ticks.js';

// Initialize comms auto-connect (handles mode switching)
console.log('[TickBoard] Initializing comms module');
initCommsAutoConnect();
import './ticks-button.js';
import './ticks-alert.js';
import './roadmap-view.js';

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

    .epic-id {
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
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

    /* Split layout when run panel is active */
    .board-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
  `;

  // Provide board context to all child components
  @provide({ context: boardContext })
  @state()
  boardState: BoardState = { ...initialBoardState };

  // ============================================================================
  // Store subscriptions (synced state from nanostores)
  // ============================================================================
  private ticksController = new StoreController(this, $ticksList);
  private epicsController = new StoreController(this, $epics);
  private repoNameController = new StoreController(this, $repoName);
  private selectedTickController = new StoreController(this, $selectedTick);
  private selectedTickNotesController = new StoreController(this, $selectedTickNotes);
  private selectedTickBlockersController = new StoreController(this, $selectedTickBlockers);
  private selectedTickParentTitleController = new StoreController(this, $selectedTickParentTitle);
  private loadingController = new StoreController(this, $loading);
  private errorController = new StoreController(this, $error);
  private isCloudModeController = new StoreController(this, $isCloudMode);
  private localClientConnectedController = new StoreController(this, $localClientConnected);
  private isReadOnlyController = new StoreController(this, $isReadOnly);
  private connectionStatusController = new StoreController(this, $effectiveConnectionStatus);
  private roadmapController = new StoreController(this, $roadmap);
  private roadmapLoadingController = new StoreController(this, $roadmapLoading);
  private roadmapErrorController = new StoreController(this, $roadmapError);

  // Getters for store values (cleaner access in templates)
  private get ticks() { return this.ticksController.value; }
  private get epics() { return this.epicsController.value; }
  private get repoName() { return this.repoNameController.value; }
  private get selectedTick() { return this.selectedTickController.value; }
  private get selectedTickNotes() { return this.selectedTickNotesController.value; }
  private get selectedTickBlockers() { return this.selectedTickBlockersController.value; }
  private get selectedTickParentTitle() { return this.selectedTickParentTitleController.value; }
  private get loading() { return this.loadingController.value; }
  private get error() { return this.errorController.value; }
  private get isCloudMode() { return this.isCloudModeController.value; }
  private get localClientConnected() { return this.localClientConnectedController.value; }
  private get isReadOnly() { return this.isReadOnlyController.value; }
  private get connectionStatus() { return this.connectionStatusController.value; }
  private get roadmapData() { return this.roadmapController.value; }
  private get roadmapLoading() { return this.roadmapLoadingController.value; }
  private get roadmapError() { return this.roadmapErrorController.value; }

  // ============================================================================
  // Local UI state (not synced)
  // ============================================================================
  @state() private selectedEpic = '';
  @state() private searchTerm = '';
  @state() private activeColumn: TickColumn = 'blocked';
  @state() private isMobile = window.matchMedia('(max-width: 480px)').matches;

  // Keyboard navigation state
  @state() private focusedColumnIndex = -1; // -1 means no column focused
  @state() private focusedTickIndex = -1;   // -1 means no tick focused
  @state() private showKeyboardHelp = false;
  @state() private showCreateDialog = false;
  @state() private showMobileFilterDrawer = false;

  // Overlay state
  @state() private showDashboard = false;
  @state() private dashboardActivities: Activity[] = [];
  @state() private showRoadmap = false;

  private mediaQuery = window.matchMedia('(max-width: 480px)');

  connectedCallback() {
    super.connectedCallback();
    this.mediaQuery.addEventListener('change', this.handleMediaChange);
    document.addEventListener('keydown', this.handleKeyDown);

    // Detect cloud mode from URL or config (sets store, auto-triggers comms connection)
    this.detectCloudMode();

    // Load data (comms handles SSE/WebSocket connection automatically)
    if (!this.isCloudMode) {
      this.loadData();
    }
  }

  /**
   * Detect if running in cloud mode.
   * Sets cloud mode in store which auto-triggers sync connection.
   */
  private detectCloudMode() {
    // Check URL path for cloud pattern: /p/<project-id>
    const pathMatch = window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);
    if (pathMatch) {
      const projectId = decodeURIComponent(pathMatch[1]);
      console.log('[TickBoard] Cloud mode detected, project:', projectId);
      setCloudMode(projectId);
      return;
    }

    // Check localStorage for project config
    const storedProject = localStorage.getItem('ticks_project');
    if (storedProject) {
      console.log('[TickBoard] Cloud mode from localStorage, project:', storedProject);
      setCloudMode(storedProject);
      return;
    }

    // Check if served from ticks.sh (not localhost)
    if (window.location.hostname === 'ticks.sh' || window.location.hostname.endsWith('.ticks.sh')) {
      const projectFromUrl = new URLSearchParams(window.location.search).get('project');
      if (projectFromUrl) {
        console.log('[TickBoard] Cloud mode from query param, project:', projectFromUrl);
        setCloudMode(projectFromUrl);
        return;
      }
    }

    console.log('[TickBoard] Local mode');
    setLocalMode();
  }

  private async loadData() {
    // In cloud mode, data comes from CloudCommsClient WebSocket, not local API
    if (this.isCloudMode) {
      console.log('[TickBoard] Cloud mode: waiting for data from CloudCommsClient');
      setLoading(true);
      // Loading state will be cleared when CloudCommsClient receives state
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch ticks and info in parallel (local mode only)
      const [ticks, info] = await Promise.all([
        fetchTicks(),
        fetchInfo(),
      ]);

      // Update stores with fetched data
      setTicks(ticks);
      setRepoName(info.repoName);
      // Note: epics are computed from ticks where type === 'epic'
      this.updateBoardState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Failed to load board data:', err);
    }
    // Note: setTicks and setError automatically set loading to false
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mediaQuery.removeEventListener('change', this.handleMediaChange);
    document.removeEventListener('keydown', this.handleKeyDown);
    // Note: CommsClient disconnect is handled by the store when component unmounts
  }
  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Check if an input element is currently focused.
   * Keyboard navigation should be disabled when user is typing.
   * Traverses shadow DOM to handle Shoelace components properly.
   */
  private isInputFocused(): boolean {
    // Get the deepest active element, traversing shadow DOMs
    let activeElement: Element | null = document.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }

    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    // Check for standard inputs, textareas, selects
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    // Check if element is contenteditable
    if (activeElement.getAttribute('contenteditable') === 'true') {
      return true;
    }

    // Also check the host chain for Shoelace input components
    let host: Element | null = activeElement;
    while (host) {
      const hostTag = host.tagName.toLowerCase();
      if (hostTag.startsWith('sl-') && (
        hostTag.includes('input') ||
        hostTag.includes('textarea') ||
        hostTag.includes('select')
      )) {
        return true;
      }
      // Walk up to parent or shadow host
      const root = host.getRootNode();
      host = root instanceof ShadowRoot ? root.host : null;
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

    // When dashboard is open, let the dashboard handle navigation/action keys.
    // Only handle Escape, 'd', 'm', and '?' at the board level.
    if (this.showDashboard && e.key !== 'Escape' && e.key !== 'd' && e.key !== 'm' && e.key !== '?') {
      return;
    }

    // When roadmap is open, only handle Escape and 'm' at the board level.
    if (this.showRoadmap && e.key !== 'Escape' && e.key !== 'm' && e.key !== '?') {
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

      // Toggle dashboard overlay: d
      case 'd':
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          this.toggleDashboard();
        }
        break;

      // Toggle roadmap overlay: m
      case 'm':
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          this.toggleRoadmap();
        }
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
      selectTick(ticks[this.focusedTickIndex].id);
    }
  }

  /**
   * Handle escape key: close dialogs/drawers or clear focus.
   */
  private handleEscape() {
    if (this.showRoadmap) {
      this.showRoadmap = false;
    } else if (this.showDashboard) {
      this.showDashboard = false;
    } else if (this.showKeyboardHelp) {
      this.showKeyboardHelp = false;
    } else if (this.selectedTick) {
      selectTick(null);
    } else {
      this.clearFocus();
    }
  }

  /**
   * Toggle the dashboard overlay.
   */
  private async toggleDashboard() {
    this.showDashboard = !this.showDashboard;
    if (this.showDashboard) {
      // Fetch recent activity when opening
      try {
        this.dashboardActivities = await fetchActivity(20);
      } catch {
        this.dashboardActivities = [];
      }
    }
  }

  /**
   * Toggle the roadmap overlay.
   * Fetches fresh roadmap data each time it opens.
   */
  private async toggleRoadmap() {
    this.showRoadmap = !this.showRoadmap;
    if (this.showRoadmap) {
      await loadRoadmap();
    }
  }

  /**
   * Handle epic selection from dashboard.
   */
  private handleDashboardEpicSelect(e: CustomEvent<{ epicId: string }>) {
    this.selectedEpic = e.detail.epicId;
    this.showDashboard = false;
    this.updateBoardState();
  }

  /**
   * Handle tick selection from dashboard.
   */
  private handleDashboardTickSelect(e: CustomEvent<{ tickId: string }>) {
    selectTick(e.detail.tickId);
    this.showDashboard = false;
  }

  /**
   * Handle resume (approve) action from dashboard.
   * Approves the awaiting tick so the agent can continue.
   */
  private async handleDashboardTickResume(e: CustomEvent<{ tickId: string }>) {
    const { tickId } = e.detail;
    try {
      const response = await import('../stores/comms.js').then(m => m.approveTick(tickId));
      // updateTick recomputes is_blocked/column via tickToBoardTick, so pass the raw Tick.
      updateTick(response);
      window.showToast?.({ message: `Resumed tick ${tickId}`, variant: 'success' });
    } catch (err) {
      window.showToast?.({ message: `Failed to resume ${tickId}: ${err instanceof Error ? err.message : err}`, variant: 'danger' });
    }
  }

  /**
   * Handle retry action from dashboard.
   * Reopens the tick so the agent picks it up again.
   */
  private async handleDashboardTickRetry(e: CustomEvent<{ tickId: string }>) {
    const { tickId } = e.detail;
    try {
      const response = await import('../stores/comms.js').then(m => m.reopenTick(tickId));
      // updateTick recomputes is_blocked/column via tickToBoardTick, so pass the raw Tick.
      updateTick(response);
      window.showToast?.({ message: `Retrying tick ${tickId}`, variant: 'success' });
    } catch (err) {
      window.showToast?.({ message: `Failed to retry ${tickId}: ${err instanceof Error ? err.message : err}`, variant: 'danger' });
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
        (searchInput as unknown as HTMLElement).focus();
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
    this.showCreateDialog = true;
  }

  private handleCreateDialogClose() {
    this.showCreateDialog = false;
  }

  private handleTickCreated(e: CustomEvent) {
    // Add the new tick to the store
    const { tick } = e.detail;
    updateTick(tick);
    this.showCreateDialog = false;
    this.updateBoardState();
    window.showToast?.({ message: `Created tick ${tick.id}`, variant: 'success' });
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
      selectTick(tick.id);
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
    // Select tick in store - computed stores will derive notes, blockers, parent title
    selectTick(tick.id);

    // In local mode, fetch detailed tick info to ensure notes are up-to-date
    // (The computed store parseNotes works for both modes, but local API may have more detail)
    if (!this.isCloudMode) {
      try {
        const details = await fetchTickDetails(tick.id);
        // Update the tick in store with full details
        updateTick(details);
      } catch (err) {
        console.error('Failed to fetch tick details:', err);
      }
    }
  }

  // Handle drawer close
  private handleDrawerClose() {
    selectTick(null);
  }

  private handleTickUpdated(e: CustomEvent<{ tick: BoardTick & { notesList?: Note[]; blockerDetails?: BlockerDetail[] } }>) {
    const { tick } = e.detail;
    // Update the tick in store - computed stores will auto-update notes/blockers/etc.
    updateTick(tick);
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
          <ticks-alert variant="error">
            <strong>Failed to load board</strong><br>
            ${this.error}
          </ticks-alert>
          <ticks-button variant="primary" @click=${this.loadData}>Retry</ticks-button>
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
        connection-status=${this.connectionStatus}
        ?readonly-mode=${this.isCloudMode && !this.localClientConnected}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @dashboard-toggle=${this.toggleDashboard}
        @roadmap-toggle=${this.toggleRoadmap}
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
        ?readonly-mode=${this.isCloudMode && !this.localClientConnected}
        @drawer-close=${this.handleDrawerClose}
        @tick-updated=${this.handleTickUpdated}
      ></tick-detail-drawer>

      <!-- Create tick dialog -->
      <tick-create-dialog
        .open=${this.showCreateDialog}
        .epics=${this.epics}
        @dialog-close=${this.handleCreateDialogClose}
        @tick-created=${this.handleTickCreated}
      ></tick-create-dialog>

      <!-- Desktop/Tablet kanban board -->
      <div class="board-layout">
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
      </div>

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
                <sl-option value=${epic.id}>
                  <span class="epic-id">${epic.id}</span> - ${epic.title}
                </sl-option>
              `)}
            </sl-select>
          </div>
        </div>
        <ticks-button
          slot="footer"
          variant="primary"
          @click=${() => { this.showMobileFilterDrawer = false; }}
        >
          Apply
        </ticks-button>
      </sl-drawer>

      <!-- Tickflow Dashboard overlay -->
      <tickflow-dashboard
        ?open=${this.showDashboard}
        .ticks=${this.ticks}
        .epics=${this.epics}
        .activities=${this.dashboardActivities}
        repo-name=${this.repoName}
        @close=${() => { this.showDashboard = false; }}
        @epic-select=${this.handleDashboardEpicSelect}
        @tick-select=${this.handleDashboardTickSelect}
        @tick-resume=${this.handleDashboardTickResume}
        @tick-retry=${this.handleDashboardTickRetry}
      ></tickflow-dashboard>

      <!-- Roadmap overlay -->
      ${this.showRoadmap ? html`
        <roadmap-view
          .roadmap=${this.roadmapData ?? null}
          .loading=${this.roadmapLoading ?? false}
          .error=${this.roadmapError ?? null}
          @close=${() => { this.showRoadmap = false; }}
        ></roadmap-view>
      ` : nothing}

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
              <kbd>r</kbd>
              <span>Toggle run panel</span>
            </div>
            <div class="shortcut-row">
              <kbd>d</kbd>
              <span>Toggle dashboard</span>
            </div>
            <div class="shortcut-row">
              <kbd>m</kbd>
              <span>Toggle roadmap</span>
            </div>
            <div class="shortcut-row">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Dashboard (when open)</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>k</kbd>
              <span>Navigate attention list</span>
            </div>
            <div class="shortcut-row">
              <kbd>Enter</kbd> <kbd>i</kbd>
              <span>Inspect tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>a</kbd>
              <span>Resume (approve) tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>t</kbd>
              <span>Retry (reopen) tick</span>
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
