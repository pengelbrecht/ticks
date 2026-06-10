import{i as $,n as c,a as $e,b as h,r as y,E as vt,A as w,e as x,u as Ao,t as Le}from"./ticks-logo-DYgrblNn.js";var la=$`
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
`;const Ji=new Set,yt=new Map;let ct,ho="ltr",po="en";const fs=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(fs){const e=new MutationObserver(bs);ho=document.documentElement.dir||"ltr",po=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function ms(...e){e.map(t=>{const i=t.$code.toLowerCase();yt.has(i)?yt.set(i,Object.assign(Object.assign({},yt.get(i)),t)):yt.set(i,t),ct||(ct=t)}),bs()}function bs(){fs&&(ho=document.documentElement.dir||"ltr",po=document.documentElement.lang||navigator.language),[...Ji.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let ca=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){Ji.add(this.host)}hostDisconnected(){Ji.delete(this.host)}dir(){return`${this.host.dir||ho}`.toLowerCase()}lang(){return`${this.host.lang||po}`.toLowerCase()}getTranslationData(t){var i,o;const s=new Intl.Locale(t.replace(/_/g,"-")),a=s==null?void 0:s.language.toLowerCase(),r=(o=(i=s==null?void 0:s.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&o!==void 0?o:"",l=yt.get(`${a}-${r}`),d=yt.get(a);return{locale:s,language:a,region:r,primary:l,secondary:d}}exists(t,i){var o;const{primary:s,secondary:a}=this.getTranslationData((o=i.lang)!==null&&o!==void 0?o:this.lang());return i=Object.assign({includeFallback:!1},i),!!(s&&s[t]||a&&a[t]||i.includeFallback&&ct&&ct[t])}term(t,...i){const{primary:o,secondary:s}=this.getTranslationData(this.lang());let a;if(o&&o[t])a=o[t];else if(s&&s[t])a=s[t];else if(ct&&ct[t])a=ct[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof a=="function"?a(...i):a}date(t,i){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),i).format(t)}number(t,i){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),i).format(t)}relativeTime(t,i,o){return new Intl.RelativeTimeFormat(this.lang(),o).format(t,i)}};var gs={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};ms(gs);var da=gs,ie=class extends ca{};ms(da);var F=$`
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
`,vs=Object.defineProperty,ua=Object.defineProperties,ha=Object.getOwnPropertyDescriptor,pa=Object.getOwnPropertyDescriptors,Oo=Object.getOwnPropertySymbols,fa=Object.prototype.hasOwnProperty,ma=Object.prototype.propertyIsEnumerable,ji=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),fo=e=>{throw TypeError(e)},zo=(e,t,i)=>t in e?vs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,Ue=(e,t)=>{for(var i in t||(t={}))fa.call(t,i)&&zo(e,i,t[i]);if(Oo)for(var i of Oo(t))ma.call(t,i)&&zo(e,i,t[i]);return e},Ut=(e,t)=>ua(e,pa(t)),n=(e,t,i,o)=>{for(var s=o>1?void 0:o?ha(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&vs(t,i,s),s},ys=(e,t,i)=>t.has(e)||fo("Cannot "+i),ba=(e,t,i)=>(ys(e,t,"read from private field"),t.get(e)),ga=(e,t,i)=>t.has(e)?fo("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),va=(e,t,i,o)=>(ys(e,t,"write to private field"),t.set(e,i),i),ya=function(e,t){this[0]=e,this[1]=t},wa=e=>{var t=e[ji("asyncIterator")],i=!1,o,s={};return t==null?(t=e[ji("iterator")](),o=a=>s[a]=r=>t[a](r)):(t=t.call(e),o=a=>s[a]=r=>{if(i){if(i=!1,a==="throw")throw r;return r}return i=!0,{done:!1,value:new ya(new Promise(l=>{var d=t[a](r);d instanceof Object||fo("Object expected"),l(d)}),1)}}),s[ji("iterator")]=()=>s,o("next"),"throw"in t?o("throw"):s.throw=a=>{throw a},"return"in t&&o("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ka(e){return(t,i)=>{const o=typeof t=="function"?t:t[i];Object.assign(o,e)}}var ni,M=class extends $e{constructor(){super(),ga(this,ni,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const i=new CustomEvent(e,Ue({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(i),i}static define(e,t=this,i={}){const o=customElements.get(e);if(!o){try{customElements.define(e,t,i)}catch{customElements.define(e,class extends t{},i)}return}let s=" (unknown version)",a=s;"version"in t&&t.version&&(s=" v"+t.version),"version"in o&&o.version&&(a=" v"+o.version),!(s&&a&&s===a)&&console.warn(`Attempted to register <${e}>${s}, but <${e}>${a} has already been registered.`)}attributeChangedCallback(e,t,i){ba(this,ni)||(this.constructor.elementProperties.forEach((o,s)=>{o.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),va(this,ni,!0)),super.attributeChangedCallback(e,t,i)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,i)=>{e.has(i)&&this[i]==null&&(this[i]=t)})}};ni=new WeakMap;M.version="2.20.1";M.dependencies={};n([c()],M.prototype,"dir",2);n([c()],M.prototype,"lang",2);var $i=class extends M{constructor(){super(...arguments),this.localize=new ie(this)}render(){return h`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};$i.styles=[F,la];var At=new WeakMap,Ot=new WeakMap,zt=new WeakMap,Vi=new WeakSet,ei=new WeakMap,qt=class{constructor(e,t){this.handleFormData=i=>{const o=this.options.disabled(this.host),s=this.options.name(this.host),a=this.options.value(this.host),r=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!o&&!r&&typeof s=="string"&&s.length>0&&typeof a<"u"&&(Array.isArray(a)?a.forEach(l=>{i.formData.append(s,l.toString())}):i.formData.append(s,a.toString()))},this.handleFormSubmit=i=>{var o;const s=this.options.disabled(this.host),a=this.options.reportValidity;this.form&&!this.form.noValidate&&((o=At.get(this.form))==null||o.forEach(r=>{this.setUserInteracted(r,!0)})),this.form&&!this.form.noValidate&&!s&&!a(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),ei.set(this.host,[])},this.handleInteraction=i=>{const o=ei.get(this.host);o.includes(i.type)||o.push(i.type),o.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.checkValidity=="function"&&!o.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.reportValidity=="function"&&!o.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=Ue({form:i=>{const o=i.form;if(o){const a=i.getRootNode().querySelector(`#${o}`);if(a)return a}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var o;return(o=i.disabled)!=null?o:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,o)=>i.value=o,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),ei.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),ei.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,At.has(this.form)?At.get(this.form).add(this.host):At.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Ot.has(this.form)||(Ot.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),zt.has(this.form)||(zt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=At.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Ot.has(this.form)&&(this.form.reportValidity=Ot.get(this.form),Ot.delete(this.form)),zt.has(this.form)&&(this.form.checkValidity=zt.get(this.form),zt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?Vi.add(e):Vi.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const i=document.createElement("button");i.type=e,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",t&&(i.name=t.name,i.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(o=>{t.hasAttribute(o)&&i.setAttribute(o,t.getAttribute(o))})),this.form.append(i),i.click(),i.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,i=!!Vi.has(t),o=!!t.required;t.toggleAttribute("data-required",o),t.toggleAttribute("data-optional",!o),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&i),t.toggleAttribute("data-user-valid",e&&i)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},mo=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(Ut(Ue({},mo),{valid:!1,valueMissing:!0}));Object.freeze(Ut(Ue({},mo),{valid:!1,customError:!0}));var xa=$`
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
`,qe=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=i=>{const o=i.target;(this.slotNames.includes("[default]")&&!o.name||o.name&&this.slotNames.includes(o.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function _a(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let i="";return[...t].forEach(o=>{o.nodeType===Node.TEXT_NODE&&(i+=o.textContent)}),i}var Zi="";function eo(e){Zi=e}function Ca(e=""){if(!Zi){const t=[...document.getElementsByTagName("script")],i=t.find(o=>o.hasAttribute("data-shoelace"));if(i)eo(i.getAttribute("data-shoelace"));else{const o=t.find(a=>/shoelace(\.min)?\.js($|\?)/.test(a.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(a.src));let s="";o&&(s=o.getAttribute("src")),eo(s.split("/").slice(0,-1).join("/"))}}return Zi.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var $a={name:"default",resolver:e=>Ca(`assets/icons/${e}.svg`)},Ta=$a,Mo={caret:`
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
  `},Sa={name:"system",resolver:e=>e in Mo?`data:image/svg+xml,${encodeURIComponent(Mo[e])}`:""},Ea=Sa,Da=[Ta,Ea],to=[];function Aa(e){to.push(e)}function Oa(e){to=to.filter(t=>t!==e)}function Po(e){return Da.find(t=>t.name===e)}var za=$`
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
`;function T(e,t){const i=Ue({waitUntilFirstUpdate:!1},t);return(o,s)=>{const{update:a}=o,r=Array.isArray(e)?e:[e];o.update=function(l){r.forEach(d=>{const u=d;if(l.has(u)){const p=l.get(u),f=this[u];p!==f&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[s](p,f)}}),a.call(this,l)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ma=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,ws=e=>e.strings===void 0,Pa={},La=(e,t=Pa)=>e._$AH=t;var Mt=Symbol(),ti=Symbol(),Wi,Ui=new Map,G=class extends M{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var i;let o;if(t!=null&&t.spriteSheet)return this.svg=h`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(o=await fetch(e,{mode:"cors"}),!o.ok)return o.status===410?Mt:ti}catch{return ti}try{const s=document.createElement("div");s.innerHTML=await o.text();const a=s.firstElementChild;if(((i=a==null?void 0:a.tagName)==null?void 0:i.toLowerCase())!=="svg")return Mt;Wi||(Wi=new DOMParser);const l=Wi.parseFromString(a.outerHTML,"text/html").body.querySelector("svg");return l?(l.part.add("svg"),document.adoptNode(l)):Mt}catch{return Mt}}connectedCallback(){super.connectedCallback(),Aa(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Oa(this)}getIconSource(){const e=Po(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:i}=this.getIconSource(),o=i?Po(this.library):void 0;if(!t){this.svg=null;return}let s=Ui.get(t);if(s||(s=this.resolveIcon(t,o),Ui.set(t,s)),!this.initialRender)return;const a=await s;if(a===ti&&Ui.delete(t),t===this.getIconSource().url){if(Ma(a)){if(this.svg=a,o){await this.updateComplete;const r=this.shadowRoot.querySelector("[part='svg']");typeof o.mutator=="function"&&r&&o.mutator(r)}return}switch(a){case ti:case Mt:this.svg=null,this.emit("sl-error");break;default:this.svg=a.cloneNode(!0),(e=o==null?void 0:o.mutator)==null||e.call(o,this.svg),this.emit("sl-load")}}}render(){return this.svg}};G.styles=[F,za];n([y()],G.prototype,"svg",2);n([c({reflect:!0})],G.prototype,"name",2);n([c()],G.prototype,"src",2);n([c()],G.prototype,"label",2);n([c({reflect:!0})],G.prototype,"library",2);n([T("label")],G.prototype,"handleLabelChange",1);n([T(["name","src","library"])],G.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const He={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ti=e=>(...t)=>({_$litDirective$:e,values:t});let Si=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,o){this._$Ct=t,this._$AM=i,this._$Ci=o}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const z=Ti(class extends Si{constructor(e){var t;if(super(e),e.type!==He.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var o,s;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(a=>a!=="")));for(const a in t)t[a]&&!((o=this.nt)!=null&&o.has(a))&&this.st.add(a);return this.render(t)}const i=e.element.classList;for(const a of this.st)a in t||(i.remove(a),this.st.delete(a));for(const a in t){const r=!!t[a];r===this.st.has(a)||(s=this.nt)!=null&&s.has(a)||(r?(i.add(a),this.st.add(a)):(i.remove(a),this.st.delete(a)))}return vt}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ks=Symbol.for(""),Ia=e=>{if((e==null?void 0:e.r)===ks)return e==null?void 0:e._$litStatic$},hi=(e,...t)=>({_$litStatic$:t.reduce((i,o,s)=>i+(a=>{if(a._$litStatic$!==void 0)return a._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${a}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(o)+e[s+1],e[0]),r:ks}),Lo=new Map,Ra=e=>(t,...i)=>{const o=i.length;let s,a;const r=[],l=[];let d,u=0,p=!1;for(;u<o;){for(d=t[u];u<o&&(a=i[u],(s=Ia(a))!==void 0);)d+=s+t[++u],p=!0;u!==o&&l.push(a),r.push(d),u++}if(u===o&&r.push(t[o]),p){const f=r.join("$$lit$$");(t=Lo.get(f))===void 0&&(r.raw=r,Lo.set(f,t=r)),i=l}return e(t,...i)},li=Ra(h);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const k=e=>e??w;var P=class extends M{constructor(){super(...arguments),this.formControlController=new qt(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new qe(this,"[default]","prefix","suffix"),this.localize=new ie(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:mo}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?hi`a`:hi`button`;return li`
      <${t}
        part="base"
        class=${z({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${k(e?void 0:this.disabled)}
        type=${k(e?void 0:this.type)}
        title=${this.title}
        name=${k(e?void 0:this.name)}
        value=${k(e?void 0:this.value)}
        href=${k(e&&!this.disabled?this.href:void 0)}
        target=${k(e?this.target:void 0)}
        download=${k(e?this.download:void 0)}
        rel=${k(e?this.rel:void 0)}
        role=${k(e?void 0:"button")}
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
        ${this.caret?li` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?li`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};P.styles=[F,xa];P.dependencies={"sl-icon":G,"sl-spinner":$i};n([x(".button")],P.prototype,"button",2);n([y()],P.prototype,"hasFocus",2);n([y()],P.prototype,"invalid",2);n([c()],P.prototype,"title",2);n([c({reflect:!0})],P.prototype,"variant",2);n([c({reflect:!0})],P.prototype,"size",2);n([c({type:Boolean,reflect:!0})],P.prototype,"caret",2);n([c({type:Boolean,reflect:!0})],P.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],P.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],P.prototype,"outline",2);n([c({type:Boolean,reflect:!0})],P.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],P.prototype,"circle",2);n([c()],P.prototype,"type",2);n([c()],P.prototype,"name",2);n([c()],P.prototype,"value",2);n([c()],P.prototype,"href",2);n([c()],P.prototype,"target",2);n([c()],P.prototype,"rel",2);n([c()],P.prototype,"download",2);n([c()],P.prototype,"form",2);n([c({attribute:"formaction"})],P.prototype,"formAction",2);n([c({attribute:"formenctype"})],P.prototype,"formEnctype",2);n([c({attribute:"formmethod"})],P.prototype,"formMethod",2);n([c({attribute:"formnovalidate",type:Boolean})],P.prototype,"formNoValidate",2);n([c({attribute:"formtarget"})],P.prototype,"formTarget",2);n([T("disabled",{waitUntilFirstUpdate:!0})],P.prototype,"handleDisabledChange",1);P.define("sl-button");var Fa=$`
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
`,bo=(e="value")=>(t,i)=>{const o=t.constructor,s=o.prototype.attributeChangedCallback;o.prototype.attributeChangedCallback=function(a,r,l){var d;const u=o.getPropertyOptions(e),p=typeof u.attribute=="string"?u.attribute:e;if(a===p){const f=u.converter||Ao,m=(typeof f=="function"?f:(d=f==null?void 0:f.fromAttribute)!=null?d:Ao.fromAttribute)(l,u.type);this[e]!==m&&(this[i]=m)}s.call(this,a,r,l)}},Ei=$`
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
 */const pi=Ti(class extends Si{constructor(e){if(super(e),e.type!==He.PROPERTY&&e.type!==He.ATTRIBUTE&&e.type!==He.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!ws(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===vt||t===w)return t;const i=e.element,o=e.name;if(e.type===He.PROPERTY){if(t===i[o])return vt}else if(e.type===He.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(o))return vt}else if(e.type===He.ATTRIBUTE&&i.getAttribute(o)===t+"")return vt;return La(e),t}});var _=class extends M{constructor(){super(...arguments),this.formControlController=new qt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.localize=new ie(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,o="preserve"){const s=t??this.input.selectionStart,a=i??this.input.selectionEnd;this.input.setRangeText(e,s,a,o),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t,a=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return h`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
            class=${z({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              name=${k(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${k(this.placeholder)}
              minlength=${k(this.minlength)}
              maxlength=${k(this.maxlength)}
              min=${k(this.min)}
              max=${k(this.max)}
              step=${k(this.step)}
              .value=${pi(this.value)}
              autocapitalize=${k(this.autocapitalize)}
              autocomplete=${k(this.autocomplete)}
              autocorrect=${k(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${k(this.pattern)}
              enterkeyhint=${k(this.enterkeyhint)}
              inputmode=${k(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${a?h`
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};_.styles=[F,Ei,Fa];_.dependencies={"sl-icon":G};n([x(".input__control")],_.prototype,"input",2);n([y()],_.prototype,"hasFocus",2);n([c()],_.prototype,"title",2);n([c({reflect:!0})],_.prototype,"type",2);n([c()],_.prototype,"name",2);n([c()],_.prototype,"value",2);n([bo()],_.prototype,"defaultValue",2);n([c({reflect:!0})],_.prototype,"size",2);n([c({type:Boolean,reflect:!0})],_.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],_.prototype,"pill",2);n([c()],_.prototype,"label",2);n([c({attribute:"help-text"})],_.prototype,"helpText",2);n([c({type:Boolean})],_.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],_.prototype,"disabled",2);n([c()],_.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],_.prototype,"readonly",2);n([c({attribute:"password-toggle",type:Boolean})],_.prototype,"passwordToggle",2);n([c({attribute:"password-visible",type:Boolean})],_.prototype,"passwordVisible",2);n([c({attribute:"no-spin-buttons",type:Boolean})],_.prototype,"noSpinButtons",2);n([c({reflect:!0})],_.prototype,"form",2);n([c({type:Boolean,reflect:!0})],_.prototype,"required",2);n([c()],_.prototype,"pattern",2);n([c({type:Number})],_.prototype,"minlength",2);n([c({type:Number})],_.prototype,"maxlength",2);n([c()],_.prototype,"min",2);n([c()],_.prototype,"max",2);n([c()],_.prototype,"step",2);n([c()],_.prototype,"autocapitalize",2);n([c()],_.prototype,"autocorrect",2);n([c()],_.prototype,"autocomplete",2);n([c({type:Boolean})],_.prototype,"autofocus",2);n([c()],_.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],_.prototype,"spellcheck",2);n([c()],_.prototype,"inputmode",2);n([T("disabled",{waitUntilFirstUpdate:!0})],_.prototype,"handleDisabledChange",1);n([T("step",{waitUntilFirstUpdate:!0})],_.prototype,"handleStepChange",1);n([T("value",{waitUntilFirstUpdate:!0})],_.prototype,"handleValueChange",1);_.define("sl-input");var Na=$`
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
`,Ba=$`
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
`,V=class extends M{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?hi`a`:hi`button`;return li`
      <${t}
        part="base"
        class=${z({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${k(e?void 0:this.disabled)}
        type=${k(e?void 0:"button")}
        href=${k(e?this.href:void 0)}
        target=${k(e?this.target:void 0)}
        download=${k(e?this.download:void 0)}
        rel=${k(e&&this.target?"noreferrer noopener":void 0)}
        role=${k(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${k(this.name)}
          library=${k(this.library)}
          src=${k(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${t}>
    `}};V.styles=[F,Ba];V.dependencies={"sl-icon":G};n([x(".icon-button")],V.prototype,"button",2);n([y()],V.prototype,"hasFocus",2);n([c()],V.prototype,"name",2);n([c()],V.prototype,"library",2);n([c()],V.prototype,"src",2);n([c()],V.prototype,"href",2);n([c()],V.prototype,"target",2);n([c()],V.prototype,"download",2);n([c()],V.prototype,"label",2);n([c({type:Boolean,reflect:!0})],V.prototype,"disabled",2);var ft=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return h`
      <span
        part="base"
        class=${z({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
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
    `}};ft.styles=[F,Na];ft.dependencies={"sl-icon-button":V};n([c({reflect:!0})],ft.prototype,"variant",2);n([c({reflect:!0})],ft.prototype,"size",2);n([c({type:Boolean,reflect:!0})],ft.prototype,"pill",2);n([c({type:Boolean})],ft.prototype,"removable",2);var Ha=$`
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
`;function ja(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var io=new Set;function Va(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function Wa(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Rt(e){if(io.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=Va()+Wa();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),t<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function Ft(e){io.delete(e),io.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function oo(e,t,i="vertical",o="smooth"){const s=ja(e,t),a=s.top+t.scrollTop,r=s.left+t.scrollLeft,l=t.scrollLeft,d=t.scrollLeft+t.offsetWidth,u=t.scrollTop,p=t.scrollTop+t.offsetHeight;(i==="horizontal"||i==="both")&&(r<l?t.scrollTo({left:r,behavior:o}):r+e.clientWidth>d&&t.scrollTo({left:r-t.offsetWidth+e.clientWidth,behavior:o})),(i==="vertical"||i==="both")&&(a<u?t.scrollTo({top:a,behavior:o}):a+e.clientHeight>p&&t.scrollTo({top:a-t.offsetHeight+e.clientHeight,behavior:o}))}var Ua=$`
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
`;const Je=Math.min,ce=Math.max,fi=Math.round,ii=Math.floor,Oe=e=>({x:e,y:e}),qa={left:"right",right:"left",bottom:"top",top:"bottom"},Ya={start:"end",end:"start"};function so(e,t,i){return ce(e,Je(t,i))}function Ct(e,t){return typeof e=="function"?e(t):e}function Ze(e){return e.split("-")[0]}function $t(e){return e.split("-")[1]}function xs(e){return e==="x"?"y":"x"}function go(e){return e==="y"?"height":"width"}const Ka=new Set(["top","bottom"]);function je(e){return Ka.has(Ze(e))?"y":"x"}function vo(e){return xs(je(e))}function Ga(e,t,i){i===void 0&&(i=!1);const o=$t(e),s=vo(e),a=go(s);let r=s==="x"?o===(i?"end":"start")?"right":"left":o==="start"?"bottom":"top";return t.reference[a]>t.floating[a]&&(r=mi(r)),[r,mi(r)]}function Xa(e){const t=mi(e);return[ao(e),t,ao(t)]}function ao(e){return e.replace(/start|end/g,t=>Ya[t])}const Io=["left","right"],Ro=["right","left"],Qa=["top","bottom"],Ja=["bottom","top"];function Za(e,t,i){switch(e){case"top":case"bottom":return i?t?Ro:Io:t?Io:Ro;case"left":case"right":return t?Qa:Ja;default:return[]}}function er(e,t,i,o){const s=$t(e);let a=Za(Ze(e),i==="start",o);return s&&(a=a.map(r=>r+"-"+s),t&&(a=a.concat(a.map(ao)))),a}function mi(e){return e.replace(/left|right|bottom|top/g,t=>qa[t])}function tr(e){return{top:0,right:0,bottom:0,left:0,...e}}function _s(e){return typeof e!="number"?tr(e):{top:e,right:e,bottom:e,left:e}}function bi(e){const{x:t,y:i,width:o,height:s}=e;return{width:o,height:s,top:i,left:t,right:t+o,bottom:i+s,x:t,y:i}}function Fo(e,t,i){let{reference:o,floating:s}=e;const a=je(t),r=vo(t),l=go(r),d=Ze(t),u=a==="y",p=o.x+o.width/2-s.width/2,f=o.y+o.height/2-s.height/2,g=o[l]/2-s[l]/2;let m;switch(d){case"top":m={x:p,y:o.y-s.height};break;case"bottom":m={x:p,y:o.y+o.height};break;case"right":m={x:o.x+o.width,y:f};break;case"left":m={x:o.x-s.width,y:f};break;default:m={x:o.x,y:o.y}}switch($t(t)){case"start":m[r]-=g*(i&&u?-1:1);break;case"end":m[r]+=g*(i&&u?-1:1);break}return m}const ir=async(e,t,i)=>{const{placement:o="bottom",strategy:s="absolute",middleware:a=[],platform:r}=i,l=a.filter(Boolean),d=await(r.isRTL==null?void 0:r.isRTL(t));let u=await r.getElementRects({reference:e,floating:t,strategy:s}),{x:p,y:f}=Fo(u,o,d),g=o,m={},b=0;for(let v=0;v<l.length;v++){const{name:C,fn:S}=l[v],{x:A,y:I,data:W,reset:N}=await S({x:p,y:f,initialPlacement:o,placement:g,strategy:s,middlewareData:m,rects:u,platform:r,elements:{reference:e,floating:t}});p=A??p,f=I??f,m={...m,[C]:{...m[C],...W}},N&&b<=50&&(b++,typeof N=="object"&&(N.placement&&(g=N.placement),N.rects&&(u=N.rects===!0?await r.getElementRects({reference:e,floating:t,strategy:s}):N.rects),{x:p,y:f}=Fo(u,g,d)),v=-1)}return{x:p,y:f,placement:g,strategy:s,middlewareData:m}};async function yo(e,t){var i;t===void 0&&(t={});const{x:o,y:s,platform:a,rects:r,elements:l,strategy:d}=e,{boundary:u="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:g=!1,padding:m=0}=Ct(t,e),b=_s(m),C=l[g?f==="floating"?"reference":"floating":f],S=bi(await a.getClippingRect({element:(i=await(a.isElement==null?void 0:a.isElement(C)))==null||i?C:C.contextElement||await(a.getDocumentElement==null?void 0:a.getDocumentElement(l.floating)),boundary:u,rootBoundary:p,strategy:d})),A=f==="floating"?{x:o,y:s,width:r.floating.width,height:r.floating.height}:r.reference,I=await(a.getOffsetParent==null?void 0:a.getOffsetParent(l.floating)),W=await(a.isElement==null?void 0:a.isElement(I))?await(a.getScale==null?void 0:a.getScale(I))||{x:1,y:1}:{x:1,y:1},N=bi(a.convertOffsetParentRelativeRectToViewportRelativeRect?await a.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:A,offsetParent:I,strategy:d}):A);return{top:(S.top-N.top+b.top)/W.y,bottom:(N.bottom-S.bottom+b.bottom)/W.y,left:(S.left-N.left+b.left)/W.x,right:(N.right-S.right+b.right)/W.x}}const or=e=>({name:"arrow",options:e,async fn(t){const{x:i,y:o,placement:s,rects:a,platform:r,elements:l,middlewareData:d}=t,{element:u,padding:p=0}=Ct(e,t)||{};if(u==null)return{};const f=_s(p),g={x:i,y:o},m=vo(s),b=go(m),v=await r.getDimensions(u),C=m==="y",S=C?"top":"left",A=C?"bottom":"right",I=C?"clientHeight":"clientWidth",W=a.reference[b]+a.reference[m]-g[m]-a.floating[b],N=g[m]-a.reference[m],ye=await(r.getOffsetParent==null?void 0:r.getOffsetParent(u));let Z=ye?ye[I]:0;(!Z||!await(r.isElement==null?void 0:r.isElement(ye)))&&(Z=l.floating[I]||a.floating[b]);const Ne=W/2-N/2,Ee=Z/2-v[b]/2-1,be=Je(f[S],Ee),Ye=Je(f[A],Ee),De=be,Ke=Z-v[b]-Ye,se=Z/2-v[b]/2+Ne,at=so(De,se,Ke),Be=!d.arrow&&$t(s)!=null&&se!==at&&a.reference[b]/2-(se<De?be:Ye)-v[b]/2<0,we=Be?se<De?se-De:se-Ke:0;return{[m]:g[m]+we,data:{[m]:at,centerOffset:se-at-we,...Be&&{alignmentOffset:we}},reset:Be}}}),sr=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,o;const{placement:s,middlewareData:a,rects:r,initialPlacement:l,platform:d,elements:u}=t,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:g,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:b="none",flipAlignment:v=!0,...C}=Ct(e,t);if((i=a.arrow)!=null&&i.alignmentOffset)return{};const S=Ze(s),A=je(l),I=Ze(l)===l,W=await(d.isRTL==null?void 0:d.isRTL(u.floating)),N=g||(I||!v?[mi(l)]:Xa(l)),ye=b!=="none";!g&&ye&&N.push(...er(l,v,b,W));const Z=[l,...N],Ne=await yo(t,C),Ee=[];let be=((o=a.flip)==null?void 0:o.overflows)||[];if(p&&Ee.push(Ne[S]),f){const se=Ga(s,r,W);Ee.push(Ne[se[0]],Ne[se[1]])}if(be=[...be,{placement:s,overflows:Ee}],!Ee.every(se=>se<=0)){var Ye,De;const se=(((Ye=a.flip)==null?void 0:Ye.index)||0)+1,at=Z[se];if(at&&(!(f==="alignment"?A!==je(at):!1)||be.every(ke=>je(ke.placement)===A?ke.overflows[0]>0:!0)))return{data:{index:se,overflows:be},reset:{placement:at}};let Be=(De=be.filter(we=>we.overflows[0]<=0).sort((we,ke)=>we.overflows[1]-ke.overflows[1])[0])==null?void 0:De.placement;if(!Be)switch(m){case"bestFit":{var Ke;const we=(Ke=be.filter(ke=>{if(ye){const Ge=je(ke.placement);return Ge===A||Ge==="y"}return!0}).map(ke=>[ke.placement,ke.overflows.filter(Ge=>Ge>0).reduce((Ge,na)=>Ge+na,0)]).sort((ke,Ge)=>ke[1]-Ge[1])[0])==null?void 0:Ke[0];we&&(Be=we);break}case"initialPlacement":Be=l;break}if(s!==Be)return{reset:{placement:Be}}}return{}}}},ar=new Set(["left","top"]);async function rr(e,t){const{placement:i,platform:o,elements:s}=e,a=await(o.isRTL==null?void 0:o.isRTL(s.floating)),r=Ze(i),l=$t(i),d=je(i)==="y",u=ar.has(r)?-1:1,p=a&&d?-1:1,f=Ct(t,e);let{mainAxis:g,crossAxis:m,alignmentAxis:b}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return l&&typeof b=="number"&&(m=l==="end"?b*-1:b),d?{x:m*p,y:g*u}:{x:g*u,y:m*p}}const nr=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var i,o;const{x:s,y:a,placement:r,middlewareData:l}=t,d=await rr(t,e);return r===((i=l.offset)==null?void 0:i.placement)&&(o=l.arrow)!=null&&o.alignmentOffset?{}:{x:s+d.x,y:a+d.y,data:{...d,placement:r}}}}},lr=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:o,placement:s}=t,{mainAxis:a=!0,crossAxis:r=!1,limiter:l={fn:C=>{let{x:S,y:A}=C;return{x:S,y:A}}},...d}=Ct(e,t),u={x:i,y:o},p=await yo(t,d),f=je(Ze(s)),g=xs(f);let m=u[g],b=u[f];if(a){const C=g==="y"?"top":"left",S=g==="y"?"bottom":"right",A=m+p[C],I=m-p[S];m=so(A,m,I)}if(r){const C=f==="y"?"top":"left",S=f==="y"?"bottom":"right",A=b+p[C],I=b-p[S];b=so(A,b,I)}const v=l.fn({...t,[g]:m,[f]:b});return{...v,data:{x:v.x-i,y:v.y-o,enabled:{[g]:a,[f]:r}}}}}},cr=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var i,o;const{placement:s,rects:a,platform:r,elements:l}=t,{apply:d=()=>{},...u}=Ct(e,t),p=await yo(t,u),f=Ze(s),g=$t(s),m=je(s)==="y",{width:b,height:v}=a.floating;let C,S;f==="top"||f==="bottom"?(C=f,S=g===(await(r.isRTL==null?void 0:r.isRTL(l.floating))?"start":"end")?"left":"right"):(S=f,C=g==="end"?"top":"bottom");const A=v-p.top-p.bottom,I=b-p.left-p.right,W=Je(v-p[C],A),N=Je(b-p[S],I),ye=!t.middlewareData.shift;let Z=W,Ne=N;if((i=t.middlewareData.shift)!=null&&i.enabled.x&&(Ne=I),(o=t.middlewareData.shift)!=null&&o.enabled.y&&(Z=A),ye&&!g){const be=ce(p.left,0),Ye=ce(p.right,0),De=ce(p.top,0),Ke=ce(p.bottom,0);m?Ne=b-2*(be!==0||Ye!==0?be+Ye:ce(p.left,p.right)):Z=v-2*(De!==0||Ke!==0?De+Ke:ce(p.top,p.bottom))}await d({...t,availableWidth:Ne,availableHeight:Z});const Ee=await r.getDimensions(l.floating);return b!==Ee.width||v!==Ee.height?{reset:{rects:!0}}:{}}}};function Di(){return typeof window<"u"}function Tt(e){return Cs(e)?(e.nodeName||"").toLowerCase():"#document"}function de(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ie(e){var t;return(t=(Cs(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Cs(e){return Di()?e instanceof Node||e instanceof de(e).Node:!1}function _e(e){return Di()?e instanceof Element||e instanceof de(e).Element:!1}function ze(e){return Di()?e instanceof HTMLElement||e instanceof de(e).HTMLElement:!1}function No(e){return!Di()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof de(e).ShadowRoot}const dr=new Set(["inline","contents"]);function Yt(e){const{overflow:t,overflowX:i,overflowY:o,display:s}=Ce(e);return/auto|scroll|overlay|hidden|clip/.test(t+o+i)&&!dr.has(s)}const ur=new Set(["table","td","th"]);function hr(e){return ur.has(Tt(e))}const pr=[":popover-open",":modal"];function Ai(e){return pr.some(t=>{try{return e.matches(t)}catch{return!1}})}const fr=["transform","translate","scale","rotate","perspective"],mr=["transform","translate","scale","rotate","perspective","filter"],br=["paint","layout","strict","content"];function Oi(e){const t=wo(),i=_e(e)?Ce(e):e;return fr.some(o=>i[o]?i[o]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!t&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!t&&(i.filter?i.filter!=="none":!1)||mr.some(o=>(i.willChange||"").includes(o))||br.some(o=>(i.contain||"").includes(o))}function gr(e){let t=et(e);for(;ze(t)&&!kt(t);){if(Oi(t))return t;if(Ai(t))return null;t=et(t)}return null}function wo(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const vr=new Set(["html","body","#document"]);function kt(e){return vr.has(Tt(e))}function Ce(e){return de(e).getComputedStyle(e)}function zi(e){return _e(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function et(e){if(Tt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||No(e)&&e.host||Ie(e);return No(t)?t.host:t}function $s(e){const t=et(e);return kt(t)?e.ownerDocument?e.ownerDocument.body:e.body:ze(t)&&Yt(t)?t:$s(t)}function Bt(e,t,i){var o;t===void 0&&(t=[]),i===void 0&&(i=!0);const s=$s(e),a=s===((o=e.ownerDocument)==null?void 0:o.body),r=de(s);if(a){const l=ro(r);return t.concat(r,r.visualViewport||[],Yt(s)?s:[],l&&i?Bt(l):[])}return t.concat(s,Bt(s,[],i))}function ro(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Ts(e){const t=Ce(e);let i=parseFloat(t.width)||0,o=parseFloat(t.height)||0;const s=ze(e),a=s?e.offsetWidth:i,r=s?e.offsetHeight:o,l=fi(i)!==a||fi(o)!==r;return l&&(i=a,o=r),{width:i,height:o,$:l}}function ko(e){return _e(e)?e:e.contextElement}function wt(e){const t=ko(e);if(!ze(t))return Oe(1);const i=t.getBoundingClientRect(),{width:o,height:s,$:a}=Ts(t);let r=(a?fi(i.width):i.width)/o,l=(a?fi(i.height):i.height)/s;return(!r||!Number.isFinite(r))&&(r=1),(!l||!Number.isFinite(l))&&(l=1),{x:r,y:l}}const yr=Oe(0);function Ss(e){const t=de(e);return!wo()||!t.visualViewport?yr:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function wr(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==de(e)?!1:t}function ut(e,t,i,o){t===void 0&&(t=!1),i===void 0&&(i=!1);const s=e.getBoundingClientRect(),a=ko(e);let r=Oe(1);t&&(o?_e(o)&&(r=wt(o)):r=wt(e));const l=wr(a,i,o)?Ss(a):Oe(0);let d=(s.left+l.x)/r.x,u=(s.top+l.y)/r.y,p=s.width/r.x,f=s.height/r.y;if(a){const g=de(a),m=o&&_e(o)?de(o):o;let b=g,v=ro(b);for(;v&&o&&m!==b;){const C=wt(v),S=v.getBoundingClientRect(),A=Ce(v),I=S.left+(v.clientLeft+parseFloat(A.paddingLeft))*C.x,W=S.top+(v.clientTop+parseFloat(A.paddingTop))*C.y;d*=C.x,u*=C.y,p*=C.x,f*=C.y,d+=I,u+=W,b=de(v),v=ro(b)}}return bi({width:p,height:f,x:d,y:u})}function Mi(e,t){const i=zi(e).scrollLeft;return t?t.left+i:ut(Ie(e)).left+i}function Es(e,t){const i=e.getBoundingClientRect(),o=i.left+t.scrollLeft-Mi(e,i),s=i.top+t.scrollTop;return{x:o,y:s}}function kr(e){let{elements:t,rect:i,offsetParent:o,strategy:s}=e;const a=s==="fixed",r=Ie(o),l=t?Ai(t.floating):!1;if(o===r||l&&a)return i;let d={scrollLeft:0,scrollTop:0},u=Oe(1);const p=Oe(0),f=ze(o);if((f||!f&&!a)&&((Tt(o)!=="body"||Yt(r))&&(d=zi(o)),ze(o))){const m=ut(o);u=wt(o),p.x=m.x+o.clientLeft,p.y=m.y+o.clientTop}const g=r&&!f&&!a?Es(r,d):Oe(0);return{width:i.width*u.x,height:i.height*u.y,x:i.x*u.x-d.scrollLeft*u.x+p.x+g.x,y:i.y*u.y-d.scrollTop*u.y+p.y+g.y}}function xr(e){return Array.from(e.getClientRects())}function _r(e){const t=Ie(e),i=zi(e),o=e.ownerDocument.body,s=ce(t.scrollWidth,t.clientWidth,o.scrollWidth,o.clientWidth),a=ce(t.scrollHeight,t.clientHeight,o.scrollHeight,o.clientHeight);let r=-i.scrollLeft+Mi(e);const l=-i.scrollTop;return Ce(o).direction==="rtl"&&(r+=ce(t.clientWidth,o.clientWidth)-s),{width:s,height:a,x:r,y:l}}const Bo=25;function Cr(e,t){const i=de(e),o=Ie(e),s=i.visualViewport;let a=o.clientWidth,r=o.clientHeight,l=0,d=0;if(s){a=s.width,r=s.height;const p=wo();(!p||p&&t==="fixed")&&(l=s.offsetLeft,d=s.offsetTop)}const u=Mi(o);if(u<=0){const p=o.ownerDocument,f=p.body,g=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(g.marginLeft)+parseFloat(g.marginRight)||0,b=Math.abs(o.clientWidth-f.clientWidth-m);b<=Bo&&(a-=b)}else u<=Bo&&(a+=u);return{width:a,height:r,x:l,y:d}}const $r=new Set(["absolute","fixed"]);function Tr(e,t){const i=ut(e,!0,t==="fixed"),o=i.top+e.clientTop,s=i.left+e.clientLeft,a=ze(e)?wt(e):Oe(1),r=e.clientWidth*a.x,l=e.clientHeight*a.y,d=s*a.x,u=o*a.y;return{width:r,height:l,x:d,y:u}}function Ho(e,t,i){let o;if(t==="viewport")o=Cr(e,i);else if(t==="document")o=_r(Ie(e));else if(_e(t))o=Tr(t,i);else{const s=Ss(e);o={x:t.x-s.x,y:t.y-s.y,width:t.width,height:t.height}}return bi(o)}function Ds(e,t){const i=et(e);return i===t||!_e(i)||kt(i)?!1:Ce(i).position==="fixed"||Ds(i,t)}function Sr(e,t){const i=t.get(e);if(i)return i;let o=Bt(e,[],!1).filter(l=>_e(l)&&Tt(l)!=="body"),s=null;const a=Ce(e).position==="fixed";let r=a?et(e):e;for(;_e(r)&&!kt(r);){const l=Ce(r),d=Oi(r);!d&&l.position==="fixed"&&(s=null),(a?!d&&!s:!d&&l.position==="static"&&!!s&&$r.has(s.position)||Yt(r)&&!d&&Ds(e,r))?o=o.filter(p=>p!==r):s=l,r=et(r)}return t.set(e,o),o}function Er(e){let{element:t,boundary:i,rootBoundary:o,strategy:s}=e;const r=[...i==="clippingAncestors"?Ai(t)?[]:Sr(t,this._c):[].concat(i),o],l=r[0],d=r.reduce((u,p)=>{const f=Ho(t,p,s);return u.top=ce(f.top,u.top),u.right=Je(f.right,u.right),u.bottom=Je(f.bottom,u.bottom),u.left=ce(f.left,u.left),u},Ho(t,l,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Dr(e){const{width:t,height:i}=Ts(e);return{width:t,height:i}}function Ar(e,t,i){const o=ze(t),s=Ie(t),a=i==="fixed",r=ut(e,!0,a,t);let l={scrollLeft:0,scrollTop:0};const d=Oe(0);function u(){d.x=Mi(s)}if(o||!o&&!a)if((Tt(t)!=="body"||Yt(s))&&(l=zi(t)),o){const m=ut(t,!0,a,t);d.x=m.x+t.clientLeft,d.y=m.y+t.clientTop}else s&&u();a&&!o&&s&&u();const p=s&&!o&&!a?Es(s,l):Oe(0),f=r.left+l.scrollLeft-d.x-p.x,g=r.top+l.scrollTop-d.y-p.y;return{x:f,y:g,width:r.width,height:r.height}}function qi(e){return Ce(e).position==="static"}function jo(e,t){if(!ze(e)||Ce(e).position==="fixed")return null;if(t)return t(e);let i=e.offsetParent;return Ie(e)===i&&(i=i.ownerDocument.body),i}function As(e,t){const i=de(e);if(Ai(e))return i;if(!ze(e)){let s=et(e);for(;s&&!kt(s);){if(_e(s)&&!qi(s))return s;s=et(s)}return i}let o=jo(e,t);for(;o&&hr(o)&&qi(o);)o=jo(o,t);return o&&kt(o)&&qi(o)&&!Oi(o)?i:o||gr(e)||i}const Or=async function(e){const t=this.getOffsetParent||As,i=this.getDimensions,o=await i(e.floating);return{reference:Ar(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function zr(e){return Ce(e).direction==="rtl"}const ci={convertOffsetParentRelativeRectToViewportRelativeRect:kr,getDocumentElement:Ie,getClippingRect:Er,getOffsetParent:As,getElementRects:Or,getClientRects:xr,getDimensions:Dr,getScale:wt,isElement:_e,isRTL:zr};function Os(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Mr(e,t){let i=null,o;const s=Ie(e);function a(){var l;clearTimeout(o),(l=i)==null||l.disconnect(),i=null}function r(l,d){l===void 0&&(l=!1),d===void 0&&(d=1),a();const u=e.getBoundingClientRect(),{left:p,top:f,width:g,height:m}=u;if(l||t(),!g||!m)return;const b=ii(f),v=ii(s.clientWidth-(p+g)),C=ii(s.clientHeight-(f+m)),S=ii(p),I={rootMargin:-b+"px "+-v+"px "+-C+"px "+-S+"px",threshold:ce(0,Je(1,d))||1};let W=!0;function N(ye){const Z=ye[0].intersectionRatio;if(Z!==d){if(!W)return r();Z?r(!1,Z):o=setTimeout(()=>{r(!1,1e-7)},1e3)}Z===1&&!Os(u,e.getBoundingClientRect())&&r(),W=!1}try{i=new IntersectionObserver(N,{...I,root:s.ownerDocument})}catch{i=new IntersectionObserver(N,I)}i.observe(e)}return r(!0),a}function Pr(e,t,i,o){o===void 0&&(o={});const{ancestorScroll:s=!0,ancestorResize:a=!0,elementResize:r=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:d=!1}=o,u=ko(e),p=s||a?[...u?Bt(u):[],...Bt(t)]:[];p.forEach(S=>{s&&S.addEventListener("scroll",i,{passive:!0}),a&&S.addEventListener("resize",i)});const f=u&&l?Mr(u,i):null;let g=-1,m=null;r&&(m=new ResizeObserver(S=>{let[A]=S;A&&A.target===u&&m&&(m.unobserve(t),cancelAnimationFrame(g),g=requestAnimationFrame(()=>{var I;(I=m)==null||I.observe(t)})),i()}),u&&!d&&m.observe(u),m.observe(t));let b,v=d?ut(e):null;d&&C();function C(){const S=ut(e);v&&!Os(v,S)&&i(),v=S,b=requestAnimationFrame(C)}return i(),()=>{var S;p.forEach(A=>{s&&A.removeEventListener("scroll",i),a&&A.removeEventListener("resize",i)}),f==null||f(),(S=m)==null||S.disconnect(),m=null,d&&cancelAnimationFrame(b)}}const Lr=nr,Ir=lr,Rr=sr,Vo=cr,Fr=or,Nr=(e,t,i)=>{const o=new Map,s={platform:ci,...i},a={...s.platform,_c:o};return ir(e,t,{...s,platform:a})};function Br(e){return Hr(e)}function Yi(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Hr(e){for(let t=e;t;t=Yi(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=Yi(e);t;t=Yi(t)){if(!(t instanceof Element))continue;const i=getComputedStyle(t);if(i.display!=="contents"&&(i.position!=="static"||Oi(i)||t.tagName==="BODY"))return t}return null}function jr(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var L=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let o=0,s=0,a=0,r=0,l=0,d=0,u=0,p=0;i?e.top<t.top?(o=e.left,s=e.bottom,a=e.right,r=e.bottom,l=t.left,d=t.top,u=t.right,p=t.top):(o=t.left,s=t.bottom,a=t.right,r=t.bottom,l=e.left,d=e.top,u=e.right,p=e.top):e.left<t.left?(o=e.right,s=e.top,a=t.left,r=t.top,l=e.right,d=e.bottom,u=t.left,p=t.bottom):(o=t.right,s=t.top,a=e.left,r=e.top,l=t.right,d=t.bottom,u=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${o}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${a}px`),this.style.setProperty("--hover-bridge-top-right-y",`${r}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${l}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||jr(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Pr(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[Lr({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(Vo({apply:({rects:i})=>{const o=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=o?`${i.reference.width}px`:"",this.popup.style.height=s?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(Rr({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(Ir({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(Vo({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:o})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${o}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(Fr({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?i=>ci.getOffsetParent(i,Br):ci.getOffsetParent;Nr(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:Ut(Ue({},ci),{getOffsetParent:t})}).then(({x:i,y:o,middlewareData:s,placement:a})=>{const r=this.localize.dir()==="rtl",l={top:"bottom",right:"left",bottom:"top",left:"right"}[a.split("-")[0]];if(this.setAttribute("data-current-placement",a),Object.assign(this.popup.style,{left:`${i}px`,top:`${o}px`}),this.arrow){const d=s.arrow.x,u=s.arrow.y;let p="",f="",g="",m="";if(this.arrowPlacement==="start"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=r?b:"",m=r?"":b}else if(this.arrowPlacement==="end"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=r?"":b,m=r?b:"",g=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof d=="number"?`${d}px`:"",p=typeof u=="number"?`${u}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:g,left:m,[l]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return h`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${z({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${z({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?h`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};L.styles=[F,Ua];n([x(".popup")],L.prototype,"popup",2);n([x(".popup__arrow")],L.prototype,"arrowEl",2);n([c()],L.prototype,"anchor",2);n([c({type:Boolean,reflect:!0})],L.prototype,"active",2);n([c({reflect:!0})],L.prototype,"placement",2);n([c({reflect:!0})],L.prototype,"strategy",2);n([c({type:Number})],L.prototype,"distance",2);n([c({type:Number})],L.prototype,"skidding",2);n([c({type:Boolean})],L.prototype,"arrow",2);n([c({attribute:"arrow-placement"})],L.prototype,"arrowPlacement",2);n([c({attribute:"arrow-padding",type:Number})],L.prototype,"arrowPadding",2);n([c({type:Boolean})],L.prototype,"flip",2);n([c({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],L.prototype,"flipFallbackPlacements",2);n([c({attribute:"flip-fallback-strategy"})],L.prototype,"flipFallbackStrategy",2);n([c({type:Object})],L.prototype,"flipBoundary",2);n([c({attribute:"flip-padding",type:Number})],L.prototype,"flipPadding",2);n([c({type:Boolean})],L.prototype,"shift",2);n([c({type:Object})],L.prototype,"shiftBoundary",2);n([c({attribute:"shift-padding",type:Number})],L.prototype,"shiftPadding",2);n([c({attribute:"auto-size"})],L.prototype,"autoSize",2);n([c()],L.prototype,"sync",2);n([c({type:Object})],L.prototype,"autoSizeBoundary",2);n([c({attribute:"auto-size-padding",type:Number})],L.prototype,"autoSizePadding",2);n([c({attribute:"hover-bridge",type:Boolean})],L.prototype,"hoverBridge",2);var zs=new Map,Vr=new WeakMap;function Wr(e){return e??{keyframes:[],options:{duration:0}}}function Wo(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function R(e,t){zs.set(e,Wr(t))}function B(e,t,i){const o=Vr.get(e);if(o!=null&&o[t])return Wo(o[t],i.dir);const s=zs.get(t);return s?Wo(s,i.dir):{keyframes:[],options:{duration:0}}}function ne(e,t){return new Promise(i=>{function o(s){s.target===e&&(e.removeEventListener(t,o),i())}e.addEventListener(t,o)})}function H(e,t,i){return new Promise(o=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=e.animate(t,Ut(Ue({},i),{duration:Ur()?0:i.duration}));s.addEventListener("cancel",o,{once:!0}),s.addEventListener("finish",o,{once:!0})})}function Uo(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function Ur(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function U(e){return Promise.all(e.getAnimations().map(t=>new Promise(i=>{t.cancel(),requestAnimationFrame(i)})))}function qo(e,t){return e.map(i=>Ut(Ue({},i),{height:i.height==="auto"?`${t}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let no=class extends Si{constructor(t){if(super(t),this.it=w,t.type!==He.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===w||t==null)return this._t=void 0,this.it=t;if(t===vt)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};no.directiveName="unsafeHTML",no.resultType=1;const qr=Ti(no);var E=class extends M{constructor(){super(...arguments),this.formControlController=new qt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.localize=new ie(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>h`
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
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,i=t.closest(".select__clear")!==null,o=t.closest("sl-icon-button")!==null;if(!(i||o)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const s=this.getAllOptions(),a=s.indexOf(this.currentOption);let r=Math.max(0,a);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(r=a+1,r>s.length-1&&(r=0)):e.key==="ArrowUp"?(r=a-1,r<0&&(r=s.length-1)):e.key==="Home"?r=0:e.key==="End"&&(r=s.length-1),this.setCurrentOption(s[r])}if(e.key&&e.key.length===1||e.key==="Backspace"){const s=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const a of s)if(a.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(a);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const i=e.composedPath().some(o=>o instanceof Element&&o.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const i=e.target.closest("sl-option"),o=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==o&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(t)?t:[t],o=[];e.forEach(s=>o.push(s.value)),this.setSelectedOptions(e.filter(s=>i.includes(s.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),i=Array.isArray(e)?e:[e];t.forEach(o=>o.selected=!1),i.length&&i.forEach(o=>o.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,i;const o=this.getAllOptions();this.selectedOptions=o.filter(a=>a.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(a=>a.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const a=this.selectedOptions[0];this.value=(e=a==null?void 0:a.value)!=null?e:"",this.displayLabel=(i=(t=a==null?void 0:a.getTextLabel)==null?void 0:t.call(a))!=null?i:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(e,t);return h`<div @sl-remove=${o=>this.handleTagRemove(o,e)}>
          ${typeof i=="string"?qr(i):i}
        </div>`}else if(t===this.maxOptionsVisible)return h`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return h``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,i){if(super.attributeChangedCallback(e,t,i),e==="value"){const o=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=o}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(i=>t.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await U(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=B(this,"select.show",{dir:this.localize.dir()});await H(this.popup.popup,e,t),this.currentOption&&oo(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await U(this);const{keyframes:e,options:t}=B(this,"select.hide",{dir:this.localize.dir()});await H(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ne(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ne(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t,s=this.clearable&&!this.disabled&&this.value.length>0,a=this.placeholder&&this.value&&this.value.length<=0;return h`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
            class=${z({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":a,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${s?h`
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};E.styles=[F,Ei,Ha];E.dependencies={"sl-icon":G,"sl-popup":L,"sl-tag":ft};n([x(".select")],E.prototype,"popup",2);n([x(".select__combobox")],E.prototype,"combobox",2);n([x(".select__display-input")],E.prototype,"displayInput",2);n([x(".select__value-input")],E.prototype,"valueInput",2);n([x(".select__listbox")],E.prototype,"listbox",2);n([y()],E.prototype,"hasFocus",2);n([y()],E.prototype,"displayLabel",2);n([y()],E.prototype,"currentOption",2);n([y()],E.prototype,"selectedOptions",2);n([y()],E.prototype,"valueHasChanged",2);n([c()],E.prototype,"name",2);n([y()],E.prototype,"value",1);n([c({attribute:"value"})],E.prototype,"defaultValue",2);n([c({reflect:!0})],E.prototype,"size",2);n([c()],E.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],E.prototype,"multiple",2);n([c({attribute:"max-options-visible",type:Number})],E.prototype,"maxOptionsVisible",2);n([c({type:Boolean,reflect:!0})],E.prototype,"disabled",2);n([c({type:Boolean})],E.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],E.prototype,"open",2);n([c({type:Boolean})],E.prototype,"hoist",2);n([c({type:Boolean,reflect:!0})],E.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],E.prototype,"pill",2);n([c()],E.prototype,"label",2);n([c({reflect:!0})],E.prototype,"placement",2);n([c({attribute:"help-text"})],E.prototype,"helpText",2);n([c({reflect:!0})],E.prototype,"form",2);n([c({type:Boolean,reflect:!0})],E.prototype,"required",2);n([c()],E.prototype,"getTag",2);n([T("disabled",{waitUntilFirstUpdate:!0})],E.prototype,"handleDisabledChange",1);n([T(["defaultValue","value"],{waitUntilFirstUpdate:!0})],E.prototype,"handleValueChange",1);n([T("open",{waitUntilFirstUpdate:!0})],E.prototype,"handleOpenChange",1);R("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});E.define("sl-select");var Yr=$`
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
`,ve=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(t+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(t+=i.textContent)}),t.trim()}render(){return h`
      <div
        part="base"
        class=${z({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};ve.styles=[F,Yr];ve.dependencies={"sl-icon":G};n([x(".option__label")],ve.prototype,"defaultSlot",2);n([y()],ve.prototype,"current",2);n([y()],ve.prototype,"selected",2);n([y()],ve.prototype,"hasHover",2);n([c({reflect:!0})],ve.prototype,"value",2);n([c({type:Boolean,reflect:!0})],ve.prototype,"disabled",2);n([T("disabled")],ve.prototype,"handleDisabledChange",1);n([T("selected")],ve.prototype,"handleSelectedChange",1);n([T("value")],ve.prototype,"handleValueChange",1);ve.define("sl-option");var Kr=$`
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
`;function*xo(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*wa(xo(e.shadowRoot.activeElement))))}function Ms(){return[...xo()].pop()}var Yo=new WeakMap;function Ps(e){let t=Yo.get(e);return t||(t=window.getComputedStyle(e,null),Yo.set(e,t)),t}function Gr(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=Ps(e);return t.visibility!=="hidden"&&t.display!=="none"}function Xr(e){const t=Ps(e),{overflowY:i,overflowX:o}=t;return i==="scroll"||o==="scroll"?!0:i!=="auto"||o!=="auto"?!1:e.scrollHeight>e.clientHeight&&i==="auto"||e.scrollWidth>e.clientWidth&&o==="auto"}function Qr(e){const t=e.tagName.toLowerCase(),i=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const a=e.getRootNode(),r=`input[type='radio'][name="${e.getAttribute("name")}"]`,l=a.querySelector(`${r}:checked`);return l?l===e:a.querySelector(r)===e}return Gr(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:Xr(e):!1}function Jr(e){var t,i;const o=lo(e),s=(t=o[0])!=null?t:null,a=(i=o[o.length-1])!=null?i:null;return{start:s,end:a}}function Zr(e,t){var i;return((i=e.getRootNode({composed:!0}))==null?void 0:i.host)!==t}function lo(e){const t=new WeakMap,i=[];function o(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||t.has(s))return;t.set(s,!0),!i.includes(s)&&Qr(s)&&i.push(s),s instanceof HTMLSlotElement&&Zr(s,e)&&s.assignedElements({flatten:!0}).forEach(a=>{o(a)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&o(s.shadowRoot)}for(const a of s.children)o(a)}return o(e),i.sort((s,a)=>{const r=Number(s.getAttribute("tabindex"))||0;return(Number(a.getAttribute("tabindex"))||0)-r})}var Pt=[],Ls=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var i;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const o=Ms();if(this.previousFocus=o,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=lo(this.element);let a=s.findIndex(l=>l===o);this.previousFocus=this.currentFocus;const r=this.tabDirection==="forward"?1:-1;for(;;){a+r>=s.length?a=0:a+r<0?a=s.length-1:a+=r,this.previousFocus=this.currentFocus;const l=s[a];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||l&&this.possiblyHasTabbableChildren(l))return;t.preventDefault(),this.currentFocus=l,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...xo()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Pt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Pt=Pt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Pt[Pt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=lo(this.element);if(!this.element.matches(":focus-within")){const t=e[0],i=e[e.length-1],o=this.tabDirection==="forward"?t:i;typeof(o==null?void 0:o.focus)=="function"&&(this.currentFocus=o,o.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},_o=e=>{var t;const{activeElement:i}=document;i&&e.contains(i)&&((t=document.activeElement)==null||t.blur())};function Ko(e){return e.charAt(0).toUpperCase()+e.slice(1)}var ue=class extends M{constructor(){super(...arguments),this.hasSlotController=new qe(this,"footer"),this.localize=new ie(this),this.modal=new Ls(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Rt(this)))}disconnectedCallback(){super.disconnectedCallback(),Ft(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=B(this,"drawer.denyClose",{dir:this.localize.dir()});H(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Rt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([U(this.drawer),U(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=B(this,`drawer.show${Ko(this.placement)}`,{dir:this.localize.dir()}),i=B(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([H(this.panel,t.keyframes,t.options),H(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{_o(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Ft(this)),await Promise.all([U(this.drawer),U(this.overlay)]);const e=B(this,`drawer.hide${Ko(this.placement)}`,{dir:this.localize.dir()}),t=B(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([H(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),H(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Rt(this)),this.open&&this.contained&&(this.modal.deactivate(),Ft(this))}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${z({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="drawer__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${k(this.noHeader?this.label:void 0)}
          aria-labelledby=${k(this.noHeader?void 0:"title")}
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
    `}};ue.styles=[F,Kr];ue.dependencies={"sl-icon-button":V};n([x(".drawer")],ue.prototype,"drawer",2);n([x(".drawer__panel")],ue.prototype,"panel",2);n([x(".drawer__overlay")],ue.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],ue.prototype,"open",2);n([c({reflect:!0})],ue.prototype,"label",2);n([c({reflect:!0})],ue.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],ue.prototype,"contained",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],ue.prototype,"noHeader",2);n([T("open",{waitUntilFirstUpdate:!0})],ue.prototype,"handleOpenChange",1);n([T("contained",{waitUntilFirstUpdate:!0})],ue.prototype,"handleNoModalChange",1);R("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});R("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});R("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});R("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});R("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});R("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});ue.define("sl-drawer");var en=$`
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
`,Re=class extends M{constructor(){super(...arguments),this.hasSlotController=new qe(this,"footer"),this.localize=new ie(this),this.modal=new Ls(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Rt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Ft(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=B(this,"dialog.denyClose",{dir:this.localize.dir()});H(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Rt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([U(this.dialog),U(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=B(this,"dialog.show",{dir:this.localize.dir()}),i=B(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([H(this.panel,t.keyframes,t.options),H(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{_o(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([U(this.dialog),U(this.overlay)]);const e=B(this,"dialog.hide",{dir:this.localize.dir()}),t=B(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([H(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),H(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Ft(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${z({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="dialog__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${k(this.noHeader?this.label:void 0)}
          aria-labelledby=${k(this.noHeader?void 0:"title")}
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
    `}};Re.styles=[F,en];Re.dependencies={"sl-icon-button":V};n([x(".dialog")],Re.prototype,"dialog",2);n([x(".dialog__panel")],Re.prototype,"panel",2);n([x(".dialog__overlay")],Re.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],Re.prototype,"open",2);n([c({reflect:!0})],Re.prototype,"label",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],Re.prototype,"noHeader",2);n([T("open",{waitUntilFirstUpdate:!0})],Re.prototype,"handleOpenChange",1);R("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});R("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});R("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Re.define("sl-dialog");var tn=$`
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
`,Kt=class extends M{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return h`
      <span
        part="base"
        class=${z({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};Kt.styles=[F,tn];n([c({reflect:!0})],Kt.prototype,"variant",2);n([c({type:Boolean,reflect:!0})],Kt.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],Kt.prototype,"pulse",2);Kt.define("sl-badge");var on=$`
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
`,he=class rt extends M{constructor(){super(...arguments),this.hasSlotController=new qe(this,"icon","suffix"),this.localize=new ie(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,i="100%",o="0";this.countdownAnimation=t.animate([{width:i},{width:o}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await U(this.base),this.base.hidden=!1;const{keyframes:t,options:i}=B(this,"alert.show",{dir:this.localize.dir()});await H(this.base,t,i),this.emit("sl-after-show")}else{_o(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await U(this.base);const{keyframes:t,options:i}=B(this,"alert.hide",{dir:this.localize.dir()});await H(this.base,t,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),rt.toastStack.parentElement===null&&document.body.append(rt.toastStack),rt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{rt.toastStack.removeChild(this),t(),rt.toastStack.querySelector("sl-alert")===null&&rt.toastStack.remove()},{once:!0})})}render(){return h`
      <div
        part="base"
        class=${z({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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
                class=${z({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};he.styles=[F,on];he.dependencies={"sl-icon-button":V};n([x('[part~="base"]')],he.prototype,"base",2);n([x(".alert__countdown-elapsed")],he.prototype,"countdownElement",2);n([c({type:Boolean,reflect:!0})],he.prototype,"open",2);n([c({type:Boolean,reflect:!0})],he.prototype,"closable",2);n([c({reflect:!0})],he.prototype,"variant",2);n([c({type:Number})],he.prototype,"duration",2);n([c({type:String,reflect:!0})],he.prototype,"countdown",2);n([y()],he.prototype,"remainingTime",2);n([T("open",{waitUntilFirstUpdate:!0})],he.prototype,"handleOpenChange",1);n([T("duration")],he.prototype,"handleDurationChange",1);var sn=he;R("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});sn.define("sl-alert");var an=$`
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
`,D=class extends M{constructor(){super(...arguments),this.formControlController=new qt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,o="preserve"){const s=t??this.input.selectionStart,a=i??this.input.selectionEnd;this.input.setRangeText(e,s,a,o),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t;return h`
      <div
        part="form-control"
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
            class=${z({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${k(this.name)}
              .value=${pi(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${k(this.placeholder)}
              rows=${k(this.rows)}
              minlength=${k(this.minlength)}
              maxlength=${k(this.maxlength)}
              autocapitalize=${k(this.autocapitalize)}
              autocorrect=${k(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${k(this.spellcheck)}
              enterkeyhint=${k(this.enterkeyhint)}
              inputmode=${k(this.inputmode)}
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};D.styles=[F,Ei,an];n([x(".textarea__control")],D.prototype,"input",2);n([x(".textarea__size-adjuster")],D.prototype,"sizeAdjuster",2);n([y()],D.prototype,"hasFocus",2);n([c()],D.prototype,"title",2);n([c()],D.prototype,"name",2);n([c()],D.prototype,"value",2);n([c({reflect:!0})],D.prototype,"size",2);n([c({type:Boolean,reflect:!0})],D.prototype,"filled",2);n([c()],D.prototype,"label",2);n([c({attribute:"help-text"})],D.prototype,"helpText",2);n([c()],D.prototype,"placeholder",2);n([c({type:Number})],D.prototype,"rows",2);n([c()],D.prototype,"resize",2);n([c({type:Boolean,reflect:!0})],D.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],D.prototype,"readonly",2);n([c({reflect:!0})],D.prototype,"form",2);n([c({type:Boolean,reflect:!0})],D.prototype,"required",2);n([c({type:Number})],D.prototype,"minlength",2);n([c({type:Number})],D.prototype,"maxlength",2);n([c()],D.prototype,"autocapitalize",2);n([c()],D.prototype,"autocorrect",2);n([c()],D.prototype,"autocomplete",2);n([c({type:Boolean})],D.prototype,"autofocus",2);n([c()],D.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],D.prototype,"spellcheck",2);n([c()],D.prototype,"inputmode",2);n([bo()],D.prototype,"defaultValue",2);n([T("disabled",{waitUntilFirstUpdate:!0})],D.prototype,"handleDisabledChange",1);n([T("rows",{waitUntilFirstUpdate:!0})],D.prototype,"handleRowsChange",1);n([T("value",{waitUntilFirstUpdate:!0})],D.prototype,"handleValueChange",1);D.define("sl-textarea");var rn=$`
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
`,oe=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(o,s)=>{if(!o)return null;const a=o.closest(s);if(a)return a;const r=o.getRootNode();return r instanceof ShadowRoot?i(r.host,s):null};setTimeout(()=>{var o;const s=((o=this.containingElement)==null?void 0:o.getRootNode())instanceof ShadowRoot?Ms():document.activeElement;(!this.containingElement||i(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const i=t.getAllItems(),o=i[0],s=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(o),o.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(o=>Jr(o).start);let i;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=t.button;break;default:i=t}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await U(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=B(this,"dropdown.show",{dir:this.localize.dir()});await H(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await U(this);const{keyframes:e,options:t}=B(this,"dropdown.hide",{dir:this.localize.dir()});await H(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return h`
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
        sync=${k(this.sync?this.sync:void 0)}
        class=${z({dropdown:!0,"dropdown--open":this.open})}
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
    `}};oe.styles=[F,rn];oe.dependencies={"sl-popup":L};n([x(".dropdown")],oe.prototype,"popup",2);n([x(".dropdown__trigger")],oe.prototype,"trigger",2);n([x(".dropdown__panel")],oe.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],oe.prototype,"open",2);n([c({reflect:!0})],oe.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],oe.prototype,"disabled",2);n([c({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],oe.prototype,"stayOpenOnSelect",2);n([c({attribute:!1})],oe.prototype,"containingElement",2);n([c({type:Number})],oe.prototype,"distance",2);n([c({type:Number})],oe.prototype,"skidding",2);n([c({type:Boolean})],oe.prototype,"hoist",2);n([c({reflect:!0})],oe.prototype,"sync",2);n([T("open",{waitUntilFirstUpdate:!0})],oe.prototype,"handleOpenChange",1);R("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});oe.define("sl-dropdown");var nn=$`
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
`,Co=class extends M{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],i=e.composedPath(),o=i.find(l=>{var d;return t.includes(((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))||"")});if(!o||i.find(l=>{var d;return((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))==="menu"})!==this)return;const r=o;r.type==="checkbox"&&(r.checked=!r.checked),this.emit("sl-select",{detail:{item:r}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),i=this.getCurrentItem();let o=i?t.indexOf(i):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?o++:e.key==="ArrowUp"?o--:e.key==="Home"?o=0:e.key==="End"&&(o=t.length-1),o<0&&(o=t.length-1),o>t.length-1&&(o=0),this.setCurrentItem(t[o]),t[o].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===e?"0":"-1")})}render(){return h`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Co.styles=[F,nn];n([x("slot")],Co.prototype,"defaultSlot",2);Co.define("sl-menu");var ln=$`
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
 */const Nt=(e,t)=>{var o;const i=e._$AN;if(i===void 0)return!1;for(const s of i)(o=s._$AO)==null||o.call(s,t,!1),Nt(s,t);return!0},gi=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while((i==null?void 0:i.size)===0)},Is=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),un(t)}};function cn(e){this._$AN!==void 0?(gi(this),this._$AM=e,Is(this)):this._$AM=e}function dn(e,t=!1,i=0){const o=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(t)if(Array.isArray(o))for(let a=i;a<o.length;a++)Nt(o[a],!1),gi(o[a]);else o!=null&&(Nt(o,!1),gi(o));else Nt(this,e)}const un=e=>{e.type==He.CHILD&&(e._$AP??(e._$AP=dn),e._$AQ??(e._$AQ=cn))};class hn extends Si{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,o){super._$AT(t,i,o),Is(this),this.isConnected=t._$AU}_$AO(t,i=!0){var o,s;t!==this.isConnected&&(this.isConnected=t,t?(o=this.reconnected)==null||o.call(this):(s=this.disconnected)==null||s.call(this)),i&&(Nt(this,t),gi(this))}setValue(t){if(ws(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pn=()=>new fn;class fn{}const Ki=new WeakMap,mn=Ti(class extends hn{render(e){return w}update(e,[t]){var o;const i=t!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=(o=e.options)==null?void 0:o.host,this.rt(this.ct=e.element)),w}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=Ki.get(t);i===void 0&&(i=new WeakMap,Ki.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=Ki.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var bn=class{constructor(e,t){this.popupRef=pn(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var o;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(o=i.target.role)!=null&&o.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),o=i==null?void 0:i.assignedElements({flatten:!0}).filter(u=>u.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!o)return;const{left:a,top:r,width:l,height:d}=o.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?a+l:a}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?a+l:a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${r+d}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const o of t.assignedElements())if(i=o.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let o=1;o!==i.length;++o)i[o].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),o=["padding-top","border-top-width","margin-top"].reduce((s,a)=>{var r;const l=(r=t.get(a))!=null?r:new CSSUnitValue(0,"px"),u=(l instanceof CSSUnitValue?l:new CSSUnitValue(0,"px")).to("px");return s-u.value},0);this.skidding=o}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?h`
      <sl-popup
        ${mn(this.popupRef)}
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
    `:h` <slot name="submenu" hidden></slot> `}},pe=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new qe(this,"submenu"),this.submenuController=new bn(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return _a(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return h`
      <div
        id="anchor"
        part="base"
        class=${z({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
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
    `}};pe.styles=[F,ln];pe.dependencies={"sl-icon":G,"sl-popup":L,"sl-spinner":$i};n([x("slot:not([name])")],pe.prototype,"defaultSlot",2);n([x(".menu-item")],pe.prototype,"menuItem",2);n([c()],pe.prototype,"type",2);n([c({type:Boolean,reflect:!0})],pe.prototype,"checked",2);n([c()],pe.prototype,"value",2);n([c({type:Boolean,reflect:!0})],pe.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],pe.prototype,"disabled",2);n([T("checked")],pe.prototype,"handleCheckedChange",1);n([T("disabled")],pe.prototype,"handleDisabledChange",1);n([T("type")],pe.prototype,"handleTypeChange",1);pe.define("sl-menu-item");G.define("sl-icon");var gn=$`
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
`,Pi=class extends M{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Pi.styles=[F,gn];n([c({type:Boolean,reflect:!0})],Pi.prototype,"vertical",2);n([T("vertical")],Pi.prototype,"handleVerticalChange",1);Pi.define("sl-divider");var vn=$`
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
`,X=class extends M{constructor(){super(),this.localize=new ie(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=Uo(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=Uo(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await U(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:o}=B(this,"tooltip.show",{dir:this.localize.dir()});await H(this.popup.popup,i,o),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await U(this.body);const{keyframes:i,options:o}=B(this,"tooltip.hide",{dir:this.localize.dir()});await H(this.popup.popup,i,o),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return h`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${z({tooltip:!0,"tooltip--open":this.open})}
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
    `}};X.styles=[F,vn];X.dependencies={"sl-popup":L};n([x("slot:not([name])")],X.prototype,"defaultSlot",2);n([x(".tooltip__body")],X.prototype,"body",2);n([x("sl-popup")],X.prototype,"popup",2);n([c()],X.prototype,"content",2);n([c()],X.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],X.prototype,"disabled",2);n([c({type:Number})],X.prototype,"distance",2);n([c({type:Boolean,reflect:!0})],X.prototype,"open",2);n([c({type:Number})],X.prototype,"skidding",2);n([c()],X.prototype,"trigger",2);n([c({type:Boolean})],X.prototype,"hoist",2);n([T("open",{waitUntilFirstUpdate:!0})],X.prototype,"handleOpenChange",1);n([T(["content","distance","hoist","placement","skidding"])],X.prototype,"handleOptionsChange",1);n([T("disabled")],X.prototype,"handleDisabledChange",1);R("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});R("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});X.define("sl-tooltip");var yn=$`
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
`,Y=class extends M{constructor(){super(...arguments),this.formControlController=new qt(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new qe(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return h`
      <div
        class=${z({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${z({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${k(this.value)}
            .indeterminate=${pi(this.indeterminate)}
            .checked=${pi(this.checked)}
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
    `}};Y.styles=[F,Ei,yn];Y.dependencies={"sl-icon":G};n([x('input[type="checkbox"]')],Y.prototype,"input",2);n([y()],Y.prototype,"hasFocus",2);n([c()],Y.prototype,"title",2);n([c()],Y.prototype,"name",2);n([c()],Y.prototype,"value",2);n([c({reflect:!0})],Y.prototype,"size",2);n([c({type:Boolean,reflect:!0})],Y.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],Y.prototype,"checked",2);n([c({type:Boolean,reflect:!0})],Y.prototype,"indeterminate",2);n([bo("checked")],Y.prototype,"defaultChecked",2);n([c({reflect:!0})],Y.prototype,"form",2);n([c({type:Boolean,reflect:!0})],Y.prototype,"required",2);n([c({attribute:"help-text"})],Y.prototype,"helpText",2);n([T("disabled",{waitUntilFirstUpdate:!0})],Y.prototype,"handleDisabledChange",1);n([T(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],Y.prototype,"handleStateChange",1);Y.define("sl-checkbox");var wn=$`
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
`,kn=$`
  :host {
    display: contents;
  }
`,Li=class extends M{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],t.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return h` <slot @slotchange=${this.handleSlotChange}></slot> `}};Li.styles=[F,kn];n([c({type:Boolean,reflect:!0})],Li.prototype,"disabled",2);n([T("disabled",{waitUntilFirstUpdate:!0})],Li.prototype,"handleDisabledChange",1);var Q=class extends M{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new ie(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const i=t.filter(({target:o})=>{if(o===this)return!0;if(o.closest("sl-tab-group")!==this)return!1;const s=o.tagName.toLowerCase();return s==="sl-tab"||s==="sl-tab-panel"});if(i.length!==0){if(i.some(o=>!["aria-labelledby","aria-controls"].includes(o.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(o=>o.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(o=>o.attributeName==="active")){const s=i.filter(a=>a.attributeName==="active"&&a.target.tagName.toLowerCase()==="sl-tab").map(a=>a.target).find(a=>a.active);s&&this.setActiveTab(s)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((i,o)=>{var s;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((s=this.getActiveTab())!=null?s:this.tabs[0],{emitEvents:!1}),o.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const i=e.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(e){const i=e.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const s=this.tabs.find(l=>l.matches(":focus")),a=this.localize.dir()==="rtl";let r=null;if((s==null?void 0:s.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")r=this.focusableTabs[0];else if(e.key==="End")r=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(a?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const l=this.tabs.findIndex(d=>d===s);r=this.findNextFocusableTab(l,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(a?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const l=this.tabs.findIndex(d=>d===s);r=this.findNextFocusableTab(l,"forward")}if(!r)return;r.tabIndex=0,r.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(r,{scrollBehavior:"smooth"}):this.tabs.forEach(l=>{l.tabIndex=l===r?0:-1}),["top","bottom"].includes(this.placement)&&oo(r,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=Ue({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const i=this.activeTab;this.activeTab=e,this.tabs.forEach(o=>{o.active=o===this.activeTab,o.tabIndex=o===this.activeTab?0:-1}),this.panels.forEach(o=>{var s;return o.active=o.name===((s=this.activeTab)==null?void 0:s.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&oo(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(i=>i.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,i=e.clientHeight,o=this.localize.dir()==="rtl",s=this.getAllTabs(),r=s.slice(0,s.indexOf(e)).reduce((l,d)=>({left:l.left+d.clientWidth,top:l.top+d.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=o?`${-1*r.left}px`:`${r.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${r.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let i=null;const o=t==="forward"?1:-1;let s=e+o;for(;e<this.tabs.length;){if(i=this.tabs[s]||null,i===null){t==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;s+=o}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(i=>i.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return h`
      <div
        part="base"
        class=${z({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${z({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
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
                  class=${z({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
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
    `}};Q.styles=[F,wn];Q.dependencies={"sl-icon-button":V,"sl-resize-observer":Li};n([x(".tab-group")],Q.prototype,"tabGroup",2);n([x(".tab-group__body")],Q.prototype,"body",2);n([x(".tab-group__nav")],Q.prototype,"nav",2);n([x(".tab-group__indicator")],Q.prototype,"indicator",2);n([y()],Q.prototype,"hasScrollControls",2);n([y()],Q.prototype,"shouldHideScrollStartButton",2);n([y()],Q.prototype,"shouldHideScrollEndButton",2);n([c()],Q.prototype,"placement",2);n([c()],Q.prototype,"activation",2);n([c({attribute:"no-scroll-controls",type:Boolean})],Q.prototype,"noScrollControls",2);n([c({attribute:"fixed-scroll-controls",type:Boolean})],Q.prototype,"fixedScrollControls",2);n([ka({passive:!0})],Q.prototype,"updateScrollButtons",1);n([T("noScrollControls",{waitUntilFirstUpdate:!0})],Q.prototype,"updateScrollControls",1);n([T("placement",{waitUntilFirstUpdate:!0})],Q.prototype,"syncIndicator",1);Q.define("sl-tab-group");var xn=(e,t)=>{let i=0;return function(...o){window.clearTimeout(i),i=window.setTimeout(()=>{e.call(this,...o)},t)}},Go=(e,t,i)=>{const o=e[t];e[t]=function(...s){o.call(this,...s),i.call(this,o,...s)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,i=new WeakMap,o=a=>{for(const r of a.changedTouches)t.add(r.identifier)},s=a=>{for(const r of a.changedTouches)t.delete(r.identifier)};document.addEventListener("touchstart",o,!0),document.addEventListener("touchend",s,!0),document.addEventListener("touchcancel",s,!0),Go(EventTarget.prototype,"addEventListener",function(a,r){if(r!=="scrollend")return;const l=xn(()=>{t.size?l():this.dispatchEvent(new Event("scrollend"))},100);a.call(this,"scroll",l,{passive:!0}),i.set(this,l)}),Go(EventTarget.prototype,"removeEventListener",function(a,r){if(r!=="scrollend")return;const l=i.get(this);l&&a.call(this,"scroll",l,{passive:!0})})}})();var _n=$`
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
`,Cn=0,Te=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.attrId=++Cn,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,h`
      <div
        part="base"
        class=${z({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
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
    `}};Te.styles=[F,_n];Te.dependencies={"sl-icon-button":V};n([x(".tab")],Te.prototype,"tab",2);n([c({reflect:!0})],Te.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],Te.prototype,"active",2);n([c({type:Boolean,reflect:!0})],Te.prototype,"closable",2);n([c({type:Boolean,reflect:!0})],Te.prototype,"disabled",2);n([c({type:Number,reflect:!0})],Te.prototype,"tabIndex",2);n([T("active")],Te.prototype,"handleActiveChange",1);n([T("disabled")],Te.prototype,"handleDisabledChange",1);Te.define("sl-tab");var $n=$`
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
`,Tn=0,Gt=class extends M{constructor(){super(...arguments),this.attrId=++Tn,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return h`
      <slot
        part="base"
        class=${z({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};Gt.styles=[F,$n];n([c({reflect:!0})],Gt.prototype,"name",2);n([c({type:Boolean,reflect:!0})],Gt.prototype,"active",2);n([T("active")],Gt.prototype,"handleActiveChange",1);Gt.define("sl-tab-panel");$i.define("sl-spinner");V.define("sl-icon-button");var Sn=$`
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
`,Se=class extends M{constructor(){super(...arguments),this.localize=new ie(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await U(this.body);const{keyframes:t,options:i}=B(this,"details.show",{dir:this.localize.dir()});await H(this.body,qo(t,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await U(this.body);const{keyframes:t,options:i}=B(this,"details.hide",{dir:this.localize.dir()});await H(this.body,qo(t,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,ne(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,ne(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return h`
      <details
        part="base"
        class=${z({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
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
    `}};Se.styles=[F,Sn];Se.dependencies={"sl-icon":G};n([x(".details")],Se.prototype,"details",2);n([x(".details__header")],Se.prototype,"header",2);n([x(".details__body")],Se.prototype,"body",2);n([x(".details__expand-icon-slot")],Se.prototype,"expandIconSlot",2);n([c({type:Boolean,reflect:!0})],Se.prototype,"open",2);n([c()],Se.prototype,"summary",2);n([c({type:Boolean,reflect:!0})],Se.prototype,"disabled",2);n([T("open",{waitUntilFirstUpdate:!0})],Se.prototype,"handleOpenChange",1);R("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});R("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});Se.define("sl-details");const En="modulepreload",Dn=function(e,t){return new URL(e,t).href},Xo={},Qo=function(t,i,o){let s=Promise.resolve();if(i&&i.length>0){const r=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),d=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));s=Promise.allSettled(i.map(u=>{if(u=Dn(u,o),u in Xo)return;Xo[u]=!0;const p=u.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(!!o)for(let b=r.length-1;b>=0;b--){const v=r[b];if(v.href===u&&(!p||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${f}`))return;const m=document.createElement("link");if(m.rel=p?"stylesheet":En,p||(m.as="script"),m.crossOrigin="",m.href=u,d&&m.setAttribute("nonce",d),document.head.appendChild(m),p)return new Promise((b,v)=>{m.addEventListener("load",b),m.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${u}`)))})}))}function a(r){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=r,window.dispatchEvent(l),!l.defaultPrevented)throw r}return s.then(r=>{for(const l of r||[])l.status==="rejected"&&a(l.reason);return t().catch(a)})};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let An=class extends Event{constructor(t,i,o,s){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i,this.callback=o,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class On{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,i=!1){const o=i||!Object.is(t,this.o);this.o=t,o&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:o}]of this.subscriptions)i(this.o,o)},t!==void 0&&(this.value=t)}addCallback(t,i,o){if(!o)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:i});const{disposer:s}=this.subscriptions.get(t);t(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let zn=class extends Event{constructor(t,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i}};class Jo extends On{constructor(t,i,o){var s,a;super(i.context!==void 0?i.initialValue:o),this.onContextRequest=r=>{if(r.context!==this.context)return;const l=r.contextTarget??r.composedPath()[0];l!==this.host&&(r.stopPropagation(),this.addCallback(r.callback,l,r.subscribe))},this.onProviderRequest=r=>{if(r.context!==this.context||(r.contextTarget??r.composedPath()[0])===this.host)return;const l=new Set;for(const[d,{consumerHost:u}]of this.subscriptions)l.has(d)||(l.add(d),u.dispatchEvent(new An(this.context,u,d,!0)));r.stopPropagation()},this.host=t,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(a=(s=this.host).addController)==null||a.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new zn(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Mn({context:e}){return(t,i)=>{const o=new WeakMap;if(typeof i=="object")return{get(){return t.get.call(this)},set(s){return o.get(this).setValue(s),t.set.call(this,s)},init(s){return o.set(this,new Jo(this,{context:e,initialValue:s})),s}};{t.constructor.addInitializer(r=>{o.set(r,new Jo(r,{context:e}))});const s=Object.getOwnPropertyDescriptor(t,i);let a;if(s===void 0){const r=new WeakMap;a={get(){return r.get(this)},set(l){o.get(this).setValue(l),r.set(this,l)},configurable:!0,enumerable:!0}}else{const r=s.set;a={...s,set(l){o.get(this).setValue(l),r==null||r.call(this,l)}}}return void Object.defineProperty(t,i,a)}}}var K={},Ii={};Object.defineProperty(Ii,"__esModule",{value:!0});Ii.StoreController=void 0;class Pn{constructor(t,i){this.host=t,this.atom=i,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}Ii.StoreController=Pn;var St={};Object.defineProperty(St,"__esModule",{value:!0});St.MultiStoreController=void 0;class Ln{constructor(t,i){this.host=t,this.atoms=i,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(i=>i())}get values(){return this.atoms.map(t=>t.get())}}St.MultiStoreController=Ln;var Ri={};Object.defineProperty(Ri,"__esModule",{value:!0});Ri.useStores=void 0;const In=St;function Rn(...e){return t=>class extends t{constructor(...i){super(...i),new In.MultiStoreController(this,e)}}}Ri.useStores=Rn;var Fi={};Object.defineProperty(Fi,"__esModule",{value:!0});Fi.withStores=void 0;const Fn=St,Nn=(e,t)=>class extends e{constructor(...o){super(...o),new Fn.MultiStoreController(this,t)}};Fi.withStores=Nn;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=Ii;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var i=St;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return i.MultiStoreController}});var o=Ri;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return o.useStores}});var s=Fi;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return s.withStores}})})(K);const Bn=Symbol("board"),Hn={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let xe=[],Xe=0;const oi=4;let di=0;const re=e=>{let t=[],i={get(){return i.lc||i.listen(()=>{})(),i.value},lc:0,listen(o){return i.lc=t.push(o),()=>{for(let a=Xe+oi;a<xe.length;)xe[a]===o?xe.splice(a,oi):a+=oi;let s=t.indexOf(o);~s&&(t.splice(s,1),--i.lc||i.off())}},notify(o,s){di++;let a=!xe.length;for(let r of t)xe.push(r,i.value,o,s);if(a){for(Xe=0;Xe<xe.length;Xe+=oi)xe[Xe](xe[Xe+1],xe[Xe+2],xe[Xe+3]);xe.length=0}},off(){},set(o){let s=i.value;s!==o&&(i.value=o,i.notify(s))},subscribe(o){let s=i.listen(o);return o(i.value),s},value:e};return i},jn=5,si=6,ai=10;let Vn=(e,t,i,o)=>(e.events=e.events||{},e.events[i+ai]||(e.events[i+ai]=o(s=>{e.events[i].reduceRight((a,r)=>(r(a),a),{shared:{},...s})})),e.events[i]=e.events[i]||[],e.events[i].push(t),()=>{let s=e.events[i],a=s.indexOf(t);s.splice(a,1),s.length||(delete e.events[i],e.events[i+ai](),delete e.events[i+ai])}),Wn=1e3,Un=(e,t)=>Vn(e,o=>{let s=t(o);s&&e.events[si].push(s)},jn,o=>{let s=e.listen;e.listen=(...r)=>(!e.lc&&!e.active&&(e.active=!0,o()),s(...r));let a=e.off;return e.events[si]=[],e.off=()=>{a(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let r of e.events[si])r();e.events[si]=[]}},Wn)},()=>{e.listen=s,e.off=a}}),qn=(e,t,i)=>{Array.isArray(e)||(e=[e]);let o,s,a=()=>{if(s===di)return;s=di;let u=e.map(p=>p.get());if(!o||u.some((p,f)=>p!==o[f])){o=u;let p=t(...u);p&&p.then&&p.t?p.then(f=>{o===u&&r.set(f)}):(r.set(p),s=di)}},r=re(void 0),l=r.get;r.get=()=>(a(),l());let d=a;return Un(r,()=>{let u=e.map(p=>p.listen(d));return a(),()=>{for(let p of u)p()}}),r};const ot=(e,t)=>qn(e,t),Yn=(e={})=>{let t=re(e);return t.setKey=function(i,o){let s=t.value;typeof o>"u"&&i in t.value?(t.value={...t.value},delete t.value[i],t.notify(s,i)):t.value[i]!==o&&(t.value={...t.value,[i]:o},t.notify(s,i))},t},Me=re(!1),Ht=re(null),Xt=re(!0),Kn=re(!1),Gn=ot([Me,Xt],(e,t)=>e&&!t);function Gi(e){Ht.set(e),Me.set(!0)}function Xn(){Me.set(!1),Ht.set(null),Xt.set(!0)}function Qn(e){Xt.set(e)}function Zo(e){Kn.set(e)}class Rs extends Error{constructor(t,i,o){super(t),this.status=i,this.body=o,this.name="ApiError"}}function jt(e){if(!e)return[];const t=[],i=e.split(`
`);for(const o of i){const s=o.trim();if(!s)continue;const a={text:s};if(s.length>=18&&s[4]==="-"&&s[7]==="-"&&s[10]===" "&&s[13]===":"){const r=s.indexOf(" - ",16);if(r!==-1){a.timestamp=s.slice(0,16);let l=s.slice(r+3);if(l.startsWith("(from: ")){const d=l.indexOf(") ");d!==-1?(a.author=l.slice(7,d),a.text=l.slice(d+2)):a.text=l}else a.text=l}}t.push(a)}return t}async function Jn(e,t){const i=e.startsWith("/")?"./"+e.slice(1):e,o=await fetch(i,t);if(!o.ok){const s=await o.text();throw new Rs(`API request failed: ${o.status} ${o.statusText}`,o.status,s)}return o.json()}async function Zn(){return Jn("/api/roadmap")}const ge=Yn({}),vi=re(null),Fs=re(""),Qt=re(!0),Ni=re(null),el=ot(ge,e=>Object.values(e)),tl=ot(ge,e=>{const t=Date.now()-432e5;return Object.values(e).filter(i=>i.type!=="epic"?!1:i.status!=="closed"?!0:i.closed_at?new Date(i.closed_at).getTime()>t:!1).map(i=>({id:i.id,title:i.title}))}),Bi=ot([ge,vi],(e,t)=>t&&e[t]||null),il=ot(Bi,e=>e?jt(e.notes):[]),ol=ot([ge,Bi],(e,t)=>{var i;return(i=t==null?void 0:t.blocked_by)!=null&&i.length?t.blocked_by.map(o=>{const s=e[o];return s?{id:s.id,title:s.title,status:s.status}:null}).filter(o=>o!==null):[]}),sl=ot([ge,Bi],(e,t)=>{if(!(t!=null&&t.parent))return"";const i=e[t.parent];return(i==null?void 0:i.title)||""});function al(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(i=>{const o=t[i];return o?o.status!=="closed":!1})}function yi(e,t={}){const i=al(e,t);let o;return e.status==="closed"?o="done":i?o="blocked":e.awaiting?o="human":e.status==="in_progress"?o="agent":o="ready",{...e,is_blocked:i,column:o}}function rl(e){const t={};for(const o of e)t[o.id]=o;const i={};for(const o of e)i[o.id]=yi(o,t);ge.set(i),Qt.set(!1),Ni.set(null)}function nl(e){const t={};for(const[o,s]of e)t[o]=s;const i={};for(const[o,s]of e)i[o]=yi(s,t);ge.set(i),Qt.set(!1),Ni.set(null)}function gt(e){var r;const t=ge.get(),i={};for(const[l,d]of Object.entries(t))i[l]=d;i[e.id]=e;const o=yi(e,i),s={...t};s[e.id]=o;const a=t[e.id];if((a==null?void 0:a.status)!==e.status)for(const[l,d]of Object.entries(t))l!==e.id&&(r=d.blocked_by)!=null&&r.includes(e.id)&&(s[l]=yi(d,i));ge.set(s)}function ll(e){const t=ge.get(),{[e]:i,...o}=t;ge.set(o),vi.get()===e&&vi.set(null)}function nt(e){vi.set(e)}function Ns(e){Fs.set(e)}function wi(e){Qt.set(e)}function Vt(e){Ni.set(e),Qt.set(!1)}function cl(e,t,i,o){if(e.status!=="closed"&&(e.awaiting||e.manual))return"gated";if(e.status==="closed")return"done";if(e.status==="open")for(const s of t){const a=i.get(s);if(a&&a.status!=="closed")return"queued"}return e.status==="in_progress"||o>0?"active":"ready"}function dl(e){const t=new Set,i=new Map;for(const f of e)f.type==="epic"&&(t.add(f.id),i.set(f.id,f));if(t.size===0)return{waves:null};const o=new Map,s=new Map;for(const f of e)f.parent&&t.has(f.parent)&&(o.set(f.parent,(o.get(f.parent)??0)+1),f.status==="closed"&&s.set(f.parent,(s.get(f.parent)??0)+1));const a=new Map;for(const[f,g]of i){const m=(g.blocked_by??[]).filter(b=>t.has(b));a.set(f,m)}const r=new Map,l=new Map;for(const f of i.keys())r.set(f,0);for(const[f,g]of a)for(const m of g){r.set(f,(r.get(f)??0)+1);const b=l.get(m)??[];b.push(f),l.set(m,b)}const d=[...i.keys()].sort(),u=new Set(d),p=[];for(;u.size>0;){const f=[];for(const m of d)u.has(m)&&r.get(m)===0&&f.push(m);if(f.length===0){const b=d.filter(v=>u.has(v)).map(v=>es(i.get(v),a.get(v)??[],i,o.get(v)??0,s.get(v)??0));p.push(b);break}const g=f.map(m=>es(i.get(m),a.get(m)??[],i,o.get(m)??0,s.get(m)??0));p.push(g);for(const m of f){u.delete(m);for(const b of l.get(m)??[])u.has(b)&&r.set(b,(r.get(b)??0)-1)}}return{waves:p}}function es(e,t,i,o,s){const a=cl(e,t,i,o);return{id:e.id,title:e.title,status:a,awaiting_type:a==="gated"?e.awaiting??"work":void 0,blocked_by:t.length>0?[...t]:void 0,children_total:o,children_closed:s}}const Bs=re(null),co=re(!1),uo=re(null);async function Hs(){co.set(!0),uo.set(null);try{let e;if(Me.get()){const t=ge.get();e=dl(Object.values(t))}else e=await Zn();Bs.set(e)}catch(e){uo.set(e instanceof Error?e.message:String(e))}finally{co.set(!1)}}typeof window<"u"&&window.addEventListener("tick-update-for-roadmap",()=>{Hs().catch(()=>{})});class ul extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class dt extends Error{constructor(t){super(t),this.name="ConnectionError"}}const hl="",ts=1e3,pl=3e4;class fl{constructor(t=hl){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.reconnectDelay=ts,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,i)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=ts,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",o=>{this.handleUpdateEvent(o)}),this.eventSource.onerror=()=>{var s;console.log("[LocalComms] SSE connection error");const o=this.connected;this.connected=!1,o&&this.emitConnection({type:"connection:disconnected"}),(s=this.eventSource)==null||s.close(),this.eventSource=null,this.scheduleReconnect(),o||i(new dt("Failed to connect to SSE endpoint"))}}catch(o){i(new dt(`Failed to create EventSource: ${o}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,pl)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}async createTick(t){const i=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!i.ok)throw new Error(`Failed to create tick: ${i.statusText}`);return i.json()}async updateTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!o.ok)throw new Error(`Failed to update tick: ${o.statusText}`);return o.json()}async deleteTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!i.ok)throw new Error(`Failed to delete tick: ${i.statusText}`)}async addNote(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:i})});if(!o.ok)throw new Error(`Failed to add note: ${o.statusText}`);return o.json()}async approveTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!i.ok)throw new Error(`Failed to approve tick: ${i.statusText}`);return i.json()}async rejectTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!o.ok)throw new Error(`Failed to reject tick: ${o.statusText}`);return o.json()}async closeTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!o.ok)throw new Error(`Failed to close tick: ${o.statusText}`);return o.json()}async reopenTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!i.ok)throw new Error(`Failed to reopen tick: ${i.statusText}`);return i.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(o=>({...o,is_blocked:o.isBlocked}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`Failed to fetch tick: ${i.statusText}`);return i.json()}async fetchActivity(t){const i=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,o=await fetch(i);if(!o.ok)throw new Error(`Failed to fetch activity: ${o.statusText}`);return(await o.json()).activities}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const i=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",i),i.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:o,tickId:s}=i;if(!s){console.warn("[LocalComms] Update event missing tickId:",i);return}o==="create"||o==="update"?this.fetchAndEmitTick(s):o==="delete"&&this.emitTick({type:"tick:deleted",tickId:s})}catch(i){console.error("[LocalComms] Failed to parse update event:",i)}}async fetchAndEmitTick(t){try{const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`HTTP ${i.status}`);const o=await i.json();this.emitTick({type:"tick:updated",tick:o})}catch(i){console.error(`[LocalComms] Failed to fetch tick ${t}:`,i),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${i}`})}}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(o){console.error("[LocalComms] Error in tick handler:",o)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(o){console.error("[LocalComms] Error in connection handler:",o)}}}const ml=10,bl=1e3,gl=3e4;class vl{constructor(t){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.tickCache=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,i)=>{try{const o=window.location.protocol==="https:"?"wss:":"ws:",s=window.location.host,a=localStorage.getItem("token")||"",r=`${o}//${s}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",r);const l=["ticks-v1",`token-${encodeURIComponent(a)}`];this.ws=new WebSocket(r,l);let d=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,d||(d=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=u=>{this.handleMessage(u)},this.ws.onclose=u=>{console.log("[CloudComms] WebSocket closed:",u.code,u.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),d||(d=!0,i(new dt(`WebSocket closed: ${u.code} ${u.reason}`)))},this.ws.onerror=u=>{console.error("[CloudComms] WebSocket error:",u),d||(d=!0,i(new dt("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(o){i(new dt(`Failed to create WebSocket: ${o}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=ml){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min(bl*Math.pow(2,this.reconnectAttempts),gl);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(i=>{console.error("[CloudComms] Reconnect failed:",i)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}async createTick(t){this.checkWritable();const i={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,awaiting:t.awaiting,owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async updateTick(t,i){this.checkWritable();const o={id:t,title:i.title||"",description:i.description||"",status:i.status||"open",priority:i.priority??2,labels:i.labels,blocked_by:i.blocked_by,type:"task",owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:o}),o}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,i){return this.checkWritable(),this.tickOperation(t,"note",{message:i})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,i){return this.checkWritable(),this.tickOperation(t,"reject",{reason:i})}async closeTick(t,i){return this.checkWritable(),this.tickOperation(t,"close",{reason:i})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const i of this.tickCache.values()){const o=(i.blocked_by||[]).some(a=>{const r=this.tickCache.get(a);return r?r.status!=="closed":!1});let s="ready";i.status==="closed"?s="done":o?s="blocked":i.awaiting?s="human":i.status==="in_progress"&&(s="agent"),t.push({...i,is_blocked:o,column:s})}return t}async fetchInfo(){const t=[];for(const i of this.tickCache.values())i.type==="epic"&&t.push({id:i.id,title:i.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const i=this.tickCache.get(t);if(!i)throw new Error(`Tick not found: ${t}`);const o=[];if(i.blocked_by&&i.blocked_by.length>0)for(const r of i.blocked_by){const l=this.tickCache.get(r);l?o.push({id:l.id,title:l.title,status:l.status}):o.push({id:r,title:`Tick ${r}`,status:"unknown"})}const s=o.some(r=>r.status!=="closed"&&r.status!=="unknown");let a="ready";return i.status==="closed"?a="done":s?a="blocked":i.awaiting?a="human":i.status==="in_progress"&&(a="agent"),{...i,isBlocked:s,column:a,notesList:jt(i.notes),blockerDetails:o}}async fetchActivity(t){return[]}handleMessage(t){try{const i=JSON.parse(t.data);switch(i.type){case"state_full":this.handleStateFullMessage(i);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(i);break;case"tick_deleted":this.handleTickDeleteMessage(i);break;case"connected":console.log("[CloudComms] Connection confirmed:",i.connectionId);break;case"error":console.error("[CloudComms] Server error:",i.message),this.emitConnection({type:"connection:error",message:i.message});break;case"local_status":this.handleLocalStatusMessage(i);break;case"run_event":break;default:console.warn("[CloudComms] Unknown message type:",i.type)}}catch(i){console.error("[CloudComms] Failed to parse message:",i)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[o,s]of Object.entries(t.ticks))this.tickCache.set(o,s);const i=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:i})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(o){console.error("[CloudComms] Error in tick handler:",o)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(o){console.error("[CloudComms] Error in connection handler:",o)}}checkWritable(){if(!this.connected)throw new dt("Not connected to server");if(!this.localAgentConnected)throw new ul("Cannot write: local agent is offline")}sendMessage(t){var i;if(((i=this.ws)==null?void 0:i.readyState)!==WebSocket.OPEN)throw new dt("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,i,o){const s=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${i}`,a=localStorage.getItem("token")||"",r=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",...a?{Authorization:`Bearer ${a}`}:{}},body:o?JSON.stringify(o):void 0});if(!r.ok){const l=await r.json().catch(()=>({error:r.statusText}));throw new Error(l.error||`Failed to ${i} tick`)}return r.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let i="";for(let o=0;o<3;o++)i+=t.charAt(Math.floor(Math.random()*t.length));return i}}const ht=re(null),pt=re("disconnected"),js=ot([pt,Me,Xt],(e,t,i)=>!t||e!=="connected"?e:i?"connected":"disconnected");function Vs(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),gt(e.tick),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),ll(e.tickId),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),nl(e.ticks),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function Ws(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),pt.set("connected"),Zo(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),pt.set("disconnected"),Zo(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),Qn(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),Vt(e.message);break}}let is=!1,xt=[];async function $o(){To(),console.log("[CommsStore] Initializing local mode"),pt.set("connecting"),wi(!0);const e=new fl;xt.push(e.onTick(Vs)),xt.push(e.onConnection(Ws)),ht.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),Vt(`Connection failed: ${t}`)}}async function ki(e){To(),console.log("[CommsStore] Initializing cloud mode for project:",e),pt.set("connecting"),wi(!0);const t=new vl(e);xt.push(t.onTick(Vs)),xt.push(t.onConnection(Ws)),ht.set(t),Ns(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(i){console.error("[CommsStore] Failed to connect:",i),Vt(`Connection failed: ${i}`)}}async function yl(){const e=Me.get(),t=Ht.get();e&&t?await ki(t):await $o()}function wl(){To(),pt.set("disconnected")}function To(){for(const t of xt)t();xt=[];const e=ht.get();e&&(e.disconnect(),ht.set(null))}function fe(){const e=ht.get();if(!e)throw new Error("CommsClient not initialized");return e}async function Us(e){return fe().createTick(e)}async function kl(e,t){return fe().updateTick(e,t)}async function xl(e){return fe().deleteTick(e)}async function qs(e,t){return fe().addNote(e,t)}async function Ys(e){return fe().approveTick(e)}async function Ks(e,t){return fe().rejectTick(e,t)}async function Gs(e,t){return fe().closeTick(e,t)}async function Xs(e){return fe().reopenTick(e)}async function Qs(){return fe().fetchTicks()}async function Js(){return fe().fetchInfo()}async function So(e){return fe().fetchTick(e)}async function Eo(e){return fe().fetchActivity(e)}function Zs(){if(is){console.log("[CommsStore] Already initialized, skipping");return}is=!0,console.log("[CommsStore] Setting up auto-connect"),Me.subscribe(e=>{const t=Ht.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?ki(t):e||$o()}),Ht.subscribe(e=>{const t=Me.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!ht.get()&&ki(e)})}const os=Object.freeze(Object.defineProperty({__proto__:null,$commsClient:ht,$connectionStatus:pt,$effectiveConnectionStatus:js,addNote:qs,approveTick:Ys,closeTick:Gs,createTick:Us,deleteTick:xl,disconnectComms:wl,fetchActivity:Eo,fetchInfo:Js,fetchTickDetails:So,fetchTicks:Qs,getCommsClient:fe,initCloudComms:ki,initComms:yl,initCommsAutoConnect:Zs,initLocalComms:$o,rejectTick:Ks,reopenTick:Xs,updateTickViaComms:kl},Symbol.toStringTag,{value:"Module"}));var _l=Object.defineProperty,Cl=Object.getOwnPropertyDescriptor,Hi=(e,t,i,o)=>{for(var s=o>1?void 0:o?Cl(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&_l(t,i,s),s};const $l={done:"var(--green, #a6e3a1)",active:"var(--blue, #89b4fa)",ready:"var(--yellow, #f9e2af)",queued:"var(--surface2, #585b70)",gated:"var(--peach, #fab387)"},Tl={done:"Done",active:"Active",ready:"Needs planning",queued:"Queued",gated:"Gated"};let _t=class extends $e{constructor(){super(...arguments),this.roadmap=null,this.loading=!1,this.error=null}_close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){nt(e),this._close()}_pct(e){return e.children_total===0?0:Math.round(e.children_closed/e.children_total*100)}_renderEpicCard(e){const t=$l[e.status]??"var(--surface2)",i=this._pct(e);return h`
      <div
        class="epic-card"
        style="--accent-color: ${t}"
        @click=${()=>this._handleEpicClick(e.id)}
        role="button"
        tabindex="0"
        @keydown=${o=>{(o.key==="Enter"||o.key===" ")&&this._handleEpicClick(e.id)}}
        aria-label="Open epic ${e.id}: ${e.title}"
      >
        <div class="status-dot"></div>

        <div class="epic-info">
          <div class="epic-top">
            <span class="epic-id">${e.id}</span>
            <span class="epic-title">${e.title}</span>
          </div>

          <div class="badges">
            <span class="badge badge-status">${Tl[e.status]}</span>

            ${e.awaiting_type?h`<span class="badge badge-awaiting">⏳ ${e.awaiting_type}</span>`:w}

            ${e.blocked_by&&e.blocked_by.length>0?e.blocked_by.map(o=>h`
                  <span class="badge badge-blocked">⊘ ${o}</span>
                `):w}
          </div>
        </div>

        <div class="progress-chip">
          <span class="progress-text">${e.children_closed}/${e.children_total}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${i}%"></div>
          </div>
        </div>
      </div>
    `}_renderWave(e,t){return h`
      <div class="wave-group">
        <div class="wave-label">Wave ${t+1}</div>
        ${e.map(i=>this._renderEpicCard(i))}
      </div>
    `}_renderBody(){var t;if(this.loading)return h`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;if(this.error)return h`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;const e=((t=this.roadmap)==null?void 0:t.waves)??null;return!e||e.length===0?h`<div class="state-box">No epics found — roadmap is empty.</div>`:h`
      <div class="body">
        ${e.map((i,o)=>this._renderWave(i,o))}
      </div>
    `}render(){return h`
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
    `}};_t.styles=$`
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
  `;Hi([c({attribute:!1})],_t.prototype,"roadmap",2);Hi([c({type:Boolean})],_t.prototype,"loading",2);Hi([c({attribute:!1})],_t.prototype,"error",2);_t=Hi([Le("roadmap-view")],_t);var Sl=Object.defineProperty,El=Object.getOwnPropertyDescriptor,le=(e,t,i,o)=>{for(var s=o>1?void 0:o?El(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&Sl(t,i,s),s};console.log("[TickBoard] Initializing comms module");Zs();const Xi=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Ae=["blocked","ready","agent","human","done"];let ee=class extends $e{constructor(){super(...arguments),this.boardState={...Hn},this.ticksController=new K.StoreController(this,el),this.epicsController=new K.StoreController(this,tl),this.repoNameController=new K.StoreController(this,Fs),this.selectedTickController=new K.StoreController(this,Bi),this.selectedTickNotesController=new K.StoreController(this,il),this.selectedTickBlockersController=new K.StoreController(this,ol),this.selectedTickParentTitleController=new K.StoreController(this,sl),this.loadingController=new K.StoreController(this,Qt),this.errorController=new K.StoreController(this,Ni),this.isCloudModeController=new K.StoreController(this,Me),this.localClientConnectedController=new K.StoreController(this,Xt),this.isReadOnlyController=new K.StoreController(this,Gn),this.connectionStatusController=new K.StoreController(this,js),this.roadmapController=new K.StoreController(this,Bs),this.roadmapLoadingController=new K.StoreController(this,co),this.roadmapErrorController=new K.StoreController(this,uo),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showDashboard=!1,this.dashboardActivities=[],this.showRoadmap=!1,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused())&&!(this.showDashboard&&e.key!=="Escape"&&e.key!=="d"&&e.key!=="m"&&e.key!=="?")&&!(this.showRoadmap&&e.key!=="Escape"&&e.key!=="m"&&e.key!=="?"))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"d":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleDashboard());break;case"m":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRoadmap());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}get roadmapData(){return this.roadmapController.value}get roadmapLoading(){return this.roadmapLoadingController.value}get roadmapError(){return this.roadmapErrorController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.isCloudMode||this.loadData()}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const i=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",i),Gi(i);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),Gi(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const i=new URLSearchParams(window.location.search).get("project");if(i){console.log("[TickBoard] Cloud mode from query param, project:",i),Gi(i);return}}console.log("[TickBoard] Local mode"),Xn()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),wi(!0);return}wi(!0),Vt(null);try{const[e,t]=await Promise.all([Qs(),Js()]);rl(e),Ns(t.repoName),this.updateBoardState()}catch(e){Vt(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown)}isInputFocused(){var o;let e=document.activeElement;for(;(o=e==null?void 0:e.shadowRoot)!=null&&o.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let i=e;for(;i;){const s=i.tagName.toLowerCase();if(s.startsWith("sl-")&&(s.includes("input")||s.includes("textarea")||s.includes("select")))return!0;const a=i.getRootNode();i=a instanceof ShadowRoot?a.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Ae.length?[]:this.getColumnTicks(Ae[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Ae.length;e++)if(this.getColumnTicks(Ae[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let i=this.focusedTickIndex+e;i<0?i=t.length-1:i>=t.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Ae.length-1:t>=Ae.length&&(t=0),this.focusedColumnIndex=t;const i=this.getColumnTicks(Ae[t]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Ae[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&nt(e[this.focusedTickIndex].id)}handleEscape(){this.showRoadmap?this.showRoadmap=!1:this.showDashboard?this.showDashboard=!1:this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?nt(null):this.clearFocus()}async toggleDashboard(){if(this.showDashboard=!this.showDashboard,this.showDashboard)try{this.dashboardActivities=await Eo(20)}catch{this.dashboardActivities=[]}}async toggleRoadmap(){this.showRoadmap=!this.showRoadmap,this.showRoadmap&&await Hs()}handleDashboardEpicSelect(e){this.selectedEpic=e.detail.epicId,this.showDashboard=!1,this.updateBoardState()}handleDashboardTickSelect(e){nt(e.detail.tickId),this.showDashboard=!1}async handleDashboardTickResume(e){var i,o,s;const{tickId:t}=e.detail;try{const a=await Qo(()=>Promise.resolve().then(()=>os),void 0,import.meta.url).then(r=>r.approveTick(t));gt({...a,is_blocked:(((i=a.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),(o=window.showToast)==null||o.call(window,{message:`Resumed tick ${t}`,variant:"success"})}catch(a){(s=window.showToast)==null||s.call(window,{message:`Failed to resume ${t}: ${a instanceof Error?a.message:a}`,variant:"danger"})}}async handleDashboardTickRetry(e){var i,o,s;const{tickId:t}=e.detail;try{const a=await Qo(()=>Promise.resolve().then(()=>os),void 0,import.meta.url).then(r=>r.reopenTick(t));gt({...a,is_blocked:(((i=a.blocked_by)==null?void 0:i.length)??0)>0,column:"ready"}),(o=window.showToast)==null||o.call(window,{message:`Retrying tick ${t}`,variant:"success"})}catch(a){(s=window.showToast)==null||s.call(window,{message:`Failed to retry ${t}: ${a instanceof Error?a.message:a}`,variant:"danger"})}}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const i=e.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var i;const{tick:t}=e.detail;gt(t),this.showCreateDialog=!1,this.updateBoardState(),(i=window.showToast)==null||i.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const i=e.target.querySelector("sl-tab[active]");if(i){const o=i.getAttribute("panel");o&&Ae.includes(o)&&(this.activeColumn=o,this.focusedColumnIndex=Ae.indexOf(o),this.focusedTickIndex=this.getColumnTicks(o).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,i=this.ticks.find(o=>o.id===t);i?nt(i.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(nt(t.id),!this.isCloudMode)try{const i=await So(t.id);gt(i)}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){nt(null)}handleTickUpdated(e){const{tick:t}=e.detail;gt(t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(i=>i.id.toLowerCase().includes(t)||i.title.toLowerCase().includes(t)||i.description&&i.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}render(){if(this.loading)return h`
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
            ${Xi.map((t,i)=>h`
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
          ${Xi.map(t=>h`
            <sl-tab
              slot="nav"
              panel=${t.id}
              ?active=${this.activeColumn===t.id}
            >
              ${t.icon}
              <span class="tab-badge">${this.getColumnTicks(t.id).length}</span>
            </sl-tab>
          `)}
          ${Xi.map((t,i)=>h`
            <sl-tab-panel name=${t.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(t.id).length===0?h`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${t.icon}</div>
                        <div>No ticks in ${t.name}</div>
                      </div>
                    `:this.getColumnTicks(t.id).map(o=>h`
                      <tick-card
                        .tick=${o}
                        epic-name=${e[o.parent||""]||""}
                        ?focused=${this.focusedColumnIndex===i&&this.getFocusedTickId()===o.id}
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
              ${this.epics.map(t=>h`
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
      ${this.showRoadmap?h`
        <roadmap-view
          .roadmap=${this.roadmapData??null}
          .loading=${this.roadmapLoading??!1}
          .error=${this.roadmapError??null}
          @close=${()=>{this.showRoadmap=!1}}
        ></roadmap-view>
      `:w}

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
    `}};ee.styles=$`
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
  `;le([Mn({context:Bn}),y()],ee.prototype,"boardState",2);le([y()],ee.prototype,"selectedEpic",2);le([y()],ee.prototype,"searchTerm",2);le([y()],ee.prototype,"activeColumn",2);le([y()],ee.prototype,"isMobile",2);le([y()],ee.prototype,"focusedColumnIndex",2);le([y()],ee.prototype,"focusedTickIndex",2);le([y()],ee.prototype,"showKeyboardHelp",2);le([y()],ee.prototype,"showCreateDialog",2);le([y()],ee.prototype,"showMobileFilterDrawer",2);le([y()],ee.prototype,"showDashboard",2);le([y()],ee.prototype,"dashboardActivities",2);le([y()],ee.prototype,"showRoadmap",2);ee=le([Le("tick-board")],ee);const ea=6048e5,Dl=864e5,Al=6e4,Ol=36e5,ri=43200,ss=1440,as=Symbol.for("constructDateFrom");function Ve(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&as in e?e[as](t):e instanceof Date?new e.constructor(t):new Date(t)}function q(e,t){return Ve(t||e,e)}let zl={};function Jt(){return zl}function Wt(e,t){var l,d,u,p;const i=Jt(),o=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,s=q(e,t==null?void 0:t.in),a=s.getDay(),r=(a<o?7:0)+a-o;return s.setDate(s.getDate()-r),s.setHours(0,0,0,0),s}function xi(e,t){return Wt(e,{...t,weekStartsOn:1})}function ta(e,t){const i=q(e,t==null?void 0:t.in),o=i.getFullYear(),s=Ve(i,0);s.setFullYear(o+1,0,4),s.setHours(0,0,0,0);const a=xi(s),r=Ve(i,0);r.setFullYear(o,0,4),r.setHours(0,0,0,0);const l=xi(r);return i.getTime()>=a.getTime()?o+1:i.getTime()>=l.getTime()?o:o-1}function _i(e){const t=q(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Zt(e,...t){const i=Ve.bind(null,e||t.find(o=>typeof o=="object"));return t.map(i)}function rs(e,t){const i=q(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Ml(e,t,i){const[o,s]=Zt(i==null?void 0:i.in,e,t),a=rs(o),r=rs(s),l=+a-_i(a),d=+r-_i(r);return Math.round((l-d)/Dl)}function Pl(e,t){const i=ta(e,t),o=Ve(e,0);return o.setFullYear(i,0,4),o.setHours(0,0,0,0),xi(o)}function ui(e,t){const i=+q(e)-+q(t);return i<0?-1:i>0?1:i}function Ll(e){return Ve(e,Date.now())}function Il(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Rl(e){return!(!Il(e)&&typeof e!="number"||isNaN(+q(e)))}function Fl(e,t,i){const[o,s]=Zt(i==null?void 0:i.in,e,t),a=o.getFullYear()-s.getFullYear(),r=o.getMonth()-s.getMonth();return a*12+r}function Do(e){return t=>{const o=(e?Math[e]:Math.trunc)(t);return o===0?0:o}}function Nl(e,t,i){const[o,s]=Zt(i==null?void 0:i.in,e,t),a=(+o-+s)/Ol;return Do(i==null?void 0:i.roundingMethod)(a)}function ia(e,t){return+q(e)-+q(t)}function Bl(e,t,i){const o=ia(e,t)/Al;return Do(i==null?void 0:i.roundingMethod)(o)}function Hl(e,t){const i=q(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function jl(e,t){const i=q(e,t==null?void 0:t.in),o=i.getMonth();return i.setFullYear(i.getFullYear(),o+1,0),i.setHours(23,59,59,999),i}function Vl(e,t){const i=q(e,t==null?void 0:t.in);return+Hl(i,t)==+jl(i,t)}function Wl(e,t,i){const[o,s,a]=Zt(i==null?void 0:i.in,e,e,t),r=ui(s,a),l=Math.abs(Fl(s,a));if(l<1)return 0;s.getMonth()===1&&s.getDate()>27&&s.setDate(30),s.setMonth(s.getMonth()-r*l);let d=ui(s,a)===-r;Vl(o)&&l===1&&ui(o,a)===1&&(d=!1);const u=r*(l-+d);return u===0?0:u}function Ul(e,t,i){const o=ia(e,t)/1e3;return Do(i==null?void 0:i.roundingMethod)(o)}function ql(e,t){const i=q(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}const Yl={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Kl=(e,t,i)=>{let o;const s=Yl[e];return typeof s=="string"?o=s:t===1?o=s.one:o=s.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+o:o+" ago":o};function Qi(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const Gl={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},Xl={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ql={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Jl={date:Qi({formats:Gl,defaultWidth:"full"}),time:Qi({formats:Xl,defaultWidth:"full"}),dateTime:Qi({formats:Ql,defaultWidth:"full"})},Zl={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},ec=(e,t,i,o)=>Zl[e];function Lt(e){return(t,i)=>{const o=i!=null&&i.context?String(i.context):"standalone";let s;if(o==="formatting"&&e.formattingValues){const r=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):r;s=e.formattingValues[l]||e.formattingValues[r]}else{const r=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;s=e.values[l]||e.values[r]}const a=e.argumentCallback?e.argumentCallback(t):t;return s[a]}}const tc={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},ic={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},oc={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},sc={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},ac={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},rc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},nc=(e,t)=>{const i=Number(e),o=i%100;if(o>20||o<10)switch(o%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},lc={ordinalNumber:nc,era:Lt({values:tc,defaultWidth:"wide"}),quarter:Lt({values:ic,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Lt({values:oc,defaultWidth:"wide"}),day:Lt({values:sc,defaultWidth:"wide"}),dayPeriod:Lt({values:ac,defaultWidth:"wide",formattingValues:rc,defaultFormattingWidth:"wide"})};function It(e){return(t,i={})=>{const o=i.width,s=o&&e.matchPatterns[o]||e.matchPatterns[e.defaultMatchWidth],a=t.match(s);if(!a)return null;const r=a[0],l=o&&e.parsePatterns[o]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?dc(l,f=>f.test(r)):cc(l,f=>f.test(r));let u;u=e.valueCallback?e.valueCallback(d):d,u=i.valueCallback?i.valueCallback(u):u;const p=t.slice(r.length);return{value:u,rest:p}}}function cc(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function dc(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function uc(e){return(t,i={})=>{const o=t.match(e.matchPattern);if(!o)return null;const s=o[0],a=t.match(e.parsePattern);if(!a)return null;let r=e.valueCallback?e.valueCallback(a[0]):a[0];r=i.valueCallback?i.valueCallback(r):r;const l=t.slice(s.length);return{value:r,rest:l}}}const hc=/^(\d+)(th|st|nd|rd)?/i,pc=/\d+/i,fc={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},mc={any:[/^b/i,/^(a|c)/i]},bc={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},gc={any:[/1/i,/2/i,/3/i,/4/i]},vc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},yc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},wc={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},kc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},xc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},_c={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Cc={ordinalNumber:uc({matchPattern:hc,parsePattern:pc,valueCallback:e=>parseInt(e,10)}),era:It({matchPatterns:fc,defaultMatchWidth:"wide",parsePatterns:mc,defaultParseWidth:"any"}),quarter:It({matchPatterns:bc,defaultMatchWidth:"wide",parsePatterns:gc,defaultParseWidth:"any",valueCallback:e=>e+1}),month:It({matchPatterns:vc,defaultMatchWidth:"wide",parsePatterns:yc,defaultParseWidth:"any"}),day:It({matchPatterns:wc,defaultMatchWidth:"wide",parsePatterns:kc,defaultParseWidth:"any"}),dayPeriod:It({matchPatterns:xc,defaultMatchWidth:"any",parsePatterns:_c,defaultParseWidth:"any"})},oa={code:"en-US",formatDistance:Kl,formatLong:Jl,formatRelative:ec,localize:lc,match:Cc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function $c(e,t){const i=q(e,t==null?void 0:t.in);return Ml(i,ql(i))+1}function Tc(e,t){const i=q(e,t==null?void 0:t.in),o=+xi(i)-+Pl(i);return Math.round(o/ea)+1}function sa(e,t){var p,f,g,m;const i=q(e,t==null?void 0:t.in),o=i.getFullYear(),s=Jt(),a=(t==null?void 0:t.firstWeekContainsDate)??((f=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??s.firstWeekContainsDate??((m=(g=s.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,r=Ve((t==null?void 0:t.in)||e,0);r.setFullYear(o+1,0,a),r.setHours(0,0,0,0);const l=Wt(r,t),d=Ve((t==null?void 0:t.in)||e,0);d.setFullYear(o,0,a),d.setHours(0,0,0,0);const u=Wt(d,t);return+i>=+l?o+1:+i>=+u?o:o-1}function Sc(e,t){var l,d,u,p;const i=Jt(),o=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,s=sa(e,t),a=Ve((t==null?void 0:t.in)||e,0);return a.setFullYear(s,0,o),a.setHours(0,0,0,0),Wt(a,t)}function Ec(e,t){const i=q(e,t==null?void 0:t.in),o=+Wt(i,t)-+Sc(i,t);return Math.round(o/ea)+1}function O(e,t){const i=e<0?"-":"",o=Math.abs(e).toString().padStart(t,"0");return i+o}const Qe={y(e,t){const i=e.getFullYear(),o=i>0?i:1-i;return O(t==="yy"?o%100:o,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):O(i+1,2)},d(e,t){return O(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return O(e.getHours()%12||12,t.length)},H(e,t){return O(e.getHours(),t.length)},m(e,t){return O(e.getMinutes(),t.length)},s(e,t){return O(e.getSeconds(),t.length)},S(e,t){const i=t.length,o=e.getMilliseconds(),s=Math.trunc(o*Math.pow(10,i-3));return O(s,t.length)}},bt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},ns={G:function(e,t,i){const o=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(o,{width:"abbreviated"});case"GGGGG":return i.era(o,{width:"narrow"});case"GGGG":default:return i.era(o,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const o=e.getFullYear(),s=o>0?o:1-o;return i.ordinalNumber(s,{unit:"year"})}return Qe.y(e,t)},Y:function(e,t,i,o){const s=sa(e,o),a=s>0?s:1-s;if(t==="YY"){const r=a%100;return O(r,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):O(a,t.length)},R:function(e,t){const i=ta(e);return O(i,t.length)},u:function(e,t){const i=e.getFullYear();return O(i,t.length)},Q:function(e,t,i){const o=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(o);case"QQ":return O(o,2);case"Qo":return i.ordinalNumber(o,{unit:"quarter"});case"QQQ":return i.quarter(o,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(o,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(o,{width:"wide",context:"formatting"})}},q:function(e,t,i){const o=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(o);case"qq":return O(o,2);case"qo":return i.ordinalNumber(o,{unit:"quarter"});case"qqq":return i.quarter(o,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(o,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(o,{width:"wide",context:"standalone"})}},M:function(e,t,i){const o=e.getMonth();switch(t){case"M":case"MM":return Qe.M(e,t);case"Mo":return i.ordinalNumber(o+1,{unit:"month"});case"MMM":return i.month(o,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(o,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(o,{width:"wide",context:"formatting"})}},L:function(e,t,i){const o=e.getMonth();switch(t){case"L":return String(o+1);case"LL":return O(o+1,2);case"Lo":return i.ordinalNumber(o+1,{unit:"month"});case"LLL":return i.month(o,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(o,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(o,{width:"wide",context:"standalone"})}},w:function(e,t,i,o){const s=Ec(e,o);return t==="wo"?i.ordinalNumber(s,{unit:"week"}):O(s,t.length)},I:function(e,t,i){const o=Tc(e);return t==="Io"?i.ordinalNumber(o,{unit:"week"}):O(o,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):Qe.d(e,t)},D:function(e,t,i){const o=$c(e);return t==="Do"?i.ordinalNumber(o,{unit:"dayOfYear"}):O(o,t.length)},E:function(e,t,i){const o=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(o,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(o,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(o,{width:"short",context:"formatting"});case"EEEE":default:return i.day(o,{width:"wide",context:"formatting"})}},e:function(e,t,i,o){const s=e.getDay(),a=(s-o.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return O(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(s,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(s,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(s,{width:"short",context:"formatting"});case"eeee":default:return i.day(s,{width:"wide",context:"formatting"})}},c:function(e,t,i,o){const s=e.getDay(),a=(s-o.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return O(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(s,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(s,{width:"narrow",context:"standalone"});case"cccccc":return i.day(s,{width:"short",context:"standalone"});case"cccc":default:return i.day(s,{width:"wide",context:"standalone"})}},i:function(e,t,i){const o=e.getDay(),s=o===0?7:o;switch(t){case"i":return String(s);case"ii":return O(s,t.length);case"io":return i.ordinalNumber(s,{unit:"day"});case"iii":return i.day(o,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(o,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(o,{width:"short",context:"formatting"});case"iiii":default:return i.day(o,{width:"wide",context:"formatting"})}},a:function(e,t,i){const s=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},b:function(e,t,i){const o=e.getHours();let s;switch(o===12?s=bt.noon:o===0?s=bt.midnight:s=o/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},B:function(e,t,i){const o=e.getHours();let s;switch(o>=17?s=bt.evening:o>=12?s=bt.afternoon:o>=4?s=bt.morning:s=bt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let o=e.getHours()%12;return o===0&&(o=12),i.ordinalNumber(o,{unit:"hour"})}return Qe.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):Qe.H(e,t)},K:function(e,t,i){const o=e.getHours()%12;return t==="Ko"?i.ordinalNumber(o,{unit:"hour"}):O(o,t.length)},k:function(e,t,i){let o=e.getHours();return o===0&&(o=24),t==="ko"?i.ordinalNumber(o,{unit:"hour"}):O(o,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):Qe.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):Qe.s(e,t)},S:function(e,t){return Qe.S(e,t)},X:function(e,t,i){const o=e.getTimezoneOffset();if(o===0)return"Z";switch(t){case"X":return cs(o);case"XXXX":case"XX":return lt(o);case"XXXXX":case"XXX":default:return lt(o,":")}},x:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"x":return cs(o);case"xxxx":case"xx":return lt(o);case"xxxxx":case"xxx":default:return lt(o,":")}},O:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+ls(o,":");case"OOOO":default:return"GMT"+lt(o,":")}},z:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+ls(o,":");case"zzzz":default:return"GMT"+lt(o,":")}},t:function(e,t,i){const o=Math.trunc(+e/1e3);return O(o,t.length)},T:function(e,t,i){return O(+e,t.length)}};function ls(e,t=""){const i=e>0?"-":"+",o=Math.abs(e),s=Math.trunc(o/60),a=o%60;return a===0?i+String(s):i+String(s)+t+O(a,2)}function cs(e,t){return e%60===0?(e>0?"-":"+")+O(Math.abs(e)/60,2):lt(e,t)}function lt(e,t=""){const i=e>0?"-":"+",o=Math.abs(e),s=O(Math.trunc(o/60),2),a=O(o%60,2);return i+s+t+a}const ds=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},aa=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Dc=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],o=i[1],s=i[2];if(!s)return ds(e,t);let a;switch(o){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",ds(o,t)).replace("{{time}}",aa(s,t))},Ac={p:aa,P:Dc},Oc=/^D+$/,zc=/^Y+$/,Mc=["D","DD","YY","YYYY"];function Pc(e){return Oc.test(e)}function Lc(e){return zc.test(e)}function Ic(e,t,i){const o=Rc(e,t,i);if(console.warn(o),Mc.includes(e))throw new RangeError(o)}function Rc(e,t,i){const o=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${o} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Fc=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Nc=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Bc=/^'([^]*?)'?$/,Hc=/''/g,jc=/[a-zA-Z]/;function Vc(e,t,i){var p,f,g,m;const o=Jt(),s=o.locale??oa,a=o.firstWeekContainsDate??((f=(p=o.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??1,r=o.weekStartsOn??((m=(g=o.locale)==null?void 0:g.options)==null?void 0:m.weekStartsOn)??0,l=q(e,i==null?void 0:i.in);if(!Rl(l))throw new RangeError("Invalid time value");let d=t.match(Nc).map(b=>{const v=b[0];if(v==="p"||v==="P"){const C=Ac[v];return C(b,s.formatLong)}return b}).join("").match(Fc).map(b=>{if(b==="''")return{isToken:!1,value:"'"};const v=b[0];if(v==="'")return{isToken:!1,value:Wc(b)};if(ns[v])return{isToken:!0,value:b};if(v.match(jc))throw new RangeError("Format string contains an unescaped latin alphabet character `"+v+"`");return{isToken:!1,value:b}});s.localize.preprocessor&&(d=s.localize.preprocessor(l,d));const u={firstWeekContainsDate:a,weekStartsOn:r,locale:s};return d.map(b=>{if(!b.isToken)return b.value;const v=b.value;(Lc(v)||Pc(v))&&Ic(v,t,String(e));const C=ns[v[0]];return C(l,v,s.localize,u)}).join("")}function Wc(e){const t=e.match(Bc);return t?t[1].replace(Hc,"'"):e}function Uc(e,t,i){const o=Jt(),s=(i==null?void 0:i.locale)??o.locale??oa,a=2520,r=ui(e,t);if(isNaN(r))throw new RangeError("Invalid time value");const l=Object.assign({},i,{addSuffix:i==null?void 0:i.addSuffix,comparison:r}),[d,u]=Zt(i==null?void 0:i.in,...r>0?[t,e]:[e,t]),p=Ul(u,d),f=(_i(u)-_i(d))/1e3,g=Math.round((p-f)/60);let m;if(g<2)return i!=null&&i.includeSeconds?p<5?s.formatDistance("lessThanXSeconds",5,l):p<10?s.formatDistance("lessThanXSeconds",10,l):p<20?s.formatDistance("lessThanXSeconds",20,l):p<40?s.formatDistance("halfAMinute",0,l):p<60?s.formatDistance("lessThanXMinutes",1,l):s.formatDistance("xMinutes",1,l):g===0?s.formatDistance("lessThanXMinutes",1,l):s.formatDistance("xMinutes",g,l);if(g<45)return s.formatDistance("xMinutes",g,l);if(g<90)return s.formatDistance("aboutXHours",1,l);if(g<ss){const b=Math.round(g/60);return s.formatDistance("aboutXHours",b,l)}else{if(g<a)return s.formatDistance("xDays",1,l);if(g<ri){const b=Math.round(g/ss);return s.formatDistance("xDays",b,l)}else if(g<ri*2)return m=Math.round(g/ri),s.formatDistance("aboutXMonths",m,l)}if(m=Wl(u,d),m<12){const b=Math.round(g/ri);return s.formatDistance("xMonths",b,l)}else{const b=m%12,v=Math.trunc(m/12);return b<3?s.formatDistance("aboutXYears",v,l):b<9?s.formatDistance("overXYears",v,l):s.formatDistance("almostXYears",v+1,l)}}function qc(e,t){return Uc(e,Ll(e),t)}var Yc=Object.defineProperty,Kc=Object.getOwnPropertyDescriptor,mt=(e,t,i,o)=>{for(var s=o>1?void 0:o?Kc(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&Yc(t,i,s),s};const us={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Gc={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let We=class extends $e{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),e.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var a;if(((a=this.tick)==null?void 0:a.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const e=new Date(this.tick.started_at),t=new Date,i=Bl(t,e),o=Nl(t,e),s=i%60;o>0?this.elapsedTime=`${o}h ${s}m`:this.elapsedTime=`${i}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return us[this.tick.priority]??us[2]}getPriorityLabel(){return Gc[this.tick.priority]??"Unknown"}renderElapsedBadge(){if(!this.elapsedTime||!this.tick.started_at)return null;const e=new Date(this.tick.started_at).toLocaleString();return h`
      <sl-tooltip content="Started: ${e}">
        <span class="meta-badge elapsed-time">⏱ ${this.elapsedTime}</span>
      </sl-tooltip>
    `}render(){const{tick:e,selected:t,focused:i,epicName:o}=this;return h`
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
          ${e.is_blocked?h`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${e.manual?h`<span class="meta-badge manual">👤 manual</span>`:null}
          ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:null}
          ${this.renderElapsedBadge()}
        </div>

        ${o?h`<div class="epic-name">${o}</div>`:null}
      </div>
    `}};We.styles=$`
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

    .meta-badge.elapsed-time {
      background: rgba(250, 179, 135, 0.15);
      color: var(--peach);
    }
  `;mt([c({attribute:!1})],We.prototype,"tick",2);mt([c({type:Boolean})],We.prototype,"selected",2);mt([c({type:Boolean})],We.prototype,"focused",2);mt([c({type:String,attribute:"epic-name"})],We.prototype,"epicName",2);mt([x(".card")],We.prototype,"cardElement",2);mt([y()],We.prototype,"elapsedTime",2);We=mt([Le("tick-card")],We);var Xc=Object.defineProperty,Qc=Object.getOwnPropertyDescriptor,Et=(e,t,i,o)=>{for(var s=o>1?void 0:o?Qc(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&Xc(t,i,s),s};const Jc={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},Zc={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},ed={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let tt=class extends $e{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||Jc[this.name]||"var(--blue)"}getColumnDisplayName(){return Zc[this.name]||this.name}getColumnIcon(){return ed[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),i=this.getColumnIcon(),o=this.ticks.length;return h`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${e}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${e}">${i}</span>
            ${t}
          </span>
          <span class="column-count">${o}</span>
        </div>
      </div>

      <div class="column-content">
        ${o===0?h`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(s=>h`
                <tick-card
                  .tick=${s}
                  epic-name=${this.epicNames[s.parent||""]||""}
                  ?focused=${this.focusedTickId===s.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};tt.styles=$`
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
  `;Et([c({type:String})],tt.prototype,"name",2);Et([c({type:String})],tt.prototype,"color",2);Et([c({attribute:!1})],tt.prototype,"ticks",2);Et([c({type:Object,attribute:!1})],tt.prototype,"epicNames",2);Et([c({type:String,attribute:"focused-tick-id"})],tt.prototype,"focusedTickId",2);tt=Et([Le("tick-column")],tt);var td=Object.defineProperty,id=Object.getOwnPropertyDescriptor,st=(e,t,i,o)=>{for(var s=o>1?void 0:o?id(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&td(t,i,s),s};let Pe=class extends $e{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const i=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleDashboardToggle(){this.dispatchEvent(new CustomEvent("dashboard-toggle",{bubbles:!0,composed:!0}))}handleRoadmapToggle(){this.dispatchEvent(new CustomEvent("roadmap-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return h`
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
    `}};Pe.styles=$`
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

  `;st([c({type:String,attribute:"repo-name"})],Pe.prototype,"repoName",2);st([c({attribute:!1})],Pe.prototype,"epics",2);st([c({type:String,attribute:"selected-epic"})],Pe.prototype,"selectedEpic",2);st([c({type:String,attribute:"search-term"})],Pe.prototype,"searchTerm",2);st([c({type:Boolean,attribute:"readonly-mode"})],Pe.prototype,"readonlyMode",2);st([c({type:String,attribute:"connection-status"})],Pe.prototype,"connectionStatus",2);st([y()],Pe.prototype,"debounceTimeout",2);Pe=st([Le("tick-header")],Pe);var od=Object.defineProperty,sd=Object.getOwnPropertyDescriptor,J=(e,t,i,o)=>{for(var s=o>1?void 0:o?sd(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&od(t,i,s),s};const ad={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},hs={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let j=class extends $e{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&this.resetActionState()}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ys(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await Ks(this.tick.id,this.rejectReason.trim()),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Gs(this.tick.id,this.closeReason.trim()||void 0),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Xs(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const i=await qs(this.tick.id,e);this.optimisticNote=null;const o={...i,is_blocked:(((t=i.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:jt(i.notes)};this.emitTickUpdated(o)}catch(i){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=i instanceof Error?i.message:"Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return ad[e]??"Unknown"}getPriorityColor(e){return hs[e]??hs[2]}formatStartedAt(e){const t=new Date(e),i=qc(t,{addSuffix:!0}),o=Vc(t,"h:mm a");return`${i} (${o})`}renderActions(){const e=this.tick;if(!e)return w;const t=e.status==="open",i=e.status==="closed",o=!!e.awaiting,s=!!e.requires,a=t&&o,r=t&&!s,l=i;return!a&&!r&&!l?w:h`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?h`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:w}

        <div class="actions-section">
          ${a?h`
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
              `:w}
          ${r?h`
                <ticks-button
                  variant="secondary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </ticks-button>
              `:w}
          ${l?h`
                <ticks-button
                  variant="primary"
                  size="small"
                  ?disabled=${this.loading||this.readonlyMode}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  ${this.loading?"Reopening...":"Reopen"}
                </ticks-button>
              `:w}
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
            `:w}

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
            `:w}
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
        ${this.parentTitle?h`<span class="link-title">${this.parentTitle}</span>`:w}
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
              >`:w}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?h`<div class="note-sending">Sending...</div>`:w}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return h`
      ${e?h`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):w}
              </ul>
            </div>
          `:h`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?h`
            <sl-alert variant="danger" open class="add-note-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.addNoteError}
            </sl-alert>
          `:w}

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
    `}renderDetailsContent(){const e=this.tick;return e?h`
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
            ${e.manual?h`<span class="meta-badge manual">👤 Manual</span>`:w}
            ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:w}
            ${e.verdict?h`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:w}
            ${this.blockerDetails&&this.blockerDetails.length>0?h`<span class="meta-badge blocked">⊘ Blocked</span>`:w}
          </div>

          <!-- Started time for in_progress ticks -->
          ${e.status==="in_progress"&&e.started_at?h`
                <div class="started-time">
                  Started: ${this.formatStartedAt(e.started_at)}
                </div>
              `:w}
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
              `:w}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?h`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:w}
      </div>
    `:w}render(){const e=this.tick;return h`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?this.renderDetailsContent():h`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};j.styles=$`
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

  `;J([c({attribute:!1})],j.prototype,"tick",2);J([c({type:Boolean})],j.prototype,"open",2);J([c({attribute:!1})],j.prototype,"notesList",2);J([c({attribute:!1})],j.prototype,"blockerDetails",2);J([c({type:String,attribute:"parent-title"})],j.prototype,"parentTitle",2);J([c({type:Boolean,attribute:"readonly-mode"})],j.prototype,"readonlyMode",2);J([y()],j.prototype,"loading",2);J([y()],j.prototype,"errorMessage",2);J([y()],j.prototype,"showRejectInput",2);J([y()],j.prototype,"showCloseInput",2);J([y()],j.prototype,"rejectReason",2);J([y()],j.prototype,"closeReason",2);J([y()],j.prototype,"newNoteText",2);J([y()],j.prototype,"addingNote",2);J([y()],j.prototype,"addNoteError",2);J([y()],j.prototype,"optimisticNote",2);j=J([Le("tick-detail-drawer")],j);var rd=Object.defineProperty,nd=Object.getOwnPropertyDescriptor,me=(e,t,i,o)=>{for(var s=o>1?void 0:o?nd(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&rd(t,i,s),s};const ld=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],cd=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let ae=class extends $e{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleAwaitingChange(e){const t=e.target;this.awaiting=t.value}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent),this.awaiting&&(e.awaiting=this.awaiting);try{const i=await Us(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(o=>o.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof Rs?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return h`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?h`<div class="error-message">${this.error}</div>`:w}

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
              ${ld.map(e=>h`
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
              ${cd.map(e=>h`
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
    `}};ae.styles=$`
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
  `;me([c({type:Boolean})],ae.prototype,"open",2);me([c({type:Array,attribute:!1})],ae.prototype,"epics",2);me([y()],ae.prototype,"loading",2);me([y()],ae.prototype,"error",2);me([y()],ae.prototype,"tickTitle",2);me([y()],ae.prototype,"tickDescription",2);me([y()],ae.prototype,"type",2);me([y()],ae.prototype,"priority",2);me([y()],ae.prototype,"parent",2);me([y()],ae.prototype,"labels",2);me([y()],ae.prototype,"awaiting",2);me([x('sl-input[name="title"]')],ae.prototype,"titleInput",2);ae=me([Le("tick-create-dialog")],ae);var dd=Object.defineProperty,ud=Object.getOwnPropertyDescriptor,ra=(e,t,i,o)=>{for(var s=o>1?void 0:o?ud(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&dd(t,i,s),s};const hd=5e3;let pd=0;function fd(){return`toast-${++pd}-${Date.now()}`}let Ci=class extends $e{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:fd(),message:e.message,variant:e.variant??"primary",duration:e.duration??hd};if(this.toasts=[...this.toasts,t],t.duration>0){const i=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,i)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(i=>i.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return h`
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
    `}};Ci.styles=$`
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
  `;ra([y()],Ci.prototype,"toasts",2);Ci=ra([Le("tick-toast-stack")],Ci);var md=Object.defineProperty,bd=Object.getOwnPropertyDescriptor,Dt=(e,t,i,o)=>{for(var s=o>1?void 0:o?bd(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&md(t,i,s),s};let it=class extends $e{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(Me.get()){this.loading=!1;return}try{this.activities=await Eo(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,i=e.actor,o=e.data||{};switch(t){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return o.reason?`${i} closed: ${o.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${o.to||"someone"}`;case"awaiting":return`Waiting for ${o.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),o=new Date().getTime()-t.getTime(),s=Math.floor(o/1e3),a=Math.floor(s/60),r=Math.floor(a/60),l=Math.floor(r/24);return s<60?"just now":a<60?`${a}m ago`:r<24?`${r}h ago`:l<7?`${l}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return h`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?h`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:w}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?h`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:w}
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
    `}};it.styles=$`
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
  `;Dt([x("sl-dropdown")],it.prototype,"dropdown",2);Dt([y()],it.prototype,"activities",2);Dt([y()],it.prototype,"loading",2);Dt([y()],it.prototype,"unreadCount",2);Dt([y()],it.prototype,"lastSeenTimestamp",2);it=Dt([Le("tick-activity-feed")],it);var gd=Object.defineProperty,vd=Object.getOwnPropertyDescriptor,Fe=(e,t,i,o)=>{for(var s=o>1?void 0:o?vd(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(o?r(t,i,s):r(s))||s);return o&&s&&gd(t,i,s),s};const ps=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let te=class extends $e{constructor(){super(...arguments),this.ticks=[],this.epics=[],this.open=!1,this.activities=[],this.repoName="",this._focusedAttentionIndex=-1,this._detailTick=null,this._detailNotes=[],this._detailLoading=!1,this._handleKeyDown=e=>{if(e.key==="Escape"){if(e.stopPropagation(),this._detailTick){this._closeDetailPane();return}this._close();return}const t=this._getHumanTicks(),i=Math.min(t.length,6)-1;switch(e.key){case"j":case"ArrowDown":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.min(this._focusedAttentionIndex+1,i));break;case"k":case"ArrowUp":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.max(this._focusedAttentionIndex-1,0));break;case"Enter":case"i":this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i&&(e.preventDefault(),e.stopPropagation(),this._handleTickClick(t[this._focusedAttentionIndex].id));break;case"a":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const o=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-resume",{detail:{tickId:o.id}}))}break;case"t":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const o=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-retry",{detail:{tickId:o.id}}))}break}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown)}updated(e){super.updated(e),e.has("open")&&this.open&&(this._focusedAttentionIndex=-1,this._closeDetailPane())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown)}_close(){this.dispatchEvent(new CustomEvent("close"))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){this.dispatchEvent(new CustomEvent("epic-select",{detail:{epicId:e}})),this._close()}_handleTickClick(e){this._openDetailPane(e)}_handleOpenOnBoard(e){this.dispatchEvent(new CustomEvent("tick-select",{detail:{tickId:e}})),this._close()}async _openDetailPane(e){var i,o;const t=this.ticks.find(s=>s.id===e);if(t){this._detailTick=t,this._detailNotes=jt(t.notes),this._detailLoading=!0;try{const s=await So(e).catch(()=>null);if(((i=this._detailTick)==null?void 0:i.id)!==e)return;s&&(this._detailTick={...t,...s,is_blocked:t.is_blocked,column:t.column},this._detailNotes=jt(s.notes))}catch{}finally{((o=this._detailTick)==null?void 0:o.id)===e&&(this._detailLoading=!1)}}}_closeDetailPane(){this._detailTick=null,this._detailNotes=[],this._detailLoading=!1}_getColumnCounts(){const e={blocked:0,ready:0,agent:0,human:0,done:0};for(const t of this.ticks)t.type!=="epic"&&e[t.column]!==void 0&&e[t.column]++;return e}_getTotalNonEpicTicks(){return this.ticks.filter(e=>e.type!=="epic").length}_getEpicProgress(e){const t=this.ticks.filter(u=>u.parent===e&&u.type!=="epic"),i=t.length,o=t.filter(u=>u.column==="done").length,s=t.filter(u=>u.column==="agent").length,a=t.filter(u=>u.column==="human").length,r=t.filter(u=>u.column==="blocked").length,l=t.filter(u=>u.column==="ready").length,d=i>0?Math.round(o/i*100):0;return{total:i,done:o,inProgress:s,needsHuman:a,blocked:r,ready:l,pct:d}}_getHumanTicks(){return this.ticks.filter(e=>e.column==="human"&&e.type!=="epic")}_getActivityIcon(e){switch(e){case"create":return"➕";case"close":return"✅";case"update":return"✏️";case"approve":return"👍";case"reject":return"👎";case"note":return"💬";case"reopen":return"🔄";default:return"•"}}_formatRelativeTime(e){const t=new Date(e),o=new Date().getTime()-t.getTime(),s=Math.floor(o/6e4);if(s<1)return"now";if(s<60)return`${s}m ago`;const a=Math.floor(s/60);return a<24?`${a}h ago`:`${Math.floor(a/24)}d ago`}_getAwaitingLabel(e){if(e.awaiting)switch(e.awaiting){case"approval":return"Awaiting approval";case"review":return"Awaiting review";case"input":return"Awaiting input";case"content":return"Awaiting content";case"escalation":return"Escalated";case"checkpoint":return"Checkpoint";case"work":return"Manual work needed";default:return"Needs attention"}return"Needs attention"}_getPriorityLabel(e){return te.PRIORITY_LABELS[e]??"Unknown"}_getPriorityColor(e){return te.PRIORITY_COLORS[e]??"var(--subtext0)"}_formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}_formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);return t<60?`${t}s`:`${Math.floor(t/60)}m ${t%60}s`}_formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}_formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}_truncate(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}render(){if(!this.open)return w;const e=this._getColumnCounts(),t=this._getTotalNonEpicTicks(),i=this._getHumanTicks();return h`
      <div class="overlay" @click=${this._handleBackdropClick} tabindex="-1">
        <div class="dashboard">
          ${this._renderHeader()}
          <div class="dashboard-body">
            ${this._detailTick?this._renderDetailPane():w}
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
    `}_renderHeader(){return h`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName?h`<div class="header-subtitle">${this.repoName}</div>`:w}
          </div>
        </div>
        <div class="header-right">
          <span class="kbd-hint">
            Press <kbd>d</kbd> or <kbd>Esc</kbd> to close
          </span>
          <button class="close-btn" @click=${this._close} aria-label="Close dashboard">✕</button>
        </div>
      </div>
    `}_renderSummaryCards(e,t){const i=t>0?Math.round(e.done/t*100):0;return h`
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
    `}_renderDistribution(e,t){return t===0?w:h`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${ps.map(i=>{const o=e[i.id]/t*100;return o===0?w:h`
                <div
                  class="distribution-segment segment-${i.id}"
                  style="width: ${o}%"
                  title="${i.name}: ${e[i.id]}"
                >
                  ${o>=8?h`<span>${e[i.id]}</span>`:w}
                </div>
              `})}
          </div>
          <div class="distribution-legend">
            ${ps.map(i=>h`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${i.color}"></div>
                <span>${i.icon} ${i.name}</span>
                <span class="legend-count">${e[i.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}_renderEpicProgress(){return this.epics.length===0?w:h`
      <div class="section">
        <div class="section-title">Epic Progress</div>
        <div class="epic-list">
          ${this.epics.map(e=>{const t=this._getEpicProgress(e.id);return h`
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
    `}_renderNeedsAttention(e){return h`
      <div class="section">
        <div class="section-title">Needs Attention (${e.length})</div>
        ${e.length===0?h`<div class="empty-section">No ticks need human attention</div>`:h`
              <div class="attention-list">
                ${e.slice(0,6).map((t,i)=>h`
                  <div
                    class="attention-item ${z({focused:this._focusedAttentionIndex===i})}"
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
                ${e.length>6?h`<div class="empty-section">+${e.length-6} more</div>`:w}
              </div>
              ${e.length>0?h`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              `:w}
            `}
      </div>
    `}_renderRecentActivity(){return h`
      <div class="section">
        <div class="section-title">Recent Activity</div>
        ${this.activities.length===0?h`<div class="empty-section">No recent activity</div>`:h`
              <div class="activity-list">
                ${this.activities.slice(0,8).map(e=>h`
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
    `}_renderDetailPane(){const e=this._detailTick;return e?h`
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

        <div class="detail-tab-body">
          ${this._detailLoading?h`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`:this._renderDetailOverview(e)}
        </div>
      </div>
    `:w}_renderDetailOverview(e){return h`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${e.type}">${e.type}</span>
        <span class="detail-meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(e.priority)}"
        >${this._getPriorityLabel(e.priority)}</span>
        ${e.awaiting?h`<span class="detail-meta-badge awaiting">⏳ ${e.awaiting}</span>`:w}
        ${e.is_blocked?h`<span class="detail-meta-badge blocked">⊘ blocked</span>`:w}
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">Description</div>
        ${e.description?h`<div class="detail-description">${e.description}</div>`:h`<div class="detail-field-empty">No description</div>`}
      </div>

      <!-- Acceptance Criteria -->
      ${e.acceptance_criteria?h`
            <div class="detail-field">
              <div class="detail-field-label">Acceptance Criteria</div>
              <div class="detail-description">${e.acceptance_criteria}</div>
            </div>
          `:w}

      <!-- Parent -->
      ${e.parent?h`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${()=>this._handleTickClick(e.parent)}>${e.parent}</a>
            </div>
          `:w}

      <!-- Blocked by -->
      ${e.blocked_by&&e.blocked_by.length>0?h`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${e.blocked_by.map(t=>h`
                <a class="detail-link" @click=${()=>this._handleTickClick(t)} style="margin-right: 0.5rem;">${t}</a>
              `)}
            </div>
          `:w}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length>0?h`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(t=>h`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${t.author??"Unknown"}</span>
                      ${t.timestamp?h`<span class="detail-note-time">${this._formatRelativeTime(t.timestamp)}</span>`:w}
                    </div>
                    <div class="detail-note-text">${t.text}</div>
                  </li>
                `)}
              </ul>
            `:h`<div class="detail-field-empty">No notes</div>`}
      </div>

      <!-- Closed reason -->
      ${e.closed_reason?h`
            <div class="detail-field">
              <div class="detail-field-label">Close Reason</div>
              <div class="detail-description">${e.closed_reason}</div>
            </div>
          `:w}

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
          ${e.started_at?h`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.started_at)}</span>
                </div>
              `:w}
          ${e.closed_at?h`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.closed_at)}</span>
                </div>
              `:w}
        </div>
      </div>
    `}};te.styles=$`
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

    /* Detail pane body */
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
  `;te.PRIORITY_LABELS={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};te.PRIORITY_COLORS={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};Fe([c({type:Array})],te.prototype,"ticks",2);Fe([c({type:Array})],te.prototype,"epics",2);Fe([c({type:Boolean,reflect:!0})],te.prototype,"open",2);Fe([c({type:Array})],te.prototype,"activities",2);Fe([c({type:String,attribute:"repo-name"})],te.prototype,"repoName",2);Fe([y()],te.prototype,"_focusedAttentionIndex",2);Fe([y()],te.prototype,"_detailTick",2);Fe([y()],te.prototype,"_detailNotes",2);Fe([y()],te.prototype,"_detailLoading",2);te=Fe([Le("tickflow-dashboard")],te);eo("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var i;((i=t.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
