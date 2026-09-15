package config

import (
	"strings"
	"testing"
)

// The `[sandbox]` table is the per-repo sandbox definition: the image a run
// boots, the extra toolchain provisioned into its persistent cache, and the
// idempotent commands that warm it. Its whole reason for living in this file
// rather than anywhere else is `setup`, which runs arbitrary shell inside a
// sandbox holding the run's credentials — so it comes from tracked,
// PR-reviewed config at the submitted SHA, and from nowhere else.

const sandboxConfig = `version = 2

[roles.implement]
kind = "claude"

[sandbox]
image = "registry.example.com/acme/ticks-orchestrator:0.31.0"
toolchain = ["rust@1.90.0", "python@3.13"]
setup = [
  { command = "pnpm install --frozen-lockfile", description = "warm the pnpm store" },
  { command = "go mod download" },
]
`

func TestSandboxTableParses(t *testing.T) {
	cfg, err := Parse([]byte(sandboxConfig))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if cfg.Sandbox == nil {
		t.Fatal("Sandbox is nil")
	}
	if got, want := cfg.SandboxImage(), "registry.example.com/acme/ticks-orchestrator:0.31.0"; got != want {
		t.Errorf("SandboxImage() = %q, want %q", got, want)
	}
	if got := cfg.SandboxToolchain(); len(got) != 2 || got[0] != "rust@1.90.0" || got[1] != "python@3.13" {
		t.Errorf("SandboxToolchain() = %v", got)
	}
	setup := cfg.SandboxSetup()
	if len(setup) != 2 {
		t.Fatalf("SandboxSetup() has %d commands, want 2", len(setup))
	}
	// Order is the contract: setup is an array, not a keyed table.
	if setup[0].Command != "pnpm install --frozen-lockfile" || setup[1].Command != "go mod download" {
		t.Errorf("setup order = %q, %q", setup[0].Command, setup[1].Command)
	}
	if setup[0].Description != "warm the pnpm store" {
		t.Errorf("description = %q", setup[0].Description)
	}
}

// The 99% path: no [sandbox] at all. Everything stays nil-safe and the
// accessors report "nothing declared" rather than a substituted value.
func TestNoSandboxTableIsTheDefault(t *testing.T) {
	cfg, err := Parse([]byte(routingOnly))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if cfg.Sandbox != nil {
		t.Errorf("Sandbox = %+v, want nil", cfg.Sandbox)
	}
	for _, c := range []*Config{cfg, nil} {
		if got := c.SandboxImage(); got != "" {
			t.Errorf("SandboxImage() = %q, want \"\" (the version-pinned base image)", got)
		}
		if got := c.SandboxToolchain(); len(got) != 0 {
			t.Errorf("SandboxToolchain() = %v, want empty", got)
		}
		if got := c.SandboxSetup(); len(got) != 0 {
			t.Errorf("SandboxSetup() = %v, want empty", got)
		}
	}
}

// [sandbox] shipped in the same release as the command surface, so it is
// expressible in version 2 and does not bump a file past it. A routing-only
// file that grows a [sandbox] table becomes a version 2 file.
func TestSandboxRequiresTheCommandSurfaceVersion(t *testing.T) {
	cfg, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n[sandbox]\ntoolchain = [\"rust@1.90.0\"]\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := cfg.RequiredVersion(); got != CommandSurfaceVersion {
		t.Errorf("RequiredVersion() = %d for a config with [sandbox], want %d", got, CommandSurfaceVersion)
	}
}

// 728's rule, restated for this table: an unknown key is an error. gek's rule
// is why it matters — a key that can evade the check defeats fail-closed
// validation entirely.
func TestSandboxUnknownKeyFailsClosed(t *testing.T) {
	for _, body := range []string{
		"[sandbox]\nimages = \"x\"\n",
		"[sandbox]\ntoolchains = [\"rust@1.90.0\"]\n",
		"[sandbox]\nsetup = [ { command = \"true\", shell = \"zsh\" } ]\n",
		"[sandbox.extra]\nanything = true\n",
	} {
		t.Run(strings.SplitN(body, "\n", 3)[1], func(t *testing.T) {
			_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n" + body))
			if err == nil {
				t.Fatal("an unknown key under [sandbox] was accepted")
			}
			if !strings.Contains(err.Error(), "unknown key") {
				t.Errorf("error does not name the unknown key: %v", err)
			}
		})
	}
}

func TestSandboxRejectsAMalformedImage(t *testing.T) {
	for name, image := range map[string]string{
		"empty":        "",
		"space":        "my image:1",
		"shell":        "$(echo pwned)",
		"leading-dash": "-image:1",
	} {
		t.Run(name, func(t *testing.T) {
			_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n[sandbox]\nimage = \"" + image + "\"\n"))
			if err == nil {
				t.Fatalf("image = %q was accepted", image)
			}
			if !strings.Contains(err.Error(), "sandbox.image") {
				t.Errorf("error does not name the field: %v", err)
			}
		})
	}
}

// An unpinned tool makes the warm sandbox and the cold one different
// environments, and two versions of one tool is ambiguous. Both are stops.
func TestSandboxRejectsMalformedToolchainSpecs(t *testing.T) {
	cases := map[string]string{
		"unpinned":  `toolchain = ["rust"]`,
		"empty":     `toolchain = [""]`,
		"no-tool":   `toolchain = ["@1.90.0"]`,
		"duplicate": `toolchain = ["rust@1.90.0", "rust@1.91.0"]`,
	}
	for name, line := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n[sandbox]\n" + line + "\n"))
			if err == nil {
				t.Fatalf("%s was accepted", line)
			}
			if !strings.Contains(err.Error(), "sandbox.toolchain") {
				t.Errorf("error does not name the field: %v", err)
			}
		})
	}
}

// The command surface's own hardening applies here unchanged: a setup entry is
// one plain shell string, bounded, with no control characters to smuggle a
// second command through.
func TestSandboxSetupCommandsAreHardenedLikeEveryOtherCommand(t *testing.T) {
	cases := map[string]string{
		"missing":           `setup = [ { description = "nothing to run" } ]`,
		"empty":             `setup = [ { command = "" } ]`,
		"control-character": "setup = [ { command = \"true\\nrm -rf /\" } ]",
		"long":              `setup = [ { command = "` + strings.Repeat("x", maxCommandLen+1) + `" } ]`,
	}
	for name, line := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n[sandbox]\n" + line + "\n"))
			if err == nil {
				t.Fatalf("%s was accepted", line)
			}
			if !strings.Contains(err.Error(), "sandbox.setup") {
				t.Errorf("error does not name the field: %v", err)
			}
		})
	}
}

// The whole-file rule the command surface already enforces: one command
// belongs to exactly one phase. A string that is both a warm step and an
// acceptance-authorising command makes "which phase authorised this" a guess.
func TestASetupCommandCannotAlsoBeAPhaseCommand(t *testing.T) {
	_, err := Parse([]byte(`version = 2

[roles.implement]
kind = "claude"

[testing.commands]
install = { command = "pnpm install --frozen-lockfile" }

[sandbox]
setup = [ { command = "pnpm install --frozen-lockfile" } ]
`))
	if err == nil {
		t.Fatal("the same command was accepted in two phases")
	}
	if !strings.Contains(err.Error(), "sandbox.setup") || !strings.Contains(err.Error(), "testing") {
		t.Errorf("the collision does not name both phases: %v", err)
	}
}

func TestSandboxTableSizeIsBounded(t *testing.T) {
	var setup, tools strings.Builder
	for i := 0; i <= maxSandboxEntries; i++ {
		setup.WriteString("{ command = \"true " + strings.Repeat("x", i+1) + "\" },\n")
		tools.WriteString("\"tool" + strings.Repeat("x", i+1) + "@1.0\",\n")
	}
	for field, body := range map[string]string{
		"sandbox.setup":     "setup = [\n" + setup.String() + "]\n",
		"sandbox.toolchain": "toolchain = [\n" + tools.String() + "]\n",
	} {
		t.Run(field, func(t *testing.T) {
			_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\n\n[sandbox]\n" + body))
			if err == nil || !strings.Contains(err.Error(), field) {
				t.Errorf("an oversized %s was accepted: %v", field, err)
			}
		})
	}
}
