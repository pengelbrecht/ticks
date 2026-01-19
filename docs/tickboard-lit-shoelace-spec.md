# Tick Board: Lit + Shoelace Migration Spec

## Overview

Migrate the tk board web interface from vanilla HTML/CSS/JS to Lit web components with Shoelace UI components. This provides a modern component architecture while keeping the build simple and bundle size small.

## Goals

1. **Maintainability**: Replace 500+ lines of HTML and 2500+ lines of CSS with composable components
2. **Lightweight**: Target ~50-60KB gzipped total (Lit ~5KB + Shoelace components ~40-50KB)
3. **No runtime dependencies for users**: All assets compiled at release time, embedded in Go binary
4. **Preserve existing UX**: Keep Catppuccin Mocha theme, responsive behavior, and all features
5. **Progressive enhancement**: Components work without JS for basic content display

## Technology Stack

| Library | Version | Size | Purpose |
|---------|---------|------|---------|
| Lit | 3.x | ~5KB | Web component base |
| Shoelace | 2.x | ~40KB (cherry-picked) | UI components |
| Vite | 5.x | dev only | Build tooling |

## Build Pipeline

```
Development:
  src/
    components/     → Lit components (.ts)
    styles/         → CSS (Catppuccin tokens)
    index.html      → Entry point
        ↓
  npm run dev       → Vite dev server with HMR
        ↓
  npm run build     → dist/
                        ├── index.html
                        ├── assets/
                        │   ├── app-[hash].js
                        │   └── app-[hash].css
                        └── shoelace/
                            └── icons/

Release:
  dist/             → go:embed into server/static/
        ↓
  tk board          → serves embedded assets
```

## Component Architecture

### Custom Elements

```
tick-board (root)
├── tick-header
│   ├── sl-input (search)
│   ├── sl-select (epic filter)
│   └── sl-button (create)
├── tick-column (×5)
│   ├── column header
│   └── tick-card (×n)
├── tick-detail-drawer
│   ├── sl-drawer
│   ├── detail fields
│   ├── sl-textarea (notes)
│   └── action buttons
├── tick-create-dialog
│   └── sl-dialog with form
└── tick-toast-stack
    └── sl-alert (×n)
```

### Component Breakdown

#### `<tick-board>`
Root component managing global state and layout.

```typescript
@customElement('tick-board')
export class TickBoard extends LitElement {
  @state() ticks: Tick[] = [];
  @state() selectedEpic: string = '';
  @state() searchTerm: string = '';
  @state() activeColumn: string = 'blocked'; // mobile only

  // WebSocket connection for real-time updates
  private ws: WebSocket | null = null;
}
```

#### `<tick-card>`
Individual tick card with status, priority, badges.

```typescript
@customElement('tick-card')
export class TickCard extends LitElement {
  @property() tick!: Tick;
  @property({ type: Boolean }) selected = false;
}
```

#### `<tick-column>`
Kanban column with header and scrollable content.

```typescript
@customElement('tick-column')
export class TickColumn extends LitElement {
  @property() name!: string;
  @property() color!: string;
  @property({ type: Array }) ticks: Tick[] = [];
}
```

#### `<tick-detail-drawer>`
Slide-out panel using Shoelace drawer.

```typescript
@customElement('tick-detail-drawer')
export class TickDetailDrawer extends LitElement {
  @property() tick: Tick | null = null;
  @property({ type: Boolean }) open = false;
}
```

## Shoelace Components Used

Cherry-pick only what's needed:

| Component | Usage |
|-----------|-------|
| `sl-button` | Actions, create button |
| `sl-card` | Could wrap tick cards (optional) |
| `sl-dialog` | Create/edit modals |
| `sl-drawer` | Detail panel |
| `sl-input` | Search, form fields |
| `sl-select` | Epic filter, priority, type |
| `sl-option` | Select options |
| `sl-textarea` | Notes, description |
| `sl-badge` | Status/priority badges |
| `sl-alert` | Toast notifications |
| `sl-tab-group` | Mobile column tabs |
| `sl-tab` | Individual tabs |
| `sl-tab-panel` | Tab content |
| `sl-icon` | Icons throughout |
| `sl-dropdown` | Activity feed |
| `sl-menu` | Dropdown menus |
| `sl-menu-item` | Menu items |
| `sl-spinner` | Loading states |
| `sl-tooltip` | Hover hints |

## Theming

### Catppuccin Mocha Integration

Shoelace uses CSS custom properties for theming. Map Catppuccin Mocha colors:

```css
:root {
  /* Map Catppuccin to Shoelace tokens */
  --sl-color-primary-50: #f5e0dc;   /* rosewater */
  --sl-color-primary-500: #89b4fa;  /* blue */
  --sl-color-primary-600: #74c7ec;  /* sapphire */

  --sl-color-success-500: #a6e3a1;  /* green */
  --sl-color-warning-500: #f9e2af;  /* yellow */
  --sl-color-danger-500: #f38ba8;   /* red */

  --sl-color-neutral-0: #1e1e2e;    /* base */
  --sl-color-neutral-50: #181825;   /* mantle */
  --sl-color-neutral-100: #11111b;  /* crust */
  --sl-color-neutral-200: #313244;  /* surface0 */
  --sl-color-neutral-300: #45475a;  /* surface1 */
  --sl-color-neutral-400: #585b70;  /* surface2 */
  --sl-color-neutral-500: #6c7086;  /* overlay0 */
  --sl-color-neutral-600: #7f849c;  /* overlay1 */
  --sl-color-neutral-700: #9399b2;  /* overlay2 */
  --sl-color-neutral-800: #a6adc8;  /* subtext0 */
  --sl-color-neutral-900: #bac2de;  /* subtext1 */
  --sl-color-neutral-950: #cdd6f4;  /* text */

  /* Panel/input backgrounds */
  --sl-panel-background-color: var(--mantle);
  --sl-input-background-color: var(--surface0);
  --sl-input-border-color: var(--surface1);
}
```

## Responsive Design

### Desktop (>768px)
- 5 columns side-by-side
- Detail panel slides in from right (420px)
- Full header with search + filter

### Tablet (481-768px)
- Horizontal scroll with snap
- Hamburger menu for filters
- Detail panel 90% width

### Mobile (≤480px)
- Tab-based column switching using `sl-tab-group`
- Full-width detail drawer
- Mobile nav sidebar

```typescript
// In tick-board, detect mobile
@state() private isMobile = window.matchMedia('(max-width: 480px)').matches;

render() {
  return this.isMobile ? this.renderMobileLayout() : this.renderDesktopLayout();
}
```

## State Management

### Local State (per component)
- UI state (open/closed, selected, etc.)
- Transient form values

### Shared State (context)
- Ticks data
- Filter state (epic, search)
- Board info (repo name, epics list)

Use Lit's Context API for shared state:

```typescript
// contexts/board-context.ts
export const boardContext = createContext<BoardState>('board');

// In tick-board (provider)
@provide({ context: boardContext })
@state()
boardState: BoardState = { ticks: [], epics: [], ... };

// In child components (consumer)
@consume({ context: boardContext })
boardState!: BoardState;
```

## API Integration

Keep existing REST API, add typed fetch helpers:

```typescript
// api/ticks.ts
export async function fetchTicks(): Promise<Tick[]> {
  const res = await fetch('/api/ticks');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateTick(id: string, updates: Partial<Tick>): Promise<Tick> {
  const res = await fetch(`/api/ticks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

### WebSocket (existing)
Keep existing WebSocket for real-time updates:

```typescript
private connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  this.ws = new WebSocket(`${protocol}//${location.host}/ws`);

  this.ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    this.handleRealtimeUpdate(msg);
  };
}
```

## File Structure

```
internal/tickboard/
├── server/
│   ├── server.go          # HTTP server (unchanged)
│   └── static/            # Embedded at build time
│       ├── index.html
│       └── assets/
└── ui/                    # New: source code
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.ts        # Entry point, register components
        ├── styles/
        │   ├── catppuccin.css
        │   └── shoelace-theme.css
        ├── components/
        │   ├── tick-board.ts
        │   ├── tick-header.ts
        │   ├── tick-column.ts
        │   ├── tick-card.ts
        │   ├── tick-detail-drawer.ts
        │   ├── tick-create-dialog.ts
        │   └── tick-toast-stack.ts
        ├── api/
        │   └── ticks.ts
        ├── contexts/
        │   └── board-context.ts
        └── types/
            └── tick.ts
```

## Migration Steps

### Phase 1: Setup & Skeleton
1. Create `internal/tickboard/ui/` with Vite + Lit + TypeScript
2. Configure Shoelace with Catppuccin theme
3. Create `<tick-board>` root component
4. Set up build pipeline to output to `server/static/`
5. Update Go embed directive

### Phase 2: Core Components
1. `<tick-card>` - port card rendering
2. `<tick-column>` - port column with cards
3. `<tick-header>` - port header with search/filter
4. Wire up API fetch and basic rendering

### Phase 3: Interactions
1. `<tick-detail-drawer>` - port detail panel
2. `<tick-create-dialog>` - port create modal
3. Add approve/reject/close actions
4. Add notes functionality

### Phase 4: Polish
1. `<tick-toast-stack>` - port notifications
2. Activity feed dropdown
3. Keyboard navigation
4. Mobile responsive layout with tabs
5. PWA service worker

### Phase 5: Cleanup
1. Remove old static files
2. Update documentation
3. Performance testing

## Bundle Size Budget

| Asset | Target | Notes |
|-------|--------|-------|
| Lit runtime | 5KB | |
| Shoelace components | 45KB | Cherry-picked |
| App code | 15KB | Components + logic |
| CSS | 5KB | Theme + custom |
| **Total** | **70KB** | gzipped |

Compare to current: vanilla HTML (15KB) + CSS (25KB) + JS (20KB) = 60KB
Acceptable overhead for better DX and component architecture.

## Testing

```bash
# Development
cd internal/tickboard/ui
npm install
npm run dev          # http://localhost:5173 with HMR

# Build for production
npm run build        # outputs to ../server/static/

# Type check
npm run typecheck

# Lint
npm run lint
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bundle size creep | Enforce budget in CI, tree-shake aggressively |
| Shoelace breaking changes | Pin version, test before upgrade |
| Browser compatibility | Lit/Shoelace support modern browsers; old browsers get SSR fallback |
| Build complexity | Keep Vite config minimal, document build process |

## Success Criteria

1. All existing features work identically
2. Bundle size ≤70KB gzipped
3. Lighthouse performance score ≥90
4. Mobile Lighthouse score ≥85
5. No increase in server resource usage
6. Build time <10s
