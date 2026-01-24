import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/**
 * Preview/showcase page for ticks-styled components.
 *
 * @element ticks-preview
 */
@customElement('ticks-preview')
export class TicksPreview extends LitElement {
  @state() private dialogOpen = false;
  @state() private alertVisible = true;

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--crust, #11111b);
      color: var(--text, #cdd6f4);
      padding: 2rem;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
    }

    header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 3rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--surface, #313244);
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
    }

    section {
      margin-bottom: 3rem;
    }

    h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--green, #a6e3a1);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface, #313244);
    }

    h3 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext, #a6adc8);
      margin: 1.5rem 0 0.75rem 0;
    }

    .component-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .component-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      align-items: end;
    }

    @media (max-width: 768px) {
      .component-grid {
        grid-template-columns: 1fr;
      }
    }

    .code {
      background: var(--mantle, #181825);
      padding: 1rem;
      border-radius: 6px;
      font-family: var(--font-mono, 'Geist Mono', monospace);
      font-size: 0.8125rem;
      color: var(--subtext, #a6adc8);
      overflow-x: auto;
      margin-top: 0.5rem;
    }

    .demo-card {
      padding: 1rem;
    }

    .demo-card-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .demo-card-desc {
      font-size: 0.875rem;
      color: var(--subtext);
    }
  `;

  render() {
    return html`
      <div class="container">
        <header>
          <ticks-logo variant="logotype" .size=${32}></ticks-logo>
          <h1>Component Preview</h1>
        </header>

        <!-- Logo -->
        <section>
          <h2>Logo</h2>

          <h3>Logotype (ticks)</h3>
          <div class="component-row">
            <ticks-logo variant="logotype" .size=${24}></ticks-logo>
            <ticks-logo variant="logotype" .size=${32}></ticks-logo>
            <ticks-logo variant="logotype" .size=${48}></ticks-logo>
          </div>

          <h3>Icon (tk_)</h3>
          <div class="component-row">
            <ticks-logo variant="icon" .size=${24}></ticks-logo>
            <ticks-logo variant="icon" .size=${32}></ticks-logo>
            <ticks-logo variant="icon" .size=${48}></ticks-logo>
          </div>

          <div class="code">&lt;ticks-logo variant="logotype"&gt;&lt;/ticks-logo&gt;<br>&lt;ticks-logo variant="icon" href="/"&gt;&lt;/ticks-logo&gt;</div>
        </section>

        <!-- Buttons -->
        <section>
          <h2>Buttons</h2>

          <h3>Variants</h3>
          <div class="component-row">
            <ticks-button variant="primary">Primary</ticks-button>
            <ticks-button variant="secondary">Secondary</ticks-button>
            <ticks-button variant="danger">Danger</ticks-button>
            <ticks-button variant="ghost">Ghost</ticks-button>
          </div>

          <h3>Sizes</h3>
          <div class="component-row">
            <ticks-button size="small">Small</ticks-button>
            <ticks-button size="medium">Medium</ticks-button>
            <ticks-button size="large">Large</ticks-button>
          </div>

          <h3>States</h3>
          <div class="component-row">
            <ticks-button>Normal</ticks-button>
            <ticks-button disabled>Disabled</ticks-button>
          </div>

          <h3>Full Width</h3>
          <div style="max-width: 300px;">
            <ticks-button full>Full Width Button</ticks-button>
          </div>

          <div class="code">&lt;ticks-button variant="primary"&gt;Click me&lt;/ticks-button&gt;<br>&lt;ticks-button variant="danger" size="small"&gt;Delete&lt;/ticks-button&gt;</div>
        </section>

        <!-- Inputs -->
        <section>
          <h2>Inputs</h2>

          <h3>Basic</h3>
          <div class="component-grid">
            <ticks-input placeholder="Enter text..."></ticks-input>
            <ticks-input label="Email" type="email" placeholder="you@example.com"></ticks-input>
            <ticks-input label="Password" type="password" placeholder="••••••••"></ticks-input>
          </div>

          <h3>Sizes</h3>
          <div class="component-grid">
            <ticks-input size="small" placeholder="Small input"></ticks-input>
            <ticks-input size="medium" placeholder="Medium input"></ticks-input>
            <ticks-input size="large" placeholder="Large input"></ticks-input>
          </div>

          <h3>States</h3>
          <div class="component-grid">
            <ticks-input placeholder="Normal"></ticks-input>
            <ticks-input placeholder="Disabled" disabled></ticks-input>
            <ticks-input placeholder="Error state" error errorMessage="This field is required"></ticks-input>
          </div>

          <div class="code">&lt;ticks-input label="Email" type="email" placeholder="you@example.com"&gt;&lt;/ticks-input&gt;</div>
        </section>

        <!-- Badges -->
        <section>
          <h2>Badges</h2>

          <h3>Colors</h3>
          <div class="component-row">
            <ticks-badge variant="green">Online</ticks-badge>
            <ticks-badge variant="red">Error</ticks-badge>
            <ticks-badge variant="yellow">Warning</ticks-badge>
            <ticks-badge variant="blue">Info</ticks-badge>
            <ticks-badge variant="peach">In Progress</ticks-badge>
            <ticks-badge variant="mauve">Review</ticks-badge>
            <ticks-badge variant="neutral">Neutral</ticks-badge>
          </div>

          <h3>With Dot</h3>
          <div class="component-row">
            <ticks-badge variant="green" dot>Online</ticks-badge>
            <ticks-badge variant="red" dot>Offline</ticks-badge>
            <ticks-badge variant="yellow" dot>Idle</ticks-badge>
          </div>

          <h3>Pill Style</h3>
          <div class="component-row">
            <ticks-badge variant="green" pill>v1.2.3</ticks-badge>
            <ticks-badge variant="blue" pill>beta</ticks-badge>
            <ticks-badge variant="neutral" pill>12 items</ticks-badge>
          </div>

          <div class="code">&lt;ticks-badge variant="green" dot&gt;Online&lt;/ticks-badge&gt;</div>
        </section>

        <!-- Cards -->
        <section>
          <h2>Cards</h2>

          <h3>Basic</h3>
          <div class="component-grid">
            <ticks-card>
              <div class="demo-card">
                <div class="demo-card-title">Basic Card</div>
                <div class="demo-card-desc">Simple card with content.</div>
              </div>
            </ticks-card>
            <ticks-card bordered>
              <div class="demo-card">
                <div class="demo-card-title">Bordered Card</div>
                <div class="demo-card-desc">Card with border.</div>
              </div>
            </ticks-card>
            <ticks-card interactive>
              <div class="demo-card">
                <div class="demo-card-title">Interactive Card</div>
                <div class="demo-card-desc">Hover me!</div>
              </div>
            </ticks-card>
          </div>

          <h3>With Header & Footer</h3>
          <div style="max-width: 300px;">
            <ticks-card bordered>
              <span slot="header" style="font-weight: 600;">Card Title</span>
              <div class="demo-card-desc">Card content goes here. This card has a header and footer.</div>
              <div slot="footer">
                <ticks-button size="small">Action</ticks-button>
              </div>
            </ticks-card>
          </div>

          <div class="code">&lt;ticks-card interactive bordered&gt;<br>  &lt;span slot="header"&gt;Title&lt;/span&gt;<br>  Content here<br>&lt;/ticks-card&gt;</div>
        </section>

        <!-- Alerts -->
        <section>
          <h2>Alerts</h2>

          <h3>Variants</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 500px;">
            <ticks-alert variant="success">Your changes have been saved successfully.</ticks-alert>
            <ticks-alert variant="error">An error occurred while processing your request.</ticks-alert>
            <ticks-alert variant="warning">Your session will expire in 5 minutes.</ticks-alert>
            <ticks-alert variant="info">A new version is available for download.</ticks-alert>
          </div>

          <h3>Closable</h3>
          <div style="max-width: 500px;">
            ${this.alertVisible ? html`
              <ticks-alert variant="success" closable @close=${() => this.alertVisible = false}>
                Click the X to dismiss this alert.
              </ticks-alert>
            ` : html`
              <ticks-button size="small" @click=${() => this.alertVisible = true}>Show Alert</ticks-button>
            `}
          </div>

          <div class="code">&lt;ticks-alert variant="success" closable&gt;Message&lt;/ticks-alert&gt;</div>
        </section>

        <!-- Spinner -->
        <section>
          <h2>Spinner</h2>

          <h3>Sizes</h3>
          <div class="component-row">
            <ticks-spinner size="small"></ticks-spinner>
            <ticks-spinner size="medium"></ticks-spinner>
            <ticks-spinner size="large"></ticks-spinner>
          </div>

          <div class="code">&lt;ticks-spinner size="medium"&gt;&lt;/ticks-spinner&gt;</div>
        </section>

        <!-- Dialog -->
        <section>
          <h2>Dialog</h2>

          <div class="component-row">
            <ticks-button @click=${() => this.dialogOpen = true}>Open Dialog</ticks-button>
          </div>

          <ticks-dialog ?open=${this.dialogOpen} @close=${() => this.dialogOpen = false}>
            <span slot="title">Confirm Action</span>
            <p>Are you sure you want to proceed with this action? This cannot be undone.</p>
            <div slot="footer">
              <ticks-button variant="ghost" @click=${() => this.dialogOpen = false}>Cancel</ticks-button>
              <ticks-button variant="primary" @click=${() => this.dialogOpen = false}>Confirm</ticks-button>
            </div>
          </ticks-dialog>

          <div class="code">&lt;ticks-dialog ?open=\${open} @close=\${handleClose}&gt;<br>  &lt;span slot="title"&gt;Title&lt;/span&gt;<br>  Content<br>  &lt;div slot="footer"&gt;Buttons&lt;/div&gt;<br>&lt;/ticks-dialog&gt;</div>
        </section>

        <!-- Empty State -->
        <section>
          <h2>Empty State</h2>

          <h3>Default</h3>
          <div style="max-width: 400px;">
            <ticks-empty-state>
              <span slot="title">No boards yet</span>
              <span slot="description">Get started by creating your first board.</span>
              <ticks-button slot="action" size="small">Create Board</ticks-button>
            </ticks-empty-state>
          </div>

          <div class="code">&lt;ticks-empty-state&gt;<br>  &lt;span slot="title"&gt;No items&lt;/span&gt;<br>  &lt;span slot="description"&gt;Nothing here yet.&lt;/span&gt;<br>&lt;/ticks-empty-state&gt;</div>
        </section>

        <!-- List Item -->
        <section>
          <h2>List Item</h2>

          <h3>Basic</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 500px;">
            <ticks-list-item>
              <ticks-badge slot="status" variant="green" dot></ticks-badge>
              <span slot="title">my-project</span>
              <span slot="subtitle">Online &middot; Last sync 2m ago</span>
            </ticks-list-item>
            <ticks-list-item>
              <ticks-badge slot="status" variant="neutral" dot></ticks-badge>
              <span slot="title">another-board</span>
              <span slot="subtitle">Offline</span>
            </ticks-list-item>
          </div>

          <h3>Interactive with Actions</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 500px;">
            <ticks-list-item interactive>
              <ticks-badge slot="status" variant="green" dot></ticks-badge>
              <span slot="title">cli-token</span>
              <span slot="subtitle">Created Jan 15, 2025</span>
              <ticks-button slot="actions" size="small" variant="danger">Revoke</ticks-button>
            </ticks-list-item>
          </div>

          <div class="code">&lt;ticks-list-item interactive&gt;<br>  &lt;span slot="title"&gt;Item&lt;/span&gt;<br>  &lt;span slot="subtitle"&gt;Description&lt;/span&gt;<br>&lt;/ticks-list-item&gt;</div>
        </section>

        <!-- Header -->
        <section>
          <h2>Header</h2>

          <div style="border: 1px solid var(--surface); border-radius: 8px; overflow: hidden;">
            <ticks-header>
              <ticks-logo slot="logo" variant="logotype" .size=${24}></ticks-logo>
              <span slot="nav" style="color: var(--subtext); font-size: 0.875rem;">Documentation</span>
              <div slot="user" style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="color: var(--subtext); font-size: 0.875rem;">user@example.com</span>
                <ticks-button size="small" variant="ghost">Logout</ticks-button>
              </div>
            </ticks-header>
          </div>

          <div class="code">&lt;ticks-header sticky&gt;<br>  &lt;ticks-logo slot="logo"&gt;&lt;/ticks-logo&gt;<br>  &lt;span slot="user"&gt;User info&lt;/span&gt;<br>&lt;/ticks-header&gt;</div>
        </section>

        <!-- Code -->
        <section>
          <h2>Code</h2>

          <h3>Inline</h3>
          <p style="color: var(--text); font-size: 0.875rem;">
            Run <ticks-code>tk run --cloud</ticks-code> to connect your board.
          </p>

          <h3>Block</h3>
          <div style="max-width: 500px;">
            <ticks-code block>const board = await ticks.connect('my-board');
board.on('update', (data) => {
  console.log('Updated:', data);
});</ticks-code>
          </div>

          <h3>Block with Copy Button</h3>
          <div style="max-width: 500px;">
            <ticks-code block copyable>npm install @ticks/cli -g
tk login
tk run --cloud</ticks-code>
          </div>

          <div class="code">&lt;ticks-code block copyable&gt;code here&lt;/ticks-code&gt;</div>
        </section>

        <!-- Combined Example -->
        <section>
          <h2>Combined Example</h2>
          <div style="max-width: 400px;">
            <ticks-card bordered>
              <span slot="header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span style="font-weight: 600;">Create Board</span>
                <ticks-badge variant="green" pill>New</ticks-badge>
              </span>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <ticks-input label="Board Name" placeholder="my-project"></ticks-input>
                <ticks-input label="Description" placeholder="Optional description"></ticks-input>
              </div>
              <div slot="footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <ticks-button variant="ghost">Cancel</ticks-button>
                <ticks-button variant="primary">Create</ticks-button>
              </div>
            </ticks-card>
          </div>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ticks-preview': TicksPreview;
  }
}
