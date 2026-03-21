# Releasing Ticks

This repository now uses a single tag-driven release flow for every shipped component:

- `tk` CLI binaries on GitHub Releases
- embedded local board UI inside the CLI binary
- hosted cloud worker at `ticks.sh`
- Homebrew formula updates for stable releases

## Release Inputs

Stable releases are created from git tags like `v0.10.8`.

Pre-releases use tags like `v0.10.8-rc1`.

The tag is the public version source of truth. The private `package.json` versions in the UI and worker are build metadata only.

## Required Secrets

The release workflow depends on these repository secrets:

- `HOMEBREW_TAP_TOKEN`: push updated formulae and release assets to `pengelbrecht/homebrew-tap`
- `CLOUDFLARE_API_TOKEN`: deploy the hosted worker
- `CLOUDFLARE_ACCOUNT_ID`: target the correct Cloudflare account during deploy

If the Cloudflare secrets are missing, the workflow will still publish the CLI release and skip the worker deploy with a log message.

## What The Workflow Does

The workflow in [`release.yml`](../.github/workflows/release.yml) runs on every `v*` tag.

1. `build-ui`
   Builds the tickboard UI once with [`build-ui.sh`](../scripts/build-ui.sh) and uploads `internal/tickboard/server/static` as a reusable artifact.

2. `release`
   Downloads the shared UI artifact, commits the generated static files into the CI worktree so GoReleaser sees a clean tree, and publishes multi-platform `tk` binaries to GitHub Releases.

3. `deploy-cloud`
   Runs only for stable tags. It downloads the exact same UI artifact used by the CLI release and deploys the Cloudflare worker with Wrangler, so `ticks.sh` serves the same board build shipped inside the CLI.

4. `update-homebrew`
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
9. Verify `ticks.sh` is serving the new deployment for stable tags.
10. If needed, announce the release and update downstream docs.

## Pre-Releases

Pre-release tags still publish CLI prereleases through GoReleaser, but they do not update Homebrew or deploy `ticks.sh`.

Use a pre-release tag when you want downloadable binaries without changing the production hosted service.

## Manual Fallback

If GitHub Actions cannot reach Cloudflare, you can still deploy the hosted app manually:

```bash
./scripts/build-ui.sh
cd cloud/worker
pnpm install --frozen-lockfile
pnpm exec wrangler deploy
```

That fallback should produce the same asset layout as CI, because both paths deploy from `internal/tickboard/server/static`.
