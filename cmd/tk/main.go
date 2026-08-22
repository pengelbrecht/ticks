package main

import (
	"fmt"
	"os"

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
		cmd != "upgrade" && cmd != "--help" && cmd != "-h" &&
		cmd != "merge-file" && cmd != "merge-activity" && cmd != "snippet" &&
		cmd != "skills" {
		if notice := update.CheckPeriodically(Version); notice != "" {
			fmt.Fprintln(os.Stderr, notice)
			fmt.Fprintln(os.Stderr)
		}
	}

	switch args[1] {
	case "init", "whoami", "show", "create", "new", "update", "close", "reopen", "delete", "block", "unblock", "note", "notes", "list", "ls", "ready", "next", "blocked", "label", "labels", "deps", "graph", "roadmap", "status", "rebuild", "merge-file", "merge-activity", "stats", "tui", "snippet", "import", "approve", "reject", "version", "upgrade", "migrate", "config", "gc", "merge", "board", "herd", "skills", "channel", "tell", "ask", "answer", "factory", "cloud", "sandbox":
		// Route to Cobra command (pass args[1:] to include the subcommand)
		// Handle aliases
		cmdArgs := args[1:]
		if args[1] == "new" {
			cmdArgs[0] = "create"
		}
		if args[1] == "ls" {
			cmdArgs[0] = "list"
		}
		if err := cobracmd.ExecuteArgs(cmdArgs); err != nil {
			return cobracmd.GetExitCode(err)
		}
		return exitSuccess
	case "--version", "-v":
		return runVersion()
	case "--help", "-h":
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
	fmt.Println("Commands: init, whoami, show, create (new), block, unblock, update, close, reopen, note, notes, list (ls), ready, next, blocked, rebuild, delete, label, labels, deps, graph, roadmap, status, merge-file, merge-activity, stats, tui, snippet, import, approve, reject, board, herd, config, channel, tell, ask, answer, skills, factory, cloud, sandbox, version, upgrade, migrate, gc, merge")
	fmt.Println()
	fmt.Println("Operator Channel:")
	fmt.Println("  tk channel setup telegram     Pair your Telegram bot with this machine (token stays out of the repo)")
	fmt.Println("  tk channel status             Show what is configured, who it is paired with, and whether the token works")
	fmt.Println("  tk tell <text...>             Send a one-way announcement (reads stdin when text is omitted)")
	fmt.Println("  tk ask <id> --question <q>    Ask the operator and block until answered (exit 5 on timeout)")
	fmt.Println("  tk ask --collect [--wait]     Drain answers to questions asked with --async, as JSON lines")
	fmt.Println("  tk answer <id> <answer...>    Answer a parked question from the terminal")
	fmt.Println()
	fmt.Println("Cloud Factory:")
	fmt.Println("  tk factory deploy             Deploy the factory into your own Cloudflare account")
	fmt.Println("  tk factory setup              Walk the credential ladder: deployment, GitHub PAT, AI Gateway")
	fmt.Println("  tk factory status             Show what is configured and whether each credential works")
	fmt.Println()
	fmt.Println("Cloud Runs:")
	fmt.Println("  tk cloud run <epic>           Push the current branch and start a cloud run")
	fmt.Println("  tk cloud stop <run>           Request a clean stop (--now to revoke the gateway credential immediately)")
	fmt.Println("  tk cloud status               Show cloud runs, leases and queued submissions")
	fmt.Println("  tk cloud logs <run>           Print what the run's container printed (--tail N)")
	fmt.Println("  tk cloud trace <run>          Read the run's model conversation, tool calls and cache stats")
	fmt.Println()
	fmt.Println("Cloud Substrate (drive worker containers from here):")
	fmt.Println("  tk cloud spawn <epic> --ticks Dispatch a wave as one worker container per tick")
	fmt.Println("  tk cloud wait --epic <id>     Block until every worker of the wave pushed its report")
	fmt.Println("  tk cloud collect --epic <id>  Verify each worker's pushed branch and print a verdict")
	fmt.Println("  tk cloud reconcile            Rebuild wave state after an orchestrator dies (read-only)")
	fmt.Println()
	fmt.Println("Skill Bundle:")
	fmt.Println("  tk skills list                List embedded skills and the tk version they ship with")
	fmt.Println("  tk skills get <name>          Print a skill's SKILL.md (--full for the whole bundle)")
	fmt.Println("  tk skills install <name>      Install a skill (default: detect .claude/skills/, .agents/skills/ at repo root)")
	fmt.Println("  tk skills diff <name>         Compare installed skill(s) against the embedded bundle")
	fmt.Println()
	fmt.Println("Agent Orchestration (herdr):")
	fmt.Println("  tk herd spawn <id>            Spawn a gated herdr worker: worktree + agent + first prompt")
	fmt.Println("  tk herd wait --agents a,b     Block until named herdr workers settle (event-driven)")
	fmt.Println("  tk herd reconcile             Rebuild run state after an orchestrator crash (read-only plan)")
	fmt.Println("  tk herd collect <id>          Verify a worker's durable result: commits, RESULT, boundary")
	fmt.Println("  tk herd cleanup <id>          Preview (or --apply) teardown: workspace, branch, manifest")
	fmt.Println("  tk herd dashboard             Live read-only board of a run: waves, ticks, worker states")
	fmt.Println("  tk herd paint --epic <id>     Badge the run's herdr workspaces with tick id, role and status")
	fmt.Println("  tk herd notify                Chime when a worker blocks (request) or a wave finishes (done)")
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
