package factory

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// The digest is read out of the container application block wrangler prints,
// not out of the Docker build log above it. The build log is full of `sha256:`
// digests — the base image, every layer — and picking one of those would make
// the wait compare against a digest the application can never report.
func TestParsePushedImageIgnoresBuildLogDigests(t *testing.T) {
	out := strings.Join([]string{
		"#4 [internal] load metadata for docker.io/cloudflare/sandbox:0.12.7-python",
		"#4 resolve docker.io/cloudflare/sandbox@sha256:" + strings.Repeat("6", 64),
		"#12 extracting sha256:" + strings.Repeat("a", 64),
		"Image does not exist remotely, pushing: registry.cloudflare.com/acct/ticks-orchestrator:1.2.3",
		"╭ Deploy a container application",
		"│ Container application changes",
		"├ NEW ticks-orchestrator",
		`│   image = "registry.cloudflare.com/acct/ticks-orchestrator@sha256:` + strings.Repeat("b", 64) + `"`,
		"╰ Applied changes",
	}, "\n")

	ref, digest := parsePushedImage(out)
	want := "sha256:" + strings.Repeat("b", 64)
	if digest != want {
		t.Errorf("digest = %q, want %q", digest, want)
	}
	if !strings.Contains(ref, ContainerAppName) {
		t.Errorf("ref = %q, want the orchestrator image reference", ref)
	}
}

// An existing application is printed as a diff: the previous image on the `-`
// side, the new one on the `+` side below it. The new one is the one to wait
// for.
func TestParsePushedImageTakesTheNewSideOfADiff(t *testing.T) {
	old := "sha256:" + strings.Repeat("1", 64)
	fresh := "sha256:" + strings.Repeat("2", 64)
	out := strings.Join([]string{
		"├ EDIT ticks-orchestrator",
		`- image = "registry.cloudflare.com/acct/ticks-orchestrator@` + old + `"`,
		`+ image = "registry.cloudflare.com/acct/ticks-orchestrator@` + fresh + `"`,
		"╰ Applied changes",
	}, "\n")

	_, digest := parsePushedImage(out)
	if digest != fresh {
		t.Errorf("digest = %q, want the new side %q", digest, fresh)
	}
}

// A deploy that changed nothing still names the image the application is on,
// so the wait has something to confirm rather than nothing to compare.
func TestParsePushedImageOnAnUnchangedDeploy(t *testing.T) {
	same := "sha256:" + strings.Repeat("c", 64)
	out := strings.Join([]string{
		"Image already exists remotely, skipping push",
		"├ no changes ticks-orchestrator",
		`│   image = "registry.cloudflare.com/acct/ticks-orchestrator@` + same + `"`,
		"╰ No changes to be made",
	}, "\n")

	_, digest := parsePushedImage(out)
	if digest != same {
		t.Errorf("digest = %q, want %q", digest, same)
	}
}

func TestDeployOutputIdentifiesSkippedImagePush(t *testing.T) {
	out := strings.Join([]string{
		"Image already exists remotely, skipping push",
		"Total Upload: 12.34 KiB / gzip: 3.21 KiB",
		"Deployed ticks-factory triggers",
	}, "\n")

	if !deploySkippedImagePush(out) {
		t.Fatal("deploySkippedImagePush = false, want true")
	}
}

func TestConfirmContainerRolloutUsesApplicationDigestAfterSkippedPush(t *testing.T) {
	digest := "sha256:" + strings.Repeat("f", 64)
	stateDir := t.TempDir()
	logPath := filepath.Join(stateDir, "wrangler.log")
	if err := os.WriteFile(filepath.Join(stateDir, "container-target"), []byte(digest), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", logPath)

	w := &wrangler{
		bin: filepath.Join(testdataDir, "fake-wrangler.sh"),
		dir: t.TempDir(),
		out: io.Discard,
	}
	outcome, err := confirmContainerRollout(
		context.Background(), w, io.Discard,
		"Image already exists remotely, skipping push\n",
		time.Second, time.Millisecond, false,
	)
	if err != nil {
		t.Fatalf("confirmContainerRollout: %v", err)
	}
	if !outcome.Confirmed || outcome.Digest != digest {
		t.Errorf("outcome = %+v, want confirmed digest %q", outcome, digest)
	}
	if !strings.Contains(outcome.Ref, ContainerAppName) {
		t.Errorf("outcome.Ref = %q, want the application image reference", outcome.Ref)
	}
}

func TestParsePushedImageWithNoContainerBlock(t *testing.T) {
	out := "Total Upload: 12.34 KiB\nDeployed ticks-factory triggers\n  https://ticks-factory.example.workers.dev\n"
	if ref, digest := parsePushedImage(out); ref != "" || digest != "" {
		t.Errorf("parsePushedImage = (%q, %q), want empty on output with no container block", ref, digest)
	}
}

func TestContainerAppDigestAndSettled(t *testing.T) {
	digest := "sha256:" + strings.Repeat("d", 64)
	app := containerApp{
		Name:  ContainerAppName,
		State: "ready",
		Image: "registry.cloudflare.com/acct/ticks-orchestrator@" + digest,
	}
	if got := app.digest(); got != digest {
		t.Errorf("digest() = %q, want %q", got, digest)
	}
	if !app.settled() {
		t.Error("a `ready` application is settled: an idle factory runs no instances")
	}

	// A container exists only while a run does, so "no live instances" is the
	// resting state, not an unfinished rollout.
	app.State = "active"
	if !app.settled() {
		t.Error("an `active` application is settled")
	}
	app.State = "provisioning"
	if app.settled() {
		t.Error("a `provisioning` application is mid-rollout, not settled")
	}
	app.State = "degraded"
	if app.settled() {
		t.Error("a `degraded` application must not be treated as a finished rollout")
	}
}

func TestContainerAppServesExpectedDigestWhileProvisioning(t *testing.T) {
	digest := "sha256:" + strings.Repeat("e", 64)
	app := containerApp{
		Name:  ContainerAppName,
		State: "provisioning",
		Image: "registry.cloudflare.com/acct/ticks-orchestrator@" + digest,
	}

	if !app.serves(digest) {
		t.Error("a provisioning application with the expected digest should count as serving the new image")
	}
	app.State = "degraded"
	if app.serves(digest) {
		t.Error("a degraded application must not count as serving the expected image")
	}
}

func TestDefaultRolloutTimeoutIncludesObservedTail(t *testing.T) {
	const observedRollout = 5*time.Minute + 30*time.Second
	if defaultRolloutTimeout <= observedRollout {
		t.Errorf("defaultRolloutTimeout = %s, want more than the observed %s rollout", defaultRolloutTimeout, observedRollout)
	}
}

func TestContainerAppWithoutADigestPinnedImage(t *testing.T) {
	app := containerApp{Name: ContainerAppName, Image: "registry.cloudflare.com/acct/ticks-orchestrator:1.2.3"}
	if got := app.digest(); got != "" {
		t.Errorf("digest() = %q, want empty for a tag-only reference", got)
	}
}

func TestFindContainerApp(t *testing.T) {
	apps := []containerApp{
		{Name: "someone-elses-app"},
		{Name: ContainerAppName, ID: "app-1"},
	}
	app, ok := findContainerApp(apps, ContainerAppName)
	if !ok || app.ID != "app-1" {
		t.Errorf("findContainerApp = (%+v, %v), want the orchestrator application", app, ok)
	}
	if _, ok := findContainerApp(apps[:1], ContainerAppName); ok {
		t.Error("findContainerApp found an application the listing does not have")
	}
}

// The message has one job: stop the operator from reading an unconfirmed
// rollout as a broken fix. It has to say the deploy itself landed, name both
// digests, and give the way out.
func TestRolloutErrorMessage(t *testing.T) {
	err := &RolloutError{
		Expected: "registry.cloudflare.com/acct/ticks-orchestrator@sha256:" + strings.Repeat("b", 64),
		Serving:  "sha256:" + strings.Repeat("1", 64),
		Reason:   "the container application is still serving a different image",
	}
	msg := err.Error()
	for _, want := range []string{
		"could not be confirmed",
		"image this deploy pushed",
		"image the application reports",
		"Nothing is lost",
		"--skip-rollout-wait",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("RolloutError message is missing %q:\n%s", want, msg)
		}
	}
}

func TestShortDigest(t *testing.T) {
	if got := shortDigest("sha256:" + strings.Repeat("a", 64)); got != "sha256:aaaaaaaaaaaa" {
		t.Errorf("shortDigest = %q", got)
	}
	if got := shortDigest("sha256:abc"); got != "sha256:abc" {
		t.Errorf("shortDigest truncated a short digest: %q", got)
	}
}
