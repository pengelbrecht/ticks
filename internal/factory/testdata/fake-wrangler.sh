#!/bin/sh
# A stand-in for the real `wrangler`, used by internal/factory's tests and by
# scripts/verify-factory-deploy.sh.
#
# It is deliberately stateful: buckets and databases it "creates" are recorded
# under $FAKE_WRANGLER_STATE, so a second `tk factory deploy` sees the same
# account a real second run would and the harness can prove no resource is
# created twice. Every invocation is appended to $FAKE_WRANGLER_LOG, one line
# per call, which is the assertion surface.
#
# Environment:
#   FAKE_WRANGLER_STATE   directory holding the simulated account (required)
#   FAKE_WRANGLER_LOG     file receiving one line per invocation (required)
#   FAKE_WRANGLER_URL     URL printed by `deploy` (default: a workers.dev URL)
#   FAKE_WRANGLER_UNAUTH  when non-empty, `whoami` fails as if not logged in
#   FAKE_WRANGLER_NO_INFO when non-empty, `r2 bucket info` is an unknown
#                         subcommand (an older wrangler), exercising the fallback
#
# Container application (the half `wrangler deploy` does not wait for):
#   FAKE_WRANGLER_PUSH_DIGEST   digest `deploy` reports pushing (default: a new one)
#   FAKE_WRANGLER_SERVING_DIGEST digest the application reports before the
#                         rollout lands (default: an "old image" digest)
#   FAKE_WRANGLER_ROLLOUT_LAG   how many `containers list` calls still report the
#                         old digest before the new one appears (default 0)
#   FAKE_WRANGLER_ROLLOUT_STUCK when non-empty, the rollout never lands
#   FAKE_WRANGLER_NO_PUSH when non-empty, `deploy` reports that the image
#                         already exists remotely and emits no image block
#   FAKE_WRANGLER_NO_CONTAINER_BLOCK when non-empty, `deploy` prints no container
#                         application block, so no digest can be read from it
#   FAKE_WRANGLER_NO_CONTAINERS when non-empty, `containers` is an unknown
#                         subcommand (an older wrangler)
#   FAKE_WRANGLER_NO_SUCH_APP   when non-empty, the listing has other applications
#                         but not this one
set -eu

: "${FAKE_WRANGLER_STATE:?fake wrangler needs FAKE_WRANGLER_STATE}"
: "${FAKE_WRANGLER_LOG:?fake wrangler needs FAKE_WRANGLER_LOG}"
mkdir -p "$FAKE_WRANGLER_STATE/buckets" "$FAKE_WRANGLER_STATE/d1"
printf '%s\n' "$*" >>"$FAKE_WRANGLER_LOG"

url=${FAKE_WRANGLER_URL:-https://ticks-factory.acme.workers.dev}

old_digest=${FAKE_WRANGLER_SERVING_DIGEST:-sha256:1111111111111111111111111111111111111111111111111111111111111111}
new_digest=${FAKE_WRANGLER_PUSH_DIGEST:-sha256:2222222222222222222222222222222222222222222222222222222222222222}
registry=registry.cloudflare.com/acct

case "${1:-}" in
  --version)
    echo "4.123.0"
    ;;
  whoami)
    if [ -n "${FAKE_WRANGLER_UNAUTH:-}" ]; then
      echo "You are not authenticated. Please run \`wrangler login\`." >&2
      exit 1
    fi
    echo "Getting User settings..."
    echo "👋 You are logged in with an OAuth Token, associated with the email test@example.com."
    ;;
  r2)
    name=${4:-}
    case "${3:-}" in
      info)
        if [ -n "${FAKE_WRANGLER_NO_INFO:-}" ]; then
          echo "Unknown argument: info" >&2
          exit 1
        fi
        if [ -f "$FAKE_WRANGLER_STATE/buckets/$name" ]; then
          echo "name: $name"
        else
          echo "The specified bucket does not exist. [code: 10006]" >&2
          exit 1
        fi
        ;;
      create)
        if [ -f "$FAKE_WRANGLER_STATE/buckets/$name" ]; then
          echo "A bucket with that name already exists. [code: 10004]" >&2
          exit 1
        fi
        : >"$FAKE_WRANGLER_STATE/buckets/$name"
        echo "Created bucket '$name'."
        ;;
      list)
        echo "name:          demo-other-bucket"
        for b in "$FAKE_WRANGLER_STATE"/buckets/*; do
          [ -e "$b" ] || continue
          echo "name:          $(basename "$b")"
        done
        ;;
      *)
        echo "fake wrangler: unsupported r2 command: $*" >&2
        exit 64
        ;;
    esac
    ;;
  d1)
    case "${2:-}" in
      list)
        printf '['
        first=1
        for d in "$FAKE_WRANGLER_STATE"/d1/*; do
          [ -e "$d" ] || continue
          [ $first -eq 1 ] || printf ','
          first=0
          printf '{"uuid":"%s","name":"%s","version":"production"}' "$(cat "$d")" "$(basename "$d")"
        done
        printf ']\n'
        ;;
      create)
        name=${3:-}
        if [ -f "$FAKE_WRANGLER_STATE/d1/$name" ]; then
          echo "A database with that name already exists. [code: 7502]" >&2
          exit 1
        fi
        # Deterministic-but-distinct per name, so the log is readable.
        printf 'aaaaaaaa-bbbb-cccc-dddd-%012d' "$(ls "$FAKE_WRANGLER_STATE/d1" | wc -l | tr -d ' ')" \
          >"$FAKE_WRANGLER_STATE/d1/$name"
        echo "✅ Successfully created DB '$name'"
        echo "database_id = \"$(cat "$FAKE_WRANGLER_STATE/d1/$name")\""
        ;;
      migrations)
        echo "migrations applied" >>"$FAKE_WRANGLER_STATE/migrations.log"
        echo "🌀 No migrations to apply!"
        ;;
      execute)
        # Record the SQL so the harness can prove the version row was written.
        printf '%s\n' "$*" >>"$FAKE_WRANGLER_STATE/execute.log"
        echo "🚣 Executed 1 command"
        ;;
      *)
        echo "fake wrangler: unsupported d1 command: $*" >&2
        exit 64
        ;;
    esac
    ;;
  deploy)
    if [ ! -f wrangler.toml ]; then
      echo "fake wrangler: no wrangler.toml in $(pwd)" >&2
      exit 1
    fi
    if grep -q '^database_id = "00000000-0000-0000-0000-000000000000"' wrangler.toml; then
      echo "fake wrangler: refusing to deploy with the placeholder database_id" >&2
      exit 1
    fi
    cp wrangler.toml "$FAKE_WRANGLER_STATE/deployed-wrangler.toml"
    # The Docker build log wrangler prints first is full of sha256 digests that
    # are NOT the application's; the parser has to ignore them.
    echo "#4 [internal] load metadata for docker.io/cloudflare/sandbox:0.12.7-python"
    echo "#4 resolve docker.io/cloudflare/sandbox@sha256:6666666666666666666666666666666666666666666666666666666666666666"
    if [ -n "${FAKE_WRANGLER_NO_PUSH:-}" ]; then
      echo "Image already exists remotely, skipping push"
    elif [ -z "${FAKE_WRANGLER_NO_CONTAINER_BLOCK:-}" ]; then
      printf '%s' "$new_digest" >"$FAKE_WRANGLER_STATE/container-target"
      : >"$FAKE_WRANGLER_STATE/containers-list-count"
      echo "╭ Deploy a container application"
      echo "├ EDIT ticks-orchestrator"
      echo "-   image = \"$registry/ticks-orchestrator@$old_digest\""
      echo "+   image = \"$registry/ticks-orchestrator@$new_digest\""
      echo "╰ Applied changes"
    fi
    echo "Total Upload: 12.34 KiB / gzip: 3.21 KiB"
    echo "Uploaded ticks-factory (1.23 sec)"
    echo "Deployed ticks-factory triggers (0.45 sec)"
    echo "  $url"
    echo "Current Version ID: 00000000-1111-2222-3333-444444444444"
    ;;
  containers)
    if [ -n "${FAKE_WRANGLER_NO_CONTAINERS:-}" ]; then
      echo "Unknown argument: containers" >&2
      exit 1
    fi
    case "${2:-}" in
      list)
        count_file="$FAKE_WRANGLER_STATE/containers-list-count"
        calls=0
        [ -s "$count_file" ] && calls=$(cat "$count_file")
        calls=$((calls + 1))
        printf '%s' "$calls" >"$count_file"

        serving=$old_digest
        if [ -z "${FAKE_WRANGLER_ROLLOUT_STUCK:-}" ] \
          && [ -f "$FAKE_WRANGLER_STATE/container-target" ] \
          && [ "$calls" -gt "${FAKE_WRANGLER_ROLLOUT_LAG:-0}" ]; then
          serving=$(cat "$FAKE_WRANGLER_STATE/container-target")
        fi

        printf '['
        printf '{"id":"other-1","name":"someone-elses-app","state":"ready","instances":0,'
        printf '"image":"%s/someone-elses-app@%s","version":1,' "$registry" "$old_digest"
        printf '"updated_at":"2026-08-20T00:00:00Z","created_at":"2026-08-01T00:00:00Z"}'
        if [ -z "${FAKE_WRANGLER_NO_SUCH_APP:-}" ]; then
          printf ','
          printf '{"id":"app-1","name":"ticks-orchestrator","state":"ready","instances":0,'
          printf '"image":"%s/ticks-orchestrator@%s","version":7,' "$registry" "$serving"
          printf '"updated_at":"2026-08-20T00:00:00Z","created_at":"2026-08-01T00:00:00Z"}'
        fi
        printf ']\n'
        ;;
      *)
        echo "fake wrangler: unsupported containers command: $*" >&2
        exit 64
        ;;
    esac
    ;;
  secret)
    case "${2:-}" in
      put)
        cat >"$FAKE_WRANGLER_STATE/secret-${3:-unnamed}"
        echo "✨ Success! Uploaded secret ${3:-unnamed}"
        ;;
      *)
        echo "fake wrangler: unsupported secret command: $*" >&2
        exit 64
        ;;
    esac
    ;;
  *)
    echo "fake wrangler: unsupported command: $*" >&2
    exit 64
    ;;
esac
