package context

import (
	"bytes"
	"text/template"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

// PromptBuilder builds prompts for generating epic context documents.
type PromptBuilder struct {
	tmpl      *template.Template
	maxTokens int
}

// promptData holds the data passed to the prompt template.
type promptData struct {
	EpicID          string
	EpicTitle       string
	EpicDescription string
	Tasks           []taskData
	MaxTokens       int
}

// taskData holds task information for the template.
type taskData struct {
	ID          string
	Title       string
	Description string
}

// contextGenerationTemplate is the prompt template for generating epic context.
// It instructs the agent to analyze the codebase and produce a structured context document.
const contextGenerationTemplate = `# Generate Epic Context

You are preparing context for an AI coding agent that will work on tasks in this epic.

## Epic
**[{{.EpicID}}] {{.EpicTitle}}**

{{.EpicDescription}}

## Tasks in this Epic
{{range .Tasks}}
### [{{.ID}}] {{.Title}}

{{.Description}}
{{end}}

## Instructions

Analyze the codebase and generate a context document that will help complete these tasks.

Include:

1. **Relevant Code** - Files and functions that tasks will likely need to read or modify
   - List file paths with brief descriptions
   - Note key types, interfaces, and functions
   - Identify patterns and conventions used

2. **Architecture Notes** - How the relevant parts of the system work together
   - Data flow
   - Key abstractions
   - Integration points

3. **External References** - Documentation for libraries/frameworks in use
   - Don't fetch full docs, just note what's relevant
   - Include links if helpful

4. **Testing Patterns** - How tests are structured in this area
   - Test file locations
   - Mocking patterns
   - Coverage expectations

5. **Conventions** - Code style and patterns to follow
   - Error handling approach
   - Logging conventions
   - Naming patterns

## Constraints

- Keep the document under {{.MaxTokens}} tokens
- Focus on what's RELEVANT to the epic's tasks
- Summarize, don't copy entire files
- Be specific (file:line references) not vague

## Output Format

Wrap your context document in <epic_context> tags:

<epic_context>
# Epic Context: [epic-id] Epic Title

(your markdown content here)
</epic_context>
`

// DefaultMaxTokens is the default max token limit for context documents.
const DefaultMaxTokens = 4000

// PromptBuilderOption configures a PromptBuilder.
type PromptBuilderOption func(*PromptBuilder)

// PromptWithMaxTokens sets the max tokens constraint for generated context.
func PromptWithMaxTokens(tokens int) PromptBuilderOption {
	return func(pb *PromptBuilder) {
		pb.maxTokens = tokens
	}
}

// NewPromptBuilder creates a new PromptBuilder with the default template.
func NewPromptBuilder(opts ...PromptBuilderOption) (*PromptBuilder, error) {
	tmpl, err := template.New("context-generation").Parse(contextGenerationTemplate)
	if err != nil {
		return nil, err
	}
	pb := &PromptBuilder{
		tmpl:      tmpl,
		maxTokens: DefaultMaxTokens,
	}
	for _, opt := range opts {
		opt(pb)
	}
	return pb, nil
}

// Build generates the context generation prompt from an epic and its tasks.
func (p *PromptBuilder) Build(epic *ticks.Epic, tasks []ticks.Task) (string, error) {
	data := promptData{
		EpicID:          epic.ID,
		EpicTitle:       epic.Title,
		EpicDescription: epic.Description,
		Tasks:           make([]taskData, len(tasks)),
		MaxTokens:       p.maxTokens,
	}

	for i, t := range tasks {
		data.Tasks[i] = taskData{
			ID:          t.ID,
			Title:       t.Title,
			Description: t.Description,
		}
	}

	var buf bytes.Buffer
	if err := p.tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
