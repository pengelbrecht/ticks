package sandbox

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// The `[sandbox].image` declaration now has two readers.
//
// This package's is authoritative — it is `tk`, running in the checkout, and
// the entrypoint refuses a boot on its verdict. The factory Worker has a
// second one (cloud/factory/src/repo-config.ts), because the control plane has
// to know which image to boot BEFORE a container exists to read anything.
//
// Two readers of one format is exactly the shape of the bug this repository
// has already paid for once: a fix landed in TypeScript only, the Go half kept
// minting unusable records, and both suites were green because each was
// internally consistent. So the two read the same cases from one file, and a
// divergence fails here rather than in a container.
//
// The known and accepted divergence is the Worker's refusal of array-of-tables
// syntax (`[[sandbox.setup]]`), which this reader accepts. That direction is
// safe by construction: the Worker treats anything it cannot read as "not
// read", boots the deployment's own image, and the entrypoint then refuses the
// boot with THIS reader's verdict. It is documented in repo-config.ts and
// asserted in cloud/factory/test/repo-config.test.ts, which is why no case
// below relies on it.

const parityCases = "../../cloud/factory/test/fixtures/sandbox-image-cases.json"

type imageParityCase struct {
	Name    string `json:"name"`
	Why     string `json:"why"`
	TOML    string `json:"toml"`
	Image   string `json:"image"`
	Refused bool   `json:"refused"`
}

func TestDeclaredImageParityWithTheFactoryReader(t *testing.T) {
	body, err := os.ReadFile(parityCases)
	if err != nil {
		t.Fatalf("the shared cases are what both readers are pinned to: %v", err)
	}
	var file struct {
		Cases []imageParityCase `json:"cases"`
	}
	if err := json.Unmarshal(body, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Cases) == 0 {
		t.Fatal("no cases: a parity guard with nothing in it guards nothing")
	}

	const base = "ticks-orchestrator:0.31.0"
	for _, tc := range file.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			root := t.TempDir()
			if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(tc.TOML), 0o644); err != nil {
				t.Fatal(err)
			}

			image, declared, err := Image(root, base)
			if tc.Refused {
				if err == nil {
					t.Fatalf("read %q from a declaration that must be refused (%s)", image, tc.Why)
				}
				return
			}
			if err != nil {
				t.Fatalf("%s: %v", tc.Why, err)
			}
			want, wantDeclared := tc.Image, tc.Image != ""
			if !wantDeclared {
				want = base
			}
			if image != want || declared != wantDeclared {
				t.Errorf("Image() = (%q, %v), want (%q, %v) — %s", image, declared, want, wantDeclared, tc.Why)
			}
		})
	}
}
