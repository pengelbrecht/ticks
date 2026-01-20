import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import type SlDropdown from '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import { fetchActivity, type Activity } from '../api/ticks.js';

/**
 * Activity feed dropdown component.
 * Shows recent activity in a dropdown menu with bell icon trigger.
 * Polls for updates every 30s and listens for SSE activity events.
 */
@customElement('tick-activity-feed')
export class TickActivityFeed extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    /* Constrain the dropdown panel width - full width on mobile */
    sl-dropdown::part(panel) {
      width: 360px;
      max-width: calc(100vw - 1rem);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid var(--surface1);
      background: var(--mantle);
    }

    @media (max-width: 480px) {
      sl-dropdown::part(panel) {
        width: calc(100vw - 1rem);
        max-width: none;
        left: 0.5rem !important;
        right: 0.5rem;
      }
    }

    .trigger-button {
      position: relative;
    }

    .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      background: var(--red);
      color: var(--base);
      font-size: 0.625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    sl-menu {
      width: 100%;
      max-height: 400px;
      overflow-y: auto;
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
      font-weight: 600;
      color: var(--text);
    }

    .menu-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .menu-header sl-button::part(base) {
      font-size: 0.75rem;
    }

    .close-button::part(base) {
      padding: 0.25rem;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .loading-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .activity-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid var(--surface0);
    }

    .activity-item:hover {
      background: var(--surface0);
    }

    .activity-item.unread {
      background: color-mix(in srgb, var(--blue) 10%, transparent);
    }

    .activity-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }

    .activity-icon.create { background: var(--green); color: var(--base); }
    .activity-icon.update { background: var(--blue); color: var(--base); }
    .activity-icon.close { background: var(--overlay1); color: var(--text); }
    .activity-icon.reopen { background: var(--yellow); color: var(--base); }
    .activity-icon.note { background: var(--lavender); color: var(--base); }
    .activity-icon.approve { background: var(--green); color: var(--base); }
    .activity-icon.reject { background: var(--red); color: var(--base); }
    .activity-icon.assign { background: var(--mauve); color: var(--base); }
    .activity-icon.awaiting { background: var(--yellow); color: var(--base); }
    .activity-icon.block { background: var(--red); color: var(--base); }
    .activity-icon.unblock { background: var(--green); color: var(--base); }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      font-size: 0.875rem;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-title .tick-id {
      color: var(--blue);
      font-family: monospace;
      font-weight: 500;
    }

    .activity-description {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-top: 0.125rem;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay1);
      margin-top: 0.25rem;
    }

    sl-menu-item::part(base) {
      padding: 0;
    }

    sl-menu-item::part(checked-icon),
    sl-menu-item::part(prefix),
    sl-menu-item::part(suffix) {
      display: none;
    }

    sl-menu-item::part(label) {
      width: 100%;
    }
  `;

  @query('sl-dropdown') private dropdown!: SlDropdown;

  @state() private activities: Activity[] = [];
  @state() private loading = true;
  @state() private unreadCount = 0;
  @state() private lastSeenTimestamp: string | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private sseListener: ((event: Event) => void) | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadLastSeenTimestamp();
    this.loadActivities();
    this.startPolling();
    this.listenForSSE();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
    this.stopSSEListener();
  }

  private loadLastSeenTimestamp() {
    try {
      this.lastSeenTimestamp = localStorage.getItem('activity-last-seen');
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveLastSeenTimestamp() {
    if (this.activities.length > 0) {
      const latest = this.activities[0].ts;
      try {
        localStorage.setItem('activity-last-seen', latest);
        this.lastSeenTimestamp = latest;
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  private async loadActivities() {
    try {
      this.activities = await fetchActivity(20);
      this.updateUnreadCount();
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      this.loading = false;
    }
  }

  private updateUnreadCount() {
    if (!this.lastSeenTimestamp) {
      this.unreadCount = this.activities.length;
      return;
    }
    this.unreadCount = this.activities.filter(
      a => a.ts > this.lastSeenTimestamp!
    ).length;
  }

  private startPolling() {
    this.pollInterval = setInterval(() => {
      this.loadActivities();
    }, 30000); // Poll every 30 seconds
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private listenForSSE() {
    // Listen for custom event dispatched by tick-board when SSE activity update arrives
    this.sseListener = () => {
      this.loadActivities();
    };
    window.addEventListener('activity-update', this.sseListener);
  }

  private stopSSEListener() {
    if (this.sseListener) {
      window.removeEventListener('activity-update', this.sseListener);
      this.sseListener = null;
    }
  }

  private handleDropdownShow() {
    // Mark all as read when dropdown opens
    this.saveLastSeenTimestamp();
    this.unreadCount = 0;

    // Add escape key listener
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  private handleDropdownHide() {
    // Remove escape key listener
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  private closeDropdown() {
    this.dropdown?.hide();
  }

  private handleActivityClick(activity: Activity) {
    // Dispatch event to open the tick
    this.dispatchEvent(
      new CustomEvent('activity-click', {
        detail: { tickId: activity.tick },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      create: '+',
      update: '~',
      close: '×',
      reopen: '↺',
      note: '✎',
      approve: '✓',
      reject: '✗',
      assign: '→',
      awaiting: '⏳',
      block: '⊘',
      unblock: '⊙',
    };
    return icons[action] || '•';
  }

  private getActionDescription(activity: Activity): string {
    const action = activity.action;
    const actor = activity.actor;
    const data = activity.data || {};

    switch (action) {
      case 'create':
        return `${actor} created this tick`;
      case 'update':
        return `${actor} updated this tick`;
      case 'close':
        return data.reason
          ? `${actor} closed: ${data.reason}`
          : `${actor} closed this tick`;
      case 'reopen':
        return `${actor} reopened this tick`;
      case 'note':
        return `${actor} added a note`;
      case 'approve':
        return `${actor} approved this tick`;
      case 'reject':
        return `${actor} rejected this tick`;
      case 'assign':
        return `${actor} assigned to ${data.to || 'someone'}`;
      case 'awaiting':
        return `Waiting for ${data.awaiting || 'human action'}`;
      case 'block':
        return `${actor} added a blocker`;
      case 'unblock':
        return `${actor} removed a blocker`;
      default:
        return `${actor} performed ${action}`;
    }
  }

  private formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  private isUnread(activity: Activity): boolean {
    if (!this.lastSeenTimestamp) return true;
    return activity.ts > this.lastSeenTimestamp;
  }

  render() {
    return html`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount > 0
            ? html`<span class="unread-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</span>`
            : nothing}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length > 0
                ? html`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `
                : nothing}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading
            ? html`<div class="loading-state">Loading...</div>`
            : this.activities.length === 0
              ? html`<div class="empty-state">No recent activity</div>`
              : this.activities.map(
                  activity => html`
                    <sl-menu-item @click=${() => this.handleActivityClick(activity)}>
                      <div class="activity-item ${this.isUnread(activity) ? 'unread' : ''}">
                        <div class="activity-icon ${activity.action}">
                          ${this.getActionIcon(activity.action)}
                        </div>
                        <div class="activity-content">
                          <div class="activity-title">
                            <span class="tick-id">${activity.tick}</span>
                          </div>
                          <div class="activity-description">
                            ${this.getActionDescription(activity)}
                          </div>
                          <div class="activity-time">
                            ${this.formatRelativeTime(activity.ts)}
                          </div>
                        </div>
                      </div>
                    </sl-menu-item>
                  `
                )}
        </sl-menu>
      </sl-dropdown>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-activity-feed': TickActivityFeed;
  }
}
