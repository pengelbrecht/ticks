# Tick Board - Lit + Shoelace Prototype

A prototype demonstrating the Tick Board UI built with Lit web components and Shoelace UI library.

## Features Demonstrated

- **Kanban Board**: 5-column layout (Blocked, Agent Queue, In Progress, Needs Human, Done)
- **Tick Cards**: Type badges, priority, status indicators, awaiting/requires badges
- **Detail Drawer**: Slide-out panel with tick details, notes, and action buttons
- **Create Dialog**: Modal form for creating new ticks
- **Activity Dropdown**: Recent activity feed
- **Toast Notifications**: Success/warning alerts
- **Mobile Responsive**: Column selector dropdown on mobile (<480px)
- **Catppuccin Mocha Theme**: Dark theme matching existing tk board

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build
```

## Stack

| Library | Version | Purpose |
|---------|---------|---------|
| Lit | 3.x | Web component base class |
| Shoelace | 2.12 | UI components (drawer, dialog, select, etc.) |
| Vite | 5.x | Build tool with HMR |
| TypeScript | 5.x | Type safety |

## Components

```
tick-board (root)
├── header (search, filter, create button, activity dropdown)
├── mobile-column-select (visible <480px)
├── tick-column (×5)
│   └── tick-card (×n)
├── tick-detail-drawer
│   └── sl-drawer with details, notes, actions
├── create-dialog
│   └── sl-dialog with form
└── toast-container
    └── sl-alert notifications
```

## Shoelace Components Used

- `sl-button` - Actions and triggers
- `sl-input` - Search field
- `sl-select` / `sl-option` - Epic filter, mobile column picker
- `sl-drawer` - Detail panel
- `sl-dialog` - Create/edit modals
- `sl-textarea` - Notes input
- `sl-badge` - Status badges
- `sl-alert` - Toast notifications
- `sl-dropdown` / `sl-menu` - Activity feed
- `sl-icon` - Icons throughout
- `sl-tooltip` - Hover hints
- `sl-divider` - Visual separators

## Responsive Breakpoints

- **Desktop (>768px)**: Full 5-column kanban with side-by-side layout
- **Tablet (481-768px)**: Horizontal scroll with snap, hamburger menu
- **Mobile (≤480px)**: Single column with dropdown selector

## Bundle Size (Estimated)

| Asset | Size (gzipped) |
|-------|----------------|
| Lit runtime | ~5KB |
| Shoelace (cherry-picked) | ~45KB |
| App code | ~10KB |
| **Total** | ~60KB |

## Integration Path

To integrate into tk board:

1. Move `src/` to `internal/tickboard/ui/src/`
2. Update vite config to output to `../server/static/`
3. Update Go `//go:embed` directive
4. Replace sample data with API fetch
5. Add WebSocket for real-time updates
