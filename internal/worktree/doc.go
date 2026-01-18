// Package worktree manages git worktrees for parallel epic execution.
//
// Worktrees allow ticker to run multiple epics simultaneously in isolated
// working directories, each with its own branch. This prevents conflicts
// between concurrent agents working on different tasks.
//
// # Worktree Lifecycle
//
// Each epic gets its own worktree under .worktrees/<epic-id>/ with a
// corresponding branch named ticker/<epic-id>. The branch is created from
// the current HEAD (usually main) when the worktree is created.
//
// After an epic completes successfully, its worktree can be merged back
// to main and then cleaned up.
//
// # Usage
//
//	manager, err := worktree.NewManager("/path/to/repo")
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Create worktree for an epic
//	wt, err := manager.Create("abc123")
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Work in wt.Path...
//
//	// Clean up when done
//	if err := manager.Remove("abc123"); err != nil {
//	    log.Fatal(err)
//	}
package worktree
