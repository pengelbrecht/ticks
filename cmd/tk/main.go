package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/beads"
	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/merge"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/tui"
	"github.com/pengelbrecht/ticks/internal/update"
)

var Version = "dev"

// listOutput wraps list results with optional filter metadata for JSON output.
type listOutput struct {
	Ticks   []tick.Tick `json:"ticks"`
	Filters *listFilter `json:"filters,omitempty"`
}

// listFilter captures the search/filter options applied to list output.
type listFilter struct {
	TitleContains string   `json:"title_contains,omitempty"`
	DescContains  string   `json:"desc_contains,omitempty"`
	NotesContains string   `json:"notes_contains,omitempty"`
	LabelAny      []string `json:"label_any,omitempty"`
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

const snippetText = `## Ticks

This project uses ` + "`tk`" + ` for issue tracking. Use ticks for work that spans sessions, has dependencies, or is discovered during other work. Use TodoWrite for simple single-session tasks.

**Essential commands:**
` + "```" + `
tk next                  # next ready tick
tk next EPIC_ID          # next ready tick in epic
tk create "title"        # create issue
tk update ID --status in_progress
tk note ID "message"     # log progress
tk close ID              # mark done
` + "```" + `

**Dependencies & epics:**
` + "```" + `
tk next --epic           # next ready epic
tk block ID BLOCKER_ID   # ID is blocked by BLOCKER_ID
tk create "task" --parent EPIC_ID
tk update ID --parent EPIC_ID  # move to epic
` + "```" + `

Commands show your ticks by default. Use ` + "`--all`" + ` to see everyone's (e.g. ` + "`tk next --all`" + `).

All commands support ` + "`--help`" + ` for options.
`

func run(args []string) int {
	if len(args) < 2 {
		printUsage()
		return exitSuccess
	}

	// Check for updates periodically (skip for certain commands)
	cmd := args[1]
	if cmd != "version" && cmd != "--version" && cmd != "-v" &&
		cmd != "upgrade" && cmd != "--help" && cmd != "-h" &&
		cmd != "merge-file" && cmd != "snippet" {
		if notice := update.CheckPeriodically(Version); notice != "" {
			fmt.Fprintln(os.Stderr, notice)
			fmt.Fprintln(os.Stderr)
		}
	}

	switch args[1] {
	case "init":
		return runInit(args[2:])
	case "whoami":
		return runWhoami(args[2:])
	case "show":
		return runShow(args[2:])
	case "create":
		return runCreate(args[2:])
	case "block":
		return runBlock(args[2:])
	case "unblock":
		return runUnblock(args[2:])
	case "update":
		return runUpdate(args[2:])
	case "close":
		return runClose(args[2:])
	case "reopen":
		return runReopen(args[2:])
	case "note":
		return runNote(args[2:])
	case "notes":
		return runNotes(args[2:])
	case "list":
		return runList(args[2:])
	case "ready":
		return runReady(args[2:])
	case "next":
		return runNext(args[2:])
	case "blocked":
		return runBlocked(args[2:])
	case "rebuild":
		return runRebuild(args[2:])
	case "delete":
		return runDelete(args[2:])
	case "label":
		return runLabel(args[2:])
	case "labels":
		return runLabels(args[2:])
	case "deps":
		return runDeps(args[2:])
	case "status":
		return runStatus(args[2:])
	case "merge-file":
		return runMergeFile(args[2:])
	case "stats":
		return runStats(args[2:])
	case "view":
		return runView(args[2:])
	case "snippet":
		return runSnippet()
	case "import":
		return runImport(args[2:])
	case "approve":
		return runApprove(args[2:])
	case "reject":
		return runReject(args[2:])
	case "version", "--version", "-v":
		return runVersion()
	case "upgrade":
		return runUpgrade()
	case "--help", "-h":
		printUsage()
		return exitSuccess
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", args[1])
		printUsage()
		return exitUsage
	}
}

func runInit(args []string) int {
	fs := flag.NewFlagSet("init", flag.ContinueOnError)
	importBeads := fs.Bool("import-beads", false, "import beads issues after init")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	owner, err := github.DetectOwner(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	tickDir := filepath.Join(root, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create .tick directory: %v\n", err)
		return exitIO
	}

	if err := config.Save(filepath.Join(tickDir, "config.json"), config.Default()); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write config: %v\n", err)
		return exitIO
	}

	if err := os.WriteFile(filepath.Join(tickDir, ".gitignore"), []byte(".index.json\n"), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write .gitignore: %v\n", err)
		return exitIO
	}

	if err := github.EnsureGitAttributes(root); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update .gitattributes: %v\n", err)
		return exitIO
	}
	if err := github.ConfigureMergeDriver(root); err != nil {
		fmt.Fprintf(os.Stderr, "failed to configure merge driver: %v\n", err)
		return exitIO
	}

	fmt.Printf("Detected GitHub repo: %s\n", project)
	fmt.Printf("Detected user: %s\n\n", owner)
	fmt.Println("Initialized .tick/")

	// Import beads if requested
	if *importBeads {
		beadsFile := beads.FindBeadsFile(root)
		if beadsFile == "" {
			fmt.Println("\nNo beads file found to import.")
		} else {
			issues, err := beads.ParseFile(beadsFile)
			if err != nil {
				fmt.Fprintf(os.Stderr, "\nFailed to parse beads file: %v\n", err)
				return exitIO
			}
			store := tick.NewStore(tickDir)
			result, err := beads.Import(issues, store, owner)
			if err != nil {
				fmt.Fprintf(os.Stderr, "\nFailed to import beads: %v\n", err)
				return exitIO
			}
			fmt.Printf("\nImported %d beads issues (%d skipped)\n", result.Imported, result.Skipped)
		}
	}

	fmt.Println()
	fmt.Println("Add the following to your CLAUDE.md or AGENTS.md:")
	fmt.Println()
	fmt.Print(snippetText)

	return exitSuccess
}

func runWhoami(args []string) int {
	fs := flag.NewFlagSet("whoami", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	owner, err := github.DetectOwner(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	if *jsonOutput {
		payload := map[string]string{"owner": owner, "project": project}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("Owner: %s\n", owner)
	fmt.Printf("Project: %s\n", project)
	return exitSuccess
}

func runCreate(args []string) int {
	fs := flag.NewFlagSet("create", flag.ContinueOnError)
	description := fs.String("description", "", "detailed description")
	fs.StringVar(description, "d", "", "detailed description")
	priority := fs.Int("priority", 2, "priority 0-4")
	fs.IntVar(priority, "p", 2, "priority 0-4")
	typeFlag := fs.String("type", tick.TypeTask, "type")
	fs.StringVar(typeFlag, "t", tick.TypeTask, "type")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	labelsFlag := fs.String("labels", "", "comma-separated labels")
	fs.StringVar(labelsFlag, "l", "", "comma-separated labels")
	blockedFlag := fs.String("blocked-by", "", "comma-separated blocker ids")
	fs.StringVar(blockedFlag, "b", "", "comma-separated blocker ids")
	parentFlag := fs.String("parent", "", "parent epic id")
	discoveredFlag := fs.String("discovered-from", "", "source tick id")
	acceptanceFlag := fs.String("acceptance", "", "acceptance criteria")
	deferFlag := fs.String("defer", "", "defer until date (YYYY-MM-DD)")
	externalFlag := fs.String("external-ref", "", "external reference (e.g. gh-42)")
	manualFlag := fs.Bool("manual", false, "mark as requiring human intervention (skipped by tk next)")
	requiresFlag := fs.String("requires", "", "approval gate (approval|review|content) - tick routes to human even if agent signals COMPLETE")
	fs.StringVar(requiresFlag, "r", "", "approval gate (approval|review|content)")
	awaitingFlag := fs.String("awaiting", "", "wait state (work|approval|input|review|content|escalation|checkpoint) - tick assigned to human")
	fs.StringVar(awaitingFlag, "a", "", "wait state (work|approval|input|review|content|escalation|checkpoint)")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk create <title> [flags]")
		fmt.Fprintln(os.Stderr, "\nCreate a new tick (task or epic).")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nAgent-Human Workflow Flags:")
		fmt.Fprintln(os.Stderr, "  --requires value    Pre-declared approval gate (approval|review|content)")
		fmt.Fprintln(os.Stderr, "                      When set, tick routes to human even if agent signals COMPLETE.")
		fmt.Fprintln(os.Stderr, "                      The 'requires' value persists through rejection cycles.")
		fmt.Fprintln(os.Stderr, "  --awaiting value    Immediate human assignment (work|approval|input|review|content|escalation|checkpoint)")
		fmt.Fprintln(os.Stderr, "                      Tick is skipped by agent until human responds.")
		fmt.Fprintln(os.Stderr, "  --manual            [DEPRECATED] Use --awaiting=work instead")
		fmt.Fprintln(os.Stderr, "\nExamples:")
		fmt.Fprintln(os.Stderr, "  # Simple task")
		fmt.Fprintln(os.Stderr, "  tk create \"Fix login bug\" -d \"Users can't login with SSO\"")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Task requiring approval before closing (even after agent completes)")
		fmt.Fprintln(os.Stderr, "  tk create \"Update auth flow\" --requires approval")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Task requiring content/design review")
		fmt.Fprintln(os.Stderr, "  tk create \"Redesign error messages\" --requires content")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Task assigned directly to human (skipped by agent)")
		fmt.Fprintln(os.Stderr, "  tk create \"Configure AWS credentials\" --awaiting work")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Task under an epic with PR review required")
		fmt.Fprintln(os.Stderr, "  tk create \"Implement payment API\" --parent abc123 --requires review")
	}

	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	title := strings.TrimSpace(strings.Join(positionals, " "))
	if title == "" {
		fmt.Fprintln(os.Stderr, "title is required")
		return exitUsage
	}

	// Validate requires flag if provided
	requiresVal := strings.TrimSpace(*requiresFlag)
	if requiresVal != "" {
		switch requiresVal {
		case tick.RequiresApproval, tick.RequiresReview, tick.RequiresContent:
			// valid
		default:
			fmt.Fprintf(os.Stderr, "invalid requires value: %s (must be approval, review, or content)\n", requiresVal)
			return exitUsage
		}
	}

	// Validate awaiting flag if provided
	awaitingVal := strings.TrimSpace(*awaitingFlag)
	if awaitingVal != "" {
		switch awaitingVal {
		case tick.AwaitingWork, tick.AwaitingApproval, tick.AwaitingInput, tick.AwaitingReview, tick.AwaitingContent, tick.AwaitingEscalation, tick.AwaitingCheckpoint:
			// valid
		default:
			fmt.Fprintf(os.Stderr, "invalid awaiting value: %s (must be work, approval, input, review, content, escalation, or checkpoint)\n", awaitingVal)
			return exitUsage
		}
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	cfg, err := config.Load(filepath.Join(root, ".tick", "config.json"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		return exitIO
	}

	creator, err := github.DetectOwner(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	owner := creator
	if strings.TrimSpace(*ownerFlag) != "" {
		owner = strings.TrimSpace(*ownerFlag)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	gen := tick.NewIDGenerator(nil)
	id, newLen, err := gen.Generate(func(candidate string) bool {
		_, err := os.Stat(filepath.Join(root, ".tick", "issues", candidate+".json"))
		return err == nil
	}, cfg.IDLength)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to generate id: %v\n", err)
		return exitIO
	}

	now := time.Now().UTC()
	var deferUntil *time.Time
	if *deferFlag != "" {
		parsed, err := time.Parse("2006-01-02", *deferFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid defer date (use YYYY-MM-DD): %v\n", err)
			return exitUsage
		}
		deferUntil = &parsed
	}

	// Set requires pointer only if value provided
	var requires *string
	if requiresVal != "" {
		requires = &requiresVal
	}

	// Set awaiting pointer only if value provided
	var awaiting *string
	if awaitingVal != "" {
		awaiting = &awaitingVal
	}

	// Handle deprecated --manual flag
	if *manualFlag {
		fmt.Fprintln(os.Stderr, "Warning: --manual is deprecated, use --awaiting work instead")
		// Map manual to awaiting=work if awaiting not already set
		if awaiting == nil {
			awaitingWork := tick.AwaitingWork
			awaiting = &awaitingWork
		}
	}

	t := tick.Tick{
		ID:                 id,
		Title:              title,
		Description:        strings.TrimSpace(*description),
		Status:             tick.StatusOpen,
		Priority:           *priority,
		Type:               strings.TrimSpace(*typeFlag),
		Owner:              owner,
		Labels:             splitCSV(*labelsFlag),
		BlockedBy:          splitCSV(*blockedFlag),
		Parent:             strings.TrimSpace(*parentFlag),
		DiscoveredFrom:     strings.TrimSpace(*discoveredFlag),
		AcceptanceCriteria: strings.TrimSpace(*acceptanceFlag),
		DeferUntil:         deferUntil,
		ExternalRef:        strings.TrimSpace(*externalFlag),
		Manual:             *manualFlag,
		Requires:           requires,
		Awaiting:           awaiting,
		CreatedBy:          creator,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write tick: %v\n", err)
		return exitIO
	}

	if newLen != cfg.IDLength {
		cfg.IDLength = newLen
		if err := config.Save(filepath.Join(root, ".tick", "config.json"), cfg); err != nil {
			fmt.Fprintf(os.Stderr, "failed to update config: %v\n", err)
			return exitIO
		}
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("%s\n", t.ID)
	return exitSuccess
}

func runShow(args []string) int {
	fs := flag.NewFlagSet("show", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("%s  P%d %s  %s  @%s\n\n", t.ID, t.Priority, t.Type, t.Status, t.Owner)
	fmt.Printf("%s\n\n", t.Title)

	if strings.TrimSpace(t.Description) != "" {
		fmt.Println("Description:")
		fmt.Printf("  %s\n\n", t.Description)
	}

	if strings.TrimSpace(t.Notes) != "" {
		fmt.Println("Notes:")
		for _, line := range strings.Split(t.Notes, "\n") {
			fmt.Printf("  %s\n", line)
		}
		fmt.Println()
	}

	if len(t.Labels) > 0 {
		fmt.Printf("Labels: %s\n", strings.Join(t.Labels, ", "))
	}
	if len(t.BlockedBy) > 0 {
		var blocked []string
		for _, blocker := range t.BlockedBy {
			blk, err := store.Read(blocker)
			if err != nil {
				blocked = append(blocked, fmt.Sprintf("%s (unknown)", blocker))
				continue
			}
			blocked = append(blocked, fmt.Sprintf("%s (%s)", blocker, blk.Status))
		}
		fmt.Printf("Blocked by: %s\n", strings.Join(blocked, ", "))
	}
	if strings.TrimSpace(t.AcceptanceCriteria) != "" {
		fmt.Printf("Acceptance: %s\n", t.AcceptanceCriteria)
	}
	if t.DeferUntil != nil {
		fmt.Printf("Deferred until: %s\n", t.DeferUntil.Format("2006-01-02"))
	}
	if strings.TrimSpace(t.ExternalRef) != "" {
		fmt.Printf("External: %s\n", t.ExternalRef)
	}

	fmt.Printf("Created: %s by %s\n", formatTime(t.CreatedAt), t.CreatedBy)
	fmt.Printf("Updated: %s\n\n", formatTime(t.UpdatedAt))

	fmt.Printf("Global: %s:%s\n", project, t.ID)

	return exitSuccess
}

func runBlock(args []string) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: tk block <id> <blocker-id>")
		return exitUsage
	}
	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}
	blockerID, err := github.NormalizeID(project, args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid blocker id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}
	if _, err := store.Read(blockerID); err != nil {
		fmt.Fprintf(os.Stderr, "failed to read blocker tick: %v\n", err)
		return exitNotFound
	}

	t.BlockedBy = appendUnique(t.BlockedBy, blockerID)
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}

	return exitSuccess
}

func runUnblock(args []string) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: tk unblock <id> <blocker-id>")
		return exitUsage
	}
	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}
	blockerID, err := github.NormalizeID(project, args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid blocker id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	t.BlockedBy = removeString(t.BlockedBy, blockerID)
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}

	return exitSuccess
}

func runUpdate(args []string) int {
	fs := flag.NewFlagSet("update", flag.ContinueOnError)
	var title, description, notes, status, typ, owner optionalString
	var priority optionalInt
	var addLabels, removeLabels optionalString
	jsonOutput := fs.Bool("json", false, "output as json")

	fs.Var(&title, "title", "new title")
	fs.Var(&description, "description", "new description")
	fs.Var(&notes, "notes", "replace notes")
	fs.Var(&status, "status", "new status")
	fs.Var(&priority, "priority", "new priority")
	fs.Var(&typ, "type", "new type")
	fs.Var(&owner, "owner", "new owner")
	fs.Var(&addLabels, "add-labels", "labels to add")
	fs.Var(&removeLabels, "remove-labels", "labels to remove")
	var acceptance, externalRef optionalString
	var deferUntil optionalString
	var parent optionalString
	fs.Var(&acceptance, "acceptance", "acceptance criteria")
	fs.Var(&deferUntil, "defer", "defer until date (YYYY-MM-DD)")
	fs.Var(&externalRef, "external-ref", "external reference")
	fs.Var(&parent, "parent", "parent epic id (use empty string to clear)")
	var manual optionalBool
	fs.Var(&manual, "manual", "mark as requiring human intervention (true/false)")
	var requires optionalString
	fs.Var(&requires, "requires", "approval gate (approval|review|content, empty to clear)")
	fs.Var(&requires, "r", "approval gate (approval|review|content, empty to clear)")
	var awaiting optionalString
	fs.Var(&awaiting, "awaiting", "wait state (work|approval|input|review|content|escalation|checkpoint, empty to clear)")
	fs.Var(&awaiting, "a", "wait state (work|approval|input|review|content|escalation|checkpoint, empty to clear)")
	var verdict optionalString
	fs.Var(&verdict, "verdict", "set verdict and trigger processing (approved|rejected)")
	fs.Var(&verdict, "v", "set verdict and trigger processing (approved|rejected)")

	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk update <id> [flags]")
		fmt.Fprintln(os.Stderr, "\nUpdate tick fields. All flags are optional.")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nAgent-Human Workflow Flags:")
		fmt.Fprintln(os.Stderr, "  --requires value    Pre-declared approval gate (approval|review|content, empty to clear)")
		fmt.Fprintln(os.Stderr, "  --awaiting value    Wait state (work|approval|input|review|content|escalation|checkpoint, empty to clear)")
		fmt.Fprintln(os.Stderr, "  --verdict value     Set verdict and trigger processing (approved|rejected)")
		fmt.Fprintln(os.Stderr, "  --manual            [DEPRECATED] Use --awaiting=work instead")
		fmt.Fprintln(os.Stderr, "\nExamples:")
		fmt.Fprintln(os.Stderr, "  # Route task to human for approval")
		fmt.Fprintln(os.Stderr, "  tk update abc123 --awaiting approval")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Clear awaiting (return to agent queue)")
		fmt.Fprintln(os.Stderr, "  tk update abc123 --awaiting=")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Add pre-declared approval gate")
		fmt.Fprintln(os.Stderr, "  tk update abc123 --requires approval")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Mark task as needing human work (replaces --manual)")
		fmt.Fprintln(os.Stderr, "  tk update abc123 --awaiting work")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Set verdict on awaiting tick (lower-level alternative to tk approve/reject)")
		fmt.Fprintln(os.Stderr, "  tk update abc123 --verdict approved")
	}
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	if title.set {
		t.Title = title.value
	}
	if description.set {
		t.Description = description.value
	}
	if notes.set {
		t.Notes = notes.value
	}
	if status.set {
		t.Status = status.value
		if status.value == tick.StatusClosed {
			now := time.Now().UTC()
			t.ClosedAt = &now
		} else {
			t.ClosedAt = nil
			t.ClosedReason = ""
		}
	}
	if priority.set {
		t.Priority = priority.value
	}
	if typ.set {
		t.Type = typ.value
	}
	if owner.set {
		t.Owner = owner.value
	}
	if addLabels.set {
		for _, label := range splitCSV(addLabels.value) {
			t.Labels = appendUnique(t.Labels, label)
		}
	}
	if removeLabels.set {
		for _, label := range splitCSV(removeLabels.value) {
			t.Labels = removeString(t.Labels, label)
		}
	}
	if acceptance.set {
		t.AcceptanceCriteria = acceptance.value
	}
	if deferUntil.set {
		if deferUntil.value == "" {
			t.DeferUntil = nil
		} else {
			parsed, err := time.Parse("2006-01-02", deferUntil.value)
			if err != nil {
				fmt.Fprintf(os.Stderr, "invalid defer date (use YYYY-MM-DD): %v\n", err)
				return exitUsage
			}
			t.DeferUntil = &parsed
		}
	}
	if externalRef.set {
		t.ExternalRef = externalRef.value
	}
	if manual.set {
		fmt.Fprintln(os.Stderr, "Warning: --manual is deprecated, use --awaiting work instead")
		// Map manual=true to awaiting=work if awaiting not explicitly set
		if manual.value && !awaiting.set {
			awaitingWork := tick.AwaitingWork
			t.Awaiting = &awaitingWork
		}
		// Still set Manual for backwards compatibility with old code
		t.Manual = manual.value
	}
	if parent.set {
		t.Parent = parent.value
	}
	if requires.set {
		if requires.value == "" {
			t.Requires = nil
		} else {
			switch requires.value {
			case tick.RequiresApproval, tick.RequiresReview, tick.RequiresContent:
				t.Requires = &requires.value
			default:
				fmt.Fprintf(os.Stderr, "invalid requires value: %s (must be approval, review, or content)\n", requires.value)
				return exitUsage
			}
		}
	}
	if awaiting.set {
		if awaiting.value == "" {
			t.Awaiting = nil
		} else {
			switch awaiting.value {
			case tick.AwaitingWork, tick.AwaitingApproval, tick.AwaitingInput, tick.AwaitingReview, tick.AwaitingContent, tick.AwaitingEscalation, tick.AwaitingCheckpoint:
				t.Awaiting = &awaiting.value
			default:
				fmt.Fprintf(os.Stderr, "invalid awaiting value: %s (must be work, approval, input, review, content, escalation, or checkpoint)\n", awaiting.value)
				return exitUsage
			}
		}
	}
	if verdict.set {
		switch verdict.value {
		case tick.VerdictApproved, tick.VerdictRejected:
			t.Verdict = &verdict.value
		default:
			fmt.Fprintf(os.Stderr, "invalid verdict value: %s (must be approved or rejected)\n", verdict.value)
			return exitUsage
		}
	}

	t.UpdatedAt = time.Now().UTC()

	// Process verdict if it was set (triggers state machine)
	if verdict.set {
		_, err := tick.ProcessVerdict(&t)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to process verdict: %v\n", err)
			return exitGeneric
		}
	}

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
	}
	return exitSuccess
}

func runClose(args []string) int {
	fs := flag.NewFlagSet("close", flag.ContinueOnError)
	reason := fs.String("reason", "", "close reason")
	force := fs.Bool("force", false, "close epic and all open children")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	now := time.Now().UTC()

	// Check for open children if closing an epic
	if t.Type == tick.TypeEpic {
		all, err := store.List()
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
			return exitIO
		}

		var openChildren []tick.Tick
		for _, child := range all {
			if child.Parent == t.ID && child.Status != tick.StatusClosed {
				openChildren = append(openChildren, child)
			}
		}

		if len(openChildren) > 0 {
			if !*force {
				fmt.Fprintf(os.Stderr, "cannot close epic %s: has %d open children\n", t.ID, len(openChildren))
				for _, c := range openChildren {
					fmt.Fprintf(os.Stderr, "  - %s: %s\n", c.ID, c.Title)
				}
				fmt.Fprintln(os.Stderr, "use --force to close epic and all children")
				return exitUsage
			}

			// Close all children with --force (respecting requires gates)
			for _, c := range openChildren {
				routed := tick.HandleClose(&c, "closed with parent epic (--force)")
				if routed {
					// Child was routed to human instead of closed - still needs to be saved
					c.UpdatedAt = now
				}
				if err := store.Write(c); err != nil {
					fmt.Fprintf(os.Stderr, "failed to close child %s: %v\n", c.ID, err)
					return exitIO
				}
			}
		}
	}

	// Use HandleClose to respect requires field
	tick.HandleClose(&t, *reason)

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to close tick: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
	}
	return exitSuccess
}

func runReopen(args []string) int {
	fs := flag.NewFlagSet("reopen", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	t.Status = tick.StatusOpen
	t.ClosedAt = nil
	t.ClosedReason = ""
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to reopen tick: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
	}
	return exitSuccess
}

func runNote(args []string) int {
	fs := flag.NewFlagSet("note", flag.ContinueOnError)
	edit := fs.Bool("edit", false, "edit notes in $EDITOR")
	from := fs.String("from", "agent", "note author: agent or human")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk note <id> \"message\" [--from agent|human]")
		fmt.Fprintln(os.Stderr, "\nAdd a timestamped note to a tick.")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nNote Authors:")
		fmt.Fprintln(os.Stderr, "  The --from flag marks the source of the note for agent-human handoffs:")
		fmt.Fprintln(os.Stderr, "  - agent: Context about work, questions, PR links (default)")
		fmt.Fprintln(os.Stderr, "  - human: Feedback, answers, direction for the agent")
		fmt.Fprintln(os.Stderr, "\nExamples:")
		fmt.Fprintln(os.Stderr, "  # Agent adding context (default)")
		fmt.Fprintln(os.Stderr, "  tk note abc123 \"PR ready: https://github.com/org/repo/pull/456\"")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human providing feedback after rejection")
		fmt.Fprintln(os.Stderr, "  tk note abc123 \"Use friendlier language in error messages\" --from human")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human answering a question")
		fmt.Fprintln(os.Stderr, "  tk note abc123 \"Use Stripe for payment processing\" --from human")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Note: tk reject <id> \"feedback\" automatically adds a human-marked note.")
	}
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	if *edit {
		editor := strings.TrimSpace(os.Getenv("EDITOR"))
		if editor == "" {
			fmt.Fprintln(os.Stderr, "EDITOR is not set")
			return exitUsage
		}

		tmp, err := os.CreateTemp("", "tick-notes-*.txt")
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to create temp file: %v\n", err)
			return exitIO
		}
		defer os.Remove(tmp.Name())

		if _, err := tmp.WriteString(t.Notes); err != nil {
			_ = tmp.Close()
			fmt.Fprintf(os.Stderr, "failed to write temp file: %v\n", err)
			return exitIO
		}
		if err := tmp.Close(); err != nil {
			fmt.Fprintf(os.Stderr, "failed to close temp file: %v\n", err)
			return exitIO
		}

		cmd := exec.Command(editor, tmp.Name())
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "editor failed: %v\n", err)
			return exitIO
		}

		updated, err := os.ReadFile(tmp.Name())
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to read temp file: %v\n", err)
			return exitIO
		}
		t.Notes = string(updated)
		t.UpdatedAt = time.Now().UTC()
		if err := store.Write(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	if len(positionals) < 2 {
		fmt.Fprintln(os.Stderr, "note text is required")
		return exitUsage
	}
	note := strings.TrimSpace(strings.Join(positionals[1:], " "))
	if note == "" {
		fmt.Fprintln(os.Stderr, "note text is required")
		return exitUsage
	}

	// Validate --from flag
	if *from != "agent" && *from != "human" {
		fmt.Fprintf(os.Stderr, "invalid --from value: %s (must be agent or human)\n", *from)
		return exitUsage
	}

	timestamp := time.Now().Format("2006-01-02 15:04")
	var line string
	if *from == "human" {
		line = fmt.Sprintf("%s - [human] %s", timestamp, note)
	} else {
		line = fmt.Sprintf("%s - %s", timestamp, note)
	}
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
	} else {
		t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
	}
	t.UpdatedAt = time.Now().UTC()
	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}
	return exitSuccess
}

func runNotes(args []string) int {
	fs := flag.NewFlagSet("notes", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	fmt.Printf("Notes for %s (%s):\n\n", t.ID, t.Title)
	fmt.Printf("%s\n", t.Notes)
	return exitSuccess
}

func runList(args []string) int {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	fs.BoolVar(allOwners, "a", false, "all owners")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	statusFlag := fs.String("status", "", "status")
	fs.StringVar(statusFlag, "s", "", "status")
	priorityFlag := fs.Int("priority", -1, "priority")
	fs.IntVar(priorityFlag, "p", -1, "priority")
	typeFlag := fs.String("type", "", "type")
	fs.StringVar(typeFlag, "t", "", "type")
	labelFlag := fs.String("label", "", "label")
	fs.StringVar(labelFlag, "l", "", "label")
	labelAnyFlag := fs.String("label-any", "", "label-any (comma-separated)")
	parentFlag := fs.String("parent", "", "parent epic id")
	titleContainsFlag := fs.String("title-contains", "", "title contains (case-insensitive)")
	descContainsFlag := fs.String("desc-contains", "", "description contains (case-insensitive)")
	notesContainsFlag := fs.String("notes-contains", "", "notes contains (case-insensitive)")
	manualFlag := fs.Bool("manual", false, "show only manual tasks (requires human intervention)")
	var awaitingFilter optionalString
	fs.Var(&awaitingFilter, "awaiting", "filter by awaiting status (empty = all awaiting, or specific type(s) comma-separated)")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk list [flags]")
		fmt.Fprintln(os.Stderr, "\nList ticks with optional filters.")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nAwaiting Filter Examples:")
		fmt.Fprintln(os.Stderr, "  # All ticks awaiting human action")
		fmt.Fprintln(os.Stderr, "  tk list --awaiting=")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Only ticks awaiting approval")
		fmt.Fprintln(os.Stderr, "  tk list --awaiting approval")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Ticks awaiting approval or review")
		fmt.Fprintln(os.Stderr, "  tk list --awaiting approval,review")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Show what needs your attention (JSON)")
		fmt.Fprintln(os.Stderr, "  tk list --awaiting= --json | jq '.ticks[] | {id, title, awaiting}'")
	}
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	owner, err := resolveOwner(*allOwners, *ownerFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	var priority *int
	if *priorityFlag >= 0 {
		p := *priorityFlag
		priority = &p
	}

	status := strings.TrimSpace(*statusFlag)
	if status == "all" {
		status = ""
	}

	filter := query.Filter{
		Owner:         owner,
		Status:        status,
		Priority:      priority,
		Type:          strings.TrimSpace(*typeFlag),
		Label:         strings.TrimSpace(*labelFlag),
		LabelAny:      splitCSV(*labelAnyFlag),
		Parent:        strings.TrimSpace(*parentFlag),
		TitleContains: strings.TrimSpace(*titleContainsFlag),
		DescContains:  strings.TrimSpace(*descContainsFlag),
		NotesContains: strings.TrimSpace(*notesContainsFlag),
	}

	filtered := query.Apply(ticks, filter)

	// Filter by manual status if requested
	if *manualFlag {
		var manualTicks []tick.Tick
		for _, t := range filtered {
			if t.Manual {
				manualTicks = append(manualTicks, t)
			}
		}
		filtered = manualTicks
	}

	// Filter by awaiting status if requested
	if awaitingFilter.set {
		awaitingVal := strings.TrimSpace(awaitingFilter.value)
		var awaitingTicks []tick.Tick
		if awaitingVal == "" {
			// Empty string means all awaiting ticks
			for _, t := range filtered {
				if t.IsAwaitingHuman() {
					awaitingTicks = append(awaitingTicks, t)
				}
			}
		} else {
			// Filter by specific awaiting type(s)
			types := splitCSV(awaitingVal)
			typeSet := make(map[string]bool)
			for _, typ := range types {
				typeSet[typ] = true
			}
			for _, t := range filtered {
				if t.IsAwaitingHuman() && typeSet[t.GetAwaitingType()] {
					awaitingTicks = append(awaitingTicks, t)
				}
			}
		}
		filtered = awaitingTicks
	}

	query.SortByPriorityCreatedAt(filtered)

	if *jsonOutput {
		output := listOutput{Ticks: filtered}
		// Include filter metadata if any search filters are present
		if filter.TitleContains != "" || filter.DescContains != "" || filter.NotesContains != "" || len(filter.LabelAny) > 0 {
			output.Filters = &listFilter{
				TitleContains: filter.TitleContains,
				DescContains:  filter.DescContains,
				NotesContains: filter.NotesContains,
				LabelAny:      filter.LabelAny,
			}
		}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(output); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Println(" ID   PRI  TYPE     STATUS  TITLE")
	for _, t := range filtered {
		fmt.Printf(" %-4s P%d   %-7s %-7s %s\n", t.ID, t.Priority, t.Type, t.Status, t.Title)
	}
	fmt.Printf("\n%d ticks\n", len(filtered))
	return exitSuccess
}

func runReady(args []string) int {
	fs := flag.NewFlagSet("ready", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	fs.BoolVar(allOwners, "a", false, "all owners")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	limitFlag := fs.Int("limit", 10, "max results")
	fs.IntVar(limitFlag, "n", 10, "max results")
	labelFlag := fs.String("label", "", "label")
	fs.StringVar(labelFlag, "l", "", "label")
	labelAnyFlag := fs.String("label-any", "", "label-any (comma-separated)")
	titleContainsFlag := fs.String("title-contains", "", "title contains (case-insensitive)")
	descContainsFlag := fs.String("desc-contains", "", "description contains (case-insensitive)")
	notesContainsFlag := fs.String("notes-contains", "", "notes contains (case-insensitive)")
	includeAwaiting := fs.Bool("include-awaiting", false, "include tasks awaiting human action (excluded by default)")
	includeManual := fs.Bool("include-manual", false, "deprecated: use --include-awaiting instead")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	owner, err := resolveOwner(*allOwners, *ownerFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	// Deprecation warning for --include-manual
	if *includeManual {
		fmt.Fprintf(os.Stderr, "warning: --include-manual is deprecated, use --include-awaiting instead\n")
	}

	filter := query.Filter{
		Owner:         owner,
		Label:         strings.TrimSpace(*labelFlag),
		LabelAny:      splitCSV(*labelAnyFlag),
		TitleContains: strings.TrimSpace(*titleContainsFlag),
		DescContains:  strings.TrimSpace(*descContainsFlag),
		NotesContains: strings.TrimSpace(*notesContainsFlag),
	}
	filtered := query.Apply(ticks, filter)

	// Use ReadyIncludeAwaiting when --include-awaiting or deprecated --include-manual is set
	var ready []tick.Tick
	if *includeAwaiting || *includeManual {
		ready = query.ReadyIncludeAwaiting(filtered, ticks)
	} else {
		ready = query.Ready(filtered, ticks)
	}

	query.SortByPriorityCreatedAt(ready)

	if *limitFlag > 0 && len(ready) > *limitFlag {
		ready = ready[:*limitFlag]
	}

	if *jsonOutput {
		output := listOutput{Ticks: ready}
		// Include filter metadata if any search filters are present
		if filter.TitleContains != "" || filter.DescContains != "" || filter.NotesContains != "" || len(filter.LabelAny) > 0 {
			output.Filters = &listFilter{
				TitleContains: filter.TitleContains,
				DescContains:  filter.DescContains,
				NotesContains: filter.NotesContains,
				LabelAny:      filter.LabelAny,
			}
		}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(output); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Println(" ID   PRI  TYPE     STATUS  TITLE")
	for _, t := range ready {
		fmt.Printf(" %-4s P%d   %-7s %-7s %s\n", t.ID, t.Priority, t.Type, t.Status, t.Title)
	}
	fmt.Printf("\n%d ticks (ready)\n", len(ready))
	return exitSuccess
}

func runNext(args []string) int {
	fs := flag.NewFlagSet("next", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	fs.BoolVar(allOwners, "a", false, "all owners")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	epicFlag := fs.Bool("epic", false, "show next ready epic")
	fs.BoolVar(epicFlag, "e", false, "show next ready epic")
	includeManual := fs.Bool("include-manual", false, "include tasks marked as manual (excluded by default)")
	var awaitingFilter optionalString
	fs.Var(&awaitingFilter, "awaiting", "get next task awaiting human (empty = any type, or specific type(s) comma-separated)")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk next [EPIC_ID] [flags]")
		fmt.Fprintln(os.Stderr, "\nShow the next ready tick to work on.")
		fmt.Fprintln(os.Stderr, "If EPIC_ID is provided, shows the next ready tick within that epic.")
		fmt.Fprintln(os.Stderr, "Tasks marked as --manual or awaiting human are excluded by default.")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nAgent Mode (default):")
		fmt.Fprintln(os.Stderr, "  Returns next task for agent: open, not blocked, not awaiting human.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Human Mode (--awaiting):")
		fmt.Fprintln(os.Stderr, "  Returns next task awaiting human action.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Examples:")
		fmt.Fprintln(os.Stderr, "  # Agent's next task")
		fmt.Fprintln(os.Stderr, "  tk next epic-123")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human's next task (any awaiting type)")
		fmt.Fprintln(os.Stderr, "  tk next epic-123 --awaiting=")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human's next approval to review")
		fmt.Fprintln(os.Stderr, "  tk next epic-123 --awaiting approval")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human's next content or review task")
		fmt.Fprintln(os.Stderr, "  tk next epic-123 --awaiting content,review")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Human's next task across all epics")
		fmt.Fprintln(os.Stderr, "  tk next --awaiting=")
	}
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}

	owner, err := resolveOwner(*allOwners, *ownerFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	// Determine filter based on flags and positional args
	filter := query.Filter{Owner: owner}

	if *epicFlag {
		// Next ready epic
		filter.Type = tick.TypeEpic
	} else if len(positionals) > 0 {
		// Next ready tick in a specific epic
		parentID, err := github.NormalizeID(project, positionals[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid epic id: %v\n", err)
			return exitNotFound
		}
		filter.Parent = parentID
	}

	filtered := query.Apply(ticks, filter)

	// Human mode: return next awaiting task
	if awaitingFilter.set {
		awaitingVal := strings.TrimSpace(awaitingFilter.value)
		var awaiting []tick.Tick

		// Filter for open, awaiting tasks (not blocked by status)
		for _, t := range filtered {
			if t.Status != tick.StatusOpen {
				continue
			}
			if !t.IsAwaitingHuman() {
				continue
			}
			// If specific types requested, filter by them
			if awaitingVal != "" {
				types := splitCSV(awaitingVal)
				typeSet := make(map[string]bool)
				for _, typ := range types {
					typeSet[typ] = true
				}
				if !typeSet[t.GetAwaitingType()] {
					continue
				}
			}
			awaiting = append(awaiting, t)
		}

		query.SortByPriorityCreatedAt(awaiting)

		if len(awaiting) == 0 {
			if *jsonOutput {
				fmt.Println("null")
				return exitSuccess
			}
			fmt.Println("No awaiting ticks")
			return exitSuccess
		}

		next := awaiting[0]
		if *jsonOutput {
			enc := json.NewEncoder(os.Stdout)
			if err := enc.Encode(next); err != nil {
				fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
				return exitIO
			}
			return exitSuccess
		}
		fmt.Printf("%s  P%d %s  %s (awaiting: %s)\n", next.ID, next.Priority, next.Type, next.Title, next.GetAwaitingType())
		return exitSuccess
	}

	// Agent mode: return next ready task (not awaiting)
	ready := query.Ready(filtered, ticks)

	// Exclude manual tasks by default
	if !*includeManual {
		var nonManual []tick.Tick
		for _, t := range ready {
			if !t.Manual {
				nonManual = append(nonManual, t)
			}
		}
		ready = nonManual
	}

	// Exclude awaiting tasks (agent shouldn't pick these up)
	var nonAwaiting []tick.Tick
	for _, t := range ready {
		if !t.IsAwaitingHuman() {
			nonAwaiting = append(nonAwaiting, t)
		}
	}
	ready = nonAwaiting

	query.SortByPriorityCreatedAt(ready)

	if len(ready) == 0 {
		if *jsonOutput {
			fmt.Println("null")
			return exitSuccess
		}
		fmt.Println("No ready ticks")
		return exitSuccess
	}

	next := ready[0]

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(next); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("%s  P%d %s  %s\n", next.ID, next.Priority, next.Type, next.Title)
	return exitSuccess
}

func runBlocked(args []string) int {
	fs := flag.NewFlagSet("blocked", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	fs.BoolVar(allOwners, "a", false, "all owners")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	owner, err := resolveOwner(*allOwners, *ownerFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	filtered := query.Apply(ticks, query.Filter{Owner: owner})
	blocked := query.Blocked(filtered, ticks)
	query.SortByPriorityCreatedAt(blocked)

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(blocked); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Println(" ID   PRI  TYPE     STATUS  TITLE")
	for _, t := range blocked {
		fmt.Printf(" %-4s P%d   %-7s %-7s %s\n", t.ID, t.Priority, t.Type, t.Status, t.Title)
	}
	fmt.Printf("\n%d ticks (blocked)\n", len(blocked))
	return exitSuccess
}

func runRebuild(args []string) int {
	fs := flag.NewFlagSet("rebuild", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	indexPath := filepath.Join(root, ".tick", ".index.json")
	if err := query.SaveIndex(indexPath, ticks); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write index: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		payload := map[string]any{"count": len(ticks)}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("Rebuilt index with %d ticks\n", len(ticks))
	return exitSuccess
}

func runDelete(args []string) int {
	fs := flag.NewFlagSet("delete", flag.ContinueOnError)
	force := fs.Bool("force", false, "skip confirmation")
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	if !*force {
		fmt.Printf("Delete %s? (y/N): ", id)
		var response string
		if _, err := fmt.Fscanln(os.Stdin, &response); err != nil || strings.ToLower(strings.TrimSpace(response)) != "y" {
			fmt.Println("Aborted.")
			return exitSuccess
		}
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Delete(id); err != nil {
		fmt.Fprintf(os.Stderr, "failed to delete tick: %v\n", err)
		return exitIO
	}

	// Cleanup references in other ticks.
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}
	for _, t := range ticks {
		updated := removeString(t.BlockedBy, id)
		if len(updated) == len(t.BlockedBy) {
			continue
		}
		t.BlockedBy = updated
		t.UpdatedAt = time.Now().UTC()
		if err := store.Write(t); err != nil {
			fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
			return exitIO
		}
	}

	fmt.Printf("Deleted %s\n", id)
	return exitSuccess
}

func runLabel(args []string) int {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "usage: tk label <add|rm|list> <id> [label]")
		return exitUsage
	}
	switch args[0] {
	case "add":
		return runLabelAdd(args[1:])
	case "rm":
		return runLabelRemove(args[1:])
	case "list":
		return runLabelList(args[1:])
	default:
		fmt.Fprintln(os.Stderr, "usage: tk label <add|rm|list> <id> [label]")
		return exitUsage
	}
}

func runLabelAdd(args []string) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: tk label add <id> <label>")
		return exitUsage
	}
	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}
	t.Labels = appendUnique(t.Labels, args[1])
	t.UpdatedAt = time.Now().UTC()
	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}
	return exitSuccess
}

func runLabelRemove(args []string) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: tk label rm <id> <label>")
		return exitUsage
	}
	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}
	t.Labels = removeString(t.Labels, args[1])
	t.UpdatedAt = time.Now().UTC()
	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to update tick: %v\n", err)
		return exitIO
	}
	return exitSuccess
}

func runLabelList(args []string) int {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "usage: tk label list <id>")
		return exitUsage
	}
	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}
	if len(t.Labels) == 0 {
		return exitSuccess
	}
	for _, label := range t.Labels {
		fmt.Println(label)
	}
	return exitSuccess
}

func runLabels(args []string) int {
	fs := flag.NewFlagSet("labels", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	counts := make(map[string]int)
	for _, t := range ticks {
		for _, label := range t.Labels {
			counts[label]++
		}
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(counts); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	for label, count := range counts {
		fmt.Printf("%s: %d\n", label, count)
	}
	return exitSuccess
}

func runDeps(args []string) int {
	fs := flag.NewFlagSet("deps", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}
	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	target, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	var dependents []tick.Tick
	for _, t := range ticks {
		for _, blocker := range t.BlockedBy {
			if blocker == target.ID {
				dependents = append(dependents, t)
				break
			}
		}
	}

	if *jsonOutput {
		payload := map[string]any{"blocked_by": target.BlockedBy, "blocks": dependents}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("%s is blocked by: %s\n", target.ID, strings.Join(target.BlockedBy, ", "))
	if len(dependents) == 0 {
		fmt.Printf("%s blocks: none\n", target.ID)
		return exitSuccess
	}
	fmt.Printf("%s blocks:\n", target.ID)
	for _, t := range dependents {
		fmt.Printf("- %s %s (%s)\n", t.ID, t.Title, t.Status)
	}
	return exitSuccess
}

func runStatus(args []string) int {
	fs := flag.NewFlagSet("status", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	cmd := exec.Command("git", "status", "--short", "--", ".tick")
	cmd.Dir = root
	output, err := cmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to get git status: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		changes := splitLines(strings.TrimSpace(string(output)))
		payload := map[string]any{"changes": changes}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("%s", output)
	return exitSuccess
}

func runMergeFile(args []string) int {
	if len(args) < 4 {
		fmt.Fprintln(os.Stderr, "usage: tk merge-file <base> <ours> <theirs> <path>")
		return exitUsage
	}
	base, err := tickFromPath(args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read base: %v\n", err)
		return exitIO
	}
	ours, err := tickFromPath(args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read ours: %v\n", err)
		return exitIO
	}
	theirs, err := tickFromPath(args[2])
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read theirs: %v\n", err)
		return exitIO
	}

	merged := merge.Merge(base, ours, theirs)
	if err := writeTickPath(args[3], merged); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write merged: %v\n", err)
		return exitIO
	}
	return exitSuccess
}

func runStats(args []string) int {
	fs := flag.NewFlagSet("stats", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	owner, err := resolveOwner(*allOwners, "")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	filtered := query.Apply(ticks, query.Filter{Owner: owner})

	statusCounts := make(map[string]int)
	priorityCounts := make(map[int]int)
	typeCounts := make(map[string]int)

	for _, t := range filtered {
		statusCounts[t.Status]++
		priorityCounts[t.Priority]++
		typeCounts[t.Type]++
	}

	ready := query.Ready(filtered, ticks)
	blocked := query.Blocked(filtered, ticks)

	if *jsonOutput {
		payload := map[string]any{
			"total":    len(filtered),
			"status":   statusCounts,
			"priority": priorityCounts,
			"type":     typeCounts,
			"ready":    len(ready),
			"blocked":  len(blocked),
		}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	fmt.Println(project)
	fmt.Printf("\n  Total: %d ticks\n", len(filtered))
	fmt.Printf("  Status: %s\n", formatStatusCounts(statusCounts))
	fmt.Printf("  Priority: %s\n", formatPriorityCounts(priorityCounts))
	fmt.Printf("  Types: %s\n", formatTypeCounts(typeCounts))
	fmt.Printf("\n  Ready: %d\n", len(ready))
	fmt.Printf("  Blocked: %d\n", len(blocked))
	return exitSuccess
}

func runView(args []string) int {
	fs := flag.NewFlagSet("view", flag.ContinueOnError)
	allOwners := fs.Bool("all", false, "all owners")
	fs.BoolVar(allOwners, "a", false, "all owners")
	ownerFlag := fs.String("owner", "", "owner")
	fs.StringVar(ownerFlag, "o", "", "owner")
	statusFlag := fs.String("status", "", "status")
	fs.StringVar(statusFlag, "s", "", "status")
	priorityFlag := fs.Int("priority", -1, "priority")
	fs.IntVar(priorityFlag, "p", -1, "priority")
	typeFlag := fs.String("type", "", "type")
	fs.StringVar(typeFlag, "t", "", "type")
	labelFlag := fs.String("label", "", "label")
	fs.StringVar(labelFlag, "l", "", "label")
	parentFlag := fs.String("parent", "", "parent epic id")
	fs.SetOutput(os.Stderr)
	if _, err := parseInterleaved(fs, args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	owner, err := resolveOwner(*allOwners, *ownerFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to list ticks: %v\n", err)
		return exitIO
	}

	var priority *int
	if *priorityFlag >= 0 {
		p := *priorityFlag
		priority = &p
	}

	status := strings.TrimSpace(*statusFlag)
	if status == "all" {
		status = ""
	}

	filter := query.Filter{
		Owner:    owner,
		Status:   status,
		Priority: priority,
		Type:     strings.TrimSpace(*typeFlag),
		Label:    strings.TrimSpace(*labelFlag),
		Parent:   strings.TrimSpace(*parentFlag),
	}

	filtered := query.Apply(ticks, filter)

	model := tui.NewModel(filtered)
	if _, err := tea.NewProgram(model, tea.WithAltScreen()).Run(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to run view: %v\n", err)
		return exitIO
	}
	return exitSuccess
}

func runSnippet() int {
	fmt.Print(snippetText)
	return exitSuccess
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

func runUpgrade() int {
	fmt.Printf("Current version: %s\n", Version)

	method := update.DetectInstallMethod()
	if method == update.InstallHomebrew {
		fmt.Println("\ntk was installed via Homebrew.")
		fmt.Println("Run: brew upgrade ticks")
		return exitSuccess
	}

	fmt.Println("Checking for updates...")

	release, hasUpdate, err := update.CheckForUpdate(Version)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to check for updates: %v\n", err)
		return exitGeneric
	}

	if !hasUpdate {
		fmt.Println("Already at latest version.")
		return exitSuccess
	}

	fmt.Printf("Updating to %s...\n", release.Version)

	if err := update.Update(Version); err != nil {
		fmt.Fprintf(os.Stderr, "Update failed: %v\n", err)
		return exitGeneric
	}

	fmt.Printf("Successfully updated to %s\n", release.Version)
	return exitSuccess
}

func runImport(args []string) int {
	fs := flag.NewFlagSet("import", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)

	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}

	// Check if ticks is initialized
	if _, err := os.Stat(filepath.Join(root, ".tick")); os.IsNotExist(err) {
		fmt.Fprintln(os.Stderr, "ticks not initialized. Run `tk init` first.")
		return exitNoRepo
	}

	// Determine source file
	var sourcePath string
	if len(positionals) > 0 && positionals[0] != "beads" {
		// Explicit file path provided
		sourcePath = positionals[0]
	} else {
		// Auto-detect beads file
		sourcePath = beads.FindBeadsFile(root)
		if sourcePath == "" {
			fmt.Fprintln(os.Stderr, "no beads file found. Looked for .beads/issues.jsonl")
			return exitNotFound
		}
	}

	// Parse beads file
	issues, err := beads.ParseFile(sourcePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse beads file: %v\n", err)
		return exitIO
	}

	// Get current git user for owner
	owner, err := github.DetectOwner(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect owner: %v\n", err)
		return exitGitHub
	}

	// Import
	store := tick.NewStore(filepath.Join(root, ".tick"))
	result, err := beads.Import(issues, store, owner)
	if err != nil {
		fmt.Fprintf(os.Stderr, "import failed: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(result); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	fmt.Printf("Imported %d issues (%d skipped)\n", result.Imported, result.Skipped)
	return exitSuccess
}

func runApprove(args []string) int {
	fs := flag.NewFlagSet("approve", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk approve <id>")
		fmt.Fprintln(os.Stderr, "\nSet verdict=approved on a tick awaiting human decision.")
		fmt.Fprintln(os.Stderr, "Triggers state transition based on the awaiting type:")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  awaiting=work|approval|review|content  -> Closes the tick")
		fmt.Fprintln(os.Stderr, "  awaiting=input|escalation|checkpoint   -> Returns tick to agent queue")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nExamples:")
		fmt.Fprintln(os.Stderr, "  # Approve completed work (closes tick)")
		fmt.Fprintln(os.Stderr, "  tk approve abc123")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Approve with JSON output")
		fmt.Fprintln(os.Stderr, "  tk approve abc123 --json")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Workflow:")
		fmt.Fprintln(os.Stderr, "  1. tk list --awaiting        # See what needs attention")
		fmt.Fprintln(os.Stderr, "  2. tk show abc123            # Review the work")
		fmt.Fprintln(os.Stderr, "  3. tk approve abc123         # Approve it")
	}
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	// Verify tick is awaiting human decision
	if !t.IsAwaitingHuman() {
		fmt.Fprintf(os.Stderr, "tick %s is not awaiting human decision\n", t.ID)
		fmt.Fprintf(os.Stderr, "use `tk show %s` to check current status\n", t.ID)
		return exitUsage
	}

	// Handle legacy manual flag - treat as awaiting=work
	if t.Awaiting == nil && t.Manual {
		awaitingWork := tick.AwaitingWork
		t.Awaiting = &awaitingWork
	}

	// Set verdict and process
	verdict := tick.VerdictApproved
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to process verdict: %v\n", err)
		return exitGeneric
	}

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to save tick: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		payload := map[string]any{"tick": t, "closed": closed}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	if closed {
		fmt.Printf("approved %s (closed)\n", t.ID)
	} else {
		fmt.Printf("approved %s (returned to agent)\n", t.ID)
	}
	return exitSuccess
}

func runReject(args []string) int {
	fs := flag.NewFlagSet("reject", flag.ContinueOnError)
	jsonOutput := fs.Bool("json", false, "output as json")
	fs.SetOutput(os.Stderr)
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: tk reject <id> [feedback message]")
		fmt.Fprintln(os.Stderr, "\nSet verdict=rejected on a tick awaiting human decision.")
		fmt.Fprintln(os.Stderr, "Optional feedback message is added as a note (marked as human) for agent context.")
		fmt.Fprintln(os.Stderr, "Triggers state transition based on the awaiting type:")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  awaiting=approval|review|content|checkpoint  -> Returns tick to agent (with feedback)")
		fmt.Fprintln(os.Stderr, "  awaiting=input|escalation                    -> Closes tick (can't proceed)")
		fmt.Fprintln(os.Stderr, "\nFlags:")
		fs.PrintDefaults()
		fmt.Fprintln(os.Stderr, "\nExamples:")
		fmt.Fprintln(os.Stderr, "  # Reject without feedback")
		fmt.Fprintln(os.Stderr, "  tk reject abc123")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Reject with feedback for the agent")
		fmt.Fprintln(os.Stderr, "  tk reject abc123 \"Error messages too harsh, soften the tone\"")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  # Reject PR review with change request")
		fmt.Fprintln(os.Stderr, "  tk reject abc123 \"Add unit tests for the new API endpoints\"")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Workflow:")
		fmt.Fprintln(os.Stderr, "  1. tk list --awaiting        # See what needs attention")
		fmt.Fprintln(os.Stderr, "  2. tk show abc123            # Review the work")
		fmt.Fprintln(os.Stderr, "  3. tk reject abc123 \"...\"    # Reject with feedback")
		fmt.Fprintln(os.Stderr, "  4. Agent picks up task again with your feedback in notes")
	}
	positionals, err := parseInterleaved(fs, args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitSuccess
		}
		return exitUsage
	}

	if len(positionals) < 1 {
		fmt.Fprintln(os.Stderr, "id is required")
		return exitUsage
	}

	root, err := repoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect repo root: %v\n", err)
		return exitNoRepo
	}
	project, err := github.DetectProject(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect project: %v\n", err)
		return exitGitHub
	}
	id, err := github.NormalizeID(project, positionals[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid id: %v\n", err)
		return exitNotFound
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read tick: %v\n", err)
		return exitNotFound
	}

	// Verify tick is awaiting human decision
	if !t.IsAwaitingHuman() {
		fmt.Fprintf(os.Stderr, "tick %s is not awaiting human decision\n", t.ID)
		fmt.Fprintf(os.Stderr, "use `tk show %s` to check current status\n", t.ID)
		return exitUsage
	}

	// Handle legacy manual flag - treat as awaiting=work
	if t.Awaiting == nil && t.Manual {
		awaitingWork := tick.AwaitingWork
		t.Awaiting = &awaitingWork
	}

	// Add feedback note FIRST (before processing verdict) to prevent race condition
	// where ticker picks up task before feedback is saved
	feedback := strings.TrimSpace(strings.Join(positionals[1:], " "))
	if feedback != "" {
		timestamp := time.Now().Format("2006-01-02 15:04")
		line := fmt.Sprintf("%s - [human] %s", timestamp, feedback)
		if strings.TrimSpace(t.Notes) == "" {
			t.Notes = line
		} else {
			t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
		}
	}

	// Set verdict and process
	verdict := tick.VerdictRejected
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to process verdict: %v\n", err)
		return exitGeneric
	}

	if err := store.Write(t); err != nil {
		fmt.Fprintf(os.Stderr, "failed to save tick: %v\n", err)
		return exitIO
	}

	if *jsonOutput {
		payload := map[string]any{"tick": t, "closed": closed}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			fmt.Fprintf(os.Stderr, "failed to encode json: %v\n", err)
			return exitIO
		}
		return exitSuccess
	}

	if closed {
		fmt.Printf("rejected %s (closed)\n", t.ID)
	} else {
		fmt.Printf("rejected %s (returned to agent)\n", t.ID)
	}
	return exitSuccess
}

func splitCSV(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func appendUnique(values []string, value string) []string {
	for _, item := range values {
		if item == value {
			return values
		}
	}
	return append(values, value)
}

func removeString(values []string, value string) []string {
	out := values[:0]
	for _, item := range values {
		if item == value {
			continue
		}
		out = append(out, item)
	}
	return out
}

func splitLines(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return strings.Split(value, "\n")
}

func tickFromPath(path string) (tick.Tick, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return tick.Tick{}, err
	}
	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		return tick.Tick{}, err
	}
	return t, t.Validate()
}

func writeTickPath(path string, t tick.Tick) error {
	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func parseInterleaved(fs *flag.FlagSet, args []string) ([]string, error) {
	var flagArgs []string
	var positionals []string

	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--" {
			positionals = append(positionals, args[i+1:]...)
			break
		}
		if strings.HasPrefix(arg, "-") && arg != "-" {
			if strings.Contains(arg, "=") {
				flagArgs = append(flagArgs, arg)
				continue
			}
			name := strings.TrimLeft(arg, "-")
			if name == "h" || name == "help" {
				flagArgs = append(flagArgs, arg)
				continue
			}
			fl := fs.Lookup(name)
			if fl == nil {
				flagArgs = append(flagArgs, arg)
				continue
			}
			if getter, ok := fl.Value.(flag.Getter); ok {
				if _, isBool := getter.Get().(bool); isBool {
					if i+1 < len(args) && (args[i+1] == "true" || args[i+1] == "false") {
						flagArgs = append(flagArgs, arg, args[i+1])
						i++
						continue
					}
					flagArgs = append(flagArgs, arg)
					continue
				}
			}
			if i+1 < len(args) {
				flagArgs = append(flagArgs, arg, args[i+1])
				i++
				continue
			}
			flagArgs = append(flagArgs, arg)
			continue
		}
		positionals = append(positionals, arg)
	}

	if err := fs.Parse(flagArgs); err != nil {
		return nil, err
	}
	return positionals, nil
}

func formatStatusCounts(counts map[string]int) string {
	return fmt.Sprintf("open %d · in progress %d · closed %d",
		counts[tick.StatusOpen], counts[tick.StatusInProgress], counts[tick.StatusClosed])
}

func formatPriorityCounts(counts map[int]int) string {
	return fmt.Sprintf("P0:%d · P1:%d · P2:%d · P3:%d · P4:%d",
		counts[0], counts[1], counts[2], counts[3], counts[4])
}

func formatTypeCounts(counts map[string]int) string {
	return fmt.Sprintf("bug:%d · feature:%d · task:%d · epic:%d · chore:%d",
		counts[tick.TypeBug], counts[tick.TypeFeature], counts[tick.TypeTask], counts[tick.TypeEpic], counts[tick.TypeChore])
}

type optionalString struct {
	value string
	set   bool
}

func (o *optionalString) String() string {
	return o.value
}

func (o *optionalString) Set(value string) error {
	o.value = value
	o.set = true
	return nil
}

type optionalInt struct {
	value int
	set   bool
}

func (o *optionalInt) String() string {
	return fmt.Sprintf("%d", o.value)
}

func (o *optionalInt) Set(value string) error {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return err
	}
	o.value = parsed
	o.set = true
	return nil
}

type optionalBool struct {
	value bool
	set   bool
}

func (o *optionalBool) String() string {
	return fmt.Sprintf("%t", o.value)
}

func (o *optionalBool) Set(value string) error {
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return err
	}
	o.value = parsed
	o.set = true
	return nil
}

func (o *optionalBool) IsBoolFlag() bool {
	return true
}

func formatTime(value time.Time) string {
	return value.Local().Format("2006-01-02 15:04")
}

// resolveOwner returns the owner for filtering commands.
// If allOwners is true, returns empty string (no filtering).
// If ownerFlag is set, uses that value.
// Otherwise detects the current git user.
func resolveOwner(allOwners bool, ownerFlag string) (string, error) {
	if allOwners {
		return "", nil
	}
	owner := strings.TrimSpace(ownerFlag)
	if owner != "" {
		return owner, nil
	}
	return github.DetectOwner(nil)
}

func repoRoot() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--show-toplevel")
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(bytes.TrimSpace(out)), nil
}

func printUsage() {
	fmt.Printf("tk %s - multiplayer issue tracker for AI agents\n\n", Version)
	fmt.Println("Usage: tk <command> [--help]")
	fmt.Println("Commands: init, whoami, show, create, block, unblock, update, close, reopen, note, notes, list, ready, next, blocked, rebuild, delete, label, labels, deps, status, merge-file, stats, view, snippet, import, approve, reject, version, upgrade")
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
	fmt.Println("DEPRECATION NOTICE:")
	fmt.Println("  --manual is deprecated. Use --awaiting=work instead.")
	fmt.Println("  Tasks with manual=true are treated as awaiting=work for backwards compatibility.")
}
