# Ticks Visual Styleguide

This document defines the visual language shared across all ticks interfaces: `tk board` (web), `tk view` (TUI), and CLI commands (`tk show`, `tk list`, etc.).

For full brand guidelines including logo assets, see `logos/brand.html`.

## Typography

| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| Sans | Geist | system-ui, sans-serif | Headings, body text |
| Mono | Geist Mono | ui-monospace, monospace | Code, CLI, logo |

**Web font loading:**
```html
<link href="https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/style.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-mono/style.css" rel="stylesheet">
```

## Color Palette

All interfaces use the **Catppuccin Mocha** color palette.

### Background Colors

| Name    | Hex       | Usage                              |
|---------|-----------|-------------------------------------|
| Crust   | `#11111b` | Deepest background                  |
| Base    | `#1e1e2e` | Primary dark background             |
| Mantle  | `#181825` | Elevated surfaces                   |
| Surface | `#313244` | Cards, inputs, borders              |

### Primary Brand Color

| Name      | Hex       | Usage                                    |
|-----------|-----------|------------------------------------------|
| **Green** | `#A6E3A1` | Primary brand, logo, CTAs, success       |

### Accent Colors

| Name      | Hex       | Usage                                    |
|-----------|-----------|------------------------------------------|
| Red       | `#F38BA8` | Blocked, bug type, P0/P1 priority, errors |
| Yellow    | `#F9E2AF` | Awaiting human, warnings, P2 priority    |
| Blue      | `#89DCEB` | Info, links, focused elements            |
| Peach     | `#FAB387` | In-progress status, P1 priority (high)   |
| Teal      | `#94E2D5` | Feature type (terminal only)             |
| Mauve     | `#CBA6F7` | Epic type (terminal), manual/human tasks |
| Pink      | `#F5C2E7` | Section headers                          |

### Text Colors

| Name      | Hex       | Usage                           |
|-----------|-----------|----------------------------------|
| Text      | `#cdd6f4` | Primary text                     |
| Subtext1  | `#bac2de` | Secondary text, task type        |
| Subtext0  | `#a6adc8` | Dim/muted text, P4 priority, chore type |

### Overlay Colors

| Name      | Hex       | Usage                           |
|-----------|-----------|----------------------------------|
| Overlay1  | `#7f849c` | Labels, footer text, borders    |
| Overlay0  | `#6c7086` | Borders, dividers, open status icon |

## Status Display

### Icons

| Status       | Icon | Terminal Color | Web Color |
|--------------|------|----------------|-----------|
| Open         | `○`  | Gray (#6c7086) | Green (#a6e3a1) |
| In Progress  | `●`  | Blue (#89b4fa) | Peach (#fab387) |
| Closed       | `✓`  | Green (#a6e3a1)| Gray (#a6adc8) |
| Awaiting     | `◐`  | Yellow (#f9e2af) | Yellow (#f9e2af) |
| Blocked      | `⊘`  | Red (#f38ba8)  | Red (#f38ba8) |

### Web-specific Icons

| State        | Icon | Color          |
|--------------|------|----------------|
| Manual       | `👤` | Mauve (#cba6f7)|
| Awaiting     | `⏳` | Yellow (#f9e2af) |
| Verified     | `✓`  | Green (#a6e3a1)|
| Failed       | `✗`  | Red (#f38ba8)  |
| Pending      | `⋯`  | Yellow (#f9e2af) |

## Priority Display

| Priority | Label    | Color           | Terminal Format |
|----------|----------|-----------------|-----------------|
| P0       | Critical | Red (#f38ba8)   | Bold red        |
| P1       | High     | Peach (#fab387) | Peach           |
| P2       | Medium   | Yellow (#f9e2af)| Yellow          |
| P3       | Low      | Green (#a6e3a1) | Green           |
| P4       | Backlog  | Gray (#a6adc8)  | Gray            |

Web displays priority as a 4px colored bar on the left side of cards.
Terminal displays priority as colored `P0`-`P4` text.

## Type Display

| Type    | Terminal Color    | Web Color        |
|---------|-------------------|------------------|
| Bug     | Red (#f38ba8)     | Red (#f38ba8)    |
| Feature | Teal (#94e2d5)    | Blue (#89b4fa)   |
| Task    | Gray (#a6adc8)    | Gray (#bac2de)   |
| Epic    | Mauve (#cba6f7)   | Yellow (#f9e2af) |
| Chore   | Gray (#6c7086)    | Gray (#a6adc8)   |

## Terminal Output Formats

### tk show (detail view)

```
╭──────────────────────────────────────────────────────╮
│ abc  P2  feature  ○  @alice                          │
│                                                      │
│ Add dark mode toggle                                 │
│                                                      │
│ Description:                                         │
│   Users want a dark mode...                          │
│                                                      │
│ Labels:      ui, accessibility                       │
│ Parent:      epic-123                                │
│                                                      │
│ Created: 2024-01-15 10:30 by alice                   │
│ Updated: 2024-01-20 14:15                            │
│ Global:  owner/repo:abc                              │
╰──────────────────────────────────────────────────────╯
```

### tk list / tk blocked (table view)

```
 ID    PRI  TYPE     ST  TITLE
 abc   P2   feature  ○   Add dark mode toggle
 def   P1   bug      ⊘   Fix login crash
 ghi   P3   task     ●   Update documentation
```

### tk stats (statistics view)

```
╭──────────────────────────────────────────────────────╮
│ owner/repo                                           │
│                                                      │
│ Total:       42 ticks                                │
│                                                      │
│ Status:      ○ 15 · ● 8 · ✓ 19                       │
│ Priority:    P0:2 · P1:5 · P2:20 · P3:10 · P4:5      │
│ Types:       bug:8 · feature:12 · task:15 · epic:3   │
│                                                      │
│ Ready:       12                                      │
│ Blocked:     3                                       │
╰──────────────────────────────────────────────────────╯
```

## Component Hierarchy

### Web (tk board)

```
tick-board
├── tick-header
├── kanban-board
│   └── tick-column (per status)
│       └── tick-card (per tick)
└── tick-detail-drawer
```

### Terminal (tk view)

```
Model
├── Left pane (tick list with tree structure)
│   └── item (per tick, indented for children)
└── Right pane (detail view)
```

## Style Constants

### Go (internal/styles/styles.go)

```go
// Accent colors
ColorRed     = "#F38BA8"
ColorPeach   = "#FAB387"
ColorYellow  = "#F9E2AF"
ColorGreen   = "#A6E3A1"  // Primary brand color
ColorTeal    = "#94E2D5"
ColorBlue    = "#89DCEB"
ColorPurple  = "#CBA6F7"
ColorPink    = "#F5C2E7"

// Text colors
ColorText    = "#CDD6F4"
ColorSubtext = "#A6ADC8"
ColorDim     = "#7F849C"
ColorGray    = "#6C7086"

// Background colors
ColorSurface = "#313244"
ColorBase    = "#1E1E2E"
ColorMantle  = "#181825"
ColorCrust   = "#11111B"

// Icons
IconOpen       = "○"
IconInProgress = "●"
IconClosed     = "✓"
IconAwaiting   = "◐"
IconBlocked    = "⊘"
```

### CSS (logos/colors.css)

```css
/* Fonts */
--ticks-font-sans: 'Geist', system-ui, -apple-system, sans-serif;
--ticks-font-mono: 'Geist Mono', ui-monospace, monospace;

/* Primary */
--ticks-green: #A6E3A1;

/* Text */
--ticks-text: #CDD6F4;
--ticks-subtext: #A6ADC8;
--ticks-overlay: #6C7086;

/* Backgrounds */
--ticks-surface: #313244;
--ticks-base: #1E1E2E;
--ticks-mantle: #181825;
--ticks-crust: #11111B;

/* Accents */
--ticks-red: #F38BA8;
--ticks-yellow: #F9E2AF;
--ticks-blue: #89DCEB;
```

## Voice & Tone

- **Direct** — Get to the point, no marketing speak
- **Technical** — Speak to developers, use precise terms
- **Confident** — State facts, avoid hedging
- **Lowercase** — Brand name is "ticks", not "Ticks"

## Design Principles

1. **Consistency**: Use the same colors for the same semantic meaning across all interfaces
2. **Accessibility**: Ensure sufficient contrast; icons supplement color (don't rely on color alone)
3. **Information density**: Terminal output should be scannable; web can show more detail
4. **Progressive disclosure**: List views show summary; detail views show full information
5. **Dark-first**: All interfaces use dark backgrounds; logo requires dark background
