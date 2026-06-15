/**
 * Docs/quickstart page for ticks.sh
 * Covers both issue-tracker foundation and orchestration story.
 */

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

export const docsPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ticks quickstart — install, track issues, and orchestrate AI agent swarms in minutes.">
  <title>ticks — Quickstart Docs</title>
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

    /* Page layout */
    .page-hero {
      padding: 8rem 2rem 3rem;
      text-align: center;
      background: linear-gradient(180deg, var(--base) 0%, var(--crust) 100%);
      border-bottom: 1px solid var(--surface);
    }

    .page-hero .label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--green);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .page-hero h1 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }

    .page-hero p {
      font-size: 1.0625rem;
      color: var(--subtext);
      max-width: 540px;
      margin: 0 auto 1.5rem;
    }

    /* Content */
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 4rem 2rem 6rem;
    }

    /* Table of contents */
    .toc {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 3rem;
    }

    .toc-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--green);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 0.875rem;
    }

    .toc ol {
      list-style: none;
      counter-reset: toc;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .toc li {
      counter-increment: toc;
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
      font-size: 0.9375rem;
    }

    .toc li::before {
      content: counter(toc) ".";
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--overlay);
      min-width: 1.25rem;
    }

    .toc a {
      color: var(--subtext);
    }

    .toc a:hover { color: var(--green); }

    /* Sections */
    .doc-section {
      margin-bottom: 4rem;
    }

    .doc-section h2 {
      font-size: 1.375rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 1rem;
      padding-bottom: 0.625rem;
      border-bottom: 1px solid var(--surface);
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .doc-section h2 .section-num {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--green);
      background: rgba(166, 227, 161, 0.12);
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }

    .doc-section h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text);
      margin: 2rem 0 0.75rem;
    }

    .doc-section p {
      font-size: 0.9375rem;
      color: var(--subtext);
      margin-bottom: 1rem;
      line-height: 1.7;
    }

    .doc-section ul, .doc-section ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }

    .doc-section li {
      font-size: 0.9375rem;
      color: var(--subtext);
      margin-bottom: 0.4rem;
      line-height: 1.6;
    }

    /* Code */
    code {
      font-family: var(--font-mono);
      background: var(--surface);
      padding: 0.125rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8125rem;
      color: var(--green);
    }

    .code-block {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1rem 0 1.5rem;
      overflow-x: auto;
    }

    .code-block pre {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.8;
    }

    .code-block .comment { color: var(--overlay); }
    .code-block .cmd { color: var(--green); }
    .code-block .flag { color: var(--blue); }
    .code-block .str { color: var(--yellow); }
    .code-block .punct { color: var(--subtext); }

    /* Callout */
    .callout {
      background: rgba(166, 227, 161, 0.08);
      border: 1px solid rgba(166, 227, 161, 0.25);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin: 1.25rem 0;
      font-size: 0.9375rem;
      color: var(--subtext);
      line-height: 1.6;
    }

    .callout strong { color: var(--green); }

    /* Wave diagram */
    .wave-diagram {
      background: var(--base);
      border: 1px solid var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.25rem 0;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--subtext);
      line-height: 1.8;
      overflow-x: auto;
      white-space: pre;
    }

    .wave-diagram .hi { color: var(--green); }
    .wave-diagram .lo { color: var(--overlay); }

    /* CTA footer */
    .docs-cta {
      text-align: center;
      padding: 3rem 2rem 4rem;
      background: linear-gradient(180deg, var(--crust) 0%, var(--base) 50%, var(--crust) 100%);
      border-top: 1px solid var(--surface);
    }

    .docs-cta h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.75rem;
    }

    .docs-cta p {
      font-size: 1rem;
      color: var(--subtext);
      margin-bottom: 1.75rem;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--overlay);
      font-size: 0.875rem;
      border-top: 1px solid var(--surface);
    }

    footer p { margin-top: 0.5rem; }
    footer a { color: var(--subtext); }
    footer a:hover { color: var(--green); }

    /* Responsive */
    @media (max-width: 768px) {
      nav { padding: 1rem; }
      .nav-links { gap: 1rem; }
      .nav-links a:not(.btn) { display: none; }
      .page-hero { padding: 6rem 1.5rem 2.5rem; }
      .content { padding: 2.5rem 1.25rem 4rem; }
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

  <div class="page-hero">
    <p class="label">Quickstart</p>
    <h1>Get ticks running in minutes</h1>
    <p>From install to running your first agent swarm. Covers both the issue-tracker foundation and the orchestration workflow.</p>
    <a href="https://github.com/pengelbrecht/ticks#readme" class="btn btn-secondary" target="_blank">Full Reference on GitHub →</a>
  </div>

  <div class="content">

    <div class="toc">
      <div class="toc-title">On this page</div>
      <ol>
        <li><a href="#install">Install</a></li>
        <li><a href="#issue-tracker">Issue-Tracker Foundation</a></li>
        <li><a href="#orchestration">Orchestration: Running Agent Swarms</a></li>
        <li><a href="#board">Watching Progress</a></li>
      </ol>
    </div>

    <!-- Section 1: Install -->
    <div class="doc-section" id="install">
      <h2><span class="section-num">01</span> Install</h2>
      <p>ticks ships as a single Go binary with no runtime dependencies. Pick the method that fits your environment:</p>

      <h3>Homebrew (macOS / Linux)</h3>
      <div class="code-block"><pre><span class="cmd">brew</span> install pengelbrecht/tap/ticks</pre></div>

      <h3>Install script</h3>
      <div class="code-block"><pre><span class="cmd">curl</span> <span class="flag">-fsSL</span> https://ticks.sh/install <span class="punct">|</span> sh</pre></div>

      <p>Verify the install:</p>
      <div class="code-block"><pre><span class="cmd">tk</span> <span class="flag">--version</span></pre></div>
    </div>

    <!-- Section 2: Issue Tracker -->
    <div class="doc-section" id="issue-tracker">
      <h2><span class="section-num">02</span> Issue-Tracker Foundation</h2>
      <p>ticks stores issues as JSON files directly in your repository under <code>.tick/</code>. There is no external service to set up — just initialize and start tracking.</p>

      <h3>Initialize a repo</h3>
      <div class="code-block"><pre><span class="cmd">cd</span> my-project
<span class="cmd">tk</span> init          <span class="comment"># creates .tick/ — commit it to git</span></pre></div>

      <h3>Create and move issues</h3>
      <div class="code-block"><pre><span class="comment"># Create a new issue with a title</span>
<span class="cmd">tk</span> create <span class="str">"Fix login bug"</span>

<span class="comment"># List tasks that are ready to work on</span>
<span class="cmd">tk</span> ready

<span class="comment"># Pull the next ready issue onto your plate</span>
<span class="cmd">tk</span> next

<span class="comment"># List all open issues</span>
<span class="cmd">tk</span> ls</pre></div>

      <div class="callout">
        <strong>Git-native by design.</strong> Issues are plain JSON in <code>.tick/</code>. Branch per epic, merge as normal. Conflicts are rare because each issue is a separate file.
      </div>

      <h3>Common status transitions</h3>
      <ul>
        <li><code>tk create "Title"</code> — new issue in <em>backlog</em></li>
        <li><code>tk ready</code> — list tasks that are ready to work on</li>
        <li><code>tk next</code> — claim the top-priority ready issue (<em>in-progress</em>)</li>
        <li><code>tk close &lt;id&gt; --reason "..."</code> — close as completed</li>
        <li><code>tk block &lt;id&gt; &lt;blocker-id&gt;</code> — declare that &lt;id&gt; is blocked by &lt;blocker-id&gt;</li>
      </ul>

      <p>For the full command reference, see the <a href="https://github.com/pengelbrecht/ticks#readme" target="_blank">GitHub README</a>.</p>
    </div>

    <!-- Section 3: Orchestration -->
    <div class="doc-section" id="orchestration">
      <h2><span class="section-num">03</span> Orchestration: Running Agent Swarms</h2>
      <p>ticks shines when you have an epic — a collection of related ticks — and want multiple AI agents to work on them in parallel, each in its own isolated git worktree, then integrate wave by wave.</p>

      <h3>Plan an epic</h3>
      <p>Create a parent epic tick and break it down into child ticks with dependencies. The ticks skill (loaded automatically by Claude Code) can help you plan:</p>
      <div class="code-block"><pre><span class="comment"># Create parent epic</span>
<span class="cmd">tk</span> create <span class="str">"Redesign auth flow"</span> <span class="flag">--type</span> epic

<span class="comment"># Add child ticks that belong to the epic</span>
<span class="cmd">tk</span> create <span class="str">"Set up DB schema"</span> <span class="flag">--parent</span> <span class="str">&lt;epic-id&gt;</span></pre></div>

      <h3>Visualize the dependency graph</h3>
      <p>Before dispatching agents, print the wave structure so you can see which ticks can run in parallel and which must wait:</p>
      <div class="code-block"><pre><span class="cmd">tk</span> graph <span class="str">&lt;epic-id&gt;</span></pre></div>

      <p>Output example:</p>
      <div class="wave-diagram"><span class="hi">Wave 1 (parallel)</span>
<span class="lo">  abc  Set up DB schema</span>
<span class="lo">  def  Add auth middleware</span>

<span class="hi">Wave 2 (after Wave 1)</span>
<span class="lo">  ghi  Wire login endpoint       depends: abc, def</span>
<span class="lo">  jkl  Write integration tests   depends: abc</span>

<span class="hi">Wave 3 (after Wave 2)</span>
<span class="lo">  mno  Ship feature flag          depends: ghi, jkl</span></div>

      <h3>Dispatch one agent per wave</h3>
      <p>The ticks skill loaded in Claude Code handles this for you. For each wave, it spawns one Claude Code agent per tick, each working in an isolated git worktree so they cannot conflict:</p>
      <div class="code-block"><pre><span class="comment"># The ticks skill runs inside Claude Code — just tell it:</span>
<span class="comment"># "run the next wave of epic &lt;epic-id&gt;"</span>
<span class="comment">#</span>
<span class="comment"># Under the hood it does something equivalent to:</span>
<span class="cmd">git</span> worktree add ../.ticks-worktrees/abc tick/auth/abc
<span class="cmd">git</span> worktree add ../.ticks-worktrees/def tick/auth/def
<span class="comment"># ... one worktree per tick in the wave</span></pre></div>

      <div class="callout">
        <strong>Never use <code>tk run</code></strong> — that command was removed. Orchestration happens through the ticks skill inside Claude Code, not via a standalone CLI command.
      </div>

      <h3>Integrate wave by wave</h3>
      <p>After each wave completes, review and merge the worktrees in dependency order before proceeding to the next wave:</p>
      <div class="code-block"><pre><span class="comment"># Review each worktree's diff, run tests, then merge</span>
<span class="cmd">git</span> merge tick/auth/abc
<span class="cmd">git</span> merge tick/auth/def

<span class="comment"># Close ticks, then trigger Wave 2</span>
<span class="cmd">tk</span> close abc <span class="flag">--reason</span> <span class="str">"Completed: DB schema landed"</span>
<span class="cmd">tk</span> close def <span class="flag">--reason</span> <span class="str">"Completed: auth middleware landed"</span></pre></div>

      <p>The ticks skill tracks which waves have been integrated and what is still pending, so you can hand off and resume at any point without losing context.</p>

      <h3>Learning loop: retro → promote → reuse</h3>
      <p>When an epic closes, run a structured retro that harvests what worked and what broke, then promotes those learnings into <code>.tick/learnings.md</code> and any relevant repo docs. Every future planning pass and implementer reads this durable, version-controlled memory — so the same mistakes don't repeat across epics and the orchestration improves over time.</p>
    </div>

    <!-- Section 4: Board -->
    <div class="doc-section" id="board">
      <h2><span class="section-num">04</span> Watching Progress</h2>
      <p>Use the board to see all ticks move through their columns in real time while agents work.</p>

      <h3>Local board</h3>
      <div class="code-block"><pre><span class="cmd">tk</span> board         <span class="comment"># opens a TUI board in your terminal</span></pre></div>

      <h3>Cloud board (share with your team)</h3>
      <div class="code-block"><pre><span class="comment"># Sync the board to ticks.sh so anyone with access can watch</span>
<span class="cmd">tk</span> board <span class="flag">--cloud</span></pre></div>

      <p>Sign in at <a href="/login">ticks.sh/login</a> to create an account, generate an API token, and access your cloud board from any browser.</p>
    </div>

  </div>

  <div class="docs-cta">
    <h2>Ready to go deeper?</h2>
    <p>The GitHub README covers every command, config option, and advanced workflow.</p>
    <div class="cta-buttons">
      <a href="https://github.com/pengelbrecht/ticks#readme" class="btn btn-primary" target="_blank">Full Reference on GitHub</a>
      <a href="/login" class="btn btn-secondary">Sign in to ticks.sh</a>
    </div>
  </div>

  <footer>
    <a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 28" height="22"><defs><filter id="glow-f" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur2"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="32" y="14" font-family="ui-monospace, monospace" font-size="18" font-weight="600" fill="#A6E3A1" text-anchor="middle" dominant-baseline="central" filter="url(#glow-f)">tk_</text></svg></a>
    <p>The issue tracker your AI agents run on.</p>
    <p style="margin-top: 1rem;">
      <a href="https://github.com/pengelbrecht/ticks" target="_blank">GitHub</a> ·
      <a href="https://github.com/pengelbrecht/ticks#readme" target="_blank">Documentation</a> ·
      <a href="https://github.com/pengelbrecht/ticks/issues" target="_blank">Feedback</a>
    </p>
  </footer>
</body>
</html>`;
