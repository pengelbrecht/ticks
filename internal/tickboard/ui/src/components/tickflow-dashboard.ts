import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import type { BoardTick, TickColumn } from '../types/tick.js';
import type { EpicInfo, Activity, Note } from '../api/ticks.js';
import { parseNotes } from '../api/ticks.js';
import { fetchTickDetails } from '../stores/comms.js';

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
 * Provides a birds-eye view of the entire tickflow board:
 * - Epic progress bars
 * - Task distribution across columns
 * - Recent activity feed
 *
 * @element tickflow-dashboard
 *
 * @prop {BoardTick[]} ticks - All ticks to summarize
 * @prop {EpicInfo[]} epics - Epic list for progress breakdown
 * @prop {boolean} open - Whether the overlay is visible
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

    .attention-item:hover,
    .attention-item.focused {
      background: var(--surface1, #45475a);
    }

    .attention-item.focused {
      outline: 2px solid var(--blue, #89b4fa);
      outline-offset: -2px;
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

    .attention-actions-hint {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .action-hint {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
    }

    .action-hint kbd {
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

    /* Two-column layout for lower sections */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    /* ================================================================
     * Detail Pane (inline tick detail)
     * ================================================================ */
    .detail-pane {
      background: var(--mantle, #181825);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
    }

    .detail-pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .detail-pane-header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
    }

    .detail-pane-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      flex-shrink: 0;
    }

    .detail-pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .detail-pane-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    .detail-pane-btn {
      background: none;
      border: 1px solid var(--surface1, #45475a);
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      font-size: 0.6875rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.15s;
      font-family: inherit;
    }

    .detail-pane-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
      border-color: var(--overlay0, #6c7086);
    }

    .detail-pane-btn.primary {
      background: var(--blue, #89b4fa);
      color: var(--crust, #11111b);
      border-color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .detail-pane-btn.primary:hover {
      opacity: 0.9;
    }

    .detail-pane-close {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1rem;
      line-height: 1;
    }

    .detail-pane-close:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    /* Detail pane body */
    .detail-tab-body {
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    /* Detail pane - Overview tab */
    .detail-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }

    .detail-meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1, #45475a);
      color: var(--subtext1, #bac2de);
    }

    .detail-meta-badge.type-bug { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.type-feature { background: rgba(137, 180, 250, 0.2); color: var(--blue); }
    .detail-meta-badge.type-epic { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.status-open { background: rgba(166, 227, 161, 0.2); color: var(--green); }
    .detail-meta-badge.status-in_progress { background: rgba(250, 179, 135, 0.2); color: var(--peach); }
    .detail-meta-badge.status-closed { background: var(--surface1); color: var(--subtext0); }
    .detail-meta-badge.awaiting { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.blocked { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.priority {
      border-left: 3px solid var(--priority-color, var(--subtext0));
    }

    .detail-description {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--crust, #11111b);
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface0, #313244);
      margin-bottom: 0.75rem;
    }

    .detail-field {
      margin-bottom: 0.75rem;
    }

    .detail-field-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .detail-field-value {
      font-size: 0.8125rem;
      color: var(--subtext1, #bac2de);
    }

    .detail-field-empty {
      font-size: 0.8125rem;
      color: var(--overlay0, #6c7086);
      font-style: italic;
    }

    .detail-link {
      color: var(--blue, #89b4fa);
      text-decoration: none;
      cursor: pointer;
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
    }

    .detail-link:hover {
      text-decoration: underline;
    }

    .detail-notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .detail-note {
      background: var(--crust, #11111b);
      border: 1px solid var(--surface0, #313244);
      border-radius: 6px;
      padding: 0.5rem 0.625rem;
      margin-bottom: 0.375rem;
    }

    .detail-note:last-child {
      margin-bottom: 0;
    }

    .detail-note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.6875rem;
    }

    .detail-note-author {
      font-weight: 500;
      color: var(--blue, #89b4fa);
    }

    .detail-note-time {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--overlay0, #6c7086);
    }

    .detail-note-text {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .detail-timestamps {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-ts-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
    }

    .detail-ts-label {
      color: var(--subtext0, #a6adc8);
    }

    .detail-ts-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--subtext1, #bac2de);
    }


    .detail-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.8125rem;
      gap: 0.5rem;
    }

    .detail-loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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

  @property({ type: Array })
  activities: Activity[] = [];

  @property({ type: String, attribute: 'repo-name' })
  repoName = '';

  /** Index of the focused item in the Needs Attention list (-1 = none). */
  @state()
  private _focusedAttentionIndex = -1;

  /** Currently selected tick for the detail pane (null = no detail shown). */
  @state()
  private _detailTick: BoardTick | null = null;

  /** Notes parsed from the selected tick. */
  @state()
  private _detailNotes: Note[] = [];

  /** Whether the detail pane is loading data. */
  @state()
  private _detailLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this._handleKeyDown);
  }

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    // Reset focused attention index and detail pane when dashboard opens
    if (changed.has('open') && this.open) {
      this._focusedAttentionIndex = -1;
      this._closeDetailPane();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      // Close detail pane first, then the dashboard
      if (this._detailTick) {
        this._closeDetailPane();
        return;
      }
      this._close();
      return;
    }

    const humanTicks = this._getHumanTicks();
    const maxIndex = Math.min(humanTicks.length, 6) - 1; // matches slice(0,6) in render

    switch (e.key) {
      // Navigate down in attention list
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        if (maxIndex >= 0) {
          this._focusedAttentionIndex = Math.min(this._focusedAttentionIndex + 1, maxIndex);
        }
        break;

      // Navigate up in attention list
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        if (maxIndex >= 0) {
          this._focusedAttentionIndex = Math.max(this._focusedAttentionIndex - 1, 0);
        }
        break;

      // Inspect: open detail drawer for focused tick
      case 'Enter':
      case 'i':
        if (this._focusedAttentionIndex >= 0 && this._focusedAttentionIndex <= maxIndex) {
          e.preventDefault();
          e.stopPropagation();
          this._handleTickClick(humanTicks[this._focusedAttentionIndex].id);
        }
        break;

      // Resume: approve the focused awaiting tick
      case 'a':
        if (this._focusedAttentionIndex >= 0 && this._focusedAttentionIndex <= maxIndex) {
          e.preventDefault();
          e.stopPropagation();
          const tick = humanTicks[this._focusedAttentionIndex];
          this.dispatchEvent(new CustomEvent('tick-resume', { detail: { tickId: tick.id } }));
        }
        break;

      // Retry: reopen the focused tick so the agent retries
      case 't':
        if (this._focusedAttentionIndex >= 0 && this._focusedAttentionIndex <= maxIndex) {
          e.preventDefault();
          e.stopPropagation();
          const tick = humanTicks[this._focusedAttentionIndex];
          this.dispatchEvent(new CustomEvent('tick-retry', { detail: { tickId: tick.id } }));
        }
        break;
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
    // Show inline detail pane instead of closing the dashboard
    this._openDetailPane(tickId);
  }

  /** Open the detail drawer on the board (close dashboard and emit tick-select). */
  private _handleOpenOnBoard(tickId: string) {
    this.dispatchEvent(new CustomEvent('tick-select', { detail: { tickId } }));
    this._close();
  }

  /** Open the inline detail pane for a tick. */
  private async _openDetailPane(tickId: string) {
    const tick = this.ticks.find(t => t.id === tickId);
    if (!tick) return;

    this._detailTick = tick;
    this._detailNotes = parseNotes(tick.notes);
    this._detailLoading = true;

    try {
      // Fetch detailed tick info
      const details = await fetchTickDetails(tickId).catch(() => null);

      // If the detail pane was closed or switched while loading, bail out
      if (this._detailTick?.id !== tickId) return;

      if (details) {
        // Update tick data and notes from detailed fetch
        this._detailTick = { ...tick, ...details, is_blocked: tick.is_blocked, column: tick.column };
        this._detailNotes = parseNotes(details.notes);
      }
    } catch {
      // Ignore fetch errors - we show what we have
    } finally {
      if (this._detailTick?.id === tickId) {
        this._detailLoading = false;
      }
    }
  }

  /** Close the inline detail pane. */
  private _closeDetailPane() {
    this._detailTick = null;
    this._detailNotes = [];
    this._detailLoading = false;
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
  // Detail Pane Helpers
  // ============================================================================

  private static readonly PRIORITY_LABELS: Record<number, string> = {
    0: 'Critical', 1: 'High', 2: 'Medium', 3: 'Low', 4: 'Backlog',
  };

  private static readonly PRIORITY_COLORS: Record<number, string> = {
    0: 'var(--red)', 1: 'var(--peach)', 2: 'var(--yellow)', 3: 'var(--green)', 4: 'var(--subtext0)',
  };

  private _getPriorityLabel(p: number): string {
    return TickflowDashboard.PRIORITY_LABELS[p] ?? 'Unknown';
  }

  private _getPriorityColor(p: number): string {
    return TickflowDashboard.PRIORITY_COLORS[p] ?? 'var(--subtext0)';
  }

  private _formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  private _formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  private _formatTokenCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  private _formatCost(c: number): string {
    if (c === 0) return '$0.00';
    if (c < 0.01) return `$${c.toFixed(4)}`;
    if (c < 1) return `$${c.toFixed(3)}`;
    return `$${c.toFixed(2)}`;
  }

  private _truncate(text: string, max = 60): string {
    return text.length <= max ? text : text.slice(0, max) + '...';
  }

  // ============================================================================
  // Render
  // ============================================================================

  render() {
    if (!this.open) return nothing;

    const counts = this._getColumnCounts();
    const totalTasks = this._getTotalNonEpicTicks();
    const humanTicks = this._getHumanTicks();

    return html`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._detailTick ? this._renderDetailPane() : nothing}
            ${this._renderSummaryCards(counts, totalTasks)}
            ${this._renderDistribution(counts, totalTasks)}
            ${this._renderEpicProgress()}
            <div class="two-col">
              ${this._renderNeedsAttention(humanTicks)}
              ${this._renderRecentActivity()}
            </div>
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
          <div class="summary-card-detail">with agent</div>
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
                ${humanTicks.slice(0, 6).map((t, idx) => html`
                  <div
                    class="attention-item ${classMap({ focused: this._focusedAttentionIndex === idx })}"
                    @click=${() => this._handleTickClick(t.id)}
                  >
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
              ${humanTicks.length > 0 ? html`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              ` : nothing}
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

  // ============================================================================
  // Detail Pane Rendering
  // ============================================================================

  private _renderDetailPane() {
    const tick = this._detailTick;
    if (!tick) return nothing;

    return html`
      <div class="detail-pane">
        <div class="detail-pane-header">
          <div class="detail-pane-header-left">
            <span class="detail-pane-id">${tick.id}</span>
            <span class="detail-pane-title">${tick.title}</span>
          </div>
          <div class="detail-pane-actions">
            <button
              class="detail-pane-btn primary"
              @click=${() => this._handleOpenOnBoard(tick.id)}
              title="Open in board detail drawer"
            >
              ↗ Open on Board
            </button>
            <button
              class="detail-pane-close"
              @click=${() => this._closeDetailPane()}
              aria-label="Close detail pane"
            >✕</button>
          </div>
        </div>

        <div class="detail-tab-body">
          ${this._detailLoading
            ? html`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`
            : this._renderDetailOverview(tick)}
        </div>
      </div>
    `;
  }

  private _renderDetailOverview(tick: BoardTick) {
    return html`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${tick.type}">${tick.type}</span>
        <span class="detail-meta-badge status-${tick.status}">${tick.status.replace('_', ' ')}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(tick.priority)}"
        >${this._getPriorityLabel(tick.priority)}</span>
        ${tick.awaiting
          ? html`<span class="detail-meta-badge awaiting">⏳ ${tick.awaiting}</span>`
          : nothing}
        ${tick.is_blocked
          ? html`<span class="detail-meta-badge blocked">⊘ blocked</span>`
          : nothing}
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">Description</div>
        ${tick.description
          ? html`<div class="detail-description">${tick.description}</div>`
          : html`<div class="detail-field-empty">No description</div>`}
      </div>

      <!-- Acceptance Criteria -->
      ${tick.acceptance_criteria
        ? html`
            <div class="detail-field">
              <div class="detail-field-label">Acceptance Criteria</div>
              <div class="detail-description">${tick.acceptance_criteria}</div>
            </div>
          `
        : nothing}

      <!-- Parent -->
      ${tick.parent
        ? html`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${() => this._handleTickClick(tick.parent!)}>${tick.parent}</a>
            </div>
          `
        : nothing}

      <!-- Blocked by -->
      ${tick.blocked_by && tick.blocked_by.length > 0
        ? html`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${tick.blocked_by.map(bid => html`
                <a class="detail-link" @click=${() => this._handleTickClick(bid)} style="margin-right: 0.5rem;">${bid}</a>
              `)}
            </div>
          `
        : nothing}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length > 0
          ? html`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(note => html`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${note.author ?? 'Unknown'}</span>
                      ${note.timestamp
                        ? html`<span class="detail-note-time">${this._formatRelativeTime(note.timestamp)}</span>`
                        : nothing}
                    </div>
                    <div class="detail-note-text">${note.text}</div>
                  </li>
                `)}
              </ul>
            `
          : html`<div class="detail-field-empty">No notes</div>`}
      </div>

      <!-- Closed reason -->
      ${tick.closed_reason
        ? html`
            <div class="detail-field">
              <div class="detail-field-label">Close Reason</div>
              <div class="detail-description">${tick.closed_reason}</div>
            </div>
          `
        : nothing}

      <!-- Timestamps -->
      <div class="detail-field">
        <div class="detail-field-label">Timestamps</div>
        <div class="detail-timestamps">
          <div class="detail-ts-row">
            <span class="detail-ts-label">Created</span>
            <span class="detail-ts-value">${this._formatTimestamp(tick.created_at)}</span>
          </div>
          <div class="detail-ts-row">
            <span class="detail-ts-label">Updated</span>
            <span class="detail-ts-value">${this._formatTimestamp(tick.updated_at)}</span>
          </div>
          ${tick.started_at
            ? html`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(tick.started_at)}</span>
                </div>
              `
            : nothing}
          ${tick.closed_at
            ? html`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(tick.closed_at)}</span>
                </div>
              `
            : nothing}
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
