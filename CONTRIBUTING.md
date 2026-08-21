# Contributing to Ticks

Thanks for wanting to contribute! Here's what you need to know.

## The Basics

1. **Fork and clone** the repo
2. **Create a branch** for your changes
3. **Make your changes** - write tests if adding functionality
4. **Run the tests**: `go test ./...`
5. **Build and smoke test it**: `make build`, then run `./bin/tk` and verify it works
6. **Open a PR** with a clear description of what you did

## Building

```bash
make build     # writes ./bin/tk (gitignored)
./bin/tk --help
```

**Dev builds go to `./bin/tk`. Never build over the machine-wide binary.**

`~/.local/bin/tk` (or wherever you installed `tk`) is shared by every shell —
and, if you work with coding agents, by every agent running on the machine. It
may also be carrying a hand-applied local patch. Running `go build -o
~/.local/bin/tk ./cmd/tk` from a clean tree silently reverts that patch and
swaps the binary out from under everything else mid-run. That has broken
`tk herd` for other agents once already.

Replacing the machine-wide binary is a release action, so you have to ask for
it explicitly:

```bash
TK_ALLOW_MACHINE_INSTALL=1 make install
```

Without that variable, `make install` refuses and points you back at
`make build`. Override the destination with `INSTALL_DIR=...` if you need to.

## AI-Generated Code

Ticks is designed for AI-assisted workflows, so naturally you might use AI to help write code. That's fine! But:

- **You are responsible for the code you submit** - review it, understand it, test it
- **Don't just copy-paste AI output** - AI makes mistakes, hallucinates APIs, and writes subtly broken code
- **Smoke test everything** - run `tk` commands and make sure they actually work

We're not anti-AI, we just want code that works. Human review catches bugs that AI misses.

## Code Style

- Follow existing patterns in the codebase
- Use `gofmt` (your editor probably does this automatically)
- Keep things simple - this isn't enterprise software

## What Makes a Good PR

- **Clear title** - what does this PR do?
- **Brief description** - why is this change needed?
- **Tests pass** - `go test ./...` should be green
- **Actually tested** - you ran it and it works

## Questions?

Open an issue. We don't bite.
