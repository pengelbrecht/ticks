package cmd

import (
	"errors"
	"fmt"
	"io/fs"
)

// notFoundIfMissing classifies a tick-store lookup failure and wraps it with
// the caller's context message.
//
// An absent tick file — and only an absent tick file — is ExitNotFound (4):
// the id names nothing, so an orchestrator can branch on "no such tick"
// without parsing the message. Anything else keeps the generic classification
// (1). That boundary is the one herdCollectManifests already draws for run
// manifests: a file that exists but cannot be read or parsed is a real
// failure, and a caller that read 4 as "this was never created" would act on
// damaged state instead of stopping.
//
// Call it at every tick-lookup site instead of fmt.Errorf, e.g.
//
//	t, err := store.Read(id)
//	if err != nil {
//		return notFoundIfMissing("failed to read tick", err)
//	}
//
// The message is unchanged from the fmt.Errorf it replaces; only the exit
// code differs.
func notFoundIfMissing(msg string, err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, fs.ErrNotExist) {
		return NewExitError(ExitNotFound, "%s: %v", msg, err)
	}
	return fmt.Errorf("%s: %w", msg, err)
}
