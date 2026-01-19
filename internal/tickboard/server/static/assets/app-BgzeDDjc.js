(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ze=globalThis,wi=ze.ShadowRoot&&(ze.ShadyCSS===void 0||ze.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,xi=Symbol(),Fi=new WeakMap;let yo=class{constructor(e,i,o){if(this._$cssResult$=!0,o!==xi)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=i}get styleSheet(){let e=this.o;const i=this.t;if(wi&&e===void 0){const o=i!==void 0&&i.length===1;o&&(e=Fi.get(i)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),o&&Fi.set(i,e))}return e}toString(){return this.cssText}};const Xo=t=>new yo(typeof t=="string"?t:t+"",void 0,xi),L=(t,...e)=>{const i=t.length===1?t[0]:e.reduce((o,s,r)=>o+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[r+1],t[0]);return new yo(i,t,xi)},Go=(t,e)=>{if(wi)t.adoptedStyleSheets=e.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of e){const o=document.createElement("style"),s=ze.litNonce;s!==void 0&&o.setAttribute("nonce",s),o.textContent=i.cssText,t.appendChild(o)}},Ni=wi?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let i="";for(const o of e.cssRules)i+=o.cssText;return Xo(i)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Zo,defineProperty:Qo,getOwnPropertyDescriptor:Jo,getOwnPropertyNames:ts,getOwnPropertySymbols:es,getPrototypeOf:is}=Object,Ot=globalThis,Vi=Ot.trustedTypes,os=Vi?Vi.emptyScript:"",Je=Ot.reactiveElementPolyfillSupport,pe=(t,e)=>t,Zt={toAttribute(t,e){switch(e){case Boolean:t=t?os:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=t!==null;break;case Number:i=t===null?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch{i=null}}return i}},_i=(t,e)=>!Zo(t,e),Hi={attribute:!0,type:String,converter:Zt,reflect:!1,useDefault:!1,hasChanged:_i};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),Ot.litPropertyMetadata??(Ot.litPropertyMetadata=new WeakMap);let Yt=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,i=Hi){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(e,i),!i.noAccessor){const o=Symbol(),s=this.getPropertyDescriptor(e,o,i);s!==void 0&&Qo(this.prototype,e,s)}}static getPropertyDescriptor(e,i,o){const{get:s,set:r}=Jo(this.prototype,e)??{get(){return this[i]},set(a){this[i]=a}};return{get:s,set(a){const c=s==null?void 0:s.call(this);r==null||r.call(this,a),this.requestUpdate(e,c,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Hi}static _$Ei(){if(this.hasOwnProperty(pe("elementProperties")))return;const e=is(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(pe("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(pe("properties"))){const i=this.properties,o=[...ts(i),...es(i)];for(const s of o)this.createProperty(s,i[s])}const e=this[Symbol.metadata];if(e!==null){const i=litPropertyMetadata.get(e);if(i!==void 0)for(const[o,s]of i)this.elementProperties.set(o,s)}this._$Eh=new Map;for(const[i,o]of this.elementProperties){const s=this._$Eu(i,o);s!==void 0&&this._$Eh.set(s,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const i=[];if(Array.isArray(e)){const o=new Set(e.flat(1/0).reverse());for(const s of o)i.unshift(Ni(s))}else e!==void 0&&i.push(Ni(e));return i}static _$Eu(e,i){const o=i.attribute;return o===!1?void 0:typeof o=="string"?o:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(i=>i(this))}addController(e){var i;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((i=e.hostConnected)==null||i.call(e))}removeController(e){var i;(i=this._$EO)==null||i.delete(e)}_$E_(){const e=new Map,i=this.constructor.elementProperties;for(const o of i.keys())this.hasOwnProperty(o)&&(e.set(o,this[o]),delete this[o]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Go(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(i=>{var o;return(o=i.hostConnected)==null?void 0:o.call(i)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(i=>{var o;return(o=i.hostDisconnected)==null?void 0:o.call(i)})}attributeChangedCallback(e,i,o){this._$AK(e,o)}_$ET(e,i){var r;const o=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,o);if(s!==void 0&&o.reflect===!0){const a=(((r=o.converter)==null?void 0:r.toAttribute)!==void 0?o.converter:Zt).toAttribute(i,o.type);this._$Em=e,a==null?this.removeAttribute(s):this.setAttribute(s,a),this._$Em=null}}_$AK(e,i){var r,a;const o=this.constructor,s=o._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const c=o.getPropertyOptions(s),d=typeof c.converter=="function"?{fromAttribute:c.converter}:((r=c.converter)==null?void 0:r.fromAttribute)!==void 0?c.converter:Zt;this._$Em=s;const u=d.fromAttribute(i,c.type);this[s]=u??((a=this._$Ej)==null?void 0:a.get(s))??u,this._$Em=null}}requestUpdate(e,i,o,s=!1,r){var a;if(e!==void 0){const c=this.constructor;if(s===!1&&(r=this[e]),o??(o=c.getPropertyOptions(e)),!((o.hasChanged??_i)(r,i)||o.useDefault&&o.reflect&&r===((a=this._$Ej)==null?void 0:a.get(e))&&!this.hasAttribute(c._$Eu(e,o))))return;this.C(e,i,o)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,i,{useDefault:o,reflect:s,wrapped:r},a){o&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,a??i??this[e]),r!==!0||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||o||(i=void 0),this._$AL.set(e,i)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var o;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,a]of this._$Ep)this[r]=a;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[r,a]of s){const{wrapped:c}=a,d=this[r];c!==!0||this._$AL.has(r)||d===void 0||this.C(r,void 0,a,d)}}let e=!1;const i=this._$AL;try{e=this.shouldUpdate(i),e?(this.willUpdate(i),(o=this._$EO)==null||o.forEach(s=>{var r;return(r=s.hostUpdate)==null?void 0:r.call(s)}),this.update(i)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(i)}willUpdate(e){}_$AE(e){var i;(i=this._$EO)==null||i.forEach(o=>{var s;return(s=o.hostUpdated)==null?void 0:s.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(e){}firstUpdated(e){}};Yt.elementStyles=[],Yt.shadowRootOptions={mode:"open"},Yt[pe("elementProperties")]=new Map,Yt[pe("finalized")]=new Map,Je==null||Je({ReactiveElement:Yt}),(Ot.reactiveElementVersions??(Ot.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const fe=globalThis,Ui=t=>t,De=fe.trustedTypes,ji=De?De.createPolicy("lit-html",{createHTML:t=>t}):void 0,wo="$lit$",zt=`lit$${Math.random().toFixed(9).slice(2)}$`,xo="?"+zt,ss=`<${xo}>`,Ut=document,ve=()=>Ut.createComment(""),ye=t=>t===null||typeof t!="object"&&typeof t!="function",ki=Array.isArray,rs=t=>ki(t)||typeof(t==null?void 0:t[Symbol.iterator])=="function",ti=`[ 	
\f\r]`,ne=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,qi=/-->/g,Wi=/>/g,Bt=RegExp(`>|${ti}(?:([^\\s"'>=/]+)(${ti}*=${ti}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Ki=/'/g,Yi=/"/g,_o=/^(?:script|style|textarea|title)$/i,as=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),f=as(1),at=Symbol.for("lit-noChange"),C=Symbol.for("lit-nothing"),Xi=new WeakMap,Vt=Ut.createTreeWalker(Ut,129);function ko(t,e){if(!ki(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return ji!==void 0?ji.createHTML(e):e}const ns=(t,e)=>{const i=t.length-1,o=[];let s,r=e===2?"<svg>":e===3?"<math>":"",a=ne;for(let c=0;c<i;c++){const d=t[c];let u,h,p=-1,b=0;for(;b<d.length&&(a.lastIndex=b,h=a.exec(d),h!==null);)b=a.lastIndex,a===ne?h[1]==="!--"?a=qi:h[1]!==void 0?a=Wi:h[2]!==void 0?(_o.test(h[2])&&(s=RegExp("</"+h[2],"g")),a=Bt):h[3]!==void 0&&(a=Bt):a===Bt?h[0]===">"?(a=s??ne,p=-1):h[1]===void 0?p=-2:(p=a.lastIndex-h[2].length,u=h[1],a=h[3]===void 0?Bt:h[3]==='"'?Yi:Ki):a===Yi||a===Ki?a=Bt:a===qi||a===Wi?a=ne:(a=Bt,s=void 0);const m=a===Bt&&t[c+1].startsWith("/>")?" ":"";r+=a===ne?d+ss:p>=0?(o.push(u),d.slice(0,p)+wo+d.slice(p)+zt+m):d+zt+(p===-2?c:m)}return[ko(t,r+(t[i]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),o]};class we{constructor({strings:e,_$litType$:i},o){let s;this.parts=[];let r=0,a=0;const c=e.length-1,d=this.parts,[u,h]=ns(e,i);if(this.el=we.createElement(u,o),Vt.currentNode=this.el.content,i===2||i===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(s=Vt.nextNode())!==null&&d.length<c;){if(s.nodeType===1){if(s.hasAttributes())for(const p of s.getAttributeNames())if(p.endsWith(wo)){const b=h[a++],m=s.getAttribute(p).split(zt),g=/([.?@])?(.*)/.exec(b);d.push({type:1,index:r,name:g[2],strings:m,ctor:g[1]==="."?cs:g[1]==="?"?ds:g[1]==="@"?us:Ve}),s.removeAttribute(p)}else p.startsWith(zt)&&(d.push({type:6,index:r}),s.removeAttribute(p));if(_o.test(s.tagName)){const p=s.textContent.split(zt),b=p.length-1;if(b>0){s.textContent=De?De.emptyScript:"";for(let m=0;m<b;m++)s.append(p[m],ve()),Vt.nextNode(),d.push({type:2,index:++r});s.append(p[b],ve())}}}else if(s.nodeType===8)if(s.data===xo)d.push({type:2,index:r});else{let p=-1;for(;(p=s.data.indexOf(zt,p+1))!==-1;)d.push({type:7,index:r}),p+=zt.length-1}r++}}static createElement(e,i){const o=Ut.createElement("template");return o.innerHTML=e,o}}function Qt(t,e,i=t,o){var a,c;if(e===at)return e;let s=o!==void 0?(a=i._$Co)==null?void 0:a[o]:i._$Cl;const r=ye(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==r&&((c=s==null?void 0:s._$AO)==null||c.call(s,!1),r===void 0?s=void 0:(s=new r(t),s._$AT(t,i,o)),o!==void 0?(i._$Co??(i._$Co=[]))[o]=s:i._$Cl=s),s!==void 0&&(e=Qt(t,s._$AS(t,e.values),s,o)),e}class ls{constructor(e,i){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:i},parts:o}=this._$AD,s=((e==null?void 0:e.creationScope)??Ut).importNode(i,!0);Vt.currentNode=s;let r=Vt.nextNode(),a=0,c=0,d=o[0];for(;d!==void 0;){if(a===d.index){let u;d.type===2?u=new _e(r,r.nextSibling,this,e):d.type===1?u=new d.ctor(r,d.name,d.strings,this,e):d.type===6&&(u=new hs(r,this,e)),this._$AV.push(u),d=o[++c]}a!==(d==null?void 0:d.index)&&(r=Vt.nextNode(),a++)}return Vt.currentNode=Ut,s}p(e){let i=0;for(const o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(e,o,i),i+=o.strings.length-2):o._$AI(e[i])),i++}}class _e{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,i,o,s){this.type=2,this._$AH=C,this._$AN=void 0,this._$AA=e,this._$AB=i,this._$AM=o,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=i.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,i=this){e=Qt(this,e,i),ye(e)?e===C||e==null||e===""?(this._$AH!==C&&this._$AR(),this._$AH=C):e!==this._$AH&&e!==at&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):rs(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==C&&ye(this._$AH)?this._$AA.nextSibling.data=e:this.T(Ut.createTextNode(e)),this._$AH=e}$(e){var r;const{values:i,_$litType$:o}=e,s=typeof o=="number"?this._$AC(e):(o.el===void 0&&(o.el=we.createElement(ko(o.h,o.h[0]),this.options)),o);if(((r=this._$AH)==null?void 0:r._$AD)===s)this._$AH.p(i);else{const a=new ls(s,this),c=a.u(this.options);a.p(i),this.T(c),this._$AH=a}}_$AC(e){let i=Xi.get(e.strings);return i===void 0&&Xi.set(e.strings,i=new we(e)),i}k(e){ki(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let o,s=0;for(const r of e)s===i.length?i.push(o=new _e(this.O(ve()),this.O(ve()),this,this.options)):o=i[s],o._$AI(r),s++;s<i.length&&(this._$AR(o&&o._$AB.nextSibling,s),i.length=s)}_$AR(e=this._$AA.nextSibling,i){var o;for((o=this._$AP)==null?void 0:o.call(this,!1,!0,i);e!==this._$AB;){const s=Ui(e).nextSibling;Ui(e).remove(),e=s}}setConnected(e){var i;this._$AM===void 0&&(this._$Cv=e,(i=this._$AP)==null||i.call(this,e))}}class Ve{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,i,o,s,r){this.type=1,this._$AH=C,this._$AN=void 0,this.element=e,this.name=i,this._$AM=s,this.options=r,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=C}_$AI(e,i=this,o,s){const r=this.strings;let a=!1;if(r===void 0)e=Qt(this,e,i,0),a=!ye(e)||e!==this._$AH&&e!==at,a&&(this._$AH=e);else{const c=e;let d,u;for(e=r[0],d=0;d<r.length-1;d++)u=Qt(this,c[o+d],i,d),u===at&&(u=this._$AH[d]),a||(a=!ye(u)||u!==this._$AH[d]),u===C?e=C:e!==C&&(e+=(u??"")+r[d+1]),this._$AH[d]=u}a&&!s&&this.j(e)}j(e){e===C?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class cs extends Ve{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===C?void 0:e}}class ds extends Ve{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==C)}}class us extends Ve{constructor(e,i,o,s,r){super(e,i,o,s,r),this.type=5}_$AI(e,i=this){if((e=Qt(this,e,i,0)??C)===at)return;const o=this._$AH,s=e===C&&o!==C||e.capture!==o.capture||e.once!==o.once||e.passive!==o.passive,r=e!==C&&(o===C||s);s&&this.element.removeEventListener(this.name,this,o),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,e):this._$AH.handleEvent(e)}}class hs{constructor(e,i,o){this.element=e,this.type=6,this._$AN=void 0,this._$AM=i,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(e){Qt(this,e)}}const ei=fe.litHtmlPolyfillSupport;ei==null||ei(we,_e),(fe.litHtmlVersions??(fe.litHtmlVersions=[])).push("3.3.2");const ps=(t,e,i)=>{const o=(i==null?void 0:i.renderBefore)??e;let s=o._$litPart$;if(s===void 0){const r=(i==null?void 0:i.renderBefore)??null;o._$litPart$=s=new _e(e.insertBefore(ve(),r),r,void 0,i??{})}return s._$AI(t),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ht=globalThis;let pt=class extends Yt{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const e=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=e.firstChild),e}update(e){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ps(i,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return at}};var vo;pt._$litElement$=!0,pt.finalized=!0,(vo=Ht.litElementHydrateSupport)==null||vo.call(Ht,{LitElement:pt});const ii=Ht.litElementPolyfillSupport;ii==null||ii({LitElement:pt});(Ht.litElementVersions??(Ht.litElementVersions=[])).push("4.2.2");var fs=L`
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
`;const di=new Set,Xt=new Map;let Nt,$i="ltr",Ci="en";const $o=typeof MutationObserver<"u"&&typeof document<"u"&&typeof document.documentElement<"u";if($o){const t=new MutationObserver(So);$i=document.documentElement.dir||"ltr",Ci=document.documentElement.lang||navigator.language,t.observe(document.documentElement,{attributes:!0,attributeFilter:["dir","lang"]})}function Co(...t){t.map(e=>{const i=e.$code.toLowerCase();Xt.has(i)?Xt.set(i,Object.assign(Object.assign({},Xt.get(i)),e)):Xt.set(i,e),Nt||(Nt=e)}),So()}function So(){$o&&($i=document.documentElement.dir||"ltr",Ci=document.documentElement.lang||navigator.language),[...di.keys()].map(t=>{typeof t.requestUpdate=="function"&&t.requestUpdate()})}let ms=class{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){di.add(this.host)}hostDisconnected(){di.delete(this.host)}dir(){return`${this.host.dir||$i}`.toLowerCase()}lang(){return`${this.host.lang||Ci}`.toLowerCase()}getTranslationData(e){var i,o;const s=new Intl.Locale(e.replace(/_/g,"-")),r=s==null?void 0:s.language.toLowerCase(),a=(o=(i=s==null?void 0:s.region)===null||i===void 0?void 0:i.toLowerCase())!==null&&o!==void 0?o:"",c=Xt.get(`${r}-${a}`),d=Xt.get(r);return{locale:s,language:r,region:a,primary:c,secondary:d}}exists(e,i){var o;const{primary:s,secondary:r}=this.getTranslationData((o=i.lang)!==null&&o!==void 0?o:this.lang());return i=Object.assign({includeFallback:!1},i),!!(s&&s[e]||r&&r[e]||i.includeFallback&&Nt&&Nt[e])}term(e,...i){const{primary:o,secondary:s}=this.getTranslationData(this.lang());let r;if(o&&o[e])r=o[e];else if(s&&s[e])r=s[e];else if(Nt&&Nt[e])r=Nt[e];else return console.error(`No translation found for: ${String(e)}`),String(e);return typeof r=="function"?r(...i):r}date(e,i){return e=new Date(e),new Intl.DateTimeFormat(this.lang(),i).format(e)}number(e,i){return e=Number(e),isNaN(e)?"":new Intl.NumberFormat(this.lang(),i).format(e)}relativeTime(e,i,o){return new Intl.RelativeTimeFormat(this.lang(),o).format(e,i)}};var Eo={$code:"en",$name:"English",$dir:"ltr",carousel:"Carousel",clearEntry:"Clear entry",close:"Close",copied:"Copied",copy:"Copy",currentValue:"Current value",error:"Error",goToSlide:(t,e)=>`Go to slide ${t} of ${e}`,hidePassword:"Hide password",loading:"Loading",nextSlide:"Next slide",numOptionsSelected:t=>t===0?"No options selected":t===1?"1 option selected":`${t} options selected`,previousSlide:"Previous slide",progress:"Progress",remove:"Remove",resize:"Resize",scrollToEnd:"Scroll to end",scrollToStart:"Scroll to start",selectAColorFromTheScreen:"Select a color from the screen",showPassword:"Show password",slideNum:t=>`Slide ${t}`,toggleColorFormat:"Toggle color format"};Co(Eo);var bs=Eo,tt=class extends ms{};Co(bs);var B=L`
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
`,Ao=Object.defineProperty,gs=Object.defineProperties,vs=Object.getOwnPropertyDescriptor,ys=Object.getOwnPropertyDescriptors,Gi=Object.getOwnPropertySymbols,ws=Object.prototype.hasOwnProperty,xs=Object.prototype.propertyIsEnumerable,oi=(t,e)=>(e=Symbol[t])?e:Symbol.for("Symbol."+t),Si=t=>{throw TypeError(t)},Zi=(t,e,i)=>e in t?Ao(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i,Wt=(t,e)=>{for(var i in e||(e={}))ws.call(e,i)&&Zi(t,i,e[i]);if(Gi)for(var i of Gi(e))xs.call(e,i)&&Zi(t,i,e[i]);return t},He=(t,e)=>gs(t,ys(e)),n=(t,e,i,o)=>{for(var s=o>1?void 0:o?vs(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ao(e,i,s),s},To=(t,e,i)=>e.has(t)||Si("Cannot "+i),_s=(t,e,i)=>(To(t,e,"read from private field"),e.get(t)),ks=(t,e,i)=>e.has(t)?Si("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),$s=(t,e,i,o)=>(To(t,e,"write to private field"),e.set(t,i),i),Cs=function(t,e){this[0]=t,this[1]=e},Ss=t=>{var e=t[oi("asyncIterator")],i=!1,o,s={};return e==null?(e=t[oi("iterator")](),o=r=>s[r]=a=>e[r](a)):(e=e.call(t),o=r=>s[r]=a=>{if(i){if(i=!1,r==="throw")throw a;return a}return i=!0,{done:!1,value:new Cs(new Promise(c=>{var d=e[r](a);d instanceof Object||Si("Object expected"),c(d)}),1)}}),s[oi("iterator")]=()=>s,o("next"),"throw"in e?o("throw"):s.throw=r=>{throw r},"return"in e&&o("return"),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ee=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Es={attribute:!0,type:String,converter:Zt,reflect:!1,hasChanged:_i},As=(t=Es,e,i)=>{const{kind:o,metadata:s}=i;let r=globalThis.litPropertyMetadata.get(s);if(r===void 0&&globalThis.litPropertyMetadata.set(s,r=new Map),o==="setter"&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),o==="accessor"){const{name:a}=i;return{set(c){const d=e.get.call(this);e.set.call(this,c),this.requestUpdate(a,d,t,!0,c)},init(c){return c!==void 0&&this.C(a,void 0,t,c),c}}}if(o==="setter"){const{name:a}=i;return function(c){const d=this[a];e.call(this,c),this.requestUpdate(a,d,t,!0,c)}}throw Error("Unsupported decorator location: "+o)};function l(t){return(e,i)=>typeof i=="object"?As(t,e,i):((o,s,r)=>{const a=s.hasOwnProperty(r);return s.constructor.createProperty(r,o),a?Object.getOwnPropertyDescriptor(s,r):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function w(t){return l({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ts=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function S(t,e){return(i,o,s)=>{const r=a=>{var c;return((c=a.renderRoot)==null?void 0:c.querySelector(t))??null};return Ts(i,o,{get(){return r(this)}})}}var Oe,D=class extends pt{constructor(){super(),ks(this,Oe,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([t,e])=>{this.constructor.define(t,e)})}emit(t,e){const i=new CustomEvent(t,Wt({bubbles:!0,cancelable:!1,composed:!0,detail:{}},e));return this.dispatchEvent(i),i}static define(t,e=this,i={}){const o=customElements.get(t);if(!o){try{customElements.define(t,e,i)}catch{customElements.define(t,class extends e{},i)}return}let s=" (unknown version)",r=s;"version"in e&&e.version&&(s=" v"+e.version),"version"in o&&o.version&&(r=" v"+o.version),!(s&&r&&s===r)&&console.warn(`Attempted to register <${t}>${s}, but <${t}>${r} has already been registered.`)}attributeChangedCallback(t,e,i){_s(this,Oe)||(this.constructor.elementProperties.forEach((o,s)=>{o.reflect&&this[s]!=null&&this.initialReflectedProperties.set(s,this[s])}),$s(this,Oe,!0)),super.attributeChangedCallback(t,e,i)}willUpdate(t){super.willUpdate(t),this.initialReflectedProperties.forEach((e,i)=>{t.has(i)&&this[i]==null&&(this[i]=e)})}};Oe=new WeakMap;D.version="2.20.1";D.dependencies={};n([l()],D.prototype,"dir",2);n([l()],D.prototype,"lang",2);var Ei=class extends D{constructor(){super(...arguments),this.localize=new tt(this)}render(){return f`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term("loading")}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};Ei.styles=[B,fs];var le=new WeakMap,ce=new WeakMap,de=new WeakMap,si=new WeakSet,Ee=new WeakMap,ke=class{constructor(t,e){this.handleFormData=i=>{const o=this.options.disabled(this.host),s=this.options.name(this.host),r=this.options.value(this.host),a=this.host.tagName.toLowerCase()==="sl-button";this.host.isConnected&&!o&&!a&&typeof s=="string"&&s.length>0&&typeof r<"u"&&(Array.isArray(r)?r.forEach(c=>{i.formData.append(s,c.toString())}):i.formData.append(s,r.toString()))},this.handleFormSubmit=i=>{var o;const s=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((o=le.get(this.form))==null||o.forEach(a=>{this.setUserInteracted(a,!0)})),this.form&&!this.form.noValidate&&!s&&!r(this.host)&&(i.preventDefault(),i.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),Ee.set(this.host,[])},this.handleInteraction=i=>{const o=Ee.get(this.host);o.includes(i.type)||o.push(i.type),o.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.checkValidity=="function"&&!o.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){const i=this.form.querySelectorAll("*");for(const o of i)if(typeof o.reportValidity=="function"&&!o.reportValidity())return!1}return!0},(this.host=t).addController(this),this.options=Wt({form:i=>{const o=i.form;if(o){const r=i.getRootNode().querySelector(`#${o}`);if(r)return r}return i.closest("form")},name:i=>i.name,value:i=>i.value,defaultValue:i=>i.defaultValue,disabled:i=>{var o;return(o=i.disabled)!=null?o:!1},reportValidity:i=>typeof i.reportValidity=="function"?i.reportValidity():!0,checkValidity:i=>typeof i.checkValidity=="function"?i.checkValidity():!0,setValue:(i,o)=>i.value=o,assumeInteractionOn:["sl-input"]},e)}hostConnected(){const t=this.options.form(this.host);t&&this.attachForm(t),Ee.set(this.host,[]),this.options.assumeInteractionOn.forEach(e=>{this.host.addEventListener(e,this.handleInteraction)})}hostDisconnected(){this.detachForm(),Ee.delete(this.host),this.options.assumeInteractionOn.forEach(t=>{this.host.removeEventListener(t,this.handleInteraction)})}hostUpdated(){const t=this.options.form(this.host);t||this.detachForm(),t&&this.form!==t&&(this.detachForm(),this.attachForm(t)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(t){t?(this.form=t,le.has(this.form)?le.get(this.form).add(this.host):le.set(this.form,new Set([this.host])),this.form.addEventListener("formdata",this.handleFormData),this.form.addEventListener("submit",this.handleFormSubmit),this.form.addEventListener("reset",this.handleFormReset),ce.has(this.form)||(ce.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),de.has(this.form)||(de.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;const t=le.get(this.form);t&&(t.delete(this.host),t.size<=0&&(this.form.removeEventListener("formdata",this.handleFormData),this.form.removeEventListener("submit",this.handleFormSubmit),this.form.removeEventListener("reset",this.handleFormReset),ce.has(this.form)&&(this.form.reportValidity=ce.get(this.form),ce.delete(this.form)),de.has(this.form)&&(this.form.checkValidity=de.get(this.form),de.delete(this.form)),this.form=void 0))}setUserInteracted(t,e){e?si.add(t):si.delete(t),t.requestUpdate()}doAction(t,e){if(this.form){const i=document.createElement("button");i.type=t,i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.clipPath="inset(50%)",i.style.overflow="hidden",i.style.whiteSpace="nowrap",e&&(i.name=e.name,i.value=e.value,["formaction","formenctype","formmethod","formnovalidate","formtarget"].forEach(o=>{e.hasAttribute(o)&&i.setAttribute(o,e.getAttribute(o))})),this.form.append(i),i.click(),i.remove()}}getForm(){var t;return(t=this.form)!=null?t:null}reset(t){this.doAction("reset",t)}submit(t){this.doAction("submit",t)}setValidity(t){const e=this.host,i=!!si.has(e),o=!!e.required;e.toggleAttribute("data-required",o),e.toggleAttribute("data-optional",!o),e.toggleAttribute("data-invalid",!t),e.toggleAttribute("data-valid",t),e.toggleAttribute("data-user-invalid",!t&&i),e.toggleAttribute("data-user-valid",t&&i)}updateValidity(){const t=this.host;this.setValidity(t.validity.valid)}emitInvalidEvent(t){const e=new CustomEvent("sl-invalid",{bubbles:!1,composed:!1,cancelable:!0,detail:{}});t||e.preventDefault(),this.host.dispatchEvent(e)||t==null||t.preventDefault()}},Ai=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(He(Wt({},Ai),{valid:!1,valueMissing:!0}));Object.freeze(He(Wt({},Ai),{valid:!1,customError:!0}));var zs=L`
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
`,St=class{constructor(t,...e){this.slotNames=[],this.handleSlotChange=i=>{const o=i.target;(this.slotNames.includes("[default]")&&!o.name||o.name&&this.slotNames.includes(o.name))&&this.host.requestUpdate()},(this.host=t).addController(this),this.slotNames=e}hasDefaultSlot(){return[...this.host.childNodes].some(t=>{if(t.nodeType===t.TEXT_NODE&&t.textContent.trim()!=="")return!0;if(t.nodeType===t.ELEMENT_NODE){const e=t;if(e.tagName.toLowerCase()==="sl-visually-hidden")return!1;if(!e.hasAttribute("slot"))return!0}return!1})}hasNamedSlot(t){return this.host.querySelector(`:scope > [slot="${t}"]`)!==null}test(t){return t==="[default]"?this.hasDefaultSlot():this.hasNamedSlot(t)}hostConnected(){this.host.shadowRoot.addEventListener("slotchange",this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener("slotchange",this.handleSlotChange)}};function Os(t){if(!t)return"";const e=t.assignedNodes({flatten:!0});let i="";return[...e].forEach(o=>{o.nodeType===Node.TEXT_NODE&&(i+=o.textContent)}),i}var ui="";function hi(t){ui=t}function Ls(t=""){if(!ui){const e=[...document.getElementsByTagName("script")],i=e.find(o=>o.hasAttribute("data-shoelace"));if(i)hi(i.getAttribute("data-shoelace"));else{const o=e.find(r=>/shoelace(\.min)?\.js($|\?)/.test(r.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(r.src));let s="";o&&(s=o.getAttribute("src")),hi(s.split("/").slice(0,-1).join("/"))}}return ui.replace(/\/$/,"")+(t?`/${t.replace(/^\//,"")}`:"")}var Ps={name:"default",resolver:t=>Ls(`assets/icons/${t}.svg`)},Ds=Ps,Qi={caret:`
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
  `},Rs={name:"system",resolver:t=>t in Qi?`data:image/svg+xml,${encodeURIComponent(Qi[t])}`:""},Ms=Rs,Is=[Ds,Ms],pi=[];function Bs(t){pi.push(t)}function Fs(t){pi=pi.filter(e=>e!==t)}function Ji(t){return Is.find(e=>e.name===t)}var Ns=L`
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
`;function T(t,e){const i=Wt({waitUntilFirstUpdate:!1},e);return(o,s)=>{const{update:r}=o,a=Array.isArray(t)?t:[t];o.update=function(c){a.forEach(d=>{const u=d;if(c.has(u)){const h=c.get(u),p=this[u];h!==p&&(!i.waitUntilFirstUpdate||this.hasUpdated)&&this[s](h,p)}}),r.call(this,c)}}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Vs=(t,e)=>(t==null?void 0:t._$litType$)!==void 0,zo=t=>t.strings===void 0,Hs={},Us=(t,e=Hs)=>t._$AH=e;var ue=Symbol(),Ae=Symbol(),ri,ai=new Map,W=class extends D{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label="",this.library="default"}async resolveIcon(t,e){var i;let o;if(e!=null&&e.spriteSheet)return this.svg=f`<svg part="svg">
        <use part="use" href="${t}"></use>
      </svg>`,this.svg;try{if(o=await fetch(t,{mode:"cors"}),!o.ok)return o.status===410?ue:Ae}catch{return Ae}try{const s=document.createElement("div");s.innerHTML=await o.text();const r=s.firstElementChild;if(((i=r==null?void 0:r.tagName)==null?void 0:i.toLowerCase())!=="svg")return ue;ri||(ri=new DOMParser);const c=ri.parseFromString(r.outerHTML,"text/html").body.querySelector("svg");return c?(c.part.add("svg"),document.adoptNode(c)):ue}catch{return ue}}connectedCallback(){super.connectedCallback(),Bs(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Fs(this)}getIconSource(){const t=Ji(this.library);return this.name&&t?{url:t.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label=="string"&&this.label.length>0?(this.setAttribute("role","img"),this.setAttribute("aria-label",this.label),this.removeAttribute("aria-hidden")):(this.removeAttribute("role"),this.removeAttribute("aria-label"),this.setAttribute("aria-hidden","true"))}async setIcon(){var t;const{url:e,fromLibrary:i}=this.getIconSource(),o=i?Ji(this.library):void 0;if(!e){this.svg=null;return}let s=ai.get(e);if(s||(s=this.resolveIcon(e,o),ai.set(e,s)),!this.initialRender)return;const r=await s;if(r===Ae&&ai.delete(e),e===this.getIconSource().url){if(Vs(r)){if(this.svg=r,o){await this.updateComplete;const a=this.shadowRoot.querySelector("[part='svg']");typeof o.mutator=="function"&&a&&o.mutator(a)}return}switch(r){case Ae:case ue:this.svg=null,this.emit("sl-error");break;default:this.svg=r.cloneNode(!0),(t=o==null?void 0:o.mutator)==null||t.call(o,this.svg),this.emit("sl-load")}}}render(){return this.svg}};W.styles=[B,Ns];n([w()],W.prototype,"svg",2);n([l({reflect:!0})],W.prototype,"name",2);n([l()],W.prototype,"src",2);n([l()],W.prototype,"label",2);n([l({reflect:!0})],W.prototype,"library",2);n([T("label")],W.prototype,"handleLabelChange",1);n([T(["name","src","library"])],W.prototype,"setIcon",1);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const $t={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},Ue=t=>(...e)=>({_$litDirective$:t,values:e});let je=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,o){this._$Ct=e,this._$AM=i,this._$Ci=o}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const I=Ue(class extends je{constructor(t){var e;if(super(t),t.type!==$t.ATTRIBUTE||t.name!=="class"||((e=t.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){var o,s;if(this.st===void 0){this.st=new Set,t.strings!==void 0&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in e)e[r]&&!((o=this.nt)!=null&&o.has(r))&&this.st.add(r);return this.render(e)}const i=t.element.classList;for(const r of this.st)r in e||(i.remove(r),this.st.delete(r));for(const r in e){const a=!!e[r];a===this.st.has(r)||(s=this.nt)!=null&&s.has(r)||(a?(i.add(r),this.st.add(r)):(i.remove(r),this.st.delete(r)))}return at}});/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Oo=Symbol.for(""),js=t=>{if((t==null?void 0:t.r)===Oo)return t==null?void 0:t._$litStatic$},Re=(t,...e)=>({_$litStatic$:e.reduce((i,o,s)=>i+(r=>{if(r._$litStatic$!==void 0)return r._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${r}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(o)+t[s+1],t[0]),r:Oo}),to=new Map,qs=t=>(e,...i)=>{const o=i.length;let s,r;const a=[],c=[];let d,u=0,h=!1;for(;u<o;){for(d=e[u];u<o&&(r=i[u],(s=js(r))!==void 0);)d+=s+e[++u],h=!0;u!==o&&c.push(r),a.push(d),u++}if(u===o&&a.push(e[o]),h){const p=a.join("$$lit$$");(e=to.get(p))===void 0&&(a.raw=a,to.set(p,e=a)),i=c}return t(e,...i)},Le=qs(f);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const v=t=>t??C;var z=class extends D{constructor(){super(...arguments),this.formControlController=new ke(this,{assumeInteractionOn:["click"]}),this.hasSlotController=new St(this,"[default]","prefix","suffix"),this.localize=new tt(this),this.hasFocus=!1,this.invalid=!1,this.title="",this.variant="default",this.size="medium",this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type="button",this.name="",this.value="",this.href="",this.rel="noreferrer noopener"}get validity(){return this.isButton()?this.button.validity:Ai}get validationMessage(){return this.isButton()?this.button.validationMessage:""}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(){this.type==="submit"&&this.formControlController.submit(this),this.type==="reset"&&this.formControlController.reset(this)}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(t){this.isButton()&&(this.button.setCustomValidity(t),this.formControlController.updateValidity())}render(){const t=this.isLink(),e=t?Re`a`:Re`button`;return Le`
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
        ${this.caret?Le` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:""}
        ${this.loading?Le`<sl-spinner part="spinner"></sl-spinner>`:""}
      </${e}>
    `}};z.styles=[B,zs];z.dependencies={"sl-icon":W,"sl-spinner":Ei};n([S(".button")],z.prototype,"button",2);n([w()],z.prototype,"hasFocus",2);n([w()],z.prototype,"invalid",2);n([l()],z.prototype,"title",2);n([l({reflect:!0})],z.prototype,"variant",2);n([l({reflect:!0})],z.prototype,"size",2);n([l({type:Boolean,reflect:!0})],z.prototype,"caret",2);n([l({type:Boolean,reflect:!0})],z.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],z.prototype,"loading",2);n([l({type:Boolean,reflect:!0})],z.prototype,"outline",2);n([l({type:Boolean,reflect:!0})],z.prototype,"pill",2);n([l({type:Boolean,reflect:!0})],z.prototype,"circle",2);n([l()],z.prototype,"type",2);n([l()],z.prototype,"name",2);n([l()],z.prototype,"value",2);n([l()],z.prototype,"href",2);n([l()],z.prototype,"target",2);n([l()],z.prototype,"rel",2);n([l()],z.prototype,"download",2);n([l()],z.prototype,"form",2);n([l({attribute:"formaction"})],z.prototype,"formAction",2);n([l({attribute:"formenctype"})],z.prototype,"formEnctype",2);n([l({attribute:"formmethod"})],z.prototype,"formMethod",2);n([l({attribute:"formnovalidate",type:Boolean})],z.prototype,"formNoValidate",2);n([l({attribute:"formtarget"})],z.prototype,"formTarget",2);n([T("disabled",{waitUntilFirstUpdate:!0})],z.prototype,"handleDisabledChange",1);z.define("sl-button");var Ws=L`
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
`,Ti=(t="value")=>(e,i)=>{const o=e.constructor,s=o.prototype.attributeChangedCallback;o.prototype.attributeChangedCallback=function(r,a,c){var d;const u=o.getPropertyOptions(t),h=typeof u.attribute=="string"?u.attribute:t;if(r===h){const p=u.converter||Zt,m=(typeof p=="function"?p:(d=p==null?void 0:p.fromAttribute)!=null?d:Zt.fromAttribute)(c,u.type);this[t]!==m&&(this[i]=m)}s.call(this,r,a,c)}},qe=L`
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
 */const Me=Ue(class extends je{constructor(t){if(super(t),t.type!==$t.PROPERTY&&t.type!==$t.ATTRIBUTE&&t.type!==$t.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!zo(t))throw Error("`live` bindings can only contain a single expression")}render(t){return t}update(t,[e]){if(e===at||e===C)return e;const i=t.element,o=t.name;if(t.type===$t.PROPERTY){if(e===i[o])return at}else if(t.type===$t.BOOLEAN_ATTRIBUTE){if(!!e===i.hasAttribute(o))return at}else if(t.type===$t.ATTRIBUTE&&i.getAttribute(o)===e+"")return at;return Us(t),e}});var y=class extends D{constructor(){super(...arguments),this.formControlController=new ke(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new St(this,"help-text","label"),this.localize=new tt(this),this.hasFocus=!1,this.title="",this.__numberInput=Object.assign(document.createElement("input"),{type:"number"}),this.__dateInput=Object.assign(document.createElement("input"),{type:"date"}),this.type="text",this.name="",this.value="",this.defaultValue="",this.size="medium",this.filled=!1,this.pill=!1,this.label="",this.helpText="",this.clearable=!1,this.disabled=!1,this.placeholder="",this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form="",this.required=!1,this.spellcheck=!0}get valueAsDate(){var t;return this.__dateInput.type=this.type,this.__dateInput.value=this.value,((t=this.input)==null?void 0:t.valueAsDate)||this.__dateInput.valueAsDate}set valueAsDate(t){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=t,this.value=this.__dateInput.value}get valueAsNumber(){var t;return this.__numberInput.value=this.value,((t=this.input)==null?void 0:t.valueAsNumber)||this.__numberInput.valueAsNumber}set valueAsNumber(t){this.__numberInput.valueAsNumber=t,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.emit("sl-change")}handleClearClick(t){t.preventDefault(),this.value!==""&&(this.value="",this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleKeyDown(t){const e=t.metaKey||t.ctrlKey||t.shiftKey||t.altKey;t.key==="Enter"&&!e&&setTimeout(()=>{!t.defaultPrevented&&!t.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,o="preserve"){const s=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,s,r,o),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){"showPicker"in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e,r=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value=="number"||this.value.length>0);return f`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
              .value=${Me(this.value)}
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

            ${r?f`
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
            ${this.passwordToggle&&!this.disabled?f`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?"hidePassword":"showPassword")}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?f`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:f`
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
    `}};y.styles=[B,qe,Ws];y.dependencies={"sl-icon":W};n([S(".input__control")],y.prototype,"input",2);n([w()],y.prototype,"hasFocus",2);n([l()],y.prototype,"title",2);n([l({reflect:!0})],y.prototype,"type",2);n([l()],y.prototype,"name",2);n([l()],y.prototype,"value",2);n([Ti()],y.prototype,"defaultValue",2);n([l({reflect:!0})],y.prototype,"size",2);n([l({type:Boolean,reflect:!0})],y.prototype,"filled",2);n([l({type:Boolean,reflect:!0})],y.prototype,"pill",2);n([l()],y.prototype,"label",2);n([l({attribute:"help-text"})],y.prototype,"helpText",2);n([l({type:Boolean})],y.prototype,"clearable",2);n([l({type:Boolean,reflect:!0})],y.prototype,"disabled",2);n([l()],y.prototype,"placeholder",2);n([l({type:Boolean,reflect:!0})],y.prototype,"readonly",2);n([l({attribute:"password-toggle",type:Boolean})],y.prototype,"passwordToggle",2);n([l({attribute:"password-visible",type:Boolean})],y.prototype,"passwordVisible",2);n([l({attribute:"no-spin-buttons",type:Boolean})],y.prototype,"noSpinButtons",2);n([l({reflect:!0})],y.prototype,"form",2);n([l({type:Boolean,reflect:!0})],y.prototype,"required",2);n([l()],y.prototype,"pattern",2);n([l({type:Number})],y.prototype,"minlength",2);n([l({type:Number})],y.prototype,"maxlength",2);n([l()],y.prototype,"min",2);n([l()],y.prototype,"max",2);n([l()],y.prototype,"step",2);n([l()],y.prototype,"autocapitalize",2);n([l()],y.prototype,"autocorrect",2);n([l()],y.prototype,"autocomplete",2);n([l({type:Boolean})],y.prototype,"autofocus",2);n([l()],y.prototype,"enterkeyhint",2);n([l({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],y.prototype,"spellcheck",2);n([l()],y.prototype,"inputmode",2);n([T("disabled",{waitUntilFirstUpdate:!0})],y.prototype,"handleDisabledChange",1);n([T("step",{waitUntilFirstUpdate:!0})],y.prototype,"handleStepChange",1);n([T("value",{waitUntilFirstUpdate:!0})],y.prototype,"handleValueChange",1);y.define("sl-input");var Ks=L`
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
`,Ys=L`
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
`,K=class extends D{constructor(){super(...arguments),this.hasFocus=!1,this.label="",this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleClick(t){this.disabled&&(t.preventDefault(),t.stopPropagation())}click(){this.button.click()}focus(t){this.button.focus(t)}blur(){this.button.blur()}render(){const t=!!this.href,e=t?Re`a`:Re`button`;return Le`
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
    `}};K.styles=[B,Ys];K.dependencies={"sl-icon":W};n([S(".icon-button")],K.prototype,"button",2);n([w()],K.prototype,"hasFocus",2);n([l()],K.prototype,"name",2);n([l()],K.prototype,"library",2);n([l()],K.prototype,"src",2);n([l()],K.prototype,"href",2);n([l()],K.prototype,"target",2);n([l()],K.prototype,"download",2);n([l()],K.prototype,"label",2);n([l({type:Boolean,reflect:!0})],K.prototype,"disabled",2);var Kt=class extends D{constructor(){super(...arguments),this.localize=new tt(this),this.variant="neutral",this.size="medium",this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit("sl-remove")}render(){return f`
      <span
        part="base"
        class=${I({tag:!0,"tag--primary":this.variant==="primary","tag--success":this.variant==="success","tag--neutral":this.variant==="neutral","tag--warning":this.variant==="warning","tag--danger":this.variant==="danger","tag--text":this.variant==="text","tag--small":this.size==="small","tag--medium":this.size==="medium","tag--large":this.size==="large","tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?f`
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
    `}};Kt.styles=[B,Ks];Kt.dependencies={"sl-icon-button":K};n([l({reflect:!0})],Kt.prototype,"variant",2);n([l({reflect:!0})],Kt.prototype,"size",2);n([l({type:Boolean,reflect:!0})],Kt.prototype,"pill",2);n([l({type:Boolean})],Kt.prototype,"removable",2);var Xs=L`
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
`;function Gs(t,e){return{top:Math.round(t.getBoundingClientRect().top-e.getBoundingClientRect().top),left:Math.round(t.getBoundingClientRect().left-e.getBoundingClientRect().left)}}var fi=new Set;function Zs(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}function Qs(){const t=Number(getComputedStyle(document.body).paddingRight.replace(/px/,""));return isNaN(t)||!t?0:t}function me(t){if(fi.add(t),!document.documentElement.classList.contains("sl-scroll-lock")){const e=Zs()+Qs();let i=getComputedStyle(document.documentElement).scrollbarGutter;(!i||i==="auto")&&(i="stable"),e<2&&(i=""),document.documentElement.style.setProperty("--sl-scroll-lock-gutter",i),document.documentElement.classList.add("sl-scroll-lock"),document.documentElement.style.setProperty("--sl-scroll-lock-size",`${e}px`)}}function be(t){fi.delete(t),fi.size===0&&(document.documentElement.classList.remove("sl-scroll-lock"),document.documentElement.style.removeProperty("--sl-scroll-lock-size"))}function Js(t,e,i="vertical",o="smooth"){const s=Gs(t,e),r=s.top+e.scrollTop,a=s.left+e.scrollLeft,c=e.scrollLeft,d=e.scrollLeft+e.offsetWidth,u=e.scrollTop,h=e.scrollTop+e.offsetHeight;(i==="horizontal"||i==="both")&&(a<c?e.scrollTo({left:a,behavior:o}):a+t.clientWidth>d&&e.scrollTo({left:a-e.offsetWidth+t.clientWidth,behavior:o})),(i==="vertical"||i==="both")&&(r<u?e.scrollTo({top:r,behavior:o}):r+t.clientHeight>h&&e.scrollTo({top:r-e.offsetHeight+t.clientHeight,behavior:o}))}var tr=L`
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
`;const Lt=Math.min,Q=Math.max,Ie=Math.round,Te=Math.floor,vt=t=>({x:t,y:t}),er={left:"right",right:"left",bottom:"top",top:"bottom"},ir={start:"end",end:"start"};function mi(t,e,i){return Q(t,Lt(e,i))}function ie(t,e){return typeof t=="function"?t(e):t}function Pt(t){return t.split("-")[0]}function oe(t){return t.split("-")[1]}function Lo(t){return t==="x"?"y":"x"}function zi(t){return t==="y"?"height":"width"}const or=new Set(["top","bottom"]);function Ct(t){return or.has(Pt(t))?"y":"x"}function Oi(t){return Lo(Ct(t))}function sr(t,e,i){i===void 0&&(i=!1);const o=oe(t),s=Oi(t),r=zi(s);let a=s==="x"?o===(i?"end":"start")?"right":"left":o==="start"?"bottom":"top";return e.reference[r]>e.floating[r]&&(a=Be(a)),[a,Be(a)]}function rr(t){const e=Be(t);return[bi(t),e,bi(e)]}function bi(t){return t.replace(/start|end/g,e=>ir[e])}const eo=["left","right"],io=["right","left"],ar=["top","bottom"],nr=["bottom","top"];function lr(t,e,i){switch(t){case"top":case"bottom":return i?e?io:eo:e?eo:io;case"left":case"right":return e?ar:nr;default:return[]}}function cr(t,e,i,o){const s=oe(t);let r=lr(Pt(t),i==="start",o);return s&&(r=r.map(a=>a+"-"+s),e&&(r=r.concat(r.map(bi)))),r}function Be(t){return t.replace(/left|right|bottom|top/g,e=>er[e])}function dr(t){return{top:0,right:0,bottom:0,left:0,...t}}function Po(t){return typeof t!="number"?dr(t):{top:t,right:t,bottom:t,left:t}}function Fe(t){const{x:e,y:i,width:o,height:s}=t;return{width:o,height:s,top:i,left:e,right:e+o,bottom:i+s,x:e,y:i}}function oo(t,e,i){let{reference:o,floating:s}=t;const r=Ct(e),a=Oi(e),c=zi(a),d=Pt(e),u=r==="y",h=o.x+o.width/2-s.width/2,p=o.y+o.height/2-s.height/2,b=o[c]/2-s[c]/2;let m;switch(d){case"top":m={x:h,y:o.y-s.height};break;case"bottom":m={x:h,y:o.y+o.height};break;case"right":m={x:o.x+o.width,y:p};break;case"left":m={x:o.x-s.width,y:p};break;default:m={x:o.x,y:o.y}}switch(oe(e)){case"start":m[a]-=b*(i&&u?-1:1);break;case"end":m[a]+=b*(i&&u?-1:1);break}return m}const ur=async(t,e,i)=>{const{placement:o="bottom",strategy:s="absolute",middleware:r=[],platform:a}=i,c=r.filter(Boolean),d=await(a.isRTL==null?void 0:a.isRTL(e));let u=await a.getElementRects({reference:t,floating:e,strategy:s}),{x:h,y:p}=oo(u,o,d),b=o,m={},g=0;for(let x=0;x<c.length;x++){const{name:$,fn:_}=c[x],{x:A,y:P,data:F,reset:M}=await _({x:h,y:p,initialPlacement:o,placement:b,strategy:s,middlewareData:m,rects:u,platform:a,elements:{reference:t,floating:e}});h=A??h,p=P??p,m={...m,[$]:{...m[$],...F}},M&&g<=50&&(g++,typeof M=="object"&&(M.placement&&(b=M.placement),M.rects&&(u=M.rects===!0?await a.getElementRects({reference:t,floating:e,strategy:s}):M.rects),{x:h,y:p}=oo(u,b,d)),x=-1)}return{x:h,y:p,placement:b,strategy:s,middlewareData:m}};async function Li(t,e){var i;e===void 0&&(e={});const{x:o,y:s,platform:r,rects:a,elements:c,strategy:d}=t,{boundary:u="clippingAncestors",rootBoundary:h="viewport",elementContext:p="floating",altBoundary:b=!1,padding:m=0}=ie(e,t),g=Po(m),$=c[b?p==="floating"?"reference":"floating":p],_=Fe(await r.getClippingRect({element:(i=await(r.isElement==null?void 0:r.isElement($)))==null||i?$:$.contextElement||await(r.getDocumentElement==null?void 0:r.getDocumentElement(c.floating)),boundary:u,rootBoundary:h,strategy:d})),A=p==="floating"?{x:o,y:s,width:a.floating.width,height:a.floating.height}:a.reference,P=await(r.getOffsetParent==null?void 0:r.getOffsetParent(c.floating)),F=await(r.isElement==null?void 0:r.isElement(P))?await(r.getScale==null?void 0:r.getScale(P))||{x:1,y:1}:{x:1,y:1},M=Fe(r.convertOffsetParentRelativeRectToViewportRelativeRect?await r.convertOffsetParentRelativeRectToViewportRelativeRect({elements:c,rect:A,offsetParent:P,strategy:d}):A);return{top:(_.top-M.top+g.top)/F.y,bottom:(M.bottom-_.bottom+g.bottom)/F.y,left:(_.left-M.left+g.left)/F.x,right:(M.right-_.right+g.right)/F.x}}const hr=t=>({name:"arrow",options:t,async fn(e){const{x:i,y:o,placement:s,rects:r,platform:a,elements:c,middlewareData:d}=e,{element:u,padding:h=0}=ie(t,e)||{};if(u==null)return{};const p=Po(h),b={x:i,y:o},m=Oi(s),g=zi(m),x=await a.getDimensions(u),$=m==="y",_=$?"top":"left",A=$?"bottom":"right",P=$?"clientHeight":"clientWidth",F=r.reference[g]+r.reference[m]-b[m]-r.floating[g],M=b[m]-r.reference[m],dt=await(a.getOffsetParent==null?void 0:a.getOffsetParent(u));let j=dt?dt[P]:0;(!j||!await(a.isElement==null?void 0:a.isElement(dt)))&&(j=c.floating[P]||r.floating[g]);const _t=F/2-M/2,bt=j/2-x[g]/2-1,rt=Lt(p[_],bt),Et=Lt(p[A],bt),gt=rt,At=j-x[g]-Et,X=j/2-x[g]/2+_t,It=mi(gt,X,At),kt=!d.arrow&&oe(s)!=null&&X!==It&&r.reference[g]/2-(X<gt?rt:Et)-x[g]/2<0,ut=kt?X<gt?X-gt:X-At:0;return{[m]:b[m]+ut,data:{[m]:It,centerOffset:X-It-ut,...kt&&{alignmentOffset:ut}},reset:kt}}}),pr=function(t){return t===void 0&&(t={}),{name:"flip",options:t,async fn(e){var i,o;const{placement:s,middlewareData:r,rects:a,initialPlacement:c,platform:d,elements:u}=e,{mainAxis:h=!0,crossAxis:p=!0,fallbackPlacements:b,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:x=!0,...$}=ie(t,e);if((i=r.arrow)!=null&&i.alignmentOffset)return{};const _=Pt(s),A=Ct(c),P=Pt(c)===c,F=await(d.isRTL==null?void 0:d.isRTL(u.floating)),M=b||(P||!x?[Be(c)]:rr(c)),dt=g!=="none";!b&&dt&&M.push(...cr(c,x,g,F));const j=[c,...M],_t=await Li(e,$),bt=[];let rt=((o=r.flip)==null?void 0:o.overflows)||[];if(h&&bt.push(_t[_]),p){const X=sr(s,a,F);bt.push(_t[X[0]],_t[X[1]])}if(rt=[...rt,{placement:s,overflows:bt}],!bt.every(X=>X<=0)){var Et,gt;const X=(((Et=r.flip)==null?void 0:Et.index)||0)+1,It=j[X];if(It&&(!(p==="alignment"?A!==Ct(It):!1)||rt.every(ht=>Ct(ht.placement)===A?ht.overflows[0]>0:!0)))return{data:{index:X,overflows:rt},reset:{placement:It}};let kt=(gt=rt.filter(ut=>ut.overflows[0]<=0).sort((ut,ht)=>ut.overflows[1]-ht.overflows[1])[0])==null?void 0:gt.placement;if(!kt)switch(m){case"bestFit":{var At;const ut=(At=rt.filter(ht=>{if(dt){const Tt=Ct(ht.placement);return Tt===A||Tt==="y"}return!0}).map(ht=>[ht.placement,ht.overflows.filter(Tt=>Tt>0).reduce((Tt,Yo)=>Tt+Yo,0)]).sort((ht,Tt)=>ht[1]-Tt[1])[0])==null?void 0:At[0];ut&&(kt=ut);break}case"initialPlacement":kt=c;break}if(s!==kt)return{reset:{placement:kt}}}return{}}}},fr=new Set(["left","top"]);async function mr(t,e){const{placement:i,platform:o,elements:s}=t,r=await(o.isRTL==null?void 0:o.isRTL(s.floating)),a=Pt(i),c=oe(i),d=Ct(i)==="y",u=fr.has(a)?-1:1,h=r&&d?-1:1,p=ie(e,t);let{mainAxis:b,crossAxis:m,alignmentAxis:g}=typeof p=="number"?{mainAxis:p,crossAxis:0,alignmentAxis:null}:{mainAxis:p.mainAxis||0,crossAxis:p.crossAxis||0,alignmentAxis:p.alignmentAxis};return c&&typeof g=="number"&&(m=c==="end"?g*-1:g),d?{x:m*h,y:b*u}:{x:b*u,y:m*h}}const br=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var i,o;const{x:s,y:r,placement:a,middlewareData:c}=e,d=await mr(e,t);return a===((i=c.offset)==null?void 0:i.placement)&&(o=c.arrow)!=null&&o.alignmentOffset?{}:{x:s+d.x,y:r+d.y,data:{...d,placement:a}}}}},gr=function(t){return t===void 0&&(t={}),{name:"shift",options:t,async fn(e){const{x:i,y:o,placement:s}=e,{mainAxis:r=!0,crossAxis:a=!1,limiter:c={fn:$=>{let{x:_,y:A}=$;return{x:_,y:A}}},...d}=ie(t,e),u={x:i,y:o},h=await Li(e,d),p=Ct(Pt(s)),b=Lo(p);let m=u[b],g=u[p];if(r){const $=b==="y"?"top":"left",_=b==="y"?"bottom":"right",A=m+h[$],P=m-h[_];m=mi(A,m,P)}if(a){const $=p==="y"?"top":"left",_=p==="y"?"bottom":"right",A=g+h[$],P=g-h[_];g=mi(A,g,P)}const x=c.fn({...e,[b]:m,[p]:g});return{...x,data:{x:x.x-i,y:x.y-o,enabled:{[b]:r,[p]:a}}}}}},vr=function(t){return t===void 0&&(t={}),{name:"size",options:t,async fn(e){var i,o;const{placement:s,rects:r,platform:a,elements:c}=e,{apply:d=()=>{},...u}=ie(t,e),h=await Li(e,u),p=Pt(s),b=oe(s),m=Ct(s)==="y",{width:g,height:x}=r.floating;let $,_;p==="top"||p==="bottom"?($=p,_=b===(await(a.isRTL==null?void 0:a.isRTL(c.floating))?"start":"end")?"left":"right"):(_=p,$=b==="end"?"top":"bottom");const A=x-h.top-h.bottom,P=g-h.left-h.right,F=Lt(x-h[$],A),M=Lt(g-h[_],P),dt=!e.middlewareData.shift;let j=F,_t=M;if((i=e.middlewareData.shift)!=null&&i.enabled.x&&(_t=P),(o=e.middlewareData.shift)!=null&&o.enabled.y&&(j=A),dt&&!b){const rt=Q(h.left,0),Et=Q(h.right,0),gt=Q(h.top,0),At=Q(h.bottom,0);m?_t=g-2*(rt!==0||Et!==0?rt+Et:Q(h.left,h.right)):j=x-2*(gt!==0||At!==0?gt+At:Q(h.top,h.bottom))}await d({...e,availableWidth:_t,availableHeight:j});const bt=await a.getDimensions(c.floating);return g!==bt.width||x!==bt.height?{reset:{rects:!0}}:{}}}};function We(){return typeof window<"u"}function se(t){return Do(t)?(t.nodeName||"").toLowerCase():"#document"}function J(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function wt(t){var e;return(e=(Do(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function Do(t){return We()?t instanceof Node||t instanceof J(t).Node:!1}function ft(t){return We()?t instanceof Element||t instanceof J(t).Element:!1}function yt(t){return We()?t instanceof HTMLElement||t instanceof J(t).HTMLElement:!1}function so(t){return!We()||typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof J(t).ShadowRoot}const yr=new Set(["inline","contents"]);function $e(t){const{overflow:e,overflowX:i,overflowY:o,display:s}=mt(t);return/auto|scroll|overlay|hidden|clip/.test(e+o+i)&&!yr.has(s)}const wr=new Set(["table","td","th"]);function xr(t){return wr.has(se(t))}const _r=[":popover-open",":modal"];function Ke(t){return _r.some(e=>{try{return t.matches(e)}catch{return!1}})}const kr=["transform","translate","scale","rotate","perspective"],$r=["transform","translate","scale","rotate","perspective","filter"],Cr=["paint","layout","strict","content"];function Ye(t){const e=Pi(),i=ft(t)?mt(t):t;return kr.some(o=>i[o]?i[o]!=="none":!1)||(i.containerType?i.containerType!=="normal":!1)||!e&&(i.backdropFilter?i.backdropFilter!=="none":!1)||!e&&(i.filter?i.filter!=="none":!1)||$r.some(o=>(i.willChange||"").includes(o))||Cr.some(o=>(i.contain||"").includes(o))}function Sr(t){let e=Dt(t);for(;yt(e)&&!Jt(e);){if(Ye(e))return e;if(Ke(e))return null;e=Dt(e)}return null}function Pi(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Er=new Set(["html","body","#document"]);function Jt(t){return Er.has(se(t))}function mt(t){return J(t).getComputedStyle(t)}function Xe(t){return ft(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function Dt(t){if(se(t)==="html")return t;const e=t.assignedSlot||t.parentNode||so(t)&&t.host||wt(t);return so(e)?e.host:e}function Ro(t){const e=Dt(t);return Jt(e)?t.ownerDocument?t.ownerDocument.body:t.body:yt(e)&&$e(e)?e:Ro(e)}function xe(t,e,i){var o;e===void 0&&(e=[]),i===void 0&&(i=!0);const s=Ro(t),r=s===((o=t.ownerDocument)==null?void 0:o.body),a=J(s);if(r){const c=gi(a);return e.concat(a,a.visualViewport||[],$e(s)?s:[],c&&i?xe(c):[])}return e.concat(s,xe(s,[],i))}function gi(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function Mo(t){const e=mt(t);let i=parseFloat(e.width)||0,o=parseFloat(e.height)||0;const s=yt(t),r=s?t.offsetWidth:i,a=s?t.offsetHeight:o,c=Ie(i)!==r||Ie(o)!==a;return c&&(i=r,o=a),{width:i,height:o,$:c}}function Di(t){return ft(t)?t:t.contextElement}function Gt(t){const e=Di(t);if(!yt(e))return vt(1);const i=e.getBoundingClientRect(),{width:o,height:s,$:r}=Mo(e);let a=(r?Ie(i.width):i.width)/o,c=(r?Ie(i.height):i.height)/s;return(!a||!Number.isFinite(a))&&(a=1),(!c||!Number.isFinite(c))&&(c=1),{x:a,y:c}}const Ar=vt(0);function Io(t){const e=J(t);return!Pi()||!e.visualViewport?Ar:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function Tr(t,e,i){return e===void 0&&(e=!1),!i||e&&i!==J(t)?!1:e}function jt(t,e,i,o){e===void 0&&(e=!1),i===void 0&&(i=!1);const s=t.getBoundingClientRect(),r=Di(t);let a=vt(1);e&&(o?ft(o)&&(a=Gt(o)):a=Gt(t));const c=Tr(r,i,o)?Io(r):vt(0);let d=(s.left+c.x)/a.x,u=(s.top+c.y)/a.y,h=s.width/a.x,p=s.height/a.y;if(r){const b=J(r),m=o&&ft(o)?J(o):o;let g=b,x=gi(g);for(;x&&o&&m!==g;){const $=Gt(x),_=x.getBoundingClientRect(),A=mt(x),P=_.left+(x.clientLeft+parseFloat(A.paddingLeft))*$.x,F=_.top+(x.clientTop+parseFloat(A.paddingTop))*$.y;d*=$.x,u*=$.y,h*=$.x,p*=$.y,d+=P,u+=F,g=J(x),x=gi(g)}}return Fe({width:h,height:p,x:d,y:u})}function Ge(t,e){const i=Xe(t).scrollLeft;return e?e.left+i:jt(wt(t)).left+i}function Bo(t,e){const i=t.getBoundingClientRect(),o=i.left+e.scrollLeft-Ge(t,i),s=i.top+e.scrollTop;return{x:o,y:s}}function zr(t){let{elements:e,rect:i,offsetParent:o,strategy:s}=t;const r=s==="fixed",a=wt(o),c=e?Ke(e.floating):!1;if(o===a||c&&r)return i;let d={scrollLeft:0,scrollTop:0},u=vt(1);const h=vt(0),p=yt(o);if((p||!p&&!r)&&((se(o)!=="body"||$e(a))&&(d=Xe(o)),yt(o))){const m=jt(o);u=Gt(o),h.x=m.x+o.clientLeft,h.y=m.y+o.clientTop}const b=a&&!p&&!r?Bo(a,d):vt(0);return{width:i.width*u.x,height:i.height*u.y,x:i.x*u.x-d.scrollLeft*u.x+h.x+b.x,y:i.y*u.y-d.scrollTop*u.y+h.y+b.y}}function Or(t){return Array.from(t.getClientRects())}function Lr(t){const e=wt(t),i=Xe(t),o=t.ownerDocument.body,s=Q(e.scrollWidth,e.clientWidth,o.scrollWidth,o.clientWidth),r=Q(e.scrollHeight,e.clientHeight,o.scrollHeight,o.clientHeight);let a=-i.scrollLeft+Ge(t);const c=-i.scrollTop;return mt(o).direction==="rtl"&&(a+=Q(e.clientWidth,o.clientWidth)-s),{width:s,height:r,x:a,y:c}}const ro=25;function Pr(t,e){const i=J(t),o=wt(t),s=i.visualViewport;let r=o.clientWidth,a=o.clientHeight,c=0,d=0;if(s){r=s.width,a=s.height;const h=Pi();(!h||h&&e==="fixed")&&(c=s.offsetLeft,d=s.offsetTop)}const u=Ge(o);if(u<=0){const h=o.ownerDocument,p=h.body,b=getComputedStyle(p),m=h.compatMode==="CSS1Compat"&&parseFloat(b.marginLeft)+parseFloat(b.marginRight)||0,g=Math.abs(o.clientWidth-p.clientWidth-m);g<=ro&&(r-=g)}else u<=ro&&(r+=u);return{width:r,height:a,x:c,y:d}}const Dr=new Set(["absolute","fixed"]);function Rr(t,e){const i=jt(t,!0,e==="fixed"),o=i.top+t.clientTop,s=i.left+t.clientLeft,r=yt(t)?Gt(t):vt(1),a=t.clientWidth*r.x,c=t.clientHeight*r.y,d=s*r.x,u=o*r.y;return{width:a,height:c,x:d,y:u}}function ao(t,e,i){let o;if(e==="viewport")o=Pr(t,i);else if(e==="document")o=Lr(wt(t));else if(ft(e))o=Rr(e,i);else{const s=Io(t);o={x:e.x-s.x,y:e.y-s.y,width:e.width,height:e.height}}return Fe(o)}function Fo(t,e){const i=Dt(t);return i===e||!ft(i)||Jt(i)?!1:mt(i).position==="fixed"||Fo(i,e)}function Mr(t,e){const i=e.get(t);if(i)return i;let o=xe(t,[],!1).filter(c=>ft(c)&&se(c)!=="body"),s=null;const r=mt(t).position==="fixed";let a=r?Dt(t):t;for(;ft(a)&&!Jt(a);){const c=mt(a),d=Ye(a);!d&&c.position==="fixed"&&(s=null),(r?!d&&!s:!d&&c.position==="static"&&!!s&&Dr.has(s.position)||$e(a)&&!d&&Fo(t,a))?o=o.filter(h=>h!==a):s=c,a=Dt(a)}return e.set(t,o),o}function Ir(t){let{element:e,boundary:i,rootBoundary:o,strategy:s}=t;const a=[...i==="clippingAncestors"?Ke(e)?[]:Mr(e,this._c):[].concat(i),o],c=a[0],d=a.reduce((u,h)=>{const p=ao(e,h,s);return u.top=Q(p.top,u.top),u.right=Lt(p.right,u.right),u.bottom=Lt(p.bottom,u.bottom),u.left=Q(p.left,u.left),u},ao(e,c,s));return{width:d.right-d.left,height:d.bottom-d.top,x:d.left,y:d.top}}function Br(t){const{width:e,height:i}=Mo(t);return{width:e,height:i}}function Fr(t,e,i){const o=yt(e),s=wt(e),r=i==="fixed",a=jt(t,!0,r,e);let c={scrollLeft:0,scrollTop:0};const d=vt(0);function u(){d.x=Ge(s)}if(o||!o&&!r)if((se(e)!=="body"||$e(s))&&(c=Xe(e)),o){const m=jt(e,!0,r,e);d.x=m.x+e.clientLeft,d.y=m.y+e.clientTop}else s&&u();r&&!o&&s&&u();const h=s&&!o&&!r?Bo(s,c):vt(0),p=a.left+c.scrollLeft-d.x-h.x,b=a.top+c.scrollTop-d.y-h.y;return{x:p,y:b,width:a.width,height:a.height}}function ni(t){return mt(t).position==="static"}function no(t,e){if(!yt(t)||mt(t).position==="fixed")return null;if(e)return e(t);let i=t.offsetParent;return wt(t)===i&&(i=i.ownerDocument.body),i}function No(t,e){const i=J(t);if(Ke(t))return i;if(!yt(t)){let s=Dt(t);for(;s&&!Jt(s);){if(ft(s)&&!ni(s))return s;s=Dt(s)}return i}let o=no(t,e);for(;o&&xr(o)&&ni(o);)o=no(o,e);return o&&Jt(o)&&ni(o)&&!Ye(o)?i:o||Sr(t)||i}const Nr=async function(t){const e=this.getOffsetParent||No,i=this.getDimensions,o=await i(t.floating);return{reference:Fr(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function Vr(t){return mt(t).direction==="rtl"}const Pe={convertOffsetParentRelativeRectToViewportRelativeRect:zr,getDocumentElement:wt,getClippingRect:Ir,getOffsetParent:No,getElementRects:Nr,getClientRects:Or,getDimensions:Br,getScale:Gt,isElement:ft,isRTL:Vr};function Vo(t,e){return t.x===e.x&&t.y===e.y&&t.width===e.width&&t.height===e.height}function Hr(t,e){let i=null,o;const s=wt(t);function r(){var c;clearTimeout(o),(c=i)==null||c.disconnect(),i=null}function a(c,d){c===void 0&&(c=!1),d===void 0&&(d=1),r();const u=t.getBoundingClientRect(),{left:h,top:p,width:b,height:m}=u;if(c||e(),!b||!m)return;const g=Te(p),x=Te(s.clientWidth-(h+b)),$=Te(s.clientHeight-(p+m)),_=Te(h),P={rootMargin:-g+"px "+-x+"px "+-$+"px "+-_+"px",threshold:Q(0,Lt(1,d))||1};let F=!0;function M(dt){const j=dt[0].intersectionRatio;if(j!==d){if(!F)return a();j?a(!1,j):o=setTimeout(()=>{a(!1,1e-7)},1e3)}j===1&&!Vo(u,t.getBoundingClientRect())&&a(),F=!1}try{i=new IntersectionObserver(M,{...P,root:s.ownerDocument})}catch{i=new IntersectionObserver(M,P)}i.observe(t)}return a(!0),r}function Ur(t,e,i,o){o===void 0&&(o={});const{ancestorScroll:s=!0,ancestorResize:r=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:c=typeof IntersectionObserver=="function",animationFrame:d=!1}=o,u=Di(t),h=s||r?[...u?xe(u):[],...xe(e)]:[];h.forEach(_=>{s&&_.addEventListener("scroll",i,{passive:!0}),r&&_.addEventListener("resize",i)});const p=u&&c?Hr(u,i):null;let b=-1,m=null;a&&(m=new ResizeObserver(_=>{let[A]=_;A&&A.target===u&&m&&(m.unobserve(e),cancelAnimationFrame(b),b=requestAnimationFrame(()=>{var P;(P=m)==null||P.observe(e)})),i()}),u&&!d&&m.observe(u),m.observe(e));let g,x=d?jt(t):null;d&&$();function $(){const _=jt(t);x&&!Vo(x,_)&&i(),x=_,g=requestAnimationFrame($)}return i(),()=>{var _;h.forEach(A=>{s&&A.removeEventListener("scroll",i),r&&A.removeEventListener("resize",i)}),p==null||p(),(_=m)==null||_.disconnect(),m=null,d&&cancelAnimationFrame(g)}}const jr=br,qr=gr,Wr=pr,lo=vr,Kr=hr,Yr=(t,e,i)=>{const o=new Map,s={platform:Pe,...i},r={...s.platform,_c:o};return ur(t,e,{...s,platform:r})};function Xr(t){return Gr(t)}function li(t){return t.assignedSlot?t.assignedSlot:t.parentNode instanceof ShadowRoot?t.parentNode.host:t.parentNode}function Gr(t){for(let e=t;e;e=li(e))if(e instanceof Element&&getComputedStyle(e).display==="none")return null;for(let e=li(t);e;e=li(e)){if(!(e instanceof Element))continue;const i=getComputedStyle(e);if(i.display!=="contents"&&(i.position!=="static"||Ye(i)||e.tagName==="BODY"))return e}return null}function Zr(t){return t!==null&&typeof t=="object"&&"getBoundingClientRect"in t&&("contextElement"in t?t.contextElement instanceof Element:!0)}var O=class extends D{constructor(){super(...arguments),this.localize=new tt(this),this.active=!1,this.placement="top",this.strategy="absolute",this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement="anchor",this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements="",this.flipFallbackStrategy="best-fit",this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){const t=this.anchorEl.getBoundingClientRect(),e=this.popup.getBoundingClientRect(),i=this.placement.includes("top")||this.placement.includes("bottom");let o=0,s=0,r=0,a=0,c=0,d=0,u=0,h=0;i?t.top<e.top?(o=t.left,s=t.bottom,r=t.right,a=t.bottom,c=e.left,d=e.top,u=e.right,h=e.top):(o=e.left,s=e.bottom,r=e.right,a=e.bottom,c=t.left,d=t.top,u=t.right,h=t.top):t.left<e.left?(o=t.right,s=t.top,r=e.left,a=e.top,c=t.right,d=t.bottom,u=e.left,h=e.bottom):(o=e.right,s=e.top,r=t.left,a=t.top,c=e.right,d=e.bottom,u=t.left,h=t.bottom),this.style.setProperty("--hover-bridge-top-left-x",`${o}px`),this.style.setProperty("--hover-bridge-top-left-y",`${s}px`),this.style.setProperty("--hover-bridge-top-right-x",`${r}px`),this.style.setProperty("--hover-bridge-top-right-y",`${a}px`),this.style.setProperty("--hover-bridge-bottom-left-x",`${c}px`),this.style.setProperty("--hover-bridge-bottom-left-y",`${d}px`),this.style.setProperty("--hover-bridge-bottom-right-x",`${u}px`),this.style.setProperty("--hover-bridge-bottom-right-y",`${h}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(t){super.updated(t),t.has("active")&&(this.active?this.start():this.stop()),t.has("anchor")&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor=="string"){const t=this.getRootNode();this.anchorEl=t.getElementById(this.anchor)}else this.anchor instanceof Element||Zr(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector('[slot="anchor"]');this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Ur(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(t=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute("data-current-placement"),this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height"),requestAnimationFrame(()=>t())):t()})}reposition(){if(!this.active||!this.anchorEl)return;const t=[jr({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?t.push(lo({apply:({rects:i})=>{const o=this.sync==="width"||this.sync==="both",s=this.sync==="height"||this.sync==="both";this.popup.style.width=o?`${i.reference.width}px`:"",this.popup.style.height=s?`${i.reference.height}px`:""}})):(this.popup.style.width="",this.popup.style.height=""),this.flip&&t.push(Wr({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy==="best-fit"?"bestFit":"initialPlacement",padding:this.flipPadding})),this.shift&&t.push(qr({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?t.push(lo({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:i,availableHeight:o})=>{this.autoSize==="vertical"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-height",`${o}px`):this.style.removeProperty("--auto-size-available-height"),this.autoSize==="horizontal"||this.autoSize==="both"?this.style.setProperty("--auto-size-available-width",`${i}px`):this.style.removeProperty("--auto-size-available-width")}})):(this.style.removeProperty("--auto-size-available-width"),this.style.removeProperty("--auto-size-available-height")),this.arrow&&t.push(Kr({element:this.arrowEl,padding:this.arrowPadding}));const e=this.strategy==="absolute"?i=>Pe.getOffsetParent(i,Xr):Pe.getOffsetParent;Yr(this.anchorEl,this.popup,{placement:this.placement,middleware:t,strategy:this.strategy,platform:He(Wt({},Pe),{getOffsetParent:e})}).then(({x:i,y:o,middlewareData:s,placement:r})=>{const a=this.localize.dir()==="rtl",c={top:"bottom",right:"left",bottom:"top",left:"right"}[r.split("-")[0]];if(this.setAttribute("data-current-placement",r),Object.assign(this.popup.style,{left:`${i}px`,top:`${o}px`}),this.arrow){const d=s.arrow.x,u=s.arrow.y;let h="",p="",b="",m="";if(this.arrowPlacement==="start"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";h=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"",p=a?g:"",m=a?"":g}else if(this.arrowPlacement==="end"){const g=typeof d=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:"";p=a?"":g,m=a?g:"",b=typeof u=="number"?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:""}else this.arrowPlacement==="center"?(m=typeof d=="number"?"calc(50% - var(--arrow-size-diagonal))":"",h=typeof u=="number"?"calc(50% - var(--arrow-size-diagonal))":""):(m=typeof d=="number"?`${d}px`:"",h=typeof u=="number"?`${u}px`:"");Object.assign(this.arrowEl.style,{top:h,right:p,bottom:b,left:m,[c]:"calc(var(--arrow-size-diagonal) * -1)"})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit("sl-reposition")}render(){return f`
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
        ${this.arrow?f`<div part="arrow" class="popup__arrow" role="presentation"></div>`:""}
      </div>
    `}};O.styles=[B,tr];n([S(".popup")],O.prototype,"popup",2);n([S(".popup__arrow")],O.prototype,"arrowEl",2);n([l()],O.prototype,"anchor",2);n([l({type:Boolean,reflect:!0})],O.prototype,"active",2);n([l({reflect:!0})],O.prototype,"placement",2);n([l({reflect:!0})],O.prototype,"strategy",2);n([l({type:Number})],O.prototype,"distance",2);n([l({type:Number})],O.prototype,"skidding",2);n([l({type:Boolean})],O.prototype,"arrow",2);n([l({attribute:"arrow-placement"})],O.prototype,"arrowPlacement",2);n([l({attribute:"arrow-padding",type:Number})],O.prototype,"arrowPadding",2);n([l({type:Boolean})],O.prototype,"flip",2);n([l({attribute:"flip-fallback-placements",converter:{fromAttribute:t=>t.split(" ").map(e=>e.trim()).filter(e=>e!==""),toAttribute:t=>t.join(" ")}})],O.prototype,"flipFallbackPlacements",2);n([l({attribute:"flip-fallback-strategy"})],O.prototype,"flipFallbackStrategy",2);n([l({type:Object})],O.prototype,"flipBoundary",2);n([l({attribute:"flip-padding",type:Number})],O.prototype,"flipPadding",2);n([l({type:Boolean})],O.prototype,"shift",2);n([l({type:Object})],O.prototype,"shiftBoundary",2);n([l({attribute:"shift-padding",type:Number})],O.prototype,"shiftPadding",2);n([l({attribute:"auto-size"})],O.prototype,"autoSize",2);n([l()],O.prototype,"sync",2);n([l({type:Object})],O.prototype,"autoSizeBoundary",2);n([l({attribute:"auto-size-padding",type:Number})],O.prototype,"autoSizePadding",2);n([l({attribute:"hover-bridge",type:Boolean})],O.prototype,"hoverBridge",2);var Ho=new Map,Qr=new WeakMap;function Jr(t){return t??{keyframes:[],options:{duration:0}}}function co(t,e){return e.toLowerCase()==="rtl"?{keyframes:t.rtlKeyframes||t.keyframes,options:t.options}:t}function R(t,e){Ho.set(t,Jr(e))}function N(t,e,i){const o=Qr.get(t);if(o!=null&&o[e])return co(o[e],i.dir);const s=Ho.get(e);return s?co(s,i.dir):{keyframes:[],options:{duration:0}}}function nt(t,e){return new Promise(i=>{function o(s){s.target===t&&(t.removeEventListener(e,o),i())}t.addEventListener(e,o)})}function V(t,e,i){return new Promise(o=>{if((i==null?void 0:i.duration)===1/0)throw new Error("Promise-based animations must be finite.");const s=t.animate(e,He(Wt({},i),{duration:ta()?0:i.duration}));s.addEventListener("cancel",o,{once:!0}),s.addEventListener("finish",o,{once:!0})})}function uo(t){return t=t.toString().toLowerCase(),t.indexOf("ms")>-1?parseFloat(t):t.indexOf("s")>-1?parseFloat(t)*1e3:parseFloat(t)}function ta(){return window.matchMedia("(prefers-reduced-motion: reduce)").matches}function q(t){return Promise.all(t.getAnimations().map(e=>new Promise(i=>{e.cancel(),requestAnimationFrame(i)})))}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let vi=class extends je{constructor(e){if(super(e),this.it=C,e.type!==$t.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===C||e==null)return this._t=void 0,this.it=e;if(e===at)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const i=[e];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};vi.directiveName="unsafeHTML",vi.resultType=1;const ea=Ue(vi);var k=class extends D{constructor(){super(...arguments),this.formControlController=new ke(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new St(this,"help-text","label"),this.localize=new tt(this),this.typeToSelectString="",this.hasFocus=!1,this.displayLabel="",this.selectedOptions=[],this.valueHasChanged=!1,this.name="",this._value="",this.defaultValue="",this.size="medium",this.placeholder="",this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label="",this.placement="bottom",this.helpText="",this.form="",this.required=!1,this.getTag=t=>f`
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
    `,this.handleDocumentFocusIn=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()},this.handleDocumentKeyDown=t=>{const e=t.target,i=e.closest(".select__clear")!==null,o=e.closest("sl-icon-button")!==null;if(!(i||o)){if(t.key==="Escape"&&this.open&&!this.closeWatcher&&(t.preventDefault(),t.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),t.key==="Enter"||t.key===" "&&this.typeToSelectString===""){if(t.preventDefault(),t.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if(["ArrowUp","ArrowDown","Home","End"].includes(t.key)){const s=this.getAllOptions(),r=s.indexOf(this.currentOption);let a=Math.max(0,r);if(t.preventDefault(),!this.open&&(this.show(),this.currentOption))return;t.key==="ArrowDown"?(a=r+1,a>s.length-1&&(a=0)):t.key==="ArrowUp"?(a=r-1,a<0&&(a=s.length-1)):t.key==="Home"?a=0:t.key==="End"&&(a=s.length-1),this.setCurrentOption(s[a])}if(t.key&&t.key.length===1||t.key==="Backspace"){const s=this.getAllOptions();if(t.metaKey||t.ctrlKey||t.altKey)return;if(!this.open){if(t.key==="Backspace")return;this.show()}t.stopPropagation(),t.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString="",1e3),t.key==="Backspace"?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=t.key.toLowerCase();for(const r of s)if(r.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(r);break}}}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this&&!e.includes(this)&&this.hide()}}get value(){return this._value}set value(t){this.multiple?t=Array.isArray(t)?t:t.split(" "):t=Array.isArray(t)?t.join(" "):t,this._value!==t&&(this.valueHasChanged=!0,this._value=t)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var t;document.addEventListener("focusin",this.handleDocumentFocusIn),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener("focusin",this.handleDocumentFocusIn),"CloseWatcher"in window&&((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var t;document.removeEventListener("focusin",this.handleDocumentFocusIn),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener("focusin",this.handleDocumentFocusIn),(t=this.closeWatcher)==null||t.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit("sl-focus")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(t){const i=t.composedPath().some(o=>o instanceof Element&&o.tagName.toLowerCase()==="sl-icon-button");this.disabled||i||(t.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(t){t.key!=="Tab"&&(t.stopPropagation(),this.handleDocumentKeyDown(t))}handleClearClick(t){t.stopPropagation(),this.valueHasChanged=!0,this.value!==""&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit("sl-clear"),this.emit("sl-input"),this.emit("sl-change")}))}handleClearMouseDown(t){t.stopPropagation(),t.preventDefault()}handleOptionClick(t){const i=t.target.closest("sl-option"),o=this.value;i&&!i.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(i):this.setSelectedOptions(i),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==o&&this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get("sl-option")||customElements.whenDefined("sl-option").then(()=>this.handleDefaultSlotChange());const t=this.getAllOptions(),e=this.valueHasChanged?this.value:this.defaultValue,i=Array.isArray(e)?e:[e],o=[];t.forEach(s=>o.push(s.value)),this.setSelectedOptions(t.filter(s=>i.includes(s.value)))}handleTagRemove(t,e){t.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(e,!1),this.updateComplete.then(()=>{this.emit("sl-input"),this.emit("sl-change")}))}getAllOptions(){return[...this.querySelectorAll("sl-option")]}getFirstOption(){return this.querySelector("sl-option")}setCurrentOption(t){this.getAllOptions().forEach(i=>{i.current=!1,i.tabIndex=-1}),t&&(this.currentOption=t,t.current=!0,t.tabIndex=0,t.focus())}setSelectedOptions(t){const e=this.getAllOptions(),i=Array.isArray(t)?t:[t];e.forEach(o=>o.selected=!1),i.length&&i.forEach(o=>o.selected=!0),this.selectionChanged()}toggleOptionSelection(t,e){e===!0||e===!1?t.selected=e:t.selected=!t.selected,this.selectionChanged()}selectionChanged(){var t,e,i;const o=this.getAllOptions();this.selectedOptions=o.filter(r=>r.selected);const s=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(r=>r.value),this.placeholder&&this.value.length===0?this.displayLabel="":this.displayLabel=this.localize.term("numOptionsSelected",this.selectedOptions.length);else{const r=this.selectedOptions[0];this.value=(t=r==null?void 0:r.value)!=null?t:"",this.displayLabel=(i=(e=r==null?void 0:r.getTextLabel)==null?void 0:e.call(r))!=null?i:""}this.valueHasChanged=s,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((t,e)=>{if(e<this.maxOptionsVisible||this.maxOptionsVisible<=0){const i=this.getTag(t,e);return f`<div @sl-remove=${o=>this.handleTagRemove(o,t)}>
          ${typeof i=="string"?ea(i):i}
        </div>`}else if(e===this.maxOptionsVisible)return f`<sl-tag size=${this.size}>+${this.selectedOptions.length-e}</sl-tag>`;return f``})}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(t,e,i){if(super.attributeChangedCallback(t,e,i),t==="value"){const o=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=o}}handleValueChange(){if(!this.valueHasChanged){const i=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=i}const t=this.getAllOptions(),e=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(t.filter(i=>e.includes(i.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit("sl-show"),this.addOpenListeners(),await q(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});const{keyframes:t,options:e}=N(this,"select.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.currentOption&&Js(this.currentOption,this.listbox,"vertical","auto"),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await q(this);const{keyframes:t,options:e}=N(this,"select.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.listbox.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,nt(this,"sl-after-show")}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,nt(this,"sl-after-hide")}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(t){this.valueInput.setCustomValidity(t),this.formControlController.updateValidity()}focus(t){this.displayInput.focus(t)}blur(){this.displayInput.blur()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e,s=this.clearable&&!this.disabled&&this.value.length>0,r=this.placeholder&&this.value&&this.value.length<=0;return f`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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

              ${this.multiple?f`<div part="tags" class="select__tags">${this.tags}</div>`:""}

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

              ${s?f`
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
    `}};k.styles=[B,qe,Xs];k.dependencies={"sl-icon":W,"sl-popup":O,"sl-tag":Kt};n([S(".select")],k.prototype,"popup",2);n([S(".select__combobox")],k.prototype,"combobox",2);n([S(".select__display-input")],k.prototype,"displayInput",2);n([S(".select__value-input")],k.prototype,"valueInput",2);n([S(".select__listbox")],k.prototype,"listbox",2);n([w()],k.prototype,"hasFocus",2);n([w()],k.prototype,"displayLabel",2);n([w()],k.prototype,"currentOption",2);n([w()],k.prototype,"selectedOptions",2);n([w()],k.prototype,"valueHasChanged",2);n([l()],k.prototype,"name",2);n([w()],k.prototype,"value",1);n([l({attribute:"value"})],k.prototype,"defaultValue",2);n([l({reflect:!0})],k.prototype,"size",2);n([l()],k.prototype,"placeholder",2);n([l({type:Boolean,reflect:!0})],k.prototype,"multiple",2);n([l({attribute:"max-options-visible",type:Number})],k.prototype,"maxOptionsVisible",2);n([l({type:Boolean,reflect:!0})],k.prototype,"disabled",2);n([l({type:Boolean})],k.prototype,"clearable",2);n([l({type:Boolean,reflect:!0})],k.prototype,"open",2);n([l({type:Boolean})],k.prototype,"hoist",2);n([l({type:Boolean,reflect:!0})],k.prototype,"filled",2);n([l({type:Boolean,reflect:!0})],k.prototype,"pill",2);n([l()],k.prototype,"label",2);n([l({reflect:!0})],k.prototype,"placement",2);n([l({attribute:"help-text"})],k.prototype,"helpText",2);n([l({reflect:!0})],k.prototype,"form",2);n([l({type:Boolean,reflect:!0})],k.prototype,"required",2);n([l()],k.prototype,"getTag",2);n([T("disabled",{waitUntilFirstUpdate:!0})],k.prototype,"handleDisabledChange",1);n([T(["defaultValue","value"],{waitUntilFirstUpdate:!0})],k.prototype,"handleValueChange",1);n([T("open",{waitUntilFirstUpdate:!0})],k.prototype,"handleOpenChange",1);R("select.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("select.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});k.define("sl-select");var ia=L`
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
`,lt=class extends D{constructor(){super(...arguments),this.localize=new tt(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value="",this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.setAttribute("aria-selected","false")}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined("sl-select").then(()=>{const t=this.closest("sl-select");t&&t.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleSelectedChange(){this.setAttribute("aria-selected",this.selected?"true":"false")}handleValueChange(){typeof this.value!="string"&&(this.value=String(this.value)),this.value.includes(" ")&&(console.error("Option values cannot include a space. All spaces have been replaced with underscores.",this),this.value=this.value.replace(/ /g,"_"))}getTextLabel(){const t=this.childNodes;let e="";return[...t].forEach(i=>{i.nodeType===Node.ELEMENT_NODE&&(i.hasAttribute("slot")||(e+=i.textContent)),i.nodeType===Node.TEXT_NODE&&(e+=i.textContent)}),e.trim()}render(){return f`
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
    `}};lt.styles=[B,ia];lt.dependencies={"sl-icon":W};n([S(".option__label")],lt.prototype,"defaultSlot",2);n([w()],lt.prototype,"current",2);n([w()],lt.prototype,"selected",2);n([w()],lt.prototype,"hasHover",2);n([l({reflect:!0})],lt.prototype,"value",2);n([l({type:Boolean,reflect:!0})],lt.prototype,"disabled",2);n([T("disabled")],lt.prototype,"handleDisabledChange",1);n([T("selected")],lt.prototype,"handleSelectedChange",1);n([T("value")],lt.prototype,"handleValueChange",1);lt.define("sl-option");var oa=L`
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
`;function*Ri(t=document.activeElement){t!=null&&(yield t,"shadowRoot"in t&&t.shadowRoot&&t.shadowRoot.mode!=="closed"&&(yield*Ss(Ri(t.shadowRoot.activeElement))))}function Uo(){return[...Ri()].pop()}var ho=new WeakMap;function jo(t){let e=ho.get(t);return e||(e=window.getComputedStyle(t,null),ho.set(t,e)),e}function sa(t){if(typeof t.checkVisibility=="function")return t.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});const e=jo(t);return e.visibility!=="hidden"&&e.display!=="none"}function ra(t){const e=jo(t),{overflowY:i,overflowX:o}=e;return i==="scroll"||o==="scroll"?!0:i!=="auto"||o!=="auto"?!1:t.scrollHeight>t.clientHeight&&i==="auto"||t.scrollWidth>t.clientWidth&&o==="auto"}function aa(t){const e=t.tagName.toLowerCase(),i=Number(t.getAttribute("tabindex"));if(t.hasAttribute("tabindex")&&(isNaN(i)||i<=-1)||t.hasAttribute("disabled")||t.closest("[inert]"))return!1;if(e==="input"&&t.getAttribute("type")==="radio"){const r=t.getRootNode(),a=`input[type='radio'][name="${t.getAttribute("name")}"]`,c=r.querySelector(`${a}:checked`);return c?c===t:r.querySelector(a)===t}return sa(t)?(e==="audio"||e==="video")&&t.hasAttribute("controls")||t.hasAttribute("tabindex")||t.hasAttribute("contenteditable")&&t.getAttribute("contenteditable")!=="false"||["button","input","select","textarea","a","audio","video","summary","iframe"].includes(e)?!0:ra(t):!1}function na(t){var e,i;const o=yi(t),s=(e=o[0])!=null?e:null,r=(i=o[o.length-1])!=null?i:null;return{start:s,end:r}}function la(t,e){var i;return((i=t.getRootNode({composed:!0}))==null?void 0:i.host)!==e}function yi(t){const e=new WeakMap,i=[];function o(s){if(s instanceof Element){if(s.hasAttribute("inert")||s.closest("[inert]")||e.has(s))return;e.set(s,!0),!i.includes(s)&&aa(s)&&i.push(s),s instanceof HTMLSlotElement&&la(s,t)&&s.assignedElements({flatten:!0}).forEach(r=>{o(r)}),s.shadowRoot!==null&&s.shadowRoot.mode==="open"&&o(s.shadowRoot)}for(const r of s.children)o(r)}return o(t),i.sort((s,r)=>{const a=Number(s.getAttribute("tabindex"))||0;return(Number(r.getAttribute("tabindex"))||0)-a})}var he=[],qo=class{constructor(t){this.tabDirection="forward",this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=e=>{var i;if(e.key!=="Tab"||this.isExternalActivated||!this.isActive())return;const o=Uo();if(this.previousFocus=o,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;e.shiftKey?this.tabDirection="backward":this.tabDirection="forward";const s=yi(this.element);let r=s.findIndex(c=>c===o);this.previousFocus=this.currentFocus;const a=this.tabDirection==="forward"?1:-1;for(;;){r+a>=s.length?r=0:r+a<0?r=s.length-1:r+=a,this.previousFocus=this.currentFocus;const c=s[r];if(this.tabDirection==="backward"&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||c&&this.possiblyHasTabbableChildren(c))return;e.preventDefault(),this.currentFocus=c,(i=this.currentFocus)==null||i.focus({preventScroll:!1});const d=[...Ri()];if(d.includes(this.currentFocus)||!d.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection="forward"},this.element=t,this.elementsWithTabbableControls=["iframe"]}activate(){he.push(this.element),document.addEventListener("focusin",this.handleFocusIn),document.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keyup",this.handleKeyUp)}deactivate(){he=he.filter(t=>t!==this.element),this.currentFocus=null,document.removeEventListener("focusin",this.handleFocusIn),document.removeEventListener("keydown",this.handleKeyDown),document.removeEventListener("keyup",this.handleKeyUp)}isActive(){return he[he.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){const t=yi(this.element);if(!this.element.matches(":focus-within")){const e=t[0],i=t[t.length-1],o=this.tabDirection==="forward"?e:i;typeof(o==null?void 0:o.focus)=="function"&&(this.currentFocus=o,o.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(t){return this.elementsWithTabbableControls.includes(t.tagName.toLowerCase())||t.hasAttribute("controls")}},Mi=t=>{var e;const{activeElement:i}=document;i&&t.contains(i)&&((e=document.activeElement)==null||e.blur())};function po(t){return t.charAt(0).toUpperCase()+t.slice(1)}var et=class extends D{constructor(){super(...arguments),this.hasSlotController=new St(this,"footer"),this.localize=new tt(this),this.modal=new qo(this),this.open=!1,this.label="",this.placement="end",this.contained=!1,this.noHeader=!1,this.handleDocumentKeyDown=t=>{this.contained||t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopImmediatePropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.drawer.hidden=!this.open,this.open&&(this.addOpenListeners(),this.contained||(this.modal.activate(),me(this)))}disconnectedCallback(){super.disconnectedCallback(),be(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=N(this,"drawer.denyClose",{dir:this.localize.dir()});V(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.contained||(this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard"))):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;document.removeEventListener("keydown",this.handleDocumentKeyDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.contained||(this.modal.activate(),me(this));const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([q(this.drawer),q(this.overlay)]),this.drawer.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=N(this,`drawer.show${po(this.placement)}`,{dir:this.localize.dir()}),i=N(this,"drawer.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Mi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.contained||(this.modal.deactivate(),be(this)),await Promise.all([q(this.drawer),q(this.overlay)]);const t=N(this,`drawer.hide${po(this.placement)}`,{dir:this.localize.dir()}),e=N(this,"drawer.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.drawer.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1;const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}handleNoModalChange(){this.open&&!this.contained&&(this.modal.activate(),me(this)),this.open&&this.contained&&(this.modal.deactivate(),be(this))}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return f`
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
          ${this.noHeader?"":f`
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
    `}};et.styles=[B,oa];et.dependencies={"sl-icon-button":K};n([S(".drawer")],et.prototype,"drawer",2);n([S(".drawer__panel")],et.prototype,"panel",2);n([S(".drawer__overlay")],et.prototype,"overlay",2);n([l({type:Boolean,reflect:!0})],et.prototype,"open",2);n([l({reflect:!0})],et.prototype,"label",2);n([l({reflect:!0})],et.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],et.prototype,"contained",2);n([l({attribute:"no-header",type:Boolean,reflect:!0})],et.prototype,"noHeader",2);n([T("open",{waitUntilFirstUpdate:!0})],et.prototype,"handleOpenChange",1);n([T("contained",{waitUntilFirstUpdate:!0})],et.prototype,"handleNoModalChange",1);R("drawer.showTop",{keyframes:[{opacity:0,translate:"0 -100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideTop",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 -100%"}],options:{duration:250,easing:"ease"}});R("drawer.showEnd",{keyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideEnd",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],options:{duration:250,easing:"ease"}});R("drawer.showBottom",{keyframes:[{opacity:0,translate:"0 100%"},{opacity:1,translate:"0 0"}],options:{duration:250,easing:"ease"}});R("drawer.hideBottom",{keyframes:[{opacity:1,translate:"0 0"},{opacity:0,translate:"0 100%"}],options:{duration:250,easing:"ease"}});R("drawer.showStart",{keyframes:[{opacity:0,translate:"-100%"},{opacity:1,translate:"0"}],rtlKeyframes:[{opacity:0,translate:"100%"},{opacity:1,translate:"0"}],options:{duration:250,easing:"ease"}});R("drawer.hideStart",{keyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"-100%"}],rtlKeyframes:[{opacity:1,translate:"0"},{opacity:0,translate:"100%"}],options:{duration:250,easing:"ease"}});R("drawer.denyClose",{keyframes:[{scale:1},{scale:1.01},{scale:1}],options:{duration:250}});R("drawer.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("drawer.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});et.define("sl-drawer");var ca=L`
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
`,xt=class extends D{constructor(){super(...arguments),this.hasSlotController=new St(this,"footer"),this.localize=new tt(this),this.modal=new qo(this),this.open=!1,this.label="",this.noHeader=!1,this.handleDocumentKeyDown=t=>{t.key==="Escape"&&this.modal.isActive()&&this.open&&(t.stopPropagation(),this.requestClose("keyboard"))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),me(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),be(this),this.removeOpenListeners()}requestClose(t){if(this.emit("sl-request-close",{cancelable:!0,detail:{source:t}}).defaultPrevented){const i=N(this,"dialog.denyClose",{dir:this.localize.dir()});V(this.panel,i.keyframes,i.options);return}this.hide()}addOpenListeners(){var t;"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose("keyboard")):document.addEventListener("keydown",this.handleDocumentKeyDown)}removeOpenListeners(){var t;(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),me(this);const t=this.querySelector("[autofocus]");t&&t.removeAttribute("autofocus"),await Promise.all([q(this.dialog),q(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit("sl-initial-focus",{cancelable:!0}).defaultPrevented||(t?t.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),t&&t.setAttribute("autofocus","")});const e=N(this,"dialog.show",{dir:this.localize.dir()}),i=N(this,"dialog.overlay.show",{dir:this.localize.dir()});await Promise.all([V(this.panel,e.keyframes,e.options),V(this.overlay,i.keyframes,i.options)]),this.emit("sl-after-show")}else{Mi(this),this.emit("sl-hide"),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([q(this.dialog),q(this.overlay)]);const t=N(this,"dialog.hide",{dir:this.localize.dir()}),e=N(this,"dialog.overlay.hide",{dir:this.localize.dir()});await Promise.all([V(this.overlay,e.keyframes,e.options).then(()=>{this.overlay.hidden=!0}),V(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,be(this);const i=this.originalTrigger;typeof(i==null?void 0:i.focus)=="function"&&setTimeout(()=>i.focus()),this.emit("sl-after-hide")}}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return f`
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
          ${this.noHeader?"":f`
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
    `}};xt.styles=[B,ca];xt.dependencies={"sl-icon-button":K};n([S(".dialog")],xt.prototype,"dialog",2);n([S(".dialog__panel")],xt.prototype,"panel",2);n([S(".dialog__overlay")],xt.prototype,"overlay",2);n([l({type:Boolean,reflect:!0})],xt.prototype,"open",2);n([l({reflect:!0})],xt.prototype,"label",2);n([l({attribute:"no-header",type:Boolean,reflect:!0})],xt.prototype,"noHeader",2);n([T("open",{waitUntilFirstUpdate:!0})],xt.prototype,"handleOpenChange",1);R("dialog.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("dialog.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});R("dialog.denyClose",{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}});R("dialog.overlay.show",{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}});R("dialog.overlay.hide",{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}});xt.define("sl-dialog");var da=L`
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
`,Ce=class extends D{constructor(){super(...arguments),this.variant="primary",this.pill=!1,this.pulse=!1}render(){return f`
      <span
        part="base"
        class=${I({badge:!0,"badge--primary":this.variant==="primary","badge--success":this.variant==="success","badge--neutral":this.variant==="neutral","badge--warning":this.variant==="warning","badge--danger":this.variant==="danger","badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};Ce.styles=[B,da];n([l({reflect:!0})],Ce.prototype,"variant",2);n([l({type:Boolean,reflect:!0})],Ce.prototype,"pill",2);n([l({type:Boolean,reflect:!0})],Ce.prototype,"pulse",2);Ce.define("sl-badge");var ua=L`
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
`,it=class Ft extends D{constructor(){super(...arguments),this.hasSlotController=new St(this,"icon","suffix"),this.localize=new tt(this),this.open=!1,this.closable=!1,this.variant="primary",this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||(this.currentToastStack=Object.assign(document.createElement("div"),{className:"sl-toast-stack"})),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var e;(e=this.countdownAnimation)==null||e.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var e;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(e=this.countdownAnimation)==null||e.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){const{countdownElement:e}=this,i="100%",o="0";this.countdownAnimation=e.animate([{width:i},{width:o}],{duration:this.duration,easing:"linear"})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit("sl-show"),this.duration<1/0&&this.restartAutoHide(),await q(this.base),this.base.hidden=!1;const{keyframes:e,options:i}=N(this,"alert.show",{dir:this.localize.dir()});await V(this.base,e,i),this.emit("sl-after-show")}else{Mi(this),this.emit("sl-hide"),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await q(this.base);const{keyframes:e,options:i}=N(this,"alert.hide",{dir:this.localize.dir()});await V(this.base,e,i),this.base.hidden=!0,this.emit("sl-after-hide")}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}async toast(){return new Promise(e=>{this.handleCountdownChange(),Ft.toastStack.parentElement===null&&document.body.append(Ft.toastStack),Ft.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener("sl-after-hide",()=>{Ft.toastStack.removeChild(this),e(),Ft.toastStack.querySelector("sl-alert")===null&&Ft.toastStack.remove()},{once:!0})})}render(){return f`
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

        ${this.closable?f`
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

        ${this.countdown?f`
              <div
                class=${I({alert__countdown:!0,"alert__countdown--ltr":this.countdown==="ltr"})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:""}
      </div>
    `}};it.styles=[B,ua];it.dependencies={"sl-icon-button":K};n([S('[part~="base"]')],it.prototype,"base",2);n([S(".alert__countdown-elapsed")],it.prototype,"countdownElement",2);n([l({type:Boolean,reflect:!0})],it.prototype,"open",2);n([l({type:Boolean,reflect:!0})],it.prototype,"closable",2);n([l({reflect:!0})],it.prototype,"variant",2);n([l({type:Number})],it.prototype,"duration",2);n([l({type:String,reflect:!0})],it.prototype,"countdown",2);n([w()],it.prototype,"remainingTime",2);n([T("open",{waitUntilFirstUpdate:!0})],it.prototype,"handleOpenChange",1);n([T("duration")],it.prototype,"handleDurationChange",1);var ha=it;R("alert.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:"ease"}});R("alert.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:"ease"}});ha.define("sl-alert");var pa=L`
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
`,E=class extends D{constructor(){super(...arguments),this.formControlController=new ke(this,{assumeInteractionOn:["sl-blur","sl-input"]}),this.hasSlotController=new St(this,"help-text","label"),this.hasFocus=!1,this.title="",this.name="",this.value="",this.size="medium",this.filled=!1,this.label="",this.helpText="",this.placeholder="",this.rows=4,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.form="",this.required=!1,this.spellcheck=!0,this.defaultValue=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var t;super.disconnectedCallback(),this.input&&((t=this.resizeObserver)==null||t.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit("sl-change")}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleInput(){this.value=this.input.value,this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}setTextareaHeight(){this.resize==="auto"?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height="auto",this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=""}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(t){this.input.focus(t)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(t){if(t){typeof t.top=="number"&&(this.input.scrollTop=t.top),typeof t.left=="number"&&(this.input.scrollLeft=t.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(t,e,i="none"){this.input.setSelectionRange(t,e,i)}setRangeText(t,e,i,o="preserve"){const s=e??this.input.selectionStart,r=i??this.input.selectionEnd;this.input.setRangeText(t,s,r,o),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("label"),e=this.hasSlotController.test("help-text"),i=this.label?!0:!!t,o=this.helpText?!0:!!e;return f`
      <div
        part="form-control"
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-label":i,"form-control--has-help-text":o})}
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
            class=${I({textarea:!0,"textarea--small":this.size==="small","textarea--medium":this.size==="medium","textarea--large":this.size==="large","textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize==="none","textarea--resize-vertical":this.resize==="vertical","textarea--resize-auto":this.resize==="auto"})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${v(this.name)}
              .value=${Me(this.value)}
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
          aria-hidden=${o?"false":"true"}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};E.styles=[B,qe,pa];n([S(".textarea__control")],E.prototype,"input",2);n([S(".textarea__size-adjuster")],E.prototype,"sizeAdjuster",2);n([w()],E.prototype,"hasFocus",2);n([l()],E.prototype,"title",2);n([l()],E.prototype,"name",2);n([l()],E.prototype,"value",2);n([l({reflect:!0})],E.prototype,"size",2);n([l({type:Boolean,reflect:!0})],E.prototype,"filled",2);n([l()],E.prototype,"label",2);n([l({attribute:"help-text"})],E.prototype,"helpText",2);n([l()],E.prototype,"placeholder",2);n([l({type:Number})],E.prototype,"rows",2);n([l()],E.prototype,"resize",2);n([l({type:Boolean,reflect:!0})],E.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],E.prototype,"readonly",2);n([l({reflect:!0})],E.prototype,"form",2);n([l({type:Boolean,reflect:!0})],E.prototype,"required",2);n([l({type:Number})],E.prototype,"minlength",2);n([l({type:Number})],E.prototype,"maxlength",2);n([l()],E.prototype,"autocapitalize",2);n([l()],E.prototype,"autocorrect",2);n([l()],E.prototype,"autocomplete",2);n([l({type:Boolean})],E.prototype,"autofocus",2);n([l()],E.prototype,"enterkeyhint",2);n([l({type:Boolean,converter:{fromAttribute:t=>!(!t||t==="false"),toAttribute:t=>t?"true":"false"}})],E.prototype,"spellcheck",2);n([l()],E.prototype,"inputmode",2);n([Ti()],E.prototype,"defaultValue",2);n([T("disabled",{waitUntilFirstUpdate:!0})],E.prototype,"handleDisabledChange",1);n([T("rows",{waitUntilFirstUpdate:!0})],E.prototype,"handleRowsChange",1);n([T("value",{waitUntilFirstUpdate:!0})],E.prototype,"handleValueChange",1);E.define("sl-textarea");var fa=L`
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
`,Y=class extends D{constructor(){super(...arguments),this.localize=new tt(this),this.open=!1,this.placement="bottom-start",this.disabled=!1,this.stayOpenOnSelect=!1,this.distance=0,this.skidding=0,this.hoist=!1,this.sync=void 0,this.handleKeyDown=t=>{this.open&&t.key==="Escape"&&(t.stopPropagation(),this.hide(),this.focusOnTrigger())},this.handleDocumentKeyDown=t=>{var e;if(t.key==="Escape"&&this.open&&!this.closeWatcher){t.stopPropagation(),this.focusOnTrigger(),this.hide();return}if(t.key==="Tab"){if(this.open&&((e=document.activeElement)==null?void 0:e.tagName.toLowerCase())==="sl-menu-item"){t.preventDefault(),this.hide(),this.focusOnTrigger();return}const i=(o,s)=>{if(!o)return null;const r=o.closest(s);if(r)return r;const a=o.getRootNode();return a instanceof ShadowRoot?i(a.host,s):null};setTimeout(()=>{var o;const s=((o=this.containingElement)==null?void 0:o.getRootNode())instanceof ShadowRoot?Uo():document.activeElement;(!this.containingElement||i(s,this.containingElement.tagName.toLowerCase())!==this.containingElement)&&this.hide()})}},this.handleDocumentMouseDown=t=>{const e=t.composedPath();this.containingElement&&!e.includes(this.containingElement)&&this.hide()},this.handlePanelSelect=t=>{const e=t.target;!this.stayOpenOnSelect&&e.tagName.toLowerCase()==="sl-menu"&&(this.hide(),this.focusOnTrigger())}}connectedCallback(){super.connectedCallback(),this.containingElement||(this.containingElement=this)}firstUpdated(){this.panel.hidden=!this.open,this.open&&(this.addOpenListeners(),this.popup.active=!0)}disconnectedCallback(){super.disconnectedCallback(),this.removeOpenListeners(),this.hide()}focusOnTrigger(){const t=this.trigger.assignedElements({flatten:!0})[0];typeof(t==null?void 0:t.focus)=="function"&&t.focus()}getMenu(){return this.panel.assignedElements({flatten:!0}).find(t=>t.tagName.toLowerCase()==="sl-menu")}handleTriggerClick(){this.open?this.hide():(this.show(),this.focusOnTrigger())}async handleTriggerKeyDown(t){if([" ","Enter"].includes(t.key)){t.preventDefault(),this.handleTriggerClick();return}const e=this.getMenu();if(e){const i=e.getAllItems(),o=i[0],s=i[i.length-1];["ArrowDown","ArrowUp","Home","End"].includes(t.key)&&(t.preventDefault(),this.open||(this.show(),await this.updateComplete),i.length>0&&this.updateComplete.then(()=>{(t.key==="ArrowDown"||t.key==="Home")&&(e.setCurrentItem(o),o.focus()),(t.key==="ArrowUp"||t.key==="End")&&(e.setCurrentItem(s),s.focus())}))}}handleTriggerKeyUp(t){t.key===" "&&t.preventDefault()}handleTriggerSlotChange(){this.updateAccessibleTrigger()}updateAccessibleTrigger(){const e=this.trigger.assignedElements({flatten:!0}).find(o=>na(o).start);let i;if(e){switch(e.tagName.toLowerCase()){case"sl-button":case"sl-icon-button":i=e.button;break;default:i=e}i.setAttribute("aria-haspopup","true"),i.setAttribute("aria-expanded",this.open?"true":"false")}}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}reposition(){this.popup.reposition()}addOpenListeners(){var t;this.panel.addEventListener("sl-select",this.handlePanelSelect),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide(),this.focusOnTrigger()}):this.panel.addEventListener("keydown",this.handleKeyDown),document.addEventListener("keydown",this.handleDocumentKeyDown),document.addEventListener("mousedown",this.handleDocumentMouseDown)}removeOpenListeners(){var t;this.panel&&(this.panel.removeEventListener("sl-select",this.handlePanelSelect),this.panel.removeEventListener("keydown",this.handleKeyDown)),document.removeEventListener("keydown",this.handleDocumentKeyDown),document.removeEventListener("mousedown",this.handleDocumentMouseDown),(t=this.closeWatcher)==null||t.destroy()}async handleOpenChange(){if(this.disabled){this.open=!1;return}if(this.updateAccessibleTrigger(),this.open){this.emit("sl-show"),this.addOpenListeners(),await q(this),this.panel.hidden=!1,this.popup.active=!0;const{keyframes:t,options:e}=N(this,"dropdown.show",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.emit("sl-after-show")}else{this.emit("sl-hide"),this.removeOpenListeners(),await q(this);const{keyframes:t,options:e}=N(this,"dropdown.hide",{dir:this.localize.dir()});await V(this.popup.popup,t,e),this.panel.hidden=!0,this.popup.active=!1,this.emit("sl-after-hide")}}render(){return f`
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
    `}};Y.styles=[B,fa];Y.dependencies={"sl-popup":O};n([S(".dropdown")],Y.prototype,"popup",2);n([S(".dropdown__trigger")],Y.prototype,"trigger",2);n([S(".dropdown__panel")],Y.prototype,"panel",2);n([l({type:Boolean,reflect:!0})],Y.prototype,"open",2);n([l({reflect:!0})],Y.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],Y.prototype,"disabled",2);n([l({attribute:"stay-open-on-select",type:Boolean,reflect:!0})],Y.prototype,"stayOpenOnSelect",2);n([l({attribute:!1})],Y.prototype,"containingElement",2);n([l({type:Number})],Y.prototype,"distance",2);n([l({type:Number})],Y.prototype,"skidding",2);n([l({type:Boolean})],Y.prototype,"hoist",2);n([l({reflect:!0})],Y.prototype,"sync",2);n([T("open",{waitUntilFirstUpdate:!0})],Y.prototype,"handleOpenChange",1);R("dropdown.show",{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:"ease"}});R("dropdown.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:"ease"}});Y.define("sl-dropdown");var ma=L`
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
`,Ii=class extends D{connectedCallback(){super.connectedCallback(),this.setAttribute("role","menu")}handleClick(t){const e=["menuitem","menuitemcheckbox"],i=t.composedPath(),o=i.find(c=>{var d;return e.includes(((d=c==null?void 0:c.getAttribute)==null?void 0:d.call(c,"role"))||"")});if(!o||i.find(c=>{var d;return((d=c==null?void 0:c.getAttribute)==null?void 0:d.call(c,"role"))==="menu"})!==this)return;const a=o;a.type==="checkbox"&&(a.checked=!a.checked),this.emit("sl-select",{detail:{item:a}})}handleKeyDown(t){if(t.key==="Enter"||t.key===" "){const e=this.getCurrentItem();t.preventDefault(),t.stopPropagation(),e==null||e.click()}else if(["ArrowDown","ArrowUp","Home","End"].includes(t.key)){const e=this.getAllItems(),i=this.getCurrentItem();let o=i?e.indexOf(i):0;e.length>0&&(t.preventDefault(),t.stopPropagation(),t.key==="ArrowDown"?o++:t.key==="ArrowUp"?o--:t.key==="Home"?o=0:t.key==="End"&&(o=e.length-1),o<0&&(o=e.length-1),o>e.length-1&&(o=0),this.setCurrentItem(e[o]),e[o].focus())}}handleMouseDown(t){const e=t.target;this.isMenuItem(e)&&this.setCurrentItem(e)}handleSlotChange(){const t=this.getAllItems();t.length>0&&this.setCurrentItem(t[0])}isMenuItem(t){var e;return t.tagName.toLowerCase()==="sl-menu-item"||["menuitem","menuitemcheckbox","menuitemradio"].includes((e=t.getAttribute("role"))!=null?e:"")}getAllItems(){return[...this.defaultSlot.assignedElements({flatten:!0})].filter(t=>!(t.inert||!this.isMenuItem(t)))}getCurrentItem(){return this.getAllItems().find(t=>t.getAttribute("tabindex")==="0")}setCurrentItem(t){this.getAllItems().forEach(i=>{i.setAttribute("tabindex",i===t?"0":"-1")})}render(){return f`
      <slot
        @slotchange=${this.handleSlotChange}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        @mousedown=${this.handleMouseDown}
      ></slot>
    `}};Ii.styles=[B,ma];n([S("slot")],Ii.prototype,"defaultSlot",2);Ii.define("sl-menu");var ba=L`
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
 */const ge=(t,e)=>{var o;const i=t._$AN;if(i===void 0)return!1;for(const s of i)(o=s._$AO)==null||o.call(s,e,!1),ge(s,e);return!0},Ne=t=>{let e,i;do{if((e=t._$AM)===void 0)break;i=e._$AN,i.delete(t),t=e}while((i==null?void 0:i.size)===0)},Wo=t=>{for(let e;e=t._$AM;t=e){let i=e._$AN;if(i===void 0)e._$AN=i=new Set;else if(i.has(t))break;i.add(t),ya(e)}};function ga(t){this._$AN!==void 0?(Ne(this),this._$AM=t,Wo(this)):this._$AM=t}function va(t,e=!1,i=0){const o=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(e)if(Array.isArray(o))for(let r=i;r<o.length;r++)ge(o[r],!1),Ne(o[r]);else o!=null&&(ge(o,!1),Ne(o));else ge(this,t)}const ya=t=>{t.type==$t.CHILD&&(t._$AP??(t._$AP=va),t._$AQ??(t._$AQ=ga))};class wa extends je{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,i,o){super._$AT(e,i,o),Wo(this),this.isConnected=e._$AU}_$AO(e,i=!0){var o,s;e!==this.isConnected&&(this.isConnected=e,e?(o=this.reconnected)==null||o.call(this):(s=this.disconnected)==null||s.call(this)),i&&(ge(this,e),Ne(this))}setValue(e){if(zo(this._$Ct))this._$Ct._$AI(e,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=e,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xa=()=>new _a;class _a{}const ci=new WeakMap,ka=Ue(class extends wa{render(t){return C}update(t,[e]){var o;const i=e!==this.G;return i&&this.G!==void 0&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=e,this.ht=(o=t.options)==null?void 0:o.host,this.rt(this.ct=t.element)),C}rt(t){if(this.isConnected||(t=void 0),typeof this.G=="function"){const e=this.ht??globalThis;let i=ci.get(e);i===void 0&&(i=new WeakMap,ci.set(e,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,t),t!==void 0&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){var t,e;return typeof this.G=="function"?(t=ci.get(this.ht??globalThis))==null?void 0:t.get(this.G):(e=this.G)==null?void 0:e.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var $a=class{constructor(t,e){this.popupRef=xa(),this.enableSubmenuTimer=-1,this.isConnected=!1,this.isPopupConnected=!1,this.skidding=0,this.submenuOpenDelay=100,this.handleMouseMove=i=>{this.host.style.setProperty("--safe-triangle-cursor-x",`${i.clientX}px`),this.host.style.setProperty("--safe-triangle-cursor-y",`${i.clientY}px`)},this.handleMouseOver=()=>{this.hasSlotController.test("submenu")&&this.enableSubmenu()},this.handleKeyDown=i=>{switch(i.key){case"Escape":case"Tab":this.disableSubmenu();break;case"ArrowLeft":i.target!==this.host&&(i.preventDefault(),i.stopPropagation(),this.host.focus(),this.disableSubmenu());break;case"ArrowRight":case"Enter":case" ":this.handleSubmenuEntry(i);break}},this.handleClick=i=>{var o;i.target===this.host?(i.preventDefault(),i.stopPropagation()):i.target instanceof Element&&(i.target.tagName==="sl-menu-item"||(o=i.target.role)!=null&&o.startsWith("menuitem"))&&this.disableSubmenu()},this.handleFocusOut=i=>{i.relatedTarget&&i.relatedTarget instanceof Element&&this.host.contains(i.relatedTarget)||this.disableSubmenu()},this.handlePopupMouseover=i=>{i.stopPropagation()},this.handlePopupReposition=()=>{const i=this.host.renderRoot.querySelector("slot[name='submenu']"),o=i==null?void 0:i.assignedElements({flatten:!0}).filter(u=>u.localName==="sl-menu")[0],s=getComputedStyle(this.host).direction==="rtl";if(!o)return;const{left:r,top:a,width:c,height:d}=o.getBoundingClientRect();this.host.style.setProperty("--safe-triangle-submenu-start-x",`${s?r+c:r}px`),this.host.style.setProperty("--safe-triangle-submenu-start-y",`${a}px`),this.host.style.setProperty("--safe-triangle-submenu-end-x",`${s?r+c:r}px`),this.host.style.setProperty("--safe-triangle-submenu-end-y",`${a+d}px`)},(this.host=t).addController(this),this.hasSlotController=e}hostConnected(){this.hasSlotController.test("submenu")&&!this.host.disabled&&this.addListeners()}hostDisconnected(){this.removeListeners()}hostUpdated(){this.hasSlotController.test("submenu")&&!this.host.disabled?(this.addListeners(),this.updateSkidding()):this.removeListeners()}addListeners(){this.isConnected||(this.host.addEventListener("mousemove",this.handleMouseMove),this.host.addEventListener("mouseover",this.handleMouseOver),this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("click",this.handleClick),this.host.addEventListener("focusout",this.handleFocusOut),this.isConnected=!0),this.isPopupConnected||this.popupRef.value&&(this.popupRef.value.addEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.addEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!0)}removeListeners(){this.isConnected&&(this.host.removeEventListener("mousemove",this.handleMouseMove),this.host.removeEventListener("mouseover",this.handleMouseOver),this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("click",this.handleClick),this.host.removeEventListener("focusout",this.handleFocusOut),this.isConnected=!1),this.isPopupConnected&&this.popupRef.value&&(this.popupRef.value.removeEventListener("mouseover",this.handlePopupMouseover),this.popupRef.value.removeEventListener("sl-reposition",this.handlePopupReposition),this.isPopupConnected=!1)}handleSubmenuEntry(t){const e=this.host.renderRoot.querySelector("slot[name='submenu']");if(!e){console.error("Cannot activate a submenu if no corresponding menuitem can be found.",this);return}let i=null;for(const o of e.assignedElements())if(i=o.querySelectorAll("sl-menu-item, [role^='menuitem']"),i.length!==0)break;if(!(!i||i.length===0)){i[0].setAttribute("tabindex","0");for(let o=1;o!==i.length;++o)i[o].setAttribute("tabindex","-1");this.popupRef.value&&(t.preventDefault(),t.stopPropagation(),this.popupRef.value.active?i[0]instanceof HTMLElement&&i[0].focus():(this.enableSubmenu(!1),this.host.updateComplete.then(()=>{i[0]instanceof HTMLElement&&i[0].focus()}),this.host.requestUpdate()))}}setSubmenuState(t){this.popupRef.value&&this.popupRef.value.active!==t&&(this.popupRef.value.active=t,this.host.requestUpdate())}enableSubmenu(t=!0){t?(window.clearTimeout(this.enableSubmenuTimer),this.enableSubmenuTimer=window.setTimeout(()=>{this.setSubmenuState(!0)},this.submenuOpenDelay)):this.setSubmenuState(!0)}disableSubmenu(){window.clearTimeout(this.enableSubmenuTimer),this.setSubmenuState(!1)}updateSkidding(){var t;if(!((t=this.host.parentElement)!=null&&t.computedStyleMap))return;const e=this.host.parentElement.computedStyleMap(),o=["padding-top","border-top-width","margin-top"].reduce((s,r)=>{var a;const c=(a=e.get(r))!=null?a:new CSSUnitValue(0,"px"),u=(c instanceof CSSUnitValue?c:new CSSUnitValue(0,"px")).to("px");return s-u.value},0);this.skidding=o}isExpanded(){return this.popupRef.value?this.popupRef.value.active:!1}renderSubmenu(){const t=getComputedStyle(this.host).direction==="rtl";return this.isConnected?f`
      <sl-popup
        ${ka(this.popupRef)}
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
    `:f` <slot name="submenu" hidden></slot> `}},ot=class extends D{constructor(){super(...arguments),this.localize=new tt(this),this.type="normal",this.checked=!1,this.value="",this.loading=!1,this.disabled=!1,this.hasSlotController=new St(this,"submenu"),this.submenuController=new $a(this,this.hasSlotController),this.handleHostClick=t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())},this.handleMouseOver=t=>{this.focus(),t.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHostClick),this.addEventListener("mouseover",this.handleMouseOver)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHostClick),this.removeEventListener("mouseover",this.handleMouseOver)}handleDefaultSlotChange(){const t=this.getTextLabel();if(typeof this.cachedTextLabel>"u"){this.cachedTextLabel=t;return}t!==this.cachedTextLabel&&(this.cachedTextLabel=t,this.emit("slotchange",{bubbles:!0,composed:!1,cancelable:!1}))}handleCheckedChange(){if(this.checked&&this.type!=="checkbox"){this.checked=!1,console.error('The checked attribute can only be used on menu items with type="checkbox"',this);return}this.type==="checkbox"?this.setAttribute("aria-checked",this.checked?"true":"false"):this.removeAttribute("aria-checked")}handleDisabledChange(){this.setAttribute("aria-disabled",this.disabled?"true":"false")}handleTypeChange(){this.type==="checkbox"?(this.setAttribute("role","menuitemcheckbox"),this.setAttribute("aria-checked",this.checked?"true":"false")):(this.setAttribute("role","menuitem"),this.removeAttribute("aria-checked"))}getTextLabel(){return Os(this.defaultSlot)}isSubmenu(){return this.hasSlotController.test("submenu")}render(){const t=this.localize.dir()==="rtl",e=this.submenuController.isExpanded();return f`
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
        ${this.loading?f` <sl-spinner part="spinner" exportparts="base:spinner__base"></sl-spinner> `:""}
      </div>
    `}};ot.styles=[B,ba];ot.dependencies={"sl-icon":W,"sl-popup":O,"sl-spinner":Ei};n([S("slot:not([name])")],ot.prototype,"defaultSlot",2);n([S(".menu-item")],ot.prototype,"menuItem",2);n([l()],ot.prototype,"type",2);n([l({type:Boolean,reflect:!0})],ot.prototype,"checked",2);n([l()],ot.prototype,"value",2);n([l({type:Boolean,reflect:!0})],ot.prototype,"loading",2);n([l({type:Boolean,reflect:!0})],ot.prototype,"disabled",2);n([T("checked")],ot.prototype,"handleCheckedChange",1);n([T("disabled")],ot.prototype,"handleDisabledChange",1);n([T("type")],ot.prototype,"handleTypeChange",1);ot.define("sl-menu-item");W.define("sl-icon");var Ca=L`
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
`,Ze=class extends D{constructor(){super(...arguments),this.vertical=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","separator")}handleVerticalChange(){this.setAttribute("aria-orientation",this.vertical?"vertical":"horizontal")}};Ze.styles=[B,Ca];n([l({type:Boolean,reflect:!0})],Ze.prototype,"vertical",2);n([T("vertical")],Ze.prototype,"handleVerticalChange",1);Ze.define("sl-divider");var Sa=L`
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
`,U=class extends D{constructor(){super(),this.localize=new tt(this),this.content="",this.placement="top",this.disabled=!1,this.distance=8,this.open=!1,this.skidding=0,this.trigger="hover focus",this.hoist=!1,this.handleBlur=()=>{this.hasTrigger("focus")&&this.hide()},this.handleClick=()=>{this.hasTrigger("click")&&(this.open?this.hide():this.show())},this.handleFocus=()=>{this.hasTrigger("focus")&&this.show()},this.handleDocumentKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this.hide())},this.handleMouseOver=()=>{if(this.hasTrigger("hover")){const t=uo(getComputedStyle(this).getPropertyValue("--show-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.show(),t)}},this.handleMouseOut=()=>{if(this.hasTrigger("hover")){const t=uo(getComputedStyle(this).getPropertyValue("--hide-delay"));clearTimeout(this.hoverTimeout),this.hoverTimeout=window.setTimeout(()=>this.hide(),t)}},this.addEventListener("blur",this.handleBlur,!0),this.addEventListener("focus",this.handleFocus,!0),this.addEventListener("click",this.handleClick),this.addEventListener("mouseover",this.handleMouseOver),this.addEventListener("mouseout",this.handleMouseOut)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.closeWatcher)==null||t.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown)}firstUpdated(){this.body.hidden=!this.open,this.open&&(this.popup.active=!0,this.popup.reposition())}hasTrigger(t){return this.trigger.split(" ").includes(t)}async handleOpenChange(){var t,e;if(this.open){if(this.disabled)return;this.emit("sl-show"),"CloseWatcher"in window?((t=this.closeWatcher)==null||t.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.hide()}):document.addEventListener("keydown",this.handleDocumentKeyDown),await q(this.body),this.body.hidden=!1,this.popup.active=!0;const{keyframes:i,options:o}=N(this,"tooltip.show",{dir:this.localize.dir()});await V(this.popup.popup,i,o),this.popup.reposition(),this.emit("sl-after-show")}else{this.emit("sl-hide"),(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener("keydown",this.handleDocumentKeyDown),await q(this.body);const{keyframes:i,options:o}=N(this,"tooltip.hide",{dir:this.localize.dir()});await V(this.popup.popup,i,o),this.popup.active=!1,this.body.hidden=!0,this.emit("sl-after-hide")}}async handleOptionsChange(){this.hasUpdated&&(await this.updateComplete,this.popup.reposition())}handleDisabledChange(){this.disabled&&this.open&&this.hide()}async show(){if(!this.open)return this.open=!0,nt(this,"sl-after-show")}async hide(){if(this.open)return this.open=!1,nt(this,"sl-after-hide")}render(){return f`
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
    `}};U.styles=[B,Sa];U.dependencies={"sl-popup":O};n([S("slot:not([name])")],U.prototype,"defaultSlot",2);n([S(".tooltip__body")],U.prototype,"body",2);n([S("sl-popup")],U.prototype,"popup",2);n([l()],U.prototype,"content",2);n([l()],U.prototype,"placement",2);n([l({type:Boolean,reflect:!0})],U.prototype,"disabled",2);n([l({type:Number})],U.prototype,"distance",2);n([l({type:Boolean,reflect:!0})],U.prototype,"open",2);n([l({type:Number})],U.prototype,"skidding",2);n([l()],U.prototype,"trigger",2);n([l({type:Boolean})],U.prototype,"hoist",2);n([T("open",{waitUntilFirstUpdate:!0})],U.prototype,"handleOpenChange",1);n([T(["content","distance","hoist","placement","skidding"])],U.prototype,"handleOptionsChange",1);n([T("disabled")],U.prototype,"handleDisabledChange",1);R("tooltip.show",{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:150,easing:"ease"}});R("tooltip.hide",{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:150,easing:"ease"}});U.define("sl-tooltip");var Ea=L`
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
`,H=class extends D{constructor(){super(...arguments),this.formControlController=new ke(this,{value:t=>t.checked?t.value||"on":void 0,defaultValue:t=>t.defaultChecked,setValue:(t,e)=>t.checked=e}),this.hasSlotController=new St(this,"help-text"),this.hasFocus=!1,this.title="",this.name="",this.size="medium",this.disabled=!1,this.checked=!1,this.indeterminate=!1,this.defaultChecked=!1,this.form="",this.required=!1,this.helpText=""}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleClick(){this.checked=!this.checked,this.indeterminate=!1,this.emit("sl-change")}handleBlur(){this.hasFocus=!1,this.emit("sl-blur")}handleInput(){this.emit("sl-input")}handleInvalid(t){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(t)}handleFocus(){this.hasFocus=!0,this.emit("sl-focus")}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStateChange(){this.input.checked=this.checked,this.input.indeterminate=this.indeterminate,this.formControlController.updateValidity()}click(){this.input.click()}focus(t){this.input.focus(t)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(t){this.input.setCustomValidity(t),this.formControlController.updateValidity()}render(){const t=this.hasSlotController.test("help-text"),e=this.helpText?!0:!!t;return f`
      <div
        class=${I({"form-control":!0,"form-control--small":this.size==="small","form-control--medium":this.size==="medium","form-control--large":this.size==="large","form-control--has-help-text":e})}
      >
        <label
          part="base"
          class=${I({checkbox:!0,"checkbox--checked":this.checked,"checkbox--disabled":this.disabled,"checkbox--focused":this.hasFocus,"checkbox--indeterminate":this.indeterminate,"checkbox--small":this.size==="small","checkbox--medium":this.size==="medium","checkbox--large":this.size==="large"})}
        >
          <input
            class="checkbox__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${v(this.value)}
            .indeterminate=${Me(this.indeterminate)}
            .checked=${Me(this.checked)}
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
            ${this.checked?f`
                  <sl-icon part="checked-icon" class="checkbox__checked-icon" library="system" name="check"></sl-icon>
                `:""}
            ${!this.checked&&this.indeterminate?f`
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
    `}};H.styles=[B,qe,Ea];H.dependencies={"sl-icon":W};n([S('input[type="checkbox"]')],H.prototype,"input",2);n([w()],H.prototype,"hasFocus",2);n([l()],H.prototype,"title",2);n([l()],H.prototype,"name",2);n([l()],H.prototype,"value",2);n([l({reflect:!0})],H.prototype,"size",2);n([l({type:Boolean,reflect:!0})],H.prototype,"disabled",2);n([l({type:Boolean,reflect:!0})],H.prototype,"checked",2);n([l({type:Boolean,reflect:!0})],H.prototype,"indeterminate",2);n([Ti("checked")],H.prototype,"defaultChecked",2);n([l({reflect:!0})],H.prototype,"form",2);n([l({type:Boolean,reflect:!0})],H.prototype,"required",2);n([l({attribute:"help-text"})],H.prototype,"helpText",2);n([T("disabled",{waitUntilFirstUpdate:!0})],H.prototype,"handleDisabledChange",1);n([T(["checked","indeterminate"],{waitUntilFirstUpdate:!0})],H.prototype,"handleStateChange",1);H.define("sl-checkbox");/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Aa=class extends Event{constructor(e,i,o,s){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i,this.callback=o,this.subscribe=s??!1}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 *//**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ta{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,i=!1){const o=i||!Object.is(e,this.o);this.o=e,o&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[i,{disposer:o}]of this.subscriptions)i(this.o,o)},e!==void 0&&(this.value=e)}addCallback(e,i,o){if(!o)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:i});const{disposer:s}=this.subscriptions.get(e);e(this.value,s)}clearCallbacks(){this.subscriptions.clear()}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let za=class extends Event{constructor(e,i){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=i}};class fo extends Ta{constructor(e,i,o){var s,r;super(i.context!==void 0?i.initialValue:o),this.onContextRequest=a=>{if(a.context!==this.context)return;const c=a.contextTarget??a.composedPath()[0];c!==this.host&&(a.stopPropagation(),this.addCallback(a.callback,c,a.subscribe))},this.onProviderRequest=a=>{if(a.context!==this.context||(a.contextTarget??a.composedPath()[0])===this.host)return;const c=new Set;for(const[d,{consumerHost:u}]of this.subscriptions)c.has(d)||(c.add(d),u.dispatchEvent(new Aa(this.context,u,d,!0)));a.stopPropagation()},this.host=e,i.context!==void 0?this.context=i.context:this.context=i,this.attachListeners(),(r=(s=this.host).addController)==null||r.call(s,this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new za(this.context,this.host))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Oa({context:t}){return(e,i)=>{const o=new WeakMap;if(typeof i=="object")return{get(){return e.get.call(this)},set(s){return o.get(this).setValue(s),e.set.call(this,s)},init(s){return o.set(this,new fo(this,{context:t,initialValue:s})),s}};{e.constructor.addInitializer(a=>{o.set(a,new fo(a,{context:t}))});const s=Object.getOwnPropertyDescriptor(e,i);let r;if(s===void 0){const a=new WeakMap;r={get(){return a.get(this)},set(c){o.get(this).setValue(c),a.set(this,c)},configurable:!0,enumerable:!0}}else{const a=s.set;r={...s,set(c){o.get(this).setValue(c),a==null||a.call(this,c)}}}return void Object.defineProperty(e,i,r)}}}const La=Symbol("board"),Pa={ticks:[],epics:[],selectedEpic:"",searchTerm:"",activeColumn:"blocked",isMobile:!1};class Ko extends Error{constructor(e,i,o){super(e),this.status=i,this.body=o,this.name="ApiError"}}async function Bi(t,e){const i=await fetch(t,e);if(!i.ok){const o=await i.text();throw new Ko(`API request failed: ${i.status} ${i.statusText}`,i.status,o)}return i.json()}function Da(t,e){return t}async function Ra(t){const e=Da("/api/ticks");return(await Bi(e)).ticks.map(o=>({...o,is_blocked:o.isBlocked}))}async function Ma(t){return Bi("/api/ticks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function Ia(){return Bi("/api/info")}var Ba=Object.defineProperty,Fa=Object.getOwnPropertyDescriptor,ct=(t,e,i,o)=>{for(var s=o>1?void 0:o?Fa(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ba(e,i,s),s};const mo=[{id:"blocked",name:"Blocked",color:"var(--red)",icon:"⊘"},{id:"ready",name:"Agent Queue",color:"var(--blue)",icon:"▶"},{id:"agent",name:"In Progress",color:"var(--peach)",icon:"●"},{id:"human",name:"Needs Human",color:"var(--yellow)",icon:"👤"},{id:"done",name:"Done",color:"var(--green)",icon:"✓"}];let Z=class extends pt{constructor(){super(...arguments),this.boardState={...Pa},this.ticks=[],this.epics=[],this.repoName="",this.selectedEpic="",this.searchTerm="",this.activeColumn="blocked",this.isMobile=window.matchMedia("(max-width: 480px)").matches,this.selectedTick=null,this.loading=!0,this.error=null,this.mediaQuery=window.matchMedia("(max-width: 480px)"),this.handleMediaChange=t=>{this.isMobile=t.matches,this.updateBoardState()}}connectedCallback(){super.connectedCallback(),this.mediaQuery.addEventListener("change",this.handleMediaChange),this.loadData()}async loadData(){this.loading=!0,this.error=null;try{const[t,e]=await Promise.all([Ra(),Ia()]);this.ticks=t,this.epics=e.epics,this.repoName=e.repoName,this.updateBoardState()}catch(t){this.error=t instanceof Error?t.message:"Failed to load data",console.error("Failed to load board data:",t)}finally{this.loading=!1}}disconnectedCallback(){super.disconnectedCallback(),this.mediaQuery.removeEventListener("change",this.handleMediaChange)}updateBoardState(){this.boardState={ticks:this.ticks,epics:this.epics,selectedEpic:this.selectedEpic,searchTerm:this.searchTerm,activeColumn:this.activeColumn,isMobile:this.isMobile}}handleSearchChange(t){this.searchTerm=t.detail.value,this.updateBoardState()}handleEpicFilterChange(t){this.selectedEpic=t.detail.value,this.updateBoardState()}handleCreateClick(){console.log("Create tick clicked")}handleMenuToggle(){console.log("Menu toggle clicked")}handleTickSelected(t){this.selectedTick=t.detail.tick,console.log("Tick selected:",t.detail.tick.id)}handleMobileColumnChange(t){const e=t.target;this.activeColumn=e.value,this.updateBoardState()}getFilteredTicks(){let t=this.ticks;if(this.searchTerm){const e=this.searchTerm.toLowerCase();t=t.filter(i=>i.id.toLowerCase().includes(e)||i.title.toLowerCase().includes(e)||i.description&&i.description.toLowerCase().includes(e))}return this.selectedEpic&&(t=t.filter(e=>e.parent===this.selectedEpic)),t}getColumnTicks(t){return this.getFilteredTicks().filter(e=>e.column===t)}getEpicNames(){const t={};for(const e of this.epics)t[e.id]=e.title;return t}render(){if(this.loading)return f`
        <div class="loading-state">
          <sl-icon name="arrow-repeat" class="loading-spinner"></sl-icon>
          <span>Loading board...</span>
        </div>
      `;if(this.error)return f`
        <div class="error-state">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Failed to load board</strong><br>
            ${this.error}
          </sl-alert>
          <sl-button variant="primary" @click=${this.loadData}>Retry</sl-button>
        </div>
      `;const t=this.getEpicNames();return f`
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
          ${mo.map(e=>f`
            <sl-option value=${e.id}>
              ${e.icon} ${e.name} (${this.getColumnTicks(e.id).length})
            </sl-option>
          `)}
        </sl-select>
      </div>

      <main>
        <div class="kanban-board">
          ${mo.map(e=>f`
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
    `}};Z.styles=L`
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
  `;ct([Oa({context:La}),w()],Z.prototype,"boardState",2);ct([w()],Z.prototype,"ticks",2);ct([w()],Z.prototype,"epics",2);ct([w()],Z.prototype,"repoName",2);ct([w()],Z.prototype,"selectedEpic",2);ct([w()],Z.prototype,"searchTerm",2);ct([w()],Z.prototype,"activeColumn",2);ct([w()],Z.prototype,"isMobile",2);ct([w()],Z.prototype,"selectedTick",2);ct([w()],Z.prototype,"loading",2);ct([w()],Z.prototype,"error",2);Z=ct([ee("tick-board")],Z);var Na=Object.defineProperty,Va=Object.getOwnPropertyDescriptor,Qe=(t,e,i,o)=>{for(var s=o>1?void 0:o?Va(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Na(e,i,s),s};const bo={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"},Ha={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"};let te=class extends pt{constructor(){super(...arguments),this.selected=!1}handleClick(){this.dispatchEvent(new CustomEvent("tick-selected",{detail:{tick:this.tick},bubbles:!0,composed:!0}))}getPriorityColor(){return bo[this.tick.priority]??bo[2]}getPriorityLabel(){return Ha[this.tick.priority]??"Unknown"}render(){const{tick:t,selected:e,epicName:i}=this;return f`
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
          ${t.is_blocked?f`<span class="meta-badge blocked">⊘ blocked</span>`:null}
          ${t.manual?f`<span class="meta-badge manual">👤 manual</span>`:null}
          ${t.awaiting?f`<span class="meta-badge awaiting">⏳ ${t.awaiting}</span>`:null}
        </div>

        ${i?f`<div class="epic-name">${i}</div>`:null}
      </div>
    `}};te.styles=L`
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
  `;Qe([l({attribute:!1})],te.prototype,"tick",2);Qe([l({type:Boolean})],te.prototype,"selected",2);Qe([l({type:String,attribute:"epic-name"})],te.prototype,"epicName",2);te=Qe([ee("tick-card")],te);var Ua=Object.defineProperty,ja=Object.getOwnPropertyDescriptor,Se=(t,e,i,o)=>{for(var s=o>1?void 0:o?ja(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ua(e,i,s),s};const qa={blocked:"var(--red)",ready:"var(--yellow)",agent:"var(--blue)",human:"var(--mauve)",done:"var(--green)"},Wa={blocked:"Blocked",ready:"Ready",agent:"In Progress",human:"Needs Human",done:"Done"},Ka={blocked:"⊘",ready:"▶",agent:"●",human:"👤",done:"✓"};let qt=class extends pt{constructor(){super(...arguments),this.name="ready",this.color="",this.ticks=[],this.epicNames={}}getColumnColor(){return this.color||qa[this.name]||"var(--blue)"}getColumnDisplayName(){return Wa[this.name]||this.name}getColumnIcon(){return Ka[this.name]||"•"}handleTickSelected(t){this.dispatchEvent(new CustomEvent("tick-selected",{detail:t.detail,bubbles:!0,composed:!0}))}render(){const t=this.getColumnColor(),e=this.getColumnDisplayName(),i=this.getColumnIcon(),o=this.ticks.length;return f`
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
        ${o===0?f`
              <div class="empty-state">
                <div>
                  <div class="empty-state-icon">${i}</div>
                  <div>No ticks</div>
                </div>
              </div>
            `:this.ticks.map(s=>f`
                <tick-card
                  .tick=${s}
                  epic-name=${this.epicNames[s.parent||""]||""}
                  @tick-selected=${this.handleTickSelected}
                ></tick-card>
              `)}
      </div>
    `}};qt.styles=L`
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
  `;Se([l({type:String})],qt.prototype,"name",2);Se([l({type:String})],qt.prototype,"color",2);Se([l({attribute:!1})],qt.prototype,"ticks",2);Se([l({type:Object,attribute:!1})],qt.prototype,"epicNames",2);qt=Se([ee("tick-column")],qt);var Ya=Object.defineProperty,Xa=Object.getOwnPropertyDescriptor,re=(t,e,i,o)=>{for(var s=o>1?void 0:o?Xa(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ya(e,i,s),s};let Rt=class extends pt{constructor(){super(...arguments),this.repoName="",this.epics=[],this.selectedEpic="",this.searchTerm="",this.debounceTimeout=null}handleSearchInput(t){const i=t.target.value;this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(()=>{this.dispatchEvent(new CustomEvent("search-change",{detail:{value:i},bubbles:!0,composed:!0}))},300)}handleEpicFilterChange(t){const e=t.target;this.dispatchEvent(new CustomEvent("epic-filter-change",{detail:{value:e.value},bubbles:!0,composed:!0}))}handleCreateClick(){this.dispatchEvent(new CustomEvent("create-click",{bubbles:!0,composed:!0}))}handleMenuToggle(){this.dispatchEvent(new CustomEvent("menu-toggle",{bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this.debounceTimeout&&clearTimeout(this.debounceTimeout)}render(){return f`
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
          ${this.repoName?f`<span class="repo-badge">${this.repoName}</span>`:null}
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
            ${this.epics.map(t=>f`
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
    `}};Rt.styles=L`
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
  `;re([l({type:String,attribute:"repo-name"})],Rt.prototype,"repoName",2);re([l({attribute:!1})],Rt.prototype,"epics",2);re([l({type:String,attribute:"selected-epic"})],Rt.prototype,"selectedEpic",2);re([l({type:String,attribute:"search-term"})],Rt.prototype,"searchTerm",2);re([w()],Rt.prototype,"debounceTimeout",2);Rt=re([ee("tick-header")],Rt);var Ga=Object.defineProperty,Za=Object.getOwnPropertyDescriptor,ae=(t,e,i,o)=>{for(var s=o>1?void 0:o?Za(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ga(e,i,s),s};const Qa={0:"Critical",1:"High",2:"Medium",3:"Low",4:"Backlog"},go={0:"var(--red)",1:"var(--peach)",2:"var(--yellow)",3:"var(--green)",4:"var(--subtext0)"};let Mt=class extends pt{constructor(){super(...arguments),this.tick=null,this.open=!1,this.notesList=[],this.blockerDetails=[]}handleDrawerHide(){this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}handleTickLinkClick(t){this.dispatchEvent(new CustomEvent("tick-link-click",{detail:{tickId:t},bubbles:!0,composed:!0}))}formatTimestamp(t){return new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}getPriorityLabel(t){return Qa[t]??"Unknown"}getPriorityColor(t){return go[t]??go[2]}renderBlockers(){return!this.blockerDetails||this.blockerDetails.length===0?f`<span class="empty-text">None</span>`:f`
      <ul class="link-list">
        ${this.blockerDetails.map(t=>f`
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
    `}renderParent(){var t;return(t=this.tick)!=null&&t.parent?f`
      <a
        class="tick-link"
        @click=${()=>this.handleTickLinkClick(this.tick.parent)}
      >
        <span class="link-id">${this.tick.parent}</span>
        ${this.parentTitle?f`<span class="link-title">${this.parentTitle}</span>`:C}
      </a>
    `:f`<span class="empty-text">None</span>`}renderLabels(){var t;return!((t=this.tick)!=null&&t.labels)||this.tick.labels.length===0?f`<span class="empty-text">None</span>`:f`
      <div class="labels-container">
        ${this.tick.labels.map(e=>f`<span class="label-badge">${e}</span>`)}
      </div>
    `}renderNotes(){return!this.notesList||this.notesList.length===0?f`<span class="empty-text">No notes yet</span>`:f`
      <ul class="notes-list">
        ${this.notesList.map(t=>f`
            <li class="note-item">
              <div class="note-header">
                <span class="note-author">${t.author??"Unknown"}</span>
                ${t.timestamp?f`<span class="note-timestamp"
                      >${this.formatTimestamp(t.timestamp)}</span
                    >`:C}
              </div>
              <div class="note-text">${t.text}</div>
            </li>
          `)}
      </ul>
    `}render(){const t=this.tick;return f`
      <sl-drawer
        label=${t?`${t.id} Details`:"Tick Details"}
        placement="end"
        ?open=${this.open}
        @sl-after-hide=${this.handleDrawerHide}
      >
        ${t?f`
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
                    ${t.manual?f`<span class="meta-badge manual">👤 Manual</span>`:C}
                    ${t.awaiting?f`<span class="meta-badge awaiting"
                          >⏳ ${t.awaiting}</span
                        >`:C}
                    ${t.verdict?f`<span
                          class="meta-badge verdict-${t.verdict}"
                          >${t.verdict}</span
                        >`:C}
                    ${this.blockerDetails&&this.blockerDetails.length>0?f`<span class="meta-badge blocked">⊘ Blocked</span>`:C}
                  </div>
                </div>

                <sl-divider></sl-divider>

                <!-- Description -->
                <div class="section">
                  <div class="section-title">Description</div>
                  ${t.description?f`<div class="description">${t.description}</div>`:f`<span class="empty-text">No description</span>`}
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
                  ${t.closed_at?f`
                        <div class="timestamp-row" style="margin-top: 0.375rem">
                          <span class="timestamp-label">Closed</span>
                          <span class="timestamp-value"
                            >${this.formatTimestamp(t.closed_at)}</span
                          >
                        </div>
                      `:C}
                </div>

                <!-- Closed Reason (if applicable) -->
                ${t.closed_reason?f`
                      <div class="section">
                        <div class="section-title">Closed Reason</div>
                        <div class="description">${t.closed_reason}</div>
                      </div>
                    `:C}
              </div>
            `:f`<div class="drawer-content">
              <span class="empty-text">No tick selected</span>
            </div>`}
      </sl-drawer>
    `}};Mt.styles=L`
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
  `;ae([l({attribute:!1})],Mt.prototype,"tick",2);ae([l({type:Boolean})],Mt.prototype,"open",2);ae([l({attribute:!1})],Mt.prototype,"notesList",2);ae([l({attribute:!1})],Mt.prototype,"blockerDetails",2);ae([l({type:String,attribute:"parent-title"})],Mt.prototype,"parentTitle",2);Mt=ae([ee("tick-detail-drawer")],Mt);var Ja=Object.defineProperty,tn=Object.getOwnPropertyDescriptor,st=(t,e,i,o)=>{for(var s=o>1?void 0:o?tn(e,i):e,r=t.length-1,a;r>=0;r--)(a=t[r])&&(s=(o?a(e,i,s):a(s))||s);return o&&s&&Ja(e,i,s),s};const en=[{value:"task",label:"Task"},{value:"epic",label:"Epic"},{value:"bug",label:"Bug"},{value:"feature",label:"Feature"},{value:"chore",label:"Chore"}],on=[{value:0,label:"0 - Critical"},{value:1,label:"1 - High"},{value:2,label:"2 - Medium"},{value:3,label:"3 - Low"},{value:4,label:"4 - Backlog"}];let G=class extends pt{constructor(){super(...arguments),this.open=!1,this.epics=[],this.loading=!1,this.error=null,this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1}resetForm(){this.tickTitle="",this.tickDescription="",this.type="task",this.priority=2,this.parent="",this.labels="",this.manual=!1,this.error=null,this.loading=!1}handleDialogRequestClose(t){if(this.loading){t.preventDefault();return}this.handleClose()}handleClose(){this.resetForm(),this.dispatchEvent(new CustomEvent("dialog-close",{bubbles:!0,composed:!0}))}handleTitleInput(t){const e=t.target;this.tickTitle=e.value}handleDescriptionInput(t){const e=t.target;this.tickDescription=e.value}handleTypeChange(t){const e=t.target;this.type=e.value}handlePriorityChange(t){const e=t.target;this.priority=parseInt(e.value,10)}handleParentChange(t){const e=t.target;this.parent=e.value}handleLabelsInput(t){const e=t.target;this.labels=e.value}handleManualChange(t){const e=t.target;this.manual=e.checked}async handleSubmit(){var e;if(!this.tickTitle.trim()){this.error="Title is required",(e=this.titleInput)==null||e.focus();return}this.loading=!0,this.error=null;const t={title:this.tickTitle.trim(),type:this.type,priority:this.priority};this.tickDescription.trim()&&(t.description=this.tickDescription.trim()),this.parent&&(t.parent=this.parent);try{const i=await Ma(t);this.dispatchEvent(new CustomEvent("tick-created",{detail:{tick:i,labels:this.labels?this.labels.split(",").map(o=>o.trim()).filter(Boolean):[],manual:this.manual},bubbles:!0,composed:!0})),this.handleClose()}catch(i){i instanceof Ko?this.error=i.body||i.message:i instanceof Error?this.error=i.message:this.error="Failed to create tick"}finally{this.loading=!1}}render(){return f`
      <sl-dialog
        label="Create New Tick"
        ?open=${this.open}
        @sl-request-close=${this.handleDialogRequestClose}
      >
        ${this.error?f`<div class="error-message">${this.error}</div>`:C}

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
              ${en.map(t=>f`
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
              ${on.map(t=>f`
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
            ${this.epics.map(t=>f`
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
    `}};G.styles=L`
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
  `;st([l({type:Boolean})],G.prototype,"open",2);st([l({type:Array,attribute:!1})],G.prototype,"epics",2);st([w()],G.prototype,"loading",2);st([w()],G.prototype,"error",2);st([w()],G.prototype,"tickTitle",2);st([w()],G.prototype,"tickDescription",2);st([w()],G.prototype,"type",2);st([w()],G.prototype,"priority",2);st([w()],G.prototype,"parent",2);st([w()],G.prototype,"labels",2);st([w()],G.prototype,"manual",2);st([S('sl-input[name="title"]')],G.prototype,"titleInput",2);G=st([ee("tick-create-dialog")],G);hi("/shoelace");
