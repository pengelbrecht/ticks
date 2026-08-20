package factory

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
)

// The operator-side tools `tk factory deploy` shells out to besides wrangler:
// a container engine, because the factory's orchestrator sandbox is a container
// image that has to be built and pushed into the operator's own registry before
// the Worker that boots it is uploaded (D16), and a package manager, because
// the deployed Worker has a runtime dependency (the Cloudflare Sandbox SDK) and
// the staged bundle is where it has to be installed.
//
// Both are preconditions, not steps. A deploy that skips them produces the
// exact failure this epic keeps catching: a Worker that answers every
// submission with a correct message naming a remedy that cannot supply what is
// missing.

// dockerEnvVar is wrangler's own override for the container engine binary.
// Reading the same variable means an operator who has already pointed wrangler
// at podman or nerdctl does not have to tell tk separately.
const dockerEnvVar = "WRANGLER_DOCKER_BIN"

// dockerBinary is the container engine tk probes, and the one wrangler will
// use for the image build during `wrangler deploy`.
func dockerBinary() string {
	if bin := strings.TrimSpace(os.Getenv(dockerEnvVar)); bin != "" {
		return bin
	}
	return "docker"
}

// requireDocker proves a container engine is installed AND that its daemon
// answers, because those are different failures with different remedies and
// collapsing them is how a diagnosis goes to the wrong place.
//
// It returns the server version, which is what proves the daemon answered
// rather than the client merely existing — the same "validate WHAT answered"
// rule the wrangler version probe follows.
func requireDocker(ctx context.Context) (string, error) {
	bin := dockerBinary()
	resolved, err := exec.LookPath(bin)
	if err != nil {
		return "", &PrerequisiteError{
			Missing: "Docker",
			Detail: "`tk factory deploy` builds the orchestrator sandbox image (cloud/sandbox) and\n" +
				"pushes it to your own Cloudflare registry before it uploads the Worker.\n" +
				"Install Docker Desktop, OrbStack, or another Docker-compatible engine — or set\n" +
				dockerEnvVar + " to one — then run `tk factory deploy` again.",
			Err: err,
		}
	}

	cmd := exec.CommandContext(ctx, resolved, "version", "--format", "{{.Server.Version}}")
	out, err := cmd.CombinedOutput()
	version := strings.TrimSpace(lastNonEmptyLine(string(out)))
	if err != nil || version == "" {
		return "", &PrerequisiteError{
			Missing: "a running Docker daemon",
			Detail: "`" + bin + "` is installed but its daemon did not answer, so the orchestrator\n" +
				"sandbox image cannot be built. Start it (Docker Desktop, OrbStack, `colima start`,\n" +
				"…) and run `tk factory deploy` again. Deploying without the image would leave a\n" +
				"factory that refuses every run.\n" +
				strings.TrimSpace(string(out)),
			Err: err,
		}
	}
	return version, nil
}

// packageManagerCandidates are the ways to invoke pnpm. It is pnpm and not npm
// because the bundle ships pnpm's lockfile, and an install that does not read a
// lockfile would resolve the Worker's dependency tree afresh on every deploy —
// which is exactly the version pin the embedded bundle exists to provide.
//
// A list of one, kept as a list because this is where a second rung would go.
var packageManagerCandidates = []wranglerCandidate{
	{bin: "pnpm", label: "pnpm"},
}

// packageManager runs pnpm in the staged bundle.
type packageManager struct {
	bin    string
	prefix []string
	label  string
	out    io.Writer
}

// findPackageManager resolves pnpm by running it, for the same reason
// findWrangler runs its candidates: the only proof that a tool works is a tool
// that answered.
func findPackageManager(ctx context.Context, out io.Writer) (*packageManager, string, error) {
	var lastErr error
	for _, candidate := range packageManagerCandidates {
		bin, err := exec.LookPath(candidate.bin)
		if err != nil {
			lastErr = err
			continue
		}
		pm := &packageManager{bin: bin, prefix: candidate.prefix, label: candidate.label, out: out}
		version, err := pm.probeVersion(ctx)
		if err != nil {
			lastErr = err
			continue
		}
		return pm, version, nil
	}
	return nil, "", &PrerequisiteError{
		Missing: "pnpm",
		Detail: "The factory Worker has a runtime dependency (the Cloudflare Sandbox SDK), so the\n" +
			"staged bundle has to be installed before it can be deployed. Install pnpm with\n" +
			"`corepack enable pnpm` (bundled with Node) or `npm install -g pnpm`, then run\n" +
			"`tk factory deploy` again.",
		Err: lastErr,
	}
}

func (p *packageManager) run(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, p.bin, append(append([]string(nil), p.prefix...), args...)...)
	cmd.Dir = dir
	cmd.Stdin = strings.NewReader("")
	var buf strings.Builder
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	if err != nil {
		return buf.String(), &commandError{args: args, output: buf.String(), err: err}
	}
	return buf.String(), nil
}

func (p *packageManager) probeVersion(ctx context.Context) (string, error) {
	out, err := p.run(ctx, "", "--version")
	if err != nil {
		return "", err
	}
	version := strings.TrimSpace(lastNonEmptyLine(out))
	if !semverPattern.MatchString(version) {
		return "", fmt.Errorf("version probe did not identify pnpm (got %q)", version)
	}
	return version, nil
}

// installDependencies installs the bundle's runtime dependencies.
//
// --prod because the bundle's devDependencies are the test harness and
// wrangler itself, neither of which the deployed Worker contains, and
// --frozen-lockfile because the embedded lockfile is what makes the deployed
// dependency tree this tk build's rather than whatever npm published today.
func (p *packageManager) installDependencies(ctx context.Context, dir string) error {
	out, err := p.run(ctx, dir, "install", "--prod", "--frozen-lockfile")
	if err != nil {
		return fmt.Errorf(
			"installing the bundle's runtime dependencies with %s failed.\n"+
				"The Worker cannot be bundled without them — it imports the Cloudflare Sandbox\n"+
				"SDK to run an orchestrator container.\n%w", p.label, err)
	}
	p.echo(out)
	return nil
}

func (p *packageManager) echo(out string) {
	if p.out == nil {
		return
	}
	trimmed := strings.TrimRight(out, "\n")
	if trimmed == "" {
		return
	}
	fmt.Fprintln(p.out, indent(trimmed, "  "))
}
