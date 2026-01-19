(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&i(n)}).observe(document,{childList:!0,subtree:!0});function o(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=o(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ke=globalThis,fo=ke.ShadowRoot&&(ke.ShadyCSS===void 0||ke.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,mo=Symbol(),Lo=new WeakMap;let di=class{constructor(e,o,i){if(this._$cssResult$=!0,i!==mo)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=o}get styleSheet(){let e=this.o;const o=this.t;if(fo&&e===void 0){const i=o!==void 0&&o.length===1;i&&(e=Lo.get(o)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Lo.set(o,e))}return e}toString(){return this.cssText}};const Hi=t=>new di(typeof t=="string"?t:t+"",void 0,mo),L=(t,...e)=>{const o=t.length===1?t[0]:e.reduce((i,s,r)=>i+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[r+1],t[0]);return new di(o,t,mo)},Ui=(t,e)=>{if(fo)t.adoptedStyleSheets=e.map(o=>o instanceof CSSStyleSheet?o:o.styleSheet);else for(const o of e){const i=document.createElement("style"),s=ke.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=o.cssText,t.appendChild(i)}},Po=fo?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let o="";for(const i of e.cssRules)o+=i.cssText;return Hi(o)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Wi,defineProperty:ji,getOwnPropertyDescriptor:qi,getOwnPropertyNames:Ki,getOwnPropertySymbols:Yi,getPrototypeOf:Xi}=Object,At=globalThis,Do=At.trustedTypes,Gi=Do?Do.emptyScript:"",qe=At.reactiveElementPolyfillSupport,ae=(t,e)=>t,Kt={toAttribute(t,e){switch(e){case Boolean:t=t?Gi:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let o=t;switch(e){case Boolean:o=t!==null;break;case Number:o=t===null?null:Number(t);break;case Object:case Array:try{o=JSON.parse(t)}catch{o=null}}return o}},go=(t,e)=>!Wi(t,e),Ro={attribute:!0,type:String,converter:Kt,reflect:!1,useDefault:!1,hasChanged:go};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),At.litPropertyMetadata??(At.litPropertyMetadata=new WeakMap);let Wt=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,o=Ro){if(o.state&&(o.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((o=Object.create(o)).wrapped=!0),this.elementProperties.set(e,o),!o.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,o);s!==void 0&&ji(this.prototype,e,s)}}static getPropertyDescriptor(e,o,i){const{get:s,set:r}=qi(this.prototype,e)??{get(){return this[o]},set(n){this[o]=n}};return{get:s,set(n){const l=s==null?void 0:s.call(this);r==null||r.call(this,n),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ro}static _$Ei(){if(this.hasOwnProperty(ae("elementProperties")))return;const e=Xi(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ae("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ae("properties"))){const o=this.properties,i=[...Ki(o),...Yi(o)];for(const s of i)this.createProperty(s,o[s])}const e=this[Symbol.metadata];if(e!==null){const o=litPropertyMetadata.get(e);if(o!==void 0)for(const[i,s]of o)this.elementProperties.set(i,s)}this._$Eh=new Map;for(const[o,i]of this.elementProperties){const s=this._$Eu(o,i);s!==void 0&&this._$Eh.set(s,o)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const o=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const s of i)o.unshift(Po(s))}else e!==void 0&&o.push(Po(e));return o}static _$Eu(e,o){const i=o.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(o=>this.enableUpdating=o),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(o=>o(this))}addController(e){var o;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((o=e.hostConnected)==null||o.call(e))}removeController(e){var o;(o=this._$EO)==null||o.delete(e)}_$E_(){const e=new Map,o=this.constructor.elementProperties;for(const i of o.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ui(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(o=>{var i;return(i=o.hostConnected)==null?void 0:i.call(o)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(o=>{var i;return(i=o.hostDisconnected)==null?void 0:i.call(o)})}attributeChangedCallback(e,o,i){this._$AK(e,i)}_$ET(e,o){var r;const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(s!==void 0&&i.reflect===!0){const n=(((r=i.converter)==null?void 0:r.toAttribute)!==void 0?i.converter:Kt).toAttribute(o,i.type);this._$Em=e,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(e,o){var r,n;const i=this.constructor,s=i._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const l=i.getPropertyOptions(s),d=typeof l.converter=="function"?{fromAttribute:l.converter}:((r=l.converter)==null?void 0:r.fromAttribute)!==void 0?l.converter:Kt;this._$Em=s;const u=d.fromAttribute(o,l.type);this[s]=u??((n=this._$Ej)==null?void 0:n.get(s))??u,this._$Em=null}}requestUpdate(e,o,i,s=!1,r){var n;if(e!==void 0){const l=this.constructor;if(s===!1&&(r=this[e]),i??(i=l.getPropertyOptions(e)),!((i.hasChanged??go)(r,o)||i.useDefault&&i.reflect&&r===((n=this._$Ej)==null?void 0:n.get(e))&&!this.hasAttribute(l._$Eu(e,i))))return;this.C(e,o,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,o,{useDefault:i,reflect:s,wrapped:r},n){i&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,n??o??this[e]),r!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(o=void 0),this._$AL.set(e,o)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(o){Promise.reject(o)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,n]of this._$Ep)this[r]=n;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[r,n]of s){const{wrapped:l}=n,d=this[r];l!==!0||this._$AL.has(r)||d===void 0||this.C(r,void 0,n,d)}}let e=!1;const o=this._$AL;try{e=this.shouldUpdate(o),e?(this.willUpdate(o),(i=this._$EO)==null||i.forEach(s=>{var r;return(r=s.hostUpdate)==null?void 0:r.call(s)}),this.update(o)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(o)}willUpdate(e){}_$AE(e){var o;(o=this._$EO)==null||o.forEach(i=>{var s;return(s=i.hostUpdated)==null?void 0:s.call(i)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(o=>this._$ET(o,this[o]))),this._$EM()}updated(e){}firstUpdated(e){}};Wt.elementStyles=[],Wt.shadowRootOptions={mode:"open"},Wt[ae("elementProperties")]=new Map,Wt[ae("finalized")]=new Map,qe==null||qe({ReactiveElement:Wt}),(At.reactiveElementVersions??(At.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const le=globalThis,Mo=t=>t,Ae=le.trustedTypes,Io=Ae?Ae.createPolicy("lit-html",{createHTML:t=>t}):void 0,ui="$lit$",St=`lit$${Math.random().toFixed(9).slice(2)}$`,hi="?"+St,Zi=`<${hi}>`,Nt=document,he=()=>Nt.createComment(""),pe=t=>t===null||typeof t!="object"&&typeof t!="function",bo=Array.isArray,Qi=t=>bo(t)||typeof(t==null?void 0:t[Symbol.iterator])=="function",Ke=`[ 	
\f\r]`,ee=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Bo=/-->/g,No=/>/g,Dt=RegExp(`>|${Ke}(?:([^\\s"'>=/]+)(${Ke}*=${Ke}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Fo=/'/g,Vo=/"/g,pi=/^(?:script|style|textarea|title)$/i,Ji=t=>(e,...o)=>({_$litType$:t,strings:e,values:o}),b=Ji(1),it=Symbol.for("lit-noChange"),P=Symbol.for("lit-nothing"),Ho=new WeakMap,It=Nt.createTreeWalker(Nt,129);function fi(t,e){if(!bo(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Io!==void 0?Io.createHTML(e):e}const ts=(t,e)=>{const o=t.length-1,i=[];let s,r=e===2?"<svg>":e===3?"<math>":"",n=ee;for(let l=0;l<o;l++){const d=t[l];let u,h,p=-1,m=0;for(;m<d.length&&(n.lastIndex=m,h=n.exec(d),h!==null);)m=n.lastIndex,n===ee?h[1]==="!--"?n=Bo:h[1]!==void 0?n=No:h[2]!==void 0?(pi.test(h[2])&&(s=RegExp("</"+h[2],"g")),n=Dt):h[3]!==void 0&&(n=Dt):n===Dt?h[0]===">"?(n=s??ee,p=-1):h[1]===void 0?p=-2:(p=n.lastIndex-h[2].length,u=h[1],n=h[3]===void 0?Dt:h[3]==='"'?Vo:Fo):n===Vo||n===Fo?n=Dt:n===Bo||n===No?n=ee:(n=Dt,s=void 0);const f=n===Dt&&t[l+1].startsWith("/>")?" ":"";r+=n===ee?d+Zi:p>=0?(i.push(u),d.slice(0,p)+ui+d.slice(p)+St+f):d+St+(p===-2?l:f)}return[fi(t,r+(t[o]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]};class fe{constructor({strings:e,_$litType$:o},i){let s;this.parts=[];let r=0,n=0;const l=e.length-1,d=this.parts,[u,h]=ts(e,o);if(this.el=fe.createElement(u,i),It.currentNode=this.el.content,o===2||o===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(s=It.nextNode())!==null&&d.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(const p of s.getAttributeNames())if(p.endsWith(ui)){const m=h[n++],f=s.getAttribute(p).split(St),g=/([.?@])?(.*)/.exec(m);d.push({type:1,index:r,name:g[2],strings:f,ctor:g[1]==="."?os:g[1]==="?"?is:g[1]==="@"?ss:Pe}),s.removeAttribute(p)}else p.startsWith(St)&&(d.push({type:6,index:r}),s.removeAttribute(p));if(pi.test(s.tagName)){const p=s.textContent.split(St),m=p.length-1;if(m>0){s.textContent=Ae?Ae.emptyScript:"";for(let f=0;f<m;f++)s.append(p[f],he()),It.nextNode(),d.push({type:2,index:++r});s.append(p[m],he())}}}else if(s.nodeType===8)if(s.data===hi)d.push({type:2,index:r});else{let p=-1;for(;(p=s.data.indexOf(St,p+1))!==-1;)d.push({type:7,index:r}),p+=St.length-1}r++}}static createElement(e,o){const i=Nt.createElement("template");return i.innerHTML=e,i}}function Yt(t,e,o=t,i){var n,l;if(e===it)return e;let s=i!==void 0?(n=o._$Co)==null?void 0:n[i]:o._$Cl;const r=pe(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==r&&((l=s==null?void 0:s._$AO)==null||l.call(s,!1),r===void 0?s=void 0:(s=new r(t),s._$AT(t,o,i)),i!==void 0?(o._$Co??(o._$Co=[]))[i]=s:o._$Cl=s),s!==void 0&&(e=Yt(t,s._$AS(t,e.values),s,i)),e}class es{constructor(e,o){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=o}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:o},parts:i}=this._$AD,s=((e==null?void 0:e.creationScope)??Nt).importNode(o,!0);It.currentNode=s;let r=It.nextNode(),n=0,l=0,d=i[0];for(;d!==void 0;){if(n===d.index){let u;d.type===2?u=new ge(r,r.nextSibling,this,e):d.type===1?u=new d.ctor(r,d.name,d.strings,this,e):d.type===6&&(u=new rs(r,this,e)),this._$AV.push(u),d=i[++l]}n!==(d==null?void 0:d.index)&&(r=It.nextNode(),n++)}return It.currentNode=Nt,s}p(e){let o=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,o),o+=i.strings.length-2):i._$AI(e[o])),o++}}class ge{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,o,i,s){this.type=2,this._$AH=P,this._$AN=void 0,this._$AA=e,this._$AB=o,this._$AM=i,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const o=this._$AM;return o!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=o.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,o=this){e=Yt(this,e,o),pe(e)?e===P||e==null||e===""?(this._$AH!==P&&this._$AR(),this._$AH=P):e!==this._$AH&&e!==it&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Qi(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==P&&pe(this._$AH)?this._$AA.nextSibling.data=e:this.T(Nt.createTextNode(e)),this._$AH=e}$(e){var r;const{values:o,_$litType$:i}=e,s=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=fe.createElement(fi(i.h,i.h[0]),this.options)),i);if(((r=this._$AH)==null?void 0:r._$AD)===s)this._$AH.p(o);else{const n=new es(s,this),l=n.u(this.options);n.p(o),this.T(l),this._$AH=n}}_$AC(e){let o=Ho.get(e.strings);return o===void 0&&Ho.set(e.strings,o=new fe(e)),o}k(e){bo(this._$AH)||(this._$AH=[],this._$AR());const o=this._$AH;let i,s=0;for(const r of e)s===o.length?o.push(i=new ge(this.O(he()),this.O(he()),this,this.options)):i=o[s],i._$AI(r),s++;s<o.length&&(this._$AR(i&&i._$AB.nextSibling,s),o.length=s)}_$AR(e=this._$AA.nextSibling,o){var i;for((i=this._$AP)==null?void 0:i.call(this,!1,!0,o);e!==this._$AB;){const s=Mo(e).nextSibling;Mo(e).remove(),e=s}}setConnected(e){var o;this._$AM===void 0&&(this._$Cv=e,(o=this._$AP)==null||o.call(this,e))}}class Pe{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,o,i,s,r){this.type=1,this._$AH=P,this._$AN=void 0,this.element=e,this.name=o,this._$AM=s,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=P}_$AI(e,o=this,i,s){const r=this.strings;let n=!1;if(r===void 0)e=Yt(this,e,o,0),n=!pe(e)||e!==this._$AH&&e!==it,n&&(this._$AH=e);else{const l=e;let d,u;for(e=r[0],d=0;d<r.length-1;d++)u=Yt(this,l[i+d],o,d),u===it&&(u=this._$AH[d]),n||(n=!pe(u)||u!==this._$AH[d]),u===P?e=P:e!==P&&(e+=(u??"")+r[d+1]),this._$AH[d]=u}n&&!s&&this.j(e)}j(e){e===P?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class os extends Pe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===P?void 0:e}}class is extends Pe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==P)}}class ss extends Pe{constructor(e,o,i,s,r){super(e,o,i,s,r),this.type=5}_$AI(e,o=this){if((e=Yt(this,e,o,0)??P)===it)return;const i=this._$AH,s=e===P&&i!==P||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,r=e!==P&&(i===P||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var o;typeof this._$AH=="function"?this._$AH.call(((o=this.options)==null?void 0:o.host)??this.element,e):this._$AH.handleEvent(e)}}class rs{constructor(e,o,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=o,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){Yt(this,e)}}const Ye=le.litHtmlPolyfillSupport;Ye==null||Ye(fe,ge),(le.litHtmlVersions??(le.litHtmlVersions=[])).push("3.3.2");const ns=(t,e,o)=>{const i=(o==null?void 0:o.renderBefore)??e;let s=i._$litPart$;if(s===void 0){const r=(o==null?void 0:o.renderBefore)??null;i._$litPart$=s=new ge(e.insertBefore(he(),r),r,void 0,o??{})}return s._$AI(t),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Bt=globalThis;let xt=class extends Wt{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var o;const e=super.createRenderRoot();return(o=this.renderOptions).renderBefore??(o.renderBefore=e.firstChild),e}update(e){const o=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ns(o,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return it}};var ci;xt._$litElement$=!0,xt.finalized=!0,(ci=Bt.litElementHydrateSupport)==null||ci.call(Bt,{LitElement:xt});const Xe=Bt.litElementPolyfillSupport;Xe==null||Xe({LitElement:xt});(Bt.litElementVersions??(Bt.litElementVersions=[])).push("4.2.2");var as=L`
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
`;const io=new Set,jt=new Map;let Mt,vo="ltr",yo="en";const mi=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(mi){const t=new MutationObserver(bi);vo=document.documentElement.dir||"ltr",yo=document.documentElement.lang||navigator.language,t.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function gi(...t){t.map(e=>{const o=e.$code.toLowerCase();jt.has(o)?jt.set(o,Object.assign(Object.assign({},jt.get(o)),e)):jt.set(o,e),Mt||(Mt=e)}),bi()}function bi(){mi&&(vo=document.documentElement.dir||"ltr",yo=document.documentElement.lang||navigator.language),[...io.keys()].map(t=>{typeof t.requestUpdate=="function"&&t.requestUpdate()})}let ls=class{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){io.add(this.host)}hostDisconnected(){io.delete(this.host)}dir(){return`${this.host.dir||vo}`.toLowerCase()}lang(){return`${this.host.lang||yo}`.toLowerCase()}getTranslationData(e){var o,i;const s=new Intl.Locale(e.replace(/_/g,"-")),r=s==null?void 0:s.language.toLowerCase(),n=(i=(o=s==null?void 0:s.region)===null||o===void 0?void 0:o.toLowerCase())!==null&&i!==void 0?i:"",l=jt.get(`${r}-${n}`),d=jt.get(r);return{locale:s,language:r,region:n,primary:l,secondary:d}}exists(e,o){var i;const{primary:s,secondary:r}=this.getTranslationData((i=o.lang)!==null&&i!==void 0?i:this.lang());return o=Object.assign({includeFallback:!1},o),!!(s&&s[e]||r&&r[e]||o.includeFallback&&Mt&&Mt[e])}term(e,...o){const{primary:i,secondary:s}=this.getTranslationData(this.lang());let r;if(i&&i[e])r=i[e];else if(s&&s[e])r=s[e];else if(Mt&&Mt[e])r=Mt[e];else return console.error(`No translation found for: ${String(e)}`),String(e);return typeof r=="function"?r(...o):r}date(e,o){return e=new Date(e),new Intl.DateTimeFormat(this.lang(),o).format(e)}number(e,o){return e=Number(e),isNaN(e)?"":new Intl.NumberFormat(this.lang(),o).format(e)}relativeTime(e,o,i){return new Intl.RelativeTimeFormat(this.lang(),i).format(e,o)}};var vi={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(t,e)=>`Go to slide ${t} of ${e}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:t=>t===0?"No options selected":t===1?"1 option selected":`${t} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:t=>`Slide ${t}`,toggleColorFormat:"Toggle color format"};gi(vi);var cs=vi,Q=class extends ls{};gi(cs);var B=L`
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
`,yi=Object.defineProperty,ds=Object.defineProperties,us=Object.getOwnPropertyDescriptor,hs=Object.getOwnPropertyDescriptors,Uo=Object.getOwnPropertySymbols,ps=Object.prototype.hasOwnProperty,fs=Object.prototype.propertyIsEnumerable,Ge=(t,e)=>(e=Symbol[t])?e:Symbol.for("Symbol."+t),wo=t=>{throw TypeError(t)},Wo=(t,e,o)=>e in t?yi(t,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):t[e]=o,Ht=(t,e)=>{for(var o in e||(e={}))ps.call(e,o)&&Wo(t,o,e[o]);if(Uo)for(var o of Uo(e))fs.call(e,o)&&Wo(t,o,e[o]);return t},De=(t,e)=>ds(t,hs(e)),a=(t,e,o,i)=>{for(var s=i>1?void 0:i?us(e,o):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(s=(i?n(e,o,s):n(s))||s);return i&&s&&yi(e,o,s),s},wi=(t,e,o)=>e.has(t)||wo("Cannot "+o),ms=(t,e,o)=>(wi(t,e,"read from private field"),e.get(t)),gs=(t,e,o)=>e.has(t)?wo("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,o),bs=(t,e,o,i)=>(wi(t,e,"write to private field"),e.set(t,o),o),vs=function(t,e){this[0]=t,this[1]=e},ys=t=>{var e=t[Ge("asyncIterator")],o=!1,i,s={};return e==null?(e=t[Ge("iterator")](),i=r=>s[r]=n=>e[r](n)):(e=e.call(t),i=r=>s[r]=n=>{if(o){if(o=!1,r==="throw")throw n;return n}return o=!0,{done:!1,value:new vs(new Promise(l=>{var d=e[r](n);d instanceof Object||wo("Object expected"),l(d)}),1)}}),s[Ge("iterator")]=()=>s,i("next"),"throw"in e?i("throw"):s.throw=r=>{throw r},"return"in e&&i("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Re=t=>(e,o)=>{o!==void 0?o.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ws={attribute:!0,type:String,converter:Kt,reflect:!1,hasChanged:go},_s=(t=ws,e,o)=>{const{kind:i,metadata:s}=o;let r=globalThis.litPropertyMetadata.get(s);if(r===void 0&&globalThis.litPropertyMetadata.set(s,r=new Map),i==="setter"&&((t=Object.create(t)).wrapped=!0),r.set(o.name,t),i==="accessor"){const{name:n}=o;return{set(l){const d=e.get.call(this);e.set.call(this,l),this.requestUpdate(n,d,t,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,t,l),l}}}if(i==="setter"){const{name:n}=o;return function(l){const d=this[n];e.call(this,l),this.requestUpdate(n,d,t,!0,l)}}throw Error("Unsupported decorator location: "+i)};function c(t){return(e,o)=>typeof o=="object"?_s(t,e,o):((i,s,r)=>{const n=s.hasOwnProperty(r);return s.constructor.createProperty(r,i),n?Object.getOwnPropertyDescriptor(s,r):void 0})(t,e,o)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function T(t){return c({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xs=(t,e,o)=>(o.configurable=!0,o.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,o),o);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function S(t,e){return(o,i,s)=>{const r=n=>{var l;return((l=n.renderRoot)==null?void 0:l.querySelector(t))??null};return xs(o,i,{get(){return r(this)}})}}var Ce,R=class extends xt{constructor(){super(),gs(this,Ce,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([t,e])=>{this.constructor.define(t,e)})}emit(t,e){const o=new CustomEvent(t,Ht({bubbles:!0,cancelable:!1,composed:!0,detail:{}},e));return this.dispatchEvent(o),o}static define(t,e=this,o={}){const i=customElements.get(t);if(!i){try{customElements.define(t,e,o)}catch{customElements.define(t,class extends e{},o)}return}let s=" (unknown version)",r=s;"version"in e&&e.version&&(s=" v"+e.version),"version"in i&&i.version&&(r=" v"+i.version),!(s&&r&&s===r)&&console.warn(`Attempted to register <${t}>${s}, but <${t}>${r} has already been registered.`)}attributeChangedCallback(t,e,o){ms(this,Ce)||(this.constructor.elementProperties.forEach((i,s)=>{i.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),bs(this,Ce,!0)),super.attributeChangedCallback(t,e,o)}willUpdate(t){super.willUpdate(t),this.initialReflectedProperties.forEach((e,o)=>{t.has(o)&&this[o]==null&&(this[o]=e)})}};Ce=new WeakMap;R.version="2.20.1";R.dependencies={};a([c()],R.prototype,"dir",2);a([c()],R.prototype,"lang",2);var _o=class extends R{constructor(){super(...arguments),this.localize=new Q(this)}render(){return b`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};_o.styles=[B,as];var oe=new WeakMap,ie=new WeakMap,se=new WeakMap,Ze=new WeakSet,we=new WeakMap,Me=class{constructor(t,e){this.handleFormData=o=>{const i=this.options.disabled(this.host),s=this.options.name(this.host),r=this.options.value(this.host),n=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!i&&!n&&typeof s=="string"&&s.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(l=>{o.formData.append(s,l.toString())}):o.formData.append(s,r.toString()))},this.handleFormSubmit=o=>{var i;const s=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((i=oe.get(this.form))==null||i.forEach(n=>{this.setUserInteracted(n,!0)})),this.form&&!this.form.noValidate&&!s&&!r(this.host)&&(o.preventDefault(),o.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),we.set(this.host,[])},this.handleInteraction=o=>{const i=we.get(this.host);i.includes(o.type)||i.push(o.type),i.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const o=this.form.querySelectorAll("*");for(const i of o)if(typeof i.checkValidity=="function"&&!i.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const o=this.form.querySelectorAll("*");for(const i of o)if(typeof i.reportValidity=="function"&&!i.reportValidity())return!1}return!0},(this.host=t).addController(this),this.options=Ht({form:o=>{const i=o.form;if(i){const r=o.getRootNode().querySelector(`#${i}`);if(r)return r}return o.closest("form")},name:o=>o.name,value:o=>o.value,defaultValue:o=>o.defaultValue,disabled:o=>{var i;return(i=o.disabled)!=null?i:!1},reportValidity:o=>typeof o.reportValidity=="function"?o.reportValidity():!0,checkValidity:o=>typeof o.checkValidity=="function"?o.checkValidity():!0,setValue:(o,i)=>o.value=i,assumeInteractionOn:["sl-input"]},e)}hostConnected(){const t=this.options.form(this.host);t&&this.attachForm(t),we.set(this.host,[]),this.options.assumeInteractionOn.forEach(e=>{this.host.addEventListener(e,this.handleInteraction)})}hostDisconnected(){this.detachForm(),we.delete(this.host),this.options.assumeInteractionOn.forEach(t=>{this.host.removeEventListener(t,this.handleInteraction)})}hostUpdated(){const t=this.options.form(this.host);t||this.detachForm(),t&&this.form!==t&&(this.detachForm(),this.attachForm(t)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(t){t?(this.form=t,oe.has(this.form)?oe.get(this.form).add(this.host):oe.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),ie.has(this.form)||(ie.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),se.has(this.form)||(se.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const t=oe.get(this.form);t&&(t.delete(this.host),t.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),ie.has(this.form)&&(this.form.reportValidity=ie.get(this.form),ie.delete(this.form)),se.has(this.form)&&(this.form.checkValidity=se.get(this.form),se.delete(this.form)),this.form=void 0))}setUserInteracted(t,e){e?Ze.add(t):Ze.delete(t),t.requestUpdate()}doAction(t,e){if(this.form){const o=document.createElement("button");o.type=t,o.style.position="absolute",o.style.width="0",o.style.height="0",o.style.clipPath="inset(50%)",o.style.overflow="hidden",o.style.whiteSpace="nowrap",e&&(o.name=e.name,o.value=e.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(i=>{e.hasAttribute(i)&&o.setAttribute(i,e.getAttribute(i))})),this.form.append(o),o.click(),o.remove()}}getForm(){var t;return(t=this.form)!=null?t:null}reset(t){this.doAction("reset",t)}submit(t){this.doAction("submit",t)}setValidity(t){const e=this.host,o=!!Ze.has(e),i=!!e.required;e.toggleAttribute("data-required",i),e.toggleAttribute("data-optional",!i),e.toggleAttribute("data-invalid",!t),e.toggleAttribute("data-valid",t),e.toggleAttribute("data-user-invalid",!t&&o),e.toggleAttribute("data-user-valid",t&&o)}updateValidity(){const t=this.host;this.setValidity(t.validity.valid)}emitInvalidEvent(t){const e=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});t||e.preventDefault(),this.host.dispatchEvent(e)||t==null||t.preventDefault()}},xo=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(De(Ht({},xo),{valid:!1,valueMissing:!0}));Object.freeze(De(Ht({},xo),{valid:!1,customError:!0}));var ks=L`
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
`,Lt=class{constructor(t,...e){this.slotNames=[],this.handleSlotChange=o=>{const i=o.target;(this.slotNames.includes("[default]")&&!i.name||i.name&&this.slotNames.includes(i.name))&&this.host.requestUpdate()},(this.host=t).addController(this),this.slotNames=e}hasDefaultSlot(){return[...this.host.childNodes].some(t=>{if(t.nodeType===t.TEXT_NODE&&t.textContent.trim()!=="")return!0;if(t.nodeType===t.ELEMENT_NODE){const e=t;if(e.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!e.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(t){return this.host.querySelector(`:scope > [slot="${t}"]`)!==null}test(t){return t==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(t)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Cs(t){if(!t)return"";const e=t.assignedNodes({flatten:!0});let o="";return[...e].forEach(i=>{i.nodeType===Node.TEXT_NODE&&(o+=i.textContent)}),o}var so="";function ro(t){so=t}function $s(t=""){if(!so){const e=[...document.getElementsByTagName("script")],o=e.find(i=>i.hasAttribute("data-shoelace"));if(o)ro(o.getAttribute("data-shoelace"));else{const i=e.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let s="";i&&(s=i.getAttribute("src")),ro(s.split("/").slice(0,-1).join("/"))}}return so.replace(/\/$/,"")+(t?`/${t.replace(/^\//,"")}`:"")}var Ss={name:"default",resolver:t=>$s(`assets/icons/${t}.svg`)},As=Ss,jo={caret:`
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
  `},Es={name:"system",resolver:t=>t in jo?`data:image/svg+xml,${encodeURIComponent(jo[t])}`:""},Ts=Es,zs=[As,Ts],no=[];function Os(t){no.push(t)}function Ls(t){no=no.filter(e=>e!==t)}function qo(t){return zs.find(e=>e.name===t)}var Ps=L`
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
`;function z(t,e){const o=Ht({waitUntilFirstUpdate:!1},e);return(i,s)=>{const{update:r}=i,n=Array.isArray(t)?t:[t];i.update=function(l){n.forEach(d=>{const u=d;if(l.has(u)){const h=l.get(u),p=this[u];h!==p&&(!o.waitUntilFirstUpdate||this.hasUpdated)&&this[s](h,p)}}),r.call(this,l)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ds=(t,e)=>(t==null?void 0:t._$litType$)!==void 0,_i=t=>t.strings===void 0,Rs={},Ms=(t,e=Rs)=>t._$AH=e;var re=Symbol(),_e=Symbol(),Qe,Je=new Map,Y=class extends R{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(t,e){var o;let i;if(e!=null&&e.spriteSheet)return this.svg=b`<svg part="svg">
        <use part="use" href="${t}"></use>
      </svg>`,this.svg;try{if(i=await fetch(t,{mode:"cors"}),!i.ok)return i.status===410?re:_e}catch{return _e}try{const s=document.createElement("div");s.innerHTML=await i.text();const r=s.firstElementChild;if(((o=r==null?void 0:r.tagName)==null?void 0:o.toLowerCase())!=="svg")return re;Qe||(Qe=new DOMParser);const l=Qe.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return l?(l.part.add("svg"),document.adoptNode(l)):re}catch{return re}}connectedCallback(){super.connectedCallback(),Os(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Ls(this)}getIconSource(){const t=qo(this.library);return this.name&&t?{url:t.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var t;const{url:e,fromLibrary:o}=this.getIconSource(),i=o?qo(this.library):void 0;if(!e){this.svg=null;return}let s=Je.get(e);if(s||(s=this.resolveIcon(e,i),Je.set(e,s)),!this.initialRender)return;const r=await s;if(r===_e&&Je.delete(e),e===this.getIconSource().url){if(Ds(r)){if(this.svg=r,i){await this.updateComplete;const n=this.shadowRoot.querySelector("[part='svg']");typeof i.mutator=="function"&&n&&i.mutator(n)}return}switch(r){case _e:case re:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(t=i==null?void 0:i.mutator)==null||t.call(i,this.svg),this.emit("sl-load")}}}render(){return this.svg}};Y.styles=[B,Ps];a([T()],Y.prototype,"svg",2);a([c({reflect:!0})],Y.prototype,"name",2);a([c()],Y.prototype,"src",2);a([c()],Y.prototype,"label",2);a([c({reflect:!0})],Y.prototype,"library",2);a([z("label")],Y.prototype,"handleLabelChange",1);a([z(["name","src","library"])],Y.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const wt={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ie=t=>(...e)=>({_$litDirective$:t,values:e});let Be=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,o,i){this._$Ct=e,this._$AM=o,this._$Ci=i}_$AS(e,o){return this.update(e,o)}update(e,o){return this.render(...o)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const I=Ie(class extends Be{constructor(t){var e;if(super(t),t.type!==wt.ATTRIBUTE||t.name!=="class"||((e=t.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){var i,s;if(this.st===void 0){this.st=new Set,t.strings!==void 0&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in e)e[r]&&!((i=this.nt)!=null&&i.has(r))&&this.st.add(r);return this.render(e)}const o=t.element.classList;for(const r of this.st)r in e||(o.remove(r),this.st.delete(r));for(const r in e){const n=!!e[r];n===this.st.has(r)||(s=this.nt)!=null&&s.has(r)||(n?(o.add(r),this.st.add(r)):(o.remove(r),this.st.delete(r)))}return it}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xi=Symbol.for(""),Is=t=>{if((t==null?void 0:t.r)===xi)return t==null?void 0:t._$litStatic$},Ee=(t,...e)=>({_$litStatic$:e.reduce((o,i,s)=>o+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(i)+t[s+1],t[0]),r:xi}),Ko=new Map,Bs=t=>(e,...o)=>{const i=o.length;let s,r;const n=[],l=[];let d,u=0,h=!1;for(;u<i;){for(d=e[u];u<i&&(r=o[u],(s=Is(r))!==void 0);)d+=s+e[++u],h=!0;u!==i&&l.push(r),n.push(d),u++}if(u===i&&n.push(e[i]),h){const p=n.join("$$lit$$");(e=Ko.get(p))===void 0&&(n.raw=n,Ko.set(p,e=n)),o=l}return t(e,...o)},$e=Bs(b);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const v=t=>t??P;var A=class extends R{constructor(){super(...arguments),this.formControlController=new Me(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new Lt(this,"[default]","prefix","suffix"),this.localize=new Q(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:xo}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(t){this.isButton()&&(this.button.setCustomValidity(t),this.formControlController.updateValidity())}render(){const t=this.isLink(),e=t?Ee`a`:Ee`button`;return $e`
      <${e}
        part="base"
        class=${I({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${v(t?void 0:this.disabled)}
        type=${v(t?void 0:this.type)}
        title=${this.title}
        name=${v(t?void 0:this.name)}
        value=${v(t?void 0:this.value)}
        href=${v(t&&!this.disabled?this.href:void 0)}
        target=${v(t?this.target:void 0)}
        download=${v(t?this.download:void 0)}
        rel=${v(t?this.rel:void 0)}
        role=${v(t?void 0:"button")}
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
        ${this.caret?$e` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?$e`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${e}>
    `}};A.styles=[B,ks];A.dependencies={"sl-icon":Y,"sl-spinner":_o};a([S(".button")],A.prototype,"button",2);a([T()],A.prototype,"hasFocus",2);a([T()],A.prototype,"invalid",2);a([c()],A.prototype,"title",2);a([c({reflect:!0})],A.prototype,"variant",2);a([c({reflect:!0})],A.prototype,"size",2);a([c({type:Boolean,reflect:!0})],A.prototype,"caret",2);a([c({type:Boolean,reflect:!0})],A.prototype,"disabled",2);a([c({type:Boolean,reflect:!0})],A.prototype,"loading",2);a([c({type:Boolean,reflect:!0})],A.prototype,"outline",2);a([c({type:Boolean,reflect:!0})],A.prototype,"pill",2);a([c({type:Boolean,reflect:!0})],A.prototype,"circle",2);a([c()],A.prototype,"type",2);a([c()],A.prototype,"name",2);a([c()],A.prototype,"value",2);a([c()],A.prototype,"href",2);a([c()],A.prototype,"target",2);a([c()],A.prototype,"rel",2);a([c()],A.prototype,"download",2);a([c()],A.prototype,"form",2);a([c({attribute:"formaction"})],A.prototype,"formAction",2);a([c({attribute:"formenctype"})],A.prototype,"formEnctype",2);a([c({attribute:"formmethod"})],A.prototype,"formMethod",2);a([c({attribute:"formnovalidate",type:Boolean})],A.prototype,"formNoValidate",2);a([c({attribute:"formtarget"})],A.prototype,"formTarget",2);a([z("disabled",{waitUntilFirstUpdate:!0})],A.prototype,"handleDisabledChange",1);A.define("sl-button");var Ns=L`
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
`,ki=(t="value")=>(e,o)=>{const i=e.constructor,s=i.prototype.attributeChangedCallback;i.prototype.attributeChangedCallback=function(r,n,l){var d;const u=i.getPropertyOptions(t),h=typeof u.attribute=="string"?u.attribute:t;if(r===h){const p=u.converter||Kt,f=(typeof p=="function"?p:(d=p==null?void 0:p.fromAttribute)!=null?d:Kt.fromAttribute)(l,u.type);this[t]!==f&&(this[o]=f)}s.call(this,r,n,l)}},ko=L`
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
 */const Ci=Ie(class extends Be{constructor(t){if(super(t),t.type!==wt.PROPERTY&&t.type!==wt.ATTRIBUTE&&t.type!==wt.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!_i(t))throw Error("`live` bindings can only contain a single expression")}render(t){return t}update(t,[e]){if(e===it||e===P)return e;const o=t.element,i=t.name;if(t.type===wt.PROPERTY){if(e===o[i])return it}else if(t.type===wt.BOOLEAN_ATTRIBUTE){if(!!e===o.hasAttribute(i))return it}else if(t.type===wt.ATTRIBUTE&&o.getAttribute(i)===e+"")return it;return Ms(t),e}});var y=class extends R{constructor(){super(...arguments),this.formControlController=new Me(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Lt(this,"help-text","label"),this.localize=new Q(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var t;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((t=this.input)==null?void 0:t.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(t){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=t,this.value=this.__dateInput.value}get valueAsNumber(){var t;return this.__numberInput.value=this.value,((t=this.input)==null?void 0:t.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(t){this.__numberInput.valueAsNumber=t,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(t){t.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleKeyDown(t){const e=t.metaKey||t.ctrlKey||t.shiftKey||t.altKey;t.key==="Enter"&&!e&&setTimeout(()=>{!t.defaultPrevented&&!t.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(t,e,o="none"){this.input.setSelectionRange(t,e,o)}setRangeText(t,e,o,i="preserve"){const s=e??this.input.selectionStart,r=o??this.input.selectionEnd;this.input.setRangeText(t,s,r,i),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),o=this.label?!0:!!t,i=this.helpText?!0:!!e,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return b`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":o,"form-control--has-help-text":i})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${o?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${I({input:!0,"input--small":this.size==="small","input--medium":this.size==="medium","input--large":this.size==="large","input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
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
              name=${v(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${v(this.placeholder)}
              minlength=${v(this.minlength)}
              maxlength=${v(this.maxlength)}
              min=${v(this.min)}
              max=${v(this.max)}
              step=${v(this.step)}
              .value=${Ci(this.value)}
              autocapitalize=${v(this.autocapitalize)}
              autocomplete=${v(this.autocomplete)}
              autocorrect=${v(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${v(this.pattern)}
              enterkeyhint=${v(this.enterkeyhint)}
              inputmode=${v(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${r?b`
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
            ${this.passwordToggle&&!this.disabled?b`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?b`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:b`
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
    `}};y.styles=[B,ko,Ns];y.dependencies={"sl-icon":Y};a([S(".input__control")],y.prototype,"input",2);a([T()],y.prototype,"hasFocus",2);a([c()],y.prototype,"title",2);a([c({reflect:!0})],y.prototype,"type",2);a([c()],y.prototype,"name",2);a([c()],y.prototype,"value",2);a([ki()],y.prototype,"defaultValue",2);a([c({reflect:!0})],y.prototype,"size",2);a([c({type:Boolean,reflect:!0})],y.prototype,"filled",2);a([c({type:Boolean,reflect:!0})],y.prototype,"pill",2);a([c()],y.prototype,"label",2);a([c({attribute:"help-text"})],y.prototype,"helpText",2);a([c({type:Boolean})],y.prototype,"clearable",2);a([c({type:Boolean,reflect:!0})],y.prototype,"disabled",2);a([c()],y.prototype,"placeholder",2);a([c({type:Boolean,reflect:!0})],y.prototype,"readonly",2);a([c({attribute:"password-toggle",type:Boolean})],y.prototype,"passwordToggle",2);a([c({attribute:"password-visible",type:Boolean})],y.prototype,"passwordVisible",2);a([c({attribute:"no-spin-buttons",type:Boolean})],y.prototype,"noSpinButtons",2);a([c({reflect:!0})],y.prototype,"form",2);a([c({type:Boolean,reflect:!0})],y.prototype,"required",2);a([c()],y.prototype,"pattern",2);a([c({type:Number})],y.prototype,"minlength",2);a([c({type:Number})],y.prototype,"maxlength",2);a([c()],y.prototype,"min",2);a([c()],y.prototype,"max",2);a([c()],y.prototype,"step",2);a([c()],y.prototype,"autocapitalize",2);a([c()],y.prototype,"autocorrect",2);a([c()],y.prototype,"autocomplete",2);a([c({type:Boolean})],y.prototype,"autofocus",2);a([c()],y.prototype,"enterkeyhint",2);a([c({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],y.prototype,"spellcheck",2);a([c()],y.prototype,"inputmode",2);a([z("disabled",{waitUntilFirstUpdate:!0})],y.prototype,"handleDisabledChange",1);a([z("step",{waitUntilFirstUpdate:!0})],y.prototype,"handleStepChange",1);a([z("value",{waitUntilFirstUpdate:!0})],y.prototype,"handleValueChange",1);y.define("sl-input");var Fs=L`
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
`,Vs=L`
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
`,j=class extends R{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(t){this.disabled&&(t.preventDefault(),t.stopPropagation())}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}render(){const t=!!this.href,e=t?Ee`a`:Ee`button`;return $e`
      <${e}
        part="base"
        class=${I({"icon-button":!0,"icon-button--disabled":!t&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${v(t?void 0:this.disabled)}
        type=${v(t?void 0:"button")}
        href=${v(t?this.href:void 0)}
        target=${v(t?this.target:void 0)}
        download=${v(t?this.download:void 0)}
        rel=${v(t&&this.target?"noreferrer noopener":void 0)}
        role=${v(t?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${v(this.name)}
          library=${v(this.library)}
          src=${v(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${e}>
    `}};j.styles=[B,Vs];j.dependencies={"sl-icon":Y};a([S(".icon-button")],j.prototype,"button",2);a([T()],j.prototype,"hasFocus",2);a([c()],j.prototype,"name",2);a([c()],j.prototype,"library",2);a([c()],j.prototype,"src",2);a([c()],j.prototype,"href",2);a([c()],j.prototype,"target",2);a([c()],j.prototype,"download",2);a([c()],j.prototype,"label",2);a([c({type:Boolean,reflect:!0})],j.prototype,"disabled",2);var Ut=class extends R{constructor(){super(...arguments),this.localize=new Q(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return b`
      <span
        part="base"
        class=${I({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?b`
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
    `}};Ut.styles=[B,Fs];Ut.dependencies={"sl-icon-button":j};a([c({reflect:!0})],Ut.prototype,"variant",2);a([c({reflect:!0})],Ut.prototype,"size",2);a([c({type:Boolean,reflect:!0})],Ut.prototype,"pill",2);a([c({type:Boolean})],Ut.prototype,"removable",2);var Hs=L`
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
`;function Us(t,e){return{top:Math.round(t.getBoundingClientRect().top-e.getBoundingClientRect().top),left:Math.round(t.getBoundingClientRect().left-e.getBoundingClientRect().left)}}var ao=new Set;function Ws(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}function js(){const t=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(t)||!t?0:t}function ce(t){if(ao.add(t),!document.documentElement.classList.contains("sl-scroll-lock")){const e=Ws()+js();let o=getComputedStyle(document.documentElement).scrollbarGutter;(!o||o==="auto")&&(o="stable"),e<2&&(o=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",o),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${e}px`)}}function de(t){ao.delete(t),ao.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function qs(t,e,o="vertical",i="smooth"){const s=Us(t,e),r=s.top+e.scrollTop,n=s.left+e.scrollLeft,l=e.scrollLeft,d=e.scrollLeft+e.offsetWidth,u=e.scrollTop,h=e.scrollTop+e.offsetHeight;(o==="horizontal"||o==="both")&&(n<l?e.scrollTo({left:n,behavior:i}):n+t.clientWidth>d&&e.scrollTo({left:n-e.offsetWidth+t.clientWidth,behavior:i})),(o==="vertical"||o==="both")&&(r<u?e.scrollTo({top:r,behavior:i}):r+t.clientHeight>h&&e.scrollTo({top:r-e.offsetHeight+t.clientHeight,behavior:i}))}var Ks=L`
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
`;const Et=Math.min,G=Math.max,Te=Math.round,xe=Math.floor,ft=t=>({x:t,y:t}),Ys={left:"right",right:"left",bottom:"top",top:"bottom"},Xs={start:"end",end:"start"};function lo(t,e,o){return G(t,Et(e,o))}function Zt(t,e){return typeof t=="function"?t(e):t}function Tt(t){return t.split("-")[0]}function Qt(t){return t.split("-")[1]}function $i(t){return t==="x"?"y":"x"}function Co(t){return t==="y"?"height":"width"}const Gs=new Set(["top","bottom"]);function _t(t){return Gs.has(Tt(t))?"y":"x"}function $o(t){return $i(_t(t))}function Zs(t,e,o){o===void 0&&(o=!1);const i=Qt(t),s=$o(t),r=Co(s);let n=s==="x"?i===(o?"end":"start")?"right":"left":i==="start"?"bottom":"top";return e.reference[r]>e.floating[r]&&(n=ze(n)),[n,ze(n)]}function Qs(t){const e=ze(t);return[co(t),e,co(e)]}function co(t){return t.replace(/start|end/g,e=>Xs[e])}const Yo=["left","right"],Xo=["right","left"],Js=["top","bottom"],tr=["bottom","top"];function er(t,e,o){switch(t){case"top":case"bottom":return o?e?Xo:Yo:e?Yo:Xo;case"left":case"right":return e?Js:tr;default:return[]}}function or(t,e,o,i){const s=Qt(t);let r=er(Tt(t),o==="start",i);return s&&(r=r.map(n=>n+"-"+s),e&&(r=r.concat(r.map(co)))),r}function ze(t){return t.replace(/left|right|bottom|top/g,e=>Ys[e])}function ir(t){return{top:0,right:0,bottom:0,left:0,...t}}function Si(t){return typeof t!="number"?ir(t):{top:t,right:t,bottom:t,left:t}}function Oe(t){const{x:e,y:o,width:i,height:s}=t;return{width:i,height:s,top:o,left:e,right:e+i,bottom:o+s,x:e,y:o}}function Go(t,e,o){let{reference:i,floating:s}=t;const r=_t(e),n=$o(e),l=Co(n),d=Tt(e),u=r==="y",h=i.x+i.width/2-s.width/2,p=i.y+i.height/2-s.height/2,m=i[l]/2-s[l]/2;let f;switch(d){case"top":f={x:h,y:i.y-s.height};break;case"bottom":f={x:h,y:i.y+i.height};break;case"right":f={x:i.x+i.width,y:p};break;case"left":f={x:i.x-s.width,y:p};break;default:f={x:i.x,y:i.y}}switch(Qt(e)){case"start":f[n]-=m*(o&&u?-1:1);break;case"end":f[n]+=m*(o&&u?-1:1);break}return f}const sr=async(t,e,o)=>{const{placement:i="bottom",strategy:s="absolute",middleware:r=[],platform:n}=o,l=r.filter(Boolean),d=await(n.isRTL==null?void 0:n.isRTL(e));let u=await n.getElementRects({reference:t,floating:e,strategy:s}),{x:h,y:p}=Go(u,i,d),m=i,f={},g=0;for(let w=0;w<l.length;w++){const{name:k,fn:_}=l[w],{x:$,y:O,data:N,reset:M}=await _({x:h,y:p,initialPlacement:i,placement:m,strategy:s,middlewareData:f,rects:u,platform:n,elements:{reference:t,floating:e}});h=$??h,p=O??p,f={...f,[k]:{...f[k],...N}},M&&g<=50&&(g++,typeof M=="object"&&(M.placement&&(m=M.placement),M.rects&&(u=M.rects===!0?await n.getElementRects({reference:t,floating:e,strategy:s}):M.rects),{x:h,y:p}=Go(u,m,d)),w=-1)}return{x:h,y:p,placement:m,strategy:s,middlewareData:f}};async function So(t,e){var o;e===void 0&&(e={});const{x:i,y:s,platform:r,rects:n,elements:l,strategy:d}=t,{boundary:u="clippingAncestors",rootBoundary:h="viewport",elementContext:p="floating",altBoundary:m=!1,padding:f=0}=Zt(e,t),g=Si(f),k=l[m?p==="floating"?"reference":"floating":p],_=Oe(await r.getClippingRect({element:(o=await(r.isElement==null?void 0:r.isElement(k)))==null||o?k:k.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(l.floating)),boundary:u,rootBoundary:h,strategy:d})),$=p==="floating"?{x:i,y:s,width:n.floating.width,height:n.floating.height}:n.reference,O=await(r.getOffsetParent==null?void 0:r.getOffsetParent(l.floating)),N=await(r.isElement==null?void 0:r.isElement(O))?await(r.getScale==null?void 0:r.getScale(O))||{x:1,y:1}:{x:1,y:1},M=Oe(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:$,offsetParent:O,strategy:d}):$);return{top:(_.top-M.top+g.top)/N.y,bottom:(M.bottom-_.bottom+g.bottom)/N.y,left:(_.left-M.left+g.left)/N.x,right:(M.right-_.right+g.right)/N.x}}const rr=t=>({name:"arrow",options:t,async fn(e){const{x:o,y:i,placement:s,rects:r,platform:n,elements:l,middlewareData:d}=e,{element:u,padding:h=0}=Zt(t,e)||{};if(u==null)return{};const p=Si(h),m={x:o,y:i},f=$o(s),g=Co(f),w=await n.getDimensions(u),k=f==="y",_=k?"top":"left",$=k?"bottom":"right",O=k?"clientHeight":"clientWidth",N=r.reference[g]+r.reference[f]-m[f]-r.floating[g],M=m[f]-r.reference[f],at=await(n.getOffsetParent==null?void 0:n.getOffsetParent(u));let U=at?at[O]:0;(!U||!await(n.isElement==null?void 0:n.isElement(at)))&&(U=l.floating[O]||r.floating[g]);const vt=N/2-M/2,ht=U/2-w[g]/2-1,ot=Et(p[_],ht),kt=Et(p[$],ht),pt=ot,Ct=U-w[g]-kt,K=U/2-w[g]/2+vt,Pt=lo(pt,K,Ct),yt=!d.arrow&&Qt(s)!=null&&K!==Pt&&r.reference[g]/2-(K<pt?ot:kt)-w[g]/2<0,lt=yt?K<pt?K-pt:K-Ct:0;return{[f]:m[f]+lt,data:{[f]:Pt,centerOffset:K-Pt-lt,...yt&&{alignmentOffset:lt}},reset:yt}}}),nr=function(t){return t===void 0&&(t={}),{name:"flip",options:t,async fn(e){var o,i;const{placement:s,middlewareData:r,rects:n,initialPlacement:l,platform:d,elements:u}=e,{mainAxis:h=!0,crossAxis:p=!0,fallbackPlacements:m,fallbackStrategy:f="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:w=!0,...k}=Zt(t,e);if((o=r.arrow)!=null&&o.alignmentOffset)return{};const _=Tt(s),$=_t(l),O=Tt(l)===l,N=await(d.isRTL==null?void 0:d.isRTL(u.floating)),M=m||(O||!w?[ze(l)]:Qs(l)),at=g!=="none";!m&&at&&M.push(...or(l,w,g,N));const U=[l,...M],vt=await So(e,k),ht=[];let ot=((i=r.flip)==null?void 0:i.overflows)||[];if(h&&ht.push(vt[_]),p){const K=Zs(s,n,N);ht.push(vt[K[0]],vt[K[1]])}if(ot=[...ot,{placement:s,overflows:ht}],!ht.every(K=>K<=0)){var kt,pt;const K=(((kt=r.flip)==null?void 0:kt.index)||0)+1,Pt=U[K];if(Pt&&(!(p==="alignment"?$!==_t(Pt):!1)||ot.every(ct=>_t(ct.placement)===$?ct.overflows[0]>0:!0)))return{data:{index:K,overflows:ot},reset:{placement:Pt}};let yt=(pt=ot.filter(lt=>lt.overflows[0]<=0).sort((lt,ct)=>lt.overflows[1]-ct.overflows[1])[0])==null?void 0:pt.placement;if(!yt)switch(f){case"bestFit":{var Ct;const lt=(Ct=ot.filter(ct=>{if(at){const $t=_t(ct.placement);return $t===$||$t==="y"}return!0}).map(ct=>[ct.placement,ct.overflows.filter($t=>$t>0).reduce(($t,Vi)=>$t+Vi,0)]).sort((ct,$t)=>ct[1]-$t[1])[0])==null?void 0:Ct[0];lt&&(yt=lt);break}case"initialPlacement":yt=l;break}if(s!==yt)return{reset:{placement:yt}}}return{}}}},ar=new Set(["left","top"]);async function lr(t,e){const{placement:o,platform:i,elements:s}=t,r=await(i.isRTL==null?void 0:i.isRTL(s.floating)),n=Tt(o),l=Qt(o),d=_t(o)==="y",u=ar.has(n)?-1:1,h=r&&d?-1:1,p=Zt(e,t);let{mainAxis:m,crossAxis:f,alignmentAxis:g}=typeof p=="number"?{mainAxis:p,crossAxis:0,alignmentAxis:null}:{mainAxis:p.mainAxis||0,crossAxis:p.crossAxis||0,alignmentAxis:p.alignmentAxis};return l&&typeof g=="number"&&(f=l==="end"?g*-1:g),d?{x:f*h,y:m*u}:{x:m*u,y:f*h}}const cr=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var o,i;const{x:s,y:r,placement:n,middlewareData:l}=e,d=await lr(e,t);return n===((o=l.offset)==null?void 0:o.placement)&&(i=l.arrow)!=null&&i.alignmentOffset?{}:{x:s+d.x,y:r+d.y,data:{...d,placement:n}}}}},dr=function(t){return t===void 0&&(t={}),{name:"shift",options:t,async fn(e){const{x:o,y:i,placement:s}=e,{mainAxis:r=!0,crossAxis:n=!1,limiter:l={fn:k=>{let{x:_,y:$}=k;return{x:_,y:$}}},...d}=Zt(t,e),u={x:o,y:i},h=await So(e,d),p=_t(Tt(s)),m=$i(p);let f=u[m],g=u[p];if(r){const k=m==="y"?"top":"left",_=m==="y"?"bottom":"right",$=f+h[k],O=f-h[_];f=lo($,f,O)}if(n){const k=p==="y"?"top":"left",_=p==="y"?"bottom":"right",$=g+h[k],O=g-h[_];g=lo($,g,O)}const w=l.fn({...e,[m]:f,[p]:g});return{...w,data:{x:w.x-o,y:w.y-i,enabled:{[m]:r,[p]:n}}}}}},ur=function(t){return t===void 0&&(t={}),{name:"size",options:t,async fn(e){var o,i;const{placement:s,rects:r,platform:n,elements:l}=e,{apply:d=()=>{},...u}=Zt(t,e),h=await So(e,u),p=Tt(s),m=Qt(s),f=_t(s)==="y",{width:g,height:w}=r.floating;let k,_;p==="top"||p==="bottom"?(k=p,_=m===(await(n.isRTL==null?void 0:n.isRTL(l.floating))?"start":"end")?"left":"right"):(_=p,k=m==="end"?"top":"bottom");const $=w-h.top-h.bottom,O=g-h.left-h.right,N=Et(w-h[k],$),M=Et(g-h[_],O),at=!e.middlewareData.shift;let U=N,vt=M;if((o=e.middlewareData.shift)!=null&&o.enabled.x&&(vt=O),(i=e.middlewareData.shift)!=null&&i.enabled.y&&(U=$),at&&!m){const ot=G(h.left,0),kt=G(h.right,0),pt=G(h.top,0),Ct=G(h.bottom,0);f?vt=g-2*(ot!==0||kt!==0?ot+kt:G(h.left,h.right)):U=w-2*(pt!==0||Ct!==0?pt+Ct:G(h.top,h.bottom))}await d({...e,availableWidth:vt,availableHeight:U});const ht=await n.getDimensions(l.floating);return g!==ht.width||w!==ht.height?{reset:{rects:!0}}:{}}}};function Ne(){return typeof window<"u"}function Jt(t){return Ai(t)?(t.nodeName||"").toLowerCase():"#document"}function Z(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function gt(t){var e;return(e=(Ai(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function Ai(t){return Ne()?t instanceof Node||t instanceof Z(t).Node:!1}function dt(t){return Ne()?t instanceof Element||t instanceof Z(t).Element:!1}function mt(t){return Ne()?t instanceof HTMLElement||t instanceof Z(t).HTMLElement:!1}function Zo(t){return!Ne()||typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof Z(t).ShadowRoot}const hr=new Set(["inline","contents"]);function be(t){const{overflow:e,overflowX:o,overflowY:i,display:s}=ut(t);return/auto|scroll|overlay|hidden|clip/.test(e+i+o)&&!hr.has(s)}const pr=new Set(["table","td","th"]);function fr(t){return pr.has(Jt(t))}const mr=[":popover-open",":modal"];function Fe(t){return mr.some(e=>{try{return t.matches(e)}catch{return!1}})}const gr=["transform","translate","scale","rotate","perspective"],br=["transform","translate","scale","rotate","perspective","filter"],vr=["paint","layout","strict","content"];function Ve(t){const e=Ao(),o=dt(t)?ut(t):t;return gr.some(i=>o[i]?o[i]!=="none":!1)||(o.containerType?o.containerType!=="normal":!1)||!e&&(o.backdropFilter?o.backdropFilter!=="none":!1)||!e&&(o.filter?o.filter!=="none":!1)||br.some(i=>(o.willChange||"").includes(i))||vr.some(i=>(o.contain||"").includes(i))}function yr(t){let e=zt(t);for(;mt(e)&&!Xt(e);){if(Ve(e))return e;if(Fe(e))return null;e=zt(e)}return null}function Ao(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const wr=new Set(["html","body","#document"]);function Xt(t){return wr.has(Jt(t))}function ut(t){return Z(t).getComputedStyle(t)}function He(t){return dt(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function zt(t){if(Jt(t)==="html")return t;const e=t.assignedSlot||t.parentNode||Zo(t)&&t.host||gt(t);return Zo(e)?e.host:e}function Ei(t){const e=zt(t);return Xt(e)?t.ownerDocument?t.ownerDocument.body:t.body:mt(e)&&be(e)?e:Ei(e)}function me(t,e,o){var i;e===void 0&&(e=[]),o===void 0&&(o=!0);const s=Ei(t),r=s===((i=t.ownerDocument)==null?void 0:i.body),n=Z(s);if(r){const l=uo(n);return e.concat(n,n.visualViewport||[],be(s)?s:[],l&&o?me(l):[])}return e.concat(s,me(s,[],o))}function uo(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function Ti(t){const e=ut(t);let o=parseFloat(e.width)||0,i=parseFloat(e.height)||0;const s=mt(t),r=s?t.offsetWidth:o,n=s?t.offsetHeight:i,l=Te(o)!==r||Te(i)!==n;return l&&(o=r,i=n),{width:o,height:i,$:l}}function Eo(t){return dt(t)?t:t.contextElement}function qt(t){const e=Eo(t);if(!mt(e))return ft(1);const o=e.getBoundingClientRect(),{width:i,height:s,$:r}=Ti(e);let n=(r?Te(o.width):o.width)/i,l=(r?Te(o.height):o.height)/s;return(!n||!Number.isFinite(n))&&(n=1),(!l||!Number.isFinite(l))&&(l=1),{x:n,y:l}}const _r=ft(0);function zi(t){const e=Z(t);return!Ao()||!e.visualViewport?_r:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function xr(t,e,o){return e===void 0&&(e=!1),!o||e&&o!==Z(t)?!1:e}function Ft(t,e,o,i){e===void 0&&(e=!1),o===void 0&&(o=!1);const s=t.getBoundingClientRect(),r=Eo(t);let n=ft(1);e&&(i?dt(i)&&(n=qt(i)):n=qt(t));const l=xr(r,o,i)?zi(r):ft(0);let d=(s.left+l.x)/n.x,u=(s.top+l.y)/n.y,h=s.width/n.x,p=s.height/n.y;if(r){const m=Z(r),f=i&&dt(i)?Z(i):i;let g=m,w=uo(g);for(;w&&i&&f!==g;){const k=qt(w),_=w.getBoundingClientRect(),$=ut(w),O=_.left+(w.clientLeft+parseFloat($.paddingLeft))*k.x,N=_.top+(w.clientTop+parseFloat($.paddingTop))*k.y;d*=k.x,u*=k.y,h*=k.x,p*=k.y,d+=O,u+=N,g=Z(w),w=uo(g)}}return Oe({width:h,height:p,x:d,y:u})}function Ue(t,e){const o=He(t).scrollLeft;return e?e.left+o:Ft(gt(t)).left+o}function Oi(t,e){const o=t.getBoundingClientRect(),i=o.left+e.scrollLeft-Ue(t,o),s=o.top+e.scrollTop;return{x:i,y:s}}function kr(t){let{elements:e,rect:o,offsetParent:i,strategy:s}=t;const r=s==="fixed",n=gt(i),l=e?Fe(e.floating):!1;if(i===n||l&&r)return o;let d={scrollLeft:0,scrollTop:0},u=ft(1);const h=ft(0),p=mt(i);if((p||!p&&!r)&&((Jt(i)!=="body"||be(n))&&(d=He(i)),mt(i))){const f=Ft(i);u=qt(i),h.x=f.x+i.clientLeft,h.y=f.y+i.clientTop}const m=n&&!p&&!r?Oi(n,d):ft(0);return{width:o.width*u.x,height:o.height*u.y,x:o.x*u.x-d.scrollLeft*u.x+h.x+m.x,y:o.y*u.y-d.scrollTop*u.y+h.y+m.y}}function Cr(t){return Array.from(t.getClientRects())}function $r(t){const e=gt(t),o=He(t),i=t.ownerDocument.body,s=G(e.scrollWidth,e.clientWidth,i.scrollWidth,i.clientWidth),r=G(e.scrollHeight,e.clientHeight,i.scrollHeight,i.clientHeight);let n=-o.scrollLeft+Ue(t);const l=-o.scrollTop;return ut(i).direction==="rtl"&&(n+=G(e.clientWidth,i.clientWidth)-s),{width:s,height:r,x:n,y:l}}const Qo=25;function Sr(t,e){const o=Z(t),i=gt(t),s=o.visualViewport;let r=i.clientWidth,n=i.clientHeight,l=0,d=0;if(s){r=s.width,n=s.height;const h=Ao();(!h||h&&e==="fixed")&&(l=s.offsetLeft,d=s.offsetTop)}const u=Ue(i);if(u<=0){const h=i.ownerDocument,p=h.body,m=getComputedStyle(p),f=h.compatMode==="CSS1Compat"&&parseFloat(m.marginLeft)+parseFloat(m.marginRight)||0,g=Math.abs(i.clientWidth-p.clientWidth-f);g<=Qo&&(r-=g)}else u<=Qo&&(r+=u);return{width:r,height:n,x:l,y:d}}const Ar=new Set(["absolute","fixed"]);function Er(t,e){const o=Ft(t,!0,e==="fixed"),i=o.top+t.clientTop,s=o.left+t.clientLeft,r=mt(t)?qt(t):ft(1),n=t.clientWidth*r.x,l=t.clientHeight*r.y,d=s*r.x,u=i*r.y;return{width:n,height:l,x:d,y:u}}function Jo(t,e,o){let i;if(e==="viewport")i=Sr(t,o);else if(e==="document")i=$r(gt(t));else if(dt(e))i=Er(e,o);else{const s=zi(t);i={x:e.x-s.x,y:e.y-s.y,width:e.width,height:e.height}}return Oe(i)}function Li(t,e){const o=zt(t);return o===e||!dt(o)||Xt(o)?!1:ut(o).position==="fixed"||Li(o,e)}function Tr(t,e){const o=e.get(t);if(o)return o;let i=me(t,[],!1).filter(l=>dt(l)&&Jt(l)!=="body"),s=null;const r=ut(t).position==="fixed";let n=r?zt(t):t;for(;dt(n)&&!Xt(n);){const l=ut(n),d=Ve(n);!d&&l.position==="fixed"&&(s=null),(r?!d&&!s:!d&&l.position==="static"&&!!s&&Ar.has(s.position)||be(n)&&!d&&Li(t,n))?i=i.filter(h=>h!==n):s=l,n=zt(n)}return e.set(t,i),i}function zr(t){let{element:e,boundary:o,rootBoundary:i,strategy:s}=t;const n=[...o==="clippingAncestors"?Fe(e)?[]:Tr(e,this._c):[].concat(o),i],l=n[0],d=n.reduce((u,h)=>{const p=Jo(e,h,s);return u.top=G(p.top,u.top),u.right=Et(p.right,u.right),u.bottom=Et(p.bottom,u.bottom),u.left=G(p.left,u.left),u},Jo(e,l,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Or(t){const{width:e,height:o}=Ti(t);return{width:e,height:o}}function Lr(t,e,o){const i=mt(e),s=gt(e),r=o==="fixed",n=Ft(t,!0,r,e);let l={scrollLeft:0,scrollTop:0};const d=ft(0);function u(){d.x=Ue(s)}if(i||!i&&!r)if((Jt(e)!=="body"||be(s))&&(l=He(e)),i){const f=Ft(e,!0,r,e);d.x=f.x+e.clientLeft,d.y=f.y+e.clientTop}else s&&u();r&&!i&&s&&u();const h=s&&!i&&!r?Oi(s,l):ft(0),p=n.left+l.scrollLeft-d.x-h.x,m=n.top+l.scrollTop-d.y-h.y;return{x:p,y:m,width:n.width,height:n.height}}function to(t){return ut(t).position==="static"}function ti(t,e){if(!mt(t)||ut(t).position==="fixed")return null;if(e)return e(t);let o=t.offsetParent;return gt(t)===o&&(o=o.ownerDocument.body),o}function Pi(t,e){const o=Z(t);if(Fe(t))return o;if(!mt(t)){let s=zt(t);for(;s&&!Xt(s);){if(dt(s)&&!to(s))return s;s=zt(s)}return o}let i=ti(t,e);for(;i&&fr(i)&&to(i);)i=ti(i,e);return i&&Xt(i)&&to(i)&&!Ve(i)?o:i||yr(t)||o}const Pr=async function(t){const e=this.getOffsetParent||Pi,o=this.getDimensions,i=await o(t.floating);return{reference:Lr(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:i.width,height:i.height}}};function Dr(t){return ut(t).direction==="rtl"}const Se={convertOffsetParentRelativeRectToViewportRelativeRect:kr,getDocumentElement:gt,getClippingRect:zr,getOffsetParent:Pi,getElementRects:Pr,getClientRects:Cr,getDimensions:Or,getScale:qt,isElement:dt,isRTL:Dr};function Di(t,e){return t.x===e.x&&t.y===e.y&&t.width===e.width&&t.height===e.height}function Rr(t,e){let o=null,i;const s=gt(t);function r(){var l;clearTimeout(i),(l=o)==null||l.disconnect(),o=null}function n(l,d){l===void 0&&(l=!1),d===void 0&&(d=1),r();const u=t.getBoundingClientRect(),{left:h,top:p,width:m,height:f}=u;if(l||e(),!m||!f)return;const g=xe(p),w=xe(s.clientWidth-(h+m)),k=xe(s.clientHeight-(p+f)),_=xe(h),O={rootMargin:-g+"px "+-w+"px "+-k+"px "+-_+"px",threshold:G(0,Et(1,d))||1};let N=!0;function M(at){const U=at[0].intersectionRatio;if(U!==d){if(!N)return n();U?n(!1,U):i=setTimeout(()=>{n(!1,1e-7)},1e3)}U===1&&!Di(u,t.getBoundingClientRect())&&n(),N=!1}try{o=new IntersectionObserver(M,{...O,root:s.ownerDocument})}catch{o=new IntersectionObserver(M,O)}o.observe(t)}return n(!0),r}function Mr(t,e,o,i){i===void 0&&(i={});const{ancestorScroll:s=!0,ancestorResize:r=!0,elementResize:n=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:d=!1}=i,u=Eo(t),h=s||r?[...u?me(u):[],...me(e)]:[];h.forEach(_=>{s&&_.addEventListener("scroll",o,{passive:!0}),r&&_.addEventListener("resize",o)});const p=u&&l?Rr(u,o):null;let m=-1,f=null;n&&(f=new ResizeObserver(_=>{let[$]=_;$&&$.target===u&&f&&(f.unobserve(e),cancelAnimationFrame(m),m=requestAnimationFrame(()=>{var O;(O=f)==null||O.observe(e)})),o()}),u&&!d&&f.observe(u),f.observe(e));let g,w=d?Ft(t):null;d&&k();function k(){const _=Ft(t);w&&!Di(w,_)&&o(),w=_,g=requestAnimationFrame(k)}return o(),()=>{var _;h.forEach($=>{s&&$.removeEventListener("scroll",o),r&&$.removeEventListener("resize",o)}),p==null||p(),(_=f)==null||_.disconnect(),f=null,d&&cancelAnimationFrame(g)}}const Ir=cr,Br=dr,Nr=nr,ei=ur,Fr=rr,Vr=(t,e,o)=>{const i=new Map,s={platform:Se,...o},r={...s.platform,_c:i};return sr(t,e,{...s,platform:r})};function Hr(t){return Ur(t)}function eo(t){return t.assignedSlot?t.assignedSlot:t.parentNode instanceof ShadowRoot?t.parentNode.host:t.parentNode}function Ur(t){for(let e=t;e;e=eo(e))if(e instanceof Element&&getComputedStyle(e).display==="none")return null;for(let e=eo(t);e;e=eo(e)){if(!(e instanceof Element))continue;const o=getComputedStyle(e);if(o.display!=="contents"&&(o.position!=="static"||Ve(o)||e.tagName==="BODY"))return e}return null}function Wr(t){return t!==null&&typeof t=="object"&&"getBoundingClientRect"in t&&("contextElement"in t?t.contextElement instanceof Element:!0)}var E=class extends R{constructor(){super(...arguments),this.localize=new Q(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const t=this.anchorEl.getBoundingClientRect(),e=this.popup.getBoundingClientRect(),o=this.placement.includes("top")||this.placement.includes("bottom");let i=0,s=0,r=0,n=0,l=0,d=0,u=0,h=0;o?t.top<e.top?(i=t.left,s=t.bottom,r=t.right,n=t.bottom,l=e.left,d=e.top,u=e.right,h=e.top):(i=e.left,s=e.bottom,r=e.right,n=e.bottom,l=t.left,d=t.top,u=t.right,h=t.top):t.left<e.left?(i=t.right,s=t.top,r=e.left,n=e.top,l=t.right,d=t.bottom,u=e.left,h=e.bottom):(i=e.right,s=e.top,r=t.left,n=t.top,l=e.right,d=e.bottom,u=t.left,h=t.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${i}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${n}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${l}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${h}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(t){super.updated(t),t.has("active")&&(this.active?this.start():this.stop()),t.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const t=this.getRootNode();this.anchorEl=t.getElementById(this.anchor)}else this.anchor instanceof Element||Wr(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Mr(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(t=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>t())):t()})}reposition(){if(!this.active||!this.anchorEl)return;const t=[Ir({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?t.push(ei({apply:({rects:o})=>{const i=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=i?`${o.reference.width}px`:"",this.popup.style.height=s?`${o.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&t.push(Nr({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&t.push(Br({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?t.push(ei({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:o,availableHeight:i})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${i}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${o}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&t.push(Fr({element:this.arrowEl,padding:this.arrowPadding}));const e=this.strategy==="absolute"?o=>Se.getOffsetParent(o,Hr):Se.getOffsetParent;Vr(this.anchorEl,this.popup,{placement:this.placement,middleware:t,strategy:this.strategy,platform:De(Ht({},Se),{getOffsetParent:e})}).then(({x:o,y:i,middlewareData:s,placement:r})=>{const n=this.localize.dir()==="rtl",l={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${o}px`,top:`${i}px`}),this.arrow){const d=s.arrow.x,u=s.arrow.y;let h="",p="",m="",f="";if(this.arrowPlacement==="start"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";h=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",p=n?g:"",f=n?"":g}else if(this.arrowPlacement==="end"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=n?"":g,f=n?g:"",m=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(f=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",h=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(f=typeof d=="number"?`${d}px`:"",h=typeof u=="number"?`${u}px`:"");Object.assign(this.arrowEl.style,{top:h,right:p,bottom:m,left:f,[l]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return b`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${I({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${I({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy==="fixed","popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?b`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};E.styles=[B,Ks];a([S(".popup")],E.prototype,"popup",2);a([S(".popup__arrow")],E.prototype,"arrowEl",2);a([c()],E.prototype,"anchor",2);a([c({type:Boolean,reflect:!0})],E.prototype,"active",2);a([c({reflect:!0})],E.prototype,"placement",2);a([c({reflect:!0})],E.prototype,"strategy",2);a([c({type:Number})],E.prototype,"distance",2);a([c({type:Number})],E.prototype,"skidding",2);a([c({type:Boolean})],E.prototype,"arrow",2);a([c({attribute:"arrow-placement"})],E.prototype,"arrowPlacement",2);a([c({attribute:"arrow-padding",type:Number})],E.prototype,"arrowPadding",2);a([c({type:Boolean})],E.prototype,"flip",2);a([c({attribute:"flip-fallback-placements",converter:{fromAttribute:t=>t.split(" ").map(e=>e.trim()).filter(e=>e!==""),toAttribute:t=>t.join(" ")}})],E.prototype,"flipFallbackPlacements",2);a([c({attribute:"flip-fallback-strategy"})],E.prototype,"flipFallbackStrategy",2);a([c({type:Object})],E.prototype,"flipBoundary",2);a([c({attribute:"flip-padding",type:Number})],E.prototype,"flipPadding",2);a([c({type:Boolean})],E.prototype,"shift",2);a([c({type:Object})],E.prototype,"shiftBoundary",2);a([c({attribute:"shift-padding",type:Number})],E.prototype,"shiftPadding",2);a([c({attribute:"auto-size"})],E.prototype,"autoSize",2);a([c()],E.prototype,"sync",2);a([c({type:Object})],E.prototype,"autoSizeBoundary",2);a([c({attribute:"auto-size-padding",type:Number})],E.prototype,"autoSizePadding",2);a([c({attribute:"hover-bridge",type:Boolean})],E.prototype,"hoverBridge",2);var Ri=new Map,jr=new WeakMap;function qr(t){return t??{keyframes:[],options:{duration:0}}}function oi(t,e){return e.toLowerCase()==="rtl"?{keyframes:t.rtlKeyframes||t.keyframes,options:t.options}:t}function D(t,e){Ri.set(t,qr(e))}function F(t,e,o){const i=jr.get(t);if(i!=null&&i[e])return oi(i[e],o.dir);const s=Ri.get(e);return s?oi(s,o.dir):{keyframes:[],options:{duration:0}}}function st(t,e){return new Promise(o=>{function i(s){s.target===t&&(t.removeEventListener(e,i),o())}t.addEventListener(e,i)})}function V(t,e,o){return new Promise(i=>{if((o==null?void 0:o.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=t.animate(e,De(Ht({},o),{duration:Kr()?0:o.duration}));s.addEventListener("cancel",i,{once:!0}),s.addEventListener("finish",i,{once:!0})})}function ii(t){return t=t.toString().toLowerCase(),t.indexOf("ms")>-1?parseFloat(t):t.indexOf("s")>-1?parseFloat(t)*1e3:parseFloat(t)}function Kr(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function W(t){return Promise.all(t.getAnimations().map(e=>new Promise(o=>{e.cancel(),requestAnimationFrame(o)})))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ho=class extends Be{constructor(e){if(super(e),this.it=P,e.type!==wt.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===P||e==null)return this._t=void 0,this.it=e;if(e===it)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const o=[e];return o.raw=o,this._t={_$litType$:this.constructor.resultType,strings:o,values:[]}}};ho.directiveName="unsafeHTML",ho.resultType=1;const Yr=Ie(ho);var x=class extends R{constructor(){super(...arguments),this.formControlController=new Me(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Lt(this,"help-text","label"),this.localize=new Q(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=t=>b`
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
        @sl-remove=${e=>this.handleTagRemove(e,t)}
      >
        ${t.getTextLabel()}
      </sl-tag>
    `,this.handleDocumentFocusIn=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()},this.handleDocumentKeyDown=t=>{const e=t.target,o=e.closest(".select__clear")!==null,i=e.closest("sl-icon-button")!==null;if(!(o||i)){if(t.key==="Escape"&&this.open&&!this.closeWatcher&&(t.preventDefault(),t.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),t.key==="Enter"||t.key===" "&&this.typeToSelectString===""){if(t.preventDefault(),t.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(t.key)){const s=this.getAllOptions(),r=s.indexOf(this.currentOption);let n=Math.max(0,r);if(t.preventDefault(),!this.open&&(this.show(),this.currentOption))return;t.key==="ArrowDown"?(n=r+1,n>s.length-1&&(n=0)):t.key==="ArrowUp"?(n=r-1,n<0&&(n=s.length-1)):t.key==="Home"?n=0:t.key==="End"&&(n=s.length-1),this.setCurrentOption(s[n])}if(t.key&&t.key.length===1||t.key==="Backspace"){const s=this.getAllOptions();if(t.metaKey||t.ctrlKey||t.altKey)return;if(!this.open){if(t.key==="Backspace")return;this.show()}t.stopPropagation(),t.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),t.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=t.key.toLowerCase();for(const r of s)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()}}get value(){return this._value}set value(t){this.multiple?t=Array.isArray(t)?t:t.split(" "):t=Array.isArray(t)?t.join(" "):t,this._value!==t&&(this.valueHasChanged=!0,this._value=t)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var t;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var t;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(t=this.closeWatcher)==null||t.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(t){const o=t.composedPath().some(i=>i instanceof Element&&i.tagName.toLowerCase()==="sl-icon-button");this.disabled||o||(t.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(t){t.key!=="Tab"&&(t.stopPropagation(),this.handleDocumentKeyDown(t))}handleClearClick(t){t.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(t){t.stopPropagation(),t.preventDefault()}handleOptionClick(t){const o=t.target.closest("sl-option"),i=this.value;o&&!o.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(o):this.setSelectedOptions(o),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==i&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const t=this.getAllOptions(),e=this.valueHasChanged?this.value:this.defaultValue,o=Array.isArray(e)?e:[e],i=[];t.forEach(s=>i.push(s.value)),this.setSelectedOptions(t.filter(s=>o.includes(s.value)))}handleTagRemove(t,e){t.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(e,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(t){this.getAllOptions().forEach(o=>{o.current=!1,o.tabIndex=-1}),t&&(this.currentOption=t,t.current=!0,t.tabIndex=0,t.focus())}setSelectedOptions(t){const e=this.getAllOptions(),o=Array.isArray(t)?t:[t];e.forEach(i=>i.selected=!1),o.length&&o.forEach(i=>i.selected=!0),this.selectionChanged()}toggleOptionSelection(t,e){e===!0||e===!1?t.selected=e:t.selected=!t.selected,this.selectionChanged()}selectionChanged(){var t,e,o;const i=this.getAllOptions();this.selectedOptions=i.filter(r=>r.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(t=r==null?void 0:r.value)!=null?t:"",this.displayLabel=(o=(e=r==null?void 0:r.getTextLabel)==null?void 0:e.call(r))!=null?o:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((t,e)=>{if(e<this.maxOptionsVisible||this.maxOptionsVisible<=0){const o=this.getTag(t,e);return b`<div @sl-remove=${i=>this.handleTagRemove(i,t)}>
          ${typeof o=="string"?Yr(o):o}
        </div>`}else if(e===this.maxOptionsVisible)return b`<sl-tag size=${this.size}>+${this.selectedOptions.length-e}</sl-tag>`;return b``})}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(t,e,o){if(super.attributeChangedCallback(t,e,o),t==="value"){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}}handleValueChange(){if(!this.valueHasChanged){const o=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=o}const t=this.getAllOptions(),e=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(t.filter(o=>e.includes(o.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await W(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:t,options:e}=F(this,"select.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.currentOption&&qs(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await W(this);const{keyframes:t,options:e}=F(this,"select.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,st(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,st(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(t){this.valueInput.setCustomValidity(t),this.formControlController.updateValidity()}focus(t){this.displayInput.focus(t)}blur(){this.displayInput.blur()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),o=this.label?!0:!!t,i=this.helpText?!0:!!e,s=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return b`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":o,"form-control--has-help-text":i})}
      >
        <label
          id="label"
          part="form-control-label"
          class="form-control__label"
          aria-hidden=${o?"false":"true"}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <sl-popup
            class=${I({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":r,"select--top":this.placement==="top","select--bottom":this.placement==="bottom","select--small":this.size==="small","select--medium":this.size==="medium","select--large":this.size==="large"})}
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

              ${this.multiple?b`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${s?b`
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
    `}};x.styles=[B,ko,Hs];x.dependencies={"sl-icon":Y,"sl-popup":E,"sl-tag":Ut};a([S(".select")],x.prototype,"popup",2);a([S(".select__combobox")],x.prototype,"combobox",2);a([S(".select__display-input")],x.prototype,"displayInput",2);a([S(".select__value-input")],x.prototype,"valueInput",2);a([S(".select__listbox")],x.prototype,"listbox",2);a([T()],x.prototype,"hasFocus",2);a([T()],x.prototype,"displayLabel",2);a([T()],x.prototype,"currentOption",2);a([T()],x.prototype,"selectedOptions",2);a([T()],x.prototype,"valueHasChanged",2);a([c()],x.prototype,"name",2);a([T()],x.prototype,"value",1);a([c({attribute:"value"})],x.prototype,"defaultValue",2);a([c({reflect:!0})],x.prototype,"size",2);a([c()],x.prototype,"placeholder",2);a([c({type:Boolean,reflect:!0})],x.prototype,"multiple",2);a([c({attribute:"max-options-visible",type:Number})],x.prototype,"maxOptionsVisible",2);a([c({type:Boolean,reflect:!0})],x.prototype,"disabled",2);a([c({type:Boolean})],x.prototype,"clearable",2);a([c({type:Boolean,reflect:!0})],x.prototype,"open",2);a([c({type:Boolean})],x.prototype,"hoist",2);a([c({type:Boolean,reflect:!0})],x.prototype,"filled",2);a([c({type:Boolean,reflect:!0})],x.prototype,"pill",2);a([c()],x.prototype,"label",2);a([c({reflect:!0})],x.prototype,"placement",2);a([c({attribute:"help-text"})],x.prototype,"helpText",2);a([c({reflect:!0})],x.prototype,"form",2);a([c({type:Boolean,reflect:!0})],x.prototype,"required",2);a([c()],x.prototype,"getTag",2);a([z("disabled",{waitUntilFirstUpdate:!0})],x.prototype,"handleDisabledChange",1);a([z(["defaultValue","value"],{waitUntilFirstUpdate:!0})],x.prototype,"handleValueChange",1);a([z("open",{waitUntilFirstUpdate:!0})],x.prototype,"handleOpenChange",1);D("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});D("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});x.define("sl-select");var Xr=L`
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
`,rt=class extends R{constructor(){super(...arguments),this.localize=new Q(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const t=this.closest("sl-select");t&&t.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const t=this.childNodes;let e="";return[...t].forEach(o=>{o.nodeType===Node.ELEMENT_NODE&&(o.hasAttribute("slot")||(e+=o.textContent)),o.nodeType===Node.TEXT_NODE&&(e+=o.textContent)}),e.trim()}render(){return b`
      <div
        part="base"
        class=${I({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};rt.styles=[B,Xr];rt.dependencies={"sl-icon":Y};a([S(".option__label")],rt.prototype,"defaultSlot",2);a([T()],rt.prototype,"current",2);a([T()],rt.prototype,"selected",2);a([T()],rt.prototype,"hasHover",2);a([c({reflect:!0})],rt.prototype,"value",2);a([c({type:Boolean,reflect:!0})],rt.prototype,"disabled",2);a([z("disabled")],rt.prototype,"handleDisabledChange",1);a([z("selected")],rt.prototype,"handleSelectedChange",1);a([z("value")],rt.prototype,"handleValueChange",1);rt.define("sl-option");var Gr=L`
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
`;function*To(t=document.activeElement){t!=null&&(yield t,"shadowRoot"in t&&t.shadowRoot&&t.shadowRoot.mode!=="closed"&&(yield*ys(To(t.shadowRoot.activeElement))))}function Mi(){return[...To()].pop()}var si=new WeakMap;function Ii(t){let e=si.get(t);return e||(e=window.getComputedStyle(t,null),si.set(t,e)),e}function Zr(t){if(typeof t.checkVisibility=="function")return t.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const e=Ii(t);return e.visibility!=="hidden"&&e.display!=="none"}function Qr(t){const e=Ii(t),{overflowY:o,overflowX:i}=e;return o==="scroll"||i==="scroll"?!0:o!=="auto"||i!=="auto"?!1:t.scrollHeight>t.clientHeight&&o==="auto"||t.scrollWidth>t.clientWidth&&i==="auto"}function Jr(t){const e=t.tagName.toLowerCase(),o=Number(t.getAttribute("tabindex"));if(t.hasAttribute("tabindex")&&(isNaN(o)||o<=-1)||t.hasAttribute("disabled")||t.closest("[inert]"))return!1;if(e==="input"&&t.getAttribute("type")==="radio"){const r=t.getRootNode(),n=`input[type='radio'][name="${t.getAttribute("name")}"]`,l=r.querySelector(`${n}:checked`);return l?l===t:r.querySelector(n)===t}return Zr(t)?(e==="audio"||e==="video")&&t.hasAttribute("controls")||t.hasAttribute("tabindex")||t.hasAttribute("contenteditable")&&t.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(e)?!0:Qr(t):!1}function tn(t){var e,o;const i=po(t),s=(e=i[0])!=null?e:null,r=(o=i[i.length-1])!=null?o:null;return{start:s,end:r}}function en(t,e){var o;return((o=t.getRootNode({composed:!0}))==null?void 0:o.host)!==e}function po(t){const e=new WeakMap,o=[];function i(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||e.has(s))return;e.set(s,!0),!o.includes(s)&&Jr(s)&&o.push(s),s instanceof HTMLSlotElement&&en(s,t)&&s.assignedElements({flatten:!0}).forEach(r=>{i(r)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&i(s.shadowRoot)}for(const r of s.children)i(r)}return i(t),o.sort((s,r)=>{const n=Number(s.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-n})}var ne=[],Bi=class{constructor(t){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=e=>{var o;if(e.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const i=Mi();if(this.previousFocus=i,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;e.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=po(this.element);let r=s.findIndex(l=>l===i);this.previousFocus=this.currentFocus;const n=this.tabDirection==="forward"?1:-1;for(;;){r+n>=s.length?r=0:r+n<0?r=s.length-1:r+=n,this.previousFocus=this.currentFocus;const l=s[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||l&&this.possiblyHasTabbableChildren(l))return;e.preventDefault(),this.currentFocus=l,(o=this.currentFocus)==null||o.focus({preventScroll:!1});const d=[...To()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=t,this.elementsWithTabbableControls=["iframe"]}activate(){ne.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){ne=ne.filter(t=>t!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return ne[ne.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const t=po(this.element);if(!this.element.matches(":focus-within")){const e=t[0],o=t[t.length-1],i=this.tabDirection==="forward"?e:o;typeof(i==null?void 0:i.focus)=="function"&&(this.currentFocus=i,i.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(t){return this.elementsWithTabbableControls.includes(t.tagName.toLowerCase())||t.hasAttribute("controls")}},zo=t=>{var e;const{activeElement:o}=document;o&&t.contains(o)&&((e=document.activeElement)==null||e.blur())};function ri(t){return t.charAt(0).toUpperCase()+t.slice(1)}var J=class extends R{constructor(){super(...arguments),this.hasSlotController=new Lt(this,"footer"),this.localize=new Q(this),this.modal=new Bi(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=t=>{this.contained||t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),ce(this)))}disconnectedCallback(){super.disconnectedCallback(),de(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const o=F(this,"drawer.denyClose",{dir:this.localize.dir()});V(this.panel,o.keyframes,o.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;document.removeEventListener("keydown",this.handleDocumentKeyDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),ce(this));const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([W(this.drawer),W(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=F(this,`drawer.show${ri(this.placement)}`,{dir:this.localize.dir()}),o=F(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,o.keyframes,o.options)]),this.emit("sl-after-show")}else{zo(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),de(this)),await Promise.all([W(this.drawer),W(this.overlay)]);const t=F(this,`drawer.hide${ri(this.placement)}`,{dir:this.localize.dir()}),e=F(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const o=this.originalTrigger;typeof(o==null?void 0:o.focus)=="function"&&setTimeout(()=>o.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),ce(this)),this.open&&this.contained&&(this.modal.deactivate(),de(this))}async show(){if(!this.open)return this.open=!0,st(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,st(this,"sl-after-hide")}render(){return b`
      <div
        part="base"
        class=${I({drawer:!0,"drawer--open":this.open,"drawer--top":this.placement==="top","drawer--end":this.placement==="end","drawer--bottom":this.placement==="bottom","drawer--start":this.placement==="start","drawer--contained":this.contained,"drawer--fixed":!this.contained,"drawer--rtl":this.localize.dir()==="rtl","drawer--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="drawer__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${v(this.noHeader?this.label:void 0)}
          aria-labelledby=${v(this.noHeader?void 0:"title")}
          tabindex="0"
        >
          ${this.noHeader?"":b`
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
    `}};J.styles=[B,Gr];J.dependencies={"sl-icon-button":j};a([S(".drawer")],J.prototype,"drawer",2);a([S(".drawer__panel")],J.prototype,"panel",2);a([S(".drawer__overlay")],J.prototype,"overlay",2);a([c({type:Boolean,reflect:!0})],J.prototype,"open",2);a([c({reflect:!0})],J.prototype,"label",2);a([c({reflect:!0})],J.prototype,"placement",2);a([c({type:Boolean,reflect:!0})],J.prototype,"contained",2);a([c({attribute:"no-header",type:Boolean,reflect:!0})],J.prototype,"noHeader",2);a([z("open",{waitUntilFirstUpdate:!0})],J.prototype,"handleOpenChange",1);a([z("contained",{waitUntilFirstUpdate:!0})],J.prototype,"handleNoModalChange",1);D("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});D("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});D("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});D("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});D("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});D("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});D("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});D("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});D("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});D("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});D("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});J.define("sl-drawer");var on=L`
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
`,bt=class extends R{constructor(){super(...arguments),this.hasSlotController=new Lt(this,"footer"),this.localize=new Q(this),this.modal=new Bi(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=t=>{t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),ce(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),de(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const o=F(this,"dialog.denyClose",{dir:this.localize.dir()});V(this.panel,o.keyframes,o.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),ce(this);const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([W(this.dialog),W(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=F(this,"dialog.show",{dir:this.localize.dir()}),o=F(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,o.keyframes,o.options)]),this.emit("sl-after-show")}else{zo(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([W(this.dialog),W(this.overlay)]);const t=F(this,"dialog.hide",{dir:this.localize.dir()}),e=F(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,de(this);const o=this.originalTrigger;typeof(o==null?void 0:o.focus)=="function"&&setTimeout(()=>o.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,st(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,st(this,"sl-after-hide")}render(){return b`
      <div
        part="base"
        class=${I({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test("footer")})}
      >
        <div part="overlay" class="dialog__overlay" @click=${()=>this.requestClose("overlay")} tabindex="-1"></div>

        <div
          part="panel"
          class="dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?"false":"true"}
          aria-label=${v(this.noHeader?this.label:void 0)}
          aria-labelledby=${v(this.noHeader?void 0:"title")}
          tabindex="-1"
        >
          ${this.noHeader?"":b`
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
    `}};bt.styles=[B,on];bt.dependencies={"sl-icon-button":j};a([S(".dialog")],bt.prototype,"dialog",2);a([S(".dialog__panel")],bt.prototype,"panel",2);a([S(".dialog__overlay")],bt.prototype,"overlay",2);a([c({type:Boolean,reflect:!0})],bt.prototype,"open",2);a([c({reflect:!0})],bt.prototype,"label",2);a([c({attribute:"no-header",type:Boolean,reflect:!0})],bt.prototype,"noHeader",2);a([z("open",{waitUntilFirstUpdate:!0})],bt.prototype,"handleOpenChange",1);D("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});D("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});D("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});D("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});D("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});bt.define("sl-dialog");var sn=L`
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
`,ve=class extends R{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return b`
      <span
        part="base"
        class=${I({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};ve.styles=[B,sn];a([c({reflect:!0})],ve.prototype,"variant",2);a([c({type:Boolean,reflect:!0})],ve.prototype,"pill",2);a([c({type:Boolean,reflect:!0})],ve.prototype,"pulse",2);ve.define("sl-badge");var rn=L`
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
`,tt=class Rt extends R{constructor(){super(...arguments),this.hasSlotController=new Lt(this,"icon","suffix"),this.localize=new Q(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var e;(e=this.countdownAnimation)==null||e.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var e;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(e=this.countdownAnimation)==null||e.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:e}=this,o="100%",i="0";this.countdownAnimation=e.animate([{width:o},{width:i}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await W(this.base),this.base.hidden=!1;const{keyframes:e,options:o}=F(this,"alert.show",{dir:this.localize.dir()});await V(this.base,e,o),this.emit("sl-after-show")}else{zo(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await W(this.base);const{keyframes:e,options:o}=F(this,"alert.hide",{dir:this.localize.dir()});await V(this.base,e,o),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,st(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,st(this,"sl-after-hide")}async toast(){return new Promise(e=>{this.handleCountdownChange(),Rt.toastStack.parentElement===null&&document.body.append(Rt.toastStack),Rt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{Rt.toastStack.removeChild(this),e(),Rt.toastStack.querySelector("sl-alert")===null&&Rt.toastStack.remove()},{once:!0})})}render(){return b`
      <div
        part="base"
        class=${I({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test("icon"),"alert--primary":this.variant==="primary","alert--success":this.variant==="success","alert--neutral":this.variant==="neutral","alert--warning":this.variant==="warning","alert--danger":this.variant==="danger"})}
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

        ${this.closable?b`
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

        ${this.countdown?b`
              <div
                class=${I({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};tt.styles=[B,rn];tt.dependencies={"sl-icon-button":j};a([S('[part~="base"]')],tt.prototype,"base",2);a([S(".alert__countdown-elapsed")],tt.prototype,"countdownElement",2);a([c({type:Boolean,reflect:!0})],tt.prototype,"open",2);a([c({type:Boolean,reflect:!0})],tt.prototype,"closable",2);a([c({reflect:!0})],tt.prototype,"variant",2);a([c({type:Number})],tt.prototype,"duration",2);a([c({type:String,reflect:!0})],tt.prototype,"countdown",2);a([T()],tt.prototype,"remainingTime",2);a([z("open",{waitUntilFirstUpdate:!0})],tt.prototype,"handleOpenChange",1);a([z("duration")],tt.prototype,"handleDurationChange",1);var nn=tt;D("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});D("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});nn.define("sl-alert");var an=L`
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
`,C=class extends R{constructor(){super(...arguments),this.formControlController=new Me(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new Lt(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var t;super.disconnectedCallback(),this.input&&((t=this.resizeObserver)==null||t.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(t){if(t){typeof t.top=="number"&&(this.input.scrollTop=t.top),typeof t.left=="number"&&(this.input.scrollLeft=t.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(t,e,o="none"){this.input.setSelectionRange(t,e,o)}setRangeText(t,e,o,i="preserve"){const s=e??this.input.selectionStart,r=o??this.input.selectionEnd;this.input.setRangeText(t,s,r,i),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),o=this.label?!0:!!t,i=this.helpText?!0:!!e;return b`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":o,"form-control--has-help-text":i})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${o?"false":"true"}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${I({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${v(this.name)}
              .value=${Ci(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${v(this.placeholder)}
              rows=${v(this.rows)}
              minlength=${v(this.minlength)}
              maxlength=${v(this.maxlength)}
              autocapitalize=${v(this.autocapitalize)}
              autocorrect=${v(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${v(this.spellcheck)}
              enterkeyhint=${v(this.enterkeyhint)}
              inputmode=${v(this.inputmode)}
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
    `}};C.styles=[B,ko,an];a([S(".textarea__control")],C.prototype,"input",2);a([S(".textarea__size-adjuster")],C.prototype,"sizeAdjuster",2);a([T()],C.prototype,"hasFocus",2);a([c()],C.prototype,"title",2);a([c()],C.prototype,"name",2);a([c()],C.prototype,"value",2);a([c({reflect:!0})],C.prototype,"size",2);a([c({type:Boolean,reflect:!0})],C.prototype,"filled",2);a([c()],C.prototype,"label",2);a([c({attribute:"help-text"})],C.prototype,"helpText",2);a([c()],C.prototype,"placeholder",2);a([c({type:Number})],C.prototype,"rows",2);a([c()],C.prototype,"resize",2);a([c({type:Boolean,reflect:!0})],C.prototype,"disabled",2);a([c({type:Boolean,reflect:!0})],C.prototype,"readonly",2);a([c({reflect:!0})],C.prototype,"form",2);a([c({type:Boolean,reflect:!0})],C.prototype,"required",2);a([c({type:Number})],C.prototype,"minlength",2);a([c({type:Number})],C.prototype,"maxlength",2);a([c()],C.prototype,"autocapitalize",2);a([c()],C.prototype,"autocorrect",2);a([c()],C.prototype,"autocomplete",2);a([c({type:Boolean})],C.prototype,"autofocus",2);a([c()],C.prototype,"enterkeyhint",2);a([c({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],C.prototype,"spellcheck",2);a([c()],C.prototype,"inputmode",2);a([ki()],C.prototype,"defaultValue",2);a([z("disabled",{waitUntilFirstUpdate:!0})],C.prototype,"handleDisabledChange",1);a([z("rows",{waitUntilFirstUpdate:!0})],C.prototype,"handleRowsChange",1);a([z("value",{waitUntilFirstUpdate:!0})],C.prototype,"handleValueChange",1);C.define("sl-textarea");var ln=L`
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
`,q=class extends R{constructor(){super(...arguments),this.localize=new Q(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=t=>{this.open&&t.key==="Escape"&&(t.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=t=>{var e;if(t.key==="Escape"&&this.open&&!this.closeWatcher){t.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(t.key==="Tab"){if(this.open&&((e=document.activeElement)==null?void 0:e.tagName.toLowerCase())==="sl-menu-item"){t.preventDefault(),this.hide(),this.focusOnTrigger();return}const o=(i,s)=>{if(!i)return null;const r=i.closest(s);if(r)return r;const n=i.getRootNode();return n instanceof ShadowRoot?o(n.host,s):null};setTimeout(()=>{var i;const s=((i=this.containingElement)==null?void 0:i.getRootNode())instanceof ShadowRoot?Mi():document.activeElement;(!this.containingElement||o(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this.containingElement&&!e.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=t=>{const e=t.target;!this.stayOpenOnSelect&&e.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const t=this.trigger.assignedElements({flatten:!0})[0];typeof(t==null?void 0:t.focus)=="function"&&t.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(t=>t.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(t){if([" ","Enter"].includes(t.key)){t.preventDefault(),this.handleTriggerClick();return}const e=this.getMenu();if(e){const o=e.getAllItems(),i=o[0],s=o[o.length-1];["ArrowDown","ArrowUp","Home","End"].includes(t.key)&&(t.preventDefault(),this.open||(this.show(),await this.updateComplete),o.length>0&&this.updateComplete.then(()=>{(t.key==="ArrowDown"||t.key==="Home")&&(e.setCurrentItem(i),i.focus()),(t.key==="ArrowUp"||t.key==="End")&&(e.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(t){t.key===" "&&t.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const e=this.trigger.assignedElements({flatten:!0}).find(i=>tn(i).start);let o;if(e){switch(e.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":o=e.button;break;default:o=e}o.setAttribute("aria-haspopup","true"),o.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,st(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,st(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var t;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var t;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await W(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:t,options:e}=F(this,"dropdown.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await W(this);const{keyframes:t,options:e}=F(this,"dropdown.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return b`
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
        sync=${v(this.sync?this.sync:void 0)}
        class=${I({dropdown:!0,"dropdown--open":this.open})}
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
    `}};q.styles=[B,ln];q.dependencies={"sl-popup":E};a([S(".dropdown")],q.prototype,"popup",2);a([S(".dropdown__trigger")],q.prototype,"trigger",2);a([S(".dropdown__panel")],q.prototype,"panel",2);a([c({type:Boolean,reflect:!0})],q.prototype,"open",2);a([c({reflect:!0})],q.prototype,"placement",2);a([c({type:Boolean,reflect:!0})],q.prototype,"disabled",2);a([c({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],q.prototype,"stayOpenOnSelect",2);a([c({attribute:!1})],q.prototype,"containingElement",2);a([c({type:Number})],q.prototype,"distance",2);a([c({type:Number})],q.prototype,"skidding",2);a([c({type:Boolean})],q.prototype,"hoist",2);a([c({reflect:!0})],q.prototype,"sync",2);a([z("open",{waitUntilFirstUpdate:!0})],q.prototype,"handleOpenChange",1);D("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});D("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});q.define("sl-dropdown");var cn=L`
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
`,Oo=class extends R{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(t){const e=["menuitem","menuitemcheckbox"],o=t.composedPath(),i=o.find(l=>{var d;return e.includes(((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))||"")});if(!i||o.find(l=>{var d;return((d=l==null?void 0:l.getAttribute)==null?void 0:d.call(l,"role"))==="menu"})!==this)return;const n=i;n.type==="checkbox"&&(n.checked=!n.checked),this.emit("sl-select",{detail:{item:n}})}handleKeyDown(t){if(t.key==="Enter"||t.key===" "){const e=this.getCurrentItem();t.preventDefault(),t.stopPropagation(),e==null||e.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(t.key)){const e=this.getAllItems(),o=this.getCurrentItem();let i=o?e.indexOf(o):0;e.length>0&&(t.preventDefault(),t.stopPropagation(),t.key==="ArrowDown"?i++:t.key==="ArrowUp"?i--:t.key==="Home"?i=0:t.key==="End"&&(i=e.length-1),i<0&&(i=e.length-1),i>e.length-1&&(i=0),this.setCurrentItem(e[i]),e[i].focus())}}handleMouseDown(t){const e=t.target;this.isMenuItem(e)&&this.setCurrentItem(e)}handleSlotChange(){const t=this.getAllItems();t.length>0&&this.setCurrentItem(t[0])}isMenuItem(t){var e;return t.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((e=t.getAttribute("role"))!=null?e:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(t=>!(t.inert||!this.isMenuItem(t)))}getCurrentItem(){return this.getAllItems().find(t=>t.getAttribute("tabindex")==="0")}setCurrentItem(t){this.getAllItems().forEach(o=>{o.setAttribute("tabindex",o===t?"0":"-1")})}render(){return b`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Oo.styles=[B,cn];a([S("slot")],Oo.prototype,"defaultSlot",2);Oo.define("sl-menu");var dn=L`
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
 */const ue=(t,e)=>{var i;const o=t._$AN;if(o===void 0)return!1;for(const s of o)(i=s._$AO)==null||i.call(s,e,!1),ue(s,e);return!0},Le=t=>{let e,o;do{if((e=t._$AM)===void 0)break;o=e._$AN,o.delete(t),t=e}while((o==null?void 0:o.size)===0)},Ni=t=>{for(let e;e=t._$AM;t=e){let o=e._$AN;if(o===void 0)e._$AN=o=new Set;else if(o.has(t))break;o.add(t),pn(e)}};function un(t){this._$AN!==void 0?(Le(this),this._$AM=t,Ni(this)):this._$AM=t}function hn(t,e=!1,o=0){const i=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(e)if(Array.isArray(i))for(let r=o;r<i.length;r++)ue(i[r],!1),Le(i[r]);else i!=null&&(ue(i,!1),Le(i));else ue(this,t)}const pn=t=>{t.type==wt.CHILD&&(t._$AP??(t._$AP=hn),t._$AQ??(t._$AQ=un))};class fn extends Be{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,o,i){super._$AT(e,o,i),Ni(this),this.isConnected=e._$AU}_$AO(e,o=!0){var i,s;e!==this.isConnected&&(this.isConnected=e,e?(i=this.reconnected)==null||i.call(this):(s=this.disconnected)==null||s.call(this)),o&&(ue(this,e),Le(this))}setValue(e){if(_i(this._$Ct))this._$Ct._$AI(e,this);else{const o=[...this._$Ct._$AH];o[this._$Ci]=e,this._$Ct._$AI(o,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const mn=()=>new gn;class gn{}const oo=new WeakMap,bn=Ie(class extends fn{render(t){return P}update(t,[e]){var i;const o=e!==this.G;return o&&this.G!==void 0&&this.rt(void 0),(o||this.lt!==this.ct)&&(this.G=e,this.ht=(i=t.options)==null?void 0:i.host,this.rt(this.ct=t.element)),P}rt(t){if(this.isConnected||(t=void 0),typeof this.G=="function"){const e=this.ht??globalThis;let o=oo.get(e);o===void 0&&(o=new WeakMap,oo.set(e,o)),o.get(this.G)!==void 0&&this.G.call(this.ht,void 0),o.set(this.G,t),t!==void 0&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){var t,e;return typeof this.G=="function"?(t=oo.get(this.ht??globalThis))==null?void 0:t.get(this.G):(e=this.G)==null?void 0:e.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var vn=class{constructor(t,e){this.popupRef=mn(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=o=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${o.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${o.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=o=>{switch(o.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":o.target!==this.host&&(o.preventDefault(),o.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(o);break}},this.handleClick=o=>{var i;o.target===this.host?(o.preventDefault(),o.stopPropagation()):o.target instanceof Element&&(o.target.tagName==="sl-menu-item"||(i=o.target.role)!=null&&i.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=o=>{o.relatedTarget&&o.relatedTarget instanceof Element&&this.host.contains(o.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=o=>{o.stopPropagation()},this.handlePopupReposition=()=>{const o=this.host.renderRoot.querySelector("slot[name='submenu']"),i=o==null?void 0:o.assignedElements({flatten:!0}).filter(u=>u.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!i)return;const{left:r,top:n,width:l,height:d}=i.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${n}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?r+l:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${n+d}px`)},(this.host=t).addController(this),this.hasSlotController=e}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(t){const e=this.host.renderRoot.querySelector("slot[name='submenu']");if(!e){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let o=null;for(const i of e.assignedElements())if(o=i.querySelectorAll("sl-menu-item, [role^='menuitem']"),o.length!==0)break;if(!(!o||o.length===0)){o[0].setAttribute("tabindex","0");for(let i=1;i!==o.length;++i)o[i].setAttribute("tabindex","-1");this.popupRef.value&&(t.preventDefault(),t.stopPropagation(),this.popupRef.value.active?o[0]instanceof HTMLElement&&o[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{o[0]instanceof HTMLElement&&o[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(t){this.popupRef.value&&this.popupRef.value.active!==t&&(this.popupRef.value.active=t,this.host.requestUpdate())}enableSubmenu(t=!0){t?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var t;if(!((t=this.host.parentElement)!=null&&t.computedStyleMap))return;const e=this.host.parentElement.computedStyleMap(),i=["padding-top","border-top-width","margin-top"].reduce((s,r)=>{var n;const l=(n=e.get(r))!=null?n:new CSSUnitValue(0,"px"),u=(l instanceof CSSUnitValue?l:new CSSUnitValue(0,"px")).to("px");return s-u.value},0);this.skidding=i}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const t=getComputedStyle(this.host).direction==="rtl";return this.isConnected?b`
      <sl-popup
        ${bn(this.popupRef)}
        placement=${t?"left-start":"right-start"}
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
    `:b` <slot name="submenu" hidden></slot> `}},et=class extends R{constructor(){super(...arguments),this.localize=new Q(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new Lt(this,"submenu"),this.submenuController=new vn(this,this.hasSlotController),this.handleHostClick=t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())},this.handleMouseOver=t=>{this.focus(),t.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const t=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=t;return}t!==this.cachedTextLabel&&(this.cachedTextLabel=t,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Cs(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const t=this.localize.dir()==="rtl",e=this.submenuController.isExpanded();return b`
      <div
        id="anchor"
        part="base"
        class=${I({"menu-item":!0,"menu-item--rtl":t,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":e})}
        ?aria-haspopup="${this.isSubmenu()}"
        ?aria-expanded="${!!e}"
      >
        <span part="checked-icon" class="menu-item__check">
          <sl-icon name="check" library="system" aria-hidden="true"></sl-icon>
        </span>

        <slot name="prefix" part="prefix" class="menu-item__prefix"></slot>

        <slot part="label" class="menu-item__label" @slotchange=${this.handleDefaultSlotChange}></slot>

        <slot name="suffix" part="suffix" class="menu-item__suffix"></slot>

        <span part="submenu-icon" class="menu-item__chevron">
          <sl-icon name=${t?"chevron-left":"chevron-right"} library="system" aria-hidden="true"></sl-icon>
        </span>

        ${this.submenuController.renderSubmenu()}
        ${this.loading?b` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};et.styles=[B,dn];et.dependencies={"sl-icon":Y,"sl-popup":E,"sl-spinner":_o};a([S("slot:not([name])")],et.prototype,"defaultSlot",2);a([S(".menu-item")],et.prototype,"menuItem",2);a([c()],et.prototype,"type",2);a([c({type:Boolean,reflect:!0})],et.prototype,"checked",2);a([c()],et.prototype,"value",2);a([c({type:Boolean,reflect:!0})],et.prototype,"loading",2);a([c({type:Boolean,reflect:!0})],et.prototype,"disabled",2);a([z("checked")],et.prototype,"handleCheckedChange",1);a([z("disabled")],et.prototype,"handleDisabledChange",1);a([z("type")],et.prototype,"handleTypeChange",1);et.define("sl-menu-item");Y.define("sl-icon");var yn=L`
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
`,We=class extends R{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};We.styles=[B,yn];a([c({type:Boolean,reflect:!0})],We.prototype,"vertical",2);a([z("vertical")],We.prototype,"handleVerticalChange",1);We.define("sl-divider");var wn=L`
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
`,H=class extends R{constructor(){super(),this.localize=new Q(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const t=ii(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),t)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const t=ii(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),t)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(t){return this.trigger.split(" ").includes(t)}async handleOpenChange(){var t,e;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await W(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:o,options:i}=F(this,"tooltip.show",{dir:this.localize.dir()});await V(this.popup.popup,o,i),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await W(this.body);const{keyframes:o,options:i}=F(this,"tooltip.hide",{dir:this.localize.dir()});await V(this.popup.popup,o,i),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,st(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,st(this,"sl-after-hide")}render(){return b`
      <sl-popup
        part="base"
        exportparts="
          popup:base__popup,
          arrow:base__arrow
        "
        class=${I({tooltip:!0,"tooltip--open":this.open})}
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
    `}};H.styles=[B,wn];H.dependencies={"sl-popup":E};a([S("slot:not([name])")],H.prototype,"defaultSlot",2);a([S(".tooltip__body")],H.prototype,"body",2);a([S("sl-popup")],H.prototype,"popup",2);a([c()],H.prototype,"content",2);a([c()],H.prototype,"placement",2);a([c({type:Boolean,reflect:!0})],H.prototype,"disabled",2);a([c({type:Number})],H.prototype,"distance",2);a([c({type:Boolean,reflect:!0})],H.prototype,"open",2);a([c({type:Number})],H.prototype,"skidding",2);a([c()],H.prototype,"trigger",2);a([c({type:Boolean})],H.prototype,"hoist",2);a([z("open",{waitUntilFirstUpdate:!0})],H.prototype,"handleOpenChange",1);a([z(["content","distance","hoist","placement","skidding"])],H.prototype,"handleOptionsChange",1);a([z("disabled")],H.prototype,"handleDisabledChange",1);D("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});D("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});H.define("sl-tooltip");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let _n=class extends Event{constructor(e,o,i,s){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=o,this.callback=i,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class xn{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,o=!1){const i=o||!Object.is(e,this.o);this.o=e,i&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[o,{disposer:i}]of this.subscriptions)o(this.o,i)},e!==void 0&&(this.value=e)}addCallback(e,o,i){if(!i)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:o});const{disposer:s}=this.subscriptions.get(e);e(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let kn=class extends Event{constructor(e,o){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=o}};class ni extends xn{constructor(e,o,i){var s,r;super(o.context!==void 0?o.initialValue:i),this.onContextRequest=n=>{if(n.context!==this.context)return;const l=n.contextTarget??n.composedPath()[0];l!==this.host&&(n.stopPropagation(),this.addCallback(n.callback,l,n.subscribe))},this.onProviderRequest=n=>{if(n.context!==this.context||(n.contextTarget??n.composedPath()[0])===this.host)return;const l=new Set;for(const[d,{consumerHost:u}]of this.subscriptions)l.has(d)||(l.add(d),u.dispatchEvent(new _n(this.context,u,d,!0)));n.stopPropagation()},this.host=e,o.context!==void 0?this.context=o.context:this.context=o,this.attachListeners(),(r=(s=this.host).addController)==null||r.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new kn(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Cn({context:t}){return(e,o)=>{const i=new WeakMap;if(typeof o=="object")return{get(){return e.get.call(this)},set(s){return i.get(this).setValue(s),e.set.call(this,s)},init(s){return i.set(this,new ni(this,{context:t,initialValue:s})),s}};{e.constructor.addInitializer(n=>{i.set(n,new ni(n,{context:t}))});const s=Object.getOwnPropertyDescriptor(e,o);let r;if(s===void 0){const n=new WeakMap;r={get(){return n.get(this)},set(l){i.get(this).setValue(l),n.set(this,l)},configurable:!0,enumerable:!0}}else{const n=s.set;r={...s,set(l){i.get(this).setValue(l),n==null||n.call(this,l)}}}return void Object.defineProperty(e,o,r)}}}const $n=Symbol("board"),Sn={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};class An extends Error{constructor(e,o,i){super(e),this.status=o,this.body=i,this.name="ApiError"}}async function Fi(t,e){const o=await fetch(t,e);if(!o.ok){const i=await o.text();throw new An(`API request failed: ${o.status} ${o.statusText}`,o.status,i)}return o.json()}function En(t,e){return t}async function Tn(t){const e=En("/api/ticks");return(await Fi(e)).ticks.map(i=>({...i,is_blocked:i.isBlocked}))}async function zn(){return Fi("/api/info")}var On=Object.defineProperty,Ln=Object.getOwnPropertyDescriptor,nt=(t,e,o,i)=>{for(var s=i>1?void 0:i?Ln(e,o):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(s=(i?n(e,o,s):n(s))||s);return i&&s&&On(e,o,s),s};const ai=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let X=class extends xt{constructor(){super(...arguments),this.boardState={...Sn},this.ticks=[],this.epics=[],this.repoName="",this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.selectedTick=null,this.loading=!0,this.error=null,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleMediaChange=t=>{this.isMobile=t.matches,this.updateBoardState()}}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),this.loadData()}async loadData(){this.loading=!0,this.error=null;try{const[t,e]=await Promise.all([Tn(),zn()]);this.ticks=t,this.epics=e.epics,this.repoName=e.repoName,this.updateBoardState()}catch(t){this.error=t instanceof Error?t.message:"Failed to load data",console.error("Failed to load board data:",t)}finally{this.loading=!1}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange)}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(t){this.searchTerm=t.detail.value,this.updateBoardState()}handleEpicFilterChange(t){this.selectedEpic=t.detail.value,this.updateBoardState()}handleCreateClick(){console.log("Create tick clicked")}handleMenuToggle(){console.log("Menu toggle clicked")}handleTickSelected(t){this.selectedTick=t.detail.tick,console.log("Tick selected:",t.detail.tick.id)}handleMobileColumnChange(t){const e=t.target;this.activeColumn=e.value,this.updateBoardState()}getFilteredTicks(){let t=this.ticks;if(this.searchTerm){const e=this.searchTerm.toLowerCase();t=t.filter(o=>o.id.toLowerCase().includes(e)||o.title.toLowerCase().includes(e)||o.description&&o.description.toLowerCase().includes(e))}return this.selectedEpic&&(t=t.filter(e=>e.parent===this.selectedEpic)),t}getColumnTicks(t){return this.getFilteredTicks().filter(e=>e.column===t)}getEpicNames(){const t={};for(const e of this.epics)t[e.id]=e.title;return t}render(){if(this.loading)return b`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return b`
        <div class="error-state">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Failed to load board</strong><br>
            ${this.error}
          </sl-alert>
          <sl-button variant="primary" @click=${this.loadData}>Retry</sl-button>
        </div>
      `;const t=this.getEpicNames();return b`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMenuToggle}
      ></tick-header>

      <!-- Mobile column selector -->
      <div class="mobile-column-select">
        <sl-select .value=${this.activeColumn} @sl-change=${this.handleMobileColumnChange}>
          ${ai.map(e=>b`
            <sl-option value=${e.id}>
              ${e.icon} ${e.name} (${this.getColumnTicks(e.id).length})
            </sl-option>
          `)}
        </sl-select>
      </div>

      <main>
        <div class="kanban-board">
          ${ai.map(e=>b`
            <tick-column
              class=${this.activeColumn===e.id?"mobile-active":""}
              name=${e.id}
              .ticks=${this.getColumnTicks(e.id)}
              .epicNames=${t}
              @tick-selected=${this.handleTickSelected}
            ></tick-column>
          `)}
        </div>
      </main>
    `}};X.styles=L`
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

    /* Kanban board */
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

    /* Mobile column selector */
    .mobile-column-select {
      display: none;
      padding: 0.75rem 1rem;
      background: var(--surface0);
      border-bottom: 1px solid var(--surface1);
    }

    .mobile-column-select sl-select {
      width: 100%;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .kanban-board {
        gap: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      main {
        padding: 0;
      }

      .mobile-column-select {
        display: block;
      }

      .kanban-board {
        display: block;
        height: calc(100vh - 140px);
        overflow-y: auto;
      }

      .kanban-board tick-column {
        display: none;
      }

      .kanban-board tick-column.mobile-active {
        display: flex;
      }
    }
  `;nt([Cn({context:$n}),T()],X.prototype,"boardState",2);nt([T()],X.prototype,"ticks",2);nt([T()],X.prototype,"epics",2);nt([T()],X.prototype,"repoName",2);nt([T()],X.prototype,"selectedEpic",2);nt([T()],X.prototype,"searchTerm",2);nt([T()],X.prototype,"activeColumn",2);nt([T()],X.prototype,"isMobile",2);nt([T()],X.prototype,"selectedTick",2);nt([T()],X.prototype,"loading",2);nt([T()],X.prototype,"error",2);X=nt([Re("tick-board")],X);var Pn=Object.defineProperty,Dn=Object.getOwnPropertyDescriptor,je=(t,e,o,i)=>{for(var s=i>1?void 0:i?Dn(e,o):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(s=(i?n(e,o,s):n(s))||s);return i&&s&&Pn(e,o,s),s};const li={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Rn={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let Gt=class extends xt{constructor(){super(...arguments),this.selected=!1}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return li[this.tick.priority]??li[2]}getPriorityLabel(){return Rn[this.tick.priority]??"Unknown"}render(){const{tick:t,selected:e,epicName:o}=this;return b`
      <div
        class="card ${e?"selected":""}"
        @click=${this.handleClick}
        role="button"
        tabindex="0"
        aria-label="Tick ${t.id}: ${t.title}"
      >
        <div class="card-header">
          <sl-tooltip content="Priority: ${this.getPriorityLabel()}" placement="left">
            <div
              class="priority-indicator"
              style="background-color: ${this.getPriorityColor()}"
            ></div>
          </sl-tooltip>
          <div class="header-content">
            <div class="tick-id">${t.id}</div>
            <h4 class="tick-title">${t.title}</h4>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-badge type-badge type-${t.type}">${t.type}</span>
          <span class="meta-badge status-${t.status}">${t.status.replace("_"," ")}</span>
          ${t.is_blocked?b`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${t.manual?b`<span class="meta-badge manual">👤 manual</span>`:null}
          ${t.awaiting?b`<span class="meta-badge awaiting">⏳ ${t.awaiting}</span>`:null}
        </div>

        ${o?b`<div class="epic-name">${o}</div>`:null}
      </div>
    `}};Gt.styles=L`
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
  `;je([c({attribute:!1})],Gt.prototype,"tick",2);je([c({type:Boolean})],Gt.prototype,"selected",2);je([c({type:String,attribute:"epic-name"})],Gt.prototype,"epicName",2);Gt=je([Re("tick-card")],Gt);var Mn=Object.defineProperty,In=Object.getOwnPropertyDescriptor,ye=(t,e,o,i)=>{for(var s=i>1?void 0:i?In(e,o):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(s=(i?n(e,o,s):n(s))||s);return i&&s&&Mn(e,o,s),s};const Bn={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},Nn={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},Fn={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let Vt=class extends xt{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={}}getColumnColor(){return this.color||Bn[this.name]||"var(--blue)"}getColumnDisplayName(){return Nn[this.name]||this.name}getColumnIcon(){return Fn[this.name]||"•"}handleTickSelected(t){this.dispatchEvent(new CustomEvent("tick-selected",{detail:t.detail,bubbles:!0,composed:!0}))}render(){const t=this.getColumnColor(),e=this.getColumnDisplayName(),o=this.getColumnIcon(),i=this.ticks.length;return b`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${t}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${t}">${o}</span>
            ${e}
          </span>
          <span class="column-count">${i}</span>
        </div>
      </div>

      <div class="column-content">
        ${i===0?b`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${o}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(s=>b`
                <tick-card
                  .tick=${s}
                  epic-name=${this.epicNames[s.parent||""]||""}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};Vt.styles=L`
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
  `;ye([c({type:String})],Vt.prototype,"name",2);ye([c({type:String})],Vt.prototype,"color",2);ye([c({attribute:!1})],Vt.prototype,"ticks",2);ye([c({type:Object,attribute:!1})],Vt.prototype,"epicNames",2);Vt=ye([Re("tick-column")],Vt);var Vn=Object.defineProperty,Hn=Object.getOwnPropertyDescriptor,te=(t,e,o,i)=>{for(var s=i>1?void 0:i?Hn(e,o):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(s=(i?n(e,o,s):n(s))||s);return i&&s&&Vn(e,o,s),s};let Ot=class extends xt{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.debounceTimeout=null}handleSearchInput(t){const o=t.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:o},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(t){const e=t.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:e.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return b`
      <header>
        <div class="header-left">
          <button
            class="menu-toggle"
            aria-label="Menu"
            @click=${this.handleMenuToggle}
          >
            ☰
          </button>
          <h1>Tick Board</h1>
          ${this.repoName?b`<span class="repo-badge">${this.repoName}</span>`:null}
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
            ${this.epics.map(t=>b`
                <sl-option value=${t.id}>${t.title}</sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Create new tick">
            <sl-button
              variant="primary"
              size="small"
              @click=${this.handleCreateClick}
            >
              <sl-icon name="plus-lg"></sl-icon>
            </sl-button>
          </sl-tooltip>
        </div>
      </header>
    `}};Ot.styles=L`
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

    .header-left h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--rosewater);
      margin: 0;
    }

    .repo-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--subtext0);
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
      min-width: 180px;
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
      }

      .repo-badge {
        display: none;
      }

      .header-left h1 {
        font-size: 1.125rem;
      }
    }
  `;te([c({type:String,attribute:"repo-name"})],Ot.prototype,"repoName",2);te([c({attribute:!1})],Ot.prototype,"epics",2);te([c({type:String,attribute:"selected-epic"})],Ot.prototype,"selectedEpic",2);te([c({type:String,attribute:"search-term"})],Ot.prototype,"searchTerm",2);te([T()],Ot.prototype,"debounceTimeout",2);Ot=te([Re("tick-header")],Ot);ro("/shoelace");
