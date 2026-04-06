package context

import (
	"bytes"
	"regexp"
	"sort"
	"strings"
	"text/template"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

// filePathPattern matches common source file paths in task descriptions.
var filePathPattern = regexp.MustCompile(`(?:^|\s|` + "`" + `)([a-zA-Z0-9_./-]+\.(?:go|ts|tsx|js|jsx|py|rs|yaml|yml|json|toml|md))(?:\s|` + "`" + `|[,.):]|$)`)

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
	FileHints       []string // file paths extracted from task descriptions
}

// taskData holds task information for the template.
type taskData struct {
	ID          string
	Title       string
	Description string
}

// contextGenerationTemplate is the prompt template for generating epic context.
// It instructs the agent to read specific files and produce a focused context document.
const contextGenerationTemplate = `# Generate Epic Context

Prepare a concise context document for AI agents working on this epic's tasks.
{{if .FileHints}}
## Start Here

These files are referenced in the task descriptions. Read them first:
{{range .FileHints}}
- {{.}}
{{- end}}
{{end}}

## Epic
**[{{.EpicID}}] {{.EpicTitle}}**

{{.EpicDescription}}

## Tasks
{{range .Tasks}}
### [{{.ID}}] {{.Title}}

{{.Description}}
{{end}}

## Instructions

Read the files listed above (and any closely related files they import/reference), then produce a context document covering:

1. **Key types and interfaces** the tasks will use or implement
2. **Patterns to follow** — how similar code in this area is structured (error handling, naming, test style)
3. **Integration points** — where new code connects to existing code

Do NOT explore broadly. Stay focused on what these specific tasks need.

## Constraints

- Under {{.MaxTokens}} tokens
- Be specific: file paths, function names, line numbers
- Summarize, don't copy file contents

## Output

<epic_context>
(your markdown context document)
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

	// Extract file path hints from task descriptions
	data.FileHints = extractFileHints(tasks)

	var buf bytes.Buffer
	if err := p.tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// extractFileHints scans task descriptions for file paths and returns a deduplicated, sorted list.
func extractFileHints(tasks []ticks.Task) []string {
	seen := make(map[string]bool)
	for _, t := range tasks {
		text := t.Title + "\n" + t.Description
		matches := filePathPattern.FindAllStringSubmatch(text, -1)
		for _, m := range matches {
			if len(m) >= 2 {
				path := strings.TrimSpace(m[1])
				if !seen[path] {
					seen[path] = true
				}
			}
		}
	}

	hints := make([]string, 0, len(seen))
	for path := range seen {
		hints = append(hints, path)
	}
	sort.Strings(hints)
	return hints
}
