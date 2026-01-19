(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Re=globalThis,Si=Re.ShadowRoot&&(Re.ShadyCSS===void 0||Re.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Ti=Symbol(),ji=new WeakMap;let $o=class{constructor(e,i,o){if(this._$cssResult$=!0,o!==Ti)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=i}get styleSheet(){let e=this.o;const i=this.t;if(Si&&e===void 0){const o=i!==void 0&&i.length===1;o&&(e=ji.get(i)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),o&&ji.set(i,e))}return e}toString(){return this.cssText}};const es=t=>new $o(typeof t=="string"?t:t+"",void 0,Ti),A=(t,...e)=>{const i=t.length===1?t[0]:e.reduce((o,s,r)=>o+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[r+1],t[0]);return new $o(i,t,Ti)},is=(t,e)=>{if(Si)t.adoptedStyleSheets=e.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of e){const o=document.createElement("style"),s=Re.litNonce;s!==void 0&&o.setAttribute("nonce",s),o.textContent=i.cssText,t.appendChild(o)}},qi=Si?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let i="";for(const o of e.cssRules)i+=o.cssText;return es(i)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:os,defineProperty:ss,getOwnPropertyDescriptor:rs,getOwnPropertyNames:as,getOwnPropertySymbols:ns,getPrototypeOf:ls}=Object,It=globalThis,Wi=It.trustedTypes,cs=Wi?Wi.emptyScript:"",ri=It.reactiveElementPolyfillSupport,ye=(t,e)=>t,se={toAttribute(t,e){switch(e){case Boolean:t=t?cs:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=t!==null;break;case Number:i=t===null?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch{i=null}}return i}},Ei=(t,e)=>!os(t,e),Ki={attribute:!0,type:String,converter:se,reflect:!1,useDefault:!1,hasChanged:Ei};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),It.litPropertyMetadata??(It.litPropertyMetadata=new WeakMap);let ee=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,i=Ki){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(e,i),!i.noAccessor){const o=Symbol(),s=this.getPropertyDescriptor(e,o,i);s!==void 0&&ss(this.prototype,e,s)}}static getPropertyDescriptor(e,i,o){const{get:s,set:r}=rs(this.prototype,e)??{get(){return this[i]},set(a){this[i]=a}};return{get:s,set(a){const c=s==null?void 0:s.call(this);r==null||r.call(this,a),this.requestUpdate(e,c,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ki}static _$Ei(){if(this.hasOwnProperty(ye("elementProperties")))return;const e=ls(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ye("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ye("properties"))){const i=this.properties,o=[...as(i),...ns(i)];for(const s of o)this.createProperty(s,i[s])}const e=this[Symbol.metadata];if(e!==null){const i=litPropertyMetadata.get(e);if(i!==void 0)for(const[o,s]of i)this.elementProperties.set(o,s)}this._$Eh=new Map;for(const[i,o]of this.elementProperties){const s=this._$Eu(i,o);s!==void 0&&this._$Eh.set(s,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const i=[];if(Array.isArray(e)){const o=new Set(e.flat(1/0).reverse());for(const s of o)i.unshift(qi(s))}else e!==void 0&&i.push(qi(e));return i}static _$Eu(e,i){const o=i.attribute;return o===!1?void 0:typeof o=="string"?o:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(i=>i(this))}addController(e){var i;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((i=e.hostConnected)==null||i.call(e))}removeController(e){var i;(i=this._$EO)==null||i.delete(e)}_$E_(){const e=new Map,i=this.constructor.elementProperties;for(const o of i.keys())this.hasOwnProperty(o)&&(e.set(o,this[o]),delete this[o]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return is(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(i=>{var o;return(o=i.hostConnected)==null?void 0:o.call(i)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(i=>{var o;return(o=i.hostDisconnected)==null?void 0:o.call(i)})}attributeChangedCallback(e,i,o){this._$AK(e,o)}_$ET(e,i){var r;const o=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,o);if(s!==void 0&&o.reflect===!0){const a=(((r=o.converter)==null?void 0:r.toAttribute)!==void 0?o.converter:se).toAttribute(i,o.type);this._$Em=e,a==null?this.removeAttribute(s):this.setAttribute(s,a),this._$Em=null}}_$AK(e,i){var r,a;const o=this.constructor,s=o._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const c=o.getPropertyOptions(s),d=typeof c.converter=="function"?{fromAttribute:c.converter}:((r=c.converter)==null?void 0:r.fromAttribute)!==void 0?c.converter:se;this._$Em=s;const h=d.fromAttribute(i,c.type);this[s]=h??((a=this._$Ej)==null?void 0:a.get(s))??h,this._$Em=null}}requestUpdate(e,i,o,s=!1,r){var a;if(e!==void 0){const c=this.constructor;if(s===!1&&(r=this[e]),o??(o=c.getPropertyOptions(e)),!((o.hasChanged??Ei)(r,i)||o.useDefault&&o.reflect&&r===((a=this._$Ej)==null?void 0:a.get(e))&&!this.hasAttribute(c._$Eu(e,o))))return;this.C(e,i,o)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,i,{useDefault:o,reflect:s,wrapped:r},a){o&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,a??i??this[e]),r!==!0||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||o||(i=void 0),this._$AL.set(e,i)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var o;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,a]of this._$Ep)this[r]=a;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[r,a]of s){const{wrapped:c}=a,d=this[r];c!==!0||this._$AL.has(r)||d===void 0||this.C(r,void 0,a,d)}}let e=!1;const i=this._$AL;try{e=this.shouldUpdate(i),e?(this.willUpdate(i),(o=this._$EO)==null||o.forEach(s=>{var r;return(r=s.hostUpdate)==null?void 0:r.call(s)}),this.update(i)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(i)}willUpdate(e){}_$AE(e){var i;(i=this._$EO)==null||i.forEach(o=>{var s;return(s=o.hostUpdated)==null?void 0:s.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(e){}firstUpdated(e){}};ee.elementStyles=[],ee.shadowRootOptions={mode:"open"},ee[ye("elementProperties")]=new Map,ee[ye("finalized")]=new Map,ri==null||ri({ReactiveElement:ee}),(It.reactiveElementVersions??(It.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const we=globalThis,Yi=t=>t,Fe=we.trustedTypes,Xi=Fe?Fe.createPolicy("lit-html",{createHTML:t=>t}):void 0,Co="$lit$",Dt=`lit$${Math.random().toFixed(9).slice(2)}$`,So="?"+Dt,ds=`<${So}>`,Gt=document,$e=()=>Gt.createComment(""),Ce=t=>t===null||typeof t!="object"&&typeof t!="function",Ai=Array.isArray,hs=t=>Ai(t)||typeof(t==null?void 0:t[Symbol.iterator])=="function",ai=`[ 	
\f\r]`,pe=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Gi=/-->/g,Ji=/>/g,jt=RegExp(`>|${ai}(?:([^\\s"'>=/]+)(${ai}*=${ai}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Zi=/'/g,Qi=/"/g,To=/^(?:script|style|textarea|title)$/i,us=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),p=us(1),dt=Symbol.for("lit-noChange"),w=Symbol.for("lit-nothing"),to=new WeakMap,Yt=Gt.createTreeWalker(Gt,129);function Eo(t,e){if(!Ai(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Xi!==void 0?Xi.createHTML(e):e}const ps=(t,e)=>{const i=t.length-1,o=[];let s,r=e===2?"<svg>":e===3?"<math>":"",a=pe;for(let c=0;c<i;c++){const d=t[c];let h,u,f=-1,b=0;for(;b<d.length&&(a.lastIndex=b,u=a.exec(d),u!==null);)b=a.lastIndex,a===pe?u[1]==="!--"?a=Gi:u[1]!==void 0?a=Ji:u[2]!==void 0?(To.test(u[2])&&(s=RegExp("</"+u[2],"g")),a=jt):u[3]!==void 0&&(a=jt):a===jt?u[0]===">"?(a=s??pe,f=-1):u[1]===void 0?f=-2:(f=a.lastIndex-u[2].length,h=u[1],a=u[3]===void 0?jt:u[3]==='"'?Qi:Zi):a===Qi||a===Zi?a=jt:a===Gi||a===Ji?a=pe:(a=jt,s=void 0);const m=a===jt&&t[c+1].startsWith("/>")?" ":"";r+=a===pe?d+ds:f>=0?(o.push(h),d.slice(0,f)+Co+d.slice(f)+Dt+m):d+Dt+(f===-2?c:m)}return[Eo(t,r+(t[i]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),o]};class Se{constructor({strings:e,_$litType$:i},o){let s;this.parts=[];let r=0,a=0;const c=e.length-1,d=this.parts,[h,u]=ps(e,i);if(this.el=Se.createElement(h,o),Yt.currentNode=this.el.content,i===2||i===3){const f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(s=Yt.nextNode())!==null&&d.length<c;){if(s.nodeType===1){if(s.hasAttributes())for(const f of s.getAttributeNames())if(f.endsWith(Co)){const b=u[a++],m=s.getAttribute(f).split(Dt),g=/([.?@])?(.*)/.exec(b);d.push({type:1,index:r,name:g[2],strings:m,ctor:g[1]==="."?ms:g[1]==="?"?bs:g[1]==="@"?gs:Ye}),s.removeAttribute(f)}else f.startsWith(Dt)&&(d.push({type:6,index:r}),s.removeAttribute(f));if(To.test(s.tagName)){const f=s.textContent.split(Dt),b=f.length-1;if(b>0){s.textContent=Fe?Fe.emptyScript:"";for(let m=0;m<b;m++)s.append(f[m],$e()),Yt.nextNode(),d.push({type:2,index:++r});s.append(f[b],$e())}}}else if(s.nodeType===8)if(s.data===So)d.push({type:2,index:r});else{let f=-1;for(;(f=s.data.indexOf(Dt,f+1))!==-1;)d.push({type:7,index:r}),f+=Dt.length-1}r++}}static createElement(e,i){const o=Gt.createElement("template");return o.innerHTML=e,o}}function re(t,e,i=t,o){var a,c;if(e===dt)return e;let s=o!==void 0?(a=i._$Co)==null?void 0:a[o]:i._$Cl;const r=Ce(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==r&&((c=s==null?void 0:s._$AO)==null||c.call(s,!1),r===void 0?s=void 0:(s=new r(t),s._$AT(t,i,o)),o!==void 0?(i._$Co??(i._$Co=[]))[o]=s:i._$Cl=s),s!==void 0&&(e=re(t,s._$AS(t,e.values),s,o)),e}class fs{constructor(e,i){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:i},parts:o}=this._$AD,s=((e==null?void 0:e.creationScope)??Gt).importNode(i,!0);Yt.currentNode=s;let r=Yt.nextNode(),a=0,c=0,d=o[0];for(;d!==void 0;){if(a===d.index){let h;d.type===2?h=new Ee(r,r.nextSibling,this,e):d.type===1?h=new d.ctor(r,d.name,d.strings,this,e):d.type===6&&(h=new vs(r,this,e)),this._$AV.push(h),d=o[++c]}a!==(d==null?void 0:d.index)&&(r=Yt.nextNode(),a++)}return Yt.currentNode=Gt,s}p(e){let i=0;for(const o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(e,o,i),i+=o.strings.length-2):o._$AI(e[i])),i++}}class Ee{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,i,o,s){this.type=2,this._$AH=w,this._$AN=void 0,this._$AA=e,this._$AB=i,this._$AM=o,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=i.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,i=this){e=re(this,e,i),Ce(e)?e===w||e==null||e===""?(this._$AH!==w&&this._$AR(),this._$AH=w):e!==this._$AH&&e!==dt&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):hs(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==w&&Ce(this._$AH)?this._$AA.nextSibling.data=e:this.T(Gt.createTextNode(e)),this._$AH=e}$(e){var r;const{values:i,_$litType$:o}=e,s=typeof o=="number"?this._$AC(e):(o.el===void 0&&(o.el=Se.createElement(Eo(o.h,o.h[0]),this.options)),o);if(((r=this._$AH)==null?void 0:r._$AD)===s)this._$AH.p(i);else{const a=new fs(s,this),c=a.u(this.options);a.p(i),this.T(c),this._$AH=a}}_$AC(e){let i=to.get(e.strings);return i===void 0&&to.set(e.strings,i=new Se(e)),i}k(e){Ai(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let o,s=0;for(const r of e)s===i.length?i.push(o=new Ee(this.O($e()),this.O($e()),this,this.options)):o=i[s],o._$AI(r),s++;s<i.length&&(this._$AR(o&&o._$AB.nextSibling,s),i.length=s)}_$AR(e=this._$AA.nextSibling,i){var o;for((o=this._$AP)==null?void 0:o.call(this,!1,!0,i);e!==this._$AB;){const s=Yi(e).nextSibling;Yi(e).remove(),e=s}}setConnected(e){var i;this._$AM===void 0&&(this._$Cv=e,(i=this._$AP)==null||i.call(this,e))}}class Ye{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,i,o,s,r){this.type=1,this._$AH=w,this._$AN=void 0,this.element=e,this.name=i,this._$AM=s,this.options=r,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=w}_$AI(e,i=this,o,s){const r=this.strings;let a=!1;if(r===void 0)e=re(this,e,i,0),a=!Ce(e)||e!==this._$AH&&e!==dt,a&&(this._$AH=e);else{const c=e;let d,h;for(e=r[0],d=0;d<r.length-1;d++)h=re(this,c[o+d],i,d),h===dt&&(h=this._$AH[d]),a||(a=!Ce(h)||h!==this._$AH[d]),h===w?e=w:e!==w&&(e+=(h??"")+r[d+1]),this._$AH[d]=h}a&&!s&&this.j(e)}j(e){e===w?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class ms extends Ye{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===w?void 0:e}}class bs extends Ye{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==w)}}class gs extends Ye{constructor(e,i,o,s,r){super(e,i,o,s,r),this.type=5}_$AI(e,i=this){if((e=re(this,e,i,0)??w)===dt)return;const o=this._$AH,s=e===w&&o!==w||e.capture!==o.capture||e.once!==o.once||e.passive!==o.passive,r=e!==w&&(o===w||s);s&&this.element.removeEventListener(this.name,this,o),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,e):this._$AH.handleEvent(e)}}class vs{constructor(e,i,o){this.element=e,this.type=6,this._$AN=void 0,this._$AM=i,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(e){re(this,e)}}const ni=we.litHtmlPolyfillSupport;ni==null||ni(Se,Ee),(we.litHtmlVersions??(we.litHtmlVersions=[])).push("3.3.2");const ys=(t,e,i)=>{const o=(i==null?void 0:i.renderBefore)??e;let s=o._$litPart$;if(s===void 0){const r=(i==null?void 0:i.renderBefore)??null;o._$litPart$=s=new Ee(e.insertBefore($e(),r),r,void 0,i??{})}return s._$AI(t),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Xt=globalThis;let it=class extends ee{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const e=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=e.firstChild),e}update(e){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ys(i,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return dt}};var _o;it._$litElement$=!0,it.finalized=!0,(_o=Xt.litElementHydrateSupport)==null||_o.call(Xt,{LitElement:it});const li=Xt.litElementPolyfillSupport;li==null||li({LitElement:it});(Xt.litElementVersions??(Xt.litElementVersions=[])).push("4.2.2");var ws=A`
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
`;const bi=new Set,ie=new Map;let Wt,zi="ltr",Oi="en";const Ao=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if(Ao){const t=new MutationObserver(Oo);zi=document.documentElement.dir||"ltr",Oi=document.documentElement.lang||navigator.language,t.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function zo(...t){t.map(e=>{const i=e.$code.toLowerCase();ie.has(i)?ie.set(i,Object.assign(Object.assign({},ie.get(i)),e)):ie.set(i,e),Wt||(Wt=e)}),Oo()}function Oo(){Ao&&(zi=document.documentElement.dir||"ltr",Oi=document.documentElement.lang||navigator.language),[...bi.keys()].map(t=>{typeof t.requestUpdate=="function"&&t.requestUpdate()})}let xs=class{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){bi.add(this.host)}hostDisconnected(){bi.delete(this.host)}dir(){return`${this.host.dir||zi}`.toLowerCase()}lang(){return`${this.host.lang||Oi}`.toLowerCase()}getTranslationData(e){var i,o;const s=new Intl.Locale(e.replace(/_/g,"-")),r=s==null?void 0:s.language.toLowerCase(),a=(o=(i=s==null?void 0:s.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&o!==void 0?o:"",c=ie.get(`${r}-${a}`),d=ie.get(r);return{locale:s,language:r,region:a,primary:c,secondary:d}}exists(e,i){var o;const{primary:s,secondary:r}=this.getTranslationData((o=i.lang)!==null&&o!==void 0?o:this.lang());return i=Object.assign({includeFallback:!1},i),!!(s&&s[e]||r&&r[e]||i.includeFallback&&Wt&&Wt[e])}term(e,...i){const{primary:o,secondary:s}=this.getTranslationData(this.lang());let r;if(o&&o[e])r=o[e];else if(s&&s[e])r=s[e];else if(Wt&&Wt[e])r=Wt[e];else return console.error(`No translation found for: ${String(e)}`),String(e);return typeof r=="function"?r(...i):r}date(e,i){return e=new Date(e),new Intl.DateTimeFormat(this.lang(),i).format(e)}number(e,i){return e=Number(e),isNaN(e)?"":new Intl.NumberFormat(this.lang(),i).format(e)}relativeTime(e,i,o){return new Intl.RelativeTimeFormat(this.lang(),o).format(e,i)}};var Lo={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(t,e)=>`Go to slide ${t} of ${e}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:t=>t===0?"No options selected":t===1?"1 option selected":`${t} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:t=>`Slide ${t}`,toggleColorFormat:"Toggle color format"};zo(Lo);var ks=Lo,st=class extends xs{};zo(ks);var N=A`
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
`,Po=Object.defineProperty,_s=Object.defineProperties,$s=Object.getOwnPropertyDescriptor,Cs=Object.getOwnPropertyDescriptors,eo=Object.getOwnPropertySymbols,Ss=Object.prototype.hasOwnProperty,Ts=Object.prototype.propertyIsEnumerable,ci=(t,e)=>(e=Symbol[t])?e:Symbol.for("Symbol."+t),Li=t=>{throw TypeError(t)},io=(t,e,i)=>e in t?Po(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i,Qt=(t,e)=>{for(var i in e||(e={}))Ss.call(e,i)&&io(t,i,e[i]);if(eo)for(var i of eo(e))Ts.call(e,i)&&io(t,i,e[i]);return t},Xe=(t,e)=>_s(t,Cs(e)),n=(t,e,i,o)=>{for(var s=o>1?void 0:o?$s(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Po(e,i,s),s},Do=(t,e,i)=>e.has(t)||Li("Cannot "+i),Es=(t,e,i)=>(Do(t,e,"read from private field"),e.get(t)),As=(t,e,i)=>e.has(t)?Li("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),zs=(t,e,i,o)=>(Do(t,e,"write to private field"),e.set(t,i),i),Os=function(t,e){this[0]=t,this[1]=e},Ls=t=>{var e=t[ci("asyncIterator")],i=!1,o,s={};return e==null?(e=t[ci("iterator")](),o=r=>s[r]=a=>e[r](a)):(e=e.call(t),o=r=>s[r]=a=>{if(i){if(i=!1,r==="throw")throw a;return a}return i=!0,{done:!1,value:new Os(new Promise(c=>{var d=e[r](a);d instanceof Object||Li("Object expected"),c(d)}),1)}}),s[ci("iterator")]=()=>s,o("next"),"throw"in e?o("throw"):s.throw=r=>{throw r},"return"in e&&o("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ht=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ps={attribute:!0,type:String,converter:se,reflect:!1,hasChanged:Ei},Ds=(t=Ps,e,i)=>{const{kind:o,metadata:s}=i;let r=globalThis.litPropertyMetadata.get(s);if(r===void 0&&globalThis.litPropertyMetadata.set(s,r=new Map),o==="setter"&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),o==="accessor"){const{name:a}=i;return{set(c){const d=e.get.call(this);e.set.call(this,c),this.requestUpdate(a,d,t,!0,c)},init(c){return c!==void 0&&this.C(a,void 0,t,c),c}}}if(o==="setter"){const{name:a}=i;return function(c){const d=this[a];e.call(this,c),this.requestUpdate(a,d,t,!0,c)}}throw Error("Unsupported decorator location: "+o)};function l(t){return(e,i)=>typeof i=="object"?Ds(t,e,i):((o,s,r)=>{const a=s.hasOwnProperty(r);return s.constructor.createProperty(r,o),a?Object.getOwnPropertyDescriptor(s,r):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function v(t){return l({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Is=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function S(t,e){return(i,o,s)=>{const r=a=>{var c;return((c=a.renderRoot)==null?void 0:c.querySelector(t))??null};return Is(i,o,{get(){return r(this)}})}}var Me,D=class extends it{constructor(){super(),As(this,Me,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([t,e])=>{this.constructor.define(t,e)})}emit(t,e){const i=new CustomEvent(t,Qt({bubbles:!0,cancelable:!1,composed:!0,detail:{}},e));return this.dispatchEvent(i),i}static define(t,e=this,i={}){const o=customElements.get(t);if(!o){try{customElements.define(t,e,i)}catch{customElements.define(t,class extends e{},i)}return}let s=" (unknown version)",r=s;"version"in e&&e.version&&(s=" v"+e.version),"version"in o&&o.version&&(r=" v"+o.version),!(s&&r&&s===r)&&console.warn(`Attempted to register <${t}>${s}, but <${t}>${r} has already been registered.`)}attributeChangedCallback(t,e,i){Es(this,Me)||(this.constructor.elementProperties.forEach((o,s)=>{o.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),zs(this,Me,!0)),super.attributeChangedCallback(t,e,i)}willUpdate(t){super.willUpdate(t),this.initialReflectedProperties.forEach((e,i)=>{t.has(i)&&this[i]==null&&(this[i]=e)})}};Me=new WeakMap;D.version="2.20.1";D.dependencies={};n([l()],D.prototype,"dir",2);n([l()],D.prototype,"lang",2);var Pi=class extends D{constructor(){super(...arguments),this.localize=new st(this)}render(){return p`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Pi.styles=[N,ws];var fe=new WeakMap,me=new WeakMap,be=new WeakMap,di=new WeakSet,Pe=new WeakMap,Ae=class{constructor(t,e){this.handleFormData=i=>{const o=this.options.disabled(this.host),s=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!o&&!a&&typeof s=="string"&&s.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(c=>{i.formData.append(s,c.toString())}):i.formData.append(s,r.toString()))},this.handleFormSubmit=i=>{var o;const s=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((o=fe.get(this.form))==null||o.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!s&&!r(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),Pe.set(this.host,[])},this.handleInteraction=i=>{const o=Pe.get(this.host);o.includes(i.type)||o.push(i.type),o.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.checkValidity=="function"&&!o.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.reportValidity=="function"&&!o.reportValidity())return!1}return!0},(this.host=t).addController(this),this.options=Qt({form:i=>{const o=i.form;if(o){const r=i.getRootNode().querySelector(`#${o}`);if(r)return r}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var o;return(o=i.disabled)!=null?o:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,o)=>i.value=o,assumeInteractionOn:["sl-input"]},e)}hostConnected(){const t=this.options.form(this.host);t&&this.attachForm(t),Pe.set(this.host,[]),this.options.assumeInteractionOn.forEach(e=>{this.host.addEventListener(e,this.handleInteraction)})}hostDisconnected(){this.detachForm(),Pe.delete(this.host),this.options.assumeInteractionOn.forEach(t=>{this.host.removeEventListener(t,this.handleInteraction)})}hostUpdated(){const t=this.options.form(this.host);t||this.detachForm(),t&&this.form!==t&&(this.detachForm(),this.attachForm(t)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(t){t?(this.form=t,fe.has(this.form)?fe.get(this.form).add(this.host):fe.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),me.has(this.form)||(me.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),be.has(this.form)||(be.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const t=fe.get(this.form);t&&(t.delete(this.host),t.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),me.has(this.form)&&(this.form.reportValidity=me.get(this.form),me.delete(this.form)),be.has(this.form)&&(this.form.checkValidity=be.get(this.form),be.delete(this.form)),this.form=void 0))}setUserInteracted(t,e){e?di.add(t):di.delete(t),t.requestUpdate()}doAction(t,e){if(this.form){const i=document.createElement("button");i.type=t,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",e&&(i.name=e.name,i.value=e.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(o=>{e.hasAttribute(o)&&i.setAttribute(o,e.getAttribute(o))})),this.form.append(i),i.click(),i.remove()}}getForm(){var t;return(t=this.form)!=null?t:null}reset(t){this.doAction("reset",t)}submit(t){this.doAction("submit",t)}setValidity(t){const e=this.host,i=!!di.has(e),o=!!e.required;e.toggleAttribute("data-required",o),e.toggleAttribute("data-optional",!o),e.toggleAttribute("data-invalid",!t),e.toggleAttribute("data-valid",t),e.toggleAttribute("data-user-invalid",!t&&i),e.toggleAttribute("data-user-valid",t&&i)}updateValidity(){const t=this.host;this.setValidity(t.validity.valid)}emitInvalidEvent(t){const e=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});t||e.preventDefault(),this.host.dispatchEvent(e)||t==null||t.preventDefault()}},Di=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(Xe(Qt({},Di),{valid:!1,valueMissing:!0}));Object.freeze(Xe(Qt({},Di),{valid:!1,customError:!0}));var Rs=A`
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
`,At=class{constructor(t,...e){this.slotNames=[],this.handleSlotChange=i=>{const o=i.target;(this.slotNames.includes("[default]")&&!o.name||o.name&&this.slotNames.includes(o.name))&&this.host.requestUpdate()},(this.host=t).addController(this),this.slotNames=e}hasDefaultSlot(){return[...this.host.childNodes].some(t=>{if(t.nodeType===t.TEXT_NODE&&t.textContent.trim()!=="")return!0;if(t.nodeType===t.ELEMENT_NODE){const e=t;if(e.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!e.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(t){return this.host.querySelector(`:scope > [slot="${t}"]`)!==null}test(t){return t==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(t)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Ms(t){if(!t)return"";const e=t.assignedNodes({flatten:!0});let i="";return[...e].forEach(o=>{o.nodeType===Node.TEXT_NODE&&(i+=o.textContent)}),i}var gi="";function vi(t){gi=t}function Ns(t=""){if(!gi){const e=[...document.getElementsByTagName("script")],i=e.find(o=>o.hasAttribute("data-shoelace"));if(i)vi(i.getAttribute("data-shoelace"));else{const o=e.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let s="";o&&(s=o.getAttribute("src")),vi(s.split("/").slice(0,-1).join("/"))}}return gi.replace(/\/$/,"")+(t?`/${t.replace(/^\//,"")}`:"")}var Bs={name:"default",resolver:t=>Ns(`assets/icons/${t}.svg`)},Fs=Bs,oo={caret:`
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
  `},Vs={name:"system",resolver:t=>t in oo?`data:image/svg+xml,${encodeURIComponent(oo[t])}`:""},Hs=Vs,Us=[Fs,Hs],yi=[];function js(t){yi.push(t)}function qs(t){yi=yi.filter(e=>e!==t)}function so(t){return Us.find(e=>e.name===t)}var Ws=A`
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
`;function z(t,e){const i=Qt({waitUntilFirstUpdate:!1},e);return(o,s)=>{const{update:r}=o,a=Array.isArray(t)?t:[t];o.update=function(c){a.forEach(d=>{const h=d;if(c.has(h)){const u=c.get(h),f=this[h];u!==f&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[s](u,f)}}),r.call(this,c)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ks=(t,e)=>(t==null?void 0:t._$litType$)!==void 0,Io=t=>t.strings===void 0,Ys={},Xs=(t,e=Ys)=>t._$AH=e;var ge=Symbol(),De=Symbol(),hi,ui=new Map,Y=class extends D{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(t,e){var i;let o;if(e!=null&&e.spriteSheet)return this.svg=p`<svg part="svg">
        <use part="use" href="${t}"></use>
      </svg>`,this.svg;try{if(o=await fetch(t,{mode:"cors"}),!o.ok)return o.status===410?ge:De}catch{return De}try{const s=document.createElement("div");s.innerHTML=await o.text();const r=s.firstElementChild;if(((i=r==null?void 0:r.tagName)==null?void 0:i.toLowerCase())!=="svg")return ge;hi||(hi=new DOMParser);const c=hi.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return c?(c.part.add("svg"),document.adoptNode(c)):ge}catch{return ge}}connectedCallback(){super.connectedCallback(),js(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),qs(this)}getIconSource(){const t=so(this.library);return this.name&&t?{url:t.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var t;const{url:e,fromLibrary:i}=this.getIconSource(),o=i?so(this.library):void 0;if(!e){this.svg=null;return}let s=ui.get(e);if(s||(s=this.resolveIcon(e,o),ui.set(e,s)),!this.initialRender)return;const r=await s;if(r===De&&ui.delete(e),e===this.getIconSource().url){if(Ks(r)){if(this.svg=r,o){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof o.mutator=="function"&&a&&o.mutator(a)}return}switch(r){case De:case ge:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(t=o==null?void 0:o.mutator)==null||t.call(o,this.svg),this.emit("sl-load")}}}render(){return this.svg}};Y.styles=[N,Ws];n([v()],Y.prototype,"svg",2);n([l({reflect:!0})],Y.prototype,"name",2);n([l()],Y.prototype,"src",2);n([l()],Y.prototype,"label",2);n([l({reflect:!0})],Y.prototype,"library",2);n([z("label")],Y.prototype,"handleLabelChange",1);n([z(["name","src","library"])],Y.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Tt={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ge=t=>(...e)=>({_$litDirective$:t,values:e});let Je=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,o){this._$Ct=e,this._$AM=i,this._$Ci=o}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=Ge(class extends Je{constructor(t){var e;if(super(t),t.type!==Tt.ATTRIBUTE||t.name!=="class"||((e=t.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){var o,s;if(this.st===void 0){this.st=new Set,t.strings!==void 0&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in e)e[r]&&!((o=this.nt)!=null&&o.has(r))&&this.st.add(r);return this.render(e)}const i=t.element.classList;for(const r of this.st)r in e||(i.remove(r),this.st.delete(r));for(const r in e){const a=!!e[r];a===this.st.has(r)||(s=this.nt)!=null&&s.has(r)||(a?(i.add(r),this.st.add(r)):(i.remove(r),this.st.delete(r)))}return dt}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ro=Symbol.for(""),Gs=t=>{if((t==null?void 0:t.r)===Ro)return t==null?void 0:t._$litStatic$},Ve=(t,...e)=>({_$litStatic$:e.reduce((i,o,s)=>i+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(o)+t[s+1],t[0]),r:Ro}),ro=new Map,Js=t=>(e,...i)=>{const o=i.length;let s,r;const a=[],c=[];let d,h=0,u=!1;for(;h<o;){for(d=e[h];h<o&&(r=i[h],(s=Gs(r))!==void 0);)d+=s+e[++h],u=!0;h!==o&&c.push(r),a.push(d),h++}if(h===o&&a.push(e[o]),u){const f=a.join("$$lit$$");(e=ro.get(f))===void 0&&(a.raw=a,ro.set(f,e=a)),i=c}return t(e,...i)},Ne=Js(p);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const y=t=>t??w;var O=class extends D{constructor(){super(...arguments),this.formControlController=new Ae(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new At(this,"[default]","prefix","suffix"),this.localize=new st(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:Di}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(t){this.isButton()&&(this.button.setCustomValidity(t),this.formControlController.updateValidity())}render(){const t=this.isLink(),e=t?Ve`a`:Ve`button`;return Ne`
      <${e}
        part="base"
        class=${M({button:!0,"button--default":this.variant==="default","button--primary":this.variant==="primary","button--success":this.variant==="success","button--neutral":this.variant==="neutral","button--warning":this.variant==="warning","button--danger":this.variant==="danger","button--text":this.variant==="text","button--small":this.size==="small","button--medium":this.size==="medium","button--large":this.size==="large","button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()==="rtl","button--has-label":this.hasSlotController.test("[default]"),"button--has-prefix":this.hasSlotController.test("prefix"),"button--has-suffix":this.hasSlotController.test("suffix")})}
        ?disabled=${y(t?void 0:this.disabled)}
        type=${y(t?void 0:this.type)}
        title=${this.title}
        name=${y(t?void 0:this.name)}
        value=${y(t?void 0:this.value)}
        href=${y(t&&!this.disabled?this.href:void 0)}
        target=${y(t?this.target:void 0)}
        download=${y(t?this.download:void 0)}
        rel=${y(t?this.rel:void 0)}
        role=${y(t?void 0:"button")}
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
        ${this.caret?Ne` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?Ne`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${e}>
    `}};O.styles=[N,Rs];O.dependencies={"sl-icon":Y,"sl-spinner":Pi};n([S(".button")],O.prototype,"button",2);n([v()],O.prototype,"hasFocus",2);n([v()],O.prototype,"invalid",2);n([l()],O.prototype,"title",2);n([l({reflect:!0})],O.prototype,"variant",2);n([l({reflect:!0})],O.prototype,"size",2);n([l({type:Boolean,reflect:!0})],O.prototype,"caret",2);n([l({type:Boolean,reflect:!0})],O.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],O.prototype,"loading",2);n([l({type:Boolean,reflect:!0})],O.prototype,"outline",2);n([l({type:Boolean,reflect:!0})],O.prototype,"pill",2);n([l({type:Boolean,reflect:!0})],O.prototype,"circle",2);n([l()],O.prototype,"type",2);n([l()],O.prototype,"name",2);n([l()],O.prototype,"value",2);n([l()],O.prototype,"href",2);n([l()],O.prototype,"target",2);n([l()],O.prototype,"rel",2);n([l()],O.prototype,"download",2);n([l()],O.prototype,"form",2);n([l({attribute:"formaction"})],O.prototype,"formAction",2);n([l({attribute:"formenctype"})],O.prototype,"formEnctype",2);n([l({attribute:"formmethod"})],O.prototype,"formMethod",2);n([l({attribute:"formnovalidate",type:Boolean})],O.prototype,"formNoValidate",2);n([l({attribute:"formtarget"})],O.prototype,"formTarget",2);n([z("disabled",{waitUntilFirstUpdate:!0})],O.prototype,"handleDisabledChange",1);O.define("sl-button");var Zs=A`
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
`,Ii=(t="value")=>(e,i)=>{const o=e.constructor,s=o.prototype.attributeChangedCallback;o.prototype.attributeChangedCallback=function(r,a,c){var d;const h=o.getPropertyOptions(t),u=typeof h.attribute=="string"?h.attribute:t;if(r===u){const f=h.converter||se,m=(typeof f=="function"?f:(d=f==null?void 0:f.fromAttribute)!=null?d:se.fromAttribute)(c,h.type);this[t]!==m&&(this[i]=m)}s.call(this,r,a,c)}},Ze=A`
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
 */const He=Ge(class extends Je{constructor(t){if(super(t),t.type!==Tt.PROPERTY&&t.type!==Tt.ATTRIBUTE&&t.type!==Tt.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Io(t))throw Error("`live` bindings can only contain a single expression")}render(t){return t}update(t,[e]){if(e===dt||e===w)return e;const i=t.element,o=t.name;if(t.type===Tt.PROPERTY){if(e===i[o])return dt}else if(t.type===Tt.BOOLEAN_ATTRIBUTE){if(!!e===i.hasAttribute(o))return dt}else if(t.type===Tt.ATTRIBUTE&&i.getAttribute(o)===e+"")return dt;return Xs(t),e}});var x=class extends D{constructor(){super(...arguments),this.formControlController=new Ae(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new At(this,"help-text","label"),this.localize=new st(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var t;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((t=this.input)==null?void 0:t.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(t){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=t,this.value=this.__dateInput.value}get valueAsNumber(){var t;return this.__numberInput.value=this.value,((t=this.input)==null?void 0:t.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(t){this.__numberInput.valueAsNumber=t,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(t){t.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleKeyDown(t){const e=t.metaKey||t.ctrlKey||t.shiftKey||t.altKey;t.key==="Enter"&&!e&&setTimeout(()=>{!t.defaultPrevented&&!t.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,o="preserve"){const s=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,s,r,o),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return p`
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
              name=${y(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${y(this.placeholder)}
              minlength=${y(this.minlength)}
              maxlength=${y(this.maxlength)}
              min=${y(this.min)}
              max=${y(this.max)}
              step=${y(this.step)}
              .value=${He(this.value)}
              autocapitalize=${y(this.autocapitalize)}
              autocomplete=${y(this.autocomplete)}
              autocorrect=${y(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${y(this.pattern)}
              enterkeyhint=${y(this.enterkeyhint)}
              inputmode=${y(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${r?p`
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
            ${this.passwordToggle&&!this.disabled?p`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?p`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:p`
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
    `}};x.styles=[N,Ze,Zs];x.dependencies={"sl-icon":Y};n([S(".input__control")],x.prototype,"input",2);n([v()],x.prototype,"hasFocus",2);n([l()],x.prototype,"title",2);n([l({reflect:!0})],x.prototype,"type",2);n([l()],x.prototype,"name",2);n([l()],x.prototype,"value",2);n([Ii()],x.prototype,"defaultValue",2);n([l({reflect:!0})],x.prototype,"size",2);n([l({type:Boolean,reflect:!0})],x.prototype,"filled",2);n([l({type:Boolean,reflect:!0})],x.prototype,"pill",2);n([l()],x.prototype,"label",2);n([l({attribute:"help-text"})],x.prototype,"helpText",2);n([l({type:Boolean})],x.prototype,"clearable",2);n([l({type:Boolean,reflect:!0})],x.prototype,"disabled",2);n([l()],x.prototype,"placeholder",2);n([l({type:Boolean,reflect:!0})],x.prototype,"readonly",2);n([l({attribute:"password-toggle",type:Boolean})],x.prototype,"passwordToggle",2);n([l({attribute:"password-visible",type:Boolean})],x.prototype,"passwordVisible",2);n([l({attribute:"no-spin-buttons",type:Boolean})],x.prototype,"noSpinButtons",2);n([l({reflect:!0})],x.prototype,"form",2);n([l({type:Boolean,reflect:!0})],x.prototype,"required",2);n([l()],x.prototype,"pattern",2);n([l({type:Number})],x.prototype,"minlength",2);n([l({type:Number})],x.prototype,"maxlength",2);n([l()],x.prototype,"min",2);n([l()],x.prototype,"max",2);n([l()],x.prototype,"step",2);n([l()],x.prototype,"autocapitalize",2);n([l()],x.prototype,"autocorrect",2);n([l()],x.prototype,"autocomplete",2);n([l({type:Boolean})],x.prototype,"autofocus",2);n([l()],x.prototype,"enterkeyhint",2);n([l({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],x.prototype,"spellcheck",2);n([l()],x.prototype,"inputmode",2);n([z("disabled",{waitUntilFirstUpdate:!0})],x.prototype,"handleDisabledChange",1);n([z("step",{waitUntilFirstUpdate:!0})],x.prototype,"handleStepChange",1);n([z("value",{waitUntilFirstUpdate:!0})],x.prototype,"handleValueChange",1);x.define("sl-input");var Qs=A`
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
`,tr=A`
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
`,X=class extends D{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(t){this.disabled&&(t.preventDefault(),t.stopPropagation())}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}render(){const t=!!this.href,e=t?Ve`a`:Ve`button`;return Ne`
      <${e}
        part="base"
        class=${M({"icon-button":!0,"icon-button--disabled":!t&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${y(t?void 0:this.disabled)}
        type=${y(t?void 0:"button")}
        href=${y(t?this.href:void 0)}
        target=${y(t?this.target:void 0)}
        download=${y(t?this.download:void 0)}
        rel=${y(t&&this.target?"noreferrer noopener":void 0)}
        role=${y(t?void 0:"button")}
        aria-disabled=${this.disabled?"true":"false"}
        aria-label="${this.label}"
        tabindex=${this.disabled?"-1":"0"}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${y(this.name)}
          library=${y(this.library)}
          src=${y(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${e}>
    `}};X.styles=[N,tr];X.dependencies={"sl-icon":Y};n([S(".icon-button")],X.prototype,"button",2);n([v()],X.prototype,"hasFocus",2);n([l()],X.prototype,"name",2);n([l()],X.prototype,"library",2);n([l()],X.prototype,"src",2);n([l()],X.prototype,"href",2);n([l()],X.prototype,"target",2);n([l()],X.prototype,"download",2);n([l()],X.prototype,"label",2);n([l({type:Boolean,reflect:!0})],X.prototype,"disabled",2);var te=class extends D{constructor(){super(...arguments),this.localize=new st(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return p`
      <span
        part="base"
        class=${M({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?p`
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
    `}};te.styles=[N,Qs];te.dependencies={"sl-icon-button":X};n([l({reflect:!0})],te.prototype,"variant",2);n([l({reflect:!0})],te.prototype,"size",2);n([l({type:Boolean,reflect:!0})],te.prototype,"pill",2);n([l({type:Boolean})],te.prototype,"removable",2);var er=A`
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
`;function ir(t,e){return{top:Math.round(t.getBoundingClientRect().top-e.getBoundingClientRect().top),left:Math.round(t.getBoundingClientRect().left-e.getBoundingClientRect().left)}}var wi=new Set;function or(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}function sr(){const t=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(t)||!t?0:t}function xe(t){if(wi.add(t),!document.documentElement.classList.contains("sl-scroll-lock")){const e=or()+sr();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),e<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${e}px`)}}function ke(t){wi.delete(t),wi.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function rr(t,e,i="vertical",o="smooth"){const s=ir(t,e),r=s.top+e.scrollTop,a=s.left+e.scrollLeft,c=e.scrollLeft,d=e.scrollLeft+e.offsetWidth,h=e.scrollTop,u=e.scrollTop+e.offsetHeight;(i==="horizontal"||i==="both")&&(a<c?e.scrollTo({left:a,behavior:o}):a+t.clientWidth>d&&e.scrollTo({left:a-e.offsetWidth+t.clientWidth,behavior:o})),(i==="vertical"||i==="both")&&(r<h?e.scrollTo({top:r,behavior:o}):r+t.clientHeight>u&&e.scrollTo({top:r-e.offsetHeight+t.clientHeight,behavior:o}))}var ar=A`
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
`;const Rt=Math.min,et=Math.max,Ue=Math.round,Ie=Math.floor,wt=t=>({x:t,y:t}),nr={left:"right",right:"left",bottom:"top",top:"bottom"},lr={start:"end",end:"start"};function xi(t,e,i){return et(t,Rt(e,i))}function ne(t,e){return typeof t=="function"?t(e):t}function Mt(t){return t.split("-")[0]}function le(t){return t.split("-")[1]}function Mo(t){return t==="x"?"y":"x"}function Ri(t){return t==="y"?"height":"width"}const cr=new Set(["top","bottom"]);function Et(t){return cr.has(Mt(t))?"y":"x"}function Mi(t){return Mo(Et(t))}function dr(t,e,i){i===void 0&&(i=!1);const o=le(t),s=Mi(t),r=Ri(s);let a=s==="x"?o===(i?"end":"start")?"right":"left":o==="start"?"bottom":"top";return e.reference[r]>e.floating[r]&&(a=je(a)),[a,je(a)]}function hr(t){const e=je(t);return[ki(t),e,ki(e)]}function ki(t){return t.replace(/start|end/g,e=>lr[e])}const ao=["left","right"],no=["right","left"],ur=["top","bottom"],pr=["bottom","top"];function fr(t,e,i){switch(t){case"top":case"bottom":return i?e?no:ao:e?ao:no;case"left":case"right":return e?ur:pr;default:return[]}}function mr(t,e,i,o){const s=le(t);let r=fr(Mt(t),i==="start",o);return s&&(r=r.map(a=>a+"-"+s),e&&(r=r.concat(r.map(ki)))),r}function je(t){return t.replace(/left|right|bottom|top/g,e=>nr[e])}function br(t){return{top:0,right:0,bottom:0,left:0,...t}}function No(t){return typeof t!="number"?br(t):{top:t,right:t,bottom:t,left:t}}function qe(t){const{x:e,y:i,width:o,height:s}=t;return{width:o,height:s,top:i,left:e,right:e+o,bottom:i+s,x:e,y:i}}function lo(t,e,i){let{reference:o,floating:s}=t;const r=Et(e),a=Mi(e),c=Ri(a),d=Mt(e),h=r==="y",u=o.x+o.width/2-s.width/2,f=o.y+o.height/2-s.height/2,b=o[c]/2-s[c]/2;let m;switch(d){case"top":m={x:u,y:o.y-s.height};break;case"bottom":m={x:u,y:o.y+o.height};break;case"right":m={x:o.x+o.width,y:f};break;case"left":m={x:o.x-s.width,y:f};break;default:m={x:o.x,y:o.y}}switch(le(e)){case"start":m[a]-=b*(i&&h?-1:1);break;case"end":m[a]+=b*(i&&h?-1:1);break}return m}const gr=async(t,e,i)=>{const{placement:o="bottom",strategy:s="absolute",middleware:r=[],platform:a}=i,c=r.filter(Boolean),d=await(a.isRTL==null?void 0:a.isRTL(e));let h=await a.getElementRects({reference:t,floating:e,strategy:s}),{x:u,y:f}=lo(h,o,d),b=o,m={},g=0;for(let k=0;k<c.length;k++){const{name:C,fn:_}=c[k],{x:E,y:P,data:B,reset:R}=await _({x:u,y:f,initialPlacement:o,placement:b,strategy:s,middlewareData:m,rects:h,platform:a,elements:{reference:t,floating:e}});u=E??u,f=P??f,m={...m,[C]:{...m[C],...B}},R&&g<=50&&(g++,typeof R=="object"&&(R.placement&&(b=R.placement),R.rects&&(h=R.rects===!0?await a.getElementRects({reference:t,floating:e,strategy:s}):R.rects),{x:u,y:f}=lo(h,b,d)),k=-1)}return{x:u,y:f,placement:b,strategy:s,middlewareData:m}};async function Ni(t,e){var i;e===void 0&&(e={});const{x:o,y:s,platform:r,rects:a,elements:c,strategy:d}=t,{boundary:h="clippingAncestors",rootBoundary:u="viewport",elementContext:f="floating",altBoundary:b=!1,padding:m=0}=ne(e,t),g=No(m),C=c[b?f==="floating"?"reference":"floating":f],_=qe(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement(C)))==null||i?C:C.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(c.floating)),boundary:h,rootBoundary:u,strategy:d})),E=f==="floating"?{x:o,y:s,width:a.floating.width,height:a.floating.height}:a.reference,P=await(r.getOffsetParent==null?void 0:r.getOffsetParent(c.floating)),B=await(r.isElement==null?void 0:r.isElement(P))?await(r.getScale==null?void 0:r.getScale(P))||{x:1,y:1}:{x:1,y:1},R=qe(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:c,rect:E,offsetParent:P,strategy:d}):E);return{top:(_.top-R.top+g.top)/B.y,bottom:(R.bottom-_.bottom+g.bottom)/B.y,left:(_.left-R.left+g.left)/B.x,right:(R.right-_.right+g.right)/B.x}}const vr=t=>({name:"arrow",options:t,async fn(e){const{x:i,y:o,placement:s,rects:r,platform:a,elements:c,middlewareData:d}=e,{element:h,padding:u=0}=ne(t,e)||{};if(h==null)return{};const f=No(u),b={x:i,y:o},m=Mi(s),g=Ri(m),k=await a.getDimensions(h),C=m==="y",_=C?"top":"left",E=C?"bottom":"right",P=C?"clientHeight":"clientWidth",B=r.reference[g]+r.reference[m]-b[m]-r.floating[g],R=b[m]-r.reference[m],pt=await(a.getOffsetParent==null?void 0:a.getOffsetParent(h));let W=pt?pt[P]:0;(!W||!await(a.isElement==null?void 0:a.isElement(pt)))&&(W=c.floating[P]||r.floating[g]);const Ct=B/2-R/2,vt=W/2-k[g]/2-1,ct=Rt(f[_],vt),zt=Rt(f[E],vt),yt=ct,Ot=W-k[g]-zt,Z=W/2-k[g]/2+Ct,Ut=xi(yt,Z,Ot),St=!d.arrow&&le(s)!=null&&Z!==Ut&&r.reference[g]/2-(Z<yt?ct:zt)-k[g]/2<0,ft=St?Z<yt?Z-yt:Z-Ot:0;return{[m]:b[m]+ft,data:{[m]:Ut,centerOffset:Z-Ut-ft,...St&&{alignmentOffset:ft}},reset:St}}}),yr=function(t){return t===void 0&&(t={}),{name:"flip",options:t,async fn(e){var i,o;const{placement:s,middlewareData:r,rects:a,initialPlacement:c,platform:d,elements:h}=e,{mainAxis:u=!0,crossAxis:f=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:k=!0,...C}=ne(t,e);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const _=Mt(s),E=Et(c),P=Mt(c)===c,B=await(d.isRTL==null?void 0:d.isRTL(h.floating)),R=b||(P||!k?[je(c)]:hr(c)),pt=g!=="none";!b&&pt&&R.push(...mr(c,k,g,B));const W=[c,...R],Ct=await Ni(e,C),vt=[];let ct=((o=r.flip)==null?void 0:o.overflows)||[];if(u&&vt.push(Ct[_]),f){const Z=dr(s,a,B);vt.push(Ct[Z[0]],Ct[Z[1]])}if(ct=[...ct,{placement:s,overflows:vt}],!vt.every(Z=>Z<=0)){var zt,yt;const Z=(((zt=r.flip)==null?void 0:zt.index)||0)+1,Ut=W[Z];if(Ut&&(!(f==="alignment"?E!==Et(Ut):!1)||ct.every(mt=>Et(mt.placement)===E?mt.overflows[0]>0:!0)))return{data:{index:Z,overflows:ct},reset:{placement:Ut}};let St=(yt=ct.filter(ft=>ft.overflows[0]<=0).sort((ft,mt)=>ft.overflows[1]-mt.overflows[1])[0])==null?void 0:yt.placement;if(!St)switch(m){case"bestFit":{var Ot;const ft=(Ot=ct.filter(mt=>{if(pt){const Lt=Et(mt.placement);return Lt===E||Lt==="y"}return!0}).map(mt=>[mt.placement,mt.overflows.filter(Lt=>Lt>0).reduce((Lt,ts)=>Lt+ts,0)]).sort((mt,Lt)=>mt[1]-Lt[1])[0])==null?void 0:Ot[0];ft&&(St=ft);break}case"initialPlacement":St=c;break}if(s!==St)return{reset:{placement:St}}}return{}}}},wr=new Set(["left","top"]);async function xr(t,e){const{placement:i,platform:o,elements:s}=t,r=await(o.isRTL==null?void 0:o.isRTL(s.floating)),a=Mt(i),c=le(i),d=Et(i)==="y",h=wr.has(a)?-1:1,u=r&&d?-1:1,f=ne(e,t);let{mainAxis:b,crossAxis:m,alignmentAxis:g}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:f.mainAxis||0,crossAxis:f.crossAxis||0,alignmentAxis:f.alignmentAxis};return c&&typeof g=="number"&&(m=c==="end"?g*-1:g),d?{x:m*u,y:b*h}:{x:b*h,y:m*u}}const kr=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var i,o;const{x:s,y:r,placement:a,middlewareData:c}=e,d=await xr(e,t);return a===((i=c.offset)==null?void 0:i.placement)&&(o=c.arrow)!=null&&o.alignmentOffset?{}:{x:s+d.x,y:r+d.y,data:{...d,placement:a}}}}},_r=function(t){return t===void 0&&(t={}),{name:"shift",options:t,async fn(e){const{x:i,y:o,placement:s}=e,{mainAxis:r=!0,crossAxis:a=!1,limiter:c={fn:C=>{let{x:_,y:E}=C;return{x:_,y:E}}},...d}=ne(t,e),h={x:i,y:o},u=await Ni(e,d),f=Et(Mt(s)),b=Mo(f);let m=h[b],g=h[f];if(r){const C=b==="y"?"top":"left",_=b==="y"?"bottom":"right",E=m+u[C],P=m-u[_];m=xi(E,m,P)}if(a){const C=f==="y"?"top":"left",_=f==="y"?"bottom":"right",E=g+u[C],P=g-u[_];g=xi(E,g,P)}const k=c.fn({...e,[b]:m,[f]:g});return{...k,data:{x:k.x-i,y:k.y-o,enabled:{[b]:r,[f]:a}}}}}},$r=function(t){return t===void 0&&(t={}),{name:"size",options:t,async fn(e){var i,o;const{placement:s,rects:r,platform:a,elements:c}=e,{apply:d=()=>{},...h}=ne(t,e),u=await Ni(e,h),f=Mt(s),b=le(s),m=Et(s)==="y",{width:g,height:k}=r.floating;let C,_;f==="top"||f==="bottom"?(C=f,_=b===(await(a.isRTL==null?void 0:a.isRTL(c.floating))?"start":"end")?"left":"right"):(_=f,C=b==="end"?"top":"bottom");const E=k-u.top-u.bottom,P=g-u.left-u.right,B=Rt(k-u[C],E),R=Rt(g-u[_],P),pt=!e.middlewareData.shift;let W=B,Ct=R;if((i=e.middlewareData.shift)!=null&&i.enabled.x&&(Ct=P),(o=e.middlewareData.shift)!=null&&o.enabled.y&&(W=E),pt&&!b){const ct=et(u.left,0),zt=et(u.right,0),yt=et(u.top,0),Ot=et(u.bottom,0);m?Ct=g-2*(ct!==0||zt!==0?ct+zt:et(u.left,u.right)):W=k-2*(yt!==0||Ot!==0?yt+Ot:et(u.top,u.bottom))}await d({...e,availableWidth:Ct,availableHeight:W});const vt=await a.getDimensions(c.floating);return g!==vt.width||k!==vt.height?{reset:{rects:!0}}:{}}}};function Qe(){return typeof window<"u"}function ce(t){return Bo(t)?(t.nodeName||"").toLowerCase():"#document"}function ot(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function kt(t){var e;return(e=(Bo(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function Bo(t){return Qe()?t instanceof Node||t instanceof ot(t).Node:!1}function bt(t){return Qe()?t instanceof Element||t instanceof ot(t).Element:!1}function xt(t){return Qe()?t instanceof HTMLElement||t instanceof ot(t).HTMLElement:!1}function co(t){return!Qe()||typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof ot(t).ShadowRoot}const Cr=new Set(["inline","contents"]);function ze(t){const{overflow:e,overflowX:i,overflowY:o,display:s}=gt(t);return/auto|scroll|overlay|hidden|clip/.test(e+o+i)&&!Cr.has(s)}const Sr=new Set(["table","td","th"]);function Tr(t){return Sr.has(ce(t))}const Er=[":popover-open",":modal"];function ti(t){return Er.some(e=>{try{return t.matches(e)}catch{return!1}})}const Ar=["transform","translate","scale","rotate","perspective"],zr=["transform","translate","scale","rotate","perspective","filter"],Or=["paint","layout","strict","content"];function ei(t){const e=Bi(),i=bt(t)?gt(t):t;return Ar.some(o=>i[o]?i[o]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!e&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!e&&(i.filter?i.filter!=="none":!1)||zr.some(o=>(i.willChange||"").includes(o))||Or.some(o=>(i.contain||"").includes(o))}function Lr(t){let e=Nt(t);for(;xt(e)&&!ae(e);){if(ei(e))return e;if(ti(e))return null;e=Nt(e)}return null}function Bi(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Pr=new Set(["html","body","#document"]);function ae(t){return Pr.has(ce(t))}function gt(t){return ot(t).getComputedStyle(t)}function ii(t){return bt(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function Nt(t){if(ce(t)==="html")return t;const e=t.assignedSlot||t.parentNode||co(t)&&t.host||kt(t);return co(e)?e.host:e}function Fo(t){const e=Nt(t);return ae(e)?t.ownerDocument?t.ownerDocument.body:t.body:xt(e)&&ze(e)?e:Fo(e)}function Te(t,e,i){var o;e===void 0&&(e=[]),i===void 0&&(i=!0);const s=Fo(t),r=s===((o=t.ownerDocument)==null?void 0:o.body),a=ot(s);if(r){const c=_i(a);return e.concat(a,a.visualViewport||[],ze(s)?s:[],c&&i?Te(c):[])}return e.concat(s,Te(s,[],i))}function _i(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function Vo(t){const e=gt(t);let i=parseFloat(e.width)||0,o=parseFloat(e.height)||0;const s=xt(t),r=s?t.offsetWidth:i,a=s?t.offsetHeight:o,c=Ue(i)!==r||Ue(o)!==a;return c&&(i=r,o=a),{width:i,height:o,$:c}}function Fi(t){return bt(t)?t:t.contextElement}function oe(t){const e=Fi(t);if(!xt(e))return wt(1);const i=e.getBoundingClientRect(),{width:o,height:s,$:r}=Vo(e);let a=(r?Ue(i.width):i.width)/o,c=(r?Ue(i.height):i.height)/s;return(!a||!Number.isFinite(a))&&(a=1),(!c||!Number.isFinite(c))&&(c=1),{x:a,y:c}}const Dr=wt(0);function Ho(t){const e=ot(t);return!Bi()||!e.visualViewport?Dr:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function Ir(t,e,i){return e===void 0&&(e=!1),!i||e&&i!==ot(t)?!1:e}function Jt(t,e,i,o){e===void 0&&(e=!1),i===void 0&&(i=!1);const s=t.getBoundingClientRect(),r=Fi(t);let a=wt(1);e&&(o?bt(o)&&(a=oe(o)):a=oe(t));const c=Ir(r,i,o)?Ho(r):wt(0);let d=(s.left+c.x)/a.x,h=(s.top+c.y)/a.y,u=s.width/a.x,f=s.height/a.y;if(r){const b=ot(r),m=o&&bt(o)?ot(o):o;let g=b,k=_i(g);for(;k&&o&&m!==g;){const C=oe(k),_=k.getBoundingClientRect(),E=gt(k),P=_.left+(k.clientLeft+parseFloat(E.paddingLeft))*C.x,B=_.top+(k.clientTop+parseFloat(E.paddingTop))*C.y;d*=C.x,h*=C.y,u*=C.x,f*=C.y,d+=P,h+=B,g=ot(k),k=_i(g)}}return qe({width:u,height:f,x:d,y:h})}function oi(t,e){const i=ii(t).scrollLeft;return e?e.left+i:Jt(kt(t)).left+i}function Uo(t,e){const i=t.getBoundingClientRect(),o=i.left+e.scrollLeft-oi(t,i),s=i.top+e.scrollTop;return{x:o,y:s}}function Rr(t){let{elements:e,rect:i,offsetParent:o,strategy:s}=t;const r=s==="fixed",a=kt(o),c=e?ti(e.floating):!1;if(o===a||c&&r)return i;let d={scrollLeft:0,scrollTop:0},h=wt(1);const u=wt(0),f=xt(o);if((f||!f&&!r)&&((ce(o)!=="body"||ze(a))&&(d=ii(o)),xt(o))){const m=Jt(o);h=oe(o),u.x=m.x+o.clientLeft,u.y=m.y+o.clientTop}const b=a&&!f&&!r?Uo(a,d):wt(0);return{width:i.width*h.x,height:i.height*h.y,x:i.x*h.x-d.scrollLeft*h.x+u.x+b.x,y:i.y*h.y-d.scrollTop*h.y+u.y+b.y}}function Mr(t){return Array.from(t.getClientRects())}function Nr(t){const e=kt(t),i=ii(t),o=t.ownerDocument.body,s=et(e.scrollWidth,e.clientWidth,o.scrollWidth,o.clientWidth),r=et(e.scrollHeight,e.clientHeight,o.scrollHeight,o.clientHeight);let a=-i.scrollLeft+oi(t);const c=-i.scrollTop;return gt(o).direction==="rtl"&&(a+=et(e.clientWidth,o.clientWidth)-s),{width:s,height:r,x:a,y:c}}const ho=25;function Br(t,e){const i=ot(t),o=kt(t),s=i.visualViewport;let r=o.clientWidth,a=o.clientHeight,c=0,d=0;if(s){r=s.width,a=s.height;const u=Bi();(!u||u&&e==="fixed")&&(c=s.offsetLeft,d=s.offsetTop)}const h=oi(o);if(h<=0){const u=o.ownerDocument,f=u.body,b=getComputedStyle(f),m=u.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(o.clientWidth-f.clientWidth-m);g<=ho&&(r-=g)}else h<=ho&&(r+=h);return{width:r,height:a,x:c,y:d}}const Fr=new Set(["absolute","fixed"]);function Vr(t,e){const i=Jt(t,!0,e==="fixed"),o=i.top+t.clientTop,s=i.left+t.clientLeft,r=xt(t)?oe(t):wt(1),a=t.clientWidth*r.x,c=t.clientHeight*r.y,d=s*r.x,h=o*r.y;return{width:a,height:c,x:d,y:h}}function uo(t,e,i){let o;if(e==="viewport")o=Br(t,i);else if(e==="document")o=Nr(kt(t));else if(bt(e))o=Vr(e,i);else{const s=Ho(t);o={x:e.x-s.x,y:e.y-s.y,width:e.width,height:e.height}}return qe(o)}function jo(t,e){const i=Nt(t);return i===e||!bt(i)||ae(i)?!1:gt(i).position==="fixed"||jo(i,e)}function Hr(t,e){const i=e.get(t);if(i)return i;let o=Te(t,[],!1).filter(c=>bt(c)&&ce(c)!=="body"),s=null;const r=gt(t).position==="fixed";let a=r?Nt(t):t;for(;bt(a)&&!ae(a);){const c=gt(a),d=ei(a);!d&&c.position==="fixed"&&(s=null),(r?!d&&!s:!d&&c.position==="static"&&!!s&&Fr.has(s.position)||ze(a)&&!d&&jo(t,a))?o=o.filter(u=>u!==a):s=c,a=Nt(a)}return e.set(t,o),o}function Ur(t){let{element:e,boundary:i,rootBoundary:o,strategy:s}=t;const a=[...i==="clippingAncestors"?ti(e)?[]:Hr(e,this._c):[].concat(i),o],c=a[0],d=a.reduce((h,u)=>{const f=uo(e,u,s);return h.top=et(f.top,h.top),h.right=Rt(f.right,h.right),h.bottom=Rt(f.bottom,h.bottom),h.left=et(f.left,h.left),h},uo(e,c,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function jr(t){const{width:e,height:i}=Vo(t);return{width:e,height:i}}function qr(t,e,i){const o=xt(e),s=kt(e),r=i==="fixed",a=Jt(t,!0,r,e);let c={scrollLeft:0,scrollTop:0};const d=wt(0);function h(){d.x=oi(s)}if(o||!o&&!r)if((ce(e)!=="body"||ze(s))&&(c=ii(e)),o){const m=Jt(e,!0,r,e);d.x=m.x+e.clientLeft,d.y=m.y+e.clientTop}else s&&h();r&&!o&&s&&h();const u=s&&!o&&!r?Uo(s,c):wt(0),f=a.left+c.scrollLeft-d.x-u.x,b=a.top+c.scrollTop-d.y-u.y;return{x:f,y:b,width:a.width,height:a.height}}function pi(t){return gt(t).position==="static"}function po(t,e){if(!xt(t)||gt(t).position==="fixed")return null;if(e)return e(t);let i=t.offsetParent;return kt(t)===i&&(i=i.ownerDocument.body),i}function qo(t,e){const i=ot(t);if(ti(t))return i;if(!xt(t)){let s=Nt(t);for(;s&&!ae(s);){if(bt(s)&&!pi(s))return s;s=Nt(s)}return i}let o=po(t,e);for(;o&&Tr(o)&&pi(o);)o=po(o,e);return o&&ae(o)&&pi(o)&&!ei(o)?i:o||Lr(t)||i}const Wr=async function(t){const e=this.getOffsetParent||qo,i=this.getDimensions,o=await i(t.floating);return{reference:qr(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function Kr(t){return gt(t).direction==="rtl"}const Be={convertOffsetParentRelativeRectToViewportRelativeRect:Rr,getDocumentElement:kt,getClippingRect:Ur,getOffsetParent:qo,getElementRects:Wr,getClientRects:Mr,getDimensions:jr,getScale:oe,isElement:bt,isRTL:Kr};function Wo(t,e){return t.x===e.x&&t.y===e.y&&t.width===e.width&&t.height===e.height}function Yr(t,e){let i=null,o;const s=kt(t);function r(){var c;clearTimeout(o),(c=i)==null||c.disconnect(),i=null}function a(c,d){c===void 0&&(c=!1),d===void 0&&(d=1),r();const h=t.getBoundingClientRect(),{left:u,top:f,width:b,height:m}=h;if(c||e(),!b||!m)return;const g=Ie(f),k=Ie(s.clientWidth-(u+b)),C=Ie(s.clientHeight-(f+m)),_=Ie(u),P={rootMargin:-g+"px "+-k+"px "+-C+"px "+-_+"px",threshold:et(0,Rt(1,d))||1};let B=!0;function R(pt){const W=pt[0].intersectionRatio;if(W!==d){if(!B)return a();W?a(!1,W):o=setTimeout(()=>{a(!1,1e-7)},1e3)}W===1&&!Wo(h,t.getBoundingClientRect())&&a(),B=!1}try{i=new IntersectionObserver(R,{...P,root:s.ownerDocument})}catch{i=new IntersectionObserver(R,P)}i.observe(t)}return a(!0),r}function Xr(t,e,i,o){o===void 0&&(o={});const{ancestorScroll:s=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:c=typeof IntersectionObserver=="function",animationFrame:d=!1}=o,h=Fi(t),u=s||r?[...h?Te(h):[],...Te(e)]:[];u.forEach(_=>{s&&_.addEventListener("scroll",i,{passive:!0}),r&&_.addEventListener("resize",i)});const f=h&&c?Yr(h,i):null;let b=-1,m=null;a&&(m=new ResizeObserver(_=>{let[E]=_;E&&E.target===h&&m&&(m.unobserve(e),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var P;(P=m)==null||P.observe(e)})),i()}),h&&!d&&m.observe(h),m.observe(e));let g,k=d?Jt(t):null;d&&C();function C(){const _=Jt(t);k&&!Wo(k,_)&&i(),k=_,g=requestAnimationFrame(C)}return i(),()=>{var _;u.forEach(E=>{s&&E.removeEventListener("scroll",i),r&&E.removeEventListener("resize",i)}),f==null||f(),(_=m)==null||_.disconnect(),m=null,d&&cancelAnimationFrame(g)}}const Gr=kr,Jr=_r,Zr=yr,fo=$r,Qr=vr,ta=(t,e,i)=>{const o=new Map,s={platform:Be,...i},r={...s.platform,_c:o};return gr(t,e,{...s,platform:r})};function ea(t){return ia(t)}function fi(t){return t.assignedSlot?t.assignedSlot:t.parentNode instanceof ShadowRoot?t.parentNode.host:t.parentNode}function ia(t){for(let e=t;e;e=fi(e))if(e instanceof Element&&getComputedStyle(e).display==="none")return null;for(let e=fi(t);e;e=fi(e)){if(!(e instanceof Element))continue;const i=getComputedStyle(e);if(i.display!=="contents"&&(i.position!=="static"||ei(i)||e.tagName==="BODY"))return e}return null}function oa(t){return t!==null&&typeof t=="object"&&"getBoundingClientRect"in t&&("contextElement"in t?t.contextElement instanceof Element:!0)}var L=class extends D{constructor(){super(...arguments),this.localize=new st(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const t=this.anchorEl.getBoundingClientRect(),e=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let o=0,s=0,r=0,a=0,c=0,d=0,h=0,u=0;i?t.top<e.top?(o=t.left,s=t.bottom,r=t.right,a=t.bottom,c=e.left,d=e.top,h=e.right,u=e.top):(o=e.left,s=e.bottom,r=e.right,a=e.bottom,c=t.left,d=t.top,h=t.right,u=t.top):t.left<e.left?(o=t.right,s=t.top,r=e.left,a=e.top,c=t.right,d=t.bottom,h=e.left,u=e.bottom):(o=e.right,s=e.top,r=t.left,a=t.top,c=e.right,d=e.bottom,h=t.left,u=t.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${o}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${c}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${h}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${u}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(t){super.updated(t),t.has("active")&&(this.active?this.start():this.stop()),t.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const t=this.getRootNode();this.anchorEl=t.getElementById(this.anchor)}else this.anchor instanceof Element||oa(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Xr(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(t=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>t())):t()})}reposition(){if(!this.active||!this.anchorEl)return;const t=[Gr({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?t.push(fo({apply:({rects:i})=>{const o=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=o?`${i.reference.width}px`:"",this.popup.style.height=s?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&t.push(Zr({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&t.push(Jr({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?t.push(fo({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:o})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${o}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&t.push(Qr({element:this.arrowEl,padding:this.arrowPadding}));const e=this.strategy==="absolute"?i=>Be.getOffsetParent(i,ea):Be.getOffsetParent;ta(this.anchorEl,this.popup,{placement:this.placement,middleware:t,strategy:this.strategy,platform:Xe(Qt({},Be),{getOffsetParent:e})}).then(({x:i,y:o,middlewareData:s,placement:r})=>{const a=this.localize.dir()==="rtl",c={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${i}px`,top:`${o}px`}),this.arrow){const d=s.arrow.x,h=s.arrow.y;let u="",f="",b="",m="";if(this.arrowPlacement==="start"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";u=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",f=a?g:"",m=a?"":g}else if(this.arrowPlacement==="end"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";f=a?"":g,m=a?g:"",b=typeof h=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",u=typeof h=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof d=="number"?`${d}px`:"",u=typeof h=="number"?`${h}px`:"");Object.assign(this.arrowEl.style,{top:u,right:f,bottom:b,left:m,[c]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return p`
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
        ${this.arrow?p`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};L.styles=[N,ar];n([S(".popup")],L.prototype,"popup",2);n([S(".popup__arrow")],L.prototype,"arrowEl",2);n([l()],L.prototype,"anchor",2);n([l({type:Boolean,reflect:!0})],L.prototype,"active",2);n([l({reflect:!0})],L.prototype,"placement",2);n([l({reflect:!0})],L.prototype,"strategy",2);n([l({type:Number})],L.prototype,"distance",2);n([l({type:Number})],L.prototype,"skidding",2);n([l({type:Boolean})],L.prototype,"arrow",2);n([l({attribute:"arrow-placement"})],L.prototype,"arrowPlacement",2);n([l({attribute:"arrow-padding",type:Number})],L.prototype,"arrowPadding",2);n([l({type:Boolean})],L.prototype,"flip",2);n([l({attribute:"flip-fallback-placements",converter:{fromAttribute:t=>t.split(" ").map(e=>e.trim()).filter(e=>e!==""),toAttribute:t=>t.join(" ")}})],L.prototype,"flipFallbackPlacements",2);n([l({attribute:"flip-fallback-strategy"})],L.prototype,"flipFallbackStrategy",2);n([l({type:Object})],L.prototype,"flipBoundary",2);n([l({attribute:"flip-padding",type:Number})],L.prototype,"flipPadding",2);n([l({type:Boolean})],L.prototype,"shift",2);n([l({type:Object})],L.prototype,"shiftBoundary",2);n([l({attribute:"shift-padding",type:Number})],L.prototype,"shiftPadding",2);n([l({attribute:"auto-size"})],L.prototype,"autoSize",2);n([l()],L.prototype,"sync",2);n([l({type:Object})],L.prototype,"autoSizeBoundary",2);n([l({attribute:"auto-size-padding",type:Number})],L.prototype,"autoSizePadding",2);n([l({attribute:"hover-bridge",type:Boolean})],L.prototype,"hoverBridge",2);var Ko=new Map,sa=new WeakMap;function ra(t){return t??{keyframes:[],options:{duration:0}}}function mo(t,e){return e.toLowerCase()==="rtl"?{keyframes:t.rtlKeyframes||t.keyframes,options:t.options}:t}function I(t,e){Ko.set(t,ra(e))}function F(t,e,i){const o=sa.get(t);if(o!=null&&o[e])return mo(o[e],i.dir);const s=Ko.get(e);return s?mo(s,i.dir):{keyframes:[],options:{duration:0}}}function ht(t,e){return new Promise(i=>{function o(s){s.target===t&&(t.removeEventListener(e,o),i())}t.addEventListener(e,o)})}function V(t,e,i){return new Promise(o=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=t.animate(e,Xe(Qt({},i),{duration:aa()?0:i.duration}));s.addEventListener("cancel",o,{once:!0}),s.addEventListener("finish",o,{once:!0})})}function bo(t){return t=t.toString().toLowerCase(),t.indexOf("ms")>-1?parseFloat(t):t.indexOf("s")>-1?parseFloat(t)*1e3:parseFloat(t)}function aa(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function K(t){return Promise.all(t.getAnimations().map(e=>new Promise(i=>{e.cancel(),requestAnimationFrame(i)})))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let $i=class extends Je{constructor(e){if(super(e),this.it=w,e.type!==Tt.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===w||e==null)return this._t=void 0,this.it=e;if(e===dt)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const i=[e];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};$i.directiveName="unsafeHTML",$i.resultType=1;const na=Ge($i);var $=class extends D{constructor(){super(...arguments),this.formControlController=new Ae(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new At(this,"help-text","label"),this.localize=new st(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=t=>p`
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
    `,this.handleDocumentFocusIn=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()},this.handleDocumentKeyDown=t=>{const e=t.target,i=e.closest(".select__clear")!==null,o=e.closest("sl-icon-button")!==null;if(!(i||o)){if(t.key==="Escape"&&this.open&&!this.closeWatcher&&(t.preventDefault(),t.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),t.key==="Enter"||t.key===" "&&this.typeToSelectString===""){if(t.preventDefault(),t.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(t.key)){const s=this.getAllOptions(),r=s.indexOf(this.currentOption);let a=Math.max(0,r);if(t.preventDefault(),!this.open&&(this.show(),this.currentOption))return;t.key==="ArrowDown"?(a=r+1,a>s.length-1&&(a=0)):t.key==="ArrowUp"?(a=r-1,a<0&&(a=s.length-1)):t.key==="Home"?a=0:t.key==="End"&&(a=s.length-1),this.setCurrentOption(s[a])}if(t.key&&t.key.length===1||t.key==="Backspace"){const s=this.getAllOptions();if(t.metaKey||t.ctrlKey||t.altKey)return;if(!this.open){if(t.key==="Backspace")return;this.show()}t.stopPropagation(),t.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),t.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=t.key.toLowerCase();for(const r of s)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()}}get value(){return this._value}set value(t){this.multiple?t=Array.isArray(t)?t:t.split(" "):t=Array.isArray(t)?t.join(" "):t,this._value!==t&&(this.valueHasChanged=!0,this._value=t)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var t;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var t;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(t=this.closeWatcher)==null||t.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(t){const i=t.composedPath().some(o=>o instanceof Element&&o.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(t.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(t){t.key!=="Tab"&&(t.stopPropagation(),this.handleDocumentKeyDown(t))}handleClearClick(t){t.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(t){t.stopPropagation(),t.preventDefault()}handleOptionClick(t){const i=t.target.closest("sl-option"),o=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==o&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const t=this.getAllOptions(),e=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(e)?e:[e],o=[];t.forEach(s=>o.push(s.value)),this.setSelectedOptions(t.filter(s=>i.includes(s.value)))}handleTagRemove(t,e){t.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(e,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(t){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),t&&(this.currentOption=t,t.current=!0,t.tabIndex=0,t.focus())}setSelectedOptions(t){const e=this.getAllOptions(),i=Array.isArray(t)?t:[t];e.forEach(o=>o.selected=!1),i.length&&i.forEach(o=>o.selected=!0),this.selectionChanged()}toggleOptionSelection(t,e){e===!0||e===!1?t.selected=e:t.selected=!t.selected,this.selectionChanged()}selectionChanged(){var t,e,i;const o=this.getAllOptions();this.selectedOptions=o.filter(r=>r.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(t=r==null?void 0:r.value)!=null?t:"",this.displayLabel=(i=(e=r==null?void 0:r.getTextLabel)==null?void 0:e.call(r))!=null?i:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((t,e)=>{if(e<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(t,e);return p`<div @sl-remove=${o=>this.handleTagRemove(o,t)}>
          ${typeof i=="string"?na(i):i}
        </div>`}else if(e===this.maxOptionsVisible)return p`<sl-tag size=${this.size}>+${this.selectedOptions.length-e}</sl-tag>`;return p``})}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(t,e,i){if(super.attributeChangedCallback(t,e,i),t==="value"){const o=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=o}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const t=this.getAllOptions(),e=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(t.filter(i=>e.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await K(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:t,options:e}=F(this,"select.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.currentOption&&rr(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await K(this);const{keyframes:t,options:e}=F(this,"select.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,ht(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,ht(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(t){this.valueInput.setCustomValidity(t),this.formControlController.updateValidity()}focus(t){this.displayInput.focus(t)}blur(){this.displayInput.blur()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e,s=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return p`
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

              ${this.multiple?p`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${s?p`
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
    `}};$.styles=[N,Ze,er];$.dependencies={"sl-icon":Y,"sl-popup":L,"sl-tag":te};n([S(".select")],$.prototype,"popup",2);n([S(".select__combobox")],$.prototype,"combobox",2);n([S(".select__display-input")],$.prototype,"displayInput",2);n([S(".select__value-input")],$.prototype,"valueInput",2);n([S(".select__listbox")],$.prototype,"listbox",2);n([v()],$.prototype,"hasFocus",2);n([v()],$.prototype,"displayLabel",2);n([v()],$.prototype,"currentOption",2);n([v()],$.prototype,"selectedOptions",2);n([v()],$.prototype,"valueHasChanged",2);n([l()],$.prototype,"name",2);n([v()],$.prototype,"value",1);n([l({attribute:"value"})],$.prototype,"defaultValue",2);n([l({reflect:!0})],$.prototype,"size",2);n([l()],$.prototype,"placeholder",2);n([l({type:Boolean,reflect:!0})],$.prototype,"multiple",2);n([l({attribute:"max-options-visible",type:Number})],$.prototype,"maxOptionsVisible",2);n([l({type:Boolean,reflect:!0})],$.prototype,"disabled",2);n([l({type:Boolean})],$.prototype,"clearable",2);n([l({type:Boolean,reflect:!0})],$.prototype,"open",2);n([l({type:Boolean})],$.prototype,"hoist",2);n([l({type:Boolean,reflect:!0})],$.prototype,"filled",2);n([l({type:Boolean,reflect:!0})],$.prototype,"pill",2);n([l()],$.prototype,"label",2);n([l({reflect:!0})],$.prototype,"placement",2);n([l({attribute:"help-text"})],$.prototype,"helpText",2);n([l({reflect:!0})],$.prototype,"form",2);n([l({type:Boolean,reflect:!0})],$.prototype,"required",2);n([l()],$.prototype,"getTag",2);n([z("disabled",{waitUntilFirstUpdate:!0})],$.prototype,"handleDisabledChange",1);n([z(["defaultValue","value"],{waitUntilFirstUpdate:!0})],$.prototype,"handleValueChange",1);n([z("open",{waitUntilFirstUpdate:!0})],$.prototype,"handleOpenChange",1);I("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});I("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});$.define("sl-select");var la=A`
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
`,ut=class extends D{constructor(){super(...arguments),this.localize=new st(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const t=this.closest("sl-select");t&&t.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const t=this.childNodes;let e="";return[...t].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(e+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(e+=i.textContent)}),e.trim()}render(){return p`
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
    `}};ut.styles=[N,la];ut.dependencies={"sl-icon":Y};n([S(".option__label")],ut.prototype,"defaultSlot",2);n([v()],ut.prototype,"current",2);n([v()],ut.prototype,"selected",2);n([v()],ut.prototype,"hasHover",2);n([l({reflect:!0})],ut.prototype,"value",2);n([l({type:Boolean,reflect:!0})],ut.prototype,"disabled",2);n([z("disabled")],ut.prototype,"handleDisabledChange",1);n([z("selected")],ut.prototype,"handleSelectedChange",1);n([z("value")],ut.prototype,"handleValueChange",1);ut.define("sl-option");var ca=A`
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
`;function*Vi(t=document.activeElement){t!=null&&(yield t,"shadowRoot"in t&&t.shadowRoot&&t.shadowRoot.mode!=="closed"&&(yield*Ls(Vi(t.shadowRoot.activeElement))))}function Yo(){return[...Vi()].pop()}var go=new WeakMap;function Xo(t){let e=go.get(t);return e||(e=window.getComputedStyle(t,null),go.set(t,e)),e}function da(t){if(typeof t.checkVisibility=="function")return t.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const e=Xo(t);return e.visibility!=="hidden"&&e.display!=="none"}function ha(t){const e=Xo(t),{overflowY:i,overflowX:o}=e;return i==="scroll"||o==="scroll"?!0:i!=="auto"||o!=="auto"?!1:t.scrollHeight>t.clientHeight&&i==="auto"||t.scrollWidth>t.clientWidth&&o==="auto"}function ua(t){const e=t.tagName.toLowerCase(),i=Number(t.getAttribute("tabindex"));if(t.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||t.hasAttribute("disabled")||t.closest("[inert]"))return!1;if(e==="input"&&t.getAttribute("type")==="radio"){const r=t.getRootNode(),a=`input[type='radio'][name="${t.getAttribute("name")}"]`,c=r.querySelector(`${a}:checked`);return c?c===t:r.querySelector(a)===t}return da(t)?(e==="audio"||e==="video")&&t.hasAttribute("controls")||t.hasAttribute("tabindex")||t.hasAttribute("contenteditable")&&t.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(e)?!0:ha(t):!1}function pa(t){var e,i;const o=Ci(t),s=(e=o[0])!=null?e:null,r=(i=o[o.length-1])!=null?i:null;return{start:s,end:r}}function fa(t,e){var i;return((i=t.getRootNode({composed:!0}))==null?void 0:i.host)!==e}function Ci(t){const e=new WeakMap,i=[];function o(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||e.has(s))return;e.set(s,!0),!i.includes(s)&&ua(s)&&i.push(s),s instanceof HTMLSlotElement&&fa(s,t)&&s.assignedElements({flatten:!0}).forEach(r=>{o(r)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&o(s.shadowRoot)}for(const r of s.children)o(r)}return o(t),i.sort((s,r)=>{const a=Number(s.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var ve=[],Go=class{constructor(t){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=e=>{var i;if(e.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const o=Yo();if(this.previousFocus=o,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;e.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=Ci(this.element);let r=s.findIndex(c=>c===o);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=s.length?r=0:r+a<0?r=s.length-1:r+=a,this.previousFocus=this.currentFocus;const c=s[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||c&&this.possiblyHasTabbableChildren(c))return;e.preventDefault(),this.currentFocus=c,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...Vi()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=t,this.elementsWithTabbableControls=["iframe"]}activate(){ve.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){ve=ve.filter(t=>t!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return ve[ve.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const t=Ci(this.element);if(!this.element.matches(":focus-within")){const e=t[0],i=t[t.length-1],o=this.tabDirection==="forward"?e:i;typeof(o==null?void 0:o.focus)=="function"&&(this.currentFocus=o,o.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(t){return this.elementsWithTabbableControls.includes(t.tagName.toLowerCase())||t.hasAttribute("controls")}},Hi=t=>{var e;const{activeElement:i}=document;i&&t.contains(i)&&((e=document.activeElement)==null||e.blur())};function vo(t){return t.charAt(0).toUpperCase()+t.slice(1)}var rt=class extends D{constructor(){super(...arguments),this.hasSlotController=new At(this,"footer"),this.localize=new st(this),this.modal=new Go(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=t=>{this.contained||t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),xe(this)))}disconnectedCallback(){super.disconnectedCallback(),ke(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=F(this,"drawer.denyClose",{dir:this.localize.dir()});V(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;document.removeEventListener("keydown",this.handleDocumentKeyDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),xe(this));const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([K(this.drawer),K(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=F(this,`drawer.show${vo(this.placement)}`,{dir:this.localize.dir()}),i=F(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Hi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),ke(this)),await Promise.all([K(this.drawer),K(this.overlay)]);const t=F(this,`drawer.hide${vo(this.placement)}`,{dir:this.localize.dir()}),e=F(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),xe(this)),this.open&&this.contained&&(this.modal.deactivate(),ke(this))}async show(){if(!this.open)return this.open=!0,ht(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ht(this,"sl-after-hide")}render(){return p`
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
          aria-label=${y(this.noHeader?this.label:void 0)}
          aria-labelledby=${y(this.noHeader?void 0:"title")}
          tabindex="0"
        >
          ${this.noHeader?"":p`
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
    `}};rt.styles=[N,ca];rt.dependencies={"sl-icon-button":X};n([S(".drawer")],rt.prototype,"drawer",2);n([S(".drawer__panel")],rt.prototype,"panel",2);n([S(".drawer__overlay")],rt.prototype,"overlay",2);n([l({type:Boolean,reflect:!0})],rt.prototype,"open",2);n([l({reflect:!0})],rt.prototype,"label",2);n([l({reflect:!0})],rt.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],rt.prototype,"contained",2);n([l({attribute:"no-header",type:Boolean,reflect:!0})],rt.prototype,"noHeader",2);n([z("open",{waitUntilFirstUpdate:!0})],rt.prototype,"handleOpenChange",1);n([z("contained",{waitUntilFirstUpdate:!0})],rt.prototype,"handleNoModalChange",1);I("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});I("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});I("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});I("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});I("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});I("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});I("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});I("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});I("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});I("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});I("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});rt.define("sl-drawer");var ma=A`
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
`,_t=class extends D{constructor(){super(...arguments),this.hasSlotController=new At(this,"footer"),this.localize=new st(this),this.modal=new Go(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=t=>{t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),xe(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),ke(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=F(this,"dialog.denyClose",{dir:this.localize.dir()});V(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),xe(this);const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([K(this.dialog),K(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=F(this,"dialog.show",{dir:this.localize.dir()}),i=F(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Hi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([K(this.dialog),K(this.overlay)]);const t=F(this,"dialog.hide",{dir:this.localize.dir()}),e=F(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,ke(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,ht(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ht(this,"sl-after-hide")}render(){return p`
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
          aria-label=${y(this.noHeader?this.label:void 0)}
          aria-labelledby=${y(this.noHeader?void 0:"title")}
          tabindex="-1"
        >
          ${this.noHeader?"":p`
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
    `}};_t.styles=[N,ma];_t.dependencies={"sl-icon-button":X};n([S(".dialog")],_t.prototype,"dialog",2);n([S(".dialog__panel")],_t.prototype,"panel",2);n([S(".dialog__overlay")],_t.prototype,"overlay",2);n([l({type:Boolean,reflect:!0})],_t.prototype,"open",2);n([l({reflect:!0})],_t.prototype,"label",2);n([l({attribute:"no-header",type:Boolean,reflect:!0})],_t.prototype,"noHeader",2);n([z("open",{waitUntilFirstUpdate:!0})],_t.prototype,"handleOpenChange",1);I("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});I("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});I("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});I("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});I("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});_t.define("sl-dialog");var ba=A`
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
`,Oe=class extends D{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return p`
      <span
        part="base"
        class=${M({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};Oe.styles=[N,ba];n([l({reflect:!0})],Oe.prototype,"variant",2);n([l({type:Boolean,reflect:!0})],Oe.prototype,"pill",2);n([l({type:Boolean,reflect:!0})],Oe.prototype,"pulse",2);Oe.define("sl-badge");var ga=A`
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
`,at=class qt extends D{constructor(){super(...arguments),this.hasSlotController=new At(this,"icon","suffix"),this.localize=new st(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var e;(e=this.countdownAnimation)==null||e.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var e;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(e=this.countdownAnimation)==null||e.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:e}=this,i="100%",o="0";this.countdownAnimation=e.animate([{width:i},{width:o}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await K(this.base),this.base.hidden=!1;const{keyframes:e,options:i}=F(this,"alert.show",{dir:this.localize.dir()});await V(this.base,e,i),this.emit("sl-after-show")}else{Hi(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await K(this.base);const{keyframes:e,options:i}=F(this,"alert.hide",{dir:this.localize.dir()});await V(this.base,e,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,ht(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ht(this,"sl-after-hide")}async toast(){return new Promise(e=>{this.handleCountdownChange(),qt.toastStack.parentElement===null&&document.body.append(qt.toastStack),qt.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{qt.toastStack.removeChild(this),e(),qt.toastStack.querySelector("sl-alert")===null&&qt.toastStack.remove()},{once:!0})})}render(){return p`
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

        ${this.closable?p`
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

        ${this.countdown?p`
              <div
                class=${M({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};at.styles=[N,ga];at.dependencies={"sl-icon-button":X};n([S('[part~="base"]')],at.prototype,"base",2);n([S(".alert__countdown-elapsed")],at.prototype,"countdownElement",2);n([l({type:Boolean,reflect:!0})],at.prototype,"open",2);n([l({type:Boolean,reflect:!0})],at.prototype,"closable",2);n([l({reflect:!0})],at.prototype,"variant",2);n([l({type:Number})],at.prototype,"duration",2);n([l({type:String,reflect:!0})],at.prototype,"countdown",2);n([v()],at.prototype,"remainingTime",2);n([z("open",{waitUntilFirstUpdate:!0})],at.prototype,"handleOpenChange",1);n([z("duration")],at.prototype,"handleDurationChange",1);var va=at;I("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});I("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});va.define("sl-alert");var ya=A`
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
`,T=class extends D{constructor(){super(...arguments),this.formControlController=new Ae(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new At(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var t;super.disconnectedCallback(),this.input&&((t=this.resizeObserver)==null||t.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(t){if(t){typeof t.top=="number"&&(this.input.scrollTop=t.top),typeof t.left=="number"&&(this.input.scrollLeft=t.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,o="preserve"){const s=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,s,r,o),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e;return p`
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
              name=${y(this.name)}
              .value=${He(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${y(this.placeholder)}
              rows=${y(this.rows)}
              minlength=${y(this.minlength)}
              maxlength=${y(this.maxlength)}
              autocapitalize=${y(this.autocapitalize)}
              autocorrect=${y(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${y(this.spellcheck)}
              enterkeyhint=${y(this.enterkeyhint)}
              inputmode=${y(this.inputmode)}
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
    `}};T.styles=[N,Ze,ya];n([S(".textarea__control")],T.prototype,"input",2);n([S(".textarea__size-adjuster")],T.prototype,"sizeAdjuster",2);n([v()],T.prototype,"hasFocus",2);n([l()],T.prototype,"title",2);n([l()],T.prototype,"name",2);n([l()],T.prototype,"value",2);n([l({reflect:!0})],T.prototype,"size",2);n([l({type:Boolean,reflect:!0})],T.prototype,"filled",2);n([l()],T.prototype,"label",2);n([l({attribute:"help-text"})],T.prototype,"helpText",2);n([l()],T.prototype,"placeholder",2);n([l({type:Number})],T.prototype,"rows",2);n([l()],T.prototype,"resize",2);n([l({type:Boolean,reflect:!0})],T.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],T.prototype,"readonly",2);n([l({reflect:!0})],T.prototype,"form",2);n([l({type:Boolean,reflect:!0})],T.prototype,"required",2);n([l({type:Number})],T.prototype,"minlength",2);n([l({type:Number})],T.prototype,"maxlength",2);n([l()],T.prototype,"autocapitalize",2);n([l()],T.prototype,"autocorrect",2);n([l()],T.prototype,"autocomplete",2);n([l({type:Boolean})],T.prototype,"autofocus",2);n([l()],T.prototype,"enterkeyhint",2);n([l({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],T.prototype,"spellcheck",2);n([l()],T.prototype,"inputmode",2);n([Ii()],T.prototype,"defaultValue",2);n([z("disabled",{waitUntilFirstUpdate:!0})],T.prototype,"handleDisabledChange",1);n([z("rows",{waitUntilFirstUpdate:!0})],T.prototype,"handleRowsChange",1);n([z("value",{waitUntilFirstUpdate:!0})],T.prototype,"handleValueChange",1);T.define("sl-textarea");var wa=A`
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
`,G=class extends D{constructor(){super(...arguments),this.localize=new st(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=t=>{this.open&&t.key==="Escape"&&(t.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=t=>{var e;if(t.key==="Escape"&&this.open&&!this.closeWatcher){t.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(t.key==="Tab"){if(this.open&&((e=document.activeElement)==null?void 0:e.tagName.toLowerCase())==="sl-menu-item"){t.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(o,s)=>{if(!o)return null;const r=o.closest(s);if(r)return r;const a=o.getRootNode();return a instanceof ShadowRoot?i(a.host,s):null};setTimeout(()=>{var o;const s=((o=this.containingElement)==null?void 0:o.getRootNode())instanceof ShadowRoot?Yo():document.activeElement;(!this.containingElement||i(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this.containingElement&&!e.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=t=>{const e=t.target;!this.stayOpenOnSelect&&e.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const t=this.trigger.assignedElements({flatten:!0})[0];typeof(t==null?void 0:t.focus)=="function"&&t.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(t=>t.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(t){if([" ","Enter"].includes(t.key)){t.preventDefault(),this.handleTriggerClick();return}const e=this.getMenu();if(e){const i=e.getAllItems(),o=i[0],s=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(t.key)&&(t.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(t.key==="ArrowDown"||t.key==="Home")&&(e.setCurrentItem(o),o.focus()),(t.key==="ArrowUp"||t.key==="End")&&(e.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(t){t.key===" "&&t.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const e=this.trigger.assignedElements({flatten:!0}).find(o=>pa(o).start);let i;if(e){switch(e.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=e.button;break;default:i=e}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,ht(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ht(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var t;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var t;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await K(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:t,options:e}=F(this,"dropdown.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await K(this);const{keyframes:t,options:e}=F(this,"dropdown.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return p`
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
        sync=${y(this.sync?this.sync:void 0)}
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
    `}};G.styles=[N,wa];G.dependencies={"sl-popup":L};n([S(".dropdown")],G.prototype,"popup",2);n([S(".dropdown__trigger")],G.prototype,"trigger",2);n([S(".dropdown__panel")],G.prototype,"panel",2);n([l({type:Boolean,reflect:!0})],G.prototype,"open",2);n([l({reflect:!0})],G.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],G.prototype,"disabled",2);n([l({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],G.prototype,"stayOpenOnSelect",2);n([l({attribute:!1})],G.prototype,"containingElement",2);n([l({type:Number})],G.prototype,"distance",2);n([l({type:Number})],G.prototype,"skidding",2);n([l({type:Boolean})],G.prototype,"hoist",2);n([l({reflect:!0})],G.prototype,"sync",2);n([z("open",{waitUntilFirstUpdate:!0})],G.prototype,"handleOpenChange",1);I("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});I("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});G.define("sl-dropdown");var xa=A`
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
`,Ui=class extends D{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(t){const e=["menuitem","menuitemcheckbox"],i=t.composedPath(),o=i.find(c=>{var d;return e.includes(((d=c==null?void 0:c.getAttribute)==null?void 0:d.call(c,"role"))||"")});if(!o||i.find(c=>{var d;return((d=c==null?void 0:c.getAttribute)==null?void 0:d.call(c,"role"))==="menu"})!==this)return;const a=o;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(t){if(t.key==="Enter"||t.key===" "){const e=this.getCurrentItem();t.preventDefault(),t.stopPropagation(),e==null||e.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(t.key)){const e=this.getAllItems(),i=this.getCurrentItem();let o=i?e.indexOf(i):0;e.length>0&&(t.preventDefault(),t.stopPropagation(),t.key==="ArrowDown"?o++:t.key==="ArrowUp"?o--:t.key==="Home"?o=0:t.key==="End"&&(o=e.length-1),o<0&&(o=e.length-1),o>e.length-1&&(o=0),this.setCurrentItem(e[o]),e[o].focus())}}handleMouseDown(t){const e=t.target;this.isMenuItem(e)&&this.setCurrentItem(e)}handleSlotChange(){const t=this.getAllItems();t.length>0&&this.setCurrentItem(t[0])}isMenuItem(t){var e;return t.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((e=t.getAttribute("role"))!=null?e:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(t=>!(t.inert||!this.isMenuItem(t)))}getCurrentItem(){return this.getAllItems().find(t=>t.getAttribute("tabindex")==="0")}setCurrentItem(t){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===t?"0":"-1")})}render(){return p`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Ui.styles=[N,xa];n([S("slot")],Ui.prototype,"defaultSlot",2);Ui.define("sl-menu");var ka=A`
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
 */const _e=(t,e)=>{var o;const i=t._$AN;if(i===void 0)return!1;for(const s of i)(o=s._$AO)==null||o.call(s,e,!1),_e(s,e);return!0},We=t=>{let e,i;do{if((e=t._$AM)===void 0)break;i=e._$AN,i.delete(t),t=e}while((i==null?void 0:i.size)===0)},Jo=t=>{for(let e;e=t._$AM;t=e){let i=e._$AN;if(i===void 0)e._$AN=i=new Set;else if(i.has(t))break;i.add(t),Ca(e)}};function _a(t){this._$AN!==void 0?(We(this),this._$AM=t,Jo(this)):this._$AM=t}function $a(t,e=!1,i=0){const o=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(e)if(Array.isArray(o))for(let r=i;r<o.length;r++)_e(o[r],!1),We(o[r]);else o!=null&&(_e(o,!1),We(o));else _e(this,t)}const Ca=t=>{t.type==Tt.CHILD&&(t._$AP??(t._$AP=$a),t._$AQ??(t._$AQ=_a))};class Sa extends Je{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,i,o){super._$AT(e,i,o),Jo(this),this.isConnected=e._$AU}_$AO(e,i=!0){var o,s;e!==this.isConnected&&(this.isConnected=e,e?(o=this.reconnected)==null||o.call(this):(s=this.disconnected)==null||s.call(this)),i&&(_e(this,e),We(this))}setValue(e){if(Io(this._$Ct))this._$Ct._$AI(e,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=e,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ta=()=>new Ea;class Ea{}const mi=new WeakMap,Aa=Ge(class extends Sa{render(t){return w}update(t,[e]){var o;const i=e!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=e,this.ht=(o=t.options)==null?void 0:o.host,this.rt(this.ct=t.element)),w}rt(t){if(this.isConnected||(t=void 0),typeof this.G=="function"){const e=this.ht??globalThis;let i=mi.get(e);i===void 0&&(i=new WeakMap,mi.set(e,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,t),t!==void 0&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){var t,e;return typeof this.G=="function"?(t=mi.get(this.ht??globalThis))==null?void 0:t.get(this.G):(e=this.G)==null?void 0:e.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var za=class{constructor(t,e){this.popupRef=Ta(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var o;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(o=i.target.role)!=null&&o.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),o=i==null?void 0:i.assignedElements({flatten:!0}).filter(h=>h.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!o)return;const{left:r,top:a,width:c,height:d}=o.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?r+c:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?r+c:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+d}px`)},(this.host=t).addController(this),this.hasSlotController=e}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(t){const e=this.host.renderRoot.querySelector("slot[name='submenu']");if(!e){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const o of e.assignedElements())if(i=o.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let o=1;o!==i.length;++o)i[o].setAttribute("tabindex","-1");this.popupRef.value&&(t.preventDefault(),t.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(t){this.popupRef.value&&this.popupRef.value.active!==t&&(this.popupRef.value.active=t,this.host.requestUpdate())}enableSubmenu(t=!0){t?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var t;if(!((t=this.host.parentElement)!=null&&t.computedStyleMap))return;const e=this.host.parentElement.computedStyleMap(),o=["padding-top","border-top-width","margin-top"].reduce((s,r)=>{var a;const c=(a=e.get(r))!=null?a:new CSSUnitValue(0,"px"),h=(c instanceof CSSUnitValue?c:new CSSUnitValue(0,"px")).to("px");return s-h.value},0);this.skidding=o}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const t=getComputedStyle(this.host).direction==="rtl";return this.isConnected?p`
      <sl-popup
        ${Aa(this.popupRef)}
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
    `:p` <slot name="submenu" hidden></slot> `}},nt=class extends D{constructor(){super(...arguments),this.localize=new st(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new At(this,"submenu"),this.submenuController=new za(this,this.hasSlotController),this.handleHostClick=t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())},this.handleMouseOver=t=>{this.focus(),t.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const t=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=t;return}t!==this.cachedTextLabel&&(this.cachedTextLabel=t,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Ms(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const t=this.localize.dir()==="rtl",e=this.submenuController.isExpanded();return p`
      <div
        id="anchor"
        part="base"
        class=${M({"menu-item":!0,"menu-item--rtl":t,"menu-item--checked":this.checked,"menu-item--disabled":this.disabled,"menu-item--loading":this.loading,"menu-item--has-submenu":this.isSubmenu(),"menu-item--submenu-expanded":e})}
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
        ${this.loading?p` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};nt.styles=[N,ka];nt.dependencies={"sl-icon":Y,"sl-popup":L,"sl-spinner":Pi};n([S("slot:not([name])")],nt.prototype,"defaultSlot",2);n([S(".menu-item")],nt.prototype,"menuItem",2);n([l()],nt.prototype,"type",2);n([l({type:Boolean,reflect:!0})],nt.prototype,"checked",2);n([l()],nt.prototype,"value",2);n([l({type:Boolean,reflect:!0})],nt.prototype,"loading",2);n([l({type:Boolean,reflect:!0})],nt.prototype,"disabled",2);n([z("checked")],nt.prototype,"handleCheckedChange",1);n([z("disabled")],nt.prototype,"handleDisabledChange",1);n([z("type")],nt.prototype,"handleTypeChange",1);nt.define("sl-menu-item");Y.define("sl-icon");var Oa=A`
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
`,si=class extends D{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};si.styles=[N,Oa];n([l({type:Boolean,reflect:!0})],si.prototype,"vertical",2);n([z("vertical")],si.prototype,"handleVerticalChange",1);si.define("sl-divider");var La=A`
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
`,q=class extends D{constructor(){super(),this.localize=new st(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const t=bo(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),t)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const t=bo(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),t)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(t){return this.trigger.split(" ").includes(t)}async handleOpenChange(){var t,e;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await K(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:o}=F(this,"tooltip.show",{dir:this.localize.dir()});await V(this.popup.popup,i,o),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await K(this.body);const{keyframes:i,options:o}=F(this,"tooltip.hide",{dir:this.localize.dir()});await V(this.popup.popup,i,o),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,ht(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,ht(this,"sl-after-hide")}render(){return p`
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
    `}};q.styles=[N,La];q.dependencies={"sl-popup":L};n([S("slot:not([name])")],q.prototype,"defaultSlot",2);n([S(".tooltip__body")],q.prototype,"body",2);n([S("sl-popup")],q.prototype,"popup",2);n([l()],q.prototype,"content",2);n([l()],q.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],q.prototype,"disabled",2);n([l({type:Number})],q.prototype,"distance",2);n([l({type:Boolean,reflect:!0})],q.prototype,"open",2);n([l({type:Number})],q.prototype,"skidding",2);n([l()],q.prototype,"trigger",2);n([l({type:Boolean})],q.prototype,"hoist",2);n([z("open",{waitUntilFirstUpdate:!0})],q.prototype,"handleOpenChange",1);n([z(["content","distance","hoist","placement","skidding"])],q.prototype,"handleOptionsChange",1);n([z("disabled")],q.prototype,"handleDisabledChange",1);I("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});I("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});q.define("sl-tooltip");var Pa=A`
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
`,U=class extends D{constructor(){super(...arguments),this.formControlController=new Ae(this,{value:t=>t.checked?t.value||"on":void 0,defaultValue:t=>t.defaultChecked,setValue:(t,e)=>t.checked=e}),this.hasSlotController=new At(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(t){this.input.focus(t)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("help-text"),e=this.helpText?!0:!!t;return p`
      <div
        class=${M({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":e})}
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
            value=${y(this.value)}
            .indeterminate=${He(this.indeterminate)}
            .checked=${He(this.checked)}
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
            ${this.checked?p`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?p`
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
          aria-hidden=${e?"false":"true"}
          class="form-control__help-text"
          id="help-text"
          part="form-control-help-text"
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};U.styles=[N,Ze,Pa];U.dependencies={"sl-icon":Y};n([S('input[type="checkbox"]')],U.prototype,"input",2);n([v()],U.prototype,"hasFocus",2);n([l()],U.prototype,"title",2);n([l()],U.prototype,"name",2);n([l()],U.prototype,"value",2);n([l({reflect:!0})],U.prototype,"size",2);n([l({type:Boolean,reflect:!0})],U.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],U.prototype,"checked",2);n([l({type:Boolean,reflect:!0})],U.prototype,"indeterminate",2);n([Ii("checked")],U.prototype,"defaultChecked",2);n([l({reflect:!0})],U.prototype,"form",2);n([l({type:Boolean,reflect:!0})],U.prototype,"required",2);n([l({attribute:"help-text"})],U.prototype,"helpText",2);n([z("disabled",{waitUntilFirstUpdate:!0})],U.prototype,"handleDisabledChange",1);n([z(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],U.prototype,"handleStateChange",1);U.define("sl-checkbox");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Da=class extends Event{constructor(e,i,o,s){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i,this.callback=o,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ia{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,i=!1){const o=i||!Object.is(e,this.o);this.o=e,o&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:o}]of this.subscriptions)i(this.o,o)},e!==void 0&&(this.value=e)}addCallback(e,i,o){if(!o)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:i});const{disposer:s}=this.subscriptions.get(e);e(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Ra=class extends Event{constructor(e,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i}};class yo extends Ia{constructor(e,i,o){var s,r;super(i.context!==void 0?i.initialValue:o),this.onContextRequest=a=>{if(a.context!==this.context)return;const c=a.contextTarget??a.composedPath()[0];c!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,c,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const c=new Set;for(const[d,{consumerHost:h}]of this.subscriptions)c.has(d)||(c.add(d),h.dispatchEvent(new Da(this.context,h,d,!0)));a.stopPropagation()},this.host=e,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(r=(s=this.host).addController)==null||r.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Ra(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ma({context:t}){return(e,i)=>{const o=new WeakMap;if(typeof i=="object")return{get(){return e.get.call(this)},set(s){return o.get(this).setValue(s),e.set.call(this,s)},init(s){return o.set(this,new yo(this,{context:t,initialValue:s})),s}};{e.constructor.addInitializer(a=>{o.set(a,new yo(a,{context:t}))});const s=Object.getOwnPropertyDescriptor(e,i);let r;if(s===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(c){o.get(this).setValue(c),a.set(this,c)},configurable:!0,enumerable:!0}}else{const a=s.set;r={...s,set(c){o.get(this).setValue(c),a==null||a.call(this,c)}}}return void Object.defineProperty(e,i,r)}}}const Na=Symbol("board"),Ba={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};class Kt extends Error{constructor(e,i,o){super(e),this.status=i,this.body=o,this.name="ApiError"}}async function $t(t,e){const i=await fetch(t,e);if(!i.ok){const o=await i.text();throw new Kt(`API request failed: ${i.status} ${i.statusText}`,i.status,o)}return i.json()}function Zo(t,e){if(!e)return t;const i=new URLSearchParams;for(const[s,r]of Object.entries(e))r!==void 0&&i.set(s,r);const o=i.toString();return o?`${t}?${o}`:t}async function Fa(t){const e=Zo("/api/ticks",t);return(await $t(e)).ticks.map(o=>({...o,is_blocked:o.isBlocked}))}async function Va(t){return $t(`/api/ticks/${encodeURIComponent(t)}`)}async function Ha(t){return $t("/api/ticks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function Ua(t,e){return $t(`/api/ticks/${encodeURIComponent(t)}/close`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:e})})}async function ja(t,e){return $t(`/api/ticks/${encodeURIComponent(t)}/note`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e})})}async function qa(t){return $t(`/api/ticks/${encodeURIComponent(t)}/approve`,{method:"POST"})}async function Wa(t,e){return $t(`/api/ticks/${encodeURIComponent(t)}/reject`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({feedback:e})})}async function Ka(t){return $t(`/api/ticks/${encodeURIComponent(t)}/reopen`,{method:"POST"})}async function Ya(){return $t("/api/info")}async function Xa(t=20){const e=Zo("/api/activity",{limit:String(t)});return(await $t(e)).activities}var Ga=Object.defineProperty,Ja=Object.getOwnPropertyDescriptor,tt=(t,e,i,o)=>{for(var s=o>1?void 0:o?Ja(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ga(e,i,s),s};const wo=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}],Pt=["blocked","ready","agent","human","done"];let j=class extends it{constructor(){super(...arguments),this.boardState={...Ba},this.ticks=[],this.epics=[],this.repoName="",this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.selectedTick=null,this.loading=!0,this.error=null,this.focusedColumnIndex=-1,this.focusedTickIndex=-1,this.showKeyboardHelp=!1,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.eventSource=null,this.reconnectDelay=1e3,this.maxReconnectDelay=3e4,this.reconnectTimeout=null,this.handleKeyDown=t=>{if(!(this.loading||this.error||this.isInputFocused()))switch(this.showKeyboardHelp&&t.key!=="?"&&(this.showKeyboardHelp=!1),t.key){case"?":t.preventDefault(),this.showKeyboardHelp=!this.showKeyboardHelp;break;case"j":case"ArrowDown":t.preventDefault(),this.navigateVertical(1);break;case"k":case"ArrowUp":t.preventDefault(),this.navigateVertical(-1);break;case"h":case"ArrowLeft":t.preventDefault(),this.navigateHorizontal(-1);break;case"l":case"ArrowRight":t.preventDefault(),this.navigateHorizontal(1);break;case"Enter":t.preventDefault(),this.openFocusedTick();break;case"Escape":t.preventDefault(),this.handleEscape();break;case"n":t.preventDefault(),this.handleCreateClick();break;case"/":t.preventDefault(),this.focusSearchInput();break}},this.handleMediaChange=t=>{this.isMobile=t.matches,this.updateBoardState()}}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),document.addEventListener("keydown",this.handleKeyDown),this.loadData(),this.connectSSE()}async loadData(){this.loading=!0,this.error=null;try{const[t,e]=await Promise.all([Fa(),Ya()]);this.ticks=t,this.epics=e.epics,this.repoName=e.repoName,this.updateBoardState()}catch(t){this.error=t instanceof Error?t.message:"Failed to load data",console.error("Failed to load board data:",t)}finally{this.loading=!1}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange),document.removeEventListener("keydown",this.handleKeyDown),this.disconnectSSE()}connectSSE(){this.eventSource&&this.eventSource.close(),this.eventSource=new EventSource("/api/events"),this.eventSource.addEventListener("connected",()=>{this.reconnectDelay=1e3,console.log("[SSE] Connected to server")}),this.eventSource.addEventListener("update",t=>{try{const e=JSON.parse(t.data);this.handleRealtimeUpdate(e)}catch(e){console.error("[SSE] Failed to parse update:",e)}}),this.eventSource.onerror=()=>{var t;console.log("[SSE] Connection error, will reconnect..."),(t=this.eventSource)==null||t.close(),this.eventSource=null,this.scheduleReconnect()}}disconnectSSE(){this.reconnectTimeout&&(clearTimeout(this.reconnectTimeout),this.reconnectTimeout=null),this.eventSource&&(this.eventSource.close(),this.eventSource=null)}scheduleReconnect(){this.reconnectTimeout&&clearTimeout(this.reconnectTimeout),this.reconnectTimeout=setTimeout(()=>{console.log(`[SSE] Reconnecting after ${this.reconnectDelay}ms...`),this.connectSSE()},this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,this.maxReconnectDelay)}async handleRealtimeUpdate(t){const{type:e,tickId:i}=t;if(e==="activity"){window.dispatchEvent(new CustomEvent("activity-update"));return}if(!i){console.warn("[SSE] Received update without tickId:",t);return}switch(e){case"create":case"update":{try{const o=await Va(i),s={...o,is_blocked:o.isBlocked},r=this.ticks.findIndex(a=>a.id===i);r>=0?this.ticks=[...this.ticks.slice(0,r),s,...this.ticks.slice(r+1)]:s.type!=="epic"&&(this.ticks=[...this.ticks,s]),this.updateBoardState()}catch(o){console.error(`[SSE] Failed to fetch tick ${i}:`,o)}break}case"delete":{const o=this.ticks.findIndex(s=>s.id===i);o>=0&&(this.ticks=[...this.ticks.slice(0,o),...this.ticks.slice(o+1)],this.updateBoardState());break}default:console.warn("[SSE] Unknown update type:",e)}}isInputFocused(){const t=document.activeElement;if(!t)return!1;const e=t.tagName.toLowerCase();return!!(e==="input"||e==="textarea"||e==="select"||e.startsWith("sl-")&&(e.includes("input")||e.includes("textarea")||e.includes("select"))||t.getAttribute("contenteditable")==="true")}getFocusedColumnTicks(){return this.focusedColumnIndex<0||this.focusedColumnIndex>=Pt.length?[]:this.getColumnTicks(Pt[this.focusedColumnIndex])}initializeFocus(){for(let t=0;t<Pt.length;t++)if(this.getColumnTicks(Pt[t]).length>0){this.focusedColumnIndex=t,this.focusedTickIndex=0;return}this.focusedColumnIndex=0,this.focusedTickIndex=-1}clearFocus(){this.focusedColumnIndex=-1,this.focusedTickIndex=-1}navigateVertical(t){if(this.focusedColumnIndex<0){this.initializeFocus();return}const e=this.getFocusedColumnTicks();if(e.length===0)return;let i=this.focusedTickIndex+t;i<0?i=e.length-1:i>=e.length&&(i=0),this.focusedTickIndex=i}navigateHorizontal(t){if(this.focusedColumnIndex<0){this.initializeFocus();return}let e=this.focusedColumnIndex+t;e<0?e=Pt.length-1:e>=Pt.length&&(e=0),this.focusedColumnIndex=e;const i=this.getColumnTicks(Pt[e]);i.length===0?this.focusedTickIndex=-1:this.focusedTickIndex>=i.length?this.focusedTickIndex=i.length-1:this.focusedTickIndex<0&&(this.focusedTickIndex=0),this.isMobile&&(this.activeColumn=Pt[e],this.updateBoardState())}openFocusedTick(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return;const t=this.getFocusedColumnTicks();this.focusedTickIndex<t.length&&(this.selectedTick=t[this.focusedTickIndex])}handleEscape(){this.showKeyboardHelp?this.showKeyboardHelp=!1:this.selectedTick?this.selectedTick=null:this.clearFocus()}focusSearchInput(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("tick-header");if(t!=null&&t.shadowRoot){const i=t.shadowRoot.querySelector("sl-input");i&&i.focus()}}getFocusedTickId(){if(this.focusedColumnIndex<0||this.focusedTickIndex<0)return null;const t=this.getFocusedColumnTicks();return this.focusedTickIndex<t.length?t[this.focusedTickIndex].id:null}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(t){this.searchTerm=t.detail.value,this.updateBoardState()}handleEpicFilterChange(t){this.selectedEpic=t.detail.value,this.updateBoardState()}handleCreateClick(){console.log("Create tick clicked")}handleMenuToggle(){console.log("Menu toggle clicked")}handleActivityClick(t){const e=t.detail.tickId,i=this.ticks.find(o=>o.id===e);i?this.selectedTick=i:window.showToast&&window.showToast({message:`Tick ${e} not found in current view`,variant:"warning"})}handleTickSelected(t){this.selectedTick=t.detail.tick,console.log("Tick selected:",t.detail.tick.id)}handleMobileColumnChange(t){const e=t.target;this.activeColumn=e.value,this.updateBoardState()}getFilteredTicks(){let t=this.ticks;if(this.searchTerm){const e=this.searchTerm.toLowerCase();t=t.filter(i=>i.id.toLowerCase().includes(e)||i.title.toLowerCase().includes(e)||i.description&&i.description.toLowerCase().includes(e))}return this.selectedEpic&&(t=t.filter(e=>e.parent===this.selectedEpic)),t}getColumnTicks(t){return this.getFilteredTicks().filter(e=>e.column===t)}getEpicNames(){const t={};for(const e of this.epics)t[e.id]=e.title;return t}render(){if(this.loading)return p`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return p`
        <div class="error-state">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Failed to load board</strong><br>
            ${this.error}
          </sl-alert>
          <sl-button variant="primary" @click=${this.loadData}>Retry</sl-button>
        </div>
      `;const t=this.getEpicNames();return p`
      <tick-header
        repo-name=${this.repoName}
        .epics=${this.epics}
        selected-epic=${this.selectedEpic}
        search-term=${this.searchTerm}
        @search-change=${this.handleSearchChange}
        @epic-filter-change=${this.handleEpicFilterChange}
        @create-click=${this.handleCreateClick}
        @menu-toggle=${this.handleMenuToggle}
        @activity-click=${this.handleActivityClick}
      ></tick-header>

      <!-- Toast notification stack -->
      <tick-toast-stack></tick-toast-stack>

      <!-- Mobile column selector -->
      <div class="mobile-column-select">
        <sl-select .value=${this.activeColumn} @sl-change=${this.handleMobileColumnChange}>
          ${wo.map(e=>p`
            <sl-option value=${e.id}>
              ${e.icon} ${e.name} (${this.getColumnTicks(e.id).length})
            </sl-option>
          `)}
        </sl-select>
      </div>

      <main>
        <div class="kanban-board">
          ${wo.map((e,i)=>p`
            <tick-column
              class=${this.activeColumn===e.id?"mobile-active":""}
              name=${e.id}
              .ticks=${this.getColumnTicks(e.id)}
              .epicNames=${t}
              focused-tick-id=${this.focusedColumnIndex===i?this.getFocusedTickId()??"":""}
              @tick-selected=${this.handleTickSelected}
            ></tick-column>
          `)}
        </div>
      </main>

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
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
      </sl-dialog>
    `}};j.styles=A`
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
  `;tt([Ma({context:Na}),v()],j.prototype,"boardState",2);tt([v()],j.prototype,"ticks",2);tt([v()],j.prototype,"epics",2);tt([v()],j.prototype,"repoName",2);tt([v()],j.prototype,"selectedEpic",2);tt([v()],j.prototype,"searchTerm",2);tt([v()],j.prototype,"activeColumn",2);tt([v()],j.prototype,"isMobile",2);tt([v()],j.prototype,"selectedTick",2);tt([v()],j.prototype,"loading",2);tt([v()],j.prototype,"error",2);tt([v()],j.prototype,"focusedColumnIndex",2);tt([v()],j.prototype,"focusedTickIndex",2);tt([v()],j.prototype,"showKeyboardHelp",2);j=tt([Ht("tick-board")],j);var Za=Object.defineProperty,Qa=Object.getOwnPropertyDescriptor,de=(t,e,i,o)=>{for(var s=o>1?void 0:o?Qa(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Za(e,i,s),s};const xo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},tn={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let Bt=class extends it{constructor(){super(...arguments),this.selected=!1,this.focused=!1}updated(t){t.has("focused")&&this.focused&&this.cardElement&&this.cardElement.scrollIntoView({behavior:"smooth",block:"nearest"})}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return xo[this.tick.priority]??xo[2]}getPriorityLabel(){return tn[this.tick.priority]??"Unknown"}render(){const{tick:t,selected:e,focused:i,epicName:o}=this;return p`
      <div
        class="card ${e?"selected":""} ${i?"focused":""}"
        @click=${this.handleClick}
        role="button"
        tabindex=${i?"0":"-1"}
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
          ${t.is_blocked?p`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${t.manual?p`<span class="meta-badge manual">👤 manual</span>`:null}
          ${t.awaiting?p`<span class="meta-badge awaiting">⏳ ${t.awaiting}</span>`:null}
        </div>

        ${o?p`<div class="epic-name">${o}</div>`:null}
      </div>
    `}};Bt.styles=A`
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
  `;de([l({attribute:!1})],Bt.prototype,"tick",2);de([l({type:Boolean})],Bt.prototype,"selected",2);de([l({type:Boolean})],Bt.prototype,"focused",2);de([l({type:String,attribute:"epic-name"})],Bt.prototype,"epicName",2);de([S(".card")],Bt.prototype,"cardElement",2);Bt=de([Ht("tick-card")],Bt);var en=Object.defineProperty,on=Object.getOwnPropertyDescriptor,he=(t,e,i,o)=>{for(var s=o>1?void 0:o?on(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&en(e,i,s),s};const sn={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},rn={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},an={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let Ft=class extends it{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={},this.focusedTickId=""}getColumnColor(){return this.color||sn[this.name]||"var(--blue)"}getColumnDisplayName(){return rn[this.name]||this.name}getColumnIcon(){return an[this.name]||"•"}handleTickSelected(t){this.dispatchEvent(new CustomEvent("tick-selected",{detail:t.detail,bubbles:!0,composed:!0}))}render(){const t=this.getColumnColor(),e=this.getColumnDisplayName(),i=this.getColumnIcon(),o=this.ticks.length;return p`
      <div class="column-header-wrapper">
        <div class="header-bar" style="background-color: ${t}"></div>
        <div class="column-header">
          <span class="column-title">
            <span class="column-icon" style="color: ${t}">${i}</span>
            ${e}
          </span>
          <span class="column-count">${o}</span>
        </div>
      </div>

      <div class="column-content">
        ${o===0?p`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(s=>p`
                <tick-card
                  .tick=${s}
                  epic-name=${this.epicNames[s.parent||""]||""}
                  ?focused=${this.focusedTickId===s.id}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};Ft.styles=A`
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
  `;he([l({type:String})],Ft.prototype,"name",2);he([l({type:String})],Ft.prototype,"color",2);he([l({attribute:!1})],Ft.prototype,"ticks",2);he([l({type:Object,attribute:!1})],Ft.prototype,"epicNames",2);he([l({type:String,attribute:"focused-tick-id"})],Ft.prototype,"focusedTickId",2);Ft=he([Ht("tick-column")],Ft);var nn=Object.defineProperty,ln=Object.getOwnPropertyDescriptor,ue=(t,e,i,o)=>{for(var s=o>1?void 0:o?ln(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&nn(e,i,s),s};let Vt=class extends it{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.debounceTimeout=null}handleSearchInput(t){const i=t.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(t){const e=t.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:e.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}handleActivityClick(t){this.dispatchEvent(new CustomEvent("activity-click",{detail:t.detail,bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return p`
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
          ${this.repoName?p`<span class="repo-badge">${this.repoName}</span>`:null}
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
            ${this.epics.map(t=>p`
                <sl-option value=${t.id}>${t.title}</sl-option>
              `)}
          </sl-select>
        </div>

        <div class="header-right">
          <sl-tooltip content="Activity feed">
            <tick-activity-feed
              @activity-click=${this.handleActivityClick}
            ></tick-activity-feed>
          </sl-tooltip>

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
    `}};Vt.styles=A`
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
  `;ue([l({type:String,attribute:"repo-name"})],Vt.prototype,"repoName",2);ue([l({attribute:!1})],Vt.prototype,"epics",2);ue([l({type:String,attribute:"selected-epic"})],Vt.prototype,"selectedEpic",2);ue([l({type:String,attribute:"search-term"})],Vt.prototype,"searchTerm",2);ue([v()],Vt.prototype,"debounceTimeout",2);Vt=ue([Ht("tick-header")],Vt);var cn=Object.defineProperty,dn=Object.getOwnPropertyDescriptor,J=(t,e,i,o)=>{for(var s=o>1?void 0:o?dn(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&cn(e,i,s),s};const hn={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},ko={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let H=class extends it{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[],this.loading=!1,this.errorMessage="",this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}handleDrawerHide(){this.resetActionState(),this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}updated(t){t.has("tick")&&this.resetActionState()}handleTickLinkClick(t){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:t},bubbles:!0,composed:!0}))}resetActionState(){this.showRejectInput=!1,this.showCloseInput=!1,this.rejectReason="",this.closeReason="",this.errorMessage="",this.newNoteText="",this.addingNote=!1,this.addNoteError="",this.optimisticNote=null}emitTickUpdated(t){this.dispatchEvent(new CustomEvent("tick-updated",{detail:{tick:t},bubbles:!0,composed:!0}))}async handleApprove(){if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await qa(this.tick.id),e={...t,is_blocked:t.isBlocked};this.emitTickUpdated(e),this.resetActionState()}catch(t){t instanceof Kt?this.errorMessage=t.body||t.message:this.errorMessage="Failed to approve tick"}finally{this.loading=!1}}}handleRejectClick(){this.showRejectInput=!0,this.showCloseInput=!1}handleRejectCancel(){this.showRejectInput=!1,this.rejectReason=""}async handleRejectConfirm(){if(!(!this.tick||!this.rejectReason.trim())){this.loading=!0,this.errorMessage="";try{const t=await Wa(this.tick.id,this.rejectReason.trim()),e={...t,is_blocked:t.isBlocked};this.emitTickUpdated(e),this.resetActionState()}catch(t){t instanceof Kt?this.errorMessage=t.body||t.message:this.errorMessage="Failed to reject tick"}finally{this.loading=!1}}}handleCloseClick(){this.showCloseInput=!0,this.showRejectInput=!1}handleCloseCancel(){this.showCloseInput=!1,this.closeReason=""}async handleCloseConfirm(){if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ua(this.tick.id,this.closeReason.trim()||void 0),e={...t,is_blocked:t.isBlocked};this.emitTickUpdated(e),this.resetActionState()}catch(t){t instanceof Kt?this.errorMessage=t.body||t.message:this.errorMessage="Failed to close tick"}finally{this.loading=!1}}}async handleReopen(){if(this.tick){this.loading=!0,this.errorMessage="";try{const t=await Ka(this.tick.id),e={...t,is_blocked:t.isBlocked};this.emitTickUpdated(e),this.resetActionState()}catch(t){t instanceof Kt?this.errorMessage=t.body||t.message:this.errorMessage="Failed to reopen tick"}finally{this.loading=!1}}}async handleAddNote(){if(!this.tick||!this.newNoteText.trim())return;const t=this.newNoteText.trim();this.addingNote=!0,this.addNoteError="",this.optimisticNote={timestamp:new Date().toISOString(),author:"You",text:t},this.newNoteText="";try{const e=await ja(this.tick.id,t);this.notesList=e.notesList,this.optimisticNote=null;const i={...e,is_blocked:e.isBlocked};this.emitTickUpdated(i)}catch(e){this.optimisticNote=null,this.newNoteText=t,e instanceof Kt?this.addNoteError=e.body||e.message:this.addNoteError="Failed to add note"}finally{this.addingNote=!1}}formatTimestamp(t){return new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(t){return hn[t]??"Unknown"}getPriorityColor(t){return ko[t]??ko[2]}renderActions(){const t=this.tick;if(!t)return w;const e=t.status==="open",i=t.status==="closed",o=!!t.awaiting,s=!!t.requires,r=e&&o,a=e&&!s,c=i;return!r&&!a&&!c?w:p`
      <div class="section">
        <div class="section-title">Actions</div>

        ${this.errorMessage?p`
              <sl-alert variant="danger" open class="error-alert">
                <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                ${this.errorMessage}
              </sl-alert>
            `:w}

        <div class="actions-section">
          ${r?p`
                <sl-button
                  variant="success"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleApprove}
                >
                  <sl-icon slot="prefix" name="check-lg"></sl-icon>
                  Approve
                </sl-button>
                <sl-button
                  variant="danger"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleRejectClick}
                >
                  <sl-icon slot="prefix" name="x-lg"></sl-icon>
                  Reject
                </sl-button>
              `:w}
          ${a?p`
                <sl-button
                  variant="neutral"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleCloseClick}
                >
                  <sl-icon slot="prefix" name="check-circle"></sl-icon>
                  Close
                </sl-button>
              `:w}
          ${c?p`
                <sl-button
                  variant="primary"
                  size="small"
                  ?loading=${this.loading}
                  ?disabled=${this.loading}
                  @click=${this.handleReopen}
                >
                  <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                  Reopen
                </sl-button>
              `:w}
        </div>

        ${this.showRejectInput?p`
              <div class="reason-container">
                <span class="reason-label">Rejection reason (required)</span>
                <sl-textarea
                  placeholder="Explain why this is being rejected..."
                  rows="2"
                  .value=${this.rejectReason}
                  @sl-input=${d=>{this.rejectReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <sl-button
                    variant="danger"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading||!this.rejectReason.trim()}
                    @click=${this.handleRejectConfirm}
                  >
                    Confirm Reject
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?disabled=${this.loading}
                    @click=${this.handleRejectCancel}
                  >
                    Cancel
                  </sl-button>
                </div>
              </div>
            `:w}

        ${this.showCloseInput?p`
              <div class="reason-container">
                <span class="reason-label">Close reason (optional)</span>
                <sl-textarea
                  placeholder="Add a reason for closing..."
                  rows="2"
                  .value=${this.closeReason}
                  @sl-input=${d=>{this.closeReason=d.target.value}}
                ></sl-textarea>
                <div class="reason-buttons">
                  <sl-button
                    variant="neutral"
                    size="small"
                    ?loading=${this.loading}
                    ?disabled=${this.loading}
                    @click=${this.handleCloseConfirm}
                  >
                    Confirm Close
                  </sl-button>
                  <sl-button
                    variant="neutral"
                    size="small"
                    outline
                    ?disabled=${this.loading}
                    @click=${this.handleCloseCancel}
                  >
                    Cancel
                  </sl-button>
                </div>
              </div>
            `:w}
      </div>

      <sl-divider></sl-divider>
    `}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?p`<span class="empty-text">None</span>`:p`
      <ul class="link-list">
        ${this.blockerDetails.map(t=>p`
            <li>
              <a
                class="tick-link status-${t.status}"
                @click=${()=>this.handleTickLinkClick(t.id)}
              >
                <span class="link-id">${t.id}</span>
                <span class="link-title">${t.title}</span>
              </a>
            </li>
          `)}
      </ul>
    `}renderParent(){var t;return(t=this.tick)!=null&&t.parent?p`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?p`<span class="link-title">${this.parentTitle}</span>`:w}
      </a>
    `:p`<span class="empty-text">None</span>`}renderLabels(){var t;return!((t=this.tick)!=null&&t.labels)||this.tick.labels.length===0?p`<span class="empty-text">None</span>`:p`
      <div class="labels-container">
        ${this.tick.labels.map(e=>p`<span class="label-badge">${e}</span>`)}
      </div>
    `}renderNoteItem(t,e=!1){return p`
      <li class="note-item ${e?"note-optimistic":""}">
        <div class="note-header">
          <span class="note-author">${t.author??"Unknown"}</span>
          ${t.timestamp?p`<span class="note-timestamp"
                >${this.formatTimestamp(t.timestamp)}</span
              >`:w}
        </div>
        <div class="note-text">${t.text}</div>
        ${e?p`<div class="note-sending">Sending...</div>`:w}
      </li>
    `}renderNotes(){const t=this.notesList&&this.notesList.length>0||this.optimisticNote;return p`
      ${t?p`
            <div class="notes-scroll">
              <ul class="notes-list">
                ${this.notesList.map(e=>this.renderNoteItem(e))}
                ${this.optimisticNote?this.renderNoteItem(this.optimisticNote,!0):w}
              </ul>
            </div>
          `:p`<span class="empty-text">No notes yet</span>`}

      <!-- Add note error -->
      ${this.addNoteError?p`
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
          @sl-input=${e=>{this.newNoteText=e.target.value}}
          @keydown=${e=>{e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&(e.preventDefault(),this.handleAddNote())}}
        ></sl-textarea>
        <div class="add-note-actions">
          <span class="add-note-hint">Ctrl+Enter to send</span>
          <sl-button
            variant="primary"
            size="small"
            ?loading=${this.addingNote}
            ?disabled=${this.addingNote||!this.newNoteText.trim()}
            @click=${this.handleAddNote}
          >
            <sl-icon slot="prefix" name="chat-left-text"></sl-icon>
            Add Note
          </sl-button>
        </div>
      </div>
    `}render(){const t=this.tick;return p`
      <sl-drawer
        label=${t?`${t.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${t?p`
              <div class="drawer-content">
                <!-- Header: ID and Title -->
                <div class="section">
                  <div class="tick-id">${t.id}</div>
                  <h2 class="tick-title">${t.title}</h2>

                  <!-- Status badges row -->
                  <div class="meta-row">
                    <span class="meta-badge type-badge type-${t.type}"
                      >${t.type}</span
                    >
                    <span class="meta-badge status-${t.status}"
                      >${t.status.replace("_"," ")}</span
                    >
                    <span
                      class="meta-badge priority"
                      style="--priority-color: ${this.getPriorityColor(t.priority)}"
                    >
                      ${this.getPriorityLabel(t.priority)}
                    </span>
                    ${t.manual?p`<span class="meta-badge manual">👤 Manual</span>`:w}
                    ${t.awaiting?p`<span class="meta-badge awaiting"
                          >⏳ ${t.awaiting}</span
                        >`:w}
                    ${t.verdict?p`<span
                          class="meta-badge verdict-${t.verdict}"
                          >${t.verdict}</span
                        >`:w}
                    ${this.blockerDetails&&this.blockerDetails.length>0?p`<span class="meta-badge blocked">⊘ Blocked</span>`:w}
                  </div>
                </div>

                <!-- Actions (approve/reject/close/reopen) -->
                ${this.renderActions()}

                <!-- Description -->
                <div class="section">
                  <div class="section-title">Description</div>
                  ${t.description?p`<div class="description">${t.description}</div>`:p`<span class="empty-text">No description</span>`}
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
                      >${this.formatTimestamp(t.created_at)}</span
                    >
                  </div>
                  <div class="timestamp-row" style="margin-top: 0.375rem">
                    <span class="timestamp-label">Updated</span>
                    <span class="timestamp-value"
                      >${this.formatTimestamp(t.updated_at)}</span
                    >
                  </div>
                  ${t.closed_at?p`
                        <div class="timestamp-row" style="margin-top: 0.375rem">
                          <span class="timestamp-label">Closed</span>
                          <span class="timestamp-value"
                            >${this.formatTimestamp(t.closed_at)}</span
                          >
                        </div>
                      `:w}
                </div>

                <!-- Closed Reason (if applicable) -->
                ${t.closed_reason?p`
                      <div class="section">
                        <div class="section-title">Closed Reason</div>
                        <div class="description">${t.closed_reason}</div>
                      </div>
                    `:w}
              </div>
            `:p`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};H.styles=A`
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
        width: 100%;
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
  `;J([l({attribute:!1})],H.prototype,"tick",2);J([l({type:Boolean})],H.prototype,"open",2);J([l({attribute:!1})],H.prototype,"notesList",2);J([l({attribute:!1})],H.prototype,"blockerDetails",2);J([l({type:String,attribute:"parent-title"})],H.prototype,"parentTitle",2);J([v()],H.prototype,"loading",2);J([v()],H.prototype,"errorMessage",2);J([v()],H.prototype,"showRejectInput",2);J([v()],H.prototype,"showCloseInput",2);J([v()],H.prototype,"rejectReason",2);J([v()],H.prototype,"closeReason",2);J([v()],H.prototype,"newNoteText",2);J([v()],H.prototype,"addingNote",2);J([v()],H.prototype,"addNoteError",2);J([v()],H.prototype,"optimisticNote",2);H=J([Ht("tick-detail-drawer")],H);var un=Object.defineProperty,pn=Object.getOwnPropertyDescriptor,lt=(t,e,i,o)=>{for(var s=o>1?void 0:o?pn(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&un(e,i,s),s};const fn=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],mn=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let Q=class extends it{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1,this.error=null,this.loading=!1}handleDialogRequestClose(t){if(this.loading){t.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(t){const e=t.target;this.tickTitle=e.value}handleDescriptionInput(t){const e=t.target;this.tickDescription=e.value}handleTypeChange(t){const e=t.target;this.type=e.value}handlePriorityChange(t){const e=t.target;this.priority=parseInt(e.value,10)}handleParentChange(t){const e=t.target;this.parent=e.value}handleLabelsInput(t){const e=t.target;this.labels=e.value}handleManualChange(t){const e=t.target;this.manual=e.checked}async handleSubmit(){var e;if(!this.tickTitle.trim()){this.error="Title is required",(e=this.titleInput)==null||e.focus();return}this.loading=!0,this.error=null;const t={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(t.description=this.tickDescription.trim()),this.parent&&(t.parent=this.parent);try{const i=await Ha(t);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(o=>o.trim()).filter(Boolean):[],manual:this.manual},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof Kt?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return p`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?p`<div class="error-message">${this.error}</div>`:w}

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
              ${fn.map(t=>p`
                  <sl-option value=${t.value}>${t.label}</sl-option>
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
              ${mn.map(t=>p`
                  <sl-option value=${String(t.value)}>${t.label}</sl-option>
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
            ${this.epics.map(t=>p`
                <sl-option value=${t.id}>${t.title}</sl-option>
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
          <sl-button
            variant="neutral"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </sl-button>
          <sl-button
            variant="primary"
            @click=${this.handleSubmit}
            ?loading=${this.loading}
          >
            Create
          </sl-button>
        </div>
      </sl-dialog>
    `}};Q.styles=A`
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
  `;lt([l({type:Boolean})],Q.prototype,"open",2);lt([l({type:Array,attribute:!1})],Q.prototype,"epics",2);lt([v()],Q.prototype,"loading",2);lt([v()],Q.prototype,"error",2);lt([v()],Q.prototype,"tickTitle",2);lt([v()],Q.prototype,"tickDescription",2);lt([v()],Q.prototype,"type",2);lt([v()],Q.prototype,"priority",2);lt([v()],Q.prototype,"parent",2);lt([v()],Q.prototype,"labels",2);lt([v()],Q.prototype,"manual",2);lt([S('sl-input[name="title"]')],Q.prototype,"titleInput",2);Q=lt([Ht("tick-create-dialog")],Q);var bn=Object.defineProperty,gn=Object.getOwnPropertyDescriptor,Qo=(t,e,i,o)=>{for(var s=o>1?void 0:o?gn(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&bn(e,i,s),s};const vn=5e3;let yn=0;function wn(){return`toast-${++yn}-${Date.now()}`}let Ke=class extends it{constructor(){super(...arguments),this.toasts=[],this.dismissTimeouts=new Map,this.exitingToasts=new Set,this.handleShowToastEvent=t=>{this.showToast(t.detail)}}connectedCallback(){super.connectedCallback(),window.addEventListener("show-toast",this.handleShowToastEvent),this.exposeGlobalApi()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("show-toast",this.handleShowToastEvent);for(const t of this.dismissTimeouts.values())clearTimeout(t);this.dismissTimeouts.clear(),this.removeGlobalApi()}exposeGlobalApi(){window.showToast=t=>{this.showToast(t)}}removeGlobalApi(){delete window.showToast}showToast(t){const e={id:wn(),message:t.message,variant:t.variant??"primary",duration:t.duration??vn};if(this.toasts=[...this.toasts,e],e.duration>0){const i=setTimeout(()=>{this.dismissToast(e.id)},e.duration);this.dismissTimeouts.set(e.id,i)}}dismissToast(t){const e=this.dismissTimeouts.get(t);e&&(clearTimeout(e),this.dismissTimeouts.delete(t)),this.exitingToasts.add(t),this.requestUpdate(),setTimeout(()=>{this.exitingToasts.delete(t),this.toasts=this.toasts.filter(i=>i.id!==t)},300)}handleCloseRequest(t){this.dismissToast(t)}getIconForVariant(t){switch(t){case"success":return"check-circle";case"warning":return"exclamation-triangle";case"danger":return"exclamation-octagon";case"primary":default:return"info-circle"}}render(){return p`
      ${this.toasts.map(t=>p`
        <div class="toast-container ${this.exitingToasts.has(t.id)?"exiting":""}">
          <sl-alert
            variant=${t.variant}
            open
            closable
            @sl-after-hide=${()=>this.handleCloseRequest(t.id)}
          >
            <sl-icon slot="icon" name=${this.getIconForVariant(t.variant)}></sl-icon>
            ${t.message}
          </sl-alert>
        </div>
      `)}
    `}};Ke.styles=A`
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
  `;Qo([v()],Ke.prototype,"toasts",2);Ke=Qo([Ht("tick-toast-stack")],Ke);var xn=Object.defineProperty,kn=Object.getOwnPropertyDescriptor,Le=(t,e,i,o)=>{for(var s=o>1?void 0:o?kn(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&xn(e,i,s),s};let Zt=class extends it{constructor(){super(...arguments),this.activities=[],this.loading=!0,this.unreadCount=0,this.lastSeenTimestamp=null,this.pollInterval=null,this.sseListener=null}connectedCallback(){super.connectedCallback(),this.loadLastSeenTimestamp(),this.loadActivities(),this.startPolling(),this.listenForSSE()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.stopSSEListener()}loadLastSeenTimestamp(){try{this.lastSeenTimestamp=localStorage.getItem("activity-last-seen")}catch{}}saveLastSeenTimestamp(){if(this.activities.length>0){const t=this.activities[0].ts;try{localStorage.setItem("activity-last-seen",t),this.lastSeenTimestamp=t}catch{}}}async loadActivities(){try{this.activities=await Xa(20),this.updateUnreadCount()}catch(t){console.error("Failed to load activities:",t)}finally{this.loading=!1}}updateUnreadCount(){if(!this.lastSeenTimestamp){this.unreadCount=this.activities.length;return}this.unreadCount=this.activities.filter(t=>t.ts>this.lastSeenTimestamp).length}startPolling(){this.pollInterval=setInterval(()=>{this.loadActivities()},3e4)}stopPolling(){this.pollInterval&&(clearInterval(this.pollInterval),this.pollInterval=null)}listenForSSE(){this.sseListener=()=>{this.loadActivities()},window.addEventListener("activity-update",this.sseListener)}stopSSEListener(){this.sseListener&&(window.removeEventListener("activity-update",this.sseListener),this.sseListener=null)}handleDropdownShow(){this.saveLastSeenTimestamp(),this.unreadCount=0}handleActivityClick(t){this.dispatchEvent(new CustomEvent("activity-click",{detail:{tickId:t.tick},bubbles:!0,composed:!0}))}getActionIcon(t){return{create:"+",update:"~",close:"×",reopen:"↺",note:"✎",approve:"✓",reject:"✗",assign:"→",awaiting:"⏳",block:"⊘",unblock:"⊙"}[t]||"•"}getActionDescription(t){const e=t.action,i=t.actor,o=t.data||{};switch(e){case"create":return`${i} created this tick`;case"update":return`${i} updated this tick`;case"close":return o.reason?`${i} closed: ${o.reason}`:`${i} closed this tick`;case"reopen":return`${i} reopened this tick`;case"note":return`${i} added a note`;case"approve":return`${i} approved this tick`;case"reject":return`${i} rejected this tick`;case"assign":return`${i} assigned to ${o.to||"someone"}`;case"awaiting":return`Waiting for ${o.awaiting||"human action"}`;case"block":return`${i} added a blocker`;case"unblock":return`${i} removed a blocker`;default:return`${i} performed ${e}`}}formatRelativeTime(t){const e=new Date(t),o=new Date().getTime()-e.getTime(),s=Math.floor(o/1e3),r=Math.floor(s/60),a=Math.floor(r/60),c=Math.floor(a/24);return s<60?"just now":r<60?`${r}m ago`:a<24?`${a}h ago`:c<7?`${c}d ago`:e.toLocaleDateString()}isUnread(t){return this.lastSeenTimestamp?t.ts>this.lastSeenTimestamp:!0}render(){return p`
      <sl-dropdown @sl-show=${this.handleDropdownShow}>
        <div slot="trigger" class="trigger-button">
          <sl-button variant="text" size="small">
            <sl-icon name="bell"></sl-icon>
          </sl-button>
          ${this.unreadCount>0?p`<span class="unread-badge">${this.unreadCount>9?"9+":this.unreadCount}</span>`:w}
        </div>

        <sl-menu>
          <div class="menu-header">
            <span>Activity</span>
            ${this.activities.length>0?p`
                  <sl-button size="small" variant="text" @click=${this.loadActivities}>
                    <sl-icon name="arrow-clockwise"></sl-icon>
                  </sl-button>
                `:w}
          </div>

          ${this.loading?p`<div class="loading-state">Loading...</div>`:this.activities.length===0?p`<div class="empty-state">No recent activity</div>`:this.activities.map(t=>p`
                    <sl-menu-item @click=${()=>this.handleActivityClick(t)}>
                      <div class="activity-item ${this.isUnread(t)?"unread":""}">
                        <div class="activity-icon ${t.action}">
                          ${this.getActionIcon(t.action)}
                        </div>
                        <div class="activity-content">
                          <div class="activity-title">
                            <span class="tick-id">${t.tick}</span>
                          </div>
                          <div class="activity-description">
                            ${this.getActionDescription(t)}
                          </div>
                          <div class="activity-time">
                            ${this.formatRelativeTime(t.ts)}
                          </div>
                        </div>
                      </div>
                    </sl-menu-item>
                  `)}
        </sl-menu>
      </sl-dropdown>
    `}};Zt.styles=A`
    :host {
      display: inline-block;
    }

    .trigger-button {
      position: relative;
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
      min-width: 320px;
      max-width: 400px;
      max-height: 400px;
      overflow-y: auto;
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

    .menu-header sl-button::part(base) {
      font-size: 0.75rem;
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
  `;Le([v()],Zt.prototype,"activities",2);Le([v()],Zt.prototype,"loading",2);Le([v()],Zt.prototype,"unreadCount",2);Le([v()],Zt.prototype,"lastSeenTimestamp",2);Zt=Le([Ht("tick-activity-feed")],Zt);vi("/shoelace");
