import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { TickType } from '../types/tick.js';
import { createTick, type NewTick, type CreateTickResponse, ApiError } from '../api/ticks.js';

// Type options with labels
const TYPE_OPTIONS: { value: TickType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'epic', label: 'Epic' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'chore', label: 'Chore' },
];

// Priority options with labels
const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '0 - Critical' },
  { value: 1, label: '1 - High' },
  { value: 2, label: '2 - Medium' },
  { value: 3, label: '3 - Low' },
  { value: 4, label: '4 - Backlog' },
];

@customElement('tick-create-dialog')
export class TickCreateDialog extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    sl-dialog::part(panel) {
      width: 480px;
      max-width: 95vw;
      background: var(--base);
    }

    sl-dialog::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-dialog::part(title) {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-dialog::part(close-button) {
      color: var(--subtext0);
    }

    sl-dialog::part(close-button):hover {
      color: var(--text);
    }

    sl-dialog::part(body) {
      padding: 1.25rem;
    }

    sl-dialog::part(footer) {
      background: var(--surface0);
      border-top: 1px solid var(--surface1);
      padding: 1rem 1.25rem;
    }

    .form-field {
      margin-bottom: 1rem;
    }

    .form-field:last-child {
      margin-bottom: 0;
    }

    .form-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.375rem;
    }

    .form-field .required {
      color: var(--red);
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-row .form-field {
      flex: 1;
    }

    sl-input,
    sl-textarea,
    sl-select {
      width: 100%;
    }

    sl-checkbox {
      margin-top: 0.5rem;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text);
    }

    .checkbox-help {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-left: 1.75rem;
      margin-top: 0.25rem;
    }

    .error-message {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid var(--red);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      color: var(--red);
      font-size: 0.875rem;
    }

    .footer-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `;

  @property({ type: Boolean })
  open = false;

  @property({ type: Array, attribute: false })
  epics: { id: string; title: string }[] = [];

  @state()
  private loading = false;

  @state()
  private error: string | null = null;

  // Form field values
  @state()
  private tickTitle = '';

  @state()
  private tickDescription = '';

  @state()
  private type: TickType = 'task';

  @state()
  private priority = 2;

  @state()
  private parent = '';

  @state()
  private labels = '';

  @state()
  private manual = false;

  @query('sl-input[name="title"]')
  private titleInput!: HTMLInputElement;

  private resetForm() {
    this.tickTitle = '';
    this.tickDescription = '';
    this.type = 'task';
    this.priority = 2;
    this.parent = '';
    this.labels = '';
    this.manual = false;
    this.error = null;
    this.loading = false;
  }

  private handleDialogRequestClose(e: CustomEvent) {
    // Allow close unless we're loading
    if (this.loading) {
      e.preventDefault();
      return;
    }
    this.handleClose();
  }

  private handleClose() {
    this.resetForm();
    this.dispatchEvent(
      new CustomEvent('dialog-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.tickTitle = input.value;
  }

  private handleDescriptionInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.tickDescription = textarea.value;
  }

  private handleTypeChange(e: CustomEvent) {
    const select = e.target as HTMLSelectElement;
    this.type = select.value as TickType;
  }

  private handlePriorityChange(e: CustomEvent) {
    const select = e.target as HTMLSelectElement;
    this.priority = parseInt(select.value, 10);
  }

  private handleParentChange(e: CustomEvent) {
    const select = e.target as HTMLSelectElement;
    this.parent = select.value;
  }

  private handleLabelsInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.labels = input.value;
  }

  private handleManualChange(e: Event) {
    const checkbox = e.target as HTMLInputElement;
    this.manual = checkbox.checked;
  }

  private async handleSubmit() {
    // Validate required fields
    if (!this.tickTitle.trim()) {
      this.error = 'Title is required';
      this.titleInput?.focus();
      return;
    }

    this.loading = true;
    this.error = null;

    // Build the new tick object
    const newTick: NewTick = {
      title: this.tickTitle.trim(),
      type: this.type,
      priority: this.priority,
    };

    if (this.tickDescription.trim()) {
      newTick.description = this.tickDescription.trim();
    }

    if (this.parent) {
      newTick.parent = this.parent;
    }

    try {
      const createdTick = await createTick(newTick);

      // Emit success event with the created tick
      this.dispatchEvent(
        new CustomEvent<{ tick: CreateTickResponse; labels: string[]; manual: boolean }>('tick-created', {
          detail: {
            tick: createdTick,
            labels: this.labels ? this.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
            manual: this.manual,
          },
          bubbles: true,
          composed: true,
        })
      );

      this.handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        this.error = err.body || err.message;
      } else if (err instanceof Error) {
        this.error = err.message;
      } else {
        this.error = 'Failed to create tick';
      }
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error
          ? html`<div class="error-message">${this.error}</div>`
          : nothing}

        <div class="form-field">
          <label>
            Title <span class="required">*</span>
          </label>
          <sl-input
            name="title"
            placeholder="Enter tick title"
            .value=${this.tickTitle}
            @sl-input=${this.handleTitleInput}
            ?disabled=${this.loading}
            autofocus
          ></sl-input>
        </div>

        <div class="form-field">
          <label>Description</label>
          <sl-textarea
            placeholder="Enter description (optional)"
            rows="3"
            resize="auto"
            .value=${this.tickDescription}
            @sl-input=${this.handleDescriptionInput}
            ?disabled=${this.loading}
          ></sl-textarea>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Type</label>
            <sl-select
              .value=${this.type}
              @sl-change=${this.handleTypeChange}
              ?disabled=${this.loading}
            >
              ${TYPE_OPTIONS.map(
                opt => html`
                  <sl-option value=${opt.value}>${opt.label}</sl-option>
                `
              )}
            </sl-select>
          </div>

          <div class="form-field">
            <label>Priority</label>
            <sl-select
              .value=${String(this.priority)}
              @sl-change=${this.handlePriorityChange}
              ?disabled=${this.loading}
            >
              ${PRIORITY_OPTIONS.map(
                opt => html`
                  <sl-option value=${String(opt.value)}>${opt.label}</sl-option>
                `
              )}
            </sl-select>
          </div>
        </div>

        <div class="form-field">
          <label>Parent Epic</label>
          <sl-select
            placeholder="None"
            clearable
            .value=${this.parent}
            @sl-change=${this.handleParentChange}
            ?disabled=${this.loading}
          >
            ${this.epics.map(
              epic => html`
                <sl-option value=${epic.id}>${epic.title}</sl-option>
              `
            )}
          </sl-select>
        </div>

        <div class="form-field">
          <label>Labels</label>
          <sl-input
            placeholder="bug, urgent, frontend (comma-separated)"
            .value=${this.labels}
            @sl-input=${this.handleLabelsInput}
            ?disabled=${this.loading}
          ></sl-input>
        </div>

        <div class="form-field">
          <div class="checkbox-field">
            <sl-checkbox
              ?checked=${this.manual}
              @sl-change=${this.handleManualChange}
              ?disabled=${this.loading}
            >
              Manual task
            </sl-checkbox>
          </div>
          <div class="checkbox-help">
            Manual tasks require human intervention and are skipped by automated agents.
          </div>
        </div>

        <div slot="footer" class="footer-buttons">
          <sl-button
            variant="neutral"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </sl-button>
          <sl-button
            variant="primary"
            @click=${this.handleSubmit}
            ?loading=${this.loading}
          >
            Create
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-create-dialog': TickCreateDialog;
  }
}
