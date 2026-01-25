# Claude Code Tasks Integration

## Overview

Claude Code stores Tasks in `~/.claude/tasks/` as a shared coordination mechanism for multi-agent and multi-session work. This document proposes integrating this with the tickboard to provide bidirectional visibility between Ticks and Claude Code Tasks.

## Claude Code Tasks Structure

```
~/.claude/tasks/
├── {task-list-uuid}/           # One folder per task list
│   ├── .lock                   # Coordination lock file
│   ├── 1.json                  # Task files numbered sequentially
│   ├── 2.json
│   └── ...
```

**Task Schema:**
```json
{
  "id": "1",
  "subject": "Add email validation",
  "description": "Detailed task description",
  "activeForm": "Adding email validation",  // Spinner text
  "status": "pending" | "in_progress" | "completed",
  "blocks": ["2", "3"],
  "blockedBy": ["1"],
  "metadata": {
    "tickId": "7o7",      // Currently local tick ID
    "epicId": "inn"       // Currently local epic ID
  }
}
```

## Problem: Association

### Current State

The Swarm Bridge stores `tickId` and `epicId` in task metadata, but these are **local IDs** (3-character base36):

```json
"metadata": {
  "tickId": "7o7",
  "epicId": "inn"
}
```

Tick IDs are only unique within a project. Multiple projects could have tick `7o7`.

### Solution: Global Tick IDs

Use format: `{owner}/{repo}:{tickId}` (matches cloud sync's project identifier)

Example: `pengelbrecht/ticks:7o7`

**Changes needed:**

1. **Update Swarm Bridge skill** to use global IDs:
   ```markdown
   When creating Tasks from Ticks, use global tick IDs in metadata:
   - Get project identifier: `git remote get-url origin` → parse to `owner/repo`
   - Store as: `"globalTickId": "owner/repo:tickId"`
   ```

2. **tk CLI enhancement** (optional): Add `--global-id` flag to `tk show`:
   ```bash
   tk show abc --global-id
   # Output: pengelbrecht/ticks:abc
   ```

## Problem: Where to Store Association

### Option A: Local File (Recommended for MVP)

Create `~/.claude/tasks-ticks-mapping.json`:

```json
{
  "ece9240d-c035-4215-a2ce-70a93561917f": {
    "project": "pengelbrecht/ticks",
    "epicId": "inn",
    "tasks": {
      "1": "7o7",
      "2": "4as",
      "3": "700"
    }
  }
}
```

**Pros:**
- Simple to implement
- No cloud dependency
- Works offline

**Cons:**
- Local only - no cross-machine visibility
- Could get out of sync

### Option B: Durable Object Extension

Extend the existing ProjectRoom DO to track active task lists:

```typescript
interface TaskListBinding {
  taskListId: string;           // UUID from ~/.claude/tasks
  epicId: string;               // Local epic ID
  boundAt: string;              // ISO timestamp
  status: 'active' | 'completed' | 'abandoned';
  taskStatuses: Record<string, {
    tickId: string;
    status: 'pending' | 'in_progress' | 'completed';
    lastSeen: string;
  }>;
}
```

**Pros:**
- Persisted in cloud
- Visible across machines/sessions
- Real-time sync via existing WebSocket

**Cons:**
- Requires cloud connection
- More complex implementation
- Need to handle offline gracefully

### Recommendation

**MVP: Local file + broadcast events**
- Tickboard watches `~/.claude/tasks/` for changes
- When task changes, look up mapping in local file
- Broadcast "virtual status" update to connected clients
- If cloud connected, push event to DO (one-way sync for visibility)

**Future: Full DO integration**
- Bidirectional sync between Tasks and DO
- Cross-machine task visibility in cloud board

## Problem: Virtual Status

Ticks have their own status (`open`, `in_progress`, `closed`), but when being worked on via Claude Tasks, we want to show a "virtual status" derived from the Task.

### Status Mapping

| Task Status | Task Exists? | Tick Virtual Status |
|-------------|--------------|---------------------|
| n/a         | No           | (use tick's actual status) |
| `pending`   | Yes          | `queued` (new virtual status) |
| `in_progress` | Yes        | `in_progress` |
| `completed` | Yes          | `completed_pending_sync` |

### UI Representation

The board can show:
1. **Tick's actual status** - what's in `.tick/issues/*.json`
2. **Task overlay** - badge/indicator showing Claude is working on it

Example UI states:
- Normal tick: Shows tick status
- Tick with active task: Shows tick status + "🤖 Agent working" badge
- Tick with completed task: Shows "✓ Agent done, syncing..." until tick is closed

### Data Flow

```
Task File Changes
      ↓
  fsnotify event
      ↓
  Lookup in mapping file
      ↓
  Find associated tick (by globalTickId)
      ↓
  Broadcast virtual status update
      ↓
  UI shows overlay/badge
```

### Implementation Options

#### Option A: Separate Virtual Status Stream

Add new SSE event type:
```json
{
  "type": "task-status",
  "tickId": "7o7",
  "taskListId": "ece9240d-...",
  "taskId": "1",
  "status": "in_progress",
  "activeForm": "Adding email validation"
}
```

UI maintains separate state for task overlays, merged with tick state for display.

**Pros:**
- Clean separation of concerns
- Doesn't pollute tick data
- Can show rich task info (activeForm spinner text)

#### Option B: Computed Field in Tick Response

When serving ticks via API, compute virtual status:
```json
{
  "id": "7o7",
  "title": "Add email validation",
  "status": "open",                    // Actual tick status
  "virtualStatus": "in_progress",      // From active task
  "activeTask": {
    "taskListId": "ece9240d-...",
    "taskId": "1",
    "activeForm": "Adding email validation"
  }
}
```

**Pros:**
- Single source of truth in API response
- Simpler client logic

**Cons:**
- Requires lookup on every tick fetch
- Mixes concerns

### Recommendation

**Use Option A (separate stream)** for:
- Better performance (no lookup on tick fetch)
- Cleaner architecture
- Richer UI possibilities (show spinner text, progress)

## Implementation Plan

### Phase 1: Local Watching (MVP)

1. **Update Swarm Bridge skill** to use global tick IDs:
   - Format: `owner/repo:tickId`
   - Store in `metadata.globalTickId`

2. **Add tasks watcher to tickboard server**:
   ```go
   // Watch ~/.claude/tasks/ for changes
   tasksWatcher, _ := fsnotify.NewWatcher()
   tasksWatcher.Add(filepath.Join(os.Getenv("HOME"), ".claude/tasks"))
   ```

3. **Create mapping loader**:
   - Read task files, extract `globalTickId` from metadata
   - Match against current project's ticks
   - Build in-memory mapping

4. **Broadcast task events**:
   - New SSE event type: `task-status`
   - Include tick ID, task status, activeForm

5. **UI updates**:
   - Add task overlay component to tick cards
   - Show spinner with activeForm text when in_progress

### Phase 2: Cloud Integration

1. **Extend ProjectRoom DO** with task list tracking

2. **Push task events to cloud** when cloud connected

3. **Cloud board shows task status** across all connected viewers

### Phase 3: Bidirectional Sync

1. **Task completion → Tick closure**:
   - When task marked completed, optionally auto-close tick
   - Or transition to awaiting state if requires gate set

2. **Tick changes → Task updates**:
   - If tick closed externally, mark task completed
   - If tick rejected, mark task... (need to define behavior)

## Open Questions

1. **Multiple task lists for same tick?**
   - Can a tick be in multiple task lists simultaneously?
   - How to handle if task lists disagree on status?
   - Probably: Use most recent / in_progress wins

2. **Task list lifecycle?**
   - When to consider a task list "stale"?
   - Should we clean up old task lists?
   - Probably: Show "last active" timestamp, age out after N days

3. **Permission model?**
   - Should cloud board show all task lists or only authenticated user's?
   - Probably: Show all for project, task lists are coordination mechanism

4. **Worktree support?**
   - Current project ID includes `:worktree` suffix for worktrees
   - Should task global IDs include worktree?
   - Probably: No - tasks are about logical work, not physical location

## Files to Modify

**Skill:**
- `skills/ticks/skill.md` - ✅ Updated with explicit metadata requirements:
  - `globalTickId`: `owner/repo:tickId` format (REQUIRED)
  - `tickId`: Local tick ID
  - `epicId`: Parent epic ID

**Server:**
- `internal/tickboard/server/server.go` - Add tasks watcher
- `internal/tickboard/server/tasks.go` (new) - Task watching logic

**UI:**
- `internal/tickboard/ui/src/types/tick.ts` - Add task overlay types
- `internal/tickboard/ui/src/components/tick-card.ts` - Show task badge
- `internal/tickboard/ui/src/api/sync.ts` - Handle task-status events

**Cloud (Phase 2):**
- `cloud/worker/src/room.ts` - TaskList binding in DO
