package engine_test

import (
	"fmt"

	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

func ExamplePromptBuilder_Build() {
	pb := engine.NewPromptBuilder()

	ctx := engine.IterationContext{
		Iteration: 3,
		Epic: &ticks.Epic{
			ID:          "abc",
			Title:       "Build authentication system",
			Description: "Implement JWT-based authentication for the API.",
		},
		Task: &ticks.Task{
			ID:          "xyz",
			Title:       "Create login endpoint",
			Description: "Implement POST /api/login endpoint.\n\nAcceptance Criteria:\n- Validates email and password\n- Returns JWT token on success\n- Returns 401 on invalid credentials",
		},
		EpicNotes: []string{
			"Using bcrypt for password hashing",
			"JWT secret stored in environment variable",
		},
	}

	prompt := pb.Build(ctx)
	fmt.Println(prompt)
}
