package factory

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func verificationResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     fmt.Sprintf("%d test response", status),
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestVerifyEndpointRetriesCloudflareEdgeError1042(t *testing.T) {
	var calls atomic.Int32
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		switch calls.Add(1) {
		case 1:
			return verificationResponse(1042, "Error 1042: propagation in progress"), nil
		case 2:
			return verificationResponse(http.StatusOK, `{"auth":{"configured":true}}`), nil
		default:
			return verificationResponse(http.StatusNotFound, `{"error":"not found"}`), nil
		}
	})}

	opts := Options{
		HTTPClient:     client,
		verifyAttempts: 2,
		verifyDelay:    time.Millisecond,
	}
	if err := verifyEndpoint(context.Background(), opts, "https://factory.example.com", "tkf_test"); err != nil {
		t.Fatalf("verifyEndpoint: %v", err)
	}
	if got := calls.Load(); got != 3 {
		t.Errorf("HTTP calls = %d, want health, retry health, authenticated probe", got)
	}
}

func TestVerifyEndpointExhaustionRemainsActionable(t *testing.T) {
	var calls atomic.Int32
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		calls.Add(1)
		return verificationResponse(http.StatusServiceUnavailable, "secret is still propagating"), nil
	})}

	opts := Options{
		HTTPClient:     client,
		verifyAttempts: 3,
		verifyDelay:    time.Millisecond,
	}
	err := verifyEndpoint(context.Background(), opts, "https://factory.example.com", "tkf_test")
	if err == nil {
		t.Fatal("verifyEndpoint succeeded after exhausting transient failures")
	}
	if !strings.Contains(err.Error(), "nothing is lost by running it again") {
		t.Errorf("error lost the re-run guidance: %v", err)
	}
	if got := calls.Load(); got != 3 {
		t.Errorf("HTTP calls = %d, want exactly the configured attempts", got)
	}
}

func TestVerificationBackoffIsBounded(t *testing.T) {
	want := []time.Duration{2 * time.Second, 4 * time.Second, 8 * time.Second, 8 * time.Second}
	for retryNumber, expected := range want {
		if got := verificationBackoff(defaultVerifyDelay, retryNumber+1); got != expected {
			t.Errorf("retry %d delay = %s, want %s", retryNumber+1, got, expected)
		}
	}
}
