package factory

import (
	"fmt"
	"regexp"
	"runtime/debug"
	"strings"
)

// The image builds its own tk from source, so a deploy has to answer one
// question first: which source? The answer is "the source this binary was
// built from", because that is the only ref that makes the container's tk and
// the bundle it boots the same code.
//
// A released build answers with its tag. A development build answers with the
// commit Go stamped into it — which is what removes the release lag that made
// the sandbox image's tk pin a chicken-and-egg: the image needs a pushed
// commit, not a published release.

// commitPattern is a full git object name. A short ref is deliberately not
// accepted: the image resolves this through the Go module proxy, and an
// abbreviated commit is not a module version.
var commitPattern = regexp.MustCompile(`^[0-9a-f]{40}$`)

// SourceRef reports the ref the orchestrator image should build tk from, given
// the version this binary reports.
func SourceRef(version string) (string, error) {
	revision, modified := buildRevision()
	return sourceRefFrom(version, revision, modified)
}

func sourceRefFrom(version, revision string, modified bool) (string, error) {
	if v := strings.TrimSpace(version); v != "" && v != "dev" {
		return "v" + strings.TrimPrefix(v, "v"), nil
	}
	if modified {
		return "", fmt.Errorf(
			"this tk was built from a worktree with uncommitted changes, so no ref names the\n" +
				"code it contains. The orchestrator image builds its tk from source, and it can\n" +
				"only build a commit that exists: commit your work, rebuild tk, push the commit,\n" +
				"then run `tk factory deploy` again.")
	}
	if commitPattern.MatchString(revision) {
		return revision, nil
	}
	return "", fmt.Errorf(
		"this is a development build with no recorded commit, so the orchestrator image has\n" +
			"no source to build its own tk from. Deploy from a released tk, or build this one\n" +
			"inside its git checkout (`go build ./cmd/tk`) so the commit is stamped — and push\n" +
			"that commit, because the image resolves it through the Go module proxy.")
}

// buildRevision reads the VCS stamp Go records in a binary built from a
// checkout. Both values are empty/false for a binary built without one.
func buildRevision() (revision string, modified bool) {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return "", false
	}
	for _, s := range info.Settings {
		switch s.Key {
		case "vcs.revision":
			revision = s.Value
		case "vcs.modified":
			modified = s.Value == "true"
		}
	}
	return revision, modified
}
