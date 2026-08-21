package cmd

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
)

var (
	configMigrateApply  bool
	configMigrateWrite  bool
	configMigrateDryRun bool
)

var configMigrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Move structured config.md sections into runners.toml",
	Long: `Migrate the structured parts of .tick/config.md into the schema-validated
.tick/runners.toml file while retaining Rules and narrative Testing hints.

The default is a read-only diff. Use --apply (or --write) to write the two
files after the complete migration has parsed, merged, and validated. Existing
runners.toml keys and comments are retained. A conflicting existing value that
can be safely preserved is reported as a warning; conflicting command text or
acceptance mappings are refusals rather than overwrites.

The migration is safe to run again: once config.md has no legacy structured
sections, it reports that there is nothing to migrate.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runConfigMigrate,
}

func init() {
	configMigrateCmd.Flags().BoolVar(&configMigrateApply, "apply", false,
		"write the validated migration (default is a dry-run diff)")
	configMigrateCmd.Flags().BoolVar(&configMigrateWrite, "write", false,
		"write the validated migration (alias for --apply)")
	configMigrateCmd.Flags().BoolVar(&configMigrateDryRun, "dry-run", false,
		"print the diff without writing (the default)")
	configCmd.AddCommand(configMigrateCmd)
}

func runConfigMigrate(cmd *cobra.Command, args []string) error {
	if configMigrateDryRun && (configMigrateApply || configMigrateWrite) {
		return NewExitError(ExitUsage, "--dry-run cannot be combined with --apply or --write")
	}

	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}
	configPath := filepath.Join(root, ".tick", "config.md")
	runnersPath := filepath.Join(root, filepath.FromSlash(herdconfig.FileName))

	legacyData, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Fprintln(cmd.OutOrStdout(), "no .tick/config.md found; nothing to migrate")
			return nil
		}
		return NewExitError(ExitIO, "reading %s: %v", configPath, err)
	}
	runnersData, err := os.ReadFile(runnersPath)
	if err != nil && !os.IsNotExist(err) {
		return NewExitError(ExitIO, "reading %s: %v", runnersPath, err)
	}
	if os.IsNotExist(err) {
		runnersData = nil
	}

	result, err := herdconfig.Migrate(legacyData, runnersData)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	out := cmd.OutOrStdout()
	for _, warning := range result.Warnings {
		fmt.Fprintf(out, "warning: %s\n", warning)
	}
	if !result.Changed {
		fmt.Fprintln(out, "nothing to migrate; .tick/config.md has no legacy structured sections")
		return nil
	}

	printConfigMigrationDiff(out, ".tick/config.md", legacyData, result.ConfigMD)
	printConfigMigrationDiff(out, ".tick/runners.toml", runnersData, result.RunnersTOML)

	if !(configMigrateApply || configMigrateWrite) || configMigrateDryRun {
		fmt.Fprintln(out, "\ndry run; nothing was written (re-run with --apply to write)")
		return nil
	}
	if err := writeMigrationFiles(configPath, result.ConfigMD, runnersPath, result.RunnersTOML); err != nil {
		return NewExitError(ExitIO, "%v", err)
	}
	fmt.Fprintln(out, "\nmigration applied")
	return nil
}

func printConfigMigrationDiff(out io.Writer, name string, before, after []byte) {
	if bytes.Equal(before, after) {
		return
	}
	oldLines := diffLines(before)
	newLines := diffLines(after)
	fmt.Fprintf(out, "--- %s\n+++ %s\n", name, name)
	for _, hunk := range diffHunks(diffOperations(oldLines, newLines)) {
		oldCount, newCount := 0, 0
		for _, operation := range hunk {
			if operation.kind != '+' {
				oldCount++
			}
			if operation.kind != '-' {
				newCount++
			}
		}
		fmt.Fprintf(out, "@@ -%d,%d +%d,%d @@\n", hunk[0].oldLine, oldCount, hunk[0].newLine, newCount)
		for _, operation := range hunk {
			fmt.Fprintf(out, "%c%s\n", operation.kind, operation.text)
		}
	}
}

type configDiffOperation struct {
	kind    byte
	text    string
	oldLine int
	newLine int
}

func diffOperations(oldLines, newLines []string) []configDiffOperation {
	lcs := make([][]int, len(oldLines)+1)
	for i := range lcs {
		lcs[i] = make([]int, len(newLines)+1)
	}
	for i := len(oldLines) - 1; i >= 0; i-- {
		for j := len(newLines) - 1; j >= 0; j-- {
			if oldLines[i] == newLines[j] {
				lcs[i][j] = lcs[i+1][j+1] + 1
			} else if lcs[i+1][j] >= lcs[i][j+1] {
				lcs[i][j] = lcs[i+1][j]
			} else {
				lcs[i][j] = lcs[i][j+1]
			}
		}
	}

	operations := make([]configDiffOperation, 0, len(oldLines)+len(newLines))
	i, j := 0, 0
	for i < len(oldLines) || j < len(newLines) {
		switch {
		case i < len(oldLines) && j < len(newLines) && oldLines[i] == newLines[j]:
			operations = append(operations, configDiffOperation{kind: ' ', text: oldLines[i], oldLine: i + 1, newLine: j + 1})
			i++
			j++
		case j == len(newLines) || (i < len(oldLines) && lcs[i+1][j] >= lcs[i][j+1]):
			operations = append(operations, configDiffOperation{kind: '-', text: oldLines[i], oldLine: i + 1, newLine: j + 1})
			i++
		default:
			operations = append(operations, configDiffOperation{kind: '+', text: newLines[j], oldLine: i + 1, newLine: j + 1})
			j++
		}
	}
	return operations
}

func diffHunks(operations []configDiffOperation) [][]configDiffOperation {
	type span struct{ start, end int }
	spans := make([]span, 0)
	for index, operation := range operations {
		if operation.kind == ' ' {
			continue
		}
		start := index - 3
		if start < 0 {
			start = 0
		}
		end := index + 4
		if end > len(operations) {
			end = len(operations)
		}
		if len(spans) > 0 && start <= spans[len(spans)-1].end {
			if end > spans[len(spans)-1].end {
				spans[len(spans)-1].end = end
			}
			continue
		}
		spans = append(spans, span{start: start, end: end})
	}
	hunks := make([][]configDiffOperation, 0, len(spans))
	for _, item := range spans {
		hunks = append(hunks, operations[item.start:item.end])
	}
	return hunks
}

func diffLines(data []byte) []string {
	if len(data) == 0 {
		return nil
	}
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	text = strings.TrimSuffix(text, "\n")
	if text == "" {
		return []string{""}
	}
	return strings.Split(text, "\n")
}

func writeMigrationFiles(configPath string, newConfig []byte, runnersPath string, newRunners []byte) error {
	configMode := fileMode(configPath, 0o644)
	runnersMode := fileMode(runnersPath, 0o644)
	configTemp, err := stageMigrationFile(configPath, newConfig, configMode)
	if err != nil {
		return fmt.Errorf("staging %s: %w", configPath, err)
	}
	runnersTemp, err := stageMigrationFile(runnersPath, newRunners, runnersMode)
	if err != nil {
		_ = os.Remove(configTemp)
		return fmt.Errorf("staging %s: %w", runnersPath, err)
	}
	defer os.Remove(configTemp)
	defer os.Remove(runnersTemp)

	if err := renameMigrationFile(runnersTemp, runnersPath); err != nil {
		return fmt.Errorf("writing %s: %w", runnersPath, err)
	}
	if err := renameMigrationFile(configTemp, configPath); err != nil {
		return fmt.Errorf("writing %s: %w", configPath, err)
	}
	return nil
}

var renameMigrationFile = os.Rename

func fileMode(path string, fallback os.FileMode) os.FileMode {
	info, err := os.Stat(path)
	if err != nil {
		return fallback
	}
	return info.Mode().Perm()
}

func stageMigrationFile(path string, data []byte, mode os.FileMode) (string, error) {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	tmp, err := os.CreateTemp(dir, ".config-migrate-*")
	if err != nil {
		return "", err
	}
	tmpName := tmp.Name()
	cleanup := true
	defer func() {
		_ = tmp.Close()
		if cleanup {
			_ = os.Remove(tmpName)
		}
	}()
	if err := tmp.Chmod(mode); err != nil {
		return "", err
	}
	if _, err := tmp.Write(data); err != nil {
		return "", err
	}
	if err := tmp.Close(); err != nil {
		return "", err
	}
	cleanup = false
	return tmpName, nil
}
