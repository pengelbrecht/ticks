package factory

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// The factory's single-tenant bearer auth (D16): the operator's machine mints
// a token and derives a salted PBKDF2 record; only the record is pushed to the
// Worker as the FACTORY_TOKEN_HASH secret, so a deployed factory never holds
// anything that can authenticate against it.
//
// Every constant here mirrors cloud/factory/src/auth.ts, which is the format's
// definition — the Worker rejects anything outside these bounds. The two
// implementations exist because the mint runs in Go (tk must not require a
// Node >= 22.6 able to type-strip the worker's TypeScript just to deploy) and
// verification runs in workerd. TestDeriveTokenHashMatchesGoldenVector pins a
// record produced by the TypeScript side so the pair cannot drift silently.
const (
	// TokenPrefix marks every minted token, so a leaked one is greppable.
	TokenPrefix = "tkf_"

	// tokenBytes is the entropy behind a token: the token *is* the secret.
	tokenBytes = 32

	// hashScheme is the only record format the worker accepts.
	hashScheme = "pbkdf2-sha256"

	// DefaultIterations is the PBKDF2 cost written into new records (the
	// OWASP figure for PBKDF2-HMAC-SHA-256).
	DefaultIterations = 210_000

	// minIterations/maxIterations are the worker's accepted bounds. A record
	// outside them fails closed there, so refuse to mint one here.
	minIterations = 100_000
	maxIterations = 1_000_000

	saltBytes  = 16
	derivedLen = 32 // 256 bits
)

// MintToken returns a fresh factory token. It only ever exists on the
// operator's machine and in ~/.ticksrc — the worker sees the hash alone.
func MintToken() (string, error) {
	buf := make([]byte, tokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("minting factory token: %w", err)
	}
	return TokenPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

// DeriveTokenHash builds the FACTORY_TOKEN_HASH record for token, drawing a
// fresh random salt. Deriving the same token twice yields different records;
// that is the point of the salt, and the worker verifies against whichever
// record is currently deployed.
func DeriveTokenHash(token string) (string, error) {
	salt := make([]byte, saltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("deriving factory token hash: %w", err)
	}
	return deriveTokenHashWithSalt(token, salt, DefaultIterations)
}

// deriveTokenHashWithSalt is the salt-injectable core, so the golden vector
// can be reproduced byte for byte against the TypeScript implementation.
func deriveTokenHashWithSalt(token string, salt []byte, iterations int) (string, error) {
	if iterations < minIterations || iterations > maxIterations {
		return "", fmt.Errorf("factory token hash: iterations must be in [%d, %d], got %d",
			minIterations, maxIterations, iterations)
	}
	if len(salt) < saltBytes {
		return "", fmt.Errorf("factory token hash: salt must be at least %d bytes, got %d", saltBytes, len(salt))
	}
	key, err := pbkdf2.Key(sha256.New, token, salt, iterations, derivedLen)
	if err != nil {
		return "", fmt.Errorf("factory token hash: %w", err)
	}
	return fmt.Sprintf("%s$%d$%s$%s",
		hashScheme,
		iterations,
		base64.RawURLEncoding.EncodeToString(salt),
		base64.RawURLEncoding.EncodeToString(key),
	), nil
}
