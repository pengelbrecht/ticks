import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { RunRecord, ToolRecord, VerificationRecord, VerifierResult } from '../api/ticks.js';

/**
 * Component for displaying RunRecord details with collapsible sections.
 *
 * @element run-record
 *
 * @prop {RunRecord | null} record - The run record to display
 * @prop {boolean} loading - Whether the record is being loaded
 * @prop {string} error - Error message if loading failed
 */
@customElement('run-record')
export class RunRecordComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    /* Error state */
    .error {
      color: var(--red);
      font-size: 0.875rem;
      padding: 0.5rem;
    }

    /* Empty state */
    .empty {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Main container */
    .run-record-container {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record-container.success {
      border-left: 3px solid var(--green);
    }

    .run-record-container.error {
      border-left: 3px solid var(--red);
    }

    /* Summary section (always visible) */
    .summary-section {
      padding: 0.75rem;
      background: var(--mantle);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-icon {
      display: flex;
      align-items: center;
    }

    .status-icon.success sl-icon {
      color: var(--green);
    }

    .status-icon.error sl-icon {
      color: var(--red);
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .session-id {
      font-family: monospace;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
    }

    .summary-label {
      color: var(--subtext0);
    }

    .summary-value {
      color: var(--text);
      font-family: monospace;
    }

    .summary-value.success {
      color: var(--green);
    }

    .summary-value.error {
      color: var(--red);
    }

    .summary-value.cost {
      color: var(--green);
      font-weight: 500;
    }

    /* Error message box */
    .error-box {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    /* Collapsible sections using sl-details */
    .sections-container {
      border-top: 1px solid var(--surface1);
    }

    sl-details {
      border-bottom: 1px solid var(--surface1);
    }

    sl-details:last-child {
      border-bottom: none;
    }

    sl-details::part(base) {
      background: transparent;
      border: none;
      border-radius: 0;
    }

    sl-details::part(header) {
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    sl-details::part(summary-icon) {
      color: var(--subtext0);
    }

    sl-details::part(content) {
      padding: 0 0.75rem 0.75rem 0.75rem;
    }

    /* Content blocks */
    .content-block {
      background: var(--crust);
      border-radius: 4px;
      padding: 0.5rem;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 250px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .content-block::-webkit-scrollbar {
      width: 6px;
    }

    .content-block::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .content-block::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    /* Metrics section */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .metric-label {
      color: var(--subtext0);
    }

    .metric-value {
      color: var(--text);
      font-family: monospace;
    }

    /* Tools list */
    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      margin-bottom: 0;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 80px;
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

    .tool-error-icon {
      color: var(--red);
      font-size: 0.75rem;
    }

    /* Verification section */
    .verification-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
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

    .verifier-results {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .verifier-item.passed {
      border-left: 2px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 2px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 0.875rem;
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
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.6875rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--surface0);
      padding: 0.375rem;
      border-radius: 4px;
      max-height: 100px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.6875rem;
      color: var(--red);
      margin-top: 0.25rem;
    }
  `;

  @property({ attribute: false })
  record: RunRecord | null = null;

  @property({ type: Boolean })
  loading = false;

  @property({ type: String })
  error = '';

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

  private truncateText(text: string, maxLength = 50): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  private renderSummary(record: RunRecord) {
    const totalTokens = record.metrics.input_tokens + record.metrics.output_tokens;
    const statusClass = record.success ? 'success' : 'error';

    return html`
      <div class="summary-section">
        <div class="summary-header">
          <div class="summary-left">
            <span class="status-icon ${statusClass}">
              <sl-icon name="${record.success ? 'check-circle-fill' : 'x-circle-fill'}"></sl-icon>
            </span>
            <span class="model-badge">${record.model}</span>
          </div>
          <div class="summary-right">
            <span class="session-id">${record.session_id}</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Status</span>
            <span class="summary-value ${statusClass}">${record.success ? 'Success' : 'Failed'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Duration</span>
            <span class="summary-value">${this.formatDuration(record.metrics.duration_ms)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tokens</span>
            <span class="summary-value">${this.formatTokenCount(totalTokens)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cost</span>
            <span class="summary-value cost">${this.formatCost(record.metrics.cost_usd)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Started</span>
            <span class="summary-value">${this.formatTimestamp(record.started_at)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Ended</span>
            <span class="summary-value">${this.formatTimestamp(record.ended_at)}</span>
          </div>
        </div>

        ${!record.success && record.error_msg
          ? html`<div class="error-box"><strong>Error:</strong> ${record.error_msg}</div>`
          : nothing}
      </div>
    `;
  }

  private renderMetrics(record: RunRecord) {
    const metrics = record.metrics;
    return html`
      <sl-details summary="Metrics">
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Input Tokens</span>
            <span class="metric-value">${this.formatTokenCount(metrics.input_tokens)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Output Tokens</span>
            <span class="metric-value">${this.formatTokenCount(metrics.output_tokens)}</span>
          </div>
          ${metrics.cache_read_tokens > 0
            ? html`
                <div class="metric-item">
                  <span class="metric-label">Cache Read</span>
                  <span class="metric-value">${this.formatTokenCount(metrics.cache_read_tokens)}</span>
                </div>
              `
            : nothing}
          ${metrics.cache_creation_tokens > 0
            ? html`
                <div class="metric-item">
                  <span class="metric-label">Cache Creation</span>
                  <span class="metric-value">${this.formatTokenCount(metrics.cache_creation_tokens)}</span>
                </div>
              `
            : nothing}
          <div class="metric-item">
            <span class="metric-label">Duration</span>
            <span class="metric-value">${this.formatDuration(metrics.duration_ms)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Cost</span>
            <span class="metric-value">${this.formatCost(metrics.cost_usd)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Turns</span>
            <span class="metric-value">${record.num_turns}</span>
          </div>
        </div>
      </sl-details>
    `;
  }

  private renderOutput(record: RunRecord) {
    if (!record.output) return nothing;

    return html`
      <sl-details summary="Output">
        <div class="content-block">${record.output}</div>
      </sl-details>
    `;
  }

  private renderThinking(record: RunRecord) {
    if (!record.thinking) return nothing;

    return html`
      <sl-details summary="Thinking">
        <div class="content-block">${record.thinking}</div>
      </sl-details>
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
          ? html`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`
          : nothing}
      </li>
    `;
  }

  private renderTools(record: RunRecord) {
    if (!record.tools || record.tools.length === 0) return nothing;

    return html`
      <sl-details summary="Tools (${record.tools.length})">
        <ul class="tools-list">
          ${record.tools.map(tool => this.renderToolItem(tool))}
        </ul>
      </sl-details>
    `;
  }

  private renderVerifierResult(result: VerifierResult) {
    const statusClass = result.passed ? 'passed' : 'failed';

    return html`
      <div class="verifier-item ${statusClass}">
        <span class="verifier-icon ${statusClass}">
          <sl-icon name="${result.passed ? 'check-lg' : 'x-lg'}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${result.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(result.duration_ms)}</span>
          </div>
          ${result.error ? html`<div class="verifier-error">${result.error}</div>` : nothing}
          ${result.output ? html`<div class="verifier-output">${result.output}</div>` : nothing}
        </div>
      </div>
    `;
  }

  private renderVerification(record: RunRecord) {
    if (!record.verification) return nothing;

    const verification = record.verification;
    const statusClass = verification.all_passed ? 'passed' : 'failed';
    const results = verification.results || [];

    return html`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${statusClass}">
            <sl-icon name="${verification.all_passed ? 'check-circle-fill' : 'x-circle-fill'}"></sl-icon>
            <span>${verification.all_passed ? 'Verified' : 'Failed'}</span>
          </div>
        </div>
        ${results.length > 0
          ? html`
              <div class="verifier-results">
                ${results.map(result => this.renderVerifierResult(result))}
              </div>
            `
          : nothing}
      </sl-details>
    `;
  }

  render() {
    // Loading state
    if (this.loading) {
      return html`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading run record...</span>
        </div>
      `;
    }

    // Error state
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    // Empty state
    if (!this.record) {
      return html`<div class="empty">No run record available</div>`;
    }

    const record = this.record;
    const statusClass = record.success ? 'success' : 'error';

    return html`
      <div class="run-record-container ${statusClass}">
        ${this.renderSummary(record)}
        <div class="sections-container">
          ${this.renderMetrics(record)}
          ${this.renderOutput(record)}
          ${this.renderThinking(record)}
          ${this.renderTools(record)}
          ${this.renderVerification(record)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'run-record': RunRecordComponent;
  }
}
