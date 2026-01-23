import{i as h,n as l,a as u,b as n,t as m,e as U,r as v}from"./ticks-logo-DYgrblNn.js";var G=Object.defineProperty,F=Object.getOwnPropertyDescriptor,d=(e,t,s,i)=>{for(var o=i>1?void 0:i?F(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&G(t,s,o),o};let c=class extends u{constructor(){super(...arguments),this.label="",this.placeholder="",this.type="text",this.value="",this.name="",this.size="medium",this.disabled=!1,this.required=!1,this.error=!1,this.errorMessage=""}handleInput(e){const t=e.target;this.value=t.value,this.dispatchEvent(new CustomEvent("input",{detail:{value:this.value},bubbles:!0,composed:!0}))}handleChange(e){const t=e.target;this.value=t.value,this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}render(){return n`
      <div class="wrapper" part="base">
        ${this.label?n`<label part="label">${this.label}</label>`:""}
        <div class="input-wrapper">
          <input
            part="input"
            type=${this.type}
            name=${this.name}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            minlength=${this.minlength??""}
            maxlength=${this.maxlength??""}
            @input=${this.handleInput}
            @change=${this.handleChange}
          />
          ${this.error&&this.errorMessage?n`<div class="error-message">${this.errorMessage}</div>`:""}
        </div>
      </div>
    `}};c.styles=h`
    :host {
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    input {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      margin: 0;
      background-color: var(--surface, #313244);
      border: 1px solid var(--overlay, #6c7086);
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.9375rem;
      color: var(--text, #cdd6f4);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    }

    input::placeholder {
      color: var(--overlay, #6c7086);
    }

    /* Override browser autofill styles */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px var(--surface, #313244) inset !important;
      -webkit-text-fill-color: var(--text, #cdd6f4) !important;
      caret-color: var(--text, #cdd6f4);
    }

    input:hover:not(:disabled) {
      border-color: var(--subtext, #a6adc8);
    }

    input:focus {
      border-color: var(--green, #a6e3a1);
      box-shadow: 0 0 0 2px rgba(166, 227, 161, 0.2);
    }

    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--surface, #313244);
    }

    /* Error state */
    :host([error]) input {
      border-color: var(--red, #f38ba8);
    }

    :host([error]) input:focus {
      border-color: var(--red, #f38ba8);
      box-shadow: 0 0 0 2px rgba(243, 139, 168, 0.2);
    }

    .error-message {
      position: absolute;
      top: 100%;
      left: 0;
      font-size: 0.75rem;
      color: var(--red, #f38ba8);
      margin-top: 0.25rem;
    }

    .input-wrapper {
      position: relative;
    }

    /* Sizes */
    :host([size="small"]) input {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }

    :host([size="large"]) input {
      padding: 1rem 1.25rem;
      font-size: 1rem;
    }
  `;d([l({type:String})],c.prototype,"label",2);d([l({type:String})],c.prototype,"placeholder",2);d([l({type:String})],c.prototype,"type",2);d([l({type:String})],c.prototype,"value",2);d([l({type:String})],c.prototype,"name",2);d([l({type:String,reflect:!0})],c.prototype,"size",2);d([l({type:Boolean})],c.prototype,"disabled",2);d([l({type:Boolean})],c.prototype,"required",2);d([l({type:Boolean,reflect:!0})],c.prototype,"error",2);d([l({type:String})],c.prototype,"errorMessage",2);d([l({type:Number})],c.prototype,"minlength",2);d([l({type:Number})],c.prototype,"maxlength",2);c=d([m("ticks-input")],c);var K=Object.defineProperty,H=Object.getOwnPropertyDescriptor,E=(e,t,s,i)=>{for(var o=i>1?void 0:i?H(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&K(t,s,o),o};let g=class extends u{constructor(){super(...arguments),this.variant="neutral",this.dot=!1,this.pill=!1}render(){return n`
      <span class="badge ${this.variant} ${this.pill?"pill":""}">
        ${this.dot?n`<span class="dot"></span>`:""}
        <slot></slot>
      </span>
    `}};g.styles=h`
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
    }

    /* Variants */
    .badge.green {
      background: rgba(166, 227, 161, 0.15);
      color: var(--green, #a6e3a1);
    }

    .badge.red {
      background: rgba(243, 139, 168, 0.15);
      color: var(--red, #f38ba8);
    }

    .badge.yellow {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
    }

    .badge.blue {
      background: rgba(137, 220, 235, 0.15);
      color: var(--blue, #89dceb);
    }

    .badge.peach {
      background: rgba(250, 179, 135, 0.15);
      color: var(--peach, #fab387);
    }

    .badge.mauve {
      background: rgba(203, 166, 247, 0.15);
      color: var(--mauve, #cba6f7);
    }

    .badge.neutral {
      background: var(--surface, #313244);
      color: var(--subtext, #a6adc8);
    }

    /* Dot indicator */
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Pill style */
    .badge.pill {
      border-radius: 999px;
      padding: 0.25rem 0.625rem;
    }
  `;E([l({type:String})],g.prototype,"variant",2);E([l({type:Boolean})],g.prototype,"dot",2);E([l({type:Boolean})],g.prototype,"pill",2);g=E([m("ticks-badge")],g);var J=Object.defineProperty,Y=Object.getOwnPropertyDescriptor,P=(e,t,s,i)=>{for(var o=i>1?void 0:i?Y(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&J(t,s,o),o};let x=class extends u{constructor(){super(...arguments),this.interactive=!1,this.bordered=!1}render(){return n`
      <div class="card ${this.interactive?"interactive":""} ${this.bordered?"bordered":""}">
        <div class="header">
          <slot name="header"></slot>
        </div>
        <div class="content">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `}};x.styles=h`
    :host {
      display: block;
    }

    .card {
      background: var(--surface, #313244);
      border-radius: 8px;
      overflow: hidden;
    }

    .card.interactive {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .card.interactive:hover {
      background: var(--overlay, #6c7086);
      transform: translateY(-1px);
    }

    .card.bordered {
      border: 1px solid var(--overlay, #6c7086);
    }

    .header {
      padding: 1rem;
      border-bottom: 1px solid var(--overlay, #6c7086);
    }

    .content {
      padding: 1rem;
    }

    .footer {
      padding: 1rem;
      border-top: 1px solid var(--overlay, #6c7086);
    }

    /* Remove padding if empty */
    .header:empty,
    .footer:empty {
      display: none;
    }
  `;P([l({type:Boolean})],x.prototype,"interactive",2);P([l({type:Boolean})],x.prototype,"bordered",2);x=P([m("ticks-card")],x);var V=Object.defineProperty,Q=Object.getOwnPropertyDescriptor,R=(e,t,s,i)=>{for(var o=i>1?void 0:i?Q(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&V(t,s,o),o};let C=class extends u{constructor(){super(...arguments),this.size="medium"}render(){return n`
      <div
        class="spinner ${this.size}"
        role="status"
        aria-label="Loading"
      ></div>
    `}};C.styles=h`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      display: inline-block;
      border-radius: 50%;
      border-style: solid;
      border-color: var(--green, #a6e3a1);
      border-top-color: transparent;
      animation: spin 0.8s linear infinite;
    }

    /* Sizes */
    .spinner.small {
      width: 1rem;
      height: 1rem;
      border-width: 2px;
    }

    .spinner.medium {
      width: 1.5rem;
      height: 1.5rem;
      border-width: 2px;
    }

    .spinner.large {
      width: 2.5rem;
      height: 2.5rem;
      border-width: 3px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;R([l({type:String})],C.prototype,"size",2);C=R([m("ticks-spinner")],C);var W=Object.defineProperty,X=Object.getOwnPropertyDescriptor,$=(e,t,s,i)=>{for(var o=i>1?void 0:i?X(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&W(t,s,o),o};let b=class extends u{constructor(){super(...arguments),this.open=!1,this.closeOnBackdrop=!0,this.closeOnEscape=!0,this.previousActiveElement=null}connectedCallback(){super.connectedCallback(),this.handleKeyDown=this.handleKeyDown.bind(this)}updated(e){e.has("open")&&(this.open?(this.previousActiveElement=document.activeElement,document.addEventListener("keydown",this.handleKeyDown),this.updateComplete.then(()=>{this.trapFocus()})):(document.removeEventListener("keydown",this.handleKeyDown),this.previousActiveElement instanceof HTMLElement&&this.previousActiveElement.focus()))}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.handleKeyDown)}handleKeyDown(e){e.key==="Escape"&&this.closeOnEscape?this.close():e.key==="Tab"&&this.handleTab(e)}handleBackdropClick(e){this.closeOnBackdrop&&e.target===e.currentTarget&&this.close()}close(){this.open=!1,this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}trapFocus(){const e=this.getFocusableElements();e.length>0&&e[0].focus()}getFocusableElements(){return this.shadowRoot.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')}handleTab(e){const t=Array.from(this.getFocusableElements());if(t.length===0)return;const s=t[0],i=t[t.length-1];e.shiftKey&&document.activeElement===s?(e.preventDefault(),i.focus()):!e.shiftKey&&document.activeElement===i&&(e.preventDefault(),s.focus())}render(){return n`
      <div
        class="backdrop ${this.open?"open":""}"
        @click=${this.handleBackdropClick}
      ></div>
      <div
        class="dialog ${this.open?"open":""}"
        role="dialog"
        aria-modal="true"
      >
        <div class="header">
          <h2 class="title"><slot name="title">Dialog</slot></h2>
          <button class="close-btn" @click=${this.close} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="content">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `}};b.styles=h`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .backdrop.open {
      opacity: 1;
      visibility: visible;
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      z-index: 1001;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface, #313244);
      border-radius: 8px;
      min-width: 320px;
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .dialog.open {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--surface, #313244);
    }

    .title {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--subtext, #a6adc8);
      opacity: 0.7;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .close-btn:hover {
      opacity: 1;
      background: var(--surface, #313244);
    }

    .close-btn svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .content {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      color: var(--text, #cdd6f4);
      line-height: 1.5;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--surface, #313244);
    }

    .footer:empty {
      display: none;
    }
  `;$([l({type:Boolean,reflect:!0})],b.prototype,"open",2);$([l({type:Boolean})],b.prototype,"closeOnBackdrop",2);$([l({type:Boolean})],b.prototype,"closeOnEscape",2);$([U(".dialog")],b.prototype,"dialogEl",2);b=$([m("ticks-dialog")],b);var Z=Object.getOwnPropertyDescriptor,ee=(e,t,s,i)=>{for(var o=i>1?void 0:i?Z(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=a(o)||o);return o};let O=class extends u{renderDefaultIcon(){return n`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
    `}render(){return n`
      <div class="empty-state">
        <div class="icon">
          <slot name="icon">${this.renderDefaultIcon()}</slot>
        </div>
        <h3 class="title">
          <slot name="title">No items found</slot>
        </h3>
        <p class="description">
          <slot name="description">There's nothing to display here yet.</slot>
        </p>
        <div class="action">
          <slot name="action"></slot>
        </div>
      </div>
    `}};O.styles=h`
    :host {
      display: block;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 2rem;
      background: var(--surface, #313244);
      border-radius: 8px;
    }

    .icon {
      margin-bottom: 1rem;
      color: var(--overlay, #6c7086);
    }

    .icon ::slotted(*) {
      width: 3rem;
      height: 3rem;
    }

    .icon svg {
      width: 3rem;
      height: 3rem;
    }

    .title {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
      margin: 0 0 0.5rem 0;
    }

    .description {
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      color: var(--subtext, #a6adc8);
      margin: 0;
      max-width: 300px;
      line-height: 1.5;
    }

    .action {
      margin-top: 1.5rem;
    }
  `;O=ee([m("ticks-empty-state")],O);var te=Object.defineProperty,oe=Object.getOwnPropertyDescriptor,I=(e,t,s,i)=>{for(var o=i>1?void 0:i?oe(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&te(t,s,o),o};let T=class extends u{constructor(){super(...arguments),this.interactive=!1}handleClick(e){this.interactive&&this.dispatchEvent(new CustomEvent("click",{detail:{originalEvent:e},bubbles:!0,composed:!0}))}render(){return n`
      <div
        class="list-item ${this.interactive?"interactive":""}"
        @click=${this.handleClick}
        role=${this.interactive?"button":"listitem"}
        tabindex=${this.interactive?"0":"-1"}
      >
        <div class="status">
          <slot name="status"></slot>
        </div>
        <div class="content">
          <p class="title"><slot name="title"></slot></p>
          <p class="subtitle"><slot name="subtitle"></slot></p>
        </div>
        <div class="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `}};T.styles=h`
    :host {
      display: block;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--surface, #313244);
      border-radius: 8px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
    }

    .list-item.interactive {
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
    }

    .list-item.interactive:hover {
      background: var(--overlay, #45475a);
    }

    .list-item.interactive:active {
      transform: scale(0.995);
    }

    .status {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .title {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtitle {
      font-size: 0.75rem;
      color: var(--subtext, #a6adc8);
      margin: 0.25rem 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `;I([l({type:Boolean})],T.prototype,"interactive",2);T=I([m("ticks-list-item")],T);var ie=Object.defineProperty,se=Object.getOwnPropertyDescriptor,N=(e,t,s,i)=>{for(var o=i>1?void 0:i?se(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&ie(t,s,o),o};let D=class extends u{constructor(){super(...arguments),this.sticky=!1}render(){return n`
      <header>
        <div class="logo">
          <slot name="logo"></slot>
        </div>
        <div class="nav">
          <slot name="nav"></slot>
        </div>
        <div class="user">
          <slot name="user"></slot>
        </div>
      </header>
    `}};D.styles=h`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: var(--crust, #11111b);
      border-bottom: 1px solid var(--surface, #313244);
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
    }

    :host([sticky]) header {
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      header {
        padding: 0.75rem 1rem;
      }

      .nav {
        display: none;
      }
    }
  `;N([l({type:Boolean,reflect:!0})],D.prototype,"sticky",2);D=N([m("ticks-header")],D);var re=Object.defineProperty,ae=Object.getOwnPropertyDescriptor,S=(e,t,s,i)=>{for(var o=i>1?void 0:i?ae(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&re(t,s,o),o};let y=class extends u{constructor(){super(...arguments),this.block=!1,this.copyable=!1,this.copied=!1}async handleCopy(){var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("slot"),s=((e==null?void 0:e.assignedNodes({flatten:!0}))||[]).map(o=>o.textContent).join("").trim();try{await navigator.clipboard.writeText(s),this.copied=!0,setTimeout(()=>{this.copied=!1},2e3)}catch(o){console.error("Failed to copy:",o)}}render(){return this.block?n`
        <div class="code-block">
          <pre><code><slot></slot></code></pre>
          ${this.copyable?n`
            <button
              class="copy-btn ${this.copied?"copied":""}"
              @click=${this.handleCopy}
              aria-label="${this.copied?"Copied!":"Copy code"}"
            >
              ${this.copied?n`
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              `:n`
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              `}
            </button>
          `:""}
        </div>
      `:n`<code><slot></slot></code>`}};y.styles=h`
    :host {
      display: inline;
    }

    :host([block]) {
      display: block;
    }

    /* Inline code */
    code {
      font-family: var(--font-mono, 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace);
      font-size: 0.875em;
      background: var(--surface, #313244);
      color: var(--green, #a6e3a1);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    /* Block code */
    .code-block {
      position: relative;
      background: var(--mantle, #181825);
      border-radius: 6px;
      overflow: hidden;
    }

    .code-block pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
    }

    .code-block code {
      display: block;
      background: none;
      padding: 0;
      font-size: 0.8125rem;
      line-height: 1.6;
      color: var(--subtext, #a6adc8);
    }

    .copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: var(--surface, #313244);
      border: none;
      border-radius: 4px;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext, #a6adc8);
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .code-block:hover .copy-btn {
      opacity: 1;
    }

    .copy-btn:hover {
      background: var(--overlay, #6c7086);
    }

    .copy-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .copy-btn.copied {
      color: var(--green, #a6e3a1);
    }
  `;S([l({type:Boolean,reflect:!0})],y.prototype,"block",2);S([l({type:Boolean})],y.prototype,"copyable",2);S([v()],y.prototype,"copied",2);y=S([m("ticks-code")],y);var ne=Object.defineProperty,le=Object.getOwnPropertyDescriptor,f=(e,t,s,i)=>{for(var o=i>1?void 0:i?le(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&ne(t,s,o),o};let p=class extends u{constructor(){super(...arguments),this.authState="loading",this.authTab="login",this.authError="",this.userEmail="",this.boards=[],this.tokens=[],this.newToken="",this.showCreateToken=!1,this.confirmDialog={open:!1,title:"",message:"",action:null},this.token=""}connectedCallback(){super.connectedCallback(),this.token=localStorage.getItem("token")||"",this.userEmail=localStorage.getItem("userEmail")||"",this.token?this.checkAuth():(this.authState="unauthenticated",this.updateUrl())}updateUrl(){const e=this.authState==="authenticated"?"/app":"/login";window.location.pathname!==e&&history.replaceState(null,"",e)}async checkAuth(){try{const e=await fetch("/api/boards",{headers:{Authorization:`Bearer ${this.token}`}});if(e.ok){const t=await e.json();this.boards=t.boards||[],this.authState="authenticated",this.loadTokens()}else this.clearAuth()}catch(e){console.error("Auth check failed:",e),this.clearAuth()}this.updateUrl()}clearAuth(){localStorage.removeItem("token"),localStorage.removeItem("userEmail"),this.token="",this.userEmail="",this.authState="unauthenticated"}async loadBoards(){try{const e=await fetch("/api/boards",{headers:{Authorization:`Bearer ${this.token}`}});if(e.ok){const t=await e.json();this.boards=t.boards||[]}}catch(e){console.error("Failed to load boards:",e)}}async loadTokens(){try{const e=await fetch("/api/tokens",{headers:{Authorization:`Bearer ${this.token}`}});if(e.ok){const t=await e.json();this.tokens=t.tokens||[]}}catch(e){console.error("Failed to load tokens:",e)}}async handleLogin(e){var r,a;e.preventDefault();const t=(r=this.shadowRoot)==null?void 0:r.querySelector('ticks-input[name="email"]'),s=(a=this.shadowRoot)==null?void 0:a.querySelector('ticks-input[name="password"]'),i=(t==null?void 0:t.value)||"",o=(s==null?void 0:s.value)||"";this.authError="";try{const k=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:i,password:o})}),w=await k.json();if(!k.ok){this.authError=w.error||"Login failed";return}this.token=w.token,this.userEmail=i,localStorage.setItem("token",this.token),localStorage.setItem("userEmail",this.userEmail),this.authState="authenticated",this.updateUrl(),this.loadBoards(),this.loadTokens()}catch{this.authError="Login failed. Please try again."}}async handleSignup(e){var w,z,j,B;e.preventDefault();const t=(w=this.shadowRoot)==null?void 0:w.querySelector("form:not(#login-form)"),s=t==null?void 0:t.querySelector('ticks-input[name="email"]'),i=t==null?void 0:t.querySelector('ticks-input[name="password"]'),o=t==null?void 0:t.querySelector('ticks-input[name="confirm"]'),r=(s==null?void 0:s.value)||"",a=(i==null?void 0:i.value)||"",k=(o==null?void 0:o.value)||"";if(this.authError="",a!==k){this.authError="Passwords do not match";return}try{const _=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:r,password:a})}),M=await _.json();if(!_.ok){this.authError=M.error||"Signup failed";return}this.authTab="login",await this.updateComplete;const A=(z=this.shadowRoot)==null?void 0:z.querySelector('#login-form ticks-input[name="email"]'),q=(j=this.shadowRoot)==null?void 0:j.querySelector('#login-form ticks-input[name="password"]');A&&(A.value=r),q&&(q.value=a);const L=(B=this.shadowRoot)==null?void 0:B.querySelector("#login-form");L&&L.requestSubmit()}catch{this.authError="Signup failed. Please try again."}}handleLogout(){fetch("/api/auth/logout",{method:"POST"}),this.clearAuth(),this.updateUrl()}openBoard(e,t){if(!t){this.showAlert("Board Offline","This board is offline. Start it with: tk run --cloud");return}window.location.href=`/p/${encodeURIComponent(e)}/`}showAlert(e,t){this.confirmDialog={open:!0,title:e,message:t,action:null}}async createToken(){var s;const e=(s=this.shadowRoot)==null?void 0:s.querySelector("#new-token-name"),t=((e==null?void 0:e.value)||"").trim();if(t)try{const i=await fetch("/api/tokens",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token}`},body:JSON.stringify({name:t})}),o=await i.json();i.ok&&(this.newToken=o.token,this.showCreateToken=!1,this.loadTokens())}catch(i){console.error("Failed to create token:",i)}}revokeToken(e){this.confirmDialog={open:!0,title:"Revoke Token",message:"Are you sure you want to revoke this token? Any clients using it will be disconnected.",action:async()=>{try{await fetch(`/api/tokens/${e}`,{method:"DELETE",headers:{Authorization:`Bearer ${this.token}`}}),this.loadTokens()}catch(t){console.error("Failed to revoke token:",t)}}}}removeBoard(e,t){const s=t.replace(/--/g,"/");this.confirmDialog={open:!0,title:"Remove Board",message:`Remove "${s}" from your dashboard? The board can reconnect later.`,action:async()=>{try{const i=await fetch(`/api/boards/${e}`,{method:"DELETE",headers:{Authorization:`Bearer ${this.token}`}});if(!i.ok){const o=await i.json();throw new Error(o.error||"Failed to remove board")}this.loadBoards()}catch(i){console.error("Failed to remove board:",i)}}}}closeConfirmDialog(){this.confirmDialog={...this.confirmDialog,open:!1}}async confirmDialogAction(){this.confirmDialog.action&&await this.confirmDialog.action(),this.closeConfirmDialog()}formatDate(e){return e?new Date(e*1e3).toLocaleDateString():"Never"}render(){return this.authState==="loading"?n`
        <div class="loading">
          <ticks-spinner size="large"></ticks-spinner>
        </div>
      `:this.authState==="unauthenticated"?this.renderAuth():this.renderDashboard()}renderAuth(){return n`
      <ticks-header>
        <a href="/" slot="logo" style="text-decoration: none;">
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
        </a>
      </ticks-header>

      <div class="auth-container">
        <div class="auth-tabs">
          <button
            class="auth-tab ${this.authTab==="login"?"active":""}"
            @click=${()=>this.authTab="login"}
          >
            Login
          </button>
          <button
            class="auth-tab ${this.authTab==="signup"?"active":""}"
            @click=${()=>this.authTab="signup"}
          >
            Sign Up
          </button>
        </div>

        ${this.authError?n`
          <div class="auth-alert">
            <ticks-alert variant="error">${this.authError}</ticks-alert>
          </div>
        `:""}

        ${this.authTab==="login"?n`
          <form id="login-form" class="auth-form" @submit=${this.handleLogin}>
            <ticks-input name="email" type="email" placeholder="Email" required></ticks-input>
            <ticks-input name="password" type="password" placeholder="Password" required></ticks-input>
            <ticks-button type="submit" variant="primary" full>Login</ticks-button>
          </form>
        `:n`
          <form class="auth-form" @submit=${this.handleSignup}>
            <ticks-input name="email" type="email" placeholder="Email" required></ticks-input>
            <ticks-input name="password" type="password" placeholder="Password (min 8 chars)" required minlength="8"></ticks-input>
            <ticks-input name="confirm" type="password" placeholder="Confirm Password" required minlength="8"></ticks-input>
            <ticks-button type="submit" variant="primary" full>Sign Up</ticks-button>
          </form>
        `}
      </div>
    `}renderDashboard(){return n`
      <ticks-header>
        <a href="/" slot="logo" style="text-decoration: none;">
          <ticks-logo variant="logotype" .size=${24}></ticks-logo>
        </a>
        <div slot="user" class="user-actions">
          <span class="user-email">${this.userEmail}</span>
          <ticks-button size="small" variant="ghost" @click=${this.handleLogout}>Logout</ticks-button>
        </div>
      </ticks-header>

      <div class="dashboard">
        <section class="section">
          <div class="section-header">
            <h2>Your Boards</h2>
            <button class="icon-btn" @click=${this.loadBoards} aria-label="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
          ${this.boards.length===0?n`
            <ticks-empty-state>
              <span slot="title">No boards yet</span>
              <span slot="description">Run <ticks-code>tk run --cloud</ticks-code> to connect a board.</span>
            </ticks-empty-state>
          `:n`
            <div class="board-list">
              ${this.boards.map(e=>n`
                <ticks-list-item interactive @click=${()=>this.openBoard(e.name,e.online)}>
                  <ticks-badge slot="status" variant="${e.online?"green":"neutral"}" dot></ticks-badge>
                  <span slot="title">${e.name.replace(/--/g,"/")}</span>
                  <span slot="subtitle">${e.online?"Online":"Offline"}</span>
                  <ticks-button slot="actions" size="small" variant="ghost" @click=${t=>{t.stopPropagation(),this.removeBoard(e.id,e.name)}}>
                    Remove
                  </ticks-button>
                </ticks-list-item>
              `)}
            </div>
          `}
        </section>

        <section class="section">
          <div class="section-header">
            <h2>API Tokens</h2>
            <ticks-button size="small" @click=${()=>this.showCreateToken=!0}>New Token</ticks-button>
          </div>

          ${this.newToken?n`
            <div class="new-token-display">
              <p>Copy this token now. You won't be able to see it again!</p>
              <ticks-code block copyable>${this.newToken}</ticks-code>
              <div style="margin-top: 0.75rem;">
                <ticks-button size="small" variant="ghost" @click=${()=>this.newToken=""}>Dismiss</ticks-button>
              </div>
            </div>
          `:""}

          ${this.tokens.length===0?n`
            <ticks-empty-state>
              <span slot="title">No API tokens yet</span>
              <span slot="description">Create one to use with the CLI.</span>
              <ticks-button slot="action" size="small" @click=${()=>this.showCreateToken=!0}>Create Token</ticks-button>
            </ticks-empty-state>
          `:n`
            <div class="token-list">
              ${this.tokens.map(e=>n`
                <ticks-list-item>
                  <span slot="title">${e.name}</span>
                  <span slot="subtitle">
                    Created ${this.formatDate(e.createdAt)}
                    ${e.lastUsedAt?` · Last used ${this.formatDate(e.lastUsedAt)}`:""}
                  </span>
                  <ticks-button slot="actions" size="small" variant="danger" @click=${()=>this.revokeToken(e.id)}>
                    Revoke
                  </ticks-button>
                </ticks-list-item>
              `)}
            </div>
          `}
        </section>
      </div>

      <ticks-dialog ?open=${this.showCreateToken} @close=${()=>this.showCreateToken=!1}>
        <span slot="title">Create API Token</span>
        <ticks-input id="new-token-name" placeholder="Token name (e.g., macbook, server)"></ticks-input>
        <div slot="footer">
          <ticks-button variant="ghost" @click=${()=>this.showCreateToken=!1}>Cancel</ticks-button>
          <ticks-button variant="primary" @click=${this.createToken}>Create</ticks-button>
        </div>
      </ticks-dialog>

      <ticks-dialog ?open=${this.confirmDialog.open} @close=${this.closeConfirmDialog}>
        <span slot="title">${this.confirmDialog.title}</span>
        <p>${this.confirmDialog.message}</p>
        <div slot="footer">
          ${this.confirmDialog.action?n`
            <ticks-button variant="ghost" @click=${this.closeConfirmDialog}>Cancel</ticks-button>
            <ticks-button variant="danger" @click=${this.confirmDialogAction}>Confirm</ticks-button>
          `:n`
            <ticks-button variant="primary" @click=${this.closeConfirmDialog}>OK</ticks-button>
          `}
        </div>
      </ticks-dialog>
    `}};p.styles=h`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--crust);
      color: var(--text);
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    /* Auth container */
    .auth-container {
      max-width: 400px;
      margin: 4rem auto;
      padding: 2rem;
    }

    .auth-tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--surface);
    }

    .auth-tab {
      padding: 0.75rem 0;
      background: none;
      border: none;
      color: var(--subtext);
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 1rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .auth-tab:hover {
      color: var(--text);
    }

    .auth-tab.active {
      color: var(--green);
      border-bottom-color: var(--green);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Dashboard */
    .dashboard {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .section {
      margin-bottom: 3rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
      margin: 0;
    }

    /* Board list */
    .board-list {
      display: grid;
      gap: 0.75rem;
    }

    /* Token list */
    .token-list {
      display: grid;
      gap: 0.75rem;
    }

    .new-token-display {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--mantle);
      border-radius: 8px;
      border: 1px solid var(--green);
    }

    .new-token-display p {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--subtext);
    }

    /* Alert */
    .auth-alert {
      margin-bottom: 1rem;
    }

    /* User info in header */
    .user-email {
      color: var(--subtext);
      font-size: 0.875rem;
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Refresh icon button */
    .icon-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      color: var(--subtext);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .icon-btn:hover {
      background: var(--surface);
      color: var(--text);
    }

    .icon-btn svg {
      width: 1rem;
      height: 1rem;
    }
  `;f([v()],p.prototype,"authState",2);f([v()],p.prototype,"authTab",2);f([v()],p.prototype,"authError",2);f([v()],p.prototype,"userEmail",2);f([v()],p.prototype,"boards",2);f([v()],p.prototype,"tokens",2);f([v()],p.prototype,"newToken",2);f([v()],p.prototype,"showCreateToken",2);f([v()],p.prototype,"confirmDialog",2);p=f([m("ticks-app")],p);
