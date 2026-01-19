import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Tick, BoardTick } from '../types/tick.js';
import type { Note, BlockerDetail } from '../api/ticks.js';
import { approveTick, rejectTick, closeTick, reopenTick, addNote, ApiError } from '../api/ticks.js';

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
  }

  private emitTickUpdated(tick: BoardTick) {
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
      // Update notesList with response from server
      this.notesList = response.notesList;
      this.optimisticNote = null;
      // Emit tick-updated with updated tick
      const updatedTick: BoardTick = {
        ...response,
        is_blocked: response.isBlocked,
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
                <sl-button
                  variant="success"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  Approve
                </sl-button>
                <sl-button
                  variant="danger"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </sl-button>
              `
            : nothing}
          ${showClose
            ? html`
                <sl-button
                  variant="neutral"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </sl-button>
              `
            : nothing}
          ${showReopen
            ? html`
                <sl-button
                  variant="primary"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  Reopen
                </sl-button>
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
                  <sl-button
                    variant="danger"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading || !this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    Confirm Reject
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </sl-button>
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
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    Confirm Close
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    outline
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </sl-button>
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
          <span class="add-note-hint">Ctrl+Enter to send</span>
          <sl-button
            variant="primary"
            size="small"
            ?loading=${this.addingNote}
            ?disabled=${this.addingNote || !this.newNoteText.trim()}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            Add Note
          </sl-button>
        </div>
      </div>
    `;
  }

  render() {
    const tick = this.tick;

    return html`
      <sl-drawer
        label=${tick ? `${tick.id} Details` : 'Tick Details'}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${tick
          ? html`
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
                      style="--priority-color: ${this.getPriorityColor(
                        tick.priority
                      )}"
                    >
                      ${this.getPriorityLabel(tick.priority)}
                    </span>
                    ${tick.manual
                      ? html`<span class="meta-badge manual">👤 Manual</span>`
                      : nothing}
                    ${tick.awaiting
                      ? html`<span class="meta-badge awaiting"
                          >⏳ ${tick.awaiting}</span
                        >`
                      : nothing}
                    ${tick.verdict
                      ? html`<span
                          class="meta-badge verdict-${tick.verdict}"
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
            `
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
