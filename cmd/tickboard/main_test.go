package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFindTickDir(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T) string
		wantErr   bool
		errSubstr string
	}{
		{
			name: "valid .tick directory",
			setup: func(t *testing.T) string {
				tmpDir := t.TempDir()
				tickDir := filepath.Join(tmpDir, ".tick")
				if err := os.Mkdir(tickDir, 0755); err != nil {
					t.Fatalf("failed to create .tick dir: %v", err)
				}
				return tmpDir
			},
			wantErr: false,
		},
		{
			name: "no .tick directory",
			setup: func(t *testing.T) string {
				return t.TempDir()
			},
			wantErr:   true,
			errSubstr: "no .tick directory found",
		},
		{
			name: ".tick is a file not directory",
			setup: func(t *testing.T) string {
				tmpDir := t.TempDir()
				tickFile := filepath.Join(tmpDir, ".tick")
				if err := os.WriteFile(tickFile, []byte("not a dir"), 0644); err != nil {
					t.Fatalf("failed to create .tick file: %v", err)
				}
				return tmpDir
			},
			wantErr:   true,
			errSubstr: "not a directory",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := tt.setup(t)
			got, err := findTickDir(path)

			if tt.wantErr {
				if err == nil {
					t.Errorf("findTickDir() error = nil, want error containing %q", tt.errSubstr)
				} else if tt.errSubstr != "" && !contains(err.Error(), tt.errSubstr) {
					t.Errorf("findTickDir() error = %q, want error containing %q", err.Error(), tt.errSubstr)
				}
				return
			}

			if err != nil {
				t.Errorf("findTickDir() unexpected error = %v", err)
				return
			}

			expectedTickDir := filepath.Join(path, ".tick")
			if got != expectedTickDir {
				t.Errorf("findTickDir() = %q, want %q", got, expectedTickDir)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr))
}

func containsAt(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
