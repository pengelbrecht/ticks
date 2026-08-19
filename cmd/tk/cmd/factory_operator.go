package cmd

import (
	"os"
	"strings"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// factoryOperatorChannel reads the cloud bridge credentials from the explicit
// run environment first, then from ~/.ticksrc (the same file tk factory deploy
// writes). An absent bridge is not an error: local Telegram mode and the
// existing degraded ask behaviour remain valid.
func factoryOperatorChannel(project string) (*telegram.FactoryChannel, bool, error) {
	factoryURL := strings.TrimSpace(os.Getenv("TICKS_FACTORY_URL"))
	factoryToken := strings.TrimSpace(os.Getenv("TICKS_FACTORY_TOKEN"))
	if factoryURL == "" || factoryToken == "" {
		config, err := ticksrc.Load()
		if err != nil {
			return nil, false, err
		}
		if factoryURL == "" {
			factoryURL = config.Get(ticksrc.KeyFactoryURL)
		}
		if factoryToken == "" {
			factoryToken = config.Get(ticksrc.KeyFactoryToken)
		}
	}
	if factoryURL == "" || factoryToken == "" {
		return nil, false, nil
	}

	if project == "" {
		project = strings.TrimSpace(os.Getenv("TICKS_FACTORY_PROJECT"))
	}
	if project == "" {
		var err error
		project, err = github.DetectProject(nil)
		if err != nil {
			return nil, false, err
		}
	}
	channel, err := telegram.NewFactoryChannel(telegram.FactoryConfig{
		URL:     factoryURL,
		Token:   factoryToken,
		Project: project,
	})
	if err != nil {
		return nil, false, err
	}
	return channel, true, nil
}

// factoryOperatorEnvConfigured marks the sandbox-injected bridge as an
// explicit channel choice. A cloud checkout may contain the repository's
// non-secret operator mapping, but it cannot carry the local Telegram token;
// the RunRoom channel must win whenever the sandbox supplied its credentials.
func factoryOperatorEnvConfigured() bool {
	return strings.TrimSpace(os.Getenv("TICKS_FACTORY_URL")) != "" &&
		strings.TrimSpace(os.Getenv("TICKS_FACTORY_TOKEN")) != ""
}

// isFactoryChannel reports whether the given channel is the RunRoom-backed
// transport. Kept as a small capability helper so CLI paths do not need to
// know the transport's concrete type beyond its remote answer methods.
func isFactoryChannel(channel operator.Channel) (*telegram.FactoryChannel, bool) {
	remote, ok := channel.(*telegram.FactoryChannel)
	return remote, ok
}
