package tick

import (
	"fmt"
	"math/rand"
	"time"
)

const (
	base36Chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	minIDLength = 3
	maxIDLength = 4
	maxAttempts = 3
)

// IDGenerator produces random base36 tick IDs.
type IDGenerator struct {
	rng *rand.Rand
}

// NewIDGenerator returns a generator. If rng is nil, a time-based source is used.
func NewIDGenerator(rng *rand.Rand) *IDGenerator {
	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	return &IDGenerator{rng: rng}
}

// Generate returns a new ID, possibly bumping the length to 4 on collisions.
// The returned length indicates the ID length used.
func (g *IDGenerator) Generate(exists func(string) bool, length int) (string, int, error) {
	if length < minIDLength || length > maxIDLength {
		return "", length, fmt.Errorf("id_length must be %d-%d", minIDLength, maxIDLength)
	}

	currentLength := length
	for {
		for attempt := 0; attempt < maxAttempts; attempt++ {
			candidate := g.randomID(currentLength)
			if !exists(candidate) {
				return candidate, currentLength, nil
			}
		}

		if currentLength < maxIDLength {
			currentLength = maxIDLength
			continue
		}

		break
	}

	return "", currentLength, fmt.Errorf("unable to generate unique id after %d attempts", maxAttempts)
}

func (g *IDGenerator) randomID(length int) string {
	buf := make([]byte, length)
	for i := range buf {
		buf[i] = base36Chars[g.rng.Intn(len(base36Chars))]
	}
	return string(buf)
}
