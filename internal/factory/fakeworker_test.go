package factory

import (
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
)

// verifyTokenAgainstHash is the test's stand-in for the worker's
// verifyFactoryToken (cloud/factory/src/auth.ts). It lives in the test build
// only: nothing tk does needs to verify a token — the deployed worker does
// that — but the fake endpoint in deploy_test.go has to, or "the deploy pushed
// a hash that matches the token it stored" would go unproven.
func verifyTokenAgainstHash(token, record string) (bool, error) {
	parts := strings.Split(strings.TrimSpace(record), "$")
	if len(parts) != 4 {
		return false, fmt.Errorf("malformed hash record %q", record)
	}
	if parts[0] != hashScheme {
		return false, fmt.Errorf("unexpected scheme %q", parts[0])
	}
	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false, fmt.Errorf("malformed iteration count %q", parts[1])
	}
	salt, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return false, fmt.Errorf("malformed salt: %w", err)
	}
	want, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return false, fmt.Errorf("malformed derived key: %w", err)
	}
	got, err := pbkdf2.Key(sha256.New, token, salt, iterations, len(want))
	if err != nil {
		return false, err
	}
	return hmac.Equal(got, want), nil
}
