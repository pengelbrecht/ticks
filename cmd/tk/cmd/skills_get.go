package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/skills"
)

var (
	skillsGetFull bool
	skillsGetJSON bool
)

var skillsGetCmd = &cobra.Command{
	Use:   "get <name>",
	Short: "Print a skill's SKILL.md, or the whole bundle with --full",
	Long: `Print a skill's SKILL.md.

With --full, print the whole skill bundle instead: SKILL.md followed by
every other file in the skill (its references/ files), each preceded by a
separator line naming its path.

Exit codes
  0  the skill was found and printed
  4  no such skill is embedded in this binary`,
	Args: cobra.ExactArgs(1),
	RunE: runSkillsGet,
}

func init() {
	skillsGetCmd.Flags().BoolVar(&skillsGetFull, "full", false, "print the whole skill bundle, not just SKILL.md")
	skillsGetCmd.Flags().BoolVar(&skillsGetJSON, "json", false, "output as JSON")
	skillsCmd.AddCommand(skillsGetCmd)
}

// skillFile is one file of a skill bundle, keyed by its path relative to the
// skill root (e.g. "SKILL.md", "references/tk-commands.md").
type skillFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

func runSkillsGet(cmd *cobra.Command, args []string) error {
	name := args[0]

	paths, err := skills.Paths(name)
	if err != nil {
		return NewExitError(ExitNotFound, "%v", err)
	}

	files, err := collectSkillFiles(name, paths, skillsGetFull)
	if err != nil {
		return err
	}

	if skillsGetJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(struct {
			Name  string      `json:"name"`
			Files []skillFile `json:"files"`
		}{Name: name, Files: files}); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	for i, f := range files {
		if i > 0 {
			fmt.Printf("\n--- %s ---\n\n", f.Path)
		}
		os.Stdout.WriteString(f.Content)
		if !strings.HasSuffix(f.Content, "\n") {
			fmt.Println()
		}
	}
	return nil
}

// collectSkillFiles reads SKILL.md, and (when full is true) every other file
// in paths, in that order. paths is Paths(name)'s output: sorted, and
// guaranteed to contain "SKILL.md" for any skill in the bundle.
func collectSkillFiles(name string, paths []string, full bool) ([]skillFile, error) {
	var ordered []string
	var rest []string
	for _, p := range paths {
		if p == "SKILL.md" {
			ordered = append(ordered, p)
			continue
		}
		rest = append(rest, p)
	}
	if full {
		ordered = append(ordered, rest...)
	}

	files := make([]skillFile, 0, len(ordered))
	for _, p := range ordered {
		data, err := skills.Read(name, p)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", p, err)
		}
		files = append(files, skillFile{Path: p, Content: string(data)})
	}
	return files, nil
}
