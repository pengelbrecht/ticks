package generated

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// getFixturePath returns the absolute path to a fixture file.
func getFixturePath(name string) string {
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	return filepath.Join(dir, "..", "..", "..", "schemas", "fixtures", name)
}

// TestTickSchema_Roundtrip tests that the Tick type can deserialize and re-serialize a fixture.
func TestTickSchema_Roundtrip(t *testing.T) {
	data, err := os.ReadFile(getFixturePath("tick.json"))
	if err != nil {
		t.Fatalf("Failed to read fixture: %v", err)
	}

	var tick TickSchema
	if err := json.Unmarshal(data, &tick); err != nil {
		t.Fatalf("Failed to unmarshal tick: %v", err)
	}

	// Verify required fields
	if tick.Id == "" {
		t.Error("Expected tick.Id to be set")
	}
	if tick.Title == "" {
		t.Error("Expected tick.Title to be set")
	}
	if tick.Status == "" {
		t.Error("Expected tick.Status to be set")
	}
	if tick.Type == "" {
		t.Error("Expected tick.Type to be set")
	}

	// Verify enum values
	if tick.Status != TickStatusInProgress {
		t.Errorf("Expected status 'in_progress', got %q", tick.Status)
	}
	if tick.Type != TickTypeTask {
		t.Errorf("Expected type 'task', got %q", tick.Type)
	}
	if tick.Requires != nil && *tick.Requires != TickRequiresApproval {
		t.Errorf("Expected requires 'approval', got %q", *tick.Requires)
	}
	if tick.Awaiting != nil && *tick.Awaiting != TickAwaitingReview {
		t.Errorf("Expected awaiting 'review', got %q", *tick.Awaiting)
	}

	// Verify optional fields
	if tick.Description == nil || *tick.Description == "" {
		t.Error("Expected tick.Description to be set")
	}
	if len(tick.Labels) != 2 {
		t.Errorf("Expected 2 labels, got %d", len(tick.Labels))
	}
	if len(tick.BlockedBy) != 1 {
		t.Errorf("Expected 1 blocker, got %d", len(tick.BlockedBy))
	}

	// Re-serialize and verify it's valid JSON
	output, err := json.Marshal(tick)
	if err != nil {
		t.Fatalf("Failed to marshal tick: %v", err)
	}
	if len(output) == 0 {
		t.Error("Expected non-empty JSON output")
	}

	t.Logf("Roundtrip successful, output size: %d bytes", len(output))
}

// TestAPIResponses_Roundtrip tests API response types deserialization.
func TestAPIResponses_Roundtrip(t *testing.T) {
	data, err := os.ReadFile(getFixturePath("api-responses.json"))
	if err != nil {
		t.Fatalf("Failed to read fixture: %v", err)
	}

	var fixtures struct {
		InfoResponse      InfoResponse      `json:"infoResponse"`
		ListTicksResponse ListTicksResponse `json:"listTicksResponse"`
		TickResponse      TickResponse      `json:"tickResponse"`
		GetTickResponse   GetTickResponse   `json:"getTickResponse"`
	}

	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatalf("Failed to unmarshal fixtures: %v", err)
	}

	t.Run("InfoResponse", func(t *testing.T) {
		info := fixtures.InfoResponse
		if info.RepoName != "owner/repo" {
			t.Errorf("Expected repoName 'owner/repo', got %q", info.RepoName)
		}
		if len(info.Epics) != 2 {
			t.Errorf("Expected 2 epics, got %d", len(info.Epics))
		}
	})

	t.Run("ListTicksResponse", func(t *testing.T) {
		list := fixtures.ListTicksResponse
		if len(list.Ticks) != 2 {
			t.Errorf("Expected 2 ticks, got %d", len(list.Ticks))
		}
		// Check computed fields
		if list.Ticks[0].IsBlocked {
			t.Error("Expected first tick to not be blocked")
		}
		if list.Ticks[0].Column != "ready" {
			t.Errorf("Expected column 'ready', got %q", list.Ticks[0].Column)
		}
		if !list.Ticks[1].IsBlocked {
			t.Error("Expected second tick to be blocked")
		}
	})

	t.Run("TickResponse", func(t *testing.T) {
		tick := fixtures.TickResponse
		if tick.Column != "human" {
			t.Errorf("Expected column 'human', got %q", tick.Column)
		}
	})

	t.Run("GetTickResponse", func(t *testing.T) {
		tick := fixtures.GetTickResponse
		if len(tick.NotesList) != 1 {
			t.Errorf("Expected 1 note, got %d", len(tick.NotesList))
		}
		if len(tick.BlockerDetails) != 1 {
			t.Errorf("Expected 1 blocker detail, got %d", len(tick.BlockerDetails))
		}
		if tick.BlockerDetails[0].Title != "Blocking task" {
			t.Errorf("Expected blocker title 'Blocking task', got %q", tick.BlockerDetails[0].Title)
		}
	})
}
