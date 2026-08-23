import{i as S,n as c,a as ve,b as u,r as y,E as wt,A as w,e as C,u as Mo,t as Te}from"./ticks-logo-DYgrblNn.js";var fr=S`
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
`;const to=new Set,kt=new Map;let ct,mo="ltr",bo="en";const vs=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(vs){const e=new MutationObserver(ws);mo=document.documentElement.dir||"ltr",bo=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function ys(...e){e.map(t=>{const i=t.$code.toLowerCase();kt.has(i)?kt.set(i,Object.assign(Object.assign({},kt.get(i)),t)):kt.set(i,t),ct||(ct=t)}),ws()}function ws(){vs&&(mo=document.documentElement.dir||"ltr",bo=document.documentElement.lang||navigator.language),[...to.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let mr=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){to.add(this.host)}hostDisconnected(){to.delete(this.host)}dir(){return`${this.host.dir||mo}`.toLowerCase()}lang(){return`${this.host.lang||bo}`.toLowerCase()}getTranslationData(t){var i,o;const s=new Intl.Locale(t.replace(/_/g,"-")),r=s==null?void 0:s.language.toLowerCase(),a=(o=(i=s==null?void 0:s.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&o!==void 0?o:"",l=kt.get(`${r}-${a}`),d=kt.get(r);return{locale:s,language:r,region:a,primary:l,secondary:d}}exists(t,i){var o;const{primary:s,secondary:r}=this.getTranslationData((o=i.lang)!==null&&o!==void 0?o:this.lang());return i=Object.assign({includeFallback:!1},i),!!(s&&s[t]||r&&r[t]||i.includeFallback&&ct&&ct[t])}term(t,...i){const{primary:o,secondary:s}=this.getTranslationData(this.lang());let r;if(o&&o[t])r=o[t];else if(s&&s[t])r=s[t];else if(ct&&ct[t])r=ct[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof r=="function"?r(...i):r}date(t,i){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),i).format(t)}number(t,i){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),i).format(t)}relativeTime(t,i,o){return new Intl.RelativeTimeFormat(this.lang(),o).format(t,i)}};var ks={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};ys(ks);var br=ks,oe=class extends mr{};ys(br);var N=S`
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
`,xs=Object.defineProperty,gr=Object.defineProperties,vr=Object.getOwnPropertyDescriptor,yr=Object.getOwnPropertyDescriptors,Io=Object.getOwnPropertySymbols,wr=Object.prototype.hasOwnProperty,kr=Object.prototype.propertyIsEnumerable,Wi=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),go=e=>{throw TypeError(e)},Po=(e,t,i)=>t in e?xs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,Ue=(e,t)=>{for(var i in t||(t={}))wr.call(t,i)&&Po(e,i,t[i]);if(Io)for(var i of Io(t))kr.call(t,i)&&Po(e,i,t[i]);return e},qt=(e,t)=>gr(e,yr(t)),n=(e,t,i,o)=>{for(var s=o>1?void 0:o?vr(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&xs(t,i,s),s},_s=(e,t,i)=>t.has(e)||go("Cannot "+i),xr=(e,t,i)=>(_s(e,t,"read from private field"),t.get(e)),_r=(e,t,i)=>t.has(e)?go("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),Cr=(e,t,i,o)=>(_s(e,t,"write to private field"),t.set(e,i),i),$r=function(e,t){this[0]=e,this[1]=t},Tr=e=>{var t=e[Wi("asyncIterator")],i=!1,o,s={};return t==null?(t=e[Wi("iterator")](),o=r=>s[r]=a=>t[r](a)):(t=t.call(e),o=r=>s[r]=a=>{if(i){if(i=!1,r==="throw")throw a;return a}return i=!0,{done:!1,value:new $r(new Promise(l=>{var d=t[r](a);d instanceof Object||go("Object expected"),l(d)}),1)}}),s[Wi("iterator")]=()=>s,o("next"),"throw"in t?o("throw"):s.throw=r=>{throw r},"return"in t&&o("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Sr(e){return(t,i)=>{const o=typeof t=="function"?t:t[i];Object.assign(o,e)}}var li,I=class extends ve{constructor(){super(),_r(this,li,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const i=new CustomEvent(e,Ue({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(i),i}static define(e,t=this,i={}){const o=customElements.get(e);if(!o){try{customElements.define(e,t,i)}catch{customElements.define(e,class extends t{},i)}return}let s=" (unknown version)",r=s;"version"in t&&t.version&&(s=" v"+t.version),"version"in o&&o.version&&(r=" v"+o.version),!(s&&r&&s===r)&&console.warn(`Attempted to register <${e}>${s}, but <${e}>${r} has already been registered.`)}attributeChangedCallback(e,t,i){xr(this,li)||(this.constructor.elementProperties.forEach((o,s)=>{o.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),Cr(this,li,!0)),super.attributeChangedCallback(e,t,i)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,i)=>{e.has(i)&&this[i]==null&&(this[i]=t)})}};li=new WeakMap;I.version="2.20.1";I.dependencies={};n([c()],I.prototype,"dir",2);n([c()],I.prototype,"lang",2);var Si=class extends I{constructor(){super(...arguments),this.localize=new oe(this)}render(){return u`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Si.styles=[N,fr];var Ot=new WeakMap,zt=new WeakMap,Mt=new WeakMap,Ui=new WeakSet,ti=new WeakMap,Yt=class{constructor(e,t){this.handleFormData=i=>{const o=this.options.disabled(this.host),s=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!o&&!a&&typeof s=="string"&&s.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(l=>{i.formData.append(s,l.toString())}):i.formData.append(s,r.toString()))},this.handleFormSubmit=i=>{var o;const s=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((o=Ot.get(this.form))==null||o.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!s&&!r(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),ti.set(this.host,[])},this.handleInteraction=i=>{const o=ti.get(this.host);o.includes(i.type)||o.push(i.type),o.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.checkValidity=="function"&&!o.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.reportValidity=="function"&&!o.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=Ue({form:i=>{const o=i.form;if(o){const r=i.getRootNode().querySelector(`#${o}`);if(r)return r}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var o;return(o=i.disabled)!=null?o:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,o)=>i.value=o,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),ti.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),ti.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,Ot.has(this.form)?Ot.get(this.form).add(this.host):Ot.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),zt.has(this.form)||(zt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Mt.has(this.form)||(Mt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=Ot.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),zt.has(this.form)&&(this.form.reportValidity=zt.get(this.form),zt.delete(this.form)),Mt.has(this.form)&&(this.form.checkValidity=Mt.get(this.form),Mt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?Ui.add(e):Ui.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const i=document.createElement("button");i.type=e,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",t&&(i.name=t.name,i.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(o=>{t.hasAttribute(o)&&i.setAttribute(o,t.getAttribute(o))})),this.form.append(i),i.click(),i.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,i=!!Ui.has(t),o=!!t.required;t.toggleAttribute("data-required",o),t.toggleAttribute("data-optional",!o),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&i),t.toggleAttribute("data-user-valid",e&&i)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},vo=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(qt(Ue({},vo),{valid:!1,valueMissing:!0}));Object.freeze(qt(Ue({},vo),{valid:!1,customError:!0}));var Er=S`
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
`,qe=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=i=>{const o=i.target;(this.slotNames.includes("[default]")&&!o.name||o.name&&this.slotNames.includes(o.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Ar(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let i="";return[...t].forEach(o=>{o.nodeType===Node.TEXT_NODE&&(i+=o.textContent)}),i}var io="";function oo(e){io=e}function Dr(e=""){if(!io){const t=[...document.getElementsByTagName("script")],i=t.find(o=>o.hasAttribute("data-shoelace"));if(i)oo(i.getAttribute("data-shoelace"));else{const o=t.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let s="";o&&(s=o.getAttribute("src")),oo(s.split("/").slice(0,-1).join("/"))}}return io.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var Or={name:"default",resolver:e=>Dr(`assets/icons/${e}.svg`)},zr=Or,Lo={caret:`
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
  `},Mr={name:"system",resolver:e=>e in Lo?`data:image/svg+xml,${encodeURIComponent(Lo[e])}`:""},Ir=Mr,Pr=[zr,Ir],so=[];function Lr(e){so.push(e)}function Rr(e){so=so.filter(t=>t!==e)}function Ro(e){return Pr.find(t=>t.name===e)}var Nr=S`
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
`;function E(e,t){const i=Ue({waitUntilFirstUpdate:!1},t);return(o,s)=>{const{update:r}=o,a=Array.isArray(e)?e:[e];o.update=function(l){a.forEach(d=>{const h=d;if(l.has(h)){const p=l.get(h),m=this[h];p!==m&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[s](p,m)}}),r.call(this,l)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Fr=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,Cs=e=>e.strings===void 0,Br={},Hr=(e,t=Br)=>e._$AH=t;var It=Symbol(),ii=Symbol(),qi,Yi=new Map,X=class extends I{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var i;let o;if(t!=null&&t.spriteSheet)return this.svg=u`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(o=await fetch(e,{mode:"cors"}),!o.ok)return o.status===410?It:ii}catch{return ii}try{const s=document.createElement("div");s.innerHTML=await o.text();const r=s.firstElementChild;if(((i=r==null?void 0:r.tagName)==null?void 0:i.toLowerCase())!=="svg")return It;qi||(qi=new DOMParser);const l=qi.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return l?(l.part.add("svg"),document.adoptNode(l)):It}catch{return It}}connectedCallback(){super.connectedCallback(),Lr(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Rr(this)}getIconSource(){const e=Ro(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:i}=this.getIconSource(),o=i?Ro(this.library):void 0;if(!t){this.svg=null;return}let s=Yi.get(t);if(s||(s=this.resolveIcon(t,o),Yi.set(t,s)),!this.initialRender)return;const r=await s;if(r===ii&&Yi.delete(t),t===this.getIconSource().url){if(Fr(r)){if(this.svg=r,o){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof o.mutator=="function"&&a&&o.mutator(a)}return}switch(r){case ii:case It:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(e=o==null?void 0:o.mutator)==null||e.call(o,this.svg),this.emit("sl-load")}}}render(){return this.svg}};X.styles=[N,Nr];n([y()],X.prototype,"svg",2);n([c({reflect:!0})],X.prototype,"name",2);n([c()],X.prototype,"src",2);n([c()],X.prototype,"label",2);n([c({reflect:!0})],X.prototype,"library",2);n([E("label")],X.prototype,"handleLabelChange",1);n([E(["name","src","library"])],X.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const He={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ei=e=>(...t)=>({_$litDirective$:e,values:t});let Ai=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,o){this._$Ct=t,this._$AM=i,this._$Ci=o}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=Ei(class extends Ai{constructor(e){var t;if(super(e),e.type!==He.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var o,s;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in t)t[r]&&!((o=this.nt)!=null&&o.has(r))&&this.st.add(r);return this.render(t)}const i=e.element.classList;for(const r of this.st)r in t||(i.remove(r),this.st.delete(r));for(const r in t){const a=!!t[r];a===this.st.has(r)||(s=this.nt)!=null&&s.has(r)||(a?(i.add(r),this.st.add(r)):(i.remove(r),this.st.delete(r)))}return wt}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const $s=Symbol.for(""),jr=e=>{if((e==null?void 0:e.r)===$s)return e==null?void 0:e._$litStatic$},pi=(e,...t)=>({_$litStatic$:t.reduce((i,o,s)=>i+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(o)+e[s+1],e[0]),r:$s}),No=new Map,Vr=e=>(t,...i)=>{const o=i.length;let s,r;const a=[],l=[];let d,h=0,p=!1;for(;h<o;){for(d=t[h];h<o&&(r=i[h],(s=jr(r))!==void 0);)d+=s+t[++h],p=!0;h!==o&&l.push(r),a.push(d),h++}if(h===o&&a.push(t[o]),p){const m=a.join("$$lit$$");(t=No.get(m))===void 0&&(a.raw=a,No.set(m,t=a)),i=l}return e(t,...i)},ci=Vr(u);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const _=e=>e??w;var P=class extends I{constructor(){super(...arguments),this.formControlController=new Yt(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new qe(this,"[default]","prefix","suffix"),this.localize=new oe(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:vo}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?pi`a`:pi`button`;return ci`
      <${t}
        part="base"
        class=${M({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${_(e?void 0:this.disabled)}
        type=${_(e?void 0:this.type)}
        title=${this.title}
        name=${_(e?void 0:this.name)}
        value=${_(e?void 0:this.value)}
        href=${_(e&&!this.disabled?this.href:void 0)}
        target=${_(e?this.target:void 0)}
        download=${_(e?this.download:void 0)}
        rel=${_(e?this.rel:void 0)}
        role=${_(e?void 0:"button")}
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
        ${this.caret?ci` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?ci`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};P.styles=[N,Er];P.dependencies={"sl-icon":X,"sl-spinner":Si};n([C(".button")],P.prototype,"button",2);n([y()],P.prototype,"hasFocus",2);n([y()],P.prototype,"invalid",2);n([c()],P.prototype,"title",2);n([c({reflect:!0})],P.prototype,"variant",2);n([c({reflect:!0})],P.prototype,"size",2);n([c({type:Boolean,reflect:!0})],P.prototype,"caret",2);n([c({type:Boolean,reflect:!0})],P.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],P.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],P.prototype,"outline",2);n([c({type:Boolean,reflect:!0})],P.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],P.prototype,"circle",2);n([c()],P.prototype,"type",2);n([c()],P.prototype,"name",2);n([c()],P.prototype,"value",2);n([c()],P.prototype,"href",2);n([c()],P.prototype,"target",2);n([c()],P.prototype,"rel",2);n([c()],P.prototype,"download",2);n([c()],P.prototype,"form",2);n([c({attribute:"formaction"})],P.prototype,"formAction",2);n([c({attribute:"formenctype"})],P.prototype,"formEnctype",2);n([c({attribute:"formmethod"})],P.prototype,"formMethod",2);n([c({attribute:"formnovalidate",type:Boolean})],P.prototype,"formNoValidate",2);n([c({attribute:"formtarget"})],P.prototype,"formTarget",2);n([E("disabled",{waitUntilFirstUpdate:!0})],P.prototype,"handleDisabledChange",1);P.define("sl-button");var Wr=S`
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
`,yo=(e="value")=>(t,i)=>{const o=t.constructor,s=o.prototype.attributeChangedCallback;o.prototype.attributeChangedCallback=function(r,a,l){var d;const h=o.getPropertyOptions(e),p=typeof h.attribute=="string"?h.attribute:e;if(r===p){const m=h.converter||Mo,f=(typeof m=="function"?m:(d=m==null?void 0:m.fromAttribute)!=null?d:Mo.fromAttribute)(l,h.type);this[e]!==f&&(this[i]=f)}s.call(this,r,a,l)}},Di=S`
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
 */const fi=Ei(class extends Ai{constructor(e){if(super(e),e.type!==He.PROPERTY&&e.type!==He.ATTRIBUTE&&e.type!==He.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Cs(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===wt||t===w)return t;const i=e.element,o=e.name;if(e.type===He.PROPERTY){if(t===i[o])return wt}else if(e.type===He.BOOLEAN_ATTRIBUTE){if(!!t===i.hasAttribute(o))return wt}else if(e.type===He.ATTRIBUTE&&i.getAttribute(o)===t+"")return wt;return Hr(e),t}});var $=class extends I{constructor(){super(...arguments),this.formControlController=new Yt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.localize=new oe(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,o="preserve"){const s=t??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(e,s,r,o),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return u`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
              name=${_(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${_(this.placeholder)}
              minlength=${_(this.minlength)}
              maxlength=${_(this.maxlength)}
              min=${_(this.min)}
              max=${_(this.max)}
              step=${_(this.step)}
              .value=${fi(this.value)}
              autocapitalize=${_(this.autocapitalize)}
              autocomplete=${_(this.autocomplete)}
              autocorrect=${_(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${_(this.pattern)}
              enterkeyhint=${_(this.enterkeyhint)}
              inputmode=${_(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${r?u`
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};$.styles=[N,Di,Wr];$.dependencies={"sl-icon":X};n([C(".input__control")],$.prototype,"input",2);n([y()],$.prototype,"hasFocus",2);n([c()],$.prototype,"title",2);n([c({reflect:!0})],$.prototype,"type",2);n([c()],$.prototype,"name",2);n([c()],$.prototype,"value",2);n([yo()],$.prototype,"defaultValue",2);n([c({reflect:!0})],$.prototype,"size",2);n([c({type:Boolean,reflect:!0})],$.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],$.prototype,"pill",2);n([c()],$.prototype,"label",2);n([c({attribute:"help-text"})],$.prototype,"helpText",2);n([c({type:Boolean})],$.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],$.prototype,"disabled",2);n([c()],$.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],$.prototype,"readonly",2);n([c({attribute:"password-toggle",type:Boolean})],$.prototype,"passwordToggle",2);n([c({attribute:"password-visible",type:Boolean})],$.prototype,"passwordVisible",2);n([c({attribute:"no-spin-buttons",type:Boolean})],$.prototype,"noSpinButtons",2);n([c({reflect:!0})],$.prototype,"form",2);n([c({type:Boolean,reflect:!0})],$.prototype,"required",2);n([c()],$.prototype,"pattern",2);n([c({type:Number})],$.prototype,"minlength",2);n([c({type:Number})],$.prototype,"maxlength",2);n([c()],$.prototype,"min",2);n([c()],$.prototype,"max",2);n([c()],$.prototype,"step",2);n([c()],$.prototype,"autocapitalize",2);n([c()],$.prototype,"autocorrect",2);n([c()],$.prototype,"autocomplete",2);n([c({type:Boolean})],$.prototype,"autofocus",2);n([c()],$.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],$.prototype,"spellcheck",2);n([c()],$.prototype,"inputmode",2);n([E("disabled",{waitUntilFirstUpdate:!0})],$.prototype,"handleDisabledChange",1);n([E("step",{waitUntilFirstUpdate:!0})],$.prototype,"handleStepChange",1);n([E("value",{waitUntilFirstUpdate:!0})],$.prototype,"handleValueChange",1);$.define("sl-input");var Ur=S`
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
`,qr=S`
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
`,W=class extends I{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?pi`a`:pi`button`;return ci`
      <${t}
        part="base"
        class=${M({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${_(e?void 0:this.disabled)}
        type=${_(e?void 0:"button")}
        href=${_(e?this.href:void 0)}
        target=${_(e?this.target:void 0)}
        download=${_(e?this.download:void 0)}
        rel=${_(e&&this.target?"noreferrer noopener":void 0)}
        role=${_(e?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${_(this.name)}
          library=${_(this.library)}
          src=${_(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${t}>
    `}};W.styles=[N,qr];W.dependencies={"sl-icon":X};n([C(".icon-button")],W.prototype,"button",2);n([y()],W.prototype,"hasFocus",2);n([c()],W.prototype,"name",2);n([c()],W.prototype,"library",2);n([c()],W.prototype,"src",2);n([c()],W.prototype,"href",2);n([c()],W.prototype,"target",2);n([c()],W.prototype,"download",2);n([c()],W.prototype,"label",2);n([c({type:Boolean,reflect:!0})],W.prototype,"disabled",2);var bt=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return u`
      <span
        part="base"
        class=${M({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
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
    `}};bt.styles=[N,Ur];bt.dependencies={"sl-icon-button":W};n([c({reflect:!0})],bt.prototype,"variant",2);n([c({reflect:!0})],bt.prototype,"size",2);n([c({type:Boolean,reflect:!0})],bt.prototype,"pill",2);n([c({type:Boolean})],bt.prototype,"removable",2);var Yr=S`
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
`;function Kr(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var ro=new Set;function Gr(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function Xr(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Nt(e){if(ro.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=Gr()+Xr();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),t<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function Ft(e){ro.delete(e),ro.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function ao(e,t,i="vertical",o="smooth"){const s=Kr(e,t),r=s.top+t.scrollTop,a=s.left+t.scrollLeft,l=t.scrollLeft,d=t.scrollLeft+t.offsetWidth,h=t.scrollTop,p=t.scrollTop+t.offsetHeight;(i==="horizontal"||i==="both")&&(a<l?t.scrollTo({left:a,behavior:o}):a+e.clientWidth>d&&t.scrollTo({left:a-t.offsetWidth+e.clientWidth,behavior:o})),(i==="vertical"||i==="both")&&(r<h?t.scrollTo({top:r,behavior:o}):r+e.clientHeight>p&&t.scrollTo({top:r-t.offsetHeight+e.clientHeight,behavior:o}))}var Qr=S`
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
`;const Je=Math.min,de=Math.max,mi=Math.round,oi=Math.floor,ze=e=>({x:e,y:e}),Jr={left:"right",right:"left",bottom:"top",top:"bottom"},Zr={start:"end",end:"start"};function no(e,t,i){return de(e,Je(t,i))}function $t(e,t){return typeof e=="function"?e(t):e}function Ze(e){return e.split("-")[0]}function Tt(e){return e.split("-")[1]}function Ts(e){return e==="x"?"y":"x"}function wo(e){return e==="y"?"height":"width"}const ea=new Set(["top","bottom"]);function je(e){return ea.has(Ze(e))?"y":"x"}function ko(e){return Ts(je(e))}function ta(e,t,i){i===void 0&&(i=!1);const o=Tt(e),s=ko(e),r=wo(s);let a=s==="x"?o===(i?"end":"start")?"right":"left":o==="start"?"bottom":"top";return t.reference[r]>t.floating[r]&&(a=bi(a)),[a,bi(a)]}function ia(e){const t=bi(e);return[lo(e),t,lo(t)]}function lo(e){return e.replace(/start|end/g,t=>Zr[t])}const Fo=["left","right"],Bo=["right","left"],oa=["top","bottom"],sa=["bottom","top"];function ra(e,t,i){switch(e){case"top":case"bottom":return i?t?Bo:Fo:t?Fo:Bo;case"left":case"right":return t?oa:sa;default:return[]}}function aa(e,t,i,o){const s=Tt(e);let r=ra(Ze(e),i==="start",o);return s&&(r=r.map(a=>a+"-"+s),t&&(r=r.concat(r.map(lo)))),r}function bi(e){return e.replace(/left|right|bottom|top/g,t=>Jr[t])}function na(e){return{top:0,right:0,bottom:0,left:0,...e}}function Ss(e){return typeof e!="number"?na(e):{top:e,right:e,bottom:e,left:e}}function gi(e){const{x:t,y:i,width:o,height:s}=e;return{width:o,height:s,top:i,left:t,right:t+o,bottom:i+s,x:t,y:i}}function Ho(e,t,i){let{reference:o,floating:s}=e;const r=je(t),a=ko(t),l=wo(a),d=Ze(t),h=r==="y",p=o.x+o.width/2-s.width/2,m=o.y+o.height/2-s.height/2,v=o[l]/2-s[l]/2;let f;switch(d){case"top":f={x:p,y:o.y-s.height};break;case"bottom":f={x:p,y:o.y+o.height};break;case"right":f={x:o.x+o.width,y:m};break;case"left":f={x:o.x-s.width,y:m};break;default:f={x:o.x,y:o.y}}switch(Tt(t)){case"start":f[a]-=v*(i&&h?-1:1);break;case"end":f[a]+=v*(i&&h?-1:1);break}return f}const la=async(e,t,i)=>{const{placement:o="bottom",strategy:s="absolute",middleware:r=[],platform:a}=i,l=r.filter(Boolean),d=await(a.isRTL==null?void 0:a.isRTL(t));let h=await a.getElementRects({reference:e,floating:t,strategy:s}),{x:p,y:m}=Ho(h,o,d),v=o,f={},b=0;for(let g=0;g<l.length;g++){const{name:k,fn:x}=l[g],{x:A,y:T,data:U,reset:F}=await x({x:p,y:m,initialPlacement:o,placement:v,strategy:s,middlewareData:f,rects:h,platform:a,elements:{reference:e,floating:t}});p=A??p,m=T??m,f={...f,[k]:{...f[k],...U}},F&&b<=50&&(b++,typeof F=="object"&&(F.placement&&(v=F.placement),F.rects&&(h=F.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:s}):F.rects),{x:p,y:m}=Ho(h,v,d)),g=-1)}return{x:p,y:m,placement:v,strategy:s,middlewareData:f}};async function xo(e,t){var i;t===void 0&&(t={});const{x:o,y:s,platform:r,rects:a,elements:l,strategy:d}=e,{boundary:h="clippingAncestors",rootBoundary:p="viewport",elementContext:m="floating",altBoundary:v=!1,padding:f=0}=$t(t,e),b=Ss(f),k=l[v?m==="floating"?"reference":"floating":m],x=gi(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement(k)))==null||i?k:k.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(l.floating)),boundary:h,rootBoundary:p,strategy:d})),A=m==="floating"?{x:o,y:s,width:a.floating.width,height:a.floating.height}:a.reference,T=await(r.getOffsetParent==null?void 0:r.getOffsetParent(l.floating)),U=await(r.isElement==null?void 0:r.isElement(T))?await(r.getScale==null?void 0:r.getScale(T))||{x:1,y:1}:{x:1,y:1},F=gi(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:A,offsetParent:T,strategy:d}):A);return{top:(x.top-F.top+b.top)/U.y,bottom:(F.bottom-x.bottom+b.bottom)/U.y,left:(x.left-F.left+b.left)/U.x,right:(F.right-x.right+b.right)/U.x}}const ca=e=>({name:"arrow",options:e,async fn(t){const{x:i,y:o,placement:s,rects:r,platform:a,elements:l,middlewareData:d}=t,{element:h,padding:p=0}=$t(e,t)||{};if(h==null)return{};const m=Ss(p),v={x:i,y:o},f=ko(s),b=wo(f),g=await a.getDimensions(h),k=f==="y",x=k?"top":"left",A=k?"bottom":"right",T=k?"clientHeight":"clientWidth",U=r.reference[b]+r.reference[f]-v[f]-r.floating[b],F=v[f]-r.reference[f],we=await(a.getOffsetParent==null?void 0:a.getOffsetParent(h));let Z=we?we[T]:0;(!Z||!await(a.isElement==null?void 0:a.isElement(we)))&&(Z=l.floating[T]||r.floating[b]);const Fe=U/2-F/2,Ae=Z/2-g[b]/2-1,be=Je(m[x],Ae),Ye=Je(m[A],Ae),De=be,Ke=Z-g[b]-Ye,ae=Z/2-g[b]/2+Fe,rt=no(De,ae,Ke),Be=!d.arrow&&Tt(s)!=null&&ae!==rt&&r.reference[b]/2-(ae<De?be:Ye)-g[b]/2<0,ke=Be?ae<De?ae-De:ae-Ke:0;return{[f]:v[f]+ke,data:{[f]:rt,centerOffset:ae-rt-ke,...Be&&{alignmentOffset:ke}},reset:Be}}}),da=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var i,o;const{placement:s,middlewareData:r,rects:a,initialPlacement:l,platform:d,elements:h}=t,{mainAxis:p=!0,crossAxis:m=!0,fallbackPlacements:v,fallbackStrategy:f="bestFit",fallbackAxisSideDirection:b="none",flipAlignment:g=!0,...k}=$t(e,t);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const x=Ze(s),A=je(l),T=Ze(l)===l,U=await(d.isRTL==null?void 0:d.isRTL(h.floating)),F=v||(T||!g?[bi(l)]:ia(l)),we=b!=="none";!v&&we&&F.push(...aa(l,g,b,U));const Z=[l,...F],Fe=await xo(t,k),Ae=[];let be=((o=r.flip)==null?void 0:o.overflows)||[];if(p&&Ae.push(Fe[x]),m){const ae=ta(s,a,U);Ae.push(Fe[ae[0]],Fe[ae[1]])}if(be=[...be,{placement:s,overflows:Ae}],!Ae.every(ae=>ae<=0)){var Ye,De;const ae=(((Ye=r.flip)==null?void 0:Ye.index)||0)+1,rt=Z[ae];if(rt&&(!(m==="alignment"?A!==je(rt):!1)||be.every(xe=>je(xe.placement)===A?xe.overflows[0]>0:!0)))return{data:{index:ae,overflows:be},reset:{placement:rt}};let Be=(De=be.filter(ke=>ke.overflows[0]<=0).sort((ke,xe)=>ke.overflows[1]-xe.overflows[1])[0])==null?void 0:De.placement;if(!Be)switch(f){case"bestFit":{var Ke;const ke=(Ke=be.filter(xe=>{if(we){const Ge=je(xe.placement);return Ge===A||Ge==="y"}return!0}).map(xe=>[xe.placement,xe.overflows.filter(Ge=>Ge>0).reduce((Ge,pr)=>Ge+pr,0)]).sort((xe,Ge)=>xe[1]-Ge[1])[0])==null?void 0:Ke[0];ke&&(Be=ke);break}case"initialPlacement":Be=l;break}if(s!==Be)return{reset:{placement:Be}}}return{}}}},ua=new Set(["left","top"]);async function ha(e,t){const{placement:i,platform:o,elements:s}=e,r=await(o.isRTL==null?void 0:o.isRTL(s.floating)),a=Ze(i),l=Tt(i),d=je(i)==="y",h=ua.has(a)?-1:1,p=r&&d?-1:1,m=$t(t,e);let{mainAxis:v,crossAxis:f,alignmentAxis:b}=typeof m=="number"?{mainAxis:m,crossAxis:0,alignmentAxis:null}:{mainAxis:m.mainAxis||0,crossAxis:m.crossAxis||0,alignmentAxis:m.alignmentAxis};return l&&typeof b=="number"&&(f=l==="end"?b*-1:b),d?{x:f*p,y:v*h}:{x:v*h,y:f*p}}const pa=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var i,o;const{x:s,y:r,placement:a,middlewareData:l}=t,d=await ha(t,e);return a===((i=l.offset)==null?void 0:i.placement)&&(o=l.arrow)!=null&&o.alignmentOffset?{}:{x:s+d.x,y:r+d.y,data:{...d,placement:a}}}}},fa=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:i,y:o,placement:s}=t,{mainAxis:r=!0,crossAxis:a=!1,limiter:l={fn:k=>{let{x,y:A}=k;return{x,y:A}}},...d}=$t(e,t),h={x:i,y:o},p=await xo(t,d),m=je(Ze(s)),v=Ts(m);let f=h[v],b=h[m];if(r){const k=v==="y"?"top":"left",x=v==="y"?"bottom":"right",A=f+p[k],T=f-p[x];f=no(A,f,T)}if(a){const k=m==="y"?"top":"left",x=m==="y"?"bottom":"right",A=b+p[k],T=b-p[x];b=no(A,b,T)}const g=l.fn({...t,[v]:f,[m]:b});return{...g,data:{x:g.x-i,y:g.y-o,enabled:{[v]:r,[m]:a}}}}}},ma=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var i,o;const{placement:s,rects:r,platform:a,elements:l}=t,{apply:d=()=>{},...h}=$t(e,t),p=await xo(t,h),m=Ze(s),v=Tt(s),f=je(s)==="y",{width:b,height:g}=r.floating;let k,x;m==="top"||m==="bottom"?(k=m,x=v===(await(a.isRTL==null?void 0:a.isRTL(l.floating))?"start":"end")?"left":"right"):(x=m,k=v==="end"?"top":"bottom");const A=g-p.top-p.bottom,T=b-p.left-p.right,U=Je(g-p[k],A),F=Je(b-p[x],T),we=!t.middlewareData.shift;let Z=U,Fe=F;if((i=t.middlewareData.shift)!=null&&i.enabled.x&&(Fe=T),(o=t.middlewareData.shift)!=null&&o.enabled.y&&(Z=A),we&&!v){const be=de(p.left,0),Ye=de(p.right,0),De=de(p.top,0),Ke=de(p.bottom,0);f?Fe=b-2*(be!==0||Ye!==0?be+Ye:de(p.left,p.right)):Z=g-2*(De!==0||Ke!==0?De+Ke:de(p.top,p.bottom))}await d({...t,availableWidth:Fe,availableHeight:Z});const Ae=await a.getDimensions(l.floating);return b!==Ae.width||g!==Ae.height?{reset:{rects:!0}}:{}}}};function Oi(){return typeof window<"u"}function St(e){return Es(e)?(e.nodeName||"").toLowerCase():"#document"}function ue(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Le(e){var t;return(t=(Es(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Es(e){return Oi()?e instanceof Node||e instanceof ue(e).Node:!1}function Ce(e){return Oi()?e instanceof Element||e instanceof ue(e).Element:!1}function Me(e){return Oi()?e instanceof HTMLElement||e instanceof ue(e).HTMLElement:!1}function jo(e){return!Oi()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof ue(e).ShadowRoot}const ba=new Set(["inline","contents"]);function Kt(e){const{overflow:t,overflowX:i,overflowY:o,display:s}=$e(e);return/auto|scroll|overlay|hidden|clip/.test(t+o+i)&&!ba.has(s)}const ga=new Set(["table","td","th"]);function va(e){return ga.has(St(e))}const ya=[":popover-open",":modal"];function zi(e){return ya.some(t=>{try{return e.matches(t)}catch{return!1}})}const wa=["transform","translate","scale","rotate","perspective"],ka=["transform","translate","scale","rotate","perspective","filter"],xa=["paint","layout","strict","content"];function Mi(e){const t=_o(),i=Ce(e)?$e(e):e;return wa.some(o=>i[o]?i[o]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!t&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!t&&(i.filter?i.filter!=="none":!1)||ka.some(o=>(i.willChange||"").includes(o))||xa.some(o=>(i.contain||"").includes(o))}function _a(e){let t=et(e);for(;Me(t)&&!_t(t);){if(Mi(t))return t;if(zi(t))return null;t=et(t)}return null}function _o(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Ca=new Set(["html","body","#document"]);function _t(e){return Ca.has(St(e))}function $e(e){return ue(e).getComputedStyle(e)}function Ii(e){return Ce(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function et(e){if(St(e)==="html")return e;const t=e.assignedSlot||e.parentNode||jo(e)&&e.host||Le(e);return jo(t)?t.host:t}function As(e){const t=et(e);return _t(t)?e.ownerDocument?e.ownerDocument.body:e.body:Me(t)&&Kt(t)?t:As(t)}function Ht(e,t,i){var o;t===void 0&&(t=[]),i===void 0&&(i=!0);const s=As(e),r=s===((o=e.ownerDocument)==null?void 0:o.body),a=ue(s);if(r){const l=co(a);return t.concat(a,a.visualViewport||[],Kt(s)?s:[],l&&i?Ht(l):[])}return t.concat(s,Ht(s,[],i))}function co(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Ds(e){const t=$e(e);let i=parseFloat(t.width)||0,o=parseFloat(t.height)||0;const s=Me(e),r=s?e.offsetWidth:i,a=s?e.offsetHeight:o,l=mi(i)!==r||mi(o)!==a;return l&&(i=r,o=a),{width:i,height:o,$:l}}function Co(e){return Ce(e)?e:e.contextElement}function xt(e){const t=Co(e);if(!Me(t))return ze(1);const i=t.getBoundingClientRect(),{width:o,height:s,$:r}=Ds(t);let a=(r?mi(i.width):i.width)/o,l=(r?mi(i.height):i.height)/s;return(!a||!Number.isFinite(a))&&(a=1),(!l||!Number.isFinite(l))&&(l=1),{x:a,y:l}}const $a=ze(0);function Os(e){const t=ue(e);return!_o()||!t.visualViewport?$a:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Ta(e,t,i){return t===void 0&&(t=!1),!i||t&&i!==ue(e)?!1:t}function pt(e,t,i,o){t===void 0&&(t=!1),i===void 0&&(i=!1);const s=e.getBoundingClientRect(),r=Co(e);let a=ze(1);t&&(o?Ce(o)&&(a=xt(o)):a=xt(e));const l=Ta(r,i,o)?Os(r):ze(0);let d=(s.left+l.x)/a.x,h=(s.top+l.y)/a.y,p=s.width/a.x,m=s.height/a.y;if(r){const v=ue(r),f=o&&Ce(o)?ue(o):o;let b=v,g=co(b);for(;g&&o&&f!==b;){const k=xt(g),x=g.getBoundingClientRect(),A=$e(g),T=x.left+(g.clientLeft+parseFloat(A.paddingLeft))*k.x,U=x.top+(g.clientTop+parseFloat(A.paddingTop))*k.y;d*=k.x,h*=k.y,p*=k.x,m*=k.y,d+=T,h+=U,b=ue(g),g=co(b)}}return gi({width:p,height:m,x:d,y:h})}function Pi(e,t){const i=Ii(e).scrollLeft;return t?t.left+i:pt(Le(e)).left+i}function zs(e,t){const i=e.getBoundingClientRect(),o=i.left+t.scrollLeft-Pi(e,i),s=i.top+t.scrollTop;return{x:o,y:s}}function Sa(e){let{elements:t,rect:i,offsetParent:o,strategy:s}=e;const r=s==="fixed",a=Le(o),l=t?zi(t.floating):!1;if(o===a||l&&r)return i;let d={scrollLeft:0,scrollTop:0},h=ze(1);const p=ze(0),m=Me(o);if((m||!m&&!r)&&((St(o)!=="body"||Kt(a))&&(d=Ii(o)),Me(o))){const f=pt(o);h=xt(o),p.x=f.x+o.clientLeft,p.y=f.y+o.clientTop}const v=a&&!m&&!r?zs(a,d):ze(0);return{width:i.width*h.x,height:i.height*h.y,x:i.x*h.x-d.scrollLeft*h.x+p.x+v.x,y:i.y*h.y-d.scrollTop*h.y+p.y+v.y}}function Ea(e){return Array.from(e.getClientRects())}function Aa(e){const t=Le(e),i=Ii(e),o=e.ownerDocument.body,s=de(t.scrollWidth,t.clientWidth,o.scrollWidth,o.clientWidth),r=de(t.scrollHeight,t.clientHeight,o.scrollHeight,o.clientHeight);let a=-i.scrollLeft+Pi(e);const l=-i.scrollTop;return $e(o).direction==="rtl"&&(a+=de(t.clientWidth,o.clientWidth)-s),{width:s,height:r,x:a,y:l}}const Vo=25;function Da(e,t){const i=ue(e),o=Le(e),s=i.visualViewport;let r=o.clientWidth,a=o.clientHeight,l=0,d=0;if(s){r=s.width,a=s.height;const p=_o();(!p||p&&t==="fixed")&&(l=s.offsetLeft,d=s.offsetTop)}const h=Pi(o);if(h<=0){const p=o.ownerDocument,m=p.body,v=getComputedStyle(m),f=p.compatMode==="CSS1Compat"&&parseFloat(v.marginLeft)+parseFloat(v.marginRight)||0,b=Math.abs(o.clientWidth-m.clientWidth-f);b<=Vo&&(r-=b)}else h<=Vo&&(r+=h);return{width:r,height:a,x:l,y:d}}const Oa=new Set(["absolute","fixed"]);function za(e,t){const i=pt(e,!0,t==="fixed"),o=i.top+e.clientTop,s=i.left+e.clientLeft,r=Me(e)?xt(e):ze(1),a=e.clientWidth*r.x,l=e.clientHeight*r.y,d=s*r.x,h=o*r.y;return{width:a,height:l,x:d,y:h}}function Wo(e,t,i){let o;if(t==="viewport")o=Da(e,i);else if(t==="document")o=Aa(Le(e));else if(Ce(t))o=za(t,i);else{const s=Os(e);o={x:t.x-s.x,y:t.y-s.y,width:t.width,height:t.height}}return gi(o)}function Ms(e,t){const i=et(e);return i===t||!Ce(i)||_t(i)?!1:$e(i).position==="fixed"||Ms(i,t)}function Ma(e,t){const i=t.get(e);if(i)return i;let o=Ht(e,[],!1).filter(l=>Ce(l)&&St(l)!=="body"),s=null;const r=$e(e).position==="fixed";let a=r?et(e):e;for(;Ce(a)&&!_t(a);){const l=$e(a),d=Mi(a);!d&&l.position==="fixed"&&(s=null),(r?!d&&!s:!d&&l.position==="static"&&!!s&&Oa.has(s.position)||Kt(a)&&!d&&Ms(e,a))?o=o.filter(p=>p!==a):s=l,a=et(a)}return t.set(e,o),o}function Ia(e){let{element:t,boundary:i,rootBoundary:o,strategy:s}=e;const a=[...i==="clippingAncestors"?zi(t)?[]:Ma(t,this._c):[].concat(i),o],l=a[0],d=a.reduce((h,p)=>{const m=Wo(t,p,s);return h.top=de(m.top,h.top),h.right=Je(m.right,h.right),h.bottom=Je(m.bottom,h.bottom),h.left=de(m.left,h.left),h},Wo(t,l,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Pa(e){const{width:t,height:i}=Ds(e);return{width:t,height:i}}function La(e,t,i){const o=Me(t),s=Le(t),r=i==="fixed",a=pt(e,!0,r,t);let l={scrollLeft:0,scrollTop:0};const d=ze(0);function h(){d.x=Pi(s)}if(o||!o&&!r)if((St(t)!=="body"||Kt(s))&&(l=Ii(t)),o){const f=pt(t,!0,r,t);d.x=f.x+t.clientLeft,d.y=f.y+t.clientTop}else s&&h();r&&!o&&s&&h();const p=s&&!o&&!r?zs(s,l):ze(0),m=a.left+l.scrollLeft-d.x-p.x,v=a.top+l.scrollTop-d.y-p.y;return{x:m,y:v,width:a.width,height:a.height}}function Ki(e){return $e(e).position==="static"}function Uo(e,t){if(!Me(e)||$e(e).position==="fixed")return null;if(t)return t(e);let i=e.offsetParent;return Le(e)===i&&(i=i.ownerDocument.body),i}function Is(e,t){const i=ue(e);if(zi(e))return i;if(!Me(e)){let s=et(e);for(;s&&!_t(s);){if(Ce(s)&&!Ki(s))return s;s=et(s)}return i}let o=Uo(e,t);for(;o&&va(o)&&Ki(o);)o=Uo(o,t);return o&&_t(o)&&Ki(o)&&!Mi(o)?i:o||_a(e)||i}const Ra=async function(e){const t=this.getOffsetParent||Is,i=this.getDimensions,o=await i(e.floating);return{reference:La(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function Na(e){return $e(e).direction==="rtl"}const di={convertOffsetParentRelativeRectToViewportRelativeRect:Sa,getDocumentElement:Le,getClippingRect:Ia,getOffsetParent:Is,getElementRects:Ra,getClientRects:Ea,getDimensions:Pa,getScale:xt,isElement:Ce,isRTL:Na};function Ps(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Fa(e,t){let i=null,o;const s=Le(e);function r(){var l;clearTimeout(o),(l=i)==null||l.disconnect(),i=null}function a(l,d){l===void 0&&(l=!1),d===void 0&&(d=1),r();const h=e.getBoundingClientRect(),{left:p,top:m,width:v,height:f}=h;if(l||t(),!v||!f)return;const b=oi(m),g=oi(s.clientWidth-(p+v)),k=oi(s.clientHeight-(m+f)),x=oi(p),T={rootMargin:-b+"px "+-g+"px "+-k+"px "+-x+"px",threshold:de(0,Je(1,d))||1};let U=!0;function F(we){const Z=we[0].intersectionRatio;if(Z!==d){if(!U)return a();Z?a(!1,Z):o=setTimeout(()=>{a(!1,1e-7)},1e3)}Z===1&&!Ps(h,e.getBoundingClientRect())&&a(),U=!1}try{i=new IntersectionObserver(F,{...T,root:s.ownerDocument})}catch{i=new IntersectionObserver(F,T)}i.observe(e)}return a(!0),r}function Ba(e,t,i,o){o===void 0&&(o={});const{ancestorScroll:s=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:d=!1}=o,h=Co(e),p=s||r?[...h?Ht(h):[],...Ht(t)]:[];p.forEach(x=>{s&&x.addEventListener("scroll",i,{passive:!0}),r&&x.addEventListener("resize",i)});const m=h&&l?Fa(h,i):null;let v=-1,f=null;a&&(f=new ResizeObserver(x=>{let[A]=x;A&&A.target===h&&f&&(f.unobserve(t),cancelAnimationFrame(v),v=requestAnimationFrame(()=>{var T;(T=f)==null||T.observe(t)})),i()}),h&&!d&&f.observe(h),f.observe(t));let b,g=d?pt(e):null;d&&k();function k(){const x=pt(e);g&&!Ps(g,x)&&i(),g=x,b=requestAnimationFrame(k)}return i(),()=>{var x;p.forEach(A=>{s&&A.removeEventListener("scroll",i),r&&A.removeEventListener("resize",i)}),m==null||m(),(x=f)==null||x.disconnect(),f=null,d&&cancelAnimationFrame(b)}}const Ha=pa,ja=fa,Va=da,qo=ma,Wa=ca,Ua=(e,t,i)=>{const o=new Map,s={platform:di,...i},r={...s.platform,_c:o};return la(e,t,{...s,platform:r})};function qa(e){return Ya(e)}function Gi(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Ya(e){for(let t=e;t;t=Gi(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=Gi(e);t;t=Gi(t)){if(!(t instanceof Element))continue;const i=getComputedStyle(t);if(i.display!=="contents"&&(i.position!=="static"||Mi(i)||t.tagName==="BODY"))return t}return null}function Ka(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var L=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let o=0,s=0,r=0,a=0,l=0,d=0,h=0,p=0;i?e.top<t.top?(o=e.left,s=e.bottom,r=e.right,a=e.bottom,l=t.left,d=t.top,h=t.right,p=t.top):(o=t.left,s=t.bottom,r=t.right,a=t.bottom,l=e.left,d=e.top,h=e.right,p=e.top):e.left<t.left?(o=e.right,s=e.top,r=t.left,a=t.top,l=e.right,d=e.bottom,h=t.left,p=t.bottom):(o=t.right,s=t.top,r=e.left,a=e.top,l=t.right,d=t.bottom,h=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${o}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${l}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${h}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||Ka(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Ba(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[Ha({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(qo({apply:({rects:i})=>{const o=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=o?`${i.reference.width}px`:"",this.popup.style.height=s?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(Va({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(ja({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(qo({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:o})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${o}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(Wa({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?i=>di.getOffsetParent(i,qa):di.getOffsetParent;Ua(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:qt(Ue({},di),{getOffsetParent:t})}).then(({x:i,y:o,middlewareData:s,placement:r})=>{const a=this.localize.dir()==="rtl",l={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${i}px`,top:`${o}px`}),this.arrow){const d=s.arrow.x,h=s.arrow.y;let p="",m="",v="",f="";if(this.arrowPlacement==="start"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",m=a?b:"",f=a?"":b}else if(this.arrowPlacement==="end"){const b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";m=a?"":b,f=a?b:"",v=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(f=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof h=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(f=typeof d=="number"?`${d}px`:"",p=typeof h=="number"?`${h}px`:"");Object.assign(this.arrowEl.style,{top:p,right:m,bottom:v,left:f,[l]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return u`
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
        ${this.arrow?u`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};L.styles=[N,Qr];n([C(".popup")],L.prototype,"popup",2);n([C(".popup__arrow")],L.prototype,"arrowEl",2);n([c()],L.prototype,"anchor",2);n([c({type:Boolean,reflect:!0})],L.prototype,"active",2);n([c({reflect:!0})],L.prototype,"placement",2);n([c({reflect:!0})],L.prototype,"strategy",2);n([c({type:Number})],L.prototype,"distance",2);n([c({type:Number})],L.prototype,"skidding",2);n([c({type:Boolean})],L.prototype,"arrow",2);n([c({attribute:"arrow-placement"})],L.prototype,"arrowPlacement",2);n([c({attribute:"arrow-padding",type:Number})],L.prototype,"arrowPadding",2);n([c({type:Boolean})],L.prototype,"flip",2);n([c({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],L.prototype,"flipFallbackPlacements",2);n([c({attribute:"flip-fallback-strategy"})],L.prototype,"flipFallbackStrategy",2);n([c({type:Object})],L.prototype,"flipBoundary",2);n([c({attribute:"flip-padding",type:Number})],L.prototype,"flipPadding",2);n([c({type:Boolean})],L.prototype,"shift",2);n([c({type:Object})],L.prototype,"shiftBoundary",2);n([c({attribute:"shift-padding",type:Number})],L.prototype,"shiftPadding",2);n([c({attribute:"auto-size"})],L.prototype,"autoSize",2);n([c()],L.prototype,"sync",2);n([c({type:Object})],L.prototype,"autoSizeBoundary",2);n([c({attribute:"auto-size-padding",type:Number})],L.prototype,"autoSizePadding",2);n([c({attribute:"hover-bridge",type:Boolean})],L.prototype,"hoverBridge",2);var Ls=new Map,Ga=new WeakMap;function Xa(e){return e??{keyframes:[],options:{duration:0}}}function Yo(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function R(e,t){Ls.set(e,Xa(t))}function H(e,t,i){const o=Ga.get(e);if(o!=null&&o[t])return Yo(o[t],i.dir);const s=Ls.get(t);return s?Yo(s,i.dir):{keyframes:[],options:{duration:0}}}function ne(e,t){return new Promise(i=>{function o(s){s.target===e&&(e.removeEventListener(t,o),i())}e.addEventListener(t,o)})}function j(e,t,i){return new Promise(o=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=e.animate(t,qt(Ue({},i),{duration:Qa()?0:i.duration}));s.addEventListener("cancel",o,{once:!0}),s.addEventListener("finish",o,{once:!0})})}function Ko(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function Qa(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function Y(e){return Promise.all(e.getAnimations().map(t=>new Promise(i=>{t.cancel(),requestAnimationFrame(i)})))}function Go(e,t){return e.map(i=>qt(Ue({},i),{height:i.height==="auto"?`${t}px`:i.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let uo=class extends Ai{constructor(t){if(super(t),this.it=w,t.type!==He.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===w||t==null)return this._t=void 0,this.it=t;if(t===wt)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};uo.directiveName="unsafeHTML",uo.resultType=1;const Ja=Ei(uo);var D=class extends I{constructor(){super(...arguments),this.formControlController=new Yt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.localize=new oe(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>u`
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
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,i=t.closest(".select__clear")!==null,o=t.closest("sl-icon-button")!==null;if(!(i||o)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const s=this.getAllOptions(),r=s.indexOf(this.currentOption);let a=Math.max(0,r);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(a=r+1,a>s.length-1&&(a=0)):e.key==="ArrowUp"?(a=r-1,a<0&&(a=s.length-1)):e.key==="Home"?a=0:e.key==="End"&&(a=s.length-1),this.setCurrentOption(s[a])}if(e.key&&e.key.length===1||e.key==="Backspace"){const s=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const r of s)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const i=e.composedPath().some(o=>o instanceof Element&&o.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const i=e.target.closest("sl-option"),o=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==o&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(t)?t:[t],o=[];e.forEach(s=>o.push(s.value)),this.setSelectedOptions(e.filter(s=>i.includes(s.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),i=Array.isArray(e)?e:[e];t.forEach(o=>o.selected=!1),i.length&&i.forEach(o=>o.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,i;const o=this.getAllOptions();this.selectedOptions=o.filter(r=>r.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(e=r==null?void 0:r.value)!=null?e:"",this.displayLabel=(i=(t=r==null?void 0:r.getTextLabel)==null?void 0:t.call(r))!=null?i:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(e,t);return u`<div @sl-remove=${o=>this.handleTagRemove(o,e)}>
          ${typeof i=="string"?Ja(i):i}
        </div>`}else if(t===this.maxOptionsVisible)return u`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return u``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,i){if(super.attributeChangedCallback(e,t,i),e==="value"){const o=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=o}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(i=>t.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await Y(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=H(this,"select.show",{dir:this.localize.dir()});await j(this.popup.popup,e,t),this.currentOption&&ao(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Y(this);const{keyframes:e,options:t}=H(this,"select.hide",{dir:this.localize.dir()});await j(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ne(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ne(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t,s=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return u`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
            class=${M({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":r,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};D.styles=[N,Di,Yr];D.dependencies={"sl-icon":X,"sl-popup":L,"sl-tag":bt};n([C(".select")],D.prototype,"popup",2);n([C(".select__combobox")],D.prototype,"combobox",2);n([C(".select__display-input")],D.prototype,"displayInput",2);n([C(".select__value-input")],D.prototype,"valueInput",2);n([C(".select__listbox")],D.prototype,"listbox",2);n([y()],D.prototype,"hasFocus",2);n([y()],D.prototype,"displayLabel",2);n([y()],D.prototype,"currentOption",2);n([y()],D.prototype,"selectedOptions",2);n([y()],D.prototype,"valueHasChanged",2);n([c()],D.prototype,"name",2);n([y()],D.prototype,"value",1);n([c({attribute:"value"})],D.prototype,"defaultValue",2);n([c({reflect:!0})],D.prototype,"size",2);n([c()],D.prototype,"placeholder",2);n([c({type:Boolean,reflect:!0})],D.prototype,"multiple",2);n([c({attribute:"max-options-visible",type:Number})],D.prototype,"maxOptionsVisible",2);n([c({type:Boolean,reflect:!0})],D.prototype,"disabled",2);n([c({type:Boolean})],D.prototype,"clearable",2);n([c({type:Boolean,reflect:!0})],D.prototype,"open",2);n([c({type:Boolean})],D.prototype,"hoist",2);n([c({type:Boolean,reflect:!0})],D.prototype,"filled",2);n([c({type:Boolean,reflect:!0})],D.prototype,"pill",2);n([c()],D.prototype,"label",2);n([c({reflect:!0})],D.prototype,"placement",2);n([c({attribute:"help-text"})],D.prototype,"helpText",2);n([c({reflect:!0})],D.prototype,"form",2);n([c({type:Boolean,reflect:!0})],D.prototype,"required",2);n([c()],D.prototype,"getTag",2);n([E("disabled",{waitUntilFirstUpdate:!0})],D.prototype,"handleDisabledChange",1);n([E(["defaultValue","value"],{waitUntilFirstUpdate:!0})],D.prototype,"handleValueChange",1);n([E("open",{waitUntilFirstUpdate:!0})],D.prototype,"handleOpenChange",1);R("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});D.define("sl-select");var Za=S`
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
`,ye=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(t+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(t+=i.textContent)}),t.trim()}render(){return u`
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
    `}};ye.styles=[N,Za];ye.dependencies={"sl-icon":X};n([C(".option__label")],ye.prototype,"defaultSlot",2);n([y()],ye.prototype,"current",2);n([y()],ye.prototype,"selected",2);n([y()],ye.prototype,"hasHover",2);n([c({reflect:!0})],ye.prototype,"value",2);n([c({type:Boolean,reflect:!0})],ye.prototype,"disabled",2);n([E("disabled")],ye.prototype,"handleDisabledChange",1);n([E("selected")],ye.prototype,"handleSelectedChange",1);n([E("value")],ye.prototype,"handleValueChange",1);ye.define("sl-option");var en=S`
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
`;function*$o(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*Tr($o(e.shadowRoot.activeElement))))}function Rs(){return[...$o()].pop()}var Xo=new WeakMap;function Ns(e){let t=Xo.get(e);return t||(t=window.getComputedStyle(e,null),Xo.set(e,t)),t}function tn(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=Ns(e);return t.visibility!=="hidden"&&t.display!=="none"}function on(e){const t=Ns(e),{overflowY:i,overflowX:o}=t;return i==="scroll"||o==="scroll"?!0:i!=="auto"||o!=="auto"?!1:e.scrollHeight>e.clientHeight&&i==="auto"||e.scrollWidth>e.clientWidth&&o==="auto"}function sn(e){const t=e.tagName.toLowerCase(),i=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const r=e.getRootNode(),a=`input[type='radio'][name="${e.getAttribute("name")}"]`,l=r.querySelector(`${a}:checked`);return l?l===e:r.querySelector(a)===e}return tn(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:on(e):!1}function rn(e){var t,i;const o=ho(e),s=(t=o[0])!=null?t:null,r=(i=o[o.length-1])!=null?i:null;return{start:s,end:r}}function an(e,t){var i;return((i=e.getRootNode({composed:!0}))==null?void 0:i.host)!==t}function ho(e){const t=new WeakMap,i=[];function o(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||t.has(s))return;t.set(s,!0),!i.includes(s)&&sn(s)&&i.push(s),s instanceof HTMLSlotElement&&an(s,e)&&s.assignedElements({flatten:!0}).forEach(r=>{o(r)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&o(s.shadowRoot)}for(const r of s.children)o(r)}return o(e),i.sort((s,r)=>{const a=Number(s.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var Pt=[],Fs=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var i;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const o=Rs();if(this.previousFocus=o,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=ho(this.element);let r=s.findIndex(l=>l===o);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=s.length?r=0:r+a<0?r=s.length-1:r+=a,this.previousFocus=this.currentFocus;const l=s[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||l&&this.possiblyHasTabbableChildren(l))return;t.preventDefault(),this.currentFocus=l,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...$o()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Pt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Pt=Pt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Pt[Pt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=ho(this.element);if(!this.element.matches(":focus-within")){const t=e[0],i=e[e.length-1],o=this.tabDirection==="forward"?t:i;typeof(o==null?void 0:o.focus)=="function"&&(this.currentFocus=o,o.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},To=e=>{var t;const{activeElement:i}=document;i&&e.contains(i)&&((t=document.activeElement)==null||t.blur())};function Qo(e){return e.charAt(0).toUpperCase()+e.slice(1)}var he=class extends I{constructor(){super(...arguments),this.hasSlotController=new qe(this,"footer"),this.localize=new oe(this),this.modal=new Fs(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Nt(this)))}disconnectedCallback(){super.disconnectedCallback(),Ft(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=H(this,"drawer.denyClose",{dir:this.localize.dir()});j(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Nt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Y(this.drawer),Y(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=H(this,`drawer.show${Qo(this.placement)}`,{dir:this.localize.dir()}),i=H(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([j(this.panel,t.keyframes,t.options),j(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{To(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Ft(this)),await Promise.all([Y(this.drawer),Y(this.overlay)]);const e=H(this,`drawer.hide${Qo(this.placement)}`,{dir:this.localize.dir()}),t=H(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([j(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),j(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Nt(this)),this.open&&this.contained&&(this.modal.deactivate(),Ft(this))}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return u`
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
          aria-label=${_(this.noHeader?this.label:void 0)}
          aria-labelledby=${_(this.noHeader?void 0:"title")}
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
    `}};he.styles=[N,en];he.dependencies={"sl-icon-button":W};n([C(".drawer")],he.prototype,"drawer",2);n([C(".drawer__panel")],he.prototype,"panel",2);n([C(".drawer__overlay")],he.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],he.prototype,"open",2);n([c({reflect:!0})],he.prototype,"label",2);n([c({reflect:!0})],he.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],he.prototype,"contained",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],he.prototype,"noHeader",2);n([E("open",{waitUntilFirstUpdate:!0})],he.prototype,"handleOpenChange",1);n([E("contained",{waitUntilFirstUpdate:!0})],he.prototype,"handleNoModalChange",1);R("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});R("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});R("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});R("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});R("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});R("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});he.define("sl-drawer");var nn=S`
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
`,Re=class extends I{constructor(){super(...arguments),this.hasSlotController=new qe(this,"footer"),this.localize=new oe(this),this.modal=new Fs(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Nt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Ft(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const i=H(this,"dialog.denyClose",{dir:this.localize.dir()});j(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Nt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([Y(this.dialog),Y(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=H(this,"dialog.show",{dir:this.localize.dir()}),i=H(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([j(this.panel,t.keyframes,t.options),j(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{To(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([Y(this.dialog),Y(this.overlay)]);const e=H(this,"dialog.hide",{dir:this.localize.dir()}),t=H(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([j(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),j(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Ft(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return u`
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
          aria-label=${_(this.noHeader?this.label:void 0)}
          aria-labelledby=${_(this.noHeader?void 0:"title")}
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
    `}};Re.styles=[N,nn];Re.dependencies={"sl-icon-button":W};n([C(".dialog")],Re.prototype,"dialog",2);n([C(".dialog__panel")],Re.prototype,"panel",2);n([C(".dialog__overlay")],Re.prototype,"overlay",2);n([c({type:Boolean,reflect:!0})],Re.prototype,"open",2);n([c({reflect:!0})],Re.prototype,"label",2);n([c({attribute:"no-header",type:Boolean,reflect:!0})],Re.prototype,"noHeader",2);n([E("open",{waitUntilFirstUpdate:!0})],Re.prototype,"handleOpenChange",1);R("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});R("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});R("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});Re.define("sl-dialog");var ln=S`
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
`,Gt=class extends I{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return u`
      <span
        part="base"
        class=${M({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};Gt.styles=[N,ln];n([c({reflect:!0})],Gt.prototype,"variant",2);n([c({type:Boolean,reflect:!0})],Gt.prototype,"pill",2);n([c({type:Boolean,reflect:!0})],Gt.prototype,"pulse",2);Gt.define("sl-badge");var cn=S`
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
`,pe=class at extends I{constructor(){super(...arguments),this.hasSlotController=new qe(this,"icon","suffix"),this.localize=new oe(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,i="100%",o="0";this.countdownAnimation=t.animate([{width:i},{width:o}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await Y(this.base),this.base.hidden=!1;const{keyframes:t,options:i}=H(this,"alert.show",{dir:this.localize.dir()});await j(this.base,t,i),this.emit("sl-after-show")}else{To(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await Y(this.base);const{keyframes:t,options:i}=H(this,"alert.hide",{dir:this.localize.dir()});await j(this.base,t,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),at.toastStack.parentElement===null&&document.body.append(at.toastStack),at.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{at.toastStack.removeChild(this),t(),at.toastStack.querySelector("sl-alert")===null&&at.toastStack.remove()},{once:!0})})}render(){return u`
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
                class=${M({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};pe.styles=[N,cn];pe.dependencies={"sl-icon-button":W};n([C('[part~="base"]')],pe.prototype,"base",2);n([C(".alert__countdown-elapsed")],pe.prototype,"countdownElement",2);n([c({type:Boolean,reflect:!0})],pe.prototype,"open",2);n([c({type:Boolean,reflect:!0})],pe.prototype,"closable",2);n([c({reflect:!0})],pe.prototype,"variant",2);n([c({type:Number})],pe.prototype,"duration",2);n([c({type:String,reflect:!0})],pe.prototype,"countdown",2);n([y()],pe.prototype,"remainingTime",2);n([E("open",{waitUntilFirstUpdate:!0})],pe.prototype,"handleOpenChange",1);n([E("duration")],pe.prototype,"handleDurationChange",1);var dn=pe;R("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});dn.define("sl-alert");var un=S`
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
`,O=class extends I{constructor(){super(...arguments),this.formControlController=new Yt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new qe(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,i="none"){this.input.setSelectionRange(e,t,i)}setRangeText(e,t,i,o="preserve"){const s=t??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(e,s,r,o),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),i=this.label?!0:!!e,o=this.helpText?!0:!!t;return u`
      <div
        part="form-control"
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
              name=${_(this.name)}
              .value=${fi(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${_(this.placeholder)}
              rows=${_(this.rows)}
              minlength=${_(this.minlength)}
              maxlength=${_(this.maxlength)}
              autocapitalize=${_(this.autocapitalize)}
              autocorrect=${_(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${_(this.spellcheck)}
              enterkeyhint=${_(this.enterkeyhint)}
              inputmode=${_(this.inputmode)}
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
    `}};O.styles=[N,Di,un];n([C(".textarea__control")],O.prototype,"input",2);n([C(".textarea__size-adjuster")],O.prototype,"sizeAdjuster",2);n([y()],O.prototype,"hasFocus",2);n([c()],O.prototype,"title",2);n([c()],O.prototype,"name",2);n([c()],O.prototype,"value",2);n([c({reflect:!0})],O.prototype,"size",2);n([c({type:Boolean,reflect:!0})],O.prototype,"filled",2);n([c()],O.prototype,"label",2);n([c({attribute:"help-text"})],O.prototype,"helpText",2);n([c()],O.prototype,"placeholder",2);n([c({type:Number})],O.prototype,"rows",2);n([c()],O.prototype,"resize",2);n([c({type:Boolean,reflect:!0})],O.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],O.prototype,"readonly",2);n([c({reflect:!0})],O.prototype,"form",2);n([c({type:Boolean,reflect:!0})],O.prototype,"required",2);n([c({type:Number})],O.prototype,"minlength",2);n([c({type:Number})],O.prototype,"maxlength",2);n([c()],O.prototype,"autocapitalize",2);n([c()],O.prototype,"autocorrect",2);n([c()],O.prototype,"autocomplete",2);n([c({type:Boolean})],O.prototype,"autofocus",2);n([c()],O.prototype,"enterkeyhint",2);n([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],O.prototype,"spellcheck",2);n([c()],O.prototype,"inputmode",2);n([yo()],O.prototype,"defaultValue",2);n([E("disabled",{waitUntilFirstUpdate:!0})],O.prototype,"handleDisabledChange",1);n([E("rows",{waitUntilFirstUpdate:!0})],O.prototype,"handleRowsChange",1);n([E("value",{waitUntilFirstUpdate:!0})],O.prototype,"handleValueChange",1);O.define("sl-textarea");var hn=S`
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
`,se=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(o,s)=>{if(!o)return null;const r=o.closest(s);if(r)return r;const a=o.getRootNode();return a instanceof ShadowRoot?i(a.host,s):null};setTimeout(()=>{var o;const s=((o=this.containingElement)==null?void 0:o.getRootNode())instanceof ShadowRoot?Rs():document.activeElement;(!this.containingElement||i(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const i=t.getAllItems(),o=i[0],s=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(o),o.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(o=>rn(o).start);let i;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=t.button;break;default:i=t}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await Y(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=H(this,"dropdown.show",{dir:this.localize.dir()});await j(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await Y(this);const{keyframes:e,options:t}=H(this,"dropdown.hide",{dir:this.localize.dir()});await j(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return u`
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
        sync=${_(this.sync?this.sync:void 0)}
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
    `}};se.styles=[N,hn];se.dependencies={"sl-popup":L};n([C(".dropdown")],se.prototype,"popup",2);n([C(".dropdown__trigger")],se.prototype,"trigger",2);n([C(".dropdown__panel")],se.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],se.prototype,"open",2);n([c({reflect:!0})],se.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],se.prototype,"disabled",2);n([c({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],se.prototype,"stayOpenOnSelect",2);n([c({attribute:!1})],se.prototype,"containingElement",2);n([c({type:Number})],se.prototype,"distance",2);n([c({type:Number})],se.prototype,"skidding",2);n([c({type:Boolean})],se.prototype,"hoist",2);n([c({reflect:!0})],se.prototype,"sync",2);n([E("open",{waitUntilFirstUpdate:!0})],se.prototype,"handleOpenChange",1);R("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});se.define("sl-dropdown");var pn=S`
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
`,So=class extends I{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],i=e.composedPath(),o=i.find(l=>{var d;return t.includes(((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))||"")});if(!o||i.find(l=>{var d;return((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))==="menu"})!==this)return;const a=o;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),i=this.getCurrentItem();let o=i?t.indexOf(i):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?o++:e.key==="ArrowUp"?o--:e.key==="Home"?o=0:e.key==="End"&&(o=t.length-1),o<0&&(o=t.length-1),o>t.length-1&&(o=0),this.setCurrentItem(t[o]),t[o].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===e?"0":"-1")})}render(){return u`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};So.styles=[N,pn];n([C("slot")],So.prototype,"defaultSlot",2);So.define("sl-menu");var fn=S`
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
 */const Bt=(e,t)=>{var o;const i=e._$AN;if(i===void 0)return!1;for(const s of i)(o=s._$AO)==null||o.call(s,t,!1),Bt(s,t);return!0},vi=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while((i==null?void 0:i.size)===0)},Bs=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),gn(t)}};function mn(e){this._$AN!==void 0?(vi(this),this._$AM=e,Bs(this)):this._$AM=e}function bn(e,t=!1,i=0){const o=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(t)if(Array.isArray(o))for(let r=i;r<o.length;r++)Bt(o[r],!1),vi(o[r]);else o!=null&&(Bt(o,!1),vi(o));else Bt(this,e)}const gn=e=>{e.type==He.CHILD&&(e._$AP??(e._$AP=bn),e._$AQ??(e._$AQ=mn))};class vn extends Ai{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,o){super._$AT(t,i,o),Bs(this),this.isConnected=t._$AU}_$AO(t,i=!0){var o,s;t!==this.isConnected&&(this.isConnected=t,t?(o=this.reconnected)==null||o.call(this):(s=this.disconnected)==null||s.call(this)),i&&(Bt(this,t),vi(this))}setValue(t){if(Cs(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const yn=()=>new wn;class wn{}const Xi=new WeakMap,kn=Ei(class extends vn{render(e){return w}update(e,[t]){var o;const i=t!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=(o=e.options)==null?void 0:o.host,this.rt(this.ct=e.element)),w}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=Xi.get(t);i===void 0&&(i=new WeakMap,Xi.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=Xi.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var xn=class{constructor(e,t){this.popupRef=yn(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var o;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(o=i.target.role)!=null&&o.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),o=i==null?void 0:i.assignedElements({flatten:!0}).filter(h=>h.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!o)return;const{left:r,top:a,width:l,height:d}=o.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+d}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const o of t.assignedElements())if(i=o.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let o=1;o!==i.length;++o)i[o].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),o=["padding-top","border-top-width","margin-top"].reduce((s,r)=>{var a;const l=(a=t.get(r))!=null?a:new CSSUnitValue(0,"px"),h=(l instanceof CSSUnitValue?l:new CSSUnitValue(0,"px")).to("px");return s-h.value},0);this.skidding=o}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?u`
      <sl-popup
        ${kn(this.popupRef)}
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
    `:u` <slot name="submenu" hidden></slot> `}},fe=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new qe(this,"submenu"),this.submenuController=new xn(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Ar(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return u`
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
        ${this.loading?u` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};fe.styles=[N,fn];fe.dependencies={"sl-icon":X,"sl-popup":L,"sl-spinner":Si};n([C("slot:not([name])")],fe.prototype,"defaultSlot",2);n([C(".menu-item")],fe.prototype,"menuItem",2);n([c()],fe.prototype,"type",2);n([c({type:Boolean,reflect:!0})],fe.prototype,"checked",2);n([c()],fe.prototype,"value",2);n([c({type:Boolean,reflect:!0})],fe.prototype,"loading",2);n([c({type:Boolean,reflect:!0})],fe.prototype,"disabled",2);n([E("checked")],fe.prototype,"handleCheckedChange",1);n([E("disabled")],fe.prototype,"handleDisabledChange",1);n([E("type")],fe.prototype,"handleTypeChange",1);fe.define("sl-menu-item");X.define("sl-icon");var _n=S`
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
`,Li=class extends I{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Li.styles=[N,_n];n([c({type:Boolean,reflect:!0})],Li.prototype,"vertical",2);n([E("vertical")],Li.prototype,"handleVerticalChange",1);Li.define("sl-divider");var Cn=S`
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
`,Q=class extends I{constructor(){super(),this.localize=new oe(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=Ko(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=Ko(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await Y(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:o}=H(this,"tooltip.show",{dir:this.localize.dir()});await j(this.popup.popup,i,o),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await Y(this.body);const{keyframes:i,options:o}=H(this,"tooltip.hide",{dir:this.localize.dir()});await j(this.popup.popup,i,o),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ne(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ne(this,"sl-after-hide")}render(){return u`
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
    `}};Q.styles=[N,Cn];Q.dependencies={"sl-popup":L};n([C("slot:not([name])")],Q.prototype,"defaultSlot",2);n([C(".tooltip__body")],Q.prototype,"body",2);n([C("sl-popup")],Q.prototype,"popup",2);n([c()],Q.prototype,"content",2);n([c()],Q.prototype,"placement",2);n([c({type:Boolean,reflect:!0})],Q.prototype,"disabled",2);n([c({type:Number})],Q.prototype,"distance",2);n([c({type:Boolean,reflect:!0})],Q.prototype,"open",2);n([c({type:Number})],Q.prototype,"skidding",2);n([c()],Q.prototype,"trigger",2);n([c({type:Boolean})],Q.prototype,"hoist",2);n([E("open",{waitUntilFirstUpdate:!0})],Q.prototype,"handleOpenChange",1);n([E(["content","distance","hoist","placement","skidding"])],Q.prototype,"handleOptionsChange",1);n([E("disabled")],Q.prototype,"handleDisabledChange",1);R("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});R("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});Q.define("sl-tooltip");var $n=S`
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
`,G=class extends I{constructor(){super(...arguments),this.formControlController=new Yt(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new qe(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return u`
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
            value=${_(this.value)}
            .indeterminate=${fi(this.indeterminate)}
            .checked=${fi(this.checked)}
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
    `}};G.styles=[N,Di,$n];G.dependencies={"sl-icon":X};n([C('input[type="checkbox"]')],G.prototype,"input",2);n([y()],G.prototype,"hasFocus",2);n([c()],G.prototype,"title",2);n([c()],G.prototype,"name",2);n([c()],G.prototype,"value",2);n([c({reflect:!0})],G.prototype,"size",2);n([c({type:Boolean,reflect:!0})],G.prototype,"disabled",2);n([c({type:Boolean,reflect:!0})],G.prototype,"checked",2);n([c({type:Boolean,reflect:!0})],G.prototype,"indeterminate",2);n([yo("checked")],G.prototype,"defaultChecked",2);n([c({reflect:!0})],G.prototype,"form",2);n([c({type:Boolean,reflect:!0})],G.prototype,"required",2);n([c({attribute:"help-text"})],G.prototype,"helpText",2);n([E("disabled",{waitUntilFirstUpdate:!0})],G.prototype,"handleDisabledChange",1);n([E(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],G.prototype,"handleStateChange",1);G.define("sl-checkbox");var Tn=S`
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
`,Sn=S`
  :host {
    display: contents;
  }
`,Ri=class extends I{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(i=>this.resizeObserver.unobserve(i)),this.observedElements=[],t.forEach(i=>{this.resizeObserver.observe(i),this.observedElements.push(i)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return u` <slot @slotchange=${this.handleSlotChange}></slot> `}};Ri.styles=[N,Sn];n([c({type:Boolean,reflect:!0})],Ri.prototype,"disabled",2);n([E("disabled",{waitUntilFirstUpdate:!0})],Ri.prototype,"handleDisabledChange",1);var J=class extends I{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new oe(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const i=t.filter(({target:o})=>{if(o===this)return!0;if(o.closest("sl-tab-group")!==this)return!1;const s=o.tagName.toLowerCase();return s==="sl-tab"||s==="sl-tab-panel"});if(i.length!==0){if(i.some(o=>!["aria-labelledby","aria-controls"].includes(o.attributeName))&&setTimeout(()=>this.setAriaLabels()),i.some(o=>o.attributeName==="disabled"))this.syncTabsAndPanels();else if(i.some(o=>o.attributeName==="active")){const s=i.filter(r=>r.attributeName==="active"&&r.target.tagName.toLowerCase()==="sl-tab").map(r=>r.target).find(r=>r.active);s&&this.setActiveTab(s)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((i,o)=>{var s;i[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((s=this.getActiveTab())!=null?s:this.tabs[0],{emitEvents:!1}),o.unobserve(i[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const i=e.target.closest("sl-tab");(i==null?void 0:i.closest("sl-tab-group"))===this&&i!==null&&this.setActiveTab(i,{scrollBehavior:"smooth"})}handleKeyDown(e){const i=e.target.closest("sl-tab");if((i==null?void 0:i.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&i!==null&&(this.setActiveTab(i,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const s=this.tabs.find(l=>l.matches(":focus")),r=this.localize.dir()==="rtl";let a=null;if((s==null?void 0:s.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")a=this.focusableTabs[0];else if(e.key==="End")a=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const l=this.tabs.findIndex(d=>d===s);a=this.findNextFocusableTab(l,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const l=this.tabs.findIndex(d=>d===s);a=this.findNextFocusableTab(l,"forward")}if(!a)return;a.tabIndex=0,a.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(a,{scrollBehavior:"smooth"}):this.tabs.forEach(l=>{l.tabIndex=l===a?0:-1}),["top","bottom"].includes(this.placement)&&ao(a,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=Ue({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const i=this.activeTab;this.activeTab=e,this.tabs.forEach(o=>{o.active=o===this.activeTab,o.tabIndex=o===this.activeTab?0:-1}),this.panels.forEach(o=>{var s;return o.active=o.name===((s=this.activeTab)==null?void 0:s.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&ao(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(i&&this.emit("sl-tab-hide",{detail:{name:i.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(i=>i.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,i=e.clientHeight,o=this.localize.dir()==="rtl",s=this.getAllTabs(),a=s.slice(0,s.indexOf(e)).reduce((l,d)=>({left:l.left+d.clientWidth,top:l.top+d.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=o?`${-1*a.left}px`:`${a.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${i}px`,this.indicator.style.translate=`0 ${a.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let i=null;const o=t==="forward"?1:-1;let s=e+o;for(;e<this.tabs.length;){if(i=this.tabs[s]||null,i===null){t==="forward"?i=this.focusableTabs[0]:i=this.focusableTabs[this.focusableTabs.length-1];break}if(!i.disabled)break;s+=o}return i}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(i=>i.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return u`
      <div
        part="base"
        class=${M({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?u`
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

          ${this.hasScrollControls?u`
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
    `}};J.styles=[N,Tn];J.dependencies={"sl-icon-button":W,"sl-resize-observer":Ri};n([C(".tab-group")],J.prototype,"tabGroup",2);n([C(".tab-group__body")],J.prototype,"body",2);n([C(".tab-group__nav")],J.prototype,"nav",2);n([C(".tab-group__indicator")],J.prototype,"indicator",2);n([y()],J.prototype,"hasScrollControls",2);n([y()],J.prototype,"shouldHideScrollStartButton",2);n([y()],J.prototype,"shouldHideScrollEndButton",2);n([c()],J.prototype,"placement",2);n([c()],J.prototype,"activation",2);n([c({attribute:"no-scroll-controls",type:Boolean})],J.prototype,"noScrollControls",2);n([c({attribute:"fixed-scroll-controls",type:Boolean})],J.prototype,"fixedScrollControls",2);n([Sr({passive:!0})],J.prototype,"updateScrollButtons",1);n([E("noScrollControls",{waitUntilFirstUpdate:!0})],J.prototype,"updateScrollControls",1);n([E("placement",{waitUntilFirstUpdate:!0})],J.prototype,"syncIndicator",1);J.define("sl-tab-group");var En=(e,t)=>{let i=0;return function(...o){window.clearTimeout(i),i=window.setTimeout(()=>{e.call(this,...o)},t)}},Jo=(e,t,i)=>{const o=e[t];e[t]=function(...s){o.call(this,...s),i.call(this,o,...s)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,i=new WeakMap,o=r=>{for(const a of r.changedTouches)t.add(a.identifier)},s=r=>{for(const a of r.changedTouches)t.delete(a.identifier)};document.addEventListener("touchstart",o,!0),document.addEventListener("touchend",s,!0),document.addEventListener("touchcancel",s,!0),Jo(EventTarget.prototype,"addEventListener",function(r,a){if(a!=="scrollend")return;const l=En(()=>{t.size?l():this.dispatchEvent(new Event("scrollend"))},100);r.call(this,"scroll",l,{passive:!0}),i.set(this,l)}),Jo(EventTarget.prototype,"removeEventListener",function(r,a){if(a!=="scrollend")return;const l=i.get(this);l&&r.call(this,"scroll",l,{passive:!0})})}})();var An=S`
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
`,Dn=0,Se=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.attrId=++Dn,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,u`
      <div
        part="base"
        class=${M({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
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
    `}};Se.styles=[N,An];Se.dependencies={"sl-icon-button":W};n([C(".tab")],Se.prototype,"tab",2);n([c({reflect:!0})],Se.prototype,"panel",2);n([c({type:Boolean,reflect:!0})],Se.prototype,"active",2);n([c({type:Boolean,reflect:!0})],Se.prototype,"closable",2);n([c({type:Boolean,reflect:!0})],Se.prototype,"disabled",2);n([c({type:Number,reflect:!0})],Se.prototype,"tabIndex",2);n([E("active")],Se.prototype,"handleActiveChange",1);n([E("disabled")],Se.prototype,"handleDisabledChange",1);Se.define("sl-tab");var On=S`
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
`,zn=0,Xt=class extends I{constructor(){super(...arguments),this.attrId=++zn,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return u`
      <slot
        part="base"
        class=${M({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};Xt.styles=[N,On];n([c({reflect:!0})],Xt.prototype,"name",2);n([c({type:Boolean,reflect:!0})],Xt.prototype,"active",2);n([E("active")],Xt.prototype,"handleActiveChange",1);Xt.define("sl-tab-panel");Si.define("sl-spinner");W.define("sl-icon-button");var Mn=S`
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
`,Ee=class extends I{constructor(){super(...arguments),this.localize=new oe(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await Y(this.body);const{keyframes:t,options:i}=H(this,"details.show",{dir:this.localize.dir()});await j(this.body,Go(t,this.body.scrollHeight),i),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await Y(this.body);const{keyframes:t,options:i}=H(this,"details.hide",{dir:this.localize.dir()});await j(this.body,Go(t,this.body.scrollHeight),i),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,ne(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,ne(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return u`
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
    `}};Ee.styles=[N,Mn];Ee.dependencies={"sl-icon":X};n([C(".details")],Ee.prototype,"details",2);n([C(".details__header")],Ee.prototype,"header",2);n([C(".details__body")],Ee.prototype,"body",2);n([C(".details__expand-icon-slot")],Ee.prototype,"expandIconSlot",2);n([c({type:Boolean,reflect:!0})],Ee.prototype,"open",2);n([c()],Ee.prototype,"summary",2);n([c({type:Boolean,reflect:!0})],Ee.prototype,"disabled",2);n([E("open",{waitUntilFirstUpdate:!0})],Ee.prototype,"handleOpenChange",1);R("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});R("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});Ee.define("sl-details");const In="modulepreload",Pn=function(e,t){return new URL(e,t).href},Zo={},es=function(t,i,o){let s=Promise.resolve();if(i&&i.length>0){const a=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),d=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));s=Promise.allSettled(i.map(h=>{if(h=Pn(h,o),h in Zo)return;Zo[h]=!0;const p=h.endsWith(".css"),m=p?'[rel="stylesheet"]':"";if(!!o)for(let b=a.length-1;b>=0;b--){const g=a[b];if(g.href===h&&(!p||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${m}`))return;const f=document.createElement("link");if(f.rel=p?"stylesheet":In,p||(f.as="script"),f.crossOrigin="",f.href=h,d&&f.setAttribute("nonce",d),document.head.appendChild(f),p)return new Promise((b,g)=>{f.addEventListener("load",b),f.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${h}`)))})}))}function r(a){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=a,window.dispatchEvent(l),!l.defaultPrevented)throw a}return s.then(a=>{for(const l of a||[])l.status==="rejected"&&r(l.reason);return t().catch(r)})};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Ln=class extends Event{constructor(t,i,o,s){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i,this.callback=o,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Rn{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,i=!1){const o=i||!Object.is(t,this.o);this.o=t,o&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:o}]of this.subscriptions)i(this.o,o)},t!==void 0&&(this.value=t)}addCallback(t,i,o){if(!o)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:i});const{disposer:s}=this.subscriptions.get(t);t(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Nn=class extends Event{constructor(t,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=i}};class ts extends Rn{constructor(t,i,o){var s,r;super(i.context!==void 0?i.initialValue:o),this.onContextRequest=a=>{if(a.context!==this.context)return;const l=a.contextTarget??a.composedPath()[0];l!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,l,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const l=new Set;for(const[d,{consumerHost:h}]of this.subscriptions)l.has(d)||(l.add(d),h.dispatchEvent(new Ln(this.context,h,d,!0)));a.stopPropagation()},this.host=t,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(r=(s=this.host).addController)==null||r.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Nn(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Fn({context:e}){return(t,i)=>{const o=new WeakMap;if(typeof i=="object")return{get(){return t.get.call(this)},set(s){return o.get(this).setValue(s),t.set.call(this,s)},init(s){return o.set(this,new ts(this,{context:e,initialValue:s})),s}};{t.constructor.addInitializer(a=>{o.set(a,new ts(a,{context:e}))});const s=Object.getOwnPropertyDescriptor(t,i);let r;if(s===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(l){o.get(this).setValue(l),a.set(this,l)},configurable:!0,enumerable:!0}}else{const a=s.set;r={...s,set(l){o.get(this).setValue(l),a==null||a.call(this,l)}}}return void Object.defineProperty(t,i,r)}}}var q={},Ni={};Object.defineProperty(Ni,"__esModule",{value:!0});Ni.StoreController=void 0;class Bn{constructor(t,i){this.host=t,this.atom=i,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}Ni.StoreController=Bn;var Et={};Object.defineProperty(Et,"__esModule",{value:!0});Et.MultiStoreController=void 0;class Hn{constructor(t,i){this.host=t,this.atoms=i,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(i=>i())}get values(){return this.atoms.map(t=>t.get())}}Et.MultiStoreController=Hn;var Fi={};Object.defineProperty(Fi,"__esModule",{value:!0});Fi.useStores=void 0;const jn=Et;function Vn(...e){return t=>class extends t{constructor(...i){super(...i),new jn.MultiStoreController(this,e)}}}Fi.useStores=Vn;var Bi={};Object.defineProperty(Bi,"__esModule",{value:!0});Bi.withStores=void 0;const Wn=Et,Un=(e,t)=>class extends e{constructor(...o){super(...o),new Wn.MultiStoreController(this,t)}};Bi.withStores=Un;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=Ni;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var i=Et;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return i.MultiStoreController}});var o=Fi;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return o.useStores}});var s=Bi;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return s.withStores}})})(q);const qn=Symbol("board"),Yn={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let _e=[],Xe=0;const si=4;let ui=0;const re=e=>{let t=[],i={get(){return i.lc||i.listen(()=>{})(),i.value},lc:0,listen(o){return i.lc=t.push(o),()=>{for(let r=Xe+si;r<_e.length;)_e[r]===o?_e.splice(r,si):r+=si;let s=t.indexOf(o);~s&&(t.splice(s,1),--i.lc||i.off())}},notify(o,s){ui++;let r=!_e.length;for(let a of t)_e.push(a,i.value,o,s);if(r){for(Xe=0;Xe<_e.length;Xe+=si)_e[Xe](_e[Xe+1],_e[Xe+2],_e[Xe+3]);_e.length=0}},off(){},set(o){let s=i.value;s!==o&&(i.value=o,i.notify(s))},subscribe(o){let s=i.listen(o);return o(i.value),s},value:e};return i},Kn=5,ri=6,ai=10;let Gn=(e,t,i,o)=>(e.events=e.events||{},e.events[i+ai]||(e.events[i+ai]=o(s=>{e.events[i].reduceRight((r,a)=>(a(r),r),{shared:{},...s})})),e.events[i]=e.events[i]||[],e.events[i].push(t),()=>{let s=e.events[i],r=s.indexOf(t);s.splice(r,1),s.length||(delete e.events[i],e.events[i+ai](),delete e.events[i+ai])}),Xn=1e3,Qn=(e,t)=>Gn(e,o=>{let s=t(o);s&&e.events[ri].push(s)},Kn,o=>{let s=e.listen;e.listen=(...a)=>(!e.lc&&!e.active&&(e.active=!0,o()),s(...a));let r=e.off;return e.events[ri]=[],e.off=()=>{r(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let a of e.events[ri])a();e.events[ri]=[]}},Xn)},()=>{e.listen=s,e.off=r}}),Jn=(e,t,i)=>{Array.isArray(e)||(e=[e]);let o,s,r=()=>{if(s===ui)return;s=ui;let h=e.map(p=>p.get());if(!o||h.some((p,m)=>p!==o[m])){o=h;let p=t(...h);p&&p.then&&p.t?p.then(m=>{o===h&&a.set(m)}):(a.set(p),s=ui)}},a=re(void 0),l=a.get;a.get=()=>(r(),l());let d=r;return Qn(a,()=>{let h=e.map(p=>p.listen(d));return r(),()=>{for(let p of h)p()}}),a};const ot=(e,t)=>Jn(e,t),Zn=(e={})=>{let t=re(e);return t.setKey=function(i,o){let s=t.value;typeof o>"u"&&i in t.value?(t.value={...t.value},delete t.value[i],t.notify(s,i)):t.value[i]!==o&&(t.value={...t.value,[i]:o},t.notify(s,i))},t},Ie=re(!1),jt=re(null),Qt=re(!0),el=re(!1),tl=ot([Ie,Qt],(e,t)=>e&&!t);function Qi(e){jt.set(e),Ie.set(!0)}function il(){Ie.set(!1),jt.set(null),Qt.set(!0)}function ol(e){Qt.set(e)}function is(e){el.set(e)}class Hs extends Error{constructor(t,i,o){super(t),this.status=i,this.body=o,this.name="ApiError"}}function Vt(e){if(!e)return[];const t=[],i=e.split(`
`);for(const o of i){const s=o.trim();if(!s)continue;const r={text:s};if(s.length>=18&&s[4]==="-"&&s[7]==="-"&&s[10]===" "&&s[13]===":"){const a=s.indexOf(" - ",16);if(a!==-1){r.timestamp=s.slice(0,16);let l=s.slice(a+3);if(l.startsWith("(from: ")){const d=l.indexOf(") ");d!==-1?(r.author=l.slice(7,d),r.text=l.slice(d+2)):r.text=l}else r.text=l}}t.push(r)}return t}async function sl(e,t){const i=e.startsWith("/")?"./"+e.slice(1):e,o=await fetch(i,t);if(!o.ok){const s=await o.text();throw new Hs(`API request failed: ${o.status} ${o.statusText}`,o.status,s)}return o.json()}async function rl(){return sl("/api/roadmap")}const ge=Zn({}),yi=re(null),js=re(""),Jt=re(!0),Hi=re(null),al=ot(ge,e=>Object.values(e)),nl=ot(ge,e=>{const t=Date.now()-432e5;return Object.values(e).filter(i=>i.type!=="epic"?!1:i.status!=="closed"?!0:i.closed_at?new Date(i.closed_at).getTime()>t:!1).map(i=>({id:i.id,title:i.title}))}),ji=ot([ge,yi],(e,t)=>t&&e[t]||null),ll=ot(ji,e=>e?Vt(e.notes):[]),cl=ot([ge,ji],(e,t)=>{var i;return(i=t==null?void 0:t.blocked_by)!=null&&i.length?t.blocked_by.map(o=>{const s=e[o];return s?{id:s.id,title:s.title,status:s.status}:null}).filter(o=>o!==null):[]}),dl=ot([ge,ji],(e,t)=>{if(!(t!=null&&t.parent))return"";const i=e[t.parent];return(i==null?void 0:i.title)||""});function ul(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(i=>{const o=t[i];return o?o.status!=="closed":!1})}function wi(e,t={}){const i=ul(e,t);let o;return e.status==="closed"?o="done":i?o="blocked":e.awaiting?o="human":e.status==="in_progress"?o="agent":o="ready",{...e,is_blocked:i,column:o}}function hl(e){const t={};for(const o of e)t[o.id]=o;const i={};for(const o of e)i[o.id]=wi(o,t);ge.set(i),Jt.set(!1),Hi.set(null)}function pl(e){const t={};for(const[o,s]of e)t[o]=s;const i={};for(const[o,s]of e)i[o]=wi(s,t);ge.set(i),Jt.set(!1),Hi.set(null)}function yt(e){var a;const t=ge.get(),i={};for(const[l,d]of Object.entries(t))i[l]=d;i[e.id]=e;const o=wi(e,i),s={...t};s[e.id]=o;const r=t[e.id];if((r==null?void 0:r.status)!==e.status)for(const[l,d]of Object.entries(t))l!==e.id&&(a=d.blocked_by)!=null&&a.includes(e.id)&&(s[l]=wi(d,i));ge.set(s)}function fl(e){const t=ge.get(),{[e]:i,...o}=t;ge.set(o),yi.get()===e&&yi.set(null)}function nt(e){yi.set(e)}function Vs(e){js.set(e)}function ki(e){Jt.set(e)}function Wt(e){Hi.set(e),Jt.set(!1)}const dt=re(null);function ml(){dt.set(null)}function os(e){return{epicId:e.epicId,source:e.source,state:"running",status:e.event.status??"",message:e.event.message??"",startedAt:e.event.timestamp,updatedAt:e.event.timestamp,success:null,costUsd:null,durationMs:null,ticks:[]}}function bl(e,t){if(e===void 0)return!1;const i=Date.parse(e),o=Date.parse(t);return Number.isNaN(i)||Number.isNaN(o)?!1:o<i}function Ji(e,t){const i=Date.parse(e),o=Date.parse(t);return Number.isNaN(i)?t:Number.isNaN(o)?e:o>=i?t:e}function gl(e,t){const i=e.ticks.findIndex(s=>s.tickId===t.tickId);if(i===-1)return[...e.ticks,t];if(bl(e.ticks[i].updatedAt,t.updatedAt))return e.ticks;const o=[...e.ticks];return o[i]=t,o}function vl(e){var o,s;const t=dt.get(),i=t===null||t.epicId!==e.epicId?os(e):{...t};switch(e.event.type){case"epic-started":dt.set({...os(e),ticks:[]});return;case"epic-completed":dt.set({...i,source:e.source,state:"finished",status:e.event.status??i.status,message:e.event.message??i.message,updatedAt:Ji(i.updatedAt,e.event.timestamp),success:e.event.success??null,costUsd:((o=e.event.metrics)==null?void 0:o.costUsd)??i.costUsd,durationMs:((s=e.event.metrics)==null?void 0:s.durationMs)??i.durationMs});return;case"task-started":case"task-update":case"task-completed":{if(e.taskId===void 0||e.taskId==="")return;const r=e.event.type==="task-completed";dt.set({...i,updatedAt:Ji(i.updatedAt,e.event.timestamp),ticks:gl(i,{tickId:e.taskId,state:r?e.event.success===!0?"succeeded":"failed":"running",status:e.event.status??"",message:e.event.message??"",updatedAt:e.event.timestamp})});return}default:t!==null&&t.epicId===e.epicId&&dt.set({...i,updatedAt:Ji(i.updatedAt,e.event.timestamp)});return}}function yl(e,t,i,o){if(e.status!=="closed"&&(e.awaiting||e.manual))return"gated";if(e.status==="closed")return"done";if(e.status==="open")for(const s of t){const r=i.get(s);if(r&&r.status!=="closed")return"queued"}return e.status==="in_progress"||o>0?"active":"ready"}function wl(e){const t=new Set,i=new Map;for(const f of e)f.type==="epic"&&(t.add(f.id),i.set(f.id,f));if(t.size===0)return{waves:null};const o=new Map,s=new Map;for(const f of e)f.parent&&t.has(f.parent)&&(o.set(f.parent,(o.get(f.parent)??0)+1),f.status==="closed"&&s.set(f.parent,(s.get(f.parent)??0)+1));const r=new Map,a=new Map,l=new Map;for(const[f,b]of i){const g=[],k=[],x=[],A=new Set;for(const T of b.blocked_by??[])t.has(T)&&(g.push(T),A.has(T)||(A.add(T),x.push(T)));for(const T of b.after??[])t.has(T)&&(k.push(T),A.has(T)||(A.add(T),x.push(T)));r.set(f,g),a.set(f,k),l.set(f,x)}const d=new Map,h=new Map;for(const f of i.keys())d.set(f,0);for(const[f,b]of l)for(const g of b){d.set(f,(d.get(f)??0)+1);const k=h.get(g)??[];k.push(f),h.set(g,k)}const p=[...i.keys()].sort(),m=new Set(p),v=[];for(;m.size>0;){const f=[];for(const g of p)m.has(g)&&d.get(g)===0&&f.push(g);if(f.length===0){const k=p.filter(x=>m.has(x)).map(x=>ss(i.get(x),r.get(x)??[],a.get(x)??[],i,o.get(x)??0,s.get(x)??0));v.push(k);break}const b=f.map(g=>ss(i.get(g),r.get(g)??[],a.get(g)??[],i,o.get(g)??0,s.get(g)??0));v.push(b);for(const g of f){m.delete(g);for(const k of h.get(g)??[])m.has(k)&&d.set(k,(d.get(k)??0)-1)}}return{waves:v}}function ss(e,t,i,o,s,r){const a=yl(e,t,o,s);return{id:e.id,title:e.title,status:a,awaiting_type:a==="gated"?e.awaiting??"work":void 0,blocked_by:t.length>0?[...t]:void 0,after:i.length>0?[...i]:void 0,children_total:s,children_closed:r}}const Ws=re(null),po=re(!1),fo=re(null);async function Us(){po.set(!0),fo.set(null);try{let e;if(Ie.get()){const t=ge.get();e=wl(Object.values(t))}else e=await rl();Ws.set(e)}catch(e){fo.set(e instanceof Error?e.message:String(e))}finally{po.set(!1)}}typeof window<"u"&&window.addEventListener("tick-update-for-roadmap",()=>{Us().catch(()=>{})});class kl extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class ut extends Error{constructor(t){super(t),this.name="ConnectionError"}}const xl="",rs=1e3,_l=3e4;class Cl{constructor(t=xl){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.reconnectDelay=rs,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,i)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=rs,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",o=>{this.handleUpdateEvent(o)}),this.eventSource.onerror=()=>{var s;console.log("[LocalComms] SSE connection error");const o=this.connected;this.connected=!1,o&&this.emitConnection({type:"connection:disconnected"}),(s=this.eventSource)==null||s.close(),this.eventSource=null,this.scheduleReconnect(),o||i(new ut("Failed to connect to SSE endpoint"))}}catch(o){i(new ut(`Failed to create EventSource: ${o}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,_l)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}async createTick(t){const i=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!i.ok)throw new Error(`Failed to create tick: ${i.statusText}`);return i.json()}async updateTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!o.ok)throw new Error(`Failed to update tick: ${o.statusText}`);return o.json()}async deleteTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!i.ok)throw new Error(`Failed to delete tick: ${i.statusText}`)}async addNote(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:i})});if(!o.ok)throw new Error(`Failed to add note: ${o.statusText}`);return o.json()}async approveTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!i.ok)throw new Error(`Failed to approve tick: ${i.statusText}`);return i.json()}async rejectTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!o.ok)throw new Error(`Failed to reject tick: ${o.statusText}`);return o.json()}async closeTick(t,i){const o=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:i})});if(!o.ok)throw new Error(`Failed to close tick: ${o.statusText}`);return o.json()}async reopenTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!i.ok)throw new Error(`Failed to reopen tick: ${i.statusText}`);return i.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(o=>({...o,is_blocked:o.isBlocked}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`Failed to fetch tick: ${i.statusText}`);return i.json()}async fetchActivity(t){const i=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,o=await fetch(i);if(!o.ok)throw new Error(`Failed to fetch activity: ${o.statusText}`);return(await o.json()).activities}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const i=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",i),i.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:o,tickId:s}=i;if(!s){console.warn("[LocalComms] Update event missing tickId:",i);return}o==="create"||o==="update"?this.fetchAndEmitTick(s):o==="delete"&&this.emitTick({type:"tick:deleted",tickId:s})}catch(i){console.error("[LocalComms] Failed to parse update event:",i)}}async fetchAndEmitTick(t){try{const i=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!i.ok)throw new Error(`HTTP ${i.status}`);const o=await i.json();this.emitTick({type:"tick:updated",tick:o})}catch(i){console.error(`[LocalComms] Failed to fetch tick ${t}:`,i),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${i}`})}}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(o){console.error("[LocalComms] Error in tick handler:",o)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(o){console.error("[LocalComms] Error in connection handler:",o)}}}const $l=10,Tl=1e3,Sl=3e4;class El{constructor(t){this.tickHandlers=new Set,this.connectionHandlers=new Set,this.runHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.tickCache=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,i)=>{try{const o=window.location.protocol==="https:"?"wss:":"ws:",s=window.location.host,r=localStorage.getItem("token")||"",a=`${o}//${s}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",a);const l=["ticks-v1",`token-${encodeURIComponent(r)}`];this.ws=new WebSocket(a,l);let d=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,d||(d=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=h=>{this.handleMessage(h)},this.ws.onclose=h=>{console.log("[CloudComms] WebSocket closed:",h.code,h.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),d||(d=!0,i(new ut(`WebSocket closed: ${h.code} ${h.reason}`)))},this.ws.onerror=h=>{console.error("[CloudComms] WebSocket error:",h),d||(d=!0,i(new ut("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(o){i(new ut(`Failed to create WebSocket: ${o}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=$l){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min(Tl*Math.pow(2,this.reconnectAttempts),Sl);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(i=>{console.error("[CloudComms] Reconnect failed:",i)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}async createTick(t){this.checkWritable();const i={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,after:t.after,awaiting:t.awaiting,owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async updateTick(t,i){this.checkWritable();const s=this.tickCache.get(t)??{id:t,title:"",description:"",status:"open",priority:2,type:"task",owner:"",created_by:"",created_at:new Date().toISOString(),updated_at:new Date().toISOString()},r={updated_at:new Date().toISOString()};i.title!==void 0&&(r.title=i.title),i.description!==void 0&&(r.description=i.description),i.status!==void 0&&(r.status=i.status),i.priority!==void 0&&(r.priority=i.priority),i.labels!==void 0&&(r.labels=i.labels),i.blocked_by!==void 0&&(r.blocked_by=i.blocked_by),i.after!==void 0&&(r.after=i.after),i.awaiting!==void 0&&(r.awaiting=i.awaiting);const a={...s,...r};return this.sendMessage({type:"tick_update",tick:a}),a}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,i){return this.checkWritable(),this.tickOperation(t,"note",{message:i})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,i){return this.checkWritable(),this.tickOperation(t,"reject",{reason:i})}async closeTick(t,i){return this.checkWritable(),this.tickOperation(t,"close",{reason:i})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const i of this.tickCache.values()){const o=(i.blocked_by||[]).some(r=>{const a=this.tickCache.get(r);return a?a.status!=="closed":!1});let s="ready";i.status==="closed"?s="done":o?s="blocked":i.awaiting?s="human":i.status==="in_progress"&&(s="agent"),t.push({...i,is_blocked:o,column:s})}return t}async fetchInfo(){const t=[];for(const i of this.tickCache.values())i.type==="epic"&&t.push({id:i.id,title:i.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const i=this.tickCache.get(t);if(!i)throw new Error(`Tick not found: ${t}`);const o=[];if(i.blocked_by&&i.blocked_by.length>0)for(const a of i.blocked_by){const l=this.tickCache.get(a);l?o.push({id:l.id,title:l.title,status:l.status}):o.push({id:a,title:`Tick ${a}`,status:"unknown"})}const s=o.some(a=>a.status!=="closed"&&a.status!=="unknown");let r="ready";return i.status==="closed"?r="done":s?r="blocked":i.awaiting?r="human":i.status==="in_progress"&&(r="agent"),{...i,isBlocked:s,column:r,notesList:Vt(i.notes),blockerDetails:o}}async fetchActivity(t){return[]}handleMessage(t){try{const i=JSON.parse(t.data);switch(i.type){case"state_full":this.handleStateFullMessage(i);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(i);break;case"tick_deleted":this.handleTickDeleteMessage(i);break;case"connected":console.log("[CloudComms] Connection confirmed:",i.connectionId);break;case"error":console.error("[CloudComms] Server error:",i.message),this.emitConnection({type:"connection:error",message:i.message});break;case"local_status":this.handleLocalStatusMessage(i);break;case"run_event":this.emitRun({type:"run:event",message:i});break;default:console.warn("[CloudComms] Unknown message type:",i.type)}}catch(i){console.error("[CloudComms] Failed to parse message:",i)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[o,s]of Object.entries(t.ticks))this.tickCache.set(o,s);const i=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:i})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}emitTick(t){for(const i of this.tickHandlers)try{i(t)}catch(o){console.error("[CloudComms] Error in tick handler:",o)}}emitRun(t){for(const i of this.runHandlers)try{i(t)}catch(o){console.error("[CloudComms] Error in run handler:",o)}}emitConnection(t){for(const i of this.connectionHandlers)try{i(t)}catch(o){console.error("[CloudComms] Error in connection handler:",o)}}checkWritable(){if(!this.connected)throw new ut("Not connected to server");if(!this.localAgentConnected)throw new kl("Cannot write: local agent is offline")}sendMessage(t){var i;if(((i=this.ws)==null?void 0:i.readyState)!==WebSocket.OPEN)throw new ut("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,i,o){const s=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${i}`,r=localStorage.getItem("token")||"",a=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",...r?{Authorization:`Bearer ${r}`}:{}},body:o?JSON.stringify(o):void 0});if(!a.ok){const l=await a.json().catch(()=>({error:a.statusText}));throw new Error(l.error||`Failed to ${i} tick`)}return a.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let i="";for(let o=0;o<3;o++)i+=t.charAt(Math.floor(Math.random()*t.length));return i}}const ft=re(null),mt=re("disconnected"),qs=ot([mt,Ie,Qt],(e,t,i)=>!t||e!=="connected"?e:i?"connected":"disconnected");function Ys(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),yt(e.tick),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),fl(e.tickId),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),pl(e.ticks),window.dispatchEvent(new CustomEvent("tick-update-for-roadmap"));break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function Al(e){e.type==="run:event"&&vl(e.message)}function Ks(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),mt.set("connected"),is(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),mt.set("disconnected"),is(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),ol(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),Wt(e.message);break}}let as=!1,ht=[];async function Eo(){Ao(),console.log("[CommsStore] Initializing local mode"),mt.set("connecting"),ki(!0);const e=new Cl;ht.push(e.onTick(Ys)),ht.push(e.onConnection(Ks)),ft.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),Wt(`Connection failed: ${t}`)}}async function xi(e){var o;Ao(),console.log("[CommsStore] Initializing cloud mode for project:",e),mt.set("connecting"),ki(!0);const t=new El(e);ht.push(t.onTick(Ys)),ht.push(t.onConnection(Ks));const i=(o=t.onRun)==null?void 0:o.bind(t);i&&ht.push(i(Al)),ft.set(t),Vs(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(s){console.error("[CommsStore] Failed to connect:",s),Wt(`Connection failed: ${s}`)}}async function Dl(){const e=Ie.get(),t=jt.get();e&&t?await xi(t):await Eo()}function Ol(){Ao(),mt.set("disconnected")}function Ao(){for(const t of ht)t();ht=[],ml();const e=ft.get();e&&(e.disconnect(),ft.set(null))}function me(){const e=ft.get();if(!e)throw new Error("CommsClient not initialized");return e}async function Gs(e){return me().createTick(e)}async function Xs(e,t){return me().updateTick(e,t)}async function zl(e){return me().deleteTick(e)}async function Qs(e,t){return me().addNote(e,t)}async function Js(e){return me().approveTick(e)}async function Zs(e,t){return me().rejectTick(e,t)}async function er(e,t){return me().closeTick(e,t)}async function tr(e){return me().reopenTick(e)}async function ir(){return me().fetchTicks()}async function or(){return me().fetchInfo()}async function Do(e){return me().fetchTick(e)}async function Oo(e){return me().fetchActivity(e)}function sr(){if(as){console.log("[CommsStore] Already initialized, skipping");return}as=!0,console.log("[CommsStore] Setting up auto-connect"),Ie.subscribe(e=>{const t=jt.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?xi(t):e||Eo()}),jt.subscribe(e=>{const t=Ie.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!ft.get()&&xi(e)})}const ns=Object.freeze(Object.defineProperty({__proto__:null,$commsClient:ft,$connectionStatus:mt,$effectiveConnectionStatus:qs,addNote:Qs,approveTick:Js,closeTick:er,createTick:Gs,deleteTick:zl,disconnectComms:Ol,fetchActivity:Oo,fetchInfo:or,fetchTickDetails:Do,fetchTicks:ir,getCommsClient:me,initCloudComms:xi,initComms:Dl,initCommsAutoConnect:sr,initLocalComms:Eo,rejectTick:Zs,reopenTick:tr,updateTickViaComms:Xs},Symbol.toStringTag,{value:"Module"}));var Ml=Object.defineProperty,Il=Object.getOwnPropertyDescriptor,Vi=(e,t,i,o)=>{for(var s=o>1?void 0:o?Il(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Ml(t,i,s),s};const Pl={done:"var(--green, #a6e3a1)",active:"var(--blue, #89b4fa)",ready:"var(--yellow, #f9e2af)",queued:"var(--surface2, #585b70)",gated:"var(--peach, #fab387)"},Ll={done:"Done",active:"Active",ready:"Needs planning",queued:"Queued",gated:"Gated"};let Ct=class extends ve{constructor(){super(...arguments),this.roadmap=null,this.loading=!1,this.error=null}_close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){nt(e),this._close()}_pct(e){return e.children_total===0?0:Math.round(e.children_closed/e.children_total*100)}_renderEpicCard(e){const t=Pl[e.status]??"var(--surface2)",i=this._pct(e);return u`
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
            <span class="badge badge-status">${Ll[e.status]}</span>

            ${e.awaiting_type?u`<span class="badge badge-awaiting">⏳ ${e.awaiting_type}</span>`:w}

            ${e.blocked_by&&e.blocked_by.length>0?e.blocked_by.map(o=>u`
                  <span class="badge badge-blocked">⊘ ${o}</span>
                `):w}

            ${e.after&&e.after.length>0?e.after.map(o=>u`
                  <span class="badge badge-after">→ ${o}</span>
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
    `}_renderWave(e,t){return u`
      <div class="wave-group">
        <div class="wave-label">Wave ${t+1}</div>
        ${e.map(i=>this._renderEpicCard(i))}
      </div>
    `}_renderBody(){var t;if(this.loading)return u`<div class="state-box"><span class="spinner">⟳</span> Loading roadmap…</div>`;if(this.error)return u`<div class="state-box error">Failed to load roadmap: ${this.error}</div>`;const e=((t=this.roadmap)==null?void 0:t.waves)??null;return!e||e.length===0?u`<div class="state-box">No epics found — roadmap is empty.</div>`:u`
      <div class="body">
        ${e.map((i,o)=>this._renderWave(i,o))}
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
    `}};Ct.styles=S`
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

    /* Soft-ordering (after) chip — deliberately muted vs the blocked chip:
       overlay/subtext tones, no alarm color. */
    .badge-after {
      background: color-mix(in srgb, var(--overlay0, #6c7086) 12%, transparent);
      color: var(--overlay2, #9399b2);
      border: 1px solid color-mix(in srgb, var(--overlay0, #6c7086) 30%, transparent);
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
  `;Vi([c({attribute:!1})],Ct.prototype,"roadmap",2);Vi([c({type:Boolean})],Ct.prototype,"loading",2);Vi([c({attribute:!1})],Ct.prototype,"error",2);Ct=Vi([Te("roadmap-view")],Ct);var Rl=Object.defineProperty,Nl=Object.getOwnPropertyDescriptor,rr=(e,t,i,o)=>{for(var s=o>1?void 0:o?Nl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Rl(t,i,s),s};const Fl=5*6e4,Bl=15e3;let _i=class extends ve{constructor(){super(...arguments),this.runController=new q.StoreController(this,dt),this.now=Date.now(),this.timer=null}connectedCallback(){super.connectedCallback(),this.timer=setInterval(()=>{this.now=Date.now()},Bl)}disconnectedCallback(){super.disconnectedCallback(),this.timer!==null&&(clearInterval(this.timer),this.timer=null)}ago(e){const t=Date.parse(e);if(Number.isNaN(t))return"unknown";const i=Math.max(0,Math.round((this.now-t)/1e3));if(i<60)return`${i}s ago`;const o=Math.round(i/60);return o<60?`${o}m ago`:`${Math.round(o/60)}h ago`}isStale(e){const t=Date.parse(e.updatedAt);return Number.isNaN(t)?!1:e.state==="running"&&this.now-t>Fl}cost(e){return e.costUsd===null?"cost unknown":`$${e.costUsd.toFixed(2)}`}renderTick(e){return u`
      <div class="tick" title=${e.message}>
        <span class="tick-id">${e.tickId}</span>
        <span class="pill ${e.state}">${e.status||e.state}</span>
      </div>
    `}render(){const e=this.runController.value;if(!e)return u``;const t=this.isStale(e),i=e.state==="finished"?e.success===!0?"succeeded":"failed":t?"stale":"running";return u`
      <div class="panel ${e.state==="finished"?"finished":""} ${t?"stale":""}">
        <div class="summary">
          <span class="epic">${e.epicId}</span>
          <span class="pill ${i}">${e.state==="finished"?e.status||"finished":i}</span>
          <span class="meta">${e.source}</span>
          <span class="meta">last seen ${this.ago(e.updatedAt)}</span>
          <span class="meta">${this.cost(e)}</span>
        </div>
        ${e.message?u`<div class="message">${e.message}</div>`:""}
        ${e.ticks.length>0?u`<div class="ticks">${e.ticks.map(o=>this.renderTick(o))}</div>`:""}
        <div class="caveat">Live view only — a tick is done when collect says so.</div>
      </div>
    `}};_i.styles=S`
    :host {
      display: block;
    }

    .panel {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-left: 3px solid var(--green);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin: 0.75rem 1rem 0;
      font-size: 0.8125rem;
    }

    .panel.finished {
      border-left-color: var(--overlay0);
    }

    .panel.stale {
      border-left-color: var(--yellow);
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .epic {
      font-family: monospace;
      font-weight: 600;
      color: var(--text);
    }

    .pill {
      border-radius: 999px;
      padding: 0.0625rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
      background: var(--surface1);
      color: var(--subtext1);
    }

    .pill.running {
      background: color-mix(in srgb, var(--green) 20%, transparent);
      color: var(--green);
    }

    .pill.succeeded {
      background: color-mix(in srgb, var(--blue) 20%, transparent);
      color: var(--blue);
    }

    .pill.failed {
      background: color-mix(in srgb, var(--red) 20%, transparent);
      color: var(--red);
    }

    .pill.stale {
      background: color-mix(in srgb, var(--yellow) 20%, transparent);
      color: var(--yellow);
    }

    .meta {
      color: var(--subtext0);
    }

    .message {
      margin-top: 0.25rem;
      color: var(--subtext0);
      overflow-wrap: anywhere;
    }

    .ticks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .tick {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--base);
      border: 1px solid var(--surface1);
      border-radius: 6px;
      padding: 0.1875rem 0.5rem;
    }

    .tick-id {
      font-family: monospace;
      color: var(--text);
    }

    .caveat {
      margin-top: 0.5rem;
      color: var(--overlay1);
      font-size: 0.6875rem;
    }
  `;rr([y()],_i.prototype,"now",2);_i=rr([Te("live-run-panel")],_i);var Hl=Object.defineProperty,jl=Object.getOwnPropertyDescriptor,le=(e,t,i,o)=>{for(var s=o>1?void 0:o?jl(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Hl(t,i,s),s};console.log("[TickBoard] Initializing comms module");sr();const Zi=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Oe=["blocked","ready","agent","human","done"];let ee=class extends ve{constructor(){super(...arguments),this.boardState={...Yn},this.ticksController=new q.StoreController(this,al),this.epicsController=new q.StoreController(this,nl),this.repoNameController=new q.StoreController(this,js),this.selectedTickController=new q.StoreController(this,ji),this.selectedTickNotesController=new q.StoreController(this,ll),this.selectedTickBlockersController=new q.StoreController(this,cl),this.selectedTickParentTitleController=new q.StoreController(this,dl),this.loadingController=new q.StoreController(this,Jt),this.errorController=new q.StoreController(this,Hi),this.isCloudModeController=new q.StoreController(this,Ie),this.localClientConnectedController=new q.StoreController(this,Qt),this.isReadOnlyController=new q.StoreController(this,tl),this.connectionStatusController=new q.StoreController(this,qs),this.roadmapController=new q.StoreController(this,Ws),this.roadmapLoadingController=new q.StoreController(this,po),this.roadmapErrorController=new q.StoreController(this,fo),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showDashboard=!1,this.dashboardActivities=[],this.showRoadmap=!1,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused())&&!(this.showDashboard&&e.key!=="Escape"&&e.key!=="d"&&e.key!=="m"&&e.key!=="?")&&!(this.showRoadmap&&e.key!=="Escape"&&e.key!=="m"&&e.key!=="?"))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"d":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleDashboard());break;case"m":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRoadmap());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}get roadmapData(){return this.roadmapController.value}get roadmapLoading(){return this.roadmapLoadingController.value}get roadmapError(){return this.roadmapErrorController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.isCloudMode||this.loadData()}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const i=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",i),Qi(i);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),Qi(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const i=new URLSearchParams(window.location.search).get("project");if(i){console.log("[TickBoard] Cloud mode from query param, project:",i),Qi(i);return}}console.log("[TickBoard] Local mode"),il()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),ki(!0);return}ki(!0),Wt(null);try{const[e,t]=await Promise.all([ir(),or()]);hl(e),Vs(t.repoName),this.updateBoardState()}catch(e){Wt(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown)}isInputFocused(){var o;let e=document.activeElement;for(;(o=e==null?void 0:e.shadowRoot)!=null&&o.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let i=e;for(;i;){const s=i.tagName.toLowerCase();if(s.startsWith("sl-")&&(s.includes("input")||s.includes("textarea")||s.includes("select")))return!0;const r=i.getRootNode();i=r instanceof ShadowRoot?r.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Oe.length?[]:this.getColumnTicks(Oe[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Oe.length;e++)if(this.getColumnTicks(Oe[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let i=this.focusedTickIndex+e;i<0?i=t.length-1:i>=t.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Oe.length-1:t>=Oe.length&&(t=0),this.focusedColumnIndex=t;const i=this.getColumnTicks(Oe[t]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Oe[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&nt(e[this.focusedTickIndex].id)}handleEscape(){this.showRoadmap?this.showRoadmap=!1:this.showDashboard?this.showDashboard=!1:this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?nt(null):this.clearFocus()}async toggleDashboard(){if(this.showDashboard=!this.showDashboard,this.showDashboard)try{this.dashboardActivities=await Oo(20)}catch{this.dashboardActivities=[]}}async toggleRoadmap(){this.showRoadmap=!this.showRoadmap,this.showRoadmap&&await Us()}handleDashboardEpicSelect(e){this.selectedEpic=e.detail.epicId,this.showDashboard=!1,this.updateBoardState()}handleDashboardTickSelect(e){nt(e.detail.tickId),this.showDashboard=!1}async handleDashboardTickResume(e){var i,o;const{tickId:t}=e.detail;try{const s=await es(()=>Promise.resolve().then(()=>ns),void 0,import.meta.url).then(r=>r.approveTick(t));yt(s),(i=window.showToast)==null||i.call(window,{message:`Resumed tick ${t}`,variant:"success"})}catch(s){(o=window.showToast)==null||o.call(window,{message:`Failed to resume ${t}: ${s instanceof Error?s.message:s}`,variant:"danger"})}}async handleDashboardTickRetry(e){var i,o;const{tickId:t}=e.detail;try{const s=await es(()=>Promise.resolve().then(()=>ns),void 0,import.meta.url).then(r=>r.reopenTick(t));yt(s),(i=window.showToast)==null||i.call(window,{message:`Retrying tick ${t}`,variant:"success"})}catch(s){(o=window.showToast)==null||o.call(window,{message:`Failed to retry ${t}: ${s instanceof Error?s.message:s}`,variant:"danger"})}}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const i=e.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var i;const{tick:t}=e.detail;yt(t),this.showCreateDialog=!1,this.updateBoardState(),(i=window.showToast)==null||i.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const i=e.target.querySelector("sl-tab[active]");if(i){const o=i.getAttribute("panel");o&&Oe.includes(o)&&(this.activeColumn=o,this.focusedColumnIndex=Oe.indexOf(o),this.focusedTickIndex=this.getColumnTicks(o).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,i=this.ticks.find(o=>o.id===t);i?nt(i.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(nt(t.id),!this.isCloudMode)try{const i=await Do(t.id);yt(i)}catch(i){console.error("Failed to fetch tick details:",i)}}handleDrawerClose(){nt(null)}handleTickUpdated(e){const{tick:t}=e.detail;yt(t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(i=>i.id.toLowerCase().includes(t)||i.title.toLowerCase().includes(t)||i.description&&i.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}render(){if(this.loading)return u`
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

      <!-- Live run, when one is streaming (tick bne). Its own surface, never
           the columns: the stream is observability, and a tick still only
           moves when the tracker says so. -->
      <live-run-panel></live-run-panel>

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
            ${Zi.map((t,i)=>u`
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
          ${Zi.map(t=>u`
            <sl-tab
              slot="nav"
              panel=${t.id}
              ?active=${this.activeColumn===t.id}
            >
              ${t.icon}
              <span class="tab-badge">${this.getColumnTicks(t.id).length}</span>
            </sl-tab>
          `)}
          ${Zi.map((t,i)=>u`
            <sl-tab-panel name=${t.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(t.id).length===0?u`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${t.icon}</div>
                        <div>No ticks in ${t.name}</div>
                      </div>
                    `:this.getColumnTicks(t.id).map(o=>u`
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
    `}};ee.styles=S`
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
  `;le([Fn({context:qn}),y()],ee.prototype,"boardState",2);le([y()],ee.prototype,"selectedEpic",2);le([y()],ee.prototype,"searchTerm",2);le([y()],ee.prototype,"activeColumn",2);le([y()],ee.prototype,"isMobile",2);le([y()],ee.prototype,"focusedColumnIndex",2);le([y()],ee.prototype,"focusedTickIndex",2);le([y()],ee.prototype,"showKeyboardHelp",2);le([y()],ee.prototype,"showCreateDialog",2);le([y()],ee.prototype,"showMobileFilterDrawer",2);le([y()],ee.prototype,"showDashboard",2);le([y()],ee.prototype,"dashboardActivities",2);le([y()],ee.prototype,"showRoadmap",2);ee=le([Te("tick-board")],ee);const ar=6048e5,Vl=864e5,Wl=6e4,Ul=36e5,ni=43200,ls=1440,cs=Symbol.for("constructDateFrom");function Ve(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&cs in e?e[cs](t):e instanceof Date?new e.constructor(t):new Date(t)}function K(e,t){return Ve(t||e,e)}let ql={};function Zt(){return ql}function Ut(e,t){var l,d,h,p;const i=Zt(),o=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(h=i.locale)==null?void 0:h.options)==null?void 0:p.weekStartsOn)??0,s=K(e,t==null?void 0:t.in),r=s.getDay(),a=(r<o?7:0)+r-o;return s.setDate(s.getDate()-a),s.setHours(0,0,0,0),s}function Ci(e,t){return Ut(e,{...t,weekStartsOn:1})}function nr(e,t){const i=K(e,t==null?void 0:t.in),o=i.getFullYear(),s=Ve(i,0);s.setFullYear(o+1,0,4),s.setHours(0,0,0,0);const r=Ci(s),a=Ve(i,0);a.setFullYear(o,0,4),a.setHours(0,0,0,0);const l=Ci(a);return i.getTime()>=r.getTime()?o+1:i.getTime()>=l.getTime()?o:o-1}function $i(e){const t=K(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function ei(e,...t){const i=Ve.bind(null,e||t.find(o=>typeof o=="object"));return t.map(i)}function ds(e,t){const i=K(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Yl(e,t,i){const[o,s]=ei(i==null?void 0:i.in,e,t),r=ds(o),a=ds(s),l=+r-$i(r),d=+a-$i(a);return Math.round((l-d)/Vl)}function Kl(e,t){const i=nr(e,t),o=Ve(e,0);return o.setFullYear(i,0,4),o.setHours(0,0,0,0),Ci(o)}function hi(e,t){const i=+K(e)-+K(t);return i<0?-1:i>0?1:i}function Gl(e){return Ve(e,Date.now())}function Xl(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Ql(e){return!(!Xl(e)&&typeof e!="number"||isNaN(+K(e)))}function Jl(e,t,i){const[o,s]=ei(i==null?void 0:i.in,e,t),r=o.getFullYear()-s.getFullYear(),a=o.getMonth()-s.getMonth();return r*12+a}function zo(e){return t=>{const o=(e?Math[e]:Math.trunc)(t);return o===0?0:o}}function Zl(e,t,i){const[o,s]=ei(i==null?void 0:i.in,e,t),r=(+o-+s)/Ul;return zo(i==null?void 0:i.roundingMethod)(r)}function lr(e,t){return+K(e)-+K(t)}function ec(e,t,i){const o=lr(e,t)/Wl;return zo(i==null?void 0:i.roundingMethod)(o)}function tc(e,t){const i=K(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function ic(e,t){const i=K(e,t==null?void 0:t.in),o=i.getMonth();return i.setFullYear(i.getFullYear(),o+1,0),i.setHours(23,59,59,999),i}function oc(e,t){const i=K(e,t==null?void 0:t.in);return+tc(i,t)==+ic(i,t)}function sc(e,t,i){const[o,s,r]=ei(i==null?void 0:i.in,e,e,t),a=hi(s,r),l=Math.abs(Jl(s,r));if(l<1)return 0;s.getMonth()===1&&s.getDate()>27&&s.setDate(30),s.setMonth(s.getMonth()-a*l);let d=hi(s,r)===-a;oc(o)&&l===1&&hi(o,r)===1&&(d=!1);const h=a*(l-+d);return h===0?0:h}function rc(e,t,i){const o=lr(e,t)/1e3;return zo(i==null?void 0:i.roundingMethod)(o)}function ac(e,t){const i=K(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}const nc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},lc=(e,t,i)=>{let o;const s=nc[e];return typeof s=="string"?o=s:t===1?o=s.one:o=s.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+o:o+" ago":o};function eo(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const cc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},dc={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},uc={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},hc={date:eo({formats:cc,defaultWidth:"full"}),time:eo({formats:dc,defaultWidth:"full"}),dateTime:eo({formats:uc,defaultWidth:"full"})},pc={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},fc=(e,t,i,o)=>pc[e];function Lt(e){return(t,i)=>{const o=i!=null&&i.context?String(i.context):"standalone";let s;if(o==="formatting"&&e.formattingValues){const a=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):a;s=e.formattingValues[l]||e.formattingValues[a]}else{const a=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;s=e.values[l]||e.values[a]}const r=e.argumentCallback?e.argumentCallback(t):t;return s[r]}}const mc={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},bc={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},gc={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},vc={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},yc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},wc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},kc=(e,t)=>{const i=Number(e),o=i%100;if(o>20||o<10)switch(o%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},xc={ordinalNumber:kc,era:Lt({values:mc,defaultWidth:"wide"}),quarter:Lt({values:bc,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Lt({values:gc,defaultWidth:"wide"}),day:Lt({values:vc,defaultWidth:"wide"}),dayPeriod:Lt({values:yc,defaultWidth:"wide",formattingValues:wc,defaultFormattingWidth:"wide"})};function Rt(e){return(t,i={})=>{const o=i.width,s=o&&e.matchPatterns[o]||e.matchPatterns[e.defaultMatchWidth],r=t.match(s);if(!r)return null;const a=r[0],l=o&&e.parsePatterns[o]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?Cc(l,m=>m.test(a)):_c(l,m=>m.test(a));let h;h=e.valueCallback?e.valueCallback(d):d,h=i.valueCallback?i.valueCallback(h):h;const p=t.slice(a.length);return{value:h,rest:p}}}function _c(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Cc(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function $c(e){return(t,i={})=>{const o=t.match(e.matchPattern);if(!o)return null;const s=o[0],r=t.match(e.parsePattern);if(!r)return null;let a=e.valueCallback?e.valueCallback(r[0]):r[0];a=i.valueCallback?i.valueCallback(a):a;const l=t.slice(s.length);return{value:a,rest:l}}}const Tc=/^(\d+)(th|st|nd|rd)?/i,Sc=/\d+/i,Ec={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Ac={any:[/^b/i,/^(a|c)/i]},Dc={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Oc={any:[/1/i,/2/i,/3/i,/4/i]},zc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Mc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Ic={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Pc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Lc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Rc={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Nc={ordinalNumber:$c({matchPattern:Tc,parsePattern:Sc,valueCallback:e=>parseInt(e,10)}),era:Rt({matchPatterns:Ec,defaultMatchWidth:"wide",parsePatterns:Ac,defaultParseWidth:"any"}),quarter:Rt({matchPatterns:Dc,defaultMatchWidth:"wide",parsePatterns:Oc,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Rt({matchPatterns:zc,defaultMatchWidth:"wide",parsePatterns:Mc,defaultParseWidth:"any"}),day:Rt({matchPatterns:Ic,defaultMatchWidth:"wide",parsePatterns:Pc,defaultParseWidth:"any"}),dayPeriod:Rt({matchPatterns:Lc,defaultMatchWidth:"any",parsePatterns:Rc,defaultParseWidth:"any"})},cr={code:"en-US",formatDistance:lc,formatLong:hc,formatRelative:fc,localize:xc,match:Nc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Fc(e,t){const i=K(e,t==null?void 0:t.in);return Yl(i,ac(i))+1}function Bc(e,t){const i=K(e,t==null?void 0:t.in),o=+Ci(i)-+Kl(i);return Math.round(o/ar)+1}function dr(e,t){var p,m,v,f;const i=K(e,t==null?void 0:t.in),o=i.getFullYear(),s=Zt(),r=(t==null?void 0:t.firstWeekContainsDate)??((m=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:m.firstWeekContainsDate)??s.firstWeekContainsDate??((f=(v=s.locale)==null?void 0:v.options)==null?void 0:f.firstWeekContainsDate)??1,a=Ve((t==null?void 0:t.in)||e,0);a.setFullYear(o+1,0,r),a.setHours(0,0,0,0);const l=Ut(a,t),d=Ve((t==null?void 0:t.in)||e,0);d.setFullYear(o,0,r),d.setHours(0,0,0,0);const h=Ut(d,t);return+i>=+l?o+1:+i>=+h?o:o-1}function Hc(e,t){var l,d,h,p;const i=Zt(),o=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(h=i.locale)==null?void 0:h.options)==null?void 0:p.firstWeekContainsDate)??1,s=dr(e,t),r=Ve((t==null?void 0:t.in)||e,0);return r.setFullYear(s,0,o),r.setHours(0,0,0,0),Ut(r,t)}function jc(e,t){const i=K(e,t==null?void 0:t.in),o=+Ut(i,t)-+Hc(i,t);return Math.round(o/ar)+1}function z(e,t){const i=e<0?"-":"",o=Math.abs(e).toString().padStart(t,"0");return i+o}const Qe={y(e,t){const i=e.getFullYear(),o=i>0?i:1-i;return z(t==="yy"?o%100:o,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):z(i+1,2)},d(e,t){return z(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return z(e.getHours()%12||12,t.length)},H(e,t){return z(e.getHours(),t.length)},m(e,t){return z(e.getMinutes(),t.length)},s(e,t){return z(e.getSeconds(),t.length)},S(e,t){const i=t.length,o=e.getMilliseconds(),s=Math.trunc(o*Math.pow(10,i-3));return z(s,t.length)}},vt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},us={G:function(e,t,i){const o=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(o,{width:"abbreviated"});case"GGGGG":return i.era(o,{width:"narrow"});case"GGGG":default:return i.era(o,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const o=e.getFullYear(),s=o>0?o:1-o;return i.ordinalNumber(s,{unit:"year"})}return Qe.y(e,t)},Y:function(e,t,i,o){const s=dr(e,o),r=s>0?s:1-s;if(t==="YY"){const a=r%100;return z(a,2)}return t==="Yo"?i.ordinalNumber(r,{unit:"year"}):z(r,t.length)},R:function(e,t){const i=nr(e);return z(i,t.length)},u:function(e,t){const i=e.getFullYear();return z(i,t.length)},Q:function(e,t,i){const o=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(o);case"QQ":return z(o,2);case"Qo":return i.ordinalNumber(o,{unit:"quarter"});case"QQQ":return i.quarter(o,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(o,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(o,{width:"wide",context:"formatting"})}},q:function(e,t,i){const o=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(o);case"qq":return z(o,2);case"qo":return i.ordinalNumber(o,{unit:"quarter"});case"qqq":return i.quarter(o,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(o,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(o,{width:"wide",context:"standalone"})}},M:function(e,t,i){const o=e.getMonth();switch(t){case"M":case"MM":return Qe.M(e,t);case"Mo":return i.ordinalNumber(o+1,{unit:"month"});case"MMM":return i.month(o,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(o,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(o,{width:"wide",context:"formatting"})}},L:function(e,t,i){const o=e.getMonth();switch(t){case"L":return String(o+1);case"LL":return z(o+1,2);case"Lo":return i.ordinalNumber(o+1,{unit:"month"});case"LLL":return i.month(o,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(o,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(o,{width:"wide",context:"standalone"})}},w:function(e,t,i,o){const s=jc(e,o);return t==="wo"?i.ordinalNumber(s,{unit:"week"}):z(s,t.length)},I:function(e,t,i){const o=Bc(e);return t==="Io"?i.ordinalNumber(o,{unit:"week"}):z(o,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):Qe.d(e,t)},D:function(e,t,i){const o=Fc(e);return t==="Do"?i.ordinalNumber(o,{unit:"dayOfYear"}):z(o,t.length)},E:function(e,t,i){const o=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(o,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(o,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(o,{width:"short",context:"formatting"});case"EEEE":default:return i.day(o,{width:"wide",context:"formatting"})}},e:function(e,t,i,o){const s=e.getDay(),r=(s-o.weekStartsOn+8)%7||7;switch(t){case"e":return String(r);case"ee":return z(r,2);case"eo":return i.ordinalNumber(r,{unit:"day"});case"eee":return i.day(s,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(s,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(s,{width:"short",context:"formatting"});case"eeee":default:return i.day(s,{width:"wide",context:"formatting"})}},c:function(e,t,i,o){const s=e.getDay(),r=(s-o.weekStartsOn+8)%7||7;switch(t){case"c":return String(r);case"cc":return z(r,t.length);case"co":return i.ordinalNumber(r,{unit:"day"});case"ccc":return i.day(s,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(s,{width:"narrow",context:"standalone"});case"cccccc":return i.day(s,{width:"short",context:"standalone"});case"cccc":default:return i.day(s,{width:"wide",context:"standalone"})}},i:function(e,t,i){const o=e.getDay(),s=o===0?7:o;switch(t){case"i":return String(s);case"ii":return z(s,t.length);case"io":return i.ordinalNumber(s,{unit:"day"});case"iii":return i.day(o,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(o,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(o,{width:"short",context:"formatting"});case"iiii":default:return i.day(o,{width:"wide",context:"formatting"})}},a:function(e,t,i){const s=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},b:function(e,t,i){const o=e.getHours();let s;switch(o===12?s=vt.noon:o===0?s=vt.midnight:s=o/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},B:function(e,t,i){const o=e.getHours();let s;switch(o>=17?s=vt.evening:o>=12?s=vt.afternoon:o>=4?s=vt.morning:s=vt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(s,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(s,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(s,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let o=e.getHours()%12;return o===0&&(o=12),i.ordinalNumber(o,{unit:"hour"})}return Qe.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):Qe.H(e,t)},K:function(e,t,i){const o=e.getHours()%12;return t==="Ko"?i.ordinalNumber(o,{unit:"hour"}):z(o,t.length)},k:function(e,t,i){let o=e.getHours();return o===0&&(o=24),t==="ko"?i.ordinalNumber(o,{unit:"hour"}):z(o,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):Qe.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):Qe.s(e,t)},S:function(e,t){return Qe.S(e,t)},X:function(e,t,i){const o=e.getTimezoneOffset();if(o===0)return"Z";switch(t){case"X":return ps(o);case"XXXX":case"XX":return lt(o);case"XXXXX":case"XXX":default:return lt(o,":")}},x:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"x":return ps(o);case"xxxx":case"xx":return lt(o);case"xxxxx":case"xxx":default:return lt(o,":")}},O:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+hs(o,":");case"OOOO":default:return"GMT"+lt(o,":")}},z:function(e,t,i){const o=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+hs(o,":");case"zzzz":default:return"GMT"+lt(o,":")}},t:function(e,t,i){const o=Math.trunc(+e/1e3);return z(o,t.length)},T:function(e,t,i){return z(+e,t.length)}};function hs(e,t=""){const i=e>0?"-":"+",o=Math.abs(e),s=Math.trunc(o/60),r=o%60;return r===0?i+String(s):i+String(s)+t+z(r,2)}function ps(e,t){return e%60===0?(e>0?"-":"+")+z(Math.abs(e)/60,2):lt(e,t)}function lt(e,t=""){const i=e>0?"-":"+",o=Math.abs(e),s=z(Math.trunc(o/60),2),r=z(o%60,2);return i+s+t+r}const fs=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},ur=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Vc=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],o=i[1],s=i[2];if(!s)return fs(e,t);let r;switch(o){case"P":r=t.dateTime({width:"short"});break;case"PP":r=t.dateTime({width:"medium"});break;case"PPP":r=t.dateTime({width:"long"});break;case"PPPP":default:r=t.dateTime({width:"full"});break}return r.replace("{{date}}",fs(o,t)).replace("{{time}}",ur(s,t))},Wc={p:ur,P:Vc},Uc=/^D+$/,qc=/^Y+$/,Yc=["D","DD","YY","YYYY"];function Kc(e){return Uc.test(e)}function Gc(e){return qc.test(e)}function Xc(e,t,i){const o=Qc(e,t,i);if(console.warn(o),Yc.includes(e))throw new RangeError(o)}function Qc(e,t,i){const o=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${o} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Jc=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Zc=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,ed=/^'([^]*?)'?$/,td=/''/g,id=/[a-zA-Z]/;function od(e,t,i){var p,m,v,f;const o=Zt(),s=o.locale??cr,r=o.firstWeekContainsDate??((m=(p=o.locale)==null?void 0:p.options)==null?void 0:m.firstWeekContainsDate)??1,a=o.weekStartsOn??((f=(v=o.locale)==null?void 0:v.options)==null?void 0:f.weekStartsOn)??0,l=K(e,i==null?void 0:i.in);if(!Ql(l))throw new RangeError("Invalid time value");let d=t.match(Zc).map(b=>{const g=b[0];if(g==="p"||g==="P"){const k=Wc[g];return k(b,s.formatLong)}return b}).join("").match(Jc).map(b=>{if(b==="''")return{isToken:!1,value:"'"};const g=b[0];if(g==="'")return{isToken:!1,value:sd(b)};if(us[g])return{isToken:!0,value:b};if(g.match(id))throw new RangeError("Format string contains an unescaped latin alphabet character `"+g+"`");return{isToken:!1,value:b}});s.localize.preprocessor&&(d=s.localize.preprocessor(l,d));const h={firstWeekContainsDate:r,weekStartsOn:a,locale:s};return d.map(b=>{if(!b.isToken)return b.value;const g=b.value;(Gc(g)||Kc(g))&&Xc(g,t,String(e));const k=us[g[0]];return k(l,g,s.localize,h)}).join("")}function sd(e){const t=e.match(ed);return t?t[1].replace(td,"'"):e}function rd(e,t,i){const o=Zt(),s=(i==null?void 0:i.locale)??o.locale??cr,r=2520,a=hi(e,t);if(isNaN(a))throw new RangeError("Invalid time value");const l=Object.assign({},i,{addSuffix:i==null?void 0:i.addSuffix,comparison:a}),[d,h]=ei(i==null?void 0:i.in,...a>0?[t,e]:[e,t]),p=rc(h,d),m=($i(h)-$i(d))/1e3,v=Math.round((p-m)/60);let f;if(v<2)return i!=null&&i.includeSeconds?p<5?s.formatDistance("lessThanXSeconds",5,l):p<10?s.formatDistance("lessThanXSeconds",10,l):p<20?s.formatDistance("lessThanXSeconds",20,l):p<40?s.formatDistance("halfAMinute",0,l):p<60?s.formatDistance("lessThanXMinutes",1,l):s.formatDistance("xMinutes",1,l):v===0?s.formatDistance("lessThanXMinutes",1,l):s.formatDistance("xMinutes",v,l);if(v<45)return s.formatDistance("xMinutes",v,l);if(v<90)return s.formatDistance("aboutXHours",1,l);if(v<ls){const b=Math.round(v/60);return s.formatDistance("aboutXHours",b,l)}else{if(v<r)return s.formatDistance("xDays",1,l);if(v<ni){const b=Math.round(v/ls);return s.formatDistance("xDays",b,l)}else if(v<ni*2)return f=Math.round(v/ni),s.formatDistance("aboutXMonths",f,l)}if(f=sc(h,d),f<12){const b=Math.round(v/ni);return s.formatDistance("xMonths",b,l)}else{const b=f%12,g=Math.trunc(f/12);return b<3?s.formatDistance("aboutXYears",g,l):b<9?s.formatDistance("overXYears",g,l):s.formatDistance("almostXYears",g+1,l)}}function ad(e,t){return rd(e,Gl(e),t)}var nd=Object.defineProperty,ld=Object.getOwnPropertyDescriptor,gt=(e,t,i,o)=>{for(var s=o>1?void 0:o?ld(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&nd(t,i,s),s};const ms={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},cd={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let We=class extends ve{constructor(){super(...arguments),this.selected=!1,this.focused=!1,this.elapsedTime=""}connectedCallback(){super.connectedCallback(),this.updateElapsedTime(),this.updateTimerId=setInterval(()=>this.updateElapsedTime(),3e4)}disconnectedCallback(){super.disconnectedCallback(),this.updateTimerId&&(clearInterval(this.updateTimerId),this.updateTimerId=void 0)}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"}),e.has("tick")&&this.updateElapsedTime()}updateElapsedTime(){var r;if(((r=this.tick)==null?void 0:r.status)!=="in_progress"||!this.tick.started_at){this.elapsedTime="";return}const e=new Date(this.tick.started_at),t=new Date,i=ec(t,e),o=Zl(t,e),s=i%60;o>0?this.elapsedTime=`${o}h ${s}m`:this.elapsedTime=`${i}m`}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return ms[this.tick.priority]??ms[2]}getPriorityLabel(){return cd[this.tick.priority]??"Unknown"}renderElapsedBadge(){if(!this.elapsedTime||!this.tick.started_at)return null;const e=new Date(this.tick.started_at).toLocaleString();return u`
      <sl-tooltip content="Started: ${e}">
        <span class="meta-badge elapsed-time">⏱ ${this.elapsedTime}</span>
      </sl-tooltip>
    `}render(){const{tick:e,selected:t,focused:i,epicName:o}=this;return u`
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
          ${this.renderElapsedBadge()}
        </div>

        ${o?u`<div class="epic-name">${o}</div>`:null}
      </div>
    `}};We.styles=S`
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
  `;gt([c({attribute:!1})],We.prototype,"tick",2);gt([c({type:Boolean})],We.prototype,"selected",2);gt([c({type:Boolean})],We.prototype,"focused",2);gt([c({type:String,attribute:"epic-name"})],We.prototype,"epicName",2);gt([C(".card")],We.prototype,"cardElement",2);gt([y()],We.prototype,"elapsedTime",2);We=gt([Te("tick-card")],We);var dd=Object.defineProperty,ud=Object.getOwnPropertyDescriptor,At=(e,t,i,o)=>{for(var s=o>1?void 0:o?ud(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&dd(t,i,s),s};const hd={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},pd={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},fd={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let tt=class extends ve{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||hd[this.name]||"var(--blue)"}getColumnDisplayName(){return pd[this.name]||this.name}getColumnIcon(){return fd[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),i=this.getColumnIcon(),o=this.ticks.length;return u`
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
        ${o===0?u`
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
    `}};tt.styles=S`
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
  `;At([c({type:String})],tt.prototype,"name",2);At([c({type:String})],tt.prototype,"color",2);At([c({attribute:!1})],tt.prototype,"ticks",2);At([c({type:Object,attribute:!1})],tt.prototype,"epicNames",2);At([c({type:String,attribute:"focused-tick-id"})],tt.prototype,"focusedTickId",2);tt=At([Te("tick-column")],tt);var md=Object.defineProperty,bd=Object.getOwnPropertyDescriptor,st=(e,t,i,o)=>{for(var s=o>1?void 0:o?bd(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&md(t,i,s),s};let Pe=class extends ve{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const i=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleDashboardToggle(){this.dispatchEvent(new CustomEvent("dashboard-toggle",{bubbles:!0,composed:!0}))}handleRoadmapToggle(){this.dispatchEvent(new CustomEvent("roadmap-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return u`
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
    `}};Pe.styles=S`
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

  `;st([c({type:String,attribute:"repo-name"})],Pe.prototype,"repoName",2);st([c({attribute:!1})],Pe.prototype,"epics",2);st([c({type:String,attribute:"selected-epic"})],Pe.prototype,"selectedEpic",2);st([c({type:String,attribute:"search-term"})],Pe.prototype,"searchTerm",2);st([c({type:Boolean,attribute:"readonly-mode"})],Pe.prototype,"readonlyMode",2);st([c({type:String,attribute:"connection-status"})],Pe.prototype,"connectionStatus",2);st([y()],Pe.prototype,"debounceTimeout",2);Pe=st([Te("tick-header")],Pe);var gd=Object.defineProperty,vd=Object.getOwnPropertyDescriptor,V=(e,t,i,o)=>{for(var s=o>1?void 0:o?vd(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&gd(t,i,s),s};const yd={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},bs={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let B=class extends ve{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.afterDraft="",this.savingAfter=!1,this.afterError=""}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}willUpdate(e){var t,i;e.has("tick")&&(this.afterDraft=((i=(t=this.tick)==null?void 0:t.after)==null?void 0:i.join(", "))??"",this.savingAfter=!1,this.afterError="")}updated(e){e.has("tick")&&this.resetActionState()}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Js(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await Zs(this.tick.id,this.rejectReason.trim()),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await er(this.tick.id,this.closeReason.trim()||void 0),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await tr(this.tick.id),i={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(i),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const i=await Qs(this.tick.id,e);this.optimisticNote=null;const o={...i,is_blocked:(((t=i.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:Vt(i.notes)};this.emitTickUpdated(o)}catch(i){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=i instanceof Error?i.message:"Failed to add note"}finally{this.addingNote=!1}}async handleAfterSave(){var o;const e=this.tick;if(!e)return;const t=this.afterDraft.split(",").map(s=>s.trim()).filter(Boolean);this.savingAfter=!0,this.afterError="";const i={title:e.title,description:e.description,status:e.status,priority:e.priority,labels:e.labels,blocked_by:e.blocked_by,awaiting:e.awaiting,after:t};try{await Xs(e.id,i);const s={...e,after:t.length>0?t:void 0,updated_at:new Date().toISOString(),is_blocked:(((o=e.blocked_by)==null?void 0:o.length)??0)>0,column:"ready"};this.emitTickUpdated(s)}catch(s){this.afterError=s instanceof Error?s.message:"Failed to update after"}finally{this.savingAfter=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return yd[e]??"Unknown"}getPriorityColor(e){return bs[e]??bs[2]}formatStartedAt(e){const t=new Date(e),i=ad(t,{addSuffix:!0}),o=od(t,"h:mm a");return`${i} (${o})`}renderActions(){const e=this.tick;if(!e)return w;const t=e.status==="open",i=e.status==="closed",o=!!e.awaiting,s=!!e.requires,r=t&&o,a=t&&!s,l=i;return!r&&!a&&!l?w:u`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?u`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:w}

        <div class="actions-section">
          ${r?u`
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
              `:w}
          ${l?u`
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
            `:w}

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
            `:w}
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
    `}renderAfterEdit(){return u`
      <div class="after-edit-row">
        <sl-input
          class="after-input"
          placeholder="tick IDs, e.g. a1, b2 (comma-separated)"
          .value=${this.afterDraft}
          ?disabled=${this.savingAfter||this.readonlyMode}
          @sl-input=${e=>{this.afterDraft=e.target.value}}
          @keydown=${e=>{e.key==="Enter"&&(e.preventDefault(),this.handleAfterSave())}}
        ></sl-input>
        <ticks-button
          variant="secondary"
          size="small"
          ?disabled=${this.savingAfter||this.readonlyMode}
          @click=${this.handleAfterSave}
        >
          ${this.savingAfter?"Saving...":"Save"}
        </ticks-button>
      </div>
      <div class="after-hint">
        Soft ordering preference — never blocks readiness. Clear the input and save to remove.
      </div>
      ${this.afterError?u`
            <sl-alert variant="danger" open class="after-error">
              <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
              ${this.afterError}
            </sl-alert>
          `:w}
    `}renderParent(){var e;return(e=this.tick)!=null&&e.parent?u`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?u`<span class="link-title">${this.parentTitle}</span>`:w}
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
              >`:w}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?u`<div class="note-sending">Sending...</div>`:w}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return u`
      ${e?u`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):w}
              </ul>
            </div>
          `:u`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?u`
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
    `}renderDetailsContent(){const e=this.tick;return e?u`
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
            ${e.manual?u`<span class="meta-badge manual">👤 Manual</span>`:w}
            ${e.awaiting?u`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:w}
            ${e.verdict?u`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:w}
            ${this.blockerDetails&&this.blockerDetails.length>0?u`<span class="meta-badge blocked">⊘ Blocked</span>`:w}
          </div>

          <!-- Started time for in_progress ticks -->
          ${e.status==="in_progress"&&e.started_at?u`
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

        <!-- After (soft order) -->
        <div class="section">
          <div class="section-title">After (soft order)</div>
          ${this.renderAfterEdit()}
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
              `:w}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?u`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:w}
      </div>
    `:w}render(){const e=this.tick;return u`
      <sl-drawer
        label=${e?`${e.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${e?this.renderDetailsContent():u`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};B.styles=S`
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

    /* After (soft order) edit field */
    .after-edit-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .after-edit-row .after-input {
      flex: 1;
    }

    .after-input::part(base) {
      background: var(--surface0);
      border-color: var(--surface1);
    }

    .after-input::part(input) {
      color: var(--text);
      font-size: 0.875rem;
      font-family: var(--sl-font-mono, monospace);
    }

    .after-input::part(input)::placeholder {
      color: var(--subtext0);
    }

    .after-hint {
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--subtext0);
    }

    .after-error {
      margin-top: 0.5rem;
    }

  `;V([c({attribute:!1})],B.prototype,"tick",2);V([c({type:Boolean})],B.prototype,"open",2);V([c({attribute:!1})],B.prototype,"notesList",2);V([c({attribute:!1})],B.prototype,"blockerDetails",2);V([c({type:String,attribute:"parent-title"})],B.prototype,"parentTitle",2);V([c({type:Boolean,attribute:"readonly-mode"})],B.prototype,"readonlyMode",2);V([y()],B.prototype,"loading",2);V([y()],B.prototype,"errorMessage",2);V([y()],B.prototype,"showRejectInput",2);V([y()],B.prototype,"showCloseInput",2);V([y()],B.prototype,"rejectReason",2);V([y()],B.prototype,"closeReason",2);V([y()],B.prototype,"newNoteText",2);V([y()],B.prototype,"addingNote",2);V([y()],B.prototype,"addNoteError",2);V([y()],B.prototype,"optimisticNote",2);V([y()],B.prototype,"afterDraft",2);V([y()],B.prototype,"savingAfter",2);V([y()],B.prototype,"afterError",2);B=V([Te("tick-detail-drawer")],B);var wd=Object.defineProperty,kd=Object.getOwnPropertyDescriptor,ce=(e,t,i,o)=>{for(var s=o>1?void 0:o?kd(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&wd(t,i,s),s};const xd=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],_d=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let te=class extends ve{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.tickAfter="",this.awaiting=""}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.tickAfter="",this.awaiting="",this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleAfterInput(e){const t=e.target;this.tickAfter=t.value}handleAwaitingChange(e){const t=e.target;this.awaiting=t.value}async handleSubmit(){var i;if(!this.tickTitle.trim()){this.error="Title is required",(i=this.titleInput)==null||i.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent);const t=this.tickAfter.split(",").map(o=>o.trim()).filter(Boolean);t.length>0&&(e.after=t),this.awaiting&&(e.awaiting=this.awaiting);try{const o=await Gs(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:o,labels:this.labels?this.labels.split(",").map(s=>s.trim()).filter(Boolean):[],awaiting:this.awaiting},bubbles:!0,composed:!0})),this.handleClose()}catch(o){o instanceof Hs?this.error=o.body||o.message:o instanceof Error?this.error=o.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return u`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?u`<div class="error-message">${this.error}</div>`:w}

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
              ${xd.map(e=>u`
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
              ${_d.map(e=>u`
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
          <label>After (soft order)</label>
          <sl-input
            name="after"
            placeholder="tick IDs, e.g. a1, b2 (comma-separated)"
            .value=${this.tickAfter}
            @sl-input=${this.handleAfterInput}
            ?disabled=${this.loading}
          ></sl-input>
          <div class="field-help">
            Soft ordering preference — work these ticks first if feasible. Never blocks readiness (use Blocked By for hard dependencies).
          </div>
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
    `}};te.styles=S`
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

    .field-help {
      font-size: 0.75rem;
      color: var(--subtext0);
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
  `;ce([c({type:Boolean})],te.prototype,"open",2);ce([c({type:Array,attribute:!1})],te.prototype,"epics",2);ce([y()],te.prototype,"loading",2);ce([y()],te.prototype,"error",2);ce([y()],te.prototype,"tickTitle",2);ce([y()],te.prototype,"tickDescription",2);ce([y()],te.prototype,"type",2);ce([y()],te.prototype,"priority",2);ce([y()],te.prototype,"parent",2);ce([y()],te.prototype,"labels",2);ce([y()],te.prototype,"tickAfter",2);ce([y()],te.prototype,"awaiting",2);ce([C('sl-input[name="title"]')],te.prototype,"titleInput",2);te=ce([Te("tick-create-dialog")],te);var Cd=Object.defineProperty,$d=Object.getOwnPropertyDescriptor,hr=(e,t,i,o)=>{for(var s=o>1?void 0:o?$d(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Cd(t,i,s),s};const Td=5e3;let Sd=0;function Ed(){return`toast-${++Sd}-${Date.now()}`}let Ti=class extends ve{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:Ed(),message:e.message,variant:e.variant??"primary",duration:e.duration??Td};if(this.toasts=[...this.toasts,t],t.duration>0){const i=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,i)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(i=>i.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return u`
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
    `}};Ti.styles=S`
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
  `;hr([y()],Ti.prototype,"toasts",2);Ti=hr([Te("tick-toast-stack")],Ti);var Ad=Object.defineProperty,Dd=Object.getOwnPropertyDescriptor,Dt=(e,t,i,o)=>{for(var s=o>1?void 0:o?Dd(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Ad(t,i,s),s};let it=class extends ve{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(Ie.get()){this.loading=!1;return}try{this.activities=await Oo(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,i=e.actor,o=e.data||{};switch(t){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return o.reason?`${i} closed: ${o.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${o.to||"someone"}`;case"awaiting":return`Waiting for ${o.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),o=new Date().getTime()-t.getTime(),s=Math.floor(o/1e3),r=Math.floor(s/60),a=Math.floor(r/60),l=Math.floor(a/24);return s<60?"just now":r<60?`${r}m ago`:a<24?`${a}h ago`:l<7?`${l}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return u`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?u`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:w}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?u`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:w}
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
    `}};it.styles=S`
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
  `;Dt([C("sl-dropdown")],it.prototype,"dropdown",2);Dt([y()],it.prototype,"activities",2);Dt([y()],it.prototype,"loading",2);Dt([y()],it.prototype,"unreadCount",2);Dt([y()],it.prototype,"lastSeenTimestamp",2);it=Dt([Te("tick-activity-feed")],it);var Od=Object.defineProperty,zd=Object.getOwnPropertyDescriptor,Ne=(e,t,i,o)=>{for(var s=o>1?void 0:o?zd(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(s=(o?a(t,i,s):a(s))||s);return o&&s&&Od(t,i,s),s};const gs=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let ie=class extends ve{constructor(){super(...arguments),this.ticks=[],this.epics=[],this.open=!1,this.activities=[],this.repoName="",this._focusedAttentionIndex=-1,this._detailTick=null,this._detailNotes=[],this._detailLoading=!1,this._handleKeyDown=e=>{if(e.key==="Escape"){if(e.stopPropagation(),this._detailTick){this._closeDetailPane();return}this._close();return}const t=this._getHumanTicks(),i=Math.min(t.length,6)-1;switch(e.key){case"j":case"ArrowDown":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.min(this._focusedAttentionIndex+1,i));break;case"k":case"ArrowUp":e.preventDefault(),e.stopPropagation(),i>=0&&(this._focusedAttentionIndex=Math.max(this._focusedAttentionIndex-1,0));break;case"Enter":case"i":this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i&&(e.preventDefault(),e.stopPropagation(),this._handleTickClick(t[this._focusedAttentionIndex].id));break;case"a":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const o=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-resume",{detail:{tickId:o.id}}))}break;case"t":if(this._focusedAttentionIndex>=0&&this._focusedAttentionIndex<=i){e.preventDefault(),e.stopPropagation();const o=t[this._focusedAttentionIndex];this.dispatchEvent(new CustomEvent("tick-retry",{detail:{tickId:o.id}}))}break}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown)}updated(e){super.updated(e),e.has("open")&&this.open&&(this._focusedAttentionIndex=-1,this._closeDetailPane())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._handleKeyDown)}_close(){this.dispatchEvent(new CustomEvent("close"))}_handleBackdropClick(e){e.target.classList.contains("overlay")&&this._close()}_handleEpicClick(e){this.dispatchEvent(new CustomEvent("epic-select",{detail:{epicId:e}})),this._close()}_handleTickClick(e){this._openDetailPane(e)}_handleOpenOnBoard(e){this.dispatchEvent(new CustomEvent("tick-select",{detail:{tickId:e}})),this._close()}async _openDetailPane(e){var i,o;const t=this.ticks.find(s=>s.id===e);if(t){this._detailTick=t,this._detailNotes=Vt(t.notes),this._detailLoading=!0;try{const s=await Do(e).catch(()=>null);if(((i=this._detailTick)==null?void 0:i.id)!==e)return;s&&(this._detailTick={...t,...s,is_blocked:t.is_blocked,column:t.column},this._detailNotes=Vt(s.notes))}catch{}finally{((o=this._detailTick)==null?void 0:o.id)===e&&(this._detailLoading=!1)}}}_closeDetailPane(){this._detailTick=null,this._detailNotes=[],this._detailLoading=!1}_getColumnCounts(){const e={blocked:0,ready:0,agent:0,human:0,done:0};for(const t of this.ticks)t.type!=="epic"&&e[t.column]!==void 0&&e[t.column]++;return e}_getTotalNonEpicTicks(){return this.ticks.filter(e=>e.type!=="epic").length}_getEpicProgress(e){const t=this.ticks.filter(h=>h.parent===e&&h.type!=="epic"),i=t.length,o=t.filter(h=>h.column==="done").length,s=t.filter(h=>h.column==="agent").length,r=t.filter(h=>h.column==="human").length,a=t.filter(h=>h.column==="blocked").length,l=t.filter(h=>h.column==="ready").length,d=i>0?Math.round(o/i*100):0;return{total:i,done:o,inProgress:s,needsHuman:r,blocked:a,ready:l,pct:d}}_getHumanTicks(){return this.ticks.filter(e=>e.column==="human"&&e.type!=="epic")}_getActivityIcon(e){switch(e){case"create":return"➕";case"close":return"✅";case"update":return"✏️";case"approve":return"👍";case"reject":return"👎";case"note":return"💬";case"reopen":return"🔄";default:return"•"}}_formatRelativeTime(e){const t=new Date(e),o=new Date().getTime()-t.getTime(),s=Math.floor(o/6e4);if(s<1)return"now";if(s<60)return`${s}m ago`;const r=Math.floor(s/60);return r<24?`${r}h ago`:`${Math.floor(r/24)}d ago`}_getAwaitingLabel(e){if(e.awaiting)switch(e.awaiting){case"approval":return"Awaiting approval";case"review":return"Awaiting review";case"input":return"Awaiting input";case"content":return"Awaiting content";case"escalation":return"Escalated";case"checkpoint":return"Checkpoint";case"work":return"Manual work needed";default:return"Needs attention"}return"Needs attention"}_getPriorityLabel(e){return ie.PRIORITY_LABELS[e]??"Unknown"}_getPriorityColor(e){return ie.PRIORITY_COLORS[e]??"var(--subtext0)"}_formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}_formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);return t<60?`${t}s`:`${Math.floor(t/60)}m ${t%60}s`}_formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}_formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}_truncate(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}render(){if(!this.open)return w;const e=this._getColumnCounts(),t=this._getTotalNonEpicTicks(),i=this._getHumanTicks();return u`
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
    `}_renderHeader(){return u`
      <div class="dashboard-header">
        <div class="header-left">
          <div class="header-icon">📊</div>
          <div>
            <div class="header-title">Tickflow Dashboard</div>
            ${this.repoName?u`<div class="header-subtitle">${this.repoName}</div>`:w}
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
    `}_renderDistribution(e,t){return t===0?w:u`
      <div class="section">
        <div class="section-title">Task Distribution</div>
        <div class="distribution-bar-container">
          <div class="distribution-bar">
            ${gs.map(i=>{const o=e[i.id]/t*100;return o===0?w:u`
                <div
                  class="distribution-segment segment-${i.id}"
                  style="width: ${o}%"
                  title="${i.name}: ${e[i.id]}"
                >
                  ${o>=8?u`<span>${e[i.id]}</span>`:w}
                </div>
              `})}
          </div>
          <div class="distribution-legend">
            ${gs.map(i=>u`
              <div class="legend-item">
                <div class="legend-dot" style="background: ${i.color}"></div>
                <span>${i.icon} ${i.name}</span>
                <span class="legend-count">${e[i.id]}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}_renderEpicProgress(){return this.epics.length===0?w:u`
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
                ${e.length>6?u`<div class="empty-section">+${e.length-6} more</div>`:w}
              </div>
              ${e.length>0?u`
                <div class="attention-actions-hint">
                  <span class="action-hint"><kbd>j</kbd><kbd>k</kbd> navigate</span>
                  <span class="action-hint"><kbd>Enter</kbd> inspect</span>
                  <span class="action-hint"><kbd>a</kbd> resume</span>
                  <span class="action-hint"><kbd>t</kbd> retry</span>
                </div>
              `:w}
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

        <div class="detail-tab-body">
          ${this._detailLoading?u`<div class="detail-loading"><span class="detail-loading-spinner">⟳</span> Loading...</div>`:this._renderDetailOverview(e)}
        </div>
      </div>
    `:w}_renderDetailOverview(e){return u`
      <!-- Badges -->
      <div class="detail-meta-row">
        <span class="detail-meta-badge type-badge type-${e.type}">${e.type}</span>
        <span class="detail-meta-badge status-${e.status}">${e.status.replace("_"," ")}</span>
        <span
          class="detail-meta-badge priority"
          style="--priority-color: ${this._getPriorityColor(e.priority)}"
        >${this._getPriorityLabel(e.priority)}</span>
        ${e.awaiting?u`<span class="detail-meta-badge awaiting">⏳ ${e.awaiting}</span>`:w}
        ${e.is_blocked?u`<span class="detail-meta-badge blocked">⊘ blocked</span>`:w}
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
          `:w}

      <!-- Parent -->
      ${e.parent?u`
            <div class="detail-field">
              <div class="detail-field-label">Parent Epic</div>
              <a class="detail-link" @click=${()=>this._handleTickClick(e.parent)}>${e.parent}</a>
            </div>
          `:w}

      <!-- Blocked by -->
      ${e.blocked_by&&e.blocked_by.length>0?u`
            <div class="detail-field">
              <div class="detail-field-label">Blocked By</div>
              ${e.blocked_by.map(t=>u`
                <a class="detail-link" @click=${()=>this._handleTickClick(t)} style="margin-right: 0.5rem;">${t}</a>
              `)}
            </div>
          `:w}

      <!-- Notes -->
      <div class="detail-field">
        <div class="detail-field-label">Notes (${this._detailNotes.length})</div>
        ${this._detailNotes.length>0?u`
              <ul class="detail-notes-list">
                ${this._detailNotes.map(t=>u`
                  <li class="detail-note">
                    <div class="detail-note-header">
                      <span class="detail-note-author">${t.author??"Unknown"}</span>
                      ${t.timestamp?u`<span class="detail-note-time">${this._formatRelativeTime(t.timestamp)}</span>`:w}
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
          ${e.started_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Started</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.started_at)}</span>
                </div>
              `:w}
          ${e.closed_at?u`
                <div class="detail-ts-row">
                  <span class="detail-ts-label">Closed</span>
                  <span class="detail-ts-value">${this._formatTimestamp(e.closed_at)}</span>
                </div>
              `:w}
        </div>
      </div>
    `}};ie.styles=S`
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
     * Detail Pane (inline tick detail)
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
  `;ie.PRIORITY_LABELS={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};ie.PRIORITY_COLORS={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};Ne([c({type:Array})],ie.prototype,"ticks",2);Ne([c({type:Array})],ie.prototype,"epics",2);Ne([c({type:Boolean,reflect:!0})],ie.prototype,"open",2);Ne([c({type:Array})],ie.prototype,"activities",2);Ne([c({type:String,attribute:"repo-name"})],ie.prototype,"repoName",2);Ne([y()],ie.prototype,"_focusedAttentionIndex",2);Ne([y()],ie.prototype,"_detailTick",2);Ne([y()],ie.prototype,"_detailNotes",2);Ne([y()],ie.prototype,"_detailLoading",2);ie=Ne([Te("tickflow-dashboard")],ie);oo("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var i;((i=t.data)==null?void 0:i.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
