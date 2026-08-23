// Package devbuild documents and guards this repo's build convention:
// a development build of `tk` goes to ./bin/tk (gitignored) and never over
// the machine-wide binary.
//
// The machine-wide binary at ~/.local/bin/tk is shared by every agent and
// every shell on the machine, and it may be carrying a hand-applied local
// patch. Rebuilding it from a clean tree silently reverts that patch — which
// broke `tk herd` for other agents mid-task once already. Machine-wide
// installs are therefore a deliberate, opted-in action (a release action),
// not a side effect of iterating.
//
// The package holds no runtime code. Its tests pin the three pieces that make
// the convention hold: the Makefile targets, the guard in
// scripts/install-tk.sh, and the notes in the contributor docs.
package devbuild
