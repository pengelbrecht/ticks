# Releasing Ticks

This repository uses a single tag-driven release flow for every shipped component:

- `tk` CLI binaries on GitHub Releases
- embedded local board UI inside the CLI binary
- Homebrew formula updates for stable releases

Released binaries also embed the `skills/` tree as it exists at the tag, so `tk skills install` on any given release always installs the skill version-matched to that exact build.

## Release Inputs

Stable releases are created from git tags like `v0.10.8`.

Pre-releases use tags like `v0.10.8-rc1`.

The tag is the public version source of truth. The private `package.json` version in the UI is build metadata only.

## Required Secrets

The release workflow depends on these repository secrets:

- `HOMEBREW_TAP_TOKEN`: push updated formulae and release assets to `pengelbrecht/homebrew-tap`

## What The Workflow Does

The workflow in [`release.yml`](../.github/workflows/release.yml) runs on every `v*` tag.

1. `build-ui`
   Builds the tickboard UI once with [`build-ui.sh`](../scripts/build-ui.sh) and uploads `internal/tickboard/server/static` as a reusable artifact.

2. `release`
   Downloads the shared UI artifact, commits the generated static files into the CI worktree so GoReleaser sees a clean tree, and publishes multi-platform `tk` binaries to GitHub Releases.

3. `update-homebrew`
   Runs only for stable tags. It downloads the GoReleaser archives, publishes them to `pengelbrecht/homebrew-tap`, and updates `Formula/ticks.rb`.

## Release Checklist

Use this checklist for every release:

1. Start from a clean `main` branch and confirm the intended version bump.
2. Run local quality gates for the change set.
3. Merge the release-worthy changes to `main`.
4. Create and push the release tag:
   ```bash
   git checkout main
   git pull --rebase
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```
5. Watch the GitHub Actions run for the tag.
6. Verify the GitHub Release contains the expected archives and checksums.
7. Verify `brew upgrade pengelbrecht/tap/ticks` resolves the new version.
8. Verify `tk version` and `tk upgrade` see the new GitHub release.
9. If needed, announce the release and update downstream docs.

## Pre-Releases

Pre-release tags still publish CLI prereleases through GoReleaser, but they do not update Homebrew.

Use a pre-release tag when you want downloadable binaries without changing what `brew upgrade` installs.
