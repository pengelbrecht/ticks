import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Tool activity information for display.
 */
export interface ToolActivityInfo {
  /** Tool name (e.g., Read, Write, Edit, Bash, Glob, Grep) */
  name: string;
  /** Tool input (may be truncated) */
  input?: string;
  /** Tool output (may be truncated) */
  output?: string;
  /** When the tool started */
  startedAt?: Date | string;
  /** Duration in milliseconds (set when tool completes) */
  durationMs?: number;
  /** Whether the tool completed with an error */
  isError?: boolean;
  /** Whether the tool has completed */
  isComplete?: boolean;
}

// Tool name to icon mapping
const TOOL_ICONS: Record<string, string> = {
  Read: 'file-earmark-text',
  Write: 'file-earmark-plus',
  Edit: 'pencil-square',
  Bash: 'terminal',
  Glob: 'search',
  Grep: 'file-earmark-code',
  Task: 'list-task',
  WebFetch: 'globe',
  WebSearch: 'search',
  TodoWrite: 'check2-square',
  AskUserQuestion: 'chat-left-dots',
  NotebookEdit: 'journal-code',
  KillShell: 'x-circle',
  TaskOutput: 'box-arrow-right',
  Skill: 'lightning',
  EnterPlanMode: 'map',
  ExitPlanMode: 'check2-circle',
};

// Tool name to color mapping (Catppuccin Mocha)
const TOOL_COLORS: Record<string, string> = {
  Read: 'var(--blue, #89b4fa)',
  Write: 'var(--green, #a6e3a1)',
  Edit: 'var(--yellow, #f9e2af)',
  Bash: 'var(--peach, #fab387)',
  Glob: 'var(--teal, #94e2d5)',
  Grep: 'var(--sapphire, #74c7ec)',
  Task: 'var(--mauve, #cba6f7)',
  WebFetch: 'var(--sky, #89dceb)',
  WebSearch: 'var(--sky, #89dceb)',
  TodoWrite: 'var(--lavender, #b4befe)',
  AskUserQuestion: 'var(--pink, #f5c2e7)',
  NotebookEdit: 'var(--flamingo, #f2cdcd)',
  KillShell: 'var(--red, #f38ba8)',
  TaskOutput: 'var(--rosewater, #f5e0dc)',
  Skill: 'var(--maroon, #eba0ac)',
  EnterPlanMode: 'var(--lavender, #b4befe)',
  ExitPlanMode: 'var(--green, #a6e3a1)',
};

/**
 * Tool activity indicator component.
 *
 * @element tool-activity
 *
 * Shows current tool activity during agent runs with:
 * - Tool name and icon
 * - Input preview (truncated in compact mode)
 * - Duration timer (elapsed time while running)
 * - Spinner animation while running
 * - Success/error indicator when complete
 *
 * @prop {ToolActivityInfo | null} activity - The tool activity to display
 * @prop {boolean} expanded - Whether to show expanded view with full details
 */
@customElement('tool-activity')
export class ToolActivity extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* Compact inline view */
    .tool-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      max-width: 100%;
      overflow: hidden;
    }

    .tool-compact.running {
      border: 1px solid var(--surface1, #45475a);
    }

    .tool-compact.complete {
      background: rgba(166, 227, 161, 0.15);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .tool-compact.error {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .tool-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .tool-icon sl-icon {
      font-size: 0.875rem;
    }

    .tool-name {
      font-weight: 500;
      color: var(--tool-color, var(--mauve, #cba6f7));
      flex-shrink: 0;
    }

    .tool-input-preview {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--subtext0, #a6adc8);
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      flex-shrink: 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
    }

    .tool-spinner {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
    }

    .tool-spinner sl-spinner {
      font-size: 12px;
      --track-width: 2px;
      --indicator-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-status-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .tool-status-icon.success sl-icon {
      color: var(--green, #a6e3a1);
    }

    .tool-status-icon.error sl-icon {
      color: var(--red, #f38ba8);
    }

    /* Expanded view */
    .tool-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .tool-expanded.running {
      border-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-expanded.complete {
      border-color: var(--green, #a6e3a1);
    }

    .tool-expanded.error {
      border-color: var(--red, #f38ba8);
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .tool-header .tool-name {
      font-size: 0.875rem;
    }

    .tool-header .tool-duration {
      margin-left: auto;
      font-size: 0.75rem;
    }

    .tool-body {
      padding: 0.75rem;
    }

    .tool-section {
      margin-bottom: 0.75rem;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.375rem;
    }

    .tool-section-content {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text, #cdd6f4);
      background: var(--crust, #11111b);
      padding: 0.5rem;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }

    .tool-section-content::-webkit-scrollbar {
      width: 6px;
    }

    .tool-section-content::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .tool-section-content::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 3px;
    }

    .tool-section-content.error-content {
      color: var(--red, #f38ba8);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .empty-state sl-icon {
      font-size: 1rem;
      opacity: 0.5;
    }
  `;

  @property({ attribute: false })
  activity: ToolActivityInfo | null = null;

  @property({ type: Boolean })
  expanded = false;

  @state()
  private elapsedMs = 0;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTimer();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('activity')) {
      this.updateTimer();
    }
  }

  private startTimer() {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      if (this.activity && !this.activity.isComplete && this.activity.startedAt) {
        const startTime = this.activity.startedAt instanceof Date
          ? this.activity.startedAt.getTime()
          : new Date(this.activity.startedAt).getTime();
        this.elapsedMs = Date.now() - startTime;
      }
    }, 100);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimer() {
    if (this.activity?.isComplete) {
      this.stopTimer();
      // Use the final duration if available
      if (this.activity.durationMs !== undefined) {
        this.elapsedMs = this.activity.durationMs;
      }
    } else if (this.activity && !this.timerInterval) {
      this.startTimer();
    }
  }

  private getToolIcon(name: string): string {
    return TOOL_ICONS[name] ?? 'gear';
  }

  private getToolColor(name: string): string {
    return TOOL_COLORS[name] ?? 'var(--mauve, #cba6f7)';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;
    if (seconds < 60) {
      return `${seconds}.${Math.floor(remainingMs / 100)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private truncateInput(input: string, maxLength = 50): string {
    if (input.length <= maxLength) return input;
    return input.slice(0, maxLength) + '...';
  }

  private getStatusClass(): string {
    if (!this.activity) return '';
    if (this.activity.isError) return 'error';
    if (this.activity.isComplete) return 'complete';
    return 'running';
  }

  private renderCompact() {
    const { activity } = this;
    if (!activity) {
      return html`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;
    }

    const toolColor = this.getToolColor(activity.name);
    const statusClass = this.getStatusClass();
    const duration = activity.isComplete && activity.durationMs !== undefined
      ? activity.durationMs
      : this.elapsedMs;

    return html`
      <div class="tool-compact ${statusClass}" style="--tool-color: ${toolColor}">
        <span class="tool-icon">
          <sl-icon name="${this.getToolIcon(activity.name)}"></sl-icon>
        </span>
        <span class="tool-name">${activity.name}</span>
        ${activity.input
          ? html`<span class="tool-input-preview">${this.truncateInput(activity.input)}</span>`
          : nothing}
        ${duration > 0
          ? html`<span class="tool-duration">${this.formatDuration(duration)}</span>`
          : nothing}
        ${!activity.isComplete
          ? html`
              <span class="tool-spinner">
                <sl-spinner></sl-spinner>
              </span>
            `
          : html`
              <span class="tool-status-icon ${activity.isError ? 'error' : 'success'}">
                <sl-icon name="${activity.isError ? 'x-circle-fill' : 'check-circle-fill'}"></sl-icon>
              </span>
            `}
      </div>
    `;
  }

  private renderExpanded() {
    const { activity } = this;
    if (!activity) {
      return html`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;
    }

    const toolColor = this.getToolColor(activity.name);
    const statusClass = this.getStatusClass();
    const duration = activity.isComplete && activity.durationMs !== undefined
      ? activity.durationMs
      : this.elapsedMs;

    return html`
      <div class="tool-expanded ${statusClass}" style="--tool-color: ${toolColor}">
        <div class="tool-header">
          <span class="tool-icon">
            <sl-icon name="${this.getToolIcon(activity.name)}"></sl-icon>
          </span>
          <span class="tool-name">${activity.name}</span>
          ${!activity.isComplete
            ? html`
                <span class="tool-spinner">
                  <sl-spinner></sl-spinner>
                </span>
              `
            : html`
                <span class="tool-status-icon ${activity.isError ? 'error' : 'success'}">
                  <sl-icon name="${activity.isError ? 'x-circle-fill' : 'check-circle-fill'}"></sl-icon>
                </span>
              `}
          ${duration > 0
            ? html`<span class="tool-duration">${this.formatDuration(duration)}</span>`
            : nothing}
        </div>
        <div class="tool-body">
          ${activity.input
            ? html`
                <div class="tool-section">
                  <div class="tool-section-label">Input</div>
                  <div class="tool-section-content">${activity.input}</div>
                </div>
              `
            : nothing}
          ${activity.output
            ? html`
                <div class="tool-section">
                  <div class="tool-section-label">Output</div>
                  <div class="tool-section-content ${activity.isError ? 'error-content' : ''}">${activity.output}</div>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  render() {
    return this.expanded ? this.renderExpanded() : this.renderCompact();
  }
}

// Extend global interface for component registration
declare global {
  interface HTMLElementTagNameMap {
    'tool-activity': ToolActivity;
  }
}
