#!/usr/bin/env bash
# verify-factory-deploy.sh — end-to-end proof of `tk factory deploy` without a
# Cloudflare account.
#
# WHY A HARNESS AND NOT A LIVE ACCOUNT
#
# The command's acceptance is "from a clean Cloudflare account, one command
# produces a working authenticated factory endpoint and a ~/.ticksrc entry, and
# re-running does not duplicate resources". Proving that against a real account
# needs an account nobody has in CI, costs the paid Workers plan, and leaves
# real buckets and databases behind. So this harness substitutes exactly two
# things — the `wrangler` CLI and the deployed Worker — and runs the real tk
# binary, the real bundle, the real token derivation, and the real HTTP
# verification against them.
#
# The wrangler stand-in (internal/factory/testdata/fake-wrangler.sh) is
# stateful: buckets and databases it creates persist for the run, so the second
# deploy sees the same account a real second deploy would. The endpoint below
# verifies the presented bearer token against the hash the deploy actually
# pushed, so "the token in ~/.ticksrc authenticates against the deployment" is
# a real assertion, not a stub returning 200.
#
# What it proves, in order:
#   1. no wrangler         → nonzero exit, an error naming the prerequisite,
#                            and no ~/.ticksrc written
#   1b. only `npx wrangler` → the deploy resolves it and works, with no global
#                            wrangler binary anywhere on PATH
#   2. wrangler not logged in → nonzero exit naming `wrangler login`, and no
#                            resource created
#   3. clean account       → exit 0, D1 + R2 created once, migrations applied,
#                            secret pushed, endpoint verified, ~/.ticksrc holds
#                            factory_url / factory_token / factory_version
#   4. re-run              → exit 0, nothing created a second time, same token
#   5. --rotate-token      → a different token, and the new one is what the
#                            endpoint now accepts
#
# Usage:  bash scripts/verify-factory-deploy.sh [--keep]
#           --keep   leave the scratch directory in place for inspection
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

command -v go >/dev/null || { echo "go is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required (it serves the fake factory endpoint)" >&2; exit 1; }

SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/tk-factory-verify.XXXXXX")"
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  if [ "$KEEP" -eq 1 ]; then
    echo "scratch kept at $SCRATCH"
  else
    rm -rf "$SCRATCH"
  fi
}
trap cleanup EXIT

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
# Build the real tk binary.
# ---------------------------------------------------------------------------
step "0. build tk"
TK="$SCRATCH/tk"
# Semver on purpose: tk's periodic update check parses its own version with a
# MustParse, so a non-semver stamp panics before any command runs.
HARNESS_VERSION="0.0.0-verify-harness"
(cd "$REPO_ROOT" && go build -ldflags "-X main.Version=$HARNESS_VERSION -X github.com/pengelbrecht/ticks/cmd/tk/cmd.Version=$HARNESS_VERSION" -o "$TK" ./cmd/tk)
pass "built $($TK version | head -1)"

# ---------------------------------------------------------------------------
# The fake factory endpoint: /health mirrors the worker's payload, every other
# route verifies the bearer token against the pushed hash exactly as
# cloud/factory/src/auth.ts does.
# ---------------------------------------------------------------------------
STATE="$SCRATCH/account"
mkdir -p "$STATE"
PORT_FILE="$SCRATCH/port"

cat > "$SCRATCH/endpoint.py" <<'PY'
import base64, hashlib, hmac, json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

STATE = sys.argv[1]
PORT_FILE = sys.argv[2]

def stored_hash():
    try:
        with open(os.path.join(STATE, "secret-FACTORY_TOKEN_HASH")) as fh:
            return fh.read().strip()
    except OSError:
        return ""

def b64url(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

def verify(token, record):
    parts = record.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2-sha256":
        return False
    derived = hashlib.pbkdf2_hmac("sha256", token.encode(), b64url(parts[2]), int(parts[1]), 32)
    return hmac.compare_digest(derived, b64url(parts[3]))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        record = stored_hash()
        if self.path == "/health":
            body = json.dumps({
                "status": "ok",
                "service": "ticks-factory",
                "auth": {"required": True, "configured": bool(record)},
            }).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if not record:
            self.send_response(503)
            self.end_headers()
            return
        auth = self.headers.get("Authorization", "")
        token = auth[len("Bearer "):] if auth.startswith("Bearer ") else ""
        if not token or not verify(token, record):
            self.send_response(401)
            self.end_headers()
            return
        with open(os.path.join(STATE, "authenticated-requests"), "a") as fh:
            fh.write(self.path + "\n")
        self.send_response(404)
        self.end_headers()

server = HTTPServer(("127.0.0.1", 0), Handler)
with open(PORT_FILE, "w") as fh:
    fh.write(str(server.server_address[1]))
server.serve_forever()
PY

python3 "$SCRATCH/endpoint.py" "$STATE" "$PORT_FILE" &
SERVER_PID=$!
for _ in $(seq 1 50); do [ -s "$PORT_FILE" ] && break; sleep 0.1; done
[ -s "$PORT_FILE" ] || fail "the fake factory endpoint never started"
ENDPOINT="http://127.0.0.1:$(cat "$PORT_FILE")"

# ---------------------------------------------------------------------------
# The fake wrangler, and a home directory that is not the operator's.
# ---------------------------------------------------------------------------
BIN="$SCRATCH/bin"
mkdir -p "$BIN"
ln -s "$REPO_ROOT/internal/factory/testdata/fake-wrangler.sh" "$BIN/wrangler"

# A second PATH entry offering only `npx`, for the operators whose entire
# wrangler installation is `npx wrangler`.
NPXBIN="$SCRATCH/npx-bin"
mkdir -p "$NPXBIN"
ln -s "$REPO_ROOT/internal/factory/testdata/fake-npx.sh" "$NPXBIN/npx"
ln -s "$REPO_ROOT/internal/factory/testdata/fake-wrangler.sh" "$NPXBIN/fake-wrangler.sh"

export HOME="$SCRATCH/home"
mkdir -p "$HOME"
export TK_HOME="$HOME/.tick"
export FAKE_WRANGLER_STATE="$STATE"
export FAKE_WRANGLER_LOG="$SCRATCH/wrangler.log"
export FAKE_WRANGLER_URL="$ENDPOINT"
: >"$FAKE_WRANGLER_LOG"

TICKSRC="$HOME/.ticksrc"
count_calls() { grep -c -- "$1" "$FAKE_WRANGLER_LOG" || true; }
rc_value() { sed -n "s/^$1=//p" "$TICKSRC"; }

# The resolver also checks cloud/factory/node_modules/.bin. Run the PATH-only
# scenarios outside the checkout so a developer's local dependency cannot
# accidentally turn “no Wrangler installed” into a different test.
cd "$SCRATCH"

# ---------------------------------------------------------------------------
step "1. wrangler is not installed"
# ---------------------------------------------------------------------------
set +e
OUT="$(PATH="$SCRATCH/empty-bin" "$TK" factory deploy 2>&1)"
CODE=$?
set -e
[ "$CODE" -ne 0 ] || fail "exit code was 0 without wrangler installed"
grep -qi "wrangler" <<<"$OUT" || fail "the error does not name wrangler: $OUT"
grep -qi "install" <<<"$OUT" || fail "the error does not say how to install it: $OUT"
[ ! -e "$TICKSRC" ] || fail "a failed precondition wrote $TICKSRC"
pass "exit $CODE, names the missing prerequisite, wrote nothing"

# ---------------------------------------------------------------------------
step "1b. no global wrangler, only \`npx wrangler\`"
# ---------------------------------------------------------------------------
NPX_HOME="$SCRATCH/npx-home"
mkdir -p "$NPX_HOME"
set +e
OUT="$(HOME="$NPX_HOME" TK_HOME="$NPX_HOME/.tick" PATH="$NPXBIN:/usr/bin:/bin" "$TK" factory deploy 2>&1)"
CODE=$?
set -e
[ "$CODE" -eq 0 ] || fail "the deploy failed with only npx available: $OUT"
grep -q "npx wrangler" <<<"$OUT" || fail "the deploy does not report which CLI it used: $OUT"
grep -q "^factory_token=tkf_" "$NPX_HOME/.ticksrc" || fail "no token was recorded on the npx path"
rm -rf "$STATE"/* "$NPX_HOME"
mkdir -p "$STATE"
: >"$FAKE_WRANGLER_LOG"
pass "resolved \`npx wrangler\` with no global binary on PATH"

# ---------------------------------------------------------------------------
step "2. wrangler is installed but not logged in"
# ---------------------------------------------------------------------------
set +e
OUT="$(PATH="$BIN:$PATH" FAKE_WRANGLER_UNAUTH=1 "$TK" factory deploy 2>&1)"
CODE=$?
set -e
[ "$CODE" -ne 0 ] || fail "exit code was 0 with an unauthenticated wrangler"
grep -q "wrangler login" <<<"$OUT" || fail "the error does not point at \`wrangler login\`: $OUT"
[ ! -e "$TICKSRC" ] || fail "a failed precondition wrote $TICKSRC"
[ "$(count_calls 'd1 create')" -eq 0 ] || fail "resources were created despite the failed precondition"
pass "exit $CODE, points at \`wrangler login\`, created nothing"

# ---------------------------------------------------------------------------
step "3. clean account: one command, a working authenticated factory"
# ---------------------------------------------------------------------------
export PATH="$BIN:$PATH"
"$TK" factory deploy || fail "deploy against a clean account failed"

[ -f "$TICKSRC" ] || fail "$TICKSRC was not written"
[ "$(rc_value factory_url)" = "$ENDPOINT" ] || fail "factory_url is $(rc_value factory_url), want $ENDPOINT"
TOKEN1="$(rc_value factory_token)"
case "$TOKEN1" in tkf_*) ;; *) fail "factory_token is not a factory token: $TOKEN1" ;; esac
[ "$(rc_value factory_version)" = "$HARNESS_VERSION" ] || fail "factory_version is $(rc_value factory_version)"
if [ "$(uname)" != "Darwin" ]; then
  PERM="$(stat -c '%a' "$TICKSRC")"
else
  PERM="$(stat -f '%A' "$TICKSRC")"
fi
[ "$PERM" = "600" ] || fail "$TICKSRC is mode $PERM, want 600"
[ "$(count_calls 'd1 create')" -eq 1 ] || fail "d1 create ran $(count_calls 'd1 create') times"
[ "$(count_calls 'r2 bucket create')" -eq 1 ] || fail "r2 bucket create ran $(count_calls 'r2 bucket create') times"
[ "$(count_calls 'migrations apply')" -eq 1 ] || fail "migrations were not applied"
[ -f "$STATE/secret-FACTORY_TOKEN_HASH" ] || fail "the FACTORY_TOKEN_HASH secret was never pushed"
[ -f "$STATE/authenticated-requests" ] || fail "the deploy never made an authenticated request against the endpoint"
grep -q 'database_id = "aaaaaaaa-' "$STATE/deployed-wrangler.toml" || fail "the deployed config still carries the placeholder database_id"
grep -q "$HARNESS_VERSION" "$STATE/execute.log" || fail "the deployed version was not recorded in D1"
pass "endpoint verified, credentials in $TICKSRC (mode 600), resources created once"

# ---------------------------------------------------------------------------
step "4. re-run: upgrade in place, no duplicate resources, same token"
# ---------------------------------------------------------------------------
"$TK" factory deploy || fail "the second deploy failed"
TOKEN2="$(rc_value factory_token)"
[ "$TOKEN2" = "$TOKEN1" ] || fail "the token changed on a plain re-run"
[ "$(count_calls 'd1 create')" -eq 1 ] || fail "d1 create ran again: $(count_calls 'd1 create') times"
[ "$(count_calls 'r2 bucket create')" -eq 1 ] || fail "r2 bucket create ran again: $(count_calls 'r2 bucket create') times"
[ "$(count_calls '^deploy')" -eq 2 ] || fail "the worker was not redeployed"
pass "second run reused both resources and preserved the token"

# ---------------------------------------------------------------------------
step "5. --rotate-token: a new credential the endpoint accepts"
# ---------------------------------------------------------------------------
"$TK" factory deploy --rotate-token || fail "the rotating deploy failed"
TOKEN3="$(rc_value factory_token)"
[ "$TOKEN3" != "$TOKEN2" ] || fail "--rotate-token kept the old token"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN3" "$ENDPOINT/api/anything")"
[ "$STATUS" = "404" ] || fail "the rotated token is not accepted by the endpoint (got $STATUS)"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN2" "$ENDPOINT/api/anything")"
[ "$STATUS" = "401" ] || fail "the previous token still authenticates (got $STATUS)"
pass "rotation took effect; the previous token no longer authenticates"

printf '\n\033[32mAll factory deploy scenarios passed.\033[0m\n'
