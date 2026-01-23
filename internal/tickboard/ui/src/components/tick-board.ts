import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { boardContext, initialBoardState, type BoardState } from '../contexts/board-context.js';
import type { BoardTick, TickColumn, Epic } from '../types/tick.js';
import { fetchTicks, fetchTick, fetchInfo, fetchRunStatus, setCloudProject as setCloudProjectApi, type Note, type BlockerDetail, type RunStatusResponse, type MetricsRecord as ApiMetricsRecord } from '../api/ticks.js';
import type { ToolActivityInfo } from './tool-activity.js';
import type { MetricsRecord } from './run-metrics.js';
import {
  // Connection stores
  $isCloudMode,
  $localClientConnected,
  $isReadOnly,
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
} from '../stores/index.js';
// Import sync store and explicitly initialize
import { initSync } from '../stores/sync.js';

// Ensure sync is initialized
console.log('[TickBoard] Initializing sync module');
initSync();
import './ticks-button.js';
import './ticks-alert.js';

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
      font-family: monospace;
      color: var(--subtext0);
      font-size: 0.85em;
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

    .board-layout.split main {
      flex: 0 0 50%;
      min-width: 400px;
    }

    .board-layout.split .kanban-board {
      height: calc(100vh - 80px);
    }

    /* Run panel container */
    .run-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--surface1, #45475a);
      background: var(--base, #1e1e2e);
      min-width: 400px;
      max-width: 60%;
      overflow: hidden;
    }

    .run-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
      flex-shrink: 0;
    }

    .run-panel-header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-panel-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .run-panel-title sl-icon {
      color: var(--green, #a6e3a1);
    }

    .run-panel-epic {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-epic .epic-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .run-panel-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-panel-header-right sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-header-right sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .run-panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0.75rem;
      gap: 0.75rem;
    }

    /* Run info bar */
    .run-info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .run-task-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .run-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .run-task-title {
      color: var(--text, #cdd6f4);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Run output section */
    .run-output-section {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* No run state */
    .no-run-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--subtext0, #a6adc8);
      text-align: center;
      padding: 2rem;
    }

    .no-run-state sl-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-run-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    .no-run-state .hint {
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--overlay0, #6c7086);
    }

    /* Run toggle button in header area */
    .run-toggle-btn {
      position: relative;
    }

    .run-toggle-btn .live-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    /* Hide run panel on mobile */
    @media (max-width: 768px) {
      .run-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        min-width: unset;
        max-width: unset;
        border-left: none;
        z-index: 100;
      }

      .board-layout.split main {
        flex: 1;
        min-width: unset;
      }
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

  // Run monitoring state
  @state() private showRunPanel = false;
  @state() private runStatus: RunStatusResponse | null = null;
  @state() private runPanelEpicId: string | null = null;
  @state() private runStreamConnected = false;
  @state() private activeToolInfo: ToolActivityInfo | null = null;
  @state() private runMetrics: MetricsRecord | null = null;

  private mediaQuery = window.matchMedia('(max-width: 480px)');

  // SSE connection for real-time updates
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // SSE connection for run stream
  private runEventSource: EventSource | null = null;
  private runReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private runPollInterval: ReturnType<typeof setInterval> | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.mediaQuery.addEventListener('change', this.handleMediaChange);
    document.addEventListener('keydown', this.handleKeyDown);

    // Detect cloud mode from URL or config (sets store, auto-connects sync)
    this.detectCloudMode();

    // Load data (only needed in local mode - cloud mode uses sync store)
    if (!this.isCloudMode) {
      this.loadData();
      this.connectSSE();
      this.startRunStatusPolling();
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
      setCloudProjectApi(projectId); // Also set for API calls
      return;
    }

    // Check localStorage for project config
    const storedProject = localStorage.getItem('ticks_project');
    if (storedProject) {
      console.log('[TickBoard] Cloud mode from localStorage, project:', storedProject);
      setCloudMode(storedProject);
      setCloudProjectApi(storedProject);
      return;
    }

    // Check if served from ticks.sh (not localhost)
    if (window.location.hostname === 'ticks.sh' || window.location.hostname.endsWith('.ticks.sh')) {
      const projectFromUrl = new URLSearchParams(window.location.search).get('project');
      if (projectFromUrl) {
        console.log('[TickBoard] Cloud mode from query param, project:', projectFromUrl);
        setCloudMode(projectFromUrl);
        setCloudProjectApi(projectFromUrl);
        return;
      }
    }

    console.log('[TickBoard] Local mode');
    setLocalMode();
    setCloudProjectApi(null);
  }

  private async loadData() {
    // In cloud mode, data comes from SyncClient WebSocket, not local API
    if (this.isCloudMode) {
      console.log('[TickBoard] Cloud mode: waiting for data from SyncClient');
      setLoading(true);
      // Loading state will be cleared when SyncClient receives state
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
    this.disconnectSSE();
    // Note: Sync client disconnect is handled automatically by store subscriptions
    this.disconnectRunStream();
    this.stopRunStatusPolling();
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

  // ============================================================================
  // Run Status Monitoring
  // ============================================================================

  /**
   * Start polling for active runs across all epics.
   * This detects when a run starts so we can show the run panel.
   */
  private startRunStatusPolling() {
    // Poll every 5 seconds for new runs
    this.runPollInterval = setInterval(() => {
      this.checkForActiveRuns();
    }, 5000);

    // Also check immediately
    this.checkForActiveRuns();
  }

  /**
   * Stop polling for active runs.
   */
  private stopRunStatusPolling() {
    if (this.runPollInterval) {
      clearInterval(this.runPollInterval);
      this.runPollInterval = null;
    }
  }

  /**
   * Check all epics for active runs.
   * If a run is found and we're not already showing the run panel,
   * automatically show it.
   */
  private async checkForActiveRuns() {
    // Only check if we have epics
    if (this.epics.length === 0) return;

    // Check each epic for active runs
    for (const epic of this.epics) {
      try {
        const status = await fetchRunStatus(epic.id);
        if (status.isRunning) {
          // Found an active run
          this.runStatus = status;

          // If not already connected to this epic's stream, connect
          if (this.runPanelEpicId !== epic.id) {
            this.runPanelEpicId = epic.id;
            this.connectRunStream(epic.id);
          }

          // Note: Don't auto-show the run panel - let users toggle it manually

          // Update metrics from status
          if (status.activeTask?.metrics) {
            this.runMetrics = this.convertApiMetrics(status.activeTask.metrics);
          }

          // Update active tool
          if (status.activeTask?.activeTool) {
            this.activeToolInfo = {
              name: status.activeTask.activeTool.name,
              input: status.activeTask.activeTool.input,
              output: status.activeTask.activeTool.output,
              durationMs: status.activeTask.activeTool.duration_ms,
              isError: status.activeTask.activeTool.is_error,
              isComplete: false,
            };
          }

          return; // Only handle one active run at a time
        }
      } catch {
        // Ignore errors when checking run status
      }
    }

    // No active runs found
    if (this.runStatus?.isRunning) {
      this.runStatus = { ...this.runStatus, isRunning: false };
    }
  }

  /**
   * Convert API metrics format to component metrics format.
   */
  private convertApiMetrics(apiMetrics: ApiMetricsRecord): MetricsRecord {
    return {
      inputTokens: apiMetrics.input_tokens,
      outputTokens: apiMetrics.output_tokens,
      cacheReadTokens: apiMetrics.cache_read_tokens,
      cacheCreationTokens: apiMetrics.cache_creation_tokens,
      costUsd: apiMetrics.cost_usd,
      durationMs: apiMetrics.duration_ms,
    };
  }

  /**
   * Connect to the run stream SSE for a specific epic.
   */
  private connectRunStream(epicId: string) {
    // Clean up any existing connection
    this.disconnectRunStream();

    this.runEventSource = new EventSource(`./api/run-stream/${epicId}`);

    // Handle connection established
    this.runEventSource.addEventListener('connected', () => {
      this.runStreamConnected = true;
      console.log('[RunStream] Connected to epic:', epicId);
    });

    // Handle task started
    this.runEventSource.addEventListener('task-started', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.runStatus = {
          epicId,
          isRunning: true,
          activeTask: {
            tickId: data.taskId,
            title: data.title || '',
            status: 'running',
            numTurns: data.numTurns || 0,
            metrics: data.metrics || {
              input_tokens: 0,
              output_tokens: 0,
              cache_read_tokens: 0,
              cache_creation_tokens: 0,
              cost_usd: 0,
              duration_ms: 0,
            },
            lastUpdated: new Date().toISOString(),
          },
        };
        this.activeToolInfo = null;
      } catch (err) {
        console.error('[RunStream] Failed to parse task-started:', err);
      }
    });

    // Handle task update
    this.runEventSource.addEventListener('task-update', (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update metrics
        if (data.metrics) {
          this.runMetrics = this.convertApiMetrics(data.metrics);
        }

        // Update active tool
        if (data.activeTool) {
          this.activeToolInfo = {
            name: data.activeTool.name,
            input: data.activeTool.input,
            output: data.activeTool.output,
            durationMs: data.activeTool.duration,
            isComplete: false,
          };
        }

        // Update run status
        if (this.runStatus?.activeTask) {
          this.runStatus = {
            ...this.runStatus,
            activeTask: {
              ...this.runStatus.activeTask,
              numTurns: data.numTurns ?? this.runStatus.activeTask.numTurns,
              lastUpdated: new Date().toISOString(),
            },
          };
        }
      } catch (err) {
        console.error('[RunStream] Failed to parse task-update:', err);
      }
    });

    // Handle tool activity
    this.runEventSource.addEventListener('tool-activity', (event) => {
      try {
        const data = JSON.parse(event.data);
        const tool = data.tool || data.activeTool;
        if (tool) {
          this.activeToolInfo = {
            name: tool.name,
            input: tool.input,
            output: tool.output,
            durationMs: tool.duration,
            isComplete: false,
          };
        }
      } catch (err) {
        console.error('[RunStream] Failed to parse tool-activity:', err);
      }
    });

    // Handle task completed
    this.runEventSource.addEventListener('task-completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[RunStream] Task completed:', data.taskId);

        // Clear active tool
        this.activeToolInfo = null;

        // Update status
        if (this.runStatus) {
          this.runStatus = {
            ...this.runStatus,
            isRunning: false,
            activeTask: undefined,
          };
        }
      } catch (err) {
        console.error('[RunStream] Failed to parse task-completed:', err);
      }
    });

    // Handle epic completed
    this.runEventSource.addEventListener('epic-completed', () => {
      console.log('[RunStream] Epic completed:', epicId);
      this.runStatus = { epicId, isRunning: false };
      this.activeToolInfo = null;
    });

    // Handle errors
    this.runEventSource.onerror = () => {
      console.log('[RunStream] Connection error');
      this.runStreamConnected = false;
      this.runEventSource?.close();
      this.runEventSource = null;
      // Don't auto-reconnect - let polling handle it
    };
  }

  /**
   * Disconnect from run stream SSE.
   */
  private disconnectRunStream() {
    if (this.runReconnectTimeout) {
      clearTimeout(this.runReconnectTimeout);
      this.runReconnectTimeout = null;
    }
    if (this.runEventSource) {
      this.runEventSource.close();
      this.runEventSource = null;
    }
    this.runStreamConnected = false;
  }

  /**
   * Toggle the run panel visibility.
   */
  private toggleRunPanel() {
    this.showRunPanel = !this.showRunPanel;

    // If showing and we have an active run, connect to its stream
    if (this.showRunPanel && this.runStatus?.isRunning && this.runStatus.epicId) {
      if (this.runPanelEpicId !== this.runStatus.epicId) {
        this.runPanelEpicId = this.runStatus.epicId;
        this.connectRunStream(this.runStatus.epicId);
      }
    }
  }

  /**
   * Close the run panel.
   */
  private closeRunPanel() {
    this.showRunPanel = false;
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
          // Update store - tickToBoardTick is called inside updateTick
          updateTick(response);
          // Note: epics are computed from ticks, so no need to update separately
          // Note: selectedTickNotes/blockers are computed from selectedTick, auto-updated
          this.updateBoardState();
        } catch (err) {
          console.error(`[SSE] Failed to fetch tick ${tickId}:`, err);
        }
        break;
      }

      case 'delete': {
        // Remove tick from store (also clears selection if deleted tick was selected)
        removeTick(tickId);
        // Note: epics are computed from ticks, so removing an epic tick updates the list
        this.updateBoardState();
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

      // Toggle run panel: r (only when no modifiers pressed)
      case 'r':
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          this.toggleRunPanel();
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
    if (this.showKeyboardHelp) {
      this.showKeyboardHelp = false;
    } else if (this.selectedTick) {
      selectTick(null);
    } else if (this.showRunPanel) {
      this.showRunPanel = false;
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
        const details = await fetchTick(tick.id);
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

  /**
   * Render the run monitoring panel.
   */
  private renderRunPanel() {
    const hasActiveRun = this.runStatus?.isRunning && this.runStatus.activeTask;
    const epicTitle = this.epics.find(e => e.id === this.runPanelEpicId)?.title || this.runPanelEpicId || 'Unknown Epic';

    return html`
      <div class="run-panel">
        <div class="run-panel-header">
          <div class="run-panel-header-left">
            <div class="run-panel-title">
              <sl-icon name="terminal"></sl-icon>
              <span>Live Run</span>
            </div>
            ${this.runPanelEpicId
              ? html`
                  <div class="run-panel-epic">
                    <span class="epic-id">${this.runPanelEpicId}</span>
                    <span>· ${epicTitle}</span>
                  </div>
                `
              : nothing}
          </div>
          <div class="run-panel-header-right">
            <sl-icon-button
              name="x-lg"
              label="Close run panel"
              @click=${this.closeRunPanel}
            ></sl-icon-button>
          </div>
        </div>

        <div class="run-panel-body">
          ${hasActiveRun
            ? this.renderActiveRun()
            : this.renderNoRunState()}
        </div>
      </div>
    `;
  }

  /**
   * Render the active run content.
   */
  private renderActiveRun() {
    const activeTask = this.runStatus?.activeTask;
    if (!activeTask) return nothing;

    return html`
      <!-- Task info bar -->
      <div class="run-info-bar">
        <div class="run-task-info">
          <span class="run-task-id">${activeTask.tickId}</span>
          <span class="run-task-title">${activeTask.title}</span>
        </div>
        ${this.runMetrics
          ? html`<run-metrics .metrics=${this.runMetrics} ?live=${true}></run-metrics>`
          : nothing}
      </div>

      <!-- Tool activity indicator -->
      ${this.activeToolInfo
        ? html`
            <tool-activity
              .tool=${this.activeToolInfo}
              ?expanded=${true}
            ></tool-activity>
          `
        : nothing}

      <!-- Output pane -->
      <div class="run-output-section">
        <run-output-pane
          epic-id=${this.runPanelEpicId || ''}
        ></run-output-pane>
      </div>
    `;
  }

  /**
   * Render the no run state.
   */
  private renderNoRunState() {
    return html`
      <div class="no-run-state">
        <sl-icon name="hourglass-split"></sl-icon>
        <p>No active run</p>
        <p class="hint">When a ticker run starts, output will appear here</p>
      </div>
    `;
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
        ?run-panel-open=${this.showRunPanel}
        ?run-active=${this.runStatus?.isRunning}
        ?readonly-mode=${this.isCloudMode && !this.localClientConnected}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @run-panel-toggle=${this.toggleRunPanel}
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

      <!-- Desktop/Tablet kanban board with optional run panel -->
      <div class="board-layout ${this.showRunPanel ? 'split' : ''}">
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

        <!-- Run monitoring panel -->
        ${this.showRunPanel ? this.renderRunPanel() : nothing}
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
