package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

var (
	cloudPRBodyHead    string
	cloudPRBodyBase    string
	cloudPRBodyRunBase string
	cloudPRBodyEpic    string
)

// cloudPRBodyListCap bounds each commit list. A capped list says how many it
// dropped: a body that silently stopped at 50 reads as a run with 50 commits.
const cloudPRBodyListCap = 50

var cloudPRBodyCmd = &cobra.Command{
	Use:   "pr-body",
	Short: "Print the closeout PR body for a run branch, naming the commits it carries",
	Long: `Print the body for the pull request that merges a run branch.

A cloud run is submitted from whatever branch the operator was standing on,
and its run branch descends from that SHA. When the submitted branch was
already ahead of the default branch, merging the run's PR lands those commits
too — a second epic reaching the default branch on this PR's CI gate, without
its own PR being approved. That happened once and nothing said so.

So the body enumerates it. Commits in the diff that the run did not create
(everything on the submitted SHA that the merge target does not already have)
are listed first, under a heading that says what merging them does; the run's
own commits follow. A PR that carries nothing says that positively, because
silence is indistinguishable from not having looked.

This reads git and prints markdown. It opens nothing, merges nothing and
contacts no factory — it neither commands a run nor reads one, so D21's
run/stop/status/answer vocabulary is exactly as wide as it was:

  tk cloud pr-body | gh pr create --base main --head "$TICKS_RUN_BRANCH" \
      --title "epic <id>: cloud run" --body-file -

Inside a run sandbox the defaults come from the environment the container
exported (TICKS_RUN_BRANCH, TICKS_BASE_SHA, TICKS_EPIC), so closeout can
invoke it bare. Anywhere else, --head and --run-base name them.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runCloudPRBody,
}

func init() {
	cloudPRBodyCmd.Flags().StringVar(&cloudPRBodyHead, "head", "",
		"branch the PR is opened from (default $TICKS_RUN_BRANCH, else the current branch)")
	cloudPRBodyCmd.Flags().StringVar(&cloudPRBodyBase, "base", "",
		"branch the PR merges into (default origin's default branch)")
	cloudPRBodyCmd.Flags().StringVar(&cloudPRBodyRunBase, "run-base", "",
		"the SHA the run was submitted from (default $TICKS_BASE_SHA)")
	cloudPRBodyCmd.Flags().StringVar(&cloudPRBodyEpic, "epic", "",
		"epic the run is for, for the heading (default $TICKS_EPIC, else the run branch's name)")

	cloudCmd.AddCommand(cloudPRBodyCmd)
}

// cloudPRBodyCommit is one line of either list.
type cloudPRBodyCommit struct {
	SHA     string
	Subject string
}

// cloudPRBodyInput is everything the body says, resolved from git before any
// of it is rendered — so rendering is pure and testable, and so a git failure
// can never be reported as an empty list.
type cloudPRBodyInput struct {
	Epic    string
	RunID   string
	Head    string
	Base    string
	RunBase string
	Created []cloudPRBodyCommit
	Carried []cloudPRBodyCommit
	Shallow bool
}

func runCloudPRBody(cmd *cobra.Command, _ []string) error {
	root, err := repoRoot()
	if err != nil {
		return err
	}
	ctx := cmd.Context()

	head := firstNonEmpty(cloudPRBodyHead, os.Getenv(cloudEnvRunBranch))
	if head == "" {
		branch, err := getCurrentBranch(root)
		if err != nil || strings.TrimSpace(branch) == "" || branch == "HEAD" {
			return NewExitError(ExitUsage,
				"cannot tell which branch this PR is opened from: pass --head <branch> (a run sandbox exports it as %s)",
				cloudEnvRunBranch)
		}
		head = strings.TrimSpace(branch)
	}

	runBase := firstNonEmpty(cloudPRBodyRunBase, os.Getenv(cloudEnvBaseSHA))
	if runBase == "" {
		// Without it, "what this run created" is a guess — and a guessed
		// cargo list is worse than none, because it reads as a checked one.
		return NewExitError(ExitUsage,
			"cannot tell which commits this run created: pass --run-base <sha>, the commit the run was submitted from (a run sandbox exports it as %s)",
			cloudEnvBaseSHA)
	}

	base := cloudPRBodyBase
	if base == "" {
		base, err = cloudPRBodyDefaultBase(ctx, root)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
	}

	for _, ref := range []struct{ name, value string }{
		{"merge target", base}, {"run branch", head}, {"run base", runBase},
	} {
		if err := cloudPRBodyResolve(ctx, root, ref.value); err != nil {
			// A checkout that cannot see the merge target cannot see the
			// cargo either. Say so instead of reporting an empty list: a
			// shallow sandbox clone has exactly one ref and would otherwise
			// certify every PR as clean.
			return NewExitError(ExitGeneric,
				"cannot resolve the %s %q in this checkout: fetch it first (git fetch origin %s)",
				ref.name, ref.value, strings.TrimPrefix(ref.value, "origin/"))
		}
	}

	if _, err := cloudGit(ctx, root, "merge-base", "--is-ancestor", runBase, head); err != nil {
		return NewExitError(ExitGeneric,
			"%s does not descend from the run base %s, so this PR's commits are not this run's: check --head and --run-base",
			head, cloudPRBodyShort(runBase))
	}

	created, err := cloudPRBodyLog(ctx, root, runBase+".."+head)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	carried, err := cloudPRBodyLog(ctx, root, base+".."+runBase)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	fmt.Fprint(cmd.OutOrStdout(), renderCloudPRBody(cloudPRBodyInput{
		Epic:    firstNonEmpty(cloudPRBodyEpic, os.Getenv(cloudEnvEpic), cloudPRBodyEpicFromBranch(head)),
		RunID:   os.Getenv(cloudEnvRunID),
		Head:    head,
		Base:    base,
		RunBase: runBase,
		Created: created,
		Carried: carried,
		Shallow: cloudPRBodyShallow(ctx, root),
	}))
	return nil
}

func renderCloudPRBody(in cloudPRBodyInput) string {
	var b strings.Builder

	heading := "Cloud run closeout"
	if in.Epic != "" {
		heading = fmt.Sprintf("Epic %s — cloud run closeout", in.Epic)
	}
	fmt.Fprintf(&b, "## %s\n\n", heading)

	fmt.Fprintf(&b, "Run branch `%s` → `%s`, submitted from `%s`.",
		in.Head, in.Base, cloudPRBodyShort(in.RunBase))
	if in.RunID != "" {
		fmt.Fprintf(&b, " Run `%s`.", in.RunID)
	}
	b.WriteString("\n\n")

	if in.Shallow {
		b.WriteString("> This checkout is a shallow clone, so the lists below are only as\n" +
			"> complete as the history it holds. `git fetch --unshallow` to be sure.\n\n")
	}

	if len(in.Carried) == 0 {
		fmt.Fprintf(&b, "### Carried commits: none\n\nEvery commit in this PR was created by this run: `%s` has everything the run was submitted on top of.\n\n", in.Base)
	} else {
		fmt.Fprintf(&b, "### Carried commits: %d\n\n", len(in.Carried))
		fmt.Fprintf(&b,
			"This run did not create the commits below. They were already on the branch it\n"+
				"was submitted from, so merging this PR lands them on `%s` as well — passing\n"+
				"this PR's CI gate rather than their own, and without whatever PR owns them\n"+
				"being approved. Confirm every one of them is meant to land here; if any is\n"+
				"not, rebase `%s` onto `%s` before merging.\n\n", in.Base, in.Head, in.Base)
		cloudPRBodyList(&b, in.Carried)
		b.WriteString("\n")
	}

	fmt.Fprintf(&b, "### Commits this run created: %d\n\n", len(in.Created))
	if len(in.Created) == 0 {
		fmt.Fprintf(&b, "None — `%s` is still at the SHA the run was submitted from.\n", in.Head)
		return b.String()
	}
	cloudPRBodyList(&b, in.Created)
	return b.String()
}

// cloudPRBodyList writes a capped bullet list, and says what it dropped: a
// truncation nobody is told about reads as a complete list.
func cloudPRBodyList(b *strings.Builder, commits []cloudPRBodyCommit) {
	shown := commits
	if len(shown) > cloudPRBodyListCap {
		shown = shown[:cloudPRBodyListCap]
	}
	for _, commit := range shown {
		fmt.Fprintf(b, "- `%s` %s\n", commit.SHA, commit.Subject)
	}
	if len(shown) < len(commits) {
		fmt.Fprintf(b, "- …and %d more (listing %d of %d)\n",
			len(commits)-len(shown), len(shown), len(commits))
	}
}

// cloudPRBodyLog reads one revision range, newest first.
func cloudPRBodyLog(ctx context.Context, root, revRange string) ([]cloudPRBodyCommit, error) {
	output, err := cloudGit(ctx, root, "log", "--format=%h%x00%s", revRange)
	if err != nil {
		return nil, err
	}
	var commits []cloudPRBodyCommit
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimRight(line, "\r")
		if strings.TrimSpace(line) == "" {
			continue
		}
		sha, subject, found := strings.Cut(line, "\x00")
		if !found {
			continue
		}
		commits = append(commits, cloudPRBodyCommit{SHA: sha, Subject: subject})
	}
	return commits, nil
}

// cloudPRBodyDefaultBase is the branch the PR merges into. The remote-tracking
// ref is preferred over the local branch: the merge happens on origin, and a
// stale local `main` would report commits as cargo that origin already has.
func cloudPRBodyDefaultBase(ctx context.Context, root string) (string, error) {
	name, err := getMainBranch(root)
	if err != nil {
		return "", fmt.Errorf("cannot tell which branch this PR merges into: pass --base <branch>")
	}
	if cloudPRBodyResolve(ctx, root, "origin/"+name) == nil {
		return "origin/" + name, nil
	}
	return name, nil
}

func cloudPRBodyResolve(ctx context.Context, root, ref string) error {
	_, err := cloudGit(ctx, root, "rev-parse", "--verify", "--quiet", ref+"^{commit}")
	return err
}

func cloudPRBodyShallow(ctx context.Context, root string) bool {
	output, err := cloudGit(ctx, root, "rev-parse", "--is-shallow-repository")
	return err == nil && strings.TrimSpace(output) == "true"
}

// cloudPRBodyEpicFromBranch reads the epic out of a run branch name — the
// entrypoint derives `tick-run/<epic>` (or `tick-run/<epic>-<run id>` when a
// branch from another base already holds the name), so the heading has an epic
// even outside a sandbox.
func cloudPRBodyEpicFromBranch(branch string) string {
	if !strings.HasPrefix(branch, cloudRunBranchPrefix) {
		return ""
	}
	return strings.TrimPrefix(branch, cloudRunBranchPrefix)
}

func cloudPRBodyShort(sha string) string {
	if len(sha) > 12 {
		return sha[:12]
	}
	return sha
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
