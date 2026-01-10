package beads

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// ImportResult contains the results of an import operation.
type ImportResult struct {
	Imported int
	Skipped  int
	IDMap    map[string]string // beads ID -> tick ID
}

// Import converts beads issues to ticks and writes them to the store.
func Import(issues []Issue, store *tick.Store, owner string) (*ImportResult, error) {
	gen := tick.NewIDGenerator(nil)
	result := &ImportResult{
		IDMap: make(map[string]string),
	}

	// Filter to importable issues
	importable := FilterImportable(issues)
	result.Skipped = len(issues) - len(importable)

	// First pass: generate new IDs for all issues
	for _, issue := range importable {
		newID, _, err := gen.Generate(func(candidate string) bool {
			// Check if ID exists in store or in our new IDs
			if _, err := store.Read(candidate); err == nil {
				return true
			}
			for _, existingID := range result.IDMap {
				if existingID == candidate {
					return true
				}
			}
			return false
		}, 3)
		if err != nil {
			return nil, fmt.Errorf("failed to generate ID for %s: %w", issue.ID, err)
		}
		result.IDMap[issue.ID] = newID
	}

	// Second pass: convert and write issues with remapped IDs
	for _, issue := range importable {
		t := convertIssue(issue, result.IDMap, owner)
		if err := store.Write(t); err != nil {
			return nil, fmt.Errorf("failed to write tick %s: %w", t.ID, err)
		}
		result.Imported++
	}

	return result, nil
}

// convertIssue converts a beads issue to a tick with remapped IDs.
func convertIssue(issue Issue, idMap map[string]string, owner string) tick.Tick {
	newID := idMap[issue.ID]

	status := mapStatus(issue.Status)
	issueType := mapType(issue.IssueType)

	// Extract relationships from dependencies
	var parent string
	var blockedBy []string
	var discoveredFrom string

	for _, dep := range issue.Dependencies {
		remappedID, ok := idMap[dep.DependsOnID]
		if !ok {
			// Referenced issue wasn't imported (probably closed)
			continue
		}
		switch dep.Type {
		case "parent-child":
			parent = remappedID
		case "blocks":
			blockedBy = append(blockedBy, remappedID)
		case "discovered-from":
			discoveredFrom = remappedID
		}
	}

	// Use provided owner (git user), not beads assignee
	tickOwner := owner
	if tickOwner == "" {
		tickOwner = issue.Assignee
	}

	return tick.Tick{
		ID:                 newID,
		Title:              issue.Title,
		Description:        issue.Description,
		Notes:              issue.Notes,
		Status:             status,
		Priority:           issue.Priority,
		Type:               issueType,
		Owner:              tickOwner,
		Labels:             issue.Labels,
		BlockedBy:          blockedBy,
		Parent:             parent,
		DiscoveredFrom:     discoveredFrom,
		AcceptanceCriteria: issue.AcceptanceCriteria,
		DeferUntil:         issue.DeferUntil,
		ExternalRef:        issue.ExternalRef,
		CreatedBy:          owner, // Use current git user
		CreatedAt:          issue.CreatedAt,
		UpdatedAt:          issue.UpdatedAt,
		ClosedAt:           issue.ClosedAt,
		ClosedReason:       issue.CloseReason,
	}
}

// FindBeadsFile looks for the beads JSONL file in the given directory.
func FindBeadsFile(root string) string {
	// Try common locations
	paths := []string{
		filepath.Join(root, ".beads", "issues.jsonl"),
		filepath.Join(root, ".beads", "beads.jsonl"),
	}
	for _, p := range paths {
		if fileExists(p) {
			return p
		}
	}
	return ""
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// mapStatus converts a beads status to a tick status.
// Blocked, deferred, pinned, and hooked statuses map to open.
func mapStatus(status string) string {
	switch status {
	case "in_progress":
		return tick.StatusInProgress
	default:
		return tick.StatusOpen
	}
}

// mapType converts a beads issue type to a tick type.
// Unknown types default to task.
func mapType(issueType string) string {
	switch issueType {
	case tick.TypeBug, tick.TypeFeature, tick.TypeTask, tick.TypeEpic, tick.TypeChore:
		return issueType
	default:
		return tick.TypeTask
	}
}
