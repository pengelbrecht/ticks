package paint

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// DefaultTTL is how long a painted badge survives without being repainted.
//
// It is deliberately short. The badge is a live status, so a stale one is
// worse than none: 90 seconds is long enough that the ordinary event stream
// (an agent changing status, a pane being focused) refreshes it well before it
// lapses, and short enough that an operator watching a dead run sees the
// badges drop within a minute rather than believing them.
const DefaultTTL = 90 * time.Second

// Separator joins the fields of a painted title. It is the herdr chrome's own
// separator, so a painted title reads like the rest of the UI.
const Separator = " · "

// UnknownStatus is the tracker status reported for a tick that could not be
// read — a manifest whose tick was deleted, or a repo whose `.tick/` is not
// readable. It is never silently blank: a badge that says "unknown" is honest,
// a badge with an empty status looks like a rendering bug.
const UnknownStatus = "unknown"

// Token names painted on both the pane and the workspace. herdr constrains
// them to `^[A-Za-z0-9_-]{1,32}$`, so they are upper-case and punctuation-free.
const (
	TokenTick   = "TICK"
	TokenRole   = "ROLE"
	TokenEpic   = "EPIC"
	TokenStatus = "STATUS"
)

// Options is one paint run.
type Options struct {
	// RepoRoot is the controller checkout: where `.tick/` and the run's
	// manifests live. Required.
	RepoRoot string
	// Manifests are the workers this run owns. Nothing outside this set is
	// ever painted.
	Manifests []state.Manifest
	// Source namespaces the metadata reports. Empty means
	// [client.SourceHerdPaint]; override it only in tests.
	Source string
	// TTL is how long a badge survives. Zero means [DefaultTTL].
	TTL time.Duration
	// Seq, when non-zero, orders this run's reports against its own
	// earlier ones. Zero omits `seq`, which makes every report apply — the
	// right default for a painter invoked from an event hook, where two
	// events can be in flight at once and neither is "later".
	Seq uint64
	// DryRun builds the badges and reports what WOULD be painted without
	// calling herdr. The plan is built by the same code either way.
	DryRun bool
}

// Badge is what one worker's workspace and pane are painted with, plus the
// evidence for why. A skipped badge still carries everything it would have
// painted, so `--json` explains the decision rather than just announcing it.
type Badge struct {
	// Tick, Epic and Role come from the manifest.
	Tick string `json:"tick"`
	Epic string `json:"epic,omitempty"`
	Role string `json:"role,omitempty"`
	// TickStatus is the tracker status read out of `.tick/`, or
	// [UnknownStatus].
	TickStatus string `json:"tick_status"`
	// AgentStatus is the live herdr agent status of the worker's pane,
	// empty when the pane is not in the session.
	AgentStatus string `json:"agent_status,omitempty"`

	// WorkspaceID and PaneID are the manifest's recorded targets.
	WorkspaceID string `json:"workspace_id,omitempty"`
	PaneID      string `json:"pane_id,omitempty"`

	// Title is the pane title: `<tick-id> · <role> · <status>`.
	Title string `json:"title"`
	// StateLabels is the label herdr shows while the pane is in the
	// worker's current agent status. Empty when the pane is not live.
	StateLabels map[string]string `json:"state_labels,omitempty"`
	// Tokens are the badge pairs, painted identically on pane and
	// workspace.
	Tokens map[string]string `json:"tokens"`

	// PaintedWorkspace and PaintedPane record what was actually reported.
	// Both are false under DryRun.
	PaintedWorkspace bool `json:"painted_workspace"`
	PaintedPane      bool `json:"painted_pane"`
	// Skipped is why nothing was painted, empty when something was.
	Skipped string `json:"skipped,omitempty"`
}

// Painted reports whether this badge reached herdr at all.
func (b Badge) Painted() bool { return b.PaintedWorkspace || b.PaintedPane }

// Result is the outcome of one paint run.
type Result struct {
	// Badges is one entry per manifest, sorted by tick id.
	Badges []Badge `json:"badges"`
	// Source and TTLMs are what the reports were sent with — the two
	// things an operator needs to reason about what they are seeing.
	Source string `json:"source"`
	TTLMs  uint64 `json:"ttl_ms"`
	// Painted and Skipped count the badges.
	Painted int `json:"painted"`
	Skipped int `json:"skipped"`
	// DryRun echoes whether anything was actually reported.
	DryRun bool `json:"dry_run"`
}

// herd is the slice of the herdr client this package needs. It is an
// interface so the paint decision can be tested without a socket; the live
// implementation is *client.Client.
type herd interface {
	SessionSnapshot(ctx context.Context) (*client.SessionSnapshot, error)
	PaneReportMetadata(ctx context.Context, params client.PaneReportMetadataParams) error
	WorkspaceReportMetadata(ctx context.Context, params client.WorkspaceReportMetadataParams) error
}

// Run paints every workspace this run owns and returns what it did.
//
// An error means the run could not be performed at all (herdr unreachable, no
// repo root). A worker whose workspace has gone away is a skipped badge, not
// an error — manifests routinely outlive their workspaces.
func Run(ctx context.Context, h herd, opts Options) (Result, error) {
	if strings.TrimSpace(opts.RepoRoot) == "" {
		return Result{}, fmt.Errorf("herd/paint: no repo root")
	}
	source := opts.Source
	if source == "" {
		source = client.SourceHerdPaint
	}
	ttl := opts.TTL
	if ttl <= 0 {
		ttl = DefaultTTL
	}

	res := Result{
		Source: source,
		TTLMs:  uint64(ttl / time.Millisecond),
		DryRun: opts.DryRun,
		Badges: []Badge{},
	}

	snap, err := h.SessionSnapshot(ctx)
	if err != nil {
		return res, fmt.Errorf("herd/paint: reading the herdr session: %w", err)
	}
	live := indexSession(snap)
	statuses := readTickStatuses(opts.RepoRoot, opts.Manifests)

	var seq *uint64
	if opts.Seq != 0 {
		seq = client.Ptr(opts.Seq)
	}

	for _, m := range opts.Manifests {
		b := badgeFor(m, statuses[m.Tick], live)
		if b.Skipped == "" && !opts.DryRun {
			if err := paintOne(ctx, h, &b, source, seq, ttl); err != nil {
				return res, err
			}
		}
		if b.Skipped != "" {
			res.Skipped++
		} else if opts.DryRun || b.Painted() {
			res.Painted++
		}
		res.Badges = append(res.Badges, b)
	}
	sort.Slice(res.Badges, func(i, j int) bool { return res.Badges[i].Tick < res.Badges[j].Tick })
	return res, nil
}

// paintOne reports one badge to herdr: the workspace tokens first, then the
// pane, so a failure halfway leaves the workspace decorated rather than a pane
// title with no matching workspace tokens.
func paintOne(ctx context.Context, h herd, b *Badge, source string, seq *uint64, ttl time.Duration) error {
	if b.WorkspaceID != "" {
		err := h.WorkspaceReportMetadata(ctx, client.WorkspaceReportMetadataParams{
			WorkspaceID: b.WorkspaceID,
			Source:      source,
			Tokens:      b.Tokens,
			Seq:         seq,
			TTL:         ttl,
		})
		if err != nil {
			return fmt.Errorf("herd/paint: painting workspace %s for tick %s: %w", b.WorkspaceID, b.Tick, err)
		}
		b.PaintedWorkspace = true
	}
	if b.PaneID != "" {
		err := h.PaneReportMetadata(ctx, client.PaneReportMetadataParams{
			PaneID:      b.PaneID,
			Source:      source,
			Title:       client.Ptr(b.Title),
			StateLabels: b.StateLabels,
			Tokens:      b.Tokens,
			Seq:         seq,
			TTL:         ttl,
		})
		if err != nil {
			return fmt.Errorf("herd/paint: painting pane %s for tick %s: %w", b.PaneID, b.Tick, err)
		}
		b.PaintedPane = true
	}
	return nil
}

// sessionIndex is the live session, reduced to the two questions paint asks:
// does this workspace still exist, and which workspace is this pane in.
type sessionIndex struct {
	workspaces  map[string]bool
	paneOwner   map[string]string
	paneStatus  map[string]string
	agentStatus map[string]string
}

// indexSession folds a snapshot into the lookups paint needs. Panes and agents
// are both consulted: herdr reports an agent-bearing pane in `agents`, and a
// snapshot need not repeat it in `panes`.
func indexSession(snap *client.SessionSnapshot) sessionIndex {
	idx := sessionIndex{
		workspaces:  map[string]bool{},
		paneOwner:   map[string]string{},
		paneStatus:  map[string]string{},
		agentStatus: map[string]string{},
	}
	if snap == nil {
		return idx
	}
	for _, w := range snap.Workspaces {
		idx.workspaces[w.WorkspaceID] = true
	}
	for _, p := range snap.Panes {
		idx.paneOwner[p.PaneID] = p.WorkspaceID
		idx.paneStatus[p.PaneID] = string(p.AgentStatus)
	}
	for _, a := range snap.Agents {
		idx.paneOwner[a.PaneID] = a.WorkspaceID
		idx.agentStatus[a.PaneID] = string(a.AgentStatus)
	}
	return idx
}

// statusOf reports a pane's live agent status, preferring the agent record —
// the pane entry's status is the same field, but the agent list is where herdr
// keeps it current for an agent-bearing pane.
func (idx sessionIndex) statusOf(paneID string) string {
	if s, ok := idx.agentStatus[paneID]; ok && s != "" {
		return s
	}
	return idx.paneStatus[paneID]
}

// badgeFor builds one worker's badge and decides whether it may be painted.
func badgeFor(m state.Manifest, tickStatus string, live sessionIndex) Badge {
	if tickStatus == "" {
		tickStatus = UnknownStatus
	}
	b := Badge{
		Tick:        m.Tick,
		Epic:        m.Epic,
		Role:        m.Role,
		TickStatus:  tickStatus,
		WorkspaceID: m.WorkspaceID,
		PaneID:      m.PaneID,
		Title:       Title(m.Tick, m.Role, tickStatus),
		Tokens:      tokensFor(m, tickStatus),
	}

	if b.WorkspaceID == "" {
		b.Skipped = "the manifest records no workspace"
		return b
	}
	// Ownership guard #2: the manifest says this run created the workspace,
	// and the session says it is still there. A workspace id that has been
	// recycled onto somebody else's window would fail the pane check below.
	if !live.workspaces[b.WorkspaceID] {
		b.Skipped = "workspace " + b.WorkspaceID + " is not in the herdr session (already cleaned up?)"
		b.PaneID = ""
		return b
	}

	// The pane is painted only when the session agrees it sits in the
	// workspace this run owns. Anything else is another window's pane.
	if b.PaneID != "" {
		owner, known := live.paneOwner[b.PaneID]
		switch {
		case !known:
			b.PaneID = ""
		case owner != b.WorkspaceID:
			b.PaneID = ""
		default:
			b.AgentStatus = live.statusOf(b.PaneID)
			if b.AgentStatus != "" {
				b.StateLabels = map[string]string{
					b.AgentStatus: m.Tick + " " + tickStatus,
				}
			}
		}
	}
	return b
}

// Title renders the painted pane title: `<tick-id> · <role> · <status>`.
// Empty fields are dropped rather than rendered as a gap, so a manifest with
// no role still produces a readable title.
func Title(tickID, role, status string) string {
	parts := make([]string, 0, 3)
	for _, p := range []string{tickID, role, status} {
		if p = strings.TrimSpace(p); p != "" {
			parts = append(parts, p)
		}
	}
	return strings.Join(parts, Separator)
}

// tokensFor is the badge pair set, painted identically on the pane and the
// workspace. Empty values are omitted: herdr renders a token with an empty
// value as a blank badge.
func tokensFor(m state.Manifest, tickStatus string) map[string]string {
	tokens := map[string]string{
		TokenTick:   m.Tick,
		TokenStatus: tickStatus,
	}
	if m.Role != "" {
		tokens[TokenRole] = m.Role
	}
	if m.Epic != "" {
		tokens[TokenEpic] = m.Epic
	}
	return tokens
}

// readTickStatuses reads the tracker status of every manifest's tick straight
// out of the `.tick/` store.
//
// It never shells out to `tk`: a painter runs from a herdr event hook, so it
// can fire many times a second, and a tick that cannot be read is a missing
// status rather than a failure. The store is opened once for the whole batch.
func readTickStatuses(repoRoot string, manifests []state.Manifest) map[string]string {
	out := make(map[string]string, len(manifests))
	if len(manifests) == 0 {
		return out
	}
	store := tick.NewStore(filepath.Join(repoRoot, ".tick"))
	for _, m := range manifests {
		if m.Tick == "" {
			continue
		}
		if _, seen := out[m.Tick]; seen {
			continue
		}
		t, err := store.Read(m.Tick)
		if err != nil {
			out[m.Tick] = UnknownStatus
			continue
		}
		if t.Status == "" {
			out[m.Tick] = UnknownStatus
			continue
		}
		out[m.Tick] = t.Status
	}
	return out
}
