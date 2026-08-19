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
	if !result.Changed {
		fmt.Fprintln(cmd.OutOrStdout(), "nothing to migrate; .tick/config.md has no legacy structured sections")
		return nil
	}

	out := cmd.OutOrStdout()
	for _, warning := range result.Warnings {
		fmt.Fprintf(out, "warning: %s\n", warning)
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
	fmt.Fprintf(out, "--- %s\n+++ %s\n@@ -1,%d +1,%d @@\n", name, name, len(oldLines), len(newLines))
	for _, line := range oldLines {
		fmt.Fprintf(out, "-%s\n", line)
	}
	for _, line := range newLines {
		fmt.Fprintf(out, "+%s\n", line)
	}
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

	if err := os.Rename(configTemp, configPath); err != nil {
		return fmt.Errorf("writing %s: %w", configPath, err)
	}
	if err := os.Rename(runnersTemp, runnersPath); err != nil {
		return fmt.Errorf("writing %s: %w", runnersPath, err)
	}
	return nil
}

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
