package budget

import (
	"testing"
	"time"
)

func TestNewTracker(t *testing.T) {
	limits := Limits{
		MaxIterations: 10,
		MaxTokens:     1000,
		MaxCost:       1.0,
		MaxDuration:   time.Hour,
	}

	tracker := NewTracker(limits)

	if tracker.limits.MaxIterations != 10 {
		t.Errorf("MaxIterations = %d, want 10", tracker.limits.MaxIterations)
	}
	if tracker.limits.MaxTokens != 1000 {
		t.Errorf("MaxTokens = %d, want 1000", tracker.limits.MaxTokens)
	}
	if tracker.limits.MaxCost != 1.0 {
		t.Errorf("MaxCost = %f, want 1.0", tracker.limits.MaxCost)
	}
	if tracker.limits.MaxDuration != time.Hour {
		t.Errorf("MaxDuration = %v, want 1h", tracker.limits.MaxDuration)
	}
	if tracker.usage.Iterations != 0 {
		t.Errorf("initial Iterations = %d, want 0", tracker.usage.Iterations)
	}
}

func TestTracker_Add(t *testing.T) {
	tracker := NewTracker(Limits{})

	tracker.Add(100, 50, 0.01)
	usage := tracker.Usage()

	if usage.Iterations != 1 {
		t.Errorf("Iterations = %d, want 1", usage.Iterations)
	}
	if usage.TokensIn != 100 {
		t.Errorf("TokensIn = %d, want 100", usage.TokensIn)
	}
	if usage.TokensOut != 50 {
		t.Errorf("TokensOut = %d, want 50", usage.TokensOut)
	}
	if usage.Cost != 0.01 {
		t.Errorf("Cost = %f, want 0.01", usage.Cost)
	}

	// Add more usage
	tracker.Add(200, 100, 0.02)
	usage = tracker.Usage()

	if usage.Iterations != 2 {
		t.Errorf("Iterations = %d, want 2", usage.Iterations)
	}
	if usage.TokensIn != 300 {
		t.Errorf("TokensIn = %d, want 300", usage.TokensIn)
	}
	if usage.TokensOut != 150 {
		t.Errorf("TokensOut = %d, want 150", usage.TokensOut)
	}
	if usage.Cost != 0.03 {
		t.Errorf("Cost = %f, want 0.03", usage.Cost)
	}
}

func TestTracker_AddIteration(t *testing.T) {
	tracker := NewTracker(Limits{})

	tracker.AddIteration()
	tracker.AddIteration()
	usage := tracker.Usage()

	if usage.Iterations != 2 {
		t.Errorf("Iterations = %d, want 2", usage.Iterations)
	}
	if usage.TokensIn != 0 {
		t.Errorf("TokensIn = %d, want 0", usage.TokensIn)
	}
}

func TestUsage_TotalTokens(t *testing.T) {
	usage := Usage{TokensIn: 100, TokensOut: 50}
	if usage.TotalTokens() != 150 {
		t.Errorf("TotalTokens() = %d, want 150", usage.TotalTokens())
	}
}

func TestTracker_ShouldStop_Iterations(t *testing.T) {
	tracker := NewTracker(Limits{MaxIterations: 3})

	// Should not stop initially
	shouldStop, reason := tracker.ShouldStop()
	if shouldStop {
		t.Errorf("ShouldStop() = true before limit, reason: %s", reason)
	}

	// Add iterations up to limit
	tracker.Add(0, 0, 0) // iteration 1
	tracker.Add(0, 0, 0) // iteration 2

	shouldStop, reason = tracker.ShouldStop()
	if shouldStop {
		t.Errorf("ShouldStop() = true at 2/3 iterations, reason: %s", reason)
	}

	tracker.Add(0, 0, 0) // iteration 3 (at limit)

	shouldStop, reason = tracker.ShouldStop()
	if !shouldStop {
		t.Error("ShouldStop() = false at iteration limit")
	}
	if reason == "" {
		t.Error("ShouldStop() returned empty reason at limit")
	}
}

func TestTracker_ShouldStop_Tokens(t *testing.T) {
	tracker := NewTracker(Limits{MaxTokens: 1000})

	tracker.Add(400, 200, 0) // 600 tokens
	shouldStop, _ := tracker.ShouldStop()
	if shouldStop {
		t.Error("ShouldStop() = true before token limit")
	}

	tracker.Add(300, 200, 0) // 1100 tokens total (over limit)
	shouldStop, reason := tracker.ShouldStop()
	if !shouldStop {
		t.Error("ShouldStop() = false at token limit")
	}
	if reason == "" {
		t.Error("ShouldStop() returned empty reason at token limit")
	}
}

func TestTracker_ShouldStop_Cost(t *testing.T) {
	tracker := NewTracker(Limits{MaxCost: 1.0})

	tracker.Add(0, 0, 0.5) // $0.50
	shouldStop, _ := tracker.ShouldStop()
	if shouldStop {
		t.Error("ShouldStop() = true before cost limit")
	}

	tracker.Add(0, 0, 0.6) // $1.10 total (over limit)
	shouldStop, reason := tracker.ShouldStop()
	if !shouldStop {
		t.Error("ShouldStop() = false at cost limit")
	}
	if reason == "" {
		t.Error("ShouldStop() returned empty reason at cost limit")
	}
}

func TestTracker_ShouldStop_Duration(t *testing.T) {
	tracker := NewTracker(Limits{MaxDuration: 50 * time.Millisecond})

	shouldStop, _ := tracker.ShouldStop()
	if shouldStop {
		t.Error("ShouldStop() = true before duration limit")
	}

	// Wait for duration to exceed
	time.Sleep(60 * time.Millisecond)

	shouldStop, reason := tracker.ShouldStop()
	if !shouldStop {
		t.Error("ShouldStop() = false at duration limit")
	}
	if reason == "" {
		t.Error("ShouldStop() returned empty reason at duration limit")
	}
}

func TestTracker_ShouldStop_NoLimits(t *testing.T) {
	tracker := NewTracker(Limits{}) // No limits set

	// Should never stop
	tracker.Add(1000000, 1000000, 1000.0)
	shouldStop, reason := tracker.ShouldStop()
	if shouldStop {
		t.Errorf("ShouldStop() = true with no limits set, reason: %s", reason)
	}
}

func TestTracker_Remaining_WithLimits(t *testing.T) {
	tracker := NewTracker(Limits{
		MaxIterations: 10,
		MaxTokens:     1000,
		MaxCost:       5.0,
		MaxDuration:   time.Hour,
	})

	tracker.Add(100, 50, 1.0) // 150 tokens, $1.0, 1 iteration

	rem := tracker.Remaining()

	if rem.Iterations != 9 {
		t.Errorf("Remaining.Iterations = %d, want 9", rem.Iterations)
	}
	if rem.Tokens != 850 {
		t.Errorf("Remaining.Tokens = %d, want 850", rem.Tokens)
	}
	if rem.Cost != 4.0 {
		t.Errorf("Remaining.Cost = %f, want 4.0", rem.Cost)
	}
	// Duration is hard to test precisely, just check it's positive
	if rem.Duration <= 0 {
		t.Errorf("Remaining.Duration = %v, want > 0", rem.Duration)
	}
}

func TestTracker_Remaining_NoLimits(t *testing.T) {
	tracker := NewTracker(Limits{}) // No limits

	rem := tracker.Remaining()

	if rem.Iterations != -1 {
		t.Errorf("Remaining.Iterations = %d, want -1 (unlimited)", rem.Iterations)
	}
	if rem.Tokens != -1 {
		t.Errorf("Remaining.Tokens = %d, want -1 (unlimited)", rem.Tokens)
	}
	if rem.Cost != -1 {
		t.Errorf("Remaining.Cost = %f, want -1 (unlimited)", rem.Cost)
	}
	if rem.Duration != -1 {
		t.Errorf("Remaining.Duration = %v, want -1 (unlimited)", rem.Duration)
	}
}

func TestTracker_Remaining_Exhausted(t *testing.T) {
	tracker := NewTracker(Limits{
		MaxIterations: 2,
		MaxTokens:     100,
	})

	// Exceed limits
	tracker.Add(60, 60, 0) // 120 tokens, 1 iteration
	tracker.Add(60, 60, 0) // 240 tokens, 2 iterations

	rem := tracker.Remaining()

	if rem.Iterations != 0 {
		t.Errorf("Remaining.Iterations = %d, want 0", rem.Iterations)
	}
	if rem.Tokens != 0 {
		t.Errorf("Remaining.Tokens = %d, want 0", rem.Tokens)
	}
}

func TestTracker_Limits(t *testing.T) {
	limits := Limits{
		MaxIterations: 5,
		MaxTokens:     500,
		MaxCost:       2.5,
		MaxDuration:   30 * time.Minute,
	}

	tracker := NewTracker(limits)
	got := tracker.Limits()

	if got.MaxIterations != limits.MaxIterations {
		t.Errorf("Limits().MaxIterations = %d, want %d", got.MaxIterations, limits.MaxIterations)
	}
	if got.MaxTokens != limits.MaxTokens {
		t.Errorf("Limits().MaxTokens = %d, want %d", got.MaxTokens, limits.MaxTokens)
	}
	if got.MaxCost != limits.MaxCost {
		t.Errorf("Limits().MaxCost = %f, want %f", got.MaxCost, limits.MaxCost)
	}
	if got.MaxDuration != limits.MaxDuration {
		t.Errorf("Limits().MaxDuration = %v, want %v", got.MaxDuration, limits.MaxDuration)
	}
}

func TestTracker_Usage(t *testing.T) {
	tracker := NewTracker(Limits{})

	tracker.Add(100, 50, 0.5)
	usage := tracker.Usage()

	if usage.Iterations != 1 {
		t.Errorf("Usage().Iterations = %d, want 1", usage.Iterations)
	}
	if usage.TokensIn != 100 {
		t.Errorf("Usage().TokensIn = %d, want 100", usage.TokensIn)
	}
	if usage.TokensOut != 50 {
		t.Errorf("Usage().TokensOut = %d, want 50", usage.TokensOut)
	}
	if usage.Cost != 0.5 {
		t.Errorf("Usage().Cost = %f, want 0.5", usage.Cost)
	}
	if usage.StartTime.IsZero() {
		t.Error("Usage().StartTime should not be zero")
	}
}

func TestTracker_ConcurrentAccess(t *testing.T) {
	tracker := NewTracker(Limits{MaxIterations: 1000})

	done := make(chan bool)
	for i := 0; i < 10; i++ {
		go func() {
			for j := 0; j < 100; j++ {
				tracker.Add(1, 1, 0.001)
				tracker.ShouldStop()
				tracker.Remaining()
				tracker.Usage()
			}
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	usage := tracker.Usage()
	if usage.Iterations != 1000 {
		t.Errorf("After concurrent access, Iterations = %d, want 1000", usage.Iterations)
	}
}

func TestTracker_AddForEpic(t *testing.T) {
	tracker := NewTracker(Limits{})

	tracker.AddForEpic("epic1", 100, 50, 0.01)
	tracker.AddForEpic("epic1", 200, 100, 0.02)
	tracker.AddForEpic("epic2", 50, 25, 0.005)

	// Check total usage
	usage := tracker.Usage()
	if usage.Iterations != 3 {
		t.Errorf("Iterations = %d, want 3", usage.Iterations)
	}
	if usage.TokensIn != 350 {
		t.Errorf("TokensIn = %d, want 350", usage.TokensIn)
	}
	if usage.TokensOut != 175 {
		t.Errorf("TokensOut = %d, want 175", usage.TokensOut)
	}
	expectedCost := 0.035
	if usage.Cost < expectedCost-0.0001 || usage.Cost > expectedCost+0.0001 {
		t.Errorf("Cost = %f, want %f", usage.Cost, expectedCost)
	}

	// Check epic1 usage
	epic1 := tracker.UsageForEpic("epic1")
	if epic1 == nil {
		t.Fatal("UsageForEpic(epic1) returned nil")
	}
	if epic1.EpicID != "epic1" {
		t.Errorf("epic1.EpicID = %q, want %q", epic1.EpicID, "epic1")
	}
	if epic1.Iterations != 2 {
		t.Errorf("epic1.Iterations = %d, want 2", epic1.Iterations)
	}
	if epic1.TokensIn != 300 {
		t.Errorf("epic1.TokensIn = %d, want 300", epic1.TokensIn)
	}
	if epic1.TokensOut != 150 {
		t.Errorf("epic1.TokensOut = %d, want 150", epic1.TokensOut)
	}
	if epic1.Cost != 0.03 {
		t.Errorf("epic1.Cost = %f, want 0.03", epic1.Cost)
	}

	// Check epic2 usage
	epic2 := tracker.UsageForEpic("epic2")
	if epic2 == nil {
		t.Fatal("UsageForEpic(epic2) returned nil")
	}
	if epic2.Iterations != 1 {
		t.Errorf("epic2.Iterations = %d, want 1", epic2.Iterations)
	}
	if epic2.TokensIn != 50 {
		t.Errorf("epic2.TokensIn = %d, want 50", epic2.TokensIn)
	}
}

func TestTracker_UsageForEpic_Unknown(t *testing.T) {
	tracker := NewTracker(Limits{})

	epic := tracker.UsageForEpic("unknown")
	if epic != nil {
		t.Error("UsageForEpic(unknown) should return nil")
	}
}

func TestTracker_UsageForEpic_ReturnsCopy(t *testing.T) {
	tracker := NewTracker(Limits{})
	tracker.AddForEpic("epic1", 100, 50, 0.01)

	epic1 := tracker.UsageForEpic("epic1")
	epic1.TokensIn = 9999

	// Verify original is unchanged
	epic1Again := tracker.UsageForEpic("epic1")
	if epic1Again.TokensIn != 100 {
		t.Error("UsageForEpic should return a copy, not the original")
	}
}

func TestTracker_AllEpicUsage(t *testing.T) {
	tracker := NewTracker(Limits{})

	tracker.AddForEpic("epic1", 100, 50, 0.01)
	tracker.AddForEpic("epic2", 200, 100, 0.02)
	tracker.AddForEpic("epic3", 300, 150, 0.03)

	all := tracker.AllEpicUsage()

	if len(all) != 3 {
		t.Errorf("AllEpicUsage returned %d epics, want 3", len(all))
	}

	for epicID, expected := range map[string]int{
		"epic1": 100,
		"epic2": 200,
		"epic3": 300,
	} {
		epic, ok := all[epicID]
		if !ok {
			t.Errorf("AllEpicUsage missing %s", epicID)
			continue
		}
		if epic.TokensIn != expected {
			t.Errorf("%s.TokensIn = %d, want %d", epicID, epic.TokensIn, expected)
		}
	}
}

func TestTracker_AllEpicUsage_Empty(t *testing.T) {
	tracker := NewTracker(Limits{})

	all := tracker.AllEpicUsage()

	if len(all) != 0 {
		t.Errorf("AllEpicUsage returned %d epics, want 0", len(all))
	}
}

func TestTracker_AllEpicUsage_ReturnsCopy(t *testing.T) {
	tracker := NewTracker(Limits{})
	tracker.AddForEpic("epic1", 100, 50, 0.01)

	all := tracker.AllEpicUsage()
	all["epic1"].TokensIn = 9999

	// Verify original is unchanged
	allAgain := tracker.AllEpicUsage()
	if allAgain["epic1"].TokensIn != 100 {
		t.Error("AllEpicUsage should return copies, not the originals")
	}
}

func TestTracker_ConcurrentAddForEpic(t *testing.T) {
	tracker := NewTracker(Limits{MaxIterations: 1000})

	done := make(chan bool)
	epics := []string{"epic1", "epic2", "epic3"}

	// 10 goroutines, each adding 100 iterations across 3 epics
	for i := 0; i < 10; i++ {
		go func(worker int) {
			for j := 0; j < 100; j++ {
				epicID := epics[j%3]
				tracker.AddForEpic(epicID, 1, 1, 0.001)
				tracker.ShouldStop()
				tracker.UsageForEpic(epicID)
				tracker.AllEpicUsage()
			}
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify total usage
	usage := tracker.Usage()
	if usage.Iterations != 1000 {
		t.Errorf("After concurrent AddForEpic, Iterations = %d, want 1000", usage.Iterations)
	}

	// Verify per-epic usage sums to total
	all := tracker.AllEpicUsage()
	totalIterations := 0
	for _, epic := range all {
		totalIterations += epic.Iterations
	}
	if totalIterations != 1000 {
		t.Errorf("Sum of per-epic iterations = %d, want 1000", totalIterations)
	}
}

func TestTracker_ShouldStop_WithAddForEpic(t *testing.T) {
	tracker := NewTracker(Limits{MaxIterations: 3})

	// AddForEpic should count towards the limit
	tracker.AddForEpic("epic1", 0, 0, 0)
	tracker.AddForEpic("epic2", 0, 0, 0)

	shouldStop, _ := tracker.ShouldStop()
	if shouldStop {
		t.Error("ShouldStop() = true at 2/3 iterations")
	}

	tracker.AddForEpic("epic1", 0, 0, 0)

	shouldStop, reason := tracker.ShouldStop()
	if !shouldStop {
		t.Error("ShouldStop() = false at iteration limit")
	}
	if reason == "" {
		t.Error("ShouldStop() returned empty reason at limit")
	}
}
