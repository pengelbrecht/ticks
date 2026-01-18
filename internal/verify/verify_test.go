package verify

import (
	"strings"
	"testing"
	"time"
)

func TestResult_String(t *testing.T) {
	tests := []struct {
		name   string
		result *Result
		want   string
	}{
		{
			name: "passed result",
			result: &Result{
				Verifier: "git",
				Passed:   true,
				Duration: 150 * time.Millisecond,
			},
			want: "[PASS] git (150ms)",
		},
		{
			name: "failed result",
			result: &Result{
				Verifier: "git",
				Passed:   false,
				Duration: 50 * time.Millisecond,
			},
			want: "[FAIL] git (50ms)",
		},
		{
			name: "result with sub-millisecond duration",
			result: &Result{
				Verifier: "git",
				Passed:   true,
				Duration: 500 * time.Microsecond,
			},
			want: "[PASS] git (1ms)", // rounds to nearest ms
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.result.String()
			if got != tt.want {
				t.Errorf("Result.String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNewResults(t *testing.T) {
	tests := []struct {
		name      string
		results   []*Result
		allPassed bool
	}{
		{
			name:      "empty results",
			results:   []*Result{},
			allPassed: true,
		},
		{
			name: "all passed",
			results: []*Result{
				{Verifier: "git", Passed: true},
			},
			allPassed: true,
		},
		{
			name: "one failed",
			results: []*Result{
				{Verifier: "git", Passed: false},
			},
			allPassed: false,
		},
		{
			name: "multiple with one failed",
			results: []*Result{
				{Verifier: "git", Passed: true},
				{Verifier: "test", Passed: false},
			},
			allPassed: false,
		},
		{
			name: "multiple all passed",
			results: []*Result{
				{Verifier: "git", Passed: true},
				{Verifier: "test", Passed: true},
			},
			allPassed: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewResults(tt.results)
			if got.AllPassed != tt.allPassed {
				t.Errorf("NewResults().AllPassed = %v, want %v", got.AllPassed, tt.allPassed)
			}
			if len(got.Results) != len(tt.results) {
				t.Errorf("NewResults().Results length = %d, want %d", len(got.Results), len(tt.results))
			}
		})
	}
}

func TestResults_Summary(t *testing.T) {
	tests := []struct {
		name        string
		results     *Results
		wantContain []string
	}{
		{
			name:        "empty results",
			results:     NewResults([]*Result{}),
			wantContain: []string{"No verifications run"},
		},
		{
			name: "single passed",
			results: NewResults([]*Result{
				{Verifier: "git", Passed: true, Duration: 100 * time.Millisecond},
			}),
			wantContain: []string{"Verification passed (1/1)", "[PASS] git"},
		},
		{
			name: "single failed with output",
			results: NewResults([]*Result{
				{
					Verifier: "git",
					Passed:   false,
					Duration: 50 * time.Millisecond,
					Output:   "M  file.go\n?? newfile.go",
				},
			}),
			wantContain: []string{
				"Verification failed (0/1 passed)",
				"[FAIL] git",
				"M  file.go",
				"newfile.go",
			},
		},
		{
			name: "mixed results",
			results: NewResults([]*Result{
				{Verifier: "git", Passed: true, Duration: 100 * time.Millisecond},
				{Verifier: "test", Passed: false, Duration: 200 * time.Millisecond, Output: "test failed"},
			}),
			wantContain: []string{
				"Verification failed (1/2 passed)",
				"[PASS] git",
				"[FAIL] test",
				"test failed",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.results.Summary()
			for _, want := range tt.wantContain {
				if !strings.Contains(got, want) {
					t.Errorf("Results.Summary() missing %q\nGot:\n%s", want, got)
				}
			}
		})
	}
}

func TestResults_FailedResults(t *testing.T) {
	tests := []struct {
		name      string
		results   *Results
		wantCount int
	}{
		{
			name:      "empty results",
			results:   NewResults([]*Result{}),
			wantCount: 0,
		},
		{
			name: "all passed",
			results: NewResults([]*Result{
				{Verifier: "git", Passed: true},
				{Verifier: "test", Passed: true},
			}),
			wantCount: 0,
		},
		{
			name: "all failed",
			results: NewResults([]*Result{
				{Verifier: "git", Passed: false},
				{Verifier: "test", Passed: false},
			}),
			wantCount: 2,
		},
		{
			name: "mixed results",
			results: NewResults([]*Result{
				{Verifier: "git", Passed: true},
				{Verifier: "test", Passed: false},
				{Verifier: "build", Passed: true},
			}),
			wantCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.results.FailedResults()
			if len(got) != tt.wantCount {
				t.Errorf("Results.FailedResults() count = %d, want %d", len(got), tt.wantCount)
			}
			// Verify all returned results are actually failed
			for _, r := range got {
				if r.Passed {
					t.Errorf("FailedResults() returned a passed result: %s", r.Verifier)
				}
			}
		})
	}
}
