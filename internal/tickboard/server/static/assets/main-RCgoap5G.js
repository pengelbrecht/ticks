var ua=Object.defineProperty;var ha=(e,t,i)=>t in e?ua(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var N=(e,t,i)=>ha(e,typeof t!="symbol"?t+"":t,i);import{i as T,n as h,a as ge,b as u,r as w,E as Et,A as y,e as C,u as ps,t as $e}from"./ticks-logo-DYgrblNn.js";var pa=T`
  :host {
    --track-width: 2px;
    --track-color: rgb(128 128 128 / 25%);
    --indicator-color: var(--sl-color-primary-600);
    --speed: 2s;

    display: inline-flex;
    width: 1em;
    height: 1em;
    flex: none;
  }

  .spinner {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
  }

  .spinner__track,
  .spinner__indicator {
    fill: none;
    stroke-width: var(--track-width);
    r: calc(0.5em - var(--track-width) / 2);
    cx: 0.5em;
    cy: 0.5em;
    transform-origin: 50% 50%;
  }

  .spinner__track {
    stroke: var(--track-color);
    transform-origin: 0% 0%;
  }

  .spinner__indicator {
    stroke: var(--indicator-color);
    stroke-linecap: round;
    stroke-dasharray: 150% 75%;
    animation: spin var(--speed) linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
      stroke-dasharray: 0.05em, 3em;
    }

    50% {
      transform: rotate(450deg);
      stroke-dasharray: 1.375em, 1.375em;
    }

    100% {
      transform: rotate(1080deg);
      stroke-dasharray: 0.05em, 3em;
    }
  }
`;const _r=new Set,zt=new Map;let gt,Nr="ltr",Br="en";const ro=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(ro){const e=new MutationObserver(oo);Nr=document.documentElement.dir||"ltr",Br=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function so(...e){e.map(t=>{const i=t.$code.toLowerCase();zt.has(i)?zt.set(i,Object.assign(Object.assign({},zt.get(i)),t)):zt.set(i,t),gt||(gt=t)}),oo()}function oo(){ro&&(Nr=document.documentElement.dir||"ltr",Br=document.documentElement.lang||navigator.language),[..._r.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let fa=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){_r.add(this.host)}hostDisconnected(){_r.delete(this.host)}dir(){return`${this.host.dir||Nr}`.toLowerCase()}lang(){return`${this.host.lang||Br}`.toLowerCase()}getTranslationData(t){var i,r;const s=new Intl.Locale(t.replace(/_/g,"-")),o=s==null?void 0:s.language.toLowerCase(),a=(r=(i=s==null?void 0:s.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&r!==void 0?r:"",n=zt.get(`${o}-${a}`),d=zt.get(o);return{locale:s,language:o,region:a,primary:n,secondary:d}}exists(t,i){var r;const{primary:s,secondary:o}=this.getTranslationData((r=i.lang)!==null&&r!==void 0?r:this.lang());return i=Object.assign({includeFallback:!1},i),!!(s&&s[t]||o&&o[t]||i.includeFallback&&gt&&gt[t])}term(t,...i){const{primary:r,secondary:s}=this.getTranslationData(this.lang());let o;if(r&&r[t])o=r[t];else if(s&&s[t])o=s[t];else if(gt&&gt[t])o=gt[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof o=="function"?o(...i):o}date(t,i){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),i).format(t)}number(t,i){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),i).format(t)}relativeTime(t,i,r){return new Intl.RelativeTimeFormat(this.lang(),r).format(t,i)}};var ao={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};so(ao);var ma=ao,oe=class extends fa{};so(ma);var H=T`
  :host {
    box-sizing: border-box;
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: inherit;
  }

  [hidden] {
    display: none !important;
  }
`,no=Object.defineProperty,ba=Object.defineProperties,ga=Object.getOwnPropertyDescriptor,va=Object.getOwnPropertyDescriptors,fs=Object.getOwnPropertySymbols,ya=Object.prototype.hasOwnProperty,wa=Object.prototype.propertyIsEnumerable,pr=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),Hr=e=>{throw TypeError(e)},ms=(e,t,i)=>t in e?no(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,Ze=(e,t)=>{for(var i in t||(t={}))ya.call(t,i)&&ms(e,i,t[i]);if(fs)for(var i of fs(t))wa.call(t,i)&&ms(e,i,t[i]);return e},ni=(e,t)=>ba(e,va(t)),l=(e,t,i,r)=>{for(var s=r>1?void 0:r?ga(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&no(t,i,s),s},lo=(e,t,i)=>t.has(e)||Hr("Cannot "+i),ka=(e,t,i)=>(lo(e,t,"read from private field"),t.get(e)),xa=(e,t,i)=>t.has(e)?Hr("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),_a=(e,t,i,r)=>(lo(e,t,"write to private field"),t.set(e,i),i),Ca=function(e,t){this[0]=e,this[1]=t},$a=e=>{var t=e[pr("asyncIterator")],i=!1,r,s={};return t==null?(t=e[pr("iterator")](),r=o=>s[o]=a=>t[o](a)):(t=t.call(e),r=o=>s[o]=a=>{if(i){if(i=!1,o==="throw")throw a;return a}return i=!0,{done:!1,value:new Ca(new Promise(n=>{var d=t[o](a);d instanceof Object||Hr("Object expected"),n(d)}),1)}}),s[pr("iterator")]=()=>s,r("next"),"throw"in t?r("throw"):s.throw=o=>{throw o},"return"in t&&r("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ta(e){return(t,i)=>{const r=typeof t=="function"?t:t[i];Object.assign(r,e)}}var Ti,I=class extends ge{constructor(){super(),xa(this,Ti,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const i=new CustomEvent(e,Ze({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(i),i}static define(e,t=this,i={}){const r=customElements.get(e);if(!r){try{customElements.define(e,t,i)}catch{customElements.define(e,class extends t{},i)}return}let s=" (unknown version)",o=s;"version"in t&&t.version&&(s=" v"+t.version),"version"in r&&r.version&&(o=" v"+r.version),!(s&&o&&s===o)&&console.warn(`Attempted to register <${e}>${s}, but <${e}>${o} has already been registered.`)}attributeChangedCallback(e,t,i){ka(this,Ti)||(this.constructor.elementProperties.forEach((r,s)=>{r.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),_a(this,Ti,!0)),super.attributeChangedCallback(e,t,i)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,i)=>{e.has(i)&&this[i]==null&&(this[i]=t)})}};Ti=new WeakMap;I.version="2.20.1";I.dependencies={};l([h()],I.prototype,"dir",2);l([h()],I.prototype,"lang",2);var Yi=class extends I{constructor(){super(...arguments),this.localize=new oe(this)}render(){return u`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Yi.styles=[H,pa];var jt=new WeakMap,Vt=new WeakMap,Wt=new WeakMap,fr=new WeakSet,gi=new WeakMap,li=class{constructor(e,t){this.handleFormData=i=>{const r=this.options.disabled(this.host),s=this.options.name(this.host),o=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!r&&!a&&typeof s=="string"&&s.length>0&&typeof o<"u"&&(Array.isArray(o)?o.forEach(n=>{i.formData.append(s,n.toString())}):i.formData.append(s,o.toString()))},this.handleFormSubmit=i=>{var r;const s=this.options.disabled(this.host),o=this.options.reportValidity;this.form&&!this.form.noValidate&&((r=jt.get(this.form))==null||r.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!s&&!o(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),gi.set(this.host,[])},this.handleInteraction=i=>{const r=gi.get(this.host);r.includes(i.type)||r.push(i.type),r.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const r of i)if(typeof r.checkValidity=="function"&&!r.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const r of i)if(typeof r.reportValidity=="function"&&!r.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=Ze({form:i=>{const r=i.form;if(r){const o=i.getRootNode().querySelector(`#${r}`);if(o)return o}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var r;return(r=i.disabled)!=null?r:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,r)=>i.value=r,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),gi.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),gi.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,jt.has(this.form)?jt.get(this.form).add(this.host):jt.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Vt.has(this.form)||(Vt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Wt.has(this.form)||(Wt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=jt.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Vt.has(this.form)&&(this.form.reportValidity=Vt.get(this.form),Vt.delete(this.form)),Wt.has(this.form)&&(this.form.checkValidity=Wt.get(this.form),Wt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?fr.add(e):fr.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const i=document.createElement("button");i.type=e,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",t&&(i.name=t.name,i.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(r=>{t.hasAttribute(r)&&i.setAttribute(r,t.getAttribute(r))})),this.form.append(i),i.click(),i.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,i=!!fr.has(t),r=!!t.required;t.toggleAttribute("data-required",r),t.toggleAttribute("data-optional",!r),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&i),t.toggleAttribute("data-user-valid",e&&i)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},jr=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(ni(Ze({},jr),{valid:!1,valueMissing:!0}));Object.freeze(ni(Ze({},jr),{valid:!1,customError:!0}));var Sa=T`
  :host {
    display: inline-block;
    position: relative;
    width: auto;
    cursor: pointer;
  }

  .button {
    display: inline-flex;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    border-style: solid;
    border-width: var(--sl-input-border-width);
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-font-weight-semibold);
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    vertical-align: middle;
    padding: 0;
    transition:
      var(--sl-transition-x-fast) background-color,
      var(--sl-transition-x-fast) color,
      var(--sl-transition-x-fast) border,
      var(--sl-transition-x-fast) box-shadow;
    cursor: inherit;
  }

  .button::-moz-focus-inner {
    border: 0;
  }

  .button:focus {
    outline: none;
  }

  .button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* When disabled, prevent mouse events from bubbling up from children */
  .button--disabled * {
    pointer-events: none;
  }

  .button__prefix,
  .button__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .button__label {
    display: inline-block;
  }

  .button__label::slotted(sl-icon) {
    vertical-align: -2px;
  }

  /*
   * Standard buttons
   */

  /* Default */
  .button--standard.button--default {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--standard.button--default:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-300);
    color: var(--sl-color-primary-700);
  }

  .button--standard.button--default:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-100);
    border-color: var(--sl-color-primary-400);
    color: var(--sl-color-primary-700);
  }

  /* Primary */
  .button--standard.button--primary {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-500);
    border-color: var(--sl-color-primary-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--standard.button--success {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:hover:not(.button--disabled) {
    background-color: var(--sl-color-success-500);
    border-color: var(--sl-color-success-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:active:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--standard.button--neutral {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:hover:not(.button--disabled) {
    background-color: var(--sl-color-neutral-500);
    border-color: var(--sl-color-neutral-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:active:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--standard.button--warning {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }
  .button--standard.button--warning:hover:not(.button--disabled) {
    background-color: var(--sl-color-warning-500);
    border-color: var(--sl-color-warning-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--warning:active:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--standard.button--danger {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:hover:not(.button--disabled) {
    background-color: var(--sl-color-danger-500);
    border-color: var(--sl-color-danger-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:active:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /*
   * Outline buttons
   */

  .button--outline {
    background: none;
    border: solid 1px;
  }

  /* Default */
  .button--outline.button--default {
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--outline.button--default:hover:not(.button--disabled),
  .button--outline.button--default.button--checked:not(.button--disabled) {
    border-color: var(--sl-color-primary-600);
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--default:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Primary */
  .button--outline.button--primary {
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-primary-600);
  }

  .button--outline.button--primary:hover:not(.button--disabled),
  .button--outline.button--primary.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--primary:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--outline.button--success {
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-success-600);
  }

  .button--outline.button--success:hover:not(.button--disabled),
  .button--outline.button--success.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--success:active:not(.button--disabled) {
    border-color: var(--sl-color-success-700);
    background-color: var(--sl-color-success-700);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--outline.button--neutral {
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-600);
  }

  .button--outline.button--neutral:hover:not(.button--disabled),
  .button--outline.button--neutral.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--neutral:active:not(.button--disabled) {
    border-color: var(--sl-color-neutral-700);
    background-color: var(--sl-color-neutral-700);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--outline.button--warning {
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-warning-600);
  }

  .button--outline.button--warning:hover:not(.button--disabled),
  .button--outline.button--warning.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--warning:active:not(.button--disabled) {
    border-color: var(--sl-color-warning-700);
    background-color: var(--sl-color-warning-700);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--outline.button--danger {
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-danger-600);
  }

  .button--outline.button--danger:hover:not(.button--disabled),
  .button--outline.button--danger.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--danger:active:not(.button--disabled) {
    border-color: var(--sl-color-danger-700);
    background-color: var(--sl-color-danger-700);
    color: var(--sl-color-neutral-0);
  }

  @media (forced-colors: active) {
    .button.button--outline.button--checked:not(.button--disabled) {
      outline: solid 2px transparent;
    }
  }

  /*
   * Text buttons
   */

  .button--text {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-600);
  }

  .button--text:hover:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:focus-visible:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:active:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-700);
  }

  /*
   * Size modifiers
   */

  .button--small {
    height: auto;
    min-height: var(--sl-input-height-small);
    font-size: var(--sl-button-font-size-small);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
  }

  .button--medium {
    height: auto;
    min-height: var(--sl-input-height-medium);
    font-size: var(--sl-button-font-size-medium);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
  }

  .button--large {
    height: auto;
    min-height: var(--sl-input-height-large);
    font-size: var(--sl-button-font-size-large);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
  }

  /*
   * Pill modifier
   */

  .button--pill.button--small {
    border-radius: var(--sl-input-height-small);
  }

  .button--pill.button--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .button--pill.button--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Circle modifier
   */

  .button--circle {
    padding-left: 0;
    padding-right: 0;
  }

  .button--circle.button--small {
    width: var(--sl-input-height-small);
    border-radius: 50%;
  }

  .button--circle.button--medium {
    width: var(--sl-input-height-medium);
    border-radius: 50%;
  }

  .button--circle.button--large {
    width: var(--sl-input-height-large);
    border-radius: 50%;
  }

  .button--circle .button__prefix,
  .button--circle .button__suffix,
  .button--circle .button__caret {
    display: none;
  }

  /*
   * Caret modifier
   */

  .button--caret .button__suffix {
    display: none;
  }

  .button--caret .button__caret {
    height: auto;
  }

  /*
   * Loading modifier
   */

  .button--loading {
    position: relative;
    cursor: wait;
  }

  .button--loading .button__prefix,
  .button--loading .button__label,
  .button--loading .button__suffix,
  .button--loading .button__caret {
    visibility: hidden;
  }

  .button--loading sl-spinner {
    --indicator-color: currentColor;
    position: absolute;
    font-size: 1em;
    height: 1em;
    width: 1em;
    top: calc(50% - 0.5em);
    left: calc(50% - 0.5em);
  }

  /*
   * Badges
   */

  .button ::slotted(sl-badge) {
    position: absolute;
    top: 0;
    right: 0;
    translate: 50% -50%;
    pointer-events: none;
  }

  .button--rtl ::slotted(sl-badge) {
    right: auto;
    left: 0;
    translate: -50% -50%;
  }

  /*
   * Button spacing
   */

  .button--has-label.button--small .button__label {
    padding: 0 var(--sl-spacing-small);
  }

  .button--has-label.button--medium .button__label {
    padding: 0 var(--sl-spacing-medium);
  }

  .button--has-label.button--large .button__label {
    padding: 0 var(--sl-spacing-large);
  }

  .button--has-prefix.button--small {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--small .button__label {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--medium {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--medium .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-suffix.button--small,
  .button--caret.button--small {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--small .button__label,
  .button--caret.button--small .button__label {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--medium,
  .button--caret.button--medium {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--medium .button__label,
  .button--caret.button--medium .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large,
  .button--caret.button--large {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large .button__label,
  .button--caret.button--large .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  /*
   * Button groups support a variety of button types (e.g. buttons with tooltips, buttons as dropdown triggers, etc.).
   * This means buttons aren't always direct descendants of the button group, thus we can't target them with the
   * ::slotted selector. To work around this, the button group component does some magic to add these special classes to
   * buttons and we style them here instead.
   */

  :host([data-sl-button-group__button--first]:not([data-sl-button-group__button--last])) .button {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  :host([data-sl-button-group__button--inner]) .button {
    border-radius: 0;
  }

  :host([data-sl-button-group__button--last]:not([data-sl-button-group__button--first])) .button {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  /* All except the first */
  :host([data-sl-button-group__button]:not([data-sl-button-group__button--first])) {
    margin-inline-start: calc(-1 * var(--sl-input-border-width));
  }

  /* Add a visual separator between solid buttons */
  :host(
      [data-sl-button-group__button]:not(
          [data-sl-button-group__button--first],
          [data-sl-button-group__button--radio],
          [variant='default']
        ):not(:hover)
    )
    .button:after {
    content: '';
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    bottom: 0;
    border-left: solid 1px rgb(128 128 128 / 33%);
    mix-blend-mode: multiply;
  }

  /* Bump hovered, focused, and checked buttons up so their focus ring isn't clipped */
  :host([data-sl-button-group__button--hover]) {
    z-index: 1;
  }

  /* Focus and checked are always on top */
  :host([data-sl-button-group__button--focus]),
  :host([data-sl-button-group__button][checked]) {
    z-index: 2;
  }
`,Je=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=i=>{const r=i.target;(this.slotNames.includes("[default]")&&!r.name||r.name&&this.slotNames.includes(r.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Ea(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let i="";return[...t].forEach(r=>{r.nodeType===Node.TEXT_NODE&&(i+=r.textContent)}),i}var Cr="";function $r(e){Cr=e}function za(e=""){if(!Cr){const t=[...document.getElementsByTagName("script")],i=t.find(r=>r.hasAttribute("data-shoelace"));if(i)$r(i.getAttribute("data-shoelace"));else{const r=t.find(o=>/shoelace(\.min)?\.js($|\?)/.test(o.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(o.src));let s="";r&&(s=r.getAttribute("src")),$r(s.split("/").slice(0,-1).join("/"))}}return Cr.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var Aa={name:"default",resolver:e=>za(`assets/icons/${e}.svg`)},Da=Aa,bs={caret:`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `,check:`
    <svg part="checked-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor">
          <g transform="translate(3.428571, 3.428571)">
            <path d="M0,5.71428571 L3.42857143,9.14285714"></path>
            <path d="M9.14285714,0 L3.42857143,9.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"chevron-down":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,"chevron-left":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-left" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
    </svg>
  `,"chevron-right":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,copy:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"/>
    </svg>
  `,eye:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  `,"eye-slash":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
    </svg>
  `,eyedropper:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eyedropper" viewBox="0 0 16 16">
      <path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708l-2-2zM2 12.707l7-7L10.293 7l-7 7H2v-1.293z"></path>
    </svg>
  `,"grip-vertical":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-grip-vertical" viewBox="0 0 16 16">
      <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>
    </svg>
  `,indeterminate:`
    <svg part="indeterminate-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor" stroke-width="2">
          <g transform="translate(2.285714, 6.857143)">
            <path d="M10.2857143,1.14285714 L1.14285714,1.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"person-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    </svg>
  `,"play-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"></path>
    </svg>
  `,"pause-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"></path>
    </svg>
  `,radio:`
    <svg part="checked-icon" class="radio__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="currentColor">
          <circle cx="8" cy="8" r="3.42857143"></circle>
        </g>
      </g>
    </svg>
  `,"star-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
    </svg>
  `,"x-lg":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
  `,"x-circle-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
    </svg>
  `},Oa={name:"system",resolver:e=>e in bs?`data:image/svg+xml,${encodeURIComponent(bs[e])}`:""},Ra=Oa,Ma=[Da,Ra],Tr=[];function Pa(e){Tr.push(e)}function Ia(e){Tr=Tr.filter(t=>t!==e)}function gs(e){return Ma.find(t=>t.name===e)}var La=T`
  :host {
    display: inline-block;
    width: 1em;
    height: 1em;
    box-sizing: content-box !important;
  }

  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`;function S(e,t){const i=Ze({waitUntilFirstUpdate:!1},t);return(r,s)=>{const{update:o}=r,a=Array.isArray(e)?e:[e];r.update=function(n){a.forEach(d=>{const c=d;if(n.has(c)){const p=n.get(c),m=this[c];p!==m&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[s](p,m)}}),o.call(this,n)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Fa=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,co=e=>e.strings===void 0,Na={},Ba=(e,t=Na)=>e._$AH=t;var Ut=Symbol(),vi=Symbol(),mr,br=new Map,te=class extends I{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var i;let r;if(t!=null&&t.spriteSheet)return this.svg=u`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(r=await fetch(e,{mode:"cors"}),!r.ok)return r.status===410?Ut:vi}catch{return vi}try{const s=document.createElement("div");s.innerHTML=await r.text();const o=s.firstElementChild;if(((i=o==null?void 0:o.tagName)==null?void 0:i.toLowerCase())!=="svg")return Ut;mr||(mr=new DOMParser);const n=mr.parseFromString(o.outerHTML,"text/html").body.querySelector("svg");return n?(n.part.add("svg"),document.adoptNode(n)):Ut}catch{return Ut}}connectedCallback(){super.connectedCallback(),Pa(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Ia(this)}getIconSource(){const e=gs(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:i}=this.getIconSource(),r=i?gs(this.library):void 0;if(!t){this.svg=null;return}let s=br.get(t);if(s||(s=this.resolveIcon(t,r),br.set(t,s)),!this.initialRender)return;const o=await s;if(o===vi&&br.delete(t),t===this.getIconSource().url){if(Fa(o)){if(this.svg=o,r){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof r.mutator=="function"&&a&&r.mutator(a)}return}switch(o){case vi:case Ut:this.svg=null,this.emit("sl-error");break;default:this.svg=o.cloneNode(!0),(e=r==null?void 0:r.mutator)==null||e.call(r,this.svg),this.emit("sl-load")}}}render(){return this.svg}};te.styles=[H,La];l([w()],te.prototype,"svg",2);l([h({reflect:!0})],te.prototype,"name",2);l([h()],te.prototype,"src",2);l([h()],te.prototype,"label",2);l([h({reflect:!0})],te.prototype,"library",2);l([S("label")],te.prototype,"handleLabelChange",1);l([S(["name","src","library"])],te.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ke={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ki=e=>(...t)=>({_$litDirective$:e,values:t});let Gi=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,r){this._$Ct=t,this._$AM=i,this._$Ci=r}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const P=Ki(class extends Gi{constructor(e){var t;if(super(e),e.type!==Ke.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var r,s;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(o=>o!=="")));for(const o in t)t[o]&&!((r=this.nt)!=null&&r.has(o))&&this.st.add(o);return this.render(t)}const i=e.element.classList;for(const o of this.st)o in t||(i.remove(o),this.st.delete(o));for(const o in t){const a=!!t[o];a===this.st.has(o)||(s=this.nt)!=null&&s.has(o)||(a?(i.add(o),this.st.add(o)):(i.remove(o),this.st.delete(o)))}return Et}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const uo=Symbol.for(""),Ha=e=>{if((e==null?void 0:e.r)===uo)return e==null?void 0:e._$litStatic$},Di=(e,...t)=>({_$litStatic$:t.reduce((i,r,s)=>i+(o=>{if(o._$litStatic$!==void 0)return o._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${o}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(r)+e[s+1],e[0]),r:uo}),vs=new Map,ja=e=>(t,...i)=>{const r=i.length;let s,o;const a=[],n=[];let d,c=0,p=!1;for(;c<r;){for(d=t[c];c<r&&(o=i[c],(s=Ha(o))!==void 0);)d+=s+t[++c],p=!0;c!==r&&n.push(o),a.push(d),c++}if(c===r&&a.push(t[r]),p){const m=a.join("$$lit$$");(t=vs.get(m))===void 0&&(a.raw=a,vs.set(m,t=a)),i=n}return e(t,...i)},Si=ja(u);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>e??y;var L=class extends I{constructor(){super(...arguments),this.formControlController=new li(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new Je(this,"[default]","prefix","suffix"),this.localize=new oe(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:jr}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?Di`a`:Di`button`;return Si`
      <${t}
        part="base"
        class=${P({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${x(e?void 0:this.disabled)}
        type=${x(e?void 0:this.type)}
        title=${this.title}
        name=${x(e?void 0:this.name)}
        value=${x(e?void 0:this.value)}
        href=${x(e&&!this.disabled?this.href:void 0)}
        target=${x(e?this.target:void 0)}
        download=${x(e?this.download:void 0)}
        rel=${x(e?this.rel:void 0)}
        role=${x(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @invalid=${this.isButton()?this.handleInvalid:null}
        @click=${this.handleClick}
      >
        <slot name="prefix" part="prefix" class="button__prefix"></slot>
        <slot part="label" class="button__label"></slot>
        <slot name="suffix" part="suffix" class="button__suffix"></slot>
        ${this.caret?Si` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?Si`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};L.styles=[H,Sa];L.dependencies={"sl-icon":te,"sl-spinner":Yi};l([C(".button")],L.prototype,"button",2);l([w()],L.prototype,"hasFocus",2);l([w()],L.prototype,"invalid",2);l([h()],L.prototype,"title",2);l([h({reflect:!0})],L.prototype,"variant",2);l([h({reflect:!0})],L.prototype,"size",2);l([h({type:Boolean,reflect:!0})],L.prototype,"caret",2);l([h({type:Boolean,reflect:!0})],L.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],L.prototype,"loading",2);l([h({type:Boolean,reflect:!0})],L.prototype,"outline",2);l([h({type:Boolean,reflect:!0})],L.prototype,"pill",2);l([h({type:Boolean,reflect:!0})],L.prototype,"circle",2);l([h()],L.prototype,"type",2);l([h()],L.prototype,"name",2);l([h()],L.prototype,"value",2);l([h()],L.prototype,"href",2);l([h()],L.prototype,"target",2);l([h()],L.prototype,"rel",2);l([h()],L.prototype,"download",2);l([h()],L.prototype,"form",2);l([h({attribute:"formaction"})],L.prototype,"formAction",2);l([h({attribute:"formenctype"})],L.prototype,"formEnctype",2);l([h({attribute:"formmethod"})],L.prototype,"formMethod",2);l([h({attribute:"formnovalidate",type:Boolean})],L.prototype,"formNoValidate",2);l([h({attribute:"formtarget"})],L.prototype,"formTarget",2);l([S("disabled",{waitUntilFirstUpdate:!0})],L.prototype,"handleDisabledChange",1);L.define("sl-button");var Va=T`
  :host {
    display: block;
  }

  .input {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: stretch;
    justify-content: start;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: text;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  /* Standard inputs */
  .input--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .input--standard:hover:not(.input--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }

  .input--standard.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .input--standard.input--focused:not(.input--disabled) .input__control {
    color: var(--sl-input-color-focus);
  }

  .input--standard.input--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input--standard.input--disabled .input__control {
    color: var(--sl-input-color-disabled);
  }

  .input--standard.input--disabled .input__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled inputs */
  .input--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .input--filled:hover:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .input--filled.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .input--filled.input--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input__control {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    min-width: 0;
    height: 100%;
    color: var(--sl-input-color);
    border: none;
    background: inherit;
    box-shadow: none;
    padding: 0;
    margin: 0;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .input__control::-webkit-search-decoration,
  .input__control::-webkit-search-cancel-button,
  .input__control::-webkit-search-results-button,
  .input__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .input__control:-webkit-autofill,
  .input__control:-webkit-autofill:hover,
  .input__control:-webkit-autofill:focus,
  .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-background-color-hover) inset !important;
    -webkit-text-fill-color: var(--sl-color-primary-500);
    caret-color: var(--sl-input-color);
  }

  .input--filled .input__control:-webkit-autofill,
  .input--filled .input__control:-webkit-autofill:hover,
  .input--filled .input__control:-webkit-autofill:focus,
  .input--filled .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-filled-background-color) inset !important;
  }

  .input__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .input:hover:not(.input--disabled) .input__control {
    color: var(--sl-input-color-hover);
  }

  .input__control:focus {
    outline: none;
  }

  .input__prefix,
  .input__suffix {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    cursor: default;
  }

  .input__prefix ::slotted(sl-icon),
  .input__suffix ::slotted(sl-icon) {
    color: var(--sl-input-icon-color);
  }

  /*
   * Size modifiers
   */

  .input--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    height: var(--sl-input-height-small);
  }

  .input--small .input__control {
    height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-small);
  }

  .input--small .input__clear,
  .input--small .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-small) * 2);
  }

  .input--small .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .input--small .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .input--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    height: var(--sl-input-height-medium);
  }

  .input--medium .input__control {
    height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-medium);
  }

  .input--medium .input__clear,
  .input--medium .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-medium) * 2);
  }

  .input--medium .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .input--medium .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .input--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    height: var(--sl-input-height-large);
  }

  .input--large .input__control {
    height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-large);
  }

  .input--large .input__clear,
  .input--large .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-large) * 2);
  }

  .input--large .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .input--large .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  /*
   * Pill modifier
   */

  .input--pill.input--small {
    border-radius: var(--sl-input-height-small);
  }

  .input--pill.input--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .input--pill.input--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Clearable + Password Toggle
   */

  .input__clear,
  .input__password-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .input__clear:hover,
  .input__password-toggle:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .input__clear:focus,
  .input__password-toggle:focus {
    outline: none;
  }

  /* Don't show the browser's password toggle in Edge */
  ::-ms-reveal {
    display: none;
  }

  /* Hide the built-in number spinner */
  .input--no-spin-buttons input[type='number']::-webkit-outer-spin-button,
  .input--no-spin-buttons input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    display: none;
  }

  .input--no-spin-buttons input[type='number'] {
    -moz-appearance: textfield;
  }
`,Vr=(e="value")=>(t,i)=>{const r=t.constructor,s=r.prototype.attributeChangedCallback;r.prototype.attributeChangedCallback=function(o,a,n){var d;const c=r.getPropertyOptions(e),p=typeof c.attribute=="string"?c.attribute:e;if(o===p){const m=c.converter||ps,f=(typeof m=="function"?m:(d=m==null?void 0:m.fromAttribute)!=null?d:ps.fromAttribute)(n,c.type);this[e]!==f&&(this[i]=f)}s.call(this,o,a,n)}},Xi=T`
  .form-control .form-control__label {
    display: none;
  }

  .form-control .form-control__help-text {
    display: none;
  }

  /* Label */
  .form-control--has-label .form-control__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    margin-bottom: var(--sl-spacing-3x-small);
  }

  .form-control--has-label.form-control--small .form-control__label {
    font-size: var(--sl-input-label-font-size-small);
  }

  .form-control--has-label.form-control--medium .form-control__label {
    font-size: var(--sl-input-label-font-size-medium);
  }

  .form-control--has-label.form-control--large .form-control__label {
    font-size: var(--sl-input-label-font-size-large);
  }

  :host([required]) .form-control--has-label .form-control__label::after {
    content: var(--sl-input-required-content);
    margin-inline-start: var(--sl-input-required-content-offset);
    color: var(--sl-input-required-content-color);
  }

  /* Help text */
  .form-control--has-help-text .form-control__help-text {
    display: block;
    color: var(--sl-input-help-text-color);
    margin-top: var(--sl-spacing-3x-small);
  }

  .form-control--has-help-text.form-control--small .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-small);
  }

  .form-control--has-help-text.form-control--medium .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-medium);
  }

  .form-control--has-help-text.form-control--large .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-large);
  }

  .form-control--has-help-text.form-control--radio-group .form-control__help-text {
    margin-top: var(--sl-spacing-2x-small);
  }
`;/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Oi=Ki(class extends Gi{constructor(e){if(super(e),e.type!==Ke.PROPERTY&&e.type!==Ke.ATTRIBUTE&&e.type!==Ke.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!co(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===Et||t===y)return t;const i=e.element,r=e.name;if(e.type===Ke.PROPERTY){if(t===i[r])return Et}else if(e.type===Ke.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(r))return Et}else if(e.type===Ke.ATTRIBUTE&&i.getAttribute(r)===t+"")return Et;return Ba(e),t}});var $=class extends I{constructor(){super(...arguments),this.formControlController=new li(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Je(this,"help-text","label"),this.localize=new oe(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,r="preserve"){const s=t??this.input.selectionStart,o=i??this.input.selectionEnd;this.input.setRangeText(e,s,o,r),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,r=this.helpText?!0:!!t,o=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return u`
      <div
        part="form-control"
        class=${P({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":r})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${i?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${P({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
          >
            <span part="prefix" class="input__prefix">
              <slot name="prefix"></slot>
            </span>

            <input
              part="input"
              id="input"
              class="input__control"
              type=${this.type==="password"&&this.passwordVisible?"text":this.type}
              title=${this.title}
              name=${x(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${x(this.placeholder)}
              minlength=${x(this.minlength)}
              maxlength=${x(this.maxlength)}
              min=${x(this.min)}
              max=${x(this.max)}
              step=${x(this.step)}
              .value=${Oi(this.value)}
              autocapitalize=${x(this.autocapitalize)}
              autocomplete=${x(this.autocomplete)}
              autocorrect=${x(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${x(this.pattern)}
              enterkeyhint=${x(this.enterkeyhint)}
              inputmode=${x(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${o?u`
                  <button
                    part="clear-button"
                    class="input__clear"
                    type="button"
                    aria-label=${this.localize.term("clearEntry")}
                    @click=${this.handleClearClick}
                    tabindex="-1"
                  >
                    <slot name="clear-icon">
                      <sl-icon name="x-circle-fill" library="system"></sl-icon>
                    </slot>
                  </button>
                `:""}
            ${this.passwordToggle&&!this.disabled?u`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?u`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:u`
                          <slot name="hide-password-icon">
                            <sl-icon name="eye" library="system"></sl-icon>
                          </slot>
                        `}
                  </button>
                `:""}

            <span part="suffix" class="input__suffix">
              <slot name="suffix"></slot>
            </span>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};$.styles=[H,Xi,Va];$.dependencies={"sl-icon":te};l([C(".input__control")],$.prototype,"input",2);l([w()],$.prototype,"hasFocus",2);l([h()],$.prototype,"title",2);l([h({reflect:!0})],$.prototype,"type",2);l([h()],$.prototype,"name",2);l([h()],$.prototype,"value",2);l([Vr()],$.prototype,"defaultValue",2);l([h({reflect:!0})],$.prototype,"size",2);l([h({type:Boolean,reflect:!0})],$.prototype,"filled",2);l([h({type:Boolean,reflect:!0})],$.prototype,"pill",2);l([h()],$.prototype,"label",2);l([h({attribute:"help-text"})],$.prototype,"helpText",2);l([h({type:Boolean})],$.prototype,"clearable",2);l([h({type:Boolean,reflect:!0})],$.prototype,"disabled",2);l([h()],$.prototype,"placeholder",2);l([h({type:Boolean,reflect:!0})],$.prototype,"readonly",2);l([h({attribute:"password-toggle",type:Boolean})],$.prototype,"passwordToggle",2);l([h({attribute:"password-visible",type:Boolean})],$.prototype,"passwordVisible",2);l([h({attribute:"no-spin-buttons",type:Boolean})],$.prototype,"noSpinButtons",2);l([h({reflect:!0})],$.prototype,"form",2);l([h({type:Boolean,reflect:!0})],$.prototype,"required",2);l([h()],$.prototype,"pattern",2);l([h({type:Number})],$.prototype,"minlength",2);l([h({type:Number})],$.prototype,"maxlength",2);l([h()],$.prototype,"min",2);l([h()],$.prototype,"max",2);l([h()],$.prototype,"step",2);l([h()],$.prototype,"autocapitalize",2);l([h()],$.prototype,"autocorrect",2);l([h()],$.prototype,"autocomplete",2);l([h({type:Boolean})],$.prototype,"autofocus",2);l([h()],$.prototype,"enterkeyhint",2);l([h({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],$.prototype,"spellcheck",2);l([h()],$.prototype,"inputmode",2);l([S("disabled",{waitUntilFirstUpdate:!0})],$.prototype,"handleDisabledChange",1);l([S("step",{waitUntilFirstUpdate:!0})],$.prototype,"handleStepChange",1);l([S("value",{waitUntilFirstUpdate:!0})],$.prototype,"handleValueChange",1);$.define("sl-input");var Wa=T`
  :host {
    display: inline-block;
  }

  .tag {
    display: flex;
    align-items: center;
    border: solid 1px;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }

  .tag__remove::part(base) {
    color: inherit;
    padding: 0;
  }

  /*
   * Variant modifiers
   */

  .tag--primary {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-200);
    color: var(--sl-color-primary-800);
  }

  .tag--primary:active > sl-icon-button {
    color: var(--sl-color-primary-600);
  }

  .tag--success {
    background-color: var(--sl-color-success-50);
    border-color: var(--sl-color-success-200);
    color: var(--sl-color-success-800);
  }

  .tag--success:active > sl-icon-button {
    color: var(--sl-color-success-600);
  }

  .tag--neutral {
    background-color: var(--sl-color-neutral-50);
    border-color: var(--sl-color-neutral-200);
    color: var(--sl-color-neutral-800);
  }

  .tag--neutral:active > sl-icon-button {
    color: var(--sl-color-neutral-600);
  }

  .tag--warning {
    background-color: var(--sl-color-warning-50);
    border-color: var(--sl-color-warning-200);
    color: var(--sl-color-warning-800);
  }

  .tag--warning:active > sl-icon-button {
    color: var(--sl-color-warning-600);
  }

  .tag--danger {
    background-color: var(--sl-color-danger-50);
    border-color: var(--sl-color-danger-200);
    color: var(--sl-color-danger-800);
  }

  .tag--danger:active > sl-icon-button {
    color: var(--sl-color-danger-600);
  }

  /*
   * Size modifiers
   */

  .tag--small {
    font-size: var(--sl-button-font-size-small);
    height: calc(var(--sl-input-height-small) * 0.8);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
    padding: 0 var(--sl-spacing-x-small);
  }

  .tag--medium {
    font-size: var(--sl-button-font-size-medium);
    height: calc(var(--sl-input-height-medium) * 0.8);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
    padding: 0 var(--sl-spacing-small);
  }

  .tag--large {
    font-size: var(--sl-button-font-size-large);
    height: calc(var(--sl-input-height-large) * 0.8);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
    padding: 0 var(--sl-spacing-medium);
  }

  .tag__remove {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  /*
   * Pill modifier
   */

  .tag--pill {
    border-radius: var(--sl-border-radius-pill);
  }
`,Ua=T`
  :host {
    display: inline-block;
    color: var(--sl-color-neutral-600);
  }

  .icon-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    border-radius: var(--sl-border-radius-medium);
    font-size: inherit;
    color: inherit;
    padding: var(--sl-spacing-x-small);
    cursor: pointer;
    transition: var(--sl-transition-x-fast) color;
    -webkit-appearance: none;
  }

  .icon-button:hover:not(.icon-button--disabled),
  .icon-button:focus-visible:not(.icon-button--disabled) {
    color: var(--sl-color-primary-600);
  }

  .icon-button:active:not(.icon-button--disabled) {
    color: var(--sl-color-primary-700);
  }

  .icon-button:focus {
    outline: none;
  }

  .icon-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .icon-button__icon {
    pointer-events: none;
  }
`,X=class extends I{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?Di`a`:Di`button`;return Si`
      <${t}
        part="base"
        class=${P({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${x(e?void 0:this.disabled)}
        type=${x(e?void 0:"button")}
        href=${x(e?this.href:void 0)}
        target=${x(e?this.target:void 0)}
        download=${x(e?this.download:void 0)}
        rel=${x(e&&this.target?"noreferrer noopener":void 0)}
        role=${x(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${x(this.name)}
          library=${x(this.library)}
          src=${x(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${t}>
    `}};X.styles=[H,Ua];X.dependencies={"sl-icon":te};l([C(".icon-button")],X.prototype,"button",2);l([w()],X.prototype,"hasFocus",2);l([h()],X.prototype,"name",2);l([h()],X.prototype,"library",2);l([h()],X.prototype,"src",2);l([h()],X.prototype,"href",2);l([h()],X.prototype,"target",2);l([h()],X.prototype,"download",2);l([h()],X.prototype,"label",2);l([h({type:Boolean,reflect:!0})],X.prototype,"disabled",2);var _t=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return u`
      <span
        part="base"
        class=${P({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?u`
              <sl-icon-button
                part="remove-button"
                exportparts="base:remove-button__base"
                name="x-lg"
                library="system"
                label=${this.localize.term("remove")}
                class="tag__remove"
                @click=${this.handleRemoveClick}
                tabindex="-1"
              ></sl-icon-button>
            `:""}
      </span>
    `}};_t.styles=[H,Wa];_t.dependencies={"sl-icon-button":X};l([h({reflect:!0})],_t.prototype,"variant",2);l([h({reflect:!0})],_t.prototype,"size",2);l([h({type:Boolean,reflect:!0})],_t.prototype,"pill",2);l([h({type:Boolean})],_t.prototype,"removable",2);var qa=T`
  :host {
    display: block;
  }

  /** The popup */
  .select {
    flex: 1 1 auto;
    display: inline-flex;
    width: 100%;
    position: relative;
    vertical-align: middle;
  }

  .select::part(popup) {
    z-index: var(--sl-z-index-dropdown);
  }

  .select[data-current-placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .select[data-current-placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  /* Combobox */
  .select__combobox {
    flex: 1;
    display: flex;
    width: 100%;
    min-width: 0;
    position: relative;
    align-items: center;
    justify-content: start;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: pointer;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  .select__display-input {
    position: relative;
    width: 100%;
    font: inherit;
    border: none;
    background: none;
    color: var(--sl-input-color);
    cursor: inherit;
    overflow: hidden;
    padding: 0;
    margin: 0;
    -webkit-appearance: none;
  }

  .select__display-input::placeholder {
    color: var(--sl-input-placeholder-color);
  }

  .select:not(.select--disabled):hover .select__display-input {
    color: var(--sl-input-color-hover);
  }

  .select__display-input:focus {
    outline: none;
  }

  /* Visually hide the display input when multiple is enabled */
  .select--multiple:not(.select--placeholder-visible) .select__display-input {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .select__value-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    z-index: -1;
  }

  .select__tags {
    display: flex;
    flex: 1;
    align-items: center;
    flex-wrap: wrap;
    margin-inline-start: var(--sl-spacing-2x-small);
  }

  .select__tags::slotted(sl-tag) {
    cursor: pointer !important;
  }

  .select--disabled .select__tags,
  .select--disabled .select__tags::slotted(sl-tag) {
    cursor: not-allowed !important;
  }

  /* Standard selects */
  .select--standard .select__combobox {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .select--standard.select--disabled .select__combobox {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    color: var(--sl-input-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
    outline: none;
  }

  .select--standard:not(.select--disabled).select--open .select__combobox,
  .select--standard:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  /* Filled selects */
  .select--filled .select__combobox {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .select--filled:hover:not(.select--disabled) .select__combobox {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .select--filled.select--disabled .select__combobox {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .select--filled:not(.select--disabled).select--open .select__combobox,
  .select--filled:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
  }

  /* Sizes */
  .select--small .select__combobox {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    min-height: var(--sl-input-height-small);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-small);
  }

  .select--small .select__clear {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-block: 2px;
    padding-inline-start: 0;
  }

  .select--small .select__tags {
    gap: 2px;
  }

  .select--medium .select__combobox {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    min-height: var(--sl-input-height-medium);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-medium);
  }

  .select--medium .select__clear {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 3px;
  }

  .select--medium .select__tags {
    gap: 3px;
  }

  .select--large .select__combobox {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    min-height: var(--sl-input-height-large);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-large);
  }

  .select--large .select__clear {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 4px;
  }

  .select--large .select__tags {
    gap: 4px;
  }

  /* Pills */
  .select--pill.select--small .select__combobox {
    border-radius: var(--sl-input-height-small);
  }

  .select--pill.select--medium .select__combobox {
    border-radius: var(--sl-input-height-medium);
  }

  .select--pill.select--large .select__combobox {
    border-radius: var(--sl-input-height-large);
  }

  /* Prefix and Suffix */
  .select__prefix,
  .select__suffix {
    flex: 0;
    display: inline-flex;
    align-items: center;
    color: var(--sl-input-placeholder-color);
  }

  .select__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-small);
  }

  /* Clear button */
  .select__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .select__clear:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .select__clear:focus {
    outline: none;
  }

  /* Expand icon */
  .select__expand-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
    rotate: 0;
    margin-inline-start: var(--sl-spacing-small);
  }

  .select--open .select__expand-icon {
    rotate: -180deg;
  }

  /* Listbox */
  .select__listbox {
    display: block;
    position: relative;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    box-shadow: var(--sl-shadow-large);
    background: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-radius: var(--sl-border-radius-medium);
    padding-block: var(--sl-spacing-x-small);
    padding-inline: 0;
    overflow: auto;
    overscroll-behavior: none;

    /* Make sure it adheres to the popup's auto size */
    max-width: var(--auto-size-available-width);
    max-height: var(--auto-size-available-height);
  }

  .select__listbox ::slotted(sl-divider) {
    --spacing: var(--sl-spacing-x-small);
  }

  .select__listbox ::slotted(small) {
    display: block;
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-semibold);
    color: var(--sl-color-neutral-500);
    padding-block: var(--sl-spacing-2x-small);
    padding-inline: var(--sl-spacing-x-large);
  }
`;function Ya(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var Sr=new Set;function Ka(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function Ga(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Zt(e){if(Sr.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=Ka()+Ga();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),t<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function Jt(e){Sr.delete(e),Sr.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function Er(e,t,i="vertical",r="smooth"){const s=Ya(e,t),o=s.top+t.scrollTop,a=s.left+t.scrollLeft,n=t.scrollLeft,d=t.scrollLeft+t.offsetWidth,c=t.scrollTop,p=t.scrollTop+t.offsetHeight;(i==="horizontal"||i==="both")&&(a<n?t.scrollTo({left:a,behavior:r}):a+e.clientWidth>d&&t.scrollTo({left:a-t.offsetWidth+e.clientWidth,behavior:r})),(i==="vertical"||i==="both")&&(o<c?t.scrollTo({top:o,behavior:r}):o+e.clientHeight>p&&t.scrollTo({top:o-t.offsetHeight+e.clientHeight,behavior:r}))}var Xa=T`
  :host {
    --arrow-color: var(--sl-color-neutral-1000);
    --arrow-size: 6px;

    /*
     * These properties are computed to account for the arrow's dimensions after being rotated 45º. The constant
     * 0.7071 is derived from sin(45), which is the diagonal size of the arrow's container after rotating.
     */
    --arrow-size-diagonal: calc(var(--arrow-size) * 0.7071);
    --arrow-padding-offset: calc(var(--arrow-size-diagonal) - var(--arrow-size));

    display: contents;
  }

  .popup {
    position: absolute;
    isolation: isolate;
    max-width: var(--auto-size-available-width, none);
    max-height: var(--auto-size-available-height, none);
  }

  .popup--fixed {
    position: fixed;
  }

  .popup:not(.popup--active) {
    display: none;
  }

  .popup__arrow {
    position: absolute;
    width: calc(var(--arrow-size-diagonal) * 2);
    height: calc(var(--arrow-size-diagonal) * 2);
    rotate: 45deg;
    background: var(--arrow-color);
    z-index: -1;
  }

  /* Hover bridge */
  .popup-hover-bridge:not(.popup-hover-bridge--visible) {
    display: none;
  }

  .popup-hover-bridge {
    position: fixed;
    z-index: calc(var(--sl-z-index-dropdown) - 1);
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    clip-path: polygon(
      var(--hover-bridge-top-left-x, 0) var(--hover-bridge-top-left-y, 0),
      var(--hover-bridge-top-right-x, 0) var(--hover-bridge-top-right-y, 0),
      var(--hover-bridge-bottom-right-x, 0) var(--hover-bridge-bottom-right-y, 0),
      var(--hover-bridge-bottom-left-x, 0) var(--hover-bridge-bottom-left-y, 0)
    );
  }
`;const ot=Math.min,me=Math.max,Ri=Math.round,yi=Math.floor,Be=e=>({x:e,y:e}),Qa={left:"right",right:"left",bottom:"top",top:"bottom"},Za={start:"end",end:"start"};function zr(e,t,i){return me(e,ot(t,i))}function Pt(e,t){return typeof e=="function"?e(t):e}function at(e){return e.split("-")[0]}function It(e){return e.split("-")[1]}function ho(e){return e==="x"?"y":"x"}function Wr(e){return e==="y"?"height":"width"}const Ja=new Set(["top","bottom"]);function Ge(e){return Ja.has(at(e))?"y":"x"}function Ur(e){return ho(Ge(e))}function en(e,t,i){i===void 0&&(i=!1);const r=It(e),s=Ur(e),o=Wr(s);let a=s==="x"?r===(i?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[o]>t.floating[o]&&(a=Mi(a)),[a,Mi(a)]}function tn(e){const t=Mi(e);return[Ar(e),t,Ar(t)]}function Ar(e){return e.replace(/start|end/g,t=>Za[t])}const ys=["left","right"],ws=["right","left"],rn=["top","bottom"],sn=["bottom","top"];function on(e,t,i){switch(e){case"top":case"bottom":return i?t?ws:ys:t?ys:ws;case"left":case"right":return t?rn:sn;default:return[]}}function an(e,t,i,r){const s=It(e);let o=on(at(e),i==="start",r);return s&&(o=o.map(a=>a+"-"+s),t&&(o=o.concat(o.map(Ar)))),o}function Mi(e){return e.replace(/left|right|bottom|top/g,t=>Qa[t])}function nn(e){return{top:0,right:0,bottom:0,left:0,...e}}function po(e){return typeof e!="number"?nn(e):{top:e,right:e,bottom:e,left:e}}function Pi(e){const{x:t,y:i,width:r,height:s}=e;return{width:r,height:s,top:i,left:t,right:t+r,bottom:i+s,x:t,y:i}}function ks(e,t,i){let{reference:r,floating:s}=e;const o=Ge(t),a=Ur(t),n=Wr(a),d=at(t),c=o==="y",p=r.x+r.width/2-s.width/2,m=r.y+r.height/2-s.height/2,b=r[n]/2-s[n]/2;let f;switch(d){case"top":f={x:p,y:r.y-s.height};break;case"bottom":f={x:p,y:r.y+r.height};break;case"right":f={x:r.x+r.width,y:m};break;case"left":f={x:r.x-s.width,y:m};break;default:f={x:r.x,y:r.y}}switch(It(t)){case"start":f[a]-=b*(i&&c?-1:1);break;case"end":f[a]+=b*(i&&c?-1:1);break}return f}const ln=async(e,t,i)=>{const{placement:r="bottom",strategy:s="absolute",middleware:o=[],platform:a}=i,n=o.filter(Boolean),d=await(a.isRTL==null?void 0:a.isRTL(t));let c=await a.getElementRects({reference:e,floating:t,strategy:s}),{x:p,y:m}=ks(c,r,d),b=r,f={},g=0;for(let v=0;v<n.length;v++){const{name:k,fn:_}=n[v],{x:E,y:O,data:q,reset:j}=await _({x:p,y:m,initialPlacement:r,placement:b,strategy:s,middlewareData:f,rects:c,platform:a,elements:{reference:e,floating:t}});p=E??p,m=O??m,f={...f,[k]:{...f[k],...q}},j&&g<=50&&(g++,typeof j=="object"&&(j.placement&&(b=j.placement),j.rects&&(c=j.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:s}):j.rects),{x:p,y:m}=ks(c,b,d)),v=-1)}return{x:p,y:m,placement:b,strategy:s,middlewareData:f}};async function qr(e,t){var i;t===void 0&&(t={});const{x:r,y:s,platform:o,rects:a,elements:n,strategy:d}=e,{boundary:c="clippingAncestors",rootBoundary:p="viewport",elementContext:m="floating",altBoundary:b=!1,padding:f=0}=Pt(t,e),g=po(f),k=n[b?m==="floating"?"reference":"floating":m],_=Pi(await o.getClippingRect({element:(i=await(o.isElement==null?void 0:o.isElement(k)))==null||i?k:k.contextElement||await(o.getDocumentElement==null?void 0:o.getDocumentElement(n.floating)),boundary:c,rootBoundary:p,strategy:d})),E=m==="floating"?{x:r,y:s,width:a.floating.width,height:a.floating.height}:a.reference,O=await(o.getOffsetParent==null?void 0:o.getOffsetParent(n.floating)),q=await(o.isElement==null?void 0:o.isElement(O))?await(o.getScale==null?void 0:o.getScale(O))||{x:1,y:1}:{x:1,y:1},j=Pi(o.convertOffsetParentRelativeRectToViewportRelativeRect?await o.convertOffsetParentRelativeRectToViewportRelativeRect({elements:n,rect:E,offsetParent:O,strategy:d}):E);return{top:(_.top-j.top+g.top)/q.y,bottom:(j.bottom-_.bottom+g.bottom)/q.y,left:(_.left-j.left+g.left)/q.x,right:(j.right-_.right+g.right)/q.x}}const cn=e=>({name:"arrow",options:e,async fn(t){const{x:i,y:r,placement:s,rects:o,platform:a,elements:n,middlewareData:d}=t,{element:c,padding:p=0}=Pt(e,t)||{};if(c==null)return{};const m=po(p),b={x:i,y:r},f=Ur(s),g=Wr(f),v=await a.getDimensions(c),k=f==="y",_=k?"top":"left",E=k?"bottom":"right",O=k?"clientHeight":"clientWidth",q=o.reference[g]+o.reference[f]-b[f]-o.floating[g],j=b[f]-o.reference[f],ne=await(a.getOffsetParent==null?void 0:a.getOffsetParent(c));let W=ne?ne[O]:0;(!W||!await(a.isElement==null?void 0:a.isElement(ne)))&&(W=n.floating[O]||o.floating[g]);const Ue=q/2-j/2,Le=W/2-v[g]/2-1,_e=ot(m[_],Le),et=ot(m[E],Le),Fe=_e,tt=W-v[g]-et,le=W/2-v[g]/2+Ue,pt=zr(Fe,le,tt),qe=!d.arrow&&It(s)!=null&&le!==pt&&o.reference[g]/2-(le<Fe?_e:et)-v[g]/2<0,Se=qe?le<Fe?le-Fe:le-tt:0;return{[f]:b[f]+Se,data:{[f]:pt,centerOffset:le-pt-Se,...qe&&{alignmentOffset:Se}},reset:qe}}}),dn=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,r;const{placement:s,middlewareData:o,rects:a,initialPlacement:n,platform:d,elements:c}=t,{mainAxis:p=!0,crossAxis:m=!0,fallbackPlacements:b,fallbackStrategy:f="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:v=!0,...k}=Pt(e,t);if((i=o.arrow)!=null&&i.alignmentOffset)return{};const _=at(s),E=Ge(n),O=at(n)===n,q=await(d.isRTL==null?void 0:d.isRTL(c.floating)),j=b||(O||!v?[Mi(n)]:tn(n)),ne=g!=="none";!b&&ne&&j.push(...an(n,v,g,q));const W=[n,...j],Ue=await qr(t,k),Le=[];let _e=((r=o.flip)==null?void 0:r.overflows)||[];if(p&&Le.push(Ue[_]),m){const le=en(s,a,q);Le.push(Ue[le[0]],Ue[le[1]])}if(_e=[..._e,{placement:s,overflows:Le}],!Le.every(le=>le<=0)){var et,Fe;const le=(((et=o.flip)==null?void 0:et.index)||0)+1,pt=W[le];if(pt&&(!(m==="alignment"?E!==Ge(pt):!1)||_e.every(Ee=>Ge(Ee.placement)===E?Ee.overflows[0]>0:!0)))return{data:{index:le,overflows:_e},reset:{placement:pt}};let qe=(Fe=_e.filter(Se=>Se.overflows[0]<=0).sort((Se,Ee)=>Se.overflows[1]-Ee.overflows[1])[0])==null?void 0:Fe.placement;if(!qe)switch(f){case"bestFit":{var tt;const Se=(tt=_e.filter(Ee=>{if(ne){const it=Ge(Ee.placement);return it===E||it==="y"}return!0}).map(Ee=>[Ee.placement,Ee.overflows.filter(it=>it>0).reduce((it,da)=>it+da,0)]).sort((Ee,it)=>Ee[1]-it[1])[0])==null?void 0:tt[0];Se&&(qe=Se);break}case"initialPlacement":qe=n;break}if(s!==qe)return{reset:{placement:qe}}}return{}}}},un=new Set(["left","top"]);async function hn(e,t){const{placement:i,platform:r,elements:s}=e,o=await(r.isRTL==null?void 0:r.isRTL(s.floating)),a=at(i),n=It(i),d=Ge(i)==="y",c=un.has(a)?-1:1,p=o&&d?-1:1,m=Pt(t,e);let{mainAxis:b,crossAxis:f,alignmentAxis:g}=typeof m=="number"?{mainAxis:m,crossAxis:0,alignmentAxis:null}:{mainAxis:m.mainAxis||0,crossAxis:m.crossAxis||0,alignmentAxis:m.alignmentAxis};return n&&typeof g=="number"&&(f=n==="end"?g*-1:g),d?{x:f*p,y:b*c}:{x:b*c,y:f*p}}const pn=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var i,r;const{x:s,y:o,placement:a,middlewareData:n}=t,d=await hn(t,e);return a===((i=n.offset)==null?void 0:i.placement)&&(r=n.arrow)!=null&&r.alignmentOffset?{}:{x:s+d.x,y:o+d.y,data:{...d,placement:a}}}}},fn=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:r,placement:s}=t,{mainAxis:o=!0,crossAxis:a=!1,limiter:n={fn:k=>{let{x:_,y:E}=k;return{x:_,y:E}}},...d}=Pt(e,t),c={x:i,y:r},p=await qr(t,d),m=Ge(at(s)),b=ho(m);let f=c[b],g=c[m];if(o){const k=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=f+p[k],O=f-p[_];f=zr(E,f,O)}if(a){const k=m==="y"?"top":"left",_=m==="y"?"bottom":"right",E=g+p[k],O=g-p[_];g=zr(E,g,O)}const v=n.fn({...t,[b]:f,[m]:g});return{...v,data:{x:v.x-i,y:v.y-r,enabled:{[b]:o,[m]:a}}}}}},mn=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var i,r;const{placement:s,rects:o,platform:a,elements:n}=t,{apply:d=()=>{},...c}=Pt(e,t),p=await qr(t,c),m=at(s),b=It(s),f=Ge(s)==="y",{width:g,height:v}=o.floating;let k,_;m==="top"||m==="bottom"?(k=m,_=b===(await(a.isRTL==null?void 0:a.isRTL(n.floating))?"start":"end")?"left":"right"):(_=m,k=b==="end"?"top":"bottom");const E=v-p.top-p.bottom,O=g-p.left-p.right,q=ot(v-p[k],E),j=ot(g-p[_],O),ne=!t.middlewareData.shift;let W=q,Ue=j;if((i=t.middlewareData.shift)!=null&&i.enabled.x&&(Ue=O),(r=t.middlewareData.shift)!=null&&r.enabled.y&&(W=E),ne&&!b){const _e=me(p.left,0),et=me(p.right,0),Fe=me(p.top,0),tt=me(p.bottom,0);f?Ue=g-2*(_e!==0||et!==0?_e+et:me(p.left,p.right)):W=v-2*(Fe!==0||tt!==0?Fe+tt:me(p.top,p.bottom))}await d({...t,availableWidth:Ue,availableHeight:W});const Le=await a.getDimensions(n.floating);return g!==Le.width||v!==Le.height?{reset:{rects:!0}}:{}}}};function Qi(){return typeof window<"u"}function Lt(e){return fo(e)?(e.nodeName||"").toLowerCase():"#document"}function be(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ve(e){var t;return(t=(fo(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function fo(e){return Qi()?e instanceof Node||e instanceof be(e).Node:!1}function Oe(e){return Qi()?e instanceof Element||e instanceof be(e).Element:!1}function He(e){return Qi()?e instanceof HTMLElement||e instanceof be(e).HTMLElement:!1}function xs(e){return!Qi()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof be(e).ShadowRoot}const bn=new Set(["inline","contents"]);function ci(e){const{overflow:t,overflowX:i,overflowY:r,display:s}=Re(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+i)&&!bn.has(s)}const gn=new Set(["table","td","th"]);function vn(e){return gn.has(Lt(e))}const yn=[":popover-open",":modal"];function Zi(e){return yn.some(t=>{try{return e.matches(t)}catch{return!1}})}const wn=["transform","translate","scale","rotate","perspective"],kn=["transform","translate","scale","rotate","perspective","filter"],xn=["paint","layout","strict","content"];function Ji(e){const t=Yr(),i=Oe(e)?Re(e):e;return wn.some(r=>i[r]?i[r]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!t&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!t&&(i.filter?i.filter!=="none":!1)||kn.some(r=>(i.willChange||"").includes(r))||xn.some(r=>(i.contain||"").includes(r))}function _n(e){let t=nt(e);for(;He(t)&&!Dt(t);){if(Ji(t))return t;if(Zi(t))return null;t=nt(t)}return null}function Yr(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Cn=new Set(["html","body","#document"]);function Dt(e){return Cn.has(Lt(e))}function Re(e){return be(e).getComputedStyle(e)}function er(e){return Oe(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function nt(e){if(Lt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||xs(e)&&e.host||Ve(e);return xs(t)?t.host:t}function mo(e){const t=nt(e);return Dt(t)?e.ownerDocument?e.ownerDocument.body:e.body:He(t)&&ci(t)?t:mo(t)}function ii(e,t,i){var r;t===void 0&&(t=[]),i===void 0&&(i=!0);const s=mo(e),o=s===((r=e.ownerDocument)==null?void 0:r.body),a=be(s);if(o){const n=Dr(a);return t.concat(a,a.visualViewport||[],ci(s)?s:[],n&&i?ii(n):[])}return t.concat(s,ii(s,[],i))}function Dr(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function bo(e){const t=Re(e);let i=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const s=He(e),o=s?e.offsetWidth:i,a=s?e.offsetHeight:r,n=Ri(i)!==o||Ri(r)!==a;return n&&(i=o,r=a),{width:i,height:r,$:n}}function Kr(e){return Oe(e)?e:e.contextElement}function At(e){const t=Kr(e);if(!He(t))return Be(1);const i=t.getBoundingClientRect(),{width:r,height:s,$:o}=bo(t);let a=(o?Ri(i.width):i.width)/r,n=(o?Ri(i.height):i.height)/s;return(!a||!Number.isFinite(a))&&(a=1),(!n||!Number.isFinite(n))&&(n=1),{x:a,y:n}}const $n=Be(0);function go(e){const t=be(e);return!Yr()||!t.visualViewport?$n:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Tn(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==be(e)?!1:t}function yt(e,t,i,r){t===void 0&&(t=!1),i===void 0&&(i=!1);const s=e.getBoundingClientRect(),o=Kr(e);let a=Be(1);t&&(r?Oe(r)&&(a=At(r)):a=At(e));const n=Tn(o,i,r)?go(o):Be(0);let d=(s.left+n.x)/a.x,c=(s.top+n.y)/a.y,p=s.width/a.x,m=s.height/a.y;if(o){const b=be(o),f=r&&Oe(r)?be(r):r;let g=b,v=Dr(g);for(;v&&r&&f!==g;){const k=At(v),_=v.getBoundingClientRect(),E=Re(v),O=_.left+(v.clientLeft+parseFloat(E.paddingLeft))*k.x,q=_.top+(v.clientTop+parseFloat(E.paddingTop))*k.y;d*=k.x,c*=k.y,p*=k.x,m*=k.y,d+=O,c+=q,g=be(v),v=Dr(g)}}return Pi({width:p,height:m,x:d,y:c})}function tr(e,t){const i=er(e).scrollLeft;return t?t.left+i:yt(Ve(e)).left+i}function vo(e,t){const i=e.getBoundingClientRect(),r=i.left+t.scrollLeft-tr(e,i),s=i.top+t.scrollTop;return{x:r,y:s}}function Sn(e){let{elements:t,rect:i,offsetParent:r,strategy:s}=e;const o=s==="fixed",a=Ve(r),n=t?Zi(t.floating):!1;if(r===a||n&&o)return i;let d={scrollLeft:0,scrollTop:0},c=Be(1);const p=Be(0),m=He(r);if((m||!m&&!o)&&((Lt(r)!=="body"||ci(a))&&(d=er(r)),He(r))){const f=yt(r);c=At(r),p.x=f.x+r.clientLeft,p.y=f.y+r.clientTop}const b=a&&!m&&!o?vo(a,d):Be(0);return{width:i.width*c.x,height:i.height*c.y,x:i.x*c.x-d.scrollLeft*c.x+p.x+b.x,y:i.y*c.y-d.scrollTop*c.y+p.y+b.y}}function En(e){return Array.from(e.getClientRects())}function zn(e){const t=Ve(e),i=er(e),r=e.ownerDocument.body,s=me(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),o=me(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let a=-i.scrollLeft+tr(e);const n=-i.scrollTop;return Re(r).direction==="rtl"&&(a+=me(t.clientWidth,r.clientWidth)-s),{width:s,height:o,x:a,y:n}}const _s=25;function An(e,t){const i=be(e),r=Ve(e),s=i.visualViewport;let o=r.clientWidth,a=r.clientHeight,n=0,d=0;if(s){o=s.width,a=s.height;const p=Yr();(!p||p&&t==="fixed")&&(n=s.offsetLeft,d=s.offsetTop)}const c=tr(r);if(c<=0){const p=r.ownerDocument,m=p.body,b=getComputedStyle(m),f=p.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(r.clientWidth-m.clientWidth-f);g<=_s&&(o-=g)}else c<=_s&&(o+=c);return{width:o,height:a,x:n,y:d}}const Dn=new Set(["absolute","fixed"]);function On(e,t){const i=yt(e,!0,t==="fixed"),r=i.top+e.clientTop,s=i.left+e.clientLeft,o=He(e)?At(e):Be(1),a=e.clientWidth*o.x,n=e.clientHeight*o.y,d=s*o.x,c=r*o.y;return{width:a,height:n,x:d,y:c}}function Cs(e,t,i){let r;if(t==="viewport")r=An(e,i);else if(t==="document")r=zn(Ve(e));else if(Oe(t))r=On(t,i);else{const s=go(e);r={x:t.x-s.x,y:t.y-s.y,width:t.width,height:t.height}}return Pi(r)}function yo(e,t){const i=nt(e);return i===t||!Oe(i)||Dt(i)?!1:Re(i).position==="fixed"||yo(i,t)}function Rn(e,t){const i=t.get(e);if(i)return i;let r=ii(e,[],!1).filter(n=>Oe(n)&&Lt(n)!=="body"),s=null;const o=Re(e).position==="fixed";let a=o?nt(e):e;for(;Oe(a)&&!Dt(a);){const n=Re(a),d=Ji(a);!d&&n.position==="fixed"&&(s=null),(o?!d&&!s:!d&&n.position==="static"&&!!s&&Dn.has(s.position)||ci(a)&&!d&&yo(e,a))?r=r.filter(p=>p!==a):s=n,a=nt(a)}return t.set(e,r),r}function Mn(e){let{element:t,boundary:i,rootBoundary:r,strategy:s}=e;const a=[...i==="clippingAncestors"?Zi(t)?[]:Rn(t,this._c):[].concat(i),r],n=a[0],d=a.reduce((c,p)=>{const m=Cs(t,p,s);return c.top=me(m.top,c.top),c.right=ot(m.right,c.right),c.bottom=ot(m.bottom,c.bottom),c.left=me(m.left,c.left),c},Cs(t,n,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Pn(e){const{width:t,height:i}=bo(e);return{width:t,height:i}}function In(e,t,i){const r=He(t),s=Ve(t),o=i==="fixed",a=yt(e,!0,o,t);let n={scrollLeft:0,scrollTop:0};const d=Be(0);function c(){d.x=tr(s)}if(r||!r&&!o)if((Lt(t)!=="body"||ci(s))&&(n=er(t)),r){const f=yt(t,!0,o,t);d.x=f.x+t.clientLeft,d.y=f.y+t.clientTop}else s&&c();o&&!r&&s&&c();const p=s&&!r&&!o?vo(s,n):Be(0),m=a.left+n.scrollLeft-d.x-p.x,b=a.top+n.scrollTop-d.y-p.y;return{x:m,y:b,width:a.width,height:a.height}}function gr(e){return Re(e).position==="static"}function $s(e,t){if(!He(e)||Re(e).position==="fixed")return null;if(t)return t(e);let i=e.offsetParent;return Ve(e)===i&&(i=i.ownerDocument.body),i}function wo(e,t){const i=be(e);if(Zi(e))return i;if(!He(e)){let s=nt(e);for(;s&&!Dt(s);){if(Oe(s)&&!gr(s))return s;s=nt(s)}return i}let r=$s(e,t);for(;r&&vn(r)&&gr(r);)r=$s(r,t);return r&&Dt(r)&&gr(r)&&!Ji(r)?i:r||_n(e)||i}const Ln=async function(e){const t=this.getOffsetParent||wo,i=this.getDimensions,r=await i(e.floating);return{reference:In(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function Fn(e){return Re(e).direction==="rtl"}const Ei={convertOffsetParentRelativeRectToViewportRelativeRect:Sn,getDocumentElement:Ve,getClippingRect:Mn,getOffsetParent:wo,getElementRects:Ln,getClientRects:En,getDimensions:Pn,getScale:At,isElement:Oe,isRTL:Fn};function ko(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Nn(e,t){let i=null,r;const s=Ve(e);function o(){var n;clearTimeout(r),(n=i)==null||n.disconnect(),i=null}function a(n,d){n===void 0&&(n=!1),d===void 0&&(d=1),o();const c=e.getBoundingClientRect(),{left:p,top:m,width:b,height:f}=c;if(n||t(),!b||!f)return;const g=yi(m),v=yi(s.clientWidth-(p+b)),k=yi(s.clientHeight-(m+f)),_=yi(p),O={rootMargin:-g+"px "+-v+"px "+-k+"px "+-_+"px",threshold:me(0,ot(1,d))||1};let q=!0;function j(ne){const W=ne[0].intersectionRatio;if(W!==d){if(!q)return a();W?a(!1,W):r=setTimeout(()=>{a(!1,1e-7)},1e3)}W===1&&!ko(c,e.getBoundingClientRect())&&a(),q=!1}try{i=new IntersectionObserver(j,{...O,root:s.ownerDocument})}catch{i=new IntersectionObserver(j,O)}i.observe(e)}return a(!0),o}function Bn(e,t,i,r){r===void 0&&(r={});const{ancestorScroll:s=!0,ancestorResize:o=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:n=typeof IntersectionObserver=="function",animationFrame:d=!1}=r,c=Kr(e),p=s||o?[...c?ii(c):[],...ii(t)]:[];p.forEach(_=>{s&&_.addEventListener("scroll",i,{passive:!0}),o&&_.addEventListener("resize",i)});const m=c&&n?Nn(c,i):null;let b=-1,f=null;a&&(f=new ResizeObserver(_=>{let[E]=_;E&&E.target===c&&f&&(f.unobserve(t),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var O;(O=f)==null||O.observe(t)})),i()}),c&&!d&&f.observe(c),f.observe(t));let g,v=d?yt(e):null;d&&k();function k(){const _=yt(e);v&&!ko(v,_)&&i(),v=_,g=requestAnimationFrame(k)}return i(),()=>{var _;p.forEach(E=>{s&&E.removeEventListener("scroll",i),o&&E.removeEventListener("resize",i)}),m==null||m(),(_=f)==null||_.disconnect(),f=null,d&&cancelAnimationFrame(g)}}const Hn=pn,jn=fn,Vn=dn,Ts=mn,Wn=cn,Un=(e,t,i)=>{const r=new Map,s={platform:Ei,...i},o={...s.platform,_c:r};return ln(e,t,{...s,platform:o})};function qn(e){return Yn(e)}function vr(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Yn(e){for(let t=e;t;t=vr(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=vr(e);t;t=vr(t)){if(!(t instanceof Element))continue;const i=getComputedStyle(t);if(i.display!=="contents"&&(i.position!=="static"||Ji(i)||t.tagName==="BODY"))return t}return null}function Kn(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var F=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let r=0,s=0,o=0,a=0,n=0,d=0,c=0,p=0;i?e.top<t.top?(r=e.left,s=e.bottom,o=e.right,a=e.bottom,n=t.left,d=t.top,c=t.right,p=t.top):(r=t.left,s=t.bottom,o=t.right,a=t.bottom,n=e.left,d=e.top,c=e.right,p=e.top):e.left<t.left?(r=e.right,s=e.top,o=t.left,a=t.top,n=e.right,d=e.bottom,c=t.left,p=t.bottom):(r=t.right,s=t.top,o=e.left,a=e.top,n=t.right,d=t.bottom,c=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${r}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${o}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${c}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||Kn(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Bn(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[Hn({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(Ts({apply:({rects:i})=>{const r=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=r?`${i.reference.width}px`:"",this.popup.style.height=s?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(Vn({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(jn({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(Ts({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:r})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${r}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(Wn({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?i=>Ei.getOffsetParent(i,qn):Ei.getOffsetParent;Un(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:ni(Ze({},Ei),{getOffsetParent:t})}).then(({x:i,y:r,middlewareData:s,placement:o})=>{const a=this.localize.dir()==="rtl",n={top:"bottom",right:"left",bottom:"top",left:"right"}[o.split("-")[0]];if(this.setAttribute("data-current-placement",o),Object.assign(this.popup.style,{left:`${i}px`,top:`${r}px`}),this.arrow){const d=s.arrow.x,c=s.arrow.y;let p="",m="",b="",f="";if(this.arrowPlacement==="start"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",m=a?g:"",f=a?"":g}else if(this.arrowPlacement==="end"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";m=a?"":g,f=a?g:"",b=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(f=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof c=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(f=typeof d=="number"?`${d}px`:"",p=typeof c=="number"?`${c}px`:"");Object.assign(this.arrowEl.style,{top:p,right:m,bottom:b,left:f,[n]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return u`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${P({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${P({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?u`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};F.styles=[H,Xa];l([C(".popup")],F.prototype,"popup",2);l([C(".popup__arrow")],F.prototype,"arrowEl",2);l([h()],F.prototype,"anchor",2);l([h({type:Boolean,reflect:!0})],F.prototype,"active",2);l([h({reflect:!0})],F.prototype,"placement",2);l([h({reflect:!0})],F.prototype,"strategy",2);l([h({type:Number})],F.prototype,"distance",2);l([h({type:Number})],F.prototype,"skidding",2);l([h({type:Boolean})],F.prototype,"arrow",2);l([h({attribute:"arrow-placement"})],F.prototype,"arrowPlacement",2);l([h({attribute:"arrow-padding",type:Number})],F.prototype,"arrowPadding",2);l([h({type:Boolean})],F.prototype,"flip",2);l([h({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],F.prototype,"flipFallbackPlacements",2);l([h({attribute:"flip-fallback-strategy"})],F.prototype,"flipFallbackStrategy",2);l([h({type:Object})],F.prototype,"flipBoundary",2);l([h({attribute:"flip-padding",type:Number})],F.prototype,"flipPadding",2);l([h({type:Boolean})],F.prototype,"shift",2);l([h({type:Object})],F.prototype,"shiftBoundary",2);l([h({attribute:"shift-padding",type:Number})],F.prototype,"shiftPadding",2);l([h({attribute:"auto-size"})],F.prototype,"autoSize",2);l([h()],F.prototype,"sync",2);l([h({type:Object})],F.prototype,"autoSizeBoundary",2);l([h({attribute:"auto-size-padding",type:Number})],F.prototype,"autoSizePadding",2);l([h({attribute:"hover-bridge",type:Boolean})],F.prototype,"hoverBridge",2);var xo=new Map,Gn=new WeakMap;function Xn(e){return e??{keyframes:[],options:{duration:0}}}function Ss(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function B(e,t){xo.set(e,Xn(t))}function Y(e,t,i){const r=Gn.get(e);if(r!=null&&r[t])return Ss(r[t],i.dir);const s=xo.get(t);return s?Ss(s,i.dir):{keyframes:[],options:{duration:0}}}function pe(e,t){return new Promise(i=>{function r(s){s.target===e&&(e.removeEventListener(t,r),i())}e.addEventListener(t,r)})}function K(e,t,i){return new Promise(r=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=e.animate(t,ni(Ze({},i),{duration:Qn()?0:i.duration}));s.addEventListener("cancel",r,{once:!0}),s.addEventListener("finish",r,{once:!0})})}function Es(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function Qn(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function Z(e){return Promise.all(e.getAnimations().map(t=>new Promise(i=>{t.cancel(),requestAnimationFrame(i)})))}function zs(e,t){return e.map(i=>ni(Ze({},i),{height:i.height==="auto"?`${t}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Or=class extends Gi{constructor(t){if(super(t),this.it=y,t.type!==Ke.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===y||t==null)return this._t=void 0,this.it=t;if(t===Et)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};Or.directiveName="unsafeHTML",Or.resultType=1;const _o=Ki(Or);var z=class extends I{constructor(){super(...arguments),this.formControlController=new li(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Je(this,"help-text","label"),this.localize=new oe(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>u`
      <sl-tag
        part="tag"
        exportparts="
              base:tag__base,
              content:tag__content,
              remove-button:tag__remove-button,
              remove-button__base:tag__remove-button__base
            "
        ?pill=${this.pill}
        size=${this.size}
        removable
        @sl-remove=${t=>this.handleTagRemove(t,e)}
      >
        ${e.getTextLabel()}
      </sl-tag>
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,i=t.closest(".select__clear")!==null,r=t.closest("sl-icon-button")!==null;if(!(i||r)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const s=this.getAllOptions(),o=s.indexOf(this.currentOption);let a=Math.max(0,o);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(a=o+1,a>s.length-1&&(a=0)):e.key==="ArrowUp"?(a=o-1,a<0&&(a=s.length-1)):e.key==="Home"?a=0:e.key==="End"&&(a=s.length-1),this.setCurrentOption(s[a])}if(e.key&&e.key.length===1||e.key==="Backspace"){const s=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const o of s)if(o.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(o);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const i=e.composedPath().some(r=>r instanceof Element&&r.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const i=e.target.closest("sl-option"),r=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==r&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(t)?t:[t],r=[];e.forEach(s=>r.push(s.value)),this.setSelectedOptions(e.filter(s=>i.includes(s.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),i=Array.isArray(e)?e:[e];t.forEach(r=>r.selected=!1),i.length&&i.forEach(r=>r.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,i;const r=this.getAllOptions();this.selectedOptions=r.filter(o=>o.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(o=>o.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const o=this.selectedOptions[0];this.value=(e=o==null?void 0:o.value)!=null?e:"",this.displayLabel=(i=(t=o==null?void 0:o.getTextLabel)==null?void 0:t.call(o))!=null?i:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(e,t);return u`<div @sl-remove=${r=>this.handleTagRemove(r,e)}>
          ${typeof i=="string"?_o(i):i}
        </div>`}else if(t===this.maxOptionsVisible)return u`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return u``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,i){if(super.attributeChangedCallback(e,t,i),e==="value"){const r=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=r}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(i=>t.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await Z(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=Y(this,"select.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.currentOption&&Er(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Z(this);const{keyframes:e,options:t}=Y(this,"select.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,pe(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,pe(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,r=this.helpText?!0:!!t,s=this.clearable&&!this.disabled&&this.value.length>0,o=this.placeholder&&this.value&&this.value.length<=0;return u`
      <div
        part="form-control"
        class=${P({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":r})}
      >
        <label
          id="label"
          part="form-control-label"
          class="form-control__label"
          aria-hidden=${i?"false":"true"}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <sl-popup
            class=${P({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":o,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
            placement=${this.placement}
            strategy=${this.hoist?"fixed":"absolute"}
            flip
            shift
            sync="width"
            auto-size="vertical"
            auto-size-padding="10"
          >
            <div
              part="combobox"
              class="select__combobox"
              slot="anchor"
              @keydown=${this.handleComboboxKeyDown}
              @mousedown=${this.handleComboboxMouseDown}
            >
              <slot part="prefix" name="prefix" class="select__prefix"></slot>

              <input
                part="display-input"
                class="select__display-input"
                type="text"
                placeholder=${this.placeholder}
                .disabled=${this.disabled}
                .value=${this.displayLabel}
                autocomplete="off"
                spellcheck="false"
                autocapitalize="off"
                readonly
                aria-controls="listbox"
                aria-expanded=${this.open?"true":"false"}
                aria-haspopup="listbox"
                aria-labelledby="label"
                aria-disabled=${this.disabled?"true":"false"}
                aria-describedby="help-text"
                role="combobox"
                tabindex="0"
                @focus=${this.handleFocus}
                @blur=${this.handleBlur}
              />

              ${this.multiple?u`<div part="tags" class="select__tags">${this.tags}</div>`:""}

              <input
                class="select__value-input"
                type="text"
                ?disabled=${this.disabled}
                ?required=${this.required}
                .value=${Array.isArray(this.value)?this.value.join(", "):this.value}
                tabindex="-1"
                aria-hidden="true"
                @focus=${()=>this.focus()}
                @invalid=${this.handleInvalid}
              />

              ${s?u`
                    <button
                      part="clear-button"
                      class="select__clear"
                      type="button"
                      aria-label=${this.localize.term("clearEntry")}
                      @mousedown=${this.handleClearMouseDown}
                      @click=${this.handleClearClick}
                      tabindex="-1"
                    >
                      <slot name="clear-icon">
                        <sl-icon name="x-circle-fill" library="system"></sl-icon>
                      </slot>
                    </button>
                  `:""}

              <slot name="suffix" part="suffix" class="select__suffix"></slot>

              <slot name="expand-icon" part="expand-icon" class="select__expand-icon">
                <sl-icon library="system" name="chevron-down"></sl-icon>
              </slot>
            </div>

            <div
              id="listbox"
              role="listbox"
              aria-expanded=${this.open?"true":"false"}
              aria-multiselectable=${this.multiple?"true":"false"}
              aria-labelledby="label"
              part="listbox"
              class="select__listbox"
              tabindex="-1"
              @mouseup=${this.handleOptionClick}
              @slotchange=${this.handleDefaultSlotChange}
            >
              <slot></slot>
            </div>
          </sl-popup>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};z.styles=[H,Xi,qa];z.dependencies={"sl-icon":te,"sl-popup":F,"sl-tag":_t};l([C(".select")],z.prototype,"popup",2);l([C(".select__combobox")],z.prototype,"combobox",2);l([C(".select__display-input")],z.prototype,"displayInput",2);l([C(".select__value-input")],z.prototype,"valueInput",2);l([C(".select__listbox")],z.prototype,"listbox",2);l([w()],z.prototype,"hasFocus",2);l([w()],z.prototype,"displayLabel",2);l([w()],z.prototype,"currentOption",2);l([w()],z.prototype,"selectedOptions",2);l([w()],z.prototype,"valueHasChanged",2);l([h()],z.prototype,"name",2);l([w()],z.prototype,"value",1);l([h({attribute:"value"})],z.prototype,"defaultValue",2);l([h({reflect:!0})],z.prototype,"size",2);l([h()],z.prototype,"placeholder",2);l([h({type:Boolean,reflect:!0})],z.prototype,"multiple",2);l([h({attribute:"max-options-visible",type:Number})],z.prototype,"maxOptionsVisible",2);l([h({type:Boolean,reflect:!0})],z.prototype,"disabled",2);l([h({type:Boolean})],z.prototype,"clearable",2);l([h({type:Boolean,reflect:!0})],z.prototype,"open",2);l([h({type:Boolean})],z.prototype,"hoist",2);l([h({type:Boolean,reflect:!0})],z.prototype,"filled",2);l([h({type:Boolean,reflect:!0})],z.prototype,"pill",2);l([h()],z.prototype,"label",2);l([h({reflect:!0})],z.prototype,"placement",2);l([h({attribute:"help-text"})],z.prototype,"helpText",2);l([h({reflect:!0})],z.prototype,"form",2);l([h({type:Boolean,reflect:!0})],z.prototype,"required",2);l([h()],z.prototype,"getTag",2);l([S("disabled",{waitUntilFirstUpdate:!0})],z.prototype,"handleDisabledChange",1);l([S(["defaultValue","value"],{waitUntilFirstUpdate:!0})],z.prototype,"handleValueChange",1);l([S("open",{waitUntilFirstUpdate:!0})],z.prototype,"handleOpenChange",1);B("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});z.define("sl-select");var Zn=T`
  :host {
    display: block;
    user-select: none;
    -webkit-user-select: none;
  }

  :host(:focus) {
    outline: none;
  }

  .option {
    position: relative;
    display: flex;
    align-items: center;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-letter-spacing-normal);
    color: var(--sl-color-neutral-700);
    padding: var(--sl-spacing-x-small) var(--sl-spacing-medium) var(--sl-spacing-x-small) var(--sl-spacing-x-small);
    transition: var(--sl-transition-fast) fill;
    cursor: pointer;
  }

  .option--hover:not(.option--current):not(.option--disabled) {
    background-color: var(--sl-color-neutral-100);
    color: var(--sl-color-neutral-1000);
  }

  .option--current,
  .option--current.option--disabled {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
    opacity: 1;
  }

  .option--disabled {
    outline: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option__label {
    flex: 1 1 auto;
    display: inline-block;
    line-height: var(--sl-line-height-dense);
  }

  .option .option__check {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    padding-inline-end: var(--sl-spacing-2x-small);
  }

  .option--selected .option__check {
    visibility: visible;
  }

  .option__prefix,
  .option__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .option__prefix::slotted(*) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .option__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  @media (forced-colors: active) {
    :host(:hover:not([aria-disabled='true'])) .option {
      outline: dashed 1px SelectedItem;
      outline-offset: -1px;
    }
  }
`,Te=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(t+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(t+=i.textContent)}),t.trim()}render(){return u`
      <div
        part="base"
        class=${P({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};Te.styles=[H,Zn];Te.dependencies={"sl-icon":te};l([C(".option__label")],Te.prototype,"defaultSlot",2);l([w()],Te.prototype,"current",2);l([w()],Te.prototype,"selected",2);l([w()],Te.prototype,"hasHover",2);l([h({reflect:!0})],Te.prototype,"value",2);l([h({type:Boolean,reflect:!0})],Te.prototype,"disabled",2);l([S("disabled")],Te.prototype,"handleDisabledChange",1);l([S("selected")],Te.prototype,"handleSelectedChange",1);l([S("value")],Te.prototype,"handleValueChange",1);Te.define("sl-option");var Jn=T`
  :host {
    --size: 25rem;
    --header-spacing: var(--sl-spacing-large);
    --body-spacing: var(--sl-spacing-large);
    --footer-spacing: var(--sl-spacing-large);

    display: contents;
  }

  .drawer {
    top: 0;
    inset-inline-start: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }

  .drawer--contained {
    position: absolute;
    z-index: initial;
  }

  .drawer--fixed {
    position: fixed;
    z-index: var(--sl-z-index-drawer);
  }

  .drawer__panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    z-index: 2;
    max-width: 100%;
    max-height: 100%;
    background-color: var(--sl-panel-background-color);
    box-shadow: var(--sl-shadow-x-large);
    overflow: auto;
    pointer-events: all;
  }

  .drawer__panel:focus {
    outline: none;
  }

  .drawer--top .drawer__panel {
    top: 0;
    inset-inline-end: auto;
    bottom: auto;
    inset-inline-start: 0;
    width: 100%;
    height: var(--size);
  }

  .drawer--end .drawer__panel {
    top: 0;
    inset-inline-end: 0;
    bottom: auto;
    inset-inline-start: auto;
    width: var(--size);
    height: 100%;
  }

  .drawer--bottom .drawer__panel {
    top: auto;
    inset-inline-end: auto;
    bottom: 0;
    inset-inline-start: 0;
    width: 100%;
    height: var(--size);
  }

  .drawer--start .drawer__panel {
    top: 0;
    inset-inline-end: auto;
    bottom: auto;
    inset-inline-start: 0;
    width: var(--size);
    height: 100%;
  }

  .drawer__header {
    display: flex;
  }

  .drawer__title {
    flex: 1 1 auto;
    font: inherit;
    font-size: var(--sl-font-size-large);
    line-height: var(--sl-line-height-dense);
    padding: var(--header-spacing);
    margin: 0;
  }

  .drawer__header-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--sl-spacing-2x-small);
    padding: 0 var(--header-spacing);
  }

  .drawer__header-actions sl-icon-button,
  .drawer__header-actions ::slotted(sl-icon-button) {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
  }

  .drawer__body {
    flex: 1 1 auto;
    display: block;
    padding: var(--body-spacing);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .drawer__footer {
    text-align: right;
    padding: var(--footer-spacing);
  }

  .drawer__footer ::slotted(sl-button:not(:last-of-type)) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .drawer:not(.drawer--has-footer) .drawer__footer {
    display: none;
  }

  .drawer__overlay {
    display: block;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--sl-overlay-background-color);
    pointer-events: all;
  }

  .drawer--contained .drawer__overlay {
    display: none;
  }

  @media (forced-colors: active) {
    .drawer__panel {
      border: solid 1px var(--sl-color-neutral-0);
    }
  }
`;function*Gr(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*$a(Gr(e.shadowRoot.activeElement))))}function Co(){return[...Gr()].pop()}var As=new WeakMap;function $o(e){let t=As.get(e);return t||(t=window.getComputedStyle(e,null),As.set(e,t)),t}function el(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=$o(e);return t.visibility!=="hidden"&&t.display!=="none"}function tl(e){const t=$o(e),{overflowY:i,overflowX:r}=t;return i==="scroll"||r==="scroll"?!0:i!=="auto"||r!=="auto"?!1:e.scrollHeight>e.clientHeight&&i==="auto"||e.scrollWidth>e.clientWidth&&r==="auto"}function il(e){const t=e.tagName.toLowerCase(),i=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const o=e.getRootNode(),a=`input[type='radio'][name="${e.getAttribute("name")}"]`,n=o.querySelector(`${a}:checked`);return n?n===e:o.querySelector(a)===e}return el(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:tl(e):!1}function rl(e){var t,i;const r=Rr(e),s=(t=r[0])!=null?t:null,o=(i=r[r.length-1])!=null?i:null;return{start:s,end:o}}function sl(e,t){var i;return((i=e.getRootNode({composed:!0}))==null?void 0:i.host)!==t}function Rr(e){const t=new WeakMap,i=[];function r(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||t.has(s))return;t.set(s,!0),!i.includes(s)&&il(s)&&i.push(s),s instanceof HTMLSlotElement&&sl(s,e)&&s.assignedElements({flatten:!0}).forEach(o=>{r(o)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&r(s.shadowRoot)}for(const o of s.children)r(o)}return r(e),i.sort((s,o)=>{const a=Number(s.getAttribute("tabindex"))||0;return(Number(o.getAttribute("tabindex"))||0)-a})}var qt=[],To=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var i;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const r=Co();if(this.previousFocus=r,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=Rr(this.element);let o=s.findIndex(n=>n===r);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){o+a>=s.length?o=0:o+a<0?o=s.length-1:o+=a,this.previousFocus=this.currentFocus;const n=s[o];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||n&&this.possiblyHasTabbableChildren(n))return;t.preventDefault(),this.currentFocus=n,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...Gr()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){qt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){qt=qt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return qt[qt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=Rr(this.element);if(!this.element.matches(":focus-within")){const t=e[0],i=e[e.length-1],r=this.tabDirection==="forward"?t:i;typeof(r==null?void 0:r.focus)=="function"&&(this.currentFocus=r,r.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},Xr=e=>{var t;const{activeElement:i}=document;i&&e.contains(i)&&((t=document.activeElement)==null||t.blur())};function Ds(e){return e.charAt(0).toUpperCase()+e.slice(1)}var ve=class extends I{constructor(){super(...arguments),this.hasSlotController=new Je(this,"footer"),this.localize=new oe(this),this.modal=new To(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Zt(this)))}disconnectedCallback(){super.disconnectedCallback(),Jt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=Y(this,"drawer.denyClose",{dir:this.localize.dir()});K(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Zt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Z(this.drawer),Z(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=Y(this,`drawer.show${Ds(this.placement)}`,{dir:this.localize.dir()}),i=Y(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Xr(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Jt(this)),await Promise.all([Z(this.drawer),Z(this.overlay)]);const e=Y(this,`drawer.hide${Ds(this.placement)}`,{dir:this.localize.dir()}),t=Y(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Zt(this)),this.open&&this.contained&&(this.modal.deactivate(),Jt(this))}async show(){if(!this.open)return this.open=!0,pe(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,pe(this,"sl-after-hide")}render(){return u`
      <div
        part="base"
        class=${P({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="drawer__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${x(this.noHeader?this.label:void 0)}
          aria-labelledby=${x(this.noHeader?void 0:"title")}
          tabindex="0"
        >
          ${this.noHeader?"":u`
                <header part="header" class="drawer__header">
                  <h2 part="title" class="drawer__title" id="title">
                    <!-- If there's no label, use an invisible character to prevent the header from collapsing -->
                    <slot name="label"> ${this.label.length>0?this.label:"\uFEFF"} </slot>
                  </h2>
                  <div part="header-actions" class="drawer__header-actions">
                    <slot name="header-actions"></slot>
                    <sl-icon-button
                      part="close-button"
                      exportparts="base:close-button__base"
                      class="drawer__close"
                      name="x-lg"
                      label=${this.localize.term("close")}
                      library="system"
                      @click=${()=>this.requestClose("close-button")}
                    ></sl-icon-button>
                  </div>
                </header>
              `}

          <slot part="body" class="drawer__body"></slot>

          <footer part="footer" class="drawer__footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `}};ve.styles=[H,Jn];ve.dependencies={"sl-icon-button":X};l([C(".drawer")],ve.prototype,"drawer",2);l([C(".drawer__panel")],ve.prototype,"panel",2);l([C(".drawer__overlay")],ve.prototype,"overlay",2);l([h({type:Boolean,reflect:!0})],ve.prototype,"open",2);l([h({reflect:!0})],ve.prototype,"label",2);l([h({reflect:!0})],ve.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],ve.prototype,"contained",2);l([h({attribute:"no-header",type:Boolean,reflect:!0})],ve.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],ve.prototype,"handleOpenChange",1);l([S("contained",{waitUntilFirstUpdate:!0})],ve.prototype,"handleNoModalChange",1);B("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});B("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});B("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});B("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});B("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});B("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});ve.define("sl-drawer");var ol=T`
  :host {
    --width: 31rem;
    --header-spacing: var(--sl-spacing-large);
    --body-spacing: var(--sl-spacing-large);
    --footer-spacing: var(--sl-spacing-large);

    display: contents;
  }

  .dialog {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: var(--sl-z-index-dialog);
  }

  .dialog__panel {
    display: flex;
    flex-direction: column;
    z-index: 2;
    width: var(--width);
    max-width: calc(100% - var(--sl-spacing-2x-large));
    max-height: calc(100% - var(--sl-spacing-2x-large));
    background-color: var(--sl-panel-background-color);
    border-radius: var(--sl-border-radius-medium);
    box-shadow: var(--sl-shadow-x-large);
  }

  .dialog__panel:focus {
    outline: none;
  }

  /* Ensure there's enough vertical padding for phones that don't update vh when chrome appears (e.g. iPhone) */
  @media screen and (max-width: 420px) {
    .dialog__panel {
      max-height: 80vh;
    }
  }

  .dialog--open .dialog__panel {
    display: flex;
    opacity: 1;
  }

  .dialog__header {
    flex: 0 0 auto;
    display: flex;
  }

  .dialog__title {
    flex: 1 1 auto;
    font: inherit;
    font-size: var(--sl-font-size-large);
    line-height: var(--sl-line-height-dense);
    padding: var(--header-spacing);
    margin: 0;
  }

  .dialog__header-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--sl-spacing-2x-small);
    padding: 0 var(--header-spacing);
  }

  .dialog__header-actions sl-icon-button,
  .dialog__header-actions ::slotted(sl-icon-button) {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
  }

  .dialog__body {
    flex: 1 1 auto;
    display: block;
    padding: var(--body-spacing);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dialog__footer {
    flex: 0 0 auto;
    text-align: right;
    padding: var(--footer-spacing);
  }

  .dialog__footer ::slotted(sl-button:not(:first-of-type)) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  .dialog:not(.dialog--has-footer) .dialog__footer {
    display: none;
  }

  .dialog__overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--sl-overlay-background-color);
  }

  @media (forced-colors: active) {
    .dialog__panel {
      border: solid 1px var(--sl-color-neutral-0);
    }
  }
`,We=class extends I{constructor(){super(...arguments),this.hasSlotController=new Je(this,"footer"),this.localize=new oe(this),this.modal=new To(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Zt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Jt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=Y(this,"dialog.denyClose",{dir:this.localize.dir()});K(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Zt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Z(this.dialog),Z(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=Y(this,"dialog.show",{dir:this.localize.dir()}),i=Y(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Xr(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([Z(this.dialog),Z(this.overlay)]);const e=Y(this,"dialog.hide",{dir:this.localize.dir()}),t=Y(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Jt(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,pe(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,pe(this,"sl-after-hide")}render(){return u`
      <div
        part="base"
        class=${P({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="dialog__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${x(this.noHeader?this.label:void 0)}
          aria-labelledby=${x(this.noHeader?void 0:"title")}
          tabindex="-1"
        >
          ${this.noHeader?"":u`
                <header part="header" class="dialog__header">
                  <h2 part="title" class="dialog__title" id="title">
                    <slot name="label"> ${this.label.length>0?this.label:"\uFEFF"} </slot>
                  </h2>
                  <div part="header-actions" class="dialog__header-actions">
                    <slot name="header-actions"></slot>
                    <sl-icon-button
                      part="close-button"
                      exportparts="base:close-button__base"
                      class="dialog__close"
                      name="x-lg"
                      label=${this.localize.term("close")}
                      library="system"
                      @click="${()=>this.requestClose("close-button")}"
                    ></sl-icon-button>
                  </div>
                </header>
              `}
          ${""}
          <div part="body" class="dialog__body" tabindex="-1"><slot></slot></div>

          <footer part="footer" class="dialog__footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `}};We.styles=[H,ol];We.dependencies={"sl-icon-button":X};l([C(".dialog")],We.prototype,"dialog",2);l([C(".dialog__panel")],We.prototype,"panel",2);l([C(".dialog__overlay")],We.prototype,"overlay",2);l([h({type:Boolean,reflect:!0})],We.prototype,"open",2);l([h({reflect:!0})],We.prototype,"label",2);l([h({attribute:"no-header",type:Boolean,reflect:!0})],We.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],We.prototype,"handleOpenChange",1);B("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});B("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});B("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});We.define("sl-dialog");var al=T`
  :host {
    display: inline-flex;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: max(12px, 0.75em);
    font-weight: var(--sl-font-weight-semibold);
    letter-spacing: var(--sl-letter-spacing-normal);
    line-height: 1;
    border-radius: var(--sl-border-radius-small);
    border: solid 1px var(--sl-color-neutral-0);
    white-space: nowrap;
    padding: 0.35em 0.6em;
    user-select: none;
    -webkit-user-select: none;
    cursor: inherit;
  }

  /* Variant modifiers */
  .badge--primary {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--success {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--neutral {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--warning {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--danger {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /* Pill modifier */
  .badge--pill {
    border-radius: var(--sl-border-radius-pill);
  }

  /* Pulse modifier */
  .badge--pulse {
    animation: pulse 1.5s infinite;
  }

  .badge--pulse.badge--primary {
    --pulse-color: var(--sl-color-primary-600);
  }

  .badge--pulse.badge--success {
    --pulse-color: var(--sl-color-success-600);
  }

  .badge--pulse.badge--neutral {
    --pulse-color: var(--sl-color-neutral-600);
  }

  .badge--pulse.badge--warning {
    --pulse-color: var(--sl-color-warning-600);
  }

  .badge--pulse.badge--danger {
    --pulse-color: var(--sl-color-danger-600);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 var(--pulse-color);
    }
    70% {
      box-shadow: 0 0 0 0.5rem transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
`,di=class extends I{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return u`
      <span
        part="base"
        class=${P({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};di.styles=[H,al];l([h({reflect:!0})],di.prototype,"variant",2);l([h({type:Boolean,reflect:!0})],di.prototype,"pill",2);l([h({type:Boolean,reflect:!0})],di.prototype,"pulse",2);di.define("sl-badge");var nl=T`
  :host {
    display: contents;

    /* For better DX, we'll reset the margin here so the base part can inherit it */
    margin: 0;
  }

  .alert {
    position: relative;
    display: flex;
    align-items: stretch;
    background-color: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-top-width: calc(var(--sl-panel-border-width) * 3);
    border-radius: var(--sl-border-radius-medium);
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-normal);
    line-height: 1.6;
    color: var(--sl-color-neutral-700);
    margin: inherit;
    overflow: hidden;
  }

  .alert:not(.alert--has-icon) .alert__icon,
  .alert:not(.alert--closable) .alert__close-button {
    display: none;
  }

  .alert__icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-large);
    padding-inline-start: var(--sl-spacing-large);
  }

  .alert--has-countdown {
    border-bottom: none;
  }

  .alert--primary {
    border-top-color: var(--sl-color-primary-600);
  }

  .alert--primary .alert__icon {
    color: var(--sl-color-primary-600);
  }

  .alert--success {
    border-top-color: var(--sl-color-success-600);
  }

  .alert--success .alert__icon {
    color: var(--sl-color-success-600);
  }

  .alert--neutral {
    border-top-color: var(--sl-color-neutral-600);
  }

  .alert--neutral .alert__icon {
    color: var(--sl-color-neutral-600);
  }

  .alert--warning {
    border-top-color: var(--sl-color-warning-600);
  }

  .alert--warning .alert__icon {
    color: var(--sl-color-warning-600);
  }

  .alert--danger {
    border-top-color: var(--sl-color-danger-600);
  }

  .alert--danger .alert__icon {
    color: var(--sl-color-danger-600);
  }

  .alert__message {
    flex: 1 1 auto;
    display: block;
    padding: var(--sl-spacing-large);
    overflow: hidden;
  }

  .alert__close-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
    margin-inline-end: var(--sl-spacing-medium);
    align-self: center;
  }

  .alert__countdown {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(var(--sl-panel-border-width) * 3);
    background-color: var(--sl-panel-border-color);
    display: flex;
  }

  .alert__countdown--ltr {
    justify-content: flex-end;
  }

  .alert__countdown .alert__countdown-elapsed {
    height: 100%;
    width: 0;
  }

  .alert--primary .alert__countdown-elapsed {
    background-color: var(--sl-color-primary-600);
  }

  .alert--success .alert__countdown-elapsed {
    background-color: var(--sl-color-success-600);
  }

  .alert--neutral .alert__countdown-elapsed {
    background-color: var(--sl-color-neutral-600);
  }

  .alert--warning .alert__countdown-elapsed {
    background-color: var(--sl-color-warning-600);
  }

  .alert--danger .alert__countdown-elapsed {
    background-color: var(--sl-color-danger-600);
  }

  .alert__timer {
    display: none;
  }
`,ye=class ft extends I{constructor(){super(...arguments),this.hasSlotController=new Je(this,"icon","suffix"),this.localize=new oe(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,i="100%",r="0";this.countdownAnimation=t.animate([{width:i},{width:r}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await Z(this.base),this.base.hidden=!1;const{keyframes:t,options:i}=Y(this,"alert.show",{dir:this.localize.dir()});await K(this.base,t,i),this.emit("sl-after-show")}else{Xr(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await Z(this.base);const{keyframes:t,options:i}=Y(this,"alert.hide",{dir:this.localize.dir()});await K(this.base,t,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,pe(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,pe(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),ft.toastStack.parentElement===null&&document.body.append(ft.toastStack),ft.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{ft.toastStack.removeChild(this),t(),ft.toastStack.querySelector("sl-alert")===null&&ft.toastStack.remove()},{once:!0})})}render(){return u`
      <div
        part="base"
        class=${P({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
        role="alert"
        aria-hidden=${this.open?"false":"true"}
        @mouseenter=${this.pauseAutoHide}
        @mouseleave=${this.resumeAutoHide}
      >
        <div part="icon" class="alert__icon">
          <slot name="icon"></slot>
        </div>

        <div part="message" class="alert__message" aria-live="polite">
          <slot></slot>
        </div>

        ${this.closable?u`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                class="alert__close-button"
                name="x-lg"
                library="system"
                label=${this.localize.term("close")}
                @click=${this.handleCloseClick}
              ></sl-icon-button>
            `:""}

        <div role="timer" class="alert__timer">${this.remainingTime}</div>

        ${this.countdown?u`
              <div
                class=${P({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};ye.styles=[H,nl];ye.dependencies={"sl-icon-button":X};l([C('[part~="base"]')],ye.prototype,"base",2);l([C(".alert__countdown-elapsed")],ye.prototype,"countdownElement",2);l([h({type:Boolean,reflect:!0})],ye.prototype,"open",2);l([h({type:Boolean,reflect:!0})],ye.prototype,"closable",2);l([h({reflect:!0})],ye.prototype,"variant",2);l([h({type:Number})],ye.prototype,"duration",2);l([h({type:String,reflect:!0})],ye.prototype,"countdown",2);l([w()],ye.prototype,"remainingTime",2);l([S("open",{waitUntilFirstUpdate:!0})],ye.prototype,"handleOpenChange",1);l([S("duration")],ye.prototype,"handleDurationChange",1);var ll=ye;B("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});ll.define("sl-alert");var cl=T`
  :host {
    display: block;
  }

  .textarea {
    display: grid;
    align-items: center;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
    cursor: text;
  }

  /* Standard textareas */
  .textarea--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .textarea--standard:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }
  .textarea--standard:hover:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-hover);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    color: var(--sl-input-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-focus);
  }

  .textarea--standard.textarea--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control,
  .textarea__size-adjuster {
    grid-area: 1 / 1 / 2 / 2;
  }

  .textarea__size-adjuster {
    visibility: hidden;
    pointer-events: none;
    opacity: 0;
  }

  .textarea--standard.textarea--disabled .textarea__control {
    color: var(--sl-input-color-disabled);
  }

  .textarea--standard.textarea--disabled .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled textareas */
  .textarea--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .textarea--filled:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .textarea--filled.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .textarea--filled.textarea--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.4;
    color: var(--sl-input-color);
    border: none;
    background: none;
    box-shadow: none;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .textarea__control::-webkit-search-decoration,
  .textarea__control::-webkit-search-cancel-button,
  .textarea__control::-webkit-search-results-button,
  .textarea__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .textarea__control:focus {
    outline: none;
  }

  /*
   * Size modifiers
   */

  .textarea--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
  }

  .textarea--small .textarea__control {
    padding: 0.5em var(--sl-input-spacing-small);
  }

  .textarea--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .textarea--medium .textarea__control {
    padding: 0.5em var(--sl-input-spacing-medium);
  }

  .textarea--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
  }

  .textarea--large .textarea__control {
    padding: 0.5em var(--sl-input-spacing-large);
  }

  /*
   * Resize types
   */

  .textarea--resize-none .textarea__control {
    resize: none;
  }

  .textarea--resize-vertical .textarea__control {
    resize: vertical;
  }

  .textarea--resize-auto .textarea__control {
    height: auto;
    resize: none;
    overflow-y: hidden;
  }
`,D=class extends I{constructor(){super(...arguments),this.formControlController=new li(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Je(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,r="preserve"){const s=t??this.input.selectionStart,o=i??this.input.selectionEnd;this.input.setRangeText(e,s,o,r),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,r=this.helpText?!0:!!t;return u`
      <div
        part="form-control"
        class=${P({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":r})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${i?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${P({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${Oi(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${x(this.placeholder)}
              rows=${x(this.rows)}
              minlength=${x(this.minlength)}
              maxlength=${x(this.maxlength)}
              autocapitalize=${x(this.autocapitalize)}
              autocorrect=${x(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${x(this.spellcheck)}
              enterkeyhint=${x(this.enterkeyhint)}
              inputmode=${x(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            ></textarea>
            <!-- This "adjuster" exists to prevent layout shifting. https://github.com/shoelace-style/shoelace/issues/2180 -->
            <div part="textarea-adjuster" class="textarea__size-adjuster" ?hidden=${this.resize!=="auto"}></div>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};D.styles=[H,Xi,cl];l([C(".textarea__control")],D.prototype,"input",2);l([C(".textarea__size-adjuster")],D.prototype,"sizeAdjuster",2);l([w()],D.prototype,"hasFocus",2);l([h()],D.prototype,"title",2);l([h()],D.prototype,"name",2);l([h()],D.prototype,"value",2);l([h({reflect:!0})],D.prototype,"size",2);l([h({type:Boolean,reflect:!0})],D.prototype,"filled",2);l([h()],D.prototype,"label",2);l([h({attribute:"help-text"})],D.prototype,"helpText",2);l([h()],D.prototype,"placeholder",2);l([h({type:Number})],D.prototype,"rows",2);l([h()],D.prototype,"resize",2);l([h({type:Boolean,reflect:!0})],D.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],D.prototype,"readonly",2);l([h({reflect:!0})],D.prototype,"form",2);l([h({type:Boolean,reflect:!0})],D.prototype,"required",2);l([h({type:Number})],D.prototype,"minlength",2);l([h({type:Number})],D.prototype,"maxlength",2);l([h()],D.prototype,"autocapitalize",2);l([h()],D.prototype,"autocorrect",2);l([h()],D.prototype,"autocomplete",2);l([h({type:Boolean})],D.prototype,"autofocus",2);l([h()],D.prototype,"enterkeyhint",2);l([h({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],D.prototype,"spellcheck",2);l([h()],D.prototype,"inputmode",2);l([Vr()],D.prototype,"defaultValue",2);l([S("disabled",{waitUntilFirstUpdate:!0})],D.prototype,"handleDisabledChange",1);l([S("rows",{waitUntilFirstUpdate:!0})],D.prototype,"handleRowsChange",1);l([S("value",{waitUntilFirstUpdate:!0})],D.prototype,"handleValueChange",1);D.define("sl-textarea");var dl=T`
  :host {
    display: inline-block;
  }

  .dropdown::part(popup) {
    z-index: var(--sl-z-index-dropdown);
  }

  .dropdown[data-current-placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .dropdown[data-current-placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  .dropdown[data-current-placement^='left']::part(popup) {
    transform-origin: right;
  }

  .dropdown[data-current-placement^='right']::part(popup) {
    transform-origin: left;
  }

  .dropdown__trigger {
    display: block;
  }

  .dropdown__panel {
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    box-shadow: var(--sl-shadow-large);
    border-radius: var(--sl-border-radius-medium);
    pointer-events: none;
  }

  .dropdown--open .dropdown__panel {
    display: block;
    pointer-events: all;
  }

  /* When users slot a menu, make sure it conforms to the popup's auto-size */
  ::slotted(sl-menu) {
    max-width: var(--auto-size-available-width) !important;
    max-height: var(--auto-size-available-height) !important;
  }
`,ae=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(r,s)=>{if(!r)return null;const o=r.closest(s);if(o)return o;const a=r.getRootNode();return a instanceof ShadowRoot?i(a.host,s):null};setTimeout(()=>{var r;const s=((r=this.containingElement)==null?void 0:r.getRootNode())instanceof ShadowRoot?Co():document.activeElement;(!this.containingElement||i(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const i=t.getAllItems(),r=i[0],s=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(r),r.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(r=>rl(r).start);let i;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=t.button;break;default:i=t}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,pe(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,pe(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await Z(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=Y(this,"dropdown.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Z(this);const{keyframes:e,options:t}=Y(this,"dropdown.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return u`
      <sl-popup
        part="base"
        exportparts="popup:base__popup"
        id="dropdown"
        placement=${this.placement}
        distance=${this.distance}
        skidding=${this.skidding}
        strategy=${this.hoist?"fixed":"absolute"}
        flip
        shift
        auto-size="vertical"
        auto-size-padding="10"
        sync=${x(this.sync?this.sync:void 0)}
        class=${P({dropdown:!0,"dropdown--open":this.open})}
      >
        <slot
          name="trigger"
          slot="anchor"
          part="trigger"
          class="dropdown__trigger"
          @click=${this.handleTriggerClick}
          @keydown=${this.handleTriggerKeyDown}
          @keyup=${this.handleTriggerKeyUp}
          @slotchange=${this.handleTriggerSlotChange}
        ></slot>

        <div aria-hidden=${this.open?"false":"true"} aria-labelledby="dropdown">
          <slot part="panel" class="dropdown__panel"></slot>
        </div>
      </sl-popup>
    `}};ae.styles=[H,dl];ae.dependencies={"sl-popup":F};l([C(".dropdown")],ae.prototype,"popup",2);l([C(".dropdown__trigger")],ae.prototype,"trigger",2);l([C(".dropdown__panel")],ae.prototype,"panel",2);l([h({type:Boolean,reflect:!0})],ae.prototype,"open",2);l([h({reflect:!0})],ae.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],ae.prototype,"disabled",2);l([h({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],ae.prototype,"stayOpenOnSelect",2);l([h({attribute:!1})],ae.prototype,"containingElement",2);l([h({type:Number})],ae.prototype,"distance",2);l([h({type:Number})],ae.prototype,"skidding",2);l([h({type:Boolean})],ae.prototype,"hoist",2);l([h({reflect:!0})],ae.prototype,"sync",2);l([S("open",{waitUntilFirstUpdate:!0})],ae.prototype,"handleOpenChange",1);B("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});ae.define("sl-dropdown");var ul=T`
  :host {
    display: block;
    position: relative;
    background: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-radius: var(--sl-border-radius-medium);
    padding: var(--sl-spacing-x-small) 0;
    overflow: auto;
    overscroll-behavior: none;
  }

  ::slotted(sl-divider) {
    --spacing: var(--sl-spacing-x-small);
  }
`,Qr=class extends I{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],i=e.composedPath(),r=i.find(n=>{var d;return t.includes(((d=n==null?void 0:n.getAttribute)==null?void 0:d.call(n,"role"))||"")});if(!r||i.find(n=>{var d;return((d=n==null?void 0:n.getAttribute)==null?void 0:d.call(n,"role"))==="menu"})!==this)return;const a=r;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),i=this.getCurrentItem();let r=i?t.indexOf(i):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?r++:e.key==="ArrowUp"?r--:e.key==="Home"?r=0:e.key==="End"&&(r=t.length-1),r<0&&(r=t.length-1),r>t.length-1&&(r=0),this.setCurrentItem(t[r]),t[r].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===e?"0":"-1")})}render(){return u`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Qr.styles=[H,ul];l([C("slot")],Qr.prototype,"defaultSlot",2);Qr.define("sl-menu");var hl=T`
  :host {
    --submenu-offset: -2px;

    display: block;
  }

  :host([inert]) {
    display: none;
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: stretch;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-letter-spacing-normal);
    color: var(--sl-color-neutral-700);
    padding: var(--sl-spacing-2x-small) var(--sl-spacing-2x-small);
    transition: var(--sl-transition-fast) fill;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    cursor: pointer;
  }

  .menu-item.menu-item--disabled {
    outline: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item.menu-item--loading {
    outline: none;
    cursor: wait;
  }

  .menu-item.menu-item--loading *:not(sl-spinner) {
    opacity: 0.5;
  }

  .menu-item--loading sl-spinner {
    --indicator-color: currentColor;
    --track-width: 1px;
    position: absolute;
    font-size: 0.75em;
    top: calc(50% - 0.5em);
    left: 0.65rem;
    opacity: 1;
  }

  .menu-item .menu-item__label {
    flex: 1 1 auto;
    display: inline-block;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .menu-item .menu-item__prefix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .menu-item .menu-item__prefix::slotted(*) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .menu-item .menu-item__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .menu-item .menu-item__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  /* Safe triangle */
  .menu-item--submenu-expanded::after {
    content: '';
    position: fixed;
    z-index: calc(var(--sl-z-index-dropdown) - 1);
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    clip-path: polygon(
      var(--safe-triangle-cursor-x, 0) var(--safe-triangle-cursor-y, 0),
      var(--safe-triangle-submenu-start-x, 0) var(--safe-triangle-submenu-start-y, 0),
      var(--safe-triangle-submenu-end-x, 0) var(--safe-triangle-submenu-end-y, 0)
    );
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:hover:not([aria-disabled='true'], :focus-visible)) .menu-item,
  .menu-item--submenu-expanded {
    background-color: var(--sl-color-neutral-100);
    color: var(--sl-color-neutral-1000);
  }

  :host(:focus-visible) .menu-item {
    outline: none;
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
    opacity: 1;
  }

  .menu-item .menu-item__check,
  .menu-item .menu-item__chevron {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    visibility: hidden;
  }

  .menu-item--checked .menu-item__check,
  .menu-item--has-submenu .menu-item__chevron {
    visibility: visible;
  }

  /* Add elevation and z-index to submenus */
  sl-popup::part(popup) {
    box-shadow: var(--sl-shadow-large);
    z-index: var(--sl-z-index-dropdown);
    margin-left: var(--submenu-offset);
  }

  .menu-item--rtl sl-popup::part(popup) {
    margin-left: calc(-1 * var(--submenu-offset));
  }

  @media (forced-colors: active) {
    :host(:hover:not([aria-disabled='true'])) .menu-item,
    :host(:focus-visible) .menu-item {
      outline: dashed 1px SelectedItem;
      outline-offset: -1px;
    }
  }

  ::slotted(sl-menu) {
    max-width: var(--auto-size-available-width) !important;
    max-height: var(--auto-size-available-height) !important;
  }
`;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ei=(e,t)=>{var r;const i=e._$AN;if(i===void 0)return!1;for(const s of i)(r=s._$AO)==null||r.call(s,t,!1),ei(s,t);return!0},Ii=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while((i==null?void 0:i.size)===0)},So=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),ml(t)}};function pl(e){this._$AN!==void 0?(Ii(this),this._$AM=e,So(this)):this._$AM=e}function fl(e,t=!1,i=0){const r=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(t)if(Array.isArray(r))for(let o=i;o<r.length;o++)ei(r[o],!1),Ii(r[o]);else r!=null&&(ei(r,!1),Ii(r));else ei(this,e)}const ml=e=>{e.type==Ke.CHILD&&(e._$AP??(e._$AP=fl),e._$AQ??(e._$AQ=pl))};class bl extends Gi{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,r){super._$AT(t,i,r),So(this),this.isConnected=t._$AU}_$AO(t,i=!0){var r,s;t!==this.isConnected&&(this.isConnected=t,t?(r=this.reconnected)==null||r.call(this):(s=this.disconnected)==null||s.call(this)),i&&(ei(this,t),Ii(this))}setValue(t){if(co(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const gl=()=>new vl;class vl{}const yr=new WeakMap,yl=Ki(class extends bl{render(e){return y}update(e,[t]){var r;const i=t!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=(r=e.options)==null?void 0:r.host,this.rt(this.ct=e.element)),y}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=yr.get(t);i===void 0&&(i=new WeakMap,yr.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=yr.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var wl=class{constructor(e,t){this.popupRef=gl(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var r;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(r=i.target.role)!=null&&r.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),r=i==null?void 0:i.assignedElements({flatten:!0}).filter(c=>c.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!r)return;const{left:o,top:a,width:n,height:d}=r.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?o+n:o}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?o+n:o}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+d}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const r of t.assignedElements())if(i=r.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let r=1;r!==i.length;++r)i[r].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),r=["padding-top","border-top-width","margin-top"].reduce((s,o)=>{var a;const n=(a=t.get(o))!=null?a:new CSSUnitValue(0,"px"),c=(n instanceof CSSUnitValue?n:new CSSUnitValue(0,"px")).to("px");return s-c.value},0);this.skidding=r}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?u`
      <sl-popup
        ${yl(this.popupRef)}
        placement=${e?"left-start":"right-start"}
        anchor="anchor"
        flip
        flip-fallback-strategy="best-fit"
        skidding="${this.skidding}"
        strategy="fixed"
        auto-size="vertical"
        auto-size-padding="10"
      >
        <slot name="submenu"></slot>
      </sl-popup>
    `:u` <slot name="submenu" hidden></slot> `}},we=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new Je(this,"submenu"),this.submenuController=new wl(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Ea(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return u`
      <div
        id="anchor"
        part="base"
        class=${P({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
        ?aria-haspopup="${this.isSubmenu()}"
        ?aria-expanded="${!!t}"
      >
        <span part="checked-icon" class="menu-item__check">
          <sl-icon name="check" library="system" aria-hidden="true"></sl-icon>
        </span>

        <slot name="prefix" part="prefix" class="menu-item__prefix"></slot>

        <slot part="label" class="menu-item__label" @slotchange=${this.handleDefaultSlotChange}></slot>

        <slot name="suffix" part="suffix" class="menu-item__suffix"></slot>

        <span part="submenu-icon" class="menu-item__chevron">
          <sl-icon name=${e?"chevron-left":"chevron-right"} library="system" aria-hidden="true"></sl-icon>
        </span>

        ${this.submenuController.renderSubmenu()}
        ${this.loading?u` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};we.styles=[H,hl];we.dependencies={"sl-icon":te,"sl-popup":F,"sl-spinner":Yi};l([C("slot:not([name])")],we.prototype,"defaultSlot",2);l([C(".menu-item")],we.prototype,"menuItem",2);l([h()],we.prototype,"type",2);l([h({type:Boolean,reflect:!0})],we.prototype,"checked",2);l([h()],we.prototype,"value",2);l([h({type:Boolean,reflect:!0})],we.prototype,"loading",2);l([h({type:Boolean,reflect:!0})],we.prototype,"disabled",2);l([S("checked")],we.prototype,"handleCheckedChange",1);l([S("disabled")],we.prototype,"handleDisabledChange",1);l([S("type")],we.prototype,"handleTypeChange",1);we.define("sl-menu-item");te.define("sl-icon");var kl=T`
  :host {
    --color: var(--sl-panel-border-color);
    --width: var(--sl-panel-border-width);
    --spacing: var(--sl-spacing-medium);
  }

  :host(:not([vertical])) {
    display: block;
    border-top: solid var(--width) var(--color);
    margin: var(--spacing) 0;
  }

  :host([vertical]) {
    display: inline-block;
    height: 100%;
    border-left: solid var(--width) var(--color);
    margin: 0 var(--spacing);
  }
`,ir=class extends I{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};ir.styles=[H,kl];l([h({type:Boolean,reflect:!0})],ir.prototype,"vertical",2);l([S("vertical")],ir.prototype,"handleVerticalChange",1);ir.define("sl-divider");var xl=T`
  :host {
    --max-width: 20rem;
    --hide-delay: 0ms;
    --show-delay: 150ms;

    display: contents;
  }

  .tooltip {
    --arrow-size: var(--sl-tooltip-arrow-size);
    --arrow-color: var(--sl-tooltip-background-color);
  }

  .tooltip::part(popup) {
    z-index: var(--sl-z-index-tooltip);
  }

  .tooltip[placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .tooltip[placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  .tooltip[placement^='left']::part(popup) {
    transform-origin: right;
  }

  .tooltip[placement^='right']::part(popup) {
    transform-origin: left;
  }

  .tooltip__body {
    display: block;
    width: max-content;
    max-width: var(--max-width);
    border-radius: var(--sl-tooltip-border-radius);
    background-color: var(--sl-tooltip-background-color);
    font-family: var(--sl-tooltip-font-family);
    font-size: var(--sl-tooltip-font-size);
    font-weight: var(--sl-tooltip-font-weight);
    line-height: var(--sl-tooltip-line-height);
    text-align: start;
    white-space: normal;
    color: var(--sl-tooltip-color);
    padding: var(--sl-tooltip-padding);
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  }
`,ie=class extends I{constructor(){super(),this.localize=new oe(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=Es(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=Es(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await Z(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:r}=Y(this,"tooltip.show",{dir:this.localize.dir()});await K(this.popup.popup,i,r),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await Z(this.body);const{keyframes:i,options:r}=Y(this,"tooltip.hide",{dir:this.localize.dir()});await K(this.popup.popup,i,r),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,pe(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,pe(this,"sl-after-hide")}render(){return u`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${P({tooltip:!0,"tooltip--open":this.open})}
        placement=${this.placement}
        distance=${this.distance}
        skidding=${this.skidding}
        strategy=${this.hoist?"fixed":"absolute"}
        flip
        shift
        arrow
        hover-bridge
      >
        ${""}
        <slot slot="anchor" aria-describedby="tooltip"></slot>

        ${""}
        <div part="body" id="tooltip" class="tooltip__body" role="tooltip" aria-live=${this.open?"polite":"off"}>
          <slot name="content">${this.content}</slot>
        </div>
      </sl-popup>
    `}};ie.styles=[H,xl];ie.dependencies={"sl-popup":F};l([C("slot:not([name])")],ie.prototype,"defaultSlot",2);l([C(".tooltip__body")],ie.prototype,"body",2);l([C("sl-popup")],ie.prototype,"popup",2);l([h()],ie.prototype,"content",2);l([h()],ie.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"disabled",2);l([h({type:Number})],ie.prototype,"distance",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"open",2);l([h({type:Number})],ie.prototype,"skidding",2);l([h()],ie.prototype,"trigger",2);l([h({type:Boolean})],ie.prototype,"hoist",2);l([S("open",{waitUntilFirstUpdate:!0})],ie.prototype,"handleOpenChange",1);l([S(["content","distance","hoist","placement","skidding"])],ie.prototype,"handleOptionsChange",1);l([S("disabled")],ie.prototype,"handleDisabledChange",1);B("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});B("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});ie.define("sl-tooltip");var _l=T`
  :host {
    display: inline-block;
  }

  .checkbox {
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    color: var(--sl-input-label-color);
    vertical-align: middle;
    cursor: pointer;
  }

  .checkbox--small {
    --toggle-size: var(--sl-toggle-size-small);
    font-size: var(--sl-input-font-size-small);
  }

  .checkbox--medium {
    --toggle-size: var(--sl-toggle-size-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .checkbox--large {
    --toggle-size: var(--sl-toggle-size-large);
    font-size: var(--sl-input-font-size-large);
  }

  .checkbox__control {
    flex: 0 0 auto;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--toggle-size);
    height: var(--toggle-size);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
    border-radius: 2px;
    background-color: var(--sl-input-background-color);
    color: var(--sl-color-neutral-0);
    transition:
      var(--sl-transition-fast) border-color,
      var(--sl-transition-fast) background-color,
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) box-shadow;
  }

  .checkbox__input {
    position: absolute;
    opacity: 0;
    padding: 0;
    margin: 0;
    pointer-events: none;
  }

  .checkbox__checked-icon,
  .checkbox__indeterminate-icon {
    display: inline-flex;
    width: var(--toggle-size);
    height: var(--toggle-size);
  }

  /* Hover */
  .checkbox:not(.checkbox--checked):not(.checkbox--disabled) .checkbox__control:hover {
    border-color: var(--sl-input-border-color-hover);
    background-color: var(--sl-input-background-color-hover);
  }

  /* Focus */
  .checkbox:not(.checkbox--checked):not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Checked/indeterminate */
  .checkbox--checked .checkbox__control,
  .checkbox--indeterminate .checkbox__control {
    border-color: var(--sl-color-primary-600);
    background-color: var(--sl-color-primary-600);
  }

  /* Checked/indeterminate + hover */
  .checkbox.checkbox--checked:not(.checkbox--disabled) .checkbox__control:hover,
  .checkbox.checkbox--indeterminate:not(.checkbox--disabled) .checkbox__control:hover {
    border-color: var(--sl-color-primary-500);
    background-color: var(--sl-color-primary-500);
  }

  /* Checked/indeterminate + focus */
  .checkbox.checkbox--checked:not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control,
  .checkbox.checkbox--indeterminate:not(.checkbox--disabled) .checkbox__input:focus-visible ~ .checkbox__control {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Disabled */
  .checkbox--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    line-height: var(--toggle-size);
    margin-inline-start: 0.5em;
    user-select: none;
    -webkit-user-select: none;
  }

  :host([required]) .checkbox__label::after {
    content: var(--sl-input-required-content);
    color: var(--sl-input-required-content-color);
    margin-inline-start: var(--sl-input-required-content-offset);
  }
`,ee=class extends I{constructor(){super(...arguments),this.formControlController=new li(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new Je(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return u`
      <div
        class=${P({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${P({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${Oi(this.indeterminate)}
            .checked=${Oi(this.checked)}
            .disabled=${this.disabled}
            .required=${this.required}
            aria-checked=${this.checked?"true":"false"}
            aria-describedby="help-text"
            @click=${this.handleClick}
            @input=${this.handleInput}
            @invalid=${this.handleInvalid}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
          />

          <span
            part="control${this.checked?" control--checked":""}${this.indeterminate?" control--indeterminate":""}"
            class="checkbox__control"
          >
            ${this.checked?u`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?u`
                  <sl-icon
                    part="indeterminate-icon"
                    class="checkbox__indeterminate-icon"
                    library="system"
                    name="indeterminate"
                  ></sl-icon>
                `:""}
          </span>

          <div part="label" class="checkbox__label">
            <slot></slot>
          </div>
        </label>

        <div
          aria-hidden=${t?"false":"true"}
          class="form-control__help-text"
          id="help-text"
          part="form-control-help-text"
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};ee.styles=[H,Xi,_l];ee.dependencies={"sl-icon":te};l([C('input[type="checkbox"]')],ee.prototype,"input",2);l([w()],ee.prototype,"hasFocus",2);l([h()],ee.prototype,"title",2);l([h()],ee.prototype,"name",2);l([h()],ee.prototype,"value",2);l([h({reflect:!0})],ee.prototype,"size",2);l([h({type:Boolean,reflect:!0})],ee.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],ee.prototype,"checked",2);l([h({type:Boolean,reflect:!0})],ee.prototype,"indeterminate",2);l([Vr("checked")],ee.prototype,"defaultChecked",2);l([h({reflect:!0})],ee.prototype,"form",2);l([h({type:Boolean,reflect:!0})],ee.prototype,"required",2);l([h({attribute:"help-text"})],ee.prototype,"helpText",2);l([S("disabled",{waitUntilFirstUpdate:!0})],ee.prototype,"handleDisabledChange",1);l([S(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],ee.prototype,"handleStateChange",1);ee.define("sl-checkbox");var Cl=T`
  :host {
    --indicator-color: var(--sl-color-primary-600);
    --track-color: var(--sl-color-neutral-200);
    --track-width: 2px;

    display: block;
  }

  .tab-group {
    display: flex;
    border-radius: 0;
  }

  .tab-group__tabs {
    display: flex;
    position: relative;
  }

  .tab-group__indicator {
    position: absolute;
    transition:
      var(--sl-transition-fast) translate ease,
      var(--sl-transition-fast) width ease;
  }

  .tab-group--has-scroll-controls .tab-group__nav-container {
    position: relative;
    padding: 0 var(--sl-spacing-x-large);
  }

  .tab-group--has-scroll-controls .tab-group__scroll-button--start--hidden,
  .tab-group--has-scroll-controls .tab-group__scroll-button--end--hidden {
    visibility: hidden;
  }

  .tab-group__body {
    display: block;
    overflow: auto;
  }

  .tab-group__scroll-button {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--sl-spacing-x-large);
  }

  .tab-group__scroll-button--start {
    left: 0;
  }

  .tab-group__scroll-button--end {
    right: 0;
  }

  .tab-group--rtl .tab-group__scroll-button--start {
    left: auto;
    right: 0;
  }

  .tab-group--rtl .tab-group__scroll-button--end {
    left: 0;
    right: auto;
  }

  /*
   * Top
   */

  .tab-group--top {
    flex-direction: column;
  }

  .tab-group--top .tab-group__nav-container {
    order: 1;
  }

  .tab-group--top .tab-group__nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group--top .tab-group__nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group--top .tab-group__tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-bottom: solid var(--track-width) var(--track-color);
  }

  .tab-group--top .tab-group__indicator {
    bottom: calc(-1 * var(--track-width));
    border-bottom: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--top .tab-group__body {
    order: 2;
  }

  .tab-group--top ::slotted(sl-tab-panel) {
    --padding: var(--sl-spacing-medium) 0;
  }

  /*
   * Bottom
   */

  .tab-group--bottom {
    flex-direction: column;
  }

  .tab-group--bottom .tab-group__nav-container {
    order: 2;
  }

  .tab-group--bottom .tab-group__nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group--bottom .tab-group__nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group--bottom .tab-group__tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-top: solid var(--track-width) var(--track-color);
  }

  .tab-group--bottom .tab-group__indicator {
    top: calc(-1 * var(--track-width));
    border-top: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--bottom .tab-group__body {
    order: 1;
  }

  .tab-group--bottom ::slotted(sl-tab-panel) {
    --padding: var(--sl-spacing-medium) 0;
  }

  /*
   * Start
   */

  .tab-group--start {
    flex-direction: row;
  }

  .tab-group--start .tab-group__nav-container {
    order: 1;
  }

  .tab-group--start .tab-group__tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-inline-end: solid var(--track-width) var(--track-color);
  }

  .tab-group--start .tab-group__indicator {
    right: calc(-1 * var(--track-width));
    border-right: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--start.tab-group--rtl .tab-group__indicator {
    right: auto;
    left: calc(-1 * var(--track-width));
  }

  .tab-group--start .tab-group__body {
    flex: 1 1 auto;
    order: 2;
  }

  .tab-group--start ::slotted(sl-tab-panel) {
    --padding: 0 var(--sl-spacing-medium);
  }

  /*
   * End
   */

  .tab-group--end {
    flex-direction: row;
  }

  .tab-group--end .tab-group__nav-container {
    order: 2;
  }

  .tab-group--end .tab-group__tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-left: solid var(--track-width) var(--track-color);
  }

  .tab-group--end .tab-group__indicator {
    left: calc(-1 * var(--track-width));
    border-inline-start: solid var(--track-width) var(--indicator-color);
  }

  .tab-group--end.tab-group--rtl .tab-group__indicator {
    right: calc(-1 * var(--track-width));
    left: auto;
  }

  .tab-group--end .tab-group__body {
    flex: 1 1 auto;
    order: 1;
  }

  .tab-group--end ::slotted(sl-tab-panel) {
    --padding: 0 var(--sl-spacing-medium);
  }
`,$l=T`
  :host {
    display: contents;
  }
`,rr=class extends I{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],t.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return u` <slot @slotchange=${this.handleSlotChange}></slot> `}};rr.styles=[H,$l];l([h({type:Boolean,reflect:!0})],rr.prototype,"disabled",2);l([S("disabled",{waitUntilFirstUpdate:!0})],rr.prototype,"handleDisabledChange",1);var re=class extends I{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new oe(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const i=t.filter(({target:r})=>{if(r===this)return!0;if(r.closest("sl-tab-group")!==this)return!1;const s=r.tagName.toLowerCase();return s==="sl-tab"||s==="sl-tab-panel"});if(i.length!==0){if(i.some(r=>!["aria-labelledby","aria-controls"].includes(r.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(r=>r.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(r=>r.attributeName==="active")){const s=i.filter(o=>o.attributeName==="active"&&o.target.tagName.toLowerCase()==="sl-tab").map(o=>o.target).find(o=>o.active);s&&this.setActiveTab(s)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((i,r)=>{var s;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((s=this.getActiveTab())!=null?s:this.tabs[0],{emitEvents:!1}),r.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const i=e.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(e){const i=e.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const s=this.tabs.find(n=>n.matches(":focus")),o=this.localize.dir()==="rtl";let a=null;if((s==null?void 0:s.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")a=this.focusableTabs[0];else if(e.key==="End")a=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(o?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const n=this.tabs.findIndex(d=>d===s);a=this.findNextFocusableTab(n,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(o?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const n=this.tabs.findIndex(d=>d===s);a=this.findNextFocusableTab(n,"forward")}if(!a)return;a.tabIndex=0,a.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(a,{scrollBehavior:"smooth"}):this.tabs.forEach(n=>{n.tabIndex=n===a?0:-1}),["top","bottom"].includes(this.placement)&&Er(a,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=Ze({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const i=this.activeTab;this.activeTab=e,this.tabs.forEach(r=>{r.active=r===this.activeTab,r.tabIndex=r===this.activeTab?0:-1}),this.panels.forEach(r=>{var s;return r.active=r.name===((s=this.activeTab)==null?void 0:s.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&Er(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(i=>i.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,i=e.clientHeight,r=this.localize.dir()==="rtl",s=this.getAllTabs(),a=s.slice(0,s.indexOf(e)).reduce((n,d)=>({left:n.left+d.clientWidth,top:n.top+d.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=r?`${-1*a.left}px`:`${a.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${a.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let i=null;const r=t==="forward"?1:-1;let s=e+r;for(;e<this.tabs.length;){if(i=this.tabs[s]||null,i===null){t==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;s+=r}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(i=>i.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return u`
      <div
        part="base"
        class=${P({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?u`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${P({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
                  name=${e?"chevron-right":"chevron-left"}
                  library="system"
                  tabindex="-1"
                  aria-hidden="true"
                  label=${this.localize.term("scrollToStart")}
                  @click=${this.handleScrollToStart}
                ></sl-icon-button>
              `:""}

          <div class="tab-group__nav" @scrollend=${this.updateScrollButtons}>
            <div part="tabs" class="tab-group__tabs" role="tablist">
              <div part="active-tab-indicator" class="tab-group__indicator"></div>
              <sl-resize-observer @sl-resize=${this.syncIndicator}>
                <slot name="nav" @slotchange=${this.syncTabsAndPanels}></slot>
              </sl-resize-observer>
            </div>
          </div>

          ${this.hasScrollControls?u`
                <sl-icon-button
                  part="scroll-button scroll-button--end"
                  exportparts="base:scroll-button__base"
                  class=${P({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
                  name=${e?"chevron-left":"chevron-right"}
                  library="system"
                  tabindex="-1"
                  aria-hidden="true"
                  label=${this.localize.term("scrollToEnd")}
                  @click=${this.handleScrollToEnd}
                ></sl-icon-button>
              `:""}
        </div>

        <slot part="body" class="tab-group__body" @slotchange=${this.syncTabsAndPanels}></slot>
      </div>
    `}};re.styles=[H,Cl];re.dependencies={"sl-icon-button":X,"sl-resize-observer":rr};l([C(".tab-group")],re.prototype,"tabGroup",2);l([C(".tab-group__body")],re.prototype,"body",2);l([C(".tab-group__nav")],re.prototype,"nav",2);l([C(".tab-group__indicator")],re.prototype,"indicator",2);l([w()],re.prototype,"hasScrollControls",2);l([w()],re.prototype,"shouldHideScrollStartButton",2);l([w()],re.prototype,"shouldHideScrollEndButton",2);l([h()],re.prototype,"placement",2);l([h()],re.prototype,"activation",2);l([h({attribute:"no-scroll-controls",type:Boolean})],re.prototype,"noScrollControls",2);l([h({attribute:"fixed-scroll-controls",type:Boolean})],re.prototype,"fixedScrollControls",2);l([Ta({passive:!0})],re.prototype,"updateScrollButtons",1);l([S("noScrollControls",{waitUntilFirstUpdate:!0})],re.prototype,"updateScrollControls",1);l([S("placement",{waitUntilFirstUpdate:!0})],re.prototype,"syncIndicator",1);re.define("sl-tab-group");var Tl=(e,t)=>{let i=0;return function(...r){window.clearTimeout(i),i=window.setTimeout(()=>{e.call(this,...r)},t)}},Os=(e,t,i)=>{const r=e[t];e[t]=function(...s){r.call(this,...s),i.call(this,r,...s)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,i=new WeakMap,r=o=>{for(const a of o.changedTouches)t.add(a.identifier)},s=o=>{for(const a of o.changedTouches)t.delete(a.identifier)};document.addEventListener("touchstart",r,!0),document.addEventListener("touchend",s,!0),document.addEventListener("touchcancel",s,!0),Os(EventTarget.prototype,"addEventListener",function(o,a){if(a!=="scrollend")return;const n=Tl(()=>{t.size?n():this.dispatchEvent(new Event("scrollend"))},100);o.call(this,"scroll",n,{passive:!0}),i.set(this,n)}),Os(EventTarget.prototype,"removeEventListener",function(o,a){if(a!=="scrollend")return;const n=i.get(this);n&&o.call(this,"scroll",n,{passive:!0})})}})();var Sl=T`
  :host {
    display: inline-block;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-semibold);
    border-radius: var(--sl-border-radius-medium);
    color: var(--sl-color-neutral-600);
    padding: var(--sl-spacing-medium) var(--sl-spacing-large);
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    transition:
      var(--transition-speed) box-shadow,
      var(--transition-speed) color;
  }

  .tab:hover:not(.tab--disabled) {
    color: var(--sl-color-primary-600);
  }

  :host(:focus) {
    outline: transparent;
  }

  :host(:focus-visible) {
    color: var(--sl-color-primary-600);
    outline: var(--sl-focus-ring);
    outline-offset: calc(-1 * var(--sl-focus-ring-width) - var(--sl-focus-ring-offset));
  }

  .tab.tab--active:not(.tab--disabled) {
    color: var(--sl-color-primary-600);
  }

  .tab.tab--closable {
    padding-inline-end: var(--sl-spacing-small);
  }

  .tab.tab--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tab__close-button {
    font-size: var(--sl-font-size-small);
    margin-inline-start: var(--sl-spacing-small);
  }

  .tab__close-button::part(base) {
    padding: var(--sl-spacing-3x-small);
  }

  @media (forced-colors: active) {
    .tab.tab--active:not(.tab--disabled) {
      outline: solid 1px transparent;
      outline-offset: -3px;
    }
  }
`,El=0,Pe=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.attrId=++El,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,u`
      <div
        part="base"
        class=${P({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
      >
        <slot></slot>
        ${this.closable?u`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                name="x-lg"
                library="system"
                label=${this.localize.term("close")}
                class="tab__close-button"
                @click=${this.handleCloseClick}
                tabindex="-1"
              ></sl-icon-button>
            `:""}
      </div>
    `}};Pe.styles=[H,Sl];Pe.dependencies={"sl-icon-button":X};l([C(".tab")],Pe.prototype,"tab",2);l([h({reflect:!0})],Pe.prototype,"panel",2);l([h({type:Boolean,reflect:!0})],Pe.prototype,"active",2);l([h({type:Boolean,reflect:!0})],Pe.prototype,"closable",2);l([h({type:Boolean,reflect:!0})],Pe.prototype,"disabled",2);l([h({type:Number,reflect:!0})],Pe.prototype,"tabIndex",2);l([S("active")],Pe.prototype,"handleActiveChange",1);l([S("disabled")],Pe.prototype,"handleDisabledChange",1);Pe.define("sl-tab");var zl=T`
  :host {
    --padding: 0;

    display: none;
  }

  :host([active]) {
    display: block;
  }

  .tab-panel {
    display: block;
    padding: var(--padding);
  }
`,Al=0,ui=class extends I{constructor(){super(...arguments),this.attrId=++Al,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return u`
      <slot
        part="base"
        class=${P({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};ui.styles=[H,zl];l([h({reflect:!0})],ui.prototype,"name",2);l([h({type:Boolean,reflect:!0})],ui.prototype,"active",2);l([S("active")],ui.prototype,"handleActiveChange",1);ui.define("sl-tab-panel");Yi.define("sl-spinner");X.define("sl-icon-button");var Dl=T`
  :host {
    display: block;
  }

  .details {
    border: solid 1px var(--sl-color-neutral-200);
    border-radius: var(--sl-border-radius-medium);
    background-color: var(--sl-color-neutral-0);
    overflow-anchor: none;
  }

  .details--disabled {
    opacity: 0.5;
  }

  .details__header {
    display: flex;
    align-items: center;
    border-radius: inherit;
    padding: var(--sl-spacing-medium);
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
  }

  .details__header::-webkit-details-marker {
    display: none;
  }

  .details__header:focus {
    outline: none;
  }

  .details__header:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: calc(1px + var(--sl-focus-ring-offset));
  }

  .details--disabled .details__header {
    cursor: not-allowed;
  }

  .details--disabled .details__header:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .details__summary {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }

  .details__summary-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
  }

  .details--open .details__summary-icon {
    rotate: 90deg;
  }

  .details--open.details--rtl .details__summary-icon {
    rotate: -90deg;
  }

  .details--open slot[name='expand-icon'],
  .details:not(.details--open) slot[name='collapse-icon'] {
    display: none;
  }

  .details__body {
    overflow: hidden;
  }

  .details__content {
    display: block;
    padding: var(--sl-spacing-medium);
  }
`,Ie=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await Z(this.body);const{keyframes:t,options:i}=Y(this,"details.show",{dir:this.localize.dir()});await K(this.body,zs(t,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await Z(this.body);const{keyframes:t,options:i}=Y(this,"details.hide",{dir:this.localize.dir()});await K(this.body,zs(t,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,pe(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,pe(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return u`
      <details
        part="base"
        class=${P({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
      >
        <summary
          part="header"
          id="header"
          class="details__header"
          role="button"
          aria-expanded=${this.open?"true":"false"}
          aria-controls="content"
          aria-disabled=${this.disabled?"true":"false"}
          tabindex=${this.disabled?"-1":"0"}
          @click=${this.handleSummaryClick}
          @keydown=${this.handleSummaryKeyDown}
        >
          <slot name="summary" part="summary" class="details__summary">${this.summary}</slot>

          <span part="summary-icon" class="details__summary-icon">
            <slot name="expand-icon">
              <sl-icon library="system" name=${e?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
            <slot name="collapse-icon">
              <sl-icon library="system" name=${e?"chevron-left":"chevron-right"}></sl-icon>
            </slot>
          </span>
        </summary>

        <div class="details__body" role="region" aria-labelledby="header">
          <slot part="content" id="content" class="details__content"></slot>
        </div>
      </details>
    `}};Ie.styles=[H,Dl];Ie.dependencies={"sl-icon":te};l([C(".details")],Ie.prototype,"details",2);l([C(".details__header")],Ie.prototype,"header",2);l([C(".details__body")],Ie.prototype,"body",2);l([C(".details__expand-icon-slot")],Ie.prototype,"expandIconSlot",2);l([h({type:Boolean,reflect:!0})],Ie.prototype,"open",2);l([h()],Ie.prototype,"summary",2);l([h({type:Boolean,reflect:!0})],Ie.prototype,"disabled",2);l([S("open",{waitUntilFirstUpdate:!0})],Ie.prototype,"handleOpenChange",1);B("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});B("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});Ie.define("sl-details");const Ol="modulepreload",Rl=function(e,t){return new URL(e,t).href},Rs={},Ms=function(t,i,r){let s=Promise.resolve();if(i&&i.length>0){const a=document.getElementsByTagName("link"),n=document.querySelector("meta[property=csp-nonce]"),d=(n==null?void 0:n.nonce)||(n==null?void 0:n.getAttribute("nonce"));s=Promise.allSettled(i.map(c=>{if(c=Rl(c,r),c in Rs)return;Rs[c]=!0;const p=c.endsWith(".css"),m=p?'[rel="stylesheet"]':"";if(!!r)for(let g=a.length-1;g>=0;g--){const v=a[g];if(v.href===c&&(!p||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${m}`))return;const f=document.createElement("link");if(f.rel=p?"stylesheet":Ol,p||(f.as="script"),f.crossOrigin="",f.href=c,d&&f.setAttribute("nonce",d),document.head.appendChild(f),p)return new Promise((g,v)=>{f.addEventListener("load",g),f.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${c}`)))})}))}function o(a){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=a,window.dispatchEvent(n),!n.defaultPrevented)throw a}return s.then(a=>{for(const n of a||[])n.status==="rejected"&&o(n.reason);return t().catch(o)})};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Ml=class extends Event{constructor(t,i,r,s){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i,this.callback=r,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Pl{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,i=!1){const r=i||!Object.is(t,this.o);this.o=t,r&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:r}]of this.subscriptions)i(this.o,r)},t!==void 0&&(this.value=t)}addCallback(t,i,r){if(!r)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:i});const{disposer:s}=this.subscriptions.get(t);t(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Il=class extends Event{constructor(t,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i}};class Ps extends Pl{constructor(t,i,r){var s,o;super(i.context!==void 0?i.initialValue:r),this.onContextRequest=a=>{if(a.context!==this.context)return;const n=a.contextTarget??a.composedPath()[0];n!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,n,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const n=new Set;for(const[d,{consumerHost:c}]of this.subscriptions)n.has(d)||(n.add(d),c.dispatchEvent(new Ml(this.context,c,d,!0)));a.stopPropagation()},this.host=t,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(o=(s=this.host).addController)==null||o.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Il(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ll({context:e}){return(t,i)=>{const r=new WeakMap;if(typeof i=="object")return{get(){return t.get.call(this)},set(s){return r.get(this).setValue(s),t.set.call(this,s)},init(s){return r.set(this,new Ps(this,{context:e,initialValue:s})),s}};{t.constructor.addInitializer(a=>{r.set(a,new Ps(a,{context:e}))});const s=Object.getOwnPropertyDescriptor(t,i);let o;if(s===void 0){const a=new WeakMap;o={get(){return a.get(this)},set(n){r.get(this).setValue(n),a.set(this,n)},configurable:!0,enumerable:!0}}else{const a=s.set;o={...s,set(n){r.get(this).setValue(n),a==null||a.call(this,n)}}}return void Object.defineProperty(t,i,o)}}}var Q={},sr={};Object.defineProperty(sr,"__esModule",{value:!0});sr.StoreController=void 0;class Fl{constructor(t,i){this.host=t,this.atom=i,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}sr.StoreController=Fl;var Ft={};Object.defineProperty(Ft,"__esModule",{value:!0});Ft.MultiStoreController=void 0;class Nl{constructor(t,i){this.host=t,this.atoms=i,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(i=>i())}get values(){return this.atoms.map(t=>t.get())}}Ft.MultiStoreController=Nl;var or={};Object.defineProperty(or,"__esModule",{value:!0});or.useStores=void 0;const Bl=Ft;function Hl(...e){return t=>class extends t{constructor(...i){super(...i),new Bl.MultiStoreController(this,e)}}}or.useStores=Hl;var ar={};Object.defineProperty(ar,"__esModule",{value:!0});ar.withStores=void 0;const jl=Ft,Vl=(e,t)=>class extends e{constructor(...r){super(...r),new jl.MultiStoreController(this,t)}};ar.withStores=Vl;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=sr;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var i=Ft;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return i.MultiStoreController}});var r=or;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return r.useStores}});var s=ar;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return s.withStores}})})(Q);const Wl=Symbol("board"),Ul={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let ze=[],rt=0;const wi=4;let zi=0;const ue=e=>{let t=[],i={get(){return i.lc||i.listen(()=>{})(),i.value},lc:0,listen(r){return i.lc=t.push(r),()=>{for(let o=rt+wi;o<ze.length;)ze[o]===r?ze.splice(o,wi):o+=wi;let s=t.indexOf(r);~s&&(t.splice(s,1),--i.lc||i.off())}},notify(r,s){zi++;let o=!ze.length;for(let a of t)ze.push(a,i.value,r,s);if(o){for(rt=0;rt<ze.length;rt+=wi)ze[rt](ze[rt+1],ze[rt+2],ze[rt+3]);ze.length=0}},off(){},set(r){let s=i.value;s!==r&&(i.value=r,i.notify(s))},subscribe(r){let s=i.listen(r);return r(i.value),s},value:e};return i},ql=5,ki=6,xi=10;let Yl=(e,t,i,r)=>(e.events=e.events||{},e.events[i+xi]||(e.events[i+xi]=r(s=>{e.events[i].reduceRight((o,a)=>(a(o),o),{shared:{},...s})})),e.events[i]=e.events[i]||[],e.events[i].push(t),()=>{let s=e.events[i],o=s.indexOf(t);s.splice(o,1),s.length||(delete e.events[i],e.events[i+xi](),delete e.events[i+xi])}),Kl=1e3,Gl=(e,t)=>Yl(e,r=>{let s=t(r);s&&e.events[ki].push(s)},ql,r=>{let s=e.listen;e.listen=(...a)=>(!e.lc&&!e.active&&(e.active=!0,r()),s(...a));let o=e.off;return e.events[ki]=[],e.off=()=>{o(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let a of e.events[ki])a();e.events[ki]=[]}},Kl)},()=>{e.listen=s,e.off=o}}),Xl=(e,t,i)=>{Array.isArray(e)||(e=[e]);let r,s,o=()=>{if(s===zi)return;s=zi;let c=e.map(p=>p.get());if(!r||c.some((p,m)=>p!==r[m])){r=c;let p=t(...c);p&&p.then&&p.t?p.then(m=>{r===c&&a.set(m)}):(a.set(p),s=zi)}},a=ue(void 0),n=a.get;a.get=()=>(o(),n());let d=o;return Gl(a,()=>{let c=e.map(p=>p.listen(d));return o(),()=>{for(let p of c)p()}}),a};const ut=(e,t)=>Xl(e,t),Ql=(e={})=>{let t=ue(e);return t.setKey=function(i,r){let s=t.value;typeof r>"u"&&i in t.value?(t.value={...t.value},delete t.value[i],t.notify(s,i)):t.value[i]!==r&&(t.value={...t.value,[i]:r},t.notify(s,i))},t},Me=ue(!1),ri=ue(null),hi=ue(!0),Zl=ue(!1),Jl=ut([Me,hi],(e,t)=>e&&!t);function wr(e){ri.set(e),Me.set(!0)}function ec(){Me.set(!1),ri.set(null),hi.set(!0)}function tc(e){hi.set(e)}function Is(e){Zl.set(e)}class Eo extends Error{constructor(t,i,r){super(t),this.status=i,this.body=r,this.name="ApiError"}}function si(e){if(!e)return[];const t=[],i=e.split(`
`);for(const r of i){const s=r.trim();if(!s)continue;const o={text:s};if(s.length>=18&&s[4]==="-"&&s[7]==="-"&&s[10]===" "&&s[13]===":"){const a=s.indexOf(" - ",16);if(a!==-1){o.timestamp=s.slice(0,16);let n=s.slice(a+3);if(n.startsWith("(from: ")){const d=n.indexOf(") ");d!==-1?(o.author=n.slice(7,d),o.text=n.slice(d+2)):o.text=n}else o.text=n}}t.push(o)}return t}async function ic(e,t){const i=e.startsWith("/")?"./"+e.slice(1):e,r=await fetch(i,t);if(!r.ok){const s=await r.text();throw new Eo(`API request failed: ${r.status} ${r.statusText}`,r.status,s)}return r.json()}async function rc(){return ic("/api/roadmap")}const Ce=Ql({}),Li=ue(null),zo=ue(""),pi=ue(!0),nr=ue(null),sc=ut(Ce,e=>Object.values(e)),oc=ut(Ce,e=>{const t=Date.now()-432e5;return Object.values(e).filter(i=>i.type!=="epic"?!1:i.status!=="closed"?!0:i.closed_at?new Date(i.closed_at).getTime()>t:!1).map(i=>({id:i.id,title:i.title}))}),lr=ut([Ce,Li],(e,t)=>t&&e[t]||null),ac=ut(lr,e=>e?si(e.notes):[]),nc=ut([Ce,lr],(e,t)=>{var i;return(i=t==null?void 0:t.blocked_by)!=null&&i.length?t.blocked_by.map(r=>{const s=e[r];return s?{id:s.id,title:s.title,status:s.status}:null}).filter(r=>r!==null):[]}),lc=ut([Ce,lr],(e,t)=>{if(!(t!=null&&t.parent))return"";const i=e[t.parent];return(i==null?void 0:i.title)||""});function cc(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(i=>{const r=t[i];return r?r.status!=="closed":!1})}function Fi(e,t={}){const i=cc(e,t);let r;return e.status==="closed"?r="done":i?r="blocked":e.awaiting?r="human":e.status==="in_progress"?r="agent":r="ready",{...e,is_blocked:i,column:r}}function dc(e){const t={};for(const r of e)t[r.id]=r;const i={};for(const r of e)i[r.id]=Fi(r,t);Ce.set(i),pi.set(!1),nr.set(null)}function uc(e){const t={};for(const[r,s]of e)t[r]=s;const i={};for(const[r,s]of e)i[r]=Fi(s,t);Ce.set(i),pi.set(!1),nr.set(null)}function St(e){var a;const t=Ce.get(),i={};for(const[n,d]of Object.entries(t))i[n]=d;i[e.id]=e;const r=Fi(e,i),s={...t};s[e.id]=r;const o=t[e.id];if((o==null?void 0:o.status)!==e.status)for(const[n,d]of Object.entries(t))n!==e.id&&(a=d.blocked_by)!=null&&a.includes(e.id)&&(s[n]=Fi(d,i));Ce.set(s)}function hc(e){const t=Ce.get(),{[e]:i,...r}=t;Ce.set(r),Li.get()===e&&Li.set(null)}function mt(e){Li.set(e)}function Ao(e){zo.set(e)}function Ni(e){pi.set(e)}function oi(e){nr.set(e),pi.set(!1)}function pc(e,t,i,r){if(e.status!=="closed"&&(e.awaiting||e.manual))return"gated";if(e.status==="closed")return"done";if(e.status==="open")for(const s of t){const o=i.get(s);if(o&&o.status!=="closed")return"queued"}return e.status==="in_progress"||r>0?"active":"ready"}function fc(e){const t=new Set,i=new Map;for(const m of e)m.type==="epic"&&(t.add(m.id),i.set(m.id,m));if(t.size===0)return{waves:null};const r=new Map,s=new Map;for(const m of e)m.parent&&t.has(m.parent)&&(r.set(m.parent,(r.get(m.parent)??0)+1),m.status==="closed"&&s.set(m.parent,(s.get(m.parent)??0)+1));const o=new Map;for(const[m,b]of i){const f=(b.blocked_by??[]).filter(g=>t.has(g));o.set(m,f)}const a=new Map,n=new Map;for(const m of i.keys())a.set(m,0);for(const[m,b]of o)for(const f of b){a.set(m,(a.get(m)??0)+1);const g=n.get(f)??[];g.push(m),n.set(f,g)}const d=[...i.keys()].sort(),c=new Set(d),p=[];for(;c.size>0;){const m=[];for(const f of d)c.has(f)&&a.get(f)===0&&m.push(f);if(m.length===0){const g=d.filter(v=>c.has(v)).map(v=>Ls(i.get(v),o.get(v)??[],i,r.get(v)??0,s.get(v)??0));p.push(g);break}const b=m.map(f=>Ls(i.get(f),o.get(f)??[],i,r.get(f)??0,s.get(f)??0));p.push(b);for(const f of m){c.delete(f);for(const g of n.get(f)??[])c.has(g)&&a.set(g,(a.get(g)??0)-1)}}return{waves:p}}function Ls(e,t,i,r,s){const o=pc(e,t,i,r);return{id:e.id,title:e.title,status:o,awaiting_type:o==="gated"?e.awaiting??"work":void 0,blocked_by:t.length>0?[...t]:void 0,children_total:r,children_closed:s}}const Do=ue(null),Mr=ue(!1),Pr=ue(null);async function Oo(){Mr.set(!0),Pr.set(null);try{let e;if(Me.get()){const t=Ce.get();e=fc(Object.values(t))}else e=await rc();Do.set(e)}catch(e){Pr.set(e instanceof Error?e.message:String(e))}finally{Mr.set(!1)}}typeof window<"u"&&window.addEventListener("tick-update-for-roadmap",()=>{Oo().catch(()=>{})});class mc extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class vt extends Error{constructor(t){super(t),this.name="ConnectionError"}}const bc="",Fs=1e3,gc=3e4;class vc{constructor(t=bc){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.reconnectDelay=Fs,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,i)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=Fs,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",r=>{this.handleUpdateEvent(r)}),this.eventSource.onerror=()=>{var s;console.log("[LocalComms] SSE connection error");const r=this.connected;this.connected=!1,r&&this.emitConnection({type:"connection:disconnected"}),(s=this.eventSource)==null||s.close(),this.eventSource=null,this.scheduleReconnect(),r||i(new vt("Failed to connect to SSE endpoint"))}}catch(r){i(new vt(`Failed to create EventSource: ${r}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,gc)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}async createTick(t){const i=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!i.ok)throw new Error(`Failed to create tick: ${i.statusText}`);return i.json()}async updateTick(t,i){const r=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!r.ok)throw new Error(`Failed to update tick: ${r.statusText}`);return r.json()}async deleteTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!i.ok)throw new Error(`Failed to delete tick: ${i.statusText}`)}async addNote(t,i){const r=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:i})});if(!r.ok)throw new Error(`Failed to add note: ${r.statusText}`);return r.json()}async approveTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!i.ok)throw new Error(`Failed to approve tick: ${i.statusText}`);return i.json()}async rejectTick(t,i){const r=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!r.ok)throw new Error(`Failed to reject tick: ${r.statusText}`);return r.json()}async closeTick(t,i){const r=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!r.ok)throw new Error(`Failed to close tick: ${r.statusText}`);return r.json()}async reopenTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!i.ok)throw new Error(`Failed to reopen tick: ${i.statusText}`);return i.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(r=>({...r,is_blocked:r.isBlocked,verification_status:r.verificationStatus}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`Failed to fetch tick: ${i.statusText}`);return i.json()}async fetchActivity(t){const i=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,r=await fetch(i);if(!r.ok)throw new Error(`Failed to fetch activity: ${r.statusText}`);return(await r.json()).activities}async fetchRecord(t){const i=await fetch(`${this.baseUrl}/api/records/${t}`);if(i.status===404)return null;if(!i.ok)throw new Error(`Failed to fetch record: ${i.statusText}`);return i.json()}async fetchContext(t){const i=await fetch(`${this.baseUrl}/api/context/${t}`);if(i.status===404)return null;if(!i.ok)throw new Error(`Failed to fetch context: ${i.statusText}`);return i.text()}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const i=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",i),i.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:r,tickId:s}=i;if(!s){console.warn("[LocalComms] Update event missing tickId:",i);return}r==="create"||r==="update"?this.fetchAndEmitTick(s):r==="delete"&&this.emitTick({type:"tick:deleted",tickId:s})}catch(i){console.error("[LocalComms] Failed to parse update event:",i)}}async fetchAndEmitTick(t){try{const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`HTTP ${i.status}`);const r=await i.json();this.emitTick({type:"tick:updated",tick:r})}catch(i){console.error(`[LocalComms] Failed to fetch tick ${t}:`,i),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${i}`})}}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(r){console.error("[LocalComms] Error in tick handler:",r)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(r){console.error("[LocalComms] Error in connection handler:",r)}}}const yc=10,wc=1e3,kc=3e4;class xc{constructor(t){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.tickCache=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,i)=>{try{const r=window.location.protocol==="https:"?"wss:":"ws:",s=window.location.host,o=localStorage.getItem("token")||"",a=`${r}//${s}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",a);const n=["ticks-v1",`token-${encodeURIComponent(o)}`];this.ws=new WebSocket(a,n);let d=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,d||(d=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=c=>{this.handleMessage(c)},this.ws.onclose=c=>{console.log("[CloudComms] WebSocket closed:",c.code,c.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),d||(d=!0,i(new vt(`WebSocket closed: ${c.code} ${c.reason}`)))},this.ws.onerror=c=>{console.error("[CloudComms] WebSocket error:",c),d||(d=!0,i(new vt("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(r){i(new vt(`Failed to create WebSocket: ${r}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=yc){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min(wc*Math.pow(2,this.reconnectAttempts),kc);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(i=>{console.error("[CloudComms] Reconnect failed:",i)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}async createTick(t){this.checkWritable();const i={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,awaiting:t.awaiting,owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async updateTick(t,i){this.checkWritable();const r={id:t,title:i.title||"",description:i.description||"",status:i.status||"open",priority:i.priority??2,labels:i.labels,blocked_by:i.blocked_by,type:"task",owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:r}),r}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,i){return this.checkWritable(),this.tickOperation(t,"note",{message:i})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,i){return this.checkWritable(),this.tickOperation(t,"reject",{reason:i})}async closeTick(t,i){return this.checkWritable(),this.tickOperation(t,"close",{reason:i})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const i of this.tickCache.values()){const r=(i.blocked_by||[]).some(o=>{const a=this.tickCache.get(o);return a?a.status!=="closed":!1});let s="ready";i.status==="closed"?s="done":r?s="blocked":i.awaiting?s="human":i.status==="in_progress"&&(s="agent"),t.push({...i,is_blocked:r,column:s})}return t}async fetchInfo(){const t=[];for(const i of this.tickCache.values())i.type==="epic"&&t.push({id:i.id,title:i.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const i=this.tickCache.get(t);if(!i)throw new Error(`Tick not found: ${t}`);const r=[];if(i.blocked_by&&i.blocked_by.length>0)for(const a of i.blocked_by){const n=this.tickCache.get(a);n?r.push({id:n.id,title:n.title,status:n.status}):r.push({id:a,title:`Tick ${a}`,status:"unknown"})}const s=r.some(a=>a.status!=="closed"&&a.status!=="unknown");let o="ready";return i.status==="closed"?o="done":s?o="blocked":i.awaiting?o="human":i.status==="in_progress"&&(o="agent"),{...i,isBlocked:s,column:o,notesList:si(i.notes),blockerDetails:r}}async fetchActivity(t){return[]}async fetchRecord(t){return null}async fetchContext(t){return null}handleMessage(t){try{const i=JSON.parse(t.data);switch(i.type){case"state_full":this.handleStateFullMessage(i);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(i);break;case"tick_deleted":this.handleTickDeleteMessage(i);break;case"connected":console.log("[CloudComms] Connection confirmed:",i.connectionId);break;case"error":console.error("[CloudComms] Server error:",i.message),this.emitConnection({type:"connection:error",message:i.message});break;case"local_status":this.handleLocalStatusMessage(i);break;case"run_event":break;default:console.warn("[CloudComms] Unknown message type:",i.type)}}catch(i){console.error("[CloudComms] Failed to parse message:",i)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[r,s]of Object.entries(t.ticks))this.tickCache.set(r,s);const i=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:i})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(r){console.error("[CloudComms] Error in tick handler:",r)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(r){console.error("[CloudComms] Error in connection handler:",r)}}checkWritable(){if(!this.connected)throw new vt("Not connected to server");if(!this.localAgentConnected)throw new mc("Cannot write: local agent is offline")}sendMessage(t){var i;if(((i=this.ws)==null?void 0:i.readyState)!==WebSocket.OPEN)throw new vt("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,i,r){const s=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${i}`,o=localStorage.getItem("token")||"",a=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",...o?{Authorization:`Bearer ${o}`}:{}},body:r?JSON.stringify(r):void 0});if(!a.ok){const n=await a.json().catch(()=>({error:a.statusText}));throw new Error(n.error||`Failed to ${i} tick`)}return a.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let i="";for(let r=0;r<3;r++)i+=t.charAt(Math.floor(Math.random()*t.length));return i}}const wt=ue(null),kt=ue("disconnected"),Ro=ut([kt,Me,hi],(e,t,i)=>!t||e!=="connected"?e:i?"connected":"disconnected");function Mo(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),St(e.tick),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),hc(e.tickId),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),uc(e.ticks),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function Po(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),kt.set("connected"),Is(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),kt.set("disconnected"),Is(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),tc(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),oi(e.message);break}}let Ns=!1,Ot=[];async function Zr(){Jr(),console.log("[CommsStore] Initializing local mode"),kt.set("connecting"),Ni(!0);const e=new vc;Ot.push(e.onTick(Mo)),Ot.push(e.onConnection(Po)),wt.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),oi(`Connection failed: ${t}`)}}async function Bi(e){Jr(),console.log("[CommsStore] Initializing cloud mode for project:",e),kt.set("connecting"),Ni(!0);const t=new xc(e);Ot.push(t.onTick(Mo)),Ot.push(t.onConnection(Po)),wt.set(t),Ao(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(i){console.error("[CommsStore] Failed to connect:",i),oi(`Connection failed: ${i}`)}}async function _c(){const e=Me.get(),t=ri.get();e&&t?await Bi(t):await Zr()}function Cc(){Jr(),kt.set("disconnected")}function Jr(){for(const t of Ot)t();Ot=[];const e=wt.get();e&&(e.disconnect(),wt.set(null))}function he(){const e=wt.get();if(!e)throw new Error("CommsClient not initialized");return e}async function Io(e){return he().createTick(e)}async function $c(e,t){return he().updateTick(e,t)}async function Tc(e){return he().deleteTick(e)}async function Lo(e,t){return he().addNote(e,t)}async function Fo(e){return he().approveTick(e)}async function No(e,t){return he().rejectTick(e,t)}async function Bo(e,t){return he().closeTick(e,t)}async function Ho(e){return he().reopenTick(e)}async function jo(){return he().fetchTicks()}async function Vo(){return he().fetchInfo()}async function es(e){return he().fetchTick(e)}async function ts(e){return he().fetchActivity(e)}async function is(e){return he().fetchRecord(e)}async function Wo(e){return he().fetchContext(e)}function Uo(){if(Ns){console.log("[CommsStore] Already initialized, skipping");return}Ns=!0,console.log("[CommsStore] Setting up auto-connect"),Me.subscribe(e=>{const t=ri.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?Bi(t):e||Zr()}),ri.subscribe(e=>{const t=Me.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!wt.get()&&Bi(e)})}const Bs=Object.freeze(Object.defineProperty({__proto__:null,$commsClient:wt,$connectionStatus:kt,$effectiveConnectionStatus:Ro,addNote:Lo,approveTick:Fo,closeTick:Bo,createTick:Io,deleteTick:Tc,disconnectComms:Cc,fetchActivity:ts,fetchContext:Wo,fetchInfo:Vo,fetchRecord:is,fetchTickDetails:es,fetchTicks:jo,getCommsClient:he,initCloudComms:Bi,initComms:_c,initCommsAutoConnect:Uo,initLocalComms:Zr,rejectTick:No,reopenTick:Ho,updateTickViaComms:$c},Symbol.toStringTag,{value:"Module"}));var Sc=Object.defineProperty,Ec=Object.getOwnPropertyDescriptor,cr=(e,t,i,r)=>{for(var s=r>1?void 0:r?Ec(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&Sc(t,i,s),s};const zc={done:"var(--green, #a6e3a1)",active:"var(--blue, #89b4fa)",ready:"var(--yellow, #f9e2af)",queued:"var(--surface2, #585b70)",gated:"var(--peach, #fab387)"},Ac={done:"Done",active:"Active",ready:"Needs planning",queued:"Queued",gated:"Gated"};let Rt=class extends ge{constructor(){super(...arguments),this.roadmap=null,this.loading=!1,this.error=null}_close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){mt(e),this._close()}_pct(e){return e.children_total===0?0:Math.round(e.children_closed/e.children_total*100)}_renderEpicCard(e){const t=zc[e.status]??"var(--surface2)",i=this._pct(e);return u`
      <div
        class="epic-card"
        style="--accent-color: ${t}"
        @click=${()=>this._handleEpicClick(e.id)}
        role="button"
        tabindex="0"
        @keydown=${r=>{(r.key==="Enter"||r.key===" ")&&this._handleEpicClick(e.id)}}
        aria-label="Open epic ${e.id}: ${e.title}"
      >
        <div class="status-dot"></div>

        <div class="epic-info">
          <div class="epic-top">
            <span class="epic-id">${e.id}</span>
            <span class="epic-title">${e.title}</span>
          </div>

          <div class="badges">
            <span class="badge badge-status">${Ac[e.status]}</span>

            ${e.awaiting_type?u`<span class="badge badge-awaiting">⏳ ${e.awaiting_type}</span>`:y}

            ${e.blocked_by&&e.blocked_by.length>0?e.blocked_by.map(r=>u`
                  <span class="badge badge-blocked">⊘ ${r}</span>
                `):y}
          </div>
        </div>

        <div class="progress-chip">
          <span class="progress-text">${e.children_closed}/${e.children_total}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${i}%"></div>
          </div>
        </div>
      </div>
    `}_renderWave(e,t){return u`
      <div class="wave-group">
        <div class="wave-label">Wave ${t+1}</div>
        ${e.map(i=>this._renderEpicCard(i))}
      </div>
    `}_renderBody(){var t;if(this.loading)return u`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;if(this.error)return u`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;const e=((t=this.roadmap)==null?void 0:t.waves)??null;return!e||e.length===0?u`<div class="state-box">No epics found — roadmap is empty.</div>`:u`
      <div class="body">
        ${e.map((i,r)=>this._renderWave(i,r))}
      </div>
    `}render(){return u`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="header-icon">🗺</div>
              <div>
                <div class="header-title">Roadmap</div>
                <div class="header-subtitle">Epic chains by dependency wave</div>
              </div>
            </div>
            <div class="header-right">
              <span class="kbd-hint">Press <kbd>m</kbd> or <kbd>Esc</kbd> to close</span>
              <button class="close-btn" @click=${this._close} aria-label="Close roadmap">✕</button>
            </div>
          </div>

          <!-- Body -->
          ${this._renderBody()}
        </div>
      </div>
    `}};Rt.styles=T`
    :host {
      display: block;
    }

    /* ── Overlay backdrop ───────────────────────────────────────────────── */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(17, 17, 27, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Container ──────────────────────────────────────────────────────── */
    .container {
      width: 100%;
      max-width: 860px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .header-subtitle {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .kbd-hint {
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .kbd-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    /* ── Body ───────────────────────────────────────────────────────────── */
    .body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── Loading / error / empty ────────────────────────────────────────── */
    .state-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.875rem;
      gap: 0.5rem;
    }

    .state-box.error {
      color: var(--red, #f38ba8);
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .spinner {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    /* ── Wave group ─────────────────────────────────────────────────────── */
    .wave-group {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .wave-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--subtext0, #a6adc8);
      padding-left: 0.25rem;
    }

    /* ── Epic card ──────────────────────────────────────────────────────── */
    .epic-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      position: relative;
    }

    .epic-card:hover {
      background: var(--surface1, #45475a);
      border-color: var(--overlay0, #6c7086);
    }

    /* Left accent bar (status colour) */
    .epic-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 8px 0 0 8px;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Status dot ─────────────────────────────────────────────────────── */
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--accent-color, var(--surface2, #585b70));
    }

    /* ── Epic info ──────────────────────────────────────────────────────── */
    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      white-space: nowrap;
    }

    .epic-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    /* ── Badges row ─────────────────────────────────────────────────────── */
    .badges {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.375rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .badge-status {
      background: color-mix(in srgb, var(--accent-color, var(--surface2)) 20%, transparent);
      color: var(--accent-color, var(--subtext1, #bac2de));
      border: 1px solid color-mix(in srgb, var(--accent-color, var(--surface2)) 40%, transparent);
    }

    .badge-awaiting {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .badge-blocked {
      background: rgba(243, 139, 168, 0.12);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.25);
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    /* ── Progress chip ──────────────────────────────────────────────────── */
    .progress-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .progress-text {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--accent-color, var(--surface2, #585b70));
      transition: width 0.3s ease;
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .body {
        padding: 1rem;
      }

      .progress-bar {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .container {
        border-radius: 0;
        min-height: 100vh;
      }
    }
  `;cr([h({attribute:!1})],Rt.prototype,"roadmap",2);cr([h({type:Boolean})],Rt.prototype,"loading",2);cr([h({attribute:!1})],Rt.prototype,"error",2);Rt=cr([$e("roadmap-view")],Rt);var Dc=Object.defineProperty,Oc=Object.getOwnPropertyDescriptor,fe=(e,t,i,r)=>{for(var s=r>1?void 0:r?Oc(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&Dc(t,i,s),s};console.log("[TickBoard] Initializing comms module");Uo();const kr=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Ne=["blocked","ready","agent","human","done"];let se=class extends ge{constructor(){super(...arguments),this.boardState={...Ul},this.ticksController=new Q.StoreController(this,sc),this.epicsController=new Q.StoreController(this,oc),this.repoNameController=new Q.StoreController(this,zo),this.selectedTickController=new Q.StoreController(this,lr),this.selectedTickNotesController=new Q.StoreController(this,ac),this.selectedTickBlockersController=new Q.StoreController(this,nc),this.selectedTickParentTitleController=new Q.StoreController(this,lc),this.loadingController=new Q.StoreController(this,pi),this.errorController=new Q.StoreController(this,nr),this.isCloudModeController=new Q.StoreController(this,Me),this.localClientConnectedController=new Q.StoreController(this,hi),this.isReadOnlyController=new Q.StoreController(this,Jl),this.connectionStatusController=new Q.StoreController(this,Ro),this.roadmapController=new Q.StoreController(this,Do),this.roadmapLoadingController=new Q.StoreController(this,Mr),this.roadmapErrorController=new Q.StoreController(this,Pr),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showDashboard=!1,this.dashboardActivities=[],this.showRoadmap=!1,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused())&&!(this.showDashboard&&e.key!=="Escape"&&e.key!=="d"&&e.key!=="m"&&e.key!=="?")&&!(this.showRoadmap&&e.key!=="Escape"&&e.key!=="m"&&e.key!=="?"))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"d":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleDashboard());break;case"m":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRoadmap());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}get roadmapData(){return this.roadmapController.value}get roadmapLoading(){return this.roadmapLoadingController.value}get roadmapError(){return this.roadmapErrorController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.isCloudMode||this.loadData()}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const i=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",i),wr(i);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),wr(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const i=new URLSearchParams(window.location.search).get("project");if(i){console.log("[TickBoard] Cloud mode from query param, project:",i),wr(i);return}}console.log("[TickBoard] Local mode"),ec()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),Ni(!0);return}Ni(!0),oi(null);try{const[e,t]=await Promise.all([jo(),Vo()]);dc(e),Ao(t.repoName),this.updateBoardState()}catch(e){oi(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown)}isInputFocused(){var r;let e=document.activeElement;for(;(r=e==null?void 0:e.shadowRoot)!=null&&r.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let i=e;for(;i;){const s=i.tagName.toLowerCase();if(s.startsWith("sl-")&&(s.includes("input")||s.includes("textarea")||s.includes("select")))return!0;const o=i.getRootNode();i=o instanceof ShadowRoot?o.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Ne.length?[]:this.getColumnTicks(Ne[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Ne.length;e++)if(this.getColumnTicks(Ne[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let i=this.focusedTickIndex+e;i<0?i=t.length-1:i>=t.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Ne.length-1:t>=Ne.length&&(t=0),this.focusedColumnIndex=t;const i=this.getColumnTicks(Ne[t]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Ne[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&mt(e[this.focusedTickIndex].id)}handleEscape(){this.showRoadmap?this.showRoadmap=!1:this.showDashboard?this.showDashboard=!1:this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?mt(null):this.clearFocus()}async toggleDashboard(){if(this.showDashboard=!this.showDashboard,this.showDashboard)try{this.dashboardActivities=await ts(20)}catch{this.dashboardActivities=[]}}async toggleRoadmap(){this.showRoadmap=!this.showRoadmap,this.showRoadmap&&await Oo()}handleDashboardEpicSelect(e){this.selectedEpic=e.detail.epicId,this.showDashboard=!1,this.updateBoardState()}handleDashboardTickSelect(e){mt(e.detail.tickId),this.showDashboard=!1}async handleDashboardTickResume(e){var i,r,s;const{tickId:t}=e.detail;try{const o=await Ms(()=>Promise.resolve().then(()=>Bs),void 0,import.meta.url).then(a=>a.approveTick(t));St({...o,is_blocked:(((i=o.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),(r=window.showToast)==null||r.call(window,{message:`Resumed tick ${t}`,variant:"success"})}catch(o){(s=window.showToast)==null||s.call(window,{message:`Failed to resume ${t}: ${o instanceof Error?o.message:o}`,variant:"danger"})}}async handleDashboardTickRetry(e){var i,r,s;const{tickId:t}=e.detail;try{const o=await Ms(()=>Promise.resolve().then(()=>Bs),void 0,import.meta.url).then(a=>a.reopenTick(t));St({...o,is_blocked:(((i=o.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),(r=window.showToast)==null||r.call(window,{message:`Retrying tick ${t}`,variant:"success"})}catch(o){(s=window.showToast)==null||s.call(window,{message:`Failed to retry ${t}: ${o instanceof Error?o.message:o}`,variant:"danger"})}}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const i=e.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var i;const{tick:t}=e.detail;St(t),this.showCreateDialog=!1,this.updateBoardState(),(i=window.showToast)==null||i.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const i=e.target.querySelector("sl-tab[active]");if(i){const r=i.getAttribute("panel");r&&Ne.includes(r)&&(this.activeColumn=r,this.focusedColumnIndex=Ne.indexOf(r),this.focusedTickIndex=this.getColumnTicks(r).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,i=this.ticks.find(r=>r.id===t);i?mt(i.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(mt(t.id),!this.isCloudMode)try{const i=await es(t.id);St(i)}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){mt(null)}handleTickUpdated(e){const{tick:t}=e.detail;St(t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(i=>i.id.toLowerCase().includes(t)||i.title.toLowerCase().includes(t)||i.description&&i.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}render(){if(this.loading)return u`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return u`
        <div class="error-state">
          <ticks-alert variant="error">
            <strong>Failed to load board</strong><br>
            ${this.error}
          </ticks-alert>
          <ticks-button variant="primary" @click=${this.loadData}>Retry</ticks-button>
        </div>
      `;const e=this.getEpicNames();return u`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        connection-status=${this.connectionStatus}
        ?readonly-mode=${this.isCloudMode&&!this.localClientConnected}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @dashboard-toggle=${this.toggleDashboard}
        @roadmap-toggle=${this.toggleRoadmap}
      ></tick-header>

      <!-- Toast notification stack -->
      <tick-toast-stack></tick-toast-stack>

      <!-- Detail drawer -->
      <tick-detail-drawer
        .tick=${this.selectedTick}
        .open=${this.selectedTick!==null}
        .notesList=${this.selectedTickNotes}
        .blockerDetails=${this.selectedTickBlockers}
        parent-title=${this.selectedTickParentTitle}
        ?readonly-mode=${this.isCloudMode&&!this.localClientConnected}
        @drawer-close=${this.handleDrawerClose}
        @tick-updated=${this.handleTickUpdated}
      ></tick-detail-drawer>

      <!-- Create tick dialog -->
      <tick-create-dialog
        .open=${this.showCreateDialog}
        .epics=${this.epics}
        @dialog-close=${this.handleCreateDialogClose}
        @tick-created=${this.handleTickCreated}
      ></tick-create-dialog>

      <!-- Desktop/Tablet kanban board -->
      <div class="board-layout">
        <main>
          <div class="kanban-board">
            ${kr.map((t,i)=>u`
              <tick-column
                name=${t.id}
                .ticks=${this.getColumnTicks(t.id)}
                .epicNames=${e}
                focused-tick-id=${this.focusedColumnIndex===i?this.getFocusedTickId()??"":""}
                @tick-selected=${this.handleTickSelected}
              ></tick-column>
            `)}
          </div>
        </main>
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${kr.map(t=>u`
            <sl-tab
              slot="nav"
              panel=${t.id}
              ?active=${this.activeColumn===t.id}
            >
              ${t.icon}
              <span class="tab-badge">${this.getColumnTicks(t.id).length}</span>
            </sl-tab>
          `)}
          ${kr.map((t,i)=>u`
            <sl-tab-panel name=${t.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(t.id).length===0?u`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${t.icon}</div>
                        <div>No ticks in ${t.name}</div>
                      </div>
                    `:this.getColumnTicks(t.id).map(r=>u`
                      <tick-card
                        .tick=${r}
                        epic-name=${e[r.parent||""]||""}
                        ?focused=${this.focusedColumnIndex===i&&this.getFocusedTickId()===r.id}
                        @tick-selected=${this.handleTickSelected}
                      ></tick-card>
                    `)}
              </div>
            </sl-tab-panel>
          `)}
        </sl-tab-group>
      </div>

      <!-- Mobile filter drawer -->
      <sl-drawer
        label="Filters"
        placement="start"
        ?open=${this.showMobileFilterDrawer}
        @sl-after-hide=${()=>{this.showMobileFilterDrawer=!1}}
      >
        <div class="filter-drawer-content">
          <div>
            <label>Search</label>
            <sl-input
              placeholder="Search by ID or title..."
              clearable
              .value=${this.searchTerm}
              @sl-input=${this.handleMobileSearchInput}
            >
              <sl-icon name="search" slot="prefix"></sl-icon>
            </sl-input>
          </div>
          <div>
            <label>Filter by Epic</label>
            <sl-select
              placeholder="All Ticks"
              clearable
              .value=${this.selectedEpic}
              @sl-change=${this.handleMobileEpicFilterChange}
            >
              ${this.epics.map(t=>u`
                <sl-option value=${t.id}>
                  <span class="epic-id">${t.id}</span> - ${t.title}
                </sl-option>
              `)}
            </sl-select>
          </div>
        </div>
        <ticks-button
          slot="footer"
          variant="primary"
          @click=${()=>{this.showMobileFilterDrawer=!1}}
        >
          Apply
        </ticks-button>
      </sl-drawer>

      <!-- Tickflow Dashboard overlay -->
      <tickflow-dashboard
        ?open=${this.showDashboard}
        .ticks=${this.ticks}
        .epics=${this.epics}
        .activities=${this.dashboardActivities}
        repo-name=${this.repoName}
        @close=${()=>{this.showDashboard=!1}}
        @epic-select=${this.handleDashboardEpicSelect}
        @tick-select=${this.handleDashboardTickSelect}
        @tick-resume=${this.handleDashboardTickResume}
        @tick-retry=${this.handleDashboardTickRetry}
      ></tickflow-dashboard>

      <!-- Roadmap overlay -->
      ${this.showRoadmap?u`
        <roadmap-view
          .roadmap=${this.roadmapData??null}
          .loading=${this.roadmapLoading??!1}
          .error=${this.roadmapError??null}
          @close=${()=>{this.showRoadmap=!1}}
        ></roadmap-view>
      `:y}

      <!-- Keyboard shortcuts help dialog -->
      <sl-dialog
        label="Keyboard Shortcuts"
        ?open=${this.showKeyboardHelp}
        @sl-after-hide=${()=>{this.showKeyboardHelp=!1}}
        class="keyboard-help-dialog"
      >
        <div class="shortcuts-grid">
          <div class="shortcut-group">
            <h4>Navigation</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>↓</kbd>
              <span>Move down</span>
            </div>
            <div class="shortcut-row">
              <kbd>k</kbd> <kbd>↑</kbd>
              <span>Move up</span>
            </div>
            <div class="shortcut-row">
              <kbd>h</kbd> <kbd>←</kbd>
              <span>Previous column</span>
            </div>
            <div class="shortcut-row">
              <kbd>l</kbd> <kbd>→</kbd>
              <span>Next column</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Actions</h4>
            <div class="shortcut-row">
              <kbd>Enter</kbd>
              <span>Open selected tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>Esc</kbd>
              <span>Close drawer / clear focus</span>
            </div>
            <div class="shortcut-row">
              <kbd>n</kbd>
              <span>Create new tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>/</kbd>
              <span>Focus search</span>
            </div>
            <div class="shortcut-row">
              <kbd>r</kbd>
              <span>Toggle run panel</span>
            </div>
            <div class="shortcut-row">
              <kbd>d</kbd>
              <span>Toggle dashboard</span>
            </div>
            <div class="shortcut-row">
              <kbd>m</kbd>
              <span>Toggle roadmap</span>
            </div>
            <div class="shortcut-row">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h4>Dashboard (when open)</h4>
            <div class="shortcut-row">
              <kbd>j</kbd> <kbd>k</kbd>
              <span>Navigate attention list</span>
            </div>
            <div class="shortcut-row">
              <kbd>Enter</kbd> <kbd>i</kbd>
              <span>Inspect tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>a</kbd>
              <span>Resume (approve) tick</span>
            </div>
            <div class="shortcut-row">
              <kbd>t</kbd>
              <span>Retry (reopen) tick</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `}};se.styles=T`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Loading and error states */
    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      color: var(--text);
    }

    .loading-spinner {
      font-size: 2rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .error-state sl-alert {
      max-width: 400px;
      margin-bottom: 1rem;
    }

    /* Kanban board - Desktop */
    main {
      flex: 1;
      padding: 1rem;
      overflow: hidden;
    }

    .kanban-board {
      display: flex;
      gap: 1rem;
      height: calc(100vh - 80px);
      overflow-x: auto;
    }

    /* Mobile tab layout - hidden on desktop */
    .mobile-tab-layout {
      display: none;
    }

    /* Mobile filter drawer */
    .filter-drawer-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .filter-drawer-content label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.25rem;
      display: block;
    }

    .filter-drawer-content sl-input,
    .filter-drawer-content sl-select {
      width: 100%;
    }

    .epic-id {
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
    }

    /* Tablet - Horizontal scroll with snap (481-768px) */
    @media (max-width: 768px) and (min-width: 481px) {
      main {
        padding: 0.75rem;
      }

      .kanban-board {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0.5rem;
      }

      .kanban-board tick-column {
        scroll-snap-align: start;
        flex: 0 0 280px;
        min-width: 280px;
      }
    }

    /* Mobile - Tab layout (≤480px) */
    @media (max-width: 480px) {
      main {
        display: none;
      }

      .mobile-tab-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      /* Tab group styling */
      .mobile-tab-layout sl-tab-group {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .mobile-tab-layout sl-tab-group::part(base) {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .mobile-tab-layout sl-tab-group::part(nav) {
        background: var(--surface0);
        border-bottom: 1px solid var(--surface1);
        overflow-x: auto;
        padding: 0 0.5rem;
      }

      .mobile-tab-layout sl-tab-group::part(tabs) {
        gap: 0;
      }

      .mobile-tab-layout sl-tab-group::part(body) {
        flex: 1;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab {
        font-size: 0.75rem;
        padding: 0.5rem 0.75rem;
      }

      .mobile-tab-layout sl-tab::part(base) {
        padding: 0.5rem 0.75rem;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active]::part(base) {
        color: var(--text);
      }

      /* Tab badge for count */
      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.375rem;
        margin-left: 0.375rem;
        font-size: 0.625rem;
        font-weight: 600;
        background: var(--surface1);
        border-radius: 999px;
        color: var(--subtext0);
      }

      .mobile-tab-layout sl-tab[active] .tab-badge {
        background: var(--blue);
        color: var(--base);
      }

      /* Tab panel content */
      .mobile-tab-layout sl-tab-panel {
        height: 100%;
        overflow: hidden;
      }

      .mobile-tab-layout sl-tab-panel::part(base) {
        height: 100%;
        padding: 0;
        overflow: hidden;
      }

      .mobile-column-content {
        height: calc(100vh - 140px);
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .mobile-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--subtext0);
        padding: 2rem 1rem;
        text-align: center;
      }

      .mobile-empty-state .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    }

    /* Keyboard shortcuts help dialog */
    .shortcuts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .shortcut-group h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--surface1);
      padding-bottom: 0.5rem;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--subtext1);
    }

    .shortcut-row span {
      margin-left: auto;
      color: var(--text);
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.75rem;
      background: var(--surface1);
      border: 1px solid var(--surface2, var(--overlay0));
      border-radius: 4px;
      color: var(--text);
    }

    @media (max-width: 480px) {
      .shortcuts-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Split layout when run panel is active */
    .board-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
  `;fe([Ll({context:Wl}),w()],se.prototype,"boardState",2);fe([w()],se.prototype,"selectedEpic",2);fe([w()],se.prototype,"searchTerm",2);fe([w()],se.prototype,"activeColumn",2);fe([w()],se.prototype,"isMobile",2);fe([w()],se.prototype,"focusedColumnIndex",2);fe([w()],se.prototype,"focusedTickIndex",2);fe([w()],se.prototype,"showKeyboardHelp",2);fe([w()],se.prototype,"showCreateDialog",2);fe([w()],se.prototype,"showMobileFilterDrawer",2);fe([w()],se.prototype,"showDashboard",2);fe([w()],se.prototype,"dashboardActivities",2);fe([w()],se.prototype,"showRoadmap",2);se=fe([$e("tick-board")],se);const qo=6048e5,Rc=864e5,Mc=6e4,Pc=36e5,_i=43200,Hs=1440,js=Symbol.for("constructDateFrom");function Xe(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&js in e?e[js](t):e instanceof Date?new e.constructor(t):new Date(t)}function J(e,t){return Xe(t||e,e)}let Ic={};function fi(){return Ic}function ai(e,t){var n,d,c,p;const i=fi(),r=(t==null?void 0:t.weekStartsOn)??((d=(n=t==null?void 0:t.locale)==null?void 0:n.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(c=i.locale)==null?void 0:c.options)==null?void 0:p.weekStartsOn)??0,s=J(e,t==null?void 0:t.in),o=s.getDay(),a=(o<r?7:0)+o-r;return s.setDate(s.getDate()-a),s.setHours(0,0,0,0),s}function Hi(e,t){return ai(e,{...t,weekStartsOn:1})}function Yo(e,t){const i=J(e,t==null?void 0:t.in),r=i.getFullYear(),s=Xe(i,0);s.setFullYear(r+1,0,4),s.setHours(0,0,0,0);const o=Hi(s),a=Xe(i,0);a.setFullYear(r,0,4),a.setHours(0,0,0,0);const n=Hi(a);return i.getTime()>=o.getTime()?r+1:i.getTime()>=n.getTime()?r:r-1}function ji(e){const t=J(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function mi(e,...t){const i=Xe.bind(null,e||t.find(r=>typeof r=="object"));return t.map(i)}function Vs(e,t){const i=J(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Lc(e,t,i){const[r,s]=mi(i==null?void 0:i.in,e,t),o=Vs(r),a=Vs(s),n=+o-ji(o),d=+a-ji(a);return Math.round((n-d)/Rc)}function Fc(e,t){const i=Yo(e,t),r=Xe(e,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),Hi(r)}function Ai(e,t){const i=+J(e)-+J(t);return i<0?-1:i>0?1:i}function Nc(e){return Xe(e,Date.now())}function Bc(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Hc(e){return!(!Bc(e)&&typeof e!="number"||isNaN(+J(e)))}function jc(e,t,i){const[r,s]=mi(i==null?void 0:i.in,e,t),o=r.getFullYear()-s.getFullYear(),a=r.getMonth()-s.getMonth();return o*12+a}function rs(e){return t=>{const r=(e?Math[e]:Math.trunc)(t);return r===0?0:r}}function Vc(e,t,i){const[r,s]=mi(i==null?void 0:i.in,e,t),o=(+r-+s)/Pc;return rs(i==null?void 0:i.roundingMethod)(o)}function Ko(e,t){return+J(e)-+J(t)}function Wc(e,t,i){const r=Ko(e,t)/Mc;return rs(i==null?void 0:i.roundingMethod)(r)}function Uc(e,t){const i=J(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function qc(e,t){const i=J(e,t==null?void 0:t.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function Yc(e,t){const i=J(e,t==null?void 0:t.in);return+Uc(i,t)==+qc(i,t)}function Kc(e,t,i){const[r,s,o]=mi(i==null?void 0:i.in,e,e,t),a=Ai(s,o),n=Math.abs(jc(s,o));if(n<1)return 0;s.getMonth()===1&&s.getDate()>27&&s.setDate(30),s.setMonth(s.getMonth()-a*n);let d=Ai(s,o)===-a;Yc(r)&&n===1&&Ai(r,o)===1&&(d=!1);const c=a*(n-+d);return c===0?0:c}function Gc(e,t,i){const r=Ko(e,t)/1e3;return rs(i==null?void 0:i.roundingMethod)(r)}function Xc(e,t){const i=J(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}const Qc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Zc=(e,t,i)=>{let r;const s=Qc[e];return typeof s=="string"?r=s:t===1?r=s.one:r=s.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function xr(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const Jc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},ed={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},td={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},id={date:xr({formats:Jc,defaultWidth:"full"}),time:xr({formats:ed,defaultWidth:"full"}),dateTime:xr({formats:td,defaultWidth:"full"})},rd={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},sd=(e,t,i,r)=>rd[e];function Yt(e){return(t,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let s;if(r==="formatting"&&e.formattingValues){const a=e.defaultFormattingWidth||e.defaultWidth,n=i!=null&&i.width?String(i.width):a;s=e.formattingValues[n]||e.formattingValues[a]}else{const a=e.defaultWidth,n=i!=null&&i.width?String(i.width):e.defaultWidth;s=e.values[n]||e.values[a]}const o=e.argumentCallback?e.argumentCallback(t):t;return s[o]}}const od={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},ad={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},nd={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},ld={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},cd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},dd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},ud=(e,t)=>{const i=Number(e),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},hd={ordinalNumber:ud,era:Yt({values:od,defaultWidth:"wide"}),quarter:Yt({values:ad,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Yt({values:nd,defaultWidth:"wide"}),day:Yt({values:ld,defaultWidth:"wide"}),dayPeriod:Yt({values:cd,defaultWidth:"wide",formattingValues:dd,defaultFormattingWidth:"wide"})};function Kt(e){return(t,i={})=>{const r=i.width,s=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],o=t.match(s);if(!o)return null;const a=o[0],n=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(n)?fd(n,m=>m.test(a)):pd(n,m=>m.test(a));let c;c=e.valueCallback?e.valueCallback(d):d,c=i.valueCallback?i.valueCallback(c):c;const p=t.slice(a.length);return{value:c,rest:p}}}function pd(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function fd(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function md(e){return(t,i={})=>{const r=t.match(e.matchPattern);if(!r)return null;const s=r[0],o=t.match(e.parsePattern);if(!o)return null;let a=e.valueCallback?e.valueCallback(o[0]):o[0];a=i.valueCallback?i.valueCallback(a):a;const n=t.slice(s.length);return{value:a,rest:n}}}const bd=/^(\d+)(th|st|nd|rd)?/i,gd=/\d+/i,vd={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},yd={any:[/^b/i,/^(a|c)/i]},wd={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},kd={any:[/1/i,/2/i,/3/i,/4/i]},xd={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},_d={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Cd={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},$d={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Td={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Sd={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Ed={ordinalNumber:md({matchPattern:bd,parsePattern:gd,valueCallback:e=>parseInt(e,10)}),era:Kt({matchPatterns:vd,defaultMatchWidth:"wide",parsePatterns:yd,defaultParseWidth:"any"}),quarter:Kt({matchPatterns:wd,defaultMatchWidth:"wide",parsePatterns:kd,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Kt({matchPatterns:xd,defaultMatchWidth:"wide",parsePatterns:_d,defaultParseWidth:"any"}),day:Kt({matchPatterns:Cd,defaultMatchWidth:"wide",parsePatterns:$d,defaultParseWidth:"any"}),dayPeriod:Kt({matchPatterns:Td,defaultMatchWidth:"any",parsePatterns:Sd,defaultParseWidth:"any"})},Go={code:"en-US",formatDistance:Zc,formatLong:id,formatRelative:sd,localize:hd,match:Ed,options:{weekStartsOn:0,firstWeekContainsDate:1}};function zd(e,t){const i=J(e,t==null?void 0:t.in);return Lc(i,Xc(i))+1}function Ad(e,t){const i=J(e,t==null?void 0:t.in),r=+Hi(i)-+Fc(i);return Math.round(r/qo)+1}function Xo(e,t){var p,m,b,f;const i=J(e,t==null?void 0:t.in),r=i.getFullYear(),s=fi(),o=(t==null?void 0:t.firstWeekContainsDate)??((m=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:m.firstWeekContainsDate)??s.firstWeekContainsDate??((f=(b=s.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,a=Xe((t==null?void 0:t.in)||e,0);a.setFullYear(r+1,0,o),a.setHours(0,0,0,0);const n=ai(a,t),d=Xe((t==null?void 0:t.in)||e,0);d.setFullYear(r,0,o),d.setHours(0,0,0,0);const c=ai(d,t);return+i>=+n?r+1:+i>=+c?r:r-1}function Dd(e,t){var n,d,c,p;const i=fi(),r=(t==null?void 0:t.firstWeekContainsDate)??((d=(n=t==null?void 0:t.locale)==null?void 0:n.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(c=i.locale)==null?void 0:c.options)==null?void 0:p.firstWeekContainsDate)??1,s=Xo(e,t),o=Xe((t==null?void 0:t.in)||e,0);return o.setFullYear(s,0,r),o.setHours(0,0,0,0),ai(o,t)}function Od(e,t){const i=J(e,t==null?void 0:t.in),r=+ai(i,t)-+Dd(i,t);return Math.round(r/qo)+1}function R(e,t){const i=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return i+r}const st={y(e,t){const i=e.getFullYear(),r=i>0?i:1-i;return R(t==="yy"?r%100:r,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):R(i+1,2)},d(e,t){return R(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return R(e.getHours()%12||12,t.length)},H(e,t){return R(e.getHours(),t.length)},m(e,t){return R(e.getMinutes(),t.length)},s(e,t){return R(e.getSeconds(),t.length)},S(e,t){const i=t.length,r=e.getMilliseconds(),s=Math.trunc(r*Math.pow(10,i-3));return R(s,t.length)}},Tt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Ws={G:function(e,t,i){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const r=e.getFullYear(),s=r>0?r:1-r;return i.ordinalNumber(s,{unit:"year"})}return st.y(e,t)},Y:function(e,t,i,r){const s=Xo(e,r),o=s>0?s:1-s;if(t==="YY"){const a=o%100;return R(a,2)}return t==="Yo"?i.ordinalNumber(o,{unit:"year"}):R(o,t.length)},R:function(e,t){const i=Yo(e);return R(i,t.length)},u:function(e,t){const i=e.getFullYear();return R(i,t.length)},Q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return R(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return R(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,i){const r=e.getMonth();switch(t){case"M":case"MM":return st.M(e,t);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,i){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return R(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,i,r){const s=Od(e,r);return t==="wo"?i.ordinalNumber(s,{unit:"week"}):R(s,t.length)},I:function(e,t,i){const r=Ad(e);return t==="Io"?i.ordinalNumber(r,{unit:"week"}):R(r,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):st.d(e,t)},D:function(e,t,i){const r=zd(e);return t==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):R(r,t.length)},E:function(e,t,i){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,i,r){const s=e.getDay(),o=(s-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(o);case"ee":return R(o,2);case"eo":return i.ordinalNumber(o,{unit:"day"});case"eee":return i.day(s,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(s,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(s,{width:"short",context:"formatting"});case"eeee":default:return i.day(s,{width:"wide",context:"formatting"})}},c:function(e,t,i,r){const s=e.getDay(),o=(s-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(o);case"cc":return R(o,t.length);case"co":return i.ordinalNumber(o,{unit:"day"});case"ccc":return i.day(s,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(s,{width:"narrow",context:"standalone"});case"cccccc":return i.day(s,{width:"short",context:"standalone"});case"cccc":default:return i.day(s,{width:"wide",context:"standalone"})}},i:function(e,t,i){const r=e.getDay(),s=r===0?7:r;switch(t){case"i":return String(s);case"ii":return R(s,t.length);case"io":return i.ordinalNumber(s,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,i){const s=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},b:function(e,t,i){const r=e.getHours();let s;switch(r===12?s=Tt.noon:r===0?s=Tt.midnight:s=r/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},B:function(e,t,i){const r=e.getHours();let s;switch(r>=17?s=Tt.evening:r>=12?s=Tt.afternoon:r>=4?s=Tt.morning:s=Tt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return st.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):st.H(e,t)},K:function(e,t,i){const r=e.getHours()%12;return t==="Ko"?i.ordinalNumber(r,{unit:"hour"}):R(r,t.length)},k:function(e,t,i){let r=e.getHours();return r===0&&(r=24),t==="ko"?i.ordinalNumber(r,{unit:"hour"}):R(r,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):st.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):st.s(e,t)},S:function(e,t){return st.S(e,t)},X:function(e,t,i){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return qs(r);case"XXXX":case"XX":return bt(r);case"XXXXX":case"XXX":default:return bt(r,":")}},x:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"x":return qs(r);case"xxxx":case"xx":return bt(r);case"xxxxx":case"xxx":default:return bt(r,":")}},O:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Us(r,":");case"OOOO":default:return"GMT"+bt(r,":")}},z:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Us(r,":");case"zzzz":default:return"GMT"+bt(r,":")}},t:function(e,t,i){const r=Math.trunc(+e/1e3);return R(r,t.length)},T:function(e,t,i){return R(+e,t.length)}};function Us(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),s=Math.trunc(r/60),o=r%60;return o===0?i+String(s):i+String(s)+t+R(o,2)}function qs(e,t){return e%60===0?(e>0?"-":"+")+R(Math.abs(e)/60,2):bt(e,t)}function bt(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),s=R(Math.trunc(r/60),2),o=R(r%60,2);return i+s+t+o}const Ys=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Qo=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Rd=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],r=i[1],s=i[2];if(!s)return Ys(e,t);let o;switch(r){case"P":o=t.dateTime({width:"short"});break;case"PP":o=t.dateTime({width:"medium"});break;case"PPP":o=t.dateTime({width:"long"});break;case"PPPP":default:o=t.dateTime({width:"full"});break}return o.replace("{{date}}",Ys(r,t)).replace("{{time}}",Qo(s,t))},Md={p:Qo,P:Rd},Pd=/^D+$/,Id=/^Y+$/,Ld=["D","DD","YY","YYYY"];function Fd(e){return Pd.test(e)}function Nd(e){return Id.test(e)}function Bd(e,t,i){const r=Hd(e,t,i);if(console.warn(r),Ld.includes(e))throw new RangeError(r)}function Hd(e,t,i){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const jd=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Vd=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Wd=/^'([^]*?)'?$/,Ud=/''/g,qd=/[a-zA-Z]/;function Yd(e,t,i){var p,m,b,f;const r=fi(),s=r.locale??Go,o=r.firstWeekContainsDate??((m=(p=r.locale)==null?void 0:p.options)==null?void 0:m.firstWeekContainsDate)??1,a=r.weekStartsOn??((f=(b=r.locale)==null?void 0:b.options)==null?void 0:f.weekStartsOn)??0,n=J(e,i==null?void 0:i.in);if(!Hc(n))throw new RangeError("Invalid time value");let d=t.match(Vd).map(g=>{const v=g[0];if(v==="p"||v==="P"){const k=Md[v];return k(g,s.formatLong)}return g}).join("").match(jd).map(g=>{if(g==="''")return{isToken:!1,value:"'"};const v=g[0];if(v==="'")return{isToken:!1,value:Kd(g)};if(Ws[v])return{isToken:!0,value:g};if(v.match(qd))throw new RangeError("Format string contains an unescaped latin alphabet character `"+v+"`");return{isToken:!1,value:g}});s.localize.preprocessor&&(d=s.localize.preprocessor(n,d));const c={firstWeekContainsDate:o,weekStartsOn:a,locale:s};return d.map(g=>{if(!g.isToken)return g.value;const v=g.value;(Nd(v)||Fd(v))&&Bd(v,t,String(e));const k=Ws[v[0]];return k(n,v,s.localize,c)}).join("")}function Kd(e){const t=e.match(Wd);return t?t[1].replace(Ud,"'"):e}function Gd(e,t,i){const r=fi(),s=(i==null?void 0:i.locale)??r.locale??Go,o=2520,a=Ai(e,t);if(isNaN(a))throw new RangeError("Invalid time value");const n=Object.assign({},i,{addSuffix:i==null?void 0:i.addSuffix,comparison:a}),[d,c]=mi(i==null?void 0:i.in,...a>0?[t,e]:[e,t]),p=Gc(c,d),m=(ji(c)-ji(d))/1e3,b=Math.round((p-m)/60);let f;if(b<2)return i!=null&&i.includeSeconds?p<5?s.formatDistance("lessThanXSeconds",5,n):p<10?s.formatDistance("lessThanXSeconds",10,n):p<20?s.formatDistance("lessThanXSeconds",20,n):p<40?s.formatDistance("halfAMinute",0,n):p<60?s.formatDistance("lessThanXMinutes",1,n):s.formatDistance("xMinutes",1,n):b===0?s.formatDistance("lessThanXMinutes",1,n):s.formatDistance("xMinutes",b,n);if(b<45)return s.formatDistance("xMinutes",b,n);if(b<90)return s.formatDistance("aboutXHours",1,n);if(b<Hs){const g=Math.round(b/60);return s.formatDistance("aboutXHours",g,n)}else{if(b<o)return s.formatDistance("xDays",1,n);if(b<_i){const g=Math.round(b/Hs);return s.formatDistance("xDays",g,n)}else if(b<_i*2)return f=Math.round(b/_i),s.formatDistance("aboutXMonths",f,n)}if(f=Kc(c,d),f<12){const g=Math.round(b/_i);return s.formatDistance("xMonths",g,n)}else{const g=f%12,v=Math.trunc(f/12);return g<3?s.formatDistance("aboutXYears",v,n):g<9?s.formatDistance("overXYears",v,n):s.formatDistance("almostXYears",v+1,n)}}function Xd(e,t){return Gd(e,Nc(e),t)}var Qd=Object.defineProperty,Zd=Object.getOwnPropertyDescriptor,Ct=(e,t,i,r)=>{for(var s=r>1?void 0:r?Zd(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&Qd(t,i,s),s};const Ks={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Jd={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let Qe=class extends ge{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),e.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var o;if(((o=this.tick)==null?void 0:o.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const e=new Date(this.tick.started_at),t=new Date,i=Wc(t,e),r=Vc(t,e),s=i%60;r>0?this.elapsedTime=`${r}h ${s}m`:this.elapsedTime=`${i}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return Ks[this.tick.priority]??Ks[2]}getPriorityLabel(){return Jd[this.tick.priority]??"Unknown"}renderVerificationBadge(){const e=this.tick.verification_status;if(!e)return null;switch(e){case"verified":return u`<span class="meta-badge verified">✓ verified</span>`;case"failed":return u`<span class="meta-badge verification-failed">✗ failed</span>`;case"pending":return u`<span class="meta-badge verification-pending">⋯ pending</span>`;default:return null}}renderElapsedBadge(){if(!this.elapsedTime||!this.tick.started_at)return null;const e=new Date(this.tick.started_at).toLocaleString();return u`
      <sl-tooltip content="Started: ${e}">
        <span class="meta-badge elapsed-time">⏱ ${this.elapsedTime}</span>
      </sl-tooltip>
    `}render(){const{tick:e,selected:t,focused:i,epicName:r}=this;return u`
      <div
        class="card ${t?"selected":""} ${i?"focused":""}"
        @click=${this.handleClick}
        role="button"
        tabindex=${i?"0":"-1"}
        aria-label="Tick ${e.id}: ${e.title}"
      >
        <div class="card-header">
          <sl-tooltip content="Priority: ${this.getPriorityLabel()}" placement="left">
            <div
              class="priority-indicator"
              style="background-color: ${this.getPriorityColor()}"
            ></div>
          </sl-tooltip>
          <div class="header-content">
            <div class="tick-id">${e.id}</div>
            <h4 class="tick-title">${e.title}</h4>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-badge type-badge type-${e.type}">${e.type}</span>
          <span class="meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
          ${e.is_blocked?u`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${e.manual?u`<span class="meta-badge manual">👤 manual</span>`:null}
          ${e.awaiting?u`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:null}
          ${this.renderVerificationBadge()}
          ${this.renderElapsedBadge()}
        </div>

        ${r?u`<div class="epic-name">${r}</div>`:null}
      </div>
    `}};Qe.styles=T`
    :host {
      display: block;
    }

    .card {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .card:hover {
      border-color: var(--overlay0);
    }

    .card.selected {
      border-color: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
    }

    .card.focused {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px var(--blue);
      outline: none;
    }

    .card.focused.selected {
      box-shadow: 0 0 0 2px var(--sapphire);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .priority-indicator {
      width: 4px;
      min-height: 100%;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
    }

    .header-content {
      flex: 1;
      min-width: 0;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      margin: 0;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .epic-name {
      font-size: 0.625rem;
      color: var(--subtext0);
      margin-top: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .epic-name::before {
      content: '↳';
      opacity: 0.7;
    }

    .priority-tooltip {
      font-size: 0.625rem;
    }

    /* Verification badge styles */
    .meta-badge.verified {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.verification-failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.verification-pending {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow);
    }

    .verification-icon {
      font-size: 0.625rem;
    }

    .meta-badge.elapsed-time {
      background: rgba(250, 179, 135, 0.15);
      color: var(--peach);
    }
  `;Ct([h({attribute:!1})],Qe.prototype,"tick",2);Ct([h({type:Boolean})],Qe.prototype,"selected",2);Ct([h({type:Boolean})],Qe.prototype,"focused",2);Ct([h({type:String,attribute:"epic-name"})],Qe.prototype,"epicName",2);Ct([C(".card")],Qe.prototype,"cardElement",2);Ct([w()],Qe.prototype,"elapsedTime",2);Qe=Ct([$e("tick-card")],Qe);var eu=Object.defineProperty,tu=Object.getOwnPropertyDescriptor,Nt=(e,t,i,r)=>{for(var s=r>1?void 0:r?tu(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&eu(t,i,s),s};const iu={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},ru={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},su={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let lt=class extends ge{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||iu[this.name]||"var(--blue)"}getColumnDisplayName(){return ru[this.name]||this.name}getColumnIcon(){return su[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),i=this.getColumnIcon(),r=this.ticks.length;return u`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${e}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${e}">${i}</span>
            ${t}
          </span>
          <span class="column-count">${r}</span>
        </div>
      </div>

      <div class="column-content">
        ${r===0?u`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(s=>u`
                <tick-card
                  .tick=${s}
                  epic-name=${this.epicNames[s.parent||""]||""}
                  ?focused=${this.focusedTickId===s.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};lt.styles=T`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 220px;
      max-width: 320px;
      background: var(--surface0);
      border-radius: 8px;
      overflow: hidden;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
    }

    .header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .column-header-wrapper {
      position: relative;
    }

    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text);
    }

    .column-icon {
      font-size: 0.75rem;
    }

    .column-count {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--surface1);
      border-radius: 999px;
      color: var(--subtext0);
      min-width: 1.5rem;
      text-align: center;
    }

    .column-content {
      flex: 1;
      padding: 0.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--subtext0);
      font-size: 0.875rem;
      padding: 2rem 1rem;
      text-align: center;
    }

    .empty-state-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    /* Responsive styles */
    @media (max-width: 768px) {
      :host {
        min-width: 260px;
        flex: 0 0 260px;
      }
    }

    @media (max-width: 480px) {
      :host {
        width: 100%;
        max-width: none;
        height: 100%;
      }
    }
  `;Nt([h({type:String})],lt.prototype,"name",2);Nt([h({type:String})],lt.prototype,"color",2);Nt([h({attribute:!1})],lt.prototype,"ticks",2);Nt([h({type:Object,attribute:!1})],lt.prototype,"epicNames",2);Nt([h({type:String,attribute:"focused-tick-id"})],lt.prototype,"focusedTickId",2);lt=Nt([$e("tick-column")],lt);var ou=Object.defineProperty,au=Object.getOwnPropertyDescriptor,ht=(e,t,i,r)=>{for(var s=r>1?void 0:r?au(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&ou(t,i,s),s};let je=class extends ge{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const i=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleDashboardToggle(){this.dispatchEvent(new CustomEvent("dashboard-toggle",{bubbles:!0,composed:!0}))}handleRoadmapToggle(){this.dispatchEvent(new CustomEvent("roadmap-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return u`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          ${this.readonlyMode?u`<a href="/app" style="text-decoration: none;"><ticks-logo variant="logotype" .size=${24}></ticks-logo></a>`:u`<ticks-logo variant="logotype" .size=${24}></ticks-logo>`}
          <sl-tooltip content=${this.getConnectionTooltip()}>
            <span class="connection-status ${this.connectionStatus}"></span>
          </sl-tooltip>
          ${this.repoName?u`<span class="repo-badge">${this.repoName}</span>`:null}
          ${this.readonlyMode?u`
              <sl-tooltip content="Local tk client is not connected. Actions will not sync back to tick files.">
                <span class="readonly-badge">
                  <sl-icon name="eye"></sl-icon>
                  Read-only
                </span>
              </sl-tooltip>
            `:null}
        </div>

        <div class="header-center">
          <sl-input
            placeholder="Search by ID or title..."
            size="small"
            clearable
            .value=${this.searchTerm}
            @sl-input=${this.handleSearchInput}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          <sl-select
            placeholder="All Ticks"
            size="small"
            clearable
            .value=${this.selectedEpic}
            @sl-change=${this.handleEpicFilterChange}
          >
            ${this.epics.map(e=>u`
                <sl-option value=${e.id}>
                  <span class="epic-id">${e.id}</span> - ${e.title}
                </sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Roadmap (m)">
            <sl-button
              variant="default"
              size="small"
              @click=${this.handleRoadmapToggle}
            >
              <sl-icon name="map"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Dashboard (d)">
            <sl-button
              variant="default"
              size="small"
              @click=${this.handleDashboardToggle}
            >
              <sl-icon name="grid-1x2"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Activity feed">
            <tick-activity-feed
              @activity-click=${this.handleActivityClick}
            ></tick-activity-feed>
          </sl-tooltip>

          <sl-tooltip content="Create new tick (n)">
            <ticks-button
              variant="primary"
              size="small"
              @click=${this.handleCreateClick}
            >
              <sl-icon name="plus-lg"></sl-icon>
            </ticks-button>
          </sl-tooltip>
        </div>
      </header>
    `}};je.styles=T`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background-color: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left ticks-logo {
      display: flex;
      align-items: center;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
    }

    .readonly-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      background: var(--yellow);
      color: var(--base);
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .readonly-badge sl-icon {
      font-size: 0.85rem;
    }

    /* Connection status dot */
    .connection-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .connection-status.connected {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 4px var(--green, #a6e3a1);
    }

    .connection-status.connecting {
      background: var(--yellow, #f9e2af);
      animation: pulse-status 1s ease-in-out infinite;
    }

    .connection-status.disconnected {
      background: var(--red, #f38ba8);
    }

    @keyframes pulse-status {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      max-width: 600px;
    }

    .header-center sl-input {
      flex: 1;
      max-width: 250px;
    }

    .header-center sl-select {
      min-width: 220px;
    }

    .epic-id {
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile menu button */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .menu-toggle:hover {
      background: var(--surface1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-center {
        display: none;
      }

      .menu-toggle {
        display: block;
      }
    }

    @media (max-width: 480px) {
      header {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .repo-badge {
        display: none;
      }

      .header-left ticks-logo {
        --logo-size: 20px;
      }

      /* Make buttons larger for touch */
      .header-right sl-button::part(base) {
        min-width: 44px;
        min-height: 44px;
      }

      .menu-toggle {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    /* Style header action buttons with green tones */
    .header-right sl-button::part(base) {
      color: var(--subtext0);
    }

    .header-right sl-button::part(base):hover {
      color: var(--green, #a6e3a1);
      background: var(--surface0);
    }

    .header-right sl-button[variant="primary"]::part(base) {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    .header-right sl-button[variant="primary"]::part(base):hover {
      background: #b8e8b3;
    }

  `;ht([h({type:String,attribute:"repo-name"})],je.prototype,"repoName",2);ht([h({attribute:!1})],je.prototype,"epics",2);ht([h({type:String,attribute:"selected-epic"})],je.prototype,"selectedEpic",2);ht([h({type:String,attribute:"search-term"})],je.prototype,"searchTerm",2);ht([h({type:Boolean,attribute:"readonly-mode"})],je.prototype,"readonlyMode",2);ht([h({type:String,attribute:"connection-status"})],je.prototype,"connectionStatus",2);ht([w()],je.prototype,"debounceTimeout",2);je=ht([$e("tick-header")],je);var nu=Object.defineProperty,lu=Object.getOwnPropertyDescriptor,dr=(e,t,i,r)=>{for(var s=r>1?void 0:r?lu(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&nu(t,i,s),s};let Mt=class extends ge{constructor(){super(...arguments),this.record=null,this.loading=!1,this.error=""}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),r=t%60;return`${i}m ${r}s`}truncateText(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}renderSummary(e){const t=e.metrics.input_tokens+e.metrics.output_tokens,i=e.success?"success":"error";return u`
      <div class="summary-section">
        <div class="summary-header">
          <div class="summary-left">
            <span class="status-icon ${i}">
              <sl-icon name="${e.success?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            </span>
            <span class="model-badge">${e.model}</span>
          </div>
          <div class="summary-right">
            <span class="session-id">${e.session_id}</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Status</span>
            <span class="summary-value ${i}">${e.success?"Success":"Failed"}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Duration</span>
            <span class="summary-value">${this.formatDuration(e.metrics.duration_ms)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tokens</span>
            <span class="summary-value">${this.formatTokenCount(t)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cost</span>
            <span class="summary-value cost">${this.formatCost(e.metrics.cost_usd)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Started</span>
            <span class="summary-value">${this.formatTimestamp(e.started_at)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Ended</span>
            <span class="summary-value">${this.formatTimestamp(e.ended_at)}</span>
          </div>
        </div>

        ${!e.success&&e.error_msg?u`<div class="error-box"><strong>Error:</strong> ${e.error_msg}</div>`:y}
      </div>
    `}renderMetrics(e){const t=e.metrics;return u`
      <sl-details summary="Metrics">
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Input Tokens</span>
            <span class="metric-value">${this.formatTokenCount(t.input_tokens)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Output Tokens</span>
            <span class="metric-value">${this.formatTokenCount(t.output_tokens)}</span>
          </div>
          ${t.cache_read_tokens>0?u`
                <div class="metric-item">
                  <span class="metric-label">Cache Read</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_read_tokens)}</span>
                </div>
              `:y}
          ${t.cache_creation_tokens>0?u`
                <div class="metric-item">
                  <span class="metric-label">Cache Creation</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_creation_tokens)}</span>
                </div>
              `:y}
          <div class="metric-item">
            <span class="metric-label">Duration</span>
            <span class="metric-value">${this.formatDuration(t.duration_ms)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Cost</span>
            <span class="metric-value">${this.formatCost(t.cost_usd)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Turns</span>
            <span class="metric-value">${e.num_turns}</span>
          </div>
        </div>
      </sl-details>
    `}renderOutput(e){return e.output?u`
      <sl-details summary="Output">
        <div class="content-block">${e.output}</div>
      </sl-details>
    `:y}renderThinking(e){return e.thinking?u`
      <sl-details summary="Thinking">
        <div class="content-block">${e.thinking}</div>
      </sl-details>
    `:y}renderToolItem(e){return u`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?u`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:y}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?u`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`:y}
      </li>
    `}renderTools(e){return!e.tools||e.tools.length===0?y:u`
      <sl-details summary="Tools (${e.tools.length})">
        <ul class="tools-list">
          ${e.tools.map(t=>this.renderToolItem(t))}
        </ul>
      </sl-details>
    `}renderVerifierResult(e){const t=e.passed?"passed":"failed";return u`
      <div class="verifier-item ${t}">
        <span class="verifier-icon ${t}">
          <sl-icon name="${e.passed?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?u`<div class="verifier-error">${e.error}</div>`:y}
          ${e.output?u`<div class="verifier-output">${e.output}</div>`:y}
        </div>
      </div>
    `}renderVerification(e){if(!e.verification)return y;const t=e.verification,i=t.all_passed?"passed":"failed",r=t.results||[];return u`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${i}">
            <sl-icon name="${t.all_passed?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            <span>${t.all_passed?"Verified":"Failed"}</span>
          </div>
        </div>
        ${r.length>0?u`
              <div class="verifier-results">
                ${r.map(s=>this.renderVerifierResult(s))}
              </div>
            `:y}
      </sl-details>
    `}render(){if(this.loading)return u`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading run record...</span>
        </div>
      `;if(this.error)return u`<div class="error">${this.error}</div>`;if(!this.record)return u`<div class="empty">No run record available</div>`;const e=this.record,t=e.success?"success":"error";return u`
      <div class="run-record-container ${t}">
        ${this.renderSummary(e)}
        <div class="sections-container">
          ${this.renderMetrics(e)}
          ${this.renderOutput(e)}
          ${this.renderThinking(e)}
          ${this.renderTools(e)}
          ${this.renderVerification(e)}
        </div>
      </div>
    `}};Mt.styles=T`
    :host {
      display: block;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    /* Error state */
    .error {
      color: var(--red);
      font-size: 0.875rem;
      padding: 0.5rem;
    }

    /* Empty state */
    .empty {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Main container */
    .run-record-container {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record-container.success {
      border-left: 3px solid var(--green);
    }

    .run-record-container.error {
      border-left: 3px solid var(--red);
    }

    /* Summary section (always visible) */
    .summary-section {
      padding: 0.75rem;
      background: var(--mantle);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-icon {
      display: flex;
      align-items: center;
    }

    .status-icon.success sl-icon {
      color: var(--green);
    }

    .status-icon.error sl-icon {
      color: var(--red);
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .session-id {
      font-family: monospace;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
    }

    .summary-label {
      color: var(--subtext0);
    }

    .summary-value {
      color: var(--text);
      font-family: monospace;
    }

    .summary-value.success {
      color: var(--green);
    }

    .summary-value.error {
      color: var(--red);
    }

    .summary-value.cost {
      color: var(--green);
      font-weight: 500;
    }

    /* Error message box */
    .error-box {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    /* Collapsible sections using sl-details */
    .sections-container {
      border-top: 1px solid var(--surface1);
    }

    sl-details {
      border-bottom: 1px solid var(--surface1);
    }

    sl-details:last-child {
      border-bottom: none;
    }

    sl-details::part(base) {
      background: transparent;
      border: none;
      border-radius: 0;
    }

    sl-details::part(header) {
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    sl-details::part(summary-icon) {
      color: var(--subtext0);
    }

    sl-details::part(content) {
      padding: 0 0.75rem 0.75rem 0.75rem;
    }

    /* Content blocks */
    .content-block {
      background: var(--crust);
      border-radius: 4px;
      padding: 0.5rem;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 250px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .content-block::-webkit-scrollbar {
      width: 6px;
    }

    .content-block::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .content-block::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    /* Metrics section */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .metric-label {
      color: var(--subtext0);
    }

    .metric-value {
      color: var(--text);
      font-family: monospace;
    }

    /* Tools list */
    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      margin-bottom: 0;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 80px;
    }

    .tool-name.error {
      color: var(--red);
    }

    .tool-input-preview {
      flex: 1;
      color: var(--subtext0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      color: var(--subtext0);
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-error-icon {
      color: var(--red);
      font-size: 0.75rem;
    }

    /* Verification section */
    .verification-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .verifier-results {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
    }

    .verifier-item.passed {
      border-left: 2px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 2px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 0.875rem;
    }

    .verifier-icon.passed {
      color: var(--green);
    }

    .verifier-icon.failed {
      color: var(--red);
    }

    .verifier-content {
      flex: 1;
      min-width: 0;
    }

    .verifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .verifier-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.6875rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--surface0);
      padding: 0.375rem;
      border-radius: 4px;
      max-height: 100px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.6875rem;
      color: var(--red);
      margin-top: 0.25rem;
    }
  `;dr([h({attribute:!1})],Mt.prototype,"record",2);dr([h({type:Boolean})],Mt.prototype,"loading",2);dr([h({type:String})],Mt.prototype,"error",2);Mt=dr([$e("run-record")],Mt);var cu=Object.defineProperty,du=Object.getOwnPropertyDescriptor,U=(e,t,i,r)=>{for(var s=r>1?void 0:r?du(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&cu(t,i,s),s};const uu={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},Gs={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let V=class extends ge{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview",this.isCloudModeController=new Q.StoreController(this,Me)}get isCloudMode(){return this.isCloudModeController.value}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&(this.resetActionState(),this.tick&&this.tick.type==="task"&&this.loadRunRecord())}async loadRunRecord(){if(this.tick){if(this.isCloudMode){this.loadingRunRecord=!1;return}this.loadingRunRecord=!0,this.runRecordError="",this.runRecord=null;try{this.runRecord=await is(this.tick.id)}catch(e){this.runRecordError=e instanceof Error?e.message:"Failed to load run history"}finally{this.loadingRunRecord=!1}}}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Fo(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await No(this.tick.id,this.rejectReason.trim()),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Bo(this.tick.id,this.closeReason.trim()||void 0),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ho(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const i=await Lo(this.tick.id,e);this.optimisticNote=null;const r={...i,is_blocked:(((t=i.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:si(i.notes)};this.emitTickUpdated(r)}catch(i){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=i instanceof Error?i.message:"Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return uu[e]??"Unknown"}getPriorityColor(e){return Gs[e]??Gs[2]}formatStartedAt(e){const t=new Date(e),i=Xd(t,{addSuffix:!0}),r=Yd(t,"h:mm a");return`${i} (${r})`}renderActions(){const e=this.tick;if(!e)return y;const t=e.status==="open",i=e.status==="closed",r=!!e.awaiting,s=!!e.requires,o=t&&r,a=t&&!s,n=i;return!o&&!a&&!n?y:u`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?u`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:y}

        <div class="actions-section">
          ${o?u`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  ${this.loading?"Approving...":"Approve"}
                </ticks-button>
                <ticks-button
                  variant="danger"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </ticks-button>
              `:y}
          ${a?u`
                <ticks-button
                  variant="secondary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </ticks-button>
              `:y}
          ${n?u`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  ${this.loading?"Reopening...":"Reopen"}
                </ticks-button>
              `:y}
        </div>

        ${this.showRejectInput?u`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${d=>{this.rejectReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="danger"
                    size="small"
                    ?disabled=${this.loading||!this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    ${this.loading?"Rejecting...":"Confirm Reject"}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `:y}

        ${this.showCloseInput?u`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${d=>{this.closeReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <ticks-button
                    variant="secondary"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    ${this.loading?"Closing...":"Confirm Close"}
                  </ticks-button>
                  <ticks-button
                    variant="ghost"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </ticks-button>
                </div>
              </div>
            `:y}
      </div>

      <sl-divider></sl-divider>
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?u`<span class="empty-text">None</span>`:u`
      <ul class="link-list">
        ${this.blockerDetails.map(e=>u`
            <li>
              <a
                class="tick-link status-${e.status}"
                @click=${()=>this.handleTickLinkClick(e.id)}
              >
                <span class="link-id">${e.id}</span>
                <span class="link-title">${e.title}</span>
              </a>
            </li>
          `)}
      </ul>
    `}renderParent(){var e;return(e=this.tick)!=null&&e.parent?u`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?u`<span class="link-title">${this.parentTitle}</span>`:y}
      </a>
    `:u`<span class="empty-text">None</span>`}renderLabels(){var e;return!((e=this.tick)!=null&&e.labels)||this.tick.labels.length===0?u`<span class="empty-text">None</span>`:u`
      <div class="labels-container">
        ${this.tick.labels.map(t=>u`<span class="label-badge">${t}</span>`)}
      </div>
    `}renderNoteItem(e,t=!1){return u`
      <li class="note-item ${t?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${e.author??"Unknown"}</span>
          ${e.timestamp?u`<span class="note-timestamp"
                >${this.formatTimestamp(e.timestamp)}</span
              >`:y}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?u`<div class="note-sending">Sending...</div>`:y}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return u`
      ${e?u`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):y}
              </ul>
            </div>
          `:u`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?u`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `:y}

      <!-- Add note form -->
      <div class="add-note-form">
        <sl-textarea
          placeholder="Add a note..."
          rows="2"
          resize="none"
          .value=${this.newNoteText}
          ?disabled=${this.addingNote}
          @sl-input=${t=>{this.newNoteText=t.target.value}}
          @keydown=${t=>{t.key==="Enter"&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.handleAddNote())}}
        ></sl-textarea>
        <div class="add-note-actions">
          <span class="add-note-hint">${this.readonlyMode?"Read-only mode":"Ctrl+Enter to send"}</span>
          <ticks-button
            variant="primary"
            size="small"
            ?disabled=${this.addingNote||!this.newNoteText.trim()||this.readonlyMode}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            ${this.addingNote?"Adding...":"Add Note"}
          </ticks-button>
        </div>
      </div>
    `}toggleSection(e){const t=new Set(this.expandedSections);t.has(e)?t.delete(e):t.add(e),this.expandedSections=t}formatRunTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),r=t%60;return`${i}m ${r}s`}truncateText(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}renderVerification(){var r;if(((r=this.tick)==null?void 0:r.type)!=="task"||!this.runRecord)return y;const e=this.runRecord.verification;if(!e)return this.tick.status==="closed"?u`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `:y;const t=e.all_passed,i=e.results||[];return u`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-circle-fill":"x-circle-fill"}"></sl-icon>
          <span>${t?"Verified":"Failed"}</span>
        </div>

        ${i.length>0?u`
              <div class="verifier-results">
                ${i.map(s=>this.renderVerifierResult(s))}
              </div>
            `:y}
      </div>
      <sl-divider></sl-divider>
    `}renderVerifierResult(e){const t=e.passed,i=this.expandedSections.has(`verifier-${e.verifier}`);return u`
      <div class="verifier-item ${t?"passed":"failed"}">
        <span class="verifier-icon ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?u`<div class="verifier-error">${e.error}</div>`:y}
          ${e.output?u`
                <div
                  class="run-collapsible-header"
                  style="margin-top: 0.5rem;"
                  @click=${()=>this.toggleSection(`verifier-${e.verifier}`)}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${i?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${i?u`<div class="verifier-output">${e.output}</div>`:y}
              `:y}
        </div>
      </div>
    `}renderRunHistory(){var r;if(((r=this.tick)==null?void 0:r.type)!=="task")return y;if(this.loadingRunRecord)return u`
        <div class="section">
          <div class="section-title">Run History</div>
          <div class="run-loading">
            <sl-spinner></sl-spinner>
            <span>Loading run history...</span>
          </div>
        </div>
        <sl-divider></sl-divider>
      `;if(this.runRecordError)return u`
        <div class="section">
          <div class="section-title">Run History</div>
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.runRecordError}
          </sl-alert>
        </div>
        <sl-divider></sl-divider>
      `;if(!this.runRecord)return u`
        <div class="section">
          <div class="section-title">Run History</div>
          <span class="no-run-history">No run history available</span>
        </div>
        <sl-divider></sl-divider>
      `;const e=this.runRecord,t=this.expandedSections.has("run-main"),i=e.metrics.input_tokens+e.metrics.output_tokens;return u`
      <div class="section">
        <div class="section-title">Run History</div>
        <div class="run-history-container">
          <div class="run-record ${e.success?"success":"error"}">
            <!-- Header (always visible, clickable to expand) -->
            <div
              class="run-record-header"
              @click=${()=>this.toggleSection("run-main")}
            >
              <div class="run-header-left">
                <span class="run-status-icon ${e.success?"success":"error"}">
                  <sl-icon name="${e.success?"check-circle-fill":"x-circle-fill"}"></sl-icon>
                </span>
                <span class="run-timestamp">${this.formatRunTimestamp(e.started_at)}</span>
              </div>
              <div class="run-header-right">
                <div class="run-metrics-summary">
                  <span class="run-metric">
                    <span class="run-metric-value">${this.formatTokenCount(i)}</span>
                    <span>tokens</span>
                  </span>
                  <span class="run-cost">${this.formatCost(e.metrics.cost_usd)}</span>
                </div>
                <span class="run-model-badge">${e.model}</span>
                <sl-icon
                  class="expand-icon ${t?"expanded":""}"
                  name="chevron-down"
                ></sl-icon>
              </div>
            </div>

            <!-- Expanded content -->
            ${t?this.renderRunRecordBody(e):y}
          </div>
        </div>
      </div>
      <sl-divider></sl-divider>
    `}renderRunRecordBody(e){return u`
      <div class="run-record-body">
        <!-- Basic details -->
        <div class="run-detail-row">
          <span class="run-detail-label">Session ID</span>
          <span class="run-detail-value">${e.session_id}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Duration</span>
          <span class="run-detail-value">${this.formatDuration(e.metrics.duration_ms)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Turns</span>
          <span class="run-detail-value">${e.num_turns}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Started</span>
          <span class="run-detail-value">${this.formatTimestamp(e.started_at)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Ended</span>
          <span class="run-detail-value">${this.formatTimestamp(e.ended_at)}</span>
        </div>

        <!-- Token breakdown -->
        <div class="run-detail-row">
          <span class="run-detail-label">Input Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(e.metrics.input_tokens)}</span>
        </div>
        <div class="run-detail-row">
          <span class="run-detail-label">Output Tokens</span>
          <span class="run-detail-value">${this.formatTokenCount(e.metrics.output_tokens)}</span>
        </div>
        ${e.metrics.cache_read_tokens>0?u`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Read</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_read_tokens)}</span>
              </div>
            `:y}
        ${e.metrics.cache_creation_tokens>0?u`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_creation_tokens)}</span>
              </div>
            `:y}

        <!-- Error message if failed -->
        ${!e.success&&e.error_msg?u`
              <div class="run-error-msg">
                <strong>Error:</strong> ${e.error_msg}
              </div>
            `:y}

        <!-- Collapsible: Output -->
        ${e.output?u`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-output")}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-output")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-output")?u`
                      <div class="run-collapsible-content">
                        ${e.output}
                      </div>
                    `:y}
              </div>
            `:y}

        <!-- Collapsible: Thinking -->
        ${e.thinking?u`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-thinking")}
                >
                  <span>Thinking</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-thinking")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-thinking")?u`
                      <div class="run-collapsible-content">
                        ${e.thinking}
                      </div>
                    `:y}
              </div>
            `:y}

        <!-- Collapsible: Tools Log -->
        ${e.tools&&e.tools.length>0?u`
              <div class="run-collapsible">
                <div
                  class="run-collapsible-header"
                  @click=${()=>this.toggleSection("run-tools")}
                >
                  <span>Tools (${e.tools.length})</span>
                  <sl-icon
                    class="expand-icon ${this.expandedSections.has("run-tools")?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${this.expandedSections.has("run-tools")?u`
                      <ul class="tools-list">
                        ${e.tools.map(t=>this.renderToolItem(t))}
                      </ul>
                    `:y}
              </div>
            `:y}

        <!-- Link to log file -->
        <a
          class="run-log-link"
          href="javascript:void(0)"
          @click=${()=>{var i;const t=`.tick/logs/records/${(i=this.tick)==null?void 0:i.id}.json`;navigator.clipboard.writeText(t),window.showToast&&window.showToast({message:`Log path copied: ${t}`,variant:"primary",duration:3e3})}}
        >
          <sl-icon name="file-earmark-text"></sl-icon>
          Copy log file path
        </a>
      </div>
    `}renderToolItem(e){return u`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?u`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:y}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?u`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`:y}
      </li>
    `}renderRunTab(){var e;return((e=this.tick)==null?void 0:e.type)!=="task"?u`
        <div class="run-tab-empty">
          <sl-icon name="info-circle"></sl-icon>
          <div class="empty-message">Run data is only available for tasks.</div>
        </div>
      `:u`
      <div class="run-tab-content">
        <run-record
          .record=${this.runRecord}
          .loading=${this.loadingRunRecord}
          .error=${this.runRecordError}
        ></run-record>
      </div>
    `}shouldShowRunTab(){var e,t;return((e=this.tick)==null?void 0:e.type)==="task"&&((t=this.tick)==null?void 0:t.status)==="closed"}renderDetailsContent(){const e=this.tick;return e?u`
      <div class="drawer-content">
        <!-- Header: ID and Title -->
        <div class="section">
          <div class="tick-id">${e.id}</div>
          <h2 class="tick-title">${e.title}</h2>

          <!-- Status badges row -->
          <div class="meta-row">
            <span class="meta-badge type-badge type-${e.type}"
              >${e.type}</span
            >
            <span class="meta-badge status-${e.status}"
              >${e.status.replace("_"," ")}</span
            >
            <span
              class="meta-badge priority"
              style="--priority-color: ${this.getPriorityColor(e.priority)}"
            >
              ${this.getPriorityLabel(e.priority)}
            </span>
            ${e.manual?u`<span class="meta-badge manual">👤 Manual</span>`:y}
            ${e.awaiting?u`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:y}
            ${e.verdict?u`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:y}
            ${this.blockerDetails&&this.blockerDetails.length>0?u`<span class="meta-badge blocked">⊘ Blocked</span>`:y}
          </div>

          <!-- Started time for in_progress ticks -->
          ${e.status==="in_progress"&&e.started_at?u`
                <div class="started-time">
                  Started: ${this.formatStartedAt(e.started_at)}
                </div>
              `:y}
        </div>

        <!-- Actions (approve/reject/close/reopen) -->
        ${this.renderActions()}

        <!-- Description -->
        <div class="section">
          <div class="section-title">Description</div>
          ${e.description?u`<div class="description">${e.description}</div>`:u`<span class="empty-text">No description</span>`}
        </div>

        <!-- Parent Epic -->
        <div class="section">
          <div class="section-title">Parent Epic</div>
          ${this.renderParent()}
        </div>

        <!-- Blocked By -->
        <div class="section">
          <div class="section-title">Blocked By</div>
          ${this.renderBlockers()}
        </div>

        <!-- Labels -->
        <div class="section">
          <div class="section-title">Labels</div>
          ${this.renderLabels()}
        </div>

        <sl-divider></sl-divider>

        <!-- Notes -->
        <div class="section">
          <div class="section-title">Notes</div>
          ${this.renderNotes()}
        </div>

        <sl-divider></sl-divider>

        <!-- Timestamps -->
        <div class="section">
          <div class="timestamp-row">
            <span class="timestamp-label">Created</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(e.created_at)}</span
            >
          </div>
          <div class="timestamp-row" style="margin-top: 0.375rem">
            <span class="timestamp-label">Updated</span>
            <span class="timestamp-value"
              >${this.formatTimestamp(e.updated_at)}</span
            >
          </div>
          ${e.closed_at?u`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(e.closed_at)}</span
                  >
                </div>
              `:y}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?u`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:y}
      </div>
    `:y}render(){const e=this.tick,t=this.shouldShowRunTab();return u`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?t?u`
                <div class="tab-container">
                  <sl-tab-group>
                    <sl-tab slot="nav" panel="overview" active>Overview</sl-tab>
                    <sl-tab slot="nav" panel="run">Run</sl-tab>

                    <sl-tab-panel name="overview" active>
                      ${this.renderDetailsContent()}
                    </sl-tab-panel>

                    <sl-tab-panel name="run">
                      ${this.renderRunTab()}
                    </sl-tab-panel>
                  </sl-tab-group>
                </div>
              `:this.renderDetailsContent():u`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};V.styles=T`
    :host {
      display: block;
    }

    sl-drawer::part(panel) {
      width: 420px;
      background: var(--base);
    }

    sl-drawer::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-drawer::part(title) {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-drawer::part(close-button) {
      color: var(--subtext0);
    }

    sl-drawer::part(close-button):hover {
      color: var(--text);
    }

    sl-drawer::part(body) {
      padding: 0;
    }

    .drawer-content {
      padding: 1rem;
    }

    .section {
      margin-bottom: 1.25rem;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
    }

    .tick-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--blue);
      margin-bottom: 0.25rem;
    }

    .tick-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .started-time {
      font-size: 0.8125rem;
      color: var(--peach);
      margin-top: 0.5rem;
    }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.type-badge {
      text-transform: capitalize;
    }

    .meta-badge.type-bug {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.type-feature {
      background: rgba(137, 180, 250, 0.2);
      color: var(--blue);
    }

    .meta-badge.type-epic {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.type-chore {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.type-task {
      background: var(--surface1);
      color: var(--subtext1);
    }

    .meta-badge.status-open {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.status-in_progress {
      background: rgba(250, 179, 135, 0.2);
      color: var(--peach);
    }

    .meta-badge.status-closed {
      background: var(--surface1);
      color: var(--subtext0);
    }

    .meta-badge.priority {
      border-left: 3px solid var(--priority-color);
    }

    .meta-badge.manual {
      background: rgba(203, 166, 247, 0.2);
      color: var(--mauve);
    }

    .meta-badge.awaiting {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .meta-badge.blocked {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .meta-badge.verdict-approved {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .meta-badge.verdict-rejected {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .description {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--surface0);
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface1);
    }

    .empty-text {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    .link-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .link-list li {
      margin-bottom: 0.375rem;
    }

    .link-list li:last-child {
      margin-bottom: 0;
    }

    .tick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .tick-link:hover {
      color: var(--sapphire);
      text-decoration: underline;
    }

    .tick-link .link-id {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .tick-link .link-title {
      color: var(--subtext1);
    }

    .tick-link.status-closed .link-title {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .label-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .timestamp-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .timestamp-label {
      color: var(--subtext0);
    }

    .timestamp-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .note-item {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      padding: 0.625rem;
      margin-bottom: 0.5rem;
    }

    .note-item:last-child {
      margin-bottom: 0;
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.375rem;
      font-size: 0.75rem;
    }

    .note-author {
      font-weight: 500;
      color: var(--blue);
    }

    .note-timestamp {
      font-family: monospace;
      color: var(--subtext0);
    }

    .note-text {
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 480px) {
      sl-drawer::part(panel) {
        width: 100vw;
        max-width: 100vw;
      }

      /* Larger touch targets for mobile */
      .actions-section sl-button::part(base) {
        min-height: 44px;
        font-size: 1rem;
      }

      .add-note-actions sl-button::part(base) {
        min-height: 44px;
      }

      .tick-link {
        padding: 0.5rem;
        margin: -0.5rem;
      }

      .reason-buttons sl-button::part(base) {
        min-height: 44px;
      }
    }

    /* Action buttons section */
    .actions-section {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .actions-section sl-button::part(base) {
      font-size: 0.875rem;
    }

    /* Reason input container */
    .reason-container {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
    }

    .reason-container .reason-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext0);
      margin-bottom: 0.5rem;
      display: block;
    }

    .reason-container .reason-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Error alert */
    .error-alert {
      margin-bottom: 1rem;
    }

    /* Notes scroll container */
    .notes-scroll {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 0.75rem;
    }

    /* Optimistic note styling */
    .note-optimistic {
      opacity: 0.7;
      border-style: dashed;
    }

    .note-sending {
      font-size: 0.75rem;
      color: var(--subtext0);
      font-style: italic;
      margin-top: 0.25rem;
    }

    /* Add note form */
    .add-note-form {
      margin-top: 0.75rem;
    }

    .add-note-form sl-textarea::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    .add-note-form sl-textarea::part(textarea) {
      color: var(--text);
      font-size: 0.875rem;
    }

    .add-note-form sl-textarea::part(textarea)::placeholder {
      color: var(--subtext0);
    }

    .add-note-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .add-note-hint {
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .add-note-error {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    /* Run History styles */
    .run-history-container {
      margin-top: 0.5rem;
    }

    .run-record {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow: hidden;
    }

    .run-record.success {
      border-left: 3px solid var(--green);
    }

    .run-record.error {
      border-left: 3px solid var(--red);
    }

    .run-record-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--mantle);
      border-bottom: 1px solid var(--surface1);
      cursor: pointer;
      user-select: none;
    }

    .run-record-header:hover {
      background: var(--surface0);
    }

    .run-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-status-icon {
      display: flex;
      align-items: center;
    }

    .run-status-icon.success sl-icon {
      color: var(--green);
    }

    .run-status-icon.error sl-icon {
      color: var(--red);
    }

    .run-timestamp {
      font-size: 0.75rem;
      color: var(--subtext1);
      font-family: monospace;
    }

    .run-header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-metrics-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0);
    }

    .run-metric {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .run-metric-value {
      font-family: monospace;
      color: var(--subtext1);
    }

    .run-cost {
      color: var(--green);
      font-weight: 500;
    }

    .run-model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1);
      border-radius: 4px;
      font-size: 0.625rem;
      color: var(--subtext0);
    }

    .expand-icon {
      color: var(--subtext0);
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .run-record-body {
      padding: 0.75rem;
    }

    .run-detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .run-detail-row:last-child {
      margin-bottom: 0;
    }

    .run-detail-label {
      color: var(--subtext0);
    }

    .run-detail-value {
      color: var(--text);
      font-family: monospace;
    }

    .run-collapsible {
      margin-top: 0.75rem;
    }

    .run-collapsible-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1);
    }

    .run-collapsible-header:hover {
      background: var(--surface0);
    }

    .run-collapsible-content {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--crust);
      border-radius: 4px;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    }

    .run-collapsible-content::-webkit-scrollbar {
      width: 6px;
    }

    .run-collapsible-content::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .run-collapsible-content::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 3px;
    }

    .tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--surface0);
      font-size: 0.75rem;
    }

    .tool-item:last-child {
      border-bottom: none;
    }

    .tool-name {
      font-weight: 500;
      color: var(--blue);
      min-width: 60px;
    }

    .tool-name.error {
      color: var(--red);
    }

    .tool-input-preview {
      flex: 1;
      color: var(--subtext0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      color: var(--subtext0);
      font-family: monospace;
      font-size: 0.6875rem;
    }

    .run-error-msg {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red);
    }

    .run-log-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--blue);
      text-decoration: none;
      cursor: pointer;
    }

    .run-log-link:hover {
      text-decoration: underline;
    }

    .run-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--subtext0);
    }

    .no-run-history {
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
    }

    /* Verification styles */
    .verification-section {
      margin-top: 0.75rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green);
    }

    .verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red);
    }

    .verification-badge.pending {
      background: rgba(249, 226, 175, 0.2);
      color: var(--yellow);
    }

    .verification-badge sl-icon {
      font-size: 1rem;
    }

    .verifier-results {
      margin-top: 0.75rem;
    }

    .verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .verifier-item:last-child {
      margin-bottom: 0;
    }

    .verifier-item.passed {
      border-left: 3px solid var(--green);
    }

    .verifier-item.failed {
      border-left: 3px solid var(--red);
    }

    .verifier-icon {
      flex-shrink: 0;
      font-size: 1rem;
    }

    .verifier-icon.passed {
      color: var(--green);
    }

    .verifier-icon.failed {
      color: var(--red);
    }

    .verifier-content {
      flex: 1;
      min-width: 0;
    }

    .verifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .verifier-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text);
    }

    .verifier-duration {
      font-size: 0.6875rem;
      font-family: monospace;
      color: var(--subtext0);
    }

    .verifier-output {
      font-size: 0.75rem;
      color: var(--subtext1);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background: var(--crust);
      padding: 0.5rem;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .verifier-error {
      font-size: 0.75rem;
      color: var(--red);
      margin-top: 0.25rem;
    }

    /* Tab group styles */
    .tab-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.75rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.625rem 0.875rem;
      color: var(--subtext0);
    }

    sl-tab::part(base):hover {
      color: var(--text);
    }

    sl-tab[active]::part(base) {
      color: var(--blue);
    }

    sl-tab-panel {
      height: 100%;
      overflow-y: auto;
    }

    sl-tab-panel::part(base) {
      padding: 0;
      height: 100%;
    }

    .run-tab-content {
      padding: 1rem;
    }

    .run-tab-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--subtext0);
    }

    .run-tab-empty sl-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .run-tab-empty .empty-message {
      font-size: 0.875rem;
      font-style: italic;
    }
  `;U([h({attribute:!1})],V.prototype,"tick",2);U([h({type:Boolean})],V.prototype,"open",2);U([h({attribute:!1})],V.prototype,"notesList",2);U([h({attribute:!1})],V.prototype,"blockerDetails",2);U([h({type:String,attribute:"parent-title"})],V.prototype,"parentTitle",2);U([h({type:Boolean,attribute:"readonly-mode"})],V.prototype,"readonlyMode",2);U([w()],V.prototype,"loading",2);U([w()],V.prototype,"errorMessage",2);U([w()],V.prototype,"showRejectInput",2);U([w()],V.prototype,"showCloseInput",2);U([w()],V.prototype,"rejectReason",2);U([w()],V.prototype,"closeReason",2);U([w()],V.prototype,"newNoteText",2);U([w()],V.prototype,"addingNote",2);U([w()],V.prototype,"addNoteError",2);U([w()],V.prototype,"optimisticNote",2);U([w()],V.prototype,"runRecord",2);U([w()],V.prototype,"loadingRunRecord",2);U([w()],V.prototype,"runRecordError",2);U([w()],V.prototype,"expandedSections",2);U([w()],V.prototype,"activeTab",2);V=U([$e("tick-detail-drawer")],V);var hu=Object.defineProperty,pu=Object.getOwnPropertyDescriptor,ke=(e,t,i,r)=>{for(var s=r>1?void 0:r?pu(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&hu(t,i,s),s};const fu=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],mu=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let de=class extends ge{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleAwaitingChange(e){const t=e.target;this.awaiting=t.value}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent),this.awaiting&&(e.awaiting=this.awaiting);try{const i=await Io(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(r=>r.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof Eo?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return u`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?u`<div class="error-message">${this.error}</div>`:y}

        <div class="form-field">
          <label>
            Title <span class="required">*</span>
          </label>
          <sl-input
            name="title"
            placeholder="Enter tick title"
            .value=${this.tickTitle}
            @sl-input=${this.handleTitleInput}
            ?disabled=${this.loading}
            autofocus
          ></sl-input>
        </div>

        <div class="form-field">
          <label>Description</label>
          <sl-textarea
            placeholder="Enter description (optional)"
            rows="3"
            resize="auto"
            .value=${this.tickDescription}
            @sl-input=${this.handleDescriptionInput}
            ?disabled=${this.loading}
          ></sl-textarea>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Type</label>
            <sl-select
              .value=${this.type}
              @sl-change=${this.handleTypeChange}
              ?disabled=${this.loading}
            >
              ${fu.map(e=>u`
                  <sl-option value=${e.value}>${e.label}</sl-option>
                `)}
            </sl-select>
          </div>

          <div class="form-field">
            <label>Priority</label>
            <sl-select
              .value=${String(this.priority)}
              @sl-change=${this.handlePriorityChange}
              ?disabled=${this.loading}
            >
              ${mu.map(e=>u`
                  <sl-option value=${String(e.value)}>${e.label}</sl-option>
                `)}
            </sl-select>
          </div>
        </div>

        <div class="form-field">
          <label>Parent Epic</label>
          <sl-select
            placeholder="None"
            clearable
            .value=${this.parent}
            @sl-change=${this.handleParentChange}
            ?disabled=${this.loading}
          >
            ${this.epics.map(e=>u`
                <sl-option value=${e.id}>
                  <span class="epic-id">${e.id}</span> ${e.title}
                </sl-option>
              `)}
          </sl-select>
        </div>

        <div class="form-field">
          <label>Labels</label>
          <sl-input
            placeholder="bug, urgent, frontend (comma-separated)"
            .value=${this.labels}
            @sl-input=${this.handleLabelsInput}
            ?disabled=${this.loading}
          ></sl-input>
        </div>

        <div class="form-field">
          <label>Workflow</label>
          <sl-select
            placeholder="Agent task (default)"
            .value=${this.awaiting}
            @sl-change=${this.handleAwaitingChange}
            ?disabled=${this.loading}
            clearable
          >
            <sl-option value="work">Human task (manual work)</sl-option>
            <sl-option value="approval">Awaiting approval</sl-option>
            <sl-option value="input">Awaiting input</sl-option>
            <sl-option value="review">Awaiting review</sl-option>
          </sl-select>
          <div class="checkbox-help">
            Leave empty for agent-automated tasks. Select a state if human action is required.
          </div>
        </div>

        <div slot="footer" class="footer-buttons">
          <ticks-button
            variant="secondary"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </ticks-button>
          <ticks-button
            variant="primary"
            @click=${this.handleSubmit}
            ?disabled=${this.loading}
          >
            ${this.loading?"Creating...":"Create"}
          </ticks-button>
        </div>
      </sl-dialog>
    `}};de.styles=T`
    :host {
      display: block;
    }

    sl-dialog::part(panel) {
      width: 480px;
      max-width: 95vw;
      background: var(--base);
    }

    sl-dialog::part(header) {
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    sl-dialog::part(title) {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    sl-dialog::part(close-button) {
      color: var(--subtext0);
    }

    sl-dialog::part(close-button):hover {
      color: var(--text);
    }

    sl-dialog::part(body) {
      padding: 1.25rem;
    }

    sl-dialog::part(footer) {
      background: var(--surface0);
      border-top: 1px solid var(--surface1);
      padding: 1rem 1.25rem;
    }

    .form-field {
      margin-bottom: 1rem;
    }

    .form-field:last-child {
      margin-bottom: 0;
    }

    .form-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--subtext1);
      margin-bottom: 0.375rem;
    }

    .form-field .required {
      color: var(--red);
    }

    .epic-id {
      font-family: var(--sl-font-mono);
      font-size: 0.75em;
      padding: 0.15em 0.4em;
      background: var(--surface1);
      border-radius: 3px;
      color: var(--subtext0);
      margin-right: 0.5em;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-row .form-field {
      flex: 1;
    }

    sl-input,
    sl-textarea,
    sl-select {
      width: 100%;
    }

    sl-checkbox {
      margin-top: 0.5rem;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text);
    }

    .checkbox-help {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-left: 1.75rem;
      margin-top: 0.25rem;
    }

    .error-message {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid var(--red);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      color: var(--red);
      font-size: 0.875rem;
    }

    .footer-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `;ke([h({type:Boolean})],de.prototype,"open",2);ke([h({type:Array,attribute:!1})],de.prototype,"epics",2);ke([w()],de.prototype,"loading",2);ke([w()],de.prototype,"error",2);ke([w()],de.prototype,"tickTitle",2);ke([w()],de.prototype,"tickDescription",2);ke([w()],de.prototype,"type",2);ke([w()],de.prototype,"priority",2);ke([w()],de.prototype,"parent",2);ke([w()],de.prototype,"labels",2);ke([w()],de.prototype,"awaiting",2);ke([C('sl-input[name="title"]')],de.prototype,"titleInput",2);de=ke([$e("tick-create-dialog")],de);var bu=Object.defineProperty,gu=Object.getOwnPropertyDescriptor,Zo=(e,t,i,r)=>{for(var s=r>1?void 0:r?gu(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&bu(t,i,s),s};const vu=5e3;let yu=0;function wu(){return`toast-${++yu}-${Date.now()}`}let Vi=class extends ge{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:wu(),message:e.message,variant:e.variant??"primary",duration:e.duration??vu};if(this.toasts=[...this.toasts,t],t.duration>0){const i=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,i)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(i=>i.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return u`
      ${this.toasts.map(e=>u`
        <div class="toast-container ${this.exitingToasts.has(e.id)?"exiting":""}">
          <sl-alert
            variant=${e.variant}
            open
            closable
            @sl-after-hide=${()=>this.handleCloseRequest(e.id)}
          >
            <sl-icon slot="icon" name=${this.getIconForVariant(e.variant)}></sl-icon>
            ${e.message}
          </sl-alert>
        </div>
      `)}
    `}};Vi.styles=T`
    :host {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.5rem;
      pointer-events: none;
      max-width: calc(100vw - 2rem);
    }

    .toast-container {
      pointer-events: auto;
      animation: toast-enter 0.3s ease-out forwards;
    }

    .toast-container.exiting {
      animation: toast-exit 0.3s ease-in forwards;
    }

    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-exit {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    sl-alert {
      min-width: 280px;
      max-width: 400px;
    }

    sl-alert::part(base) {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    sl-alert::part(message) {
      color: var(--text);
      font-size: 0.875rem;
    }

    /* Variant-specific styling */
    sl-alert[variant="success"]::part(base) {
      border-left: 4px solid var(--green);
    }

    sl-alert[variant="warning"]::part(base) {
      border-left: 4px solid var(--yellow);
    }

    sl-alert[variant="danger"]::part(base) {
      border-left: 4px solid var(--red);
    }

    sl-alert[variant="primary"]::part(base) {
      border-left: 4px solid var(--blue);
    }

    /* Icon colors by variant */
    sl-alert[variant="success"]::part(icon) {
      color: var(--green);
    }

    sl-alert[variant="warning"]::part(icon) {
      color: var(--yellow);
    }

    sl-alert[variant="danger"]::part(icon) {
      color: var(--red);
    }

    sl-alert[variant="primary"]::part(icon) {
      color: var(--blue);
    }

    /* Close button styling for visibility in dark theme */
    sl-alert::part(close-button) {
      color: var(--subtext0);
    }

    sl-alert::part(close-button):hover {
      color: var(--text);
    }

    /* Countdown animation for auto-dismiss */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: var(--overlay1);
      border-radius: 0 0 0 4px;
    }

    @media (max-width: 480px) {
      :host {
        bottom: 0.5rem;
        right: 0.5rem;
        left: 0.5rem;
        max-width: none;
      }

      sl-alert {
        min-width: unset;
        max-width: none;
        width: 100%;
      }
    }
  `;Zo([w()],Vi.prototype,"toasts",2);Vi=Zo([$e("tick-toast-stack")],Vi);var ku=Object.defineProperty,xu=Object.getOwnPropertyDescriptor,Bt=(e,t,i,r)=>{for(var s=r>1?void 0:r?xu(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&ku(t,i,s),s};let ct=class extends ge{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(Me.get()){this.loading=!1;return}try{this.activities=await ts(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,i=e.actor,r=e.data||{};switch(t){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return r.reason?`${i} closed: ${r.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${r.to||"someone"}`;case"awaiting":return`Waiting for ${r.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),r=new Date().getTime()-t.getTime(),s=Math.floor(r/1e3),o=Math.floor(s/60),a=Math.floor(o/60),n=Math.floor(a/24);return s<60?"just now":o<60?`${o}m ago`:a<24?`${a}h ago`:n<7?`${n}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return u`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?u`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:y}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?u`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:y}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading?u`<div class="loading-state">Loading...</div>`:this.activities.length===0?u`<div class="empty-state">No recent activity</div>`:this.activities.map(e=>u`
                    <sl-menu-item @click=${()=>this.handleActivityClick(e)}>
                      <div class="activity-item ${this.isUnread(e)?"unread":""}">
                        <div class="activity-icon ${e.action}">
                          ${this.getActionIcon(e.action)}
                        </div>
                        <div class="activity-content">
                          <div class="activity-title">
                            <span class="tick-id">${e.tick}</span>
                          </div>
                          <div class="activity-description">
                            ${this.getActionDescription(e)}
                          </div>
                          <div class="activity-time">
                            ${this.formatRelativeTime(e.ts)}
                          </div>
                        </div>
                      </div>
                    </sl-menu-item>
                  `)}
        </sl-menu>
      </sl-dropdown>
    `}};ct.styles=T`
    :host {
      display: inline-block;
    }

    /* Constrain the dropdown panel width - full width on mobile */
    sl-dropdown::part(panel) {
      width: 360px;
      max-width: calc(100vw - 1rem);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid var(--surface1);
      background: var(--mantle);
    }

    @media (max-width: 480px) {
      sl-dropdown::part(panel) {
        width: calc(100vw - 1rem);
        max-width: none;
        left: 0.5rem !important;
        right: 0.5rem;
      }
    }

    .trigger-button {
      position: relative;
    }

    /* Style trigger and header buttons with green instead of blue */
    .trigger-button sl-button::part(base),
    .menu-header-actions sl-button::part(base) {
      color: var(--subtext0);
    }

    .trigger-button sl-button::part(base):hover,
    .menu-header-actions sl-button::part(base):hover {
      color: var(--green, #a6e3a1);
      background: var(--surface0);
    }

    .unread-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      background: var(--red);
      color: var(--base);
      font-size: 0.625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    sl-menu {
      width: 100%;
      max-height: 400px;
      overflow-y: auto;
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface1);
      font-weight: 600;
      color: var(--text);
    }

    .menu-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .menu-header sl-button::part(base) {
      font-size: 0.75rem;
    }

    .close-button::part(base) {
      padding: 0.25rem;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .loading-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--subtext0);
    }

    .activity-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid var(--surface0);
    }

    .activity-item:hover {
      background: var(--surface0);
    }

    .activity-item.unread {
      background: color-mix(in srgb, var(--blue) 10%, transparent);
    }

    .activity-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }

    .activity-icon.create { background: var(--green); color: var(--base); }
    .activity-icon.update { background: var(--blue); color: var(--base); }
    .activity-icon.close { background: var(--overlay1); color: var(--text); }
    .activity-icon.reopen { background: var(--yellow); color: var(--base); }
    .activity-icon.note { background: var(--lavender); color: var(--base); }
    .activity-icon.approve { background: var(--green); color: var(--base); }
    .activity-icon.reject { background: var(--red); color: var(--base); }
    .activity-icon.assign { background: var(--mauve); color: var(--base); }
    .activity-icon.awaiting { background: var(--yellow); color: var(--base); }
    .activity-icon.block { background: var(--red); color: var(--base); }
    .activity-icon.unblock { background: var(--green); color: var(--base); }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      font-size: 0.875rem;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-title .tick-id {
      color: var(--blue);
      font-family: monospace;
      font-weight: 500;
    }

    .activity-description {
      font-size: 0.75rem;
      color: var(--subtext0);
      margin-top: 0.125rem;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay1);
      margin-top: 0.25rem;
    }

    sl-menu-item::part(base) {
      padding: 0;
    }

    sl-menu-item::part(checked-icon),
    sl-menu-item::part(prefix),
    sl-menu-item::part(suffix) {
      display: none;
    }

    sl-menu-item::part(label) {
      width: 100%;
    }
  `;Bt([C("sl-dropdown")],ct.prototype,"dropdown",2);Bt([w()],ct.prototype,"activities",2);Bt([w()],ct.prototype,"loading",2);Bt([w()],ct.prototype,"unreadCount",2);Bt([w()],ct.prototype,"lastSeenTimestamp",2);ct=Bt([$e("tick-activity-feed")],ct);function ss(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var $t=ss();function Jo(e){$t=e}var ti={exec:()=>null};function A(e,t=""){let i=typeof e=="string"?e:e.source,r={replace:(s,o)=>{let a=typeof o=="string"?o:o.source;return a=a.replace(ce.caret,"$1"),i=i.replace(s,a),r},getRegex:()=>new RegExp(i,t)};return r}var _u=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),ce={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,"i")},Cu=/^(?:[ \t]*(?:\n|$))+/,$u=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Tu=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,bi=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Su=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,os=/(?:[*+-]|\d{1,9}[.)])/,ea=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,ta=A(ea).replace(/bull/g,os).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Eu=A(ea).replace(/bull/g,os).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),as=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,zu=/^[^\n]+/,ns=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Au=A(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",ns).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Du=A(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,os).getRegex(),ur="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",ls=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ou=A("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",ls).replace("tag",ur).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),ia=A(as).replace("hr",bi).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ur).getRegex(),Ru=A(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",ia).getRegex(),cs={blockquote:Ru,code:$u,def:Au,fences:Tu,heading:Su,hr:bi,html:Ou,lheading:ta,list:Du,newline:Cu,paragraph:ia,table:ti,text:zu},Xs=A("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",bi).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ur).getRegex(),Mu={...cs,lheading:Eu,table:Xs,paragraph:A(as).replace("hr",bi).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Xs).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ur).getRegex()},Pu={...cs,html:A(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",ls).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:ti,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:A(as).replace("hr",bi).replace("heading",` *#{1,6} *[^
]`).replace("lheading",ta).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Iu=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Lu=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,ra=/^( {2,}|\\)\n(?!\s*$)/,Fu=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,hr=/[\p{P}\p{S}]/u,ds=/[\s\p{P}\p{S}]/u,sa=/[^\s\p{P}\p{S}]/u,Nu=A(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,ds).getRegex(),oa=/(?!~)[\p{P}\p{S}]/u,Bu=/(?!~)[\s\p{P}\p{S}]/u,Hu=/(?:[^\s\p{P}\p{S}]|~)/u,ju=A(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",_u?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),aa=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Vu=A(aa,"u").replace(/punct/g,hr).getRegex(),Wu=A(aa,"u").replace(/punct/g,oa).getRegex(),na="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Uu=A(na,"gu").replace(/notPunctSpace/g,sa).replace(/punctSpace/g,ds).replace(/punct/g,hr).getRegex(),qu=A(na,"gu").replace(/notPunctSpace/g,Hu).replace(/punctSpace/g,Bu).replace(/punct/g,oa).getRegex(),Yu=A("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,sa).replace(/punctSpace/g,ds).replace(/punct/g,hr).getRegex(),Ku=A(/\\(punct)/,"gu").replace(/punct/g,hr).getRegex(),Gu=A(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Xu=A(ls).replace("(?:-->|$)","-->").getRegex(),Qu=A("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Xu).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Wi=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Zu=A(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Wi).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),la=A(/^!?\[(label)\]\[(ref)\]/).replace("label",Wi).replace("ref",ns).getRegex(),ca=A(/^!?\[(ref)\](?:\[\])?/).replace("ref",ns).getRegex(),Ju=A("reflink|nolink(?!\\()","g").replace("reflink",la).replace("nolink",ca).getRegex(),Qs=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,us={_backpedal:ti,anyPunctuation:Ku,autolink:Gu,blockSkip:ju,br:ra,code:Lu,del:ti,emStrongLDelim:Vu,emStrongRDelimAst:Uu,emStrongRDelimUnd:Yu,escape:Iu,link:Zu,nolink:ca,punctuation:Nu,reflink:la,reflinkSearch:Ju,tag:Qu,text:Fu,url:ti},eh={...us,link:A(/^!?\[(label)\]\((.*?)\)/).replace("label",Wi).getRegex(),reflink:A(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Wi).getRegex()},Ir={...us,emStrongRDelimAst:qu,emStrongLDelim:Wu,url:A(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Qs).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:A(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Qs).getRegex()},th={...Ir,br:A(ra).replace("{2,}","*").getRegex(),text:A(Ir.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},Ci={normal:cs,gfm:Mu,pedantic:Pu},Gt={normal:us,gfm:Ir,breaks:th,pedantic:eh},ih={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Zs=e=>ih[e];function Ye(e,t){if(t){if(ce.escapeTest.test(e))return e.replace(ce.escapeReplace,Zs)}else if(ce.escapeTestNoEncode.test(e))return e.replace(ce.escapeReplaceNoEncode,Zs);return e}function Js(e){try{e=encodeURI(e).replace(ce.percentDecode,"%")}catch{return null}return e}function eo(e,t){var o;let i=e.replace(ce.findPipe,(a,n,d)=>{let c=!1,p=n;for(;--p>=0&&d[p]==="\\";)c=!c;return c?"|":" |"}),r=i.split(ce.splitPipe),s=0;if(r[0].trim()||r.shift(),r.length>0&&!((o=r.at(-1))!=null&&o.trim())&&r.pop(),t)if(r.length>t)r.splice(t);else for(;r.length<t;)r.push("");for(;s<r.length;s++)r[s]=r[s].trim().replace(ce.slashPipe,"|");return r}function Xt(e,t,i){let r=e.length;if(r===0)return"";let s=0;for(;s<r&&e.charAt(r-s-1)===t;)s++;return e.slice(0,r-s)}function rh(e,t){if(e.indexOf(t[1])===-1)return-1;let i=0;for(let r=0;r<e.length;r++)if(e[r]==="\\")r++;else if(e[r]===t[0])i++;else if(e[r]===t[1]&&(i--,i<0))return r;return i>0?-2:-1}function to(e,t,i,r,s){let o=t.href,a=t.title||null,n=e[1].replace(s.other.outputLinkReplace,"$1");r.state.inLink=!0;let d={type:e[0].charAt(0)==="!"?"image":"link",raw:i,href:o,title:a,text:n,tokens:r.inlineTokens(n)};return r.state.inLink=!1,d}function sh(e,t,i){let r=e.match(i.other.indentCodeCompensation);if(r===null)return t;let s=r[1];return t.split(`
`).map(o=>{let a=o.match(i.other.beginningSpace);if(a===null)return o;let[n]=a;return n.length>=s.length?o.slice(s.length):o}).join(`
`)}var Ui=class{constructor(e){N(this,"options");N(this,"rules");N(this,"lexer");this.options=e||$t}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let i=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?i:Xt(i,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let i=t[0],r=sh(i,t[3]||"",this.rules);return{type:"code",raw:i,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:r}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let i=t[2].trim();if(this.rules.other.endingHash.test(i)){let r=Xt(i,"#");(this.options.pedantic||!r||this.rules.other.endingSpaceChar.test(r))&&(i=r.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:i,tokens:this.lexer.inline(i)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:Xt(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let i=Xt(t[0],`
`).split(`
`),r="",s="",o=[];for(;i.length>0;){let a=!1,n=[],d;for(d=0;d<i.length;d++)if(this.rules.other.blockquoteStart.test(i[d]))n.push(i[d]),a=!0;else if(!a)n.push(i[d]);else break;i=i.slice(d);let c=n.join(`
`),p=c.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");r=r?`${r}
${c}`:c,s=s?`${s}
${p}`:p;let m=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,o,!0),this.lexer.state.top=m,i.length===0)break;let b=o.at(-1);if((b==null?void 0:b.type)==="code")break;if((b==null?void 0:b.type)==="blockquote"){let f=b,g=f.raw+`
`+i.join(`
`),v=this.blockquote(g);o[o.length-1]=v,r=r.substring(0,r.length-f.raw.length)+v.raw,s=s.substring(0,s.length-f.text.length)+v.text;break}else if((b==null?void 0:b.type)==="list"){let f=b,g=f.raw+`
`+i.join(`
`),v=this.list(g);o[o.length-1]=v,r=r.substring(0,r.length-b.raw.length)+v.raw,s=s.substring(0,s.length-f.raw.length)+v.raw,i=g.substring(o.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:r,tokens:o,text:s}}}list(e){var i,r;let t=this.rules.block.list.exec(e);if(t){let s=t[1].trim(),o=s.length>1,a={type:"list",raw:"",ordered:o,start:o?+s.slice(0,-1):"",loose:!1,items:[]};s=o?`\\d{1,9}\\${s.slice(-1)}`:`\\${s}`,this.options.pedantic&&(s=o?s:"[*+-]");let n=this.rules.other.listItemRegex(s),d=!1;for(;e;){let p=!1,m="",b="";if(!(t=n.exec(e))||this.rules.block.hr.test(e))break;m=t[0],e=e.substring(m.length);let f=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,_=>" ".repeat(3*_.length)),g=e.split(`
`,1)[0],v=!f.trim(),k=0;if(this.options.pedantic?(k=2,b=f.trimStart()):v?k=t[1].length+1:(k=t[2].search(this.rules.other.nonSpaceChar),k=k>4?1:k,b=f.slice(k),k+=t[1].length),v&&this.rules.other.blankLine.test(g)&&(m+=g+`
`,e=e.substring(g.length+1),p=!0),!p){let _=this.rules.other.nextBulletRegex(k),E=this.rules.other.hrRegex(k),O=this.rules.other.fencesBeginRegex(k),q=this.rules.other.headingBeginRegex(k),j=this.rules.other.htmlBeginRegex(k);for(;e;){let ne=e.split(`
`,1)[0],W;if(g=ne,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),W=g):W=g.replace(this.rules.other.tabCharGlobal,"    "),O.test(g)||q.test(g)||j.test(g)||_.test(g)||E.test(g))break;if(W.search(this.rules.other.nonSpaceChar)>=k||!g.trim())b+=`
`+W.slice(k);else{if(v||f.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||O.test(f)||q.test(f)||E.test(f))break;b+=`
`+g}!v&&!g.trim()&&(v=!0),m+=ne+`
`,e=e.substring(ne.length+1),f=W.slice(k)}}a.loose||(d?a.loose=!0:this.rules.other.doubleBlankLine.test(m)&&(d=!0)),a.items.push({type:"list_item",raw:m,task:!!this.options.gfm&&this.rules.other.listIsTask.test(b),loose:!1,text:b,tokens:[]}),a.raw+=m}let c=a.items.at(-1);if(c)c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd();else return;a.raw=a.raw.trimEnd();for(let p of a.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((i=p.tokens[0])==null?void 0:i.type)==="text"||((r=p.tokens[0])==null?void 0:r.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let b=this.lexer.inlineQueue.length-1;b>=0;b--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[b].src)){this.lexer.inlineQueue[b].src=this.lexer.inlineQueue[b].src.replace(this.rules.other.listReplaceTask,"");break}}let m=this.rules.other.listTaskCheckbox.exec(p.raw);if(m){let b={type:"checkbox",raw:m[0]+" ",checked:m[0]!=="[ ]"};p.checked=b.checked,a.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=b.raw+p.tokens[0].raw,p.tokens[0].text=b.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(b)):p.tokens.unshift({type:"paragraph",raw:b.raw,text:b.raw,tokens:[b]}):p.tokens.unshift(b)}}if(!a.loose){let m=p.tokens.filter(f=>f.type==="space"),b=m.length>0&&m.some(f=>this.rules.other.anyLine.test(f.raw));a.loose=b}}if(a.loose)for(let p of a.items){p.loose=!0;for(let m of p.tokens)m.type==="text"&&(m.type="paragraph")}return a}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let i=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),r=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",s=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:i,raw:t[0],href:r,title:s}}}table(e){var a;let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let i=eo(t[1]),r=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),s=(a=t[3])!=null&&a.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],o={type:"table",raw:t[0],header:[],align:[],rows:[]};if(i.length===r.length){for(let n of r)this.rules.other.tableAlignRight.test(n)?o.align.push("right"):this.rules.other.tableAlignCenter.test(n)?o.align.push("center"):this.rules.other.tableAlignLeft.test(n)?o.align.push("left"):o.align.push(null);for(let n=0;n<i.length;n++)o.header.push({text:i[n],tokens:this.lexer.inline(i[n]),header:!0,align:o.align[n]});for(let n of s)o.rows.push(eo(n,o.header.length).map((d,c)=>({text:d,tokens:this.lexer.inline(d),header:!1,align:o.align[c]})));return o}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let i=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:i,tokens:this.lexer.inline(i)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let i=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(i)){if(!this.rules.other.endAngleBracket.test(i))return;let o=Xt(i.slice(0,-1),"\\");if((i.length-o.length)%2===0)return}else{let o=rh(t[2],"()");if(o===-2)return;if(o>-1){let a=(t[0].indexOf("!")===0?5:4)+t[1].length+o;t[2]=t[2].substring(0,o),t[0]=t[0].substring(0,a).trim(),t[3]=""}}let r=t[2],s="";if(this.options.pedantic){let o=this.rules.other.pedanticHrefTitle.exec(r);o&&(r=o[1],s=o[3])}else s=t[3]?t[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(i)?r=r.slice(1):r=r.slice(1,-1)),to(t,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:s&&s.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let i;if((i=this.rules.inline.reflink.exec(e))||(i=this.rules.inline.nolink.exec(e))){let r=(i[2]||i[1]).replace(this.rules.other.multipleSpaceGlobal," "),s=t[r.toLowerCase()];if(!s){let o=i[0].charAt(0);return{type:"text",raw:o,text:o}}return to(i,s,i[0],this.lexer,this.rules)}}emStrong(e,t,i=""){let r=this.rules.inline.emStrongLDelim.exec(e);if(!(!r||r[3]&&i.match(this.rules.other.unicodeAlphaNumeric))&&(!(r[1]||r[2])||!i||this.rules.inline.punctuation.exec(i))){let s=[...r[0]].length-1,o,a,n=s,d=0,c=r[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(c.lastIndex=0,t=t.slice(-1*e.length+s);(r=c.exec(t))!=null;){if(o=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!o)continue;if(a=[...o].length,r[3]||r[4]){n+=a;continue}else if((r[5]||r[6])&&s%3&&!((s+a)%3)){d+=a;continue}if(n-=a,n>0)continue;a=Math.min(a,a+n+d);let p=[...r[0]][0].length,m=e.slice(0,s+r.index+p+a);if(Math.min(s,a)%2){let f=m.slice(1,-1);return{type:"em",raw:m,text:f,tokens:this.lexer.inlineTokens(f)}}let b=m.slice(2,-2);return{type:"strong",raw:m,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let i=t[2].replace(this.rules.other.newLineCharGlobal," "),r=this.rules.other.nonSpaceChar.test(i),s=this.rules.other.startingSpaceChar.test(i)&&this.rules.other.endingSpaceChar.test(i);return r&&s&&(i=i.substring(1,i.length-1)),{type:"codespan",raw:t[0],text:i}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){let t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let i,r;return t[2]==="@"?(i=t[1],r="mailto:"+i):(i=t[1],r=i),{type:"link",raw:t[0],text:i,href:r,tokens:[{type:"text",raw:i,text:i}]}}}url(e){var i;let t;if(t=this.rules.inline.url.exec(e)){let r,s;if(t[2]==="@")r=t[0],s="mailto:"+r;else{let o;do o=t[0],t[0]=((i=this.rules.inline._backpedal.exec(t[0]))==null?void 0:i[0])??"";while(o!==t[0]);r=t[0],t[1]==="www."?s="http://"+t[0]:s=t[0]}return{type:"link",raw:t[0],text:r,href:s,tokens:[{type:"text",raw:r,text:r}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let i=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:i}}}},Ae=class Lr{constructor(t){N(this,"tokens");N(this,"options");N(this,"state");N(this,"inlineQueue");N(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||$t,this.options.tokenizer=this.options.tokenizer||new Ui,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let i={other:ce,block:Ci.normal,inline:Gt.normal};this.options.pedantic?(i.block=Ci.pedantic,i.inline=Gt.pedantic):this.options.gfm&&(i.block=Ci.gfm,this.options.breaks?i.inline=Gt.breaks:i.inline=Gt.gfm),this.tokenizer.rules=i}static get rules(){return{block:Ci,inline:Gt}}static lex(t,i){return new Lr(i).lex(t)}static lexInline(t,i){return new Lr(i).inlineTokens(t)}lex(t){t=t.replace(ce.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let i=0;i<this.inlineQueue.length;i++){let r=this.inlineQueue[i];this.inlineTokens(r.src,r.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,i=[],r=!1){var s,o,a;for(this.options.pedantic&&(t=t.replace(ce.tabCharGlobal,"    ").replace(ce.spaceLine,""));t;){let n;if((o=(s=this.options.extensions)==null?void 0:s.block)!=null&&o.some(c=>(n=c.call({lexer:this},t,i))?(t=t.substring(n.raw.length),i.push(n),!0):!1))continue;if(n=this.tokenizer.space(t)){t=t.substring(n.raw.length);let c=i.at(-1);n.raw.length===1&&c!==void 0?c.raw+=`
`:i.push(n);continue}if(n=this.tokenizer.code(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.at(-1).src=c.text):i.push(n);continue}if(n=this.tokenizer.fences(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.heading(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.hr(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.blockquote(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.list(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.html(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.def(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[n.tag]||(this.tokens.links[n.tag]={href:n.href,title:n.title},i.push(n));continue}if(n=this.tokenizer.table(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.lheading(t)){t=t.substring(n.raw.length),i.push(n);continue}let d=t;if((a=this.options.extensions)!=null&&a.startBlock){let c=1/0,p=t.slice(1),m;this.options.extensions.startBlock.forEach(b=>{m=b.call({lexer:this},p),typeof m=="number"&&m>=0&&(c=Math.min(c,m))}),c<1/0&&c>=0&&(d=t.substring(0,c+1))}if(this.state.top&&(n=this.tokenizer.paragraph(d))){let c=i.at(-1);r&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):i.push(n),r=d.length!==t.length,t=t.substring(n.raw.length);continue}if(n=this.tokenizer.text(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):i.push(n);continue}if(t){let c="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(c);break}else throw new Error(c)}}return this.state.top=!0,i}inline(t,i=[]){return this.inlineQueue.push({src:t,tokens:i}),i}inlineTokens(t,i=[]){var d,c,p,m,b;let r=t,s=null;if(this.tokens.links){let f=Object.keys(this.tokens.links);if(f.length>0)for(;(s=this.tokenizer.rules.inline.reflinkSearch.exec(r))!=null;)f.includes(s[0].slice(s[0].lastIndexOf("[")+1,-1))&&(r=r.slice(0,s.index)+"["+"a".repeat(s[0].length-2)+"]"+r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(s=this.tokenizer.rules.inline.anyPunctuation.exec(r))!=null;)r=r.slice(0,s.index)+"++"+r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let o;for(;(s=this.tokenizer.rules.inline.blockSkip.exec(r))!=null;)o=s[2]?s[2].length:0,r=r.slice(0,s.index+o)+"["+"a".repeat(s[0].length-o-2)+"]"+r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);r=((c=(d=this.options.hooks)==null?void 0:d.emStrongMask)==null?void 0:c.call({lexer:this},r))??r;let a=!1,n="";for(;t;){a||(n=""),a=!1;let f;if((m=(p=this.options.extensions)==null?void 0:p.inline)!=null&&m.some(v=>(f=v.call({lexer:this},t,i))?(t=t.substring(f.raw.length),i.push(f),!0):!1))continue;if(f=this.tokenizer.escape(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.tag(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.link(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(f.raw.length);let v=i.at(-1);f.type==="text"&&(v==null?void 0:v.type)==="text"?(v.raw+=f.raw,v.text+=f.text):i.push(f);continue}if(f=this.tokenizer.emStrong(t,r,n)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.codespan(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.br(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.del(t)){t=t.substring(f.raw.length),i.push(f);continue}if(f=this.tokenizer.autolink(t)){t=t.substring(f.raw.length),i.push(f);continue}if(!this.state.inLink&&(f=this.tokenizer.url(t))){t=t.substring(f.raw.length),i.push(f);continue}let g=t;if((b=this.options.extensions)!=null&&b.startInline){let v=1/0,k=t.slice(1),_;this.options.extensions.startInline.forEach(E=>{_=E.call({lexer:this},k),typeof _=="number"&&_>=0&&(v=Math.min(v,_))}),v<1/0&&v>=0&&(g=t.substring(0,v+1))}if(f=this.tokenizer.inlineText(g)){t=t.substring(f.raw.length),f.raw.slice(-1)!=="_"&&(n=f.raw.slice(-1)),a=!0;let v=i.at(-1);(v==null?void 0:v.type)==="text"?(v.raw+=f.raw,v.text+=f.text):i.push(f);continue}if(t){let v="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(v);break}else throw new Error(v)}}return i}},qi=class{constructor(e){N(this,"options");N(this,"parser");this.options=e||$t}space(e){return""}code({text:e,lang:t,escaped:i}){var o;let r=(o=(t||"").match(ce.notSpaceStart))==null?void 0:o[0],s=e.replace(ce.endingNewline,"")+`
`;return r?'<pre><code class="language-'+Ye(r)+'">'+(i?s:Ye(s,!0))+`</code></pre>
`:"<pre><code>"+(i?s:Ye(s,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,i=e.start,r="";for(let a=0;a<e.items.length;a++){let n=e.items[a];r+=this.listitem(n)}let s=t?"ol":"ul",o=t&&i!==1?' start="'+i+'"':"";return"<"+s+o+`>
`+r+"</"+s+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",i="";for(let s=0;s<e.header.length;s++)i+=this.tablecell(e.header[s]);t+=this.tablerow({text:i});let r="";for(let s=0;s<e.rows.length;s++){let o=e.rows[s];i="";for(let a=0;a<o.length;a++)i+=this.tablecell(o[a]);r+=this.tablerow({text:i})}return r&&(r=`<tbody>${r}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+r+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),i=e.header?"th":"td";return(e.align?`<${i} align="${e.align}">`:`<${i}>`)+t+`</${i}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${Ye(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:i}){let r=this.parser.parseInline(i),s=Js(e);if(s===null)return r;e=s;let o='<a href="'+e+'"';return t&&(o+=' title="'+Ye(t)+'"'),o+=">"+r+"</a>",o}image({href:e,title:t,text:i,tokens:r}){r&&(i=this.parser.parseInline(r,this.parser.textRenderer));let s=Js(e);if(s===null)return Ye(i);e=s;let o=`<img src="${e}" alt="${i}"`;return t&&(o+=` title="${Ye(t)}"`),o+=">",o}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:Ye(e.text)}},hs=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},De=class Fr{constructor(t){N(this,"options");N(this,"renderer");N(this,"textRenderer");this.options=t||$t,this.options.renderer=this.options.renderer||new qi,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new hs}static parse(t,i){return new Fr(i).parse(t)}static parseInline(t,i){return new Fr(i).parseInline(t)}parse(t){var r,s;let i="";for(let o=0;o<t.length;o++){let a=t[o];if((s=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&s[a.type]){let d=a,c=this.options.extensions.renderers[d.type].call({parser:this},d);if(c!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(d.type)){i+=c||"";continue}}let n=a;switch(n.type){case"space":{i+=this.renderer.space(n);break}case"hr":{i+=this.renderer.hr(n);break}case"heading":{i+=this.renderer.heading(n);break}case"code":{i+=this.renderer.code(n);break}case"table":{i+=this.renderer.table(n);break}case"blockquote":{i+=this.renderer.blockquote(n);break}case"list":{i+=this.renderer.list(n);break}case"checkbox":{i+=this.renderer.checkbox(n);break}case"html":{i+=this.renderer.html(n);break}case"def":{i+=this.renderer.def(n);break}case"paragraph":{i+=this.renderer.paragraph(n);break}case"text":{i+=this.renderer.text(n);break}default:{let d='Token with "'+n.type+'" type was not found.';if(this.options.silent)return console.error(d),"";throw new Error(d)}}}return i}parseInline(t,i=this.renderer){var s,o;let r="";for(let a=0;a<t.length;a++){let n=t[a];if((o=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&o[n.type]){let c=this.options.extensions.renderers[n.type].call({parser:this},n);if(c!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(n.type)){r+=c||"";continue}}let d=n;switch(d.type){case"escape":{r+=i.text(d);break}case"html":{r+=i.html(d);break}case"link":{r+=i.link(d);break}case"image":{r+=i.image(d);break}case"checkbox":{r+=i.checkbox(d);break}case"strong":{r+=i.strong(d);break}case"em":{r+=i.em(d);break}case"codespan":{r+=i.codespan(d);break}case"br":{r+=i.br(d);break}case"del":{r+=i.del(d);break}case"text":{r+=i.text(d);break}default:{let c='Token with "'+d.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return r}},$i,Qt=($i=class{constructor(e){N(this,"options");N(this,"block");this.options=e||$t}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?Ae.lex:Ae.lexInline}provideParser(){return this.block?De.parse:De.parseInline}},N($i,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),N($i,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),$i),oh=class{constructor(...e){N(this,"defaults",ss());N(this,"options",this.setOptions);N(this,"parse",this.parseMarkdown(!0));N(this,"parseInline",this.parseMarkdown(!1));N(this,"Parser",De);N(this,"Renderer",qi);N(this,"TextRenderer",hs);N(this,"Lexer",Ae);N(this,"Tokenizer",Ui);N(this,"Hooks",Qt);this.use(...e)}walkTokens(e,t){var r,s;let i=[];for(let o of e)switch(i=i.concat(t.call(this,o)),o.type){case"table":{let a=o;for(let n of a.header)i=i.concat(this.walkTokens(n.tokens,t));for(let n of a.rows)for(let d of n)i=i.concat(this.walkTokens(d.tokens,t));break}case"list":{let a=o;i=i.concat(this.walkTokens(a.items,t));break}default:{let a=o;(s=(r=this.defaults.extensions)==null?void 0:r.childTokens)!=null&&s[a.type]?this.defaults.extensions.childTokens[a.type].forEach(n=>{let d=a[n].flat(1/0);i=i.concat(this.walkTokens(d,t))}):a.tokens&&(i=i.concat(this.walkTokens(a.tokens,t)))}}return i}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(i=>{let r={...i};if(r.async=this.defaults.async||r.async||!1,i.extensions&&(i.extensions.forEach(s=>{if(!s.name)throw new Error("extension name required");if("renderer"in s){let o=t.renderers[s.name];o?t.renderers[s.name]=function(...a){let n=s.renderer.apply(this,a);return n===!1&&(n=o.apply(this,a)),n}:t.renderers[s.name]=s.renderer}if("tokenizer"in s){if(!s.level||s.level!=="block"&&s.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let o=t[s.level];o?o.unshift(s.tokenizer):t[s.level]=[s.tokenizer],s.start&&(s.level==="block"?t.startBlock?t.startBlock.push(s.start):t.startBlock=[s.start]:s.level==="inline"&&(t.startInline?t.startInline.push(s.start):t.startInline=[s.start]))}"childTokens"in s&&s.childTokens&&(t.childTokens[s.name]=s.childTokens)}),r.extensions=t),i.renderer){let s=this.defaults.renderer||new qi(this.defaults);for(let o in i.renderer){if(!(o in s))throw new Error(`renderer '${o}' does not exist`);if(["options","parser"].includes(o))continue;let a=o,n=i.renderer[a],d=s[a];s[a]=(...c)=>{let p=n.apply(s,c);return p===!1&&(p=d.apply(s,c)),p||""}}r.renderer=s}if(i.tokenizer){let s=this.defaults.tokenizer||new Ui(this.defaults);for(let o in i.tokenizer){if(!(o in s))throw new Error(`tokenizer '${o}' does not exist`);if(["options","rules","lexer"].includes(o))continue;let a=o,n=i.tokenizer[a],d=s[a];s[a]=(...c)=>{let p=n.apply(s,c);return p===!1&&(p=d.apply(s,c)),p}}r.tokenizer=s}if(i.hooks){let s=this.defaults.hooks||new Qt;for(let o in i.hooks){if(!(o in s))throw new Error(`hook '${o}' does not exist`);if(["options","block"].includes(o))continue;let a=o,n=i.hooks[a],d=s[a];Qt.passThroughHooks.has(o)?s[a]=c=>{if(this.defaults.async&&Qt.passThroughHooksRespectAsync.has(o))return(async()=>{let m=await n.call(s,c);return d.call(s,m)})();let p=n.call(s,c);return d.call(s,p)}:s[a]=(...c)=>{if(this.defaults.async)return(async()=>{let m=await n.apply(s,c);return m===!1&&(m=await d.apply(s,c)),m})();let p=n.apply(s,c);return p===!1&&(p=d.apply(s,c)),p}}r.hooks=s}if(i.walkTokens){let s=this.defaults.walkTokens,o=i.walkTokens;r.walkTokens=function(a){let n=[];return n.push(o.call(this,a)),s&&(n=n.concat(s.call(this,a))),n}}this.defaults={...this.defaults,...r}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return Ae.lex(e,t??this.defaults)}parser(e,t){return De.parse(e,t??this.defaults)}parseMarkdown(e){return(t,i)=>{let r={...i},s={...this.defaults,...r},o=this.onError(!!s.silent,!!s.async);if(this.defaults.async===!0&&r.async===!1)return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return o(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return o(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));if(s.hooks&&(s.hooks.options=s,s.hooks.block=e),s.async)return(async()=>{let a=s.hooks?await s.hooks.preprocess(t):t,n=await(s.hooks?await s.hooks.provideLexer():e?Ae.lex:Ae.lexInline)(a,s),d=s.hooks?await s.hooks.processAllTokens(n):n;s.walkTokens&&await Promise.all(this.walkTokens(d,s.walkTokens));let c=await(s.hooks?await s.hooks.provideParser():e?De.parse:De.parseInline)(d,s);return s.hooks?await s.hooks.postprocess(c):c})().catch(o);try{s.hooks&&(t=s.hooks.preprocess(t));let a=(s.hooks?s.hooks.provideLexer():e?Ae.lex:Ae.lexInline)(t,s);s.hooks&&(a=s.hooks.processAllTokens(a)),s.walkTokens&&this.walkTokens(a,s.walkTokens);let n=(s.hooks?s.hooks.provideParser():e?De.parse:De.parseInline)(a,s);return s.hooks&&(n=s.hooks.postprocess(n)),n}catch(a){return o(a)}}}onError(e,t){return i=>{if(i.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let r="<p>An error occurred:</p><pre>"+Ye(i.message+"",!0)+"</pre>";return t?Promise.resolve(r):r}if(t)return Promise.reject(i);throw i}}},xt=new oh;function M(e,t){return xt.parse(e,t)}M.options=M.setOptions=function(e){return xt.setOptions(e),M.defaults=xt.defaults,Jo(M.defaults),M};M.getDefaults=ss;M.defaults=$t;M.use=function(...e){return xt.use(...e),M.defaults=xt.defaults,Jo(M.defaults),M};M.walkTokens=function(e,t){return xt.walkTokens(e,t)};M.parseInline=xt.parseInline;M.Parser=De;M.parser=De.parse;M.Renderer=qi;M.TextRenderer=hs;M.Lexer=Ae;M.lexer=Ae.lex;M.Tokenizer=Ui;M.Hooks=Qt;M.parse=M;M.options;M.setOptions;M.use;M.walkTokens;M.parseInline;De.parse;Ae.lex;var ah=Object.defineProperty,nh=Object.getOwnPropertyDescriptor,Ht=(e,t,i,r)=>{for(var s=r>1?void 0:r?nh(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&ah(t,i,s),s};let dt=class extends ge{constructor(){super(...arguments),this.epicId="",this.loading=!1,this.error="",this.content=null,this.renderedHtml="",this.previousEpicId=""}connectedCallback(){super.connectedCallback(),this.epicId&&this.loadContext()}updated(e){e.has("epicId")&&this.epicId!==this.previousEpicId&&(this.previousEpicId=this.epicId,this.loadContext())}async loadContext(){if(!this.epicId){this.content=null,this.renderedHtml="";return}this.loading=!0,this.error="";try{this.content=await Wo(this.epicId),this.content?this.renderedHtml=await M.parse(this.content):this.renderedHtml=""}catch(e){console.error("Failed to load context:",e),this.error=e instanceof Error?e.message:"Failed to load context",this.content=null,this.renderedHtml=""}finally{this.loading=!1}}refresh(){this.loadContext()}render(){return this.loading?u`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading context...</span>
        </div>
      `:this.error?u`<div class="error">${this.error}</div>`:this.epicId?this.content===null?u`<div class="empty">No context available</div>`:u`
      <div class="markdown-container">
        <div class="markdown-content">
          ${_o(this.renderedHtml)}
        </div>
      </div>
    `:u`<div class="empty">No epic selected</div>`}};dt.styles=T`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      font-size: 0.875rem;
      color: var(--subtext0);
      height: 100%;
    }

    /* Error state */
    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--red);
      font-size: 0.875rem;
      padding: 1rem;
      height: 100%;
    }

    /* Empty state */
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      color: var(--subtext0);
      font-style: italic;
      height: 100%;
    }

    /* Markdown container */
    .markdown-container {
      height: 100%;
      overflow-y: auto;
      padding: 1rem;
      background: var(--crust);
    }

    .markdown-container::-webkit-scrollbar {
      width: 8px;
    }

    .markdown-container::-webkit-scrollbar-track {
      background: var(--crust);
    }

    .markdown-container::-webkit-scrollbar-thumb {
      background: var(--surface1);
      border-radius: 4px;
    }

    .markdown-container::-webkit-scrollbar-thumb:hover {
      background: var(--surface2);
    }

    /* Markdown content styling with Catppuccin colors */
    .markdown-content {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text);
    }

    /* Headers */
    .markdown-content h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--mauve);
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface1);
    }

    .markdown-content h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--lavender);
      margin: 1.5rem 0 0.75rem 0;
    }

    .markdown-content h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--blue);
      margin: 1.25rem 0 0.5rem 0;
    }

    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--sapphire);
      margin: 1rem 0 0.5rem 0;
    }

    /* Paragraphs */
    .markdown-content p {
      margin: 0 0 1rem 0;
    }

    /* Links */
    .markdown-content a {
      color: var(--blue);
      text-decoration: none;
    }

    .markdown-content a:hover {
      text-decoration: underline;
      color: var(--sapphire);
    }

    /* Emphasis */
    .markdown-content strong {
      font-weight: 600;
      color: var(--text);
    }

    .markdown-content em {
      font-style: italic;
      color: var(--subtext1);
    }

    /* Lists */
    .markdown-content ul,
    .markdown-content ol {
      margin: 0 0 1rem 0;
      padding-left: 1.5rem;
    }

    .markdown-content li {
      margin-bottom: 0.25rem;
    }

    .markdown-content li::marker {
      color: var(--overlay1);
    }

    /* Blockquotes */
    .markdown-content blockquote {
      margin: 0 0 1rem 0;
      padding: 0.5rem 1rem;
      border-left: 3px solid var(--mauve);
      background: var(--surface0);
      border-radius: 0 4px 4px 0;
    }

    .markdown-content blockquote p {
      margin: 0;
      color: var(--subtext1);
    }

    /* Code blocks */
    .markdown-content pre {
      margin: 0 0 1rem 0;
      padding: 0.75rem 1rem;
      background: var(--mantle);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      overflow-x: auto;
    }

    .markdown-content pre code {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--text);
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* Inline code */
    .markdown-content code {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      background: var(--surface0);
      color: var(--peach);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    /* Horizontal rule */
    .markdown-content hr {
      margin: 1.5rem 0;
      border: none;
      border-top: 1px solid var(--surface1);
    }

    /* Tables */
    .markdown-content table {
      width: 100%;
      margin: 0 0 1rem 0;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .markdown-content th,
    .markdown-content td {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--surface1);
      text-align: left;
    }

    .markdown-content th {
      background: var(--surface0);
      font-weight: 600;
      color: var(--subtext1);
    }

    .markdown-content tr:nth-child(even) {
      background: var(--surface0);
    }

    /* Images */
    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 0.5rem 0;
    }

    /* Task lists */
    .markdown-content input[type="checkbox"] {
      margin-right: 0.5rem;
    }
  `;Ht([h({type:String})],dt.prototype,"epicId",2);Ht([w()],dt.prototype,"loading",2);Ht([w()],dt.prototype,"error",2);Ht([w()],dt.prototype,"content",2);Ht([w()],dt.prototype,"renderedHtml",2);dt=Ht([$e("context-pane")],dt);var lh=Object.defineProperty,ch=Object.getOwnPropertyDescriptor,xe=(e,t,i,r)=>{for(var s=r>1?void 0:r?ch(t,i):t,o=e.length-1,a;o>=0;o--)(a=e[o])&&(s=(r?a(t,i,s):a(s))||s);return r&&s&&lh(t,i,s),s};const io=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let G=class extends ge{constructor(){super(...arguments),this.ticks=[],this.epics=[],this.open=!1,this.activities=[],this.repoName="",this._focusedAttentionIndex=-1,this._detailTick=null,this._detailRunRecord=null,this._detailNotes=[],this._detailLoading=!1,this._detailTab="overview",this._detailExpanded=new Set,this._handleKeyDown=e=>{if(e.key==="Escape"){if(e.stopPropagation(),this._detailTick){this._closeDetailPane();return}this._close();return}const t=this._getHumanTicks(),i=Math.min(t.length,6)-1;switch(e.key){case"j":case"ArrowDown":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.min(this._focusedAttentionIndex+1,i));break;case"k":case"ArrowUp":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.max(this._focusedAttentionIndex-1,0));break;case"Enter":case"i":this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i&&(e.preventDefault(),e.stopPropagation(),this._handleTickClick(t[this._focusedAttentionIndex].id));break;case"a":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const r=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-resume",{detail:{tickId:r.id}}))}break;case"t":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const r=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-retry",{detail:{tickId:r.id}}))}break}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown)}updated(e){super.updated(e),e.has("open")&&this.open&&(this._focusedAttentionIndex=-1,this._closeDetailPane())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown)}_close(){this.dispatchEvent(new CustomEvent("close"))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){this.dispatchEvent(new CustomEvent("epic-select",{detail:{epicId:e}})),this._close()}_handleTickClick(e){this._openDetailPane(e)}_handleOpenOnBoard(e){this.dispatchEvent(new CustomEvent("tick-select",{detail:{tickId:e}})),this._close()}async _openDetailPane(e){var i,r;const t=this.ticks.find(s=>s.id===e);if(t){this._detailTick=t,this._detailTab="overview",this._detailNotes=si(t.notes),this._detailRunRecord=null,this._detailExpanded=new Set,this._detailLoading=!0;try{const[s,o]=await Promise.all([es(e).catch(()=>null),t.type==="task"?is(e).catch(()=>null):Promise.resolve(null)]);if(((i=this._detailTick)==null?void 0:i.id)!==e)return;s&&(this._detailTick={...t,...s,is_blocked:t.is_blocked,column:t.column},this._detailNotes=si(s.notes)),this._detailRunRecord=o}catch{}finally{((r=this._detailTick)==null?void 0:r.id)===e&&(this._detailLoading=!1)}}}_closeDetailPane(){this._detailTick=null,this._detailRunRecord=null,this._detailNotes=[],this._detailLoading=!1,this._detailTab="overview",this._detailExpanded=new Set}_toggleDetailSection(e){const t=new Set(this._detailExpanded);t.has(e)?t.delete(e):t.add(e),this._detailExpanded=t}_getColumnCounts(){const e={blocked:0,ready:0,agent:0,human:0,done:0};for(const t of this.ticks)t.type!=="epic"&&e[t.column]!==void 0&&e[t.column]++;return e}_getTotalNonEpicTicks(){return this.ticks.filter(e=>e.type!=="epic").length}_getEpicProgress(e){const t=this.ticks.filter(c=>c.parent===e&&c.type!=="epic"),i=t.length,r=t.filter(c=>c.column==="done").length,s=t.filter(c=>c.column==="agent").length,o=t.filter(c=>c.column==="human").length,a=t.filter(c=>c.column==="blocked").length,n=t.filter(c=>c.column==="ready").length,d=i>0?Math.round(r/i*100):0;return{total:i,done:r,inProgress:s,needsHuman:o,blocked:a,ready:n,pct:d}}_getHumanTicks(){return this.ticks.filter(e=>e.column==="human"&&e.type!=="epic")}_getActivityIcon(e){switch(e){case"create":return"➕";case"close":return"✅";case"update":return"✏️";case"approve":return"👍";case"reject":return"👎";case"note":return"💬";case"reopen":return"🔄";default:return"•"}}_formatRelativeTime(e){const t=new Date(e),r=new Date().getTime()-t.getTime(),s=Math.floor(r/6e4);if(s<1)return"now";if(s<60)return`${s}m ago`;const o=Math.floor(s/60);return o<24?`${o}h ago`:`${Math.floor(o/24)}d ago`}_getAwaitingLabel(e){if(e.awaiting)switch(e.awaiting){case"approval":return"Awaiting approval";case"review":return"Awaiting review";case"input":return"Awaiting input";case"content":return"Awaiting content";case"escalation":return"Escalated";case"checkpoint":return"Checkpoint";case"work":return"Manual work needed";default:return"Needs attention"}return"Needs attention"}_getPriorityLabel(e){return G.PRIORITY_LABELS[e]??"Unknown"}_getPriorityColor(e){return G.PRIORITY_COLORS[e]??"var(--subtext0)"}_formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}_formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);return t<60?`${t}s`:`${Math.floor(t/60)}m ${t%60}s`}_formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}_formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}_truncate(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}render(){if(!this.open)return y;const e=this._getColumnCounts(),t=this._getTotalNonEpicTicks(),i=this._getHumanTicks();return u`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._detailTick?this._renderDetailPane():y}
            ${this._renderSummaryCards(e,t)}
            ${this._renderDistribution(e,t)}
            ${this._renderEpicProgress()}
            <div class="two-col">
              ${this._renderNeedsAttention(i)}
              ${this._renderRecentActivity()}
            </div>
          </div>
        </div>
      </div>
    `}_renderHeader(){return u`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName?u`<div class="header-subtitle">${this.repoName}</div>`:y}
          </div>
        </div>
        <div class="header-right">
          <span class="kbd-hint">
            Press <kbd>d</kbd> or <kbd>Esc</kbd> to close
          </span>
          <button class="close-btn" @click=${this._close} aria-label="Close dashboard">✕</button>
        </div>
      </div>
    `}_renderSummaryCards(e,t){const i=t>0?Math.round(e.done/t*100):0;return u`
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-card-label">Total Tasks</div>
          <div class="summary-card-value">${t}</div>
          <div class="summary-card-detail">${this.epics.length} epic${this.epics.length!==1?"s":""}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Completion</div>
          <div class="summary-card-value value-green">${i}%</div>
          <div class="summary-card-detail">${e.done} / ${t} done</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Needs Human</div>
          <div class="summary-card-value ${e.human>0?"value-yellow":""}">${e.human}</div>
          <div class="summary-card-detail">awaiting action</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">In Progress</div>
          <div class="summary-card-value ${e.agent>0?"value-peach":""}">${e.agent}</div>
          <div class="summary-card-detail">with agent</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Blocked</div>
          <div class="summary-card-value ${e.blocked>0?"value-red":""}">${e.blocked}</div>
          <div class="summary-card-detail">dependencies unmet</div>
        </div>
      </div>
    `}_renderDistribution(e,t){return t===0?y:u`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${io.map(i=>{const r=e[i.id]/t*100;return r===0?y:u`
                <div
                  class="distribution-segment segment-${i.id}"
                  style="width: ${r}%"
                  title="${i.name}: ${e[i.id]}"
                >
                  ${r>=8?u`<span>${e[i.id]}</span>`:y}
                </div>
              `})}
          </div>
          <div class="distribution-legend">
            ${io.map(i=>u`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${i.color}"></div>
                <span>${i.icon} ${i.name}</span>
                <span class="legend-count">${e[i.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}_renderEpicProgress(){return this.epics.length===0?y:u`
      <div class="section">
        <div class="section-title">Epic Progress</div>
        <div class="epic-list">
          ${this.epics.map(e=>{const t=this._getEpicProgress(e.id);return u`
              <div class="epic-row" @click=${()=>this._handleEpicClick(e.id)}>
                <span class="epic-id">${e.id}</span>
                <div class="epic-info">
                  <div class="epic-title">${e.title}</div>
                  <div class="epic-progress-bar">
                    <div class="epic-progress-fill" style="width: ${t.pct}%"></div>
                  </div>
                </div>
                <div class="epic-stats">
                  <span class="epic-stat">${t.done}/${t.total}</span>
                  <span class="epic-percentage value-green">${t.pct}%</span>
                </div>
              </div>
            `})}
        </div>
      </div>
    `}_renderNeedsAttention(e){return u`
      <div class="section">
        <div class="section-title">Needs Attention (${e.length})</div>
        ${e.length===0?u`<div class="empty-section">No ticks need human attention</div>`:u`
              <div class="attention-list">
                ${e.slice(0,6).map((t,i)=>u`
                  <div
                    class="attention-item ${P({focused:this._focusedAttentionIndex===i})}"
                    @click=${()=>this._handleTickClick(t.id)}
                  >
                    <span class="attention-icon">👤</span>
                    <div class="attention-info">
                      <div class="attention-title">${t.title}</div>
                      <div class="attention-detail">${this._getAwaitingLabel(t)}</div>
                    </div>
                    <span class="attention-id">${t.id}</span>
                  </div>
                `)}
                ${e.length>6?u`<div class="empty-section">+${e.length-6} more</div>`:y}
              </div>
              ${e.length>0?u`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              `:y}
            `}
      </div>
    `}_renderRecentActivity(){return u`
      <div class="section">
        <div class="section-title">Recent Activity</div>
        ${this.activities.length===0?u`<div class="empty-section">No recent activity</div>`:u`
              <div class="activity-list">
                ${this.activities.slice(0,8).map(e=>u`
                  <div class="activity-item" @click=${()=>this._handleTickClick(e.tick)}>
                    <span class="activity-icon">${this._getActivityIcon(e.action)}</span>
                    <span class="activity-text">
                      <span class="tick-ref">${e.tick}</span>
                      ${e.action}${e.actor?` by ${e.actor}`:""}
                    </span>
                    <span class="activity-time">${this._formatRelativeTime(e.ts)}</span>
                  </div>
                `)}
              </div>
            `}
      </div>
    `}_renderDetailPane(){const e=this._detailTick;return e?u`
      <div class="detail-pane">
        <div class="detail-pane-header">
          <div class="detail-pane-header-left">
            <span class="detail-pane-id">${e.id}</span>
            <span class="detail-pane-title">${e.title}</span>
          </div>
          <div class="detail-pane-actions">
            <button
              class="detail-pane-btn primary"
              @click=${()=>this._handleOpenOnBoard(e.id)}
              title="Open in board detail drawer"
            >
              ↗ Open on Board
            </button>
            <button
              class="detail-pane-close"
              @click=${()=>this._closeDetailPane()}
              aria-label="Close detail pane"
            >✕</button>
          </div>
        </div>

        <div class="detail-tabs">
          <button
            class="detail-tab ${this._detailTab==="overview"?"active":""}"
            @click=${()=>{this._detailTab="overview"}}
          >Overview</button>
          ${e.type==="task"?u`
                <button
                  class="detail-tab ${this._detailTab==="attempts"?"active":""}"
                  @click=${()=>{this._detailTab="attempts"}}
                >Attempts</button>
              `:y}
        </div>

        <div class="detail-tab-body">
          ${this._detailLoading?u`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`:this._detailTab==="overview"?this._renderDetailOverview(e):this._renderDetailAttempts()}
        </div>
      </div>
    `:y}_renderDetailOverview(e){return u`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${e.type}">${e.type}</span>
        <span class="detail-meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(e.priority)}"
        >${this._getPriorityLabel(e.priority)}</span>
        ${e.awaiting?u`<span class="detail-meta-badge awaiting">⏳ ${e.awaiting}</span>`:y}
        ${e.is_blocked?u`<span class="detail-meta-badge blocked">⊘ blocked</span>`:y}
        ${e.verification_status==="verified"?u`<span class="detail-meta-badge verified">✓ verified</span>`:e.verification_status==="failed"?u`<span class="detail-meta-badge verification-failed">✗ failed</span>`:y}
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">Description</div>
        ${e.description?u`<div class="detail-description">${e.description}</div>`:u`<div class="detail-field-empty">No description</div>`}
      </div>

      <!-- Acceptance Criteria -->
      ${e.acceptance_criteria?u`
            <div class="detail-field">
              <div class="detail-field-label">Acceptance Criteria</div>
              <div class="detail-description">${e.acceptance_criteria}</div>
            </div>
          `:y}

      <!-- Parent -->
      ${e.parent?u`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${()=>this._handleTickClick(e.parent)}>${e.parent}</a>
            </div>
          `:y}

      <!-- Blocked by -->
      ${e.blocked_by&&e.blocked_by.length>0?u`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${e.blocked_by.map(t=>u`
                <a class="detail-link" @click=${()=>this._handleTickClick(t)} style="margin-right: 0.5rem;">${t}</a>
              `)}
            </div>
          `:y}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length>0?u`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(t=>u`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${t.author??"Unknown"}</span>
                      ${t.timestamp?u`<span class="detail-note-time">${this._formatRelativeTime(t.timestamp)}</span>`:y}
                    </div>
                    <div class="detail-note-text">${t.text}</div>
                  </li>
                `)}
              </ul>
            `:u`<div class="detail-field-empty">No notes</div>`}
      </div>

      <!-- Closed reason -->
      ${e.closed_reason?u`
            <div class="detail-field">
              <div class="detail-field-label">Close Reason</div>
              <div class="detail-description">${e.closed_reason}</div>
            </div>
          `:y}

      <!-- Timestamps -->
      <div class="detail-field">
        <div class="detail-field-label">Timestamps</div>
        <div class="detail-timestamps">
          <div class="detail-ts-row">
            <span class="detail-ts-label">Created</span>
            <span class="detail-ts-value">${this._formatTimestamp(e.created_at)}</span>
          </div>
          <div class="detail-ts-row">
            <span class="detail-ts-label">Updated</span>
            <span class="detail-ts-value">${this._formatTimestamp(e.updated_at)}</span>
          </div>
          ${e.started_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.started_at)}</span>
                </div>
              `:y}
          ${e.closed_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.closed_at)}</span>
                </div>
              `:y}
        </div>
      </div>
    `}_renderDetailAttempts(){var i;const e=this._detailRunRecord;if(!e)return u`<div class="detail-field-empty">No run history available for this task.</div>`;const t=e.metrics.input_tokens+e.metrics.output_tokens;return u`
      <!-- Run summary -->
      <div class="run-summary ${e.success?"success":"error"}">
        <div class="run-status-dot ${e.success?"success":"error"}"></div>
        <div class="run-summary-info">
          <div class="run-summary-title">${e.success?"Completed Successfully":"Failed"}</div>
          <div class="run-summary-meta">
            ${this._formatTimestamp(e.started_at)} · ${e.num_turns} turns · ${e.model}
          </div>
        </div>
        <span class="run-summary-cost">${this._formatCost(e.metrics.cost_usd)}</span>
      </div>

      <!-- Error message -->
      ${!e.success&&e.error_msg?u`<div class="run-error-banner"><strong>Error:</strong> ${e.error_msg}</div>`:y}

      <!-- Verification -->
      ${e.verification?u`
            <div class="run-verification-badge ${e.verification.all_passed?"passed":"failed"}">
              ${e.verification.all_passed?"✓ Verified":"✗ Verification Failed"}
            </div>
            ${((i=e.verification.results)==null?void 0:i.map(r=>u`
              <div class="run-verifier-item ${r.passed?"passed":"failed"}">
                <span class="run-verifier-icon ${r.passed?"passed":"failed"}">${r.passed?"✓":"✗"}</span>
                <span class="run-verifier-name">${r.verifier}</span>
                <span class="run-verifier-duration">${this._formatDuration(r.duration_ms)}</span>
              </div>
            `))??y}
          `:y}

      <!-- Metrics grid -->
      <div class="run-detail-grid">
        <div class="run-detail-cell">
          <div class="run-detail-cell-label">Duration</div>
          <div class="run-detail-cell-value">${this._formatDuration(e.metrics.duration_ms)}</div>
        </div>
        <div class="run-detail-cell">
          <div class="run-detail-cell-label">Total Tokens</div>
          <div class="run-detail-cell-value">${this._formatTokenCount(t)}</div>
        </div>
        <div class="run-detail-cell">
          <div class="run-detail-cell-label">Input Tokens</div>
          <div class="run-detail-cell-value">${this._formatTokenCount(e.metrics.input_tokens)}</div>
        </div>
        <div class="run-detail-cell">
          <div class="run-detail-cell-label">Output Tokens</div>
          <div class="run-detail-cell-value">${this._formatTokenCount(e.metrics.output_tokens)}</div>
        </div>
      </div>

      <!-- Output (collapsible) -->
      ${e.output?u`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("output")}
            >
              <span>Output</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("output")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("output")?u`<div class="run-collapse-content">${e.output}</div>`:y}
          `:y}

      <!-- Thinking (collapsible) -->
      ${e.thinking?u`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("thinking")}
            >
              <span>Thinking</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("thinking")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("thinking")?u`<div class="run-collapse-content">${e.thinking}</div>`:y}
          `:y}

      <!-- Tools (collapsible) -->
      ${e.tools&&e.tools.length>0?u`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("tools")}
            >
              <span>Tools (${e.tools.length})</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("tools")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("tools")?u`
                  <ul class="run-tools-list">
                    ${e.tools.map(r=>u`
                      <li class="run-tool-item">
                        <span class="run-tool-name ${r.is_error?"is-error":""}">${r.name}</span>
                        ${r.input?u`<span class="run-tool-input">${this._truncate(r.input)}</span>`:y}
                        <span class="run-tool-duration">${this._formatDuration(r.duration_ms)}</span>
                      </li>
                    `)}
                  </ul>
                `:y}
          `:y}
    `}};G.styles=T`
    :host {
      display: block;
    }

    /* Overlay backdrop */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(17, 17, 27, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Dashboard container */
    .dashboard {
      width: 100%;
      max-width: 1100px;
      background: var(--base, #1e1e2e);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 12px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .header-subtitle {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.375rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    .kbd-hint {
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .kbd-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    /* Body */
    .dashboard-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Section */
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--subtext0, #a6adc8);
    }

    /* Summary cards row */
    .summary-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .summary-card {
      background: var(--surface0, #313244);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-card-label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--subtext0, #a6adc8);
    }

    .summary-card-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
      line-height: 1.2;
    }

    .summary-card-detail {
      font-size: 0.6875rem;
      color: var(--overlay1, #7f849c);
    }

    .value-green { color: var(--green, #a6e3a1); }
    .value-blue { color: var(--blue, #89b4fa); }
    .value-peach { color: var(--peach, #fab387); }
    .value-yellow { color: var(--yellow, #f9e2af); }
    .value-red { color: var(--red, #f38ba8); }
    .value-mauve { color: var(--mauve, #cba6f7); }

    /* Column distribution */
    .distribution-bar-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .distribution-bar {
      height: 28px;
      background: var(--crust, #11111b);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }

    .distribution-segment {
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--crust, #11111b);
      min-width: 0;
      overflow: hidden;
    }

    .distribution-segment span {
      padding: 0 0.375rem;
      white-space: nowrap;
    }

    .segment-blocked { background: var(--red, #f38ba8); }
    .segment-ready { background: var(--blue, #89b4fa); }
    .segment-agent { background: var(--peach, #fab387); }
    .segment-human { background: var(--yellow, #f9e2af); }
    .segment-done { background: var(--green, #a6e3a1); }

    .distribution-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .legend-count {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    /* Epic progress */
    .epic-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .epic-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .epic-row:hover {
      background: var(--surface1, #45475a);
    }

    .epic-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
      min-width: 3rem;
    }

    .epic-info {
      flex: 1;
      min-width: 0;
    }

    .epic-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .epic-progress-bar {
      margin-top: 0.375rem;
      height: 6px;
      background: var(--crust, #11111b);
      border-radius: 3px;
      overflow: hidden;
    }

    .epic-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
      background: var(--green, #a6e3a1);
    }

    .epic-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      white-space: nowrap;
    }

    .epic-stat {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-variant-numeric: tabular-nums;
    }

    .epic-percentage {
      font-weight: 600;
      min-width: 2.5rem;
      text-align: right;
    }

    /* Activity mini-feed */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      border-radius: 4px;
    }

    .activity-item:hover {
      background: var(--surface0, #313244);
    }

    .activity-icon {
      font-size: 0.875rem;
      width: 1.25rem;
      text-align: center;
      flex-shrink: 0;
    }

    .activity-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-text .tick-ref {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .activity-time {
      font-size: 0.625rem;
      color: var(--overlay0, #6c7086);
      white-space: nowrap;
    }

    /* Needs attention section */
    .attention-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .attention-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 6px;
      border-left: 3px solid var(--yellow, #f9e2af);
      cursor: pointer;
      transition: background 0.15s;
    }

    .attention-item:hover,
    .attention-item.focused {
      background: var(--surface1, #45475a);
    }

    .attention-item.focused {
      outline: 2px solid var(--blue, #89b4fa);
      outline-offset: -2px;
    }

    .attention-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .attention-info {
      flex: 1;
      min-width: 0;
    }

    .attention-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attention-detail {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .attention-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
      white-space: nowrap;
    }

    .attention-actions-hint {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .action-hint {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
    }

    .action-hint kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      padding: 0.125rem 0.375rem;
      font-family: monospace;
      font-size: 0.6875rem;
      background: var(--surface1, #45475a);
      border: 1px solid var(--surface2, #585b70);
      border-radius: 3px;
      color: var(--subtext1, #bac2de);
    }

    /* Two-column layout for lower sections */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    /* ================================================================
     * Detail Pane (inline tick detail + run attempts)
     * ================================================================ */
    .detail-pane {
      background: var(--mantle, #181825);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
    }

    .detail-pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .detail-pane-header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
    }

    .detail-pane-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
      color: var(--blue, #89b4fa);
      font-weight: 600;
      flex-shrink: 0;
    }

    .detail-pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .detail-pane-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    .detail-pane-btn {
      background: none;
      border: 1px solid var(--surface1, #45475a);
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      font-size: 0.6875rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.15s;
      font-family: inherit;
    }

    .detail-pane-btn:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
      border-color: var(--overlay0, #6c7086);
    }

    .detail-pane-btn.primary {
      background: var(--blue, #89b4fa);
      color: var(--crust, #11111b);
      border-color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .detail-pane-btn.primary:hover {
      opacity: 0.9;
    }

    .detail-pane-close {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-size: 1rem;
      line-height: 1;
    }

    .detail-pane-close:hover {
      background: var(--surface0, #313244);
      color: var(--text, #cdd6f4);
    }

    /* Detail pane body with tabs */
    .detail-tabs {
      display: flex;
      border-bottom: 1px solid var(--surface1, #45475a);
      background: var(--surface0, #313244);
    }

    .detail-tab {
      background: none;
      border: none;
      padding: 0.5rem 1rem;
      cursor: pointer;
      color: var(--subtext0, #a6adc8);
      font-size: 0.75rem;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      font-family: inherit;
    }

    .detail-tab:hover {
      color: var(--text, #cdd6f4);
    }

    .detail-tab.active {
      color: var(--blue, #89b4fa);
      border-bottom-color: var(--blue, #89b4fa);
    }

    .detail-tab-body {
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    /* Detail pane - Overview tab */
    .detail-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }

    .detail-meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      border-radius: 4px;
      background: var(--surface1, #45475a);
      color: var(--subtext1, #bac2de);
    }

    .detail-meta-badge.type-bug { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.type-feature { background: rgba(137, 180, 250, 0.2); color: var(--blue); }
    .detail-meta-badge.type-epic { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.status-open { background: rgba(166, 227, 161, 0.2); color: var(--green); }
    .detail-meta-badge.status-in_progress { background: rgba(250, 179, 135, 0.2); color: var(--peach); }
    .detail-meta-badge.status-closed { background: var(--surface1); color: var(--subtext0); }
    .detail-meta-badge.awaiting { background: rgba(249, 226, 175, 0.2); color: var(--yellow); }
    .detail-meta-badge.blocked { background: rgba(243, 139, 168, 0.2); color: var(--red); }
    .detail-meta-badge.priority {
      border-left: 3px solid var(--priority-color, var(--subtext0));
    }
    .detail-meta-badge.verified { background: rgba(166, 227, 161, 0.2); color: var(--green); }
    .detail-meta-badge.verification-failed { background: rgba(243, 139, 168, 0.2); color: var(--red); }

    .detail-description {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--crust, #11111b);
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--surface0, #313244);
      margin-bottom: 0.75rem;
    }

    .detail-field {
      margin-bottom: 0.75rem;
    }

    .detail-field-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .detail-field-value {
      font-size: 0.8125rem;
      color: var(--subtext1, #bac2de);
    }

    .detail-field-empty {
      font-size: 0.8125rem;
      color: var(--overlay0, #6c7086);
      font-style: italic;
    }

    .detail-link {
      color: var(--blue, #89b4fa);
      text-decoration: none;
      cursor: pointer;
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
    }

    .detail-link:hover {
      text-decoration: underline;
    }

    .detail-notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .detail-note {
      background: var(--crust, #11111b);
      border: 1px solid var(--surface0, #313244);
      border-radius: 6px;
      padding: 0.5rem 0.625rem;
      margin-bottom: 0.375rem;
    }

    .detail-note:last-child {
      margin-bottom: 0;
    }

    .detail-note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.6875rem;
    }

    .detail-note-author {
      font-weight: 500;
      color: var(--blue, #89b4fa);
    }

    .detail-note-time {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--overlay0, #6c7086);
    }

    .detail-note-text {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .detail-timestamps {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-ts-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
    }

    .detail-ts-label {
      color: var(--subtext0, #a6adc8);
    }

    .detail-ts-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--subtext1, #bac2de);
    }

    /* Detail pane - Attempts/Run tab */
    .run-summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--crust, #11111b);
      border-radius: 6px;
      border: 1px solid var(--surface0, #313244);
      margin-bottom: 0.75rem;
    }

    .run-summary.success {
      border-left: 3px solid var(--green, #a6e3a1);
    }

    .run-summary.error {
      border-left: 3px solid var(--red, #f38ba8);
    }

    .run-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .run-status-dot.success { background: var(--green, #a6e3a1); }
    .run-status-dot.error { background: var(--red, #f38ba8); }

    .run-summary-info {
      flex: 1;
      min-width: 0;
    }

    .run-summary-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .run-summary-meta {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .run-summary-cost {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--green, #a6e3a1);
    }

    .run-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .run-detail-cell {
      background: var(--crust, #11111b);
      border-radius: 4px;
      padding: 0.5rem 0.625rem;
    }

    .run-detail-cell-label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.125rem;
    }

    .run-detail-cell-value {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
      font-variant-numeric: tabular-nums;
    }

    /* Collapsible sections in run detail */
    .run-collapse-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.625rem;
      background: var(--crust, #11111b);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--subtext1, #bac2de);
      margin-bottom: 0.375rem;
      user-select: none;
      transition: background 0.15s;
    }

    .run-collapse-header:hover {
      background: var(--surface0, #313244);
    }

    .run-collapse-icon {
      transition: transform 0.2s ease;
      font-size: 0.75rem;
    }

    .run-collapse-icon.expanded {
      transform: rotate(180deg);
    }

    .run-collapse-content {
      background: var(--crust, #11111b);
      border-radius: 4px;
      padding: 0.5rem 0.625rem;
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-size: 0.6875rem;
      line-height: 1.5;
      color: var(--text, #cdd6f4);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 180px;
      overflow-y: auto;
      margin-bottom: 0.5rem;
    }

    .run-tools-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .run-tool-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--surface0, #313244);
      font-size: 0.6875rem;
    }

    .run-tool-item:last-child { border-bottom: none; }

    .run-tool-name {
      font-weight: 500;
      color: var(--blue, #89b4fa);
      min-width: 60px;
    }

    .run-tool-name.is-error { color: var(--red, #f38ba8); }

    .run-tool-input {
      flex: 1;
      color: var(--subtext0, #a6adc8);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    .run-tool-duration {
      color: var(--subtext0, #a6adc8);
      font-family: 'Geist Mono', 'SF Mono', monospace;
    }

    .run-error-banner {
      padding: 0.5rem 0.625rem;
      background: rgba(243, 139, 168, 0.12);
      border: 1px solid rgba(243, 139, 168, 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--red, #f38ba8);
      margin-bottom: 0.75rem;
    }

    /* Verification in run tab */
    .run-verification-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.75rem;
    }

    .run-verification-badge.passed {
      background: rgba(166, 227, 161, 0.2);
      color: var(--green, #a6e3a1);
    }

    .run-verification-badge.failed {
      background: rgba(243, 139, 168, 0.2);
      color: var(--red, #f38ba8);
    }

    .run-verifier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.375rem;
      padding: 0.375rem 0.5rem;
      background: var(--crust, #11111b);
      border: 1px solid var(--surface0, #313244);
      border-radius: 4px;
      margin-bottom: 0.375rem;
    }

    .run-verifier-item.passed { border-left: 3px solid var(--green); }
    .run-verifier-item.failed { border-left: 3px solid var(--red); }

    .run-verifier-icon { font-size: 0.8125rem; flex-shrink: 0; }
    .run-verifier-icon.passed { color: var(--green); }
    .run-verifier-icon.failed { color: var(--red); }

    .run-verifier-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .run-verifier-duration {
      font-size: 0.625rem;
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--subtext0);
      margin-left: auto;
    }

    .detail-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      font-size: 0.8125rem;
      gap: 0.5rem;
    }

    .detail-loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }

      .dashboard-body {
        padding: 1rem;
      }

      .summary-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .two-col {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .overlay {
        padding: 0;
      }

      .dashboard {
        border-radius: 0;
        min-height: 100vh;
      }

      .summary-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    /* Empty state */
    .empty-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: var(--overlay0, #6c7086);
      font-size: 0.8125rem;
    }
  `;G.PRIORITY_LABELS={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};G.PRIORITY_COLORS={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};xe([h({type:Array})],G.prototype,"ticks",2);xe([h({type:Array})],G.prototype,"epics",2);xe([h({type:Boolean,reflect:!0})],G.prototype,"open",2);xe([h({type:Array})],G.prototype,"activities",2);xe([h({type:String,attribute:"repo-name"})],G.prototype,"repoName",2);xe([w()],G.prototype,"_focusedAttentionIndex",2);xe([w()],G.prototype,"_detailTick",2);xe([w()],G.prototype,"_detailRunRecord",2);xe([w()],G.prototype,"_detailNotes",2);xe([w()],G.prototype,"_detailLoading",2);xe([w()],G.prototype,"_detailTab",2);xe([w()],G.prototype,"_detailExpanded",2);G=xe([$e("tickflow-dashboard")],G);$r("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var i;((i=t.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
