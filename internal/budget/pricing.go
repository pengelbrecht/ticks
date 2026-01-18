package budget

// ModelPricing contains the pricing information for a Claude model.
// Prices are in USD per 1 million tokens.
type ModelPricing struct {
	Name        string  // Model name/identifier
	InputPer1M  float64 // Cost per 1M input tokens in USD
	OutputPer1M float64 // Cost per 1M output tokens in USD
}

// Claude model pricing as of 2024.
// Prices are in USD per 1 million tokens.
// Source: https://www.anthropic.com/pricing
var (
	// Claude 4.5 Opus (most capable)
	Claude45Opus = ModelPricing{
		Name:        "claude-opus-4-5-20251101",
		InputPer1M:  15.00,
		OutputPer1M: 75.00,
	}

	// Claude 4 Opus
	Claude4Opus = ModelPricing{
		Name:        "claude-opus-4-20250514",
		InputPer1M:  15.00,
		OutputPer1M: 75.00,
	}

	// Claude 4 Sonnet
	Claude4Sonnet = ModelPricing{
		Name:        "claude-sonnet-4-20250514",
		InputPer1M:  3.00,
		OutputPer1M: 15.00,
	}

	// Claude 3.5 Sonnet (current default for Claude Code)
	Claude35Sonnet = ModelPricing{
		Name:        "claude-3-5-sonnet-20241022",
		InputPer1M:  3.00,
		OutputPer1M: 15.00,
	}

	// Claude 3.5 Haiku (fast and affordable)
	Claude35Haiku = ModelPricing{
		Name:        "claude-3-5-haiku-20241022",
		InputPer1M:  0.80,
		OutputPer1M: 4.00,
	}

	// Claude 3 Opus
	Claude3Opus = ModelPricing{
		Name:        "claude-3-opus-20240229",
		InputPer1M:  15.00,
		OutputPer1M: 75.00,
	}

	// Claude 3 Sonnet
	Claude3Sonnet = ModelPricing{
		Name:        "claude-3-sonnet-20240229",
		InputPer1M:  3.00,
		OutputPer1M: 15.00,
	}

	// Claude 3 Haiku
	Claude3Haiku = ModelPricing{
		Name:        "claude-3-haiku-20240307",
		InputPer1M:  0.25,
		OutputPer1M: 1.25,
	}

	// DefaultPricing is used when the model is unknown.
	// Uses Claude 3.5 Sonnet pricing as a reasonable default.
	DefaultPricing = Claude35Sonnet
)

// ModelPricingTable maps model names to their pricing.
var ModelPricingTable = map[string]ModelPricing{
	// Claude 4.5 Opus
	"claude-opus-4-5-20251101": Claude45Opus,
	"claude-4-5-opus":          Claude45Opus,
	"claude-4.5-opus":          Claude45Opus,
	"opus-4.5":                 Claude45Opus,

	// Claude 4 Opus
	"claude-opus-4-20250514": Claude4Opus,
	"claude-4-opus":          Claude4Opus,
	"opus-4":                 Claude4Opus,

	// Claude 4 Sonnet
	"claude-sonnet-4-20250514": Claude4Sonnet,
	"claude-4-sonnet":          Claude4Sonnet,
	"sonnet-4":                 Claude4Sonnet,

	// Claude 3.5 Sonnet
	"claude-3-5-sonnet-20241022": Claude35Sonnet,
	"claude-3.5-sonnet":          Claude35Sonnet,
	"claude-3-5-sonnet":          Claude35Sonnet,
	"sonnet":                     Claude35Sonnet,

	// Claude 3.5 Haiku
	"claude-3-5-haiku-20241022": Claude35Haiku,
	"claude-3.5-haiku":          Claude35Haiku,
	"claude-3-5-haiku":          Claude35Haiku,

	// Claude 3 Opus
	"claude-3-opus-20240229": Claude3Opus,
	"claude-3-opus":          Claude3Opus,
	"opus":                   Claude3Opus,

	// Claude 3 Sonnet
	"claude-3-sonnet-20240229": Claude3Sonnet,
	"claude-3-sonnet":          Claude3Sonnet,

	// Claude 3 Haiku
	"claude-3-haiku-20240307": Claude3Haiku,
	"claude-3-haiku":          Claude3Haiku,
	"haiku":                   Claude3Haiku,
}

// GetPricing returns the pricing for the given model name.
// Returns DefaultPricing if the model is not found.
func GetPricing(model string) ModelPricing {
	if p, ok := ModelPricingTable[model]; ok {
		return p
	}
	return DefaultPricing
}

// EstimateCost calculates the estimated cost in USD for the given token counts.
// Uses the provided model pricing.
func (p ModelPricing) EstimateCost(tokensIn, tokensOut int) float64 {
	inputCost := float64(tokensIn) * p.InputPer1M / 1_000_000
	outputCost := float64(tokensOut) * p.OutputPer1M / 1_000_000
	return inputCost + outputCost
}

// EstimateCost calculates the estimated cost in USD for the given token counts.
// Uses the default pricing (Claude 3.5 Sonnet).
func EstimateCost(tokensIn, tokensOut int) float64 {
	return DefaultPricing.EstimateCost(tokensIn, tokensOut)
}

// EstimateCostForModel calculates the estimated cost in USD for the given
// token counts using the specified model's pricing.
func EstimateCostForModel(model string, tokensIn, tokensOut int) float64 {
	return GetPricing(model).EstimateCost(tokensIn, tokensOut)
}
