(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const D=globalThis,K=D.ShadowRoot&&(D.ShadyCSS===void 0||D.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),te=new WeakMap;let pe=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(K&&e===void 0){const r=t!==void 0&&t.length===1;r&&(e=te.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&te.set(t,e))}return e}toString(){return this.cssText}};const be=i=>new pe(typeof i=="string"?i:i+"",void 0,Z),J=(i,...e)=>{const t=i.length===1?i[0]:e.reduce((r,s,o)=>r+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+i[o+1],i[0]);return new pe(t,i,Z)},me=(i,e)=>{if(K)i.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const r=document.createElement("style"),s=D.litNonce;s!==void 0&&r.setAttribute("nonce",s),r.textContent=t.cssText,i.appendChild(r)}},se=K?i=>i:i=>i instanceof CSSStyleSheet?(e=>{let t="";for(const r of e.cssRules)t+=r.cssText;return be(t)})(i):i;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:ve,defineProperty:_e,getOwnPropertyDescriptor:Ae,getOwnPropertyNames:we,getOwnPropertySymbols:xe,getPrototypeOf:Se}=Object,b=globalThis,re=b.trustedTypes,Ee=re?re.emptyScript:"",q=b.reactiveElementPolyfillSupport,k=(i,e)=>i,L={toAttribute(i,e){switch(e){case Boolean:i=i?Ee:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,e){let t=i;switch(e){case Boolean:t=i!==null;break;case Number:t=i===null?null:Number(i);break;case Object:case Array:try{t=JSON.parse(i)}catch{t=null}}return t}},Y=(i,e)=>!ve(i,e),ie={attribute:!0,type:String,converter:L,reflect:!1,useDefault:!1,hasChanged:Y};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),b.litPropertyMetadata??(b.litPropertyMetadata=new WeakMap);let S=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=ie){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const r=Symbol(),s=this.getPropertyDescriptor(e,r,t);s!==void 0&&_e(this.prototype,e,s)}}static getPropertyDescriptor(e,t,r){const{get:s,set:o}=Ae(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:s,set(n){const l=s==null?void 0:s.call(this);o==null||o.call(this,n),this.requestUpdate(e,l,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ie}static _$Ei(){if(this.hasOwnProperty(k("elementProperties")))return;const e=Se(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(k("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(k("properties"))){const t=this.properties,r=[...we(t),...xe(t)];for(const s of r)this.createProperty(s,t[s])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[r,s]of t)this.elementProperties.set(r,s)}this._$Eh=new Map;for(const[t,r]of this.elementProperties){const s=this._$Eu(t,r);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const r=new Set(e.flat(1/0).reverse());for(const s of r)t.unshift(se(s))}else e!==void 0&&t.push(se(e));return t}static _$Eu(e,t){const r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return me(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var r;return(r=t.hostConnected)==null?void 0:r.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var r;return(r=t.hostDisconnected)==null?void 0:r.call(t)})}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){var o;const r=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,r);if(s!==void 0&&r.reflect===!0){const n=(((o=r.converter)==null?void 0:o.toAttribute)!==void 0?r.converter:L).toAttribute(t,r.type);this._$Em=e,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(e,t){var o,n;const r=this.constructor,s=r._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const l=r.getPropertyOptions(s),a=typeof l.converter=="function"?{fromAttribute:l.converter}:((o=l.converter)==null?void 0:o.fromAttribute)!==void 0?l.converter:L;this._$Em=s;const h=a.fromAttribute(t,l.type);this[s]=h??((n=this._$Ej)==null?void 0:n.get(s))??h,this._$Em=null}}requestUpdate(e,t,r,s=!1,o){var n;if(e!==void 0){const l=this.constructor;if(s===!1&&(o=this[e]),r??(r=l.getPropertyOptions(e)),!((r.hasChanged??Y)(o,t)||r.useDefault&&r.reflect&&o===((n=this._$Ej)==null?void 0:n.get(e))&&!this.hasAttribute(l._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:s,wrapped:o},n){r&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,n??t??this[e]),o!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var r;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[o,n]of this._$Ep)this[o]=n;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[o,n]of s){const{wrapped:l}=n,a=this[o];l!==!0||this._$AL.has(o)||a===void 0||this.C(o,void 0,n,a)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(r=this._$EO)==null||r.forEach(s=>{var o;return(o=s.hostUpdate)==null?void 0:o.call(s)}),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(r=>{var s;return(s=r.hostUpdated)==null?void 0:s.call(r)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}};S.elementStyles=[],S.shadowRootOptions={mode:"open"},S[k("elementProperties")]=new Map,S[k("finalized")]=new Map,q==null||q({ReactiveElement:S}),(b.reactiveElementVersions??(b.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=globalThis,oe=i=>i,B=M.trustedTypes,ne=B?B.createPolicy("lit-html",{createHTML:i=>i}):void 0,fe="$lit$",y=`lit$${Math.random().toFixed(9).slice(2)}$`,ge="?"+y,Pe=`<${ge}>`,w=document,U=()=>w.createComment(""),N=i=>i===null||typeof i!="object"&&typeof i!="function",Q=Array.isArray,Ce=i=>Q(i)||typeof(i==null?void 0:i[Symbol.iterator])=="function",V=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ae=/-->/g,le=/>/g,m=RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ce=/'/g,he=/"/g,$e=/^(?:script|style|textarea|title)$/i,Oe=i=>(e,...t)=>({_$litType$:i,strings:e,values:t}),p=Oe(1),E=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),de=new WeakMap,v=w.createTreeWalker(w,129);function ye(i,e){if(!Q(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return ne!==void 0?ne.createHTML(e):e}const ke=(i,e)=>{const t=i.length-1,r=[];let s,o=e===2?"<svg>":e===3?"<math>":"",n=O;for(let l=0;l<t;l++){const a=i[l];let h,u,c=-1,g=0;for(;g<a.length&&(n.lastIndex=g,u=n.exec(a),u!==null);)g=n.lastIndex,n===O?u[1]==="!--"?n=ae:u[1]!==void 0?n=le:u[2]!==void 0?($e.test(u[2])&&(s=RegExp("</"+u[2],"g")),n=m):u[3]!==void 0&&(n=m):n===m?u[0]===">"?(n=s??O,c=-1):u[1]===void 0?c=-2:(c=n.lastIndex-u[2].length,h=u[1],n=u[3]===void 0?m:u[3]==='"'?he:ce):n===he||n===ce?n=m:n===ae||n===le?n=O:(n=m,s=void 0);const $=n===m&&i[l+1].startsWith("/>")?" ":"";o+=n===O?a+Pe:c>=0?(r.push(h),a.slice(0,c)+fe+a.slice(c)+y+$):a+y+(c===-2?l:$)}return[ye(i,o+(i[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]};class T{constructor({strings:e,_$litType$:t},r){let s;this.parts=[];let o=0,n=0;const l=e.length-1,a=this.parts,[h,u]=ke(e,t);if(this.el=T.createElement(h,r),v.currentNode=this.el.content,t===2||t===3){const c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(s=v.nextNode())!==null&&a.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(const c of s.getAttributeNames())if(c.endsWith(fe)){const g=u[n++],$=s.getAttribute(c).split(y),z=/([.?@])?(.*)/.exec(g);a.push({type:1,index:o,name:z[2],strings:$,ctor:z[1]==="."?Ue:z[1]==="?"?Ne:z[1]==="@"?Te:I}),s.removeAttribute(c)}else c.startsWith(y)&&(a.push({type:6,index:o}),s.removeAttribute(c));if($e.test(s.tagName)){const c=s.textContent.split(y),g=c.length-1;if(g>0){s.textContent=B?B.emptyScript:"";for(let $=0;$<g;$++)s.append(c[$],U()),v.nextNode(),a.push({type:2,index:++o});s.append(c[g],U())}}}else if(s.nodeType===8)if(s.data===ge)a.push({type:2,index:o});else{let c=-1;for(;(c=s.data.indexOf(y,c+1))!==-1;)a.push({type:7,index:o}),c+=y.length-1}o++}}static createElement(e,t){const r=w.createElement("template");return r.innerHTML=e,r}}function P(i,e,t=i,r){var n,l;if(e===E)return e;let s=r!==void 0?(n=t._$Co)==null?void 0:n[r]:t._$Cl;const o=N(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==o&&((l=s==null?void 0:s._$AO)==null||l.call(s,!1),o===void 0?s=void 0:(s=new o(i),s._$AT(i,t,r)),r!==void 0?(t._$Co??(t._$Co=[]))[r]=s:t._$Cl=s),s!==void 0&&(e=P(i,s._$AS(i,e.values),s,r)),e}class Me{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,s=((e==null?void 0:e.creationScope)??w).importNode(t,!0);v.currentNode=s;let o=v.nextNode(),n=0,l=0,a=r[0];for(;a!==void 0;){if(n===a.index){let h;a.type===2?h=new j(o,o.nextSibling,this,e):a.type===1?h=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(h=new He(o,this,e)),this._$AV.push(h),a=r[++l]}n!==(a==null?void 0:a.index)&&(o=v.nextNode(),n++)}return v.currentNode=w,s}p(e){let t=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}}class j{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,r,s){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=P(this,e,t),N(e)?e===d||e==null||e===""?(this._$AH!==d&&this._$AR(),this._$AH=d):e!==this._$AH&&e!==E&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Ce(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==d&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){var o;const{values:t,_$litType$:r}=e,s=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=T.createElement(ye(r.h,r.h[0]),this.options)),r);if(((o=this._$AH)==null?void 0:o._$AD)===s)this._$AH.p(t);else{const n=new Me(s,this),l=n.u(this.options);n.p(t),this.T(l),this._$AH=n}}_$AC(e){let t=de.get(e.strings);return t===void 0&&de.set(e.strings,t=new T(e)),t}k(e){Q(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let r,s=0;for(const o of e)s===t.length?t.push(r=new j(this.O(U()),this.O(U()),this,this.options)):r=t[s],r._$AI(o),s++;s<t.length&&(this._$AR(r&&r._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){var r;for((r=this._$AP)==null?void 0:r.call(this,!1,!0,t);e!==this._$AB;){const s=oe(e).nextSibling;oe(e).remove(),e=s}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class I{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,s,o){this.type=1,this._$AH=d,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=o,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=d}_$AI(e,t=this,r,s){const o=this.strings;let n=!1;if(o===void 0)e=P(this,e,t,0),n=!N(e)||e!==this._$AH&&e!==E,n&&(this._$AH=e);else{const l=e;let a,h;for(e=o[0],a=0;a<o.length-1;a++)h=P(this,l[r+a],t,a),h===E&&(h=this._$AH[a]),n||(n=!N(h)||h!==this._$AH[a]),h===d?e=d:e!==d&&(e+=(h??"")+o[a+1]),this._$AH[a]=h}n&&!s&&this.j(e)}j(e){e===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class Ue extends I{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===d?void 0:e}}class Ne extends I{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==d)}}class Te extends I{constructor(e,t,r,s,o){super(e,t,r,s,o),this.type=5}_$AI(e,t=this){if((e=P(this,e,t,0)??d)===E)return;const r=this._$AH,s=e===d&&r!==d||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,o=e!==d&&(r===d||s);s&&this.element.removeEventListener(this.name,this,r),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class He{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){P(this,e)}}const W=M.litHtmlPolyfillSupport;W==null||W(T,j),(M.litHtmlVersions??(M.litHtmlVersions=[])).push("3.3.2");const je=(i,e,t)=>{const r=(t==null?void 0:t.renderBefore)??e;let s=r._$litPart$;if(s===void 0){const o=(t==null?void 0:t.renderBefore)??null;r._$litPart$=s=new j(e.insertBefore(U(),o),o,void 0,t??{})}return s._$AI(i),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const _=globalThis;class A extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=je(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return E}}var ue;A._$litElement$=!0,A.finalized=!0,(ue=_.litElementHydrateSupport)==null||ue.call(_,{LitElement:A});const F=_.litElementPolyfillSupport;F==null||F({LitElement:A});(_.litElementVersions??(_.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const X=i=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(i,e)}):customElements.define(i,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Re={attribute:!0,type:String,converter:L,reflect:!1,hasChanged:Y},ze=(i=Re,e,t)=>{const{kind:r,metadata:s}=t;let o=globalThis.litPropertyMetadata.get(s);if(o===void 0&&globalThis.litPropertyMetadata.set(s,o=new Map),r==="setter"&&((i=Object.create(i)).wrapped=!0),o.set(t.name,i),r==="accessor"){const{name:n}=t;return{set(l){const a=e.get.call(this);e.set.call(this,l),this.requestUpdate(n,a,i,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,i,l),l}}}if(r==="setter"){const{name:n}=t;return function(l){const a=this[n];e.call(this,l),this.requestUpdate(n,a,i,!0,l)}}throw Error("Unsupported decorator location: "+r)};function f(i){return(e,t)=>typeof t=="object"?ze(i,e,t):((r,s,o)=>{const n=s.hasOwnProperty(o);return s.constructor.createProperty(o,r),n?Object.getOwnPropertyDescriptor(s,o):void 0})(i,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ke(i){return f({...i,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const De=(i,e,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(i,e,t),t);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ze(i,e){return(t,r,s)=>{const o=n=>{var l;return((l=n.renderRoot)==null?void 0:l.querySelector(i))??null};return De(t,r,{get(){return o(this)}})}}var Le=Object.defineProperty,Be=Object.getOwnPropertyDescriptor,R=(i,e,t,r)=>{for(var s=r>1?void 0:r?Be(e,t):e,o=i.length-1,n;o>=0;o--)(n=i[o])&&(s=(r?n(e,t,s):n(s))||s);return r&&s&&Le(e,t,s),s};let x=class extends A{constructor(){super(...arguments),this.variant="primary",this.size="medium",this.disabled=!1,this.type="button"}handleClick(){if(this.type==="submit"){const i=this.closest("form");i&&i.requestSubmit()}}render(){return p`
      <button
        part="base"
        class="${this.variant} ${this.size}"
        ?disabled=${this.disabled}
        type="button"
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `}};x.styles=J`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      line-height: 1.4;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Primary - Ticks Green */
    button.primary {
      background: var(--green, #a6e3a1);
      color: var(--crust, #11111b);
    }

    button.primary:hover:not(:disabled) {
      background: #b8e8b3;
    }

    button.primary:active:not(:disabled) {
      background: #96d991;
    }

    /* Secondary */
    button.secondary {
      background: var(--surface, #313244);
      color: var(--text, #cdd6f4);
    }

    button.secondary:hover:not(:disabled) {
      background: #3b3d50;
    }

    button.secondary:active:not(:disabled) {
      background: #2a2b3d;
    }

    /* Danger */
    button.danger {
      background: var(--red, #f38ba8);
      color: var(--crust, #11111b);
    }

    button.danger:hover:not(:disabled) {
      background: #f5a0b8;
    }

    button.danger:active:not(:disabled) {
      background: #f17898;
    }

    /* Ghost */
    button.ghost {
      background: transparent;
      color: var(--text, #cdd6f4);
    }

    button.ghost:hover:not(:disabled) {
      background: var(--surface, #313244);
    }

    /* Sizes */
    button.small {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    button.large {
      padding: 0.875rem 1.75rem;
      font-size: 1rem;
    }

    /* Full width */
    :host([full]) button {
      width: 100%;
    }
  `;R([f({type:String})],x.prototype,"variant",2);R([f({type:String})],x.prototype,"size",2);R([f({type:Boolean})],x.prototype,"disabled",2);R([f({type:String})],x.prototype,"type",2);x=R([X("ticks-button")],x);var Ie=Object.defineProperty,Ge=Object.getOwnPropertyDescriptor,ee=(i,e,t,r)=>{for(var s=r>1?void 0:r?Ge(e,t):e,o=i.length-1,n;o>=0;o--)(n=i[o])&&(s=(r?n(e,t,s):n(s))||s);return r&&s&&Ie(e,t,s),s};let H=class extends A{constructor(){super(...arguments),this.variant="info",this.closable=!1}handleClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}renderDefaultIcon(){switch(this.variant){case"success":return p`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;case"error":return p`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;case"warning":return p`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;case"info":return p`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`}}render(){return p`
      <div class="alert ${this.variant}" role="alert">
        <span class="icon">
          <slot name="icon">${this.renderDefaultIcon()}</slot>
        </span>
        <div class="content">
          <slot></slot>
        </div>
        ${this.closable?p`
          <button class="close-btn" @click=${this.handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `:""}
      </div>
    `}};H.styles=J`
    :host {
      display: block;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 6px;
      font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .icon {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .close-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .close-btn svg {
      width: 1rem;
      height: 1rem;
    }

    /* Success variant */
    .alert.success {
      background: rgba(166, 227, 161, 0.15);
      color: var(--green, #a6e3a1);
      border: 1px solid rgba(166, 227, 161, 0.3);
    }

    .alert.success .close-btn {
      color: var(--green, #a6e3a1);
    }

    /* Error variant */
    .alert.error {
      background: rgba(243, 139, 168, 0.15);
      color: var(--red, #f38ba8);
      border: 1px solid rgba(243, 139, 168, 0.3);
    }

    .alert.error .close-btn {
      color: var(--red, #f38ba8);
    }

    /* Warning variant */
    .alert.warning {
      background: rgba(249, 226, 175, 0.15);
      color: var(--yellow, #f9e2af);
      border: 1px solid rgba(249, 226, 175, 0.3);
    }

    .alert.warning .close-btn {
      color: var(--yellow, #f9e2af);
    }

    /* Info variant */
    .alert.info {
      background: rgba(137, 220, 235, 0.15);
      color: var(--blue, #89dceb);
      border: 1px solid rgba(137, 220, 235, 0.3);
    }

    .alert.info .close-btn {
      color: var(--blue, #89dceb);
    }
  `;ee([f({type:String})],H.prototype,"variant",2);ee([f({type:Boolean})],H.prototype,"closable",2);H=ee([X("ticks-alert")],H);var qe=Object.defineProperty,Ve=Object.getOwnPropertyDescriptor,G=(i,e,t,r)=>{for(var s=r>1?void 0:r?Ve(e,t):e,o=i.length-1,n;o>=0;o--)(n=i[o])&&(s=(r?n(e,t,s):n(s))||s);return r&&s&&qe(e,t,s),s};let C=class extends A{constructor(){super(...arguments),this.variant="logotype",this.href="",this.size=28}renderLogotype(){const i=`glow-logotype-${Math.random().toString(36).substr(2,9)}`;return p`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" role="img" aria-label="ticks"
           style="height: ${this.size}px; width: auto;">
        <defs>
          <filter id="${i}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <text x="60" y="20"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="28"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${i})">ticks</text>
      </svg>
    `}renderIcon(){const i=`glow-icon-${Math.random().toString(36).substr(2,9)}`;return p`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="tk_"
           style="height: ${this.size}px; width: ${this.size}px;">
        <defs>
          <filter id="${i}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="#1e1e2e"/>
        <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#313244" stroke-width="2"/>
        <text x="32" y="32"
              font-family="'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
              font-size="22"
              font-weight="600"
              fill="#A6E3A1"
              text-anchor="middle"
              dominant-baseline="central"
              filter="url(#${i})">tk_</text>
      </svg>
    `}render(){const i=this.variant==="icon"?this.renderIcon():this.renderLogotype();return this.href?p`<a href=${this.href}>${i}</a>`:p`<span>${i}</span>`}};C.styles=J`
    :host {
      display: inline-flex;
      align-items: center;
    }

    a, span {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    a:hover {
      text-decoration: none;
    }

    svg {
      display: block;
    }
  `;G([f({type:String})],C.prototype,"variant",2);G([f({type:String})],C.prototype,"href",2);G([f({type:Number})],C.prototype,"size",2);C=G([X("ticks-logo")],C);export{d as A,E,A as a,p as b,Ze as e,J as i,f as n,Ke as r,X as t,L as u};
