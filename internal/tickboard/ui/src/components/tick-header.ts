import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './ticks-logo.js';
import './ticks-button.js';

/** Epic info structure from the API */
export interface EpicInfo {
  id: string;
  title: string;
}

/**
 * Header component with search, epic filter, activity feed, and create button.
 *
 * @element tick-header
 * @fires search-change - Fired when search input changes (debounced 300ms), with `{ value: string }`
 * @fires epic-filter-change - Fired when epic filter selection changes, with `{ value: string }`
 * @fires create-click - Fired when the create button is clicked
 * @fires menu-toggle - Fired when the mobile menu button is clicked
 * @fires activity-click - Bubbled from tick-activity-feed when an activity item is clicked
 *
 * @prop {string} repoName - Repository name to display in header badge
 * @prop {EpicInfo[]} epics - List of epics for the filter dropdown
 * @prop {string} selectedEpic - Currently selected epic ID
 * @prop {string} searchTerm - Current search input value
 */
@customElement('tick-header')
export class TickHeader extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background-color: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left ticks-logo {
      display: flex;
      align-items: center;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
    }

    .readonly-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      background: var(--yellow);
      color: var(--base);
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .readonly-badge sl-icon {
      font-size: 0.85rem;
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      max-width: 600px;
    }

    .header-center sl-input {
      flex: 1;
      max-width: 250px;
    }

    .header-center sl-select {
      min-width: 220px;
    }

    .epic-id {
      font-family: monospace;
      font-size: 0.85em;
      opacity: 0.7;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile menu button */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .menu-toggle:hover {
      background: var(--surface1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-center {
        display: none;
      }

      .menu-toggle {
        display: block;
      }
    }

    @media (max-width: 480px) {
      header {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .repo-badge {
        display: none;
      }

      .header-left ticks-logo {
        --logo-size: 20px;
      }

      /* Make buttons larger for touch */
      .header-right sl-button::part(base) {
        min-width: 44px;
        min-height: 44px;
      }

      .menu-toggle {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    /* Style run panel button with green tones */
    .header-right sl-button::part(base) {
      color: var(--subtext0);
    }

    .header-right sl-button::part(base):hover {
      color: var(--green, #a6e3a1);
      background: var(--surface0);
    }

    .header-right sl-button[variant="primary"]::part(base) {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    .header-right sl-button[variant="primary"]::part(base):hover {
      background: #b8e8b3;
    }

    /* Pulsing animation for active run indicator */
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 4px var(--green, #a6e3a1);
      }
      50% {
        box-shadow: 0 0 12px var(--green, #a6e3a1), 0 0 20px var(--green, #a6e3a1);
      }
    }

    .run-button-active::part(base) {
      background: var(--green, #a6e3a1) !important;
      color: var(--crust, #11111b) !important;
      animation: pulse-glow 1.5s ease-in-out infinite;
    }
  `;

  @property({ type: String, attribute: 'repo-name' })
  repoName = '';

  @property({ attribute: false })
  epics: EpicInfo[] = [];

  @property({ type: String, attribute: 'selected-epic' })
  selectedEpic = '';

  @property({ type: String, attribute: 'search-term' })
  searchTerm = '';

  @property({ type: Boolean, attribute: 'run-panel-open' })
  runPanelOpen = false;

  @property({ type: Boolean, attribute: 'run-active' })
  runActive = false;

  @property({ type: Boolean, attribute: 'readonly-mode' })
  readonlyMode = false;

  @state()
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  private handleSearchInput(e: CustomEvent) {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    // Debounce search input
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent('search-change', {
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );
    }, 300);
  }

  private handleEpicFilterChange(e: CustomEvent) {
    const select = e.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('epic-filter-change', {
        detail: { value: select.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleCreateClick() {
    this.dispatchEvent(
      new CustomEvent('create-click', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleMenuToggle() {
    this.dispatchEvent(
      new CustomEvent('menu-toggle', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleActivityClick(e: CustomEvent<{ tickId: string }>) {
    // Re-dispatch the event so tick-board can handle it
    this.dispatchEvent(
      new CustomEvent('activity-click', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleRunPanelToggle() {
    this.dispatchEvent(
      new CustomEvent('run-panel-toggle', {
        bubbles: true,
        composed: true,
      })
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }

  render() {
    return html`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
          ${this.repoName
            ? html`<span class="repo-badge">${this.repoName}</span>`
            : null}
          ${this.readonlyMode
            ? html`
              <sl-tooltip content="Local tk client is not connected. Actions will not sync back to tick files.">
                <span class="readonly-badge">
                  <sl-icon name="eye"></sl-icon>
                  Read-only
                </span>
              </sl-tooltip>
            `
            : null}
        </div>

        <div class="header-center">
          <sl-input
            placeholder="Search by ID or title..."
            size="small"
            clearable
            .value=${this.searchTerm}
            @sl-input=${this.handleSearchInput}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          <sl-select
            placeholder="All Ticks"
            size="small"
            clearable
            .value=${this.selectedEpic}
            @sl-change=${this.handleEpicFilterChange}
          >
            ${this.epics.map(
              epic => html`
                <sl-option value=${epic.id}>
                  <span class="epic-id">${epic.id}</span> - ${epic.title}
                </sl-option>
              `
            )}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Live run panel (r)">
            <sl-button
              class=${this.runActive ? 'run-button-active' : ''}
              variant=${this.runPanelOpen ? 'primary' : 'default'}
              size="small"
              @click=${this.handleRunPanelToggle}
            >
              <sl-icon name="terminal"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Activity feed">
            <tick-activity-feed
              @activity-click=${this.handleActivityClick}
            ></tick-activity-feed>
          </sl-tooltip>

          <sl-tooltip content="Create new tick (n)">
            <ticks-button
              variant="primary"
              size="small"
              @click=${this.handleCreateClick}
            >
              <sl-icon name="plus-lg"></sl-icon>
            </ticks-button>
          </sl-tooltip>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-header': TickHeader;
  }
}
