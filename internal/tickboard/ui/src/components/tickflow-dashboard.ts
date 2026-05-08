import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { BoardTick, TickColumn } from '../types/tick.js';
import type { EpicInfo, RunStatusResponse, Activity } from '../api/ticks.js';

/**
 * Column metadata for display.
 */
interface ColumnInfo {
  id: TickColumn;
  name: string;
  color: string;
  icon: string;
}

const COLUMNS: ColumnInfo[] = [
  { id: 'blocked', name: 'Blocked', color: 'var(--red)', icon: '⊘' },
  { id: 'ready', name: 'Agent Queue', color: 'var(--blue)', icon: '▶' },
  { id: 'agent', name: 'In Progress', color: 'var(--peach)', icon: '●' },
  { id: 'human', name: 'Needs Human', color: 'var(--yellow)', icon: '👤' },
  { id: 'done', name: 'Done', color: 'var(--green)', icon: '✓' },
];

/**
 * Interactive Tickflow Dashboard Overlay.
 *
 * Provides a birds-eye view of the entire tickflow run:
 * - Epic progress bars
 * - Task distribution across columns
 * - Aggregate token/cost metrics
 * - Active run status indicator
 * - Recent activity feed
 *
 * @element tickflow-dashboard
 *
 * @prop {BoardTick[]} ticks - All ticks to summarize
 * @prop {EpicInfo[]} epics - Epic list for progress breakdown
 * @prop {boolean} open - Whether the overlay is visible
 * @prop {RunStatusResponse|null} runStatus - Current run status
 * @prop {Activity[]} activities - Recent activity entries
 * @prop {string} repoName - Repository name
 *
 * @fires close - When the overlay should be dismissed
 */
@customElement('tickflow-dashboard')
export class TickflowDashboard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* Overlay backdrop */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(17, 17, 27, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Dashboard container */
    .dashboard {
      width: 100%;
      max-width: 1100px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .header-subtitle {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    .kbd-hint {
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .kbd-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    /* Body */
    .dashboard-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Section */
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--subtext0, #a6adc8);
    }

    /* Summary cards row */
    .summary-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .summary-card {
      background: var(--surface0, #313244);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-card-label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--subtext0, #a6adc8);
    }

    .summary-card-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
      line-height: 1.2;
    }

    .summary-card-detail {
      font-size: 0.6875rem;
      color: var(--overlay1, #7f849c);
    }

    .value-green { color: var(--green, #a6e3a1); }
    .value-blue { color: var(--blue, #89b4fa); }
    .value-peach { color: var(--peach, #fab387); }
    .value-yellow { color: var(--yellow, #f9e2af); }
    .value-red { color: var(--red, #f38ba8); }
    .value-mauve { color: var(--mauve, #cba6f7); }

    /* Column distribution */
    .distribution-bar-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .distribution-bar {
      height: 28px;
      background: var(--crust, #11111b);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }

    .distribution-segment {
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--crust, #11111b);
      min-width: 0;
      overflow: hidden;
    }

    .distribution-segment span {
      padding: 0 0.375rem;
      white-space: nowrap;
    }

    .segment-blocked { background: var(--red, #f38ba8); }
    .segment-ready { background: var(--blue, #89b4fa); }
    .segment-agent { background: var(--peach, #fab387); }
    .segment-human { background: var(--yellow, #f9e2af); }
    .segment-done { background: var(--green, #a6e3a1); }

    .distribution-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .legend-count {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    /* Epic progress */
    .epic-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .epic-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .epic-row:hover {
      background: var(--surface1, #45475a);
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
      min-width: 3rem;
    }

    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .epic-progress-bar {
      margin-top: 0.375rem;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .epic-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
      background: var(--green, #a6e3a1);
    }

    .epic-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .epic-stat {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-variant-numeric: tabular-nums;
    }

    .epic-percentage {
      font-weight: 600;
      min-width: 2.5rem;
      text-align: right;
    }

    /* Run status indicator */
    .run-status {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border-radius: 8px;
    }

    .run-status.active {
      border: 1px solid var(--green, #a6e3a1);
      background: rgba(166, 227, 161, 0.05);
    }

    .run-status.inactive {
      border: 1px solid var(--surface1, #45475a);
    }

    .run-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .run-indicator.active {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 8px var(--green, #a6e3a1);
      animation: runPulse 1.5s ease-in-out infinite;
    }

    .run-indicator.inactive {
      background: var(--overlay0, #6c7086);
    }

    @keyframes runPulse {
      0%, 100% { opacity: 0.7; box-shadow: 0 0 4px var(--green); }
      50% { opacity: 1; box-shadow: 0 0 12px var(--green); }
    }

    .run-info {
      flex: 1;
    }

    .run-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .run-detail {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .run-detail .task-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--blue, #89b4fa);
    }

    /* Activity mini-feed */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      border-radius: 4px;
    }

    .activity-item:hover {
      background: var(--surface0, #313244);
    }

    .activity-icon {
      font-size: 0.875rem;
      width: 1.25rem;
      text-align: center;
      flex-shrink: 0;
    }

    .activity-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-text .tick-ref {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay0, #6c7086);
      white-space: nowrap;
    }

    /* Needs attention section */
    .attention-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .attention-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      border-left: 3px solid var(--yellow, #f9e2af);
      cursor: pointer;
      transition: background 0.15s;
    }

    .attention-item:hover {
      background: var(--surface1, #45475a);
    }

    .attention-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .attention-info {
      flex: 1;
      min-width: 0;
    }

    .attention-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attention-detail {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .attention-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
    }

    /* Two-column layout for lower sections */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .dashboard-body {
        padding: 1rem;
      }

      .summary-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .two-col {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .dashboard {
        border-radius: 0;
        min-height: 100vh;
      }

      .summary-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    /* Empty state */
    .empty-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: var(--overlay0, #6c7086);
      font-size: 0.8125rem;
    }
  `;

  @property({ type: Array })
  ticks: BoardTick[] = [];

  @property({ type: Array })
  epics: EpicInfo[] = [];

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ attribute: false })
  runStatus: RunStatusResponse | null = null;

  @property({ type: Array })
  activities: Activity[] = [];

  @property({ type: String, attribute: 'repo-name' })
  repoName = '';

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this._close();
    }
  };

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _handleBackdropClick(e: MouseEvent) {
    // Close only when clicking the backdrop, not the dashboard itself
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      this._close();
    }
  }

  private _handleEpicClick(epicId: string) {
    this.dispatchEvent(new CustomEvent('epic-select', { detail: { epicId } }));
    this._close();
  }

  private _handleTickClick(tickId: string) {
    this.dispatchEvent(new CustomEvent('tick-select', { detail: { tickId } }));
    this._close();
  }

  // ============================================================================
  // Data computation
  // ============================================================================

  private _getColumnCounts(): Record<TickColumn, number> {
    const counts: Record<TickColumn, number> = {
      blocked: 0,
      ready: 0,
      agent: 0,
      human: 0,
      done: 0,
    };
    // Only count non-epic ticks (tasks, bugs, features, chores)
    for (const t of this.ticks) {
      if (t.type !== 'epic' && counts[t.column] !== undefined) {
        counts[t.column]++;
      }
    }
    return counts;
  }

  private _getTotalNonEpicTicks(): number {
    return this.ticks.filter(t => t.type !== 'epic').length;
  }

  private _getEpicProgress(epicId: string) {
    const children = this.ticks.filter(t => t.parent === epicId && t.type !== 'epic');
    const total = children.length;
    const done = children.filter(t => t.column === 'done').length;
    const inProgress = children.filter(t => t.column === 'agent').length;
    const needsHuman = children.filter(t => t.column === 'human').length;
    const blocked = children.filter(t => t.column === 'blocked').length;
    const ready = children.filter(t => t.column === 'ready').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, needsHuman, blocked, ready, pct };
  }

  private _getHumanTicks(): BoardTick[] {
    return this.ticks.filter(t => t.column === 'human' && t.type !== 'epic');
  }

  private _getActivityIcon(action: string): string {
    switch (action) {
      case 'create': return '➕';
      case 'close': return '✅';
      case 'update': return '✏️';
      case 'approve': return '👍';
      case 'reject': return '👎';
      case 'note': return '💬';
      case 'reopen': return '🔄';
      default: return '•';
    }
  }

  private _formatRelativeTime(ts: string): string {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  private _getAwaitingLabel(tick: BoardTick): string {
    if (tick.awaiting) {
      switch (tick.awaiting) {
        case 'approval': return 'Awaiting approval';
        case 'review': return 'Awaiting review';
        case 'input': return 'Awaiting input';
        case 'content': return 'Awaiting content';
        case 'escalation': return 'Escalated';
        case 'checkpoint': return 'Checkpoint';
        case 'work': return 'Manual work needed';
        default: return 'Needs attention';
      }
    }
    return 'Needs attention';
  }

  // ============================================================================
  // Render
  // ============================================================================

  render() {
    if (!this.open) return nothing;

    const counts = this._getColumnCounts();
    const totalTasks = this._getTotalNonEpicTicks();
    const humanTicks = this._getHumanTicks();
    const isRunning = this.runStatus?.isRunning ?? false;

    return html`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._renderSummaryCards(counts, totalTasks, isRunning)}
            ${this._renderDistribution(counts, totalTasks)}
            ${this._renderEpicProgress()}
            <div class="two-col">
              ${this._renderNeedsAttention(humanTicks)}
              ${this._renderRecentActivity()}
            </div>
            ${this._renderRunStatus(isRunning)}
          </div>
        </div>
      </div>
    `;
  }

  private _renderHeader() {
    return html`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName
              ? html`<div class="header-subtitle">${this.repoName}</div>`
              : nothing}
          </div>
        </div>
        <div class="header-right">
          <span class="kbd-hint">
            Press <kbd>d</kbd> or <kbd>Esc</kbd> to close
          </span>
          <button class="close-btn" @click=${this._close} aria-label="Close dashboard">✕</button>
        </div>
      </div>
    `;
  }

  private _renderSummaryCards(
    counts: Record<TickColumn, number>,
    totalTasks: number,
    isRunning: boolean,
  ) {
    const completionPct = totalTasks > 0 ? Math.round((counts.done / totalTasks) * 100) : 0;

    return html`
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-card-label">Total Tasks</div>
          <div class="summary-card-value">${totalTasks}</div>
          <div class="summary-card-detail">${this.epics.length} epic${this.epics.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Completion</div>
          <div class="summary-card-value value-green">${completionPct}%</div>
          <div class="summary-card-detail">${counts.done} / ${totalTasks} done</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Needs Human</div>
          <div class="summary-card-value ${counts.human > 0 ? 'value-yellow' : ''}">${counts.human}</div>
          <div class="summary-card-detail">awaiting action</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">In Progress</div>
          <div class="summary-card-value ${counts.agent > 0 ? 'value-peach' : ''}">${counts.agent}</div>
          <div class="summary-card-detail">${isRunning ? 'agent active' : 'agent idle'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Blocked</div>
          <div class="summary-card-value ${counts.blocked > 0 ? 'value-red' : ''}">${counts.blocked}</div>
          <div class="summary-card-detail">dependencies unmet</div>
        </div>
      </div>
    `;
  }

  private _renderDistribution(counts: Record<TickColumn, number>, total: number) {
    if (total === 0) return nothing;

    return html`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${COLUMNS.map(col => {
              const pct = (counts[col.id] / total) * 100;
              if (pct === 0) return nothing;
              return html`
                <div
                  class="distribution-segment segment-${col.id}"
                  style="width: ${pct}%"
                  title="${col.name}: ${counts[col.id]}"
                >
                  ${pct >= 8 ? html`<span>${counts[col.id]}</span>` : nothing}
                </div>
              `;
            })}
          </div>
          <div class="distribution-legend">
            ${COLUMNS.map(col => html`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${col.color}"></div>
                <span>${col.icon} ${col.name}</span>
                <span class="legend-count">${counts[col.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  private _renderEpicProgress() {
    if (this.epics.length === 0) return nothing;

    return html`
      <div class="section">
        <div class="section-title">Epic Progress</div>
        <div class="epic-list">
          ${this.epics.map(epic => {
            const prog = this._getEpicProgress(epic.id);
            return html`
              <div class="epic-row" @click=${() => this._handleEpicClick(epic.id)}>
                <span class="epic-id">${epic.id}</span>
                <div class="epic-info">
                  <div class="epic-title">${epic.title}</div>
                  <div class="epic-progress-bar">
                    <div class="epic-progress-fill" style="width: ${prog.pct}%"></div>
                  </div>
                </div>
                <div class="epic-stats">
                  <span class="epic-stat">${prog.done}/${prog.total}</span>
                  <span class="epic-percentage value-green">${prog.pct}%</span>
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _renderNeedsAttention(humanTicks: BoardTick[]) {
    return html`
      <div class="section">
        <div class="section-title">Needs Attention (${humanTicks.length})</div>
        ${humanTicks.length === 0
          ? html`<div class="empty-section">No ticks need human attention</div>`
          : html`
              <div class="attention-list">
                ${humanTicks.slice(0, 6).map(t => html`
                  <div class="attention-item" @click=${() => this._handleTickClick(t.id)}>
                    <span class="attention-icon">👤</span>
                    <div class="attention-info">
                      <div class="attention-title">${t.title}</div>
                      <div class="attention-detail">${this._getAwaitingLabel(t)}</div>
                    </div>
                    <span class="attention-id">${t.id}</span>
                  </div>
                `)}
                ${humanTicks.length > 6
                  ? html`<div class="empty-section">+${humanTicks.length - 6} more</div>`
                  : nothing}
              </div>
            `}
      </div>
    `;
  }

  private _renderRecentActivity() {
    return html`
      <div class="section">
        <div class="section-title">Recent Activity</div>
        ${this.activities.length === 0
          ? html`<div class="empty-section">No recent activity</div>`
          : html`
              <div class="activity-list">
                ${this.activities.slice(0, 8).map(a => html`
                  <div class="activity-item" @click=${() => this._handleTickClick(a.tick)}>
                    <span class="activity-icon">${this._getActivityIcon(a.action)}</span>
                    <span class="activity-text">
                      <span class="tick-ref">${a.tick}</span>
                      ${a.action}${a.actor ? ` by ${a.actor}` : ''}
                    </span>
                    <span class="activity-time">${this._formatRelativeTime(a.ts)}</span>
                  </div>
                `)}
              </div>
            `}
      </div>
    `;
  }

  private _renderRunStatus(isRunning: boolean) {
    return html`
      <div class="section">
        <div class="section-title">Run Status</div>
        <div class="run-status ${isRunning ? 'active' : 'inactive'}">
          <div class="run-indicator ${isRunning ? 'active' : 'inactive'}"></div>
          <div class="run-info">
            <div class="run-label">${isRunning ? 'Agent Running' : 'Agent Idle'}</div>
            ${isRunning && this.runStatus?.activeTask
              ? html`
                  <div class="run-detail">
                    Task <span class="task-id">${this.runStatus.activeTask.tickId}</span>
                    · ${this.runStatus.activeTask.numTurns} turns
                  </div>
                `
              : html`
                  <div class="run-detail">
                    No active run. Start with <code>tk run</code>
                  </div>
                `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tickflow-dashboard': TickflowDashboard;
  }
}
