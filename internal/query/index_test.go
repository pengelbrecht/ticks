package query

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestSaveLoadIndex(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".index.json")

	ticks := []tick.Tick{{ID: "a1b"}}
	if err := SaveIndex(path, ticks); err != nil {
		t.Fatalf("save index: %v", err)
	}

	idx, err := LoadIndex(path)
	if err != nil {
		t.Fatalf("load index: %v", err)
	}
	if len(idx.Ticks) != 1 || idx.Ticks[0].ID != "a1b" {
		t.Fatalf("unexpected ticks: %+v", idx.Ticks)
	}
}

func TestNeedsRebuild(t *testing.T) {
	dir := t.TempDir()
	indexPath := filepath.Join(dir, ".index.json")
	issuesDir := filepath.Join(dir, "issues")
	if err := os.MkdirAll(issuesDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	if rebuild, err := NeedsRebuild(indexPath, issuesDir); err != nil || !rebuild {
		t.Fatalf("expected rebuild for missing index")
	}

	if err := SaveIndex(indexPath, nil); err != nil {
		t.Fatalf("save index: %v", err)
	}

	issuePath := filepath.Join(issuesDir, "a1b.json")
	if err := os.WriteFile(issuePath, []byte("{}"), 0o644); err != nil {
		t.Fatalf("write issue: %v", err)
	}
	future := time.Now().Add(2 * time.Second)
	if err := os.Chtimes(issuePath, future, future); err != nil {
		t.Fatalf("chtimes: %v", err)
	}

	rebuild, err := NeedsRebuild(indexPath, issuesDir)
	if err != nil {
		t.Fatalf("needs rebuild: %v", err)
	}
	if !rebuild {
		t.Fatalf("expected rebuild when issue is newer")
	}
}
