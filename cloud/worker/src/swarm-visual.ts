// swarm-visual.ts — "See the swarm" hero orchestration visual.
//
// A single self-contained section string: markup + an inline <style> block +
// inline SVG. No imports, no external deps, no build step. A sibling tick
// imports `swarmSection` and places it on the landing page.
//
// Brand tokens are reused from landing.ts (green #a6e3a1 nodes, --surface/--base
// cards, Geist Mono labels, the existing feGaussianBlur "glow" filter pattern).
// Because this string is inlined into a page that already defines those CSS
// variables in :root, we only rely on them via var(..., <fallback>) so the
// module also renders correctly in isolation. All class names are prefixed
// `.swarm-` so they cannot collide with the host page.
//
// What it depicts (option B from roadmap §4.6), grounded in real `tk graph`
// semantics using the README's auth example shape — 5 ticks, 3 waves, max 2
// parallel, critical path = 3:
//
//   Wave 1 (ready now):  abc schema (P1) · def oauth (P2)          ← 2 parallel
//   Wave 2:              ghi user-model (P1, blocked_by abc)
//                        mno callback   (P2, blocked_by def)        ← 2 parallel
//   Wave 3:              jkl integration tests
//                          (P2, blocked_by ghi, after mno)
//
// Edges: blocked_by = solid arrow, after = dashed arrow.
//
// The timeline is pure CSS keyframes (no JS), loops forever, and pauses on a
// static fallback graph under `prefers-reduced-motion: reduce`.

export const swarmSection = `<section class="swarm" aria-labelledby="swarm-heading">
  <style>
    .swarm {
      --swarm-green: var(--green, #a6e3a1);
      --swarm-blue: var(--blue, #89dceb);
      --swarm-mauve: var(--mauve, #cba6f7);
      --swarm-peach: var(--peach, #fab387);
      --swarm-text: var(--text, #cdd6f4);
      --swarm-subtext: var(--subtext, #a6adc8);
      --swarm-overlay: var(--overlay, #6c7086);
      --swarm-surface: var(--surface, #313244);
      --swarm-base: var(--base, #1e1e2e);
      --swarm-crust: var(--crust, #11111b);
      --swarm-mono: var(--font-mono, 'Geist Mono', ui-monospace, monospace);
      /* One shared loop length keeps every track in phase. */
      --swarm-loop: 16s;

      padding: 5rem 1.5rem;
      background: linear-gradient(180deg, var(--swarm-crust) 0%, var(--swarm-base) 50%, var(--swarm-crust) 100%);
      color: var(--swarm-text);
      font-family: var(--swarm-mono);
    }
    .swarm-inner { max-width: 1040px; margin: 0 auto; }

    .swarm-eyebrow {
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--swarm-green);
      margin-bottom: 0.6rem;
    }
    .swarm-heading {
      font-size: clamp(1.6rem, 4vw, 2.3rem);
      font-weight: 600;
      color: var(--swarm-text);
      margin-bottom: 0.5rem;
    }
    .swarm-sub {
      font-size: 0.95rem;
      color: var(--swarm-subtext);
      max-width: 60ch;
      margin-bottom: 2rem;
    }

    .swarm-stats {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      padding: 0.6rem 1rem;
      margin-bottom: 1.75rem;
      border: 1px solid var(--swarm-surface);
      border-radius: 8px;
      background: var(--swarm-base);
      font-size: 0.82rem;
      color: var(--swarm-subtext);
    }
    .swarm-stats b { color: var(--swarm-text); font-weight: 600; }
    .swarm-stats .swarm-crit { color: var(--swarm-mauve); }

    /* Stage: SVG edges sit behind a CSS grid of node cards. */
    .swarm-stage { position: relative; }
    .swarm-edges {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    .swarm-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem 2.5rem;
      align-items: start;
    }
    .swarm-col { display: flex; flex-direction: column; gap: 1.25rem; }
    .swarm-col-head {
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--swarm-overlay);
      padding-bottom: 0.2rem;
      border-bottom: 1px dashed var(--swarm-surface);
    }
    .swarm-col-head .swarm-ready { color: var(--swarm-green); }

    /* ---- Node card ---- */
    .swarm-node {
      border: 1px solid var(--swarm-surface);
      border-radius: 10px;
      background: var(--swarm-base);
      padding: 0.7rem 0.8rem;
      transition: none;
    }
    .swarm-node-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
    }
    .swarm-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      flex: 0 0 auto;
      background: var(--swarm-overlay);
      box-shadow: none;
    }
    .swarm-id { color: var(--swarm-blue); font-size: 0.8rem; }
    .swarm-prio {
      margin-left: auto;
      font-size: 0.66rem;
      color: var(--swarm-overlay);
      border: 1px solid var(--swarm-surface);
      border-radius: 4px;
      padding: 0 0.3rem;
    }
    .swarm-title { font-size: 0.84rem; color: var(--swarm-text); }

    /* Agent lane: branch label + a worktree pulse, revealed when the tick runs. */
    .swarm-agent {
      margin-top: 0.55rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.7rem;
      color: var(--swarm-subtext);
      opacity: 0;
    }
    .swarm-agent .swarm-bot { filter: grayscale(1); }
    .swarm-branch {
      color: var(--swarm-peach);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .swarm-merged {
      margin-left: auto;
      font-size: 0.64rem;
      color: var(--swarm-green);
      opacity: 0;
    }

    /* ---- SVG edges ---- */
    .swarm-edge {
      fill: none;
      stroke: var(--swarm-overlay);
      stroke-width: 2;
    }
    .swarm-edge.swarm-after { stroke-dasharray: 6 5; }
    .swarm-arrow { fill: var(--swarm-overlay); }
    /* The bright "fill on merge" overlay is drawn on top and dashed in. */
    .swarm-edge-fill {
      fill: none;
      stroke: var(--swarm-green);
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-dasharray: 220;
      stroke-dashoffset: 220;
    }

    .swarm-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1.5rem;
      margin-top: 1.75rem;
      font-size: 0.72rem;
      color: var(--swarm-subtext);
    }
    .swarm-legend span { display: inline-flex; align-items: center; gap: 0.45rem; }
    .swarm-legend svg { flex: 0 0 auto; }

    /* ================= ANIMATION TIMELINE (pure CSS keyframes) =================
       One 16s loop, four phases:
         0-22%   Wave 1 ready + two agents spawn (abc, def)
         22-40%  Wave 1 merges green -> Wave 2 unblocks
         40-66%  Wave 2 two agents run (ghi, mno)
         66-82%  Wave 2 merges -> Wave 3 unblocks, jkl runs
         82-100% Wave 3 merges, brief hold, then loop
    ================================================================================ */

    /* A node "activates": dot glows green, border brightens. */
    @keyframes swarm-activate {
      0%, 100% { background: var(--swarm-overlay); box-shadow: none; }
      50%      { background: var(--swarm-green); box-shadow: 0 0 10px var(--swarm-green); }
    }
    @keyframes swarm-card-live {
      0%, 100% { border-color: var(--swarm-surface); }
      50%      { border-color: var(--swarm-green); }
    }
    @keyframes swarm-agent-run {
      0%, 100% { opacity: 0; transform: translateY(2px); }
      50%      { opacity: 1; transform: translateY(0); }
    }
    @keyframes swarm-bot-pulse {
      0%, 100% { filter: grayscale(1); opacity: 0.6; }
      50%      { filter: grayscale(0); opacity: 1; }
    }
    @keyframes swarm-merged-in {
      0%, 100% { opacity: 0; }
      50%      { opacity: 1; }
    }
    @keyframes swarm-edge-merge {
      0%, 100% { stroke-dashoffset: 220; opacity: 0; }
      50%      { stroke-dashoffset: 0; opacity: 1; }
    }

    /* --- per-wave timing via animation-delay against the shared loop ---
       Each wave runs the same keyframes; a per-wave delay slides that
       wave's "50% peak" into its slot. Negative delays start mid-cycle so
       the loop is seamless. */

    /* Wave 1 nodes (abc, def): peak ~ 11% of loop. */
    .swarm-w1 .swarm-dot {
      animation: swarm-activate var(--swarm-loop) ease-in-out infinite;
      animation-delay: -1.5s;
    }
    .swarm-w1.swarm-node {
      animation: swarm-card-live var(--swarm-loop) ease-in-out infinite;
      animation-delay: -1.5s;
    }
    .swarm-w1 .swarm-agent {
      animation: swarm-agent-run var(--swarm-loop) ease-in-out infinite;
      animation-delay: -1.5s;
    }
    .swarm-w1 .swarm-bot {
      animation: swarm-bot-pulse var(--swarm-loop) ease-in-out infinite;
      animation-delay: -1.5s;
    }

    /* Wave 2 nodes (ghi, mno): peak ~ 53% of loop. */
    .swarm-w2 .swarm-dot {
      animation: swarm-activate var(--swarm-loop) ease-in-out infinite;
      animation-delay: 6.5s;
    }
    .swarm-w2.swarm-node {
      animation: swarm-card-live var(--swarm-loop) ease-in-out infinite;
      animation-delay: 6.5s;
    }
    .swarm-w2 .swarm-agent {
      animation: swarm-agent-run var(--swarm-loop) ease-in-out infinite;
      animation-delay: 6.5s;
    }
    .swarm-w2 .swarm-bot {
      animation: swarm-bot-pulse var(--swarm-loop) ease-in-out infinite;
      animation-delay: 6.5s;
    }

    /* Wave 3 node (jkl): peak ~ 72% of loop. */
    .swarm-w3 .swarm-dot {
      animation: swarm-activate var(--swarm-loop) ease-in-out infinite;
      animation-delay: 11.5s;
    }
    .swarm-w3.swarm-node {
      animation: swarm-card-live var(--swarm-loop) ease-in-out infinite;
      animation-delay: 11.5s;
    }
    .swarm-w3 .swarm-agent {
      animation: swarm-agent-run var(--swarm-loop) ease-in-out infinite;
      animation-delay: 11.5s;
    }
    .swarm-w3 .swarm-bot {
      animation: swarm-bot-pulse var(--swarm-loop) ease-in-out infinite;
      animation-delay: 11.5s;
    }

    /* "merged" tags appear just after each wave's agents finish. */
    .swarm-w1 .swarm-merged {
      animation: swarm-merged-in var(--swarm-loop) ease-in-out infinite;
      animation-delay: 1.5s;
    }
    .swarm-w2 .swarm-merged {
      animation: swarm-merged-in var(--swarm-loop) ease-in-out infinite;
      animation-delay: 9.5s;
    }
    .swarm-w3 .swarm-merged {
      animation: swarm-merged-in var(--swarm-loop) ease-in-out infinite;
      animation-delay: 14s;
    }

    /* Edges fill green as their source wave merges, unblocking the next wave. */
    .swarm-fill-w1 {
      animation: swarm-edge-merge var(--swarm-loop) ease-in-out infinite;
      animation-delay: 1.5s;
    }
    .swarm-fill-w2 {
      animation: swarm-edge-merge var(--swarm-loop) ease-in-out infinite;
      animation-delay: 9.5s;
    }

    /* ================= REDUCED MOTION: static, fully-resolved graph ============ */
    @media (prefers-reduced-motion: reduce) {
      .swarm * { animation: none !important; }
      /* Show the completed state: every node green, every agent lane visible,
         every merge edge filled, every wave merged. */
      .swarm-dot { background: var(--swarm-green) !important; box-shadow: 0 0 6px var(--swarm-green); }
      .swarm-node { border-color: var(--swarm-green) !important; }
      .swarm-agent { opacity: 1 !important; transform: none !important; }
      .swarm-bot { filter: none !important; opacity: 1 !important; }
      .swarm-merged { opacity: 1 !important; }
      .swarm-edge-fill { stroke-dashoffset: 0 !important; opacity: 1 !important; }
    }
  </style>

  <div class="swarm-inner">
    <p class="swarm-eyebrow">See the swarm</p>
    <h2 id="swarm-heading" class="swarm-heading">A roadmap resolves into parallel agents</h2>
    <p class="swarm-sub">
      ticks reads the dependency graph, decomposes it into waves, and runs each ready
      tick as its own agent in an isolated git worktree. Waves merge back wave by wave,
      unblocking the next. This is real <code>tk graph</code> output — five ticks, three waves.
    </p>

    <div class="swarm-stats" role="img"
      aria-label="Epic: Implement auth. 5 ticks, 3 waves, max 2 parallel. Critical path 3 waves.">
      <span><b>Epic</b> Implement auth</span>
      <span><b>5</b> ticks</span>
      <span><b>3</b> waves</span>
      <span><b>max 2</b> parallel</span>
      <span class="swarm-crit"><b>critical path</b> · 3 waves</span>
    </div>

    <div class="swarm-stage">
      <!-- Edges live in an absolutely-positioned SVG behind the node grid.
           viewBox is a normalized 1000x520 space; columns are centred at
           x=170 / x=500 / x=830. Solid = blocked_by, dashed = after. -->
      <svg class="swarm-edges" viewBox="0 0 1000 520" preserveAspectRatio="none"
        aria-hidden="true" focusable="false">
        <defs>
          <filter id="swarm-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b2"/>
            <feMerge>
              <feMergeNode in="b1"/>
              <feMergeNode in="b2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="swarm-head" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path class="swarm-arrow" d="M0,0 L10,5 L0,10 z"/>
          </marker>
        </defs>

        <!-- blocked_by: abc(170,120) -> ghi(500,120) : solid -->
        <path class="swarm-edge" marker-end="url(#swarm-head)" d="M300,120 C390,120 410,120 500,120"/>
        <!-- blocked_by: def(170,360) -> mno(500,360) : solid -->
        <path class="swarm-edge" marker-end="url(#swarm-head)" d="M300,360 C390,360 410,360 500,360"/>
        <!-- blocked_by: ghi(500,120) -> jkl(830,240) : solid -->
        <path class="swarm-edge" marker-end="url(#swarm-head)" d="M630,120 C720,120 740,240 830,240"/>
        <!-- after: mno(500,360) -> jkl(830,240) : dashed -->
        <path class="swarm-edge swarm-after" marker-end="url(#swarm-head)" d="M630,360 C720,360 740,240 830,240"/>

        <!-- Bright "merge fill" overlays, dashed in as each wave merges. -->
        <path class="swarm-edge-fill swarm-fill-w1" filter="url(#swarm-glow)" d="M300,120 C390,120 410,120 500,120"/>
        <path class="swarm-edge-fill swarm-fill-w1" filter="url(#swarm-glow)" d="M300,360 C390,360 410,360 500,360"/>
        <path class="swarm-edge-fill swarm-fill-w2" filter="url(#swarm-glow)" d="M630,120 C720,120 740,240 830,240"/>
        <path class="swarm-edge-fill swarm-fill-w2" filter="url(#swarm-glow)" d="M630,360 C720,360 740,240 830,240"/>
      </svg>

      <div class="swarm-grid">
        <!-- WAVE 1 -->
        <div class="swarm-col">
          <div class="swarm-col-head">Wave 1 <span class="swarm-ready">(ready now)</span></div>
          <div class="swarm-node swarm-w1">
            <div class="swarm-node-top">
              <span class="swarm-dot"></span>
              <span class="swarm-id">abc</span>
              <span class="swarm-prio">P1</span>
            </div>
            <div class="swarm-title">Design database schema</div>
            <div class="swarm-agent">
              <span class="swarm-bot">🤖</span>
              <span class="swarm-branch">tick/auth/abc</span>
              <span class="swarm-merged">merged ✓</span>
            </div>
          </div>
          <div class="swarm-node swarm-w1">
            <div class="swarm-node-top">
              <span class="swarm-dot"></span>
              <span class="swarm-id">def</span>
              <span class="swarm-prio">P2</span>
            </div>
            <div class="swarm-title">Set up OAuth provider</div>
            <div class="swarm-agent">
              <span class="swarm-bot">🤖</span>
              <span class="swarm-branch">tick/auth/def</span>
              <span class="swarm-merged">merged ✓</span>
            </div>
          </div>
        </div>

        <!-- WAVE 2 -->
        <div class="swarm-col">
          <div class="swarm-col-head">Wave 2</div>
          <div class="swarm-node swarm-w2">
            <div class="swarm-node-top">
              <span class="swarm-dot"></span>
              <span class="swarm-id">ghi</span>
              <span class="swarm-prio">P1</span>
            </div>
            <div class="swarm-title">Implement user model</div>
            <div class="swarm-agent">
              <span class="swarm-bot">🤖</span>
              <span class="swarm-branch">tick/auth/ghi</span>
              <span class="swarm-merged">merged ✓</span>
            </div>
          </div>
          <div class="swarm-node swarm-w2">
            <div class="swarm-node-top">
              <span class="swarm-dot"></span>
              <span class="swarm-id">mno</span>
              <span class="swarm-prio">P2</span>
            </div>
            <div class="swarm-title">OAuth callback handler</div>
            <div class="swarm-agent">
              <span class="swarm-bot">🤖</span>
              <span class="swarm-branch">tick/auth/mno</span>
              <span class="swarm-merged">merged ✓</span>
            </div>
          </div>
        </div>

        <!-- WAVE 3 -->
        <div class="swarm-col">
          <div class="swarm-col-head">Wave 3</div>
          <div class="swarm-node swarm-w3">
            <div class="swarm-node-top">
              <span class="swarm-dot"></span>
              <span class="swarm-id">jkl</span>
              <span class="swarm-prio">P2</span>
            </div>
            <div class="swarm-title">Integration tests</div>
            <div class="swarm-agent">
              <span class="swarm-bot">🤖</span>
              <span class="swarm-branch">tick/auth/jkl</span>
              <span class="swarm-merged">merged ✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="swarm-legend">
      <span>
        <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
          <line x1="0" y1="5" x2="30" y2="5" stroke="var(--swarm-overlay)" stroke-width="2"/>
          <path d="M28,1 L34,5 L28,9 z" fill="var(--swarm-overlay)"/>
        </svg>
        <code>blocked_by</code> (hard dependency)
      </span>
      <span>
        <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
          <line x1="0" y1="5" x2="30" y2="5" stroke="var(--swarm-overlay)" stroke-width="2" stroke-dasharray="6 5"/>
          <path d="M28,1 L34,5 L28,9 z" fill="var(--swarm-overlay)"/>
        </svg>
        <code>after</code> (soft ordering)
      </span>
      <span>
        <span class="swarm-dot" style="background:var(--swarm-green);box-shadow:0 0 6px var(--swarm-green)"></span>
        merged &rarr; next wave unblocks
      </span>
    </div>
  </div>
</section>`;
