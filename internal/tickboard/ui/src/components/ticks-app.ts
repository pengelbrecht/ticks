import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

interface Board {
  id: string;
  name: string;
  machineId: string | null;
  lastSeenAt: number | null;
  createdAt: number;
  online: boolean;
}

interface Token {
  id: string;
  name: string;
  lastUsedAt: number | null;
  createdAt: number;
}

/**
 * Root component for the ticks.sh app (login/dashboard).
 * Handles authentication state and routing between auth and dashboard views.
 *
 * @element ticks-app
 */
type View = 'dashboard' | 'settings';

@customElement('ticks-app')
export class TicksApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--crust);
      color: var(--text);
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    /* Auth container */
    .auth-container {
      max-width: 400px;
      margin: 4rem auto;
      padding: 2rem;
    }

    .auth-tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--surface);
    }

    .auth-tab {
      padding: 0.75rem 0;
      background: none;
      border: none;
      color: var(--subtext);
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .auth-tab:hover {
      color: var(--text);
    }

    .auth-tab.active {
      color: var(--green);
      border-bottom-color: var(--green);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Dashboard */
    .dashboard {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .section {
      margin-bottom: 3rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
      margin: 0;
    }

    /* Board list */
    .board-list {
      display: grid;
      gap: 0.75rem;
    }

    /* Token list */
    .token-list {
      display: grid;
      gap: 0.75rem;
    }

    .new-token-display {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--mantle);
      border-radius: 8px;
      border: 1px solid var(--green);
    }

    .new-token-display p {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--subtext);
    }

    /* Alert */
    .auth-alert {
      margin-bottom: 1rem;
    }

    /* User info in header */
    .user-email {
      color: var(--subtext);
      font-size: 0.875rem;
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Refresh icon button */
    .icon-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      color: var(--subtext);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .icon-btn:hover {
      background: var(--surface);
      color: var(--text);
    }

    .icon-btn svg {
      width: 1rem;
      height: 1rem;
    }
  `;

  @state() private authState: AuthState = 'loading';
  @state() private authTab: 'login' | 'signup' = 'login';
  @state() private authError = '';
  @state() private userEmail = '';
  @state() private view: View = 'dashboard';
  @state() private boards: Board[] = [];
  @state() private tokens: Token[] = [];
  @state() private newToken = '';
  @state() private showCreateToken = false;
  @state() private confirmDialog: { open: boolean; title: string; message: string; action: (() => void) | null } = {
    open: false,
    title: '',
    message: '',
    action: null
  };

  private token = '';

  connectedCallback() {
    super.connectedCallback();
    this.token = localStorage.getItem('token') || '';
    this.userEmail = localStorage.getItem('userEmail') || '';

    if (this.token) {
      this.checkAuth();
    } else {
      this.authState = 'unauthenticated';
      this.updateUrl();
    }
  }

  private updateUrl() {
    const path = this.authState === 'authenticated' ? '/app' : '/login';
    if (window.location.pathname !== path) {
      history.replaceState(null, '', path);
    }
  }

  private async checkAuth() {
    try {
      const res = await fetch('/api/boards', {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (res.ok) {
        const data = await res.json();
        this.boards = data.boards || [];
        this.authState = 'authenticated';
        this.loadTokens();
      } else {
        this.clearAuth();
      }
    } catch (e) {
      console.error('Auth check failed:', e);
      this.clearAuth();
    }
    this.updateUrl();
  }

  private clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    this.token = '';
    this.userEmail = '';
    this.authState = 'unauthenticated';
  }

  private async loadBoards() {
    try {
      const res = await fetch('/api/boards', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.boards = data.boards || [];
      }
    } catch (e) {
      console.error('Failed to load boards:', e);
    }
  }

  private async loadTokens() {
    try {
      const res = await fetch('/api/tokens', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.tokens = data.tokens || [];
      }
    } catch (e) {
      console.error('Failed to load tokens:', e);
    }
  }

  private handleLoginKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = this.shadowRoot?.querySelector('#login-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  private handleSignupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = this.shadowRoot?.querySelector('#signup-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  private async handleLogin(e: Event) {
    e.preventDefault();
    // Query ticks-input components directly (shadow DOM doesn't participate in FormData)
    const emailInput = this.shadowRoot?.querySelector('ticks-input[name="email"]') as any;
    const passwordInput = this.shadowRoot?.querySelector('ticks-input[name="password"]') as any;
    const email = emailInput?.value || '';
    const password = passwordInput?.value || '';

    this.authError = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        this.authError = data.error || 'Login failed';
        return;
      }

      this.token = data.token;
      this.userEmail = email;
      localStorage.setItem('token', this.token);
      localStorage.setItem('userEmail', this.userEmail);
      this.authState = 'authenticated';
      this.updateUrl();
      this.loadBoards();
      this.loadTokens();
    } catch (e) {
      this.authError = 'Login failed. Please try again.';
    }
  }

  private async handleSignup(e: Event) {
    e.preventDefault();
    // Query ticks-input components directly (shadow DOM doesn't participate in FormData)
    const signupForm = this.shadowRoot?.querySelector('form:not(#login-form)');
    const emailInput = signupForm?.querySelector('ticks-input[name="email"]') as any;
    const passwordInput = signupForm?.querySelector('ticks-input[name="password"]') as any;
    const confirmInput = signupForm?.querySelector('ticks-input[name="confirm"]') as any;
    const email = emailInput?.value || '';
    const password = passwordInput?.value || '';
    const confirm = confirmInput?.value || '';

    this.authError = '';

    if (password !== confirm) {
      this.authError = 'Passwords do not match';
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        this.authError = data.error || 'Signup failed';
        return;
      }

      // Auto-login after signup - set values and submit
      this.authTab = 'login';
      await this.updateComplete;
      const loginEmailInput = this.shadowRoot?.querySelector('#login-form ticks-input[name="email"]') as any;
      const loginPasswordInput = this.shadowRoot?.querySelector('#login-form ticks-input[name="password"]') as any;
      if (loginEmailInput) loginEmailInput.value = email;
      if (loginPasswordInput) loginPasswordInput.value = password;
      const loginForm = this.shadowRoot?.querySelector('#login-form') as HTMLFormElement;
      if (loginForm) loginForm.requestSubmit();
    } catch (e) {
      this.authError = 'Signup failed. Please try again.';
    }
  }

  private handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' });
    this.clearAuth();
    this.updateUrl();
  }

  private openBoard(name: string, online: boolean) {
    if (!online) {
      this.showAlert('Board Offline', 'This board is offline. Start it with: tk run --cloud');
      return;
    }
    window.location.href = `/p/${encodeURIComponent(name)}/`;
  }

  private showAlert(title: string, message: string) {
    this.confirmDialog = {
      open: true,
      title,
      message,
      action: null // No action for alerts, just informational
    };
  }

  private async createToken() {
    const input = this.shadowRoot?.querySelector('#new-token-name') as any;
    const value = (input?.value || '').trim();

    if (!value) return;

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({ name: value })
      });

      const data = await res.json();

      if (res.ok) {
        this.newToken = data.token;
        this.showCreateToken = false;
        this.loadTokens();
      }
    } catch (e) {
      console.error('Failed to create token:', e);
    }
  }

  private revokeToken(tokenId: string) {
    this.confirmDialog = {
      open: true,
      title: 'Revoke Token',
      message: 'Are you sure you want to revoke this token? Any clients using it will be disconnected.',
      action: async () => {
        try {
          await fetch(`/api/tokens/${tokenId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${this.token}` }
          });
          this.loadTokens();
        } catch (e) {
          console.error('Failed to revoke token:', e);
        }
      }
    };
  }

  private removeBoard(boardId: string, boardName: string) {
    const displayName = boardName.replace(/--/g, '/');
    this.confirmDialog = {
      open: true,
      title: 'Remove Board',
      message: `Remove "${displayName}" from your dashboard? The board can reconnect later.`,
      action: async () => {
        try {
          const res = await fetch(`/api/boards/${boardId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${this.token}` }
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to remove board');
          }
          this.loadBoards();
        } catch (e) {
          console.error('Failed to remove board:', e);
        }
      }
    };
  }

  private closeConfirmDialog() {
    this.confirmDialog = { ...this.confirmDialog, open: false };
  }

  private async confirmDialogAction() {
    if (this.confirmDialog.action) {
      await this.confirmDialog.action();
    }
    this.closeConfirmDialog();
  }

  private formatDate(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString();
  }

  render() {
    if (this.authState === 'loading') {
      return html`
        <div class="loading">
          <ticks-spinner size="large"></ticks-spinner>
        </div>
      `;
    }

    if (this.authState === 'unauthenticated') {
      return this.renderAuth();
    }

    if (this.view === 'settings') {
      return this.renderSettings();
    }

    return this.renderDashboard();
  }

  private renderAuth() {
    return html`
      <ticks-header>
        <a href="/" slot="logo" style="text-decoration: none;">
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
        </a>
      </ticks-header>

      <div class="auth-container">
        <div class="auth-tabs">
          <button
            class="auth-tab ${this.authTab === 'login' ? 'active' : ''}"
            @click=${() => this.authTab = 'login'}
          >
            Login
          </button>
          <button
            class="auth-tab ${this.authTab === 'signup' ? 'active' : ''}"
            @click=${() => this.authTab = 'signup'}
          >
            Sign Up
          </button>
        </div>

        ${this.authError ? html`
          <div class="auth-alert">
            <ticks-alert variant="error">${this.authError}</ticks-alert>
          </div>
        ` : ''}

        ${this.authTab === 'login' ? html`
          <form id="login-form" class="auth-form" @submit=${this.handleLogin} @keydown=${this.handleLoginKeydown}>
            <ticks-input name="email" type="email" placeholder="Email" required></ticks-input>
            <ticks-input name="password" type="password" placeholder="Password" required></ticks-input>
            <ticks-button type="submit" variant="primary" full>Login</ticks-button>
          </form>
        ` : html`
          <form id="signup-form" class="auth-form" @submit=${this.handleSignup} @keydown=${this.handleSignupKeydown}>
            <ticks-input name="email" type="email" placeholder="Email" required></ticks-input>
            <ticks-input name="password" type="password" placeholder="Password (min 8 chars)" required minlength="8"></ticks-input>
            <ticks-input name="confirm" type="password" placeholder="Confirm Password" required minlength="8"></ticks-input>
            <ticks-button type="submit" variant="primary" full>Sign Up</ticks-button>
          </form>
        `}
      </div>
    `;
  }

  private renderDashboard() {
    const onlineBoards = this.boards.filter(b => b.online);

    return html`
      <ticks-header>
        <a href="/" slot="logo" style="text-decoration: none;">
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
        </a>
        <div slot="user" class="user-actions">
          <span class="user-email">${this.userEmail}</span>
          <ticks-button size="small" variant="ghost" @click=${() => this.view = 'settings'}>Settings</ticks-button>
          <ticks-button size="small" variant="ghost" @click=${this.handleLogout}>Logout</ticks-button>
        </div>
      </ticks-header>

      <div class="dashboard">
        <section class="section">
          <div class="section-header">
            <h2>Your Boards</h2>
            <button class="icon-btn" @click=${this.loadBoards} aria-label="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
          ${onlineBoards.length === 0 ? html`
            <ticks-empty-state>
              <span slot="title">No boards online</span>
              <span slot="description">Run <ticks-code>tk run --cloud</ticks-code> to connect a board.</span>
            </ticks-empty-state>
          ` : html`
            <div class="board-list">
              ${onlineBoards.map(board => html`
                <ticks-list-item interactive @click=${() => this.openBoard(board.name, board.online)}>
                  <ticks-badge slot="status" variant="green" dot></ticks-badge>
                  <span slot="title">${board.name.replace(/--/g, '/')}</span>
                  <span slot="subtitle">Online</span>
                </ticks-list-item>
              `)}
            </div>
          `}
        </section>
      </div>

      ${this.renderDialogs()}
    `;
  }

  private renderSettings() {
    return html`
      <ticks-header>
        <a href="/" slot="logo" style="text-decoration: none;">
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
        </a>
        <div slot="user" class="user-actions">
          <span class="user-email">${this.userEmail}</span>
          <ticks-button size="small" variant="ghost" @click=${() => this.view = 'dashboard'}>Back</ticks-button>
          <ticks-button size="small" variant="ghost" @click=${this.handleLogout}>Logout</ticks-button>
        </div>
      </ticks-header>

      <div class="dashboard">
        <section class="section">
          <div class="section-header">
            <h2>Settings</h2>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <h2>API Tokens</h2>
            <ticks-button size="small" @click=${() => this.showCreateToken = true}>New Token</ticks-button>
          </div>

          ${this.newToken ? html`
            <div class="new-token-display">
              <p>Copy this token now. You won't be able to see it again!</p>
              <ticks-code block copyable>${this.newToken}</ticks-code>
              <div style="margin-top: 0.75rem;">
                <ticks-button size="small" variant="ghost" @click=${() => this.newToken = ''}>Dismiss</ticks-button>
              </div>
            </div>
          ` : ''}

          ${this.tokens.length === 0 ? html`
            <ticks-empty-state>
              <span slot="title">No API tokens yet</span>
              <span slot="description">Create one to use with the CLI.</span>
              <ticks-button slot="action" size="small" @click=${() => this.showCreateToken = true}>Create Token</ticks-button>
            </ticks-empty-state>
          ` : html`
            <div class="token-list">
              ${this.tokens.map(token => html`
                <ticks-list-item>
                  <span slot="title">${token.name}</span>
                  <span slot="subtitle">
                    Created ${this.formatDate(token.createdAt)}
                    ${token.lastUsedAt ? ` · Last used ${this.formatDate(token.lastUsedAt)}` : ''}
                  </span>
                  <ticks-button slot="actions" size="small" variant="danger" @click=${() => this.revokeToken(token.id)}>
                    Revoke
                  </ticks-button>
                </ticks-list-item>
              `)}
            </div>
          `}
        </section>
      </div>

      ${this.renderDialogs()}
    `;
  }

  private renderDialogs() {
    return html`
      <ticks-dialog ?open=${this.showCreateToken} @close=${() => this.showCreateToken = false}>
        <span slot="title">Create API Token</span>
        <ticks-input id="new-token-name" placeholder="Token name (e.g., macbook, server)"></ticks-input>
        <div slot="footer">
          <ticks-button variant="ghost" @click=${() => this.showCreateToken = false}>Cancel</ticks-button>
          <ticks-button variant="primary" @click=${this.createToken}>Create</ticks-button>
        </div>
      </ticks-dialog>

      <ticks-dialog ?open=${this.confirmDialog.open} @close=${this.closeConfirmDialog}>
        <span slot="title">${this.confirmDialog.title}</span>
        <p>${this.confirmDialog.message}</p>
        <div slot="footer">
          ${this.confirmDialog.action ? html`
            <ticks-button variant="ghost" @click=${this.closeConfirmDialog}>Cancel</ticks-button>
            <ticks-button variant="danger" @click=${this.confirmDialogAction}>Confirm</ticks-button>
          ` : html`
            <ticks-button variant="primary" @click=${this.closeConfirmDialog}>OK</ticks-button>
          `}
        </div>
      </ticks-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-app': TicksApp;
  }
}
