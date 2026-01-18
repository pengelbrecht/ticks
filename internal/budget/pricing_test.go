package budget

import (
	"math"
	"testing"
)

func TestGetPricing_KnownModels(t *testing.T) {
	tests := []struct {
		model      string
		wantInput  float64
		wantOutput float64
	}{
		// Claude 4.5 Opus
		{"claude-opus-4-5-20251101", 15.00, 75.00},
		{"claude-4.5-opus", 15.00, 75.00},

		// Claude 4 Opus
		{"claude-opus-4-20250514", 15.00, 75.00},
		{"claude-4-opus", 15.00, 75.00},

		// Claude 4 Sonnet
		{"claude-sonnet-4-20250514", 3.00, 15.00},
		{"claude-4-sonnet", 3.00, 15.00},

		// Claude 3.5 Sonnet
		{"claude-3-5-sonnet-20241022", 3.00, 15.00},
		{"claude-3.5-sonnet", 3.00, 15.00},
		{"sonnet", 3.00, 15.00},

		// Claude 3.5 Haiku
		{"claude-3-5-haiku-20241022", 0.80, 4.00},
		{"claude-3.5-haiku", 0.80, 4.00},

		// Claude 3 Opus
		{"claude-3-opus-20240229", 15.00, 75.00},
		{"opus", 15.00, 75.00},

		// Claude 3 Sonnet
		{"claude-3-sonnet-20240229", 3.00, 15.00},

		// Claude 3 Haiku
		{"claude-3-haiku-20240307", 0.25, 1.25},
		{"haiku", 0.25, 1.25},
	}

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			p := GetPricing(tt.model)
			if p.InputPer1M != tt.wantInput {
				t.Errorf("GetPricing(%q).InputPer1M = %f, want %f", tt.model, p.InputPer1M, tt.wantInput)
			}
			if p.OutputPer1M != tt.wantOutput {
				t.Errorf("GetPricing(%q).OutputPer1M = %f, want %f", tt.model, p.OutputPer1M, tt.wantOutput)
			}
		})
	}
}

func TestGetPricing_UnknownModel(t *testing.T) {
	p := GetPricing("unknown-model-xyz")

	// Should return default pricing (Claude 3.5 Sonnet)
	if p.InputPer1M != DefaultPricing.InputPer1M {
		t.Errorf("GetPricing(unknown).InputPer1M = %f, want %f", p.InputPer1M, DefaultPricing.InputPer1M)
	}
	if p.OutputPer1M != DefaultPricing.OutputPer1M {
		t.Errorf("GetPricing(unknown).OutputPer1M = %f, want %f", p.OutputPer1M, DefaultPricing.OutputPer1M)
	}
}

func TestModelPricing_EstimateCost(t *testing.T) {
	tests := []struct {
		name      string
		pricing   ModelPricing
		tokensIn  int
		tokensOut int
		wantCost  float64
	}{
		{
			name:      "Claude 3.5 Sonnet 1K tokens each",
			pricing:   Claude35Sonnet,
			tokensIn:  1000,
			tokensOut: 1000,
			// Input: 1000 * 3.00 / 1M = 0.003
			// Output: 1000 * 15.00 / 1M = 0.015
			// Total: 0.018
			wantCost: 0.018,
		},
		{
			name:      "Claude 3.5 Sonnet 1M tokens each",
			pricing:   Claude35Sonnet,
			tokensIn:  1_000_000,
			tokensOut: 1_000_000,
			// Input: 1M * 3.00 / 1M = 3.00
			// Output: 1M * 15.00 / 1M = 15.00
			// Total: 18.00
			wantCost: 18.00,
		},
		{
			name:      "Claude 3 Opus typical usage",
			pricing:   Claude3Opus,
			tokensIn:  50000,
			tokensOut: 10000,
			// Input: 50000 * 15.00 / 1M = 0.75
			// Output: 10000 * 75.00 / 1M = 0.75
			// Total: 1.50
			wantCost: 1.50,
		},
		{
			name:      "Claude 3 Haiku high volume",
			pricing:   Claude3Haiku,
			tokensIn:  100000,
			tokensOut: 50000,
			// Input: 100000 * 0.25 / 1M = 0.025
			// Output: 50000 * 1.25 / 1M = 0.0625
			// Total: 0.0875
			wantCost: 0.0875,
		},
		{
			name:      "zero tokens",
			pricing:   Claude35Sonnet,
			tokensIn:  0,
			tokensOut: 0,
			wantCost:  0.0,
		},
		{
			name:      "only input tokens",
			pricing:   Claude35Sonnet,
			tokensIn:  10000,
			tokensOut: 0,
			// Input: 10000 * 3.00 / 1M = 0.03
			wantCost: 0.03,
		},
		{
			name:      "only output tokens",
			pricing:   Claude35Sonnet,
			tokensIn:  0,
			tokensOut: 10000,
			// Output: 10000 * 15.00 / 1M = 0.15
			wantCost: 0.15,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.pricing.EstimateCost(tt.tokensIn, tt.tokensOut)
			if !floatEquals(got, tt.wantCost, 0.0001) {
				t.Errorf("EstimateCost(%d, %d) = %f, want %f", tt.tokensIn, tt.tokensOut, got, tt.wantCost)
			}
		})
	}
}

func TestEstimateCost(t *testing.T) {
	// Uses default pricing (Claude 3.5 Sonnet)
	cost := EstimateCost(10000, 5000)
	// Input: 10000 * 3.00 / 1M = 0.03
	// Output: 5000 * 15.00 / 1M = 0.075
	// Total: 0.105
	expected := 0.105

	if !floatEquals(cost, expected, 0.0001) {
		t.Errorf("EstimateCost(10000, 5000) = %f, want %f", cost, expected)
	}
}

func TestEstimateCostForModel(t *testing.T) {
	// Known model
	cost := EstimateCostForModel("claude-3-haiku", 100000, 50000)
	// Input: 100000 * 0.25 / 1M = 0.025
	// Output: 50000 * 1.25 / 1M = 0.0625
	// Total: 0.0875
	expected := 0.0875

	if !floatEquals(cost, expected, 0.0001) {
		t.Errorf("EstimateCostForModel(claude-3-haiku, 100000, 50000) = %f, want %f", cost, expected)
	}

	// Unknown model falls back to default
	costUnknown := EstimateCostForModel("unknown", 10000, 5000)
	costDefault := EstimateCost(10000, 5000)

	if !floatEquals(costUnknown, costDefault, 0.0001) {
		t.Errorf("EstimateCostForModel(unknown) = %f, want %f (default)", costUnknown, costDefault)
	}
}

func TestModelPricingTable_AllEntriesValid(t *testing.T) {
	for name, pricing := range ModelPricingTable {
		if pricing.InputPer1M <= 0 {
			t.Errorf("ModelPricingTable[%q].InputPer1M = %f, want > 0", name, pricing.InputPer1M)
		}
		if pricing.OutputPer1M <= 0 {
			t.Errorf("ModelPricingTable[%q].OutputPer1M = %f, want > 0", name, pricing.OutputPer1M)
		}
		if pricing.Name == "" {
			t.Errorf("ModelPricingTable[%q].Name is empty", name)
		}
	}
}

func TestDefaultPricing(t *testing.T) {
	// Default should be Claude 3.5 Sonnet
	if DefaultPricing.InputPer1M != 3.00 {
		t.Errorf("DefaultPricing.InputPer1M = %f, want 3.00", DefaultPricing.InputPer1M)
	}
	if DefaultPricing.OutputPer1M != 15.00 {
		t.Errorf("DefaultPricing.OutputPer1M = %f, want 15.00", DefaultPricing.OutputPer1M)
	}
}

// floatEquals compares two floats with a tolerance for floating point errors.
func floatEquals(a, b, tolerance float64) bool {
	return math.Abs(a-b) <= tolerance
}
