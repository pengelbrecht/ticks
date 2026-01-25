# Worktree Merge to Parent Branch - Implementation Report

**Completed:** 2026-01-24
**GitHub Issue:** [#4](https://github.com/pengelbrecht/ticks/issues/4)
**Spec:** `2026-01-24-worktree-merge-spec.md`

## Summary

Implemented parent branch tracking for git worktrees, allowing worktrees to merge back to the branch they were created from instead of always merging to main/master.

## Changes Made

### 1. Parent Branch Storage (`.tk-metadata`)

Added JSON metadata file in each worktree directory:

```
.worktrees/<epic-id>/.tk-metadata
```

```json
{
  "parentBranch": "feature/auth",
  "createdAt": "2026-01-24T10:30:00Z"
}
```

**Files modified:**
- `internal/worktree/worktree.go`

**New types and functions:**
- `metadataFileName` constant (`.tk-metadata`)
- `worktreeMetadata` struct with `ParentBranch` and `CreatedAt` fields
- `getCurrentBranch(repoRoot string) string` - detects current branch (empty for detached HEAD)
- `writeMetadata(wtPath string, meta worktreeMetadata) error` - writes JSON metadata
- `readMetadata(wtPath string) string` - reads ParentBranch from metadata

### 2. Worktree Struct Update

Added `ParentBranch` field to track the originating branch:

```go
type Worktree struct {
    Path         string
    Branch       string
    EpicID       string
    ParentBranch string    // NEW: branch worktree was created from
    Created      time.Time
}
```

### 3. Manager.Create() Update

Now captures and stores the parent branch:

1. Calls `getCurrentBranch()` before creating worktree
2. Writes metadata file after worktree creation
3. Populates `ParentBranch` in returned struct

### 4. Manager.List() Update

Now reads metadata to populate `ParentBranch`:

```go
worktrees, err := m.parseWorktreeList(output)
for _, wt := range worktrees {
    wt.ParentBranch = readMetadata(wt.Path)
}
```

### 5. MergeManager Changes

**Files modified:**
- `internal/worktree/merge.go`

**New types:**
```go
type MergeOptions struct {
    TargetBranch string // Optional override for target branch
}

var ErrParentBranchNotFound = errors.New("parent branch no longer exists")
var ErrNoTargetBranch = errors.New("no target branch specified and no parent branch recorded")
```

**Updated MergeResult:**
```go
type MergeResult struct {
    Success      bool
    Merged       bool
    Conflicts    []string
    MergeCommit  string
    TargetBranch string   // NEW: the branch that was merged to
    ErrorMessage string
}
```

**Updated Merge() signature:**
```go
// Before
func (m *MergeManager) Merge(wt *Worktree) (*MergeResult, error)

// After
func (m *MergeManager) Merge(wt *Worktree, opts MergeOptions) (*MergeResult, error)
```

**Target branch resolution logic:**
1. If `opts.TargetBranch` is set → use it
2. Else if `wt.ParentBranch` is set → use it
3. Else → return `ErrNoTargetBranch`

**Branch existence check:**
- If target branch doesn't exist and came from `ParentBranch` → return `ErrParentBranchNotFound`
- If target branch doesn't exist and came from `opts` → return descriptive error

### 6. Parallel Runner Update

**Files modified:**
- `internal/parallel/runner.go`

Updated merge call and improved messaging:
```go
// Before
r.sendMessage("Merging " + epicID + " to main...")
mergeResult, mergeErr := r.config.MergeManager.Merge(wt)

// After
r.sendMessage("Merging " + epicID + "...")
mergeResult, mergeErr := r.config.MergeManager.Merge(wt, worktree.MergeOptions{})
if mergeResult.TargetBranch != "" {
    r.sendMessage("Merged " + epicID + " to " + mergeResult.TargetBranch)
}
```

## Tests Added

### worktree_test.go

| Test | Description |
|------|-------------|
| `TestGetCurrentBranch` | Verifies helper returns current branch name |
| `TestGetCurrentBranch_DetachedHead` | Verifies empty string for detached HEAD |
| `TestWriteReadMetadata` | Verifies JSON round-trip and graceful handling of missing/invalid files |
| `TestManager_Create_RecordsParentBranch` | Verifies metadata written on create |
| `TestManager_Create_DetachedHead` | Verifies empty parentBranch for detached HEAD |
| `TestManager_List_PopulatesParentBranch` | Verifies List() reads metadata |
| `TestManager_List_MissingMetadata` | Verifies graceful handling of missing metadata |

### merge_test.go

| Test | Description |
|------|-------------|
| `TestBranchExists` | Verifies branch existence helper |
| `TestMerge_UsesParentBranch` | Verifies merge uses ParentBranch when opts empty |
| `TestMerge_UsesOverride` | Verifies merge uses opts.TargetBranch when set |
| `TestMerge_OverrideTakesPrecedence` | Verifies opts takes precedence over ParentBranch |
| `TestMerge_ErrParentBranchNotFound` | Verifies error when parent branch deleted |
| `TestMerge_ErrNoTargetBranch` | Verifies error when no target available |
| `TestMerge_TargetBranchPopulated` | Verifies result.TargetBranch set on success/conflict |

## Verification

All tests pass:
```
ok  github.com/pengelbrecht/ticks/internal/worktree
ok  github.com/pengelbrecht/ticks/internal/parallel
```

## Usage Example

```go
// Create worktree while on feature/auth branch
wt, _ := manager.Create("epic-123")
// wt.ParentBranch == "feature/auth"

// Later, merge back to parent branch
result, err := mergeManager.Merge(wt, worktree.MergeOptions{})
// Merges to feature/auth (not main)

// Or override the target
result, err := mergeManager.Merge(wt, worktree.MergeOptions{
    TargetBranch: "develop",
})
// Merges to develop instead
```

## Breaking Changes

The `Merge()` method signature changed from:
```go
Merge(wt *Worktree) (*MergeResult, error)
```
to:
```go
Merge(wt *Worktree, opts MergeOptions) (*MergeResult, error)
```

All callers must be updated to pass `MergeOptions{}` (or with a specific `TargetBranch`).
