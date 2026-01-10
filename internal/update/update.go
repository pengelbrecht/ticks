// Package update provides version checking and self-update functionality.
package update

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/creativeprojects/go-selfupdate"
)

const (
	repoOwner     = "pengelbrecht"
	repoName      = "ticks"
	checkInterval = 24 * time.Hour
)

// updateCache stores the last update check result.
type updateCache struct {
	LastCheck      time.Time `json:"last_check"`
	LatestVersion  string    `json:"latest_version,omitempty"`
	UpdateAvailable bool      `json:"update_available"`
}

func cacheDir() string {
	if dir := os.Getenv("XDG_CONFIG_HOME"); dir != "" {
		return filepath.Join(dir, "tk")
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".config", "tk")
}

func cachePath() string {
	dir := cacheDir()
	if dir == "" {
		return ""
	}
	return filepath.Join(dir, "update-cache.json")
}

func loadCache() *updateCache {
	path := cachePath()
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var cache updateCache
	if err := json.Unmarshal(data, &cache); err != nil {
		return nil
	}
	return &cache
}

func saveCache(cache *updateCache) {
	path := cachePath()
	if path == "" {
		return
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return
	}
	data, err := json.Marshal(cache)
	if err != nil {
		return
	}
	_ = os.WriteFile(path, data, 0644)
}

// InstallMethod represents how tk was installed.
type InstallMethod int

const (
	// InstallUnknown means we couldn't determine the install method.
	InstallUnknown InstallMethod = iota
	// InstallHomebrew means tk was installed via Homebrew.
	InstallHomebrew
	// InstallScript means tk was installed via shell script or go install.
	InstallScript
)

func (m InstallMethod) String() string {
	switch m {
	case InstallHomebrew:
		return "homebrew"
	case InstallScript:
		return "script"
	default:
		return "unknown"
	}
}

// DetectInstallMethod determines how tk was installed by examining the binary path.
func DetectInstallMethod() InstallMethod {
	exe, err := os.Executable()
	if err != nil {
		return InstallUnknown
	}

	// Resolve symlinks to get actual path
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return InstallUnknown
	}

	// Homebrew paths:
	// - ARM Mac: /opt/homebrew/Cellar/ticks/...
	// - Intel Mac: /usr/local/Cellar/ticks/...
	// - Linux: /home/linuxbrew/.linuxbrew/Cellar/ticks/...
	if strings.Contains(exe, "/Cellar/") {
		return InstallHomebrew
	}

	// Also check for Homebrew bin symlinks
	if strings.HasPrefix(exe, "/opt/homebrew/") ||
		strings.HasPrefix(exe, "/usr/local/Homebrew/") ||
		strings.Contains(exe, "linuxbrew") {
		return InstallHomebrew
	}

	return InstallScript
}

// Release represents information about a release.
type Release struct {
	Version     string
	ReleaseURL  string
	ReleaseDate string
}

// CheckForUpdate checks if a newer version is available.
// Returns the latest release info and whether an update is available.
func CheckForUpdate(currentVersion string) (*Release, bool, error) {
	// Strip 'v' prefix if present for comparison
	current := strings.TrimPrefix(currentVersion, "v")

	// Skip check for dev builds
	if current == "dev" || current == "" {
		return nil, false, nil
	}

	source, err := selfupdate.NewGitHubSource(selfupdate.GitHubConfig{})
	if err != nil {
		return nil, false, fmt.Errorf("failed to create GitHub source: %w", err)
	}

	updater, err := selfupdate.NewUpdater(selfupdate.Config{
		Source: source,
	})
	if err != nil {
		return nil, false, fmt.Errorf("failed to create updater: %w", err)
	}

	latest, found, err := updater.DetectLatest(context.Background(), selfupdate.NewRepositorySlug(repoOwner, repoName))
	if err != nil {
		return nil, false, fmt.Errorf("failed to detect latest version: %w", err)
	}

	if !found {
		return nil, false, nil
	}

	release := &Release{
		Version:    latest.Version(),
		ReleaseURL: latest.ReleaseNotes,
	}

	// Compare versions
	latestVersion := strings.TrimPrefix(latest.Version(), "v")
	if latestVersion == current {
		return release, false, nil
	}

	// Simple version comparison - latest is newer if different
	// The library handles semver comparison internally
	return release, latest.GreaterThan(current), nil
}

// Update downloads and installs the latest version.
// Returns an error if installed via Homebrew (user should use brew upgrade).
func Update(currentVersion string) error {
	method := DetectInstallMethod()
	if method == InstallHomebrew {
		return fmt.Errorf("tk was installed via Homebrew. Please run: brew upgrade pengelbrecht/tap/ticks")
	}

	current := strings.TrimPrefix(currentVersion, "v")
	if current == "dev" || current == "" {
		return fmt.Errorf("cannot update dev builds")
	}

	source, err := selfupdate.NewGitHubSource(selfupdate.GitHubConfig{})
	if err != nil {
		return fmt.Errorf("failed to create GitHub source: %w", err)
	}

	updater, err := selfupdate.NewUpdater(selfupdate.Config{
		Source: source,
	})
	if err != nil {
		return fmt.Errorf("failed to create updater: %w", err)
	}

	latest, found, err := updater.DetectLatest(context.Background(), selfupdate.NewRepositorySlug(repoOwner, repoName))
	if err != nil {
		return fmt.Errorf("failed to detect latest version: %w", err)
	}

	if !found {
		return fmt.Errorf("no releases found")
	}

	if !latest.GreaterThan(current) {
		return fmt.Errorf("already at latest version (%s)", currentVersion)
	}

	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	if err := updater.UpdateTo(context.Background(), latest, exe); err != nil {
		return fmt.Errorf("failed to update: %w", err)
	}

	return nil
}

// UpdateInstructions returns instructions for updating based on install method.
func UpdateInstructions(method InstallMethod) string {
	switch method {
	case InstallHomebrew:
		return "Run: brew upgrade pengelbrecht/tap/ticks"
	case InstallScript:
		if runtime.GOOS == "windows" {
			return "Run: tk upgrade\nOr reinstall: irm https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.ps1 | iex"
		}
		return "Run: tk upgrade\nOr reinstall: curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh | sh"
	default:
		return "Run: tk upgrade"
	}
}

// CheckPeriodically checks for updates at most once per day.
// Returns a notice string if an update is available, empty string otherwise.
// This is designed to be called at the start of common commands.
func CheckPeriodically(currentVersion string) string {
	// Skip for dev builds
	current := strings.TrimPrefix(currentVersion, "v")
	if current == "dev" || current == "" {
		return ""
	}

	// Check cache first
	cache := loadCache()
	if cache != nil && time.Since(cache.LastCheck) < checkInterval {
		// Use cached result
		if cache.UpdateAvailable && cache.LatestVersion != "" {
			method := DetectInstallMethod()
			return formatUpdateNotice(currentVersion, cache.LatestVersion, method)
		}
		return ""
	}

	// Perform check in background to avoid slowing down commands
	// For now, do a quick synchronous check but with a short timeout
	release, hasUpdate, err := CheckForUpdate(currentVersion)

	// Update cache
	newCache := &updateCache{
		LastCheck:       time.Now(),
		UpdateAvailable: hasUpdate && err == nil,
	}
	if release != nil {
		newCache.LatestVersion = release.Version
	}
	saveCache(newCache)

	if err != nil || !hasUpdate {
		return ""
	}

	method := DetectInstallMethod()
	return formatUpdateNotice(currentVersion, release.Version, method)
}

func formatUpdateNotice(current, latest string, method InstallMethod) string {
	var cmd string
	switch method {
	case InstallHomebrew:
		cmd = "brew upgrade pengelbrecht/tap/ticks"
	default:
		cmd = "tk upgrade"
	}
	return fmt.Sprintf("Update available: %s -> %s (run: %s)", current, latest, cmd)
}
