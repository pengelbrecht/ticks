import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Tick, BoardTick } from '../types/tick.js';
import type { Note, BlockerDetail, RunRecord, ToolRecord, VerificationRecord, VerifierResult } from '../api/ticks.js';
import { approveTick, rejectTick, closeTick, reopenTick, addNote, fetchRecord, getCloudProject, ApiError } from '../api/ticks.js';
import './run-record.js';
import './ticks-button.js';

// Priority labels for display
const PRIORITY_LABELS: Record<number, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Backlog',
};

// Priority colors matching tick-card
const PRIORITY_COLORS: Record<number, string> = {
  0: 'var(--red)',
  1: 'var(--peach)',
  2: 'var(--yellow)',
  3: 'var(--green)',
  4: 'var(--subtext0)',
};

/**
 * Slide-out drawer displaying detailed tick information and actions.
 *
 * @element tick-detail-drawer
 * @fires close - Fired when the drawer is closed
 * @fires tick-updated - Fired when a tick action succeeds (approve/reject/close/reopen/note)
 *
 * @prop {BoardTick | null} tick - The tick to display, or null to close drawer
 * @prop {Record<string, string>} epicNames - Map of epic IDs to display names
 */
@customElement('tick-detail-drawer')
export class TickDetailDrawer extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    sl-drawer::part(panel) {
      width: 420px;
      background: var(--base);
    }

    sl-drawer::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-drawer::part(title) {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-drawer::part(close-button) {
      color: var(--subtext0);
    }

    sl-drawer::part(close-button):hover {
      color: var(--text);
    }

    sl-drawer::part(body) {
      padding: 0;
    }

    .drawer-content {
      padding: 1rem;
    }

    .section {
      margin-bottom: 1.25rem;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--blue);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.priority {
      border-left: 3px solid var(--priority-color);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.verdict-approved {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.verdict-rejected {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .description {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--surface0);
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface1);
    }

    .empty-text {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    .link-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .link-list li {
      margin-bottom: 0.375rem;
    }

    .link-list li:last-child {
      margin-bottom: 0;
    }

    .tick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .tick-link:hover {
      color: var(--sapphire);
      text-decoration: underline;
    }

    .tick-link .link-id {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .tick-link .link-title {
      color: var(--subtext1);
    }

    .tick-link.status-closed .link-title {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .label-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .timestamp-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .timestamp-label {
      color: var(--subtext0);
    }

    .timestamp-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .note-item {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      padding: 0.625rem;
      margin-bottom: 0.5rem;
    }

    .note-item:last-child {
      margin-bottom: 0;
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .note-author {
      font-weight: 500;
      color: var(--blue);
    }

    .note-timestamp {
      font-family: monospace;
      color: var(--subtext0);
    }

    .note-text {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 480px) {
      sl-drawer::part(panel) {
        width: 100vw;
        max-width: 100vw;
      }

      /* Larger touch targets for mobile */
      .actions-section sl-button::part(base) {
        min-height: 44px;
        font-size: 1rem;
      }

      .add-note-actions sl-button::part(base) {
        min-height: 44px;
      }

      .tick-link {
        padding: 0.5rem;
        margin: -0.5rem;
      }

      .reason-buttons sl-button::part(base) {
        min-height: 44px;
      }
    }

    /* Action buttons section */
    .actions-section {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .actions-section sl-button::part(base) {
      font-size: 0.875rem;
    }

    /* Reason input container */
    .reason-container {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
    }

    .reason-container .reason-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
      display: block;
    }

    .reason-container .reason-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Error alert */
    .error-alert {
      margin-bottom: 1rem;
    }

    /* Notes scroll container */
    .notes-scroll {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 0.75rem;
    }

    /* Optimistic note styling */
    .note-optimistic {
      opacity: 0.7;
      border-style: dashed;
    }

    .note-sending {
      font-size: 0.75rem;
      color: var(--subtext0);
      font-style: italic;
      margin-top: 0.25rem;
    }

    /* Add note form */
    .add-note-form {
      margin-top: 0.75rem;
    }

    .add-note-form sl-textarea::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    .add-note-form sl-textarea::part(textarea) {
      color: var(--text);
      font-size: 0.875rem;
    }

    .add-note-form sl-textarea::part(textarea)::placeholder {
      color: var(--subtext0);
    }

    .add-note-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .add-note-hint {
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .add-note-error {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    /* Run History styles */
    .run-history-container {
      margin-top: 0.5rem;
    }

    .run-record {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record.success {
      border-left: 3px solid var(--green);
    }

    .run-record.error {
      border-left: 3px solid var(--red);
    }

    .run-record-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--mantle);
      border-bottom: 1px solid var(--surface1);
      cursor: pointer;
      user-select: none;
    }

    .run-record-header:hover {
      background: var(--surface0);
    }

    .run-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-status-icon {
      display: flex;
      align-items: center;
    }

    .run-status-icon.success sl-icon {
      color: var(--green);
    }

    .run-status-icon.error sl-icon {
      color: var(--red);
    }

    .run-timestamp {
      font-size: 0.75rem;
      color: var(--subtext1);
      font-family: monospace;
    }

    .run-header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-metrics-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .run-metric {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .run-metric-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .run-cost {
      color: var(--green);
      font-weight: 500;
    }

    .run-model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .expand-icon {
      color: var(--subtext0);
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .run-record-body {
      padding: 0.75rem;
    }

    .run-detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .run-detail-row:last-child {
      margin-bottom: 0;
    }

    .run-detail-label {
      color: var(--subtext0);
    }

    .run-detail-value {
      color: var(--text);
      font-family: monospace;
    }

    .run-collapsible {
      margin-top: 0.75rem;
    }

    .run-collapsible-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    .run-collapsible-header:hover {
      background: var(--surface0);
    }

    .run-collapsible-content {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .run-collapsible-content::-webkit-scrollbar {
      width: 6px;
    }

    .run-collapsible-content::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .run-collapsible-content::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--surface0);
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      border-bottom: none;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 60px;
    }

    .tool-name.error {
      color: var(--red);
    }

    .tool-input-preview {
      flex: 1;
      color: var(--subtext0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      color: var(--subtext0);
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .run-error-msg {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    .run-log-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
    }

    .run-log-link:hover {
      text-decoration: underline;
    }

    .run-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    .no-run-history {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Verification styles */
    .verification-section {
      margin-top: 0.75rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .verification-badge.pending {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .verification-badge sl-icon {
      font-size: 1rem;
    }

    .verifier-results {
      margin-top: 0.75rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .verifier-item:last-child {
      margin-bottom: 0;
    }

    .verifier-item.passed {
      border-left: 3px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 3px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 1rem;
    }

    .verifier-icon.passed {
      color: var(--green);
    }

    .verifier-icon.failed {
      color: var(--red);
    }

    .verifier-content {
      flex: 1;
      min-width: 0;
    }

    .verifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .verifier-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.75rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--crust);
      padding: 0.5rem;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.75rem;
      color: var(--red);
      margin-top: 0.25rem;
    }

    /* Tab group styles */
    .tab-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.75rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.625rem 0.875rem;
      color: var(--subtext0);
    }

    sl-tab::part(base):hover {
      color: var(--text);
    }

    sl-tab[active]::part(base) {
      color: var(--blue);
    }

    sl-tab-panel {
      height: 100%;
      overflow-y: auto;
    }

    sl-tab-panel::part(base) {
      padding: 0;
      height: 100%;
    }

    .run-tab-content {
      padding: 1rem;
    }

    .run-tab-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--subtext0);
    }

    .run-tab-empty sl-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .run-tab-empty .empty-message {
      font-size: 0.875rem;
      font-style: italic;
    }
  `;

  @property({ attribute: false })
  tick: Tick | null = null;

  @property({ type: Boolean })
  open = false;

  @property({ attribute: false })
  notesList: Note[] = [];

  @property({ attribute: false })
  blockerDetails: BlockerDetail[] = [];

  @property({ type: String, attribute: 'parent-title' })
  parentTitle?: string;

  @property({ type: Boolean, attribute: 'readonly-mode' })
  readonlyMode = false;

  // Internal state for action buttons
  @state() private loading = false;
  @state() private errorMessage = '';
  @state() private showRejectInput = false;
  @state() private showCloseInput = false;
  @state() private rejectReason = '';
  @state() private closeReason = '';

  // Internal state for add note
  @state() private newNoteText = '';
  @state() private addingNote = false;
  @state() private addNoteError = '';
  @state() private optimisticNote: Note | null = null;

  // Internal state for run history
  @state() private runRecord: RunRecord | null = null;
  @state() private loadingRunRecord = false;
  @state() private runRecordError = '';
  @state() private expandedSections: Set<string> = new Set();

  // Tab state
  @state() private activeTab = 'overview';

  private handleDrawerHide() {
    // Reset action state when drawer closes
    this.resetActionState();
    this.dispatchEvent(
      new CustomEvent('drawer-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  // Reset state when tick changes
  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('tick')) {
      this.resetActionState();
      // Fetch run record for task ticks
      if (this.tick && this.tick.type === 'task') {
        this.loadRunRecord();
      }
    }
  }

  private async loadRunRecord() {
    if (!this.tick) return;

    // Skip in cloud mode - run records are local only
    if (getCloudProject()) {
      this.loadingRunRecord = false;
      return;
    }

    this.loadingRunRecord = true;
    this.runRecordError = '';
    this.runRecord = null;

    try {
      this.runRecord = await fetchRecord(this.tick.id);
    } catch (error) {
      if (error instanceof ApiError) {
        this.runRecordError = error.body || error.message;
      } else {
        this.runRecordError = 'Failed to load run history';
      }
    } finally {
      this.loadingRunRecord = false;
    }
  }

  private handleTickLinkClick(tickId: string) {
    this.dispatchEvent(
      new CustomEvent('tick-link-click', {
        detail: { tickId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private resetActionState() {
    this.showRejectInput = false;
    this.showCloseInput = false;
    this.rejectReason = '';
    this.closeReason = '';
    this.errorMessage = '';
    // Also reset note state
    this.newNoteText = '';
    this.addingNote = false;
    this.addNoteError = '';
    this.optimisticNote = null;
    // Reset run history state
    this.runRecord = null;
    this.loadingRunRecord = false;
    this.runRecordError = '';
    this.expandedSections = new Set();
    // Reset tab state
    this.activeTab = 'overview';
  }

  private emitTickUpdated(tick: BoardTick & { notesList?: Note[]; blockerDetails?: BlockerDetail[] }) {
    this.dispatchEvent(
      new CustomEvent('tick-updated', {
        detail: { tick },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleApprove() {
    if (!this.tick) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await approveTick(this.tick.id);
      // Convert response to BoardTick format
      const updatedTick: BoardTick = {
        ...response,
        is_blocked: response.isBlocked,
      };
      this.emitTickUpdated(updatedTick);
      this.resetActionState();
    } catch (error) {
      if (error instanceof ApiError) {
        this.errorMessage = error.body || error.message;
      } else {
        this.errorMessage = 'Failed to approve tick';
      }
    } finally {
      this.loading = false;
    }
  }

  private handleRejectClick() {
    this.showRejectInput = true;
    this.showCloseInput = false;
  }

  private handleRejectCancel() {
    this.showRejectInput = false;
    this.rejectReason = '';
  }

  private async handleRejectConfirm() {
    if (!this.tick || !this.rejectReason.trim()) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await rejectTick(this.tick.id, this.rejectReason.trim());
      const updatedTick: BoardTick = {
        ...response,
        is_blocked: response.isBlocked,
      };
      this.emitTickUpdated(updatedTick);
      this.resetActionState();
    } catch (error) {
      if (error instanceof ApiError) {
        this.errorMessage = error.body || error.message;
      } else {
        this.errorMessage = 'Failed to reject tick';
      }
    } finally {
      this.loading = false;
    }
  }

  private handleCloseClick() {
    this.showCloseInput = true;
    this.showRejectInput = false;
  }

  private handleCloseCancel() {
    this.showCloseInput = false;
    this.closeReason = '';
  }

  private async handleCloseConfirm() {
    if (!this.tick) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await closeTick(this.tick.id, this.closeReason.trim() || undefined);
      const updatedTick: BoardTick = {
        ...response,
        is_blocked: response.isBlocked,
      };
      this.emitTickUpdated(updatedTick);
      this.resetActionState();
    } catch (error) {
      if (error instanceof ApiError) {
        this.errorMessage = error.body || error.message;
      } else {
        this.errorMessage = 'Failed to close tick';
      }
    } finally {
      this.loading = false;
    }
  }

  private async handleReopen() {
    if (!this.tick) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await reopenTick(this.tick.id);
      const updatedTick: BoardTick = {
        ...response,
        is_blocked: response.isBlocked,
      };
      this.emitTickUpdated(updatedTick);
      this.resetActionState();
    } catch (error) {
      if (error instanceof ApiError) {
        this.errorMessage = error.body || error.message;
      } else {
        this.errorMessage = 'Failed to reopen tick';
      }
    } finally {
      this.loading = false;
    }
  }

  private async handleAddNote() {
    if (!this.tick || !this.newNoteText.trim()) return;

    const noteText = this.newNoteText.trim();
    this.addingNote = true;
    this.addNoteError = '';

    // Create optimistic note
    this.optimisticNote = {
      timestamp: new Date().toISOString(),
      author: 'You',
      text: noteText,
    };
    this.newNoteText = '';

    try {
      const response = await addNote(this.tick.id, noteText);
      // Clear optimistic note - real data will come from parent via tick-updated event
      this.optimisticNote = null;
      // Emit tick-updated with updated tick, including notesList for parent to update
      const updatedTick: BoardTick & { notesList: Note[] } = {
        ...response,
        is_blocked: response.isBlocked,
        notesList: response.notesList,
      };
      this.emitTickUpdated(updatedTick);
    } catch (error) {
      // Revert optimistic update on error
      this.optimisticNote = null;
      this.newNoteText = noteText; // Restore the text so user can retry
      if (error instanceof ApiError) {
        this.addNoteError = error.body || error.message;
      } else {
        this.addNoteError = 'Failed to add note';
      }
    } finally {
      this.addingNote = false;
    }
  }

  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private getPriorityLabel(priority: number): string {
    return PRIORITY_LABELS[priority] ?? 'Unknown';
  }

  private getPriorityColor(priority: number): string {
    return PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[2];
  }

  private renderActions() {
    const tick = this.tick;
    if (!tick) return nothing;

    const isOpen = tick.status === 'open';
    const isClosed = tick.status === 'closed';
    const hasAwaiting = !!tick.awaiting;
    const hasRequires = !!tick.requires;

    // Determine which buttons to show
    const showApproveReject = isOpen && hasAwaiting;
    const showClose = isOpen && !hasRequires;
    const showReopen = isClosed;

    // If no actions available, don't render section
    if (!showApproveReject && !showClose && !showReopen) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage
          ? html`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `
          : nothing}

        <div class="actions-section">
          ${showApproveReject
            ? html`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading || this.readonlyMode}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  ${this.loading ? 'Approving...' : 'Approve'}
                </ticks-button>
                <ticks-button
                  variant="danger"
                  size="small"
                  ?disabled=${this.loading || this.readonlyMode}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </ticks-button>
              `
            : nothing}
          ${showClose
            ? html`
                <ticks-button
                  variant="secondary"
                  size="small"
                  ?disabled=${this.loading || this.readonlyMode}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </ticks-button>
              `
            : nothing}
          ${showReopen
            ? html`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading || this.readonlyMode}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  ${this.loading ? 'Reopening...' : 'Reopen'}
                </ticks-button>
              `
            : nothing}
        </div>

        ${this.showRejectInput
          ? html`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${(e: Event) => {
                    this.rejectReason = (e.target as HTMLInputElement).value;
                  }}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="danger"
                    size="small"
                    ?disabled=${this.loading || !this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    ${this.loading ? 'Rejecting...' : 'Confirm Reject'}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `
          : nothing}

        ${this.showCloseInput
          ? html`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${(e: Event) => {
                    this.closeReason = (e.target as HTMLInputElement).value;
                  }}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="secondary"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    ${this.loading ? 'Closing...' : 'Confirm Close'}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `
          : nothing}
      </div>

      <sl-divider></sl-divider>
    `;
  }

  private renderBlockers() {
    if (!this.blockerDetails || this.blockerDetails.length === 0) {
      return html`<span class="empty-text">None</span>`;
    }

    return html`
      <ul class="link-list">
        ${this.blockerDetails.map(
          blocker => html`
            <li>
              <a
                class="tick-link status-${blocker.status}"
                @click=${() => this.handleTickLinkClick(blocker.id)}
              >
                <span class="link-id">${blocker.id}</span>
                <span class="link-title">${blocker.title}</span>
              </a>
            </li>
          `
        )}
      </ul>
    `;
  }

  private renderParent() {
    if (!this.tick?.parent) {
      return html`<span class="empty-text">None</span>`;
    }

    return html`
      <a
        class="tick-link"
        @click=${() => this.handleTickLinkClick(this.tick!.parent!)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle
          ? html`<span class="link-title">${this.parentTitle}</span>`
          : nothing}
      </a>
    `;
  }

  private renderLabels() {
    if (!this.tick?.labels || this.tick.labels.length === 0) {
      return html`<span class="empty-text">None</span>`;
    }

    return html`
      <div class="labels-container">
        ${this.tick.labels.map(
          label => html`<span class="label-badge">${label}</span>`
        )}
      </div>
    `;
  }

  private renderNoteItem(note: Note, isOptimistic = false) {
    return html`
      <li class="note-item ${isOptimistic ? 'note-optimistic' : ''}">
        <div class="note-header">
          <span class="note-author">${note.author ?? 'Unknown'}</span>
          ${note.timestamp
            ? html`<span class="note-timestamp"
                >${this.formatTimestamp(note.timestamp)}</span
              >`
            : nothing}
        </div>
        <div class="note-text">${note.text}</div>
        ${isOptimistic
          ? html`<div class="note-sending">Sending...</div>`
          : nothing}
      </li>
    `;
  }

  private renderNotes() {
    const hasNotes = (this.notesList && this.notesList.length > 0) || this.optimisticNote;

    return html`
      ${hasNotes
        ? html`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(note => this.renderNoteItem(note))}
                ${this.optimisticNote
                  ? this.renderNoteItem(this.optimisticNote, true)
                  : nothing}
              </ul>
            </div>
          `
        : html`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError
        ? html`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `
        : nothing}

      <!-- Add note form -->
      <div class="add-note-form">
        <sl-textarea
          placeholder="Add a note..."
          rows="2"
          resize="none"
          .value=${this.newNoteText}
          ?disabled=${this.addingNote}
          @sl-input=${(e: Event) => {
            this.newNoteText = (e.target as HTMLTextAreaElement).value;
          }}
          @keydown=${(e: KeyboardEvent) => {
            // Submit on Cmd/Ctrl+Enter
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              this.handleAddNote();
            }
          }}
        ></sl-textarea>
        <div class="add-note-actions">
          <span class="add-note-hint">${this.readonlyMode ? 'Read-only mode' : 'Ctrl+Enter to send'}</span>
          <ticks-button
            variant="primary"
            size="small"
            ?disabled=${this.addingNote || !this.newNoteText.trim() || this.readonlyMode}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            ${this.addingNote ? 'Adding...' : 'Add Note'}
          </ticks-button>
        </div>
      </div>
    `;
  }

  private toggleSection(sectionId: string) {
    const newSet = new Set(this.expandedSections);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    this.expandedSections = newSet;
  }

  private formatRunTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  }

  private formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private truncateText(text: string, maxLength = 60): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  private renderVerification() {
    // Only show for task type with a run record
    if (this.tick?.type !== 'task' || !this.runRecord) {
      return nothing;
    }

    const verification = this.runRecord.verification;

    // No verification results yet
    if (!verification) {
      // Only show pending if task is closed (verification should have run)
      if (this.tick.status === 'closed') {
        return html`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `;
      }
      return nothing;
    }

    const passed = verification.all_passed;
    const results = verification.results || [];

    return html`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${passed ? 'passed' : 'failed'}">
          <sl-icon name="${passed ? 'check-circle-fill' : 'x-circle-fill'}"></sl-icon>
          <span>${passed ? 'Verified' : 'Failed'}</span>
        </div>

        ${results.length > 0
          ? html`
              <div class="verifier-results">
                ${results.map(result => this.renderVerifierResult(result))}
              </div>
            `
          : nothing}
      </div>
      <sl-divider></sl-divider>
    `;
  }

  private renderVerifierResult(result: VerifierResult) {
    const passed = result.passed;
    const isExpanded = this.expandedSections.has(`verifier-${result.verifier}`);

    return html`
      <div class="verifier-item ${passed ? 'passed' : 'failed'}">
        <span class="verifier-icon ${passed ? 'passed' : 'failed'}">
          <sl-icon name="${passed ? 'check-lg' : 'x-lg'}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${result.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(result.duration_ms)}</span>
          </div>
          ${result.error
            ? html`<div class="verifier-error">${result.error}</div>`
            : nothing}
          ${result.output
            ? html`
                <div
                  class="run-collapsible-header"
                  style="margin-top: 0.5rem;"
                  @click=${() => this.toggleSection(`verifier-${result.verifier}`)}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${isExpanded ? 'expanded' : ''}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${isExpanded
                  ? html`<div class="verifier-output">${result.output}</div>`
                  : nothing}
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private renderRunHistory() {
    // Only show for task type
    if (this.tick?.type !== 'task') {
      return nothing;
    }

    // Loading state
    if (this.loadingRunRecord) {
      return html`
        <div class="section">
          <div class="section-title">Run History</div>
          <div class="run-loading">
            <sl-spinner></sl-spinner>
            <span>Loading run history...</span>
          </div>
        </div>
        <sl-divider></sl-divider>
      `;
    }

    // Error state
    if (this.runRecordError) {
      return html`
        <div class="section">
          <div class="section-title">Run History</div>
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.runRecordError}
          </sl-alert>
        </div>
        <sl-divider></sl-divider>
      `;
    }

    // No record found
    if (!this.runRecord) {
      return html`
        <div class="section">
          <div class="section-title">Run History</div>
          <span class="no-run-history">No run history available</span>
        </div>
        <sl-divider></sl-divider>
      `;
    }

    const record = this.runRecord;
    const isExpanded = this.expandedSections.has('run-main');
    const totalTokens = record.metrics.input_tokens + record.metrics.output_tokens;

    return html`
      <div class="section">
        <div class="section-title">Run History</div>
        <div class="run-history-container">
          <div class="run-record ${record.success ? 'success' : 'error'}">
            <!-- Header (always visible, clickable to expand) -->
            <div
              class="run-record-header"
              @click=${() => this.toggleSection('run-main')}
            >
              <div class="run-header-left">
                <span class="run-status-icon ${record.success ? 'success' : 'error'}">
                  <sl-icon name="${record.success ? 'check-circle-fill' : 'x-circle-fill'}"></sl-icon>
                </span>
                <span class="run-timestamp">${this.formatRunTimestamp(record.started_at)}</span>
              </div>
              <div class="run-header-right">
                <div class="run-metrics-summary">
                  <span class="run-metric">
                    <span class="run-metric-value">${this.formatTokenCount(totalTokens)}</span>
                    <span>tokens</span>
                  </span>
                  <span class="run-cost">${this.formatCost(record.metrics.cost_usd)}</span>
                </div>
                <span class="run-model-badge">${record.model}</span>
                <sl-icon
                  class="expand-icon ${isExpanded ? 'expanded' : ''}"
                  name="chevron-down"
                ></sl-icon>
              </div>
            </div>

            <!-- Expanded content -->
            ${isExpanded ? this.renderRunRecordBody(record) : nothing}
          </div>
        </div>
      </div>
      <sl-divider></sl-divider>
    `;
  }

  private renderRunRecordBody(record: RunRecord) {
    return html`
      <div class="run-record-body">
        <!-- Basic details -->
        <div class="run-detail-row">
          <span class="run-detail-label">Session ID</span>
          <span class="run-detail-value">${record.session_id}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Duration</span>
          <span class="run-detail-value">${this.formatDuration(record.metrics.duration_ms)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Turns</span>
          <span class="run-detail-value">${record.num_turns}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Started</span>
          <span class="run-detail-value">${this.formatTimestamp(record.started_at)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Ended</span>
          <span class="run-detail-value">${this.formatTimestamp(record.ended_at)}</span>
        </div>

        <!-- Token breakdown -->
        <div class="run-detail-row">
          <span class="run-detail-label">Input Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(record.metrics.input_tokens)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Output Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(record.metrics.output_tokens)}</span>
        </div>
        ${record.metrics.cache_read_tokens > 0
          ? html`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Read</span>
                <span class="run-detail-value">${this.formatTokenCount(record.metrics.cache_read_tokens)}</span>
              </div>
            `
          : nothing}
        ${record.metrics.cache_creation_tokens > 0
          ? html`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(record.metrics.cache_creation_tokens)}</span>
              </div>
            `
          : nothing}

        <!-- Error message if failed -->
        ${!record.success && record.error_msg
          ? html`
              <div class="run-error-msg">
                <strong>Error:</strong> ${record.error_msg}
              </div>
            `
          : nothing}

        <!-- Collapsible: Output -->
        ${record.output
          ? html`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${() => this.toggleSection('run-output')}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has('run-output') ? 'expanded' : ''}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has('run-output')
                  ? html`
                      <div class="run-collapsible-content">
                        ${record.output}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Collapsible: Thinking -->
        ${record.thinking
          ? html`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${() => this.toggleSection('run-thinking')}
                >
                  <span>Thinking</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has('run-thinking') ? 'expanded' : ''}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has('run-thinking')
                  ? html`
                      <div class="run-collapsible-content">
                        ${record.thinking}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Collapsible: Tools Log -->
        ${record.tools && record.tools.length > 0
          ? html`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${() => this.toggleSection('run-tools')}
                >
                  <span>Tools (${record.tools.length})</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has('run-tools') ? 'expanded' : ''}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has('run-tools')
                  ? html`
                      <ul class="tools-list">
                        ${record.tools.map(tool => this.renderToolItem(tool))}
                      </ul>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- Link to log file -->
        <a
          class="run-log-link"
          href="javascript:void(0)"
          @click=${() => {
            // Copy log path to clipboard
            const logPath = `.tick/logs/records/${this.tick?.id}.json`;
            navigator.clipboard.writeText(logPath);
            if (window.showToast) {
              window.showToast({
                message: `Log path copied: ${logPath}`,
                variant: 'primary',
                duration: 3000,
              });
            }
          }}
        >
          <sl-icon name="file-earmark-text"></sl-icon>
          Copy log file path
        </a>
      </div>
    `;
  }

  private renderToolItem(tool: ToolRecord) {
    return html`
      <li class="tool-item">
        <span class="tool-name ${tool.is_error ? 'error' : ''}">${tool.name}</span>
        ${tool.input
          ? html`<span class="tool-input-preview">${this.truncateText(tool.input)}</span>`
          : nothing}
        <span class="tool-duration">${this.formatDuration(tool.duration_ms)}</span>
        ${tool.is_error
          ? html`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`
          : nothing}
      </li>
    `;
  }

  private renderRunTab() {
    // Show Run tab content for task type only
    if (this.tick?.type !== 'task') {
      return html`
        <div class="run-tab-empty">
          <sl-icon name="info-circle"></sl-icon>
          <div class="empty-message">Run data is only available for tasks.</div>
        </div>
      `;
    }

    // Use the run-record component
    return html`
      <div class="run-tab-content">
        <run-record
          .record=${this.runRecord}
          .loading=${this.loadingRunRecord}
          .error=${this.runRecordError}
        ></run-record>
      </div>
    `;
  }

  private shouldShowRunTab(): boolean {
    // Only show Run tab for closed tasks
    return this.tick?.type === 'task' && this.tick?.status === 'closed';
  }

  private renderDetailsContent() {
    const tick = this.tick;
    if (!tick) return nothing;

    return html`
      <div class="drawer-content">
        <!-- Header: ID and Title -->
        <div class="section">
          <div class="tick-id">${tick.id}</div>
          <h2 class="tick-title">${tick.title}</h2>

          <!-- Status badges row -->
          <div class="meta-row">
            <span class="meta-badge type-badge type-${tick.type}"
              >${tick.type}</span
            >
            <span class="meta-badge status-${tick.status}"
              >${tick.status.replace('_', ' ')}</span
            >
            <span
              class="meta-badge priority"
              style="--priority-color: ${this.getPriorityColor(tick.priority)}"
            >
              ${this.getPriorityLabel(tick.priority)}
            </span>
            ${tick.manual
              ? html`<span class="meta-badge manual">👤 Manual</span>`
              : nothing}
            ${tick.awaiting
              ? html`<span class="meta-badge awaiting">⏳ ${tick.awaiting}</span>`
              : nothing}
            ${tick.verdict
              ? html`<span class="meta-badge verdict-${tick.verdict}"
                  >${tick.verdict}</span
                >`
              : nothing}
            ${this.blockerDetails && this.blockerDetails.length > 0
              ? html`<span class="meta-badge blocked">⊘ Blocked</span>`
              : nothing}
          </div>
        </div>

        <!-- Actions (approve/reject/close/reopen) -->
        ${this.renderActions()}

        <!-- Description -->
        <div class="section">
          <div class="section-title">Description</div>
          ${tick.description
            ? html`<div class="description">${tick.description}</div>`
            : html`<span class="empty-text">No description</span>`}
        </div>

        <!-- Parent Epic -->
        <div class="section">
          <div class="section-title">Parent Epic</div>
          ${this.renderParent()}
        </div>

        <!-- Blocked By -->
        <div class="section">
          <div class="section-title">Blocked By</div>
          ${this.renderBlockers()}
        </div>

        <!-- Labels -->
        <div class="section">
          <div class="section-title">Labels</div>
          ${this.renderLabels()}
        </div>

        <sl-divider></sl-divider>

        <!-- Notes -->
        <div class="section">
          <div class="section-title">Notes</div>
          ${this.renderNotes()}
        </div>

        <sl-divider></sl-divider>

        <!-- Timestamps -->
        <div class="section">
          <div class="timestamp-row">
            <span class="timestamp-label">Created</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(tick.created_at)}</span
            >
          </div>
          <div class="timestamp-row" style="margin-top: 0.375rem">
            <span class="timestamp-label">Updated</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(tick.updated_at)}</span
            >
          </div>
          ${tick.closed_at
            ? html`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(tick.closed_at)}</span
                  >
                </div>
              `
            : nothing}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${tick.closed_reason
          ? html`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${tick.closed_reason}</div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    const tick = this.tick;
    const showRunTab = this.shouldShowRunTab();

    return html`
      <sl-drawer
        label=${tick ? `${tick.id} Details` : 'Tick Details'}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${tick
          ? showRunTab
            ? html`
                <div class="tab-container">
                  <sl-tab-group>
                    <sl-tab slot="nav" panel="overview" active>Overview</sl-tab>
                    <sl-tab slot="nav" panel="run">Run</sl-tab>

                    <sl-tab-panel name="overview" active>
                      ${this.renderDetailsContent()}
                    </sl-tab-panel>

                    <sl-tab-panel name="run">
                      ${this.renderRunTab()}
                    </sl-tab-panel>
                  </sl-tab-group>
                </div>
              `
            : this.renderDetailsContent()
          : html`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-detail-drawer': TickDetailDrawer;
  }
}
