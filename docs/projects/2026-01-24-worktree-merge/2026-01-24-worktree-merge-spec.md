# Worktree Merge to Parent Branch Specification

**Created:** 2026-01-24
**Status:** Ready

## Problem

**GitHub Issue:** [#4 - Worktrees should merge back to parent branch, not always to main](https://github.com/pengelbrecht/ticks/issues/4)

When a worktree is created from a feature branch and later merged back, it always merges to `main`/`master` regardless of which branch it was created from. This breaks normal development workflows.

**Example:**
1. User is on branch `feature/auth`
2. Creates worktree for epic `abc123` → branch `tick/abc123` created from `feature/auth`
3. Agent completes work in the worktree
4. Merge happens → `tick/abc123` merges into `main` (wrong)
5. Expected: merge into `feature/auth` (the parent branch)

## Overview

Enhance the worktree system to track and merge back to the parent branch (the branch that was checked out when the worktree was created) instead of always merging to main/master.

## Design Decisions

### 1. Parent Branch Storage

Store metadata in a JSON file within the worktree directory:
```
.worktrees/<epic-id>/.tk-metadata
```

```go
type worktreeMetadata struct {
    ParentBranch string    `json:"parentBranch"`
    CreatedAt    time.Time `json:"createdAt"`
}
```

**Rationale:** JSON is extensible for future metadata fields.

### 2. Fallback Behavior

If the parent branch no longer exists at merge time: **fail with an explicit error** (`ErrParentBranchNotFound`).

If no parent branch was recorded (e.g., worktree created from detached HEAD): **fail with a different error** (`ErrNoTargetBranch`).

No silent fallback to main/master. The user must explicitly specify a target branch via `MergeOptions`.

**Rationale:** Explicit failure prevents unexpected behavior and forces the user to make a conscious decision.

### 3. Override Capability

The `Merge()` method accepts a `MergeOptions` struct that allows overriding the target branch:

```go
type MergeOptions struct {
    TargetBranch string // Optional: override parent branch. Empty = use parent.
}

func (m *MergeManager) Merge(wt *Worktree, opts MergeOptions) (*MergeResult, error)
```

**Rationale:** Extensible for future options without breaking the API.

### 4. MainBranch Detection

Keep the `mainBranch` field and `MainBranch()` method on `MergeManager`. This is still useful for:
- Conflict resolution logic (`isBranchMerged` checks against main)
- Error messages suggesting main as an alternative
- Future `MergeOptions.FallbackToMain` if desired

The key change is that `Merge()` won't automatically use it.

## Implementation

### Changes to `Worktree` struct

Add `ParentBranch` field:

```go
type Worktree struct {
    Path         string
    Branch       string
    EpicID       string
    ParentBranch string    // Branch worktree was created from (empty if detached HEAD)
    Created      time.Time
}
```

### Changes to `worktree.go`

1. Add `metadataFileName` constant (`.tk-metadata`)
2. Add `worktreeMetadata` struct
3. Add `getCurrentBranch(repoRoot string) string` helper
4. Add `writeMetadata(wtPath string, meta worktreeMetadata) error` helper
5. Add `readMetadata(wtPath string) string` helper (returns ParentBranch or empty)
6. Update `Manager.Create()` to:
   - Detect current branch before creating worktree
   - Write metadata file after worktree creation
   - Populate `ParentBranch` in returned `Worktree`
7. Update `Manager.List()` to read metadata and populate `ParentBranch`

### Changes to `MergeResult`

Add `TargetBranch` field:

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

### Changes to `MergeManager`

1. Add `MergeOptions` struct
2. Update `Merge(wt *Worktree)` to `Merge(wt *Worktree, opts MergeOptions)`
3. Implement target branch resolution:
   - If `opts.TargetBranch` is set, use it
   - Else if `wt.ParentBranch` is set, use it
   - Else return `ErrNoTargetBranch`
4. Check target branch exists, return `ErrParentBranchNotFound` if not
5. Rename `checkoutMain()` to `checkoutBranch(branch string)`
6. Populate `TargetBranch` in all `MergeResult` returns

### New Errors

```go
var ErrParentBranchNotFound = errors.New("parent branch no longer exists")
var ErrNoTargetBranch = errors.New("no target branch specified and no parent branch recorded")
```

### Callers to Update

Production code:
- `internal/parallel/runner.go:231` - `r.config.MergeManager.Merge(wt)` → `Merge(wt, worktree.MergeOptions{})`
  - Also update message from "Merging to main..." to use `result.TargetBranch`

Test files:
- `internal/worktree/merge_test.go` - 6 call sites
- `internal/worktree/conflict_test.go` - 1 call site

## Test Cases

### Metadata Storage Tests

1. **Create from feature branch** - Create worktree while on `feature/auth`, verify `.tk-metadata` contains `{"parentBranch": "feature/auth", ...}`
2. **Create from main** - Create worktree while on `main`, verify parent is `main`
3. **Create from detached HEAD** - Checkout a commit hash, create worktree, verify `parentBranch` is empty string
4. **List populates ParentBranch** - Create worktree, call `List()`, verify `ParentBranch` field is populated

### Merge Target Resolution Tests

5. **Merge to parent branch** - Create from `feature/auth`, merge with empty options, verify merges to `feature/auth`
6. **Merge with override** - Create from `feature/auth`, merge with `TargetBranch: "develop"`, verify merges to `develop`
7. **Override takes precedence** - Create from `feature/auth`, merge with `TargetBranch: "main"`, verify merges to `main` not `feature/auth`

### Error Cases

8. **Parent branch deleted** - Create from `feature/temp`, delete `feature/temp`, attempt merge → `ErrParentBranchNotFound`
9. **No parent recorded** - Create from detached HEAD (empty parent), attempt merge with empty options → `ErrNoTargetBranch`
10. **Override to nonexistent branch** - Merge with `TargetBranch: "nonexistent"` → error (branch doesn't exist)

### MergeResult.TargetBranch Tests

11. **TargetBranch populated on success** - Merge succeeds, verify `result.TargetBranch` equals the branch merged to
12. **TargetBranch populated on conflict** - Merge conflicts, verify `result.TargetBranch` still populated

### Integration Tests

13. **Parallel runner uses parent branch** - Run epic via parallel runner from feature branch, verify merge goes to feature branch

## References

- `internal/worktree/worktree.go` - Worktree struct and Manager
- `internal/worktree/merge.go` - MergeManager implementation
- `internal/parallel/runner.go` - Parallel runner (caller of Merge)
