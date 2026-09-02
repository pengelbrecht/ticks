// Package cmd implements tk CLI commands.
// Version command displays the current tk version and checks for updates.
package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
	"github.com/pengelbrecht/ticks/internal/update"
	"github.com/spf13/cobra"
)

var versionJSON bool

// versionReport is `tk version --json`: the machine-readable answer to "can
// this tk serve the contract I was built against?".
//
// It is the only command a consumer may call before it knows whether the rest
// of contracts/tk-json-manifest.json applies, so it must stay parseable by an
// older consumer than the one shipping today — fields are added, never
// removed or retyped, within a contract version.
type versionReport struct {
	Tk                 string `json:"tk"`
	Contract           int    `json:"contract"`
	SupportedContracts []int  `json:"supported_contracts"`
	MinTkVersion       string `json:"min_tk_version"`
	Manifest           string `json:"manifest"`
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number of tk",
	Long: `Print the version number of tk.

With --json, also report the tk --json contract this build serves, so an
orchestrator can refuse an incompatible tk before it calls anything else.
See contracts/tk-json-manifest.json.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if versionJSON {
			return printVersionJSON()
		}

		fmt.Printf("tk %s\n", Version)

		// Check for updates (skip for dev builds)
		if Version == "dev" {
			return nil
		}

		release, hasUpdate, err := update.CheckForUpdate(Version)
		if err != nil {
			// Silently ignore update check errors
			return nil
		}

		if hasUpdate && release != nil {
			method := update.DetectInstallMethod()
			fmt.Printf("\nUpdate available: %s -> %s\n", Version, release.Version)
			fmt.Println(update.UpdateInstructions(method))
		}
		return nil
	},
}

// printVersionJSON writes the contract report. It deliberately does NOT run
// the update check: this is the call an orchestrator makes on every run, and a
// network round trip (or its failure notice) has no place in a machine
// handshake.
func printVersionJSON() error {
	manifest, err := tkcontract.Load()
	if err != nil {
		return err
	}
	report := versionReport{
		Tk:                 Version,
		Contract:           manifest.Contract,
		SupportedContracts: manifest.SupportedContracts,
		MinTkVersion:       manifest.MinTkVersion,
		Manifest:           tkcontract.ManifestPath,
	}
	enc := json.NewEncoder(os.Stdout)
	if err := enc.Encode(report); err != nil {
		return fmt.Errorf("failed to encode json: %w", err)
	}
	return nil
}

func init() {
	versionCmd.Flags().BoolVar(&versionJSON, "json", false, "output as JSON, including the tk --json contract version")
	rootCmd.AddCommand(versionCmd)
}
