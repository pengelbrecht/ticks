# Tickboard UI

A Kanban-style board for managing ticks (issues), built with [Lit](https://lit.dev/) web components and [Shoelace](https://shoelace.style/) UI library.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9+ (install via `corepack enable`)

### Installation

```bash
cd internal/tickboard/ui
pnpm install
```

### Development Server

```bash
pnpm dev
```

This starts the Vite dev server with hot module replacement. The UI expects the Go backend to be running at `http://localhost:8080` for API calls.

To run the full stack:

```bash
# Terminal 1: Start the Go server
go build ./cmd/tk && ./tk board

# Terminal 2: Start the UI dev server (optional, for HMR)
cd internal/tickboard/ui && pnpm dev
```

### Production Build

```bash
pnpm build
```

This builds the UI to `../server/static/` which is embedded into the Go binary.

## Architecture

### Component Hierarchy

```
tick-board (root)
├── tick-header
│   ├── Search input
│   ├── Epic filter
│   ├── Create button
│   └── tick-activity-feed
├── tick-toast-stack (notifications)
├── tick-column (×5: blocked, ready, agent, human, done)
│   └── tick-card (×N per column)
├── tick-detail-drawer (slide-out panel)
└── tick-create-dialog (modal)
```

### Directory Structure

```
ui/
├── src/
│   ├── main.ts              # Entry point, Shoelace registration
│   ├── api/
│   │   └── ticks.ts         # API client functions
│   ├── types/
│   │   └── tick.ts          # TypeScript interfaces
│   ├── contexts/
│   │   └── board-context.ts # Lit Context for shared state
│   ├── components/
│   │   ├── tick-board.ts    # Root component, data fetching
│   │   ├── tick-header.ts   # Header with search/filters
│   │   ├── tick-column.ts   # Kanban column
│   │   ├── tick-card.ts     # Individual tick card
│   │   ├── tick-detail-drawer.ts  # Tick details panel
│   │   ├── tick-create-dialog.ts  # Create tick modal
│   │   ├── tick-activity-feed.ts  # Activity dropdown
│   │   └── tick-toast-stack.ts    # Toast notifications
│   └── styles/
│       ├── catppuccin.css   # Color palette variables
│       └── shoelace-theme.css # Shoelace overrides
├── public/                   # Static assets (icons, manifest)
├── index.html                # HTML entry point
├── vite.config.ts            # Vite build configuration
├── tsconfig.json             # TypeScript config
└── package.json
```

### State Management

The app uses [Lit Context](https://lit.dev/docs/data/context/) for sharing state between components:

```typescript
// board-context.ts
export interface BoardState {
  ticks: BoardTick[];      // All ticks
  epics: Epic[];           // Epic list for filtering
  selectedEpic: string;    // Current epic filter
  searchTerm: string;      // Search filter
  activeColumn: TickColumn; // Active tab (mobile)
  isMobile: boolean;       // Viewport state
}
```

The `tick-board` component provides context to all child components. Children consume context using `@consume({ context: boardContext })`.

### Real-time Updates

The board connects to `/api/events` (Server-Sent Events) for real-time updates:

- Tick create/update/delete events trigger automatic refresh
- Activity events update the activity feed
- Exponential backoff handles reconnection on errors

## Adding New Components

### 1. Create the Component File

```typescript
// src/components/tick-example.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { boardContext, type BoardState } from '../contexts/board-context.js';

/**
 * Example component demonstrating the standard pattern.
 *
 * @element tick-example
 * @fires example-action - Fired when an action occurs
 */
@customElement('tick-example')
export class TickExample extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  /** Consume board state from parent */
  @consume({ context: boardContext, subscribe: true })
  @state()
  boardState!: BoardState;

  /** Public property with attribute reflection */
  @property({ type: String, attribute: 'item-id' })
  itemId = '';

  /** Private reactive state */
  @state()
  private isLoading = false;

  render() {
    return html`
      <div>
        <sl-button @click=${this.handleClick}>Action</sl-button>
      </div>
    `;
  }

  private handleClick() {
    this.dispatchEvent(new CustomEvent('example-action', {
      bubbles: true,
      composed: true,
      detail: { id: this.itemId }
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tick-example': TickExample;
  }
}
```

### 2. Register in main.ts

```typescript
import './components/tick-example.js';
```

### 3. Use in Parent Component

```html
<tick-example
  item-id=${this.selectedId}
  @example-action=${this.handleExampleAction}
></tick-example>
```

## Theming

### Catppuccin Mocha Palette

The UI uses [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) colors. Key variables:

| Variable | Color | Usage |
|----------|-------|-------|
| `--blue` | #89b4fa | Primary actions, links |
| `--green` | #a6e3a1 | Success, done column |
| `--yellow` | #f9e2af | Warning, human column |
| `--red` | #f38ba8 | Danger, blocked column |
| `--peach` | #fab387 | In-progress column |
| `--text` | #cdd6f4 | Primary text |
| `--base` | #1e1e2e | Background |
| `--surface0` | #313244 | Elevated surfaces |

### Customizing Shoelace

Shoelace design tokens are mapped to Catppuccin in `shoelace-theme.css`:

```css
:root {
  --sl-color-primary-500: var(--blue);
  --sl-color-success-500: var(--green);
  --sl-color-warning-500: var(--yellow);
  --sl-color-danger-500: var(--red);
}
```

To add new color mappings, modify `shoelace-theme.css` and reference variables from `catppuccin.css`.

## Shoelace Components Used

Components are cherry-picked in `main.ts` for tree-shaking (smaller bundles):

| Component | Usage |
|-----------|-------|
| `sl-button` | Actions, form submission |
| `sl-input` | Search, text fields |
| `sl-select` / `sl-option` | Epic filter, dropdowns |
| `sl-drawer` | Detail panel, mobile filters |
| `sl-dialog` | Create tick modal, keyboard help |
| `sl-badge` | Status indicators |
| `sl-alert` | Error/warning messages |
| `sl-textarea` | Multi-line input |
| `sl-dropdown` / `sl-menu` / `sl-menu-item` | Activity feed |
| `sl-icon` | Icons throughout |
| `sl-divider` | Visual separators |
| `sl-tooltip` | Contextual help |
| `sl-checkbox` | Form inputs |
| `sl-tab-group` / `sl-tab` / `sl-tab-panel` | Mobile navigation |

To add a new Shoelace component:

```typescript
// main.ts
import '@shoelace-style/shoelace/dist/components/new-component/new-component.js';
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down in column |
| `k` / `↑` | Move up in column |
| `h` / `←` | Previous column |
| `l` / `→` | Next column |
| `Enter` | Open selected tick |
| `Esc` | Close drawer/dialog |
| `n` | Create new tick |
| `/` | Focus search |
| `?` | Show keyboard help |

## PWA Support

The app includes a service worker (`public/sw.js`) for offline support:

- Caches static assets on install
- Serves cached assets when offline
- Shows update notification when new version available

## Build Output

Production build creates:

```
../server/static/
├── assets/
│   ├── app-[hash].js   # JS bundle (~346KB, 77.5KB gzipped)
│   └── app-[hash].css  # CSS bundle (~24KB, 5KB gzipped)
├── shoelace/icons/     # Shoelace icon SVGs
├── index.html
├── manifest.json
├── sw.js
└── *.png               # App icons
```

The Go server embeds these files via `//go:embed static/*`.

## Performance

### Bundle Size (as of 2026-01-20)

| Asset | Raw Size | Gzipped | Notes |
|-------|----------|---------|-------|
| JavaScript | 346 KB | 75.7 KB | Lit + Shoelace components |
| CSS | 24 KB | 4.8 KB | Shoelace theme + custom styles |
| **Total** | **370 KB** | **80.5 KB** | |

**Budget Status:** Currently 10.5 KB over the 70 KB gzipped budget (~15% over).

### Bundle Breakdown (estimated)

| Library | Estimated Size (gzipped) |
|---------|--------------------------|
| Lit runtime | ~5 KB |
| Shoelace components (19) | ~55 KB |
| App code | ~15 KB |
| CSS styles | ~5 KB |

### Build Performance

- **Build time:** ~1.6 seconds (Vite + TypeScript)
- **Modules transformed:** 175

### Lighthouse Notes

Lighthouse testing requires manual browser execution. Target scores:
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90

### Optimization Opportunities

To reduce bundle size toward the 70 KB target:

1. **Review Shoelace components** - Currently 19 components imported. Consider:
   - Remove unused components
   - Use native elements where Shoelace adds minimal value
   - `sl-tooltip` could be replaced with CSS-only tooltips

2. **Lazy-load icons** - Shoelace icons are loaded on-demand but could benefit from fewer icon variations

3. **Code splitting** - Split detail drawer and create dialog into lazy chunks

4. **Tree-shaking audit** - Run `rollup-plugin-visualizer` to identify bundled but unused code:
   ```bash
   pnpm add -D rollup-plugin-visualizer
   # Add to vite.config.ts and run pnpm build
   ```

## API Endpoints

The UI communicates with these Go backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ticks` | GET | List ticks with filters |
| `/api/ticks/:id` | GET | Get single tick |
| `/api/ticks` | POST | Create tick |
| `/api/ticks/:id` | PATCH | Update tick |
| `/api/ticks/:id/approve` | POST | Approve awaiting tick |
| `/api/ticks/:id/reject` | POST | Reject awaiting tick |
| `/api/ticks/:id/note` | POST | Add note to tick |
| `/api/ticks/:id/close` | POST | Close tick |
| `/api/ticks/:id/reopen` | POST | Reopen tick |
| `/api/events` | GET (SSE) | Real-time updates |
| `/api/info` | GET | Repo name, epics |
| `/api/activity` | GET | Recent activity feed |
