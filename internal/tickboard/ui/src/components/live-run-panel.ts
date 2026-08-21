import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { $liveRun, type LiveRun, type LiveTick } from '../stores/run.js';

/**
 * The live run, on the board (tick bne).
 *
 * A cloud run has no terminal anyone can watch, and the operator of the first
 * ones repeatedly had to ask whether a run was still alive — the answer came
 * from hand-written gateway queries. This panel is that answer: which epic is
 * running, which ticks are in flight, what each one's DURABLE verdict was, how
 * long since anything happened, and what AI Gateway says it cost.
 *
 * It is a separate surface from the kanban columns on purpose, and it is the
 * whole of the design's "the board is observability, never authority":
 *
 * - It renders `$liveRun` and nothing else. It never writes a store, never
 *   fires a tick event, and cannot move a tick between columns. A tick is done
 *   when collect says the branch carries the work; the pill here says what the
 *   stream reported, which is a different claim about a different thing.
 * - "Last seen" is shown for every run, because a working run and a hung one
 *   have to be distinguishable from outside without reading model telemetry —
 *   the shape tpl's keeper heartbeat proved works. A run whose stream has gone
 *   quiet is marked stale rather than silently left looking healthy.
 * - Cost is shown only when the stream carried one, and reads "cost unknown"
 *   otherwise. The producer fills it from AI Gateway telemetry alone, so an
 *   absent number means the telemetry could not be read — never that the run
 *   was free.
 *
 * @element live-run-panel
 */

/** How long without an event before a run is shown as stale rather than live. */
export const STALE_AFTER_MS = 5 * 60_000;

/** How often the elapsed/stale readouts are recomputed. */
const TICK_INTERVAL_MS = 15_000;

@customElement('live-run-panel')
export class LiveRunPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .panel {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-left: 3px solid var(--green);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin: 0.75rem 1rem 0;
      font-size: 0.8125rem;
    }

    .panel.finished {
      border-left-color: var(--overlay0);
    }

    .panel.stale {
      border-left-color: var(--yellow);
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .epic {
      font-family: monospace;
      font-weight: 600;
      color: var(--text);
    }

    .pill {
      border-radius: 999px;
      padding: 0.0625rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .pill.running {
      background: color-mix(in srgb, var(--green) 20%, transparent);
      color: var(--green);
    }

    .pill.succeeded {
      background: color-mix(in srgb, var(--blue) 20%, transparent);
      color: var(--blue);
    }

    .pill.failed {
      background: color-mix(in srgb, var(--red) 20%, transparent);
      color: var(--red);
    }

    .pill.stale {
      background: color-mix(in srgb, var(--yellow) 20%, transparent);
      color: var(--yellow);
    }

    .meta {
      color: var(--subtext0);
    }

    .message {
      margin-top: 0.25rem;
      color: var(--subtext0);
      overflow-wrap: anywhere;
    }

    .ticks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .tick {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--base);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      padding: 0.1875rem 0.5rem;
    }

    .tick-id {
      font-family: monospace;
      color: var(--text);
    }

    .caveat {
      margin-top: 0.5rem;
      color: var(--overlay1);
      font-size: 0.6875rem;
    }
  `;

  private runController = new StoreController(this, $liveRun);

  /** Re-render on a timer so "last seen" ages without a new event. */
  @state() private now = Date.now();

  private timer: ReturnType<typeof setInterval> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.timer = setInterval(() => {
      this.now = Date.now();
    }, TICK_INTERVAL_MS);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** How long ago, in the shortest words that are still true. */
  private ago(iso: string): string {
    const at = Date.parse(iso);
    if (Number.isNaN(at)) return 'unknown';
    const seconds = Math.max(0, Math.round((this.now - at) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }

  private isStale(run: LiveRun): boolean {
    const at = Date.parse(run.updatedAt);
    if (Number.isNaN(at)) return false;
    return run.state === 'running' && this.now - at > STALE_AFTER_MS;
  }

  /** Cost, or the honest absence of one. */
  private cost(run: LiveRun): string {
    return run.costUsd === null ? 'cost unknown' : `$${run.costUsd.toFixed(2)}`;
  }

  private renderTick(tick: LiveTick) {
    return html`
      <div class="tick" title=${tick.message}>
        <span class="tick-id">${tick.tickId}</span>
        <span class="pill ${tick.state}">${tick.status || tick.state}</span>
      </div>
    `;
  }

  render() {
    const run = this.runController.value;
    // No run streaming: the board is a board. Nothing is drawn, and nothing
    // about the project's state depends on that.
    if (!run) return html``;

    const stale = this.isStale(run);
    const runPill =
      run.state === 'finished'
        ? run.success === true
          ? 'succeeded'
          : 'failed'
        : stale
          ? 'stale'
          : 'running';

    return html`
      <div class="panel ${run.state === 'finished' ? 'finished' : ''} ${stale ? 'stale' : ''}">
        <div class="summary">
          <span class="epic">${run.epicId}</span>
          <span class="pill ${runPill}">${run.state === 'finished' ? run.status || 'finished' : runPill}</span>
          <span class="meta">${run.source}</span>
          <span class="meta">last seen ${this.ago(run.updatedAt)}</span>
          <span class="meta">${this.cost(run)}</span>
        </div>
        ${run.message ? html`<div class="message">${run.message}</div>` : ''}
        ${run.ticks.length > 0
          ? html`<div class="ticks">${run.ticks.map((tick) => this.renderTick(tick))}</div>`
          : ''}
        <div class="caveat">Live view only — a tick is done when collect says so.</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live-run-panel': LiveRunPanel;
  }
}
