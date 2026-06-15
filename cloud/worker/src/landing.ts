/**
 * Landing page and app UI for ticks.sh
 * Uses ticks brand guidelines: Geist fonts, Catppuccin Mocha, green primary
 */

import { swarmSection } from "./swarm-visual";

const sharedStyles = `
  @import url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/style.css');
  @import url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-mono/style.css');

  :root {
    --green: #a6e3a1;
    --red: #f38ba8;
    --yellow: #f9e2af;
    --blue: #89dceb;
    --peach: #fab387;
    --mauve: #cba6f7;
    --text: #cdd6f4;
    --subtext: #a6adc8;
    --overlay: #6c7086;
    --surface: #313244;
    --base: #1e1e2e;
    --mantle: #181825;
    --crust: #11111b;
    --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
    --font-mono: 'Geist Mono', ui-monospace, monospace;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font-sans);
    background: var(--crust);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  a { color: var(--green); text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

export const landingPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ticks — the issue tracker your AI agents run on. Fast, git-native task tracking built for AI agents — that also orchestrates them in parallel, wave by wave.">
  <title>ticks — The issue tracker your AI agents run on</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    ${sharedStyles}

    /* Nav */
    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      background: linear-gradient(180deg, var(--crust) 0%, transparent 100%);
    }

    .logo {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .logo:hover { text-decoration: none; }

    .logo svg { height: 28px; width: auto; }

    .nav-links {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .nav-links a {
      color: var(--subtext);
      font-size: 0.9375rem;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:hover { color: var(--green); text-decoration: none; }
    .nav-links .btn-primary { color: var(--crust); }
    .nav-links .btn-primary:hover { color: var(--crust); }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn:hover { text-decoration: none; transform: translateY(-1px); }

    .btn-primary {
      background: var(--green);
      color: var(--crust);
    }

    .btn-primary:hover { background: #b8e8b3; }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
    }

    .btn-secondary:hover { background: #3b3d50; }

    /* Hero */
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 6rem 2rem 4rem;
      position: relative;
      overflow: hidden;
      background: linear-gradient(180deg, var(--base) 0%, var(--crust) 100%);
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, rgba(166, 227, 161, 0.06) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-icon {
      margin-bottom: 2rem;
    }

    .hero h1 {
      font-family: var(--font-mono);
      font-size: clamp(3rem, 8vw, 5rem);
      font-weight: 600;
      color: var(--green);
      letter-spacing: -2px;
      text-shadow: 0 0 40px rgba(166, 227, 161, 0.4);
      margin-bottom: 1.5rem;
    }

    .hero-tagline {
      font-size: clamp(1.125rem, 3vw, 1.5rem);
      color: var(--subtext);
      max-width: 600px;
      margin-bottom: 0.75rem;
    }

    .hero-sub {
      font-size: 1rem;
      color: var(--overlay);
      margin-bottom: 2.5rem;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .hero-buttons .btn { padding: 0.875rem 1.75rem; font-size: 1rem; }

    .scroll-hint {
      position: absolute;
      bottom: 2.5rem;
      color: var(--overlay);
      font-size: 0.875rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* Differentiator strip (above the fold) */
    .differentiators {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 2.5rem;
      max-width: 920px;
    }

    .diff-chip {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      flex: 1 1 260px;
      max-width: 300px;
      text-align: left;
      background: rgba(30, 30, 46, 0.6);
      border: 1px solid var(--surface);
      border-radius: 10px;
      padding: 0.875rem 1rem;
    }

    .diff-chip .diff-icon {
      color: var(--green);
      font-size: 1rem;
      line-height: 1.5;
      flex-shrink: 0;
    }

    .diff-chip p {
      font-size: 0.8125rem;
      color: var(--subtext);
      line-height: 1.5;
    }

    .diff-chip p strong {
      color: var(--text);
      font-weight: 600;
    }

    /* Features */
    section {
      padding: 6rem 2rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    .section-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--green);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .section-title {
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 600;
      color: var(--text);
      margin-bottom: 3.5rem;
      max-width: 600px;
      line-height: 1.3;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .objection {
      background: var(--base);
      border: 1px solid var(--surface);
      border-left: 3px solid var(--green);
      border-radius: 12px;
      padding: 1.75rem 2rem;
      margin-bottom: 3.5rem;
    }

    .objection h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.625rem;
    }

    .objection p {
      font-size: 0.9375rem;
      color: var(--subtext);
      line-height: 1.65;
    }

    .objection p strong { color: var(--text); font-weight: 600; }
    .objection code {
      font-family: var(--font-mono);
      background: var(--surface);
      padding: 0.0625rem 0.375rem;
      border-radius: 4px;
      font-size: 0.8125rem;
      color: var(--green);
    }

    .pillar { margin-bottom: 3.5rem; }
    .pillar:last-child { margin-bottom: 0; }

    .pillar-label {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
    }

    .pillar-label .pillar-tag {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--green);
    }

    .feature-card {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 2rem;
      transition: border-color 0.2s;
    }

    .feature-card:hover { border-color: var(--green); }

    .feature-icon {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    .feature-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.75rem;
    }

    .feature-card p {
      font-size: 0.9375rem;
      color: var(--subtext);
      line-height: 1.6;
    }

    /* How it works */
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }

    .step {
      position: relative;
      padding-left: 3.5rem;
    }

    .step-number {
      position: absolute;
      left: 0;
      top: 0;
      width: 2.5rem;
      height: 2.5rem;
      background: var(--surface);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--green);
      font-size: 1rem;
    }

    .step h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .step p {
      font-size: 0.9375rem;
      color: var(--subtext);
    }

    .step code {
      font-family: var(--font-mono);
      background: var(--surface);
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8125rem;
      color: var(--green);
    }

    /* Code block */
    .code-block {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 3rem;
      overflow-x: auto;
    }

    .code-block pre {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.7;
    }

    .code-block .comment { color: var(--overlay); }
    .code-block .cmd { color: var(--green); }
    .code-block .flag { color: var(--blue); }

    /* CTA */
    .cta {
      text-align: center;
      padding: 6rem 2rem;
      background: linear-gradient(180deg, var(--crust) 0%, var(--base) 50%, var(--crust) 100%);
    }

    .cta h2 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 600;
      color: var(--text);
      margin-bottom: 1rem;
    }

    .cta p {
      font-size: 1.125rem;
      color: var(--subtext);
      margin-bottom: 2rem;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--overlay);
      font-size: 0.875rem;
      border-top: 1px solid var(--surface);
    }

    footer .logo {
      font-size: 1rem;
      margin-bottom: 1rem;
      display: inline-block;
    }

    footer p { margin-top: 0.5rem; }

    footer a { color: var(--subtext); }
    footer a:hover { color: var(--green); }

    /* Responsive */
    @media (max-width: 768px) {
      nav { padding: 1rem; }
      .nav-links { gap: 1rem; }
      .nav-links a:not(.btn) { display: none; }
      .hero { padding: 5rem 1.5rem 3rem; }
      section { padding: 4rem 1.5rem; }
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 28" height="28"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="32" y="14" font-family="ui-monospace, monospace" font-size="18" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">tk_</text></svg></a>
    <div class="nav-links">
      <a href="https://github.com/pengelbrecht/ticks" target="_blank">GitHub</a>
      <a href="/docs">Docs</a>
      <a href="/login" class="btn btn-primary">Sign In</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80">
        <defs>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="#1e1e2e"/>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#313244" stroke-width="2"/>
        <text x="32" y="32" font-family="ui-monospace, monospace" font-size="22" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">tk_</text>
      </svg>
    </div>
    <h1><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 50" height="80"><defs><filter id="glow-hero" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="70" y="25" font-family="ui-monospace, monospace" font-size="36" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow-hero)">ticks</text></svg></h1>
    <p class="hero-tagline">The issue tracker your AI agents run on.</p>
    <p class="hero-sub">Fast, git-native task tracking built for AI agents — that also orchestrates them. Plan a roadmap, run agents in parallel, ship wave by wave.</p>
    <div class="hero-buttons">
      <a href="/login" class="btn btn-primary">Get Started</a>
      <a href="https://github.com/pengelbrecht/ticks" class="btn btn-secondary" target="_blank">View on GitHub</a>
    </div>
    <div class="differentiators">
      <div class="diff-chip">
        <span class="diff-icon">◇</span>
        <p><strong>Right model for each job</strong> — frontier where it pays off, cheaper tiers for the rest. Stop paying premium rates to run one model on everything.</p>
      </div>
      <div class="diff-chip">
        <span class="diff-icon">◇</span>
        <p><strong>Many agents in parallel</strong>, each in its own auto-managed git worktree — no babysitting.</p>
      </div>
      <div class="diff-chip">
        <span class="diff-icon">◇</span>
        <p><strong>Your issues are JSON in your repo.</strong> No daemon, no database, no backend required — cloud sync is optional.</p>
      </div>
    </div>
    <span class="scroll-hint">↓</span>
  </header>

  ${swarmSection}

  <section id="features">
    <p class="section-label">Features</p>
    <h2 class="section-title">A great issue tracker for agents — that orchestrates them too</h2>

    <div class="objection">
      <h3>Why structured ticks, not a markdown checklist?</h3>
      <p>Because <strong>unstructured notes can't be orchestrated — structured ticks can.</strong> You can't compute parallel waves, a dependency graph, a critical path, or "what's ready and unblocked for me right now" from prose in a <code>TODO.md</code> or an agent's throwaway todo list — and two agents editing one markdown file collide. Structured ticks (status, priority, <code>blocked_by</code>/<code>after</code> edges, owners, acceptance, notes — each a JSON file) are exactly what make <code>tk graph</code>, waves, and cross-runner handoff possible.</p>
    </div>

    <div class="pillar">
      <h3 class="pillar-label"><span class="pillar-tag">Pillar 1</span> A great issue tracker for agents</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🧠</div>
          <h3>Persistent memory</h3>
          <p>Issues survive context compaction, session restarts, and switching between AI tools. Agents never lose the thread.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📁</div>
          <h3>Yours, in git — no backend required</h3>
          <p>One JSON file per issue, versioned with your code; a native merge driver resolves concurrent edits. No daemon, no database, no proprietary or cloud backend required. Your issues live in your repo and travel with it; cloud sync is optional and opt-in.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Lightning fast &amp; agent-native</h3>
          <p><code>tk ready</code> returns in ~35ms over 1000 issues; <code>tk next</code> and <code>--json</code> are designed for agents to parse.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">👥</div>
          <h3>Multiplayer by design</h3>
          <p>A team of humans and their agents share one repo without stepping on each other. Owner scoping keeps each agent on its own ticks, so concurrent work stays conflict-free.</p>
        </div>
      </div>
    </div>

    <div class="pillar">
      <h3 class="pillar-label"><span class="pillar-tag">Pillar 2</span> That orchestrates them</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🔀</div>
          <h3>Parallel, with managed worktrees</h3>
          <p><code>tk graph</code> computes dependency waves; the orchestrator runs one agent per ready tick in its own auto-created git worktree, keeps them from clobbering each other, and integrates wave by wave. Daemon-free, no worktree babysitting.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Right model for each job</h3>
          <p>Frontier-tier planning where it pays off, cheaper tiers for the wide parallel implementation work. Frontier-quality decomposition without paying premium rates on every edit — the direct answer to token fatigue.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🗺️</div>
          <h3>Roadmaps, ordering &amp; handoff</h3>
          <p>Chain epics with hard (<code>blocked_by</code>) and soft (<code>after</code>) edges; runner-neutral across Claude Code and Codex, with branches/worktrees/notes as the durable handoff format so any runner can resume any epic. Humans stay in the loop via approval/review/checkpoint gates.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📚</div>
          <h3>Gets smarter every epic</h3>
          <p>Every epic ends with a structured retro that promotes what was learned — what worked, what broke — into <code>.tick/learnings.md</code> and repo docs. Every future planning pass and implementer reads that memory, so the same mistakes don't repeat and orchestration improves over time.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="how-it-works">
    <p class="section-label">How It Works</p>
    <h2 class="section-title">From a goal to agents shipping in parallel</h2>
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <h3>Install</h3>
        <p>Single binary, no dependencies. Works on Mac, Linux, and Windows. <code>brew install pengelbrecht/tap/ticks</code> or <code>curl -fsSL https://ticks.sh/install | sh</code>.</p>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <h3>Plan</h3>
        <p>Run <code>tk init</code>, then break a goal into an epic with <code>tk create</code>. Chain dependencies with <code>--blocked-by</code> / <code>--after</code> so work orders itself.</p>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <h3>Orchestrate</h3>
        <p>Invoke the <strong>ticks skill</strong> in your agent (Claude Code or Codex). It reads <code>tk graph</code> and runs one agent per wave in isolated worktrees, integrating wave by wave. Use <code>tk board</code> (add <code>--cloud</code>) to watch.</p>
      </div>
    </div>

    <div class="code-block">
      <pre><span class="comment"># Install ticks (Homebrew)</span>
<span class="cmd">brew</span> install pengelbrecht/tap/ticks

<span class="comment"># Or via curl</span>
<span class="cmd">curl</span> <span class="flag">-fsSL</span> https://ticks.sh/install | sh

<span class="comment"># Initialize in your repo</span>
<span class="cmd">cd</span> my-project
<span class="cmd">tk</span> init

<span class="comment"># Plan an epic and chain dependencies</span>
<span class="cmd">tk</span> create <span class="flag">--type</span> feature <span class="str">"Add user authentication"</span>

<span class="comment"># Inspect the dependency graph and parallel waves</span>
<span class="cmd">tk</span> graph my-epic

<span class="comment"># Then invoke the ticks skill in your agent (Claude Code or Codex).</span>
<span class="comment"># It reads the graph and runs one agent per wave in isolated worktrees:</span>
<span class="cmd">tk</span> next <span class="flag">--epic</span>
<span class="cmd">tk</span> ready

<span class="comment"># Watch the board (add --cloud for sync)</span>
<span class="cmd">tk</span> board <span class="flag">--cloud</span></pre>
    </div>
  </section>

  <section class="cta">
    <h2>Ready to try ticks?</h2>
    <p>Free and open source. Set up in under a minute.</p>
    <div class="hero-buttons">
      <a href="/login" class="btn btn-primary">Create Account</a>
      <a href="/docs" class="btn btn-secondary">Read the Docs</a>
    </div>
  </section>

  <footer>
    <a href="/" class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 28" height="28"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="32" y="14" font-family="ui-monospace, monospace" font-size="18" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">tk_</text></svg></a>
    <p>The issue tracker your AI agents run on</p>
    <p style="margin-top: 1rem;">
      <a href="https://github.com/pengelbrecht/ticks" target="_blank">GitHub</a> ·
      <a href="/docs">Documentation</a> ·
      <a href="https://github.com/pengelbrecht/ticks/issues" target="_blank">Feedback</a>
    </p>
  </footer>
</body>
</html>`;

export const appPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ticks — Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    ${sharedStyles}

    /* App Layout */
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    header {
      background: var(--base);
      border-bottom: 1px solid var(--surface);
      padding: 0 2rem;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--green);
      font-size: 1.125rem;
      text-shadow: 0 0 20px rgba(166, 227, 161, 0.5);
      text-decoration: none;
    }

    .logo:hover { text-decoration: none; }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .user-email {
      font-size: 0.875rem;
      color: var(--subtext);
    }

    .logout-btn {
      font-size: 0.875rem;
      color: var(--overlay);
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: color 0.2s;
    }

    .logout-btn:hover { color: var(--red); }

    /* Main Content */
    main {
      flex: 1;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }

    /* Auth Card */
    .auth-container {
      min-height: calc(100vh - 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .auth-card {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
    }

    .auth-card h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .auth-subtitle {
      font-size: 0.9375rem;
      color: var(--subtext);
      text-align: center;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext);
      margin-bottom: 0.5rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--mantle);
      border: 1px solid var(--surface);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.9375rem;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--green);
      box-shadow: 0 0 0 3px rgba(166, 227, 161, 0.15);
    }

    .form-group input::placeholder { color: var(--overlay); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .btn:hover { transform: translateY(-1px); }

    .btn-primary {
      background: var(--green);
      color: var(--crust);
      width: 100%;
    }

    .btn-primary:hover { background: #b8e8b3; }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
    }

    .btn-secondary:hover { background: #3b3d50; }

    .auth-toggle {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--subtext);
    }

    .auth-toggle a {
      color: var(--green);
      cursor: pointer;
    }

    .error {
      padding: 0.875rem 1rem;
      margin-bottom: 1.25rem;
      background: rgba(243, 139, 168, 0.1);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 8px;
      color: var(--red);
      font-size: 0.875rem;
    }

    .hidden { display: none !important; }

    /* Dashboard */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
    }

    .card {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    /* Boards List */
    .boards-empty {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--subtext);
    }

    .boards-empty p {
      margin-bottom: 1rem;
    }

    .boards-empty code {
      display: block;
      background: var(--mantle);
      padding: 1rem;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--green);
      margin-top: 1rem;
    }

    .board-list {
      list-style: none;
    }

    .board-item {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--mantle);
      border: 1px solid var(--surface);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .board-item:hover {
      border-color: var(--green);
      background: var(--base);
    }

    .board-item:hover .board-remove { opacity: 1; }

    .board-status {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 1rem;
      flex-shrink: 0;
    }

    .board-status.online {
      background: var(--green);
      box-shadow: 0 0 8px rgba(166, 227, 161, 0.5);
    }

    .board-status.offline { background: var(--overlay); }

    .board-info { flex: 1; }

    .board-name {
      font-weight: 500;
      color: var(--text);
      font-size: 0.9375rem;
    }

    .board-meta {
      font-size: 0.8125rem;
      color: var(--overlay);
      margin-top: 0.25rem;
    }

    .board-remove {
      opacity: 0;
      color: var(--overlay);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.8125rem;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      transition: all 0.2s;
      font-family: inherit;
    }

    .board-remove:hover {
      color: var(--red);
      background: rgba(243, 139, 168, 0.1);
    }

    /* Tokens Section */
    .tokens-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .tokens-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    .token-list {
      margin-bottom: 1.25rem;
    }

    .token-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--mantle);
      border-radius: 6px;
      margin-bottom: 0.5rem;
    }

    .token-name {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--text);
    }

    .token-revoke {
      color: var(--overlay);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.8125rem;
      font-family: inherit;
      transition: color 0.2s;
    }

    .token-revoke:hover { color: var(--red); }

    .new-token-form {
      display: flex;
      gap: 0.75rem;
    }

    .new-token-form input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      background: var(--mantle);
      border: 1px solid var(--surface);
      border-radius: 6px;
      color: var(--text);
      font-size: 0.875rem;
      font-family: inherit;
    }

    .new-token-form input:focus {
      outline: none;
      border-color: var(--green);
    }

    .new-token-form input::placeholder { color: var(--overlay); }

    .new-token-form .btn {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
    }

    .token-created {
      background: rgba(166, 227, 161, 0.1);
      border: 1px solid rgba(166, 227, 161, 0.2);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
    }

    .token-created-label {
      font-size: 0.875rem;
      color: var(--green);
      margin-bottom: 0.5rem;
    }

    .token-created-value {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--text);
      background: var(--mantle);
      padding: 0.75rem;
      border-radius: 6px;
      word-break: break-all;
      user-select: all;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(17, 17, 27, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }

    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.75rem;
      max-width: 400px;
      width: 90%;
      transform: scale(0.95);
      transition: transform 0.2s;
    }

    .modal-overlay.active .modal {
      transform: scale(1);
    }

    .modal h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.75rem;
    }

    .modal p {
      font-size: 0.9375rem;
      color: var(--subtext);
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }

    .modal-buttons {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .modal-buttons .btn {
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
    }

    .btn-danger {
      background: var(--red);
      color: var(--crust);
    }

    .btn-danger:hover { background: #e57a96; }

    /* Responsive */
    @media (max-width: 600px) {
      header { padding: 0 1rem; }
      main { padding: 1.5rem 1rem; }
      .auth-card { padding: 2rem 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <a href="/" class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 28" height="28"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="32" y="14" font-family="ui-monospace, monospace" font-size="18" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow)">tk_</text></svg></a>
      <div class="header-right" id="header-user" style="display: none;">
        <span class="user-email" id="user-email"></span>
        <button class="logout-btn" onclick="logout()">Sign out</button>
      </div>
    </header>

    <!-- Auth Forms -->
    <div class="auth-container" id="auth-section">
      <div class="auth-card">
        <div id="login-form">
          <h1>Welcome back</h1>
          <p class="auth-subtitle">Sign in to access your boards</p>
          <div id="login-error" class="error hidden"></div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="login-email" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="Your password" required>
          </div>
          <button class="btn btn-primary" onclick="login()">Sign In</button>
          <div class="auth-toggle">Don't have an account? <a onclick="showSignup()">Create one</a></div>
        </div>

        <div id="signup-form" class="hidden">
          <h1>Create account</h1>
          <p class="auth-subtitle">Get started with ticks cloud sync</p>
          <div id="signup-error" class="error hidden"></div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="signup-email" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="signup-password" placeholder="Min 8 characters" required minlength="8">
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" id="signup-confirm" placeholder="Confirm your password" required>
          </div>
          <button class="btn btn-primary" onclick="signup()">Create Account</button>
          <div class="auth-toggle">Already have an account? <a onclick="showLogin()">Sign in</a></div>
        </div>
      </div>
    </div>

    <!-- Dashboard -->
    <main id="dashboard-section" class="hidden">
      <div class="card">
        <div class="section-header">
          <h2>Your Boards</h2>
        </div>
        <ul id="board-list" class="board-list"></ul>
        <div id="boards-empty" class="boards-empty hidden">
          <p>No boards connected yet.</p>
          <p style="font-size: 0.875rem; color: var(--overlay);">Create a token below, then run:</p>
          <code>TICKS_TOKEN=your-token tk board --cloud</code>
        </div>
      </div>

      <div class="card">
        <div class="tokens-header">
          <h3>API Tokens</h3>
        </div>
        <div id="token-created" class="token-created hidden">
          <div class="token-created-label">Token created! Copy now (won't be shown again):</div>
          <div class="token-created-value" id="token-created-value"></div>
        </div>
        <div id="token-list" class="token-list"></div>
        <div class="new-token-form">
          <input type="text" id="token-name" placeholder="Token name (e.g. laptop, ci)">
          <button class="btn btn-secondary" onclick="createToken()">Create</button>
        </div>
      </div>
    </main>

    <!-- Confirm Modal -->
    <div class="modal-overlay" id="confirm-modal">
      <div class="modal">
        <h3 id="confirm-title">Confirm</h3>
        <p id="confirm-message">Are you sure?</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-danger" id="confirm-btn">Confirm</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let token = localStorage.getItem('token');
    let userEmail = localStorage.getItem('userEmail');
    let confirmCallback = null;

    // Modal functions
    function showModal(title, message, buttonText, callback) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const confirmBtn = document.getElementById('confirm-btn');
      const cancelBtn = document.querySelector('.modal-buttons .btn-secondary');
      confirmBtn.textContent = buttonText || 'Confirm';
      confirmBtn.className = callback ? 'btn btn-danger' : 'btn btn-primary';
      cancelBtn.style.display = callback ? '' : 'none';
      confirmCallback = callback;
      document.getElementById('confirm-modal').classList.add('active');
    }

    function showAlert(title, message) {
      showModal(title, message, 'OK', null);
    }

    function closeModal() {
      document.getElementById('confirm-modal').classList.remove('active');
      confirmCallback = null;
    }

    function confirmAction() {
      if (confirmCallback) {
        confirmCallback();
      }
      closeModal();
    }

    document.getElementById('confirm-btn').onclick = confirmAction;
    document.getElementById('confirm-modal').onclick = function(e) {
      if (e.target === this) closeModal();
    };

    // Check auth on load
    if (token) {
      checkAuth();
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/boards', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) {
          showDashboard();
          // Use the response directly instead of calling loadBoards() again
          const data = await res.json();
          renderBoards(data.boards || []);
          loadTokens();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('userEmail');
          token = null;
          userEmail = null;
        }
      } catch (e) {
        console.error(e);
      }
    }

    function showLogin() {
      document.getElementById('login-form').classList.remove('hidden');
      document.getElementById('signup-form').classList.add('hidden');
    }

    function showSignup() {
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('signup-form').classList.remove('hidden');
    }

    let boardsPollInterval = null;

    function showDashboard() {
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('dashboard-section').classList.remove('hidden');
      document.getElementById('header-user').style.display = 'flex';
      if (userEmail) {
        document.getElementById('user-email').textContent = userEmail;
      }
      if (window.location.pathname !== '/app') {
        history.replaceState(null, '', '/app');
      }
      // Start polling for board updates every 5 seconds
      if (!boardsPollInterval) {
        boardsPollInterval = setInterval(loadBoards, 5000);
      }
    }

    function showAuth() {
      // Stop polling when leaving dashboard
      if (boardsPollInterval) {
        clearInterval(boardsPollInterval);
        boardsPollInterval = null;
      }
      document.getElementById('auth-section').classList.remove('hidden');
      document.getElementById('dashboard-section').classList.add('hidden');
      document.getElementById('header-user').style.display = 'none';
      if (window.location.pathname !== '/login') {
        history.replaceState(null, '', '/login');
      }
    }

    async function login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      errorEl.classList.add('hidden');

      const t0 = performance.now();
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const tResponse = performance.now();
        const data = await res.json();
        const tParsed = performance.now();

        // Parse Server-Timing header for server-side breakdown
        const serverTiming = res.headers.get('Server-Timing');
        let serverTotal = 0;
        if (serverTiming) {
          const match = serverTiming.match(/total;dur=([\\d.]+)/);
          if (match) serverTotal = parseFloat(match[1]);
        }

        const clientTotal = Math.round(tResponse - t0);
        const networkTime = serverTotal > 0 ? clientTotal - serverTotal : 'unknown';
        const parseTime = Math.round(tParsed - tResponse);

        console.log('[login timing]', {
          clientTotal: clientTotal + 'ms',
          serverTotal: serverTotal + 'ms',
          networkRoundTrip: networkTime + 'ms',
          jsonParse: parseTime + 'ms',
          serverBreakdown: data._timing || serverTiming
        });

        if (!res.ok) throw new Error(data.error || 'Login failed');

        token = data.token;
        userEmail = email;
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', userEmail);
        showDashboard();

        // Time the post-login API calls
        const tBoards = performance.now();
        loadBoards().then(() => console.log('[timing] loadBoards:', Math.round(performance.now() - tBoards) + 'ms'));
        const tTokens = performance.now();
        loadTokens().then(() => console.log('[timing] loadTokens:', Math.round(performance.now() - tTokens) + 'ms'));
      } catch (e) {
        console.log('[login timing] failed after', Math.round(performance.now() - t0) + 'ms');
        errorEl.textContent = e.message;
        errorEl.classList.remove('hidden');
      }
    }

    async function signup() {
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const errorEl = document.getElementById('signup-error');
      errorEl.classList.add('hidden');

      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.remove('hidden');
        return;
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        // Auto-login
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = password;
        await login();
      } catch (e) {
        errorEl.textContent = e.message;
        errorEl.classList.remove('hidden');
      }
    }

    function logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      token = null;
      userEmail = null;
      fetch('/api/auth/logout', { method: 'POST' });
      showAuth();
      showLogin();
    }

    function renderBoards(boards) {
      const list = document.getElementById('board-list');
      const empty = document.getElementById('boards-empty');

      if (!boards || boards.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }

      empty.classList.add('hidden');
      list.innerHTML = boards.map(b => \`
        <li class="board-item" onclick="openBoard('\${b.name}', \${b.online})">
          <span class="board-status \${b.online ? 'online' : 'offline'}"></span>
          <div class="board-info">
            <div class="board-name">\${b.name.replace(/%2F/gi, '/')}</div>
            <div class="board-meta">\${b.online ? 'Online' : 'Offline'}</div>
          </div>
          <button class="board-remove" onclick="event.stopPropagation(); removeBoard('\${b.id}', '\${b.name.replace(/%2F/gi, '/')}')">Remove</button>
        </li>
      \`).join('');
    }

    async function loadBoards() {
      try {
        const res = await fetch('/api/boards', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        renderBoards(data.boards || []);
      } catch (e) {
        console.error(e);
      }
    }

    function openBoard(name, online) {
      if (!online) {
        showAlert('Board Offline', 'This board is offline. Start it with: tk board --cloud');
        return;
      }
      window.location.href = '/p/' + encodeURIComponent(name) + '/';
    }

    async function loadTokens() {
      try {
        const res = await fetch('/api/tokens', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        const list = document.getElementById('token-list');

        const tokens = (data.tokens || []).filter(t => !t.revoked && !t.name.startsWith('session'));

        if (tokens.length === 0) {
          list.innerHTML = '<div style="color: var(--overlay); font-size: 0.875rem; padding: 0.5rem 0;">No API tokens yet. Create one to use cloud sync.</div>';
          return;
        }

        list.innerHTML = tokens.map(t => \`
          <div class="token-item">
            <span class="token-name">\${t.name}</span>
            <button class="token-revoke" onclick="revokeToken('\${t.id}')">Revoke</button>
          </div>
        \`).join('');
      } catch (e) {
        console.error(e);
      }
    }

    async function createToken() {
      const nameInput = document.getElementById('token-name');
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }

      try {
        const res = await fetch('/api/tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create token');

        nameInput.value = '';
        document.getElementById('token-created-value').textContent = data.token;
        document.getElementById('token-created').classList.remove('hidden');
        loadTokens();
      } catch (e) {
        showAlert('Error', e.message);
      }
    }

    function revokeToken(id) {
      showModal(
        'Revoke Token',
        'Are you sure you want to revoke this token? Any clients using it will be disconnected.',
        'Revoke',
        async () => {
          try {
            await fetch('/api/tokens/' + id, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + token }
            });
            loadTokens();
          } catch (e) {
            console.error(e);
          }
        }
      );
    }

    function removeBoard(id, displayName) {
      showModal(
        'Remove Board',
        'Remove "' + displayName + '" from your dashboard? The board can reconnect later.',
        'Remove',
        async () => {
          try {
            const res = await fetch('/api/boards/' + id, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + token }
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Failed to remove board');
            }
            loadBoards();
          } catch (e) {
            console.error(e);
          }
        }
      );
    }

    // Handle enter key
    document.getElementById('login-password').addEventListener('keypress', e => {
      if (e.key === 'Enter') login();
    });
    document.getElementById('signup-confirm').addEventListener('keypress', e => {
      if (e.key === 'Enter') signup();
    });
    document.getElementById('token-name').addEventListener('keypress', e => {
      if (e.key === 'Enter') createToken();
    });
  </script>
</body>
</html>`;
