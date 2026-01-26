var Qo=Object.defineProperty;var Zo=(e,t,s)=>t in e?Qo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var F=(e,t,s)=>Zo(e,typeof t!="symbol"?t+"":t,s);import{i as $,n as u,a as he,b as h,r as k,E as Et,A as y,e as C,u as dr,t as be}from"./ticks-logo-DYgrblNn.js";var Jo=$`
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
`;const _i=new Set,zt=new Map;let gt,Ni="ltr",Bi="en";const Jr=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(Jr){const e=new MutationObserver(to);Ni=document.documentElement.dir||"ltr",Bi=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function eo(...e){e.map(t=>{const s=t.$code.toLowerCase();zt.has(s)?zt.set(s,Object.assign(Object.assign({},zt.get(s)),t)):zt.set(s,t),gt||(gt=t)}),to()}function to(){Jr&&(Ni=document.documentElement.dir||"ltr",Bi=document.documentElement.lang||navigator.language),[..._i.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let en=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){_i.add(this.host)}hostDisconnected(){_i.delete(this.host)}dir(){return`${this.host.dir||Ni}`.toLowerCase()}lang(){return`${this.host.lang||Bi}`.toLowerCase()}getTranslationData(t){var s,i;const r=new Intl.Locale(t.replace(/_/g,"-")),o=r==null?void 0:r.language.toLowerCase(),n=(i=(s=r==null?void 0:r.region)===null||s===void 0?void 0:s.toLowerCase())!==null&&i!==void 0?i:"",a=zt.get(`${o}-${n}`),d=zt.get(o);return{locale:r,language:o,region:n,primary:a,secondary:d}}exists(t,s){var i;const{primary:r,secondary:o}=this.getTranslationData((i=s.lang)!==null&&i!==void 0?i:this.lang());return s=Object.assign({includeFallback:!1},s),!!(r&&r[t]||o&&o[t]||s.includeFallback&&gt&&gt[t])}term(t,...s){const{primary:i,secondary:r}=this.getTranslationData(this.lang());let o;if(i&&i[t])o=i[t];else if(r&&r[t])o=r[t];else if(gt&&gt[t])o=gt[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof o=="function"?o(...s):o}date(t,s){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),s).format(t)}number(t,s){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),s).format(t)}relativeTime(t,s,i){return new Intl.RelativeTimeFormat(this.lang(),i).format(t,s)}};var so={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};eo(so);var tn=so,re=class extends en{};eo(tn);var H=$`
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
`,io=Object.defineProperty,sn=Object.defineProperties,rn=Object.getOwnPropertyDescriptor,on=Object.getOwnPropertyDescriptors,ur=Object.getOwnPropertySymbols,nn=Object.prototype.hasOwnProperty,an=Object.prototype.propertyIsEnumerable,pi=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),Hi=e=>{throw TypeError(e)},hr=(e,t,s)=>t in e?io(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s,et=(e,t)=>{for(var s in t||(t={}))nn.call(t,s)&&hr(e,s,t[s]);if(ur)for(var s of ur(t))an.call(t,s)&&hr(e,s,t[s]);return e},os=(e,t)=>sn(e,on(t)),l=(e,t,s,i)=>{for(var r=i>1?void 0:i?rn(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&io(t,s,r),r},ro=(e,t,s)=>t.has(e)||Hi("Cannot "+s),ln=(e,t,s)=>(ro(e,t,"read from private field"),t.get(e)),cn=(e,t,s)=>t.has(e)?Hi("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,s),dn=(e,t,s,i)=>(ro(e,t,"write to private field"),t.set(e,s),s),un=function(e,t){this[0]=e,this[1]=t},hn=e=>{var t=e[pi("asyncIterator")],s=!1,i,r={};return t==null?(t=e[pi("iterator")](),i=o=>r[o]=n=>t[o](n)):(t=t.call(e),i=o=>r[o]=n=>{if(s){if(s=!1,o==="throw")throw n;return n}return s=!0,{done:!1,value:new un(new Promise(a=>{var d=t[o](n);d instanceof Object||Hi("Object expected"),a(d)}),1)}}),r[pi("iterator")]=()=>r,i("next"),"throw"in t?i("throw"):r.throw=o=>{throw o},"return"in t&&i("return"),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pn(e){return(t,s)=>{const i=typeof t=="function"?t:t[s];Object.assign(i,e)}}var $s,D=class extends he{constructor(){super(),cn(this,$s,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const s=new CustomEvent(e,et({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(s),s}static define(e,t=this,s={}){const i=customElements.get(e);if(!i){try{customElements.define(e,t,s)}catch{customElements.define(e,class extends t{},s)}return}let r=" (unknown version)",o=r;"version"in t&&t.version&&(r=" v"+t.version),"version"in i&&i.version&&(o=" v"+i.version),!(r&&o&&r===o)&&console.warn(`Attempted to register <${e}>${r}, but <${e}>${o} has already been registered.`)}attributeChangedCallback(e,t,s){ln(this,$s)||(this.constructor.elementProperties.forEach((i,r)=>{i.reflect&&this[r]!=null&&this.initialReflectedProperties.set(r,this[r])}),dn(this,$s,!0)),super.attributeChangedCallback(e,t,s)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,s)=>{e.has(s)&&this[s]==null&&(this[s]=t)})}};$s=new WeakMap;D.version="2.20.1";D.dependencies={};l([u()],D.prototype,"dir",2);l([u()],D.prototype,"lang",2);var Ys=class extends D{constructor(){super(...arguments),this.localize=new re(this)}render(){return h`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Ys.styles=[H,Jo];var Ht=new WeakMap,jt=new WeakMap,Ut=new WeakMap,mi=new WeakSet,bs=new WeakMap,ns=class{constructor(e,t){this.handleFormData=s=>{const i=this.options.disabled(this.host),r=this.options.name(this.host),o=this.options.value(this.host),n=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!i&&!n&&typeof r=="string"&&r.length>0&&typeof o<"u"&&(Array.isArray(o)?o.forEach(a=>{s.formData.append(r,a.toString())}):s.formData.append(r,o.toString()))},this.handleFormSubmit=s=>{var i;const r=this.options.disabled(this.host),o=this.options.reportValidity;this.form&&!this.form.noValidate&&((i=Ht.get(this.form))==null||i.forEach(n=>{this.setUserInteracted(n,!0)})),this.form&&!this.form.noValidate&&!r&&!o(this.host)&&(s.preventDefault(),s.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),bs.set(this.host,[])},this.handleInteraction=s=>{const i=bs.get(this.host);i.includes(s.type)||i.push(s.type),i.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const s=this.form.querySelectorAll("*");for(const i of s)if(typeof i.checkValidity=="function"&&!i.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const s=this.form.querySelectorAll("*");for(const i of s)if(typeof i.reportValidity=="function"&&!i.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=et({form:s=>{const i=s.form;if(i){const o=s.getRootNode().querySelector(`#${i}`);if(o)return o}return s.closest("form")},name:s=>s.name,value:s=>s.value,defaultValue:s=>s.defaultValue,disabled:s=>{var i;return(i=s.disabled)!=null?i:!1},reportValidity:s=>typeof s.reportValidity=="function"?s.reportValidity():!0,checkValidity:s=>typeof s.checkValidity=="function"?s.checkValidity():!0,setValue:(s,i)=>s.value=i,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),bs.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),bs.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,Ht.has(this.form)?Ht.get(this.form).add(this.host):Ht.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),jt.has(this.form)||(jt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Ut.has(this.form)||(Ut.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=Ht.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),jt.has(this.form)&&(this.form.reportValidity=jt.get(this.form),jt.delete(this.form)),Ut.has(this.form)&&(this.form.checkValidity=Ut.get(this.form),Ut.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?mi.add(e):mi.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const s=document.createElement("button");s.type=e,s.style.position="absolute",s.style.width="0",s.style.height="0",s.style.clipPath="inset(50%)",s.style.overflow="hidden",s.style.whiteSpace="nowrap",t&&(s.name=t.name,s.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(i=>{t.hasAttribute(i)&&s.setAttribute(i,t.getAttribute(i))})),this.form.append(s),s.click(),s.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,s=!!mi.has(t),i=!!t.required;t.toggleAttribute("data-required",i),t.toggleAttribute("data-optional",!i),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&s),t.toggleAttribute("data-user-valid",e&&s)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},ji=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(os(et({},ji),{valid:!1,valueMissing:!0}));Object.freeze(os(et({},ji),{valid:!1,customError:!0}));var mn=$`
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
`,tt=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=s=>{const i=s.target;(this.slotNames.includes("[default]")&&!i.name||i.name&&this.slotNames.includes(i.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function fn(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let s="";return[...t].forEach(i=>{i.nodeType===Node.TEXT_NODE&&(s+=i.textContent)}),s}var Ci="";function $i(e){Ci=e}function bn(e=""){if(!Ci){const t=[...document.getElementsByTagName("script")],s=t.find(i=>i.hasAttribute("data-shoelace"));if(s)$i(s.getAttribute("data-shoelace"));else{const i=t.find(o=>/shoelace(\.min)?\.js($|\?)/.test(o.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(o.src));let r="";i&&(r=i.getAttribute("src")),$i(r.split("/").slice(0,-1).join("/"))}}return Ci.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var gn={name:"default",resolver:e=>bn(`assets/icons/${e}.svg`)},vn=gn,pr={caret:`
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
  `},yn={name:"system",resolver:e=>e in pr?`data:image/svg+xml,${encodeURIComponent(pr[e])}`:""},kn=yn,wn=[vn,kn],Ti=[];function xn(e){Ti.push(e)}function _n(e){Ti=Ti.filter(t=>t!==e)}function mr(e){return wn.find(t=>t.name===e)}var Cn=$`
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
`;function S(e,t){const s=et({waitUntilFirstUpdate:!1},t);return(i,r)=>{const{update:o}=i,n=Array.isArray(e)?e:[e];i.update=function(a){n.forEach(d=>{const c=d;if(a.has(c)){const p=a.get(c),f=this[c];p!==f&&(!s.waitUntilFirstUpdate||this.hasUpdated)&&this[r](p,f)}}),o.call(this,a)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const $n=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,oo=e=>e.strings===void 0,Tn={},Sn=(e,t=Tn)=>e._$AH=t;var Vt=Symbol(),gs=Symbol(),fi,bi=new Map,ee=class extends D{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var s;let i;if(t!=null&&t.spriteSheet)return this.svg=h`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(i=await fetch(e,{mode:"cors"}),!i.ok)return i.status===410?Vt:gs}catch{return gs}try{const r=document.createElement("div");r.innerHTML=await i.text();const o=r.firstElementChild;if(((s=o==null?void 0:o.tagName)==null?void 0:s.toLowerCase())!=="svg")return Vt;fi||(fi=new DOMParser);const a=fi.parseFromString(o.outerHTML,"text/html").body.querySelector("svg");return a?(a.part.add("svg"),document.adoptNode(a)):Vt}catch{return Vt}}connectedCallback(){super.connectedCallback(),xn(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),_n(this)}getIconSource(){const e=mr(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:s}=this.getIconSource(),i=s?mr(this.library):void 0;if(!t){this.svg=null;return}let r=bi.get(t);if(r||(r=this.resolveIcon(t,i),bi.set(t,r)),!this.initialRender)return;const o=await r;if(o===gs&&bi.delete(t),t===this.getIconSource().url){if($n(o)){if(this.svg=o,i){await this.updateComplete;const n=this.shadowRoot.querySelector("[part='svg']");typeof i.mutator=="function"&&n&&i.mutator(n)}return}switch(o){case gs:case Vt:this.svg=null,this.emit("sl-error");break;default:this.svg=o.cloneNode(!0),(e=i==null?void 0:i.mutator)==null||e.call(i,this.svg),this.emit("sl-load")}}}render(){return this.svg}};ee.styles=[H,Cn];l([k()],ee.prototype,"svg",2);l([u({reflect:!0})],ee.prototype,"name",2);l([u()],ee.prototype,"src",2);l([u()],ee.prototype,"label",2);l([u({reflect:!0})],ee.prototype,"library",2);l([S("label")],ee.prototype,"handleLabelChange",1);l([S(["name","src","library"])],ee.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Xe={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ks=e=>(...t)=>({_$litDirective$:e,values:t});let Xs=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,s,i){this._$Ct=t,this._$AM=s,this._$Ci=i}_$AS(t,s){return this.update(t,s)}update(t,s){return this.render(...s)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const N=Ks(class extends Xs{constructor(e){var t;if(super(e),e.type!==Xe.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var i,r;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(o=>o!=="")));for(const o in t)t[o]&&!((i=this.nt)!=null&&i.has(o))&&this.st.add(o);return this.render(t)}const s=e.element.classList;for(const o of this.st)o in t||(s.remove(o),this.st.delete(o));for(const o in t){const n=!!t[o];n===this.st.has(o)||(r=this.nt)!=null&&r.has(o)||(n?(s.add(o),this.st.add(o)):(s.remove(o),this.st.delete(o)))}return Et}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const no=Symbol.for(""),En=e=>{if((e==null?void 0:e.r)===no)return e==null?void 0:e._$litStatic$},As=(e,...t)=>({_$litStatic$:t.reduce((s,i,r)=>s+(o=>{if(o._$litStatic$!==void 0)return o._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${o}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(i)+e[r+1],e[0]),r:no}),fr=new Map,zn=e=>(t,...s)=>{const i=s.length;let r,o;const n=[],a=[];let d,c=0,p=!1;for(;c<i;){for(d=t[c];c<i&&(o=s[c],(r=En(o))!==void 0);)d+=r+t[++c],p=!0;c!==i&&a.push(o),n.push(d),c++}if(c===i&&n.push(t[i]),p){const f=n.join("$$lit$$");(t=fr.get(f))===void 0&&(n.raw=n,fr.set(f,t=n)),s=a}return e(t,...s)},Ts=zn(h);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>e??y;var P=class extends D{constructor(){super(...arguments),this.formControlController=new ns(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new tt(this,"[default]","prefix","suffix"),this.localize=new re(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:ji}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?As`a`:As`button`;return Ts`
      <${t}
        part="base"
        class=${N({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
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
        ${this.caret?Ts` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?Ts`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};P.styles=[H,mn];P.dependencies={"sl-icon":ee,"sl-spinner":Ys};l([C(".button")],P.prototype,"button",2);l([k()],P.prototype,"hasFocus",2);l([k()],P.prototype,"invalid",2);l([u()],P.prototype,"title",2);l([u({reflect:!0})],P.prototype,"variant",2);l([u({reflect:!0})],P.prototype,"size",2);l([u({type:Boolean,reflect:!0})],P.prototype,"caret",2);l([u({type:Boolean,reflect:!0})],P.prototype,"disabled",2);l([u({type:Boolean,reflect:!0})],P.prototype,"loading",2);l([u({type:Boolean,reflect:!0})],P.prototype,"outline",2);l([u({type:Boolean,reflect:!0})],P.prototype,"pill",2);l([u({type:Boolean,reflect:!0})],P.prototype,"circle",2);l([u()],P.prototype,"type",2);l([u()],P.prototype,"name",2);l([u()],P.prototype,"value",2);l([u()],P.prototype,"href",2);l([u()],P.prototype,"target",2);l([u()],P.prototype,"rel",2);l([u()],P.prototype,"download",2);l([u()],P.prototype,"form",2);l([u({attribute:"formaction"})],P.prototype,"formAction",2);l([u({attribute:"formenctype"})],P.prototype,"formEnctype",2);l([u({attribute:"formmethod"})],P.prototype,"formMethod",2);l([u({attribute:"formnovalidate",type:Boolean})],P.prototype,"formNoValidate",2);l([u({attribute:"formtarget"})],P.prototype,"formTarget",2);l([S("disabled",{waitUntilFirstUpdate:!0})],P.prototype,"handleDisabledChange",1);P.define("sl-button");var Rn=$`
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
`,Ui=(e="value")=>(t,s)=>{const i=t.constructor,r=i.prototype.attributeChangedCallback;i.prototype.attributeChangedCallback=function(o,n,a){var d;const c=i.getPropertyOptions(e),p=typeof c.attribute=="string"?c.attribute:e;if(o===p){const f=c.converter||dr,m=(typeof f=="function"?f:(d=f==null?void 0:f.fromAttribute)!=null?d:dr.fromAttribute)(a,c.type);this[e]!==m&&(this[s]=m)}r.call(this,o,n,a)}},Gs=$`
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
 */const Os=Ks(class extends Xs{constructor(e){if(super(e),e.type!==Xe.PROPERTY&&e.type!==Xe.ATTRIBUTE&&e.type!==Xe.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!oo(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===Et||t===y)return t;const s=e.element,i=e.name;if(e.type===Xe.PROPERTY){if(t===s[i])return Et}else if(e.type===Xe.BOOLEAN_ATTRIBUTE){if(!!t===s.hasAttribute(i))return Et}else if(e.type===Xe.ATTRIBUTE&&s.getAttribute(i)===t+"")return Et;return Sn(e),t}});var T=class extends D{constructor(){super(...arguments),this.formControlController=new ns(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new tt(this,"help-text","label"),this.localize=new re(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,s="none"){this.input.setSelectionRange(e,t,s)}setRangeText(e,t,s,i="preserve"){const r=t??this.input.selectionStart,o=s??this.input.selectionEnd;this.input.setRangeText(e,r,o,i),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t,o=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return h`
      <div
        part="form-control"
        class=${N({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${s?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${N({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              .value=${Os(this.value)}
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

            ${o?h`
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
            ${this.passwordToggle&&!this.disabled?h`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?h`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:h`
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
          aria-hidden=${i?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};T.styles=[H,Gs,Rn];T.dependencies={"sl-icon":ee};l([C(".input__control")],T.prototype,"input",2);l([k()],T.prototype,"hasFocus",2);l([u()],T.prototype,"title",2);l([u({reflect:!0})],T.prototype,"type",2);l([u()],T.prototype,"name",2);l([u()],T.prototype,"value",2);l([Ui()],T.prototype,"defaultValue",2);l([u({reflect:!0})],T.prototype,"size",2);l([u({type:Boolean,reflect:!0})],T.prototype,"filled",2);l([u({type:Boolean,reflect:!0})],T.prototype,"pill",2);l([u()],T.prototype,"label",2);l([u({attribute:"help-text"})],T.prototype,"helpText",2);l([u({type:Boolean})],T.prototype,"clearable",2);l([u({type:Boolean,reflect:!0})],T.prototype,"disabled",2);l([u()],T.prototype,"placeholder",2);l([u({type:Boolean,reflect:!0})],T.prototype,"readonly",2);l([u({attribute:"password-toggle",type:Boolean})],T.prototype,"passwordToggle",2);l([u({attribute:"password-visible",type:Boolean})],T.prototype,"passwordVisible",2);l([u({attribute:"no-spin-buttons",type:Boolean})],T.prototype,"noSpinButtons",2);l([u({reflect:!0})],T.prototype,"form",2);l([u({type:Boolean,reflect:!0})],T.prototype,"required",2);l([u()],T.prototype,"pattern",2);l([u({type:Number})],T.prototype,"minlength",2);l([u({type:Number})],T.prototype,"maxlength",2);l([u()],T.prototype,"min",2);l([u()],T.prototype,"max",2);l([u()],T.prototype,"step",2);l([u()],T.prototype,"autocapitalize",2);l([u()],T.prototype,"autocorrect",2);l([u()],T.prototype,"autocomplete",2);l([u({type:Boolean})],T.prototype,"autofocus",2);l([u()],T.prototype,"enterkeyhint",2);l([u({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],T.prototype,"spellcheck",2);l([u()],T.prototype,"inputmode",2);l([S("disabled",{waitUntilFirstUpdate:!0})],T.prototype,"handleDisabledChange",1);l([S("step",{waitUntilFirstUpdate:!0})],T.prototype,"handleStepChange",1);l([S("value",{waitUntilFirstUpdate:!0})],T.prototype,"handleValueChange",1);T.define("sl-input");var An=$`
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
`,On=$`
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
`,G=class extends D{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?As`a`:As`button`;return Ts`
      <${t}
        part="base"
        class=${N({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
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
    `}};G.styles=[H,On];G.dependencies={"sl-icon":ee};l([C(".icon-button")],G.prototype,"button",2);l([k()],G.prototype,"hasFocus",2);l([u()],G.prototype,"name",2);l([u()],G.prototype,"library",2);l([u()],G.prototype,"src",2);l([u()],G.prototype,"href",2);l([u()],G.prototype,"target",2);l([u()],G.prototype,"download",2);l([u()],G.prototype,"label",2);l([u({type:Boolean,reflect:!0})],G.prototype,"disabled",2);var Ct=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return h`
      <span
        part="base"
        class=${N({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?h`
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
    `}};Ct.styles=[H,An];Ct.dependencies={"sl-icon-button":G};l([u({reflect:!0})],Ct.prototype,"variant",2);l([u({reflect:!0})],Ct.prototype,"size",2);l([u({type:Boolean,reflect:!0})],Ct.prototype,"pill",2);l([u({type:Boolean})],Ct.prototype,"removable",2);var In=$`
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
`;function Mn(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var Si=new Set;function Dn(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function Pn(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Zt(e){if(Si.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=Dn()+Pn();let s=getComputedStyle(document.documentElement).scrollbarGutter;(!s||s==="auto")&&(s="stable"),t<2&&(s=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",s),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function Jt(e){Si.delete(e),Si.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function Ei(e,t,s="vertical",i="smooth"){const r=Mn(e,t),o=r.top+t.scrollTop,n=r.left+t.scrollLeft,a=t.scrollLeft,d=t.scrollLeft+t.offsetWidth,c=t.scrollTop,p=t.scrollTop+t.offsetHeight;(s==="horizontal"||s==="both")&&(n<a?t.scrollTo({left:n,behavior:i}):n+e.clientWidth>d&&t.scrollTo({left:n-t.offsetWidth+e.clientWidth,behavior:i})),(s==="vertical"||s==="both")&&(o<c?t.scrollTo({top:o,behavior:i}):o+e.clientHeight>p&&t.scrollTo({top:o-t.offsetHeight+e.clientHeight,behavior:i}))}var Ln=$`
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
`;const at=Math.min,pe=Math.max,Is=Math.round,vs=Math.floor,He=e=>({x:e,y:e}),Fn={left:"right",right:"left",bottom:"top",top:"bottom"},Nn={start:"end",end:"start"};function zi(e,t,s){return pe(e,at(t,s))}function Mt(e,t){return typeof e=="function"?e(t):e}function lt(e){return e.split("-")[0]}function Dt(e){return e.split("-")[1]}function ao(e){return e==="x"?"y":"x"}function Vi(e){return e==="y"?"height":"width"}const Bn=new Set(["top","bottom"]);function Ge(e){return Bn.has(lt(e))?"y":"x"}function Wi(e){return ao(Ge(e))}function Hn(e,t,s){s===void 0&&(s=!1);const i=Dt(e),r=Wi(e),o=Vi(r);let n=r==="x"?i===(s?"end":"start")?"right":"left":i==="start"?"bottom":"top";return t.reference[o]>t.floating[o]&&(n=Ms(n)),[n,Ms(n)]}function jn(e){const t=Ms(e);return[Ri(e),t,Ri(t)]}function Ri(e){return e.replace(/start|end/g,t=>Nn[t])}const br=["left","right"],gr=["right","left"],Un=["top","bottom"],Vn=["bottom","top"];function Wn(e,t,s){switch(e){case"top":case"bottom":return s?t?gr:br:t?br:gr;case"left":case"right":return t?Un:Vn;default:return[]}}function qn(e,t,s,i){const r=Dt(e);let o=Wn(lt(e),s==="start",i);return r&&(o=o.map(n=>n+"-"+r),t&&(o=o.concat(o.map(Ri)))),o}function Ms(e){return e.replace(/left|right|bottom|top/g,t=>Fn[t])}function Yn(e){return{top:0,right:0,bottom:0,left:0,...e}}function lo(e){return typeof e!="number"?Yn(e):{top:e,right:e,bottom:e,left:e}}function Ds(e){const{x:t,y:s,width:i,height:r}=e;return{width:i,height:r,top:s,left:t,right:t+i,bottom:s+r,x:t,y:s}}function vr(e,t,s){let{reference:i,floating:r}=e;const o=Ge(t),n=Wi(t),a=Vi(n),d=lt(t),c=o==="y",p=i.x+i.width/2-r.width/2,f=i.y+i.height/2-r.height/2,b=i[a]/2-r[a]/2;let m;switch(d){case"top":m={x:p,y:i.y-r.height};break;case"bottom":m={x:p,y:i.y+i.height};break;case"right":m={x:i.x+i.width,y:f};break;case"left":m={x:i.x-r.width,y:f};break;default:m={x:i.x,y:i.y}}switch(Dt(t)){case"start":m[n]-=b*(s&&c?-1:1);break;case"end":m[n]+=b*(s&&c?-1:1);break}return m}const Kn=async(e,t,s)=>{const{placement:i="bottom",strategy:r="absolute",middleware:o=[],platform:n}=s,a=o.filter(Boolean),d=await(n.isRTL==null?void 0:n.isRTL(t));let c=await n.getElementRects({reference:e,floating:t,strategy:r}),{x:p,y:f}=vr(c,i,d),b=i,m={},g=0;for(let v=0;v<a.length;v++){const{name:w,fn:_}=a[v],{x:E,y:O,data:q,reset:j}=await _({x:p,y:f,initialPlacement:i,placement:b,strategy:r,middlewareData:m,rects:c,platform:n,elements:{reference:e,floating:t}});p=E??p,f=O??f,m={...m,[w]:{...m[w],...q}},j&&g<=50&&(g++,typeof j=="object"&&(j.placement&&(b=j.placement),j.rects&&(c=j.rects===!0?await n.getElementRects({reference:e,floating:t,strategy:r}):j.rects),{x:p,y:f}=vr(c,b,d)),v=-1)}return{x:p,y:f,placement:b,strategy:r,middlewareData:m}};async function qi(e,t){var s;t===void 0&&(t={});const{x:i,y:r,platform:o,rects:n,elements:a,strategy:d}=e,{boundary:c="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:b=!1,padding:m=0}=Mt(t,e),g=lo(m),w=a[b?f==="floating"?"reference":"floating":f],_=Ds(await o.getClippingRect({element:(s=await(o.isElement==null?void 0:o.isElement(w)))==null||s?w:w.contextElement||await(o.getDocumentElement==null?void 0:o.getDocumentElement(a.floating)),boundary:c,rootBoundary:p,strategy:d})),E=f==="floating"?{x:i,y:r,width:n.floating.width,height:n.floating.height}:n.reference,O=await(o.getOffsetParent==null?void 0:o.getOffsetParent(a.floating)),q=await(o.isElement==null?void 0:o.isElement(O))?await(o.getScale==null?void 0:o.getScale(O))||{x:1,y:1}:{x:1,y:1},j=Ds(o.convertOffsetParentRelativeRectToViewportRelativeRect?await o.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:E,offsetParent:O,strategy:d}):E);return{top:(_.top-j.top+g.top)/q.y,bottom:(j.bottom-_.bottom+g.bottom)/q.y,left:(_.left-j.left+g.left)/q.x,right:(j.right-_.right+g.right)/q.x}}const Xn=e=>({name:"arrow",options:e,async fn(t){const{x:s,y:i,placement:r,rects:o,platform:n,elements:a,middlewareData:d}=t,{element:c,padding:p=0}=Mt(e,t)||{};if(c==null)return{};const f=lo(p),b={x:s,y:i},m=Wi(r),g=Vi(m),v=await n.getDimensions(c),w=m==="y",_=w?"top":"left",E=w?"bottom":"right",O=w?"clientHeight":"clientWidth",q=o.reference[g]+o.reference[m]-b[m]-o.floating[g],j=b[m]-o.reference[m],ne=await(n.getOffsetParent==null?void 0:n.getOffsetParent(c));let V=ne?ne[O]:0;(!V||!await(n.isElement==null?void 0:n.isElement(ne)))&&(V=a.floating[O]||o.floating[g]);const qe=q/2-j/2,Le=V/2-v[g]/2-1,xe=at(f[_],Le),st=at(f[E],Le),Fe=xe,it=V-v[g]-st,ae=V/2-v[g]/2+qe,mt=zi(Fe,ae,it),Ye=!d.arrow&&Dt(r)!=null&&ae!==mt&&o.reference[g]/2-(ae<Fe?xe:st)-v[g]/2<0,Te=Ye?ae<Fe?ae-Fe:ae-it:0;return{[m]:b[m]+Te,data:{[m]:mt,centerOffset:ae-mt-Te,...Ye&&{alignmentOffset:Te}},reset:Ye}}}),Gn=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var s,i;const{placement:r,middlewareData:o,rects:n,initialPlacement:a,platform:d,elements:c}=t,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:v=!0,...w}=Mt(e,t);if((s=o.arrow)!=null&&s.alignmentOffset)return{};const _=lt(r),E=Ge(a),O=lt(a)===a,q=await(d.isRTL==null?void 0:d.isRTL(c.floating)),j=b||(O||!v?[Ms(a)]:jn(a)),ne=g!=="none";!b&&ne&&j.push(...qn(a,v,g,q));const V=[a,...j],qe=await qi(t,w),Le=[];let xe=((i=o.flip)==null?void 0:i.overflows)||[];if(p&&Le.push(qe[_]),f){const ae=Hn(r,n,q);Le.push(qe[ae[0]],qe[ae[1]])}if(xe=[...xe,{placement:r,overflows:Le}],!Le.every(ae=>ae<=0)){var st,Fe;const ae=(((st=o.flip)==null?void 0:st.index)||0)+1,mt=V[ae];if(mt&&(!(f==="alignment"?E!==Ge(mt):!1)||xe.every(Se=>Ge(Se.placement)===E?Se.overflows[0]>0:!0)))return{data:{index:ae,overflows:xe},reset:{placement:mt}};let Ye=(Fe=xe.filter(Te=>Te.overflows[0]<=0).sort((Te,Se)=>Te.overflows[1]-Se.overflows[1])[0])==null?void 0:Fe.placement;if(!Ye)switch(m){case"bestFit":{var it;const Te=(it=xe.filter(Se=>{if(ne){const rt=Ge(Se.placement);return rt===E||rt==="y"}return!0}).map(Se=>[Se.placement,Se.overflows.filter(rt=>rt>0).reduce((rt,Go)=>rt+Go,0)]).sort((Se,rt)=>Se[1]-rt[1])[0])==null?void 0:it[0];Te&&(Ye=Te);break}case"initialPlacement":Ye=a;break}if(r!==Ye)return{reset:{placement:Ye}}}return{}}}},Qn=new Set(["left","top"]);async function Zn(e,t){const{placement:s,platform:i,elements:r}=e,o=await(i.isRTL==null?void 0:i.isRTL(r.floating)),n=lt(s),a=Dt(s),d=Ge(s)==="y",c=Qn.has(n)?-1:1,p=o&&d?-1:1,f=Mt(t,e);let{mainAxis:b,crossAxis:m,alignmentAxis:g}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return a&&typeof g=="number"&&(m=a==="end"?g*-1:g),d?{x:m*p,y:b*c}:{x:b*c,y:m*p}}const Jn=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var s,i;const{x:r,y:o,placement:n,middlewareData:a}=t,d=await Zn(t,e);return n===((s=a.offset)==null?void 0:s.placement)&&(i=a.arrow)!=null&&i.alignmentOffset?{}:{x:r+d.x,y:o+d.y,data:{...d,placement:n}}}}},ea=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:s,y:i,placement:r}=t,{mainAxis:o=!0,crossAxis:n=!1,limiter:a={fn:w=>{let{x:_,y:E}=w;return{x:_,y:E}}},...d}=Mt(e,t),c={x:s,y:i},p=await qi(t,d),f=Ge(lt(r)),b=ao(f);let m=c[b],g=c[f];if(o){const w=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=m+p[w],O=m-p[_];m=zi(E,m,O)}if(n){const w=f==="y"?"top":"left",_=f==="y"?"bottom":"right",E=g+p[w],O=g-p[_];g=zi(E,g,O)}const v=a.fn({...t,[b]:m,[f]:g});return{...v,data:{x:v.x-s,y:v.y-i,enabled:{[b]:o,[f]:n}}}}}},ta=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var s,i;const{placement:r,rects:o,platform:n,elements:a}=t,{apply:d=()=>{},...c}=Mt(e,t),p=await qi(t,c),f=lt(r),b=Dt(r),m=Ge(r)==="y",{width:g,height:v}=o.floating;let w,_;f==="top"||f==="bottom"?(w=f,_=b===(await(n.isRTL==null?void 0:n.isRTL(a.floating))?"start":"end")?"left":"right"):(_=f,w=b==="end"?"top":"bottom");const E=v-p.top-p.bottom,O=g-p.left-p.right,q=at(v-p[w],E),j=at(g-p[_],O),ne=!t.middlewareData.shift;let V=q,qe=j;if((s=t.middlewareData.shift)!=null&&s.enabled.x&&(qe=O),(i=t.middlewareData.shift)!=null&&i.enabled.y&&(V=E),ne&&!b){const xe=pe(p.left,0),st=pe(p.right,0),Fe=pe(p.top,0),it=pe(p.bottom,0);m?qe=g-2*(xe!==0||st!==0?xe+st:pe(p.left,p.right)):V=v-2*(Fe!==0||it!==0?Fe+it:pe(p.top,p.bottom))}await d({...t,availableWidth:qe,availableHeight:V});const Le=await n.getDimensions(a.floating);return g!==Le.width||v!==Le.height?{reset:{rects:!0}}:{}}}};function Qs(){return typeof window<"u"}function Pt(e){return co(e)?(e.nodeName||"").toLowerCase():"#document"}function me(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ue(e){var t;return(t=(co(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function co(e){return Qs()?e instanceof Node||e instanceof me(e).Node:!1}function Ae(e){return Qs()?e instanceof Element||e instanceof me(e).Element:!1}function je(e){return Qs()?e instanceof HTMLElement||e instanceof me(e).HTMLElement:!1}function yr(e){return!Qs()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof me(e).ShadowRoot}const sa=new Set(["inline","contents"]);function as(e){const{overflow:t,overflowX:s,overflowY:i,display:r}=Oe(e);return/auto|scroll|overlay|hidden|clip/.test(t+i+s)&&!sa.has(r)}const ia=new Set(["table","td","th"]);function ra(e){return ia.has(Pt(e))}const oa=[":popover-open",":modal"];function Zs(e){return oa.some(t=>{try{return e.matches(t)}catch{return!1}})}const na=["transform","translate","scale","rotate","perspective"],aa=["transform","translate","scale","rotate","perspective","filter"],la=["paint","layout","strict","content"];function Js(e){const t=Yi(),s=Ae(e)?Oe(e):e;return na.some(i=>s[i]?s[i]!=="none":!1)||(s.containerType?s.containerType!=="normal":!1)||!t&&(s.backdropFilter?s.backdropFilter!=="none":!1)||!t&&(s.filter?s.filter!=="none":!1)||aa.some(i=>(s.willChange||"").includes(i))||la.some(i=>(s.contain||"").includes(i))}function ca(e){let t=ct(e);for(;je(t)&&!At(t);){if(Js(t))return t;if(Zs(t))return null;t=ct(t)}return null}function Yi(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const da=new Set(["html","body","#document"]);function At(e){return da.has(Pt(e))}function Oe(e){return me(e).getComputedStyle(e)}function ei(e){return Ae(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ct(e){if(Pt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||yr(e)&&e.host||Ue(e);return yr(t)?t.host:t}function uo(e){const t=ct(e);return At(t)?e.ownerDocument?e.ownerDocument.body:e.body:je(t)&&as(t)?t:uo(t)}function ss(e,t,s){var i;t===void 0&&(t=[]),s===void 0&&(s=!0);const r=uo(e),o=r===((i=e.ownerDocument)==null?void 0:i.body),n=me(r);if(o){const a=Ai(n);return t.concat(n,n.visualViewport||[],as(r)?r:[],a&&s?ss(a):[])}return t.concat(r,ss(r,[],s))}function Ai(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function ho(e){const t=Oe(e);let s=parseFloat(t.width)||0,i=parseFloat(t.height)||0;const r=je(e),o=r?e.offsetWidth:s,n=r?e.offsetHeight:i,a=Is(s)!==o||Is(i)!==n;return a&&(s=o,i=n),{width:s,height:i,$:a}}function Ki(e){return Ae(e)?e:e.contextElement}function Rt(e){const t=Ki(e);if(!je(t))return He(1);const s=t.getBoundingClientRect(),{width:i,height:r,$:o}=ho(t);let n=(o?Is(s.width):s.width)/i,a=(o?Is(s.height):s.height)/r;return(!n||!Number.isFinite(n))&&(n=1),(!a||!Number.isFinite(a))&&(a=1),{x:n,y:a}}const ua=He(0);function po(e){const t=me(e);return!Yi()||!t.visualViewport?ua:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function ha(e,t,s){return t===void 0&&(t=!1),!s||t&&s!==me(e)?!1:t}function yt(e,t,s,i){t===void 0&&(t=!1),s===void 0&&(s=!1);const r=e.getBoundingClientRect(),o=Ki(e);let n=He(1);t&&(i?Ae(i)&&(n=Rt(i)):n=Rt(e));const a=ha(o,s,i)?po(o):He(0);let d=(r.left+a.x)/n.x,c=(r.top+a.y)/n.y,p=r.width/n.x,f=r.height/n.y;if(o){const b=me(o),m=i&&Ae(i)?me(i):i;let g=b,v=Ai(g);for(;v&&i&&m!==g;){const w=Rt(v),_=v.getBoundingClientRect(),E=Oe(v),O=_.left+(v.clientLeft+parseFloat(E.paddingLeft))*w.x,q=_.top+(v.clientTop+parseFloat(E.paddingTop))*w.y;d*=w.x,c*=w.y,p*=w.x,f*=w.y,d+=O,c+=q,g=me(v),v=Ai(g)}}return Ds({width:p,height:f,x:d,y:c})}function ti(e,t){const s=ei(e).scrollLeft;return t?t.left+s:yt(Ue(e)).left+s}function mo(e,t){const s=e.getBoundingClientRect(),i=s.left+t.scrollLeft-ti(e,s),r=s.top+t.scrollTop;return{x:i,y:r}}function pa(e){let{elements:t,rect:s,offsetParent:i,strategy:r}=e;const o=r==="fixed",n=Ue(i),a=t?Zs(t.floating):!1;if(i===n||a&&o)return s;let d={scrollLeft:0,scrollTop:0},c=He(1);const p=He(0),f=je(i);if((f||!f&&!o)&&((Pt(i)!=="body"||as(n))&&(d=ei(i)),je(i))){const m=yt(i);c=Rt(i),p.x=m.x+i.clientLeft,p.y=m.y+i.clientTop}const b=n&&!f&&!o?mo(n,d):He(0);return{width:s.width*c.x,height:s.height*c.y,x:s.x*c.x-d.scrollLeft*c.x+p.x+b.x,y:s.y*c.y-d.scrollTop*c.y+p.y+b.y}}function ma(e){return Array.from(e.getClientRects())}function fa(e){const t=Ue(e),s=ei(e),i=e.ownerDocument.body,r=pe(t.scrollWidth,t.clientWidth,i.scrollWidth,i.clientWidth),o=pe(t.scrollHeight,t.clientHeight,i.scrollHeight,i.clientHeight);let n=-s.scrollLeft+ti(e);const a=-s.scrollTop;return Oe(i).direction==="rtl"&&(n+=pe(t.clientWidth,i.clientWidth)-r),{width:r,height:o,x:n,y:a}}const kr=25;function ba(e,t){const s=me(e),i=Ue(e),r=s.visualViewport;let o=i.clientWidth,n=i.clientHeight,a=0,d=0;if(r){o=r.width,n=r.height;const p=Yi();(!p||p&&t==="fixed")&&(a=r.offsetLeft,d=r.offsetTop)}const c=ti(i);if(c<=0){const p=i.ownerDocument,f=p.body,b=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(i.clientWidth-f.clientWidth-m);g<=kr&&(o-=g)}else c<=kr&&(o+=c);return{width:o,height:n,x:a,y:d}}const ga=new Set(["absolute","fixed"]);function va(e,t){const s=yt(e,!0,t==="fixed"),i=s.top+e.clientTop,r=s.left+e.clientLeft,o=je(e)?Rt(e):He(1),n=e.clientWidth*o.x,a=e.clientHeight*o.y,d=r*o.x,c=i*o.y;return{width:n,height:a,x:d,y:c}}function wr(e,t,s){let i;if(t==="viewport")i=ba(e,s);else if(t==="document")i=fa(Ue(e));else if(Ae(t))i=va(t,s);else{const r=po(e);i={x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height}}return Ds(i)}function fo(e,t){const s=ct(e);return s===t||!Ae(s)||At(s)?!1:Oe(s).position==="fixed"||fo(s,t)}function ya(e,t){const s=t.get(e);if(s)return s;let i=ss(e,[],!1).filter(a=>Ae(a)&&Pt(a)!=="body"),r=null;const o=Oe(e).position==="fixed";let n=o?ct(e):e;for(;Ae(n)&&!At(n);){const a=Oe(n),d=Js(n);!d&&a.position==="fixed"&&(r=null),(o?!d&&!r:!d&&a.position==="static"&&!!r&&ga.has(r.position)||as(n)&&!d&&fo(e,n))?i=i.filter(p=>p!==n):r=a,n=ct(n)}return t.set(e,i),i}function ka(e){let{element:t,boundary:s,rootBoundary:i,strategy:r}=e;const n=[...s==="clippingAncestors"?Zs(t)?[]:ya(t,this._c):[].concat(s),i],a=n[0],d=n.reduce((c,p)=>{const f=wr(t,p,r);return c.top=pe(f.top,c.top),c.right=at(f.right,c.right),c.bottom=at(f.bottom,c.bottom),c.left=pe(f.left,c.left),c},wr(t,a,r));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function wa(e){const{width:t,height:s}=ho(e);return{width:t,height:s}}function xa(e,t,s){const i=je(t),r=Ue(t),o=s==="fixed",n=yt(e,!0,o,t);let a={scrollLeft:0,scrollTop:0};const d=He(0);function c(){d.x=ti(r)}if(i||!i&&!o)if((Pt(t)!=="body"||as(r))&&(a=ei(t)),i){const m=yt(t,!0,o,t);d.x=m.x+t.clientLeft,d.y=m.y+t.clientTop}else r&&c();o&&!i&&r&&c();const p=r&&!i&&!o?mo(r,a):He(0),f=n.left+a.scrollLeft-d.x-p.x,b=n.top+a.scrollTop-d.y-p.y;return{x:f,y:b,width:n.width,height:n.height}}function gi(e){return Oe(e).position==="static"}function xr(e,t){if(!je(e)||Oe(e).position==="fixed")return null;if(t)return t(e);let s=e.offsetParent;return Ue(e)===s&&(s=s.ownerDocument.body),s}function bo(e,t){const s=me(e);if(Zs(e))return s;if(!je(e)){let r=ct(e);for(;r&&!At(r);){if(Ae(r)&&!gi(r))return r;r=ct(r)}return s}let i=xr(e,t);for(;i&&ra(i)&&gi(i);)i=xr(i,t);return i&&At(i)&&gi(i)&&!Js(i)?s:i||ca(e)||s}const _a=async function(e){const t=this.getOffsetParent||bo,s=this.getDimensions,i=await s(e.floating);return{reference:xa(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:i.width,height:i.height}}};function Ca(e){return Oe(e).direction==="rtl"}const Ss={convertOffsetParentRelativeRectToViewportRelativeRect:pa,getDocumentElement:Ue,getClippingRect:ka,getOffsetParent:bo,getElementRects:_a,getClientRects:ma,getDimensions:wa,getScale:Rt,isElement:Ae,isRTL:Ca};function go(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function $a(e,t){let s=null,i;const r=Ue(e);function o(){var a;clearTimeout(i),(a=s)==null||a.disconnect(),s=null}function n(a,d){a===void 0&&(a=!1),d===void 0&&(d=1),o();const c=e.getBoundingClientRect(),{left:p,top:f,width:b,height:m}=c;if(a||t(),!b||!m)return;const g=vs(f),v=vs(r.clientWidth-(p+b)),w=vs(r.clientHeight-(f+m)),_=vs(p),O={rootMargin:-g+"px "+-v+"px "+-w+"px "+-_+"px",threshold:pe(0,at(1,d))||1};let q=!0;function j(ne){const V=ne[0].intersectionRatio;if(V!==d){if(!q)return n();V?n(!1,V):i=setTimeout(()=>{n(!1,1e-7)},1e3)}V===1&&!go(c,e.getBoundingClientRect())&&n(),q=!1}try{s=new IntersectionObserver(j,{...O,root:r.ownerDocument})}catch{s=new IntersectionObserver(j,O)}s.observe(e)}return n(!0),o}function Ta(e,t,s,i){i===void 0&&(i={});const{ancestorScroll:r=!0,ancestorResize:o=!0,elementResize:n=typeof ResizeObserver=="function",layoutShift:a=typeof IntersectionObserver=="function",animationFrame:d=!1}=i,c=Ki(e),p=r||o?[...c?ss(c):[],...ss(t)]:[];p.forEach(_=>{r&&_.addEventListener("scroll",s,{passive:!0}),o&&_.addEventListener("resize",s)});const f=c&&a?$a(c,s):null;let b=-1,m=null;n&&(m=new ResizeObserver(_=>{let[E]=_;E&&E.target===c&&m&&(m.unobserve(t),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var O;(O=m)==null||O.observe(t)})),s()}),c&&!d&&m.observe(c),m.observe(t));let g,v=d?yt(e):null;d&&w();function w(){const _=yt(e);v&&!go(v,_)&&s(),v=_,g=requestAnimationFrame(w)}return s(),()=>{var _;p.forEach(E=>{r&&E.removeEventListener("scroll",s),o&&E.removeEventListener("resize",s)}),f==null||f(),(_=m)==null||_.disconnect(),m=null,d&&cancelAnimationFrame(g)}}const Sa=Jn,Ea=ea,za=Gn,_r=ta,Ra=Xn,Aa=(e,t,s)=>{const i=new Map,r={platform:Ss,...s},o={...r.platform,_c:i};return Kn(e,t,{...r,platform:o})};function Oa(e){return Ia(e)}function vi(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Ia(e){for(let t=e;t;t=vi(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=vi(e);t;t=vi(t)){if(!(t instanceof Element))continue;const s=getComputedStyle(t);if(s.display!=="contents"&&(s.position!=="static"||Js(s)||t.tagName==="BODY"))return t}return null}function Ma(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var L=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),s=this.placement.includes("top")||this.placement.includes("bottom");let i=0,r=0,o=0,n=0,a=0,d=0,c=0,p=0;s?e.top<t.top?(i=e.left,r=e.bottom,o=e.right,n=e.bottom,a=t.left,d=t.top,c=t.right,p=t.top):(i=t.left,r=t.bottom,o=t.right,n=t.bottom,a=e.left,d=e.top,c=e.right,p=e.top):e.left<t.left?(i=e.right,r=e.top,o=t.left,n=t.top,a=e.right,d=e.bottom,c=t.left,p=t.bottom):(i=t.right,r=t.top,o=e.left,n=e.top,a=t.right,d=t.bottom,c=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${i}px`),this.style.setProperty("--hover-bridge-top-left-y",`${r}px`),this.style.setProperty("--hover-bridge-top-right-x",`${o}px`),this.style.setProperty("--hover-bridge-top-right-y",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${c}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||Ma(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Ta(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[Sa({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(_r({apply:({rects:s})=>{const i=this.sync==="width"||this.sync==="both",r=this.sync==="height"||this.sync==="both";this.popup.style.width=i?`${s.reference.width}px`:"",this.popup.style.height=r?`${s.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(za({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(Ea({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(_r({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:s,availableHeight:i})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${i}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${s}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(Ra({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?s=>Ss.getOffsetParent(s,Oa):Ss.getOffsetParent;Aa(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:os(et({},Ss),{getOffsetParent:t})}).then(({x:s,y:i,middlewareData:r,placement:o})=>{const n=this.localize.dir()==="rtl",a={top:"bottom",right:"left",bottom:"top",left:"right"}[o.split("-")[0]];if(this.setAttribute("data-current-placement",o),Object.assign(this.popup.style,{left:`${s}px`,top:`${i}px`}),this.arrow){const d=r.arrow.x,c=r.arrow.y;let p="",f="",b="",m="";if(this.arrowPlacement==="start"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=n?g:"",m=n?"":g}else if(this.arrowPlacement==="end"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=n?"":g,m=n?g:"",b=typeof c=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof c=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof d=="number"?`${d}px`:"",p=typeof c=="number"?`${c}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:b,left:m,[a]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return h`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${N({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${N({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?h`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};L.styles=[H,Ln];l([C(".popup")],L.prototype,"popup",2);l([C(".popup__arrow")],L.prototype,"arrowEl",2);l([u()],L.prototype,"anchor",2);l([u({type:Boolean,reflect:!0})],L.prototype,"active",2);l([u({reflect:!0})],L.prototype,"placement",2);l([u({reflect:!0})],L.prototype,"strategy",2);l([u({type:Number})],L.prototype,"distance",2);l([u({type:Number})],L.prototype,"skidding",2);l([u({type:Boolean})],L.prototype,"arrow",2);l([u({attribute:"arrow-placement"})],L.prototype,"arrowPlacement",2);l([u({attribute:"arrow-padding",type:Number})],L.prototype,"arrowPadding",2);l([u({type:Boolean})],L.prototype,"flip",2);l([u({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],L.prototype,"flipFallbackPlacements",2);l([u({attribute:"flip-fallback-strategy"})],L.prototype,"flipFallbackStrategy",2);l([u({type:Object})],L.prototype,"flipBoundary",2);l([u({attribute:"flip-padding",type:Number})],L.prototype,"flipPadding",2);l([u({type:Boolean})],L.prototype,"shift",2);l([u({type:Object})],L.prototype,"shiftBoundary",2);l([u({attribute:"shift-padding",type:Number})],L.prototype,"shiftPadding",2);l([u({attribute:"auto-size"})],L.prototype,"autoSize",2);l([u()],L.prototype,"sync",2);l([u({type:Object})],L.prototype,"autoSizeBoundary",2);l([u({attribute:"auto-size-padding",type:Number})],L.prototype,"autoSizePadding",2);l([u({attribute:"hover-bridge",type:Boolean})],L.prototype,"hoverBridge",2);var vo=new Map,Da=new WeakMap;function Pa(e){return e??{keyframes:[],options:{duration:0}}}function Cr(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function B(e,t){vo.set(e,Pa(t))}function Y(e,t,s){const i=Da.get(e);if(i!=null&&i[t])return Cr(i[t],s.dir);const r=vo.get(t);return r?Cr(r,s.dir):{keyframes:[],options:{duration:0}}}function ue(e,t){return new Promise(s=>{function i(r){r.target===e&&(e.removeEventListener(t,i),s())}e.addEventListener(t,i)})}function K(e,t,s){return new Promise(i=>{if((s==null?void 0:s.duration)===1/0)throw new Error("Promise-based animations must be finite.");const r=e.animate(t,os(et({},s),{duration:La()?0:s.duration}));r.addEventListener("cancel",i,{once:!0}),r.addEventListener("finish",i,{once:!0})})}function $r(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function La(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function Q(e){return Promise.all(e.getAnimations().map(t=>new Promise(s=>{t.cancel(),requestAnimationFrame(s)})))}function Tr(e,t){return e.map(s=>os(et({},s),{height:s.height==="auto"?`${t}px`:s.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Oi=class extends Xs{constructor(t){if(super(t),this.it=y,t.type!==Xe.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===y||t==null)return this._t=void 0,this.it=t;if(t===Et)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const s=[t];return s.raw=s,this._t={_$litType$:this.constructor.resultType,strings:s,values:[]}}};Oi.directiveName="unsafeHTML",Oi.resultType=1;const Xi=Ks(Oi);var z=class extends D{constructor(){super(...arguments),this.formControlController=new ns(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new tt(this,"help-text","label"),this.localize=new re(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>h`
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
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,s=t.closest(".select__clear")!==null,i=t.closest("sl-icon-button")!==null;if(!(s||i)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const r=this.getAllOptions(),o=r.indexOf(this.currentOption);let n=Math.max(0,o);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(n=o+1,n>r.length-1&&(n=0)):e.key==="ArrowUp"?(n=o-1,n<0&&(n=r.length-1)):e.key==="Home"?n=0:e.key==="End"&&(n=r.length-1),this.setCurrentOption(r[n])}if(e.key&&e.key.length===1||e.key==="Backspace"){const r=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const o of r)if(o.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(o);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const s=e.composedPath().some(i=>i instanceof Element&&i.tagName.toLowerCase()==="sl-icon-button");this.disabled||s||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const s=e.target.closest("sl-option"),i=this.value;s&&!s.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(s):this.setSelectedOptions(s),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==i&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,s=Array.isArray(t)?t:[t],i=[];e.forEach(r=>i.push(r.value)),this.setSelectedOptions(e.filter(r=>s.includes(r.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(s=>{s.current=!1,s.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),s=Array.isArray(e)?e:[e];t.forEach(i=>i.selected=!1),s.length&&s.forEach(i=>i.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,s;const i=this.getAllOptions();this.selectedOptions=i.filter(o=>o.selected);const r=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(o=>o.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const o=this.selectedOptions[0];this.value=(e=o==null?void 0:o.value)!=null?e:"",this.displayLabel=(s=(t=o==null?void 0:o.getTextLabel)==null?void 0:t.call(o))!=null?s:""}this.valueHasChanged=r,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const s=this.getTag(e,t);return h`<div @sl-remove=${i=>this.handleTagRemove(i,e)}>
          ${typeof s=="string"?Xi(s):s}
        </div>`}else if(t===this.maxOptionsVisible)return h`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return h``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,s){if(super.attributeChangedCallback(e,t,s),e==="value"){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}}handleValueChange(){if(!this.valueHasChanged){const s=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=s}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(s=>t.includes(s.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await Q(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=Y(this,"select.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.currentOption&&Ei(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Q(this);const{keyframes:e,options:t}=Y(this,"select.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ue(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ue(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t,r=this.clearable&&!this.disabled&&this.value.length>0,o=this.placeholder&&this.value&&this.value.length<=0;return h`
      <div
        part="form-control"
        class=${N({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
      >
        <label
          id="label"
          part="form-control-label"
          class="form-control__label"
          aria-hidden=${s?"false":"true"}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <sl-popup
            class=${N({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":o,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${this.multiple?h`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${r?h`
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
          aria-hidden=${i?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};z.styles=[H,Gs,In];z.dependencies={"sl-icon":ee,"sl-popup":L,"sl-tag":Ct};l([C(".select")],z.prototype,"popup",2);l([C(".select__combobox")],z.prototype,"combobox",2);l([C(".select__display-input")],z.prototype,"displayInput",2);l([C(".select__value-input")],z.prototype,"valueInput",2);l([C(".select__listbox")],z.prototype,"listbox",2);l([k()],z.prototype,"hasFocus",2);l([k()],z.prototype,"displayLabel",2);l([k()],z.prototype,"currentOption",2);l([k()],z.prototype,"selectedOptions",2);l([k()],z.prototype,"valueHasChanged",2);l([u()],z.prototype,"name",2);l([k()],z.prototype,"value",1);l([u({attribute:"value"})],z.prototype,"defaultValue",2);l([u({reflect:!0})],z.prototype,"size",2);l([u()],z.prototype,"placeholder",2);l([u({type:Boolean,reflect:!0})],z.prototype,"multiple",2);l([u({attribute:"max-options-visible",type:Number})],z.prototype,"maxOptionsVisible",2);l([u({type:Boolean,reflect:!0})],z.prototype,"disabled",2);l([u({type:Boolean})],z.prototype,"clearable",2);l([u({type:Boolean,reflect:!0})],z.prototype,"open",2);l([u({type:Boolean})],z.prototype,"hoist",2);l([u({type:Boolean,reflect:!0})],z.prototype,"filled",2);l([u({type:Boolean,reflect:!0})],z.prototype,"pill",2);l([u()],z.prototype,"label",2);l([u({reflect:!0})],z.prototype,"placement",2);l([u({attribute:"help-text"})],z.prototype,"helpText",2);l([u({reflect:!0})],z.prototype,"form",2);l([u({type:Boolean,reflect:!0})],z.prototype,"required",2);l([u()],z.prototype,"getTag",2);l([S("disabled",{waitUntilFirstUpdate:!0})],z.prototype,"handleDisabledChange",1);l([S(["defaultValue","value"],{waitUntilFirstUpdate:!0})],z.prototype,"handleValueChange",1);l([S("open",{waitUntilFirstUpdate:!0})],z.prototype,"handleOpenChange",1);B("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});z.define("sl-select");var Fa=$`
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
`,Ce=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(s=>{s.nodeType===Node.ELEMENT_NODE&&(s.hasAttribute("slot")||(t+=s.textContent)),s.nodeType===Node.TEXT_NODE&&(t+=s.textContent)}),t.trim()}render(){return h`
      <div
        part="base"
        class=${N({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};Ce.styles=[H,Fa];Ce.dependencies={"sl-icon":ee};l([C(".option__label")],Ce.prototype,"defaultSlot",2);l([k()],Ce.prototype,"current",2);l([k()],Ce.prototype,"selected",2);l([k()],Ce.prototype,"hasHover",2);l([u({reflect:!0})],Ce.prototype,"value",2);l([u({type:Boolean,reflect:!0})],Ce.prototype,"disabled",2);l([S("disabled")],Ce.prototype,"handleDisabledChange",1);l([S("selected")],Ce.prototype,"handleSelectedChange",1);l([S("value")],Ce.prototype,"handleValueChange",1);Ce.define("sl-option");var Na=$`
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
`;function*Gi(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*hn(Gi(e.shadowRoot.activeElement))))}function yo(){return[...Gi()].pop()}var Sr=new WeakMap;function ko(e){let t=Sr.get(e);return t||(t=window.getComputedStyle(e,null),Sr.set(e,t)),t}function Ba(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=ko(e);return t.visibility!=="hidden"&&t.display!=="none"}function Ha(e){const t=ko(e),{overflowY:s,overflowX:i}=t;return s==="scroll"||i==="scroll"?!0:s!=="auto"||i!=="auto"?!1:e.scrollHeight>e.clientHeight&&s==="auto"||e.scrollWidth>e.clientWidth&&i==="auto"}function ja(e){const t=e.tagName.toLowerCase(),s=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(s)||s<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const o=e.getRootNode(),n=`input[type='radio'][name="${e.getAttribute("name")}"]`,a=o.querySelector(`${n}:checked`);return a?a===e:o.querySelector(n)===e}return Ba(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:Ha(e):!1}function Ua(e){var t,s;const i=Ii(e),r=(t=i[0])!=null?t:null,o=(s=i[i.length-1])!=null?s:null;return{start:r,end:o}}function Va(e,t){var s;return((s=e.getRootNode({composed:!0}))==null?void 0:s.host)!==t}function Ii(e){const t=new WeakMap,s=[];function i(r){if(r instanceof Element){if(r.hasAttribute("inert")||r.closest("[inert]")||t.has(r))return;t.set(r,!0),!s.includes(r)&&ja(r)&&s.push(r),r instanceof HTMLSlotElement&&Va(r,e)&&r.assignedElements({flatten:!0}).forEach(o=>{i(o)}),r.shadowRoot!==null&&r.shadowRoot.mode==="open"&&i(r.shadowRoot)}for(const o of r.children)i(o)}return i(e),s.sort((r,o)=>{const n=Number(r.getAttribute("tabindex"))||0;return(Number(o.getAttribute("tabindex"))||0)-n})}var Wt=[],wo=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var s;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const i=yo();if(this.previousFocus=i,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const r=Ii(this.element);let o=r.findIndex(a=>a===i);this.previousFocus=this.currentFocus;const n=this.tabDirection==="forward"?1:-1;for(;;){o+n>=r.length?o=0:o+n<0?o=r.length-1:o+=n,this.previousFocus=this.currentFocus;const a=r[o];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||a&&this.possiblyHasTabbableChildren(a))return;t.preventDefault(),this.currentFocus=a,(s=this.currentFocus)==null||s.focus({preventScroll:!1});const d=[...Gi()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Wt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Wt=Wt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Wt[Wt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=Ii(this.element);if(!this.element.matches(":focus-within")){const t=e[0],s=e[e.length-1],i=this.tabDirection==="forward"?t:s;typeof(i==null?void 0:i.focus)=="function"&&(this.currentFocus=i,i.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},Qi=e=>{var t;const{activeElement:s}=document;s&&e.contains(s)&&((t=document.activeElement)==null||t.blur())};function Er(e){return e.charAt(0).toUpperCase()+e.slice(1)}var ge=class extends D{constructor(){super(...arguments),this.hasSlotController=new tt(this,"footer"),this.localize=new re(this),this.modal=new wo(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Zt(this)))}disconnectedCallback(){super.disconnectedCallback(),Jt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const s=Y(this,"drawer.denyClose",{dir:this.localize.dir()});K(this.panel,s.keyframes,s.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Zt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Q(this.drawer),Q(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=Y(this,`drawer.show${Er(this.placement)}`,{dir:this.localize.dir()}),s=Y(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,s.keyframes,s.options)]),this.emit("sl-after-show")}else{Qi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Jt(this)),await Promise.all([Q(this.drawer),Q(this.overlay)]);const e=Y(this,`drawer.hide${Er(this.placement)}`,{dir:this.localize.dir()}),t=Y(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const s=this.originalTrigger;typeof(s==null?void 0:s.focus)=="function"&&setTimeout(()=>s.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Zt(this)),this.open&&this.contained&&(this.modal.deactivate(),Jt(this))}async show(){if(!this.open)return this.open=!0,ue(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ue(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${N({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":h`
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
    `}};ge.styles=[H,Na];ge.dependencies={"sl-icon-button":G};l([C(".drawer")],ge.prototype,"drawer",2);l([C(".drawer__panel")],ge.prototype,"panel",2);l([C(".drawer__overlay")],ge.prototype,"overlay",2);l([u({type:Boolean,reflect:!0})],ge.prototype,"open",2);l([u({reflect:!0})],ge.prototype,"label",2);l([u({reflect:!0})],ge.prototype,"placement",2);l([u({type:Boolean,reflect:!0})],ge.prototype,"contained",2);l([u({attribute:"no-header",type:Boolean,reflect:!0})],ge.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],ge.prototype,"handleOpenChange",1);l([S("contained",{waitUntilFirstUpdate:!0})],ge.prototype,"handleNoModalChange",1);B("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});B("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});B("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});B("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});B("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});B("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});ge.define("sl-drawer");var Wa=$`
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
`,Ve=class extends D{constructor(){super(...arguments),this.hasSlotController=new tt(this,"footer"),this.localize=new re(this),this.modal=new wo(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Zt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Jt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const s=Y(this,"dialog.denyClose",{dir:this.localize.dir()});K(this.panel,s.keyframes,s.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Zt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Q(this.dialog),Q(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=Y(this,"dialog.show",{dir:this.localize.dir()}),s=Y(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,s.keyframes,s.options)]),this.emit("sl-after-show")}else{Qi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([Q(this.dialog),Q(this.overlay)]);const e=Y(this,"dialog.hide",{dir:this.localize.dir()}),t=Y(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Jt(this);const s=this.originalTrigger;typeof(s==null?void 0:s.focus)=="function"&&setTimeout(()=>s.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ue(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ue(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${N({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
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
          ${this.noHeader?"":h`
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
    `}};Ve.styles=[H,Wa];Ve.dependencies={"sl-icon-button":G};l([C(".dialog")],Ve.prototype,"dialog",2);l([C(".dialog__panel")],Ve.prototype,"panel",2);l([C(".dialog__overlay")],Ve.prototype,"overlay",2);l([u({type:Boolean,reflect:!0})],Ve.prototype,"open",2);l([u({reflect:!0})],Ve.prototype,"label",2);l([u({attribute:"no-header",type:Boolean,reflect:!0})],Ve.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],Ve.prototype,"handleOpenChange",1);B("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});B("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});B("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Ve.define("sl-dialog");var qa=$`
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
`,ls=class extends D{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return h`
      <span
        part="base"
        class=${N({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};ls.styles=[H,qa];l([u({reflect:!0})],ls.prototype,"variant",2);l([u({type:Boolean,reflect:!0})],ls.prototype,"pill",2);l([u({type:Boolean,reflect:!0})],ls.prototype,"pulse",2);ls.define("sl-badge");var Ya=$`
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
`,ve=class ft extends D{constructor(){super(...arguments),this.hasSlotController=new tt(this,"icon","suffix"),this.localize=new re(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,s="100%",i="0";this.countdownAnimation=t.animate([{width:s},{width:i}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await Q(this.base),this.base.hidden=!1;const{keyframes:t,options:s}=Y(this,"alert.show",{dir:this.localize.dir()});await K(this.base,t,s),this.emit("sl-after-show")}else{Qi(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await Q(this.base);const{keyframes:t,options:s}=Y(this,"alert.hide",{dir:this.localize.dir()});await K(this.base,t,s),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ue(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ue(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),ft.toastStack.parentElement===null&&document.body.append(ft.toastStack),ft.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{ft.toastStack.removeChild(this),t(),ft.toastStack.querySelector("sl-alert")===null&&ft.toastStack.remove()},{once:!0})})}render(){return h`
      <div
        part="base"
        class=${N({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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

        ${this.closable?h`
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

        ${this.countdown?h`
              <div
                class=${N({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};ve.styles=[H,Ya];ve.dependencies={"sl-icon-button":G};l([C('[part~="base"]')],ve.prototype,"base",2);l([C(".alert__countdown-elapsed")],ve.prototype,"countdownElement",2);l([u({type:Boolean,reflect:!0})],ve.prototype,"open",2);l([u({type:Boolean,reflect:!0})],ve.prototype,"closable",2);l([u({reflect:!0})],ve.prototype,"variant",2);l([u({type:Number})],ve.prototype,"duration",2);l([u({type:String,reflect:!0})],ve.prototype,"countdown",2);l([k()],ve.prototype,"remainingTime",2);l([S("open",{waitUntilFirstUpdate:!0})],ve.prototype,"handleOpenChange",1);l([S("duration")],ve.prototype,"handleDurationChange",1);var Ka=ve;B("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});Ka.define("sl-alert");var Xa=$`
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
`,A=class extends D{constructor(){super(...arguments),this.formControlController=new ns(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new tt(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,s="none"){this.input.setSelectionRange(e,t,s)}setRangeText(e,t,s,i="preserve"){const r=t??this.input.selectionStart,o=s??this.input.selectionEnd;this.input.setRangeText(e,r,o,i),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t;return h`
      <div
        part="form-control"
        class=${N({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${s?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${N({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${Os(this.value)}
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
          aria-hidden=${i?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};A.styles=[H,Gs,Xa];l([C(".textarea__control")],A.prototype,"input",2);l([C(".textarea__size-adjuster")],A.prototype,"sizeAdjuster",2);l([k()],A.prototype,"hasFocus",2);l([u()],A.prototype,"title",2);l([u()],A.prototype,"name",2);l([u()],A.prototype,"value",2);l([u({reflect:!0})],A.prototype,"size",2);l([u({type:Boolean,reflect:!0})],A.prototype,"filled",2);l([u()],A.prototype,"label",2);l([u({attribute:"help-text"})],A.prototype,"helpText",2);l([u()],A.prototype,"placeholder",2);l([u({type:Number})],A.prototype,"rows",2);l([u()],A.prototype,"resize",2);l([u({type:Boolean,reflect:!0})],A.prototype,"disabled",2);l([u({type:Boolean,reflect:!0})],A.prototype,"readonly",2);l([u({reflect:!0})],A.prototype,"form",2);l([u({type:Boolean,reflect:!0})],A.prototype,"required",2);l([u({type:Number})],A.prototype,"minlength",2);l([u({type:Number})],A.prototype,"maxlength",2);l([u()],A.prototype,"autocapitalize",2);l([u()],A.prototype,"autocorrect",2);l([u()],A.prototype,"autocomplete",2);l([u({type:Boolean})],A.prototype,"autofocus",2);l([u()],A.prototype,"enterkeyhint",2);l([u({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],A.prototype,"spellcheck",2);l([u()],A.prototype,"inputmode",2);l([Ui()],A.prototype,"defaultValue",2);l([S("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);l([S("rows",{waitUntilFirstUpdate:!0})],A.prototype,"handleRowsChange",1);l([S("value",{waitUntilFirstUpdate:!0})],A.prototype,"handleValueChange",1);A.define("sl-textarea");var Ga=$`
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
`,oe=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const s=(i,r)=>{if(!i)return null;const o=i.closest(r);if(o)return o;const n=i.getRootNode();return n instanceof ShadowRoot?s(n.host,r):null};setTimeout(()=>{var i;const r=((i=this.containingElement)==null?void 0:i.getRootNode())instanceof ShadowRoot?yo():document.activeElement;(!this.containingElement||s(r,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const s=t.getAllItems(),i=s[0],r=s[s.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),s.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(i),i.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(r),r.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(i=>Ua(i).start);let s;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":s=t.button;break;default:s=t}s.setAttribute("aria-haspopup","true"),s.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ue(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ue(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await Q(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=Y(this,"dropdown.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Q(this);const{keyframes:e,options:t}=Y(this,"dropdown.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return h`
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
        class=${N({dropdown:!0,"dropdown--open":this.open})}
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
    `}};oe.styles=[H,Ga];oe.dependencies={"sl-popup":L};l([C(".dropdown")],oe.prototype,"popup",2);l([C(".dropdown__trigger")],oe.prototype,"trigger",2);l([C(".dropdown__panel")],oe.prototype,"panel",2);l([u({type:Boolean,reflect:!0})],oe.prototype,"open",2);l([u({reflect:!0})],oe.prototype,"placement",2);l([u({type:Boolean,reflect:!0})],oe.prototype,"disabled",2);l([u({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],oe.prototype,"stayOpenOnSelect",2);l([u({attribute:!1})],oe.prototype,"containingElement",2);l([u({type:Number})],oe.prototype,"distance",2);l([u({type:Number})],oe.prototype,"skidding",2);l([u({type:Boolean})],oe.prototype,"hoist",2);l([u({reflect:!0})],oe.prototype,"sync",2);l([S("open",{waitUntilFirstUpdate:!0})],oe.prototype,"handleOpenChange",1);B("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});oe.define("sl-dropdown");var Qa=$`
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
`,Zi=class extends D{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],s=e.composedPath(),i=s.find(a=>{var d;return t.includes(((d=a==null?void 0:a.getAttribute)==null?void 0:d.call(a,"role"))||"")});if(!i||s.find(a=>{var d;return((d=a==null?void 0:a.getAttribute)==null?void 0:d.call(a,"role"))==="menu"})!==this)return;const n=i;n.type==="checkbox"&&(n.checked=!n.checked),this.emit("sl-select",{detail:{item:n}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),s=this.getCurrentItem();let i=s?t.indexOf(s):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?i++:e.key==="ArrowUp"?i--:e.key==="Home"?i=0:e.key==="End"&&(i=t.length-1),i<0&&(i=t.length-1),i>t.length-1&&(i=0),this.setCurrentItem(t[i]),t[i].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(s=>{s.setAttribute("tabindex",s===e?"0":"-1")})}render(){return h`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Zi.styles=[H,Qa];l([C("slot")],Zi.prototype,"defaultSlot",2);Zi.define("sl-menu");var Za=$`
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
 */const es=(e,t)=>{var i;const s=e._$AN;if(s===void 0)return!1;for(const r of s)(i=r._$AO)==null||i.call(r,t,!1),es(r,t);return!0},Ps=e=>{let t,s;do{if((t=e._$AM)===void 0)break;s=t._$AN,s.delete(e),e=t}while((s==null?void 0:s.size)===0)},xo=e=>{for(let t;t=e._$AM;e=t){let s=t._$AN;if(s===void 0)t._$AN=s=new Set;else if(s.has(e))break;s.add(e),tl(t)}};function Ja(e){this._$AN!==void 0?(Ps(this),this._$AM=e,xo(this)):this._$AM=e}function el(e,t=!1,s=0){const i=this._$AH,r=this._$AN;if(r!==void 0&&r.size!==0)if(t)if(Array.isArray(i))for(let o=s;o<i.length;o++)es(i[o],!1),Ps(i[o]);else i!=null&&(es(i,!1),Ps(i));else es(this,e)}const tl=e=>{e.type==Xe.CHILD&&(e._$AP??(e._$AP=el),e._$AQ??(e._$AQ=Ja))};class sl extends Xs{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,s,i){super._$AT(t,s,i),xo(this),this.isConnected=t._$AU}_$AO(t,s=!0){var i,r;t!==this.isConnected&&(this.isConnected=t,t?(i=this.reconnected)==null||i.call(this):(r=this.disconnected)==null||r.call(this)),s&&(es(this,t),Ps(this))}setValue(t){if(oo(this._$Ct))this._$Ct._$AI(t,this);else{const s=[...this._$Ct._$AH];s[this._$Ci]=t,this._$Ct._$AI(s,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const il=()=>new rl;class rl{}const yi=new WeakMap,ol=Ks(class extends sl{render(e){return y}update(e,[t]){var i;const s=t!==this.G;return s&&this.G!==void 0&&this.rt(void 0),(s||this.lt!==this.ct)&&(this.G=t,this.ht=(i=e.options)==null?void 0:i.host,this.rt(this.ct=e.element)),y}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let s=yi.get(t);s===void 0&&(s=new WeakMap,yi.set(t,s)),s.get(this.G)!==void 0&&this.G.call(this.ht,void 0),s.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=yi.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var nl=class{constructor(e,t){this.popupRef=il(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=s=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${s.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${s.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=s=>{switch(s.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":s.target!==this.host&&(s.preventDefault(),s.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(s);break}},this.handleClick=s=>{var i;s.target===this.host?(s.preventDefault(),s.stopPropagation()):s.target instanceof Element&&(s.target.tagName==="sl-menu-item"||(i=s.target.role)!=null&&i.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=s=>{s.relatedTarget&&s.relatedTarget instanceof Element&&this.host.contains(s.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=s=>{s.stopPropagation()},this.handlePopupReposition=()=>{const s=this.host.renderRoot.querySelector("slot[name='submenu']"),i=s==null?void 0:s.assignedElements({flatten:!0}).filter(c=>c.localName==="sl-menu")[0],r=getComputedStyle(this.host).direction==="rtl";if(!i)return;const{left:o,top:n,width:a,height:d}=i.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${r?o+a:o}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${n}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${r?o+a:o}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${n+d}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let s=null;for(const i of t.assignedElements())if(s=i.querySelectorAll("sl-menu-item, [role^='menuitem']"),s.length!==0)break;if(!(!s||s.length===0)){s[0].setAttribute("tabindex","0");for(let i=1;i!==s.length;++i)s[i].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?s[0]instanceof HTMLElement&&s[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{s[0]instanceof HTMLElement&&s[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),i=["padding-top","border-top-width","margin-top"].reduce((r,o)=>{var n;const a=(n=t.get(o))!=null?n:new CSSUnitValue(0,"px"),c=(a instanceof CSSUnitValue?a:new CSSUnitValue(0,"px")).to("px");return r-c.value},0);this.skidding=i}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?h`
      <sl-popup
        ${ol(this.popupRef)}
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
    `:h` <slot name="submenu" hidden></slot> `}},ye=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new tt(this,"submenu"),this.submenuController=new nl(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return fn(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return h`
      <div
        id="anchor"
        part="base"
        class=${N({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
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
        ${this.loading?h` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};ye.styles=[H,Za];ye.dependencies={"sl-icon":ee,"sl-popup":L,"sl-spinner":Ys};l([C("slot:not([name])")],ye.prototype,"defaultSlot",2);l([C(".menu-item")],ye.prototype,"menuItem",2);l([u()],ye.prototype,"type",2);l([u({type:Boolean,reflect:!0})],ye.prototype,"checked",2);l([u()],ye.prototype,"value",2);l([u({type:Boolean,reflect:!0})],ye.prototype,"loading",2);l([u({type:Boolean,reflect:!0})],ye.prototype,"disabled",2);l([S("checked")],ye.prototype,"handleCheckedChange",1);l([S("disabled")],ye.prototype,"handleDisabledChange",1);l([S("type")],ye.prototype,"handleTypeChange",1);ye.define("sl-menu-item");ee.define("sl-icon");var al=$`
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
`,si=class extends D{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};si.styles=[H,al];l([u({type:Boolean,reflect:!0})],si.prototype,"vertical",2);l([S("vertical")],si.prototype,"handleVerticalChange",1);si.define("sl-divider");var ll=$`
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
`,te=class extends D{constructor(){super(),this.localize=new re(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=$r(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=$r(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await Q(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:s,options:i}=Y(this,"tooltip.show",{dir:this.localize.dir()});await K(this.popup.popup,s,i),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await Q(this.body);const{keyframes:s,options:i}=Y(this,"tooltip.hide",{dir:this.localize.dir()});await K(this.popup.popup,s,i),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ue(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ue(this,"sl-after-hide")}render(){return h`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${N({tooltip:!0,"tooltip--open":this.open})}
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
    `}};te.styles=[H,ll];te.dependencies={"sl-popup":L};l([C("slot:not([name])")],te.prototype,"defaultSlot",2);l([C(".tooltip__body")],te.prototype,"body",2);l([C("sl-popup")],te.prototype,"popup",2);l([u()],te.prototype,"content",2);l([u()],te.prototype,"placement",2);l([u({type:Boolean,reflect:!0})],te.prototype,"disabled",2);l([u({type:Number})],te.prototype,"distance",2);l([u({type:Boolean,reflect:!0})],te.prototype,"open",2);l([u({type:Number})],te.prototype,"skidding",2);l([u()],te.prototype,"trigger",2);l([u({type:Boolean})],te.prototype,"hoist",2);l([S("open",{waitUntilFirstUpdate:!0})],te.prototype,"handleOpenChange",1);l([S(["content","distance","hoist","placement","skidding"])],te.prototype,"handleOptionsChange",1);l([S("disabled")],te.prototype,"handleDisabledChange",1);B("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});B("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});te.define("sl-tooltip");var cl=$`
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
`,J=class extends D{constructor(){super(...arguments),this.formControlController=new ns(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new tt(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return h`
      <div
        class=${N({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${N({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${Os(this.indeterminate)}
            .checked=${Os(this.checked)}
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
            ${this.checked?h`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?h`
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
    `}};J.styles=[H,Gs,cl];J.dependencies={"sl-icon":ee};l([C('input[type="checkbox"]')],J.prototype,"input",2);l([k()],J.prototype,"hasFocus",2);l([u()],J.prototype,"title",2);l([u()],J.prototype,"name",2);l([u()],J.prototype,"value",2);l([u({reflect:!0})],J.prototype,"size",2);l([u({type:Boolean,reflect:!0})],J.prototype,"disabled",2);l([u({type:Boolean,reflect:!0})],J.prototype,"checked",2);l([u({type:Boolean,reflect:!0})],J.prototype,"indeterminate",2);l([Ui("checked")],J.prototype,"defaultChecked",2);l([u({reflect:!0})],J.prototype,"form",2);l([u({type:Boolean,reflect:!0})],J.prototype,"required",2);l([u({attribute:"help-text"})],J.prototype,"helpText",2);l([S("disabled",{waitUntilFirstUpdate:!0})],J.prototype,"handleDisabledChange",1);l([S(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],J.prototype,"handleStateChange",1);J.define("sl-checkbox");var dl=$`
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
`,ul=$`
  :host {
    display: contents;
  }
`,ii=class extends D{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(s=>this.resizeObserver.unobserve(s)),this.observedElements=[],t.forEach(s=>{this.resizeObserver.observe(s),this.observedElements.push(s)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return h` <slot @slotchange=${this.handleSlotChange}></slot> `}};ii.styles=[H,ul];l([u({type:Boolean,reflect:!0})],ii.prototype,"disabled",2);l([S("disabled",{waitUntilFirstUpdate:!0})],ii.prototype,"handleDisabledChange",1);var se=class extends D{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new re(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const s=t.filter(({target:i})=>{if(i===this)return!0;if(i.closest("sl-tab-group")!==this)return!1;const r=i.tagName.toLowerCase();return r==="sl-tab"||r==="sl-tab-panel"});if(s.length!==0){if(s.some(i=>!["aria-labelledby","aria-controls"].includes(i.attributeName))&&setTimeout(()=>this.setAriaLabels()),s.some(i=>i.attributeName==="disabled"))this.syncTabsAndPanels();else if(s.some(i=>i.attributeName==="active")){const r=s.filter(o=>o.attributeName==="active"&&o.target.tagName.toLowerCase()==="sl-tab").map(o=>o.target).find(o=>o.active);r&&this.setActiveTab(r)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((s,i)=>{var r;s[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((r=this.getActiveTab())!=null?r:this.tabs[0],{emitEvents:!1}),i.unobserve(s[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const s=e.target.closest("sl-tab");(s==null?void 0:s.closest("sl-tab-group"))===this&&s!==null&&this.setActiveTab(s,{scrollBehavior:"smooth"})}handleKeyDown(e){const s=e.target.closest("sl-tab");if((s==null?void 0:s.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&s!==null&&(this.setActiveTab(s,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const r=this.tabs.find(a=>a.matches(":focus")),o=this.localize.dir()==="rtl";let n=null;if((r==null?void 0:r.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")n=this.focusableTabs[0];else if(e.key==="End")n=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(o?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const a=this.tabs.findIndex(d=>d===r);n=this.findNextFocusableTab(a,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(o?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const a=this.tabs.findIndex(d=>d===r);n=this.findNextFocusableTab(a,"forward")}if(!n)return;n.tabIndex=0,n.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(n,{scrollBehavior:"smooth"}):this.tabs.forEach(a=>{a.tabIndex=a===n?0:-1}),["top","bottom"].includes(this.placement)&&Ei(n,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=et({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const s=this.activeTab;this.activeTab=e,this.tabs.forEach(i=>{i.active=i===this.activeTab,i.tabIndex=i===this.activeTab?0:-1}),this.panels.forEach(i=>{var r;return i.active=i.name===((r=this.activeTab)==null?void 0:r.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&Ei(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(s&&this.emit("sl-tab-hide",{detail:{name:s.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(s=>s.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,s=e.clientHeight,i=this.localize.dir()==="rtl",r=this.getAllTabs(),n=r.slice(0,r.indexOf(e)).reduce((a,d)=>({left:a.left+d.clientWidth,top:a.top+d.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=i?`${-1*n.left}px`:`${n.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${s}px`,this.indicator.style.translate=`0 ${n.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let s=null;const i=t==="forward"?1:-1;let r=e+i;for(;e<this.tabs.length;){if(s=this.tabs[r]||null,s===null){t==="forward"?s=this.focusableTabs[0]:s=this.focusableTabs[this.focusableTabs.length-1];break}if(!s.disabled)break;r+=i}return s}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(s=>s.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return h`
      <div
        part="base"
        class=${N({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${N({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
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

          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--end"
                  exportparts="base:scroll-button__base"
                  class=${N({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
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
    `}};se.styles=[H,dl];se.dependencies={"sl-icon-button":G,"sl-resize-observer":ii};l([C(".tab-group")],se.prototype,"tabGroup",2);l([C(".tab-group__body")],se.prototype,"body",2);l([C(".tab-group__nav")],se.prototype,"nav",2);l([C(".tab-group__indicator")],se.prototype,"indicator",2);l([k()],se.prototype,"hasScrollControls",2);l([k()],se.prototype,"shouldHideScrollStartButton",2);l([k()],se.prototype,"shouldHideScrollEndButton",2);l([u()],se.prototype,"placement",2);l([u()],se.prototype,"activation",2);l([u({attribute:"no-scroll-controls",type:Boolean})],se.prototype,"noScrollControls",2);l([u({attribute:"fixed-scroll-controls",type:Boolean})],se.prototype,"fixedScrollControls",2);l([pn({passive:!0})],se.prototype,"updateScrollButtons",1);l([S("noScrollControls",{waitUntilFirstUpdate:!0})],se.prototype,"updateScrollControls",1);l([S("placement",{waitUntilFirstUpdate:!0})],se.prototype,"syncIndicator",1);se.define("sl-tab-group");var hl=(e,t)=>{let s=0;return function(...i){window.clearTimeout(s),s=window.setTimeout(()=>{e.call(this,...i)},t)}},zr=(e,t,s)=>{const i=e[t];e[t]=function(...r){i.call(this,...r),s.call(this,i,...r)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,s=new WeakMap,i=o=>{for(const n of o.changedTouches)t.add(n.identifier)},r=o=>{for(const n of o.changedTouches)t.delete(n.identifier)};document.addEventListener("touchstart",i,!0),document.addEventListener("touchend",r,!0),document.addEventListener("touchcancel",r,!0),zr(EventTarget.prototype,"addEventListener",function(o,n){if(n!=="scrollend")return;const a=hl(()=>{t.size?a():this.dispatchEvent(new Event("scrollend"))},100);o.call(this,"scroll",a,{passive:!0}),s.set(this,a)}),zr(EventTarget.prototype,"removeEventListener",function(o,n){if(n!=="scrollend")return;const a=s.get(this);a&&o.call(this,"scroll",a,{passive:!0})})}})();var pl=$`
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
`,ml=0,Me=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.attrId=++ml,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,h`
      <div
        part="base"
        class=${N({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
      >
        <slot></slot>
        ${this.closable?h`
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
    `}};Me.styles=[H,pl];Me.dependencies={"sl-icon-button":G};l([C(".tab")],Me.prototype,"tab",2);l([u({reflect:!0})],Me.prototype,"panel",2);l([u({type:Boolean,reflect:!0})],Me.prototype,"active",2);l([u({type:Boolean,reflect:!0})],Me.prototype,"closable",2);l([u({type:Boolean,reflect:!0})],Me.prototype,"disabled",2);l([u({type:Number,reflect:!0})],Me.prototype,"tabIndex",2);l([S("active")],Me.prototype,"handleActiveChange",1);l([S("disabled")],Me.prototype,"handleDisabledChange",1);Me.define("sl-tab");var fl=$`
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
`,bl=0,cs=class extends D{constructor(){super(...arguments),this.attrId=++bl,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return h`
      <slot
        part="base"
        class=${N({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};cs.styles=[H,fl];l([u({reflect:!0})],cs.prototype,"name",2);l([u({type:Boolean,reflect:!0})],cs.prototype,"active",2);l([S("active")],cs.prototype,"handleActiveChange",1);cs.define("sl-tab-panel");Ys.define("sl-spinner");G.define("sl-icon-button");var gl=$`
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
`,De=class extends D{constructor(){super(...arguments),this.localize=new re(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await Q(this.body);const{keyframes:t,options:s}=Y(this,"details.show",{dir:this.localize.dir()});await K(this.body,Tr(t,this.body.scrollHeight),s),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await Q(this.body);const{keyframes:t,options:s}=Y(this,"details.hide",{dir:this.localize.dir()});await K(this.body,Tr(t,this.body.scrollHeight),s),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,ue(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,ue(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return h`
      <details
        part="base"
        class=${N({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
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
    `}};De.styles=[H,gl];De.dependencies={"sl-icon":ee};l([C(".details")],De.prototype,"details",2);l([C(".details__header")],De.prototype,"header",2);l([C(".details__body")],De.prototype,"body",2);l([C(".details__expand-icon-slot")],De.prototype,"expandIconSlot",2);l([u({type:Boolean,reflect:!0})],De.prototype,"open",2);l([u()],De.prototype,"summary",2);l([u({type:Boolean,reflect:!0})],De.prototype,"disabled",2);l([S("open",{waitUntilFirstUpdate:!0})],De.prototype,"handleOpenChange",1);B("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});B("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});De.define("sl-details");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let vl=class extends Event{constructor(t,s,i,r){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=s,this.callback=i,this.subscribe=r??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class yl{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,s=!1){const i=s||!Object.is(t,this.o);this.o=t,i&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[s,{disposer:i}]of this.subscriptions)s(this.o,i)},t!==void 0&&(this.value=t)}addCallback(t,s,i){if(!i)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:s});const{disposer:r}=this.subscriptions.get(t);t(this.value,r)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let kl=class extends Event{constructor(t,s){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=s}};class Rr extends yl{constructor(t,s,i){var r,o;super(s.context!==void 0?s.initialValue:i),this.onContextRequest=n=>{if(n.context!==this.context)return;const a=n.contextTarget??n.composedPath()[0];a!==this.host&&(n.stopPropagation(),this.addCallback(n.callback,a,n.subscribe))},this.onProviderRequest=n=>{if(n.context!==this.context||(n.contextTarget??n.composedPath()[0])===this.host)return;const a=new Set;for(const[d,{consumerHost:c}]of this.subscriptions)a.has(d)||(a.add(d),c.dispatchEvent(new vl(this.context,c,d,!0)));n.stopPropagation()},this.host=t,s.context!==void 0?this.context=s.context:this.context=s,this.attachListeners(),(o=(r=this.host).addController)==null||o.call(r,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new kl(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function wl({context:e}){return(t,s)=>{const i=new WeakMap;if(typeof s=="object")return{get(){return t.get.call(this)},set(r){return i.get(this).setValue(r),t.set.call(this,r)},init(r){return i.set(this,new Rr(this,{context:e,initialValue:r})),r}};{t.constructor.addInitializer(n=>{i.set(n,new Rr(n,{context:e}))});const r=Object.getOwnPropertyDescriptor(t,s);let o;if(r===void 0){const n=new WeakMap;o={get(){return n.get(this)},set(a){i.get(this).setValue(a),n.set(this,a)},configurable:!0,enumerable:!0}}else{const n=r.set;o={...r,set(a){i.get(this).setValue(a),n==null||n.call(this,a)}}}return void Object.defineProperty(t,s,o)}}}var le={},ri={};Object.defineProperty(ri,"__esModule",{value:!0});ri.StoreController=void 0;class xl{constructor(t,s){this.host=t,this.atom=s,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}ri.StoreController=xl;var Lt={};Object.defineProperty(Lt,"__esModule",{value:!0});Lt.MultiStoreController=void 0;class _l{constructor(t,s){this.host=t,this.atoms=s,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(s=>s())}get values(){return this.atoms.map(t=>t.get())}}Lt.MultiStoreController=_l;var oi={};Object.defineProperty(oi,"__esModule",{value:!0});oi.useStores=void 0;const Cl=Lt;function $l(...e){return t=>class extends t{constructor(...s){super(...s),new Cl.MultiStoreController(this,e)}}}oi.useStores=$l;var ni={};Object.defineProperty(ni,"__esModule",{value:!0});ni.withStores=void 0;const Tl=Lt,Sl=(e,t)=>class extends e{constructor(...i){super(...i),new Tl.MultiStoreController(this,t)}};ni.withStores=Sl;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=ri;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var s=Lt;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return s.MultiStoreController}});var i=oi;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return i.useStores}});var r=ni;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return r.withStores}})})(le);const El=Symbol("board"),zl={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let Ee=[],ot=0;const ys=4;let Es=0;const $e=e=>{let t=[],s={get(){return s.lc||s.listen(()=>{})(),s.value},lc:0,listen(i){return s.lc=t.push(i),()=>{for(let o=ot+ys;o<Ee.length;)Ee[o]===i?Ee.splice(o,ys):o+=ys;let r=t.indexOf(i);~r&&(t.splice(r,1),--s.lc||s.off())}},notify(i,r){Es++;let o=!Ee.length;for(let n of t)Ee.push(n,s.value,i,r);if(o){for(ot=0;ot<Ee.length;ot+=ys)Ee[ot](Ee[ot+1],Ee[ot+2],Ee[ot+3]);Ee.length=0}},off(){},set(i){let r=s.value;r!==i&&(s.value=i,s.notify(r))},subscribe(i){let r=s.listen(i);return i(s.value),r},value:e};return s},Rl=5,ks=6,ws=10;let Al=(e,t,s,i)=>(e.events=e.events||{},e.events[s+ws]||(e.events[s+ws]=i(r=>{e.events[s].reduceRight((o,n)=>(n(o),o),{shared:{},...r})})),e.events[s]=e.events[s]||[],e.events[s].push(t),()=>{let r=e.events[s],o=r.indexOf(t);r.splice(o,1),r.length||(delete e.events[s],e.events[s+ws](),delete e.events[s+ws])}),Ol=1e3,Il=(e,t)=>Al(e,i=>{let r=t(i);r&&e.events[ks].push(r)},Rl,i=>{let r=e.listen;e.listen=(...n)=>(!e.lc&&!e.active&&(e.active=!0,i()),r(...n));let o=e.off;return e.events[ks]=[],e.off=()=>{o(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let n of e.events[ks])n();e.events[ks]=[]}},Ol)},()=>{e.listen=r,e.off=o}}),Ml=(e,t,s)=>{Array.isArray(e)||(e=[e]);let i,r,o=()=>{if(r===Es)return;r=Es;let c=e.map(p=>p.get());if(!i||c.some((p,f)=>p!==i[f])){i=c;let p=t(...c);p&&p.then&&p.t?p.then(f=>{i===c&&n.set(f)}):(n.set(p),r=Es)}},n=$e(void 0),a=n.get;n.get=()=>(o(),a());let d=o;return Il(n,()=>{let c=e.map(p=>p.listen(d));return o(),()=>{for(let p of c)p()}}),n};const pt=(e,t)=>Ml(e,t),Dl=(e={})=>{let t=$e(e);return t.setKey=function(s,i){let r=t.value;typeof i>"u"&&s in t.value?(t.value={...t.value},delete t.value[s],t.notify(r,s)):t.value[s]!==i&&(t.value={...t.value,[s]:i},t.notify(r,s))},t},Qe=$e(!1),Ls=$e(null),ds=$e(!0),Pl=$e(!1),Ll=pt([Qe,ds],(e,t)=>e&&!t);function ki(e){Ls.set(e),Qe.set(!0)}function Fl(){Qe.set(!1),Ls.set(null),ds.set(!0)}function Nl(e){ds.set(e)}function Ar(e){Pl.set(e)}class Bl extends Error{constructor(t,s,i){super(t),this.status=s,this.body=i,this.name="ApiError"}}function Ji(e){if(!e)return[];const t=[],s=e.split(`
`);for(const i of s){const r=i.trim();if(!r)continue;const o={text:r};if(r.length>=18&&r[4]==="-"&&r[7]==="-"&&r[10]===" "&&r[13]===":"){const n=r.indexOf(" - ",16);if(n!==-1){o.timestamp=r.slice(0,16);let a=r.slice(n+3);if(a.startsWith("(from: ")){const d=a.indexOf(") ");d!==-1?(o.author=a.slice(7,d),o.text=a.slice(d+2)):o.text=a}else o.text=a}}t.push(o)}return t}const Ie=Dl({}),Fs=$e(null),_o=$e(""),us=$e(!0),ai=$e(null),Hl=pt(Ie,e=>Object.values(e)),jl=pt(Ie,e=>{const t=Date.now()-432e5;return Object.values(e).filter(s=>s.type!=="epic"?!1:s.status!=="closed"?!0:s.closed_at?new Date(s.closed_at).getTime()>t:!1).map(s=>({id:s.id,title:s.title}))}),li=pt([Ie,Fs],(e,t)=>t&&e[t]||null),Ul=pt(li,e=>e?Ji(e.notes):[]),Vl=pt([Ie,li],(e,t)=>{var s;return(s=t==null?void 0:t.blocked_by)!=null&&s.length?t.blocked_by.map(i=>{const r=e[i];return r?{id:r.id,title:r.title,status:r.status}:null}).filter(i=>i!==null):[]}),Wl=pt([Ie,li],(e,t)=>{if(!(t!=null&&t.parent))return"";const s=e[t.parent];return(s==null?void 0:s.title)||""});function ql(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(s=>{const i=t[s];return i?i.status!=="closed":!1})}function Ns(e,t={}){const s=ql(e,t);let i;return e.status==="closed"?i="done":s?i="blocked":e.awaiting?i="human":e.status==="in_progress"?i="agent":i="ready",{...e,is_blocked:s,column:i}}function Yl(e){const t={};for(const i of e)t[i.id]=i;const s={};for(const i of e)s[i.id]=Ns(i,t);Ie.set(s),us.set(!1),ai.set(null)}function Kl(e){const t={};for(const[i,r]of e)t[i]=r;const s={};for(const[i,r]of e)s[i]=Ns(r,t);Ie.set(s),us.set(!1),ai.set(null)}function zs(e){var n;const t=Ie.get(),s={};for(const[a,d]of Object.entries(t))s[a]=d;s[e.id]=e;const i=Ns(e,s),r={...t};r[e.id]=i;const o=t[e.id];if((o==null?void 0:o.status)!==e.status)for(const[a,d]of Object.entries(t))a!==e.id&&(n=d.blocked_by)!=null&&n.includes(e.id)&&(r[a]=Ns(d,s));Ie.set(r)}function Xl(e){const t=Ie.get(),{[e]:s,...i}=t;Ie.set(i),Fs.get()===e&&Fs.set(null)}function qt(e){Fs.set(e)}function Co(e){_o.set(e)}function Bs(e){us.set(e)}function is(e){ai.set(e),us.set(!1)}class Gl extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class vt extends Error{constructor(t){super(t),this.name="ConnectionError"}}const Ql="",Or=1e3,Zl=3e4;class Jl{constructor(t=Ql){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.runEventSources=new Map,this.reconnectDelay=Or,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,s)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=Or,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",i=>{this.handleUpdateEvent(i)}),this.eventSource.onerror=()=>{var r;console.log("[LocalComms] SSE connection error");const i=this.connected;this.connected=!1,i&&this.emitConnection({type:"connection:disconnected"}),(r=this.eventSource)==null||r.close(),this.eventSource=null,this.scheduleReconnect(),i||s(new vt("Failed to connect to SSE endpoint"))}}catch(i){s(new vt(`Failed to create EventSource: ${i}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE();for(const[t,s]of this.runEventSources)s.close(),console.log(`[LocalComms] Closed run stream for epic ${t}`);this.runEventSources.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,Zl)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){if(this.runEventSources.has(t))return console.log(`[LocalComms] Already subscribed to run stream for ${t}`),()=>this.unsubscribeRun(t);const s=new EventSource(`${this.baseUrl}/api/run-stream/${t}`);return this.runEventSources.set(t,s),s.addEventListener("connected",()=>{console.log(`[LocalComms] Run stream connected for ${t}`),this.emitConnection({type:"connection:connected",epicId:t})}),s.addEventListener("task-started",i=>{this.handleRunEvent(t,"task-started",i)}),s.addEventListener("task-update",i=>{this.handleRunEvent(t,"task-update",i)}),s.addEventListener("tool-activity",i=>{this.handleRunEvent(t,"tool-activity",i)}),s.addEventListener("task-completed",i=>{this.handleRunEvent(t,"task-completed",i)}),s.addEventListener("epic-started",i=>{this.handleRunEvent(t,"epic-started",i)}),s.addEventListener("epic-completed",i=>{this.handleRunEvent(t,"epic-completed",i)}),s.addEventListener("context-generating",i=>{this.handleContextEvent(t,"context:generating",i)}),s.addEventListener("context-generated",i=>{this.handleContextEvent(t,"context:generated",i)}),s.addEventListener("context-loaded",i=>{this.handleContextEvent(t,"context:loaded",i)}),s.addEventListener("context-failed",i=>{this.handleContextEvent(t,"context:failed",i)}),s.addEventListener("context-skipped",i=>{this.handleContextEvent(t,"context:skipped",i)}),s.onerror=()=>{console.log(`[LocalComms] Run stream error for ${t}`),s.close(),this.runEventSources.delete(t)},()=>this.unsubscribeRun(t)}unsubscribeRun(t){const s=this.runEventSources.get(t);s&&(s.close(),this.runEventSources.delete(t),console.log(`[LocalComms] Unsubscribed from run stream for ${t}`))}async createTick(t){const s=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!s.ok)throw new Error(`Failed to create tick: ${s.statusText}`);return s.json()}async updateTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!i.ok)throw new Error(`Failed to update tick: ${i.statusText}`);return i.json()}async deleteTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!s.ok)throw new Error(`Failed to delete tick: ${s.statusText}`)}async addNote(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:s})});if(!i.ok)throw new Error(`Failed to add note: ${i.statusText}`);return i.json()}async approveTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!s.ok)throw new Error(`Failed to approve tick: ${s.statusText}`);return s.json()}async rejectTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:s})});if(!i.ok)throw new Error(`Failed to reject tick: ${i.statusText}`);return i.json()}async closeTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:s})});if(!i.ok)throw new Error(`Failed to close tick: ${i.statusText}`);return i.json()}async reopenTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!s.ok)throw new Error(`Failed to reopen tick: ${s.statusText}`);return s.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(i=>({...i,is_blocked:i.isBlocked,verification_status:i.verificationStatus}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!s.ok)throw new Error(`Failed to fetch tick: ${s.statusText}`);return s.json()}async fetchActivity(t){const s=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,i=await fetch(s);if(!i.ok)throw new Error(`Failed to fetch activity: ${i.statusText}`);return(await i.json()).activities}async fetchRecord(t){const s=await fetch(`${this.baseUrl}/api/records/${t}`);if(s.status===404)return null;if(!s.ok)throw new Error(`Failed to fetch record: ${s.statusText}`);return s.json()}async fetchRunStatus(t){const s=await fetch(`${this.baseUrl}/api/run-status/${t}`);if(!s.ok)throw new Error(`Failed to fetch run status: ${s.statusText}`);return s.json()}async fetchContext(t){const s=await fetch(`${this.baseUrl}/api/context/${t}`);if(s.status===404)return null;if(!s.ok)throw new Error(`Failed to fetch context: ${s.statusText}`);return s.text()}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const s=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",s),s.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:i,tickId:r}=s;if(!r){console.warn("[LocalComms] Update event missing tickId:",s);return}i==="create"||i==="update"?this.fetchAndEmitTick(r):i==="delete"&&this.emitTick({type:"tick:deleted",tickId:r})}catch(s){console.error("[LocalComms] Failed to parse update event:",s)}}async fetchAndEmitTick(t){try{const s=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!s.ok)throw new Error(`HTTP ${s.status}`);const i=await s.json();this.emitTick({type:"tick:updated",tick:i})}catch(s){console.error(`[LocalComms] Failed to fetch tick ${t}:`,s),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${s}`})}}handleRunEvent(t,s,i){try{const r=JSON.parse(i.data),o=new Date().toISOString();let n;switch(s){case"task-started":n={type:"run:task-started",taskId:r.taskId,epicId:t,status:r.status||"running",numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:o};break;case"task-update":n={type:"run:task-update",taskId:r.taskId,epicId:t,output:r.output,status:r.status,numTurns:r.numTurns,metrics:this.normalizeMetrics(r.metrics),activeTool:r.activeTool?this.normalizeToolInfo(r.activeTool):void 0,timestamp:o};break;case"task-completed":n={type:"run:task-completed",taskId:r.taskId,epicId:t,success:r.success??!0,numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:o};break;case"tool-activity":n={type:"run:tool-activity",taskId:r.taskId,epicId:t,tool:this.normalizeToolInfo(r.tool||r.activeTool),timestamp:o};break;case"epic-started":n={type:"run:epic-started",epicId:t,status:r.status||"running",message:r.message,timestamp:o};break;case"epic-completed":n={type:"run:epic-completed",epicId:t,success:r.success??!0,timestamp:o};break;default:console.warn(`[LocalComms] Unknown run event type: ${s}`);return}this.emitRun(n)}catch(r){console.error(`[LocalComms] Failed to parse run event ${s}:`,r)}}handleContextEvent(t,s,i){try{const r=JSON.parse(i.data);let o;switch(s){case"context:generating":o={type:"context:generating",epicId:t,taskCount:r.taskCount||0};break;case"context:generated":o={type:"context:generated",epicId:t,tokenCount:r.tokenCount||0};break;case"context:loaded":o={type:"context:loaded",epicId:t};break;case"context:failed":o={type:"context:failed",epicId:t,message:r.message||"Context generation failed"};break;case"context:skipped":o={type:"context:skipped",epicId:t,reason:r.reason||"Unknown reason"};break;default:return}this.emitContext(o)}catch(r){console.error(`[LocalComms] Failed to parse context event ${s}:`,r)}}emitTick(t){for(const s of this.tickHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in tick handler:",i)}}emitRun(t){for(const s of this.runHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in run handler:",i)}}emitContext(t){for(const s of this.contextHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in context handler:",i)}}emitConnection(t){for(const s of this.connectionHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in connection handler:",i)}}normalizeMetrics(t){if(t)return{inputTokens:t.input_tokens||t.inputTokens||0,outputTokens:t.output_tokens||t.outputTokens||0,cacheReadTokens:t.cache_read_tokens||t.cacheReadTokens||0,cacheCreationTokens:t.cache_creation_tokens||t.cacheCreationTokens||0,costUsd:t.cost_usd||t.costUsd||0,durationMs:t.duration_ms||t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,output:t.output,durationMs:t.duration_ms||t.duration||t.durationMs,isError:t.is_error||t.isError}:{name:"Unknown"}}}const ec=10,tc=1e3,sc=3e4;class ic{constructor(t){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.runSubscriptions=new Set,this.tickCache=new Map,this.runStates=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,s)=>{try{const i=window.location.protocol==="https:"?"wss:":"ws:",r=window.location.host,o=localStorage.getItem("token")||"",n=`${i}//${r}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",n);const a=["ticks-v1",`token-${encodeURIComponent(o)}`];this.ws=new WebSocket(n,a);let d=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,d||(d=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=c=>{this.handleMessage(c)},this.ws.onclose=c=>{console.log("[CloudComms] WebSocket closed:",c.code,c.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),d||(d=!0,s(new vt(`WebSocket closed: ${c.code} ${c.reason}`)))},this.ws.onerror=c=>{console.error("[CloudComms] WebSocket error:",c),d||(d=!0,s(new vt("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(i){s(new vt(`Failed to create WebSocket: ${i}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.runSubscriptions.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=ec){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min(tc*Math.pow(2,this.reconnectAttempts),sc);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(s=>{console.error("[CloudComms] Reconnect failed:",s)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){return this.runSubscriptions.add(t),console.log(`[CloudComms] Subscribed to run events for ${t}`),()=>{this.runSubscriptions.delete(t),console.log(`[CloudComms] Unsubscribed from run events for ${t}`)}}async createTick(t){this.checkWritable();const s={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,awaiting:t.awaiting,owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:s}),s}async updateTick(t,s){this.checkWritable();const i={id:t,title:s.title||"",description:s.description||"",status:s.status||"open",priority:s.priority??2,labels:s.labels,blocked_by:s.blocked_by,type:"task",owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,s){return this.checkWritable(),this.tickOperation(t,"note",{message:s})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,s){return this.checkWritable(),this.tickOperation(t,"reject",{reason:s})}async closeTick(t,s){return this.checkWritable(),this.tickOperation(t,"close",{reason:s})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const s of this.tickCache.values()){let i=!1;if(s.blocked_by&&s.blocked_by.length>0)for(const o of s.blocked_by){const n=this.tickCache.get(o);if(!n||n.status!=="closed"){i=!0;break}}let r="ready";s.status==="closed"?r="done":i?r="blocked":s.awaiting?r="human":s.status==="in_progress"&&(r="agent"),t.push({...s,is_blocked:i,column:r})}return t}async fetchInfo(){const t=[];for(const s of this.tickCache.values())s.type==="epic"&&t.push({id:s.id,title:s.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const s=this.tickCache.get(t);if(!s)throw new Error(`Tick not found: ${t}`);const i=[];if(s.blocked_by&&s.blocked_by.length>0)for(const n of s.blocked_by){const a=this.tickCache.get(n);a?i.push({id:a.id,title:a.title,status:a.status}):i.push({id:n,title:`Tick ${n}`,status:"unknown"})}const r=i.some(n=>n.status!=="closed");let o="ready";return s.status==="closed"?o="done":r?o="blocked":s.awaiting?o="human":s.status==="in_progress"&&(o="agent"),{...s,isBlocked:r,column:o,notesList:Ji(s.notes),blockerDetails:i}}async fetchActivity(t){return[]}async fetchRecord(t){return null}async fetchRunStatus(t){var i,r;const s=this.runStates.get(t);return s?{epicId:t,isRunning:s.isRunning,activeTask:s.activeTaskId?{tickId:s.activeTaskId,title:((i=this.tickCache.get(s.activeTaskId))==null?void 0:i.title)||s.activeTaskId,status:"running",numTurns:0,metrics:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:((r=s.lastEvent)==null?void 0:r.timestamp)||new Date().toISOString()}:void 0}:{epicId:t,isRunning:!1}}async fetchContext(t){return null}handleMessage(t){try{const s=JSON.parse(t.data);switch(s.type){case"state_full":this.handleStateFullMessage(s);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(s);break;case"tick_deleted":this.handleTickDeleteMessage(s);break;case"connected":console.log("[CloudComms] Connection confirmed:",s.connectionId);break;case"error":console.error("[CloudComms] Server error:",s.message),this.emitConnection({type:"connection:error",message:s.message});break;case"local_status":this.handleLocalStatusMessage(s);break;case"run_event":this.handleRunEventMessage(s);break;default:console.warn("[CloudComms] Unknown message type:",s.type)}}catch(s){console.error("[CloudComms] Failed to parse message:",s)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[i,r]of Object.entries(t.ticks))this.tickCache.set(i,r);const s=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:s})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}handleRunEventMessage(t){const{epicId:s,taskId:i,event:r}=t;if(console.log(`[CloudComms] Received run_event: epic=${s} type=${r.type} subscriptions=${[...this.runSubscriptions].join(",")}`),!this.runSubscriptions.has(s)&&this.runSubscriptions.size>0){console.log(`[CloudComms] Skipping run_event - not subscribed to ${s}`);return}const o=r.timestamp||new Date().toISOString();let n;switch(r.type){case"task-started":n={type:"run:task-started",taskId:i||"",epicId:s,status:r.status||"running",numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:o},this.runStates.set(s,{isRunning:!0,activeTaskId:i,lastEvent:n});break;case"task-update":n={type:"run:task-update",taskId:i||"",epicId:s,output:r.output,status:r.status,numTurns:r.numTurns,metrics:this.normalizeMetrics(r.metrics),activeTool:r.activeTool?this.normalizeToolInfo(r.activeTool):void 0,timestamp:o};const a=this.runStates.get(s);a&&(a.lastEvent=n);break;case"task-completed":n={type:"run:task-completed",taskId:i||"",epicId:s,success:r.success??!0,numTurns:r.numTurns||0,metrics:this.normalizeMetrics(r.metrics),timestamp:o};const d=this.runStates.get(s);d&&(d.activeTaskId=void 0,d.lastEvent=n);break;case"tool-activity":n={type:"run:tool-activity",taskId:i||"",epicId:s,tool:r.activeTool?this.normalizeToolInfo(r.activeTool):{name:"Unknown"},timestamp:o};break;case"epic-started":n={type:"run:epic-started",epicId:s,status:r.status||"running",message:r.message,timestamp:o},this.runStates.set(s,{isRunning:!0,lastEvent:n});break;case"epic-completed":n={type:"run:epic-completed",epicId:s,success:r.success??!0,timestamp:o},this.runStates.set(s,{isRunning:!1,lastEvent:n});break;case"context-generating":{const c={type:"context:generating",epicId:s,taskCount:r.taskCount||0};this.emitContext(c);return}case"context-generated":{const c={type:"context:generated",epicId:s,tokenCount:r.tokenCount||0};this.emitContext(c);return}case"context-loaded":{const c={type:"context:loaded",epicId:s};this.emitContext(c);return}case"context-failed":{const c={type:"context:failed",epicId:s,error:r.message||"Context generation failed"};this.emitContext(c);return}case"context-skipped":{const c={type:"context:skipped",epicId:s,reason:r.message||"Context generation skipped"};this.emitContext(c);return}default:console.warn("[CloudComms] Unknown run event type:",r.type);return}this.emitRun(n)}emitTick(t){for(const s of this.tickHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in tick handler:",i)}}emitRun(t){for(const s of this.runHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in run handler:",i)}}emitContext(t){for(const s of this.contextHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in context handler:",i)}}emitConnection(t){for(const s of this.connectionHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in connection handler:",i)}}checkWritable(){if(!this.connected)throw new vt("Not connected to server");if(!this.localAgentConnected)throw new Gl("Cannot write: local agent is offline")}sendMessage(t){var s;if(((s=this.ws)==null?void 0:s.readyState)!==WebSocket.OPEN)throw new vt("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,s,i){const r=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${s}`,o=localStorage.getItem("token")||"",n=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",...o?{Authorization:`Bearer ${o}`}:{}},body:i?JSON.stringify(i):void 0});if(!n.ok){const a=await n.json().catch(()=>({error:n.statusText}));throw new Error(a.error||`Failed to ${s} tick`)}return n.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let s="";for(let i=0;i<3;i++)s+=t.charAt(Math.floor(Math.random()*t.length));return s}normalizeMetrics(t){if(t)return{inputTokens:t.inputTokens||0,outputTokens:t.outputTokens||0,cacheReadTokens:t.cacheReadTokens||0,cacheCreationTokens:t.cacheCreationTokens||0,costUsd:t.costUsd||0,durationMs:t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,durationMs:t.duration}:{name:"Unknown"}}}const kt=$e(null),wt=$e("disconnected"),rc=pt([wt,Qe,ds],(e,t,s)=>!t||e!=="connected"?e:s?"connected":"disconnected"),Mi=new Set;function $o(e){return Mi.add(e),()=>Mi.delete(e)}function oc(e){for(const t of Mi)try{t(e)}catch(s){console.error("[CommsStore] Error in run event listener:",s)}}const Di=new Set;function nc(e){return Di.add(e),()=>Di.delete(e)}function ac(e){for(const t of Di)try{t(e)}catch(s){console.error("[CommsStore] Error in context event listener:",s)}}function To(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),zs(e.tick);break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),Xl(e.tickId);break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),Kl(e.ticks);break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function So(e){oc(e)}function Eo(e){ac(e)}function zo(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),wt.set("connected"),Ar(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),wt.set("disconnected"),Ar(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),Nl(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),is(e.message);break}}let Ir=!1,Be=[];async function lc(){Ro(),console.log("[CommsStore] Initializing local mode"),wt.set("connecting"),Bs(!0);const e=new Jl;Be.push(e.onTick(To)),Be.push(e.onRun(So)),Be.push(e.onContext(Eo)),Be.push(e.onConnection(zo)),kt.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),is(`Connection failed: ${t}`)}}async function Mr(e){Ro(),console.log("[CommsStore] Initializing cloud mode for project:",e),wt.set("connecting"),Bs(!0);const t=new ic(e);Be.push(t.onTick(To)),Be.push(t.onRun(So)),Be.push(t.onContext(Eo)),Be.push(t.onConnection(zo)),kt.set(t),Co(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(s){console.error("[CommsStore] Failed to connect:",s),is(`Connection failed: ${s}`)}}function Ro(){for(const t of Be)t();Be=[];const e=kt.get();e&&(e.disconnect(),kt.set(null))}function Ao(e){const t=kt.get();return t?t.subscribeRun(e):(console.warn("[CommsStore] Cannot subscribe to run: no client"),()=>{})}function ke(){const e=kt.get();if(!e)throw new Error("CommsClient not initialized");return e}async function cc(e){return ke().createTick(e)}async function dc(e,t){return ke().addNote(e,t)}async function uc(e){return ke().approveTick(e)}async function hc(e,t){return ke().rejectTick(e,t)}async function pc(e,t){return ke().closeTick(e,t)}async function mc(e){return ke().reopenTick(e)}async function fc(){return ke().fetchTicks()}async function bc(){return ke().fetchInfo()}async function gc(e){return ke().fetchTick(e)}async function vc(e){return ke().fetchActivity(e)}async function yc(e){return ke().fetchRecord(e)}async function kc(e){return ke().fetchRunStatus(e)}async function wc(e){return ke().fetchContext(e)}function xc(){if(Ir){console.log("[CommsStore] Already initialized, skipping");return}Ir=!0,console.log("[CommsStore] Setting up auto-connect"),Qe.subscribe(e=>{const t=Ls.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?Mr(t):e||lc()}),Ls.subscribe(e=>{const t=Qe.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!kt.get()&&Mr(e)})}var _c=Object.defineProperty,Cc=Object.getOwnPropertyDescriptor,ie=(e,t,s,i)=>{for(var r=i>1?void 0:i?Cc(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&_c(t,s,r),r};console.log("[TickBoard] Initializing comms module");xc();const wi=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Ne=["blocked","ready","agent","human","done"];let X=class extends he{constructor(){super(...arguments),this.boardState={...zl},this.ticksController=new le.StoreController(this,Hl),this.epicsController=new le.StoreController(this,jl),this.repoNameController=new le.StoreController(this,_o),this.selectedTickController=new le.StoreController(this,li),this.selectedTickNotesController=new le.StoreController(this,Ul),this.selectedTickBlockersController=new le.StoreController(this,Vl),this.selectedTickParentTitleController=new le.StoreController(this,Wl),this.loadingController=new le.StoreController(this,us),this.errorController=new le.StoreController(this,ai),this.isCloudModeController=new le.StoreController(this,Qe),this.localClientConnectedController=new le.StoreController(this,ds),this.isReadOnlyController=new le.StoreController(this,Ll),this.connectionStatusController=new le.StoreController(this,rc),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showRunPanel=!1,this.runStatus=null,this.runPanelEpicId=null,this.runStreamConnected=!1,this.activeToolInfo=null,this.runMetrics=null,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.runStreamUnsubscribe=null,this.runEventUnsubscribe=null,this.runPollInterval=null,this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused()))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"r":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRunPanel());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.runEventUnsubscribe=$o(e=>this.handleRunEvent(e)),this.isCloudMode||(this.loadData(),this.startRunStatusPolling())}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const s=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",s),ki(s);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),ki(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const s=new URLSearchParams(window.location.search).get("project");if(s){console.log("[TickBoard] Cloud mode from query param, project:",s),ki(s);return}}console.log("[TickBoard] Local mode"),Fl()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),Bs(!0);return}Bs(!0),is(null);try{const[e,t]=await Promise.all([fc(),bc()]);Yl(e),Co(t.repoName),this.updateBoardState()}catch(e){is(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){var e;super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown),(e=this.runEventUnsubscribe)==null||e.call(this),this.runEventUnsubscribe=null,this.unsubscribeRunStream(),this.stopRunStatusPolling()}startRunStatusPolling(){this.runPollInterval=setInterval(()=>{this.checkForActiveRuns()},5e3),this.checkForActiveRuns()}stopRunStatusPolling(){this.runPollInterval&&(clearInterval(this.runPollInterval),this.runPollInterval=null)}async checkForActiveRuns(){var e,t,s;if(this.epics.length!==0){for(const i of this.epics)try{const r=await kc(i.id);if(r.isRunning){this.runStatus=r,this.runPanelEpicId!==i.id&&(this.runPanelEpicId=i.id,this.subscribeToRunStream(i.id)),(e=r.activeTask)!=null&&e.metrics&&(this.runMetrics=this.convertApiMetrics(r.activeTask.metrics)),(t=r.activeTask)!=null&&t.activeTool&&(this.activeToolInfo={name:r.activeTask.activeTool.name,input:r.activeTask.activeTool.input,output:r.activeTask.activeTool.output,durationMs:r.activeTask.activeTool.duration_ms,isError:r.activeTask.activeTool.is_error,isComplete:!1});return}}catch{}(s=this.runStatus)!=null&&s.isRunning&&(this.runStatus={...this.runStatus,isRunning:!1})}}convertApiMetrics(e){return{inputTokens:e.input_tokens,outputTokens:e.output_tokens,cacheReadTokens:e.cache_read_tokens,cacheCreationTokens:e.cache_creation_tokens,costUsd:e.cost_usd,durationMs:e.duration_ms}}subscribeToRunStream(e){this.unsubscribeRunStream(),console.log("[RunStream] Subscribing to epic:",e),this.runStreamUnsubscribe=Ao(e),this.runStreamConnected=!0}unsubscribeRunStream(){this.runStreamUnsubscribe&&(this.runStreamUnsubscribe(),this.runStreamUnsubscribe=null),this.runStreamConnected=!1}handleRunEvent(e){var s;const t=e.epicId;if(!(this.runPanelEpicId&&t!==this.runPanelEpicId))switch(e.type){case"run:task-started":this.runStatus={epicId:t,isRunning:!0,activeTask:{tickId:e.taskId,title:"",status:"running",numTurns:e.numTurns||0,metrics:e.metrics?{input_tokens:e.metrics.inputTokens,output_tokens:e.metrics.outputTokens,cache_read_tokens:e.metrics.cacheReadTokens,cache_creation_tokens:e.metrics.cacheCreationTokens,cost_usd:e.metrics.costUsd,duration_ms:e.metrics.durationMs}:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:e.timestamp}},this.activeToolInfo=null;break;case"run:task-update":e.metrics&&(this.runMetrics={inputTokens:e.metrics.inputTokens,outputTokens:e.metrics.outputTokens,cacheReadTokens:e.metrics.cacheReadTokens,cacheCreationTokens:e.metrics.cacheCreationTokens,costUsd:e.metrics.costUsd,durationMs:e.metrics.durationMs}),e.activeTool&&(this.activeToolInfo={name:e.activeTool.name,input:e.activeTool.input,output:e.activeTool.output,durationMs:e.activeTool.durationMs,isComplete:!1}),(s=this.runStatus)!=null&&s.activeTask&&(this.runStatus={...this.runStatus,activeTask:{...this.runStatus.activeTask,numTurns:e.numTurns??this.runStatus.activeTask.numTurns,lastUpdated:e.timestamp}});break;case"run:tool-activity":this.activeToolInfo={name:e.tool.name,input:e.tool.input,output:e.tool.output,durationMs:e.tool.durationMs,isComplete:!1};break;case"run:task-completed":console.log("[RunStream] Task completed:",e.taskId),this.activeToolInfo=null,this.runStatus&&(this.runStatus={...this.runStatus,isRunning:!1,activeTask:void 0});break;case"run:epic-started":console.log("[RunStream] Epic started:",t),this.runStatus={epicId:t,isRunning:!0};break;case"run:epic-completed":console.log("[RunStream] Epic completed:",t),this.runStatus={epicId:t,isRunning:!1},this.activeToolInfo=null;break}}toggleRunPanel(){var e;this.showRunPanel=!this.showRunPanel,this.showRunPanel&&((e=this.runStatus)!=null&&e.isRunning)&&this.runStatus.epicId&&this.runPanelEpicId!==this.runStatus.epicId&&(this.runPanelEpicId=this.runStatus.epicId,this.subscribeToRunStream(this.runStatus.epicId))}closeRunPanel(){this.showRunPanel=!1}isInputFocused(){var i;let e=document.activeElement;for(;(i=e==null?void 0:e.shadowRoot)!=null&&i.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let s=e;for(;s;){const r=s.tagName.toLowerCase();if(r.startsWith("sl-")&&(r.includes("input")||r.includes("textarea")||r.includes("select")))return!0;const o=s.getRootNode();s=o instanceof ShadowRoot?o.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Ne.length?[]:this.getColumnTicks(Ne[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Ne.length;e++)if(this.getColumnTicks(Ne[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let s=this.focusedTickIndex+e;s<0?s=t.length-1:s>=t.length&&(s=0),this.focusedTickIndex=s}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Ne.length-1:t>=Ne.length&&(t=0),this.focusedColumnIndex=t;const s=this.getColumnTicks(Ne[t]);s.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=s.length?this.focusedTickIndex=s.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Ne[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&qt(e[this.focusedTickIndex].id)}handleEscape(){this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?qt(null):this.showRunPanel?this.showRunPanel=!1:this.clearFocus()}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const s=e.shadowRoot.querySelector("sl-input");s&&s.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var s;const{tick:t}=e.detail;zs(t),this.showCreateDialog=!1,this.updateBoardState(),(s=window.showToast)==null||s.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const s=e.target.querySelector("sl-tab[active]");if(s){const i=s.getAttribute("panel");i&&Ne.includes(i)&&(this.activeColumn=i,this.focusedColumnIndex=Ne.indexOf(i),this.focusedTickIndex=this.getColumnTicks(i).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,s=this.ticks.find(i=>i.id===t);s?qt(s.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(qt(t.id),!this.isCloudMode)try{const s=await gc(t.id);zs(s)}catch(s){console.error("Failed to fetch tick details:",s)}}handleDrawerClose(){qt(null)}handleTickUpdated(e){const{tick:t}=e.detail;zs(t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(s=>s.id.toLowerCase().includes(t)||s.title.toLowerCase().includes(t)||s.description&&s.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}renderRunPanel(){var s,i;const e=((s=this.runStatus)==null?void 0:s.isRunning)&&this.runStatus.activeTask,t=((i=this.epics.find(r=>r.id===this.runPanelEpicId))==null?void 0:i.title)||this.runPanelEpicId||"Unknown Epic";return h`
      <div class="run-panel">
        <div class="run-panel-header">
          <div class="run-panel-header-left">
            <div class="run-panel-title">
              <sl-icon name="terminal"></sl-icon>
              <span>Live Run</span>
            </div>
            ${this.runPanelEpicId?h`
                  <div class="run-panel-epic">
                    <span class="epic-id">${this.runPanelEpicId}</span>
                    <span>· ${t}</span>
                  </div>
                `:y}
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
          ${e?this.renderActiveRun():this.renderNoRunState()}
        </div>
      </div>
    `}renderActiveRun(){var t;const e=(t=this.runStatus)==null?void 0:t.activeTask;return e?h`
      <!-- Task info bar -->
      <div class="run-info-bar">
        <div class="run-task-info">
          <span class="run-task-id">${e.tickId}</span>
          <span class="run-task-title">${e.title}</span>
        </div>
        ${this.runMetrics?h`<run-metrics .metrics=${this.runMetrics} ?live=${!0}></run-metrics>`:y}
      </div>

      <!-- Tool activity indicator -->
      ${this.activeToolInfo?h`
            <tool-activity
              .tool=${this.activeToolInfo}
              ?expanded=${!0}
            ></tool-activity>
          `:y}

      <!-- Output pane -->
      <div class="run-output-section">
        <run-output-pane
          epic-id=${this.runPanelEpicId||""}
        ></run-output-pane>
      </div>
    `:y}renderNoRunState(){return h`
      <div class="no-run-state">
        <sl-icon name="hourglass-split"></sl-icon>
        <p>No active run</p>
        <p class="hint">When a ticker run starts, output will appear here</p>
      </div>
    `}render(){var t;if(this.loading)return h`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return h`
        <div class="error-state">
          <ticks-alert variant="error">
            <strong>Failed to load board</strong><br>
            ${this.error}
          </ticks-alert>
          <ticks-button variant="primary" @click=${this.loadData}>Retry</ticks-button>
        </div>
      `;const e=this.getEpicNames();return h`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        connection-status=${this.connectionStatus}
        ?run-panel-open=${this.showRunPanel}
        ?run-active=${(t=this.runStatus)==null?void 0:t.isRunning}
        ?readonly-mode=${this.isCloudMode&&!this.localClientConnected}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMobileMenuToggle}
        @activity-click=${this.handleActivityClick}
        @run-panel-toggle=${this.toggleRunPanel}
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
            ${wi.map((s,i)=>h`
              <tick-column
                name=${s.id}
                .ticks=${this.getColumnTicks(s.id)}
                .epicNames=${e}
                focused-tick-id=${this.focusedColumnIndex===i?this.getFocusedTickId()??"":""}
                @tick-selected=${this.handleTickSelected}
              ></tick-column>
            `)}
          </div>
        </main>

        <!-- Run monitoring panel -->
        ${this.showRunPanel?this.renderRunPanel():y}
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${wi.map(s=>h`
            <sl-tab
              slot="nav"
              panel=${s.id}
              ?active=${this.activeColumn===s.id}
            >
              ${s.icon}
              <span class="tab-badge">${this.getColumnTicks(s.id).length}</span>
            </sl-tab>
          `)}
          ${wi.map((s,i)=>h`
            <sl-tab-panel name=${s.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(s.id).length===0?h`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${s.icon}</div>
                        <div>No ticks in ${s.name}</div>
                      </div>
                    `:this.getColumnTicks(s.id).map(r=>h`
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
              ${this.epics.map(s=>h`
                <sl-option value=${s.id}>
                  <span class="epic-id">${s.id}</span> - ${s.title}
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
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `}};X.styles=$`
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
  `;ie([wl({context:El}),k()],X.prototype,"boardState",2);ie([k()],X.prototype,"selectedEpic",2);ie([k()],X.prototype,"searchTerm",2);ie([k()],X.prototype,"activeColumn",2);ie([k()],X.prototype,"isMobile",2);ie([k()],X.prototype,"focusedColumnIndex",2);ie([k()],X.prototype,"focusedTickIndex",2);ie([k()],X.prototype,"showKeyboardHelp",2);ie([k()],X.prototype,"showCreateDialog",2);ie([k()],X.prototype,"showMobileFilterDrawer",2);ie([k()],X.prototype,"showRunPanel",2);ie([k()],X.prototype,"runStatus",2);ie([k()],X.prototype,"runPanelEpicId",2);ie([k()],X.prototype,"runStreamConnected",2);ie([k()],X.prototype,"activeToolInfo",2);ie([k()],X.prototype,"runMetrics",2);X=ie([be("tick-board")],X);const Oo=6048e5,$c=864e5,Tc=6e4,Sc=36e5,xs=43200,Dr=1440,Pr=Symbol.for("constructDateFrom");function Ze(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&Pr in e?e[Pr](t):e instanceof Date?new e.constructor(t):new Date(t)}function Z(e,t){return Ze(t||e,e)}let Ec={};function hs(){return Ec}function rs(e,t){var a,d,c,p;const s=hs(),i=(t==null?void 0:t.weekStartsOn)??((d=(a=t==null?void 0:t.locale)==null?void 0:a.options)==null?void 0:d.weekStartsOn)??s.weekStartsOn??((p=(c=s.locale)==null?void 0:c.options)==null?void 0:p.weekStartsOn)??0,r=Z(e,t==null?void 0:t.in),o=r.getDay(),n=(o<i?7:0)+o-i;return r.setDate(r.getDate()-n),r.setHours(0,0,0,0),r}function Hs(e,t){return rs(e,{...t,weekStartsOn:1})}function Io(e,t){const s=Z(e,t==null?void 0:t.in),i=s.getFullYear(),r=Ze(s,0);r.setFullYear(i+1,0,4),r.setHours(0,0,0,0);const o=Hs(r),n=Ze(s,0);n.setFullYear(i,0,4),n.setHours(0,0,0,0);const a=Hs(n);return s.getTime()>=o.getTime()?i+1:s.getTime()>=a.getTime()?i:i-1}function js(e){const t=Z(e),s=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return s.setUTCFullYear(t.getFullYear()),+e-+s}function ps(e,...t){const s=Ze.bind(null,e||t.find(i=>typeof i=="object"));return t.map(s)}function Lr(e,t){const s=Z(e,t==null?void 0:t.in);return s.setHours(0,0,0,0),s}function zc(e,t,s){const[i,r]=ps(s==null?void 0:s.in,e,t),o=Lr(i),n=Lr(r),a=+o-js(o),d=+n-js(n);return Math.round((a-d)/$c)}function Rc(e,t){const s=Io(e,t),i=Ze(e,0);return i.setFullYear(s,0,4),i.setHours(0,0,0,0),Hs(i)}function Rs(e,t){const s=+Z(e)-+Z(t);return s<0?-1:s>0?1:s}function Ac(e){return Ze(e,Date.now())}function Oc(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Ic(e){return!(!Oc(e)&&typeof e!="number"||isNaN(+Z(e)))}function Mc(e,t,s){const[i,r]=ps(s==null?void 0:s.in,e,t),o=i.getFullYear()-r.getFullYear(),n=i.getMonth()-r.getMonth();return o*12+n}function er(e){return t=>{const i=(e?Math[e]:Math.trunc)(t);return i===0?0:i}}function Dc(e,t,s){const[i,r]=ps(s==null?void 0:s.in,e,t),o=(+i-+r)/Sc;return er(s==null?void 0:s.roundingMethod)(o)}function Mo(e,t){return+Z(e)-+Z(t)}function Pc(e,t,s){const i=Mo(e,t)/Tc;return er(s==null?void 0:s.roundingMethod)(i)}function Lc(e,t){const s=Z(e,t==null?void 0:t.in);return s.setHours(23,59,59,999),s}function Fc(e,t){const s=Z(e,t==null?void 0:t.in),i=s.getMonth();return s.setFullYear(s.getFullYear(),i+1,0),s.setHours(23,59,59,999),s}function Nc(e,t){const s=Z(e,t==null?void 0:t.in);return+Lc(s,t)==+Fc(s,t)}function Bc(e,t,s){const[i,r,o]=ps(s==null?void 0:s.in,e,e,t),n=Rs(r,o),a=Math.abs(Mc(r,o));if(a<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-n*a);let d=Rs(r,o)===-n;Nc(i)&&a===1&&Rs(i,o)===1&&(d=!1);const c=n*(a-+d);return c===0?0:c}function Hc(e,t,s){const i=Mo(e,t)/1e3;return er(s==null?void 0:s.roundingMethod)(i)}function jc(e,t){const s=Z(e,t==null?void 0:t.in);return s.setFullYear(s.getFullYear(),0,1),s.setHours(0,0,0,0),s}const Uc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Vc=(e,t,s)=>{let i;const r=Uc[e];return typeof r=="string"?i=r:t===1?i=r.one:i=r.other.replace("{{count}}",t.toString()),s!=null&&s.addSuffix?s.comparison&&s.comparison>0?"in "+i:i+" ago":i};function xi(e){return(t={})=>{const s=t.width?String(t.width):e.defaultWidth;return e.formats[s]||e.formats[e.defaultWidth]}}const Wc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},qc={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Yc={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Kc={date:xi({formats:Wc,defaultWidth:"full"}),time:xi({formats:qc,defaultWidth:"full"}),dateTime:xi({formats:Yc,defaultWidth:"full"})},Xc={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Gc=(e,t,s,i)=>Xc[e];function Yt(e){return(t,s)=>{const i=s!=null&&s.context?String(s.context):"standalone";let r;if(i==="formatting"&&e.formattingValues){const n=e.defaultFormattingWidth||e.defaultWidth,a=s!=null&&s.width?String(s.width):n;r=e.formattingValues[a]||e.formattingValues[n]}else{const n=e.defaultWidth,a=s!=null&&s.width?String(s.width):e.defaultWidth;r=e.values[a]||e.values[n]}const o=e.argumentCallback?e.argumentCallback(t):t;return r[o]}}const Qc={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Zc={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Jc={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},ed={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},td={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},sd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},id=(e,t)=>{const s=Number(e),i=s%100;if(i>20||i<10)switch(i%10){case 1:return s+"st";case 2:return s+"nd";case 3:return s+"rd"}return s+"th"},rd={ordinalNumber:id,era:Yt({values:Qc,defaultWidth:"wide"}),quarter:Yt({values:Zc,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Yt({values:Jc,defaultWidth:"wide"}),day:Yt({values:ed,defaultWidth:"wide"}),dayPeriod:Yt({values:td,defaultWidth:"wide",formattingValues:sd,defaultFormattingWidth:"wide"})};function Kt(e){return(t,s={})=>{const i=s.width,r=i&&e.matchPatterns[i]||e.matchPatterns[e.defaultMatchWidth],o=t.match(r);if(!o)return null;const n=o[0],a=i&&e.parsePatterns[i]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(a)?nd(a,f=>f.test(n)):od(a,f=>f.test(n));let c;c=e.valueCallback?e.valueCallback(d):d,c=s.valueCallback?s.valueCallback(c):c;const p=t.slice(n.length);return{value:c,rest:p}}}function od(e,t){for(const s in e)if(Object.prototype.hasOwnProperty.call(e,s)&&t(e[s]))return s}function nd(e,t){for(let s=0;s<e.length;s++)if(t(e[s]))return s}function ad(e){return(t,s={})=>{const i=t.match(e.matchPattern);if(!i)return null;const r=i[0],o=t.match(e.parsePattern);if(!o)return null;let n=e.valueCallback?e.valueCallback(o[0]):o[0];n=s.valueCallback?s.valueCallback(n):n;const a=t.slice(r.length);return{value:n,rest:a}}}const ld=/^(\d+)(th|st|nd|rd)?/i,cd=/\d+/i,dd={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},ud={any:[/^b/i,/^(a|c)/i]},hd={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},pd={any:[/1/i,/2/i,/3/i,/4/i]},md={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},fd={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},bd={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},gd={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},vd={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},yd={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},kd={ordinalNumber:ad({matchPattern:ld,parsePattern:cd,valueCallback:e=>parseInt(e,10)}),era:Kt({matchPatterns:dd,defaultMatchWidth:"wide",parsePatterns:ud,defaultParseWidth:"any"}),quarter:Kt({matchPatterns:hd,defaultMatchWidth:"wide",parsePatterns:pd,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Kt({matchPatterns:md,defaultMatchWidth:"wide",parsePatterns:fd,defaultParseWidth:"any"}),day:Kt({matchPatterns:bd,defaultMatchWidth:"wide",parsePatterns:gd,defaultParseWidth:"any"}),dayPeriod:Kt({matchPatterns:vd,defaultMatchWidth:"any",parsePatterns:yd,defaultParseWidth:"any"})},Do={code:"en-US",formatDistance:Vc,formatLong:Kc,formatRelative:Gc,localize:rd,match:kd,options:{weekStartsOn:0,firstWeekContainsDate:1}};function wd(e,t){const s=Z(e,t==null?void 0:t.in);return zc(s,jc(s))+1}function xd(e,t){const s=Z(e,t==null?void 0:t.in),i=+Hs(s)-+Rc(s);return Math.round(i/Oo)+1}function Po(e,t){var p,f,b,m;const s=Z(e,t==null?void 0:t.in),i=s.getFullYear(),r=hs(),o=(t==null?void 0:t.firstWeekContainsDate)??((f=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(b=r.locale)==null?void 0:b.options)==null?void 0:m.firstWeekContainsDate)??1,n=Ze((t==null?void 0:t.in)||e,0);n.setFullYear(i+1,0,o),n.setHours(0,0,0,0);const a=rs(n,t),d=Ze((t==null?void 0:t.in)||e,0);d.setFullYear(i,0,o),d.setHours(0,0,0,0);const c=rs(d,t);return+s>=+a?i+1:+s>=+c?i:i-1}function _d(e,t){var a,d,c,p;const s=hs(),i=(t==null?void 0:t.firstWeekContainsDate)??((d=(a=t==null?void 0:t.locale)==null?void 0:a.options)==null?void 0:d.firstWeekContainsDate)??s.firstWeekContainsDate??((p=(c=s.locale)==null?void 0:c.options)==null?void 0:p.firstWeekContainsDate)??1,r=Po(e,t),o=Ze((t==null?void 0:t.in)||e,0);return o.setFullYear(r,0,i),o.setHours(0,0,0,0),rs(o,t)}function Cd(e,t){const s=Z(e,t==null?void 0:t.in),i=+rs(s,t)-+_d(s,t);return Math.round(i/Oo)+1}function I(e,t){const s=e<0?"-":"",i=Math.abs(e).toString().padStart(t,"0");return s+i}const nt={y(e,t){const s=e.getFullYear(),i=s>0?s:1-s;return I(t==="yy"?i%100:i,t.length)},M(e,t){const s=e.getMonth();return t==="M"?String(s+1):I(s+1,2)},d(e,t){return I(e.getDate(),t.length)},a(e,t){const s=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return s.toUpperCase();case"aaa":return s;case"aaaaa":return s[0];case"aaaa":default:return s==="am"?"a.m.":"p.m."}},h(e,t){return I(e.getHours()%12||12,t.length)},H(e,t){return I(e.getHours(),t.length)},m(e,t){return I(e.getMinutes(),t.length)},s(e,t){return I(e.getSeconds(),t.length)},S(e,t){const s=t.length,i=e.getMilliseconds(),r=Math.trunc(i*Math.pow(10,s-3));return I(r,t.length)}},St={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Fr={G:function(e,t,s){const i=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return s.era(i,{width:"abbreviated"});case"GGGGG":return s.era(i,{width:"narrow"});case"GGGG":default:return s.era(i,{width:"wide"})}},y:function(e,t,s){if(t==="yo"){const i=e.getFullYear(),r=i>0?i:1-i;return s.ordinalNumber(r,{unit:"year"})}return nt.y(e,t)},Y:function(e,t,s,i){const r=Po(e,i),o=r>0?r:1-r;if(t==="YY"){const n=o%100;return I(n,2)}return t==="Yo"?s.ordinalNumber(o,{unit:"year"}):I(o,t.length)},R:function(e,t){const s=Io(e);return I(s,t.length)},u:function(e,t){const s=e.getFullYear();return I(s,t.length)},Q:function(e,t,s){const i=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(i);case"QQ":return I(i,2);case"Qo":return s.ordinalNumber(i,{unit:"quarter"});case"QQQ":return s.quarter(i,{width:"abbreviated",context:"formatting"});case"QQQQQ":return s.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return s.quarter(i,{width:"wide",context:"formatting"})}},q:function(e,t,s){const i=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(i);case"qq":return I(i,2);case"qo":return s.ordinalNumber(i,{unit:"quarter"});case"qqq":return s.quarter(i,{width:"abbreviated",context:"standalone"});case"qqqqq":return s.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return s.quarter(i,{width:"wide",context:"standalone"})}},M:function(e,t,s){const i=e.getMonth();switch(t){case"M":case"MM":return nt.M(e,t);case"Mo":return s.ordinalNumber(i+1,{unit:"month"});case"MMM":return s.month(i,{width:"abbreviated",context:"formatting"});case"MMMMM":return s.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return s.month(i,{width:"wide",context:"formatting"})}},L:function(e,t,s){const i=e.getMonth();switch(t){case"L":return String(i+1);case"LL":return I(i+1,2);case"Lo":return s.ordinalNumber(i+1,{unit:"month"});case"LLL":return s.month(i,{width:"abbreviated",context:"standalone"});case"LLLLL":return s.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return s.month(i,{width:"wide",context:"standalone"})}},w:function(e,t,s,i){const r=Cd(e,i);return t==="wo"?s.ordinalNumber(r,{unit:"week"}):I(r,t.length)},I:function(e,t,s){const i=xd(e);return t==="Io"?s.ordinalNumber(i,{unit:"week"}):I(i,t.length)},d:function(e,t,s){return t==="do"?s.ordinalNumber(e.getDate(),{unit:"date"}):nt.d(e,t)},D:function(e,t,s){const i=wd(e);return t==="Do"?s.ordinalNumber(i,{unit:"dayOfYear"}):I(i,t.length)},E:function(e,t,s){const i=e.getDay();switch(t){case"E":case"EE":case"EEE":return s.day(i,{width:"abbreviated",context:"formatting"});case"EEEEE":return s.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return s.day(i,{width:"short",context:"formatting"});case"EEEE":default:return s.day(i,{width:"wide",context:"formatting"})}},e:function(e,t,s,i){const r=e.getDay(),o=(r-i.weekStartsOn+8)%7||7;switch(t){case"e":return String(o);case"ee":return I(o,2);case"eo":return s.ordinalNumber(o,{unit:"day"});case"eee":return s.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return s.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return s.day(r,{width:"short",context:"formatting"});case"eeee":default:return s.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,s,i){const r=e.getDay(),o=(r-i.weekStartsOn+8)%7||7;switch(t){case"c":return String(o);case"cc":return I(o,t.length);case"co":return s.ordinalNumber(o,{unit:"day"});case"ccc":return s.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return s.day(r,{width:"narrow",context:"standalone"});case"cccccc":return s.day(r,{width:"short",context:"standalone"});case"cccc":default:return s.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,s){const i=e.getDay(),r=i===0?7:i;switch(t){case"i":return String(r);case"ii":return I(r,t.length);case"io":return s.ordinalNumber(r,{unit:"day"});case"iii":return s.day(i,{width:"abbreviated",context:"formatting"});case"iiiii":return s.day(i,{width:"narrow",context:"formatting"});case"iiiiii":return s.day(i,{width:"short",context:"formatting"});case"iiii":default:return s.day(i,{width:"wide",context:"formatting"})}},a:function(e,t,s){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return s.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return s.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return s.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return s.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,s){const i=e.getHours();let r;switch(i===12?r=St.noon:i===0?r=St.midnight:r=i/12>=1?"pm":"am",t){case"b":case"bb":return s.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return s.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return s.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return s.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,s){const i=e.getHours();let r;switch(i>=17?r=St.evening:i>=12?r=St.afternoon:i>=4?r=St.morning:r=St.night,t){case"B":case"BB":case"BBB":return s.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return s.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return s.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,s){if(t==="ho"){let i=e.getHours()%12;return i===0&&(i=12),s.ordinalNumber(i,{unit:"hour"})}return nt.h(e,t)},H:function(e,t,s){return t==="Ho"?s.ordinalNumber(e.getHours(),{unit:"hour"}):nt.H(e,t)},K:function(e,t,s){const i=e.getHours()%12;return t==="Ko"?s.ordinalNumber(i,{unit:"hour"}):I(i,t.length)},k:function(e,t,s){let i=e.getHours();return i===0&&(i=24),t==="ko"?s.ordinalNumber(i,{unit:"hour"}):I(i,t.length)},m:function(e,t,s){return t==="mo"?s.ordinalNumber(e.getMinutes(),{unit:"minute"}):nt.m(e,t)},s:function(e,t,s){return t==="so"?s.ordinalNumber(e.getSeconds(),{unit:"second"}):nt.s(e,t)},S:function(e,t){return nt.S(e,t)},X:function(e,t,s){const i=e.getTimezoneOffset();if(i===0)return"Z";switch(t){case"X":return Br(i);case"XXXX":case"XX":return bt(i);case"XXXXX":case"XXX":default:return bt(i,":")}},x:function(e,t,s){const i=e.getTimezoneOffset();switch(t){case"x":return Br(i);case"xxxx":case"xx":return bt(i);case"xxxxx":case"xxx":default:return bt(i,":")}},O:function(e,t,s){const i=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Nr(i,":");case"OOOO":default:return"GMT"+bt(i,":")}},z:function(e,t,s){const i=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Nr(i,":");case"zzzz":default:return"GMT"+bt(i,":")}},t:function(e,t,s){const i=Math.trunc(+e/1e3);return I(i,t.length)},T:function(e,t,s){return I(+e,t.length)}};function Nr(e,t=""){const s=e>0?"-":"+",i=Math.abs(e),r=Math.trunc(i/60),o=i%60;return o===0?s+String(r):s+String(r)+t+I(o,2)}function Br(e,t){return e%60===0?(e>0?"-":"+")+I(Math.abs(e)/60,2):bt(e,t)}function bt(e,t=""){const s=e>0?"-":"+",i=Math.abs(e),r=I(Math.trunc(i/60),2),o=I(i%60,2);return s+r+t+o}const Hr=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Lo=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},$d=(e,t)=>{const s=e.match(/(P+)(p+)?/)||[],i=s[1],r=s[2];if(!r)return Hr(e,t);let o;switch(i){case"P":o=t.dateTime({width:"short"});break;case"PP":o=t.dateTime({width:"medium"});break;case"PPP":o=t.dateTime({width:"long"});break;case"PPPP":default:o=t.dateTime({width:"full"});break}return o.replace("{{date}}",Hr(i,t)).replace("{{time}}",Lo(r,t))},Td={p:Lo,P:$d},Sd=/^D+$/,Ed=/^Y+$/,zd=["D","DD","YY","YYYY"];function Rd(e){return Sd.test(e)}function Ad(e){return Ed.test(e)}function Od(e,t,s){const i=Id(e,t,s);if(console.warn(i),zd.includes(e))throw new RangeError(i)}function Id(e,t,s){const i=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${i} to the input \`${s}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Md=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Dd=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Pd=/^'([^]*?)'?$/,Ld=/''/g,Fd=/[a-zA-Z]/;function Nd(e,t,s){var p,f,b,m;const i=hs(),r=i.locale??Do,o=i.firstWeekContainsDate??((f=(p=i.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??1,n=i.weekStartsOn??((m=(b=i.locale)==null?void 0:b.options)==null?void 0:m.weekStartsOn)??0,a=Z(e,s==null?void 0:s.in);if(!Ic(a))throw new RangeError("Invalid time value");let d=t.match(Dd).map(g=>{const v=g[0];if(v==="p"||v==="P"){const w=Td[v];return w(g,r.formatLong)}return g}).join("").match(Md).map(g=>{if(g==="''")return{isToken:!1,value:"'"};const v=g[0];if(v==="'")return{isToken:!1,value:Bd(g)};if(Fr[v])return{isToken:!0,value:g};if(v.match(Fd))throw new RangeError("Format string contains an unescaped latin alphabet character `"+v+"`");return{isToken:!1,value:g}});r.localize.preprocessor&&(d=r.localize.preprocessor(a,d));const c={firstWeekContainsDate:o,weekStartsOn:n,locale:r};return d.map(g=>{if(!g.isToken)return g.value;const v=g.value;(Ad(v)||Rd(v))&&Od(v,t,String(e));const w=Fr[v[0]];return w(a,v,r.localize,c)}).join("")}function Bd(e){const t=e.match(Pd);return t?t[1].replace(Ld,"'"):e}function Hd(e,t,s){const i=hs(),r=(s==null?void 0:s.locale)??i.locale??Do,o=2520,n=Rs(e,t);if(isNaN(n))throw new RangeError("Invalid time value");const a=Object.assign({},s,{addSuffix:s==null?void 0:s.addSuffix,comparison:n}),[d,c]=ps(s==null?void 0:s.in,...n>0?[t,e]:[e,t]),p=Hc(c,d),f=(js(c)-js(d))/1e3,b=Math.round((p-f)/60);let m;if(b<2)return s!=null&&s.includeSeconds?p<5?r.formatDistance("lessThanXSeconds",5,a):p<10?r.formatDistance("lessThanXSeconds",10,a):p<20?r.formatDistance("lessThanXSeconds",20,a):p<40?r.formatDistance("halfAMinute",0,a):p<60?r.formatDistance("lessThanXMinutes",1,a):r.formatDistance("xMinutes",1,a):b===0?r.formatDistance("lessThanXMinutes",1,a):r.formatDistance("xMinutes",b,a);if(b<45)return r.formatDistance("xMinutes",b,a);if(b<90)return r.formatDistance("aboutXHours",1,a);if(b<Dr){const g=Math.round(b/60);return r.formatDistance("aboutXHours",g,a)}else{if(b<o)return r.formatDistance("xDays",1,a);if(b<xs){const g=Math.round(b/Dr);return r.formatDistance("xDays",g,a)}else if(b<xs*2)return m=Math.round(b/xs),r.formatDistance("aboutXMonths",m,a)}if(m=Bc(c,d),m<12){const g=Math.round(b/xs);return r.formatDistance("xMonths",g,a)}else{const g=m%12,v=Math.trunc(m/12);return g<3?r.formatDistance("aboutXYears",v,a):g<9?r.formatDistance("overXYears",v,a):r.formatDistance("almostXYears",v+1,a)}}function jd(e,t){return Hd(e,Ac(e),t)}var Ud=Object.defineProperty,Vd=Object.getOwnPropertyDescriptor,$t=(e,t,s,i)=>{for(var r=i>1?void 0:i?Vd(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&Ud(t,s,r),r};const jr={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Wd={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let Je=class extends he{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),e.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var o;if(((o=this.tick)==null?void 0:o.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const e=new Date(this.tick.started_at),t=new Date,s=Pc(t,e),i=Dc(t,e),r=s%60;i>0?this.elapsedTime=`${i}h ${r}m`:this.elapsedTime=`${s}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return jr[this.tick.priority]??jr[2]}getPriorityLabel(){return Wd[this.tick.priority]??"Unknown"}renderVerificationBadge(){const e=this.tick.verification_status;if(!e)return null;switch(e){case"verified":return h`<span class="meta-badge verified">✓ verified</span>`;case"failed":return h`<span class="meta-badge verification-failed">✗ failed</span>`;case"pending":return h`<span class="meta-badge verification-pending">⋯ pending</span>`;default:return null}}render(){const{tick:e,selected:t,focused:s,epicName:i}=this;return h`
      <div
        class="card ${t?"selected":""} ${s?"focused":""}"
        @click=${this.handleClick}
        role="button"
        tabindex=${s?"0":"-1"}
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
          ${e.is_blocked?h`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${e.manual?h`<span class="meta-badge manual">👤 manual</span>`:null}
          ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:null}
          ${this.renderVerificationBadge()}
        </div>

        ${i?h`<div class="epic-name">${i}</div>`:null}

        ${this.elapsedTime?h`<div class="working-time">⏱ Working for ${this.elapsedTime}</div>`:null}
      </div>
    `}};Je.styles=$`
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

    .working-time {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      color: var(--peach);
      margin-top: 0.375rem;
    }
  `;$t([u({attribute:!1})],Je.prototype,"tick",2);$t([u({type:Boolean})],Je.prototype,"selected",2);$t([u({type:Boolean})],Je.prototype,"focused",2);$t([u({type:String,attribute:"epic-name"})],Je.prototype,"epicName",2);$t([C(".card")],Je.prototype,"cardElement",2);$t([k()],Je.prototype,"elapsedTime",2);Je=$t([be("tick-card")],Je);var qd=Object.defineProperty,Yd=Object.getOwnPropertyDescriptor,Ft=(e,t,s,i)=>{for(var r=i>1?void 0:i?Yd(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&qd(t,s,r),r};const Kd={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},Xd={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},Gd={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let dt=class extends he{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||Kd[this.name]||"var(--blue)"}getColumnDisplayName(){return Xd[this.name]||this.name}getColumnIcon(){return Gd[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),s=this.getColumnIcon(),i=this.ticks.length;return h`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${e}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${e}">${s}</span>
            ${t}
          </span>
          <span class="column-count">${i}</span>
        </div>
      </div>

      <div class="column-content">
        ${i===0?h`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${s}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(r=>h`
                <tick-card
                  .tick=${r}
                  epic-name=${this.epicNames[r.parent||""]||""}
                  ?focused=${this.focusedTickId===r.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};dt.styles=$`
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
  `;Ft([u({type:String})],dt.prototype,"name",2);Ft([u({type:String})],dt.prototype,"color",2);Ft([u({attribute:!1})],dt.prototype,"ticks",2);Ft([u({type:Object,attribute:!1})],dt.prototype,"epicNames",2);Ft([u({type:String,attribute:"focused-tick-id"})],dt.prototype,"focusedTickId",2);dt=Ft([be("tick-column")],dt);var Qd=Object.defineProperty,Zd=Object.getOwnPropertyDescriptor,We=(e,t,s,i)=>{for(var r=i>1?void 0:i?Zd(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&Qd(t,s,r),r};let _e=class extends he{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.runPanelOpen=!1,this.runActive=!1,this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const s=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:s},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleRunPanelToggle(){this.dispatchEvent(new CustomEvent("run-panel-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return h`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          ${this.readonlyMode?h`<a href="/app" style="text-decoration: none;"><ticks-logo variant="logotype" .size=${24}></ticks-logo></a>`:h`<ticks-logo variant="logotype" .size=${24}></ticks-logo>`}
          <sl-tooltip content=${this.getConnectionTooltip()}>
            <span class="connection-status ${this.connectionStatus}"></span>
          </sl-tooltip>
          ${this.repoName?h`<span class="repo-badge">${this.repoName}</span>`:null}
          ${this.readonlyMode?h`
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
            ${this.epics.map(e=>h`
                <sl-option value=${e.id}>
                  <span class="epic-id">${e.id}</span> - ${e.title}
                </sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Live run panel (r)">
            <sl-button
              class=${this.runActive?"run-button-active":""}
              variant=${this.runPanelOpen?"primary":"default"}
              size="small"
              @click=${this.handleRunPanelToggle}
            >
              <sl-icon name="terminal"></sl-icon>
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
    `}};_e.styles=$`
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
  `;We([u({type:String,attribute:"repo-name"})],_e.prototype,"repoName",2);We([u({attribute:!1})],_e.prototype,"epics",2);We([u({type:String,attribute:"selected-epic"})],_e.prototype,"selectedEpic",2);We([u({type:String,attribute:"search-term"})],_e.prototype,"searchTerm",2);We([u({type:Boolean,attribute:"run-panel-open"})],_e.prototype,"runPanelOpen",2);We([u({type:Boolean,attribute:"run-active"})],_e.prototype,"runActive",2);We([u({type:Boolean,attribute:"readonly-mode"})],_e.prototype,"readonlyMode",2);We([u({type:String,attribute:"connection-status"})],_e.prototype,"connectionStatus",2);We([k()],_e.prototype,"debounceTimeout",2);_e=We([be("tick-header")],_e);var Jd=Object.defineProperty,eu=Object.getOwnPropertyDescriptor,ci=(e,t,s,i)=>{for(var r=i>1?void 0:i?eu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&Jd(t,s,r),r};let Ot=class extends he{constructor(){super(...arguments),this.record=null,this.loading=!1,this.error=""}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}truncateText(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}renderSummary(e){const t=e.metrics.input_tokens+e.metrics.output_tokens,s=e.success?"success":"error";return h`
      <div class="summary-section">
        <div class="summary-header">
          <div class="summary-left">
            <span class="status-icon ${s}">
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
            <span class="summary-value ${s}">${e.success?"Success":"Failed"}</span>
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

        ${!e.success&&e.error_msg?h`<div class="error-box"><strong>Error:</strong> ${e.error_msg}</div>`:y}
      </div>
    `}renderMetrics(e){const t=e.metrics;return h`
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
          ${t.cache_read_tokens>0?h`
                <div class="metric-item">
                  <span class="metric-label">Cache Read</span>
                  <span class="metric-value">${this.formatTokenCount(t.cache_read_tokens)}</span>
                </div>
              `:y}
          ${t.cache_creation_tokens>0?h`
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
    `}renderOutput(e){return e.output?h`
      <sl-details summary="Output">
        <div class="content-block">${e.output}</div>
      </sl-details>
    `:y}renderThinking(e){return e.thinking?h`
      <sl-details summary="Thinking">
        <div class="content-block">${e.thinking}</div>
      </sl-details>
    `:y}renderToolItem(e){return h`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:y}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`:y}
      </li>
    `}renderTools(e){return!e.tools||e.tools.length===0?y:h`
      <sl-details summary="Tools (${e.tools.length})">
        <ul class="tools-list">
          ${e.tools.map(t=>this.renderToolItem(t))}
        </ul>
      </sl-details>
    `}renderVerifierResult(e){const t=e.passed?"passed":"failed";return h`
      <div class="verifier-item ${t}">
        <span class="verifier-icon ${t}">
          <sl-icon name="${e.passed?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:y}
          ${e.output?h`<div class="verifier-output">${e.output}</div>`:y}
        </div>
      </div>
    `}renderVerification(e){if(!e.verification)return y;const t=e.verification,s=t.all_passed?"passed":"failed",i=t.results||[];return h`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${s}">
            <sl-icon name="${t.all_passed?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            <span>${t.all_passed?"Verified":"Failed"}</span>
          </div>
        </div>
        ${i.length>0?h`
              <div class="verifier-results">
                ${i.map(r=>this.renderVerifierResult(r))}
              </div>
            `:y}
      </sl-details>
    `}render(){if(this.loading)return h`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading run record...</span>
        </div>
      `;if(this.error)return h`<div class="error">${this.error}</div>`;if(!this.record)return h`<div class="empty">No run record available</div>`;const e=this.record,t=e.success?"success":"error";return h`
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
    `}};Ot.styles=$`
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
  `;ci([u({attribute:!1})],Ot.prototype,"record",2);ci([u({type:Boolean})],Ot.prototype,"loading",2);ci([u({type:String})],Ot.prototype,"error",2);Ot=ci([be("run-record")],Ot);var tu=Object.defineProperty,su=Object.getOwnPropertyDescriptor,W=(e,t,s,i)=>{for(var r=i>1?void 0:i?su(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&tu(t,s,r),r};const iu={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},Ur={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let U=class extends he{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview",this.isCloudModeController=new le.StoreController(this,Qe)}get isCloudMode(){return this.isCloudModeController.value}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&(this.resetActionState(),this.tick&&this.tick.type==="task"&&this.loadRunRecord())}async loadRunRecord(){if(this.tick){if(this.isCloudMode){this.loadingRunRecord=!1;return}this.loadingRunRecord=!0,this.runRecordError="",this.runRecord=null;try{this.runRecord=await yc(this.tick.id)}catch(e){this.runRecordError=e instanceof Error?e.message:"Failed to load run history"}finally{this.loadingRunRecord=!1}}}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await uc(this.tick.id),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await hc(this.tick.id,this.rejectReason.trim()),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await pc(this.tick.id,this.closeReason.trim()||void 0),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await mc(this.tick.id),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const s=await dc(this.tick.id,e);this.optimisticNote=null;const i={...s,is_blocked:(((t=s.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:Ji(s.notes)};this.emitTickUpdated(i)}catch(s){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=s instanceof Error?s.message:"Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return iu[e]??"Unknown"}getPriorityColor(e){return Ur[e]??Ur[2]}formatStartedAt(e){const t=new Date(e),s=jd(t,{addSuffix:!0}),i=Nd(t,"h:mm a");return`${s} (${i})`}renderActions(){const e=this.tick;if(!e)return y;const t=e.status==="open",s=e.status==="closed",i=!!e.awaiting,r=!!e.requires,o=t&&i,n=t&&!r,a=s;return!o&&!n&&!a?y:h`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?h`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:y}

        <div class="actions-section">
          ${o?h`
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
          ${n?h`
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
          ${a?h`
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

        ${this.showRejectInput?h`
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

        ${this.showCloseInput?h`
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
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?h`<span class="empty-text">None</span>`:h`
      <ul class="link-list">
        ${this.blockerDetails.map(e=>h`
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
    `}renderParent(){var e;return(e=this.tick)!=null&&e.parent?h`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?h`<span class="link-title">${this.parentTitle}</span>`:y}
      </a>
    `:h`<span class="empty-text">None</span>`}renderLabels(){var e;return!((e=this.tick)!=null&&e.labels)||this.tick.labels.length===0?h`<span class="empty-text">None</span>`:h`
      <div class="labels-container">
        ${this.tick.labels.map(t=>h`<span class="label-badge">${t}</span>`)}
      </div>
    `}renderNoteItem(e,t=!1){return h`
      <li class="note-item ${t?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${e.author??"Unknown"}</span>
          ${e.timestamp?h`<span class="note-timestamp"
                >${this.formatTimestamp(e.timestamp)}</span
              >`:y}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?h`<div class="note-sending">Sending...</div>`:y}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return h`
      ${e?h`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):y}
              </ul>
            </div>
          `:h`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?h`
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
    `}toggleSection(e){const t=new Set(this.expandedSections);t.has(e)?t.delete(e):t.add(e),this.expandedSections=t}formatRunTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}truncateText(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}renderVerification(){var i;if(((i=this.tick)==null?void 0:i.type)!=="task"||!this.runRecord)return y;const e=this.runRecord.verification;if(!e)return this.tick.status==="closed"?h`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `:y;const t=e.all_passed,s=e.results||[];return h`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-circle-fill":"x-circle-fill"}"></sl-icon>
          <span>${t?"Verified":"Failed"}</span>
        </div>

        ${s.length>0?h`
              <div class="verifier-results">
                ${s.map(r=>this.renderVerifierResult(r))}
              </div>
            `:y}
      </div>
      <sl-divider></sl-divider>
    `}renderVerifierResult(e){const t=e.passed,s=this.expandedSections.has(`verifier-${e.verifier}`);return h`
      <div class="verifier-item ${t?"passed":"failed"}">
        <span class="verifier-icon ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-lg":"x-lg"}"></sl-icon>
        </span>
        <div class="verifier-content">
          <div class="verifier-header">
            <span class="verifier-name">${e.verifier}</span>
            <span class="verifier-duration">${this.formatDuration(e.duration_ms)}</span>
          </div>
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:y}
          ${e.output?h`
                <div
                  class="run-collapsible-header"
                  style="margin-top: 0.5rem;"
                  @click=${()=>this.toggleSection(`verifier-${e.verifier}`)}
                >
                  <span>Output</span>
                  <sl-icon
                    class="expand-icon ${s?"expanded":""}"
                    name="chevron-down"
                  ></sl-icon>
                </div>
                ${s?h`<div class="verifier-output">${e.output}</div>`:y}
              `:y}
        </div>
      </div>
    `}renderRunHistory(){var i;if(((i=this.tick)==null?void 0:i.type)!=="task")return y;if(this.loadingRunRecord)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <div class="run-loading">
            <sl-spinner></sl-spinner>
            <span>Loading run history...</span>
          </div>
        </div>
        <sl-divider></sl-divider>
      `;if(this.runRecordError)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.runRecordError}
          </sl-alert>
        </div>
        <sl-divider></sl-divider>
      `;if(!this.runRecord)return h`
        <div class="section">
          <div class="section-title">Run History</div>
          <span class="no-run-history">No run history available</span>
        </div>
        <sl-divider></sl-divider>
      `;const e=this.runRecord,t=this.expandedSections.has("run-main"),s=e.metrics.input_tokens+e.metrics.output_tokens;return h`
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
                    <span class="run-metric-value">${this.formatTokenCount(s)}</span>
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
    `}renderRunRecordBody(e){return h`
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
        ${e.metrics.cache_read_tokens>0?h`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Read</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_read_tokens)}</span>
              </div>
            `:y}
        ${e.metrics.cache_creation_tokens>0?h`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_creation_tokens)}</span>
              </div>
            `:y}

        <!-- Error message if failed -->
        ${!e.success&&e.error_msg?h`
              <div class="run-error-msg">
                <strong>Error:</strong> ${e.error_msg}
              </div>
            `:y}

        <!-- Collapsible: Output -->
        ${e.output?h`
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
                ${this.expandedSections.has("run-output")?h`
                      <div class="run-collapsible-content">
                        ${e.output}
                      </div>
                    `:y}
              </div>
            `:y}

        <!-- Collapsible: Thinking -->
        ${e.thinking?h`
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
                ${this.expandedSections.has("run-thinking")?h`
                      <div class="run-collapsible-content">
                        ${e.thinking}
                      </div>
                    `:y}
              </div>
            `:y}

        <!-- Collapsible: Tools Log -->
        ${e.tools&&e.tools.length>0?h`
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
                ${this.expandedSections.has("run-tools")?h`
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
          @click=${()=>{var s;const t=`.tick/logs/records/${(s=this.tick)==null?void 0:s.id}.json`;navigator.clipboard.writeText(t),window.showToast&&window.showToast({message:`Log path copied: ${t}`,variant:"primary",duration:3e3})}}
        >
          <sl-icon name="file-earmark-text"></sl-icon>
          Copy log file path
        </a>
      </div>
    `}renderToolItem(e){return h`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:y}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`:y}
      </li>
    `}renderRunTab(){var e;return((e=this.tick)==null?void 0:e.type)!=="task"?h`
        <div class="run-tab-empty">
          <sl-icon name="info-circle"></sl-icon>
          <div class="empty-message">Run data is only available for tasks.</div>
        </div>
      `:h`
      <div class="run-tab-content">
        <run-record
          .record=${this.runRecord}
          .loading=${this.loadingRunRecord}
          .error=${this.runRecordError}
        ></run-record>
      </div>
    `}shouldShowRunTab(){var e,t;return((e=this.tick)==null?void 0:e.type)==="task"&&((t=this.tick)==null?void 0:t.status)==="closed"}renderDetailsContent(){const e=this.tick;return e?h`
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
            ${e.manual?h`<span class="meta-badge manual">👤 Manual</span>`:y}
            ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:y}
            ${e.verdict?h`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:y}
            ${this.blockerDetails&&this.blockerDetails.length>0?h`<span class="meta-badge blocked">⊘ Blocked</span>`:y}
          </div>

          <!-- Started time for in_progress ticks -->
          ${e.status==="in_progress"&&e.started_at?h`
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
          ${e.description?h`<div class="description">${e.description}</div>`:h`<span class="empty-text">No description</span>`}
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
          ${e.closed_at?h`
                <div class="timestamp-row" style="margin-top: 0.375rem">
                  <span class="timestamp-label">Closed</span>
                  <span class="timestamp-value"
                    >${this.formatTimestamp(e.closed_at)}</span
                  >
                </div>
              `:y}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?h`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:y}
      </div>
    `:y}render(){const e=this.tick,t=this.shouldShowRunTab();return h`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?t?h`
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
              `:this.renderDetailsContent():h`<div class="drawer-content">
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
  `;W([u({attribute:!1})],U.prototype,"tick",2);W([u({type:Boolean})],U.prototype,"open",2);W([u({attribute:!1})],U.prototype,"notesList",2);W([u({attribute:!1})],U.prototype,"blockerDetails",2);W([u({type:String,attribute:"parent-title"})],U.prototype,"parentTitle",2);W([u({type:Boolean,attribute:"readonly-mode"})],U.prototype,"readonlyMode",2);W([k()],U.prototype,"loading",2);W([k()],U.prototype,"errorMessage",2);W([k()],U.prototype,"showRejectInput",2);W([k()],U.prototype,"showCloseInput",2);W([k()],U.prototype,"rejectReason",2);W([k()],U.prototype,"closeReason",2);W([k()],U.prototype,"newNoteText",2);W([k()],U.prototype,"addingNote",2);W([k()],U.prototype,"addNoteError",2);W([k()],U.prototype,"optimisticNote",2);W([k()],U.prototype,"runRecord",2);W([k()],U.prototype,"loadingRunRecord",2);W([k()],U.prototype,"runRecordError",2);W([k()],U.prototype,"expandedSections",2);W([k()],U.prototype,"activeTab",2);U=W([be("tick-detail-drawer")],U);var ru=Object.defineProperty,ou=Object.getOwnPropertyDescriptor,we=(e,t,s,i)=>{for(var r=i>1?void 0:i?ou(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&ru(t,s,r),r};const nu=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],au=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let de=class extends he{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleAwaitingChange(e){const t=e.target;this.awaiting=t.value}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent),this.awaiting&&(e.awaiting=this.awaiting);try{const s=await cc(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:s,labels:this.labels?this.labels.split(",").map(i=>i.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(s){s instanceof Bl?this.error=s.body||s.message:s instanceof Error?this.error=s.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return h`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?h`<div class="error-message">${this.error}</div>`:y}

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
              ${nu.map(e=>h`
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
              ${au.map(e=>h`
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
            ${this.epics.map(e=>h`
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
    `}};de.styles=$`
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
  `;we([u({type:Boolean})],de.prototype,"open",2);we([u({type:Array,attribute:!1})],de.prototype,"epics",2);we([k()],de.prototype,"loading",2);we([k()],de.prototype,"error",2);we([k()],de.prototype,"tickTitle",2);we([k()],de.prototype,"tickDescription",2);we([k()],de.prototype,"type",2);we([k()],de.prototype,"priority",2);we([k()],de.prototype,"parent",2);we([k()],de.prototype,"labels",2);we([k()],de.prototype,"awaiting",2);we([C('sl-input[name="title"]')],de.prototype,"titleInput",2);de=we([be("tick-create-dialog")],de);var lu=Object.defineProperty,cu=Object.getOwnPropertyDescriptor,Fo=(e,t,s,i)=>{for(var r=i>1?void 0:i?cu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&lu(t,s,r),r};const du=5e3;let uu=0;function hu(){return`toast-${++uu}-${Date.now()}`}let Us=class extends he{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:hu(),message:e.message,variant:e.variant??"primary",duration:e.duration??du};if(this.toasts=[...this.toasts,t],t.duration>0){const s=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,s)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(s=>s.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return h`
      ${this.toasts.map(e=>h`
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
    `}};Us.styles=$`
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
  `;Fo([k()],Us.prototype,"toasts",2);Us=Fo([be("tick-toast-stack")],Us);var pu=Object.defineProperty,mu=Object.getOwnPropertyDescriptor,Nt=(e,t,s,i)=>{for(var r=i>1?void 0:i?mu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&pu(t,s,r),r};let ut=class extends he{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(Qe.get()){this.loading=!1;return}try{this.activities=await vc(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,s=e.actor,i=e.data||{};switch(t){case"create":return`${s} created this tick`;case"update":return`${s} updated this tick`;case"close":return i.reason?`${s} closed: ${i.reason}`:`${s} closed this tick`;case"reopen":return`${s} reopened this tick`;case"note":return`${s} added a note`;case"approve":return`${s} approved this tick`;case"reject":return`${s} rejected this tick`;case"assign":return`${s} assigned to ${i.to||"someone"}`;case"awaiting":return`Waiting for ${i.awaiting||"human action"}`;case"block":return`${s} added a blocker`;case"unblock":return`${s} removed a blocker`;default:return`${s} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),i=new Date().getTime()-t.getTime(),r=Math.floor(i/1e3),o=Math.floor(r/60),n=Math.floor(o/60),a=Math.floor(n/24);return r<60?"just now":o<60?`${o}m ago`:n<24?`${n}h ago`:a<7?`${a}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return h`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?h`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:y}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?h`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:y}
              <sl-button size="small" variant="text" class="close-button" @click=${this.closeDropdown}>
                <sl-icon name="x-lg"></sl-icon>
              </sl-button>
            </div>
          </div>

          ${this.loading?h`<div class="loading-state">Loading...</div>`:this.activities.length===0?h`<div class="empty-state">No recent activity</div>`:this.activities.map(e=>h`
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
    `}};ut.styles=$`
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
  `;Nt([C("sl-dropdown")],ut.prototype,"dropdown",2);Nt([k()],ut.prototype,"activities",2);Nt([k()],ut.prototype,"loading",2);Nt([k()],ut.prototype,"unreadCount",2);Nt([k()],ut.prototype,"lastSeenTimestamp",2);ut=Nt([be("tick-activity-feed")],ut);var fu=Object.defineProperty,bu=Object.getOwnPropertyDescriptor,Pe=(e,t,s,i)=>{for(var r=i>1?void 0:i?bu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&fu(t,s,r),r};const Vr="run-output-pane-active-tab",Wr={30:"ansi-black",31:"ansi-red",32:"ansi-green",33:"ansi-yellow",34:"ansi-blue",35:"ansi-magenta",36:"ansi-cyan",37:"ansi-white",90:"ansi-bright-black",91:"ansi-bright-red",92:"ansi-bright-green",93:"ansi-bright-yellow",94:"ansi-bright-blue",95:"ansi-bright-magenta",96:"ansi-bright-cyan",97:"ansi-bright-white",40:"ansi-bg-black",41:"ansi-bg-red",42:"ansi-bg-green",43:"ansi-bg-yellow",44:"ansi-bg-blue",45:"ansi-bg-magenta",46:"ansi-bg-cyan",47:"ansi-bg-white"},qr={1:"ansi-bold",2:"ansi-dim",3:"ansi-italic",4:"ansi-underline"};let fe=class extends he{constructor(){super(...arguments),this.epicId="",this.autoScroll=!0,this.lines=[],this.connectionStatus="disconnected",this.activeTaskId=null,this.activeTool=null,this.lastOutput="",this.activeTab="output",this.unregisterAdapter=null,this.userScrolled=!1}connectedCallback(){super.connectedCallback();const e=localStorage.getItem(Vr);(e==="output"||e==="context")&&(this.activeTab=e),this.epicId&&this.connect()}disconnectedCallback(){super.disconnectedCallback(),this.disconnect()}updated(e){e.has("epicId")&&(this.disconnect(),this.epicId&&this.connect())}connect(){this.disconnect(),this.connectionStatus="connecting";const e={onEvent:r=>this.handleRunEvent(r),onConnected:()=>{this.connectionStatus="connected",this.addStatusLine(`Connected to run stream for epic ${this.epicId}`)},onDisconnected:()=>{this.connectionStatus="disconnected"},onError:r=>{console.error("[RunOutputPane] Stream error:",r)}},t=Ao(this.epicId),s=$o(r=>{if(r.epicId!==this.epicId)return;const o=this.convertCommsRunEvent(r);o&&this.handleRunEvent(o)}),i=nc(r=>{if(r.epicId!==this.epicId)return;const o=this.convertCommsContextEvent(r);o&&this.handleRunEvent(o)});if(this.unregisterAdapter=()=>{t(),s(),i()},wt.get()==="connected")e.onConnected();else{const r=wt.subscribe(n=>{n==="connected"?e.onConnected():n==="disconnected"&&e.onDisconnected()}),o=this.unregisterAdapter;this.unregisterAdapter=()=>{o==null||o(),r()}}}convertCommsRunEvent(e){const s={"run:task-started":"task-started","run:task-update":"task-update","run:task-completed":"task-completed","run:tool-activity":"tool-activity","run:epic-started":"epic-started","run:epic-completed":"epic-completed"}[e.type];if(!s)return null;const i={epicId:e.epicId,taskId:e.taskId,source:"ralph",eventType:s,timestamp:e.timestamp};switch(e.type){case"run:task-started":return{...i,eventType:"task-started",status:e.status,numTurns:e.numTurns,metrics:e.metrics};case"run:task-update":return{...i,eventType:"task-update",output:e.output,status:e.status,numTurns:e.numTurns,metrics:e.metrics,activeTool:e.activeTool};case"run:task-completed":return{...i,eventType:"task-completed",success:e.success,numTurns:e.numTurns,metrics:e.metrics};case"run:tool-activity":return{...i,eventType:"tool-activity",activeTool:e.tool};case"run:epic-started":return{...i,eventType:"epic-started",status:e.status,message:e.message};case"run:epic-completed":return{...i,eventType:"epic-completed",success:e.success};default:return null}}convertCommsContextEvent(e){const t={epicId:e.epicId,source:"ralph",timestamp:new Date().toISOString()};switch(e.type){case"context:generating":return{...t,eventType:"context-generating"};case"context:generated":return{...t,eventType:"context-generated"};case"context:loaded":return{...t,eventType:"context-loaded"};case"context:failed":return{...t,eventType:"context-failed",message:e.message};case"context:skipped":return{...t,eventType:"context-skipped",message:e.reason};default:return null}}handleRunEvent(e){var t;switch(e.eventType){case"connected":break;case"task-started":this.activeTaskId=e.taskId||null,this.lastOutput="",this.addStatusLine(`Task ${e.taskId} started (iteration ${e.iteration??1})`);break;case"task-update":if(e.taskId&&e.taskId!==this.activeTaskId&&(this.activeTaskId=e.taskId),this.activeTool=((t=e.activeTool)==null?void 0:t.name)||null,e.output&&e.output!==this.lastOutput){const i=e.output.slice(this.lastOutput.length);i&&this.addOutputLines(i),this.lastOutput=e.output}break;case"tool-activity":e.activeTool&&(this.activeTool=e.activeTool.name,this.addToolLine(`⚙ ${e.activeTool.name}`));break;case"task-completed":const s=e.success?"✓ completed":"✗ failed";this.addStatusLine(`Task ${e.taskId} ${s}`),this.activeTaskId===e.taskId&&(this.activeTaskId=null,this.activeTool=null,this.lastOutput="");break;case"epic-started":this.addStatusLine(`Epic ${e.epicId} started (${e.source})`);break;case"epic-completed":this.addStatusLine(`Epic completed: ${e.success?"success":"failed"}`),this.activeTaskId=null,this.activeTool=null;break;case"context-generating":this.addStatusLine("📚 Generating epic context...");break;case"context-generated":this.addStatusLine("✓ Context generated");break;case"context-loaded":this.addStatusLine("📖 Using existing context");break;case"context-failed":this.addStatusLine(`⚠ Context generation failed: ${e.message??"unknown error"}`);break;case"context-skipped":this.addStatusLine(`⏭ Context skipped: ${e.message??"single-task epic"}`);break}}disconnect(){this.unregisterAdapter&&(this.unregisterAdapter(),this.unregisterAdapter=null)}addStatusLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"status"}],this.scrollToBottom()}addToolLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"tool"}],this.scrollToBottom()}addOutputLines(e){const t=new Date,s=e.split(`
`).filter(i=>i.length>0).map(i=>({timestamp:t,content:i,type:"output"}));s.length>0&&(this.lines=[...this.lines,...s],this.scrollToBottom())}scrollToBottom(){!this.autoScroll||this.userScrolled||requestAnimationFrame(()=>{this.outputContainer&&(this.outputContainer.scrollTop=this.outputContainer.scrollHeight)})}handleScroll(){if(!this.outputContainer)return;const{scrollTop:e,scrollHeight:t,clientHeight:s}=this.outputContainer,i=t-e-s<20;this.userScrolled=!i}toggleAutoScroll(){this.autoScroll=!this.autoScroll,this.autoScroll&&(this.userScrolled=!1,this.scrollToBottom())}handleTabShow(e){const t=e.detail.name;this.activeTab=t,localStorage.setItem(Vr,t)}clearOutput(){this.lines=[],this.lastOutput="",this.userScrolled=!1}async copyOutput(){const e=this.lines.map(t=>`[${this.formatTimestamp(t.timestamp)}] ${t.content}`).join(`
`);try{await navigator.clipboard.writeText(e),window.showToast&&window.showToast({message:"Output copied to clipboard",variant:"success"})}catch(t){console.error("Failed to copy output:",t)}}formatTimestamp(e){return e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}ansiToHtml(e){let t=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const s=[],i=/\x1b\[([0-9;]*)m/g;return t=t.replace(i,(r,o)=>{let n=s.length>0?"</span>":"";s.length=0;const a=o?o.split(";").map(Number):[0];for(const d of a)d===0?s.length=0:Wr[d]?s.push(Wr[d]):qr[d]&&s.push(qr[d]);return s.length>0&&(n+=`<span class="${s.join(" ")}">`),n}),s.length>0&&(t+="</span>"),t}getStatusText(){switch(this.connectionStatus){case"connected":return"Connected";case"connecting":return"Connecting...";case"disconnected":return"Disconnected"}}renderOutputContent(){return h`
      <div
        class="output-container"
        @scroll=${this.handleScroll}
      >
        ${this.lines.length===0?h`
              <div class="empty-state">
                <sl-icon name="terminal"></sl-icon>
                <p>No output yet. Connect to an epic to see agent output.</p>
              </div>
            `:this.lines.map(e=>h`
              <div class="output-line">
                <span class="line-timestamp">${this.formatTimestamp(e.timestamp)}</span>
                <span class="line-content ${e.type}">
                  ${e.type==="output"?Xi(this.ansiToHtml(e.content)):e.content}
                </span>
              </div>
            `)}
      </div>
    `}render(){return h`
      <div class="output-pane">
        <div class="pane-header">
          <div class="header-left">
            <div class="connection-status">
              <span class="status-indicator ${this.connectionStatus}"></span>
              <span>${this.getStatusText()}</span>
            </div>
          </div>
          <div class="header-actions">
            ${this.activeTab==="output"?h`
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
            `:y}
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

        ${this.activeTab==="output"&&(this.activeTaskId||this.activeTool)?h`
              <div class="pane-footer">
                <div class="active-task">
                  ${this.activeTaskId?h`
                        <span class="active-task-label">Task:</span>
                        <span class="active-task-id">${this.activeTaskId}</span>
                      `:y}
                  ${this.activeTool?h`
                        <span class="active-tool">
                          <sl-icon name="gear"></sl-icon>
                          ${this.activeTool}
                        </span>
                      `:y}
                </div>
                <span class="line-count">${this.lines.length} lines</span>
              </div>
            `:y}
      </div>
    `}};fe.styles=$`
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
      white-space: pre-wrap;
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
  `;Pe([u({type:String,attribute:"epic-id"})],fe.prototype,"epicId",2);Pe([u({type:Boolean,attribute:"auto-scroll"})],fe.prototype,"autoScroll",2);Pe([k()],fe.prototype,"lines",2);Pe([k()],fe.prototype,"connectionStatus",2);Pe([k()],fe.prototype,"activeTaskId",2);Pe([k()],fe.prototype,"activeTool",2);Pe([k()],fe.prototype,"lastOutput",2);Pe([k()],fe.prototype,"activeTab",2);Pe([C(".output-container")],fe.prototype,"outputContainer",2);Pe([C("context-pane")],fe.prototype,"contextPane",2);fe=Pe([be("run-output-pane")],fe);var gu=Object.defineProperty,vu=Object.getOwnPropertyDescriptor,di=(e,t,s,i)=>{for(var r=i>1?void 0:i?vu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&gu(t,s,r),r};const yu={Read:"file-earmark-text",Write:"file-earmark-plus",Edit:"pencil-square",Bash:"terminal",Glob:"search",Grep:"file-earmark-code",Task:"list-task",WebFetch:"globe",WebSearch:"search",TodoWrite:"check2-square",AskUserQuestion:"chat-left-dots",NotebookEdit:"journal-code",KillShell:"x-circle",TaskOutput:"box-arrow-right",Skill:"lightning",EnterPlanMode:"map",ExitPlanMode:"check2-circle"},ku={Read:"var(--blue, #89b4fa)",Write:"var(--green, #a6e3a1)",Edit:"var(--yellow, #f9e2af)",Bash:"var(--peach, #fab387)",Glob:"var(--teal, #94e2d5)",Grep:"var(--sapphire, #74c7ec)",Task:"var(--mauve, #cba6f7)",WebFetch:"var(--sky, #89dceb)",WebSearch:"var(--sky, #89dceb)",TodoWrite:"var(--lavender, #b4befe)",AskUserQuestion:"var(--pink, #f5c2e7)",NotebookEdit:"var(--flamingo, #f2cdcd)",KillShell:"var(--red, #f38ba8)",TaskOutput:"var(--rosewater, #f5e0dc)",Skill:"var(--maroon, #eba0ac)",EnterPlanMode:"var(--lavender, #b4befe)",ExitPlanMode:"var(--green, #a6e3a1)"};let It=class extends he{constructor(){super(...arguments),this.activity=null,this.expanded=!1,this.elapsedMs=0,this.timerInterval=null}connectedCallback(){super.connectedCallback(),this.startTimer()}disconnectedCallback(){super.disconnectedCallback(),this.stopTimer()}updated(e){e.has("activity")&&this.updateTimer()}startTimer(){this.timerInterval||(this.timerInterval=setInterval(()=>{if(this.activity&&!this.activity.isComplete&&this.activity.startedAt){const e=this.activity.startedAt instanceof Date?this.activity.startedAt.getTime():new Date(this.activity.startedAt).getTime();this.elapsedMs=Date.now()-e}},100))}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}updateTimer(){var e;(e=this.activity)!=null&&e.isComplete?(this.stopTimer(),this.activity.durationMs!==void 0&&(this.elapsedMs=this.activity.durationMs)):this.activity&&!this.timerInterval&&this.startTimer()}getToolIcon(e){return yu[e]??"gear"}getToolColor(e){return ku[e]??"var(--mauve, #cba6f7)"}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3),s=e%1e3;if(t<60)return`${t}.${Math.floor(s/100)}s`;const i=Math.floor(t/60),r=t%60;return`${i}m ${r}s`}truncateInput(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}getStatusClass(){return this.activity?this.activity.isError?"error":this.activity.isComplete?"complete":"running":""}renderCompact(){const{activity:e}=this;if(!e)return h`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),s=this.getStatusClass(),i=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return h`
      <div class="tool-compact ${s}" style="--tool-color: ${t}">
        <span class="tool-icon">
          <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
        </span>
        <span class="tool-name">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateInput(e.input)}</span>`:y}
        ${i>0?h`<span class="tool-duration">${this.formatDuration(i)}</span>`:y}
        ${e.isComplete?h`
              <span class="tool-status-icon ${e.isError?"error":"success"}">
                <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
              </span>
            `:h`
              <span class="tool-spinner">
                <sl-spinner></sl-spinner>
              </span>
            `}
      </div>
    `}renderExpanded(){const{activity:e}=this;if(!e)return h`
        <div class="empty-state">
          <sl-icon name="gear"></sl-icon>
          <span>No active tool</span>
        </div>
      `;const t=this.getToolColor(e.name),s=this.getStatusClass(),i=e.isComplete&&e.durationMs!==void 0?e.durationMs:this.elapsedMs;return h`
      <div class="tool-expanded ${s}" style="--tool-color: ${t}">
        <div class="tool-header">
          <span class="tool-icon">
            <sl-icon name="${this.getToolIcon(e.name)}"></sl-icon>
          </span>
          <span class="tool-name">${e.name}</span>
          ${e.isComplete?h`
                <span class="tool-status-icon ${e.isError?"error":"success"}">
                  <sl-icon name="${e.isError?"x-circle-fill":"check-circle-fill"}"></sl-icon>
                </span>
              `:h`
                <span class="tool-spinner">
                  <sl-spinner></sl-spinner>
                </span>
              `}
          ${i>0?h`<span class="tool-duration">${this.formatDuration(i)}</span>`:y}
        </div>
        <div class="tool-body">
          ${e.input?h`
                <div class="tool-section">
                  <div class="tool-section-label">Input</div>
                  <div class="tool-section-content">${e.input}</div>
                </div>
              `:y}
          ${e.output?h`
                <div class="tool-section">
                  <div class="tool-section-label">Output</div>
                  <div class="tool-section-content ${e.isError?"error-content":""}">${e.output}</div>
                </div>
              `:y}
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};It.styles=$`
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
  `;di([u({attribute:!1})],It.prototype,"activity",2);di([u({type:Boolean})],It.prototype,"expanded",2);di([k()],It.prototype,"elapsedMs",2);It=di([be("tool-activity")],It);var wu=Object.defineProperty,xu=Object.getOwnPropertyDescriptor,ms=(e,t,s,i)=>{for(var r=i>1?void 0:i?xu(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&wu(t,s,r),r};let xt=class extends he{constructor(){super(...arguments),this.metrics=null,this.model="",this.live=!1,this.expanded=!1}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}getTotalTokens(){return this.metrics?this.metrics.inputTokens+this.metrics.outputTokens+this.metrics.cacheReadTokens+this.metrics.cacheCreationTokens:0}getTokenPercentage(e){const t=this.getTotalTokens();return t===0?0:e/t*100}renderCompact(){if(!this.metrics)return h`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics</span>
        </div>
      `;const e=this.getTotalTokens();return h`
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
        ${this.model?h`
              <span class="metric-separator">•</span>
              <span class="model-badge">${this.model}</span>
            `:y}
      </div>
    `}renderExpanded(){if(!this.metrics)return h`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics available</span>
        </div>
      `;const{inputTokens:e,outputTokens:t,cacheReadTokens:s,cacheCreationTokens:i,costUsd:r,durationMs:o}=this.metrics,n=this.getTotalTokens();return h`
      <div class="metrics-expanded ${this.live?"live":""}">
        <div class="metrics-header">
          <div class="metrics-title">
            <sl-icon name="bar-chart"></sl-icon>
            <span>Token Usage</span>
          </div>
          ${this.live?h`
                <div class="live-indicator">
                  <span class="pulse"></span>
                  <span>Live</span>
                </div>
              `:y}
        </div>
        <div class="metrics-body">
          <!-- Token distribution bar -->
          <div class="token-bar-container">
            <div class="token-bar-label">
              <span>Token Distribution</span>
              <span>${this.formatTokenCount(n)} total</span>
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
                style="width: ${this.getTokenPercentage(s)}%"
                title="Cache Read: ${this.formatTokenCount(s)}"
              ></div>
              <div
                class="token-bar-segment cache-creation"
                style="width: ${this.getTokenPercentage(i)}%"
                title="Cache Creation: ${this.formatTokenCount(i)}"
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
              <div class="metric-card-value">${this.formatTokenCount(s)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">
                <span class="dot cache-creation"></span>
                Cache Create
              </div>
              <div class="metric-card-value">${this.formatTokenCount(i)}</div>
            </div>
          </div>

          <!-- Summary row -->
          <div class="metrics-summary">
            <div class="summary-item">
              <div class="summary-label">Cost</div>
              <div class="summary-value cost">${this.formatCost(r)}</div>
            </div>
            ${o!==void 0?h`
                  <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value duration">${this.formatDuration(o)}</div>
                  </div>
                `:y}
            ${this.model?h`
                  <div class="summary-item">
                    <div class="summary-label">Model</div>
                    <div class="summary-value model">${this.model}</div>
                  </div>
                `:y}
          </div>
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};xt.styles=$`
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
  `;ms([u({attribute:!1})],xt.prototype,"metrics",2);ms([u({type:String})],xt.prototype,"model",2);ms([u({type:Boolean})],xt.prototype,"live",2);ms([u({type:Boolean})],xt.prototype,"expanded",2);xt=ms([be("run-metrics")],xt);function tr(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var Tt=tr();function No(e){Tt=e}var ts={exec:()=>null};function R(e,t=""){let s=typeof e=="string"?e:e.source,i={replace:(r,o)=>{let n=typeof o=="string"?o:o.source;return n=n.replace(ce.caret,"$1"),s=s.replace(r,n),i},getRegex:()=>new RegExp(s,t)};return i}var _u=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),ce={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,"i")},Cu=/^(?:[ \t]*(?:\n|$))+/,$u=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Tu=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,fs=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Su=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,sr=/(?:[*+-]|\d{1,9}[.)])/,Bo=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Ho=R(Bo).replace(/bull/g,sr).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Eu=R(Bo).replace(/bull/g,sr).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),ir=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,zu=/^[^\n]+/,rr=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Ru=R(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",rr).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Au=R(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,sr).getRegex(),ui="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",or=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ou=R("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",or).replace("tag",ui).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),jo=R(ir).replace("hr",fs).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ui).getRegex(),Iu=R(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",jo).getRegex(),nr={blockquote:Iu,code:$u,def:Ru,fences:Tu,heading:Su,hr:fs,html:Ou,lheading:Ho,list:Au,newline:Cu,paragraph:jo,table:ts,text:zu},Yr=R("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",fs).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ui).getRegex(),Mu={...nr,lheading:Eu,table:Yr,paragraph:R(ir).replace("hr",fs).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Yr).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ui).getRegex()},Du={...nr,html:R(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",or).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:ts,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:R(ir).replace("hr",fs).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Ho).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Pu=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Lu=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Uo=/^( {2,}|\\)\n(?!\s*$)/,Fu=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,hi=/[\p{P}\p{S}]/u,ar=/[\s\p{P}\p{S}]/u,Vo=/[^\s\p{P}\p{S}]/u,Nu=R(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,ar).getRegex(),Wo=/(?!~)[\p{P}\p{S}]/u,Bu=/(?!~)[\s\p{P}\p{S}]/u,Hu=/(?:[^\s\p{P}\p{S}]|~)/u,ju=R(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",_u?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),qo=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Uu=R(qo,"u").replace(/punct/g,hi).getRegex(),Vu=R(qo,"u").replace(/punct/g,Wo).getRegex(),Yo="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Wu=R(Yo,"gu").replace(/notPunctSpace/g,Vo).replace(/punctSpace/g,ar).replace(/punct/g,hi).getRegex(),qu=R(Yo,"gu").replace(/notPunctSpace/g,Hu).replace(/punctSpace/g,Bu).replace(/punct/g,Wo).getRegex(),Yu=R("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Vo).replace(/punctSpace/g,ar).replace(/punct/g,hi).getRegex(),Ku=R(/\\(punct)/,"gu").replace(/punct/g,hi).getRegex(),Xu=R(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Gu=R(or).replace("(?:-->|$)","-->").getRegex(),Qu=R("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Gu).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Vs=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Zu=R(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Vs).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Ko=R(/^!?\[(label)\]\[(ref)\]/).replace("label",Vs).replace("ref",rr).getRegex(),Xo=R(/^!?\[(ref)\](?:\[\])?/).replace("ref",rr).getRegex(),Ju=R("reflink|nolink(?!\\()","g").replace("reflink",Ko).replace("nolink",Xo).getRegex(),Kr=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,lr={_backpedal:ts,anyPunctuation:Ku,autolink:Xu,blockSkip:ju,br:Uo,code:Lu,del:ts,emStrongLDelim:Uu,emStrongRDelimAst:Wu,emStrongRDelimUnd:Yu,escape:Pu,link:Zu,nolink:Xo,punctuation:Nu,reflink:Ko,reflinkSearch:Ju,tag:Qu,text:Fu,url:ts},eh={...lr,link:R(/^!?\[(label)\]\((.*?)\)/).replace("label",Vs).getRegex(),reflink:R(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Vs).getRegex()},Pi={...lr,emStrongRDelimAst:qu,emStrongLDelim:Vu,url:R(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Kr).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:R(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Kr).getRegex()},th={...Pi,br:R(Uo).replace("{2,}","*").getRegex(),text:R(Pi.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},_s={normal:nr,gfm:Mu,pedantic:Du},Xt={normal:lr,gfm:Pi,breaks:th,pedantic:eh},sh={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Xr=e=>sh[e];function Ke(e,t){if(t){if(ce.escapeTest.test(e))return e.replace(ce.escapeReplace,Xr)}else if(ce.escapeTestNoEncode.test(e))return e.replace(ce.escapeReplaceNoEncode,Xr);return e}function Gr(e){try{e=encodeURI(e).replace(ce.percentDecode,"%")}catch{return null}return e}function Qr(e,t){var o;let s=e.replace(ce.findPipe,(n,a,d)=>{let c=!1,p=a;for(;--p>=0&&d[p]==="\\";)c=!c;return c?"|":" |"}),i=s.split(ce.splitPipe),r=0;if(i[0].trim()||i.shift(),i.length>0&&!((o=i.at(-1))!=null&&o.trim())&&i.pop(),t)if(i.length>t)i.splice(t);else for(;i.length<t;)i.push("");for(;r<i.length;r++)i[r]=i[r].trim().replace(ce.slashPipe,"|");return i}function Gt(e,t,s){let i=e.length;if(i===0)return"";let r=0;for(;r<i&&e.charAt(i-r-1)===t;)r++;return e.slice(0,i-r)}function ih(e,t){if(e.indexOf(t[1])===-1)return-1;let s=0;for(let i=0;i<e.length;i++)if(e[i]==="\\")i++;else if(e[i]===t[0])s++;else if(e[i]===t[1]&&(s--,s<0))return i;return s>0?-2:-1}function Zr(e,t,s,i,r){let o=t.href,n=t.title||null,a=e[1].replace(r.other.outputLinkReplace,"$1");i.state.inLink=!0;let d={type:e[0].charAt(0)==="!"?"image":"link",raw:s,href:o,title:n,text:a,tokens:i.inlineTokens(a)};return i.state.inLink=!1,d}function rh(e,t,s){let i=e.match(s.other.indentCodeCompensation);if(i===null)return t;let r=i[1];return t.split(`
`).map(o=>{let n=o.match(s.other.beginningSpace);if(n===null)return o;let[a]=n;return a.length>=r.length?o.slice(r.length):o}).join(`
`)}var Ws=class{constructor(e){F(this,"options");F(this,"rules");F(this,"lexer");this.options=e||Tt}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let s=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?s:Gt(s,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let s=t[0],i=rh(s,t[3]||"",this.rules);return{type:"code",raw:s,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:i}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let s=t[2].trim();if(this.rules.other.endingHash.test(s)){let i=Gt(s,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(s=i.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:s,tokens:this.lexer.inline(s)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:Gt(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let s=Gt(t[0],`
`).split(`
`),i="",r="",o=[];for(;s.length>0;){let n=!1,a=[],d;for(d=0;d<s.length;d++)if(this.rules.other.blockquoteStart.test(s[d]))a.push(s[d]),n=!0;else if(!n)a.push(s[d]);else break;s=s.slice(d);let c=a.join(`
`),p=c.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${c}`:c,r=r?`${r}
${p}`:p;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,o,!0),this.lexer.state.top=f,s.length===0)break;let b=o.at(-1);if((b==null?void 0:b.type)==="code")break;if((b==null?void 0:b.type)==="blockquote"){let m=b,g=m.raw+`
`+s.join(`
`),v=this.blockquote(g);o[o.length-1]=v,i=i.substring(0,i.length-m.raw.length)+v.raw,r=r.substring(0,r.length-m.text.length)+v.text;break}else if((b==null?void 0:b.type)==="list"){let m=b,g=m.raw+`
`+s.join(`
`),v=this.list(g);o[o.length-1]=v,i=i.substring(0,i.length-b.raw.length)+v.raw,r=r.substring(0,r.length-m.raw.length)+v.raw,s=g.substring(o.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:o,text:r}}}list(e){var s,i;let t=this.rules.block.list.exec(e);if(t){let r=t[1].trim(),o=r.length>1,n={type:"list",raw:"",ordered:o,start:o?+r.slice(0,-1):"",loose:!1,items:[]};r=o?`\\d{1,9}\\${r.slice(-1)}`:`\\${r}`,this.options.pedantic&&(r=o?r:"[*+-]");let a=this.rules.other.listItemRegex(r),d=!1;for(;e;){let p=!1,f="",b="";if(!(t=a.exec(e))||this.rules.block.hr.test(e))break;f=t[0],e=e.substring(f.length);let m=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,_=>" ".repeat(3*_.length)),g=e.split(`
`,1)[0],v=!m.trim(),w=0;if(this.options.pedantic?(w=2,b=m.trimStart()):v?w=t[1].length+1:(w=t[2].search(this.rules.other.nonSpaceChar),w=w>4?1:w,b=m.slice(w),w+=t[1].length),v&&this.rules.other.blankLine.test(g)&&(f+=g+`
`,e=e.substring(g.length+1),p=!0),!p){let _=this.rules.other.nextBulletRegex(w),E=this.rules.other.hrRegex(w),O=this.rules.other.fencesBeginRegex(w),q=this.rules.other.headingBeginRegex(w),j=this.rules.other.htmlBeginRegex(w);for(;e;){let ne=e.split(`
`,1)[0],V;if(g=ne,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),V=g):V=g.replace(this.rules.other.tabCharGlobal,"    "),O.test(g)||q.test(g)||j.test(g)||_.test(g)||E.test(g))break;if(V.search(this.rules.other.nonSpaceChar)>=w||!g.trim())b+=`
`+V.slice(w);else{if(v||m.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||O.test(m)||q.test(m)||E.test(m))break;b+=`
`+g}!v&&!g.trim()&&(v=!0),f+=ne+`
`,e=e.substring(ne.length+1),m=V.slice(w)}}n.loose||(d?n.loose=!0:this.rules.other.doubleBlankLine.test(f)&&(d=!0)),n.items.push({type:"list_item",raw:f,task:!!this.options.gfm&&this.rules.other.listIsTask.test(b),loose:!1,text:b,tokens:[]}),n.raw+=f}let c=n.items.at(-1);if(c)c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd();else return;n.raw=n.raw.trimEnd();for(let p of n.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((s=p.tokens[0])==null?void 0:s.type)==="text"||((i=p.tokens[0])==null?void 0:i.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let b=this.lexer.inlineQueue.length-1;b>=0;b--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[b].src)){this.lexer.inlineQueue[b].src=this.lexer.inlineQueue[b].src.replace(this.rules.other.listReplaceTask,"");break}}let f=this.rules.other.listTaskCheckbox.exec(p.raw);if(f){let b={type:"checkbox",raw:f[0]+" ",checked:f[0]!=="[ ]"};p.checked=b.checked,n.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=b.raw+p.tokens[0].raw,p.tokens[0].text=b.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(b)):p.tokens.unshift({type:"paragraph",raw:b.raw,text:b.raw,tokens:[b]}):p.tokens.unshift(b)}}if(!n.loose){let f=p.tokens.filter(m=>m.type==="space"),b=f.length>0&&f.some(m=>this.rules.other.anyLine.test(m.raw));n.loose=b}}if(n.loose)for(let p of n.items){p.loose=!0;for(let f of p.tokens)f.type==="text"&&(f.type="paragraph")}return n}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let s=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:s,raw:t[0],href:i,title:r}}}table(e){var n;let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let s=Qr(t[1]),i=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=(n=t[3])!=null&&n.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],o={type:"table",raw:t[0],header:[],align:[],rows:[]};if(s.length===i.length){for(let a of i)this.rules.other.tableAlignRight.test(a)?o.align.push("right"):this.rules.other.tableAlignCenter.test(a)?o.align.push("center"):this.rules.other.tableAlignLeft.test(a)?o.align.push("left"):o.align.push(null);for(let a=0;a<s.length;a++)o.header.push({text:s[a],tokens:this.lexer.inline(s[a]),header:!0,align:o.align[a]});for(let a of r)o.rows.push(Qr(a,o.header.length).map((d,c)=>({text:d,tokens:this.lexer.inline(d),header:!1,align:o.align[c]})));return o}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let s=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:s,tokens:this.lexer.inline(s)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let s=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(s)){if(!this.rules.other.endAngleBracket.test(s))return;let o=Gt(s.slice(0,-1),"\\");if((s.length-o.length)%2===0)return}else{let o=ih(t[2],"()");if(o===-2)return;if(o>-1){let n=(t[0].indexOf("!")===0?5:4)+t[1].length+o;t[2]=t[2].substring(0,o),t[0]=t[0].substring(0,n).trim(),t[3]=""}}let i=t[2],r="";if(this.options.pedantic){let o=this.rules.other.pedanticHrefTitle.exec(i);o&&(i=o[1],r=o[3])}else r=t[3]?t[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(s)?i=i.slice(1):i=i.slice(1,-1)),Zr(t,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:r&&r.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let s;if((s=this.rules.inline.reflink.exec(e))||(s=this.rules.inline.nolink.exec(e))){let i=(s[2]||s[1]).replace(this.rules.other.multipleSpaceGlobal," "),r=t[i.toLowerCase()];if(!r){let o=s[0].charAt(0);return{type:"text",raw:o,text:o}}return Zr(s,r,s[0],this.lexer,this.rules)}}emStrong(e,t,s=""){let i=this.rules.inline.emStrongLDelim.exec(e);if(!(!i||i[3]&&s.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[2])||!s||this.rules.inline.punctuation.exec(s))){let r=[...i[0]].length-1,o,n,a=r,d=0,c=i[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(c.lastIndex=0,t=t.slice(-1*e.length+r);(i=c.exec(t))!=null;){if(o=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!o)continue;if(n=[...o].length,i[3]||i[4]){a+=n;continue}else if((i[5]||i[6])&&r%3&&!((r+n)%3)){d+=n;continue}if(a-=n,a>0)continue;n=Math.min(n,n+a+d);let p=[...i[0]][0].length,f=e.slice(0,r+i.index+p+n);if(Math.min(r,n)%2){let m=f.slice(1,-1);return{type:"em",raw:f,text:m,tokens:this.lexer.inlineTokens(m)}}let b=f.slice(2,-2);return{type:"strong",raw:f,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let s=t[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(s),r=this.rules.other.startingSpaceChar.test(s)&&this.rules.other.endingSpaceChar.test(s);return i&&r&&(s=s.substring(1,s.length-1)),{type:"codespan",raw:t[0],text:s}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){let t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let s,i;return t[2]==="@"?(s=t[1],i="mailto:"+s):(s=t[1],i=s),{type:"link",raw:t[0],text:s,href:i,tokens:[{type:"text",raw:s,text:s}]}}}url(e){var s;let t;if(t=this.rules.inline.url.exec(e)){let i,r;if(t[2]==="@")i=t[0],r="mailto:"+i;else{let o;do o=t[0],t[0]=((s=this.rules.inline._backpedal.exec(t[0]))==null?void 0:s[0])??"";while(o!==t[0]);i=t[0],t[1]==="www."?r="http://"+t[0]:r=t[0]}return{type:"link",raw:t[0],text:i,href:r,tokens:[{type:"text",raw:i,text:i}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let s=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:s}}}},ze=class Li{constructor(t){F(this,"tokens");F(this,"options");F(this,"state");F(this,"inlineQueue");F(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||Tt,this.options.tokenizer=this.options.tokenizer||new Ws,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let s={other:ce,block:_s.normal,inline:Xt.normal};this.options.pedantic?(s.block=_s.pedantic,s.inline=Xt.pedantic):this.options.gfm&&(s.block=_s.gfm,this.options.breaks?s.inline=Xt.breaks:s.inline=Xt.gfm),this.tokenizer.rules=s}static get rules(){return{block:_s,inline:Xt}}static lex(t,s){return new Li(s).lex(t)}static lexInline(t,s){return new Li(s).inlineTokens(t)}lex(t){t=t.replace(ce.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let s=0;s<this.inlineQueue.length;s++){let i=this.inlineQueue[s];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,s=[],i=!1){var r,o,n;for(this.options.pedantic&&(t=t.replace(ce.tabCharGlobal,"    ").replace(ce.spaceLine,""));t;){let a;if((o=(r=this.options.extensions)==null?void 0:r.block)!=null&&o.some(c=>(a=c.call({lexer:this},t,s))?(t=t.substring(a.raw.length),s.push(a),!0):!1))continue;if(a=this.tokenizer.space(t)){t=t.substring(a.raw.length);let c=s.at(-1);a.raw.length===1&&c!==void 0?c.raw+=`
`:s.push(a);continue}if(a=this.tokenizer.code(t)){t=t.substring(a.raw.length);let c=s.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.at(-1).src=c.text):s.push(a);continue}if(a=this.tokenizer.fences(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.heading(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.hr(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.blockquote(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.list(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.html(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.def(t)){t=t.substring(a.raw.length);let c=s.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[a.tag]||(this.tokens.links[a.tag]={href:a.href,title:a.title},s.push(a));continue}if(a=this.tokenizer.table(t)){t=t.substring(a.raw.length),s.push(a);continue}if(a=this.tokenizer.lheading(t)){t=t.substring(a.raw.length),s.push(a);continue}let d=t;if((n=this.options.extensions)!=null&&n.startBlock){let c=1/0,p=t.slice(1),f;this.options.extensions.startBlock.forEach(b=>{f=b.call({lexer:this},p),typeof f=="number"&&f>=0&&(c=Math.min(c,f))}),c<1/0&&c>=0&&(d=t.substring(0,c+1))}if(this.state.top&&(a=this.tokenizer.paragraph(d))){let c=s.at(-1);i&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):s.push(a),i=d.length!==t.length,t=t.substring(a.raw.length);continue}if(a=this.tokenizer.text(t)){t=t.substring(a.raw.length);let c=s.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):s.push(a);continue}if(t){let c="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(c);break}else throw new Error(c)}}return this.state.top=!0,s}inline(t,s=[]){return this.inlineQueue.push({src:t,tokens:s}),s}inlineTokens(t,s=[]){var d,c,p,f,b;let i=t,r=null;if(this.tokens.links){let m=Object.keys(this.tokens.links);if(m.length>0)for(;(r=this.tokenizer.rules.inline.reflinkSearch.exec(i))!=null;)m.includes(r[0].slice(r[0].lastIndexOf("[")+1,-1))&&(i=i.slice(0,r.index)+"["+"a".repeat(r[0].length-2)+"]"+i.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(r=this.tokenizer.rules.inline.anyPunctuation.exec(i))!=null;)i=i.slice(0,r.index)+"++"+i.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let o;for(;(r=this.tokenizer.rules.inline.blockSkip.exec(i))!=null;)o=r[2]?r[2].length:0,i=i.slice(0,r.index+o)+"["+"a".repeat(r[0].length-o-2)+"]"+i.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);i=((c=(d=this.options.hooks)==null?void 0:d.emStrongMask)==null?void 0:c.call({lexer:this},i))??i;let n=!1,a="";for(;t;){n||(a=""),n=!1;let m;if((f=(p=this.options.extensions)==null?void 0:p.inline)!=null&&f.some(v=>(m=v.call({lexer:this},t,s))?(t=t.substring(m.raw.length),s.push(m),!0):!1))continue;if(m=this.tokenizer.escape(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.tag(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.link(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(m.raw.length);let v=s.at(-1);m.type==="text"&&(v==null?void 0:v.type)==="text"?(v.raw+=m.raw,v.text+=m.text):s.push(m);continue}if(m=this.tokenizer.emStrong(t,i,a)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.codespan(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.br(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.del(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.autolink(t)){t=t.substring(m.raw.length),s.push(m);continue}if(!this.state.inLink&&(m=this.tokenizer.url(t))){t=t.substring(m.raw.length),s.push(m);continue}let g=t;if((b=this.options.extensions)!=null&&b.startInline){let v=1/0,w=t.slice(1),_;this.options.extensions.startInline.forEach(E=>{_=E.call({lexer:this},w),typeof _=="number"&&_>=0&&(v=Math.min(v,_))}),v<1/0&&v>=0&&(g=t.substring(0,v+1))}if(m=this.tokenizer.inlineText(g)){t=t.substring(m.raw.length),m.raw.slice(-1)!=="_"&&(a=m.raw.slice(-1)),n=!0;let v=s.at(-1);(v==null?void 0:v.type)==="text"?(v.raw+=m.raw,v.text+=m.text):s.push(m);continue}if(t){let v="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(v);break}else throw new Error(v)}}return s}},qs=class{constructor(e){F(this,"options");F(this,"parser");this.options=e||Tt}space(e){return""}code({text:e,lang:t,escaped:s}){var o;let i=(o=(t||"").match(ce.notSpaceStart))==null?void 0:o[0],r=e.replace(ce.endingNewline,"")+`
`;return i?'<pre><code class="language-'+Ke(i)+'">'+(s?r:Ke(r,!0))+`</code></pre>
`:"<pre><code>"+(s?r:Ke(r,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,s=e.start,i="";for(let n=0;n<e.items.length;n++){let a=e.items[n];i+=this.listitem(a)}let r=t?"ol":"ul",o=t&&s!==1?' start="'+s+'"':"";return"<"+r+o+`>
`+i+"</"+r+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",s="";for(let r=0;r<e.header.length;r++)s+=this.tablecell(e.header[r]);t+=this.tablerow({text:s});let i="";for(let r=0;r<e.rows.length;r++){let o=e.rows[r];s="";for(let n=0;n<o.length;n++)s+=this.tablecell(o[n]);i+=this.tablerow({text:s})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+i+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),s=e.header?"th":"td";return(e.align?`<${s} align="${e.align}">`:`<${s}>`)+t+`</${s}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${Ke(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:s}){let i=this.parser.parseInline(s),r=Gr(e);if(r===null)return i;e=r;let o='<a href="'+e+'"';return t&&(o+=' title="'+Ke(t)+'"'),o+=">"+i+"</a>",o}image({href:e,title:t,text:s,tokens:i}){i&&(s=this.parser.parseInline(i,this.parser.textRenderer));let r=Gr(e);if(r===null)return Ke(s);e=r;let o=`<img src="${e}" alt="${s}"`;return t&&(o+=` title="${Ke(t)}"`),o+=">",o}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:Ke(e.text)}},cr=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Re=class Fi{constructor(t){F(this,"options");F(this,"renderer");F(this,"textRenderer");this.options=t||Tt,this.options.renderer=this.options.renderer||new qs,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new cr}static parse(t,s){return new Fi(s).parse(t)}static parseInline(t,s){return new Fi(s).parseInline(t)}parse(t){var i,r;let s="";for(let o=0;o<t.length;o++){let n=t[o];if((r=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&r[n.type]){let d=n,c=this.options.extensions.renderers[d.type].call({parser:this},d);if(c!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(d.type)){s+=c||"";continue}}let a=n;switch(a.type){case"space":{s+=this.renderer.space(a);break}case"hr":{s+=this.renderer.hr(a);break}case"heading":{s+=this.renderer.heading(a);break}case"code":{s+=this.renderer.code(a);break}case"table":{s+=this.renderer.table(a);break}case"blockquote":{s+=this.renderer.blockquote(a);break}case"list":{s+=this.renderer.list(a);break}case"checkbox":{s+=this.renderer.checkbox(a);break}case"html":{s+=this.renderer.html(a);break}case"def":{s+=this.renderer.def(a);break}case"paragraph":{s+=this.renderer.paragraph(a);break}case"text":{s+=this.renderer.text(a);break}default:{let d='Token with "'+a.type+'" type was not found.';if(this.options.silent)return console.error(d),"";throw new Error(d)}}}return s}parseInline(t,s=this.renderer){var r,o;let i="";for(let n=0;n<t.length;n++){let a=t[n];if((o=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&o[a.type]){let c=this.options.extensions.renderers[a.type].call({parser:this},a);if(c!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(a.type)){i+=c||"";continue}}let d=a;switch(d.type){case"escape":{i+=s.text(d);break}case"html":{i+=s.html(d);break}case"link":{i+=s.link(d);break}case"image":{i+=s.image(d);break}case"checkbox":{i+=s.checkbox(d);break}case"strong":{i+=s.strong(d);break}case"em":{i+=s.em(d);break}case"codespan":{i+=s.codespan(d);break}case"br":{i+=s.br(d);break}case"del":{i+=s.del(d);break}case"text":{i+=s.text(d);break}default:{let c='Token with "'+d.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return i}},Cs,Qt=(Cs=class{constructor(e){F(this,"options");F(this,"block");this.options=e||Tt}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?ze.lex:ze.lexInline}provideParser(){return this.block?Re.parse:Re.parseInline}},F(Cs,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),F(Cs,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),Cs),oh=class{constructor(...e){F(this,"defaults",tr());F(this,"options",this.setOptions);F(this,"parse",this.parseMarkdown(!0));F(this,"parseInline",this.parseMarkdown(!1));F(this,"Parser",Re);F(this,"Renderer",qs);F(this,"TextRenderer",cr);F(this,"Lexer",ze);F(this,"Tokenizer",Ws);F(this,"Hooks",Qt);this.use(...e)}walkTokens(e,t){var i,r;let s=[];for(let o of e)switch(s=s.concat(t.call(this,o)),o.type){case"table":{let n=o;for(let a of n.header)s=s.concat(this.walkTokens(a.tokens,t));for(let a of n.rows)for(let d of a)s=s.concat(this.walkTokens(d.tokens,t));break}case"list":{let n=o;s=s.concat(this.walkTokens(n.items,t));break}default:{let n=o;(r=(i=this.defaults.extensions)==null?void 0:i.childTokens)!=null&&r[n.type]?this.defaults.extensions.childTokens[n.type].forEach(a=>{let d=n[a].flat(1/0);s=s.concat(this.walkTokens(d,t))}):n.tokens&&(s=s.concat(this.walkTokens(n.tokens,t)))}}return s}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(s=>{let i={...s};if(i.async=this.defaults.async||i.async||!1,s.extensions&&(s.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){let o=t.renderers[r.name];o?t.renderers[r.name]=function(...n){let a=r.renderer.apply(this,n);return a===!1&&(a=o.apply(this,n)),a}:t.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let o=t[r.level];o?o.unshift(r.tokenizer):t[r.level]=[r.tokenizer],r.start&&(r.level==="block"?t.startBlock?t.startBlock.push(r.start):t.startBlock=[r.start]:r.level==="inline"&&(t.startInline?t.startInline.push(r.start):t.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(t.childTokens[r.name]=r.childTokens)}),i.extensions=t),s.renderer){let r=this.defaults.renderer||new qs(this.defaults);for(let o in s.renderer){if(!(o in r))throw new Error(`renderer '${o}' does not exist`);if(["options","parser"].includes(o))continue;let n=o,a=s.renderer[n],d=r[n];r[n]=(...c)=>{let p=a.apply(r,c);return p===!1&&(p=d.apply(r,c)),p||""}}i.renderer=r}if(s.tokenizer){let r=this.defaults.tokenizer||new Ws(this.defaults);for(let o in s.tokenizer){if(!(o in r))throw new Error(`tokenizer '${o}' does not exist`);if(["options","rules","lexer"].includes(o))continue;let n=o,a=s.tokenizer[n],d=r[n];r[n]=(...c)=>{let p=a.apply(r,c);return p===!1&&(p=d.apply(r,c)),p}}i.tokenizer=r}if(s.hooks){let r=this.defaults.hooks||new Qt;for(let o in s.hooks){if(!(o in r))throw new Error(`hook '${o}' does not exist`);if(["options","block"].includes(o))continue;let n=o,a=s.hooks[n],d=r[n];Qt.passThroughHooks.has(o)?r[n]=c=>{if(this.defaults.async&&Qt.passThroughHooksRespectAsync.has(o))return(async()=>{let f=await a.call(r,c);return d.call(r,f)})();let p=a.call(r,c);return d.call(r,p)}:r[n]=(...c)=>{if(this.defaults.async)return(async()=>{let f=await a.apply(r,c);return f===!1&&(f=await d.apply(r,c)),f})();let p=a.apply(r,c);return p===!1&&(p=d.apply(r,c)),p}}i.hooks=r}if(s.walkTokens){let r=this.defaults.walkTokens,o=s.walkTokens;i.walkTokens=function(n){let a=[];return a.push(o.call(this,n)),r&&(a=a.concat(r.call(this,n))),a}}this.defaults={...this.defaults,...i}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return ze.lex(e,t??this.defaults)}parser(e,t){return Re.parse(e,t??this.defaults)}parseMarkdown(e){return(t,s)=>{let i={...s},r={...this.defaults,...i},o=this.onError(!!r.silent,!!r.async);if(this.defaults.async===!0&&i.async===!1)return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return o(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return o(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));if(r.hooks&&(r.hooks.options=r,r.hooks.block=e),r.async)return(async()=>{let n=r.hooks?await r.hooks.preprocess(t):t,a=await(r.hooks?await r.hooks.provideLexer():e?ze.lex:ze.lexInline)(n,r),d=r.hooks?await r.hooks.processAllTokens(a):a;r.walkTokens&&await Promise.all(this.walkTokens(d,r.walkTokens));let c=await(r.hooks?await r.hooks.provideParser():e?Re.parse:Re.parseInline)(d,r);return r.hooks?await r.hooks.postprocess(c):c})().catch(o);try{r.hooks&&(t=r.hooks.preprocess(t));let n=(r.hooks?r.hooks.provideLexer():e?ze.lex:ze.lexInline)(t,r);r.hooks&&(n=r.hooks.processAllTokens(n)),r.walkTokens&&this.walkTokens(n,r.walkTokens);let a=(r.hooks?r.hooks.provideParser():e?Re.parse:Re.parseInline)(n,r);return r.hooks&&(a=r.hooks.postprocess(a)),a}catch(n){return o(n)}}}onError(e,t){return s=>{if(s.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let i="<p>An error occurred:</p><pre>"+Ke(s.message+"",!0)+"</pre>";return t?Promise.resolve(i):i}if(t)return Promise.reject(s);throw s}}},_t=new oh;function M(e,t){return _t.parse(e,t)}M.options=M.setOptions=function(e){return _t.setOptions(e),M.defaults=_t.defaults,No(M.defaults),M};M.getDefaults=tr;M.defaults=Tt;M.use=function(...e){return _t.use(...e),M.defaults=_t.defaults,No(M.defaults),M};M.walkTokens=function(e,t){return _t.walkTokens(e,t)};M.parseInline=_t.parseInline;M.Parser=Re;M.parser=Re.parse;M.Renderer=qs;M.TextRenderer=cr;M.Lexer=ze;M.lexer=ze.lex;M.Tokenizer=Ws;M.Hooks=Qt;M.parse=M;M.options;M.setOptions;M.use;M.walkTokens;M.parseInline;Re.parse;ze.lex;var nh=Object.defineProperty,ah=Object.getOwnPropertyDescriptor,Bt=(e,t,s,i)=>{for(var r=i>1?void 0:i?ah(t,s):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(r=(i?n(t,s,r):n(r))||r);return i&&r&&nh(t,s,r),r};let ht=class extends he{constructor(){super(...arguments),this.epicId="",this.loading=!1,this.error="",this.content=null,this.renderedHtml="",this.previousEpicId=""}connectedCallback(){super.connectedCallback(),this.epicId&&this.loadContext()}updated(e){e.has("epicId")&&this.epicId!==this.previousEpicId&&(this.previousEpicId=this.epicId,this.loadContext())}async loadContext(){if(!this.epicId){this.content=null,this.renderedHtml="";return}this.loading=!0,this.error="";try{this.content=await wc(this.epicId),this.content?this.renderedHtml=await M.parse(this.content):this.renderedHtml=""}catch(e){console.error("Failed to load context:",e),this.error=e instanceof Error?e.message:"Failed to load context",this.content=null,this.renderedHtml=""}finally{this.loading=!1}}refresh(){this.loadContext()}render(){return this.loading?h`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading context...</span>
        </div>
      `:this.error?h`<div class="error">${this.error}</div>`:this.epicId?this.content===null?h`<div class="empty">No context available</div>`:h`
      <div class="markdown-container">
        <div class="markdown-content">
          ${Xi(this.renderedHtml)}
        </div>
      </div>
    `:h`<div class="empty">No epic selected</div>`}};ht.styles=$`
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
  `;Bt([u({type:String})],ht.prototype,"epicId",2);Bt([k()],ht.prototype,"loading",2);Bt([k()],ht.prototype,"error",2);Bt([k()],ht.prototype,"content",2);Bt([k()],ht.prototype,"renderedHtml",2);ht=Bt([be("context-pane")],ht);$i("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var s;((s=t.data)==null?void 0:s.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
