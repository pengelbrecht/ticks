var wr=Object.defineProperty;var xr=(e,t,s)=>t in e?wr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var M=(e,t,s)=>xr(e,typeof t!="symbol"?t+"":t,s);import{i as $,n as c,a as de,b as h,r as y,E as wt,A as v,e as C,u as Ki,t as me}from"./ticks-logo-DYgrblNn.js";var _r=$`
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
`;const ni=new Set,xt=new Map;let ut,_i="ltr",Ci="en";const Ro=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(Ro){const e=new MutationObserver(Io);_i=document.documentElement.dir||"ltr",Ci=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function Ao(...e){e.map(t=>{const s=t.$code.toLowerCase();xt.has(s)?xt.set(s,Object.assign(Object.assign({},xt.get(s)),t)):xt.set(s,t),ut||(ut=t)}),Io()}function Io(){Ro&&(_i=document.documentElement.dir||"ltr",Ci=document.documentElement.lang||navigator.language),[...ni.keys()].map(e=>{typeof e.requestUpdate=="function"&&e.requestUpdate()})}let Cr=class{constructor(t){this.host=t,this.host.addController(this)}hostConnected(){ni.add(this.host)}hostDisconnected(){ni.delete(this.host)}dir(){return`${this.host.dir||_i}`.toLowerCase()}lang(){return`${this.host.lang||Ci}`.toLowerCase()}getTranslationData(t){var s,i;const o=new Intl.Locale(t.replace(/_/g,"-")),r=o==null?void 0:o.language.toLowerCase(),a=(i=(s=o==null?void 0:o.region)===null||s===void 0?void 0:s.toLowerCase())!==null&&i!==void 0?i:"",n=xt.get(`${r}-${a}`),u=xt.get(r);return{locale:o,language:r,region:a,primary:n,secondary:u}}exists(t,s){var i;const{primary:o,secondary:r}=this.getTranslationData((i=s.lang)!==null&&i!==void 0?i:this.lang());return s=Object.assign({includeFallback:!1},s),!!(o&&o[t]||r&&r[t]||s.includeFallback&&ut&&ut[t])}term(t,...s){const{primary:i,secondary:o}=this.getTranslationData(this.lang());let r;if(i&&i[t])r=i[t];else if(o&&o[t])r=o[t];else if(ut&&ut[t])r=ut[t];else return console.error(`No translation found for: ${String(t)}`),String(t);return typeof r=="function"?r(...s):r}date(t,s){return t=new Date(t),new Intl.DateTimeFormat(this.lang(),s).format(t)}number(t,s){return t=Number(t),isNaN(t)?"":new Intl.NumberFormat(this.lang(),s).format(t)}relativeTime(t,s,i){return new Intl.RelativeTimeFormat(this.lang(),i).format(t,s)}};var Oo={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:e=>e===0?"No options selected":e===1?"1 option selected":`${e} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:e=>`Slide ${e}`,toggleColorFormat:"Toggle color format"};Ao(Oo);var $r=Oo,se=class extends Cr{};Ao($r);var N=$`
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
`,Lo=Object.defineProperty,Tr=Object.defineProperties,Sr=Object.getOwnPropertyDescriptor,Er=Object.getOwnPropertyDescriptors,Gi=Object.getOwnPropertySymbols,zr=Object.prototype.hasOwnProperty,Rr=Object.prototype.propertyIsEnumerable,Qs=(e,t)=>(t=Symbol[e])?t:Symbol.for("Symbol."+e),$i=e=>{throw TypeError(e)},Yi=(e,t,s)=>t in e?Lo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s,Ye=(e,t)=>{for(var s in t||(t={}))zr.call(t,s)&&Yi(e,s,t[s]);if(Gi)for(var s of Gi(t))Rr.call(t,s)&&Yi(e,s,t[s]);return e},Xt=(e,t)=>Tr(e,Er(t)),l=(e,t,s,i)=>{for(var o=i>1?void 0:i?Sr(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&Lo(t,s,o),o},Po=(e,t,s)=>t.has(e)||$i("Cannot "+s),Ar=(e,t,s)=>(Po(e,t,"read from private field"),t.get(e)),Ir=(e,t,s)=>t.has(e)?$i("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,s),Or=(e,t,s,i)=>(Po(e,t,"write to private field"),t.set(e,s),s),Lr=function(e,t){this[0]=e,this[1]=t},Pr=e=>{var t=e[Qs("asyncIterator")],s=!1,i,o={};return t==null?(t=e[Qs("iterator")](),i=r=>o[r]=a=>t[r](a)):(t=t.call(e),i=r=>o[r]=a=>{if(s){if(s=!1,r==="throw")throw a;return a}return s=!0,{done:!1,value:new Lr(new Promise(n=>{var u=t[r](a);u instanceof Object||$i("Object expected"),n(u)}),1)}}),o[Qs("iterator")]=()=>o,i("next"),"throw"in t?i("throw"):o.throw=r=>{throw r},"return"in t&&i("return"),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Dr(e){return(t,s)=>{const i=typeof t=="function"?t:t[s];Object.assign(i,e)}}var hs,L=class extends de{constructor(){super(),Ir(this,hs,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){const s=new CustomEvent(e,Ye({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(s),s}static define(e,t=this,s={}){const i=customElements.get(e);if(!i){try{customElements.define(e,t,s)}catch{customElements.define(e,class extends t{},s)}return}let o=" (unknown version)",r=o;"version"in t&&t.version&&(o=" v"+t.version),"version"in i&&i.version&&(r=" v"+i.version),!(o&&r&&o===r)&&console.warn(`Attempted to register <${e}>${o}, but <${e}>${r} has already been registered.`)}attributeChangedCallback(e,t,s){Ar(this,hs)||(this.constructor.elementProperties.forEach((i,o)=>{i.reflect&&this[o]!=null&&this.initialReflectedProperties.set(o,this[o])}),Or(this,hs,!0)),super.attributeChangedCallback(e,t,s)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,s)=>{e.has(s)&&this[s]==null&&(this[s]=t)})}};hs=new WeakMap;L.version="2.20.1";L.dependencies={};l([c()],L.prototype,"dir",2);l([c()],L.prototype,"lang",2);var As=class extends L{constructor(){super(...arguments),this.localize=new se(this)}render(){return h`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};As.styles=[N,_r];var Pt=new WeakMap,Dt=new WeakMap,Mt=new WeakMap,Js=new WeakSet,os=new WeakMap,Zt=class{constructor(e,t){this.handleFormData=s=>{const i=this.options.disabled(this.host),o=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!i&&!a&&typeof o=="string"&&o.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(n=>{s.formData.append(o,n.toString())}):s.formData.append(o,r.toString()))},this.handleFormSubmit=s=>{var i;const o=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((i=Pt.get(this.form))==null||i.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!o&&!r(this.host)&&(s.preventDefault(),s.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),os.set(this.host,[])},this.handleInteraction=s=>{const i=os.get(this.host);i.includes(s.type)||i.push(s.type),i.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const s=this.form.querySelectorAll("*");for(const i of s)if(typeof i.checkValidity=="function"&&!i.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const s=this.form.querySelectorAll("*");for(const i of s)if(typeof i.reportValidity=="function"&&!i.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=Ye({form:s=>{const i=s.form;if(i){const r=s.getRootNode().querySelector(`#${i}`);if(r)return r}return s.closest("form")},name:s=>s.name,value:s=>s.value,defaultValue:s=>s.defaultValue,disabled:s=>{var i;return(i=s.disabled)!=null?i:!1},reportValidity:s=>typeof s.reportValidity=="function"?s.reportValidity():!0,checkValidity:s=>typeof s.checkValidity=="function"?s.checkValidity():!0,setValue:(s,i)=>s.value=i,assumeInteractionOn:["sl-input"]},t)}hostConnected(){const e=this.options.form(this.host);e&&this.attachForm(e),os.set(this.host,[]),this.options.assumeInteractionOn.forEach(t=>{this.host.addEventListener(t,this.handleInteraction)})}hostDisconnected(){this.detachForm(),os.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){const e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,Pt.has(this.form)?Pt.get(this.form).add(this.host):Pt.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),Dt.has(this.form)||(Dt.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),Mt.has(this.form)||(Mt.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const e=Pt.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),Dt.has(this.form)&&(this.form.reportValidity=Dt.get(this.form),Dt.delete(this.form)),Mt.has(this.form)&&(this.form.checkValidity=Mt.get(this.form),Mt.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?Js.add(e):Js.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){const s=document.createElement("button");s.type=e,s.style.position="absolute",s.style.width="0",s.style.height="0",s.style.clipPath="inset(50%)",s.style.overflow="hidden",s.style.whiteSpace="nowrap",t&&(s.name=t.name,s.value=t.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(i=>{t.hasAttribute(i)&&s.setAttribute(i,t.getAttribute(i))})),this.form.append(s),s.click(),s.remove()}}getForm(){var e;return(e=this.form)!=null?e:null}reset(e){this.doAction("reset",e)}submit(e){this.doAction("submit",e)}setValidity(e){const t=this.host,s=!!Js.has(t),i=!!t.required;t.toggleAttribute("data-required",i),t.toggleAttribute("data-optional",!i),t.toggleAttribute("data-invalid",!e),t.toggleAttribute("data-valid",e),t.toggleAttribute("data-user-invalid",!e&&s),t.toggleAttribute("data-user-valid",e&&s)}updateValidity(){const e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){const t=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e==null||e.preventDefault()}},Ti=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(Xt(Ye({},Ti),{valid:!1,valueMissing:!0}));Object.freeze(Xt(Ye({},Ti),{valid:!1,customError:!0}));var Mr=$`
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
`,Xe=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=s=>{const i=s.target;(this.slotNames.includes("[default]")&&!i.name||i.name&&this.slotNames.includes(i.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!=="")return!0;if(e.nodeType===e.ELEMENT_NODE){const t=e;if(t.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!t.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Fr(e){if(!e)return"";const t=e.assignedNodes({flatten:!0});let s="";return[...t].forEach(i=>{i.nodeType===Node.TEXT_NODE&&(s+=i.textContent)}),s}var li="";function ci(e){li=e}function Br(e=""){if(!li){const t=[...document.getElementsByTagName("script")],s=t.find(i=>i.hasAttribute("data-shoelace"));if(s)ci(s.getAttribute("data-shoelace"));else{const i=t.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let o="";i&&(o=i.getAttribute("src")),ci(o.split("/").slice(0,-1).join("/"))}}return li.replace(/\/$/,"")+(e?`/${e.replace(/^\//,"")}`:"")}var Nr={name:"default",resolver:e=>Br(`assets/icons/${e}.svg`)},Hr=Nr,Xi={caret:`
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
  `},jr={name:"system",resolver:e=>e in Xi?`data:image/svg+xml,${encodeURIComponent(Xi[e])}`:""},Ur=jr,Vr=[Hr,Ur],di=[];function Wr(e){di.push(e)}function qr(e){di=di.filter(t=>t!==e)}function Zi(e){return Vr.find(t=>t.name===e)}var Kr=$`
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
`;function S(e,t){const s=Ye({waitUntilFirstUpdate:!1},t);return(i,o)=>{const{update:r}=i,a=Array.isArray(e)?e:[e];i.update=function(n){a.forEach(u=>{const d=u;if(n.has(d)){const p=n.get(d),f=this[d];p!==f&&(!s.waitUntilFirstUpdate||this.hasUpdated)&&this[o](p,f)}}),r.call(this,n)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Gr=(e,t)=>(e==null?void 0:e._$litType$)!==void 0,Do=e=>e.strings===void 0,Yr={},Xr=(e,t=Yr)=>e._$AH=t;var Ft=Symbol(),rs=Symbol(),ei,ti=new Map,Q=class extends L{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(e,t){var s;let i;if(t!=null&&t.spriteSheet)return this.svg=h`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(i=await fetch(e,{mode:"cors"}),!i.ok)return i.status===410?Ft:rs}catch{return rs}try{const o=document.createElement("div");o.innerHTML=await i.text();const r=o.firstElementChild;if(((s=r==null?void 0:r.tagName)==null?void 0:s.toLowerCase())!=="svg")return Ft;ei||(ei=new DOMParser);const n=ei.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return n?(n.part.add("svg"),document.adoptNode(n)):Ft}catch{return Ft}}connectedCallback(){super.connectedCallback(),Wr(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),qr(this)}getIconSource(){const e=Zi(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var e;const{url:t,fromLibrary:s}=this.getIconSource(),i=s?Zi(this.library):void 0;if(!t){this.svg=null;return}let o=ti.get(t);if(o||(o=this.resolveIcon(t,i),ti.set(t,o)),!this.initialRender)return;const r=await o;if(r===rs&&ti.delete(t),t===this.getIconSource().url){if(Gr(r)){if(this.svg=r,i){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof i.mutator=="function"&&a&&i.mutator(a)}return}switch(r){case rs:case Ft:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(e=i==null?void 0:i.mutator)==null||e.call(i,this.svg),this.emit("sl-load")}}}render(){return this.svg}};Q.styles=[N,Kr];l([y()],Q.prototype,"svg",2);l([c({reflect:!0})],Q.prototype,"name",2);l([c()],Q.prototype,"src",2);l([c()],Q.prototype,"label",2);l([c({reflect:!0})],Q.prototype,"library",2);l([S("label")],Q.prototype,"handleLabelChange",1);l([S(["name","src","library"])],Q.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ke={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Is=e=>(...t)=>({_$litDirective$:e,values:t});let Os=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,s,i){this._$Ct=t,this._$AM=s,this._$Ci=i}_$AS(t,s){return this.update(t,s)}update(t,s){return this.render(...s)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const F=Is(class extends Os{constructor(e){var t;if(super(e),e.type!==Ke.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var i,o;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in t)t[r]&&!((i=this.nt)!=null&&i.has(r))&&this.st.add(r);return this.render(t)}const s=e.element.classList;for(const r of this.st)r in t||(s.remove(r),this.st.delete(r));for(const r in t){const a=!!t[r];a===this.st.has(r)||(o=this.nt)!=null&&o.has(r)||(a?(s.add(r),this.st.add(r)):(s.remove(r),this.st.delete(r)))}return wt}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Mo=Symbol.for(""),Zr=e=>{if((e==null?void 0:e.r)===Mo)return e==null?void 0:e._$litStatic$},gs=(e,...t)=>({_$litStatic$:t.reduce((s,i,o)=>s+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(i)+e[o+1],e[0]),r:Mo}),Qi=new Map,Qr=e=>(t,...s)=>{const i=s.length;let o,r;const a=[],n=[];let u,d=0,p=!1;for(;d<i;){for(u=t[d];d<i&&(r=s[d],(o=Zr(r))!==void 0);)u+=o+t[++d],p=!0;d!==i&&n.push(r),a.push(u),d++}if(d===i&&a.push(t[i]),p){const f=a.join("$$lit$$");(t=Qi.get(f))===void 0&&(a.raw=a,Qi.set(f,t=a)),s=n}return e(t,...s)},ps=Qr(h);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=e=>e??v;var P=class extends L{constructor(){super(...arguments),this.formControlController=new Zt(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new Xe(this,"[default]","prefix","suffix"),this.localize=new se(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:Ti}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){const e=this.isLink(),t=e?gs`a`:gs`button`;return ps`
      <${t}
        part="base"
        class=${F({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
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
        ${this.caret?ps` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?ps`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${t}>
    `}};P.styles=[N,Mr];P.dependencies={"sl-icon":Q,"sl-spinner":As};l([C(".button")],P.prototype,"button",2);l([y()],P.prototype,"hasFocus",2);l([y()],P.prototype,"invalid",2);l([c()],P.prototype,"title",2);l([c({reflect:!0})],P.prototype,"variant",2);l([c({reflect:!0})],P.prototype,"size",2);l([c({type:Boolean,reflect:!0})],P.prototype,"caret",2);l([c({type:Boolean,reflect:!0})],P.prototype,"disabled",2);l([c({type:Boolean,reflect:!0})],P.prototype,"loading",2);l([c({type:Boolean,reflect:!0})],P.prototype,"outline",2);l([c({type:Boolean,reflect:!0})],P.prototype,"pill",2);l([c({type:Boolean,reflect:!0})],P.prototype,"circle",2);l([c()],P.prototype,"type",2);l([c()],P.prototype,"name",2);l([c()],P.prototype,"value",2);l([c()],P.prototype,"href",2);l([c()],P.prototype,"target",2);l([c()],P.prototype,"rel",2);l([c()],P.prototype,"download",2);l([c()],P.prototype,"form",2);l([c({attribute:"formaction"})],P.prototype,"formAction",2);l([c({attribute:"formenctype"})],P.prototype,"formEnctype",2);l([c({attribute:"formmethod"})],P.prototype,"formMethod",2);l([c({attribute:"formnovalidate",type:Boolean})],P.prototype,"formNoValidate",2);l([c({attribute:"formtarget"})],P.prototype,"formTarget",2);l([S("disabled",{waitUntilFirstUpdate:!0})],P.prototype,"handleDisabledChange",1);P.define("sl-button");var Jr=$`
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
`,Si=(e="value")=>(t,s)=>{const i=t.constructor,o=i.prototype.attributeChangedCallback;i.prototype.attributeChangedCallback=function(r,a,n){var u;const d=i.getPropertyOptions(e),p=typeof d.attribute=="string"?d.attribute:e;if(r===p){const f=d.converter||Ki,m=(typeof f=="function"?f:(u=f==null?void 0:f.fromAttribute)!=null?u:Ki.fromAttribute)(n,d.type);this[e]!==m&&(this[s]=m)}o.call(this,r,a,n)}},Ls=$`
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
 */const vs=Is(class extends Os{constructor(e){if(super(e),e.type!==Ke.PROPERTY&&e.type!==Ke.ATTRIBUTE&&e.type!==Ke.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Do(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===wt||t===v)return t;const s=e.element,i=e.name;if(e.type===Ke.PROPERTY){if(t===s[i])return wt}else if(e.type===Ke.BOOLEAN_ATTRIBUTE){if(!!t===s.hasAttribute(i))return wt}else if(e.type===Ke.ATTRIBUTE&&s.getAttribute(i)===t+"")return wt;return Xr(e),t}});var T=class extends L{constructor(){super(...arguments),this.formControlController=new Zt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Xe(this,"help-text","label"),this.localize=new se(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var e;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((e=this.input)==null?void 0:e.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){var e;return this.__numberInput.value=this.value,((e=this.input)==null?void 0:e.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(e){e.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){const t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key==="Enter"&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,s="none"){this.input.setSelectionRange(e,t,s)}setRangeText(e,t,s,i="preserve"){const o=t??this.input.selectionStart,r=s??this.input.selectionEnd;this.input.setRangeText(e,o,r,i),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return h`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
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
            class=${F({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              .value=${vs(this.value)}
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

            ${r?h`
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
    `}};T.styles=[N,Ls,Jr];T.dependencies={"sl-icon":Q};l([C(".input__control")],T.prototype,"input",2);l([y()],T.prototype,"hasFocus",2);l([c()],T.prototype,"title",2);l([c({reflect:!0})],T.prototype,"type",2);l([c()],T.prototype,"name",2);l([c()],T.prototype,"value",2);l([Si()],T.prototype,"defaultValue",2);l([c({reflect:!0})],T.prototype,"size",2);l([c({type:Boolean,reflect:!0})],T.prototype,"filled",2);l([c({type:Boolean,reflect:!0})],T.prototype,"pill",2);l([c()],T.prototype,"label",2);l([c({attribute:"help-text"})],T.prototype,"helpText",2);l([c({type:Boolean})],T.prototype,"clearable",2);l([c({type:Boolean,reflect:!0})],T.prototype,"disabled",2);l([c()],T.prototype,"placeholder",2);l([c({type:Boolean,reflect:!0})],T.prototype,"readonly",2);l([c({attribute:"password-toggle",type:Boolean})],T.prototype,"passwordToggle",2);l([c({attribute:"password-visible",type:Boolean})],T.prototype,"passwordVisible",2);l([c({attribute:"no-spin-buttons",type:Boolean})],T.prototype,"noSpinButtons",2);l([c({reflect:!0})],T.prototype,"form",2);l([c({type:Boolean,reflect:!0})],T.prototype,"required",2);l([c()],T.prototype,"pattern",2);l([c({type:Number})],T.prototype,"minlength",2);l([c({type:Number})],T.prototype,"maxlength",2);l([c()],T.prototype,"min",2);l([c()],T.prototype,"max",2);l([c()],T.prototype,"step",2);l([c()],T.prototype,"autocapitalize",2);l([c()],T.prototype,"autocorrect",2);l([c()],T.prototype,"autocomplete",2);l([c({type:Boolean})],T.prototype,"autofocus",2);l([c()],T.prototype,"enterkeyhint",2);l([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],T.prototype,"spellcheck",2);l([c()],T.prototype,"inputmode",2);l([S("disabled",{waitUntilFirstUpdate:!0})],T.prototype,"handleDisabledChange",1);l([S("step",{waitUntilFirstUpdate:!0})],T.prototype,"handleStepChange",1);l([S("value",{waitUntilFirstUpdate:!0})],T.prototype,"handleValueChange",1);T.define("sl-input");var ea=$`
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
`,ta=$`
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
`,Y=class extends L{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){const e=!!this.href,t=e?gs`a`:gs`button`;return ps`
      <${t}
        part="base"
        class=${F({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
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
    `}};Y.styles=[N,ta];Y.dependencies={"sl-icon":Q};l([C(".icon-button")],Y.prototype,"button",2);l([y()],Y.prototype,"hasFocus",2);l([c()],Y.prototype,"name",2);l([c()],Y.prototype,"library",2);l([c()],Y.prototype,"src",2);l([c()],Y.prototype,"href",2);l([c()],Y.prototype,"target",2);l([c()],Y.prototype,"download",2);l([c()],Y.prototype,"label",2);l([c({type:Boolean,reflect:!0})],Y.prototype,"disabled",2);var vt=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return h`
      <span
        part="base"
        class=${F({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
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
    `}};vt.styles=[N,ea];vt.dependencies={"sl-icon-button":Y};l([c({reflect:!0})],vt.prototype,"variant",2);l([c({reflect:!0})],vt.prototype,"size",2);l([c({type:Boolean,reflect:!0})],vt.prototype,"pill",2);l([c({type:Boolean})],vt.prototype,"removable",2);var sa=$`
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
`;function ia(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var ui=new Set;function oa(){const e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function ra(){const e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(e)||!e?0:e}function Vt(e){if(ui.add(e),!document.documentElement.classList.contains("sl-scroll-lock")){const t=oa()+ra();let s=getComputedStyle(document.documentElement).scrollbarGutter;(!s||s==="auto")&&(s="stable"),t<2&&(s=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",s),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${t}px`)}}function Wt(e){ui.delete(e),ui.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function hi(e,t,s="vertical",i="smooth"){const o=ia(e,t),r=o.top+t.scrollTop,a=o.left+t.scrollLeft,n=t.scrollLeft,u=t.scrollLeft+t.offsetWidth,d=t.scrollTop,p=t.scrollTop+t.offsetHeight;(s==="horizontal"||s==="both")&&(a<n?t.scrollTo({left:a,behavior:i}):a+e.clientWidth>u&&t.scrollTo({left:a-t.offsetWidth+e.clientWidth,behavior:i})),(s==="vertical"||s==="both")&&(r<d?t.scrollTo({top:r,behavior:i}):r+e.clientHeight>p&&t.scrollTo({top:r-t.offsetHeight+e.clientHeight,behavior:i}))}var aa=$`
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
`;const tt=Math.min,ue=Math.max,ys=Math.round,as=Math.floor,Be=e=>({x:e,y:e}),na={left:"right",right:"left",bottom:"top",top:"bottom"},la={start:"end",end:"start"};function pi(e,t,s){return ue(e,tt(t,s))}function St(e,t){return typeof e=="function"?e(t):e}function st(e){return e.split("-")[0]}function Et(e){return e.split("-")[1]}function Fo(e){return e==="x"?"y":"x"}function Ei(e){return e==="y"?"height":"width"}const ca=new Set(["top","bottom"]);function Ge(e){return ca.has(st(e))?"y":"x"}function zi(e){return Fo(Ge(e))}function da(e,t,s){s===void 0&&(s=!1);const i=Et(e),o=zi(e),r=Ei(o);let a=o==="x"?i===(s?"end":"start")?"right":"left":i==="start"?"bottom":"top";return t.reference[r]>t.floating[r]&&(a=ks(a)),[a,ks(a)]}function ua(e){const t=ks(e);return[mi(e),t,mi(t)]}function mi(e){return e.replace(/start|end/g,t=>la[t])}const Ji=["left","right"],eo=["right","left"],ha=["top","bottom"],pa=["bottom","top"];function ma(e,t,s){switch(e){case"top":case"bottom":return s?t?eo:Ji:t?Ji:eo;case"left":case"right":return t?ha:pa;default:return[]}}function fa(e,t,s,i){const o=Et(e);let r=ma(st(e),s==="start",i);return o&&(r=r.map(a=>a+"-"+o),t&&(r=r.concat(r.map(mi)))),r}function ks(e){return e.replace(/left|right|bottom|top/g,t=>na[t])}function ba(e){return{top:0,right:0,bottom:0,left:0,...e}}function Bo(e){return typeof e!="number"?ba(e):{top:e,right:e,bottom:e,left:e}}function ws(e){const{x:t,y:s,width:i,height:o}=e;return{width:i,height:o,top:s,left:t,right:t+i,bottom:s+o,x:t,y:s}}function to(e,t,s){let{reference:i,floating:o}=e;const r=Ge(t),a=zi(t),n=Ei(a),u=st(t),d=r==="y",p=i.x+i.width/2-o.width/2,f=i.y+i.height/2-o.height/2,b=i[n]/2-o[n]/2;let m;switch(u){case"top":m={x:p,y:i.y-o.height};break;case"bottom":m={x:p,y:i.y+i.height};break;case"right":m={x:i.x+i.width,y:f};break;case"left":m={x:i.x-o.width,y:f};break;default:m={x:i.x,y:i.y}}switch(Et(t)){case"start":m[a]-=b*(s&&d?-1:1);break;case"end":m[a]+=b*(s&&d?-1:1);break}return m}const ga=async(e,t,s)=>{const{placement:i="bottom",strategy:o="absolute",middleware:r=[],platform:a}=s,n=r.filter(Boolean),u=await(a.isRTL==null?void 0:a.isRTL(t));let d=await a.getElementRects({reference:e,floating:t,strategy:o}),{x:p,y:f}=to(d,i,u),b=i,m={},g=0;for(let k=0;k<n.length;k++){const{name:w,fn:_}=n[k],{x:E,y:I,data:W,reset:H}=await _({x:p,y:f,initialPlacement:i,placement:b,strategy:o,middlewareData:m,rects:d,platform:a,elements:{reference:e,floating:t}});p=E??p,f=I??f,m={...m,[w]:{...m[w],...W}},H&&g<=50&&(g++,typeof H=="object"&&(H.placement&&(b=H.placement),H.rects&&(d=H.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:o}):H.rects),{x:p,y:f}=to(d,b,u)),k=-1)}return{x:p,y:f,placement:b,strategy:o,middlewareData:m}};async function Ri(e,t){var s;t===void 0&&(t={});const{x:i,y:o,platform:r,rects:a,elements:n,strategy:u}=e,{boundary:d="clippingAncestors",rootBoundary:p="viewport",elementContext:f="floating",altBoundary:b=!1,padding:m=0}=St(t,e),g=Bo(m),w=n[b?f==="floating"?"reference":"floating":f],_=ws(await r.getClippingRect({element:(s=await(r.isElement==null?void 0:r.isElement(w)))==null||s?w:w.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(n.floating)),boundary:d,rootBoundary:p,strategy:u})),E=f==="floating"?{x:i,y:o,width:a.floating.width,height:a.floating.height}:a.reference,I=await(r.getOffsetParent==null?void 0:r.getOffsetParent(n.floating)),W=await(r.isElement==null?void 0:r.isElement(I))?await(r.getScale==null?void 0:r.getScale(I))||{x:1,y:1}:{x:1,y:1},H=ws(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:n,rect:E,offsetParent:I,strategy:u}):E);return{top:(_.top-H.top+g.top)/W.y,bottom:(H.bottom-_.bottom+g.bottom)/W.y,left:(_.left-H.left+g.left)/W.x,right:(H.right-_.right+g.right)/W.x}}const va=e=>({name:"arrow",options:e,async fn(t){const{x:s,y:i,placement:o,rects:r,platform:a,elements:n,middlewareData:u}=t,{element:d,padding:p=0}=St(e,t)||{};if(d==null)return{};const f=Bo(p),b={x:s,y:i},m=zi(o),g=Ei(m),k=await a.getDimensions(d),w=m==="y",_=w?"top":"left",E=w?"bottom":"right",I=w?"clientHeight":"clientWidth",W=r.reference[g]+r.reference[m]-b[m]-r.floating[g],H=b[m]-r.reference[m],oe=await(a.getOffsetParent==null?void 0:a.getOffsetParent(d));let U=oe?oe[I]:0;(!U||!await(a.isElement==null?void 0:a.isElement(oe)))&&(U=n.floating[I]||r.floating[g]);const Ve=W/2-H/2,Pe=U/2-k[g]/2-1,ke=tt(f[_],Pe),Ze=tt(f[E],Pe),De=ke,Qe=U-k[g]-Ze,re=U/2-k[g]/2+Ve,ct=pi(De,re,Qe),We=!u.arrow&&Et(o)!=null&&re!==ct&&r.reference[g]/2-(re<De?ke:Ze)-k[g]/2<0,Ce=We?re<De?re-De:re-Qe:0;return{[m]:b[m]+Ce,data:{[m]:ct,centerOffset:re-ct-Ce,...We&&{alignmentOffset:Ce}},reset:We}}}),ya=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var s,i;const{placement:o,middlewareData:r,rects:a,initialPlacement:n,platform:u,elements:d}=t,{mainAxis:p=!0,crossAxis:f=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:k=!0,...w}=St(e,t);if((s=r.arrow)!=null&&s.alignmentOffset)return{};const _=st(o),E=Ge(n),I=st(n)===n,W=await(u.isRTL==null?void 0:u.isRTL(d.floating)),H=b||(I||!k?[ks(n)]:ua(n)),oe=g!=="none";!b&&oe&&H.push(...fa(n,k,g,W));const U=[n,...H],Ve=await Ri(t,w),Pe=[];let ke=((i=r.flip)==null?void 0:i.overflows)||[];if(p&&Pe.push(Ve[_]),f){const re=da(o,a,W);Pe.push(Ve[re[0]],Ve[re[1]])}if(ke=[...ke,{placement:o,overflows:Pe}],!Pe.every(re=>re<=0)){var Ze,De;const re=(((Ze=r.flip)==null?void 0:Ze.index)||0)+1,ct=U[re];if(ct&&(!(f==="alignment"?E!==Ge(ct):!1)||ke.every($e=>Ge($e.placement)===E?$e.overflows[0]>0:!0)))return{data:{index:re,overflows:ke},reset:{placement:ct}};let We=(De=ke.filter(Ce=>Ce.overflows[0]<=0).sort((Ce,$e)=>Ce.overflows[1]-$e.overflows[1])[0])==null?void 0:De.placement;if(!We)switch(m){case"bestFit":{var Qe;const Ce=(Qe=ke.filter($e=>{if(oe){const Je=Ge($e.placement);return Je===E||Je==="y"}return!0}).map($e=>[$e.placement,$e.overflows.filter(Je=>Je>0).reduce((Je,kr)=>Je+kr,0)]).sort(($e,Je)=>$e[1]-Je[1])[0])==null?void 0:Qe[0];Ce&&(We=Ce);break}case"initialPlacement":We=n;break}if(o!==We)return{reset:{placement:We}}}return{}}}},ka=new Set(["left","top"]);async function wa(e,t){const{placement:s,platform:i,elements:o}=e,r=await(i.isRTL==null?void 0:i.isRTL(o.floating)),a=st(s),n=Et(s),u=Ge(s)==="y",d=ka.has(a)?-1:1,p=r&&u?-1:1,f=St(t,e);let{mainAxis:b,crossAxis:m,alignmentAxis:g}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return n&&typeof g=="number"&&(m=n==="end"?g*-1:g),u?{x:m*p,y:b*d}:{x:b*d,y:m*p}}const xa=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var s,i;const{x:o,y:r,placement:a,middlewareData:n}=t,u=await wa(t,e);return a===((s=n.offset)==null?void 0:s.placement)&&(i=n.arrow)!=null&&i.alignmentOffset?{}:{x:o+u.x,y:r+u.y,data:{...u,placement:a}}}}},_a=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:s,y:i,placement:o}=t,{mainAxis:r=!0,crossAxis:a=!1,limiter:n={fn:w=>{let{x:_,y:E}=w;return{x:_,y:E}}},...u}=St(e,t),d={x:s,y:i},p=await Ri(t,u),f=Ge(st(o)),b=Fo(f);let m=d[b],g=d[f];if(r){const w=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=m+p[w],I=m-p[_];m=pi(E,m,I)}if(a){const w=f==="y"?"top":"left",_=f==="y"?"bottom":"right",E=g+p[w],I=g-p[_];g=pi(E,g,I)}const k=n.fn({...t,[b]:m,[f]:g});return{...k,data:{x:k.x-s,y:k.y-i,enabled:{[b]:r,[f]:a}}}}}},Ca=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var s,i;const{placement:o,rects:r,platform:a,elements:n}=t,{apply:u=()=>{},...d}=St(e,t),p=await Ri(t,d),f=st(o),b=Et(o),m=Ge(o)==="y",{width:g,height:k}=r.floating;let w,_;f==="top"||f==="bottom"?(w=f,_=b===(await(a.isRTL==null?void 0:a.isRTL(n.floating))?"start":"end")?"left":"right"):(_=f,w=b==="end"?"top":"bottom");const E=k-p.top-p.bottom,I=g-p.left-p.right,W=tt(k-p[w],E),H=tt(g-p[_],I),oe=!t.middlewareData.shift;let U=W,Ve=H;if((s=t.middlewareData.shift)!=null&&s.enabled.x&&(Ve=I),(i=t.middlewareData.shift)!=null&&i.enabled.y&&(U=E),oe&&!b){const ke=ue(p.left,0),Ze=ue(p.right,0),De=ue(p.top,0),Qe=ue(p.bottom,0);m?Ve=g-2*(ke!==0||Ze!==0?ke+Ze:ue(p.left,p.right)):U=k-2*(De!==0||Qe!==0?De+Qe:ue(p.top,p.bottom))}await u({...t,availableWidth:Ve,availableHeight:U});const Pe=await a.getDimensions(n.floating);return g!==Pe.width||k!==Pe.height?{reset:{rects:!0}}:{}}}};function Ps(){return typeof window<"u"}function zt(e){return No(e)?(e.nodeName||"").toLowerCase():"#document"}function he(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function He(e){var t;return(t=(No(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function No(e){return Ps()?e instanceof Node||e instanceof he(e).Node:!1}function ze(e){return Ps()?e instanceof Element||e instanceof he(e).Element:!1}function Ne(e){return Ps()?e instanceof HTMLElement||e instanceof he(e).HTMLElement:!1}function so(e){return!Ps()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof he(e).ShadowRoot}const $a=new Set(["inline","contents"]);function Qt(e){const{overflow:t,overflowX:s,overflowY:i,display:o}=Re(e);return/auto|scroll|overlay|hidden|clip/.test(t+i+s)&&!$a.has(o)}const Ta=new Set(["table","td","th"]);function Sa(e){return Ta.has(zt(e))}const Ea=[":popover-open",":modal"];function Ds(e){return Ea.some(t=>{try{return e.matches(t)}catch{return!1}})}const za=["transform","translate","scale","rotate","perspective"],Ra=["transform","translate","scale","rotate","perspective","filter"],Aa=["paint","layout","strict","content"];function Ms(e){const t=Ai(),s=ze(e)?Re(e):e;return za.some(i=>s[i]?s[i]!=="none":!1)||(s.containerType?s.containerType!=="normal":!1)||!t&&(s.backdropFilter?s.backdropFilter!=="none":!1)||!t&&(s.filter?s.filter!=="none":!1)||Ra.some(i=>(s.willChange||"").includes(i))||Aa.some(i=>(s.contain||"").includes(i))}function Ia(e){let t=it(e);for(;Ne(t)&&!Ct(t);){if(Ms(t))return t;if(Ds(t))return null;t=it(t)}return null}function Ai(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Oa=new Set(["html","body","#document"]);function Ct(e){return Oa.has(zt(e))}function Re(e){return he(e).getComputedStyle(e)}function Fs(e){return ze(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function it(e){if(zt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||so(e)&&e.host||He(e);return so(t)?t.host:t}function Ho(e){const t=it(e);return Ct(t)?e.ownerDocument?e.ownerDocument.body:e.body:Ne(t)&&Qt(t)?t:Ho(t)}function Gt(e,t,s){var i;t===void 0&&(t=[]),s===void 0&&(s=!0);const o=Ho(e),r=o===((i=e.ownerDocument)==null?void 0:i.body),a=he(o);if(r){const n=fi(a);return t.concat(a,a.visualViewport||[],Qt(o)?o:[],n&&s?Gt(n):[])}return t.concat(o,Gt(o,[],s))}function fi(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function jo(e){const t=Re(e);let s=parseFloat(t.width)||0,i=parseFloat(t.height)||0;const o=Ne(e),r=o?e.offsetWidth:s,a=o?e.offsetHeight:i,n=ys(s)!==r||ys(i)!==a;return n&&(s=r,i=a),{width:s,height:i,$:n}}function Ii(e){return ze(e)?e:e.contextElement}function _t(e){const t=Ii(e);if(!Ne(t))return Be(1);const s=t.getBoundingClientRect(),{width:i,height:o,$:r}=jo(t);let a=(r?ys(s.width):s.width)/i,n=(r?ys(s.height):s.height)/o;return(!a||!Number.isFinite(a))&&(a=1),(!n||!Number.isFinite(n))&&(n=1),{x:a,y:n}}const La=Be(0);function Uo(e){const t=he(e);return!Ai()||!t.visualViewport?La:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Pa(e,t,s){return t===void 0&&(t=!1),!s||t&&s!==he(e)?!1:t}function pt(e,t,s,i){t===void 0&&(t=!1),s===void 0&&(s=!1);const o=e.getBoundingClientRect(),r=Ii(e);let a=Be(1);t&&(i?ze(i)&&(a=_t(i)):a=_t(e));const n=Pa(r,s,i)?Uo(r):Be(0);let u=(o.left+n.x)/a.x,d=(o.top+n.y)/a.y,p=o.width/a.x,f=o.height/a.y;if(r){const b=he(r),m=i&&ze(i)?he(i):i;let g=b,k=fi(g);for(;k&&i&&m!==g;){const w=_t(k),_=k.getBoundingClientRect(),E=Re(k),I=_.left+(k.clientLeft+parseFloat(E.paddingLeft))*w.x,W=_.top+(k.clientTop+parseFloat(E.paddingTop))*w.y;u*=w.x,d*=w.y,p*=w.x,f*=w.y,u+=I,d+=W,g=he(k),k=fi(g)}}return ws({width:p,height:f,x:u,y:d})}function Bs(e,t){const s=Fs(e).scrollLeft;return t?t.left+s:pt(He(e)).left+s}function Vo(e,t){const s=e.getBoundingClientRect(),i=s.left+t.scrollLeft-Bs(e,s),o=s.top+t.scrollTop;return{x:i,y:o}}function Da(e){let{elements:t,rect:s,offsetParent:i,strategy:o}=e;const r=o==="fixed",a=He(i),n=t?Ds(t.floating):!1;if(i===a||n&&r)return s;let u={scrollLeft:0,scrollTop:0},d=Be(1);const p=Be(0),f=Ne(i);if((f||!f&&!r)&&((zt(i)!=="body"||Qt(a))&&(u=Fs(i)),Ne(i))){const m=pt(i);d=_t(i),p.x=m.x+i.clientLeft,p.y=m.y+i.clientTop}const b=a&&!f&&!r?Vo(a,u):Be(0);return{width:s.width*d.x,height:s.height*d.y,x:s.x*d.x-u.scrollLeft*d.x+p.x+b.x,y:s.y*d.y-u.scrollTop*d.y+p.y+b.y}}function Ma(e){return Array.from(e.getClientRects())}function Fa(e){const t=He(e),s=Fs(e),i=e.ownerDocument.body,o=ue(t.scrollWidth,t.clientWidth,i.scrollWidth,i.clientWidth),r=ue(t.scrollHeight,t.clientHeight,i.scrollHeight,i.clientHeight);let a=-s.scrollLeft+Bs(e);const n=-s.scrollTop;return Re(i).direction==="rtl"&&(a+=ue(t.clientWidth,i.clientWidth)-o),{width:o,height:r,x:a,y:n}}const io=25;function Ba(e,t){const s=he(e),i=He(e),o=s.visualViewport;let r=i.clientWidth,a=i.clientHeight,n=0,u=0;if(o){r=o.width,a=o.height;const p=Ai();(!p||p&&t==="fixed")&&(n=o.offsetLeft,u=o.offsetTop)}const d=Bs(i);if(d<=0){const p=i.ownerDocument,f=p.body,b=getComputedStyle(f),m=p.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(i.clientWidth-f.clientWidth-m);g<=io&&(r-=g)}else d<=io&&(r+=d);return{width:r,height:a,x:n,y:u}}const Na=new Set(["absolute","fixed"]);function Ha(e,t){const s=pt(e,!0,t==="fixed"),i=s.top+e.clientTop,o=s.left+e.clientLeft,r=Ne(e)?_t(e):Be(1),a=e.clientWidth*r.x,n=e.clientHeight*r.y,u=o*r.x,d=i*r.y;return{width:a,height:n,x:u,y:d}}function oo(e,t,s){let i;if(t==="viewport")i=Ba(e,s);else if(t==="document")i=Fa(He(e));else if(ze(t))i=Ha(t,s);else{const o=Uo(e);i={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return ws(i)}function Wo(e,t){const s=it(e);return s===t||!ze(s)||Ct(s)?!1:Re(s).position==="fixed"||Wo(s,t)}function ja(e,t){const s=t.get(e);if(s)return s;let i=Gt(e,[],!1).filter(n=>ze(n)&&zt(n)!=="body"),o=null;const r=Re(e).position==="fixed";let a=r?it(e):e;for(;ze(a)&&!Ct(a);){const n=Re(a),u=Ms(a);!u&&n.position==="fixed"&&(o=null),(r?!u&&!o:!u&&n.position==="static"&&!!o&&Na.has(o.position)||Qt(a)&&!u&&Wo(e,a))?i=i.filter(p=>p!==a):o=n,a=it(a)}return t.set(e,i),i}function Ua(e){let{element:t,boundary:s,rootBoundary:i,strategy:o}=e;const a=[...s==="clippingAncestors"?Ds(t)?[]:ja(t,this._c):[].concat(s),i],n=a[0],u=a.reduce((d,p)=>{const f=oo(t,p,o);return d.top=ue(f.top,d.top),d.right=tt(f.right,d.right),d.bottom=tt(f.bottom,d.bottom),d.left=ue(f.left,d.left),d},oo(t,n,o));return{width:u.right-u.left,height:u.bottom-u.top,x:u.left,y:u.top}}function Va(e){const{width:t,height:s}=jo(e);return{width:t,height:s}}function Wa(e,t,s){const i=Ne(t),o=He(t),r=s==="fixed",a=pt(e,!0,r,t);let n={scrollLeft:0,scrollTop:0};const u=Be(0);function d(){u.x=Bs(o)}if(i||!i&&!r)if((zt(t)!=="body"||Qt(o))&&(n=Fs(t)),i){const m=pt(t,!0,r,t);u.x=m.x+t.clientLeft,u.y=m.y+t.clientTop}else o&&d();r&&!i&&o&&d();const p=o&&!i&&!r?Vo(o,n):Be(0),f=a.left+n.scrollLeft-u.x-p.x,b=a.top+n.scrollTop-u.y-p.y;return{x:f,y:b,width:a.width,height:a.height}}function si(e){return Re(e).position==="static"}function ro(e,t){if(!Ne(e)||Re(e).position==="fixed")return null;if(t)return t(e);let s=e.offsetParent;return He(e)===s&&(s=s.ownerDocument.body),s}function qo(e,t){const s=he(e);if(Ds(e))return s;if(!Ne(e)){let o=it(e);for(;o&&!Ct(o);){if(ze(o)&&!si(o))return o;o=it(o)}return s}let i=ro(e,t);for(;i&&Sa(i)&&si(i);)i=ro(i,t);return i&&Ct(i)&&si(i)&&!Ms(i)?s:i||Ia(e)||s}const qa=async function(e){const t=this.getOffsetParent||qo,s=this.getDimensions,i=await s(e.floating);return{reference:Wa(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:i.width,height:i.height}}};function Ka(e){return Re(e).direction==="rtl"}const ms={convertOffsetParentRelativeRectToViewportRelativeRect:Da,getDocumentElement:He,getClippingRect:Ua,getOffsetParent:qo,getElementRects:qa,getClientRects:Ma,getDimensions:Va,getScale:_t,isElement:ze,isRTL:Ka};function Ko(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Ga(e,t){let s=null,i;const o=He(e);function r(){var n;clearTimeout(i),(n=s)==null||n.disconnect(),s=null}function a(n,u){n===void 0&&(n=!1),u===void 0&&(u=1),r();const d=e.getBoundingClientRect(),{left:p,top:f,width:b,height:m}=d;if(n||t(),!b||!m)return;const g=as(f),k=as(o.clientWidth-(p+b)),w=as(o.clientHeight-(f+m)),_=as(p),I={rootMargin:-g+"px "+-k+"px "+-w+"px "+-_+"px",threshold:ue(0,tt(1,u))||1};let W=!0;function H(oe){const U=oe[0].intersectionRatio;if(U!==u){if(!W)return a();U?a(!1,U):i=setTimeout(()=>{a(!1,1e-7)},1e3)}U===1&&!Ko(d,e.getBoundingClientRect())&&a(),W=!1}try{s=new IntersectionObserver(H,{...I,root:o.ownerDocument})}catch{s=new IntersectionObserver(H,I)}s.observe(e)}return a(!0),r}function Ya(e,t,s,i){i===void 0&&(i={});const{ancestorScroll:o=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:n=typeof IntersectionObserver=="function",animationFrame:u=!1}=i,d=Ii(e),p=o||r?[...d?Gt(d):[],...Gt(t)]:[];p.forEach(_=>{o&&_.addEventListener("scroll",s,{passive:!0}),r&&_.addEventListener("resize",s)});const f=d&&n?Ga(d,s):null;let b=-1,m=null;a&&(m=new ResizeObserver(_=>{let[E]=_;E&&E.target===d&&m&&(m.unobserve(t),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var I;(I=m)==null||I.observe(t)})),s()}),d&&!u&&m.observe(d),m.observe(t));let g,k=u?pt(e):null;u&&w();function w(){const _=pt(e);k&&!Ko(k,_)&&s(),k=_,g=requestAnimationFrame(w)}return s(),()=>{var _;p.forEach(E=>{o&&E.removeEventListener("scroll",s),r&&E.removeEventListener("resize",s)}),f==null||f(),(_=m)==null||_.disconnect(),m=null,u&&cancelAnimationFrame(g)}}const Xa=xa,Za=_a,Qa=ya,ao=Ca,Ja=va,en=(e,t,s)=>{const i=new Map,o={platform:ms,...s},r={...o.platform,_c:i};return ga(e,t,{...o,platform:r})};function tn(e){return sn(e)}function ii(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function sn(e){for(let t=e;t;t=ii(t))if(t instanceof Element&&getComputedStyle(t).display==="none")return null;for(let t=ii(e);t;t=ii(t)){if(!(t instanceof Element))continue;const s=getComputedStyle(t);if(s.display!=="contents"&&(s.position!=="static"||Ms(s)||t.tagName==="BODY"))return t}return null}function on(e){return e!==null&&typeof e=="object"&&"getBoundingClientRect"in e&&("contextElement"in e?e.contextElement instanceof Element:!0)}var D=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),s=this.placement.includes("top")||this.placement.includes("bottom");let i=0,o=0,r=0,a=0,n=0,u=0,d=0,p=0;s?e.top<t.top?(i=e.left,o=e.bottom,r=e.right,a=e.bottom,n=t.left,u=t.top,d=t.right,p=t.top):(i=t.left,o=t.bottom,r=t.right,a=t.bottom,n=e.left,u=e.top,d=e.right,p=e.top):e.left<t.left?(i=e.right,o=e.top,r=t.left,a=t.top,n=e.right,u=e.bottom,d=t.left,p=t.bottom):(i=t.right,o=t.top,r=e.left,a=e.top,n=t.right,u=t.bottom,d=e.left,p=e.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${i}px`),this.style.setProperty("--hover-bridge-top-left-y",`${o}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${p}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has("active")&&(this.active?this.start():this.stop()),e.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||on(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Ya(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;const e=[Xa({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(ao({apply:({rects:s})=>{const i=this.sync==="width"||this.sync==="both",o=this.sync==="height"||this.sync==="both";this.popup.style.width=i?`${s.reference.width}px`:"",this.popup.style.height=o?`${s.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&e.push(Qa({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&e.push(Za({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(ao({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:s,availableHeight:i})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${i}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${s}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&e.push(Ja({element:this.arrowEl,padding:this.arrowPadding}));const t=this.strategy==="absolute"?s=>ms.getOffsetParent(s,tn):ms.getOffsetParent;en(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:Xt(Ye({},ms),{getOffsetParent:t})}).then(({x:s,y:i,middlewareData:o,placement:r})=>{const a=this.localize.dir()==="rtl",n={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${s}px`,top:`${i}px`}),this.arrow){const u=o.arrow.x,d=o.arrow.y;let p="",f="",b="",m="";if(this.arrowPlacement==="start"){const g=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=a?g:"",m=a?"":g}else if(this.arrowPlacement==="end"){const g=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=a?"":g,m=a?g:"",b=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":"",p=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof u=="number"?`${u}px`:"",p=typeof d=="number"?`${d}px`:"");Object.assign(this.arrowEl.style,{top:p,right:f,bottom:b,left:m,[n]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return h`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${F({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${F({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?h`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};D.styles=[N,aa];l([C(".popup")],D.prototype,"popup",2);l([C(".popup__arrow")],D.prototype,"arrowEl",2);l([c()],D.prototype,"anchor",2);l([c({type:Boolean,reflect:!0})],D.prototype,"active",2);l([c({reflect:!0})],D.prototype,"placement",2);l([c({reflect:!0})],D.prototype,"strategy",2);l([c({type:Number})],D.prototype,"distance",2);l([c({type:Number})],D.prototype,"skidding",2);l([c({type:Boolean})],D.prototype,"arrow",2);l([c({attribute:"arrow-placement"})],D.prototype,"arrowPlacement",2);l([c({attribute:"arrow-padding",type:Number})],D.prototype,"arrowPadding",2);l([c({type:Boolean})],D.prototype,"flip",2);l([c({attribute:"flip-fallback-placements",converter:{fromAttribute:e=>e.split(" ").map(t=>t.trim()).filter(t=>t!==""),toAttribute:e=>e.join(" ")}})],D.prototype,"flipFallbackPlacements",2);l([c({attribute:"flip-fallback-strategy"})],D.prototype,"flipFallbackStrategy",2);l([c({type:Object})],D.prototype,"flipBoundary",2);l([c({attribute:"flip-padding",type:Number})],D.prototype,"flipPadding",2);l([c({type:Boolean})],D.prototype,"shift",2);l([c({type:Object})],D.prototype,"shiftBoundary",2);l([c({attribute:"shift-padding",type:Number})],D.prototype,"shiftPadding",2);l([c({attribute:"auto-size"})],D.prototype,"autoSize",2);l([c()],D.prototype,"sync",2);l([c({type:Object})],D.prototype,"autoSizeBoundary",2);l([c({attribute:"auto-size-padding",type:Number})],D.prototype,"autoSizePadding",2);l([c({attribute:"hover-bridge",type:Boolean})],D.prototype,"hoverBridge",2);var Go=new Map,rn=new WeakMap;function an(e){return e??{keyframes:[],options:{duration:0}}}function no(e,t){return t.toLowerCase()==="rtl"?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function B(e,t){Go.set(e,an(t))}function q(e,t,s){const i=rn.get(e);if(i!=null&&i[t])return no(i[t],s.dir);const o=Go.get(t);return o?no(o,s.dir):{keyframes:[],options:{duration:0}}}function ce(e,t){return new Promise(s=>{function i(o){o.target===e&&(e.removeEventListener(t,i),s())}e.addEventListener(t,i)})}function K(e,t,s){return new Promise(i=>{if((s==null?void 0:s.duration)===1/0)throw new Error("Promise-based animations must be finite.");const o=e.animate(t,Xt(Ye({},s),{duration:nn()?0:s.duration}));o.addEventListener("cancel",i,{once:!0}),o.addEventListener("finish",i,{once:!0})})}function lo(e){return e=e.toString().toLowerCase(),e.indexOf("ms")>-1?parseFloat(e):e.indexOf("s")>-1?parseFloat(e)*1e3:parseFloat(e)}function nn(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function X(e){return Promise.all(e.getAnimations().map(t=>new Promise(s=>{t.cancel(),requestAnimationFrame(s)})))}function co(e,t){return e.map(s=>Xt(Ye({},s),{height:s.height==="auto"?`${t}px`:s.height}))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let bi=class extends Os{constructor(t){if(super(t),this.it=v,t.type!==Ke.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===v||t==null)return this._t=void 0,this.it=t;if(t===wt)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const s=[t];return s.raw=s,this._t={_$litType$:this.constructor.resultType,strings:s,values:[]}}};bi.directiveName="unsafeHTML",bi.resultType=1;const Oi=Is(bi);var z=class extends L{constructor(){super(...arguments),this.formControlController=new Zt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Xe(this,"help-text","label"),this.localize=new se(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=e=>h`
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
    `,this.handleDocumentFocusIn=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{const t=e.target,s=t.closest(".select__clear")!==null,i=t.closest("sl-icon-button")!==null;if(!(s||i)){if(e.key==="Escape"&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key==="Enter"||e.key===" "&&this.typeToSelectString===""){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){const o=this.getAllOptions(),r=o.indexOf(this.currentOption);let a=Math.max(0,r);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key==="ArrowDown"?(a=r+1,a>o.length-1&&(a=0)):e.key==="ArrowUp"?(a=r-1,a<0&&(a=o.length-1)):e.key==="Home"?a=0:e.key==="End"&&(a=o.length-1),this.setCurrentOption(o[a])}if(e.key&&e.key.length===1||e.key==="Backspace"){const o=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key==="Backspace")return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),e.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(const r of o)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){this.multiple?e=Array.isArray(e)?e:e.split(" "):e=Array.isArray(e)?e.join(" "):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){const s=e.composedPath().some(i=>i instanceof Element&&i.tagName.toLowerCase()==="sl-icon-button");this.disabled||s||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!=="Tab"&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){const s=e.target.closest("sl-option"),i=this.value;s&&!s.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(s):this.setSelectedOptions(s),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==i&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,s=Array.isArray(t)?t:[t],i=[];e.forEach(o=>i.push(o.value)),this.setSelectedOptions(e.filter(o=>s.includes(o.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(e){this.getAllOptions().forEach(s=>{s.current=!1,s.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){const t=this.getAllOptions(),s=Array.isArray(e)?e:[e];t.forEach(i=>i.selected=!1),s.length&&s.forEach(i=>i.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){var e,t,s;const i=this.getAllOptions();this.selectedOptions=i.filter(r=>r.selected);const o=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(e=r==null?void 0:r.value)!=null?e:"",this.displayLabel=(s=(t=r==null?void 0:r.getTextLabel)==null?void 0:t.call(r))!=null?s:""}this.valueHasChanged=o,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){const s=this.getTag(e,t);return h`<div @sl-remove=${i=>this.handleTagRemove(i,e)}>
          ${typeof s=="string"?Oi(s):s}
        </div>`}else if(t===this.maxOptionsVisible)return h`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return h``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,s){if(super.attributeChangedCallback(e,t,s),e==="value"){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}}handleValueChange(){if(!this.valueHasChanged){const s=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=s}const e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(s=>t.includes(s.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await X(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:e,options:t}=q(this,"select.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.currentOption&&hi(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await X(this);const{keyframes:e,options:t}=q(this,"select.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ce(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ce(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t,o=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return h`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
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
            class=${F({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":r,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${o?h`
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
    `}};z.styles=[N,Ls,sa];z.dependencies={"sl-icon":Q,"sl-popup":D,"sl-tag":vt};l([C(".select")],z.prototype,"popup",2);l([C(".select__combobox")],z.prototype,"combobox",2);l([C(".select__display-input")],z.prototype,"displayInput",2);l([C(".select__value-input")],z.prototype,"valueInput",2);l([C(".select__listbox")],z.prototype,"listbox",2);l([y()],z.prototype,"hasFocus",2);l([y()],z.prototype,"displayLabel",2);l([y()],z.prototype,"currentOption",2);l([y()],z.prototype,"selectedOptions",2);l([y()],z.prototype,"valueHasChanged",2);l([c()],z.prototype,"name",2);l([y()],z.prototype,"value",1);l([c({attribute:"value"})],z.prototype,"defaultValue",2);l([c({reflect:!0})],z.prototype,"size",2);l([c()],z.prototype,"placeholder",2);l([c({type:Boolean,reflect:!0})],z.prototype,"multiple",2);l([c({attribute:"max-options-visible",type:Number})],z.prototype,"maxOptionsVisible",2);l([c({type:Boolean,reflect:!0})],z.prototype,"disabled",2);l([c({type:Boolean})],z.prototype,"clearable",2);l([c({type:Boolean,reflect:!0})],z.prototype,"open",2);l([c({type:Boolean})],z.prototype,"hoist",2);l([c({type:Boolean,reflect:!0})],z.prototype,"filled",2);l([c({type:Boolean,reflect:!0})],z.prototype,"pill",2);l([c()],z.prototype,"label",2);l([c({reflect:!0})],z.prototype,"placement",2);l([c({attribute:"help-text"})],z.prototype,"helpText",2);l([c({reflect:!0})],z.prototype,"form",2);l([c({type:Boolean,reflect:!0})],z.prototype,"required",2);l([c()],z.prototype,"getTag",2);l([S("disabled",{waitUntilFirstUpdate:!0})],z.prototype,"handleDisabledChange",1);l([S(["defaultValue","value"],{waitUntilFirstUpdate:!0})],z.prototype,"handleValueChange",1);l([S("open",{waitUntilFirstUpdate:!0})],z.prototype,"handleOpenChange",1);B("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});z.define("sl-select");var ln=$`
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
`,xe=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const e=this.closest("sl-select");e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const e=this.childNodes;let t="";return[...e].forEach(s=>{s.nodeType===Node.ELEMENT_NODE&&(s.hasAttribute("slot")||(t+=s.textContent)),s.nodeType===Node.TEXT_NODE&&(t+=s.textContent)}),t.trim()}render(){return h`
      <div
        part="base"
        class=${F({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};xe.styles=[N,ln];xe.dependencies={"sl-icon":Q};l([C(".option__label")],xe.prototype,"defaultSlot",2);l([y()],xe.prototype,"current",2);l([y()],xe.prototype,"selected",2);l([y()],xe.prototype,"hasHover",2);l([c({reflect:!0})],xe.prototype,"value",2);l([c({type:Boolean,reflect:!0})],xe.prototype,"disabled",2);l([S("disabled")],xe.prototype,"handleDisabledChange",1);l([S("selected")],xe.prototype,"handleSelectedChange",1);l([S("value")],xe.prototype,"handleValueChange",1);xe.define("sl-option");var cn=$`
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
`;function*Li(e=document.activeElement){e!=null&&(yield e,"shadowRoot"in e&&e.shadowRoot&&e.shadowRoot.mode!=="closed"&&(yield*Pr(Li(e.shadowRoot.activeElement))))}function Yo(){return[...Li()].pop()}var uo=new WeakMap;function Xo(e){let t=uo.get(e);return t||(t=window.getComputedStyle(e,null),uo.set(e,t)),t}function dn(e){if(typeof e.checkVisibility=="function")return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const t=Xo(e);return t.visibility!=="hidden"&&t.display!=="none"}function un(e){const t=Xo(e),{overflowY:s,overflowX:i}=t;return s==="scroll"||i==="scroll"?!0:s!=="auto"||i!=="auto"?!1:e.scrollHeight>e.clientHeight&&s==="auto"||e.scrollWidth>e.clientWidth&&i==="auto"}function hn(e){const t=e.tagName.toLowerCase(),s=Number(e.getAttribute("tabindex"));if(e.hasAttribute("tabindex")&&(isNaN(s)||s<=-1)||e.hasAttribute("disabled")||e.closest("[inert]"))return!1;if(t==="input"&&e.getAttribute("type")==="radio"){const r=e.getRootNode(),a=`input[type='radio'][name="${e.getAttribute("name")}"]`,n=r.querySelector(`${a}:checked`);return n?n===e:r.querySelector(a)===e}return dn(e)?(t==="audio"||t==="video")&&e.hasAttribute("controls")||e.hasAttribute("tabindex")||e.hasAttribute("contenteditable")&&e.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(t)?!0:un(e):!1}function pn(e){var t,s;const i=gi(e),o=(t=i[0])!=null?t:null,r=(s=i[i.length-1])!=null?s:null;return{start:o,end:r}}function mn(e,t){var s;return((s=e.getRootNode({composed:!0}))==null?void 0:s.host)!==t}function gi(e){const t=new WeakMap,s=[];function i(o){if(o instanceof Element){if(o.hasAttribute("inert")||o.closest("[inert]")||t.has(o))return;t.set(o,!0),!s.includes(o)&&hn(o)&&s.push(o),o instanceof HTMLSlotElement&&mn(o,e)&&o.assignedElements({flatten:!0}).forEach(r=>{i(r)}),o.shadowRoot!==null&&o.shadowRoot.mode==="open"&&i(o.shadowRoot)}for(const r of o.children)i(r)}return i(e),s.sort((o,r)=>{const a=Number(o.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var Bt=[],Zo=class{constructor(e){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=t=>{var s;if(t.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const i=Yo();if(this.previousFocus=i,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;t.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const o=gi(this.element);let r=o.findIndex(n=>n===i);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=o.length?r=0:r+a<0?r=o.length-1:r+=a,this.previousFocus=this.currentFocus;const n=o[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||n&&this.possiblyHasTabbableChildren(n))return;t.preventDefault(),this.currentFocus=n,(s=this.currentFocus)==null||s.focus({preventScroll:!1});const u=[...Li()];if(u.includes(this.currentFocus)||!u.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=e,this.elementsWithTabbableControls=["iframe"]}activate(){Bt.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){Bt=Bt.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return Bt[Bt.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const e=gi(this.element);if(!this.element.matches(":focus-within")){const t=e[0],s=e[e.length-1],i=this.tabDirection==="forward"?t:s;typeof(i==null?void 0:i.focus)=="function"&&(this.currentFocus=i,i.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute("controls")}},Pi=e=>{var t;const{activeElement:s}=document;s&&e.contains(s)&&((t=document.activeElement)==null||t.blur())};function ho(e){return e.charAt(0).toUpperCase()+e.slice(1)}var fe=class extends L{constructor(){super(...arguments),this.hasSlotController=new Xe(this,"footer"),this.localize=new se(this),this.modal=new Zo(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=e=>{this.contained||e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),Vt(this)))}disconnectedCallback(){super.disconnectedCallback(),Wt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const s=q(this,"drawer.denyClose",{dir:this.localize.dir()});K(this.panel,s.keyframes,s.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;document.removeEventListener("keydown",this.handleDocumentKeyDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),Vt(this));const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([X(this.drawer),X(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=q(this,`drawer.show${ho(this.placement)}`,{dir:this.localize.dir()}),s=q(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,s.keyframes,s.options)]),this.emit("sl-after-show")}else{Pi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),Wt(this)),await Promise.all([X(this.drawer),X(this.overlay)]);const e=q(this,`drawer.hide${ho(this.placement)}`,{dir:this.localize.dir()}),t=q(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const s=this.originalTrigger;typeof(s==null?void 0:s.focus)=="function"&&setTimeout(()=>s.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),Vt(this)),this.open&&this.contained&&(this.modal.deactivate(),Wt(this))}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${F({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
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
    `}};fe.styles=[N,cn];fe.dependencies={"sl-icon-button":Y};l([C(".drawer")],fe.prototype,"drawer",2);l([C(".drawer__panel")],fe.prototype,"panel",2);l([C(".drawer__overlay")],fe.prototype,"overlay",2);l([c({type:Boolean,reflect:!0})],fe.prototype,"open",2);l([c({reflect:!0})],fe.prototype,"label",2);l([c({reflect:!0})],fe.prototype,"placement",2);l([c({type:Boolean,reflect:!0})],fe.prototype,"contained",2);l([c({attribute:"no-header",type:Boolean,reflect:!0})],fe.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],fe.prototype,"handleOpenChange",1);l([S("contained",{waitUntilFirstUpdate:!0})],fe.prototype,"handleNoModalChange",1);B("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});B("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});B("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});B("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});B("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});B("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});B("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});B("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});fe.define("sl-drawer");var fn=$`
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
`,je=class extends L{constructor(){super(...arguments),this.hasSlotController=new Xe(this,"footer"),this.localize=new se(this),this.modal=new Zo(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key==="Escape"&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Vt(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Wt(this),this.removeOpenListeners()}requestClose(e){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:e}}).defaultPrevented){const s=q(this,"dialog.denyClose",{dir:this.localize.dir()});K(this.panel,s.keyframes,s.options);return}this.hide()}addOpenListeners(){var e;"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Vt(this);const e=this.querySelector("[autofocus]");e&&e.removeAttribute("autofocus"),await Promise.all([X(this.dialog),X(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute("autofocus","")});const t=q(this,"dialog.show",{dir:this.localize.dir()}),s=q(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([K(this.panel,t.keyframes,t.options),K(this.overlay,s.keyframes,s.options)]),this.emit("sl-after-show")}else{Pi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([X(this.dialog),X(this.overlay)]);const e=q(this,"dialog.hide",{dir:this.localize.dir()}),t=q(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([K(this.overlay,t.keyframes,t.options).then(()=>{this.overlay.hidden=!0}),K(this.panel,e.keyframes,e.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Wt(this);const s=this.originalTrigger;typeof(s==null?void 0:s.focus)=="function"&&setTimeout(()=>s.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <div
        part="base"
        class=${F({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
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
    `}};je.styles=[N,fn];je.dependencies={"sl-icon-button":Y};l([C(".dialog")],je.prototype,"dialog",2);l([C(".dialog__panel")],je.prototype,"panel",2);l([C(".dialog__overlay")],je.prototype,"overlay",2);l([c({type:Boolean,reflect:!0})],je.prototype,"open",2);l([c({reflect:!0})],je.prototype,"label",2);l([c({attribute:"no-header",type:Boolean,reflect:!0})],je.prototype,"noHeader",2);l([S("open",{waitUntilFirstUpdate:!0})],je.prototype,"handleOpenChange",1);B("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});B("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});B("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});B("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});je.define("sl-dialog");var bn=$`
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
`,Jt=class extends L{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return h`
      <span
        part="base"
        class=${F({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};Jt.styles=[N,bn];l([c({reflect:!0})],Jt.prototype,"variant",2);l([c({type:Boolean,reflect:!0})],Jt.prototype,"pill",2);l([c({type:Boolean,reflect:!0})],Jt.prototype,"pulse",2);Jt.define("sl-badge");var gn=$`
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
`,be=class dt extends L{constructor(){super(...arguments),this.hasSlotController=new Xe(this,"icon","suffix"),this.localize=new se(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var t;(t=this.countdownAnimation)==null||t.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var t;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(t=this.countdownAnimation)==null||t.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:t}=this,s="100%",i="0";this.countdownAnimation=t.animate([{width:s},{width:i}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await X(this.base),this.base.hidden=!1;const{keyframes:t,options:s}=q(this,"alert.show",{dir:this.localize.dir()});await K(this.base,t,s),this.emit("sl-after-show")}else{Pi(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await X(this.base);const{keyframes:t,options:s}=q(this,"alert.hide",{dir:this.localize.dir()});await K(this.base,t,s),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}async toast(){return new Promise(t=>{this.handleCountdownChange(),dt.toastStack.parentElement===null&&document.body.append(dt.toastStack),dt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{dt.toastStack.removeChild(this),t(),dt.toastStack.querySelector("sl-alert")===null&&dt.toastStack.remove()},{once:!0})})}render(){return h`
      <div
        part="base"
        class=${F({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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
                class=${F({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};be.styles=[N,gn];be.dependencies={"sl-icon-button":Y};l([C('[part~="base"]')],be.prototype,"base",2);l([C(".alert__countdown-elapsed")],be.prototype,"countdownElement",2);l([c({type:Boolean,reflect:!0})],be.prototype,"open",2);l([c({type:Boolean,reflect:!0})],be.prototype,"closable",2);l([c({reflect:!0})],be.prototype,"variant",2);l([c({type:Number})],be.prototype,"duration",2);l([c({type:String,reflect:!0})],be.prototype,"countdown",2);l([y()],be.prototype,"remainingTime",2);l([S("open",{waitUntilFirstUpdate:!0})],be.prototype,"handleOpenChange",1);l([S("duration")],be.prototype,"handleDurationChange",1);var vn=be;B("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});B("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});vn.define("sl-alert");var yn=$`
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
`,A=class extends L{constructor(){super(...arguments),this.formControlController=new Zt(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Xe(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top=="number"&&(this.input.scrollTop=e.top),typeof e.left=="number"&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,s="none"){this.input.setSelectionRange(e,t,s)}setRangeText(e,t,s,i="preserve"){const o=t??this.input.selectionStart,r=s??this.input.selectionEnd;this.input.setRangeText(e,o,r,i),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("label"),t=this.hasSlotController.test("help-text"),s=this.label?!0:!!e,i=this.helpText?!0:!!t;return h`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":s,"form-control--has-help-text":i})}
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
            class=${F({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${x(this.name)}
              .value=${vs(this.value)}
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
    `}};A.styles=[N,Ls,yn];l([C(".textarea__control")],A.prototype,"input",2);l([C(".textarea__size-adjuster")],A.prototype,"sizeAdjuster",2);l([y()],A.prototype,"hasFocus",2);l([c()],A.prototype,"title",2);l([c()],A.prototype,"name",2);l([c()],A.prototype,"value",2);l([c({reflect:!0})],A.prototype,"size",2);l([c({type:Boolean,reflect:!0})],A.prototype,"filled",2);l([c()],A.prototype,"label",2);l([c({attribute:"help-text"})],A.prototype,"helpText",2);l([c()],A.prototype,"placeholder",2);l([c({type:Number})],A.prototype,"rows",2);l([c()],A.prototype,"resize",2);l([c({type:Boolean,reflect:!0})],A.prototype,"disabled",2);l([c({type:Boolean,reflect:!0})],A.prototype,"readonly",2);l([c({reflect:!0})],A.prototype,"form",2);l([c({type:Boolean,reflect:!0})],A.prototype,"required",2);l([c({type:Number})],A.prototype,"minlength",2);l([c({type:Number})],A.prototype,"maxlength",2);l([c()],A.prototype,"autocapitalize",2);l([c()],A.prototype,"autocorrect",2);l([c()],A.prototype,"autocomplete",2);l([c({type:Boolean})],A.prototype,"autofocus",2);l([c()],A.prototype,"enterkeyhint",2);l([c({type:Boolean,converter:{fromAttribute:e=>!(!e||e==="false"),toAttribute:e=>e?"true":"false"}})],A.prototype,"spellcheck",2);l([c()],A.prototype,"inputmode",2);l([Si()],A.prototype,"defaultValue",2);l([S("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);l([S("rows",{waitUntilFirstUpdate:!0})],A.prototype,"handleRowsChange",1);l([S("value",{waitUntilFirstUpdate:!0})],A.prototype,"handleValueChange",1);A.define("sl-textarea");var kn=$`
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
`,ie=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=e=>{this.open&&e.key==="Escape"&&(e.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=e=>{var t;if(e.key==="Escape"&&this.open&&!this.closeWatcher){e.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(e.key==="Tab"){if(this.open&&((t=document.activeElement)==null?void 0:t.tagName.toLowerCase())==="sl-menu-item"){e.preventDefault(),this.hide(),this.focusOnTrigger();return}const s=(i,o)=>{if(!i)return null;const r=i.closest(o);if(r)return r;const a=i.getRootNode();return a instanceof ShadowRoot?s(a.host,o):null};setTimeout(()=>{var i;const o=((i=this.containingElement)==null?void 0:i.getRootNode())instanceof ShadowRoot?Yo():document.activeElement;(!this.containingElement||s(o,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=e=>{const t=e.composedPath();this.containingElement&&!t.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=e=>{const t=e.target;!this.stayOpenOnSelect&&t.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const e=this.trigger.assignedElements({flatten:!0})[0];typeof(e==null?void 0:e.focus)=="function"&&e.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(e=>e.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(e){if([" ","Enter"].includes(e.key)){e.preventDefault(),this.handleTriggerClick();return}const t=this.getMenu();if(t){const s=t.getAllItems(),i=s[0],o=s[s.length-1];["ArrowDown","ArrowUp","Home","End"].includes(e.key)&&(e.preventDefault(),this.open||(this.show(),await this.updateComplete),s.length>0&&this.updateComplete.then(()=>{(e.key==="ArrowDown"||e.key==="Home")&&(t.setCurrentItem(i),i.focus()),(e.key==="ArrowUp"||e.key==="End")&&(t.setCurrentItem(o),o.focus())}))}}handleTriggerKeyUp(e){e.key===" "&&e.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const t=this.trigger.assignedElements({flatten:!0}).find(i=>pn(i).start);let s;if(t){switch(t.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":s=t.button;break;default:s=t}s.setAttribute("aria-haspopup","true"),s.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var e;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var e;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(e=this.closeWatcher)==null||e.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await X(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:e,options:t}=q(this,"dropdown.show",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await X(this);const{keyframes:e,options:t}=q(this,"dropdown.hide",{dir:this.localize.dir()});await K(this.popup.popup,e,t),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return h`
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
        class=${F({dropdown:!0,"dropdown--open":this.open})}
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
    `}};ie.styles=[N,kn];ie.dependencies={"sl-popup":D};l([C(".dropdown")],ie.prototype,"popup",2);l([C(".dropdown__trigger")],ie.prototype,"trigger",2);l([C(".dropdown__panel")],ie.prototype,"panel",2);l([c({type:Boolean,reflect:!0})],ie.prototype,"open",2);l([c({reflect:!0})],ie.prototype,"placement",2);l([c({type:Boolean,reflect:!0})],ie.prototype,"disabled",2);l([c({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],ie.prototype,"stayOpenOnSelect",2);l([c({attribute:!1})],ie.prototype,"containingElement",2);l([c({type:Number})],ie.prototype,"distance",2);l([c({type:Number})],ie.prototype,"skidding",2);l([c({type:Boolean})],ie.prototype,"hoist",2);l([c({reflect:!0})],ie.prototype,"sync",2);l([S("open",{waitUntilFirstUpdate:!0})],ie.prototype,"handleOpenChange",1);B("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});B("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});ie.define("sl-dropdown");var wn=$`
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
`,Di=class extends L{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(e){const t=["menuitem","menuitemcheckbox"],s=e.composedPath(),i=s.find(n=>{var u;return t.includes(((u=n==null?void 0:n.getAttribute)==null?void 0:u.call(n,"role"))||"")});if(!i||s.find(n=>{var u;return((u=n==null?void 0:n.getAttribute)==null?void 0:u.call(n,"role"))==="menu"})!==this)return;const a=i;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(e){if(e.key==="Enter"||e.key===" "){const t=this.getCurrentItem();e.preventDefault(),e.stopPropagation(),t==null||t.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){const t=this.getAllItems(),s=this.getCurrentItem();let i=s?t.indexOf(s):0;t.length>0&&(e.preventDefault(),e.stopPropagation(),e.key==="ArrowDown"?i++:e.key==="ArrowUp"?i--:e.key==="Home"?i=0:e.key==="End"&&(i=t.length-1),i<0&&(i=t.length-1),i>t.length-1&&(i=0),this.setCurrentItem(t[i]),t[i].focus())}}handleMouseDown(e){const t=e.target;this.isMenuItem(t)&&this.setCurrentItem(t)}handleSlotChange(){const e=this.getAllItems();e.length>0&&this.setCurrentItem(e[0])}isMenuItem(e){var t;return e.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((t=e.getAttribute("role"))!=null?t:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(e=>!(e.inert||!this.isMenuItem(e)))}getCurrentItem(){return this.getAllItems().find(e=>e.getAttribute("tabindex")==="0")}setCurrentItem(e){this.getAllItems().forEach(s=>{s.setAttribute("tabindex",s===e?"0":"-1")})}render(){return h`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Di.styles=[N,wn];l([C("slot")],Di.prototype,"defaultSlot",2);Di.define("sl-menu");var xn=$`
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
 */const qt=(e,t)=>{var i;const s=e._$AN;if(s===void 0)return!1;for(const o of s)(i=o._$AO)==null||i.call(o,t,!1),qt(o,t);return!0},xs=e=>{let t,s;do{if((t=e._$AM)===void 0)break;s=t._$AN,s.delete(e),e=t}while((s==null?void 0:s.size)===0)},Qo=e=>{for(let t;t=e._$AM;e=t){let s=t._$AN;if(s===void 0)t._$AN=s=new Set;else if(s.has(e))break;s.add(e),$n(t)}};function _n(e){this._$AN!==void 0?(xs(this),this._$AM=e,Qo(this)):this._$AM=e}function Cn(e,t=!1,s=0){const i=this._$AH,o=this._$AN;if(o!==void 0&&o.size!==0)if(t)if(Array.isArray(i))for(let r=s;r<i.length;r++)qt(i[r],!1),xs(i[r]);else i!=null&&(qt(i,!1),xs(i));else qt(this,e)}const $n=e=>{e.type==Ke.CHILD&&(e._$AP??(e._$AP=Cn),e._$AQ??(e._$AQ=_n))};class Tn extends Os{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,s,i){super._$AT(t,s,i),Qo(this),this.isConnected=t._$AU}_$AO(t,s=!0){var i,o;t!==this.isConnected&&(this.isConnected=t,t?(i=this.reconnected)==null||i.call(this):(o=this.disconnected)==null||o.call(this)),s&&(qt(this,t),xs(this))}setValue(t){if(Do(this._$Ct))this._$Ct._$AI(t,this);else{const s=[...this._$Ct._$AH];s[this._$Ci]=t,this._$Ct._$AI(s,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Sn=()=>new En;class En{}const oi=new WeakMap,zn=Is(class extends Tn{render(e){return v}update(e,[t]){var i;const s=t!==this.G;return s&&this.G!==void 0&&this.rt(void 0),(s||this.lt!==this.ct)&&(this.G=t,this.ht=(i=e.options)==null?void 0:i.host,this.rt(this.ct=e.element)),v}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let s=oi.get(t);s===void 0&&(s=new WeakMap,oi.set(t,s)),s.get(this.G)!==void 0&&this.G.call(this.ht,void 0),s.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t;return typeof this.G=="function"?(e=oi.get(this.ht??globalThis))==null?void 0:e.get(this.G):(t=this.G)==null?void 0:t.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var Rn=class{constructor(e,t){this.popupRef=Sn(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=s=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${s.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${s.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=s=>{switch(s.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":s.target!==this.host&&(s.preventDefault(),s.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(s);break}},this.handleClick=s=>{var i;s.target===this.host?(s.preventDefault(),s.stopPropagation()):s.target instanceof Element&&(s.target.tagName==="sl-menu-item"||(i=s.target.role)!=null&&i.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=s=>{s.relatedTarget&&s.relatedTarget instanceof Element&&this.host.contains(s.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=s=>{s.stopPropagation()},this.handlePopupReposition=()=>{const s=this.host.renderRoot.querySelector("slot[name='submenu']"),i=s==null?void 0:s.assignedElements({flatten:!0}).filter(d=>d.localName==="sl-menu")[0],o=getComputedStyle(this.host).direction==="rtl";if(!i)return;const{left:r,top:a,width:n,height:u}=i.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${o?r+n:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${o?r+n:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+u}px`)},(this.host=e).addController(this),this.hasSlotController=t}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(e){const t=this.host.renderRoot.querySelector("slot[name='submenu']");if(!t){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let s=null;for(const i of t.assignedElements())if(s=i.querySelectorAll("sl-menu-item, [role^='menuitem']"),s.length!==0)break;if(!(!s||s.length===0)){s[0].setAttribute("tabindex","0");for(let i=1;i!==s.length;++i)s[i].setAttribute("tabindex","-1");this.popupRef.value&&(e.preventDefault(),e.stopPropagation(),this.popupRef.value.active?s[0]instanceof HTMLElement&&s[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{s[0]instanceof HTMLElement&&s[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(e){this.popupRef.value&&this.popupRef.value.active!==e&&(this.popupRef.value.active=e,this.host.requestUpdate())}enableSubmenu(e=!0){e?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var e;if(!((e=this.host.parentElement)!=null&&e.computedStyleMap))return;const t=this.host.parentElement.computedStyleMap(),i=["padding-top","border-top-width","margin-top"].reduce((o,r)=>{var a;const n=(a=t.get(r))!=null?a:new CSSUnitValue(0,"px"),d=(n instanceof CSSUnitValue?n:new CSSUnitValue(0,"px")).to("px");return o-d.value},0);this.skidding=i}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const e=getComputedStyle(this.host).direction==="rtl";return this.isConnected?h`
      <sl-popup
        ${zn(this.popupRef)}
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
    `:h` <slot name="submenu" hidden></slot> `}},ge=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new Xe(this,"submenu"),this.submenuController=new Rn(this,this.hasSlotController),this.handleHostClick=e=>{this.disabled&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleMouseOver=e=>{this.focus(),e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const e=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=e;return}e!==this.cachedTextLabel&&(this.cachedTextLabel=e,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Fr(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const e=this.localize.dir()==="rtl",t=this.submenuController.isExpanded();return h`
      <div
        id="anchor"
        part="base"
        class=${F({"menu-item":!0,"menu-item--rtl":e,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":t})}
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
    `}};ge.styles=[N,xn];ge.dependencies={"sl-icon":Q,"sl-popup":D,"sl-spinner":As};l([C("slot:not([name])")],ge.prototype,"defaultSlot",2);l([C(".menu-item")],ge.prototype,"menuItem",2);l([c()],ge.prototype,"type",2);l([c({type:Boolean,reflect:!0})],ge.prototype,"checked",2);l([c()],ge.prototype,"value",2);l([c({type:Boolean,reflect:!0})],ge.prototype,"loading",2);l([c({type:Boolean,reflect:!0})],ge.prototype,"disabled",2);l([S("checked")],ge.prototype,"handleCheckedChange",1);l([S("disabled")],ge.prototype,"handleDisabledChange",1);l([S("type")],ge.prototype,"handleTypeChange",1);ge.define("sl-menu-item");Q.define("sl-icon");var An=$`
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
`,Ns=class extends L{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Ns.styles=[N,An];l([c({type:Boolean,reflect:!0})],Ns.prototype,"vertical",2);l([S("vertical")],Ns.prototype,"handleVerticalChange",1);Ns.define("sl-divider");var In=$`
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
`,J=class extends L{constructor(){super(),this.localize=new se(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=e=>{e.key==="Escape"&&(e.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const e=lo(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),e)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const e=lo(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),e)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(e){return this.trigger.split(" ").includes(e)}async handleOpenChange(){var e,t;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await X(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:s,options:i}=q(this,"tooltip.show",{dir:this.localize.dir()});await K(this.popup.popup,s,i),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await X(this.body);const{keyframes:s,options:i}=q(this,"tooltip.hide",{dir:this.localize.dir()});await K(this.popup.popup,s,i),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ce(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ce(this,"sl-after-hide")}render(){return h`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${F({tooltip:!0,"tooltip--open":this.open})}
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
    `}};J.styles=[N,In];J.dependencies={"sl-popup":D};l([C("slot:not([name])")],J.prototype,"defaultSlot",2);l([C(".tooltip__body")],J.prototype,"body",2);l([C("sl-popup")],J.prototype,"popup",2);l([c()],J.prototype,"content",2);l([c()],J.prototype,"placement",2);l([c({type:Boolean,reflect:!0})],J.prototype,"disabled",2);l([c({type:Number})],J.prototype,"distance",2);l([c({type:Boolean,reflect:!0})],J.prototype,"open",2);l([c({type:Number})],J.prototype,"skidding",2);l([c()],J.prototype,"trigger",2);l([c({type:Boolean})],J.prototype,"hoist",2);l([S("open",{waitUntilFirstUpdate:!0})],J.prototype,"handleOpenChange",1);l([S(["content","distance","hoist","placement","skidding"])],J.prototype,"handleOptionsChange",1);l([S("disabled")],J.prototype,"handleDisabledChange",1);B("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});B("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});J.define("sl-tooltip");var On=$`
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
`,Z=class extends L{constructor(){super(...arguments),this.formControlController=new Zt(this,{value:e=>e.checked?e.value||"on":void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new Xe(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){const e=this.hasSlotController.test("help-text"),t=this.helpText?!0:!!e;return h`
      <div
        class=${F({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${F({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${x(this.value)}
            .indeterminate=${vs(this.indeterminate)}
            .checked=${vs(this.checked)}
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
    `}};Z.styles=[N,Ls,On];Z.dependencies={"sl-icon":Q};l([C('input[type="checkbox"]')],Z.prototype,"input",2);l([y()],Z.prototype,"hasFocus",2);l([c()],Z.prototype,"title",2);l([c()],Z.prototype,"name",2);l([c()],Z.prototype,"value",2);l([c({reflect:!0})],Z.prototype,"size",2);l([c({type:Boolean,reflect:!0})],Z.prototype,"disabled",2);l([c({type:Boolean,reflect:!0})],Z.prototype,"checked",2);l([c({type:Boolean,reflect:!0})],Z.prototype,"indeterminate",2);l([Si("checked")],Z.prototype,"defaultChecked",2);l([c({reflect:!0})],Z.prototype,"form",2);l([c({type:Boolean,reflect:!0})],Z.prototype,"required",2);l([c({attribute:"help-text"})],Z.prototype,"helpText",2);l([S("disabled",{waitUntilFirstUpdate:!0})],Z.prototype,"handleDisabledChange",1);l([S(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],Z.prototype,"handleStateChange",1);Z.define("sl-checkbox");var Ln=$`
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
`,Pn=$`
  :host {
    display: contents;
  }
`,Hs=class extends L{constructor(){super(...arguments),this.observedElements=[],this.disabled=!1}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(e=>{this.emit("sl-resize",{detail:{entries:e}})}),this.disabled||this.startObserver()}disconnectedCallback(){super.disconnectedCallback(),this.stopObserver()}handleSlotChange(){this.disabled||this.startObserver()}startObserver(){const e=this.shadowRoot.querySelector("slot");if(e!==null){const t=e.assignedElements({flatten:!0});this.observedElements.forEach(s=>this.resizeObserver.unobserve(s)),this.observedElements=[],t.forEach(s=>{this.resizeObserver.observe(s),this.observedElements.push(s)})}}stopObserver(){this.resizeObserver.disconnect()}handleDisabledChange(){this.disabled?this.stopObserver():this.startObserver()}render(){return h` <slot @slotchange=${this.handleSlotChange}></slot> `}};Hs.styles=[N,Pn];l([c({type:Boolean,reflect:!0})],Hs.prototype,"disabled",2);l([S("disabled",{waitUntilFirstUpdate:!0})],Hs.prototype,"handleDisabledChange",1);var ee=class extends L{constructor(){super(...arguments),this.tabs=[],this.focusableTabs=[],this.panels=[],this.localize=new se(this),this.hasScrollControls=!1,this.shouldHideScrollStartButton=!1,this.shouldHideScrollEndButton=!1,this.placement="top",this.activation="auto",this.noScrollControls=!1,this.fixedScrollControls=!1,this.scrollOffset=1}connectedCallback(){const e=Promise.all([customElements.whenDefined("sl-tab"),customElements.whenDefined("sl-tab-panel")]);super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>{this.repositionIndicator(),this.updateScrollControls()}),this.mutationObserver=new MutationObserver(t=>{const s=t.filter(({target:i})=>{if(i===this)return!0;if(i.closest("sl-tab-group")!==this)return!1;const o=i.tagName.toLowerCase();return o==="sl-tab"||o==="sl-tab-panel"});if(s.length!==0){if(s.some(i=>!["aria-labelledby","aria-controls"].includes(i.attributeName))&&setTimeout(()=>this.setAriaLabels()),s.some(i=>i.attributeName==="disabled"))this.syncTabsAndPanels();else if(s.some(i=>i.attributeName==="active")){const o=s.filter(r=>r.attributeName==="active"&&r.target.tagName.toLowerCase()==="sl-tab").map(r=>r.target).find(r=>r.active);o&&this.setActiveTab(o)}}}),this.updateComplete.then(()=>{this.syncTabsAndPanels(),this.mutationObserver.observe(this,{attributes:!0,attributeFilter:["active","disabled","name","panel"],childList:!0,subtree:!0}),this.resizeObserver.observe(this.nav),e.then(()=>{new IntersectionObserver((s,i)=>{var o;s[0].intersectionRatio>0&&(this.setAriaLabels(),this.setActiveTab((o=this.getActiveTab())!=null?o:this.tabs[0],{emitEvents:!1}),i.unobserve(s[0].target))}).observe(this.tabGroup)})})}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mutationObserver)==null||e.disconnect(),this.nav&&((t=this.resizeObserver)==null||t.unobserve(this.nav))}getAllTabs(){return this.shadowRoot.querySelector('slot[name="nav"]').assignedElements()}getAllPanels(){return[...this.body.assignedElements()].filter(e=>e.tagName.toLowerCase()==="sl-tab-panel")}getActiveTab(){return this.tabs.find(e=>e.active)}handleClick(e){const s=e.target.closest("sl-tab");(s==null?void 0:s.closest("sl-tab-group"))===this&&s!==null&&this.setActiveTab(s,{scrollBehavior:"smooth"})}handleKeyDown(e){const s=e.target.closest("sl-tab");if((s==null?void 0:s.closest("sl-tab-group"))===this&&(["Enter"," "].includes(e.key)&&s!==null&&(this.setActiveTab(s,{scrollBehavior:"smooth"}),e.preventDefault()),["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))){const o=this.tabs.find(n=>n.matches(":focus")),r=this.localize.dir()==="rtl";let a=null;if((o==null?void 0:o.tagName.toLowerCase())==="sl-tab"){if(e.key==="Home")a=this.focusableTabs[0];else if(e.key==="End")a=this.focusableTabs[this.focusableTabs.length-1];else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowRight":"ArrowLeft")||["start","end"].includes(this.placement)&&e.key==="ArrowUp"){const n=this.tabs.findIndex(u=>u===o);a=this.findNextFocusableTab(n,"backward")}else if(["top","bottom"].includes(this.placement)&&e.key===(r?"ArrowLeft":"ArrowRight")||["start","end"].includes(this.placement)&&e.key==="ArrowDown"){const n=this.tabs.findIndex(u=>u===o);a=this.findNextFocusableTab(n,"forward")}if(!a)return;a.tabIndex=0,a.focus({preventScroll:!0}),this.activation==="auto"?this.setActiveTab(a,{scrollBehavior:"smooth"}):this.tabs.forEach(n=>{n.tabIndex=n===a?0:-1}),["top","bottom"].includes(this.placement)&&hi(a,this.nav,"horizontal"),e.preventDefault()}}}handleScrollToStart(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft+this.nav.clientWidth:this.nav.scrollLeft-this.nav.clientWidth,behavior:"smooth"})}handleScrollToEnd(){this.nav.scroll({left:this.localize.dir()==="rtl"?this.nav.scrollLeft-this.nav.clientWidth:this.nav.scrollLeft+this.nav.clientWidth,behavior:"smooth"})}setActiveTab(e,t){if(t=Ye({emitEvents:!0,scrollBehavior:"auto"},t),e!==this.activeTab&&!e.disabled){const s=this.activeTab;this.activeTab=e,this.tabs.forEach(i=>{i.active=i===this.activeTab,i.tabIndex=i===this.activeTab?0:-1}),this.panels.forEach(i=>{var o;return i.active=i.name===((o=this.activeTab)==null?void 0:o.panel)}),this.syncIndicator(),["top","bottom"].includes(this.placement)&&hi(this.activeTab,this.nav,"horizontal",t.scrollBehavior),t.emitEvents&&(s&&this.emit("sl-tab-hide",{detail:{name:s.panel}}),this.emit("sl-tab-show",{detail:{name:this.activeTab.panel}}))}}setAriaLabels(){this.tabs.forEach(e=>{const t=this.panels.find(s=>s.name===e.panel);t&&(e.setAttribute("aria-controls",t.getAttribute("id")),t.setAttribute("aria-labelledby",e.getAttribute("id")))})}repositionIndicator(){const e=this.getActiveTab();if(!e)return;const t=e.clientWidth,s=e.clientHeight,i=this.localize.dir()==="rtl",o=this.getAllTabs(),a=o.slice(0,o.indexOf(e)).reduce((n,u)=>({left:n.left+u.clientWidth,top:n.top+u.clientHeight}),{left:0,top:0});switch(this.placement){case"top":case"bottom":this.indicator.style.width=`${t}px`,this.indicator.style.height="auto",this.indicator.style.translate=i?`${-1*a.left}px`:`${a.left}px`;break;case"start":case"end":this.indicator.style.width="auto",this.indicator.style.height=`${s}px`,this.indicator.style.translate=`0 ${a.top}px`;break}}syncTabsAndPanels(){this.tabs=this.getAllTabs(),this.focusableTabs=this.tabs.filter(e=>!e.disabled),this.panels=this.getAllPanels(),this.syncIndicator(),this.updateComplete.then(()=>this.updateScrollControls())}findNextFocusableTab(e,t){let s=null;const i=t==="forward"?1:-1;let o=e+i;for(;e<this.tabs.length;){if(s=this.tabs[o]||null,s===null){t==="forward"?s=this.focusableTabs[0]:s=this.focusableTabs[this.focusableTabs.length-1];break}if(!s.disabled)break;o+=i}return s}updateScrollButtons(){this.hasScrollControls&&!this.fixedScrollControls&&(this.shouldHideScrollStartButton=this.scrollFromStart()<=this.scrollOffset,this.shouldHideScrollEndButton=this.isScrolledToEnd())}isScrolledToEnd(){return this.scrollFromStart()+this.nav.clientWidth>=this.nav.scrollWidth-this.scrollOffset}scrollFromStart(){return this.localize.dir()==="rtl"?-this.nav.scrollLeft:this.nav.scrollLeft}updateScrollControls(){this.noScrollControls?this.hasScrollControls=!1:this.hasScrollControls=["top","bottom"].includes(this.placement)&&this.nav.scrollWidth>this.nav.clientWidth+1,this.updateScrollButtons()}syncIndicator(){this.getActiveTab()?(this.indicator.style.display="block",this.repositionIndicator()):this.indicator.style.display="none"}show(e){const t=this.tabs.find(s=>s.panel===e);t&&this.setActiveTab(t,{scrollBehavior:"smooth"})}render(){const e=this.localize.dir()==="rtl";return h`
      <div
        part="base"
        class=${F({"tab-group":!0,"tab-group--top":this.placement==="top","tab-group--bottom":this.placement==="bottom","tab-group--start":this.placement==="start","tab-group--end":this.placement==="end","tab-group--rtl":this.localize.dir()==="rtl","tab-group--has-scroll-controls":this.hasScrollControls})}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="tab-group__nav-container" part="nav">
          ${this.hasScrollControls?h`
                <sl-icon-button
                  part="scroll-button scroll-button--start"
                  exportparts="base:scroll-button__base"
                  class=${F({"tab-group__scroll-button":!0,"tab-group__scroll-button--start":!0,"tab-group__scroll-button--start--hidden":this.shouldHideScrollStartButton})}
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
                  class=${F({"tab-group__scroll-button":!0,"tab-group__scroll-button--end":!0,"tab-group__scroll-button--end--hidden":this.shouldHideScrollEndButton})}
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
    `}};ee.styles=[N,Ln];ee.dependencies={"sl-icon-button":Y,"sl-resize-observer":Hs};l([C(".tab-group")],ee.prototype,"tabGroup",2);l([C(".tab-group__body")],ee.prototype,"body",2);l([C(".tab-group__nav")],ee.prototype,"nav",2);l([C(".tab-group__indicator")],ee.prototype,"indicator",2);l([y()],ee.prototype,"hasScrollControls",2);l([y()],ee.prototype,"shouldHideScrollStartButton",2);l([y()],ee.prototype,"shouldHideScrollEndButton",2);l([c()],ee.prototype,"placement",2);l([c()],ee.prototype,"activation",2);l([c({attribute:"no-scroll-controls",type:Boolean})],ee.prototype,"noScrollControls",2);l([c({attribute:"fixed-scroll-controls",type:Boolean})],ee.prototype,"fixedScrollControls",2);l([Dr({passive:!0})],ee.prototype,"updateScrollButtons",1);l([S("noScrollControls",{waitUntilFirstUpdate:!0})],ee.prototype,"updateScrollControls",1);l([S("placement",{waitUntilFirstUpdate:!0})],ee.prototype,"syncIndicator",1);ee.define("sl-tab-group");var Dn=(e,t)=>{let s=0;return function(...i){window.clearTimeout(s),s=window.setTimeout(()=>{e.call(this,...i)},t)}},po=(e,t,s)=>{const i=e[t];e[t]=function(...o){i.call(this,...o),s.call(this,i,...o)}};(()=>{if(typeof window>"u")return;if(!("onscrollend"in window)){const t=new Set,s=new WeakMap,i=r=>{for(const a of r.changedTouches)t.add(a.identifier)},o=r=>{for(const a of r.changedTouches)t.delete(a.identifier)};document.addEventListener("touchstart",i,!0),document.addEventListener("touchend",o,!0),document.addEventListener("touchcancel",o,!0),po(EventTarget.prototype,"addEventListener",function(r,a){if(a!=="scrollend")return;const n=Dn(()=>{t.size?n():this.dispatchEvent(new Event("scrollend"))},100);r.call(this,"scroll",n,{passive:!0}),s.set(this,n)}),po(EventTarget.prototype,"removeEventListener",function(r,a){if(a!=="scrollend")return;const n=s.get(this);n&&r.call(this,"scroll",n,{passive:!0})})}})();var Mn=$`
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
`,Fn=0,Ie=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.attrId=++Fn,this.componentId=`sl-tab-${this.attrId}`,this.panel="",this.active=!1,this.closable=!1,this.disabled=!1,this.tabIndex=0}connectedCallback(){super.connectedCallback(),this.setAttribute("role","tab")}handleCloseClick(e){e.stopPropagation(),this.emit("sl-close")}handleActiveChange(){this.setAttribute("aria-selected",this.active?"true":"false")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false"),this.disabled&&!this.active?this.tabIndex=-1:this.tabIndex=0}render(){return this.id=this.id.length>0?this.id:this.componentId,h`
      <div
        part="base"
        class=${F({tab:!0,"tab--active":this.active,"tab--closable":this.closable,"tab--disabled":this.disabled})}
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
    `}};Ie.styles=[N,Mn];Ie.dependencies={"sl-icon-button":Y};l([C(".tab")],Ie.prototype,"tab",2);l([c({reflect:!0})],Ie.prototype,"panel",2);l([c({type:Boolean,reflect:!0})],Ie.prototype,"active",2);l([c({type:Boolean,reflect:!0})],Ie.prototype,"closable",2);l([c({type:Boolean,reflect:!0})],Ie.prototype,"disabled",2);l([c({type:Number,reflect:!0})],Ie.prototype,"tabIndex",2);l([S("active")],Ie.prototype,"handleActiveChange",1);l([S("disabled")],Ie.prototype,"handleDisabledChange",1);Ie.define("sl-tab");var Bn=$`
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
`,Nn=0,es=class extends L{constructor(){super(...arguments),this.attrId=++Nn,this.componentId=`sl-tab-panel-${this.attrId}`,this.name="",this.active=!1}connectedCallback(){super.connectedCallback(),this.id=this.id.length>0?this.id:this.componentId,this.setAttribute("role","tabpanel")}handleActiveChange(){this.setAttribute("aria-hidden",this.active?"false":"true")}render(){return h`
      <slot
        part="base"
        class=${F({"tab-panel":!0,"tab-panel--active":this.active})}
      ></slot>
    `}};es.styles=[N,Bn];l([c({reflect:!0})],es.prototype,"name",2);l([c({type:Boolean,reflect:!0})],es.prototype,"active",2);l([S("active")],es.prototype,"handleActiveChange",1);es.define("sl-tab-panel");As.define("sl-spinner");Y.define("sl-icon-button");var Hn=$`
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
`,Oe=class extends L{constructor(){super(...arguments),this.localize=new se(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?"auto":"0",this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="open"&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key==="ArrowUp"||e.key==="ArrowLeft")&&(e.preventDefault(),this.hide()),(e.key==="ArrowDown"||e.key==="ArrowRight")&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit("sl-show",{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await X(this.body);const{keyframes:t,options:s}=q(this,"details.show",{dir:this.localize.dir()});await K(this.body,co(t,this.body.scrollHeight),s),this.body.style.height="auto",this.emit("sl-after-show")}else{if(this.emit("sl-hide",{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await X(this.body);const{keyframes:t,options:s}=q(this,"details.hide",{dir:this.localize.dir()});await K(this.body,co(t,this.body.scrollHeight),s),this.body.style.height="auto",this.details.open=!1,this.emit("sl-after-hide")}}async show(){if(!(this.open||this.disabled))return this.open=!0,ce(this,"sl-after-show")}async hide(){if(!(!this.open||this.disabled))return this.open=!1,ce(this,"sl-after-hide")}render(){const e=this.localize.dir()==="rtl";return h`
      <details
        part="base"
        class=${F({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
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
    `}};Oe.styles=[N,Hn];Oe.dependencies={"sl-icon":Q};l([C(".details")],Oe.prototype,"details",2);l([C(".details__header")],Oe.prototype,"header",2);l([C(".details__body")],Oe.prototype,"body",2);l([C(".details__expand-icon-slot")],Oe.prototype,"expandIconSlot",2);l([c({type:Boolean,reflect:!0})],Oe.prototype,"open",2);l([c()],Oe.prototype,"summary",2);l([c({type:Boolean,reflect:!0})],Oe.prototype,"disabled",2);l([S("open",{waitUntilFirstUpdate:!0})],Oe.prototype,"handleOpenChange",1);B("details.show",{keyframes:[{height:"0",opacity:"0"},{height:"auto",opacity:"1"}],options:{duration:250,easing:"linear"}});B("details.hide",{keyframes:[{height:"auto",opacity:"1"},{height:"0",opacity:"0"}],options:{duration:250,easing:"linear"}});Oe.define("sl-details");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let jn=class extends Event{constructor(t,s,i,o){super("context-request",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=s,this.callback=i,this.subscribe=o??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Un{get value(){return this.o}set value(t){this.setValue(t)}setValue(t,s=!1){const i=s||!Object.is(t,this.o);this.o=t,i&&this.updateObservers()}constructor(t){this.subscriptions=new Map,this.updateObservers=()=>{for(const[s,{disposer:i}]of this.subscriptions)s(this.o,i)},t!==void 0&&(this.value=t)}addCallback(t,s,i){if(!i)return void t(this.value);this.subscriptions.has(t)||this.subscriptions.set(t,{disposer:()=>{this.subscriptions.delete(t)},consumerHost:s});const{disposer:o}=this.subscriptions.get(t);t(this.value,o)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Vn=class extends Event{constructor(t,s){super("context-provider",{bubbles:!0,composed:!0}),this.context=t,this.contextTarget=s}};class mo extends Un{constructor(t,s,i){var o,r;super(s.context!==void 0?s.initialValue:i),this.onContextRequest=a=>{if(a.context!==this.context)return;const n=a.contextTarget??a.composedPath()[0];n!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,n,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const n=new Set;for(const[u,{consumerHost:d}]of this.subscriptions)n.has(u)||(n.add(u),d.dispatchEvent(new jn(this.context,d,u,!0)));a.stopPropagation()},this.host=t,s.context!==void 0?this.context=s.context:this.context=s,this.attachListeners(),(r=(o=this.host).addController)==null||r.call(o,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Vn(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Wn({context:e}){return(t,s)=>{const i=new WeakMap;if(typeof s=="object")return{get(){return t.get.call(this)},set(o){return i.get(this).setValue(o),t.set.call(this,o)},init(o){return i.set(this,new mo(this,{context:e,initialValue:o})),o}};{t.constructor.addInitializer(a=>{i.set(a,new mo(a,{context:e}))});const o=Object.getOwnPropertyDescriptor(t,s);let r;if(o===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(n){i.get(this).setValue(n),a.set(this,n)},configurable:!0,enumerable:!0}}else{const a=o.set;r={...o,set(n){i.get(this).setValue(n),a==null||a.call(this,n)}}}return void Object.defineProperty(t,s,r)}}}var ae={},js={};Object.defineProperty(js,"__esModule",{value:!0});js.StoreController=void 0;class qn{constructor(t,s){this.host=t,this.atom=s,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;(t=this.unsubscribe)===null||t===void 0||t.call(this)}get value(){return this.atom.get()}}js.StoreController=qn;var Rt={};Object.defineProperty(Rt,"__esModule",{value:!0});Rt.MultiStoreController=void 0;class Kn{constructor(t,s){this.host=t,this.atoms=s,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;(t=this.unsubscribes)===null||t===void 0||t.forEach(s=>s())}get values(){return this.atoms.map(t=>t.get())}}Rt.MultiStoreController=Kn;var Us={};Object.defineProperty(Us,"__esModule",{value:!0});Us.useStores=void 0;const Gn=Rt;function Yn(...e){return t=>class extends t{constructor(...s){super(...s),new Gn.MultiStoreController(this,e)}}}Us.useStores=Yn;var Vs={};Object.defineProperty(Vs,"__esModule",{value:!0});Vs.withStores=void 0;const Xn=Rt,Zn=(e,t)=>class extends e{constructor(...i){super(...i),new Xn.MultiStoreController(this,t)}};Vs.withStores=Zn;(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.withStores=e.useStores=e.MultiStoreController=e.StoreController=void 0;var t=js;Object.defineProperty(e,"StoreController",{enumerable:!0,get:function(){return t.StoreController}});var s=Rt;Object.defineProperty(e,"MultiStoreController",{enumerable:!0,get:function(){return s.MultiStoreController}});var i=Us;Object.defineProperty(e,"useStores",{enumerable:!0,get:function(){return i.useStores}});var o=Vs;Object.defineProperty(e,"withStores",{enumerable:!0,get:function(){return o.withStores}})})(ae);const Qn=Symbol("board"),Jn={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};let Te=[],et=0;const ns=4;let fs=0;const _e=e=>{let t=[],s={get(){return s.lc||s.listen(()=>{})(),s.value},lc:0,listen(i){return s.lc=t.push(i),()=>{for(let r=et+ns;r<Te.length;)Te[r]===i?Te.splice(r,ns):r+=ns;let o=t.indexOf(i);~o&&(t.splice(o,1),--s.lc||s.off())}},notify(i,o){fs++;let r=!Te.length;for(let a of t)Te.push(a,s.value,i,o);if(r){for(et=0;et<Te.length;et+=ns)Te[et](Te[et+1],Te[et+2],Te[et+3]);Te.length=0}},off(){},set(i){let o=s.value;o!==i&&(s.value=i,s.notify(o))},subscribe(i){let o=s.listen(i);return i(s.value),o},value:e};return s},el=5,ls=6,cs=10;let tl=(e,t,s,i)=>(e.events=e.events||{},e.events[s+cs]||(e.events[s+cs]=i(o=>{e.events[s].reduceRight((r,a)=>(a(r),r),{shared:{},...o})})),e.events[s]=e.events[s]||[],e.events[s].push(t),()=>{let o=e.events[s],r=o.indexOf(t);o.splice(r,1),o.length||(delete e.events[s],e.events[s+cs](),delete e.events[s+cs])}),sl=1e3,il=(e,t)=>tl(e,i=>{let o=t(i);o&&e.events[ls].push(o)},el,i=>{let o=e.listen;e.listen=(...a)=>(!e.lc&&!e.active&&(e.active=!0,i()),o(...a));let r=e.off;return e.events[ls]=[],e.off=()=>{r(),setTimeout(()=>{if(e.active&&!e.lc){e.active=!1;for(let a of e.events[ls])a();e.events[ls]=[]}},sl)},()=>{e.listen=o,e.off=r}}),ol=(e,t,s)=>{Array.isArray(e)||(e=[e]);let i,o,r=()=>{if(o===fs)return;o=fs;let d=e.map(p=>p.get());if(!i||d.some((p,f)=>p!==i[f])){i=d;let p=t(...d);p&&p.then&&p.t?p.then(f=>{i===d&&a.set(f)}):(a.set(p),o=fs)}},a=_e(void 0),n=a.get;a.get=()=>(r(),n());let u=r;return il(a,()=>{let d=e.map(p=>p.listen(u));return r(),()=>{for(let p of d)p()}}),a};const yt=(e,t)=>ol(e,t),rl=(e={})=>{let t=_e(e);return t.setKey=function(s,i){let o=t.value;typeof i>"u"&&s in t.value?(t.value={...t.value},delete t.value[s],t.notify(o,s)):t.value[s]!==i&&(t.value={...t.value,[s]:i},t.notify(o,s))},t},ot=_e(!1),_s=_e(null),Ws=_e(!0),al=_e(!1),nl=yt([ot,Ws],(e,t)=>e&&!t);function ri(e){_s.set(e),ot.set(!0)}function ll(){ot.set(!1),_s.set(null),Ws.set(!0)}function cl(e){Ws.set(e)}function fo(e){al.set(e)}class dl extends Error{constructor(t,s,i){super(t),this.status=s,this.body=i,this.name="ApiError"}}function Mi(e){if(!e)return[];const t=[],s=e.split(`
`);for(const i of s){const o=i.trim();if(!o)continue;const r={text:o};if(o.length>=18&&o[4]==="-"&&o[7]==="-"&&o[10]===" "&&o[13]===":"){const a=o.indexOf(" - ",16);if(a!==-1){r.timestamp=o.slice(0,16);let n=o.slice(a+3);if(n.startsWith("(from: ")){const u=n.indexOf(") ");u!==-1?(r.author=n.slice(7,u),r.text=n.slice(u+2)):r.text=n}else r.text=n}}t.push(r)}return t}const Ae=rl({}),Cs=_e(null),Jo=_e(""),ts=_e(!0),qs=_e(null),ul=yt(Ae,e=>Object.values(e)),hl=yt(Ae,e=>{const t=Date.now()-432e5;return Object.values(e).filter(s=>s.type!=="epic"?!1:s.status!=="closed"?!0:s.closed_at?new Date(s.closed_at).getTime()>t:!1).map(s=>({id:s.id,title:s.title}))}),Ks=yt([Ae,Cs],(e,t)=>t&&e[t]||null),pl=yt(Ks,e=>e?Mi(e.notes):[]),ml=yt([Ae,Ks],(e,t)=>{var s;return(s=t==null?void 0:t.blocked_by)!=null&&s.length?t.blocked_by.map(i=>{const o=e[i];return o?{id:o.id,title:o.title,status:o.status}:null}).filter(i=>i!==null):[]}),fl=yt([Ae,Ks],(e,t)=>{if(!(t!=null&&t.parent))return"";const s=e[t.parent];return(s==null?void 0:s.title)||""});function bl(e,t){return e.status==="closed"||!e.blocked_by||e.blocked_by.length===0?!1:e.blocked_by.some(s=>{const i=t[s];return i?i.status!=="closed":!1})}function $s(e,t={}){const s=bl(e,t);let i;return e.status==="closed"?i="done":s?i="blocked":e.awaiting?i="human":e.status==="in_progress"?i="agent":i="ready",{...e,is_blocked:s,column:i}}function gl(e){const t={};for(const i of e)t[i.id]=i;const s={};for(const i of e)s[i.id]=$s(i,t);Ae.set(s),ts.set(!1),qs.set(null)}function vl(e){const t={};for(const[i,o]of e)t[i]=o;const s={};for(const[i,o]of e)s[i]=$s(o,t);Ae.set(s),ts.set(!1),qs.set(null)}function bs(e){var a;const t=Ae.get(),s={};for(const[n,u]of Object.entries(t))s[n]=u;s[e.id]=e;const i=$s(e,s),o={...t};o[e.id]=i;const r=t[e.id];if((r==null?void 0:r.status)!==e.status)for(const[n,u]of Object.entries(t))n!==e.id&&(a=u.blocked_by)!=null&&a.includes(e.id)&&(o[n]=$s(u,s));Ae.set(o)}function yl(e){const t=Ae.get(),{[e]:s,...i}=t;Ae.set(i),Cs.get()===e&&Cs.set(null)}function Nt(e){Cs.set(e)}function er(e){Jo.set(e)}function Ts(e){ts.set(e)}function Yt(e){qs.set(e),ts.set(!1)}class kl extends Error{constructor(t="Cannot write: local agent is offline"){super(t),this.name="ReadOnlyError"}}class ht extends Error{constructor(t){super(t),this.name="ConnectionError"}}const wl="",bo=1e3,xl=3e4;class _l{constructor(t=wl){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.eventSource=null,this.runEventSources=new Map,this.reconnectDelay=bo,this.reconnectTimeout=null,this.connected=!1,this.baseUrl=t}async connect(){return this.disconnectMainSSE(),new Promise((t,s)=>{try{this.eventSource=new EventSource(`${this.baseUrl}/api/events`),this.eventSource.addEventListener("connected",()=>{this.connected=!0,this.reconnectDelay=bo,console.log("[LocalComms] Connected to SSE"),this.emitConnection({type:"connection:connected"}),t()}),this.eventSource.addEventListener("update",i=>{this.handleUpdateEvent(i)}),this.eventSource.onerror=()=>{var o;console.log("[LocalComms] SSE connection error");const i=this.connected;this.connected=!1,i&&this.emitConnection({type:"connection:disconnected"}),(o=this.eventSource)==null||o.close(),this.eventSource=null,this.scheduleReconnect(),i||s(new ht("Failed to connect to SSE endpoint"))}}catch(i){s(new ht(`Failed to create EventSource: ${i}`))}})}disconnect(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.disconnectMainSSE();for(const[t,s]of this.runEventSources)s.close(),console.log(`[LocalComms] Closed run stream for epic ${t}`);this.runEventSources.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}disconnectMainSSE(){this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`),this.connect().catch(t=>{console.error("[LocalComms] Reconnect failed:",t)})},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,xl)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){if(this.runEventSources.has(t))return console.log(`[LocalComms] Already subscribed to run stream for ${t}`),()=>this.unsubscribeRun(t);const s=new EventSource(`${this.baseUrl}/api/run-stream/${t}`);return this.runEventSources.set(t,s),s.addEventListener("connected",()=>{console.log(`[LocalComms] Run stream connected for ${t}`),this.emitConnection({type:"connection:connected",epicId:t})}),s.addEventListener("task-started",i=>{this.handleRunEvent(t,"task-started",i)}),s.addEventListener("task-update",i=>{this.handleRunEvent(t,"task-update",i)}),s.addEventListener("tool-activity",i=>{this.handleRunEvent(t,"tool-activity",i)}),s.addEventListener("task-completed",i=>{this.handleRunEvent(t,"task-completed",i)}),s.addEventListener("epic-started",i=>{this.handleRunEvent(t,"epic-started",i)}),s.addEventListener("epic-completed",i=>{this.handleRunEvent(t,"epic-completed",i)}),s.addEventListener("context-generating",i=>{this.handleContextEvent(t,"context:generating",i)}),s.addEventListener("context-generated",i=>{this.handleContextEvent(t,"context:generated",i)}),s.addEventListener("context-loaded",i=>{this.handleContextEvent(t,"context:loaded",i)}),s.addEventListener("context-failed",i=>{this.handleContextEvent(t,"context:failed",i)}),s.addEventListener("context-skipped",i=>{this.handleContextEvent(t,"context:skipped",i)}),s.onerror=()=>{console.log(`[LocalComms] Run stream error for ${t}`),s.close(),this.runEventSources.delete(t)},()=>this.unsubscribeRun(t)}unsubscribeRun(t){const s=this.runEventSources.get(t);s&&(s.close(),this.runEventSources.delete(t),console.log(`[LocalComms] Unsubscribed from run stream for ${t}`))}async createTick(t){const s=await fetch(`${this.baseUrl}/api/ticks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!s.ok)throw new Error(`Failed to create tick: ${s.statusText}`);return s.json()}async updateTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!i.ok)throw new Error(`Failed to update tick: ${i.statusText}`);return i.json()}async deleteTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}`,{method:"DELETE"});if(!s.ok)throw new Error(`Failed to delete tick: ${s.statusText}`)}async addNote(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:s})});if(!i.ok)throw new Error(`Failed to add note: ${i.statusText}`);return i.json()}async approveTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/approve`,{method:"POST"});if(!s.ok)throw new Error(`Failed to approve tick: ${s.statusText}`);return s.json()}async rejectTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:s})});if(!i.ok)throw new Error(`Failed to reject tick: ${i.statusText}`);return i.json()}async closeTick(t,s){const i=await fetch(`${this.baseUrl}/api/ticks/${t}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:s})});if(!i.ok)throw new Error(`Failed to close tick: ${i.statusText}`);return i.json()}async reopenTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}/reopen`,{method:"POST"});if(!s.ok)throw new Error(`Failed to reopen tick: ${s.statusText}`);return s.json()}async fetchTicks(){const t=await fetch(`${this.baseUrl}/api/ticks`);if(!t.ok)throw new Error(`Failed to fetch ticks: ${t.statusText}`);return(await t.json()).ticks.map(i=>({...i,is_blocked:i.isBlocked,verification_status:i.verificationStatus}))}async fetchInfo(){const t=await fetch(`${this.baseUrl}/api/info`);if(!t.ok)throw new Error(`Failed to fetch info: ${t.statusText}`);return t.json()}async fetchTick(t){const s=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!s.ok)throw new Error(`Failed to fetch tick: ${s.statusText}`);return s.json()}async fetchActivity(t){const s=t!==void 0?`${this.baseUrl}/api/activity?limit=${t}`:`${this.baseUrl}/api/activity`,i=await fetch(s);if(!i.ok)throw new Error(`Failed to fetch activity: ${i.statusText}`);return(await i.json()).activities}async fetchRecord(t){const s=await fetch(`${this.baseUrl}/api/records/${t}`);if(s.status===404)return null;if(!s.ok)throw new Error(`Failed to fetch record: ${s.statusText}`);return s.json()}async fetchRunStatus(t){const s=await fetch(`${this.baseUrl}/api/run-status/${t}`);if(!s.ok)throw new Error(`Failed to fetch run status: ${s.statusText}`);return s.json()}async fetchContext(t){const s=await fetch(`${this.baseUrl}/api/context/${t}`);if(s.status===404)return null;if(!s.ok)throw new Error(`Failed to fetch context: ${s.statusText}`);return s.text()}isConnected(){return this.connected}isReadOnly(){return!1}getConnectionInfo(){return{mode:"local",connected:this.connected,baseUrl:this.baseUrl||window.location.origin}}handleUpdateEvent(t){try{const s=JSON.parse(t.data);if(console.log("[LocalComms] Received update event:",s),s.type==="activity"){this.emitTick({type:"activity:updated"});return}const{type:i,tickId:o}=s;if(!o){console.warn("[LocalComms] Update event missing tickId:",s);return}i==="create"||i==="update"?this.fetchAndEmitTick(o):i==="delete"&&this.emitTick({type:"tick:deleted",tickId:o})}catch(s){console.error("[LocalComms] Failed to parse update event:",s)}}async fetchAndEmitTick(t){try{const s=await fetch(`${this.baseUrl}/api/ticks/${t}`);if(!s.ok)throw new Error(`HTTP ${s.status}`);const i=await s.json();this.emitTick({type:"tick:updated",tick:i})}catch(s){console.error(`[LocalComms] Failed to fetch tick ${t}:`,s),this.emitConnection({type:"connection:error",message:`Failed to fetch tick ${t}: ${s}`})}}handleRunEvent(t,s,i){try{const o=JSON.parse(i.data),r=new Date().toISOString();let a;switch(s){case"task-started":a={type:"run:task-started",taskId:o.taskId,epicId:t,status:o.status||"running",numTurns:o.numTurns||0,metrics:this.normalizeMetrics(o.metrics),timestamp:r};break;case"task-update":a={type:"run:task-update",taskId:o.taskId,epicId:t,output:o.output,status:o.status,numTurns:o.numTurns,metrics:this.normalizeMetrics(o.metrics),activeTool:o.activeTool?this.normalizeToolInfo(o.activeTool):void 0,timestamp:r};break;case"task-completed":a={type:"run:task-completed",taskId:o.taskId,epicId:t,success:o.success??!0,numTurns:o.numTurns||0,metrics:this.normalizeMetrics(o.metrics),timestamp:r};break;case"tool-activity":a={type:"run:tool-activity",taskId:o.taskId,epicId:t,tool:this.normalizeToolInfo(o.tool||o.activeTool),timestamp:r};break;case"epic-started":a={type:"run:epic-started",epicId:t,status:o.status||"running",message:o.message,timestamp:r};break;case"epic-completed":a={type:"run:epic-completed",epicId:t,success:o.success??!0,timestamp:r};break;default:console.warn(`[LocalComms] Unknown run event type: ${s}`);return}this.emitRun(a)}catch(o){console.error(`[LocalComms] Failed to parse run event ${s}:`,o)}}handleContextEvent(t,s,i){try{const o=JSON.parse(i.data);let r;switch(s){case"context:generating":r={type:"context:generating",epicId:t,taskCount:o.taskCount||0};break;case"context:generated":r={type:"context:generated",epicId:t,tokenCount:o.tokenCount||0};break;case"context:loaded":r={type:"context:loaded",epicId:t};break;case"context:failed":r={type:"context:failed",epicId:t,message:o.message||"Context generation failed"};break;case"context:skipped":r={type:"context:skipped",epicId:t,reason:o.reason||"Unknown reason"};break;default:return}this.emitContext(r)}catch(o){console.error(`[LocalComms] Failed to parse context event ${s}:`,o)}}emitTick(t){for(const s of this.tickHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in tick handler:",i)}}emitRun(t){for(const s of this.runHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in run handler:",i)}}emitContext(t){for(const s of this.contextHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in context handler:",i)}}emitConnection(t){for(const s of this.connectionHandlers)try{s(t)}catch(i){console.error("[LocalComms] Error in connection handler:",i)}}normalizeMetrics(t){if(t)return{inputTokens:t.input_tokens||t.inputTokens||0,outputTokens:t.output_tokens||t.outputTokens||0,cacheReadTokens:t.cache_read_tokens||t.cacheReadTokens||0,cacheCreationTokens:t.cache_creation_tokens||t.cacheCreationTokens||0,costUsd:t.cost_usd||t.costUsd||0,durationMs:t.duration_ms||t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,output:t.output,durationMs:t.duration_ms||t.duration||t.durationMs,isError:t.is_error||t.isError}:{name:"Unknown"}}}const Cl=10,$l=1e3,Tl=3e4;class Sl{constructor(t){this.tickHandlers=new Set,this.runHandlers=new Set,this.contextHandlers=new Set,this.connectionHandlers=new Set,this.ws=null,this.connected=!1,this.localAgentConnected=!1,this.reconnectAttempts=0,this.reconnectTimer=null,this.runSubscriptions=new Set,this.tickCache=new Map,this.runStates=new Map,this.projectId=t}async connect(){return this.closeWebSocket(),new Promise((t,s)=>{try{const i=window.location.protocol==="https:"?"wss:":"ws:",o=window.location.host,r=localStorage.getItem("token")||"",a=`${i}//${o}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;console.log("[CloudComms] Connecting to",a);const n=["ticks-v1",`token-${encodeURIComponent(r)}`];this.ws=new WebSocket(a,n);let u=!1;this.ws.onopen=()=>{console.log("[CloudComms] WebSocket connected"),this.connected=!0,this.reconnectAttempts=0,u||(u=!0,t()),this.emitConnection({type:"connection:connected"})},this.ws.onmessage=d=>{this.handleMessage(d)},this.ws.onclose=d=>{console.log("[CloudComms] WebSocket closed:",d.code,d.reason);const p=this.connected;this.connected=!1,this.ws=null,p&&this.emitConnection({type:"connection:disconnected"}),this.scheduleReconnect(),u||(u=!0,s(new ht(`WebSocket closed: ${d.code} ${d.reason}`)))},this.ws.onerror=d=>{console.error("[CloudComms] WebSocket error:",d),u||(u=!0,s(new ht("WebSocket connection error"))),this.emitConnection({type:"connection:error",message:"WebSocket connection error"})}}catch(i){s(new ht(`Failed to create WebSocket: ${i}`))}})}disconnect(){this.reconnectTimer!==null&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.closeWebSocket(),this.runSubscriptions.clear(),this.connected&&(this.connected=!1,this.emitConnection({type:"connection:disconnected"}))}closeWebSocket(){this.ws&&(this.ws.close(),this.ws=null)}scheduleReconnect(){if(this.reconnectAttempts>=Cl){console.error("[CloudComms] Max reconnect attempts reached"),this.emitConnection({type:"connection:error",message:"Connection lost - max reconnect attempts reached"});return}const t=Math.min($l*Math.pow(2,this.reconnectAttempts),Tl);this.reconnectAttempts++,console.log(`[CloudComms] Reconnecting in ${t}ms (attempt ${this.reconnectAttempts})`),this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect().catch(s=>{console.error("[CloudComms] Reconnect failed:",s)})},t)}onTick(t){return this.tickHandlers.add(t),()=>this.tickHandlers.delete(t)}onRun(t){return this.runHandlers.add(t),()=>this.runHandlers.delete(t)}onContext(t){return this.contextHandlers.add(t),()=>this.contextHandlers.delete(t)}onConnection(t){return this.connectionHandlers.add(t),()=>this.connectionHandlers.delete(t)}subscribeRun(t){return this.runSubscriptions.add(t),console.log(`[CloudComms] Subscribed to run events for ${t}`),()=>{this.runSubscriptions.delete(t),console.log(`[CloudComms] Unsubscribed from run events for ${t}`)}}async createTick(t){this.checkWritable();const s={id:this.generateTickId(),title:t.title,description:t.description||"",type:t.type||"task",status:"open",priority:t.priority??2,parent:t.parent,labels:t.labels,blocked_by:t.blocked_by,owner:"",created_by:"cloud@user",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:s}),s}async updateTick(t,s){this.checkWritable();const i={id:t,title:s.title||"",description:s.description||"",status:s.status||"open",priority:s.priority??2,labels:s.labels,blocked_by:s.blocked_by,type:"task",owner:"",created_by:"cloud@user",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};return this.sendMessage({type:"tick_update",tick:i}),i}async deleteTick(t){this.checkWritable(),this.sendMessage({type:"tick_delete",id:t})}async addNote(t,s){return this.checkWritable(),this.tickOperation(t,"note",{message:s})}async approveTick(t){return this.checkWritable(),this.tickOperation(t,"approve")}async rejectTick(t,s){return this.checkWritable(),this.tickOperation(t,"reject",{reason:s})}async closeTick(t,s){return this.checkWritable(),this.tickOperation(t,"close",{reason:s})}async reopenTick(t){return this.checkWritable(),this.tickOperation(t,"reopen")}isConnected(){var t;return this.connected&&((t=this.ws)==null?void 0:t.readyState)===WebSocket.OPEN}isReadOnly(){return!this.localAgentConnected}getConnectionInfo(){return{mode:"cloud",connected:this.connected,localAgentConnected:this.localAgentConnected,projectId:this.projectId,baseUrl:window.location.origin}}async fetchTicks(){const t=[];for(const s of this.tickCache.values()){let i=!1;if(s.blocked_by&&s.blocked_by.length>0)for(const r of s.blocked_by){const a=this.tickCache.get(r);if(!a||a.status!=="closed"){i=!0;break}}let o="ready";s.status==="closed"?o="done":i?o="blocked":s.awaiting?o="human":s.status==="in_progress"&&(o="agent"),t.push({...s,is_blocked:i,column:o})}return t}async fetchInfo(){const t=[];for(const s of this.tickCache.values())s.type==="epic"&&t.push({id:s.id,title:s.title});return{repoName:this.projectId,epics:t}}async fetchTick(t){const s=this.tickCache.get(t);if(!s)throw new Error(`Tick not found: ${t}`);const i=[];if(s.blocked_by&&s.blocked_by.length>0)for(const a of s.blocked_by){const n=this.tickCache.get(a);n?i.push({id:n.id,title:n.title,status:n.status}):i.push({id:a,title:`Tick ${a}`,status:"unknown"})}const o=i.some(a=>a.status!=="closed");let r="ready";return s.status==="closed"?r="done":o?r="blocked":s.awaiting?r="human":s.status==="in_progress"&&(r="agent"),{...s,isBlocked:o,column:r,notesList:Mi(s.notes),blockerDetails:i}}async fetchActivity(t){return[]}async fetchRecord(t){return null}async fetchRunStatus(t){var i,o;const s=this.runStates.get(t);return s?{epicId:t,isRunning:s.isRunning,activeTask:s.activeTaskId?{tickId:s.activeTaskId,title:((i=this.tickCache.get(s.activeTaskId))==null?void 0:i.title)||s.activeTaskId,status:"running",numTurns:0,metrics:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:((o=s.lastEvent)==null?void 0:o.timestamp)||new Date().toISOString()}:void 0}:{epicId:t,isRunning:!1}}async fetchContext(t){return null}handleMessage(t){try{const s=JSON.parse(t.data);switch(s.type){case"state_full":this.handleStateFullMessage(s);break;case"tick_updated":case"tick_created":this.handleTickUpdateMessage(s);break;case"tick_deleted":this.handleTickDeleteMessage(s);break;case"connected":console.log("[CloudComms] Connection confirmed:",s.connectionId);break;case"error":console.error("[CloudComms] Server error:",s.message),this.emitConnection({type:"connection:error",message:s.message});break;case"local_status":this.handleLocalStatusMessage(s);break;case"run_event":this.handleRunEventMessage(s);break;default:console.warn("[CloudComms] Unknown message type:",s.type)}}catch(s){console.error("[CloudComms] Failed to parse message:",s)}}handleStateFullMessage(t){console.log("[CloudComms] Received full state:",Object.keys(t.ticks).length,"ticks"),this.tickCache.clear();for(const[i,o]of Object.entries(t.ticks))this.tickCache.set(i,o);const s=new Map(Object.entries(t.ticks));this.emitTick({type:"tick:bulk",ticks:s})}handleTickUpdateMessage(t){console.log("[CloudComms] Tick updated:",t.tick.id),this.tickCache.set(t.tick.id,t.tick),this.emitTick({type:"tick:updated",tick:t.tick})}handleTickDeleteMessage(t){console.log("[CloudComms] Tick deleted:",t.id),this.tickCache.delete(t.id),this.emitTick({type:"tick:deleted",tickId:t.id})}handleLocalStatusMessage(t){console.log("[CloudComms] Local agent status:",t.connected?"online":"offline"),this.localAgentConnected=t.connected,this.emitConnection({type:"connection:local-status",connected:t.connected})}handleRunEventMessage(t){const{epicId:s,taskId:i,event:o}=t;if(!this.runSubscriptions.has(s)&&this.runSubscriptions.size>0)return;const r=o.timestamp||new Date().toISOString();let a;switch(o.type){case"task-started":a={type:"run:task-started",taskId:i||"",epicId:s,status:o.status||"running",numTurns:o.numTurns||0,metrics:this.normalizeMetrics(o.metrics),timestamp:r},this.runStates.set(s,{isRunning:!0,activeTaskId:i,lastEvent:a});break;case"task-update":a={type:"run:task-update",taskId:i||"",epicId:s,output:o.output,status:o.status,numTurns:o.numTurns,metrics:this.normalizeMetrics(o.metrics),activeTool:o.activeTool?this.normalizeToolInfo(o.activeTool):void 0,timestamp:r};const n=this.runStates.get(s);n&&(n.lastEvent=a);break;case"task-completed":a={type:"run:task-completed",taskId:i||"",epicId:s,success:o.success??!0,numTurns:o.numTurns||0,metrics:this.normalizeMetrics(o.metrics),timestamp:r};const u=this.runStates.get(s);u&&(u.activeTaskId=void 0,u.lastEvent=a);break;case"tool-activity":a={type:"run:tool-activity",taskId:i||"",epicId:s,tool:o.activeTool?this.normalizeToolInfo(o.activeTool):{name:"Unknown"},timestamp:r};break;case"epic-started":a={type:"run:epic-started",epicId:s,status:o.status||"running",message:o.message,timestamp:r},this.runStates.set(s,{isRunning:!0,lastEvent:a});break;case"epic-completed":a={type:"run:epic-completed",epicId:s,success:o.success??!0,timestamp:r},this.runStates.set(s,{isRunning:!1,lastEvent:a});break;default:console.warn("[CloudComms] Unknown run event type:",o.type);return}this.emitRun(a)}emitTick(t){for(const s of this.tickHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in tick handler:",i)}}emitRun(t){for(const s of this.runHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in run handler:",i)}}emitContext(t){for(const s of this.contextHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in context handler:",i)}}emitConnection(t){for(const s of this.connectionHandlers)try{s(t)}catch(i){console.error("[CloudComms] Error in connection handler:",i)}}checkWritable(){if(!this.connected)throw new ht("Not connected to server");if(!this.localAgentConnected)throw new kl("Cannot write: local agent is offline")}sendMessage(t){var s;if(((s=this.ws)==null?void 0:s.readyState)!==WebSocket.OPEN)throw new ht("WebSocket not connected");this.ws.send(JSON.stringify(t))}async tickOperation(t,s,i){const o=`/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(t)}/${s}`,r=localStorage.getItem("token")||"",a=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json",...r?{Authorization:`Bearer ${r}`}:{}},body:i?JSON.stringify(i):void 0});if(!a.ok){const n=await a.json().catch(()=>({error:a.statusText}));throw new Error(n.error||`Failed to ${s} tick`)}return a.json()}generateTickId(){const t="abcdefghijklmnopqrstuvwxyz0123456789";let s="";for(let i=0;i<3;i++)s+=t.charAt(Math.floor(Math.random()*t.length));return s}normalizeMetrics(t){if(t)return{inputTokens:t.inputTokens||0,outputTokens:t.outputTokens||0,cacheReadTokens:t.cacheReadTokens||0,cacheCreationTokens:t.cacheCreationTokens||0,costUsd:t.costUsd||0,durationMs:t.durationMs||0}}normalizeToolInfo(t){return t?{name:t.name||"Unknown",input:t.input,durationMs:t.duration}:{name:"Unknown"}}}const mt=_e(null),ft=_e("disconnected"),vi=new Set;function tr(e){return vi.add(e),()=>vi.delete(e)}function El(e){for(const t of vi)try{t(e)}catch(s){console.error("[CommsStore] Error in run event listener:",s)}}const yi=new Set;function zl(e){return yi.add(e),()=>yi.delete(e)}function Rl(e){for(const t of yi)try{t(e)}catch(s){console.error("[CommsStore] Error in context event listener:",s)}}function sr(e){switch(e.type){case"tick:updated":console.log("[CommsStore] Tick updated:",e.tick.id),bs(e.tick);break;case"tick:deleted":console.log("[CommsStore] Tick deleted:",e.tickId),yl(e.tickId);break;case"tick:bulk":console.log("[CommsStore] Bulk tick sync:",e.ticks.size,"ticks"),vl(e.ticks);break;case"activity:updated":window.dispatchEvent(new CustomEvent("activity-update"));break}}function ir(e){El(e)}function or(e){Rl(e)}function rr(e){switch(e.type){case"connection:connected":console.log("[CommsStore] Connected"),ft.set("connected"),fo(!0);break;case"connection:disconnected":console.log("[CommsStore] Disconnected"),ft.set("disconnected"),fo(!1);break;case"connection:local-status":console.log("[CommsStore] Local agent status:",e.connected?"online":"offline"),cl(e.connected);break;case"connection:error":console.error("[CommsStore] Connection error:",e.message),Yt(e.message);break}}let go=!1,Fe=[];async function Al(){ar(),console.log("[CommsStore] Initializing local mode"),ft.set("connecting"),Ts(!0);const e=new _l;Fe.push(e.onTick(sr)),Fe.push(e.onRun(ir)),Fe.push(e.onContext(or)),Fe.push(e.onConnection(rr)),mt.set(e);try{await e.connect(),console.log("[CommsStore] Local mode connected")}catch(t){console.error("[CommsStore] Failed to connect:",t),Yt(`Connection failed: ${t}`)}}async function vo(e){ar(),console.log("[CommsStore] Initializing cloud mode for project:",e),ft.set("connecting"),Ts(!0);const t=new Sl(e);Fe.push(t.onTick(sr)),Fe.push(t.onRun(ir)),Fe.push(t.onContext(or)),Fe.push(t.onConnection(rr)),mt.set(t),er(e);try{await t.connect(),console.log("[CommsStore] Cloud mode connected")}catch(s){console.error("[CommsStore] Failed to connect:",s),Yt(`Connection failed: ${s}`)}}function ar(){for(const t of Fe)t();Fe=[];const e=mt.get();e&&(e.disconnect(),mt.set(null))}function nr(e){const t=mt.get();return t?t.subscribeRun(e):(console.warn("[CommsStore] Cannot subscribe to run: no client"),()=>{})}function ve(){const e=mt.get();if(!e)throw new Error("CommsClient not initialized");return e}async function Il(e){return ve().createTick(e)}async function Ol(e,t){return ve().addNote(e,t)}async function Ll(e){return ve().approveTick(e)}async function Pl(e,t){return ve().rejectTick(e,t)}async function Dl(e,t){return ve().closeTick(e,t)}async function Ml(e){return ve().reopenTick(e)}async function Fl(){return ve().fetchTicks()}async function Bl(){return ve().fetchInfo()}async function Nl(e){return ve().fetchTick(e)}async function Hl(e){return ve().fetchActivity(e)}async function jl(e){return ve().fetchRecord(e)}async function Ul(e){return ve().fetchRunStatus(e)}async function Vl(e){return ve().fetchContext(e)}function Wl(){if(go){console.log("[CommsStore] Already initialized, skipping");return}go=!0,console.log("[CommsStore] Setting up auto-connect"),ot.subscribe(e=>{const t=_s.get();console.log("[CommsStore] Cloud mode changed:",e,"projectId:",t),e&&t?vo(t):e||Al()}),_s.subscribe(e=>{const t=ot.get();console.log("[CommsStore] Project ID changed:",e,"isCloudMode:",t),t&&e&&!mt.get()&&vo(e)})}var ql=Object.defineProperty,Kl=Object.getOwnPropertyDescriptor,te=(e,t,s,i)=>{for(var o=i>1?void 0:i?Kl(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&ql(t,s,o),o};console.log("[TickBoard] Initializing comms module");Wl();const ai=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Me=["blocked","ready","agent","human","done"];let G=class extends de{constructor(){super(...arguments),this.boardState={...Jn},this.ticksController=new ae.StoreController(this,ul),this.epicsController=new ae.StoreController(this,hl),this.repoNameController=new ae.StoreController(this,Jo),this.selectedTickController=new ae.StoreController(this,Ks),this.selectedTickNotesController=new ae.StoreController(this,pl),this.selectedTickBlockersController=new ae.StoreController(this,ml),this.selectedTickParentTitleController=new ae.StoreController(this,fl),this.loadingController=new ae.StoreController(this,ts),this.errorController=new ae.StoreController(this,qs),this.isCloudModeController=new ae.StoreController(this,ot),this.localClientConnectedController=new ae.StoreController(this,Ws),this.isReadOnlyController=new ae.StoreController(this,nl),this.connectionStatusController=new ae.StoreController(this,ft),this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.showCreateDialog=!1,this.showMobileFilterDrawer=!1,this.showRunPanel=!1,this.runStatus=null,this.runPanelEpicId=null,this.runStreamConnected=!1,this.activeToolInfo=null,this.runMetrics=null,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.runStreamUnsubscribe=null,this.runEventUnsubscribe=null,this.runPollInterval=null,this.handleKeyDown=e=>{if(!(this.loading||this.error||this.isInputFocused()))switch(this.showKeyboardHelp&&e.key!=="?"&&(this.showKeyboardHelp=!1),e.key){case"?":e.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":e.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":e.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":e.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":e.preventDefault(),this.navigateHorizontal(1);break;case"Enter":e.preventDefault(),this.openFocusedTick();break;case"Escape":e.preventDefault(),this.handleEscape();break;case"n":e.preventDefault(),this.handleCreateClick();break;case"/":e.preventDefault(),this.focusSearchInput();break;case"r":!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(e.preventDefault(),this.toggleRunPanel());break}},this.handleMediaChange=e=>{this.isMobile=e.matches,this.updateBoardState()}}get ticks(){return this.ticksController.value}get epics(){return this.epicsController.value}get repoName(){return this.repoNameController.value}get selectedTick(){return this.selectedTickController.value}get selectedTickNotes(){return this.selectedTickNotesController.value}get selectedTickBlockers(){return this.selectedTickBlockersController.value}get selectedTickParentTitle(){return this.selectedTickParentTitleController.value}get loading(){return this.loadingController.value}get error(){return this.errorController.value}get isCloudMode(){return this.isCloudModeController.value}get localClientConnected(){return this.localClientConnectedController.value}get isReadOnly(){return this.isReadOnlyController.value}get connectionStatus(){return this.connectionStatusController.value}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.detectCloudMode(),this.runEventUnsubscribe=tr(e=>this.handleRunEvent(e)),this.isCloudMode||(this.loadData(),this.startRunStatusPolling())}detectCloudMode(){const e=window.location.pathname.match(/^\/p\/(.+?)(?:\/|$)/);if(e){const s=decodeURIComponent(e[1]);console.log("[TickBoard] Cloud mode detected, project:",s),ri(s);return}const t=localStorage.getItem("ticks_project");if(t){console.log("[TickBoard] Cloud mode from localStorage, project:",t),ri(t);return}if(window.location.hostname==="ticks.sh"||window.location.hostname.endsWith(".ticks.sh")){const s=new URLSearchParams(window.location.search).get("project");if(s){console.log("[TickBoard] Cloud mode from query param, project:",s),ri(s);return}}console.log("[TickBoard] Local mode"),ll()}async loadData(){if(this.isCloudMode){console.log("[TickBoard] Cloud mode: waiting for data from CloudCommsClient"),Ts(!0);return}Ts(!0),Yt(null);try{const[e,t]=await Promise.all([Fl(),Bl()]);gl(e),er(t.repoName),this.updateBoardState()}catch(e){Yt(e instanceof Error?e.message:"Failed to load data"),console.error("Failed to load board data:",e)}}disconnectedCallback(){var e;super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown),(e=this.runEventUnsubscribe)==null||e.call(this),this.runEventUnsubscribe=null,this.unsubscribeRunStream(),this.stopRunStatusPolling()}startRunStatusPolling(){this.runPollInterval=setInterval(()=>{this.checkForActiveRuns()},5e3),this.checkForActiveRuns()}stopRunStatusPolling(){this.runPollInterval&&(clearInterval(this.runPollInterval),this.runPollInterval=null)}async checkForActiveRuns(){var e,t,s;if(this.epics.length!==0){for(const i of this.epics)try{const o=await Ul(i.id);if(o.isRunning){this.runStatus=o,this.runPanelEpicId!==i.id&&(this.runPanelEpicId=i.id,this.subscribeToRunStream(i.id)),(e=o.activeTask)!=null&&e.metrics&&(this.runMetrics=this.convertApiMetrics(o.activeTask.metrics)),(t=o.activeTask)!=null&&t.activeTool&&(this.activeToolInfo={name:o.activeTask.activeTool.name,input:o.activeTask.activeTool.input,output:o.activeTask.activeTool.output,durationMs:o.activeTask.activeTool.duration_ms,isError:o.activeTask.activeTool.is_error,isComplete:!1});return}}catch{}(s=this.runStatus)!=null&&s.isRunning&&(this.runStatus={...this.runStatus,isRunning:!1})}}convertApiMetrics(e){return{inputTokens:e.input_tokens,outputTokens:e.output_tokens,cacheReadTokens:e.cache_read_tokens,cacheCreationTokens:e.cache_creation_tokens,costUsd:e.cost_usd,durationMs:e.duration_ms}}subscribeToRunStream(e){this.unsubscribeRunStream(),console.log("[RunStream] Subscribing to epic:",e),this.runStreamUnsubscribe=nr(e),this.runStreamConnected=!0}unsubscribeRunStream(){this.runStreamUnsubscribe&&(this.runStreamUnsubscribe(),this.runStreamUnsubscribe=null),this.runStreamConnected=!1}handleRunEvent(e){var s;const t=e.epicId;if(!(this.runPanelEpicId&&t!==this.runPanelEpicId))switch(e.type){case"run:task-started":this.runStatus={epicId:t,isRunning:!0,activeTask:{tickId:e.taskId,title:"",status:"running",numTurns:e.numTurns||0,metrics:e.metrics?{input_tokens:e.metrics.inputTokens,output_tokens:e.metrics.outputTokens,cache_read_tokens:e.metrics.cacheReadTokens,cache_creation_tokens:e.metrics.cacheCreationTokens,cost_usd:e.metrics.costUsd,duration_ms:e.metrics.durationMs}:{input_tokens:0,output_tokens:0,cache_read_tokens:0,cache_creation_tokens:0,cost_usd:0,duration_ms:0},lastUpdated:e.timestamp}},this.activeToolInfo=null;break;case"run:task-update":e.metrics&&(this.runMetrics={inputTokens:e.metrics.inputTokens,outputTokens:e.metrics.outputTokens,cacheReadTokens:e.metrics.cacheReadTokens,cacheCreationTokens:e.metrics.cacheCreationTokens,costUsd:e.metrics.costUsd,durationMs:e.metrics.durationMs}),e.activeTool&&(this.activeToolInfo={name:e.activeTool.name,input:e.activeTool.input,output:e.activeTool.output,durationMs:e.activeTool.durationMs,isComplete:!1}),(s=this.runStatus)!=null&&s.activeTask&&(this.runStatus={...this.runStatus,activeTask:{...this.runStatus.activeTask,numTurns:e.numTurns??this.runStatus.activeTask.numTurns,lastUpdated:e.timestamp}});break;case"run:tool-activity":this.activeToolInfo={name:e.tool.name,input:e.tool.input,output:e.tool.output,durationMs:e.tool.durationMs,isComplete:!1};break;case"run:task-completed":console.log("[RunStream] Task completed:",e.taskId),this.activeToolInfo=null,this.runStatus&&(this.runStatus={...this.runStatus,isRunning:!1,activeTask:void 0});break;case"run:epic-started":console.log("[RunStream] Epic started:",t),this.runStatus={epicId:t,isRunning:!0};break;case"run:epic-completed":console.log("[RunStream] Epic completed:",t),this.runStatus={epicId:t,isRunning:!1},this.activeToolInfo=null;break}}toggleRunPanel(){var e;this.showRunPanel=!this.showRunPanel,this.showRunPanel&&((e=this.runStatus)!=null&&e.isRunning)&&this.runStatus.epicId&&this.runPanelEpicId!==this.runStatus.epicId&&(this.runPanelEpicId=this.runStatus.epicId,this.subscribeToRunStream(this.runStatus.epicId))}closeRunPanel(){this.showRunPanel=!1}isInputFocused(){var i;let e=document.activeElement;for(;(i=e==null?void 0:e.shadowRoot)!=null&&i.activeElement;)e=e.shadowRoot.activeElement;if(!e)return!1;const t=e.tagName.toLowerCase();if(t==="input"||t==="textarea"||t==="select"||e.getAttribute("contenteditable")==="true")return!0;let s=e;for(;s;){const o=s.tagName.toLowerCase();if(o.startsWith("sl-")&&(o.includes("input")||o.includes("textarea")||o.includes("select")))return!0;const r=s.getRootNode();s=r instanceof ShadowRoot?r.host:null}return!1}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Me.length?[]:this.getColumnTicks(Me[this.focusedColumnIndex])}initializeFocus(){for(let e=0;e<Me.length;e++)if(this.getColumnTicks(Me[e]).length>0){this.focusedColumnIndex=e,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}const t=this.getFocusedColumnTicks();if(t.length===0)return;let s=this.focusedTickIndex+e;s<0?s=t.length-1:s>=t.length&&(s=0),this.focusedTickIndex=s}navigateHorizontal(e){if(this.focusedColumnIndex<0){this.initializeFocus();return}let t=this.focusedColumnIndex+e;t<0?t=Me.length-1:t>=Me.length&&(t=0),this.focusedColumnIndex=t;const s=this.getColumnTicks(Me[t]);s.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=s.length?this.focusedTickIndex=s.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Me[t],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const e=this.getFocusedColumnTicks();this.focusedTickIndex<e.length&&Nt(e[this.focusedTickIndex].id)}handleEscape(){this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?Nt(null):this.showRunPanel?this.showRunPanel=!1:this.clearFocus()}focusSearchInput(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("tick-header");if(e!=null&&e.shadowRoot){const s=e.shadowRoot.querySelector("sl-input");s&&s.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const e=this.getFocusedColumnTicks();return this.focusedTickIndex<e.length?e[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(e){this.searchTerm=e.detail.value,this.updateBoardState()}handleEpicFilterChange(e){this.selectedEpic=e.detail.value,this.updateBoardState()}handleCreateClick(){this.showCreateDialog=!0}handleCreateDialogClose(){this.showCreateDialog=!1}handleTickCreated(e){var s;const{tick:t}=e.detail;bs(t),this.showCreateDialog=!1,this.updateBoardState(),(s=window.showToast)==null||s.call(window,{message:`Created tick ${t.id}`,variant:"success"})}handleMenuToggle(){console.log("Menu toggle clicked")}handleMobileMenuToggle(){this.showMobileFilterDrawer=!0}handleMobileTabChange(e){const s=e.target.querySelector("sl-tab[active]");if(s){const i=s.getAttribute("panel");i&&Me.includes(i)&&(this.activeColumn=i,this.focusedColumnIndex=Me.indexOf(i),this.focusedTickIndex=this.getColumnTicks(i).length>0?0:-1,this.updateBoardState())}}handleMobileSearchInput(e){const t=e.target;this.searchTerm=t.value,this.updateBoardState()}handleMobileEpicFilterChange(e){const t=e.target;this.selectedEpic=t.value,this.updateBoardState()}handleActivityClick(e){const t=e.detail.tickId,s=this.ticks.find(i=>i.id===t);s?Nt(s.id):window.showToast&&window.showToast({message:`Tick ${t} not found in current view`,variant:"warning"})}async handleTickSelected(e){const t=e.detail.tick;if(Nt(t.id),!this.isCloudMode)try{const s=await Nl(t.id);bs(s)}catch(s){console.error("Failed to fetch tick details:",s)}}handleDrawerClose(){Nt(null)}handleTickUpdated(e){const{tick:t}=e.detail;bs(t),this.updateBoardState()}getFilteredTicks(){let e=this.ticks;if(this.searchTerm){const t=this.searchTerm.toLowerCase();e=e.filter(s=>s.id.toLowerCase().includes(t)||s.title.toLowerCase().includes(t)||s.description&&s.description.toLowerCase().includes(t))}return this.selectedEpic&&(e=e.filter(t=>t.parent===this.selectedEpic)),e}getColumnTicks(e){return this.getFilteredTicks().filter(t=>t.column===e)}getEpicNames(){const e={};for(const t of this.epics)e[t.id]=t.title;return e}renderRunPanel(){var s,i;const e=((s=this.runStatus)==null?void 0:s.isRunning)&&this.runStatus.activeTask,t=((i=this.epics.find(o=>o.id===this.runPanelEpicId))==null?void 0:i.title)||this.runPanelEpicId||"Unknown Epic";return h`
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
        ${this.runMetrics?h`<run-metrics .metrics=${this.runMetrics} ?live=${!0}></run-metrics>`:v}
      </div>

      <!-- Tool activity indicator -->
      ${this.activeToolInfo?h`
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
    `:v}renderNoRunState(){return h`
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
            ${ai.map((s,i)=>h`
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
        ${this.showRunPanel?this.renderRunPanel():v}
      </div>

      <!-- Mobile tab layout (visible only on ≤480px) -->
      <div class="mobile-tab-layout">
        <sl-tab-group @sl-tab-show=${this.handleMobileTabChange}>
          ${ai.map(s=>h`
            <sl-tab
              slot="nav"
              panel=${s.id}
              ?active=${this.activeColumn===s.id}
            >
              ${s.icon}
              <span class="tab-badge">${this.getColumnTicks(s.id).length}</span>
            </sl-tab>
          `)}
          ${ai.map((s,i)=>h`
            <sl-tab-panel name=${s.id}>
              <div class="mobile-column-content">
                ${this.getColumnTicks(s.id).length===0?h`
                      <div class="mobile-empty-state">
                        <div class="empty-icon">${s.icon}</div>
                        <div>No ticks in ${s.name}</div>
                      </div>
                    `:this.getColumnTicks(s.id).map(o=>h`
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
    `}};G.styles=$`
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
  `;te([Wn({context:Qn}),y()],G.prototype,"boardState",2);te([y()],G.prototype,"selectedEpic",2);te([y()],G.prototype,"searchTerm",2);te([y()],G.prototype,"activeColumn",2);te([y()],G.prototype,"isMobile",2);te([y()],G.prototype,"focusedColumnIndex",2);te([y()],G.prototype,"focusedTickIndex",2);te([y()],G.prototype,"showKeyboardHelp",2);te([y()],G.prototype,"showCreateDialog",2);te([y()],G.prototype,"showMobileFilterDrawer",2);te([y()],G.prototype,"showRunPanel",2);te([y()],G.prototype,"runStatus",2);te([y()],G.prototype,"runPanelEpicId",2);te([y()],G.prototype,"runStreamConnected",2);te([y()],G.prototype,"activeToolInfo",2);te([y()],G.prototype,"runMetrics",2);G=te([me("tick-board")],G);var Gl=Object.defineProperty,Yl=Object.getOwnPropertyDescriptor,At=(e,t,s,i)=>{for(var o=i>1?void 0:i?Yl(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&Gl(t,s,o),o};const yo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Xl={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let rt=class extends de{constructor(){super(...arguments),this.selected=!1,this.focused=!1}updated(e){e.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"})}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return yo[this.tick.priority]??yo[2]}getPriorityLabel(){return Xl[this.tick.priority]??"Unknown"}renderVerificationBadge(){const e=this.tick.verification_status;if(!e)return null;switch(e){case"verified":return h`<span class="meta-badge verified">✓ verified</span>`;case"failed":return h`<span class="meta-badge verification-failed">✗ failed</span>`;case"pending":return h`<span class="meta-badge verification-pending">⋯ pending</span>`;default:return null}}render(){const{tick:e,selected:t,focused:s,epicName:i}=this;return h`
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
      </div>
    `}};rt.styles=$`
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
  `;At([c({attribute:!1})],rt.prototype,"tick",2);At([c({type:Boolean})],rt.prototype,"selected",2);At([c({type:Boolean})],rt.prototype,"focused",2);At([c({type:String,attribute:"epic-name"})],rt.prototype,"epicName",2);At([C(".card")],rt.prototype,"cardElement",2);rt=At([me("tick-card")],rt);var Zl=Object.defineProperty,Ql=Object.getOwnPropertyDescriptor,It=(e,t,s,i)=>{for(var o=i>1?void 0:i?Ql(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&Zl(t,s,o),o};const Jl={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},ec={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},tc={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let at=class extends de{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||Jl[this.name]||"var(--blue)"}getColumnDisplayName(){return ec[this.name]||this.name}getColumnIcon(){return tc[this.name]||"•"}handleTickSelected(e){this.dispatchEvent(new CustomEvent("tick-selected",{detail:e.detail,bubbles:!0,composed:!0}))}render(){const e=this.getColumnColor(),t=this.getColumnDisplayName(),s=this.getColumnIcon(),i=this.ticks.length;return h`
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
            `:this.ticks.map(o=>h`
                <tick-card
                  .tick=${o}
                  epic-name=${this.epicNames[o.parent||""]||""}
                  ?focused=${this.focusedTickId===o.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};at.styles=$`
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
  `;It([c({type:String})],at.prototype,"name",2);It([c({type:String})],at.prototype,"color",2);It([c({attribute:!1})],at.prototype,"ticks",2);It([c({type:Object,attribute:!1})],at.prototype,"epicNames",2);It([c({type:String,attribute:"focused-tick-id"})],at.prototype,"focusedTickId",2);at=It([me("tick-column")],at);var sc=Object.defineProperty,ic=Object.getOwnPropertyDescriptor,Ue=(e,t,s,i)=>{for(var o=i>1?void 0:i?ic(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&sc(t,s,o),o};let we=class extends de{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.runPanelOpen=!1,this.runActive=!1,this.readonlyMode=!1,this.connectionStatus="disconnected",this.debounceTimeout=null}handleSearchInput(e){const s=e.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:s},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(e){const t=e.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:t.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:e.detail,bubbles:!0,composed:!0}))}handleRunPanelToggle(){this.dispatchEvent(new CustomEvent("run-panel-toggle",{bubbles:!0,composed:!0}))}getConnectionTooltip(){switch(this.connectionStatus){case"connected":return"Connected to server";case"connecting":return"Connecting...";case"disconnected":return"Disconnected from server"}}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return h`
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
  `;Ue([c({type:String,attribute:"repo-name"})],we.prototype,"repoName",2);Ue([c({attribute:!1})],we.prototype,"epics",2);Ue([c({type:String,attribute:"selected-epic"})],we.prototype,"selectedEpic",2);Ue([c({type:String,attribute:"search-term"})],we.prototype,"searchTerm",2);Ue([c({type:Boolean,attribute:"run-panel-open"})],we.prototype,"runPanelOpen",2);Ue([c({type:Boolean,attribute:"run-active"})],we.prototype,"runActive",2);Ue([c({type:Boolean,attribute:"readonly-mode"})],we.prototype,"readonlyMode",2);Ue([c({type:String,attribute:"connection-status"})],we.prototype,"connectionStatus",2);Ue([y()],we.prototype,"debounceTimeout",2);we=Ue([me("tick-header")],we);var oc=Object.defineProperty,rc=Object.getOwnPropertyDescriptor,Gs=(e,t,s,i)=>{for(var o=i>1?void 0:i?rc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&oc(t,s,o),o};let $t=class extends de{constructor(){super(...arguments),this.record=null,this.loading=!1,this.error=""}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}truncateText(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}renderSummary(e){const t=e.metrics.input_tokens+e.metrics.output_tokens,s=e.success?"success":"error";return h`
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

        ${!e.success&&e.error_msg?h`<div class="error-box"><strong>Error:</strong> ${e.error_msg}</div>`:v}
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
              `:v}
          ${t.cache_creation_tokens>0?h`
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
    `}renderOutput(e){return e.output?h`
      <sl-details summary="Output">
        <div class="content-block">${e.output}</div>
      </sl-details>
    `:v}renderThinking(e){return e.thinking?h`
      <sl-details summary="Thinking">
        <div class="content-block">${e.thinking}</div>
      </sl-details>
    `:v}renderToolItem(e){return h`
      <li class="tool-item">
        <span class="tool-name ${e.is_error?"error":""}">${e.name}</span>
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:v}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon class="tool-error-icon" name="x-circle-fill"></sl-icon>`:v}
      </li>
    `}renderTools(e){return!e.tools||e.tools.length===0?v:h`
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
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:v}
          ${e.output?h`<div class="verifier-output">${e.output}</div>`:v}
        </div>
      </div>
    `}renderVerification(e){if(!e.verification)return v;const t=e.verification,s=t.all_passed?"passed":"failed",i=t.results||[];return h`
      <sl-details summary="Verification">
        <div class="verification-header">
          <div class="verification-badge ${s}">
            <sl-icon name="${t.all_passed?"check-circle-fill":"x-circle-fill"}"></sl-icon>
            <span>${t.all_passed?"Verified":"Failed"}</span>
          </div>
        </div>
        ${i.length>0?h`
              <div class="verifier-results">
                ${i.map(o=>this.renderVerifierResult(o))}
              </div>
            `:v}
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
    `}};$t.styles=$`
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
  `;Gs([c({attribute:!1})],$t.prototype,"record",2);Gs([c({type:Boolean})],$t.prototype,"loading",2);Gs([c({type:String})],$t.prototype,"error",2);$t=Gs([me("run-record")],$t);var ac=Object.defineProperty,nc=Object.getOwnPropertyDescriptor,V=(e,t,s,i)=>{for(var o=i>1?void 0:i?nc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&ac(t,s,o),o};const lc={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},ko={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let j=class extends de{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.readonlyMode=!1,this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview",this.isCloudModeController=new ae.StoreController(this,ot)}get isCloudMode(){return this.isCloudModeController.value}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(e){e.has("tick")&&(this.resetActionState(),this.tick&&this.tick.type==="task"&&this.loadRunRecord())}async loadRunRecord(){if(this.tick){if(this.isCloudMode){this.loadingRunRecord=!1;return}this.loadingRunRecord=!0,this.runRecordError="",this.runRecord=null;try{this.runRecord=await jl(this.tick.id)}catch(e){this.runRecordError=e instanceof Error?e.message:"Failed to load run history"}finally{this.loadingRunRecord=!1}}}handleTickLinkClick(e){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:e},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null,this.runRecord=null,this.loadingRunRecord=!1,this.runRecordError="",this.expandedSections=new Set,this.activeTab="overview"}emitTickUpdated(e){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:e},bubbles:!0,composed:!0}))}async handleApprove(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ll(this.tick.id),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){var e;if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await Pl(this.tick.id,this.rejectReason.trim()),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Dl(this.tick.id,this.closeReason.trim()||void 0),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"done"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){var e;if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ml(this.tick.id),s={...t,is_blocked:(((e=t.blocked_by)==null?void 0:e.length)??0)>0,column:"ready"};this.emitTickUpdated(s),this.resetActionState()}catch(t){this.errorMessage=t instanceof Error?t.message:"Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){var t;if(!this.tick||!this.newNoteText.trim())return;const e=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:e},this.newNoteText="";try{const s=await Ol(this.tick.id,e);this.optimisticNote=null;const i={...s,is_blocked:(((t=s.blocked_by)==null?void 0:t.length)??0)>0,column:"ready",notesList:Mi(s.notes)};this.emitTickUpdated(i)}catch(s){this.optimisticNote=null,this.newNoteText=e,this.addNoteError=s instanceof Error?s.message:"Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(e){return lc[e]??"Unknown"}getPriorityColor(e){return ko[e]??ko[2]}renderActions(){const e=this.tick;if(!e)return v;const t=e.status==="open",s=e.status==="closed",i=!!e.awaiting,o=!!e.requires,r=t&&i,a=t&&!o,n=s;return!r&&!a&&!n?v:h`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?h`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:v}

        <div class="actions-section">
          ${r?h`
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
          ${a?h`
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
          ${n?h`
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

        ${this.showRejectInput?h`
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

        ${this.showCloseInput?h`
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
        ${this.parentTitle?h`<span class="link-title">${this.parentTitle}</span>`:v}
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
              >`:v}
        </div>
        <div class="note-text">${e.text}</div>
        ${t?h`<div class="note-sending">Sending...</div>`:v}
      </li>
    `}renderNotes(){const e=this.notesList&&this.notesList.length>0||this.optimisticNote;return h`
      ${e?h`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(t=>this.renderNoteItem(t))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):v}
              </ul>
            </div>
          `:h`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?h`
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
    `}toggleSection(e){const t=new Set(this.expandedSections);t.has(e)?t.delete(e):t.add(e),this.expandedSections=t}formatRunTimestamp(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}truncateText(e,t=60){return e.length<=t?e:e.slice(0,t)+"..."}renderVerification(){var i;if(((i=this.tick)==null?void 0:i.type)!=="task"||!this.runRecord)return v;const e=this.runRecord.verification;if(!e)return this.tick.status==="closed"?h`
          <div class="section">
            <div class="section-title">Verification</div>
            <div class="verification-badge pending">
              <sl-icon name="hourglass-split"></sl-icon>
              <span>Pending</span>
            </div>
          </div>
          <sl-divider></sl-divider>
        `:v;const t=e.all_passed,s=e.results||[];return h`
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-badge ${t?"passed":"failed"}">
          <sl-icon name="${t?"check-circle-fill":"x-circle-fill"}"></sl-icon>
          <span>${t?"Verified":"Failed"}</span>
        </div>

        ${s.length>0?h`
              <div class="verifier-results">
                ${s.map(o=>this.renderVerifierResult(o))}
              </div>
            `:v}
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
          ${e.error?h`<div class="verifier-error">${e.error}</div>`:v}
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
                ${s?h`<div class="verifier-output">${e.output}</div>`:v}
              `:v}
        </div>
      </div>
    `}renderRunHistory(){var i;if(((i=this.tick)==null?void 0:i.type)!=="task")return v;if(this.loadingRunRecord)return h`
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
            ${t?this.renderRunRecordBody(e):v}
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
            `:v}
        ${e.metrics.cache_creation_tokens>0?h`
              <div class="run-detail-row">
                <span class="run-detail-label">Cache Creation</span>
                <span class="run-detail-value">${this.formatTokenCount(e.metrics.cache_creation_tokens)}</span>
              </div>
            `:v}

        <!-- Error message if failed -->
        ${!e.success&&e.error_msg?h`
              <div class="run-error-msg">
                <strong>Error:</strong> ${e.error_msg}
              </div>
            `:v}

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
                    `:v}
              </div>
            `:v}

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
                    `:v}
              </div>
            `:v}

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
                    `:v}
              </div>
            `:v}

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
        ${e.input?h`<span class="tool-input-preview">${this.truncateText(e.input)}</span>`:v}
        <span class="tool-duration">${this.formatDuration(e.duration_ms)}</span>
        ${e.is_error?h`<sl-icon name="x-circle-fill" style="color: var(--red); font-size: 0.75rem;"></sl-icon>`:v}
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
            ${e.manual?h`<span class="meta-badge manual">👤 Manual</span>`:v}
            ${e.awaiting?h`<span class="meta-badge awaiting">⏳ ${e.awaiting}</span>`:v}
            ${e.verdict?h`<span class="meta-badge verdict-${e.verdict}"
                  >${e.verdict}</span
                >`:v}
            ${this.blockerDetails&&this.blockerDetails.length>0?h`<span class="meta-badge blocked">⊘ Blocked</span>`:v}
          </div>
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
              `:v}
        </div>

        <!-- Closed Reason (if applicable) -->
        ${e.closed_reason?h`
              <div class="section">
                <div class="section-title">Closed Reason</div>
                <div class="description">${e.closed_reason}</div>
              </div>
            `:v}
      </div>
    `:v}render(){const e=this.tick,t=this.shouldShowRunTab();return h`
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
  `;V([c({attribute:!1})],j.prototype,"tick",2);V([c({type:Boolean})],j.prototype,"open",2);V([c({attribute:!1})],j.prototype,"notesList",2);V([c({attribute:!1})],j.prototype,"blockerDetails",2);V([c({type:String,attribute:"parent-title"})],j.prototype,"parentTitle",2);V([c({type:Boolean,attribute:"readonly-mode"})],j.prototype,"readonlyMode",2);V([y()],j.prototype,"loading",2);V([y()],j.prototype,"errorMessage",2);V([y()],j.prototype,"showRejectInput",2);V([y()],j.prototype,"showCloseInput",2);V([y()],j.prototype,"rejectReason",2);V([y()],j.prototype,"closeReason",2);V([y()],j.prototype,"newNoteText",2);V([y()],j.prototype,"addingNote",2);V([y()],j.prototype,"addNoteError",2);V([y()],j.prototype,"optimisticNote",2);V([y()],j.prototype,"runRecord",2);V([y()],j.prototype,"loadingRunRecord",2);V([y()],j.prototype,"runRecordError",2);V([y()],j.prototype,"expandedSections",2);V([y()],j.prototype,"activeTab",2);j=V([me("tick-detail-drawer")],j);var cc=Object.defineProperty,dc=Object.getOwnPropertyDescriptor,ye=(e,t,s,i)=>{for(var o=i>1?void 0:i?dc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&cc(t,s,o),o};const uc=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],hc=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let le=class extends de{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1,this.error=null,this.loading=!1}handleDialogRequestClose(e){if(this.loading){e.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(e){const t=e.target;this.tickTitle=t.value}handleDescriptionInput(e){const t=e.target;this.tickDescription=t.value}handleTypeChange(e){const t=e.target;this.type=t.value}handlePriorityChange(e){const t=e.target;this.priority=parseInt(t.value,10)}handleParentChange(e){const t=e.target;this.parent=t.value}handleLabelsInput(e){const t=e.target;this.labels=t.value}handleManualChange(e){const t=e.target;this.manual=t.checked}async handleSubmit(){var t;if(!this.tickTitle.trim()){this.error="Title is required",(t=this.titleInput)==null||t.focus();return}this.loading=!0,this.error=null;const e={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(e.description=this.tickDescription.trim()),this.parent&&(e.parent=this.parent);try{const s=await Il(e);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:s,labels:this.labels?this.labels.split(",").map(i=>i.trim()).filter(Boolean):[],manual:this.manual},bubbles:!0,composed:!0})),this.handleClose()}catch(s){s instanceof dl?this.error=s.body||s.message:s instanceof Error?this.error=s.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return h`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?h`<div class="error-message">${this.error}</div>`:v}

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
              ${uc.map(e=>h`
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
              ${hc.map(e=>h`
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
          <div class="checkbox-field">
            <sl-checkbox
              ?checked=${this.manual}
              @sl-change=${this.handleManualChange}
              ?disabled=${this.loading}
            >
              Manual task
            </sl-checkbox>
          </div>
          <div class="checkbox-help">
            Manual tasks require human intervention and are skipped by automated agents.
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
    `}};le.styles=$`
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
  `;ye([c({type:Boolean})],le.prototype,"open",2);ye([c({type:Array,attribute:!1})],le.prototype,"epics",2);ye([y()],le.prototype,"loading",2);ye([y()],le.prototype,"error",2);ye([y()],le.prototype,"tickTitle",2);ye([y()],le.prototype,"tickDescription",2);ye([y()],le.prototype,"type",2);ye([y()],le.prototype,"priority",2);ye([y()],le.prototype,"parent",2);ye([y()],le.prototype,"labels",2);ye([y()],le.prototype,"manual",2);ye([C('sl-input[name="title"]')],le.prototype,"titleInput",2);le=ye([me("tick-create-dialog")],le);var pc=Object.defineProperty,mc=Object.getOwnPropertyDescriptor,lr=(e,t,s,i)=>{for(var o=i>1?void 0:i?mc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&pc(t,s,o),o};const fc=5e3;let bc=0;function gc(){return`toast-${++bc}-${Date.now()}`}let Ss=class extends de{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=e=>{this.showToast(e.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const e of this.dismissTimeouts.values())clearTimeout(e);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=e=>{this.showToast(e)}}removeGlobalApi(){delete window.showToast}showToast(e){const t={id:gc(),message:e.message,variant:e.variant??"primary",duration:e.duration??fc};if(this.toasts=[...this.toasts,t],t.duration>0){const s=setTimeout(()=>{this.dismissToast(t.id)},t.duration);this.dismissTimeouts.set(t.id,s)}}dismissToast(e){const t=this.dismissTimeouts.get(e);t&&(clearTimeout(t),this.dismissTimeouts.delete(e)),this.exitingToasts.add(e),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(e),this.toasts=this.toasts.filter(s=>s.id!==e)},300)}handleCloseRequest(e){this.dismissToast(e)}getIconForVariant(e){switch(e){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return h`
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
    `}};Ss.styles=$`
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
  `;lr([y()],Ss.prototype,"toasts",2);Ss=lr([me("tick-toast-stack")],Ss);var vc=Object.defineProperty,yc=Object.getOwnPropertyDescriptor,Ot=(e,t,s,i)=>{for(var o=i>1?void 0:i?yc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&vc(t,s,o),o};let nt=class extends de{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null,this.escapeHandler=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const e=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",e),this.lastSeenTimestamp=e}catch{}}}async loadActivities(){if(ot.get()){this.loading=!1;return}try{this.activities=await Hl(20),this.updateUnreadCount()}catch(e){console.error("Failed to load activities:",e)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(e=>e.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0,this.escapeHandler=e=>{e.key==="Escape"&&this.closeDropdown()},document.addEventListener("keydown",this.escapeHandler)}handleDropdownHide(){this.escapeHandler&&(document.removeEventListener("keydown",this.escapeHandler),this.escapeHandler=null)}closeDropdown(){var e;(e=this.dropdown)==null||e.hide()}handleActivityClick(e){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:e.tick},bubbles:!0,composed:!0}))}getActionIcon(e){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[e]||"•"}getActionDescription(e){const t=e.action,s=e.actor,i=e.data||{};switch(t){case"create":return`${s} created this tick`;case"update":return`${s} updated this tick`;case"close":return i.reason?`${s} closed: ${i.reason}`:`${s} closed this tick`;case"reopen":return`${s} reopened this tick`;case"note":return`${s} added a note`;case"approve":return`${s} approved this tick`;case"reject":return`${s} rejected this tick`;case"assign":return`${s} assigned to ${i.to||"someone"}`;case"awaiting":return`Waiting for ${i.awaiting||"human action"}`;case"block":return`${s} added a blocker`;case"unblock":return`${s} removed a blocker`;default:return`${s} performed ${t}`}}formatRelativeTime(e){const t=new Date(e),i=new Date().getTime()-t.getTime(),o=Math.floor(i/1e3),r=Math.floor(o/60),a=Math.floor(r/60),n=Math.floor(a/24);return o<60?"just now":r<60?`${r}m ago`:a<24?`${a}h ago`:n<7?`${n}d ago`:t.toLocaleDateString()}isUnread(e){return this.lastSeenTimestamp?e.ts>this.lastSeenTimestamp:!0}render(){return h`
      <sl-dropdown placement="bottom-end" hoist @sl-show=${this.handleDropdownShow} @sl-hide=${this.handleDropdownHide}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?h`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:v}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            <div class="menu-header-actions">
              ${this.activities.length>0?h`
                    <sl-button size="small" variant="text" @click=${this.loadActivities}>
                      <sl-icon name="arrow-clockwise"></sl-icon>
                    </sl-button>
                  `:v}
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
    `}};nt.styles=$`
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
  `;Ot([C("sl-dropdown")],nt.prototype,"dropdown",2);Ot([y()],nt.prototype,"activities",2);Ot([y()],nt.prototype,"loading",2);Ot([y()],nt.prototype,"unreadCount",2);Ot([y()],nt.prototype,"lastSeenTimestamp",2);nt=Ot([me("tick-activity-feed")],nt);var kc=Object.defineProperty,wc=Object.getOwnPropertyDescriptor,Le=(e,t,s,i)=>{for(var o=i>1?void 0:i?wc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&kc(t,s,o),o};const wo="run-output-pane-active-tab",xo={30:"ansi-black",31:"ansi-red",32:"ansi-green",33:"ansi-yellow",34:"ansi-blue",35:"ansi-magenta",36:"ansi-cyan",37:"ansi-white",90:"ansi-bright-black",91:"ansi-bright-red",92:"ansi-bright-green",93:"ansi-bright-yellow",94:"ansi-bright-blue",95:"ansi-bright-magenta",96:"ansi-bright-cyan",97:"ansi-bright-white",40:"ansi-bg-black",41:"ansi-bg-red",42:"ansi-bg-green",43:"ansi-bg-yellow",44:"ansi-bg-blue",45:"ansi-bg-magenta",46:"ansi-bg-cyan",47:"ansi-bg-white"},_o={1:"ansi-bold",2:"ansi-dim",3:"ansi-italic",4:"ansi-underline"};let pe=class extends de{constructor(){super(...arguments),this.epicId="",this.autoScroll=!0,this.lines=[],this.connectionStatus="disconnected",this.activeTaskId=null,this.activeTool=null,this.lastOutput="",this.activeTab="output",this.unregisterAdapter=null,this.userScrolled=!1}connectedCallback(){super.connectedCallback();const e=localStorage.getItem(wo);(e==="output"||e==="context")&&(this.activeTab=e),this.epicId&&this.connect()}disconnectedCallback(){super.disconnectedCallback(),this.disconnect()}updated(e){e.has("epicId")&&(this.disconnect(),this.epicId&&this.connect())}connect(){this.disconnect(),this.connectionStatus="connecting";const e={onEvent:o=>this.handleRunEvent(o),onConnected:()=>{this.connectionStatus="connected",this.addStatusLine(`Connected to run stream for epic ${this.epicId}`)},onDisconnected:()=>{this.connectionStatus="disconnected"},onError:o=>{console.error("[RunOutputPane] Stream error:",o)}},t=nr(this.epicId),s=tr(o=>{if(o.epicId!==this.epicId)return;const r=this.convertCommsRunEvent(o);r&&this.handleRunEvent(r)}),i=zl(o=>{if(o.epicId!==this.epicId)return;const r=this.convertCommsContextEvent(o);r&&this.handleRunEvent(r)});if(this.unregisterAdapter=()=>{t(),s(),i()},ft.get()==="connected")e.onConnected();else{const o=ft.subscribe(a=>{a==="connected"?e.onConnected():a==="disconnected"&&e.onDisconnected()}),r=this.unregisterAdapter;this.unregisterAdapter=()=>{r==null||r(),o()}}}convertCommsRunEvent(e){const s={"run:task-started":"task-started","run:task-update":"task-update","run:task-completed":"task-completed","run:tool-activity":"tool-activity","run:epic-started":"epic-started","run:epic-completed":"epic-completed"}[e.type];if(!s)return null;const i={epicId:e.epicId,taskId:e.taskId,source:"ralph",eventType:s,timestamp:e.timestamp};switch(e.type){case"run:task-started":return{...i,eventType:"task-started",status:e.status,numTurns:e.numTurns,metrics:e.metrics};case"run:task-update":return{...i,eventType:"task-update",output:e.output,status:e.status,numTurns:e.numTurns,metrics:e.metrics,activeTool:e.activeTool};case"run:task-completed":return{...i,eventType:"task-completed",success:e.success,numTurns:e.numTurns,metrics:e.metrics};case"run:tool-activity":return{...i,eventType:"tool-activity",activeTool:e.tool};case"run:epic-started":return{...i,eventType:"epic-started",status:e.status,message:e.message};case"run:epic-completed":return{...i,eventType:"epic-completed",success:e.success};default:return null}}convertCommsContextEvent(e){const t={epicId:e.epicId,source:"ralph",timestamp:new Date().toISOString()};switch(e.type){case"context:generating":return{...t,eventType:"context-generating"};case"context:generated":return{...t,eventType:"context-generated"};case"context:loaded":return{...t,eventType:"context-loaded"};case"context:failed":return{...t,eventType:"context-failed",message:e.message};case"context:skipped":return{...t,eventType:"context-skipped",message:e.reason};default:return null}}handleRunEvent(e){var t;switch(e.eventType){case"connected":break;case"task-started":this.activeTaskId=e.taskId||null,this.lastOutput="",this.addStatusLine(`Task ${e.taskId} started (iteration ${e.iteration??1})`);break;case"task-update":if(e.taskId&&e.taskId!==this.activeTaskId&&(this.activeTaskId=e.taskId),this.activeTool=((t=e.activeTool)==null?void 0:t.name)||null,e.output&&e.output!==this.lastOutput){const i=e.output.slice(this.lastOutput.length);i&&this.addOutputLines(i),this.lastOutput=e.output}break;case"tool-activity":e.activeTool&&(this.activeTool=e.activeTool.name,this.addToolLine(`⚙ ${e.activeTool.name}`));break;case"task-completed":const s=e.success?"✓ completed":"✗ failed";this.addStatusLine(`Task ${e.taskId} ${s}`),this.activeTaskId===e.taskId&&(this.activeTaskId=null,this.activeTool=null,this.lastOutput="");break;case"epic-started":this.addStatusLine(`Epic ${e.epicId} started (${e.source})`);break;case"epic-completed":this.addStatusLine(`Epic completed: ${e.success?"success":"failed"}`),this.activeTaskId=null,this.activeTool=null;break;case"context-generating":this.addStatusLine("📚 Generating epic context...");break;case"context-generated":this.addStatusLine("✓ Context generated");break;case"context-loaded":this.addStatusLine("📖 Using existing context");break;case"context-failed":this.addStatusLine(`⚠ Context generation failed: ${e.message??"unknown error"}`);break;case"context-skipped":this.addStatusLine(`⏭ Context skipped: ${e.message??"single-task epic"}`);break}}disconnect(){this.unregisterAdapter&&(this.unregisterAdapter(),this.unregisterAdapter=null)}addStatusLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"status"}],this.scrollToBottom()}addToolLine(e){this.lines=[...this.lines,{timestamp:new Date,content:e,type:"tool"}],this.scrollToBottom()}addOutputLines(e){const t=new Date,s=e.split(`
`).filter(i=>i.length>0).map(i=>({timestamp:t,content:i,type:"output"}));s.length>0&&(this.lines=[...this.lines,...s],this.scrollToBottom())}scrollToBottom(){!this.autoScroll||this.userScrolled||requestAnimationFrame(()=>{this.outputContainer&&(this.outputContainer.scrollTop=this.outputContainer.scrollHeight)})}handleScroll(){if(!this.outputContainer)return;const{scrollTop:e,scrollHeight:t,clientHeight:s}=this.outputContainer,i=t-e-s<20;this.userScrolled=!i}toggleAutoScroll(){this.autoScroll=!this.autoScroll,this.autoScroll&&(this.userScrolled=!1,this.scrollToBottom())}handleTabShow(e){const t=e.detail.name;this.activeTab=t,localStorage.setItem(wo,t)}clearOutput(){this.lines=[],this.lastOutput="",this.userScrolled=!1}async copyOutput(){const e=this.lines.map(t=>`[${this.formatTimestamp(t.timestamp)}] ${t.content}`).join(`
`);try{await navigator.clipboard.writeText(e),window.showToast&&window.showToast({message:"Output copied to clipboard",variant:"success"})}catch(t){console.error("Failed to copy output:",t)}}formatTimestamp(e){return e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1})}ansiToHtml(e){let t=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const s=[],i=/\x1b\[([0-9;]*)m/g;return t=t.replace(i,(o,r)=>{let a=s.length>0?"</span>":"";s.length=0;const n=r?r.split(";").map(Number):[0];for(const u of n)u===0?s.length=0:xo[u]?s.push(xo[u]):_o[u]&&s.push(_o[u]);return s.length>0&&(a+=`<span class="${s.join(" ")}">`),a}),s.length>0&&(t+="</span>"),t}getStatusText(){switch(this.connectionStatus){case"connected":return"Connected";case"connecting":return"Connecting...";case"disconnected":return"Disconnected"}}renderOutputContent(){return h`
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
                  ${e.type==="output"?Oi(this.ansiToHtml(e.content)):e.content}
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

        ${this.activeTab==="output"&&(this.activeTaskId||this.activeTool)?h`
              <div class="pane-footer">
                <div class="active-task">
                  ${this.activeTaskId?h`
                        <span class="active-task-label">Task:</span>
                        <span class="active-task-id">${this.activeTaskId}</span>
                      `:v}
                  ${this.activeTool?h`
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
    `}};pe.styles=$`
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
  `;Le([c({type:String,attribute:"epic-id"})],pe.prototype,"epicId",2);Le([c({type:Boolean,attribute:"auto-scroll"})],pe.prototype,"autoScroll",2);Le([y()],pe.prototype,"lines",2);Le([y()],pe.prototype,"connectionStatus",2);Le([y()],pe.prototype,"activeTaskId",2);Le([y()],pe.prototype,"activeTool",2);Le([y()],pe.prototype,"lastOutput",2);Le([y()],pe.prototype,"activeTab",2);Le([C(".output-container")],pe.prototype,"outputContainer",2);Le([C("context-pane")],pe.prototype,"contextPane",2);pe=Le([me("run-output-pane")],pe);var xc=Object.defineProperty,_c=Object.getOwnPropertyDescriptor,Ys=(e,t,s,i)=>{for(var o=i>1?void 0:i?_c(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&xc(t,s,o),o};const Cc={Read:"file-earmark-text",Write:"file-earmark-plus",Edit:"pencil-square",Bash:"terminal",Glob:"search",Grep:"file-earmark-code",Task:"list-task",WebFetch:"globe",WebSearch:"search",TodoWrite:"check2-square",AskUserQuestion:"chat-left-dots",NotebookEdit:"journal-code",KillShell:"x-circle",TaskOutput:"box-arrow-right",Skill:"lightning",EnterPlanMode:"map",ExitPlanMode:"check2-circle"},$c={Read:"var(--blue, #89b4fa)",Write:"var(--green, #a6e3a1)",Edit:"var(--yellow, #f9e2af)",Bash:"var(--peach, #fab387)",Glob:"var(--teal, #94e2d5)",Grep:"var(--sapphire, #74c7ec)",Task:"var(--mauve, #cba6f7)",WebFetch:"var(--sky, #89dceb)",WebSearch:"var(--sky, #89dceb)",TodoWrite:"var(--lavender, #b4befe)",AskUserQuestion:"var(--pink, #f5c2e7)",NotebookEdit:"var(--flamingo, #f2cdcd)",KillShell:"var(--red, #f38ba8)",TaskOutput:"var(--rosewater, #f5e0dc)",Skill:"var(--maroon, #eba0ac)",EnterPlanMode:"var(--lavender, #b4befe)",ExitPlanMode:"var(--green, #a6e3a1)"};let Tt=class extends de{constructor(){super(...arguments),this.activity=null,this.expanded=!1,this.elapsedMs=0,this.timerInterval=null}connectedCallback(){super.connectedCallback(),this.startTimer()}disconnectedCallback(){super.disconnectedCallback(),this.stopTimer()}updated(e){e.has("activity")&&this.updateTimer()}startTimer(){this.timerInterval||(this.timerInterval=setInterval(()=>{if(this.activity&&!this.activity.isComplete&&this.activity.startedAt){const e=this.activity.startedAt instanceof Date?this.activity.startedAt.getTime():new Date(this.activity.startedAt).getTime();this.elapsedMs=Date.now()-e}},100))}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}updateTimer(){var e;(e=this.activity)!=null&&e.isComplete?(this.stopTimer(),this.activity.durationMs!==void 0&&(this.elapsedMs=this.activity.durationMs)):this.activity&&!this.timerInterval&&this.startTimer()}getToolIcon(e){return Cc[e]??"gear"}getToolColor(e){return $c[e]??"var(--mauve, #cba6f7)"}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3),s=e%1e3;if(t<60)return`${t}.${Math.floor(s/100)}s`;const i=Math.floor(t/60),o=t%60;return`${i}m ${o}s`}truncateInput(e,t=50){return e.length<=t?e:e.slice(0,t)+"..."}getStatusClass(){return this.activity?this.activity.isError?"error":this.activity.isComplete?"complete":"running":""}renderCompact(){const{activity:e}=this;if(!e)return h`
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
        ${e.input?h`<span class="tool-input-preview">${this.truncateInput(e.input)}</span>`:v}
        ${i>0?h`<span class="tool-duration">${this.formatDuration(i)}</span>`:v}
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
          ${i>0?h`<span class="tool-duration">${this.formatDuration(i)}</span>`:v}
        </div>
        <div class="tool-body">
          ${e.input?h`
                <div class="tool-section">
                  <div class="tool-section-label">Input</div>
                  <div class="tool-section-content">${e.input}</div>
                </div>
              `:v}
          ${e.output?h`
                <div class="tool-section">
                  <div class="tool-section-label">Output</div>
                  <div class="tool-section-content ${e.isError?"error-content":""}">${e.output}</div>
                </div>
              `:v}
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};Tt.styles=$`
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
  `;Ys([c({attribute:!1})],Tt.prototype,"activity",2);Ys([c({type:Boolean})],Tt.prototype,"expanded",2);Ys([y()],Tt.prototype,"elapsedMs",2);Tt=Ys([me("tool-activity")],Tt);var Tc=Object.defineProperty,Sc=Object.getOwnPropertyDescriptor,ss=(e,t,s,i)=>{for(var o=i>1?void 0:i?Sc(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&Tc(t,s,o),o};let bt=class extends de{constructor(){super(...arguments),this.metrics=null,this.model="",this.live=!1,this.expanded=!1}formatTokenCount(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString()}formatCost(e){return e===0?"$0.00":e<.01?`$${e.toFixed(4)}`:e<1?`$${e.toFixed(3)}`:`$${e.toFixed(2)}`}formatDuration(e){if(e<1e3)return`${e}ms`;const t=Math.floor(e/1e3);if(t<60)return`${t}s`;const s=Math.floor(t/60),i=t%60;return`${s}m ${i}s`}getTotalTokens(){return this.metrics?this.metrics.inputTokens+this.metrics.outputTokens+this.metrics.cacheReadTokens+this.metrics.cacheCreationTokens:0}getTokenPercentage(e){const t=this.getTotalTokens();return t===0?0:e/t*100}renderCompact(){if(!this.metrics)return h`
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
            `:v}
      </div>
    `}renderExpanded(){if(!this.metrics)return h`
        <div class="empty-state">
          <sl-icon name="bar-chart"></sl-icon>
          <span>No metrics available</span>
        </div>
      `;const{inputTokens:e,outputTokens:t,cacheReadTokens:s,cacheCreationTokens:i,costUsd:o,durationMs:r}=this.metrics,a=this.getTotalTokens();return h`
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
              `:v}
        </div>
        <div class="metrics-body">
          <!-- Token distribution bar -->
          <div class="token-bar-container">
            <div class="token-bar-label">
              <span>Token Distribution</span>
              <span>${this.formatTokenCount(a)} total</span>
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
              <div class="summary-value cost">${this.formatCost(o)}</div>
            </div>
            ${r!==void 0?h`
                  <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value duration">${this.formatDuration(r)}</div>
                  </div>
                `:v}
            ${this.model?h`
                  <div class="summary-item">
                    <div class="summary-label">Model</div>
                    <div class="summary-value model">${this.model}</div>
                  </div>
                `:v}
          </div>
        </div>
      </div>
    `}render(){return this.expanded?this.renderExpanded():this.renderCompact()}};bt.styles=$`
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
  `;ss([c({attribute:!1})],bt.prototype,"metrics",2);ss([c({type:String})],bt.prototype,"model",2);ss([c({type:Boolean})],bt.prototype,"live",2);ss([c({type:Boolean})],bt.prototype,"expanded",2);bt=ss([me("run-metrics")],bt);function Fi(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var kt=Fi();function cr(e){kt=e}var Kt={exec:()=>null};function R(e,t=""){let s=typeof e=="string"?e:e.source,i={replace:(o,r)=>{let a=typeof r=="string"?r:r.source;return a=a.replace(ne.caret,"$1"),s=s.replace(o,a),i},getRegex:()=>new RegExp(s,t)};return i}var Ec=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),ne={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>new RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,"i")},zc=/^(?:[ \t]*(?:\n|$))+/,Rc=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Ac=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,is=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Ic=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,Bi=/(?:[*+-]|\d{1,9}[.)])/,dr=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,ur=R(dr).replace(/bull/g,Bi).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Oc=R(dr).replace(/bull/g,Bi).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),Ni=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,Lc=/^[^\n]+/,Hi=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Pc=R(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Hi).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Dc=R(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,Bi).getRegex(),Xs="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",ji=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Mc=R("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",ji).replace("tag",Xs).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),hr=R(Ni).replace("hr",is).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Xs).getRegex(),Fc=R(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",hr).getRegex(),Ui={blockquote:Fc,code:Rc,def:Pc,fences:Ac,heading:Ic,hr:is,html:Mc,lheading:ur,list:Dc,newline:zc,paragraph:hr,table:Kt,text:Lc},Co=R("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",is).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Xs).getRegex(),Bc={...Ui,lheading:Oc,table:Co,paragraph:R(Ni).replace("hr",is).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Co).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Xs).getRegex()},Nc={...Ui,html:R(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",ji).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:Kt,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:R(Ni).replace("hr",is).replace("heading",` *#{1,6} *[^
]`).replace("lheading",ur).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Hc=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,jc=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,pr=/^( {2,}|\\)\n(?!\s*$)/,Uc=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,Zs=/[\p{P}\p{S}]/u,Vi=/[\s\p{P}\p{S}]/u,mr=/[^\s\p{P}\p{S}]/u,Vc=R(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Vi).getRegex(),fr=/(?!~)[\p{P}\p{S}]/u,Wc=/(?!~)[\s\p{P}\p{S}]/u,qc=/(?:[^\s\p{P}\p{S}]|~)/u,Kc=R(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Ec?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),br=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Gc=R(br,"u").replace(/punct/g,Zs).getRegex(),Yc=R(br,"u").replace(/punct/g,fr).getRegex(),gr="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Xc=R(gr,"gu").replace(/notPunctSpace/g,mr).replace(/punctSpace/g,Vi).replace(/punct/g,Zs).getRegex(),Zc=R(gr,"gu").replace(/notPunctSpace/g,qc).replace(/punctSpace/g,Wc).replace(/punct/g,fr).getRegex(),Qc=R("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,mr).replace(/punctSpace/g,Vi).replace(/punct/g,Zs).getRegex(),Jc=R(/\\(punct)/,"gu").replace(/punct/g,Zs).getRegex(),ed=R(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),td=R(ji).replace("(?:-->|$)","-->").getRegex(),sd=R("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",td).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Es=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,id=R(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Es).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),vr=R(/^!?\[(label)\]\[(ref)\]/).replace("label",Es).replace("ref",Hi).getRegex(),yr=R(/^!?\[(ref)\](?:\[\])?/).replace("ref",Hi).getRegex(),od=R("reflink|nolink(?!\\()","g").replace("reflink",vr).replace("nolink",yr).getRegex(),$o=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Wi={_backpedal:Kt,anyPunctuation:Jc,autolink:ed,blockSkip:Kc,br:pr,code:jc,del:Kt,emStrongLDelim:Gc,emStrongRDelimAst:Xc,emStrongRDelimUnd:Qc,escape:Hc,link:id,nolink:yr,punctuation:Vc,reflink:vr,reflinkSearch:od,tag:sd,text:Uc,url:Kt},rd={...Wi,link:R(/^!?\[(label)\]\((.*?)\)/).replace("label",Es).getRegex(),reflink:R(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Es).getRegex()},ki={...Wi,emStrongRDelimAst:Zc,emStrongLDelim:Yc,url:R(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",$o).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:R(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",$o).getRegex()},ad={...ki,br:R(pr).replace("{2,}","*").getRegex(),text:R(ki.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},ds={normal:Ui,gfm:Bc,pedantic:Nc},Ht={normal:Wi,gfm:ki,breaks:ad,pedantic:rd},nd={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},To=e=>nd[e];function qe(e,t){if(t){if(ne.escapeTest.test(e))return e.replace(ne.escapeReplace,To)}else if(ne.escapeTestNoEncode.test(e))return e.replace(ne.escapeReplaceNoEncode,To);return e}function So(e){try{e=encodeURI(e).replace(ne.percentDecode,"%")}catch{return null}return e}function Eo(e,t){var r;let s=e.replace(ne.findPipe,(a,n,u)=>{let d=!1,p=n;for(;--p>=0&&u[p]==="\\";)d=!d;return d?"|":" |"}),i=s.split(ne.splitPipe),o=0;if(i[0].trim()||i.shift(),i.length>0&&!((r=i.at(-1))!=null&&r.trim())&&i.pop(),t)if(i.length>t)i.splice(t);else for(;i.length<t;)i.push("");for(;o<i.length;o++)i[o]=i[o].trim().replace(ne.slashPipe,"|");return i}function jt(e,t,s){let i=e.length;if(i===0)return"";let o=0;for(;o<i&&e.charAt(i-o-1)===t;)o++;return e.slice(0,i-o)}function ld(e,t){if(e.indexOf(t[1])===-1)return-1;let s=0;for(let i=0;i<e.length;i++)if(e[i]==="\\")i++;else if(e[i]===t[0])s++;else if(e[i]===t[1]&&(s--,s<0))return i;return s>0?-2:-1}function zo(e,t,s,i,o){let r=t.href,a=t.title||null,n=e[1].replace(o.other.outputLinkReplace,"$1");i.state.inLink=!0;let u={type:e[0].charAt(0)==="!"?"image":"link",raw:s,href:r,title:a,text:n,tokens:i.inlineTokens(n)};return i.state.inLink=!1,u}function cd(e,t,s){let i=e.match(s.other.indentCodeCompensation);if(i===null)return t;let o=i[1];return t.split(`
`).map(r=>{let a=r.match(s.other.beginningSpace);if(a===null)return r;let[n]=a;return n.length>=o.length?r.slice(o.length):r}).join(`
`)}var zs=class{constructor(e){M(this,"options");M(this,"rules");M(this,"lexer");this.options=e||kt}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let s=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?s:jt(s,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let s=t[0],i=cd(s,t[3]||"",this.rules);return{type:"code",raw:s,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:i}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let s=t[2].trim();if(this.rules.other.endingHash.test(s)){let i=jt(s,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(s=i.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:s,tokens:this.lexer.inline(s)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:jt(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let s=jt(t[0],`
`).split(`
`),i="",o="",r=[];for(;s.length>0;){let a=!1,n=[],u;for(u=0;u<s.length;u++)if(this.rules.other.blockquoteStart.test(s[u]))n.push(s[u]),a=!0;else if(!a)n.push(s[u]);else break;s=s.slice(u);let d=n.join(`
`),p=d.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${d}`:d,o=o?`${o}
${p}`:p;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,r,!0),this.lexer.state.top=f,s.length===0)break;let b=r.at(-1);if((b==null?void 0:b.type)==="code")break;if((b==null?void 0:b.type)==="blockquote"){let m=b,g=m.raw+`
`+s.join(`
`),k=this.blockquote(g);r[r.length-1]=k,i=i.substring(0,i.length-m.raw.length)+k.raw,o=o.substring(0,o.length-m.text.length)+k.text;break}else if((b==null?void 0:b.type)==="list"){let m=b,g=m.raw+`
`+s.join(`
`),k=this.list(g);r[r.length-1]=k,i=i.substring(0,i.length-b.raw.length)+k.raw,o=o.substring(0,o.length-m.raw.length)+k.raw,s=g.substring(r.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:r,text:o}}}list(e){var s,i;let t=this.rules.block.list.exec(e);if(t){let o=t[1].trim(),r=o.length>1,a={type:"list",raw:"",ordered:r,start:r?+o.slice(0,-1):"",loose:!1,items:[]};o=r?`\\d{1,9}\\${o.slice(-1)}`:`\\${o}`,this.options.pedantic&&(o=r?o:"[*+-]");let n=this.rules.other.listItemRegex(o),u=!1;for(;e;){let p=!1,f="",b="";if(!(t=n.exec(e))||this.rules.block.hr.test(e))break;f=t[0],e=e.substring(f.length);let m=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,_=>" ".repeat(3*_.length)),g=e.split(`
`,1)[0],k=!m.trim(),w=0;if(this.options.pedantic?(w=2,b=m.trimStart()):k?w=t[1].length+1:(w=t[2].search(this.rules.other.nonSpaceChar),w=w>4?1:w,b=m.slice(w),w+=t[1].length),k&&this.rules.other.blankLine.test(g)&&(f+=g+`
`,e=e.substring(g.length+1),p=!0),!p){let _=this.rules.other.nextBulletRegex(w),E=this.rules.other.hrRegex(w),I=this.rules.other.fencesBeginRegex(w),W=this.rules.other.headingBeginRegex(w),H=this.rules.other.htmlBeginRegex(w);for(;e;){let oe=e.split(`
`,1)[0],U;if(g=oe,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),U=g):U=g.replace(this.rules.other.tabCharGlobal,"    "),I.test(g)||W.test(g)||H.test(g)||_.test(g)||E.test(g))break;if(U.search(this.rules.other.nonSpaceChar)>=w||!g.trim())b+=`
`+U.slice(w);else{if(k||m.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||I.test(m)||W.test(m)||E.test(m))break;b+=`
`+g}!k&&!g.trim()&&(k=!0),f+=oe+`
`,e=e.substring(oe.length+1),m=U.slice(w)}}a.loose||(u?a.loose=!0:this.rules.other.doubleBlankLine.test(f)&&(u=!0)),a.items.push({type:"list_item",raw:f,task:!!this.options.gfm&&this.rules.other.listIsTask.test(b),loose:!1,text:b,tokens:[]}),a.raw+=f}let d=a.items.at(-1);if(d)d.raw=d.raw.trimEnd(),d.text=d.text.trimEnd();else return;a.raw=a.raw.trimEnd();for(let p of a.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((s=p.tokens[0])==null?void 0:s.type)==="text"||((i=p.tokens[0])==null?void 0:i.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let b=this.lexer.inlineQueue.length-1;b>=0;b--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[b].src)){this.lexer.inlineQueue[b].src=this.lexer.inlineQueue[b].src.replace(this.rules.other.listReplaceTask,"");break}}let f=this.rules.other.listTaskCheckbox.exec(p.raw);if(f){let b={type:"checkbox",raw:f[0]+" ",checked:f[0]!=="[ ]"};p.checked=b.checked,a.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=b.raw+p.tokens[0].raw,p.tokens[0].text=b.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(b)):p.tokens.unshift({type:"paragraph",raw:b.raw,text:b.raw,tokens:[b]}):p.tokens.unshift(b)}}if(!a.loose){let f=p.tokens.filter(m=>m.type==="space"),b=f.length>0&&f.some(m=>this.rules.other.anyLine.test(m.raw));a.loose=b}}if(a.loose)for(let p of a.items){p.loose=!0;for(let f of p.tokens)f.type==="text"&&(f.type="paragraph")}return a}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let s=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",o=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:s,raw:t[0],href:i,title:o}}}table(e){var a;let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let s=Eo(t[1]),i=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),o=(a=t[3])!=null&&a.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],r={type:"table",raw:t[0],header:[],align:[],rows:[]};if(s.length===i.length){for(let n of i)this.rules.other.tableAlignRight.test(n)?r.align.push("right"):this.rules.other.tableAlignCenter.test(n)?r.align.push("center"):this.rules.other.tableAlignLeft.test(n)?r.align.push("left"):r.align.push(null);for(let n=0;n<s.length;n++)r.header.push({text:s[n],tokens:this.lexer.inline(s[n]),header:!0,align:r.align[n]});for(let n of o)r.rows.push(Eo(n,r.header.length).map((u,d)=>({text:u,tokens:this.lexer.inline(u),header:!1,align:r.align[d]})));return r}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let s=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:s,tokens:this.lexer.inline(s)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let s=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(s)){if(!this.rules.other.endAngleBracket.test(s))return;let r=jt(s.slice(0,-1),"\\");if((s.length-r.length)%2===0)return}else{let r=ld(t[2],"()");if(r===-2)return;if(r>-1){let a=(t[0].indexOf("!")===0?5:4)+t[1].length+r;t[2]=t[2].substring(0,r),t[0]=t[0].substring(0,a).trim(),t[3]=""}}let i=t[2],o="";if(this.options.pedantic){let r=this.rules.other.pedanticHrefTitle.exec(i);r&&(i=r[1],o=r[3])}else o=t[3]?t[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(s)?i=i.slice(1):i=i.slice(1,-1)),zo(t,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:o&&o.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let s;if((s=this.rules.inline.reflink.exec(e))||(s=this.rules.inline.nolink.exec(e))){let i=(s[2]||s[1]).replace(this.rules.other.multipleSpaceGlobal," "),o=t[i.toLowerCase()];if(!o){let r=s[0].charAt(0);return{type:"text",raw:r,text:r}}return zo(s,o,s[0],this.lexer,this.rules)}}emStrong(e,t,s=""){let i=this.rules.inline.emStrongLDelim.exec(e);if(!(!i||i[3]&&s.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[2])||!s||this.rules.inline.punctuation.exec(s))){let o=[...i[0]].length-1,r,a,n=o,u=0,d=i[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(d.lastIndex=0,t=t.slice(-1*e.length+o);(i=d.exec(t))!=null;){if(r=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!r)continue;if(a=[...r].length,i[3]||i[4]){n+=a;continue}else if((i[5]||i[6])&&o%3&&!((o+a)%3)){u+=a;continue}if(n-=a,n>0)continue;a=Math.min(a,a+n+u);let p=[...i[0]][0].length,f=e.slice(0,o+i.index+p+a);if(Math.min(o,a)%2){let m=f.slice(1,-1);return{type:"em",raw:f,text:m,tokens:this.lexer.inlineTokens(m)}}let b=f.slice(2,-2);return{type:"strong",raw:f,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let s=t[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(s),o=this.rules.other.startingSpaceChar.test(s)&&this.rules.other.endingSpaceChar.test(s);return i&&o&&(s=s.substring(1,s.length-1)),{type:"codespan",raw:t[0],text:s}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){let t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let s,i;return t[2]==="@"?(s=t[1],i="mailto:"+s):(s=t[1],i=s),{type:"link",raw:t[0],text:s,href:i,tokens:[{type:"text",raw:s,text:s}]}}}url(e){var s;let t;if(t=this.rules.inline.url.exec(e)){let i,o;if(t[2]==="@")i=t[0],o="mailto:"+i;else{let r;do r=t[0],t[0]=((s=this.rules.inline._backpedal.exec(t[0]))==null?void 0:s[0])??"";while(r!==t[0]);i=t[0],t[1]==="www."?o="http://"+t[0]:o=t[0]}return{type:"link",raw:t[0],text:i,href:o,tokens:[{type:"text",raw:i,text:i}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let s=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:s}}}},Se=class wi{constructor(t){M(this,"tokens");M(this,"options");M(this,"state");M(this,"inlineQueue");M(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||kt,this.options.tokenizer=this.options.tokenizer||new zs,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let s={other:ne,block:ds.normal,inline:Ht.normal};this.options.pedantic?(s.block=ds.pedantic,s.inline=Ht.pedantic):this.options.gfm&&(s.block=ds.gfm,this.options.breaks?s.inline=Ht.breaks:s.inline=Ht.gfm),this.tokenizer.rules=s}static get rules(){return{block:ds,inline:Ht}}static lex(t,s){return new wi(s).lex(t)}static lexInline(t,s){return new wi(s).inlineTokens(t)}lex(t){t=t.replace(ne.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let s=0;s<this.inlineQueue.length;s++){let i=this.inlineQueue[s];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,s=[],i=!1){var o,r,a;for(this.options.pedantic&&(t=t.replace(ne.tabCharGlobal,"    ").replace(ne.spaceLine,""));t;){let n;if((r=(o=this.options.extensions)==null?void 0:o.block)!=null&&r.some(d=>(n=d.call({lexer:this},t,s))?(t=t.substring(n.raw.length),s.push(n),!0):!1))continue;if(n=this.tokenizer.space(t)){t=t.substring(n.raw.length);let d=s.at(-1);n.raw.length===1&&d!==void 0?d.raw+=`
`:s.push(n);continue}if(n=this.tokenizer.code(t)){t=t.substring(n.raw.length);let d=s.at(-1);(d==null?void 0:d.type)==="paragraph"||(d==null?void 0:d.type)==="text"?(d.raw+=(d.raw.endsWith(`
`)?"":`
`)+n.raw,d.text+=`
`+n.text,this.inlineQueue.at(-1).src=d.text):s.push(n);continue}if(n=this.tokenizer.fences(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.heading(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.hr(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.blockquote(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.list(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.html(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.def(t)){t=t.substring(n.raw.length);let d=s.at(-1);(d==null?void 0:d.type)==="paragraph"||(d==null?void 0:d.type)==="text"?(d.raw+=(d.raw.endsWith(`
`)?"":`
`)+n.raw,d.text+=`
`+n.raw,this.inlineQueue.at(-1).src=d.text):this.tokens.links[n.tag]||(this.tokens.links[n.tag]={href:n.href,title:n.title},s.push(n));continue}if(n=this.tokenizer.table(t)){t=t.substring(n.raw.length),s.push(n);continue}if(n=this.tokenizer.lheading(t)){t=t.substring(n.raw.length),s.push(n);continue}let u=t;if((a=this.options.extensions)!=null&&a.startBlock){let d=1/0,p=t.slice(1),f;this.options.extensions.startBlock.forEach(b=>{f=b.call({lexer:this},p),typeof f=="number"&&f>=0&&(d=Math.min(d,f))}),d<1/0&&d>=0&&(u=t.substring(0,d+1))}if(this.state.top&&(n=this.tokenizer.paragraph(u))){let d=s.at(-1);i&&(d==null?void 0:d.type)==="paragraph"?(d.raw+=(d.raw.endsWith(`
`)?"":`
`)+n.raw,d.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=d.text):s.push(n),i=u.length!==t.length,t=t.substring(n.raw.length);continue}if(n=this.tokenizer.text(t)){t=t.substring(n.raw.length);let d=s.at(-1);(d==null?void 0:d.type)==="text"?(d.raw+=(d.raw.endsWith(`
`)?"":`
`)+n.raw,d.text+=`
`+n.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=d.text):s.push(n);continue}if(t){let d="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(d);break}else throw new Error(d)}}return this.state.top=!0,s}inline(t,s=[]){return this.inlineQueue.push({src:t,tokens:s}),s}inlineTokens(t,s=[]){var u,d,p,f,b;let i=t,o=null;if(this.tokens.links){let m=Object.keys(this.tokens.links);if(m.length>0)for(;(o=this.tokenizer.rules.inline.reflinkSearch.exec(i))!=null;)m.includes(o[0].slice(o[0].lastIndexOf("[")+1,-1))&&(i=i.slice(0,o.index)+"["+"a".repeat(o[0].length-2)+"]"+i.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(o=this.tokenizer.rules.inline.anyPunctuation.exec(i))!=null;)i=i.slice(0,o.index)+"++"+i.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let r;for(;(o=this.tokenizer.rules.inline.blockSkip.exec(i))!=null;)r=o[2]?o[2].length:0,i=i.slice(0,o.index+r)+"["+"a".repeat(o[0].length-r-2)+"]"+i.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);i=((d=(u=this.options.hooks)==null?void 0:u.emStrongMask)==null?void 0:d.call({lexer:this},i))??i;let a=!1,n="";for(;t;){a||(n=""),a=!1;let m;if((f=(p=this.options.extensions)==null?void 0:p.inline)!=null&&f.some(k=>(m=k.call({lexer:this},t,s))?(t=t.substring(m.raw.length),s.push(m),!0):!1))continue;if(m=this.tokenizer.escape(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.tag(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.link(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(m.raw.length);let k=s.at(-1);m.type==="text"&&(k==null?void 0:k.type)==="text"?(k.raw+=m.raw,k.text+=m.text):s.push(m);continue}if(m=this.tokenizer.emStrong(t,i,n)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.codespan(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.br(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.del(t)){t=t.substring(m.raw.length),s.push(m);continue}if(m=this.tokenizer.autolink(t)){t=t.substring(m.raw.length),s.push(m);continue}if(!this.state.inLink&&(m=this.tokenizer.url(t))){t=t.substring(m.raw.length),s.push(m);continue}let g=t;if((b=this.options.extensions)!=null&&b.startInline){let k=1/0,w=t.slice(1),_;this.options.extensions.startInline.forEach(E=>{_=E.call({lexer:this},w),typeof _=="number"&&_>=0&&(k=Math.min(k,_))}),k<1/0&&k>=0&&(g=t.substring(0,k+1))}if(m=this.tokenizer.inlineText(g)){t=t.substring(m.raw.length),m.raw.slice(-1)!=="_"&&(n=m.raw.slice(-1)),a=!0;let k=s.at(-1);(k==null?void 0:k.type)==="text"?(k.raw+=m.raw,k.text+=m.text):s.push(m);continue}if(t){let k="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(k);break}else throw new Error(k)}}return s}},Rs=class{constructor(e){M(this,"options");M(this,"parser");this.options=e||kt}space(e){return""}code({text:e,lang:t,escaped:s}){var r;let i=(r=(t||"").match(ne.notSpaceStart))==null?void 0:r[0],o=e.replace(ne.endingNewline,"")+`
`;return i?'<pre><code class="language-'+qe(i)+'">'+(s?o:qe(o,!0))+`</code></pre>
`:"<pre><code>"+(s?o:qe(o,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,s=e.start,i="";for(let a=0;a<e.items.length;a++){let n=e.items[a];i+=this.listitem(n)}let o=t?"ol":"ul",r=t&&s!==1?' start="'+s+'"':"";return"<"+o+r+`>
`+i+"</"+o+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",s="";for(let o=0;o<e.header.length;o++)s+=this.tablecell(e.header[o]);t+=this.tablerow({text:s});let i="";for(let o=0;o<e.rows.length;o++){let r=e.rows[o];s="";for(let a=0;a<r.length;a++)s+=this.tablecell(r[a]);i+=this.tablerow({text:s})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+i+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),s=e.header?"th":"td";return(e.align?`<${s} align="${e.align}">`:`<${s}>`)+t+`</${s}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${qe(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:s}){let i=this.parser.parseInline(s),o=So(e);if(o===null)return i;e=o;let r='<a href="'+e+'"';return t&&(r+=' title="'+qe(t)+'"'),r+=">"+i+"</a>",r}image({href:e,title:t,text:s,tokens:i}){i&&(s=this.parser.parseInline(i,this.parser.textRenderer));let o=So(e);if(o===null)return qe(s);e=o;let r=`<img src="${e}" alt="${s}"`;return t&&(r+=` title="${qe(t)}"`),r+=">",r}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:qe(e.text)}},qi=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Ee=class xi{constructor(t){M(this,"options");M(this,"renderer");M(this,"textRenderer");this.options=t||kt,this.options.renderer=this.options.renderer||new Rs,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new qi}static parse(t,s){return new xi(s).parse(t)}static parseInline(t,s){return new xi(s).parseInline(t)}parse(t){var i,o;let s="";for(let r=0;r<t.length;r++){let a=t[r];if((o=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&o[a.type]){let u=a,d=this.options.extensions.renderers[u.type].call({parser:this},u);if(d!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(u.type)){s+=d||"";continue}}let n=a;switch(n.type){case"space":{s+=this.renderer.space(n);break}case"hr":{s+=this.renderer.hr(n);break}case"heading":{s+=this.renderer.heading(n);break}case"code":{s+=this.renderer.code(n);break}case"table":{s+=this.renderer.table(n);break}case"blockquote":{s+=this.renderer.blockquote(n);break}case"list":{s+=this.renderer.list(n);break}case"checkbox":{s+=this.renderer.checkbox(n);break}case"html":{s+=this.renderer.html(n);break}case"def":{s+=this.renderer.def(n);break}case"paragraph":{s+=this.renderer.paragraph(n);break}case"text":{s+=this.renderer.text(n);break}default:{let u='Token with "'+n.type+'" type was not found.';if(this.options.silent)return console.error(u),"";throw new Error(u)}}}return s}parseInline(t,s=this.renderer){var o,r;let i="";for(let a=0;a<t.length;a++){let n=t[a];if((r=(o=this.options.extensions)==null?void 0:o.renderers)!=null&&r[n.type]){let d=this.options.extensions.renderers[n.type].call({parser:this},n);if(d!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(n.type)){i+=d||"";continue}}let u=n;switch(u.type){case"escape":{i+=s.text(u);break}case"html":{i+=s.html(u);break}case"link":{i+=s.link(u);break}case"image":{i+=s.image(u);break}case"checkbox":{i+=s.checkbox(u);break}case"strong":{i+=s.strong(u);break}case"em":{i+=s.em(u);break}case"codespan":{i+=s.codespan(u);break}case"br":{i+=s.br(u);break}case"del":{i+=s.del(u);break}case"text":{i+=s.text(u);break}default:{let d='Token with "'+u.type+'" type was not found.';if(this.options.silent)return console.error(d),"";throw new Error(d)}}}return i}},us,Ut=(us=class{constructor(e){M(this,"options");M(this,"block");this.options=e||kt}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?Se.lex:Se.lexInline}provideParser(){return this.block?Ee.parse:Ee.parseInline}},M(us,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),M(us,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),us),dd=class{constructor(...e){M(this,"defaults",Fi());M(this,"options",this.setOptions);M(this,"parse",this.parseMarkdown(!0));M(this,"parseInline",this.parseMarkdown(!1));M(this,"Parser",Ee);M(this,"Renderer",Rs);M(this,"TextRenderer",qi);M(this,"Lexer",Se);M(this,"Tokenizer",zs);M(this,"Hooks",Ut);this.use(...e)}walkTokens(e,t){var i,o;let s=[];for(let r of e)switch(s=s.concat(t.call(this,r)),r.type){case"table":{let a=r;for(let n of a.header)s=s.concat(this.walkTokens(n.tokens,t));for(let n of a.rows)for(let u of n)s=s.concat(this.walkTokens(u.tokens,t));break}case"list":{let a=r;s=s.concat(this.walkTokens(a.items,t));break}default:{let a=r;(o=(i=this.defaults.extensions)==null?void 0:i.childTokens)!=null&&o[a.type]?this.defaults.extensions.childTokens[a.type].forEach(n=>{let u=a[n].flat(1/0);s=s.concat(this.walkTokens(u,t))}):a.tokens&&(s=s.concat(this.walkTokens(a.tokens,t)))}}return s}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(s=>{let i={...s};if(i.async=this.defaults.async||i.async||!1,s.extensions&&(s.extensions.forEach(o=>{if(!o.name)throw new Error("extension name required");if("renderer"in o){let r=t.renderers[o.name];r?t.renderers[o.name]=function(...a){let n=o.renderer.apply(this,a);return n===!1&&(n=r.apply(this,a)),n}:t.renderers[o.name]=o.renderer}if("tokenizer"in o){if(!o.level||o.level!=="block"&&o.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let r=t[o.level];r?r.unshift(o.tokenizer):t[o.level]=[o.tokenizer],o.start&&(o.level==="block"?t.startBlock?t.startBlock.push(o.start):t.startBlock=[o.start]:o.level==="inline"&&(t.startInline?t.startInline.push(o.start):t.startInline=[o.start]))}"childTokens"in o&&o.childTokens&&(t.childTokens[o.name]=o.childTokens)}),i.extensions=t),s.renderer){let o=this.defaults.renderer||new Rs(this.defaults);for(let r in s.renderer){if(!(r in o))throw new Error(`renderer '${r}' does not exist`);if(["options","parser"].includes(r))continue;let a=r,n=s.renderer[a],u=o[a];o[a]=(...d)=>{let p=n.apply(o,d);return p===!1&&(p=u.apply(o,d)),p||""}}i.renderer=o}if(s.tokenizer){let o=this.defaults.tokenizer||new zs(this.defaults);for(let r in s.tokenizer){if(!(r in o))throw new Error(`tokenizer '${r}' does not exist`);if(["options","rules","lexer"].includes(r))continue;let a=r,n=s.tokenizer[a],u=o[a];o[a]=(...d)=>{let p=n.apply(o,d);return p===!1&&(p=u.apply(o,d)),p}}i.tokenizer=o}if(s.hooks){let o=this.defaults.hooks||new Ut;for(let r in s.hooks){if(!(r in o))throw new Error(`hook '${r}' does not exist`);if(["options","block"].includes(r))continue;let a=r,n=s.hooks[a],u=o[a];Ut.passThroughHooks.has(r)?o[a]=d=>{if(this.defaults.async&&Ut.passThroughHooksRespectAsync.has(r))return(async()=>{let f=await n.call(o,d);return u.call(o,f)})();let p=n.call(o,d);return u.call(o,p)}:o[a]=(...d)=>{if(this.defaults.async)return(async()=>{let f=await n.apply(o,d);return f===!1&&(f=await u.apply(o,d)),f})();let p=n.apply(o,d);return p===!1&&(p=u.apply(o,d)),p}}i.hooks=o}if(s.walkTokens){let o=this.defaults.walkTokens,r=s.walkTokens;i.walkTokens=function(a){let n=[];return n.push(r.call(this,a)),o&&(n=n.concat(o.call(this,a))),n}}this.defaults={...this.defaults,...i}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return Se.lex(e,t??this.defaults)}parser(e,t){return Ee.parse(e,t??this.defaults)}parseMarkdown(e){return(t,s)=>{let i={...s},o={...this.defaults,...i},r=this.onError(!!o.silent,!!o.async);if(this.defaults.async===!0&&i.async===!1)return r(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return r(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return r(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));if(o.hooks&&(o.hooks.options=o,o.hooks.block=e),o.async)return(async()=>{let a=o.hooks?await o.hooks.preprocess(t):t,n=await(o.hooks?await o.hooks.provideLexer():e?Se.lex:Se.lexInline)(a,o),u=o.hooks?await o.hooks.processAllTokens(n):n;o.walkTokens&&await Promise.all(this.walkTokens(u,o.walkTokens));let d=await(o.hooks?await o.hooks.provideParser():e?Ee.parse:Ee.parseInline)(u,o);return o.hooks?await o.hooks.postprocess(d):d})().catch(r);try{o.hooks&&(t=o.hooks.preprocess(t));let a=(o.hooks?o.hooks.provideLexer():e?Se.lex:Se.lexInline)(t,o);o.hooks&&(a=o.hooks.processAllTokens(a)),o.walkTokens&&this.walkTokens(a,o.walkTokens);let n=(o.hooks?o.hooks.provideParser():e?Ee.parse:Ee.parseInline)(a,o);return o.hooks&&(n=o.hooks.postprocess(n)),n}catch(a){return r(a)}}}onError(e,t){return s=>{if(s.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let i="<p>An error occurred:</p><pre>"+qe(s.message+"",!0)+"</pre>";return t?Promise.resolve(i):i}if(t)return Promise.reject(s);throw s}}},gt=new dd;function O(e,t){return gt.parse(e,t)}O.options=O.setOptions=function(e){return gt.setOptions(e),O.defaults=gt.defaults,cr(O.defaults),O};O.getDefaults=Fi;O.defaults=kt;O.use=function(...e){return gt.use(...e),O.defaults=gt.defaults,cr(O.defaults),O};O.walkTokens=function(e,t){return gt.walkTokens(e,t)};O.parseInline=gt.parseInline;O.Parser=Ee;O.parser=Ee.parse;O.Renderer=Rs;O.TextRenderer=qi;O.Lexer=Se;O.lexer=Se.lex;O.Tokenizer=zs;O.Hooks=Ut;O.parse=O;O.options;O.setOptions;O.use;O.walkTokens;O.parseInline;Ee.parse;Se.lex;var ud=Object.defineProperty,hd=Object.getOwnPropertyDescriptor,Lt=(e,t,s,i)=>{for(var o=i>1?void 0:i?hd(t,s):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(i?a(t,s,o):a(o))||o);return i&&o&&ud(t,s,o),o};let lt=class extends de{constructor(){super(...arguments),this.epicId="",this.loading=!1,this.error="",this.content=null,this.renderedHtml="",this.previousEpicId=""}connectedCallback(){super.connectedCallback(),this.epicId&&this.loadContext()}updated(e){e.has("epicId")&&this.epicId!==this.previousEpicId&&(this.previousEpicId=this.epicId,this.loadContext())}async loadContext(){if(!this.epicId){this.content=null,this.renderedHtml="";return}this.loading=!0,this.error="";try{this.content=await Vl(this.epicId),this.content?this.renderedHtml=await O.parse(this.content):this.renderedHtml=""}catch(e){console.error("Failed to load context:",e),this.error=e instanceof Error?e.message:"Failed to load context",this.content=null,this.renderedHtml=""}finally{this.loading=!1}}refresh(){this.loadContext()}render(){return this.loading?h`
        <div class="loading">
          <sl-spinner></sl-spinner>
          <span>Loading context...</span>
        </div>
      `:this.error?h`<div class="error">${this.error}</div>`:this.epicId?this.content===null?h`<div class="empty">No context available</div>`:h`
      <div class="markdown-container">
        <div class="markdown-content">
          ${Oi(this.renderedHtml)}
        </div>
      </div>
    `:h`<div class="empty">No epic selected</div>`}};lt.styles=$`
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
  `;Lt([c({type:String})],lt.prototype,"epicId",2);Lt([y()],lt.prototype,"loading",2);Lt([y()],lt.prototype,"error",2);Lt([y()],lt.prototype,"content",2);Lt([y()],lt.prototype,"renderedHtml",2);lt=Lt([me("context-pane")],lt);ci("./shoelace");"serviceWorker"in navigator&&window.addEventListener("load",async()=>{try{const e=await navigator.serviceWorker.register("./sw.js");console.log("[PWA] Service worker registered:",e.scope),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&window.showToast&&window.showToast({message:"A new version is available. Refresh to update.",variant:"primary",duration:1e4})})}),navigator.serviceWorker.addEventListener("message",t=>{var s;((s=t.data)==null?void 0:s.type)==="SW_ACTIVATED"&&console.log("[PWA] Service worker activated:",t.data.version)})}catch(e){console.error("[PWA] Service worker registration failed:",e)}});
