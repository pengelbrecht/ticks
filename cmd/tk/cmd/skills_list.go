package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/skills"
)

var skillsListJSON bool

var skillsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List the skills embedded in this tk binary",
	Long: `List the skills embedded in this tk binary, and the tk version they
are bundled with.`,
	Args: cobra.NoArgs,
	RunE: runSkillsList,
}

func init() {
	skillsListCmd.Flags().BoolVar(&skillsListJSON, "json", false, "output as JSON")
	skillsCmd.AddCommand(skillsListCmd)
}

func runSkillsList(cmd *cobra.Command, args []string) error {
	names := skills.List()
	version := skills.Version()

	if skillsListJSON {
		payload := struct {
			Version string   `json:"version"`
			Skills  []string `json:"skills"`
		}{Version: version, Skills: names}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	for _, name := range names {
		fmt.Printf("%s\t%s\n", name, version)
	}
	return nil
}
