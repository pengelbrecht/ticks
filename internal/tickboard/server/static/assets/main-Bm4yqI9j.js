var Eo=Object.defineProperty;var zo=(e,t,i)=>t in e?Eo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var N=(e,t,i)=>zo(e,typeof t!="symbol"?t+"":t,i);import{i as $,n as h,a as oe,b as d,r as w,E as Ot,A as v,e as C,u as Cr,t as me}from"./ticks-logo-DYgrblNn.js";var Ro=$`
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
`;const zs=new Set,It=new Map;let xt,Ys="ltr",Ks="en";const ga=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(ga){const e=new MutationObserver(ya);Ys=document.documentElement.dir||"ltr",Ks=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function va(...e){e.map(t=>{const i=t.$code.toLowerCase();It.has(i)?It.set(i,Object.assign(Object.assign({},It.get(i)),t)):It.set(i,t),xt||(xt=t)}),ya()}function ya(){ga&&(Ys=document.documentElement.dir||"ltr",Ks=document.documentElement.lang||navigator.language),[...zs.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let Ao=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){zs.add(this.host)}hostDisconnected(){zs.delete(this.host)}dir(){return`${this.host.dir||Ys}`.toLowerCase()}lang(){return`${this.host.lang||Ks}`.toLowerCase()}getTranslationData(t){var i,s;const r=new Intl.Locale(t.replace(/_/g,"-")),a=r==null?void 0:r.language.toLowerCase(),o=(s=(i=r==null?void 0:r.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&s!==void 0?s:"",n=It.get(`${a}-${o}`),u=It.get(a);return{locale:r,language:a,region:o,primary:n,secondary:u}}exists(t,i){var s;const{primary:r,secondary:a}=this.getTranslationData((s=i.lang)!==null&&s!==void 0?s:this.lang());return i=Object.assign({includeFallback:!1},i),!!(r&&r[t]||a&&a[t]||i.includeFallback&&xt&&xt[t])}term(t,...i){const{primary:s,secondary:r}=this.getTranslationData(this.lang());let a;if(s&&s[t])a=s[t];else if(r&&r[t])a=r[t];else if(xt&&xt[t])a=xt[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof a=="function"?a(...i):a}date(t,i){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),i).format(t)}number(t,i){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),i).format(t)}relativeTime(t,i,s){return new Intl.RelativeTimeFormat(this.lang(),s).format(t,i)}};var wa={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};va(wa);var Oo=wa,ne=class extends Ao{};va(Oo);var H=$`
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
`,ka=Object.defineProperty,Io=Object.defineProperties,Do=Object.getOwnPropertyDescriptor,Mo=Object.getOwnPropertyDescriptors,$r=Object.getOwnPropertySymbols,Po=Object.prototype.hasOwnProperty,Lo=Object.prototype.propertyIsEnumerable,ys=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),Gs=e=>{throw TypeError(e)},Tr=(e,t,i)=>t in e?ka(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,st=(e,t)=>{for(var i in t||(t={}))Po.call(t,i)&&Tr(e,i,t[i]);if($r)for(var i of $r(t))Lo.call(t,i)&&Tr(e,i,t[i]);return e},ui=(e,t)=>Io(e,Mo(t)),l=(e,t,i,s)=>{for(var r=s>1?void 0:s?Do(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&ka(t,i,r),r},xa=(e,t,i)=>t.has(e)||Gs("Cannot "+i),Fo=(e,t,i)=>(xa(e,t,"read from private field"),t.get(e)),No=(e,t,i)=>t.has(e)?Gs("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),Bo=(e,t,i,s)=>(xa(e,t,"write to private field"),t.set(e,i),i),Ho=function(e,t){this[0]=e,this[1]=t},jo=e=>{var t=e[ys("asyncIterator")],i=!1,s,r={};return t==null?(t=e[ys("iterator")](),s=a=>r[a]=o=>t[a](o)):(t=t.call(e),s=a=>r[a]=o=>{if(i){if(i=!1,a==="throw")throw o;return o}return i=!0,{done:!1,value:new Ho(new Promise(n=>{var u=t[a](o);u instanceof Object||Gs("Object expected"),n(u)}),1)}}),r[ys("iterator")]=()=>r,s("next"),"throw"in t?s("throw"):r.throw=a=>{throw a},"return"in t&&s("return"),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Uo(e){return(t,i)=>{const s=typeof t=="function"?t:t[i];Object.assign(s,e)}}var Ai,P=class extends oe{constructor(){super(),No(this,Ai,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const i=new CustomEvent(e,st({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(i),i}static define(e,t=this,i={}){const s=customElements.get(e);if(!s){try{customElements.define(e,t,i)}catch{customElements.define(e,class extends t{},i)}return}let r=" (unknown version)",a=r;"version"in t&&t.version&&(r=" v"+t.version),"version"in s&&s.version&&(a=" v"+s.version),!(r&&a&&r===a)&&console.warn(`Attempted to register <${e}>${r}, but <${e}>${a} has already been registered.`)}attributeChangedCallback(e,t,i){Fo(this,Ai)||(this.constructor.elementProperties.forEach((s,r)=>{s.reflect&&this[r]!=null&&this.initialReflectedProperties.set(r,this[r])}),Bo(this,Ai,!0)),super.attributeChangedCallback(e,t,i)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,i)=>{e.has(i)&&this[i]==null&&(this[i]=t)})}};Ai=new WeakMap;P.version="2.20.1";P.dependencies={};l([h()],P.prototype,"dir",2);l([h()],P.prototype,"lang",2);var Zi=class extends P{constructor(){super(...arguments),this.localize=new ne(this)}render(){return d`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Zi.styles=[H,Ro];var qt=new WeakMap,Yt=new WeakMap,Kt=new WeakMap,ws=new WeakSet,xi=new WeakMap,hi=class{constructor(e,t){this.handleFormData=i=>{const s=this.options.disabled(this.host),r=this.options.name(this.host),a=this.options.value(this.host),o=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!s&&!o&&typeof r=="string"&&r.length>0&&typeof a<"u"&&(Array.isArray(a)?a.forEach(n=>{i.formData.append(r,n.toString())}):i.formData.append(r,a.toString()))},this.handleFormSubmit=i=>{var s;const r=this.options.disabled(this.host),a=this.options.reportValidity;this.form&&!this.form.noValidate&&((s=qt.get(this.form))==null||s.forEach(o=>{this.setUserInteracted(o,!0)})),this.form&&!this.form.noValidate&&!r&&!a(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),xi.set(this.host,[])},this.handleInteraction=i=>{const s=xi.get(this.host);s.includes(i.type)||s.push(i.type),s.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.checkValidity=="function"&&!s.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const s of i)if(typeof s.reportValidity=="function"&&!s.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=st({form:i=>{const s=i.form;if(s){const a=i.getRootNode().querySelector(`#${s}`);if(a)return a}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var s;return(s=i.disabled)!=null?s:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,s)=>i.value=s,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),xi.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),xi.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,qt.has(this.form)?qt.get(this.form).add(this.host):qt.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Yt.has(this.form)||(Yt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Kt.has(this.form)||(Kt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=qt.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Yt.has(this.form)&&(this.form.reportValidity=Yt.get(this.form),Yt.delete(this.form)),Kt.has(this.form)&&(this.form.checkValidity=Kt.get(this.form),Kt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?ws.add(e):ws.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const i=document.createElement("button");i.type=e,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",t&&(i.name=t.name,i.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(s=>{t.hasAttribute(s)&&i.setAttribute(s,t.getAttribute(s))})),this.form.append(i),i.click(),i.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,i=!!ws.has(t),s=!!t.required;t.toggleAttribute("data-required",s),t.toggleAttribute("data-optional",!s),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&i),t.toggleAttribute("data-user-valid",e&&i)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},Xs=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(ui(st({},Xs),{valid:!1,valueMissing:!0}));Object.freeze(ui(st({},Xs),{valid:!1,customError:!0}));var Vo=$`
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
`,rt=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=i=>{const s=i.target;(this.slotNames.includes("[default]")&&!s.name||s.name&&this.slotNames.includes(s.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Wo(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let i="";return[...t].forEach(s=>{s.nodeType===Node.TEXT_NODE&&(i+=s.textContent)}),i}var Rs="";function As(e){Rs=e}function qo(e=""){if(!Rs){const t=[...document.getElementsByTagName("script")],i=t.find(s=>s.hasAttribute("data-shoelace"));if(i)As(i.getAttribute("data-shoelace"));else{const s=t.find(a=>/shoelace(\.min)?\.js($|\?)/.test(a.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(a.src));let r="";s&&(r=s.getAttribute("src")),As(r.split("/").slice(0,-1).join("/"))}}return Rs.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var Yo={name:"default",resolver:e=>qo(`assets/icons/${e}.svg`)},Ko=Yo,Sr={caret:`
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
  `},Go={name:"system",resolver:e=>e in Sr?`data:image/svg+xml,${encodeURIComponent(Sr[e])}`:""},Xo=Go,Qo=[Ko,Xo],Os=[];function Zo(e){Os.push(e)}function Jo(e){Os=Os.filter(t=>t!==e)}function Er(e){return Qo.find(t=>t.name===e)}var en=$`
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
`;function S(e,t){const i=st({waitUntilFirstUpdate:!1},t);return(s,r)=>{const{update:a}=s,o=Array.isArray(e)?e:[e];s.update=function(n){o.forEach(u=>{const c=u;if(n.has(c)){const p=n.get(c),f=this[c];p!==f&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[r](p,f)}}),a.call(this,n)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const tn=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,_a=e=>e.strings===void 0,sn={},rn=(e,t=sn)=>e._$AH=t;var Gt=Symbol(),_i=Symbol(),ks,xs=new Map,se=class extends P{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var i;let s;if(t!=null&&t.spriteSheet)return this.svg=d`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(s=await fetch(e,{mode:"cors"}),!s.ok)return s.status===410?Gt:_i}catch{return _i}try{const r=document.createElement("div");r.innerHTML=await s.text();const a=r.firstElementChild;if(((i=a==null?void 0:a.tagName)==null?void 0:i.toLowerCase())!=="svg")return Gt;ks||(ks=new DOMParser);const n=ks.parseFromString(a.outerHTML,"text/html").body.querySelector("svg");return n?(n.part.add("svg"),document.adoptNode(n)):Gt}catch{return Gt}}connectedCallback(){super.connectedCallback(),Zo(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Jo(this)}getIconSource(){const e=Er(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:i}=this.getIconSource(),s=i?Er(this.library):void 0;if(!t){this.svg=null;return}let r=xs.get(t);if(r||(r=this.resolveIcon(t,s),xs.set(t,r)),!this.initialRender)return;const a=await r;if(a===_i&&xs.delete(t),t===this.getIconSource().url){if(tn(a)){if(this.svg=a,s){await this.updateComplete;const o=this.shadowRoot.querySelector("[part='svg']");typeof s.mutator=="function"&&o&&s.mutator(o)}return}switch(a){case _i:case Gt:this.svg=null,this.emit("sl-error");break;default:this.svg=a.cloneNode(!0),(e=s==null?void 0:s.mutator)==null||e.call(s,this.svg),this.emit("sl-load")}}}render(){return this.svg}};se.styles=[H,en];l([w()],se.prototype,"svg",2);l([h({reflect:!0})],se.prototype,"name",2);l([h()],se.prototype,"src",2);l([h()],se.prototype,"label",2);l([h({reflect:!0})],se.prototype,"library",2);l([S("label")],se.prototype,"handleLabelChange",1);l([S(["name","src","library"])],se.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ze={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ji=e=>(...t)=>({_$litDirective$:e,values:t});let es=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,s){this._$Ct=t,this._$AM=i,this._$Ci=s}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=Ji(class extends es{constructor(e){var t;if(super(e),e.type!==Ze.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var s,r;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(a=>a!=="")));for(const a in t)t[a]&&!((s=this.nt)!=null&&s.has(a))&&this.st.add(a);return this.render(t)}const i=e.element.classList;for(const a of this.st)a in t||(i.remove(a),this.st.delete(a));for(const a in t){const o=!!t[a];o===this.st.has(a)||(r=this.nt)!=null&&r.has(a)||(o?(i.add(a),this.st.add(a)):(i.remove(a),this.st.delete(a)))}return Ot}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ca=Symbol.for(""),an=e=>{if((e==null?void 0:e.r)===Ca)return e==null?void 0:e._$litStatic$},Pi=(e,...t)=>({_$litStatic$:t.reduce((i,s,r)=>i+(a=>{if(a._$litStatic$!==void 0)return a._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${a}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(s)+e[r+1],e[0]),r:Ca}),zr=new Map,on=e=>(t,...i)=>{const s=i.length;let r,a;const o=[],n=[];let u,c=0,p=!1;for(;c<s;){for(u=t[c];c<s&&(a=i[c],(r=an(a))!==void 0);)u+=r+t[++c],p=!0;c!==s&&n.push(a),o.push(u),c++}if(c===s&&o.push(t[s]),p){const f=o.join("$$lit$$");(t=zr.get(f))===void 0&&(o.raw=o,zr.set(f,t=o)),i=n}return e(t,...i)},Oi=on(d);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>e??v;var L=class extends P{constructor(){super(...arguments),this.formControlController=new hi(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new rt(this,"[default]","prefix","suffix"),this.localize=new ne(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:Xs}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?Pi`a`:Pi`button`;return Oi`
      <${t}
        part="base"
        class=${M({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
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
        ${this.caret?Oi` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?Oi`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};L.styles=[H,Vo];L.dependencies={"sl-icon":se,"sl-spinner":Zi};l([C(".button")],L.prototype,"button",2);l([w()],L.prototype,"hasFocus",2);l([w()],L.prototype,"invalid",2);l([h()],L.prototype,"title",2);l([h({reflect:!0})],L.prototype,"variant",2);l([h({reflect:!0})],L.prototype,"size",2);l([h({type:Boolean,reflect:!0})],L.prototype,"caret",2);l([h({type:Boolean,reflect:!0})],L.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],L.prototype,"loading",2);l([h({type:Boolean,reflect:!0})],L.prototype,"outline",2);l([h({type:Boolean,reflect:!0})],L.prototype,"pill",2);l([h({type:Boolean,reflect:!0})],L.prototype,"circle",2);l([h()],L.prototype,"type",2);l([h()],L.prototype,"name",2);l([h()],L.prototype,"value",2);l([h()],L.prototype,"href",2);l([h()],L.prototype,"target",2);l([h()],L.prototype,"rel",2);l([h()],L.prototype,"download",2);l([h()],L.prototype,"form",2);l([h({attribute:"formaction"})],L.prototype,"formAction",2);l([h({attribute:"formenctype"})],L.prototype,"formEnctype",2);l([h({attribute:"formmethod"})],L.prototype,"formMethod",2);l([h({attribute:"formnovalidate",type:Boolean})],L.prototype,"formNoValidate",2);l([h({attribute:"formtarget"})],L.prototype,"formTarget",2);l([S("disabled",{waitUntilFirstUpdate:!0})],L.prototype,"handleDisabledChange",1);L.define("sl-button");var nn=$`
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
`,Qs=(e="value")=>(t,i)=>{const s=t.constructor,r=s.prototype.attributeChangedCallback;s.prototype.attributeChangedCallback=function(a,o,n){var u;const c=s.getPropertyOptions(e),p=typeof c.attribute=="string"?c.attribute:e;if(a===p){const f=c.converter||Cr,m=(typeof f=="function"?f:(u=f==null?void 0:f.fromAttribute)!=null?u:Cr.fromAttribute)(n,c.type);this[e]!==m&&(this[i]=m)}r.call(this,a,o,n)}},ts=$`
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
 */const Li=Ji(class extends es{constructor(e){if(super(e),e.type!==Ze.PROPERTY&&e.type!==Ze.ATTRIBUTE&&e.type!==Ze.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!_a(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===Ot||t===v)return t;const i=e.element,s=e.name;if(e.type===Ze.PROPERTY){if(t===i[s])return Ot}else if(e.type===Ze.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(s))return Ot}else if(e.type===Ze.ATTRIBUTE&&i.getAttribute(s)===t+"")return Ot;return rn(e),t}});var T=class extends P{constructor(){super(...arguments),this.formControlController=new hi(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new rt(this,"help-text","label"),this.localize=new ne(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,s="preserve"){const r=t??this.input.selectionStart,a=i??this.input.selectionEnd;this.input.setRangeText(e,r,a,s),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t,a=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return d`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${M({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              .value=${Li(this.value)}
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

            ${a?d`
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
            ${this.passwordToggle&&!this.disabled?d`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?d`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:d`
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
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};T.styles=[H,ts,nn];T.dependencies={"sl-icon":se};l([C(".input__control")],T.prototype,"input",2);l([w()],T.prototype,"hasFocus",2);l([h()],T.prototype,"title",2);l([h({reflect:!0})],T.prototype,"type",2);l([h()],T.prototype,"name",2);l([h()],T.prototype,"value",2);l([Qs()],T.prototype,"defaultValue",2);l([h({reflect:!0})],T.prototype,"size",2);l([h({type:Boolean,reflect:!0})],T.prototype,"filled",2);l([h({type:Boolean,reflect:!0})],T.prototype,"pill",2);l([h()],T.prototype,"label",2);l([h({attribute:"help-text"})],T.prototype,"helpText",2);l([h({type:Boolean})],T.prototype,"clearable",2);l([h({type:Boolean,reflect:!0})],T.prototype,"disabled",2);l([h()],T.prototype,"placeholder",2);l([h({type:Boolean,reflect:!0})],T.prototype,"readonly",2);l([h({attribute:"password-toggle",type:Boolean})],T.prototype,"passwordToggle",2);l([h({attribute:"password-visible",type:Boolean})],T.prototype,"passwordVisible",2);l([h({attribute:"no-spin-buttons",type:Boolean})],T.prototype,"noSpinButtons",2);l([h({reflect:!0})],T.prototype,"form",2);l([h({type:Boolean,reflect:!0})],T.prototype,"required",2);l([h()],T.prototype,"pattern",2);l([h({type:Number})],T.prototype,"minlength",2);l([h({type:Number})],T.prototype,"maxlength",2);l([h()],T.prototype,"min",2);l([h()],T.prototype,"max",2);l([h()],T.prototype,"step",2);l([h()],T.prototype,"autocapitalize",2);l([h()],T.prototype,"autocorrect",2);l([h()],T.prototype,"autocomplete",2);l([h({type:Boolean})],T.prototype,"autofocus",2);l([h()],T.prototype,"enterkeyhint",2);l([h({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],T.prototype,"spellcheck",2);l([h()],T.prototype,"inputmode",2);l([S("disabled",{waitUntilFirstUpdate:!0})],T.prototype,"handleDisabledChange",1);l([S("step",{waitUntilFirstUpdate:!0})],T.prototype,"handleStepChange",1);l([S("value",{waitUntilFirstUpdate:!0})],T.prototype,"handleValueChange",1);T.define("sl-input");var ln=$`
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
`,cn=$`
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
`,Z=class extends P{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?Pi`a`:Pi`button`;return Oi`
      <${t}
        part="base"
        class=${M({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
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
    `}};Z.styles=[H,cn];Z.dependencies={"sl-icon":se};l([C(".icon-button")],Z.prototype,"button",2);l([w()],Z.prototype,"hasFocus",2);l([h()],Z.prototype,"name",2);l([h()],Z.prototype,"library",2);l([h()],Z.prototype,"src",2);l([h()],Z.prototype,"href",2);l([h()],Z.prototype,"target",2);l([h()],Z.prototype,"download",2);l([h()],Z.prototype,"label",2);l([h({type:Boolean,reflect:!0})],Z.prototype,"disabled",2);var St=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return d`
      <span
        part="base"
        class=${M({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?d`
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
    `}};St.styles=[H,ln];St.dependencies={"sl-icon-button":Z};l([h({reflect:!0})],St.prototype,"variant",2);l([h({reflect:!0})],St.prototype,"size",2);l([h({type:Boolean,reflect:!0})],St.prototype,"pill",2);l([h({type:Boolean})],St.prototype,"removable",2);var dn=$`
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
`;function un(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var Is=new Set;function hn(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function pn(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function ii(e){if(Is.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=hn()+pn();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),t<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function si(e){Is.delete(e),Is.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function Ds(e,t,i="vertical",s="smooth"){const r=un(e,t),a=r.top+t.scrollTop,o=r.left+t.scrollLeft,n=t.scrollLeft,u=t.scrollLeft+t.offsetWidth,c=t.scrollTop,p=t.scrollTop+t.offsetHeight;(i==="horizontal"||i==="both")&&(o<n?t.scrollTo({left:o,behavior:s}):o+e.clientWidth>u&&t.scrollTo({left:o-t.offsetWidth+e.clientWidth,behavior:s})),(i==="vertical"||i==="both")&&(a<c?t.scrollTo({top:a,behavior:s}):a+e.clientHeight>p&&t.scrollTo({top:a-t.offsetHeight+e.clientHeight,behavior:s}))}var mn=$`
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
`;const ut=Math.min,ve=Math.max,Fi=Math.round,Ci=Math.floor,We=e=>({x:e,y:e}),fn={left:"right",right:"left",bottom:"top",top:"bottom"},bn={start:"end",end:"start"};function Ms(e,t,i){return ve(e,ut(t,i))}function Nt(e,t){return typeof e=="function"?e(t):e}function ht(e){return e.split("-")[0]}function Bt(e){return e.split("-")[1]}function $a(e){return e==="x"?"y":"x"}function Zs(e){return e==="y"?"height":"width"}const gn=new Set(["top","bottom"]);function Je(e){return gn.has(ht(e))?"y":"x"}function Js(e){return $a(Je(e))}function vn(e,t,i){i===void 0&&(i=!1);const s=Bt(e),r=Js(e),a=Zs(r);let o=r==="x"?s===(i?"end":"start")?"right":"left":s==="start"?"bottom":"top";return t.reference[a]>t.floating[a]&&(o=Ni(o)),[o,Ni(o)]}function yn(e){const t=Ni(e);return[Ps(e),t,Ps(t)]}function Ps(e){return e.replace(/start|end/g,t=>bn[t])}const Rr=["left","right"],Ar=["right","left"],wn=["top","bottom"],kn=["bottom","top"];function xn(e,t,i){switch(e){case"top":case"bottom":return i?t?Ar:Rr:t?Rr:Ar;case"left":case"right":return t?wn:kn;default:return[]}}function _n(e,t,i,s){const r=Bt(e);let a=xn(ht(e),i==="start",s);return r&&(a=a.map(o=>o+"-"+r),t&&(a=a.concat(a.map(Ps)))),a}function Ni(e){return e.replace(/left|right|bottom|top/g,t=>fn[t])}function Cn(e){return{top:0,right:0,bottom:0,left:0,...e}}function Ta(e){return typeof e!="number"?Cn(e):{top:e,right:e,bottom:e,left:e}}function Bi(e){const{x:t,y:i,width:s,height:r}=e;return{width:s,height:r,top:i,left:t,right:t+s,bottom:i+r,x:t,y:i}}function Or(e,t,i){let{reference:s,floating:r}=e;const a=Je(t),o=Js(t),n=Zs(o),u=ht(t),c=a==="y",p=s.x+s.width/2-r.width/2,f=s.y+s.height/2-r.height/2,b=s[n]/2-r[n]/2;let m;switch(u){case"top":m={x:p,y:s.y-r.height};break;case"bottom":m={x:p,y:s.y+s.height};break;case"right":m={x:s.x+s.width,y:f};break;case"left":m={x:s.x-r.width,y:f};break;default:m={x:s.x,y:s.y}}switch(Bt(t)){case"start":m[o]-=b*(i&&c?-1:1);break;case"end":m[o]+=b*(i&&c?-1:1);break}return m}const $n=async(e,t,i)=>{const{placement:s="bottom",strategy:r="absolute",middleware:a=[],platform:o}=i,n=a.filter(Boolean),u=await(o.isRTL==null?void 0:o.isRTL(t));let c=await o.getElementRects({reference:e,floating:t,strategy:r}),{x:p,y:f}=Or(c,s,u),b=s,m={},g=0;for(let y=0;y<n.length;y++){const{name:k,fn:_}=n[y],{x:E,y:O,data:Y,reset:j}=await _({x:p,y:f,initialPlacement:s,placement:b,strategy:r,middlewareData:m,rects:c,platform:o,elements:{reference:e,floating:t}});p=E??p,f=O??f,m={...m,[k]:{...m[k],...Y}},j&&g<=50&&(g++,typeof j=="object"&&(j.placement&&(b=j.placement),j.rects&&(c=j.rects===!0?await o.getElementRects({reference:e,floating:t,strategy:r}):j.rects),{x:p,y:f}=Or(c,b,u)),y=-1)}return{x:p,y:f,placement:b,strategy:r,middlewareData:m}};async function er(e,t){var i;t===void 0&&(t={});const{x:s,y:r,platform:a,rects:o,elements:n,strategy:u}=e,{boundary:c="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:b=!1,padding:m=0}=Nt(t,e),g=Ta(m),k=n[b?f==="floating"?"reference":"floating":f],_=Bi(await a.getClippingRect({element:(i=await(a.isElement==null?void 0:a.isElement(k)))==null||i?k:k.contextElement||await(a.getDocumentElement==null?void 0:a.getDocumentElement(n.floating)),boundary:c,rootBoundary:p,strategy:u})),E=f==="floating"?{x:s,y:r,width:o.floating.width,height:o.floating.height}:o.reference,O=await(a.getOffsetParent==null?void 0:a.getOffsetParent(n.floating)),Y=await(a.isElement==null?void 0:a.isElement(O))?await(a.getScale==null?void 0:a.getScale(O))||{x:1,y:1}:{x:1,y:1},j=Bi(a.convertOffsetParentRelativeRectToViewportRelativeRect?await a.convertOffsetParentRelativeRectToViewportRelativeRect({elements:n,rect:E,offsetParent:O,strategy:u}):E);return{top:(_.top-j.top+g.top)/Y.y,bottom:(j.bottom-_.bottom+g.bottom)/Y.y,left:(_.left-j.left+g.left)/Y.x,right:(j.right-_.right+g.right)/Y.x}}const Tn=e=>({name:"arrow",options:e,async fn(t){const{x:i,y:s,placement:r,rects:a,platform:o,elements:n,middlewareData:u}=t,{element:c,padding:p=0}=Nt(e,t)||{};if(c==null)return{};const f=Ta(p),b={x:i,y:s},m=Js(r),g=Zs(m),y=await o.getDimensions(c),k=m==="y",_=k?"top":"left",E=k?"bottom":"right",O=k?"clientHeight":"clientWidth",Y=a.reference[g]+a.reference[m]-b[m]-a.floating[g],j=b[m]-a.reference[m],de=await(o.getOffsetParent==null?void 0:o.getOffsetParent(c));let W=de?de[O]:0;(!W||!await(o.isElement==null?void 0:o.isElement(de)))&&(W=n.floating[O]||a.floating[g]);const Ge=Y/2-j/2,He=W/2-y[g]/2-1,Te=ut(f[_],He),at=ut(f[E],He),je=Te,ot=W-y[g]-at,ue=W/2-y[g]/2+Ge,yt=Ms(je,ue,ot),Xe=!u.arrow&&Bt(r)!=null&&ue!==yt&&a.reference[g]/2-(ue<je?Te:at)-y[g]/2<0,ze=Xe?ue<je?ue-je:ue-ot:0;return{[m]:b[m]+ze,data:{[m]:yt,centerOffset:ue-yt-ze,...Xe&&{alignmentOffset:ze}},reset:Xe}}}),Sn=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,s;const{placement:r,middlewareData:a,rects:o,initialPlacement:n,platform:u,elements:c}=t,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:y=!0,...k}=Nt(e,t);if((i=a.arrow)!=null&&i.alignmentOffset)return{};const _=ht(r),E=Je(n),O=ht(n)===n,Y=await(u.isRTL==null?void 0:u.isRTL(c.floating)),j=b||(O||!y?[Ni(n)]:yn(n)),de=g!=="none";!b&&de&&j.push(..._n(n,y,g,Y));const W=[n,...j],Ge=await er(t,k),He=[];let Te=((s=a.flip)==null?void 0:s.overflows)||[];if(p&&He.push(Ge[_]),f){const ue=vn(r,o,Y);He.push(Ge[ue[0]],Ge[ue[1]])}if(Te=[...Te,{placement:r,overflows:He}],!He.every(ue=>ue<=0)){var at,je;const ue=(((at=a.flip)==null?void 0:at.index)||0)+1,yt=W[ue];if(yt&&(!(f==="alignment"?E!==Je(yt):!1)||Te.every(Re=>Je(Re.placement)===E?Re.overflows[0]>0:!0)))return{data:{index:ue,overflows:Te},reset:{placement:yt}};let Xe=(je=Te.filter(ze=>ze.overflows[0]<=0).sort((ze,Re)=>ze.overflows[1]-Re.overflows[1])[0])==null?void 0:je.placement;if(!Xe)switch(m){case"bestFit":{var ot;const ze=(ot=Te.filter(Re=>{if(de){const nt=Je(Re.placement);return nt===E||nt==="y"}return!0}).map(Re=>[Re.placement,Re.overflows.filter(nt=>nt>0).reduce((nt,So)=>nt+So,0)]).sort((Re,nt)=>Re[1]-nt[1])[0])==null?void 0:ot[0];ze&&(Xe=ze);break}case"initialPlacement":Xe=n;break}if(r!==Xe)return{reset:{placement:Xe}}}return{}}}},En=new Set(["left","top"]);async function zn(e,t){const{placement:i,platform:s,elements:r}=e,a=await(s.isRTL==null?void 0:s.isRTL(r.floating)),o=ht(i),n=Bt(i),u=Je(i)==="y",c=En.has(o)?-1:1,p=a&&u?-1:1,f=Nt(t,e);let{mainAxis:b,crossAxis:m,alignmentAxis:g}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return n&&typeof g=="number"&&(m=n==="end"?g*-1:g),u?{x:m*p,y:b*c}:{x:b*c,y:m*p}}const Rn=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var i,s;const{x:r,y:a,placement:o,middlewareData:n}=t,u=await zn(t,e);return o===((i=n.offset)==null?void 0:i.placement)&&(s=n.arrow)!=null&&s.alignmentOffset?{}:{x:r+u.x,y:a+u.y,data:{...u,placement:o}}}}},An=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:s,placement:r}=t,{mainAxis:a=!0,crossAxis:o=!1,limiter:n={fn:k=>{let{x:_,y:E}=k;return{x:_,y:E}}},...u}=Nt(e,t),c={x:i,y:s},p=await er(t,u),f=Je(ht(r)),b=$a(f);let m=c[b],g=c[f];if(a){const k=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=m+p[k],O=m-p[_];m=Ms(E,m,O)}if(o){const k=f==="y"?"top":"left",_=f==="y"?"bottom":"right",E=g+p[k],O=g-p[_];g=Ms(E,g,O)}const y=n.fn({...t,[b]:m,[f]:g});return{...y,data:{x:y.x-i,y:y.y-s,enabled:{[b]:a,[f]:o}}}}}},On=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var i,s;const{placement:r,rects:a,platform:o,elements:n}=t,{apply:u=()=>{},...c}=Nt(e,t),p=await er(t,c),f=ht(r),b=Bt(r),m=Je(r)==="y",{width:g,height:y}=a.floating;let k,_;f==="top"||f==="bottom"?(k=f,_=b===(await(o.isRTL==null?void 0:o.isRTL(n.floating))?"start":"end")?"left":"right"):(_=f,k=b==="end"?"top":"bottom");const E=y-p.top-p.bottom,O=g-p.left-p.right,Y=ut(y-p[k],E),j=ut(g-p[_],O),de=!t.middlewareData.shift;let W=Y,Ge=j;if((i=t.middlewareData.shift)!=null&&i.enabled.x&&(Ge=O),(s=t.middlewareData.shift)!=null&&s.enabled.y&&(W=E),de&&!b){const Te=ve(p.left,0),at=ve(p.right,0),je=ve(p.top,0),ot=ve(p.bottom,0);m?Ge=g-2*(Te!==0||at!==0?Te+at:ve(p.left,p.right)):W=y-2*(je!==0||ot!==0?je+ot:ve(p.top,p.bottom))}await u({...t,availableWidth:Ge,availableHeight:W});const He=await o.getDimensions(n.floating);return g!==He.width||y!==He.height?{reset:{rects:!0}}:{}}}};function is(){return typeof window<"u"}function Ht(e){return Sa(e)?(e.nodeName||"").toLowerCase():"#document"}function ye(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ye(e){var t;return(t=(Sa(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Sa(e){return is()?e instanceof Node||e instanceof ye(e).Node:!1}function De(e){return is()?e instanceof Element||e instanceof ye(e).Element:!1}function qe(e){return is()?e instanceof HTMLElement||e instanceof ye(e).HTMLElement:!1}function Ir(e){return!is()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof ye(e).ShadowRoot}const In=new Set(["inline","contents"]);function pi(e){const{overflow:t,overflowX:i,overflowY:s,display:r}=Me(e);return/auto|scroll|overlay|hidden|clip/.test(t+s+i)&&!In.has(r)}const Dn=new Set(["table","td","th"]);function Mn(e){return Dn.has(Ht(e))}const Pn=[":popover-open",":modal"];function ss(e){return Pn.some(t=>{try{return e.matches(t)}catch{return!1}})}const Ln=["transform","translate","scale","rotate","perspective"],Fn=["transform","translate","scale","rotate","perspective","filter"],Nn=["paint","layout","strict","content"];function rs(e){const t=tr(),i=De(e)?Me(e):e;return Ln.some(s=>i[s]?i[s]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!t&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!t&&(i.filter?i.filter!=="none":!1)||Fn.some(s=>(i.willChange||"").includes(s))||Nn.some(s=>(i.contain||"").includes(s))}function Bn(e){let t=pt(e);for(;qe(t)&&!Mt(t);){if(rs(t))return t;if(ss(t))return null;t=pt(t)}return null}function tr(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Hn=new Set(["html","body","#document"]);function Mt(e){return Hn.has(Ht(e))}function Me(e){return ye(e).getComputedStyle(e)}function as(e){return De(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function pt(e){if(Ht(e)==="html")return e;const t=e.assignedSlot||e.parentNode||Ir(e)&&e.host||Ye(e);return Ir(t)?t.host:t}function Ea(e){const t=pt(e);return Mt(t)?e.ownerDocument?e.ownerDocument.body:e.body:qe(t)&&pi(t)?t:Ea(t)}function oi(e,t,i){var s;t===void 0&&(t=[]),i===void 0&&(i=!0);const r=Ea(e),a=r===((s=e.ownerDocument)==null?void 0:s.body),o=ye(r);if(a){const n=Ls(o);return t.concat(o,o.visualViewport||[],pi(r)?r:[],n&&i?oi(n):[])}return t.concat(r,oi(r,[],i))}function Ls(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function za(e){const t=Me(e);let i=parseFloat(t.width)||0,s=parseFloat(t.height)||0;const r=qe(e),a=r?e.offsetWidth:i,o=r?e.offsetHeight:s,n=Fi(i)!==a||Fi(s)!==o;return n&&(i=a,s=o),{width:i,height:s,$:n}}function ir(e){return De(e)?e:e.contextElement}function Dt(e){const t=ir(e);if(!qe(t))return We(1);const i=t.getBoundingClientRect(),{width:s,height:r,$:a}=za(t);let o=(a?Fi(i.width):i.width)/s,n=(a?Fi(i.height):i.height)/r;return(!o||!Number.isFinite(o))&&(o=1),(!n||!Number.isFinite(n))&&(n=1),{x:o,y:n}}const jn=We(0);function Ra(e){const t=ye(e);return!tr()||!t.visualViewport?jn:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Un(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==ye(e)?!1:t}function Ct(e,t,i,s){t===void 0&&(t=!1),i===void 0&&(i=!1);const r=e.getBoundingClientRect(),a=ir(e);let o=We(1);t&&(s?De(s)&&(o=Dt(s)):o=Dt(e));const n=Un(a,i,s)?Ra(a):We(0);let u=(r.left+n.x)/o.x,c=(r.top+n.y)/o.y,p=r.width/o.x,f=r.height/o.y;if(a){const b=ye(a),m=s&&De(s)?ye(s):s;let g=b,y=Ls(g);for(;y&&s&&m!==g;){const k=Dt(y),_=y.getBoundingClientRect(),E=Me(y),O=_.left+(y.clientLeft+parseFloat(E.paddingLeft))*k.x,Y=_.top+(y.clientTop+parseFloat(E.paddingTop))*k.y;u*=k.x,c*=k.y,p*=k.x,f*=k.y,u+=O,c+=Y,g=ye(y),y=Ls(g)}}return Bi({width:p,height:f,x:u,y:c})}function os(e,t){const i=as(e).scrollLeft;return t?t.left+i:Ct(Ye(e)).left+i}function Aa(e,t){const i=e.getBoundingClientRect(),s=i.left+t.scrollLeft-os(e,i),r=i.top+t.scrollTop;return{x:s,y:r}}function Vn(e){let{elements:t,rect:i,offsetParent:s,strategy:r}=e;const a=r==="fixed",o=Ye(s),n=t?ss(t.floating):!1;if(s===o||n&&a)return i;let u={scrollLeft:0,scrollTop:0},c=We(1);const p=We(0),f=qe(s);if((f||!f&&!a)&&((Ht(s)!=="body"||pi(o))&&(u=as(s)),qe(s))){const m=Ct(s);c=Dt(s),p.x=m.x+s.clientLeft,p.y=m.y+s.clientTop}const b=o&&!f&&!a?Aa(o,u):We(0);return{width:i.width*c.x,height:i.height*c.y,x:i.x*c.x-u.scrollLeft*c.x+p.x+b.x,y:i.y*c.y-u.scrollTop*c.y+p.y+b.y}}function Wn(e){return Array.from(e.getClientRects())}function qn(e){const t=Ye(e),i=as(e),s=e.ownerDocument.body,r=ve(t.scrollWidth,t.clientWidth,s.scrollWidth,s.clientWidth),a=ve(t.scrollHeight,t.clientHeight,s.scrollHeight,s.clientHeight);let o=-i.scrollLeft+os(e);const n=-i.scrollTop;return Me(s).direction==="rtl"&&(o+=ve(t.clientWidth,s.clientWidth)-r),{width:r,height:a,x:o,y:n}}const Dr=25;function Yn(e,t){const i=ye(e),s=Ye(e),r=i.visualViewport;let a=s.clientWidth,o=s.clientHeight,n=0,u=0;if(r){a=r.width,o=r.height;const p=tr();(!p||p&&t==="fixed")&&(n=r.offsetLeft,u=r.offsetTop)}const c=os(s);if(c<=0){const p=s.ownerDocument,f=p.body,b=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(s.clientWidth-f.clientWidth-m);g<=Dr&&(a-=g)}else c<=Dr&&(a+=c);return{width:a,height:o,x:n,y:u}}const Kn=new Set(["absolute","fixed"]);function Gn(e,t){const i=Ct(e,!0,t==="fixed"),s=i.top+e.clientTop,r=i.left+e.clientLeft,a=qe(e)?Dt(e):We(1),o=e.clientWidth*a.x,n=e.clientHeight*a.y,u=r*a.x,c=s*a.y;return{width:o,height:n,x:u,y:c}}function Mr(e,t,i){let s;if(t==="viewport")s=Yn(e,i);else if(t==="document")s=qn(Ye(e));else if(De(t))s=Gn(t,i);else{const r=Ra(e);s={x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height}}return Bi(s)}function Oa(e,t){const i=pt(e);return i===t||!De(i)||Mt(i)?!1:Me(i).position==="fixed"||Oa(i,t)}function Xn(e,t){const i=t.get(e);if(i)return i;let s=oi(e,[],!1).filter(n=>De(n)&&Ht(n)!=="body"),r=null;const a=Me(e).position==="fixed";let o=a?pt(e):e;for(;De(o)&&!Mt(o);){const n=Me(o),u=rs(o);!u&&n.position==="fixed"&&(r=null),(a?!u&&!r:!u&&n.position==="static"&&!!r&&Kn.has(r.position)||pi(o)&&!u&&Oa(e,o))?s=s.filter(p=>p!==o):r=n,o=pt(o)}return t.set(e,s),s}function Qn(e){let{element:t,boundary:i,rootBoundary:s,strategy:r}=e;const o=[...i==="clippingAncestors"?ss(t)?[]:Xn(t,this._c):[].concat(i),s],n=o[0],u=o.reduce((c,p)=>{const f=Mr(t,p,r);return c.top=ve(f.top,c.top),c.right=ut(f.right,c.right),c.bottom=ut(f.bottom,c.bottom),c.left=ve(f.left,c.left),c},Mr(t,n,r));return{width:u.right-u.left,height:u.bottom-u.top,x:u.left,y:u.top}}function Zn(e){const{width:t,height:i}=za(e);return{width:t,height:i}}function Jn(e,t,i){const s=qe(t),r=Ye(t),a=i==="fixed",o=Ct(e,!0,a,t);let n={scrollLeft:0,scrollTop:0};const u=We(0);function c(){u.x=os(r)}if(s||!s&&!a)if((Ht(t)!=="body"||pi(r))&&(n=as(t)),s){const m=Ct(t,!0,a,t);u.x=m.x+t.clientLeft,u.y=m.y+t.clientTop}else r&&c();a&&!s&&r&&c();const p=r&&!s&&!a?Aa(r,n):We(0),f=o.left+n.scrollLeft-u.x-p.x,b=o.top+n.scrollTop-u.y-p.y;return{x:f,y:b,width:o.width,height:o.height}}function _s(e){return Me(e).position==="static"}function Pr(e,t){if(!qe(e)||Me(e).position==="fixed")return null;if(t)return t(e);let i=e.offsetParent;return Ye(e)===i&&(i=i.ownerDocument.body),i}function Ia(e,t){const i=ye(e);if(ss(e))return i;if(!qe(e)){let r=pt(e);for(;r&&!Mt(r);){if(De(r)&&!_s(r))return r;r=pt(r)}return i}let s=Pr(e,t);for(;s&&Mn(s)&&_s(s);)s=Pr(s,t);return s&&Mt(s)&&_s(s)&&!rs(s)?i:s||Bn(e)||i}const el=async function(e){const t=this.getOffsetParent||Ia,i=this.getDimensions,s=await i(e.floating);return{reference:Jn(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:s.width,height:s.height}}};function tl(e){return Me(e).direction==="rtl"}const Ii={convertOffsetParentRelativeRectToViewportRelativeRect:Vn,getDocumentElement:Ye,getClippingRect:Qn,getOffsetParent:Ia,getElementRects:el,getClientRects:Wn,getDimensions:Zn,getScale:Dt,isElement:De,isRTL:tl};function Da(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function il(e,t){let i=null,s;const r=Ye(e);function a(){var n;clearTimeout(s),(n=i)==null||n.disconnect(),i=null}function o(n,u){n===void 0&&(n=!1),u===void 0&&(u=1),a();const c=e.getBoundingClientRect(),{left:p,top:f,width:b,height:m}=c;if(n||t(),!b||!m)return;const g=Ci(f),y=Ci(r.clientWidth-(p+b)),k=Ci(r.clientHeight-(f+m)),_=Ci(p),O={rootMargin:-g+"px "+-y+"px "+-k+"px "+-_+"px",threshold:ve(0,ut(1,u))||1};let Y=!0;function j(de){const W=de[0].intersectionRatio;if(W!==u){if(!Y)return o();W?o(!1,W):s=setTimeout(()=>{o(!1,1e-7)},1e3)}W===1&&!Da(c,e.getBoundingClientRect())&&o(),Y=!1}try{i=new IntersectionObserver(j,{...O,root:r.ownerDocument})}catch{i=new IntersectionObserver(j,O)}i.observe(e)}return o(!0),a}function sl(e,t,i,s){s===void 0&&(s={});const{ancestorScroll:r=!0,ancestorResize:a=!0,elementResize:o=typeof ResizeObserver=="function",layoutShift:n=typeof IntersectionObserver=="function",animationFrame:u=!1}=s,c=ir(e),p=r||a?[...c?oi(c):[],...oi(t)]:[];p.forEach(_=>{r&&_.addEventListener("scroll",i,{passive:!0}),a&&_.addEventListener("resize",i)});const f=c&&n?il(c,i):null;let b=-1,m=null;o&&(m=new ResizeObserver(_=>{let[E]=_;E&&E.target===c&&m&&(m.unobserve(t),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var O;(O=m)==null||O.observe(t)})),i()}),c&&!u&&m.observe(c),m.observe(t));let g,y=u?Ct(e):null;u&&k();function k(){const _=Ct(e);y&&!Da(y,_)&&i(),y=_,g=requestAnimationFrame(k)}return i(),()=>{var _;p.forEach(E=>{r&&E.removeEventListener("scroll",i),a&&E.removeEventListener("resize",i)}),f==null||f(),(_=m)==null||_.disconnect(),m=null,u&&cancelAnimationFrame(g)}}const rl=Rn,al=An,ol=Sn,Lr=On,nl=Tn,ll=(e,t,i)=>{const s=new Map,r={platform:Ii,...i},a={...r.platform,_c:s};return $n(e,t,{...r,platform:a})};function cl(e){return dl(e)}function Cs(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function dl(e){for(let t=e;t;t=Cs(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=Cs(e);t;t=Cs(t)){if(!(t instanceof Element))continue;const i=getComputedStyle(t);if(i.display!=="contents"&&(i.position!=="static"||rs(i)||t.tagName==="BODY"))return t}return null}function ul(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var F=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let s=0,r=0,a=0,o=0,n=0,u=0,c=0,p=0;i?e.top<t.top?(s=e.left,r=e.bottom,a=e.right,o=e.bottom,n=t.left,u=t.top,c=t.right,p=t.top):(s=t.left,r=t.bottom,a=t.right,o=t.bottom,n=e.left,u=e.top,c=e.right,p=e.top):e.left<t.left?(s=e.right,r=e.top,a=t.left,o=t.top,n=e.right,u=e.bottom,c=t.left,p=t.bottom):(s=t.right,r=t.top,a=e.left,o=e.top,n=t.right,u=t.bottom,c=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${s}px`),this.style.setProperty("--hover-bridge-top-left-y",`${r}px`),this.style.setProperty("--hover-bridge-top-right-x",`${a}px`),this.style.setProperty("--hover-bridge-top-right-y",`${o}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${c}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||ul(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=sl(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[rl({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(Lr({apply:({rects:i})=>{const s=this.sync==="width"||this.sync==="both",r=this.sync==="height"||this.sync==="both";this.popup.style.width=s?`${i.reference.width}px`:"",this.popup.style.height=r?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(ol({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(al({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(Lr({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:s})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${s}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(nl({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?i=>Ii.getOffsetParent(i,cl):Ii.getOffsetParent;ll(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:ui(st({},Ii),{getOffsetParent:t})}).then(({x:i,y:s,middlewareData:r,placement:a})=>{const o=this.localize.dir()==="rtl",n={top:"bottom",right:"left",bottom:"top",left:"right"}[a.split("-")[0]];if(this.setAttribute("data-current-placement",a),Object.assign(this.popup.style,{left:`${i}px`,top:`${s}px`}),this.arrow){const u=r.arrow.x,c=r.arrow.y;let p="",f="",b="",m="";if(this.arrowPlacement==="start"){const g=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=o?g:"",m=o?"":g}else if(this.arrowPlacement==="end"){const g=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=o?"":g,m=o?g:"",b=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof c=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof u=="number"?`${u}px`:"",p=typeof c=="number"?`${c}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:b,left:m,[n]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return d`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${M({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${M({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?d`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};F.styles=[H,mn];l([C(".popup")],F.prototype,"popup",2);l([C(".popup__arrow")],F.prototype,"arrowEl",2);l([h()],F.prototype,"anchor",2);l([h({type:Boolean,reflect:!0})],F.prototype,"active",2);l([h({reflect:!0})],F.prototype,"placement",2);l([h({reflect:!0})],F.prototype,"strategy",2);l([h({type:Number})],F.prototype,"distance",2);l([h({type:Number})],F.prototype,"skidding",2);l([h({type:Boolean})],F.prototype,"arrow",2);l([h({attribute:"arrow-placement"})],F.prototype,"arrowPlacement",2);l([h({attribute:"arrow-padding",type:Number})],F.prototype,"arrowPadding",2);l([h({type:Boolean})],F.prototype,"flip",2);l([h({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],F.prototype,"flipFallbackPlacements",2);l([h({attribute:"flip-fallback-strategy"})],F.prototype,"flipFallbackStrategy",2);l([h({type:Object})],F.prototype,"flipBoundary",2);l([h({attribute:"flip-padding",type:Number})],F.prototype,"flipPadding",2);l([h({type:Boolean})],F.prototype,"shift",2);l([h({type:Object})],F.prototype,"shiftBoundary",2);l([h({attribute:"shift-padding",type:Number})],F.prototype,"shiftPadding",2);l([h({attribute:"auto-size"})],F.prototype,"autoSize",2);l([h()],F.prototype,"sync",2);l([h({type:Object})],F.prototype,"autoSizeBoundary",2);l([h({attribute:"auto-size-padding",type:Number})],F.prototype,"autoSizePadding",2);l([h({attribute:"hover-bridge",type:Boolean})],F.prototype,"hoverBridge",2);var Ma=new Map,hl=new WeakMap;function pl(e){return e??{keyframes:[],options:{duration:0}}}function Fr(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function B(e,t){Ma.set(e,pl(t))}function G(e,t,i){const s=hl.get(e);if(s!=null&&s[t])return Fr(s[t],i.dir);const r=Ma.get(t);return r?Fr(r,i.dir):{keyframes:[],options:{duration:0}}}function be(e,t){return new Promise(i=>{function s(r){r.target===e&&(e.removeEventListener(t,s),i())}e.addEventListener(t,s)})}function X(e,t,i){return new Promise(s=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const r=e.animate(t,ui(st({},i),{duration:ml()?0:i.duration}));r.addEventListener("cancel",s,{once:!0}),r.addEventListener("finish",s,{once:!0})})}function Nr(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function ml(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function ee(e){return Promise.all(e.getAnimations().map(t=>new Promise(i=>{t.cancel(),requestAnimationFrame(i)})))}function Br(e,t){return e.map(i=>ui(st({},i),{height:i.height==="auto"?`${t}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Fs=class extends es{constructor(t){if(super(t),this.it=v,t.type!==Ze.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===v||t==null)return this._t=void 0,this.it=t;if(t===Ot)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};Fs.directiveName="unsafeHTML",Fs.resultType=1;const sr=Ji(Fs);var z=class extends P{constructor(){super(...arguments),this.formControlController=new hi(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new rt(this,"help-text","label"),this.localize=new ne(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>d`
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
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,i=t.closest(".select__clear")!==null,s=t.closest("sl-icon-button")!==null;if(!(i||s)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const r=this.getAllOptions(),a=r.indexOf(this.currentOption);let o=Math.max(0,a);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(o=a+1,o>r.length-1&&(o=0)):e.key==="ArrowUp"?(o=a-1,o<0&&(o=r.length-1)):e.key==="Home"?o=0:e.key==="End"&&(o=r.length-1),this.setCurrentOption(r[o])}if(e.key&&e.key.length===1||e.key==="Backspace"){const r=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const a of r)if(a.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(a);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const i=e.composedPath().some(s=>s instanceof Element&&s.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const i=e.target.closest("sl-option"),s=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==s&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(t)?t:[t],s=[];e.forEach(r=>s.push(r.value)),this.setSelectedOptions(e.filter(r=>i.includes(r.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),i=Array.isArray(e)?e:[e];t.forEach(s=>s.selected=!1),i.length&&i.forEach(s=>s.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,i;const s=this.getAllOptions();this.selectedOptions=s.filter(a=>a.selected);const r=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(a=>a.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const a=this.selectedOptions[0];this.value=(e=a==null?void 0:a.value)!=null?e:"",this.displayLabel=(i=(t=a==null?void 0:a.getTextLabel)==null?void 0:t.call(a))!=null?i:""}this.valueHasChanged=r,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(e,t);return d`<div @sl-remove=${s=>this.handleTagRemove(s,e)}>
          ${typeof i=="string"?sr(i):i}
        </div>`}else if(t===this.maxOptionsVisible)return d`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return d``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,i){if(super.attributeChangedCallback(e,t,i),e==="value"){const s=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=s}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(i=>t.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await ee(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=G(this,"select.show",{dir:this.localize.dir()});await X(this.popup.popup,e,t),this.currentOption&&Ds(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await ee(this);const{keyframes:e,options:t}=G(this,"select.hide",{dir:this.localize.dir()});await X(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,be(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,be(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t,r=this.clearable&&!this.disabled&&this.value.length>0,a=this.placeholder&&this.value&&this.value.length<=0;return d`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${M({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":a,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${this.multiple?d`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${r?d`
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
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};z.styles=[H,ts,dn];z.dependencies={"sl-icon":se,"sl-popup":F,"sl-tag":St};l([C(".select")],z.prototype,"popup",2);l([C(".select__combobox")],z.prototype,"combobox",2);l([C(".select__display-input")],z.prototype,"displayInput",2);l([C(".select__value-input")],z.prototype,"valueInput",2);l([C(".select__listbox")],z.prototype,"listbox",2);l([w()],z.prototype,"hasFocus",2);l([w()],z.prototype,"displayLabel",2);l([w()],z.prototype,"currentOption",2);l([w()],z.prototype,"selectedOptions",2);l([w()],z.prototype,"valueHasChanged",2);l([h()],z.prototype,"name",2);l([w()],z.prototype,"value",1);l([h({attribute:"value"})],z.prototype,"defaultValue",2);l([h({reflect:!0})],z.prototype,"size",2);l([h()],z.prototype,"placeholder",2);l([h({type:Boolean,reflect:!0})],z.prototype,"multiple",2);l([h({attribute:"max-options-visible",type:Number})],z.prototype,"maxOptionsVisible",2);l([h({type:Boolean,reflect:!0})],z.prototype,"disabled",2);l([h({type:Boolean})],z.prototype,"clearable",2);l([h({type:Boolean,reflect:!0})],z.prototype,"open",2);l([h({type:Boolean})],z.prototype,"hoist",2);l([h({type:Boolean,reflect:!0})],z.prototype,"filled",2);l([h({type:Boolean,reflect:!0})],z.prototype,"pill",2);l([h()],z.prototype,"label",2);l([h({reflect:!0})],z.prototype,"placement",2);l([h({attribute:"help-text"})],z.prototype,"helpText",2);l([h({reflect:!0})],z.prototype,"form",2);l([h({type:Boolean,reflect:!0})],z.prototype,"required",2);l([h()],z.prototype,"getTag",2);l([S("disabled",{waitUntilFirstUpdate:!0})],z.prototype,"handleDisabledChange",1);l([S(["defaultValue","value"],{waitUntilFirstUpdate:!0})],z.prototype,"handleValueChange",1);l([S("open",{waitUntilFirstUpdate:!0})],z.prototype,"handleOpenChange",1);B("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});z.define("sl-select");var fl=$`
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
`,Ee=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(t+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(t+=i.textContent)}),t.trim()}render(){return d`
      <div
        part="base"
        class=${M({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};Ee.styles=[H,fl];Ee.dependencies={"sl-icon":se};l([C(".option__label")],Ee.prototype,"defaultSlot",2);l([w()],Ee.prototype,"current",2);l([w()],Ee.prototype,"selected",2);l([w()],Ee.prototype,"hasHover",2);l([h({reflect:!0})],Ee.prototype,"value",2);l([h({type:Boolean,reflect:!0})],Ee.prototype,"disabled",2);l([S("disabled")],Ee.prototype,"handleDisabledChange",1);l([S("selected")],Ee.prototype,"handleSelectedChange",1);l([S("value")],Ee.prototype,"handleValueChange",1);Ee.define("sl-option");var bl=$`
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
`;function*rr(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*jo(rr(e.shadowRoot.activeElement))))}function Pa(){return[...rr()].pop()}var Hr=new WeakMap;function La(e){let t=Hr.get(e);return t||(t=window.getComputedStyle(e,null),Hr.set(e,t)),t}function gl(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=La(e);return t.visibility!=="hidden"&&t.display!=="none"}function vl(e){const t=La(e),{overflowY:i,overflowX:s}=t;return i==="scroll"||s==="scroll"?!0:i!=="auto"||s!=="auto"?!1:e.scrollHeight>e.clientHeight&&i==="auto"||e.scrollWidth>e.clientWidth&&s==="auto"}function yl(e){const t=e.tagName.toLowerCase(),i=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const a=e.getRootNode(),o=`input[type='radio'][name="${e.getAttribute("name")}"]`,n=a.querySelector(`${o}:checked`);return n?n===e:a.querySelector(o)===e}return gl(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:vl(e):!1}function wl(e){var t,i;const s=Ns(e),r=(t=s[0])!=null?t:null,a=(i=s[s.length-1])!=null?i:null;return{start:r,end:a}}function kl(e,t){var i;return((i=e.getRootNode({composed:!0}))==null?void 0:i.host)!==t}function Ns(e){const t=new WeakMap,i=[];function s(r){if(r instanceof Element){if(r.hasAttribute("inert")||r.closest("[inert]")||t.has(r))return;t.set(r,!0),!i.includes(r)&&yl(r)&&i.push(r),r instanceof HTMLSlotElement&&kl(r,e)&&r.assignedElements({flatten:!0}).forEach(a=>{s(a)}),r.shadowRoot!==null&&r.shadowRoot.mode==="open"&&s(r.shadowRoot)}for(const a of r.children)s(a)}return s(e),i.sort((r,a)=>{const o=Number(r.getAttribute("tabindex"))||0;return(Number(a.getAttribute("tabindex"))||0)-o})}var Xt=[],Fa=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var i;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const s=Pa();if(this.previousFocus=s,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const r=Ns(this.element);let a=r.findIndex(n=>n===s);this.previousFocus=this.currentFocus;const o=this.tabDirection==="forward"?1:-1;for(;;){a+o>=r.length?a=0:a+o<0?a=r.length-1:a+=o,this.previousFocus=this.currentFocus;const n=r[a];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||n&&this.possiblyHasTabbableChildren(n))return;t.preventDefault(),this.currentFocus=n,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const u=[...rr()];if(u.includes(this.currentFocus)||!u.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Xt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Xt=Xt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Xt[Xt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=Ns(this.element);if(!this.element.matches(":focus-within")){const t=e[0],i=e[e.length-1],s=this.tabDirection==="forward"?t:i;typeof(s==null?void 0:s.focus)=="function"&&(this.currentFocus=s,s.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},ar=e=>{var t;const{activeElement:i}=document;i&&e.contains(i)&&((t=document.activeElement)==null||t.blur())};function jr(e){return e.charAt(0).toUpperCase()+e.slice(1)}var xe=class extends P{constructor(){super(...arguments),this.hasSlotController=new rt(this,"footer"),this.localize=new ne(this),this.modal=new Fa(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),ii(this)))}disconnectedCallback(){super.disconnectedCallback(),si(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=G(this,"drawer.denyClose",{dir:this.localize.dir()});X(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),ii(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([ee(this.drawer),ee(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=G(this,`drawer.show${jr(this.placement)}`,{dir:this.localize.dir()}),i=G(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([X(this.panel,t.keyframes,t.options),X(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{ar(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),si(this)),await Promise.all([ee(this.drawer),ee(this.overlay)]);const e=G(this,`drawer.hide${jr(this.placement)}`,{dir:this.localize.dir()}),t=G(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([X(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),X(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),ii(this)),this.open&&this.contained&&(this.modal.deactivate(),si(this))}async show(){if(!this.open)return this.open=!0,be(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,be(this,"sl-after-hide")}render(){return d`
      <div
        part="base"
        class=${M({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":d`
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
    `}};xe.styles=[H,bl];xe.dependencies={"sl-icon-button":Z};l([C(".drawer")],xe.prototype,"drawer",2);l([C(".drawer__panel")],xe.prototype,"panel",2);l([C(".drawer__overlay")],xe.prototype,"overlay",2);l([h({type:Boolean,reflect:!0})],xe.prototype,"open",2);l([h({reflect:!0})],xe.prototype,"label",2);l([h({reflect:!0})],xe.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],xe.prototype,"contained",2);l([h({attribute:"no-header",type:Boolean,reflect:!0})],xe.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],xe.prototype,"handleOpenChange",1);l([S("contained",{waitUntilFirstUpdate:!0})],xe.prototype,"handleNoModalChange",1);B("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});B("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});B("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});B("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});B("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});B("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});xe.define("sl-drawer");var xl=$`
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
`,Ke=class extends P{constructor(){super(...arguments),this.hasSlotController=new rt(this,"footer"),this.localize=new ne(this),this.modal=new Fa(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),ii(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),si(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=G(this,"dialog.denyClose",{dir:this.localize.dir()});X(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),ii(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([ee(this.dialog),ee(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=G(this,"dialog.show",{dir:this.localize.dir()}),i=G(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([X(this.panel,t.keyframes,t.options),X(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{ar(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([ee(this.dialog),ee(this.overlay)]);const e=G(this,"dialog.hide",{dir:this.localize.dir()}),t=G(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([X(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),X(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,si(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,be(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,be(this,"sl-after-hide")}render(){return d`
      <div
        part="base"
        class=${M({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":d`
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
    `}};Ke.styles=[H,xl];Ke.dependencies={"sl-icon-button":Z};l([C(".dialog")],Ke.prototype,"dialog",2);l([C(".dialog__panel")],Ke.prototype,"panel",2);l([C(".dialog__overlay")],Ke.prototype,"overlay",2);l([h({type:Boolean,reflect:!0})],Ke.prototype,"open",2);l([h({reflect:!0})],Ke.prototype,"label",2);l([h({attribute:"no-header",type:Boolean,reflect:!0})],Ke.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],Ke.prototype,"handleOpenChange",1);B("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});B("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});B("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Ke.define("sl-dialog");var _l=$`
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
`,mi=class extends P{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return d`
      <span
        part="base"
        class=${M({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};mi.styles=[H,_l];l([h({reflect:!0})],mi.prototype,"variant",2);l([h({type:Boolean,reflect:!0})],mi.prototype,"pill",2);l([h({type:Boolean,reflect:!0})],mi.prototype,"pulse",2);mi.define("sl-badge");var Cl=$`
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
`,_e=class wt extends P{constructor(){super(...arguments),this.hasSlotController=new rt(this,"icon","suffix"),this.localize=new ne(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,i="100%",s="0";this.countdownAnimation=t.animate([{width:i},{width:s}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await ee(this.base),this.base.hidden=!1;const{keyframes:t,options:i}=G(this,"alert.show",{dir:this.localize.dir()});await X(this.base,t,i),this.emit("sl-after-show")}else{ar(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await ee(this.base);const{keyframes:t,options:i}=G(this,"alert.hide",{dir:this.localize.dir()});await X(this.base,t,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,be(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,be(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),wt.toastStack.parentElement===null&&document.body.append(wt.toastStack),wt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{wt.toastStack.removeChild(this),t(),wt.toastStack.querySelector("sl-alert")===null&&wt.toastStack.remove()},{once:!0})})}render(){return d`
      <div
        part="base"
        class=${M({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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

        ${this.closable?d`
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

        ${this.countdown?d`
              <div
                class=${M({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};_e.styles=[H,Cl];_e.dependencies={"sl-icon-button":Z};l([C('[part~="base"]')],_e.prototype,"base",2);l([C(".alert__countdown-elapsed")],_e.prototype,"countdownElement",2);l([h({type:Boolean,reflect:!0})],_e.prototype,"open",2);l([h({type:Boolean,reflect:!0})],_e.prototype,"closable",2);l([h({reflect:!0})],_e.prototype,"variant",2);l([h({type:Number})],_e.prototype,"duration",2);l([h({type:String,reflect:!0})],_e.prototype,"countdown",2);l([w()],_e.prototype,"remainingTime",2);l([S("open",{waitUntilFirstUpdate:!0})],_e.prototype,"handleOpenChange",1);l([S("duration")],_e.prototype,"handleDurationChange",1);var $l=_e;B("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});$l.define("sl-alert");var Tl=$`
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
`,A=class extends P{constructor(){super(...arguments),this.formControlController=new hi(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new rt(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,s="preserve"){const r=t??this.input.selectionStart,a=i??this.input.selectionEnd;this.input.setRangeText(e,r,a,s),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,s=this.helpText?!0:!!t;return d`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":s})}
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
            class=${M({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${Li(this.value)}
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
          aria-hidden=${s?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};A.styles=[H,ts,Tl];l([C(".textarea__control")],A.prototype,"input",2);l([C(".textarea__size-adjuster")],A.prototype,"sizeAdjuster",2);l([w()],A.prototype,"hasFocus",2);l([h()],A.prototype,"title",2);l([h()],A.prototype,"name",2);l([h()],A.prototype,"value",2);l([h({reflect:!0})],A.prototype,"size",2);l([h({type:Boolean,reflect:!0})],A.prototype,"filled",2);l([h()],A.prototype,"label",2);l([h({attribute:"help-text"})],A.prototype,"helpText",2);l([h()],A.prototype,"placeholder",2);l([h({type:Number})],A.prototype,"rows",2);l([h()],A.prototype,"resize",2);l([h({type:Boolean,reflect:!0})],A.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],A.prototype,"readonly",2);l([h({reflect:!0})],A.prototype,"form",2);l([h({type:Boolean,reflect:!0})],A.prototype,"required",2);l([h({type:Number})],A.prototype,"minlength",2);l([h({type:Number})],A.prototype,"maxlength",2);l([h()],A.prototype,"autocapitalize",2);l([h()],A.prototype,"autocorrect",2);l([h()],A.prototype,"autocomplete",2);l([h({type:Boolean})],A.prototype,"autofocus",2);l([h()],A.prototype,"enterkeyhint",2);l([h({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],A.prototype,"spellcheck",2);l([h()],A.prototype,"inputmode",2);l([Qs()],A.prototype,"defaultValue",2);l([S("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);l([S("rows",{waitUntilFirstUpdate:!0})],A.prototype,"handleRowsChange",1);l([S("value",{waitUntilFirstUpdate:!0})],A.prototype,"handleValueChange",1);A.define("sl-textarea");var Sl=$`
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
`,le=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(s,r)=>{if(!s)return null;const a=s.closest(r);if(a)return a;const o=s.getRootNode();return o instanceof ShadowRoot?i(o.host,r):null};setTimeout(()=>{var s;const r=((s=this.containingElement)==null?void 0:s.getRootNode())instanceof ShadowRoot?Pa():document.activeElement;(!this.containingElement||i(r,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const i=t.getAllItems(),s=i[0],r=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(s),s.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(r),r.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(s=>wl(s).start);let i;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=t.button;break;default:i=t}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,be(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,be(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await ee(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=G(this,"dropdown.show",{dir:this.localize.dir()});await X(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await ee(this);const{keyframes:e,options:t}=G(this,"dropdown.hide",{dir:this.localize.dir()});await X(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return d`
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
        class=${M({dropdown:!0,"dropdown--open":this.open})}
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
    `}};le.styles=[H,Sl];le.dependencies={"sl-popup":F};l([C(".dropdown")],le.prototype,"popup",2);l([C(".dropdown__trigger")],le.prototype,"trigger",2);l([C(".dropdown__panel")],le.prototype,"panel",2);l([h({type:Boolean,reflect:!0})],le.prototype,"open",2);l([h({reflect:!0})],le.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],le.prototype,"disabled",2);l([h({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],le.prototype,"stayOpenOnSelect",2);l([h({attribute:!1})],le.prototype,"containingElement",2);l([h({type:Number})],le.prototype,"distance",2);l([h({type:Number})],le.prototype,"skidding",2);l([h({type:Boolean})],le.prototype,"hoist",2);l([h({reflect:!0})],le.prototype,"sync",2);l([S("open",{waitUntilFirstUpdate:!0})],le.prototype,"handleOpenChange",1);B("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});le.define("sl-dropdown");var El=$`
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
`,or=class extends P{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],i=e.composedPath(),s=i.find(n=>{var u;return t.includes(((u=n==null?void 0:n.getAttribute)==null?void 0:u.call(n,"role"))||"")});if(!s||i.find(n=>{var u;return((u=n==null?void 0:n.getAttribute)==null?void 0:u.call(n,"role"))==="menu"})!==this)return;const o=s;o.type==="checkbox"&&(o.checked=!o.checked),this.emit("sl-select",{detail:{item:o}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),i=this.getCurrentItem();let s=i?t.indexOf(i):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?s++:e.key==="ArrowUp"?s--:e.key==="Home"?s=0:e.key==="End"&&(s=t.length-1),s<0&&(s=t.length-1),s>t.length-1&&(s=0),this.setCurrentItem(t[s]),t[s].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===e?"0":"-1")})}render(){return d`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};or.styles=[H,El];l([C("slot")],or.prototype,"defaultSlot",2);or.define("sl-menu");var zl=$`
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
 */const ri=(e,t)=>{var s;const i=e._$AN;if(i===void 0)return!1;for(const r of i)(s=r._$AO)==null||s.call(r,t,!1),ri(r,t);return!0},Hi=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while((i==null?void 0:i.size)===0)},Na=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),Ol(t)}};function Rl(e){this._$AN!==void 0?(Hi(this),this._$AM=e,Na(this)):this._$AM=e}function Al(e,t=!1,i=0){const s=this._$AH,r=this._$AN;if(r!==void 0&&r.size!==0)if(t)if(Array.isArray(s))for(let a=i;a<s.length;a++)ri(s[a],!1),Hi(s[a]);else s!=null&&(ri(s,!1),Hi(s));else ri(this,e)}const Ol=e=>{e.type==Ze.CHILD&&(e._$AP??(e._$AP=Al),e._$AQ??(e._$AQ=Rl))};class Il extends es{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,s){super._$AT(t,i,s),Na(this),this.isConnected=t._$AU}_$AO(t,i=!0){var s,r;t!==this.isConnected&&(this.isConnected=t,t?(s=this.reconnected)==null||s.call(this):(r=this.disconnected)==null||r.call(this)),i&&(ri(this,t),Hi(this))}setValue(t){if(_a(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Dl=()=>new Ml;class Ml{}const $s=new WeakMap,Pl=Ji(class extends Il{render(e){return v}update(e,[t]){var s;const i=t!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=(s=e.options)==null?void 0:s.host,this.rt(this.ct=e.element)),v}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=$s.get(t);i===void 0&&(i=new WeakMap,$s.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=$s.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var Ll=class{constructor(e,t){this.popupRef=Dl(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var s;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(s=i.target.role)!=null&&s.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),s=i==null?void 0:i.assignedElements({flatten:!0}).filter(c=>c.localName==="sl-menu")[0],r=getComputedStyle(this.host).direction==="rtl";if(!s)return;const{left:a,top:o,width:n,height:u}=s.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${r?a+n:a}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${o}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${r?a+n:a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${o+u}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const s of t.assignedElements())if(i=s.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let s=1;s!==i.length;++s)i[s].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),s=["padding-top","border-top-width","margin-top"].reduce((r,a)=>{var o;const n=(o=t.get(a))!=null?o:new CSSUnitValue(0,"px"),c=(n instanceof CSSUnitValue?n:new CSSUnitValue(0,"px")).to("px");return r-c.value},0);this.skidding=s}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?d`
      <sl-popup
        ${Pl(this.popupRef)}
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
    `:d` <slot name="submenu" hidden></slot> `}},Ce=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new rt(this,"submenu"),this.submenuController=new Ll(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Wo(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return d`
      <div
        id="anchor"
        part="base"
        class=${M({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
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
        ${this.loading?d` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};Ce.styles=[H,zl];Ce.dependencies={"sl-icon":se,"sl-popup":F,"sl-spinner":Zi};l([C("slot:not([name])")],Ce.prototype,"defaultSlot",2);l([C(".menu-item")],Ce.prototype,"menuItem",2);l([h()],Ce.prototype,"type",2);l([h({type:Boolean,reflect:!0})],Ce.prototype,"checked",2);l([h()],Ce.prototype,"value",2);l([h({type:Boolean,reflect:!0})],Ce.prototype,"loading",2);l([h({type:Boolean,reflect:!0})],Ce.prototype,"disabled",2);l([S("checked")],Ce.prototype,"handleCheckedChange",1);l([S("disabled")],Ce.prototype,"handleDisabledChange",1);l([S("type")],Ce.prototype,"handleTypeChange",1);Ce.define("sl-menu-item");se.define("sl-icon");var Fl=$`
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
`,ns=class extends P{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};ns.styles=[H,Fl];l([h({type:Boolean,reflect:!0})],ns.prototype,"vertical",2);l([S("vertical")],ns.prototype,"handleVerticalChange",1);ns.define("sl-divider");var Nl=$`
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
`,re=class extends P{constructor(){super(),this.localize=new ne(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=Nr(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=Nr(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await ee(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:s}=G(this,"tooltip.show",{dir:this.localize.dir()});await X(this.popup.popup,i,s),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await ee(this.body);const{keyframes:i,options:s}=G(this,"tooltip.hide",{dir:this.localize.dir()});await X(this.popup.popup,i,s),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,be(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,be(this,"sl-after-hide")}render(){return d`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${M({tooltip:!0,"tooltip--open":this.open})}
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
    `}};re.styles=[H,Nl];re.dependencies={"sl-popup":F};l([C("slot:not([name])")],re.prototype,"defaultSlot",2);l([C(".tooltip__body")],re.prototype,"body",2);l([C("sl-popup")],re.prototype,"popup",2);l([h()],re.prototype,"content",2);l([h()],re.prototype,"placement",2);l([h({type:Boolean,reflect:!0})],re.prototype,"disabled",2);l([h({type:Number})],re.prototype,"distance",2);l([h({type:Boolean,reflect:!0})],re.prototype,"open",2);l([h({type:Number})],re.prototype,"skidding",2);l([h()],re.prototype,"trigger",2);l([h({type:Boolean})],re.prototype,"hoist",2);l([S("open",{waitUntilFirstUpdate:!0})],re.prototype,"handleOpenChange",1);l([S(["content","distance","hoist","placement","skidding"])],re.prototype,"handleOptionsChange",1);l([S("disabled")],re.prototype,"handleDisabledChange",1);B("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});B("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});re.define("sl-tooltip");var Bl=$`
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
`,ie=class extends P{constructor(){super(...arguments),this.formControlController=new hi(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new rt(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return d`
      <div
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${M({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${Li(this.indeterminate)}
            .checked=${Li(this.checked)}
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
            ${this.checked?d`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?d`
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
    `}};ie.styles=[H,ts,Bl];ie.dependencies={"sl-icon":se};l([C('input[type="checkbox"]')],ie.prototype,"input",2);l([w()],ie.prototype,"hasFocus",2);l([h()],ie.prototype,"title",2);l([h()],ie.prototype,"name",2);l([h()],ie.prototype,"value",2);l([h({reflect:!0})],ie.prototype,"size",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"disabled",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"checked",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"indeterminate",2);l([Qs("checked")],ie.prototype,"defaultChecked",2);l([h({reflect:!0})],ie.prototype,"form",2);l([h({type:Boolean,reflect:!0})],ie.prototype,"required",2);l([h({attribute:"help-text"})],ie.prototype,"helpText",2);l([S("disabled",{waitUntilFirstUpdate:!0})],ie.prototype,"handleDisabledChange",1);l([S(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],ie.prototype,"handleStateChange",1);ie.define("sl-checkbox");var Hl=$`
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
`,jl=$`
  :host {
    display: contents;
  }
`,ls=class extends P{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],t.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return d` <slot @slotchange=${this.handleSlotChange}></slot> `}};ls.styles=[H,jl];l([h({type:Boolean,reflect:!0})],ls.prototype,"disabled",2);l([S("disabled",{waitUntilFirstUpdate:!0})],ls.prototype,"handleDisabledChange",1);var ae=class extends P{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new ne(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const i=t.filter(({target:s})=>{if(s===this)return!0;if(s.closest("sl-tab-group")!==this)return!1;const r=s.tagName.toLowerCase();return r==="sl-tab"||r==="sl-tab-panel"});if(i.length!==0){if(i.some(s=>!["aria-labelledby","aria-controls"].includes(s.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(s=>s.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(s=>s.attributeName==="active")){const r=i.filter(a=>a.attributeName==="active"&&a.target.tagName.toLowerCase()==="sl-tab").map(a=>a.target).find(a=>a.active);r&&this.setActiveTab(r)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((i,s)=>{var r;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((r=this.getActiveTab())!=null?r:this.tabs[0],{emitEvents:!1}),s.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const i=e.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(e){const i=e.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const r=this.tabs.find(n=>n.matches(":focus")),a=this.localize.dir()==="rtl";let o=null;if((r==null?void 0:r.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")o=this.focusableTabs[0];else if(e.key==="End")o=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(a?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const n=this.tabs.findIndex(u=>u===r);o=this.findNextFocusableTab(n,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(a?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const n=this.tabs.findIndex(u=>u===r);o=this.findNextFocusableTab(n,"forward")}if(!o)return;o.tabIndex=0,o.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(o,{scrollBehavior:"smooth"}):this.tabs.forEach(n=>{n.tabIndex=n===o?0:-1}),["top","bottom"].includes(this.placement)&&Ds(o,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=st({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const i=this.activeTab;this.activeTab=e,this.tabs.forEach(s=>{s.active=s===this.activeTab,s.tabIndex=s===this.activeTab?0:-1}),this.panels.forEach(s=>{var r;return s.active=s.name===((r=this.activeTab)==null?void 0:r.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&Ds(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(i=>i.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,i=e.clientHeight,s=this.localize.dir()==="rtl",r=this.getAllTabs(),o=r.slice(0,r.indexOf(e)).reduce((n,u)=>({left:n.left+u.clientWidth,top:n.top+u.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=s?`${-1*o.left}px`:`${o.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${o.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let i=null;const s=t==="forward"?1:-1;let r=e+s;for(;e<this.tabs.length;){if(i=this.tabs[r]||null,i===null){t==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;r+=s}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(i=>i.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return d`
      <div
        part="base"
        class=${M({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?d`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${M({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
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

          ${this.hasScrollControls?d`
                <sl-icon-button
                  part="scroll-button scroll-button--end"
                  exportparts="base:scroll-button__base"
                  class=${M({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
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
    `}};ae.styles=[H,Hl];ae.dependencies={"sl-icon-button":Z,"sl-resize-observer":ls};l([C(".tab-group")],ae.prototype,"tabGroup",2);l([C(".tab-group__body")],ae.prototype,"body",2);l([C(".tab-group__nav")],ae.prototype,"nav",2);l([C(".tab-group__indicator")],ae.prototype,"indicator",2);l([w()],ae.prototype,"hasScrollControls",2);l([w()],ae.prototype,"shouldHideScrollStartButton",2);l([w()],ae.prototype,"shouldHideScrollEndButton",2);l([h()],ae.prototype,"placement",2);l([h()],ae.prototype,"activation",2);l([h({attribute:"no-scroll-controls",type:Boolean})],ae.prototype,"noScrollControls",2);l([h({attribute:"fixed-scroll-controls",type:Boolean})],ae.prototype,"fixedScrollControls",2);l([Uo({passive:!0})],ae.prototype,"updateScrollButtons",1);l([S("noScrollControls",{waitUntilFirstUpdate:!0})],ae.prototype,"updateScrollControls",1);l([S("placement",{waitUntilFirstUpdate:!0})],ae.prototype,"syncIndicator",1);ae.define("sl-tab-group");var Ul=(e,t)=>{let i=0;return function(...s){window.clearTimeout(i),i=window.setTimeout(()=>{e.call(this,...s)},t)}},Ur=(e,t,i)=>{const s=e[t];e[t]=function(...r){s.call(this,...r),i.call(this,s,...r)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,i=new WeakMap,s=a=>{for(const o of a.changedTouches)t.add(o.identifier)},r=a=>{for(const o of a.changedTouches)t.delete(o.identifier)};document.addEventListener("touchstart",s,!0),document.addEventListener("touchend",r,!0),document.addEventListener("touchcancel",r,!0),Ur(EventTarget.prototype,"addEventListener",function(a,o){if(o!=="scrollend")return;const n=Ul(()=>{t.size?n():this.dispatchEvent(new Event("scrollend"))},100);a.call(this,"scroll",n,{passive:!0}),i.set(this,n)}),Ur(EventTarget.prototype,"removeEventListener",function(a,o){if(o!=="scrollend")return;const n=i.get(this);n&&a.call(this,"scroll",n,{passive:!0})})}})();var Vl=$`
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
`,Wl=0,Le=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.attrId=++Wl,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,d`
      <div
        part="base"
        class=${M({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
      >
        <slot></slot>
        ${this.closable?d`
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
    `}};Le.styles=[H,Vl];Le.dependencies={"sl-icon-button":Z};l([C(".tab")],Le.prototype,"tab",2);l([h({reflect:!0})],Le.prototype,"panel",2);l([h({type:Boolean,reflect:!0})],Le.prototype,"active",2);l([h({type:Boolean,reflect:!0})],Le.prototype,"closable",2);l([h({type:Boolean,reflect:!0})],Le.prototype,"disabled",2);l([h({type:Number,reflect:!0})],Le.prototype,"tabIndex",2);l([S("active")],Le.prototype,"handleActiveChange",1);l([S("disabled")],Le.prototype,"handleDisabledChange",1);Le.define("sl-tab");var ql=$`
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
`,Yl=0,fi=class extends P{constructor(){super(...arguments),this.attrId=++Yl,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return d`
      <slot
        part="base"
        class=${M({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};fi.styles=[H,ql];l([h({reflect:!0})],fi.prototype,"name",2);l([h({type:Boolean,reflect:!0})],fi.prototype,"active",2);l([S("active")],fi.prototype,"handleActiveChange",1);fi.define("sl-tab-panel");Zi.define("sl-spinner");Z.define("sl-icon-button");var Kl=$`
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
`,Fe=class extends P{constructor(){super(...arguments),this.localize=new ne(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await ee(this.body);const{keyframes:t,options:i}=G(this,"details.show",{dir:this.localize.dir()});await X(this.body,Br(t,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await ee(this.body);const{keyframes:t,options:i}=G(this,"details.hide",{dir:this.localize.dir()});await X(this.body,Br(t,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,be(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,be(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return d`
      <details
        part="base"
        class=${M({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
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
    `}};Fe.styles=[H,Kl];Fe.dependencies={"sl-icon":se};l([C(".details")],Fe.prototype,"details",2);l([C(".details__header")],Fe.prototype,"header",2);l([C(".details__body")],Fe.prototype,"body",2);l([C(".details__expand-icon-slot")],Fe.prototype,"expandIconSlot",2);l([h({type:Boolean,reflect:!0})],Fe.prototype,"open",2);l([h()],Fe.prototype,"summary",2);l([h({type:Boolean,reflect:!0})],Fe.prototype,"disabled",2);l([S("open",{waitUntilFirstUpdate:!0})],Fe.prototype,"handleOpenChange",1);B("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});B("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});Fe.define("sl-details");const Gl="modulepreload",Xl=function(e,t){return new URL(e,t).href},Vr={},Wr=function(t,i,s){let r=Promise.resolve();if(i&&i.length>0){const o=document.getElementsByTagName("link"),n=document.querySelector("meta[property=csp-nonce]"),u=(n==null?void 0:n.nonce)||(n==null?void 0:n.getAttribute("nonce"));r=Promise.allSettled(i.map(c=>{if(c=Xl(c,s),c in Vr)return;Vr[c]=!0;const p=c.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(!!s)for(let g=o.length-1;g>=0;g--){const y=o[g];if(y.href===c&&(!p||y.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${f}`))return;const m=document.createElement("link");if(m.rel=p?"stylesheet":Gl,p||(m.as="script"),m.crossOrigin="",m.href=c,u&&m.setAttribute("nonce",u),document.head.appendChild(m),p)return new Promise((g,y)=>{m.addEventListener("load",g),m.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(o){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=o,window.dispatchEvent(n),!n.defaultPrevented)throw o}return r.then(o=>{for(const n of o||[])n.status==="rejected"&&a(n.reason);return t().catch(a)})};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Ql=class extends Event{constructor(t,i,s,r){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i,this.callback=s,this.subscribe=r??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Zl{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,i=!1){const s=i||!Object.is(t,this.o);this.o=t,s&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:s}]of this.subscriptions)i(this.o,s)},t!==void 0&&(this.value=t)}addCallback(t,i,s){if(!s)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:i});const{disposer:r}=this.subscriptions.get(t);t(this.value,r)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Jl=class extends Event{constructor(t,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i}};class qr extends Zl{constructor(t,i,s){var r,a;super(i.context!==void 0?i.initialValue:s),this.onContextRequest=o=>{if(o.context!==this.context)return;const n=o.contextTarget??o.composedPath()[0];n!==this.host&&(o.stopPropagation(),this.addCallback(o.callback,n,o.subscribe))},this.onProviderRequest=o=>{if(o.context!==this.context||(o.contextTarget??o.composedPath()[0])===this.host)return;const n=new Set;for(const[u,{consumerHost:c}]of this.subscriptions)n.has(u)||(n.add(u),c.dispatchEvent(new Ql(this.context,c,u,!0)));o.stopPropagation()},this.host=t,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(a=(r=this.host).addController)==null||a.call(r,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Jl(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ec({context:e}){return(t,i)=>{const s=new WeakMap;if(typeof i=="object")return{get(){return t.get.call(this)},set(r){return s.get(this).setValue(r),t.set.call(this,r)},init(r){return s.set(this,new qr(this,{context:e,initialValue:r})),r}};{t.constructor.addInitializer(o=>{s.set(o,new qr(o,{context:e}))});const r=Object.getOwnPropertyDescriptor(t,i);let a;if(r===void 0){const o=new WeakMap;a={get(){return o.get(this)},set(n){s.get(this).setValue(n),o.set(this,n)},configurable:!0,enumerable:!0}}else{const o=r.set;a={...r,set(n){s.get(this).setValue(n),o==null||o.call(this,n)}}}return void Object.defineProperty(t,i,a)}}}var J={},cs={};Object.defineProperty(cs,"__esModule",{value:!0});cs.StoreController=void 0;class tc{constructor(t,i){this.host=t,this.atom=i,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}cs.StoreController=tc;var jt={};Object.defineProperty(jt,"__esModule",{value:!0});jt.MultiStoreController=void 0;class ic{constructor(t,i){this.host=t,this.atoms=i,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(i=>i())}get values(){return this.atoms.map(t=>t.get())}}jt.MultiStoreController=ic;var ds={};Object.defineProperty(ds,"__esModule",{value:!0});ds.useStores=void 0;const sc=jt;function rc(...e){return t=>class extends t{constructor(...i){super(...i),new sc.MultiStoreController(this,e)}}}ds.useStores=rc;var us={};Object.defineProperty(us,"__esModule",{value:!0});us.withStores=void 0;const ac=jt,oc=(e,t)=>class extends e{constructor(...s){super(...s),new ac.MultiStoreController(this,t)}};us.withStores=oc;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=cs;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var i=jt;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return i.MultiStoreController}});var s=ds;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return s.useStores}});var r=us;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return r.withStores}})})(J);const nc=Symbol("board"),lc={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let Ae=[],lt=0;const $i=4;let Di=0;const fe=e=>{let t=[],i={get(){return i.lc||i.listen(()=>{})(),i.value},lc:0,listen(s){return i.lc=t.push(s),()=>{for(let a=lt+$i;a<Ae.length;)Ae[a]===s?Ae.splice(a,$i):a+=$i;let r=t.indexOf(s);~r&&(t.splice(r,1),--i.lc||i.off())}},notify(s,r){Di++;let a=!Ae.length;for(let o of t)Ae.push(o,i.value,s,r);if(a){for(lt=0;lt<Ae.length;lt+=$i)Ae[lt](Ae[lt+1],Ae[lt+2],Ae[lt+3]);Ae.length=0}},off(){},set(s){let r=i.value;r!==s&&(i.value=s,i.notify(r))},subscribe(s){let r=i.listen(s);return s(i.value),r},value:e};return i},cc=5,Ti=6,Si=10;let dc=(e,t,i,s)=>(e.events=e.events||{},e.events[i+Si]||(e.events[i+Si]=s(r=>{e.events[i].reduceRight((a,o)=>(o(a),a),{shared:{},...r})})),e.events[i]=e.events[i]||[],e.events[i].push(t),()=>{let r=e.events[i],a=r.indexOf(t);r.splice(a,1),r.length||(delete e.events[i],e.events[i+Si](),delete e.events[i+Si])}),uc=1e3,hc=(e,t)=>dc(e,s=>{let r=t(s);r&&e.events[Ti].push(r)},cc,s=>{let r=e.listen;e.listen=(...o)=>(!e.lc&&!e.active&&(e.active=!0,s()),r(...o));let a=e.off;return e.events[Ti]=[],e.off=()=>{a(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let o of e.events[Ti])o();e.events[Ti]=[]}},uc)},()=>{e.listen=r,e.off=a}}),pc=(e,t,i)=>{Array.isArray(e)||(e=[e]);let s,r,a=()=>{if(r===Di)return;r=Di;let c=e.map(p=>p.get());if(!s||c.some((p,f)=>p!==s[f])){s=c;let p=t(...c);p&&p.then&&p.t?p.then(f=>{s===c&&o.set(f)}):(o.set(p),r=Di)}},o=fe(void 0),n=o.get;o.get=()=>(a(),n());let u=a;return hc(o,()=>{let c=e.map(p=>p.listen(u));return a(),()=>{for(let p of c)p()}}),o};const vt=(e,t)=>pc(e,t),mc=(e={})=>{let t=fe(e);return t.setKey=function(i,s){let r=t.value;typeof s>"u"&&i in t.value?(t.value={...t.value},delete t.value[i],t.notify(r,i)):t.value[i]!==s&&(t.value={...t.value,[i]:s},t.notify(r,i))},t},Pe=fe(!1),ni=fe(null),bi=fe(!0),fc=fe(!1),bc=vt([Pe,bi],(e,t)=>e&&!t);function Ts(e){ni.set(e),Pe.set(!0)}function gc(){Pe.set(!1),ni.set(null),bi.set(!0)}function vc(e){bi.set(e)}function Yr(e){fc.set(e)}class Ba extends Error{constructor(t,i,s){super(t),this.status=i,this.body=s,this.name="ApiError"}}function li(e){if(!e)return[];const t=[],i=e.split(`
`);for(const s of i){const r=s.trim();if(!r)continue;const a={text:r};if(r.length>=18&&r[4]==="-"&&r[7]==="-"&&r[10]===" "&&r[13]===":"){const o=r.indexOf(" - ",16);if(o!==-1){a.timestamp=r.slice(0,16);let n=r.slice(o+3);if(n.startsWith("(from: ")){const u=n.indexOf(") ");u!==-1?(a.author=n.slice(7,u),a.text=n.slice(u+2)):a.text=n}else a.text=n}}t.push(a)}return t}async function yc(e,t){const i=e.startsWith("/")?"./"+e.slice(1):e,s=await fetch(i,t);if(!s.ok){const r=await s.text();throw new Ba(`API request failed: ${s.status} ${s.statusText}`,s.status,r)}return s.json()}async function wc(){return yc("/api/roadmap")}const Se=mc({}),ji=fe(null),Ha=fe(""),gi=fe(!0),hs=fe(null),kc=vt(Se,e=>Object.values(e)),xc=vt(Se,e=>{const t=Date.now()-432e5;return Object.values(e).filter(i=>i.type!=="epic"?!1:i.status!=="closed"?!0:i.closed_at?new Date(i.closed_at).getTime()>t:!1).map(i=>({id:i.id,title:i.title}))}),ps=vt([Se,ji],(e,t)=>t&&e[t]||null),_c=vt(ps,e=>e?li(e.notes):[]),Cc=vt([Se,ps],(e,t)=>{var i;return(i=t==null?void 0:t.blocked_by)!=null&&i.length?t.blocked_by.map(s=>{const r=e[s];return r?{id:r.id,title:r.title,status:r.status}:null}).filter(s=>s!==null):[]}),$c=vt([Se,ps],(e,t)=>{if(!(t!=null&&t.parent))return"";const i=e[t.parent];return(i==null?void 0:i.title)||""});function Tc(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(i=>{const s=t[i];return s?s.status!=="closed":!1})}function Ui(e,t={}){const i=Tc(e,t);let s;return e.status==="closed"?s="done":i?s="blocked":e.awaiting?s="human":e.status==="in_progress"?s="agent":s="ready",{...e,is_blocked:i,column:s}}function Sc(e){const t={};for(const s of e)t[s.id]=s;const i={};for(const s of e)i[s.id]=Ui(s,t);Se.set(i),gi.set(!1),hs.set(null)}function Ec(e){const t={};for(const[s,r]of e)t[s]=r;const i={};for(const[s,r]of e)i[s]=Ui(r,t);Se.set(i),gi.set(!1),hs.set(null)}function At(e){var o;const t=Se.get(),i={};for(const[n,u]of Object.entries(t))i[n]=u;i[e.id]=e;const s=Ui(e,i),r={...t};r[e.id]=s;const a=t[e.id];if((a==null?void 0:a.status)!==e.status)for(const[n,u]of Object.entries(t))n!==e.id&&(o=u.blocked_by)!=null&&o.includes(e.id)&&(r[n]=Ui(u,i));Se.set(r)}function zc(e){const t=Se.get(),{[e]:i,...s}=t;Se.set(s),ji.get()===e&&ji.set(null)}function dt(e){ji.set(e)}function ja(e){Ha.set(e)}function Vi(e){gi.set(e)}function ci(e){hs.set(e),gi.set(!1)}function Rc(e,t,i,s){if(e.status!=="closed"&&(e.awaiting||e.manual))return"gated";if(e.status==="closed")return"done";if(e.status==="open")for(const r of t){const a=i.get(r);if(a&&a.status!=="closed")return"queued"}return e.status==="in_progress"||s>0?"active":"ready"}function Ac(e){const t=new Set,i=new Map;for(const f of e)f.type==="epic"&&(t.add(f.id),i.set(f.id,f));if(t.size===0)return{waves:null};const s=new Map,r=new Map;for(const f of e)f.parent&&t.has(f.parent)&&(s.set(f.parent,(s.get(f.parent)??0)+1),f.status==="closed"&&r.set(f.parent,(r.get(f.parent)??0)+1));const a=new Map;for(const[f,b]of i){const m=(b.blocked_by??[]).filter(g=>t.has(g));a.set(f,m)}const o=new Map,n=new Map;for(const f of i.keys())o.set(f,0);for(const[f,b]of a)for(const m of b){o.set(f,(o.get(f)??0)+1);const g=n.get(m)??[];g.push(f),n.set(m,g)}const u=[...i.keys()].sort(),c=new Set(u),p=[];for(;c.size>0;){const f=[];for(const m of u)c.has(m)&&o.get(m)===0&&f.push(m);if(f.length===0){const g=u.filter(y=>c.has(y)).map(y=>Kr(i.get(y),a.get(y)??[],i,s.get(y)??0,r.get(y)??0));p.push(g);break}const b=f.map(m=>Kr(i.get(m),a.get(m)??[],i,s.get(m)??0,r.get(m)??0));p.push(b);for(const m of f){c.delete(m);for(const g of n.get(m)??[])c.has(g)&&o.set(g,(o.get(g)??0)-1)}}return{waves:p}}function Kr(e,t,i,s,r){const a=Rc(e,t,i,s);return{id:e.id,title:e.title,status:a,awaiting_type:a==="gated"?e.awaiting??"work":void 0,blocked_by:t.length>0?[...t]:void 0,children_total:s,children_closed:r}}const Ua=fe(null),Bs=fe(!1),Hs=fe(null);async function Va(){Bs.set(!0),Hs.set(null);try{let e;if(Pe.get()){const t=Se.get();e=Ac(Object.values(t))}else e=await wc();Ua.set(e)}catch(e){Hs.set(e instanceof Error?e.message:String(e))}finally{Bs.set(!1)}}typeof window<"u"&&window.addEventListener("tick-update-for-roadmap",()=>{Va().catch(()=>{})});class Oc extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class _t extends Error{constructor(t){super(t),this.name="ConnectionError"}}const Ic="",Gr=1e3,Dc=3e4;class Mc{constructor(t=Ic){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.runEventSources=new Map,this.reconnectDelay=Gr,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,i)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=Gr,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",s=>{this.handleUpdateEvent(s)}),this.eventSource.onerror=()=>{var r;console.log("[LocalComms] SSE connection error");const s=this.connected;this.connected=!1,s&&this.emitConnection({type:"connection:disconnected"}),(r=this.eventSource)==null||r.close(),this.eventSource=null,this.scheduleReconnect(),s||i(new _t("Failed to connect to SSE endpoint"))}}catch(s){i(new _t(`Failed to create EventSource: ${s}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE();for(const[t,i]of this.runEventSources)i.close(),console.log(`[LocalComms] Closed run stream for epic ${t}`);this.runEventSources.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,Dc)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){if(this.runEventSources.has(t))return console.log(`[LocalComms] Already subscribed to run stream for ${t}`),()=>this.unsubscribeRun(t);const i=new EventSource(`${this.baseUrl}/api/run-stream/${t}`);return this.runEventSources.set(t,i),i.addEventListener("connected",()=>{console.log(`[LocalComms] Run stream connected for ${t}`),this.emitConnection({type:"connection:connected",epicId:t})}),i.addEventListener("task-started",s=>{this.handleRunEvent(t,"task-started",s)}),i.addEventListener("task-update",s=>{this.handleRunEvent(t,"task-update",s)}),i.addEventListener("tool-activity",s=>{this.handleRunEvent(t,"tool-activity",s)}),i.addEventListener("task-completed",s=>{this.handleRunEvent(t,"task-completed",s)}),i.addEventListener("epic-started",s=>{this.handleRunEvent(t,"epic-started",s)}),i.addEventListener("epic-completed",s=>{this.handleRunEvent(t,"epic-completed",s)}),i.addEventListener("task-awaiting",s=>{this.handleRunEvent(t,"task-awaiting",s)}),i.addEventListener("context-generating",s=>{this.handleContextEvent(t,"context:generating",s)}),i.addEventListener("context-generated",s=>{this.handleContextEvent(t,"context:generated",s)}),i.addEventListener("context-loaded",s=>{this.handleContextEvent(t,"context:loaded",s)}),i.addEventListener("context-failed",s=>{this.handleContextEvent(t,"context:failed",s)}),i.addEventListener("context-skipped",s=>{this.handleContextEvent(t,"context:skipped",s)}),i.onerror=()=>{console.log(`[LocalComms] Run stream error for ${t}`),i.close(),this.runEventSources.delete(t)},()=>this.unsubscribeRun(t)}unsubscribeRun(t){const i=this.runEventSources.get(t);i&&(i.close(),this.runEventSources.delete(t),console.log(`[LocalComms] Unsubscribed from run stream for ${t}`))}async createTick(t){const i=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!i.ok)throw new Error(`Failed to create tick: ${i.statusText}`);return i.json()}async updateTick(t,i){const s=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!s.ok)throw new Error(`Failed to update tick: ${s.statusText}`);return s.json()}async deleteTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!i.ok)throw new Error(`Failed to delete tick: ${i.statusText}`)}async addNote(t,i){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:i})});if(!s.ok)throw new Error(`Failed to add note: ${s.statusText}`);return s.json()}async approveTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!i.ok)throw new Error(`Failed to approve tick: ${i.statusText}`);return i.json()}async rejectTick(t,i){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!s.ok)throw new Error(`Failed to reject tick: ${s.statusText}`);return s.json()}async closeTick(t,i){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!s.ok)throw new Error(`Failed to close tick: ${s.statusText}`);return s.json()}async reopenTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!i.ok)throw new Error(`Failed to reopen tick: ${i.statusText}`);return i.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(s=>({...s,is_blocked:s.isBlocked,verification_status:s.verificationStatus}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`Failed to fetch tick: ${i.statusText}`);return i.json()}async fetchActivity(t){const i=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,s=await fetch(i);if(!s.ok)throw new Error(`Failed to fetch activity: ${s.statusText}`);return(await s.json()).activities}async fetchRecord(t){const i=await fetch(`${this.baseUrl}/api/records/${t}`);if(i.status===404)return null;if(!i.ok)throw new Error(`Failed to fetch record: ${i.statusText}`);return i.json()}async fetchRunStatus(t){const i=await fetch(`${this.baseUrl}/api/run-status/${t}`);if(!i.ok)throw new Error(`Failed to fetch run status: ${i.statusText}`);return i.json()}async fetchContext(t){const i=await fetch(`${this.baseUrl}/api/context/${t}`);if(i.status===404)return null;if(!i.ok)throw new Error(`Failed to fetch context: ${i.statusText}`);return i.text()}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const i=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",i),i.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:s,tickId:r}=i;if(!r){console.warn("[LocalComms] Update event missing tickId:",i);return}s==="create"||s==="update"?this.fetchAndEmitTick(r):s==="delete"&&this.emitTick({type:"tick:deleted",tickId:r})}catch(i){console.error("[LocalComms] Failed to parse update event:",i)}}async fetchAndEmitTick(t){try{const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`HTTP ${i.status}`);const s=await i.json();this.emitTick({type:"tick:updated",tick:s})}catch(i){console.error(`[LocalComms] Failed to fetch tick ${t}:`,i),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${i}`})}}handleRunEvent(t,i,s){try{const r=JSON.parse(s.data),a=new Date().toISOString();let o;switch(i){case"task-started":o={type:"run:task-started",taskId:r.taskId,epicId:t,status:r.status||"running",numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:a};break;case"task-update":o={type:"run:task-update",taskId:r.taskId,epicId:t,output:r.output,status:r.status,numTurns:r.numTurns,metrics:this.normalizeMetrics(r.metrics),activeTool:r.activeTool?this.normalizeToolInfo(r.activeTool):void 0,timestamp:a};break;case"task-completed":o={type:"run:task-completed",taskId:r.taskId,epicId:t,success:r.success??!0,numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:a};break;case"tool-activity":o={type:"run:tool-activity",taskId:r.taskId,epicId:t,tool:this.normalizeToolInfo(r.tool||r.activeTool),timestamp:a};break;case"epic-started":o={type:"run:epic-started",epicId:t,status:r.status||"running",message:r.message,timestamp:a};break;case"epic-completed":o={type:"run:epic-completed",epicId:t,success:r.success??!0,timestamp:a};break;case"task-awaiting":o={type:"run:task-awaiting",taskId:r.taskId,epicId:t,awaitingType:r.status||"work",reason:r.message,timestamp:a};break;default:console.warn(`[LocalComms] Unknown run event type: ${i}`);return}this.emitRun(o)}catch(r){console.error(`[LocalComms] Failed to parse run event ${i}:`,r)}}handleContextEvent(t,i,s){try{const r=JSON.parse(s.data);let a;switch(i){case"context:generating":a={type:"context:generating",epicId:t,taskCount:r.taskCount||0};break;case"context:generated":a={type:"context:generated",epicId:t,tokenCount:r.tokenCount||0};break;case"context:loaded":a={type:"context:loaded",epicId:t};break;case"context:failed":a={type:"context:failed",epicId:t,message:r.message||"Context generation failed"};break;case"context:skipped":a={type:"context:skipped",epicId:t,reason:r.reason||"Unknown reason"};break;default:return}this.emitContext(a)}catch(r){console.error(`[LocalComms] Failed to parse context event ${i}:`,r)}}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(s){console.error("[LocalComms] Error in tick handler:",s)}}emitRun(t){for(const i of this.runHandlers)try{i(t)}catch(s){console.error("[LocalComms] Error in run handler:",s)}}emitContext(t){for(const i of this.contextHandlers)try{i(t)}catch(s){console.error("[LocalComms] Error in context handler:",s)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(s){console.error("[LocalComms] Error in connection handler:",s)}}normalizeMetrics(t){if(t)return{inputTokens:t.input_tokens||t.inputTokens||0,outputTokens:t.output_tokens||t.outputTokens||0,cacheReadTokens:t.cache_read_tokens||t.cacheReadTokens||0,cacheCreationTokens:t.cache_creation_tokens||t.cacheCreationTokens||0,costUsd:t.cost_usd||t.costUsd||0,durationMs:t.duration_ms||t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,output:t.output,durationMs:t.duration_ms||t.duration||t.durationMs,isError:t.is_error||t.isError}:{name:"Unknown"}}}const Pc=10,Lc=1e3,Fc=3e4;class Nc{constructor(t){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.runSubscriptions=new Set,this.tickCache=new Map,this.runStates=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,i)=>{try{const s=window.location.protocol==="https:"?"wss:":"ws:",r=window.location.host,a=localStorage.getItem("token")||"",o=`${s}//${r}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",o);const n=["ticks-v1",`token-${encodeURIComponent(a)}`];this.ws=new WebSocket(o,n);let u=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,u||(u=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=c=>{this.handleMessage(c)},this.ws.onclose=c=>{console.log("[CloudComms] WebSocket closed:",c.code,c.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),u||(u=!0,i(new _t(`WebSocket closed: ${c.code} ${c.reason}`)))},this.ws.onerror=c=>{console.error("[CloudComms] WebSocket error:",c),u||(u=!0,i(new _t("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(s){i(new _t(`Failed to create WebSocket: ${s}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.runSubscriptions.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=Pc){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min(Lc*Math.pow(2,this.reconnectAttempts),Fc);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(i=>{console.error("[CloudComms] Reconnect failed:",i)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){return this.runSubscriptions.add(t),console.log(`[CloudComms] Subscribed to run events for ${t}`),()=>{this.runSubscriptions.delete(t),console.log(`[CloudComms] Unsubscribed from run events for ${t}`)}}async createTick(t){this.checkWritable();const i={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,awaiting:t.awaiting,owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async updateTick(t,i){this.checkWritable();const s={id:t,title:i.title||"",description:i.description||"",status:i.status||"open",priority:i.priority??2,labels:i.labels,blocked_by:i.blocked_by,type:"task",owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:s}),s}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,i){return this.checkWritable(),this.tickOperation(t,"note",{message:i})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,i){return this.checkWritable(),this.tickOperation(t,"reject",{reason:i})}async closeTick(t,i){return this.checkWritable(),this.tickOperation(t,"close",{reason:i})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const i of this.tickCache.values()){const s=(i.blocked_by||[]).some(a=>{const o=this.tickCache.get(a);return o?o.status!=="closed":!1});let r="ready";i.status==="closed"?r="done":s?r="blocked":i.awaiting?r="human":i.status==="in_progress"&&(r="agent"),t.push({...i,is_blocked:s,column:r})}return t}async fetchInfo(){const t=[];for(const i of this.tickCache.values())i.type==="epic"&&t.push({id:i.id,title:i.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const i=this.tickCache.get(t);if(!i)throw new Error(`Tick not found: ${t}`);const s=[];if(i.blocked_by&&i.blocked_by.length>0)for(const o of i.blocked_by){const n=this.tickCache.get(o);n?s.push({id:n.id,title:n.title,status:n.status}):s.push({id:o,title:`Tick ${o}`,status:"unknown"})}const r=s.some(o=>o.status!=="closed"&&o.status!=="unknown");let a="ready";return i.status==="closed"?a="done":r?a="blocked":i.awaiting?a="human":i.status==="in_progress"&&(a="agent"),{...i,isBlocked:r,column:a,notesList:li(i.notes),blockerDetails:s}}async fetchActivity(t){return[]}async fetchRecord(t){return null}async fetchRunStatus(t){var s,r;const i=this.runStates.get(t);return i?{epicId:t,isRunning:i.isRunning,activeTask:i.activeTaskId?{tickId:i.activeTaskId,title:((s=this.tickCache.get(i.activeTaskId))==null?void 0:s.title)||i.activeTaskId,status:"running",numTurns:0,metrics:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:((r=i.lastEvent)==null?void 0:r.timestamp)||new Date().toISOString()}:void 0}:{epicId:t,isRunning:!1}}async fetchContext(t){return null}handleMessage(t){try{const i=JSON.parse(t.data);switch(i.type){case"state_full":this.handleStateFullMessage(i);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(i);break;case"tick_deleted":this.handleTickDeleteMessage(i);break;case"connected":console.log("[CloudComms] Connection confirmed:",i.connectionId);break;case"error":console.error("[CloudComms] Server error:",i.message),this.emitConnection({type:"connection:error",message:i.message});break;case"local_status":this.handleLocalStatusMessage(i);break;case"run_event":this.handleRunEventMessage(i);break;default:console.warn("[CloudComms] Unknown message type:",i.type)}}catch(i){console.error("[CloudComms] Failed to parse message:",i)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[s,r]of Object.entries(t.ticks))this.tickCache.set(s,r);const i=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:i})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}handleRunEventMessage(t){const{epicId:i,taskId:s,event:r}=t;if(console.log(`[CloudComms] Received run_event: epic=${i} type=${r.type} subscriptions=${[...this.runSubscriptions].join(",")}`),!this.runSubscriptions.has(i)&&this.runSubscriptions.size>0){console.log(`[CloudComms] Skipping run_event - not subscribed to ${i}`);return}const a=r.timestamp||new Date().toISOString();let o;switch(r.type){case"task-started":o={type:"run:task-started",taskId:s||"",epicId:i,status:r.status||"running",numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:a},this.runStates.set(i,{isRunning:!0,activeTaskId:s,lastEvent:o});break;case"task-update":o={type:"run:task-update",taskId:s||"",epicId:i,output:r.output,status:r.status,numTurns:r.numTurns,metrics:this.normalizeMetrics(r.metrics),activeTool:r.activeTool?this.normalizeToolInfo(r.activeTool):void 0,timestamp:a};const n=this.runStates.get(i);n&&(n.lastEvent=o);break;case"task-completed":o={type:"run:task-completed",taskId:s||"",epicId:i,success:r.success??!0,numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:a};const u=this.runStates.get(i);u&&(u.activeTaskId=void 0,u.lastEvent=o);break;case"tool-activity":o={type:"run:tool-activity",taskId:s||"",epicId:i,tool:r.activeTool?this.normalizeToolInfo(r.activeTool):{name:"Unknown"},timestamp:a};break;case"epic-started":o={type:"run:epic-started",epicId:i,status:r.status||"running",message:r.message,timestamp:a},this.runStates.set(i,{isRunning:!0,lastEvent:o});break;case"epic-completed":o={type:"run:epic-completed",epicId:i,success:r.success??!0,timestamp:a},this.runStates.set(i,{isRunning:!1,lastEvent:o});break;case"context-generating":{const c={type:"context:generating",epicId:i,taskCount:r.taskCount||0};this.emitContext(c);return}case"context-generated":{const c={type:"context:generated",epicId:i,tokenCount:r.tokenCount||0};this.emitContext(c);return}case"context-loaded":{const c={type:"context:loaded",epicId:i};this.emitContext(c);return}case"context-failed":{const c={type:"context:failed",epicId:i,error:r.message||"Context generation failed"};this.emitContext(c);return}case"context-skipped":{const c={type:"context:skipped",epicId:i,reason:r.message||"Context generation skipped"};this.emitContext(c);return}default:console.warn("[CloudComms] Unknown run event type:",r.type);return}this.emitRun(o)}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(s){console.error("[CloudComms] Error in tick handler:",s)}}emitRun(t){for(const i of this.runHandlers)try{i(t)}catch(s){console.error("[CloudComms] Error in run handler:",s)}}emitContext(t){for(const i of this.contextHandlers)try{i(t)}catch(s){console.error("[CloudComms] Error in context handler:",s)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(s){console.error("[CloudComms] Error in connection handler:",s)}}checkWritable(){if(!this.connected)throw new _t("Not connected to server");if(!this.localAgentConnected)throw new Oc("Cannot write: local agent is offline")}sendMessage(t){var i;if(((i=this.ws)==null?void 0:i.readyState)!==WebSocket.OPEN)throw new _t("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,i,s){const r=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${i}`,a=localStorage.getItem("token")||"",o=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",...a?{Authorization:`Bearer ${a}`}:{}},body:s?JSON.stringify(s):void 0});if(!o.ok){const n=await o.json().catch(()=>({error:o.statusText}));throw new Error(n.error||`Failed to ${i} tick`)}return o.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let i="";for(let s=0;s<3;s++)i+=t.charAt(Math.floor(Math.random()*t.length));return i}normalizeMetrics(t){if(t)return{inputTokens:t.inputTokens||0,outputTokens:t.outputTokens||0,cacheReadTokens:t.cacheReadTokens||0,cacheCreationTokens:t.cacheCreationTokens||0,costUsd:t.costUsd||0,durationMs:t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,durationMs:t.duration}:{name:"Unknown"}}}const mt=fe(null),et=fe("disconnected"),Wa=vt([et,Pe,bi],(e,t,i)=>!t||e!=="connected"?e:i?"connected":"disconnected"),js=new Set;function nr(e){return js.add(e),()=>js.delete(e)}function Bc(e){for(const t of js)try{t(e)}catch(i){console.error("[CommsStore] Error in run event listener:",i)}}const Us=new Set;function qa(e){return Us.add(e),()=>Us.delete(e)}function Hc(e){for(const t of Us)try{t(e)}catch(i){console.error("[CommsStore] Error in context event listener:",i)}}function Ya(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),At(e.tick),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),zc(e.tickId),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),Ec(e.ticks),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function Ka(e){Bc(e)}function Ga(e){Hc(e)}function Xa(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),et.set("connected"),Yr(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),et.set("disconnected"),Yr(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),vc(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),ci(e.message);break}}let Xr=!1,Ve=[];async function lr(){cr(),console.log("[CommsStore] Initializing local mode"),et.set("connecting"),Vi(!0);const e=new Mc;Ve.push(e.onTick(Ya)),Ve.push(e.onRun(Ka)),Ve.push(e.onContext(Ga)),Ve.push(e.onConnection(Xa)),mt.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),ci(`Connection failed: ${t}`)}}async function Wi(e){cr(),console.log("[CommsStore] Initializing cloud mode for project:",e),et.set("connecting"),Vi(!0);const t=new Nc(e);Ve.push(t.onTick(Ya)),Ve.push(t.onRun(Ka)),Ve.push(t.onContext(Ga)),Ve.push(t.onConnection(Xa)),mt.set(t),ja(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(i){console.error("[CommsStore] Failed to connect:",i),ci(`Connection failed: ${i}`)}}async function jc(){const e=Pe.get(),t=ni.get();e&&t?await Wi(t):await lr()}function Uc(){cr(),et.set("disconnected")}function cr(){for(const t of Ve)t();Ve=[];const e=mt.get();e&&(e.disconnect(),mt.set(null))}function dr(e){const t=mt.get();return t?t.subscribeRun(e):(console.warn("[CommsStore] Cannot subscribe to run: no client"),()=>{})}function ce(){const e=mt.get();if(!e)throw new Error("CommsClient not initialized");return e}async function Qa(e){return ce().createTick(e)}async function Vc(e,t){return ce().updateTick(e,t)}async function Wc(e){return ce().deleteTick(e)}async function Za(e,t){return ce().addNote(e,t)}async function Ja(e){return ce().approveTick(e)}async function eo(e,t){return ce().rejectTick(e,t)}async function to(e,t){return ce().closeTick(e,t)}async function io(e){return ce().reopenTick(e)}async function so(){return ce().fetchTicks()}async function ro(){return ce().fetchInfo()}async function ur(e){return ce().fetchTick(e)}async function hr(e){return ce().fetchActivity(e)}async function pr(e){return ce().fetchRecord(e)}async function ao(e){return ce().fetchRunStatus(e)}async function oo(e){return ce().fetchContext(e)}function no(){if(Xr){console.log("[CommsStore] Already initialized, skipping");return}Xr=!0,console.log("[CommsStore] Setting up auto-connect"),Pe.subscribe(e=>{const t=ni.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?Wi(t):e||lr()}),ni.subscribe(e=>{const t=Pe.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!mt.get()&&Wi(e)})}const Qr=Object.freeze(Object.defineProperty({__proto__:null,$commsClient:mt,$connectionStatus:et,$effectiveConnectionStatus:Wa,addNote:Za,approveTick:Ja,closeTick:to,createTick:Qa,deleteTick:Wc,disconnectComms:Uc,fetchActivity:hr,fetchContext:oo,fetchInfo:ro,fetchRecord:pr,fetchRunStatus:ao,fetchTickDetails:ur,fetchTicks:so,getCommsClient:ce,initCloudComms:Wi,initComms:jc,initCommsAutoConnect:no,initLocalComms:lr,onContextEvent:qa,onRunEvent:nr,rejectTick:eo,reopenTick:io,subscribeRun:dr,updateTickViaComms:Vc},Symbol.toStringTag,{value:"Module"}));var qc=Object.defineProperty,Yc=Object.getOwnPropertyDescriptor,ms=(e,t,i,s)=>{for(var r=s>1?void 0:s?Yc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&qc(t,i,r),r};const Kc={done:"var(--green, #a6e3a1)",active:"var(--blue, #89b4fa)",ready:"var(--yellow, #f9e2af)",queued:"var(--surface2, #585b70)",gated:"var(--peach, #fab387)"},Gc={done:"Done",active:"Active",ready:"Needs planning",queued:"Queued",gated:"Gated"};let Pt=class extends oe{constructor(){super(...arguments),this.roadmap=null,this.loading=!1,this.error=null}_close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){dt(e),this._close()}_pct(e){return e.children_total===0?0:Math.round(e.children_closed/e.children_total*100)}_renderEpicCard(e){const t=Kc[e.status]??"var(--surface2)",i=this._pct(e);return d`
      <div
        class="epic-card"
        style="--accent-color: ${t}"
        @click=${()=>this._handleEpicClick(e.id)}
        role="button"
        tabindex="0"
        @keydown=${s=>{(s.key==="Enter"||s.key===" ")&&this._handleEpicClick(e.id)}}
        aria-label="Open epic ${e.id}: ${e.title}"
      >
        <div class="status-dot"></div>

        <div class="epic-info">
          <div class="epic-top">
            <span class="epic-id">${e.id}</span>
            <span class="epic-title">${e.title}</span>
          </div>

          <div class="badges">
            <span class="badge badge-status">${Gc[e.status]}</span>

            ${e.awaiting_type?d`<span class="badge badge-awaiting">⏳ ${e.awaiting_type}</span>`:v}

            ${e.blocked_by&&e.blocked_by.length>0?e.blocked_by.map(s=>d`
                  <span class="badge badge-blocked">⊘ ${s}</span>
                `):v}
          </div>
        </div>

        <div class="progress-chip">
          <span class="progress-text">${e.children_closed}/${e.children_total}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${i}%"></div>
          </div>
        </div>
      </div>
    `}_renderWave(e,t){return d`
      <div class="wave-group">
        <div class="wave-label">Wave ${t+1}</div>
        ${e.map(i=>this._renderEpicCard(i))}
      </div>
    `}_renderBody(){var t;if(this.loading)return d`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;if(this.error)return d`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;const e=((t=this.roadmap)==null?void 0:t.waves)??null;return!e||e.length===0?d`<div class="state-box">No epics found — roadmap is empty.</div>`:d`
      <div class="body">
        ${e.map((i,s)=>this._renderWave(i,s))}
      </div>
    `}render(){return d`
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
    `}};Pt.styles=$`
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
  `;ms([h({attribute:!1})],Pt.prototype,"roadmap",2);ms([h({type:Boolean})],Pt.prototype,"loading",2);ms([h({attribute:!1})],Pt.prototype,"error",2);Pt=ms([me("roadmap-view")],Pt);var Xc=Object.defineProperty,Qc=Object.getOwnPropertyDescriptor,K=(e,t,i,s)=>{for(var r=s>1?void 0:s?Qc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Xc(t,i,r),r};console.log("[TickBoard] Initializing comms module");no();const Ss=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Ue=["blocked","ready","agent","human","done"];let V=class extends oe{constructor(){super(...arguments),this.boardState={...lc},this.ticksController=new J.StoreController(this,kc),this.epicsController=new J.StoreController(this,xc),this.repoNameController=new J.StoreController(this,Ha),this.selectedTickController=new J.StoreController(this,ps),this.selectedTickNotesController=new J.StoreController(this,_c),this.selectedTickBlockersController=new J.StoreController(this,Cc),this.selectedTickParentTitleController=new J.StoreController(this,$c),this.loadingController=new J.StoreController(this,gi),this.errorController=new J.StoreController(this,hs),this.isCloudModeController=new J.StoreController(this,Pe),this.localClientConnectedController=new J.StoreController(this,bi),this.isReadOnlyController=new J.StoreController(this,bc),this.connectionStatusController=new J.StoreController(this,Wa),this.roadmapController=new J.StoreController(this,Ua),this.roadmapLoadingController=new J.StoreController(this,Bs),this.roadmapErrorController=new J.StoreController(this,Hs),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showDashboard=!1,this.dashboardActivities=[],this.showRoadmap=!1,this.showRunPanel=!1,this.runStatus=null,this.runPanelEpicId=null,this.runStreamConnected=!1,this.activeToolInfo=null,this.runMetrics=null,this.awaitingTasks=[],this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.runStreamUnsubscribe=null,this.runEventUnsubscribe=null,this.runPollInterval=null,this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused())&&!(this.showDashboard&&e.key!=="Escape"&&e.key!=="d"&&e.key!=="m"&&e.key!=="?")&&!(this.showRoadmap&&e.key!=="Escape"&&e.key!=="m"&&e.key!=="?"))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"r":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRunPanel());break;case"d":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleDashboard());break;case"m":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRoadmap());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}get roadmapData(){return this.roadmapController.value}get roadmapLoading(){return this.roadmapLoadingController.value}get roadmapError(){return this.roadmapErrorController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.runEventUnsubscribe=nr(e=>this.handleRunEvent(e)),this.isCloudMode||(this.loadData(),this.startRunStatusPolling())}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const i=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",i),Ts(i);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),Ts(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const i=new URLSearchParams(window.location.search).get("project");if(i){console.log("[TickBoard] Cloud mode from query param, project:",i),Ts(i);return}}console.log("[TickBoard] Local mode"),gc()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),Vi(!0);return}Vi(!0),ci(null);try{const[e,t]=await Promise.all([so(),ro()]);Sc(e),ja(t.repoName),this.updateBoardState()}catch(e){ci(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){var e;super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown),(e=this.runEventUnsubscribe)==null||e.call(this),this.runEventUnsubscribe=null,this.unsubscribeRunStream(),this.stopRunStatusPolling()}startRunStatusPolling(){this.runPollInterval=setInterval(()=>{this.checkForActiveRuns()},5e3),this.checkForActiveRuns()}stopRunStatusPolling(){this.runPollInterval&&(clearInterval(this.runPollInterval),this.runPollInterval=null)}async checkForActiveRuns(){var e,t,i;if(this.epics.length!==0){for(const s of this.epics)try{const r=await ao(s.id);if(r.isRunning){this.runStatus=r,this.runPanelEpicId!==s.id&&(this.runPanelEpicId=s.id,this.subscribeToRunStream(s.id)),(e=r.activeTask)!=null&&e.metrics&&(this.runMetrics=this.convertApiMetrics(r.activeTask.metrics)),(t=r.activeTask)!=null&&t.activeTool&&(this.activeToolInfo={name:r.activeTask.activeTool.name,input:r.activeTask.activeTool.input,output:r.activeTask.activeTool.output,durationMs:r.activeTask.activeTool.duration_ms,isError:r.activeTask.activeTool.is_error,isComplete:!1}),r.awaitingTasks&&(this.awaitingTasks=r.awaitingTasks);return}}catch{}(i=this.runStatus)!=null&&i.isRunning&&(this.runStatus={...this.runStatus,isRunning:!1})}}convertApiMetrics(e){return{inputTokens:e.input_tokens,outputTokens:e.output_tokens,cacheReadTokens:e.cache_read_tokens,cacheCreationTokens:e.cache_creation_tokens,costUsd:e.cost_usd,durationMs:e.duration_ms}}subscribeToRunStream(e){this.unsubscribeRunStream(),console.log("[RunStream] Subscribing to epic:",e),this.runStreamUnsubscribe=dr(e),this.runStreamConnected=!0}unsubscribeRunStream(){this.runStreamUnsubscribe&&(this.runStreamUnsubscribe(),this.runStreamUnsubscribe=null),this.runStreamConnected=!1}handleRunEvent(e){var i,s;const t=e.epicId;if(!(this.runPanelEpicId&&t!==this.runPanelEpicId))switch(e.type){case"run:task-started":this.runStatus={epicId:t,isRunning:!0,activeTask:{tickId:e.taskId,title:"",status:"running",numTurns:e.numTurns||0,metrics:e.metrics?{input_tokens:e.metrics.inputTokens,output_tokens:e.metrics.outputTokens,cache_read_tokens:e.metrics.cacheReadTokens,cache_creation_tokens:e.metrics.cacheCreationTokens,cost_usd:e.metrics.costUsd,duration_ms:e.metrics.durationMs}:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:e.timestamp}},this.activeToolInfo=null;break;case"run:task-update":e.metrics&&(this.runMetrics={inputTokens:e.metrics.inputTokens,outputTokens:e.metrics.outputTokens,cacheReadTokens:e.metrics.cacheReadTokens,cacheCreationTokens:e.metrics.cacheCreationTokens,costUsd:e.metrics.costUsd,durationMs:e.metrics.durationMs}),e.activeTool&&(this.activeToolInfo={name:e.activeTool.name,input:e.activeTool.input,output:e.activeTool.output,durationMs:e.activeTool.durationMs,isComplete:!1}),(i=this.runStatus)!=null&&i.activeTask&&(this.runStatus={...this.runStatus,activeTask:{...this.runStatus.activeTask,numTurns:e.numTurns??this.runStatus.activeTask.numTurns,lastUpdated:e.timestamp}});break;case"run:tool-activity":this.activeToolInfo={name:e.tool.name,input:e.tool.input,output:e.tool.output,durationMs:e.tool.durationMs,isComplete:!1};break;case"run:task-completed":console.log("[RunStream] Task completed:",e.taskId),this.activeToolInfo=null,this.runStatus&&(this.runStatus={...this.runStatus,isRunning:!1,activeTask:void 0});break;case"run:epic-started":console.log("[RunStream] Epic started:",t),this.runStatus={epicId:t,isRunning:!0};break;case"run:epic-completed":console.log("[RunStream] Epic completed:",t),this.runStatus={epicId:t,isRunning:!1},this.activeToolInfo=null;break;case"run:task-awaiting":{console.log("[RunStream] Task awaiting:",e.taskId,e.awaitingType);const r=this.ticks.find(n=>n.id===e.taskId),a={tickId:e.taskId,title:(r==null?void 0:r.title)||e.taskId,awaitingType:e.awaitingType,signalReason:e.reason},o=this.awaitingTasks.findIndex(n=>n.tickId===e.taskId);o>=0?this.awaitingTasks=[...this.awaitingTasks.slice(0,o),a,...this.awaitingTasks.slice(o+1)]:this.awaitingTasks=[...this.awaitingTasks,a],(s=window.showToast)==null||s.call(window,{message:`Task ${e.taskId} needs human action: ${e.awaitingType}`,variant:"warning"});break}}}toggleRunPanel(){var e;this.showRunPanel=!this.showRunPanel,this.showRunPanel&&((e=this.runStatus)!=null&&e.isRunning)&&this.runStatus.epicId&&this.runPanelEpicId!==this.runStatus.epicId&&(this.runPanelEpicId=this.runStatus.epicId,this.subscribeToRunStream(this.runStatus.epicId))}closeRunPanel(){this.showRunPanel=!1}isInputFocused(){var s;let e=document.activeElement;for(;(s=e==null?void 0:e.shadowRoot)!=null&&s.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let i=e;for(;i;){const r=i.tagName.toLowerCase();if(r.startsWith("sl-")&&(r.includes("input")||r.includes("textarea")||r.includes("select")))return!0;const a=i.getRootNode();i=a instanceof ShadowRoot?a.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Ue.length?[]:this.getColumnTicks(Ue[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Ue.length;e++)if(this.getColumnTicks(Ue[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let i=this.focusedTickIndex+e;i<0?i=t.length-1:i>=t.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Ue.length-1:t>=Ue.length&&(t=0),this.focusedColumnIndex=t;const i=this.getColumnTicks(Ue[t]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Ue[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&dt(e[this.focusedTickIndex].id)}handleEscape(){this.showRoadmap?this.showRoadmap=!1:this.showDashboard?this.showDashboard=!1:this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?dt(null):this.showRunPanel?this.showRunPanel=!1:this.clearFocus()}async toggleDashboard(){if(this.showDashboard=!this.showDashboard,this.showDashboard)try{this.dashboardActivities=await hr(20)}catch{this.dashboardActivities=[]}}async toggleRoadmap(){this.showRoadmap=!this.showRoadmap,this.showRoadmap&&await Va()}handleDashboardEpicSelect(e){this.selectedEpic=e.detail.epicId,this.showDashboard=!1,this.updateBoardState()}handleDashboardTickSelect(e){dt(e.detail.tickId),this.showDashboard=!1}async handleDashboardTickResume(e){var i,s,r;const{tickId:t}=e.detail;try{const a=await Wr(()=>Promise.resolve().then(()=>Qr),void 0,import.meta.url).then(o=>o.approveTick(t));At({...a,is_blocked:(((i=a.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),this.awaitingTasks=this.awaitingTasks.filter(o=>o.tickId!==t),(s=window.showToast)==null||s.call(window,{message:`Resumed tick ${t}`,variant:"success"})}catch(a){(r=window.showToast)==null||r.call(window,{message:`Failed to resume ${t}: ${a instanceof Error?a.message:a}`,variant:"danger"})}}async handleDashboardTickRetry(e){var i,s,r;const{tickId:t}=e.detail;try{const a=await Wr(()=>Promise.resolve().then(()=>Qr),void 0,import.meta.url).then(o=>o.reopenTick(t));At({...a,is_blocked:(((i=a.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),this.awaitingTasks=this.awaitingTasks.filter(o=>o.tickId!==t),(s=window.showToast)==null||s.call(window,{message:`Retrying tick ${t}`,variant:"success"})}catch(a){(r=window.showToast)==null||r.call(window,{message:`Failed to retry ${t}: ${a instanceof Error?a.message:a}`,variant:"danger"})}}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const i=e.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var i;const{tick:t}=e.detail;At(t),this.showCreateDialog=!1,this.updateBoardState(),(i=window.showToast)==null||i.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const i=e.target.querySelector("sl-tab[active]");if(i){const s=i.getAttribute("panel");s&&Ue.includes(s)&&(this.activeColumn=s,this.focusedColumnIndex=Ue.indexOf(s),this.focusedTickIndex=this.getColumnTicks(s).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,i=this.ticks.find(s=>s.id===t);i?dt(i.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(dt(t.id),!this.isCloudMode)try{const i=await ur(t.id);At(i)}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){dt(null)}handleTickUpdated(e){const{tick:t}=e.detail;At(t),this.updateBoardState(),(!t.awaiting||t.status==="closed")&&(this.awaitingTasks=this.awaitingTasks.filter(i=>i.tickId!==t.id))}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(i=>i.id.toLowerCase().includes(t)||i.title.toLowerCase().includes(t)||i.description&&i.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}renderRunPanel(){var i,s;const e=((i=this.runStatus)==null?void 0:i.isRunning)&&this.runStatus.activeTask,t=((s=this.epics.find(r=>r.id===this.runPanelEpicId))==null?void 0:s.title)||this.runPanelEpicId||"Unknown Epic";return d`
      <div class="run-panel">
        <div class="run-panel-header">
          <div class="run-panel-header-left">
            <div class="run-panel-title">
              <sl-icon name="terminal"></sl-icon>
              <span>Live Run</span>
            </div>
            ${this.runPanelEpicId?d`
                  <div class="run-panel-epic">
                    <span class="epic-id">${this.runPanelEpicId}</span>
                    <span>· ${t}</span>
                  </div>
                `:v}
          </div>
          <div class="run-panel-header-right">
            <sl-icon-button
              name="x-lg"
              label="Close run panel"
              @click=${this.closeRunPanel}
            ></sl-icon-button>
          </div>
        </div>

        <div class="run-panel-body">
          ${this.awaitingTasks.length>0?this.renderAwaitingTasks():v}
          ${e?this.renderActiveRun():this.renderNoRunState()}
        </div>
      </div>
    `}renderActiveRun(){var t;const e=(t=this.runStatus)==null?void 0:t.activeTask;return e?d`
      <!-- Task info bar -->
      <div class="run-info-bar">
        <div class="run-task-info">
          <span class="run-task-id">${e.tickId}</span>
          <span class="run-task-title">${e.title}</span>
        </div>
        ${this.runMetrics?d`<run-metrics .metrics=${this.runMetrics} ?live=${!0}></run-metrics>`:v}
      </div>

      <!-- Tool activity indicator -->
      ${this.activeToolInfo?d`
            <tool-activity
              .tool=${this.activeToolInfo}
              ?expanded=${!0}
            ></tool-activity>
          `:v}

      <!-- Output pane -->
      <div class="run-output-section">
        <run-output-pane
          epic-id=${this.runPanelEpicId||""}
        ></run-output-pane>
      </div>
    `:v}renderAwaitingTasks(){const e={work:"🔧",approval:"✅",input:"💬",review:"👀",content:"📝",escalation:"🚨",checkpoint:"📍"};return d`
      <div class="awaiting-section">
        <div class="awaiting-header">
          <sl-icon name="exclamation-triangle"></sl-icon>
          <span>Needs Human Action</span>
          <span class="awaiting-count">${this.awaitingTasks.length}</span>
        </div>
        <div class="awaiting-list">
          ${this.awaitingTasks.map(t=>d`
            <div class="awaiting-item" @click=${()=>this.handleAwaitingTaskClick(t.tickId)}>
              <div class="awaiting-item-header">
                <span class="awaiting-icon">${e[t.awaitingType]||"⏳"}</span>
                <span class="awaiting-item-id">${t.tickId}</span>
                <span class="awaiting-type-badge">${t.awaitingType}</span>
              </div>
              <div class="awaiting-item-title">${t.title}</div>
              ${t.signalReason?d`<div class="awaiting-item-reason">${t.signalReason}</div>`:v}
            </div>
          `)}
        </div>
      </div>
    `}handleAwaitingTaskClick(e){dt(e)}renderNoRunState(){return d`
      <div class="no-run-state">
        <sl-icon name="hourglass-split"></sl-icon>
        <p>No active run</p>
        <p class="hint">When a ticker run starts, output will appear here</p>
      </div>
    `}render(){var t;if(this.loading)return d`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return d`
        <div class="error-state">
          <ticks-alert variant="error">
            <strong>Failed to load board</strong><br>
            ${this.error}
          </ticks-alert>
          <ticks-button variant="primary" @click=${this.loadData}>Retry</ticks-button>
        </div>
      `;const e=this.getEpicNames();return d`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        connection-status=${this.connectionStatus}
        ?run-panel-open=${this.showRunPanel}
        ?run-active=${(t=this.runStatus)==null?void 0:t.isRunning}
        awaiting-count=${this.awaitingTasks.length}
        ?readonly-mode=${this.isCloudMode&&!this.localClientConnected}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @run-panel-toggle=${this.toggleRunPanel}
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

      <!-- Desktop/Tablet kanban board with optional run panel -->
      <div class="board-layout ${this.showRunPanel?"split":""}">
        <main>
          <div class="kanban-board">
            ${Ss.map((i,s)=>d`
              <tick-column
                name=${i.id}
                .ticks=${this.getColumnTicks(i.id)}
                .epicNames=${e}
                focused-tick-id=${this.focusedColumnIndex===s?this.getFocusedTickId()??"":""}
                @tick-selected=${this.handleTickSelected}
              ></tick-column>
            `)}
          </div>
        </main>

        <!-- Run monitoring panel -->
        ${this.showRunPanel?this.renderRunPanel():v}
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${Ss.map(i=>d`
            <sl-tab
              slot="nav"
              panel=${i.id}
              ?active=${this.activeColumn===i.id}
            >
              ${i.icon}
              <span class="tab-badge">${this.getColumnTicks(i.id).length}</span>
            </sl-tab>
          `)}
          ${Ss.map((i,s)=>d`
            <sl-tab-panel name=${i.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(i.id).length===0?d`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${i.icon}</div>
                        <div>No ticks in ${i.name}</div>
                      </div>
                    `:this.getColumnTicks(i.id).map(r=>d`
                      <tick-card
                        .tick=${r}
                        epic-name=${e[r.parent||""]||""}
                        ?focused=${this.focusedColumnIndex===s&&this.getFocusedTickId()===r.id}
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
              ${this.epics.map(i=>d`
                <sl-option value=${i.id}>
                  <span class="epic-id">${i.id}</span> - ${i.title}
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
        .runStatus=${this.runStatus}
        .activities=${this.dashboardActivities}
        repo-name=${this.repoName}
        @close=${()=>{this.showDashboard=!1}}
        @epic-select=${this.handleDashboardEpicSelect}
        @tick-select=${this.handleDashboardTickSelect}
        @tick-resume=${this.handleDashboardTickResume}
        @tick-retry=${this.handleDashboardTickRetry}
      ></tickflow-dashboard>

      <!-- Roadmap overlay -->
      ${this.showRoadmap?d`
        <roadmap-view
          .roadmap=${this.roadmapData??null}
          .loading=${this.roadmapLoading??!1}
          .error=${this.roadmapError??null}
          @close=${()=>{this.showRoadmap=!1}}
        ></roadmap-view>
      `:v}

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
    `}};V.styles=$`
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

    .board-layout.split main {
      flex: 0 0 50%;
      min-width: 400px;
    }

    .board-layout.split .kanban-board {
      height: calc(100vh - 80px);
    }

    /* Run panel container */
    .run-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--surface1, #45475a);
      background: var(--base, #1e1e2e);
      min-width: 400px;
      max-width: 60%;
      overflow: hidden;
    }

    .run-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-bottom: 1px solid var(--surface1, #45475a);
      flex-shrink: 0;
    }

    .run-panel-header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .run-panel-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, #cdd6f4);
    }

    .run-panel-title sl-icon {
      color: var(--green, #a6e3a1);
    }

    .run-panel-epic {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-epic .epic-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .run-panel-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-panel-header-right sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
    }

    .run-panel-header-right sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .run-panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0.75rem;
      gap: 0.75rem;
    }

    /* Run info bar */
    .run-info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .run-task-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .run-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .run-task-title {
      color: var(--text, #cdd6f4);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Run output section */
    .run-output-section {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* No run state */
    .no-run-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--subtext0, #a6adc8);
      text-align: center;
      padding: 2rem;
    }

    .no-run-state sl-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-run-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    .no-run-state .hint {
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--overlay0, #6c7086);
    }

    /* Run toggle button in header area */
    .run-toggle-btn {
      position: relative;
    }

    .run-toggle-btn .live-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    /* Awaiting tasks section */
    .awaiting-section {
      background: color-mix(in srgb, var(--yellow, #f9e2af) 8%, var(--surface0, #313244));
      border: 1px solid color-mix(in srgb, var(--yellow, #f9e2af) 30%, transparent);
      border-radius: 8px;
      padding: 0.75rem;
      flex-shrink: 0;
    }

    .awaiting-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--yellow, #f9e2af);
      margin-bottom: 0.5rem;
    }

    .awaiting-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.375rem;
      font-size: 0.6875rem;
      font-weight: 700;
      background: var(--yellow, #f9e2af);
      color: var(--base, #1e1e2e);
      border-radius: 999px;
    }

    .awaiting-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .awaiting-item {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 6px;
      padding: 0.625rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }

    .awaiting-item:hover {
      border-color: var(--yellow, #f9e2af);
    }

    .awaiting-item-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .awaiting-icon {
      font-size: 0.875rem;
    }

    .awaiting-item-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--blue, #89b4fa);
      font-weight: 500;
    }

    .awaiting-type-badge {
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      background: color-mix(in srgb, var(--yellow, #f9e2af) 15%, transparent);
      color: var(--yellow, #f9e2af);
      border-radius: 4px;
      font-weight: 500;
      margin-left: auto;
    }

    .awaiting-item-title {
      font-size: 0.8125rem;
      color: var(--text, #cdd6f4);
      line-height: 1.4;
    }

    .awaiting-item-reason {
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.25rem;
      line-height: 1.3;
      font-style: italic;
    }

    /* Hide run panel on mobile */
    @media (max-width: 768px) {
      .run-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        min-width: unset;
        max-width: unset;
        border-left: none;
        z-index: 100;
      }

      .board-layout.split main {
        flex: 1;
        min-width: unset;
      }
    }
  `;K([ec({context:nc}),w()],V.prototype,"boardState",2);K([w()],V.prototype,"selectedEpic",2);K([w()],V.prototype,"searchTerm",2);K([w()],V.prototype,"activeColumn",2);K([w()],V.prototype,"isMobile",2);K([w()],V.prototype,"focusedColumnIndex",2);K([w()],V.prototype,"focusedTickIndex",2);K([w()],V.prototype,"showKeyboardHelp",2);K([w()],V.prototype,"showCreateDialog",2);K([w()],V.prototype,"showMobileFilterDrawer",2);K([w()],V.prototype,"showDashboard",2);K([w()],V.prototype,"dashboardActivities",2);K([w()],V.prototype,"showRoadmap",2);K([w()],V.prototype,"showRunPanel",2);K([w()],V.prototype,"runStatus",2);K([w()],V.prototype,"runPanelEpicId",2);K([w()],V.prototype,"runStreamConnected",2);K([w()],V.prototype,"activeToolInfo",2);K([w()],V.prototype,"runMetrics",2);K([w()],V.prototype,"awaitingTasks",2);V=K([me("tick-board")],V);const lo=6048e5,Zc=864e5,Jc=6e4,ed=36e5,Ei=43200,Zr=1440,Jr=Symbol.for("constructDateFrom");function tt(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&Jr in e?e[Jr](t):e instanceof Date?new e.constructor(t):new Date(t)}function te(e,t){return tt(t||e,e)}let td={};function vi(){return td}function di(e,t){var n,u,c,p;const i=vi(),s=(t==null?void 0:t.weekStartsOn)??((u=(n=t==null?void 0:t.locale)==null?void 0:n.options)==null?void 0:u.weekStartsOn)??i.weekStartsOn??((p=(c=i.locale)==null?void 0:c.options)==null?void 0:p.weekStartsOn)??0,r=te(e,t==null?void 0:t.in),a=r.getDay(),o=(a<s?7:0)+a-s;return r.setDate(r.getDate()-o),r.setHours(0,0,0,0),r}function qi(e,t){return di(e,{...t,weekStartsOn:1})}function co(e,t){const i=te(e,t==null?void 0:t.in),s=i.getFullYear(),r=tt(i,0);r.setFullYear(s+1,0,4),r.setHours(0,0,0,0);const a=qi(r),o=tt(i,0);o.setFullYear(s,0,4),o.setHours(0,0,0,0);const n=qi(o);return i.getTime()>=a.getTime()?s+1:i.getTime()>=n.getTime()?s:s-1}function Yi(e){const t=te(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function yi(e,...t){const i=tt.bind(null,e||t.find(s=>typeof s=="object"));return t.map(i)}function ea(e,t){const i=te(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function id(e,t,i){const[s,r]=yi(i==null?void 0:i.in,e,t),a=ea(s),o=ea(r),n=+a-Yi(a),u=+o-Yi(o);return Math.round((n-u)/Zc)}function sd(e,t){const i=co(e,t),s=tt(e,0);return s.setFullYear(i,0,4),s.setHours(0,0,0,0),qi(s)}function Mi(e,t){const i=+te(e)-+te(t);return i<0?-1:i>0?1:i}function rd(e){return tt(e,Date.now())}function ad(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function od(e){return!(!ad(e)&&typeof e!="number"||isNaN(+te(e)))}function nd(e,t,i){const[s,r]=yi(i==null?void 0:i.in,e,t),a=s.getFullYear()-r.getFullYear(),o=s.getMonth()-r.getMonth();return a*12+o}function mr(e){return t=>{const s=(e?Math[e]:Math.trunc)(t);return s===0?0:s}}function ld(e,t,i){const[s,r]=yi(i==null?void 0:i.in,e,t),a=(+s-+r)/ed;return mr(i==null?void 0:i.roundingMethod)(a)}function uo(e,t){return+te(e)-+te(t)}function cd(e,t,i){const s=uo(e,t)/Jc;return mr(i==null?void 0:i.roundingMethod)(s)}function dd(e,t){const i=te(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function ud(e,t){const i=te(e,t==null?void 0:t.in),s=i.getMonth();return i.setFullYear(i.getFullYear(),s+1,0),i.setHours(23,59,59,999),i}function hd(e,t){const i=te(e,t==null?void 0:t.in);return+dd(i,t)==+ud(i,t)}function pd(e,t,i){const[s,r,a]=yi(i==null?void 0:i.in,e,e,t),o=Mi(r,a),n=Math.abs(nd(r,a));if(n<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-o*n);let u=Mi(r,a)===-o;hd(s)&&n===1&&Mi(s,a)===1&&(u=!1);const c=o*(n-+u);return c===0?0:c}function md(e,t,i){const s=uo(e,t)/1e3;return mr(i==null?void 0:i.roundingMethod)(s)}function fd(e,t){const i=te(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}const bd={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},gd=(e,t,i)=>{let s;const r=bd[e];return typeof r=="string"?s=r:t===1?s=r.one:s=r.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+s:s+" ago":s};function Es(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const vd={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},yd={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},wd={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},kd={date:Es({formats:vd,defaultWidth:"full"}),time:Es({formats:yd,defaultWidth:"full"}),dateTime:Es({formats:wd,defaultWidth:"full"})},xd={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},_d=(e,t,i,s)=>xd[e];function Qt(e){return(t,i)=>{const s=i!=null&&i.context?String(i.context):"standalone";let r;if(s==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,n=i!=null&&i.width?String(i.width):o;r=e.formattingValues[n]||e.formattingValues[o]}else{const o=e.defaultWidth,n=i!=null&&i.width?String(i.width):e.defaultWidth;r=e.values[n]||e.values[o]}const a=e.argumentCallback?e.argumentCallback(t):t;return r[a]}}const Cd={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},$d={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Td={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Sd={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Ed={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},zd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Rd=(e,t)=>{const i=Number(e),s=i%100;if(s>20||s<10)switch(s%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},Ad={ordinalNumber:Rd,era:Qt({values:Cd,defaultWidth:"wide"}),quarter:Qt({values:$d,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Qt({values:Td,defaultWidth:"wide"}),day:Qt({values:Sd,defaultWidth:"wide"}),dayPeriod:Qt({values:Ed,defaultWidth:"wide",formattingValues:zd,defaultFormattingWidth:"wide"})};function Zt(e){return(t,i={})=>{const s=i.width,r=s&&e.matchPatterns[s]||e.matchPatterns[e.defaultMatchWidth],a=t.match(r);if(!a)return null;const o=a[0],n=s&&e.parsePatterns[s]||e.parsePatterns[e.defaultParseWidth],u=Array.isArray(n)?Id(n,f=>f.test(o)):Od(n,f=>f.test(o));let c;c=e.valueCallback?e.valueCallback(u):u,c=i.valueCallback?i.valueCallback(c):c;const p=t.slice(o.length);return{value:c,rest:p}}}function Od(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Id(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function Dd(e){return(t,i={})=>{const s=t.match(e.matchPattern);if(!s)return null;const r=s[0],a=t.match(e.parsePattern);if(!a)return null;let o=e.valueCallback?e.valueCallback(a[0]):a[0];o=i.valueCallback?i.valueCallback(o):o;const n=t.slice(r.length);return{value:o,rest:n}}}const Md=/^(\d+)(th|st|nd|rd)?/i,Pd=/\d+/i,Ld={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Fd={any:[/^b/i,/^(a|c)/i]},Nd={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Bd={any:[/1/i,/2/i,/3/i,/4/i]},Hd={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},jd={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Ud={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Vd={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Wd={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},qd={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Yd={ordinalNumber:Dd({matchPattern:Md,parsePattern:Pd,valueCallback:e=>parseInt(e,10)}),era:Zt({matchPatterns:Ld,defaultMatchWidth:"wide",parsePatterns:Fd,defaultParseWidth:"any"}),quarter:Zt({matchPatterns:Nd,defaultMatchWidth:"wide",parsePatterns:Bd,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Zt({matchPatterns:Hd,defaultMatchWidth:"wide",parsePatterns:jd,defaultParseWidth:"any"}),day:Zt({matchPatterns:Ud,defaultMatchWidth:"wide",parsePatterns:Vd,defaultParseWidth:"any"}),dayPeriod:Zt({matchPatterns:Wd,defaultMatchWidth:"any",parsePatterns:qd,defaultParseWidth:"any"})},ho={code:"en-US",formatDistance:gd,formatLong:kd,formatRelative:_d,localize:Ad,match:Yd,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Kd(e,t){const i=te(e,t==null?void 0:t.in);return id(i,fd(i))+1}function Gd(e,t){const i=te(e,t==null?void 0:t.in),s=+qi(i)-+sd(i);return Math.round(s/lo)+1}function po(e,t){var p,f,b,m;const i=te(e,t==null?void 0:t.in),s=i.getFullYear(),r=vi(),a=(t==null?void 0:t.firstWeekContainsDate)??((f=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(b=r.locale)==null?void 0:b.options)==null?void 0:m.firstWeekContainsDate)??1,o=tt((t==null?void 0:t.in)||e,0);o.setFullYear(s+1,0,a),o.setHours(0,0,0,0);const n=di(o,t),u=tt((t==null?void 0:t.in)||e,0);u.setFullYear(s,0,a),u.setHours(0,0,0,0);const c=di(u,t);return+i>=+n?s+1:+i>=+c?s:s-1}function Xd(e,t){var n,u,c,p;const i=vi(),s=(t==null?void 0:t.firstWeekContainsDate)??((u=(n=t==null?void 0:t.locale)==null?void 0:n.options)==null?void 0:u.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(c=i.locale)==null?void 0:c.options)==null?void 0:p.firstWeekContainsDate)??1,r=po(e,t),a=tt((t==null?void 0:t.in)||e,0);return a.setFullYear(r,0,s),a.setHours(0,0,0,0),di(a,t)}function Qd(e,t){const i=te(e,t==null?void 0:t.in),s=+di(i,t)-+Xd(i,t);return Math.round(s/lo)+1}function I(e,t){const i=e<0?"-":"",s=Math.abs(e).toString().padStart(t,"0");return i+s}const ct={y(e,t){const i=e.getFullYear(),s=i>0?i:1-i;return I(t==="yy"?s%100:s,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):I(i+1,2)},d(e,t){return I(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return I(e.getHours()%12||12,t.length)},H(e,t){return I(e.getHours(),t.length)},m(e,t){return I(e.getMinutes(),t.length)},s(e,t){return I(e.getSeconds(),t.length)},S(e,t){const i=t.length,s=e.getMilliseconds(),r=Math.trunc(s*Math.pow(10,i-3));return I(r,t.length)}},Rt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},ta={G:function(e,t,i){const s=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(s,{width:"abbreviated"});case"GGGGG":return i.era(s,{width:"narrow"});case"GGGG":default:return i.era(s,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const s=e.getFullYear(),r=s>0?s:1-s;return i.ordinalNumber(r,{unit:"year"})}return ct.y(e,t)},Y:function(e,t,i,s){const r=po(e,s),a=r>0?r:1-r;if(t==="YY"){const o=a%100;return I(o,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):I(a,t.length)},R:function(e,t){const i=co(e);return I(i,t.length)},u:function(e,t){const i=e.getFullYear();return I(i,t.length)},Q:function(e,t,i){const s=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(s);case"QQ":return I(s,2);case"Qo":return i.ordinalNumber(s,{unit:"quarter"});case"QQQ":return i.quarter(s,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(s,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(s,{width:"wide",context:"formatting"})}},q:function(e,t,i){const s=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(s);case"qq":return I(s,2);case"qo":return i.ordinalNumber(s,{unit:"quarter"});case"qqq":return i.quarter(s,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(s,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(s,{width:"wide",context:"standalone"})}},M:function(e,t,i){const s=e.getMonth();switch(t){case"M":case"MM":return ct.M(e,t);case"Mo":return i.ordinalNumber(s+1,{unit:"month"});case"MMM":return i.month(s,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(s,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(s,{width:"wide",context:"formatting"})}},L:function(e,t,i){const s=e.getMonth();switch(t){case"L":return String(s+1);case"LL":return I(s+1,2);case"Lo":return i.ordinalNumber(s+1,{unit:"month"});case"LLL":return i.month(s,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(s,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(s,{width:"wide",context:"standalone"})}},w:function(e,t,i,s){const r=Qd(e,s);return t==="wo"?i.ordinalNumber(r,{unit:"week"}):I(r,t.length)},I:function(e,t,i){const s=Gd(e);return t==="Io"?i.ordinalNumber(s,{unit:"week"}):I(s,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):ct.d(e,t)},D:function(e,t,i){const s=Kd(e);return t==="Do"?i.ordinalNumber(s,{unit:"dayOfYear"}):I(s,t.length)},E:function(e,t,i){const s=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(s,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(s,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(s,{width:"short",context:"formatting"});case"EEEE":default:return i.day(s,{width:"wide",context:"formatting"})}},e:function(e,t,i,s){const r=e.getDay(),a=(r-s.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return I(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,i,s){const r=e.getDay(),a=(r-s.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return I(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,i){const s=e.getDay(),r=s===0?7:s;switch(t){case"i":return String(r);case"ii":return I(r,t.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(s,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(s,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(s,{width:"short",context:"formatting"});case"iiii":default:return i.day(s,{width:"wide",context:"formatting"})}},a:function(e,t,i){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,i){const s=e.getHours();let r;switch(s===12?r=Rt.noon:s===0?r=Rt.midnight:r=s/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,i){const s=e.getHours();let r;switch(s>=17?r=Rt.evening:s>=12?r=Rt.afternoon:s>=4?r=Rt.morning:r=Rt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let s=e.getHours()%12;return s===0&&(s=12),i.ordinalNumber(s,{unit:"hour"})}return ct.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):ct.H(e,t)},K:function(e,t,i){const s=e.getHours()%12;return t==="Ko"?i.ordinalNumber(s,{unit:"hour"}):I(s,t.length)},k:function(e,t,i){let s=e.getHours();return s===0&&(s=24),t==="ko"?i.ordinalNumber(s,{unit:"hour"}):I(s,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):ct.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):ct.s(e,t)},S:function(e,t){return ct.S(e,t)},X:function(e,t,i){const s=e.getTimezoneOffset();if(s===0)return"Z";switch(t){case"X":return sa(s);case"XXXX":case"XX":return kt(s);case"XXXXX":case"XXX":default:return kt(s,":")}},x:function(e,t,i){const s=e.getTimezoneOffset();switch(t){case"x":return sa(s);case"xxxx":case"xx":return kt(s);case"xxxxx":case"xxx":default:return kt(s,":")}},O:function(e,t,i){const s=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+ia(s,":");case"OOOO":default:return"GMT"+kt(s,":")}},z:function(e,t,i){const s=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+ia(s,":");case"zzzz":default:return"GMT"+kt(s,":")}},t:function(e,t,i){const s=Math.trunc(+e/1e3);return I(s,t.length)},T:function(e,t,i){return I(+e,t.length)}};function ia(e,t=""){const i=e>0?"-":"+",s=Math.abs(e),r=Math.trunc(s/60),a=s%60;return a===0?i+String(r):i+String(r)+t+I(a,2)}function sa(e,t){return e%60===0?(e>0?"-":"+")+I(Math.abs(e)/60,2):kt(e,t)}function kt(e,t=""){const i=e>0?"-":"+",s=Math.abs(e),r=I(Math.trunc(s/60),2),a=I(s%60,2);return i+r+t+a}const ra=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},mo=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Zd=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],s=i[1],r=i[2];if(!r)return ra(e,t);let a;switch(s){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",ra(s,t)).replace("{{time}}",mo(r,t))},Jd={p:mo,P:Zd},eu=/^D+$/,tu=/^Y+$/,iu=["D","DD","YY","YYYY"];function su(e){return eu.test(e)}function ru(e){return tu.test(e)}function au(e,t,i){const s=ou(e,t,i);if(console.warn(s),iu.includes(e))throw new RangeError(s)}function ou(e,t,i){const s=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${s} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const nu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,lu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,cu=/^'([^]*?)'?$/,du=/''/g,uu=/[a-zA-Z]/;function hu(e,t,i){var p,f,b,m;const s=vi(),r=s.locale??ho,a=s.firstWeekContainsDate??((f=(p=s.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??1,o=s.weekStartsOn??((m=(b=s.locale)==null?void 0:b.options)==null?void 0:m.weekStartsOn)??0,n=te(e,i==null?void 0:i.in);if(!od(n))throw new RangeError("Invalid time value");let u=t.match(lu).map(g=>{const y=g[0];if(y==="p"||y==="P"){const k=Jd[y];return k(g,r.formatLong)}return g}).join("").match(nu).map(g=>{if(g==="''")return{isToken:!1,value:"'"};const y=g[0];if(y==="'")return{isToken:!1,value:pu(g)};if(ta[y])return{isToken:!0,value:g};if(y.match(uu))throw new RangeError("Format string contains an unescaped latin alphabet character `"+y+"`");return{isToken:!1,value:g}});r.localize.preprocessor&&(u=r.localize.preprocessor(n,u));const c={firstWeekContainsDate:a,weekStartsOn:o,locale:r};return u.map(g=>{if(!g.isToken)return g.value;const y=g.value;(ru(y)||su(y))&&au(y,t,String(e));const k=ta[y[0]];return k(n,y,r.localize,c)}).join("")}function pu(e){const t=e.match(cu);return t?t[1].replace(du,"'"):e}function mu(e,t,i){const s=vi(),r=(i==null?void 0:i.locale)??s.locale??ho,a=2520,o=Mi(e,t);if(isNaN(o))throw new RangeError("Invalid time value");const n=Object.assign({},i,{addSuffix:i==null?void 0:i.addSuffix,comparison:o}),[u,c]=yi(i==null?void 0:i.in,...o>0?[t,e]:[e,t]),p=md(c,u),f=(Yi(c)-Yi(u))/1e3,b=Math.round((p-f)/60);let m;if(b<2)return i!=null&&i.includeSeconds?p<5?r.formatDistance("lessThanXSeconds",5,n):p<10?r.formatDistance("lessThanXSeconds",10,n):p<20?r.formatDistance("lessThanXSeconds",20,n):p<40?r.formatDistance("halfAMinute",0,n):p<60?r.formatDistance("lessThanXMinutes",1,n):r.formatDistance("xMinutes",1,n):b===0?r.formatDistance("lessThanXMinutes",1,n):r.formatDistance("xMinutes",b,n);if(b<45)return r.formatDistance("xMinutes",b,n);if(b<90)return r.formatDistance("aboutXHours",1,n);if(b<Zr){const g=Math.round(b/60);return r.formatDistance("aboutXHours",g,n)}else{if(b<a)return r.formatDistance("xDays",1,n);if(b<Ei){const g=Math.round(b/Zr);return r.formatDistance("xDays",g,n)}else if(b<Ei*2)return m=Math.round(b/Ei),r.formatDistance("aboutXMonths",m,n)}if(m=pd(c,u),m<12){const g=Math.round(b/Ei);return r.formatDistance("xMonths",g,n)}else{const g=m%12,y=Math.trunc(m/12);return g<3?r.formatDistance("aboutXYears",y,n):g<9?r.formatDistance("overXYears",y,n):r.formatDistance("almostXYears",y+1,n)}}function fu(e,t){return mu(e,rd(e),t)}var bu=Object.defineProperty,gu=Object.getOwnPropertyDescriptor,Et=(e,t,i,s)=>{for(var r=s>1?void 0:s?gu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&bu(t,i,r),r};const aa={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},vu={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let it=class extends oe{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),e.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var a;if(((a=this.tick)==null?void 0:a.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const e=new Date(this.tick.started_at),t=new Date,i=cd(t,e),s=ld(t,e),r=i%60;s>0?this.elapsedTime=`${s}h ${r}m`:this.elapsedTime=`${i}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return aa[this.tick.priority]??aa[2]}getPriorityLabel(){return vu[this.tick.priority]??"Unknown"}renderVerificationBadge(){const e=this.tick.verification_status;if(!e)return null;switch(e){case"verified":return d`<span class="meta-badge verified">✓ verified</span>`;case"failed":return d`<span class="meta-badge verification-failed">✗ failed</span>`;case"pending":return d`<span class="meta-badge verification-pending">⋯ pending</span>`;default:return null}}renderElapsedBadge(){if(!this.elapsedTime||!this.tick.started_at)return null;const e=new Date(this.tick.started_at).toLocaleString();return d`
      <sl-tooltip content="Started: ${e}">
        <span class="meta-badge elapsed-time">⏱ ${this.elapsedTime}</span>
      </sl-tooltip>
    `}render(){const{tick:e,selected:t,focused:i,epicName:s}=this;return d`
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
          ${e.is_blocked?d`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${e.manual?d`<span class="meta-badge manual">👤 manual</span>`:null}
          ${e.awaiting?d`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:null}
          ${this.renderVerificationBadge()}
          ${this.renderElapsedBadge()}
        </div>

        ${s?d`<div class="epic-name">${s}</div>`:null}
      </div>
    `}};it.styles=$`
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
  `;Et([h({attribute:!1})],it.prototype,"tick",2);Et([h({type:Boolean})],it.prototype,"selected",2);Et([h({type:Boolean})],it.prototype,"focused",2);Et([h({type:String,attribute:"epic-name"})],it.prototype,"epicName",2);Et([C(".card")],it.prototype,"cardElement",2);Et([w()],it.prototype,"elapsedTime",2);it=Et([me("tick-card")],it);var yu=Object.defineProperty,wu=Object.getOwnPropertyDescriptor,Ut=(e,t,i,s)=>{for(var r=s>1?void 0:s?wu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&yu(t,i,r),r};const ku={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},xu={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},_u={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let ft=class extends oe{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||ku[this.name]||"var(--blue)"}getColumnDisplayName(){return xu[this.name]||this.name}getColumnIcon(){return _u[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),i=this.getColumnIcon(),s=this.ticks.length;return d`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${e}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${e}">${i}</span>
            ${t}
          </span>
          <span class="column-count">${s}</span>
        </div>
      </div>

      <div class="column-content">
        ${s===0?d`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(r=>d`
                <tick-card
                  .tick=${r}
                  epic-name=${this.epicNames[r.parent||""]||""}
                  ?focused=${this.focusedTickId===r.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};ft.styles=$`
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
  `;Ut([h({type:String})],ft.prototype,"name",2);Ut([h({type:String})],ft.prototype,"color",2);Ut([h({attribute:!1})],ft.prototype,"ticks",2);Ut([h({type:Object,attribute:!1})],ft.prototype,"epicNames",2);Ut([h({type:String,attribute:"focused-tick-id"})],ft.prototype,"focusedTickId",2);ft=Ut([me("tick-column")],ft);var Cu=Object.defineProperty,$u=Object.getOwnPropertyDescriptor,Ne=(e,t,i,s)=>{for(var r=s>1?void 0:s?$u(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Cu(t,i,r),r};let we=class extends oe{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.runPanelOpen=!1,this.runActive=!1,this.awaitingCount=0,this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const i=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleRunPanelToggle(){this.dispatchEvent(new CustomEvent("run-panel-toggle",{bubbles:!0,composed:!0}))}handleDashboardToggle(){this.dispatchEvent(new CustomEvent("dashboard-toggle",{bubbles:!0,composed:!0}))}handleRoadmapToggle(){this.dispatchEvent(new CustomEvent("roadmap-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return d`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          ${this.readonlyMode?d`<a href="/app" style="text-decoration: none;"><ticks-logo variant="logotype" .size=${24}></ticks-logo></a>`:d`<ticks-logo variant="logotype" .size=${24}></ticks-logo>`}
          <sl-tooltip content=${this.getConnectionTooltip()}>
            <span class="connection-status ${this.connectionStatus}"></span>
          </sl-tooltip>
          ${this.repoName?d`<span class="repo-badge">${this.repoName}</span>`:null}
          ${this.readonlyMode?d`
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
            ${this.epics.map(e=>d`
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

          <sl-tooltip content="Live run panel (r)">
            <sl-button
              class=${this.runActive?"run-button-active":""}
              variant=${this.runPanelOpen?"primary":"default"}
              size="small"
              @click=${this.handleRunPanelToggle}
            >
              <sl-icon name="terminal"></sl-icon>
              ${this.awaitingCount>0?d`<sl-badge variant="warning" pill pulse>${this.awaitingCount}</sl-badge>`:v}
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
    `}};we.styles=$`
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

    /* Style run panel button with green tones */
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

    /* Pulsing animation for active run indicator */
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 4px var(--green, #a6e3a1);
      }
      50% {
        box-shadow: 0 0 12px var(--green, #a6e3a1), 0 0 20px var(--green, #a6e3a1);
      }
    }

    .run-button-active::part(base) {
      background: var(--green, #a6e3a1) !important;
      color: var(--crust, #11111b) !important;
      animation: pulse-glow 1.5s ease-in-out infinite;
    }
  `;Ne([h({type:String,attribute:"repo-name"})],we.prototype,"repoName",2);Ne([h({attribute:!1})],we.prototype,"epics",2);Ne([h({type:String,attribute:"selected-epic"})],we.prototype,"selectedEpic",2);Ne([h({type:String,attribute:"search-term"})],we.prototype,"searchTerm",2);Ne([h({type:Boolean,attribute:"run-panel-open"})],we.prototype,"runPanelOpen",2);Ne([h({type:Boolean,attribute:"run-active"})],we.prototype,"runActive",2);Ne([h({type:Number,attribute:"awaiting-count"})],we.prototype,"awaitingCount",2);Ne([h({type:Boolean,attribute:"readonly-mode"})],we.prototype,"readonlyMode",2);Ne([h({type:String,attribute:"connection-status"})],we.prototype,"connectionStatus",2);Ne([w()],we.prototype,"debounceTimeout",2);we=Ne([me("tick-header")],we);var Tu=Object.defineProperty,Su=Object.getOwnPropertyDescriptor,fs=(e,t,i,s)=>{for(var r=s>1?void 0:s?Su(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Tu(t,i,r),r};let Lt=class extends oe{constructor(){super(...arguments),this.record=null,this.loading=!1,this.error=""}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}truncateText(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}renderSummary(e){const t=e.metrics.input_tokens+e.metrics.output_tokens,i=e.success?"success":"error";return d`
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

        ${!e.success&&e.error_msg?d`<div class="error-box"><strong>Error:</strong> ${e.error_msg}</div>`:v}
      </div>
    `}renderMetrics(e){const t=e.metrics;return d`
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
          ${t.cache_read_tokens>0?d`
                <div class="metric-item">
                  <span class="metric-label">Cache Read</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_read_tokens)}</span>
                </div>
              `:v}
          ${t.cache_creation_tokens>0?d`
                <div class="metric-item">
                  <span class="metric-label">Cache Creation</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_creation_tokens)}</span>
                </div>
              `:v}
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
    `}renderOutput(e){return e.output?d`
      <sl-details summary="Output">
        <div class="content-block">${e.output}</div>
      </sl-details>
    `:v}renderThinking(e){return e.thinking?d`
      <sl-details summary="Thinking">
        <div class="content-block">${e.thinking}</div>
      </sl-details>
    `:v}renderToolItem(e){return d`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?d`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:v}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?d`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`:v}
      </li>
    `}renderTools(e){return!e.tools||e.tools.length===0?v:d`
      <sl-details summary="Tools (${e.tools.length})">
        <ul class="tools-list">
          ${e.tools.map(t=>this.renderToolItem(t))}
        </ul>
      </sl-details>
    `}renderVerifierResult(e){const t=e.passed?"passed":"failed";return d`
      <div class="verifier-item ${t}">
        <span class="verifier-icon ${t}">
          <sl-icon name="${e.passed?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?d`<div class="verifier-error">${e.error}</div>`:v}
          ${e.output?d`<div class="verifier-output">${e.output}</div>`:v}
        </div>
      </div>
    `}renderVerification(e){if(!e.verification)return v;const t=e.verification,i=t.all_passed?"passed":"failed",s=t.results||[];return d`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${i}">
            <sl-icon name="${t.all_passed?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            <span>${t.all_passed?"Verified":"Failed"}</span>
          </div>
        </div>
        ${s.length>0?d`
              <div class="verifier-results">
                ${s.map(r=>this.renderVerifierResult(r))}
              </div>
            `:v}
      </sl-details>
    `}render(){if(this.loading)return d`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading run record...</span>
        </div>
      `;if(this.error)return d`<div class="error">${this.error}</div>`;if(!this.record)return d`<div class="empty">No run record available</div>`;const e=this.record,t=e.success?"success":"error";return d`
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
    `}};Lt.styles=$`
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
  `;fs([h({attribute:!1})],Lt.prototype,"record",2);fs([h({type:Boolean})],Lt.prototype,"loading",2);fs([h({type:String})],Lt.prototype,"error",2);Lt=fs([me("run-record")],Lt);var Eu=Object.defineProperty,zu=Object.getOwnPropertyDescriptor,q=(e,t,i,s)=>{for(var r=s>1?void 0:s?zu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Eu(t,i,r),r};const Ru={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},oa={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let U=class extends oe{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview",this.isCloudModeController=new J.StoreController(this,Pe)}get isCloudMode(){return this.isCloudModeController.value}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&(this.resetActionState(),this.tick&&this.tick.type==="task"&&this.loadRunRecord())}async loadRunRecord(){if(this.tick){if(this.isCloudMode){this.loadingRunRecord=!1;return}this.loadingRunRecord=!0,this.runRecordError="",this.runRecord=null;try{this.runRecord=await pr(this.tick.id)}catch(e){this.runRecordError=e instanceof Error?e.message:"Failed to load run history"}finally{this.loadingRunRecord=!1}}}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ja(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await eo(this.tick.id,this.rejectReason.trim()),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await to(this.tick.id,this.closeReason.trim()||void 0),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await io(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const i=await Za(this.tick.id,e);this.optimisticNote=null;const s={...i,is_blocked:(((t=i.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:li(i.notes)};this.emitTickUpdated(s)}catch(i){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=i instanceof Error?i.message:"Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return Ru[e]??"Unknown"}getPriorityColor(e){return oa[e]??oa[2]}formatStartedAt(e){const t=new Date(e),i=fu(t,{addSuffix:!0}),s=hu(t,"h:mm a");return`${i} (${s})`}renderActions(){const e=this.tick;if(!e)return v;const t=e.status==="open",i=e.status==="closed",s=!!e.awaiting,r=!!e.requires,a=t&&s,o=t&&!r,n=i;return!a&&!o&&!n?v:d`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?d`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:v}

        <div class="actions-section">
          ${a?d`
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
              `:v}
          ${o?d`
                <ticks-button
                  variant="secondary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </ticks-button>
              `:v}
          ${n?d`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  ${this.loading?"Reopening...":"Reopen"}
                </ticks-button>
              `:v}
        </div>

        ${this.showRejectInput?d`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${u=>{this.rejectReason=u.target.value}}
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
            `:v}

        ${this.showCloseInput?d`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${u=>{this.closeReason=u.target.value}}
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
            `:v}
      </div>

      <sl-divider></sl-divider>
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?d`<span class="empty-text">None</span>`:d`
      <ul class="link-list">
        ${this.blockerDetails.map(e=>d`
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
    `}renderParent(){var e;return(e=this.tick)!=null&&e.parent?d`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?d`<span class="link-title">${this.parentTitle}</span>`:v}
      </a>
    `:d`<span class="empty-text">None</span>`}renderLabels(){var e;return!((e=this.tick)!=null&&e.labels)||this.tick.labels.length===0?d`<span class="empty-text">None</span>`:d`
      <div class="labels-container">
        ${this.tick.labels.map(t=>d`<span class="label-badge">${t}</span>`)}
      </div>
    `}renderNoteItem(e,t=!1){return d`
      <li class="note-item ${t?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${e.author??"Unknown"}</span>
          ${e.timestamp?d`<span class="note-timestamp"
                >${this.formatTimestamp(e.timestamp)}</span
              >`:v}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?d`<div class="note-sending">Sending...</div>`:v}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return d`
      ${e?d`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):v}
              </ul>
            </div>
          `:d`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?d`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `:v}

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
    `}toggleSection(e){const t=new Set(this.expandedSections);t.has(e)?t.delete(e):t.add(e),this.expandedSections=t}formatRunTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}truncateText(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}renderVerification(){var s;if(((s=this.tick)==null?void 0:s.type)!=="task"||!this.runRecord)return v;const e=this.runRecord.verification;if(!e)return this.tick.status==="closed"?d`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `:v;const t=e.all_passed,i=e.results||[];return d`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-circle-fill":"x-circle-fill"}"></sl-icon>
          <span>${t?"Verified":"Failed"}</span>
        </div>

        ${i.length>0?d`
              <div class="verifier-results">
                ${i.map(r=>this.renderVerifierResult(r))}
              </div>
            `:v}
      </div>
      <sl-divider></sl-divider>
    `}renderVerifierResult(e){const t=e.passed,i=this.expandedSections.has(`verifier-${e.verifier}`);return d`
      <div class="verifier-item ${t?"passed":"failed"}">
        <span class="verifier-icon ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?d`<div class="verifier-error">${e.error}</div>`:v}
          ${e.output?d`
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
                ${i?d`<div class="verifier-output">${e.output}</div>`:v}
              `:v}
        </div>
      </div>
    `}renderRunHistory(){var s;if(((s=this.tick)==null?void 0:s.type)!=="task")return v;if(this.loadingRunRecord)return d`
        <div class="section">
          <div class="section-title">Run History</div>
          <div class="run-loading">
            <sl-spinner></sl-spinner>
            <span>Loading run history...</span>
          </div>
        </div>
        <sl-divider></sl-divider>
      `;if(this.runRecordError)return d`
        <div class="section">
          <div class="section-title">Run History</div>
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.runRecordError}
          </sl-alert>
        </div>
        <sl-divider></sl-divider>
      `;if(!this.runRecord)return d`
        <div class="section">
          <div class="section-title">Run History</div>
          <span class="no-run-history">No run history available</span>
        </div>
        <sl-divider></sl-divider>
      `;const e=this.runRecord,t=this.expandedSections.has("run-main"),i=e.metrics.input_tokens+e.metrics.output_tokens;return d`
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
            ${t?this.renderRunRecordBody(e):v}
          </div>
        </div>
      </div>
      <sl-divider></sl-divider>
    `}renderRunRecordBody(e){return d`
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
        ${e.metrics.cache_read_tokens>0?d`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Read</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_read_tokens)}</span>
              </div>
            `:v}
        ${e.metrics.cache_creation_tokens>0?d`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_creation_tokens)}</span>
              </div>
            `:v}

        <!-- Error message if failed -->
        ${!e.success&&e.error_msg?d`
              <div class="run-error-msg">
                <strong>Error:</strong> ${e.error_msg}
              </div>
            `:v}

        <!-- Collapsible: Output -->
        ${e.output?d`
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
                ${this.expandedSections.has("run-output")?d`
                      <div class="run-collapsible-content">
                        ${e.output}
                      </div>
                    `:v}
              </div>
            `:v}

        <!-- Collapsible: Thinking -->
        ${e.thinking?d`
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
                ${this.expandedSections.has("run-thinking")?d`
                      <div class="run-collapsible-content">
                        ${e.thinking}
                      </div>
                    `:v}
              </div>
            `:v}

        <!-- Collapsible: Tools Log -->
        ${e.tools&&e.tools.length>0?d`
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
                ${this.expandedSections.has("run-tools")?d`
                      <ul class="tools-list">
                        ${e.tools.map(t=>this.renderToolItem(t))}
                      </ul>
                    `:v}
              </div>
            `:v}

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
    `}renderToolItem(e){return d`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?d`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:v}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?d`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`:v}
      </li>
    `}renderRunTab(){var e;return((e=this.tick)==null?void 0:e.type)!=="task"?d`
        <div class="run-tab-empty">
          <sl-icon name="info-circle"></sl-icon>
          <div class="empty-message">Run data is only available for tasks.</div>
        </div>
      `:d`
      <div class="run-tab-content">
        <run-record
          .record=${this.runRecord}
          .loading=${this.loadingRunRecord}
          .error=${this.runRecordError}
        ></run-record>
      </div>
    `}shouldShowRunTab(){var e,t;return((e=this.tick)==null?void 0:e.type)==="task"&&((t=this.tick)==null?void 0:t.status)==="closed"}renderDetailsContent(){const e=this.tick;return e?d`
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
            ${e.manual?d`<span class="meta-badge manual">👤 Manual</span>`:v}
            ${e.awaiting?d`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:v}
            ${e.verdict?d`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:v}
            ${this.blockerDetails&&this.blockerDetails.length>0?d`<span class="meta-badge blocked">⊘ Blocked</span>`:v}
          </div>

          <!-- Started time for in_progress ticks -->
          ${e.status==="in_progress"&&e.started_at?d`
                <div class="started-time">
                  Started: ${this.formatStartedAt(e.started_at)}
                </div>
              `:v}
        </div>

        <!-- Actions (approve/reject/close/reopen) -->
        ${this.renderActions()}

        <!-- Description -->
        <div class="section">
          <div class="section-title">Description</div>
          ${e.description?d`<div class="description">${e.description}</div>`:d`<span class="empty-text">No description</span>`}
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
          ${e.closed_at?d`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(e.closed_at)}</span
                  >
                </div>
              `:v}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?d`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:v}
      </div>
    `:v}render(){const e=this.tick,t=this.shouldShowRunTab();return d`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?t?d`
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
              `:this.renderDetailsContent():d`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};U.styles=$`
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
  `;q([h({attribute:!1})],U.prototype,"tick",2);q([h({type:Boolean})],U.prototype,"open",2);q([h({attribute:!1})],U.prototype,"notesList",2);q([h({attribute:!1})],U.prototype,"blockerDetails",2);q([h({type:String,attribute:"parent-title"})],U.prototype,"parentTitle",2);q([h({type:Boolean,attribute:"readonly-mode"})],U.prototype,"readonlyMode",2);q([w()],U.prototype,"loading",2);q([w()],U.prototype,"errorMessage",2);q([w()],U.prototype,"showRejectInput",2);q([w()],U.prototype,"showCloseInput",2);q([w()],U.prototype,"rejectReason",2);q([w()],U.prototype,"closeReason",2);q([w()],U.prototype,"newNoteText",2);q([w()],U.prototype,"addingNote",2);q([w()],U.prototype,"addNoteError",2);q([w()],U.prototype,"optimisticNote",2);q([w()],U.prototype,"runRecord",2);q([w()],U.prototype,"loadingRunRecord",2);q([w()],U.prototype,"runRecordError",2);q([w()],U.prototype,"expandedSections",2);q([w()],U.prototype,"activeTab",2);U=q([me("tick-detail-drawer")],U);var Au=Object.defineProperty,Ou=Object.getOwnPropertyDescriptor,$e=(e,t,i,s)=>{for(var r=s>1?void 0:s?Ou(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Au(t,i,r),r};const Iu=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],Du=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let pe=class extends oe{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleAwaitingChange(e){const t=e.target;this.awaiting=t.value}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent),this.awaiting&&(e.awaiting=this.awaiting);try{const i=await Qa(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(s=>s.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof Ba?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return d`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?d`<div class="error-message">${this.error}</div>`:v}

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
              ${Iu.map(e=>d`
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
              ${Du.map(e=>d`
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
            ${this.epics.map(e=>d`
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
    `}};pe.styles=$`
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
  `;$e([h({type:Boolean})],pe.prototype,"open",2);$e([h({type:Array,attribute:!1})],pe.prototype,"epics",2);$e([w()],pe.prototype,"loading",2);$e([w()],pe.prototype,"error",2);$e([w()],pe.prototype,"tickTitle",2);$e([w()],pe.prototype,"tickDescription",2);$e([w()],pe.prototype,"type",2);$e([w()],pe.prototype,"priority",2);$e([w()],pe.prototype,"parent",2);$e([w()],pe.prototype,"labels",2);$e([w()],pe.prototype,"awaiting",2);$e([C('sl-input[name="title"]')],pe.prototype,"titleInput",2);pe=$e([me("tick-create-dialog")],pe);var Mu=Object.defineProperty,Pu=Object.getOwnPropertyDescriptor,fo=(e,t,i,s)=>{for(var r=s>1?void 0:s?Pu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Mu(t,i,r),r};const Lu=5e3;let Fu=0;function Nu(){return`toast-${++Fu}-${Date.now()}`}let Ki=class extends oe{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:Nu(),message:e.message,variant:e.variant??"primary",duration:e.duration??Lu};if(this.toasts=[...this.toasts,t],t.duration>0){const i=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,i)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(i=>i.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return d`
      ${this.toasts.map(e=>d`
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
    `}};Ki.styles=$`
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
  `;fo([w()],Ki.prototype,"toasts",2);Ki=fo([me("tick-toast-stack")],Ki);var Bu=Object.defineProperty,Hu=Object.getOwnPropertyDescriptor,Vt=(e,t,i,s)=>{for(var r=s>1?void 0:s?Hu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Bu(t,i,r),r};let bt=class extends oe{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(Pe.get()){this.loading=!1;return}try{this.activities=await hr(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,i=e.actor,s=e.data||{};switch(t){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return s.reason?`${i} closed: ${s.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${s.to||"someone"}`;case"awaiting":return`Waiting for ${s.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),s=new Date().getTime()-t.getTime(),r=Math.floor(s/1e3),a=Math.floor(r/60),o=Math.floor(a/60),n=Math.floor(o/24);return r<60?"just now":a<60?`${a}m ago`:o<24?`${o}h ago`:n<7?`${n}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return d`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?d`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:v}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?d`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:v}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading?d`<div class="loading-state">Loading...</div>`:this.activities.length===0?d`<div class="empty-state">No recent activity</div>`:this.activities.map(e=>d`
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
    `}};bt.styles=$`
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
  `;Vt([C("sl-dropdown")],bt.prototype,"dropdown",2);Vt([w()],bt.prototype,"activities",2);Vt([w()],bt.prototype,"loading",2);Vt([w()],bt.prototype,"unreadCount",2);Vt([w()],bt.prototype,"lastSeenTimestamp",2);bt=Vt([me("tick-activity-feed")],bt);var ju=Object.defineProperty,Uu=Object.getOwnPropertyDescriptor,Be=(e,t,i,s)=>{for(var r=s>1?void 0:s?Uu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&ju(t,i,r),r};const na="run-output-pane-active-tab",la={30:"ansi-black",31:"ansi-red",32:"ansi-green",33:"ansi-yellow",34:"ansi-blue",35:"ansi-magenta",36:"ansi-cyan",37:"ansi-white",90:"ansi-bright-black",91:"ansi-bright-red",92:"ansi-bright-green",93:"ansi-bright-yellow",94:"ansi-bright-blue",95:"ansi-bright-magenta",96:"ansi-bright-cyan",97:"ansi-bright-white",40:"ansi-bg-black",41:"ansi-bg-red",42:"ansi-bg-green",43:"ansi-bg-yellow",44:"ansi-bg-blue",45:"ansi-bg-magenta",46:"ansi-bg-cyan",47:"ansi-bg-white"},ca={1:"ansi-bold",2:"ansi-dim",3:"ansi-italic",4:"ansi-underline"};let ke=class extends oe{constructor(){super(...arguments),this.epicId="",this.autoScroll=!0,this.lines=[],this.connectionStatus="disconnected",this.activeTaskId=null,this.activeTool=null,this.lastOutput="",this.activeTab="output",this.unregisterAdapter=null,this.userScrolled=!1}connectedCallback(){super.connectedCallback();const e=localStorage.getItem(na);(e==="output"||e==="context")&&(this.activeTab=e),this.epicId&&this.connect()}disconnectedCallback(){super.disconnectedCallback(),this.disconnect()}updated(e){e.has("epicId")&&(this.disconnect(),this.epicId&&this.connect())}connect(){this.disconnect(),this.connectionStatus="connecting";const e={onEvent:r=>this.handleRunEvent(r),onConnected:()=>{this.connectionStatus="connected",this.addStatusLine(`Connected to run stream for epic ${this.epicId}`)},onDisconnected:()=>{this.connectionStatus="disconnected"},onError:r=>{console.error("[RunOutputPane] Stream error:",r)}},t=dr(this.epicId),i=nr(r=>{if(r.epicId!==this.epicId)return;const a=this.convertCommsRunEvent(r);a&&this.handleRunEvent(a)}),s=qa(r=>{if(r.epicId!==this.epicId)return;const a=this.convertCommsContextEvent(r);a&&this.handleRunEvent(a)});if(this.unregisterAdapter=()=>{t(),i(),s()},et.get()==="connected")e.onConnected();else{const r=et.subscribe(o=>{o==="connected"?e.onConnected():o==="disconnected"&&e.onDisconnected()}),a=this.unregisterAdapter;this.unregisterAdapter=()=>{a==null||a(),r()}}}convertCommsRunEvent(e){const i={"run:task-started":"task-started","run:task-update":"task-update","run:task-completed":"task-completed","run:tool-activity":"tool-activity","run:epic-started":"epic-started","run:epic-completed":"epic-completed"}[e.type];if(!i)return null;const s={epicId:e.epicId,taskId:e.taskId,source:"ralph",eventType:i,timestamp:e.timestamp};switch(e.type){case"run:task-started":return{...s,eventType:"task-started",status:e.status,numTurns:e.numTurns,metrics:e.metrics};case"run:task-update":return{...s,eventType:"task-update",output:e.output,status:e.status,numTurns:e.numTurns,metrics:e.metrics,activeTool:e.activeTool};case"run:task-completed":return{...s,eventType:"task-completed",success:e.success,numTurns:e.numTurns,metrics:e.metrics};case"run:tool-activity":return{...s,eventType:"tool-activity",activeTool:e.tool};case"run:epic-started":return{...s,eventType:"epic-started",status:e.status,message:e.message};case"run:epic-completed":return{...s,eventType:"epic-completed",success:e.success};default:return null}}convertCommsContextEvent(e){const t={epicId:e.epicId,source:"ralph",timestamp:new Date().toISOString()};switch(e.type){case"context:generating":return{...t,eventType:"context-generating"};case"context:generated":return{...t,eventType:"context-generated"};case"context:loaded":return{...t,eventType:"context-loaded"};case"context:failed":return{...t,eventType:"context-failed",message:e.message};case"context:skipped":return{...t,eventType:"context-skipped",message:e.reason};default:return null}}handleRunEvent(e){var t;switch(e.eventType){case"connected":break;case"task-started":this.activeTaskId=e.taskId||null,this.lastOutput="",this.addStatusLine(`Task ${e.taskId} started (iteration ${e.iteration??1})`);break;case"task-update":if(e.taskId&&e.taskId!==this.activeTaskId&&(this.activeTaskId=e.taskId),this.activeTool=((t=e.activeTool)==null?void 0:t.name)||null,e.output&&e.output!==this.lastOutput){const s=e.output.slice(this.lastOutput.length);s&&this.addOutputLines(s),this.lastOutput=e.output}break;case"tool-activity":e.activeTool&&(this.activeTool=e.activeTool.name,this.addToolLine(`⚙ ${e.activeTool.name}`));break;case"task-completed":const i=e.success?"✓ completed":"✗ failed";this.addStatusLine(`Task ${e.taskId} ${i}`),this.activeTaskId===e.taskId&&(this.activeTaskId=null,this.activeTool=null,this.lastOutput="");break;case"epic-started":this.addStatusLine(`Epic ${e.epicId} started (${e.source})`);break;case"epic-completed":this.addStatusLine(`Epic completed: ${e.success?"success":"failed"}`),this.activeTaskId=null,this.activeTool=null;break;case"context-generating":this.addStatusLine("📚 Generating epic context...");break;case"context-generated":this.addStatusLine("✓ Context generated");break;case"context-loaded":this.addStatusLine("📖 Using existing context");break;case"context-failed":this.addStatusLine(`⚠ Context generation failed: ${e.message??"unknown error"}`);break;case"context-skipped":this.addStatusLine(`⏭ Context skipped: ${e.message??"single-task epic"}`);break}}disconnect(){this.unregisterAdapter&&(this.unregisterAdapter(),this.unregisterAdapter=null)}addStatusLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"status"}],this.scrollToBottom()}addToolLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"tool"}],this.scrollToBottom()}addOutputLines(e){const t=new Date,i=e.split(`
`).filter(s=>s.length>0).map(s=>({timestamp:t,content:s.trimStart(),type:"output"}));i.length>0&&(this.lines=[...this.lines,...i],this.scrollToBottom())}scrollToBottom(){!this.autoScroll||this.userScrolled||requestAnimationFrame(()=>{this.outputContainer&&(this.outputContainer.scrollTop=this.outputContainer.scrollHeight)})}handleScroll(){if(!this.outputContainer)return;const{scrollTop:e,scrollHeight:t,clientHeight:i}=this.outputContainer,s=t-e-i<20;this.userScrolled=!s}toggleAutoScroll(){this.autoScroll=!this.autoScroll,this.autoScroll&&(this.userScrolled=!1,this.scrollToBottom())}handleTabShow(e){const t=e.detail.name;this.activeTab=t,localStorage.setItem(na,t)}clearOutput(){this.lines=[],this.lastOutput="",this.userScrolled=!1}async copyOutput(){const e=this.lines.map(t=>`[${this.formatTimestamp(t.timestamp)}] ${t.content}`).join(`
`);try{await navigator.clipboard.writeText(e),window.showToast&&window.showToast({message:"Output copied to clipboard",variant:"success"})}catch(t){console.error("Failed to copy output:",t)}}formatTimestamp(e){return e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}ansiToHtml(e){let t=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const i=[],s=/\x1b\[([0-9;]*)m/g;return t=t.replace(s,(r,a)=>{let o=i.length>0?"</span>":"";i.length=0;const n=a?a.split(";").map(Number):[0];for(const u of n)u===0?i.length=0:la[u]?i.push(la[u]):ca[u]&&i.push(ca[u]);return i.length>0&&(o+=`<span class="${i.join(" ")}">`),o}),i.length>0&&(t+="</span>"),t}getStatusText(){switch(this.connectionStatus){case"connected":return"Connected";case"connecting":return"Connecting...";case"disconnected":return"Disconnected"}}renderOutputContent(){return d`
      <div
        class="output-container"
        @scroll=${this.handleScroll}
      >
        ${this.lines.length===0?d`
              <div class="empty-state">
                <sl-icon name="terminal"></sl-icon>
                <p>No output yet. Connect to an epic to see agent output.</p>
              </div>
            `:this.lines.map(e=>d`
              <div class="output-line">
                <span class="line-timestamp">${this.formatTimestamp(e.timestamp)}</span>
                <span class="line-content ${e.type}">
                  ${e.type==="output"?sr(this.ansiToHtml(e.content)):e.content}
                </span>
              </div>
            `)}
      </div>
    `}render(){return d`
      <div class="output-pane">
        <div class="pane-header">
          <div class="header-left">
            <div class="connection-status">
              <span class="status-indicator ${this.connectionStatus}"></span>
              <span>${this.getStatusText()}</span>
            </div>
          </div>
          <div class="header-actions">
            ${this.activeTab==="output"?d`
              <div
                class="auto-scroll-toggle ${this.autoScroll?"active":""}"
                @click=${this.toggleAutoScroll}
                title="Auto-scroll to bottom"
              >
                <sl-icon name="arrow-down-circle${this.autoScroll?"-fill":""}"></sl-icon>
                Auto
              </div>
              <sl-icon-button
                name="clipboard"
                label="Copy output"
                @click=${this.copyOutput}
              ></sl-icon-button>
              <sl-icon-button
                name="trash"
                label="Clear output"
                @click=${this.clearOutput}
              ></sl-icon-button>
            `:v}
          </div>
        </div>

        <div class="tab-container">
          <sl-tab-group @sl-tab-show=${this.handleTabShow}>
            <sl-tab slot="nav" panel="output" ?active=${this.activeTab==="output"}>Output</sl-tab>
            <sl-tab slot="nav" panel="context" ?active=${this.activeTab==="context"}>Context</sl-tab>

            <sl-tab-panel name="output">
              ${this.renderOutputContent()}
            </sl-tab-panel>

            <sl-tab-panel name="context">
              <context-pane .epicId=${this.epicId}></context-pane>
            </sl-tab-panel>
          </sl-tab-group>
        </div>

        ${this.activeTab==="output"&&(this.activeTaskId||this.activeTool)?d`
              <div class="pane-footer">
                <div class="active-task">
                  ${this.activeTaskId?d`
                        <span class="active-task-label">Task:</span>
                        <span class="active-task-id">${this.activeTaskId}</span>
                      `:v}
                  ${this.activeTool?d`
                        <span class="active-tool">
                          <sl-icon name="gear"></sl-icon>
                          ${this.activeTool}
                        </span>
                      `:v}
                </div>
                <span class="line-count">${this.lines.length} lines</span>
              </div>
            `:v}
      </div>
    `}};ke.styles=$`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .output-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--crust, #11111b);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header */
    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pane-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--overlay0, #6c7086);
    }

    .status-indicator.connected {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 6px var(--green, #a6e3a1);
    }

    .status-indicator.connecting {
      background: var(--yellow, #f9e2af);
      animation: pulse 1s ease-in-out infinite;
    }

    .status-indicator.disconnected {
      background: var(--red, #f38ba8);
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .header-actions sl-icon-button::part(base) {
      color: var(--subtext0, #a6adc8);
      font-size: 1rem;
    }

    .header-actions sl-icon-button::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    .auto-scroll-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .auto-scroll-toggle:hover {
      background: var(--surface0, #313244);
    }

    .auto-scroll-toggle.active {
      color: var(--blue, #89b4fa);
    }

    /* Output content */
    .output-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      padding: 0.5rem;
    }

    .output-container::-webkit-scrollbar {
      width: 8px;
    }

    .output-container::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .output-container::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 4px;
    }

    .output-container::-webkit-scrollbar-thumb:hover {
      background: var(--surface2, #585b70);
    }

    .output-line {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.125rem 0;
    }

    .line-timestamp {
      flex-shrink: 0;
      min-width: 5.5rem;
      font-size: 0.6875rem;
      color: var(--overlay0, #6c7086);
      font-variant-numeric: tabular-nums;
      user-select: none;
    }

    .line-content {
      flex: 1;
      white-space: pre-line;
      word-break: break-word;
      color: var(--text, #cdd6f4);
      text-align: left;
      min-width: 0;
    }

    .line-content.status {
      color: var(--blue, #89b4fa);
      font-style: italic;
    }

    .line-content.tool {
      color: var(--mauve, #cba6f7);
    }

    .line-content.error {
      color: var(--red, #f38ba8);
    }

    /* ANSI color classes - Catppuccin Mocha palette */
    .ansi-black { color: var(--surface1, #45475a); }
    .ansi-red { color: var(--red, #f38ba8); }
    .ansi-green { color: var(--green, #a6e3a1); }
    .ansi-yellow { color: var(--yellow, #f9e2af); }
    .ansi-blue { color: var(--blue, #89b4fa); }
    .ansi-magenta { color: var(--pink, #f5c2e7); }
    .ansi-cyan { color: var(--teal, #94e2d5); }
    .ansi-white { color: var(--text, #cdd6f4); }

    .ansi-bright-black { color: var(--overlay0, #6c7086); }
    .ansi-bright-red { color: var(--maroon, #eba0ac); }
    .ansi-bright-green { color: var(--green, #a6e3a1); }
    .ansi-bright-yellow { color: var(--yellow, #f9e2af); }
    .ansi-bright-blue { color: var(--sapphire, #74c7ec); }
    .ansi-bright-magenta { color: var(--mauve, #cba6f7); }
    .ansi-bright-cyan { color: var(--sky, #89dceb); }
    .ansi-bright-white { color: var(--text, #cdd6f4); }

    .ansi-bg-black { background: var(--surface1, #45475a); }
    .ansi-bg-red { background: var(--red, #f38ba8); }
    .ansi-bg-green { background: var(--green, #a6e3a1); }
    .ansi-bg-yellow { background: var(--yellow, #f9e2af); }
    .ansi-bg-blue { background: var(--blue, #89b4fa); }
    .ansi-bg-magenta { background: var(--pink, #f5c2e7); }
    .ansi-bg-cyan { background: var(--teal, #94e2d5); }
    .ansi-bg-white { background: var(--text, #cdd6f4); }

    .ansi-bold { font-weight: 700; }
    .ansi-dim { opacity: 0.7; }
    .ansi-italic { font-style: italic; }
    .ansi-underline { text-decoration: underline; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      color: var(--subtext0, #a6adc8);
      text-align: center;
    }

    .empty-state sl-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Collapsed view */
    :host([collapsed]) {
      flex: none;
    }

    :host([collapsed]) .output-pane {
      flex: none;
    }

    :host([collapsed]) .output-container {
      max-height: 120px;
    }

    /* Footer with active task info */
    .pane-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: var(--mantle, #181825);
      border-top: 1px solid var(--surface0, #313244);
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .active-task {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-task-label {
      color: var(--subtext1, #bac2de);
    }

    .active-task-id {
      font-family: monospace;
      color: var(--blue, #89b4fa);
    }

    .active-tool {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem 0.375rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      color: var(--mauve, #cba6f7);
    }

    .line-count {
      font-variant-numeric: tabular-nums;
    }

    /* Tab container and styling */
    .tab-container {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    sl-tab-group {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(base) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    sl-tab-group::part(nav) {
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface0, #313244);
    }

    sl-tab-group::part(tabs) {
      padding: 0 0.5rem;
    }

    sl-tab-group::part(body) {
      flex: 1;
      overflow: hidden;
    }

    sl-tab::part(base) {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    sl-tab::part(base):hover {
      color: var(--text, #cdd6f4);
    }

    sl-tab[active]::part(base) {
      color: var(--blue, #89b4fa);
    }

    sl-tab-panel {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    sl-tab-panel::part(base) {
      height: 100%;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
  `;Be([h({type:String,attribute:"epic-id"})],ke.prototype,"epicId",2);Be([h({type:Boolean,attribute:"auto-scroll"})],ke.prototype,"autoScroll",2);Be([w()],ke.prototype,"lines",2);Be([w()],ke.prototype,"connectionStatus",2);Be([w()],ke.prototype,"activeTaskId",2);Be([w()],ke.prototype,"activeTool",2);Be([w()],ke.prototype,"lastOutput",2);Be([w()],ke.prototype,"activeTab",2);Be([C(".output-container")],ke.prototype,"outputContainer",2);Be([C("context-pane")],ke.prototype,"contextPane",2);ke=Be([me("run-output-pane")],ke);var Vu=Object.defineProperty,Wu=Object.getOwnPropertyDescriptor,bs=(e,t,i,s)=>{for(var r=s>1?void 0:s?Wu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Vu(t,i,r),r};const qu={Read:"file-earmark-text",Write:"file-earmark-plus",Edit:"pencil-square",Bash:"terminal",Glob:"search",Grep:"file-earmark-code",Task:"list-task",WebFetch:"globe",WebSearch:"search",TodoWrite:"check2-square",AskUserQuestion:"chat-left-dots",NotebookEdit:"journal-code",KillShell:"x-circle",TaskOutput:"box-arrow-right",Skill:"lightning",EnterPlanMode:"map",ExitPlanMode:"check2-circle"},Yu={Read:"var(--blue, #89b4fa)",Write:"var(--green, #a6e3a1)",Edit:"var(--yellow, #f9e2af)",Bash:"var(--peach, #fab387)",Glob:"var(--teal, #94e2d5)",Grep:"var(--sapphire, #74c7ec)",Task:"var(--mauve, #cba6f7)",WebFetch:"var(--sky, #89dceb)",WebSearch:"var(--sky, #89dceb)",TodoWrite:"var(--lavender, #b4befe)",AskUserQuestion:"var(--pink, #f5c2e7)",NotebookEdit:"var(--flamingo, #f2cdcd)",KillShell:"var(--red, #f38ba8)",TaskOutput:"var(--rosewater, #f5e0dc)",Skill:"var(--maroon, #eba0ac)",EnterPlanMode:"var(--lavender, #b4befe)",ExitPlanMode:"var(--green, #a6e3a1)"};let Ft=class extends oe{constructor(){super(...arguments),this.activity=null,this.expanded=!1,this.elapsedMs=0,this.timerInterval=null}connectedCallback(){super.connectedCallback(),this.startTimer()}disconnectedCallback(){super.disconnectedCallback(),this.stopTimer()}updated(e){e.has("activity")&&this.updateTimer()}startTimer(){this.timerInterval||(this.timerInterval=setInterval(()=>{if(this.activity&&!this.activity.isComplete&&this.activity.startedAt){const e=this.activity.startedAt instanceof Date?this.activity.startedAt.getTime():new Date(this.activity.startedAt).getTime();this.elapsedMs=Date.now()-e}},100))}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}updateTimer(){var e;(e=this.activity)!=null&&e.isComplete?(this.stopTimer(),this.activity.durationMs!==void 0&&(this.elapsedMs=this.activity.durationMs)):this.activity&&!this.timerInterval&&this.startTimer()}getToolIcon(e){return qu[e]??"gear"}getToolColor(e){return Yu[e]??"var(--mauve, #cba6f7)"}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3),i=e%1e3;if(t<60)return`${t}.${Math.floor(i/100)}s`;const s=Math.floor(t/60),r=t%60;return`${s}m ${r}s`}truncateInput(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}getStatusClass(){return this.activity?this.activity.isError?"error":this.activity.isComplete?"complete":"running":""}renderCompact(){const{activity:e}=this;if(!e)return d`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),i=this.getStatusClass(),s=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return d`
      <div class="tool-compact ${i}" style="--tool-color: ${t}">
        <span class="tool-icon">
          <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
        </span>
        <span class="tool-name">${e.name}</span>
        ${e.input?d`<span class="tool-input-preview">${this.truncateInput(e.input)}</span>`:v}
        ${s>0?d`<span class="tool-duration">${this.formatDuration(s)}</span>`:v}
        ${e.isComplete?d`
              <span class="tool-status-icon ${e.isError?"error":"success"}">
                <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
              </span>
            `:d`
              <span class="tool-spinner">
                <sl-spinner></sl-spinner>
              </span>
            `}
      </div>
    `}renderExpanded(){const{activity:e}=this;if(!e)return d`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),i=this.getStatusClass(),s=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return d`
      <div class="tool-expanded ${i}" style="--tool-color: ${t}">
        <div class="tool-header">
          <span class="tool-icon">
            <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
          </span>
          <span class="tool-name">${e.name}</span>
          ${e.isComplete?d`
                <span class="tool-status-icon ${e.isError?"error":"success"}">
                  <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
                </span>
              `:d`
                <span class="tool-spinner">
                  <sl-spinner></sl-spinner>
                </span>
              `}
          ${s>0?d`<span class="tool-duration">${this.formatDuration(s)}</span>`:v}
        </div>
        <div class="tool-body">
          ${e.input?d`
                <div class="tool-section">
                  <div class="tool-section-label">Input</div>
                  <div class="tool-section-content">${e.input}</div>
                </div>
              `:v}
          ${e.output?d`
                <div class="tool-section">
                  <div class="tool-section-label">Output</div>
                  <div class="tool-section-content ${e.isError?"error-content":""}">${e.output}</div>
                </div>
              `:v}
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};Ft.styles=$`
    :host {
      display: block;
    }

    /* Compact inline view */
    .tool-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
      max-width: 100%;
      overflow: hidden;
    }

    .tool-compact.running {
      border: 1px solid var(--surface1, #45475a);
    }

    .tool-compact.complete {
      background: rgba(166, 227, 161, 0.15);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .tool-compact.error {
      background: rgba(243, 139, 168, 0.15);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .tool-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .tool-icon sl-icon {
      font-size: 0.875rem;
    }

    .tool-name {
      font-weight: 500;
      color: var(--tool-color, var(--mauve, #cba6f7));
      flex-shrink: 0;
    }

    .tool-input-preview {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--subtext0, #a6adc8);
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.6875rem;
    }

    .tool-duration {
      flex-shrink: 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
      color: var(--subtext0, #a6adc8);
    }

    .tool-spinner {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
    }

    .tool-spinner sl-spinner {
      font-size: 12px;
      --track-width: 2px;
      --indicator-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-status-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .tool-status-icon.success sl-icon {
      color: var(--green, #a6e3a1);
    }

    .tool-status-icon.error sl-icon {
      color: var(--red, #f38ba8);
    }

    /* Expanded view */
    .tool-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .tool-expanded.running {
      border-color: var(--tool-color, var(--mauve, #cba6f7));
    }

    .tool-expanded.complete {
      border-color: var(--green, #a6e3a1);
    }

    .tool-expanded.error {
      border-color: var(--red, #f38ba8);
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .tool-header .tool-name {
      font-size: 0.875rem;
    }

    .tool-header .tool-duration {
      margin-left: auto;
      font-size: 0.75rem;
    }

    .tool-body {
      padding: 0.75rem;
    }

    .tool-section {
      margin-bottom: 0.75rem;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.375rem;
    }

    .tool-section-content {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--text, #cdd6f4);
      background: var(--crust, #11111b);
      padding: 0.5rem;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }

    .tool-section-content::-webkit-scrollbar {
      width: 6px;
    }

    .tool-section-content::-webkit-scrollbar-track {
      background: var(--crust, #11111b);
    }

    .tool-section-content::-webkit-scrollbar-thumb {
      background: var(--surface1, #45475a);
      border-radius: 3px;
    }

    .tool-section-content.error-content {
      color: var(--red, #f38ba8);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .empty-state sl-icon {
      font-size: 1rem;
      opacity: 0.5;
    }
  `;bs([h({attribute:!1})],Ft.prototype,"activity",2);bs([h({type:Boolean})],Ft.prototype,"expanded",2);bs([w()],Ft.prototype,"elapsedMs",2);Ft=bs([me("tool-activity")],Ft);var Ku=Object.defineProperty,Gu=Object.getOwnPropertyDescriptor,wi=(e,t,i,s)=>{for(var r=s>1?void 0:s?Gu(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Ku(t,i,r),r};let $t=class extends oe{constructor(){super(...arguments),this.metrics=null,this.model="",this.live=!1,this.expanded=!1}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const i=Math.floor(t/60),s=t%60;return`${i}m ${s}s`}getTotalTokens(){return this.metrics?this.metrics.inputTokens+this.metrics.outputTokens+this.metrics.cacheReadTokens+this.metrics.cacheCreationTokens:0}getTokenPercentage(e){const t=this.getTotalTokens();return t===0?0:e/t*100}renderCompact(){if(!this.metrics)return d`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics</span>
        </div>
      `;const e=this.getTotalTokens();return d`
      <div class="metrics-compact ${this.live?"live":""}">
        <span class="metric-item">
          <sl-icon name="cpu"></sl-icon>
          <span class="metric-value">${this.formatTokenCount(e)}</span>
          <span>tokens</span>
        </span>
        <span class="metric-separator">•</span>
        <span class="metric-item">
          <span class="metric-value cost-value">${this.formatCost(this.metrics.costUsd)}</span>
        </span>
        ${this.model?d`
              <span class="metric-separator">•</span>
              <span class="model-badge">${this.model}</span>
            `:v}
      </div>
    `}renderExpanded(){if(!this.metrics)return d`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics available</span>
        </div>
      `;const{inputTokens:e,outputTokens:t,cacheReadTokens:i,cacheCreationTokens:s,costUsd:r,durationMs:a}=this.metrics,o=this.getTotalTokens();return d`
      <div class="metrics-expanded ${this.live?"live":""}">
        <div class="metrics-header">
          <div class="metrics-title">
            <sl-icon name="bar-chart"></sl-icon>
            <span>Token Usage</span>
          </div>
          ${this.live?d`
                <div class="live-indicator">
                  <span class="pulse"></span>
                  <span>Live</span>
                </div>
              `:v}
        </div>
        <div class="metrics-body">
          <!-- Token distribution bar -->
          <div class="token-bar-container">
            <div class="token-bar-label">
              <span>Token Distribution</span>
              <span>${this.formatTokenCount(o)} total</span>
            </div>
            <div class="token-bar">
              <div
                class="token-bar-segment input"
                style="width: ${this.getTokenPercentage(e)}%"
                title="Input: ${this.formatTokenCount(e)}"
              ></div>
              <div
                class="token-bar-segment output"
                style="width: ${this.getTokenPercentage(t)}%"
                title="Output: ${this.formatTokenCount(t)}"
              ></div>
              <div
                class="token-bar-segment cache-read"
                style="width: ${this.getTokenPercentage(i)}%"
                title="Cache Read: ${this.formatTokenCount(i)}"
              ></div>
              <div
                class="token-bar-segment cache-creation"
                style="width: ${this.getTokenPercentage(s)}%"
                title="Cache Creation: ${this.formatTokenCount(s)}"
              ></div>
            </div>
          </div>

          <!-- Token breakdown grid -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot input"></span>
                Input
              </div>
              <div class="metric-card-value">${this.formatTokenCount(e)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot output"></span>
                Output
              </div>
              <div class="metric-card-value">${this.formatTokenCount(t)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-read"></span>
                Cache Read
              </div>
              <div class="metric-card-value">${this.formatTokenCount(i)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-creation"></span>
                Cache Create
              </div>
              <div class="metric-card-value">${this.formatTokenCount(s)}</div>
            </div>
          </div>

          <!-- Summary row -->
          <div class="metrics-summary">
            <div class="summary-item">
              <div class="summary-label">Cost</div>
              <div class="summary-value cost">${this.formatCost(r)}</div>
            </div>
            ${a!==void 0?d`
                  <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value duration">${this.formatDuration(a)}</div>
                  </div>
                `:v}
            ${this.model?d`
                  <div class="summary-item">
                    <div class="summary-label">Model</div>
                    <div class="summary-value model">${this.model}</div>
                  </div>
                `:v}
          </div>
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};$t.styles=$`
    :host {
      display: block;
    }

    /* Compact view */
    .metrics-compact {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext1, #bac2de);
    }

    .metrics-compact.live {
      border: 1px solid var(--blue, #89b4fa);
      background: rgba(137, 180, 250, 0.1);
    }

    .metric-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .metric-item sl-icon {
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .metric-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-variant-numeric: tabular-nums;
    }

    .metric-separator {
      color: var(--overlay0, #6c7086);
    }

    .cost-value {
      color: var(--green, #a6e3a1);
      font-weight: 500;
    }

    .model-badge {
      padding: 0.125rem 0.375rem;
      background: var(--surface1, #45475a);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    /* Expanded view */
    .metrics-expanded {
      background: var(--surface0, #313244);
      border: 1px solid var(--surface1, #45475a);
      border-radius: 8px;
      overflow: hidden;
    }

    .metrics-expanded.live {
      border-color: var(--blue, #89b4fa);
    }

    .metrics-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--mantle, #181825);
      border-bottom: 1px solid var(--surface1, #45475a);
    }

    .metrics-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .metrics-title sl-icon {
      font-size: 1rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: rgba(137, 180, 250, 0.2);
      border-radius: 4px;
      font-size: 0.6875rem;
      color: var(--blue, #89b4fa);
    }

    .live-indicator .pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--blue, #89b4fa);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .metrics-body {
      padding: 0.75rem;
    }

    /* Token bar visualization */
    .token-bar-container {
      margin-bottom: 0.75rem;
    }

    .token-bar-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
    }

    .token-bar {
      height: 8px;
      background: var(--crust, #11111b);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }

    .token-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .token-bar-segment.input {
      background: var(--blue, #89b4fa);
    }

    .token-bar-segment.output {
      background: var(--green, #a6e3a1);
    }

    .token-bar-segment.cache-read {
      background: var(--teal, #94e2d5);
    }

    .token-bar-segment.cache-creation {
      background: var(--mauve, #cba6f7);
    }

    /* Metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .metric-card {
      padding: 0.5rem;
      background: var(--mantle, #181825);
      border-radius: 4px;
    }

    .metric-card-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.25rem;
    }

    .metric-card-label .dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }

    .metric-card-label .dot.input { background: var(--blue, #89b4fa); }
    .metric-card-label .dot.output { background: var(--green, #a6e3a1); }
    .metric-card-label .dot.cache-read { background: var(--teal, #94e2d5); }
    .metric-card-label .dot.cache-creation { background: var(--mauve, #cba6f7); }

    .metric-card-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text, #cdd6f4);
    }

    /* Summary row */
    .metrics-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--surface1, #45475a);
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-bottom: 0.125rem;
    }

    .summary-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 0.9375rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .summary-value.cost {
      color: var(--green, #a6e3a1);
    }

    .summary-value.model {
      color: var(--mauve, #cba6f7);
      font-size: 0.75rem;
    }

    .summary-value.duration {
      color: var(--yellow, #f9e2af);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface0, #313244);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--subtext0, #a6adc8);
    }

    .empty-state sl-icon {
      font-size: 1rem;
      opacity: 0.5;
    }
  `;wi([h({attribute:!1})],$t.prototype,"metrics",2);wi([h({type:String})],$t.prototype,"model",2);wi([h({type:Boolean})],$t.prototype,"live",2);wi([h({type:Boolean})],$t.prototype,"expanded",2);$t=wi([me("run-metrics")],$t);function fr(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var zt=fr();function bo(e){zt=e}var ai={exec:()=>null};function R(e,t=""){let i=typeof e=="string"?e:e.source,s={replace:(r,a)=>{let o=typeof a=="string"?a:a.source;return o=o.replace(he.caret,"$1"),i=i.replace(r,o),s},getRegex:()=>new RegExp(i,t)};return s}var Xu=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),he={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,"i")},Qu=/^(?:[ \t]*(?:\n|$))+/,Zu=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Ju=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,ki=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,eh=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,br=/(?:[*+-]|\d{1,9}[.)])/,go=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,vo=R(go).replace(/bull/g,br).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),th=R(go).replace(/bull/g,br).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),gr=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,ih=/^[^\n]+/,vr=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,sh=R(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",vr).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),rh=R(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,br).getRegex(),gs="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",yr=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,ah=R("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",yr).replace("tag",gs).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),yo=R(gr).replace("hr",ki).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",gs).getRegex(),oh=R(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",yo).getRegex(),wr={blockquote:oh,code:Zu,def:sh,fences:Ju,heading:eh,hr:ki,html:ah,lheading:vo,list:rh,newline:Qu,paragraph:yo,table:ai,text:ih},da=R("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",ki).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",gs).getRegex(),nh={...wr,lheading:th,table:da,paragraph:R(gr).replace("hr",ki).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",da).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",gs).getRegex()},lh={...wr,html:R(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",yr).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:ai,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:R(gr).replace("hr",ki).replace("heading",` *#{1,6} *[^
]`).replace("lheading",vo).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},ch=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,dh=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,wo=/^( {2,}|\\)\n(?!\s*$)/,uh=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,vs=/[\p{P}\p{S}]/u,kr=/[\s\p{P}\p{S}]/u,ko=/[^\s\p{P}\p{S}]/u,hh=R(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,kr).getRegex(),xo=/(?!~)[\p{P}\p{S}]/u,ph=/(?!~)[\s\p{P}\p{S}]/u,mh=/(?:[^\s\p{P}\p{S}]|~)/u,fh=R(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Xu?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),_o=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,bh=R(_o,"u").replace(/punct/g,vs).getRegex(),gh=R(_o,"u").replace(/punct/g,xo).getRegex(),Co="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",vh=R(Co,"gu").replace(/notPunctSpace/g,ko).replace(/punctSpace/g,kr).replace(/punct/g,vs).getRegex(),yh=R(Co,"gu").replace(/notPunctSpace/g,mh).replace(/punctSpace/g,ph).replace(/punct/g,xo).getRegex(),wh=R("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,ko).replace(/punctSpace/g,kr).replace(/punct/g,vs).getRegex(),kh=R(/\\(punct)/,"gu").replace(/punct/g,vs).getRegex(),xh=R(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),_h=R(yr).replace("(?:-->|$)","-->").getRegex(),Ch=R("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",_h).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Gi=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,$h=R(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Gi).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),$o=R(/^!?\[(label)\]\[(ref)\]/).replace("label",Gi).replace("ref",vr).getRegex(),To=R(/^!?\[(ref)\](?:\[\])?/).replace("ref",vr).getRegex(),Th=R("reflink|nolink(?!\\()","g").replace("reflink",$o).replace("nolink",To).getRegex(),ua=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,xr={_backpedal:ai,anyPunctuation:kh,autolink:xh,blockSkip:fh,br:wo,code:dh,del:ai,emStrongLDelim:bh,emStrongRDelimAst:vh,emStrongRDelimUnd:wh,escape:ch,link:$h,nolink:To,punctuation:hh,reflink:$o,reflinkSearch:Th,tag:Ch,text:uh,url:ai},Sh={...xr,link:R(/^!?\[(label)\]\((.*?)\)/).replace("label",Gi).getRegex(),reflink:R(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Gi).getRegex()},Vs={...xr,emStrongRDelimAst:yh,emStrongLDelim:gh,url:R(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",ua).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:R(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",ua).getRegex()},Eh={...Vs,br:R(wo).replace("{2,}","*").getRegex(),text:R(Vs.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},zi={normal:wr,gfm:nh,pedantic:lh},Jt={normal:xr,gfm:Vs,breaks:Eh,pedantic:Sh},zh={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ha=e=>zh[e];function Qe(e,t){if(t){if(he.escapeTest.test(e))return e.replace(he.escapeReplace,ha)}else if(he.escapeTestNoEncode.test(e))return e.replace(he.escapeReplaceNoEncode,ha);return e}function pa(e){try{e=encodeURI(e).replace(he.percentDecode,"%")}catch{return null}return e}function ma(e,t){var a;let i=e.replace(he.findPipe,(o,n,u)=>{let c=!1,p=n;for(;--p>=0&&u[p]==="\\";)c=!c;return c?"|":" |"}),s=i.split(he.splitPipe),r=0;if(s[0].trim()||s.shift(),s.length>0&&!((a=s.at(-1))!=null&&a.trim())&&s.pop(),t)if(s.length>t)s.splice(t);else for(;s.length<t;)s.push("");for(;r<s.length;r++)s[r]=s[r].trim().replace(he.slashPipe,"|");return s}function ei(e,t,i){let s=e.length;if(s===0)return"";let r=0;for(;r<s&&e.charAt(s-r-1)===t;)r++;return e.slice(0,s-r)}function Rh(e,t){if(e.indexOf(t[1])===-1)return-1;let i=0;for(let s=0;s<e.length;s++)if(e[s]==="\\")s++;else if(e[s]===t[0])i++;else if(e[s]===t[1]&&(i--,i<0))return s;return i>0?-2:-1}function fa(e,t,i,s,r){let a=t.href,o=t.title||null,n=e[1].replace(r.other.outputLinkReplace,"$1");s.state.inLink=!0;let u={type:e[0].charAt(0)==="!"?"image":"link",raw:i,href:a,title:o,text:n,tokens:s.inlineTokens(n)};return s.state.inLink=!1,u}function Ah(e,t,i){let s=e.match(i.other.indentCodeCompensation);if(s===null)return t;let r=s[1];return t.split(`
`).map(a=>{let o=a.match(i.other.beginningSpace);if(o===null)return a;let[n]=o;return n.length>=r.length?a.slice(r.length):a}).join(`
`)}var Xi=class{constructor(e){N(this,"options");N(this,"rules");N(this,"lexer");this.options=e||zt}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let i=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?i:ei(i,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let i=t[0],s=Ah(i,t[3]||"",this.rules);return{type:"code",raw:i,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:s}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let i=t[2].trim();if(this.rules.other.endingHash.test(i)){let s=ei(i,"#");(this.options.pedantic||!s||this.rules.other.endingSpaceChar.test(s))&&(i=s.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:i,tokens:this.lexer.inline(i)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:ei(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let i=ei(t[0],`
`).split(`
`),s="",r="",a=[];for(;i.length>0;){let o=!1,n=[],u;for(u=0;u<i.length;u++)if(this.rules.other.blockquoteStart.test(i[u]))n.push(i[u]),o=!0;else if(!o)n.push(i[u]);else break;i=i.slice(u);let c=n.join(`
`),p=c.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");s=s?`${s}
${c}`:c,r=r?`${r}
${p}`:p;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,a,!0),this.lexer.state.top=f,i.length===0)break;let b=a.at(-1);if((b==null?void 0:b.type)==="code")break;if((b==null?void 0:b.type)==="blockquote"){let m=b,g=m.raw+`
`+i.join(`
`),y=this.blockquote(g);a[a.length-1]=y,s=s.substring(0,s.length-m.raw.length)+y.raw,r=r.substring(0,r.length-m.text.length)+y.text;break}else if((b==null?void 0:b.type)==="list"){let m=b,g=m.raw+`
`+i.join(`
`),y=this.list(g);a[a.length-1]=y,s=s.substring(0,s.length-b.raw.length)+y.raw,r=r.substring(0,r.length-m.raw.length)+y.raw,i=g.substring(a.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:s,tokens:a,text:r}}}list(e){var i,s;let t=this.rules.block.list.exec(e);if(t){let r=t[1].trim(),a=r.length>1,o={type:"list",raw:"",ordered:a,start:a?+r.slice(0,-1):"",loose:!1,items:[]};r=a?`\\d{1,9}\\${r.slice(-1)}`:`\\${r}`,this.options.pedantic&&(r=a?r:"[*+-]");let n=this.rules.other.listItemRegex(r),u=!1;for(;e;){let p=!1,f="",b="";if(!(t=n.exec(e))||this.rules.block.hr.test(e))break;f=t[0],e=e.substring(f.length);let m=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,_=>" ".repeat(3*_.length)),g=e.split(`
`,1)[0],y=!m.trim(),k=0;if(this.options.pedantic?(k=2,b=m.trimStart()):y?k=t[1].length+1:(k=t[2].search(this.rules.other.nonSpaceChar),k=k>4?1:k,b=m.slice(k),k+=t[1].length),y&&this.rules.other.blankLine.test(g)&&(f+=g+`
`,e=e.substring(g.length+1),p=!0),!p){let _=this.rules.other.nextBulletRegex(k),E=this.rules.other.hrRegex(k),O=this.rules.other.fencesBeginRegex(k),Y=this.rules.other.headingBeginRegex(k),j=this.rules.other.htmlBeginRegex(k);for(;e;){let de=e.split(`
`,1)[0],W;if(g=de,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),W=g):W=g.replace(this.rules.other.tabCharGlobal,"    "),O.test(g)||Y.test(g)||j.test(g)||_.test(g)||E.test(g))break;if(W.search(this.rules.other.nonSpaceChar)>=k||!g.trim())b+=`
`+W.slice(k);else{if(y||m.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||O.test(m)||Y.test(m)||E.test(m))break;b+=`
`+g}!y&&!g.trim()&&(y=!0),f+=de+`
`,e=e.substring(de.length+1),m=W.slice(k)}}o.loose||(u?o.loose=!0:this.rules.other.doubleBlankLine.test(f)&&(u=!0)),o.items.push({type:"list_item",raw:f,task:!!this.options.gfm&&this.rules.other.listIsTask.test(b),loose:!1,text:b,tokens:[]}),o.raw+=f}let c=o.items.at(-1);if(c)c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd();else return;o.raw=o.raw.trimEnd();for(let p of o.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((i=p.tokens[0])==null?void 0:i.type)==="text"||((s=p.tokens[0])==null?void 0:s.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let b=this.lexer.inlineQueue.length-1;b>=0;b--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[b].src)){this.lexer.inlineQueue[b].src=this.lexer.inlineQueue[b].src.replace(this.rules.other.listReplaceTask,"");break}}let f=this.rules.other.listTaskCheckbox.exec(p.raw);if(f){let b={type:"checkbox",raw:f[0]+" ",checked:f[0]!=="[ ]"};p.checked=b.checked,o.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=b.raw+p.tokens[0].raw,p.tokens[0].text=b.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(b)):p.tokens.unshift({type:"paragraph",raw:b.raw,text:b.raw,tokens:[b]}):p.tokens.unshift(b)}}if(!o.loose){let f=p.tokens.filter(m=>m.type==="space"),b=f.length>0&&f.some(m=>this.rules.other.anyLine.test(m.raw));o.loose=b}}if(o.loose)for(let p of o.items){p.loose=!0;for(let f of p.tokens)f.type==="text"&&(f.type="paragraph")}return o}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let i=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),s=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:i,raw:t[0],href:s,title:r}}}table(e){var o;let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let i=ma(t[1]),s=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=(o=t[3])!=null&&o.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],a={type:"table",raw:t[0],header:[],align:[],rows:[]};if(i.length===s.length){for(let n of s)this.rules.other.tableAlignRight.test(n)?a.align.push("right"):this.rules.other.tableAlignCenter.test(n)?a.align.push("center"):this.rules.other.tableAlignLeft.test(n)?a.align.push("left"):a.align.push(null);for(let n=0;n<i.length;n++)a.header.push({text:i[n],tokens:this.lexer.inline(i[n]),header:!0,align:a.align[n]});for(let n of r)a.rows.push(ma(n,a.header.length).map((u,c)=>({text:u,tokens:this.lexer.inline(u),header:!1,align:a.align[c]})));return a}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let i=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:i,tokens:this.lexer.inline(i)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let i=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(i)){if(!this.rules.other.endAngleBracket.test(i))return;let a=ei(i.slice(0,-1),"\\");if((i.length-a.length)%2===0)return}else{let a=Rh(t[2],"()");if(a===-2)return;if(a>-1){let o=(t[0].indexOf("!")===0?5:4)+t[1].length+a;t[2]=t[2].substring(0,a),t[0]=t[0].substring(0,o).trim(),t[3]=""}}let s=t[2],r="";if(this.options.pedantic){let a=this.rules.other.pedanticHrefTitle.exec(s);a&&(s=a[1],r=a[3])}else r=t[3]?t[3].slice(1,-1):"";return s=s.trim(),this.rules.other.startAngleBracket.test(s)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(i)?s=s.slice(1):s=s.slice(1,-1)),fa(t,{href:s&&s.replace(this.rules.inline.anyPunctuation,"$1"),title:r&&r.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let i;if((i=this.rules.inline.reflink.exec(e))||(i=this.rules.inline.nolink.exec(e))){let s=(i[2]||i[1]).replace(this.rules.other.multipleSpaceGlobal," "),r=t[s.toLowerCase()];if(!r){let a=i[0].charAt(0);return{type:"text",raw:a,text:a}}return fa(i,r,i[0],this.lexer,this.rules)}}emStrong(e,t,i=""){let s=this.rules.inline.emStrongLDelim.exec(e);if(!(!s||s[3]&&i.match(this.rules.other.unicodeAlphaNumeric))&&(!(s[1]||s[2])||!i||this.rules.inline.punctuation.exec(i))){let r=[...s[0]].length-1,a,o,n=r,u=0,c=s[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(c.lastIndex=0,t=t.slice(-1*e.length+r);(s=c.exec(t))!=null;){if(a=s[1]||s[2]||s[3]||s[4]||s[5]||s[6],!a)continue;if(o=[...a].length,s[3]||s[4]){n+=o;continue}else if((s[5]||s[6])&&r%3&&!((r+o)%3)){u+=o;continue}if(n-=o,n>0)continue;o=Math.min(o,o+n+u);let p=[...s[0]][0].length,f=e.slice(0,r+s.index+p+o);if(Math.min(r,o)%2){let m=f.slice(1,-1);return{type:"em",raw:f,text:m,tokens:this.lexer.inlineTokens(m)}}let b=f.slice(2,-2);return{type:"strong",raw:f,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let i=t[2].replace(this.rules.other.newLineCharGlobal," "),s=this.rules.other.nonSpaceChar.test(i),r=this.rules.other.startingSpaceChar.test(i)&&this.rules.other.endingSpaceChar.test(i);return s&&r&&(i=i.substring(1,i.length-1)),{type:"codespan",raw:t[0],text:i}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){let t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let i,s;return t[2]==="@"?(i=t[1],s="mailto:"+i):(i=t[1],s=i),{type:"link",raw:t[0],text:i,href:s,tokens:[{type:"text",raw:i,text:i}]}}}url(e){var i;let t;if(t=this.rules.inline.url.exec(e)){let s,r;if(t[2]==="@")s=t[0],r="mailto:"+s;else{let a;do a=t[0],t[0]=((i=this.rules.inline._backpedal.exec(t[0]))==null?void 0:i[0])??"";while(a!==t[0]);s=t[0],t[1]==="www."?r="http://"+t[0]:r=t[0]}return{type:"link",raw:t[0],text:s,href:r,tokens:[{type:"text",raw:s,text:s}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let i=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:i}}}},Oe=class Ws{constructor(t){N(this,"tokens");N(this,"options");N(this,"state");N(this,"inlineQueue");N(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||zt,this.options.tokenizer=this.options.tokenizer||new Xi,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let i={other:he,block:zi.normal,inline:Jt.normal};this.options.pedantic?(i.block=zi.pedantic,i.inline=Jt.pedantic):this.options.gfm&&(i.block=zi.gfm,this.options.breaks?i.inline=Jt.breaks:i.inline=Jt.gfm),this.tokenizer.rules=i}static get rules(){return{block:zi,inline:Jt}}static lex(t,i){return new Ws(i).lex(t)}static lexInline(t,i){return new Ws(i).inlineTokens(t)}lex(t){t=t.replace(he.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let i=0;i<this.inlineQueue.length;i++){let s=this.inlineQueue[i];this.inlineTokens(s.src,s.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,i=[],s=!1){var r,a,o;for(this.options.pedantic&&(t=t.replace(he.tabCharGlobal,"    ").replace(he.spaceLine,""));t;){let n;if((a=(r=this.options.extensions)==null?void 0:r.block)!=null&&a.some(c=>(n=c.call({lexer:this},t,i))?(t=t.substring(n.raw.length),i.push(n),!0):!1))continue;if(n=this.tokenizer.space(t)){t=t.substring(n.raw.length);let c=i.at(-1);n.raw.length===1&&c!==void 0?c.raw+=`
`:i.push(n);continue}if(n=this.tokenizer.code(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.at(-1).src=c.text):i.push(n);continue}if(n=this.tokenizer.fences(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.heading(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.hr(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.blockquote(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.list(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.html(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.def(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[n.tag]||(this.tokens.links[n.tag]={href:n.href,title:n.title},i.push(n));continue}if(n=this.tokenizer.table(t)){t=t.substring(n.raw.length),i.push(n);continue}if(n=this.tokenizer.lheading(t)){t=t.substring(n.raw.length),i.push(n);continue}let u=t;if((o=this.options.extensions)!=null&&o.startBlock){let c=1/0,p=t.slice(1),f;this.options.extensions.startBlock.forEach(b=>{f=b.call({lexer:this},p),typeof f=="number"&&f>=0&&(c=Math.min(c,f))}),c<1/0&&c>=0&&(u=t.substring(0,c+1))}if(this.state.top&&(n=this.tokenizer.paragraph(u))){let c=i.at(-1);s&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):i.push(n),s=u.length!==t.length,t=t.substring(n.raw.length);continue}if(n=this.tokenizer.text(t)){t=t.substring(n.raw.length);let c=i.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+n.raw,c.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):i.push(n);continue}if(t){let c="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(c);break}else throw new Error(c)}}return this.state.top=!0,i}inline(t,i=[]){return this.inlineQueue.push({src:t,tokens:i}),i}inlineTokens(t,i=[]){var u,c,p,f,b;let s=t,r=null;if(this.tokens.links){let m=Object.keys(this.tokens.links);if(m.length>0)for(;(r=this.tokenizer.rules.inline.reflinkSearch.exec(s))!=null;)m.includes(r[0].slice(r[0].lastIndexOf("[")+1,-1))&&(s=s.slice(0,r.index)+"["+"a".repeat(r[0].length-2)+"]"+s.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(r=this.tokenizer.rules.inline.anyPunctuation.exec(s))!=null;)s=s.slice(0,r.index)+"++"+s.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let a;for(;(r=this.tokenizer.rules.inline.blockSkip.exec(s))!=null;)a=r[2]?r[2].length:0,s=s.slice(0,r.index+a)+"["+"a".repeat(r[0].length-a-2)+"]"+s.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);s=((c=(u=this.options.hooks)==null?void 0:u.emStrongMask)==null?void 0:c.call({lexer:this},s))??s;let o=!1,n="";for(;t;){o||(n=""),o=!1;let m;if((f=(p=this.options.extensions)==null?void 0:p.inline)!=null&&f.some(y=>(m=y.call({lexer:this},t,i))?(t=t.substring(m.raw.length),i.push(m),!0):!1))continue;if(m=this.tokenizer.escape(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.tag(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.link(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(m.raw.length);let y=i.at(-1);m.type==="text"&&(y==null?void 0:y.type)==="text"?(y.raw+=m.raw,y.text+=m.text):i.push(m);continue}if(m=this.tokenizer.emStrong(t,s,n)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.codespan(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.br(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.del(t)){t=t.substring(m.raw.length),i.push(m);continue}if(m=this.tokenizer.autolink(t)){t=t.substring(m.raw.length),i.push(m);continue}if(!this.state.inLink&&(m=this.tokenizer.url(t))){t=t.substring(m.raw.length),i.push(m);continue}let g=t;if((b=this.options.extensions)!=null&&b.startInline){let y=1/0,k=t.slice(1),_;this.options.extensions.startInline.forEach(E=>{_=E.call({lexer:this},k),typeof _=="number"&&_>=0&&(y=Math.min(y,_))}),y<1/0&&y>=0&&(g=t.substring(0,y+1))}if(m=this.tokenizer.inlineText(g)){t=t.substring(m.raw.length),m.raw.slice(-1)!=="_"&&(n=m.raw.slice(-1)),o=!0;let y=i.at(-1);(y==null?void 0:y.type)==="text"?(y.raw+=m.raw,y.text+=m.text):i.push(m);continue}if(t){let y="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(y);break}else throw new Error(y)}}return i}},Qi=class{constructor(e){N(this,"options");N(this,"parser");this.options=e||zt}space(e){return""}code({text:e,lang:t,escaped:i}){var a;let s=(a=(t||"").match(he.notSpaceStart))==null?void 0:a[0],r=e.replace(he.endingNewline,"")+`
`;return s?'<pre><code class="language-'+Qe(s)+'">'+(i?r:Qe(r,!0))+`</code></pre>
`:"<pre><code>"+(i?r:Qe(r,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,i=e.start,s="";for(let o=0;o<e.items.length;o++){let n=e.items[o];s+=this.listitem(n)}let r=t?"ol":"ul",a=t&&i!==1?' start="'+i+'"':"";return"<"+r+a+`>
`+s+"</"+r+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",i="";for(let r=0;r<e.header.length;r++)i+=this.tablecell(e.header[r]);t+=this.tablerow({text:i});let s="";for(let r=0;r<e.rows.length;r++){let a=e.rows[r];i="";for(let o=0;o<a.length;o++)i+=this.tablecell(a[o]);s+=this.tablerow({text:i})}return s&&(s=`<tbody>${s}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+s+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),i=e.header?"th":"td";return(e.align?`<${i} align="${e.align}">`:`<${i}>`)+t+`</${i}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${Qe(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:i}){let s=this.parser.parseInline(i),r=pa(e);if(r===null)return s;e=r;let a='<a href="'+e+'"';return t&&(a+=' title="'+Qe(t)+'"'),a+=">"+s+"</a>",a}image({href:e,title:t,text:i,tokens:s}){s&&(i=this.parser.parseInline(s,this.parser.textRenderer));let r=pa(e);if(r===null)return Qe(i);e=r;let a=`<img src="${e}" alt="${i}"`;return t&&(a+=` title="${Qe(t)}"`),a+=">",a}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:Qe(e.text)}},_r=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Ie=class qs{constructor(t){N(this,"options");N(this,"renderer");N(this,"textRenderer");this.options=t||zt,this.options.renderer=this.options.renderer||new Qi,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new _r}static parse(t,i){return new qs(i).parse(t)}static parseInline(t,i){return new qs(i).parseInline(t)}parse(t){var s,r;let i="";for(let a=0;a<t.length;a++){let o=t[a];if((r=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&r[o.type]){let u=o,c=this.options.extensions.renderers[u.type].call({parser:this},u);if(c!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(u.type)){i+=c||"";continue}}let n=o;switch(n.type){case"space":{i+=this.renderer.space(n);break}case"hr":{i+=this.renderer.hr(n);break}case"heading":{i+=this.renderer.heading(n);break}case"code":{i+=this.renderer.code(n);break}case"table":{i+=this.renderer.table(n);break}case"blockquote":{i+=this.renderer.blockquote(n);break}case"list":{i+=this.renderer.list(n);break}case"checkbox":{i+=this.renderer.checkbox(n);break}case"html":{i+=this.renderer.html(n);break}case"def":{i+=this.renderer.def(n);break}case"paragraph":{i+=this.renderer.paragraph(n);break}case"text":{i+=this.renderer.text(n);break}default:{let u='Token with "'+n.type+'" type was not found.';if(this.options.silent)return console.error(u),"";throw new Error(u)}}}return i}parseInline(t,i=this.renderer){var r,a;let s="";for(let o=0;o<t.length;o++){let n=t[o];if((a=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&a[n.type]){let c=this.options.extensions.renderers[n.type].call({parser:this},n);if(c!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(n.type)){s+=c||"";continue}}let u=n;switch(u.type){case"escape":{s+=i.text(u);break}case"html":{s+=i.html(u);break}case"link":{s+=i.link(u);break}case"image":{s+=i.image(u);break}case"checkbox":{s+=i.checkbox(u);break}case"strong":{s+=i.strong(u);break}case"em":{s+=i.em(u);break}case"codespan":{s+=i.codespan(u);break}case"br":{s+=i.br(u);break}case"del":{s+=i.del(u);break}case"text":{s+=i.text(u);break}default:{let c='Token with "'+u.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return s}},Ri,ti=(Ri=class{constructor(e){N(this,"options");N(this,"block");this.options=e||zt}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?Oe.lex:Oe.lexInline}provideParser(){return this.block?Ie.parse:Ie.parseInline}},N(Ri,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),N(Ri,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),Ri),Oh=class{constructor(...e){N(this,"defaults",fr());N(this,"options",this.setOptions);N(this,"parse",this.parseMarkdown(!0));N(this,"parseInline",this.parseMarkdown(!1));N(this,"Parser",Ie);N(this,"Renderer",Qi);N(this,"TextRenderer",_r);N(this,"Lexer",Oe);N(this,"Tokenizer",Xi);N(this,"Hooks",ti);this.use(...e)}walkTokens(e,t){var s,r;let i=[];for(let a of e)switch(i=i.concat(t.call(this,a)),a.type){case"table":{let o=a;for(let n of o.header)i=i.concat(this.walkTokens(n.tokens,t));for(let n of o.rows)for(let u of n)i=i.concat(this.walkTokens(u.tokens,t));break}case"list":{let o=a;i=i.concat(this.walkTokens(o.items,t));break}default:{let o=a;(r=(s=this.defaults.extensions)==null?void 0:s.childTokens)!=null&&r[o.type]?this.defaults.extensions.childTokens[o.type].forEach(n=>{let u=o[n].flat(1/0);i=i.concat(this.walkTokens(u,t))}):o.tokens&&(i=i.concat(this.walkTokens(o.tokens,t)))}}return i}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(i=>{let s={...i};if(s.async=this.defaults.async||s.async||!1,i.extensions&&(i.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){let a=t.renderers[r.name];a?t.renderers[r.name]=function(...o){let n=r.renderer.apply(this,o);return n===!1&&(n=a.apply(this,o)),n}:t.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let a=t[r.level];a?a.unshift(r.tokenizer):t[r.level]=[r.tokenizer],r.start&&(r.level==="block"?t.startBlock?t.startBlock.push(r.start):t.startBlock=[r.start]:r.level==="inline"&&(t.startInline?t.startInline.push(r.start):t.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(t.childTokens[r.name]=r.childTokens)}),s.extensions=t),i.renderer){let r=this.defaults.renderer||new Qi(this.defaults);for(let a in i.renderer){if(!(a in r))throw new Error(`renderer '${a}' does not exist`);if(["options","parser"].includes(a))continue;let o=a,n=i.renderer[o],u=r[o];r[o]=(...c)=>{let p=n.apply(r,c);return p===!1&&(p=u.apply(r,c)),p||""}}s.renderer=r}if(i.tokenizer){let r=this.defaults.tokenizer||new Xi(this.defaults);for(let a in i.tokenizer){if(!(a in r))throw new Error(`tokenizer '${a}' does not exist`);if(["options","rules","lexer"].includes(a))continue;let o=a,n=i.tokenizer[o],u=r[o];r[o]=(...c)=>{let p=n.apply(r,c);return p===!1&&(p=u.apply(r,c)),p}}s.tokenizer=r}if(i.hooks){let r=this.defaults.hooks||new ti;for(let a in i.hooks){if(!(a in r))throw new Error(`hook '${a}' does not exist`);if(["options","block"].includes(a))continue;let o=a,n=i.hooks[o],u=r[o];ti.passThroughHooks.has(a)?r[o]=c=>{if(this.defaults.async&&ti.passThroughHooksRespectAsync.has(a))return(async()=>{let f=await n.call(r,c);return u.call(r,f)})();let p=n.call(r,c);return u.call(r,p)}:r[o]=(...c)=>{if(this.defaults.async)return(async()=>{let f=await n.apply(r,c);return f===!1&&(f=await u.apply(r,c)),f})();let p=n.apply(r,c);return p===!1&&(p=u.apply(r,c)),p}}s.hooks=r}if(i.walkTokens){let r=this.defaults.walkTokens,a=i.walkTokens;s.walkTokens=function(o){let n=[];return n.push(a.call(this,o)),r&&(n=n.concat(r.call(this,o))),n}}this.defaults={...this.defaults,...s}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return Oe.lex(e,t??this.defaults)}parser(e,t){return Ie.parse(e,t??this.defaults)}parseMarkdown(e){return(t,i)=>{let s={...i},r={...this.defaults,...s},a=this.onError(!!r.silent,!!r.async);if(this.defaults.async===!0&&s.async===!1)return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return a(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return a(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));if(r.hooks&&(r.hooks.options=r,r.hooks.block=e),r.async)return(async()=>{let o=r.hooks?await r.hooks.preprocess(t):t,n=await(r.hooks?await r.hooks.provideLexer():e?Oe.lex:Oe.lexInline)(o,r),u=r.hooks?await r.hooks.processAllTokens(n):n;r.walkTokens&&await Promise.all(this.walkTokens(u,r.walkTokens));let c=await(r.hooks?await r.hooks.provideParser():e?Ie.parse:Ie.parseInline)(u,r);return r.hooks?await r.hooks.postprocess(c):c})().catch(a);try{r.hooks&&(t=r.hooks.preprocess(t));let o=(r.hooks?r.hooks.provideLexer():e?Oe.lex:Oe.lexInline)(t,r);r.hooks&&(o=r.hooks.processAllTokens(o)),r.walkTokens&&this.walkTokens(o,r.walkTokens);let n=(r.hooks?r.hooks.provideParser():e?Ie.parse:Ie.parseInline)(o,r);return r.hooks&&(n=r.hooks.postprocess(n)),n}catch(o){return a(o)}}}onError(e,t){return i=>{if(i.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let s="<p>An error occurred:</p><pre>"+Qe(i.message+"",!0)+"</pre>";return t?Promise.resolve(s):s}if(t)return Promise.reject(i);throw i}}},Tt=new Oh;function D(e,t){return Tt.parse(e,t)}D.options=D.setOptions=function(e){return Tt.setOptions(e),D.defaults=Tt.defaults,bo(D.defaults),D};D.getDefaults=fr;D.defaults=zt;D.use=function(...e){return Tt.use(...e),D.defaults=Tt.defaults,bo(D.defaults),D};D.walkTokens=function(e,t){return Tt.walkTokens(e,t)};D.parseInline=Tt.parseInline;D.Parser=Ie;D.parser=Ie.parse;D.Renderer=Qi;D.TextRenderer=_r;D.Lexer=Oe;D.lexer=Oe.lex;D.Tokenizer=Xi;D.Hooks=ti;D.parse=D;D.options;D.setOptions;D.use;D.walkTokens;D.parseInline;Ie.parse;Oe.lex;var Ih=Object.defineProperty,Dh=Object.getOwnPropertyDescriptor,Wt=(e,t,i,s)=>{for(var r=s>1?void 0:s?Dh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Ih(t,i,r),r};let gt=class extends oe{constructor(){super(...arguments),this.epicId="",this.loading=!1,this.error="",this.content=null,this.renderedHtml="",this.previousEpicId=""}connectedCallback(){super.connectedCallback(),this.epicId&&this.loadContext()}updated(e){e.has("epicId")&&this.epicId!==this.previousEpicId&&(this.previousEpicId=this.epicId,this.loadContext())}async loadContext(){if(!this.epicId){this.content=null,this.renderedHtml="";return}this.loading=!0,this.error="";try{this.content=await oo(this.epicId),this.content?this.renderedHtml=await D.parse(this.content):this.renderedHtml=""}catch(e){console.error("Failed to load context:",e),this.error=e instanceof Error?e.message:"Failed to load context",this.content=null,this.renderedHtml=""}finally{this.loading=!1}}refresh(){this.loadContext()}render(){return this.loading?d`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading context...</span>
        </div>
      `:this.error?d`<div class="error">${this.error}</div>`:this.epicId?this.content===null?d`<div class="empty">No context available</div>`:d`
      <div class="markdown-container">
        <div class="markdown-content">
          ${sr(this.renderedHtml)}
        </div>
      </div>
    `:d`<div class="empty">No epic selected</div>`}};gt.styles=$`
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
  `;Wt([h({type:String})],gt.prototype,"epicId",2);Wt([w()],gt.prototype,"loading",2);Wt([w()],gt.prototype,"error",2);Wt([w()],gt.prototype,"content",2);Wt([w()],gt.prototype,"renderedHtml",2);gt=Wt([me("context-pane")],gt);var Mh=Object.defineProperty,Ph=Object.getOwnPropertyDescriptor,ge=(e,t,i,s)=>{for(var r=s>1?void 0:s?Ph(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(s?o(t,i,r):o(r))||r);return s&&r&&Mh(t,i,r),r};const ba=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let Q=class extends oe{constructor(){super(...arguments),this.ticks=[],this.epics=[],this.open=!1,this.runStatus=null,this.activities=[],this.repoName="",this._focusedAttentionIndex=-1,this._detailTick=null,this._detailRunRecord=null,this._detailNotes=[],this._detailLoading=!1,this._detailTab="overview",this._detailExpanded=new Set,this._handleKeyDown=e=>{if(e.key==="Escape"){if(e.stopPropagation(),this._detailTick){this._closeDetailPane();return}this._close();return}const t=this._getHumanTicks(),i=Math.min(t.length,6)-1;switch(e.key){case"j":case"ArrowDown":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.min(this._focusedAttentionIndex+1,i));break;case"k":case"ArrowUp":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.max(this._focusedAttentionIndex-1,0));break;case"Enter":case"i":this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i&&(e.preventDefault(),e.stopPropagation(),this._handleTickClick(t[this._focusedAttentionIndex].id));break;case"a":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const s=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-resume",{detail:{tickId:s.id}}))}break;case"t":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const s=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-retry",{detail:{tickId:s.id}}))}break}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown)}updated(e){super.updated(e),e.has("open")&&this.open&&(this._focusedAttentionIndex=-1,this._closeDetailPane())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown)}_close(){this.dispatchEvent(new CustomEvent("close"))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){this.dispatchEvent(new CustomEvent("epic-select",{detail:{epicId:e}})),this._close()}_handleTickClick(e){this._openDetailPane(e)}_handleOpenOnBoard(e){this.dispatchEvent(new CustomEvent("tick-select",{detail:{tickId:e}})),this._close()}async _openDetailPane(e){var i,s;const t=this.ticks.find(r=>r.id===e);if(t){this._detailTick=t,this._detailTab="overview",this._detailNotes=li(t.notes),this._detailRunRecord=null,this._detailExpanded=new Set,this._detailLoading=!0;try{const[r,a]=await Promise.all([ur(e).catch(()=>null),t.type==="task"?pr(e).catch(()=>null):Promise.resolve(null)]);if(((i=this._detailTick)==null?void 0:i.id)!==e)return;r&&(this._detailTick={...t,...r,is_blocked:t.is_blocked,column:t.column},this._detailNotes=li(r.notes)),this._detailRunRecord=a}catch{}finally{((s=this._detailTick)==null?void 0:s.id)===e&&(this._detailLoading=!1)}}}_closeDetailPane(){this._detailTick=null,this._detailRunRecord=null,this._detailNotes=[],this._detailLoading=!1,this._detailTab="overview",this._detailExpanded=new Set}_toggleDetailSection(e){const t=new Set(this._detailExpanded);t.has(e)?t.delete(e):t.add(e),this._detailExpanded=t}_getColumnCounts(){const e={blocked:0,ready:0,agent:0,human:0,done:0};for(const t of this.ticks)t.type!=="epic"&&e[t.column]!==void 0&&e[t.column]++;return e}_getTotalNonEpicTicks(){return this.ticks.filter(e=>e.type!=="epic").length}_getEpicProgress(e){const t=this.ticks.filter(c=>c.parent===e&&c.type!=="epic"),i=t.length,s=t.filter(c=>c.column==="done").length,r=t.filter(c=>c.column==="agent").length,a=t.filter(c=>c.column==="human").length,o=t.filter(c=>c.column==="blocked").length,n=t.filter(c=>c.column==="ready").length,u=i>0?Math.round(s/i*100):0;return{total:i,done:s,inProgress:r,needsHuman:a,blocked:o,ready:n,pct:u}}_getHumanTicks(){return this.ticks.filter(e=>e.column==="human"&&e.type!=="epic")}_getActivityIcon(e){switch(e){case"create":return"➕";case"close":return"✅";case"update":return"✏️";case"approve":return"👍";case"reject":return"👎";case"note":return"💬";case"reopen":return"🔄";default:return"•"}}_formatRelativeTime(e){const t=new Date(e),s=new Date().getTime()-t.getTime(),r=Math.floor(s/6e4);if(r<1)return"now";if(r<60)return`${r}m ago`;const a=Math.floor(r/60);return a<24?`${a}h ago`:`${Math.floor(a/24)}d ago`}_getAwaitingLabel(e){if(e.awaiting)switch(e.awaiting){case"approval":return"Awaiting approval";case"review":return"Awaiting review";case"input":return"Awaiting input";case"content":return"Awaiting content";case"escalation":return"Escalated";case"checkpoint":return"Checkpoint";case"work":return"Manual work needed";default:return"Needs attention"}return"Needs attention"}_getPriorityLabel(e){return Q.PRIORITY_LABELS[e]??"Unknown"}_getPriorityColor(e){return Q.PRIORITY_COLORS[e]??"var(--subtext0)"}_formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}_formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);return t<60?`${t}s`:`${Math.floor(t/60)}m ${t%60}s`}_formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}_formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}_truncate(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}render(){var r;if(!this.open)return v;const e=this._getColumnCounts(),t=this._getTotalNonEpicTicks(),i=this._getHumanTicks(),s=((r=this.runStatus)==null?void 0:r.isRunning)??!1;return d`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._detailTick?this._renderDetailPane():v}
            ${this._renderSummaryCards(e,t,s)}
            ${this._renderDistribution(e,t)}
            ${this._renderEpicProgress()}
            <div class="two-col">
              ${this._renderNeedsAttention(i)}
              ${this._renderRecentActivity()}
            </div>
            ${this._renderRunStatus(s)}
          </div>
        </div>
      </div>
    `}_renderHeader(){return d`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName?d`<div class="header-subtitle">${this.repoName}</div>`:v}
          </div>
        </div>
        <div class="header-right">
          <span class="kbd-hint">
            Press <kbd>d</kbd> or <kbd>Esc</kbd> to close
          </span>
          <button class="close-btn" @click=${this._close} aria-label="Close dashboard">✕</button>
        </div>
      </div>
    `}_renderSummaryCards(e,t,i){const s=t>0?Math.round(e.done/t*100):0;return d`
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-card-label">Total Tasks</div>
          <div class="summary-card-value">${t}</div>
          <div class="summary-card-detail">${this.epics.length} epic${this.epics.length!==1?"s":""}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Completion</div>
          <div class="summary-card-value value-green">${s}%</div>
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
          <div class="summary-card-detail">${i?"agent active":"agent idle"}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Blocked</div>
          <div class="summary-card-value ${e.blocked>0?"value-red":""}">${e.blocked}</div>
          <div class="summary-card-detail">dependencies unmet</div>
        </div>
      </div>
    `}_renderDistribution(e,t){return t===0?v:d`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${ba.map(i=>{const s=e[i.id]/t*100;return s===0?v:d`
                <div
                  class="distribution-segment segment-${i.id}"
                  style="width: ${s}%"
                  title="${i.name}: ${e[i.id]}"
                >
                  ${s>=8?d`<span>${e[i.id]}</span>`:v}
                </div>
              `})}
          </div>
          <div class="distribution-legend">
            ${ba.map(i=>d`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${i.color}"></div>
                <span>${i.icon} ${i.name}</span>
                <span class="legend-count">${e[i.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}_renderEpicProgress(){return this.epics.length===0?v:d`
      <div class="section">
        <div class="section-title">Epic Progress</div>
        <div class="epic-list">
          ${this.epics.map(e=>{const t=this._getEpicProgress(e.id);return d`
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
    `}_renderNeedsAttention(e){return d`
      <div class="section">
        <div class="section-title">Needs Attention (${e.length})</div>
        ${e.length===0?d`<div class="empty-section">No ticks need human attention</div>`:d`
              <div class="attention-list">
                ${e.slice(0,6).map((t,i)=>d`
                  <div
                    class="attention-item ${M({focused:this._focusedAttentionIndex===i})}"
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
                ${e.length>6?d`<div class="empty-section">+${e.length-6} more</div>`:v}
              </div>
              ${e.length>0?d`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              `:v}
            `}
      </div>
    `}_renderRecentActivity(){return d`
      <div class="section">
        <div class="section-title">Recent Activity</div>
        ${this.activities.length===0?d`<div class="empty-section">No recent activity</div>`:d`
              <div class="activity-list">
                ${this.activities.slice(0,8).map(e=>d`
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
    `}_renderRunStatus(e){var t;return d`
      <div class="section">
        <div class="section-title">Run Status</div>
        <div class="run-status ${e?"active":"inactive"}">
          <div class="run-indicator ${e?"active":"inactive"}"></div>
          <div class="run-info">
            <div class="run-label">${e?"Agent Running":"Agent Idle"}</div>
            ${e&&((t=this.runStatus)!=null&&t.activeTask)?d`
                  <div class="run-detail">
                    Task <span class="task-id">${this.runStatus.activeTask.tickId}</span>
                    · ${this.runStatus.activeTask.numTurns} turns
                  </div>
                `:d`
                  <div class="run-detail">
                    No active run. Start with <code>tk run</code>
                  </div>
                `}
          </div>
        </div>
      </div>
    `}_renderDetailPane(){const e=this._detailTick;return e?d`
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
          ${e.type==="task"?d`
                <button
                  class="detail-tab ${this._detailTab==="attempts"?"active":""}"
                  @click=${()=>{this._detailTab="attempts"}}
                >Attempts</button>
              `:v}
        </div>

        <div class="detail-tab-body">
          ${this._detailLoading?d`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`:this._detailTab==="overview"?this._renderDetailOverview(e):this._renderDetailAttempts()}
        </div>
      </div>
    `:v}_renderDetailOverview(e){return d`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${e.type}">${e.type}</span>
        <span class="detail-meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(e.priority)}"
        >${this._getPriorityLabel(e.priority)}</span>
        ${e.awaiting?d`<span class="detail-meta-badge awaiting">⏳ ${e.awaiting}</span>`:v}
        ${e.is_blocked?d`<span class="detail-meta-badge blocked">⊘ blocked</span>`:v}
        ${e.verification_status==="verified"?d`<span class="detail-meta-badge verified">✓ verified</span>`:e.verification_status==="failed"?d`<span class="detail-meta-badge verification-failed">✗ failed</span>`:v}
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">Description</div>
        ${e.description?d`<div class="detail-description">${e.description}</div>`:d`<div class="detail-field-empty">No description</div>`}
      </div>

      <!-- Acceptance Criteria -->
      ${e.acceptance_criteria?d`
            <div class="detail-field">
              <div class="detail-field-label">Acceptance Criteria</div>
              <div class="detail-description">${e.acceptance_criteria}</div>
            </div>
          `:v}

      <!-- Parent -->
      ${e.parent?d`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${()=>this._handleTickClick(e.parent)}>${e.parent}</a>
            </div>
          `:v}

      <!-- Blocked by -->
      ${e.blocked_by&&e.blocked_by.length>0?d`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${e.blocked_by.map(t=>d`
                <a class="detail-link" @click=${()=>this._handleTickClick(t)} style="margin-right: 0.5rem;">${t}</a>
              `)}
            </div>
          `:v}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length>0?d`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(t=>d`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${t.author??"Unknown"}</span>
                      ${t.timestamp?d`<span class="detail-note-time">${this._formatRelativeTime(t.timestamp)}</span>`:v}
                    </div>
                    <div class="detail-note-text">${t.text}</div>
                  </li>
                `)}
              </ul>
            `:d`<div class="detail-field-empty">No notes</div>`}
      </div>

      <!-- Closed reason -->
      ${e.closed_reason?d`
            <div class="detail-field">
              <div class="detail-field-label">Close Reason</div>
              <div class="detail-description">${e.closed_reason}</div>
            </div>
          `:v}

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
          ${e.started_at?d`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.started_at)}</span>
                </div>
              `:v}
          ${e.closed_at?d`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.closed_at)}</span>
                </div>
              `:v}
        </div>
      </div>
    `}_renderDetailAttempts(){var i;const e=this._detailRunRecord;if(!e)return d`<div class="detail-field-empty">No run history available for this task.</div>`;const t=e.metrics.input_tokens+e.metrics.output_tokens;return d`
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
      ${!e.success&&e.error_msg?d`<div class="run-error-banner"><strong>Error:</strong> ${e.error_msg}</div>`:v}

      <!-- Verification -->
      ${e.verification?d`
            <div class="run-verification-badge ${e.verification.all_passed?"passed":"failed"}">
              ${e.verification.all_passed?"✓ Verified":"✗ Verification Failed"}
            </div>
            ${((i=e.verification.results)==null?void 0:i.map(s=>d`
              <div class="run-verifier-item ${s.passed?"passed":"failed"}">
                <span class="run-verifier-icon ${s.passed?"passed":"failed"}">${s.passed?"✓":"✗"}</span>
                <span class="run-verifier-name">${s.verifier}</span>
                <span class="run-verifier-duration">${this._formatDuration(s.duration_ms)}</span>
              </div>
            `))??v}
          `:v}

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
      ${e.output?d`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("output")}
            >
              <span>Output</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("output")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("output")?d`<div class="run-collapse-content">${e.output}</div>`:v}
          `:v}

      <!-- Thinking (collapsible) -->
      ${e.thinking?d`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("thinking")}
            >
              <span>Thinking</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("thinking")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("thinking")?d`<div class="run-collapse-content">${e.thinking}</div>`:v}
          `:v}

      <!-- Tools (collapsible) -->
      ${e.tools&&e.tools.length>0?d`
            <div
              class="run-collapse-header"
              @click=${()=>this._toggleDetailSection("tools")}
            >
              <span>Tools (${e.tools.length})</span>
              <span class="run-collapse-icon ${this._detailExpanded.has("tools")?"expanded":""}">▾</span>
            </div>
            ${this._detailExpanded.has("tools")?d`
                  <ul class="run-tools-list">
                    ${e.tools.map(s=>d`
                      <li class="run-tool-item">
                        <span class="run-tool-name ${s.is_error?"is-error":""}">${s.name}</span>
                        ${s.input?d`<span class="run-tool-input">${this._truncate(s.input)}</span>`:v}
                        <span class="run-tool-duration">${this._formatDuration(s.duration_ms)}</span>
                      </li>
                    `)}
                  </ul>
                `:v}
          `:v}
    `}};Q.styles=$`
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

    /* Run status indicator */
    .run-status {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface0, #313244);
      border-radius: 8px;
    }

    .run-status.active {
      border: 1px solid var(--green, #a6e3a1);
      background: rgba(166, 227, 161, 0.05);
    }

    .run-status.inactive {
      border: 1px solid var(--surface1, #45475a);
    }

    .run-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .run-indicator.active {
      background: var(--green, #a6e3a1);
      box-shadow: 0 0 8px var(--green, #a6e3a1);
      animation: runPulse 1.5s ease-in-out infinite;
    }

    .run-indicator.inactive {
      background: var(--overlay0, #6c7086);
    }

    @keyframes runPulse {
      0%, 100% { opacity: 0.7; box-shadow: 0 0 4px var(--green); }
      50% { opacity: 1; box-shadow: 0 0 12px var(--green); }
    }

    .run-info {
      flex: 1;
    }

    .run-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text, #cdd6f4);
    }

    .run-detail {
      font-size: 0.6875rem;
      color: var(--subtext0, #a6adc8);
      margin-top: 0.125rem;
    }

    .run-detail .task-id {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      color: var(--blue, #89b4fa);
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
  `;Q.PRIORITY_LABELS={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};Q.PRIORITY_COLORS={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};ge([h({type:Array})],Q.prototype,"ticks",2);ge([h({type:Array})],Q.prototype,"epics",2);ge([h({type:Boolean,reflect:!0})],Q.prototype,"open",2);ge([h({attribute:!1})],Q.prototype,"runStatus",2);ge([h({type:Array})],Q.prototype,"activities",2);ge([h({type:String,attribute:"repo-name"})],Q.prototype,"repoName",2);ge([w()],Q.prototype,"_focusedAttentionIndex",2);ge([w()],Q.prototype,"_detailTick",2);ge([w()],Q.prototype,"_detailRunRecord",2);ge([w()],Q.prototype,"_detailNotes",2);ge([w()],Q.prototype,"_detailLoading",2);ge([w()],Q.prototype,"_detailTab",2);ge([w()],Q.prototype,"_detailExpanded",2);Q=ge([me("tickflow-dashboard")],Q);As("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var i;((i=t.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
