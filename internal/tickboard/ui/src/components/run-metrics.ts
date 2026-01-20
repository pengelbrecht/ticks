import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Metrics record data structure matching server response.
 */
export interface MetricsRecord {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  durationMs?: number;
}

/**
 * Token/cost metrics display component.
 *
 * @element run-metrics
 *
 * Features:
 * - Input tokens count
 * - Output tokens count
 * - Cache read tokens
 * - Cache creation tokens
 * - Total cost (formatted as USD)
 * - Model name display
 * - Compact summary: '12.5K tokens • $0.42'
 * - Expanded view with breakdown by type
 * - Visual bar showing token distribution
 *
 * @prop {MetricsRecord | null} metrics - The metrics data to display
 * @prop {string} model - Model name to display
 * @prop {boolean} live - Whether this is showing live/in-progress metrics
 * @prop {boolean} expanded - Whether to show expanded view with full breakdown
 */
@customElement('run-metrics')
export class RunMetrics extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* Compact view */
    .metrics-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .metrics-compact.live {
      border: 1px solid var(--blue, #89b4fa);
      background: rgba(137, 180, 250, 0.1);
    }

    .metric-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .metric-item sl-icon {
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .metric-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
    }

    .metric-separator {
      color: var(--overlay0, #6c7086);
    }

    .cost-value {
      color: var(--green, #a6e3a1);
      font-weight: 500;
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1, #45475a);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    /* Expanded view */
    .metrics-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .metrics-expanded.live {
      border-color: var(--blue, #89b4fa);
    }

    .metrics-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .metrics-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .metrics-title sl-icon {
      font-size: 1rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: rgba(137, 180, 250, 0.2);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator .pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--blue, #89b4fa);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .metrics-body {
      padding: 0.75rem;
    }

    /* Token bar visualization */
    .token-bar-container {
      margin-bottom: 0.75rem;
    }

    .token-bar-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    .token-bar {
      height: 8px;
      background: var(--crust, #11111b);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }

    .token-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .token-bar-segment.input {
      background: var(--blue, #89b4fa);
    }

    .token-bar-segment.output {
      background: var(--green, #a6e3a1);
    }

    .token-bar-segment.cache-read {
      background: var(--teal, #94e2d5);
    }

    .token-bar-segment.cache-creation {
      background: var(--mauve, #cba6f7);
    }

    /* Metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .metric-card {
      padding: 0.5rem;
      background: var(--mantle, #181825);
      border-radius: 4px;
    }

    .metric-card-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .metric-card-label .dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }

    .metric-card-label .dot.input { background: var(--blue, #89b4fa); }
    .metric-card-label .dot.output { background: var(--green, #a6e3a1); }
    .metric-card-label .dot.cache-read { background: var(--teal, #94e2d5); }
    .metric-card-label .dot.cache-creation { background: var(--mauve, #cba6f7); }

    .metric-card-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
    }

    /* Summary row */
    .metrics-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.125rem;
    }

    .summary-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.9375rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .summary-value.cost {
      color: var(--green, #a6e3a1);
    }

    .summary-value.model {
      color: var(--mauve, #cba6f7);
      font-size: 0.75rem;
    }

    .summary-value.duration {
      color: var(--yellow, #f9e2af);
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
  metrics: MetricsRecord | null = null;

  @property({ type: String })
  model = '';

  @property({ type: Boolean })
  live = false;

  @property({ type: Boolean })
  expanded = false;

  /**
   * Format a number with K/M suffix for large values.
   */
  private formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  }

  /**
   * Format cost as USD with appropriate precision.
   */
  private formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Format duration in milliseconds to human-readable string.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Calculate total tokens from metrics.
   */
  private getTotalTokens(): number {
    if (!this.metrics) return 0;
    return (
      this.metrics.inputTokens +
      this.metrics.outputTokens +
      this.metrics.cacheReadTokens +
      this.metrics.cacheCreationTokens
    );
  }

  /**
   * Get percentage for token bar segment.
   */
  private getTokenPercentage(count: number): number {
    const total = this.getTotalTokens();
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  /**
   * Render compact summary view.
   */
  private renderCompact() {
    if (!this.metrics) {
      return html`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics</span>
        </div>
      `;
    }

    const totalTokens = this.getTotalTokens();

    return html`
      <div class="metrics-compact ${this.live ? 'live' : ''}">
        <span class="metric-item">
          <sl-icon name="cpu"></sl-icon>
          <span class="metric-value">${this.formatTokenCount(totalTokens)}</span>
          <span>tokens</span>
        </span>
        <span class="metric-separator">•</span>
        <span class="metric-item">
          <span class="metric-value cost-value">${this.formatCost(this.metrics.costUsd)}</span>
        </span>
        ${this.model
          ? html`
              <span class="metric-separator">•</span>
              <span class="model-badge">${this.model}</span>
            `
          : nothing}
      </div>
    `;
  }

  /**
   * Render expanded view with full breakdown.
   */
  private renderExpanded() {
    if (!this.metrics) {
      return html`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics available</span>
        </div>
      `;
    }

    const { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, costUsd, durationMs } =
      this.metrics;
    const totalTokens = this.getTotalTokens();

    return html`
      <div class="metrics-expanded ${this.live ? 'live' : ''}">
        <div class="metrics-header">
          <div class="metrics-title">
            <sl-icon name="bar-chart"></sl-icon>
            <span>Token Usage</span>
          </div>
          ${this.live
            ? html`
                <div class="live-indicator">
                  <span class="pulse"></span>
                  <span>Live</span>
                </div>
              `
            : nothing}
        </div>
        <div class="metrics-body">
          <!-- Token distribution bar -->
          <div class="token-bar-container">
            <div class="token-bar-label">
              <span>Token Distribution</span>
              <span>${this.formatTokenCount(totalTokens)} total</span>
            </div>
            <div class="token-bar">
              <div
                class="token-bar-segment input"
                style="width: ${this.getTokenPercentage(inputTokens)}%"
                title="Input: ${this.formatTokenCount(inputTokens)}"
              ></div>
              <div
                class="token-bar-segment output"
                style="width: ${this.getTokenPercentage(outputTokens)}%"
                title="Output: ${this.formatTokenCount(outputTokens)}"
              ></div>
              <div
                class="token-bar-segment cache-read"
                style="width: ${this.getTokenPercentage(cacheReadTokens)}%"
                title="Cache Read: ${this.formatTokenCount(cacheReadTokens)}"
              ></div>
              <div
                class="token-bar-segment cache-creation"
                style="width: ${this.getTokenPercentage(cacheCreationTokens)}%"
                title="Cache Creation: ${this.formatTokenCount(cacheCreationTokens)}"
              ></div>
            </div>
          </div>

          <!-- Token breakdown grid -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot input"></span>
                Input
              </div>
              <div class="metric-card-value">${this.formatTokenCount(inputTokens)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot output"></span>
                Output
              </div>
              <div class="metric-card-value">${this.formatTokenCount(outputTokens)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-read"></span>
                Cache Read
              </div>
              <div class="metric-card-value">${this.formatTokenCount(cacheReadTokens)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-creation"></span>
                Cache Create
              </div>
              <div class="metric-card-value">${this.formatTokenCount(cacheCreationTokens)}</div>
            </div>
          </div>

          <!-- Summary row -->
          <div class="metrics-summary">
            <div class="summary-item">
              <div class="summary-label">Cost</div>
              <div class="summary-value cost">${this.formatCost(costUsd)}</div>
            </div>
            ${durationMs !== undefined
              ? html`
                  <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value duration">${this.formatDuration(durationMs)}</div>
                  </div>
                `
              : nothing}
            ${this.model
              ? html`
                  <div class="summary-item">
                    <div class="summary-label">Model</div>
                    <div class="summary-value model">${this.model}</div>
                  </div>
                `
              : nothing}
          </div>
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
    'run-metrics': RunMetrics;
  }
}
