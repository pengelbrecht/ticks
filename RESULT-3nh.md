<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/72y/3nh`, base `51595773b7b959ec398586590c72c562974af54f`, harness `omp` exited 0, 1 work commit(s), 0 uncommitted path(s)._

# RESULT — tick 3nh: Support herdr protocol 20

## Decision: supported RANGE, not an exact pin

`client.New` no longer fails closed on any non-20 protocol. It now enforces a
supported range:

- `MinProtocolVersion = 20` — hard floor. A server reporting below it gets a
  `ProtocolMismatchError` and no client (fail closed). Its response shapes are
  older than anything this package has ever decoded.
- `ProtocolVersion = 20` — the written-against pin (herdr 0.8.2).
- `ProtocolWarnVersion = 20` — warning ceiling. A server newer than this is
  assumed forward-compatible (it can only have added shapes this client does
  not ask for), so `New` succeeds and writes a one-line warning to the new
  `Options.ProtocolWarning` writer when set. There is no hard upper bound; a
  genuinely incompatible protocol is expected to arrive as a bumped minimum,
  not a break under the same version.

Today all three constants equal 20, so exactly protocol 20 is silent, anything
newer warns, anything older hard-stops. The minimum and warn thresholds are
independent so a future drop of old-protocol support changes one number, not
the policy.

`ProtocolMismatchError.Expected` was renamed `Min`; the message now reads
"this client requires at least protocol %d — refusing to continue".

The warning is wired through `cmd/tk/cmd/herd_shared.go` `herdConnect` (now
takes a `warn io.Writer`) into all 7 `tk herd` subcommands, each passing
`cmd.ErrOrStderr()` / its stderr writer.

## Verification

- `go test ./cmd/... ./internal/herd/...` — all green.
- `go build ./...` — clean.
- `go vet ./internal/herd/... ./cmd/tk/cmd/...` — clean.
- `gofmt -l` — clean.
- New test `TestNewAcceptsForwardCompatibleProtocol` pins the range policy:
  protocol 21 succeeds and emits a warning naming the newer protocol.
- `TestNewFailsClosedBelowMinProtocol` now drives protocols 0 and 19 and asserts
  the `.Min` field and "refusing to continue" message.

## Honesty notes / remaining work

- **Fixtures were NOT re-captured.** No herdr binary, cargo, or rustc exists in
  this container, so a live 0.8.2 capture and a 19-vs-20 `herdr api schema
  --json` diff were impossible. The `.ndjson` fixtures remain the 0.8.0-era
  captures; their provenance headers now say so explicitly and point here.
- `herdtest.PongResult` advertises `protocol 20` / `0.8.2`. It is derived from
  the bump premise, not a live capture; its comment says so.
- Whether the 19 -> 20 bump changed any decoded response shape is **unverified**
  here. The range policy is the compatibility answer regardless: a newer
  protocol warns rather than stops, a dropped-shape break would surface as a
  bumped minimum and fail closed.
- Follow-up (blocked on a live herdr 0.8.2): re-capture `testdata/` fixtures and
  run a 19-vs-20 schema diff to confirm no shape the client decodes changed.

STATUS: DONE (policy decided and implemented; suite green; fixture re-capture
blocked by environment and documented honestly)