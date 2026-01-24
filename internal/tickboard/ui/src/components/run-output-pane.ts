import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { ShowToastOptions } from './tick-toast-stack.js';
import type { ContextPane } from './context-pane.js';
import {
  LocalOutputStreamAdapter,
  CloudOutputStreamAdapter,
  type OutputStreamAdapter,
  type RunEvent,
} from '../streams/output-stream.js';
import { $isCloudMode } from '../stores/connection.js';
import { registerRunEventAdapter } from '../stores/sync.js';

const TAB_STORAGE_KEY = 'run-output-pane-active-tab';

// ANSI escape code mappings to CSS classes
const ANSI_COLORS: Record<number, string> = {
  // Foreground colors
  30: 'ansi-black',
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-yellow',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  36: 'ansi-cyan',
  37: 'ansi-white',
  // Bright foreground colors
  90: 'ansi-bright-black',
  91: 'ansi-bright-red',
  92: 'ansi-bright-green',
  93: 'ansi-bright-yellow',
  94: 'ansi-bright-blue',
  95: 'ansi-bright-magenta',
  96: 'ansi-bright-cyan',
  97: 'ansi-bright-white',
  // Background colors
  40: 'ansi-bg-black',
  41: 'ansi-bg-red',
  42: 'ansi-bg-green',
  43: 'ansi-bg-yellow',
  44: 'ansi-bg-blue',
  45: 'ansi-bg-magenta',
  46: 'ansi-bg-cyan',
  47: 'ansi-bg-white',
};

const ANSI_STYLES: Record<number, string> = {
  1: 'ansi-bold',
  2: 'ansi-dim',
  3: 'ansi-italic',
  4: 'ansi-underline',
};

/**
 * Output line with timestamp and content.
 */
interface OutputLine {
  timestamp: Date;
  content: string;
  type: 'output' | 'status' | 'tool' | 'error';
}

/**
 * Streaming output pane component for displaying agent output.
 *
 * @element run-output-pane
 *
 * Features:
 * - Connects to /api/run-stream/:epicId SSE endpoint
 * - Auto-scrolling output display (can be paused)
 * - ANSI color support for terminal output
 * - Timestamp display per line
 * - Clear/copy buttons
 * - Expandable/collapsible view
 * - Connection status indicator
 *
 * @prop {string} epicId - The epic ID to stream output for
 * @prop {boolean} autoScroll - Whether to auto-scroll to bottom (default: true)
 */
@customElement('run-output-pane')
export class RunOutputPane extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .output-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--crust, #11111b);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header */
    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--overlay0, #6c7086);
    }

    .status-indicator.connected {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
    }

    .status-indicator.connecting {
      background: var(--yellow, #f9e2af);
      animation: pulse 1s ease-in-out infinite;
    }

    .status-indicator.disconnected {
      background: var(--red, #f38ba8);
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .header-actions sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
      font-size: 1rem;
    }

    .header-actions sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .auto-scroll-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .auto-scroll-toggle:hover {
      background: var(--surface0, #313244);
    }

    .auto-scroll-toggle.active {
      color: var(--blue, #89b4fa);
    }

    /* Output content */
    .output-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      padding: 0.5rem;
    }

    .output-container::-webkit-scrollbar {
      width: 8px;
    }

    .output-container::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .output-container::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 4px;
    }

    .output-container::-webkit-scrollbar-thumb:hover {
      background: var(--surface2, #585b70);
    }

    .output-line {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.125rem 0;
    }

    .line-timestamp {
      flex-shrink: 0;
      min-width: 5.5rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      font-variant-numeric: tabular-nums;
      user-select: none;
    }

    .line-content {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text, #cdd6f4);
      text-align: left;
      min-width: 0;
    }

    .line-content.status {
      color: var(--blue, #89b4fa);
      font-style: italic;
    }

    .line-content.tool {
      color: var(--mauve, #cba6f7);
    }

    .line-content.error {
      color: var(--red, #f38ba8);
    }

    /* ANSI color classes - Catppuccin Mocha palette */
    .ansi-black { color: var(--surface1, #45475a); }
    .ansi-red { color: var(--red, #f38ba8); }
    .ansi-green { color: var(--green, #a6e3a1); }
    .ansi-yellow { color: var(--yellow, #f9e2af); }
    .ansi-blue { color: var(--blue, #89b4fa); }
    .ansi-magenta { color: var(--pink, #f5c2e7); }
    .ansi-cyan { color: var(--teal, #94e2d5); }
    .ansi-white { color: var(--text, #cdd6f4); }

    .ansi-bright-black { color: var(--overlay0, #6c7086); }
    .ansi-bright-red { color: var(--maroon, #eba0ac); }
    .ansi-bright-green { color: var(--green, #a6e3a1); }
    .ansi-bright-yellow { color: var(--yellow, #f9e2af); }
    .ansi-bright-blue { color: var(--sapphire, #74c7ec); }
    .ansi-bright-magenta { color: var(--mauve, #cba6f7); }
    .ansi-bright-cyan { color: var(--sky, #89dceb); }
    .ansi-bright-white { color: var(--text, #cdd6f4); }

    .ansi-bg-black { background: var(--surface1, #45475a); }
    .ansi-bg-red { background: var(--red, #f38ba8); }
    .ansi-bg-green { background: var(--green, #a6e3a1); }
    .ansi-bg-yellow { background: var(--yellow, #f9e2af); }
    .ansi-bg-blue { background: var(--blue, #89b4fa); }
    .ansi-bg-magenta { background: var(--pink, #f5c2e7); }
    .ansi-bg-cyan { background: var(--teal, #94e2d5); }
    .ansi-bg-white { background: var(--text, #cdd6f4); }

    .ansi-bold { font-weight: 700; }
    .ansi-dim { opacity: 0.7; }
    .ansi-italic { font-style: italic; }
    .ansi-underline { text-decoration: underline; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      text-align: center;
    }

    .empty-state sl-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Collapsed view */
    :host([collapsed]) {
      flex: none;
    }

    :host([collapsed]) .output-pane {
      flex: none;
    }

    :host([collapsed]) .output-container {
      max-height: 120px;
    }

    /* Footer with active task info */
    .pane-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: var(--mantle, #181825);
      border-top: 1px solid var(--surface0, #313244);
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .active-task {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-task-label {
      color: var(--subtext1, #bac2de);
    }

    .active-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .active-tool {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem 0.375rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      color: var(--mauve, #cba6f7);
    }

    .line-count {
      font-variant-numeric: tabular-nums;
    }

    /* Tab container and styling */
    .tab-container {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    sl-tab-group {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.5rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    sl-tab::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    sl-tab[active]::part(base) {
      color: var(--blue, #89b4fa);
    }

    sl-tab-panel {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    sl-tab-panel::part(base) {
      height: 100%;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
  `;

  @property({ type: String, attribute: 'epic-id' })
  epicId = '';

  @property({ type: Boolean, attribute: 'auto-scroll' })
  autoScroll = true;

  @state() private lines: OutputLine[] = [];
  @state() private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  @state() private activeTaskId: string | null = null;
  @state() private activeTool: string | null = null;
  @state() private lastOutput = ''; // Track previous output to compute deltas
  @state() private activeTab: 'output' | 'context' = 'output';

  @query('.output-container')
  private outputContainer!: HTMLDivElement;

  @query('context-pane')
  private contextPane!: ContextPane;

  private adapter: OutputStreamAdapter | null = null;
  private unregisterAdapter: (() => void) | null = null;
  private userScrolled = false;

  connectedCallback() {
    super.connectedCallback();
    // Load saved tab preference
    const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
    if (savedTab === 'output' || savedTab === 'context') {
      this.activeTab = savedTab;
    }
    if (this.epicId) {
      this.connect();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('epicId')) {
      // Reconnect when epicId changes
      this.disconnect();
      if (this.epicId) {
        this.connect();
      }
    }
  }

  /**
   * Connect to the output stream using the appropriate adapter.
   */
  private connect() {
    this.disconnect();
    this.connectionStatus = 'connecting';

    const callbacks = {
      onEvent: (event: RunEvent) => this.handleRunEvent(event),
      onConnected: () => {
        this.connectionStatus = 'connected';
        this.addStatusLine(`Connected to run stream for epic ${this.epicId}`);
      },
      onDisconnected: () => {
        this.connectionStatus = 'disconnected';
      },
      onError: (error: string) => {
        console.error('[RunOutputPane] Stream error:', error);
      },
    };

    // Choose adapter based on mode
    if ($isCloudMode.get()) {
      const cloudAdapter = new CloudOutputStreamAdapter(callbacks);
      this.adapter = cloudAdapter;
      // Register with sync store to receive run events from DO
      this.unregisterAdapter = registerRunEventAdapter(cloudAdapter);
    } else {
      this.adapter = new LocalOutputStreamAdapter(callbacks);
    }

    this.adapter.connect(this.epicId);
  }

  /**
   * Handle a unified run event from the adapter.
   */
  private handleRunEvent(event: RunEvent) {
    switch (event.eventType) {
      case 'connected':
        // Already handled by onConnected callback
        break;

      case 'task-started':
        this.activeTaskId = event.taskId || null;
        this.lastOutput = '';
        this.addStatusLine(`Task ${event.taskId} started (iteration ${event.iteration ?? 1})`);
        break;

      case 'task-update':
        // Update active task if changed
        if (event.taskId && event.taskId !== this.activeTaskId) {
          this.activeTaskId = event.taskId;
        }
        // Update active tool
        this.activeTool = event.activeTool?.name || null;
        // Compute output delta and add new lines
        if (event.output && event.output !== this.lastOutput) {
          const newContent = event.output.slice(this.lastOutput.length);
          if (newContent) {
            this.addOutputLines(newContent);
          }
          this.lastOutput = event.output;
        }
        break;

      case 'tool-activity':
        if (event.activeTool) {
          this.activeTool = event.activeTool.name;
          this.addToolLine(`⚙ ${event.activeTool.name}`);
        }
        break;

      case 'task-completed':
        const status = event.success ? '✓ completed' : '✗ failed';
        this.addStatusLine(`Task ${event.taskId} ${status}`);
        // Clear active state
        if (this.activeTaskId === event.taskId) {
          this.activeTaskId = null;
          this.activeTool = null;
          this.lastOutput = '';
        }
        break;

      case 'epic-started':
        this.addStatusLine(`Epic ${event.epicId} started (${event.source})`);
        break;

      case 'epic-completed':
        this.addStatusLine(`Epic completed: ${event.success ? 'success' : 'failed'}`);
        this.activeTaskId = null;
        this.activeTool = null;
        break;

      case 'context-generating':
        this.addStatusLine(`📚 Generating epic context...`);
        break;

      case 'context-generated':
        this.addStatusLine(`✓ Context generated`);
        break;

      case 'context-loaded':
        this.addStatusLine(`📖 Using existing context`);
        break;

      case 'context-failed':
        this.addStatusLine(`⚠ Context generation failed: ${event.message ?? 'unknown error'}`);
        break;

      case 'context-skipped':
        this.addStatusLine(`⏭ Context skipped: ${event.message ?? 'single-task epic'}`);
        break;
    }
  }

  /**
   * Disconnect from the output stream and clean up.
   */
  private disconnect() {
    if (this.unregisterAdapter) {
      this.unregisterAdapter();
      this.unregisterAdapter = null;
    }
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }
    this.connectionStatus = 'disconnected';
  }

  /**
   * Add a status line to the output.
   */
  private addStatusLine(content: string) {
    this.lines = [...this.lines, {
      timestamp: new Date(),
      content,
      type: 'status',
    }];
    this.scrollToBottom();
  }

  /**
   * Add a tool activity line.
   */
  private addToolLine(content: string) {
    this.lines = [...this.lines, {
      timestamp: new Date(),
      content,
      type: 'tool',
    }];
    this.scrollToBottom();
  }

  /**
   * Add output lines from content (splits on newlines).
   */
  private addOutputLines(content: string) {
    const timestamp = new Date();
    const newLines = content.split('\n')
      .filter(line => line.length > 0)
      .map(line => ({
        timestamp,
        content: line,
        type: 'output' as const,
      }));

    if (newLines.length > 0) {
      this.lines = [...this.lines, ...newLines];
      this.scrollToBottom();
    }
  }

  /**
   * Scroll to bottom if auto-scroll is enabled and user hasn't scrolled.
   */
  private scrollToBottom() {
    if (!this.autoScroll || this.userScrolled) return;

    requestAnimationFrame(() => {
      if (this.outputContainer) {
        this.outputContainer.scrollTop = this.outputContainer.scrollHeight;
      }
    });
  }

  /**
   * Handle user scroll to detect manual scrolling.
   */
  private handleScroll() {
    if (!this.outputContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = this.outputContainer;
    // User is at bottom (within 20px threshold)
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;

    this.userScrolled = !atBottom;
  }

  /**
   * Toggle auto-scroll behavior.
   */
  private toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    if (this.autoScroll) {
      this.userScrolled = false;
      this.scrollToBottom();
    }
  }

  /**
   * Handle tab change and persist selection.
   */
  private handleTabShow(event: CustomEvent) {
    const tabName = event.detail.name as 'output' | 'context';
    this.activeTab = tabName;
    localStorage.setItem(TAB_STORAGE_KEY, tabName);
  }

  /**
   * Clear all output lines.
   */
  private clearOutput() {
    this.lines = [];
    this.lastOutput = '';
    this.userScrolled = false;
  }

  /**
   * Copy all output to clipboard.
   */
  private async copyOutput() {
    const text = this.lines.map(line => {
      const time = this.formatTimestamp(line.timestamp);
      return `[${time}] ${line.content}`;
    }).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      // Show toast if available
      if (window.showToast) {
        window.showToast({ message: 'Output copied to clipboard', variant: 'success' });
      }
    } catch (err) {
      console.error('Failed to copy output:', err);
    }
  }

  /**
   * Format timestamp for display.
   */
  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  /**
   * Convert ANSI escape codes to HTML with CSS classes.
   */
  private ansiToHtml(text: string): string {
    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Track current styles
    const activeClasses: string[] = [];

    // ANSI escape sequence regex: \x1b[...m
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1b\[([0-9;]*)m/g;

    html = html.replace(ansiRegex, (_, codes: string) => {
      // Close any previous span
      let result = activeClasses.length > 0 ? '</span>' : '';
      activeClasses.length = 0;

      // Parse codes
      const codeList = codes ? codes.split(';').map(Number) : [0];

      for (const code of codeList) {
        if (code === 0) {
          // Reset
          activeClasses.length = 0;
        } else if (ANSI_COLORS[code]) {
          activeClasses.push(ANSI_COLORS[code]);
        } else if (ANSI_STYLES[code]) {
          activeClasses.push(ANSI_STYLES[code]);
        }
      }

      // Open new span if there are active classes
      if (activeClasses.length > 0) {
        result += `<span class="${activeClasses.join(' ')}">`;
      }

      return result;
    });

    // Close any remaining open span
    if (activeClasses.length > 0) {
      html += '</span>';
    }

    return html;
  }

  /**
   * Get connection status text.
   */
  private getStatusText(): string {
    switch (this.connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
    }
  }

  /**
   * Render the output content (used in Output tab).
   */
  private renderOutputContent() {
    return html`
      <div
        class="output-container"
        @scroll=${this.handleScroll}
      >
        ${this.lines.length === 0
          ? html`
              <div class="empty-state">
                <sl-icon name="terminal"></sl-icon>
                <p>No output yet. Connect to an epic to see agent output.</p>
              </div>
            `
          : this.lines.map(line => html`
              <div class="output-line">
                <span class="line-timestamp">${this.formatTimestamp(line.timestamp)}</span>
                <span class="line-content ${line.type}">
                  ${line.type === 'output'
                    ? unsafeHTML(this.ansiToHtml(line.content))
                    : line.content}
                </span>
              </div>
            `)}
      </div>
    `;
  }

  render() {
    return html`
      <div class="output-pane">
        <div class="pane-header">
          <div class="header-left">
            <div class="connection-status">
              <span class="status-indicator ${this.connectionStatus}"></span>
              <span>${this.getStatusText()}</span>
            </div>
          </div>
          <div class="header-actions">
            ${this.activeTab === 'output' ? html`
              <div
                class="auto-scroll-toggle ${this.autoScroll ? 'active' : ''}"
                @click=${this.toggleAutoScroll}
                title="Auto-scroll to bottom"
              >
                <sl-icon name="arrow-down-circle${this.autoScroll ? '-fill' : ''}"></sl-icon>
                Auto
              </div>
              <sl-icon-button
                name="clipboard"
                label="Copy output"
                @click=${this.copyOutput}
              ></sl-icon-button>
              <sl-icon-button
                name="trash"
                label="Clear output"
                @click=${this.clearOutput}
              ></sl-icon-button>
            ` : nothing}
          </div>
        </div>

        <div class="tab-container">
          <sl-tab-group @sl-tab-show=${this.handleTabShow}>
            <sl-tab slot="nav" panel="output" ?active=${this.activeTab === 'output'}>Output</sl-tab>
            <sl-tab slot="nav" panel="context" ?active=${this.activeTab === 'context'}>Context</sl-tab>

            <sl-tab-panel name="output">
              ${this.renderOutputContent()}
            </sl-tab-panel>

            <sl-tab-panel name="context">
              <context-pane .epicId=${this.epicId}></context-pane>
            </sl-tab-panel>
          </sl-tab-group>
        </div>

        ${this.activeTab === 'output' && (this.activeTaskId || this.activeTool)
          ? html`
              <div class="pane-footer">
                <div class="active-task">
                  ${this.activeTaskId
                    ? html`
                        <span class="active-task-label">Task:</span>
                        <span class="active-task-id">${this.activeTaskId}</span>
                      `
                    : nothing}
                  ${this.activeTool
                    ? html`
                        <span class="active-tool">
                          <sl-icon name="gear"></sl-icon>
                          ${this.activeTool}
                        </span>
                      `
                    : nothing}
                </div>
                <span class="line-count">${this.lines.length} lines</span>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

// Extend global interface for component registration
declare global {
  interface HTMLElementTagNameMap {
    'run-output-pane': RunOutputPane;
  }
}
