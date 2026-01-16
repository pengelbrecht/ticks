# Contributing to Ticks

Thanks for wanting to contribute! Here's what you need to know.

## The Basics

1. **Fork and clone** the repo
2. **Create a branch** for your changes
3. **Make your changes** - write tests if adding functionality
4. **Run the tests**: `go test ./...`
5. **Smoke test it** - actually run `tk` and verify it works
6. **Open a PR** with a clear description of what you did

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
