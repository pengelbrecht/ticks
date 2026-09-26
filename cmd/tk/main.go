package main

import (
	"fmt"
	"os"
	"strings"

	cobracmd "github.com/pengelbrecht/ticks/cmd/tk/cmd"
	"github.com/pengelbrecht/ticks/internal/update"
)

var Version = "dev"

func init() {
	// Sync version with the Cobra cmd package for when commands are migrated
	cobracmd.SetVersion(Version)
}

func main() {
	os.Exit(run(os.Args))
}

const (
	exitSuccess  = 0
	exitGeneric  = 1
	exitUsage    = 2
	exitNoRepo   = 3
	exitNotFound = 4
	exitGitHub   = 5
	exitIO       = 6
)

func run(args []string) int {
	if len(args) < 2 {
		printUsage()
		return exitSuccess
	}

	// Check for updates periodically (skip for certain commands)
	cmd := args[1]
	if cmd != "version" && cmd != "--version" && cmd != "-v" &&
		cmd != "upgrade" && cmd != "--help" && cmd != "-h" && cmd != "help" &&
		cmd != "merge-file" && cmd != "merge-activity" && cmd != "snippet" &&
		cmd != "skills" {
		if notice := update.CheckPeriodically(Version); notice != "" {
			fmt.Fprintln(os.Stderr, notice)
			fmt.Fprintln(os.Stderr)
		}
	}

	if cobracmd.IsCommand(args[1]) {
		// Route to Cobra (args[1:] includes the subcommand; cobra resolves
		// aliases such as new and ls itself).
		if err := cobracmd.ExecuteArgs(args[1:]); err != nil {
			return cobracmd.GetExitCode(err)
		}
		return exitSuccess
	}

	switch args[1] {
	case "--version", "-v":
		return runVersion()
	case "--help", "-h", "help":
		printUsage()
		return exitSuccess
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", args[1])
		printUsage()
		return exitUsage
	}
}

func runVersion() int {
	fmt.Printf("tk %s\n", Version)

	// Check for updates (skip for dev builds)
	if Version == "dev" {
		return exitSuccess
	}

	release, hasUpdate, err := update.CheckForUpdate(Version)
	if err != nil {
		// Silently ignore update check errors
		return exitSuccess
	}

	if hasUpdate && release != nil {
		method := update.DetectInstallMethod()
		fmt.Printf("\nUpdate available: %s -> %s\n", Version, release.Version)
		fmt.Println(update.UpdateInstructions(method))
	}

	return exitSuccess
}

func printUsage() {
	fmt.Printf("tk %s - multiplayer issue tracker for AI agents\n\n", Version)
	fmt.Println("Usage: tk <command> [--help]")
	fmt.Println("Commands: " + strings.Join(cobracmd.CommandUsageNames(), ", "))
	fmt.Println()
	fmt.Println("Operator Questions:")
	fmt.Println("  tk ask <id> --question <q>    Ask the operator and block until answered")
	fmt.Println("  tk ask --collect [--wait]     Drain answers to questions asked with --async, as JSON lines")
	fmt.Println("  tk answer <id> <answer...>    Answer a parked question from the terminal")
	fmt.Println()
	fmt.Println("Skill Bundle:")
	fmt.Println("  tk skills list                List embedded skills and the tk version they ship with")
	fmt.Println("  tk skills get <name>          Print a skill's SKILL.md (--full for the whole bundle)")
	fmt.Println("  tk skills install <name>      Install a skill (default: detect .claude/skills/, .agents/skills/ at repo root)")
	fmt.Println("  tk skills diff <name>         Compare installed skill(s) against the embedded bundle")
	fmt.Println()
	fmt.Println("Running epics with agents is ticfac's job; tk is the tracker it reads and writes.")
	fmt.Println()
	fmt.Println("Agent-Human Workflow:")
	fmt.Println("  tk approve <id>              Set verdict=approved on awaiting tick")
	fmt.Println("  tk reject <id> [feedback]    Set verdict=rejected with optional note")
	fmt.Println("  tk next --awaiting=          Get next task awaiting human (human mode)")
	fmt.Println("  tk list --awaiting=          List all tasks awaiting human action")
	fmt.Println("  tk note <id> \"msg\" --from human  Add human feedback note")
	fmt.Println()
	fmt.Println("Workflow Flags:")
	fmt.Println("  --requires value    Pre-declared approval gate (approval|review|content)")
	fmt.Println("                      Tick routes to human even if agent signals COMPLETE")
	fmt.Println("  --awaiting value    Wait state (work|approval|input|review|content|escalation|checkpoint)")
	fmt.Println("                      Tick assigned to human, skipped by agent")
	fmt.Println()
	fmt.Println("Human-Only Tasks (awaiting=work):")
	fmt.Println("  Use --awaiting work to mark tasks requiring human work (not AI agent work).")
	fmt.Println("  These tasks are skipped by 'tk next' and 'tk ready' (agent queues).")
	fmt.Println()
	fmt.Println("  Examples:")
	fmt.Println("    tk create \"Set up AWS credentials\" --awaiting work")
	fmt.Println("    tk update abc --awaiting work       # Convert existing task")
	fmt.Println("    tk update abc --awaiting \"\"         # Return to agent queue")
	fmt.Println("    tk list --awaiting work             # List human-only tasks")
	fmt.Println()
	fmt.Println("DEPRECATION NOTICE:")
	fmt.Println("  --manual is deprecated. Use --awaiting work instead.")
	fmt.Println("  Tasks with manual=true are treated as awaiting=work for backwards compatibility.")
}
