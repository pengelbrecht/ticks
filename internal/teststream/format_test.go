package teststream

import (
	"testing"
	"time"
)

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		name     string
		duration time.Duration
		expected string
	}{
		{
			name:     "90 seconds",
			duration: 90 * time.Second,
			expected: "1m 30s",
		},
		{
			name:     "45 seconds",
			duration: 45 * time.Second,
			expected: "45s",
		},
		{
			name:     "3600 seconds (1 hour)",
			duration: 3600 * time.Second,
			expected: "1h 0m 0s",
		},
		{
			name:     "zero duration",
			duration: 0,
			expected: "0s",
		},
		{
			name:     "1 hour 30 minutes 45 seconds",
			duration: 1*time.Hour + 30*time.Minute + 45*time.Second,
			expected: "1h 30m 45s",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FormatDuration(tt.duration)
			if result != tt.expected {
				t.Errorf("FormatDuration(%v) = %q, want %q", tt.duration, result, tt.expected)
			}
		})
	}
}
