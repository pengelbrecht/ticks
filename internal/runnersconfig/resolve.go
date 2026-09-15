package config

import (
	"errors"
	"fmt"
)

// ErrNoConfig is returned by [Config.Resolve] when there is no config to
// resolve against. Routing is a config-only concept: without
// `.tick/runners.toml` the adapter's own tier mapping applies and there is
// nothing here to answer with.
var ErrNoConfig = errors.New("herd/config: no .tick/runners.toml")

// Worker is the resolved routing for one role at one tier: the two explicit
// dimensions plus the escape hatch, with every inheritance step already
// applied.
//
// Empty Model or Effort means "the kind's own default" — the spawner emits no
// flag for them. Nil Args means the same for native args.
type Worker struct {
	// Role is the role that was asked for.
	Role string
	// ResolvedRole is the role the values came from. It differs from Role
	// only when Role had no entry and fell back to `implement`.
	ResolvedRole string
	// Tier is the tier that was asked for; "" when the caller named none.
	Tier Tier
	// TierApplied reports whether a `tiers.<Tier>` table actually contributed.
	// A tier the role does not define is not an error — it simply leaves the
	// role's own values in place.
	TierApplied bool

	Kind   string
	Model  string
	Effort Effort
	Args   []string
}

// Resolve applies runners-config.md's resolution order for a tick with role
// R and chosen tier T:
//
//  1. roles.R.tiers.T if present → for each of kind, model, effort, args
//     independently: the tier's value if it sets one, else the role's.
//  2. Otherwise roles.R.kind + roles.R.model + roles.R.effort + roles.R.args.
//  3. If role R has no entry, resolve against `implement` by the same two
//     steps.
//
// kind, model and effort are scalars and override field-wise: a tier that
// sets only effort = "high" keeps the role's kind and model. Args replace,
// they never merge — a tier's args supersede the role's wholesale, because
// merging two argv lists whose flags may conflict is not well-defined.
//
// tier may be "" for "no tier chosen". An unknown tier name is an error, not
// a silent no-op.
func (c *Config) Resolve(role string, tier Tier) (Worker, error) {
	if c == nil || len(c.Roles) == 0 {
		return Worker{}, ErrNoConfig
	}
	if tier != "" && !isKnownTier(string(tier)) {
		return Worker{}, fmt.Errorf("herd/config: unknown tier %q (want one of economy, balanced, strong, frontier)", string(tier))
	}

	resolved := role
	entry, ok := c.Roles[role]
	if !ok || entry == nil {
		resolved = RoleImplement
		entry, ok = c.Roles[RoleImplement]
		if !ok || entry == nil {
			return Worker{}, fmt.Errorf("herd/config: role %q has no entry and [roles.implement] is missing", role)
		}
	}

	w := Worker{
		Role:         role,
		ResolvedRole: resolved,
		Tier:         tier,
		Kind:         entry.Kind,
		Model:        entry.Model,
		Effort:       entry.Effort,
		Args:         entry.Args,
	}

	if tier != "" {
		if variant, ok := entry.Tiers[string(tier)]; ok && variant != nil {
			w.TierApplied = true
			if variant.Kind != "" {
				w.Kind = variant.Kind
			}
			if variant.Model != "" {
				w.Model = variant.Model
			}
			if variant.Effort != "" {
				w.Effort = variant.Effort
			}
			// Args REPLACE, never merge. Presence, not emptiness, is the
			// test: a tier that sets `args = []` deliberately clears the
			// role's args.
			if variant.Args != nil {
				w.Args = variant.Args
			}
		}
	}
	return w, nil
}

// Label names the cell the values actually came from, the way the fail-closed
// refusal messages do: `roles.implement.tiers.strong`, or `roles.review` when
// no tier table contributed. Pointing at the table the user must edit is the
// whole job of the label, so a requested-but-undefined tier is not named.
func (w Worker) Label() string {
	base := "roles." + w.ResolvedRole
	if !w.TierApplied {
		return base
	}
	return base + ".tiers." + string(w.Tier)
}
