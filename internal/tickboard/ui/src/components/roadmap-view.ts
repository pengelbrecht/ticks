/**
 * Roadmap View component.
 *
 * Renders the epic-chain roadmap as a vertical list of wave groups.
 * Each epic is shown as a card with:
 * - Status colour coding (Catppuccin Mocha palette)
 * - [children_closed / children_total] progress chip
 * - awaiting_type badge (for "gated" epics only)
 * - blocked_by chips
 *
 * Clicking an epic card opens the existing tick-detail-drawer via the
 * shared `selectTick` store action — same path as kanban card clicks.
 *
 * @element roadmap-view
 *
 * @prop {RoadmapResponse|null} roadmap  - Roadmap data (null → loading/empty state)
 * @prop {boolean} loading               - Show loading spinner
 * @prop {string|null} error             - Error message (null → no error)
 *
 * @fires close  - When the close button is clicked
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RoadmapResponse, RoadmapEpic } from '../api/ticks.js';
import { selectTick } from '../stores/ticks.js';

// ============================================================================
// Status colour mapping (Catppuccin Mocha)
// ============================================================================

const STATUS_COLOR: Record<RoadmapEpic['status'], string> = {
  done:   'var(--green, #a6e3a1)',
  active: 'var(--blue, #89b4fa)',
  ready:  'var(--yellow, #f9e2af)',
  queued: 'var(--surface2, #585b70)',
  gated:  'var(--peach, #fab387)',
};

const STATUS_LABEL: Record<RoadmapEpic['status'], string> = {
  done:   'Done',
  active: 'Active',
  ready:  'Needs planning',
  queued: 'Queued',
  gated:  'Gated',
};

@customElement('roadmap-view')
export class RoadmapView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* ── Overlay backdrop ───────────────────────────────────────────────── */
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
      to   { opacity: 1; }
    }

    /* ── Container ──────────────────────────────────────────────────────── */
    .container {
      width: 100%;
      max-width: 860px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .header {
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

    /* ── Body ───────────────────────────────────────────────────────────── */
    .body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── Loading / error / empty ────────────────────────────────────────── */
    .state-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.875rem;
      gap: 0.5rem;
    }

    .state-box.error {
      color: var(--red, #f38ba8);
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .spinner {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    /* ── Wave group ─────────────────────────────────────────────────────── */
    .wave-group {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .wave-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--subtext0, #a6adc8);
      padding-left: 0.25rem;
    }

    /* ── Epic card ──────────────────────────────────────────────────────── */
    .epic-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      position: relative;
    }

    .epic-card:hover {
      background: var(--surface1, #45475a);
      border-color: var(--overlay0, #6c7086);
    }

    /* Left accent bar (status colour) */
    .epic-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 8px 0 0 8px;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Status dot ─────────────────────────────────────────────────────── */
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Epic info ──────────────────────────────────────────────────────── */
    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      white-space: nowrap;
    }

    .epic-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    /* ── Badges row ─────────────────────────────────────────────────────── */
    .badges {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.375rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .badge-status {
      background: color-mix(in srgb, var(--accent-color, var(--surface2)) 20%, transparent);
      color: var(--accent-color, var(--subtext1, #bac2de));
      border: 1px solid color-mix(in srgb, var(--accent-color, var(--surface2)) 40%, transparent);
    }

    .badge-awaiting {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .badge-blocked {
      background: rgba(243, 139, 168, 0.12);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.25);
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    /* ── Progress chip ──────────────────────────────────────────────────── */
    .progress-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .progress-text {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--accent-color, var(--surface2, #585b70));
      transition: width 0.3s ease;
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .body {
        padding: 1rem;
      }

      .progress-bar {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .container {
        border-radius: 0;
        min-height: 100vh;
      }
    }
  `;

  @property({ attribute: false })
  roadmap: RoadmapResponse | null = null;

  @property({ type: Boolean })
  loading = false;

  @property({ attribute: false })
  error: string | null = null;

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      this._close();
    }
  }

  private _handleEpicClick(epicId: string) {
    selectTick(epicId);
    this._close();
  }

  private _pct(epic: RoadmapEpic): number {
    if (epic.children_total === 0) return 0;
    return Math.round((epic.children_closed / epic.children_total) * 100);
  }

  // ============================================================================
  // Render helpers
  // ============================================================================

  private _renderEpicCard(epic: RoadmapEpic) {
    const color = STATUS_COLOR[epic.status] ?? 'var(--surface2)';
    const pct = this._pct(epic);

    return html`
      <div
        class="epic-card"
        style="--accent-color: ${color}"
        @click=${() => this._handleEpicClick(epic.id)}
        role="button"
        tabindex="0"
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') this._handleEpicClick(epic.id); }}
        aria-label="Open epic ${epic.id}: ${epic.title}"
      >
        <div class="status-dot"></div>

        <div class="epic-info">
          <div class="epic-top">
            <span class="epic-id">${epic.id}</span>
            <span class="epic-title">${epic.title}</span>
          </div>

          <div class="badges">
            <span class="badge badge-status">${STATUS_LABEL[epic.status]}</span>

            ${epic.awaiting_type
              ? html`<span class="badge badge-awaiting">⏳ ${epic.awaiting_type}</span>`
              : nothing}

            ${epic.blocked_by && epic.blocked_by.length > 0
              ? epic.blocked_by.map(bid => html`
                  <span class="badge badge-blocked">⊘ ${bid}</span>
                `)
              : nothing}
          </div>
        </div>

        <div class="progress-chip">
          <span class="progress-text">${epic.children_closed}/${epic.children_total}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  private _renderWave(wave: RoadmapEpic[], index: number) {
    return html`
      <div class="wave-group">
        <div class="wave-label">Wave ${index + 1}</div>
        ${wave.map(epic => this._renderEpicCard(epic))}
      </div>
    `;
  }

  private _renderBody() {
    if (this.loading) {
      return html`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;
    }

    if (this.error) {
      return html`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;
    }

    const waves = this.roadmap?.waves ?? null;

    if (!waves || waves.length === 0) {
      return html`<div class="state-box">No epics found — roadmap is empty.</div>`;
    }

    return html`
      <div class="body">
        ${waves.map((wave, i) => this._renderWave(wave, i))}
      </div>
    `;
  }

  render() {
    return html`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="header-icon">🗺</div>
              <div>
                <div class="header-title">Roadmap</div>
                <div class="header-subtitle">Epic chains by dependency wave</div>
              </div>
            </div>
            <div class="header-right">
              <span class="kbd-hint">Press <kbd>m</kbd> or <kbd>Esc</kbd> to close</span>
              <button class="close-btn" @click=${this._close} aria-label="Close roadmap">✕</button>
            </div>
          </div>

          <!-- Body -->
          ${this._renderBody()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'roadmap-view': RoadmapView;
  }
}
