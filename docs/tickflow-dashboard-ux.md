# Tickflow Dashboard UX Documentation

> Comprehensive user-experience documentation for the Ticks board web interface, including the Tickflow dashboard overlay, kanban board, run monitoring panel, and all interactive components.

## Overview

The Ticks board (`tk board`) is a real-time kanban-style web interface for managing ticks (issues). It provides:

- **5-column kanban board** — Blocked → Ready → In Progress → Needs Human → Done
- **Tickflow dashboard overlay** — Bird's-eye view of run progress, epic status, and metrics
- **Live run monitoring panel** — Real-time agent output, tool activity, and token metrics
- **Human-in-the-loop actions** — Approve, reject, add notes, close, and reopen ticks
- **Full keyboard navigation** — Vim-style shortcuts for power users
- **Responsive design** — Desktop kanban → mobile tab layout
- **Cloud sync** — Local-first with optional real-time cloud sync via ticks.sh

### Launch

```bash
tk board              # Start board on default port (8080)
tk board --port 3000  # Custom port
tk board --dev        # Dev mode (serves UI from disk for HMR)
```

Opens in browser at `http://localhost:8080`.

---

## Page Layout

### Desktop (>768px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo] repo-name  [Search] [Epic filter]  [📊 D] [▶ Run] [+ ] │ ← Header
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ ⊘ Blocked│ ▶ Ready  │ ● In Prg │ 👤 Human │ ✓ Done   │ Live Run │
│          │          │          │          │          │ (panel)  │
│ [card]   │ [card]   │ [card]   │ [card]   │ [card]   │          │
│ [card]   │ [card]   │          │ [card]   │ [card]   │ [output] │
│          │          │          │          │ [card]   │ [metrics]│
│          │          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
                                                   └── Detail Drawer →
```

When the run panel is open, the board uses a split layout (50/50). The detail drawer slides in from the right at 420px width.

### Tablet (481–768px)

- Columns scroll horizontally with snap
- Header hides search/filter; shows hamburger menu opening a filter drawer
- Detail drawer is 90% viewport width
- Run panel goes full-screen overlay

### Mobile (≤480px)

- **Tab-based column switching** using `sl-tab-group`
- Each tab shows icon + tick count badge
- Full-width detail drawer
- Filter drawer slides in from left

---

## Component Reference

### Header (`tick-header`)

The header bar spans the full width and provides:

| Element | Description |
|---------|-------------|
| **Ticks logo** | Custom SVG logomark (click navigates home) |
| **Repo badge** | Shows `owner/repo` or `owner/repo:worktree` (monospace, pill badge) |
| **Connection dot** | Green = connected, yellow (pulsing) = connecting, red = disconnected |
| **Read-only badge** | Yellow "READ ONLY" badge when in cloud mode without local client |
| **Search input** | Filters ticks by ID, title, or description (debounced 300ms) |
| **Epic filter** | Dropdown to filter by parent epic. Shows `[id] - title` per option |
| **Dashboard button** (📊) | Opens the Tickflow dashboard overlay (keyboard: `d`) |
| **Run panel toggle** (▶) | Shows/hides the live run monitoring panel (keyboard: `r`). Green dot animates when a run is active |
| **Awaiting count** | Badge on run toggle showing number of tasks awaiting human action |
| **Activity feed** | Dropdown showing recent activity (creates, closes, approvals, notes) |
| **Create button** (+) | Opens the create tick dialog (keyboard: `n`) |
| **Menu toggle** | Hamburger icon (mobile only) → opens filter drawer |

### Kanban Columns (`tick-column`)

Five columns represent the tick lifecycle:

| Column | Color | Icon | Contents |
|--------|-------|------|----------|
| **Blocked** | Red (`#f38ba8`) | ⊘ | Open ticks with unresolved blockers (`blocked_by` references open ticks) |
| **Ready** | Yellow (`#f9e2af`) | ▶ | Open + unblocked + not awaiting human. Includes rejected ticks returned for retry |
| **In Progress** | Blue (`#89b4fa`) | ● | `status: in_progress` + not awaiting. Agent is actively working |
| **Needs Human** | Mauve (`#cba6f7`) | 👤 | Any tick with `awaiting` set (approval, review, input, content, escalation, checkpoint, work) |
| **Done** | Green (`#a6e3a1`) | ✓ | `status: closed` |

Each column shows:
- Colored top bar (3px accent line)
- Column name + icon
- Tick count badge
- Scrollable card list

### Tick Card (`tick-card`)

Each card displays:

```
┌─ priority color bar (4px left edge) ──────────────┐
│  abc  Fix auth token                               │
│  [task]  [P2 Medium]                               │
│  Epic: Setup auth  │  👤 approval                  │
│  ✓ verified  │  2h ago                             │
└────────────────────────────────────────────────────┘
```

| Element | Details |
|---------|---------|
| **Priority bar** | 4px left-edge color: red (P0), peach (P1), yellow (P2), green (P3), gray (P4) |
| **Tick ID** | Monospace, blue text (`abc`) |
| **Title** | Primary text, truncated with ellipsis |
| **Type badge** | `task` (neutral), `bug` (danger/red), `feature` (primary/blue), `epic` (warning/yellow), `chore` (neutral) |
| **Priority badge** | Color-coded label: Critical, High, Medium, Low, Backlog |
| **Epic name** | "Epic: {title}" when tick has a parent and parent title is available |
| **Awaiting badge** | Shows awaiting type (e.g., "👤 approval") when tick is awaiting human |
| **Requires badge** | Shows `requires: human_gate` when set |
| **Verification status** | ✓ verified (green), ✗ failed (red), ◌ pending (gray) — for closed tasks |
| **Freshness** | Relative time since last update (e.g., "2h ago", "3d ago"). Recent updates highlighted |
| **Selection state** | Blue border + shadow when selected. Double-blue border when focused + selected |

**Interactions:**
- Click → opens detail drawer
- Keyboard focus → blue glow ring (2px outline)

### Detail Drawer (`tick-detail-drawer`)

Slides in from the right (420px width) showing full tick details:

**Sections:**

1. **Header** — Tick ID (monospace blue) + Title (editable for open ticks)
2. **Status bar** — Type badge + Priority badge + Status + Column assignment
3. **Metadata fields:**
   - Owner (editable)
   - Parent epic (editable, links to epic)
   - Priority (editable dropdown)
   - Type (editable dropdown)
   - Requires (human_gate toggle)
   - Blocked by (list of blocker ticks with status)
   - Created/Updated timestamps
4. **Description** — Full description text
5. **Notes** — Timestamped, author-attributed notes list + "Add note" input
6. **Run Record** — For closed tasks: verification results, cost/token metrics, model info
7. **Actions bar** (bottom):
   - **Approve** (green) — For ticks in `awaiting` state. Clears awaiting, may close tick
   - **Reject** (red) — For ticks in `awaiting` state. Requires feedback message. Moves tick back to Ready
   - **Close** (gray) — Close the tick with optional reason
   - **Reopen** (blue) — For closed ticks, reopens to open status
   - **Add Note** — Text input with submit button

**Read-only mode:** In cloud mode without local client, all mutation buttons are disabled.

### Create Tick Dialog (`tick-create-dialog`)

Modal dialog with form fields:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Title | Text input | — | Required |
| Description | Textarea | — | Optional |
| Type | Select | `task` | task, epic, bug, feature, chore |
| Priority | Select | `2` (Medium) | 0–4 scale |
| Parent Epic | Select | — | Lists open epics |
| Requires | Select | — | Optional: `human_gate` |

Submit creates the tick and shows a success toast.

### Toast Notifications (`tick-toast-stack`)

Non-blocking notifications stacked at top-right:

| Variant | Color | Use |
|---------|-------|-----|
| Success (green) | Created tick, approved, closed |
| Warning (yellow) | Task awaiting human action |
| Error (red) | API failures, network errors |
| Info (blue) | General information |

Auto-dismiss after 5 seconds. Closable via X button.

### Activity Feed (`tick-activity-feed`)

Dropdown in the header showing recent actions:

| Action | Icon | Example |
|--------|------|---------|
| create | ➕ | `abc` create by agent |
| close | ✅ | `def` close by human |
| update | ✏️ | `ghi` update |
| approve | 👍 | `jkl` approve by peter |
| reject | 👎 | `mno` reject by peter |
| note | 💬 | `pqr` note by agent |
| reopen | 🔄 | `stu` reopen by human |

Clicking an activity item selects and opens that tick in the detail drawer.

---

## Tickflow Dashboard Overlay

Opened via the 📊 button or `d` key. A full-viewport overlay with blurred backdrop providing a bird's-eye view.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Tickflow Dashboard                                      │
│     repo-name                      Press [d] or [Esc]  [✕] │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │Total Tasks│ │Completion │ │Needs Human│ │In Progress│   │
│  │    24     │ │   67%     │ │     3     │ │     2     │   │
│  │ 3 epics   │ │ 16/24 done│ │ awaiting  │ │ agent act.│   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                              │
│  Task Distribution                                           │
│  [████ Blocked ████ Ready ███████ In Prg █ Human █████ Done] │
│  ⊘ Blocked 2  ▶ Ready 3  ● In Prg 2  👤 Human 3  ✓ Done 14 │
│                                                              │
│  Epic Progress                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ abc  Setup authentication  [████████░░░]  8/10  80%  │   │
│  │ def  Payment integration   [████░░░░░░░]  4/10  40%  │   │
│  │ ghi  Dashboard UI          [██░░░░░░░░░]  2/8   25%  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Needs Attention (3) ──┐  ┌─ Recent Activity ──────────┐ │
│  │ 👤 abc  Fix token       │  │ ➕ abc create by agent  2m  │ │
│  │   Awaiting approval     │  │ ✅ def close by agent   5m  │ │
│  │ 👤 def  Review schema   │  │ ✏️ ghi update          12m  │ │
│  │   Awaiting review       │  │ 👍 jkl approve by pete 1h  │ │
│  └────────────────────────┘  └─────────────────────────────┘ │
│                                                              │
│  Run Status                                                  │
│  ● Agent Running                                            │
│    Task abc · 15 turns                                      │
└─────────────────────────────────────────────────────────────┘
```

### Summary Cards

Five cards showing aggregate metrics:

| Card | Value | Detail |
|------|-------|--------|
| **Total Tasks** | Count of non-epic ticks | "{N} epics" |
| **Completion** | Done percentage (green) | "{done}/{total} done" |
| **Needs Human** | Count in human column (yellow when >0) | "awaiting action" |
| **In Progress** | Count in agent column (peach when >0) | "agent active" / "agent idle" |
| **Blocked** | Count in blocked column (red when >0) | "dependencies unmet" |

### Task Distribution Bar

Horizontal stacked bar chart showing tick distribution across columns. Each segment:
- Width proportional to percentage
- Color matches column (red/blue/peach/yellow/green)
- Shows count when segment is ≥8% wide
- Legend below with dot + icon + name + count

### Epic Progress

Rows for each open epic showing:
- Epic ID (monospace blue)
- Epic title (truncated)
- Progress bar (green fill)
- Stats: `{done}/{total}` + percentage
- Clickable → filters board to that epic and closes overlay

### Needs Attention

Lists ticks in the "human" column (max 6 shown, "+N more" overflow):
- 👤 icon + tick title + awaiting label
- Tick ID (monospace blue)
- Yellow left border accent
- Clickable → opens tick detail and closes overlay

Awaiting labels: "Awaiting approval", "Awaiting review", "Awaiting input", "Awaiting content", "Escalated", "Checkpoint", "Manual work needed"

### Recent Activity

Mini-feed of last 8 activities with:
- Action icon (➕ ✅ ✏️ 👍 👎 💬 🔄)
- Tick ID reference (monospace blue)
- Action + actor
- Relative timestamp ("2m ago", "1h ago")

### Run Status

Status indicator:
- **Active**: Green pulsing dot + "Agent Running" + task ID + turn count
- **Inactive**: Gray dot + "Agent Idle" + "No active run. Start with `tk run`"

### Interactions

- **Backdrop click** → closes overlay
- **Escape** → closes overlay
- **`d` key** → toggles overlay
- **Epic row click** → filters board to epic, closes overlay
- **Attention item click** → opens tick detail, closes overlay
- **Activity item click** → opens tick detail, closes overlay

---

## Live Run Monitoring Panel

Toggled via the ▶ button or `r` key. Occupies the right half of the viewport as a split panel.

### Panel Sections

**Header:**
- Terminal icon + "Live Run" label
- Epic ID (monospace blue) + epic title
- Close button (X)

**Awaiting Tasks Section** (shown when tasks need human action):
- Yellow accent background
- Warning icon + "Needs Human Action" + count badge
- List of awaiting tasks with:
  - Awaiting type icon (🔧 ✅ 💬 👀 📝 🚨 📍)
  - Tick ID + type badge
  - Title + signal reason (italic)
  - Clickable → opens tick detail

**Active Run Content:**
- Task info bar: tick ID + title
- `run-metrics` component: token counts, cost, duration
- `tool-activity` component: currently executing tool with name, input preview, duration
- `run-output-pane`: scrollable ANSI-colored terminal output with context tab

**No Run State:**
- Hourglass icon
- "No active run"
- "When a ticker run starts, output will appear here"

### Run Events (via SSE/WebSocket)

The panel subscribes to run events for the monitored epic:

| Event | Effect |
|-------|--------|
| `run:epic-started` | Shows running state |
| `run:task-started` | Updates active task display |
| `run:task-update` | Updates metrics, active tool, turn count |
| `run:tool-activity` | Shows current tool name/input/output |
| `run:task-completed` | Clears active task |
| `run:task-awaiting` | Adds to awaiting list + shows toast notification |
| `run:epic-completed` | Shows idle state |

### Metrics Display (`run-metrics`)

Compact and expanded views:

**Compact:** `12.5K tokens • $0.42`

**Expanded breakdown:**
- Input tokens count
- Output tokens count
- Cache read tokens
- Cache creation tokens
- Total cost (USD)
- Duration
- Token distribution bar

Green pulsing animation when live.

### Tool Activity (`tool-activity`)

Shows the currently executing tool:

| Tool | Icon | Color |
|------|------|-------|
| Read | file-earmark-text | Blue |
| Write | file-earmark-plus | Green |
| Edit | pencil-square | Yellow |
| Bash | terminal | Peach |
| Grep | file-earmark-code | Blue |
| Task | list-task | — |
| WebFetch | globe | — |

Displays: tool name, input preview (truncated), duration timer, error state.

---

## Keyboard Shortcuts

Full vim-style navigation. Press `?` to show the help dialog.

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down within column (wraps) |
| `k` / `↑` | Move up within column (wraps) |
| `h` / `←` | Move to previous column (wraps) |
| `l` / `→` | Move to next column (wraps) |
| `Enter` | Open focused tick in detail drawer |

### Actions

| Key | Action |
|-----|--------|
| `n` | Open create tick dialog |
| `/` | Focus search input |
| `d` | Toggle Tickflow dashboard overlay |
| `r` | Toggle live run monitoring panel |
| `Esc` | Close: dashboard → keyboard help → detail drawer → run panel → clear focus |
| `?` | Toggle keyboard shortcuts help dialog |

### Focus Behavior

- First navigation key press initializes focus to the first non-empty column
- Focus ring: 2px blue outline on the focused card
- On mobile, horizontal navigation also switches the active tab
- Keyboard shortcuts are disabled when an input/textarea/select is focused (traverses shadow DOM)

---

## Real-Time Updates

### Server-Sent Events (Local Mode)

The board connects to `GET /api/events` for real-time push:

| Event Type | Payload | Action |
|------------|---------|--------|
| `connected` | `{}` | Initial connection confirmation |
| `update` | `{"type":"update","tickId":"abc"}` | Refetch and update tick in store |
| `update` | `{"type":"delete","tickId":"abc"}` | Remove tick from store |
| `update` | `{"type":"activity"}` | Refetch activity feed |

**Reconnection:** Exponential backoff on connection loss.

### WebSocket (Cloud Mode)

Cloud mode connects to `wss://ticks.sh` for bidirectional sync:
- Full state synchronization on connect
- Incremental tick updates
- Run event streaming
- Context document updates

### File Watching

The Go server watches:
- `.tick/issues/*.json` — tick changes (debounced 100ms, mtime-filtered)
- `.tick/activity/activity.jsonl` — activity log changes
- `.tick/logs/records/*.json` — run record changes for live streaming

---

## Theming

### Catppuccin Mocha

The entire UI uses the [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) dark color palette:

| Variable | Hex | Usage |
|----------|-----|-------|
| `--base` | `#1e1e2e` | Page background |
| `--mantle` | `#181825` | Header background, dashboard header |
| `--crust` | `#11111b` | Progress bar backgrounds |
| `--surface0` | `#313244` | Card/column backgrounds, elevated surfaces |
| `--surface1` | `#45475a` | Borders, separators |
| `--surface2` | `#585b70` | Keyboard shortcut borders |
| `--overlay0` | `#6c7086` | Muted text, timestamps |
| `--overlay1` | `#7f849c` | Secondary muted text |
| `--subtext0` | `#a6adc8` | Labels, captions |
| `--subtext1` | `#bac2de` | Secondary text |
| `--text` | `#cdd6f4` | Primary text |
| `--blue` | `#89b4fa` | Primary actions, tick IDs, links |
| `--green` | `#a6e3a1` | Success, done, verified, active run |
| `--yellow` | `#f9e2af` | Warning, awaiting, human column |
| `--red` | `#f38ba8` | Danger, blocked, failed, critical priority |
| `--peach` | `#fab387` | In-progress, high priority |
| `--mauve` | `#cba6f7` | Human column header |
| `--sapphire` | `#74c7ec` | Focus + selected dual state |
| `--rosewater` | `#f5e0dc` | Accent |

Shoelace design tokens are remapped to Catppuccin in `shoelace-theme.css`.

---

## Responsive Breakpoints

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| **>768px** | Full kanban (5 columns side-by-side) | Header shows search + filter inline |
| **481–768px** | Horizontal scroll with snap | Hamburger menu replaces inline filters |
| **≤480px** | Tab-based column switching | Full-width cards, touch-optimized (44px min tap targets) |

---

## API Surface

The UI communicates with these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ticks` | `GET` | List ticks (query: `status`, `type`, `parent`, `awaiting`) |
| `/api/ticks` | `POST` | Create tick |
| `/api/ticks/:id` | `GET` | Get single tick with notes, blockers |
| `/api/ticks/:id` | `PATCH` | Update tick fields (priority, type, parent, owner, requires) |
| `/api/ticks/:id/approve` | `POST` | Approve awaiting tick |
| `/api/ticks/:id/reject` | `POST` | Reject tick (requires `feedback` in body) |
| `/api/ticks/:id/note` | `POST` | Add note (requires `message` in body) |
| `/api/ticks/:id/close` | `POST` | Close tick (optional `reason` in body) |
| `/api/ticks/:id/reopen` | `POST` | Reopen closed tick |
| `/api/events` | `GET` (SSE) | Real-time tick/activity events |
| `/api/info` | `GET` | Repo name + open epics list |
| `/api/activity` | `GET` | Recent activity feed (query: `limit`, max 200) |
| `/api/records/:id` | `GET` | Run record for a tick |
| `/api/run-status/:epicId` | `GET` | Active run status + awaiting tasks |
| `/api/run-stream/:epicId` | `GET` (SSE) | Live run event stream |
| `/api/context/:epicId` | `GET` | Epic context markdown document |

---

## State Management

### Nanostores

The UI uses [nanostores](https://github.com/nanostores/nanostores) for global state with Lit integration via `@nanostores/lit`:

| Store | Type | Description |
|-------|------|-------------|
| `$ticksList` | `atom<BoardTick[]>` | All ticks |
| `$epics` | `computed` | Epics filtered from ticks |
| `$repoName` | `atom<string>` | Repository display name |
| `$selectedTick` | `atom<BoardTick\|null>` | Currently selected tick |
| `$selectedTickNotes` | `computed` | Parsed notes for selected tick |
| `$selectedTickBlockers` | `computed` | Blocker details for selected tick |
| `$selectedTickParentTitle` | `computed` | Parent epic title |
| `$loading` | `atom<boolean>` | Loading state |
| `$error` | `atom<string\|null>` | Error message |
| `$isCloudMode` | `atom<boolean>` | Cloud vs local mode |
| `$localClientConnected` | `atom<boolean>` | Local client connection status |
| `$isReadOnly` | `atom<boolean>` | Read-only mode flag |
| `$effectiveConnectionStatus` | `computed` | Effective connection status |

### Lit Context

Board-level state shared via Lit Context for components that don't need global access:

```typescript
interface BoardState {
  ticks: BoardTick[];
  epics: Epic[];
  selectedEpic: string;
  searchTerm: string;
  activeColumn: TickColumn;
  isMobile: boolean;
}
```

### Communication Layer

Unified `comms` abstraction handles both local (REST + SSE) and cloud (WebSocket) modes:

| Function | Description |
|----------|-------------|
| `approveTick(id)` | Approve via local API or cloud WebSocket |
| `rejectTick(id, feedback)` | Reject with feedback |
| `closeTick(id, reason?)` | Close tick |
| `reopenTick(id)` | Reopen tick |
| `addNote(id, message)` | Add note |
| `createTick(data)` | Create new tick |
| `subscribeRun(epicId)` | Subscribe to run event stream |
| `fetchRecord(tickId)` | Fetch run record |
| `fetchContext(epicId)` | Fetch epic context |

---

## PWA Support

The board includes Progressive Web App features:

- **`manifest.json`** — App name, icons (192px, 512px, maskable), theme color
- **`sw.js`** — Service worker caching static assets
- **Offline support** — Cached pages served when offline
- **Install prompt** — Browser shows "Add to Home Screen" on supported platforms
- **Favicon set** — SVG, 16px, 32px PNG, Apple touch icon

---

## Build & Embed Pipeline

```
Source:  internal/tickboard/ui/src/   ← Lit/TypeScript components
                    ↓
Build:   pnpm build (Vite)            ← ~1.6s build time
                    ↓
Output:  internal/tickboard/server/static/
         ├── index.html
         ├── assets/app-[hash].js     ← ~346KB (75.7KB gzipped)
         ├── assets/app-[hash].css    ← ~24KB (4.8KB gzipped)
         ├── shoelace/icons/          ← Cherry-picked SVG icons
         ├── manifest.json
         ├── sw.js
         └── *.png                    ← App icons
                    ↓
Embed:   //go:embed static/*          ← Compiled into Go binary
                    ↓
Serve:   tk board                     ← Single binary, zero deps
```

---

## Cloud Mode

When accessed via `ticks.sh` or with a project URL (`/p/{project-id}`), the board operates in cloud mode:

- Data synchronized via WebSocket instead of local REST API
- Read-only by default (mutations require local client connection)
- Connection status shown in header (green/yellow/red dot)
- "READ ONLY" badge when mutations are disabled
- Supports sharing boards with teammates without requiring local setup

Detection order:
1. URL path pattern `/p/{project-id}`
2. `localStorage` key `ticks_project`
3. `ticks.sh` hostname with `?project=` query param
4. Falls back to local mode
