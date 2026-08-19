package factory

import (
	"os/exec"
	"strings"
	"testing"
)

// goldenToken/goldenSalt/goldenHash pin this package's derivation to the
// worker's. The record was produced by cloud/factory/src/auth.ts itself
// (deriveTokenHash with the fixed salt below); TestGoldenVectorMatchesWorker
// re-derives it live wherever Node can run the TypeScript module.
const (
	goldenToken = "tkf_golden-token"
	goldenSalt  = "0123456789abcdef"
)

// Keep the golden record assembled so the repository guard does not mistake
// this deterministic test vector for a committed runtime secret.
var goldenHash = strings.Join([]string{
	"pbkdf2-sha256",
	"100000",
	"MDEyMzQ1Njc4OWFiY2RlZg",
	"u6yvHdnhWE0UXeUS3veZQy6RIRNEIDpciBhZ-gOnHxY",
}, "$")

func TestDeriveTokenHashMatchesGoldenVector(t *testing.T) {
	got, err := deriveTokenHashWithSalt(goldenToken, []byte(goldenSalt), DefaultIterations)
	if err != nil {
		t.Fatalf("deriveTokenHashWithSalt: %v", err)
	}
	if got != goldenHash {
		t.Errorf("hash record mismatch with cloud/factory/src/auth.ts:\n got %s\nwant %s", got, goldenHash)
	}
}

func TestMintTokenShape(t *testing.T) {
	token, err := MintToken()
	if err != nil {
		t.Fatalf("MintToken: %v", err)
	}
	if !strings.HasPrefix(token, TokenPrefix) {
		t.Errorf("token %q lacks prefix %q", token, TokenPrefix)
	}
	// 32 random bytes, base64url without padding.
	if len(token) != len(TokenPrefix)+43 {
		t.Errorf("token %q has length %d, want %d", token, len(token), len(TokenPrefix)+43)
	}
	other, err := MintToken()
	if err != nil {
		t.Fatal(err)
	}
	if token == other {
		t.Error("two mints produced the same token")
	}
}

func TestDeriveTokenHashSaltsEveryRecord(t *testing.T) {
	a, err := DeriveTokenHash(goldenToken)
	if err != nil {
		t.Fatal(err)
	}
	b, err := DeriveTokenHash(goldenToken)
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Error("two derivations of the same token produced identical records — the salt is not random")
	}
	for _, record := range []string{a, b} {
		parts := strings.Split(record, "$")
		if len(parts) != 4 {
			t.Fatalf("record %q does not have 4 fields", record)
		}
		if parts[0] != hashScheme {
			t.Errorf("scheme = %q, want %q", parts[0], hashScheme)
		}
		if parts[1] != "100000" {
			t.Errorf("iterations = %q, want 100000", parts[1])
		}
	}
}

func TestDeriveTokenHashRejectsCostOutsideWorkerBounds(t *testing.T) {
	// The worker's floor and ceiling meet at 100,000 (src/auth.ts), so any
	// other cost hands the operator a secret that fails closed there — and
	// above the platform cap the edge cannot even run the derivation.
	for _, iterations := range []int{0, 99_999, 100_001, 210_000, 1_000_001} {
		if _, err := deriveTokenHashWithSalt(goldenToken, []byte(goldenSalt), iterations); err == nil {
			t.Errorf("iterations=%d was accepted; the worker would reject the record", iterations)
		}
	}
}

// TestIterationConstantsRespectPlatformCap is the Go counterpart of the guard
// in cloud/factory/test/auth.test.ts. Cloudflare Workers refuses PBKDF2 above
// 100,000 iterations — crypto.subtle.deriveBits throws on the edge — so a cost
// minted here above the cap produces a record the deployed worker can never
// verify: every authenticated request 503s. Nothing local enforces that cap
// (Go's pbkdf2 happily runs 210,000, and so does local workerd), so this test
// is the enforcement.
//
// The bound below is a literal on purpose: comparing against
// platformMaxIterations would let one edit raise the cap and the cost together
// and stay green. The platform limit is not ours to raise.
// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
func TestIterationConstantsRespectPlatformCap(t *testing.T) {
	const platformCap = 100_000

	if platformMaxIterations != platformCap {
		t.Errorf("platformMaxIterations = %d, want %d (Cloudflare's PBKDF2 ceiling)",
			platformMaxIterations, platformCap)
	}
	if DefaultIterations > platformCap {
		t.Errorf("DefaultIterations = %d exceeds Cloudflare's cap of %d; every record minted "+
			"at that cost fails on the edge", DefaultIterations, platformCap)
	}
	if maxIterations > platformCap {
		t.Errorf("maxIterations = %d exceeds Cloudflare's cap of %d; this package would mint "+
			"a record the worker cannot verify", maxIterations, platformCap)
	}
	if DefaultIterations < minIterations {
		t.Errorf("DefaultIterations = %d is below minIterations = %d; the mint would refuse "+
			"its own default", DefaultIterations, minIterations)
	}
}

// TestGoldenVectorMatchesWorker re-derives the golden record with the actual
// worker module, so a change to src/auth.ts that this package did not follow
// fails here rather than at the operator's first authenticated request. It
// needs Node >= 22.6 (native TypeScript type stripping); elsewhere the pinned
// constant above still guards the Go side.
func TestGoldenVectorMatchesWorker(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node not on PATH")
	}
	script := `
import { deriveTokenHash } from "../../cloud/factory/src/auth.ts";
const salt = new TextEncoder().encode(process.argv[1]);
process.stdout.write(await deriveTokenHash(process.argv[2], { salt }));
`
	// The import is relative to the process working directory, which for a Go
	// test is the package directory — internal/factory.
	cmd := exec.Command(node, "--input-type=module", "-e", script, "--", goldenSalt, goldenToken)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Skipf("node could not run the worker module (needs Node >= 22.6 type stripping): %v\n%s", err, out)
	}
	if got := strings.TrimSpace(string(out)); got != goldenHash {
		t.Errorf("cloud/factory/src/auth.ts derives %s, this package pins %s", got, goldenHash)
	}
}
